/**
 * Attain — CAPACITY (nursing = OVERTIME) Align config.
 *
 * Five "choose your meaning" questions that map onto the EXISTING nursing
 * capacity decision chain (`computeCapacityChain` in attainCapacity.ts), so the
 * derived number still reconciles to Explore's `nursingOvertime` driver exactly
 * as the single gated ladder (CapacityLadderChain / deriveNursingCapacityLadder)
 * did. No engine/dollar-math changes: the choices simply feed the same
 * `LeverValues` the chain always read (`capacityNurses`, `capacityDocShare`,
 * `capacityConversion`), and the documentation-attributable gate still governs
 * the realized overtime hours avoided.
 *
 *   Q1 Outcome  (cut the overtime cost / nurses finishing on time / both) —
 *      FRAMING. Both run on the same freed documentation time here (one dollar:
 *      overtime hours avoided x the loaded overtime rate), so Q1 aligns the
 *      story, not the number.
 *   Q2 Who      — the population cut. The NURSE COUNT is inherited from Starting
 *      Point (never re-asked); they pick "all units and nurses" or "a focused
 *      unit", with an OPTIONAL nurse number that sharpens the cut. Maps to
 *      capacityNurses.
 *   Q3 Gate (THE HONEST GATE) — why is there overtime. ONLY the documentation
 *      answer lets Abridge move it: it frees the post-shift charting time that
 *      becomes overtime, so it opens the documentation-attributable share
 *      (capacityDocShare). "Short staffing" and "census surges" collapse that
 *      share to 0 — Abridge cannot add nurses or flatten census, so no overtime
 *      comes out and the honest number is zero. The value reflects the limit out
 *      loud.
 *   Q4 Where     (post-shift charting / batching notes during the day / missed
 *      lunches pushing work late) — shapes the documentation-attributable SHARE
 *      of overtime. Each source maps to a conservative doc-attributable percent;
 *      a blank one falls back to a clearly labeled benchmark, never a fabricated
 *      figure. Gated by Q3: if the gate collapsed the share to 0, so does this.
 *   Q5 Proof     (overtime hours per nurse dropping / nurses finishing on time /
 *      the OT dollars in the budget / Love Stories) — the evidence that would
 *      convince them; becomes the Plan's signals. FRAMING here.
 *
 * The "make sure the freed time equals leaving on time, not more tasks"
 * COMMITMENT (owner, protected relief) belongs to the Plan, not Align — so
 * Align sets a sensible, conservative conversion (the share of the
 * documentation-attributable overtime actually removed) and leaves the
 * commitment to the Plan step, unchanged for now.
 *
 * Overtime hours per nurse per week and the loaded overtime rate are FACTS, not
 * meaning-choices: they are NOT re-asked here (Starting Point does not collect
 * them). They fall back to this chain's own conservative benchmarks (1 OT
 * hr/nurse/wk, $75/hr loaded), shown with a visible "Benchmark" tag in the
 * proof so they are never mistaken for the partner's own numbers.
 *
 * NO DOUBLE-COUNT WITH RETENTION: overtime avoided is wages you stop paying now;
 * retention is the replacement cost of a nurse who would have quit. Different
 * dollars, same root of less after-hours charting. The proof states this
 * plainly (see `NURSING_CAPACITY_NO_DOUBLE_COUNT`).
 */

import {
  computeCapacityChain,
  otHoursPerNurseWeekFor,
  otHourlyRateFor,
  NURSING_CAPACITY_NO_DOUBLE_COUNT,
} from "./attainCapacity";
import { realizedValue, formulaWithRealization, type AttainBaseline, type LeverValues } from "./attainLevers";
import {
  firstSelected,
  sharpenerNumber,
  type AlignConfig,
  type AlignContext,
  type AlignProof,
  type AlignProofFigure,
} from "./alignFramework";

// ── Conservative choice -> value maps (exported so the tests assert them) ───

/** Q3 honest gate -> a MULTIPLIER on the documentation-attributable share. ONLY
 * the documentation answer lets Abridge open a share of the overtime; short
 * staffing and census surges cannot be solved by freeing charting time, so
 * their multiplier is 0 and the whole number collapses to zero. */
export const CAPACITY_GATE_DOC_MULT: Record<string, number> = {
  documentation: 1,
  staffing: 0,
  census: 0,
};

/** Q4 where -> the documentation-attributable share of overtime (0-100), the
 * ceiling on what charting can move. Post-shift charting is the most direct
 * overtime the record drives, so it opens the largest defensible share;
 * batching and missed lunches open smaller ones. Conservative by construction;
 * every share stays well under a full 100% claim. */
export const CAPACITY_WHERE_DOC_SHARE_PCT: Record<string, number> = {
  postshift: 60,
  batching: 50,
  lunches: 40,
};

/** The conservative share of the documentation-attributable overtime this plan
 * actually removes once the freed minute lands on the shift. A sensible Align
 * STARTER; the real commitment (protect the relief so freed time equals leaving
 * on time, not more tasks) is aligned on the Plan step, not here. */
export const CAPACITY_ALIGN_CONVERSION_PCT = 50;

// ── Local formatting (kept self-contained, same convention as attainCapacity) ─

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}
function fmtHours(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString();
}

function totalNursesFor(baseline: AttainBaseline): number {
  return Math.max(0, Math.round(baseline.nursingFtes ?? 0));
}

// ── Store keys (extra LeverValues keys, ignored by the engine, round-trip
//    through the existing per-goal persistence) ─────────────────────────────

const K_OUTCOME = "capacityAlignOutcome";
const K_WHO = "capacityAlignWho";
const K_WHO_COUNT = "capacityAlignWhoCount";
const K_GATE = "capacityAlignGate";
const K_WHERE = "capacityAlignWhere";
const K_PROOF = "capacityAlignProof";

// ── The choice -> engine mapping (the one source of truth for the number) ───

/** Resolves the nurse count in scope from Q2, inheriting the Starting-point
 * FTE count and never fabricating one. */
function nursesFromWho(values: LeverValues, baseline: AttainBaseline): { nurses: number; who?: string } {
  const total = totalNursesFor(baseline);
  const who = firstSelected(values, K_WHO);
  if (who === "all") {
    return { nurses: total, who };
  }
  if (who === "focused") {
    const whoCount = sharpenerNumber(values, K_WHO_COUNT);
    if (whoCount > 0) {
      return { nurses: total > 0 ? Math.min(whoCount, total) : whoCount, who };
    }
    // Blank -> a clearly labeled benchmark: about half the nurses.
    return { nurses: total > 0 ? Math.round(total / 2) : 0, who };
  }
  return { nurses: 0, who };
}

export function capacityAlignToLeverValues(values: LeverValues, ctx: AlignContext): LeverValues {
  const { baseline } = ctx;
  const { nurses } = nursesFromWho(values, baseline);

  const gate = firstSelected(values, K_GATE);
  const gateMult = gate ? (CAPACITY_GATE_DOC_MULT[gate] ?? 0) : 0;

  // The "where" is a required CHOICE (like Access's demand), not an optional
  // number: it names the specific documentation pain, and its magnitude is the
  // documentation-attributable share. Blank until chosen -> a 0 share -> the
  // number stays honestly at zero until the meaning is set.
  const where = firstSelected(values, K_WHERE);
  const whereShare = where ? (CAPACITY_WHERE_DOC_SHARE_PCT[where] ?? 0) : 0;

  // The documentation-attributable share is the "where" magnitude, gated by the
  // honest "why": short staffing or census collapse the multiplier to 0, so the
  // ceiling (and the whole number) collapses to zero.
  const capacityDocShare = gateMult === 0 ? 0 : whereShare;
  // The conservative share actually removed. Zeroed too when the gate collapses
  // or no where is chosen yet, so a plan never carries a stray conversion.
  const capacityConversion = capacityDocShare > 0 ? CAPACITY_ALIGN_CONVERSION_PCT : 0;

  return {
    // Align does not split by unit line; "who" covers the scope. Kept empty so
    // the chain prices the whole in-scope nurse count at one benchmark rate.
    capacityLines: [],
    capacityNurses: nurses,
    capacityDocShare,
    capacityConversion,
  };
}

// ── The derived proof ───────────────────────────────────────────────────────

export function deriveCapacityAlignProof(values: LeverValues, ctx: AlignContext): AlignProof {
  const { baseline, realizationPct } = ctx;
  const engine = capacityAlignToLeverValues(values, ctx);
  const merged: LeverValues = { ...values, ...engine };
  const chain = computeCapacityChain(baseline, merged);

  const who = firstSelected(values, K_WHO);
  const whoCount = sharpenerNumber(values, K_WHO_COUNT);
  const gate = firstSelected(values, K_GATE);
  const where = firstSelected(values, K_WHERE);

  const realized = realizedValue(chain.prize, realizationPct);
  const ready = chain.prize > 0;

  // Nurses tag: inherited when "all", a labeled benchmark when a focused cut was
  // chosen without a number, otherwise the partner's own sharpened number.
  const nursesTag: AlignProofFigure["tag"] =
    who === "all" ? "inherited" : who === "focused" && whoCount <= 0 ? "benchmark" : undefined;

  const figures: AlignProofFigure[] = [
    {
      label: "In scope",
      value: `${fmtInt(chain.scope.nursesInScope)} nurses`,
      tag: nursesTag,
    },
    {
      label: "OT / nurse / wk",
      value: `${fmtHours(chain.otHoursPerNurseWeek)} hrs`,
      tag: "benchmark",
    },
    {
      label: "Overtime rate",
      value: `$${fmtInt(chain.otHourlyRate)}/hr`,
      tag: "benchmark",
    },
    {
      label: "Overtime avoided",
      value: `${fmtInt(chain.realizedOtHoursAvoided)} hrs / yr`,
    },
  ];

  const math = ready
    ? formulaWithRealization(chain.formulas.payoff, realizationPct, realized)
    : "The number appears once you set who this is for, why the overtime is there, and where it shows up.";

  const emptyHint = !who
    ? "Pick who this is for to start the number."
    : !gate
      ? "Say why the overtime is there, so we size only what Abridge can honestly move."
      : gate === "staffing"
        ? "You told us the overtime is short staffing. Abridge frees documentation time, but it cannot add nurses, so no overtime comes out. The honest number here is zero."
        : gate === "census"
          ? "You told us the overtime is census surges. Abridge frees documentation time, but it cannot flatten census, so no overtime comes out. The honest number here is zero."
          : !where
            ? "Say where the overtime shows up, so the share charting causes is real."
            : "Set your choices above and the number falls out here.";

  const headlineSub = ready
    ? `about ${fmtInt(chain.realizedOtHoursAvoided)} overtime hours a year off your team, at a ${Math.round(chain.docAttributableSharePct)}% documentation-attributable ceiling`
    : "the proof of what you just aligned on";

  return {
    ready,
    headlineLabel: "What cutting the overtime is worth",
    headlineValue: realized,
    headlineSub,
    emptyHint,
    figures,
    math,
    // The no-double-count discipline, stated plainly beneath the number: overtime
    // wages now versus a future replacement cost, different dollars, same root.
    footnote: NURSING_CAPACITY_NO_DOUBLE_COUNT,
  };
}

// ── The config the AlignStep renders ────────────────────────────────────────

export const capacityAlignConfig: AlignConfig = {
  goal: "capacity",
  eyebrow: "Align on what you mean",
  intro:
    "Answer these together, one at a time. Choose the meaning that fits; the figure at the end is the proof of what you aligned on, not the goal.",
  questions: [
    {
      id: "outcome",
      storeKey: K_OUTCOME,
      prompt: "What are you really after?",
      helper: "Both run on the same freed time here, so this just sets how we tell the story.",
      mode: "single",
      options: [
        { id: "cost", label: "Cut the overtime cost", helper: "Take the overtime dollars out of the nursing budget." },
        { id: "ontime", label: "Nurses finishing on time", helper: "The same shift, closing on time instead of running late." },
        { id: "both", label: "Both", helper: "Lower overtime cost and nurses leaving on time together." },
      ],
    },
    {
      id: "who",
      storeKey: K_WHO,
      prompt: "Who is this for?",
      helper: "We carry your nurse count over from your starting point, so you only pick the cut.",
      mode: "single",
      options: [
        {
          id: "all",
          label: "All units and nurses",
          helper: "Everyone on your starting-point count, not broken out by a specific unit.",
          dynamicHelper: (ctx) => {
            const total = totalNursesFor(ctx.baseline);
            return total > 0
              ? `All ${fmtInt(total)} nurses on your starting-point count, not broken out by a specific unit.`
              : "Everyone on your starting-point count, not broken out by a specific unit.";
          },
        },
        {
          id: "focused",
          label: "A focused unit",
          helper: "A specific unit or group you want to bring overtime down on first.",
          sharpener: {
            storeKey: K_WHO_COUNT,
            label: "Roughly how many nurses? (optional)",
            unit: "nurses",
            placeholder: "e.g., 40",
            benchmarkNote: "Leave this blank and we use a conservative benchmark: about half your nurses.",
            decimal: false,
          },
        },
      ],
    },
    {
      id: "gate",
      storeKey: K_GATE,
      prompt: "Why is there overtime?",
      helper: "This is the honest gate. Abridge frees the documentation time nurses spend charting after the shift. It cannot add nurses or flatten census, so we only count the overtime charting causes.",
      mode: "single",
      options: [
        {
          id: "documentation",
          label: "Documentation and post-shift charting",
          helper: "Nurses finish the shift, then stay to chart. This is the load Abridge frees.",
        },
        {
          id: "staffing",
          label: "Short staffing",
          helper: "There are not enough nurses for the work. Freeing time cannot add bodies, so we say so.",
        },
        {
          id: "census",
          label: "Census surges",
          helper: "The unit swings above what it is staffed for. Abridge cannot flatten census, so this stays out of the number.",
        },
      ],
    },
    {
      id: "where",
      storeKey: K_WHERE,
      prompt: "Where does the overtime show up?",
      helper: "This shapes how much of your overtime charting actually drives, the share that is yours to cut.",
      mode: "single",
      options: [
        { id: "postshift", label: "Post-shift charting", helper: "Charting after the shift ends, the most direct overtime the record drives." },
        { id: "batching", label: "Batching notes during the day", helper: "Notes pile up and get caught up later, pushing work past shift end." },
        { id: "lunches", label: "Missed lunches pushing work late", helper: "Breaks get skipped, and the work slides to the end of the shift." },
      ],
    },
    {
      id: "proof",
      storeKey: K_PROOF,
      prompt: "What proof would convince you it worked?",
      helper: "Pick any that matter. These become the signals your plan tracks.",
      mode: "multi",
      options: [
        { id: "othours", label: "Overtime hours per nurse dropping", helper: "Overtime per nurse trending down against this baseline." },
        { id: "ontime", label: "Nurses finishing on time", helper: "Shifts closing on time, the on-time completion rate improving." },
        { id: "budget", label: "The overtime dollars in the budget", helper: "The overtime line in the nursing budget coming down." },
        { id: "lovestories", label: "Love Stories", helper: "Nurses telling you the shift got better in their own words." },
      ],
    },
  ],
  toLeverValues: capacityAlignToLeverValues,
  deriveProof: deriveCapacityAlignProof,
};

// Re-exported so a consumer can pull the fact-fallback helpers alongside the
// config without reaching into attainCapacity directly.
export { otHoursPerNurseWeekFor, otHourlyRateFor };
