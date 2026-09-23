import { useState, useRef, useCallback, useLayoutEffect } from "react";
import {
  sanitizeNumericDraft,
  parseNumericDraft,
  clampNumber,
  displayValue,
  formatGrouped,
  groupDraft,
  caretForDigits,
} from "@/lib/numberFieldLogic";

export interface NumberFieldProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange" | "min" | "max"
  > {
  value: number;
  onValueChange: (value: number) => void;
  /** Lower bound, applied on blur (commit) only. */
  min?: number;
  /** Upper bound, applied on blur (commit) only. */
  max?: number;
  /** Allow a decimal point. Default true. */
  decimal?: boolean;
}

/**
 * A numeric text input you can actually clear, with live thousand separators.
 *
 * Drop-in replacement for the `<input type="number" value={n} onChange={parseFloat||N}>`
 * pattern, which forces a digit back into the box on every keystroke and so can never be
 * emptied to retype. NumberField keeps the typed text as the source of truth while focused,
 * derives the numeric value from it, groups the draft with commas as you type (restoring the
 * caret so it never jumps), and clamps to [min, max] only on blur.
 */
export function NumberField({
  value,
  onValueChange,
  min,
  max,
  decimal = true,
  onFocus,
  onBlur,
  ...rest
}: NumberFieldProps) {
  // While focused, the typed text (grouped for display) is the source of truth so it can be
  // cleared or partial. While unfocused, the box shows the external value with separators.
  const [draft, setDraft] = useState<string>("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  // Numeric characters before the caret at the last keystroke, so we can put the caret back
  // in the same spot after commas shift the string.
  const pendingCaretDigits = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!focused || pendingCaretDigits.current === null || !ref.current) return;
    const pos = caretForDigits(draft, pendingCaretDigits.current);
    ref.current.setSelectionRange(pos, pos);
    pendingCaretDigits.current = null;
  }, [draft, focused]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.currentTarget.value;
      const caret = e.currentTarget.selectionStart ?? raw.length;
      pendingCaretDigits.current = raw.slice(0, caret).replace(/[^0-9.]/g, "").length;
      const sanitized = sanitizeNumericDraft(raw, { decimal });
      setDraft(groupDraft(sanitized));
      onValueChange(parseNumericDraft(sanitized));
    },
    [decimal, onValueChange],
  );

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      setDraft(groupDraft(displayValue(value))); // start editing from the grouped digits
      onFocus?.(e);
    },
    [value, onFocus],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      const committed = clampNumber(parseNumericDraft(sanitizeNumericDraft(draft, { decimal })), min, max);
      if (committed !== value) onValueChange(committed);
      onBlur?.(e);
    },
    [draft, decimal, min, max, value, onValueChange, onBlur],
  );

  return (
    <input
      ref={ref}
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      value={focused ? draft : formatGrouped(value)}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      autoComplete="off"
      {...rest}
    />
  );
}

export interface NullableNumberFieldProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange" | "min" | "max"
  > {
  /** null means "not answered yet" — distinct from 0, which is a real answer. */
  value: number | null;
  onValueChange: (value: number | null) => void;
  /** Lower bound, applied on blur (commit) only. */
  min?: number;
  /** Upper bound, applied on blur (commit) only. */
  max?: number;
  /** Allow a decimal point. Default true. */
  decimal?: boolean;
}

/**
 * {@link NumberField} for the screens where blank is a meaningful answer.
 *
 * Data-entry steps distinguish "they have not told us yet" (render the em-dash
 * placeholder, exclude from the maths) from "they told us zero". NumberField
 * collapses both to 0, so those screens each hand-rolled their own input — and
 * every hand-rolled one grouped on blur at best, so a six-figure replacement
 * cost typed as 180000 stayed bare until you clicked away. Same grouping and
 * caret handling as NumberField; only the empty case differs.
 */
export function NullableNumberField({
  value,
  onValueChange,
  min,
  max,
  decimal = true,
  onFocus,
  onBlur,
  ...rest
}: NullableNumberFieldProps) {
  const [draft, setDraft] = useState<string>("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const pendingCaretDigits = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!focused || pendingCaretDigits.current === null || !ref.current) return;
    const pos = caretForDigits(draft, pendingCaretDigits.current);
    ref.current.setSelectionRange(pos, pos);
    pendingCaretDigits.current = null;
  }, [draft, focused]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.currentTarget.value;
      const caret = e.currentTarget.selectionStart ?? raw.length;
      pendingCaretDigits.current = raw.slice(0, caret).replace(/[^0-9.]/g, "").length;
      const sanitized = sanitizeNumericDraft(raw, { decimal });
      setDraft(groupDraft(sanitized));
      // An emptied box is "unanswered" again, not zero — otherwise clearing a
      // field silently commits a 0 into the model.
      onValueChange(sanitized === "" ? null : parseNumericDraft(sanitized));
    },
    [decimal, onValueChange],
  );

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      setDraft(value === null ? "" : groupDraft(String(value)));
      onFocus?.(e);
    },
    [value, onFocus],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      const sanitized = sanitizeNumericDraft(draft, { decimal });
      const committed =
        sanitized === "" ? null : clampNumber(parseNumericDraft(sanitized), min, max);
      if (committed !== value) onValueChange(committed);
      onBlur?.(e);
    },
    [draft, decimal, min, max, value, onValueChange, onBlur],
  );

  return (
    <input
      ref={ref}
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      value={focused ? draft : groupedOrBlank(value)}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      autoComplete="off"
      {...rest}
    />
  );
}

/**
 * Grouped display for a nullable value. Only `null` blanks the box:
 * {@link formatGrouped} renders 0 as "" (right for NumberField, where 0 IS the
 * empty state), but here a typed 0 is an answer the user gave and must show.
 */
function groupedOrBlank(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "";
  if (value === 0) return "0";
  return formatGrouped(value);
}
