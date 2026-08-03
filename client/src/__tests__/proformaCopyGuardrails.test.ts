import { describe, it, expect } from "vitest";
import { readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { scanFiles, formatHits, type Rule } from "./support/copyGuardrail";

/**
 * PROFORMA INTEGRITY HARNESS — Layer 2: COPY guardrails.
 *
 * The core Legal/brand tripwires live in ./support/copyGuardrail (shared across
 * all four tools). This file supplies the live New Deal Proforma surface (the
 * editorial chapters + the PDF) and adds one Proforma-specific rule:
 *
 *   - NO hardcoded term literals ("3-year" / "three-year" / "over three years").
 *     The term is dynamic (1-5 yr), so any baked-in literal is a seam bug.
 */

const here = dirname(fileURLToPath(import.meta.url));
const CLIENT_SRC = join(here, "..");

const FILES: string[] = [
  ...readdirSync(join(CLIENT_SRC, "pages/proforma/editorial"))
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => join("pages/proforma/editorial", f)),
  "components/proforma/ProformaPDFExport.tsx",
];

// Dynamic term labels (built from `termYears`) are correct, not hardcoded.
const TERM_LITERAL = /\b3-year\b|\bthree-year\b|\bover three years\b|\bthe 3-year case\b/i;
const termRule: Rule = { name: "hardcoded-term", hit: (c) => TERM_LITERAL.test(c) && !/termYears/.test(c) };

describe("Proforma Integrity — Layer 2: copy guardrails", () => {
  it("no em dashes, no causal/guarantee absolutes, no 'credited to', no hardcoded term", () => {
    const hits = scanFiles(CLIENT_SRC, FILES, [termRule]);
    expect(hits.length, `Copy guardrail hits (${hits.length}):\n${formatHits(hits)}`).toBe(0);
  });
});
