import { describe, it, expect } from "vitest";
import { getMultiRequestFieldPlan, getRequestFieldPlan, type DataRequestSetting } from "@/lib/dataRequestFields";

describe("getMultiRequestFieldPlan", () => {
  it("sums required and optional counts across settings", () => {
    const sel: Record<DataRequestSetting, string[]> = {
      outpatient: ["patientAccess"],
      ed: ["lwbsRecovery"],
      inpatient: [],
      nursing: [],
    };
    const multi = getMultiRequestFieldPlan(["outpatient", "ed"], sel);
    const op = getRequestFieldPlan("outpatient", sel.outpatient);
    const ed = getRequestFieldPlan("ed", sel.ed);

    expect(multi.requiredCount).toBe(op.requiredCount + ed.requiredCount);
    expect(multi.optionalCount).toBe(op.optionalCount + ed.optionalCount);
    expect(multi.perSetting.map(p => p.setting)).toEqual(["outpatient", "ed"]);
  });

  it("returns zero counts for no settings", () => {
    const multi = getMultiRequestFieldPlan([], { outpatient: [], ed: [], inpatient: [], nursing: [] });
    expect(multi).toEqual({ perSetting: [], requiredCount: 0, optionalCount: 0 });
  });
});
