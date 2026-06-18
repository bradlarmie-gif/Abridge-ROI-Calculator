import { test, expect, type Page } from "@playwright/test";

/**
 * Cross-viewport responsiveness guard. Walks the reachable entry flow
 * (splash → journey → Explore) at phone / tablet / desktop sizes and asserts
 * the page never overflows horizontally — the most common way a layout "breaks"
 * on mobile. This exercises the shared shell (header, page containers, cards)
 * that every screen inherits.
 *
 * NOTE: the deep proforma "Present" view is built from the same responsive
 * primitives but can't be reached without scripting the full multi-step deal
 * flow; its small-screen layout (scrolling stage, wrapping stat rows, fluid
 * type) was hardened by hand alongside this test.
 */

const VIEWPORTS = [
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 12 Pro", width: 390, height: 844 },
  { name: "iPad", width: 768, height: 1024 },
  { name: "Desktop", width: 1280, height: 800 },
];

async function expectNoHorizontalOverflow(page: Page, where: string) {
  const { scrollW, clientW } = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  // 1px tolerance for sub-pixel rounding.
  expect(
    scrollW,
    `${where}: page overflows horizontally — scrollWidth ${scrollW}px > viewport ${clientW}px`,
  ).toBeLessThanOrEqual(clientW + 1);
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("entry flow renders without horizontal overflow", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByTestId("button-enter-app")).toBeVisible();
      await expectNoHorizontalOverflow(page, "splash");

      await page.getByTestId("button-enter-app").click();
      await expect(page.getByTestId("card-explore")).toBeVisible();
      await expectNoHorizontalOverflow(page, "journey");

      await page.getByTestId("card-explore").click();
      // Explore care-setting picker.
      await expect(page.getByTestId("card-setting-outpatient")).toBeVisible();
      await expectNoHorizontalOverflow(page, "explore-care-settings");

      // Into the input-dense Opportunity screen (provider/volume inputs,
      // scenario tiles) — a real small-screen risk.
      await page.getByTestId("card-setting-outpatient").click();
      await page.getByTestId("button-continue").click();
      await page.waitForTimeout(500);
      await expectNoHorizontalOverflow(page, "explore-opportunity");
    });
  });
}
