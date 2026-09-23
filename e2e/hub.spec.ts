import { test, expect } from "@playwright/test";
import { LIVE_IA, enterHub, openHub, expectNoHorizontalOverflow, collectPageErrors, type HubName } from "./support/nav";

/**
 * The hub is the first screen every user sees, and until now it had no coverage
 * of any kind: no vitest, no copy guardrail, no layout-smoke route, no e2e.
 *
 * This is the floor. Every hub renders, every row either opens something or is
 * honestly marked coming-soon, nothing throws, and nothing scrolls sideways.
 */

const VIEWPORTS = [
  { name: "Desktop", width: 1280, height: 800 },
  { name: "iPhone 12", width: 390, height: 844 },
];

const HUBS = Object.keys(LIVE_IA) as HubName[];

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("the hub renders all three sections", async ({ page }) => {
      const errs = collectPageErrors(page);
      await enterHub(page);
      for (const hub of HUBS) {
        await expect(page.getByTestId(`hub-card-${hub}`)).toBeVisible();
      }
      await expectNoHorizontalOverflow(page, "hub");
      expect(errs, `uncaught on the hub: ${errs.join(" | ")}`).toEqual([]);
    });

    for (const hub of HUBS) {
      test(`${hub}: every row is present and the page is clean`, async ({ page }) => {
        const errs = collectPageErrors(page);
        await openHub(page, hub);
        for (const id of LIVE_IA[hub]) {
          await expect(page.getByTestId(id), `${hub}: missing row ${id}`).toBeVisible();
        }
        await expectNoHorizontalOverflow(page, `${hub} hub`);
        expect(errs, `uncaught on the ${hub} hub: ${errs.join(" | ")}`).toEqual([]);
      });

      test(`${hub}: live rows navigate, coming-soon rows stay inert`, async ({ page }) => {
        // A row that looks clickable and does nothing is the worst kind of defect
        // for a self-serve audience: there is no one standing there to ask.
        //
        // Coming-soon rows are the sanctioned exception, and the kit makes them
        // legible in the DOM: `comingSoon` nulls onClick and drops role/tabIndex,
        // leaving aria-disabled behind. Derive the expectation from the markup
        // rather than hardcoding which rows are stubs, so a row that loses its
        // stub marking WITHOUT gaining a handler is caught here.
        //
        // That distinction is load-bearing. PlanningHub's Metrics row once said
        // "Coming soon" while carrying a live handler that opened the plan
        // BUILDER; it was inert only because the flag happened to null the click.
        for (const id of LIVE_IA[hub]) {
          await openHub(page, hub);
          const row = page.getByTestId(id);
          const stub = (await row.getAttribute("aria-disabled")) === "true";
          const before = await page.locator("h1, h2").first().innerText().catch(() => "");
          await row.click({ force: true }).catch(() => {});
          await page.waitForTimeout(900);
          const after = await page.locator("h1, h2").first().innerText().catch(() => "");
          if (stub) {
            expect(after, `${id} is marked coming-soon but navigated`).toBe(before);
            await expect(row, `${id} is coming-soon, so it must not be a button`).not.toHaveAttribute("role", "button");
          } else {
            expect(after, `${id} did not go anywhere (still on "${before}")`).not.toBe(before);
          }
        }
      });
    }
  });
}
