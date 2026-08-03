import { describe, it, expect } from "vitest";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { scanFiles, formatHits } from "./support/copyGuardrail";

const CLIENT_SRC = join(dirname(fileURLToPath(import.meta.url)), "..");

const FILES = [
  "lib/methodologyContent.ts",
  "components/methodology/MethodologyEditorialPdf.tsx",
  "components/methodology/MethodologyEditorialPdfRoute.tsx",
];

describe("Methodology COPY guardrails — Legal / brand tripwires", () => {
  it("no em dashes, no causal/guarantee absolutes, no prevents/prevented-by, no credited-to", () => {
    const hits = scanFiles(CLIENT_SRC, FILES);
    expect(hits.length, `Copy guardrail hits (${hits.length}):\n${formatHits(hits)}`).toBe(0);
  });
});
