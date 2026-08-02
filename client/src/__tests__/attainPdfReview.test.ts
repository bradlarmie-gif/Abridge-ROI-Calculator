import { describe, it, expect } from "vitest";
import { buildFromSnapshot } from "@/pages/attain/pdf/attainPdfData";
import { ATTAIN_MATRIX } from "@/pages/attain/preview/attainCells";
import { ECON_MODELS } from "@/pages/attain/preview/attainEconomics";
import type { AttainSnapshot, StoredMetric } from "@/pages/attain/attainStorage";

/**
 * PROGRESS-ON-THE-PDF GUARD.
 *
 * The exported PDF used to be frozen at "0% realized to date" even after quarterly
 * reviews were logged — buildFromSnapshot never populated the `review` field the page
 * already supported. This test proves the transformer now reflects logged progress:
 * a snapshot with a non-empty reviewLog + real readings yields a `review` with a
 * realized dollar > 0, and a snapshot with NO reviews stays on the honest kickoff page
 * (review undefined, realized 0).
 */

const LABEL = "Outpatient";
const CATEGORY = "Patient Access";

// A ready econ map for Patient Access (its required money fields + seeded assumptions).
function econFor(): Record<string, string> {
  const m = ECON_MODELS[`${LABEL}|${CATEGORY}`]!;
  const econ: Record<string, string> = {};
  for (const f of m.fields) econ[f.key] = f.key === "perVisit" ? "200" : "100";
  for (const a of m.assumptions ?? []) econ[a.key] = a.default;
  return econ;
}
const midStance = () => {
  const b = ECON_MODELS[`${LABEL}|${CATEGORY}`]!.stanceBands;
  return b[Math.floor(b.length / 2)];
};

// Outcome-metric ids for the cell, and readings that sit HALFWAY between today→target so
// the progress fraction is a real, positive number (attain > 0).
function outcomeMetricsAndReadings(): { metrics: Record<string, StoredMetric>; readings: Record<string, string> } {
  const cell = ATTAIN_MATRIX.find((c) => c.setting === LABEL && c.category === CATEGORY)!;
  const metrics: Record<string, StoredMetric> = {};
  const readings: Record<string, string> = {};
  for (const g of cell.plan.outcomeGroups ?? []) {
    for (const m of g.metrics) {
      const today = 100, target = 0, half = 50; // any monotone triple; fraction = 0.5
      metrics[m.id] = { today: String(today), target: String(target), source: "Reporting Workbench" };
      readings[m.id] = String(half);
    }
  }
  return { metrics, readings };
}

function baseSnapshot(withReview: boolean): AttainSnapshot {
  const { metrics, readings } = outcomeMetricsAndReadings();
  return {
    partner: "Test Health System",
    phase: "experience",
    setting: "outpatient",
    goals: ["access"],
    baseline: { providers: 40, annualEncounters: 140_000, utilizationPct: 70, adoptionPct: 70 },
    pickedByCat: {},
    playsByCat: {},
    answersByCat: {},
    inputsByCat: { [CATEGORY]: { scope: "40", econ: econFor(), stance: midStance(), custom: "" } },
    metricsByCat: { [CATEGORY]: metrics },
    readingsByCat: { [CATEGORY]: readings },
    peopleByCat: { [CATEGORY]: [{ name: "Jane Doe", role: "Director" }] },
    customsByCat: {},
    cadenceByCat: {},
    alignDone: [],
    planDone: [],
    reviewLog: withReview ? [{ label: "Q1", attain: 50 }] : [],
    savedAt: Date.now(),
  };
}

describe("Attain PDF reflects logged reviews", () => {
  it("a snapshot with a logged review populates review with realized > 0", () => {
    const { data } = buildFromSnapshot(baseSnapshot(true))!;
    expect(data.total).toBeGreaterThan(0);
    expect(data.review, "review must be present once a review is logged").toBeTruthy();
    const r = data.review!;
    expect(r.realized).toBeGreaterThan(0);
    expect(r.attainmentPct).toBeGreaterThan(0);
    expect(r.attainmentPct).toBeLessThanOrEqual(100);
    // ~50% attainment on the one entered category (readings sit halfway to target)
    expect(r.attainmentPct).toBe(Math.round((r.realized / data.total) * 100));
    // climb has a kickoff anchor + the logged point
    expect(r.climb[0]).toEqual({ label: "Kickoff", pct: 0 });
    expect(r.climb.length).toBe(2);
    // the entered category carries its own realized-to-date dollar
    const cat = data.categories.find((c) => c.entered)!;
    expect(cat.realized).toBeGreaterThan(0);
    expect(cat.realized).toBeLessThan(cat.value);
  });

  it("a snapshot with NO reviews stays on the honest kickoff page (review undefined, realized 0)", () => {
    const { data } = buildFromSnapshot(baseSnapshot(false))!;
    expect(data.review).toBeUndefined();
    expect(data.total).toBeGreaterThan(0);
    for (const c of data.categories) expect(c.realized ?? 0).toBe(0);
  });
});
