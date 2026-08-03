import { describe, it, expect } from "vitest";
import { readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { scanFiles, formatHits } from "./support/copyGuardrail";

/**
 * ATTAIN INTEGRITY HARNESS — Layer 2: COPY guardrails.
 *
 * The Attain PDF was the gap: it had no copy gate, which is how "Prevented by
 * Abridge" (a causal claim) shipped. The core Legal/brand tripwires live in
 * ./support/copyGuardrail (shared across all four tools); this file points them
 * at the live Attain PDF surface — the HTML report (AttainPdf + AttainPdfPage1),
 * its data source (attainPdfData), and the react-pdf document still used by the
 * flow (attainReactPdf).
 */

const here = dirname(fileURLToPath(import.meta.url));
const CLIENT_SRC = join(here, "..");

const FILES: string[] = readdirSync(join(CLIENT_SRC, "pages/attain/pdf"))
  .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"))
  .map((f) => join("pages/attain/pdf", f));

describe("Attain COPY guardrails — Legal / brand tripwires", () => {
  it("no em dashes, no causal/guarantee absolutes, no 'prevented by', no 'credited to' in the Attain PDF", () => {
    const hits = scanFiles(CLIENT_SRC, FILES);
    expect(hits.length, `Copy guardrail hits (${hits.length}):\n${formatHits(hits)}`).toBe(0);
  });
});
