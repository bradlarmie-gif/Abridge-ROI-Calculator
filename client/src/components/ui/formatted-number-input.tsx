import { useState, useEffect, useCallback } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface FormattedNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  "data-testid"?: string;
  disabled?: boolean;
}

export function FormattedNumberInput({
  value,
  onChange,
  className,
  min,
  max,
  step,
  placeholder,
  "data-testid": dataTestId,
  disabled,
}: FormattedNumberInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState(value === 0 ? "" : value.toLocaleString("en-US"));

  // Format number with commas (empty string for 0 to allow clearing)
  const formatWithCommas = useCallback((num: number): string => {
    if (num === 0) return "";
    return num.toLocaleString("en-US");
  }, []);

  // Update display value when external value changes and not focused
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatWithCommas(value));
    }
  }, [value, isFocused, formatWithCommas]);

  const handleFocus = () => {
    setIsFocused(true);
    // Show raw number without commas when focused (empty for 0)
    setDisplayValue(value === 0 ? "" : value.toString());
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Parse the value and update
    const parsed = parseFloat(displayValue.replace(/,/g, "")) || 0;
    const clamped = clampValue(parsed);
    onChange(clamped);
    setDisplayValue(formatWithCommas(clamped));
  };

  const clampValue = (val: number): number => {
    let result = val;
    if (min !== undefined && result < min) result = min;
    if (max !== undefined && result > max) result = max;
    return result;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Allow only numbers and decimal point while typing
    if (/^[0-9]*\.?[0-9]*$/.test(rawValue) || rawValue === "") {
      setDisplayValue(rawValue);
    }
  };

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn("font-mono", className)}
      placeholder={placeholder}
      data-testid={dataTestId}
      disabled={disabled}
    />
  );
}
