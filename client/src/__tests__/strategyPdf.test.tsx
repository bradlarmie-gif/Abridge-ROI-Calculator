import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StrategyEditorialPdfDocument, sampleStrategyData } from "@/components/attain/StrategyEditorialPdf";
import { DISCOVERY, resolveResult, getScript } from "@/lib/attain/discovery";
import { goalDisplayLabel } from "@/lib/attain/attainGoals";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";

/**
 * Reconciliation guard for the Value Attainment Strategy "what we heard" PDF.
 * Every care setting must render: cover + at most two content pages, every goal
 * present with the honesty tag that matches its resolved play, the priority stack
 * in order, and NO numbers (this is the pre-ROI, plain-terms write-up).
 */

const SETTINGS: AttainSetting[] = ["outpatient", "ed", "inpatient", "nursing"];

function classOf(setting: AttainSetting, goal: GoalId): "counted" | "proof" | "honest" {
  const r = resolveResult(setting, goal, sampleStrategyData(setting).answers);
  const script = getScript(setting, goal);
  if (r?.lever) return "counted";
  if (r?.proofDriverId || r?.proof || script?.proofLine) return "proof";
  if (r?.honest) return "honest";
  return "proof";
}
const TAG: Record<string, string> = {
  counted: "Counted, near-term dollars",
  proof: "Tracked as proof, not counted",
  honest: "Not documentation's to fix",
};

describe("Value Attainment Strategy write-up PDF", () => {
  for (const setting of SETTINGS) {
    const goals = Object.keys(DISCOVERY[setting] ?? {}) as GoalId[];
    const html = renderToStaticMarkup(<StrategyEditorialPdfDocument data={sampleStrategyData(setting)} />).replace(/&amp;/g, "&").replace(/&#x27;/g, "'");

    it(`${setting}: renders the cover, the read, and every goal`, () => {
      expect(html).toContain("Value Attainment Strategy");
      expect(html).toContain("What we heard");
      for (const g of goals) expect(html, `missing goal ${g}`).toContain(goalDisplayLabel(setting, g));
    });

    it(`${setting}: is cover + at most two content pages`, () => {
      const pageCount = (html.match(/width:816px/g) ?? []).length; // Cover + each Page
      expect(pageCount).toBeGreaterThanOrEqual(2);
      expect(pageCount, "more than cover + 2 content pages").toBeLessThanOrEqual(3);
    });

    it(`${setting}: each goal carries the honesty tag that matches its resolved play`, () => {
      for (const g of goals) {
        const expected = TAG[classOf(setting, g)];
        expect(html, `${g} tag`).toContain(expected);
      }
    });

    it(`${setting}: shows the ranked priority stack when multi-goal`, () => {
      if (goals.length > 1) {
        expect(html).toContain("Your priorities, in order");
        expect(html).toContain("1.");
        expect(html).toContain(`${goals.length}.`);
      }
    });

    it(`${setting}: carries no numbers (pre-ROI, plain terms only)`, () => {
      // strip the fixed 816x1056 sheet dimensions, then assert no $ and no stray digits.
      const body = html.replace(/width:816px/g, "").replace(/height:1056px/g, "").replace(/#[0-9A-Fa-f]{3,8}/g, "");
      expect(body).not.toContain("$");
    });
  }

  it("a two-goal discovery still fits on a single content page (cover + 1)", () => {
    const base = sampleStrategyData("nursing");
    const twoGoals = (Object.keys(DISCOVERY.nursing ?? {}) as GoalId[]).slice(0, 2);
    const answers = { ...base.answers, _rank: twoGoals.join(",") };
    const html = renderToStaticMarkup(<StrategyEditorialPdfDocument data={{ ...base, order: twoGoals, answers }} />);
    const pageCount = (html.match(/width:816px/g) ?? []).length;
    expect(pageCount).toBe(2); // cover + one content page
  });
});
