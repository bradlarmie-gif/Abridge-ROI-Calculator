import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from "recharts";

interface MonthlyDataPoint {
  month: string;
  withAbridge: number;
  withoutAbridge: number;
}

interface MeasureTrendChartProps {
  data: MonthlyDataPoint[];
  unit: string;
  height?: number;
}

function formatMonthLabel(month: string): string {
  const [year, mon] = month.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const idx = parseInt(mon, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx > 11) return month;
  return `${monthNames[idx]} '${year.slice(2)}`;
}

export default function MeasureTrendChart({ data, unit, height = 220 }: MeasureTrendChartProps) {
  if (data.length < 2) {
    return (
      <div className="bg-[#F5F0EB] rounded-lg p-6 text-center" data-testid="trend-chart-empty">
        <p className="text-sm text-[#888888] italic">Add at least two months of data to see the trend.</p>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
  const chartData = sorted.map(p => ({
    month: formatMonthLabel(p.month),
    'Without Abridge': p.withoutAbridge,
    'With Abridge': p.withAbridge,
    delta: p.withAbridge - p.withoutAbridge,
  }));

  const formatTick = (n: number) => {
    if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-lg p-4" data-testid="trend-chart">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gapGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EA2C00" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#EA2C00" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE4" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: '#888888', fontSize: 12 }} axisLine={{ stroke: '#E5E5E5' }} tickLine={false} />
          <YAxis tick={{ fill: '#888888', fontSize: 12 }} axisLine={{ stroke: '#E5E5E5' }} tickLine={false} tickFormatter={formatTick} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1A1A1A', border: 'none', borderRadius: 8, color: 'white', fontSize: 12 }}
            labelStyle={{ color: 'white', fontWeight: 600 }}
            formatter={(value: number, name: string) => [`${value.toLocaleString()} ${unit}`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Line
            type="monotone"
            dataKey="Without Abridge"
            stroke="#888888"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3, fill: '#888888' }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="With Abridge"
            stroke="#EA2C00"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#EA2C00' }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
