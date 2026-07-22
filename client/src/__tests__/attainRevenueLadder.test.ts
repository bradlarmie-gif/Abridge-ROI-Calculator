import { describe, it, expect } from "vitest";
import {
  computeEmChain,
  computeRevenueChain,
  deriveRevenueLadder,
  exploreStateForReconciliation,
  computeAllDriverValues,
  REVENUE_PATH_LABELS,
} from "@/lib/attain/attainRevenue";
import type { AttainBaseline, LeverValues } from "@/lib/attain/attainLevers";

const OP: AttainBaseline = { providers: 90, annualEncounters: 90 * 3_500, utilizationPct: 100 };

function emValues(overrides: Partial<LeverValues> = {}): LeverValues {
  return {
    revenuePaths: [REVENUE_PATH_LABELS.em],
    revenueEmEmployedShare: 80,
    revenueEmVisitShare: 70,
    revenueEmDocCausedShare: 25,
    revenueEmWrvuGain: 0.5,
    revenueEmLift: 40, // reinterpreted: share of the documentation gap you close
    revenueEmConversionFactor: 40,
    ...overrides,
  };
}

function hccValues(overrides: Partial<LeverValues> = {}): LeverValues {
  return {
    revenuePaths: [REVENUE_PATH_LABELS.hcc],
    revenueHccPopulations: ["Medicare Advantage", "Medicaid MCO"],
    revenueHccGapRate: 65,
    revenueHccCurrentRecapture: 60,
    revenueHccRecapture: 8,
    revenueHccAvgHccs: 0.5,
    revenueHccNetNew: 5,
    revenueHccAvgNetNewConditions: 1.2,
    revenueHccValuePerHcc: 1_500,
    ...overrides,
  };
}

function denialsValues(overrides: Partial<LeverValues> = {}): LeverValues {
  return {
    revenuePaths: [REVENUE_PATH_LABELS.denials],
    revenueDenialsRate: 4,
    revenueDenialsPreventable: 50,
    revenueDenialsAvgClaimValue: 900,
    ...overrides,
  };
}

describe("outpatient E/M grounding + diagnosis model", () => {
  it("employed share and E/M visit share scope the eligible encounters", () => {
    const full = computeEmChain(OP, "outpatient", emValues({ revenueEmEmployedShare: 100, revenueEmVisitShare: 100 }));
    const scoped = computeEmChain(OP, "outpatient", emValues({ revenueEmEmployedShare: 80, revenueEmVisitShare: 70 }));
    expect(scoped.eligibleEncounters).toBeLessThan(full.eligibleEncounters);
    // 80% x 70% = 56% of the full pool.
    expect(scoped.eligibleEncounters).toBeCloseTo(Math.round(full.eligibleEncounters * 0.56), -2);
  });

  it("the documentation-caused share is the ceiling and the capture commitment is the gate (zero capture, zero dollars)", () => {
    const chain = computeEmChain(OP, "outpatient", emValues({ revenueEmLift: 0 }));
    expect(chain.docCausedVisits).toBeGreaterThan(0); // the ceiling is real
    expect(chain.correctedVisits).toBe(0); // but nothing converts
    expect(chain.value).toBe(0);
  });

  it("corrected claims can never exceed the documentation-caused ceiling", () => {
    const chain = computeEmChain(OP, "outpatient", emValues({ revenueEmLift: 100 }));
    expect(chain.correctedVisits).toBeLessThanOrEqual(chain.docCausedVisits + 1e-6);
  });

  it("turning up the capture commitment increases corrected claims and the dollar", () => {
    const low = computeEmChain(OP, "outpatient", emValues({ revenueEmLift: 20 }));
    const high = computeEmChain(OP, "outpatient", emValues({ revenueEmLift: 80 }));
    expect(high.correctedVisits).toBeGreaterThan(low.correctedVisits);
    expect(high.value).toBeGreaterThan(low.value);
  });

  it("reconciles to Explore's wrvu engine math with the new grounding fields", () => {
    const values = emValues();
    const chain = computeEmChain(OP, "outpatient", values);
    const state = exploreStateForReconciliation(OP, "outpatient", values);
    const engine = computeAllDriverValues(state, 0);
    expect(engine.wrvu).toBeGreaterThan(0);
    expect(chain.value).toBeCloseTo(engine.wrvu, -1);
  });

  it("blank grounding nets a clean zero, never NaN", () => {
    const chain = computeEmChain({}, "outpatient", { revenuePaths: [REVENUE_PATH_LABELS.em] });
    expect(chain.value).toBe(0);
    expect(Number.isNaN(chain.correctedVisits)).toBe(false);
    expect(Number.isNaN(chain.liftPct)).toBe(false);
  });
});

describe("deriveRevenueLadder - the converging multi-path ladder", () => {
  it("the converged prize is exactly the sum of each selected path's own dollar (no double count)", () => {
    const values: LeverValues = { ...emValues(), ...hccValues(), ...denialsValues(), revenuePaths: [REVENUE_PATH_LABELS.em, REVENUE_PATH_LABELS.hcc, REVENUE_PATH_LABELS.denials] };
    const ladder = deriveRevenueLadder(OP, "outpatient", values, 100);
    expect(ladder.paths).toHaveLength(3);
    const sum = ladder.paths.reduce((s, p) => s + p.value, 0);
    expect(ladder.convergedPrize).toBe(sum);
    // and each path value equals its own chain payoff (realization 100).
    const chain = computeRevenueChain(OP, "outpatient", values);
    const em = ladder.paths.find((p) => p.id === "em")!;
    const hcc = ladder.paths.find((p) => p.id === "hcc")!;
    const denials = ladder.paths.find((p) => p.id === "denials")!;
    expect(em.value).toBe(chain.em!.chain.value);
    expect(hcc.value).toBe(chain.hcc!.payoff.value);
    expect(denials.value).toBe(chain.denials!.chain.value);
    expect(ladder.convergedPrize).toBe(chain.totalValue);
  });

  it("every path's captured count sits at or below its documentation-caused ceiling", () => {
    const values: LeverValues = { ...emValues(), ...hccValues(), ...denialsValues(), revenuePaths: [REVENUE_PATH_LABELS.em, REVENUE_PATH_LABELS.hcc, REVENUE_PATH_LABELS.denials] };
    const ladder = deriveRevenueLadder(OP, "outpatient", values, 100);
    for (const p of ladder.paths) {
      expect(p.capturedCount).toBeLessThanOrEqual(p.ceilingCount + 1e-6);
    }
  });

  it("realization scales the converged prize and every path dollar by the same factor", () => {
    const values: LeverValues = { ...emValues(), ...denialsValues(), revenuePaths: [REVENUE_PATH_LABELS.em, REVENUE_PATH_LABELS.denials] };
    const full = deriveRevenueLadder(OP, "outpatient", values, 100);
    const half = deriveRevenueLadder(OP, "outpatient", values, 50);
    expect(half.convergedPrize).toBeCloseTo(full.convergedPrize * 0.5, -1);
    for (const p of half.paths) {
      const f = full.paths.find((q) => q.id === p.id)!;
      expect(p.value).toBeCloseTo(f.value * 0.5, -1);
    }
  });

  it("no path selected nets a clean empty ladder, zero prize", () => {
    const ladder = deriveRevenueLadder(OP, "outpatient", { revenuePaths: [] }, 100);
    expect(ladder.paths).toHaveLength(0);
    expect(ladder.convergedPrize).toBe(0);
    expect(ladder.anyPathSelected).toBe(false);
  });

  it("no user-facing string in the ladder carries an em dash or the word downcoding", () => {
    const values: LeverValues = { ...emValues(), ...hccValues(), ...denialsValues(), revenuePaths: [REVENUE_PATH_LABELS.em, REVENUE_PATH_LABELS.hcc, REVENUE_PATH_LABELS.denials] };
    const ladder = deriveRevenueLadder(OP, "outpatient", values, 100);
    for (const p of ladder.paths) {
      for (const s of [p.groundLabel, p.groundValue, p.ceilingLabel, p.capturedLabel, p.whoActs, p.priceLabel, p.formula]) {
        expect(s).not.toContain("—");
        expect(s).not.toContain("–");
        expect(s.toLowerCase()).not.toContain("downcod");
      }
    }
  });
});
