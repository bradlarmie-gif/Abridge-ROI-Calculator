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
  className,
  "data-testid": testId,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
  "data-testid"?: string;
}) {
  const animated = useSmoothCountUp(value, duration);
  return (
    <span className={className} data-testid={testId}>
      {format(animated)}
    </span>
  );
}
