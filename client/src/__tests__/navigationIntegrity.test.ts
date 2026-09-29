import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Three navigation defects, found by driving the app rather than reading it.
 * All three were invisible to the suite because navigation here is a state
 * machine (`AppView` + `navigateTo`), not routes, so nothing typed a URL.
 *
 *  1. THE BACK LOOP. `navigateTo` pushed a history entry on every call. An
 *     in-app Back is just `navigateTo(previousView)`, so going back APPENDED
 *     a duplicate: [hub, financial-hub, tool] + Back -> [..., financial-hub].
 *     Browser Back then popped to `tool`, sending you forward into the screen
 *     you had just left, and repeated presses ping-ponged.
 *
 *  2. THE LOGO THAT WENT BACK. `UnifiedHeader` fell back to `onBack()` when no
 *     `onHome` was given, and `LearnPath` passed `onHome={onBack}` outright.
 *     The wordmark said "home" and moved up one level.
 *
 *  3. A BACK BUTTON WITH NO HANDLER fell through to `window.history.back()`,
 *     which can walk off the app entirely since views are not 1:1 with entries.
 *
 * These are source-shape guards. `scripts/nav-sweep.mjs` is the behavioural
 * proof — it drives 12 screens and checks where each control actually lands.
 */
const SRC = join(__dirname, "..");

/** Blank out comments: the notes explaining each fix name the very patterns
 *  these guards ban, and would otherwise trip them. */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .split("\n")
    .map((l) => (/^\s*(\/\/|\*)/.test(l) ? "" : l.replace(/([^:"'`])\/\/.*$/, "$1")))
    .join("\n");
}

const read = (...p: string[]) => code(readFileSync(join(SRC, ...p), "utf8"));

describe("navigation integrity", () => {
  it("navigateTo unwinds history when stepping back, instead of pushing", () => {
    const app = read("App.tsx");
    const body = app.slice(app.indexOf("const navigateTo = useCallback"));
    const fn = body.slice(0, body.indexOf("}, []);"));

    // The back-step branch must exist and must call history.back(), not push.
    expect(fn, "navigateTo must detect a step onto the previous view").toMatch(
      /navStackRef\.current\[idx - 1\] === view/,
    );
    expect(fn).toMatch(/window\.history\.back\(\)/);
    // And the push must carry an index, so popstate can tell back from forward.
    expect(fn).toMatch(/pushState\(\{ view, idx: idx \+ 1 \}/);
  });

  it("popstate restores the index the entry was pushed with", () => {
    expect(read("App.tsx")).toMatch(/navIndexRef\.current = event\.state\.idx/);
  });

  it("the wordmark never falls back to going back", () => {
    const header = read("components", "UnifiedHeader.tsx");
    const fn = header.slice(
      header.indexOf("const handleLogoClick"),
      header.indexOf("const handleBack"),
    );
    expect(fn, "handleLogoClick must not call onBack").not.toMatch(/onBack/);
  });

  it("a header with no onBack renders no back control and never walks raw history", () => {
    const header = read("components", "UnifiedHeader.tsx");
    expect(header, "handleBack must not fall back to window.history.back()").not.toMatch(
      /window\.history\.back\(\)/,
    );
    expect(header).toMatch(/\{showBack && onBack && \(/);
  });

  it("no live surface wires the wordmark straight to its back handler", () => {
    // LearnPath did this in all three of its branches.
    for (const file of [
      ["pages", "LearnPath.tsx"],
      ["pages", "explore", "ExploreFlow.tsx"],
    ] as string[][]) {
      expect(read(...file), `${file.join("/")} aliases onHome to onBack`).not.toMatch(
        /onHome=\{onBack\}/,
      );
    }
  });

  it("Explore's Back lands on The Numbers, alongside its three sibling tools", () => {
    // It went to the top-level hub, skipping a level, while Size the ROI /
    // Build the Deal / Offset the Cost all returned to financial-hub.
    const app = read("App.tsx");
    const block = app.slice(app.indexOf('currentView === "explore" &&'));
    const props = block.slice(0, block.indexOf("/>"));
    expect(props).toMatch(/onBackToJourney=\{hubMode \? \(\) => navigateTo\("financial-hub"\)/);
    expect(props, "and its wordmark must still reach the top-level hub").toMatch(/onHome=\{/);
  });
});
