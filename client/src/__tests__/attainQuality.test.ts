import { describe, it, expect } from "vitest";
import {
  computeQualityScope,
  computeQualityInterventions,
  computeQualityChain,
  computeQualityContributions,
  deriveQualityLadder,
  qualityRateKey,
  qualityCostKey,
  committedPct,
  exploreStateForReconciliation,
  computeAllDriverValues,
  selectedEventTypes,
  QUALITY_EVENT_LABELS,
  QUALITY_EVENT_IDS,
  QUALITY_INTERVENTIONS,
  QUALITY_CEILING_PCT,
  HAPI_RATE_PER_1000,
  HAPI_COST_PER_EVENT,
  HAPI_CEILING_PCT,
  FALLS_RATE_PER_1000,
  FALLS_COST_PER_EVENT,
  FALLS_CEILING_PCT,
  CLABSI_UTILIZATION_PCT,
  CLABSI_RATE_PER_1000_LINE_DAYS,
  CLABSI_COST_PER_EVENT,
  CLABSI_CEILING_PCT,
  CAUTI_UTILIZATION_PCT,
  CAUTI_RATE_PER_1000_CATHETER_DAYS,
  CAUTI_COST_PER_EVENT,
  CAUTI_CEILING_PCT,
  SEPSIS_RATE_PER_1000,
  SEPSIS_COMPLIANCE_BASELINE_PCT,
  SEPSIS_DOC_LAG_PCT,
  SEPSIS_EXCESS_COST_PER_CASE,
  SEPSIS_REALIZATION_CEILING_PCT,
} from "@/lib/attain/attainQuality";
import { calcHapi, calcFalls, calcClabsi, calcCauti, calcSepsis } from "@/lib/nursingQualityCalcs";
import { computeLeverContributions, type AttainBaseline, type LeverValues } from "@/lib/attain/attainLevers";

const BASELINE: AttainBaseline = { staffedBeds: 120, nursingFtes: 180, dailyCensus: 102, adoptionPct: 100 };

const ALL_EVENT_LABELS = Object.values(QUALITY_EVENT_LABELS);

/** Every intervention across every event type, checked (1) - a fully
 * committed program across all five event types. */
function allInterventionsChecked(): LeverValues {
  const out: LeverValues = {};
  for (const id of QUALITY_EVENT_IDS) {
    for (const iv of QUALITY_INTERVENTIONS[id]) out[iv.id] = 1;
  }
  return out;
}

/** Only the named interventions for ONE event type, checked. */
function interventionsFor(id: (typeof QUALITY_EVENT_IDS)[number], checked = true): LeverValues {
  const out: LeverValues = {};
  for (const iv of QUALITY_INTERVENTIONS[id]) out[iv.id] = checked ? 1 : 0;
  return out;
}

function fullValues(overrides: Partial<LeverValues> = {}): LeverValues {
  return {
    qualityLines: ["Med-Surg", "ICU"],
    qualityBeds: 120,
    qualityEventTypes: [...ALL_EVENT_LABELS],
    ...allInterventionsChecked(),
    ...overrides,
  };
}

describe("D1 scope", () => {
  it("patient days = beds in scope x occupancy (census/beds) x 365", () => {
    const scope = computeQualityScope(BASELINE, { qualityBeds: 120 });
    expect(scope.bedsInScope).toBe(120);
    expect(scope.occupancyFraction).toBeCloseTo(102 / 120, 5);
    expect(scope.patientDays).toBeCloseTo(120 * (102 / 120) * 365, 5);
    expect(scope.patientDays).toBeCloseTo(102 * 365, 5);
  });

  it("beds requested is capped to the Starting-point staffed-beds baseline", () => {
    const scope = computeQualityScope(BASELINE, { qualityBeds: 999 });
    expect(scope.bedsInScope).toBe(120);
  });

  it("falls back to 85% occupancy when the baseline has no census", () => {
    const scope = computeQualityScope({ staffedBeds: 100 }, { qualityBeds: 100 });
    expect(scope.occupancyFraction).toBeCloseTo(0.85, 5);
  });

  it("selectedEventTypes reads only the recognized labels, in canonical order, and includes CAUTI (M1)", () => {
    const types = selectedEventTypes({ qualityEventTypes: ["Sepsis", "HAPI", "CAUTI", "Not A Real Type"] });
    expect(types).toEqual(["hapi", "cauti", "sepsis"]);
    expect(QUALITY_EVENT_IDS).toContain("cauti");
  });

  it("no event types selected means no events in the payoff, even with every intervention checked", () => {
    const chain = computeQualityChain(BASELINE, fullValues({ qualityEventTypes: [] }));
    expect(chain.payoff.events).toHaveLength(0);
    expect(chain.payoff.totalValue).toBe(0);
    expect(chain.eventInterventions).toHaveLength(0);
  });
});

describe("D2 - per-event intervention checklists (C1)", () => {
  it("each event type carries its own, genuinely different named interventions", () => {
    const falls = new Set(QUALITY_INTERVENTIONS.falls.map((iv) => iv.id));
    const hapi = new Set(QUALITY_INTERVENTIONS.hapi.map((iv) => iv.id));
    const clabsi = new Set(QUALITY_INTERVENTIONS.clabsi.map((iv) => iv.id));
    const cauti = new Set(QUALITY_INTERVENTIONS.cauti.map((iv) => iv.id));
    const sepsis = new Set(QUALITY_INTERVENTIONS.sepsis.map((iv) => iv.id));
    const all = [...falls, ...hapi, ...clabsi, ...cauti, ...sepsis];
    expect(new Set(all).size).toBe(all.length); // no id shared across events
    expect(falls.size).toBeGreaterThanOrEqual(4);
    expect(hapi.size).toBeGreaterThanOrEqual(3);
    expect(clabsi.size).toBeGreaterThanOrEqual(3);
    expect(cauti.size).toBeGreaterThanOrEqual(3);
    expect(sepsis.size).toBeGreaterThanOrEqual(3);
  });

  it("every event's own interventions sum exactly to that event's own ceiling", () => {
    for (const id of QUALITY_EVENT_IDS) {
      const sum = QUALITY_INTERVENTIONS[id].reduce((s, iv) => s + iv.weightPp, 0);
      expect(sum).toBe(QUALITY_CEILING_PCT[id]);
    }
  });

  it("committedPct sums only the checked interventions for that event, capped at its own ceiling", () => {
    const noneChecked = committedPct("falls", {});
    expect(noneChecked).toBe(0);

    const oneChecked = committedPct("falls", { [QUALITY_INTERVENTIONS.falls[0].id]: 1 });
    expect(oneChecked).toBeCloseTo(QUALITY_INTERVENTIONS.falls[0].weightPp, 5);

    const allChecked = committedPct("falls", interventionsFor("falls"));
    expect(allChecked).toBe(FALLS_CEILING_PCT);
  });

  it("checking a Falls intervention never moves HAPI's (or any other event's) committed pct", () => {
    const values = { ...interventionsFor("falls"), qualityEventTypes: ["Falls", "HAPI"], qualityBeds: 120 };
    const scope = computeQualityScope(BASELINE, values);
    const eventInterventions = computeQualityInterventions(scope, values);
    const falls = eventInterventions.find((e) => e.id === "falls")!;
    const hapi = eventInterventions.find((e) => e.id === "hapi")!;
    expect(falls.committedPct).toBeGreaterThan(0);
    expect(hapi.committedPct).toBe(0);
  });

  it("computeQualityInterventions only produces a sub-panel for a SELECTED event type (I2's structural fix)", () => {
    const values = { ...allInterventionsChecked(), qualityEventTypes: ["Falls"], qualityBeds: 120 };
    const scope = computeQualityScope(BASELINE, values);
    const eventInterventions = computeQualityInterventions(scope, values);
    expect(eventInterventions.map((e) => e.id)).toEqual(["falls"]);
  });
});

describe("D2 gating - dollars are 0 until an event's own interventions are committed (I2)", () => {
  it("no interventions checked (D1 only) nets $0 for every selected event type, even fully scoped", () => {
    const values: LeverValues = {
      qualityLines: ["Med-Surg"],
      qualityBeds: 120,
      qualityEventTypes: [...ALL_EVENT_LABELS],
    };
    const chain = computeQualityChain(BASELINE, values);
    for (const ei of chain.eventInterventions) {
      expect(ei.committedPct).toBe(0);
    }
    for (const e of chain.payoff.events) {
      expect(e.value).toBe(0);
      if (e.id !== "sepsis") expect(e.prevented).toBeCloseTo(0, 5);
    }
    expect(chain.payoff.totalValue).toBe(0);
  });

  it("beds/units alone (D1), with no interventions committed, still nets $0", () => {
    const chain = computeQualityChain(BASELINE, {
      qualityLines: ["Med-Surg", "ICU"],
      qualityBeds: 120,
      qualityEventTypes: [...ALL_EVENT_LABELS],
    });
    expect(chain.payoff.totalValue).toBe(0);
  });

  it("checking one Falls intervention alone (D4-style partial commit) produces a positive Falls prevention rate", () => {
    const values = { ...interventionsFor("falls", true), qualityEventTypes: ["Falls"], qualityBeds: 120 };
    const chain = computeQualityChain(BASELINE, values);
    const falls = chain.eventInterventions.find((e) => e.id === "falls")!;
    expect(falls.committedPct).toBeGreaterThan(0);
    expect(chain.payoff.totalValue).toBeGreaterThan(0);
  });
});

describe("monotonicity - committing more of an event's own interventions increases its prevented events", () => {
  it("checking every Falls intervention prevents strictly more than checking only one", () => {
    const oneChecked: LeverValues = { [QUALITY_INTERVENTIONS.falls[0].id]: 1, qualityEventTypes: ["Falls"], qualityBeds: 120 };
    const allChecked: LeverValues = { ...interventionsFor("falls"), qualityEventTypes: ["Falls"], qualityBeds: 120 };
    const low = computeQualityChain(BASELINE, oneChecked);
    const high = computeQualityChain(BASELINE, allChecked);
    expect(high.payoff.totalValue).toBeGreaterThan(low.payoff.totalValue);
    expect(high.payoff.totalPrevented).toBeGreaterThan(low.payoff.totalPrevented);
  });

  it("the committed pct never exceeds the event's own ceiling, even with every box checked", () => {
    for (const id of QUALITY_EVENT_IDS) {
      const pct = committedPct(id, interventionsFor(id));
      expect(pct).toBeLessThanOrEqual(QUALITY_CEILING_PCT[id]);
    }
  });
});

describe("Sepsis - its own interventions feed realizationPct, not a share of all sepsis cases", () => {
  it("checking more sepsis interventions increases Sepsis's prevented count and value", () => {
    const none = computeQualityChain(BASELINE, { qualityEventTypes: ["Sepsis"], qualityBeds: 120 });
    const one = computeQualityChain(BASELINE, {
      qualityEventTypes: ["Sepsis"],
      qualityBeds: 120,
      [QUALITY_INTERVENTIONS.sepsis[0].id]: 1,
    });
    const all = computeQualityChain(BASELINE, { ...interventionsFor("sepsis"), qualityEventTypes: ["Sepsis"], qualityBeds: 120 });
    expect(none.payoff.totalValue).toBe(0);
    expect(one.payoff.totalValue).toBeGreaterThan(none.payoff.totalValue);
    expect(all.payoff.totalValue).toBeGreaterThan(one.payoff.totalValue);
  });

  it("I1: Sepsis's prevented count equals docLagCases x realization/100, exactly consistent with value", () => {
    const values = { ...interventionsFor("sepsis"), qualityEventTypes: ["Sepsis"], qualityBeds: 120 };
    const chain = computeQualityChain(BASELINE, values);
    const sepsis = chain.payoff.events.find((e) => e.id === "sepsis")!;
    const direct = calcSepsis({
      patientDays: chain.scope.patientDays,
      ratePerThousand: SEPSIS_RATE_PER_1000,
      currentCompliancePct: SEPSIS_COMPLIANCE_BASELINE_PCT,
      docLagPct: SEPSIS_DOC_LAG_PCT,
      excessCostPerCase: SEPSIS_EXCESS_COST_PER_CASE,
      realizationPct: SEPSIS_REALIZATION_CEILING_PCT,
    });
    expect(sepsis.prevented).toBeCloseTo(direct.docLagCases * (SEPSIS_REALIZATION_CEILING_PCT / 100), 5);
    // The count and the dollar must agree: value === prevented x cost.
    expect(sepsis.value).toBeCloseTo(sepsis.prevented * SEPSIS_EXCESS_COST_PER_CASE, 0);
  });

  it("I1: at $0 realization (no sepsis interventions committed), prevented is exactly 0, never a positive count beside $0", () => {
    const chain = computeQualityChain(BASELINE, { qualityEventTypes: ["Sepsis"], qualityBeds: 120 });
    const sepsis = chain.payoff.events.find((e) => e.id === "sepsis")!;
    expect(sepsis.value).toBe(0);
    expect(sepsis.prevented).toBe(0);
  });
});

describe("selecting more event types increases the total, and CAUTI is a real, selectable type (M1)", () => {
  it("adding event types one at a time (with their own interventions committed) strictly increases totalValue and totalPrevented", () => {
    let prevValue = -1;
    let prevCount = -1;
    const order: (typeof QUALITY_EVENT_IDS)[number][] = ["hapi", "falls", "clabsi", "cauti", "sepsis"];
    const picked: string[] = [];
    let values: LeverValues = { qualityBeds: 120 };
    for (const id of order) {
      picked.push(QUALITY_EVENT_LABELS[id]);
      values = { ...values, ...interventionsFor(id), qualityEventTypes: [...picked] };
      const chain = computeQualityChain(BASELINE, values);
      expect(chain.payoff.totalValue).toBeGreaterThan(prevValue);
      expect(chain.payoff.totalPrevented).toBeGreaterThan(prevCount);
      prevValue = chain.payoff.totalValue;
      prevCount = chain.payoff.totalPrevented;
    }
  });
});

describe("reconciliation to the calc* helpers", () => {
  it("HAPI's contribution reconciles to calcHapi within tolerance", () => {
    const values = { ...interventionsFor("hapi"), qualityEventTypes: ["HAPI"], qualityBeds: 120 };
    const chain = computeQualityChain(BASELINE, values);
    const hapi = chain.payoff.events.find((e) => e.id === "hapi")!;
    const direct = calcHapi({
      patientDays: chain.scope.patientDays,
      rate: HAPI_RATE_PER_1000,
      preventionPct: HAPI_CEILING_PCT,
      cost: HAPI_COST_PER_EVENT,
    });
    expect(hapi.value).toBeCloseTo(Math.round(direct.value), 0);
    expect(hapi.prevented).toBeCloseTo(direct.prevented, 5);
  });

  it("Falls's contribution reconciles to calcFalls within tolerance", () => {
    const values = { ...interventionsFor("falls"), qualityEventTypes: ["Falls"], qualityBeds: 120 };
    const chain = computeQualityChain(BASELINE, values);
    const falls = chain.payoff.events.find((e) => e.id === "falls")!;
    const direct = calcFalls({
      patientDays: chain.scope.patientDays,
      rate: FALLS_RATE_PER_1000,
      preventionPct: FALLS_CEILING_PCT,
      cost: FALLS_COST_PER_EVENT,
    });
    expect(falls.value).toBeCloseTo(Math.round(direct.value), 0);
    expect(falls.prevented).toBeCloseTo(direct.prevented, 5);
  });

  it("CLABSI's contribution reconciles to calcClabsi within tolerance", () => {
    const values = { ...interventionsFor("clabsi"), qualityEventTypes: ["CLABSI"], qualityBeds: 120 };
    const chain = computeQualityChain(BASELINE, values);
    const clabsi = chain.payoff.events.find((e) => e.id === "clabsi")!;
    const direct = calcClabsi({
      patientDays: chain.scope.patientDays,
      utilizationPct: CLABSI_UTILIZATION_PCT,
      rate: CLABSI_RATE_PER_1000_LINE_DAYS,
      preventionPct: CLABSI_CEILING_PCT,
      cost: CLABSI_COST_PER_EVENT,
    });
    expect(clabsi.value).toBeCloseTo(Math.round(direct.value), 0);
    expect(clabsi.prevented).toBeCloseTo(direct.prevented, 5);
  });

  it("CAUTI's contribution reconciles to calcCauti within tolerance (M1)", () => {
    const values = { ...interventionsFor("cauti"), qualityEventTypes: ["CAUTI"], qualityBeds: 120 };
    const chain = computeQualityChain(BASELINE, values);
    const cauti = chain.payoff.events.find((e) => e.id === "cauti")!;
    const direct = calcCauti({
      patientDays: chain.scope.patientDays,
      utilizationPct: CAUTI_UTILIZATION_PCT,
      rate: CAUTI_RATE_PER_1000_CATHETER_DAYS,
      preventionPct: CAUTI_CEILING_PCT,
      cost: CAUTI_COST_PER_EVENT,
    });
    expect(cauti.value).toBeCloseTo(Math.round(direct.value), 0);
    expect(cauti.prevented).toBeCloseTo(direct.prevented, 5);
  });

  it("Sepsis's contribution reconciles to calcSepsis within tolerance", () => {
    const values = { ...interventionsFor("sepsis"), qualityEventTypes: ["Sepsis"], qualityBeds: 120 };
    const chain = computeQualityChain(BASELINE, values);
    const sepsis = chain.payoff.events.find((e) => e.id === "sepsis")!;
    const direct = calcSepsis({
      patientDays: chain.scope.patientDays,
      ratePerThousand: SEPSIS_RATE_PER_1000,
      currentCompliancePct: SEPSIS_COMPLIANCE_BASELINE_PCT,
      docLagPct: SEPSIS_DOC_LAG_PCT,
      excessCostPerCase: SEPSIS_EXCESS_COST_PER_CASE,
      realizationPct: SEPSIS_REALIZATION_CEILING_PCT,
    });
    expect(sepsis.value).toBeCloseTo(Math.round(direct.value), 0);
    expect(sepsis.prevented).toBeCloseTo(direct.prevented, 5);
  });

  it("every selected event type's value reconciles to computeAllDriverValues (the live engine), via exploreStateForReconciliation, including CAUTI", () => {
    const values = fullValues();
    const chain = computeQualityChain(BASELINE, values);
    const state = exploreStateForReconciliation(BASELINE, values);
    const engineValues = computeAllDriverValues(state, 0);

    const hapi = chain.payoff.events.find((e) => e.id === "hapi")!;
    const falls = chain.payoff.events.find((e) => e.id === "falls")!;
    const clabsi = chain.payoff.events.find((e) => e.id === "clabsi")!;
    const cauti = chain.payoff.events.find((e) => e.id === "cauti")!;
    const sepsis = chain.payoff.events.find((e) => e.id === "sepsis")!;

    expect(engineValues.nursingHapi).toBeCloseTo(hapi.value, 0);
    expect(engineValues.nursingFalls).toBeCloseTo(falls.value, 0);
    expect(engineValues.nursingClabsi).toBeCloseTo(clabsi.value, 0);
    expect(engineValues.nursingCauti).toBeCloseTo(cauti.value, 0);
    expect(engineValues.nursingSepsis).toBeCloseTo(sepsis.value, 0);
  });

  it("totalValue is the exact sum of every selected event type's own value (no smearing, no double count)", () => {
    const chain = computeQualityChain(BASELINE, fullValues());
    const sum = chain.payoff.events.reduce((s, e) => s + e.value, 0);
    expect(chain.payoff.totalValue).toBe(sum);
  });
});

describe("C2 - per-event prevention ceilings stay in the conservative, defensible band", () => {
  it("every event's ceiling is well under 100% and matches its documented constant", () => {
    expect(QUALITY_CEILING_PCT.hapi).toBe(HAPI_CEILING_PCT);
    expect(QUALITY_CEILING_PCT.falls).toBe(FALLS_CEILING_PCT);
    expect(QUALITY_CEILING_PCT.clabsi).toBe(CLABSI_CEILING_PCT);
    expect(QUALITY_CEILING_PCT.cauti).toBe(CAUTI_CEILING_PCT);
    expect(QUALITY_CEILING_PCT.sepsis).toBe(SEPSIS_REALIZATION_CEILING_PCT);
    // HAPI/CLABSI/CAUTI/Falls ceilings are a share of ALL events of that
    // type, so they stay in a tight, conservative band. Sepsis's own
    // ceiling is a REALIZATION ceiling on an already-narrow addressable
    // pool (non-compliant cases x doc-lag share), a structurally different
    // and already-conservative quantity - see the module header - so it is
    // checked separately, not against the same band.
    for (const id of QUALITY_EVENT_IDS) {
      if (id === "sepsis") continue;
      expect(QUALITY_CEILING_PCT[id]).toBeLessThanOrEqual(35);
      expect(QUALITY_CEILING_PCT[id]).toBeGreaterThan(0);
    }
    expect(QUALITY_CEILING_PCT.sepsis).toBeLessThanOrEqual(80);
    expect(QUALITY_CEILING_PCT.sepsis).toBeGreaterThan(0);
  });

  it("HAPI at the default baseline, fully committed, no longer produces the old ~60%-ceiling inflated figure", () => {
    // Regression guard for C2: at the OLD 60% ceiling, HAPI alone at this
    // baseline priced to roughly $1.1M (see the audit's own worked example).
    // The new, literature-grounded ceiling must land well under that.
    const values = { ...interventionsFor("hapi"), qualityEventTypes: ["HAPI"], qualityBeds: 120 };
    const chain = computeQualityChain(BASELINE, values);
    const hapi = chain.payoff.events.find((e) => e.id === "hapi")!;
    expect(hapi.value).toBeLessThan(500_000);
  });
});

describe("computeQualityContributions adapter", () => {
  it("returns the LeverContributionsResult shape, with every catalog lever id represented for the selected events", () => {
    const result = computeQualityContributions(BASELINE, fullValues());
    expect(result.totalMargin).toBeGreaterThan(0);
    const ids = result.perLever.map((l) => l.id);
    expect(ids).toContain("qualityLines");
    expect(ids).toContain("qualityBeds");
    for (const id of QUALITY_EVENT_IDS) {
      for (const iv of QUALITY_INTERVENTIONS[id]) {
        expect(ids).toContain(iv.id);
      }
    }
    for (const l of result.perLever) {
      expect(Number.isFinite(l.pctOfTotal)).toBe(true);
      expect(l.formula.length).toBeGreaterThan(0);
    }
  });

  it("an unselected event type's interventions never appear as rows (I2's gating generalized)", () => {
    const result = computeQualityContributions(BASELINE, {
      ...interventionsFor("falls"),
      qualityEventTypes: ["Falls"],
      qualityBeds: 120,
    });
    const ids = result.perLever.map((l) => l.id);
    for (const iv of QUALITY_INTERVENTIONS.hapi) expect(ids).not.toContain(iv.id);
    for (const iv of QUALITY_INTERVENTIONS.sepsis) expect(ids).not.toContain(iv.id);
  });

  it("doing nothing new (defaults) nets exactly $0 through computeLeverContributions's quality dispatch", () => {
    const values: LeverValues = {
      qualityLines: [],
      qualityBeds: 0,
      qualityEventTypes: [],
    };
    const result = computeLeverContributions("quality", "nursing", BASELINE, values);
    expect(result.totalMargin).toBe(0);
    expect(result.totalCount).toBe(0);
  });

  it("a real plan through computeLeverContributions's quality dispatch produces a positive total, reconciled to the chain", () => {
    const values = fullValues();
    const viaLevers = computeLeverContributions("quality", "nursing", BASELINE, values);
    const direct = computeQualityContributions(BASELINE, values);
    expect(viaLevers.totalMargin).toBe(direct.totalMargin);
    expect(viaLevers.totalMargin).toBeGreaterThan(0);
  });

  it("leave-one-out isolates exactly one intervention's own dollar, with no cross terms", () => {
    const values = { ...interventionsFor("falls"), qualityEventTypes: ["Falls"], qualityBeds: 120 };
    const result = computeQualityContributions(BASELINE, values);
    const oneId = QUALITY_INTERVENTIONS.falls[0].id;
    const row = result.perLever.find((l) => l.id === oneId)!;
    expect(row.marginalMargin).toBeGreaterThan(0);
    // Unchecking every OTHER Falls intervention should reduce the row's own
    // marginal by nothing (it is still isolating just this one checkbox).
    const withoutOne = computeQualityChain(BASELINE, { ...values, [oneId]: 0 }).payoff.totalValue;
    const withOne = computeQualityChain(BASELINE, values).payoff.totalValue;
    expect(row.marginalMargin).toBeCloseTo(withOne - withoutOne, 5);
  });
});

describe("deriveQualityLadder - the converging multi-event ladder (Build <-> Planning)", () => {
  it("the converged prize is exactly the sum of each selected event's own dollar (no double count)", () => {
    const values = fullValues();
    const ladder = deriveQualityLadder(BASELINE, values, 100);
    expect(ladder.events).toHaveLength(ALL_EVENT_LABELS.length);
    const sum = ladder.events.reduce((s, e) => s + e.value, 0);
    expect(ladder.convergedPrize).toBe(sum);
    // and it equals the chain's own realization-100 total (rounded per event).
    const chain = computeQualityChain(BASELINE, values);
    const chainSum = chain.payoff.events.reduce((s, e) => s + Math.round(e.value), 0);
    expect(ladder.convergedPrize).toBe(chainSum);
  });

  it("per-event interventions drive each event's own prevention: committing a bundle raises that event's captured and value", () => {
    const none = deriveQualityLadder(BASELINE, { qualityEventTypes: ["Falls"], qualityBeds: 120 }, 100);
    const full = deriveQualityLadder(BASELINE, { ...interventionsFor("falls"), qualityEventTypes: ["Falls"], qualityBeds: 120 }, 100);
    const fallsNone = none.events.find((e) => e.id === "falls")!;
    const fallsFull = full.events.find((e) => e.id === "falls")!;
    expect(fallsNone.capturedCount).toBe(0);
    expect(fallsNone.value).toBe(0);
    expect(fallsFull.capturedCount).toBeGreaterThan(0);
    expect(fallsFull.value).toBeGreaterThan(0);
  });

  it("the diagnose ceiling is a defensible, conservative share: captured <= ceiling <= events, and the ceiling stays far below the old 60% band", () => {
    const ladder = deriveQualityLadder(BASELINE, fullValues(), 100);
    for (const e of ladder.events) {
      // prevented can never exceed the honest preventable ceiling.
      expect(e.capturedCount).toBeLessThanOrEqual(e.ceilingCount + 1e-6);
      if (e.id !== "sepsis") {
        // ceiling is a share of ALL events; it must sit well under the old
        // inflated 60% ceiling the audit flagged (C2). The documentation-
        // attributable share the plan is actually credited lands lower still
        // once the side-panel realization dial attributes the Abridge share.
        const shareOfEvents = e.groundEvents > 0 ? e.ceilingCount / e.groundEvents : 0;
        expect(shareOfEvents).toBeGreaterThan(0);
        expect(shareOfEvents).toBeLessThanOrEqual(0.31);
      }
    }
  });

  it("prevented count is post-realization and consistent with the dollar (I1), for Sepsis at partial attribution", () => {
    const values = { ...interventionsFor("sepsis"), qualityEventTypes: ["Sepsis"], qualityBeds: 120 };
    const full = deriveQualityLadder(BASELINE, values, 100);
    const half = deriveQualityLadder(BASELINE, values, 50);
    const sFull = full.events.find((e) => e.id === "sepsis")!;
    const sHalf = half.events.find((e) => e.id === "sepsis")!;
    // realization scales the dollar exactly once; the prevented COUNT shown on
    // the gate is already post-(sepsis realization ceiling), and never a
    // positive count beside a $0.
    expect(sHalf.value).toBeCloseTo(sFull.value * 0.5, -1);
    expect(sFull.capturedCount).toBeGreaterThan(0);
    expect(sFull.value).toBeGreaterThan(0);
  });

  it("realization scales the converged prize and every event dollar by the same factor", () => {
    const values = fullValues();
    const full = deriveQualityLadder(BASELINE, values, 100);
    const half = deriveQualityLadder(BASELINE, values, 50);
    expect(half.convergedPrize).toBeCloseTo(full.convergedPrize * 0.5, -1);
    for (const e of half.events) {
      const f = full.events.find((q) => q.id === e.id)!;
      expect(e.value).toBeCloseTo(f.value * 0.5, -1);
    }
  });

  it("unselected events contribute nothing: only picked events appear in the ladder", () => {
    const ladder = deriveQualityLadder(BASELINE, { ...interventionsFor("falls"), qualityEventTypes: ["Falls"], qualityBeds: 120 }, 100);
    expect(ladder.events.map((e) => e.id)).toEqual(["falls"]);
  });

  it("no event selected nets a clean empty ladder, zero prize", () => {
    const ladder = deriveQualityLadder(BASELINE, { qualityEventTypes: [], qualityBeds: 120 }, 100);
    expect(ladder.events).toHaveLength(0);
    expect(ladder.convergedPrize).toBe(0);
    expect(ladder.anySelected).toBe(false);
  });

  it("editable rate and cost flow through the ladder and still reconcile to the engine", () => {
    const values = {
      ...interventionsFor("hapi"),
      qualityEventTypes: ["HAPI"],
      qualityBeds: 120,
      [qualityRateKey("hapi")]: 4.0, // partner's own rate, above the default 2.8
      [qualityCostKey("hapi")]: 25_000, // partner's own cost, above the default
    };
    const ladder = deriveQualityLadder(BASELINE, values, 100);
    const hapi = ladder.events.find((e) => e.id === "hapi")!;
    expect(hapi.rate).toBe(4.0);
    expect(hapi.costPerEvent).toBe(25_000);
    // reconciles to the live engine with the partner's own rate/cost.
    const state = exploreStateForReconciliation(BASELINE, values);
    const engine = computeAllDriverValues(state, 0);
    expect(engine.nursingHapi).toBeCloseTo(hapi.value, 0);
  });

  it("no user-facing string in the ladder carries an em dash or an en dash", () => {
    const ladder = deriveQualityLadder(BASELINE, fullValues(), 100);
    for (const e of ladder.events) {
      for (const s of [e.groundLabel, e.groundValue, e.groundDetail, e.ceilingLabel, e.capturedLabel, e.whoActs, e.priceLabel, e.formula]) {
        expect(s).not.toContain("—");
        expect(s).not.toContain("–");
      }
    }
  });
});

describe("blank / partial baseline safety", () => {
  it("a blank baseline with no beds requested nets exactly $0, even with every intervention checked", () => {
    const result = computeQualityContributions({}, fullValues({ qualityBeds: 0 }));
    expect(Number.isNaN(result.totalMargin)).toBe(false);
    expect(Number.isNaN(result.totalCount)).toBe(false);
    expect(result.totalMargin).toBe(0);
    expect(result.totalCount).toBe(0);
  });

  it("D1's own requested bed count is honored even when the Starting-point baseline stays blank (same convention as Workforce's D1 fallback) - NOT expected to net $0, expected to stay finite and non-negative", () => {
    const result = computeQualityContributions({}, fullValues());
    expect(Number.isNaN(result.totalMargin)).toBe(false);
    expect(Number.isFinite(result.totalMargin)).toBe(true);
    expect(result.totalMargin).toBeGreaterThan(0);
    expect(result.totalMargin).toBeGreaterThanOrEqual(0);
  });

  it("a partial baseline (beds, no census) still produces finite, non-negative numbers", () => {
    const chain = computeQualityChain({ staffedBeds: 80 }, fullValues({ qualityBeds: 80 }));
    expect(Number.isFinite(chain.payoff.totalValue)).toBe(true);
    expect(chain.payoff.totalValue).toBeGreaterThanOrEqual(0);
  });
});
