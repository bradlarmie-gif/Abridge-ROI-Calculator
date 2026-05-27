import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Polyline,
  Line,
  Circle,
  Font,
  pdf,
} from "@react-pdf/renderer";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import { savePdfBlob } from "@/lib/pdf-save";
import type {
  MeasurePDFData,
  MeasurePDFDriver,
  MeasurePDFQuadrantSection,
} from "./MeasurePDFExport";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";

Font.register({
  family: "Manrope",
  fonts: [
    { src: manropeRegular, fontWeight: 400 },
    { src: manropeBold, fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((w) => [w]);

// ─── Color system (matches Explore PDF) ───────────────────────────────────────

const colors = {
  primary: "#EA2C00",
  primaryText: "#1A1A1A",
  secondary: "#666666",
  tertiary: "#999999",
  cards: "#F5F0EB",
  separator: "#E5DCD0",
  separatorHeavy: "#D4C9BC",
  background: "#FDFAF7",
};

const domainColors: Record<string, string> = {
  Capacity:  "#2563EB",
  Workforce: "#7C3AED",
  Revenue:   "#EA2C00",
  Quality:   "#059669",
};

const domainSubtitles: Record<string, string> = {
  Capacity:  "Time returned to providers, measured and attributed",
  Workforce: "Staff experience and retention, in the numbers",
  Revenue:   "Documentation accuracy reflected in the bill",
  Quality:   "Clinical signals tracked as leading indicators",
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    paddingTop: 54,
    paddingLeft: 54,
    paddingRight: 54,
    paddingBottom: 0,
    fontFamily: "Manrope",
    fontSize: 10.5,
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
  },
  sectionHeadline: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.primaryText,
    marginBottom: 8,
    lineHeight: 1.2,
  },
  body: {
    fontSize: 10,
    color: colors.secondary,
    lineHeight: 1.6,
    marginBottom: 10,
  },
  cardBg: {
    backgroundColor: colors.cards,
    borderRadius: 4,
    padding: 14,
  },
  subSectionHeader: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 12,
  },
});

// ─── Shared components ────────────────────────────────────────────────────────

const SectionLabel = ({ children }: { children: string }) => (
  <Text style={[styles.sectionLabel, { marginBottom: 12 }]}>{children}</Text>
);

const PageFooter = ({ orgName, settingLabel }: { orgName: string; settingLabel: string }) => (
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
    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{`${orgName} · ${settingLabel}`}</Text>
    <Text style={{ fontSize: 8.5, color: colors.tertiary }}>Confidential · Abridge Evidence Summary</Text>
  </View>
);

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (!Number.isFinite(n)) return "$0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString();
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({
  data,
  color,
}: {
  data: Array<{ month: string; withAbridge: number; withoutAbridge: number }>;
  color: string;
}) {
  if (data.length < 2) return null;
  const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
  const w = 280, h = 44, pad = 4;
  const allVals = sorted.flatMap((d) => [d.withAbridge, d.withoutAbridge]);
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;
  const xStep = (w - pad * 2) / (sorted.length - 1);
  const toY = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2);
  const ptsWith = sorted.map((d, i) => `${pad + i * xStep},${toY(d.withAbridge)}`).join(" ");
  const ptsWithout = sorted.map((d, i) => `${pad + i * xStep},${toY(d.withoutAbridge)}`).join(" ");
  return (
    <View style={{ marginTop: 6, marginBottom: 2 }}>
      <Svg width={w} height={h}>
        <Line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={colors.separator} strokeWidth={0.5} />
        <Polyline points={ptsWithout} stroke={colors.tertiary} strokeWidth={1} fill="none" strokeDasharray="2,2" />
        <Polyline points={ptsWith} stroke={color} strokeWidth={1.5} fill="none" />
        {sorted.map((d, i) => (
          <Circle key={i} cx={pad + i * xStep} cy={toY(d.withAbridge)} r={1.5} fill={color} />
        ))}
      </Svg>
      <Text style={{ fontSize: 7, color: colors.tertiary, marginTop: 2 }}>
        {"Solid — With Abridge   Dashed — Baseline"}
      </Text>
    </View>
  );
}

// ─── Driver card ──────────────────────────────────────────────────────────────

function DriverCard({
  driver,
  accentColor,
}: {
  driver: MeasurePDFDriver;
  accentColor: string;
}) {
  const isQuant = driver.visibility === "quantified";
  const hasMonthly = driver.isMonthlyMode && (driver.monthlyData?.length ?? 0) >= 2;
  const unit = driver.deltaUnit || "";
  const deltaSign = driver.delta >= 0 ? "+" : "";

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.separator,
        padding: 10,
        marginBottom: 8,
      }}
      wrap={false}
    >
      {/* Header row */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.3 }}>
            {driver.label}
          </Text>
          <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.4, marginTop: 2 }}>
            {driver.shortDescription}
          </Text>
        </View>
        {isQuant && (
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 13, fontWeight: "bold", color: accentColor }}>
              {fmtCurrency(driver.realizedValue)}
            </Text>
            <Text style={{ fontSize: 7.5, color: colors.tertiary }}>realized / yr</Text>
          </View>
        )}
      </View>

      {isQuant ? (
        <>
          {/* Before / With Abridge / Change */}
          <View style={{ flexDirection: "row", backgroundColor: colors.cards, borderRadius: 3, marginTop: 6, marginBottom: 6 }}>
            {[
              { label: "Before", value: driver.withoutAbridge, color: colors.secondary },
              { label: "With Abridge", value: driver.withAbridge, color: colors.primaryText },
              { label: "Change", value: driver.delta, color: accentColor, prefix: deltaSign },
            ].map(({ label, value, color: cellColor, prefix = "" }, i) => (
              <View
                key={label}
                style={{
                  flex: 1,
                  padding: 8,
                  alignItems: "center",
                  borderRightWidth: i < 2 ? 1 : 0,
                  borderRightColor: colors.separator,
                }}
              >
                <Text style={{ fontSize: 6.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>
                  {label}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: cellColor, lineHeight: 1.1 }}>
                  {`${prefix}${fmtNum(value)}`}
                </Text>
                {unit ? (
                  <Text style={{ fontSize: 7, color: colors.tertiary, marginTop: 1 }}>{unit}</Text>
                ) : null}
              </View>
            ))}
          </View>

          {/* Attribution + realization */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: hasMonthly ? 0 : 2 }}>
            <View style={{ backgroundColor: accentColor + "15", borderRadius: 2, paddingHorizontal: 7, paddingVertical: 3 }}>
              <Text style={{ fontSize: 7.5, color: accentColor, fontWeight: "bold" }}>
                {`${driver.attributionPercent}% attributed to Abridge`}
              </Text>
            </View>
            {driver.realizationPercent < 100 && (
              <View style={{ backgroundColor: colors.cards, borderRadius: 2, paddingHorizontal: 7, paddingVertical: 3 }}>
                <Text style={{ fontSize: 7.5, color: colors.secondary }}>
                  {`${driver.realizationPercent}% realization`}
                </Text>
              </View>
            )}
          </View>

          {hasMonthly && driver.monthlyData && (
            <Sparkline data={driver.monthlyData} color={accentColor} />
          )}

          {driver.notes && (
            <Text style={{ fontSize: 8, color: colors.secondary, fontStyle: "italic", marginTop: 4 }}>
              {driver.notes}
            </Text>
          )}
        </>
      ) : (
        <>
          {driver.notes && (
            <Text style={{ fontSize: 8.5, color: colors.secondary, marginBottom: 4, lineHeight: 1.5 }}>
              {driver.notes}
            </Text>
          )}
          <Text style={{ fontSize: 8, color: colors.tertiary, fontStyle: "italic" }}>
            Tracked qualitatively — excluded from financial totals. Validated post-deployment.
          </Text>
        </>
      )}
    </View>
  );
}

// ─── Narrative generator ──────────────────────────────────────────────────────

function buildNarrative(data: MeasurePDFData): string {
  const orgName = data.organizationName || "Your organization";
  const allQuantDrivers = data.quadrants.flatMap((q) =>
    q.drivers.filter((d) => d.visibility === "quantified")
  );
  const allQualDrivers = data.quadrants.flatMap((q) =>
    q.drivers.filter((d) => d.visibility === "qualitative")
  );
  const activeDomains = data.quadrants
    .filter((q) => q.realizedTotal > 0)
    .sort((a, b) => b.realizedTotal - a.realizedTotal);

  if (allQuantDrivers.length === 0 && allQualDrivers.length === 0) {
    return `${orgName} has begun deploying Abridge. No drivers have been configured for measurement yet — this document will populate with realized value as data is entered.`;
  }

  if (activeDomains.length === 0) {
    const qualCount = allQualDrivers.length;
    return `${orgName} is tracking ${qualCount} qualitative signal${qualCount !== 1 ? "s" : ""} with Abridge deployed. Financial attribution data is in progress — quantified figures will appear as measurements are recorded.`;
  }

  const topDomain = activeDomains[0];
  const topDriver = topDomain.drivers
    .filter((d) => d.visibility === "quantified")
    .sort((a, b) => b.realizedValue - a.realizedValue)[0];

  let text = `${fmtCurrency(data.totalRealized)} in measured value has been realized across ${allQuantDrivers.length} quantified driver${allQuantDrivers.length !== 1 ? "s" : ""}.`;

  if (topDriver && data.totalRealized > 0) {
    const pct = Math.round((topDriver.realizedValue / data.totalRealized) * 100);
    const share = pct >= 60 ? "the majority" : pct >= 40 ? "nearly half" : `${pct}%`;
    text += ` ${topDomain.quadrant} contributed ${share} of that total — driven primarily by ${topDriver.label} at ${topDriver.attributionPercent}% attribution.`;
  }

  if (activeDomains.length > 1) {
    const others = activeDomains.slice(1, 3).map((d) => d.quadrant);
    text += ` ${others.join(" and ")} contributed the remainder.`;
  }

  if (allQualDrivers.length > 0) {
    text += ` ${allQualDrivers.length} qualitative signal${allQualDrivers.length !== 1 ? "s are" : " is"} tracked in parallel as leading indicators — not included in financial totals.`;
  }

  return text;
}

// ─── Executive Summary page ───────────────────────────────────────────────────

function ExecutiveSummaryPage({ data }: { data: MeasurePDFData }) {
  const orgName = data.organizationName || "Your Organization";
  const narrative = buildNarrative(data);
  const hasNetValue = data.bestPricingNet !== undefined && data.bestPricingInvestment !== undefined;
  const roi = hasNetValue && data.bestPricingInvestment! > 0
    ? (data.totalRealized / data.bestPricingInvestment!).toFixed(1)
    : null;

  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.pageWrapper}>
        <SectionLabel>REALIZED VALUE SUMMARY</SectionLabel>

        {/* Hero */}
        <View style={[styles.cardBg, { marginBottom: 12, paddingVertical: 20 }]}>
          <Text style={{ fontSize: 8.5, color: colors.secondary, textTransform: "uppercase", letterSpacing: 2.5, fontWeight: "bold", marginBottom: 6 }}>
            {`Realized Annual Value · ${data.careSettingLabel}`}
          </Text>
          <Text style={{ fontSize: 38, fontWeight: "bold", color: colors.primary, lineHeight: 1.0, marginBottom: 8 }}>
            {fmtCurrency(data.totalRealized)}
          </Text>
          <Text style={{ fontSize: 9, color: colors.secondary, marginBottom: 10 }}>
            {`Across ${data.driversTrackedCount} financial driver${data.driversTrackedCount !== 1 ? "s" : ""}, attribution-adjusted`}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[
              orgName,
              `${fmtNum(data.numberOfProviders)} providers`,
              (data.monthsLive ?? 0) > 0 ? `${data.monthsLive} months live` : null,
              `${data.utilizationPercent}% adoption`,
            ]
              .filter(Boolean)
              .map((chip, i) => (
                <View key={i} style={{ backgroundColor: colors.separator, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 8, color: colors.primaryText, fontWeight: "bold" }}>{chip as string}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* Net value / investment / ROI strip (only when pricing is configured) */}
        {hasNetValue && (
          <View style={{ flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 4, borderWidth: 1, borderColor: colors.separator, marginBottom: 12 }}>
            {[
              {
                label: "Annual Investment",
                value: fmtCurrency(data.bestPricingInvestment!),
                color: colors.primaryText,
              },
              {
                label: "Net Annual Value",
                value: fmtCurrency(data.bestPricingNet!),
                color: data.bestPricingNet! >= 0 ? "#059669" : colors.primary,
              },
              ...(roi ? [{ label: "Return on Investment", value: `${roi}×`, color: colors.primaryText }] : []),
            ].map(({ label, value, color: valColor }, i, arr) => (
              <View
                key={label}
                style={{
                  flex: 1,
                  padding: 12,
                  alignItems: "center",
                  borderRightWidth: i < arr.length - 1 ? 1 : 0,
                  borderRightColor: colors.separator,
                }}
              >
                <Text style={{ fontSize: 6.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>
                  {label}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: valColor }}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Domain breakdown */}
        <Text style={styles.subSectionHeader}>Value by Domain</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          {(["Capacity", "Workforce", "Revenue", "Quality"] as const).map((qName) => {
            const q = data.quadrants.find((x) => x.quadrant === qName);
            const total = q?.realizedTotal ?? 0;
            const dColor = domainColors[qName] ?? colors.secondary;
            const hasValue = total > 0;
            const quantCount = q?.drivers.filter((d) => d.visibility === "quantified").length ?? 0;
            return (
              <View
                key={qName}
                style={{
                  flex: 1,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: hasValue ? dColor + "40" : colors.separator,
                  padding: 10,
                  alignItems: "center",
                }}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dColor, marginBottom: 5 }} />
                <Text style={{ fontSize: 7.5, fontWeight: "bold", color: hasValue ? dColor : colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>
                  {qName}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: "bold", color: hasValue ? colors.primaryText : colors.tertiary }}>
                  {hasValue ? fmtCurrency(total) : "—"}
                </Text>
                {quantCount > 0 && (
                  <Text style={{ fontSize: 7, color: colors.tertiary, marginTop: 2 }}>
                    {`${quantCount} driver${quantCount !== 1 ? "s" : ""}`}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Narrative */}
        <Text style={{ fontSize: 9.5, color: colors.secondary, lineHeight: 1.65, marginBottom: 14 }}>
          {narrative}
        </Text>

        {/* Deployment context bar */}
        <View style={{ flexDirection: "row", backgroundColor: colors.primaryText, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 10 }}>
          {[
            { label: "Care Setting", value: data.careSettingLabel },
            { label: "Providers", value: fmtNum(data.numberOfProviders) },
            { label: "Adoption", value: `${data.utilizationPercent}%` },
            (data.monthsLive ?? 0) > 0 ? { label: "Months Live", value: `${data.monthsLive}` } : null,
            data.annualEncounters > 0 ? { label: "Annual Encounters", value: fmtNum(data.annualEncounters) } : null,
          ]
            .filter(Boolean)
            .map((item, i, arr) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  borderRightWidth: i < arr.length - 1 ? 1 : 0,
                  borderRightColor: "#333333",
                  paddingRight: 10,
                  paddingLeft: i > 0 ? 10 : 0,
                }}
              >
                <Text style={{ fontSize: 6.5, color: "#777777", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>
                  {(item as any).label}
                </Text>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: "#FFFFFF" }}>
                  {(item as any).value}
                </Text>
              </View>
            ))}
        </View>

        <PageFooter orgName={orgName} settingLabel={data.careSettingLabel} />
      </View>
    </Page>
  );
}

// ─── Domain page ──────────────────────────────────────────────────────────────

function DomainPage({
  section,
  data,
}: {
  section: MeasurePDFQuadrantSection;
  data: MeasurePDFData;
}) {
  const orgName = data.organizationName || "Your Organization";
  const accentColor = domainColors[section.quadrant] ?? colors.primary;
  const subtitle = domainSubtitles[section.quadrant] ?? "";
  const quantified = section.drivers.filter((d) => d.visibility === "quantified");
  const qualitative = section.drivers.filter((d) => d.visibility === "qualitative");

  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.pageWrapper}>
        {/* Domain header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: accentColor, marginRight: 8 }} />
              <Text style={{ fontSize: 14, fontWeight: "bold", color: accentColor, textTransform: "uppercase", letterSpacing: 1.5 }}>
                {section.quadrant}
              </Text>
              <Text style={{ fontSize: 9, color: colors.tertiary, marginLeft: 8 }}>
                {`${quantified.length} financial driver${quantified.length !== 1 ? "s" : ""}`}
              </Text>
            </View>
            <Text style={{ fontSize: 10, color: colors.secondary, fontStyle: "italic" }}>{subtitle}</Text>
          </View>
          {section.realizedTotal > 0 && (
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>
                Realized Annual Value
              </Text>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: accentColor }}>
                {fmtCurrency(section.realizedTotal)}
              </Text>
            </View>
          )}
        </View>

        <View style={{ borderBottomWidth: 1.5, borderBottomColor: accentColor + "40", marginBottom: 14 }} />

        {quantified.length > 0 && (
          <>
            <Text style={styles.subSectionHeader}>Financial Impact</Text>
            {quantified.map((driver) => (
              <DriverCard key={driver.id} driver={driver} accentColor={accentColor} />
            ))}
          </>
        )}

        {qualitative.length > 0 && (
          <>
            <Text style={[styles.subSectionHeader, { marginTop: quantified.length > 0 ? 6 : 0 }]}>
              Signal Evidence
            </Text>
            <View style={{ backgroundColor: colors.cards, borderRadius: 4, padding: 12 }}>
              <Text style={{ fontSize: 8.5, color: colors.secondary, marginBottom: 8 }}>
                The following drivers are tracked qualitatively. Excluded from financial totals and validated post-deployment as leading indicators.
              </Text>
              {qualitative.map((driver, i) => (
                <View
                  key={driver.id}
                  style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: i < qualitative.length - 1 ? 8 : 0 }}
                >
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: accentColor, marginTop: 5, marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>
                      {driver.label}
                    </Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.4 }}>
                      {driver.shortDescription}
                    </Text>
                    {driver.notes && (
                      <Text style={{ fontSize: 8, color: colors.secondary, fontStyle: "italic", marginTop: 3 }}>
                        {driver.notes}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <PageFooter orgName={orgName} settingLabel={data.careSettingLabel} />
      </View>
    </Page>
  );
}

// ─── Pricing / Investment page ────────────────────────────────────────────────

function PricingPage({ data }: { data: MeasurePDFData }) {
  const orgName = data.organizationName || "Your Organization";
  const hasBest = data.bestPricingScenarioLabel !== undefined;

  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.pageWrapper}>
        <SectionLabel>INVESTMENT ANALYSIS</SectionLabel>
        <Text style={styles.sectionHeadline}>Value vs. Investment.</Text>
        <Text style={styles.body}>
          Each scenario below compares annual investment against realized value at the current deployment scale. Unit economics are fixed — the only variable is pricing model and tier.
        </Text>

        {data.pricingScenarios.map((sc) => {
          const isBest = sc.isBestValue;
          return (
            <View
              key={sc.label}
              style={{
                borderRadius: 4,
                borderWidth: isBest ? 1.5 : 1,
                borderColor: isBest ? colors.primary : colors.separator,
                marginBottom: 10,
              }}
              wrap={false}
            >
              {/* Scenario header */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  backgroundColor: isBest ? colors.primary + "08" : colors.cards,
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                }}
              >
                <View>
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: isBest ? colors.primary : colors.primaryText }}>
                    {sc.label}
                  </Text>
                  <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>{sc.modelLabel}</Text>
                </View>
                {isBest && (
                  <View style={{ backgroundColor: colors.primary, borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 7.5, color: "#FFFFFF", fontWeight: "bold", letterSpacing: 0.5 }}>
                      RECOMMENDED
                    </Text>
                  </View>
                )}
              </View>

              {/* KPI row */}
              <View style={{ flexDirection: "row", backgroundColor: "#FFFFFF" }}>
                {[
                  { label: "Annual Investment", value: fmtCurrency(sc.investment), color: colors.primaryText },
                  {
                    label: "Net Annual Value",
                    value: fmtCurrency(sc.netAnnual),
                    color: sc.netAnnual >= 0 ? "#059669" : colors.primary,
                  },
                  { label: "ROI", value: `${sc.roi.toFixed(1)}×`, color: colors.primaryText },
                  { label: `Scale (${sc.scaleLabel})`, value: fmtNum(sc.scale), color: colors.secondary },
                ].map(({ label, value, color: valColor }, i, arr) => (
                  <View
                    key={label}
                    style={{
                      flex: 1,
                      padding: 12,
                      alignItems: "center",
                      borderRightWidth: i < arr.length - 1 ? 1 : 0,
                      borderRightColor: colors.separator,
                    }}
                  >
                    <Text style={{ fontSize: 6.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>
                      {label}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: "bold", color: valColor }}>{value}</Text>
                  </View>
                ))}
              </View>

              {/* Pricing tiers */}
              {sc.tiers.length > 0 && (
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingBottom: 10,
                    paddingTop: 8,
                    backgroundColor: "#FFFFFF",
                    borderTopWidth: 1,
                    borderTopColor: colors.separator,
                    borderBottomLeftRadius: 4,
                    borderBottomRightRadius: 4,
                  }}
                >
                  <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                    Pricing Tiers
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
                    {sc.tiers.map((tier, ti) => {
                      const isApplied =
                        sc.appliedTier &&
                        tier.thresholdFrom === sc.appliedTier.thresholdFrom &&
                        tier.thresholdTo === sc.appliedTier.thresholdTo;
                      const rangeStr =
                        tier.thresholdTo === null
                          ? `${fmtNum(tier.thresholdFrom)}+`
                          : `${fmtNum(tier.thresholdFrom)}–${fmtNum(tier.thresholdTo)}`;
                      return (
                        <View
                          key={ti}
                          style={{
                            backgroundColor: isApplied ? colors.primary : colors.cards,
                            borderRadius: 2,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                          }}
                        >
                          <Text style={{ fontSize: 7.5, color: isApplied ? "#FFFFFF" : colors.secondary, fontWeight: isApplied ? "bold" : "normal" }}>
                            {`${rangeStr}: $${tier.rate} /${sc.rateSuffix}`}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  {sc.warning && (
                    <Text style={{ fontSize: 7.5, color: colors.primary, marginTop: 6 }}>
                      {`⚠  ${sc.warning}`}
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Recommended summary bar */}
        {hasBest && (
          <View
            style={{
              backgroundColor: colors.primaryText,
              borderRadius: 4,
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text style={{ fontSize: 7, color: "#777777", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>
                Recommended Scenario
              </Text>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: "#FFFFFF" }}>
                {data.bestPricingScenarioLabel}
              </Text>
              <Text style={{ fontSize: 8, color: "#777777", marginTop: 2 }}>
                {`Investment: ${fmtCurrency(data.bestPricingInvestment ?? 0)}`}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 7, color: "#777777", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>
                Net Annual
              </Text>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primary }}>
                {fmtCurrency(data.bestPricingNet ?? 0)}
              </Text>
            </View>
          </View>
        )}

        <PageFooter orgName={orgName} settingLabel={data.careSettingLabel} />
      </View>
    </Page>
  );
}

// ─── Road Ahead page ──────────────────────────────────────────────────────────

function RoadAheadPage({ data }: { data: MeasurePDFData }) {
  const orgName = data.organizationName || "Your Organization";
  const hasAddedSettings = data.addedSettings.length > 0;
  const uplift = data.totalProjected - data.totalRealized;

  // Multi-setting layout: per-setting forecast tables
  if (data.isMultiSetting && data.settingBreakdowns && data.settingBreakdowns.length > 0) {
    return (
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <SectionLabel>FULL DEPLOYMENT POTENTIAL</SectionLabel>
          <Text style={styles.sectionHeadline}>The Road Ahead.</Text>
          <Text style={styles.body}>
            {`This deployment spans ${data.settingBreakdowns.length} care settings. The projections below apply the unit economics measured today to each setting's full-scale footprint.`}
          </Text>

          {data.settingBreakdowns.map((sb, i) => {
            const isNursing = sb.setting === "nursing";
            const rows = isNursing
              ? [
                  { label: "Staffed Beds", baseline: fmtNum(sb.forecastBaseline.staffedBeds), projected: fmtNum(sb.forecastProjected.staffedBeds) },
                  { label: "Occupancy", baseline: `${sb.forecastBaseline.occupancyPercent}%`, projected: `${sb.forecastProjected.occupancyPercent}%` },
                ]
              : [
                  { label: "Providers", baseline: fmtNum(sb.forecastBaseline.providers), projected: fmtNum(sb.forecastProjected.providers) },
                  { label: "Utilization", baseline: `${sb.forecastBaseline.utilizationPercent}%`, projected: `${sb.forecastProjected.utilizationPercent}%` },
                  { label: "Annual Encounters", baseline: fmtNum(sb.forecastBaseline.encounters), projected: fmtNum(sb.forecastProjected.encounters) },
                ];
            return (
              <View key={sb.setting} style={{ marginBottom: i < data.settingBreakdowns!.length - 1 ? 12 : 0 }} wrap={false}>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                  {sb.label}
                </Text>
                <View style={{ borderRadius: 4, borderWidth: 1, borderColor: colors.separator }}>
                  <View style={{ flexDirection: "row", backgroundColor: colors.cards, paddingVertical: 6, paddingHorizontal: 10, borderTopLeftRadius: 4, borderTopRightRadius: 4 }}>
                    <View style={{ flex: 2 }} />
                    <Text style={{ flex: 1, fontSize: 7.5, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, textAlign: "right" }}>Current</Text>
                    <Text style={{ flex: 1, fontSize: 7.5, fontWeight: "bold", color: colors.primaryText, textTransform: "uppercase", letterSpacing: 1, textAlign: "right" }}>Full Scale</Text>
                  </View>
                  {rows.map((row, ri) => (
                    <View key={row.label} style={{ flexDirection: "row", paddingVertical: 6, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: colors.separator, backgroundColor: ri % 2 === 0 ? "#FFFFFF" : colors.background }}>
                      <Text style={{ flex: 2, fontSize: 8.5, color: colors.secondary }}>{row.label}</Text>
                      <Text style={{ flex: 1, fontSize: 8.5, color: colors.secondary, textAlign: "right" }}>{row.baseline}</Text>
                      <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.primaryText, textAlign: "right" }}>{row.projected}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}

          {/* Combined value summary */}
          <View style={{ marginTop: 14, borderRadius: 4, borderWidth: 1, borderColor: colors.separator }}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#FFFFFF", borderTopLeftRadius: 4, borderTopRightRadius: 4 }}>
              <Text style={{ flex: 2, fontSize: 9, color: colors.secondary }}>Realized Annual Value</Text>
              <Text style={{ flex: 1, fontSize: 9, color: colors.secondary, textAlign: "right" }}>{fmtCurrency(data.totalRealized)}</Text>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: "bold", color: colors.primaryText, textAlign: "right" }}>{fmtCurrency(data.totalProjected)}</Text>
            </View>
            {uplift > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 9, paddingHorizontal: 12, backgroundColor: colors.primaryText, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }}>
                <Text style={{ flex: 2, fontSize: 9, fontWeight: "bold", color: "#FFFFFF" }}>Combined Uplift</Text>
                <Text style={{ flex: 1, fontSize: 9, color: "#777777", textAlign: "right" }}>—</Text>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: "bold", color: colors.primary, textAlign: "right" }}>{`+${fmtCurrency(uplift)}`}</Text>
              </View>
            )}
          </View>

          {hasAddedSettings && (
            <>
              <Text style={[styles.subSectionHeader, { marginTop: 12 }]}>Expansion Settings</Text>
              {data.addedSettings.map((setting, i) => (
                <View key={i} style={{ backgroundColor: colors.cards, borderRadius: 4, padding: 12, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }} wrap={false}>
                  <View>
                    <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText, marginBottom: 3 }}>{setting.settingLabel}</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>
                      {setting.isNursing
                        ? `${fmtNum(setting.staffedBeds)} beds · ${setting.occupancyPercent}% occupancy`
                        : `${fmtNum(setting.providers)} providers · ${setting.utilizationPercent}% utilization`}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(setting.estimatedValue)}</Text>
                </View>
              ))}
              <View style={{ backgroundColor: colors.primaryText, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 8, color: "#777777" }}>{`${fmtCurrency(data.totalProjected)} current + ${fmtCurrency(data.addedSettingsTotal)} expansion`}</Text>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(data.combinedAnnualTotal)}</Text>
              </View>
            </>
          )}

          <PageFooter orgName={orgName} settingLabel={data.careSettingLabel} />
        </View>
      </Page>
    );
  }

  // Single-setting layout (original)
  const isNursing = data.careSetting === "nursing";
  const baselineRows = isNursing
    ? [
        { label: "Staffed Beds", baseline: fmtNum(data.forecastBaseline.staffedBeds), projected: fmtNum(data.forecastProjected.staffedBeds) },
        { label: "Occupancy Rate", baseline: `${data.forecastBaseline.occupancyPercent}%`, projected: `${data.forecastProjected.occupancyPercent}%` },
      ]
    : [
        { label: "Providers", baseline: fmtNum(data.forecastBaseline.providers), projected: fmtNum(data.forecastProjected.providers) },
        { label: "Utilization", baseline: `${data.forecastBaseline.utilizationPercent}%`, projected: `${data.forecastProjected.utilizationPercent}%` },
        { label: "Annual Encounters", baseline: fmtNum(data.forecastBaseline.encounters), projected: fmtNum(data.forecastProjected.encounters) },
      ];

  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.pageWrapper}>
        <SectionLabel>FULL DEPLOYMENT POTENTIAL</SectionLabel>
        <Text style={styles.sectionHeadline}>The Road Ahead.</Text>
        <Text style={styles.body}>
          {`The current deployment covers ${fmtNum(data.numberOfProviders)} providers at ${data.utilizationPercent}% adoption. The full-scale scenario below uses identical unit economics — the same value-per-provider measured today, applied to the complete footprint.`}
        </Text>

        <View style={{ marginBottom: 14, borderRadius: 4, borderWidth: 1, borderColor: colors.separator }}>
          <View style={{ flexDirection: "row", backgroundColor: colors.cards, paddingVertical: 8, paddingHorizontal: 12, borderTopLeftRadius: 4, borderTopRightRadius: 4 }}>
            <View style={{ flex: 2 }} />
            <Text style={{ flex: 1, fontSize: 8, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, textAlign: "right" }}>Current</Text>
            <Text style={{ flex: 1, fontSize: 8, fontWeight: "bold", color: colors.primaryText, textTransform: "uppercase", letterSpacing: 1, textAlign: "right" }}>Full Scale</Text>
          </View>
          {baselineRows.map((row, i) => (
            <View key={row.label} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 7, paddingHorizontal: 12, backgroundColor: i % 2 === 0 ? "#FFFFFF" : colors.background, borderTopWidth: 1, borderTopColor: colors.separator }}>
              <Text style={{ flex: 2, fontSize: 9, color: colors.secondary }}>{row.label}</Text>
              <Text style={{ flex: 1, fontSize: 9, color: colors.secondary, textAlign: "right" }}>{row.baseline}</Text>
              <Text style={{ flex: 1, fontSize: 9, fontWeight: "bold", color: colors.primaryText, textAlign: "right" }}>{row.projected}</Text>
            </View>
          ))}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.separatorHeavy }}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#FFFFFF" }}>
              <Text style={{ flex: 2, fontSize: 9, color: colors.secondary }}>Realized Annual Value</Text>
              <Text style={{ flex: 1, fontSize: 9, color: colors.secondary, textAlign: "right" }}>{fmtCurrency(data.totalRealized)}</Text>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: "bold", color: colors.primaryText, textAlign: "right" }}>{fmtCurrency(data.totalProjected)}</Text>
            </View>
            {uplift > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 9, paddingHorizontal: 12, backgroundColor: colors.primaryText, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }}>
                <Text style={{ flex: 2, fontSize: 9, fontWeight: "bold", color: "#FFFFFF" }}>Uplift Opportunity</Text>
                <Text style={{ flex: 1, fontSize: 9, color: "#777777", textAlign: "right" }}>—</Text>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: "bold", color: colors.primary, textAlign: "right" }}>{`+${fmtCurrency(uplift)}`}</Text>
              </View>
            )}
          </View>
        </View>

        {hasAddedSettings && (
          <>
            <Text style={styles.subSectionHeader}>Expansion Settings</Text>
            {data.addedSettings.map((setting, i) => (
              <View key={i} style={{ backgroundColor: colors.cards, borderRadius: 4, padding: 12, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }} wrap={false}>
                <View>
                  <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText, marginBottom: 3 }}>{setting.settingLabel}</Text>
                  <Text style={{ fontSize: 8.5, color: colors.secondary }}>
                    {setting.isNursing
                      ? `${fmtNum(setting.staffedBeds)} beds · ${setting.occupancyPercent}% occupancy`
                      : `${fmtNum(setting.providers)} providers · ${setting.utilizationPercent}% utilization · ${fmtNum(setting.encounters)} encounters/yr`}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <View style={{ backgroundColor: colors.primary + "20", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4 }}>
                    <Text style={{ fontSize: 7.5, color: colors.primary, fontWeight: "bold" }}>{setting.scenarioLabel}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(setting.estimatedValue)}</Text>
                  <Text style={{ fontSize: 7, color: colors.tertiary }}>{`est. annual value${setting.isOverridden ? " (overridden)" : ""}`}</Text>
                </View>
              </View>
            ))}
            <View style={{ backgroundColor: colors.primaryText, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontSize: 7, color: "#777777", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Combined Annual Value</Text>
                <Text style={{ fontSize: 8, color: "#777777" }}>{`${fmtCurrency(data.totalRealized)} current + ${fmtCurrency(data.addedSettingsTotal)} expansion`}</Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(data.combinedAnnualTotal)}</Text>
            </View>
          </>
        )}

        <PageFooter orgName={orgName} settingLabel={data.careSettingLabel} />
      </View>
    </Page>
  );
}

// ─── Methodology page ─────────────────────────────────────────────────────────

const MethodologyBullet = ({ text }: { text: string }) => (
  <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.45, marginBottom: 5 }} wrap={false}>
    {`• ${text}`}
  </Text>
);

function MethodologyPage({ data }: { data: MeasurePDFData }) {
  const orgName = data.organizationName || "Your Organization";
  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.pageWrapper}>
        <SectionLabel>METHODOLOGY</SectionLabel>
        <Text style={styles.sectionHeadline}>How This Was Calculated.</Text>
        <View>
          <MethodologyBullet text="Realized value formula: For each quantified driver, Realized Value = Δ × value-per-unit × (attribution% ÷ 100). The delta is the difference between the baseline (without Abridge) and current (with Abridge) measurements entered by your CSM. Attribution percent reflects the portion of the observed change credited to Abridge — it is set per driver, not globally." />
          <MethodologyBullet text="Attribution percent is user-set, not auto-assigned. It represents the team's judgment about how much of the measured change Abridge caused, accounting for confounding factors like workflow changes, staffing, or other concurrent initiatives. 100% attribution means the entire delta is credited; 50% means half is." />
          <MethodologyBullet text="Monthly mode: Drivers configured with trend data use the most recent month's values for before/after calculation. The sparkline shows the full measurement history, allowing direction-of-travel to be assessed independently from the realized value figure." />
          <MethodologyBullet text="Qualitative drivers are tracked as leading indicators and excluded from all financial totals. They appear in the Signal Evidence section of each domain page. Their presence indicates the organization is measuring the right upstream signals even before financial attribution is possible." />
          <MethodologyBullet
            text={`Forecast values apply the same per-unit economics measured in the current deployment to a larger scale — either higher provider count, utilization, or encounters. Expansion settings for additional care settings use per-setting benchmark estimates (Conservative / Typical / Optimistic). ${data.pricingScenarios.length > 0 ? "Investment scenarios use stepped tier pricing: every unit prices at the matched tier rate, and the tier is determined by combined projected scale." : ""}`}
          />
          <MethodologyBullet text="All inputs were provided by the Abridge team based on data collected during this deployment. No figure is fabricated or extrapolated beyond what was measured. This document is for internal planning and business review purposes only." />
        </View>

        <Text
          style={{
            fontSize: 8.5,
            fontStyle: "italic",
            color: colors.tertiary,
            lineHeight: 1.45,
            marginTop: 12,
          }}
        >
          This evidence summary reflects actual deployment data and Abridge methodology. Financial figures are attribution-adjusted estimates based on the measurements entered for this assessment; they are not audited projections. Actual results may vary based on workflow adoption, organizational factors, and measurement methodology. Validate all key figures against your own operational data before using this document in financial or contracting decisions.
        </Text>

        <PageFooter orgName={orgName} settingLabel={data.careSettingLabel} />
      </View>
    </Page>
  );
}

// ─── Main document ────────────────────────────────────────────────────────────

export const MeasureNarrativePDFDocument = ({ data }: { data: MeasurePDFData }) => {
  const orgName = data.organizationName || "Your Organization";
  const monthsLive = data.monthsLive ?? 0;

  const hasForecastOrExpansion = data.totalProjected > 0 || data.addedSettings.length > 0;
  const hasPricing = data.pricingScenarios.length > 0;
  const activeDomains = data.quadrants.filter((q) => q.drivers.length > 0);

  const subtitle = [
    data.careSettingLabel,
    `${fmtNum(data.numberOfProviders)} providers`,
    monthsLive > 0 ? `${monthsLive} months live` : null,
    `${data.utilizationPercent}% adoption`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Document>
      <PDFCoverPage
        reportLabel="EXECUTIVE BUSINESS REVIEW"
        title={orgName}
        subtitle={subtitle}
        preparedBy={data.preparedBy || "Abridge Partner Success"}
        disclaimerText="This EBR reflects actual deployment data and Abridge methodology. All financial figures are attribution-adjusted estimates based on measurements entered for this assessment."
      />

      <ExecutiveSummaryPage data={data} />

      {activeDomains.map((section) => (
        <DomainPage key={section.quadrant} section={section} data={data} />
      ))}

      {hasForecastOrExpansion && <RoadAheadPage data={data} />}

      {hasPricing && <PricingPage data={data} />}

      <MethodologyPage data={data} />
    </Document>
  );
};

// ─── Export function ──────────────────────────────────────────────────────────

export const generateMeasureNarrativePDF = async (data: MeasurePDFData): Promise<void> => {
  const blob = await pdf(<MeasureNarrativePDFDocument data={data} />).toBlob();
  const safeOrg = (data.organizationName || "abridge").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const safeDate = new Date().toISOString().slice(0, 10);
  await savePdfBlob(blob, `abridge-ebr-${safeOrg}-${safeDate}.pdf`);
};
