import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

/**
 * PROFORMA INTEGRITY HARNESS — Layer 2: COPY guardrails.
 *
 * The mechanical, repeatable half of "premium + Legal-safe" for all
 * customer-facing New Deal Proforma copy (the editorial chapters + the PDF).
 * Tone stays a human review pass; this catches the objective tripwires:
 *
 *   - NO em dashes (—). Brad's standing rule and the #1 "AI wrote this" tell.
 *   - NO causal / guarantee absolutes ("guarantee", "ensures", "proven to",
 *     "causes X", "will <increase/save/…>"). Abridge enables, it does not cause.
 *   - "attributed to", never "credited to".
 *   - NO hardcoded term literals ("3-year" / "three-year" / "over three years").
 *     The term is 1-5 yr, so any baked-in "3-year" is a seam bug (exactly the
 *     class we just swept).
 *
 * A hit fails with file:line so it's fixed (mechanical) or sent to Brad (tone).
 */

const here = dirname(fileURLToPath(import.meta.url));
const CLIENT_SRC = join(here, "..");

const FILES: string[] = [
  ...readdirSync(join(CLIENT_SRC, "pages/proforma/editorial"))
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => join("pages/proforma/editorial", f)),
  "components/proforma/ProformaPDFExport.tsx",
];

interface Hit { file: string; line: number; rule: string; text: string }

// Gate only customer-facing copy. Block/JSX comments are stripped at the file
// level (so multi-line `/* … */` and `{/* … */}` never trip a rule), then per
// line we skip `//` and `*` comment lines, trailing inline comments, and the
// "—" empty-state placeholder (a UI dash, quoted or as JSX text — not prose).
const stripBlockComments = (c: string) =>
  c
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
const isCommentLine = (l: string) => /^\s*(\/\/|\*)/.test(l);
const stripComments = (l: string) => l.replace(/([^:"'`])\/\/.*$/, "$1");
const stripPlaceholders = (l: string) =>
  l.replace(/(["'`])\s*—\s*\1/g, "$1$1").replace(/>\s*—\s*</g, "><");

const GUARANTEE = /\bguarantee[sd]?\b/i;
const GUARANTEE_NEGATED = /\b(not a|no|never a|without)\s+guarantee/i;
const ENSURES = /\bensures?\b/i;
const PROVEN = /\bproven to\b|\bclinically proven\b/i;
const CAUSES = /(?<!all-)(?<!root )\bcauses?\b(?!\s+of\b)/i;
const CAUSAL_WILL = /\bwill\s+(increase|reduce|improve|save|generate|deliver|drive|lower|raise|cut|boost)\b/i;
const CREDITED = /credited to/i;
// Hardcoded contract-term literals. The term is dynamic (1-5 yr); anything baked
// to "3-year"/"three-year"/"over three years" is a seam bug.
const TERM_LITERAL = /\b3-year\b|\bthree-year\b|\bover three years\b|\bthe 3-year case\b/i;

function scan(): Hit[] {
  const hits: Hit[] = [];
  for (const rel of FILES) {
    let content: string;
    try { content = readFileSync(join(CLIENT_SRC, rel), "utf8"); } catch { continue; }
    stripBlockComments(content).split("\n").forEach((line, i) => {
      const ln = i + 1;
      if (isCommentLine(line)) return;
      const copy = stripPlaceholders(stripComments(line));
      if (copy.includes("—")) hits.push({ file: rel, line: ln, rule: "em-dash", text: line.trim() });
      if (GUARANTEE.test(copy) && !GUARANTEE_NEGATED.test(copy)) hits.push({ file: rel, line: ln, rule: "guarantee-claim", text: line.trim() });
      if (ENSURES.test(copy)) hits.push({ file: rel, line: ln, rule: "ensures", text: line.trim() });
      if (PROVEN.test(copy)) hits.push({ file: rel, line: ln, rule: "proven-to", text: line.trim() });
      if (CAUSES.test(copy)) hits.push({ file: rel, line: ln, rule: "causes", text: line.trim() });
      if (CAUSAL_WILL.test(copy)) hits.push({ file: rel, line: ln, rule: "causal-will", text: line.trim() });
      if (CREDITED.test(copy)) hits.push({ file: rel, line: ln, rule: "credited-to", text: line.trim() });
      // Dynamic term labels (built from `termYears`) are correct, not hardcoded.
      if (TERM_LITERAL.test(copy) && !/termYears/.test(copy)) hits.push({ file: rel, line: ln, rule: "hardcoded-term", text: line.trim() });
    });
  }
  return hits;
}

describe("Proforma Integrity — Layer 2: copy guardrails", () => {
  it("no em dashes, no causal/guarantee absolutes, no 'credited to', no hardcoded term", () => {
    const hits = scan();
    const report = hits.map((h) => `  [${h.rule}] ${h.file}:${h.line}  →  ${h.text.slice(0, 120)}`).join("\n");
    expect(hits.length, `Copy guardrail hits (${hits.length}):\n${report}`).toBe(0);
  });
});
