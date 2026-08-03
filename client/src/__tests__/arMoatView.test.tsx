import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import ArMoatView, { buildMoatTools } from "@/components/forecast/ArMoatView";
import { makeItem, type AppRatItem, type AppRatCategoryId } from "@/lib/appRationalizationCalc";

const tool = (id: string, cat: AppRatCategoryId, spend: number, vendor: string): AppRatItem => ({
  ...makeItem(id, cat),
  annualSpend: spend,
  vendorName: vendor,
});

function render(items: AppRatItem[]): string {
  return renderToStaticMarkup(createElement(ArMoatView, { items }));
}

describe("buildMoatTools", () => {
  it("keeps only capture-layer tools with spend and drops the rest", () => {
    const t = buildMoatTools([
      tool("a", "ambientDoc", 400_000, "Nuance DAX"),
      tool("b", "scribe", 100_000, "ScribeAmerica"),
      tool("c", "cds", 60_000, "UpToDate"), // reference, not a capture tool
      tool("d", "postChartCoding", 50_000, "Solventum"), // coding, not plotted
      tool("e", "dictation", 0, "Dragon"), // no spend
    ]);
    expect(t.map((x) => x.name)).toEqual(["Nuance DAX", "ScribeAmerica"]);
  });
});

describe("ArMoatView", () => {
  it("renders the headline, verbatim moat line, and a real tool bar", () => {
    const html = render([
      tool("a", "ambientDoc", 400_000, "Nuance DAX"),
      tool("b", "dictation", 120_000, "Dragon"),
    ]);

    // black font-abridge headline
    expect(html).toContain("The stack consolidates into Abridge.");
    // claim-safe subhead (verbatim)
    expect(html).toContain(
      "Each of these tools does one step of the note, and Abridge already covers those steps, so that",
    );
    // the moat line, both halves (verbatim, legal-approved)
    expect(html).toContain(
      "A competitor can match Abridge",
    );
    expect(html).toContain(
      "these tools consolidate onto Abridge instead of a point tool.",
    );
    // Abridge coverage bar copy
    expect(html).toContain("Abridge covers the conversation through the draft note");
    // one of the customer's actual tool bars
    expect(html).toContain("Nuance DAX");
    expect(html).toContain("consolidates");
  });

  it("falls back to a neutral bar with no capture tools (no crash)", () => {
    // only non-capture tools → no consolidate bars, must not look broken
    const html = render([tool("c", "cds", 60_000, "UpToDate")]);
    expect(html).toContain("The stack consolidates into Abridge.");
    expect(html).toContain("Your capture tools");
  });

  it("renders the empty-items case without crashing", () => {
    const html = render([]);
    expect(html).toContain("Your capture tools");
  });
});
