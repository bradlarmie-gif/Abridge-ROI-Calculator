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
import { useState } from "react";
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

  if (model.stackTotal === 0) {
    return (
      <div
        className="rounded-[20px] p-10 text-center text-sm text-[#8C7E6E]"
        style={{ background: "#FDFBF8", border: "1px solid #E8E2DA" }}
        data-testid="ar-consolidation-empty"
      >
        Add applications with annual spend to see the consolidation.
      </div>
    );
  }

  const net = computeNet(items, abridgePrice);
  const alreadyInPlace = net.abridgePrice === 0;
  const focus = hoverId !== null;
  const dimFor = (id: string) => focus && id !== hoverId;

  return (
    <div
      className="rounded-[20px] p-6 md:p-8"
      style={{ background: "#FDFBF8", border: "1px solid #E8E2DA" }}
      data-testid="ar-consolidation"
    >
      {/* Headline + generalized, claim-safe subhead */}
      <h2 className="font-abridge text-[30px] md:text-[34px] leading-[1.05] text-[#1A1A1A]">
        Consolidate it onto what you already run.
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
                className="h-full border-r-2 border-[#FFFFFF] last:border-r-0 transition-opacity duration-200"
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
              After you consolidate
            </span>
            <span className="text-[13.5px] text-[#8C7E6E] tabular-nums">
              <b className="font-abridge text-[18px] font-normal text-[#EA2C00]">{fmtFull(model.freed)}</b>{" "}
              / yr freed · {fmtM(model.stays)} stays on
            </span>
          </div>

          <div>
            {/* The freed total lives only on the "After you fold in" header row (right side).
                The per-tool detail lives in the persistent legend below (enriched on
                hover), so there is no floating tooltip to overlap the labels.

                Grouped read: ALL freed (coral) on the left as one contiguous block,
                ALL stays (tan) on the right. Per-tool sub-segments keep hover/share. */}
            {/* Region labels so each side of the bar is self-explanatory, hover or not:
                the coral block (left) is what folds onto Abridge, the tan block (right) stays. */}
            <div className="flex mb-2 text-[10px] font-extrabold uppercase tracking-[0.06em]" aria-hidden data-testid="ar-after-labels">
              {model.freed > 0 && (
                <div style={{ width: `${(model.freed / model.stackTotal) * 100}%` }} className="text-[#EA2C00]">
                  Freed onto Abridge
                </div>
              )}
              {model.stays > 0 && (
                <div style={{ width: `${(model.stays / model.stackTotal) * 100}%` }} className="text-[#A89A88] text-right">
                  Stays on
                </div>
              )}
            </div>
            <div className="flex h-[52px] rounded-[10px] overflow-hidden" data-testid="ar-after-bar">
              {model.rows.filter((r) => r.retired > 0).map((r) => (
                <div
                  key={`f-${r.id}`}
                  data-tool={r.id}
                  data-testid={`ar-after-seg-${r.id}`}
                  onMouseEnter={() => setHoverId(r.id)}
                  onMouseLeave={() => setHoverId(null)}
                  className="h-full border-r-2 border-[#FFFFFF] transition-opacity duration-200"
                  style={{
                    width: `${(r.retired / model.stackTotal) * 100}%`,
                    background: hoverId === r.id ? "#B02200" : CORAL,
                    opacity: dimFor(r.id) ? 0.32 : 1,
                  }}
                />
              ))}
              {model.rows.filter((r) => r.stays > 0).map((r, i, arr) => (
                <div
                  key={`s-${r.id}`}
                  data-tool={r.staysOnly ? r.id : undefined}
                  data-testid={`ar-after-stays-${r.id}`}
                  onMouseEnter={() => setHoverId(r.id)}
                  onMouseLeave={() => setHoverId(null)}
                  className={`h-full border-r-2 border-[#FFFFFF] transition-opacity duration-200 ${i === arr.length - 1 ? "!border-r-0" : ""}`}
                  style={{
                    width: `${(r.stays / model.stackTotal) * 100}%`,
                    background: STAYS_COLOR,
                    opacity: dimFor(r.id) ? 0.25 : 1,
                  }}
                />
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
                {hoverId === r.id && !r.staysOnly && (
                  <span className="text-[12px] font-bold text-[#EA2C00] tabular-nums whitespace-nowrap">
                    · {fmtM(r.retired)} freed{r.stays > 0 ? ` · ${fmtM(r.stays)} stays` : ""}
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
              Abridge is a cost you already carry, so nothing new gets added here. These tools just consolidate onto it.
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

          {/* Dynamic caption: the whole story in plain dollars by default, and the hovered tool's
              own split on hover — no share-of-pool math, so it reads the way a CFO thinks. */}
          {(() => {
            const h = model.rows.find((r) => r.id === hoverId);
            if (h) {
              return (
                <p className="text-[13px] text-[#8C7E6E] mt-3.5" data-testid="ar-caption">
                  <b className="text-[#2E2822] font-bold">{h.name}</b> is <b className="text-[#2E2822] font-bold tabular-nums">{fmtM(h.spend)}</b> / yr.{" "}
                  {h.staysOnly ? (
                    <>It <b className="text-[#2E2822] font-bold">stays on</b>. Abridge doesn&rsquo;t replace it.</>
                  ) : (
                    <>
                      <b className="text-[#EA2C00] font-bold tabular-nums">{fmtM(h.retired)}</b> folds onto Abridge
                      {h.stays > 0 ? <>, and <b className="text-[#2E2822] font-bold tabular-nums">{fmtM(h.stays)}</b> stays on.</> : <>.</>}
                    </>
                  )}
                </p>
              );
            }
            return (
              <p className="text-[13px] text-[#8C7E6E] mt-3.5" data-testid="ar-caption">
                Of your <b className="text-[#2E2822] font-bold tabular-nums">{fmtM(model.stackTotal)}</b>,{" "}
                <b className="text-[#EA2C00] font-bold tabular-nums">{fmtM(model.freed)}</b> folds onto Abridge and{" "}
                <b className="text-[#2E2822] font-bold tabular-nums">{fmtM(model.stays)}</b> stays on. Hover any tool for its own split.
              </p>
            );
          })()}
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
            Still on after consolidating
          </div>
          <div className="font-abridge text-[30px] mt-2 text-[#1A1A1A] tabular-nums">
            {fmtFull(model.stays)}
            <span className="text-[13px] text-[#8C7E6E] font-sans font-normal"> / yr</span>
          </div>
        </div>
        <div className="py-[22px] pl-7">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-[#443A32]">
            Freed at full consolidation
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
