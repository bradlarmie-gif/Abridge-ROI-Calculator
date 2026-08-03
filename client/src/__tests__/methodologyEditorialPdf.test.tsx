import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MethodologyEditorialPdfDocument from "@/components/methodology/MethodologyEditorialPdf";

describe("Methodology PDF document", () => {
  const html = renderToStaticMarkup(<MethodologyEditorialPdfDocument />);

  it("renders the opening, comparison, all four chapters, and no NaN", () => {
    expect(html).toContain("The note is written");
    expect(html).toContain("The same record");
    expect(html).toContain("Volume is the lever.");
    expect(html).toContain("Speed is the lever.");
    expect(html).toContain("Acuity is the lever.");
    expect(html).toContain("Time is the lever.");
    expect(html).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("shows illustrative math values and the illustrative-figures footer", () => {
    expect(html).toContain("Illustrative figures");
    expect(html).toContain("$373K"); // wRVU capture rounded
  });

  it("carries no em dash in the rendered copy", () => {
    expect(html).not.toContain("—");
  });
});
