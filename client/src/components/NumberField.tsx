import { useState, useRef, useCallback } from "react";
import {
  sanitizeNumericDraft,
  parseNumericDraft,
  clampNumber,
  displayValue,
  formatGrouped,
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
 * A numeric text input you can actually clear.
 *
 * Drop-in replacement for the `<input type="number" value={n} onChange={parseFloat||N}>`
 * pattern, which forces a digit back into the box on every keystroke and so can never be
 * emptied to retype. NumberField keeps the typed text as the source of truth while focused,
 * derives the numeric value from it, and clamps to [min, max] only on blur. It renders a
 * bare <input>, so the same className lands identical pixels — nothing moves visually.
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
  // While focused, the typed text is the source of truth (so it can be cleared / partial).
  // While unfocused, the box shows the external value with thousand separators.
  const [draft, setDraft] = useState<string>("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = sanitizeNumericDraft(e.target.value, { decimal });
      setDraft(next);
      onValueChange(parseNumericDraft(next));
    },
    [decimal, onValueChange],
  );

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      setDraft(displayValue(value)); // start editing from the raw, ungrouped digits
      onFocus?.(e);
    },
    [value, onFocus],
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      const committed = clampNumber(parseNumericDraft(draft), min, max);
      if (committed !== value) onValueChange(committed);
      onBlur?.(e);
    },
    [draft, min, max, value, onValueChange, onBlur],
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
