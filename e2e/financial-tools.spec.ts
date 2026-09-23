import { test, expect } from "@playwright/test";
import { openTool, expectNoHorizontalOverflow, collectPageErrors } from "./support/nav";

/**
 * The three Financial-hub tools that are not Explore: the quick ROI calculator,
 * the New Deal proforma, and App Rationalization.
 *
 * Replaces forecast-paths.spec.ts, which entered through `card-forecast` on the
 * retired JourneySelector and spent two thirds of its assertions on surfaces
 * that are no longer part of the product:
 *
 *   - Compare Pricing / the dual-scenario deal desk was retired outright.
 *   - "Partner ROI Model" opened Measure, which the hub cannot reach. Measure
 *     still has one live entry — the ?data_receipt= deep link — and is covered
 *     by measure-path.spec.ts, which enters that way.
 *
 * Smoke depth on purpose: these three each have their own unit coverage for the
 * math. What was missing is proof that the hub actually opens them, that they
 * render, and that they do not throw or overflow.
 */

const VIEWPORTS = [
  { name: "Desktop", width: 1280, height: 800 },
  { name: "iPhone 12", width: 390, height: 844 },
];

const TOOLS = [
  { id: "financial-card-roi-calculator", label: "ROI calculator" },
  { id: "financial-card-new-deal", label: "New Deal proforma" },
  { id: "financial-card-app-rationalization", label: "App Rationalization" },
];

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const tool of TOOLS) {
      test(`${tool.label}: opens, renders and stays clean`, async ({ page }) => {
        const crashes = collectPageErrors(page);

        await openTool(page, "financial", tool.id);
        await page.waitForTimeout(1200);

        // It went somewhere with real content, not a blank error-boundary screen.
        const heading = await page.locator("h1, h2").first().innerText().catch(() => "");
        expect(heading.trim().length, `${tool.label}: no heading rendered`).toBeGreaterThan(0);
        expect(heading, `${tool.label}: still on the Financial hub`).not.toMatch(/put it in dollars/i);

        await expectNoHorizontalOverflow(page, tool.label);
        expect(crashes, `${tool.label}: uncaught errors:\n${crashes.join("\n")}`).toHaveLength(0);
      });
    }

    test("New Deal proforma opens empty, offering a care setting to add", async ({ page }) => {
      const crashes = collectPageErrors(page);
      await openTool(page, "financial", "financial-card-new-deal");
      await page.waitForTimeout(1200);
      const body = await page.locator("body").innerText();
      expect(body, "the empty proforma should invite adding a care setting").toMatch(/outpatient/i);
      expect(crashes, crashes.join("\n")).toHaveLength(0);
    });
  });
}
