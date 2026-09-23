import { test, expect } from "@playwright/test";
import { LIVE_IA, enterHub, openHub, openTool, expectNoHorizontalOverflow, collectPageErrors, type HubName } from "./support/nav";

/**
 * Cross-viewport responsiveness guard: BREADTH, at four widths.
 *
 * A screen that scrolls sideways is the most common way a layout "breaks" on a
 * phone, and it is invisible on a desktop monitor. This walks the shared shell
 * (splash, hub, all three sub-hubs, the first screen of every live tool) at
 * iPhone SE through desktop and asserts none of them overflow.
 *
 * Depth lives elsewhere on purpose: explore-paths.spec.ts drives the full
 * Explore → Model → proforma → Present chain and asserts overflow at each stage
 * for all four care settings. This file is about covering MANY screens at MANY
 * widths, including the two widths that suite does not use (375 and 768).
 *
 * The previous version walked splash → journey → Explore via `card-explore`, a
 * testid on a screen the app can no longer reach, so all 8 of its permutations
 * failed at step two.
 */

const VIEWPORTS = [
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 12 Pro", width: 390, height: 844 },
  { name: "iPad", width: 768, height: 1024 },
  { name: "Desktop", width: 1280, height: 800 },
];

const HUBS = Object.keys(LIVE_IA) as HubName[];

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("splash and all three hubs fit the viewport", async ({ page }) => {
      const errs = collectPageErrors(page);

      await page.goto("/");
      await expect(page.getByTestId("button-enter-app")).toBeVisible();
      await expectNoHorizontalOverflow(page, "splash");

      await enterHub(page);
      await expectNoHorizontalOverflow(page, "hub");

      for (const hub of HUBS) {
        await openHub(page, hub);
        await page.waitForTimeout(400);
        await expectNoHorizontalOverflow(page, `${hub} hub`);
      }

      expect(errs, `uncaught while walking the shell: ${errs.join(" | ")}`).toEqual([]);
    });

    test("every live tool's first screen fits the viewport", async ({ page }) => {
      const errs = collectPageErrors(page);

      for (const hub of HUBS) {
        for (const id of LIVE_IA[hub]) {
          await openTool(page, hub, id);
          await page.waitForTimeout(900);
          await expectNoHorizontalOverflow(page, `${hub} → ${id}`);
        }
      }

      expect(errs, `uncaught while opening tools: ${errs.join(" | ")}`).toEqual([]);
    });

    test("the input-dense Explore practice screen fits the viewport", async ({ page }) => {
      // Dense numeric rows with unit suffixes are the real small-screen risk.
      await openTool(page, "financial", "financial-card-explore");
      await page.getByTestId("ed-setting-outpatient").click();
      await page.waitForTimeout(900);
      await expect(page.getByTestId("ed-input-providers")).toBeVisible();
      await expectNoHorizontalOverflow(page, "explore-practice");

      await page.getByTestId("ed-input-providers").fill("50");
      await page.getByTestId("ed-input-total-encounters").fill("150000");
      await page.getByTestId("ed-input-utilization").fill("75");
      await page.waitForTimeout(400);
      await expectNoHorizontalOverflow(page, "explore-practice-filled");
    });
  });
}
