import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ComparisonPricing } from "../../types";
import type { ForecastResult } from "@/lib/forecastCalculator";
import { ABRIDGE_RED, SCENARIO_COLORS, SCENARIO_DASHES } from "../constants";
import { fmtMonthLabel, fmtCurrencyShort, monthFromContractStart } from "./shared";

interface Props {
  result: ForecastResult;
  comparisons: ComparisonPricing[];
  contractStartDate: string | null;
}

export function CostCurves({ result, comparisons, contractStartDate }: Props) {
  const data = useMemo(() => {
    return result.monthly.map((row) => {
      const point: Record<string, number | string> = {
        month: row.month,
        label: fmtMonthLabel(row.month),
        current: row.cost,
      };
      comparisons.forEach((cmp) => {
        const altRow = result.alternateMonthly[cmp.id]?.[row.month - 1];
        if (altRow) point[cmp.id] = altRow.cost;
      });
      return point;
    });
  }, [result, comparisons]);

  const todayMonth = monthFromContractStart(contractStartDate);

  const deltaPills = comparisons.map((cmp) => {
    const altKpis = result.alternateKpis[cmp.id];
    const delta = altKpis ? altKpis.totalContractCost - result.kpis.totalContractCost : 0;
    return { cmp, delta };
  });

  return (
    <div className="space-y-2">
      {deltaPills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {deltaPills.map(({ cmp, delta }, i) => {
            const savings = delta < 0;
            return (
              <span
                key={cmp.id}
                data-testid={`delta-pill-${cmp.id}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border ${
                  savings
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                <span
                  className="w-2 h-0.5"
                  style={{
                    background: SCENARIO_COLORS[i + 1] ?? "#888",
                    borderTop: SCENARIO_DASHES[i + 1] ? "1px dashed" : "1px solid",
                    borderColor: SCENARIO_COLORS[i + 1] ?? "#888",
                  }}
                />
                <span>{cmp.label}:</span>
                <span className="font-sans font-semibold">
                  {savings ? "−" : "+"}
                  {fmtCurrencyShort(Math.abs(delta))} over term
                </span>
              </span>
            );
          })}
        </div>
      )}

      <div className="h-[280px] w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
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
            <Line
              type="monotone"
              dataKey="current"
              stroke={ABRIDGE_RED}
              strokeWidth={3}
              dot={false}
              name="Current pricing"
            />
            {comparisons.map((cmp, i) => (
              <Line
                key={cmp.id}
                type="monotone"
                dataKey={cmp.id}
                stroke={SCENARIO_COLORS[i + 1] ?? "#888"}
                strokeWidth={2}
                strokeDasharray={SCENARIO_DASHES[i + 1] ?? "4 4"}
                dot={false}
                name={cmp.label}
              />
            ))}
            {todayMonth !== null && todayMonth >= 1 && todayMonth <= data.length && (
              <ReferenceLine
                x={data[todayMonth - 1]?.label as string}
                stroke="#999"
                strokeDasharray="4 4"
                label={{ value: "Today", fill: "#666", fontSize: 10, position: "top" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
