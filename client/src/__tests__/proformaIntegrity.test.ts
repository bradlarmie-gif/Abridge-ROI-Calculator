import { describe, it, expect } from "vitest";
import {
  buildMonthlyCashFlows,
  calculateProformaSummary,
} from "@/lib/proformaCalculations";
import { computeCaseModel, applyExclusions } from "@/pages/proforma/editorial/editorialShared";
import { SAMPLE_PROFORMA_SETTINGS, SAMPLE_PROFORMA_CONFIG } from "@/pages/proforma/editorial/ProformaWorkbench";
import type { ProformaSettingSnapshot, ProformaConfig } from "@/pages/proforma/proformaTypes";

/**
 * PROFORMA INTEGRITY HARNESS — Layer 1: model reconciliation across the seams.
 *
 * A premium multi-surface tool doesn't break in the math, it breaks at the SEAMS:
 * the same figure computed for Build, The Case, Present and the PDF must agree,
 * and no input permutation may produce a broken/absurd number. This fuzzes the
 * whole input space (contract term × setting mix × pricing model × cost offsets
 * × driver on/off) and asserts the invariants that keep every surface honest.
 *
 * This is the automated half. It would have caught the two real seam bugs we
 * found by hand: driver on/off not reaching Case/Present (the ~$95k
 * disagreement) and the term-length figures diverging.
 */

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const tol = (v: number) => Math.max(50, Math.abs(v) * 0.005);
const finite = (n: number) => Number.isFinite(n);

const TERMS = [12, 24, 36, 48, 60];
const PRICING = ["perUnit", "perEncounter", "annualFlat", "platform"] as const;

function withPricing(s: ProformaSettingSnapshot, m: (typeof PRICING)[number]): ProformaSettingSnapshot {
  const out = clone(s);
  out.pricingModel = m;
  out.costPerUnit = out.costPerUnit || 200;
  out.costPerEncounter = out.costPerEncounter || 2;
  out.annualLicenseFee = out.annualLicenseFee || 500_000;
  out.platformEncRate = out.platformEncRate || 1;
  return out;
}

function settingSelections(): ProformaSettingSnapshot[][] {
  const [op, ed] = SAMPLE_PROFORMA_SETTINGS;
  return [[op], [ed], [op, ed]];
}

// none · exclude the first counted driver · exclude all counted drivers but one
function exclusionVariants(settings: ProformaSettingSnapshot[]): ProformaSettingSnapshot[][] {
  const none = clone(settings);
  const firstOff = clone(settings).map((s) => {
    const idx = s.drivers.findIndex((d) => d.quadrant !== "Quality" && d.value > 0);
    if (idx >= 0) s.drivers[idx].excluded = true;
    return s;
  });
  const allButOne = clone(settings).map((s) => {
    const counted = s.drivers.filter((d) => d.quadrant !== "Quality" && d.value > 0);
    counted.slice(1).forEach((d) => { d.excluded = true; });
    return s;
  });
  return [none, firstOff, allButOne];
}

describe("Proforma Integrity — Layer 1: seam reconciliation fuzz", () => {
  it("every term × settings × pricing × offsets × on-off combo reconciles and never breaks", () => {
    let combos = 0;
    const fails: string[] = [];

    for (const term of TERMS) {
      const config: ProformaConfig = { ...clone(SAMPLE_PROFORMA_CONFIG), contractTermMonths: term };
      for (const sel of settingSelections()) {
        for (const pm of PRICING) {
          const priced = sel.map((s) => withPricing(s, pm));
          for (const stripOffsets of [false, true]) {
            const base = priced.map((s) => {
              const c = clone(s);
              if (stripOffsets) c.costOffsets = [];
              return c;
            });
            for (const variant of exclusionVariants(base)) {
              combos++;
              const resolved = applyExclusions(variant);
              const flows = buildMonthlyCashFlows(resolved, config);
              const summary = calculateProformaSummary(resolved, config, flows);
              const model = computeCaseModel(resolved, config);
              const label = `term=${term} sel=[${sel.map((s) => s.careSetting).join(",")}] pm=${pm} offsets=${!stripOffsets}`;
              const chk = (cond: boolean, msg: string) => { if (!cond) fails.push(`${label}: ${msg}`); };

              // A. Finiteness — no NaN/Infinity ever reaches a figure.
              const figs: [string, number][] = [
                ["model.termValue", model.termValue], ["model.termInvestment", model.termInvestment],
                ["model.termNet", model.termNet], ["model.termDisplaced", model.termDisplaced],
                ["model.roi", model.roi], ["model.runRate", model.runRate],
                ["summary.runRateValue", summary.runRateValue], ["summary.runRateInvestment", summary.runRateInvestment],
                ["summary.termNet", summary.termNet], ["summary.displacementSavings", summary.displacementSavings],
              ];
              for (const [name, n] of figs) chk(finite(n), `non-finite ${name} = ${n}`);

              // B. Column count == term years (guards the P&L table / chart span).
              chk(model.years.length === Math.round(term / 12), `years.length ${model.years.length} != ${Math.round(term / 12)}`);

              // C. Chain reconciliation: drivers → period → term.
              model.years.forEach((y, i) => {
                const s = y.perSetting.reduce((a, p) => a + p.value, 0);
                chk(Math.abs(s - y.clinical) <= tol(y.clinical), `year ${i}: perSetting sum ${s} != clinical ${y.clinical}`);
                chk(finite(y.clinical) && finite(y.investment) && finite(y.net) && finite(y.displaced), `year ${i}: non-finite period figure`);
              });
              const yearsSum = model.years.reduce((a, y) => a + y.clinical, 0);
              chk(Math.abs(yearsSum - model.termValue) <= tol(model.termValue), `Σ years.clinical ${yearsSum} != termValue ${model.termValue}`);

              // D. Build ↔ Case seam: Build reads summary.runRate*, Case reads the
              // last year's figures — they must be the same number.
              const last = model.years[model.years.length - 1];
              chk(Math.abs(last.clinical - summary.runRateValue) <= tol(summary.runRateValue),
                `Case lastYear.clinical ${last.clinical} != Build runRateValue ${summary.runRateValue}`);
              chk(Math.abs(last.investment - summary.runRateInvestment) <= tol(summary.runRateInvestment),
                `Case lastYear.investment ${last.investment} != Build runRateInvestment ${summary.runRateInvestment}`);

              // E. Displacement seam: Case termDisplaced == engine displacementSavings.
              chk(Math.abs(model.termDisplaced - summary.displacementSavings) <= tol(summary.displacementSavings),
                `model.termDisplaced ${model.termDisplaced} != summary.displacementSavings ${summary.displacementSavings}`);

              // F. Payback doctrine: the headline is clinical-only (one source,
              // shared with the PDF), and the displacement-inclusive "real
              // break-even" is never later than it.
              chk(model.payback === summary.clinicalPaybackMonth, `model.payback ${model.payback} != summary.clinicalPaybackMonth ${summary.clinicalPaybackMonth}`);
              if (model.termDisplaced > 0 && model.payback != null && model.paybackWithDisplacement != null)
                chk(model.paybackWithDisplacement <= model.payback, `displacement payback ${model.paybackWithDisplacement} later than clinical ${model.payback}`);

              // H. Sane bounds.
              chk(model.termValue >= -tol(model.termValue), `termValue negative ${model.termValue}`);
              chk(model.termDisplaced >= -1, `displaced negative ${model.termDisplaced}`);
              chk(model.payback === null || (model.payback >= 1 && model.payback <= term), `payback out of range ${model.payback}`);

              // I. Sane economics — the guard that would have caught the pricing
              // blowups ($161M investment, $0/infinite-ROI). Every fuzzed combo
              // has a real pricing model, so investment must be positive and in a
              // plausible band of the value it's buying (not 30x it).
              const grossValue = model.termValue + model.termDisplaced;
              chk(model.termInvestment > 0, `non-positive investment ${model.termInvestment} (pm=${pm})`);
              chk(Number.isFinite(model.roi), `non-finite ROI ${model.roi} (pm=${pm})`);
              chk(model.termInvestment <= grossValue * 10 + 1_000_000, `investment ${model.termInvestment} absurd vs value ${grossValue} (pm=${pm})`);
            }
          }
        }
      }
    }

    expect(combos, "combos run").toBeGreaterThan(100);
    expect(fails.length, `Seam failures (${fails.length} of ${combos} combos):\n${fails.slice(0, 30).join("\n")}`).toBe(0);
  });

  // The exact bug we found by hand: turning a driver off must remove its value
  // from EVERY surface, not just Build.
  it("driver on/off is one source of truth: turning a driver off lowers value everywhere", () => {
    const config: ProformaConfig = { ...clone(SAMPLE_PROFORMA_CONFIG), contractTermMonths: 36 };
    const all = computeCaseModel(applyExclusions(clone(SAMPLE_PROFORMA_SETTINGS)), config);

    const excl = clone(SAMPLE_PROFORMA_SETTINGS);
    const idx = excl[0].drivers.findIndex((d) => d.quadrant !== "Quality" && d.value > 0);
    excl[0].drivers[idx].excluded = true;
    const off = computeCaseModel(applyExclusions(excl), config);

    expect(off.termValue).toBeLessThan(all.termValue);
    // and the run-rate (the Build/Case seam) reflects it too
    expect(off.years[off.years.length - 1].clinical).toBeLessThan(all.years[all.years.length - 1].clinical);
  });

  // Doctrine (Way C): cost displacement is real cash but must NEVER change the
  // clinical value or the ROI multiple — only its own line and payback.
  it("cost displacement never juices the ROI multiple or clinical value", () => {
    const config: ProformaConfig = { ...clone(SAMPLE_PROFORMA_CONFIG), contractTermMonths: 36 };
    const withOff = computeCaseModel(applyExclusions(clone(SAMPLE_PROFORMA_SETTINGS)), config);
    const noOff = computeCaseModel(
      applyExclusions(clone(SAMPLE_PROFORMA_SETTINGS).map((s) => { s.costOffsets = []; return s; })),
      config,
    );

    expect(withOff.termDisplaced).toBeGreaterThan(0);
    expect(noOff.termDisplaced).toBe(0);
    expect(Math.abs(withOff.termValue - noOff.termValue)).toBeLessThanOrEqual(tol(noOff.termValue));
    expect(Math.abs(withOff.roi - noOff.roi)).toBeLessThanOrEqual(0.02);
    // The HEADLINE (clinical) payback is displacement-independent — it must not move.
    expect(withOff.payback).toBe(noOff.payback);
    // The displacement-inclusive "real break-even" story lands sooner or equal.
    expect(withOff.paybackWithDisplacement ?? 9999).toBeLessThanOrEqual(noOff.paybackWithDisplacement ?? 9999);
  });
});
