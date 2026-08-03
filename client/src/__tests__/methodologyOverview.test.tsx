import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MethodologyOverview from "@/pages/methodology/editorial/MethodologyOverview";

describe("MethodologyOverview (The Methodology tab)", () => {
  const html = renderToStaticMarkup(
    <MethodologyOverview onBack={() => {}} onHome={() => {}} onNavigate={() => {}} />,
  );
  it("renders the founding thesis, the four values, and the signal spine", () => {
    expect(html).toContain("written from");
    expect(html).toContain("memory");
    expect(html).toContain("Revenue");
    expect(html).toContain("Capacity");
    expect(html).toContain("Workforce");
    expect(html).toContain("Quality");
    expect(html).toContain("the floor, not the ceiling");
    expect(html).toContain("Note completeness");
  });
  it("carries no em dash and no costume words", () => {
    expect(html).not.toContain("—");
    expect(html.toLowerCase()).not.toContain("faithful");
    expect(html.toLowerCase()).not.toContain("fidelity");
  });
});
