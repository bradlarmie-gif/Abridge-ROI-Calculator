import { describe, it, expect } from "vitest";
import { LEVERS, IP_REVENUE_LEVERS, ED_ACCESS_LEVERS, type Lever } from "@/lib/attain/attainLevers";
import type { GoalId } from "@/lib/attain/attainTypes";

/**
 * Guardrail for Commit's Change 2 (Owner: curated Select + Custom) and
 * Change 3 (Signal: curated Select + Custom).
 *
 * Every lever the Commit page can render a decision for must carry its own
 * curated `ownerRoleOptions` / `signalOptions` list as CATALOG DATA (not
 * something the component invents at render time), always headed by the
 * lever's own default `ownerRole` / `signal` (index 0), so the Select's
 * pre-selected value always matches the decision's existing default and
 * every option is a real plausible choice for that specific decision, never
 * a generic list shared verbatim across every lever.
 */

const ALL_LEVERS: Lever[] = [
  ...(Object.keys(LEVERS) as GoalId[]).flatMap((g) => LEVERS[g]),
  ...IP_REVENUE_LEVERS,
  ...ED_ACCESS_LEVERS,
];

describe("Lever.ownerRoleOptions / Lever.signalOptions (Commit curated Select+Custom data)", () => {
  it("every lever in every catalog defines both option lists", () => {
    expect(ALL_LEVERS.length).toBeGreaterThan(30);
    for (const lever of ALL_LEVERS) {
      expect(Array.isArray(lever.ownerRoleOptions), `${lever.id} ownerRoleOptions`).toBe(true);
      expect(Array.isArray(lever.signalOptions), `${lever.id} signalOptions`).toBe(true);
    }
  });

  it("ownerRoleOptions always starts with the lever's own default ownerRole (2-5 total, no dupes)", () => {
    for (const lever of ALL_LEVERS) {
      expect(lever.ownerRoleOptions[0], lever.id).toBe(lever.ownerRole);
      expect(lever.ownerRoleOptions.length, `${lever.id} length`).toBeGreaterThanOrEqual(2);
      expect(lever.ownerRoleOptions.length, `${lever.id} length`).toBeLessThanOrEqual(5);
      expect(new Set(lever.ownerRoleOptions).size, `${lever.id} dupes`).toBe(lever.ownerRoleOptions.length);
      for (const role of lever.ownerRoleOptions) {
        expect(role.trim().length, `${lever.id} blank role`).toBeGreaterThan(0);
      }
    }
  });

  it("signalOptions always starts with the lever's own default signal (2-4 total, no dupes)", () => {
    for (const lever of ALL_LEVERS) {
      expect(lever.signalOptions[0], lever.id).toBe(lever.signal);
      expect(lever.signalOptions.length, `${lever.id} length`).toBeGreaterThanOrEqual(2);
      expect(lever.signalOptions.length, `${lever.id} length`).toBeLessThanOrEqual(4);
      expect(new Set(lever.signalOptions).size, `${lever.id} dupes`).toBe(lever.signalOptions.length);
      for (const sig of lever.signalOptions) {
        expect(sig.trim().length, `${lever.id} blank signal`).toBeGreaterThan(0);
      }
    }
  });

  it("every lever id across every catalog is unique (sanity check on the fixture itself)", () => {
    const ids = ALL_LEVERS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
