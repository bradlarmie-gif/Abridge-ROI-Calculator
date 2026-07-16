import { describe, it, expect } from "vitest";
import { computeNet, type AppRatItem } from "@/lib/appRationalizationCalc";

const mk = (o: Partial<AppRatItem>): AppRatItem => ({
  id: "x", category: "dictation", annualSpend: 0, coveragePct: 80, when: "thisYear", ...o,
});

// 180K@60% + 140K@50% + 100K@80% => sunset 108+70+80 = 258K, stays 162K, stack 420K
const stack: AppRatItem[] = [
  mk({ id: "a", annualSpend: 180_000, coveragePct: 60 }),
  mk({ id: "b", annualSpend: 140_000, coveragePct: 50 }),
  mk({ id: "c", annualSpend: 100_000, coveragePct: 80 }),
];

describe("computeNet", () => {
  it("net = sunset - price with a positive price", () => {
    const n = computeNet(stack, 120_000);
    expect(n.stackTotal).toBe(420_000);
    expect(n.sunset).toBe(258_000);
    expect(n.stays).toBe(162_000);
    expect(n.abridgePrice).toBe(120_000);
    expect(n.netSavings).toBe(138_000);
    expect(n.isNetCost).toBe(false);
  });
  it("price 0 -> net equals sunset, not a net cost", () => {
    const n = computeNet(stack, 0);
    expect(n.netSavings).toBe(258_000);
    expect(n.isNetCost).toBe(false);
  });
  it("price above sunset -> negative net, isNetCost true", () => {
    const n = computeNet(stack, 300_000);
    expect(n.netSavings).toBe(-42_000);
    expect(n.isNetCost).toBe(true);
  });
  it("negative price input clamps to 0", () => {
    const n = computeNet(stack, -50_000);
    expect(n.abridgePrice).toBe(0);
    expect(n.netSavings).toBe(258_000);
  });
  it("empty stack is zero-safe", () => {
    expect(computeNet([], 0)).toEqual({
      stackTotal: 0, sunset: 0, stays: 0, abridgePrice: 0, netSavings: 0, isNetCost: false,
    });
  });
});
