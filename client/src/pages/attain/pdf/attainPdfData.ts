/**
 * THROWAWAY. Turns a saved plan (AttainSnapshot) into the PDF's data models.
 * Content (attainCells/attainContent/attainEconomics) supplies structure; the snapshot
 * supplies the partner's entered numbers; the engine supplies the dollar. Falls back to
 * the built-in sample when there's no plan yet.
 */
import { ATTAIN_MATRIX } from "../preview/attainCells";
import { econModel } from "../preview/attainEconomics";
import { engineValueInPlay, type CellInputs } from "../preview/attainEngineAdapter";
import { categoryForGoal } from "@/lib/attain/attainGoals";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";
import type { AttainSnapshot } from "../attainStorage";
import type { PdfData } from "./AttainPdfPage1";

// Re-exported so the reachability test can assert the funnel and the PDF builder
// resolve GoalId→category through the exact same source of truth (no drift).
export { categoryForGoal };

export type PlanCat = {
  name: string; owner: { name: string; role: string }; cadence: string;
  signals: { name: string; today: string; target: string; unit: string; source: string }[];
  outcomes: { name: string; today: string; target: string; unit: string; source: string }[];
  chain: string[]; assumptions: { label: string; value: string }[]; honesty: string;
  opens: { title: string; desc: string }[];
  /** Retention: tracked as proof, no dollar. The renderer must not print a
   * dollar value or a replacement-cost chain for a proof-only category. */
  proofOnly?: boolean;
};

const SETTING_LABEL: Record<string, string> = { outpatient: "Outpatient", ed: "ED", inpatient: "Inpatient", nursing: "Nursing" };
const num = (s: string) => { const n = parseFloat((s || "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? n : 0; };
// progress-reading helpers, mirroring MultiCategoryPreview's ProgressRollup exactly so the PDF's
// realized/attainment math is the SAME the on-screen Progress chapter shows.
const pnum = (s: string) => { const n = parseFloat((s || "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? n : NaN; };
const pavg = (arr: (number | null)[]) => { const v = arr.filter((x): x is number => x !== null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };

// "how the number holds" steps + a one-line note, per category (not in the content model)
const CHAIN: Record<string, string[]> = {
  "Patient Access": ["Lighter notes", "Freed clinician time", "Visit headroom", "Filled headroom at your margin"],
  "Provider Retention": ["Lighter day", "Less burnout-driven turnover", "Fewer departures to replace", "Less agency spend to cover gaps"],
  "Revenue Capture": ["Complete notes", "Documentation-driven coding lift", "Captured and kept through billing"],
  "Quality & Safety": ["Earlier deterioration surfaced", "Preventable events caught sooner", "Fewer events at their seeded cost"],
  "Nursing Capacity": ["Lighter documentation", "Shift time given back", "Less documentation-tied overtime"],
};
const NOTE: Record<string, string> = {
  "Patient Access": "Filling freed-time headroom at your margin per visit",
  "Provider Retention": "Preventing the burnout-driven share of turnover",
  "Revenue Capture": "Keeping the documentation-driven coding lift",
  "Quality & Safety": "Preventing the documentation-preventable share of harm",
  "Nursing Capacity": "Recovering documentation-tied overtime",
};

// the "how the number is built" chain for whatever category is largest — setting-aware
function chainFor(settingLabel: string, category: string, inp: CellInputs): { value: string; label: string }[] {
  const e = inp.econ ?? {}; const st = Math.round(inp.stancePct || 0);
  const nn = (n: number) => Math.round(n).toLocaleString();
  const $ = (n: number) => `$${Math.round(n).toLocaleString()}`;
  if (category === "Patient Access")
    return [
      { value: nn(inp.annualEncounters ?? 0) || "—", label: settingLabel === "ED" ? "ED visits a year" : "visits a year" },
      { value: `${st}%`, label: settingLabel === "ED" ? "of the throughput realized" : "of headroom filled" },
      { value: $(e.perVisit ?? e.edVisit ?? 0), label: "margin a visit" },
    ];
  if (category === "Provider Retention")
    return [
      { value: nn(inp.scope || 0), label: settingLabel === "Nursing" ? "nurses" : "providers" },
      { value: `${e.turnover ?? 0}%`, label: "annual turnover" },
      { value: `${st}%`, label: "of burnout turnover prevented" },
      { value: $(e.replacementCost ?? 0), label: "to replace one" },
    ];
  if (category === "Revenue Capture" && settingLabel !== "Inpatient")
    return [
      { value: `${e.wrvu ?? 0}`, label: "wRVU per visit" },
      { value: `~${e.uplift ?? 5}%`, label: "documentation lift" },
      { value: $(e.cf ?? 0), label: "per wRVU" },
      { value: `${st}%`, label: "captured and kept" },
    ];
  if (category === "Revenue Capture")
    return [
      { value: `${e.atRisk ?? 15}%`, label: "of discharges at risk" },
      { value: `${e.weightInc ?? 0.3}`, label: "DRG weight gained" },
      { value: $(e.drgBase ?? 0), label: "per DRG" },
      { value: `${st}%`, label: "captured" },
    ];
  if (category === "Quality & Safety")
    return [
      { value: nn(inp.scope || 0), label: "staffed beds" },
      { value: `${st}%`, label: "of preventable harm prevented" },
      { value: "seeded", label: "cost per event, from published figures" },
    ];
  if (category === "Nursing Capacity")
    return [
      { value: nn(inp.scope || 0), label: "nurses" },
      { value: $(e.otRate ?? 0), label: "overtime rate an hour" },
      { value: `${st}%`, label: "of overtime removed" },
    ];
  return [];
}

function inputsFor(snap: AttainSnapshot, settingLabel: string, category: string): CellInputs {
  const a = snap.inputsByCat?.[category] ?? { scope: "", econ: {}, stance: null, custom: "" };
  const cap = econModel(settingLabel, category)?.stanceCap ?? 75;
  const stancePct = a.stance === -1 ? Math.min(cap, num(a.custom)) : (a.stance ?? 0);
  const econ: Record<string, number> = {};
  for (const [k, v] of Object.entries(a.econ ?? {})) { const n = num(v); if (Number.isFinite(n)) econ[k] = n; }
  const scope = num(a.scope) || 0;
  const b = snap.baseline ?? {};
  // The per-unit dollars live on the Starting Point (baseline.econ); read each model field from
  // there with the model's placeholder default as fallback, exactly as MultiCategoryPreview.cellInputs
  // does, so the PDF number reconciles with the screen instead of falling back to bare model defaults.
  const model0 = econModel(settingLabel, category);
  for (const f of model0?.fields ?? []) {
    const typed = b.econ?.[f.key];
    const val = typed != null && typed > 0 ? typed : num(f.placeholder);
    if (Number.isFinite(val) && val > 0) econ[f.key] = val;
  }
  const isNursingQuality = settingLabel === "Nursing" && category === "Quality & Safety";
  // Multi-lever categories (Revenue Capture): reconstruct the live levers from the saved frame
  // answer + picked goals, exactly as MultiCategoryPreview.activeLeversFor does, so the PDF sums
  // the right driver keys instead of failing the readiness gate and rendering $0.
  let activeDriverKeys: string[] | undefined;
  const model = econModel(settingLabel, category);
  if (model?.levers) {
    const cell = ATTAIN_MATRIX.find((c) => c.setting === settingLabel && c.category === category);
    const frameId = cell?.align.choices?.find((q) => q.stage === "frame")?.id;
    const frame = new Set<string>(frameId ? (snap.answersByCat?.[category]?.choices?.[frameId] ?? []) : []);
    const picked = new Set<string>(snap.pickedByCat?.[category] ?? []);
    const active = model.levers.filter((l) => (l.payerOptionIds?.some((id) => frame.has(id)) ?? false) || (l.outcomeIds?.some((id) => picked.has(id)) ?? false));
    if (active.length) activeDriverKeys = Array.from(new Set(active.flatMap((l) => l.driverKeys)));
  }
  return { scope, stancePct, econ, activeDriverKeys, totalProviders: b.providers, annualEncounters: b.annualEncounters, util: b.utilizationPct, adoption: b.adoptionPct, staffedBeds: isNursingQuality ? scope : b.staffedBeds };
}

function metricRow(m: { name: string; unit: string; source: string; today: string; target: string }, entered?: { today: string; target: string; source: string }) {
  return { name: m.name, unit: m.unit, source: entered?.source || m.source, today: entered?.today || "—", target: entered?.target || "—" };
}

export function buildFromSnapshot(snap: AttainSnapshot | null | undefined): { data: PdfData; categories: PlanCat[] } | null {
  if (!snap) return null;
  const settingLabel = snap.setting ? SETTING_LABEL[snap.setting] : null;
  // A setting is the ONE thing we truly can't build without. Everything else
  // (goals, categories, inputs) degrades gracefully below, so a stale or partial
  // plan saved by an older build still exports instead of throwing.
  if (!settingLabel) return null;

  const allCells = ATTAIN_MATRIX.filter((c) => c.setting === settingLabel);
  // Setting-aware GoalId→category (capacity → "Inpatient Capacity" on inpatient, etc.), the same
  // resolver the live funnel uses, so a chosen goal always lands on the cell the screen showed.
  const goals = snap.goals ?? [];
  const mapped = new Set(goals.map((g) => categoryForGoal(snap.setting as AttainSetting, g as GoalId)).filter(Boolean));
  // Fall back to every category for the setting when the saved goals are empty or
  // carry ids that no longer map (schema drift) — never fail the export for it.
  let planCells = allCells.filter((c) => mapped.has(c.category));
  if (!planCells.length) planCells = allCells;
  const inPlan = new Set(planCells.map((c) => c.category));

  // Never let a stale input or an engine edge case throw the whole export; a
  // category that can't be valued just contributes 0.
  const valueOf = (category: string) => {
    if (!inPlan.has(category)) return 0;
    try { return engineValueInPlay(settingLabel, category, inputsFor(snap, settingLabel, category)); }
    catch { return 0; }
  };
  const safe = <T,>(fn: () => T, fallback: T): T => { try { return fn(); } catch { return fallback; } };
  const total = planCells.reduce((s, c) => s + valueOf(c.category), 0);
  const largest = [...planCells].sort((a, b) => valueOf(b.category) - valueOf(a.category))[0];
  // display heading (e.g., nurses aren't "providers"); the stable `category` stays the engine/storage key
  const catLabel = (c: (typeof allCells)[number]) => c.categoryLabel ?? c.category;

  // ── Realized-to-date, from the logged reviews ──────────────────────────────
  // Mirrors MultiCategoryPreview.ProgressRollup.statsFor exactly: a category's attainment is the
  // clamped average progress of its OUTCOME metrics (baseline→reading→target), and its realized
  // dollar is value-in-play × that attainment. Only surfaced once the partner has actually logged a
  // review (a non-empty reviewLog); otherwise the PDF stays the kickoff "0% / measurement begins at
  // go-live" page, which is honest before any review exists.
  const attainOf = (category: string): number => {
    const tgt = (id: string) => snap.metricsByCat?.[category]?.[id] ?? { today: "", target: "", source: "" };
    const readings = snap.readingsByCat?.[category] ?? {};
    const progOf = (id: string): number | null => {
      const t = tgt(id);
      const cur = pnum(readings[id] ?? ""), a = pnum(t.today), b = pnum(t.target);
      if (!Number.isFinite(cur) || !Number.isFinite(a) || !Number.isFinite(b) || a === b) return null;
      return (cur - a) / (b - a);
    };
    const cell = allCells.find((c) => c.category === category);
    const out = (cell?.plan.outcomeGroups ?? []).flatMap((g) => g.metrics);
    const outAvg = pavg(out.map((m) => progOf(m.id)));
    return outAvg !== null ? Math.max(0, Math.min(1, outAvg)) : 0;
  };
  const realizedOf = (category: string): number => Math.round(valueOf(category) * attainOf(category));

  const reviewLog = snap.reviewLog ?? [];
  const hasReviews = reviewLog.length > 0;
  const totalRealized = hasReviews ? planCells.reduce((s, c) => s + realizedOf(c.category), 0) : 0;
  const attainmentPct = hasReviews && total > 0 ? Math.round((totalRealized / total) * 100) : 0;
  // the same "push on the laggard" read the screen shows, special-cased when everything is attained
  // so it never tells a CFO to push on a category already at 100%.
  const enteredForRead = planCells.filter((c) => valueOf(c.category) > 0);
  const laggard = [...enteredForRead].sort((a, b) => attainOf(a.category) - attainOf(b.category))[0];
  const reviewRead = !hasReviews
    ? ""
    : attainmentPct >= 100 || !laggard
      ? `You're at ${attainmentPct}% across the set. The plan is fully realized against the promise.`
      : `You're at ${attainmentPct}% across the set. The category to push on is ${catLabel(laggard)}, furthest from its target.`;
  const climb = hasReviews
    ? [{ label: "Kickoff", pct: 0 }, ...reviewLog.map((r) => ({ label: r.label, pct: Math.max(0, Math.min(100, Math.round(r.attain))) }))]
    : [];

  const date = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const data: PdfData = {
    partner: snap.partner || "Your organization",
    setting: settingLabel,
    date,
    preparedWith: "",
    total,
    chainCategory: largest ? catLabel(largest) : undefined,
    chain: largest ? safe(() => chainFor(settingLabel, largest.category, inputsFor(snap, settingLabel, largest.category)), []) : [],
    categories: allCells.map((c) => ({
      name: catLabel(c),
      value: c.proofOnly ? 0 : valueOf(c.category),
      proofOnly: !!c.proofOnly,
      // realized-to-date within this category's own promise (0 before any review is logged)
      realized: hasReviews && inPlan.has(c.category) && !c.proofOnly ? realizedOf(c.category) : 0,
      note: c.proofOnly
        ? "Tracked as proof: turnover, burnout, likelihood to stay. No dollar attached, on purpose."
        : (NOTE[c.category] ?? ""),
      opens: (c.align.unlock?.options ?? []).slice(0, 2).map((o) => o.title),
      entered: inPlan.has(c.category),
    })),
    // Only present once a review is logged; its presence is what flips the PDF from the kickoff
    // page to the live scoreboard (AttainPdf picks mode="review", the react-pdf export renders the
    // realized band). Before that, the honest page is the go-live one.
    review: hasReviews
      ? { label: reviewLog[reviewLog.length - 1].label, attainmentPct, realized: totalRealized, climb, read: reviewRead }
      : undefined,
  };

  const categories: PlanCat[] = planCells.map((c) => {
    const metrics = snap.metricsByCat?.[c.category] ?? {};
    const owner = (snap.peopleByCat?.[c.category] ?? []).find((p) => p.name.trim()) ?? { name: "—", role: "" };
    const m = econModel(settingLabel, c.category);
    const customRows = (snap.customsByCat?.[c.category] ?? [])
      .filter((cm) => cm.name.trim())
      .map((cm) => ({ name: cm.name, unit: cm.unit || "", source: cm.source || "—", today: cm.today || "—", target: cm.target || "—" }));
    return {
      name: catLabel(c),
      owner: { name: owner.name || "—", role: owner.role || "" },
      cadence: snap.cadenceByCat?.[c.category] === "monthly" ? "Monthly" : "Quarterly",
      signals: (c.plan.abridgeSignals ?? []).map((s) => metricRow(s, metrics[s.id])),
      outcomes: [...(c.plan.outcomeGroups ?? []).flatMap((g) => g.metrics).map((s) => metricRow(s, metrics[s.id])), ...customRows],
      chain: CHAIN[c.category] ?? ["A lighter documentation load", "The outcome it opens"],
      // A proof-only category carries no dollar, so it shows no replacement-cost
      // assumptions (they'd imply a number) — just the tracked-proof honesty line.
      assumptions: c.proofOnly
        ? []
        : (m?.assumptions ?? []).map((a) => {
            const v = snap.inputsByCat?.[c.category]?.econ?.[a.key] ?? a.default;
            return { label: a.label, value: `${a.prefix ?? ""}${v}${a.suffix ?? ""}` };
          }),
      honesty: c.proofOnly
        ? "Tracked as proof, not counted in the dollar. The wellbeing layer that makes the rest of the plan credible."
        : (m?.capNote ?? "Counted conservatively, from your own numbers."),
      opens: (c.align.unlock?.options ?? []).slice(0, 3).map((o) => ({ title: o.title, desc: o.desc })),
      proofOnly: !!c.proofOnly,
    };
  });

  return { data, categories };
}
