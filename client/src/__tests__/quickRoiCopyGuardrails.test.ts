import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { scanFiles, formatHits, type Rule } from "./support/copyGuardrail";

/**
 * COPY guardrails for the Self Service ROI Tool.
 *
 * This app is a single path, so this is the whole customer-visible copy
 * surface: the landing screen, the calculator's three steps, the driver labels
 * its calc summaries quote, and the exported PDF. The objective
 * tripwires (em dashes, causal/guarantee absolutes, "credited to") live in
 * ./support/copyGuardrail and are shared.
 *
 * NOTE: `scanFiles` skips paths it cannot read, so a guardrail pointed at a
 * deleted file passes while checking nothing. That is exactly how the previous
 * per-tool guardrails rotted when their features were removed. The first test
 * below is the negative control: it fails loudly if any listed path stops
 * existing, so this guard can never go quietly vacuous.
 */

const here = dirname(fileURLToPath(import.meta.url));
const CLIENT_SRC = join(here, "..");

const FILES: string[] = [
  "pages/SplashScreen.tsx",
  "pages/forecast/QuickRoiCalculator.tsx",
  // The one-provider walk. It was missing from this list for its whole life,
  // which is exactly how "the faded number is what we typically see" reached
  // the screen: a benchmark claim in a vendor's voice, on the one page whose
  // reader has nobody in the room to take that claim from.
  "pages/forecast/SoloRoi.tsx",
  "components/forecast/QuickRoiEditorialPdf.tsx",
  "components/forecast/QuickRoiEditorialPdfRoute.tsx",
  "components/UnifiedHeader.tsx",
  // the driver titles, notes, field labels and worked-math strings all render
  // on the "what changes" step and inside the PDF, so they are live copy too
  "pages/forecast/roiEngine.ts",
  "lib/exploreDriverCalcs.ts",
];

// Deliberately NOT scanned: lib/exploreDrivers.ts. It reads as copy (it is full
// of taglines and shortDescriptions) but this app only consumes its driver ids
// and quadrant mapping; none of its prose reaches the screen. Verified by
// dumping the rendered text of every screen in every setting and finding zero
// matches. Scanning it only produces findings on dead strings, which is how a
// guard trains people to ignore it. If any of it is ever rendered, add it back.

/**
 * AUDIENCE rules, specific to this tool.
 *
 * This is self service: the reader is a doctor or a small group sizing their
 * own practice. They have no Abridge rep and no impact-analysis data pull, so
 * copy inherited from the rep-facing calculator ("your partner", "read it off
 * the impact analysis", "the rep dials it") is not merely off-tone, it points
 * at something the reader does not have. This tool used to be that tool, so
 * the vocabulary is a live regression risk, not a hypothetical one.
 */
const AUDIENCE_RULES: Rule[] = [
  { name: "rep-vocabulary", hit: (c) => /\b(partner|partners|the rep|impact analysis|impact-analysis|data pull|prospect)\b/i.test(c) },
  // "realization" was removed from the inputs; it must not come back in the
  // worked math or a label either. Matches the phrasings a reader would SEE
  // ("x 75% realization", "realization rate"), not the identifiers and field
  // names the engine legitimately uses (f.realization, wrvuRealization).
  { name: "realization-jargon", hit: (c) => /%\s*realization\b/i.test(c) || /\brealization\s+(rate|rates|share|assumption)\b/i.test(c) },
  /**
   * Harm-prevention claims. The shared core rule catches the verb "prevents",
   * but the noun forms walked straight past it: the nursing quality drivers
   * shipped "x 10% prevention" and a field labelled "Prevention attributable to
   * timely docs", which tells a physician the product prevents falls, CLABSI and
   * pressure injuries. It does not. It surfaces documentation sooner, and the
   * care team decides and acts. Any avoided-harm share must keep the team as the
   * actor. "preventable"/"avoidable" as a standing clinical descriptor is fine.
   */
  { name: "prevention-claim", hit: (c) => /\bprevent(ion|ions|ed|ing)\b/i.test(c) },
  /**
   * Benchmark claims in a vendor's voice.
   *
   * "we count 75% of it" is fine and is used throughout: that is the house
   * explaining its own method, and the reader can argue with it. "the faded
   * number is what we typically see" is a different act. It asserts a result
   * from data the reader cannot see, on a page built precisely because there
   * is no rep present to be asked "see where?". Every figure on this tool is
   * one the reader typed or one that is publicly sourced (the Medicare rate).
   * So: state a method in the first person all you like, never a result.
   */
  {
    name: "vendor-benchmark-claim",
    hit: (c) =>
      /\bwe\s+(typically\s+|usually\s+|generally\s+|often\s+|commonly\s+|normally\s+)?(see|find|observe|measure|deliver|achieve)\b/i.test(c) ||
      /\bin our (experience|data|numbers)\b/i.test(c) ||
      /\b(on|across) average,? we\b/i.test(c) ||
      /\bour (customers|clients|users|practices|providers)\b/i.test(c),
  },
];

describe("ROI Calculator COPY guardrails", () => {
  it("every file this guard claims to scan actually exists", () => {
    const missing = FILES.filter((rel) => !existsSync(join(CLIENT_SRC, rel)));
    expect(missing, `Guardrail points at files that no longer exist:\n${missing.join("\n")}`).toEqual([]);
    expect(FILES.length).toBeGreaterThan(0);
  });

  it("no em dashes, no causal/guarantee absolutes, no 'credited to' in live copy", () => {
    const hits = scanFiles(CLIENT_SRC, FILES);
    expect(hits.length, `Copy guardrail hits (${hits.length}):\n${formatHits(hits)}`).toBe(0);
  });

  it("speaks to a practice sizing itself, not to a rep selling a partner", () => {
    const names = new Set(AUDIENCE_RULES.map((r) => r.name));
    // Filter to the audience rules only (the core tripwires have their own
    // test above), but never to a single rule: filtering by one name is how a
    // rule can sit in the list doing nothing, which is what happened here.
    const hits = scanFiles(CLIENT_SRC, FILES, AUDIENCE_RULES).filter((h) => names.has(h.rule));
    expect(hits.length, `Rep-facing vocabulary in self-service copy (${hits.length}):\n${formatHits(hits)}`).toBe(0);
  });

  /**
   * Negative control. Every rule here exists because something real got past
   * the list, so the list itself has to be shown to still bite: feed each
   * audience rule the copy it was written for and require a hit. A rule that
   * matches nothing is worse than no rule, because it reads like coverage.
   */
  it("each audience rule still catches the copy it was written for", () => {
    const cases: Record<string, string> = {
      "rep-vocabulary": 'hint="read this off the impact analysis your partner sent"',
      "realization-jargon": "× 75% realization",
      "prevention-claim": 'label="Prevention attributable to timely docs"',
      "vendor-benchmark-claim": 'hint="your estimate; the faded number is what we typically see"',
    };
    expect(Object.keys(cases).sort(), "a rule was added or renamed without a control")
      .toEqual(AUDIENCE_RULES.map((r) => r.name).sort());
    for (const rule of AUDIENCE_RULES) {
      expect(rule.hit(cases[rule.name]), `the ${rule.name} rule no longer catches its own case`).toBe(true);
    }
    // and the house methodology voice is deliberately still allowed
    const vendor = AUDIENCE_RULES.find((r) => r.name === "vendor-benchmark-claim")!;
    expect(vendor.hit("coding education and CDI move this too, so we count 75% of it")).toBe(false);
  });

  /**
   * No invented figure may sit in an input.
   *
   * `placeholder="6.3"` then `placeholder="5.2"` on "how long does a note take
   * now" and "and with Abridge" put a 1.1-minute saving on screen as though it
   * were a finding. Nobody measured it, and it is the anchor for the largest
   * number on the page. An "e.g., 70" is a different thing: it shows the shape
   * of the answer they are being asked for. So a placeholder may describe the
   * answer, but it may never assert one.
   */
  it("no input is pre-anchored with an invented figure", () => {
    const NUMERIC_FIELD_FILES = ["pages/forecast/SoloRoi.tsx", "pages/forecast/QuickRoiCalculator.tsx"];
    const bare: string[] = [];
    for (const rel of NUMERIC_FIELD_FILES) {
      const content = readFileSync(join(CLIENT_SRC, rel), "utf8");
      content.split("\n").forEach((line, i) => {
        for (const m of line.matchAll(/placeholder=(?:"([^"]*)"|\{"([^"]*)"\})/g)) {
          const v = (m[1] ?? m[2] ?? "").trim();
          // a bare number, with or without separators: an assertion, not an example
          if (/^[\d.,]+$/.test(v)) bare.push(`  ${rel}:${i + 1}  →  placeholder="${v}"`);
        }
      });
    }
    expect(bare.length, `Placeholders asserting a figure nobody measured (${bare.length}):\n${bare.join("\n")}`).toBe(0);
  });
});
