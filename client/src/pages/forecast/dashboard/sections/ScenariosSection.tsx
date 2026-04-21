import { useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  type ForecastScenario,
  type ForecastState,
  type ForecastStateSnapshot,
} from "../../types";
import { SectionShell } from "./SectionShell";
import { SCENARIO_COLORS } from "../constants";

interface Props {
  state: ForecastState;
  updateState: (updates: Partial<ForecastState>) => void;
  replaceState: (next: ForecastState) => void;
}

const MAX_SCENARIOS = 4;

export function ScenariosSection({ state, updateState, replaceState }: Props) {
  const [name, setName] = useState("");

  const overlayCount = state.scenarios.filter((s) => s.overlayOnChart).length;

  const saveScenario = () => {
    if (!name.trim()) return;
    if (state.scenarios.length >= MAX_SCENARIOS) return;
    const { scenarios: _omit, ...snapshot } = state;
    void _omit;
    const colorIdx = state.scenarios.length % SCENARIO_COLORS.length;
    const next: ForecastScenario = {
      id: `scn-${Date.now().toString(36)}`,
      name: name.trim(),
      snapshot: snapshot as ForecastStateSnapshot,
      createdAt: Date.now(),
      overlayOnChart: false,
      colorIdx,
    };
    updateState({ scenarios: [...state.scenarios, next] });
    setName("");
  };

  const removeScenario = (id: string) => {
    updateState({ scenarios: state.scenarios.filter((s) => s.id !== id) });
  };

  const toggleOverlay = (id: string) => {
    updateState({
      scenarios: state.scenarios.map((s) =>
        s.id === id ? { ...s, overlayOnChart: !s.overlayOnChart } : s,
      ),
    });
  };

  const loadScenario = (s: ForecastScenario) => {
    replaceState({ ...(s.snapshot as ForecastStateSnapshot), scenarios: state.scenarios } as ForecastState);
  };

  const atLimit = state.scenarios.length >= MAX_SCENARIOS;

  return (
    <SectionShell
      title="Scenarios"
      icon={<Bookmark className="w-4 h-4" />}
      testId="section-scenarios"
    >
      <div className="space-y-2">
        <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
          Save current as scenario
        </Label>
        <div className="flex gap-2">
          <Input
            data-testid="input-scenario-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Scenario name"
            disabled={atLimit}
            className="h-8 text-xs"
          />
          <Button
            size="sm"
            data-testid="btn-save-scenario"
            disabled={!name.trim() || atLimit}
            onClick={saveScenario}
          >
            Save
          </Button>
        </div>
        {atLimit && (
          <p className="text-[10px] text-neutral-500">Max 4 scenarios saved.</p>
        )}
      </div>

      {state.scenarios.length > 0 && (
        <>
          {overlayCount > 0 && (
            <div
              data-testid="banner-comparing-scenarios"
              className="rounded bg-[#FBE9E2] text-[#A82200] text-[11px] px-2 py-1.5"
            >
              Comparing {overlayCount} of {MAX_SCENARIOS} scenarios
            </div>
          )}

          <div className="space-y-2">
            {state.scenarios.map((s) => (
              <div
                key={s.id}
                data-testid={`scenario-row-${s.id}`}
                className="flex items-center gap-2 rounded border border-neutral-200 px-2 py-1.5"
              >
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: SCENARIO_COLORS[s.colorIdx] ?? SCENARIO_COLORS[0] }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#1A1A1A] truncate">{s.name}</p>
                  <p className="text-[10px] text-neutral-500">
                    {format(new Date(s.createdAt), "MMM d, h:mm a")}
                  </p>
                </div>
                <label className="flex items-center gap-1 text-[10px] cursor-pointer">
                  <Checkbox
                    checked={s.overlayOnChart}
                    onCheckedChange={() => toggleOverlay(s.id)}
                    data-testid={`checkbox-overlay-${s.id}`}
                  />
                  <span className="hidden md:inline">overlay</span>
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid={`btn-load-scenario-${s.id}`}
                  onClick={() => loadScenario(s)}
                  className="h-6 px-2 text-[10px]"
                >
                  Load
                </Button>
                <button
                  type="button"
                  data-testid={`btn-delete-scenario-${s.id}`}
                  onClick={() => removeScenario(s.id)}
                  aria-label={`Delete scenario ${s.name}`}
                  className="p-1 rounded text-neutral-400 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </SectionShell>
  );
}
