/**
 * Pure controller logic for {@link NumberField}.
 *
 * A raw `<input type="number" value={n}>` whose onChange does `parseFloat(e) || N`
 * can never be cleared: the empty string is re-coerced to a number on every
 * keystroke and React renders that number straight back into the box, so one
 * digit is always stuck. The fix is to keep the typed text ("draft") as the
 * source of truth while editing, derive the numeric value from it without ever
 * writing the number back into the draft, and clamp to bounds only on commit.
 */

export interface SanitizeOptions {
  /** Allow a decimal point. Default true. When false, only digits survive. */
  decimal?: boolean;
}

/** Strip everything that isn't part of a number, keeping at most one decimal point. */
export function sanitizeNumericDraft(raw: string, opts: SanitizeOptions = {}): string {
  const decimal = opts.decimal ?? true;
  if (!decimal) return raw.replace(/[^0-9]/g, "");

  let s = raw.replace(/[^0-9.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    // keep the first dot, drop any later ones
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  return s;
}

/** Derive the numeric value from a (possibly empty / partial) draft. Empty → 0. */
export function parseNumericDraft(draft: string): number {
  if (draft === "" || draft === ".") return 0;
  const n = parseFloat(draft);
  return isNaN(n) ? 0 : n;
}

/** Bound a number to [min, max]. Applied on commit (blur) only — never per keystroke. */
export function clampNumber(n: number, min?: number, max?: number): number {
  let v = n;
  if (min !== undefined) v = Math.max(min, v);
  if (max !== undefined) v = Math.min(max, v);
  return v;
}

/** Raw (ungrouped) string for editing: empty for 0/blank, the literal number otherwise. */
export function displayValue(value: number): string {
  // Guard undefined/null/NaN/Infinity — state can lag the type, and we must never render "undefined".
  if (!value || !Number.isFinite(value)) return "";
  return String(value);
}

/**
 * Pretty display for when the field is NOT focused: empty for 0, otherwise the number
 * with thousand separators (decimals preserved). Editing always works against the raw
 * {@link displayValue}, so grouping never gets in the way of clearing or typing.
 */
export function formatGrouped(value: number): string {
  // Guard undefined/null/NaN/Infinity so a lagging value can never crash toLocaleString.
  if (!value || !Number.isFinite(value)) return "";
  return value.toLocaleString("en-US", { maximumFractionDigits: 20 });
}
