import { describe, it, expect } from "vitest";
import {
  makeItem, toolMonthlySaving, buildCumulativeSavings, cumulativeSavedAt, sunsetDateLabel,
  resolveAnnualSpend,
  type AppRatItem,
} from "@/lib/appRationalizationCalc";

const tool = (id: string, spend: number, pct: number, contractMonths: number, sunsetMonths: number, rampMonths = 0): AppRatItem =>
  ({ ...makeItem(id, "ambientDoc"), annualSpend: spend, coveragePct: pct, contractMonths, sunsetMonths, rampMonths });

describe("timing defaults", () => {
  it("makeItem seeds a 12-month contract sunsetting at renewal, with a 3-month displacement ramp", () => {
    const i = makeItem("a", "cds");
    expect(i.contractMonths).toBe(12);
    expect(i.sunsetMonths).toBe(12);
    expect(i.rampMonths).toBe(3);
  });
});

describe("displacement ramp (speed)", () => {
  it("a slower ramp lowers the plan total and widens the gap vs the instant ceiling", () => {
    // 120k/yr sunset = 10k/mo; contract & sunset at 6mo; horizon 36mo
    const instant = buildCumulativeSavings([tool("a", 120_000, 100, 6, 6, 0)], 36);
    const ramped = buildCumulativeSavings([tool("a", 120_000, 100, 6, 6, 6)], 36);
    // instant plan: (36-6)*10k = 300k. ramped plan: (36-6 - 6/2)*10k = 270k.
    expect(instant.planTotal).toBe(300_000);
    expect(ramped.planTotal).toBe(270_000);
    // the ceiling ("now") stays instant, so a slower ramp only widens the gap.
    expect(ramped.nowTotal).toBe(instant.nowTotal);
    expect(ramped.gap).toBeGreaterThan(instant.gap);
    expect(ramped.tools[0].rampMonths).toBe(6);
  });

  it("cumulativeSavedAt ramps the plan (triangular) but keeps the now ceiling instant", () => {
    const cs = buildCumulativeSavings([tool("a", 120_000, 100, 6, 6, 6)], 36);
    // plan at month 9 (t=3 into a 6mo ramp): 10k * 3^2/(2*6) = 7.5k
    expect(cumulativeSavedAt(cs.tools, 9, "plan")).toBe(7_500);
    // now (instant from month 0) at month 9: 9 * 10k = 90k
    expect(cumulativeSavedAt(cs.tools, 9, "now")).toBe(90_000);
  });
});

describe("resolveAnnualSpend", () => {
  it("takes the lump fee in flat mode (ignores seat inputs)", () => {
    expect(resolveAnnualSpend("flat", 250_000, 999, 999)).toBe(250_000);
  });
  it("multiplies seats x rate in per-user mode (ignores the flat field)", () => {
    expect(resolveAnnualSpend("perUser", 999_999, 120, 2_000)).toBe(240_000);
  });
  it("never goes negative and rounds", () => {
    expect(resolveAnnualSpend("flat", -50, 0, 0)).toBe(0);
    expect(resolveAnnualSpend("perUser", 0, 10, 33.3)).toBe(333);
  });
});

describe("toolMonthlySaving", () => {
  it("spreads the annual sunset value over 12 months", () => {
    // 120000 spend * 100% displace = 120000/yr sunset -> 10000/mo
    expect(toolMonthlySaving(tool("a", 120_000, 100, 12, 12))).toBe(10_000);
  });
});

describe("buildCumulativeSavings", () => {
  it("computes plan/now totals, gap, and early-exit deltas over the horizon", () => {
    // one tool: 120k/yr sunset = 10k/mo, contract 12mo, sunset pulled to 6mo, horizon 36mo
    const cs = buildCumulativeSavings([tool("a", 120_000, 100, 12, 6)], 36);
    expect(cs.hasCurve).toBe(true);
    expect(cs.tools).toHaveLength(1);
    // plan: saves for (36-6)=30 months * 10k = 300k
    expect(cs.planTotal).toBe(300_000);
    // now: saves for 36 months * 10k = 360k
    expect(cs.nowTotal).toBe(360_000);
    expect(cs.gap).toBe(60_000);
    // early: pulled 12-6=6 months early -> 6*10k = 60k captured sooner
    expect(cs.tools[0].earlyMonths).toBe(6);
    expect(cs.tools[0].earlySaving).toBe(60_000);
  });

  it("excludes tools that never sunset (monthlySaving === 0)", () => {
    const cs = buildCumulativeSavings([tool("a", 100_000, 0, 12, 12)], 36);
    expect(cs.hasCurve).toBe(false);
    expect(cs.tools).toHaveLength(0);
  });

  it("clamps sunsetMonths into [0, contractMonths]", () => {
    // sunset 99 but contract 12 -> treated as 12
    const cs = buildCumulativeSavings([tool("a", 120_000, 100, 12, 99)], 36);
    // saves for (36-12)=24 months * 10k = 240k
    expect(cs.planTotal).toBe(240_000);
    expect(cs.tools[0].sunsetMonths).toBe(12);
  });
});

describe("cumulativeSavedAt", () => {
  it("is zero before sunset and linear after, per mode", () => {
    const cs = buildCumulativeSavings([tool("a", 120_000, 100, 12, 6)], 36);
    expect(cumulativeSavedAt(cs.tools, 6, "plan")).toBe(0);
    expect(cumulativeSavedAt(cs.tools, 12, "plan")).toBe(60_000); // 6 months * 10k
    expect(cumulativeSavedAt(cs.tools, 12, "now")).toBe(120_000); // 12 months * 10k
  });
});

describe("sunsetDateLabel", () => {
  const from = new Date(2026, 6, 1); // Jul 2026 (month index 6)
  it("returns 'now' at month 0", () => {
    expect(sunsetDateLabel(0, from)).toBe("now");
  });
  it("returns a MMM YYYY date derived from months-from-now", () => {
    expect(sunsetDateLabel(6, from)).toBe("Jan 2027");
    expect(sunsetDateLabel(12, from)).toBe("Jul 2027");
  });
});
