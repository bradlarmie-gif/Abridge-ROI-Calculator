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

const TIME_LEVER_COLORS = [
  "#4A9F6E",
  "#5DB578",
  "#71C287",
];

const DOC_LEVER_COLORS = [
  "#2B8A9E",
  "#3BA3B8",
  "#4DBDCF",
];

const INVESTMENT_COLOR = "#F03319";
const NET_VALUE_COLOR = "#4A7AAF";

interface LeverSegment {
  id: string;
  label: string;
  value: number;
  color: string;
  percentOfDomain: number;
}

interface DomainBar {
  name: string;
  displayName: string;
  total: number;
  segments: LeverSegment[];
  baseColor: string;
}

export function WaterfallChart({ levers, investmentCost, netValue }: WaterfallChartProps) {
  const enabledLevers = levers.filter((l) => l.enabled);
  
  const timeLevers = enabledLevers.filter((l) => l.category === "time");
  const docLevers = enabledLevers.filter((l) => l.category === "documentation");
  
  const timeTotal = timeLevers.reduce((sum, l) => sum + l.value, 0);
  const docTotal = docLevers.reduce((sum, l) => sum + l.value, 0);

  const timeSegments: LeverSegment[] = timeLevers.map((lever, i) => ({
    id: lever.id,
    label: lever.label,
    value: lever.value,
    color: TIME_LEVER_COLORS[i % TIME_LEVER_COLORS.length],
    percentOfDomain: timeTotal > 0 ? (lever.value / timeTotal) * 100 : 0,
  }));

  const docSegments: LeverSegment[] = docLevers.map((lever, i) => ({
    id: lever.id,
    label: lever.label,
    value: lever.value,
    color: DOC_LEVER_COLORS[i % DOC_LEVER_COLORS.length],
    percentOfDomain: docTotal > 0 ? (lever.value / docTotal) * 100 : 0,
  }));

  const domains: DomainBar[] = [];
  
  if (timeTotal > 0) {
    domains.push({
      name: "time",
      displayName: "Time Benefits",
      total: timeTotal,
      segments: timeSegments,
      baseColor: TIME_LEVER_COLORS[0],
    });
  }
  
  if (docTotal > 0) {
    domains.push({
      name: "documentation",
      displayName: "Documentation Benefits",
      total: docTotal,
      segments: docSegments,
      baseColor: DOC_LEVER_COLORS[0],
    });
  }

  interface ChartDataItem {
    name: string;
    displayName: string;
    value: number;
    fill: string;
    isNegative: boolean;
    type: "investment" | "domain" | "netValue";
    segments?: LeverSegment[];
  }

  const chartData: ChartDataItem[] = [
    {
      name: "investment",
      displayName: "Investment",
      value: -investmentCost,
      fill: INVESTMENT_COLOR,
      isNegative: true,
      type: "investment",
    },
    ...domains.map((domain) => ({
      name: domain.name,
      displayName: domain.displayName,
      value: domain.total,
      fill: domain.baseColor,
      isNegative: false,
      type: "domain" as const,
      segments: domain.segments,
    })),
    {
      name: "netValue",
      displayName: "Net Value",
      value: netValue,
      fill: netValue >= 0 ? NET_VALUE_COLOR : INVESTMENT_COLOR,
      isNegative: netValue < 0,
      type: "netValue",
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
      
      if (item.type === "domain" && item.segments && item.segments.length > 0) {
        return (
          <div className="bg-white border border-neutral-200 rounded-md p-3 shadow-lg max-w-xs">
            <p className="font-semibold text-sm text-neutral-900 mb-2">{item.displayName}</p>
            <p className="text-sm text-neutral-600 mb-3">
              Total: <span className="font-mono text-green-600">{formatCurrency(item.value)}</span>
            </p>
            <div className="space-y-2 border-t border-neutral-100 pt-2">
              {item.segments.map((seg) => (
                <div key={seg.id} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-sm flex-shrink-0" 
                    style={{ backgroundColor: seg.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-700 truncate">{seg.label}</p>
                    <p className="text-xs text-neutral-500">
                      <span className="font-mono">{formatCurrency(seg.value)}</span>
                      <span className="ml-1">({seg.percentOfDomain.toFixed(0)}%)</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      
      return (
        <div className="bg-white border border-neutral-200 rounded-md p-3 shadow-lg">
          <p className="font-semibold text-sm text-neutral-900">{item.displayName}</p>
          <p className={`font-mono text-sm ${item.isNegative ? 'text-red-600' : 'text-blue-600'}`}>
            {formatCurrency(item.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const maxAbsValue = Math.max(
    investmentCost,
    timeTotal,
    docTotal,
    Math.abs(netValue)
  );
  const yAxisMax = Math.ceil(maxAbsValue * 1.15 / 100000) * 100000;
  const yAxisMin = -Math.ceil(investmentCost * 1.15 / 100000) * 100000;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">ROI Breakdown by Strategic Domain</CardTitle>
        <div className="flex flex-wrap gap-4 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: TIME_LEVER_COLORS[0] }} />
            <span className="text-xs text-neutral-500">Time Benefits</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: DOC_LEVER_COLORS[0] }} />
            <span className="text-xs text-neutral-500">Documentation Benefits</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 50, bottom: 40 }}
            >
              <XAxis
                dataKey="displayName"
                tick={{ fontSize: 11, fill: "#737373" }}
                tickLine={false}
                axisLine={{ stroke: "#e5e5e5", strokeWidth: 1 }}
                dy={8}
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
              <ReferenceLine y={0} stroke="#d4d4d4" strokeWidth={1} />
              <Bar 
                dataKey="value" 
                radius={[4, 4, 4, 4]}
                maxBarSize={80}
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
