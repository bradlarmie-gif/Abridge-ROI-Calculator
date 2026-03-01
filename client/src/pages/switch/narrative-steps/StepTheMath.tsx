import { useState, useMemo, useCallback } from "react";
import { ChevronDown, DollarSign } from "lucide-react";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import type { SwitchInputs, SwitchCalculations } from "@/lib/switchGapCalculator";
import { formatCurrency } from "@/lib/switchGapCalculator";
import { useAssessment } from "@/lib/assessment";
import { computePillars } from "@/lib/pillars/computePillars";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface StepTheMathProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  calculations: SwitchCalculations;
  onNext: () => void;
  onBack: () => void;
}

// S-curve adoption multipliers at key milestones
const S_CURVE = [
  { month: 0, rate: 0 },
  { month: 3, rate: 0.25 },
  { month: 6, rate: 0.55 },
  { month: 12, rate: 0.85 },
  { month: 24, rate: 1.00 },
  { month: 36, rate: 1.08 },
];

function interpolateRate(month: number): number {
  if (month <= 0) return 0;
  if (month >= 36) return S_CURVE[S_CURVE.length - 1].rate;
  for (let i = 1; i < S_CURVE.length; i++) {
    if (month <= S_CURVE[i].month) {
      const prev = S_CURVE[i - 1];
      const curr = S_CURVE[i];
      const t = (month - prev.month) / (curr.month - prev.month);
      return prev.rate + t * (curr.rate - prev.rate);
    }
  }
  return S_CURVE[S_CURVE.length - 1].rate;
}

function computeCumulative(A: number, months: number): number {
  let total = 0;
  for (let m = 1; m <= months; m++) {
    total += (A / 12) * interpolateRate(m);
  }
  return Math.round(total);
}

function CustomLabel({
  viewBox,
  value,
  color,
  anchor,
}: {
  viewBox?: { x?: number; y?: number };
  value: string;
  color: string;
  anchor: "start" | "end";
}) {
  if (!viewBox?.x || !viewBox?.y) return null;
  const xOffset = anchor === "end" ? -8 : 8;
  return (
    <text
      x={viewBox.x + xOffset}
      y={viewBox.y - 10}
      fill={color}
      fontSize={12}
      fontWeight={600}
      textAnchor={anchor}
    >
      {value}
    </text>
  );
}

function computeProjection(A: number) {
  const year1 = computeCumulative(A, 12);
  const year2 = computeCumulative(A, 24) - computeCumulative(A, 12);
  const year3 = computeCumulative(A, 36) - computeCumulative(A, 24);
  const cumulative = computeCumulative(A, 36);
  return { year1, year2, year3, cumulative };
}

function computeShiftedCumulative(A: number, months: number, delayMonths: number): number {
  let total = 0;
  for (let m = 1; m <= months; m++) {
    const adoptionMonth = m - delayMonths;
    if (adoptionMonth > 0) {
      total += (A / 12) * interpolateRate(adoptionMonth);
    }
  }
  return Math.round(total);
}

function computeDelayProjection(A: number, delayMonths: number) {
  const adjustedYear1 = computeShiftedCumulative(A, 12, delayMonths);
  const year2 = computeShiftedCumulative(A, 24, delayMonths) - computeShiftedCumulative(A, 12, delayMonths);
  const year3 = computeShiftedCumulative(A, 36, delayMonths) - computeShiftedCumulative(A, 24, delayMonths);
  const cumulative = computeShiftedCumulative(A, 36, delayMonths);
  return { adjustedYear1, year2, year3, cumulative };
}

export default function StepTheMath({
  onNext,
  onBack,
}: StepTheMathProps) {
  const [showMethodology, setShowMethodology] = useState(false);
  const [currentSolutionCost, setCurrentSolutionCost] = useState<number>(0);
  const { state } = useAssessment();
  const pillarResult = useMemo(() => computePillars(state), [state]);
  const A = pillarResult.totalAnnual;

  const handleCostChange = useCallback((val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ""), 10) || 0;
    setCurrentSolutionCost(num);
  }, []);

  const netOpportunityCost = useMemo(() => {
    return Math.max(0, A - currentSolutionCost);
  }, [A, currentSolutionCost]);

  const projection = useMemo(() => computeProjection(A), [A]);
  const delay6 = useMemo(() => computeDelayProjection(A, 6), [A]);
  const delay12 = useMemo(() => computeDelayProjection(A, 12), [A]);

  const loss6 = projection.cumulative - delay6.cumulative;
  const loss12 = projection.cumulative - delay12.cumulative;

  const chartData = useMemo(() => {
    const points = [];
    for (let m = 0; m <= 36; m += 3) {
      const potential = computeCumulative(A, m);
      points.push({ month: m, current: 0, potential });
    }
    return points;
  }, [A]);

  return (
    <div className={`space-y-8 ${STEP_FOOTER_SPACER_CLASS}`}>
      <div className="text-left">
        <p className="text-xs text-[#999999] uppercase tracking-widest mb-2">
          3-Year Enterprise Projection
        </p>
        <h1
          className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-2 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          The Cost of Inaction
        </h1>
        <p className="text-sm text-[#888888]">
          Every quarter without action compounds the gap between what you earn and what you capture.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-[#E5E7EB] p-5 md:p-6" data-testid="section-current-cost">
        <p className="text-[12px] text-[#999999] uppercase tracking-widest mb-3 font-medium">
          What are you paying today?
        </p>
        <p className="text-sm text-[#666] mb-4">
          Enter the annual cost of your current ambient AI or documentation solution.
        </p>
        <div className="flex items-center gap-3 max-w-sm">
          <div className="relative flex-1">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
            <input
              type="text"
              value={currentSolutionCost > 0 ? currentSolutionCost.toLocaleString() : ""}
              onChange={(e) => handleCostChange(e.target.value)}
              placeholder="0"
              className="w-full pl-8 pr-4 py-2.5 text-sm bg-[#F9F7F4] border border-[#E8E0D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00] tabular-nums"
              data-testid="input-current-cost"
            />
          </div>
          <span className="text-xs text-[#999]">per year</span>
        </div>
        {currentSolutionCost > 0 && (
          <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
            <p className="text-sm text-[#666]">
              Your current solution costs{" "}
              <span className="font-semibold text-[#1A1A1A] tabular-nums">{formatCurrency(currentSolutionCost)}</span> annually
              while leaving{" "}
              <span className="font-semibold text-[#EA2C00] tabular-nums">{formatCurrency(netOpportunityCost)}</span> in enterprise value uncaptured.
            </p>
          </div>
        )}
      </section>

      <section className="bg-[#F5F0EB] rounded-xl border border-[#E8E0D8] p-4 md:p-6">
        <div className="h-80 md:h-96" data-testid="chart-projection">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 30, right: 24, left: 10, bottom: 20 }}
            >
              <defs>
                <linearGradient id="actionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EA2C00" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#EA2C00" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#999999" }}
                tickFormatter={(v) => `Year ${v / 12}`}
                ticks={[0, 12, 24, 36]}
                axisLine={{ stroke: "#E8E0D8" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#999999" }}
                tickFormatter={(v) =>
                  v >= 1_000_000
                    ? `$${(v / 1_000_000).toFixed(1)}M`
                    : `$${Math.round(v / 1_000)}K`
                }
                axisLine={false}
                tickLine={false}
                width={58}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value as number),
                  name === "potential" ? "Cumulative Value" : "Current Trajectory",
                ]}
                labelFormatter={(l) => `Year ${(l as number) / 12}`}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #E8E0D8",
                  fontSize: 13,
                }}
              />
              <Area
                type="monotone"
                dataKey="potential"
                stroke="#EA2C00"
                strokeWidth={3}
                fill="url(#actionGradient)"
                name="potential"
                dot={false}
                activeDot={{ r: 5, fill: "#EA2C00", stroke: "#fff", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="current"
                stroke="#BBBBBB"
                strokeWidth={2}
                fill="none"
                name="current"
                strokeDasharray="6 4"
                dot={false}
              />
              <ReferenceLine
                x={36}
                stroke="transparent"
                label={
                  <CustomLabel
                    value="With Action"
                    color="#EA2C00"
                    anchor="end"
                  />
                }
              />
              <ReferenceLine
                x={36}
                y={0}
                stroke="transparent"
                label={
                  <CustomLabel
                    value="Current Trajectory"
                    color="#999999"
                    anchor="end"
                  />
                }
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#E8E0D8]">
          <div className="text-center">
            <p className="text-[12px] text-[#999999] uppercase tracking-wider mb-1">Year 1</p>
            <p className="text-lg font-bold text-[#1A1A1A] tabular-nums" data-testid="value-y1">
              {formatCurrency(projection.year1)}
            </p>
            <p className="text-[12px] text-[#999999]">Adoption ramp 25-85%</p>
          </div>
          <div className="text-center">
            <p className="text-[12px] text-[#999999] uppercase tracking-wider mb-1">Year 2</p>
            <p className="text-lg font-bold text-[#1A1A1A] tabular-nums" data-testid="value-y2">
              {formatCurrency(projection.year2)}
            </p>
            <p className="text-[12px] text-[#999999]">Full run-rate</p>
          </div>
          <div className="text-center">
            <p className="text-[12px] text-[#999999] uppercase tracking-wider mb-1">Year 3</p>
            <p className="text-lg font-bold text-[#EA2C00] tabular-nums" data-testid="value-y3">
              {formatCurrency(projection.year3)}
            </p>
            <p className="text-[12px] text-[#999999]">108% maturity uplift</p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[#E8E0D8] text-center">
          <p className="text-[12px] text-[#999999] uppercase tracking-wider mb-1">3-Year Cumulative</p>
          <p className="text-2xl font-bold text-[#1A1A1A] tabular-nums" data-testid="value-cumulative">
            {formatCurrency(projection.cumulative)}
          </p>
        </div>
      </section>

      <div className="text-center py-2" data-testid="impact-statement">
        <p className="text-xl md:text-2xl font-bold text-[#1A1A1A] leading-snug">
          Every year you wait leaves{" "}
          <span className="text-[#EA2C00]">{formatCurrency(A)}</span>{" "}
          in unrealized enterprise value.
        </p>
      </div>

      <section data-testid="cost-of-waiting-section">
        <p className="text-[12px] text-[#999999] uppercase tracking-widest mb-3 font-medium">
          The Cost of Waiting
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            className="bg-[#F5F0EB] rounded-xl border border-[#E8E0D8] p-5 text-center"
            data-testid="card-act-now"
          >
            <p className="text-[12px] text-[#EA2C00] uppercase tracking-widest font-bold mb-3">
              Act Now
            </p>
            <p className="text-3xl font-bold text-[#1A1A1A] tabular-nums" data-testid="value-act-now">
              {formatCurrency(projection.cumulative)}
            </p>
            <p className="text-xs text-[#888888] mt-2">3-year cumulative</p>
          </div>

          <div
            className="bg-white rounded-xl border border-[#E5E7EB] p-5 text-center"
            data-testid="card-wait-6"
          >
            <p className="text-[12px] text-[#999999] uppercase tracking-widest font-medium mb-3">
              Wait 6 Months
            </p>
            <p className="text-3xl font-bold text-[#1A1A1A] tabular-nums" data-testid="value-wait-6">
              {formatCurrency(delay6.cumulative)}
            </p>
            <p className="text-xs text-[#EA2C00] font-semibold mt-2" data-testid="loss-wait-6">
              -{formatCurrency(loss6)} opportunity cost
            </p>
          </div>

          <div
            className="bg-white rounded-xl border border-[#E5E7EB] p-5 text-center"
            data-testid="card-wait-12"
          >
            <p className="text-[12px] text-[#999999] uppercase tracking-widest font-medium mb-3">
              Wait 12 Months
            </p>
            <p className="text-3xl font-bold text-[#1A1A1A] tabular-nums" data-testid="value-wait-12">
              {formatCurrency(delay12.cumulative)}
            </p>
            <p className="text-xs text-[#EA2C00] font-semibold mt-2" data-testid="loss-wait-12">
              -{formatCurrency(loss12)} opportunity cost
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-[#E5E7EB]" data-testid="section-methodology">
        <button
          onClick={() => setShowMethodology(!showMethodology)}
          className="w-full flex items-center justify-between p-4 md:p-5 text-left"
          data-testid="button-toggle-methodology"
        >
          <span className="text-sm font-medium text-[#666666]">
            How this projection is calculated
          </span>
          <ChevronDown
            className={`w-4 h-4 text-[#999999] transition-transform duration-200 ${showMethodology ? "rotate-180" : ""}`}
          />
        </button>

        {showMethodology && (
          <div className="px-4 md:px-5 pb-4 md:pb-5 pt-0 space-y-5 border-t border-[#E5E7EB]" data-testid="methodology-content">
            <div className="pt-4 space-y-4">
              <div>
                <p className="text-[12px] text-[#999999] uppercase tracking-wider font-medium mb-2">
                  S-Curve Adoption Model
                </p>
                <div className="bg-[#F5F0EB] rounded-lg border border-[#E8E0D8] p-4 space-y-2 text-sm font-mono">
                  <p className="text-[#333333]">
                    <span className="text-[#EA2C00] font-semibold">A</span> = {formatCurrency(A)}
                    <span className="text-[#999999] font-sans text-xs ml-2">(Annual Enterprise Opportunity at full adoption)</span>
                  </p>
                  <div className="border-t border-[#E8E0D8] pt-2 mt-2 space-y-1">
                    <p className="text-[#999999] font-sans text-xs font-medium uppercase tracking-wider mb-1">Adoption Milestones</p>
                    {S_CURVE.slice(1).map((pt) => (
                      <p key={pt.month} className="text-[#333333]">
                        Month {pt.month}: <span className="font-semibold">{(pt.rate * 100).toFixed(0)}%</span> capture rate
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[12px] text-[#999999] uppercase tracking-wider font-medium mb-2">
                  Projection with Immediate Action
                </p>
                <div className="bg-[#F5F0EB] rounded-lg border border-[#E8E0D8] p-4 space-y-2 text-sm font-mono">
                  <p className="text-[#333333]">
                    Year 1 = S-curve integral (months 1-12) = <span className="font-semibold">{formatCurrency(projection.year1)}</span>
                  </p>
                  <p className="text-[#333333]">
                    Year 2 = S-curve integral (months 13-24) = <span className="font-semibold">{formatCurrency(projection.year2)}</span>
                  </p>
                  <p className="text-[#333333]">
                    Year 3 = S-curve integral (months 25-36) = <span className="font-semibold">{formatCurrency(projection.year3)}</span>
                  </p>
                  <div className="border-t border-[#E8E0D8] pt-2 mt-2">
                    <p className="text-[#1A1A1A] font-semibold">
                      Cumulative = {formatCurrency(projection.year1)} + {formatCurrency(projection.year2)} + {formatCurrency(projection.year3)} = {formatCurrency(projection.cumulative)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[12px] text-[#999999] uppercase tracking-wider font-medium mb-2">
                  Delay Shifts the Adoption Curve Forward
                </p>
                <div className="bg-[#F5F0EB] rounded-lg border border-[#E8E0D8] p-4 space-y-3 text-sm font-mono">
                  <div className="space-y-1.5">
                    <p className="text-[#999999] font-sans text-xs font-medium uppercase tracking-wider">6-Month Delay</p>
                    <p className="text-[#333333]">
                      3-Year Cumulative = <span className="font-semibold">{formatCurrency(delay6.cumulative)}</span>
                    </p>
                    <p className="text-[#EA2C00]">
                      Opportunity Cost = {formatCurrency(projection.cumulative)} - {formatCurrency(delay6.cumulative)} = <span className="font-semibold">-{formatCurrency(loss6)}</span>
                    </p>
                  </div>
                  <div className="border-t border-[#E8E0D8] pt-3 space-y-1.5">
                    <p className="text-[#999999] font-sans text-xs font-medium uppercase tracking-wider">12-Month Delay</p>
                    <p className="text-[#333333]">
                      3-Year Cumulative = <span className="font-semibold">{formatCurrency(delay12.cumulative)}</span>
                    </p>
                    <p className="text-[#EA2C00]">
                      Opportunity Cost = {formatCurrency(projection.cumulative)} - {formatCurrency(delay12.cumulative)} = <span className="font-semibold">-{formatCurrency(loss12)}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#E5E7EB] pt-3">
                <p className="text-xs text-[#999999] leading-relaxed">
                  The S-curve models realistic adoption: early ramp (25% at 3 months), acceleration (55% at 6 months), maturity (85% at 12 months), full capture (100% at 24 months), and optimization gains (108% at 36 months). Delay shifts the entire curve forward — it does not extend the 3-year horizon. All values are haircut-adjusted before entering this projection.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      <StepFooter onBack={onBack} onNext={onNext} nextLabel="See the Documentation Intelligence Gap" />
    </div>
  );
}
