/**
 * THROWAWAY. Turns a saved plan (AttainSnapshot) into the PDF's data models.
 * Content (attainCells/attainContent/attainEconomics) supplies structure; the snapshot
 * supplies the partner's entered numbers; the engine supplies the dollar. Falls back to
 * the built-in sample when there's no plan yet.
 */
import { ATTAIN_MATRIX } from "../preview/attainCells";
import { econModel } from "../preview/attainEconomics";
import { engineValueInPlay, type CellInputs } from "../preview/attainEngineAdapter";
import type { AttainSnapshot } from "../attainStorage";
import type { PdfData } from "./AttainPdfPage1";

export type PlanCat = {
  name: string; owner: { name: string; role: string }; cadence: string;
  signals: { name: string; today: string; target: string; unit: string; source: string }[];
  outcomes: { name: string; today: string; target: string; unit: string; source: string }[];
  chain: string[]; assumptions: { label: string; value: string }[]; honesty: string;
  opens: { title: string; desc: string }[];
};

const SETTING_LABEL: Record<string, string> = { outpatient: "Outpatient", ed: "ED", inpatient: "Inpatient", nursing: "Nursing" };
const GOAL_CATEGORY: Record<string, string> = { access: "Patient Access", retention: "Provider Retention", revenue: "Revenue Capture", quality: "Quality & Safety", capacity: "Nursing Capacity" };
const num = (s: string) => { const n = parseFloat((s || "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? n : 0; };

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
  if (!settingLabel || !snap.goals?.length) return null;

  const allCells = ATTAIN_MATRIX.filter((c) => c.setting === settingLabel);
  const inPlan = new Set(snap.goals.map((g) => GOAL_CATEGORY[g]).filter(Boolean));
  const planCells = allCells.filter((c) => inPlan.has(c.category)); // only chosen ones get detail pages
  if (!planCells.length) return null;

  const valueOf = (category: string) => (inPlan.has(category) ? engineValueInPlay(settingLabel, category, inputsFor(snap, settingLabel, category)) : 0);
  const total = planCells.reduce((s, c) => s + valueOf(c.category), 0);
  const largest = [...planCells].sort((a, b) => valueOf(b.category) - valueOf(a.category))[0];
  // display heading (e.g., nurses aren't "providers"); the stable `category` stays the engine/storage key
  const catLabel = (c: (typeof allCells)[number]) => c.categoryLabel ?? c.category;

  const date = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const data: PdfData = {
    partner: snap.partner || "Your organization",
    setting: settingLabel,
    date,
    preparedWith: "",
    total,
    chainCategory: largest ? catLabel(largest) : undefined,
    chain: largest ? chainFor(settingLabel, largest.category, inputsFor(snap, settingLabel, largest.category)) : [],
    categories: allCells.map((c) => ({
      name: catLabel(c),
      value: valueOf(c.category),
      note: NOTE[c.category] ?? "",
      opens: (c.align.unlock?.options ?? []).slice(0, 2).map((o) => o.title),
      entered: inPlan.has(c.category),
    })),
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
      assumptions: (m?.assumptions ?? []).map((a) => {
        const v = snap.inputsByCat?.[c.category]?.econ?.[a.key] ?? a.default;
        return { label: a.label, value: `${a.prefix ?? ""}${v}${a.suffix ?? ""}` };
      }),
      honesty: m?.capNote ?? "Counted conservatively, from your own numbers.",
      opens: (c.align.unlock?.options ?? []).slice(0, 3).map((o) => ({ title: o.title, desc: o.desc })),
    };
  });

  return { data, categories };
}
