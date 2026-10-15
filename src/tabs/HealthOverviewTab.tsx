import HealthTrendsTab from './HealthTrendsTab';
import type { MhdUser } from '../lib/types';

export default function HealthOverviewTab({ patientData }: { patientData: MhdUser }) {
  return <HealthTrendsTab patientData={patientData} />;
}
