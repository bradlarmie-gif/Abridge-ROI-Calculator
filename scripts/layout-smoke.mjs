/**
 * LAYOUT SMOKE — the automated guard for "squished / wrapped / clipped" regressions.
 *
 * The Integrity Harness (vitest) covers MATH, COPY, and RECONCILIATION but is
 * blind to rendered layout — which is how a header that wrapped "Build the deal"
 * into three lines shipped on a green suite. This drives each tool's real screens
 * at several widths and fails if:
 *   - the page overflows horizontally (content clipped/unreachable),
 *   - the top bar balloons past a single/double row (a wrapped nav),
 *   - a chapter-nav label wraps to more than one line.
 *
 * Run after ANY layout/responsive change:  npm run layout:smoke
 * (requires the dev server: npx vite --port 5199 --strictPort)
 */
import pkg from "../node_modules/playwright-core/index.js";
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE || "http://localhost:5199";
// Desktop widths get the full check (overflow + header height + clipped inputs).
// The narrow tier gets ONLY the clipped-input check — a value cut mid-word is a
// bug at any width (this is the "minimized window" regime that hid the offset-row
// clip), while a legitimately responsive header/nav wrap there is not.
const WIDTHS = [1440, 1200, 1024];
// A flex field only clips its value inside a NARROW BAND of widths (grow rescues
// it on either side). Two discrete widths straddle the band and miss it — the
// clip that shipped lived at ~640-780px while checks at 820/700 both passed. So
// the narrow tier must be a DENSE sweep, not a couple of points.
const NARROW_WIDTHS = [960, 920, 880, 840, 800, 760, 720, 680, 640, 600, 560];
const HEADER_MAX = 104; // a single/double-row top bar; a wrapped nav blows past this

// A long name that forces any name field to reveal a clip if the box is fixed.
const LONG_NAME = "Legacy ambient documentation platform";

// Every routable surface. `click` = a nav-button label to press after load;
// `drive` = a custom interaction (used to reach states behind clicks/modals,
// e.g. App Rationalization only shows its vendor rows once a tool is added).
const ROUTES = [
  { url: "/?proformapreview=1", label: "Proforma · Build" },
  { url: "/?proformapreview=1", label: "Proforma · Case", click: "The case" },
  { url: "/?proformapreview=1", label: "Proforma · Present", click: "Present" },
  { url: "/?explorepreview=1", label: "Explore · flow" },
  { url: "/?explore=outpatient", label: "Explore · outpatient" },
  { url: "/?explore=ed", label: "Explore · ED" },
  { url: "/?explore=inpatient", label: "Explore · inpatient" },
  { url: "/?explore=nursing", label: "Explore · nursing" },
  { url: "/?multipreview=1", label: "Attain · multi-category" },
  { url: "/?attainpreview=1", label: "Attain · matrix" },
  { url: "/?consultpreview=1", label: "Attain · align" },
  { url: "/?planpreview=1", label: "Attain · plan" },
  { url: "/?attainv2=1", label: "Attain · v2 funnel" },
  { url: "/learn/overview", label: "Methodology · overview" },
  { url: "/learn/continuum", label: "Methodology · across settings" },
  { url: "/forecast", label: "Forecast · hub" },
  {
    url: "/",
    label: "App Rationalization · row",
    // Home splash -> Forecast -> App Rationalization -> add a long-named custom
    // tool (needs annual spend > 0 to enable "Add to stack") so the vendor row
    // renders and any name clip is exposed.
    drive: async (page) => {
      await page.getByRole("button", { name: /get started/i }).first().click({ timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(400);
      await page.getByText("Forecast", { exact: true }).first().click({ timeout: 6000 });
      await page.waitForTimeout(500);
      await page.getByText("App Rationalization", { exact: true }).first().click({ timeout: 6000 });
      await page.waitForTimeout(500);
      await page.getByTestId("ar-add-custom-tool").click({ timeout: 6000 });
      await page.waitForTimeout(300);
      await page.getByTestId("ar-add-vendor").fill(LONG_NAME, { timeout: 6000 });
      await page.getByTestId("ar-add-spend").fill("180000", { timeout: 6000 });
      await page.waitForTimeout(150);
      await page.getByTestId("ar-add-confirm").click({ timeout: 6000 });
      await page.waitForTimeout(400);
      await page.evaluate(() => (document.activeElement)?.blur?.());
    },
  },
];

const fails = [];

const browser = await chromium.launch();
const PLAN = [
  ...WIDTHS.map((width) => ({ width, full: true })),
  ...NARROW_WIDTHS.map((width) => ({ width, full: false })),
];
for (const route of ROUTES) {
  for (const { width, full } of PLAN) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    try {
      await page.goto(BASE + route.url, { waitUntil: "networkidle" });
      await page.waitForTimeout(700);
      if (route.click) {
        await page.getByRole("button", { name: new RegExp(route.click) }).first().click({ timeout: 6000 }).catch(() => {});
        await page.waitForTimeout(500);
      }
      if (route.drive) {
        try { await route.drive(page); }
        catch (e) { fails.push(`${route.label} @${width}: drive step failed ${String(e).slice(0, 80)}`); }
      }
      const r = await page.evaluate(() => {
        const overflow = document.documentElement.scrollWidth - window.innerWidth;
        // The top bar = the ancestor row that contains the "ABRIDGE" wordmark.
        const ab = [...document.querySelectorAll("span")].find((e) => e.textContent?.trim() === "ABRIDGE");
        const bar = ab?.parentElement?.parentElement ?? null;
        const headerH = bar ? Math.round(bar.getBoundingClientRect().height) : 0;
        // Clipped inputs: a text field whose value is wider than the box cuts the
        // value off mid-word (e.g. "Legacy ambient s…"). Page overflow can't see
        // this — the clip is internal to the field. Skip the focused field.
        const clipped = [...document.querySelectorAll("input[type=text], input:not([type])")]
          .filter((el) => {
            const s = getComputedStyle(el);
            if (s.display === "none" || s.visibility === "hidden" || el.offsetParent === null) return false;
            if (el === document.activeElement) return false;
            return (el.value ?? "").trim().length > 0 && el.scrollWidth - el.clientWidth > 4;
          })
          .map((el) => `"${(el.value || "").slice(0, 24)}" (${el.scrollWidth - el.clientWidth}px cut)`);
        return { overflow, headerH, foundHeader: !!bar, clipped };
      });
      const tag = `${route.label} @${width}`;
      if (full && r.overflow > 3) fails.push(`${tag}: horizontal overflow ${r.overflow}px (content clipped)`);
      if (full && r.foundHeader && r.headerH > HEADER_MAX) fails.push(`${tag}: header ${r.headerH}px > ${HEADER_MAX} (wrapped/squished top bar)`);
      for (const c of r.clipped) fails.push(`${tag}: clipped input value ${c}`);
    } catch (e) {
      fails.push(`${route.label} @${width}: drive error ${String(e).slice(0, 100)}`);
    }
    await ctx.close();
  }
}

// ── PDF health ────────────────────────────────────────────────────────────
// The four tool PDFs are HTML-print documents (?...pdf=...), a rendering path
// vitest never sees. Each page is a fixed 816×1056 box; the risks are a page
// that fails to render (doc collapses), content that bleeds past a page box,
// a number that comes out "$NaN", or sideways overflow. Render each with print
// media and check all four. minPages guards against a page silently dropping.
const PDF_PAGE_H = 1056;
const SPARSE_MAX = 330; // px of dead space above a body page's footer before it reads as "not dense"
const PDF_ROUTES = [
  { url: "/?explorepdf=1", label: "Explore PDF", minPages: 5 },
  { url: "/?proformapdf=1", label: "Proforma PDF", minPages: 6 },
  { url: "/?attainpdf=review", label: "Attain PDF", minPages: 4 },
  { url: "/?appratpdf=1", label: "App Rationalization PDF", minPages: 5 },
  { url: "/?methodpdf=1", label: "Methodology PDF", minPages: 6 },
  { url: "/?quickroipdf=1", label: "ROI Calculator PDF", minPages: 4 },
];
for (const route of PDF_ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 816, height: PDF_PAGE_H } });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.print = () => {}; });
  try {
    await page.goto(BASE + route.url, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(1200);
    const r = await page.evaluate((PAGE_H) => {
      // Page boxes: elements sized to a full Letter page (816×1056).
      const boxes = [...document.querySelectorAll("body *")].filter((el) => {
        const b = el.getBoundingClientRect();
        return Math.abs(b.width - 816) < 4 && Math.abs(b.height - PAGE_H) < 6;
      });
      // >24px = real content spilling a page; smaller is padding/line-height rounding.
      const bleeds = boxes.filter((el) => el.scrollHeight - el.clientHeight > 24).length;
      const totalH = document.documentElement.scrollHeight;
      const overflow = document.documentElement.scrollWidth - 816;
      const nan = /\$?NaN|Infinity|undefined/.test(document.body.innerText || "");
      // Sparse page: dead vertical gap between a body page's last content and its
      // running footer. A content page that ends far above the footer is the
      // "half-empty, not dense" defect. Keyed off the running footer, which each
      // tool spells differently, so covers and pitch pages (no such footer) are
      // exempt automatically:
      //   Explore / App Rat : "Abridge · 06"
      //   Attain            : "Abridge · Page 1"        (a <p>)
      //   Proforma          : "Abridge · Financial Proforma · 3 of 8"  (absolute .pgnum)
      const sparse = [];
      const footRe = /^abridge · (page |financial proforma · )?\d/i;
      const footers = [...document.querySelectorAll("span,div,p")]
        .filter((e) => {
          const t = (e.textContent || "").trim();
          return footRe.test(t) && t.length < 45;
        });
      for (const f of footers) {
        // Walk up to the flex-column content container that fills the page; the
        // child of it that holds the footer is the footer block, and its previous
        // sibling is the last real content block. The gap between them is the
        // dead space marginTop:auto opened up.
        let fb = f, container = f.parentElement;
        while (container) {
          const cs = getComputedStyle(container);
          if (cs.display === "flex" && cs.flexDirection === "column" && container.getBoundingClientRect().height > 900) break;
          fb = container; container = container.parentElement;
        }
        const prev = fb ? fb.previousElementSibling : null;
        if (!container || !prev) continue;
        const gap = Math.round(fb.getBoundingClientRect().top - prev.getBoundingClientRect().bottom);
        sparse.push({ page: (f.textContent || "").trim(), gap });
      }
      return { boxes: boxes.length, bleeds, pages: Math.round(totalH / PAGE_H), overflow, nan, sparse };
    }, PDF_PAGE_H);
    const tag = route.label;
    if (process.env.SPARSE_DEBUG) console.log(`  [gaps] ${tag}: ` + r.sparse.map((s) => `${s.page}=${s.gap}`).join("  "));
    if (r.pages < route.minPages) fails.push(`${tag}: only ${r.pages} page(s) rendered, expected >= ${route.minPages} (a page failed to render)`);
    if (r.bleeds > 0) fails.push(`${tag}: ${r.bleeds} page(s) bleed past the 816×1056 box (content overflows the page)`);
    if (r.overflow > 3) fails.push(`${tag}: horizontal overflow ${r.overflow}px past the page width`);
    if (r.nan) fails.push(`${tag}: renders "NaN"/"undefined"/"Infinity" in the document text`);
    for (const s of r.sparse) if (s.gap > SPARSE_MAX) fails.push(`${tag}: ${s.page} is sparse — ${s.gap}px of dead space above the footer (not dense)`);
  } catch (e) {
    fails.push(`${route.label}: PDF render error ${String(e).slice(0, 100)}`);
  }
  await ctx.close();
}

// ── Scroll-reset guard ──────────────────────────────────────────────────────
// A screen must open at the TOP. SPA step changes are the trap: app-level scroll
// reset fires on route changes but not on in-flow wizard steps, so the next step
// inherits the previous scroll position and opens mid-page. Drive the ROI calc
// scrolled-down through Lift → Answer and fail if the Answer opens below the top.
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const enter = await page.$('[data-testid="button-enter-app"]');
  if (enter) { await enter.click(); await page.waitForTimeout(300); }
  await page.click('[data-testid="card-forecast"]'); await page.waitForTimeout(250);
  await page.click('[data-testid="card-forecast-roi-calculator-button"]'); await page.waitForTimeout(250);
  await page.click('button:has-text("Inpatient")'); await page.waitForTimeout(250);
  await page.click('button:has-text("Next: the lift")'); await page.waitForTimeout(350);
  // scroll to the bottom of the lift, then advance — the answer must land at top
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(150);
  await page.click('button:has-text("See the answer")'); await page.waitForTimeout(450);
  const y = await page.evaluate(() => window.scrollY);
  if (y > 4) fails.push(`ROI calc: the Answer step opens at scrollY=${Math.round(y)}, not the top (step change didn't reset scroll)`);
  await ctx.close();
} catch (e) {
  fails.push(`scroll-reset guard error ${String(e).slice(0, 100)}`);
}

await browser.close();

if (fails.length) {
  console.error(`\n✗ LAYOUT SMOKE FAILED (${fails.length}):\n` + fails.map((f) => "  " + f).join("\n") + "\n");
  process.exit(1);
}
console.log("✓ layout smoke passed — no overflow, no wrapped/squished headers, no clipped inputs across all routes × widths; all 4 PDFs render clean (pages, no bleed, no NaN)");
