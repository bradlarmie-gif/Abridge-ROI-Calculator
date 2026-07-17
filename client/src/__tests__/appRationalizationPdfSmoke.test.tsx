import { describe, it, expect } from "vitest";
import { buildAppRationalizationPDFDocument } from "@/components/forecast/AppRationalizationPDFExport";
import { makeItem, type AppRatItem, type AppRatCategoryId, type AppRatWhen } from "@/lib/appRationalizationCalc";

// @react-pdf primitives are string-typed elements ("DOCUMENT"/"PAGE"/"TEXT"/…);
// custom presentation components are functions (none use hooks). Recursively
// invoke the function components so the page's render logic (waterfall geometry,
// buildRollout, buildStackBars, the table) actually executes — this catches
// render-time throws that tsc can't, and lets us assert the printed copy.
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

const tool = (id: string, cat: AppRatCategoryId, spend: number, pct: number, when: AppRatWhen, vendor: string): AppRatItem =>
  ({ ...makeItem(id, cat), annualSpend: spend, coveragePct: pct, when, vendorName: vendor });

const sample: AppRatItem[] = [
  tool("a", "dictation", 400_000, 80, "thisYear", "Dragon"),
  tool("b", "scribe", 110_000, 80, "nextYear", "ScribeAmerica"),
  tool("c", "cds", 60_000, 90, "thisYear", "UpToDate"),
  tool("d", "postChartCoding", 50_000, 60, "year3", "Solventum"),
];

function renderText(items: AppRatItem[], org: string, price: number, term: number): string {
  const out: string[] = [];
  collectText(buildAppRationalizationPDFDocument(items, org, price, term), out);
  return out.join(" | ");
}

describe("App Rationalization PDF (smoke)", () => {
  it("renders cover + content without throwing and prints the expected copy", () => {
    const text = renderText(sample, "Deaconess Health System", 0, 3);
    // cover
    expect(text).toContain("Consolidation Analysis");
    expect(text).toContain("Deaconess Health System");
    // consolidation header + waterfall
    expect(text).toContain("Your stack, consolidated onto Abridge");
    expect(text).toContain("sunsets onto Abridge");
    expect(text).toContain("$492K"); // net savings (price 0) short form
    // rollout beat
    expect(text).toContain("How it rolls out");
    expect(text).toContain("Full run-rate");
    // stack table
    expect(text).toContain("Sunset value");
    expect(text).toContain("Dragon");
    expect(text).toContain("$400,000");
    expect(text).toContain("$492,000"); // sunset total
  });

  it("nets the Abridge price and labels a net cost without throwing", () => {
    const text = renderText(sample, "Acme", 600_000, 3); // price > sunset -> net cost
    expect(text).toContain("Net cost / yr");
  });

  it("does not render the rollout when nothing sunsets", () => {
    const noSunset = [tool("a", "dictation", 400_000, 0, "thisYear", "Dragon")];
    const text = renderText(noSunset, "Acme", 0, 3);
    expect(text).not.toContain("How it rolls out");
    // still renders the page + table
    expect(text).toContain("Your stack, consolidated onto Abridge");
    expect(text).toContain("Dragon");
  });
});
