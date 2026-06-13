import { describe, it, expect } from "vitest";
import { computeRolloutSensitivity } from "@/lib/measureCalculator";

/**
 * Single source of truth for the Measure "rollout sensitivity" grid
 * (breadth = % of target providers, depth = % utilization). The on-screen grid
 * and the exported PDF grid must be identical — they previously showed two
 * different analyses under the same "Sensitivity" label.
 */

describe("computeRolloutSensitivity", () => {
  const base = {
    totalRealized: 1_000_000,
    combinedProviders: 100,
    baselineProviderCount: 50,
    baselineUtilPct: 70,
    investment: 200_000,
  };

  it("snaps the 'Now' cell to the closest breadth/depth and reproduces today's realized value", () => {
    const g = computeRolloutSensitivity(base);
    // baseline = 50 of 100 providers (50%) at 70% util → snaps to 50% / 70%
    expect(g.snapRow).toBe(50);
    expect(g.snapCol).toBe(70);
    const snap = g.cells.find((c) => c.isSnap)!;
    expect(snap.breadthPct).toBe(50);
    expect(snap.depthPct).toBe(70);
    // The "Now" cell equals today's realized value (cellScale = 1) and its ROI.
    expect(snap.value).toBe(1_000_000);
    expect(snap.roi).toBe(5);
  });

  it("scales value by (providers × depth) relative to the baseline", () => {
    const g = computeRolloutSensitivity(base);
    // 100% breadth (100 providers) × 90% depth, baseScale = 50 × 0.7 = 35
    // cellScale = (100 × 0.9) / 35 = 2.5714 → 2,571,429
    const cell = g.cells.find((c) => c.breadthPct === 100 && c.depthPct === 90)!;
    expect(cell.providers).toBe(100);
    expect(cell.value).toBe(2_571_429);
    expect(cell.roi).toBeCloseTo(2_571_429 / 200_000, 5);
  });

  it("returns null ROI when there is no investment", () => {
    const g = computeRolloutSensitivity({ ...base, investment: 0 });
    expect(g.hasInvestment).toBe(false);
    expect(g.cells.every((c) => c.roi === null)).toBe(true);
  });

  it("produces a 3×3 grid and zero values when there are no providers", () => {
    const g = computeRolloutSensitivity({ ...base, combinedProviders: 0, baselineProviderCount: 0 });
    expect(g.cells).toHaveLength(9);
    expect(g.cells.every((c) => c.value === 0)).toBe(true);
    expect(g.snapRow).toBe(100);
  });
});
