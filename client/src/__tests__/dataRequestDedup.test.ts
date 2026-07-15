import { describe, it, expect } from "vitest";
import { getDriverFieldGroups, BASELINE_FIELDS } from "@/lib/dataRequestFields";

/**
 * A value driver must never re-ask a number already collected in the practice
 * profile (baseline). Drivers left with nothing unique to ask are dropped.
 */
describe("driver field dedup against the practice profile", () => {
  it("drops a driver whose only field duplicates a baseline field (label match)", () => {
    // Outpatient baseline includes "Net revenue per visit"; Patient Access asks
    // for the same thing under a different id, so the group should vanish.
    const groups = getDriverFieldGroups("outpatient", ["patientAccess", "wrvu"]);
    expect(groups.map(g => g.driverId)).toEqual(["wrvu"]);
  });

  it("keeps a driver but strips the duplicated field (id match)", () => {
    // ED baseline includes edRevenuePerVisit; LWBS Recovery re-asks the same id
    // but also asks for the LWBS rate, so the driver stays minus the dupe.
    const groups = getDriverFieldGroups("ed", ["lwbsRecovery"]);
    expect(groups).toHaveLength(1);
    const labels = groups[0].fields.map(f => f.label);
    expect(labels).toContain("Current LWBS rate (%)");
    expect(labels.some(l => l.toLowerCase().includes("net revenue per ed visit"))).toBe(false);
  });

  it("no surviving driver field collides with its setting's baseline", () => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const settings = ["outpatient", "ed", "inpatient", "nursing"] as const;
    for (const setting of settings) {
      const baselineLabels = new Set(BASELINE_FIELDS[setting].map(f => norm(f.label)));
      const baselineIds = new Set(BASELINE_FIELDS[setting].map(f => f.id));
      const allDriverIds = getDriverFieldGroups(setting, [
        "patientAccess", "wrvu", "hccCapture", "denialPrevention", "providerWellbeing",
        "physicianLocumAgency", "scribeCostReduction", "lwbsRecovery", "admissionCapture",
        "edEmLevel", "drgAccuracy", "obsDefense", "ipDischargePlanning", "ipProviderWellbeing",
        "nursingRetention", "nursingAgency", "nursingOvertime", "nursingHapi", "nursingFalls",
        "nursingCauti", "nursingClabsi", "nursingSepsis",
      ]);
      for (const group of allDriverIds) {
        expect(group.fields.length).toBeGreaterThan(0);
        for (const f of group.fields) {
          expect(baselineIds.has(f.id)).toBe(false);
          expect(baselineLabels.has(norm(f.label))).toBe(false);
        }
      }
    }
  });
});
