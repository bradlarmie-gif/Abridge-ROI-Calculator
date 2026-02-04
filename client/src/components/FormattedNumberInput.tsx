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

function formatAsYouType(input: string): string {
  // Remove all non-digit characters except decimal point
  const cleaned = input.replace(/[^\d.]/g, '');
  
  // Handle decimal numbers
  const parts = cleaned.split('.');
  const integerPart = parts[0] || '';
  const decimalPart = parts[1];
  
  // Add commas to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Combine with decimal if present
  if (decimalPart !== undefined) {
    return `${formattedInteger}.${decimalPart}`;
  }
  return formattedInteger;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<number>(0);

  useEffect(() => {
    // Only update display if value changed externally (not from user typing)
    const currentParsed = parseFormattedNumber(displayValue);
    if (currentParsed !== numValue) {
      setDisplayValue(value === '' || value === 0 ? '' : formatWithCommas(numValue, decimals));
    }
  }, [value, decimals, numValue]);

  // Restore cursor position after formatting
  useEffect(() => {
    if (inputRef.current && document.activeElement === inputRef.current) {
      inputRef.current.setSelectionRange(cursorRef.current, cursorRef.current);
    }
  }, [displayValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawValue = input.value;
    const cursorPos = input.selectionStart || 0;
    
    // Count commas before cursor in old value
    const oldCommasBefore = (displayValue.slice(0, cursorPos).match(/,/g) || []).length;
    
    // Format the new value with commas as user types
    const formatted = formatAsYouType(rawValue);
    
    // Count commas before cursor position in new value
    const digitsBeforeCursor = rawValue.slice(0, cursorPos).replace(/[^\d.]/g, '').length;
    let newCursorPos = 0;
    let digitCount = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (formatted[i] !== ',') {
        digitCount++;
      }
      if (digitCount === digitsBeforeCursor) {
        newCursorPos = i + 1;
        break;
      }
    }
    if (digitCount < digitsBeforeCursor) {
      newCursorPos = formatted.length;
    }
    
    cursorRef.current = newCursorPos;
    setDisplayValue(formatted);
    
    const parsed = parseFormattedNumber(formatted);
    onChange(parsed);
  };

  const handleBlur = () => {
    const parsed = parseFormattedNumber(displayValue);
    setDisplayValue(parsed === 0 ? '' : formatWithCommas(parsed, decimals));
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Select all on focus for easy replacement
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
