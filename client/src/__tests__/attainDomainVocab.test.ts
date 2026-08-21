import { describe, it, expect } from "vitest";
import { DISCOVERY, groundingQuestions } from "@/lib/attain/discovery";
import { goalDisplayLabel, SETTING_GOAL_MATRIX } from "@/lib/attain/attainGoals";
import { buildOutcomePlan } from "@/lib/attain/planBuild";
import { EXPLORE_DRIVERS, type ExploreDriver } from "@/lib/exploreDrivers";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";

/**
 * DOMAIN-VOCABULARY GUARD — the standing lint for "would THIS buyer read this as
 * built for them?" It fails the build if a setting's customer-facing copy uses
 * the WRONG buyer's words. This is the class of bug that shipped twice ("Provider
 * Retention" on a nursing screen; a CDI/scribes shelf offered to a nurse leader)
 * and that a human kept catching before the tests did — because green tests
 * checked STRUCTURE, never vocabulary. This closes that gap.
 *
 * Design principle: TRUST OVER COVERAGE. A lint that cries wolf gets disabled,
 * so each rule is a term with ZERO legitimate place in that setting's copy.
 * Genuinely-ambiguous words (a nurse script honestly contrasting itself with
 * "the providers") go through ALLOW rather than weakening a rule. Start
 * conservative; tighten as real leaks are found.
 */

const SETTINGS: AttainSetting[] = ["outpatient", "ed", "inpatient", "nursing"];

const FORBIDDEN: Record<AttainSetting, RegExp[]> = {
  // Ambulatory physicians capture wRVU/E&M. "DRG weight" is an inpatient CAPTURE
  // metric and must not be claimed as an outpatient outcome. Note: bare "DRG" is
  // NOT banned — ED admissions legitimately feed downstream inpatient DRG coding
  // ("DRG coding/assignment"), a supporting reference, not a wrong-buyer metric.
  outpatient: [/DRG weight/i],
  ed: [],
  // Hospitalists live in admissions / discharges / census / ALOS — never
  // outpatient-clinic language. (DRG is legit here, so it is NOT banned.)
  inpatient: [/\bclinic\b/i, /\bpanel\b/i, /\bappointment/i],
  // Nurses are never "providers" and never do physician-productivity/coding work.
  // NOTE: CDI / HCC / DRG are deliberately NOT here — they are shared billing
  // PROCESSES that nursing documentation legitimately SUPPORTS downstream (e.g.
  // the "CDI Query Response" driver = nursing charting corroborating for the CDI
  // team). Banning a shared process would cry wolf on honest supporting-play
  // copy. Where those terms ARE always wrong for a nurse — the grounding "what's
  // in place" shelf ("a CDI program") — the narrower grounding guard in
  // discoveryIntegrity.test.ts catches them. This broad guard sticks to terms
  // that mean "a nurse is being treated as a physician".
  nursing: [
    /\bprovider/i,
    /\bwRVU/i,
    /E\/M\b/i,
    /E&M\b/i,
    /\bpanel\b/i,
    /\bupcod/i,
    /\bencounters?\b/i,
  ],
};

// Known-legitimate strings that contain a flagged term. Escape hatch: add the
// exact idiom here rather than deleting a rule. Nursing revenue honestly names
// physicians as where the primary revenue levers sit.
const ALLOW: RegExp[] = [/live with the providers/i];

// Collect every CUSTOMER-FACING string from a script/question tree, skipping
// structural keys (ids, branch targets, driver keys) that are never shown.
const STRUCTURAL = new Set(["id", "next", "entry", "driverId", "kind"]);
function displayStrings(node: unknown, out: string[] = []): string[] {
  if (typeof node === "string") { out.push(node); return out; }
  if (Array.isArray(node)) { for (const x of node) displayStrings(x, out); return out; }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (STRUCTURAL.has(k)) continue;
      displayStrings(v, out);
    }
  }
  return out;
}

describe("attain domain-vocabulary guard — copy reads native to its buyer", () => {
  for (const setting of SETTINGS) {
    it(`${setting}: no wrong-buyer vocabulary in any customer-facing string`, () => {
      const strings: string[] = [];
      // discovery scripts
      for (const script of Object.values(DISCOVERY[setting] ?? {})) displayStrings(script, strings);
      // grounding (scope + "what's in place")
      for (const q of groundingQuestions(setting)) displayStrings(q, strings);
      // the computed category display labels (guards the original "Provider
      // Retention on nursing" bug: if goalDisplayLabel regresses, it lands here)
      for (const goal of Object.keys(DISCOVERY[setting] ?? {}) as GoalId[]) {
        strings.push(goalDisplayLabel(setting, goal));
      }
      // the OUTCOME PLAN surface (Plan PDF + on-screen planning walk) — the path
      // that shipped "Provider Retention" on nursing AND "DRG weight" on
      // outpatient, both invisible to the earlier scans. Skip the stable `category`
      // join key; scan the customer-facing displayCategory, outcome, and every
      // owner role + step signal/name.
      for (const goal of (SETTING_GOAL_MATRIX[setting] ?? [])) {
        const plan = buildOutcomePlan(setting, goal);
        // displayCategory + chainTitle + owner roles + step name/signal are the
        // customer-facing strings the Plan PDF / walk render. (outcomeLabel is an
        // internal field, not shown, so it's not scanned.)
        strings.push(plan.displayCategory, plan.chainTitle);
        for (const owner of plan.owners) {
          strings.push(owner.role);
          for (const step of owner.steps) strings.push(step.name, step.signal);
        }
      }

      const rules = FORBIDDEN[setting];
      const hits: string[] = [];
      for (const s of strings) {
        if (ALLOW.some((a) => a.test(s))) continue;
        for (const rule of rules) {
          if (rule.test(s)) hits.push(`[${rule.source}] "${s}"`);
        }
      }
      expect(hits, `wrong-buyer vocabulary in ${setting}:\n${hits.join("\n")}`).toEqual([]);
    });
  }

  // Explore drivers declare the settings they apply to, so scan each driver's
  // customer-facing copy against ONLY those settings' rules. (Explore already
  // does this right — nursing's retention driver is "RN Retention", and the
  // "Provider Retention" driver excludes nursing — this locks that in.)
  const exploreDriverStrings = (d: ExploreDriver): string[] => {
    const out: string[] = [];
    const push = (s?: string) => { if (s) out.push(s); };
    push(d.label); push(d.shortDescription); push(d.tagline);
    const m = d.measureDefaults;
    if (m) {
      push(m.deltaLabel); push(m.deltaUnit); push(m.valuePerUnitLabel); push(m.benchmarkHint); push(m.scaleInput?.label);
      for (const o of m.populationOptions ?? []) push(o);
      for (const o of m.serviceLineOptions ?? []) push(o);
      for (const c of m.emCodes ?? []) push(c.label);
    }
    for (const st of [d.valueArc?.signal, d.valueArc?.trend, d.valueArc?.proof]) { if (st) { push(st.metric); push(st.timing); } }
    return out;
  };

  it("explore driver copy is native to every setting the driver applies to", () => {
    const hits: string[] = [];
    for (const d of EXPLORE_DRIVERS) {
      const strings = exploreDriverStrings(d);
      for (const setting of d.settings) {
        for (const s of strings) {
          if (ALLOW.some((a) => a.test(s))) continue;
          for (const rule of FORBIDDEN[setting]) {
            if (rule.test(s)) hits.push(`${setting} · driver "${d.id}" · [${rule.source}] "${s}"`);
          }
        }
      }
    }
    expect(hits, `wrong-buyer vocabulary in explore driver copy:\n${hits.join("\n")}`).toEqual([]);
  });

  it("negative control: the guard actually fires (a planted nursing 'wRVU' is caught)", () => {
    const planted = "The wRVU lift nurses capture";
    const caught = FORBIDDEN.nursing.some((r) => r.test(planted)) && !ALLOW.some((a) => a.test(planted));
    expect(caught, "guard failed to catch a planted wrong-buyer term").toBe(true);
  });

  it("the allow-list escape hatch works (the legit physician contrast passes)", () => {
    const legit = "the primary revenue levers live with the providers";
    const blockedByRule = FORBIDDEN.nursing.some((r) => r.test(legit));
    const rescued = ALLOW.some((a) => a.test(legit));
    expect(blockedByRule && rescued, "the legit contrast idiom is not being rescued by ALLOW").toBe(true);
  });
});
