import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AttainmentCurve from "@/components/attain/AttainmentCurve";

/**
 * Honesty guardrails for the "Closing the Gap" curve. Two things must hold on
 * every render:
 *
 *  1. There is NO fabricated "what usually happens" drift line or label. The
 *     only comparison this curve draws is the plan/target versus where you
 *     actually are.
 *  2. The Strategy tab (no dated log) labels its moving marker as an on-pace
 *     PROJECTION, not measured progress; the Progress tab (real dated log)
 *     labels it as measured "Today". This is what keeps a presenter from
 *     mistaking the projected number for logged progress.
 */
describe("AttainmentCurve honesty", () => {
  const base = {
    pct: 61,
    onPacePct: 65,
    monthsElapsed: 6,
    totalMonths: 12,
    goalLabel: "$760K · 3,800 visits",
  };

  it("never renders a fabricated 'what usually happens' drift line or label", () => {
    const strategy = renderToStaticMarkup(<AttainmentCurve {...base} />);
    const progress = renderToStaticMarkup(
      <AttainmentCurve
        {...base}
        startLabel="Committed"
        actualPoints={[
          { monthsFromStart: 0, pct: 0 },
          { monthsFromStart: 6, pct: 40 },
        ]}
      />,
    );
    for (const markup of [strategy, progress]) {
      expect(markup).not.toContain("usually happens");
      expect(markup).not.toContain("the gap");
    }
  });

  it("labels the Strategy marker as a projection (On-pace), not measured", () => {
    const markup = renderToStaticMarkup(<AttainmentCurve {...base} />);
    // The moving marker reads "On-pace · N%", never a measured "Today · N%".
    expect(markup).toMatch(/On-pace · 61%/);
    expect(markup).not.toMatch(/Today · \d+%/);
  });

  it("labels the Progress marker as measured (Today) when a dated log exists", () => {
    const markup = renderToStaticMarkup(
      <AttainmentCurve
        {...base}
        startLabel="Committed"
        actualPoints={[
          { monthsFromStart: 0, pct: 0 },
          { monthsFromStart: 6, pct: 40 },
        ]}
      />,
    );
    // With real dated entries the marker reads the measured "Today · N%".
    expect(markup).toMatch(/Today · 40%/);
    expect(markup).not.toMatch(/On-pace · \d+%/);
  });
});
