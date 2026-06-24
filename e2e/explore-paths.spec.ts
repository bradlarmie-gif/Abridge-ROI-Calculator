import { test, expect, type Page } from "@playwright/test";

/**
 * Phase 1 of the end-to-end suite: drives the Explore modeling path for ALL FOUR
 * care settings (outpatient, ED, inpatient, nursing) through to the Model, the
 * per-setting PDF export, the proforma hub, and the Present view.
 *
 * Asserts, per setting, at desktop + mobile: the flow reaches the Model, a real
 * (non-zero) value renders, no uncaught exceptions fire, the page never overflows
 * horizontally, the per-setting PDF actually downloads (desktop), and Present opens.
 *
 * The unit suite (vitest) locks the MATH; this proves the FLOWS/wiring/rendering
 * don't break. The app has no deep-link URLs, so each test scripts the full path.
 */

const SETTINGS = [
  { id: "outpatient", nursing: false, providers: "50", encounters: "150000", util: "75", toggles: ["toggle-wrvu"] },
  { id: "ed",         nursing: false, providers: "40", encounters: "72000",  util: "75", toggles: ["toggle-edEmLevel", "toggle-lwbsRecovery"] },
  { id: "inpatient",  nursing: false, providers: "30", encounters: "12000",  util: "75", toggles: ["toggle-drgAccuracy", "toggle-obsDefense"] },
  { id: "nursing",    nursing: true,  beds: "300", providers: "450", encounters: "", util: "75", toggles: ["toggle-nursingOvertime", "toggle-nursingHapi"] },
] as const;

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

// Desktop/mobile twin continue buttons; click whichever is visible.
async function advance(page: Page) {
  const candidates = [
    "button-continue", "button-continue-mobile", "button-panel-continue",
    "button-continue-revenue", "button-continue-revenue-mobile",
  ];
  for (const id of candidates) {
    const el = page.getByTestId(id);
    if (await el.isVisible().catch(() => false)) { await el.click(); return true; }
  }
  return false;
}

// From the Opportunity screen, walk forward enabling the setting's value driver(s)
// until the Model screen (button-add-proforma) appears.
async function driveToModel(page: Page, cfg: typeof SETTINGS[number]) {
  if (cfg.nursing) {
    await page.getByTestId("input-beds").fill(cfg.beds!);
    await page.getByTestId("input-providers").fill(cfg.providers);
  } else {
    await page.getByTestId("input-providers").fill(cfg.providers);
    await page.getByTestId("input-total-encounters").fill(cfg.encounters);
  }
  await page.getByTestId("input-utilization").fill(cfg.util);
  await advance(page);

  const clicked = new Set<string>();
  for (let i = 0; i < 12; i++) {
    if (await page.getByTestId("button-add-proforma").isVisible().catch(() => false)) return;
    for (const t of cfg.toggles) {
      const el = page.getByTestId(t);
      if (!clicked.has(t) && (await el.isVisible().catch(() => false))) {
        await el.click();
        clicked.add(t);
        await page.waitForTimeout(150);
      }
    }
    const scenario = page.getByTestId("button-scenario-typical");
    if (await scenario.isVisible().catch(() => false)) await scenario.click();
    const moved = await advance(page);
    if (!moved) break;
    await page.waitForTimeout(300);
  }
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const cfg of SETTINGS) {
      test(`${cfg.id}: Explore → Model → proforma → Present`, async ({ page }) => {
        const crashes: string[] = [];
        page.on("pageerror", (e) => crashes.push(String(e)));

        await page.goto("/");
        await page.getByTestId("button-enter-app").click();
        await page.getByTestId("card-explore").click();
        await page.getByTestId(`card-setting-${cfg.id}`).click();
        await page.getByTestId("button-continue").click();
        await page.waitForTimeout(900); // care-setting screen has an 800ms setup delay

        await driveToModel(page, cfg);

        // Reached the Model with real value.
        await expect(page.getByTestId("button-add-proforma")).toBeVisible();
        const net = page.getByTestId("text-net-value").first();
        await expect(net).toBeVisible();
        await expect(net, `${cfg.id}: net value should not be $0`).not.toHaveText(/^\$0$/);
        await expectNoHorizontalOverflow(page, `${cfg.id}-model`);

        // Per-setting PDF export actually downloads (desktop; mobile uses window.open).
        if (vp.canDownload) {
          await page.getByTestId("button-export").click();
          await expect(page.getByTestId("button-generate-pdf")).toBeVisible();
          const dl = page.waitForEvent("download", { timeout: 25_000 });
          await page.getByTestId("button-generate-pdf").click();
          const download = await dl;
          expect(download.suggestedFilename(), `${cfg.id}: PDF filename`).toMatch(/\.pdf$/i);
          await page.waitForTimeout(300); // modal closes after export
        }

        // Add to the proforma → hub → Present.
        await page.getByTestId("button-add-proforma").click();
        await expect(page.getByTestId("button-present")).toBeVisible();
        await expectNoHorizontalOverflow(page, `${cfg.id}-hub`);

        await page.getByTestId("button-present").click();
        await expect(page.getByTestId("proforma-present")).toBeVisible();
        await page.waitForTimeout(600);
        await expectNoHorizontalOverflow(page, `${cfg.id}-present`);

        expect(crashes, `${cfg.id}: uncaught errors:\n${crashes.join("\n")}`).toHaveLength(0);
      });
    }
  });
}
