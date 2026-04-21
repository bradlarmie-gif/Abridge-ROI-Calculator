import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
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

export function AdoptionGrowthSection({ state, updateState }: Props) {
  const termYears = state.contractTermMonths / 12;
  const growth = state.historicalGrowthMonthly[0] ?? 4;

  const shareByYear = useMemo(() => {
    const out: number[] = [];
    for (let y = 0; y < termYears; y++) {
      const idx = y * 4;
      out.push(Math.round(state.encounterShareCurve.values[idx] ?? 0));
    }
    return out;
  }, [state.encounterShareCurve.values, termYears]);

  const setShareForYear = (yIdx: number, pct: number) => {
    const next = [...state.encounterShareCurve.values];
    for (let q = 0; q < 4; q++) {
      const idx = yIdx * 4 + q;
      if (idx < next.length) next[idx] = pct;
    }
    updateState({ encounterShareCurve: { values: next } });
  };

  const m12 = useMemo(() => {
    const adoption = computeAdoptionCurve(state.adoptionCurve, 12);
    const util = (state.utilizationCurve.values[3] ?? 75) / 100;
    const share = (state.encounterShareCurve.values[3] ?? 60) / 100;
    const monthlyOrg =
      (state.totalOrgEncountersLTM / 12) * Math.pow(1 + growth / 100, 11);
    return {
      activeUsers: Math.round(state.provisionedSeats * adoption * util),
      encounters: Math.round(monthlyOrg * share),
    };
  }, [state, growth]);

  return (
    <SectionShell
      title="Adoption & Growth"
      icon={<TrendingUp className="w-4 h-4" />}
      testId="section-adoption-growth"
    >
      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
          Adoption curve
        </Label>
        <div className="inline-flex rounded-md border border-neutral-200 p-0.5 bg-neutral-50">
          {(["s-curve", "linear"] as const).map((t) => (
            <button
              key={t}
              type="button"
              data-testid={`btn-adoption-${t}`}
              onClick={() => updateState({ adoptionCurve: { ...state.adoptionCurve, type: t } })}
              className={`px-3 py-1 rounded text-xs ${
                state.adoptionCurve.type === t
                  ? "bg-white text-[#1A1A1A] shadow-sm font-semibold"
                  : "text-neutral-500"
              }`}
            >
              {t === "s-curve" ? "S-curve" : "Linear"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-700">Ramp months</span>
          <span className="font-mono font-semibold">{state.adoptionCurve.rampMonths}</span>
        </div>
        <Slider
          data-testid="slider-ramp-months"
          value={[state.adoptionCurve.rampMonths]}
          min={1}
          max={12}
          step={1}
          onValueChange={(v) =>
            updateState({ adoptionCurve: { ...state.adoptionCurve, rampMonths: v[0] } })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-neutral-500">Start %</Label>
          <FormattedNumberInput
            data-testid="input-adoption-start"
            value={state.adoptionCurve.startPct || ""}
            onChange={(v) =>
              updateState({ adoptionCurve: { ...state.adoptionCurve, startPct: v } })
            }
            placeholder="40"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-neutral-500">End %</Label>
          <FormattedNumberInput
            data-testid="input-adoption-end"
            value={state.adoptionCurve.endPct || ""}
            onChange={(v) =>
              updateState({ adoptionCurve: { ...state.adoptionCurve, endPct: v } })
            }
            placeholder="85"
          />
        </div>
      </div>

      <div className="space-y-1 pt-2 border-t border-neutral-100">
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-700">Historical growth (MoM)</span>
          <span className="font-mono font-semibold">{growth.toFixed(1)}%</span>
        </div>
        <Slider
          data-testid="slider-mom-growth"
          value={[growth]}
          min={0}
          max={15}
          step={0.5}
          onValueChange={(v) =>
            updateState({ historicalGrowthMonthly: [v[0]], growthSource: "benchmark" })
          }
        />
      </div>

      <div className="space-y-2 pt-2 border-t border-neutral-100">
        <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
          Abridge encounter share by year (%)
        </Label>
        {shareByYear.map((pct, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-700">Y{idx + 1}</span>
              <span className="font-mono font-semibold">{pct}%</span>
            </div>
            <Slider
              data-testid={`slider-share-y${idx + 1}`}
              value={[pct]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => setShareForYear(idx, v[0])}
            />
          </div>
        ))}
      </div>

      <div className="rounded bg-neutral-50 p-2 text-[11px] text-neutral-600">
        Month 12 projection:{" "}
        <span className="font-mono font-semibold text-[#1A1A1A]">
          {m12.activeUsers.toLocaleString()}
        </span>{" "}
        active users,{" "}
        <span className="font-mono font-semibold text-[#1A1A1A]">
          {m12.encounters.toLocaleString()}
        </span>{" "}
        encounters
      </div>
    </SectionShell>
  );
}
