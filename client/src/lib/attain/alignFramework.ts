/**
 * Attain — the shared ALIGN framework (data layer).
 *
 * Align replaces the slider/toggle ladder UI on the old "Build the case" step
 * with a small set of "choose your meaning" questions. The step-down ENGINE
 * underneath is UNCHANGED: each driver's Align config maps the partner's
 * CHOICES (plus optional number sharpeners and the facts inherited from
 * Starting Point) onto the exact same `LeverValues` the engine already reads,
 * so the derived number still reconciles to `computeAllDriverValues`.
 *
 * The philosophy (see docs/superpowers/plans/2026-07-22-align-stage-framework.md):
 * Align is about SHARED UNDERSTANDING of what the partner means. The choice is
 * what matters (that is the alignment); a number only SHARPENS the derived
 * figure. A blank number falls back to a clearly labeled benchmark, never a
 * fabricated-precise value.
 *
 * This file is pure data/logic (no JSX) so the choice -> engine mapping is
 * unit-testable in isolation. `AlignStep.tsx` / `ChooseQuestion.tsx` render a
 * config; `workforceAlign.ts` is the first (exemplar) config. Every other
 * driver keeps its current ladder until it is cloned onto this framework.
 */

import type { GoalId, AttainSetting } from "./attainTypes";
import type { AttainBaseline, LeverValues } from "./attainLevers";

export type AlignSelectMode = "single" | "multi";

/** Everything a config's `toLeverValues` / `deriveProof` needs beyond the raw
 * selections: the inherited facts (baseline), the setting, and the two
 * cross-cutting scalers Build-the-case already threads into every chain. */
export interface AlignContext {
  baseline: AttainBaseline;
  setting: AttainSetting;
  /** This priority's realization/attribution rate, 0-100 (side-panel control). */
  realizationPct: number;
  /** The access/retention shared-freed-hour split multiplier, 0-1. 1 when this
   * driver does not contend for the shared hour. */
  crossGoalShareMultiplier: number;
}

/** An OPTIONAL number that hangs off a chosen option and sharpens the derived
 * figure. Blank -> the benchmark note is shown and the config fills a
 * conservative benchmark instead (never a fabricated-precise number). */
export interface AlignSharpener {
  /** The `LeverValues` key this raw number is stored under (0 = blank). Kept
   * separate from the engine lever it influences so "blank" survives reload. */
  storeKey: string;
  label: string;
  unit?: string;
  prefix?: string;
  placeholder?: string;
  /** Shown under the input while it is blank, so a benchmark is never mistaken
   * for the partner's own number. */
  benchmarkNote: string;
  max?: number;
  decimal?: boolean;
}

export interface AlignOption {
  id: string;
  label: string;
  /** One-line plain helper. */
  helper: string;
  /** Optional context-aware helper (e.g. "All 40 on your starting-point
   * count") that overrides `helper` when the facts are known. */
  dynamicHelper?: (ctx: AlignContext) => string;
  sharpener?: AlignSharpener;
}

export interface AlignQuestion {
  id: string;
  /** The `LeverValues` key this question's selection (an option-id list) is
   * stored under, so it rides the existing per-goal persistence with no new
   * plumbing. */
  storeKey: string;
  prompt: string;
  helper?: string;
  mode: AlignSelectMode;
  options: AlignOption[];
  /** MULTI-SELECT STACKING scaffold: when set, this question repeats once per
   * chosen option of the question with this id (per-path/per-event drivers use
   * it; Workforce does not stack, so it is left undefined here). */
  stacksOnQuestionId?: string;
  /** For a stacked question that is only relevant to SOME of the parent's
   * chosen options (e.g. the E/M "who" question only belongs in the E/M
   * section, not HCC or Denials). Undefined -> the question renders once for
   * EVERY chosen parent option (the original stacking behaviour). Non-stacking
   * questions ignore this. */
  appliesToChoices?: string[];
  /** The displayed question number (the CONCEPTUAL dimension, 1-5). Multiple
   * per-path questions can share a dimension (every path's "who" is dimension
   * 2). Falls back to the question's own position when unset, so Workforce /
   * Access keep numbering by position exactly as before. */
  dimension?: number;
}

export interface AlignProofFigure {
  label: string;
  value: string;
  /** "benchmark" = an industry/typical number, not the partner's own;
   * "inherited" = carried in from Starting Point. Rendered as a small tag so a
   * benchmark is never mistaken for a derived partner figure. */
  tag?: "benchmark" | "inherited";
}

/** The derived-number PROOF the Align step shows: the figure that falls out of
 * the choices + inherited facts, benchmark-labeled where a number is missing. */
export interface AlignProof {
  ready: boolean;
  headlineLabel: string;
  /** The realized dollar, for the count-up. 0 until the choices produce one.
   * For the safety-first Quality driver this is a COUNT (harm events prevented)
   * rather than a dollar, formatted by `headlineFormatter`. */
  headlineValue: number;
  /** How the count-up hero renders `headlineValue`. Defaults to a compact
   * money format, so every financial driver is unchanged; Quality overrides it
   * with a plain count so its hero is events prevented, not a dollar. */
  headlineFormatter?: (n: number) => string;
  headlineSub: string;
  emptyHint: string;
  figures: AlignProofFigure[];
  /** The one live derivation line ("THE MATH"). */
  math: string;
  /** An optional, always-shown honesty note under the math (e.g. capacity's
   * no-double-count-with-retention line). Additive: configs that do not set it
   * render exactly as before. */
  footnote?: string;
}

export interface AlignConfig {
  goal: GoalId;
  eyebrow: string;
  intro: string;
  questions: AlignQuestion[];
  /** The count shown as "Question N of M". Falls back to `questions.length`,
   * so a non-stacking config (Workforce / Access) is unchanged. Multi-path
   * drivers set this to the number of CONCEPTUAL dimensions (5), since the
   * per-path questions repeat dimensions rather than adding new ones. */
  dimensionTotal?: number;
  /** The ONLY choice -> engine mapping. Reads the selection/sharpener keys out
   * of `values` and returns the engine `LeverValues` to MERGE over them, so the
   * derived number stays reconciled to `computeAllDriverValues`. Conservative
   * by construction; the optional number overrides the benchmark. */
  toLeverValues: (values: LeverValues, ctx: AlignContext) => LeverValues;
  /** Derives the proof display from the current values + facts. */
  deriveProof: (values: LeverValues, ctx: AlignContext) => AlignProof;
}

// ── Shared selection helpers (used by the component and the configs) ────────

export function asStringArray(raw: number | string[] | undefined): string[] {
  return Array.isArray(raw) ? raw : [];
}

/** The first (and, for single-select, only) chosen option id, or undefined. */
export function firstSelected(values: LeverValues, storeKey: string): string | undefined {
  return asStringArray(values[storeKey])[0];
}

export function selectedOptionIds(values: LeverValues, storeKey: string): string[] {
  return asStringArray(values[storeKey]);
}

export function sharpenerNumber(values: LeverValues, storeKey: string): number {
  const raw = values[storeKey];
  return typeof raw === "number" ? raw : 0;
}
