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
        requiredSignal: { id: "access:schedulingWindow:required", label: "Days to third next available", baseline: "18 days", unit: "days" },
        optionalSignals: [
          { id: "access:schedulingWindow:optional-1", label: "New patient volume", baseline: "62", unit: "visits/mo" },
        ],
      },
      "retention:turnoverLines": {
        owner: "",
        due: "Month 6",
        requiredSignal: { id: "retention:turnoverLines:required", label: "Voluntary departures", baseline: "4", unit: "per quarter" },
        optionalSignals: [],
      },
    },
    goalOwnerByPriority: {
      access: { name: "Jamie Rivera", title: "VP Ambulatory Ops" },
    },
    progressEntries: {
      "access:schedulingWindow:required": [
        { date: "2026-04-01", value: 18 },
        { date: "2026-05-01", value: 15, note: "New EHR order set went live" },
        { date: "2026-06-01", value: 11 },
      ],
      "retention:turnoverLines:required": [
        { date: "2026-04-01", value: 4 },
      ],
    },
    baseline: { providers: 40, annualEncounters: 140000, utilizationPct: 78 },
    freedTimeSplit: 65,
    realizationByGoal: { access: 70, retention: 100 },
    planCadence: "monthly",
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
        planCadence: "quarterly",
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

    it("returns null when planCadence is missing or not a real cadence value", () => {
      const plan = buildSamplePlan();
      const { planCadence: _planCadence, ...withoutCadence } = plan;
      expect(decodeAttain(encodeAttain(withoutCadence as unknown as AttainSaveState))).toBeNull();

      const badCadence = LZString.compressToEncodedURIComponent(
        JSON.stringify({ ...plan, planCadence: "hourly" }),
      );
      expect(decodeAttain(badCadence)).toBeNull();
    });

    it("degrades gracefully on a version mismatch instead of throwing or returning a corrupt plan", () => {
      const plan = buildSamplePlan();
      const futurePayload = LZString.compressToEncodedURIComponent(
        JSON.stringify({ ...plan, version: ATTAIN_SAVE_VERSION + 999 }),
      );
      expect(() => decodeAttain(futurePayload)).not.toThrow();
      expect(decodeAttain(futurePayload)).toBeNull();
    });

    it("returns null for a malformed-but-nonempty v3 commitment (missing requiredSignal), never throwing", () => {
      const plan = buildSamplePlan();
      const corrupted = {
        ...plan,
        commitments: {
          ...plan.commitments,
          // A structurally-valid-but-corrupt commitment - object present,
          // but its required signal (the field StepAttainment/AttainFlow
          // read without a fallback) is missing entirely.
          "access:schedulingWindow": { owner: "Dr. Patel", due: "Month 3", optionalSignals: [] },
        },
      };
      const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(corrupted));
      expect(() => decodeAttain(encoded)).not.toThrow();
      expect(decodeAttain(encoded)).toBeNull();
    });

    it("returns null for a malformed-but-nonempty v3 commitment (requiredSignal missing a field, optionalSignals not an array), never throwing", () => {
      const plan = buildSamplePlan();
      const corrupted = {
        ...plan,
        commitments: {
          ...plan.commitments,
          "retention:turnoverLines": {
            owner: "",
            due: "Month 6",
            // `unit` dropped - a hand-edited or truncated link is still
            // valid JSON but no longer a well-formed CommitmentSignal.
            requiredSignal: { id: "retention:turnoverLines:required", label: "Voluntary departures", baseline: "4" },
            optionalSignals: "not-an-array",
          },
        },
      };
      const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(corrupted));
      expect(() => decodeAttain(encoded)).not.toThrow();
      expect(decodeAttain(encoded)).toBeNull();
    });

    it("still restores a valid plan's commitments (requiredSignal + optionalSignals) after the deep-validation gate", () => {
      const plan = buildSamplePlan();
      const decoded = decodeAttain(encodeAttain(plan));
      expect(decoded).toEqual(plan);
      expect(decoded?.commitments["access:schedulingWindow"].requiredSignal.label).toBe("Days to third next available");
      expect(decoded?.commitments["access:schedulingWindow"].optionalSignals).toHaveLength(1);
    });
  });
});
