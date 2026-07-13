import {
  Document,
  Page,
  Text,
  View,
  Image,
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
import abridgeFontPath from "../../assets/fonts/abridge.otf";
import abridgeLogoRed from "@assets/abridge-logo-wordmark-red_1769187440253.png";

// ─── FONT REGISTRATION ────────────────────────────────────────────────────────

Font.registerHyphenationCallback((word) => [word]);
Font.register({
  family: "Manrope",
  fonts: [
    { src: manropeRegular, fontWeight: 400 },
    { src: manropeBold, fontWeight: 700 },
    { src: manropeRegular, fontWeight: 400, fontStyle: "italic" },
    { src: manropeBold, fontWeight: 700, fontStyle: "italic" },
  ],
});
Font.register({ family: "Abridge", src: abridgeFontPath, fontWeight: 400 });

// ─── BRAND PALETTE ────────────────────────────────────────────────────────────

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

// ─── DOMAIN COLORS ────────────────────────────────────────────────────────────

// Harmonized categorical set — one tonal family, coral kept as the brand anchor.
const domainColors: Record<string, string> = {
  Capacity:  "#2C6E7F",
  Workforce: "#5B6480",
  Revenue:   "#EA2C00",
  Quality:   "#3F7D66",
};

// ─── CONTENT MAPS ─────────────────────────────────────────────────────────────

const domainSubtitles: Record<string, string> = {
  Capacity:  "Documentation time saved per note, and what that time became",
  Workforce: "Burnout scores, retention signals, and the cost of keeping good providers",
  Revenue:   "Coding accuracy, capture rates, and what better documentation yields at the bill",
  Quality:   "HEDIS, CDI query rates, compliance, and safety signals that follow documentation improvement",
};

const domainIntros: Record<string, string> = {
  Capacity:  "Provider time is the highest-cost input in clinical operations, and documentation is where most of it goes. When Abridge shortens the time between an encounter and a completed note, that time does not disappear — it reallocates to patients, care coordination, or the end of a provider's day. The drivers below measure how much time was recovered and, where the data supports it, what that time became.",
  Workforce: "Provider attrition costs $250K–$500K per physician when you factor recruiting, onboarding, and ramp time — and documentation burden is consistently cited as burnout's leading cause. The drivers below measure the upstream signals: charting hours, after-hours documentation rates, and the cost of turnover that does not happen when administrative load decreases. Attribution is set conservatively throughout this domain because workforce outcomes are multi-causal.",
  Revenue:   "Documentation quality determines coding accuracy, and coding accuracy determines what gets paid. The gap between what was clinically appropriate and what was actually billed often traces directly to incomplete or late documentation at the point of care. The drivers below measure where Abridge is closing that gap — from wRVU capture to denial rates to HCC accuracy. These figures are among the most auditable in this document because billing data is precise and traceable.",
  Quality:   "Most quality metrics are lagging indicators — they report what happened months ago. The documentation signals below are upstream: they predict where quality scores will move before they move. A CDI query rate that improves today shows up in DRG accuracy six months from now; a HEDIS care gap closed this quarter shows up in STARS the following year. Drivers shown with a dollar figure represent hard cost avoidance. Drivers shown as signals are excluded from financial totals and will become financial drivers in future measurement cycles as the data matures.",
};

const domainTakeaways: Record<string, string> = {
  Capacity:  "The time figures above are attribution-adjusted — they credit Abridge only for the portion of change the team determined was directly caused by the tool, not the full observed improvement. If anything, these numbers understate total value by design.",
  Workforce: "Workforce drivers carry the most uncertainty of any domain. The figures above are intentionally conservative: attribution was set below 100% wherever staffing changes, management interventions, or other factors were running concurrently. A skeptical CFO should be able to defend every number above independently.",
  Revenue:   "Revenue drivers are the most independently verifiable in this document. The figures above can be cross-checked against payer reports and coding audit logs, making them the strongest candidates for CFO validation and the most defensible in a contract review.",
  Quality:   "Quality drivers shown as financial figures represent hard cost avoidance — avoided penalties, avoided CDI rework, avoided audit exposure. Signals tracked qualitatively are not included in the totals above; they are forward-looking indicators of where financial value will appear in subsequent measurement cycles.",
};

const DATA_SOURCE_LABELS: Record<string, string> = {
  ehr:          "EHR data",
  survey:       "Survey",
  admin_data:   "Admin data",
  chart_review: "Chart review",
  manual_entry: "Manual entry",
};

// ─── STYLES ───────────────────────────────────────────────────────────────────

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

  // PAGE HEADER
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
  headerLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: brand.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },

  // FOOTER
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

  // TYPOGRAPHY
  eyebrow: {
    fontSize: 8,
    fontWeight: 600,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 23,
    fontFamily: "Abridge",
    fontWeight: 400,
    letterSpacing: 0.4,
    color: brand.textPrimary,
    marginBottom: 6,
  },
  sectionIntro: {
    fontSize: 9.5,
    color: brand.textSecondary,
    lineHeight: 1.6,
    marginBottom: 14,
  },

  // INSIGHT BOX
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

  // HERO BAND
  heroBand: {
    backgroundColor: brand.black,
    borderRadius: 4,
    paddingVertical: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    marginBottom: 14,
  },
  heroMetric:  { flex: 1, alignItems: "center" },
  heroValue:   { fontSize: 26, fontWeight: 700, color: brand.white, marginBottom: 4 },
  heroLabel:   { fontSize: 7.5, color: "#AEAEAE", textTransform: "uppercase", letterSpacing: 1.4 },
  heroDivider: { width: 1, backgroundColor: "#333333" },

  // TABLE
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
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
    backgroundColor: brand.warmGray,
  },
  tableCell:     { fontSize: 8.5, color: brand.textPrimary },
  tableCellBold: { fontSize: 8.5, fontWeight: 600, color: brand.textPrimary },
  tableCellMuted:{ fontSize: 8,   color: brand.textSecondary },

  // DOMAIN TILES
  domainTiles: { flexDirection: "row", gap: 6, marginBottom: 12 },
  domainTile: {
    flex: 1,
    backgroundColor: brand.lightGray,
    padding: 10,
    borderWidth: 1,
    borderColor: brand.midGray,
  },

  // DIVIDER
  divider: { borderBottomWidth: 1, borderBottomColor: brand.midGray, marginVertical: 10 },
});

// ─── FORMATTERS ───────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (!Number.isFinite(n)) return "$0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000)   {
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

// ─── SHARED LAYOUT COMPONENTS ─────────────────────────────────────────────────

function PageHeader({ label }: { label: string }) {
  return (
    <View style={S.pageHeader}>
      <Image src={abridgeLogoRed} style={S.headerLogo} />
      <Text style={S.headerLabel}>{label}</Text>
    </View>
  );
}

function PageFooter({ orgName }: { orgName: string }) {
  return (
    <View style={S.footer} fixed>
      <Text style={{ fontSize: 7.5, color: brand.textTertiary }}>
        {`Confidential · ${orgName} · Evidence Summary`}
      </Text>
      <Text
        style={{ fontSize: 7.5, fontWeight: 600, color: brand.textSecondary }}
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `${pageNumber - 1} / ${totalPages - 1}`
        }
      />
    </View>
  );
}

// ─── HERO BAND ────────────────────────────────────────────────────────────────

function HeroBand({ metrics }: { metrics: Array<{ value: string; label: string }> }) {
  return (
    <View style={S.heroBand}>
      {metrics.map((m, i) => (
        <View key={i} style={{ flexDirection: "row", flex: 1 }}>
          {i > 0 && <View style={S.heroDivider} />}
          <View style={[S.heroMetric, i > 0 ? { flex: 1 } : {}]}>
            <Text style={S.heroValue}>{m.value}</Text>
            <Text style={S.heroLabel}>{m.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── INSIGHT BOX ─────────────────────────────────────────────────────────────

function InsightBox({ label, text }: { label: string; text: string }) {
  return (
    <View style={S.insightBox}>
      <Text style={S.insightLabel}>{label}</Text>
      <Text style={S.insightText}>{text}</Text>
    </View>
  );
}

// ─── SPARKLINE ────────────────────────────────────────────────────────────────

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
  const ptsWith    = sorted.map((d, i) => `${pad + i * xStep},${toY(d.withAbridge)}`).join(" ");
  const ptsWithout = sorted.map((d, i) => `${pad + i * xStep},${toY(d.withoutAbridge)}`).join(" ");
  return (
    <View style={{ marginTop: 6, marginBottom: 2 }}>
      <Svg width={w} height={h}>
        <Line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={brand.midGray} strokeWidth={0.5} />
        <Polyline points={ptsWithout} stroke={brand.textTertiary} strokeWidth={1} fill="none" strokeDasharray="2,2" />
        <Polyline points={ptsWith} stroke={color} strokeWidth={1.5} fill="none" />
        {sorted.map((d, i) => (
          <Circle key={i} cx={pad + i * xStep} cy={toY(d.withAbridge)} r={1.5} fill={color} />
        ))}
      </Svg>
      <Text style={{ fontSize: 7, color: brand.textTertiary, marginTop: 2 }}>
        {"Solid: With Abridge   Dashed: Baseline"}
      </Text>
    </View>
  );
}

// ─── CALC CHAIN ROW ───────────────────────────────────────────────────────────

function CalcChainRow({
  driver,
  accentColor,
}: {
  driver: MeasurePDFDriver;
  accentColor: string;
}) {
  if (driver.visibility !== "quantified" || driver.valuePerUnit <= 0 || driver.realizedValue <= 0) return null;

  const unit = driver.deltaUnit || "";
  const deltaSign = driver.delta >= 0 ? "+" : "";
  const unitLabel = driver.valuePerUnitLabel || "unit";
  const vpu = driver.valuePerUnit;
  const vpuStr = vpu >= 1
    ? `$${vpu % 1 === 0 ? vpu.toFixed(0) : vpu.toFixed(2)}`
    : `$${vpu.toFixed(4).replace(/\.?0+$/, "")}`;

  const steps = [
    { topLabel: "CHANGE",      value: `${deltaSign}${fmtNum(driver.delta)}`, bottomLabel: unit },
    { topLabel: "VALUE / UNIT", value: vpuStr,                               bottomLabel: `per ${unitLabel}` },
    { topLabel: "ATTRIBUTION",  value: `${driver.attributionPercent}%`,      bottomLabel: "credited to Abridge" },
    { topLabel: "REALIZED",     value: fmtCurrency(driver.realizedValue),    bottomLabel: "per year", accent: true },
  ];

  return (
    <View style={{ marginTop: 8, marginBottom: 2 }} wrap={false}>
      <Text style={{ fontSize: 7.5, color: brand.textTertiary, textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 5 }}>
        How this was calculated
      </Text>
      <View style={{ flexDirection: "row", backgroundColor: brand.warmGray, borderRadius: 4 }}>
        {steps.map((step, i) => (
          <View
            key={step.topLabel}
            style={{
              flex: 1,
              paddingVertical: 9,
              paddingHorizontal: 8,
              alignItems: "center",
              borderRightWidth: i < steps.length - 1 ? 0.5 : 0,
              borderRightColor: brand.midGray,
              backgroundColor: step.accent ? accentColor + "12" : "transparent",
            }}
          >
            <Text style={{ fontSize: 7.5, color: brand.textTertiary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
              {step.topLabel}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: 700, color: step.accent ? accentColor : brand.textPrimary, lineHeight: 1.1 }}>
              {step.value}
            </Text>
            {step.bottomLabel ? (
              <Text style={{ fontSize: 7.5, color: brand.textTertiary, marginTop: 3, textAlign: "center" }}>
                {step.bottomLabel}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── DRIVER CARD ──────────────────────────────────────────────────────────────

function DriverCard({
  driver,
  accentColor,
  showDollars = true,
}: {
  driver: MeasurePDFDriver;
  accentColor: string;
  showDollars?: boolean;
}) {
  const isQuant = driver.visibility === "quantified";
  const hasMonthly = driver.isMonthlyMode && (driver.monthlyData?.length ?? 0) >= 2;
  const unit = driver.deltaUnit || "";
  const deltaSign = driver.delta >= 0 ? "+" : "";
  const dataSourceLabel = driver.entryDataSource ? DATA_SOURCE_LABELS[driver.entryDataSource] : null;
  const measuredAtLabel = driver.measuredAt || null;

  return (
    <View
      style={{
        borderTopWidth: 0.5,
        borderTopColor: brand.midGray,
        paddingTop: 12,
        marginBottom: 14,
      }}
      wrap={false}
    >
      {/* Header row */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5, marginBottom: 3 }}>
            <Text style={{ fontSize: 10, fontWeight: 700, color: brand.textPrimary, lineHeight: 1.3 }}>
              {driver.label}
            </Text>
            {/* Quantified badge */}
            {isQuant ? (
              <View style={{ backgroundColor: brand.positive + "18", borderRadius: 2, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 6.5, color: brand.positive, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
                  $
                </Text>
              </View>
            ) : (
              <View style={{ backgroundColor: brand.midGray, borderRadius: 2, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 6.5, color: brand.textSecondary, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
                  SIGNAL
                </Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 9, color: brand.textSecondary, lineHeight: 1.5 }}>
            {driver.shortDescription}
          </Text>
        </View>
        {isQuant && showDollars && driver.realizedValue > 0 && (
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 15, fontWeight: 700, color: accentColor, lineHeight: 1.1 }}>
              {fmtCurrency(driver.realizedValue)}
            </Text>
            <Text style={{ fontSize: 7, color: brand.textTertiary }}>realized / yr</Text>
          </View>
        )}
      </View>

      {isQuant ? (
        <>
          {/* Before / With Abridge / Change strip */}
          <View style={{ flexDirection: "row", backgroundColor: brand.warmGray, borderRadius: 4, marginTop: 4, marginBottom: 4 }}>
            {[
              { label: "Before",       value: driver.withoutAbridge, color: brand.textSecondary, prefix: "" },
              { label: "With Abridge", value: driver.withAbridge,    color: brand.textPrimary,   prefix: "" },
              { label: "Change",       value: driver.delta,          color: accentColor,          prefix: deltaSign },
            ].map(({ label, value, color: cellColor, prefix }, i) => (
              <View
                key={label}
                style={{
                  flex: 1,
                  paddingVertical: 9,
                  paddingHorizontal: 8,
                  alignItems: "center",
                  borderRightWidth: i < 2 ? 0.5 : 0,
                  borderRightColor: brand.midGray,
                }}
              >
                <Text style={{ fontSize: 7.5, color: brand.textTertiary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 }}>
                  {label}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: 700, color: cellColor, lineHeight: 1.1 }}>
                  {`${prefix}${fmtNum(value)}`}
                </Text>
                {unit ? (
                  <Text style={{ fontSize: 7.5, color: brand.textTertiary, marginTop: 2 }}>{unit}</Text>
                ) : null}
              </View>
            ))}
          </View>

          {/* Calculation chain */}
          {showDollars && (
            <CalcChainRow driver={driver} accentColor={accentColor} />
          )}

          {/* Attribution note */}
          {showDollars && driver.attributionPercent < 100 && driver.attributionPercent > 0 && driver.realizedValue > 0 && (
            <View style={{ marginTop: 5, flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: brand.textTertiary, marginTop: 4, marginRight: 5, flexShrink: 0 }} />
              <Text style={{ fontSize: 7.5, color: brand.textSecondary, fontStyle: "italic", lineHeight: 1.45, flex: 1 }}>
                {`Attribution set to ${driver.attributionPercent}%: the remaining ${100 - driver.attributionPercent}% of the observed change is credited to concurrent factors — staffing, workflow changes, or other initiatives running in parallel.`}
              </Text>
            </View>
          )}

          {/* Sparkline */}
          {hasMonthly && driver.monthlyData && (
            <Sparkline data={driver.monthlyData} color={accentColor} />
          )}

          {/* Notes */}
          {driver.notes && (
            <Text style={{ fontSize: 8, color: brand.textSecondary, fontStyle: "italic", marginTop: 6 }}>
              {driver.notes}
            </Text>
          )}

          {/* Data source / measured date pills */}
          {(dataSourceLabel || measuredAtLabel) && (
            <View style={{ flexDirection: "row", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
              {dataSourceLabel && (
                <View style={{ backgroundColor: brand.lightGray, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 6.5, color: brand.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {dataSourceLabel}
                  </Text>
                </View>
              )}
              {measuredAtLabel && (
                <View style={{ backgroundColor: brand.lightGray, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 6.5, color: brand.textSecondary }}>{measuredAtLabel}</Text>
                </View>
              )}
            </View>
          )}
        </>
      ) : (
        <>
          {driver.notes && (
            <Text style={{ fontSize: 8.5, color: brand.textSecondary, marginBottom: 4, lineHeight: 1.5 }}>
              {driver.notes}
            </Text>
          )}
          <Text style={{ fontSize: 8, color: brand.textTertiary, fontStyle: "italic" }}>
            Tracked as a leading indicator. Not included in financial totals.
          </Text>
        </>
      )}
    </View>
  );
}

// ─── NARRATIVE GENERATOR ──────────────────────────────────────────────────────

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
    return `${orgName} has deployed Abridge. No measurement data has been entered yet. This document will populate as drivers are configured and data is collected.`;
  }

  if (activeDomains.length === 0) {
    const qualCount = allQualDrivers.length;
    return `${orgName} is tracking ${qualCount} qualitative signal${qualCount !== 1 ? "s" : ""}. Financial attribution figures will appear once quantified drivers have data entered.`;
  }

  const topDomain = activeDomains[0];
  const topDriver = topDomain.drivers
    .filter((d) => d.visibility === "quantified")
    .sort((a, b) => b.realizedValue - a.realizedValue)[0];

  let text = `${fmtCurrency(data.totalRealized)} in realized annual value has been measured across ${allQuantDrivers.length} driver${allQuantDrivers.length !== 1 ? "s" : ""}.`;

  if (topDriver && data.totalRealized > 0) {
    const pct = Math.round((topDriver.realizedValue / data.totalRealized) * 100);
    const share = pct >= 60 ? "the majority" : pct >= 40 ? "nearly half" : `${pct}%`;
    text += ` ${topDomain.quadrant} accounts for ${share} of that total. ${topDriver.label} is the primary contributor at ${fmtCurrency(topDriver.realizedValue)}/yr, with ${topDriver.attributionPercent}% of the change credited to Abridge.`;
  }

  if (activeDomains.length > 1) {
    const others = activeDomains.slice(1, 3).map((d) => d.quadrant);
    text += ` ${others.join(" and ")} contribute the remainder.`;
  }

  if (allQualDrivers.length > 0) {
    text += ` ${allQualDrivers.length} additional signal${allQualDrivers.length !== 1 ? "s are" : " is"} tracked qualitatively as leading indicators, separate from financial totals.`;
  }

  return text;
}

// ─── PAGE 2: EXECUTIVE SUMMARY ────────────────────────────────────────────────

function ExecutiveSummaryPage({ data, showDollars }: { data: MeasurePDFData; showDollars: boolean }) {
  const orgName = data.organizationName || "Your Organization";
  const monthsLive = data.monthsLive ?? 0;
  const narrative = buildNarrative(data);

  // Hero metrics
  const heroMetrics = [
    { value: showDollars ? fmtCurrency(data.totalRealized) : `${data.driversTrackedCount}`, label: showDollars ? "Total Value Realized" : "Drivers Tracked" },
    { value: `${data.driversTrackedCount}`, label: "Drivers Tracked" },
    { value: monthsLive > 0 ? `${monthsLive}` : "Active", label: "Months Live" },
  ];

  // Unique data sources across all drivers
  const allDataSources = Array.from(
    new Set(
      data.quadrants
        .flatMap((q) => q.drivers)
        .map((d) => d.entryDataSource)
        .filter(Boolean)
        .map((src) => DATA_SOURCE_LABELS[src as string] ?? src as string)
    )
  );

  const encounters = data.annualEncounters > 0 ? fmtNum(data.annualEncounters) : null;

  // Deployment context (from the partner-profile screen) — shown before value.
  const totalInOrg = data.totalProvidersInOrg || data.numberOfProviders;
  const live       = data.liveProviders || 0;
  const mru        = data.mruProviders || 0;
  const coverage   = data.encounterCoverageRate || 0;
  const abridgeEnc = data.abridgeEncounters || 0;

  const contextStats: Array<{ value: string; label: string; sub?: string }> = [];
  if (totalInOrg > 0) contextStats.push({ value: fmtNum(totalInOrg), label: "Providers in Org" });
  if (live > 0) contextStats.push({
    value: fmtNum(live),
    label: "Live on Abridge",
    sub: totalInOrg > 0 ? `${Math.round((live / totalInOrg) * 100)}% of org` : undefined,
  });
  if (mru > 0) contextStats.push({
    value: fmtNum(mru),
    label: "Monthly Recording Users",
    sub: live > 0 ? `${Math.round((mru / live) * 100)}% of live` : undefined,
  });
  if (coverage > 0) contextStats.push({
    value: `${coverage}%`,
    label: "Encounter Coverage",
    sub: abridgeEnc > 0 && data.annualEncounters > 0
      ? `${fmtNum(abridgeEnc)} of ${fmtNum(data.annualEncounters)} enc`
      : undefined,
  });

  const contextSubline = [
    encounters ? `${encounters} annual encounters` : null,
    data.careSettingLabel,
    monthsLive > 0 ? `${monthsLive} months live` : null,
  ].filter(Boolean).join(" · ");

  return (
    <Page size="LETTER" style={S.page}>
      <PageHeader label="Evidence Summary" />

      {/* Deployment context — the "who and how much" before the value numbers */}
      {contextStats.length > 0 && (
        <>
          <Text style={[S.eyebrow, { color: brand.textSecondary, marginBottom: 8 }]}>Deployment</Text>
          <View style={{
            flexDirection: "row",
            gap: 6,
            paddingVertical: 12,
            borderTopWidth: 0.5,
            borderTopColor: brand.midGray,
            borderBottomWidth: 0.5,
            borderBottomColor: brand.midGray,
            marginBottom: contextSubline ? 6 : 14,
          }}>
            {contextStats.map((c, i) => (
              <View key={i} style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: 700, color: brand.textPrimary, marginBottom: 3 }}>{c.value}</Text>
                <Text style={{ fontSize: 7.5, fontWeight: 700, color: brand.textSecondary, textTransform: "uppercase", letterSpacing: 0.8 }}>{c.label}</Text>
                {c.sub ? <Text style={{ fontSize: 7.5, color: brand.textTertiary, marginTop: 2 }}>{c.sub}</Text> : null}
              </View>
            ))}
          </View>
          {contextSubline ? (
            <Text style={{ fontSize: 8, color: brand.textTertiary, marginBottom: 16 }}>{contextSubline}</Text>
          ) : null}
        </>
      )}

      {/* Value realized */}
      {showDollars && (
        <Text style={[S.eyebrow, { color: brand.coral, marginBottom: 6 }]}>Value Realized</Text>
      )}

      {/* Hero band */}
      {showDollars && (
        <HeroBand metrics={heroMetrics} />
      )}
      {!showDollars && (
        <HeroBand metrics={[
          { value: `${data.driversTrackedCount}`, label: "Drivers Tracked" },
          { value: monthsLive > 0 ? `${monthsLive}` : "Active", label: "Months Live" },
          { value: data.careSettingLabel, label: "Care Setting" },
        ]} />
      )}

      {/* Domain contribution — where the value comes from */}
      {showDollars && data.totalRealized > 0 && (
        <View style={{ height: 12, borderRadius: 3, overflow: "hidden", backgroundColor: brand.lightGray, flexDirection: "row", marginBottom: 12 }}>
          {(["Capacity", "Workforce", "Revenue", "Quality"] as const).map((qName) => {
            const q = data.quadrants.find((x) => x.quadrant === qName);
            const total = q?.realizedTotal ?? 0;
            if (total <= 0) return null;
            const pct = (total / data.totalRealized) * 100;
            return <View key={qName} style={{ width: `${pct}%`, backgroundColor: domainColors[qName] }} />;
          })}
        </View>
      )}

      {/* Domain legend */}
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 16 }}>
        {(["Capacity", "Workforce", "Revenue", "Quality"] as const).map((qName) => {
          const q = data.quadrants.find((x) => x.quadrant === qName);
          const total = q?.realizedTotal ?? 0;
          const count = q?.drivers.length ?? 0;
          const dColor = domainColors[qName];
          const active = showDollars ? total > 0 : count > 0;
          const pct = data.totalRealized > 0 ? Math.round((total / data.totalRealized) * 100) : 0;
          return (
            <View key={qName} style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: active ? dColor : brand.midGray, marginRight: 4 }} />
                <Text style={{ fontSize: 7.5, fontWeight: 700, color: active ? dColor : brand.textTertiary, textTransform: "uppercase", letterSpacing: 0.8 }}>
                  {qName}
                </Text>
              </View>
              <Text style={{ fontSize: 17, fontWeight: 700, color: active ? brand.textPrimary : brand.textTertiary, marginBottom: 2 }}>
                {showDollars ? (total > 0 ? fmtCurrency(total) : "—") : count}
              </Text>
              <Text style={{ fontSize: 7.5, color: brand.textTertiary }}>
                {showDollars
                  ? (total > 0 ? `${pct}% of total` : "not yet tracked")
                  : `driver${count !== 1 ? "s" : ""}`}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Narrative insight box */}
      <InsightBox label="Summary" text={narrative} />

      {/* Data sources */}
      {allDataSources.length > 0 && (
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 8, color: brand.textTertiary }}>
            {`Data sources: ${allDataSources.join(", ")}`}
          </Text>
        </View>
      )}

      <PageFooter orgName={orgName} />
    </Page>
  );
}

// ─── DOMAIN PAGES ─────────────────────────────────────────────────────────────

function DomainPage({
  section,
  data,
  showDollars,
}: {
  section: MeasurePDFQuadrantSection;
  data: MeasurePDFData;
  showDollars: boolean;
}) {
  const orgName = data.organizationName || "Your Organization";
  const accentColor = domainColors[section.quadrant] ?? brand.coral;
  const subtitle   = domainSubtitles[section.quadrant] ?? "";
  const intro      = domainIntros[section.quadrant] ?? "";
  const takeaway   = domainTakeaways[section.quadrant] ?? "";
  const quantified  = section.drivers.filter((d) => d.visibility === "quantified");
  const qualitative = section.drivers.filter((d) => d.visibility === "qualitative");

  return (
    <Page size="LETTER" style={S.page}>
      <PageHeader label="Evidence Summary" />

      {/* Eyebrow in domain color */}
      <Text style={[S.eyebrow, { color: accentColor }]}>{section.quadrant.toUpperCase()}</Text>

      {/* Section title in Abridge serif */}
      <Text style={S.sectionTitle}>{subtitle}</Text>

      {/* Domain realized value */}
      {showDollars && section.realizedTotal > 0 && (
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: 700, color: accentColor }}>{fmtCurrency(section.realizedTotal)}</Text>
          <Text style={{ fontSize: 8, color: brand.textTertiary }}>realized annual value</Text>
        </View>
      )}

      {/* Domain intro */}
      {intro && (
        <Text style={S.sectionIntro}>{intro}</Text>
      )}

      {/* Driver cards */}
      {section.drivers.map((driver) => (
        <DriverCard
          key={`${driver.id}-${driver.setting ?? ""}`}
          driver={driver}
          accentColor={accentColor}
          showDollars={showDollars}
        />
      ))}

      {/* Qualitative drivers note */}
      {qualitative.length > 0 && quantified.length === 0 && (
        <View style={{ backgroundColor: brand.lightGray, borderRadius: 3, padding: 12, marginBottom: 10 }}>
          <Text style={{ fontSize: 8.5, color: brand.textSecondary, lineHeight: 1.55 }}>
            These drivers are tracked as directional indicators, not financial contributors. They will become financial drivers in subsequent measurement cycles as data quality and sample size improve.
          </Text>
        </View>
      )}

      {/* Domain takeaway */}
      {showDollars && quantified.length > 0 && takeaway && (
        <InsightBox label="Reading This Section" text={takeaway} />
      )}

      <PageFooter orgName={orgName} />
    </Page>
  );
}

// ─── PROVIDER VOICES PAGE ─────────────────────────────────────────────────────

function ProviderVoicesPage({ data }: { data: MeasurePDFData }) {
  const orgName = data.organizationName || "Your Organization";
  const stories = (data.loveStories ?? []).slice(0, 6);

  return (
    <Page size="LETTER" style={S.page}>
      <PageHeader label="Provider Voices" />

      <Text style={[S.eyebrow, { color: brand.coral }]}>Provider Voices</Text>
      <Text style={S.sectionTitle}>The voice behind the numbers</Text>
      <Text style={S.sectionIntro}>
        What providers say about Abridge — often the most memorable part of a business review.
      </Text>

      {stories.map((story, i) => (
        <View
          key={i}
          style={{
            backgroundColor: brand.lightGray,
            borderLeftWidth: 3,
            borderLeftColor: brand.coral,
            paddingVertical: 14,
            paddingHorizontal: 16,
            marginBottom: 10,
            borderRadius: 2,
          }}
          wrap={false}
        >
          <Text style={{ fontSize: 10.5, fontStyle: "italic", color: brand.textPrimary, lineHeight: 1.6, marginBottom: 10 }}>
            {`"${story.text}"`}
          </Text>
          <Text style={{ fontSize: 8.5, fontWeight: 700, color: brand.coral }}>
            {`— ${story.attribution}`}
          </Text>
          {story.role && (
            <Text style={{ fontSize: 7.5, color: brand.textSecondary, marginTop: 2 }}>{story.role}</Text>
          )}
        </View>
      ))}

      <PageFooter orgName={orgName} />
    </Page>
  );
}

// ─── SCALE OPPORTUNITY PAGE ───────────────────────────────────────────────────

function ScaleOpportunityPage({ data }: { data: MeasurePDFData }) {
  const orgName = data.organizationName || "Your Organization";
  const annualAtScale = data.combinedAnnualTotal;
  const realized      = data.totalRealized;
  const scaleMultiple = realized > 0
    ? `${(annualAtScale / realized).toFixed(1)}×`
    : "—";

  const hasExpansions = data.addedSettings.length > 0;
  const hasPricing    = data.pricingScenarios.length > 0;
  const bestScenario  = data.pricingScenarios.find((sc) => sc.isBestValue);

  return (
    <Page size="LETTER" style={S.page}>
      <PageHeader label="Scale Opportunity" />

      <Text style={[S.eyebrow, { color: brand.coral }]}>What Full Deployment Looks Like</Text>
      <Text style={S.sectionTitle}>From measured value to full-scale impact</Text>

      {/* Hero band */}
      <HeroBand metrics={[
        { value: fmtCurrency(annualAtScale), label: "Annual Value at Scale" },
        { value: fmtCurrency(realized),      label: "vs. Realized Today" },
        { value: scaleMultiple,              label: "Scale Multiple" },
      ]} />

      {/* Expansion settings table */}
      {hasExpansions && (
        <>
          <Text style={{ fontSize: 8, fontWeight: 700, color: brand.textSecondary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, marginTop: 6 }}>
            Expansion Settings
          </Text>
          <View style={S.tableWrap}>
            <View style={S.tableHead}>
              <Text style={[S.tableHeadCell, { flex: 2 }]}>Setting</Text>
              <Text style={[S.tableHeadCell, { flex: 1, textAlign: "right" }]}>Providers</Text>
              <Text style={[S.tableHeadCell, { flex: 1, textAlign: "right" }]}>Est. Annual Value</Text>
            </View>
            {data.addedSettings.map((setting, i) => (
              <View key={i} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                <Text style={[S.tableCell, { flex: 2 }]}>{setting.settingLabel}</Text>
                <Text style={[S.tableCell, { flex: 1, textAlign: "right" }]}>
                  {setting.isNursing
                    ? `${fmtNum(setting.staffedBeds)} beds`
                    : fmtNum(setting.providers)}
                </Text>
                <Text style={[S.tableCellBold, { flex: 1, textAlign: "right" }]}>
                  {fmtCurrency(setting.estimatedValue)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Pricing section */}
      {hasPricing && (
        <>
          <Text style={[S.eyebrow, { color: brand.coral, marginTop: 10 }]}>Investment & Return</Text>

          {data.pricingScenarios.map((sc) => {
            const isBest = sc.isBestValue;
            return (
              <View
                key={sc.label}
                style={{
                  borderRadius: 3,
                  borderWidth: isBest ? 1.5 : 1,
                  borderColor: isBest ? brand.coral : brand.midGray,
                  marginBottom: 8,
                  overflow: "hidden",
                }}
                wrap={false}
              >
                <View style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  backgroundColor: isBest ? brand.coral + "0A" : brand.lightGray,
                }}>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: 700, color: isBest ? brand.coral : brand.textPrimary }}>
                      {sc.label}
                    </Text>
                    <Text style={{ fontSize: 7.5, color: brand.textTertiary, marginTop: 1 }}>{sc.modelLabel}</Text>
                  </View>
                  {isBest && (
                    <View style={{ backgroundColor: brand.coral, borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 7, color: brand.white, fontWeight: 700, letterSpacing: 0.5 }}>
                        BEST VALUE
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: "row", backgroundColor: brand.white }}>
                  {[
                    { label: "Investment",     value: fmtCurrency(sc.investment), color: brand.textPrimary },
                    { label: "Net Annual",     value: fmtCurrency(sc.netAnnual),  color: sc.netAnnual >= 0 ? brand.positive : brand.coral },
                    { label: "ROI",            value: `${sc.roi.toFixed(1)}×`,    color: brand.textPrimary },
                  ].map(({ label, value, color: valColor }, idx, arr) => (
                    <View
                      key={label}
                      style={{
                        flex: 1,
                        padding: 10,
                        alignItems: "center",
                        borderRightWidth: idx < arr.length - 1 ? 1 : 0,
                        borderRightColor: brand.midGray,
                      }}
                    >
                      <Text style={{ fontSize: 6.5, color: brand.textTertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>
                        {label}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: 700, color: valColor }}>{value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}

          {/* Best scenario summary */}
          {bestScenario && (
            <View style={{
              backgroundColor: brand.black,
              borderRadius: 3,
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 4,
            }}>
              <View>
                <Text style={{ fontSize: 7, color: "#777777", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>
                  Recommended Scenario
                </Text>
                <Text style={{ fontSize: 10, fontWeight: 700, color: brand.white }}>
                  {bestScenario.label}
                </Text>
                <Text style={{ fontSize: 8, color: "#777777", marginTop: 2 }}>
                  {`Investment: ${fmtCurrency(bestScenario.investment)}`}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 7, color: "#777777", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>
                  Net Annual
                </Text>
                <Text style={{ fontSize: 20, fontWeight: 700, color: brand.coral }}>
                  {fmtCurrency(bestScenario.netAnnual)}
                </Text>
              </View>
            </View>
          )}
        </>
      )}

      <PageFooter orgName={orgName} />
    </Page>
  );
}

// ─── MAIN DOCUMENT ────────────────────────────────────────────────────────────

export const MeasureNarrativePDFDocument = ({ data }: { data: MeasurePDFData }) => {
  const orgName    = data.organizationName || "Your Organization";
  const monthsLive = data.monthsLive ?? 0;
  const audience   = data.audience ?? "executive";

  const showDollars     = audience !== "clinical";
  const showLoveStories = (data.loveStories?.length ?? 0) > 0;
  // Only include the Scale Opportunity page when there is real full-deployment
  // information to show — added settings or pricing scenarios. Without those it
  // was rendering an empty page at a meaningless 1.0× scale multiple.
  const showScale       = showDollars && (data.addedSettings.length > 0 || data.pricingScenarios.length > 0);
  const activeDomains   = data.quadrants.filter((q) => q.drivers.length > 0);

  const subtitle = [
    `${fmtNum(data.numberOfProviders)} providers`,
    monthsLive > 0 ? `${monthsLive} months live` : null,
    data.careSettingLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Document>
      {/* Page 1: Cover */}
      <PDFCoverPage
        reportLabel="Executive Business Review"
        title={orgName}
        subtitle={subtitle}
        preparedBy={data.preparedBy || "Abridge Partner Success"}
        disclaimerText="This document reflects actual deployment data and Abridge methodology. All figures are attribution-adjusted and conservative by design."
      />

      {/* Page 2: Executive Summary */}
      <ExecutiveSummaryPage data={data} showDollars={showDollars} />

      {/* Pages 3+: Domain pages (one per active quadrant) */}
      {activeDomains.map((section) => (
        <DomainPage
          key={section.quadrant}
          section={section}
          data={data}
          showDollars={showDollars}
        />
      ))}

      {/* Provider Voices page */}
      {showLoveStories && <ProviderVoicesPage data={data} />}

      {/* Scale Opportunity page */}
      {showScale && <ScaleOpportunityPage data={data} />}
    </Document>
  );
};

// ─── EXPORT FUNCTION ──────────────────────────────────────────────────────────

export const generateMeasureNarrativePDF = async (data: MeasurePDFData): Promise<void> => {
  const blob = await pdf(<MeasureNarrativePDFDocument data={data} />).toBlob();
  const safeOrg  = (data.organizationName || "abridge").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const safeDate = new Date().toISOString().slice(0, 10);
  await savePdfBlob(blob, `abridge-ebr-${safeOrg}-${safeDate}.pdf`);
};
