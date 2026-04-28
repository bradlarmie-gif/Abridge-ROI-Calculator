import { describe, it, expect } from "vitest";
import {
  calcHapi,
  calcFalls,
  calcCauti,
  calcClabsi,
  calcSepsis,
} from "@/lib/nursingQualityCalcs";

/**
 * Reconciliation guardrail for the Mercy Nursing Value Assessment PDF.
 *
 * The PDF prints a per-driver "math text" of the form:
 *
 *   <events> × <prevention%> × <cost>/event   →   $value
 *
 * The on-page `value` is computed by the engine in ExploreModel.tsx via the
 * shared helpers in @/lib/nursingQualityCalcs. These tests assert that for
 * every quantified nursing-quality driver, the multiplicands the PDF prints
 * actually multiply out to the engine `value`.
 *
 * If the engine adds a new field (e.g. a per-driver realization haircut, a
 * sub-population adjustment, or a separate "preventable share" multiplier),
 * the helper output will diverge from the printed multiplicands and these
 * tests will fail — forcing the PDF text and NursingPDFInput shape to be
 * brought back in lockstep.
 */

const CLOSE = 5; // currency tolerance ($) for floating-point round-trip

describe("Nursing PDF reconciliation — engine math vs. printed formula", () => {
  // Representative Mercy-style inpatient unit: 350 staffed beds × 82% occupancy
  const patientDays = 350 * (82 / 100) * 365; // ≈ 104,755

  it("HAPI: printed multiplicands reconcile to engine value", () => {
    const inputs = { patientDays, rate: 2.5, preventionPct: 6.5, cost: 25_000 };
    const r = calcHapi(inputs);

    // Printed PDF formula: events × preventionPct% × cost
    const printed = r.events * (inputs.preventionPct / 100) * inputs.cost;

    expect(r.value).toBeCloseTo(printed, 2);
    expect(r.events).toBeCloseTo((patientDays / 1000) * inputs.rate, 5);
  });

  it("Falls: printed multiplicands reconcile to engine value", () => {
    const inputs = { patientDays, rate: 3.5, preventionPct: 10, cost: 6_500 };
    const r = calcFalls(inputs);

    const printed = r.events * (inputs.preventionPct / 100) * inputs.cost;

    expect(r.value).toBeCloseTo(printed, 2);
  });

  it("CAUTI: cath-days × rate × prevention × cost reconciles to engine value", () => {
    const inputs = {
      patientDays,
      utilizationPct: 30,
      rate: 1.8,
      preventionPct: 12,
      cost: 13_000,
    };
    const r = calcCauti(inputs);

    expect(r.catheterDays).toBeCloseTo(patientDays * (inputs.utilizationPct / 100), 5);
    expect(r.events).toBeCloseTo((r.catheterDays / 1000) * inputs.rate, 5);

    const printed = r.events * (inputs.preventionPct / 100) * inputs.cost;
    expect(r.value).toBeCloseTo(printed, 2);
  });

  it("CLABSI: line-days × rate × prevention × cost reconciles to engine value", () => {
    const inputs = {
      patientDays,
      utilizationPct: 20,
      rate: 0.8,
      preventionPct: 8,
      cost: 20_000,
    };
    const r = calcClabsi(inputs);

    expect(r.lineDays).toBeCloseTo(patientDays * (inputs.utilizationPct / 100), 5);
    expect(r.events).toBeCloseTo((r.lineDays / 1000) * inputs.rate, 5);

    const printed = r.events * (inputs.preventionPct / 100) * inputs.cost;
    expect(r.value).toBeCloseTo(printed, 2);
  });

  it("Sepsis: cases × non-comp × doc-lag × cost × realization reconciles to engine value", () => {
    const inputs = {
      patientDays,
      ratePerThousand: 2.0,
      currentCompliancePct: 75,
      docLagPct: 30,
      excessCostPerCase: 3_500,
      realizationPct: 60,
    };
    const r = calcSepsis(inputs);

    expect(r.complianceGapPct).toBe(25);
    expect(r.events).toBeCloseTo((patientDays / 1000) * inputs.ratePerThousand, 5);
    expect(r.nonCompliant).toBeCloseTo(r.events * 0.25, 5);
    expect(r.docLagCases).toBeCloseTo(r.nonCompliant * 0.3, 5);

    // Printed PDF formula:
    //   sepsisCases × complianceGapPct% × docLagPct% × cost/case × realization%
    const printed =
      r.events *
      (r.complianceGapPct / 100) *
      (inputs.docLagPct / 100) *
      inputs.excessCostPerCase *
      (inputs.realizationPct / 100);

    expect(r.value).toBeCloseTo(printed, 2);
  });

  it("Sepsis: clamps non-compliance to 0 when current compliance ≥ 100%", () => {
    const r = calcSepsis({
      patientDays,
      ratePerThousand: 2.0,
      currentCompliancePct: 105,
      docLagPct: 30,
      excessCostPerCase: 3_500,
      realizationPct: 60,
    });
    expect(r.complianceGapPct).toBe(0);
    expect(r.value).toBe(0);
  });

  it("End-to-end: rounding the helper value matches the engine's Math.round(value)", () => {
    // Mirrors how ExploreModel.tsx writes allDriverValues.nursingHapi.
    const r = calcHapi({ patientDays, rate: 2.5, preventionPct: 6.5, cost: 25_000 });
    const enginePersisted = Math.round(r.value);
    // Re-derive from the same input fields the PDF carries:
    const printedAndRounded = Math.round(
      ((patientDays / 1000) * 2.5) * (6.5 / 100) * 25_000,
    );
    expect(Math.abs(enginePersisted - printedAndRounded)).toBeLessThanOrEqual(CLOSE);
  });
});
