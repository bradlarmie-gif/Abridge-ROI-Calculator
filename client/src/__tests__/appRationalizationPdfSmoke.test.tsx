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
  it("renders cover + the five content sections without throwing and prints the expected copy", () => {
    const text = renderText(sample, "Deaconess Health System", 0, 3);
    // cover
    expect(text).toContain("App Rationalization");
    expect(text).toContain("How your documentation stack folds onto the Abridge you already run.");
    expect(text).toContain("Deaconess Health System");
    // page 2 · executive summary + the stack of record
    expect(text).toContain("Your documentation stack, consolidated."); // exec title
    expect(text).toContain("fold onto the Abridge you already run."); // the answer sentence
    expect(text).toContain("$620,000"); // stack total in the answer + hero KPI band
    expect(text).toContain("4 → 4"); // vendors KPI: 4 today → 4 still on your bill (all have a residual)
    expect(text).toContain("The stack of record, tool by tool"); // authoritative table heading
    expect(text).toContain("Solventum"); // a stack-of-record row
    expect(text).toContain("How this is calculated"); // the assumptions note
    // page 3 · the consolidation
    expect(text).toContain("Fold it onto what you already run.");
    expect(text).toContain("Freed every year");
    expect(text).toContain("$492,000"); // freed / yr = Σ itemRetired (320k+88k+54k+30k)
    expect(text).toContain("Dragon");
    expect(text).toContain("$400,000"); // Dragon annual spend (stack-of-record table)
    // page 4 · when it lands
    expect(text).toContain("How soon it lands is your call.");
    expect(text).toContain("Captured sooner by acting");
    expect(text).toContain("$27,000"); // UpToDate/cds pulled 6mo early: 54k/12 * 6
    // page 5 · why only Abridge (verbatim moat line + per-capability proof table)
    expect(text).toContain("The stack folds into Abridge.");
    expect(text).toContain("folds onto Abridge, and not onto a tool that does one step");
    expect(text).toContain("Why each capability consolidates"); // proof table heading
    expect(text).toContain("A working draft of the rationale"); // proof note (working draft)
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
    expect(text).not.toContain("Why each capability consolidates");
    // still renders the exec summary + consolidation pages
    expect(text).toContain("Your documentation stack, consolidated."); // exec summary always renders when there is spend
    expect(text).toContain("How this is calculated"); // assumptions note
    expect(text).toContain("Fold it onto what you already run.");
    expect(text).toContain("Dragon");
  });
});
