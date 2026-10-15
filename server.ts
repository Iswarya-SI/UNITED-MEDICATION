import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Disable buffering so queries fail-fast if DB connection is unavailable
mongoose.set('bufferCommands', false);

function getMongoUri(): string {
  let uri = process.env.MONGODB_URI || '';
  if (!uri || uri.includes('<db_password>') || uri.includes(':db_password@')) {
    uri = 'mongodb+srv://jpavan2244_db_user:Ishuthemonkey@genomefirewall.wmieqra.mongodb.net/?retryWrites=true&w=majority';
  }
  // Automatically strip wrapping angle brackets around password if present
  return uri.replace(/:<([^>@]+)>@/, ':$1@');
}

const MONGODB_URI = getMongoUri();

let lastError: string | null = null;
let isConnected = false;

async function connectToMongo() {
  if (!MONGODB_URI || MONGODB_URI.includes('<db_password>')) {
    console.log('ℹ️ MONGODB_URI is not fully configured.');
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    lastError = null;
    console.log('✅ Connected to MongoDB Atlas successfully.');
  } catch (err) {
    isConnected = false;
    lastError = err instanceof Error ? err.message : String(err);
    console.warn('⚠️ MongoDB Atlas connection notice:', lastError);
  }
}

connectToMongo();

import { analyzeLabReportsWithGemini } from './src/server/geminiLabAnalyzer';

// Global middlewares with high payload limit for report images
app.use(express.json({ limit: '15mb' }));

// AI-powered lab report analysis endpoint
app.post('/api/ai/analyze-lab-reports', async (req, res) => {
  try {
    const { reports, patient, medicines, cases, cohortRecords, specificReportId } = req.body || {};
    if (!Array.isArray(reports)) {
      res.status(400).json({ error: 'reports must be an array of ReportDoc items' });
      return;
    }
    const result = await analyzeLabReportsWithGemini(reports, patient, medicines, cases, cohortRecords, specificReportId);
    res.json(result);
  } catch (error) {
    console.error('Error analyzing lab reports:', error);
    res.status(500).json({
      error: 'Failed to analyze lab reports',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Health check endpoint for Firebase and MongoDB Atlas
app.get(['/api/health', '/api/db-health'], async (_req, res) => {
  // If disconnected, try a quick reconnect check
  if (mongoose.connection.readyState === 0 && MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
      isConnected = true;
      lastError = null;
    } catch (e) {
      isConnected = false;
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  const readyStateMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const stateNumber = mongoose.connection.readyState;
  const stateString = readyStateMap[stateNumber] || 'unknown';

  const isIpWhitelistError =
    Boolean(lastError && (lastError.includes("isn't whitelisted") || lastError.includes('SSL alert number 80')));

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      firebase: {
        configured: true,
        projectId: 'every-life-matters-8aca8',
        authDomain: 'every-life-matters-8aca8.firebaseapp.com',
        status: 'active',
        operational: true,
      },
      mongodb: {
        type: 'MongoDB Atlas',
        cluster: 'genomefirewall.wmieqra.mongodb.net',
        networkReachable: true,
        configured: Boolean(MONGODB_URI),
        state: stateString,
        readyState: stateNumber,
        isConnected: stateNumber === 1 || isConnected,
        requiresIpAccessListConfig: isIpWhitelistError,
        message:
          stateNumber === 1 || isConnected
            ? 'Connected to MongoDB Atlas successfully'
            : isIpWhitelistError
            ? 'Atlas IP Access List required: Please add 0.0.0.0/0 in MongoDB Atlas -> Security -> Network Access'
            : lastError || 'Disconnected',
        instructions: isIpWhitelistError
          ? 'Log into MongoDB Atlas -> Network Access (left menu) -> Add IP Address -> Choose "Allow Access from Anywhere" (0.0.0.0/0) -> Confirm. Once saved, refresh this endpoint!'
          : null,
        lastError: lastError,
      },
    },
  });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Mount Vite dev server in middleware mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server ready at http://0.0.0.0:${PORT}`);
  });
}

startServer();
