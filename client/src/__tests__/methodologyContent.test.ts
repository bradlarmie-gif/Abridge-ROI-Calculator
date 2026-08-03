import { describe, it, expect } from "vitest";
import { METHODOLOGY_SETTINGS, METHODOLOGY_ORDER } from "@/lib/methodologyContent";

// Parse an illustrative formula ("248,000 × 5% × $33.40 × 90% realization")
// into its numeric operands and multiply them. Mirrors the exploreNarrative
// reconciliation approach: split on ×, strip $ and commas, treat % as /100,
// ignore trailing words.
function product(formula: string): number {
  const tokens = formula.split("×").map((t) => t.trim());
  return tokens.reduce((acc, tok) => {
    const m = tok.match(/-?[\d,]+(?:\.\d+)?%?/);
    if (!m) return acc;
    const raw = m[0].replace(/,/g, "");
    const n = raw.endsWith("%") ? parseFloat(raw) / 100 : parseFloat(raw);
    return Number.isNaN(n) ? acc : acc * n;
  }, 1);
}

describe("methodology content", () => {
  it("has all four settings in canonical order", () => {
    expect(METHODOLOGY_ORDER).toEqual(["outpatient", "ed", "inpatient", "nursing"]);
    expect(METHODOLOGY_SETTINGS.map((s) => s.id)).toEqual(METHODOLOGY_ORDER);
  });

  it("every setting is fully shaped (chain=3, signals=3, outcomes=3, attain=3, math>=1)", () => {
    for (const s of METHODOLOGY_SETTINGS) {
      expect(s.chain.length, `${s.id} chain`).toBe(3);
      expect(s.leadingSignals.length, `${s.id} signals`).toBe(3);
      expect(s.laggingOutcomes.length, `${s.id} outcomes`).toBe(3);
      expect(s.attain.length, `${s.id} attain`).toBe(3);
      expect(s.math.length, `${s.id} math`).toBeGreaterThanOrEqual(1);
      expect(s.lever.length).toBeGreaterThan(0);
    }
  });

  it("every illustrative formula multiplies to its stated value (reconciles)", () => {
    for (const s of METHODOLOGY_SETTINGS) {
      for (const line of s.math) {
        expect(
          Math.abs(product(line.formula) - line.value),
          `${s.id} / ${line.name}: ${line.formula} != ${line.value}`,
        ).toBeLessThanOrEqual(Math.max(50, line.value * 0.005));
      }
    }
  });

  it("outpatient carries the locked, validated figures", () => {
    const op = METHODOLOGY_SETTINGS.find((s) => s.id === "outpatient")!;
    const names = op.math.map((m) => m.name);
    expect(names).toContain("wRVU capture");
    expect(op.math.find((m) => m.name === "wRVU capture")!.value).toBe(372744);
  });
});
