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

const MONGODB_URI = process.env.MONGODB_URI || '';

let lastError: string | null = null;
let isConnected = false;

async function connectToMongo() {
  if (!MONGODB_URI) {
    console.warn('[AI Studio] MONGODB_URI not configured — database offline, mock mode active');
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
    });
    isConnected = true;
    lastError = null;
    console.log('✅ Connected to MongoDB successfully.');
  } catch (err) {
    isConnected = false;
    lastError = err instanceof Error ? err.message : String(err);
    console.warn('⚠️ MongoDB connection notice:', lastError);
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
        type: 'MongoDB',
        configured: Boolean(MONGODB_URI),
        state: stateString,
        readyState: stateNumber,
        isConnected: stateNumber === 1 || isConnected,
        requiresIpAccessListConfig: isIpWhitelistError,
        message:
          stateNumber === 1 || isConnected
            ? 'Connected to MongoDB successfully'
            : isIpWhitelistError
            ? 'Atlas IP Access List required: Please add 0.0.0.0/0 in MongoDB Atlas -> Security -> Network Access'
            : lastError || (MONGODB_URI ? 'Disconnected' : 'MongoDB URI not set (mock/demo mode active)'),
        instructions: isIpWhitelistError
          ? 'Log into MongoDB Atlas -> Network Access (left menu) -> Add IP Address -> Choose "Allow Access from Anywhere" (0.0.0.0/0) -> Confirm.'
          : null,
        lastError: lastError,
      },
    },
  });
});

// Database offline error middleware: gracefully handle Mongoose errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (
    err?.name === 'MongooseError' ||
    err?.name === 'MongoNetworkError' ||
    (typeof err?.message === 'string' && err.message.includes('buffering timed out'))
  ) {
    console.warn('[AI Studio] Database offline — returning mock empty response');
    if (req.method === 'GET') {
      res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
      return;
    }
    res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
    return;
  }
  next(err);
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
