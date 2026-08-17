import type { ReactNode } from "react";
import { EditorialHeader, EditorialShell } from "./EditorialHeader";

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
  mechanism: string;
  kind: "counted" | "tracked" | "coming-soon";
  /** counted only */
  enabled?: boolean;
  onToggle?: () => void;
  amount?: number; // engine dollars, shown when counted + enabled + ready
  awaiting?: string; // scale-gate need phrase, when counted + enabled + not ready
  levers?: ReactNode; // expanded content when enabled
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
  grandCaption?: string;
  stepName: string;
  stepIndex: number;
  isValid: boolean;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
  onDataRequest?: () => void;
}

const sectCls = "text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#8C8073]";

function Toggle({ on, onClick }: { on: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
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

function DriverRow({ row, depth = 0 }: { row: LedgerRow; depth?: number }) {
  const isCounted = row.kind === "counted";
  const isComing = row.kind === "coming-soon";
  const on = Boolean(row.enabled);
  return (
    <div className={`py-6 border-b border-[#EDE8E1] ${depth > 0 ? "pl-6" : ""}`}>
      <div className="flex justify-between items-start gap-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-abridge text-[20px] leading-[1.15] ${isComing || (!on && isCounted) ? "text-[#9A9086]" : "text-[#1A1A1A]"}`}>
              {row.label}
            </span>
            {isComing && (
              <span className="text-[9px] font-extrabold tracking-[0.06em] uppercase text-[#B0A99E] border border-[#E7E1D8] rounded-[5px] px-[6px] py-[2px]">Coming soon</span>
            )}
          </div>
          <div className={`text-[13px] mt-[6px] leading-[1.5] max-w-[420px] ${isComing ? "text-[#B7AEA2]" : "text-[#8C8073]"}`}>{row.mechanism}</div>
        </div>
        <div className="flex items-center gap-[14px] flex-shrink-0">
          {isCounted && on && row.amount != null && !row.awaiting && (
            <span className="font-abridge text-[22px] text-[#EA2C00] whitespace-nowrap">{fmtMoney(row.amount)}<span className="font-sans text-[12px] text-[#8C8073]">/yr</span></span>
          )}
          {isCounted && <Toggle on={on} onClick={row.onToggle} />}
          {row.kind === "tracked" && (
            <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#B0A99E]">Tracked</span>
          )}
        </div>
      </div>

      {/* counted + on: the levers + footed math */}
      {isCounted && on && (
        <div className="mt-5">
          {row.awaiting ? (
            <div className="text-[13px] text-[#B0A99E] italic">Enter {row.awaiting} to see this driver.</div>
          ) : (
            row.levers
          )}
        </div>
      )}

      {/* tracked: quiet proof signals */}
      {row.kind === "tracked" && row.signals && row.signals.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          {row.signals.map((s) => (
            <span key={s} className="flex items-center gap-[7px] text-[13px] text-[#6E675C]">
              <span className="w-[5px] h-[5px] rounded-full bg-[#C9BDAD]" />{s}
            </span>
          ))}
        </div>
      )}

      {/* nested children */}
      {row.children && row.children.length > 0 && (
        <div className="mt-3">
          {row.children.map((c) => (
            <DriverRow key={c.id} row={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DriverLedger(props: DriverLedgerProps) {
  const { eyebrow, title, intro, sectionLabel, rows, ledgerGroups, grandLabel, grandValue, grandCaption } = props;
  return (
    <EditorialShell>
      <EditorialHeader stepName={props.stepName} stepIndex={props.stepIndex} onBack={props.onBack} onHome={props.onHome} onDataRequest={props.onDataRequest} />
      <div className="max-w-[1120px] mx-auto px-5 sm:px-8 lg:px-12 pt-12 pb-14">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">{eyebrow}</div>
        <h1 className="font-abridge text-[27px] sm:text-[34px] lg:text-[38px] leading-[1.1] text-[#1A1A1A] mt-[10px] max-w-[640px]">{title}</h1>
        <p className="text-[16px] text-[#565250] mt-[12px] max-w-[600px] leading-[1.55]">{intro}</p>

        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1px_0.8fr] gap-x-[56px] gap-y-10 mt-[46px]">
          {/* LEFT — driver ledger */}
          <div>
            <div className={sectCls}>{sectionLabel}</div>
            <div className="mt-2">
              {rows.map((r) => (
                <DriverRow key={r.id} row={r} />
              ))}
            </div>
          </div>

          {/* vertical hairline */}
          <div className="hidden lg:block bg-[#E8E2DA]" />

          {/* RIGHT — the ledger that adds up */}
          <div>
            <div className={sectCls}>Your model</div>
            {ledgerGroups.map((g) => (
              <div key={g.label}>
                <div className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-[#6E675C] mt-[26px] mb-[2px]">{g.label}</div>
                {g.items.map((it) => (
                  <div key={it.label} className={`flex justify-between items-baseline py-[11px] border-b border-[#EDE8E1] text-[14.5px] ${it.tone === "dim" ? "text-[#8C8073]" : "text-[#3A342E]"}`}>
                    <span>{it.label}</span>
                    <span className={`font-abridge text-[16px] ${it.tone === "dim" ? "text-[#9A9086] font-sans !text-[14px]" : it.tone === "on" ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}>{it.value}</span>
                  </div>
                ))}
                {g.subtotal && (
                  <div className="flex justify-between items-baseline py-[13px] border-b-2 border-[#E4DACE] text-[14px] font-bold uppercase tracking-[0.04em] text-[#1A1A1A]">
                    <span>{g.subtotal.label}</span>
                    <span className="font-abridge text-[19px] normal-case tracking-normal">{g.subtotal.value}</span>
                  </div>
                )}
              </div>
            ))}

            <div className="mt-[26px] pt-[22px] border-t-2 border-[#1A1A1A]">
              <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#8C8073]">{grandLabel}</div>
              <div className="font-abridge text-[52px] leading-[0.9] text-[#EA2C00] mt-2">{grandValue}</div>
              {grandCaption && <div className="text-[12.5px] text-[#8C8073] mt-[10px] leading-[1.5] max-w-[300px]">{grandCaption}</div>}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-14">
          <button
            type="button"
            disabled={!props.isValid}
            onClick={props.onNext}
            data-testid="driver-continue"
            className="bg-[#EA2C00] text-white text-[15px] font-bold px-7 py-[14px] rounded-[12px] shadow-[0_2px_6px_rgba(234,44,0,0.15)] disabled:opacity-40"
          >
            Continue →
          </button>
        </div>
      </div>
    </EditorialShell>
  );
}

export { fmtMoney };
