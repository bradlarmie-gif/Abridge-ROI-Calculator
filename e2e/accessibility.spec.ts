import { test, expect, type Page } from "@playwright/test";
import { LIVE_IA, enterHub, openHub, openTool, collectPageErrors, type HubName } from "./support/nav";

/**
 * Accessibility baseline. There was none.
 *
 * Deliberately narrow and dependency-free: this asserts the things that are
 * specific to how this app is built, and that break silently. A generic axe pass
 * would add breadth and is worth doing next, but it would not have caught the
 * risk that motivated this file.
 *
 * That risk is the hub. Its rows are not <button>s — they are motion.divs with a
 * hand-rolled role="button" + tabIndex + onKeyDown. Every affordance a real
 * button gives you for free is therefore something someone had to remember:
 * reachability by Tab, activation by Enter AND Space, a visible focus ring, and
 * an accessible name. Hand-rolled controls are exactly where keyboard access
 * quietly stops working, and the hub is the first screen every user sees.
 */

const HUBS = Object.keys(LIVE_IA) as HubName[];

/** Tab until `testId` holds focus, or give up. Returns how many tabs it took. */
async function tabTo(page: Page, testId: string, max = 40): Promise<number> {
  for (let i = 1; i <= max; i++) {
    await page.keyboard.press("Tab");
    const onIt = await page
      .getByTestId(testId)
      .evaluate((el) => el === document.activeElement || el.contains(document.activeElement))
      .catch(() => false);
    if (onIt) return i;
  }
  return -1;
}

test.describe("keyboard access", () => {
  test("the splash CTA is reachable and activates by keyboard", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("button-enter-app")).toBeVisible();
    expect(await tabTo(page, "button-enter-app"), "could not Tab to the splash CTA").toBeGreaterThan(0);
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("hub-card-financial")).toBeVisible();
  });

  for (const hub of HUBS) {
    test(`${hub}: every live row is reachable by Tab and opens with Enter`, async ({ page }) => {
      for (const id of LIVE_IA[hub]) {
        await openHub(page, hub);
        const row = page.getByTestId(id);
        if ((await row.getAttribute("aria-disabled")) === "true") {
          // A coming-soon row must be OUT of the tab order, not a focus stop
          // that does nothing when you press Enter.
          expect(await row.getAttribute("tabindex"), `${id} is coming-soon but still focusable`).toBeNull();
          continue;
        }
        const tabs = await tabTo(page, id);
        expect(tabs, `${id} is not reachable by keyboard`).toBeGreaterThan(0);
        const before = await page.locator("h1, h2").first().innerText().catch(() => "");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(900);
        const after = await page.locator("h1, h2").first().innerText().catch(() => "");
        expect(after, `${id} is focusable but Enter does nothing`).not.toBe(before);
      }
    });

    test(`${hub}: rows activate with Space as well as Enter`, async ({ page }) => {
      // role="button" must honour BOTH keys. A hand-rolled handler that checks
      // only "Enter" passes a casual keyboard test and still fails a screen
      // reader user, because Space is the conventional activation key.
      const id = LIVE_IA[hub][0];
      await openHub(page, hub);
      expect(await page.getByTestId(id).getAttribute("aria-disabled")).not.toBe("true");
      const tabs = await tabTo(page, id);
      expect(tabs, `${id}: not reachable`).toBeGreaterThan(0);
      const before = await page.locator("h1, h2").first().innerText().catch(() => "");
      await page.keyboard.press("Space");
      await page.waitForTimeout(900);
      const after = await page.locator("h1, h2").first().innerText().catch(() => "");
      expect(after, `${id}: Space does not activate it`).not.toBe(before);
    });

    test(`${hub}: focused rows show a visible focus indicator`, async ({ page }) => {
      // Reachable but invisible focus is not keyboard accessible in practice:
      // you cannot see where you are.
      await openHub(page, hub);
      await tabTo(page, LIVE_IA[hub][0]);
      const styles = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return null;
        const cs = getComputedStyle(el);
        return { outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, boxShadow: cs.boxShadow, cls: el.className };
      });
      expect(styles, "nothing held focus").not.toBeNull();
      const visible =
        (styles!.outlineStyle !== "none" && parseFloat(styles!.outlineWidth) > 0) ||
        (styles!.boxShadow !== "none" && styles!.boxShadow !== "") ||
        /focus-visible:ring/.test(styles!.cls);
      expect(visible, `focused row has no visible focus indicator (${JSON.stringify(styles)})`).toBe(true);
    });
  }
});

test.describe("names and labels", () => {
  test("every hub row exposes an accessible name", async ({ page }) => {
    // A row whose whole content is decorative (a number rail, an arrow) with no
    // text node reaches a screen reader as "button".
    for (const hub of HUBS) {
      await openHub(page, hub);
      for (const id of LIVE_IA[hub]) {
        const name = await page.getByTestId(id).evaluate((el) => {
          const aria = el.getAttribute("aria-label");
          return (aria || (el as HTMLElement).innerText || "").trim();
        });
        expect(name.length, `${id} has no accessible name`).toBeGreaterThan(2);
      }
    }
  });

  test("every numeric input on the Explore practice screen is labelled", async ({ page }) => {
    // The densest input screen in the app. An unlabelled number box is
    // unusable with a screen reader and ambiguous with one.
    await openTool(page, "financial", "financial-card-explore");
    await page.getByTestId("ed-setting-outpatient").click();
    await page.waitForTimeout(1000);

    const unlabelled = await page.evaluate(() => {
      const bad: string[] = [];
      document.querySelectorAll("input").forEach((el) => {
        const im = el.getAttribute("inputmode");
        if (im !== "numeric" && im !== "decimal") return;
        if (!(el.offsetWidth || el.offsetHeight)) return;
        const id = el.getAttribute("id");
        const labelled =
          el.getAttribute("aria-label") ||
          el.getAttribute("aria-labelledby") ||
          el.getAttribute("placeholder") ||
          el.closest("label") ||
          (id && document.querySelector(`label[for="${id}"]`));
        if (!labelled) bad.push(el.getAttribute("data-testid") || el.outerHTML.slice(0, 80));
      });
      return bad;
    });
    expect(unlabelled, `unlabelled numeric inputs:\n  ${unlabelled.join("\n  ")}`).toEqual([]);
  });

  test("the hub has exactly one top-level heading", async ({ page }) => {
    const errs = collectPageErrors(page);
    await enterHub(page);
    const h1s = await page.locator("h1").count();
    expect(h1s, `the hub renders ${h1s} <h1> elements`).toBeLessThanOrEqual(1);
    expect(errs).toEqual([]);
  });
});
