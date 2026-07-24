import AlignStep from "./AlignStep";
import { workforceAlignConfig } from "@/lib/attain/workforceAlign";
import { accessAlignConfig } from "@/lib/attain/accessAlign";
import { edAccessAlignConfig } from "@/lib/attain/edAccessAlign";
import { revenueAlignConfigFor } from "@/lib/attain/revenueAlign";
import { qualityAlignConfigFor } from "@/lib/attain/qualityAlign";
import { capacityAlignConfig } from "@/lib/attain/capacityAlign";
import type { AlignConfig } from "@/lib/attain/alignFramework";
import type { AttainBaseline, LeverValues } from "@/lib/attain/attainLevers";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";

/**
 * The ONE place a goal maps to its Align config. Returns the shared, config
 * driven `AlignStep` config for a goal + setting. Every goal + setting now has
 * one, including ED access (its own ED-flavored config on the same shared
 * AlignStep, mapping onto `computeEdAccessChain`). Kept as a pure helper so
 * both the single-goal Build-the-case page and the stacked multi-goal Align
 * surface resolve a goal's config the exact same way, with no second copy of
 * the routing that could drift.
 */
export function alignConfigFor(goal: GoalId, setting: AttainSetting): AlignConfig | null {
  switch (goal) {
    case "access":
      return setting === "ed" ? edAccessAlignConfig : accessAlignConfig;
    case "revenue":
      return revenueAlignConfigFor(setting);
    case "retention":
      return workforceAlignConfig;
    case "quality":
      return qualityAlignConfigFor(setting);
    case "capacity":
      return capacityAlignConfig;
    default:
      return null;
  }
}

/** True when a goal + setting renders through the shared Align surface (an
 * AlignStep config), i.e. everything except a hypothetical future goal with no
 * config yet, which still falls back to the generic lever ladder on the
 * single-goal page. */
export function hasAlignSurface(goal: GoalId, setting: AttainSetting): boolean {
  return alignConfigFor(goal, setting) !== null;
}

interface AlignSurfaceProps {
  goal: GoalId;
  setting: AttainSetting;
  baseline: AttainBaseline;
  values: LeverValues;
  onChangeValue: (leverId: string, value: number | string[]) => void;
  realizationPct: number;
  crossGoalShareMultiplier: number;
}

/**
 * The Align body for ONE goal, shared by the single-goal Build-the-case page
 * (StepBuildCase) and the stacked multi-goal Align surface
 * (StepMultiBuildCase). Every goal, including ED access, renders the shared,
 * config-driven AlignStep from its own Align config. Neither caller duplicates
 * the AlignStep rendering, so a multi-goal plan's per-goal block is the exact
 * same Align a single-goal plan shows, and the derived number reconciles to
 * `computeAllDriverValues` the same way in both.
 */
export default function AlignSurface({
  goal,
  setting,
  baseline,
  values,
  onChangeValue,
  realizationPct,
  crossGoalShareMultiplier,
}: AlignSurfaceProps) {
  const config = alignConfigFor(goal, setting);
  if (!config) return null;
  return (
    <AlignStep
      config={config}
      setting={setting}
      baseline={baseline}
      values={values}
      onChangeValue={onChangeValue}
      realizationPct={realizationPct}
      crossGoalShareMultiplier={crossGoalShareMultiplier}
    />
  );
}
