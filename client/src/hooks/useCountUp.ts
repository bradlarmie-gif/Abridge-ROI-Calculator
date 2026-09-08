import { useEffect, useRef, useState } from "react";

/**
 * Eases a number from its previous value to its new one, so a total that
 * changes is seen to change rather than just being different.
 *
 * Shared by both walks: the practice path's pinned running total and the one
 * provider's pin. It lived inside QuickRoiCalculator until the second caller
 * appeared; copying it would have been the moment the two screens started
 * animating at different speeds for no reason.
 */
export function useCountUp(value: number, ms = 550): number {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number>();
  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(from + (value - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, ms]);
  return shown;
}
