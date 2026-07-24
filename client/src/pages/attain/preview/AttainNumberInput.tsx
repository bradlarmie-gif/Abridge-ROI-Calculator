import { useCallback, useRef } from "react";

/**
 * THROWAWAY. Minimal number input for the Attain preview: matches the editorial
 * borderless fields (takes className), formats the integer part with thousands
 * commas live (cursor preserved), keeps decimals as typed, and clears cleanly.
 * Stores the raw digit string (no commas) via onChange; num()/pnum parse it fine.
 */

function commafy(raw: string): string {
  if (raw === "") return "";
  const cleaned = raw.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  const intPart = dot >= 0 ? cleaned.slice(0, dot) : cleaned;
  const decPart = dot >= 0 ? cleaned.slice(dot + 1) : null;
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== null ? `${withCommas}.${decPart}` : withCommas;
}

export function AttainNumberInput({
  value, onChange, onBlur, className, placeholder, style,
}: {
  value: string; // the raw stored string (digits, optional dot — no commas)
  onChange: (raw: string) => void;
  onBlur?: () => void;
  className?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const display = commafy(value);

  const handle = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cursor = e.target.selectionStart ?? raw.length;
    const cleaned = raw.replace(/[^\d.]/g, "");
    onChange(cleaned);
    const formatted = commafy(cleaned);
    const digitsBefore = raw.slice(0, cursor).replace(/[^\d.]/g, "").length;
    let pos = 0, count = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (formatted[i] !== ",") count++;
      if (count === digitsBefore) { pos = i + 1; break; }
    }
    if (count < digitsBefore) pos = formatted.length;
    requestAnimationFrame(() => {
      if (ref.current && document.activeElement === ref.current) ref.current.setSelectionRange(pos, pos);
    });
  }, [onChange]);

  return (
    <input ref={ref} inputMode="decimal" value={display} onChange={handle} onBlur={onBlur} placeholder={placeholder} className={className} style={style} />
  );
}
