import { describe, it, expect } from "vitest";
import { retirementYear, type AppRatItem, type AppRatWhen } from "@/lib/appRationalizationCalc";

const item = (when: AppRatWhen): AppRatItem => ({
  id: "x", category: "dictation", annualSpend: 1_000_000, coveragePct: 80, when,
});

describe("retirementYear (when -> contract year)", () => {
  const ry = (when: AppRatWhen, term = 3) => retirementYear(item(when), term);
  it("thisYear -> year 1", () => expect(ry("thisYear")).toBe(1));
  it("nextYear -> year 2", () => expect(ry("nextYear")).toBe(2));
  it("year3 -> year 3", () => expect(ry("year3")).toBe(3));
  it("notSure -> the last year of the term", () => expect(ry("notSure")).toBe(3));
  it("notSure respects a shorter term", () => expect(ry("notSure", 2)).toBe(2));
  it("year3 clamps down when the term is shorter", () => expect(ry("year3", 2)).toBe(2));
  it("nextYear clamps down to a 1-year term", () => expect(ry("nextYear", 1)).toBe(1));
  it("term is floored at 1", () => expect(retirementYear(item("year3"), 0)).toBe(1));
});
