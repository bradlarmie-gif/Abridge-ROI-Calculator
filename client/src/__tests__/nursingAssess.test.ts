import { describe, it, expect } from "vitest";
import {
  fmtDollar,
  buildPrioritySummary,
  computeBedsideImpact,
  generateFocusNarrative,
  deriveShiftsPerYear,
} from "@/pages/switch/nursing/nursingCalculations";
import {
  createEmptyPriorityInputs,
  type AllPriorityInputs,
  type NursingBaselineInputs,
  type NursingPriority,
} from "@/pages/switch/nursing/nursingTypes";

/**
 * Guardrails for the nursing Assess flow engine. The flow is qualitative, but a
 * few behaviors matter: currency rounds correctly, the inputs we collect are
 * actually surfaced (not silently counted then dropped), shifts/year is a
 * single constant, and the narrative never throws on unexpected input.
 */

const baseline: NursingBaselineInputs = { staffedBeds: 200, nurseFTEs: 100, bedOccupancy: 85 };

function inputsWith(overrides: Partial<AllPriorityInputs>): AllPriorityInputs {
  return { ...createEmptyPriorityInputs(), ...overrides };
}

describe("fmtDollar", () => {
  it("rolls up to millions at the rounding boundary instead of $1000K", () => {
    expect(fmtDollar(999500)).toBe("$1.0M");
    expect(fmtDollar(999499)).toBe("$999K");
    expect(fmtDollar(1_500_000)).toBe("$1.5M");
  });
});

describe("computeBedsideImpact", () => {
  it("annualizes doc hours off shifts/year (FTEs x 156)", () => {
    expect(deriveShiftsPerYear(baseline)).toBe(15600);
    const inputs = inputsWith({
      bedsidePresence: { bedsidePriority: "", measuringBedside: "", docHoursPerShift: 2 },
    });
    expect(computeBedsideImpact(inputs.bedsidePresence, baseline).annualDocHours).toBe(31200);
  });
});

describe("buildPrioritySummary surfaces all collected inputs", () => {
  it("reflects cost interventions in the staffing situation", () => {
    const inputs = inputsWith({
      staffingCosts: {
        costPressures: [2],
        otMinPerShift: 0,
        otFrequency: "",
        agencyMonthlySpend: 50000,
        costInterventions: [1, 3],
      },
    });
    const { situation } = buildPrioritySummary("staffingCosts", inputs, baseline);
    expect(situation).toMatch(/intervention/i);
  });

  it("reflects bedside priority and measurement status", () => {
    const inputs = inputsWith({
      bedsidePresence: { bedsidePriority: "leadership_priority", measuringBedside: "yes", docHoursPerShift: 2 },
    });
    const { situation } = buildPrioritySummary("bedsidePresence", inputs, baseline);
    expect(situation).toMatch(/priority/i);
    expect(situation).toMatch(/measur/i);
  });
});

describe("generateFocusNarrative", () => {
  it("does not throw on an unknown priority id", () => {
    const inputs = createEmptyPriorityInputs();
    const selected = ["retention", "bogus" as NursingPriority];
    expect(() => generateFocusNarrative(selected, inputs, baseline)).not.toThrow();
    const result = generateFocusNarrative(selected, inputs, baseline);
    expect(typeof result.situation).toBe("string");
  });
});
