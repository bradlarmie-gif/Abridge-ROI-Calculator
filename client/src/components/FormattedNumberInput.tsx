import { useState, useEffect } from 'react';

interface FormattedNumberInputProps {
  value: number | string;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  'data-testid'?: string;
}

function formatWithCommas(value: number | string): string {
  if (value === '' || value === 0) return '';
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US');
}

function parseFormattedNumber(value: string): number {
  // Only allow digits
  const cleaned = value.replace(/[^\d]/g, '');
  if (!cleaned) return 0;
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

export function FormattedNumberInput({
  value,
  onChange,
  placeholder,
  className,
  min,
  max,
  'data-testid': testId
}: FormattedNumberInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatWithCommas(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatWithCommas(value));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Only allow digits (no decimals, no dashes, no other characters)
    const digitsOnly = input.replace(/[^\d]/g, '');
    setDisplayValue(digitsOnly);
    
    let numValue = parseFormattedNumber(digitsOnly);
    if (min !== undefined && numValue < min) numValue = min;
    if (max !== undefined && numValue > max) numValue = max;
    onChange(numValue);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setDisplayValue(formatWithCommas(value));
  };

  const handleFocus = () => {
    setIsFocused(true);
    const numValue = typeof value === 'number' ? value : parseFormattedNumber(String(value));
    setDisplayValue(numValue > 0 ? String(numValue) : '');
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      data-testid={testId}
    />
  );
}
