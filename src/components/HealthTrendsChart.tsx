import { useState, useMemo } from 'react';
import {
  Calendar,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Pill,
  ShieldAlert
} from 'lucide-react';
import { fmtD } from '../lib/format';

export interface DataPoint {
  date: string; // 'YYYY-MM-DD'
  timestamp: number;
  value: number;
  unit: string;
  note?: string;
  source?: string;
  doctor?: string;
  medicationContext?: string;
}

export interface ReferenceRange {
  min: number;
  max: number;
  unit: string;
  label?: string;
}

export interface MedicineMilestone {
  date: string;
  timestamp: number;
  medicineName: string;
  dosage: string;
  type: 'started' | 'dose_change' | 'stopped';
  note?: string;
}

interface HealthTrendsChartProps {
  title: string;
  subtitle?: string;
  data: DataPoint[];
  referenceRange?: ReferenceRange;
  color?: string; // Hex color e.g. '#2a8eff'
  unit: string;
  milestones?: MedicineMilestone[];
  isDemoData?: boolean;
  primaryLabel?: string;
  secondaryData?: DataPoint[];
  secondaryColor?: string;
  secondaryLabel?: string;
  secondaryUnit?: string;
  secondaryReferenceRange?: ReferenceRange;
  medicineTimeline?: {
    name: string;
    dosage: string;
    startDate: string;
    endDate?: string;
    active: boolean;
    history?: { date: string; dosage: string; note?: string }[];
  };
}

type DateFilter = 'all' | '1m' | '3m' | '6m' | '1y';

export default function HealthTrendsChart({
  title,
  subtitle,
  data,
  referenceRange,
  color = '#2a8eff',
  unit,
  milestones = [],
  isDemoData = false,
  primaryLabel,
  secondaryData = [],
  secondaryColor = '#06b6d4',
  secondaryLabel,
  secondaryUnit,
  secondaryReferenceRange,
  medicineTimeline,
}: HealthTrendsChartProps) {
  const [filter, setFilter] = useState<DateFilter>('all');
  const [hoveredPoint, setHoveredPoint] = useState<(DataPoint & { seriesLabel?: string }) | null>(null);

  // Filter data points by selected date window
  const filterList = (list: DataPoint[]) => {
    if (!list.length) return [];
    const sorted = [...list].sort((a, b) => a.timestamp - b.timestamp);
    if (filter === 'all') return sorted;

    const latestTime = sorted[sorted.length - 1].timestamp;
    const dayMs = 86400000;
    const cutoffMap: Record<DateFilter, number> = {
      all: 0,
      '1m': latestTime - 30 * dayMs,
      '3m': latestTime - 90 * dayMs,
      '6m': latestTime - 180 * dayMs,
      '1y': latestTime - 365 * dayMs,
    };

    const cutoff = cutoffMap[filter];
    return sorted.filter((d) => d.timestamp >= cutoff);
  };

  const filteredData = useMemo(() => filterList(data), [data, filter]);
  const filteredSecondaryData = useMemo(() => filterList(secondaryData), [secondaryData, filter]);

  // Metric stats
  const stats = useMemo(() => {
    if (!filteredData.length) return null;
    const values = filteredData.map((d) => d.value);
    const latest = filteredData[filteredData.length - 1].value;
    const earliest = filteredData[0].value;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const diff = latest - earliest;

    let inRangePct = 100;
    if (referenceRange) {
      const inRangeCount = values.filter(
        (v) => v >= referenceRange.min && v <= referenceRange.max
      ).length;
      inRangePct = Math.round((inRangeCount / values.length) * 100);
    }

    return {
      latest,
      earliest,
      min,
      max,
      diff,
      inRangePct,
    };
  }, [filteredData, referenceRange]);

  // SVG Dimension & Coordinate Math
  const chartHeight = 240;
  const chartWidth = 700;
  const padding = { top: 30, right: 30, bottom: 45, left: 50 };

  const usableWidth = chartWidth - padding.left - padding.right;
  const usableHeight = chartHeight - padding.top - padding.bottom;

  const { minVal, maxVal, minTime, maxTime } = useMemo(() => {
    const combinedData = [...filteredData, ...filteredSecondaryData];
    if (!combinedData.length) {
      return { minVal: 0, maxVal: 100, minTime: 0, maxTime: 1 };
    }
    const vals = combinedData.map((d) => d.value);
    if (referenceRange) {
      vals.push(referenceRange.min, referenceRange.max);
    }
    if (secondaryReferenceRange) {
      vals.push(secondaryReferenceRange.min, secondaryReferenceRange.max);
    }
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);
    const buffer = (rawMax - rawMin) * 0.15 || 5;

    const times = combinedData.map((d) => d.timestamp);
    const tMin = Math.min(...times);
    const tMax = Math.max(...times);

    return {
      minVal: Math.max(0, rawMin - buffer),
      maxVal: rawMax + buffer,
      minTime: tMin,
      maxTime: tMax === tMin ? tMin + 86400000 : tMax,
    };
  }, [filteredData, filteredSecondaryData, referenceRange, secondaryReferenceRange]);

  const getX = (timestamp: number) => {
    if (maxTime === minTime) return padding.left + usableWidth / 2;
    return padding.left + ((timestamp - minTime) / (maxTime - minTime)) * usableWidth;
  };

  const getY = (val: number) => {
    if (maxVal === minVal) return padding.top + usableHeight / 2;
    return padding.top + usableHeight - ((val - minVal) / (maxVal - minVal)) * usableHeight;
  };

  const makeCurvePath = (list: DataPoint[]) => {
    if (!list.length) return '';
    if (list.length === 1) {
      const x = getX(list[0].timestamp);
      const y = getY(list[0].value);
      return `M ${x - 5} ${y} L ${x + 5} ${y}`;
    }

    const points = list.map((d) => [getX(d.timestamp), getY(d.value)]);
    let path = `M ${points[0][0]} ${points[0][1]}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
    }
    return path;
  };

  // Generate smooth SVG curve path for primary series
  const linePath = useMemo(() => makeCurvePath(filteredData), [filteredData, minVal, maxVal, minTime, maxTime]);

  // Generate smooth SVG curve path for secondary series
  const secondaryLinePath = useMemo(() => makeCurvePath(filteredSecondaryData), [filteredSecondaryData, minVal, maxVal, minTime, maxTime]);

  const areaPath = useMemo(() => {
    if (!filteredData.length || filteredData.length === 1) return '';
    const bottomY = padding.top + usableHeight;
    const firstX = getX(filteredData[0].timestamp);
    const lastX = getX(filteredData[filteredData.length - 1].timestamp);
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [linePath, filteredData]);

  // Check if a point is within healthy reference boundaries
  const isHealthy = (val: number, ref?: ReferenceRange) => {
    const r = ref || referenceRange;
    if (!r) return true;
    return val >= r.min && val <= r.max;
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-bold text-[#1e3a8a]">{title}</h3>
            {isDemoData && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300 font-mono shadow-2xs">
                DEMO DATA
              </span>
            )}
            {referenceRange && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Target: {referenceRange.min} – {referenceRange.max} {referenceRange.unit}
              </span>
            )}
            {secondaryReferenceRange && secondaryLabel && (
              <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                {secondaryLabel} Target: {secondaryReferenceRange.min} – {secondaryReferenceRange.max} {secondaryReferenceRange.unit}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        {/* Date Filter Controls & Legend */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {filteredSecondaryData.length > 0 && (
            <div className="hidden sm:flex items-center gap-3 text-xs font-semibold px-2 py-1 bg-slate-50 rounded-lg border border-slate-200/70">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-slate-700">{primaryLabel || 'Systolic'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: secondaryColor }} />
                <span className="text-slate-700">{secondaryLabel || 'Diastolic'}</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {(
            [
              ['all', 'All Time'],
              ['1y', '1 Year'],
              ['6m', '6 Months'],
              ['3m', '3 Months'],
              ['1m', '1 Month'],
            ] as [DateFilter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === key
                  ? 'bg-white text-[#2a8eff] shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Latest Reading
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg sm:text-xl font-bold text-slate-900">{stats.latest}</span>
              <span className="text-xs text-slate-500">{unit}</span>
            </div>
            {referenceRange && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold mt-1 px-1.5 py-0.5 rounded-md ${
                  isHealthy(stats.latest)
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isHealthy(stats.latest) ? 'In Range' : 'Out of Target'}
              </span>
            )}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Overall Change (Δ)
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              {stats.diff < 0 ? (
                <TrendingDown className="w-4 h-4 text-emerald-600" />
              ) : stats.diff > 0 ? (
                <TrendingUp className="w-4 h-4 text-amber-600" />
              ) : (
                <Minus className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-lg sm:text-xl font-bold text-slate-900">
                {stats.diff > 0 ? `+${stats.diff.toFixed(1)}` : stats.diff.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500">{unit}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Baseline: {stats.earliest} {unit}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Range Spread
            </p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-sm font-semibold text-slate-700">{stats.min}</span>
              <span className="text-xs text-slate-400">–</span>
              <span className="text-sm font-semibold text-slate-700">{stats.max}</span>
              <span className="text-xs text-slate-500 ml-1">{unit}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">{filteredData.length} total measurements</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Target Adherence
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg sm:text-xl font-bold text-[#1e3a8a]">{stats.inRangePct}%</span>
              <span className="text-xs text-slate-500">in target</span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${stats.inRangePct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Interactive Medicine Timeline Bar (if medication-wise graph) */}
      {medicineTimeline && (
        <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-[#2a8eff]" />
              <span className="text-xs font-bold text-[#1e3a8a]">
                Treatment Timeline: {medicineTimeline.name} ({medicineTimeline.dosage})
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                medicineTimeline.active
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {medicineTimeline.active ? 'Active Prescription' : 'Completed / Changed'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span>Started: {fmtD(medicineTimeline.startDate)}</span>
            {medicineTimeline.endDate && <span>Ended: {fmtD(medicineTimeline.endDate)}</span>}
            {medicineTimeline.history && medicineTimeline.history.length > 0 && (
              <span className="text-[#2a8eff] font-medium">
                {medicineTimeline.history.length} Dose Adjustment(s)
              </span>
            )}
          </div>
        </div>
      )}

      {/* SVG Canvas Area */}
      {filteredData.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          No records found for the selected time window.
        </div>
      ) : (
        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-[220px] sm:h-[260px] select-none"
          >
            <defs>
              <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                <stop offset="100%" stopColor={color} stopOpacity="0.01" />
              </linearGradient>

              {/* Shaded Reference Band Pattern */}
              <linearGradient id="refBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.04" />
              </linearGradient>
            </defs>

            {/* Reference Range Shaded Band */}
            {referenceRange && (
              <>
                <rect
                  x={padding.left}
                  y={getY(referenceRange.max)}
                  width={usableWidth}
                  height={Math.max(2, getY(referenceRange.min) - getY(referenceRange.max))}
                  fill="url(#refBand)"
                  stroke="#10b981"
                  strokeWidth="0.8"
                  strokeDasharray="4 4"
                  strokeOpacity="0.5"
                />
                <text
                  x={padding.left + 8}
                  y={getY(referenceRange.max) - 5}
                  fontSize="9"
                  fill="#059669"
                  fontWeight="bold"
                >
                  Standard Target: {referenceRange.min} – {referenceRange.max} {referenceRange.unit}
                </text>
              </>
            )}

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const val = minVal + pct * (maxVal - minVal);
              const y = getY(val);
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="0.8"
                    strokeDasharray={i === 0 || i === 4 ? '' : '3 3'}
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9"
                    fill="#94a3b8"
                    fontWeight="500"
                  >
                    {Math.round(val)}
                  </text>
                </g>
              );
            })}

            {/* Medication Milestone Markers (Dose changes / Starts) */}
            {milestones.map((m, idx) => {
              const x = getX(m.timestamp);
              if (x < padding.left || x > chartWidth - padding.right) return null;
              return (
                <g key={`milestone-${idx}`}>
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + usableHeight}
                    stroke="#3b82f6"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                    strokeOpacity="0.7"
                  />
                  <circle cx={x} cy={padding.top} r="4" fill="#3b82f6" />
                  <text
                    x={x}
                    y={padding.top - 6}
                    textAnchor="middle"
                    fontSize="8.5"
                    fontWeight="bold"
                    fill="#1d4ed8"
                  >
                    {m.medicineName} ({m.dosage})
                  </text>
                </g>
              );
            })}

            {/* Area Fill */}
            {areaPath && <path d={areaPath} fill={`url(#gradient-${title})`} />}

            {/* Main Trend Line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Secondary Trend Line (e.g. Diastolic BP) */}
            {secondaryLinePath && (
              <path
                d={secondaryLinePath}
                fill="none"
                stroke={secondaryColor}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Primary Series Data Points */}
            {filteredData.map((d, i) => {
              const cx = getX(d.timestamp);
              const cy = getY(d.value);
              const healthy = isHealthy(d.value, referenceRange);
              const isHovered = hoveredPoint?.timestamp === d.timestamp && (!hoveredPoint?.seriesLabel || hoveredPoint?.seriesLabel === (primaryLabel || title));

              return (
                <g
                  key={`primary-${i}`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint({ ...d, seriesLabel: primaryLabel || title })}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 7 : 4}
                    fill={healthy ? '#10b981' : '#f59e0b'}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 2.5 : 1.8}
                    className="transition-all duration-150"
                  />
                  {/* Invisible hit target for smooth mobile touch & mouse interaction */}
                  <circle cx={cx} cy={cy} r="16" fill="transparent" />
                </g>
              );
            })}

            {/* Secondary Series Data Points (e.g. Diastolic BP) */}
            {filteredSecondaryData.map((d, i) => {
              const cx = getX(d.timestamp);
              const cy = getY(d.value);
              const healthy = isHealthy(d.value, secondaryReferenceRange);
              const isHovered = hoveredPoint?.timestamp === d.timestamp && hoveredPoint?.seriesLabel === (secondaryLabel || 'Secondary');

              return (
                <g
                  key={`secondary-${i}`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint({ ...d, seriesLabel: secondaryLabel || 'Secondary' })}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 7 : 4}
                    fill={secondaryColor}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 2.5 : 1.8}
                    className="transition-all duration-150"
                  />
                  {/* Invisible hit target for smooth mobile touch & mouse interaction */}
                  <circle cx={cx} cy={cy} r="16" fill="transparent" />
                </g>
              );
            })}

            {/* X-Axis Date Labels */}
            {filteredData.length > 0 &&
              filteredData.map((d, i) => {
                // Show dates selectively to prevent overcrowding
                const showEvery = Math.ceil(filteredData.length / 6);
                if (i % showEvery !== 0 && i !== filteredData.length - 1) return null;
                const x = getX(d.timestamp);
                return (
                  <text
                    key={`label-${i}`}
                    x={x}
                    y={chartHeight - 12}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#64748b"
                    fontWeight="500"
                  >
                    {fmtD(d.date)}
                  </text>
                );
              })}
          </svg>

          {/* Interactive Floating Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute pointer-events-none z-20 bg-slate-900/95 text-white p-2.5 rounded-xl shadow-xl text-xs space-y-1 transition-all -translate-x-1/2 -translate-y-full border border-slate-700/60"
              style={{
                left: `${Math.min(92, Math.max(8, (getX(hoveredPoint.timestamp) / chartWidth) * 100))}%`,
                top: `${Math.max(10, (getY(hoveredPoint.value) / chartHeight) * 100 - 8)}%`,
              }}
            >
              <div className="flex items-center justify-between gap-3 text-[11px] text-slate-300">
                <span className="font-semibold">{fmtD(hoveredPoint.date)}</span>
                <div className="flex items-center gap-1.5">
                  {isDemoData && (
                    <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[9px] bg-amber-400/20 text-amber-300 border border-amber-500/40">
                      DEMO
                    </span>
                  )}
                  <span
                    className={`px-1.5 py-0.2 rounded-md font-bold text-[9.5px] ${
                      isHealthy(hoveredPoint.value, hoveredPoint.seriesLabel === secondaryLabel ? secondaryReferenceRange : referenceRange)
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {isHealthy(hoveredPoint.value, hoveredPoint.seriesLabel === secondaryLabel ? secondaryReferenceRange : referenceRange) ? 'In Target' : 'Out of Target'}
                  </span>
                </div>
              </div>

              {hoveredPoint.seriesLabel && (
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {hoveredPoint.seriesLabel}
                </p>
              )}

              <p className="text-sm font-bold text-white">
                {hoveredPoint.value} {hoveredPoint.seriesLabel === secondaryLabel && secondaryUnit ? secondaryUnit : unit}
              </p>

              {referenceRange && (
                <p className="text-[10px] text-slate-400">
                  Target: {hoveredPoint.seriesLabel === secondaryLabel && secondaryReferenceRange
                    ? `${secondaryReferenceRange.min} – ${secondaryReferenceRange.max} ${secondaryReferenceRange.unit}`
                    : `${referenceRange.min} – ${referenceRange.max} ${referenceRange.unit}`}
                </p>
              )}

              {hoveredPoint.note && (
                <p className="text-[10.5px] text-slate-300 border-t border-slate-700/80 pt-1 mt-1 max-w-[220px] leading-snug">
                  {hoveredPoint.note}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Causation Warning Note / Demo Data Notice */}
      {isDemoData ? (
        <div className="flex items-start gap-2.5 p-3 bg-amber-50/80 rounded-xl text-[11px] text-amber-900 border border-amber-200/90 shadow-2xs">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-amber-950 font-bold">DEMO DATA NOTICE:</strong> This chart displays a realistic, simulated clinical trajectory for patient portal demonstration only.
            Real patient records are untouched. No writes or modifications were made to Firebase, MongoDB, or real user records.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-500 border border-slate-200/60">
          <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Clinical Caution:</strong> Laboratory measurements vary naturally with diet, activity,
            hydration, and lifestyle. A medication cannot be confirmed as the sole cause of a trend without
            clinical review by your physician.
          </p>
        </div>
      )}
    </div>
  );
}
