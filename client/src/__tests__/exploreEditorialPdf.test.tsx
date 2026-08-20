import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ExploreEditorialPdfDocument,
  SAMPLE_EXPLORE_PDF_DATA,
  parseChain,
} from "@/components/explore/ExploreEditorialPdf";
import type { ExplorePDFData } from "@/components/explore/ExplorePDFExport";
import type { ExploreCareSetting } from "@/pages/explore/exploreState";

/**
 * Permanent guard for the two Explore-PDF regressions we hit:
 *  1) the chain parser gluing a "/unit" onto the big number tile, which then
 *     overflowed its box and collided with the result (fixed by dropping the
 *     unit into the caption). Tested at the parser, the root cause.
 *  2) nursing scoping by "providers" instead of staffed beds on the scale /
 *     pricing pages (fixed setting-aware).
 * Pixel-level bleed is not layout-testable in jsdom; that stays the on-demand
 * screenshot sweep (scratchpad/pdf-verify.mjs).
 */

describe("Explore editorial PDF — chain parser (guards the overflow bug)", () => {
  it("drops a long /unit into the caption so the number tile stays narrow", () => {
    const [t] = parseChain("$400,000/replacement");
    expect(t.n).toBe("$400,000");
    expect(t.u).toBe("/replacement");
  });

  it("splits $33.40/wRVU the same way (number vs unit)", () => {
    const [t] = parseChain("$33.40/wRVU");
    expect(t.n).toBe("$33.40");
    expect(t.u).toBe("/wRVU");
  });

  it("never leaves a slash-unit fused into the number, for any token", () => {
    const summary =
      "248,000 wRVUs × 5% lift × $33.40/wRVU × 90% realization";
    for (const tile of parseChain(summary)) {
      // The big number must not carry a trailing "/word" (that is what overflowed).
      expect(tile.n).not.toMatch(/\/[A-Za-z]/);
    }
  });

  it("keeps a plain rate token intact and reads its unit word", () => {
    const [t] = parseChain("5% lift");
    expect(t.n).toBe("5%");
    expect(t.u).toBe("lift");
  });

  it("extracts a plan-name prefix from a multi-plan token", () => {
    const [t] = parseChain("Medicare Advantage: 15,000 members");
    expect(t.p).toBe("Medicare Advantage");
    expect(t.n).toBe("15,000");
  });
});

describe("Explore editorial PDF — renders + setting-aware scope labels", () => {
  const SETTINGS: ExploreCareSetting[] = ["outpatient", "ed", "inpatient", "nursing"];
  const variant = (careSetting: ExploreCareSetting): ExplorePDFData => ({
    ...SAMPLE_EXPLORE_PDF_DATA,
    careSetting,
    careSettingLabel: careSetting === "nursing" ? "Nursing" : "Outpatient",
    nursingStaffedBeds: careSetting === "nursing" ? 200 : undefined,
    nursingOccupancyRate: careSetting === "nursing" ? 80 : undefined,
  });

  it("renders every care setting without throwing", () => {
    for (const s of SETTINGS) {
      expect(() => renderToStaticMarkup(<ExploreEditorialPdfDocument data={variant(s)} />)).not.toThrow();
    }
  });

  it("nursing scopes by beds, never labels the scale/pricing count as providers", () => {
    const html = renderToStaticMarkup(<ExploreEditorialPdfDocument data={variant("nursing")} />);
    expect(html).toMatch(/beds/i);
    // the setting-aware labels we fixed must not read "N providers" for nursing
    expect(html).not.toMatch(/Full (team|unit) · \d[\d,]* providers/);
    expect(html).not.toMatch(/Annual license · \d[\d,]* providers/);
    expect(html).not.toMatch(/Today · \d[\d,]* providers/);
  });

  it("a provider setting still scopes by providers", () => {
    const html = renderToStaticMarkup(<ExploreEditorialPdfDocument data={variant("outpatient")} />);
    expect(html).toMatch(/providers/);
  });
});

describe("Explore editorial PDF — proof layer + encounter noun are setting-derived", () => {
  // A realistic nursing model: scoped by beds, no encounters, Revenue is the
  // non-financial proof layer (Quality carries a real dollar). This is exactly
  // the shape the OP-hardcoded strings used to break.
  const nursing: ExplorePDFData = {
    ...SAMPLE_EXPLORE_PDF_DATA,
    careSetting: "nursing",
    careSettingLabel: "Nursing",
    nursingStaffedBeds: 200,
    nursingOccupancyRate: 80,
    annualEncounters: 0,
    expansionEncounters: undefined,
  };

  it("names the correct proof-layer domain per setting (nursing = Revenue, never Quality)", () => {
    const html = renderToStaticMarkup(<ExploreEditorialPdfDocument data={nursing} />);
    expect(html).toContain("Revenue is tracked, not counted");
    // the OP-shaped literal must never appear on a nursing model
    expect(html).not.toContain("Quality is tracked, not counted");
  });

  it("inpatient names both proof-layer domains (Capacity and Quality)", () => {
    const ip: ExplorePDFData = { ...SAMPLE_EXPLORE_PDF_DATA, careSetting: "inpatient", careSettingLabel: "Inpatient" };
    const html = renderToStaticMarkup(<ExploreEditorialPdfDocument data={ip} />);
    expect(html).toContain("Capacity and Quality are tracked, not counted");
  });

  it("never prints '0 encounters' for nursing (uses patient-days instead)", () => {
    const html = renderToStaticMarkup(<ExploreEditorialPdfDocument data={nursing} />);
    expect(html).not.toContain("0 encounters");
    expect(html).not.toContain("Annual encounters");
    expect(html).toContain("patient-days");
    expect(html).toContain("Saved per shift");
  });

  it("does not hardcode an Outpatient-shaped downside multiple", () => {
    const html = renderToStaticMarkup(<ExploreEditorialPdfDocument data={nursing} />);
    expect(html).not.toContain("four times");
  });

  it("uses the real payback month threaded from the screen, not the closed-form estimate", () => {
    const priced: ExplorePDFData = { ...SAMPLE_EXPLORE_PDF_DATA, paybackMonth: 9 };
    const html = renderToStaticMarkup(<ExploreEditorialPdfDocument data={priced} />);
    expect(html).toContain("Mo 9");
    // null = does not pay back within year 1 → no crossover marker/caption
    const noPayback: ExplorePDFData = { ...SAMPLE_EXPLORE_PDF_DATA, paybackMonth: null };
    const html2 = renderToStaticMarkup(<ExploreEditorialPdfDocument data={noPayback} />);
    expect(html2).not.toContain("clears the cost");
  });
});
