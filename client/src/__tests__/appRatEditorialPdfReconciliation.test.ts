import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AppRatEditorialPdfDocument,
  SAMPLE_APPRAT_PDF_DATA,
  type AppRatPdfData,
} from "@/components/forecast/AppRatEditorialPdf";
import { buildConsolidationModel } from "@/components/forecast/ArConsolidationView";
import { computeNet, itemRetired, categoryLabel } from "@/lib/appRationalizationCalc";

/**
 * Reconciliation guard for the App Rationalization HTML PDF. The layout guard
 * checks it renders (pages/bleed/NaN); this checks the NUMBERS tie to the
 * engine — the totals, the per-tool freed, and the net-of-Abridge-price story
 * that the old react-pdf carried and the on-screen flow computes.
 */

const fullMoney = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const shortMoney = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
};
const render = (data: AppRatPdfData) =>
  renderToStaticMarkup(createElement(AppRatEditorialPdfDocument, { data }))
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

describe("App Rationalization HTML PDF — reconciliation", () => {
  const data = SAMPLE_APPRAT_PDF_DATA;
  const model = buildConsolidationModel(data.items);
  const html = render(data);

  it("engine is self-consistent: sum of per-tool freed equals model.freed", () => {
    const sum = data.items.reduce((a, i) => a + itemRetired(i), 0);
    expect(sum).toBe(model.freed);
    expect(model.stackTotal).toBe(data.items.reduce((a, i) => a + (i.annualSpend || 0), 0));
  });

  it("shows the stack total and total freed from the engine", () => {
    expect(html).toContain(fullMoney(model.stackTotal)); // stack table total
    expect(html).toContain(fullMoney(model.freed)); // total freed
    expect(html).toContain(shortMoney(model.freed)); // pitch headline / bars
  });

  it("shows each tool's freed amount", () => {
    for (const it of data.items.filter((i) => itemRetired(i) > 0)) {
      expect(html).toContain(fullMoney(itemRetired(it))); // stack table
    }
  });

  it("carries the capability proof for each category in the stack", () => {
    for (const it of data.items) {
      expect(html).toContain(categoryLabel(it.category));
    }
    expect(html).toContain("these tools consolidate onto Abridge instead of a point tool."); // the moat close
  });

  it("default (no Abridge price) tells the already-have-Abridge story, no net line", () => {
    expect(data.abridgePrice).toBe(0);
    expect(html).toContain("consolidates onto the Abridge you already run");
    expect(html).not.toContain("Net of the");
  });

  it("with an Abridge price below freed, nets it and shows the money back", () => {
    const priced: AppRatPdfData = { ...data, abridgePrice: 300000 };
    const net = computeNet(priced.items, priced.abridgePrice);
    expect(net.isNetCost).toBe(false);
    const out = render(priced);
    expect(out).toContain("Net of the");
    expect(out).toContain(fullMoney(net.netSavings)); // $697,500 comes back
  });

  it("with an Abridge price above freed, shows it running above what tools free (net cost)", () => {
    const priced: AppRatPdfData = { ...data, abridgePrice: 2_000_000 };
    const net = computeNet(priced.items, priced.abridgePrice);
    expect(net.isNetCost).toBe(true);
    const out = render(priced);
    expect(out).toContain("above what these tools free");
    expect(out).toContain(fullMoney(-net.netSavings));
  });
});
