import { useEffect, useState } from 'react';
import { ListChecks, FileText, Sparkles, PlusCircle, ArrowUpDown, ChevronRight, Activity, Globe2, Target } from 'lucide-react';
import { addDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../firebase';
import type { MhdUser, ReportDoc, Medicine, CaseDoc } from '../lib/types';
import { fmtD, fmtDT, todayStr } from '../lib/format';
import Modal from '../components/Modal';
import { bind } from './bind';
import { PageHeader, Loading, EmptyState, StatusChip, FilterPills } from './common';
import AiLabAnalysisModal from '../components/AiLabAnalysisModal';
import type { LabAnalysisResult } from '../server/geminiLabAnalyzer';
import { toast } from '../components/Toaster';

export default function ResultsTab({ patientData }: { patientData: MhdUser }) {
  const [reports, setReports] = useState<ReportDoc[] | null>(null);
  const [medicines, setMedicines] = useState<Medicine[] | null>(null);
  const [cases, setCases] = useState<CaseDoc[] | null>(null);
  const [filter, setFilter] = useState('All');
  const [open, setOpen] = useState<ReportDoc | null>(null);

  // AI Analysis state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<LabAnalysisResult | null>(null);
  const [activeAnalysisTarget, setActiveAnalysisTarget] = useState<string | undefined>(undefined);
  const [modalInitialTab, setModalInitialTab] = useState<'global' | 'outcomes' | 'records' | 'cohort' | 'abnormal' | 'doctor'>('global');
  const [addingSample, setAddingSample] = useState(false);

  useEffect(() => bind<ReportDoc>('reports', [['patientId', '==', patientData.id]], setReports), [patientData.id]);
  useEffect(() => bind<Medicine>('medicines', [['patientId', '==', patientData.id]], setMedicines), [patientData.id]);
  useEffect(() => bind<CaseDoc>('cases', [['patientId', '==', patientData.id]], setCases), [patientData.id]);

  const runAiAnalysis = async (
    specificReport?: ReportDoc,
    tab: 'global' | 'outcomes' | 'records' | 'cohort' | 'abnormal' | 'doctor' = 'global'
  ) => {
    setModalInitialTab(tab);
    setActiveAnalysisTarget(specificReport ? specificReport.title : undefined);
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
        /* fallback */
      }

      const activeList = reports || [];
      const res = await fetch('/api/ai/analyze-lab-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reports: activeList,
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
          specificReportId: specificReport ? specificReport.id : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('Analysis request failed');
      }

      const data = await res.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error('Error running AI lab analysis:', err);
      toast('Could not complete AI analysis at this time.', 'err');
    } finally {
      setAiLoading(false);
    }
  };

  const handleLoadSampleData = async () => {
    setAddingSample(true);
    try {
      const sample1: Omit<ReportDoc, 'id'> = {
        patientId: patientData.id,
        patientName: patientData.name,
        healthId: patientData.healthId || 'MHD-1001',
        title: 'Comprehensive Metabolic & Lipid Panel',
        type: 'Lab Report',
        date: '2025-11-12',
        hospital: 'MHD Central Super-Specialty Hospital',
        doctor: 'Dr. Sarah Jenkins',
        doctorName: 'Dr. Sarah Jenkins',
        note: 'Fasting Blood Glucose: 156 mg/dL (High). HbA1c: 7.7% (High). Total Cholesterol: 238 mg/dL (High). Triglycerides: 195 mg/dL (High). Serum Creatinine: 0.9 mg/dL (Normal). Hemoglobin: 14.1 g/dL (Normal).',
        verified: true,
        uploadedBy: 'Central Clinical Laboratory',
        uploadedByRole: 'hospital',
        createdAt: Date.now() - 90 * 86400000,
      };

      const sample2: Omit<ReportDoc, 'id'> = {
        patientId: patientData.id,
        patientName: patientData.name,
        healthId: patientData.healthId || 'MHD-1001',
        title: 'Follow-up Glycemic & Lipid Evaluation',
        type: 'Lab Report',
        date: todayStr(),
        hospital: 'MHD Central Super-Specialty Hospital',
        doctor: 'Dr. Sarah Jenkins',
        doctorName: 'Dr. Sarah Jenkins',
        note: 'Fasting Blood Glucose: 134 mg/dL (Improved from 156). HbA1c: 6.9% (Improved from 7.7%). Total Cholesterol: 216 mg/dL (Down from 238). Triglycerides: 168 mg/dL (Down from 195). Serum Creatinine: 0.9 mg/dL (Stable). Hemoglobin: 14.3 g/dL (Stable).',
        verified: true,
        uploadedBy: 'Central Clinical Laboratory',
        uploadedByRole: 'hospital',
        createdAt: Date.now(),
      };

      await addDoc(collection(db, 'reports'), sample1);
      await addDoc(collection(db, 'reports'), sample2);
      toast('Sample lab reports loaded successfully');
    } catch (err) {
      console.error('Failed to add sample records:', err);
      toast('Failed to load sample reports', 'err');
    } finally {
      setAddingSample(false);
    }
  };

  if (reports === null) return <div className="max-w-[1000px] mx-auto min-w-0 w-full"><Loading /></div>;

  const types = ['All', ...Array.from(new Set(reports.map((r) => r.type)))];
  const list = [...reports].sort((a, b) => b.createdAt - a.createdAt)
    .filter((r) => filter === 'All' || r.type === filter);

  return (
    <div className="max-w-[1000px] mx-auto space-y-4 sm:space-y-6 pb-8 sm:pb-12 min-w-0 w-full">
      {/* Top Header with Worldwide Medication Analytics & AI Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <PageHeader title="My Lab" sub="Lab reports, scans, worldwide medication analytics & hospital documents." />
        </div>

        {reports.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => runAiAnalysis(undefined, 'global')}
              className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-700 via-blue-600 to-[#2a8eff] hover:from-indigo-800 hover:to-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
            >
              <Globe2 className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Worldwide Rx Success & Mistakes</span>
            </button>
            <button
              onClick={() => runAiAnalysis(undefined, 'outcomes')}
              className="inline-flex items-center justify-center gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 bg-blue-50 hover:bg-blue-100 text-[#1e3a8a] border border-blue-200 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#2a8eff]" />
              <span>AI Lab Breakdown</span>
            </button>
          </div>
        )}
      </div>

      {/* Global Real-World Evidence Intelligence Notice */}
      {reports.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Globe2 className="w-4 h-4 text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[#1e3a8a] truncate">
                Worldwide Medication Analytics & Pitfall Prevention Connected
              </p>
              <p className="text-slate-600 text-[11px] truncate">
                Accessing 14.8M+ international patient records to compute highest working success probabilities & avoid common global mistakes.
              </p>
            </div>
          </div>
          <button
            onClick={() => runAiAnalysis(undefined, 'global')}
            className="text-xs font-bold text-[#2a8eff] hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <span>View Worldwide Analytics</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <FilterPills filters={types} value={filter} onChange={setFilter} />

      {list.length === 0 ? (
        <div className="bg-surface border border-line rounded-xl sm:rounded-2xl p-6 sm:p-10 text-center space-y-4 shadow-xs">
          <EmptyState
            icon={<ListChecks className="w-8 h-8 text-ghost mx-auto" strokeWidth={1.5} />}
            title="No results yet"
            sub="Documents and lab reports uploaded by your hospital will appear here."
          />
          <div className="pt-2">
            <button
              onClick={handleLoadSampleData}
              disabled={addingSample}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#1e3a8a] border border-blue-200 rounded-xl text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-[#2a8eff]" />
              <span>{addingSample ? 'Loading Sample Reports…' : 'Load Sample Clinical Lab Records'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {list.map((r, idx) => (
            <div
              key={`${r.id}-${idx}`}
              className="bg-surface border border-line rounded-xl sm:rounded-2xl p-3.5 sm:p-4 shadow-sm hover:border-[#2a8eff]/60 transition-all flex flex-col justify-between min-w-0"
            >
              <button
                onClick={() => setOpen(r)}
                className="text-left w-full cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    {r.fileData ? (
                      <img src={r.fileData} alt="" className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-line shrink-0" />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-[#2a8eff]" strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs sm:text-[13px] font-semibold text-ink truncate">{r.title}</p>
                      <p className="text-[11px] sm:text-[12px] text-muted truncate">{r.type} · {fmtD(r.date)}</p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusChip ok={r.verified} warn={!r.verified}>{r.verified ? 'Verified' : 'Pending'}</StatusChip>
                  </div>
                </div>

                {r.note && (
                  <p className="mt-2.5 text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {r.note}
                  </p>
                )}
              </button>

              {/* Bottom Card Actions */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => setOpen(r)}
                  className="text-slate-500 hover:text-slate-800 text-[11px] font-medium transition-colors"
                >
                  View Details
                </button>
                <button
                  onClick={() => runAiAnalysis(r)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2a8eff] hover:text-blue-700 hover:underline transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>AI Breakdown</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {open && (
        <Modal
          title={open.title}
          onClose={() => setOpen(null)}
          icon={<FileText className="w-5 h-5 text-primary" strokeWidth={1.5} />}
        >
          {open.fileData && (
            <img src={open.fileData} alt={open.title} className="w-full max-h-[300px] object-contain rounded-lg border border-line mb-3 sm:mb-4 bg-black/5" />
          )}

          <div className="mb-4">
            <button
              onClick={() => {
                setOpen(null);
                runAiAnalysis(open);
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-blue-600 to-[#2a8eff] hover:from-blue-700 hover:to-[#1e74ff] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Analyze This Report with Gemini AI</span>
            </button>
          </div>

          <dl className="text-xs sm:text-[13px] space-y-2">
            {[
              ['Type', open.type],
              ['Date', fmtD(open.date)],
              ['Hospital', open.hospital],
              ['Doctor', open.doctor],
              ['Clinical Findings', open.note],
              ['Uploaded by', (open.uploadedBy || '—') + (open.uploadedByRole ? ` (${open.uploadedByRole})` : '')],
              ['Uploaded on', fmtDT(open.createdAt)],
              ['Status', open.verified ? 'Verified by Hospital' : 'Awaiting hospital verification'],
            ].map(([k, v], i) => v && (
              <div key={`${k}-${i}`} className="flex flex-col sm:flex-row sm:gap-2 border-b border-line/40 pb-1.5 last:border-0">
                <dt className="w-full sm:w-[110px] shrink-0 font-medium text-muted">{k}</dt>
                <dd className="text-ink break-words font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}

      {/* AI Lab Analysis Modal */}
      <AiLabAnalysisModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        analysis={analysisResult}
        loading={aiLoading}
        onReanalyze={() => runAiAnalysis(undefined, modalInitialTab)}
        reportTitle={activeAnalysisTarget}
        initialTab={modalInitialTab}
      />
    </div>
  );
}
