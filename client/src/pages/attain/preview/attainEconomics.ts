/**
 * THROWAWAY. Per-category economics config for the Align "economics" beat.
 * Each cell that has a model shows its own real-money FIELDS (blank, required — theirs)
 * plus a small ASSUMPTIONS panel (seeded, visible, editable — never hidden). The number
 * then assembles from the partner's inputs via attainEngineAdapter. Numbers are Brad's
 * domain calls, confirmed 2026-07-24.
 */

import { fmt$ } from "@/lib/attain/attainFormat";
const nn = (n: number) => Math.round(n).toLocaleString();

export type EconField = {
  key: string; // matches the key attainEngineAdapter reads
  label: string;
  prefix?: string;
  suffix?: string;
  placeholder: string;
  hint?: string;
  lever?: string; // when the model is multi-lever, which lever this field belongs to
};

// A seeded assumption: same as a field but pre-filled with a conservative default, editable.
export type Assumption = { key: string; label: string; default: string; prefix?: string; suffix?: string; lever?: string };

// A lever is one priced path within a category. A lever turns on one of two ways:
//  - payerOptionIds: a frame answer (the payer mix) selects it — Outpatient, payer-driven.
//  - outcomeIds: one of the picked goals selects it — ED / Inpatient, goal-driven (no payer frame).
// A lever names the engine driver keys its dollar rolls up from either way.
export type EconLever = {
  id: string;
  label: string;
  payerOptionIds?: string[]; // frame-choice option ids that activate this lever (payer-driven)
  outcomeIds?: string[]; // picked-goal ids that activate this lever (goal-driven)
  driverKeys: string[]; // engine driver keys this lever's value sums
};

export type EconInputs = { scope: number; econ: Record<string, number>; stancePct: number };

export type EconModel = {
  title: string;
  helper: string;
  fields: EconField[]; // real-money levers, blank + required
  assumptions?: Assumption[]; // seeded, shown + editable in the Assumptions panel
  levers?: EconLever[]; // present only for multi-lever categories (e.g. Outpatient Revenue)
  stancePrompt: string;
  stanceBands: number[];
  stanceCap: number;
  capNote: string;
  // activeLevers is passed for multi-lever models so the through-line names only the live levers.
  math: (i: EconInputs, activeLevers?: string[]) => string;
};

// NOTE: Provider/Nurse Retention has NO economics model on purpose. Retention is a PROOF-ONLY
// category (see AttainCell.proofOnly): the cost-of-a-provider claim was a stretch, so it's pulled
// entirely — no replacement-cost input, no prevent-share stance, no dollar. With no entry here,
// econModel() returns undefined for retention, so the Align economics beat + stance never render
// and engineValueInPlay() returns 0. The wellbeing story is tracked as proof, never dollarized.

export const ECON_MODELS: Record<string, EconModel> = {
  // ---- Outpatient ----
  "Outpatient|Patient Access": {
    title: "What's a visit worth to you?",
    helper: "This is where you set the dollar. Set the margin you actually keep on a visit, and how much of the freed-up headroom you expect to fill. Minutes saved per note we seed conservatively, then watch on Progress.",
    fields: [{ key: "perVisit", label: "Margin per visit", prefix: "$", placeholder: "200", hint: "The contribution margin you keep, not gross charges." }],
    assumptions: [
      { key: "minSaved", label: "Minutes saved per note", default: "2", suffix: "min" },
      { key: "visitMin", label: "Minutes per visit", default: "30", suffix: "min" },
    ],
    stancePrompt: "How much of the freed headroom do you expect to fill?",
    stanceBands: [15, 25, 35],
    stanceCap: 75,
    capNote: "We cap this at 75 percent. You can never fill all the headroom, and a number that pretends you can will not survive a CFO.",
    math: (i) => `${nn(i.scope)} providers × freed-time headroom × ${i.stancePct}% filled × ${fmt$(i.econ.perVisit)} margin/visit. Minutes saved is seeded here, then measured on Progress.`,
  },
  // Outpatient|Provider Retention — intentionally omitted (proof-only, no dollar).
  "Outpatient|Revenue Capture": {
    title: "How much of the revenue do you keep?",
    helper: "The payers you picked above set what gets priced. Fee-for-service pays on the visit level, so the money is the coding lift a more complete note supports. Risk contracts pay on the conditions you capture, so the money is the recapture a fuller note makes possible. Fill in the levers in play; how much of the lift you actually capture and keep is yours to set below. The size of each lift we seed conservatively.",
    fields: [
      { key: "wrvu", lever: "ffs", label: "Average wRVU per visit", placeholder: "1.5", hint: "Your current level, before any lift." },
      { key: "cf", lever: "ffs", label: "Conversion factor", prefix: "$", placeholder: "33.40", hint: "Dollars per wRVU." },
      { key: "hccValue", lever: "risk", label: "Value per recaptured condition", prefix: "$", placeholder: "1,500", hint: "The annual risk revenue one recaptured condition carries." },
    ],
    assumptions: [
      { key: "uplift", lever: "ffs", label: "Coding lift from better notes", default: "5", suffix: "%" },
      { key: "hccPerPatient", lever: "risk", label: "Conditions recaptured per risk patient", default: "0.6" },
      { key: "riskPatients", lever: "risk", label: "Risk-contract patients in scope", default: "6,000" },
    ],
    levers: [
      { id: "ffs", label: "Fee-for-service coding", payerOptionIds: ["ffs"], driverKeys: ["wrvu"] },
      { id: "risk", label: "Risk and value-based recapture", payerOptionIds: ["ma", "medicaid", "aca"], driverKeys: ["hccCapture"] },
    ],
    stancePrompt: "How much of the documentation-driven lift do you capture and keep?",
    stanceBands: [65, 75, 85],
    stanceCap: 95,
    capNote: "We cap this at 95 percent. A captured, defensible level is real money, but not every lift survives billing and audit.",
    math: (i, active = ["ffs", "risk"]) => {
      const parts: string[] = [];
      if (active.includes("ffs"))
        parts.push(`Fee-for-service: your visits × ${i.econ.wrvu ?? 1.5} wRVU × ~${i.econ.uplift ?? 5}% documentation lift × ${fmt$(i.econ.cf ?? 33.4)}/wRVU × ${i.stancePct}% captured and kept`);
      if (active.includes("risk"))
        parts.push(`Risk recapture: ${nn(i.econ.riskPatients ?? 6000)} risk-contract patients × ${i.econ.hccPerPatient ?? 0.6} conditions recaptured each × $${nn(i.econ.hccValue ?? 1500)}/condition × ${i.stancePct}% that survives audit`);
      if (!parts.length) return "";
      return parts.join(". ") + (parts.length > 1 ? ". The two sum to the number above." : ".");
    },
  },

  // ---- ED ----
  "ED|Patient Access": {
    title: "What's the throughput worth?",
    helper: "A faster, better-documented visit can help fewer patients leave without being seen, and can make more admissions capturable when the front end moves. Set what those are worth to you, and how much of the throughput gain you expect to realize.",
    fields: [
      { key: "edVisit", label: "Margin per ED visit", prefix: "$", placeholder: "480", hint: "The contribution margin you keep on a treated visit." },
      { key: "admitMargin", label: "Margin per admission", prefix: "$", placeholder: "4,000", hint: "What a captured admission is worth to you." },
    ],
    assumptions: [
      { key: "lwbsRate", label: "Current left-without-being-seen rate", default: "3", suffix: "%" },
      { key: "admitRate", label: "Admission rate", default: "18", suffix: "%" },
    ],
    stancePrompt: "How much of the throughput gain do you expect to realize?",
    stanceBands: [15, 25, 35],
    stanceCap: 60,
    capNote: "We cap this at 60 percent. Throughput has many bottlenecks; documentation moves only its share.",
    math: (i) => `Fewer left-without-being-seen and captured admissions across your ED volume × ${i.stancePct}% realized, at ${fmt$(i.econ.edVisit)}/visit and ${fmt$(i.econ.admitMargin)}/admission.`,
  },
  // ED|Provider Retention — intentionally omitted (proof-only, no dollar).
  "ED|Revenue Capture": {
    title: "How much of the revenue do you keep?",
    helper: "The goals you picked above set what gets priced. Getting paid for the acuity sizes on how the visit codes; preventable denials size on the claims a complete note would have saved. Fill in the levers in play; how much of the lift you capture and keep is yours to set below. The size of each lift we seed conservatively.",
    fields: [
      { key: "wrvu", lever: "edcoding", label: "Average wRVU per ED visit", placeholder: "1.5", hint: "Your current level, before any lift." },
      { key: "cf", lever: "edcoding", label: "Conversion factor", prefix: "$", placeholder: "33.40", hint: "Dollars per wRVU." },
      { key: "avgClaim", lever: "eddenials", label: "Average claim value", prefix: "$", placeholder: "250", hint: "The revenue on a claim you would otherwise write off." },
    ],
    assumptions: [
      { key: "uplift", lever: "edcoding", label: "E&M lift from better notes", default: "3", suffix: "%" },
      { key: "denialRate", lever: "eddenials", label: "Medical-necessity denial rate", default: "5", suffix: "%" },
    ],
    // Goal-driven, but activated by the mechanism the user picks in the stage:"frame" question,
    // so the lever ids match the frame option ids AND the discovery population showIf ids.
    levers: [
      { id: "edcoding", label: "Acuity coding", payerOptionIds: ["edcoding"], driverKeys: ["edEmLevel"] },
      { id: "eddenials", label: "Preventable denials", payerOptionIds: ["eddenials"], driverKeys: ["denialPrevention"] },
    ],
    stancePrompt: "How much of the documentation-driven lift do you capture and keep?",
    stanceBands: [65, 75, 85],
    stanceCap: 95,
    capNote: "We cap this at 95 percent. A defensible E&M level is real money, but not every lift survives billing and audit.",
    math: (i, active = ["edcoding", "eddenials"]) => {
      const parts: string[] = [];
      if (active.includes("edcoding"))
        parts.push(`Acuity coding: your ED visits × ${i.econ.wrvu ?? 1.5} wRVU × ~${i.econ.uplift ?? 3}% E&M lift × ${fmt$(i.econ.cf ?? 33.4)}/wRVU × ${i.stancePct}% captured and kept`);
      if (active.includes("eddenials"))
        parts.push(`Preventable denials: your ED claims × ${i.econ.denialRate ?? 5}% medical-necessity denial rate × ${fmt$(i.econ.avgClaim ?? 250)}/claim × ${i.stancePct}% a complete note prevents`);
      if (!parts.length) return "";
      return parts.join(". ") + (parts.length > 1 ? ". The two sum to the number above." : ".");
    },
  },

  // ---- Inpatient ----
  "Inpatient|Revenue Capture": {
    title: "How much of the coding do you keep?",
    helper: "The goals you picked above set what gets priced. Each is a different place the documentation carries the pay: the DRG weight the acuity earns, the CDI queries a complete note would head off, and inpatient status held against a downgrade. Fill in the levers in play; how much survives audit is yours to set below. The size of each lift we seed conservatively.",
    fields: [
      { key: "drgBase", lever: "drg", label: "Average DRG base payment", prefix: "$", placeholder: "6,000", hint: "Your blended base rate per discharge." },
      { key: "cdiCost", lever: "cdi", label: "Cost per CDI query", prefix: "$", placeholder: "90", hint: "The loaded cost of one query cycle, coder and physician time." },
      { key: "obsDelta", lever: "obs", label: "Revenue delta per defended stay", prefix: "$", placeholder: "4,000", hint: "Inpatient minus observation payment on one stay held." },
    ],
    assumptions: [
      { key: "weightInc", lever: "drg", label: "CMI lift (avg DRG weight gained across discharges)", default: "0.03" },
      { key: "attribution", lever: "drg", label: "Share attributed to Abridge (vs CDI team)", default: "65", suffix: "%" },
      { key: "cdiQueries", lever: "cdi", label: "CDI queries a complete note would avoid per year", default: "1,500" },
      { key: "obsRate", lever: "obs", label: "Stays downgraded to observation", default: "5", suffix: "%" },
    ],
    // Activated by the mechanism the user picks in the stage:"frame" question, so the lever ids
    // match the frame option ids AND the discovery population showIf ids (drg / cdi / obs).
    levers: [
      { id: "drg", label: "DRG weight", payerOptionIds: ["drg"], driverKeys: ["drgAccuracy"] },
      { id: "cdi", label: "CDI query reduction", payerOptionIds: ["cdi"], driverKeys: ["ipCdiValue"] },
      { id: "obs", label: "Inpatient status defense", payerOptionIds: ["obs"], driverKeys: ["obsDefense"] },
    ],
    stancePrompt: "How much of the documentation-driven lift survives audit?",
    stanceBands: [55, 65, 75],
    stanceCap: 85,
    capNote: "We cap this at 85 percent, below outpatient coding. Inpatient carries the most audit and RADV exposure, so we stay the most conservative here.",
    math: (i, active = ["drg", "cdi", "obs"]) => {
      const parts: string[] = [];
      if (active.includes("drg"))
        parts.push(`DRG weight: your discharges × ${i.econ.weightInc ?? 0.03} CMI lift × ${i.econ.attribution ?? 65}% attributed to Abridge × ${i.stancePct}% that survives audit, at ${fmt$(i.econ.drgBase ?? 6000)}/DRG`);
      if (active.includes("cdi"))
        parts.push(`CDI queries: ${nn(i.econ.cdiQueries ?? 1500)} queries a complete note would avoid × ${fmt$(i.econ.cdiCost ?? 90)}/query × ${i.stancePct}% you realize`);
      if (active.includes("obs"))
        parts.push(`Status defense: your admissions × ${i.econ.obsRate ?? 5}% downgraded to observation × ${fmt$(i.econ.obsDelta ?? 4000)}/stay recovered × ${i.stancePct}% the note can defend`);
      if (!parts.length) return "";
      return parts.join(". ") + (parts.length > 1 ? ". They sum to the number above." : ".");
    },
  },
  // Inpatient|Provider Retention — intentionally omitted (proof-only, no dollar).
  "Inpatient|Inpatient Capacity": {
    title: "What's an earlier bed turn worth?",
    helper: "When the discharge documentation is ready on time, the order and summary land earlier and the bed opens before noon instead of after. Set what turning a bed earlier in the day is worth to you. Most discharge delay is placement, consults, and authorization, not the note, so we stay conservative: this is an earlier bed turn, never a shorter length of stay.",
    fields: [{ key: "bedTurnValue", label: "Value of an earlier bed turn", prefix: "$", placeholder: "300", hint: "The marginal contribution of freeing a bed earlier in the day, not a full bed-day and not a shorter stay." }],
    assumptions: [{ key: "dischargeDocShare", label: "Discharges where the note is the gate", default: "8", suffix: "%" }],
    stancePrompt: "How much of the documentation-gated before-noon miss can you actually move?",
    stanceBands: [15, 25, 35],
    stanceCap: 50,
    capNote: "We cap this at 50 percent. Most discharge delay is placement, consults, and authorization; documentation readiness moves only its share, and never the length of stay itself.",
    math: (i) => `Across your ${nn(i.scope)} hospitalists: discharges × ${i.econ.dischargeDocShare ?? 8}% where the note is the gate × ${i.stancePct}% you can move, at ${fmt$(i.econ.bedTurnValue ?? 300)} per earlier bed turn.`,
  },

  // ---- Nursing ----
  "Nursing|Quality & Safety": {
    title: "How much harm do you expect to prevent?",
    helper: "The note surfaces early deterioration sooner: pressure injuries, falls, CLABSI, and sepsis caught before they progress. Your current event rates are yours to set in the assumptions; event costs we seed from published figures. How much of the preventable harm you actually prevent is yours to set below.",
    fields: [],
    assumptions: [
      { key: "fallsRate", label: "Falls per 1,000 patient-days", default: "3.4" },
      { key: "hapiRate", label: "Pressure injury rate", default: "2.1", suffix: "%" },
      { key: "clabsiRate", label: "CLABSI per 1,000 line-days", default: "1.0" },
      { key: "sepsisRate", label: "Sepsis cases per 1,000", default: "2.0" },
    ],
    stancePrompt: "How much of the preventable harm do you expect to prevent?",
    stanceBands: [10, 20, 30],
    stanceCap: 40,
    capNote: "We cap this at 40 percent. Prevention is hard-won, and only some harm is documentation-preventable.",
    math: (i) => `Preventable falls, pressure injuries, CLABSI and sepsis across ${nn(i.scope)} beds × ${i.stancePct}% prevented, at your rates and seeded cost per event.`,
  },
  // Nursing|Provider Retention — intentionally omitted (proof-only, no dollar).
  "Nursing|Nursing Capacity": {
    title: "What's the overtime worth back?",
    helper: "Lighter documentation can give shift time back, which can show up as less documentation-tied overtime. Set your overtime hourly rate; how much of that overtime you actually remove is yours to set below.",
    fields: [{ key: "otRate", label: "Overtime hourly rate", prefix: "$", placeholder: "75", hint: "Your loaded overtime rate per nurse hour." }],
    assumptions: [{ key: "otHours", label: "Overtime hours per nurse / week", default: "1.0" }],
    stancePrompt: "How much of the documentation-tied overtime do you expect to remove?",
    stanceBands: [20, 30, 40],
    stanceCap: 50,
    capNote: "We cap this at 50 percent. Overtime has many drivers; documentation load is only one of them.",
    math: (i) => `${nn(i.scope)} nurses × documentation-tied overtime × ${i.stancePct}% removed at ${fmt$(i.econ.otRate)}/hour.`,
  },
};

export function econModel(setting: string, category: string): EconModel | undefined {
  return ECON_MODELS[`${setting}|${category}`];
}

/** The seeded assumption defaults for a cell, as the {key: "value"} map used to pre-fill state. */
export function assumptionDefaults(setting: string, category: string): Record<string, string> {
  const m = econModel(setting, category);
  if (!m?.assumptions) return {};
  return Object.fromEntries(m.assumptions.map((a) => [a.key, a.default]));
}
