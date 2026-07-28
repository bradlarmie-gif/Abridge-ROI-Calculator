interface AwaitingScaleProps {
  /** Short lowercase phrase naming the missing scale input, e.g. "annual ED visits". */
  need: string;
  /** Optional label above the notice — matches the panel it replaces (default "Estimated Value"). */
  title?: string;
  testId?: string;
}

/**
 * The "scale not yet entered" state for a quantified driver.
 *
 * Replaces a driver's value / build-line panel until the partner has entered
 * its scale input(s). No fabricated dollar is ever shown from a seeded default —
 * the number only assembles once the magnitude is theirs. The assumption inputs
 * (rates, %, $/unit) stay visible and editable above this notice.
 */
export default function AwaitingScale({ need, title = "Estimated Value", testId }: AwaitingScaleProps) {
  return (
    <div>
      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">{title}</p>
      <div
        className="bg-[#F5F0EB] rounded-lg p-4 border border-dashed border-[#D9CFC2]"
        data-testid={testId}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold text-[#8C7E6E]">Your number appears here</span>
          <span className="text-2xl font-bold text-[#C9BDAD] select-none">{"—"}</span>
        </div>
        <p className="text-xs text-[#888888] mt-1.5">
          Enter {need} to see your value. The assumptions below are typical starting points you can adjust.
        </p>
      </div>
    </div>
  );
}
