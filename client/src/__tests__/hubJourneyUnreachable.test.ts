import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * The legacy IA must stay sealed off.
 *
 * `hubMode` is permanently on: the splash enters the Value Attainment Hub and the
 * legacy `JourneySelector` ("journey") is retired. But retired is not the same as
 * unreachable, and it was not unreachable.
 *
 * Two back-buttons still pointed at it. The Data Request Builder's Back, and
 * Measure's Back. The Data Request Builder is reachable from the Explore header
 * on all nine steps, so the real path was:
 *
 *     hub > The Numbers > Explore > "Data request" > Back > the whole legacy IA
 *
 * Four clicks from the sanctioned home into Measure, Switch, legacy Attain and the
 * Forecast mode selector, none of which is part of the launch surface.
 *
 * It stayed invisible because ONE of those two call sites used single quotes:
 * `navigateTo('journey')`. Every grep for `navigateTo("journey")` missed it,
 * including the one behind the App.tsx comment that asserted it was unreachable.
 * So this guard is quote-agnostic on purpose.
 *
 * The rule: every navigation target of "journey" must be gated behind `hubMode`,
 * so that with hubMode true nothing can route there.
 */
const APP = join(__dirname, "..", "App.tsx");

describe("the legacy JourneySelector stays unreachable", () => {
  const src = readFileSync(APP, "utf8");
  // Strip comments so prose about "journey" cannot trip or satisfy the checks.
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .split("\n")
    .map((l) => (/^\s*(\/\/|\*)/.test(l) ? "" : l))
    .join("\n");

  it("hubMode is still hard-on (this guard assumes it)", () => {
    expect(/const hubMode = true;/.test(code)).toBe(true);
  });

  it("no navigateTo('journey') that is not gated behind hubMode", () => {
    const offenders: string[] = [];
    code.split("\n").forEach((line, i) => {
      // either quote style, and either a bare call or a ternary target
      if (!/journey/.test(line)) return;
      if (!/navigateTo|dest\s*=/.test(line)) return;
      // a line is safe only if hubMode decides the destination on that line
      if (/hubMode/.test(line)) return;
      offenders.push(`App.tsx:${i + 1}  ${line.trim()}`);
    });
    expect(
      offenders,
      "These route to the retired JourneySelector without a hubMode gate, which " +
        "re-opens the whole legacy IA from inside the hub:\n  " +
        offenders.join("\n  "),
    ).toEqual([]);
  });

  /**
   * The ObjectiveSelectionScreen > BaselineSetup > ModelBuilder > InvestmentPage
   * chain still contains navigateTo calls, but they sit inside handlers that form
   * a closed loop: the only way in is `handleSelectionComplete`, which is DEFINED
   * AND NEVER CALLED. That single fact is what keeps ~5 screens and ModelBuilder's
   * 69 number inputs off the launch surface, so it is the thing worth guarding.
   * If someone wires that handler up, the chain goes live untested and this fails.
   */
  it("the dead ModelBuilder chain has no way in", () => {
    const defined = /const handleSelectionComplete\s*=/.test(code);
    expect(defined, "handleSelectionComplete vanished; re-check what now enters the chain").toBe(true);
    const mentions = [...code.matchAll(/handleSelectionComplete/g)].length;
    expect(
      mentions,
      "handleSelectionComplete gained a caller, so baseline-setup > model-builder > " +
        "investment > calculator is now reachable. Those screens are untested and " +
        "were excluded from the launch audit on the basis that nothing could open them.",
    ).toBe(1);
  });
});
