import { readFileSync } from "fs";
import { join } from "path";

/**
 * Shared COPY-guardrail scanner for every customer-facing PDF/editorial file.
 *
 * One source of truth for the objective Legal/brand tripwires, so a rule added
 * here (e.g. "prevents") is enforced across all four tools at once instead of
 * drifting per copy of the test. Tone stays a human review pass; this catches
 * only the mechanical, repeatable hits and fails with file:line.
 *
 * Enforced on all customer-facing copy:
 *   - NO em dashes (—). Brad's standing rule and the #1 "AI wrote this" tell.
 *   - NO causal/guarantee absolutes: guarantee, ensures, proven to, "causes X",
 *     "will <increase/save/…>", and present-tense "prevents" / "prevented by".
 *     Abridge surfaces and enables; it does not cause, guarantee, or prevent.
 *   - "attributed to", never "credited to".
 */

export interface Hit {
  file: string;
  line: number;
  rule: string;
  text: string;
}

export interface Rule {
  name: string;
  hit: (copy: string) => boolean;
}

// Block/JSX comments are blanked at the file level (so multi-line `/* … */` and
// `{/* … */}` never trip a rule); per line we skip `//` and `*` comment lines,
// trailing inline comments (the `://` guard leaves URLs intact), and the "—"
// empty-state placeholder (a UI dash, quoted or as JSX text — not prose).
const stripBlockComments = (c: string) =>
  c
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
const isCommentLine = (l: string) => /^\s*(\/\/|\*)/.test(l);
const stripComments = (l: string) => l.replace(/([^:"'`])\/\/.*$/, "$1");
/**
 * Blank the em dash where it is a UI GLYPH rather than prose.
 *
 * The empty-state dash is the canonical case: a big grey "—" standing in for a
 * value that has not been entered yet. It is not a sentence, and rewriting it
 * would mean inventing a placeholder character the design does not use.
 *
 * Three shapes, all of them a dash standing alone:
 *   "—" / `—`          a quoted placeholder value
 *   >—<                JSX text between tags on one line
 *   a whole line of —  the same thing when prettier wrapped the JSX
 * The entity spellings are covered too, since they render identically.
 */
const DASH = "(?:—|&mdash;|&#8212;|&#x2014;)";
const stripPlaceholders = (l: string) =>
  l
    .replace(new RegExp(`(["'\`])\\s*${DASH}\\s*\\1`, "g"), "$1$1")
    .replace(new RegExp(`>\\s*${DASH}\\s*<`, "g"), "><")
    .replace(new RegExp(`^\\s*${DASH}\\s*$`), "");

// Guarantee/ensure/cause/proven as a positive CLAIM. Negated forms
// ("not a guarantee", "no guarantee") are the disclaimer and are allowed.
const GUARANTEE = /\bguarantee[sd]?\b/i;
// Allow words between the negation and "guarantee". The adjacent form ("not a
// guarantee") was the only one matched, so the standard legal disclaimers —
// "do not constitute a guarantee", "are not intended as a guarantee" — read as
// guarantee CLAIMS and failed the lint. They are the opposite of a claim.
// Bounded to a few words so a negation elsewhere in a long line cannot launder
// a real claim further along it.
const GUARANTEE_NEGATED = /\b(?:not|no|never|without)\b(?:\s+\S+){0,5}\s+guarantee/i;
const ENSURES = /\bensures?\b/i;
const PROVEN = /\bproven to\b|\bclinically proven\b/i;
// "causes" as an Abridge-attributed EFFECT verb ("documentation causes X").
// NOT flagged: "all-cause"/"root cause" (medical terms), "cause of X"
// (describing the problem), and the plural NOUN after a determiner/quantifier
// ("has many causes", "the causes", "several causes") which names reasons, not
// an Abridge claim.
const CAUSES = /(?<!all-)(?<!root )(?<!\b(?:many|several|multiple|few|other|various|common|possible|potential|underlying|leading|the|its|of|no)\s)\bcauses?\b(?!\s+of\b)/i;
// The rule exists to stop us claiming ABRIDGE causes a good outcome. It is not
// meant to stop us naming what causes the PROBLEM — "the overtime that charting
// causes", "charting delays cause more LWBS" — which is the debunk, and the
// direction the copy doctrine actually wants us to be specific about. The
// surrounding copy is careful precisely because of it ("the number never claims
// overtime that charting did not cause"). So exempt the burden-as-subject form.
const PROBLEM_CAUSES = /\b(charting|documentation|notes?|note-writing|delays?|burden|backlog)\b(?:\s+\S+){0,3}\s+(?:did not\s+)?causes?\b/i;
const CAUSAL_WILL = /\bwill\s+(increase|reduce|improve|save|generate|deliver|drive|lower|raise|cut|boost)\b/i;
const CREDITED = /credited to/i;
// Present-tense "prevents" and "prevented by" attribute prevention causally.
// The approved forms use the bare infinitive ("expected to prevent", "the share
// you expect to prevent"), which these patterns deliberately do NOT match.
const PREVENTS = /\bprevents\b/i;
const PREVENTED_BY = /\bprevented by\b/i;
// Present-tense "eliminates" / "eradicates" attribute removal causally, same as
// "prevents". The approved forms are descriptive ("clears", "expected to
// eliminate"), which the bare present tense here does not match.
const ELIMINATES = /\b(eliminates|eradicates)\b/i;

const CORE_RULES: Rule[] = [
  // Catch the literal EM dash AND its HTML-entity forms — an entity-encoded em
  // dash renders identically to the customer but slipped past a literal-only
  // check. Deliberately NOT the en dash (–): it is correct in numeric ranges
  // ("$150K–$350K", "0–100") and is not the "AI wrote this" tell we guard.
  { name: "em-dash", hit: (c) => /—|&mdash;|&#8212;|&#x2014;/i.test(c) },
  { name: "guarantee-claim", hit: (c) => GUARANTEE.test(c) && !GUARANTEE_NEGATED.test(c) },
  { name: "ensures", hit: (c) => ENSURES.test(c) },
  { name: "proven-to", hit: (c) => PROVEN.test(c) },
  { name: "causes", hit: (c) => CAUSES.test(c) && !PROBLEM_CAUSES.test(c) },
  { name: "causal-will", hit: (c) => CAUSAL_WILL.test(c) },
  { name: "credited-to", hit: (c) => CREDITED.test(c) },
  { name: "prevents", hit: (c) => PREVENTS.test(c) },
  { name: "prevented-by", hit: (c) => PREVENTED_BY.test(c) },
  { name: "eliminates", hit: (c) => ELIMINATES.test(c) },
];

/** Scan `files` (relative to `root`) with the core rules plus any `extra` rules. */
export function scanFiles(root: string, files: string[], extra: Rule[] = []): Hit[] {
  const rules = [...CORE_RULES, ...extra];
  const hits: Hit[] = [];
  for (const rel of files) {
    let content: string;
    try {
      content = readFileSync(join(root, rel), "utf8");
    } catch {
      continue;
    }
    stripBlockComments(content).split("\n").forEach((line, i) => {
      if (isCommentLine(line)) return;
      const copy = stripPlaceholders(stripComments(line));
      for (const r of rules) if (r.hit(copy)) hits.push({ file: rel, line: i + 1, rule: r.name, text: line.trim() });
    });
  }
  return hits;
}

export function formatHits(hits: Hit[]): string {
  return hits.map((h) => `  [${h.rule}] ${h.file}:${h.line}  →  ${h.text.slice(0, 120)}`).join("\n");
}
