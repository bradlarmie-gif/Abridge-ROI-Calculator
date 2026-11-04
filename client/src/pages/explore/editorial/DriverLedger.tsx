import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { EditorialHeader, EditorialShell } from "./EditorialHeader";
import { CapacityGoalArt, QualityGoalArt, RetentionGoalArt, RevenueGoalArt } from "@/pages/hub/hubArt";
import { useCountUp } from "@/lib/useCountUp";

// One drawing per value step, from the goal-tile set.
const STEP_ART: Record<string, ReactNode> = {
  Capacity: <CapacityGoalArt />,
  Workforce: <RetentionGoalArt />,
  Revenue: <RevenueGoalArt />,
  Quality: <QualityGoalArt />,
};

/**
 * Shared V2 value-driver layout: a single-column driver ledger on the left
 * (each driver a hairline row you turn on; counted rows expand to their levers
 * and a footed dollar; tracked rows carry a quiet proof marker; a parent row
 * can nest children), and a running ledger on the right that adds every driver
 * up across all four domains to a "Model so far" total. One vertical hairline,
 * no cards — matches the Practice/Time editorial language.
 */

export interface LedgerRow {
  id: string;
  label: string;
  /** optional small group heading rendered above this row (e.g. "Harm events") */
  subhead?: string;
  mechanism: string;
  kind: "counted" | "tracked" | "coming-soon";
  /** counted only */
  enabled?: boolean;
  onToggle?: () => void;
  amount?: number; // engine dollars, shown when counted + enabled + ready
  awaiting?: string; // scale-gate need phrase, when counted + enabled + not ready
  levers?: ReactNode; // expanded content when enabled
  expanded?: boolean; // whether the levers are shown (chevron collapses them); defaults open
  onToggleExpand?: () => void;
  /** tracked only: a couple of short proof signals */
  signals?: string[];
  /** nested rows (e.g. Administrative Efficiency → UM + CDI) */
  children?: LedgerRow[];
}

export interface LedgerLineItem {
  label: string;
  value: string;
  tone?: "on" | "dim";
}
export interface LedgerGroup {
  label: string;
  items: LedgerLineItem[];
  subtotal?: { label: string; value: string };
}

export interface DriverLedgerProps {
  eyebrow: string;
  title: string;
  intro: string;
  sectionLabel: string;
  rows: LedgerRow[];
  ledgerGroups: LedgerGroup[];
  grandLabel: string;
  grandValue: string;
  /** False until the running total is real, so the coral hero never fires on $0. */
  grandHasValue?: boolean;
  grandCaption?: string;
  stepName: string;
  stepIndex: number;
  isValid: boolean;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
  onDataRequest?: () => void;
  /** optional control rendered above the ledger (e.g. the OP payment-model toggle) */
  headerControl?: ReactNode;
}


function Toggle({ on, onClick, label }: { on: boolean; onClick?: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={on}
      aria-label={label ? `${label}, ${on ? "on" : "off"}` : undefined}
      className={`relative w-[42px] h-[25px] rounded-full flex-shrink-0 transition-colors ${on ? "bg-[#EA2C00]" : "bg-[#DDD5C9]"}`}
    >
      <span className={`absolute top-[3px] w-[19px] h-[19px] rounded-full bg-white transition-[left] ${on ? "left-[20px]" : "left-[3px]"}`} />
    </button>
  );
}

const fmtMoney = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
};

/**
 * One driver as a card. Off: the name and the switch, nothing else. On: a white
 * card that opens to what it is (the mechanism), its inputs, and its dollar.
 * Tracked rows carry a quiet pill and their proof signals; coming-soon rows sit
 * muted. Children nest inside their parent card.
 */
function DriverRow({ row, depth = 0 }: { row: LedgerRow; depth?: number }) {
  const isCounted = row.kind === "counted";
  const isComing = row.kind === "coming-soon";
  const isTracked = row.kind === "tracked";
  const on = Boolean(row.enabled);
  const expanded = row.expanded ?? true;
  const open = isCounted && on;
  return (
    <>
    {row.subhead && (
      <div className="text-[10.5px] font-extrabold tracking-[0.1em] uppercase text-[#443A32] pt-3 pb-1 px-1 first:pt-0">{row.subhead}</div>
    )}
    <div className={`rounded-[16px] border transition-all duration-200 ${depth > 0 ? "mt-2" : ""} ${
      open
        ? "bg-white border-[#E9E0D4] shadow-[0_1px_2px_rgba(26,26,26,0.04),0_8px_22px_-16px_rgba(26,26,26,0.16)]"
        : isComing
          ? "bg-[#F8F5F0]/70 border-[#EBE3D8]"
          : "bg-[#FBF8F4]/80 border-[#EBE3D8] hover:border-[#DDD2C4]"
    }`}>
      <div className="flex items-center justify-between gap-4 px-4 sm:px-5 py-3.5">
        <button type="button" onClick={isCounted ? row.onToggle : undefined} className={`flex-1 min-w-0 text-left outline-none ${isCounted ? "cursor-pointer" : "cursor-default"}`}>
          <span className="flex items-center gap-2 flex-wrap">
            <span className={`text-[15.5px] font-semibold ${isComing ? "text-[#A79E92]" : open ? "text-[#1A1A1A]" : "text-[#443A32]"}`}>{row.label}</span>
            {isComing && <span className="text-[9.5px] font-extrabold tracking-[0.06em] uppercase text-[#8A8072] bg-white border border-[#E6DCCE] rounded-full px-2 py-0.5">Coming soon</span>}
          </span>
        </button>
        <div className="flex items-center gap-3 flex-shrink-0">
          {open && row.amount != null && !row.awaiting && (
            <span className="font-abridge text-[17px] text-[#EA2C00] whitespace-nowrap tabular-nums">{fmtMoney(row.amount)}<span className="font-sans text-[11.5px] text-[#6B6259]">/yr</span></span>
          )}
          {open && row.onToggleExpand && (
            <button type="button" onClick={row.onToggleExpand} aria-label={expanded ? "Collapse details" : "Expand details"}
              className="w-7 h-7 rounded-full border border-[#E2D8CB] bg-white text-[#8A8072] flex items-center justify-center hover:border-[#EA2C00] hover:text-[#EA2C00] transition-colors">
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "" : "-rotate-90"}`} strokeWidth={2} />
            </button>
          )}
          {isCounted && <Toggle on={on} onClick={row.onToggle} label={row.label} />}
          {isTracked && <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#6B6259] bg-white border border-[#E2D8CB] rounded-full px-2.5 py-1">Tracked</span>}
        </div>
      </div>

      {open && expanded && (
        <div className="px-4 sm:px-5 pb-4">
          <p className="text-[13px] text-[#565250] leading-[1.55] max-w-[560px] mb-4">{row.mechanism}</p>
          {row.awaiting ? (
            <div className="text-[13px] text-[#6B6259]">Enter {row.awaiting} to see this driver.</div>
          ) : (
            row.levers
          )}
        </div>
      )}

      {isTracked && row.signals && row.signals.length > 0 && (
        <div className="px-4 sm:px-5 pb-3.5 -mt-1 flex flex-wrap gap-1.5">
          {row.signals.map((sig) => (
            <span key={sig} className="text-[12px] text-[#565250] bg-white border border-[#EBE3D8] rounded-full px-2.5 py-0.5">{sig}</span>
          ))}
        </div>
      )}

      {row.children && row.children.length > 0 && (
        <div className="px-2.5 pb-2.5">
          {row.children.map((c) => (
            <DriverRow key={c.id} row={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
    </>
  );
}

/** "$1.2M / yr" → 1200000, so the grand total can count up. */
function parseMoney(v: string): number | null {
  const m = v.replace(/,/g, "").match(/\$?(-?[\d.]+)\s*([KM])?/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!isFinite(n)) return null;
  const k = (m[2] || "").toUpperCase();
  return k === "M" ? n * 1_000_000 : k === "K" ? n * 1_000 : n;
}

function GrandTotal({ value, hasValue }: { value: string; hasValue: boolean }) {
  const target = parseMoney(value);
  const shown = useCountUp(hasValue && target != null ? target : 0);
  const unit = value.includes("/") ? value.slice(value.indexOf("/")).trim() : "";
  const text = hasValue && target != null ? `${fmtMoney(shown)}${unit ? ` ${unit}` : ""}` : value;
  return <span className="tabular-nums">{text}</span>;
}

export default function DriverLedger(props: DriverLedgerProps) {
  const { eyebrow, title, intro, rows, ledgerGroups, grandLabel, grandValue, grandHasValue = true, grandCaption } = props;
  return (
    <EditorialShell>
      <EditorialHeader stepName={props.stepName} stepIndex={props.stepIndex} onBack={props.onBack} onHome={props.onHome} onDataRequest={props.onDataRequest} />
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-14">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">{eyebrow}</div>
        <h1 className="font-abridge text-[27px] sm:text-[34px] lg:text-[38px] leading-[1.1] text-[#1A1A1A] mt-[10px] max-w-[680px]">{title}</h1>
        <p className="text-[16px] text-[#565250] mt-[12px] max-w-[600px] leading-[1.55]">{intro}</p>

        {props.headerControl && <div className="mt-[26px]">{props.headerControl}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] gap-6 lg:gap-8 items-start mt-9">
          {/* LEFT — the drivers, in one tan card headed by this step's drawing */}
          <section className="rounded-[22px] border border-[#E9E0D4] bg-[#F6F1EA]/90 overflow-hidden">
            <header className="flex items-center gap-4 px-4 sm:px-5 py-3.5">
              <div className="flex-none w-[76px] h-[48px] rounded-[12px] border border-[#E6DCCE] bg-[#EFE7DC]/70 px-1.5 py-1">{STEP_ART[props.stepName] ?? null}</div>
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#443A32]">{props.stepName}</div>
                <div className="text-[12.5px] text-[#6B6259] mt-0.5">Turn on what applies</div>
              </div>
            </header>
            <div className="px-2.5 pb-2.5 space-y-2">
              {rows.map((r) => (
                <DriverRow key={r.id} row={r} />
              ))}
            </div>
          </section>

          {/* RIGHT — the model so far, then Continue directly under it */}
          <div className="space-y-4">
            <div className="rounded-[22px] border border-[#E9E0D4] bg-white shadow-[0_1px_2px_rgba(26,26,26,0.04),0_16px_40px_-24px_rgba(26,26,26,0.24)] overflow-hidden">
              <div className="px-6 pt-5 pb-4 bg-[#F6F1EA]/80 border-b border-[#E6DCCF] text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#EA2C00]">Your model</div>
              <div className="px-6 pb-6">
                {ledgerGroups.map((g) => (
                  <div key={g.label}>
                    <div className="text-[10.5px] font-extrabold tracking-[0.1em] uppercase text-[#443A32] mt-5 mb-1">{g.label}</div>
                    {g.items.map((it) => (
                      <div key={it.label} className="flex justify-between items-baseline gap-3 py-[9px] border-b border-[#EFE8DE] text-[14px]">
                        <span className={it.tone === "dim" ? "text-[#6B6259]" : "text-[#1A1A1A]"}>{it.label}</span>
                        <span className={`tabular-nums whitespace-nowrap ${it.tone === "dim" ? "text-[12.5px] text-[#6B6259]" : it.tone === "on" ? "font-abridge text-[16px] text-[#EA2C00]" : "font-abridge text-[16px] text-[#1A1A1A]"}`}>{it.value}</span>
                      </div>
                    ))}
                    {g.subtotal && (
                      <div className="flex justify-between items-baseline py-[11px] text-[12.5px] font-extrabold uppercase tracking-[0.06em] text-[#1A1A1A]">
                        <span>{g.subtotal.label}</span>
                        <span className="font-abridge text-[18px] normal-case tracking-normal">{g.subtotal.value}</span>
                      </div>
                    )}
                  </div>
                ))}

                <div className="mt-5 rounded-[16px] bg-[#F6F1EA] border border-[#E9E0D4] px-5 py-4">
                  <div className="text-[10.5px] font-extrabold tracking-[0.1em] uppercase text-[#443A32]">{grandLabel}</div>
                  <div className={`font-abridge text-[44px] leading-[0.95] mt-1.5 ${grandHasValue ? "text-[#EA2C00]" : "text-[#C9BDAD]"}`}>
                    <GrandTotal value={grandValue} hasValue={grandHasValue} />
                  </div>
                  {grandCaption && <div className="text-[12.5px] text-[#565250] mt-2 leading-[1.5]">{grandCaption}</div>}
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={!props.isValid}
              onClick={props.onNext}
              data-testid="driver-continue"
              className="w-full bg-[#EA2C00] text-white text-[15px] font-bold px-7 py-[15px] rounded-full hover:bg-[#d12800] transition-colors shadow-[0_10px_24px_-12px_rgba(234,44,0,0.6)] disabled:opacity-40 disabled:shadow-none"
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    </EditorialShell>
  );
}

export { fmtMoney };
