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

  it("contains exactly 7 top-level pages (1 cover + 6 content)", () => {
    // Sanity check independent of the snapshot — guards against a Page being
    // accidentally added or removed even if the rest of the structure churns
    // enough that a snapshot diff is hard to read.
    //
    // Note: the in-source page comments label sections "PAGE 1 — COVER",
    // "PAGE 2 — THE THESIS", "PAGE 2 — WORKFORCE & CAPACITY (combined)",
    // "PAGE 5 — QUALITY", "PAGE 6", "PAGE 7", "PAGE 8". Those labels are
    // historical — pages 3 and 4 were intentionally merged into the combined
    // "Workforce & Capacity" page. The actual emitted-Page count is 7
    // (1 cover from PDFCoverPage + 6 from NursingValueAssessmentPDF).
    const tree = buildTree();

    let pageCount = 0;
    const visit = (node: SnapshotNode): void => {
      if (node.kind === "primitive" && node.tag === "PAGE") pageCount += 1;
      if (node.kind !== "text") node.children.forEach(visit);
    };
    tree.forEach(visit);

    expect(pageCount).toBe(7);
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
});
