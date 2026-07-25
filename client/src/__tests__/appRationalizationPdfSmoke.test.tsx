import { describe, it, expect } from "vitest";
import { buildAppRationalizationPDFDocument } from "@/components/forecast/AppRationalizationPDFExport";
import { makeItem, type AppRatItem, type AppRatCategoryId } from "@/lib/appRationalizationCalc";

// @react-pdf primitives are string-typed elements ("DOCUMENT"/"PAGE"/"TEXT"/…);
// custom presentation components are functions (none use hooks). Recursively
// invoke the function components so the page's render logic (waterfall geometry,
// buildCumulativeSavings, buildStackBars, the table) actually executes — this
// catches render-time throws that tsc can't, and lets us assert the printed copy.
function collectText(node: unknown, out: string[]): void {
  if (node == null || node === false || node === true) return;
  if (typeof node === "string" || typeof node === "number") { out.push(String(node)); return; }
  if (Array.isArray(node)) { node.forEach((n) => collectText(n, out)); return; }
  const el = node as { type?: unknown; props?: { children?: unknown } };
  if (!el.type) return;
  if (typeof el.type === "function") {
    collectText((el.type as (p: unknown) => unknown)(el.props ?? {}), out);
    return;
  }
  collectText(el.props?.children, out);
}

const tool = (id: string, cat: AppRatCategoryId, spend: number, pct: number, contractMonths: number, sunsetMonths: number, vendor: string): AppRatItem =>
  ({ ...makeItem(id, cat), annualSpend: spend, coveragePct: pct, contractMonths, sunsetMonths, vendorName: vendor });

const sample: AppRatItem[] = [
  tool("a", "dictation", 400_000, 80, 12, 12, "Dragon"),
  tool("b", "scribe", 110_000, 80, 24, 24, "ScribeAmerica"),
  tool("c", "cds", 60_000, 90, 12, 6, "UpToDate"),
  tool("d", "postChartCoding", 50_000, 60, 36, 36, "Solventum"),
];

function renderText(items: AppRatItem[], org: string, price: number, term: number): string {
  const out: string[] = [];
  collectText(buildAppRationalizationPDFDocument(items, org, price, term), out);
  return out.join(" | ");
}

describe("App Rationalization PDF (smoke)", () => {
  it("renders cover + the three content pages without throwing and prints the expected copy", () => {
    const text = renderText(sample, "Deaconess Health System", 0, 3);
    // cover
    expect(text).toContain("App Rationalization");
    expect(text).toContain("How your documentation stack folds onto the Abridge you already run.");
    expect(text).toContain("Deaconess Health System");
    // page 2 · the consolidation
    expect(text).toContain("Fold it onto what you already run.");
    expect(text).toContain("Freed every year");
    expect(text).toContain("$492,000"); // freed / yr = Σ itemRetired (320k+88k+54k+30k)
    expect(text).toContain("Dragon");
    expect(text).toContain("$400,000"); // Dragon annual spend
    // page 3 · when it lands
    expect(text).toContain("How soon it lands is your call.");
    expect(text).toContain("Captured sooner by acting");
    expect(text).toContain("$27,000"); // UpToDate/cds pulled 6mo early: 54k/12 * 6
    // page 4 · why only Abridge (verbatim moat line)
    expect(text).toContain("The stack folds into Abridge.");
    expect(text).toContain("folds onto Abridge, and not onto a tool that does one step");
  });

  it("nets the Abridge price and labels a net cost without throwing", () => {
    const text = renderText(sample, "Acme", 600_000, 3); // price > freed -> net cost
    expect(text).toContain("Net of Abridge");
    expect(text).toContain("above what these tools free today.");
  });

  it("does not render the timing / moat pages when nothing frees spend", () => {
    const noSunset = [tool("a", "dictation", 400_000, 0, 12, 12, "Dragon")];
    const text = renderText(noSunset, "Acme", 0, 3);
    expect(text).not.toContain("How soon it lands is your call.");
    expect(text).not.toContain("The stack folds into Abridge.");
    // still renders the consolidation page + table
    expect(text).toContain("Fold it onto what you already run.");
    expect(text).toContain("Dragon");
  });
});
