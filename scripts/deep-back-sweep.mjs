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

/** Heading plus the set of visible testids — enough to tell two steps apart. */
async function snap(p) {
  return p.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const h = (document.querySelector("h1, h2")?.innerText || "").trim().replace(/\s+/g, " ");
    const ids = [...document.querySelectorAll("[data-testid]")]
      .filter(vis).map((e) => e.getAttribute("data-testid"))
      .filter((t) => !/^progress-dot-/.test(t)).sort().join(",");
    return { label: h.slice(0, 40) || "(no heading)", key: h + "|" + ids };
  });
}

// Every Continue testid across the tools (mirrors e2e/support/nav.ts).
const CONTINUE_IDS = [
  "ed-practice-continue", "ed-timesavings-continue", "driver-continue",
  "button-ed-revenue-continue", "button-ed-quality-continue",
  "ed-investment-continue", "ed-continue",
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
  const before = (await snap(p)).key;
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
    if ((await snap(p)).key !== before) return true;
  }
  return false;
}

async function enterHub(p) {
  await p.goto(BASE, { waitUntil: "domcontentloaded" });
  await settle(p, 1400);
  await p.getByTestId("button-enter-app").click();
  await settle(p, 1300);
}

const FLOWS = [
  { name: "Model the Value (Explore)", path: ["hub-card-financial", "financial-card-explore"], steps: 6 },
  { name: "Size the ROI",              path: ["hub-card-financial", "financial-card-roi-calculator"], steps: 4 },
  { name: "Build the Deal",            path: ["hub-card-financial", "financial-card-new-deal"], steps: 3 },
  { name: "Offset the Cost",           path: ["hub-card-financial", "financial-card-app-rationalization"], steps: 3 },
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
        const ok = afterBrowser.key !== leftBehind.key;
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
          if (!(await b.isVisible().catch(() => false))) { actual.push({ label: "(no back button)", key: "!" }); break; }
          await b.click();
        } else {
          await page.goBack();
        }
        await settle(page);
        actual.push(await snap(page));
      }

      const ok = expected.length === actual.length && expected.every((e, i) => e.key === actual[i].key);
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
