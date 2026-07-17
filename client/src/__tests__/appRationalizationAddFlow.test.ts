import { describe, it, expect } from "vitest";
import {
  makeItem, buildStackBars, computeNet, buildRollout,
  type AppRatItem, type AppRatCategoryId,
} from "@/lib/appRationalizationCalc";

// Mirrors AppRationalizationFlow.addItem exactly: makeItem defaults + the modal's
// onConfirm init overrides. This exercises the Applications -> popup -> stack ->
// consolidation -> rollout DATA path end-to-end (rendering is verified on Replit).
let seq = 0;
const addItem = (list: AppRatItem[], category: AppRatCategoryId, init?: Partial<AppRatItem>): AppRatItem[] =>
  [...list, { ...makeItem(`ar-${seq++}`, category), ...init }];

describe("Applications → popup → stack: end-to-end data flow", () => {
  it("a tool added through the popup lands complete and flows to every downstream view", () => {
    let items: AppRatItem[] = [];
    items = addItem(items, "ambientDoc", { vendorName: "Suki", annualSpend: 200_000, coveragePct: 70, when: "nextYear" });

    expect(items[0]).toMatchObject({ category: "ambientDoc", vendorName: "Suki", annualSpend: 200_000, coveragePct: 70, when: "nextYear" });

    const bars = buildStackBars(items);
    expect(bars.stackTotal).toBe(200_000);
    expect(bars.sunset).toBe(140_000); // 70% of 200k
    expect(bars.stays).toBe(60_000);
    expect(bars.tools[0]).toMatchObject({ name: "Suki", spend: 200_000, sunset: 140_000, stays: 60_000 });

    const net = computeNet(items, 0);
    expect(net.sunset).toBe(140_000);
    expect(net.netSavings).toBe(140_000);

    const roll = buildRollout(items, 3, 0);
    expect(roll.hasRollout).toBe(true);
    expect(roll.phases).toHaveLength(1);
    expect(roll.phases[0]).toMatchObject({ year: 2, label: "Next year", tools: ["Suki"] });
    expect(roll.reachedYear).toBe(2);

    // one source of truth: waterfall, net, and rollout agree
    expect(bars.sunset).toBe(net.sunset);
    expect(roll.runRate).toBe(net.netSavings);
  });

  it("multiple adds aggregate and phase correctly, netting the Abridge price", () => {
    let items: AppRatItem[] = [];
    items = addItem(items, "dictation", { vendorName: "Dragon", annualSpend: 400_000, coveragePct: 80, when: "thisYear" });
    items = addItem(items, "scribe", { vendorName: "ScribeAmerica", annualSpend: 110_000, coveragePct: 80, when: "nextYear" });
    items = addItem(items, "cds", { vendorName: "UpToDate", annualSpend: 60_000, coveragePct: 90, when: "thisYear" });

    const gross = 320_000 + 88_000 + 54_000; // 462k
    const net = computeNet(items, 100_000);
    expect(net.sunset).toBe(gross);
    expect(net.netSavings).toBe(gross - 100_000);

    const roll = buildRollout(items, 3, 100_000);
    expect(roll.phases.map((p) => p.year)).toEqual([1, 2]);
    expect(roll.phases[0].tools).toEqual(["Dragon", "UpToDate"]); // both thisYear, input order preserved
    expect(roll.phases[1].tools).toEqual(["ScribeAmerica"]);
    expect(roll.reachedYear).toBe(2);
    expect(roll.runRate).toBe(net.netSavings); // consistency across screens
  });

  it("custom re-categorized in the popup lands under the chosen capability", () => {
    // entry was custom; the rep picked 'Medical scribe' in the modal, so onConfirm emits 'scribe'
    let items: AppRatItem[] = [];
    items = addItem(items, "scribe", { vendorName: "AcmeScribe", annualSpend: 50_000, coveragePct: 90, when: "thisYear" });
    expect(items[0].category).toBe("scribe");
    expect(buildStackBars(items).tools[0].name).toBe("AcmeScribe");
    expect(buildRollout(items, 3, 0).phases[0].tools).toEqual(["AcmeScribe"]);
  });

  it("custom left as 'Other' still adds and flows cleanly", () => {
    let items: AppRatItem[] = [];
    items = addItem(items, "custom", { vendorName: "MysteryTool", annualSpend: 30_000, coveragePct: 80, when: "thisYear" });
    expect(items[0].category).toBe("custom");
    expect(buildStackBars(items).tools[0].name).toBe("MysteryTool");
    expect(computeNet(items, 0).sunset).toBe(24_000); // 80% of 30k
  });

  it("makeItem seeds the per-capability default displace when the modal doesn't override it", () => {
    // ambient defaults to 100%, dictation to 80% (the modal seeds these before the rep touches the slider)
    expect(makeItem("a", "ambientDoc").coveragePct).toBe(100);
    expect(makeItem("b", "dictation").coveragePct).toBe(80);
    expect(makeItem("c", "custom").when).toBe("thisYear");
  });
});
