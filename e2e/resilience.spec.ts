import { test, expect } from "@playwright/test";
import { enterHub, openTool, collectPageErrors, expectNoHorizontalOverflow } from "./support/nav";

/**
 * Error, empty and extreme states. There was no coverage of any of these.
 *
 * This matters more for this app than for most, because half the audience is
 * self-serving. A seller who hits a broken empty state talks over it; a health
 * system finance lead alone with the tool just concludes it is broken.
 *
 * Everything here is a state a real user reaches without doing anything odd:
 * corrupt storage from an interrupted write or an older version of the app, a
 * partner name longer than the header was designed for, a volume with more
 * digits than anyone expected, and zero.
 */

/** Every persistence key the app reads at boot, so we can poison all of them. */
const STORAGE_KEYS = [
  "abridge_partner_session",
  "abridge_partner_fingerprint",
  "abridge_partner_ts",
  "abridge_attain_draft",
  "abridge_forecast_saved_v1",
  "abridge_forecast_session_v1",
  "abridge_measure_recent_sessions_v1",
  "abridge_measure_to_forecast_v1",
  "abridge:plan-pdf-data",
  "abridge:explore-pdf",
];

test.describe("corrupt or hostile localStorage", () => {
  for (const [label, value] of [
    ["truncated JSON", '{"careSetting":"outpatient",'],
    ["wrong shape", '{"totally":"unexpected"}'],
    ["a bare string", "not json at all"],
    ["null", "null"],
    ["an array where an object belongs", "[1,2,3]"],
  ] as const) {
    test(`the app still boots with ${label} in every key`, async ({ page }) => {
      const errs = collectPageErrors(page);
      await page.addInitScript(
        ([keys, v]) => {
          for (const k of keys as string[]) {
            try { localStorage.setItem(k, v as string); } catch { /* quota */ }
          }
        },
        [STORAGE_KEYS, value] as const,
      );

      await enterHub(page);
      await expect(page.getByTestId("hub-card-financial")).toBeVisible();

      // And into a tool, which is where a bad snapshot actually gets read.
      await page.getByTestId("hub-card-financial").click();
      await page.waitForTimeout(800);
      await page.getByTestId("financial-card-explore").click();
      await page.waitForTimeout(1200);

      const heading = await page.locator("h1, h2").first().innerText().catch(() => "");
      expect(heading.trim().length, `${label}: rendered nothing`).toBeGreaterThan(0);
      expect(
        errs,
        `${label} caused uncaught errors (a user with stale storage sees this):\n${errs.join("\n")}`,
      ).toEqual([]);
    });
  }

  test("a print route with no stashed data does not render a blank page", async ({ page }) => {
    // Each print route falls back to SAMPLE data when its key is absent, which
    // is correct for previewing a layout by typing the URL. What must not
    // happen is a white page, which reads as a broken export.
    const errs = collectPageErrors(page);
    await page.goto("/?explorepdf=1&print=1");
    await page.waitForTimeout(2500);
    const text = (await page.locator("body").innerText()).trim();
    expect(text.length, "the print route rendered nothing at all").toBeGreaterThan(200);
    expect(errs, errs.join("\n")).toEqual([]);
  });
});

test.describe("extreme inputs", () => {
  test("a very long organisation name does not overflow the header", async ({ page }) => {
    const LONG = "Riverbend Integrated Regional Health System and Academic Medical Center of the Greater Valley";
    await openTool(page, "financial", "financial-card-explore");
    await page.getByTestId("ed-setting-outpatient").click();
    await page.waitForTimeout(1000);

    const text = page.locator('input[type="text"]:visible, input:not([inputmode]):visible').first();
    if (await text.count()) {
      await text.fill(LONG).catch(() => {});
      await page.waitForTimeout(600);
    }
    await expectNoHorizontalOverflow(page, "explore with a very long org name");
  });

  test("absurdly large and zero volumes neither crash nor print NaN", async ({ page }) => {
    const errs = collectPageErrors(page);
    await openTool(page, "financial", "financial-card-explore");
    await page.getByTestId("ed-setting-outpatient").click();
    await page.waitForTimeout(1000);

    for (const v of ["999999999", "0", "1"]) {
      await page.getByTestId("ed-input-providers").fill(v);
      await page.getByTestId("ed-input-total-encounters").fill(v);
      await page.getByTestId("ed-input-utilization").fill(v === "0" ? "0" : "100");
      await page.waitForTimeout(700);

      const body = await page.locator("body").innerText();
      // Prove the assertions below are not vacuous: if the screen is showing no
      // derived numbers at all, "there is no NaN" is true and means nothing.
      expect(body, `volume ${v}: no derived figure on screen, so the NaN checks prove nothing`).toMatch(/\$[\d,]|\d[\d,]*\s*(hours|min|%)/i);
      expect(body, `volume ${v} produced NaN on screen`).not.toMatch(/\bNaN\b/);
      expect(body, `volume ${v} produced Infinity on screen`).not.toMatch(/\bInfinity\b/);
      expect(body, `volume ${v} produced undefined on screen`).not.toMatch(/\bundefined\b/);
      await expectNoHorizontalOverflow(page, `explore at volume ${v}`);
    }
    expect(errs, errs.join("\n")).toEqual([]);
  });

  test("the empty proforma is an invitation, not a dead end", async ({ page }) => {
    // Zero care settings is the state every new user starts in.
    await openTool(page, "financial", "financial-card-new-deal");
    await page.waitForTimeout(1200);
    const body = await page.locator("body").innerText();
    expect(body, "the empty proforma offers no way forward").toMatch(/outpatient|add/i);
    expect(body).not.toMatch(/\bNaN\b|\bundefined\b/);
  });
});
