import { describe, it, expect } from "vitest";
import { ATTAIN_MATRIX } from "@/pages/attain/preview/attainCells";
describe("Every Align outcome has a Plan metric group", () => {
  for (const cell of ATTAIN_MATRIX) {
    if (cell.proofOnly) continue;
    it(`${cell.setting}·${cell.category}`, () => {
      const groups = new Set(cell.plan.outcomeGroups.map((g) => g.outcome));
      const missing = cell.align.outcomes.filter((o) => !groups.has(o.title)).map((o) => o.title);
      expect(missing, `missing: ${missing.join(", ")}`).toHaveLength(0);
    });
  }
});
