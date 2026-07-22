import { describe, it, expect } from "vitest";
import {
  makeItem, buildStackBars, computeNet, buildCumulativeSavings,
  type AppRatItem, type AppRatCategoryId,
} from "@/lib/appRationalizationCalc";

// Mirrors AppRationalizationFlow.addItem exactly: makeItem defaults + the modal's
// onConfirm init overrides. This exercises the Applications -> popup -> stack ->
// consolidation -> timing DATA path end-to-end (rendering is verified on Replit).
let seq = 0;
const addItem = (list: AppRatItem[], category: AppRatCategoryId, init?: Partial<AppRatItem>): AppRatItem[] =>
  [...list, { ...makeItem(`ar-${seq++}`, category), ...init }];

describe("Applications → popup → stack: end-to-end data flow", () => {
  it("a tool added through the popup lands complete and flows to every downstream view", () => {
    let items: AppRatItem[] = [];
    items = addItem(items, "ambientDoc", { vendorName: "Suki", annualSpend: 200_000, coveragePct: 70 });

    expect(items[0]).toMatchObject({ category: "ambientDoc", vendorName: "Suki", annualSpend: 200_000, coveragePct: 70 });

    const bars = buildStackBars(items);
    expect(bars.stackTotal).toBe(200_000);
    expect(bars.sunset).toBe(140_000); // 70% of 200k
    expect(bars.stays).toBe(60_000);
    expect(bars.tools[0]).toMatchObject({ name: "Suki", spend: 200_000, sunset: 140_000, stays: 60_000 });

    const net = computeNet(items, 0);
    expect(net.sunset).toBe(140_000);
    expect(net.netSavings).toBe(140_000);

    const cs = buildCumulativeSavings(items, 36);
    expect(cs.hasCurve).toBe(true);
    expect(cs.tools).toHaveLength(1);
    expect(cs.tools[0].name).toBe("Suki");
    expect(cs.planTotal).toBeLessThanOrEqual(cs.nowTotal); // waiting never beats moving now

    // one source of truth: the waterfall and net agree
    expect(bars.sunset).toBe(net.sunset);
  });

  it("multiple adds aggregate and flow through timing, netting the Abridge price", () => {
    let items: AppRatItem[] = [];
    items = addItem(items, "dictation", { vendorName: "Dragon", annualSpend: 400_000, coveragePct: 80, contractMonths: 12, sunsetMonths: 12 });
    items = addItem(items, "scribe", { vendorName: "ScribeAmerica", annualSpend: 110_000, coveragePct: 80, contractMonths: 24, sunsetMonths: 24 });
    items = addItem(items, "cds", { vendorName: "UpToDate", annualSpend: 60_000, coveragePct: 90, contractMonths: 12, sunsetMonths: 12 });

    const gross = 320_000 + 88_000 + 54_000; // 462k
    const net = computeNet(items, 100_000);
    expect(net.sunset).toBe(gross);
    expect(net.netSavings).toBe(gross - 100_000);

    const cs = buildCumulativeSavings(items, 36);
    expect(cs.tools.map((t) => t.name)).toEqual(["Dragon", "ScribeAmerica", "UpToDate"]); // input order preserved
    // the later-sunsetting tool (24mo) contributes less over the horizon than if moved now
    expect(cs.planTotal).toBeLessThan(cs.nowTotal);
    expect(cs.gap).toBe(cs.nowTotal - cs.planTotal);
  });

  it("custom re-categorized in the popup lands under the chosen capability", () => {
    // entry was custom; the rep picked 'Medical scribe' in the modal, so onConfirm emits 'scribe'
    let items: AppRatItem[] = [];
    items = addItem(items, "scribe", { vendorName: "AcmeScribe", annualSpend: 50_000, coveragePct: 90 });
    expect(items[0].category).toBe("scribe");
    expect(buildStackBars(items).tools[0].name).toBe("AcmeScribe");
    expect(buildCumulativeSavings(items, 36).tools[0].name).toBe("AcmeScribe");
  });

  it("custom left as 'Other' still adds and flows cleanly", () => {
    let items: AppRatItem[] = [];
    items = addItem(items, "custom", { vendorName: "MysteryTool", annualSpend: 30_000, coveragePct: 80 });
    expect(items[0].category).toBe("custom");
    expect(buildStackBars(items).tools[0].name).toBe("MysteryTool");
    expect(computeNet(items, 0).sunset).toBe(24_000); // 80% of 30k
  });

  it("makeItem seeds the per-capability default displace and a 12-month contract", () => {
    // ambient defaults to 90%, dictation to 80% (conservative seeds before the rep touches the slider)
    expect(makeItem("a", "ambientDoc").coveragePct).toBe(90);
    expect(makeItem("b", "dictation").coveragePct).toBe(80);
    expect(makeItem("c", "custom").sunsetMonths).toBe(12);
  });
});
