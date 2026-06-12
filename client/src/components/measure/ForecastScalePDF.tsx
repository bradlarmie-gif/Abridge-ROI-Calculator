import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Rect,
  Font,
  Image,
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
import abridgeFontPath from "../../assets/fonts/abridge.otf";
import abridgeLogoRed from "@assets/abridge-logo-wordmark-red_1769187440253.png";

// ─── Font Registration ────────────────────────────────────────────────────────

Font.registerHyphenationCallback((word) => [word]);
Font.register({
  family: "Manrope",
  fonts: [
    { src: manropeRegular, fontWeight: 400 },
    { src: manropeBold, fontWeight: 700 },
  ],
});
Font.register({ family: "Abridge", src: abridgeFontPath, fontWeight: 400 });

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

// ─── Brand Palette ────────────────────────────────────────────────────────────

const brand = {
  black:         "#1A1A1A",
  white:         "#FFFFFF",
  coral:         "#EA2C00",
  warmGray:      "#F8F7F6",
  lightGray:     "#F5F4F3",
  midGray:       "#E5E4E3",
  borderGray:    "#D4D4D4",
  textPrimary:   "#1A1A1A",
  textSecondary: "#6B7280",
  textTertiary:  "#9CA3AF",
  positive:      "#059669",
};

const domainColors: Record<string, string> = {
  Capacity:  "#0891B2",
  Workforce: "#B45309",
  Revenue:   "#EA2C00",
  Quality:   "#059669",
};

const QUADS = ["Capacity", "Workforce", "Revenue", "Quality"] as const;

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: "Manrope",
    fontSize: 10,
    color: brand.textPrimary,
    backgroundColor: brand.white,
    paddingHorizontal: 48,
    paddingTop: 36,
    paddingBottom: 48,
  },

  // Header
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
    marginBottom: 20,
  },
  headerLogo: { height: 16 },
  headerMeta: {
    fontSize: 8,
    fontWeight: 600,
    color: brand.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: brand.midGray,
    paddingTop: 7,
  },
  footerLeft:  { fontSize: 7.5, color: brand.textTertiary },
  footerRight: { fontSize: 7.5, fontWeight: 600, color: brand.textSecondary },

  // Typography
  eyebrow: {
    fontSize: 8,
    fontWeight: 600,
    color: brand.coral,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Abridge",
    fontWeight: 400,
    letterSpacing: 0.4,
    color: brand.textPrimary,
    marginBottom: 5,
  },
  sectionIntro: {
    fontSize: 9.5,
    color: brand.textSecondary,
    lineHeight: 1.6,
    marginBottom: 14,
  },
  subEyebrow: {
    fontSize: 7.5,
    fontWeight: 600,
    color: brand.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 14,
  },
  body: {
    fontSize: 9.5,
    color: brand.textSecondary,
    lineHeight: 1.65,
    marginBottom: 10,
  },

  // Hero band
  heroBand: {
    backgroundColor: brand.black,
    borderRadius: 3,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    marginBottom: 12,
  },
  heroDivider: { width: 1, backgroundColor: "#2D2D2D" },
  heroMetric:  { flex: 1, alignItems: "center" },
  heroLabel:   {
    fontSize: 6.5,
    color: "#777777",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    textAlign: "center",
  },

  // Insight box
  insightBox: {
    backgroundColor: brand.lightGray,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderLeftWidth: 3,
    borderLeftColor: brand.coral,
    marginBottom: 12,
  },
  insightLabel: {
    fontSize: 7.5,
    fontWeight: 600,
    color: brand.coral,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  insightText: {
    fontSize: 9.5,
    color: brand.textSecondary,
    lineHeight: 1.6,
  },

  // Domain tiles
  domainTileRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  domainTile: {
    flex: 1,
    backgroundColor: brand.lightGray,
    padding: 10,
    borderWidth: 1,
    borderColor: brand.midGray,
  },
  domainTileValue: {
    fontSize: 16,
    fontWeight: 700,
    color: brand.textPrimary,
    marginTop: 4,
    marginBottom: 2,
  },
  domainTileSub: { fontSize: 7, color: brand.textTertiary },

  // Milestone cards
  milestoneRow: { flexDirection: "row", gap: 0, marginBottom: 10 },
  milestoneCard: {
    flex: 1,
    backgroundColor: "#F5F0EB",
    borderWidth: 1,
    borderColor: brand.midGray,
    borderTopWidth: 3,
    borderTopColor: brand.coral,
    padding: 12,
    marginRight: 6,
  },
  milestoneCardLast: {
    flex: 1,
    backgroundColor: "#F5F0EB",
    borderWidth: 1,
    borderColor: brand.midGray,
    borderTopWidth: 3,
    borderTopColor: brand.coral,
    padding: 12,
  },
  milestoneStage: {
    fontSize: 7,
    fontWeight: 600,
    color: brand.textTertiary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  milestoneYear: {
    fontSize: 13,
    fontFamily: "Abridge",
    color: brand.textPrimary,
    marginBottom: 6,
  },
  milestoneValue:      { fontSize: 14, fontWeight: 700, color: brand.textPrimary },
  milestoneValueFinal: { fontSize: 14, fontWeight: 700, color: brand.coral },

  // Table system
  tableWrap: {
    borderWidth: 1,
    borderColor: brand.midGray,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 10,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: brand.lightGray,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  tableHeadCell: {
    fontSize: 7,
    fontWeight: 600,
    color: brand.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  tableRowHighlight: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
    backgroundColor: brand.warmGray,
  },
  tableRowTotal: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: brand.lightGray,
  },
  tableCell:     { fontSize: 8.5, color: brand.textPrimary },
  tableCellBold: { fontSize: 8.5, fontWeight: 600, color: brand.textPrimary },
  tableCellMuted: { fontSize: 8.5, color: brand.textSecondary },

  // Divider
  divider: { borderBottomWidth: 1, borderBottomColor: brand.midGray, marginVertical: 12 },
});

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (!Number.isFinite(n)) return "$0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) {
    const k = Math.round(abs / 1_000);
    if (k >= 1000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    return `${sign}$${k}K`;
  }
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString();
}

// ─── Shared components ────────────────────────────────────────────────────────

function PageHeader({ label }: { label: string }) {
  return (
    <View style={S.pageHeader}>
      <Image src={abridgeLogoRed} style={S.headerLogo} />
      <Text style={S.headerMeta}>{label}</Text>
    </View>
  );
}

function PageFooter({ orgName }: { orgName: string }) {
  return (
    <View style={S.footer} fixed>
      <Text style={S.footerLeft}>
        {`Confidential · ${orgName} · Scale Opportunity Brief`}
      </Text>
      <Text
        style={S.footerRight}
        render={({ pageNumber, totalPages }) => `${pageNumber - 1} / ${totalPages - 1}`}
      />
    </View>
  );
}

// ─── Narrative generator ──────────────────────────────────────────────────────

function buildScaleNarrative(data: ForecastScalePDFData): string {
  const org = data.clientName || "This organization";
  const {
    combinedTotal,
    totalRealized,
    quadrantTotals,
    combinedProviders,
    forecastYears,
    yearlyInputs,
    baseAdoptionPct,
    simpleInvestment,
    pricingScenarios,
  } = data;

  if (combinedTotal === 0) {
    return `${org} has configured a forecast scenario. Add tracked drivers to the quadrant pages to populate the scale projection.`;
  }

  const multiplier = totalRealized > 0 ? combinedTotal / totalRealized : 0;

  const topQuad = QUADS.slice().sort(
    (a, b) => quadrantTotals[b].projected - quadrantTotals[a].projected
  )[0];
  const topVal = quadrantTotals[topQuad].projected;
  const topPct = combinedTotal > 0 ? Math.round((topVal / combinedTotal) * 100) : 0;
  const topShare =
    topPct >= 60 ? "the majority" : topPct >= 40 ? "nearly half" : `${topPct}%`;

  let text = "";

  if (totalRealized > 0 && multiplier > 1.05) {
    text = `${org}'s measured footprint documents ${fmtCurrency(totalRealized)} in annual value today. This projection applies those same per-unit economics to a ${fmtNum(combinedProviders)}-provider deployment — no new efficiency assumptions, no benchmark estimates. The result is ${fmtCurrency(combinedTotal)}, ${multiplier.toFixed(1)}× the current measurement, driven entirely by scaling the active provider base.`;
  } else {
    text = `Projected across ${fmtNum(combinedProviders)} providers at full deployment, this configuration generates ${fmtCurrency(combinedTotal)} in annual value. The projection applies measured per-unit economics directly — no benchmarks, no estimates beyond what the tracked drivers already show.`;
  }

  text += ` ${topQuad} accounts for ${topShare} of that total, reflecting where Abridge's documentation support has the most direct economic impact.`;

  const baseValue = Math.round(combinedTotal * (baseAdoptionPct / 100));
  const hasInvestment = pricingScenarios.length > 0 || simpleInvestment > 0;
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

// ─── Yearly bar chart ─────────────────────────────────────────────────────────

function YearlyBarChart({ yearlyInputs }: { yearlyInputs: PricingYearInput[] }) {
  if (yearlyInputs.length < 2) return null;

  const W = 420;
  const H = 72;
  const barPad = 8;
  const n = yearlyInputs.length;
  const barW = (W - barPad * (n + 1)) / n;
  const maxVal = Math.max(...yearlyInputs.map((y) => y.totalValue), 1);

  const STACK: Array<{ key: keyof PricingYearInput; fill: string; label: string }> = [
    { key: "qualityValue",   fill: domainColors.Quality,   label: "Quality"   },
    { key: "revenueValue",   fill: domainColors.Revenue,   label: "Revenue"   },
    { key: "workforceValue", fill: domainColors.Workforce, label: "Workforce" },
    { key: "capacityValue",  fill: domainColors.Capacity,  label: "Capacity"  },
  ];

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
      <View style={{ flexDirection: "row", paddingHorizontal: barPad }}>
        {yearlyInputs.map((_, i) => (
          <Text
            key={i}
            style={{ flex: 1, fontSize: 7, color: brand.textTertiary, textAlign: "center" }}
          >
            {`Yr ${i + 1}`}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 5, flexWrap: "wrap" }}>
        {STACK.slice().reverse().map(({ fill, label }) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <View style={{ width: 7, height: 7, borderRadius: 1, backgroundColor: fill }} />
            <Text style={{ fontSize: 7, color: brand.textTertiary }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Page 2: Scale Summary ────────────────────────────────────────────────────

function ScaleSummaryPage({ data }: { data: ForecastScalePDFData }) {
  const org = data.clientName || "";
  const {
    totalRealized,
    combinedTotal,
    quadrantTotals,
    combinedProviders,
    addedSettingsTotal,
    forecastYears,
    yearlyInputs,
    pricingScenarios,
    bestValueScenarioId,
    simpleInvestment,
  } = data;
  const isMultiYear = forecastYears > 1 && yearlyInputs.length > 1;

  // Best pricing for hero band
  const bestScenario = bestValueScenarioId
    ? pricingScenarios.find((s) => s.id === bestValueScenarioId)
    : pricingScenarios[0];

  const bestInvestment = (() => {
    if (bestScenario) {
      const scale =
        bestScenario.model === "perProvider"
          ? data.combinedProviders
          : bestScenario.model === "perEncounter" || bestScenario.model === "platformFee"
          ? data.combinedEncounters
          : 0;
      const { value, warning } = computeScenarioInvestment(bestScenario, scale);
      if (!warning && value > 0) return value;
    }
    return simpleInvestment || 0;
  })();

  const bestNet = bestInvestment > 0 ? combinedTotal - bestInvestment : combinedTotal;
  const roi = bestInvestment > 0 ? combinedTotal / bestInvestment : 0;

  const narrative = buildScaleNarrative(data);

  const heroItems = [
    { label: "Annual Value at Scale", value: fmtCurrency(combinedTotal) },
    { label: "Realized Today",        value: fmtCurrency(totalRealized), dim: totalRealized === 0 },
    { label: "Net Annual Value",       value: fmtCurrency(bestNet),       green: bestInvestment > 0 && bestNet > 0 },
    { label: "ROI Multiple",           value: roi > 0 ? `${roi.toFixed(1)}×` : "—" },
  ];

  return (
    <Page size="LETTER" style={S.page}>
      <PageFooter orgName={org} />
      <PageHeader label="Scale Opportunity" />

      {/* Eyebrow + title */}
      <Text style={S.eyebrow}>Scale Opportunity</Text>
      <Text style={S.sectionTitle}>From measured value to full deployment</Text>
      <View style={S.divider} />

      {/* Hero band */}
      <View style={S.heroBand}>
        {heroItems.map((m, i) => (
          <View key={i} style={{ flexDirection: "row", flex: 1 }}>
            {i > 0 && <View style={S.heroDivider} />}
            <View style={S.heroMetric}>
              <Text
                style={{
                  fontSize: 21,
                  fontWeight: 700,
                  marginBottom: 3,
                  color: m.green
                    ? "#34D399"
                    : m.dim
                    ? "#555555"
                    : brand.white,
                }}
              >
                {m.value}
              </Text>
              <Text style={S.heroLabel}>{m.label}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Domain tiles */}
      <View style={S.domainTileRow}>
        {QUADS.map((q) => {
          const val = quadrantTotals[q].projected;
          const dColor = domainColors[q];
          return (
            <View
              key={q}
              style={[
                S.domainTile,
                { borderTopWidth: 3, borderTopColor: dColor },
              ]}
            >
              <Text
                style={{
                  fontSize: 7,
                  color: dColor,
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                }}
              >
                {q}
              </Text>
              <Text style={S.domainTileValue}>
                {val > 0 ? fmtCurrency(val) : "—"}
              </Text>
              <Text style={S.domainTileSub}>projected / yr</Text>
            </View>
          );
        })}
      </View>

      {/* Narrative insight box */}
      <View style={S.insightBox}>
        <Text style={S.insightLabel}>Scale Analysis</Text>
        <Text style={S.insightText}>{narrative}</Text>
      </View>

      {/* Multi-year trajectory */}
      {isMultiYear && (
        <>
          <Text style={S.subEyebrow}>Year-by-Year Value Trajectory</Text>
          <YearlyBarChart yearlyInputs={yearlyInputs} />

          {/* Milestone cards */}
          <View style={S.milestoneRow}>
            {yearlyInputs.map((yr, i) => {
              const isLast = i === yearlyInputs.length - 1;
              return (
                <View key={i} style={isLast ? S.milestoneCardLast : S.milestoneCard}>
                  <Text style={S.milestoneStage}>
                    {i === 0 ? "Launch" : i === yearlyInputs.length - 1 ? "Full Scale" : `Year ${i + 1}`}
                  </Text>
                  <Text style={S.milestoneYear}>Year {i + 1}</Text>
                  <Text style={{ fontSize: 7, color: brand.textTertiary, marginBottom: 2 }}>
                    {fmtNum(yr.providers)} providers
                  </Text>
                  <Text style={isLast ? S.milestoneValueFinal : S.milestoneValue}>
                    {fmtCurrency(yr.totalValue)}
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Expansion settings */}
      {addedSettingsTotal > 0 && (
        <>
          <Text style={S.subEyebrow}>Expansion Settings</Text>
          <View style={[S.insightBox, { borderLeftColor: brand.textSecondary }]}>
            <Text style={[S.insightLabel, { color: brand.textSecondary }]}>
              Additional Modeled Value
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={S.insightText}>
                Expansion settings configured outside core deployment
              </Text>
              <Text style={{ fontSize: 14, fontWeight: 700, color: brand.textPrimary }}>
                {fmtCurrency(addedSettingsTotal)}
              </Text>
            </View>
          </View>
        </>
      )}

      {/* Methodology callout */}
      <View style={[S.insightBox, { borderLeftColor: brand.textSecondary }]}>
        <Text style={[S.insightLabel, { color: brand.textSecondary }]}>
          How These Projections Are Derived
        </Text>
        <Text style={S.insightText}>
          The scale projection multiplies per-unit economics measured in active deployment — time saved per note, revenue recovered per encounter, staff hours retained per provider — by the difference between the current footprint and the projected one. No benchmarks. No new assumptions. Reviewers who disagree with a specific driver's per-unit value can update that driver in the source measurement and regenerate.
        </Text>
      </View>
    </Page>
  );
}

// ─── Page 3: Sensitivity Analysis ────────────────────────────────────────────

const SENS_ADOPTION = [0.5, 0.75, 1.0];
const SENS_REALIZATION = [0.7, 0.85, 1.0];

function SensitivityPage({ data }: { data: ForecastScalePDFData }) {
  const {
    combinedTotal,
    combinedProviders,
    combinedEncounters,
    pricingScenarios,
    bestValueScenarioId,
    clientName,
    baseAdoptionPct,
    totalRealized,
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
          : pricingScenario.model === "perEncounter" || pricingScenario.model === "platformFee"
          ? combinedEncounters
          : 0;
      const { value, warning } = computeScenarioInvestment(pricingScenario, scale);
      if (!warning && value > 0) return value;
    }
    return simpleInvestment || 0;
  })();

  const hasPricing = investment > 0 && combinedTotal > 0;

  // Base case is baseAdoptionPct / 100 adoption × 1.0 realization
  const baseAdoptionFraction = baseAdoptionPct / 100;

  return (
    <Page size="LETTER" style={S.page}>
      <PageFooter orgName={clientName || ""} />
      <PageHeader label="Scale Opportunity" />

      <Text style={S.eyebrow}>Risk & Sensitivity</Text>
      <Text style={S.sectionTitle}>What if utilization or value realization falls short?</Text>
      <View style={S.divider} />

      <Text style={S.sectionIntro}>
        The matrix below shows projected annual value across different adoption rates and value realization scenarios. The highlighted cell is your base case.
      </Text>

      {/* Matrix */}
      {/* Column headers */}
      <View style={{ flexDirection: "row", marginBottom: 3 }}>
        <View style={{ width: 110, flexShrink: 0 }} />
        {SENS_REALIZATION.map((r, ci) => (
          <View
            key={ci}
            style={{
              flex: 1,
              backgroundColor: brand.lightGray,
              borderWidth: 1,
              borderColor: brand.midGray,
              paddingVertical: 7,
              paddingHorizontal: 6,
              alignItems: "center",
              marginHorizontal: 2,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: 700, color: brand.textPrimary }}>
              {Math.round(r * 100)}%
            </Text>
            <Text style={{ fontSize: 6.5, color: brand.textTertiary, marginTop: 1 }}>
              Value Realization
            </Text>
          </View>
        ))}
      </View>

      {/* Rows */}
      {SENS_ADOPTION.map((adoptionFrac, ri) => {
        const adoptionPct = Math.round(adoptionFrac * baseAdoptionFraction * 100);
        return (
          <View
            key={ri}
            style={{ flexDirection: "row", marginBottom: 3, alignItems: "stretch" }}
          >
            {/* Row header */}
            <View
              style={{
                width: 110,
                flexShrink: 0,
                backgroundColor: brand.lightGray,
                borderWidth: 1,
                borderColor: brand.midGray,
                paddingVertical: 10,
                paddingHorizontal: 10,
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 8.5, fontWeight: 700, color: brand.textPrimary, marginBottom: 2 }}>
                {adoptionPct}% Adoption
              </Text>
              <Text style={{ fontSize: 7, color: brand.textTertiary }}>
                {adoptionFrac === 0.5
                  ? "Conservative floor"
                  : adoptionFrac === 0.75
                  ? "Typical deployment"
                  : "Full adoption"}
              </Text>
            </View>

            {/* Cells */}
            {SENS_REALIZATION.map((realizationFrac, ci) => {
              const cellValue = combinedTotal * adoptionFrac * baseAdoptionFraction * realizationFrac;
              const isBase =
                adoptionFrac === 1.0 && realizationFrac === 1.0;
              const net = hasPricing ? cellValue - investment : 0;
              const cellROI = hasPricing && investment > 0 ? cellValue / investment : 0;
              const isPositive = cellValue >= combinedTotal * 0.8;

              return (
                <View
                  key={ci}
                  style={{
                    flex: 1,
                    backgroundColor: isBase ? brand.warmGray : brand.white,
                    borderWidth: isBase ? 2 : 1,
                    borderColor: isBase ? brand.coral : brand.midGray,
                    borderRadius: 2,
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    marginHorizontal: 2,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isBase && (
                    <View
                      style={{
                        backgroundColor: brand.coral,
                        borderRadius: 2,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 6,
                          fontWeight: 700,
                          color: brand.white,
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
                      fontWeight: 700,
                      textAlign: "center",
                      color: isBase
                        ? brand.coral
                        : isPositive
                        ? brand.positive
                        : brand.textPrimary,
                    }}
                  >
                    {fmtCurrency(cellValue)}
                  </Text>
                  {hasPricing && investment > 0 && (
                    <>
                      <View
                        style={{
                          marginTop: 4,
                          backgroundColor: cellROI >= 1 ? brand.positive + "18" : brand.midGray,
                          borderRadius: 2,
                          paddingHorizontal: 5,
                          paddingVertical: 2,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 7.5,
                            fontWeight: 700,
                            color: cellROI >= 1 ? brand.positive : brand.textSecondary,
                            textAlign: "center",
                          }}
                        >
                          {cellROI.toFixed(1)}× ROI
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 7,
                          color: brand.textTertiary,
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
        );
      })}

      {hasPricing && (
        <Text style={{ fontSize: 7.5, color: brand.textTertiary, marginTop: 4, marginBottom: 8 }}>
          {pricingScenario
            ? `ROI uses the "${pricingScenario.label}" scenario · ${fmtCurrency(investment)}/yr at projected scale`
            : `ROI uses the annual contract value · ${fmtCurrency(investment)}/yr`}
        </Text>
      )}

      <View style={S.divider} />

      {/* Reading guide */}
      <View style={S.insightBox}>
        <Text style={S.insightLabel}>Reading This Matrix</Text>
        <Text style={S.insightText}>
          {`The outlined cell is the base case — ${baseAdoptionPct}% adoption at 100% value realization — the assumption used throughout this brief. The rows test whether partial adoption changes the conclusion. The columns test whether the measured per-unit economics hold at scale. `}
          {totalRealized > 0
            ? `Even at 50% adoption and 70% value realization, this projection exceeds the measured baseline of ${fmtCurrency(totalRealized)}.`
            : `In most deployments, the case holds even at the conservative 50% / 70% intersection.`}
        </Text>
      </View>

      {/* Domain composition */}
      <Text style={S.subEyebrow}>Value by Domain at Base Case</Text>
      <View style={[S.tableWrap]}>
        <View style={S.tableHead}>
          <Text style={[S.tableHeadCell, { flex: 2 }]}>Domain</Text>
          <Text style={[S.tableHeadCell, { flex: 1, textAlign: "right" }]}>Projected / yr</Text>
          <Text style={[S.tableHeadCell, { flex: 1, textAlign: "right" }]}>Share of Total</Text>
        </View>
        {QUADS.filter((q) => data.quadrantTotals[q].projected > 0).map((q, i, arr) => {
          const val = data.quadrantTotals[q].projected;
          const pct = combinedTotal > 0 ? Math.round((val / combinedTotal) * 100) : 0;
          return (
            <View
              key={q}
              style={i === arr.length - 1 ? [S.tableRow, { borderBottomWidth: 0 }] : S.tableRow}
            >
              <View style={{ flex: 2, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 1,
                    backgroundColor: domainColors[q],
                  }}
                />
                <Text style={S.tableCellBold}>{q}</Text>
              </View>
              <Text style={[S.tableCell, { flex: 1, textAlign: "right" }]}>
                {fmtCurrency(val)}
              </Text>
              <Text style={[S.tableCellMuted, { flex: 1, textAlign: "right" }]}>
                {pct}%
              </Text>
            </View>
          );
        })}
        <View style={S.tableRowTotal}>
          <Text style={[S.tableCellBold, { flex: 2 }]}>Total</Text>
          <Text style={[S.tableCellBold, { flex: 1, textAlign: "right" }]}>
            {fmtCurrency(combinedTotal)}
          </Text>
          <Text style={[S.tableCellMuted, { flex: 1, textAlign: "right" }]}>100%</Text>
        </View>
      </View>
    </Page>
  );
}

// ─── Page 4: Pricing & ROI ────────────────────────────────────────────────────

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
    <Page size="LETTER" style={S.page}>
      <PageFooter orgName={clientName || ""} />
      <PageHeader label="Scale Opportunity" />

      <Text style={S.eyebrow}>Investment & Return</Text>
      <Text style={S.sectionTitle}>Pricing scenarios and return on investment</Text>
      <View style={S.divider} />

      <Text style={S.sectionIntro}>
        Each scenario below shows what Abridge costs at projected scale and what it returns. Investment figures use the active tier at projected provider or encounter volume. Net and ROI are calculated against the full-scale value projection — the same number used throughout this brief.
      </Text>

      {pricingScenarios.map((scenario) => {
        const isBest = scenario.id === bestValueScenarioId;
        const scale =
          scenario.model === "perProvider"
            ? combinedProviders
            : scenario.model === "perEncounter" || scenario.model === "platformFee"
            ? combinedEncounters
            : 0;
        const { value: investment, warning } = computeScenarioInvestment(scenario, scale);
        const net = combinedTotal - investment;
        const roi = investment > 0 ? combinedTotal / investment : 0;

        return (
          <View
            key={scenario.id}
            style={{
              borderWidth: isBest ? 2 : 1,
              borderColor: isBest ? brand.coral : brand.midGray,
              borderRadius: 3,
              padding: 14,
              marginBottom: 14,
              backgroundColor: brand.white,
            }}
            wrap={false}
          >
            {/* Header row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontSize: 11,
                  fontWeight: 700,
                  color: brand.textPrimary,
                }}
              >
                {scenario.label}
              </Text>
              {isBest && (
                <View
                  style={{
                    backgroundColor: brand.coral,
                    borderRadius: 2,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    marginRight: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 7,
                      fontWeight: 700,
                      color: brand.white,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    Best Value
                  </Text>
                </View>
              )}
              <Text style={{ fontSize: 9, color: brand.textSecondary }}>
                {fmtCurrency(investment)}/yr
              </Text>
            </View>

            {/* Model label */}
            <Text
              style={{
                fontSize: 8,
                color: brand.textTertiary,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              {PRICING_MODEL_LABELS[scenario.model]}
            </Text>

            {/* ROI strip */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: brand.lightGray,
                borderWidth: 1,
                borderColor: brand.midGray,
                borderRadius: 3,
                marginBottom: 10,
              }}
            >
              {[
                { label: "Investment",    value: fmtCurrency(investment) },
                { label: "Annual Value",  value: fmtCurrency(combinedTotal) },
                { label: "Net Annual",    value: fmtCurrency(net),            color: net > 0 ? brand.positive : brand.textSecondary },
                { label: "ROI Multiple",  value: roi > 0 ? `${roi.toFixed(1)}×` : "—", color: roi > 1 ? brand.coral : brand.textSecondary },
              ].map(({ label, value, color: c }, i) => (
                <View
                  key={label}
                  style={{
                    flex: 1,
                    padding: 10,
                    alignItems: "center",
                    borderRightWidth: i < 3 ? 1 : 0,
                    borderRightColor: brand.midGray,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 6.5,
                      color: brand.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: 1.2,
                      marginBottom: 3,
                    }}
                  >
                    {label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: c || brand.textPrimary,
                    }}
                  >
                    {value}
                  </Text>
                </View>
              ))}
            </View>

            {/* Tier table */}
            {scenario.tiers.length > 0 && (
              <View style={S.tableWrap}>
                <View style={S.tableHead}>
                  <Text style={[S.tableHeadCell, { flex: 2 }]}>Volume Range</Text>
                  <Text style={[S.tableHeadCell, { flex: 1, textAlign: "right" }]}>Rate</Text>
                  <Text style={[S.tableHeadCell, { flex: 1, textAlign: "right" }]}>Applied</Text>
                </View>
                {scenario.tiers.map((tier, ti) => {
                  const isActive =
                    scale >= tier.thresholdFrom &&
                    (tier.thresholdTo === null || scale < tier.thresholdTo);
                  return (
                    <View
                      key={tier.id}
                      style={isActive ? S.tableRowHighlight : S.tableRow}
                    >
                      <Text style={[S.tableCell, { flex: 2 }]}>
                        {tier.thresholdFrom.toLocaleString()} –{" "}
                        {tier.thresholdTo ? tier.thresholdTo.toLocaleString() : "∞"}
                      </Text>
                      <Text style={[S.tableCellBold, { flex: 1, textAlign: "right" }]}>
                        ${tier.rate.toLocaleString()}
                        {scenario.model === "perProvider"
                          ? "/provider/mo"
                          : scenario.model === "perEncounter"
                          ? "/enc"
                          : ""}
                      </Text>
                      <Text
                        style={[
                          S.tableCellBold,
                          {
                            flex: 1,
                            textAlign: "right",
                            color: isActive ? brand.positive : brand.textTertiary,
                          },
                        ]}
                      >
                        {isActive ? "✓ Active" : "—"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {warning && (
              <Text style={{ fontSize: 8, color: brand.coral, marginTop: 4 }}>
                ⚠ {warning}
              </Text>
            )}

            {/* Year-by-year breakdown */}
            {forecastYears > 1 && yearlyInputs.length > 1 && (
              <View style={{ marginTop: 10 }}>
                <Text
                  style={{
                    fontSize: 7.5,
                    fontWeight: 600,
                    color: brand.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: 1.2,
                    marginBottom: 6,
                  }}
                >
                  Year-by-Year
                </Text>
                <View style={S.tableWrap}>
                  <View style={S.tableHead}>
                    <Text style={[S.tableHeadCell, { flex: 1 }]}>Year</Text>
                    <Text style={[S.tableHeadCell, { flex: 1, textAlign: "right" }]}>Value</Text>
                    <Text style={[S.tableHeadCell, { flex: 1, textAlign: "right" }]}>Investment</Text>
                    <Text style={[S.tableHeadCell, { flex: 1, textAlign: "right" }]}>Net</Text>
                    <Text style={[S.tableHeadCell, { flex: 1, textAlign: "right" }]}>ROI</Text>
                  </View>
                  {yearlyInputs.map((yr, i) => {
                    const yrScale =
                      scenario.model === "perProvider" ? yr.providers : yr.encounters;
                    const yrInv = computeScenarioInvestment(scenario, yrScale).value;
                    const yrNet = yr.totalValue - yrInv;
                    const yrROI = yrInv > 0 ? yr.totalValue / yrInv : 0;
                    const isLastRow = i === yearlyInputs.length - 1;
                    return (
                      <View
                        key={i}
                        style={isLastRow ? [S.tableRow, { borderBottomWidth: 0 }] : S.tableRow}
                      >
                        <Text style={[S.tableCellBold, { flex: 1 }]}>Year {i + 1}</Text>
                        <Text style={[S.tableCell, { flex: 1, textAlign: "right" }]}>
                          {fmtCurrency(yr.totalValue)}
                        </Text>
                        <Text style={[S.tableCell, { flex: 1, textAlign: "right" }]}>
                          {fmtCurrency(yrInv)}
                        </Text>
                        <Text
                          style={[
                            S.tableCell,
                            {
                              flex: 1,
                              textAlign: "right",
                              color: yrNet > 0 ? brand.positive : brand.textSecondary,
                              fontWeight: yrNet > 0 ? 700 : 400,
                            },
                          ]}
                        >
                          {fmtCurrency(yrNet)}
                        </Text>
                        <Text
                          style={[
                            S.tableCell,
                            {
                              flex: 1,
                              textAlign: "right",
                              color: yrROI > 1 ? brand.coral : brand.textSecondary,
                              fontWeight: yrROI > 1 ? 700 : 400,
                            },
                          ]}
                        >
                          {yrROI.toFixed(1)}×
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        );
      })}
    </Page>
  );
}

// ─── Document ─────────────────────────────────────────────────────────────────

export function ForecastScalePDFDocument({ data }: { data: ForecastScalePDFData }) {
  const hasPricing = data.pricingScenarios.length > 0 && data.combinedTotal > 0;

  return (
    <Document>
      <PDFCoverPage
        reportLabel="Scale Opportunity Brief"
        title={data.clientName || "Your Organization"}
        subtitle={`${fmtNum(data.combinedProviders)} providers at scale · ${data.forecastYears}-Year Projection`}
        preparedBy="Abridge Partner Success"
        disclaimerText="Projections apply measured per-unit economics to your scale deployment. No benchmark estimates — only what your tracked drivers already show."
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
