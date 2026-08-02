import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

/**
 * LAYER 2 of the Explore integrity harness — COPY guardrails (the mechanical
 * half of "Legal / Marketing / Brad won't be upset").
 *
 * This catches the tripwires that are objective and repeatable. It does NOT
 * judge tone — that stays a human review pass. What it enforces on all
 * customer-facing Explore copy (editorial screens + the value-model PDF +
 * driver labels/descriptions):
 *
 *   - NO em dashes (—) anywhere. Brad's standing rule; also the #1 tell of
 *     "AI wrote this" that Legal/brand hate.
 *   - NO causal/guarantee absolutes ("guarantee", "ensures", "eliminates",
 *     "proven to", "causes X", "will <deliver/save/reduce…>"). Legal doctrine:
 *     Abridge surfaces/enables, it does not cause or guarantee outcomes.
 *   - "attributed to", never "credited to".
 *
 * A hit fails the gate with file:line so it can be adjudicated (mechanical →
 * fix; judgment → to Brad).
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

interface Hit {
  file: string;
  line: number;
  rule: string;
  text: string;
}

// We only gate CUSTOMER-FACING copy, so comment lines are excluded from every
// rule, and the "—" empty-state placeholder (a UI dash for "no value", always
// quoted and standalone) is not a prose em dash.
const isCommentLine = (l: string) => /^\s*(\/\/|\*|\/\*)/.test(l);
// Strip trailing inline comments (`code; // note — with a dash`) — the `://`
// guard leaves URLs intact — and the quoted "—" empty-state placeholder.
const stripComments = (l: string) => l.replace(/([^:"'`])\/\/.*$/, "$1");
const stripPlaceholders = (l: string) => l.replace(/(["'`])\s*—\s*\1/g, "$1$1");

// Guarantee/ensure/cause/proven as a positive CLAIM. Negated forms
// ("not a guarantee", "no guarantee") are the disclaimer and are allowed.
const GUARANTEE = /\bguarantee[sd]?\b/i;
const GUARANTEE_NEGATED = /\b(not a|no|never a|without)\s+guarantee/i;
const ENSURES = /\bensures?\b/i;
const PROVEN = /\bproven to\b|\bclinically proven\b/i;
// Flag "causes" as an Abridge-attributed effect claim. NOT flagged: "all-cause"
// / "root cause" (medical terms) and "a/leading cause of X" (describing the
// documentation problem, not an Abridge claim — allowed per doctrine).
const CAUSES = /(?<!all-)(?<!root )\bcauses?\b(?!\s+of\b)/i;
const CAUSAL_WILL = /\bwill\s+(increase|reduce|improve|save|generate|deliver|drive|lower|raise|cut|boost)\b/i;
const CREDITED = /credited to/i;

function scan(): Hit[] {
  const hits: Hit[] = [];
  for (const rel of FILES) {
    let content: string;
    try {
      content = readFileSync(join(CLIENT_SRC, rel), "utf8");
    } catch {
      continue;
    }
    content.split("\n").forEach((line, i) => {
      const ln = i + 1;
      if (isCommentLine(line)) return;
      const copy = stripPlaceholders(stripComments(line));
      if (copy.includes("—")) hits.push({ file: rel, line: ln, rule: "em-dash", text: line.trim() });
      if (GUARANTEE.test(copy) && !GUARANTEE_NEGATED.test(copy))
        hits.push({ file: rel, line: ln, rule: "guarantee-claim", text: line.trim() });
      if (ENSURES.test(copy)) hits.push({ file: rel, line: ln, rule: "ensures", text: line.trim() });
      if (PROVEN.test(copy)) hits.push({ file: rel, line: ln, rule: "proven-to", text: line.trim() });
      if (CAUSES.test(copy)) hits.push({ file: rel, line: ln, rule: "causes", text: line.trim() });
      if (CAUSAL_WILL.test(copy)) hits.push({ file: rel, line: ln, rule: "causal-will", text: line.trim() });
      if (CREDITED.test(copy)) hits.push({ file: rel, line: ln, rule: "credited-to", text: line.trim() });
    });
  }
  return hits;
}

describe("Explore COPY guardrails — Legal / brand tripwires", () => {
  it("no em dashes, no causal/guarantee absolutes, no 'credited to' in live Explore copy", () => {
    const hits = scan();
    const report = hits.map((h) => `  [${h.rule}] ${h.file}:${h.line}  →  ${h.text.slice(0, 120)}`).join("\n");
    expect(hits.length, `Copy guardrail hits (${hits.length}):\n${report}`).toBe(0);
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
