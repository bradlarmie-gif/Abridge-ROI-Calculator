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
}

export function MathCascade({ label, steps }: { label?: string; steps: CascadeStep[] }) {
  return (
    <div>
      <div className="grid grid-cols-[1fr_76px_128px] gap-x-[10px] items-end pb-[6px] border-b border-[#EDE8E1]">
        <div className="text-[10px] font-extrabold tracking-[0.08em] uppercase text-[#8C8073]">{label ?? ""}</div>
        <div />
        <div className="text-[9.5px] font-extrabold tracking-[0.06em] uppercase text-[#8C8073] text-right">Running</div>
      </div>
      {steps.map((s, i) => (
        <div
          key={s.label + i}
          className={`grid grid-cols-[1fr_76px_128px] gap-x-[10px] items-baseline py-[12px] ${s.final ? "border-t-2 border-[#1A1A1A] mt-1 pt-[16px]" : "border-b border-[#EDE8E1]"}`}
        >
          <div className={`text-[14px] leading-[1.3] ${s.final ? "font-abridge text-[#1A1A1A] font-bold" : "text-[#3A342E]"}`}>{s.label}</div>
          <div className="text-right">
            {s.factor ? (
              <span className="inline-flex items-baseline border-b-2 border-[#EA2C00] pb-[1px]">
                {s.factor.prefix && <span className="font-abridge text-[19px] text-[#1A1A1A] leading-none">{s.factor.prefix}</span>}
                <NumberField
                  value={s.factor.value}
                  onValueChange={s.factor.onChange}
                  decimal={s.factor.decimal}
                  className="bg-transparent outline-none border-0 p-0 font-abridge text-[19px] text-[#1A1A1A] tabular-nums leading-none text-right [field-sizing:content] min-w-[1ch]"
                />
                {s.factor.suffix && <span className="text-[12px] text-[#7C766F] leading-none ml-[1px]">{s.factor.suffix}</span>}
              </span>
            ) : (
              <span className="font-abridge text-[19px] text-[#C4BCB0] leading-none">—</span>
            )}
          </div>
          <div className="text-right whitespace-nowrap">
            <span className={`font-abridge leading-none ${s.final ? "text-[26px] text-[#EA2C00]" : "text-[19px] text-[#8C8073]"}`}>{s.running}</span>
            {s.note && <div className="text-[11px] text-[#8C8073] mt-[3px] leading-tight">{s.note}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MathCascade;
