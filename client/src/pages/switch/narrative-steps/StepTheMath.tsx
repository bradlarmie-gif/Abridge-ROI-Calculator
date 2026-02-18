import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
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

const RAMP = 0.9;
const GROWTH = 0.03;

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
  const year1 = Math.round(A * RAMP);
  const year2 = Math.round(A);
  const year3 = Math.round(A * (1 + GROWTH));
  const cumulative = year1 + year2 + year3;
  return { year1, year2, year3, cumulative };
}

function computeDelayProjection(A: number, delayMonths: number) {
  const adjustedYear1 = Math.round(A * RAMP * ((12 - delayMonths) / 12));
  const year2 = Math.round(A);
  const year3 = Math.round(A * (1 + GROWTH));
  const cumulative = adjustedYear1 + year2 + year3;
  return { adjustedYear1, year2, year3, cumulative };
}

export default function StepTheMath({
  onNext,
  onBack,
}: StepTheMathProps) {
  const [showMethodology, setShowMethodology] = useState(false);
  const { state } = useAssessment();
  const pillarResult = useMemo(() => computePillars(state), [state]);
  const A = pillarResult.totalAnnual;

  const projection = useMemo(() => computeProjection(A), [A]);
  const delay6 = useMemo(() => computeDelayProjection(A, 6), [A]);
  const delay12 = useMemo(() => computeDelayProjection(A, 12), [A]);

  const loss6 = projection.cumulative - delay6.cumulative;
  const loss12 = projection.cumulative - delay12.cumulative;

  const chartData = useMemo(() => {
    const points = [];
    for (let m = 0; m <= 36; m += 3) {
      let potential = 0;
      if (m <= 12) {
        potential = Math.round(projection.year1 * (m / 12));
      } else if (m <= 24) {
        potential = Math.round(projection.year1 + projection.year2 * ((m - 12) / 12));
      } else {
        potential = Math.round(
          projection.year1 + projection.year2 + projection.year3 * ((m - 24) / 12),
        );
      }
      points.push({ month: m, current: 0, potential });
    }
    return points;
  }, [projection]);

  return (
    <div className={`space-y-8 ${STEP_FOOTER_SPACER_CLASS}`}>
      <div className="text-left">
        <p className="text-[11px] text-[#999999] uppercase tracking-widest mb-2">
          3-Year Enterprise Projection
        </p>
        <h1
          className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-2 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          The Compounding Effect of Action
        </h1>
        <p className="text-sm text-[#888888]">
          Enterprise value compounds as adoption deepens and governance matures.
        </p>
      </div>

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
            <p className="text-[10px] text-[#999999] uppercase tracking-wider mb-1">Year 1</p>
            <p className="text-lg font-bold text-[#1A1A1A] tabular-nums" data-testid="value-y1">
              {formatCurrency(projection.year1)}
            </p>
            <p className="text-[10px] text-[#999999]">A x {(RAMP * 100).toFixed(0)}% ramp</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-[#999999] uppercase tracking-wider mb-1">Year 2</p>
            <p className="text-lg font-bold text-[#1A1A1A] tabular-nums" data-testid="value-y2">
              {formatCurrency(projection.year2)}
            </p>
            <p className="text-[10px] text-[#999999]">Full run-rate</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-[#999999] uppercase tracking-wider mb-1">Year 3</p>
            <p className="text-lg font-bold text-[#EA2C00] tabular-nums" data-testid="value-y3">
              {formatCurrency(projection.year3)}
            </p>
            <p className="text-[10px] text-[#999999]">+{(GROWTH * 100).toFixed(0)}% growth</p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[#E8E0D8] text-center">
          <p className="text-[10px] text-[#999999] uppercase tracking-wider mb-1">3-Year Cumulative</p>
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
        <p className="text-[10px] text-[#999999] uppercase tracking-widest mb-3 font-medium">
          The Cost of Waiting
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            className="bg-[#F5F0EB] rounded-xl border border-[#E8E0D8] p-5 text-center"
            data-testid="card-act-now"
          >
            <p className="text-[10px] text-[#EA2C00] uppercase tracking-widest font-bold mb-3">
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
            <p className="text-[10px] text-[#999999] uppercase tracking-widest font-medium mb-3">
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
            <p className="text-[10px] text-[#999999] uppercase tracking-widest font-medium mb-3">
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
                <p className="text-[10px] text-[#999999] uppercase tracking-wider font-medium mb-2">
                  Defined Variables
                </p>
                <div className="bg-[#F5F0EB] rounded-lg border border-[#E8E0D8] p-4 space-y-2 text-sm font-mono">
                  <p className="text-[#333333]">
                    <span className="text-[#EA2C00] font-semibold">A</span> = {formatCurrency(A)}
                    <span className="text-[#999999] font-sans text-xs ml-2">(Conservative Annual Enterprise Opportunity)</span>
                  </p>
                  <p className="text-[#333333]">
                    <span className="text-[#EA2C00] font-semibold">ramp</span> = {(RAMP * 100).toFixed(0)}%
                    <span className="text-[#999999] font-sans text-xs ml-2">(Year 1 capture rate during adoption build-out)</span>
                  </p>
                  <p className="text-[#333333]">
                    <span className="text-[#EA2C00] font-semibold">growth</span> = {(GROWTH * 100).toFixed(0)}%
                    <span className="text-[#999999] font-sans text-xs ml-2">(Annual growth rate after full capture)</span>
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-[#999999] uppercase tracking-wider font-medium mb-2">
                  Projection with Immediate Action
                </p>
                <div className="bg-[#F5F0EB] rounded-lg border border-[#E8E0D8] p-4 space-y-2 text-sm font-mono">
                  <p className="text-[#333333]">
                    Year 1 = A x ramp = {formatCurrency(A)} x {(RAMP * 100).toFixed(0)}% = <span className="font-semibold">{formatCurrency(projection.year1)}</span>
                  </p>
                  <p className="text-[#333333]">
                    Year 2 = A = <span className="font-semibold">{formatCurrency(projection.year2)}</span>
                  </p>
                  <p className="text-[#333333]">
                    Year 3 = A x (1 + growth) = {formatCurrency(A)} x {(1 + GROWTH).toFixed(2)} = <span className="font-semibold">{formatCurrency(projection.year3)}</span>
                  </p>
                  <div className="border-t border-[#E8E0D8] pt-2 mt-2">
                    <p className="text-[#1A1A1A] font-semibold">
                      Cumulative = {formatCurrency(projection.year1)} + {formatCurrency(projection.year2)} + {formatCurrency(projection.year3)} = {formatCurrency(projection.cumulative)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-[#999999] uppercase tracking-wider font-medium mb-2">
                  Delay Reduces Year 1 Capture Proportionally
                </p>
                <div className="bg-[#F5F0EB] rounded-lg border border-[#E8E0D8] p-4 space-y-3 text-sm font-mono">
                  <div className="space-y-1.5">
                    <p className="text-[#999999] font-sans text-xs font-medium uppercase tracking-wider">6-Month Delay</p>
                    <p className="text-[#333333]">
                      Adjusted Year 1 = A x ramp x (6/12) = <span className="font-semibold">{formatCurrency(delay6.adjustedYear1)}</span>
                    </p>
                    <p className="text-[#333333]">
                      3-Year Cumulative = {formatCurrency(delay6.adjustedYear1)} + {formatCurrency(delay6.year2)} + {formatCurrency(delay6.year3)} = <span className="font-semibold">{formatCurrency(delay6.cumulative)}</span>
                    </p>
                    <p className="text-[#EA2C00]">
                      Opportunity Cost = {formatCurrency(projection.cumulative)} - {formatCurrency(delay6.cumulative)} = <span className="font-semibold">-{formatCurrency(loss6)}</span>
                    </p>
                  </div>
                  <div className="border-t border-[#E8E0D8] pt-3 space-y-1.5">
                    <p className="text-[#999999] font-sans text-xs font-medium uppercase tracking-wider">12-Month Delay</p>
                    <p className="text-[#333333]">
                      Adjusted Year 1 = A x ramp x (0/12) = <span className="font-semibold">{formatCurrency(delay12.adjustedYear1)}</span>
                    </p>
                    <p className="text-[#333333]">
                      3-Year Cumulative = {formatCurrency(delay12.adjustedYear1)} + {formatCurrency(delay12.year2)} + {formatCurrency(delay12.year3)} = <span className="font-semibold">{formatCurrency(delay12.cumulative)}</span>
                    </p>
                    <p className="text-[#EA2C00]">
                      Opportunity Cost = {formatCurrency(projection.cumulative)} - {formatCurrency(delay12.cumulative)} = <span className="font-semibold">-{formatCurrency(loss12)}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#E5E7EB] pt-3">
                <p className="text-xs text-[#999999] leading-relaxed">
                  No exponential compounding beyond the defined {(GROWTH * 100).toFixed(0)}% growth rate. Delay shortens the capture window — it does not extend the 3-year horizon. All values are haircut-adjusted before entering this projection.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      <StepFooter onBack={onBack} onNext={onNext} nextLabel="Enterprise Summary" />
    </div>
  );
}
