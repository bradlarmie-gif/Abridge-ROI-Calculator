import { describe, it, expect } from "vitest";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { scanFiles, formatHits } from "./support/copyGuardrail";

/**
 * COPY guardrails for App Rationalization — the "sales weapon" surface, which
 * the four original guardrails did not cover. Uses the same shared tripwires
 * (em dashes, causal/guarantee absolutes, "credited to") so App Rat copy is held
 * to the same Legal / brand bar as Explore, Methodology, Attain and Proforma.
 */
const here = dirname(fileURLToPath(import.meta.url));
const CLIENT_SRC = join(here, "..");

const FILES: string[] = [
  "components/forecast/AppRatEditorialPdf.tsx",
  "components/forecast/AppRatEditorialPdfRoute.tsx",
  "components/forecast/ArConsolidationView.tsx",
  "components/forecast/ArMoatView.tsx",
  "components/forecast/ConsolidationTiming.tsx",
  "pages/forecast/AppRationalizationFlow.tsx",
  "lib/appRationalizationCalc.ts",
];

describe("App Rationalization COPY guardrails — Legal / brand tripwires", () => {
  it("no em dashes, no causal/guarantee absolutes, no 'credited to' in live App Rat copy", () => {
    const hits = scanFiles(CLIENT_SRC, FILES);
    expect(hits.length, `Copy guardrail hits (${hits.length}):\n${formatHits(hits)}`).toBe(0);
  });
});
