import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { type Lever, type LeverId } from "@/lib/roi-types";
import { formatCurrency } from "@/lib/roi-calculator";

/** =========================
 *  EDITABLE CONFIG (start)
 *  ========================= */
const WF = {
  title: "Driver contribution",
  subtitle: "Cost baseline + contribution of enabled drivers",

  // Stripe-ish palette with Abridge anchor
  colors: {
    cost: "#EA2C00", // Abridge red
    benefit: "#111827", // near-black for “contribution”
    netPositive: "#0EA5E9", // clean blue for net
    netNegative: "#EA2C00",
    axis: "#E5E7EB",
    tick: "#6B7280",
    label: "#374151",
    card: "#FFFFFF",
  },

  // Order + short labels in ONE place
  order: [
    "patientAccess",
    "overtime",
    "workforce",
    "wrvu",
    "denials",
    "hcc",
  ] as LeverId[],

  shortLabels: {
    cost: "Cost",
    net: "Net",
    patientAccess: "Access",
    overtime: "Overtime",
    workforce: "Retention",
    wrvu: "LOS",
    denials: "Denials",
    hcc: "HCC",
  } as Record<string, string>,

  // Bar sizing
  maxBarSize: 56,
};
/** =========================
 *  EDITABLE CONFIG (end)
 *  ========================= */

interface WaterfallChartProps {
  levers: Lever[];
  investmentCost: number;
  netValue: number;
}

type ChartItemKind = "cost" | "benefit" | "net";

interface ChartDataItem {
  key: string;
  kind: ChartItemKind;
  name: string; // short label
  fullName: string; // long label
  value: number;
  fill: string;
  isNegative: boolean;
  description?: string;
}

function firstSentence(text?: string) {
  if (!text) return "";
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0] : text;
}

function formatAxisTick(value: number) {
  const absVal = Math.abs(value);
  if (absVal >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  const k = Math.round(value / 1_000);
  if (Math.abs(k) >= 1000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${k.toFixed(0)}K`;
}

function computeAxisDomain(values: number[]) {
  const maxVal = Math.max(...values, 0);
  const minVal = Math.min(...values, 0);

  // pad by 10% then round to nearest 100k
  const padMax = maxVal * 1.1;
  const padMin = minVal * 1.1;

  const round = (n: number) => Math.round(n / 100_000) * 100_000;
  const ceil = (n: number) => Math.ceil(n / 100_000) * 100_000;
  const floor = (n: number) => Math.floor(n / 100_000) * 100_000;

  const yMax = padMax === 0 ? 100_000 : ceil(padMax);
  const yMin = padMin === 0 ? -100_000 : floor(padMin);

  // ensure they’re not identical
  return [yMin === yMax ? yMin - 100_000 : yMin, yMax] as [number, number];
}

export function WaterfallChart({
  levers,
  investmentCost,
  netValue,
}: WaterfallChartProps) {
  const enabled = levers.filter((l) => l.enabled);

  const leverById = new Map<LeverId, Lever>();
  enabled.forEach((l) => leverById.set(l.id, l));

  const sorted = WF.order
    .map((id) => leverById.get(id))
    .filter(Boolean) as Lever[];

  const chartData: ChartDataItem[] = [
    {
      key: "cost",
      kind: "cost",
      name: WF.shortLabels.cost ?? "Cost",
      fullName: "Program cost",
      value: -Math.abs(investmentCost),
      fill: WF.colors.cost,
      isNegative: true,
      description: "Annual Abridge investment for the current scope.",
    },
    ...sorted.map((lever) => ({
      key: lever.id,
      kind: "benefit" as const,
      name: WF.shortLabels[lever.id] ?? lever.label,
      fullName: lever.label,
      value: Math.max(0, lever.value),
      fill: WF.colors.benefit,
      isNegative: false,
      description: lever.description,
    })),
    {
      key: "net",
      kind: "net",
      name: WF.shortLabels.net ?? "Net",
      fullName: "Net value",
      value: netValue,
      fill: netValue >= 0 ? WF.colors.netPositive : WF.colors.netNegative,
      isNegative: netValue < 0,
      description: "Total benefit minus program cost.",
    },
  ];

  const [yMin, yMax] = computeAxisDomain(chartData.map((d) => d.value));

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: ChartDataItem }>;
  }) => {
    if (!active || !payload?.length) return null;
    const item = payload[0].payload;

    const valueClass =
      item.kind === "cost"
        ? "text-red-600"
        : item.kind === "net"
          ? item.isNegative
            ? "text-red-600"
            : "text-sky-600"
          : "text-neutral-900";

    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-3 shadow-lg max-w-xs">
        <div className="text-sm font-semibold text-neutral-900">
          {item.fullName}
        </div>
        <div className={`font-mono text-sm mt-1 ${valueClass}`}>
          {formatCurrency(item.value)}
        </div>
        {item.description ? (
          <div className="text-xs text-neutral-500 mt-2 leading-relaxed">
            {firstSentence(item.description)}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <Card className="bg-white border-neutral-200">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold text-neutral-900">
              {WF.title}
            </div>
            <div className="text-sm text-neutral-500 mt-1">{WF.subtitle}</div>
          </div>

          {/* tiny legend, Stripe-ish */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-neutral-500">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: WF.colors.cost }}
              />
              Cost
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: WF.colors.benefit }}
              />
              Drivers
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: WF.colors.netPositive }}
              />
              Net
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 16, right: 14, left: 48, bottom: 28 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fontWeight: 600, fill: WF.colors.label }}
                tickLine={false}
                axisLine={{ stroke: WF.colors.axis, strokeWidth: 1 }}
                height={34}
                interval={0}
              />
              <YAxis
                domain={[yMin, yMax]}
                tickFormatter={formatAxisTick}
                tick={{ fontSize: 11, fill: WF.colors.tick }}
                tickLine={false}
                axisLine={{ stroke: WF.colors.axis, strokeWidth: 1 }}
                width={64}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "transparent" }}
              />
              <ReferenceLine y={0} stroke={WF.colors.axis} strokeWidth={1} />
              <Bar
                dataKey="value"
                radius={[4, 4, 4, 4]}
                maxBarSize={WF.maxBarSize}
              >
                {chartData.map((entry, i) => (
                  <Cell key={`cell-${entry.key}-${i}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
