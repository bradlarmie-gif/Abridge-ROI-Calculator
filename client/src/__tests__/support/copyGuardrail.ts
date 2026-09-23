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
const DASH = "(?:—|&mdash;|&#8212;|&#x2014;|\\\\u2014)";
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

/**
 * "<our thing> <effect-verb>" in the present indicative: the shape that asserts
 * Abridge DOES something to a clinical or financial outcome.
 *
 * This is the class the em-dash and "prevents" rules kept missing, because the
 * offending verb changes every time — lifts, raises, reopens, protects, eases,
 * drives. What does not change is the SHAPE: our product (or its output) as the
 * subject, an effect verb, an outcome as the object.
 *
 * Approved forms are capability plus conditional, and are deliberately excluded:
 *   "Complete documentation CAN shorten throughput; WHERE teams act on it, ..."
 *   "the share you EXPECT cleaner documentation to prevent"
 *   "POSITIONED to", "ATTRIBUTED to", "HELPS"
 *
 * Also excluded: the problem direction. "the overtime that charting causes" and
 * "documentation improves in month one, but the coding workflow does not" are
 * the debunk, which the copy doctrine wants us to be MORE specific about, not
 * less. Those read as <subject> <verb> too, so the hedge window is checked on
 * both sides and a leading "the"/"that" relative clause is allowed through.
 */
const CLAIM_SUBJ =
  "(?:abridge|ambient documentation|complete documentation|better documentation|cleaner documentation|real-time documentation|more complete \\w+ documentation|a lighter charting load|lighter charting|time returned|faster throughput|lower documentation burden)";
const CLAIM_VERB =
  "(?:lifts|raises|reopens|reduces|protects|eases|drives|boosts|shortens|lowers|removes|eliminates|recovers|restores|unlocks|delivers|generates)";
const CLAIM_RE = new RegExp(`${CLAIM_SUBJ}\\b((?:\\s+\\w+){0,3}?)\\s+${CLAIM_VERB}\\b`, "i");
const CLAIM_HEDGE = /\b(can|may|could|might|should|helps?|expected|positioned|intended|designed|aims?|targets?|where|when|if|assumes?|not)\b/i;

/**
 * What the verb acts ON decides whether it is a claim.
 *
 * "Abridge shortens documentation time" is the product's direct, measured
 * function — the thing the entire tool is built on — and hedging it would be
 * false modesty, not caution. "Lower documentation burden reduces turnover
 * risk" reaches past the product into a clinical/financial outcome that other
 * initiatives also move, and that is the one Legal cares about.
 *
 * So: allow the effect when the object is our own surface (documentation, the
 * note, charting, the record); flag it when the object is an outcome.
 */
const OWN_SURFACE =
  /^\s*(?:the\s+|a\s+|an\s+|structured\s+|draft\s+)?(?:documentation|charting|note|notes|note-writing|record|transcription|typing|after-hours|paperwork|admin|text|draft)\b/i;

function causalClaim(copy: string): boolean {
  const m = CLAIM_RE.exec(copy);
  if (!m) return false;
  if (CLAIM_HEDGE.test(m[1] || "")) return false;
  // a hedge immediately before the subject ("we assume Abridge reduces ...")
  if (CLAIM_HEDGE.test(copy.slice(Math.max(0, m.index - 40), m.index))) return false;
  // a contrastive clause later in the sentence is the hedge doing its job
  // ("... shortens the query loop, BUT CDI still has to work it")
  const after = copy.slice(m.index + m[0].length);
  if (/\b(but|still has to|still have to|only when|only if|requires)\b/i.test(after)) return false;
  return !OWN_SURFACE.test(after);
}

const CORE_RULES: Rule[] = [
  // Catch the literal EM dash AND its HTML-entity forms — an entity-encoded em
  // dash renders identically to the customer but slipped past a literal-only
  // check. Deliberately NOT the en dash (–): it is correct in numeric ranges
  // ("$150K–$350K", "0–100") and is not the "AI wrote this" tell we guard.
  // Literal, HTML-entity AND \u-escaped forms. The escape is the one that got
  // through: measureCareSettings.ts held a "\u2014" that renders as an em dash to
  // the customer and read as a plain backslash-u to a literal-only check.
  // Deliberately NOT the en dash (\u2013, correct in numeric ranges) or the
  // minus sign (\u2212).
  { name: "em-dash", hit: (c) => /—|&mdash;|&#8212;|&#x2014;|\\u2014/i.test(c) },
  { name: "guarantee-claim", hit: (c) => GUARANTEE.test(c) && !GUARANTEE_NEGATED.test(c) },
  { name: "ensures", hit: (c) => ENSURES.test(c) },
  { name: "proven-to", hit: (c) => PROVEN.test(c) },
  { name: "causes", hit: (c) => CAUSES.test(c) && !PROBLEM_CAUSES.test(c) },
  { name: "causal-will", hit: (c) => CAUSAL_WILL.test(c) },
  { name: "credited-to", hit: (c) => CREDITED.test(c) },
  { name: "prevents", hit: (c) => PREVENTS.test(c) },
  { name: "prevented-by", hit: (c) => PREVENTED_BY.test(c) },
  { name: "eliminates", hit: (c) => ELIMINATES.test(c) },
  { name: "causal-claim", hit: causalClaim },
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
