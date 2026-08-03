import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { scanFiles, formatHits } from "./support/copyGuardrail";

/**
 * LAYER 2 of the Explore integrity harness — COPY guardrails (the mechanical
 * half of "Legal / Marketing / Brad won't be upset").
 *
 * The objective tripwires live in ./support/copyGuardrail (shared across all
 * four tools so a rule is added once, not per copy). This file supplies the
 * live Explore surface (editorial screens + the value-model PDF + driver
 * labels/descriptions) and keeps the Explore-specific domain-fit checks below.
 */

const here = dirname(fileURLToPath(import.meta.url));
const CLIENT_SRC = join(here, "..");

const FILES: string[] = [
  ...readdirSync(join(CLIENT_SRC, "pages/explore/editorial"))
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => join("pages/explore/editorial", f)),
  "components/explore/ExploreEditorialPdf.tsx",
  "components/explore/ExploreEditorialPdfRoute.tsx",
  "lib/exploreDrivers.ts",
];

describe("Explore COPY guardrails — Legal / brand tripwires", () => {
  it("no em dashes, no causal/guarantee absolutes, no 'credited to' in live Explore copy", () => {
    const hits = scanFiles(CLIENT_SRC, FILES);
    expect(hits.length, `Copy guardrail hits (${hits.length}):\n${formatHits(hits)}`).toBe(0);
  });
});

/**
 * PDF domain-fit guardrails. The editorial PDF renders every care setting from
 * one shape, so an Outpatient-shaped LITERAL silently breaks Nursing/Inpatient
 * (nursing's proof layer is Revenue, not Quality; nursing has no encounters;
 * a "four times" downside is only true for the OP sample). These lock the
 * proof caption/footer, the encounter noun, and the downside multiple to
 * per-setting derivation so the class can't regress.
 */
describe("Explore PDF — proof/encounter/downside phrasing is setting-derived, not hardcoded", () => {
  const pdf = readFileSync(join(CLIENT_SRC, "components/explore/ExploreEditorialPdf.tsx"), "utf8");

  it("does not hardcode Quality as the proof layer (footer + synthesis caption)", () => {
    expect(pdf).not.toMatch(/Quality is tracked as proof/);
    expect(pdf).not.toMatch(/Quality · the proof running underneath/);
  });

  it("derives the proof caption/footer from PROOF_LAYER via the setting", () => {
    expect(pdf).toContain("proofDomainsFor(");
    expect(pdf).toContain("the proof running underneath, uncounted");
  });

  it("does not hardcode an Outpatient-shaped 'four times' downside multiple", () => {
    expect(pdf).not.toMatch(/four\s+times/i);
  });

  it("makes the volume noun setting-aware (nursing gets patient-days, not encounters)", () => {
    // the encounters stat cell must sit behind a nursing branch, never emit an
    // unconditional "Annual encounters" that nursing would inherit.
    expect(pdf).toContain("Annual patient-days");
    expect(pdf).toMatch(/isNursing[\s\S]{0,200}Annual patient-days/);
  });
});
