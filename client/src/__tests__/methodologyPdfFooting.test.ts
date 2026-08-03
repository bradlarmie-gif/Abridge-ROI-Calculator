import { describe, it, expect } from "vitest";
import { METHODOLOGY_SETTINGS } from "@/lib/methodologyContent";

function product(formula: string): number {
  return formula.split("×").map((t) => t.trim()).reduce((acc, tok) => {
    const m = tok.match(/-?[\d,]+(?:\.\d+)?%?/);
    if (!m) return acc;
    const raw = m[0].replace(/,/g, "");
    const n = raw.endsWith("%") ? parseFloat(raw) / 100 : parseFloat(raw);
    return Number.isNaN(n) ? acc : acc * n;
  }, 1);
}

describe("Methodology PDF illustrative math foots", () => {
  it("every formula multiplies to its stated value", () => {
    for (const s of METHODOLOGY_SETTINGS) {
      for (const line of s.math) {
        expect(
          Math.abs(product(line.formula) - line.value),
          `${s.id} / ${line.name}`,
        ).toBeLessThanOrEqual(Math.max(50, line.value * 0.005));
      }
    }
  });

  it("nursing's dollar case stays modest and proof-forward (single counted line)", () => {
    const n = METHODOLOGY_SETTINGS.find((s) => s.id === "nursing")!;
    expect(n.math.length).toBe(1);
    expect(n.proofNote.toLowerCase()).toContain("proof");
  });
});
