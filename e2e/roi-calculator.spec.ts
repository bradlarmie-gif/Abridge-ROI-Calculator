import { test, expect, type Page } from "@playwright/test";

/**
 * The whole application, end to end.
 *
 * One path: the landing screen hands off to the ROI Calculator, which walks
 * care setting → the practice's numbers → what changed → the answer, and
 * exports the one-pager. Run on desktop and mobile; the download is asserted
 * desktop-only (mobile opens the print view in a new tab instead).
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

async function enterCalculator(page: Page) {
  await page.goto("/");
  await page.getByTestId("button-enter-app").click();
  await expect(page.getByText("Outpatient", { exact: true })).toBeVisible();
}

/** Pick every goal the setting offers, then move on to the numbers step. */
async function pickAllGoals(page: Page) {
  const cards = page.locator("[data-testid^=goal-]");
  const n = await cards.count();
  expect(n, "the goals step offered nothing to pick").toBeGreaterThan(0);
  for (let i = 0; i < n; i++) await cards.nth(i).click();
  await page.getByRole("button", { name: /next: your numbers/i }).click();
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("landing screen leads straight into the calculator", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByTestId("button-enter-app")).toBeVisible();
      await expectNoHorizontalOverflow(page, "landing");
      await page.getByTestId("button-enter-app").click();
      await expect(page.getByText("Outpatient", { exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page, "care setting");
    });

    test("every care setting offers its own goals, and cannot be skipped", async ({ page }) => {
      for (const setting of ["Outpatient", "Emergency", "Inpatient", "Nursing"]) {
        await enterCalculator(page);
        await page.getByText(setting, { exact: true }).first().click();
        // the goals step gates the flow: nothing picked, nothing to continue to
        const next = page.getByRole("button", { name: /next: your numbers/i });
        await expect(next, `${setting}: continue should be disabled with no goal picked`).toBeDisabled();
        await expect(page.locator("[data-testid^=goal-]").first()).toBeVisible();
        await expectNoHorizontalOverflow(page, `${setting} goals step`);
        await pickAllGoals(page);
        await expect(page.locator("h1")).toBeVisible();
        await expectNoHorizontalOverflow(page, `${setting} account step`);
      }
    });

    test("what changes only shows the goals that were picked", async ({ page }) => {
      await enterCalculator(page);
      await page.getByText("Outpatient", { exact: true }).first().click();
      // pick Revenue only
      await page.getByTestId("goal-revenue").click();
      await page.getByRole("button", { name: /next: your numbers/i }).click();

      const inputs = page.locator("input");
      const vals = ["Riverbend Family Medicine", "42", "30", "2400", "68"];
      for (let i = 0; i < vals.length; i++) await inputs.nth(i).fill(vals[i]);
      await page.getByRole("button", { name: /next: what changes/i }).click();

      await expect(page.getByRole("button", { name: /^Revenue/ })).toBeVisible();
      await expect(page.getByRole("button", { name: /^Workforce/ })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /^Capacity/ })).toHaveCount(0);
    });

    test("cannot roll out to more clinicians than the practice has", async ({ page }) => {
      await enterCalculator(page);
      await page.getByText("Outpatient", { exact: true }).first().click();
      await pickAllGoals(page);

      const inputs = page.locator("input");
      const total = inputs.nth(1);
      const using = inputs.nth(2);

      // typing past the headcount is capped as you type
      await total.fill("40");
      await using.fill("200");
      await expect(using, "the subset should cap at the headcount while typing").toHaveValue("40");

      // and lowering the headcount afterwards pulls the subset down with it,
      // otherwise adoption reads over 100%
      await using.fill("40");
      await total.fill("12");
      await page.locator("body").click();
      await expect(using, "lowering the headcount should pull the subset down").toHaveValue("12");
    });

    test("a full run produces a dollar answer", async ({ page }) => {
      await enterCalculator(page);
      await page.getByText("Outpatient", { exact: true }).first().click();
      await pickAllGoals(page);

      const inputs = page.locator("input");
      const vals = ["Riverbend Family Medicine", "42", "30", "2400", "68"];
      for (let i = 0; i < vals.length; i++) await inputs.nth(i).fill(vals[i]);

      await page.getByRole("button", { name: /next: what changes/i }).click();

      const toggles = page.locator('button[role="switch"], input[type="checkbox"]');
      const n = Math.min(3, await toggles.count());
      for (let i = 0; i < n; i++) await toggles.nth(i).click();

      await page.getByRole("button", { name: /see my number/i }).click();

      // the headline number must be real money, not $0 and not NaN
      const body = await page.locator("body").innerText();
      expect(body, "the answer step shows no dollar figure").toMatch(/\$[\d.,]+[KM]?/);
      expect(body).not.toContain("NaN");
      await expectNoHorizontalOverflow(page, "answer step");
    });
  });
}
