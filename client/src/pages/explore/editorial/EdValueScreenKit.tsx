import { Fragment, type ReactNode } from "react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { quickFillChip } from "./quickFillChip";
import { BuildStrip, type MoneyBuild } from "./EdMoneyCard";
import { AnimatedValue } from "@/components/explore/AnimatedValue";
import { AssumptionsDisclosure } from "./AssumptionsDisclosure";

/**
 * Shared presentational primitives for the editorial "two-tier value screen"
 * pattern (EdCapacity / EdWorkforce): Tier 1 "The value · counts when it's
 * on" money drivers with a coral ON/OFF switch, and Tier 2 demoted dashed
 * "not counted · examples only" qualitative signals → outcomes block.
 *
 * Tokens match the locked mockup kit exactly (#E7E3DD hairlines, #EA2C00
 * coral, #FDFBF8 card fill, Abridge display face for numbers/titles).
 */

export const formatCurrency = (n: number) => "$" + Math.round(n || 0).toLocaleString();
export const formatNum = (n: number) => Math.round(n || 0).toLocaleString();
export const formatNum1 = (n: number) =>
  Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });

export function Switch({
  on,
  onClick,
  testId,
}: {
  on: boolean;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <div className="flex-shrink-0 text-right">
      <div
        className={`text-[11px] font-extrabold tracking-[0.05em] uppercase mb-[6px] ${
          on ? "text-[#EA2C00]" : "text-[#7C766F]"
        }`}
      >
        {on ? "On" : "Off"}
      </div>
      <button
        type="button"
        onClick={onClick}
        data-testid={testId}
        aria-pressed={on}
        className={`w-[46px] h-[27px] rounded-full relative transition-colors ${
          on ? "bg-[#EA2C00]" : "bg-[#D8CFC0]"
        }`}
      >
        <span
          className={`absolute top-[3px] w-[21px] h-[21px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-all ${
            on ? "left-[22px]" : "left-[3px]"
          }`}
        />
      </button>
    </div>
  );
}

/** "Show as: Number / Dollar" segmented control for a driver whose value can be
 * carried either as a tracked signal or a counted dollar (retention lens). */
export function LensToggle({
  counted,
  onChange,
  testId,
}: {
  counted: boolean;
  onChange: (counted: boolean) => void;
  testId?: string;
}) {
  return (
    <div className="inline-flex items-center gap-[6px]">
      <span className="text-[10.5px] font-extrabold tracking-[0.08em] uppercase text-[#7C766F]">Show as</span>
      <div className="inline-flex items-center gap-[2px] bg-[#F2EFEA] rounded-full p-[3px]" data-testid={testId}>
        {([
          { counts: false, label: "Number" },
          { counts: true, label: "Dollar" },
        ] as const).map(({ counts, label }) => {
          const active = counted === counts;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onChange(counts)}
              data-testid={testId ? `${testId}-${counts ? "dollar" : "number"}` : undefined}
              aria-pressed={active}
              className={`text-[11px] font-extrabold tracking-[0.03em] rounded-full px-[12px] py-[4px] transition-all ${
                active
                  ? `bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12)] ${counts ? "text-[#EA2C00]" : "text-[#2E2822]"}`
                  : "text-[#7C766F] hover:text-[#2E2822]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SectionLabel({
  children,
  tag,
  tagMuted = false,
  subtotal,
}: {
  children: ReactNode;
  tag: string;
  tagMuted?: boolean;
  subtotal?: ReactNode;
}) {
  return (
    <div className="text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#2E2822] mt-[30px] mb-[13px] flex flex-wrap items-center gap-[10px]">
      {children}
      <span
        className={`text-[10px] font-extrabold tracking-[0.05em] normal-case rounded-full px-[9px] py-[3px] ${
          tagMuted ? "text-[#7C766F] bg-[#F2EFEA]" : "text-[#EA2C00] bg-[#FFEDE7]"
        }`}
      >
        {tag}
      </span>
      {subtotal && (
        <span className="ml-auto normal-case tracking-normal text-[12px] font-bold text-[#565250]">
          {subtotal}
        </span>
      )}
    </div>
  );
}

export function ValueCard({
  title,
  subtitle,
  value,
  unit = "/ yr",
  secondary,
  onToggle,
  testId,
  children,
  build,
  buildStruct,
  warning,
  awaitingScale,
  lens,
  trackedHeadline,
}: {
  title: string;
  subtitle: string;
  value: number;
  unit?: string;
  secondary?: ReactNode;
  onToggle: () => void;
  testId?: string;
  children?: ReactNode;
  build?: ReactNode;
  buildStruct?: MoneyBuild;
  warning?: ReactNode;
  /** When set, the scale input(s) aren't entered: show the waiting headline
   * instead of a dollar, keep the input tiles visible, suppress the build line. */
  awaitingScale?: { need: string };
  /** Counted/Tracked lens (retention). When present, shows the "Show as"
   * segmented control. When `lens.counted` is false the card leads with
   * `trackedHeadline` (the signals) instead of the dollar, and the dollar
   * build strip is suppressed — the value is kept out of the ROI. */
  lens?: { counted: boolean; onChange: (counted: boolean) => void; testId?: string };
  trackedHeadline?: ReactNode;
}) {
  const dollarMode = !lens || lens.counted;
  return (
    <div className="bg-[#FDFBF8] border border-[#E7E3DD] rounded-[20px] p-6 sm:p-7 mb-[14px] last:mb-0">
      <div className="flex justify-between items-start gap-5">
        <div>
          <div className="font-abridge text-[22px] sm:text-[23px] text-[#1A1A1A] leading-tight">{title}</div>
          <div className="text-[13.5px] text-[#565250] mt-1 max-w-[430px] leading-[1.45]">{subtitle}</div>
        </div>
        <Switch on={true} onClick={onToggle} testId={testId} />
      </div>

      {warning && (
        <div className="mt-4 px-3.5 py-2.5 bg-[#FFF7F4] border border-[#FFDDD6] rounded-[10px] text-[12.5px] text-[#B23100] leading-[1.4]">
          {warning}
        </div>
      )}

      {lens && (
        <div className="mt-[16px]">
          <LensToggle counted={lens.counted} onChange={lens.onChange} testId={lens.testId} />
        </div>
      )}

      {dollarMode ? (
        <div className="flex items-baseline gap-4 mt-[18px] flex-wrap" data-testid={awaitingScale && testId ? `${testId}-awaiting` : undefined}>
          <div>
            {awaitingScale ? (
              <span className="font-abridge text-[36px] sm:text-[40px] leading-none text-[#C9BDAD] select-none">{"—"}</span>
            ) : (
              <AnimatedValue value={value} format={formatCurrency} duration={450} className="font-abridge text-[36px] sm:text-[40px] leading-none text-[#EA2C00]" />
            )}{" "}
            <span className="text-[15px] text-[#565250]">{unit}</span>
          </div>
          {awaitingScale ? (
            <div className="text-[13.5px] text-[#7C766F] border-l border-[#E7E3DD] pl-4">Enter {awaitingScale.need} to see your number.</div>
          ) : (
            secondary && (
              <div className="text-[13.5px] text-[#565250] border-l border-[#E7E3DD] pl-4">{secondary}</div>
            )
          )}
        </div>
      ) : (
        <div className="mt-[18px]" data-testid={testId ? `${testId}-tracked` : undefined}>
          {trackedHeadline}
        </div>
      )}

      {/* The build ledger leads (payoff + proof); raw inputs recede below.
          In tracked mode the dollar build is suppressed — it's kept out of the ROI. */}
      {dollarMode && !awaitingScale && buildStruct && <BuildStrip build={buildStruct} />}

      {children &&
        (dollarMode && !awaitingScale && buildStruct ? (
          <AssumptionsDisclosure>
            <div className="flex flex-col gap-4">{children}</div>
          </AssumptionsDisclosure>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px] mt-[22px]">{children}</div>
        ))}

      {!awaitingScale && !buildStruct && build && (
        <div className="text-[13px] text-[#565250] leading-[1.5] mt-[18px]">{build}</div>
      )}
    </div>
  );
}

export function OffCard({
  title,
  subtitle,
  hint,
  onToggle,
  testId,
}: {
  title: string;
  subtitle: string;
  hint?: ReactNode;
  onToggle: () => void;
  testId?: string;
}) {
  return (
    <div className="bg-[#FBF9F5] border border-[#E7E3DD] rounded-[20px] px-6 sm:px-7 py-5 mb-[14px] last:mb-0">
      <div className="flex items-center justify-between gap-6 flex-wrap sm:flex-nowrap">
        <div>
          <div className="font-abridge text-[22px] sm:text-[23px] text-[#565250] leading-tight">{title}</div>
          <div className="text-[13.5px] text-[#565250] mt-[5px] max-w-[520px] leading-[1.45]">{subtitle}</div>
        </div>
        <div className="flex items-center gap-[22px] flex-shrink-0">
          <div className="text-[13px] font-extrabold tracking-[0.04em] uppercase text-[#7C766F]">Not counted</div>
          <Switch on={false} onClick={onToggle} testId={testId} />
        </div>
      </div>
      {hint && <div className="text-[12.5px] text-[#7C766F] mt-[11px] leading-[1.5]">{hint}</div>}
    </div>
  );
}

export function EmptyValueCard({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[#FBF9F5] border border-dashed border-[#D8CFC0] rounded-[20px] px-6 sm:px-7 py-6 text-[13.5px] text-[#7C766F] leading-[1.5]">
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
  note,
}: {
  label: string;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div>
      <div className="text-[10.5px] font-extrabold tracking-[0.05em] uppercase text-[#2E2822] mb-[8px] leading-[1.3] min-h-[14px]">{label}</div>
      {children}
      {note && <div className="text-[11.5px] text-[#7C766F] mt-[8px] leading-[1.4]">{note}</div>}
    </div>
  );
}

export function NumBox({
  value,
  onChange,
  prefix,
  suffix,
  testId,
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  testId?: string;
}) {
  return (
    <div className="h-[54px] border-[1.5px] border-[#E4DED6] rounded-[14px] bg-white shadow-[0_1px_2px_rgba(40,30,20,0.04)] flex items-center gap-0 px-[16px] transition-colors focus-within:border-[#EA2C00] focus-within:shadow-[0_0_0_3px_#FBD9CE]">
      {prefix && <span className="text-[16px] font-medium text-[#1A1A1A] flex-shrink-0 mr-[1px]">{prefix}</span>}
      <FormattedNumberInput
        value={value}
        onChange={onChange}
        className="h-full w-full border-0 rounded-none bg-transparent px-0 py-0 shadow-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-[16px] font-medium text-[#1A1A1A] tabular-nums"
        data-testid={testId}
      />
      {suffix && <span className="ml-auto pl-2 text-[13px] font-semibold text-[#7C766F] flex-shrink-0">{suffix}</span>}
    </div>
  );
}

export function QuickPicks({
  options,
  value,
  onPick,
}: {
  options: { label: string; value: number }[];
  value: number;
  onPick: (v: number) => void;
}) {
  return (
    <div className="flex gap-[6px] mt-[8px] flex-wrap">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => onPick(o.value)}
          className={quickFillChip(Math.round(value) === o.value, "sm")}
        >
          {o.label} · {o.value}
        </button>
      ))}
    </div>
  );
}

export interface OutcomeSignal {
  label: string;
  ex: string;
}

export function OutcomesBlock({
  heading,
  signals,
  outcomes,
  note,
}: {
  heading: string;
  signals: OutcomeSignal[];
  outcomes: string[];
  note: ReactNode;
}) {
  // One grid so each row's two cells share a height and their bottom borders
  // line up across columns (two independent lists drift apart when a label
  // wraps). Column headers are the first grid row.
  const rowCount = Math.max(signals.length, outcomes.length);
  const hdr = "text-[10.5px] font-extrabold tracking-[0.06em] uppercase text-[#7C766F] pb-3";
  const cell = "flex items-center min-h-[52px] py-2 border-b border-[#EDE5D8] text-[14px]";
  return (
    <div className="border border-dashed border-[#D8CFC0] rounded-[18px] p-5 sm:p-6 bg-[#FAF7F2]">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-9">
        <div className={hdr}>Signals we can measure</div>
        <div className={`${hdr} hidden sm:block`}>{heading}</div>
        {Array.from({ length: rowCount }).map((_, i) => {
          const s = signals[i];
          const o = outcomes[i];
          const last = i === rowCount - 1;
          return (
            <Fragment key={i}>
              <div className={`${cell} justify-between gap-3 text-[#565250] ${last ? "sm:border-b-0" : ""}`}>
                {s && (
                  <>
                    <span>{s.label}</span>
                    <span className="text-[12px] text-[#7C766F] italic flex-shrink-0 whitespace-nowrap">{s.ex}</span>
                  </>
                )}
              </div>
              <div className={`${cell} font-bold text-[#1A1A1A] ${last ? "border-b-0" : ""}`}>{o}</div>
            </Fragment>
          );
        })}
      </div>
      <div className="text-[12.5px] text-[#565250] leading-[1.5] mt-[15px]">{note}</div>
    </div>
  );
}

export function Foot({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex justify-end mt-[30px]">
      <button
        type="button"
        onClick={onNext}
        data-testid="ed-continue"
        className="bg-[#EA2C00] text-white text-[15px] font-bold px-7 py-[14px] rounded-[12px] shadow-[0_2px_6px_rgba(234,44,0,0.15)] flex items-center gap-2"
      >
        Continue →
      </button>
    </div>
  );
}
