import { ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { NumberField } from "@/components/NumberField";
import { AnimatedValue } from "@/components/explore/AnimatedValue";
import { AssumptionsDisclosure } from "./AssumptionsDisclosure";

/**
 * Shared editorial-brand chrome for Explore Revenue/Quality money cards.
 * Ports the locked mockup kit (explore-06-revenue.html / explore-07-quality.html)
 * to real Tailwind so EdRevenue.tsx and EdQuality.tsx don't duplicate the
 * ~150 lines of card/tile/toggle/chip markup. Tokens match EdCareSetting.tsx
 * exactly: coral #EA2C00, ink #1A1A1A, muted #565250, faint #7C766F,
 * line #E7E3DD, label #2E2822, card bg #FDFBF8.
 */

export const fmt$ = (n: number) => "$" + Math.round(n || 0).toLocaleString();
export const fmtN = (n: number) => Math.round(n || 0).toLocaleString();
export const fmtNd = (n: number) =>
  Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

/**
 * Structured "build" for a money driver — the math shown as a scannable ledger
 * with the honest haircut made visible, instead of a run-on formula footnote.
 * `factors` multiply up to `gross` (the full opportunity); the credibility
 * discounts (`haircutLabel`, e.g. realization / attribution) carry it down to
 * `net` (== the card's headline value). `read` is an optional plain-English
 * sentence shown only on a screen's hero driver.
 */
export interface MoneyBuild {
  read?: ReactNode;
  factors: { value: string; label: string }[];
  grossLabel: string;
  gross: number;
  net: number;
  haircutLabel: ReactNode;
}

export function BuildStrip({ build }: { build: MoneyBuild }) {
  const keepPct = build.gross > 0 ? Math.max(0, Math.min(1, build.net / build.gross)) : 1;
  const heldBack = Math.max(0, build.gross - build.net);
  return (
    <div className="mt-5">
      {build.read && (
        <div className="text-[14.5px] leading-[1.5] text-[#574C41] font-semibold max-w-[520px] mb-[18px] [&_b]:text-[#1A1A1A] [&_b]:font-extrabold">
          {build.read}
        </div>
      )}
      <div className="text-[10.5px] font-extrabold tracking-[0.09em] uppercase text-[#3E3B37] mb-3 flex items-center gap-2.5">
        How it builds
        <span className="flex-1 h-px bg-gradient-to-r from-[#E7E3DD] to-[#EDE7DD]/0" />
      </div>
      <div className="flex items-stretch flex-wrap gap-y-2.5">
        {build.factors.map((f, i) => (
          <div key={i} className="flex items-stretch">
            {i > 0 && <span className="self-start text-[15px] text-[#B9AA97] px-[14px] pt-[2px]">×</span>}
            <div>
              <div className="text-[19px] font-bold text-[#1A1A1A] leading-none tabular-nums">{f.value}</div>
              <div className="text-[9.5px] font-bold tracking-[0.04em] uppercase text-[#7C766F] mt-[7px]">{f.label}</div>
            </div>
          </div>
        ))}
      </div>
      {heldBack > 0 ? (
        <>
          <div className="flex justify-between items-baseline mt-[18px] pb-[10px]">
            <div className="text-[12.5px] text-[#565250]">{build.grossLabel}</div>
            <AnimatedValue value={build.gross} format={fmt$} duration={450} className="text-[16px] font-bold text-[#1A1A1A] tabular-nums" />
          </div>
          <div className="h-[14px] rounded-[5px] overflow-hidden flex bg-[#EBE6DE]">
            <div className="bg-[#EA2C00] h-full transition-[width] duration-500 ease-out" style={{ width: `${(keepPct * 100).toFixed(2)}%` }} />
            <div
              className="h-full transition-[width] duration-500 ease-out"
              style={{
                width: `${((1 - keepPct) * 100).toFixed(2)}%`,
                background: "repeating-linear-gradient(45deg,#E4D9C8,#E4D9C8 4px,#EBE6DE 4px,#EBE6DE 8px)",
              }}
            />
          </div>
          <div className="flex justify-between items-baseline mt-[9px] gap-4 flex-wrap">
            <div className="text-[12px] text-[#B02200] font-bold">
              <AnimatedValue value={build.net} format={fmt$} duration={450} className="font-extrabold tabular-nums" /> counted · {build.haircutLabel}
            </div>
            <div className="text-[12px] text-[#7C766F] tabular-nums">− <AnimatedValue value={heldBack} format={fmt$} duration={450} /> held back</div>
          </div>
        </>
      ) : (
        <div className="mt-[14px] text-[13px] text-[#565250]">
          = <AnimatedValue value={build.net} format={fmt$} duration={450} className="text-[16px] font-bold text-[#1A1A1A] tabular-nums" /> a year
        </div>
      )}
    </div>
  );
}

export function SectionLabel({
  children,
  tag,
  tagVariant = "coral",
  right,
}: {
  children: ReactNode;
  tag?: string;
  tagVariant?: "coral" | "grey";
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 mt-8 mb-3 text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#2E2822]">
      <span>{children}</span>
      {tag && (
        <span
          className={`text-[10px] font-extrabold tracking-[0.05em] rounded-full px-[9px] py-[3px] normal-case ${
            tagVariant === "coral" ? "text-[#EA2C00] bg-[#FFEDE7]" : "text-[#7C766F] bg-[#F2EFEA]"
          }`}
        >
          {tag}
        </span>
      )}
      {right && <span className="ml-auto normal-case tracking-normal text-[12px] font-bold text-[#565250]">{right}</span>}
    </div>
  );
}

export function DividerLabel({ children, tag }: { children: ReactNode; tag?: string }) {
  return (
    <div className="flex items-center gap-2.5 mt-6 mb-3 text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#2E2822]">
      <span>{children}</span>
      {tag && (
        <span className="text-[10px] font-extrabold tracking-[0.05em] uppercase text-[#7C766F] bg-[#F2EFEA] rounded-full px-[9px] py-[3px] normal-case">
          {tag}
        </span>
      )}
    </div>
  );
}

export function Toggle({ on, onClick, testId }: { on: boolean; onClick: () => void; testId?: string }) {
  return (
    <div className="flex flex-col items-end flex-shrink-0">
      <div className={`text-[11px] font-extrabold tracking-[0.05em] uppercase mb-1.5 ${on ? "text-[#EA2C00]" : "text-[#AFA491]"}`}>
        {on ? "On" : "Off"}
      </div>
      <button
        type="button"
        onClick={onClick}
        data-testid={testId}
        className={`w-[46px] h-[27px] rounded-full relative transition-colors ${on ? "bg-[#EA2C00]" : "bg-[#E7E3DD]"}`}
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

export function MoneyCard({
  title,
  tag,
  subtitle,
  enabled,
  onToggle,
  value,
  unit = "/ yr",
  secondary,
  buildLine,
  build,
  children,
  testId,
  awaitingScale,
}: {
  title: string;
  tag?: string;
  subtitle: string;
  enabled: boolean;
  onToggle: () => void;
  value: number;
  unit?: string;
  secondary?: ReactNode;
  buildLine?: ReactNode;
  build?: MoneyBuild;
  children?: ReactNode;
  testId?: string;
  /** When set (and the card is on), the scale input(s) aren't entered yet: show
   * the waiting headline instead of a dollar, but keep the input tiles visible. */
  awaitingScale?: { need: string };
}) {
  return (
    <div className="bg-[#FDFBF8] border border-[#E7E3DD] rounded-[20px] px-[26px] py-[22px] mb-3.5">
      <div className="flex justify-between items-start gap-5">
        <div>
          <div className="font-abridge text-[22px] text-[#1A1A1A] flex items-center flex-wrap gap-x-3 gap-y-1">
            {title}
            {tag && (
              <span className="text-[9.5px] font-extrabold tracking-[0.05em] uppercase text-[#7C766F] bg-[#F2EFEA] rounded-full px-[9px] py-[3px] relative -top-[1px] font-sans">
                {tag}
              </span>
            )}
          </div>
          <div className="text-[13px] text-[#565250] mt-[5px] max-w-[560px] leading-[1.45]">{subtitle}</div>
        </div>
        <Toggle on={enabled} onClick={onToggle} testId={testId} />
      </div>

      {enabled ? (
        awaitingScale ? (
          <>
            <div className="flex items-baseline gap-4 mt-4 flex-wrap" data-testid={testId ? `${testId}-awaiting` : undefined}>
              <div>
                <span className="font-abridge text-[36px] text-[#C9BDAD] leading-none tabular-nums select-none">{"—"}</span>{" "}
                <span className="text-[15px] text-[#565250]">{unit}</span>
              </div>
              <div className="text-[13px] text-[#7C766F] border-l border-[#E7E3DD] pl-4">
                Enter {awaitingScale.need} to see your number.
              </div>
            </div>
            {children}
          </>
        ) : (
        <>
          <div className="flex items-baseline gap-4 mt-4 flex-wrap">
            <div>
              <AnimatedValue value={value} format={fmt$} duration={450} className="font-abridge text-[36px] text-[#EA2C00] leading-none tabular-nums" />{" "}
              <span className="text-[15px] text-[#565250]">{unit}</span>
            </div>
            {secondary && (
              <div className="text-[13px] text-[#565250] border-l border-[#E7E3DD] pl-4">{secondary}</div>
            )}
          </div>
          {build ? (
            <>
              {/* The math leads (the payoff + its proof); the raw inputs recede below. */}
              <BuildStrip build={build} />
              {children && (
                <AssumptionsDisclosure>{children}</AssumptionsDisclosure>
              )}
            </>
          ) : (
            <>
              {children}
              {buildLine && (
                <div className="mt-4 text-[12.5px] text-[#565250] leading-[1.5]">{buildLine}</div>
              )}
            </>
          )}
        </>
        )
      ) : (
        <div className="mt-4 text-[13px] text-[#7C766F] italic">Off. Turn on to model this driver against your numbers.</div>
      )}
    </div>
  );
}

export function FieldTile({
  label,
  note,
  hot,
  children,
}: {
  label: string;
  note?: ReactNode;
  hot?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="text-[10.5px] font-extrabold tracking-[0.05em] uppercase text-[#2E2822] mb-[8px] leading-[1.3] min-h-[14px]">{label}</div>
      {children}
      {note && <div className={`text-[11.5px] mt-[8px] leading-[1.4] ${hot ? "text-[#EA2C00] font-bold" : "text-[#7C766F]"}`}>{note}</div>}
    </div>
  );
}

export function FieldGrid({ cols: _cols = 4, children }: { cols?: 3 | 4; children: ReactNode }) {
  // Single column, one field per row. Uniform by construction — fields with
  // quick-picks or notes vary in height, and any multi-column layout either
  // couples row heights (leaving gaps beside short fields) or runs columns
  // independently (lopsided). One column can do neither. Height is fine inside
  // the collapsed assumptions tray.
  return <div className="mt-5 flex flex-col gap-4">{children}</div>;
}

/** Numeric input styled as the mock's `.fi` box (bare, bordered, tabular). */
export function Fi({
  value,
  onValueChange,
  prefix,
  suffix,
  decimal = false,
  min,
  max,
  highlighted,
  testId,
}: {
  value: number;
  onValueChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  decimal?: boolean;
  min?: number;
  max?: number;
  highlighted?: boolean;
  testId?: string;
}) {
  return (
    <div
      className={`h-[54px] rounded-[14px] bg-white shadow-[0_1px_2px_rgba(40,30,20,0.04)] flex items-center gap-0 px-[16px] text-[16px] font-medium text-[#1A1A1A] transition-[box-shadow,border-color] focus-within:border-[#EA2C00] focus-within:shadow-[0_0_0_3px_#FBD9CE] ${
        highlighted ? "border-[1.5px] border-[#EFB6A6]" : "border-[1.5px] border-[#E4DED6]"
      }`}
    >
      {prefix && <span className="text-[16px] font-medium text-[#1A1A1A] flex-shrink-0 mr-[1px]">{prefix}</span>}
      <NumberField
        value={value}
        onValueChange={onValueChange}
        decimal={decimal}
        min={min}
        max={max}
        data-testid={testId}
        className="w-full bg-transparent outline-none text-[16px] font-medium text-[#1A1A1A] tabular-nums"
      />
      {suffix && <span className="ml-auto pl-2 text-[13px] font-semibold text-[#7C766F] flex-shrink-0">{suffix}</span>}
    </div>
  );
}

/** Read-only derived tile — a value the engine computed upstream, not editable here. */
export function FiReadout({ children, suffix }: { children: ReactNode; suffix?: string }) {
  return (
    <div className="h-[54px] rounded-[14px] bg-[#F4F1EC] border-[1.5px] border-[#E4DED6] flex items-center gap-1 px-[16px] text-[16px] font-medium text-[#565250] tabular-nums">
      {children}
      {suffix && <span className="ml-auto pl-2 text-[13px] font-semibold text-[#7C766F]">{suffix}</span>}
    </div>
  );
}

export function QuickFill({
  options,
  activeKey,
  onSelect,
}: {
  options: { key: string; label: string }[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="flex gap-[6px] mt-[8px] flex-wrap">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onSelect(o.key)}
          className={`text-[11.5px] font-bold rounded-[8px] border px-[9px] py-[5px] transition-colors ${
            activeKey === o.key ? "border-[#EA2C00] text-[#EA2C00] bg-[#FFF7F4]" : "border-[#E7E3DD] text-[#565250] bg-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PlansRepeater({
  totalLabel,
  children,
  onAdd,
}: {
  totalLabel: ReactNode;
  children: ReactNode;
  onAdd: () => void;
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center text-[10.5px] font-extrabold tracking-[0.04em] uppercase text-[#2E2822] mb-2.5">
        <span>Risk-based plans, each at its own value per HCC</span>
        <span className="ml-auto normal-case tracking-normal font-bold text-[#565250] text-[12px]">{totalLabel}</span>
      </div>
      <div className="space-y-2.5">{children}</div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-1.5 text-[12.5px] font-bold text-[#EA2C00] bg-white border border-dashed border-[#E4B8AC] rounded-[10px] px-[15px] py-[9px] inline-flex items-center gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" /> Add plan
      </button>
    </div>
  );
}

const PLAN_TYPE_LABELS: Record<string, string> = {
  medicare_advantage: "Medicare Advantage",
  aca_marketplace: "ACA / Exchange",
  medicaid_mco: "Medicaid MCO",
  custom: "Custom plan",
};

export function PlanRow({
  planType,
  members,
  valuePerHcc,
  onPlanTypeChange,
  onMembersChange,
  onValuePerHccChange,
  onRemove,
  removable,
}: {
  planType: string;
  members: number;
  valuePerHcc: number;
  onPlanTypeChange: (v: string) => void;
  onMembersChange: (v: number) => void;
  onValuePerHccChange: (v: number) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-[1.5fr_1fr_1fr_auto] gap-2.5 items-center">
      <select
        value={planType}
        onChange={(e) => onPlanTypeChange(e.target.value)}
        className="h-[54px] rounded-[14px] border-[1.5px] border-[#E4DED6] bg-white shadow-[0_1px_2px_rgba(40,30,20,0.04)] px-[14px] text-[15px] font-medium text-[#1A1A1A] outline-none transition-colors focus:border-[#EA2C00] focus:shadow-[0_0_0_3px_#FBD9CE]"
      >
        {Object.entries(PLAN_TYPE_LABELS).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
      <Fi value={members} onValueChange={onMembersChange} suffix="members" testId="ed-input-hcc-members" />
      <Fi value={valuePerHcc} onValueChange={onValuePerHccChange} prefix="$" suffix="/HCC" />
      <button
        type="button"
        onClick={onRemove}
        disabled={!removable}
        className="w-[26px] h-[26px] rounded-[8px] border border-[#E7E3DD] bg-white text-[#7C766F] flex items-center justify-center disabled:opacity-30"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function OutcomesTier({
  title,
  tag = "not counted · examples only",
  items,
  note,
}: {
  title: string;
  tag?: string;
  items: { label: string; example?: string }[];
  note: ReactNode;
}) {
  return (
    <>
      <SectionLabel tag={tag} tagVariant="grey">
        {title}
      </SectionLabel>
      <div className="border border-dashed border-[#D8CFC0] rounded-[18px] bg-[#FAF7F2] px-6 py-5">
        <div className="text-[10.5px] font-extrabold tracking-[0.06em] uppercase text-[#7C766F] mb-3">
          Signals we track, no dollar value
        </div>
        <div>
          {items.map((it, i) => (
            <div
              key={it.label}
              className={`flex justify-between items-baseline gap-4 py-2 text-[14px] text-[#565250] ${
                i < items.length - 1 ? "border-b border-[#EDE5D8]" : ""
              }`}
            >
              <span>{it.label}</span>
              {it.example && <span className="text-[12px] text-[#7C766F] italic text-right">{it.example}</span>}
            </div>
          ))}
        </div>
        <div className="mt-[15px] text-[12.5px] text-[#565250] leading-[1.5]">{note}</div>
      </div>
    </>
  );
}
