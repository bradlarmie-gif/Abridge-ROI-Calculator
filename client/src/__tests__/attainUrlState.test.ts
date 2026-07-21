import { describe, it, expect } from "vitest";
import LZString from "lz-string";
import { encodeAttain, decodeAttain, ATTAIN_SAVE_VERSION, type AttainSaveState } from "@/lib/attain/attainUrlState";
import { DEFAULT_ATTAIN_STATE } from "@/lib/attain/attainTypes";

/** A representative multi-priority plan — two goals, per-goal lever values,
 * commitments with multiple signals each, a goal owner, logged progress
 * history on more than one signal, and a non-default freed-time split. This
 * is deliberately NOT the empty/default shape, so the round-trip test can
 * catch a field that silently drops instead of just echoing defaults back. */
function buildSamplePlan(): AttainSaveState {
  return {
    version: ATTAIN_SAVE_VERSION,
    savedAt: "2026-07-20T12:00:00.000Z",
    state: {
      ...DEFAULT_ATTAIN_STATE,
      setting: "outpatient",
      goal: "access",
      scope: { unitCount: 40, serviceLines: ["Cardiology", "Endocrinology"] },
      monthsElapsed: 4,
      totalMonths: 9,
      progressRatio: 0.82,
    },
    goals: ["access", "retention"],
    valuesByGoal: {
      access: { schedulingWindow: 3, panelGrowth: 12 },
      retention: { turnoverLines: ["reduce-onboarding", "mentor-pairing"] },
    },
    commitments: {
      "access:schedulingWindow": {
        owner: "Dr. Patel",
        due: "Month 3",
        signals: [
          { id: "access:schedulingWindow:s0", label: "Days to third next available", baseline: "18 days", unit: "days", cadence: "monthly" },
          { id: "access:schedulingWindow:s1", label: "New patient volume", baseline: "62", unit: "visits/mo", cadence: "quarterly" },
        ],
      },
      "retention:turnoverLines": {
        owner: "",
        due: "Month 6",
        signals: [
          { id: "retention:turnoverLines:s0", label: "Voluntary departures", baseline: "4", unit: "per quarter", cadence: "quarterly" },
        ],
      },
    },
    goalOwnerByPriority: {
      access: { name: "Jamie Rivera", title: "VP Ambulatory Ops" },
    },
    progressEntries: {
      "access:schedulingWindow:s0": [
        { date: "2026-04-01", value: 18 },
        { date: "2026-05-01", value: 15, note: "New EHR order set went live" },
        { date: "2026-06-01", value: 11 },
      ],
      "retention:turnoverLines:s0": [
        { date: "2026-04-01", value: 4 },
      ],
    },
    baseline: { providers: 40, annualEncounters: 140000, utilizationPct: 78 },
    freedTimeSplit: 65,
    realizationByGoal: { access: 70, retention: 100 },
  };
}

describe("attainUrlState", () => {
  describe("encodeAttain / decodeAttain round-trip", () => {
    it("round-trips a representative multi-priority plan with commitments and progress entries", () => {
      const plan = buildSamplePlan();
      const encoded = encodeAttain(plan);
      expect(typeof encoded).toBe("string");
      expect(encoded.length).toBeGreaterThan(0);

      const decoded = decodeAttain(encoded);
      expect(decoded).toEqual(plan);
    });

    it("round-trips a single-priority nursing plan with no commitments or progress yet", () => {
      const plan: AttainSaveState = {
        version: ATTAIN_SAVE_VERSION,
        savedAt: "2026-07-20T12:00:00.000Z",
        state: { ...DEFAULT_ATTAIN_STATE, setting: "nursing", goal: "quality" },
        goals: ["quality"],
        valuesByGoal: { quality: {} },
        commitments: {},
        goalOwnerByPriority: {},
        progressEntries: {},
        baseline: { staffedBeds: 120, nursingFtes: 90, dailyCensus: 96, adoptionPct: 55 },
        freedTimeSplit: 50,
        realizationByGoal: {},
      };
      const decoded = decodeAttain(encodeAttain(plan));
      expect(decoded).toEqual(plan);
    });

    it("produces a URL-safe string (no characters that need escaping in a query param)", () => {
      const encoded = encodeAttain(buildSamplePlan());
      expect(encoded).toMatch(/^[A-Za-z0-9+/=_-]*$/);
    });
  });

  describe("defensive decoding", () => {
    it("returns null for an empty string", () => {
      expect(decodeAttain("")).toBeNull();
    });

    it("returns null for garbage/malformed input, never throwing", () => {
      expect(() => decodeAttain("not-a-real-encoded-payload-!!!")).not.toThrow();
      expect(decodeAttain("not-a-real-encoded-payload-!!!")).toBeNull();
      expect(decodeAttain("%%%")).toBeNull();
      expect(decodeAttain(LZString.compressToEncodedURIComponent("null"))).toBeNull();
      expect(decodeAttain(LZString.compressToEncodedURIComponent("42"))).toBeNull();
      expect(decodeAttain(LZString.compressToEncodedURIComponent('"a string"'))).toBeNull();
    });

    it("returns null when the payload is valid JSON but missing required shape (no goals array)", () => {
      const badPayload = LZString.compressToEncodedURIComponent(
        JSON.stringify({ version: ATTAIN_SAVE_VERSION, state: {} }),
      );
      expect(decodeAttain(badPayload)).toBeNull();
    });

    it("degrades gracefully on a version mismatch instead of throwing or returning a corrupt plan", () => {
      const plan = buildSamplePlan();
      const futurePayload = LZString.compressToEncodedURIComponent(
        JSON.stringify({ ...plan, version: ATTAIN_SAVE_VERSION + 999 }),
      );
      expect(() => decodeAttain(futurePayload)).not.toThrow();
      expect(decodeAttain(futurePayload)).toBeNull();
    });
  });
});
