import { useState } from 'react';
import {
  TrendingUp,
  Activity,
  Droplets,
  HeartPulse,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import HealthTrendsChart from '../HealthTrendsChart';
import {
  DEMO_GLUCOSE_DATA,
  DEMO_HBA1C_DATA,
  DEMO_SYS_BP_DATA,
  DEMO_DIA_BP_DATA,
  DEMO_CHOLESTEROL_DATA,
} from '../../lib/demoHealthData';

interface DemoHealthTrendsPreviewProps {
  onOpenFull: () => void;
}

type MetricKey = 'glucose' | 'hba1c' | 'bp' | 'cholesterol';

export default function DemoHealthTrendsPreview({ onOpenFull }: DemoHealthTrendsPreviewProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('glucose');

  const METRICS: {
    key: MetricKey;
    label: string;
    sub: string;
    unit: string;
    color: string;
    latest: string;
    target: string;
  }[] = [
    {
      key: 'glucose',
      label: 'Blood Glucose',
      sub: 'Fasting Blood Sugar',
      unit: 'mg/dL',
      color: '#2a8eff',
      latest: '104 mg/dL',
      target: '70 – 99 mg/dL',
    },
    {
      key: 'hba1c',
      label: 'HbA1c',
      sub: '3-Mo Glycemic Average',
      unit: '%',
      color: '#8b5cf6',
      latest: '6.3%',
      target: '4.0 – 5.6%',
    },
    {
      key: 'bp',
      label: 'Blood Pressure',
      sub: 'Systolic & Diastolic',
      unit: 'mmHg',
      color: '#ef4444',
      latest: '118/78 mmHg',
      target: '<120/80 mmHg',
    },
    {
      key: 'cholesterol',
      label: 'Cholesterol',
      sub: 'Total Serum Lipids',
      unit: 'mg/dL',
      color: '#f59e0b',
      latest: '176 mg/dL',
      target: '125 – 200 mg/dL',
    },
  ];

  return (
    <div className="bg-surface border border-line rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
      {/* Header with DEMO DATA Badge and Full View Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-1.5 bg-blue-50 rounded-lg text-[#2a8eff]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#1e3a8a] tracking-tight">
              Interactive Health Trends & Biomarkers
            </h3>
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300 font-mono shadow-2xs">
              DEMO DATA
            </span>
          </div>
          <p className="text-xs text-muted">
            Realistic multi-month clinical response trajectories for Blood Glucose, HbA1c, Blood Pressure, and Cholesterol.
          </p>
        </div>

        <button
          onClick={onOpenFull}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2a8eff] hover:text-[#1e74ff] hover:underline self-start sm:self-auto shrink-0 cursor-pointer"
        >
          <span>View All Medicine-wise Graphs</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Segmented Metric Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {METRICS.map((m) => {
          const isSelected = selectedMetric === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setSelectedMetric(m.key)}
              className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-50/70 border-[#2a8eff] shadow-2xs'
                  : 'bg-app border-line hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted">
                <span>{m.label}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: m.color }}
                />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-bold text-ink">{m.latest}</span>
              </div>
              <p className="text-[10px] text-muted truncate mt-0.5">Target: {m.target}</p>
            </button>
          );
        })}
      </div>

      {/* Render Selected Interactive Chart */}
      <div className="pt-1">
        {selectedMetric === 'glucose' && (
          <HealthTrendsChart
            title="Fasting Blood Glucose"
            subtitle="Demonstrating 172 mg/dL to 104 mg/dL glycemic reduction under Metformin therapy (DEMO DATA)."
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
                note: 'Initiated at 500mg daily',
              },
              {
                date: '2026-03-05',
                timestamp: new Date('2026-03-05').getTime(),
                medicineName: 'Metformin HCl',
                dosage: '500mg BD',
                type: 'dose_change',
                note: 'Titrated to twice daily for glycemic control',
              },
            ]}
          />
        )}

        {selectedMetric === 'hba1c' && (
          <HealthTrendsChart
            title="HbA1c (Glycated Hemoglobin)"
            subtitle="Quarterly 3-month average blood glucose reduction from 8.6% to 6.3% (DEMO DATA)."
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
        )}

        {selectedMetric === 'bp' && (
          <HealthTrendsChart
            title="Blood Pressure (Systolic & Diastolic)"
            subtitle="Dual-line arterial pressure tracking from 146/94 mmHg down to optimal 118/78 mmHg (DEMO DATA)."
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
                note: 'Amlodipine 5mg started for hypertension',
              },
            ]}
          />
        )}

        {selectedMetric === 'cholesterol' && (
          <HealthTrendsChart
            title="Total Serum Cholesterol"
            subtitle="Cardiovascular risk reduction from 256 mg/dL to 176 mg/dL under Atorvastatin 10mg (DEMO DATA)."
            data={DEMO_CHOLESTEROL_DATA}
            referenceRange={{ min: 125, max: 200, unit: 'mg/dL', label: 'Target' }}
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
                note: 'Atorvastatin 10mg started at bedtime',
              },
            ]}
          />
        )}
      </div>
    </div>
  );
}
