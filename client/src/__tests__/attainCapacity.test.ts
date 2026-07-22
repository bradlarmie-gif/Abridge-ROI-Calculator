import { describe, it, expect } from "vitest";
import {
  computeCapacityScope,
  computeCapacityChain,
  computeCapacityContributions,
  exploreStateForReconciliation,
  computeAllDriverValues,
  otHoursPerNurseWeekFor,
  otHourlyRateFor,
  DEFAULT_OT_HOURS_PER_NURSE_WEEK,
  DEFAULT_OT_HOURLY_RATE,
  NURSING_CAPACITY_WHO_ACTS,
  NURSING_CAPACITY_NO_DOUBLE_COUNT,
  CAPACITY_LEVER_IDS,
} from "@/lib/attain/attainCapacity";
import { deriveNursingCapacityLadder } from "@/pages/attain/steps/accessLadder";
import { computeLeverContributions, LEVERS, type AttainBaseline, type LeverValues } from "@/lib/attain/attainLevers";

const BASELINE: AttainBaseline = { staffedBeds: 400, nursingFtes: 300, dailyCensus: 340, adoptionPct: 100 };

function fullValues(overrides: Partial<LeverValues> = {}): LeverValues {
  return {
    capacityLines: ["Med-Surg", "ICU"],
    capacityNurses: 300,
    capacityOtHoursPerWeek: 2.5,
    capacityOtRate: 75,
    capacityDocShare: 60,
    capacityConversion: 40,
    ...overrides,
  };
}

describe("scope", () => {
  it("caps nurses in scope to the Starting-point nursing FTE baseline", () => {
    const scope = computeCapacityScope(BASELINE, { capacityNurses: 5000 });
    expect(scope.nursesInScope).toBe(300);
  });
  it("passes a requested count through under the cap", () => {
    const scope = computeCapacityScope(BASELINE, { capacityNurses: 120 });
    expect(scope.nursesInScope).toBe(120);
  });
});

describe("ground defaults reconcile to Explore's own nursingOvertime defaults", () => {
  it("falls back to Explore's OT hours and rate when blank", () => {
    expect(otHoursPerNurseWeekFor({})).toBe(DEFAULT_OT_HOURS_PER_NURSE_WEEK);
    expect(otHourlyRateFor({})).toBe(DEFAULT_OT_HOURLY_RATE);
  });
});

describe("the chain math", () => {
  it("total OT = nurses x OT hrs/wk x 52; prize = realized hrs x rate", () => {
    const chain = computeCapacityChain(BASELINE, fullValues());
    expect(chain.totalOtHoursYr).toBe(300 * 2.5 * 52); // 39,000
    expect(chain.docAttributableOtHoursYr).toBeCloseTo(39_000 * 0.6, 6); // 23,400
    expect(chain.realizedOtHoursAvoided).toBeCloseTo(23_400 * 0.4, 6); // 9,360
    expect(chain.prize).toBe(Math.round(9_360 * 75)); // 702,000
  });
});

describe("the documentation-attributable gate caps the overtime", () => {
  it("realized avoided <= documentation-attributable <= total OT", () => {
    const chain = computeCapacityChain(BASELINE, fullValues({ capacityDocShare: 55, capacityConversion: 65 }));
    expect(chain.docAttributableOtHoursYr).toBeLessThanOrEqual(chain.totalOtHoursYr);
    expect(chain.realizedOtHoursAvoided).toBeLessThanOrEqual(chain.docAttributableOtHoursYr);
  });
  it("overtime from staffing/census (the non-documentation share) can never be cut", () => {
    // Even at 100% conversion, only the documentation-attributable share is reachable.
    const chain = computeCapacityChain(BASELINE, fullValues({ capacityDocShare: 60, capacityConversion: 100 }));
    expect(chain.realizedOtHoursAvoided).toBeCloseTo(chain.docAttributableOtHoursYr, 6);
    expect(chain.realizedOtHoursAvoided).toBeLessThan(chain.totalOtHoursYr);
    // The 40% staffing/census share stays out of the number.
    expect(chain.totalOtHoursYr - chain.realizedOtHoursAvoided).toBeCloseTo(chain.totalOtHoursYr * 0.4, 6);
  });
});

describe("reconciliation to the nursingOvertime engine driver", () => {
  it("the derived prize equals computeAllDriverValues().nursingOvertime", () => {
    const values = fullValues();
    const chain = computeCapacityChain(BASELINE, values);
    const state = exploreStateForReconciliation(BASELINE, values);
    const engine = computeAllDriverValues(state, 0);
    expect(engine.nursingOvertime).toBe(chain.prize);
  });
  it("holds across several diagnosis/conversion combinations", () => {
    for (const [doc, conv] of [[45, 30], [70, 55], [100, 100], [65, 45]] as const) {
      const values = fullValues({ capacityDocShare: doc, capacityConversion: conv });
      const chain = computeCapacityChain(BASELINE, values);
      const engine = computeAllDriverValues(exploreStateForReconciliation(BASELINE, values), 0);
      expect(engine.nursingOvertime).toBe(chain.prize);
    }
  });
  it("the shared ladder derivation exposes the same reconciled numbers", () => {
    const values = fullValues();
    const chain = computeCapacityChain(BASELINE, values);
    const ladder = deriveNursingCapacityLadder(chain, {
      realizedOtHoursAvoided: chain.realizedOtHoursAvoided,
      prize: chain.prize,
    });
    const engine = computeAllDriverValues(exploreStateForReconciliation(BASELINE, values), 0);
    expect(ladder.prize).toBe(engine.nursingOvertime);
    expect(ladder.totalOtHoursYr).toBe(chain.totalOtHoursYr);
    expect(ladder.realizedOtHoursAvoided).toBe(chain.realizedOtHoursAvoided);
  });
});

describe("empty state", () => {
  it("a blank plan produces no overtime and no dollar", () => {
    const chain = computeCapacityChain(BASELINE, {});
    expect(chain.totalOtHoursYr).toBe(0);
    expect(chain.realizedOtHoursAvoided).toBe(0);
    expect(chain.prize).toBe(0);
    const engine = computeAllDriverValues(exploreStateForReconciliation(BASELINE, {}), 0);
    expect(engine.nursingOvertime).toBe(0);
  });
  it("no nurses in scope means no dollar even with a diagnosis set", () => {
    const chain = computeCapacityChain(BASELINE, { capacityDocShare: 80, capacityConversion: 80 });
    expect(chain.prize).toBe(0);
  });
});

describe("the contributions adapter (a single gated ladder)", () => {
  it("attributes the whole prize to the conversion decision, $0 to the rest", () => {
    const values = fullValues();
    const chain = computeCapacityChain(BASELINE, values);
    const result = computeCapacityContributions(BASELINE, values);
    expect(result.totalMargin).toBe(chain.prize);
    const dollarBearing = result.perLever.filter((l) => l.marginalMargin !== 0);
    expect(dollarBearing).toHaveLength(1);
    expect(dollarBearing[0].id).toBe("capacityConversion");
  });
  it("routes through computeLeverContributions for the capacity goal", () => {
    const values = fullValues();
    const viaDispatch = computeLeverContributions("capacity", "nursing", BASELINE, values);
    const direct = computeCapacityContributions(BASELINE, values);
    expect(viaDispatch.totalMargin).toBe(direct.totalMargin);
  });
  it("the catalog ids match the engine's CAPACITY_LEVER_IDS", () => {
    const catalogIds = LEVERS.capacity.map((l) => l.id);
    expect(catalogIds).toEqual([...CAPACITY_LEVER_IDS]);
  });
});

describe("no double-count with retention, stated plainly", () => {
  it("the framing names overtime wages vs replacement cost and 'counted once'", () => {
    expect(NURSING_CAPACITY_NO_DOUBLE_COUNT).toMatch(/counted once/i);
    expect(NURSING_CAPACITY_NO_DOUBLE_COUNT).toMatch(/wages/i);
    expect(NURSING_CAPACITY_NO_DOUBLE_COUNT).toMatch(/replacement cost/i);
  });
  it("carries no em dashes and no green/amber, per the design laws", () => {
    const strings = [NURSING_CAPACITY_NO_DOUBLE_COUNT, NURSING_CAPACITY_WHO_ACTS];
    for (const s of strings) {
      expect(s).not.toMatch(/[—–]/);
      expect(s.toLowerCase()).not.toMatch(/green|amber/);
    }
  });
});
