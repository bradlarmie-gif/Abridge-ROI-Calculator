import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx-js-style";
import { buildDataRequestWorkbook } from "@/lib/dataRequestExcel";
import type { DataRequestSetting } from "@/lib/dataRequestFields";

/**
 * Guard: the data-request workbook must build for every care setting, carry its
 * cell styles (the bug we fixed — the old `xlsx` lib silently dropped them), and
 * serialize to a real file without throwing. Keeps a bad field config from
 * shipping a corrupt or unstyled spreadsheet.
 */

const DRIVERS: Record<DataRequestSetting, string[]> = {
  outpatient: ["patientAccess", "wrvu", "denialPrevention", "providerWellbeing", "scribeCostReduction"],
  ed: ["lwbsRecovery", "admissionCapture", "edEmLevel", "providerWellbeing"],
  inpatient: ["drgAccuracy", "obsDefense", "ipProviderWellbeing"],
  nursing: ["nursingRetention", "nursingOvertime", "nursingHapi", "nursingFalls"],
};

describe("data request workbook", () => {
  it.each(Object.keys(DRIVERS) as DataRequestSetting[])(
    "builds a styled, non-empty workbook for %s",
    (setting) => {
      const wb = buildDataRequestWorkbook(setting, DRIVERS[setting], "Test Health");
      expect(wb.SheetNames).toContain("Instructions");
      expect(wb.SheetNames).toContain("Data Fields");

      // The header cell must carry a style object — proves styling is attached
      // (the whole point of the xlsx-js-style swap).
      const dataSheet = wb.Sheets["Data Fields"];
      expect((dataSheet["A1"] as { s?: unknown })?.s).toBeTruthy();

      // Serializes to a real .xlsx without throwing, and isn't trivially empty.
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as Uint8Array;
      expect(buf.byteLength).toBeGreaterThan(2000);
    },
  );
});
