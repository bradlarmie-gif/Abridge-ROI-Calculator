// Pure roadmap model for "The change": how the adjacent stack comes apart over
// the contract term. Snapshots (Today + each year) with per-tool remaining
// spend, per-year retirement deltas with running totals, and a data-aware read.
import {
  itemRetired, itemStays, itemDisplayName, computeTotals, retirementYear,
  type AppRatItem,
} from "./appRationalizationCalc";

export interface RoadmapSnapshot {
  label: string;
  year: number; // 0 = today, 1..N = end of that year
  total: number;
  perTool: { id: string; name: string; remaining: number }[];
}

export interface RoadmapDelta {
  year: number;
  amount: number;
  running: number;
  tools: string[];
}

export interface Roadmap {
  termYears: number;
  snapshots: RoadmapSnapshot[];
  deltas: RoadmapDelta[];
  totalRetired: number;
  endStays: number;
  read: string;
}

export function computeRoadmap(items: AppRatItem[], termYears: number, currentYear?: number): Roadmap {
  const term = Math.max(1, Math.floor(termYears));
  const rows = items.filter((i) => (i.annualSpend || 0) > 0);
  const totals = computeTotals(rows);

  const enriched = rows.map((r) => ({
    id: r.id,
    name: itemDisplayName(r),
    spend: r.annualSpend,
    retired: itemRetired(r),
    stays: itemStays(r),
    ry: retirementYear(r, term, currentYear),
  }));

  const snapshots: RoadmapSnapshot[] = [];
  for (let y = 0; y <= term; y++) {
    const perTool = enriched.map((e) => ({
      id: e.id,
      name: e.name,
      remaining: y === 0 ? e.spend : e.ry <= y ? e.stays : e.spend,
    }));
    snapshots.push({
      label: y === 0 ? "Today" : `Year ${y}`,
      year: y,
      total: perTool.reduce((s, t) => s + t.remaining, 0),
      perTool,
    });
  }

  const deltas: RoadmapDelta[] = [];
  let running = 0;
  for (let y = 1; y <= term; y++) {
    const thisYear = enriched.filter((e) => e.ry === y);
    const amount = thisYear.reduce((s, e) => s + e.retired, 0);
    running += amount;
    deltas.push({ year: y, amount, running, tools: thisYear.filter((e) => e.retired > 0).map((e) => e.name) });
  }

  const totalRetired = totals.toAbridge;
  const endStays = snapshots[snapshots.length - 1]?.total ?? 0;

  let read: string;
  if (rows.length === 0) {
    read = "Add applications with spend to see the roadmap.";
  } else if (totalRetired === 0) {
    read = "Nothing retires at the current coverage. Raise coverage on a tool to see it come off the stack.";
  } else {
    let maxYear = 1;
    for (let i = 0; i < deltas.length; i++) if (deltas[i].amount > deltas[maxYear - 1].amount) maxYear = deltas[i].year;
    const gated = enriched.some((e) => e.ry > 1 && e.retired > 0);
    read = `Most of the retirement lands in Year ${maxYear}.` +
      (gated
        ? " The rest is renewal-gated, so it holds until those contracts turn over."
        : " It can all move now.");
  }

  return { termYears: term, snapshots, deltas, totalRetired, endStays, read };
}
