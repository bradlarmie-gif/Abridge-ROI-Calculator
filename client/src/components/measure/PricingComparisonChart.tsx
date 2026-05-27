import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import type { PricingScenario, PricingTimeSeriesPoint, TierCrossingMarker } from '@/lib/forecastPricing';

interface PricingComparisonChartProps {
  points: PricingTimeSeriesPoint[];
  tierCrossings: TierCrossingMarker[];
  scenarios: PricingScenario[];
}

const DOMAIN_COLORS = {
  capacity:  '#3B82F6',
  workforce: '#8B5CF6',
  revenue:   '#10B981',
  quality:   '#F59E0B',
};

const VALUE_BAND_COLOR = 'rgba(139, 92, 246, 0.40)';

const SCENARIO_LINE_COLORS = ['#EA2C00', '#1A1A1A', '#0891B2', '#6B7280'];

function formatCurrencyShort(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

interface CustomXTickProps {
  x?: number;
  y?: number;
  payload?: { value: number };
  points: PricingTimeSeriesPoint[];
}

function CustomXTick({ x = 0, y = 0, payload, points }: CustomXTickProps) {
  const point = points.find(p => p.year === payload?.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill="#555555" fontSize={11}>
        {`Year ${payload?.value ?? ''}`}
      </text>
      {point && (
        <text x={0} y={0} dy={26} textAnchor="middle" fill="#AAAAAA" fontSize={9}>
          {`${point.providers.toLocaleString()} providers`}
        </text>
      )}
    </g>
  );
}

interface CustomTooltipProps extends TooltipProps<ValueType, NameType> {
  points: PricingTimeSeriesPoint[];
  scenarios: PricingScenario[];
}

function CustomTooltip({ active, label, points, scenarios }: CustomTooltipProps) {
  if (!active || label == null) return null;
  const point = points.find(p => p.year === label);
  if (!point) return null;

  const formatC = (n: number) => '$' + Math.round(n).toLocaleString();

  return (
    <div className="bg-white rounded-xl shadow-lg p-3 text-xs border border-[#E5E5E5] min-w-[200px]">
      <p className="font-semibold text-black mb-2">Year {label} · {point.providers.toLocaleString()} providers</p>

      <div className="mb-2">
        <p className="text-[#888888] uppercase tracking-wide text-[10px] mb-1">Value</p>
        <div className="space-y-0.5">
          <div className="flex justify-between gap-4">
            <span style={{ color: DOMAIN_COLORS.capacity }}>Capacity</span>
            <span className="font-medium">{formatC(point.capacityValue)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span style={{ color: DOMAIN_COLORS.workforce }}>Workforce</span>
            <span className="font-medium">{formatC(point.workforceValue)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span style={{ color: DOMAIN_COLORS.revenue }}>Revenue</span>
            <span className="font-medium">{formatC(point.revenueValue)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span style={{ color: DOMAIN_COLORS.quality }}>Quality</span>
            <span className="font-medium">{formatC(point.qualityValue)}</span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t border-[#F0ECE7]">
            <span className="font-semibold text-black">Total</span>
            <span className="font-semibold">{formatC(point.totalValue)}</span>
          </div>
          <div className="flex justify-between gap-4 text-[#AAAAAA]">
            <span>±25% range</span>
            <span>{formatC(point.valueLow)} – {formatC(point.valueHigh)}</span>
          </div>
        </div>
      </div>

      {scenarios.length > 0 && (
        <div>
          <p className="text-[#888888] uppercase tracking-wide text-[10px] mb-1">Investment</p>
          <div className="space-y-0.5">
            {scenarios.map((s, i) => {
              const inv = point.investments[s.id] ?? 0;
              const net = point.totalValue - inv;
              return (
                <div key={s.id} className="flex justify-between gap-4">
                  <span style={{ color: SCENARIO_LINE_COLORS[i % SCENARIO_LINE_COLORS.length] }}>{s.label}</span>
                  <span className="font-medium">
                    {formatC(inv)} <span className="text-[#888888]">net {formatC(net)}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PricingComparisonChart({ points, tierCrossings, scenarios }: PricingComparisonChartProps) {
  if (points.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 32, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE7" vertical={false} />
        <XAxis
          dataKey="year"
          tick={(props: CustomXTickProps) => <CustomXTick {...props} points={points} />}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tickFormatter={formatCurrencyShort}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#AAAAAA' }}
          width={56}
        />
        <Tooltip content={(props) => <CustomTooltip {...props} points={points} scenarios={scenarios} />} />

        {/* Stacked domain value bars */}
        <Bar dataKey="capacityValue"  stackId="value" fill={DOMAIN_COLORS.capacity}  name="Capacity"  barSize={32} />
        <Bar dataKey="workforceValue" stackId="value" fill={DOMAIN_COLORS.workforce} name="Workforce" barSize={32} />
        <Bar dataKey="revenueValue"   stackId="value" fill={DOMAIN_COLORS.revenue}   name="Revenue"   barSize={32} />
        <Bar dataKey="qualityValue"   stackId="value" fill={DOMAIN_COLORS.quality}   name="Quality"   barSize={32} />

        {/* Sensitivity envelope */}
        <Line dataKey="valueHigh" stroke={VALUE_BAND_COLOR} strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Value +25%" legendType="none" />
        <Line dataKey="valueLow"  stroke={VALUE_BAND_COLOR} strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Value −25%" legendType="none" />

        {/* Cost line per scenario */}
        {scenarios.map((s, i) => (
          <Line
            key={s.id}
            dataKey={(d: PricingTimeSeriesPoint) => d.investments[s.id] ?? 0}
            name={s.label}
            stroke={SCENARIO_LINE_COLORS[i % SCENARIO_LINE_COLORS.length]}
            strokeWidth={2}
            strokeDasharray="7 4"
            dot={false}
          />
        ))}

        {/* Tier crossing dots */}
        {tierCrossings.map((tc, i) => {
          const scenarioIdx = scenarios.findIndex(s => s.id === tc.scenarioId);
          return (
            <ReferenceDot
              key={i}
              x={tc.year}
              y={tc.investment}
              r={5}
              fill={SCENARIO_LINE_COLORS[scenarioIdx % SCENARIO_LINE_COLORS.length]}
              stroke="white"
              strokeWidth={2}
            />
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
