import { describe, it, expect } from "vitest";
import { DISCOVERY, BRIEF, briefThesis, briefRoles, type DiscoveryScript, type DiscoveryAnswers } from "@/lib/attain/discovery";
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

describe("discovery integrity", () => {
  it("has at least the two flagship scripts", () => {
    expect(DISCOVERY.outpatient?.access).toBeTruthy();
    expect(DISCOVERY.outpatient?.revenue).toBeTruthy();
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
            answers[`${goal}:${qid}`] = opt.id;
            qid = opt.next;
          }
          return answers;
        };
        for (const answers of [walk(() => 0), walk((n) => n - 1)]) {
          const thesis = briefThesis(setting, goal, "Test Partner", answers);
          expect(thesis.trim().length, "empty thesis").toBeGreaterThan(20);
          expect(briefRoles(setting, goal, "Test Partner", answers).length, "no roles").toBeGreaterThan(0);
        }
      });
    });
  }
});
