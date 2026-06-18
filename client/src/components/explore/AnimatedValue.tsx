import { type CSSProperties } from "react";
import { useSmoothCountUp } from "@/pages/forecast/dashboard/useSmoothCountUp";

/**
 * Animated count-up for Explore headline numbers. Wraps the existing
 * useSmoothCountUp hook (which interpolates from the PREVIOUS value, so it
 * also animates smoothly when an input changes, not just on first reveal) and
 * applies a caller-supplied formatter — currency, hours, counts, etc.
 */
export function AnimatedValue({
  value,
  format,
  duration = 600,
  fromZero = false,
  className,
  style,
  "data-testid": testId,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  /** Count up from 0 on mount (for a reveal), not just on value change. */
  fromZero?: boolean;
  className?: string;
  style?: CSSProperties;
  "data-testid"?: string;
}) {
  const animated = useSmoothCountUp(value, duration, fromZero);
  return (
    <span className={className} style={style} data-testid={testId}>
      {format(animated)}
    </span>
  );
}
