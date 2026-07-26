import { describe, it, expect } from "vitest";
import { buildFromSnapshot } from "@/pages/attain/pdf/attainPdfData";
import { engineValueInPlay, type CellInputs } from "@/pages/attain/preview/attainEngineAdapter";
import type { AttainSnapshot } from "@/pages/attain/attainStorage";

/**
 * Reconciliation guard for the LIVE Attain export. The real PDF
 * (attainReactPdf.tsx) is laid out entirely from `buildFromSnapshot`'s output —
 * it never re-derives a dollar. This test proves that output's headline total
 * (and every per-category value the PDF prints) equals the SAME engine
 * (`engineValueInPlay`) the on-screen AttainExperience renders, so the download
 * can never drift from the screen.
 *
 * The CellInputs reconstruction below mirrors `attainPdfData.ts`'s private
 * `inputsFor` exactly; if that mapping ever changes, this test's independent
 * engine call diverges and the guard fails loudly.
 */

const SETTING_LABEL: Record<string, string> = { outpatient: "Outpatient", ed: "ED", inpatient: "Inpatient", nursing: "Nursing" };
const GOAL_CATEGORY: Record<string, string> = { access: "Patient Access", retention: "Provider Retention", revenue: "Revenue Capture", quality: "Quality & Safety", capacity: "Nursing Capacity" };
const num = (str: string) => { const n = parseFloat((str || "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? n : 0; };

// Independent copy of attainPdfData.inputsFor — the engine's own input shape.
function cellInputs(snap: AttainSnapshot, settingLabel: string, category: string): CellInputs {
  const a = snap.inputsByCat?.[category] ?? { scope: "", econ: {}, stance: null, custom: "" };
  const stancePct = a.stance === -1 ? num(a.custom) : (a.stance ?? 0);
  const econ: Record<string, number> = {};
  for (const [k, v] of Object.entries(a.econ ?? {})) { const n = num(v); if (Number.isFinite(n)) econ[k] = n; }
  const scope = num(a.scope) || 0;
  const b = snap.baseline ?? {};
  const isNursingQuality = settingLabel === "Nursing" && category === "Quality & Safety";
  return { scope, stancePct, econ, totalProviders: b.providers, annualEncounters: b.annualEncounters, util: b.utilizationPct, adoption: b.adoptionPct, staffedBeds: isNursingQuality ? scope : b.staffedBeds };
}

function makeSnapshot(setting: string, goals: string[], inputsByCat: Record<string, AttainSnapshot["inputsByCat"][string]>, baseline: Record<string, number>): AttainSnapshot {
  return {
    partner: "Test Health System", phase: "experience", setting, goals, baseline,
    pickedByCat: {}, playsByCat: {}, answersByCat: {}, inputsByCat,
    metricsByCat: {}, readingsByCat: {}, peopleByCat: {}, customsByCat: {}, cadenceByCat: {},
    alignDone: [], planDone: [], chapter: "strategy", catIdx: 0, reviewLog: [], savedAt: 0,
  };
}

const OUTPATIENT_MULTI = makeSnapshot(
  "outpatient",
  ["access", "retention"],
  {
    "Patient Access": { scope: "40", econ: { perVisit: "200", minSaved: "2", visitMin: "30" }, stance: 25, custom: "" },
    "Provider Retention": { scope: "40", econ: { replacementCost: "400000", turnover: "6", burnout: "40" }, stance: 30, custom: "" },
  },
  { providers: 40, annualEncounters: 140_000, utilizationPct: 70, adoptionPct: 70 },
);

describe("Attain live PDF reconciliation (buildFromSnapshot ⇄ engineValueInPlay)", () => {
  it("headline total equals the engine's own sum, and each category value matches the engine", () => {
    const built = buildFromSnapshot(OUTPATIENT_MULTI);
    expect(built).not.toBeNull();
    const { data } = built!;
    const settingLabel = SETTING_LABEL[OUTPATIENT_MULTI.setting!];

    // Every entered category's printed value == the engine, computed independently.
    let engineSum = 0;
    for (const goal of OUTPATIENT_MULTI.goals) {
      const category = GOAL_CATEGORY[goal];
      const engineVal = engineValueInPlay(settingLabel, category, cellInputs(OUTPATIENT_MULTI, settingLabel, category));
      const printed = data.categories.find((c) => c.name === category);
      expect(printed, `category ${category} on the PDF`).toBeTruthy();
      expect(printed!.value).toBe(engineVal);
      engineSum += engineVal;
    }

    // The PDF headline total == the engine sum, and both are real (non-zero).
    expect(data.total).toBe(engineSum);
    expect(data.total).toBeGreaterThan(0);

    // Internal consistency: the total also equals the sum of the ENTERED category bars.
    const barSum = data.categories.filter((c) => c.entered).reduce((sSum, c) => sSum + c.value, 0);
    expect(barSum).toBe(data.total);
  });

  it("a single-category plan reconciles too", () => {
    const single = makeSnapshot(
      "outpatient",
      ["access"],
      { "Patient Access": { scope: "40", econ: { perVisit: "200", minSaved: "2", visitMin: "30" }, stance: 25, custom: "" } },
      { providers: 40, annualEncounters: 140_000, utilizationPct: 70, adoptionPct: 70 },
    );
    const built = buildFromSnapshot(single)!;
    const engineVal = engineValueInPlay("Outpatient", "Patient Access", cellInputs(single, "Outpatient", "Patient Access"));
    expect(built.data.total).toBe(engineVal);
    expect(built.data.total).toBeGreaterThan(0);
    expect(built.categories).toHaveLength(1);
  });
});
