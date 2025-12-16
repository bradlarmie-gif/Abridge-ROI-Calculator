import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { type Lever } from "@/lib/roi-types";
import { formatCurrency } from "@/lib/roi-calculator";

interface WaterfallChartProps {
  levers: Lever[];
  investmentCost: number;
  netValue: number;
}

const INVESTMENT_COLOR = "#F03319";
const BENEFIT_COLOR = "#0E9F6E";
const NET_VALUE_COLOR = "#2563EB";

const SHORT_LABELS: Record<string, string> = {
  "Investment": "Cost",
  "Patient Access": "Access",
  "Overtime & Locum Cost Avoidance": "Overtime/Locum",
  "Clinician Retention": "Retention",
  "HCC & Chronic Condition Capture": "HCC",
  "Level of Service Alignment": "LOS",
  "Medical Necessity–Driven Denials": "Denials",
  "Net Value": "Net",
};

interface ChartDataItem {
  name: string;
  fullName: string;
  value: number;
  fill: string;
  isNegative: boolean;
  description?: string;
}

export function WaterfallChart({ levers, investmentCost, netValue }: WaterfallChartProps) {
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

  const chartData: ChartDataItem[] = [
    {
      name: SHORT_LABELS["Investment"] || "Cost",
      fullName: "Investment",
      value: -investmentCost,
      fill: INVESTMENT_COLOR,
      isNegative: true,
    },
    ...sortedLevers.map((lever) => ({
      name: SHORT_LABELS[lever.label] || lever.label,
      fullName: lever.label,
      value: lever.value,
      fill: BENEFIT_COLOR,
      isNegative: false,
      description: lever.description,
    })),
    {
      name: SHORT_LABELS["Net Value"] || "Net",
      fullName: "Net Value",
      value: netValue,
      fill: netValue >= 0 ? NET_VALUE_COLOR : INVESTMENT_COLOR,
      isNegative: netValue < 0,
    },
  ];

  const CustomTooltip = ({ 
    active, 
    payload 
  }: { 
    active?: boolean; 
    payload?: Array<{ payload: ChartDataItem }>;
  }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      
      return (
        <div className="bg-white border border-neutral-200 rounded-md p-3 shadow-lg max-w-xs">
          <p className="font-semibold text-sm text-neutral-900">{item.fullName}</p>
          <p className={`font-mono text-sm mt-1 ${item.isNegative ? 'text-red-600' : item.fullName === 'Net Value' ? 'text-blue-600' : 'text-green-600'}`}>
            {formatCurrency(item.value)}
          </p>
          {item.description && (
            <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
              {item.description.split('.')[0]}.
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const allValues = chartData.map(d => d.value);
  const maxVal = Math.max(...allValues);
  const minVal = Math.min(...allValues);
  const yAxisMax = Math.ceil(maxVal * 1.1 / 100000) * 100000 || 100000;
  const yAxisMin = Math.floor(minVal * 1.1 / 100000) * 100000 || -100000;

  return (
    <Card className="bg-white border-neutral-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-neutral-900">Impact Breakdown for Current Scope</CardTitle>
        <p className="text-sm text-neutral-500">Contribution of selected strategic drivers</p>
        <div className="flex flex-wrap gap-4 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: INVESTMENT_COLOR }} />
            <span className="text-xs text-neutral-500">Investment</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: BENEFIT_COLOR }} />
            <span className="text-xs text-neutral-500">Benefits</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: NET_VALUE_COLOR }} />
            <span className="text-xs text-neutral-500">Net Value</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 50, bottom: 40 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fontWeight: 500, fill: "#525252" }}
                tickLine={false}
                axisLine={{ stroke: "#e5e5e5", strokeWidth: 1 }}
                height={40}
                interval={0}
              />
              <YAxis
                domain={[yAxisMin, yAxisMax]}
                tickFormatter={(value) => {
                  const absVal = Math.abs(value);
                  if (absVal >= 1000000) {
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
              <ReferenceLine y={0} stroke="#e5e5e5" strokeWidth={1} />
              <Bar 
                dataKey="value" 
                radius={[3, 3, 3, 3]}
                maxBarSize={60}
                stroke="#a3a3a3"
                strokeWidth={1}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
