import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { computeAdoptionCurve } from "@/lib/forecastCalculator";
import type { ForecastState } from "../../types";
import { SectionShell } from "./SectionShell";

interface Props {
  state: ForecastState;
  updateState: (updates: Partial<ForecastState>) => void;
}

export function ProvisionedActiveSection({ state, updateState }: Props) {
  const termYears = state.contractTermMonths / 12;
  const [mode, setMode] = useState<"pct" | "abs">("pct");

  const utilByYear = useMemo(() => {
    const arr: number[] = [];
    for (let y = 0; y < termYears; y++) {
      const qStart = y * 4;
      const sliceVals = state.utilizationCurve.values.slice(qStart, qStart + 4);
      const avg =
        sliceVals.length > 0
          ? sliceVals.reduce((s, v) => s + v, 0) / sliceVals.length
          : 75;
      arr.push(Math.round(avg));
    }
    return arr;
  }, [state.utilizationCurve.values, termYears]);

  const setUtilForYear = (yIdx: number, pct: number) => {
    const next = [...state.utilizationCurve.values];
    for (let q = 0; q < 4; q++) {
      const idx = yIdx * 4 + q;
      if (idx < next.length) next[idx] = Math.max(0, Math.min(100, pct));
    }
    updateState({ utilizationCurve: { values: next } });
  };

  const adoptionEndOfYear = (yIdx: number) =>
    computeAdoptionCurve(state.adoptionCurve, (yIdx + 1) * 12);

  const absForYear = (yIdx: number, pct: number) =>
    Math.round(state.provisionedSeats * adoptionEndOfYear(yIdx) * (pct / 100));

  const setAbsForYear = (yIdx: number, count: number) => {
    const denom = state.provisionedSeats * adoptionEndOfYear(yIdx);
    if (denom <= 0) return;
    const pct = Math.max(0, Math.min(100, (count / denom) * 100));
    setUtilForYear(yIdx, pct);
  };

  const previews = useMemo(() => {
    const out: Array<{ year: number; activeUsers: number }> = [];
    for (let y = 1; y <= termYears; y++) {
      const month = y * 12;
      const adoption = computeAdoptionCurve(state.adoptionCurve, month);
      const utilIdx = (y - 1) * 4 + 3;
      const util = (state.utilizationCurve.values[utilIdx] ?? 75) / 100;
      out.push({
        year: y,
        activeUsers: Math.round(state.provisionedSeats * adoption * util),
      });
    }
    return out;
  }, [state.adoptionCurve, state.utilizationCurve.values, state.provisionedSeats, termYears]);

  return (
    <SectionShell
      title="Provisioned vs. Active"
      icon={<Users className="w-4 h-4" />}
      defaultOpen
      testId="section-provisioned-active"
    >
      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
          Provisioned seats
        </Label>
        <FormattedNumberInput
          data-testid="input-provisioned-seats"
          value={state.provisionedSeats || ""}
          onChange={(v) => updateState({ provisionedSeats: v })}
          placeholder="e.g. 1,500"
        />
      </div>

      <div className="space-y-3 pt-2 border-t border-neutral-100">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
            Active utilization
          </Label>
          <div className="inline-flex rounded border border-neutral-200 p-0.5 bg-neutral-50">
            {(["pct", "abs"] as const).map((m) => (
              <button
                key={m}
                type="button"
                data-testid={`btn-util-mode-${m}`}
                onClick={() => setMode(m)}
                className={`px-2 py-0.5 rounded text-[10px] ${
                  mode === m
                    ? "bg-white text-[#1A1A1A] shadow-sm font-semibold"
                    : "text-neutral-500"
                }`}
              >
                {m === "pct" ? "%" : "#"}
              </button>
            ))}
          </div>
        </div>
        {utilByYear.map((pct, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-700">Y{idx + 1}</span>
              {mode === "pct" ? (
                <span className="font-sans font-semibold text-[#1A1A1A]">{pct}%</span>
              ) : (
                <span className="font-sans font-semibold text-[#1A1A1A]">
                  {absForYear(idx, pct).toLocaleString()}
                </span>
              )}
            </div>
            {mode === "pct" ? (
              <Slider
                data-testid={`slider-util-y${idx + 1}`}
                value={[pct]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => setUtilForYear(idx, v[0])}
              />
            ) : (
              <FormattedNumberInput
                data-testid={`input-util-abs-y${idx + 1}`}
                value={absForYear(idx, pct)}
                onChange={(v) => setAbsForYear(idx, v)}
                placeholder="active users"
              />
            )}
          </div>
        ))}
      </div>

      <div className="rounded bg-neutral-50 p-2 space-y-0.5">
        {previews.map((p) => (
          <p
            key={p.year}
            className="text-[11px] text-neutral-600"
            data-testid={`preview-active-y${p.year}`}
          >
            ~<span className="font-sans font-semibold">{p.activeUsers.toLocaleString()}</span>{" "}
            active by end of Y{p.year}
          </p>
        ))}
      </div>
    </SectionShell>
  );
}
