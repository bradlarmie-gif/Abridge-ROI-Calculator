import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { scanFiles, formatHits } from "./support/copyGuardrail";

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
  "components/forecast/QuickRoiEditorialPdf.tsx",
  "components/forecast/QuickRoiEditorialPdfRoute.tsx",
  "components/UnifiedHeader.tsx",
  "lib/exploreDrivers.ts",
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
});
