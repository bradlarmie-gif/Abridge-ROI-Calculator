import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { scanFiles, formatHits } from "./support/copyGuardrail";

const CLIENT_SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = "pages/methodology/editorial";
const FILES = readdirSync(join(CLIENT_SRC, DIR)).filter((f) => f.endsWith(".tsx")).map((f) => join(DIR, f));

describe("Methodology screen COPY guardrails", () => {
  it("no em dashes, no causal/guarantee absolutes, no prevents/prevented-by, no credited-to", () => {
    const hits = scanFiles(CLIENT_SRC, FILES);
    expect(hits.length, `Copy guardrail hits (${hits.length}):\n${formatHits(hits)}`).toBe(0);
  });
  it("no costume words (faithful / fidelity / lossy / unlock)", () => {
    const offenders: string[] = [];
    for (const rel of FILES) {
      const src = readFileSync(join(CLIENT_SRC, rel), "utf8");
      // strip block + line comments so an explanatory code comment cannot trip it
      const code = src.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, " ").split("\n").filter((l) => !/^\s*(\/\/|\*)/.test(l)).join("\n");
      for (const w of ["faithful", "fidelity", "lossy", "unlock"]) {
        if (new RegExp(`\\b${w}\\b`, "i").test(code)) offenders.push(`${rel}: ${w}`);
      }
    }
    expect(offenders, offenders.join("\n")).toHaveLength(0);
  });
});
