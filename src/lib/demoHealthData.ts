import type { DataPoint, ReferenceRange, MedicineMilestone } from '../components/HealthTrendsChart';

/**
 * Realistic in-memory clinical demo dataset for MHD Patient Portal.
 * Designed for demonstration only.
 * NEVER writes to or modifies Firebase, MongoDB, or real user records.
 */

export interface DemoMedicineProfile {
  id: string;
  name: string;
  genericName: string;
  dosage: string;
  frequency: string;
  timing: string;
  condition: string;
  startDate: string;
  active: boolean;
  prescribedBy: string;
  doctorSpecialty: string;
  hospital: string;
  clinicalObjective: string;
  history: { date: string; dosage: string; note: string }[];
  milestones: MedicineMilestone[];
  correlatedBiomarker: {
    title: string;
    subtitle: string;
    unit: string;
    color: string;
    referenceRange: ReferenceRange;
    data: DataPoint[];
  };
  secondaryBiomarker?: {
    title: string;
    unit: string;
    color: string;
    referenceRange?: ReferenceRange;
    data: DataPoint[];
  };
  efficacySummary: {
    baselineValue: string;
    latestValue: string;
    netChange: string;
    percentageImprovement: string;
    clinicalStatus: 'Controlled' | 'Improving' | 'Target Attained';
    adherenceRate: number; // e.g. 96%
    doctorReviewNote: string;
  };
}

export interface DemoVitalsEntry {
  id: string;
  date: string;
  time: string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  temperature: number;
  respiratoryRate: number;
  weightKg: number;
  spo2: number;
  doctorName: string;
  clinic: string;
  notes: string;
}

// 1. Core Biomarker Datasets (Simulated 9-Month Trajectory)

export const DEMO_GLUCOSE_DATA: DataPoint[] = [
  {
    date: '2025-11-10',
    timestamp: new Date('2025-11-10').getTime(),
    value: 172,
    unit: 'mg/dL',
    note: 'Initial fasting test: Elevated fasting glucose. Metformin 500mg initiated.',
    doctor: 'Dr. Sarah Jenkins, MD',
    source: 'Central Laboratory Panel',
    medicationContext: 'Prior to regular Metformin regimen',
  },
  {
    date: '2025-12-15',
    timestamp: new Date('2025-12-15').getTime(),
    value: 158,
    unit: 'mg/dL',
    note: 'Follow-up visit: Fasting blood sugar decreased by 14 mg/dL. Good medication tolerance.',
    doctor: 'Dr. Sarah Jenkins, MD',
    source: 'Follow-up Lab Review',
    medicationContext: 'Metformin 500mg OD',
  },
  {
    date: '2026-01-22',
    timestamp: new Date('2026-01-22').getTime(),
    value: 146,
    unit: 'mg/dL',
    note: 'Routine check: Continued downward trend. Doctor advised walking 25 min after dinner.',
    doctor: 'Dr. Sarah Jenkins, MD',
    source: 'Hospital Diagnostic Center',
    medicationContext: 'Metformin 500mg OD',
  },
  {
    date: '2026-03-05',
    timestamp: new Date('2026-03-05').getTime(),
    value: 134,
    unit: 'mg/dL',
    note: 'Quarterly review: Dose adjusted to Metformin 500mg BD for optimal glycemic stabilization.',
    doctor: 'Dr. Sarah Jenkins, MD',
    source: 'Quarterly Metabolic Panel',
    medicationContext: 'Titrated to Metformin 500mg BD',
  },
  {
    date: '2026-05-18',
    timestamp: new Date('2026-05-18').getTime(),
    value: 121,
    unit: 'mg/dL',
    note: 'Post-titration panel: Clear therapeutic response. Hepatic glucose output well suppressed.',
    doctor: 'Dr. Sarah Jenkins, MD',
    source: 'Automated Lab Analyzer',
    medicationContext: 'Metformin 500mg BD',
  },
  {
    date: '2026-07-28',
    timestamp: new Date('2026-07-28').getTime(),
    value: 112,
    unit: 'mg/dL',
    note: 'Mid-year evaluation: Glucose nearing standard target range. No gastrointestinal complaints.',
    doctor: 'Dr. Sarah Jenkins, MD',
    source: 'Outpatient Clinic Panel',
    medicationContext: 'Metformin 500mg BD',
  },
  {
    date: '2026-09-14',
    timestamp: new Date('2026-09-14').getTime(),
    value: 104,
    unit: 'mg/dL',
    note: 'Latest panel: Optimal control achieved. Fasting levels within healthy target boundaries.',
    doctor: 'Dr. Sarah Jenkins, MD',
    source: 'Comprehensive Health Panel',
    medicationContext: 'Metformin 500mg BD',
  },
];

export const DEMO_HBA1C_DATA: DataPoint[] = [
  {
    date: '2025-11-10',
    timestamp: new Date('2025-11-10').getTime(),
    value: 8.6,
    unit: '%',
    note: 'Baseline HbA1c: 8.6% reflects significant average hyperglycemia over prior 3 months.',
    doctor: 'Dr. Sarah Jenkins, MD',
    source: 'Diagnostic Endocrinology Panel',
  },
  {
    date: '2026-02-12',
    timestamp: new Date('2026-02-12').getTime(),
    value: 7.7,
    unit: '%',
    note: '3-Month Follow-up: Down by 0.9% following first-line therapy initiation.',
    doctor: 'Dr. Sarah Jenkins, MD',
    source: 'Quarterly Review Panel',
  },
  {
    date: '2026-05-20',
    timestamp: new Date('2026-05-20').getTime(),
    value: 6.9,
    unit: '%',
    note: '6-Month Follow-up: Crosses ADA therapeutic threshold (<7.0%). Excellent compliance.',
    doctor: 'Dr. Sarah Jenkins, MD',
    source: 'Mid-Year Comprehensive Panel',
  },
  {
    date: '2026-09-14',
    timestamp: new Date('2026-09-14').getTime(),
    value: 6.3,
    unit: '%',
    note: 'Current Status: Stable at 6.3%. Robust cardiovascular and microvascular risk reduction.',
    doctor: 'Dr. Sarah Jenkins, MD',
    source: 'Latest Annual Health Review',
  },
];

export const DEMO_SYS_BP_DATA: DataPoint[] = [
  {
    date: '2025-11-10',
    timestamp: new Date('2025-11-10').getTime(),
    value: 146,
    unit: 'mmHg',
    note: 'Initial triage: Systolic 146 mmHg (Stage 1 Hypertension). Amlodipine 5mg evaluated.',
    doctor: 'Dr. Rajesh Nair, MD (Cardiology)',
    source: 'Clinical Triage Station',
  },
  {
    date: '2025-12-15',
    timestamp: new Date('2025-12-15').getTime(),
    value: 140,
    unit: 'mmHg',
    note: 'Clinical visit: Amlodipine 5mg OD initiated. Dietary sodium restriction advised.',
    doctor: 'Dr. Rajesh Nair, MD (Cardiology)',
    source: 'Cardiology OPD Vitals',
  },
  {
    date: '2026-01-22',
    timestamp: new Date('2026-01-22').getTime(),
    value: 134,
    unit: 'mmHg',
    note: 'Follow-up: Smooth peripheral vasodilation response. Systolic reduced by 12 mmHg.',
    doctor: 'Dr. Rajesh Nair, MD (Cardiology)',
    source: 'Cardiology OPD Vitals',
  },
  {
    date: '2026-03-05',
    timestamp: new Date('2026-03-05').getTime(),
    value: 128,
    unit: 'mmHg',
    note: 'Quarterly review: Normalizing arterial pressure. No ankle edema reported.',
    doctor: 'Dr. Rajesh Nair, MD (Cardiology)',
    source: 'Clinical Triage Station',
  },
  {
    date: '2026-05-18',
    timestamp: new Date('2026-05-18').getTime(),
    value: 124,
    unit: 'mmHg',
    note: 'Follow-up: Systolic steady in pre-target window (124 mmHg).',
    doctor: 'Dr. Rajesh Nair, MD (Cardiology)',
    source: 'Clinical Triage Station',
  },
  {
    date: '2026-07-28',
    timestamp: new Date('2026-07-28').getTime(),
    value: 120,
    unit: 'mmHg',
    note: 'Routine consultation: Systolic reached guideline target threshold (120 mmHg).',
    doctor: 'Dr. Rajesh Nair, MD (Cardiology)',
    source: 'Outpatient Clinic Panel',
  },
  {
    date: '2026-09-14',
    timestamp: new Date('2026-09-14').getTime(),
    value: 118,
    unit: 'mmHg',
    note: 'Latest reading: 118 mmHg represents optimal resting systolic arterial pressure.',
    doctor: 'Dr. Rajesh Nair, MD (Cardiology)',
    source: 'Latest Comprehensive Checkup',
  },
];

export const DEMO_DIA_BP_DATA: DataPoint[] = [
  {
    date: '2025-11-10',
    timestamp: new Date('2025-11-10').getTime(),
    value: 94,
    unit: 'mmHg',
    note: 'Diastolic 94 mmHg (Stage 1 Hypertension baseline).',
    doctor: 'Dr. Rajesh Nair, MD (Cardiology)',
  },
  {
    date: '2025-12-15',
    timestamp: new Date('2025-12-15').getTime(),
    value: 90,
    unit: 'mmHg',
    note: 'Diastolic 90 mmHg following start of Amlodipine 5mg.',
    doctor: 'Dr. Rajesh Nair, MD (Cardiology)',
  },
  {
    date: '2026-01-22',
    timestamp: new Date('2026-01-22').getTime(),
    value: 86,
    unit: 'mmHg',
    note: 'Diastolic reduced to 86 mmHg.',
    doctor: 'Dr. Rajesh Nair, MD (Cardiology)',
  },
  {
    date: '2026-03-05',
    timestamp: new Date('2026-03-05').getTime(),
    value: 84,
    unit: 'mmHg',
    note: 'Diastolic 84 mmHg; peripheral resistance decreasing.',
    doctor: 'Dr. Rajesh Nair, MD (Cardiology)',
  },
  {
    date: '2026-05-18',
    timestamp: new Date('2026-05-18').getTime(),
    value: 81,
    unit: 'mmHg',
    note: 'Diastolic 81 mmHg, approaching standard resting baseline.',
    doctor: 'Dr. Rajesh Nair, MD (Cardiology)',
  },
  {
    date: '2026-07-28',
    timestamp: new Date('2026-07-28').getTime(),
    value: 79,
    unit: 'mmHg',
    note: 'Diastolic 79 mmHg; healthy target achieved (<80 mmHg).',
    doctor: 'Dr. Rajesh Nair, MD (Cardiology)',
  },
  {
    date: '2026-09-14',
    timestamp: new Date('2026-09-14').getTime(),
    value: 78,
    unit: 'mmHg',
    note: 'Diastolic 78 mmHg; sustained arterial relaxation.',
    doctor: 'Dr. Rajesh Nair, MD (Cardiology)',
  },
];

export const DEMO_CHOLESTEROL_DATA: DataPoint[] = [
  {
    date: '2025-11-10',
    timestamp: new Date('2025-11-10').getTime(),
    value: 256,
    unit: 'mg/dL',
    note: 'Baseline Lipid Profile: Total cholesterol 256 mg/dL (Elevated). Atorvastatin 10mg started.',
    doctor: 'Dr. Sarah Jenkins, MD',
    source: 'Central Laboratory Lipid Panel',
  },
  {
    date: '2025-12-28',
    timestamp: new Date('2025-12-28').getTime(),
    value: 234,
    unit: 'mg/dL',
    note: 'Early response: Total cholesterol down by 22 mg/dL at 6 weeks.',
    doctor: 'Dr. Sarah Jenkins, MD',
    source: 'Lipid Surveillance Check',
  },
  {
    date: '2026-02-15',
    timestamp: new Date('2026-02-15').getTime(),
    value: 216,
    unit: 'mg/dL',
    note: '3-Month check: Significant HMG-CoA reductase inhibition and LDL clearance.',
    doctor: 'Dr. Sarah Jenkins, MD',
    source: 'Follow-up Laboratory Panel',
  },
  {
    date: '2026-04-20',
    timestamp: new Date('2026-04-20').getTime(),
    value: 198,
    unit: 'mg/dL',
    note: 'Milestone: Drops below clinical borderline high threshold (<200 mg/dL).',
    doctor: 'Dr. Sarah Jenkins, MD',
    source: 'Quarterly Diagnostic Panel',
  },
  {
    date: '2026-06-30',
    timestamp: new Date('2026-06-30').getTime(),
    value: 184,
    unit: 'mg/dL',
    note: '6-Month review: Atherosclerotic plaque stabilization trajectory confirmed.',
    doctor: 'Dr. Sarah Jenkins, MD',
    source: 'Metabolic Health Panel',
  },
  {
    date: '2026-09-14',
    timestamp: new Date('2026-09-14').getTime(),
    value: 176,
    unit: 'mg/dL',
    note: 'Latest reading: 176 mg/dL confirms optimal cardiovascular protection and lipid balance.',
    doctor: 'Dr. Sarah Jenkins, MD',
    source: 'Latest Annual Health Review',
  },
];

export const DEMO_TRIGLYCERIDES_DATA: DataPoint[] = [
  {
    date: '2025-11-10',
    timestamp: new Date('2025-11-10').getTime(),
    value: 220,
    unit: 'mg/dL',
    note: 'Baseline Triglycerides: 220 mg/dL (Elevated dietary lipid storage).',
    doctor: 'Dr. Sarah Jenkins, MD',
  },
  {
    date: '2026-02-15',
    timestamp: new Date('2026-02-15').getTime(),
    value: 185,
    unit: 'mg/dL',
    note: 'Reduced by 35 mg/dL following dietary guidance and statin therapy.',
    doctor: 'Dr. Sarah Jenkins, MD',
  },
  {
    date: '2026-04-20',
    timestamp: new Date('2026-04-20').getTime(),
    value: 162,
    unit: 'mg/dL',
    note: 'Steady downward trend with regular walking and low refined carbs.',
    doctor: 'Dr. Sarah Jenkins, MD',
  },
  {
    date: '2026-09-14',
    timestamp: new Date('2026-09-14').getTime(),
    value: 138,
    unit: 'mg/dL',
    note: 'Current reading: 138 mg/dL is within healthy normal reference (<150 mg/dL).',
    doctor: 'Dr. Sarah Jenkins, MD',
  },
];

export const DEMO_CREATININE_DATA: DataPoint[] = [
  {
    date: '2025-11-10',
    timestamp: new Date('2025-11-10').getTime(),
    value: 0.92,
    unit: 'mg/dL',
    note: 'Baseline kidney clearance: Excellent baseline renal filtration.',
    doctor: 'Dr. Sarah Jenkins, MD',
  },
  {
    date: '2026-02-15',
    timestamp: new Date('2026-02-15').getTime(),
    value: 0.90,
    unit: 'mg/dL',
    note: '3-Month check: Stable renal function under Metformin regimen.',
    doctor: 'Dr. Sarah Jenkins, MD',
  },
  {
    date: '2026-05-18',
    timestamp: new Date('2026-05-18').getTime(),
    value: 0.88,
    unit: 'mg/dL',
    note: '6-Month check: Renal clearance completely uncompromised (eGFR > 90).',
    doctor: 'Dr. Sarah Jenkins, MD',
  },
  {
    date: '2026-09-14',
    timestamp: new Date('2026-09-14').getTime(),
    value: 0.89,
    unit: 'mg/dL',
    note: 'Latest reading: 0.89 mg/dL confirms robust renal safety profile.',
    doctor: 'Dr. Sarah Jenkins, MD',
  },
];

// 2. Separate Dedicated Graphs for Each Prescribed Medicine

export const DEMO_MEDICINE_PROFILES: DemoMedicineProfile[] = [
  {
    id: 'demo-med-metformin',
    name: 'Metformin Hydrochloride',
    genericName: 'Metformin HCl',
    dosage: '500 mg BD (Twice daily with meals)',
    frequency: 'Twice daily',
    timing: 'Directly after breakfast and dinner with water',
    condition: 'Type 2 Diabetes Mellitus / Glycemic Regulation',
    startDate: '2025-11-10',
    active: true,
    prescribedBy: 'Dr. Sarah Jenkins, MD',
    doctorSpecialty: 'Internal Medicine / Diabetology',
    hospital: 'MHD Central Multispecialty Hospital',
    clinicalObjective: 'Suppress hepatic glucose overproduction and enhance peripheral insulin sensitivity.',
    history: [
      {
        date: '2025-11-10',
        dosage: '500 mg OD (Once daily)',
        note: 'Initiated at low dose to safeguard gastrointestinal tolerance.',
      },
      {
        date: '2026-03-05',
        dosage: '500 mg BD (Twice daily)',
        note: 'Titrated upwards following good tolerance and measurable HbA1c drop.',
      },
    ],
    milestones: [
      {
        date: '2025-11-10',
        timestamp: new Date('2025-11-10').getTime(),
        medicineName: 'Metformin HCl',
        dosage: '500mg OD',
        type: 'started',
        note: 'Prescription initiated by Dr. Sarah Jenkins',
      },
      {
        date: '2026-03-05',
        timestamp: new Date('2026-03-05').getTime(),
        medicineName: 'Metformin HCl',
        dosage: '500mg BD',
        type: 'dose_change',
        note: 'Titration to twice daily for target glycemic attainment',
      },
    ],
    correlatedBiomarker: {
      title: 'Fasting Blood Glucose Trajectory under Metformin',
      subtitle: 'Correlation of regular dosing with morning plasma glucose concentration.',
      unit: 'mg/dL',
      color: '#2a8eff',
      referenceRange: { min: 70, max: 99, unit: 'mg/dL', label: 'Normal Fasting' },
      data: DEMO_GLUCOSE_DATA,
    },
    secondaryBiomarker: {
      title: 'HbA1c 3-Month Average Progression',
      unit: '%',
      color: '#8b5cf6',
      referenceRange: { min: 4.0, max: 5.6, unit: '%', label: 'Healthy Target' },
      data: DEMO_HBA1C_DATA,
    },
    efficacySummary: {
      baselineValue: '172 mg/dL (Fasting) · 8.6% (HbA1c)',
      latestValue: '104 mg/dL (Fasting) · 6.3% (HbA1c)',
      netChange: '-68 mg/dL fasting glucose reduction',
      percentageImprovement: '-39.5% reduction',
      clinicalStatus: 'Controlled',
      adherenceRate: 98,
      doctorReviewNote: 'Patient exhibits outstanding insulin-sensitizing response. Renal clearance remains pristine. Continue current regimen with regular quarterly review.',
    },
  },
  {
    id: 'demo-med-atorvastatin',
    name: 'Atorvastatin Calcium',
    genericName: 'Atorvastatin',
    dosage: '10 mg OD (Once daily at bedtime)',
    frequency: 'Once daily',
    timing: 'At bedtime with a glass of water',
    condition: 'Hyperlipidemia / Atherosclerotic Plaque Prevention',
    startDate: '2025-11-15',
    active: true,
    prescribedBy: 'Dr. Sarah Jenkins, MD',
    doctorSpecialty: 'Internal Medicine / Cardiology',
    hospital: 'MHD Central Multispecialty Hospital',
    clinicalObjective: 'Competitive inhibition of HMG-CoA reductase to lower circulating atherogenic lipoproteins.',
    history: [
      {
        date: '2025-11-15',
        dosage: '10 mg OD at bedtime',
        note: 'Low-dose guideline-directed statin regimen initiated.',
      },
    ],
    milestones: [
      {
        date: '2025-11-15',
        timestamp: new Date('2025-11-15').getTime(),
        medicineName: 'Atorvastatin',
        dosage: '10mg OD',
        type: 'started',
        note: 'Statin monotherapy initiated for primary cardiovascular protection',
      },
    ],
    correlatedBiomarker: {
      title: 'Total Serum Cholesterol Reduction Trajectory',
      subtitle: 'Tracking circulating total cholesterol following nocturnal HMG-CoA suppression.',
      unit: 'mg/dL',
      color: '#f59e0b',
      referenceRange: { min: 125, max: 200, unit: 'mg/dL', label: 'Desirable' },
      data: DEMO_CHOLESTEROL_DATA,
    },
    secondaryBiomarker: {
      title: 'Serum Triglycerides Response',
      unit: 'mg/dL',
      color: '#f97316',
      referenceRange: { min: 40, max: 150, unit: 'mg/dL', label: 'Normal' },
      data: DEMO_TRIGLYCERIDES_DATA,
    },
    efficacySummary: {
      baselineValue: '256 mg/dL Total Cholesterol',
      latestValue: '176 mg/dL Total Cholesterol',
      netChange: '-80 mg/dL lipid clearance',
      percentageImprovement: '-31.2% reduction',
      clinicalStatus: 'Target Attained',
      adherenceRate: 95,
      doctorReviewNote: 'Target lipid threshold (<200 mg/dL) safely achieved without liver enzyme elevation (AST/ALT normal). Muscle tolerance confirmed at 10mg dose.',
    },
  },
  {
    id: 'demo-med-amlodipine',
    name: 'Amlodipine Besylate',
    genericName: 'Amlodipine',
    dosage: '5 mg OD (Once daily each morning)',
    frequency: 'Once daily',
    timing: 'Morning after breakfast',
    condition: 'Essential Hypertension / Vascular Pressure Regulation',
    startDate: '2025-12-15',
    active: true,
    prescribedBy: 'Dr. Rajesh Nair, MD',
    doctorSpecialty: 'Cardiovascular Medicine',
    hospital: 'MHD Heart & Vascular Institute',
    clinicalObjective: 'Dihydropyridine calcium antagonist promoting peripheral arterial vasodilation and afterload reduction.',
    history: [
      {
        date: '2025-12-15',
        dosage: '5 mg OD in morning',
        note: 'Initiated following confirmed Stage 1 systolic elevation (146/94 mmHg).',
      },
    ],
    milestones: [
      {
        date: '2025-12-15',
        timestamp: new Date('2025-12-15').getTime(),
        medicineName: 'Amlodipine Besylate',
        dosage: '5mg OD',
        type: 'started',
        note: 'Prescribed by Dr. Rajesh Nair for arterial pressure control',
      },
    ],
    correlatedBiomarker: {
      title: 'Systolic Arterial Pressure Trajectory under Amlodipine',
      subtitle: 'Monitoring reduction in vascular resistance and peak systolic pressure.',
      unit: 'mmHg',
      color: '#ef4444',
      referenceRange: { min: 90, max: 120, unit: 'mmHg', label: 'Optimal' },
      data: DEMO_SYS_BP_DATA,
    },
    secondaryBiomarker: {
      title: 'Diastolic Resting Pressure Response',
      unit: 'mmHg',
      color: '#06b6d4',
      referenceRange: { min: 60, max: 80, unit: 'mmHg', label: 'Optimal' },
      data: DEMO_DIA_BP_DATA,
    },
    efficacySummary: {
      baselineValue: '146 / 94 mmHg (Stage 1 Hypertension)',
      latestValue: '118 / 78 mmHg (Optimal Reading)',
      netChange: '-28 mmHg Systolic / -16 mmHg Diastolic',
      percentageImprovement: '-19.2% pressure drop',
      clinicalStatus: 'Target Attained',
      adherenceRate: 97,
      doctorReviewNote: 'Arterial compliance restored. Heart rate steady at 72 bpm. Excellent tolerance with zero peripheral edema. Maintain morning 5mg dosing.',
    },
  },
];

// 3. Realistic Demo Vitals Historical Log

export const DEMO_VITALS_LOG: DemoVitalsEntry[] = [
  {
    id: 'vital-demo-7',
    date: '2026-09-14',
    time: '10:15 AM',
    systolic: 118,
    diastolic: 78,
    heartRate: 72,
    temperature: 98.4,
    respiratoryRate: 16,
    weightKg: 74.2,
    spo2: 99,
    doctorName: 'Dr. Sarah Jenkins, MD',
    clinic: 'Outpatient Triage - Room 104',
    notes: 'Optimal vital parameters. Patient feeling energetic with no shortness of breath.',
  },
  {
    id: 'vital-demo-6',
    date: '2026-07-28',
    time: '02:40 PM',
    systolic: 120,
    diastolic: 79,
    heartRate: 74,
    temperature: 98.6,
    respiratoryRate: 16,
    weightKg: 75.0,
    spo2: 98,
    doctorName: 'Dr. Rajesh Nair, MD',
    clinic: 'Cardiology Station',
    notes: 'Stable resting vitals. BP in guideline optimal range (<120/80 mmHg).',
  },
  {
    id: 'vital-demo-5',
    date: '2026-05-18',
    time: '11:05 AM',
    systolic: 124,
    diastolic: 81,
    heartRate: 75,
    temperature: 98.4,
    respiratoryRate: 15,
    weightKg: 75.8,
    spo2: 99,
    doctorName: 'Dr. Sarah Jenkins, MD',
    clinic: 'Internal Medicine Suite',
    notes: 'Vitals well-tolerated. Patient reports adhering to morning exercise routine.',
  },
  {
    id: 'vital-demo-4',
    date: '2026-03-05',
    time: '09:30 AM',
    systolic: 128,
    diastolic: 84,
    heartRate: 76,
    temperature: 98.7,
    respiratoryRate: 16,
    weightKg: 76.5,
    spo2: 98,
    doctorName: 'Dr. Sarah Jenkins, MD',
    clinic: 'Internal Medicine Suite',
    notes: 'Quarterly review. Titrated Metformin to 500mg BD.',
  },
  {
    id: 'vital-demo-3',
    date: '2026-01-22',
    time: '03:15 PM',
    systolic: 134,
    diastolic: 86,
    heartRate: 78,
    temperature: 98.5,
    respiratoryRate: 17,
    weightKg: 77.2,
    spo2: 98,
    doctorName: 'Dr. Rajesh Nair, MD',
    clinic: 'Cardiology Station',
    notes: 'Systolic down from 140 mmHg. Encouraged continued sodium limitation.',
  },
  {
    id: 'vital-demo-2',
    date: '2025-12-15',
    time: '10:00 AM',
    systolic: 140,
    diastolic: 90,
    heartRate: 80,
    temperature: 98.6,
    respiratoryRate: 18,
    weightKg: 77.9,
    spo2: 98,
    doctorName: 'Dr. Rajesh Nair, MD',
    clinic: 'Cardiology Station',
    notes: 'Prescribed Amlodipine 5mg OD for sustained pressure control.',
  },
  {
    id: 'vital-demo-1',
    date: '2025-11-10',
    time: '09:15 AM',
    systolic: 146,
    diastolic: 94,
    heartRate: 84,
    temperature: 98.8,
    respiratoryRate: 18,
    weightKg: 78.5,
    spo2: 97,
    doctorName: 'Dr. Sarah Jenkins, MD',
    clinic: 'Initial Clinical Triage',
    notes: 'Baseline evaluation. Elevated blood pressure and metabolic markers documented.',
  },
];
