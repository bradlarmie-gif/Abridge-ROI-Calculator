import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import MethodologyContinuum from "@/pages/methodology/editorial/MethodologyContinuum";

describe("MethodologyContinuum (Across settings, reworked)", () => {
  const html = renderToStaticMarkup(
    <MethodologyContinuum onBack={() => {}} onHome={() => {}} onNavigate={() => {}} />,
  );
  it("leads with the four-economics comparison and closes on Counted once", () => {
    expect(html).toContain("The same record");
    expect(html).toContain("Four economics");
    expect(html).toContain("Volume"); // outpatient lever
    expect(html).toContain("Speed");  // ed lever
    expect(html).toContain("Acuity"); // inpatient lever
    expect(html).toContain("Counted once");
  });
  it("carries no em dash and no costume words", () => {
    expect(html).not.toContain("—");
    expect(html.toLowerCase()).not.toContain("faithful");
  });
});
