import { describe, it, expect } from "vitest";
import {
  SETTING_META,
  DRIVERS,
  buildRoiState,
  runRoi,
  defaultVals,
  defaultEnabled,
  type SettingKey,
  type RoiAccount,
} from "@/pages/forecast/roiEngine";
import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";

const SETTINGS: SettingKey[] = ["outpatient", "ed", "inpatient", "nursing"];

function accountFor(s: SettingKey): RoiAccount {
  const d = SETTING_META[s].defaults;
  const tm = SETTING_META[s].timeMetric;
  return {
    totalProviders: d.totalProviders,
    onAbridge: d.onAbridge,
    encPerProvider: d.encPerProvider,
    utilNow: d.utilNow,
    minutesSaved: s === "nursing" || !tm ? 0 : tm.before - tm.after,
    staffedBeds: d.staffedBeds,
    occupancy: d.occupancy,
  };
}

/** Every driver on — the strongest reconciliation surface. */
function allOn(s: SettingKey): Record<string, boolean> {
  return Object.fromEntries(DRIVERS[s].map((dr) => [dr.id, true]));
}

describe("ROI Calculator reconciles with the Explore engine", () => {
  // The dollar the UI shows for a driver IS computeAllDriverValues[id]. If a
  // future change makes runRoi post-process the engine output, this fails.
  for (const s of SETTINGS) {
    it(`${s}: every displayed driver value equals computeAllDriverValues`, () => {
      const account = accountFor(s);
      const vals = defaultVals(s);
      const enabled = allOn(s);
      const run = runRoi(s, account, vals, enabled);
      const { state, totalHoursSaved } = buildRoiState(s, account, vals, enabled);
      const engine = computeAllDriverValues(state, totalHoursSaved);
      for (const dr of DRIVERS[s]) {
        expect(run.valueById[dr.id] ?? 0).toBe(engine[dr.id] ?? 0);
      }
      // The headline total is exactly the sum of the enabled drivers' engine values.
      const sum = DRIVERS[s].reduce((acc, dr) => acc + (run.valueById[dr.id] ?? 0), 0);
      expect(run.total).toBe(sum);
    });
  }

  it("gating holds: ED has no HCC, inpatient has no wRVU / E&M", () => {
    const ed = runRoi("ed", accountFor("ed"), defaultVals("ed"), allOn("ed"));
    expect(ed.valueById.hccCapture ?? 0).toBe(0);
    expect(DRIVERS.ed.some((d) => d.id === "hccCapture")).toBe(false);

    const ip = runRoi("inpatient", accountFor("inpatient"), defaultVals("inpatient"), allOn("inpatient"));
    expect(ip.valueById.wrvu ?? 0).toBe(0);
    expect(ip.valueById.edEmLevel ?? 0).toBe(0);
  });

  it("the measured wRVU before/after flows through the engine as a real lift", () => {
    const account = accountFor("outpatient");
    const vals = { ...defaultVals("outpatient"), wrvuBefore: 1.95, wrvuAfter: 2.03, cf: 33.4, wrvuRealization: 75 };
    const enabled = { ...defaultEnabled("outpatient"), wrvu: true };
    const run = runRoi("outpatient", account, vals, enabled);
    const eligible = Math.round(account.onAbridge * account.encPerProvider * (account.utilNow / 100));
    const expected = eligible * (2.03 - 1.95) * 33.4 * 0.75;
    expect(run.valueById.wrvu).toBeGreaterThan(0);
    // Within engine float/rounding of the hand computation.
    expect(Math.abs(run.valueById.wrvu - expected)).toBeLessThan(Math.max(5, expected * 0.001));
  });

  it("realization is a live lever: dropping it lowers the number", () => {
    const account = accountFor("outpatient");
    const enabled = { ...defaultEnabled("outpatient"), wrvu: true };
    const full = runRoi("outpatient", account, { ...defaultVals("outpatient"), wrvuRealization: 75 }, enabled);
    const half = runRoi("outpatient", account, { ...defaultVals("outpatient"), wrvuRealization: 50 }, enabled);
    expect(half.valueById.wrvu).toBeLessThan(full.valueById.wrvu);
  });

  it("headroom: expanding adoption and utilization never lowers the total", () => {
    for (const s of SETTINGS) {
      const account = accountFor(s);
      const vals = defaultVals(s);
      const enabled = defaultEnabled(s);
      const today = runRoi(s, account, vals, enabled);
      const potential = runRoi(s, account, vals, enabled, { adoptionPct: 100, utilPct: 100 });
      expect(potential.total).toBeGreaterThanOrEqual(today.total);
    }
  });
});
