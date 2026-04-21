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
import type { ForecastResult } from "@/lib/forecastCalculator";
import type { ForecastState } from "../../types";
import { ABRIDGE_RED } from "../constants";
import { fmtMonthLabel, monthFromContractStart } from "./shared";

interface Props {
  result: ForecastResult;
  state: ForecastState;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return Math.round(n).toLocaleString();
}

export function EncounterTrajectory({ result, state }: Props) {
  const data = useMemo(
    () =>
      result.monthly.map((r) => ({
        month: r.month,
        label: fmtMonthLabel(r.month),
        cumulative: r.cumulativeEncounters,
      })),
    [result],
  );

  const todayMonth = monthFromContractStart(state.contractStartDate);
  const limit = state.currentPricing.contractEncounterLimit;
  const ceiling = state.currentPricing.capacityCeiling;
  const { runwayMonth, capacityBreachMonth, projectedOverage } = result.kpis;

  const callout =
    runwayMonth != null
      ? `Runway: hits contract limit in Month ${runwayMonth}`
      : capacityBreachMonth != null
        ? `Capacity breach in Month ${capacityBreachMonth}`
        : projectedOverage > 0
          ? `Projected overage: $${fmtNum(projectedOverage)}`
          : null;

  return (
    <div className="space-y-2 relative">
      {callout && (
        <div
          data-testid="encounter-callout"
          className="absolute right-2 top-2 z-10 rounded-md bg-white border border-red-200 px-2.5 py-1.5 text-[11px] font-semibold text-[#A82200] shadow-sm"
        >
          {callout}
        </div>
      )}
      <div className="h-[260px] w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#F1F1F1" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#666" }}
              interval="preserveStartEnd"
              minTickGap={32}
            />
            <YAxis tick={{ fontSize: 10, fill: "#666" }} tickFormatter={fmtNum} width={56} />
            <Tooltip
              formatter={(v: number) => fmtNum(v)}
              labelFormatter={(l) => `Month ${l}`}
              contentStyle={{ fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke={ABRIDGE_RED}
              strokeWidth={2.5}
              dot={false}
              name="Cumulative encounters"
            />
            {limit != null && limit > 0 && (
              <ReferenceLine
                y={limit}
                stroke={ABRIDGE_RED}
                strokeDasharray="4 4"
                label={{
                  value: `Contract Limit (${fmtNum(limit)})`,
                  fill: ABRIDGE_RED,
                  fontSize: 9,
                  position: "insideTopRight",
                }}
              />
            )}
            {ceiling != null && ceiling > 0 && (
              <ReferenceLine
                y={ceiling}
                stroke={ABRIDGE_RED}
                strokeDasharray="2 4"
                label={{
                  value: `Capacity Ceiling (${fmtNum(ceiling)})`,
                  fill: ABRIDGE_RED,
                  fontSize: 9,
                  position: "insideBottomRight",
                }}
              />
            )}
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
