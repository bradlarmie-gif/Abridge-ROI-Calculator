/**
 * INTERACTION SWEEP — types into every input on the live surface.
 *
 * Why this exists. A bug that silently corrupted every numeric field in the app
 * shipped and survived 884 unit tests, a clean typecheck, a passing build, the
 * layout smoke gate and the visual sweep. Typing `2400` committed `400`. Nothing
 * in the repo had ever typed into an input, and no screenshot can show it: the
 * field renders perfectly, the value is just wrong.
 *
 * Two named bugs this hunts, both invisible to every other gate:
 *
 *   1. EATEN CHARACTERS. A deferred select-all on focus races a click-then-type;
 *      the select grabs the character just typed and the next keystroke replaces
 *      it. Symptom: you type 5 digits and the field holds 4.
 *
 *   2. FOCUS LOSS / REMOUNT. A component defined inside another component's body
 *      gets a new identity on every render, so each keystroke unmounts and
 *      remounts the input and focus drops to <body>. Symptom: "I type one digit
 *      and have to click in again." The definitive check is programmatic:
 *      document.activeElement after every single keystroke.
 *
 * It also crawls for dead affordances, because a button that looks live and does
 * nothing is its own class of launch defect.
 *
 * Usage:
 *   npx vite --port 5199 --strictPort      # in another shell
 *   node scripts/interaction-sweep.mjs     # SWEEP_BASE to override
 *   FLOW=roi node scripts/interaction-sweep.mjs   # one flow only
 *
 * Exits 1 on any failure.
 */
import { chromium } from "playwright-core";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const BASE = process.env.SWEEP_BASE || "http://127.0.0.1:5199";
const ONLY = process.env.FLOW || "";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "interaction-sweep-out");

const failures = [];
const notes = [];
let probed = 0;

const fail = (flow, screen, field, msg) => failures.push({ flow, screen, field, msg });

/** Settle past framer-motion entrance staggers before touching anything. */
const settle = (p, ms = 900) => p.waitForTimeout(ms);

async function heading(p) {
  return (
    await p.evaluate(() => [...document.querySelectorAll("h1,h2")].map((e) => e.innerText.trim()).filter(Boolean)[0] || "")
  ).slice(0, 60);
}

/**
 * The core check. Types one character at a time and asserts, after EACH key,
 * that focus is still on the field. Then asserts every character landed.
 */
async function probeInput(p, flow, screen, el, meta) {
  probed++;
  const label = meta.id || meta.ph || meta.label || "(unlabelled)";
  const value = meta.decimal ? "4.5" : "12345";

  await el.scrollIntoViewIfNeeded().catch(() => {});
  await el.click({ timeout: 4000, force: true });
  await el.press("Meta+a").catch(() => {});
  await el.press("Backspace").catch(() => {});
  await p.waitForTimeout(120);

  for (const ch of value) {
    await p.keyboard.press(ch === "." ? "Period" : ch);
    await p.waitForTimeout(45);
    const stillFocused = await el.evaluate((node) => document.activeElement === node).catch(() => false);
    if (!stillFocused) {
      fail(flow, screen, label, `focus left the field after typing "${ch}" — the input is remounting on each keystroke`);
      return;
    }
  }

  await p.waitForTimeout(140);
  const got = await el.inputValue();
  const digits = got.replace(/\D/g, "");
  const want = value.replace(/\D/g, "");

  if (digits !== want) {
    fail(flow, screen, label, `typed "${value}" but the field holds "${got}" — characters were eaten or reordered`);
    return;
  }
  if (!meta.decimal && digits.length >= 4 && !got.includes(",")) {
    fail(flow, screen, label, `"${got}" has no thousands separator`);
  }

  // Clearable: a field you cannot empty cannot be corrected.
  await el.press("Meta+a").catch(() => {});
  await el.press("Backspace").catch(() => {});
  await p.waitForTimeout(120);
  const cleared = await el.inputValue();
  if (cleared.replace(/\D/g, "").length > 0) {
    fail(flow, screen, label, `cannot be cleared — still holds "${cleared}" after select-all + delete`);
  }
}

async function probeScreen(p, flow, screen, seen) {
  const inputs = p.locator("input");
  const n = await inputs.count();
  for (let i = 0; i < n; i++) {
    const el = inputs.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    let meta;
    try {
      meta = await el.evaluate((e) => ({
        id: e.getAttribute("data-testid") || "",
        ph: e.placeholder || "",
        type: e.getAttribute("type") || "",
        im: e.getAttribute("inputmode") || "",
        label: (e.closest("div")?.parentElement?.innerText || "").split("\n")[0].slice(0, 40),
      }));
    } catch {
      continue;
    }
    if (["range", "checkbox", "radio", "date", "file"].includes(meta.type)) continue;
    const numeric = meta.im === "numeric" || meta.im === "decimal";
    if (!numeric) continue;
    const key = `${flow}|${screen}|${meta.id || meta.ph || meta.label || i}`;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      await probeInput(p, flow, screen, el, { ...meta, decimal: meta.im === "decimal" && /\./.test(meta.ph) });
    } catch (e) {
      fail(flow, screen, meta.id || meta.ph || String(i), `probe threw: ${String(e).split("\n")[0].slice(0, 90)}`);
    }
  }
}

/** A control that looks interactive must do something. */
async function deadAffordances(p, flow, screen) {
  const dead = await p.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('button:not([disabled]), [role="button"]')) {
      if (el.getAttribute("aria-disabled") === "true") continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const txt = (el.innerText || el.getAttribute("aria-label") || "").split("\n")[0].trim();
      if (!txt) continue;
      // React attaches handlers at the root, so we cannot read onclick. What we
      // CAN catch is the honest tell: an anchor with no href and no role.
      if (el.tagName === "A" && !el.getAttribute("href")) out.push(txt.slice(0, 40));
    }
    return out;
  });
  if (dead.length) notes.push(`${flow} / ${screen}: links with no href — ${dead.join(", ")}`);
}

/**
 * Reveal inputs that are hidden behind a disclosure.
 *
 * A collapsed panel is indistinguishable from "this screen has no inputs" to a
 * DOM crawl, which is how the Proforma workbench — the app's riskiest numeric
 * surface — reported zero. Open every `aria-expanded="false"` control and every
 * unselected tab before counting anything.
 */
async function expandEverything(p) {
  for (let round = 0; round < 3; round++) {
    const closed = p.locator('[aria-expanded="false"]');
    const n = await closed.count();
    if (!n) break;
    for (let i = 0; i < n; i++) {
      await closed.nth(i).click({ timeout: 1000 }).catch(() => {});
      await p.waitForTimeout(150);
    }
  }
  const tabs = p.locator('[role="tab"][aria-selected="false"]');
  for (let i = 0, n = await tabs.count(); i < n; i++) {
    await tabs.nth(i).click({ timeout: 1000 }).catch(() => {});
    await p.waitForTimeout(200);
  }
}

/**
 * Turn every driver on, and CONFIRM it went on.
 *
 * Fire-and-forget clicking was not enough. A click that silently missed left the
 * card collapsed, which a DOM crawl cannot tell apart from "this driver has no
 * inputs" — the inpatient Revenue screen reported zero inputs that way while
 * actually holding thirteen. So: re-query each round (enabling a driver re-renders
 * the list and invalidates indices), click what is still off, and verify.
 */
async function turnOnAllDrivers(p) {
  for (let round = 0; round < 4; round++) {
    const off = p.locator('[role=switch][aria-checked="false"]');
    const n = await off.count();
    if (!n) return;
    for (let i = 0; i < n; i++) {
      const sw = p.locator('[role=switch][aria-checked="false"]').first();
      if (!(await sw.count())) break;
      await sw.scrollIntoViewIfNeeded().catch(() => {});
      await sw.click({ timeout: 3000 }).catch(() => {});
      await p.waitForTimeout(320);
    }
    await p.waitForTimeout(400);
  }
  const stuck = await p.locator('[role=switch][aria-checked="false"]').count();
  if (stuck) notes.push(`${stuck} driver toggle(s) would not switch on`);
}

/** Generic forward walk: probe, then advance, until nothing moves. */
async function walk(p, flow, maxSteps = 12) {
  const seen = new Set();
  const visited = new Set();
  let last = "";
  for (let step = 0; step < maxSteps; step++) {
    await settle(p);
    const screen = (await heading(p)) || `step${step}`;
    if (visited.has(screen)) break; // the walk looped back; stop rather than spin
    visited.add(screen);
    // Most numeric inputs live inside driver cards that only render once the
    // driver is switched on, so an un-toggled sweep silently probes almost
    // nothing. Turn everything on first, and open every domain tab.
    await expandEverything(p);
    for (const tab of await p.locator("button").filter({ hasText: /^(Revenue|Capacity|Workforce|Quality)$/ }).all()) {
      await tab.click({ timeout: 1200 }).catch(() => {});
      await p.waitForTimeout(250);
      await turnOnAllDrivers(p);
      await probeScreen(p, flow, `${screen} / ${await tab.innerText().catch(() => "tab")}`, seen);
    }
    await turnOnAllDrivers(p);
    await expandEverything(p);
    await p.waitForTimeout(300);
    const nIn = await p.locator("input").count();
    if (process.env.DEBUG) console.log(`    · ${flow} step${step}: "${screen}" (${nIn} inputs)`);
    await probeScreen(p, flow, screen, seen);
    await deadAffordances(p, flow, screen);

    // satisfy free-text gates so the flow can advance
    const all = p.locator("input");
    for (let i = 0, n = await all.count(); i < n; i++) {
      const el = all.nth(i);
      if (!(await el.isVisible().catch(() => false))) continue;
      const m = await el
        .evaluate((e) => ({ im: e.getAttribute("inputmode") || "", t: e.getAttribute("type") || "", v: e.value }))
        .catch(() => null);
      if (!m || m.im === "numeric" || m.im === "decimal" || m.t === "range" || m.t === "checkbox" || m.v) continue;
      await el.fill("Riverbend Health", { force: true }).catch(() => {});
    }
    // refill numerics the probe emptied, so gating passes
    for (let i = 0, n = await all.count(); i < n; i++) {
      const el = all.nth(i);
      if (!(await el.isVisible().catch(() => false))) continue;
      const m = await el.evaluate((e) => ({ im: e.getAttribute("inputmode") || "", v: e.value })).catch(() => null);
      if (!m || !(m.im === "numeric" || m.im === "decimal") || m.v) continue;
      await el.fill("40", { force: true }).catch(() => {});
    }
    await p.waitForTimeout(350);

    const fwdSel = () =>
      p.locator("button, [role='button']").filter({ hasText: /^(Next|Continue|See the|See my|Build|Start|Open|Run the|Calculate)/i }).first();

    let moved = false;
    let fwd = fwdSel();
    if ((await fwd.count()) && !(await fwd.isDisabled().catch(() => true))) {
      await fwd.click({ timeout: 4000 }).catch(() => {});
      await p.waitForTimeout(1500);
      moved = (await heading(p)) !== screen;
    }

    if (!moved) {
      // Screens that advance on a row/card click and carry no forward button
      // (the care-setting pickers), or a gate that needs an option chosen first.
      // Exclude chrome. The header carries Back / Home / "Data request", and the
      // walk happily clicked "Data request" instead of advancing, which is how an
      // earlier run reported 0 inputs for the 165-input Explore flow.
      const opts = p
        .locator("button, [role='button']")
        .filter({ hasNotText: /back|home|start over|download|export|print|save|change|data request|resume|delete|remove|\+ add/i })
        .filter({ has: p.locator(":scope:not([data-testid^='ed-header'])") });
      for (let i = 0, c = await opts.count(); i < Math.min(c, 12); i++) {
        await opts.nth(i).click({ timeout: 1500, force: true }).catch(() => {});
        await p.waitForTimeout(450);
        if ((await heading(p)) !== screen) { moved = true; break; }
        fwd = fwdSel();
        if ((await fwd.count()) && !(await fwd.isDisabled().catch(() => true))) {
          await fwd.click({ timeout: 3000 }).catch(() => {});
          await p.waitForTimeout(1400);
          if ((await heading(p)) !== screen) { moved = true; break; }
        }
      }
    }
    if (!moved) break;
    last = screen;
  }
}

const enterHub = async (p) => {
  await p.goto(BASE, { waitUntil: "domcontentloaded" });
  await settle(p, 1300);
  await p.getByTestId("button-enter-app").click();
  await settle(p, 1500);
};

const FLOWS = {
  hub: async (p) => {
    await enterHub(p);
    await walk(p, "hub", 1);
    for (const id of ["hub-card-strategy", "hub-card-financial", "hub-card-planning"]) {
      await enterHub(p);
      await p.getByTestId(id).click();
      await walk(p, `hub/${id}`, 1);
    }
  },
  roi: async (p) => {
    await enterHub(p);
    await p.getByTestId("hub-card-financial").click();
    await settle(p, 1200);
    await p.getByTestId("financial-card-roi-calculator").click();
    await walk(p, "roi", 8);
  },
  apprat: async (p) => {
    await enterHub(p);
    await p.getByTestId("hub-card-financial").click();
    await settle(p, 1200);
    await p.getByTestId("financial-card-app-rationalization").click();
    await walk(p, "apprat", 8);
  },
  proforma: async (p) => {
    await enterHub(p);
    await p.getByTestId("hub-card-financial").click();
    await settle(p, 1200);
    await p.getByTestId("financial-card-new-deal").click();
    await walk(p, "proforma", 8);
  },
  // Explore is four flows wearing one shell: each care setting has its own
  // drivers, its own equations and its own non-financial proof domain. Walking
  // only the first setting leaves roughly three quarters of the app's numeric
  // inputs untouched, so walk all four.
  explore: async (p) => {
    for (const setting of ["outpatient", "inpatient", "ed", "nursing"]) {
      await enterHub(p);
      await p.getByTestId("hub-card-financial").click();
      await settle(p, 1200);
      await p.getByTestId("financial-card-explore").click();
      await settle(p, 1200);
      const pick = p.getByTestId(`ed-setting-${setting}`);
      if (!(await pick.count())) { notes.push(`explore: no setting card "${setting}"`); continue; }
      await pick.click();
      await settle(p, 1200);
      await walk(p, `explore/${setting}`, 12);
    }
  },
  planning: async (p) => {
    await enterHub(p);
    await p.getByTestId("hub-card-planning").click();
    await settle(p, 1200);
    await p.getByTestId("planning-card-build").click();
    await walk(p, "planning", 10);
  },
};

const browser = await chromium.launch();
for (const [name, run] of Object.entries(FLOWS)) {
  if (ONLY && ONLY !== name) continue;
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message.split("\n")[0].slice(0, 110)));
  process.stdout.write(`▶ ${name} … `);
  try {
    await run(page);
  } catch (e) {
    fail(name, "(entry)", "-", `flow threw: ${String(e).split("\n")[0].slice(0, 110)}`);
  }
  for (const e of errs) fail(name, "(console)", "-", `uncaught: ${e}`);
  console.log(`done`);
  await page.close();
}
await browser.close();

console.log(`\nProbed ${probed} numeric inputs.`);
if (notes.length) {
  console.log(`\nNotes (${notes.length}):`);
  for (const n of notes) console.log(`  · ${n}`);
}
if (failures.length) {
  console.log(`\n✘ ${failures.length} FAILURES\n`);
  for (const f of failures) console.log(`  [${f.flow}] ${f.screen}\n     ${f.field}: ${f.msg}`);
  process.exit(1);
}
console.log("\n✓ every input typed into, every character landed, focus never dropped.");
void OUT;
