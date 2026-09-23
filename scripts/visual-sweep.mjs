/**
 * VISUAL SWEEP — the screenshot-first guard for AESTHETIC / stateful layout bugs.
 *
 * layout-smoke.mjs (the pass/fail gate) catches overflow, wrapped headers,
 * clipped inputs, and PDF bleed. It is blind to two things that keep slipping
 * through to the user:
 *   1. INTERACTIVE STATES — a driver card's "Adjust assumptions" tray only exists
 *      once a driver is ON and the disclosure is open; smoke never opens it, so a
 *      lopsided tray shipped green.
 *   2. AESTHETIC defects — a chart label floating over the curve, ragged columns,
 *      uneven rhythm. These render INSIDE the box (no overflow), so no automated
 *      pass/fail can see them. A human/agent has to LOOK.
 *
 * This tool therefore does two jobs:
 *   A. Drives a MATRIX of states (each care setting, drivers on, tray open,
 *      advanced panel open, every proforma chapter, every PDF page) and writes a
 *      screenshot for EACH to scripts/visual-sweep-out/ — the gallery the agent
 *      reviews before declaring any visual change done.
 *   B. Runs the auto-checks smoke lacks: overlapping interactive controls,
 *      text escaping its own box, and SVG <text> overlapping a chart path
 *      (the floating-label class). Hard defects exit non-zero.
 *
 * Usage:  npx vite --port 5199 --strictPort   (in another shell)
 *         node scripts/visual-sweep.mjs
 * Review: open every PNG in scripts/visual-sweep-out/ and eyeball it. The point
 *         is the LOOK — the auto-checks are a floor, not the ceiling.
 */
import pkg from "../node_modules/playwright-core/index.js";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const { chromium } = pkg;

const BASE = process.env.SWEEP_BASE || "http://localhost:5199";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "visual-sweep-out");
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const fails = [];   // hard defects → non-zero exit
const notes = [];   // soft observations for the review log
const shots = [];   // manifest

// ── Defensive helpers ───────────────────────────────────────────────────────
const clickIf = async (page, sel, opts = {}) => {
  try { const el = await page.$(sel); if (el) { await el.click({ timeout: 1500, force: true, ...opts }); return true; } } catch {}
  return false;
};
const clickText = async (page, re) => {
  try { await page.getByText(re).first().click({ timeout: 1500, force: true }); return true; } catch { return false; }
};
/**
 * For NAVIGATION, which must not be best-effort.
 *
 * clickIf/clickText swallow. That is right for optional flourishes (hover a
 * legend, open a disclosure that may not be there) and badly wrong for the
 * clicks that decide WHICH SCREEN gets photographed: when the IA changed, the
 * App Rationalization entry kept clicking a CTA label that no longer existed,
 * swallowed the miss, and screenshotted the hub into a gallery labelled
 * "apprat-consolidation" — reported as a soft note, reviewed as if it were the
 * real screen. A sweep that quietly captures the wrong thing is worse than one
 * that crashes.
 */
const mustClick = async (page, sel, what) => {
  const el = await page.$(sel);
  if (!el) throw new Error(`visual-sweep: ${what} — no element matched ${sel}. The IA moved; fix the entry path.`);
  await el.click({ timeout: 4000 });
};
const page_hoverFirstLegend = async (page) => {
  try { const el = await page.$("[data-testid^=ar-legend-]"); if (el) { await el.hover({ timeout: 1200 }); await page.waitForTimeout(250); } } catch {}
};
const fillAllNumbers = async (page, val = "200") => {
  const inputs = await page.$$("input");
  for (const inp of inputs) {
    try { await inp.click({ timeout: 600 }); await inp.fill(val, { timeout: 600 }); } catch {}
  }
};

// The reusable Explore drive: land on a value (driver) screen for a setting,
// turn drivers on, and open every assumptions tray. Returns the step title.
async function driveExploreToValue(page, setting) {
  await page.goto(`${BASE}/?explorepreview=1`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await clickIf(page, `[data-testid=ed-setting-${setting}]`);
  await page.waitForTimeout(200);
  await clickIf(page, "[data-testid=ed-careSetting-continue]");
  await page.waitForTimeout(500);
  await fillAllNumbers(page);
  await clickText(page, /Typical/);
  await clickIf(page, "[data-testid=ed-practice-continue]");
  await page.waitForTimeout(400);
  await clickText(page, /Typical/);
  await clickIf(page, "[data-testid=ed-timesavings-continue]");
  await page.waitForTimeout(600);
  // turn on any drivers on this screen, then open every assumptions tray
  for (const t of await page.$$("[data-testid^=ed-toggle-],[data-testid^=toggle-]")) {
    try { await t.click({ timeout: 800, force: true }); await page.waitForTimeout(120); } catch {}
  }
  await page.waitForTimeout(200);
  for (const b of await page.$$("[data-testid=button-adjust-assumptions]")) {
    try { await b.click({ timeout: 800, force: true }); await page.waitForTimeout(120); } catch {}
  }
  await page.waitForTimeout(300);
  return page.evaluate(() => document.querySelector("h1")?.innerText?.slice(0, 40) || "");
}

// ── The in-page auto-audit (the checks smoke lacks) ──────────────────────────
function audit() {
  const out = { overflow: 0, overlaps: [], escaped: [], svgLabels: [] };
  out.overflow = document.documentElement.scrollWidth - window.innerWidth;

  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || +s.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };

  // Overlapping interactive controls: two buttons/inputs/selects whose rects
  // overlap by >6px on BOTH axes = a broken layout (they should never sit on
  // top of each other).
  const ctrls = [...document.querySelectorAll("button, input, select, [role=button]")].filter(visible);
  for (let i = 0; i < ctrls.length; i++) {
    for (let j = i + 1; j < ctrls.length; j++) {
      const a = ctrls[i], b = ctrls[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ox > 6 && oy > 6) {
        out.overlaps.push(`${(a.textContent || a.getAttribute("data-testid") || a.tagName).trim().slice(0, 20)} ✕ ${(b.textContent || b.getAttribute("data-testid") || b.tagName).trim().slice(0, 20)}`);
      }
    }
  }

  // SVG <text> that overlaps a chart <path>/<polyline> in the same svg — the
  // "label floating over the curve" class (the Month 0 bug). Flags a text whose
  // box overlaps a stroke path box by a real amount, excluding the intended
  // on-line marker (a text within ~14px of a circle/dot marker is deliberate).
  for (const svg of document.querySelectorAll("svg")) {
    const texts = [...svg.querySelectorAll("text")];
    const paths = [...svg.querySelectorAll("path, polyline")];
    const markers = [...svg.querySelectorAll("circle")].map((c) => c.getBoundingClientRect());
    for (const t of texts) {
      const rt = t.getBoundingClientRect();
      const nearMarker = markers.some((m) => Math.hypot((m.left + m.right) / 2 - (rt.left + rt.right) / 2, (m.top + m.bottom) / 2 - (rt.top + rt.bottom) / 2) < 22);
      if (nearMarker) continue;
      for (const p of paths) {
        const rp = p.getBoundingClientRect();
        const ox = Math.min(rt.right, rp.right) - Math.max(rt.left, rp.left);
        const oy = Math.min(rt.bottom, rp.bottom) - Math.max(rt.top, rp.top);
        if (ox > 4 && oy > 4) { out.svgLabels.push(`"${(t.textContent || "").trim().slice(0, 18)}" over curve`); break; }
      }
    }
  }
  return out;
}

async function scene(browser, name, setup, { width = 1440, height = 1000 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.print = () => {}; });
  let title = "";
  try {
    title = (await setup(page)) || "";
    await page.waitForTimeout(300);
    const file = join(OUT, `${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    shots.push(`${name}.png${title ? `  (${title})` : ""}`);
    const r = await page.evaluate(audit);
    if (r.overflow > 3) fails.push(`${name}: horizontal overflow ${r.overflow}px`);
    for (const o of r.overlaps.slice(0, 6)) fails.push(`${name}: overlapping controls — ${o}`);
    // svg-label overlap is heuristic (a path's bbox spans the whole chart, so
    // legitimate in-chart labels trip it) — a LOOK prompt, not a hard fail.
    for (const s of r.svgLabels.slice(0, 6)) notes.push(`${name}: review chart label — ${s}`);
  } catch (e) {
    // HARD fail, not a note. If the drive threw, whatever is on screen is not
    // the scene this file claims to be, and the gallery is the thing a human
    // reviews for aesthetic defects — a mislabelled screenshot sends that review
    // to the wrong screen while reading as coverage. The capture is still kept,
    // clearly marked, because it usually shows exactly where the drive stopped.
    fails.push(`${name}: DRIVE FAILED, screenshot is not this scene — ${String(e).slice(0, 140)}`);
    try {
      await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
      shots.push(`${name}.png  (⚠ WRONG SCREEN — drive failed)`);
    } catch {}
  }
  await ctx.close();
}

const browser = await chromium.launch();

// ── A. On-screen surfaces, including interactive states ──────────────────────
await scene(browser, "explore-caresetting-empty", async (p) => {
  await p.goto(`${BASE}/?explorepreview=1`, { waitUntil: "networkidle" });
  await p.waitForTimeout(700);
  return p.evaluate(() => document.querySelector("h1")?.innerText?.slice(0, 40) || "");
});
await scene(browser, "explore-caresetting-hover", async (p) => {
  await p.goto(`${BASE}/?explorepreview=1`, { waitUntil: "networkidle" });
  await p.waitForTimeout(600);
  await clickIf(p, "[data-testid=ed-setting-ed]");
  await p.waitForTimeout(300);
  return "hovered ed";
});
for (const s of ["outpatient", "ed", "inpatient", "nursing"]) {
  await scene(browser, `explore-value-${s}-trays-open`, (p) => driveExploreToValue(p, s), { height: 1500 });
}

// Proforma chapters + the advanced-assumptions panel open
await scene(browser, "proforma-build", async (p) => {
  await p.goto(`${BASE}/?proformapreview=1`, { waitUntil: "networkidle" });
  await p.waitForTimeout(900);
  await clickIf(p, "[data-testid=button-advanced-assumptions]");
  await p.waitForTimeout(300);
  return "build + advanced open";
}, { height: 1600 });
await scene(browser, "proforma-case", async (p) => {
  await p.goto(`${BASE}/?proformapreview=1`, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  await clickText(p, /The case/);
  await p.waitForTimeout(600);
  return "case";
}, { height: 1600 });
await scene(browser, "proforma-present", async (p) => {
  await p.goto(`${BASE}/?proformapreview=1`, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  await clickText(p, /Present/);
  await p.waitForTimeout(600);
  return "present";
}, { height: 1600 });

// App Rationalization: enter via Forecast, add two tools, then screenshot each
// step (consolidation two-sink + legend hover, timing pill, moat). Defensive —
// captures whatever state it reaches. This is the flow whose hover/timeline
// states slipped through because it was never in a screenshot gate.
async function arAddTool(page, name, spend) {
  if (!(await clickIf(page, "[data-testid=ar-add-custom-tool]"))) return;
  await page.waitForTimeout(250);
  try { await page.getByTestId("ar-add-vendor").fill(name, { timeout: 1500 }); } catch {}
  try { await page.getByTestId("ar-add-spend").fill(String(spend), { timeout: 1500 }); } catch {}
  await page.waitForTimeout(150);
  await clickIf(page, "[data-testid=ar-add-confirm]");
  await page.waitForTimeout(300);
}
async function arEnter(page) {
  // Live path: hub → Financial → App Rationalization ("Build the case").
  // (The old Forecast-journey nav landed on the hub and captured the wrong screen.)
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await mustClick(page, "[data-testid=button-enter-app]", "splash → hub");
  await page.waitForTimeout(600);
  await mustClick(page, "[data-testid=hub-card-financial]", "hub → The Numbers");
  await page.waitForTimeout(600);
  await mustClick(page, "[data-testid=financial-card-app-rationalization]", "The Numbers → App Rationalization");
  await page.waitForTimeout(800);
  await arAddTool(page, "Fluency", 250000);
  await arAddTool(page, "UpToDate", 160000);
  await page.waitForTimeout(200);
}
await scene(browser, "apprat-consolidation", async (p) => {
  await arEnter(p);
  await clickIf(p, "[data-testid=ar-see-consolidation]");
  await page_hoverFirstLegend(p);
  return "consolidation + legend hover";
}, { height: 1500 });
await scene(browser, "apprat-timing", async (p) => {
  await arEnter(p);
  await clickIf(p, "[data-testid=ar-see-consolidation]"); await p.waitForTimeout(300);
  await clickIf(p, "[data-testid=ar-see-timing]"); await p.waitForTimeout(400);
  // Pull the first contract's exit in early (low sunset month) so the
  // "N months sooner" pill renders — the state that only appears once the plan
  // finishes ahead of ride-to-renewal.
  const slider = await p.$("[data-testid^=ar-timing-slider-]");
  if (slider) {
    const id = await slider.getAttribute("data-testid");
    try {
      await slider.fill("2", { timeout: 1500 });
    } catch {
      // React tracks value via its own setter; set through the native setter and
      // dispatch input+change so onChange fires.
      await p.$eval(`[data-testid="${id}"]`, (el) => {
        const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        set.call(el, "2");
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }
    await p.waitForTimeout(500);
  }
  return "timing (contract pulled in → 'N months sooner' pill)";
}, { height: 1500 });
await scene(browser, "apprat-moat", async (p) => {
  await arEnter(p);
  await clickIf(p, "[data-testid=ar-see-consolidation]"); await p.waitForTimeout(300);
  await clickIf(p, "[data-testid=ar-see-timing]"); await p.waitForTimeout(300);
  await clickIf(p, "[data-testid=ar-see-moat]"); await p.waitForTimeout(400);
  return "moat";
}, { height: 1500 });

// ── Attain (Value Attainment): the LIVE hub flow. The old ?*preview prototypes
// were deleted (they showed a "PROTOTYPE" label + inconsistent chrome), so the
// sweep now drives the real hub → Strategy/Planning funnel. Nursing is used
// deliberately (the reused-content bugs surfaced there first).
async function attainFunnel(p, hubCard, buildRe) {
  // Same swallowing bug arEnter had, and with the same result: this clicked an
  // "Open Strategy" / "Open Planning" CTA label that the hub redesign removed,
  // clickText swallowed the miss, and the sweep photographed the hub into
  // galleries labelled attain-strategy-grounding and attain-planning. Both
  // Attain working screens were therefore unreviewed while reading as covered.
  await p.goto(BASE, { waitUntil: "networkidle" });
  await p.waitForTimeout(600);
  await mustClick(p, "[data-testid=button-enter-app]", "splash → hub");
  await p.waitForTimeout(700);
  await mustClick(p, `[data-testid=${hubCard}]`, `hub → ${hubCard}`);
  await p.waitForTimeout(800);
  await mustClick(p, "[data-testid=planning-card-build]", "The Plan → Build the Plan");
  await p.waitForTimeout(900);
  const input = await p.$("input"); if (input) { await input.fill("Utah Health"); await p.waitForTimeout(150); }
  await clickText(p, /^Continue/); await p.waitForTimeout(400);
  await clickText(p, /Nursing/); await p.waitForTimeout(400);
  for (const bx of (await p.$$("[data-testid^=checkbox-attain-goal]")).slice(0, 2)) { try { await bx.click(); await p.waitForTimeout(150); } catch {} }
}
await scene(browser, "attain-hub", async (p) => {
  await p.goto(`${BASE}/?hub=1`, { waitUntil: "networkidle" });
  await p.waitForTimeout(700);
  return "value attainment hub";
});

// ── The hub and the Case stories. These are the NEWEST surfaces in the app and
// the least reviewed: the three sub-hubs and the four editorial story pages had
// no screenshot coverage at all, so nothing was ever handed to a fresh eye.
const hubEnter = async (p, card) => {
  await p.goto(BASE, { waitUntil: "networkidle" });
  await p.waitForTimeout(600);
  await mustClick(p, "[data-testid=button-enter-app]", "splash → hub");
  await p.waitForTimeout(700);
  await mustClick(p, `[data-testid=${card}]`, `hub → ${card}`);
  await p.waitForTimeout(900);
};
for (const [name, card] of [
  ["hub-the-case", "hub-card-strategy"],
  ["hub-the-numbers", "hub-card-financial"],
  ["hub-the-plan", "hub-card-planning"],
]) {
  await scene(browser, name, async (p) => {
    await hubEnter(p, card);
    return card;
  });
}
for (const [name, row] of [
  ["case-ambient-documentation", "strategy-card-value-story"],
  ["case-care-signals", "strategy-card-care-signals"],
  ["case-cds", "strategy-card-cds"],
  ["case-prebill", "strategy-card-prebill"],
]) {
  await scene(browser, name, async (p) => {
    await hubEnter(p, "hub-card-strategy");
    await mustClick(p, `[data-testid=${row}]`, `The Case → ${row}`);
    await p.waitForTimeout(1400);
    return row;
  }, { height: 2400 });
}
await scene(browser, "attain-strategy-grounding", async (p) => {
  await attainFunnel(p, "hub-card-planning", /Build the Strategy/);
  await clickText(p, /Start discovery/); await p.waitForTimeout(500);
  await clickIf(p, "[data-testid=discovery-ground-0-medsurg]"); await p.waitForTimeout(500);
  return "nursing strategy grounding (live)";
}, { height: 1200 });
await scene(browser, "attain-planning", async (p) => {
  await attainFunnel(p, "hub-card-planning", /Start building/);
  await p.waitForTimeout(500);
  return "nursing planning walk (live)";
}, { height: 1700 });

// ── B. PDFs, one screenshot PER PAGE (so each page gets its own eyeball) ──────
const PDF_ROUTES = [
  { url: "/?proformapdf=1", label: "proforma-pdf" },
  { url: "/?explorepdf=1", label: "explore-pdf" },
  { url: "/?planpdf=nursing", label: "plan-pdf-nursing" },
];
const PAGE_H = 1056;
for (const route of PDF_ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 816, height: PAGE_H } });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.print = () => {}; });
  try {
    await page.goto(BASE + route.url, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(1200);
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const pages = Math.max(1, Math.round(total / PAGE_H));
    for (let i = 0; i < pages; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), i * PAGE_H);
      await page.waitForTimeout(200);
      await page.screenshot({ path: join(OUT, `${route.label}-p${i + 1}.png`), clip: { x: 0, y: 0, width: 816, height: PAGE_H } });
      shots.push(`${route.label}-p${i + 1}.png`);
    }
    const r = await page.evaluate(audit);
    for (const s of r.svgLabels.slice(0, 6)) notes.push(`${route.label}: review chart label — ${s}`);
  } catch (e) {
    // Same reasoning as scene(): a PDF that did not render is a failure, not a
    // note. A missing document reads as "nothing to review here".
    fails.push(`${route.label}: PDF DID NOT RENDER — ${String(e).slice(0, 140)}`);
  }
  await ctx.close();
}

await browser.close();

// ── Report ───────────────────────────────────────────────────────────────────
const manifest = [
  `VISUAL SWEEP — ${shots.length} screenshots in scripts/visual-sweep-out/`,
  "REVIEW EVERY IMAGE — auto-checks are a floor; lopsided/ragged/floating is a LOOK call.",
  "",
  "Screenshots:", ...shots.map((s) => "  " + s),
  "",
  notes.length ? "Notes (non-blocking):" : "", ...notes.map((n) => "  " + n),
].join("\n");
writeFileSync(join(OUT, "MANIFEST.txt"), manifest);
console.log(manifest);

if (fails.length) {
  console.error(`\n✗ VISUAL SWEEP auto-checks flagged ${fails.length}:\n` + fails.map((f) => "  " + f).join("\n") + "\n");
  process.exit(1);
}
console.log("\n✓ auto-checks clean (no overflow, no overlapping controls, no chart-label collisions). Now REVIEW the gallery.");
