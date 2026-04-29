import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import React from "react";
import {
  NursingPDFDocument,
  type NursingPDFInput,
} from "@/components/explore/NursingValueAssessmentPDF";

/**
 * Visual / structural snapshot guardrail for the multi-page Nursing Value
 * Assessment PDF (1 cover + 6 content pages = 7 total).
 *
 * The PDF is generated client-side via @react-pdf/renderer. Our existing
 * end-to-end test only confirms the file downloads without throwing — it
 * cannot inspect the rendered pages. This test renders the document's React
 * tree (without rasterizing to PDF, which is non-deterministic across runs
 * because of embedded fonts, /CreationDate, and PDF object IDs), expands
 * every custom helper component, and serializes the resulting structure +
 * copy + style props into a deterministic JSON snapshot diffed on each run.
 *
 * What it catches:
 *   - Wrong copy (any printed string change)
 *   - Missing or extra sections (component count drift)
 *   - Broken page breaks (PAGE-element boundary changes)
 *   - Layout regressions in shared style props
 *   - Accidental drift from the Mercy reference layout
 *
 * Implementation note: @react-pdf/renderer's primitives (Document, Page,
 * View, Text, etc.) are not React classes — they're plain string constants
 * (`'PAGE'`, `'VIEW'`, `'TEXT'`, …) re-exported from @react-pdf/primitives.
 * That means JSX like `<Text>foo</Text>` compiles to a React element whose
 * `type` is the string `"TEXT"`. The serializer below treats every
 * string-typed element as a renderer primitive (recording its props +
 * children verbatim) and recursively invokes every function-typed element as
 * a custom presentation component (none of which use React hooks).
 *
 * If the PDF is intentionally redesigned, regenerate the baseline with:
 *   npx vitest -u client/src/__tests__/nursingPdfSnapshot.test.tsx
 * and review the diff.
 */

type SnapshotNode =
  | { kind: "text"; value: string }
  | {
      kind: "primitive";
      tag: string;
      props: Record<string, unknown>;
      children: SnapshotNode[];
    }
  | {
      kind: "component";
      name: string;
      children: SnapshotNode[];
    };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeValue(value: unknown): unknown {
  if (typeof value === "function") return "[Function]";
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value).sort()) {
      out[k] = normalizeValue((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  return value;
}

function extractProps(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(props)) {
    if (key === "key" || key === "ref" || key === "children") continue;
    out[key] = normalizeValue(raw);
  }
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(out).sort()) sorted[k] = out[k];
  return sorted;
}

// react-pdf supports `render={({pageNumber, totalPages, ...}) => ...}` on
// fixed footers/headers. We invoke render-fns with stable values so the
// resulting copy ("Page 1 of 7") shows up in the snapshot deterministically.
const RENDER_CONTEXT = {
  pageNumber: 1,
  totalPages: 8,
  subPageNumber: 1,
  subPageTotalPages: 1,
};

function tryInvokeRenderFn(fn: unknown): unknown {
  if (typeof fn !== "function") return fn;
  try {
    return (fn as (ctx: typeof RENDER_CONTEXT) => unknown)(RENDER_CONTEXT);
  } catch {
    return "[render-fn-threw]";
  }
}

function serialize(node: unknown): SnapshotNode[] {
  if (node === null || node === undefined || node === false || node === true) {
    return [];
  }
  if (typeof node === "string" || typeof node === "number") {
    const s = String(node);
    return s.length > 0 ? [{ kind: "text", value: s }] : [];
  }
  if (Array.isArray(node)) {
    return node.flatMap(serialize);
  }
  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<Record<string, unknown>>;
    const type = element.type as unknown;
    const props = (element.props || {}) as Record<string, unknown>;

    // @react-pdf primitives all surface as string types ("PAGE", "VIEW",
    // "TEXT", "DOCUMENT", "IMAGE", "LINK", …).
    if (typeof type === "string") {
      let children = props.children;
      if (typeof children === "function") {
        children = tryInvokeRenderFn(children);
      }

      const propsForSnapshot: Record<string, unknown> = { ...props };
      if (typeof propsForSnapshot.render === "function") {
        const rendered = tryInvokeRenderFn(propsForSnapshot.render);
        propsForSnapshot.render =
          typeof rendered === "string"
            ? `[render→ ${rendered}]`
            : "[render→element]";
      }

      return [
        {
          kind: "primitive",
          tag: type,
          props: extractProps(propsForSnapshot),
          children: serialize(children),
        },
      ];
    }

    if (typeof type === "function") {
      // Custom presentation component — invoke as a plain function. None of
      // the PDF helpers use React hooks, so this is safe.
      const Comp = type as (p: Record<string, unknown>) => unknown;
      let rendered: unknown;
      try {
        rendered = Comp(props);
      } catch (err) {
        rendered = `[render-threw: ${(err as Error).message}]`;
      }
      const name =
        (type as { displayName?: string; name?: string }).displayName ||
        (type as { name?: string }).name ||
        "AnonymousComponent";
      return [
        {
          kind: "component",
          name,
          children: serialize(rendered),
        },
      ];
    }
  }
  return [];
}

// ───────────────────────── Fixture ─────────────────────────

// A representative Mercy-style inpatient unit. Every quantified driver is
// enabled with realistic numbers so the snapshot exercises the full 8-page
// document (all driver cards, both quadrants, the Year-1/2/3 ladder, and the
// methodology page). All inputs are fixed — no clocks, no random numbers —
// so the resulting tree is deterministic across runs.
const STAFFED_BEDS = 350;
const OCCUPANCY_PCT = 82;
const PATIENT_DAYS = STAFFED_BEDS * (OCCUPANCY_PCT / 100) * 365;

const FIXED_INPUT: NursingPDFInput = {
  clientName: "Mercy Health System",
  preparedBy: "Abridge Value Engineering",
  dateLabel: "January 1, 2026",

  staffedBeds: STAFFED_BEDS,
  nurseFTEs: 1_200,
  occupancyPercent: OCCUPANCY_PCT,
  utilizationPercent: 60,
  minutesSavedPerShift: 18,
  hoursReturnedAnnual: 36_400,
  patientDaysAnnual: PATIENT_DAYS,

  bedsideTimeEnabled: true,

  retention: {
    enabled: true,
    value: 4_200_000,
    turnoverPct: 22,
    replacementCost: 56_000,
    impactPct: 15,
    burnoutRelatedPct: 40,
  },
  agency: {
    enabled: true,
    value: 1_650_000,
    weeksPerVacancy: 8,
    weeklyPremium: 4_200,
  },
  overtime: {
    enabled: true,
    value: 980_000,
    otHrsPerNurseWeek: 4,
    reductionPct: 25,
    otHourlyRate: 78,
  },

  hapi: {
    enabled: true,
    value: 425_000,
    rate: 2.5,
    preventionPct: 6.5,
    costPerEvent: 25_000,
  },
  falls: {
    enabled: true,
    value: 240_000,
    rate: 3.5,
    preventionPct: 10,
    costPerEvent: 6_500,
  },
  cauti: {
    enabled: true,
    value: 88_000,
    rate: 1.8,
    preventionPct: 12,
    costPerEvent: 13_000,
    utilizationPct: 30,
  },
  clabsi: {
    enabled: true,
    value: 27_000,
    rate: 0.8,
    preventionPct: 8,
    costPerEvent: 20_000,
    utilizationPct: 20,
  },
  sepsis: {
    enabled: true,
    value: 33_000,
    ratePerThousand: 2.0,
    complianceGapPct: 25,
    docLagPct: 30,
    excessCostPerCase: 3_500,
    realizationPct: 60,
  },

  hcahpsEnabled: true,
  medErrorEnabled: true,

  pricingModel: "perProvider",
  costPerBedPerMonth: 250,
  annualInvestment: 1_050_000,
  implementationFee: 75_000,

  year1Net: 6_543_000,
  year2Net: 7_850_000,
  year3Net: 9_220_000,
  threeYearCumulativeNet: 23_613_000,
  year2GrowthPct: 20,
  year3GrowthPct: 18,

  workforceTotal: 6_830_000,
  qualityTotal: 813_000,
  totalAnnualValue: 7_643_000,
  netAnnualValue: 6_543_000,
  costPerBedPerYear: 18_700,
};

function buildTree(): SnapshotNode[] {
  return serialize(<NursingPDFDocument data={FIXED_INPUT} />);
}

// ── Long-org-name stress fixture ────────────────────────────────────────
// The original Mercy fixture used a 19-character org name. The shipped
// footer-collision bug only surfaced for orgs whose name + the fixed-width
// "PAGE X / Y" right slot overflowed the line — i.e., for long names. This
// fixture pairs a deliberately-long org name with billion-class dollar
// figures (which also stress the hero number sizing) so the snapshot
// catches any future regression where the footer center text is ever
// allowed to grow into the right slot, OR where a hero number grows so
// large it can no longer stand alone in its eyebrow/number/footnote stack.
const LONG_ORG_INPUT: NursingPDFInput = {
  ...FIXED_INPUT,
  clientName: "Northwestern Memorial HealthCare System — Northwest Region",
  staffedBeds: 1_400,
  nurseFTEs: 5_200,
  patientDaysAnnual: 1_400 * (88 / 100) * 365,

  retention: { ...FIXED_INPUT.retention, value: 18_500_000 },
  agency: { ...FIXED_INPUT.agency, value: 7_400_000 },
  overtime: { ...FIXED_INPUT.overtime, value: 4_300_000 },

  hapi: { ...FIXED_INPUT.hapi, value: 1_700_000 },
  falls: { ...FIXED_INPUT.falls, value: 920_000 },
  cauti: { ...FIXED_INPUT.cauti, value: 360_000 },
  clabsi: { ...FIXED_INPUT.clabsi, value: 110_000 },
  sepsis: { ...FIXED_INPUT.sepsis, value: 140_000 },

  annualInvestment: 4_200_000,
  implementationFee: 250_000,

  year1Net: 26_500_000,
  year2Net: 31_800_000,
  year3Net: 37_200_000,
  threeYearCumulativeNet: 95_500_000,

  workforceTotal: 30_200_000,
  qualityTotal: 3_230_000,
  totalAnnualValue: 33_430_000,
  netAnnualValue: 26_500_000,
  costPerBedPerYear: 3_000,
};

function buildLongOrgTree(): SnapshotNode[] {
  return serialize(<NursingPDFDocument data={LONG_ORG_INPUT} />);
}

describe("Nursing Value Assessment PDF — structural snapshot", () => {
  // PDFCoverPage internally calls `new Date().toLocaleDateString(...)` to
  // stamp the cover with today's date (the `dateLabel` field on the input
  // does NOT reach the cover — the cover always rebuilds the date itself).
  // Without freezing the clock the snapshot would drift every calendar day.
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("renders the multi-page document tree deterministically (Mercy fixture)", () => {
    expect(buildTree()).toMatchSnapshot();
  });

  // Dedicated baseline for the long-org / large-dollar stress fixture.
  // The targeted assertions below catch the specific bug class (footer
  // suffix, page count, hero block, subtotal labels), but a full
  // structural baseline catches any unexpected drift in the rest of the
  // tree under the stress inputs — e.g., a hero number reflowing to two
  // lines, an extra page being introduced under large numbers, or a
  // footer slot losing its width constraint. Per
  // pdf_layout_guidelines.md §8 we maintain a baseline for every
  // fixture that exercises a distinct layout regime.
  it("renders the multi-page document tree deterministically (long-org stress fixture)", () => {
    expect(buildLongOrgTree()).toMatchSnapshot();
  });

  it("contains exactly 9 top-level pages (1 cover + 8 content) and matches the rendered count", () => {
    // Sanity check independent of the snapshot — guards against a Page being
    // accidentally added or removed even if the rest of the structure churns
    // enough that a snapshot diff is hard to read.
    //
    // Why 9: when this test originally asserted 8, the live render produced
    // 9 because the Summary page used `wrap` and the methodology section
    // overflowed onto a second physical page. The visual review caught
    // the gap between the structural count (8) and the rendered count (9).
    // Methodology is now its own dedicated `<Page>`, so the structural
    // count and the rendered count are aligned at 9.
    //
    // Page lineup (1 cover + 8 content):
    //   1. Cover                       (PDFCoverPage)
    //   2. The Thesis / 2x2 grid
    //   3. Workforce  (compact cards, hero subtotal)
    //   4. Capacity
    //   5. Quality    (compact 2-col grid, hero subtotal)
    //   6. Revenue    (tracked separately)
    //   7. Investment & Net Value (with cumulative-multiple hero)
    //   8. Assessment Summary (hero card + quadrant subtotals + net value)
    //   9. Methodology (per-driver formulas + closing tail)
    const tree = buildTree();

    let pageCount = 0;
    const visit = (node: SnapshotNode): void => {
      if (node.kind === "primitive" && node.tag === "PAGE") pageCount += 1;
      if (node.kind !== "text") node.children.forEach(visit);
    };
    tree.forEach(visit);

    expect(pageCount).toBe(9);
  });

  it("includes the headline copy + driver totals as printed text", () => {
    const tree = buildTree();

    // Flatten every text node so we can assert that key copy is present
    // without pinning exact layout. Guards against accidental removal of
    // headline figures even if the surrounding structure is refactored.
    const text: string[] = [];
    const visit = (node: SnapshotNode): void => {
      if (node.kind === "text") text.push(node.value);
      else node.children.forEach(visit);
    };
    tree.forEach(visit);
    const flat = text.join(" | ");

    expect(flat).toContain("Mercy Health System");
    expect(flat).toContain("NURSING VALUE ASSESSMENT");
    // Headline 3-yr cumulative net (formatted as $23.61M by fmtCurrency).
    expect(flat).toContain("$23.61M");
    // Both quadrant totals should appear somewhere on the deck.
    expect(flat).toContain("$6.83M"); // workforce
    expect(flat).toContain("$813K"); // quality
  });

  // ── Long-org-name stress test ─────────────────────────────────────────
  // Anchors three layout invariants for a customer with a
  // deliberately-long org name and billion-class dollar figures:
  //   1. Page count is still exactly 9 (no card overflow forcing extra pages).
  //   2. The footer center text is just the org name — never glued to a
  //      document-title slug — so it cannot grow into the right-slot
  //      "PAGE X / Y" the way the shipped bug did.
  //   3. The Investment cumulative-multiple HERO renders as a standalone
  //      number ("X.X×"), not as inline body copy.
  it("renders the long-org / large-dollar fixture without overflowing or collapsing", () => {
    const tree = buildLongOrgTree();

    let pageCount = 0;
    const text: string[] = [];
    const visit = (node: SnapshotNode): void => {
      if (node.kind === "text") {
        text.push(node.value);
      } else {
        if (node.kind === "primitive" && node.tag === "PAGE") pageCount += 1;
        node.children.forEach(visit);
      }
    };
    tree.forEach(visit);
    const flat = text.join(" | ");

    expect(pageCount).toBe(9);
    expect(flat).toContain("Northwestern Memorial HealthCare System — Northwest Region");
    // Footer center text must be JUST the org name. The shipped-bug
    // " · Nursing Value Assessment" suffix is gone — assert the
    // non-uppercase suffix string is nowhere in the tree.
    expect(flat).not.toContain(" · Nursing Value Assessment");
    // Hero cumulative multiple (95.5M / (4.2M × 3) ≈ 7.6×) lands as its
    // own text node next to the eyebrow.
    expect(flat).toContain("By Year 3, For Every $1 Invested");
    expect(flat).toMatch(/\d+(\.\d+)?×/);
    // Workforce HeroSubtotal (and Quality HeroSubtotal) both render the
    // tinted dollar total with the canonical fmtCurrency formatting.
    // Note: the label text is title-case in source — `textTransform:
    // uppercase` is applied at render time only, so the snapshot tree
    // carries the original casing.
    expect(flat).toContain("Workforce Subtotal");
    expect(flat).toContain("Quality Subtotal");
    expect(flat).toContain("$30.20M"); // workforce total
  });
});
