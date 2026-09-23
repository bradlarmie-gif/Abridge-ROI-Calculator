// Measured geometry. Eyes lie about alignment, and a screenshot cannot show you
// a defect that only appears when the content on one side of a row changes.
//
// Four checks, each aimed at a class of defect that no other gate can see:
//
//   1. CLIPPED INPUTS. An input whose own value does not fit inside it. This is
//      the "4.5 renders as 4." defect. It is invisible in a full-page
//      screenshot, obvious in a 2x crop, and trivially detectable by comparing
//      scrollWidth to clientWidth. Checked at phone width too, because
//      index.css forces EVERY input to font-size:16px !important below 820px,
//      which can push a value past a width that was sized for a smaller face.
//
//   2. CENTRING, IN TWO STATES. A "centred" element inside a justify-between row
//      is centred in the leftover space, not on the page, so it drifts whenever
//      the left or right content changes width. One measurement cannot catch
//      that; two states with deliberately different side content can.
//
//   3. SCROLL RESET. Every step change must open at the top. App-level scroll
//      reset fires on route changes but not on in-flow step changes, so the
//      next step inherits the previous scroll position and opens mid-page.
//      layout-smoke checks one flow; this checks every step of every flow.
//
//   4. GLOBAL ELEMENT SELECTORS that set size. `input { font-size: … }` has a
//      blast radius of the entire app and silently overrides local intent.
//      Reported, not failed: some are legitimate (the iOS zoom guard).
import { chromium } from "playwright";
import { readFileSync } from "fs";

const BASE = process.env.GEOM_BASE || "http://localhost:5199";
const SLOP = 4;
const fails = [];
const notes = [];

const settle = async (p, ms = 900) => { await p.waitForTimeout(ms); };
const heading = async (p) => (await p.locator("h1, h2").first().innerText().catch(() => "")).trim().slice(0, 60);

async function enterHub(p) {
  await p.goto(BASE, { waitUntil: "domcontentloaded" });
  await settle(p, 1400);
  await p.getByTestId("button-enter-app").click();
  await settle(p, 1300);
}

/** 1. Every visible input must fit its own value. */
async function clippedInputs(p, where) {
  const bad = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll("input").forEach((el) => {
      if (!(el.offsetWidth || el.offsetHeight)) return;
      if (!el.value) return;
      const over = el.scrollWidth - el.clientWidth;
      if (over > 1) {
        out.push(`${el.getAttribute("data-testid") || el.placeholder || "input"} value="${el.value}" clipped by ${over}px (scrollW ${el.scrollWidth} > clientW ${el.clientWidth}, font ${getComputedStyle(el).fontSize})`);
      }
    });
    return out;
  });
  for (const b of bad) fails.push(`CLIPPED ${where}: ${b}`);
}

/** 2. Anything that should read as centred, measured against the page. */
async function centring(p, where) {
  const off = await p.evaluate(() => {
    const out = [];
    // The shared header label: the element the audit doctrine caught drifting.
    const header = document.querySelector("header") || document.querySelector("[class*='UnifiedHeader']");
    if (!header) return out;
    const hb = header.getBoundingClientRect();
    const mid = hb.left + hb.width / 2;
    // The centre cell of the header grid.
    const grid = header.querySelector("[class*='grid-cols-']");
    if (grid && grid.children.length === 3) {
      const c = grid.children[1].getBoundingClientRect();
      if (c.width > 0) {
        const delta = c.left + c.width / 2 - mid;
        out.push({ what: "header centre cell", delta });
      }
    }
    return out;
  });
  for (const o of off) {
    if (Math.abs(o.delta) > SLOP) fails.push(`OFF-CENTRE ${where}: ${o.what} is ${o.delta.toFixed(1)}px off the page centre`);
  }
  return off;
}

/** 3. Advance while scrolled to the bottom; the next screen must open at the top. */
async function scrollReset(p, flow) {
  const visited = new Set();
  for (let step = 0; step < 12; step++) {
    const screen = (await heading(p)) || `step${step}`;
    if (visited.has(screen)) break;
    visited.add(screen);

    await clippedInputs(p, `${flow} / ${screen}`);
    await centring(p, `${flow} / ${screen}`);

    // Fill blanks so gates pass, then scroll to the bottom before advancing.
    const inputs = p.locator("input");
    for (let i = 0, n = await inputs.count(); i < n; i++) {
      const el = inputs.nth(i);
      if (!(await el.isVisible().catch(() => false))) continue;
      const m = await el.evaluate((e) => ({ im: e.getAttribute("inputmode") || "", v: e.value })).catch(() => null);
      if (!m || m.v) continue;
      await el.fill(m.im === "numeric" || m.im === "decimal" ? "4000" : "Riverbend Health", { force: true }).catch(() => {});
    }
    await settle(p, 400);

    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p.waitForTimeout(250);

    const fwd = p
      .locator("button, [role='button']")
      .filter({ hasNotText: /back|home|start over|download|export|print|save|change|data request/i })
      .filter({ hasText: /^(Next|Continue|See|Build|Start|Open|Run|Calculate|Present)/i })
      .first();
    if (!(await fwd.count()) || (await fwd.isDisabled().catch(() => true))) break;
    await fwd.click({ timeout: 4000 }).catch(() => {});
    await p.waitForTimeout(1500);

    if ((await heading(p)) === screen) break;
    const y = await p.evaluate(() => window.scrollY);
    if (y > 4) fails.push(`SCROLL ${flow}: "${await heading(p)}" opens at scrollY=${Math.round(y)}, not the top`);
  }
}

/** 4. Static scan: global element selectors that set size. */
function globalSelectors() {
  const css = readFileSync("client/src/index.css", "utf8");
  const lines = css.split("\n");
  lines.forEach((l, i) => {
    const m = l.match(/^\s*((?:input|button|select|textarea)\s*(?:,\s*(?:input|button|select|textarea)\s*)*)\s*\{/);
    if (!m) return;
    // Look ahead for a size-setting declaration in the block.
    const block = lines.slice(i, i + 8).join(" ");
    const decl = block.match(/(font-size|width|height|min-width|min-height|padding)\s*:[^;]+/);
    if (decl) {
      notes.push(`index.css:${i + 1}  \`${m[1].trim()}\` sets ${decl[0].trim().replace(/\s*!important/, "")}${/!important/.test(block) ? " !important" : ""} — app-wide blast radius`);
    }
  });
}

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844 },
];

const FLOWS = {
  explore: async (p) => {
    await enterHub(p);
    await p.getByTestId("hub-card-financial").click(); await settle(p);
    await p.getByTestId("financial-card-explore").click(); await settle(p);
    await p.getByTestId("ed-setting-outpatient").click(); await settle(p, 1200);
  },
  roi: async (p) => {
    await enterHub(p);
    await p.getByTestId("hub-card-financial").click(); await settle(p);
    await p.getByTestId("financial-card-roi-calculator").click(); await settle(p, 1200);
  },
  apprat: async (p) => {
    await enterHub(p);
    await p.getByTestId("hub-card-financial").click(); await settle(p);
    await p.getByTestId("financial-card-app-rationalization").click(); await settle(p, 1200);
  },
  planning: async (p) => {
    await enterHub(p);
    await p.getByTestId("hub-card-planning").click(); await settle(p);
    await p.getByTestId("planning-card-build").click(); await settle(p, 1200);
  },
};

globalSelectors();

const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  for (const [name, enter] of Object.entries(FLOWS)) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    process.stdout.write(`▶ ${vp.name} / ${name} … `);
    try {
      await enter(page);
      await scrollReset(page, `${vp.name}/${name}`);
    } catch (e) {
      fails.push(`${vp.name}/${name}: walk threw — ${String(e).split("\n")[0].slice(0, 120)}`);
    }
    console.log("done");
    await page.close();
  }
}

// Centring must be checked in TWO states whose side content differs, or the
// measurement proves nothing: an element centred in leftover space looks right
// whenever the sides happen to balance.
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await enterHub(page);
  const a = await centring(page, "hub (no back button, no progress dots)");
  await page.getByTestId("hub-card-financial").click(); await settle(page);
  await page.getByTestId("financial-card-explore").click(); await settle(page);
  await page.getByTestId("ed-setting-outpatient").click(); await settle(page, 1400);
  const b = await centring(page, "explore practice (back button AND progress)");
  if (a.length && b.length) {
    const drift = Math.abs(a[0].delta - b[0].delta);
    if (drift > SLOP) {
      fails.push(`DRIFT: the header centre moves ${drift.toFixed(1)}px between two screens with different side content — it is centred in leftover space, not on the page`);
    } else {
      console.log(`  · header centring holds across states (drift ${drift.toFixed(1)}px)`);
    }
  } else {
    notes.push("could not measure header centring in both states (selector may have moved)");
  }
  await page.close();
}
await browser.close();

if (notes.length) {
  console.log(`\nNotes (${notes.length}):`);
  for (const n of notes) console.log("  · " + n);
}
if (fails.length) {
  console.error(`\n✗ GEOMETRY SWEEP FAILED (${fails.length}):`);
  for (const f of fails) console.error("  " + f);
  process.exit(1);
}
console.log("\n✓ geometry clean — no clipped inputs, nothing off-centre, every step opens at the top.");
