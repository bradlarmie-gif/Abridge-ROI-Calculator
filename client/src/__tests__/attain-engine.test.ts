import { describe, it, expect } from "vitest";
import {
  engineValueInPlay,
  cellInputsReady,
  type CellInputs,
} from "@/pages/attain/preview/attainEngineAdapter";
import {
  ECON_MODELS,
  assumptionDefaults,
} from "@/pages/attain/preview/attainEconomics";

/**
 * Correctness harness for the Attain value engine (attainEngineAdapter).
 * Written by a test agent; exercises every one of the 11 valid cells against
 * the six assertion families in the brief. Touches no source files.
 */

// ---- The 11 valid cells (setting|category), split for convenience -----------
const CELLS = Object.keys(ECON_MODELS).map((k) => {
  const [setting, category] = k.split("|");
  return { key: k, setting, category };
});

// Setting -> a representative scope, matching the adapter's own defaults.
const SCOPE_FOR: Record<string, number> = {
  Outpatient: 40,
  ED: 30,
  Inpatient: 24,
  Nursing: 260,
};

// A sensible positive value for each required economics field key.
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

const midStance = (key: string) => {
  const bands = ECON_MODELS[key].stanceBands;
  return bands[Math.floor(bands.length / 2)];
};

// Build a fully-ready input for a cell: scope + mid stance + every required
// field (from ECON_MODELS.fields) + every assumption at its seeded default.
// All economics (fields + assumptions) live in `econ`, which is how the engine
// reads them.
function readyInput(setting: string, category: string): CellInputs {
  const key = `${setting}|${category}`;
  const m = ECON_MODELS[key];
  const econ: Record<string, number> = {};
  for (const f of m.fields) econ[f.key] = FIELD_DEFAULT[f.key] ?? 100;
  const asm = assumptionDefaults(setting, category);
  for (const [k, v] of Object.entries(asm)) {
    const n = parseFloat(v.replace(/,/g, ""));
    if (Number.isFinite(n)) econ[k] = n;
  }
  // NEW MODEL: multi-lever categories (Revenue Capture) only price the levers the live flow
  // turns on. Mirror MultiCategoryPreview.cellInputs — pass the union of every lever's driver
  // keys, i.e. all levers active, which is what a fully-answered frame / all picked goals yields.
  const activeDriverKeys = m.levers
    ? Array.from(new Set(m.levers.flatMap((l) => l.driverKeys)))
    : undefined;
  return { scope: SCOPE_FOR[setting], stancePct: midStance(key), econ, activeDriverKeys };
}

// Every econ key the cell touches (required fields + assumptions).
function econKeys(setting: string, category: string): string[] {
  const m = ECON_MODELS[`${setting}|${category}`];
  const keys = m.fields.map((f) => f.key);
  for (const a of m.assumptions ?? []) if (!keys.includes(a.key)) keys.push(a.key);
  return keys;
}

const finiteNum = (v: number) => Number.isFinite(v) && !Number.isNaN(v);

// ============================================================================
// 1. Returns 0 when inputs are not ready
// ============================================================================
describe("readiness gate returns 0 when inputs are not ready", () => {
  it("returns 0 for a completely empty input on every cell", () => {
    for (const { setting, category } of CELLS) {
      expect(cellInputsReady(setting, category, {})).toBe(false);
      expect(engineValueInPlay(setting, category, {})).toBe(0);
    }
  });

  it("returns 0 for an unknown (invalid) cell", () => {
    expect(engineValueInPlay("Outpatient", "Nonexistent", { scope: 10, stancePct: 20, econ: { perVisit: 200 } })).toBe(0);
    expect(engineValueInPlay("Rooftop", "Patient Access", { scope: 10, stancePct: 20 })).toBe(0);
  });

  it("returns 0 when scope is missing", () => {
    for (const { setting, category } of CELLS) {
      const inp = { ...readyInput(setting, category), scope: undefined };
      expect(engineValueInPlay(setting, category, inp)).toBe(0);
    }
  });

  it("returns 0 when stance is missing", () => {
    for (const { setting, category } of CELLS) {
      const inp = { ...readyInput(setting, category), stancePct: undefined };
      expect(engineValueInPlay(setting, category, inp)).toBe(0);
    }
  });

  it("returns 0 for a multi-lever category with no active lever", () => {
    // NEW MODEL: Revenue Capture prices only the levers the frame answer / picked goals turn
    // on. With no lever live (activeDriverKeys absent), the honest number is 0 — even with
    // scope, stance and every economics field committed. This is the multi-lever readiness gate.
    const multi = CELLS.filter((c) => ECON_MODELS[c.key].levers);
    expect(multi.length).toBeGreaterThan(0);
    for (const { setting, category, key } of multi) {
      const { activeDriverKeys, ...noLevers } = readyInput(setting, category);
      expect(activeDriverKeys, `${key} should be multi-lever`).toBeTruthy();
      expect(cellInputsReady(setting, category, noLevers)).toBe(false);
      expect(engineValueInPlay(setting, category, noLevers)).toBe(0);
    }
  });

  it("does NOT zero when a single economics field is blank (falls back to a default)", () => {
    // NEW MODEL: detailed economics fields fall back to conservative typical defaults, so one
    // blank field no longer zeroes an otherwise-committed (scope + stance) category. The
    // readiness gate is scope + stance (+ an active lever for multi-lever cells), not each field.
    for (const { setting, category } of CELLS) {
      const fields = ECON_MODELS[`${setting}|${category}`].fields;
      for (const f of fields) {
        const base = readyInput(setting, category);
        const econ = { ...base.econ };
        delete econ[f.key];
        const v = engineValueInPlay(setting, category, { ...base, econ });
        expect(finiteNum(v), `${setting}|${category} blank ${f.key}`).toBe(true);
        expect(
          v,
          `${setting}|${category} blank ${f.key} should still produce value from the fallback`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

// ============================================================================
// 2. Returns a finite number > 0 when fully ready
// ============================================================================
describe("returns a finite positive value when fully ready", () => {
  for (const { setting, category } of CELLS) {
    it(`${setting} | ${category} yields finite > 0`, () => {
      const inp = readyInput(setting, category);
      expect(cellInputsReady(setting, category, inp)).toBe(true);
      const v = engineValueInPlay(setting, category, inp);
      expect(finiteNum(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    });
  }
});

// ============================================================================
// 3. Never NaN or Infinity across a matrix of nasty inputs
// ============================================================================
describe("never NaN / Infinity across nasty inputs", () => {
  const NASTY = [0, -5, -1e9, 1e12, 0.5, 0.0001, 1e-12];

  it("survives single-slot nasty overrides on every numeric input", () => {
    for (const { setting, category } of CELLS) {
      const base = readyInput(setting, category);
      const slots: (keyof CellInputs)[] = [
        "scope",
        "stancePct",
        "util",
        "adoption",
        "staffedBeds",
        "minSaved",
        "annualEncounters",
        "totalProviders",
      ];
      for (const slot of slots) {
        for (const bad of NASTY) {
          const v = engineValueInPlay(setting, category, { ...base, [slot]: bad });
          expect(finiteNum(v), `${setting}|${category} ${String(slot)}=${bad} -> ${v}`).toBe(true);
        }
      }
      for (const k of econKeys(setting, category)) {
        for (const bad of NASTY) {
          const v = engineValueInPlay(setting, category, {
            ...base,
            econ: { ...base.econ, [k]: bad },
          });
          expect(finiteNum(v), `${setting}|${category} econ.${k}=${bad} -> ${v}`).toBe(true);
        }
      }
    }
  });

  it("survives all-slots-nasty combinations (huge, negative, tiny, zero, decimal)", () => {
    for (const { setting, category } of CELLS) {
      const base = readyInput(setting, category);
      const keys = econKeys(setting, category);
      for (const bad of NASTY) {
        const econ: Record<string, number> = {};
        for (const k of keys) econ[k] = bad;
        const inp: CellInputs = {
          scope: bad,
          stancePct: bad,
          util: bad,
          adoption: bad,
          staffedBeds: bad,
          minSaved: bad,
          annualEncounters: bad,
          totalProviders: bad,
          econ,
        };
        const v = engineValueInPlay(setting, category, inp);
        expect(finiteNum(v), `${setting}|${category} ALL=${bad} -> ${v}`).toBe(true);
      }
    }
  });

  it("stays finite when scope + encounters are simultaneously huge (overflow probe)", () => {
    for (const { setting, category } of CELLS) {
      const base = readyInput(setting, category);
      const keys = econKeys(setting, category);
      const econ: Record<string, number> = {};
      for (const k of keys) econ[k] = 1e12;
      const v = engineValueInPlay(setting, category, {
        ...base,
        scope: 1e9,
        annualEncounters: 1e12,
        totalProviders: 1,
        staffedBeds: 1e12,
        econ,
      });
      expect(finiteNum(v), `${setting}|${category} overflow probe -> ${v}`).toBe(true);
    }
  });
});

// ============================================================================
// 4. Scales with scope and with annualEncounters
// ============================================================================
// NEW MODEL: multi-lever Revenue Capture no longer scales ~linearly as a whole, because some
// levers are sized by an ABSOLUTE partner-entered count, not by provider/encounter volume:
//  - hccCapture  (Outpatient risk): sized by riskPatients (the risk-contract panel)
//  - ipCdiValue  (Inpatient CDI):    sized by cdiQueries (queries a complete note avoids a year)
// Those stay constant when scope/encounters double; every other driver scales ~linearly. So the
// single-lever cells still "roughly double", while multi-lever cells are exercised per-lever below.
const FIXED_COUNT_DRIVERS = new Set(["hccCapture", "ipCdiValue"]);
const isMultiLever = (key: string) => Boolean(ECON_MODELS[key].levers);
function driversByScaling(setting: string, category: string) {
  const drivers = (ECON_MODELS[`${setting}|${category}`].levers ?? []).flatMap((l) => l.driverKeys);
  return {
    linear: drivers.filter((d) => !FIXED_COUNT_DRIVERS.has(d)),
    fixed: drivers.filter((d) => FIXED_COUNT_DRIVERS.has(d)),
  };
}

describe("scales with scope (scope drives volume everywhere)", () => {
  // single-lever / volume-linear cells; multi-lever revenue is exercised per-lever further down
  for (const { setting, category } of CELLS.filter((c) => !isMultiLever(c.key))) {
    it(`${setting} | ${category} roughly doubles when scope doubles`, () => {
      const base = readyInput(setting, category);
      const s = base.scope!;
      const v1 = engineValueInPlay(setting, category, { ...base, scope: s });
      const v2 = engineValueInPlay(setting, category, { ...base, scope: s * 2 });
      expect(v1).toBeGreaterThan(0);
      expect(v2).toBeGreaterThan(v1);
      // linear in scope, allow a generous band for rounding / derived beds
      expect(v2).toBeGreaterThan(v1 * 1.5);
      expect(v2).toBeLessThan(v1 * 2.5);
    });
  }
});

// The multi-lever revenue cells: each lever scales by its own rule (volume levers ~double, fixed-
// count levers stay put), and the whole value grows monotonically but sub-linearly when both mix.
describe("multi-lever Revenue Capture scales per lever (volume levers scale, fixed-count don't)", () => {
  const MULTI = CELLS.filter((c) => isMultiLever(c.key));
  const A = 100_000;
  for (const { setting, category } of MULTI) {
    const { linear, fixed } = driversByScaling(setting, category);

    it(`${setting} | ${category}: volume levers [${linear.join(", ")}] ~double when scope & encounters double`, () => {
      expect(linear.length).toBeGreaterThan(0);
      const base = { ...readyInput(setting, category), activeDriverKeys: linear };
      const s = base.scope!;
      const s1 = engineValueInPlay(setting, category, { ...base, scope: s });
      const s2 = engineValueInPlay(setting, category, { ...base, scope: s * 2 });
      expect(s1).toBeGreaterThan(0);
      expect(s2).toBeGreaterThan(s1 * 1.5);
      expect(s2).toBeLessThan(s1 * 2.5);
      // encounters (totalProviders pinned = scope so encounters flow 1:1)
      const common = { ...base, totalProviders: s };
      const e1 = engineValueInPlay(setting, category, { ...common, annualEncounters: A });
      const e2 = engineValueInPlay(setting, category, { ...common, annualEncounters: A * 2 });
      expect(e1).toBeGreaterThan(0);
      expect(e2).toBeGreaterThan(e1 * 1.5);
      expect(e2).toBeLessThan(e1 * 2.5);
    });

    if (fixed.length) {
      it(`${setting} | ${category}: fixed-count levers [${fixed.join(", ")}] stay constant when scope & encounters double`, () => {
        const base = { ...readyInput(setting, category), activeDriverKeys: fixed };
        const s = base.scope!;
        const s1 = engineValueInPlay(setting, category, { ...base, scope: s });
        const s2 = engineValueInPlay(setting, category, { ...base, scope: s * 2 });
        expect(s1).toBeGreaterThan(0);
        // sized by an absolute panel / query count, so doubling scope must NOT move it
        expect(s2).toBeGreaterThan(s1 * 0.99);
        expect(s2).toBeLessThan(s1 * 1.01);
        const common = { ...base, totalProviders: s };
        const e1 = engineValueInPlay(setting, category, { ...common, annualEncounters: A });
        const e2 = engineValueInPlay(setting, category, { ...common, annualEncounters: A * 2 });
        expect(e1).toBeGreaterThan(0);
        expect(e2).toBeGreaterThan(e1 * 0.99);
        expect(e2).toBeLessThan(e1 * 1.01);
      });
    }

    if (linear.length && fixed.length) {
      it(`${setting} | ${category}: the whole value grows monotonically but sub-linearly (fixed lever damps it)`, () => {
        const base = readyInput(setting, category); // all levers active
        const s = base.scope!;
        const v1 = engineValueInPlay(setting, category, { ...base, scope: s });
        const v2 = engineValueInPlay(setting, category, { ...base, scope: s * 2 });
        expect(v1).toBeGreaterThan(0);
        expect(v2).toBeGreaterThan(v1); // the volume levers still push it up
        expect(v2).toBeLessThan(v1 * 2); // but the fixed-count lever keeps it under a clean doubling
      });
    }
  }
});

describe("scales with annualEncounters (OP/ED access)", () => {
  // multi-lever revenue encounter-scaling is covered per-lever in the block above
  const ENCOUNTER_CELLS = [
    { setting: "Outpatient", category: "Patient Access" },
    { setting: "ED", category: "Patient Access" },
  ];
  for (const { setting, category } of ENCOUNTER_CELLS) {
    it(`${setting} | ${category} roughly doubles when annualEncounters doubles`, () => {
      const base = readyInput(setting, category);
      // pin totalProviders = scope so encounters flow through 1:1
      const common = { ...base, totalProviders: base.scope };
      const A = 100_000;
      const v1 = engineValueInPlay(setting, category, { ...common, annualEncounters: A });
      const v2 = engineValueInPlay(setting, category, { ...common, annualEncounters: A * 2 });
      expect(v1).toBeGreaterThan(0);
      expect(v2).toBeGreaterThan(v1 * 1.5);
      expect(v2).toBeLessThan(v1 * 2.5);
    });
  }
});

// ============================================================================
// 5. Every econ assumption key actually changes the output when varied
// ============================================================================
describe("each ECON_MODELS assumption key changes the output", () => {
  for (const { setting, category } of CELLS) {
    const asm = ECON_MODELS[`${setting}|${category}`].assumptions ?? [];
    for (const a of asm) {
      it(`${setting} | ${category}: assumption "${a.key}" moves the number`, () => {
        const base = readyInput(setting, category);
        const baseVal = engineValueInPlay(setting, category, base);
        const cur = base.econ?.[a.key] ?? 1;
        const bumped = engineValueInPlay(setting, category, {
          ...base,
          econ: { ...base.econ, [a.key]: (cur || 1) * 3 },
        });
        expect(baseVal).toBeGreaterThan(0);
        expect(bumped, `${setting}|${category} assumption ${a.key}: base=${baseVal} bumped=${bumped}`).not.toBe(baseVal);
      });
    }
  }
});

// ============================================================================
// 6. Large stance (above cap) must not NaN / Infinity
// ============================================================================
describe("large stance beyond the cap stays finite", () => {
  for (const { setting, category } of CELLS) {
    it(`${setting} | ${category} tolerates a stance of 999`, () => {
      const base = readyInput(setting, category);
      const cap = ECON_MODELS[`${setting}|${category}`].stanceCap;
      const v = engineValueInPlay(setting, category, { ...base, stancePct: 999 });
      expect(finiteNum(v), `${setting}|${category} stance=999 -> ${v}`).toBe(true);
      // sanity: a stance far above the cap should not underflow to negative
      expect(v).toBeGreaterThanOrEqual(0);
      // cap is a caller concern, but the engine should still produce a number
      expect(cap).toBeGreaterThan(0);
    });
  }
});
