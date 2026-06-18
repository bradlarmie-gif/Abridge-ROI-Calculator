import { useEffect, useRef, useState } from "react";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Smooth count-up that interpolates from previous value (not 0) when target changes.
 * Suitable for a live dashboard where targets shift on every slider drag.
 */
export function useSmoothCountUp(target: number, duration = 300, fromZero = false): number {
  const [value, setValue] = useState(fromZero ? 0 : target);
  const fromRef = useRef(fromZero ? 0 : target);
  const frameRef = useRef<number>();
  const startRef = useRef<number>();

  useEffect(() => {
    fromRef.current = value;
    startRef.current = undefined;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      setValue(fromRef.current + (target - fromRef.current) * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}
