import { describe, it, expect } from "vitest";
import { inpatientDischargesWarning } from "@/pages/attain/steps/StepScope";
import type { AttainBaseline } from "@/lib/attain/attainLevers";

describe("inpatient discharges plausibility guardrail (soft, not a block)", () => {
  it("warns when admissions per hospitalist are implausibly high", () => {
    const baseline: AttainBaseline = { providers: 40, annualEncounters: 140_000 };
    const warn = inpatientDischargesWarning("inpatient", baseline);
    expect(warn).toBeTruthy();
    expect(warn).toMatch(/3,500 discharges per hospitalist/);
    expect(warn).toMatch(/double-check/i);
  });

  it("stays quiet on a realistic inpatient discharge count", () => {
    const baseline: AttainBaseline = { providers: 45, annualEncounters: 45 * 400 };
    expect(inpatientDischargesWarning("inpatient", baseline)).toBeNull();
  });

  it("only applies to the inpatient setting", () => {
    const baseline: AttainBaseline = { providers: 40, annualEncounters: 140_000 };
    expect(inpatientDischargesWarning("outpatient", baseline)).toBeNull();
    expect(inpatientDischargesWarning("ed", baseline)).toBeNull();
  });

  it("stays quiet when a field is empty (no fabricated ratio)", () => {
    expect(inpatientDischargesWarning("inpatient", { providers: 0, annualEncounters: 140_000 })).toBeNull();
    expect(inpatientDischargesWarning("inpatient", { providers: 40, annualEncounters: 0 })).toBeNull();
  });

  it("carries no em dash or green/amber language in the hint", () => {
    const warn = inpatientDischargesWarning("inpatient", { providers: 40, annualEncounters: 140_000 })!;
    expect(warn).not.toMatch(/[—–]/);
    expect(warn.toLowerCase()).not.toMatch(/green|amber|warning|caution/);
  });
});
