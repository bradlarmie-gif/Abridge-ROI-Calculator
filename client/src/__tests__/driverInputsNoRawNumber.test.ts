import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

/**
 * Regression guard for two bugs with one cause.
 *
 * A raw `<input type="number" value={n} onChange={parseFloat(e)||N}>` re-coerces the
 * empty string to a number on every keystroke, so the field can never be emptied to
 * retype — AND no browser renders thousand separators in one, so a six-figure figure
 * reads "250000". Both go away by routing through <NumberField> / <NullableNumberField>
 * / <FormattedNumberInput>, which group as you type and can be cleared.
 *
 * The guard used to cover only the Explore driver cards. It missed ModelBuilder,
 * the Expand data-entry screens and the Measure intake form, which is how the
 * missing commas survived — so it now walks the whole client. `type="range"`
 * sliders are fine; so is Recharts' `type="number"` axis, which is not an input.
 */
const CLIENT_SRC = join(__dirname, "..");

/** Files with no live importer. Left as-is deliberately; not worth churn. */
const DEAD_CODE = [
  join("components", "EditableCalcRow.tsx"),
  join("pages", "SwitchPath.tsx"),
  join("pages", "switch", "SwitchAssessment.tsx"),
  join("pages", "switch", "SwitchFullAnalysis.tsx"),
  join("pages", "switch", "narrative-steps"),
];

function tsxFilesUnder(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "__tests__") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) tsxFilesUnder(full, acc);
    else if (entry.endsWith(".tsx")) acc.push(full);
  }
  return acc;
}

/**
 * `type="number"` only counts when it is on an <input>. Recharts spells a numeric
 * axis the same way (`<XAxis type="number">`), and that is not a text box.
 */
function rawNumberInputLines(src: string): number[] {
  // Blank out comments first, keeping newlines so reported line numbers stay true.
  // NumberField's own docstring quotes the anti-pattern it exists to replace, and
  // a guard that flags its own documentation is a guard people switch off.
  const code = src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (c) =>
    c.replace(/[^\n]/g, " "),
  );
  const hits: number[] = [];
  for (const match of code.matchAll(/<input\b[\s\S]*?>/g)) {
    if (!/type=["']number["']/.test(match[0])) continue;
    hits.push(code.slice(0, match.index).split("\n").length);
  }
  return hits;
}

describe("no raw type=number inputs anywhere in the client", () => {
  const files = tsxFilesUnder(CLIENT_SRC).filter(
    (f) => !DEAD_CODE.some((dead) => f.includes(dead)),
  );

  it("walks a realistic number of component files (sanity)", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  /**
   * The other half of the missing-comma bug.
   *
   * Numeric fields select-all on focus, deferred a tick so it survives the
   * browser's own focus handling. Unguarded, that defer races a click-then-type:
   * the select grabs the character just typed and the next keystroke replaces
   * it, so "2400" commits as "400". Three digits are not grouped, so the visible
   * symptom was a missing comma rather than lost input.
   *
   * selectAllOnFocus() holds the guard. Deferring a bare .select() anywhere else
   * reintroduces the race, so the pattern itself is what gets banned.
   */
  it("defers no unguarded .select() — use selectAllOnFocus()", () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (file.endsWith(join("lib", "selectOnFocus.ts"))) continue;
      const src = readFileSync(file, "utf8");
      const code = src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (c) =>
        c.replace(/[^\n]/g, " "),
      );
      for (const m of code.matchAll(/setTimeout\([\s\S]{0,120}?\.select\(\)/g)) {
        offenders.push(
          `${file.replace(CLIENT_SRC, "client/src")}:${code.slice(0, m.index).split("\n").length}`,
        );
      }
    }
    expect(
      offenders,
      `deferred .select() found — call selectAllOnFocus(el) instead, or it will ` +
        `eat the first character the user types:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  it("finds no <input type=\"number\"> in any live file", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const line of rawNumberInputLines(src)) {
        offenders.push(`${file.replace(CLIENT_SRC, "client/src")}:${line}`);
      }
    }
    expect(
      offenders,
      `raw <input type="number"> found — route these through <NumberField>, ` +
        `<NullableNumberField> or <FormattedNumberInput> so they group with commas ` +
        `and can be cleared:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });
});
