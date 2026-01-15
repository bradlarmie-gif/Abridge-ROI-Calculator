import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface MaturityCurveVizProps {
  hasRetention?: boolean;
}

interface DataPoint {
  month: number;
  utilization: number;
  label: string;
  stage?: string;
  retentionUtilization?: number;
}

export function MaturityCurveViz({ hasRetention = false }: MaturityCurveVizProps) {
  const data: DataPoint[] = useMemo(() => [
    { month: 0, utilization: 0, label: "Start", retentionUtilization: 0 },
    { month: 1, utilization: 40, label: "M1", retentionUtilization: 10 },
    { month: 3, utilization: 50, label: "M3", retentionUtilization: 15 },
    { month: 6, utilization: 58, label: "M6", stage: "Ramp-Up", retentionUtilization: 20 },
    { month: 9, utilization: 68, label: "M9", retentionUtilization: 25 },
    { month: 12, utilization: 75, label: "Y1", stage: "Maturing", retentionUtilization: 30 },
    { month: 15, utilization: 80, label: "M15", retentionUtilization: 50 },
    { month: 18, utilization: 85, label: "M18", retentionUtilization: 70 },
    { month: 24, utilization: 88, label: "Y2", stage: "Mature", retentionUtilization: 85 },
    { month: 30, utilization: 90, label: "M30", retentionUtilization: 95 },
    { month: 36, utilization: 92, label: "Y3", retentionUtilization: 100 },
  ], []);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: DataPoint; dataKey: string }> }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{point.label}</p>
          <p className="text-sm text-muted-foreground">
            Standard: {payload.find(p => p.dataKey === "utilization")?.value}%
          </p>
          {hasRetention && point.retentionUtilization !== undefined && (
            <p className="text-sm text-muted-foreground">
              Retention: {point.retentionUtilization}%
            </p>
          )}
          {point.stage && (
            <p className="text-sm font-medium text-[#F03319] mt-1">{point.stage}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="utilizationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F03319" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#F03319" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0E9F6E" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0E9F6E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="month"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            tickFormatter={(value) => {
              if (value === 0) return "0";
              if (value === 12) return "Y1";
              if (value === 24) return "Y2";
              if (value === 36) return "Y3";
              return `M${value}`;
            }}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={12} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <ReferenceLine x={24} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="utilization"
            name="Standard Drivers"
            stroke="#F03319"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#utilizationGradient)"
          />
          {hasRetention && (
            <Area
              type="monotone"
              dataKey="retentionUtilization"
              name="Retention (Lagged)"
              stroke="#0E9F6E"
              strokeWidth={2}
              strokeDasharray="5 5"
              fillOpacity={1}
              fill="url(#retentionGradient)"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-1 rounded bg-gradient-to-r from-yellow-400 to-yellow-600" />
          <span className="text-sm text-muted-foreground">Ramp-Up (Y1)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-10 h-1 rounded bg-gradient-to-r from-[#F03319] to-[#F03319]/70" />
          <span className="text-sm text-muted-foreground">Maturing (Y2)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-10 h-1 rounded bg-gradient-to-r from-[#0E9F6E] to-[#0E9F6E]/70" />
          <span className="text-sm text-muted-foreground">Mature (Y3)</span>
        </div>
      </div>
    </div>
  );
}
