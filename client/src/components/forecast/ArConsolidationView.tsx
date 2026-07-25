// client/src/components/forecast/ArConsolidationView.tsx
// The consolidation hero (Direction: "fold it onto what you already run").
// Two stacked horizontal bars share one order and one set of widths, so each
// tool sits directly below itself. The top bar is today's documentation spend in
// warm tan; the bottom bar splits each tool into the coral portion Abridge takes
// on (freed) and the tan portion that stays. Hover a tool anywhere to dim the
// rest, highlight it in both bars, and float one clamped, arrow-pinned tooltip.
//
// Data-driven from the rep's real entries; no hardcoded vendors. Pure model math
// lives in buildConsolidationModel so it can be unit-tested.
import { useLayoutEffect, useRef, useState } from "react";
import {
  buildStackBars,
  computeNet,
  type AppRatItem,
} from "@/lib/appRationalizationCalc";

// Warm neutrals cycled across today's segments; stays uses the palest tone so a
// residual reads as "kept, not freed" in both bars.
const TAN_SHADES = ["#C4B39E", "#B3A188", "#CBBCA6", "#BFAE98", "#C9B8A2", "#BCAB94"];
const STAYS_COLOR = "#E7DCCE";
const CORAL = "#EA2C00";

function fmtM(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `$${Math.round(a / 1_000)}K`;
  return `$${Math.round(a)}`;
}

// Full dollars, e.g. $1,565,000 — for the right-side rail and stat values.
function fmtFull(n: number): string {
  return `$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
}

export interface ConsolidationRow {
  id: string;
  name: string;
  spend: number;
  retired: number; // itemRetired — the freed portion of this tool
  stays: number; // itemStays — the residual that stays on
  widthPct: number; // spend / stackTotal * 100 (the tool's slot in both bars)
  retiredPct: number; // retired / spend * 100 (coral share within the slot)
  staysPct: number; // stays / spend * 100 (tan share within the slot)
  freedSharePct: number; // retired / freed * 100 (share of the freed total)
  staysOnly: boolean; // coveragePct 0 → nothing freed, wholly residual
  shade: string; // tan shade for this tool
}

export interface ConsolidationModel {
  rows: ConsolidationRow[];
  stackTotal: number;
  freed: number; // sum of retired
  stays: number; // sum of stays
  vendorCount: number;
}

/** Per-tool widths and freed shares for the two bars, spend-only, in order. */
export function buildConsolidationModel(items: AppRatItem[]): ConsolidationModel {
  const bars = buildStackBars(items);
  const stackTotal = bars.stackTotal;
  const freed = bars.sunset;
  const rows: ConsolidationRow[] = bars.tools.map((t, i) => ({
    id: t.id,
    name: t.name,
    spend: t.spend,
    retired: t.sunset,
    stays: t.stays,
    widthPct: stackTotal > 0 ? (t.spend / stackTotal) * 100 : 0,
    retiredPct: t.spend > 0 ? (t.sunset / t.spend) * 100 : 0,
    staysPct: t.spend > 0 ? (t.stays / t.spend) * 100 : 0,
    freedSharePct: freed > 0 ? Math.round((t.sunset / freed) * 100) : 0,
    staysOnly: t.sunset === 0,
    shade: TAN_SHADES[i % TAN_SHADES.length],
  }));
  return { rows, stackTotal, freed, stays: bars.stays, vendorCount: rows.length };
}

/**
 * Left offset (percent of the bar width) of the coral (freed) region: the sum of
 * the slot widths of any leading stays-only tools before the first tool that has
 * a coral portion. Anchoring the "Freed every year" overlay here keeps its white
 * type on coral no matter which tool sits leftmost. Assumes freed > 0 (a coral
 * tool exists); returns 0 if none is found.
 */
export function freedRegionLeftPct(
  rows: Pick<ConsolidationRow, "widthPct" | "retired">[],
): number {
  let offset = 0;
  for (const r of rows) {
    if (r.retired > 0) break;
    offset += r.widthPct;
  }
  return offset;
}

export default function ArConsolidationView({
  items,
  abridgePrice,
}: {
  items: AppRatItem[];
  abridgePrice: number;
}) {
  const model = buildConsolidationModel(items);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const afterBarRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  // Position the single floating tooltip: pin its arrow to the hovered tool's
  // slot center in the after bar, then slide the box so it stays fully in view.
  // Direct DOM writes (like the source mockup) avoid a second render for layout.
  useLayoutEffect(() => {
    const tip = tipRef.current;
    const bar = afterBarRef.current;
    if (!hoverId || !tip || !bar) return;
    const seg = bar.querySelector<HTMLElement>(`[data-tool="${hoverId}"]`);
    if (!seg) return;
    const br = bar.getBoundingClientRect();
    const sr = seg.getBoundingClientRect();
    const cx = sr.left + sr.width / 2 - br.left; // arrow target = slot center
    const bw = tip.offsetWidth;
    const boxLeft = Math.max(0, Math.min(cx - bw / 2, br.width - bw)); // clamp
    tip.style.left = `${boxLeft}px`;
    tip.style.setProperty("--ax", `${cx - boxLeft}px`); // arrow stays pinned
  }, [hoverId]);

  if (model.stackTotal === 0) {
    return (
      <div
        className="rounded-[20px] p-10 text-center text-sm text-[#8C7E6E]"
        style={{ background: "linear-gradient(160deg,#FDFBF8,#F6F1EA)", border: "1px solid #E8E2DA" }}
        data-testid="ar-consolidation-empty"
      >
        Add applications with annual spend to see the consolidation.
      </div>
    );
  }

  const net = computeNet(items, abridgePrice);
  const alreadyInPlace = net.abridgePrice === 0;
  const staysOnlyRows = model.rows.filter((r) => r.staysOnly);
  const hovered = hoverId ? model.rows.find((r) => r.id === hoverId) ?? null : null;
  const focus = hoverId !== null;
  const dimFor = (id: string) => focus && id !== hoverId;

  const tipText = hovered
    ? hovered.staysOnly
      ? `${hovered.name} · ${fmtM(hovered.spend)} · stays on (clinical reference)`
      : `${hovered.name} · ${fmtM(hovered.retired)} · ${hovered.freedSharePct}% of freed`
    : "";

  return (
    <div
      className="rounded-[20px] p-6 md:p-8"
      style={{ background: "linear-gradient(160deg,#FDFBF8,#F6F1EA)", border: "1px solid #E8E2DA" }}
      data-testid="ar-consolidation"
    >
      {/* Headline + generalized, claim-safe subhead */}
      <h2 className="font-abridge text-[30px] md:text-[34px] leading-[1.05] text-[#1A1A1A]">
        Fold it onto what you already run.
      </h2>
      <p className="text-[15px] md:text-[16px] text-[#8C7E6E] mt-3.5 max-w-[620px] leading-[1.5]">
        You already pay for Abridge, so the documentation and scribe spend that overlaps it
        doesn&rsquo;t move to a new bill. It just goes away. Tools Abridge doesn&rsquo;t replace,
        like clinical reference, stay on.
      </p>

      <div className="mt-10 md:mt-12">
        {/* TODAY */}
        <div className="mb-7">
          <div className="flex justify-between items-baseline mb-3">
            <span className="text-[12px] font-extrabold tracking-[0.08em] uppercase text-[#443A32]">
              Documentation spend today
            </span>
            <span className="text-[13.5px] text-[#8C7E6E] tabular-nums">
              <b className="font-abridge text-[18px] font-normal text-[#1A1A1A]">{fmtFull(model.stackTotal)}</b>{" "}
              / yr · {model.vendorCount} {model.vendorCount === 1 ? "vendor" : "vendors"}
            </span>
          </div>
          <div className="flex h-[52px] rounded-[10px] overflow-hidden" data-testid="ar-today-bar">
            {model.rows.map((r) => (
              <div
                key={r.id}
                data-tool={r.id}
                data-testid={`ar-today-seg-${r.id}`}
                onMouseEnter={() => setHoverId(r.id)}
                onMouseLeave={() => setHoverId(null)}
                className="h-full border-r-2 border-[#FDFCFA] last:border-r-0 transition-opacity duration-200"
                style={{
                  width: `${r.widthPct}%`,
                  background: r.staysOnly ? STAYS_COLOR : r.shade,
                  opacity: dimFor(r.id) ? 0.25 : 1,
                }}
              />
            ))}
          </div>
        </div>

        {/* AFTER FOLD-IN */}
        <div>
          <div className="flex justify-between items-baseline mb-3">
            <span className="text-[12px] font-extrabold tracking-[0.08em] uppercase text-[#443A32]">
              After you fold in
            </span>
            <span className="text-[13.5px] text-[#8C7E6E] tabular-nums">
              <b className="font-abridge text-[18px] font-normal text-[#EA2C00]">{fmtFull(model.freed)}</b>{" "}
              / yr freed · {fmtM(model.stays)} stays on
            </span>
          </div>

          <div className="relative">
            {/* single floating tooltip, clamped in view, arrow pinned to slot */}
            <div
              ref={tipRef}
              className="pointer-events-none absolute top-full z-20 mt-3 rounded-[9px] bg-[#2E2822] px-3 py-[7px] text-[12.5px] font-bold text-white whitespace-nowrap shadow-[0_5px_16px_rgba(0,0,0,0.20)] transition-opacity duration-150"
              style={{ left: 0, opacity: hovered ? 1 : 0 }}
              data-testid="ar-consolidation-tip"
            >
              {tipText}
              <span
                className="absolute bottom-full h-0 w-0 border-[6px] border-transparent border-b-[#2E2822]"
                style={{ left: "var(--ax, 50%)", transform: "translateX(-50%)" }}
              />
            </div>

            {/* freed overlay: hidden while focused. Anchored to the LEFT EDGE of
                the coral region (past any leading stays-only tools) so the white
                type always lands on coral, never on tan. */}
            {model.freed > 0 && (
              <div
                className="pointer-events-none absolute top-1/2 z-[2] -translate-y-1/2 pl-[22px] transition-opacity duration-200"
                style={{ left: `${freedRegionLeftPct(model.rows)}%`, opacity: focus ? 0 : 1 }}
              >
                <span className="block text-[11px] font-extrabold uppercase tracking-[0.09em] text-white/85">
                  Freed every year
                </span>
                <span className="mt-[3px] block font-abridge text-[21px] leading-none text-white tabular-nums">
                  {fmtFull(model.freed)}
                  <span className="text-[12px] text-white/70"> / yr</span>
                </span>
              </div>
            )}

            <div ref={afterBarRef} className="flex h-[52px] rounded-[10px] overflow-hidden" data-testid="ar-after-bar">
              {model.rows.map((r) => (
                <div
                  key={r.id}
                  data-tool={r.id}
                  data-testid={`ar-after-seg-${r.id}`}
                  onMouseEnter={() => setHoverId(r.id)}
                  onMouseLeave={() => setHoverId(null)}
                  className="flex h-full border-r-2 border-[#FDFCFA] last:border-r-0"
                  style={{ width: `${r.widthPct}%` }}
                >
                  {r.retired > 0 && (
                    <div
                      className="h-full transition-opacity duration-200"
                      style={{
                        width: `${r.retiredPct}%`,
                        background: hoverId === r.id ? "#B02200" : CORAL,
                        opacity: dimFor(r.id) ? 0.32 : 1,
                      }}
                    />
                  )}
                  {r.stays > 0 && (
                    <div
                      className="h-full transition-opacity duration-200"
                      style={{
                        width: `${r.staysPct}%`,
                        background: STAYS_COLOR,
                        opacity: dimFor(r.id) ? 0.25 : 1,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Legend: persistent labels, also hover targets */}
          <div className="flex flex-wrap gap-2.5 mt-4">
            {model.rows.map((r) => (
              <div
                key={r.id}
                onMouseEnter={() => setHoverId(r.id)}
                onMouseLeave={() => setHoverId(null)}
                className="flex items-center gap-2 rounded-[10px] border border-[#EEE7DD] bg-[#F7F2EC] px-[13px] py-2 transition-opacity duration-200"
                style={{ opacity: dimFor(r.id) ? 0.28 : 1 }}
                data-testid={`ar-legend-${r.id}`}
              >
                <span
                  className="w-[11px] h-[11px] rounded-[3px] shrink-0"
                  style={{ background: r.staysOnly ? STAYS_COLOR : r.shade }}
                />
                <span className="text-[13px] font-bold text-[#2E2822]">{r.name}</span>
                <span className="text-[13px] font-semibold text-[#6A5F52] tabular-nums">{fmtM(r.spend)}</span>
                {r.staysOnly && (
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.05em] text-[#8C7E6E] bg-white border border-[#E0D6C8] rounded-full px-[7px] py-[2px]">
                    Stays
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Already-in-place note (abridgePrice 0) vs net note (abridgePrice > 0) */}
          {alreadyInPlace ? (
            <div className="flex items-center gap-2.5 text-[13.5px] text-[#8C7E6E] mt-11" data-testid="ar-already-note">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.04em] text-[#EA2C00] bg-[#FFEDE7] rounded-full px-[11px] py-1 whitespace-nowrap">
                Already in place
              </span>
              Abridge is a cost you already carry, so nothing new gets added here. These tools just fold onto it.
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-[13.5px] text-[#8C7E6E] mt-11" data-testid="ar-net-note">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.04em] text-[#443A32] bg-[#F5F0EB] border border-[#E8E2DA] rounded-full px-[11px] py-1 whitespace-nowrap">
                Net of Abridge
              </span>
              {net.isNetCost ? (
                <span>
                  The <b className="text-[#2E2822] font-bold tabular-nums">{fmtM(net.abridgePrice)}</b> / yr Abridge
                  price runs <b className="text-[#2E2822] font-bold tabular-nums">{fmtM(-net.netSavings)}</b> / yr
                  above what these tools free today.
                </span>
              ) : (
                <span>
                  Net of the <b className="text-[#2E2822] font-bold tabular-nums">{fmtM(net.abridgePrice)}</b> / yr
                  Abridge price, <b className="text-[#EA2C00] font-bold tabular-nums">{fmtM(net.netSavings)}</b> / yr
                  comes back.
                </span>
              )}
            </div>
          )}

          <p className="text-[13px] text-[#8C7E6E] mt-3.5">
            Hover any tool to see its share of the freed total.
            {staysOnlyRows.length > 0 && (
              <>
                {" "}
                What stays on both bars:{" "}
                {staysOnlyRows.map((r, i) => (
                  <span key={r.id}>
                    <b className="text-[#2E2822] font-bold">
                      {r.name} ({fmtM(r.spend)})
                    </b>
                    {i < staysOnlyRows.length - 2 ? ", " : i === staysOnlyRows.length - 2 ? " and " : ""}
                  </span>
                ))}
                . Abridge doesn&rsquo;t replace these.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 mt-12 border-t border-b border-[#E8E2DA]" data-testid="ar-consolidation-stats">
        <div className="py-[22px] border-r border-[#E8E2DA] pr-7">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-[#443A32]">
            Documentation spend today
          </div>
          <div className="font-abridge text-[30px] mt-2 text-[#1A1A1A] tabular-nums">
            {fmtFull(model.stackTotal)}
            <span className="text-[13px] text-[#8C7E6E] font-sans font-normal"> / yr</span>
          </div>
        </div>
        <div className="py-[22px] border-r border-[#E8E2DA] px-7">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-[#443A32]">
            Still on after fold-in
          </div>
          <div className="font-abridge text-[30px] mt-2 text-[#1A1A1A] tabular-nums">
            {fmtFull(model.stays)}
            <span className="text-[13px] text-[#8C7E6E] font-sans font-normal"> / yr</span>
          </div>
        </div>
        <div className="py-[22px] pl-7">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-[#443A32]">
            Freed every year
          </div>
          <div className="font-abridge text-[30px] mt-2 text-[#EA2C00] tabular-nums">
            {fmtFull(model.freed)}
            <span className="text-[13px] text-[#8C7E6E] font-sans font-normal"> / yr</span>
          </div>
        </div>
      </div>
    </div>
  );
}
