import { describe, it, expect } from "vitest";
import { ATTAIN_MATRIX } from "@/pages/attain/preview/attainCells";
import type { AttainCell } from "@/pages/attain/preview/attainContent";

/**
 * VOCABULARY GUARD. Attain content is authored per care setting, and some of it is
 * built by shared factories (retentionCell across all four settings). That reuse is
 * exactly how setting-wrong wording leaks in: a nurse is not a "provider", nurses use
 * "travel/agency" not "locums", and they work "at the bedside" not "in the visit".
 *
 * This test walks every customer-visible string in each cell (including the RESOLVED
 * category heading, categoryLabel ?? category) and fails if a word appears that does
 * not belong in that setting. A consistency check can't catch this — a label that is
 * consistently wrong everywhere still matches itself — so we assert against the domain.
 */

const displayLabel = (c: AttainCell) => c.categoryLabel ?? c.category;

// every human-visible string on a cell: the resolved heading + all string values,
// excluding the raw `category`/`categoryLabel` fields (the heading is added once, resolved).
function visibleStrings(cell: AttainCell): string[] {
  const out: string[] = [displayLabel(cell)];
  const walk = (v: unknown) => {
    if (typeof v === "string") return void out.push(v);
    if (Array.isArray(v)) return v.forEach(walk);
    if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v)) {
        // skip internal identifiers (never shown as prose) + the raw category key (heading added resolved, above)
        if (k === "category" || k === "categoryLabel" || k === "id" || k === "defaultId") continue;
        walk(val);
      }
    }
  };
  walk(cell);
  return out;
}

// words that must never appear in a setting's customer-visible copy
const FORBIDDEN: Record<string, { word: string; re: RegExp; why: string }[]> = {
  Nursing: [
    { word: "provider", re: /\bproviders?\b/i, why: "nurses aren't providers" },
    { word: "clinician", re: /\bclinicians?\b/i, why: "use 'nurse', not 'clinician'" },
    { word: "physician", re: /\bphysicians?\b/i, why: "this is nursing content" },
    { word: "locum", re: /\blocums?\b/i, why: "nurses use travel/agency, not locums" },
    { word: "visit", re: /\bvisits?\b/i, why: "nurses work shifts at the bedside, not visits" },
    { word: "encounter", re: /\bencounters?\b/i, why: "nurses document across shifts, not billable encounters" },
  ],
  Outpatient: [
    { word: "nurse", re: /\bnurses?\b/i, why: "outpatient content is clinician-framed" },
    { word: "hospitalist", re: /\bhospitalists?\b/i, why: "hospitalist is an inpatient role" },
    { word: "DRG", re: /\bDRG\b/, why: "DRG grouping is inpatient (outpatient bills APCs/E&M)" },
    { word: "boarding", re: /\bboarding\b/i, why: "boarding is an ED concept" },
  ],
  ED: [
    { word: "hospitalist", re: /\bhospitalists?\b/i, why: "hospitalist is an inpatient role" },
    { word: "outpatient", re: /\boutpatient\b/i, why: "this is ED content" },
    { word: "DRG", re: /\bDRG\b/, why: "DRG grouping is inpatient" },
  ],
  Inpatient: [
    { word: "outpatient", re: /\boutpatient\b/i, why: "this is inpatient content" },
    { word: "nurse", re: /\bnurses?\b/i, why: "inpatient revenue/retention is clinician-framed" },
  ],
};

describe("Attain vocabulary fits each care setting", () => {
  for (const cell of ATTAIN_MATRIX) {
    const rules = FORBIDDEN[cell.setting] ?? [];
    it(`${cell.setting} · ${displayLabel(cell)}: no setting-wrong wording`, () => {
      const strings = visibleStrings(cell);
      for (const rule of rules) {
        const hit = strings.find((s) => rule.re.test(s));
        expect(hit, `"${rule.word}" (${rule.why}) found in: ${hit ?? ""}`).toBeUndefined();
      }
    });
  }

  it("Nursing content actually speaks about nurses", () => {
    const nursing = ATTAIN_MATRIX.filter((c) => c.setting === "Nursing");
    for (const cell of nursing) {
      const speaks = visibleStrings(cell).some((s) => /\bnurses?\b/i.test(s));
      expect(speaks, `${displayLabel(cell)} never says "nurse"`).toBe(true);
    }
  });

  it("the retention heading is setting-appropriate", () => {
    const label = (setting: string) => displayLabel(ATTAIN_MATRIX.find((c) => c.setting === setting && c.category === "Provider Retention")!);
    expect(label("Nursing")).toBe("Nurse Retention");
    expect(label("Outpatient")).toBe("Provider Retention");
    expect(label("ED")).toBe("Provider Retention");
    expect(label("Inpatient")).toBe("Provider Retention");
  });
});
