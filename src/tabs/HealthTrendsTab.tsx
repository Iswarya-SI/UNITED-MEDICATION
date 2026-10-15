import { useEffect, useState, useMemo } from 'react';
import {
  Activity,
  Pill,
  TrendingUp,
  FileText,
  Calendar,
  AlertCircle,
  Stethoscope,
  Info,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Heart,
  Globe2,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../firebase';
import type { MhdUser, ReportDoc, Medicine, VitalsDoc, CaseDoc } from '../lib/types';
import { todayStr, fmtD } from '../lib/format';
import { bind } from './bind';
import { PageHeader, Loading, EmptyState } from './common';
import HealthTrendsChart, { type DataPoint, type ReferenceRange, type MedicineMilestone } from '../components/HealthTrendsChart';
import AiLabAnalysisModal from '../components/AiLabAnalysisModal';
import type { LabAnalysisResult } from '../server/geminiLabAnalyzer';
import { toast } from '../components/Toaster';
import {
  DEMO_GLUCOSE_DATA,
  DEMO_HBA1C_DATA,
  DEMO_SYS_BP_DATA,
  DEMO_DIA_BP_DATA,
  DEMO_CHOLESTEROL_DATA,
  DEMO_TRIGLYCERIDES_DATA,
  DEMO_CREATININE_DATA,
  DEMO_MEDICINE_PROFILES,
  DEMO_VITALS_LOG,
} from '../lib/demoHealthData';

export default function HealthTrendsTab({ patientData }: { patientData: MhdUser }) {
  const [reports, setReports] = useState<ReportDoc[] | null>(null);
  const [medicines, setMedicines] = useState<Medicine[] | null>(null);
  const [vitals, setVitals] = useState<VitalsDoc[] | null>(null);
  const [cases, setCases] = useState<CaseDoc[] | null>(null);

  // Active view: Biomarkers vs Medicine-wise vs Vitals Log
  const [activeView, setActiveView] = useState<'biomarkers' | 'meds' | 'vitals'>('biomarkers');

  // Data source mode: 'demo' (realistic in-memory graphs) vs 'live' (personal patient records)
  const [dataSource, setDataSource] = useState<'demo' | 'live'>('demo');

  // AI Modal
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<LabAnalysisResult | null>(null);

  // Bind real-time data from Firestore for live mode
  useEffect(() => bind<ReportDoc>('reports', [['patientId', '==', patientData.id]], setReports), [patientData.id]);
  useEffect(() => bind<Medicine>('medicines', [['patientId', '==', patientData.id]], setMedicines), [patientData.id]);
  useEffect(() => bind<VitalsDoc>('vitals', [['patientId', '==', patientData.id]], setVitals), [patientData.id]);
  useEffect(() => bind<CaseDoc>('cases', [['patientId', '==', patientData.id]], setCases), [patientData.id]);

  // Extract structured biomarker time-series from actual reports & vitals
  const liveBiomarkerSeries = useMemo(() => {
    const glucosePts: DataPoint[] = [];
    const hba1cPts: DataPoint[] = [];
    const sysBpPts: DataPoint[] = [];
    const diaBpPts: DataPoint[] = [];
    const cholPts: DataPoint[] = [];
    const trigPts: DataPoint[] = [];
    const creatPts: DataPoint[] = [];
    const hemoPts: DataPoint[] = [];

    // Parse from Lab Reports notes and summaries
    (reports || []).forEach((rep) => {
      const text = `${rep.title} ${rep.note || ''} ${rep.summary || ''}`.toLowerCase();
      const dateStr = rep.date || todayStr();
      const timestamp = new Date(dateStr).getTime() || rep.createdAt;

      // Fasting Glucose
      const gMatch = text.match(/glucose[^0-9:]*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (gMatch && gMatch[1]) {
        glucosePts.push({
          date: dateStr,
          timestamp,
          value: parseFloat(gMatch[1]),
          unit: 'mg/dL',
          note: `Report: ${rep.title}`,
          doctor: rep.doctor,
        });
      }

      // HbA1c
      const hMatch = text.match(/hba1c[^0-9:]*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (hMatch && hMatch[1]) {
        hba1cPts.push({
          date: dateStr,
          timestamp,
          value: parseFloat(hMatch[1]),
          unit: '%',
          note: `Report: ${rep.title}`,
          doctor: rep.doctor,
        });
      }

      // Total Cholesterol
      const cMatch = text.match(/cholesterol[^0-9:]*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (cMatch && cMatch[1]) {
        cholPts.push({
          date: dateStr,
          timestamp,
          value: parseFloat(cMatch[1]),
          unit: 'mg/dL',
          note: `Report: ${rep.title}`,
          doctor: rep.doctor,
        });
      }

      // Triglycerides
      const trMatch = text.match(/triglycerides?[^0-9:]*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (trMatch && trMatch[1]) {
        trigPts.push({
          date: dateStr,
          timestamp,
          value: parseFloat(trMatch[1]),
          unit: 'mg/dL',
          note: `Report: ${rep.title}`,
          doctor: rep.doctor,
        });
      }

      // Creatinine
      const crMatch = text.match(/creatinine[^0-9:]*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (crMatch && crMatch[1]) {
        creatPts.push({
          date: dateStr,
          timestamp,
          value: parseFloat(crMatch[1]),
          unit: 'mg/dL',
          note: `Report: ${rep.title}`,
          doctor: rep.doctor,
        });
      }

      // Hemoglobin
      const heMatch = text.match(/hemoglobin[^0-9:]*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/i);
      if (heMatch && heMatch[1]) {
        hemoPts.push({
          date: dateStr,
          timestamp,
          value: parseFloat(heMatch[1]),
          unit: 'g/dL',
          note: `Report: ${rep.title}`,
          doctor: rep.doctor,
        });
      }
    });

    // Parse from clinical Vitals recorded by doctors
    (vitals || []).forEach((vit) => {
      const dateStr = vit.date || todayStr();
      const timestamp = new Date(dateStr).getTime() || vit.createdAt || Date.now();

      if (vit.bp && vit.bp.includes('/')) {
        const parts = vit.bp.split('/');
        const s = parseFloat(parts[0]);
        const d = parseFloat(parts[1]);
        if (!isNaN(s)) {
          sysBpPts.push({
            date: dateStr,
            timestamp,
            value: s,
            unit: 'mmHg',
            note: `Systolic BP (Doctor: ${vit.doctorName || 'Attending'})`,
          });
        }
        if (!isNaN(d)) {
          diaBpPts.push({
            date: dateStr,
            timestamp,
            value: d,
            unit: 'mmHg',
            note: `Diastolic BP (Doctor: ${vit.doctorName || 'Attending'})`,
          });
        }
      }
    });

    return {
      glucose: glucosePts.sort((a, b) => a.timestamp - b.timestamp),
      hba1c: hba1cPts.sort((a, b) => a.timestamp - b.timestamp),
      sysBp: sysBpPts.sort((a, b) => a.timestamp - b.timestamp),
      diaBp: diaBpPts.sort((a, b) => a.timestamp - b.timestamp),
      cholesterol: cholPts.sort((a, b) => a.timestamp - b.timestamp),
      triglycerides: trigPts.sort((a, b) => a.timestamp - b.timestamp),
      creatinine: creatPts.sort((a, b) => a.timestamp - b.timestamp),
      hemoglobin: hemoPts.sort((a, b) => a.timestamp - b.timestamp),
    };
  }, [reports, vitals]);

  const hasLiveBiomarkers =
    liveBiomarkerSeries.glucose.length > 0 ||
    liveBiomarkerSeries.hba1c.length > 0 ||
    liveBiomarkerSeries.sysBp.length > 0 ||
    liveBiomarkerSeries.cholesterol.length > 0;

  // Run AI analysis with full prescription and laboratory correlation
  const handleRunAiAnalysis = async () => {
    setAiModalOpen(true);
    setAiLoading(true);

    try {
      let cohortRecords: { type: string; title: string; date?: string; note?: string }[] = [];
      try {
        const otherSnap = await getDocs(query(collection(db, 'reports'), limit(30)));
        cohortRecords = otherSnap.docs
          .filter((d) => d.data().patientId !== patientData.id)
          .map((d) => ({
            type: d.data().type || 'Lab Report',
            title: d.data().title || 'Panel',
            date: d.data().date,
            note: d.data().note,
          }));
      } catch {
        /* fallback to cohort model */
      }

      // If in demo mode or live data is empty, supply rich simulated demo cases/meds/reports
      const targetReports = dataSource === 'demo' || (reports || []).length === 0
        ? [
            {
              id: 'rep-demo-1',
              patientId: patientData.id,
              title: 'Baseline Comprehensive Metabolic Panel',
              type: 'Lab Report',
              date: '2025-11-10',
              hospital: 'MHD Central Multispecialty Hospital',
              doctor: 'Dr. Sarah Jenkins, MD',
              note: 'Fasting Glucose: 172 mg/dL (Elevated). HbA1c: 8.6% (Elevated). Total Cholesterol: 256 mg/dL (Elevated). Triglycerides: 220 mg/dL. Creatinine: 0.92 mg/dL (Normal).',
              verified: true,
              createdAt: new Date('2025-11-10').getTime(),
            },
            {
              id: 'rep-demo-2',
              patientId: patientData.id,
              title: 'Quarterly Review Panel',
              type: 'Lab Report',
              date: '2026-03-05',
              hospital: 'MHD Central Multispecialty Hospital',
              doctor: 'Dr. Sarah Jenkins, MD',
              note: 'Fasting Glucose: 134 mg/dL (Down from 172). HbA1c: 7.7% (Improved). Total Cholesterol: 198 mg/dL (Controlled). Triglycerides: 162 mg/dL. Creatinine: 0.90 mg/dL.',
              verified: true,
              createdAt: new Date('2026-03-05').getTime(),
            },
            {
              id: 'rep-demo-3',
              patientId: patientData.id,
              title: 'Latest Annual Health Review Panel',
              type: 'Lab Report',
              date: '2026-09-14',
              hospital: 'MHD Central Multispecialty Hospital',
              doctor: 'Dr. Sarah Jenkins, MD',
              note: 'Fasting Glucose: 104 mg/dL (Optimal control). HbA1c: 6.3% (Target achieved). Total Cholesterol: 176 mg/dL (Optimal protection). Triglycerides: 138 mg/dL. Creatinine: 0.89 mg/dL.',
              verified: true,
              createdAt: new Date('2026-09-14').getTime(),
            },
          ]
        : reports || [];

      const targetMeds = dataSource === 'demo' || (medicines || []).length === 0
        ? [
            {
              id: 'med-demo-1',
              patientId: patientData.id,
              name: 'Metformin HCl',
              dosage: '500 mg BD (Twice daily)',
              startDate: '2025-11-10',
              active: true,
              prescribedBy: 'Dr. Sarah Jenkins, MD',
              verified: true,
              createdAt: new Date('2025-11-10').getTime(),
            },
            {
              id: 'med-demo-2',
              patientId: patientData.id,
              name: 'Atorvastatin Calcium',
              dosage: '10 mg OD (At bedtime)',
              startDate: '2025-11-15',
              active: true,
              prescribedBy: 'Dr. Sarah Jenkins, MD',
              verified: true,
              createdAt: new Date('2025-11-15').getTime(),
            },
            {
              id: 'med-demo-3',
              patientId: patientData.id,
              name: 'Amlodipine Besylate',
              dosage: '5 mg OD (Morning)',
              startDate: '2025-12-15',
              active: true,
              prescribedBy: 'Dr. Rajesh Nair, MD',
              verified: true,
              createdAt: new Date('2025-12-15').getTime(),
            },
          ]
        : medicines || [];

      const res = await fetch('/api/ai/analyze-lab-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reports: targetReports,
          medicines: targetMeds,
          cases: cases || [],
          cohortRecords,
          patient: {
            name: patientData.name,
            gender: patientData.gender,
            dob: patientData.dob,
            bloodGroup: patientData.bloodGroup,
            conditions: patientData.conditions,
            allergies: patientData.allergies,
          },
        }),
      });

      if (!res.ok) throw new Error('Analysis request failed');
      const data = await res.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error('Error running AI analysis:', err);
      toast('Could not complete AI analysis at this time.', 'err');
    } finally {
      setAiLoading(false);
    }
  };

  if (reports === null || medicines === null || vitals === null) {
    return (
      <div className="max-w-[1050px] mx-auto min-w-0 w-full">
        <Loading />
      </div>
    );
  }

  return (
    <div className="max-w-[1050px] mx-auto space-y-4 sm:space-y-6 pb-8 sm:pb-12 min-w-0 w-full">
      {/* Top Header with AI Analytics Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <PageHeader
            title="Health Trends & Graphs"
            sub="Interactive charts of your blood glucose, HbA1c, blood pressure, cholesterol, and individual medicine timelines."
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          <button
            onClick={handleRunAiAnalysis}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-700 via-blue-600 to-[#2a8eff] hover:from-indigo-800 hover:to-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Globe2 className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Worldwide Rx Success & Mistakes</span>
          </button>
        </div>
      </div>

      {/* Data Source Mode Switcher: Demo Data vs Live Records */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-2.5 sm:p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider pl-1">Data Source:</span>
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => setDataSource('demo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dataSource === 'demo'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>DEMO DATA (Simulated Trends)</span>
            </button>
            <button
              onClick={() => setDataSource('live')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                dataSource === 'live'
                  ? 'bg-white text-[#2a8eff] shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>My Live Records</span>
              {hasLiveBiomarkers && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 pr-1">
          {dataSource === 'demo' ? (
            <span className="text-amber-800 font-medium">
              Showing realistic simulated clinical dataset (Read-only demo)
            </span>
          ) : (
            <span>Showing verified records from your patient profile</span>
          )}
        </div>
      </div>

      {/* Prominent Demo Data Banner when in Demo Mode */}
      {dataSource === 'demo' && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-mono font-bold text-xs shadow-2xs">
              DEMO
            </div>
            <div>
              <p className="font-bold text-amber-950 flex items-center gap-2">
                <span>Realistic Demo-Only Health Analytics & Trajectories</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-200/70 text-amber-900 border border-amber-300">Read-Only Simulation</span>
              </p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Displaying realistic multi-month clinical response data for Glucose, HbA1c, Blood Pressure, and Cholesterol, plus separate medicine-wise treatment timelines. Never modifies Firebase, MongoDB, or real patient records.
              </p>
            </div>
          </div>
          <button
            onClick={() => setDataSource('live')}
            className="text-xs font-bold text-amber-900 hover:text-amber-950 hover:underline shrink-0"
          >
            Switch to Live Records →
          </button>
        </div>
      )}

      {/* Navigation View Switcher (Biomarkers vs Medicine-wise Graphs vs Vitals Log) */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl max-w-md">
        <button
          onClick={() => setActiveView('biomarkers')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeView === 'biomarkers'
              ? 'bg-white text-[#2a8eff] shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-[#2a8eff]" />
          <span>Biomarkers</span>
        </button>

        <button
          onClick={() => setActiveView('meds')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeView === 'meds'
              ? 'bg-white text-[#2a8eff] shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Pill className="w-3.5 h-3.5 text-blue-500" />
          <span>Medicine-wise Graphs</span>
        </button>

        <button
          onClick={() => setActiveView('vitals')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeView === 'vitals'
              ? 'bg-white text-[#2a8eff] shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          <span>Vitals Log</span>
        </button>
      </div>

      {/* =========================================================
          MODE 1: DEMO HEALTH GRAPHS (SIMULATION)
          ========================================================= */}
      {dataSource === 'demo' && (
        <>
          {/* VIEW 1: Core Biomarker Charts (Glucose, HbA1c, Blood Pressure, Cholesterol) */}
          {activeView === 'biomarkers' && (
            <div className="space-y-6">
              {/* 1. Blood Glucose Chart */}
              <HealthTrendsChart
                title="Fasting Blood Glucose"
                subtitle="Morning plasma glucose concentration (mg/dL) monitored across 9 months under Metformin therapy."
                data={DEMO_GLUCOSE_DATA}
                referenceRange={{ min: 70, max: 99, unit: 'mg/dL', label: 'Normal Fasting' }}
                unit="mg/dL"
                color="#2a8eff"
                isDemoData={true}
                milestones={[
                  {
                    date: '2025-11-10',
                    timestamp: new Date('2025-11-10').getTime(),
                    medicineName: 'Metformin HCl',
                    dosage: '500mg OD',
                    type: 'started',
                    note: 'Initiated at 500mg once daily',
                  },
                  {
                    date: '2026-03-05',
                    timestamp: new Date('2026-03-05').getTime(),
                    medicineName: 'Metformin HCl',
                    dosage: '500mg BD',
                    type: 'dose_change',
                    note: 'Titrated to 500mg twice daily for optimal control',
                  },
                ]}
              />

              {/* 2. HbA1c Chart */}
              <HealthTrendsChart
                title="HbA1c (Glycated Hemoglobin)"
                subtitle="Quarterly 3-month average glycemic exposure. Demonstrates reduction from 8.6% to 6.3%."
                data={DEMO_HBA1C_DATA}
                referenceRange={{ min: 4.0, max: 5.6, unit: '%', label: 'Healthy Target' }}
                unit="%"
                color="#8b5cf6"
                isDemoData={true}
                milestones={[
                  {
                    date: '2025-11-10',
                    timestamp: new Date('2025-11-10').getTime(),
                    medicineName: 'Metformin HCl',
                    dosage: '500mg OD',
                    type: 'started',
                    note: 'Regimen started',
                  },
                ]}
              />

              {/* 3. Blood Pressure Dual-Series Chart (Systolic + Diastolic) */}
              <HealthTrendsChart
                title="Blood Pressure (Systolic & Diastolic)"
                subtitle="Interactive dual-trajectory arterial pressure monitoring (mmHg) during clinical visits under Amlodipine 5mg."
                data={DEMO_SYS_BP_DATA}
                primaryLabel="Systolic BP"
                unit="mmHg"
                referenceRange={{ min: 90, max: 120, unit: 'mmHg', label: 'Systolic Target' }}
                color="#ef4444"
                secondaryData={DEMO_DIA_BP_DATA}
                secondaryLabel="Diastolic BP"
                secondaryColor="#06b6d4"
                secondaryUnit="mmHg"
                secondaryReferenceRange={{ min: 60, max: 80, unit: 'mmHg', label: 'Diastolic Target' }}
                isDemoData={true}
                milestones={[
                  {
                    date: '2025-12-15',
                    timestamp: new Date('2025-12-15').getTime(),
                    medicineName: 'Amlodipine',
                    dosage: '5mg OD',
                    type: 'started',
                    note: 'Calcium channel blocker initiated',
                  },
                ]}
              />

              {/* 4. Total Cholesterol Chart */}
              <HealthTrendsChart
                title="Total Serum Cholesterol"
                subtitle="Circulating blood lipids (mg/dL) monitored for atherosclerotic plaque prevention under Atorvastatin 10mg."
                data={DEMO_CHOLESTEROL_DATA}
                referenceRange={{ min: 125, max: 200, unit: 'mg/dL', label: 'Desirable Target' }}
                unit="mg/dL"
                color="#f59e0b"
                isDemoData={true}
                milestones={[
                  {
                    date: '2025-11-15',
                    timestamp: new Date('2025-11-15').getTime(),
                    medicineName: 'Atorvastatin',
                    dosage: '10mg OD',
                    type: 'started',
                    note: 'Statin started at bedtime',
                  },
                ]}
              />

              {/* 5. Serum Triglycerides Chart */}
              <HealthTrendsChart
                title="Serum Triglycerides"
                subtitle="Stored dietary fats circulating in bloodstream (mg/dL). Normal target is <150 mg/dL."
                data={DEMO_TRIGLYCERIDES_DATA}
                referenceRange={{ min: 40, max: 150, unit: 'mg/dL', label: 'Normal' }}
                unit="mg/dL"
                color="#f97316"
                isDemoData={true}
              />

              {/* 6. Kidney Clearance Safety (Creatinine) */}
              <HealthTrendsChart
                title="Serum Creatinine (Renal Clearance Safety)"
                subtitle="Kidney filtration marker (mg/dL) verifying sustained renal safety during long-term Metformin therapy."
                data={DEMO_CREATININE_DATA}
                referenceRange={{ min: 0.6, max: 1.2, unit: 'mg/dL', label: 'Optimal Clearance' }}
                unit="mg/dL"
                color="#10b981"
                isDemoData={true}
              />
            </div>
          )}

          {/* VIEW 2: Separate Dedicated Graphs for Each Medicine */}
          {activeView === 'meds' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-start gap-3">
                <Info className="w-5 h-5 text-[#2a8eff] shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[#1e3a8a]">Separate Medication-Wise Treatment Graphs (DEMO DATA)</p>
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                      DEMO DATA
                    </span>
                  </div>
                  <p>
                    Each individual medicine is paired with its full treatment timeline, dosing titration milestones,
                    and correlated biomarker response curves over 9 months of simulated clinical surveillance.
                  </p>
                  <p className="text-[11px] text-slate-500 italic">
                    *Clinical Evidence Reminder: Laboratory values vary naturally with diet, exercise, and hydration alongside prescribed therapies.
                  </p>
                </div>
              </div>

              {DEMO_MEDICINE_PROFILES.map((medProfile) => (
                <div
                  key={medProfile.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4"
                >
                  {/* Medicine Profile Header & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="p-2 bg-blue-50 rounded-xl text-[#2a8eff]">
                          <Pill className="w-4 h-4" />
                        </div>
                        <h4 className="text-base sm:text-lg font-bold text-[#1e3a8a]">
                          {medProfile.name}
                        </h4>
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          DEMO DATA
                        </span>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {medProfile.efficacySummary.clinicalStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        <strong>Dosage:</strong> {medProfile.dosage} · <strong>Timing:</strong> {medProfile.timing}
                      </p>
                      <p className="text-xs text-slate-500">
                        Prescribed by: {medProfile.prescribedBy} ({medProfile.doctorSpecialty}) · {medProfile.hospital}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Adherence Rate</p>
                        <p className="text-sm font-bold text-[#1e3a8a]">{medProfile.efficacySummary.adherenceRate}%</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs border border-emerald-200">
                        ✓
                      </div>
                    </div>
                  </div>

                  {/* Treatment Timeline Milestone Strip */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#2a8eff]" />
                      <span>Treatment Timeline & Dosing History</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {medProfile.history.map((h, hIdx) => (
                        <div key={hIdx} className="p-2 bg-white rounded-lg border border-slate-200/60 space-y-0.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-[#1e3a8a]">{fmtD(h.date)}</span>
                            <span className="font-mono text-slate-500">{h.dosage}</span>
                          </div>
                          <p className="text-[11px] text-slate-600">{h.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Correlated Biomarker Chart */}
                  <HealthTrendsChart
                    title={medProfile.correlatedBiomarker.title}
                    subtitle={medProfile.correlatedBiomarker.subtitle}
                    data={medProfile.correlatedBiomarker.data}
                    referenceRange={medProfile.correlatedBiomarker.referenceRange}
                    unit={medProfile.correlatedBiomarker.unit}
                    color={medProfile.correlatedBiomarker.color}
                    isDemoData={true}
                    milestones={medProfile.milestones}
                    medicineTimeline={{
                      name: medProfile.name,
                      dosage: medProfile.dosage,
                      startDate: medProfile.startDate,
                      active: medProfile.active,
                      history: medProfile.history,
                    }}
                  />

                  {/* Secondary Correlated Chart if present (e.g. HbA1c for Metformin, Triglycerides for Atorvastatin) */}
                  {medProfile.secondaryBiomarker && (
                    <HealthTrendsChart
                      title={medProfile.secondaryBiomarker.title}
                      subtitle={`Secondary biomarker evaluated alongside ${medProfile.name} prescription.`}
                      data={medProfile.secondaryBiomarker.data}
                      referenceRange={medProfile.secondaryBiomarker.referenceRange}
                      unit={medProfile.secondaryBiomarker.unit}
                      color={medProfile.secondaryBiomarker.color}
                      isDemoData={true}
                    />
                  )}

                  {/* Doctor Review & Outcome Notes */}
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/70 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[#1e3a8a] font-bold">
                      <span>Attending Physician Review & Assessment</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        Net Impact: {medProfile.efficacySummary.netChange} ({medProfile.efficacySummary.percentageImprovement})
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                      "{medProfile.efficacySummary.doctorReviewNote}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VIEW 3: Chronological Clinical Vitals Log Table */}
          {activeView === 'vitals' && (
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden space-y-2">
              <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-[#1e3a8a] uppercase tracking-wider">
                    Chronological Clinical Vitals Log (DEMO DATA)
                  </h4>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                    DEMO DATA
                  </span>
                </div>
                <span className="text-xs text-slate-500">{DEMO_VITALS_LOG.length} Clinical Visits Recorded</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">Blood Pressure</th>
                      <th className="px-4 py-3">Heart Rate</th>
                      <th className="px-4 py-3">Temp (°F)</th>
                      <th className="px-4 py-3">Weight</th>
                      <th className="px-4 py-3">SpO₂</th>
                      <th className="px-4 py-3">Clinical Assessment</th>
                      <th className="px-4 py-3">Attending Doctor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-[13px]">
                    {DEMO_VITALS_LOG.map((v, i) => (
                      <tr key={v.id || i} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">
                          {fmtD(v.date)} · <span className="text-slate-400 text-[11px]">{v.time}</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                          {v.systolic}/{v.diastolic} mmHg
                        </td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{v.heartRate} bpm</td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{v.temperature}°F</td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{v.weightKg} kg</td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{v.spo2}%</td>
                        <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate" title={v.notes}>
                          {v.notes}
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{v.doctorName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* =========================================================
          MODE 2: LIVE PERSONAL PATIENT RECORDS
          ========================================================= */}
      {dataSource === 'live' && (
        <>
          {!hasLiveBiomarkers ? (
            <div className="bg-surface border border-line rounded-2xl p-6 sm:p-10 text-center space-y-4 shadow-xs">
              <EmptyState
                icon={<Activity className="w-8 h-8 text-ghost mx-auto" strokeWidth={1.5} />}
                title="No live laboratory reports recorded yet"
                sub="Your hospital has not uploaded verified lab panels or vitals for this account yet. You can explore the realistic interactive demonstration graphs anytime."
              />
              <div className="pt-2">
                <button
                  onClick={() => setDataSource('demo')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>View Realistic Demo Health Graphs (Simulated)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Blood Glucose Chart */}
              {liveBiomarkerSeries.glucose.length > 0 && (
                <HealthTrendsChart
                  title="Fasting Blood Glucose"
                  subtitle="Blood glucose concentration after fasting, tracked across your verified laboratory tests."
                  data={liveBiomarkerSeries.glucose}
                  referenceRange={{ min: 70, max: 99, unit: 'mg/dL' }}
                  unit="mg/dL"
                  color="#2a8eff"
                />
              )}

              {/* HbA1c Chart */}
              {liveBiomarkerSeries.hba1c.length > 0 && (
                <HealthTrendsChart
                  title="HbA1c (Glycated Hemoglobin)"
                  subtitle="Average blood sugar exposure over 2 to 3 months."
                  data={liveBiomarkerSeries.hba1c}
                  referenceRange={{ min: 4.0, max: 5.6, unit: '%' }}
                  unit="%"
                  color="#8b5cf6"
                />
              )}

              {/* Blood Pressure Chart */}
              {liveBiomarkerSeries.sysBp.length > 0 && (
                <HealthTrendsChart
                  title="Blood Pressure (Systolic & Diastolic)"
                  subtitle="Pressure recorded during clinical visits."
                  data={liveBiomarkerSeries.sysBp}
                  primaryLabel="Systolic BP"
                  unit="mmHg"
                  referenceRange={{ min: 90, max: 120, unit: 'mmHg' }}
                  color="#ef4444"
                  secondaryData={liveBiomarkerSeries.diaBp}
                  secondaryLabel="Diastolic BP"
                  secondaryColor="#06b6d4"
                  secondaryUnit="mmHg"
                  secondaryReferenceRange={{ min: 60, max: 80, unit: 'mmHg' }}
                />
              )}

              {/* Total Cholesterol Chart */}
              {liveBiomarkerSeries.cholesterol.length > 0 && (
                <HealthTrendsChart
                  title="Total Cholesterol"
                  subtitle="Circulating blood lipids, monitored for cardiovascular wellness."
                  data={liveBiomarkerSeries.cholesterol}
                  referenceRange={{ min: 125, max: 200, unit: 'mg/dL' }}
                  unit="mg/dL"
                  color="#f59e0b"
                />
              )}

              {/* Triglycerides Chart */}
              {liveBiomarkerSeries.triglycerides.length > 0 && (
                <HealthTrendsChart
                  title="Triglycerides"
                  subtitle="Stored dietary fats circulating in the bloodstream."
                  data={liveBiomarkerSeries.triglycerides}
                  referenceRange={{ min: 40, max: 150, unit: 'mg/dL' }}
                  unit="mg/dL"
                  color="#f97316"
                />
              )}

              {/* Serum Creatinine Chart */}
              {liveBiomarkerSeries.creatinine.length > 0 && (
                <HealthTrendsChart
                  title="Serum Creatinine"
                  subtitle="Waste filtration metric indicating kidney clearance function."
                  data={liveBiomarkerSeries.creatinine}
                  referenceRange={{ min: 0.6, max: 1.2, unit: 'mg/dL' }}
                  unit="mg/dL"
                  color="#06b6d4"
                />
              )}
            </div>
          )}
        </>
      )}

      {/* AI Lab & Medication Analysis Modal */}
      <AiLabAnalysisModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        analysis={analysisResult}
        loading={aiLoading}
        onReanalyze={handleRunAiAnalysis}
      />
    </div>
  );
}
