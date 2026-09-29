// Deep Back sweep: inside a multi-step flow, does Back retrace the path?
//
// nav-sweep covers hub -> sub-hub -> a tool's FIRST screen. It never presses
// Back from step 5 of a 9-step flow, which is where a back loop is most likely
// to survive: each tool carries its own internal step state, so "Back" there is
// a flow-local handler, not App's navigateTo.
//
// Method: walk forward N steps recording a FINGERPRINT of each screen, then
// press Back N times and require the fingerprints to come back in exact reverse
// order. Then repeat with the BROWSER back button, the control that looped.
//
// Fingerprint, not heading: several steps share an <h1>, so comparing headings
// alone reported "did not move" on screens that had in fact advanced.
import { chromium } from "playwright";

const BASE = process.env.NAV_BASE || "http://localhost:5199";
const settle = (p, ms = 1100) => p.waitForTimeout(ms);

const backBtn = (p) =>
  p.locator('[data-testid=button-back], button[aria-label="Back"], button:has-text("Back")').first();

/** Heading, visible testids, AND a digest of the body text.
 *
 *  Heading alone was not enough: some flows keep one <h1> across steps, and
 *  some expose only header testids, so two different screens fingerprinted
 *  identically and the sweep reported "did not move" on a step that had in
 *  fact advanced. The text digest is what tells those apart. */
async function snap(p) {
  return p.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const h = (document.querySelector("h1, h2")?.innerText || "").trim().replace(/\s+/g, " ");
    const ids = [...document.querySelectorAll("[data-testid]")]
      .filter(vis).map((e) => e.getAttribute("data-testid"))
      .filter((t) => !/^progress-dot-/.test(t)).sort().join(",");
    const text = (document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 600);
    let digest = 0;
    for (let i = 0; i < text.length; i++) digest = (digest * 31 + text.charCodeAt(i)) | 0;
    // Two keys on purpose, because the two jobs pull in opposite directions.
    // moveKey includes the body text, so a step that reuses its <h1> still
    // registers as movement. idKey deliberately EXCLUDES it: a screen revisited
    // on the way back legitimately shows different text (a running total, a
    // value since filled in), and comparing on that reported correct
    // navigation as broken.
    return {
      label: h.slice(0, 40) || "(no heading)",
      idKey: h + "|" + ids,
      moveKey: h + "|" + ids + "|" + digest,
    };
  });
}

// Every Continue testid across the tools (mirrors e2e/support/nav.ts).
const CONTINUE_IDS = [
  "ed-practice-continue", "ed-timesavings-continue", "driver-continue",
  "button-ed-revenue-continue", "button-ed-quality-continue",
  "ed-investment-continue", "ed-continue",
  "proforma-see-case",                       // Build the Deal
  "ar-see-consolidation", "ar-see-timing", "ar-see-moat",   // Offset the Cost
  "button-continue", "button-continue-mobile", "button-panel-continue", "button-next",
];
// Several first screens have NO Continue: picking a card is what advances.
const CHOICE_SELECTORS = [
  "[data-testid^=ed-setting-]", "[data-testid^=roi-setting-]",
  "[data-testid^=setting-card-]", "[data-testid^=goal-card-]",
];

async function clickIfLive(el) {
  if (!(await el.isVisible().catch(() => false))) return false;
  if (!(await el.isEnabled().catch(() => false))) return false;
  await el.click().catch(() => {});
  return true;
}

/** Several screens gate Continue until their numbers are entered. Fill only
 *  the BLANKS, so we never overwrite a value the flow prefilled. */
async function fillBlanks(p) {
  const names = p.locator('input[type="text"]:visible, input:not([type]):visible');
  for (let i = 0, n = await names.count(); i < n; i++) {
    const el = names.nth(i);
    if (await el.inputValue().catch(() => "x")) continue;
    await el.fill("Test Health").catch(() => {});
  }
  const inputs = p.locator('input[inputmode="numeric"], input[inputmode="decimal"]');
  for (let i = 0, n = await inputs.count(); i < n; i++) {
    const el = inputs.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    if (await el.inputValue().catch(() => "x")) continue;
    await el.fill("40").catch(() => {});
  }
}

/** Move one step forward. Returns true only if the screen actually CHANGED. */
async function advance(p) {
  const before = (await snap(p)).moveKey;
  await fillBlanks(p);
  const tryAll = async () => {
    for (const id of CONTINUE_IDS) if (await clickIfLive(p.getByTestId(id).first())) return true;
    const byText = p.getByRole("button", { name: /^(Continue|Next)\b/i }).first();
    if (await clickIfLive(byText)) return true;
    for (const sel of CHOICE_SELECTORS) if (await clickIfLive(p.locator(sel).first())) return true;
    return false;
  };
  // Two passes: a choice may unlock a Continue that was disabled a moment ago.
  for (let i = 0; i < 2; i++) {
    if (!(await tryAll())) break;
    await settle(p);
    if ((await snap(p)).moveKey !== before) return true;
  }
  return false;
}

async function enterHub(p) {
  await p.goto(BASE, { waitUntil: "domcontentloaded" });
  await settle(p, 1400);
  await p.getByTestId("button-enter-app").click();
  await settle(p, 1300);
}

/** Offset the Cost needs a tool in the stack before it will move off step 1,
 *  and adding one goes through a modal. Too specific for the generic driver. */
async function setupOffsetTheCost(p) {
  // The stack persists between runs, so a tool may already be in it.
  if (await p.getByTestId("ar-see-consolidation").isVisible().catch(() => false)) return;
  await p.getByTestId("ar-org-name").fill("Test Health");
  await p.getByTestId("ar-abridge-price").fill("500000");
  await settle(p, 500);
  await p.getByTestId("ar-browse-ambientDoc").click();
  await settle(p);
  await p.getByTestId("ar-add-vendor").fill("Nuance DAX");
  await p.getByTestId("ar-add-pricing-flat").click();
  await p.getByTestId("ar-add-spend").fill("400000");
  await p.getByTestId("ar-add-confirm").click();
  await settle(p);
}

const FLOWS = [
  { name: "Model the Value (Explore)", path: ["hub-card-financial", "financial-card-explore"], steps: 6 },
  { name: "Size the ROI",              path: ["hub-card-financial", "financial-card-roi-calculator"], steps: 4 },
  { name: "Build the Deal",            path: ["hub-card-financial", "financial-card-new-deal"], steps: 3 },
  { name: "Offset the Cost",           path: ["hub-card-financial", "financial-card-app-rationalization"], steps: 3, setup: setupOffsetTheCost },
  { name: "Build the Plan",            path: ["hub-card-planning", "planning-card-build"], steps: 4 },
];

// NAV_FLOW=explore runs one flow, for negative-controlling a single fix.
const only = (process.env.NAV_FLOW || "").toLowerCase();
const RUN = only ? FLOWS.filter((f) => f.name.toLowerCase().includes(only)) : FLOWS;
if (only && !RUN.length) { console.error(`no flow matches NAV_FLOW=${only}`); process.exit(2); }

const rows = [];
const failures = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const flow of RUN) {
  for (const mode of ["in-app", "browser", "mixed"]) {
    const tag = `${flow.name} [${mode}]`;
    try {
      await enterHub(page);
      for (const id of flow.path) { await page.getByTestId(id).click({ timeout: 8000 }); await settle(page); }
      if (flow.setup) await flow.setup(page);

      const forward = [await snap(page)];
      for (let i = 0; i < flow.steps; i++) {
        if (!(await advance(page))) break;
        forward.push(await snap(page));
      }

      if (forward.length < 2) {
        rows.push([tag, "SKIP", `no Continue or choice advanced "${forward[0].label}"`]);
        continue;
      }

      // MIXED is the sequence that exposes a duplicate-push loop: press in-app
      // Back once, then browser Back. Walking forward and then back never can,
      // because forward moves push no duplicates.
      if (mode === "mixed") {
        const b = backBtn(page);
        if (!(await b.isVisible().catch(() => false))) {
          rows.push([tag, "SKIP", "no back button to press"]);
          continue;
        }
        await b.click();
        await settle(page);
        const afterBack = await snap(page);
        await page.goBack();
        await settle(page);
        const afterBrowser = await snap(page);

        const leftBehind = forward[forward.length - 1];
        const ok = afterBrowser.idKey !== leftBehind.idKey;
        rows.push([
          tag, ok ? "OK" : "BAD",
          ok ? `Back -> "${afterBack.label}", browser Back -> "${afterBrowser.label}"`
             : `browser Back went FORWARD into "${afterBrowser.label}", the step just left`,
        ]);
        if (!ok) failures.push(tag);
        continue;
      }

      const expected = forward.slice(0, -1).reverse();
      const actual = [];
      for (let i = 0; i < expected.length; i++) {
        if (mode === "in-app") {
          const b = backBtn(page);
          if (!(await b.isVisible().catch(() => false))) { actual.push({ label: "(no back button)", idKey: "!" }); break; }
          await b.click();
        } else {
          await page.goBack();
        }
        await settle(page);
        actual.push(await snap(page));
      }

      const ok = expected.length === actual.length && expected.every((e, i) => e.idKey === actual[i].idKey);
      rows.push([
        tag, ok ? "OK" : "BAD",
        ok ? `retraced ${expected.length} steps: ${expected.map((e) => e.label).join(" < ")}`
           : `got      ${actual.map((a) => a.label).join(" < ")}\n${" ".repeat(42)}expected ${expected.map((e) => e.label).join(" < ")}`,
      ]);
      if (!ok) failures.push(tag);
    } catch (err) {
      const msg = String(err?.message || err).split("\n")[0];
      rows.push([tag, "ERROR", msg]);
      failures.push(`${tag} (harness: ${msg})`);
    }
  }
}
await browser.close();

console.log("\nFLOW".padEnd(36) + "RESULT  DETAIL");
console.log("-".repeat(130));
for (const [n, r, d] of rows) console.log(n.padEnd(36) + r.padEnd(8) + d);

// A run that advanced nothing measured nothing, and must never read green.
const measured = rows.filter(([, r]) => r === "OK" || r === "BAD").length;
if (!measured) {
  console.log(`\nHARNESS FAILURE: 0 of ${rows.length} flows advanced, so no Back behaviour was tested.`);
  process.exit(2);
}
console.log(
  failures.length
    ? `\nFAILURES (${failures.length}):\n  ${failures.join("\n  ")}`
    : `\nBack retraces correctly in all ${measured} measured flows` +
      (measured < rows.length ? ` (${rows.length - measured} skipped)` : ""),
);
process.exit(failures.length ? 1 : 0);
