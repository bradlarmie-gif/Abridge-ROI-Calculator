import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { type Lever } from "@/lib/roi-types";
import { formatCurrency, formatNumber } from "@/lib/roi-calculator";

interface EnterpriseExpansionChartProps {
  levers: Lever[];
  totalAnnualBenefit: number;
  scopeEncounterCount: number;
  enterpriseEncounterCount: number;

  // Optional but HIGHLY recommended (if you have it)
  // If you don’t want to wire these yet, you can delete these props + the row that uses them.
  providersInScope?: number;
  enterpriseProviders?: number;
  utilizationPct?: number;
}

const CURRENT_COLOR = "#9CA3AF";
const ENTERPRISE_COLOR = "#0E9F6E";

const SHORT_LABELS: Record<string, string> = {
  "Patient Access": "Access",
  "Overtime & Locum Cost Avoidance": "Overtime/Locum",
  "Clinician Retention": "Retention",
  "HCC & Chronic Condition Capture": "HCC",
  "Level of Service Alignment": "LOS",
  "Medical Necessity–Driven Denials": "Denials",
  "Total Annual Benefit": "Total Impact",
};

interface ChartDataItem {
  name: string;
  fullName: string;
  current: number;
  enterprise: number;
}

function formatCompactCurrency(value: number) {
  const absVal = Math.abs(value);
  if (absVal >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${(value / 1_000).toFixed(0)}K`;
}

export function EnterpriseExpansionChart({
  levers,
  totalAnnualBenefit,
  scopeEncounterCount,
  enterpriseEncounterCount,
  providersInScope,
  enterpriseProviders,
  utilizationPct,
}: EnterpriseExpansionChartProps) {
  const enabledLevers = levers.filter((l) => l.enabled);

  const leverOrder = [
    "patientAccess",
    "overtime",
    "workforce",
    "riskAdjustment",
    "wrvu",
    "denials",
  ];

  const sortedLevers = [...enabledLevers].sort((a, b) => {
    const aIndex = leverOrder.indexOf(a.id);
    const bIndex = leverOrder.indexOf(b.id);
    return aIndex - bIndex;
  });

  const safeScope = Math.max(1, scopeEncounterCount);
  const scaleFactor = enterpriseEncounterCount / safeScope;

  const chartData: ChartDataItem[] = [
    ...sortedLevers.map((lever) => {
      const enterpriseValue = lever.value * scaleFactor;
      return {
        name: SHORT_LABELS[lever.label] || lever.label,
        fullName: lever.label,
        current: lever.value,
        enterprise: enterpriseValue,
      };
    }),
  ];

  const totalEnterprise = totalAnnualBenefit * scaleFactor;
  const multiplier = scaleFactor;

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ dataKey: string; value: number; payload: ChartDataItem }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const item = payload[0].payload;

    const currentVal = item.current ?? 0;
    const enterpriseVal = item.enterprise ?? 0;
    const delta = enterpriseVal - currentVal;

    return (
      <div className="bg-white border border-neutral-200 rounded-md p-3 shadow-lg min-w-[220px]">
        <p className="font-semibold text-sm text-neutral-900">
          {item.fullName}
        </p>

        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: CURRENT_COLOR }}
              />
              <span className="text-xs text-neutral-600">Current scope</span>
            </div>
            <span className="font-mono text-xs text-neutral-900">
              {formatCurrency(currentVal)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: ENTERPRISE_COLOR }}
              />
              <span className="text-xs text-neutral-600">Enterprise</span>
            </div>
            <span className="font-mono text-xs text-neutral-900">
              {formatCurrency(enterpriseVal)}
            </span>
          </div>

          <div className="pt-2 mt-2 border-t border-neutral-200 flex items-center justify-between gap-4">
            <span className="text-xs text-neutral-600">Delta</span>
            <span className="font-mono text-xs font-semibold text-neutral-900">
              {formatCurrency(delta)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const allValues = chartData.flatMap((d) => [d.current, d.enterprise]);
  const maxVal = Math.max(...allValues);
  const yAxisMax = Math.ceil((maxVal * 1.12) / 100000) * 100000 || 100000;

  return (
    <Card className="bg-white border-neutral-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-neutral-900">
          Enterprise Expansion View
        </CardTitle>
        <p className="text-sm text-neutral-500">
          Driver-level comparison (current vs. enterprise)
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Stripe-ish “context strip” */}
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Enterprise potential
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">
                Assumption: same enabled drivers
              </span>

              {typeof utilizationPct === "number" && (
                <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-xs text-neutral-600">
                  Utilization:{" "}
                  <span className="ml-1 font-mono font-semibold text-neutral-900">
                    {utilizationPct}%
                  </span>
                </span>
              )}
            </div>
          </div>
          {/* Scope fields */}
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-md border border-neutral-200 bg-white px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                Current providers
              </div>
              <div className="mt-1 font-mono text-sm font-semibold text-neutral-900">
                {typeof providersInScope === "number"
                  ? formatNumber(providersInScope)
                  : "—"}
              </div>
            </div>

            <div className="rounded-md border border-neutral-200 bg-white px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                Current encounters
              </div>
              <div className="mt-1 font-mono text-sm font-semibold text-neutral-900">
                {formatNumber(Math.round(scopeEncounterCount))}
              </div>
            </div>

            <div className="rounded-md border border-neutral-200 bg-white px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                Enterprise providers
              </div>
              <div className="mt-1 font-mono text-sm font-semibold text-neutral-900">
                {typeof enterpriseProviders === "number"
                  ? formatNumber(enterpriseProviders)
                  : "—"}
              </div>
            </div>

            <div className="rounded-md border border-neutral-200 bg-white px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-neutral-500">
                Enterprise encounters
              </div>
              <div className="mt-1 font-mono text-sm font-semibold text-neutral-900">
                {formatNumber(Math.round(enterpriseEncounterCount))}
              </div>
            </div>
          </div>

          {/* KPI row */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-neutral-500 mb-1">Current scope</p>
              <p
                className="text-lg font-mono font-semibold"
                style={{ color: "#F03319" }}
              >
                {formatCurrency(totalAnnualBenefit)}
              </p>
            </div>

            <div>
              <p className="text-xs text-neutral-500 mb-1">
                Enterprise projection
              </p>
              <p
                className="text-lg font-mono font-semibold"
                style={{ color: ENTERPRISE_COLOR }}
              >
                {formatCurrency(totalEnterprise)}
              </p>
            </div>

            <div>
              <p className="text-xs text-neutral-500 mb-1">Lift at scale</p>
              <p
                className="text-lg font-mono font-semibold"
                style={{ color: ENTERPRISE_COLOR }}
              >
                {multiplier.toFixed(1)}x
              </p>
            </div>
          </div>
        </div>

        {/* Legend (minimal) */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: CURRENT_COLOR }}
            />
            <span className="text-xs text-neutral-500">Current scope</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: ENTERPRISE_COLOR }}
            />
            <span className="text-xs text-neutral-500">Enterprise</span>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 12, left: 24, bottom: 24 }}
              barCategoryGap="22%"
              barGap={6}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#737373" }}
                tickLine={false}
                axisLine={{ stroke: "#e5e5e5", strokeWidth: 1 }}
                height={28}
                interval={0}
              />

              <YAxis
                domain={[0, yAxisMax]}
                tickFormatter={(value) => {
                  if (value >= 1000000)
                    return `$${(value / 1000000).toFixed(1)}M`;
                  return `$${(value / 1000).toFixed(0)}K`;
                }}
                tick={{ fontSize: 10, fill: "#737373" }}
                tickLine={false}
                axisLine={false}
                width={44}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "transparent" }}
              />
              <Bar
                dataKey="current"
                fill={CURRENT_COLOR}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />

              <Bar
                dataKey="enterprise"
                fill={ENTERPRISE_COLOR}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
