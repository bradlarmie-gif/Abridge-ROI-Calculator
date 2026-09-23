import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import {
  sanitizeNumericDraft,
  parseNumericDraft,
  clampNumber,
  formatGrouped,
  groupDraft,
  caretForDigits,
} from "@/lib/numberFieldLogic";

interface EditableNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  min?: number;
  max?: number;
  step?: number | string;
  "data-testid"?: string;
  disabled?: boolean;
}

/**
 * Editable number field with live thousand separators.
 *
 * This used to hold the typed text verbatim and gate every keystroke behind
 * `/^-?\d*\.?\d*$/`. That regex is why four-figure numbers came out bare: the
 * moment a comma was inserted the next keystroke's raw value contained one, the
 * guard rejected the whole change, and the field froze. So the only safe
 * behaviour was to never group at all, and a replacement cost read "180000".
 *
 * The draft is now SANITIZED rather than rejected, then grouped through the same
 * {@link groupDraft} / {@link caretForDigits} pair NumberField uses, so the
 * commas appear as you type and the caret stays next to the digit you typed.
 */
export function EditableNumberInput({
  value,
  onChange,
  className,
  min,
  max,
  step,
  "data-testid": dataTestId,
  disabled,
}: EditableNumberInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(() => formatGrouped(value));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Numeric characters before the caret at the last keystroke, so the caret can be
  // put back beside the same digit once inserted commas have shifted the string.
  const pendingCaretDigits = useRef<number | null>(null);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatGrouped(value));
    }
  }, [value, isFocused]);

  useLayoutEffect(() => {
    if (!isFocused || pendingCaretDigits.current === null || !inputRef.current) return;
    const pos = caretForDigits(displayValue, pendingCaretDigits.current);
    inputRef.current.setSelectionRange(pos, pos);
    pendingCaretDigits.current = null;
  }, [displayValue, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    // Keep the separators while editing: grouping is what the field is for, and
    // stripping them on focus makes the number visibly flicker as you click in.
    setDisplayValue(formatGrouped(value));
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseNumericDraft(sanitizeNumericDraft(displayValue));
    const clamped = clampNumber(parsed, min, max);
    onChange(clamped);
    setDisplayValue(formatGrouped(clamped));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.currentTarget.value;
    const caret = e.currentTarget.selectionStart ?? raw.length;
    pendingCaretDigits.current = raw.slice(0, caret).replace(/[^0-9.]/g, "").length;
    const sanitized = sanitizeNumericDraft(raw);
    setDisplayValue(groupDraft(sanitized));
    onChange(parseNumericDraft(sanitized));
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn("font-mono", className)}
      data-testid={dataTestId}
      disabled={disabled}
    />
  );
}
