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
import { useState, type ReactNode } from "react";
import { AnimatedValue } from "@/components/explore/AnimatedValue";
import { ArStepHead, ArLabel } from "@/pages/forecast/appRationalization/ArStepHead";
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
  headerRight,
}: {
  items: AppRatItem[];
  abridgePrice: number;
  headerRight?: ReactNode;
}) {
  const model = buildConsolidationModel(items);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const net = computeNet(items, abridgePrice);
  const alreadyInPlace = net.abridgePrice === 0;
  const focus = hoverId !== null;
  const dimFor = (id: string) => focus && id !== hoverId;

  const intro = alreadyInPlace
    ? <>Abridge is already paid for, so the spend that overlaps it doesn&rsquo;t move to a new bill. It goes away. Tools Abridge doesn&rsquo;t replace stay on.</>
    : <>The spend that overlaps Abridge comes off the bill. Tools Abridge doesn&rsquo;t replace stay on.</>;
  const head = <ArStepHead title="Consolidate it onto what you already run." intro={intro} right={headerRight} />;

  if (model.stackTotal === 0) {
    return (
      <div>
        {head}
        <div className="mt-8 rounded-[24px] p-10 text-center text-[14px] text-[#565250] bg-white border border-[#E8E2DA]" data-testid="ar-consolidation-empty">
          Add applications with annual spend to see the consolidation.
        </div>
      </div>
    );
  }

  const hovered = model.rows.find((r) => r.id === hoverId);

  return (
    <div data-testid="ar-consolidation">
      {head}

      <div className="mt-8 rounded-[24px] bg-white border border-[#E8E2DA] p-6 md:p-8">
        {/* The payoff, once: what comes off the bill every year. */}
        <div className="rounded-[18px] bg-[#F6F1EA] px-6 py-6 md:px-8 flex flex-wrap items-end justify-between gap-6" data-testid="ar-consolidation-stats">
          <div>
            <ArLabel>{alreadyInPlace ? "Comes off the bill every year" : "Freed every year"}</ArLabel>
            <div className="font-abridge text-[44px] md:text-[56px] leading-none text-[#EA2C00] mt-3 tabular-nums" data-testid="ar-freed-total">
              <AnimatedValue value={model.freed} format={fmtFull} duration={900} className="tabular-nums" />
            </div>
          </div>
          <div className="flex gap-8 md:gap-10 pb-1">
            <div>
              <ArLabel>Spend today</ArLabel>
              <div className="font-abridge text-[24px] leading-none text-[#1A1A1A] mt-2 tabular-nums">{fmtFull(model.stackTotal)}</div>
            </div>
            <div>
              <ArLabel>Stays on</ArLabel>
              <div className="font-abridge text-[24px] leading-none text-[#1A1A1A] mt-2 tabular-nums">{fmtFull(model.stays)}</div>
            </div>
            {!alreadyInPlace && (
              <div data-testid="ar-net-note">
                <ArLabel>{net.isNetCost ? "Net cost after Abridge" : "Net after Abridge"}</ArLabel>
                <div className={`font-abridge text-[24px] leading-none mt-2 tabular-nums ${net.isNetCost ? "text-[#1A1A1A]" : "text-[#EA2C00]"}`}>
                  {net.isNetCost ? "−" : ""}{fmtFull(Math.abs(net.netSavings))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TODAY */}
        <div className="mt-9 mb-7">
          <div className="flex justify-between items-baseline mb-3">
            <ArLabel>Today</ArLabel>
            <span className="text-[13px] text-[#565250]">
              {model.vendorCount} {model.vendorCount === 1 ? "tool" : "tools"}
            </span>
          </div>
          <div className="flex h-[48px] rounded-[10px] overflow-hidden" data-testid="ar-today-bar">
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

        {/* AFTER */}
        <div>
          <div className="flex mb-3 items-baseline" aria-hidden data-testid="ar-after-labels">
            {model.freed > 0 && (
              <div style={{ width: `${(model.freed / model.stackTotal) * 100}%` }}>
                <ArLabel className="!text-[#EA2C00]">After · onto Abridge</ArLabel>
              </div>
            )}
            {model.stays > 0 && (
              <div style={{ width: `${(model.stays / model.stackTotal) * 100}%` }} className="text-right">
                <ArLabel>Stays on</ArLabel>
              </div>
            )}
          </div>
          <div className="flex h-[48px] rounded-[10px] overflow-hidden" data-testid="ar-after-bar">
            {model.rows.filter((r) => r.retired > 0).map((r) => (
              <div
                key={`f-${r.id}`}
                data-tool={r.id}
                data-testid={`ar-after-seg-${r.id}`}
                onMouseEnter={() => setHoverId(r.id)}
                onMouseLeave={() => setHoverId(null)}
                className="h-full border-r-2 border-[#FFFFFF] transition-all duration-200"
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

          {/* Quiet legend: a swatch, the name and its spend. Also hover targets. */}
          <div className="flex flex-wrap gap-x-7 gap-y-2.5 mt-5">
            {model.rows.map((r) => (
              <div
                key={r.id}
                onMouseEnter={() => setHoverId(r.id)}
                onMouseLeave={() => setHoverId(null)}
                className="flex items-center gap-2 cursor-default transition-opacity duration-200"
                style={{ opacity: dimFor(r.id) ? 0.3 : 1 }}
                data-testid={`ar-legend-${r.id}`}
              >
                <span className="w-[10px] h-[10px] rounded-[3px] shrink-0" style={{ background: r.staysOnly ? STAYS_COLOR : r.shade }} />
                <span className="text-[13.5px] font-bold text-[#1A1A1A]">{r.name}</span>
                <span className="text-[13.5px] text-[#565250] tabular-nums">{fmtM(r.spend)}</span>
                {r.staysOnly && <span className="text-[12.5px] text-[#6E6157]">· stays on</span>}
              </div>
            ))}
          </div>

          {/* One line under the legend: the hovered tool's own split, or a hint. */}
          <p className="text-[13.5px] text-[#565250] mt-5 min-h-[20px]" data-testid="ar-caption">
            {hovered ? (
              <>
                <b className="text-[#1A1A1A] font-bold">{hovered.name}</b> is <b className="text-[#1A1A1A] font-bold tabular-nums">{fmtM(hovered.spend)}</b> a year.{" "}
                {hovered.staysOnly ? (
                  <>It stays on. Abridge doesn&rsquo;t replace it.</>
                ) : (
                  <>
                    <b className="text-[#EA2C00] font-bold tabular-nums">{fmtM(hovered.retired)}</b> comes onto Abridge
                    {hovered.stays > 0 ? <>, and <b className="text-[#1A1A1A] font-bold tabular-nums">{fmtM(hovered.stays)}</b> stays on.</> : <>.</>}
                  </>
                )}
              </>
            ) : (
              <>Hover any tool to see its own split.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
