import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import React from "react";
import {
  ExplorePDFDocument,
  type ExplorePDFData,
} from "@/components/explore/ExplorePDFExport";

/**
 * Visual / structural snapshot guardrail for the multi-page Explore (non-
 * nursing) PDF — the parallel of the Nursing Value Assessment guardrail in
 * `nursingPdfSnapshot.test.tsx`. The Outpatient/ED/Inpatient PDF is generated
 * client-side via @react-pdf/renderer; the existing end-to-end test only
 * confirms the file downloads without throwing and cannot inspect the
 * rendered pages.
 *
 * This test renders the document's React tree (without rasterizing to PDF —
 * that is non-deterministic across runs because of embedded fonts,
 * /CreationDate, and PDF object IDs), expands every custom helper component,
 * and serializes the resulting structure + copy + style props into a
 * deterministic JSON snapshot diffed on each run.
 *
 * What it catches:
 *   - Wrong copy (any printed string change)
 *   - Missing or extra sections (component count drift)
 *   - Broken page breaks (PAGE-element boundary changes)
 *   - Layout regressions in shared style props
 *   - Accidental drift across the four-quadrant card layout
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
 *   npx vitest -u client/src/__tests__/explorePdfSnapshot.test.tsx
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
  totalPages: 7,
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

// A representative outpatient deployment exercising every section of the
// Explore PDF: all four quadrants populated with a mix of quantified and
// qualitative drivers, an extra financial benefit + a one-time benefit
// (so the "+ one-time (Y1)" branch renders), the Quality quadrant in its
// "tracked post-deployment" mode (annualTotal = 0 with drivers present),
// per-provider pricing with implementation fee, and 3-year growth applied.
// All inputs are fixed — no clocks, no random numbers — so the resulting
// tree is deterministic across runs.
const PROVIDERS = 50;
const COST_PER_PROVIDER = 250;
const ANNUAL_INVESTMENT = PROVIDERS * COST_PER_PROVIDER * 12; // 150_000
const TOTAL_ANNUAL_VALUE = 1_250_000;
const TOTAL_ONE_TIME = 80_000;
const NET_ANNUAL = TOTAL_ANNUAL_VALUE - ANNUAL_INVESTMENT;
const YEAR1_VALUE = TOTAL_ANNUAL_VALUE + TOTAL_ONE_TIME;
const YEAR1_NET = YEAR1_VALUE - ANNUAL_INVESTMENT;
const YEAR2_VALUE = Math.round(TOTAL_ANNUAL_VALUE * 1.1);
const YEAR3_VALUE = Math.round(YEAR2_VALUE * 1.1);
const YEAR2_NET = YEAR2_VALUE - ANNUAL_INVESTMENT;
const YEAR3_NET = YEAR3_VALUE - ANNUAL_INVESTMENT;
const THREE_YEAR_GROSS = YEAR1_VALUE + YEAR2_VALUE + YEAR3_VALUE;
const THREE_YEAR_INVEST = ANNUAL_INVESTMENT * 3;
const THREE_YEAR_NET = THREE_YEAR_GROSS - THREE_YEAR_INVEST;

const FIXED_INPUT: ExplorePDFData = {
  clientName: "Lakeside Outpatient Network",
  preparedBy: "Abridge Value Engineering",
  date: "January 15, 2026",
  careSettingLabel: "Outpatient",

  careSetting: "outpatient",
  numberOfProviders: PROVIDERS,
  annualEncounters: 120_000,
  utilizationPercent: 65,

  totalHoursSaved: 5_200,
  minutesSavedPerEncounter: 5,
  timePathScenario: "typical",

  quadrants: [
    {
      quadrant: "Capacity",
      annualTotal: 480_000,
      oneTimeTotal: 0,
      drivers: [
        {
          id: "throughput",
          label: "Visit throughput recovery",
          shortDescription:
            "Recovered minutes per visit converted into incremental capacity.",
          visibility: "quantified",
          value: 480_000,
          calcSummary:
            "5 min/visit × 120,000 visits × $0.80/min × 65% utilization",
        },
        {
          id: "no-show-recovery",
          label: "No-show backfill",
          shortDescription:
            "Faster post-visit closure enables same-day backfill of openings.",
          visibility: "qualitative",
          value: 0,
        },
      ],
      otherFinancialBenefits: [],
    },
    {
      quadrant: "Workforce",
      annualTotal: 410_000,
      oneTimeTotal: 80_000,
      drivers: [
        {
          id: "retention",
          label: "Provider retention",
          shortDescription:
            "Reduced burnout-driven turnover among quoted providers.",
          visibility: "quantified",
          value: 360_000,
          calcSummary:
            "50 providers × 8% turnover × $90,000 replacement × 10% impact",
        },
        {
          id: "after-hours",
          label: "After-hours pajama-time recapture",
          shortDescription:
            "Documentation completed in-visit reduces evening charting.",
          visibility: "quantified",
          value: 50_000,
          calcSummary: "5 min × 120,000 visits × $0.10/min after-hours premium",
          isChild: true,
        },
        {
          id: "wellbeing",
          label: "Clinician wellbeing index",
          shortDescription:
            "Self-reported burnout / Maslach scoring tracked quarterly.",
          visibility: "qualitative",
          value: 0,
        },
      ],
      otherFinancialBenefits: [
        {
          label: "Onboarding ramp acceleration",
          amount: 80_000,
          type: "oneTime",
        },
      ],
    },
    {
      quadrant: "Revenue",
      annualTotal: 360_000,
      oneTimeTotal: 0,
      drivers: [
        {
          id: "coding-completeness",
          label: "Coding completeness lift",
          shortDescription:
            "More complete HPI/ROS/exam capture drives 1.5% E/M lift.",
          visibility: "quantified",
          value: 240_000,
          calcSummary: "1.5% E/M lift × 120,000 visits × $135 avg reimbursement",
        },
      ],
      otherFinancialBenefits: [
        {
          label: "Clean-claim rate improvement",
          amount: 120_000,
          type: "annual",
        },
      ],
    },
    {
      quadrant: "Quality",
      annualTotal: 0,
      oneTimeTotal: 0,
      drivers: [
        {
          id: "patient-experience",
          label: "Patient experience (CGCAHPS)",
          shortDescription:
            "Listening / explanation domain scores tracked post-deployment.",
          visibility: "qualitative",
          value: 0,
        },
        {
          id: "preventive-care",
          label: "Preventive-care closure",
          shortDescription:
            "More face-time correlates with higher gap-closure rates.",
          visibility: "qualitative",
          value: 0,
        },
      ],
      otherFinancialBenefits: [],
    },
  ],
  totalAnnualValue: TOTAL_ANNUAL_VALUE,
  totalOneTimeValue: TOTAL_ONE_TIME,

  pricingModel: "perProvider",
  costPerProvider: COST_PER_PROVIDER,
  implementationFee: 25_000,
  includeImplementation: true,
  annualInvestment: ANNUAL_INVESTMENT,

  year2GrowthPercent: 10,
  year3GrowthPercent: 10,
  year1Value: YEAR1_VALUE,
  year2Value: YEAR2_VALUE,
  year3Value: YEAR3_VALUE,
  year1Investment: ANNUAL_INVESTMENT,
  year2Investment: ANNUAL_INVESTMENT,
  year3Investment: ANNUAL_INVESTMENT,
  year1Net: YEAR1_NET,
  year2Net: YEAR2_NET,
  year3Net: YEAR3_NET,
  threeYearGrossTotal: THREE_YEAR_GROSS,
  threeYearInvestmentTotal: THREE_YEAR_INVEST,
  threeYearNetTotal: THREE_YEAR_NET,

  netAnnualValue: NET_ANNUAL,
  roi: TOTAL_ANNUAL_VALUE / ANNUAL_INVESTMENT,
  valuePerProvider: Math.round(YEAR1_NET / PROVIDERS),
};

function buildTree(): SnapshotNode[] {
  return serialize(<ExplorePDFDocument data={FIXED_INPUT} />);
}

describe("Explore (non-nursing) PDF — structural snapshot", () => {
  // PDFCoverPage internally calls `new Date().toLocaleDateString(...)` to
  // stamp the cover with today's date (the `date` field on the input does
  // NOT reach the cover — the cover always rebuilds the date itself).
  // Without freezing the clock the snapshot would drift every calendar day.
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("renders the multi-page document tree deterministically (Lakeside outpatient fixture)", () => {
    expect(buildTree()).toMatchSnapshot();
  });

  it("contains exactly 7 top-level pages (1 cover + 6 numbered)", () => {
    // Sanity check independent of the snapshot — guards against a Page being
    // accidentally added or removed even if the rest of the structure churns
    // enough that a snapshot diff is hard to read.
    //
    // Page lineup (1 cover + 6 numbered):
    //   1. Cover                       (PDFCoverPage)
    //   2. Executive summary
    //   3. Practice & setup + time savings
    //   4. Value by quadrant (wraps)
    //   5. Investment
    //   6. 3-Year projection
    //   7. Methodology
    const tree = buildTree();

    let pageCount = 0;
    const visit = (node: SnapshotNode): void => {
      if (node.kind === "primitive" && node.tag === "PAGE") pageCount += 1;
      if (node.kind !== "text") node.children.forEach(visit);
    };
    tree.forEach(visit);

    expect(pageCount).toBe(7);
  });

  it("includes the headline copy + quadrant totals as printed text", () => {
    const tree = buildTree();

    // Flatten every text node so we can assert key copy is present without
    // pinning exact layout. Guards against accidental removal of headline
    // figures even if the surrounding structure is refactored.
    const text: string[] = [];
    const visit = (node: SnapshotNode): void => {
      if (node.kind === "text") text.push(node.value);
      else node.children.forEach(visit);
    };
    tree.forEach(visit);
    const flat = text.join(" | ");

    expect(flat).toContain("Lakeside Outpatient Network");
    expect(flat).toContain("OUTPATIENT VALUE ASSESSMENT");
    expect(flat).toContain("EXECUTIVE SUMMARY");
    expect(flat).toContain("VALUE BY QUADRANT");
    expect(flat).toContain("3-YEAR PROJECTION");
    expect(flat).toContain("METHODOLOGY");
    // Total annual value formatted as $1.25M by fmtCurrency.
    expect(flat).toContain("$1.25M");
    // Quality quadrant should switch into its post-deployment label when
    // annualTotal === 0 but drivers exist.
    expect(flat).toContain("Tracked post-deployment");
    // 3-year cumulative net total, derived from the fixture above and
    // formatted the same way fmtCurrency would render it on the page.
    const expectedThreeYearNet = `$${(THREE_YEAR_NET / 1_000_000).toFixed(2)}M`;
    expect(flat).toContain(expectedThreeYearNet);
  });
});
