import { describe, it, expect } from "vitest";
import { retirementYear, type AppRatItem } from "@/lib/appRationalizationCalc";

const item = (renewal?: string): AppRatItem => ({
  id: "x", category: "dictation", annualSpend: 1_000_000, coveragePct: 80, transitionMonths: 12, renewal,
});

describe("retirementYear (currentYear injected = 2026, termYears = 3)", () => {
  const ry = (renewal?: string, term = 3) => retirementYear(item(renewal), term, 2026);
  it("Open term retires now (year 1)", () => expect(ry("Open term")).toBe(1));
  it("current year retires in year 1", () => expect(ry("2026")).toBe(1));
  it("a mid-year-2027 string retires in year 2", () => expect(ry("Mid 2027")).toBe(2));
  it("2028 retires in year 3", () => expect(ry("2028")).toBe(3));
  it("a year beyond the term clamps to the last year", () => expect(ry("2030")).toBe(3));
  it("a year before now clamps to year 1", () => expect(ry("2024")).toBe(1));
  it("Unknown holds to the last year", () => expect(ry("Unknown")).toBe(3));
  it("empty renewal holds to the last year", () => expect(ry(undefined)).toBe(3));
  it("respects a different term length", () => expect(ry("2030", 5)).toBe(5)); // 2030-2026+1 = 5
  it("term is floored at 1", () => expect(retirementYear(item("2028"), 0, 2026)).toBe(1));
});
