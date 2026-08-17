import { ReactNode, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { NumberField } from "@/components/NumberField";
import { AnimatedValue } from "@/components/explore/AnimatedValue";

/**
 * The mock-faithful inline driver card: THE MATH shown as a footing equation with every factor
 * editable in place (coral underline = editable here, grey = carried from an earlier step), the
 * result computed by the engine, collapsible via a chevron, open by default. Ports MockExplore's
 * card/equation/plan design into real, engine-wired components. Used by the value screens instead
 * of the old read-only BuildStrip + hidden assumptions tray.
 */

const CORAL = "#EA2C00";
const INK = "#1A1A1A";
const MUTED = "#7C766F";
export const fmt$ = (n: number) => "$" + Math.round(n || 0).toLocaleString();
const fmtK = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
};

function Cap({ children }: { children: ReactNode }) {
  // Wraps to two lines (values are bottom-aligned, so the baseline holds) so a
  // label can say what the % is OF instead of a cryptic one-word abbreviation.
  return <div className="text-[9.5px] font-bold tracking-[0.04em] uppercase text-[#7C766F] mb-[6px] min-h-[12px] leading-[1.25] max-w-[104px] text-center">{children}</div>;
}

/** An editable number, inline in the equation. The underline hugs the value (sizes to content)
 * and the number is centered over it, matching the mock — not a full-width coral bar. Bound to
 * state via onChange. `width` is retained for call-site compatibility but sizing is content-based. */
export function EqNum({ cap, value, onChange, prefix, suffix, decimal }: { cap: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string; decimal?: boolean; width?: number }) {
  return (
    <div className="flex flex-col justify-end items-center">
      {cap ? <Cap>{cap}</Cap> : null}
      <div className="inline-flex items-baseline w-fit border-b-2 border-[#EA2C00] pb-[2px] transition-colors focus-within:border-[#B02200]">
        {prefix && <span className="font-abridge text-[19px] text-[#1A1A1A] leading-none">{prefix}</span>}
        <NumberField value={value} onValueChange={onChange} decimal={decimal} className="bg-transparent outline-none border-0 p-0 font-abridge text-[19px] text-[#1A1A1A] tabular-nums leading-none text-center [field-sizing:content] min-w-[1ch]" />
        {/* "%" hugs the number; word suffixes (hrs, min, "of N") need a space so it's not "1hrs". */}
        {suffix && <span className={`text-[13px] text-[#7C766F] leading-none ${suffix === "%" ? "" : "ml-[3px]"}`}>{suffix}</span>}
      </div>
    </div>
  );
}

/** A carried figure from an earlier step (grey, not editable here). */
export function EqCarried({ cap, children }: { cap: string; children: ReactNode }) {
  return (
    <div className="flex flex-col justify-end">
      <Cap>{cap}</Cap>
      {/* transparent underline mirrors EqNum's 2px border so the carried figure
          shares the exact baseline of the editable coral figures in the row. */}
      <div className="font-abridge text-[19px] text-[#A79E92] tabular-nums leading-none border-b-2 border-transparent pb-[2px]">{children}</div>
    </div>
  );
}

export function EqOp({ children }: { children: string }) {
  return (
    <div className="flex flex-col justify-end">
      <Cap>{" "}</Cap>
      <div className="font-abridge text-[19px] text-[#B9AA97] leading-none border-b-2 border-transparent pb-[2px]">{children}</div>
    </div>
  );
}

export function EqResult({ value }: { value: number }) {
  return (
    <div className="basis-full w-full flex items-baseline gap-2.5 pt-3 mt-1 border-t border-[#F3E9E1]">
      <span className="font-abridge text-[19px] text-[#B9AA97] leading-none">=</span>
      <span className="leading-none whitespace-nowrap">
        <AnimatedValue value={value} format={(n) => "+" + fmtK(n)} duration={450} className="font-abridge text-[28px] text-[#EA2C00]" />
        <span className="text-[12px] text-[#7C766F]"> / yr</span>
      </span>
    </div>
  );
}

export function EquationRow({ children }: { children: ReactNode }) {
  return <div className="flex items-end flex-wrap gap-x-[12px] gap-y-3">{children}</div>;
}

/** The card shell (title, tag, subtitle, toggle) + a collapsible "THE MATH" body. Off = calm invite. */
export function InlineDriverCard({
  title, tag, subtitle, enabled, onToggle, note, testId, children, editHint = true, mathLabel = "The math",
}: {
  title: string; tag?: string; subtitle: string; enabled: boolean; onToggle: () => void;
  note?: ReactNode; testId?: string; children: ReactNode;
  /** Show the coral "edit any figure" hint. False when the body is read-only (e.g. tracked-signal mode). */
  editHint?: boolean;
  /** Header label for the body. Defaults to "The math"; use "What we track" for read-only signal bodies. */
  mathLabel?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`rounded-[20px] border px-[26px] py-[22px] mb-3.5 ${enabled ? "bg-[#FFFBF9] border-[#F1C9BC]" : "bg-white border-[#E7E3DD]"}`}>
      <div className="flex justify-between items-start gap-5">
        <div>
          <div className="font-abridge text-[22px] text-[#1A1A1A] flex items-center flex-wrap gap-x-3 gap-y-1">
            {title}
            {tag && <span className="text-[9.5px] font-extrabold tracking-[0.05em] uppercase text-[#7C766F] bg-[#F2EFEA] rounded-full px-[9px] py-[3px] relative -top-[1px] font-sans">{tag}</span>}
          </div>
          <div className="text-[13px] text-[#565250] mt-[5px] max-w-[520px] leading-[1.45]">{subtitle}</div>
        </div>
        <button type="button" onClick={onToggle} data-testid={testId} className={`w-[46px] h-[27px] rounded-full relative transition-colors flex-shrink-0 mt-1 ${enabled ? "bg-[#EA2C00]" : "bg-[#DCD5CB]"}`}>
          <span className={`absolute top-[3px] w-[21px] h-[21px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-all ${enabled ? "left-[22px]" : "left-[3px]"}`} />
        </button>
      </div>
      {enabled ? (
        <div className="mt-4 pt-4 border-t border-[#F1E4DC]">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1.5">
              <ChevronDown size={15} color={MUTED} style={{ transform: open ? "none" : "rotate(-90deg)", transition: "transform .15s" }} />
              <span className="text-[11px] font-extrabold tracking-[0.07em] uppercase text-[#7C766F]">{mathLabel}</span>
            </button>
            {open && editHint && <span className="text-[11.5px] font-bold text-[#EA2C00]">edit any figure</span>}
          </div>
          {open && (
            <>
              {children}
              {note && <div className="text-[12px] text-[#7C766F] mt-3 leading-[1.45] italic">{note}</div>}
            </>
          )}
        </div>
      ) : (
        <div className="mt-4 text-[13px] text-[#7C766F] italic">Off. Turn on to model this driver against your numbers.</div>
      )}
    </div>
  );
}

/** Grey "awaiting a scale input" state for the equation body. */
export function EqAwaiting({ need }: { need: string }) {
  return (
    <div className="flex items-baseline gap-3 flex-wrap">
      <span className="font-abridge text-[28px] text-[#C9BDAD] select-none leading-none">—</span>
      <span className="text-[13px] text-[#7C766F]">Enter {need} to see your number.</span>
    </div>
  );
}

export const CARD_CORAL = CORAL;
export { Cap as EqCap, fmtK as fmtKmoney, X as XIcon, Plus as PlusIcon };
