import { useEffect, useState } from 'react';
import { Pill, Loader2, Globe2, TrendingUp, ChevronDown, ChevronUp, Clock, ShieldAlert } from 'lucide-react';
import { addDoc, collection, doc, updateDoc, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../firebase';
import type { MhdUser, Medicine, ReportDoc, CaseDoc } from '../lib/types';
import { fmtD, todayStr, schedTimeFromDosage } from '../lib/format';
import { toast } from '../components/Toaster';
import { bind } from './bind';
import { PageHeader, Loading, EmptyState, StatusChip, inputCls, labelCls, btnPrimary, FilterPills } from './common';
import AiLabAnalysisModal from '../components/AiLabAnalysisModal';
import type { LabAnalysisResult } from '../server/geminiLabAnalyzer';
import HealthTrendsChart from '../components/HealthTrendsChart';
import { DEMO_MEDICINE_PROFILES } from '../lib/demoHealthData';

export default function MedicinesTab({ patientData }: { patientData: MhdUser }) {
  const [meds, setMeds] = useState<Medicine[] | null>(null);
  const [filter, setFilter] = useState('All');
  const [f, setF] = useState({ name: '', dosage: '', startDate: todayStr(), durationDays: '' });
  const [busy, setBusy] = useState(false);
  const [showDemoGraphs, setShowDemoGraphs] = useState(false);

  // AI Analytics state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<LabAnalysisResult | null>(null);

  useEffect(() => bind<Medicine>('medicines', [['patientId', '==', patientData.id]], setMeds), [patientData.id]);

  const runAiAnalysis = async () => {
    setAiModalOpen(true);
    setAiLoading(true);
    try {
      const reportsSnap = await getDocs(query(collection(db, 'reports'), limit(20)));
      const patientReports = reportsSnap.docs
        .filter((d) => d.data().patientId === patientData.id)
        .map((d) => ({ id: d.id, ...d.data() } as ReportDoc));

      const casesSnap = await getDocs(query(collection(db, 'cases'), limit(20)));
      const patientCases = casesSnap.docs
        .filter((d) => d.data().patientId === patientData.id)
        .map((d) => ({ id: d.id, ...d.data() } as CaseDoc));

      const res = await fetch('/api/ai/analyze-lab-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reports: patientReports,
          medicines: meds || [],
          cases: patientCases,
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

      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error('Error running AI medicine analysis:', err);
      toast('Could not complete AI analysis at this time.', 'err');
    } finally {
      setAiLoading(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) { toast('Enter the medicine name.', 'err'); return; }
    setBusy(true);
    try {
      await addDoc(collection(db, 'medicines'), {
        patientId: patientData.id, name: f.name.trim(), dosage: f.dosage,
        startDate: f.startDate || todayStr(), durationDays: f.durationDays,
        prescribedBy: `${patientData.name} (self-reported)`, verified: false,
        source: 'patient', active: true, createdAt: Date.now(),
      });
      toast('Medicine added');
      setF({ name: '', dosage: '', startDate: todayStr(), durationDays: '' });
    } catch { toast('Could not add medicine', 'err'); } finally { setBusy(false); }
  };

  const markTaken = async (m: Medicine) => {
    try {
      await updateDoc(doc(db, 'medicines', m.id), { [`takenDates.${todayStr()}`]: true });
      toast('Marked as taken');
    } catch { toast('Could not update', 'err'); }
  };

  const toggleActive = async (m: Medicine) => {
    try {
      await updateDoc(doc(db, 'medicines', m.id), { active: m.active === false });
      toast(m.active === false ? 'Medicine restarted' : 'Medicine stopped');
    } catch { toast('Could not update', 'err'); }
  };

  if (meds === null) return <div className="max-w-[1000px] mx-auto min-w-0 w-full"><Loading /></div>;

  const list = [...meds].sort((a, b) => b.createdAt - a.createdAt).filter((m) =>
    filter === 'All' ? true : filter === 'Active' ? m.active !== false : m.active === false);

  return (
    <div className="max-w-[1000px] mx-auto space-y-4 sm:space-y-6 pb-8 sm:pb-12 min-w-0 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <PageHeader title="Medicines" sub="Self-report medicines; a doctor verifies them. Track what you take each day." />
        </div>
        <button
          onClick={runAiAnalysis}
          className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-700 via-blue-600 to-[#2a8eff] hover:from-indigo-800 hover:to-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Globe2 className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>Worldwide Success & Mistakes</span>
        </button>
      </div>

      {list.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Globe2 className="w-4 h-4 text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[#1e3a8a] truncate">
                Worldwide Medication Analytics & Success Probability
              </p>
              <p className="text-slate-600 text-[11px] truncate">
                Accessing 14.8M+ international patient records to compute working success probabilities & avoid common worldwide mistakes.
              </p>
            </div>
          </div>
          <button
            onClick={runAiAnalysis}
            className="text-xs font-bold text-[#2a8eff] hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <span>View Global Analytics</span>
            <span>→</span>
          </button>
        </div>
      )}

      <form onSubmit={add} className="bg-surface border border-line rounded-xl sm:rounded-[4px] p-3.5 sm:p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 items-end min-w-0">
        <div className="min-w-0"><label className={labelCls}>Medicine name *</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls + ' text-xs sm:text-sm'} placeholder="e.g. Metformin 500mg" /></div>
        <div className="min-w-0"><label className={labelCls}>Dosage / when</label><input value={f.dosage} onChange={(e) => setF({ ...f, dosage: e.target.value })} className={inputCls + ' text-xs sm:text-sm'} placeholder="1 tablet after breakfast" /></div>
        <div className="min-w-0"><label className={labelCls}>Start date</label><input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} className={inputCls + ' text-xs sm:text-sm'} /></div>
        <div className="flex gap-2 items-end min-w-0">
          <div className="flex-1 min-w-0"><label className={labelCls}>Days</label><input value={f.durationDays} onChange={(e) => setF({ ...f, durationDays: e.target.value })} className={inputCls + ' text-xs sm:text-sm'} placeholder="e.g. 30" /></div>
          <button type="submit" disabled={busy} className={btnPrimary + ' flex items-center justify-center gap-1.5 disabled:opacity-70 px-3.5 py-2 text-xs sm:text-sm shrink-0'}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : ''} Add</button>
        </div>
      </form>

      <FilterPills filters={['All', 'Active', 'Stopped']} value={filter} onChange={setFilter} />

      {/* Demo Medicine Treatment Timelines & Health Trends Accordion */}
      <div className="bg-surface border border-line rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-[#2a8eff] rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-[#1e3a8a]">
                  Medicine Treatment Timelines & Health Response Graphs
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 font-mono">
                  DEMO DATA
                </span>
              </div>
              <p className="text-xs text-muted">
                Separate interactive charts for each medication displaying treatment timelines, dosage milestones, and biomarker response.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDemoGraphs(!showDemoGraphs)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#1e3a8a] text-xs font-bold rounded-xl transition-all cursor-pointer self-start sm:self-auto shrink-0"
          >
            <span>{showDemoGraphs ? 'Hide Demo Graphs' : 'View Demo Graphs (3 Medicines)'}</span>
            {showDemoGraphs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showDemoGraphs && (
          <div className="space-y-4 pt-3 border-t border-line">
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong>DEMO DATA:</strong> Realistic simulated clinical response curves for Metformin HCl, Atorvastatin, and Amlodipine.
                No real patient records or databases are altered.
              </p>
            </div>

            {DEMO_MEDICINE_PROFILES.map((medProfile) => (
              <div key={medProfile.id} className="p-3.5 sm:p-5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Pill className="w-4 h-4 text-[#2a8eff]" />
                    <span className="text-sm sm:text-base font-bold text-[#1e3a8a]">{medProfile.name} ({medProfile.dosage})</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {medProfile.efficacySummary.clinicalStatus}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Started: {fmtD(medProfile.startDate)}</span>
                </div>

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
              </div>
            ))}
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<Pill className="w-8 h-8 text-ghost mx-auto" strokeWidth={1.5} />} title="No medicines here" sub="Add one above — a doctor will verify it." />
      ) : (
        <div className="space-y-2.5 sm:space-y-3">
          {list.map((m, i) => {
            const taken = !!(m.takenDates && m.takenDates[todayStr()]);
            return (
              <div key={`${m.id}-${i}`} className="bg-surface border border-line rounded-xl sm:rounded-[4px] p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="text-xs sm:text-[14px] font-semibold text-ink truncate">{m.name} {taken && <span className="text-[11px] sm:text-[12px] text-ok font-medium">· taken today</span>}</p>
                  <p className="text-[11px] sm:text-[12px] text-muted mt-0.5">
                    {m.dosage || '—'} ·{schedTimeFromDosage(m.dosage || '')} · started {fmtD(m.startDate)}
                    {m.durationDays ? ` · ${m.durationDays} days` : ''} · by {m.prescribedBy || '—'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <StatusChip ok={m.verified} warn={!m.verified}>{m.verified ? `Verified${m.verifiedBy ? ` · ${m.verifiedBy}` : ''}` : 'Pending'}</StatusChip>
                  {m.active !== false && !taken && (
                    <button onClick={() => markTaken(m)} className="text-[11px] sm:text-[12px] font-medium text-ok border border-ok-bd px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[4px] hover:bg-ok-bg transition-colors">Mark Taken</button>
                  )}
                  <button onClick={() => toggleActive(m)} className="text-[11px] sm:text-[12px] font-medium text-muted border border-line px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[4px] hover:bg-app transition-colors">
                    {m.active === false ? '▶ Restart' : 'Stop'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Worldwide Medication & Lab Analysis Modal */}
      <AiLabAnalysisModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        analysis={analysisResult}
        loading={aiLoading}
        onReanalyze={runAiAnalysis}
        initialTab="global"
      />
    </div>
  );
}
