import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
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

interface ChartDataItem {
  name: string;
  value: number;
  fill: string;
  isNegative: boolean;
}

export function WaterfallChart({ levers, investmentCost, netValue }: WaterfallChartProps) {
  const enabledLevers = levers.filter((l) => l.enabled);
  
  const data: ChartDataItem[] = [
    {
      name: "Investment",
      value: -investmentCost,
      fill: "hsl(0, 72%, 50%)",
      isNegative: true,
    },
    ...enabledLevers.map((lever) => ({
      name: lever.label.length > 12 ? lever.label.substring(0, 12) + "..." : lever.label,
      value: lever.value,
      fill: "hsl(142, 76%, 36%)",
      isNegative: false,
    })),
    {
      name: "Net Value",
      value: netValue,
      fill: netValue >= 0 ? "hsl(211, 80%, 50%)" : "hsl(0, 72%, 50%)",
      isNegative: netValue < 0,
    },
  ];

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataItem }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-md p-3 shadow-lg">
          <p className="font-semibold text-sm">{item.name}</p>
          <p className={`font-mono text-sm ${item.isNegative ? 'text-red-500' : 'text-green-500'}`}>
            {formatCurrency(item.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">ROI Waterfall Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 40, bottom: 60 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false} 
                stroke="hsl(var(--border))" 
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Bar 
                dataKey="value" 
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              >
                {data.map((entry, index) => (
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
