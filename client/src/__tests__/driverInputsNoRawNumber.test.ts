import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

/**
 * Regression guard for the "can't clear the field" bug.
 *
 * A raw `<input type="number" value={n} onChange={parseFloat(e)||N}>` re-coerces the
 * empty string to a number on every keystroke, so the field can never be emptied to
 * retype. Every numeric text input in the Explore driver cards must go through
 * <NumberField> (or <FormattedNumberInput>) instead. `type="range"` sliders are fine.
 */
const DRIVERS_DIR = join(__dirname, "..", "components", "explore", "drivers");

describe("Explore driver cards never use raw type=number inputs", () => {
  const files = readdirSync(DRIVERS_DIR).filter((f) => f.endsWith(".tsx"));

  it("finds the driver card files (sanity)", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  for (const file of files) {
    it(`${file} has no raw <input type="number">`, () => {
      const src = readFileSync(join(DRIVERS_DIR, file), "utf8");
      expect(
        src.includes('type="number"'),
        `${file} still has a raw type="number" input — route it through <NumberField> so it can be cleared`,
      ).toBe(false);
    });
  }
});
