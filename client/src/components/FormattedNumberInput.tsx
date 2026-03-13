import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';

interface FormattedNumberInputProps {
  value: number | '';
  onChange: (value: number) => void;
  onBlurValue?: (value: number) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  step?: number;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  'data-testid'?: string;
}

function formatWithCommas(num: number, decimals: number = 0): string {
  if (num === 0) return '';
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
  onBlurValue,
  onFocus: externalOnFocus,
  onBlur: externalOnBlur,
  step = 1,
  className = '',
  style,
  placeholder = '',
  'data-testid': testId
}: FormattedNumberInputProps) {
  const decimals = step < 1 ? Math.ceil(-Math.log10(step)) : 0;
  const numValue = value === '' ? 0 : value;
  const [displayValue, setDisplayValue] = useState(() => value === '' || value === 0 ? '' : formatWithCommas(numValue, decimals));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFocused) return;
    const currentParsed = parseFormattedNumber(displayValue);
    if (currentParsed !== numValue) {
      setDisplayValue(value === '' || value === 0 ? '' : formatWithCommas(numValue, decimals));
    }
  }, [value, decimals, numValue, isFocused, displayValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawValue = input.value;
    const cursorPos = input.selectionStart || 0;

    const digitsOnly = rawValue.replace(/[^\d.]/g, '');

    const parts = digitsOnly.split('.');
    const integerPart = parts[0] || '';
    const decimalPart = parts[1];

    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formatted = decimalPart !== undefined
      ? `${formattedInteger}.${decimalPart}`
      : formattedInteger;

    const rawDigitsBefore = rawValue.slice(0, cursorPos).replace(/[^\d.]/g, '').length;
    let newCursorPos = 0;
    let digitCount = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (formatted[i] !== ',') {
        digitCount++;
      }
      if (digitCount === rawDigitsBefore) {
        newCursorPos = i + 1;
        break;
      }
    }
    if (digitCount < rawDigitsBefore) {
      newCursorPos = formatted.length;
    }

    setDisplayValue(formatted);

    requestAnimationFrame(() => {
      if (inputRef.current && document.activeElement === inputRef.current) {
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    });

    const parsed = parseFormattedNumber(formatted);
    onChange(parsed);
  }, [onChange]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    const parsed = parseFormattedNumber(displayValue);
    setDisplayValue(parsed === 0 ? '' : formatWithCommas(parsed, decimals));
    if (onBlurValue) {
      onBlurValue(parsed);
    }
    if (externalOnBlur) {
      externalOnBlur(e);
    }
  }, [displayValue, decimals, onBlurValue, externalOnBlur]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setTimeout(() => {
      e.target.select();
    }, 0);
    if (externalOnFocus) {
      externalOnFocus(e);
    }
  }, [externalOnFocus]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setDisplayValue(value === '' || value === 0 ? '' : formatWithCommas(numValue, decimals));
      inputRef.current?.blur();
    }
  }, [value, numValue, decimals]);

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
      style={style}
      placeholder={placeholder}
      data-testid={testId}
      autoComplete="off"
    />
  );
}
