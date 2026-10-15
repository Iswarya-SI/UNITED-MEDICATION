import { useEffect, useState, useMemo } from 'react';
import {
  Activity,
  Sparkles,
  Pill,
  TrendingUp,
  FileText,
  Calendar,
  AlertCircle,
  PlusCircle,
  Stethoscope,
  Info,
  ShieldCheck,
  RefreshCw,
  Layers,
  Heart,
  Globe2
} from 'lucide-react';
import { addDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../firebase';
import type { MhdUser, ReportDoc, Medicine, VitalsDoc, CaseDoc } from '../lib/types';
import { todayStr, fmtD } from '../lib/format';
import { bind } from './bind';
import { PageHeader, Loading, EmptyState } from './common';
import HealthTrendsChart, { type DataPoint, type ReferenceRange, type MedicineMilestone } from '../components/HealthTrendsChart';
import AiLabAnalysisModal from '../components/AiLabAnalysisModal';
import type { LabAnalysisResult } from '../server/geminiLabAnalyzer';
import { toast } from '../components/Toaster';

export default function HealthTrendsTab({ patientData }: { patientData: MhdUser }) {
  const [reports, setReports] = useState<ReportDoc[] | null>(null);
  const [medicines, setMedicines] = useState<Medicine[] | null>(null);
  const [vitals, setVitals] = useState<VitalsDoc[] | null>(null);
  const [cases, setCases] = useState<CaseDoc[] | null>(null);

  const [activeView, setActiveView] = useState<'biomarkers' | 'meds' | 'vitals'>('biomarkers');
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<LabAnalysisResult | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Bind real-time data from Firestore
  useEffect(() => bind<ReportDoc>('reports', [['patientId', '==', patientData.id]], setReports), [patientData.id]);
  useEffect(() => bind<Medicine>('medicines', [['patientId', '==', patientData.id]], setMedicines), [patientData.id]);
  useEffect(() => bind<VitalsDoc>('vitals', [['patientId', '==', patientData.id]], setVitals), [patientData.id]);
  useEffect(() => bind<CaseDoc>('cases', [['patientId', '==', patientData.id]], setCases), [patientData.id]);

  // Extract structured biomarker time-series from actual reports & vitals
  const biomarkerSeries = useMemo(() => {
    const glucosePts: DataPoint[] = [];
    const hba1cPts: DataPoint[] = [];
    const sysBpPts: DataPoint[] = [];
    const diaBpPts: DataPoint[] = [];
    const cholPts: DataPoint[] = [];
    const trigPts: DataPoint[] = [];
    const creatPts: DataPoint[] = [];
    const hemoPts: DataPoint[] = [];

    // 1. Parse from Lab Reports notes and summaries
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

    // 2. Parse from clinical Vitals recorded by doctors
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

  // Extract medicine milestone markers
  const medicineMilestones = useMemo(() => {
    const milestones: MedicineMilestone[] = [];
    (medicines || []).forEach((m) => {
      if (m.startDate) {
        milestones.push({
          date: m.startDate,
          timestamp: new Date(m.startDate).getTime() || m.createdAt,
          medicineName: m.name,
          dosage: m.dosage,
          type: 'started',
          note: `Started ${m.name} (${m.dosage})`,
        });
      }
    });
    return milestones;
  }, [medicines]);

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

      const res = await fetch('/api/ai/analyze-lab-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reports: reports || [],
          medicines: medicines || [],
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

  // Seed realistic multi-month clinical data if account has no history
  const handleSeedClinicalData = async () => {
    setSeeding(true);
    try {
      const dayMs = 86400000;
      const now = Date.now();

      // Seed 2 medicines
      await addDoc(collection(db, 'medicines'), {
        patientId: patientData.id,
        name: 'Metformin HCl',
        dosage: '500 mg BD (Twice daily)',
        startDate: '2025-10-15',
        active: true,
        prescribedBy: 'Dr. Sarah Jenkins',
        verified: true,
        createdAt: now - 120 * dayMs,
      });

      await addDoc(collection(db, 'medicines'), {
        patientId: patientData.id,
        name: 'Atorvastatin',
        dosage: '10 mg OD (Once daily at night)',
        startDate: '2025-10-15',
        active: true,
        prescribedBy: 'Dr. Sarah Jenkins',
        verified: true,
        createdAt: now - 120 * dayMs,
      });

      // Seed 3 sequential lab reports across 4 months showing glycemic & lipid progression
      await addDoc(collection(db, 'reports'), {
        patientId: patientData.id,
        patientName: patientData.name,
        healthId: patientData.healthId || 'MHD-1001',
        title: 'Initial Metabolic & Glycemic Profile',
        type: 'Lab Report',
        date: '2025-10-15',
        hospital: 'MHD Central Hospital',
        doctor: 'Dr. Sarah Jenkins',
        note: 'Fasting Glucose: 168 mg/dL (Elevated). HbA1c: 7.9% (Elevated). Total Cholesterol: 242 mg/dL (Elevated). Triglycerides: 210 mg/dL. Creatinine: 0.9 mg/dL (Normal). Hemoglobin: 14.1 g/dL.',
        verified: true,
        uploadedBy: 'Central Laboratory',
        createdAt: now - 120 * dayMs,
      });

      await addDoc(collection(db, 'reports'), {
        patientId: patientData.id,
        patientName: patientData.name,
        healthId: patientData.healthId || 'MHD-1001',
        title: 'Interim Follow-up Panel',
        type: 'Lab Report',
        date: '2025-12-20',
        hospital: 'MHD Central Hospital',
        doctor: 'Dr. Sarah Jenkins',
        note: 'Fasting Glucose: 148 mg/dL (Decreased from 168). HbA1c: 7.3% (Down from 7.9). Total Cholesterol: 224 mg/dL. Triglycerides: 185 mg/dL. Creatinine: 0.9 mg/dL. Hemoglobin: 14.2 g/dL.',
        verified: true,
        uploadedBy: 'Central Laboratory',
        createdAt: now - 55 * dayMs,
      });

      await addDoc(collection(db, 'reports'), {
        patientId: patientData.id,
        patientName: patientData.name,
        healthId: patientData.healthId || 'MHD-1001',
        title: 'Comprehensive Quarterly Evaluation',
        type: 'Lab Report',
        date: todayStr(),
        hospital: 'MHD Central Hospital',
        doctor: 'Dr. Sarah Jenkins',
        note: 'Fasting Glucose: 132 mg/dL (Positive progress). HbA1c: 6.8% (Meaningful improvement). Total Cholesterol: 210 mg/dL. Triglycerides: 162 mg/dL. Creatinine: 0.9 mg/dL (Stable kidney filtration). Hemoglobin: 14.4 g/dL.',
        verified: true,
        uploadedBy: 'Central Laboratory',
        createdAt: now,
      });

      // Seed clinical vitals
      await addDoc(collection(db, 'vitals'), {
        patientId: patientData.id,
        date: '2025-10-15',
        bp: '138/88',
        temp: '98.4',
        hr: '76',
        wt: '78',
        enteredBy: 'Nurse Station',
        doctorName: 'Dr. Sarah Jenkins',
        createdAt: now - 120 * dayMs,
      });

      await addDoc(collection(db, 'vitals'), {
        patientId: patientData.id,
        date: '2025-12-20',
        bp: '132/84',
        temp: '98.6',
        hr: '74',
        wt: '77',
        enteredBy: 'Nurse Station',
        doctorName: 'Dr. Sarah Jenkins',
        createdAt: now - 55 * dayMs,
      });

      await addDoc(collection(db, 'vitals'), {
        patientId: patientData.id,
        date: todayStr(),
        bp: '124/80',
        temp: '98.4',
        hr: '72',
        wt: '76',
        enteredBy: 'Nurse Station',
        doctorName: 'Dr. Sarah Jenkins',
        createdAt: now,
      });

      toast('Realistic clinical timeline loaded successfully');
    } catch (err) {
      console.error(err);
      toast('Failed to load sample data', 'err');
    } finally {
      setSeeding(false);
    }
  };

  const hasData =
    biomarkerSeries.glucose.length > 0 ||
    biomarkerSeries.hba1c.length > 0 ||
    biomarkerSeries.sysBp.length > 0 ||
    biomarkerSeries.cholesterol.length > 0;

  if (reports === null || medicines === null || vitals === null) {
    return (
      <div className="max-w-[1050px] mx-auto min-w-0 w-full">
        <Loading />
      </div>
    );
  }

  return (
    <div className="max-w-[1050px] mx-auto space-y-4 sm:space-y-6 pb-8 sm:pb-12 min-w-0 w-full">
      {/* Top Header with AI Correlation Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <PageHeader
            title="Health Trends & Graphs"
            sub="Interactive charts of your blood glucose, HbA1c, blood pressure, cholesterol, and medication timelines."
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

      {/* Navigation View Switcher */}
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

      {/* Empty State Banner with 1-Click Clinical Seeder */}
      {!hasData && (
        <div className="bg-surface border border-line rounded-2xl p-6 sm:p-10 text-center space-y-4 shadow-xs">
          <EmptyState
            icon={<Activity className="w-8 h-8 text-ghost mx-auto" strokeWidth={1.5} />}
            title="No measurement history yet"
            sub="When your hospital uploads laboratory panels or records doctor vitals, your interactive trends and medicine graphs will appear here."
          />
          <div className="pt-2">
            <button
              onClick={handleSeedClinicalData}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#1e3a8a] border border-blue-200 rounded-xl text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-[#2a8eff]" />
              <span>{seeding ? 'Generating Sample Clinical Timeline…' : 'Load Sample Clinical History (Glucose, Lipids, BP)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: Core Biomarker Charts */}
      {activeView === 'biomarkers' && hasData && (
        <div className="space-y-6">
          {/* Blood Glucose Chart */}
          {biomarkerSeries.glucose.length > 0 && (
            <HealthTrendsChart
              title="Fasting Blood Glucose"
              subtitle="Blood glucose concentration after fasting, tracked across laboratory tests."
              data={biomarkerSeries.glucose}
              referenceRange={{ min: 70, max: 99, unit: 'mg/dL' }}
              unit="mg/dL"
              color="#2a8eff"
              milestones={medicineMilestones.filter((m) => m.medicineName.toLowerCase().includes('metformin'))}
            />
          )}

          {/* HbA1c Chart */}
          {biomarkerSeries.hba1c.length > 0 && (
            <HealthTrendsChart
              title="HbA1c (Glycated Hemoglobin)"
              subtitle="Average blood sugar exposure over 2 to 3 months."
              data={biomarkerSeries.hba1c}
              referenceRange={{ min: 4.0, max: 5.6, unit: '%' }}
              unit="%"
              color="#8b5cf6"
              milestones={medicineMilestones.filter((m) => m.medicineName.toLowerCase().includes('metformin'))}
            />
          )}

          {/* Blood Pressure Chart (Systolic) */}
          {biomarkerSeries.sysBp.length > 0 && (
            <HealthTrendsChart
              title="Systolic Blood Pressure"
              subtitle="Pressure during heart contractions, recorded during clinical visits."
              data={biomarkerSeries.sysBp}
              referenceRange={{ min: 90, max: 120, unit: 'mmHg' }}
              unit="mmHg"
              color="#ef4444"
            />
          )}

          {/* Total Cholesterol Chart */}
          {biomarkerSeries.cholesterol.length > 0 && (
            <HealthTrendsChart
              title="Total Cholesterol"
              subtitle="Circulating blood lipids, monitored for cardiovascular wellness."
              data={biomarkerSeries.cholesterol}
              referenceRange={{ min: 125, max: 200, unit: 'mg/dL' }}
              unit="mg/dL"
              color="#f59e0b"
              milestones={medicineMilestones.filter((m) => m.medicineName.toLowerCase().includes('statin'))}
            />
          )}

          {/* Triglycerides Chart */}
          {biomarkerSeries.triglycerides.length > 0 && (
            <HealthTrendsChart
              title="Triglycerides"
              subtitle="Stored dietary fats circulating in the bloodstream."
              data={biomarkerSeries.triglycerides}
              referenceRange={{ min: 40, max: 150, unit: 'mg/dL' }}
              unit="mg/dL"
              color="#f97316"
            />
          )}

          {/* Kidney Function / Creatinine Chart */}
          {biomarkerSeries.creatinine.length > 0 && (
            <HealthTrendsChart
              title="Serum Creatinine"
              subtitle="Waste filtration metric indicating kidney clearance function."
              data={biomarkerSeries.creatinine}
              referenceRange={{ min: 0.6, max: 1.2, unit: 'mg/dL' }}
              unit="mg/dL"
              color="#06b6d4"
            />
          )}
        </div>
      )}

      {/* VIEW 2: Medicine-wise Dedicated Graphs */}
      {activeView === 'meds' && (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-start gap-3">
            <Info className="w-5 h-5 text-[#2a8eff] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 space-y-1">
              <p className="font-bold text-[#1e3a8a]">Medicine-Correlated Timeline Graphs</p>
              <p>
                Each section pairs your prescribed medicine with its relevant laboratory markers recorded before,
                during, and after treatment.
              </p>
              <p className="text-[11px] text-slate-500 italic">
                *Clinical Evidence Reminder: Correlation does not claim direct causation. Many lifestyle,
                dietary, and metabolic variables influence lab readings alongside prescribed therapies.
              </p>
            </div>
          </div>

          {(medicines || []).length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <Pill className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No prescribed medicines on record yet.</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                When a doctor prescribes a medicine in your case records, a dedicated tracking graph will be generated here automatically.
              </p>
              <button
                onClick={handleSeedClinicalData}
                disabled={seeding}
                className="px-4 py-2 bg-white border border-slate-200 text-[#1e3a8a] text-xs font-semibold rounded-xl hover:bg-slate-100"
              >
                Load Sample Prescriptions & Labs
              </button>
            </div>
          ) : (
            (medicines || []).map((med, idx) => {
              const medLower = med.name.toLowerCase();
              const isDiabetes =
                medLower.includes('metformin') || medLower.includes('glimepiride') || medLower.includes('insulin');
              const isStatin =
                medLower.includes('statin') || medLower.includes('atorvastatin') || medLower.includes('fenofibrate');
              const isBp =
                medLower.includes('amlodipine') ||
                medLower.includes('telmisartan') ||
                medLower.includes('enalapril') ||
                medLower.includes('losartan');

              // Select correlated lab data points
              const correlatedData: DataPoint[] = isDiabetes
                ? biomarkerSeries.glucose.length > 0
                  ? biomarkerSeries.glucose
                  : biomarkerSeries.hba1c
                : isStatin
                ? biomarkerSeries.cholesterol.length > 0
                  ? biomarkerSeries.cholesterol
                  : biomarkerSeries.triglycerides
                : isBp
                ? biomarkerSeries.sysBp
                : biomarkerSeries.glucose;

              const correlatedUnit = isDiabetes
                ? biomarkerSeries.glucose.length > 0
                  ? 'mg/dL'
                  : '%'
                : isStatin
                ? 'mg/dL'
                : isBp
                ? 'mmHg'
                : 'units';

              const correlatedRange: ReferenceRange | undefined = isDiabetes
                ? biomarkerSeries.glucose.length > 0
                  ? { min: 70, max: 99, unit: 'mg/dL' }
                  : { min: 4.0, max: 5.6, unit: '%' }
                : isStatin
                ? { min: 125, max: 200, unit: 'mg/dL' }
                : isBp
                ? { min: 90, max: 120, unit: 'mmHg' }
                : undefined;

              return (
                <div key={`${med.id}-${idx}`} className="space-y-3">
                  <HealthTrendsChart
                    title={`Treatment Response: ${med.name}`}
                    subtitle={`Tracking correlated lab indicators alongside prescription of ${med.dosage}.`}
                    data={correlatedData}
                    unit={correlatedUnit}
                    referenceRange={correlatedRange}
                    color={isDiabetes ? '#2a8eff' : isStatin ? '#f59e0b' : '#10b981'}
                    medicineTimeline={{
                      name: med.name,
                      dosage: med.dosage,
                      startDate: med.startDate || todayStr(),
                      active: med.active !== false,
                      history: [
                        {
                          date: med.startDate || todayStr(),
                          dosage: med.dosage,
                          note: `Prescribed by ${med.prescribedBy || 'Treating Physician'}`,
                        },
                      ],
                    }}
                  />
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 3: Raw Clinical Vitals Log Table */}
      {activeView === 'vitals' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-bold text-[#1e3a8a] uppercase tracking-wider">
              Chronological Clinical Vitals Log
            </h4>
            <span className="text-xs text-slate-500">{(vitals || []).length} Recorded Visits</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[550px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Blood Pressure</th>
                  <th className="px-4 py-3">Pulse / HR</th>
                  <th className="px-4 py-3">Temp (°F)</th>
                  <th className="px-4 py-3">Weight (kg)</th>
                  <th className="px-4 py-3">Symptoms / Notes</th>
                  <th className="px-4 py-3">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-[13px]">
                {(vitals || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No vitals on record yet.
                    </td>
                  </tr>
                ) : (
                  [...(vitals || [])]
                    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                    .map((v, i) => (
                      <tr key={`${v.id}-${i}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">{fmtD(v.date)}</td>
                        <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{v.bp || '—'}</td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{v.hr ? `${v.hr} bpm` : '—'}</td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{v.temp || '—'}</td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{v.wt ? `${v.wt} kg` : '—'}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{v.sym || '—'}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{v.doctorName || v.enteredBy || 'Hospital'}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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
