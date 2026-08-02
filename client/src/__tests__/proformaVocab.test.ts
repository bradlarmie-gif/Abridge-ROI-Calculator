import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { settingVocab } from "@/pages/proforma/proformaTypes";

/**
 * PROFORMA INTEGRITY HARNESS — per-setting vocabulary guard.
 *
 * Every setting's chrome (subtitle, provider/encounter nouns) must come from the
 * single `settingVocab` helper, so a nursing deal never reads "providers" /
 * "encounters" and inpatient never reads "Primary care & specialty". Catches the
 * B2/M1/M2/M5 domain-fit class from the proforma audit.
 */

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "..");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

describe("Proforma per-setting vocabulary", () => {
  it("settingVocab returns the right words per setting", () => {
    expect(settingVocab("nursing").providerWord).toBe("nurses");
    expect(settingVocab("nursing").encounterNoun).toBe("patient-days");
    expect(settingVocab("nursing").subtitle).toBe("Inpatient nursing");
    expect(settingVocab("inpatient").encounterNoun).toBe("discharges");
    expect(settingVocab("inpatient").subtitle).toBe("Hospital medicine");
    expect(settingVocab("ed").encounterNoun).toBe("ED visits");
    expect(settingVocab("ed").subtitle).toBe("Emergency department");
    expect(settingVocab("outpatient").providerWord).toBe("providers");
    expect(settingVocab("outpatient").subtitle).toBe("Primary care & specialty");
    // unknown / null falls back to the outpatient (generic) vocabulary
    expect(settingVocab(null).providerWord).toBe("providers");
  });

  it("the chrome no longer hardcodes setting-specific nouns (must use settingVocab)", () => {
    // The old ED-only subtitle ternary and encounter ternary must be gone —
    // they broke Inpatient/Nursing. The only place these literals may live is
    // the settingVocab helper itself (proformaTypes).
    const workbench = read("pages/proforma/editorial/ProformaWorkbench.tsx");
    expect(workbench).not.toContain('"Primary care & specialty"');
    expect(workbench).not.toMatch(/"Emergency department"\s*:/);

    const pdf = read("components/proforma/ProformaPDFExport.tsx");
    expect(pdf).not.toMatch(/"ED visits \/ yr"\s*:/);
  });
});
