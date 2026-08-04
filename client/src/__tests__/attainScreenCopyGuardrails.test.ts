import { describe, it, expect } from "vitest";
import { readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { scanFiles, formatHits } from "./support/copyGuardrail";

/**
 * COPY guardrails for the Attain live SCREENS (pages/attain/preview) — the
 * Align / Plan / Strategy / Progress views and their content/economics data.
 * The existing attainCopyGuardrails covers only the Attain PDF; this holds the
 * on-screen Attain copy to the same shared Legal / brand tripwires.
 */
const here = dirname(fileURLToPath(import.meta.url));
const CLIENT_SRC = join(here, "..");
const DIR = "pages/attain/preview";
const FILES = readdirSync(join(CLIENT_SRC, DIR))
  .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
  .map((f) => join(DIR, f));

describe("Attain SCREEN copy guardrails — Legal / brand tripwires", () => {
  it("no em dashes, no causal/guarantee absolutes, no 'credited to' in live Attain screens", () => {
    const hits = scanFiles(CLIENT_SRC, FILES);
    expect(hits.length, `Copy guardrail hits (${hits.length}):\n${formatHits(hits)}`).toBe(0);
  });
});
