import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
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

const GROWTH_RATE = 0.03;

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

export default function StepTheMath({
  onNext,
  onBack,
}: StepTheMathProps) {
  const { state } = useAssessment();
  const pillarResult = useMemo(() => computePillars(state), [state]);
  const { totalAnnual } = pillarResult;
  const monthlyOpportunity = Math.round(totalAnnual / 12);

  const rampModel = useMemo(() => {
    const y1 = Math.round(totalAnnual * 0.9);
    const y2 = y1 + totalAnnual;
    const y3 = Math.round(y2 + totalAnnual * (1 + GROWTH_RATE));
    return { y1, y2, y3 };
  }, [totalAnnual]);

  const chartData = useMemo(() => {
    const points = [];
    for (let m = 0; m <= 36; m += 3) {
      let potential = 0;
      if (m <= 12) {
        potential = Math.round(rampModel.y1 * (m / 12));
      } else if (m <= 24) {
        potential = Math.round(rampModel.y1 + totalAnnual * ((m - 12) / 12));
      } else {
        potential = Math.round(
          rampModel.y2 + totalAnnual * (1 + GROWTH_RATE) * ((m - 24) / 12),
        );
      }
      points.push({ month: m, current: 0, potential });
    }
    return points;
  }, [rampModel, totalAnnual]);

  const wait6Value = Math.round(rampModel.y3 - monthlyOpportunity * 6);
  const wait6Loss = monthlyOpportunity * 6;
  const wait12Value = Math.round(rampModel.y3 - monthlyOpportunity * 12);
  const wait12Loss = monthlyOpportunity * 12;

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
                  name === "potential" ? "With Action" : "Current Trajectory",
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
              {formatCurrency(rampModel.y1)}
            </p>
            <p className="text-[10px] text-[#999999]">90% ramp</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-[#999999] uppercase tracking-wider mb-1">Year 2</p>
            <p className="text-lg font-bold text-[#1A1A1A] tabular-nums" data-testid="value-y2">
              {formatCurrency(rampModel.y2)}
            </p>
            <p className="text-[10px] text-[#999999]">Full run-rate</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-[#999999] uppercase tracking-wider mb-1">Year 3</p>
            <p className="text-lg font-bold text-[#EA2C00] tabular-nums" data-testid="value-y3">
              {formatCurrency(rampModel.y3)}
            </p>
            <p className="text-[10px] text-[#999999]">+3% growth</p>
          </div>
        </div>
      </section>

      <div className="text-center py-2" data-testid="impact-statement">
        <p className="text-xl md:text-2xl font-bold text-[#1A1A1A] leading-snug">
          Every year you wait leaves{" "}
          <span className="text-[#EA2C00]">{formatCurrency(totalAnnual)}</span>{" "}
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
              {formatCurrency(rampModel.y3)}
            </p>
            <p className="text-xs text-[#888888] mt-2">3-year cumulative value</p>
          </div>

          <div
            className="bg-white rounded-xl border border-[#E5E7EB] p-5 text-center"
            data-testid="card-wait-6"
          >
            <p className="text-[10px] text-[#999999] uppercase tracking-widest font-medium mb-3">
              Wait 6 Months
            </p>
            <p className="text-3xl font-bold text-[#1A1A1A] tabular-nums" data-testid="value-wait-6">
              {formatCurrency(wait6Value)}
            </p>
            <p className="text-xs text-[#EA2C00] font-semibold mt-2" data-testid="loss-wait-6">
              -{formatCurrency(wait6Loss)} opportunity cost
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
              {formatCurrency(wait12Value)}
            </p>
            <p className="text-xs text-[#EA2C00] font-semibold mt-2" data-testid="loss-wait-12">
              -{formatCurrency(wait12Loss)} opportunity cost
            </p>
          </div>
        </div>
      </section>

      <StepFooter onBack={onBack} onNext={onNext} nextLabel="Enterprise Summary" />
    </div>
  );
}
