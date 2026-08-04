import { describe, it, expect } from "vitest";
import { ATTAIN_MATRIX } from "@/pages/attain/preview/attainCells";
import { econModel } from "@/pages/attain/preview/attainEconomics";

/**
 * The Align Bar (docs/attain-align-bar.md) caps a walk at 8 questions: each one a thing you'd
 * want to know to get in lock step, never a form. This mirrors AlignView's SectionHead numbering
 * so it counts exactly what a partner sees. Discovery walks are counted per CONVERSATION (the
 * shared frame + one mechanism population + the leak/proof/unlock bookends), since each mechanism
 * is its own conversation separated by a divider.
 */

function fixedMiddleCount(cell: (typeof ATTAIN_MATRIX)[number]): number {
  const a = cell.align;
  const key = cell.category;
  let n = 0;
  n += (a.choices ?? []).filter((q) => q.stage === "frame").length; // frame choices (revenue only)
  n += 1; // outcomes
  if (a.segments) n += 1;
  n += (a.choices ?? []).filter((q) => q.stage !== "frame").length; // non-frame choices (the gate)
  if (a.trend) n += 1;
  if (a.scope) n += 1;
  if (!a.noPlayBeat && a.outcomes.some((o) => o.plays)) n += 1; // the play beat (unless suppressed)
  if (econModel(cell.setting, key)) n += 1; // the stance beat ("how far you'll push")
  n += 3; // leak + proof + unlock
  return n;
}

function discoveryConversationMax(cell: (typeof ATTAIN_MATRIX)[number]): number {
  const a = cell.align;
  if (!a.discovery) return 0;
  const frame = (a.choices ?? []).filter((q) => q.stage === "frame").length;
  const perPop = a.discovery.populations.map((pop) =>
    // non-withStance economics beats render nothing (their seeds surface under the sibling stance)
    pop.beats.filter((b) => !(b.kind === "economics" && !(b as { withStance?: boolean }).withStance)).length,
  );
  const maxPop = perPop.length ? Math.max(...perPop) : 0;
  return frame + maxPop + 3; // + leak + proof + unlock
}

function beatCount(cell: (typeof ATTAIN_MATRIX)[number]): number {
  return cell.align.discovery ? discoveryConversationMax(cell) : fixedMiddleCount(cell);
}

describe("Align Bar: ≤ 8 questions per walk", () => {
  for (const cell of ATTAIN_MATRIX) {
    it(`${cell.setting} · ${cell.category} is ≤ 8 beats`, () => {
      const n = beatCount(cell);
      // eslint-disable-next-line no-console
      if (n > 8) console.log(`OVER: ${cell.setting} · ${cell.category} = ${n}`);
      expect(n, `${cell.setting} · ${cell.category} has ${n} beats`).toBeLessThanOrEqual(8);
    });
  }
});
