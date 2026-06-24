import { test, expect, type Page } from "@playwright/test";

/**
 * Phase 2: the Forecast paths.
 *  - Compare Pricing deal desk (deep): enter org volume + two deal prices →
 *    the live scoreboard/verdict appears → the customer "Download summary" PDF
 *    fires (desktop) → no overflow.
 *  - New Deal Proforma (smoke): lands on the empty Business Case hub.
 *  - Partner ROI Model (smoke): lands on Measure.
 * Desktop + mobile; downloads asserted desktop-only (mobile uses window.open).
 */

const VIEWPORTS = [
  { name: "Desktop", width: 1280, height: 800, canDownload: true },
  { name: "iPhone 12", width: 390, height: 844, canDownload: false },
];

async function expectNoHorizontalOverflow(page: Page, where: string) {
  const { scrollW, clientW } = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  expect(scrollW, `${where}: overflows — scrollWidth ${scrollW} > viewport ${clientW}`).toBeLessThanOrEqual(clientW + 1);
}

async function gotoForecastMode(page: Page) {
  await page.goto("/");
  await page.getByTestId("button-enter-app").click();
  await page.getByTestId("card-forecast").click();
  await expect(page.getByTestId("card-forecast-pricing")).toBeVisible();
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("Compare Pricing: volume + prices → scoreboard → summary PDF", async ({ page }) => {
      const crashes: string[] = [];
      page.on("pageerror", (e) => crashes.push(String(e)));

      await gotoForecastMode(page);
      await page.getByTestId("card-forecast-pricing").click();

      // Enter org volume + a price on each of the two default deals → both price out.
      await page.getByTestId("input-org-providers").fill("50");
      await page.getByTestId("input-deal-price-0").fill("120");
      await page.getByTestId("input-deal-price-1").fill("150");

      // The live scoreboard (verdict) appears once ≥2 deals are priced.
      await expect(page.getByTestId("pricing-scoreboard")).toBeVisible();
      await expectNoHorizontalOverflow(page, "compare-pricing");

      // The customer-facing summary PDF actually downloads (desktop).
      if (vp.canDownload) {
        const dl = page.waitForEvent("download", { timeout: 25_000 });
        await page.getByTestId("button-export-pricing-summary").click();
        const download = await dl;
        expect(download.suggestedFilename(), "pricing summary PDF").toMatch(/\.pdf$/i);
      }

      expect(crashes, `Compare Pricing crashes:\n${crashes.join("\n")}`).toHaveLength(0);
    });

    test("New Deal Proforma: lands on the Business Case hub", async ({ page }) => {
      const crashes: string[] = [];
      page.on("pageerror", (e) => crashes.push(String(e)));

      await gotoForecastMode(page);
      await page.getByTestId("card-forecast-new-deal").click();

      // Empty hub shows the "Add a care setting" buttons.
      await expect(page.getByTestId("button-add-outpatient")).toBeVisible();
      await expectNoHorizontalOverflow(page, "new-deal-hub");
      expect(crashes, crashes.join("\n")).toHaveLength(0);
    });

    test("Partner ROI Model: lands on Measure", async ({ page }) => {
      const crashes: string[] = [];
      page.on("pageerror", (e) => crashes.push(String(e)));

      await gotoForecastMode(page);
      await page.getByTestId("card-forecast-partner").click();

      await expect(page.getByTestId("pills-care-settings")).toBeVisible();
      await expectNoHorizontalOverflow(page, "partner-measure");
      expect(crashes, crashes.join("\n")).toHaveLength(0);
    });
  });
}
