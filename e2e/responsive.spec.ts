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

// The flow has desktop/mobile twin "continue" buttons (one hidden per breakpoint),
// and they all call onNext — so click whichever is actually visible.
async function advance(page: Page) {
  const candidates = [
    "button-continue",
    "button-continue-mobile",
    "button-panel-continue",
    "button-continue-revenue",
    "button-continue-revenue-mobile",
  ];
  for (const id of candidates) {
    const el = page.getByTestId(id);
    if (await el.isVisible().catch(() => false)) {
      await el.click();
      return;
    }
  }
  throw new Error("no visible continue button found");
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

    test("full flow into the Present view renders without horizontal overflow", async ({ page }) => {
      await page.goto("/");
      await page.getByTestId("button-enter-app").click();
      await page.getByTestId("card-explore").click();

      // Care setting → Opportunity.
      await page.getByTestId("card-setting-outpatient").click();
      await page.getByTestId("button-continue").click();

      // Opportunity inputs (providers + total volume + utilization → valid + value).
      await page.getByTestId("input-providers").fill("50");
      await page.getByTestId("input-total-encounters").fill("150000");
      await page.getByTestId("input-utilization").fill("75");
      await advance(page);

      // Time savings — pick a scenario so there's time value.
      await page.getByTestId("button-scenario-typical").click();
      await advance(page);

      // Capacity → Workforce.
      await advance(page);
      // Workforce → Revenue.
      await advance(page);

      // Revenue — enable wRVU so the model produces value (unlocks "Add").
      await page.getByTestId("toggle-wrvu").click();
      await advance(page);

      // Quality → Investment.
      await advance(page);
      // Investment → Model.
      await advance(page);

      // Model → add to the proforma → lands on the hub.
      await page.getByTestId("button-add-proforma").click();
      await expect(page.getByTestId("button-present")).toBeVisible();
      await expectNoHorizontalOverflow(page, "proforma-hub");

      // Launch Present (the live-call story).
      await page.getByTestId("button-present").click();
      await expect(page.getByTestId("proforma-present")).toBeVisible();
      await page.waitForTimeout(600);
      await expectNoHorizontalOverflow(page, "present-hook");

      // Jump to the care-setting beat.
      await page.getByTestId("present-chapter-1").click();
      await page.waitForTimeout(600);
      await expectNoHorizontalOverflow(page, "present-setting");

      // Jump to the combine beat + reveal the math (densest layout).
      await page.getByTestId("present-chapter-2").click();
      await page.waitForTimeout(600);
      await expectNoHorizontalOverflow(page, "present-combine");
      await page.getByTestId("button-present-show-math").click();
      await page.waitForTimeout(400);
      await expectNoHorizontalOverflow(page, "present-combine-math");
    });
  });
}
