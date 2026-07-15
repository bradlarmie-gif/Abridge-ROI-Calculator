// Pure geometry for the two-sink consolidation hero. No rendering here.
// Ribbons are constant-thickness strokes proportional to dollars (thickness =
// value * k); each sink's height is the sum of the ribbons landing in it, so
// sinks fill exactly. Row spacing is fixed so labels stay legible regardless of
// a tool's spend. k is capped so a source's combined ribbon never exceeds the
// row spacing (no overlap at the source edge).
import {
  itemRetired, itemStays, computeTotals, itemDisplayName, categoryLabel,
  type AppRatItem,
} from "./appRationalizationCalc";

export interface LayoutSource {
  id: string;
  name: string;
  category: string;
  spend: number;
  coveragePct: number;
  retired: number;
  stays: number;
  rowCenterY: number;
  coralSrcY: number;
  greySrcY: number;
}

export interface LayoutRibbon {
  id: string;
  kind: "retired" | "stays";
  y1: number;
  y2: number;
  thickness: number;
}

export interface LayoutNode { y: number; height: number }

export interface ConsolidationLayout {
  width: number;
  height: number;
  ribbonStartX: number;
  sinkX: number;
  sinkWidth: number;
  sources: LayoutSource[];
  ribbons: LayoutRibbon[];
  abridge: LayoutNode;
  stays: LayoutNode;
  totals: { stackTotal: number; toAbridge: number; stays: number };
}

export interface LayoutOpts {
  width?: number;
  ribbonStartX?: number;
  sinkX?: number;
  sinkWidth?: number;
  topPad?: number;
  bottomPad?: number;
  rowGap?: number;
  sinkGap?: number;
  maxRibbonFrac?: number;
}

export function computeConsolidationLayout(items: AppRatItem[], opts: LayoutOpts = {}): ConsolidationLayout {
  const width = opts.width ?? 1000;
  const ribbonStartX = opts.ribbonStartX ?? 300;
  const sinkX = opts.sinkX ?? 900;
  const sinkWidth = opts.sinkWidth ?? 66;
  const topPad = opts.topPad ?? 16;
  const bottomPad = opts.bottomPad ?? 16;
  const rowGap = opts.rowGap ?? 64;
  const sinkGap = opts.sinkGap ?? 44;
  const maxRibbonFrac = opts.maxRibbonFrac ?? 0.7;

  const rows = items.filter((i) => (i.annualSpend || 0) > 0);
  const t = computeTotals(rows);
  const totals = { stackTotal: t.stackTotal, toAbridge: t.toAbridge, stays: t.stays };

  if (rows.length === 0) {
    return {
      width, height: topPad + bottomPad, ribbonStartX, sinkX, sinkWidth,
      sources: [], ribbons: [],
      abridge: { y: topPad, height: 0 }, stays: { y: topPad, height: 0 }, totals,
    };
  }

  const maxSpend = Math.max(...rows.map((r) => r.annualSpend));
  const k = maxSpend > 0 ? (rowGap * maxRibbonFrac) / maxSpend : 0;

  const sourceColHeight = rows.length * rowGap;
  const Hab = t.toAbridge * k;
  const Hst = t.stays * k;
  const bothSinks = Hab > 0 && Hst > 0;
  const rightGroupHeight = Hab + (bothSinks ? sinkGap : 0) + Hst;
  const rightTop = topPad + Math.max(0, (sourceColHeight - rightGroupHeight) / 2);

  const abridge: LayoutNode = { y: rightTop, height: Hab };
  const stays: LayoutNode = { y: rightTop + Hab + (bothSinks ? sinkGap : 0), height: Hst };

  const sources: LayoutSource[] = [];
  const ribbons: LayoutRibbon[] = [];
  let abrCursor = abridge.y;
  let stayCursor = stays.y;

  rows.forEach((r, i) => {
    const retired = itemRetired(r);
    const stays_ = itemStays(r);
    const spend = r.annualSpend;
    const coralTh = retired * k;
    const greyTh = stays_ * k;
    const combined = spend * k;
    const rowCenterY = topPad + rowGap / 2 + i * rowGap;
    const stackTop = rowCenterY - combined / 2;
    const coralSrcY = stackTop + coralTh / 2;
    const greySrcY = stackTop + coralTh + greyTh / 2;

    sources.push({
      id: r.id,
      name: itemDisplayName(r),
      category: categoryLabel(r.category),
      spend,
      coveragePct: r.coveragePct,
      retired,
      stays: stays_,
      rowCenterY,
      coralSrcY,
      greySrcY,
    });

    if (retired > 0) {
      const ty = abrCursor + coralTh / 2;
      abrCursor += coralTh;
      ribbons.push({ id: r.id, kind: "retired", y1: coralSrcY, y2: ty, thickness: coralTh });
    }
    if (stays_ > 0) {
      const ty = stayCursor + greyTh / 2;
      stayCursor += greyTh;
      ribbons.push({ id: r.id, kind: "stays", y1: greySrcY, y2: ty, thickness: greyTh });
    }
  });

  const height = topPad + Math.max(sourceColHeight, rightGroupHeight) + bottomPad;
  return { width, height, ribbonStartX, sinkX, sinkWidth, sources, ribbons, abridge, stays, totals };
}
