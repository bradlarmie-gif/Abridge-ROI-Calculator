import { describe, it, expect } from "vitest";
import {
  sanitizeNumericDraft,
  parseNumericDraft,
  clampNumber,
  displayValue,
  formatGrouped,
} from "@/lib/numberFieldLogic";

/**
 * The bug: raw `<input type="number" value={n} onChange={parseFloat(e)||N}>` re-coerces
 * the empty string back to a number on every keystroke, so the field can never be
 * cleared — there's always one digit stuck (a forced 1, or a stuck 0).
 *
 * These pure functions are the controller behind NumberField. They encode the fix:
 * an empty/partial draft is preserved as-typed, the numeric value is only derived
 * (never forced back into the draft), and min/max clamping happens on commit only.
 */
describe("numberFieldLogic — you can always clear the field", () => {
  it("sanitize preserves an empty string (the whole point — clearing must stick)", () => {
    expect(sanitizeNumericDraft("")).toBe("");
  });

  it("sanitize preserves a partial decimal mid-type (e.g. typing '1.' before the tenths)", () => {
    expect(sanitizeNumericDraft("1.")).toBe("1.");
    expect(sanitizeNumericDraft("0.")).toBe("0.");
  });

  it("sanitize strips non-numeric junk but keeps one decimal point", () => {
    expect(sanitizeNumericDraft("1a2b3")).toBe("123");
    expect(sanitizeNumericDraft("1.2.3")).toBe("1.23");
    expect(sanitizeNumericDraft("$200")).toBe("200");
  });

  it("sanitize with decimal:false keeps integers only", () => {
    expect(sanitizeNumericDraft("12.5", { decimal: false })).toBe("125");
  });

  it("parse maps an empty/partial draft to 0 WITHOUT mutating the draft", () => {
    expect(parseNumericDraft("")).toBe(0);
    expect(parseNumericDraft(".")).toBe(0);
    expect(parseNumericDraft("74")).toBe(74);
    expect(parseNumericDraft("1.5")).toBe(1.5);
  });

  it("clamp only bounds on commit; it is NEVER applied per keystroke", () => {
    expect(clampNumber(0, 1, 223)).toBe(1); // empty→0 floors to min=1 on blur
    expect(clampNumber(999, 1, 223)).toBe(223); // over max snaps down on blur
    expect(clampNumber(74, 1, 223)).toBe(74); // in-range untouched
    expect(clampNumber(5)).toBe(5); // no bounds → identity
  });

  it("display (raw, for editing) shows empty for 0, the literal number otherwise", () => {
    expect(displayValue(0)).toBe("");
    expect(displayValue(74)).toBe("74");
    expect(displayValue(1.5)).toBe("1.5");
  });

  it("grouped display (unfocused) adds thousand separators, preserves decimals, empty for 0", () => {
    expect(formatGrouped(0)).toBe("");
    expect(formatGrouped(74)).toBe("74"); // no separator under 1000
    expect(formatGrouped(50_000_000)).toBe("50,000,000");
    expect(formatGrouped(1234.5)).toBe("1,234.5");
    expect(formatGrouped(0.3)).toBe("0.3");
  });
});
