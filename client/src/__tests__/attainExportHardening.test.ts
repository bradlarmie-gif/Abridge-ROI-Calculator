import { describe, it, expect } from "vitest";
import { buildFromSnapshot } from "@/pages/attain/pdf/attainPdfData";
import type { AttainSnapshot } from "@/pages/attain/attainStorage";

// A saved "test" plan from an older build was failing "Export PDF" — a stale or
// partial snapshot made buildFromSnapshot return null (→ the "needs a care
// setting and at least one category" throw) or let an engine edge case throw.
// The exporter is now hardened: a valid SETTING is the only hard requirement;
// everything else degrades gracefully. These guard that so it can't regress.

function snap(overrides: Partial<AttainSnapshot>): AttainSnapshot {
  return {
    partner: "Test Health",
    phase: "experience",
    setting: "outpatient",
    goals: [],
    baseline: {},
    pickedByCat: {},
    playsByCat: {},
    answersByCat: {},
    inputsByCat: {},
    metricsByCat: {},
    readingsByCat: {},
    peopleByCat: {},
    reviewLog: [],
    savedAt: Date.now(),
    ...overrides,
  };
}

describe("Attain export hardening — a stale/partial plan still exports", () => {
  it("returns null ONLY when there is no care setting", () => {
    expect(buildFromSnapshot(null)).toBeNull();
    expect(buildFromSnapshot(undefined)).toBeNull();
    expect(buildFromSnapshot(snap({ setting: null }))).toBeNull();
  });

  it("a valid setting with NO goals still builds (falls back to the setting's categories)", () => {
    const built = buildFromSnapshot(snap({ setting: "outpatient", goals: [] }));
    expect(built).not.toBeNull();
    expect(built!.categories.length).toBeGreaterThan(0);
    expect(built!.data.setting).toBeTruthy();
  });

  it("goals that no longer map to a cell (schema drift) fall back instead of failing", () => {
    const built = buildFromSnapshot(snap({ setting: "outpatient", goals: ["legacy-id-x", "gone-y"] }));
    expect(built).not.toBeNull();
    expect(built!.categories.length).toBeGreaterThan(0);
  });

  it("never throws on a partial snapshot missing per-category records", () => {
    for (const setting of ["outpatient", "ed", "inpatient", "nursing"]) {
      const s = snap({ setting, goals: ["capacity", "revenue", "junk"] });
      // strip the optional maps to simulate an old save
      delete (s as Partial<AttainSnapshot>).customsByCat;
      delete (s as Partial<AttainSnapshot>).cadenceByCat;
      expect(() => buildFromSnapshot(s), setting).not.toThrow();
      expect(buildFromSnapshot(s), setting).not.toBeNull();
    }
  });
});
