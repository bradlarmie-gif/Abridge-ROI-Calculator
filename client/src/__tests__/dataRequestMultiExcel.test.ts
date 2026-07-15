import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx-js-style";
import { buildMultiDataRequestWorkbook } from "@/lib/dataRequestExcel";
import type { DataRequestSetting } from "@/lib/dataRequestFields";

const selectedBySetting: Record<DataRequestSetting, string[]> = {
  outpatient: ["patientAccess", "wrvu"],
  ed: ["lwbsRecovery", "admissionCapture"],
  inpatient: [],
  nursing: [],
};

describe("multi-setting data request workbook", () => {
  it("has Instructions first, then one Data Fields sheet per selected setting", () => {
    const wb = buildMultiDataRequestWorkbook(["outpatient", "ed"], selectedBySetting, "Test Health");
    expect(wb.SheetNames[0]).toBe("Instructions");
    expect(wb.SheetNames).toEqual(["Instructions", "Outpatient", "Emergency Dept"]);
  });

  it("styles each per-setting data sheet and serializes to a real file", () => {
    const wb = buildMultiDataRequestWorkbook(["outpatient", "ed"], selectedBySetting, "Test Health");
    for (const name of ["Outpatient", "Emergency Dept"]) {
      const sheet = wb.Sheets[name];
      expect((sheet["A1"] as { s?: unknown })?.s).toBeTruthy();
    }
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as Uint8Array;
    expect(buf.byteLength).toBeGreaterThan(3000);
  });

  it("builds for a single selected setting too", () => {
    const wb = buildMultiDataRequestWorkbook(["nursing"], { ...selectedBySetting, nursing: ["nursingRetention"] });
    expect(wb.SheetNames).toEqual(["Instructions", "Nursing"]);
  });
});
