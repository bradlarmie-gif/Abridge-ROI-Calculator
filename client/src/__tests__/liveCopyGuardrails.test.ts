import { describe, it, expect } from "vitest";
import { liveFiles, relative } from "./support/liveSurface";
import { scanFiles, formatHits } from "./support/copyGuardrail";

/**
 * The copy guardrails, applied to the WHOLE launch surface.
 *
 * The rules already existed and were good. The scope was the problem: seven
 * separate test files each hardcoded a handful of directories, so a surface was
 * linted only if somebody remembered to add it to a glob. Nobody did for the hub
 * or the four Case story pages, which is how the first screen every user sees
 * shipped entirely unlinted.
 *
 * This file takes the file list from the real import graph instead (see
 * liveSurface.ts), so a new screen is covered the day it becomes reachable and
 * a retired one stops being anybody's problem. The per-tool guardrail files stay
 * as they are: they carry extra tool-specific rules this one does not know about.
 *
 * Cleared 226 pre-existing hits to turn this on: 218 em dashes, two present-tense
 * prevention claims in attainLevers, and imperative "Ensure" phrasings. Keep it
 * at zero — fix the copy, do not add an exception.
 */
describe("every live customer-facing surface passes the copy guardrails", () => {
  const files = liveFiles()
    .filter((f) => /\.tsx?$/.test(f))
    .map((f) => relative(f));

  it("scans a plausible number of files (the graph did not silently collapse)", () => {
    // A resolver bug that returns nothing would make the guard below pass while
    // checking zero files, which is the failure mode worth pinning explicitly.
    expect(files.length).toBeGreaterThan(150);
  });

  it("has no em dashes, causal absolutes, or guarantee claims", () => {
    const hits = scanFiles(process.cwd(), files);
    expect(
      hits,
      `${hits.length} copy-guardrail violation(s) on the live surface:\n${formatHits(hits)}`,
    ).toEqual([]);
  });
});
