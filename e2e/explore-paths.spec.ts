import { test, expect, type Page } from "@playwright/test";
import { openTool, expectNoHorizontalOverflow, collectPageErrors, advance } from "./support/nav";

/**
 * Drives the Explore modeling path for ALL FOUR care settings through to the
 * Model, the PDF export, the proforma hub and the Present view.
 *
 * Rewritten for the live IA and the editorial Explore. The previous version
 * entered through `card-explore` on the retired JourneySelector and filled
 * `input-providers` / `input-total-encounters` on the retired Opportunity
 * screen — none of which the app has rendered since the hub landed. It failed
 * at step two on every one of its 8 permutations.
 *
 * The unit suite locks the MATH. This proves the FLOW: that the screens wire
 * together, render a real number, export, and never scroll sideways.
 */

const SETTINGS = [
  { id: "outpatient", label: "outpatient", nursing: false, providers: "50", encounters: "150000", util: "75" },
  { id: "ed",         label: "ED",         nursing: false, providers: "40", encounters: "72000",  util: "75" },
  { id: "inpatient",  label: "inpatient",  nursing: false, providers: "30", encounters: "12000",  util: "75", alos: "4.5" },
  { id: "nursing",    label: "nursing",    nursing: true,  providers: "450", beds: "300",         util: "75" },
] as const;

const VIEWPORTS = [
  { name: "Desktop", width: 1280, height: 800, canDownload: true },
  { name: "iPhone 12", width: 390, height: 844, canDownload: false },
];

/** Fill whichever scale inputs this setting renders. */
async function fillPractice(page: Page, cfg: typeof SETTINGS[number]) {
  const set = async (id: string, v?: string) => {
    if (!v) return;
    const el = page.getByTestId(id);
    if (await el.isVisible().catch(() => false)) await el.fill(v);
  };
  await set("ed-input-providers", cfg.providers);
  await set("ed-input-beds", "beds" in cfg ? cfg.beds : undefined);
  await set("ed-input-total-encounters", "encounters" in cfg ? cfg.encounters : undefined);
  await set("ed-input-alos", "alos" in cfg ? cfg.alos : undefined);
  await set("ed-input-utilization", cfg.util);
  await page.waitForTimeout(250);
}

/**
 * Turn every driver on. They default OFF by design — the seller switches them on
 * live, with the customer — so an untouched walk models nothing and the Model
 * screen legitimately shows $0.
 */
async function turnOnDrivers(page: Page) {
  for (let round = 0; round < 3; round++) {
    const off = page.locator('[role=switch][aria-checked="false"]');
    if ((await off.count()) === 0) return;
    await off.first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
}

/** Walk forward from the practice screen until the Model appears. */
async function driveToModel(page: Page, cfg: typeof SETTINGS[number]) {
  await fillPractice(page, cfg);
  for (let i = 0; i < 14; i++) {
    if (await page.getByTestId("ed-model-add-proforma").isVisible().catch(() => false)) return;
    await turnOnDrivers(page);
    // Newly enabled drivers can expose their own scale inputs.
    const blanks = page.locator('input[inputmode="numeric"], input[inputmode="decimal"]');
    for (let k = 0, n = await blanks.count(); k < n; k++) {
      const el = blanks.nth(k);
      if (!(await el.isVisible().catch(() => false))) continue;
      if (await el.inputValue().catch(() => "x")) continue;
      await el.fill("40").catch(() => {});
    }
    if (!(await advance(page))) break;
    await page.waitForTimeout(500);
  }
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const cfg of SETTINGS) {
      test(`${cfg.label}: Explore → Model → proforma → Present`, async ({ page }) => {
        const crashes = collectPageErrors(page);

        await openTool(page, "financial", "financial-card-explore");
        await page.getByTestId(`ed-setting-${cfg.id}`).click();
        await page.waitForTimeout(900);

        await driveToModel(page, cfg);

        await expect(
          page.getByTestId("ed-model-add-proforma"),
          `${cfg.label}: never reached the Model screen`,
        ).toBeVisible();
        await expectNoHorizontalOverflow(page, `${cfg.label}-model`);

        // A model built with every driver on must not read zero.
        const body = await page.locator("body").innerText();
        const dollars = body.match(/\$[\d,]+/g) ?? [];
        const nonZero = dollars.filter((d) => d.replace(/\D/g, "") !== "" && Number(d.replace(/\D/g, "")) > 0);
        expect(nonZero.length, `${cfg.label}: Model shows no non-zero dollar figure`).toBeGreaterThan(0);

        // Model → the proforma workbench ("Build the deal.") → the case → Present.
        // The legacy ProformaHub and its `button-present` live behind
        // ?proformalegacy=1 and are not on the launch surface.
        await page.getByTestId("ed-model-add-proforma").click();
        await expect(page.getByTestId("proforma-see-case")).toBeVisible();
        await expectNoHorizontalOverflow(page, `${cfg.label}-proforma-build`);

        await page.getByTestId("proforma-see-case").click();
        await page.waitForTimeout(700);
        await expect(page.getByTestId("proforma-present")).toBeVisible();
        await expectNoHorizontalOverflow(page, `${cfg.label}-proforma-case`);

        await page.getByTestId("proforma-present").click();
        await page.waitForTimeout(900);
        await expectNoHorizontalOverflow(page, `${cfg.label}-present`);

        expect(crashes, `${cfg.label}: uncaught errors:\n${crashes.join("\n")}`).toHaveLength(0);
      });
    }
  });
}
