import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

/**
 * A failed PDF handoff must never produce a sample-data document.
 *
 * Every editorial PDF stashes a snapshot in localStorage and opens a print route
 * that reads it back. Each route also falls back to SAMPLE data when the key is
 * absent, which is correct for typing the URL directly to preview a layout.
 *
 * Every export site used to write that stash inside `try { … } catch { /* ignore *\/ }`
 * and then open the tab regardless. So a write failure — Safari private mode, ITP
 * eviction, a quota error — produced a fully rendered PDF of the SAMPLE data: a
 * fictional health system with fabricated numbers, handed to a customer by a
 * seller who saw no error. Five of the six exports behaved this way.
 *
 * The rule: exports go through `stashAndOpenPdf`, which verifies the write landed
 * and throws instead of opening. This guard bans the raw pattern coming back.
 */
const CLIENT_SRC = join(__dirname, "..");
const SKIP = ["__tests__", "node_modules"];

function tsFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP.includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) tsFiles(full, acc);
    else if (/\.tsx?$/.test(entry)) acc.push(full);
  }
  return acc;
}

/** Blank comments so prose describing the old pattern cannot trip the guard. */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .split("\n")
    .map((l) => (/^\s*(\/\/|\*)/.test(l) ? "" : l.replace(/([^:"'`])\/\/.*$/, "$1")))
    .join("\n");
}

describe("PDF exports cannot silently fall back to sample data", () => {
  const files = tsFiles(CLIENT_SRC).filter((f) => !f.endsWith("pdfHandoff.ts"));

  it("no export writes a *pdf* localStorage key outside stashAndOpenPdf", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const c = code(readFileSync(file, "utf8"));
      c.split("\n").forEach((line, i) => {
        if (!/localStorage\.setItem/.test(line)) return;
        // only the PDF handoff keys matter; plan/session persistence is unrelated
        if (!/pdf/i.test(line)) return;
        offenders.push(`${file.replace(CLIENT_SRC, "client/src")}:${i + 1}  ${line.trim().slice(0, 110)}`);
      });
    }
    expect(
      offenders,
      "Use stashAndOpenPdf (client/src/lib/pdfHandoff.ts) instead. A raw setItem " +
        "lets a failed write open a sample-data PDF:\n  " + offenders.join("\n  "),
    ).toEqual([]);
  });

  it("stashAndOpenPdf verifies the write actually persisted", () => {
    const src = readFileSync(join(CLIENT_SRC, "lib", "pdfHandoff.ts"), "utf8");
    // The read-back is the load-bearing part: some browsers accept setItem and
    // drop the value, which throws nothing and loses the data just the same.
    expect(src).toMatch(/localStorage\.getItem\(key\)\s*!==\s*payload/);
    expect(src).toMatch(/window\.open/);
    // window.open(..., "noopener") returns null on success too, so a truthiness
    // check on it reports a pop-up block on every successful export.
    expect(src).not.toMatch(/if \(!win\)/);
  });
});
