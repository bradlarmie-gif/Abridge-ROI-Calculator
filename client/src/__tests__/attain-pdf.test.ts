import { describe, it, expect } from "vitest";
import { buildFromSnapshot } from "@/pages/attain/pdf/attainPdfData";
import type {
  AttainSnapshot,
  StoredMetric,
  StoredPerson,
  StoredAlignInputs,
} from "@/pages/attain/attainStorage";
import { ECON_MODELS } from "@/pages/attain/preview/attainEconomics";
import { ATTAIN_MATRIX } from "@/pages/attain/preview/attainCells";

/**
 * Correctness harness for the Attain PDF transformer (buildFromSnapshot).
 * For each of the four settings we hand-build a plausible saved plan (partner,
 * setting, goals, baseline, per-category econ + stance, metric readings, people,
 * review log) and assert the transformer produces a complete, finite PdfData with
 * the right categories and entered flags. Also covers the null / partial-input
 * contract (must return null, not throw).
 */

// snapshot setting key -> the label the transformer resolves it to
const SETTING_KEYS = ["outpatient", "ed", "inpatient", "nursing"] as const;
const LABEL: Record<string, string> = {
  outpatient: "Outpatient",
  ed: "ED",
  inpatient: "Inpatient",
  nursing: "Nursing",
};
// category label -> the goal key that maps back to it (reverse of GOAL_CATEGORY)
const GOAL_OF: Record<string, string> = {
  "Patient Access": "access",
  "Provider Retention": "retention",
  "Revenue Capture": "revenue",
  "Quality & Safety": "quality",
  "Nursing Capacity": "capacity",
};

// sensible positive value for each required econ field key
const FIELD_DEFAULT: Record<string, number> = {
  perVisit: 200,
  replacementCost: 400_000,
  turnover: 12,
  wrvu: 1.5,
  cf: 33.4,
  edVisit: 480,
  admitMargin: 8_000,
  drgBase: 6_000,
  otRate: 75,
};

// ALL matrix cells for a setting. The PDF page-1 grid lists every one of them — the chosen
// goals are "entered", the rest render as un-entered $0 teasers (see the subset test below).
const matrixCatsFor = (label: string) =>
  ATTAIN_MATRIX.filter((c) => c.setting === label).map((c) => c.category);
const matrixDisplayNamesFor = (label: string) =>
  ATTAIN_MATRIX.filter((c) => c.setting === label).map((c) => c.categoryLabel ?? c.category);
// GOAL-SELECTABLE categories: this test picks only the categories in its local GOAL_OF map, so a
// cell it does not list stays an un-entered $0 teaser here. (Inpatient Capacity IS now a real goal
// — see attainReachability.test.ts — but this suite deliberately doesn't pick it, so it exercises
// the un-entered teaser path. Reachability + the review dollar are covered by their own suites.)
const goalCatsFor = (label: string) => matrixCatsFor(label).filter((c) => GOAL_OF[c]);
const goalDisplayNamesFor = (label: string) =>
  ATTAIN_MATRIX.filter((c) => c.setting === label && GOAL_OF[c.category]).map((c) => c.categoryLabel ?? c.category);

const cellOf = (label: string, category: string) =>
  ATTAIN_MATRIX.find((c) => c.setting === label && c.category === category)!;

// A ready econ map (as the string-keyed record the snapshot stores) for one cell.
// NEW MODEL: Provider Retention is proof-only — it has NO ECON_MODELS entry, so there is no
// econ to fill and no dollar; return an empty map for such cells.
function econFor(label: string, category: string): Record<string, string> {
  const m = ECON_MODELS[`${label}|${category}`];
  const econ: Record<string, string> = {};
  if (!m) return econ; // proof-only category (e.g. Provider Retention)
  for (const f of m.fields) econ[f.key] = String(FIELD_DEFAULT[f.key] ?? 100);
  for (const a of m.assumptions ?? []) econ[a.key] = a.default; // seeded string default
  return econ;
}

// mid stance band for a cell (a positive, in-range percent). Proof-only categories have no
// stance bands and no dollar, so there is no stance to set — return 0.
function midStance(label: string, category: string): number {
  const m = ECON_MODELS[`${label}|${category}`];
  if (!m) return 0; // proof-only category (e.g. Provider Retention)
  const bands = m.stanceBands;
  return bands[Math.floor(bands.length / 2)];
}

// Is this a proof-only category (no econ model, no dollar by design)?
const isProofOnly = (label: string, category: string) => !ECON_MODELS[`${label}|${category}`];

function metricsForCell(label: string, category: string): Record<string, StoredMetric> {
  const cell = cellOf(label, category);
  const out: Record<string, StoredMetric> = {};
  for (const s of cell.plan.abridgeSignals ?? [])
    out[s.id] = { today: "8", target: "5", source: "Epic Signal" };
  for (const g of cell.plan.outcomeGroups ?? [])
    for (const mm of g.metrics)
      out[mm.id] = { today: "3", target: "1.5", source: "Reporting Workbench" };
  return out;
}

// Build a full, plausible snapshot with EVERY GOAL-SELECTABLE category of the setting chosen.
// (Only goal-selectable cells can be picked as goals; Inpatient Capacity, having no goal, is not.)
function buildSnapshot(settingKey: string, onlyCats?: string[]): AttainSnapshot {
  const label = LABEL[settingKey];
  const cats = onlyCats ?? goalCatsFor(label);
  const goals = cats.map((c) => GOAL_OF[c]);

  const inputsByCat: Record<string, StoredAlignInputs> = {};
  const metricsByCat: Record<string, Record<string, StoredMetric>> = {};
  const peopleByCat: Record<string, StoredPerson[]> = {};
  const answersByCat: Record<string, { segs: string[]; choices: Record<string, string[]>; proof: string[]; unlock: string[] }> = {};
  for (const c of cats) {
    inputsByCat[c] = {
      scope: label === "Nursing" ? "260" : "40",
      econ: econFor(label, c),
      stance: midStance(label, c),
      custom: "",
    };
    metricsByCat[c] = metricsForCell(label, c);
    peopleByCat[c] = [{ name: "Jane Doe", role: "Director" }];
    // Multi-lever cells (Revenue Capture) only price out once their frame answer is set, so a
    // fully-ready plan must have its payers/mechanisms picked. Turn them all on.
    const frameChoice = ECON_MODELS[`${label}|${c}`]?.levers ? cellOf(label, c).align.choices?.find((q) => q.stage === "frame") : undefined;
    if (frameChoice) answersByCat[c] = { segs: [], choices: { [frameChoice.id]: frameChoice.options.map((o) => o.id) }, proof: [], unlock: [] };
  }

  return {
    partner: "Test Health System",
    phase: "plan",
    setting: settingKey,
    goals,
    baseline: {
      providers: 40,
      annualEncounters: 132_000,
      utilizationPct: 70,
      adoptionPct: 70,
      staffedBeds: 180,
    },
    pickedByCat: {},
    playsByCat: {},
    answersByCat,
    inputsByCat,
    metricsByCat,
    readingsByCat: {},
    peopleByCat,
    reviewLog: [{ label: "Q1 review", attain: 40 }],
    savedAt: Date.now(),
  };
}

// walk the whole result and fail on any NaN number
function assertNoNaN(v: unknown, path = "root"): void {
  if (typeof v === "number") {
    expect(Number.isNaN(v), `${path} is NaN`).toBe(false);
    expect(Number.isFinite(v), `${path} is not finite (${v})`).toBe(true);
    return;
  }
  if (Array.isArray(v)) {
    v.forEach((x, i) => assertNoNaN(x, `${path}[${i}]`));
    return;
  }
  if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v)) assertNoNaN(val, `${path}.${k}`);
  }
}

// ============================================================================
// Per-setting: full snapshot builds a complete, finite result
// ============================================================================
describe("buildFromSnapshot builds a complete result for every setting", () => {
  for (const settingKey of SETTING_KEYS) {
    const label = LABEL[settingKey];
    const cats = matrixCatsFor(label); // every cell on the page-1 grid
    const goalCats = new Set(goalCatsFor(label)); // the subset that can be chosen / entered

    it(`${label}: returns non-null with a finite total >= 0`, () => {
      const res = buildFromSnapshot(buildSnapshot(settingKey));
      expect(res, `${label} should build`).not.toBeNull();
      const { data, categories } = res!;
      expect(Number.isFinite(data.total)).toBe(true);
      expect(data.total).toBeGreaterThanOrEqual(0);
      // a fully-ready plan should actually produce money
      expect(data.total).toBeGreaterThan(0);
    });

    it(`${label}: data.categories covers all ${cats.length} grid cells; goal cells entered`, () => {
      const { data } = buildFromSnapshot(buildSnapshot(settingKey))!;
      // the page-1 grid lists EVERY matrix cell for the setting
      expect(data.categories.map((c) => c.name).sort()).toEqual([...matrixDisplayNamesFor(label)].sort());
      // display heading -> stable category key, so we can tell which cells are goal / proof-only
      const catByDisplay = new Map(
        ATTAIN_MATRIX.filter((mc) => mc.setting === label).map((mc) => [mc.categoryLabel ?? mc.category, mc.category]),
      );
      for (const c of data.categories) {
        const key = catByDisplay.get(c.name)!;
        expect(Number.isFinite(c.value)).toBe(true);
        expect(c.value).toBeGreaterThanOrEqual(0);
        // NEW MODEL: only goal-selectable cells are chosen, so only they are "entered". A non-goal
        // matrix cell (Inpatient Capacity) rides the grid as an un-entered $0 teaser.
        if (goalCats.has(key)) {
          expect(c.entered, `${label}/${c.name} is a chosen goal, must be entered`).toBe(true);
        } else {
          expect(c.entered, `${label}/${c.name} has no goal, must not be entered`).toBe(false);
          expect(c.value, `${label}/${c.name} un-entered teaser must be $0`).toBe(0);
        }
        // NEW MODEL: Provider/Nurse Retention is proof-only — no econ model, $0 by design.
        if (isProofOnly(label, key)) {
          expect(c.value, `${label}/${c.name} is proof-only, must be $0`).toBe(0);
        }
      }
      // a proof-only category IS present and entered, and it contributes nothing to the dollar
      expect(data.categories.some((c) => c.value === 0 && c.entered)).toBe(true);
      // the sum of entered category values equals the reported total
      const sum = data.categories
        .filter((c) => c.entered)
        .reduce((s, c) => s + c.value, 0);
      expect(Math.round(sum)).toBe(Math.round(data.total));
    });

    it(`${label}: categories[] detail pages cover exactly the chosen goals`, () => {
      const { categories } = buildFromSnapshot(buildSnapshot(settingKey))!;
      // only chosen (goal-selectable) categories get a detail page — not the grid-only teasers
      expect(categories.map((c) => c.name).sort()).toEqual([...goalDisplayNamesFor(label)].sort());
      for (const pc of categories) {
        expect(pc.owner.name).toBe("Jane Doe");
        expect(Array.isArray(pc.signals)).toBe(true);
        expect(Array.isArray(pc.outcomes)).toBe(true);
        expect(Array.isArray(pc.chain)).toBe(true);
        expect(typeof pc.honesty).toBe("string");
      }
    });

    it(`${label}: no field anywhere is NaN`, () => {
      const res = buildFromSnapshot(buildSnapshot(settingKey))!;
      assertNoNaN(res.data, `${label}.data`);
      assertNoNaN(res.categories, `${label}.categories`);
    });

    it(`${label}: partner and setting label carried through`, () => {
      const { data } = buildFromSnapshot(buildSnapshot(settingKey))!;
      expect(data.partner).toBe("Test Health System");
      expect(data.setting).toBe(label);
      expect(typeof data.date).toBe("string");
    });
  }
});

// ============================================================================
// Subset of goals: only the chosen categories get detail pages / entered flags
// ============================================================================
describe("buildFromSnapshot honors a subset of goals", () => {
  it("Outpatient with only 'access' chosen: one detail page, one entered cell", () => {
    const snap = buildSnapshot("outpatient", ["Patient Access"]);
    const res = buildFromSnapshot(snap);
    expect(res).not.toBeNull();
    const { data, categories } = res!;
    // detail pages: only the chosen goal
    expect(categories.map((c) => c.name)).toEqual(["Patient Access"]);
    // page-1 grid still lists all three, but only the chosen one is entered
    const entered = data.categories.filter((c) => c.entered).map((c) => c.name);
    const notEntered = data.categories.filter((c) => !c.entered).map((c) => c.name);
    expect(entered).toEqual(["Patient Access"]);
    expect(notEntered.sort()).toEqual(["Provider Retention", "Revenue Capture"]);
    // un-entered cells contribute 0 to the total
    expect(data.total).toBeGreaterThan(0);
    expect(
      data.categories.filter((c) => !c.entered).every((c) => c.value === 0),
    ).toBe(true);
  });
});

// ============================================================================
// Contract: null (not throw) for bad input; no throw for partial input
// ============================================================================
describe("buildFromSnapshot returns null ONLY without a valid setting", () => {
  const nullish = (v: unknown) => {
    let res: unknown;
    expect(() => {
      res = buildFromSnapshot(v as AttainSnapshot);
    }, `buildFromSnapshot(${JSON.stringify(v)}) should not throw`).not.toThrow();
    expect(res, `buildFromSnapshot(${JSON.stringify(v)}) should be null`).toBeNull();
  };

  it("null snapshot", () => nullish(null));
  it("undefined snapshot", () => nullish(undefined));
  it("empty snapshot {}", () => nullish({}));
  it("unknown setting", () =>
    nullish({ partner: "X", setting: "rooftop", goals: ["access"] }));
});

// Hardening: a valid setting always exports. Empty or unmapped goals (a stale
// plan from an older build) fall back to the setting's categories instead of
// returning null — that null was the "Export failed" bug in the field.
describe("buildFromSnapshot falls back (not null) for a valid setting with stale goals", () => {
  const buildsAnyway = (v: unknown) => {
    let res: ReturnType<typeof buildFromSnapshot> = null;
    expect(() => { res = buildFromSnapshot(v as AttainSnapshot); }).not.toThrow();
    expect(res, `${JSON.stringify(v)} should still build`).not.toBeNull();
    expect(res!.categories.length).toBeGreaterThan(0);
  };
  it("no goals", () => buildsAnyway({ partner: "X", setting: "outpatient", goals: [] }));
  it("goals that map to no cells for the setting", () =>
    buildsAnyway({ partner: "X", setting: "outpatient", goals: ["capacity"] }));
  it("goals that map to no category at all", () =>
    buildsAnyway({ partner: "X", setting: "outpatient", goals: ["nonsense"] }));

  it("does NOT throw for a partial snapshot (missing metricsByCat/peopleByCat/econ/baseline)", () => {
    const partial = {
      partner: "Partial Health",
      setting: "outpatient",
      goals: ["access"],
      // no inputsByCat, baseline, metricsByCat, peopleByCat, etc.
    } as unknown as AttainSnapshot;
    let res: ReturnType<typeof buildFromSnapshot>;
    expect(() => {
      res = buildFromSnapshot(partial);
    }).not.toThrow();
    // it should still return a shape (nothing entered -> total 0), not null
    expect(res!).not.toBeNull();
    expect(res!.data.total).toBe(0);
    expect(Number.isFinite(res!.data.total)).toBe(true);
    // the one chosen goal still yields a detail page, just with placeholder rows
    expect(res!.categories.map((c) => c.name)).toEqual(["Patient Access"]);
    assertNoNaN(res!.data, "partial.data");
    assertNoNaN(res!.categories, "partial.categories");
  });
});
