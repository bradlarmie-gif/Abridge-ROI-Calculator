import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ForecastResult } from "@/lib/forecastCalculator";
import type { ForecastScenario, ValueDomain } from "../../types";
import { calculateForecast } from "@/lib/forecastCalculator";
import {
  ABRIDGE_RED,
  DOMAIN_COLORS,
  SCENARIO_COLORS,
  SCENARIO_DASHES,
} from "../constants";
import { fmtMonthLabel, fmtCurrencyShort, monthFromContractStart } from "./shared";

interface Props {
  result: ForecastResult;
  scenarios: ForecastScenario[];
  contractStartDate: string | null;
}

const DOMAIN_KEYS: ValueDomain[] = ["capacity", "revenue", "workforce", "quality"];
const DOMAIN_LABELS: Record<ValueDomain, string> = {
  capacity: "Billing/Capacity",
  revenue: "Revenue",
  workforce: "Cost/Workforce",
  quality: "Quality",
};

export function NetValueOverTime({ result, scenarios, contractStartDate }: Props) {
  const overlays = useMemo(
    () => scenarios.filter((s) => s.overlayOnChart),
    [scenarios],
  );

  const overlayResults = useMemo(() => {
    return overlays.map((s) => ({ scenario: s, res: calculateForecast(s.snapshot) }));
  }, [overlays]);

  const data = useMemo(() => {
    // O(n) cumulative pass instead of O(n^2)
    const cum: Record<ValueDomain, number> = {
      capacity: 0,
      revenue: 0,
      workforce: 0,
      quality: 0,
    };
    let cumCost = 0;
    return result.monthly.map((row) => {
      for (const k of DOMAIN_KEYS) cum[k] += row.valueByDomain[k];
      cumCost += row.cost;
      const point: Record<string, number | string> = {
        month: row.month,
        label: fmtMonthLabel(row.month),
        capacity: cum.capacity,
        revenue: cum.revenue,
        workforce: cum.workforce,
        quality: cum.quality,
        cumulativeNet: row.cumulativeNet,
        cumulativeCostNeg: -cumCost,
      };
      overlayResults.forEach(({ scenario, res }) => {
        const r = res.monthly[row.month - 1];
        if (r) point[`scn-${scenario.id}`] = r.cumulativeNet;
      });
      return point;
    });
  }, [result, overlayResults]);

  const todayMonth = monthFromContractStart(contractStartDate);

  if (scenarios.length === 0 && result.monthly.every((m) => {
    const v = m.valueByDomain;
    return v.capacity === 0 && v.revenue === 0 && v.workforce === 0 && v.quality === 0;
  })) {
    return (
      <div
        className="h-[320px] w-full flex items-center justify-center rounded border border-dashed border-neutral-200 bg-neutral-50/50"
        data-testid="empty-state-net-value"
      >
        <div className="text-center max-w-xs px-6">
          <p className="text-sm font-medium text-neutral-700 mb-1">
            No value drivers yet
          </p>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Add value drivers in the left panel to project net value over time.
            Right now this chart only shows pricing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#F1F1F1" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#666" }}
            interval="preserveStartEnd"
            minTickGap={32}
          />
          <YAxis tick={{ fontSize: 10, fill: "#666" }} tickFormatter={(v) => fmtCurrencyShort(v)} width={56} />
          <Tooltip
            formatter={(v: number) => fmtCurrencyShort(v)}
            labelFormatter={(l) => `Month ${l}`}
            contentStyle={{ fontSize: 11 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {DOMAIN_KEYS.map((d) => (
            <Area
              key={d}
              type="monotone"
              dataKey={d}
              stackId="value"
              stroke={DOMAIN_COLORS[d]}
              fill={DOMAIN_COLORS[d]}
              fillOpacity={0.55}
              name={DOMAIN_LABELS[d]}
            />
          ))}
          <Line
            type="monotone"
            dataKey="cumulativeCostNeg"
            stroke={ABRIDGE_RED}
            strokeWidth={2}
            dot={false}
            name="Cumulative cost"
          />
          <Line
            type="monotone"
            dataKey="cumulativeNet"
            stroke="#1A1A1A"
            strokeWidth={2.5}
            dot={false}
            name="Cumulative net"
          />
          {overlayResults.map(({ scenario }) => (
            <Line
              key={scenario.id}
              type="monotone"
              dataKey={`scn-${scenario.id}`}
              stroke={SCENARIO_COLORS[scenario.colorIdx] ?? "#888"}
              strokeWidth={2}
              strokeDasharray={SCENARIO_DASHES[scenario.colorIdx] || "6 4"}
              dot={false}
              name={`Scenario: ${scenario.name}`}
            />
          ))}
          {result.kpis.fastBreakEvenMonth && (
            <ReferenceLine
              x={data[result.kpis.fastBreakEvenMonth - 1]?.label as string}
              stroke="#999"
              label={{ value: "Fast BE", fill: "#666", fontSize: 9, position: "top" }}
            />
          )}
          {result.kpis.fullBreakEvenMonth && (
            <ReferenceLine
              x={data[result.kpis.fullBreakEvenMonth - 1]?.label as string}
              stroke="#999"
              strokeDasharray="4 4"
              label={{ value: "Full BE", fill: "#666", fontSize: 9, position: "top" }}
            />
          )}
          {todayMonth !== null && todayMonth >= 1 && todayMonth <= data.length && (
            <ReferenceLine
              x={data[todayMonth - 1]?.label as string}
              stroke={ABRIDGE_RED}
              strokeDasharray="4 4"
              label={{ value: "Today", fill: ABRIDGE_RED, fontSize: 10, position: "top" }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
