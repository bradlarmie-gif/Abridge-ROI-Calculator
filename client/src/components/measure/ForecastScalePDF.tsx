import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Rect,
  Font,
  pdf,
} from "@react-pdf/renderer";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import { savePdfBlob } from "@/lib/pdf-save";
import {
  computeScenarioInvestment,
  PRICING_MODEL_LABELS,
  type PricingScenario,
  type PricingYearInput,
} from "@/lib/forecastPricing";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";

Font.registerHyphenationCallback((w) => [w]);
Font.register({
  family: "Manrope",
  fonts: [
    { src: manropeRegular, fontWeight: 400 },
    { src: manropeBold, fontWeight: 700 },
  ],
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ForecastScalePDFData {
  clientName?: string;
  totalRealized: number;
  totalProjected: number;
  addedSettingsTotal: number;
  combinedTotal: number;
  quadrantTotals: {
    Capacity: { realized: number; projected: number };
    Workforce: { realized: number; projected: number };
    Revenue: { realized: number; projected: number };
    Quality: { realized: number; projected: number };
  };
  combinedProviders: number;
  combinedEncounters: number;
  forecastYears: number;
  yearlyInputs: PricingYearInput[];
  pricingScenarios: PricingScenario[];
  bestValueScenarioId: string | null;
  baseAdoptionPct: number;
  simpleInvestment: number;
}

// ─── Color system ─────────────────────────────────────────────────────────────

const colors = {
  primary: "#EA2C00",
  primaryText: "#1A1A1A",
  secondary: "#666666",
  tertiary: "#999999",
  cards: "#F5F0EB",
  separator: "#E5DCD0",
  separatorHeavy: "#D4C9BC",
  background: "#FDFAF7",
  white: "#FFFFFF",
};

const domainColors: Record<string, string> = {
  Capacity: "#2563EB",
  Workforce: "#7C3AED",
  Revenue: "#EA2C00",
  Quality: "#059669",
};

const QUADS = ["Capacity", "Workforce", "Revenue", "Quality"] as const;

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (!Number.isFinite(n)) return "$0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString();
}

function fmtPct(n: number, showPlus = true): string {
  const prefix = showPlus && n > 0 ? "+" : "";
  return `${prefix}${n.toFixed(0)}%`;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    paddingTop: 54,
    paddingLeft: 54,
    paddingRight: 54,
    paddingBottom: 0,
    fontFamily: "Manrope",
    fontSize: 10,
    color: colors.primaryText,
    backgroundColor: colors.background,
  },
  pageWrapper: {
    flex: 1,
    flexDirection: "column",
    paddingBottom: 72,
  },
  sectionLabel: {
    fontSize: 8.5,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 2.5,
    fontWeight: "bold",
    marginBottom: 14,
  },
  subHead: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 14,
  },
  body: {
    fontSize: 9.5,
    color: colors.secondary,
    lineHeight: 1.65,
    marginBottom: 10,
  },
  cardBg: {
    backgroundColor: colors.cards,
    borderRadius: 4,
    padding: 14,
  },
  callout: {
    backgroundColor: colors.cards,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 3,
    marginBottom: 10,
  },
  rule: {
    height: 1,
    backgroundColor: colors.separator,
    marginVertical: 12,
  },
  chip: {
    backgroundColor: colors.separator,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 8,
    color: colors.primaryText,
    fontWeight: "bold",
  },
  label: {
    fontSize: 6.5,
    color: colors.tertiary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  // Table
  tableHead: {
    flexDirection: "row",
    backgroundColor: colors.cards,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 3,
    marginBottom: 1,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  tableCell: {
    flex: 1,
    fontSize: 8.5,
    color: colors.secondary,
    textAlign: "right",
  },
  tableCellH: {
    flex: 1,
    fontSize: 7,
    fontWeight: "bold",
    color: colors.tertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "right",
  },
  tableCellLeft: {
    flex: 1,
    fontSize: 8.5,
    fontWeight: "bold",
    color: colors.primaryText,
  },
  tableCellHLeft: {
    flex: 1,
    fontSize: 7,
    fontWeight: "bold",
    color: colors.tertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});

// ─── Shared components ────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function PageFooter({ orgName }: { orgName: string }) {
  return (
    <View
      style={{
        position: "absolute",
        bottom: 24,
        left: 54,
        right: 54,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: colors.separator,
        paddingTop: 8,
      }}
    >
      <Text style={{ fontSize: 8, color: colors.secondary }}>
        {orgName ? `${orgName} · ` : ""}Scale Opportunity Brief
      </Text>
      <Text style={{ fontSize: 8, color: colors.tertiary }}>
        Confidential · Abridge
      </Text>
    </View>
  );
}

// Metric strip used on both Summary and Pricing pages
function MetricStrip({
  items,
}: {
  items: { label: string; value: string; highlight?: boolean }[];
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.white,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.separator,
        marginBottom: 12,
      }}
    >
      {items.map(({ label, value, highlight }, i) => (
        <View
          key={label}
          style={{
            flex: 1,
            padding: 12,
            alignItems: "center",
            borderRightWidth: i < items.length - 1 ? 1 : 0,
            borderRightColor: colors.separator,
          }}
        >
          <Text style={styles.label}>{label}</Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              color: highlight ? colors.primary : colors.primaryText,
            }}
          >
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Narrative generators ─────────────────────────────────────────────────────

function buildScaleNarrative(data: ForecastScalePDFData): string {
  const org = data.clientName || "This organization";
  const { combinedTotal, totalRealized, quadrantTotals, combinedProviders, forecastYears, yearlyInputs, baseAdoptionPct, simpleInvestment, pricingScenarios } = data;

  if (combinedTotal === 0) {
    return `${org} has configured a forecast scenario. Add tracked drivers to the quadrant pages to populate the scale projection.`;
  }

  const multiplier = totalRealized > 0 ? combinedTotal / totalRealized : 0;

  const topQuad = QUADS.slice().sort(
    (a, b) => quadrantTotals[b].projected - quadrantTotals[a].projected
  )[0];
  const topVal = quadrantTotals[topQuad].projected;
  const topPct = combinedTotal > 0 ? Math.round((topVal / combinedTotal) * 100) : 0;
  const topShare = topPct >= 60 ? "the majority" : topPct >= 40 ? "nearly half" : `${topPct}%`;

  let text = "";

  if (totalRealized > 0 && multiplier > 1.05) {
    text = `${org}'s measured footprint documents ${fmtCurrency(totalRealized)} in annual value today. This projection applies those same per-unit economics to a ${fmtNum(combinedProviders)}-provider deployment — no new efficiency assumptions, no benchmark estimates. The result is ${fmtCurrency(combinedTotal)}, ${multiplier.toFixed(1)}× the current measurement, driven entirely by scaling the active provider base.`;
  } else {
    text = `Projected across ${fmtNum(combinedProviders)} providers at full deployment, this configuration generates ${fmtCurrency(combinedTotal)} in annual value. The projection applies measured per-unit economics directly — no benchmarks, no estimates beyond what the tracked drivers already show.`;
  }

  text += ` ${topQuad} accounts for ${topShare} of that total, reflecting where Abridge's documentation support has the most direct economic impact.`;

  const baseValue = Math.round(combinedTotal * (baseAdoptionPct / 100));
  const hasInvestment = (pricingScenarios.length > 0 || simpleInvestment > 0);
  if (hasInvestment && baseValue > 0) {
    text += ` At the ${baseAdoptionPct}% adoption base case, projected value is ${fmtCurrency(baseValue)}.`;
  }

  if (forecastYears > 1 && yearlyInputs.length > 1) {
    const lastYear = yearlyInputs[yearlyInputs.length - 1];
    if (lastYear.totalValue > combinedTotal * 1.1) {
      text += ` The case builds over time: by Year ${forecastYears}, annual value reaches ${fmtCurrency(lastYear.totalValue)} as utilization and provider volume mature.`;
    }
  }

  return text;
}

// ─── Stacked bar chart for multi-year ────────────────────────────────────────

function YearlyBarChart({ yearlyInputs }: { yearlyInputs: PricingYearInput[] }) {
  if (yearlyInputs.length < 2) return null;

  const W = 396;
  const H = 72;
  const barPad = 8;
  const n = yearlyInputs.length;
  const barW = (W - barPad * (n + 1)) / n;
  const maxVal = Math.max(...yearlyInputs.map((y) => y.totalValue), 1);

  const STACK: Array<{ key: keyof PricingYearInput; fill: string; label: string }> = [
    { key: "qualityValue",   fill: "#059669", label: "Quality" },
    { key: "revenueValue",   fill: "#EA2C00", label: "Revenue" },
    { key: "workforceValue", fill: "#7C3AED", label: "Workforce" },
    { key: "capacityValue",  fill: "#2563EB", label: "Capacity" },
  ];

  // Pre-compute flat list of rects (no View wrappers inside Svg)
  const rects: Array<{ x: number; y: number; w: number; h: number; fill: string }> = [];
  yearlyInputs.forEach((yr, i) => {
    const x = barPad + i * (barW + barPad);
    let yBottom = H;
    STACK.forEach(({ key, fill }) => {
      const val = (yr[key] as number) || 0;
      const segH = (val / maxVal) * H;
      if (segH > 0.3) {
        yBottom -= segH;
        rects.push({ x, y: yBottom, w: barW, h: segH, fill });
      }
    });
  });

  return (
    <View style={{ marginBottom: 10 }}>
      <Svg width={W} height={H}>
        {rects.map((r, idx) => (
          <Rect key={idx} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} opacity={0.9} />
        ))}
      </Svg>
      {/* Year labels — outside SVG using regular Views */}
      <View style={{ flexDirection: "row", paddingHorizontal: barPad }}>
        {yearlyInputs.map((_, i) => (
          <Text key={i} style={{ flex: 1, fontSize: 7, color: colors.tertiary, textAlign: "center" }}>
            {`Yr ${i + 1}`}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 5, flexWrap: "wrap" }}>
        {STACK.slice().reverse().map(({ fill, label }) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <View style={{ width: 7, height: 7, borderRadius: 1, backgroundColor: fill }} />
            <Text style={{ fontSize: 7, color: colors.tertiary }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Page 2: Scale Summary ────────────────────────────────────────────────────

function ScaleSummaryPage({ data }: { data: ForecastScalePDFData }) {
  const org = data.clientName || "";
  const { totalRealized, combinedTotal, quadrantTotals, combinedProviders, addedSettingsTotal, forecastYears, yearlyInputs, pricingScenarios, bestValueScenarioId } = data;
  const isMultiYear = forecastYears > 1 && yearlyInputs.length > 1;

  const upliftPct = totalRealized > 0
    ? ((combinedTotal - totalRealized) / totalRealized) * 100
    : 0;
  const multiplier = totalRealized > 0 ? combinedTotal / totalRealized : 0;

  // Best pricing for ROI strip — tier scenario takes priority, ACV as fallback
  const bestScenario = bestValueScenarioId
    ? pricingScenarios.find((s) => s.id === bestValueScenarioId)
    : pricingScenarios[0];
  const bestInvestment = (() => {
    if (bestScenario) {
      const scale = bestScenario.model === "perProvider" ? data.combinedProviders
        : (bestScenario.model === "perEncounter" || bestScenario.model === "platformFee") ? data.combinedEncounters
        : 0;
      const { value, warning } = computeScenarioInvestment(bestScenario, scale);
      if (!warning && value > 0) return value;
    }
    return data.simpleInvestment || 0;
  })();
  const bestNet = bestInvestment > 0 ? combinedTotal - bestInvestment : 0;
  const roi = bestInvestment > 0 ? combinedTotal / bestInvestment : 0;
  const showROIStrip = bestInvestment > 0 && combinedTotal > 0;

  const narrative = buildScaleNarrative(data);

  return (
    <Page size="LETTER" style={styles.page}>
      <PageFooter orgName={org} />
      <View style={styles.pageWrapper}>
        <SectionLabel>Scale Opportunity Brief</SectionLabel>

        {/* Hero card */}
        <View style={[styles.cardBg, { marginBottom: 12, paddingVertical: 22 }]}>
          <Text
            style={{
              fontSize: 8.5,
              color: colors.secondary,
              textTransform: "uppercase",
              letterSpacing: 2.5,
              fontWeight: "bold",
              marginBottom: 6,
            }}
          >
            Projected Annual Value at Full Scale
          </Text>
          <Text
            style={{
              fontSize: 40,
              fontWeight: "bold",
              color: colors.primary,
              lineHeight: 1.0,
              marginBottom: 8,
            }}
          >
            {fmtCurrency(combinedTotal)}
          </Text>
          <Text style={{ fontSize: 9, color: colors.secondary, marginBottom: 12 }}>
            {totalRealized > 0 && multiplier > 1
              ? `${multiplier.toFixed(1)}× the ${fmtCurrency(totalRealized)} currently measured · ${fmtNum(combinedProviders)} providers at scale`
              : `${fmtNum(combinedProviders)} providers at projected scale`}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {[
              org || null,
              `${fmtNum(combinedProviders)} providers`,
              totalRealized > 0 ? `${fmtCurrency(totalRealized)} measured today` : null,
              upliftPct > 0 ? `${fmtPct(upliftPct)} scale uplift` : null,
            ]
              .filter(Boolean)
              .map((chip, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{chip as string}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* ROI strip (conditional on pricing) */}
        {showROIStrip && (
          <MetricStrip
            items={[
              { label: "Annual Investment", value: fmtCurrency(bestInvestment) },
              { label: "Net Annual Value", value: fmtCurrency(bestNet), highlight: bestNet > 0 },
              { label: "Return on Investment", value: `${roi.toFixed(1)}×`, highlight: true },
            ]}
          />
        )}

        {/* Domain cards */}
        <Text style={styles.subHead}>Value by Domain</Text>
        <View style={{ flexDirection: "row", gap: 7, marginBottom: 14 }}>
          {QUADS.map((q) => {
            const t = quadrantTotals[q];
            const dColor = domainColors[q];
            const hasVal = t.projected > 0;
            const delta = t.projected - t.realized;
            const pct = t.realized > 0 ? (delta / t.realized) * 100 : 0;
            return (
              <View
                key={q}
                style={{
                  flex: 1,
                  backgroundColor: colors.white,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: hasVal ? dColor + "40" : colors.separator,
                  padding: 10,
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: hasVal ? dColor : colors.separator,
                    marginBottom: 5,
                  }}
                />
                <Text
                  style={{
                    fontSize: 7.5,
                    fontWeight: "bold",
                    color: hasVal ? dColor : colors.tertiary,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 5,
                    textAlign: "center",
                  }}
                >
                  {q}
                </Text>
                {hasVal ? (
                  <>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: colors.primaryText,
                        textAlign: "center",
                        lineHeight: 1.1,
                      }}
                    >
                      {fmtCurrency(t.projected)}
                    </Text>
                    {t.realized > 0 && (
                      <Text
                        style={{
                          fontSize: 7.5,
                          color: colors.tertiary,
                          marginTop: 3,
                          textAlign: "center",
                        }}
                      >
                        from {fmtCurrency(t.realized)}
                        {delta > 0 ? ` · ${fmtPct(pct)}` : ""}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={{ fontSize: 8, color: colors.tertiary, textAlign: "center" }}>
                    No drivers
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Added settings row */}
        {addedSettingsTotal > 0 && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: colors.white,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: colors.separator,
              paddingHorizontal: 12,
              paddingVertical: 8,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 9, color: colors.secondary }}>
              + Modeled expansion settings
            </Text>
            <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.primaryText }}>
              {fmtCurrency(addedSettingsTotal)}
            </Text>
          </View>
        )}

        {/* Narrative */}
        <Text style={styles.body}>{narrative}</Text>

        {/* Multi-year table */}
        {isMultiYear && (
          <>
            <Text style={styles.subHead}>Multi-Year Trajectory</Text>
            <YearlyBarChart yearlyInputs={yearlyInputs} />
            <View style={{ marginBottom: 14 }}>
              <View style={styles.tableHead}>
                <Text style={styles.tableCellHLeft}>Year</Text>
                <Text style={styles.tableCellH}>Providers</Text>
                <Text style={styles.tableCellH}>Capacity</Text>
                <Text style={styles.tableCellH}>Workforce</Text>
                <Text style={styles.tableCellH}>Revenue</Text>
                <Text style={styles.tableCellH}>Quality</Text>
                <Text style={[styles.tableCellH, { color: colors.primaryText }]}>Total</Text>
              </View>
              {yearlyInputs.map((yr, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.tableCellLeft}>Year {i + 1}</Text>
                  <Text style={styles.tableCell}>{fmtNum(yr.providers)}</Text>
                  <Text style={styles.tableCell}>{fmtCurrency(yr.capacityValue)}</Text>
                  <Text style={styles.tableCell}>{fmtCurrency(yr.workforceValue)}</Text>
                  <Text style={styles.tableCell}>{fmtCurrency(yr.revenueValue)}</Text>
                  <Text style={styles.tableCell}>{fmtCurrency(yr.qualityValue)}</Text>
                  <Text style={[styles.tableCell, { fontWeight: "bold", color: colors.primaryText }]}>
                    {fmtCurrency(yr.totalValue)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Methodology callout */}
        <View style={styles.callout}>
          <Text style={[styles.label, { marginBottom: 5 }]}>How These Projections Are Derived</Text>
          <Text style={styles.body}>
            The scale projection is not a benchmark estimate. It multiplies the per-unit economics measured in active deployment — time saved per note, revenue recovered per encounter, staff hours retained per provider — by the difference between the current footprint and the projected one. A 2× scale factor means twice the active volume with the same per-unit outcomes. Attribution weights and value assumptions carry forward from the measurement phase without adjustment. Reviewers who disagree with a specific driver's per-unit value can update that driver in the source measurement and regenerate.
          </Text>
        </View>
      </View>
    </Page>
  );
}

// ─── Page 3: Sensitivity Analysis ────────────────────────────────────────────

const ADOPTION_ROWS = [
  { label: "50% Adoption", sub: "Conservative floor", pct: 0.5 },
  { label: "70% Adoption", sub: "Typical deployment", pct: 0.7 },
  { label: "90% Adoption", sub: "High utilization", pct: 0.9 },
];

const VALUE_COLS = [
  { top: "75%", sub: "Value Realization", pct: 0.75 },
  { top: "100%", sub: "Value Realization", pct: 1.0 },
  { top: "125%", sub: "Value Realization", pct: 1.25 },
];

function SensitivityPage({ data }: { data: ForecastScalePDFData }) {
  const {
    combinedTotal,
    combinedProviders,
    combinedEncounters,
    quadrantTotals,
    pricingScenarios,
    bestValueScenarioId,
    clientName,
    baseAdoptionPct,
    simpleInvestment,
  } = data;

  const pricingScenario = bestValueScenarioId
    ? pricingScenarios.find((s) => s.id === bestValueScenarioId)
    : pricingScenarios[0];

  const investment = (() => {
    if (pricingScenario) {
      const scale =
        pricingScenario.model === "perProvider"
          ? combinedProviders
          : pricingScenario.model === "perEncounter" ||
            pricingScenario.model === "platformFee"
          ? combinedEncounters
          : 0;
      const { value, warning } = computeScenarioInvestment(pricingScenario, scale);
      if (!warning && value > 0) return value;
    }
    return simpleInvestment || 0;
  })();

  const hasPricing = investment > 0 && combinedTotal > 0;

  return (
    <Page size="LETTER" style={styles.page}>
      <PageFooter orgName={clientName || ""} />
      <View style={styles.pageWrapper}>
        <SectionLabel>Sensitivity Analysis</SectionLabel>

        <Text style={styles.body}>
          Two variables independently determine the range of outcomes: how many
          providers actively use Abridge at full scale (adoption), and whether
          the per-unit economics measured so far hold as the deployment grows
          (value realization). The matrix stress-tests both.
        </Text>

        {/* Axis explanation */}
        <View
          style={[
            styles.cardBg,
            { flexDirection: "row", gap: 14, marginBottom: 16 },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { marginBottom: 5 }]}>
              Rows — Adoption Rate
            </Text>
            <Text style={styles.body}>
              Share of the projected provider headcount actively using Abridge.
              50% is a conservative floor for early deployment; 70% reflects
              typical outcomes after change management; 90% represents high
              sustained utilization in mature programs.
            </Text>
          </View>
          <View
            style={{ width: 1, backgroundColor: colors.separator }}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { marginBottom: 5 }]}>
              Columns — Value Realization
            </Text>
            <Text style={styles.body}>
              Whether the measured per-unit economics hold, compress, or improve
              at scale. 75% discounts for friction and scale risk. 100% means
              outcomes match what was measured. 125% reflects compounding
              effects documented in second-year deployments.
            </Text>
          </View>
        </View>

        {/* Matrix column headers */}
        <View style={{ flexDirection: "row", marginBottom: 3 }}>
          {/* Corner label */}
          <View style={{ width: 118, flexShrink: 0, justifyContent: "flex-end", paddingBottom: 6, paddingRight: 6 }}>
            <Text style={[styles.label, { textAlign: "right" }]}>
              Adoption ↓  Value →
            </Text>
          </View>
          {VALUE_COLS.map((col, ci) => (
            <View
              key={ci}
              style={{
                flex: 1,
                backgroundColor: colors.cards,
                borderRadius: 4,
                paddingVertical: 8,
                paddingHorizontal: 4,
                marginHorizontal: 2,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "bold",
                  color: colors.primaryText,
                  textAlign: "center",
                }}
              >
                {col.top}
              </Text>
              <Text
                style={{
                  fontSize: 7.5,
                  color: colors.tertiary,
                  textAlign: "center",
                  marginTop: 1,
                }}
              >
                {col.sub}
              </Text>
            </View>
          ))}
        </View>

        {/* Matrix rows */}
        {ADOPTION_ROWS.map((row, ri) => (
          <View
            key={ri}
            style={{ flexDirection: "row", marginBottom: 3, alignItems: "stretch" }}
          >
            {/* Row header */}
            <View
              style={{
                width: 118,
                flexShrink: 0,
                backgroundColor: colors.cards,
                borderRadius: 4,
                paddingVertical: 10,
                paddingHorizontal: 10,
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 8.5,
                  fontWeight: "bold",
                  color: colors.primaryText,
                  marginBottom: 2,
                }}
              >
                {row.label}
              </Text>
              <Text style={{ fontSize: 7, color: colors.tertiary }}>{row.sub}</Text>
            </View>

            {/* Cells */}
            {VALUE_COLS.map((col, ci) => {
              const cellValue = combinedTotal * row.pct * col.pct;
              const isBase = row.pct === baseAdoptionPct / 100 && col.pct === 1.0;
              const net = investment > 0 ? cellValue - investment : 0;
              const roi = investment > 0 ? cellValue / investment : 0;

              return (
                <View
                  key={ci}
                  style={{
                    flex: 1,
                    backgroundColor: isBase ? colors.cards : colors.white,
                    borderWidth: isBase ? 2 : 1,
                    borderColor: isBase ? colors.primary : colors.separator,
                    borderRadius: 4,
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    marginHorizontal: 2,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isBase && (
                    <View
                      style={{
                        backgroundColor: colors.primary,
                        borderRadius: 3,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        marginBottom: 5,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 6,
                          fontWeight: "bold",
                          color: colors.white,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        Base Case
                      </Text>
                    </View>
                  )}
                  <Text
                    style={{
                      fontSize: isBase ? 15 : 13,
                      fontWeight: "bold",
                      color: isBase ? colors.primary : colors.primaryText,
                      textAlign: "center",
                    }}
                  >
                    {fmtCurrency(cellValue)}
                  </Text>
                  {hasPricing && investment > 0 && (
                    <>
                      <View
                        style={{
                          marginTop: 5,
                          backgroundColor:
                            roi >= 1
                              ? "#059669" + "18"
                              : colors.separator,
                          borderRadius: 3,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 8,
                            fontWeight: "bold",
                            color: roi >= 1 ? "#059669" : colors.secondary,
                            textAlign: "center",
                          }}
                        >
                          {roi.toFixed(1)}× ROI
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 7,
                          color: colors.tertiary,
                          marginTop: 2,
                          textAlign: "center",
                        }}
                      >
                        net {fmtCurrency(net)}
                      </Text>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {hasPricing && investment > 0 && (
          <Text
            style={{
              fontSize: 8.5,
              color: colors.tertiary,
              marginTop: 6,
              marginBottom: 4,
            }}
          >
            {pricingScenario
              ? `ROI uses the "${pricingScenario.label}" scenario · ${fmtCurrency(investment)}/yr at projected scale`
              : `ROI uses the annual contract value · ${fmtCurrency(investment)}/yr`}
          </Text>
        )}

        <View style={[styles.rule, { marginTop: 10 }]} />

        {/* Domain composition of base case */}
        <Text style={styles.subHead}>Base Case Composition</Text>
        <View
          style={{
            flexDirection: "row",
            backgroundColor: colors.white,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: colors.separator,
            marginBottom: 12,
          }}
        >
          {QUADS.filter((q) => data.quadrantTotals[q].projected > 0).map(
            (q, i, arr) => {
              const val = data.quadrantTotals[q].projected;
              const pct =
                combinedTotal > 0
                  ? Math.round((val / combinedTotal) * 100)
                  : 0;
              return (
                <View
                  key={q}
                  style={{
                    flex: 1,
                    padding: 10,
                    alignItems: "center",
                    borderRightWidth: i < arr.length - 1 ? 1 : 0,
                    borderRightColor: colors.separator,
                  }}
                >
                  <Text style={styles.label}>{q}</Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      color: domainColors[q],
                    }}
                  >
                    {fmtCurrency(val)}
                  </Text>
                  <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>
                    {pct}% of total
                  </Text>
                </View>
              );
            }
          )}
        </View>

        {/* Reading callout */}
        <View style={[styles.callout, { borderLeftColor: colors.secondary }]}>
          <Text style={[styles.label, { marginBottom: 5 }]}>
            Reading This Table
          </Text>
          <Text style={styles.body}>
            {`The outlined cell is the base case — ${baseAdoptionPct}% adoption at 100% value realization — the assumption used throughout this brief. The matrix tests it in both directions. A CFO reviewing this document should find the cell that matches their honest view of adoption and ask whether the case holds there. In most deployments it does, even at the conservative 50% / 75% intersection.`}
          </Text>
        </View>
      </View>
    </Page>
  );
}

// ─── Page 4: Pricing & ROI (conditional) ─────────────────────────────────────

function PricingROIPage({ data }: { data: ForecastScalePDFData }) {
  const {
    pricingScenarios,
    combinedTotal,
    combinedProviders,
    combinedEncounters,
    forecastYears,
    yearlyInputs,
    bestValueScenarioId,
    clientName,
  } = data;

  return (
    <Page size="LETTER" style={styles.page}>
      <PageFooter orgName={clientName || ""} />
      <View style={styles.pageWrapper}>
        <SectionLabel>Pricing & Return on Investment</SectionLabel>

        <Text style={styles.body}>
          Each scenario below shows what Abridge costs at projected scale and what it returns. Investment figures use the active tier at projected provider or encounter volume. Net and ROI are calculated against the full-scale value projection — the same number used throughout this brief.
        </Text>

        {pricingScenarios.map((scenario) => {
          const isBest = scenario.id === bestValueScenarioId;
          const scale =
            scenario.model === "perProvider"
              ? combinedProviders
              : scenario.model === "perEncounter" ||
                scenario.model === "platformFee"
              ? combinedEncounters
              : 0;
          const { value: investment, warning } = computeScenarioInvestment(
            scenario,
            scale
          );
          const net = combinedTotal - investment;
          const roi =
            investment > 0 ? combinedTotal / investment : 0;

          return (
            <View
              key={scenario.id}
              style={{
                backgroundColor: colors.white,
                borderRadius: 4,
                borderWidth: isBest ? 2 : 1,
                borderColor: isBest ? colors.primary : colors.separator,
                padding: 14,
                marginBottom: 12,
              }}
              wrap={false}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "bold",
                    color: colors.primaryText,
                    flex: 1,
                  }}
                >
                  {scenario.label}
                </Text>
                {isBest && (
                  <View
                    style={{
                      backgroundColor: colors.primary,
                      borderRadius: 3,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 7,
                        fontWeight: "bold",
                        color: colors.white,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    >
                      Best Value
                    </Text>
                  </View>
                )}
              </View>

              {/* Metric strip */}
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: colors.background,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: colors.separator,
                  marginBottom: 12,
                }}
              >
                {[
                  { label: "Annual Investment", value: fmtCurrency(investment) },
                  { label: "Full-Scale Value", value: fmtCurrency(combinedTotal) },
                  { label: "Net Annual", value: fmtCurrency(net), color: net > 0 ? "#059669" : colors.secondary },
                  { label: "ROI Multiple", value: `${roi.toFixed(1)}×`, color: roi > 1 ? colors.primary : colors.secondary },
                ].map(({ label, value, color: c }, i) => (
                  <View
                    key={label}
                    style={{
                      flex: 1,
                      padding: 10,
                      alignItems: "center",
                      borderRightWidth: i < 3 ? 1 : 0,
                      borderRightColor: colors.separator,
                    }}
                  >
                    <Text style={styles.label}>{label}</Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: c || colors.primaryText,
                      }}
                    >
                      {value}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Model + tiers */}
              <Text style={[styles.label, { marginBottom: 6 }]}>
                {PRICING_MODEL_LABELS[scenario.model]}
              </Text>
              <View
                style={{
                  borderRadius: 3,
                  borderWidth: 1,
                  borderColor: colors.separator,
                  overflow: "hidden",
                  marginBottom: warning ? 6 : 0,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: colors.cards,
                    paddingVertical: 5,
                    paddingHorizontal: 10,
                  }}
                >
                  <Text style={[styles.tableCellHLeft, { flex: 2 }]}>Volume</Text>
                  <Text style={styles.tableCellH}>Rate</Text>
                </View>
                {scenario.tiers.map((tier) => {
                  const isActive = (() => {
                    const s = scenario.model === "perProvider" ? scale : scale;
                    return s >= tier.thresholdFrom && (tier.thresholdTo === null || s < tier.thresholdTo);
                  })();
                  return (
                    <View
                      key={tier.id}
                      style={{
                        flexDirection: "row",
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        borderTopWidth: 1,
                        borderTopColor: colors.separator,
                        backgroundColor: isActive ? colors.cards : "transparent",
                      }}
                    >
                      <Text style={[styles.tableCell, { flex: 2, textAlign: "left", color: colors.primaryText }]}>
                        {tier.thresholdFrom.toLocaleString()} –{" "}
                        {tier.thresholdTo ? tier.thresholdTo.toLocaleString() : "∞"}
                        {isActive ? "  ✓" : ""}
                      </Text>
                      <Text style={[styles.tableCell, { fontWeight: "bold", color: colors.primaryText }]}>
                        ${tier.rate.toLocaleString()}
                        {scenario.model === "perProvider" ? "/provider/mo" : scenario.model === "perEncounter" ? "/enc" : ""}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {warning && (
                <Text style={{ fontSize: 8.5, color: colors.primary, marginTop: 6 }}>
                  ⚠ {warning}
                </Text>
              )}

              {/* Year-by-year table */}
              {forecastYears > 1 && yearlyInputs.length > 1 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.label, { marginBottom: 6 }]}>
                    Year-by-Year
                  </Text>
                  <View style={styles.tableHead}>
                    <Text style={styles.tableCellHLeft}>Year</Text>
                    <Text style={styles.tableCellH}>Value</Text>
                    <Text style={styles.tableCellH}>Investment</Text>
                    <Text style={styles.tableCellH}>Net</Text>
                    <Text style={styles.tableCellH}>ROI</Text>
                  </View>
                  {yearlyInputs.map((yr, i) => {
                    const yrScale =
                      scenario.model === "perProvider"
                        ? yr.providers
                        : yr.encounters;
                    const yrInv = computeScenarioInvestment(
                      scenario,
                      yrScale
                    ).value;
                    const yrNet = yr.totalValue - yrInv;
                    const yrROI = yrInv > 0 ? yr.totalValue / yrInv : 0;
                    return (
                      <View key={i} style={styles.tableRow}>
                        <Text style={styles.tableCellLeft}>Year {i + 1}</Text>
                        <Text style={styles.tableCell}>
                          {fmtCurrency(yr.totalValue)}
                        </Text>
                        <Text style={styles.tableCell}>
                          {fmtCurrency(yrInv)}
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            { color: yrNet > 0 ? "#059669" : colors.secondary },
                          ]}
                        >
                          {fmtCurrency(yrNet)}
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            { color: yrROI > 1 ? colors.primary : colors.secondary },
                          ]}
                        >
                          {yrROI.toFixed(1)}×
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </Page>
  );
}

// ─── Document ─────────────────────────────────────────────────────────────────

function ForecastScalePDFDocument({ data }: { data: ForecastScalePDFData }) {
  const hasPricing = data.pricingScenarios.length > 0 && data.combinedTotal > 0;
  return (
    <Document>
      <PDFCoverPage
        reportLabel="Scale Opportunity Brief"
        title="Scale Opportunity"
        subtitle="Projected value at full deployment"
        clientName={data.clientName}
        showPreparedBy
      />
      <ScaleSummaryPage data={data} />
      <SensitivityPage data={data} />
      {hasPricing && <PricingROIPage data={data} />}
    </Document>
  );
}

// ─── Generate ─────────────────────────────────────────────────────────────────

export async function generateForecastScalePDF(
  data: ForecastScalePDFData
): Promise<void> {
  const blob = await pdf(<ForecastScalePDFDocument data={data} />).toBlob();
  const slug = data.clientName
    ? `_${data.clientName.replace(/\s+/g, "_")}`
    : "";
  await savePdfBlob(
    blob,
    `Abridge_Scale_Opportunity${slug}.pdf`,
    "Abridge Scale Opportunity Brief"
  );
}
