import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import React from "react";
import { buildProformaPDFDocument } from "@/pages/proforma/ProformaPDFExport";
import {
  type ProformaSettingSnapshot,
  type ProformaConfig,
  type ProformaDriver,
  DEFAULT_PROFORMA_CONFIG,
} from "@/pages/proforma/proformaTypes";
import { DEFAULT_EXPLORE_STATE, type ExploreState } from "@/pages/explore/exploreState";

/**
 * Visual / structural snapshot guardrail for the multi-page Financial Proforma
 * PDF (cover + investment + trajectory + summary + N per-setting driver pages +
 * confidence + back cover).
 *
 * Like the nursing PDF, this document is generated client-side via
 * @react-pdf/renderer. The end-to-end download test only confirms the file
 * generates without throwing — it cannot inspect the rendered pages. This test
 * renders the document's React tree (without rasterizing to PDF, which is
 * non-deterministic across runs because of embedded fonts, /CreationDate, and
 * PDF object IDs), expands every custom helper component, and serializes the
 * resulting structure + copy + style props into a deterministic JSON snapshot
 * diffed on each run.
 *
 * What it catches:
 *   - Wrong copy (any printed string change)
 *   - Missing or extra sections (component / page count drift)
 *   - Broken page breaks (PAGE-element boundary changes)
 *   - Layout regressions in shared style props
 *
 * Implementation note: @react-pdf/renderer's primitives (Document, Page, View,
 * Text, etc.) are not React classes — they're plain string constants
 * (`'PAGE'`, `'VIEW'`, `'TEXT'`, …) re-exported from @react-pdf/primitives.
 * That means JSX like `<Text>foo</Text>` compiles to a React element whose
 * `type` is the string `"TEXT"`. The serializer below treats every
 * string-typed element as a renderer primitive (recording its props +
 * children verbatim) and recursively invokes every function-typed element as a
 * custom presentation component (none of which use React hooks).
 *
 * If the PDF is intentionally redesigned, regenerate the baseline with:
 *   npx vitest -u client/src/__tests__/proformaPdfSnapshot.test.tsx
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
// resulting copy shows up in the snapshot deterministically. totalPages is set
// to the proforma page count (9 — see the page-count test below for the
// lineup).
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

    // React fragments (<>...</>) carry no tag of their own — flatten straight
    // into their children. ValueDriverDetailPage returns one fragment wrapping
    // N per-setting <Page> elements; without this branch those pages vanish.
    if (type === React.Fragment) {
      return serialize(props.children);
    }

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

// A representative multi-setting deal: Outpatient + Emergency Department +
// Inpatient, each with itemized drivers across all four quadrants. Outpatient
// carries a named cost offset (scribe program) and the config carries a
// system-wide platform fee, so the snapshot exercises the per-setting table,
// the system-wide-fee row, the sensitivity table, the per-setting driver
// pages, and the value-trajectory chart. All inputs are fixed — no clocks, no
// random numbers, hardcoded ids — so the resulting tree is deterministic
// across runs.
const DRIVERS: ProformaDriver[] = [
  { id: "d-cap", name: "Documentation Time", value: 1_800_000, category: "time", quadrant: "Capacity", onset: "delayed" },
  { id: "d-rev", name: "Coding Accuracy", value: 1_200_000, category: "documentation", quadrant: "Revenue", onset: "immediate" },
  { id: "d-wf", name: "Clinician Retention", value: 900_000, category: "time", quadrant: "Workforce", onset: "phased" },
  { id: "d-ql", name: "Quality Capture", value: 350_000, category: "documentation", quadrant: "Quality", onset: "delayed" },
];

function makeSetting(
  careSetting: ProformaSettingSnapshot["careSetting"],
  overrides: Partial<ProformaSettingSnapshot> = {},
): ProformaSettingSnapshot {
  const drivers = overrides.drivers ?? DRIVERS;
  const sumDrivers = drivers.reduce((s, d) => s + d.value, 0);
  const quad = (q: string) => drivers.filter((d) => d.quadrant === q).reduce((s, d) => s + d.value, 0);
  return {
    id: `s-${careSetting}`,
    careSetting,
    label: careSetting,
    providerCount: 20,
    fullScaleProviders: 40,
    fullScaleUtilization: 85,
    encounters: 60_000,
    utilizationPercent: 85,
    annualValue: sumDrivers,
    timeValue: 0,
    docValue: 0,
    retentionValue: 0,
    totalHoursSaved: 5_000,
    drivers,
    costPerUnit: 250,
    pricingModel: "perUnit",
    implementationFee: 25_000,
    goLiveMonth: 1,
    color: "#000000",
    fullExploreState: { ...DEFAULT_EXPLORE_STATE } as ExploreState,
    capacityValue: quad("Capacity"),
    workforceValue: quad("Workforce"),
    revenueValue: quad("Revenue"),
    qualityValue: quad("Quality"),
    ...overrides,
  };
}

const SETTINGS: ProformaSettingSnapshot[] = [
  makeSetting("outpatient", {
    id: "op",
    label: "Ambulatory Network",
    providerCount: 320,
    fullScaleProviders: 400,
    encounters: 850_000,
    costOffsets: [
      { id: "off-scribe", label: "Scribe program", annualSpend: 600_000, displacementPct: 60, transitionMonths: 6 },
    ],
  }),
  makeSetting("ed", {
    id: "ed",
    label: "Emergency Department",
    providerCount: 90,
    fullScaleProviders: 110,
    encounters: 240_000,
    goLiveMonth: 4,
    pricingModel: "perEncounter",
    costPerEncounter: 3,
  }),
  makeSetting("inpatient", {
    id: "ip",
    label: "Inpatient",
    providerCount: 140,
    fullScaleProviders: 180,
    encounters: 410_000,
    goLiveMonth: 7,
  }),
];

const CONFIG: ProformaConfig = {
  ...DEFAULT_PROFORMA_CONFIG,
  contractTermMonths: 36,
  systemWideFee: 480_000,
};

function buildTree(): SnapshotNode[] {
  return serialize(
    buildProformaPDFDocument(SETTINGS, CONFIG, "Mercy Health System", "Abridge Value Engineering"),
  );
}

describe("Financial Proforma PDF — structural snapshot", () => {
  // The proforma derives contract dates from getContractStartDate() and the
  // document stamps "today" via new Date(...).toLocaleDateString(...). Freeze
  // the clock so the snapshot doesn't drift every calendar day.
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("renders the proforma PDF document tree deterministically", () => {
    expect(buildTree()).toMatchSnapshot();
  });

  it("contains exactly 9 top-level pages and matches the rendered count", () => {
    // Sanity check independent of the snapshot — guards against a Page being
    // accidentally added or removed.
    //
    // Page lineup for this 3-setting fixture (cover + 4 fixed content + N=3
    // per-setting driver pages + confidence + back cover = 9):
    //   1. Cover                       (PDFCoverPage)
    //   2. The Investment Case
    //   3. Value Trajectory (chart)
    //   4. Financial Summary + Sensitivity
    //   5. Value Drivers — Outpatient
    //   6. Value Drivers — Emergency Department
    //   7. Value Drivers — Inpatient
    //   8. Model Confidence
    //   9. Back Cover
    const tree = buildTree();

    let pageCount = 0;
    const visit = (node: SnapshotNode): void => {
      if (node.kind === "primitive" && node.tag === "PAGE") pageCount += 1;
      if (node.kind !== "text") node.children.forEach(visit);
    };
    tree.forEach(visit);

    expect(pageCount).toBe(9);
  });

  it("includes the headline copy + key labels as printed text", () => {
    const tree = buildTree();

    // Flatten every text node so we can assert that key copy is present
    // without pinning exact layout.
    const text: string[] = [];
    const visit = (node: SnapshotNode): void => {
      if (node.kind === "text") text.push(node.value);
      else node.children.forEach(visit);
    };
    tree.forEach(visit);
    const flat = text.join(" | ");

    expect(flat).toContain("Mercy Health System");
    expect(flat).toContain("Value-to-Cost");
    expect(flat).toContain("Payback");
    // System-wide fee row only renders because CONFIG.systemWideFee > 0.
    expect(flat).toContain("System-wide Platform Fee");
    // At least one setting label from the multi-setting fixture.
    expect(flat).toContain("Emergency Department");
  });
});
