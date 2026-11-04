import { NumberField } from "@/components/NumberField";

/**
 * The per-driver math shown as a cascade: each factor on its own row (label
 * left, editable factor, running result right), so you watch the number build
 * and narrow line by line. Fits the left column of the two-column driver screen;
 * collapses via the driver row's chevron. The running values are passed in
 * (computed from the same engine inputs) so the display can never drift.
 */

export interface CascadeStep {
  label: string;
  /** editable factor; omit for the base/first row (renders a dash) */
  factor?: { value: number; onChange: (v: number) => void; prefix?: string; suffix?: string; decimal?: boolean };
  /** formatted running value after this factor (e.g. "24,000", "$12,000,000") */
  running: string;
  /** small grey aside after the running value */
  note?: string;
  /** the final row: heavier rule, coral running */
  final?: boolean;
  /** a pivot row (a subtraction / handoff, not a multiply): subtle tinted band */
  pivot?: boolean;
}

export function MathCascade({ label, steps }: { label?: string; steps: CascadeStep[] }) {
  return (
    <div>
      <div className="grid grid-cols-[1fr_128px_124px] gap-x-[10px] items-end pb-[6px] border-b border-[#EFE8DE]">
        <div className="text-[10px] font-extrabold tracking-[0.08em] uppercase text-[#443A32]">{label ?? ""}</div>
        <div className="text-[9.5px] font-extrabold tracking-[0.06em] uppercase text-[#6B6259] text-right">Your inputs</div>
        <div className="text-[9.5px] font-extrabold tracking-[0.06em] uppercase text-[#6B6259] text-right">Running total</div>
      </div>
      {steps.map((s, i) => {
        // The final row draws a thick top rule; the row just before it drops its
        // own hairline so the two don't stack into a double line.
        const nextFinal = steps[i + 1]?.final === true;
        const bottom = nextFinal ? "" : "border-b border-[#EFE8DE]";
        return (
        <div
          key={s.label + i}
          className={`py-[12px] ${
            s.final
              ? "border-t-2 border-[#E4D8C8] mt-1 pt-[14px]"
              : s.pivot
                ? `${bottom} bg-[#F6F1EA] -mx-3 px-3 rounded-[10px]`
                : bottom
          }`}
        >
          <div className="grid grid-cols-[1fr_128px_124px] gap-x-[10px] items-center">
            <div className={`text-[14px] leading-[1.3] ${s.final ? "font-bold text-[#1A1A1A]" : "text-[#1A1A1A]"}`}>{s.label}</div>
            {s.factor ? (
              // Underline fills the whole factor column so every editable figure
              // gets the same line length, right-aligned into a clean column.
              <div className="flex items-baseline justify-end gap-0.5 rounded-[10px] border border-[#E2D8CB] bg-white pl-3 pr-3.5 py-2 shadow-[inset_0_1px_2px_rgba(26,26,26,0.04)] focus-within:border-[#EA2C00] focus-within:ring-2 focus-within:ring-[#EA2C00]/15 transition-colors">
                {s.factor.prefix && <span className="text-[13px] text-[#6B6259] leading-none mr-0.5">{s.factor.prefix}</span>}
                <NumberField
                  value={s.factor.value}
                  onValueChange={s.factor.onChange}
                  decimal={s.factor.decimal}
                  className="w-full min-w-0 bg-transparent outline-none border-0 p-0 text-[15px] font-bold text-[#1A1A1A] tabular-nums leading-none text-right"
                />
                {s.factor.suffix && <span className="text-[12px] text-[#6B6259] leading-none ml-[2px] whitespace-nowrap">{s.factor.suffix}</span>}
              </div>
            ) : (
              <div className="text-right"><span className="text-[15px] text-[#C4BCB0] leading-none">—</span></div>
            )}
            <div className="text-right whitespace-nowrap">
              <span className={`leading-none tabular-nums ${s.final ? "font-abridge text-[24px] text-[#EA2C00]" : "text-[14.5px] font-semibold text-[#565250]"}`}>{s.running}</span>
            </div>
          </div>
          {/* Note on its own full-width line below the row so a long aside wraps
              inside the column instead of spilling across the divider. */}
          {s.note && <div className="text-[11.5px] text-[#6B6259] leading-tight mt-[5px] text-right">{s.note}</div>}
        </div>
        );
      })}
    </div>
  );
}

export default MathCascade;
