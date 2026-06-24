import { test, expect, type Page } from "@playwright/test";

/**
 * Phase 4: the Switch / Assess paths.
 *  - Scribe assessment → Full Analysis → export PDF.
 *  - Nursing assessment → walk to the Next Step screen → export assessment PDF.
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

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("Scribe assessment → Full Analysis → PDF", async ({ page }) => {
      const crashes: string[] = [];
      page.on("pageerror", (e) => crashes.push(String(e)));

      await page.goto("/");
      await page.getByTestId("button-enter-app").click();
      await page.getByTestId("card-switch").click();
      await page.getByTestId("button-path-scribes").click();

      // Scribe program inputs — the full-analysis button appears once they're set.
      await page.getByTestId("input-scribe-count").fill("10");
      await page.getByTestId("input-scribe-cost").fill("25");
      await page.getByTestId("input-providers-with-scribes").fill("40");
      await page.getByTestId("input-total-providers").fill("100");
      await page.getByTestId("input-scribe-hours").fill("36");
      await page.getByTestId("input-annual-encounters").fill("200000");
      await expectNoHorizontalOverflow(page, "scribe-assessment");

      await expect(page.getByTestId("button-see-full-analysis")).toBeVisible();
      await page.getByTestId("button-see-full-analysis").click();

      // Full analysis with the export hero.
      await expect(page.getByTestId("button-export-pdf-hero")).toBeVisible();
      await expectNoHorizontalOverflow(page, "scribe-full-analysis");

      if (vp.canDownload) {
        await page.getByTestId("button-export-pdf-hero").click();
        await expect(page.getByTestId("button-generate-pdf")).toBeVisible();
        const dl = page.waitForEvent("download", { timeout: 25_000 });
        await page.getByTestId("button-generate-pdf").click();
        const download = await dl;
        expect(download.suggestedFilename(), "scribe PDF").toMatch(/\.pdf$/i);
      }

      expect(crashes, `Scribe crashes:\n${crashes.join("\n")}`).toHaveLength(0);
    });

    test("Nursing assessment → Next Step → export PDF", async ({ page }) => {
      const crashes: string[] = [];
      page.on("pageerror", (e) => crashes.push(String(e)));

      await page.goto("/");
      await page.getByTestId("button-enter-app").click();
      await page.getByTestId("card-switch").click();
      await page.getByTestId("button-path-nursing").click();

      // Screen 1: program inputs.
      await expect(page.getByTestId("text-nursing-program-headline")).toBeVisible();
      await page.getByTestId("input-staffed-beds").fill("300");
      await page.getByTestId("input-nurse-ftes").fill("450");
      await expectNoHorizontalOverflow(page, "nursing-assess-1");

      // Walk all 6 screens to the Next Step screen. Each screen's primary CTA is a
      // StepFooter "button-next" (desktop+mobile twins → click the visible one); the
      // priorities screen gates its CTA until a priority card is selected.
      for (let i = 0; i < 10; i++) {
        if (await page.getByTestId("text-nursing-nextstep-headline").isVisible().catch(() => false)) break;
        const priority = page.locator('[data-testid^="priority-card-"]').first();
        if (await priority.isVisible().catch(() => false)) await priority.click();
        const nexts = page.locator('[data-testid^="button-nursing-next"]');
        const n = await nexts.count();
        let clicked = false;
        for (let j = 0; j < n; j++) {
          const el = nexts.nth(j);
          if ((await el.isVisible().catch(() => false)) && (await el.isEnabled().catch(() => false))) {
            await el.click();
            clicked = true;
            break;
          }
        }
        if (!clicked) break;
        await page.waitForTimeout(350);
      }

      await expect(page.getByTestId("text-nursing-nextstep-headline")).toBeVisible();
      await expectNoHorizontalOverflow(page, "nursing-assess-nextstep");

      // Export the assessment (form → confirm).
      await page.getByTestId("button-export-assessment").click();
      await page.getByTestId("input-export-org").fill("Test Health");
      if (vp.canDownload) {
        const dl = page.waitForEvent("download", { timeout: 25_000 });
        await page.getByTestId("button-export-confirm").click();
        const download = await dl;
        expect(download.suggestedFilename(), "nursing assessment PDF").toMatch(/\.pdf$/i);
      } else {
        // Mobile uses the share sheet (navigator.share), which isn't catchable in
        // headless — just confirm the export action is reachable.
        await expect(page.getByTestId("button-export-confirm")).toBeVisible();
      }

      expect(crashes, `Nursing assess crashes:\n${crashes.join("\n")}`).toHaveLength(0);
    });
  });
}
