import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';

interface FormattedNumberInputProps {
  value: number | '';
  onChange: (value: number) => void;
  step?: number;
  className?: string;
  placeholder?: string;
  'data-testid'?: string;
}

function formatWithCommas(num: number, decimals: number = 0): string {
  if (decimals > 0) {
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  return num.toLocaleString('en-US');
}

function parseFormattedNumber(str: string): number {
  const cleaned = str.replace(/,/g, '').replace(/[^\d.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return 0;
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function FormattedNumberInput({
  value,
  onChange,
  step = 1,
  className = '',
  placeholder = '',
  'data-testid': testId
}: FormattedNumberInputProps) {
  const decimals = step < 1 ? Math.ceil(-Math.log10(step)) : 0;
  const numValue = value === '' ? 0 : value;
  const [displayValue, setDisplayValue] = useState(() => value === '' || value === 0 ? '' : formatWithCommas(numValue, decimals));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value === '' || value === 0 ? '' : formatWithCommas(numValue, decimals));
    }
  }, [value, isFocused, decimals, numValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);
    
    const parsed = parseFormattedNumber(raw);
    onChange(parsed);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFormattedNumber(displayValue);
    setDisplayValue(formatWithCommas(parsed, decimals));
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Show raw number for editing
    setDisplayValue(value === '' || value === 0 ? '' : value.toString());
    // Select all on next tick so user can easily replace
    setTimeout(() => {
      e.target.select();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setDisplayValue(value === '' || value === 0 ? '' : formatWithCommas(numValue, decimals));
      inputRef.current?.blur();
    }
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
      onKeyDown={handleKeyDown}
      className={className}
      placeholder={placeholder}
      data-testid={testId}
      autoComplete="off"
    />
  );
}
