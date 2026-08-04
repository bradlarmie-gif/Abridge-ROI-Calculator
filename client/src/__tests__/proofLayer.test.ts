import { describe, it, expect } from "vitest";
import { PROOF_LAYER, isProofDomain, type ProofDomain } from "@/lib/proofLayer";
import { METHODOLOGY_SETTINGS } from "@/lib/methodologyContent";

// The proof layer is the SINGLE source of which domain is the non-financial
// (tracked) layer per setting. These tests pin that designation and guard the
// live surfaces from silently disagreeing with it (the CRITICAL triplication).
describe("proof layer — single source of the tracked-domain designation", () => {
  it("pins the canonical four-domains map", () => {
    const proofDomainsFor = (s: string) => Object.keys(PROOF_LAYER[s] ?? {}).sort();
    expect(proofDomainsFor("outpatient")).toEqual(["Quality"]);
    expect(proofDomainsFor("ed")).toEqual(["Quality"]);
    expect(proofDomainsFor("inpatient")).toEqual(["Capacity", "Quality"]);
    expect(proofDomainsFor("nursing")).toEqual(["Revenue"]);
  });

  it("isProofDomain agrees with the map, both ways", () => {
    expect(isProofDomain("inpatient", "Capacity")).toBe(true);
    expect(isProofDomain("nursing", "Revenue")).toBe(true);
    // counter-examples: these carry a dollar, so they are NOT the proof layer
    expect(isProofDomain("outpatient", "Capacity")).toBe(false);
    expect(isProofDomain("ed", "Capacity")).toBe(false);
    expect(isProofDomain("nursing", "Quality")).toBe(false);
    expect(isProofDomain(null, "Quality")).toBe(false);
  });
});

describe("methodologyContent proofNotes agree with the proof layer", () => {
  const bySetting = Object.fromEntries(METHODOLOGY_SETTINGS.map((s) => [s.id, s]));

  it("every setting names its tracked layer as tracked, not counted", () => {
    for (const s of METHODOLOGY_SETTINGS) {
      expect(s.proofNote.toLowerCase(), `${s.id} proofNote`).toContain("tracked, not counted");
    }
  });

  it("ED never calls its counted throughput/LWBS dollar 'tracked' (the self-contradiction bug)", () => {
    const ed = bySetting["ed"];
    // ED counts an LWBS/throughput dollar in its math...
    expect(ed.math.some((m) => /lwbs|throughput/i.test(m.name))).toBe(true);
    // ...so the proofNote must frame that recovery as COUNTED, not tracked.
    expect(ed.proofNote).toMatch(/counted capacity dollar/i);
    expect(ed.proofNote).not.toMatch(/LWBS\)\s*are tracked/i);
  });

  it("nursing keeps Revenue as the tracked layer (matches PROOF_LAYER)", () => {
    expect(isProofDomain("nursing", "Revenue")).toBe(true);
    expect(bySetting["nursing"].proofNote.toLowerCase()).toContain("revenue is tracked, not counted");
  });
});
