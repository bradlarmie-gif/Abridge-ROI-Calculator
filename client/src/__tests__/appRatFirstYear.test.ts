import { describe, it, expect } from "vitest";
import { makeItem, firstYearSavings } from "@/lib/appRationalizationCalc";

// "First 12 months" must be cash actually freed in that window, never the
// run-rate of contracts that merely end by month 12.
const tool = (sunset: number, ramp = 0) => ({
  ...makeItem("t", "dictation"), annualSpend: 120_000, coveragePct: 100, contractMonths: 12, sunsetMonths: sunset, rampMonths: ramp,
});

describe("firstYearSavings", () => {
  it("is $0 when the only contract ends at month 12", () => {
    expect(firstYearSavings([tool(12)])).toBe(0);
  });
  it("counts only the months after the exit", () => {
    expect(firstYearSavings([tool(6)])).toBeCloseTo(60_000, 0);
  });
  it("is the full year when it comes off now with no ramp", () => {
    expect(firstYearSavings([tool(0)])).toBeCloseTo(120_000, 0);
  });
});
