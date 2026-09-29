// Navigation sweep: does HOME go home, and does BACK go back?
//
// Both affordances are on the shared header of every screen, and both were
// reported as misbehaving. Neither is covered by any other gate: the e2e suite
// walks FORWARD through flows, layout-smoke checks geometry, and the interaction
// sweep types into inputs. Nothing ever pressed Back.
//
// For every reachable screen this records where the logo lands and where Back
// lands, so the failure is a table rather than an anecdote.
import { chromium } from "playwright";

const BASE = process.env.NAV_BASE || "http://localhost:5199";
const settle = (p, ms = 1100) => p.waitForTimeout(ms);
const where = async (p) => {
  const h = (await p.locator("h1, h2").first().innerText().catch(() => "")).trim().replace(/\s+/g, " ");
  return h.slice(0, 46) || "(no heading)";
};

async function enterHub(p) {
  await p.goto(BASE, { waitUntil: "domcontentloaded" });
  await settle(p, 1400);
  await p.getByTestId("button-enter-app").click();
  await settle(p, 1300);
}

/** Walk to a screen from the hub by clicking testids in order. */
async function goTo(p, path) {
  await enterHub(p);
  for (const id of path) {
    await p.getByTestId(id).click();
    await settle(p);
  }
  return where(p);
}

// The heading each destination actually RENDERS, not its nav label. The sub-hubs
// show their title ("PUT IT IN DOLLARS"), not their eyebrow ("The Numbers"),
// and comparing against the label reports correct navigation as broken.
const HUB = "THE VALUE OF ABRIDGE";
const CASE = "START WITH THE WHY";
const NUMBERS = "PUT IT IN DOLLARS";
const PLAN = "MAKE IT HAPPEN";

/** The header controls are not all on UnifiedHeader: the Case stories use
 *  MethodologyHeader, which renders the same two affordances with no testid. */
const logoOf = (p) =>
  p.locator('[data-testid=link-logo-home], button:has-text("ABRIDGE"), a:has-text("ABRIDGE")').first();
const backOf = (p) =>
  p.locator('[data-testid=button-back], button[aria-label="Back"], button:has-text("Back")').first();
const SCREENS = [
  { name: "The Case",              path: ["hub-card-strategy"],                                     parent: HUB },
  { name: "The Numbers",           path: ["hub-card-financial"],                                    parent: HUB },
  { name: "The Plan",              path: ["hub-card-planning"],                                     parent: HUB },
  { name: "Case / Ambient",        path: ["hub-card-strategy", "strategy-card-value-story"],        parent: CASE },
  { name: "Case / Care Signals",   path: ["hub-card-strategy", "strategy-card-care-signals"],       parent: CASE },
  { name: "Case / CDS",            path: ["hub-card-strategy", "strategy-card-cds"],                parent: CASE },
  { name: "Case / Pre-Bill",       path: ["hub-card-strategy", "strategy-card-prebill"],            parent: CASE },
  { name: "Num / Size the ROI",    path: ["hub-card-financial", "financial-card-roi-calculator"],   parent: NUMBERS },
  { name: "Num / Model the Value", path: ["hub-card-financial", "financial-card-explore"],          parent: NUMBERS },
  { name: "Num / Build the Deal",  path: ["hub-card-financial", "financial-card-new-deal"],         parent: NUMBERS },
  { name: "Num / Offset the Cost", path: ["hub-card-financial", "financial-card-app-rationalization"], parent: NUMBERS },
  { name: "Plan / Build the Plan", path: ["hub-card-planning", "planning-card-build"],              parent: PLAN },
];

const rows = [];
const browser = await chromium.launch();

for (const sc of SCREENS) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const r = { name: sc.name, logo: "-", back: "-", browserBack: "-" };
  try {
    const landed = await goTo(p, sc.path);
    r.screen = landed;

    // 1. the ABRIDGE logo
    const logo = logoOf(p);
    if (await logo.count()) {
      await logo.click();
      await settle(p);
      r.logo = await where(p);
    } else r.logo = "(no logo)";

    // 2. the in-app Back button
    await goTo(p, sc.path);
    const back = backOf(p);
    if (await back.count()) {
      await back.click();
      await settle(p);
      r.back = await where(p);
    } else r.back = "(no back button)";

    // 3. the BROWSER back button, after one in-app Back
    await goTo(p, sc.path);
    if (await backOf(p).count()) {
      await backOf(p).click();
      await settle(p);
    }
    await p.goBack();
    await settle(p);
    r.browserBack = await where(p);
  } catch (e) {
    r.screen = r.screen || "(threw)";
    r.err = String(e).split("\n")[0].slice(0, 70);
  }
  rows.push({ ...r, expectBack: sc.parent });
  await p.close();
}
await browser.close();

const pad = (s, n) => String(s).padEnd(n).slice(0, n);
console.log("\n" + pad("SCREEN", 22) + pad("LOGO LANDS ON", 30) + pad("BACK LANDS ON", 30) + pad("EXPECTED BACK", 22) + "BROWSER BACK");
console.log("-".repeat(130));
const bad = [];
for (const r of rows) {
  const norm = (x) => x.toLowerCase().replace(/\s+/g, " ").trim();
  const logoOk = norm(r.logo).includes("value of abridge");
  const backOk = norm(r.back).includes(norm(r.expectBack).slice(0, 14));
  if (!logoOk) bad.push(`${r.name}: logo went to "${r.logo}", not the hub`);
  if (!backOk) bad.push(`${r.name}: back went to "${r.back}", expected "${r.expectBack}"`);
  console.log(
    pad(r.name, 22) + pad((logoOk ? "OK  " : "BAD ") + r.logo, 30) +
    pad((backOk ? "OK  " : "BAD ") + r.back, 30) + pad(r.expectBack, 22) + r.browserBack,
  );
}
console.log("\n" + (bad.length ? `FAILURES (${bad.length}):\n  ` + bad.join("\n  ") : "all navigation correct"));
process.exit(bad.length ? 1 : 0);
