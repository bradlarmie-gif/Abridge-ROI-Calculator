import { expect, type Page } from "@playwright/test";

/**
 * Navigation helpers for the LIVE information architecture.
 *
 * The app has almost no URL routes: it is a state machine in App.tsx, so every
 * spec has to script the path from the splash. That made the suite fragile in a
 * specific way — when the splash switched from `JourneySelector` to the Value
 * Attainment Hub, all five specs kept navigating by `card-explore` /
 * `card-forecast` / `card-switch`, testids that now exist only on a screen
 * nothing can reach. The suite went 28/28 red and stayed that way.
 *
 * Every hub entry point therefore lives here, once. If the IA moves again, this
 * file is the only thing that has to move with it.
 */

/** The three top-level hubs, and the tools reachable inside each. */
export const LIVE_IA = {
  strategy: [
    "strategy-card-value-story",
    "strategy-card-care-signals",
    "strategy-card-cds",
    "strategy-card-prebill",
    // A coming-soon stub. Listed on purpose: the hub spec derives stub-ness from
    // aria-disabled, so leaving it in means a row that quietly loses its stub
    // marking without gaining a handler gets caught.
    "strategy-card-dictation",
  ],
  financial: [
    "financial-card-explore",
    "financial-card-roi-calculator",
    "financial-card-new-deal",
    "financial-card-app-rationalization",
  ],
  planning: ["planning-card-build", "planning-card-metrics"],
} as const;

export type HubName = keyof typeof LIVE_IA;

/** Splash → the Value Attainment Hub. Every flow starts here. */
export async function enterHub(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByTestId("button-enter-app").click();
  await expect(page.getByTestId("hub-card-financial")).toBeVisible();
}

/** Splash → hub → one of the three sub-hubs. */
export async function openHub(page: Page, hub: HubName): Promise<void> {
  await enterHub(page);
  await page.getByTestId(`hub-card-${hub}`).click();
  await expect(page.getByTestId(LIVE_IA[hub][0])).toBeVisible();
}

/** Splash → hub → sub-hub → a tool. */
export async function openTool(page: Page, hub: HubName, testId: string): Promise<void> {
  await openHub(page, hub);
  await page.getByTestId(testId).click();
}

/** A screen that scrolls sideways is broken on a phone; assert it never does. */
export async function expectNoHorizontalOverflow(page: Page, where: string): Promise<void> {
  const { scrollW, clientW } = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  expect(
    scrollW,
    `${where}: overflows horizontally — scrollWidth ${scrollW} > viewport ${clientW}`,
  ).toBeLessThanOrEqual(clientW + 1);
}

/**
 * Collect uncaught exceptions for the life of a test.
 *
 * A React error boundary can swallow a throw and still render something
 * plausible, so "the page looks fine" is not evidence. Assert on this.
 */
export function collectPageErrors(page: Page): string[] {
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push(e.message.split("\n")[0]));
  return errs;
}

/** Click whichever continue affordance this screen happens to render. */
export async function advance(page: Page, extra: string[] = []): Promise<boolean> {
  const ids = [
    ...extra,
    "ed-practice-continue", "ed-timesavings-continue", "driver-continue",
    "button-ed-revenue-continue", "button-ed-quality-continue",
    "ed-investment-continue", "ed-continue",
    "button-continue", "button-continue-mobile", "button-panel-continue",
  ];
  for (const id of ids) {
    const el = page.getByTestId(id);
    if (await el.isVisible().catch(() => false)) {
      await el.click();
      return true;
    }
  }
  const byText = page.getByRole("button", { name: /^(Continue|Next)\b/i }).first();
  if (await byText.isVisible().catch(() => false)) {
    await byText.click();
    return true;
  }
  return false;
}
