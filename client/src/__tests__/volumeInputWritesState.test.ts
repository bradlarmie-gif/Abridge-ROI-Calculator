import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * A volume input must commit every value the partner types.
 *
 * `handleTotalEncountersChange` used to be written as:
 *
 *     setTotalEncountersInput(numValue);
 *     if (numValue >= 1000) {
 *       updateState({ annualEncounters: numValue, ... });
 *     }
 *
 * so a total under a thousand updated the visible box and nothing else. Two ways
 * that bites, both silent:
 *
 *   1. A small program enters 800 discharges. The box reads 800, `annualEncounters`
 *      stays 0, and every revenue driver sits greyed behind "Enter annual discharges
 *      to see this driver" — next to a box that plainly shows a number.
 *   2. Worse: a partner types 14,000, then corrects it down to 800. The box reads
 *      800. The model keeps computing on 14,000. Nothing on screen disagrees.
 *
 * The threshold existed to stop the Total/Per-provider mode flipping while the
 * first digits are typed. Transient intermediate values are harmless; discarding
 * the final one is not. The rule: the scale handler commits unconditionally.
 */
const FILES = [
  "pages/explore/editorial/EdPractice.tsx",
  "pages/explore/ExploreOpportunity.tsx",
];

/** Blank comments so the prose above (and in the source) cannot satisfy or trip the scan. */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .split("\n")
    .map((l) => (/^\s*(\/\/|\*)/.test(l) ? "" : l.replace(/([^:"'`])\/\/.*$/, "$1")))
    .join("\n");
}

/** The body of `handleTotalEncountersChange`, up to the closing of its useCallback. */
function handlerBody(src: string): string {
  const at = src.indexOf("handleTotalEncountersChange = useCallback");
  expect(at, "handleTotalEncountersChange was renamed; re-point this guard").toBeGreaterThan(-1);
  const rest = src.slice(at);
  const end = rest.indexOf("[updateState");
  return end === -1 ? rest.slice(0, 1200) : rest.slice(0, end);
}

describe.each(FILES)("%s commits the typed volume", (rel) => {
  const src = code(readFileSync(join(__dirname, "..", rel), "utf8"));
  const body = handlerBody(src);

  it("writes annualEncounters", () => {
    expect(body).toMatch(/updateState\(\{[^}]*annualEncounters/);
  });

  it("does not gate that write behind a magnitude threshold", () => {
    // Any `if (numValue >= N)` / `> N` / `<= N` in this handler re-opens the bug:
    // it is the shape that lets the input and the model disagree.
    const gates = [...body.matchAll(/if\s*\(\s*numValue\s*[<>]=?\s*\d/g)].map((m) => m[0]);
    expect(
      gates,
      "A magnitude test around the state write means values on the wrong side of it " +
        "update the visible box only, and the model keeps the previous number:\n  " +
        gates.join("\n  "),
    ).toEqual([]);
  });
});
