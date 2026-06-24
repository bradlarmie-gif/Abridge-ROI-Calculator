import { test, expect, type Page } from "@playwright/test";

/**
 * Phase 3: the Measure (realized value) wizard. Drives setup → the four quadrant
 * screens → forecast → Output, and asserts the realized-value card renders, the
 * evidence-doc PDF downloads (desktop), no overflow, no uncaught errors.
 * Entered via Forecast → Partner ROI Model (a reliable Measure entry point).
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

// The measure quadrant screens each have their own (desktop+mobile) continue button.
async function measureAdvance(page: Page) {
  const ids = ["capacity", "workforce", "revenue", "quality", "forecast"].flatMap((q) => [
    `button-continue-measure-${q}`,
    `button-continue-measure-${q}-mobile`,
  ]);
  for (const id of ids) {
    const el = page.getByTestId(id);
    if (await el.isVisible().catch(() => false)) { await el.click(); return true; }
  }
  return false;
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("Measure: setup → quadrants → Output → evidence PDF", async ({ page }) => {
      const crashes: string[] = [];
      page.on("pageerror", (e) => crashes.push(String(e)));

      // Forecast → Partner ROI Model → Measure setup.
      await page.goto("/");
      await page.getByTestId("button-enter-app").click();
      await page.getByTestId("card-forecast").click();
      await page.getByTestId("card-forecast-partner").click();
      await expect(page.getByTestId("pills-care-settings")).toBeVisible();

      // Outpatient is the default care setting (no pill needed). Provider settings
      // take their encounters in a per-setting card (input-encounters-outpatient).
      await page.getByTestId("input-org-name").fill("Test Health");
      await page.getByTestId("input-total-providers").fill("100");
      await page.getByTestId("input-live-providers").fill("80");
      await page.getByTestId("input-encounters-outpatient").fill("200000");
      await expectNoHorizontalOverflow(page, "measure-setup");

      await expect(page.getByTestId("button-next")).toBeEnabled();
      await page.getByTestId("button-next").click();

      // On the Capacity screen, add one driver via the sheet so the Output isn't
      // the empty "build the evidence first" state. Pick the foundational driver
      // and add it with its default config (a real calculated value).
      await page.getByRole("button", { name: /Add a driver to track/i }).first().click();
      await page.getByRole("button", { name: /Documentation Time per Note/i }).click();
      await page.waitForTimeout(400); // driver is added to the Capacity screen
      // Enter a before/after so the tracked driver carries real value.
      const cardInputs = page.locator('[data-testid^="input-without-"], [data-testid^="input-with-"]');
      if (await cardInputs.first().isVisible().catch(() => false)) {
        await page.locator('[data-testid^="input-without-"]').first().fill("12");
        await page.locator('[data-testid^="input-with-"]').first().fill("8");
      }
      await page.waitForTimeout(200);

      // Walk the quadrant + forecast screens until Output (realized card) appears.
      for (let i = 0; i < 8; i++) {
        if (await page.getByTestId("card-realized-today").isVisible().catch(() => false)) break;
        const moved = await measureAdvance(page);
        if (!moved) break;
        await page.waitForTimeout(300);
      }

      // Output renders.
      await expect(page.getByTestId("card-realized-today")).toBeVisible();
      await expectNoHorizontalOverflow(page, "measure-output");

      // Evidence-doc PDF downloads (desktop).
      if (vp.canDownload) {
        const dl = page.waitForEvent("download", { timeout: 25_000 });
        await page.getByTestId("button-download-evidence-doc").click();
        const download = await dl;
        expect(download.suggestedFilename(), "measure evidence PDF").toMatch(/\.pdf$/i);
      }

      expect(crashes, `Measure crashes:\n${crashes.join("\n")}`).toHaveLength(0);
    });
  });
}
