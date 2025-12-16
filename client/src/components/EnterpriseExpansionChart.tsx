import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { type Lever } from "@/lib/roi-types";
import { formatCurrency } from "@/lib/roi-calculator";

interface EnterpriseExpansionChartProps {
  levers: Lever[];
  totalAnnualBenefit: number;
  scopeEncounterCount: number;
  enterpriseEncounterCount: number;
}

const CURRENT_COLOR = "#9CA3AF";
const ENTERPRISE_COLOR = "#000000";

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

export function EnterpriseExpansionChart({ 
  levers, 
  totalAnnualBenefit,
  scopeEncounterCount,
  enterpriseEncounterCount,
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
    {
      name: SHORT_LABELS["Total Annual Benefit"] || "Total Impact",
      fullName: "Total Annual Benefit",
      current: totalAnnualBenefit,
      enterprise: totalAnnualBenefit * scaleFactor,
    },
  ];

  const CustomTooltip = ({ 
    active, 
    payload,
    label,
  }: { 
    active?: boolean; 
    payload?: Array<{ dataKey: string; value: number; payload: ChartDataItem }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white border border-neutral-200 rounded-md p-3 shadow-lg">
          <p className="font-semibold text-sm text-neutral-900 mb-2">{item.fullName}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: entry.dataKey === 'current' ? CURRENT_COLOR : ENTERPRISE_COLOR }}
              />
              <span className="text-xs text-neutral-600">
                {entry.dataKey === 'current' ? 'Current scope' : 'Enterprise projection'}:
              </span>
              <span className="font-mono text-xs text-neutral-900">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const allValues = chartData.flatMap(d => [d.current, d.enterprise]);
  const maxVal = Math.max(...allValues);
  const yAxisMax = Math.ceil(maxVal * 1.1 / 100000) * 100000 || 100000;

  const totalEnterprise = totalAnnualBenefit * scaleFactor;
  const multiplier = scaleFactor.toFixed(1);

  return (
    <Card className="bg-white border-neutral-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-neutral-900">Enterprise Expansion View</CardTitle>
        <p className="text-sm text-neutral-500">Driver-level comparison (current vs. enterprise)</p>
        <div className="mt-3 p-3 bg-neutral-50 rounded-md">
          <p className="text-sm font-medium text-neutral-700">
            Current impact: <span className="font-mono">{formatCurrency(totalAnnualBenefit)}</span>
            <span className="mx-2 text-neutral-400">|</span>
            Enterprise potential: <span className="font-mono">{formatCurrency(totalEnterprise)}</span>
            <span className="mx-2 text-neutral-400">|</span>
            <span className="text-neutral-500">({multiplier}x difference)</span>
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CURRENT_COLOR }} />
            <span className="text-xs text-neutral-500">Current scope</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: ENTERPRISE_COLOR }} />
            <span className="text-xs text-neutral-500">Enterprise projection</span>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 50, bottom: 40 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#737373" }}
                tickLine={false}
                axisLine={{ stroke: "#e5e5e5", strokeWidth: 1 }}
                height={40}
                interval={0}
              />
              <YAxis
                domain={[0, yAxisMax]}
                tickFormatter={(value) => {
                  if (value >= 1000000) {
                    return `$${(value / 1000000).toFixed(1)}M`;
                  }
                  return `$${(value / 1000).toFixed(0)}K`;
                }}
                tick={{ fontSize: 11, fill: "#737373" }}
                tickLine={false}
                axisLine={{ stroke: "#e5e5e5", strokeWidth: 1 }}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              <Bar 
                dataKey="current" 
                fill={CURRENT_COLOR}
                radius={[3, 3, 0, 0]}
                maxBarSize={40}
              />
              <Bar 
                dataKey="enterprise" 
                fill={ENTERPRISE_COLOR}
                radius={[3, 3, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
