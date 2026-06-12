import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import React from "react";
import { ExploreNarrativePDFDocument } from "@/components/explore/ExploreNarrativePDF";
import type {
  ExplorePDFData,
  ExploreCareSetting,
} from "@/components/explore/ExplorePDFExport";

/**
 * Visual / structural snapshot guardrail for the multi-page Outpatient / ED /
 * Inpatient narrative PDF (1 cover + 8 content pages = 9 total per setting).
 *
 * Mirrors `nursingPdfSnapshot.test.tsx` one-for-one. See that file's comment
 * block for the deeper rationale behind serializing the React tree instead of
 * rasterizing to PDF (embedded fonts + /CreationDate + PDF object IDs make
 * actual byte output non-deterministic).
 *
 * What this catches across all three non-nursing settings:
 *   - Wrong copy (any printed string change)
 *   - Missing or extra sections (component count drift)
 *   - Broken page breaks (PAGE-element boundary changes — e.g. a quadrant
 *     getting silently dropped or duplicated)
 *   - Layout regressions in shared style props
 *   - Setting-specific copy drift (the per-setting thesis intro / quadrant
 *     framing dictionaries)
 *
 * If the PDF is intentionally redesigned, regenerate the baseline with:
 *   npx vitest -u client/src/__tests__/exploreNarrativePdfSnapshot.test.tsx
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
// resulting copy ("Page 1 / 8") shows up in the snapshot deterministically.
const RENDER_CONTEXT = {
  pageNumber: 1,
  totalPages: 9,
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

// ───────────────────────── Fixtures ─────────────────────────

// Per-setting baselines that exercise every quadrant with realistic numbers.
// Capacity, Workforce, and Revenue all carry $ math; Quality stays
// qualitative-tracked. Both quantified and qualitative driver branches and
// the "other financial benefit" branch are exercised so the snapshot covers
// every render path. All inputs are fixed — no clocks, no random numbers —
// so the resulting tree is deterministic across runs.
function buildFixture(
  setting: Exclude<ExploreCareSetting, "nursing">,
): ExplorePDFData {
  const settingLabel: Record<Exclude<ExploreCareSetting, "nursing">, string> = {
    outpatient: "Outpatient",
    ed: "Emergency Department",
    inpatient: "Inpatient",
  };

  // Realistic-but-fixed numbers. Picked so quadrant totals round to clean
  // figures the snapshot prose can assert against.
  const providers = setting === "ed" ? 80 : setting === "inpatient" ? 120 : 240;
  const encounters =
    setting === "ed" ? 120_000 : setting === "inpatient" ? 36_000 : 480_000;

  const capacityValue = 2_400_000;
  const workforceValue = 1_800_000;
  const revenueValue = 3_600_000;
  const totalAnnual = capacityValue + workforceValue + revenueValue;

  const annualInvestment = 720_000;
  const implFee = 60_000;
  const year1Net = totalAnnual - annualInvestment;
  const year2Value = totalAnnual * 1.2;
  const year3Value = year2Value * 1.18;
  const year2Net = year2Value - annualInvestment;
  const year3Net = year3Value - annualInvestment;

  return {
    clientName: "Mercy Health System",
    preparedBy: "Abridge Value Engineering",
    date: "January 1, 2026",
    careSettingLabel: settingLabel[setting],

    careSetting: setting,
    numberOfProviders: providers,
    annualEncounters: encounters,
    utilizationPercent: 70,

    totalHoursSaved: 18_400,
    minutesSavedPerEncounter: 4,
    timePathScenario: "Realistic",

    quadrants: [
      {
        quadrant: "Capacity",
        annualTotal: capacityValue,
        oneTimeTotal: 0,
        drivers: [
          {
            id: "cap-throughput",
            label: "Visit throughput / access",
            shortDescription:
              "Reclaimed documentation time becomes added visit capacity at the panel level.",
            visibility: "quantified",
            value: capacityValue,
            calcSummary: `${providers} providers × 4 min saved × ${encounters.toLocaleString()} encounters = $${capacityValue.toLocaleString()}`,
          },
        ],
        otherFinancialBenefits: [],
      },
      {
        quadrant: "Workforce",
        annualTotal: workforceValue,
        oneTimeTotal: 0,
        drivers: [
          {
            id: "wf-retention",
            label: "Retention",
            shortDescription:
              "Reduced documentation burden lowers turnover among burned-out clinicians.",
            visibility: "quantified",
            value: workforceValue,
            calcSummary: `Turnover 18% × Replacement $250K × ${providers} providers × 15% impact = $${workforceValue.toLocaleString()}`,
          },
          {
            id: "wf-locum",
            label: "Locum / agency avoidance",
            shortDescription:
              "Each retained clinician avoids the locum spend behind the vacancy that would otherwise follow.",
            visibility: "quantified",
            value: 600_000,
            isChild: true,
            calcSummary: "8 weeks × $4,200/week × 18 vacancies avoided = $604K",
          },
        ],
        otherFinancialBenefits: [],
      },
      {
        quadrant: "Revenue",
        annualTotal: revenueValue,
        oneTimeTotal: 100_000,
        drivers: [
          {
            id: "rev-coding",
            label:
              setting === "inpatient"
                ? "DRG / CC-MCC capture"
                : "E/M leveling accuracy",
            shortDescription:
              "Complete notes lift coding accuracy and reduce down-coding losses.",
            visibility: "quantified",
            value: revenueValue,
            calcSummary: `${encounters.toLocaleString()} encounters × $7.50 lift = $${revenueValue.toLocaleString()}`,
          },
        ],
        otherFinancialBenefits: [
          {
            label: "Denial-prevention recovery",
            amount: 100_000,
            type: "oneTime",
          },
        ],
      },
      {
        quadrant: "Quality",
        annualTotal: 0,
        oneTimeTotal: 0,
        drivers: [
          {
            id: "ql-noteq",
            label: "Note quality / completeness",
            shortDescription:
              "Tracked post-deployment as the leading indicator that documentation lift translates to clinical signal.",
            visibility: "qualitative",
            value: 0,
          },
          {
            id: "ql-handoff",
            label:
              setting === "inpatient"
                ? "Hand-off completeness"
                : "Care continuity",
            shortDescription:
              "Tracked post-deployment alongside note quality for an integrated clinical view.",
            visibility: "qualitative",
            value: 0,
          },
        ],
        otherFinancialBenefits: [],
      },
    ],

    totalAnnualValue: totalAnnual,
    totalOneTimeValue: 100_000,

    pricingModel: "perProvider",
    costPerProvider: 250,
    implementationFee: implFee,
    includeImplementation: true,
    annualInvestment,

    year2GrowthPercent: 20,
    year3GrowthPercent: 18,
    year1Value: totalAnnual,
    year2Value,
    year3Value,
    year1Investment: annualInvestment,
    year2Investment: annualInvestment,
    year3Investment: annualInvestment,
    year1Net,
    year2Net,
    year3Net,
    threeYearGrossTotal: totalAnnual + year2Value + year3Value,
    threeYearInvestmentTotal: annualInvestment * 3,
    threeYearNetTotal: year1Net + year2Net + year3Net,

    netAnnualValue: year1Net,
    roi: year1Net / annualInvestment,
    valuePerProvider: totalAnnual / providers,
  };
}

function buildTree(
  setting: Exclude<ExploreCareSetting, "nursing">,
): SnapshotNode[] {
  return serialize(
    <ExploreNarrativePDFDocument data={buildFixture(setting)} />,
  );
}

// ── Long-org / large-dollar stress fixture (per setting) ─────────────────
// Mirrors the LONG_ORG_INPUT pattern in nursingPdfSnapshot.test.tsx. The
// shipped footer-collision bug only surfaced when the org name + the
// fixed-width "PAGE X / Y" right slot overflowed the line — i.e., for
// long names. Pairing the long name with billion-class dollar figures
// also stresses the Investment-page hero number sizing AND the per-quadrant
// HeroSubtotal sizing. One stress fixture per non-nursing setting because
// each setting's quadrant-framing dictionary is independent and a
// regression in any one of them needs to fail CI standalone.
function buildLongOrgFixture(
  setting: Exclude<ExploreCareSetting, "nursing">,
): ExplorePDFData {
  const base = buildFixture(setting);
  const annualInvestment = 4_200_000;
  const totalAnnual = 33_430_000;
  const year2Value = totalAnnual * 1.2;
  const year3Value = year2Value * 1.18;
  return {
    ...base,
    clientName:
      "Northwestern Memorial HealthCare System — Northwest Region",
    quadrants: base.quadrants.map((q) => {
      if (q.quadrant === "Capacity") {
        return {
          ...q,
          annualTotal: 12_400_000,
          drivers: q.drivers.map((d) => ({ ...d, value: 12_400_000 })),
        };
      }
      if (q.quadrant === "Workforce") {
        return {
          ...q,
          annualTotal: 9_800_000,
          drivers: q.drivers.map((d) => ({
            ...d,
            value: d.isChild ? 2_400_000 : 7_400_000,
          })),
        };
      }
      if (q.quadrant === "Revenue") {
        return {
          ...q,
          annualTotal: 11_230_000,
          drivers: q.drivers.map((d) => ({ ...d, value: 11_230_000 })),
        };
      }
      return q;
    }),
    totalAnnualValue: totalAnnual,
    annualInvestment,
    implementationFee: 250_000,
    year1Value: totalAnnual,
    year2Value,
    year3Value,
    year1Investment: annualInvestment,
    year2Investment: annualInvestment,
    year3Investment: annualInvestment,
    year1Net: totalAnnual - annualInvestment,
    year2Net: year2Value - annualInvestment,
    year3Net: year3Value - annualInvestment,
    threeYearGrossTotal: totalAnnual + year2Value + year3Value,
    threeYearInvestmentTotal: annualInvestment * 3,
    threeYearNetTotal:
      totalAnnual + year2Value + year3Value - annualInvestment * 3,
    netAnnualValue: totalAnnual - annualInvestment,
    roi: (totalAnnual - annualInvestment) / annualInvestment,
    valuePerProvider: totalAnnual / base.numberOfProviders,
  };
}

function buildLongOrgTree(
  setting: Exclude<ExploreCareSetting, "nursing">,
): SnapshotNode[] {
  return serialize(
    <ExploreNarrativePDFDocument data={buildLongOrgFixture(setting)} />,
  );
}

function countPages(tree: SnapshotNode[]): number {
  let pageCount = 0;
  const visit = (node: SnapshotNode): void => {
    if (node.kind === "primitive" && node.tag === "PAGE") pageCount += 1;
    if (node.kind !== "text") node.children.forEach(visit);
  };
  tree.forEach(visit);
  return pageCount;
}

function flattenText(tree: SnapshotNode[]): string {
  const text: string[] = [];
  const visit = (node: SnapshotNode): void => {
    if (node.kind === "text") text.push(node.value);
    else node.children.forEach(visit);
  };
  tree.forEach(visit);
  return text.join(" | ");
}

// ───────────────────────── Tests ─────────────────────────

// Page lineup (1 cover + 8 content = 9 total) per non-nursing setting:
//   1. Cover                        (PDFCoverPage)
//   2. Thesis / 2x2 grid
//   3. Practice & Setup + Time Savings
//   4. Capacity quadrant
//   5. Workforce quadrant
//   6. Revenue quadrant
//   7. Quality quadrant
//   8. Investment Case (3-yr projection)
//   9. Assessment Summary + Methodology
const EXPECTED_PAGE_COUNT = 9;

describe("Explore Narrative PDF — structural snapshot", () => {
  // PDFCoverPage internally calls `new Date().toLocaleDateString(...)` to
  // stamp the cover with today's date. Without freezing the clock the
  // snapshot would drift every calendar day.
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  // The full deterministic snapshot is anchored on outpatient. ED and
  // inpatient are guarded with the lighter page-count + headline-copy
  // assertions below so a per-setting copy regression still fails CI without
  // tripling the snapshot maintenance burden every time outpatient prose
  // shifts.
  it("renders the outpatient document tree deterministically (Mercy fixture)", () => {
    expect(buildTree("outpatient")).toMatchSnapshot();
  });

  it.each(["outpatient", "ed", "inpatient"] as const)(
    "%s: contains exactly 9 top-level pages (1 cover + 8 content)",
    (setting) => {
      // Sanity check independent of the snapshot — guards against a Page
      // being accidentally added or removed even if the rest of the
      // structure churns enough that a snapshot diff is hard to read.
      expect(countPages(buildTree(setting))).toBe(EXPECTED_PAGE_COUNT);
    },
  );

  it.each([
    {
      setting: "outpatient" as const,
      coverLabel: "OUTPATIENT VALUE ASSESSMENT",
      thesisHeadline: "Where Outpatient Documentation Value Lives",
    },
    {
      setting: "ed" as const,
      coverLabel: "EMERGENCY DEPARTMENT VALUE ASSESSMENT",
      thesisHeadline: "Where ED Documentation Value Lives",
    },
    {
      setting: "inpatient" as const,
      coverLabel: "INPATIENT VALUE ASSESSMENT",
      thesisHeadline: "Where Inpatient Documentation Value Lives",
    },
  ])(
    "$setting: includes setting-aware cover label and thesis headline",
    ({ setting, coverLabel, thesisHeadline }) => {
      const flat = flattenText(buildTree(setting));

      // Cover page identity
      expect(flat).toContain("Mercy Health System");
      expect(flat).toContain(coverLabel);

      // Thesis page setting-specific headline (catches dictionary drift)
      expect(flat).toContain(thesisHeadline);

      // Footer center text is JUST the org name now — the previous
      // "Outpatient Value Assessment" / "ED Value Assessment" /
      // "Inpatient Value Assessment" suffix was removed when the footer
      // moved to the 3-slot geometry from the Nursing PDF
      // (pdf_layout_guidelines.md §1a). Assert the suffix strings are
      // gone so a regression that re-introduces them fails CI.
      expect(flat).not.toContain("Outpatient Value Assessment");
      expect(flat).not.toContain("ED Value Assessment");
      expect(flat).not.toContain("Inpatient Value Assessment");

      // Quadrant rhythm — every non-nursing setting renders the four-quadrant
      // grid on the thesis page AND a dedicated quadrant page for each.
      expect(flat).toContain("CAPACITY");
      expect(flat).toContain("WORKFORCE");
      expect(flat).toContain("REVENUE");
      expect(flat).toContain("QUALITY");

      // Per-quadrant subtotal figures — the dollar punchline each quadrant
      // resolves to. Capacity / Workforce / Revenue carry $ math (rendered in
      // the Value-by-Domain and Value Summary blocks); the qualitative Quality
      // quadrant resolves to its tracked-state HeroSubtotal. These are the
      // same across all three settings (shared buildFixture numbers), so a
      // regression that drops a quadrant's subtotal fails CI for every setting.
      expect(flat).toContain("$2.40M"); // Capacity subtotal
      expect(flat).toContain("$1.80M"); // Workforce subtotal
      expect(flat).toContain("$3.60M"); // Revenue subtotal
      expect(flat).toContain("Quality Subtotal");

      // Investment + summary pages — assert the unique copy on each so
      // accidentally dropping either page fails this test even if page
      // count somehow stays at 9. The Investment Case page now carries a
      // scenario-sensitivity framing (conservative / base / optimistic).
      expect(flat).toContain("THE INVESTMENT CASE");
      expect(flat).toContain("The Investment Case.");
      expect(flat).toContain("configured model");
      expect(flat).toMatch(/\d+(\.\d+)?×/);
      expect(flat).toContain("YOUR ASSESSMENT SUMMARY");
      expect(flat).toContain("Projected Net Annual Value");
      expect(flat).toContain("METHODOLOGY");
      expect(flat).toContain("How the Model Works.");
    },
  );

  // ── Long-org / large-dollar stress test (per setting) ───────────────────
  // Anchors the same three layout invariants as the Nursing stress test for
  // each non-nursing setting:
  //   1. Page count is still exactly 9 (no card overflow forcing extra pages).
  //   2. Footer center text is JUST the org name — never glued to a
  //      document-title slug — so it cannot grow into the right-slot
  //      "PAGE X / Y" the way the shipped bug did.
  //   3. The Investment cumulative-multiple HERO renders as a standalone
  //      number ("X.X×"), not as inline body copy.
  //   4. Each quadrant's HeroSubtotal carries its label in title-case.
  it.each(["outpatient", "ed", "inpatient"] as const)(
    "%s: long-org / large-dollar fixture renders without overflow or collapse",
    (setting) => {
      const tree = buildLongOrgTree(setting);
      const flat = flattenText(tree);

      expect(countPages(tree)).toBe(EXPECTED_PAGE_COUNT);

      expect(flat).toContain(
        "Northwestern Memorial HealthCare System — Northwest Region",
      );

      // Footer suffix strings must be absent — the 3-slot footer renders
      // org name only.
      expect(flat).not.toContain("Outpatient Value Assessment");
      expect(flat).not.toContain("ED Value Assessment");
      expect(flat).not.toContain("Inpatient Value Assessment");

      // Scenario-sensitivity framing on the Investment Case page renders the
      // ROI multiple as a standalone "X.X×" token (not inline body copy).
      expect(flat).toContain("configured model");
      expect(flat).toMatch(/\d+(\.\d+)?×/);

      // Quality's tracked-state HeroSubtotal anchors the bottom of its page.
      expect(flat).toContain("Quality Subtotal");

      // Capacity (the largest single-driver figure) renders via fmtCurrency
      // in the millions form, asserting a 2-digit-million value formats
      // without reflowing across the Value-by-Domain and Summary blocks.
      expect(flat).toContain("$12.40M");
    },
  );
});
