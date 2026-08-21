import { describe, it, expect } from "vitest";
import { DISCOVERY, BRIEF, briefThesis, briefRoles, resolveResult, groundingQuestions, type DiscoveryScript, type DiscoveryAnswers } from "@/lib/attain/discovery";
import { EXPLORE_DRIVERS } from "@/lib/exploreDrivers";
import { engineKeyForDriver } from "@/lib/exploreDriverKeys";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";

/**
 * DISCOVERY INTEGRITY GUARD — the pre-ROI discovery interview can never ship a
 * dead branch, an orphan question, a path over the ~10-question cap, or a
 * "where the real money is" lever that points at a driver the ROI does not have.
 * "You can't fuck this up" as a test.
 */

const MAX_QUESTIONS = 10;

// Every real Explore engine result key, across every setting.
const SETTINGS: AttainSetting[] = ["outpatient", "ed", "inpatient", "nursing"];
const VALID_LEVERS = new Set<string>();
for (const d of EXPLORE_DRIVERS) for (const s of SETTINGS) VALID_LEVERS.add(engineKeyForDriver(d.id, s));

function scripts(): { setting: AttainSetting; goal: GoalId; script: DiscoveryScript }[] {
  const out: { setting: AttainSetting; goal: GoalId; script: DiscoveryScript }[] = [];
  for (const setting of Object.keys(DISCOVERY) as AttainSetting[]) {
    const byGoal = DISCOVERY[setting]!;
    for (const goal of Object.keys(byGoal) as GoalId[]) out.push({ setting, goal, script: byGoal[goal]! });
  }
  return out;
}

describe("grounding is setting-native (domain-fit guard)", () => {
  // Physician-side vocabulary that must NEVER appear on the nursing shelf — the
  // exact class of bug this guard exists to catch (a nursing leader offered CDI
  // and scribes reads as "this wasn't built for you").
  const PHYSICIAN_ONLY = /\bCDI\b|coding|scrib|wRVU|E\/?M\b/i;

  for (const setting of SETTINGS) {
    it(`${setting}: has a scope + a multi-select "tried" inventory with unique ids and a "nothing" out`, () => {
      const qs = groundingQuestions(setting);
      const tried = qs.find((q) => q.id === "tried")!;
      expect(tried, `${setting} has no "tried" grounding question`).toBeTruthy();
      expect(tried.multi, `${setting} "tried" should be multi-select`).toBe(true);
      expect(tried.options.length, `${setting} "tried" has too few options`).toBeGreaterThanOrEqual(3);
      const ids = new Set(tried.options.map((o) => o.id));
      expect(ids.size, `${setting} "tried" has duplicate option ids`).toBe(tried.options.length);
      expect(ids.has("nothing"), `${setting} "tried" is missing the exclusive "nothing" option`).toBe(true);
    });
  }

  it("the nursing shelf carries no physician-only vocabulary", () => {
    const tried = groundingQuestions("nursing").find((q) => q.id === "tried")!;
    for (const o of tried.options) {
      const blob = `${o.label} ${o.capture}`;
      expect(PHYSICIAN_ONLY.test(blob), `nursing "tried" option leaks physician vocab: "${o.label}"`).toBe(false);
    }
  });

  it("positive control: physician settings DO carry CDI/coding (proves the map isn't uniformly nursing)", () => {
    const blob = groundingQuestions("outpatient").find((q) => q.id === "tried")!
      .options.map((o) => `${o.label} ${o.capture}`).join(" ");
    expect(/CDI|coding/i.test(blob), "outpatient lost its physician shelf").toBe(true);
  });

  it("every nursing script seats a nursing-side owner (no all-finance table)", () => {
    const NURSE_SEAT = /nurs|CNO|unit manager|bedside|charge nurse/i;
    for (const goal of Object.keys(DISCOVERY.nursing ?? {}) as GoalId[]) {
      const roles = briefRoles("nursing", goal);
      expect(roles.some((r) => NURSE_SEAT.test(r)), `nursing/${goal} names no nursing-side owner: ${roles.join(", ")}`).toBe(true);
    }
  });
});

describe("nurse retention multi-select (comprehensive capture)", () => {
  const S = "nursing" as AttainSetting, G = "retention" as GoalId;
  const script = DISCOVERY.nursing!.retention!;

  it("drivers is multi-select and has a connect-the-dots beat before scale", () => {
    expect(script.questions[script.entry].multi, "nurse drivers should be multi").toBe(true);
    expect(script.questions.connect, "missing connect-the-dots beat").toBeTruthy();
    expect(script.questions.connect.multi).toBe(true);
    // drivers → connect → scale
    expect(script.questions[script.entry].options.every((o) => o.next === "connect")).toBe(true);
    expect(script.questions.connect.options.every((o) => o.next === "scale")).toBe(true);
  });

  it("folds in EVERY chosen driver + connect moment (not just one)", () => {
    const answers: DiscoveryAnswers = {
      [`${G}:drivers:burden`]: "1",
      [`${G}:drivers:workload`]: "1",
      [`${G}:connect:afterShift`]: "1",
      [`${G}:connect:breaks`]: "1",
    };
    const r = resolveResult(S, G, answers)!;
    // both drivers AND both connect moments land in the receipt narrative
    expect(r.narrative.some((n) => /past the end of the shift/.test(n))).toBe(true);
    expect(r.narrative.some((n) => /workload and ratios/.test(n))).toBe(true);
    expect(r.narrative.some((n) => /after the shift ends/.test(n))).toBe(true);
    expect(r.narrative.some((n) => /skip breaks/.test(n))).toBe(true);
    // a documentation driver was named → proof handoff fires, not an honest wipe
    expect(r.proofDriverId).toBe("nursingRetention");
  });

  it("a documentation driver survives even when an honest-out is ALSO picked", () => {
    const answers: DiscoveryAnswers = {
      [`${G}:drivers:burden`]: "1",
      [`${G}:drivers:paylife`]: "1",
    };
    const r = resolveResult(S, G, answers)!;
    expect(r.honest, "an honest-out was picked").toBe(true);
    expect(r.proofDriverId, "the documentation case still holds").toBe("nursingRetention");
  });

  it("honest-out ALONE stays honest with no counted lever", () => {
    const r = resolveResult(S, G, { [`${G}:drivers:paylife`]: "1" })!;
    expect(r.honest).toBe(true);
    expect(r.lever).toBeUndefined();
  });
});

describe("inpatient revenue multi-select (several plays at once)", () => {
  it("carries BOTH levers when DRG weight AND status are picked (handoff enables both)", () => {
    const r = resolveResult("inpatient" as AttainSetting, "revenue" as GoalId, {
      "revenue:drivers:drg": "1",
      "revenue:drivers:obs": "1",
    })!;
    const ids = r.levers.map((l) => l.driverId).sort();
    expect(ids).toEqual(["drgAccuracy", "obsDefense"]);
    expect(r.lever?.driverId, "primary lever = first picked").toBe("drgAccuracy");
  });

  it("the CDI query load stays a proof-play, not a counted lever, even alongside DRG", () => {
    const r = resolveResult("inpatient" as AttainSetting, "revenue" as GoalId, {
      "revenue:drivers:drg": "1",
      "revenue:drivers:cdi": "1",
    })!;
    expect(r.levers.map((l) => l.driverId)).toEqual(["drgAccuracy"]); // cdi adds proof, not a lever
    expect(r.proof, "cdi contributes a proof line").toBeTruthy();
  });
});

describe("F3 honesty: drivers documentation doesn't move carry no counted lever", () => {
  it("outpatient access no-shows is an honest-out, not a net-new-visit lever", () => {
    const noshow = DISCOVERY.outpatient!.access!.questions.drivers.options.find((o) => o.id === "noshow")!;
    expect(noshow.honest, "no-shows should be honest").toBe(true);
    expect(noshow.lever, "ambient does not reduce no-shows").toBeUndefined();
  });
  it("ED access front-end intake/triage and provider staffing are honest-outs, not LWBS levers", () => {
    const opts = DISCOVERY.ed!.access!.questions.drivers.options;
    for (const id of ["frontend", "provider"]) {
      const o = opts.find((x) => x.id === id)!;
      expect(o.honest, `${id} should be honest`).toBe(true);
      expect(o.lever, `${id} is not documentation's to move`).toBeUndefined();
    }
    // the charting load on providers REMAINS the real lever
    const docload = opts.find((o) => o.id === "docload")!;
    expect(docload.lever?.driverId).toBe("lwbsRecovery");
  });
});

describe("discovery integrity", () => {
  it("has at least the two flagship scripts", () => {
    expect(DISCOVERY.outpatient?.access).toBeTruthy();
    expect(DISCOVERY.outpatient?.revenue).toBeTruthy();
  });

  it("retention is proof-first everywhere: proofDriverId, never a counted lever", () => {
    for (const setting of SETTINGS) {
      const s = DISCOVERY[setting]?.retention;
      if (!s) continue;
      const nonHonest = s.questions[s.entry].options.filter((o) => !o.honest);
      expect(nonHonest.length, `${setting} retention has no non-honest option`).toBeGreaterThan(0);
      for (const o of nonHonest) {
        expect(o.lever, `${setting} retention pins a COUNTED lever`).toBeUndefined();
        expect(o.proofDriverId, `${setting} retention missing proofDriverId (handoff would no-op)`).toBeTruthy();
      }
    }
  });

  for (const { setting, goal, script } of scripts()) {
    describe(`${setting} · ${goal}`, () => {
      it("entry resolves and every option.next targets a real question or BRIEF", () => {
        expect(script.questions[script.entry], "entry question missing").toBeTruthy();
        for (const [qid, q] of Object.entries(script.questions)) {
          expect(q.options.length, `${qid} has no options`).toBeGreaterThan(0);
          const ids = new Set(q.options.map((o) => o.id));
          expect(ids.size, `${qid} has duplicate option ids`).toBe(q.options.length);
          for (const o of q.options) {
            if (o.next !== BRIEF) {
              expect(script.questions[o.next], `${qid} → ${o.id} points at missing question "${o.next}"`).toBeTruthy();
            }
          }
        }
      });

      it("no orphan questions (all reachable from entry)", () => {
        const seen = new Set<string>();
        const stack = [script.entry];
        while (stack.length) {
          const id = stack.pop()!;
          if (seen.has(id)) continue;
          seen.add(id);
          for (const o of script.questions[id].options) if (o.next !== BRIEF && !seen.has(o.next)) stack.push(o.next);
        }
        const orphans = Object.keys(script.questions).filter((id) => !seen.has(id));
        expect(orphans, `orphan questions: ${orphans.join(", ")}`).toEqual([]);
      });

      it("every path terminates in BRIEF within the question cap, with no loops", () => {
        const walk = (qid: string, onPath: string[]) => {
          expect(onPath.includes(qid), `loop through "${qid}"`).toBe(false);
          expect(onPath.length + 1, `a path exceeds ${MAX_QUESTIONS} questions`).toBeLessThanOrEqual(MAX_QUESTIONS);
          const q = script.questions[qid];
          for (const o of q.options) {
            if (o.next === BRIEF) continue;
            walk(o.next, [...onPath, qid]);
          }
        };
        walk(script.entry, []);
      });

      it("every pinned lever is a real Explore driver", () => {
        for (const q of Object.values(script.questions)) {
          for (const o of q.options) {
            if (o.lever) {
              expect(VALID_LEVERS.has(o.lever.driverId), `lever "${o.lever.driverId}" is not a real Explore driver`).toBe(true);
            }
          }
        }
      });

      it("points at real money: pins a lever on some path, or is a declared proof-play", () => {
        const pinsLever = Object.values(script.questions).some((q) => q.options.some((o) => !!o.lever || !!o.proof));
        expect(pinsLever || !!script.proofLine, "no lever/proof pinned and no proofLine set").toBe(true);
      });

      it("the authored brief renders real copy for every branch (first-option and last-option walks)", () => {
        // walk picking a chosen index at each question; assert the thesis + roles are non-empty
        const walk = (pickIdx: (n: number) => number): DiscoveryAnswers => {
          const answers: DiscoveryAnswers = {};
          let qid: string | typeof BRIEF = script.entry;
          const guard = new Set<string>();
          while (qid !== BRIEF && !guard.has(qid)) {
            guard.add(qid);
            const q = script.questions[qid];
            const opt = q.options[pickIdx(q.options.length)];
            if (q.multi) answers[`${goal}:${qid}:${opt.id}`] = "1";
            else answers[`${goal}:${qid}`] = opt.id;
            qid = opt.next;
          }
          return answers;
        };
        for (const answers of [walk(() => 0), walk((n) => n - 1)]) {
          const thesis = briefThesis(setting, goal, "Test Partner", answers);
          expect(thesis.trim().length, "empty thesis").toBeGreaterThan(20);
          expect(briefRoles(setting, goal).length, "no roles").toBeGreaterThan(0);
        }
      });

      it("an honest-out answer never leaves a COUNTED lever (honesty guard)", () => {
        // enumerate every root-to-BRIEF path; an honest path must not resolve a lever
        const paths: DiscoveryAnswers[] = [];
        const walk = (qid: string, acc: DiscoveryAnswers) => {
          const q = script.questions[qid];
          for (const o of q.options) {
            const next = { ...acc, ...(q.multi ? { [`${goal}:${qid}:${o.id}`]: "1" } : { [`${goal}:${qid}`]: o.id }) };
            if (o.next === BRIEF) paths.push(next);
            else walk(o.next, next);
          }
        };
        walk(script.entry, {});
        for (const answers of paths) {
          const r = resolveResult(setting, goal, answers)!;
          if (r.honest) expect(r.lever, `an honest-out path still counts a lever in ${setting}/${goal}`).toBeUndefined();
        }
      });
    });
  }
});
