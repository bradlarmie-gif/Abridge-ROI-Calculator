import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
  Image,
  Svg,
  Rect,
  Line as SvgLine,
  G,
} from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";
import abridgeFontPath from "../../assets/fonts/abridge.otf";
import abridgeLogoRed from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import type { ReactElement } from "react";
import type { ProformaSettingSnapshot, ProformaConfig } from "./proformaTypes";
import type { ProformaSummary } from "./proformaTypes";
import { SETTING_LABELS, SETTING_UNIT_LABELS, ONSET_DELAY_MONTHS } from "./proformaTypes";
import {
  buildMonthlyCashFlows,
  groupByQuarter,
  calculateProformaSummary,
  getYearlySummary,
  getContractStartDate,
  costOffsetDisplacedAmount,
} from "@/lib/proformaCalculations";
import { EXPLORE_DRIVERS } from "@/lib/exploreDrivers";
import { physicianRetentionRates, nursingRetentionRates } from "@/lib/retentionScenarios";

// ─── FONT REGISTRATION ───────────────────────────────────────────────────────

Font.registerHyphenationCallback((word) => [word]);

Font.register({
  family: "Manrope",
  fonts: [
    { src: manropeRegular, fontWeight: 400 },
    { src: manropeBold, fontWeight: 700 },
  ],
});

Font.register({
  family: "Abridge",
  src: abridgeFontPath,
  fontWeight: 400,
});

// ─── BRAND PALETTE ───────────────────────────────────────────────────────────

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
  negative:      "#DC2626",
  amber:         "#D4930A",
  // Domain
  capacity:     "#EA2C00",
  workforce:    "#4E5A6B",
  revenue:      "#1E3A5F",
  quality:      "#888888",
  displacement: "#2D6F6B",
};

// ─── STYLES ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: "Manrope",
    fontSize: 10,
    color: brand.textPrimary,
    backgroundColor: brand.white,
  },
  contentPage: {
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
  headerMeta: {
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
  footerLeft:  { fontSize: 7.5, color: brand.textTertiary },
  footerRight: { fontSize: 7.5, fontWeight: 600, color: brand.textSecondary },

  // SECTION TYPOGRAPHY
  eyebrow: {
    fontSize: 8,
    fontWeight: 600,
    color: brand.coral,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  eyebrowGray: {
    fontSize: 8,
    fontWeight: 600,
    color: brand.textTertiary,
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
    maxWidth: 480,
  },

  // INSIGHT BOX (left coral border — same as outpatient)
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
    borderRadius: 3,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    marginBottom: 12,
  },
  heroMetric:  { flex: 1, alignItems: "center" },
  heroValue:   { fontSize: 21, fontWeight: 700, color: brand.white, marginBottom: 3 },
  heroValueGreen: { fontSize: 21, fontWeight: 700, color: "#34D399", marginBottom: 3 },
  heroLabel:   { fontSize: 6.5, color: "#777777", textTransform: "uppercase", letterSpacing: 1.2 },
  heroDivider: { width: 1, backgroundColor: "#2D2D2D" },

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
  tableRowLast: { borderBottomWidth: 0 },
  tableRowSubtle: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
    backgroundColor: brand.warmGray,
  },
  tableRowTotal: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: brand.borderGray,
    backgroundColor: brand.lightGray,
  },
  tableCell:     { fontSize: 8.5, color: brand.textPrimary },
  tableCellBold: { fontSize: 8.5, fontWeight: 600, color: brand.textPrimary },
  tableCellMono: { fontSize: 8,   color: brand.textSecondary },
  tableCellRed:  { fontSize: 8.5, fontWeight: 600, color: brand.negative },
  tableCellGreen:{ fontSize: 8.5, fontWeight: 600, color: brand.positive },

  // DOMAIN PILL
  domainPill: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  domainPillText: {
    fontSize: 6,
    fontWeight: 600,
    color: brand.white,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // DOMAIN TILES
  domainTiles: { flexDirection: "row", gap: 6, marginBottom: 10 },
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
    marginBottom: 1,
  },
  domainTilePct:  { fontSize: 7, color: brand.textTertiary, marginBottom: 4 },
  domainTileNote: { fontSize: 7, color: brand.textSecondary, lineHeight: 1.4 },

  // MILESTONE CARDS (expansion ramp)
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
  milestoneCardFinal: {
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
    marginBottom: 4,
  },
  milestoneYear: {
    fontSize: 13,
    fontFamily: "Abridge",
    color: brand.textPrimary,
    marginBottom: 8,
  },
  milestoneMetricLabel: { fontSize: 7, color: brand.textTertiary, marginBottom: 1 },
  milestoneMetricValue: { fontSize: 9, fontWeight: 700, color: brand.textPrimary, marginBottom: 5 },
  milestoneValueLabel: { fontSize: 7, color: brand.textTertiary, marginTop: 6, marginBottom: 1 },
  milestoneValue: { fontSize: 14, fontWeight: 700, color: brand.textPrimary },
  milestoneValueFinal: { fontSize: 14, fontWeight: 700, color: brand.coral },

  // ONSET TIMELINE
  onsetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  onsetRowLast: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  onsetLabel:  { fontSize: 8, fontWeight: 600, color: brand.textPrimary, width: 72 },
  onsetNote:   { fontSize: 7.5, color: brand.textSecondary, flex: 1, lineHeight: 1.4, paddingLeft: 10 },

  // DIVIDER
  divider:      { borderBottomWidth: 1, borderBottomColor: brand.midGray, marginVertical: 12 },
  dividerThick: { borderBottomWidth: 2, borderBottomColor: brand.borderGray, marginVertical: 12 },

  // TWO-COLUMN
  twoCols:   { flexDirection: "row", gap: 10, marginBottom: 10 },
  colLeft:   { flex: 1 },
  colRight:  { flex: 1 },

  // CONFIDENCE CARD
  confidenceCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: brand.midGray,
    padding: 12,
  },
  confidenceTitle: {
    fontSize: 8,
    fontWeight: 600,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  confidenceItem: {
    fontSize: 8.5,
    color: brand.textSecondary,
    lineHeight: 1.6,
    marginBottom: 2,
  },
});

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const TOTAL_PDF_PAGES = 7;

const DOMAIN_COLORS: Record<string, string> = {
  Capacity:          brand.capacity,
  Workforce:         brand.workforce,
  Revenue:           brand.revenue,
  Quality:           brand.quality,
  "Cost Displacement": brand.displacement,
};

const DOMAIN_NORTH_STARS: Record<string, string> = {
  Capacity:            "More patients served with current staff  ↑",
  Workforce:           "Lower voluntary turnover and burnout-driven attrition  ↓",
  Revenue:             "Coding accuracy and claim integrity improvements  ↑",
  Quality:             "Fewer adverse events and documentation deficiencies  ↓",
  "Cost Displacement": "Legacy tool spend converted to investment capacity  ↓",
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtNum(n: number): string { return Math.round(n).toLocaleString(); }

function fmtAxis(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

function contractTermLabel(months: number): string {
  return `${months / 12}-Year`;
}

function unitLabel(careSetting: string): string {
  return SETTING_UNIT_LABELS[careSetting] || "Providers";
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function PageHeader({ label }: { label: string }) {
  return (
    <View style={S.pageHeader}>
      <Image src={abridgeLogoRed} style={S.headerLogo} />
      <Text style={S.headerMeta}>{label}</Text>
    </View>
  );
}

function PageFooter({ pageNum, preparedBy, totalPDFPages: tp }: { pageNum: number; preparedBy?: string; totalPDFPages?: number }) {
  const total = tp ?? TOTAL_PDF_PAGES;
  return (
    <View style={S.footer}>
      <Text style={S.footerLeft}>{preparedBy ? `Prepared by ${preparedBy}` : "Abridge Financial Proforma"}</Text>
      <Text style={S.footerRight}>Page {pageNum} of {total}</Text>
    </View>
  );
}

function DomainPill({ domain }: { domain: string }) {
  const color = DOMAIN_COLORS[domain] ?? brand.black;
  return (
    <View style={[S.domainPill, { backgroundColor: color }]}>
      <Text style={S.domainPillText}>{domain}</Text>
    </View>
  );
}

// ─── CHART ────────────────────────────────────────────────────────────────────

interface ChartBar {
  label: string;
  capacityValue:     number;
  workforceValue:    number;
  revenueValue:      number;
  qualityValue:      number;
  displacementValue: number;
  investment:        number;
  total:             number;
}

function PDFValueChart({ data, paybackQuarter }: { data: ChartBar[]; paybackQuarter: string | null }) {
  const svgW = 430;
  const svgH = 160;
  const barCount = data.length || 1;
  const groupW = svgW / barCount;
  const barW = Math.min(groupW * 0.58, 24);
  const barGap = (groupW - barW) / 2;

  const maxVal = Math.max(...data.map(d => d.total), ...data.map(d => d.investment), 1);
  const niceMax = (() => {
    const mag = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const norm = maxVal / mag;
    if (norm <= 1) return mag;
    if (norm <= 2) return 2 * mag;
    if (norm <= 5) return 5 * mag;
    return 10 * mag;
  })();

  const ticks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];
  const scaleY = (v: number) => svgH - (v / niceMax) * svgH;

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: 44, justifyContent: "space-between", paddingRight: 4, height: svgH }}>
          {[...ticks].reverse().map((tick, i) => (
            <Text key={`yt-${i}`} style={{ fontSize: 6, color: brand.textTertiary, textAlign: "right" }}>
              {fmtAxis(tick)}
            </Text>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
            {ticks.map((tick, i) => (
              <SvgLine key={`gl-${i}`} x1={0} y1={scaleY(tick)} x2={svgW} y2={scaleY(tick)}
                stroke={brand.midGray} strokeWidth={0.5} strokeDasharray={i === 0 ? undefined : "3 2"} />
            ))}
            {data.map((bar, i) => {
              const x = i * groupW + barGap;
              const qualH = (bar.qualityValue      / niceMax) * svgH;
              const workH = (bar.workforceValue    / niceMax) * svgH;
              const revH  = (bar.revenueValue      / niceMax) * svgH;
              const capH  = (bar.capacityValue     / niceMax) * svgH;
              const dispH = (bar.displacementValue / niceMax) * svgH;
              const qualY = scaleY(bar.qualityValue);
              const workY = scaleY(bar.qualityValue + bar.workforceValue);
              const revY  = scaleY(bar.qualityValue + bar.workforceValue + bar.revenueValue);
              const capY  = scaleY(bar.qualityValue + bar.workforceValue + bar.revenueValue + bar.capacityValue);
              const dispY = scaleY(bar.qualityValue + bar.workforceValue + bar.revenueValue + bar.capacityValue + bar.displacementValue);
              const invH  = (bar.investment / niceMax) * svgH;
              const invY  = scaleY(bar.investment);
              const invBarW = Math.max(barW * 0.2, 3);
              return (
                <G key={`bar-${i}`}>
                  {qualH > 0.5 && <Rect x={x} y={qualY}  width={barW} height={qualH} fill={brand.quality}      fillOpacity={0.65} rx={1} />}
                  {workH > 0.5 && <Rect x={x} y={workY}  width={barW} height={workH} fill={brand.workforce}    fillOpacity={0.72} />}
                  {revH  > 0.5 && <Rect x={x} y={revY}   width={barW} height={revH}  fill={brand.revenue}      fillOpacity={0.72} />}
                  {capH  > 0.5 && <Rect x={x} y={capY}   width={barW} height={capH}  fill={brand.capacity}     fillOpacity={0.80} />}
                  {dispH > 0.5 && <Rect x={x} y={dispY}  width={barW} height={dispH} fill={brand.displacement} fillOpacity={0.80} rx={1} />}
                  {invH  > 0.5 && (
                    <>
                      <Rect x={x + barW + 2} y={invY} width={invBarW} height={invH} fill="#6B7280" fillOpacity={0.3} rx={1} />
                      <SvgLine x1={x + barW + 2} y1={invY} x2={x + barW + 2 + invBarW} y2={invY} stroke="#6B7280" strokeWidth={0.8} />
                    </>
                  )}
                </G>
              );
            })}
            {paybackQuarter && (() => {
              const idx = data.findIndex(d => d.label === paybackQuarter);
              if (idx < 0) return null;
              const x = idx * groupW + barGap + barW / 2;
              return <SvgLine x1={x} y1={0} x2={x} y2={svgH} stroke={brand.amber} strokeWidth={0.8} strokeDasharray="4 2" />;
            })()}
            <SvgLine x1={0} y1={svgH} x2={svgW} y2={svgH} stroke={brand.borderGray} strokeWidth={1} />
          </Svg>
        </View>
      </View>

      {/* X-axis labels */}
      <View style={{ flexDirection: "row", paddingLeft: 44 }}>
        {data.map((bar, i) => (
          <View key={`xl-${i}`} style={{ width: svgW / barCount, alignItems: "center", paddingTop: 2 }}>
            <Text style={{ fontSize: 5.5, color: brand.textTertiary }}>{bar.label}</Text>
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 8, paddingLeft: 44 }}>
        {[
          { color: brand.capacity,  label: "Capacity" },
          { color: brand.workforce, label: "Workforce" },
          { color: brand.revenue,   label: "Revenue" },
          { color: brand.quality,   label: "Quality" },
        ].map(({ color, label }) => (
          <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 5, backgroundColor: color, borderRadius: 1 }} />
            <Text style={{ fontSize: 7, color: brand.textSecondary }}>{label}</Text>
          </View>
        ))}
        {data.some(d => d.displacementValue > 0) && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 5, backgroundColor: brand.displacement, borderRadius: 1 }} />
            <Text style={{ fontSize: 7, color: brand.textSecondary }}>Cost Displacement</Text>
          </View>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 8, height: 5, backgroundColor: "#6B7280", opacity: 0.4, borderRadius: 1 }} />
          <Text style={{ fontSize: 7, color: brand.textSecondary }}>Investment</Text>
        </View>
        {paybackQuarter && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 0, borderTopWidth: 1, borderTopColor: brand.amber, borderStyle: "dashed" }} />
            <Text style={{ fontSize: 7, color: brand.textSecondary }}>Payback</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── INTERFACES ───────────────────────────────────────────────────────────────

interface SensitivityScenario {
  vtc: number;
  simpleROI: number;
  paybackMonth: number | null;
  termNet: number;
}

interface ProformaSensitivityData {
  conservative: SensitivityScenario;
  optimistic: SensitivityScenario;
}

interface ProformaPDFProps {
  settings: ProformaSettingSnapshot[];
  config: ProformaConfig;
  summary: ProformaSummary;
  yearlyData: ReturnType<typeof getYearlySummary>;
  sensitivityData: ProformaSensitivityData;
  organizationName?: string;
  preparedBy?: string;
  totalPDFPages?: number;
}

// ─── PAGE 2: THE INVESTMENT CASE ──────────────────────────────────────────────

function InvestmentCasePage({ settings, config, summary, yearlyData, preparedBy, totalPDFPages }: ProformaPDFProps) {
  const termLabel     = contractTermLabel(config.contractTermMonths);
  const contractYears = Math.ceil(config.contractTermMonths / 12);
  const hasInvestment = summary.termInvestment > 0;
  // The terminal ("full scale") year is the LAST year of the contract, not always
  // Y3. Data only carries year1/2/3, so cap at 3. This mirrors the calc engine,
  // which uses year2 for a sub-36-month term. A 2-year model reads Y2, not Y3.
  const fullScaleYearNum = Math.min(contractYears, 3);
  const fullScaleYearLabel = `Y${fullScaleYearNum}`;
  const pickTermYear = (o?: { year1?: number; year2?: number; year3?: number }): number | undefined =>
    !o ? undefined : contractYears >= 3 ? o.year3 : contractYears >= 2 ? o.year2 : o.year1;

  const totalCapacity  = settings.reduce((s, x) => s + x.drivers.filter(d => d.quadrant === "Capacity"  && d.value > 0).reduce((a, d) => a + d.value, 0), 0);
  const totalWorkforce = settings.reduce((s, x) => s + x.drivers.filter(d => d.quadrant === "Workforce" && d.value > 0).reduce((a, d) => a + d.value, 0), 0);
  const totalRevenue   = settings.reduce((s, x) => s + x.drivers.filter(d => d.quadrant === "Revenue"   && d.value > 0).reduce((a, d) => a + d.value, 0), 0);
  const totalQuality   = settings.reduce((s, x) => s + x.drivers.filter(d => d.quadrant === "Quality"   && d.value > 0).reduce((a, d) => a + d.value, 0), 0);
  const driverTotal    = totalCapacity + totalWorkforce + totalRevenue + totalQuality;

  const totalDisplacement = yearlyData.reduce((s, y) => s + y.displacementValue, 0);
  const grandTotal = driverTotal + totalDisplacement;
  const pct = (v: number) => grandTotal > 0 ? Math.round((v / grandTotal) * 100) : 0;
  const activeDomains = [
    { domain: "Capacity",          total: totalCapacity,     p: pct(totalCapacity)     },
    { domain: "Workforce",         total: totalWorkforce,    p: pct(totalWorkforce)    },
    { domain: "Revenue",           total: totalRevenue,      p: pct(totalRevenue)      },
    { domain: "Quality",           total: totalQuality,      p: pct(totalQuality)      },
    { domain: "Cost Displacement", total: totalDisplacement, p: pct(totalDisplacement) },
  ].filter(d => d.total > 0);

  // ── INVESTMENT THESIS ────────────────────────────────────────────────────────
  const sortedDomains = [...activeDomains].sort((a, b) => b.total - a.total);
  const topDomain = sortedDomains[0];

  // Top driver across all settings
  const topDriver = settings
    .flatMap(s => s.drivers.filter(d => d.value > 0))
    .sort((a, b) => b.value - a.value)[0];

  const isBanked = settings.some(s => s.bankedEncounters && (s.pricingModel === "platform" || s.pricingModel === "perEncounter"));
  const allPerEnc    = settings.every(s => s.pricingModel === "perEncounter");
  const totalFullScale = settings.reduce((s, v) => s + (v.fullScaleProviders || v.providerCount), 0);
  const totalFullScaleEnc = settings.reduce((s, v) => {
    const ye = v.yearlyEncounters;
    if (!ye) return s + (v.encounters || 0);
    return s + (contractYears >= 3 ? ye.year3 : contractYears >= 2 ? ye.year2 : ye.year1);
  }, 0);
  const scaleDesc = allPerEnc
    ? `${fmtNum(totalFullScaleEnc)} contracted encounters`
    : `${fmtNum(totalFullScale)} ${Array.from(new Set(settings.map(s => unitLabel(s.careSetting)))).join(" and ")}`;

  let thesis: string;

  if (settings.length === 1) {
    const s0     = settings[0];
    const sName  = SETTING_LABELS[s0.careSetting] || s0.label;
    const scale  = allPerEnc
      ? `${fmtNum(totalFullScaleEnc)} encounters`
      : `${fmtNum(totalFullScale)} ${unitLabel(s0.careSetting).toLowerCase()}`;

    // Lead with dominant domain if it's ≥45% of total; otherwise lead with breadth
    if (topDomain && topDomain.p >= 45) {
      const secondDomains = sortedDomains.slice(1).map(d => `${d.domain.toLowerCase()} (${fmt(d.total)})`).join(", ");
      thesis = `The leading driver is ${topDomain.domain.toLowerCase()} — ${fmt(topDomain.total)}/yr, ${topDomain.p}% of total — with ${topDriver ? `${topDriver.name.toLowerCase()} as the primary mechanism` : "multiple sub-drivers"}. ${secondDomains.length > 0 ? `The remaining value comes from ${secondDomains}.` : ""} Against ${fmt(summary.termInvestment)} invested across ${scale} in ${sName}, the model yields ${fmt(summary.runRateValue)}/yr at full maturity${summary.paybackMonth ? ` and pays back at month ${summary.paybackMonth}` : ""}. Conservative adoption assumptions hold full costs from day one while value scales gradually.`;
    } else {
      const allDomainStr = sortedDomains.map(d => `${d.domain.toLowerCase()} (${fmt(d.total)})`).join(", ");
      thesis = `Value is distributed across ${activeDomains.length} independent domains — ${allDomainStr} — so no single mechanism carries the entire case. The top driver, ${topDriver ? `${topDriver.name.toLowerCase()} at ${fmt(topDriver.value)}/yr` : fmt(summary.runRateValue)}, is auditable against operational records. Against ${fmt(summary.termInvestment)} invested across ${scale}, this projects ${fmt(summary.runRateValue)}/yr at maturity${summary.paybackMonth ? ` with payback at month ${summary.paybackMonth}` : ""}.`;
    }
  } else {
    // Multi-setting: lead with structural independence, name each setting's top driver
    const settingDescriptions = [...settings]
      .sort((a, b) => b.annualValue - a.annualValue)
      .map(s => {
        const topD = [...s.drivers].filter(d => d.value > 0).sort((a, b) => b.value - a.value)[0];
        const driverNote = topD ? `, led by ${topD.name.toLowerCase()}` : '';
        return `${SETTING_LABELS[s.careSetting] || s.label} (${fmt(s.annualValue)}/yr${driverNote})`;
      })
      .join('; ');
    const multiScaleDesc = allPerEnc
      ? `${fmtNum(totalFullScaleEnc)} contracted encounters`
      : `${fmtNum(totalFullScale)} providers`;
    thesis = `${settings.length} structurally independent value sources: ${settingDescriptions}. Each draws from distinct clinical workflows and operational levers — if one setting ramps slower than projected, the others hold. At maturity, ${fmt(summary.runRateValue)}/yr runs across ${multiScaleDesc} against ${fmt(summary.termInvestment)} invested${summary.paybackMonth ? `, with payback at month ${summary.paybackMonth}` : ''}.`;
  }

  return (
    <Page size="LETTER" style={[S.page, S.contentPage]} wrap={false}>
      <PageHeader label="The Investment Case" />

      <Text style={S.eyebrow}>Business Case Summary</Text>
      <Text style={S.sectionTitle}>
        {hasInvestment && summary.valueToCost > 1
          ? `A ${summary.valueToCost.toFixed(1)}x Return${summary.paybackMonth ? `, Paying Back at Month ${summary.paybackMonth}` : ""}`
          : `${termLabel} Value Projection`}
      </Text>

      {/* HERO BAND */}
      <View style={S.heroBand}>
        <View style={S.heroMetric}>
          <Text style={summary.termNet >= 0 ? { ...S.heroValue, color: "#34D399" } : { ...S.heroValue, color: "#F87171" }}>
            {fmt(summary.termNet)}
          </Text>
          <Text style={S.heroLabel}>{termLabel} Net Value</Text>
        </View>
        <View style={S.heroDivider} />
        <View style={S.heroMetric}>
          <Text style={S.heroValue}>{hasInvestment ? `${summary.valueToCost.toFixed(1)}x` : "—"}</Text>
          <Text style={S.heroLabel}>Value-to-Cost</Text>
        </View>
        <View style={S.heroDivider} />
        <View style={S.heroMetric}>
          <Text style={S.heroValue}>{summary.paybackMonth ? `M${summary.paybackMonth}` : "—"}</Text>
          <Text style={S.heroLabel}>Payback Month</Text>
        </View>
        <View style={S.heroDivider} />
        <View style={S.heroMetric}>
          <Text style={S.heroValue}>{fmt(summary.runRateValue)}</Text>
          <Text style={S.heroLabel}>Annual Run-Rate</Text>
        </View>
      </View>

      {/* THESIS */}
      <View style={S.insightBox}>
        <Text style={S.insightLabel}>Investment Thesis</Text>
        <Text style={S.insightText}>{thesis}</Text>
      </View>

      {/* VALUE BY DOMAIN */}
      <Text style={[S.eyebrowGray, { marginTop: 4 }]}>Value by Domain</Text>
      <View style={S.domainTiles}>
        {activeDomains.map(({ domain, total, p }) => {
          const color  = DOMAIN_COLORS[domain] ?? brand.black;
          const barFill = Math.max(Math.round((p / 100) * 100), p > 0 ? 4 : 0);
          return (
            <View key={domain} style={S.domainTile}>
              <DomainPill domain={domain} />
              <Text style={S.domainTileValue}>{fmt(total)}</Text>
              <Text style={S.domainTilePct}>{p}% of value</Text>
              <View style={{ marginBottom: 5 }}>
                <Svg width={100} height={4}>
                  <Rect x={0} y={0} width={100} height={4} fill={brand.midGray} rx={2} />
                  {barFill > 0 && <Rect x={0} y={0} width={barFill} height={4} fill={color} rx={2} />}
                </Svg>
              </View>
              <Text style={S.domainTileNote}>{DOMAIN_NORTH_STARS[domain]}</Text>
            </View>
          );
        })}
      </View>

      {/* PER-SETTING TABLE */}
      {settings.length > 0 && (
        <>
          <Text style={[S.eyebrowGray, { marginTop: 2 }]}>
            {settings.length === 1 ? "Deployment Scale" : "By Care Setting"}
          </Text>
          <View style={S.tableWrap}>
            <View style={S.tableHead}>
              <Text style={[S.tableHeadCell, { flex: 3 }]}>Setting</Text>
              <Text style={[S.tableHeadCell, { flex: 3 }]}>Full Scale ({fullScaleYearLabel})</Text>
              <Text style={[S.tableHeadCell, { flex: 2, textAlign: "right" }]}>{isBanked ? "Y1 Investment *" : "Y1 Investment"}</Text>
              <Text style={[S.tableHeadCell, { flex: 2, textAlign: "right" }]}>Run-Rate Value</Text>
            </View>
            {settings.map((s, si) => {
              const sc     = s.color || brand.coral;
              const isPerEnc = s.pricingModel === "perEncounter";
              const isPlatform = s.pricingModel === "platform";
              const ye     = s.yearlyEncounters;
              const yp     = s.yearlyProviders;
              const yr1TotalEnc = ye?.year1 ?? s.encounters ?? 0;
              const yr1Util = (s.yearlyUtilization?.year1 ?? s.utilizationPercent ?? 100) / 100;
              const yr1AbridgeEnc = Math.round(yr1TotalEnc * yr1Util);
              const yr1inv = s.pricingModel === "annualFlat"
                ? (s.yearlyPricing?.year1 ?? s.annualLicenseFee ?? 0)
                : isPerEnc
                // Banked perEnc: Y1 has no encounter billing (consumption billed in Y2)
                ? s.bankedEncounters ? 0 : (s.yearlyPricing?.year1 ?? s.costPerEncounter ?? 0) * yr1AbridgeEnc
                : isPlatform
                // Banked: Y1 is platform fee only — encounter billing starts in Y2
                ? (s.annualLicenseFee ?? 0) + (s.bankedEncounters ? 0 : (s.platformEncRate ?? s.costPerEncounter ?? 0) * yr1AbridgeEnc)
                : (s.yearlyPricing?.year1 ?? s.costPerUnit) * (yp?.year1 ?? s.providerCount) * 12;
              const encUnit = s.careSetting === "inpatient" ? "dc/yr" : "enc/yr";
              // Full-scale = the contract's terminal year (Y2 for a 2-year model), not a hardcoded Y3.
              const termEnc = pickTermYear(ye) ?? 0;
              const termUtil = (pickTermYear(s.yearlyUtilization) ?? s.utilizationPercent ?? 100) / 100;
              const termAbridgeEnc = Math.round(termEnc * termUtil);
              const termProviders = pickTermYear(yp) ?? s.fullScaleProviders ?? s.providerCount;
              const scaleText = (isPerEnc || isPlatform) && termAbridgeEnc > 0
                ? `${fmtNum(termAbridgeEnc)} ${encUnit}`
                : `${fmtNum(termProviders)} ${unitLabel(s.careSetting).toLowerCase()}`;
              return (
                <View key={s.id} style={[S.tableRow, si === settings.length - 1 ? S.tableRowLast : {}]}>
                  <View style={{ flex: 3, flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ width: 3, height: 14, backgroundColor: sc, borderRadius: 1 }} />
                    <Text style={S.tableCellBold}>{s.label}</Text>
                  </View>
                  <Text style={[S.tableCellMono, { flex: 3 }]}>{scaleText}</Text>
                  {/* No per-setting cost (e.g. covered by the system-wide fee) → "—" not "$0". */}
                  <Text style={[S.tableCell, { flex: 2, textAlign: "right" }]}>{yr1inv > 0 ? fmt(yr1inv) : "—"}</Text>
                  <Text style={[S.tableCellBold, { flex: 2, textAlign: "right", color: sc }]}>{fmt(s.annualValue)}</Text>
                </View>
              );
            })}
          </View>
          {(config.systemWideFee ?? 0) > 0 && (
            <View style={[S.tableRow, S.tableRowLast, { marginTop: 4, borderTopWidth: 1, borderTopColor: brand.midGray }]}>
              <View style={{ flex: 3, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 3, height: 14, backgroundColor: brand.midGray, borderRadius: 1 }} />
                <Text style={S.tableCellBold}>System-wide Platform Fee</Text>
              </View>
              <Text style={[S.tableCellMono, { flex: 3 }]}>All settings</Text>
              <Text style={[S.tableCell, { flex: 2, textAlign: "right" }]}>{fmt(config.systemWideFee ?? 0)}</Text>
              <Text style={[S.tableCell, { flex: 2, textAlign: "right" }]}>—</Text>
            </View>
          )}
          {isBanked && (
            <Text style={{ fontSize: 7, color: brand.textSecondary, marginTop: 6, paddingHorizontal: 2 }}>
              * Banked Encounter: Encounter consumption is billed in arrears beginning Year 2. Y1 reflects upfront license fees only; settings with no license fee show $0.
            </Text>
          )}
        </>
      )}

      <PageFooter pageNum={2} preparedBy={preparedBy} totalPDFPages={totalPDFPages} />
    </Page>
  );
}

// ─── PAGE 3: VALUE TRAJECTORY ────────────────────────────────────────────────

function ValueTrajectoryPage({ settings, config, summary, yearlyData, chartData, paybackQuarter, preparedBy, totalPDFPages }: ProformaPDFProps & { chartData: ChartBar[]; paybackQuarter: string | null }) {
  const contractYears = Math.ceil(config.contractTermMonths / 12);
  const allPerEnc     = settings.every(s => s.pricingModel === "perEncounter");
  const delayedOnset  = ONSET_DELAY_MONTHS.delayed;

  // Build up to 3 milestone snapshots
  const milestones: { yearIdx: number; stage: string; label: string }[] = [];
  if (contractYears === 1) {
    milestones.push({ yearIdx: 0, stage: "End of Year", label: "Year 1" });
  } else if (contractYears === 2) {
    milestones.push({ yearIdx: 0, stage: "Foundation", label: "Year 1" });
    milestones.push({ yearIdx: 1, stage: "Maturity",   label: "Year 2" });
  } else {
    milestones.push({ yearIdx: 0, stage: "Foundation", label: "Year 1" });
    milestones.push({ yearIdx: 1, stage: "Scaling",    label: "Year 2" });
    milestones.push({ yearIdx: contractYears - 1, stage: "Maturity", label: `Year ${contractYears}` });
  }

  function getMilestoneScale(yearIdx: number): string {
    const yearKey = (["year1", "year2", "year3"] as const)[Math.min(yearIdx, 2)];
    const totalProviders = settings.reduce((sum, s) => {
      const yp = s.yearlyProviders;
      const count = yp ? yp[yearKey] : (yearKey === "year1" ? s.providerCount : s.fullScaleProviders ?? s.providerCount);
      return sum + count;
    }, 0);
    const singleUnit = settings.length === 1 ? unitLabel(settings[0].careSetting).toLowerCase() : "providers";
    return `${fmtNum(totalProviders)} ${singleUnit}`;
  }
  function getMilestoneActivity(yearIdx: number): { enc: number; dc: number } {
    const yearKey = (["year1", "year2", "year3"] as const)[Math.min(yearIdx, 2)];
    let encTotal = 0;
    let dcTotal = 0;
    for (const s of settings) {
      const totalEnc = s.yearlyEncounters ? s.yearlyEncounters[yearKey] : s.encounters;
      const utilSrc = s.yearlyUtilization
        ?? (s.careSetting === "nursing" && config.nursingYearlyUtilization
          ? config.nursingYearlyUtilization : config.yearlyUtilization);
      const abridge = Math.round(totalEnc * utilSrc[yearKey] / 100);
      if (s.careSetting === "inpatient") {
        dcTotal += abridge;
      } else {
        encTotal += abridge;
      }
    }
    return { enc: encTotal, dc: dcTotal };
  }

  // Onset rows
  const hasWorkforce = yearlyData.some(y => y.workforceValue > 0);
  const hasCapacity  = yearlyData.some(y => y.capacityValue  > 0);
  const hasRevenue   = yearlyData.some(y => y.revenueValue   > 0);
  const hasQuality   = yearlyData.some(y => y.qualityValue   > 0);
  const hasNursing   = settings.some(s => s.careSetting === "nursing");
  const hasHcc       = settings.some(s => s.drivers?.some((d: { id: string }) => d.id === "hcc"));

  const onsetRows = [
    hasRevenue   && { domain: "Revenue",   color: brand.revenue,   label: "Revenue",   note: `Modeled from Month 1, ramping over an initial adoption period.${hasHcc ? " HCC/RAF value projected beginning Year 2, reflecting typical reconciliation timelines." : ""}`, inactiveFrac: 1/config.contractTermMonths },
    hasCapacity  && { domain: "Capacity",  color: brand.capacity,  label: "Capacity",  note: `Projected beginning Month ${delayedOnset}, reflecting a conservative adoption ramp as clinical workflows adjust.`, inactiveFrac: delayedOnset / config.contractTermMonths },
    hasQuality   && { domain: "Quality",   color: brand.quality,   label: "Quality",   note: `Projected beginning Month ${delayedOnset}${hasNursing ? "–5" : ""}, modeled conservatively to allow time for documentation patterns to stabilize.`, inactiveFrac: delayedOnset / config.contractTermMonths },
    hasWorkforce && { domain: "Workforce", color: brand.workforce, label: "Workforce", note: `Phased over ${contractYears >= 3 ? "3 years" : "the contract term"} — ${config.retentionPhasing.year1Pct}% Y1 / ${config.retentionPhasing.year2Pct}% Y2${contractYears >= 3 ? ` / ${config.retentionPhasing.year3Pct}% Y3` : ""}. Retention and wellbeing effects are projected to compound over time.`, inactiveFrac: 0.15 },
  ].filter(Boolean) as { domain: string; color: string; label: string; note: string; inactiveFrac: number }[];

  return (
    <Page size="LETTER" style={[S.page, S.contentPage]} wrap={false}>
      <PageHeader label="Value Trajectory" />

      <Text style={S.eyebrow}>Financial Trajectory</Text>
      <Text style={S.sectionTitle}>How Value Builds</Text>
      <Text style={S.sectionIntro}>
        Value doesn't arrive on day one. It compounds as providers onboard, utilization deepens, and each domain switches on at its natural pace. The chart reflects your actual deployment path — conservatively modeled.
      </Text>

      {/* CHART */}
      <PDFValueChart data={chartData} paybackQuarter={paybackQuarter} />

      <View style={S.divider} />

      {/* EXPANSION RAMP — milestone cards */}
      <Text style={[S.eyebrowGray, { marginBottom: 8 }]}>Deployment Milestones</Text>
      <View style={S.milestoneRow}>
        {milestones.map((m, idx) => {
          const y      = yearlyData[m.yearIdx] ?? yearlyData[yearlyData.length - 1];
          const isFinal = idx === milestones.length - 1;
          const cardStyle = isFinal ? S.milestoneCardFinal : S.milestoneCard;
          return (
            <View key={m.label} style={[cardStyle, idx < milestones.length - 1 ? { marginRight: 6 } : {}]}>
              <Text style={S.milestoneStage}>{m.stage}</Text>
              <Text style={S.milestoneYear}>{m.label}</Text>
              <Text style={S.milestoneMetricLabel}>Full Scale</Text>
              <Text style={S.milestoneMetricValue}>{getMilestoneScale(m.yearIdx)}</Text>
              {(() => {
                const { enc, dc } = getMilestoneActivity(m.yearIdx);
                return (
                  <>
                    {enc > 0 && (
                      <>
                        <Text style={S.milestoneMetricLabel}>Abridge encounters</Text>
                        <Text style={S.milestoneMetricValue}>{fmtNum(enc)} encounters</Text>
                      </>
                    )}
                    {dc > 0 && (
                      <>
                        <Text style={S.milestoneMetricLabel}>Abridge discharges</Text>
                        <Text style={S.milestoneMetricValue}>{fmtNum(dc)} discharges</Text>
                      </>
                    )}
                  </>
                );
              })()}
              <Text style={S.milestoneValueLabel}>Projected Value</Text>
              <Text style={isFinal ? S.milestoneValueFinal : S.milestoneValue}>{fmt(y.totalValue)}</Text>
            </View>
          );
        })}
      </View>

      {/* DOMAIN ONSET TABLE */}
      <Text style={[S.eyebrowGray, { marginBottom: 6 }]}>Value Onset Assumptions</Text>
      <View style={S.tableWrap}>
        {onsetRows.map((row, i) => (
          <View key={row.domain} style={[
            { flexDirection: "row", alignItems: "flex-start", paddingVertical: 7, paddingHorizontal: 10 },
            i < onsetRows.length - 1 ? { borderBottomWidth: 1, borderBottomColor: brand.midGray } : {},
          ]}>
            <View style={{ width: 72, paddingTop: 1 }}>
              <DomainPill domain={row.domain} />
            </View>
            <Text style={{ fontSize: 8.5, color: brand.textSecondary, flex: 1, lineHeight: 1.5 }}>
              {row.note}
            </Text>
          </View>
        ))}
      </View>

      <PageFooter pageNum={3} preparedBy={preparedBy} totalPDFPages={totalPDFPages} />
    </Page>
  );
}

// ─── PAGE 4: FINANCIAL SUMMARY + SENSITIVITY ─────────────────────────────────

function FinancialSummaryPage({ settings, config, summary, yearlyData, sensitivityData, preparedBy, totalPDFPages }: ProformaPDFProps) {
  const termLabel     = contractTermLabel(config.contractTermMonths);
  const contractYears = Math.ceil(config.contractTermMonths / 12);
  const hasInvestment = summary.termInvestment > 0;

  // Totals across all years
  const totalCapVal  = yearlyData.reduce((s, y) => s + y.capacityValue,     0);
  const totalWorkVal = yearlyData.reduce((s, y) => s + y.workforceValue,    0);
  const totalRevVal  = yearlyData.reduce((s, y) => s + y.revenueValue,      0);
  const totalQualVal = yearlyData.reduce((s, y) => s + y.qualityValue,      0);
  const totalDispVal = yearlyData.reduce((s, y) => s + y.displacementValue, 0);

  // Named cost-reduction items, flattened across settings. Each shows its annual
  // displaced amount (annualSpend × displacement%) — what flows into the
  // "Cost Displacement" line above. The multi-setting label disambiguates.
  const isMultiSetting = settings.length > 1;
  const costOffsetItems = settings.flatMap(s =>
    (s.costOffsets ?? [])
      .filter(o => o.annualSpend > 0 && o.displacementPct > 0)
      .map(o => ({
        id: o.id,
        name: (o.label || "").trim() || "Cost reduction",
        settingLabel: isMultiSetting ? (s.label || "") : "",
        displaced: costOffsetDisplacedAmount(o),
      }))
  );
  const costOffsetTotal = costOffsetItems.reduce((sum, i) => sum + i.displaced, 0);

  const isBanked = settings.some(s => s.bankedEncounters && (s.pricingModel === "platform" || s.pricingModel === "perEncounter"));

  // Cell font scales down for longer contracts
  const cellFontSize = contractYears <= 3 ? 8.5 : contractYears <= 4 ? 8 : 7.5;
  const labelFlex = 3;
  const yearFlex  = 1;

  const colFmt = (n: number) => fmt(n);
  const negFmt = (n: number) => n < 0 ? `(${fmt(Math.abs(n))})` : fmt(n);

  const conservFloor = sensitivityData.conservative.termNet;
  const conservROI = hasInvestment ? conservFloor / summary.termInvestment : 0;
  const conservPayback = sensitivityData.conservative.paybackMonth;

  let floorMsg: string;
  let floorLabel: string;
  if (!hasInvestment) {
    floorLabel = "Reading the Range";
    floorMsg = `No investment is modeled against this value, so the conservative floor represents pure upside — ${fmt(conservFloor)} in realized value at 70% realization across all domains.`;
  } else if (conservFloor < 0) {
    floorLabel = "Risk Assessment";
    const shortfall = fmt(Math.abs(conservFloor));
    floorMsg = `At 70% realization, this model runs ${shortfall} in the red — investment is not fully recovered in the downside case. The primary levers are provider adoption rate and capacity conversion timing. Revisit utilization assumptions and the implementation timeline before finalizing commitments.`;
  } else if (conservROI < 0.04) {
    floorLabel = "Reading the Range";
    floorMsg = `At 70% realization, the floor is ${fmt(conservFloor)} net — investment is recovered${conservPayback ? ` at month ${conservPayback}` : ""}. The base case at ${fmt(summary.termNet)} reflects the model's central projection under conservative adoption assumptions. Execution quality is load-bearing: provider adoption rate and capacity conversion timing determine where in this range outcomes land.`;
  } else if (conservROI >= 0.15) {
    floorLabel = "Reading the Range";
    floorMsg = `At 70% realization — 30% lower across every domain — this model returns ${fmt(conservFloor)} net${conservPayback ? ` (payback at month ${conservPayback})` : ""}. The floor is positive and well-defined. The base case at ${fmt(summary.termNet)} reflects conservative utilization targets and phased onset timing. Everything above that is execution: faster adoption, earlier go-live, capacity that converts to scheduled volume. The range is tight. All of it works.`;
  } else {
    floorLabel = "Reading the Range";
    floorMsg = `At 70% realization, the floor is ${fmt(conservFloor)} net — investment recovered${conservPayback ? ` at month ${conservPayback}` : ""}, with positive return above cost. The base case at ${fmt(summary.termNet)} is the central projection. Provider adoption rate and capacity conversion timing are the execution variables most likely to determine where outcomes land across the range.`;
  }

  return (
    <Page size="LETTER" style={[S.page, S.contentPage]} wrap={false}>
      <PageHeader label="Financial Summary" />

      <Text style={S.eyebrow}>{termLabel} Proforma</Text>
      <Text style={[S.sectionTitle, { marginBottom: 10 }]}>Contract Projection</Text>

      {/* PROFORMA TABLE */}
      <View style={[S.tableWrap, { marginBottom: 12 }]}>
        {/* Header row */}
        <View style={S.tableHead}>
          <Text style={[S.tableHeadCell, { flex: labelFlex }]}>Care Setting / Domain</Text>
          {yearlyData.map(y => (
            <Text key={y.label} style={[S.tableHeadCell, { flex: yearFlex, textAlign: "right" }]}>{y.label}</Text>
          ))}
          <Text style={[S.tableHeadCell, { flex: yearFlex, textAlign: "right" }]}>Total</Text>
        </View>

        {/* Per-setting rows */}
        {settings.map((s, si) => {
          const sc = s.color || brand.coral;
          const settingTotal = yearlyData.reduce((sum, y) => sum + (y.bySettings[s.id]?.value || 0), 0);
          return (
            <View key={s.id} style={S.tableRow}>
              <View style={{ flex: labelFlex, flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={{ width: 3, height: 12, backgroundColor: sc, borderRadius: 1 }} />
                <Text style={{ fontSize: cellFontSize, fontWeight: 600, color: brand.textPrimary }}>{s.label}</Text>
              </View>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: yearFlex, fontSize: cellFontSize, textAlign: "right", color: brand.textPrimary }}>
                  {colFmt(y.bySettings[s.id]?.value || 0)}
                </Text>
              ))}
              <Text style={{ flex: yearFlex, fontSize: cellFontSize, fontWeight: 600, textAlign: "right", color: sc }}>
                {colFmt(settingTotal)}
              </Text>
            </View>
          );
        })}

        {/* Total value row */}
        <View style={S.tableRowTotal}>
          <Text style={{ flex: labelFlex, fontSize: cellFontSize, fontWeight: 600 }}>Total Value</Text>
          {yearlyData.map(y => (
            <Text key={y.label} style={{ flex: yearFlex, fontSize: cellFontSize, fontWeight: 600, textAlign: "right" }}>
              {colFmt(y.totalValue)}
            </Text>
          ))}
          <Text style={{ flex: yearFlex, fontSize: cellFontSize, fontWeight: 600, textAlign: "right" }}>
            {colFmt(summary.termValue)}
          </Text>
        </View>

        {/* Domain breakdown sub-rows */}
        {[
          { label: "Capacity",          color: brand.capacity,     vals: yearlyData.map(y => y.capacityValue),     total: totalCapVal  },
          { label: "Workforce",         color: brand.workforce,    vals: yearlyData.map(y => y.workforceValue),    total: totalWorkVal },
          { label: "Revenue",           color: brand.revenue,      vals: yearlyData.map(y => y.revenueValue),      total: totalRevVal  },
          { label: "Quality",           color: brand.quality,      vals: yearlyData.map(y => y.qualityValue),      total: totalQualVal },
          { label: "Cost Displacement", color: brand.displacement, vals: yearlyData.map(y => y.displacementValue), total: totalDispVal },
        ].filter(d => d.total > 0).map(d => (
          <View key={d.label} style={S.tableRowSubtle}>
            <View style={{ flex: labelFlex, flexDirection: "row", alignItems: "center", paddingLeft: 14, gap: 5 }}>
              <View style={{ width: 6, height: 6, backgroundColor: d.color, borderRadius: 1 }} />
              <Text style={{ fontSize: 7.5, color: brand.textSecondary }}>{d.label}</Text>
            </View>
            {d.vals.map((v, i) => (
              <Text key={i} style={{ flex: yearFlex, fontSize: 7.5, color: brand.textSecondary, textAlign: "right" }}>
                {colFmt(v)}
              </Text>
            ))}
            <Text style={{ flex: yearFlex, fontSize: 7.5, color: brand.textSecondary, textAlign: "right" }}>
              {colFmt(d.total)}
            </Text>
          </View>
        ))}

        {/* Investment row */}
        {hasInvestment && (
          <View style={S.tableRow}>
            <Text style={{ flex: labelFlex, fontSize: cellFontSize, color: brand.negative }}>Investment</Text>
            {yearlyData.map(y => (
              <Text key={y.label} style={{ flex: yearFlex, fontSize: cellFontSize, color: brand.negative, textAlign: "right" }}>
                ({colFmt(y.investment)})
              </Text>
            ))}
            <Text style={{ flex: yearFlex, fontSize: cellFontSize, fontWeight: 600, color: brand.negative, textAlign: "right" }}>
              ({colFmt(summary.termInvestment)})
            </Text>
          </View>
        )}

        {/* Banked encounter footnote — explains why Y1 investment is unusually low */}
        {isBanked && hasInvestment && (
          <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderTopWidth: 1, borderTopColor: brand.midGray }}>
            <Text style={{ fontSize: 7, color: brand.textSecondary, lineHeight: 1.5 }}>
              * Banked Encounter: Year 1 billed at platform/base fee only. Encounter consumption charged in arrears starting Year 2. Payback reflects full economic cost independent of billing schedule.
            </Text>
          </View>
        )}

        {/* Net value row */}
        <View style={[S.tableRowTotal, S.tableRowLast]}>
          <Text style={{ flex: labelFlex, fontSize: cellFontSize, fontWeight: 600 }}>Net Value</Text>
          {yearlyData.map(y => (
            <Text key={y.label} style={{
              flex: yearFlex, fontSize: cellFontSize, fontWeight: 600, textAlign: "right",
              color: y.netValue >= 0 ? brand.positive : brand.negative,
            }}>
              {y.netValue >= 0 ? colFmt(y.netValue) : `(${colFmt(Math.abs(y.netValue))})`}
            </Text>
          ))}
          <Text style={{
            flex: yearFlex, fontSize: cellFontSize, fontWeight: 600, textAlign: "right",
            color: summary.termNet >= 0 ? brand.positive : brand.negative,
          }}>
            {summary.termNet >= 0 ? colFmt(summary.termNet) : `(${colFmt(Math.abs(summary.termNet))})`}
          </Text>
        </View>
      </View>

      {/* COST REDUCTIONS CAPTURED — names the items rolled into Cost Displacement */}
      {costOffsetItems.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <View style={{ width: 6, height: 6, backgroundColor: brand.displacement, borderRadius: 1 }} />
            <Text style={S.eyebrow}>Cost Reductions Captured</Text>
          </View>
          <Text style={{ fontSize: 7.5, color: brand.textTertiary, marginBottom: 5 }}>
            Annual spend displaced by Abridge — ramps into the Cost Displacement line above.
          </Text>
          {costOffsetItems.map(item => (
            <View key={item.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 }}>
              <Text style={{ fontSize: 8, color: brand.textPrimary }}>
                {item.name}{item.settingLabel ? ` · ${item.settingLabel}` : ""}
              </Text>
              <Text style={{ fontSize: 8, fontWeight: 600, color: brand.displacement }}>{fmt(item.displaced)}/yr</Text>
            </View>
          ))}
          {costOffsetItems.length > 1 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: brand.midGray, marginTop: 3, paddingTop: 3 }}>
              <Text style={{ fontSize: 8, fontWeight: 600, color: brand.textPrimary }}>Total annual displacement</Text>
              <Text style={{ fontSize: 8, fontWeight: 600, color: brand.displacement }}>{fmt(costOffsetTotal)}/yr</Text>
            </View>
          )}
        </View>
      )}

      <View style={S.divider} />

      {/* SENSITIVITY ANALYSIS */}
      <Text style={S.eyebrow}>Scenario Analysis</Text>
      <Text style={[S.sectionTitle, { marginBottom: 10 }]}>How Robust Is the Case?</Text>

      <View style={S.tableWrap}>
        <View style={S.tableHead}>
          <Text style={[S.tableHeadCell, { flex: 2 }]}>Metric</Text>
          <Text style={[S.tableHeadCell, { flex: 1, textAlign: "center" }]}>Conservative (70% Realization)</Text>
          <Text style={[S.tableHeadCell, { flex: 1, textAlign: "center", color: brand.coral }]}>Base Case</Text>
          <Text style={[S.tableHeadCell, { flex: 1, textAlign: "center" }]}>Optimistic (130% Realization)</Text>
        </View>

        {hasInvestment && (
          <View style={S.tableRow}>
            <Text style={[S.tableCell, { flex: 2 }]}>Value-to-Cost</Text>
            <Text style={[S.tableCell, { flex: 1, textAlign: "center" }]}>{sensitivityData.conservative.vtc.toFixed(1)}x</Text>
            <Text style={[S.tableCellBold, { flex: 1, textAlign: "center", color: brand.coral }]}>{summary.valueToCost.toFixed(1)}x</Text>
            <Text style={[S.tableCellBold, { flex: 1, textAlign: "center", color: brand.positive }]}>{sensitivityData.optimistic.vtc.toFixed(1)}x</Text>
          </View>
        )}
        {hasInvestment && (
          <View style={S.tableRow}>
            <Text style={[S.tableCell, { flex: 2 }]}>ROI</Text>
            <Text style={[S.tableCell, { flex: 1, textAlign: "center" }]}>{Math.round(sensitivityData.conservative.simpleROI * 100)}%</Text>
            <Text style={[S.tableCellBold, { flex: 1, textAlign: "center", color: brand.coral }]}>{Math.round(summary.simpleROI * 100)}%</Text>
            <Text style={[S.tableCellBold, { flex: 1, textAlign: "center", color: brand.positive }]}>{Math.round(sensitivityData.optimistic.simpleROI * 100)}%</Text>
          </View>
        )}
        <View style={S.tableRow}>
          <Text style={[S.tableCell, { flex: 2 }]}>Payback Month</Text>
          <Text style={[S.tableCell, { flex: 1, textAlign: "center" }]}>
            {sensitivityData.conservative.paybackMonth ? `Mo ${sensitivityData.conservative.paybackMonth}` : "—"}
          </Text>
          <Text style={[S.tableCellBold, { flex: 1, textAlign: "center", color: brand.coral }]}>
            {summary.paybackMonth ? `Mo ${summary.paybackMonth}` : "—"}
          </Text>
          <Text style={[S.tableCellBold, { flex: 1, textAlign: "center", color: brand.positive }]}>
            {sensitivityData.optimistic.paybackMonth ? `Mo ${sensitivityData.optimistic.paybackMonth}` : "—"}
          </Text>
        </View>
        <View style={[S.tableRow, S.tableRowLast]}>
          <Text style={[S.tableCell, { flex: 2 }]}>{termLabel} Net Value</Text>
          <Text style={[S.tableCellBold, { flex: 1, textAlign: "center", color: conservFloor >= 0 ? brand.textPrimary : brand.negative }]}>
            {fmt(conservFloor)}
          </Text>
          <Text style={[S.tableCellBold, { flex: 1, textAlign: "center", color: brand.coral }]}>
            {fmt(summary.termNet)}
          </Text>
          <Text style={[S.tableCellBold, { flex: 1, textAlign: "center", color: brand.positive }]}>
            {fmt(sensitivityData.optimistic.termNet)}
          </Text>
        </View>
      </View>

      <Text style={{ fontSize: 7, color: brand.textSecondary, marginTop: 6 }}>
        Investment is held constant across scenarios; only value realization scales (±30%). Value-to-Cost is the whole-contract ratio — it includes the one-time implementation fee and the early adoption ramp. Payback is measured from day one, so a 30% downside shifts it out further than an equal upside pulls it in.
      </Text>

      <View style={[S.insightBox, { marginTop: 10 }]}>
        <Text style={S.insightLabel}>{floorLabel}</Text>
        <Text style={S.insightText}>{floorMsg}</Text>
      </View>

      <PageFooter pageNum={4} preparedBy={preparedBy} totalPDFPages={totalPDFPages} />
    </Page>
  );
}

// ─── PAGE 5: VALUE DRIVER DETAIL ──────────────────────────────────────────────

interface FormulaStep { label: string; value: string; isResult?: boolean; }

function buildDriverFormula(
  driverId: string,
  driverValue: number,
  setting: ProformaSettingSnapshot,
  contractYears: number,
): FormulaStep[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const es = (setting.fullExploreState ?? (setting as any).exploreState) as any;
  // Pull the contract's TERMINAL year (Y2 for a 2-year model), not a hardcoded Y3,
  // so the "full scale" formulas match the engine and the Volumes tab.
  const pickTermYear = (o?: { year1?: number; year2?: number; year3?: number }): number | undefined =>
    !o ? undefined : contractYears >= 3 ? o.year3 : contractYears >= 2 ? o.year2 : o.year1;
  const providers = pickTermYear(setting.yearlyProviders) ?? setting.fullScaleProviders ?? setting.providerCount;
  const n = (v: number) => Math.round(v).toLocaleString();
  const p = (v: number) => `${v}%`;
  const d = (v: number) => `$${Math.round(v).toLocaleString()}`;

  // ── Snapshot-only formulas (no fullExploreState required) ──────────────────
  if (driverId === "retention") {
    const replaceCost = setting.replacementCost || 400000;
    const turnoverPct = setting.retentionRate || 0;
    const retained = replaceCost > 0 ? driverValue / replaceCost : 0;
    const isNursing = setting.careSetting === "nursing";
    const unitWord = isNursing ? "nurses" : "physicians";
    return [
      { label: `${n(providers)} ${unitWord}  ×  ${p(turnoverPct)} annual turnover  →  burnout-driven attrition reduced`, value: `${retained.toFixed(1)} ${unitWord} retained/yr` },
      { label: `${retained.toFixed(1)} ${unitWord} retained  ×  ${d(replaceCost)} replacement cost per ${isNursing ? "nurse" : "physician"}`, value: fmt(driverValue), isResult: true },
    ];
  }

  if (!es) return [];
  const tdi = es.timeDriverInputs ?? {};
  // Scale pilot encounters up to full-scale so formula steps match the scaled driverValue.
  // The terminal year's encounters are the ground truth when the rep edited the box;
  // otherwise derive by the same providerScaleFactor used in handleAddToProforma.
  const pilotProviders = setting.providerCount || 1;
  const providerScaleFactor = providers > pilotProviders ? providers / pilotProviders : 1;
  const annEnc = pickTermYear(setting.yearlyEncounters)
    ?? Math.round((es.annualEncounters || 0) * providerScaleFactor);
  const encPerProv = providers > 0 ? Math.round(annEnc / providers) : 0;

  switch (driverId) {

    // ── Capacity ──────────────────────────────────────────────────────────────

    case "patientAccess": {
      const minSaved  = es.minutesSavedPerEncounter || 0;
      const realPct   = tdi.capacityRealizationPercent || 50;
      const rev       = tdi.revenuePerVisit || 200;
      const visitDur  = tdi.visitDuration || 20;
      const totalHrs  = Math.round((minSaved * annEnc) / 60);
      const convertedHrs = Math.round(totalHrs * (realPct / 100));
      const extraVisits  = Math.round((convertedHrs * 60) / visitDur);
      return [
        { label: `${minSaved} min saved/enc  ×  ${n(annEnc)} enc/yr  ÷  60`, value: `${n(totalHrs)} provider-hours freed/yr` },
        { label: `${n(totalHrs)} hrs  ×  ${p(realPct)} capacity conversion  ÷  ${visitDur}-min appts`, value: `${n(extraVisits)} additional visits/yr` },
        { label: `${n(extraVisits)} visits  ×  ${d(rev)}/visit`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "edLwbs":
    case "lwbsRecovery": {
      const rate  = tdi.edLwbsRate || 0;
      const red   = tdi.edLwbsReduction || 20;
      const rev   = tdi.edRevenuePerVisit || 350;
      const real  = tdi.edLwbsRealization || 85;
      const lwbs  = Math.round(annEnc * (rate / 100));
      const recov = Math.round(lwbs * (red / 100));
      return [
        { label: `${n(annEnc)} enc/yr  ×  ${p(rate)} current LWBS rate`, value: `${n(lwbs)} LWBS patients/yr` },
        { label: `${n(lwbs)}  ×  ${p(red)} reduction from faster documentation`, value: `${n(recov)} patients recovered/yr` },
        { label: `${n(recov)}  ×  ${d(rev)}/visit  ×  ${p(real)} realization`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "edAdmission":
    case "admissionCapture": {
      const rate    = tdi.edLwbsRate || 0;
      const red     = tdi.edLwbsReduction || 20;
      const admRate = tdi.edAdmissionRate || 0;
      const admRev  = tdi.edAdmissionRevenue || 0;
      const admReal = tdi.edAdmissionRealization || 75;
      const recov   = Math.round(annEnc * (rate / 100) * (red / 100));
      const admits  = Math.round(recov * (admRate / 100));
      return [
        { label: `${n(recov)} LWBS-recovered patients  ×  ${p(admRate)} admission conversion rate`, value: `${n(admits)} admissions captured/yr` },
        { label: `${n(admits)}  ×  ${d(admRev)} avg admission revenue  ×  ${p(admReal)} realization`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "costReduction": {
      const minSaved = es.minutesSavedPerEncounter || 0;
      const totalHrs = Math.round((minSaved * annEnc) / 60);
      const effectiveRate = totalHrs > 0 ? Math.round(driverValue / totalHrs) : 0;
      return [
        { label: `${minSaved} min saved/enc  ×  ${n(annEnc)} enc/yr  ÷  60`, value: `${n(totalHrs)} provider-hours freed/yr` },
        { label: `${n(totalHrs)} hrs  ×  ${d(effectiveRate)}/hr provider opportunity cost`, value: fmt(driverValue), isResult: true },
      ];
    }

    // ── Workforce ─────────────────────────────────────────────────────────────

    case "providerWellbeing": {
      const turnover    = tdi.annualTurnoverRate || 0;
      const burnout     = tdi.burnoutRelatedTurnover || 0;
      const retScenarios: Record<string, number> = physicianRetentionRates(tdi.retentionCustomPercent ?? 10);
      const impPct      = retScenarios[tdi.retentionImpactScenario || 'typical'] ?? 10;
      const replaceCost = tdi.replacementCost || 200000;
      const unitWord    = setting.careSetting === 'inpatient' ? 'physician' : setting.careSetting === 'ed' ? 'physician' : 'provider';
      const unitWords   = unitWord + 's';
      const atRisk      = providers * (turnover / 100) * (burnout / 100);
      const retained    = atRisk * (impPct / 100);
      return [
        { label: `${n(providers)} ${unitWords}  ×  ${p(turnover)} turnover  ×  ${p(burnout)} burnout-driven`, value: `${atRisk.toFixed(1)} ${unitWords}/yr at risk` },
        { label: `${atRisk.toFixed(1)}  ×  ${p(impPct)} retention improvement from reduced burnout`, value: `${retained.toFixed(1)} ${unitWords} retained/yr` },
        { label: `${retained.toFixed(1)}  ×  ${d(replaceCost)} replacement cost per ${unitWord}`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "physicianLocumAgency": {
      const weeksPerVac = tdi.physicianAgencyWeeksPerVacancy || 8;
      const weeklyPrem  = tdi.physicianAgencyWeeklyPremium || 8000;
      const turnover    = tdi.annualTurnoverRate || 0;
      const burnout     = tdi.burnoutRelatedTurnover || 0;
      const impPct      = tdi.retentionCustomPercent || 15;
      const retained    = providers * (turnover / 100) * (burnout / 100) * (impPct / 100);
      const locumWks    = (retained * weeksPerVac).toFixed(0);
      return [
        { label: `${retained.toFixed(1)} fewer vacancies/yr  ×  ${weeksPerVac} wks locum coverage per vacancy`, value: `${locumWks} locum-weeks avoided/yr` },
        { label: `${locumWks} weeks  ×  ${d(weeklyPrem)} weekly locum/agency premium`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "nursingRetention": {
      const turnoverRate  = tdi.nursingTurnoverRate || 0;
      const replaceCost   = tdi.nursingReplacementCost || 50000;
      // Prefer the proforma's terminal-year bed count so this matches the Volumes
      // tab and the care-setting table; fall back to the Explore snapshot.
      const beds          = providers || es.nursingStaffedBeds || 0;
      const occupancy     = Math.round((es.nursingOccupancyRate || 0.85) * 100);
      const estNurses     = Math.round(beds * (occupancy / 100) * 2.5);
      const atRisk        = Math.round(estNurses * (turnoverRate / 100));
      const nursingRates: Record<string, number> = nursingRetentionRates(tdi.retentionCustomPercent ?? 10);
      const impPct        = nursingRates[tdi.retentionImpactScenario || 'typical'] ?? 15;
      const retained      = (atRisk * (impPct / 100)).toFixed(1);
      return [
        { label: `${n(beds)} beds  ×  ${p(occupancy)} occupancy  →  ~${n(estNurses)} nurses  ×  ${p(turnoverRate)} turnover`, value: `${n(atRisk)} nurses/yr at risk` },
        { label: `${n(atRisk)}  ×  ${p(impPct)} Abridge impact on burnout-driven departures`, value: `${retained} nurses retained/yr` },
        { label: `${retained}  ×  ${d(replaceCost)} replacement cost per nurse`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "nursingAgency": {
      const agencySpend  = tdi.nursingAnnualAgencySpend || 0;
      const weeksPerVac  = tdi.nursingAgencyWeeksPerVacancy || 13;
      const weeklyPrem   = tdi.nursingAgencyWeeklyPremium || 2000;
      return [
        { label: `Annual agency/travel nursing baseline: ${d(agencySpend)}`, value: `current exposure` },
        { label: `Vacancies reduced (from retention) × ${weeksPerVac} wks × ${d(weeklyPrem)}/wk premium`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "nursingOt":
    case "nursingOvertime": {
      const hoursPerWk   = tdi.nursingOtHoursPerNurseWeek || 0;
      const reductionPct = tdi.nursingOtReductionPercent || 0;
      const hourlyRate   = tdi.nursingOtHourlyRate || 0;
      const beds         = providers || es.nursingStaffedBeds || 0;
      const nurses       = Math.round(beds * (es.nursingOccupancyRate || 0.85) * 2.5);
      const totalOtHrs   = Math.round(nurses * hoursPerWk * 52);
      const savedHrs     = Math.round(totalOtHrs * (reductionPct / 100));
      return [
        { label: `~${n(nurses)} nurses  ×  ${hoursPerWk} OT hrs/week  ×  52 weeks`, value: `${n(totalOtHrs)} OT hrs/yr (baseline)` },
        { label: `${n(totalOtHrs)}  ×  ${p(reductionPct)} reduction from documentation efficiency`, value: `${n(savedHrs)} OT hours eliminated` },
        { label: `${n(savedHrs)} hrs  ×  ${d(hourlyRate)} blended OT rate`, value: fmt(driverValue), isResult: true },
      ];
    }

    // ── Revenue ───────────────────────────────────────────────────────────────

    case "edEmLevel":
    case "wrvu": {
      const dqi        = es.docQualityInputs;
      const wrvuMap: Record<string, number> = { conservative: 2, typical: 5, aggressive: 9, custom: dqi?.wrvuCustomPercent ?? 5 };
      const wrvuPct    = dqi?.wrvuScenario ? (wrvuMap[dqi.wrvuScenario] ?? 5) : (es.wrvuPctIncrease || 0);
      const convFactor = dqi?.conversionFactor || 55;
      const totalEnc   = annEnc || providers * encPerProv;
      // Derive actual wRVUs from the dollar value to stay consistent with calculation engine
      const wrvuGained = convFactor > 0 ? Math.round(driverValue / convFactor) : Math.round(totalEnc * (wrvuPct / 100));
      return [
        { label: `${n(providers)} providers  ×  ${n(encPerProv)} encounters/provider/yr`, value: `${n(Math.round(totalEnc))} total encounters` },
        { label: `Problems addressed, data reviewed, and risk documented — complexity delivered, note didn't show it  →  ${wrvuPct > 0 ? wrvuPct.toFixed(1) : "~2–4"}% wRVU lift`, value: `${n(wrvuGained > 0 ? wrvuGained : Math.round(totalEnc * 0.03))} wRVUs recovered` },
        { label: `wRVUs recovered  ×  ${d(convFactor)} conversion factor`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "hcc":
    case "hccCapture": {
      // HCC is modeled per MA/risk plan (dq.hccPlans), not a single panel x MA%.
      // Reconstruct the real mechanism so the steps reconcile with driverValue.
      const dqi     = es.docQualityInputs ?? {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plans: any[] = Array.isArray(dqi.hccPlans) ? dqi.hccPlans : [];
      const avgHccs = dqi.avgHccs || 0;
      const realization = dqi.hccRealization ?? 100;
      const upliftMap: Record<string, number> = { conservative: 3, typical: 5, optimistic: 10 };
      let totalPanel = 0;
      let totalHccs = 0;
      for (const pl of plans) {
        const panelSize = pl.panelSize || 0;
        totalPanel += panelSize;
        const upliftPp = pl.uplift === "custom" ? (pl.upliftCustomPp ?? 5) : (upliftMap[pl.uplift] ?? 5);
        const effectiveUplift = Math.min(upliftPp, Math.max(0, 90 - (pl.currentRecaptureRate || 0)));
        totalHccs += providers * panelSize * ((pl.gapRate || 0) / 100) * (effectiveUplift / 100) * avgHccs;
        if (pl.netNewEnabled) {
          totalHccs += providers * panelSize * ((pl.netNewDiscoveryRate || 0) / 100) * (pl.netNewAvgConditions || 0);
        }
      }
      const coveredLives = Math.round(providers * totalPanel);
      const nPlans = plans.length;
      return [
        { label: `${n(providers)} providers  ×  ${n(totalPanel)} panel${nPlans > 1 ? `  across ${nPlans} risk plans` : ""}`, value: `${n(coveredLives)} covered lives` },
        { label: `Gaps closed at the point of care  ×  ${avgHccs} avg HCCs per patient`, value: `${n(totalHccs)} HCCs recaptured/yr` },
        { label: `HCCs recaptured  ×  value per HCC  ×  ${p(realization)} realization`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "denials":
    case "denialPrevention": {
      const denialPct  = es.denialsPctReduced || 0;
      const dqi        = es.docQualityInputs ?? {};
      const denialRate = dqi.medNecessityDenialRate || dqi.denialRate || 0;
      const claimVal   = dqi.avgClaimValue || 0;
      const eligible   = Math.round(annEnc * (denialRate / 100));
      return [
        { label: `${n(annEnc)} encounters  ×  ${p(denialRate)} medical necessity denial rate`, value: `${n(eligible)} claims at risk` },
        { label: `Physician reasoned correctly, note didn't capture it  ×  ${d(claimVal)} avg claim`, value: `targeted for reduction` },
        { label: `Denials targeted for reduction  ×  avg claim value  ×  realization`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "ipDrg":
    case "drgAccuracy": {
      const dqi     = es.docQualityInputs ?? {};
      const drgRate = dqi.drgImprovementRate || 0;
      const totalEnc = annEnc || providers * encPerProv;
      const casesDelta = Math.round(totalEnc * (drgRate > 0 ? drgRate / 100 : 0.03));
      return [
        { label: `CCs/MCCs mentioned at bedside, not in note — conditions that may shift DRG weight $2–4K per stay  ×  ${drgRate > 0 ? drgRate.toFixed(1) + "%" : "~2–4%"} documentation lift`, value: `${n(casesDelta)} cases more accurately coded` },
        { label: `${n(casesDelta)} cases  ×  avg DRG payment delta from accurate complexity documentation`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "ipCdi":
    case "cdiQueryReduction": {
      const dqi      = es.docQualityInputs ?? {};
      const queryVol = dqi.cdiQueriesPerMonth || 0;
      const annualQueries = queryVol > 0 ? queryVol * 12 : Math.round(annEnc * 0.08);
      const reduced   = Math.round(annualQueries * 0.35);
      return [
        { label: `${n(annualQueries)} CDI queries/yr — conditions named at bedside, note said "elevated BMP"  →  documentation captured at point of care can reduce queries`, value: `${n(reduced)} queries potentially avoided` },
        { label: `${n(reduced)} queries eliminated  ×  avg CDI specialist cost per query`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "ipObsDefense": {
      const dqi     = es.docQualityInputs ?? {};
      const obsRate = dqi.obsDefenseRate || 0;
      const avgDelta = dqi.obsInpatientRevDelta || 2800;
      const totalEnc  = annEnc || providers * encPerProv;
      const defended  = obsRate > 0 ? Math.round(totalEnc * (obsRate / 100)) : Math.round(driverValue / avgDelta);
      return [
        { label: `Admission reasoning captured at point of care — two-midnight clinical expectation documented before audit`, value: `inpatient status defended` },
        { label: `${n(defended)} cases defended  ×  ${d(avgDelta)} avg inpatient vs. observation revenue delta`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "docQuality": {
      const careSetting = setting.careSetting;
      const docAllocPct = careSetting === "ed"
        ? (tdi.edAllocDocQualityPercent || 0)
        : careSetting === "inpatient"
          ? (tdi.ipAllocQualityPercent || 0)
          : (tdi.opAllocDocQualityPercent || 0);
      const totalHoursSaved = setting.totalHoursSaved || 0;
      const providerValuePerHour = totalHoursSaved > 0 ? Math.round(setting.timeValue / totalHoursSaved) : 0;
      const docQualityHours = Math.round(totalHoursSaved * (docAllocPct / 100));
      return [
        { label: `${n(totalHoursSaved)} total hours saved  ×  ${docAllocPct}% allocated to documentation quality`, value: `${n(docQualityHours)} quality-improvement hours/yr` },
        { label: `${n(docQualityHours)} hrs  ×  ${d(providerValuePerHour)}/hr provider time value`, value: fmt(driverValue), isResult: true },
      ];
    }

    // ── Quality / Nursing ─────────────────────────────────────────────────────

    case "nursingHapi":
    case "nursingFalls":
    case "nursingCauti":
    case "nursingClabsi": {
      const evtNames: Record<string, string> = {
        nursingHapi: "HAPI", nursingFalls: "fall", nursingCauti: "CAUTI", nursingClabsi: "CLABSI",
      };
      const evtCosts: Record<string, number> = {
        nursingHapi: 11000, nursingFalls: 14000, nursingCauti: 13000, nursingClabsi: 48000,
      };
      const evtName = evtNames[driverId] || "adverse event";
      const avgCost = evtCosts[driverId] || 15000;
      const eventsAvoided = avgCost > 0 ? (driverValue / avgCost).toFixed(1) : "—";
      return [
        { label: `Real-time documentation → earlier identification of ${evtName} risk factors`, value: `event prevention` },
        { label: `${eventsAvoided} ${evtName} events avoided/yr  ×  ${d(avgCost)} avg cost per event`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "nursingSepsis": {
      const avgSepsisCost = 26000;
      const eventsAvoided = (driverValue / avgSepsisCost).toFixed(1);
      return [
        { label: `Earlier sepsis recognition via real-time documentation → timely SEP-1 bundle adherence`, value: `mortality & cost reduction` },
        { label: `${eventsAvoided} sepsis complications avoided/yr  ×  ${d(avgSepsisCost)} avg cost per event`, value: fmt(driverValue), isResult: true },
      ];
    }

    case "scribeCostReduction":
    case "scribeCost": {
      const headcount  = tdi.scribeHeadcount || 0;
      const costPerPos = tdi.scribeCostPerPosition || 0;
      const eliminated = Math.min(tdi.scribePositionsEliminated || 0, headcount);
      const totalSpend = headcount * costPerPos;
      return [
        { label: `${n(headcount)} current scribe positions  ×  ${d(costPerPos)} annual cost per position`, value: `${d(totalSpend)} current scribe spend` },
        { label: `${n(eliminated)} of ${n(headcount)} positions eliminated with Abridge`, value: fmt(driverValue), isResult: true },
      ];
    }

    default:
      return [];
  }
}

function getDriverFallback(driverId: string): string {
  const notes: Record<string, string> = {
    bedsideTime:          "Hours returned to direct patient care — documentation time shifted to bedside.",
    opAfterHoursDoc:      "After-hours documentation eliminated — hours returned directly to providers.",
    opBurnoutTracking:    "Burnout trajectory improvement; workforce sustainability benefit compounds over time.",
    obsDefense:           "Observation-to-inpatient status defense from thorough documentation — auditable per-case.",
    nursingHcahps:        "HCAHPS score improvement from provider presence and communication quality.",
    nursingSepsis:        "Earlier sepsis recognition via documentation quality — outcomes and cost improvement.",
    nursingEarlyDeterioration: "Earlier harm event prevention through real-time flowsheet documentation of clinical deterioration signals.",
    nursingBundleCompliance:   "Care bundle compliance improvement — CLABSI, VAP, sepsis bundles tracked through complete flowsheet documentation.",
    opCdiQueryTrend:      "CDI query volume reduction from outpatient documentation completeness.",
    opCareGapClosureRate: "Care gap closure improvement — HEDIS-relevant conditions documented at point of care.",
    opHedisCompositeScore:"HEDIS composite score improvement from complete preventive care documentation.",
    opMaStarsPerformance: "MA Stars performance tied to documentation quality driving risk adjustment accuracy.",
    edCoreMeasureDocRate: "ED core measure compliance — documentation quality drives measure capture.",
    edDocDeficiencyRate:  "Chart completion rate improvement — fewer post-discharge completions needed.",
    edPatientExperience:  "Provider presence during encounters improves ED patient experience scores.",
    opNotesBeforeLeaving: "In-clinic note completion; inbox burden shifted from home to point-of-care.",
  };
  return notes[driverId] ?? "Value from improved clinical documentation quality and efficiency.";
}

function ValueDriverDetailPage({ settings, config, preparedBy, totalPDFPages }: ProformaPDFProps) {
  const contractYears = Math.ceil(config.contractTermMonths / 12);
  const activeSettings = settings.filter(s => s.drivers.some(d => d.value > 0));
  if (activeSettings.length === 0) return null;

  const domains = ["Capacity", "Workforce", "Revenue", "Quality"] as const;
  const tp = totalPDFPages ?? TOTAL_PDF_PAGES;

  return (
    <>
      {activeSettings.map((s, si) => {
        const sc = s.color || brand.coral;
        const settingTotal = s.drivers.filter(d => d.value > 0).reduce((sum, d) => sum + d.value, 0);
        // Terminal-year unit count (Y2 for a 2-year model), matching the driver formulas.
        const yp = s.yearlyProviders;
        const termUnitCount = (yp ? (contractYears >= 3 ? yp.year3 : contractYears >= 2 ? yp.year2 : yp.year1) : undefined)
          ?? s.fullScaleProviders ?? s.providerCount;
        const byDomain = domains
          .map(domain => ({
            domain,
            drivers: s.drivers.filter(d => d.quadrant === domain && d.value > 0),
          }))
          .filter(g => g.drivers.length > 0);

        // Qualitative signals enabled for this setting
        const es = (s.fullExploreState ?? (s as any).exploreState) as any;
        const signals = es
          ? EXPLORE_DRIVERS.filter(d => {
              if (d.visibility !== 'qualitative') return false;
              if (!(d.settings as string[]).includes(s.careSetting)) return false;
              const td = es.timeDriverInputs || {};
              const dq = es.docQualityInputs || {};
              return Boolean(td[d.enabledStateKey] ?? dq[d.enabledStateKey]);
            })
          : [];

        return (
          <Page key={s.id} size="LETTER" style={[S.page, S.contentPage]}>
            <PageHeader label="Value Drivers" />

            {/* SETTING HEADER */}
            <View style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              borderLeftWidth: 4,
              borderLeftColor: sc,
              paddingLeft: 10,
              paddingVertical: 6,
              marginBottom: 16,
            }}>
              <View>
                <Text style={{ fontSize: 8, fontWeight: 600, color: sc, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2 }}>
                  {SETTING_LABELS[s.careSetting] || s.label}
                </Text>
                <Text style={{ fontSize: 8.5, color: brand.textTertiary }}>
                  {fmtNum(termUnitCount)} {unitLabel(s.careSetting).toLowerCase()} · run-rate at full utilization
                </Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: 700, color: brand.textPrimary }}>{fmt(settingTotal)}/yr</Text>
            </View>

            {/* DOMAIN SECTIONS */}
            {byDomain.map(({ domain, drivers }) => {
              const domColor = DOMAIN_COLORS[domain] ?? brand.black;
              const domTotal = drivers.reduce((sum, d) => sum + d.value, 0);
              return (
                <View key={domain} style={{ marginBottom: 10 }}>
                  {/* Domain sub-header */}
                  <View style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: brand.warmGray,
                    paddingVertical: 5,
                    paddingHorizontal: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: brand.midGray,
                  }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                      <DomainPill domain={domain} />
                      <Text style={{ fontSize: 8, color: brand.textSecondary }}>{DOMAIN_NORTH_STARS[domain]}</Text>
                    </View>
                    <Text style={{ fontSize: 9, fontWeight: 600, color: domColor }}>{fmt(domTotal)}/yr</Text>
                  </View>

                  {/* Driver rows */}
                  {drivers.map((driver, di) => {
                    const formula = buildDriverFormula(driver.id, driver.value, s, contractYears);
                    const fallback = getDriverFallback(driver.id);
                    return (
                      <View
                        key={driver.id}
                        wrap={false}
                        style={{
                          paddingHorizontal: 12,
                          paddingTop: 9,
                          paddingBottom: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: brand.midGray,
                          borderLeftWidth: 1,
                          borderLeftColor: brand.midGray,
                          borderRightWidth: 1,
                          borderRightColor: brand.midGray,
                        }}
                      >
                        {/* Driver name + value */}
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                          <Text style={{ fontSize: 10, fontWeight: 600, color: brand.textPrimary }}>{driver.name}</Text>
                          <Text style={{ fontSize: 10, fontWeight: 700, color: domColor }}>{fmt(driver.value)}/yr</Text>
                        </View>

                        {formula.length > 0 ? (
                          formula.map((step, fi) => (
                            <View
                              key={fi}
                              style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                paddingVertical: 3,
                                ...(step.isResult ? {
                                  borderTopWidth: 0.5,
                                  borderTopColor: brand.borderGray,
                                  marginTop: 5,
                                  paddingTop: 5,
                                } : {}),
                              }}
                            >
                              <Text style={{ fontSize: 8.5, color: step.isResult ? brand.textSecondary : brand.textTertiary, flex: 1, lineHeight: 1.5 }}>
                                {step.label}
                              </Text>
                              <Text style={{ fontSize: 8.5, fontWeight: step.isResult ? 700 : 400, color: step.isResult ? domColor : brand.textTertiary, marginLeft: 14, flexShrink: 0 }}>
                                {step.value}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text style={{ fontSize: 8.5, color: brand.textTertiary, lineHeight: 1.5 }}>{fallback}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}

            {/* SIGNALS TO TRACK — compact, max 8, no description */}
            {signals.length > 0 && (
              <View wrap={false} style={{ marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: brand.midGray }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                  <Text style={{ fontSize: 7, fontWeight: 600, color: brand.textTertiary, letterSpacing: 1.5, textTransform: "uppercase" }}>
                    Signals to Track
                  </Text>
                  {signals.length > 8 && (
                    <Text style={{ fontSize: 7, color: brand.textTertiary }}>+{signals.length - 8} more</Text>
                  )}
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
                  {signals.slice(0, 8).map(sig => (
                    <View key={sig.id} style={{
                      backgroundColor: brand.warmGray,
                      borderRadius: 3,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      width: "48%",
                    }}>
                      <Text style={{ fontSize: 7.5, fontWeight: 600, color: brand.textPrimary }}>{sig.label}</Text>
                      {sig.valueArc?.signal && (
                        <Text style={{ fontSize: 6.5, color: brand.coral, marginTop: 2 }}>
                          {sig.valueArc.signal.timing} · {sig.valueArc.signal.metric}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

            <PageFooter pageNum={5 + si} preparedBy={preparedBy} totalPDFPages={tp} />
          </Page>
        );
      })}
    </>
  );
}

// ─── PAGE 6: MODEL CONFIDENCE ─────────────────────────────────────────────────

function ModelConfidencePage({ settings, config, summary, yearlyData, sensitivityData, preparedBy, totalPDFPages }: ProformaPDFProps) {
  const termLabel     = contractTermLabel(config.contractTermMonths);
  const contractYears = Math.ceil(config.contractTermMonths / 12);
  const activeSettingCount = Math.max(1, settings.filter(s => s.drivers.some(d => d.value > 0)).length);
  const tp = totalPDFPages ?? TOTAL_PDF_PAGES;
  const confidencePageNum = 4 + activeSettingCount + 1;
  const allDriverIds  = new Set(settings.flatMap(s => s.drivers.map(d => d.id)));
  const allPerEnc     = settings.every(s => s.pricingModel === "perEncounter");
  const hasWorkforce  = yearlyData.some(y => y.workforceValue > 0);
  const hasCapacity   = yearlyData.some(y => y.capacityValue  > 0);
  const hasRevenue    = yearlyData.some(y => y.revenueValue   > 0);
  const hasQuality    = yearlyData.some(y => y.qualityValue   > 0);
  const delayedMonths = ONSET_DELAY_MONTHS.delayed;
  const hasNursingWorkforce  = settings.some(s => s.careSetting === "nursing" && s.workforceValue > 0);
  const hasClinicalWorkforce = settings.some(s => s.careSetting !== "nursing" && s.workforceValue > 0);

  // GROUNDED IN DATA — only include what's actually modeled
  const strongItems: string[] = [];
  strongItems.push("Investment is contractual — cost is exact and fixed from day one");
  strongItems.push(`Implementation ramp is conservative — ${config.implementationRampMonths} months of gradual value scaling while full subscription costs run from the start`);
  if (allDriverIds.has("wrvu"))             strongItems.push("wRVU lift is auditable against billing data within 90 days of go-live");
  if (allDriverIds.has("hccCapture"))       strongItems.push("HCC gap closure traces directly to claims — verifiable through coding records, no inference required");
  if (allDriverIds.has("denialPrevention")) strongItems.push("Denial prevention is measurable against payer adjudication records with direct attribution");
  if (allDriverIds.has("drgAccuracy") || allDriverIds.has("cdiQueryReduction")) strongItems.push("DRG and CDI capture are verifiable through coding audit and query volume data");
  if (allDriverIds.has("nursingOvertime") || allDriverIds.has("nursingAgency"))  strongItems.push("Nursing overtime and agency costs are directly visible in payroll and staffing records");
  if (allDriverIds.has("lwbsRecovery"))     strongItems.push("LWBS recovery ties to documented patient arrival data — a hard operational metric");

  // SHAPED BY YOUR EXECUTION
  const watchItems: string[] = [];
  watchItems.push("Adoption pace — modeled conservatively; your rollout velocity determines when value accelerates past the base case");
  if (hasCapacity) watchItems.push("Capacity realization — time recovered converts to revenue where patient demand exists and scheduling is positioned to absorb it");
  if (hasWorkforce) watchItems.push("Retention attribution — the effect is real, but surfacing it requires a measurement baseline and a consistent tracking cadence");
  if (settings.length > 1) watchItems.push("Deployment sequencing — a well-coordinated multi-setting rollout compresses the ramp; each week of earlier go-live moves payback forward");

  // Methodology inputs: per-setting
  const totalHours = settings.reduce((s, v) => s + v.totalHoursSaved, 0);

  return (
    <Page size="LETTER" style={[S.page, S.contentPage]} wrap={false}>
      <PageHeader label="Model Confidence" />

      <Text style={S.sectionTitle}>Hard Numbers. Honest Assumptions.</Text>
      <Text style={[S.sectionIntro, { marginBottom: 14 }]}>
        Every input in this model traces to a verifiable clinical or operational source. Below is what is locked in from day one — and where your deployment decisions will determine the realized return.
      </Text>

      {/* TWO-COLUMN CONFIDENCE CARDS */}
      <View style={S.twoCols}>
        <View style={[S.confidenceCard, { borderTopWidth: 2, borderTopColor: brand.positive }]}>
          <Text style={[S.confidenceTitle, { color: brand.positive }]}>Grounded in Data</Text>
          {strongItems.map((item, i) => (
            <Text key={i} style={S.confidenceItem}>{"• "}{item}</Text>
          ))}
        </View>
        <View style={[S.confidenceCard, { borderTopWidth: 2, borderTopColor: brand.amber }]}>
          <Text style={[S.confidenceTitle, { color: brand.amber }]}>Shaped by Your Execution</Text>
          {watchItems.map((item, i) => (
            <Text key={i} style={S.confidenceItem}>{"• "}{item}</Text>
          ))}
        </View>
      </View>

      <View style={S.divider} />

      {/* MODEL INPUTS TERM SHEET */}
      <Text style={[S.eyebrowGray, { marginBottom: 8 }]}>Model Inputs</Text>
      <View style={S.tableWrap}>
        {[
          {
            param: "Contract Term",
            value: termLabel,
          },
          {
            param: "Implementation Ramp",
            value: `${config.implementationRampMonths} months`,
          },
          {
            param: "Utilization Targets",
            value: (() => {
              const allSameAsGlobal = settings.every(s => !s.yearlyUtilization);
              if (allSameAsGlobal) {
                const yu = config.yearlyUtilization;
                return `Y1: ${yu.year1}% → Y2: ${yu.year2}%${contractYears >= 3 ? ` → Y3: ${yu.year3}%` : ""}`;
              }
              return settings.map(s => {
                const yu = s.yearlyUtilization ?? config.yearlyUtilization;
                const settingLabel = SETTING_LABELS[s.careSetting] ?? s.label;
                const abbr = settingLabel === "Outpatient" ? "OP" : settingLabel === "Emergency Department" ? "ED" : settingLabel === "Inpatient" ? "IP" : settingLabel.slice(0, 3);
                return `${abbr}: ${yu.year1}%→${yu.year2}%${contractYears >= 3 ? `→${yu.year3}%` : ""}`;
              }).join(" · ");
            })(),
          },
          {
            param: "Domain Onset",
            value: [
              hasRevenue   && `Revenue M1`,
              hasCapacity  && `Capacity M${delayedMonths}`,
              hasQuality   && `Quality M${delayedMonths}`,
              hasWorkforce && `Workforce phased`,
            ].filter(Boolean).join(" · "),
          },
          ...(hasWorkforce ? [{
            param: "Workforce Phasing",
            value: (() => {
              if (hasNursingWorkforce && !hasClinicalWorkforce) {
                const p = config.nursingRetentionPhasing ?? config.retentionPhasing;
                return `${p.year1Pct}% Y1 / ${p.year2Pct}% Y2${contractYears >= 3 ? ` / ${p.year3Pct}% Y3` : ""}`;
              }
              if (hasNursingWorkforce && hasClinicalWorkforce) {
                const cp = config.retentionPhasing;
                const np = config.nursingRetentionPhasing ?? config.retentionPhasing;
                const same = cp.year1Pct === np.year1Pct && cp.year2Pct === np.year2Pct;
                if (same) return `${cp.year1Pct}% Y1 / ${cp.year2Pct}% Y2${contractYears >= 3 ? ` / ${cp.year3Pct}% Y3` : ""}`;
                return `Clinical ${cp.year1Pct}%→${cp.year2Pct}%${contractYears >= 3 ? `→${cp.year3Pct}%` : ""} · Nursing ${np.year1Pct}%→${np.year2Pct}%${contractYears >= 3 ? `→${np.year3Pct}%` : ""}`;
              }
              const p = config.retentionPhasing;
              return `${p.year1Pct}% Y1 / ${p.year2Pct}% Y2${contractYears >= 3 ? ` / ${p.year3Pct}% Y3` : ""}`;
            })(),
          }] : []),
          ...(totalHours > 0 ? [{
            param: "Hours Returned",
            value: `${fmtNum(totalHours)} hrs/yr (full scale)`,
          }] : []),
          ...((config.systemWideFee ?? 0) > 0 ? [{
            param: "System-wide Fee",
            value: `${fmt(config.systemWideFee!)} / yr`,
          }] : []),
          {
            param: "Sensitivity Range",
            value: `${fmt(Math.round(summary.termValue * 0.7))} – ${fmt(Math.round(summary.termValue * 1.3))} (${termLabel} value)`,
          },
        ].map((row, i, arr) => (
          <View key={i} style={[S.tableRow, i === arr.length - 1 ? S.tableRowLast : {}, i % 2 === 1 ? { backgroundColor: brand.warmGray } : {}]}>
            <Text style={[S.tableCellBold, { flex: 2.5, color: brand.textSecondary, fontSize: 8 }]}>{row.param}</Text>
            <Text style={[S.tableCellMono, { flex: 4.5, color: brand.textPrimary, fontSize: 8.5 }]}>{row.value}</Text>
          </View>
        ))}
      </View>

      {(() => {
        const conservativeItems: string[] = [];
        conservativeItems.push(`Full subscription cost runs from day one — value builds across a ${config.implementationRampMonths}-month implementation ramp while cost is already at full rate`);
        if (hasCapacity || hasRevenue || hasQuality) {
          const delayedDomains = [hasCapacity && "Capacity", hasQuality && "Quality"].filter(Boolean).join(" and ");
          if (delayedDomains) conservativeItems.push(`${delayedDomains} value onset delayed to Month ${delayedMonths} — modeled to arrive later than typically observed in Abridge deployments`);
        }
        const allUtil = settings.map(s => {
          const yu = s.yearlyUtilization ?? config.yearlyUtilization;
          return yu.year1;
        });
        const maxY1 = Math.max(...allUtil);
        if (maxY1 < 50) conservativeItems.push(`Year 1 utilization targets set well below steady-state — highest setting at ${maxY1}%, reflecting a conservative adoption ramp rather than projected mature-state performance`);
        else conservativeItems.push(`Utilization targets reflect a gradual adoption ramp — Year 1 targets are set conservatively, with value scaling as provider adoption deepens`);
        if (hasWorkforce) {
          const wfPhasing = (hasNursingWorkforce && !hasClinicalWorkforce)
            ? (config.nursingRetentionPhasing ?? config.retentionPhasing)
            : config.retentionPhasing;
          conservativeItems.push(`Workforce and retention benefits phased at ${wfPhasing.year1Pct}% in Year 1 — real effects modeled to materialize gradually rather than immediately`);
        }

        return (
          <View style={{ marginTop: 12 }}>
            <Text style={[S.eyebrowGray, { marginBottom: 8 }]}>Where We Held Conservative</Text>
            <View style={{ gap: 6 }}>
              {conservativeItems.map((item, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                  <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: brand.textTertiary, marginTop: 4, flexShrink: 0 }} />
                  <Text style={{ fontSize: 8, color: brand.textSecondary, lineHeight: 1.5, flex: 1 }}>{item}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 7, color: brand.textTertiary, marginTop: 10, lineHeight: 1.5 }}>
              Projections are illustrative and based on organization-specific inputs provided at time of modeling. Actual results will vary. This document does not constitute a contractual commitment to financial outcomes.
            </Text>
          </View>
        );
      })()}

      <PageFooter pageNum={confidencePageNum} preparedBy={preparedBy} totalPDFPages={tp} />
    </Page>
  );
}

// ─── DOCUMENT ─────────────────────────────────────────────────────────────────

function ProformaPDFDocument({
  settings, config, summary, yearlyData, sensitivityData,
  chartData, paybackQuarter, organizationName, preparedBy,
}: ProformaPDFProps & { chartData: ChartBar[]; paybackQuarter: string | null }) {
  const termLabel     = contractTermLabel(config.contractTermMonths);
  const contractYears = Math.ceil(config.contractTermMonths / 12);
  const settingNames  = settings.map(s => SETTING_LABELS[s.careSetting] || s.label).join(" · ");
  const today         = new Date();
  const dateStr       = today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const activeSettingCount = Math.max(1, settings.filter(s => s.drivers.some(d => d.value > 0)).length);
  // cover(1) + investment(2) + trajectory(3) + summary(4) + N×drivers(5..4+N) + confidence(5+N) + back(6+N)
  const totalPDFPages = 6 + activeSettingCount;
  const sharedProps = { settings, config, summary, yearlyData, sensitivityData, organizationName, preparedBy, totalPDFPages };

  return (
    <Document>
      {/* PAGE 1: COVER — UNTOUCHED */}
      <PDFCoverPage
        reportLabel="FINANCIAL PROFORMA"
        title={`${termLabel} Value Model`}
        subtitle={settingNames}
        clientName={organizationName}
        preparedBy={preparedBy}
        disclaimerText="This model reflects conservative estimates derived from user inputs and aggregated deployment experience. All assumptions are documented. Projections do not constitute a guarantee of financial performance."
      />

      {/* PAGE 2: THE INVESTMENT CASE */}
      <InvestmentCasePage {...sharedProps} />

      {/* PAGE 3: VALUE TRAJECTORY */}
      <ValueTrajectoryPage {...sharedProps} chartData={chartData} paybackQuarter={paybackQuarter} />

      {/* PAGE 4: FINANCIAL SUMMARY + SENSITIVITY */}
      <FinancialSummaryPage {...sharedProps} />

      {/* PAGE 5: VALUE DRIVER DETAIL */}
      <ValueDriverDetailPage {...sharedProps} />

      {/* PAGE 6: MODEL CONFIDENCE */}
      <ModelConfidencePage {...sharedProps} />

      {/* PAGE 7: BACK COVER */}
      <Page size="LETTER" style={[S.page, { padding: 0 }]} wrap={false}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 72 }}>
          <Image src={abridgeLogoRed} style={{ width: 140, marginBottom: 24 }} />
          <View style={{ borderTopWidth: 2, borderTopColor: brand.coral, width: 80, marginBottom: 24 }} />
          {organizationName ? (
            <>
              <Text style={{ fontSize: 14, color: brand.textSecondary, marginBottom: 6 }}>Prepared for</Text>
              <Text style={{ fontSize: 22, fontFamily: "Abridge", fontWeight: 400, color: brand.textPrimary, marginBottom: 24 }}>
                {organizationName}
              </Text>
            </>
          ) : (
            <View style={{ marginBottom: 24 }} />
          )}
          <Text style={{ fontSize: 10, color: brand.textTertiary, marginBottom: 4 }}>{dateStr}</Text>
          {preparedBy && (
            <Text style={{ fontSize: 10, color: brand.textTertiary, marginBottom: 4 }}>Prepared by {preparedBy}</Text>
          )}
          <Text style={{ fontSize: 10, color: brand.textTertiary, marginBottom: 36 }}>
            {termLabel} Financial Proforma{settingNames ? ` · ${settingNames}` : ""}
          </Text>
          <View style={{ borderTopWidth: 1, borderTopColor: brand.midGray, width: "100%", marginBottom: 16 }} />
          <Text style={{ fontSize: 8, color: brand.textTertiary, textAlign: "center", lineHeight: 1.6, maxWidth: 380 }}>
            This document contains confidential information prepared exclusively for the intended recipient. Projections are modeled estimates and do not constitute a guarantee of financial outcomes.{" "}
            {"©"} {today.getFullYear()} Abridge AI, Inc. All rights reserved.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── SENSITIVITY HELPER ───────────────────────────────────────────────────────

function buildPDFSensitivity(
  cashFlows: ReturnType<typeof buildMonthlyCashFlows>,
  factor: number,
  termInvestment: number,
  termValue: number,
  useEconomicPayback: boolean,
): SensitivityScenario {
  const scaledValue = termValue * factor;
  const scaledNet   = scaledValue - termInvestment;
  const vtc         = termInvestment > 0 ? scaledValue / termInvestment : 0;
  const simpleROI   = termInvestment > 0 ? scaledNet   / termInvestment : 0;

  let paybackMonth: number | null = null;
  let wentNegative = false;
  let cumValue = 0;
  for (const row of cashFlows) {
    cumValue += row.totalValue;
    // Use same payback basis as base case — economic cumulative net for banked deals
    const baseCumNet = useEconomicPayback ? (row.economicCumulativeNet ?? row.cumulativeNet) : row.cumulativeNet;
    const scaledCumNet = baseCumNet + (factor - 1) * cumValue;
    if (scaledCumNet < 0) wentNegative = true;
    if (wentNegative && scaledCumNet >= 0 && paybackMonth === null) paybackMonth = row.period;
  }

  return { vtc, simpleROI, paybackMonth, termNet: scaledNet };
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────

/**
 * Builds the proforma PDF React element (derived props + JSX) WITHOUT
 * rasterizing it to a PDF blob. Exported so structural snapshot tests can
 * serialize the document tree deterministically. `generateProformaPDF` is the
 * only production caller and simply wraps this with `pdf(...).toBlob()`.
 */
export function buildProformaPDFDocument(
  settings: ProformaSettingSnapshot[],
  config: ProformaConfig,
  organizationName?: string,
  preparedBy?: string,
): ReactElement {
  const cashFlows  = buildMonthlyCashFlows(settings, config);
  const summary    = calculateProformaSummary(settings, config, cashFlows);
  const yearlyData = getYearlySummary(cashFlows, settings);
  const startDate  = getContractStartDate();

  const useEconomicPayback = settings.some(s => s.bankedEncounters && (s.pricingModel === "platform" || s.pricingModel === "perEncounter"));
  const sensitivityData: ProformaSensitivityData = {
    conservative: buildPDFSensitivity(cashFlows, 0.7, summary.termInvestment, summary.termValue, useEconomicPayback),
    optimistic:   buildPDFSensitivity(cashFlows, 1.3, summary.termInvestment, summary.termValue, useEconomicPayback),
  };

  const quarterlyData = groupByQuarter(cashFlows, startDate);
  const chartData: ChartBar[] = quarterlyData.map(q => ({
    label:             q.label,
    capacityValue:     q.capacityValue,
    workforceValue:    q.workforceValue,
    revenueValue:      q.revenueValue,
    qualityValue:      q.qualityValue,
    displacementValue: q.displacementValue,
    investment:        q.investment,
    total:             q.capacityValue + q.workforceValue + q.revenueValue + q.qualityValue + q.displacementValue,
  }));

  let paybackQuarter: string | null = null;
  if (summary.paybackMonth) {
    const monthIdx = summary.paybackMonth - 1;
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + monthIdx, 1);
    const q = Math.floor(d.getMonth() / 3) + 1;
    const yr = String(d.getFullYear()).slice(-2);
    paybackQuarter = `Q${q}'${yr}`;
  }

  return (
    <ProformaPDFDocument
      settings={settings}
      config={config}
      summary={summary}
      yearlyData={yearlyData}
      sensitivityData={sensitivityData}
      chartData={chartData}
      paybackQuarter={paybackQuarter}
      organizationName={organizationName}
      preparedBy={preparedBy}
    />
  );
}

export async function generateProformaPDF(
  settings: ProformaSettingSnapshot[],
  config: ProformaConfig,
  organizationName?: string,
  preparedBy?: string,
): Promise<void> {
  const blob = await pdf(
    buildProformaPDFDocument(settings, config, organizationName, preparedBy)
  ).toBlob();

  const org = organizationName ? organizationName.replace(/\s+/g, "-").toLowerCase() : "proforma";
  await savePdfBlob(blob, `abridge-${org}-proforma.pdf`);
}

// ─── SCENARIO COMPARISON PDF ──────────────────────────────────────────────────

const SCENARIO_PDF_PAGES = 5;

function ScenarioPageFooter({ pageNum, preparedBy }: { pageNum: number; preparedBy?: string }) {
  return (
    <View style={S.footer}>
      <Text style={S.footerLeft}>{preparedBy ? `Prepared by ${preparedBy}` : "Abridge Deal Structure Analysis"}</Text>
      <Text style={S.footerRight}>Page {pageNum} of {SCENARIO_PDF_PAGES}</Text>
    </View>
  );
}

function getScenarioAnnualInvestmentRows(
  setting: ProformaSettingSnapshot,
  config: ProformaConfig,
): { yearLabel: string; providers: number; encounters: number; util: number; investment: number; formula: string }[] {
  const pm = setting.pricingModel ?? "perUnit";
  const contractYears = Math.min(Math.ceil(config.contractTermMonths / 12), 3);
  const yearKeys = ["year1", "year2", "year3"] as const;
  const isExtended = Math.ceil(config.contractTermMonths / 12) > 3;

  return Array.from({ length: contractYears }, (_, i) => {
    const yk = yearKeys[i];
    const isLast = i === contractYears - 1;

    const providers = setting.yearlyProviders?.[yk]
      ?? (i === 0 ? setting.providerCount : setting.fullScaleProviders ?? setting.providerCount);

    const encPerProv = setting.providerCount > 0 ? setting.encounters / setting.providerCount : 0;
    const encounters = Math.round(setting.yearlyEncounters?.[yk] ?? providers * encPerProv);

    const yuSrc = setting.yearlyUtilization
      ?? (setting.careSetting === "nursing" && config.nursingYearlyUtilization
        ? config.nursingYearlyUtilization
        : config.yearlyUtilization);
    const util = yuSrc[yk];

    const priceOverride = setting.yearlyPricing?.[yk];
    const abridgeEnc = Math.round(encounters * util / 100);
    let investment = 0;
    let formula = "";
    const unitStr = (SETTING_UNIT_LABELS[setting.careSetting] ?? "providers").replace(/s$/, "");

    if (pm === "perUnit") {
      const rate = priceOverride ?? setting.costPerUnit;
      investment = rate * providers * 12;
      formula = `$${rate}/${unitStr}/mo × ${fmtNum(providers)} × 12 mo`;
    } else if (pm === "perEncounter") {
      const rate = priceOverride ?? (setting.costPerEncounter ?? 0);
      investment = rate * abridgeEnc;
      formula = `$${rate}/enc × ${fmtNum(abridgeEnc)} Abridge enc`;
    } else if (pm === "annualFlat") {
      investment = priceOverride ?? (setting.annualLicenseFee ?? 0);
      formula = "Fixed annual license";
    } else if (pm === "platform") {
      const fee = setting.annualLicenseFee ?? 0;
      const encRate = setting.platformEncRate ?? setting.costPerEncounter ?? 0;
      investment = fee + encRate * abridgeEnc;
      formula = `$${fmtNum(fee)}/yr + $${encRate}/enc × ${fmtNum(abridgeEnc)} Abridge enc`;
    }

    const yLabel = i < 2 ? `Year ${i + 1}` : isExtended && isLast ? "Year 3+" : "Year 3";
    return { yearLabel: yLabel, providers, encounters, util, investment, formula };
  });
}

function ScenarioOverviewPage({
  summaryA, summaryB, config, preparedBy,
}: {
  summaryA: ProformaSummary;
  summaryB: ProformaSummary;
  config: ProformaConfig;
  preparedBy?: string;
}) {
  const investDiff = summaryA.termInvestment - summaryB.termInvestment;
  const bWins = investDiff > 0;
  const winnerLabel = bWins ? "Scenario B" : "Scenario A";

  const roiDiffPts = (summaryB.simpleROI - summaryA.simpleROI) * 100;
  const paybackDiff = summaryA.paybackMonth != null && summaryB.paybackMonth != null
    ? summaryA.paybackMonth - summaryB.paybackMonth : null;

  const calloutParts: string[] = [];
  if (Math.abs(investDiff) > 1000)
    calloutParts.push(`${fmt(Math.abs(investDiff))} ${investDiff > 0 ? "less" : "more"} investment`);
  if (Math.abs(roiDiffPts) >= 1)
    calloutParts.push(`${Math.abs(roiDiffPts).toFixed(0)}% ${roiDiffPts > 0 ? "higher" : "lower"} ROI`);
  if (paybackDiff != null && Math.abs(paybackDiff) >= 1)
    calloutParts.push(`payback ${Math.abs(paybackDiff)} months ${paybackDiff > 0 ? "earlier" : "later"}`);

  const compRows = [
    { label: `${contractTermLabel(config.contractTermMonths)} Investment`, a: fmt(summaryA.termInvestment), b: fmt(summaryB.termInvestment), aWins: summaryA.termInvestment < summaryB.termInvestment, bWins: summaryB.termInvestment < summaryA.termInvestment },
    { label: `${contractTermLabel(config.contractTermMonths)} Value`, a: fmt(summaryA.termValue), b: fmt(summaryB.termValue), aWins: false, bWins: false },
    { label: "Net Value", a: fmt(summaryA.termNet), b: fmt(summaryB.termNet), aWins: summaryA.termNet > summaryB.termNet, bWins: summaryB.termNet > summaryA.termNet },
    { label: "Simple ROI", a: `${Math.round(summaryA.simpleROI * 100)}%`, b: `${Math.round(summaryB.simpleROI * 100)}%`, aWins: summaryA.simpleROI > summaryB.simpleROI, bWins: summaryB.simpleROI > summaryA.simpleROI },
    { label: "Value-to-Cost", a: `${summaryA.valueToCost.toFixed(1)}x`, b: `${summaryB.valueToCost.toFixed(1)}x`, aWins: summaryA.valueToCost > summaryB.valueToCost, bWins: summaryB.valueToCost > summaryA.valueToCost },
    { label: "Payback Month", a: summaryA.paybackMonth ? `Month ${summaryA.paybackMonth}` : "—", b: summaryB.paybackMonth ? `Month ${summaryB.paybackMonth}` : "—", aWins: (summaryA.paybackMonth ?? 999) < (summaryB.paybackMonth ?? 999), bWins: (summaryB.paybackMonth ?? 999) < (summaryA.paybackMonth ?? 999) },
  ];

  return (
    <Page size="LETTER" style={[S.page, S.contentPage]}>
      <PageHeader label="SCENARIO COMPARISON · OVERVIEW" />

      <Text style={S.eyebrow}>Bottom Line</Text>
      <View style={{
        flexDirection: "row",
        backgroundColor: brand.warmGray,
        borderRadius: 3,
        borderLeftWidth: 3,
        borderLeftColor: brand.coral,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginBottom: 16,
        alignItems: "flex-start",
      }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: 700, color: brand.coral }}>{winnerLabel}</Text>
            <Text style={{ fontSize: 13, fontWeight: 700, color: brand.textPrimary }}>is the stronger deal</Text>
          </View>
          {calloutParts.length > 0 && (
            <Text style={{ fontSize: 8.5, color: brand.textSecondary, lineHeight: 1.5 }}>
              {calloutParts.join("  ·  ")}
            </Text>
          )}
          <Text style={{ fontSize: 7.5, color: brand.textTertiary, marginTop: 5, lineHeight: 1.5 }}>
            Both scenarios deliver identical clinical value. The difference is entirely in pricing structure.
          </Text>
        </View>
      </View>

      <Text style={S.eyebrow}>Head-to-Head</Text>
      <View style={S.tableWrap}>
        <View style={S.tableHead}>
          <Text style={[S.tableHeadCell, { flex: 2 }]}>Metric</Text>
          <Text style={[S.tableHeadCell, { flex: 1.5, textAlign: "right" }]}>Scenario A</Text>
          <Text style={[S.tableHeadCell, { flex: 1.5, textAlign: "right", color: brand.coral }]}>Scenario B</Text>
        </View>
        {compRows.map((row, i) => (
          <View key={row.label} style={i < compRows.length - 1 ? S.tableRow : { ...S.tableRow, borderBottomWidth: 0 }}>
            <Text style={[S.tableCell, { flex: 2 }]}>{row.label}</Text>
            <View style={{ flex: 1.5, alignItems: "flex-end", paddingVertical: 1 }}>
              <Text style={row.aWins ? S.tableCellBold : S.tableCellMono}>{row.a}</Text>
              {row.aWins && <Text style={{ fontSize: 6, color: brand.textTertiary, marginTop: 1 }}>↑ better</Text>}
            </View>
            <View style={{ flex: 1.5, alignItems: "flex-end", paddingVertical: 1 }}>
              <Text style={row.bWins ? { ...S.tableCellBold, color: brand.coral } : S.tableCellMono}>{row.b}</Text>
              {row.bWins && <Text style={{ fontSize: 6, color: brand.coral, marginTop: 1 }}>↑ better</Text>}
            </View>
          </View>
        ))}
      </View>

      <View style={[S.insightBox, { marginTop: 12 }]}>
        <Text style={S.insightLabel}>What This Means</Text>
        <Text style={S.insightText}>
          Both scenarios are built on the same clinical assumptions and value drivers.
          The {fmt(summaryA.termValue)} in projected value does not change between scenarios —
          only the investment structure differs. Use Scenario A and B to evaluate which
          pricing model is the right fit given budget cycles, contracting flexibility, and risk tolerance.
        </Text>
      </View>

      <ScenarioPageFooter pageNum={2} preparedBy={preparedBy} />
    </Page>
  );
}

function ScenarioDealPage({
  scenario, settings, config, yearlyData, preparedBy, pageNum,
}: {
  scenario: "A" | "B";
  settings: ProformaSettingSnapshot[];
  config: ProformaConfig;
  yearlyData: ReturnType<typeof getYearlySummary>;
  preparedBy?: string;
  pageNum: number;
}) {
  const isB = scenario === "B";
  const contractYears = Math.ceil(config.contractTermMonths / 12);

  return (
    <Page size="LETTER" style={[S.page, S.contentPage]}>
      <PageHeader label={`SCENARIO ${scenario} · DEAL STRUCTURE`} />

      <Text style={isB ? S.eyebrow : S.eyebrowGray}>
        {isB ? "Scenario B — Alternative Deal Terms" : "Scenario A — Base Deal Terms"}
      </Text>

      {settings.map((setting) => {
        const pm = setting.pricingModel ?? "perUnit";
        const modelName = pm === "perUnit"
          ? `Per ${(SETTING_UNIT_LABELS[setting.careSetting] ?? "Provider").replace(/s$/, "")} / Month`
          : pm === "perEncounter" ? "Per Encounter"
          : pm === "annualFlat" ? "Annual License"
          : "Platform Fee + Per Encounter";

        const invRows = getScenarioAnnualInvestmentRows(setting, config);
        const subscriptionTotal = invRows.reduce((s, r) => s + r.investment, 0);
        const isNursing = setting.careSetting === "nursing";

        return (
          <View key={setting.id} style={{ marginBottom: 16 }}>
            {/* Setting header */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 7 }}>
              <View style={{ width: 3, height: 16, backgroundColor: setting.color, marginRight: 8, borderRadius: 2 }} />
              <Text style={{ fontSize: 11, fontWeight: 700, color: brand.textPrimary, marginRight: 8 }}>{setting.label}</Text>
              <View style={{ backgroundColor: setting.color + "18", borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8 }}>
                <Text style={{ fontSize: 7, fontWeight: 600, color: setting.color, textTransform: "uppercase", letterSpacing: 0.8 }}>{modelName}</Text>
              </View>
              <Text style={{ fontSize: 8, color: brand.textTertiary, marginLeft: "auto" }}>Go-live Month {setting.goLiveMonth}</Text>
            </View>

            {/* Volume & investment table */}
            <View style={S.tableWrap}>
              <View style={S.tableHead}>
                <Text style={[S.tableHeadCell, { flex: 0.8 }]}>Period</Text>
                <Text style={[S.tableHeadCell, { flex: 1.2 }]}>{SETTING_UNIT_LABELS[setting.careSetting] ?? "Providers"}</Text>
                <Text style={[S.tableHeadCell, { flex: 0.9 }]}>Util %</Text>
                {!isNursing && <Text style={[S.tableHeadCell, { flex: 1.1 }]}>Encounters</Text>}
                <Text style={[S.tableHeadCell, { flex: 2.5 }]}>Investment Formula</Text>
                <Text style={[S.tableHeadCell, { flex: 1, textAlign: "right" }]}>Annual</Text>
              </View>
              {invRows.map((row, i) => (
                <View key={i} style={i < invRows.length - 1 ? S.tableRow : { ...S.tableRow, borderBottomWidth: 0 }}>
                  <Text style={[S.tableCellMono, { flex: 0.8 }]}>{row.yearLabel}</Text>
                  <Text style={[S.tableCell, { flex: 1.2 }]}>{fmtNum(row.providers)}</Text>
                  <Text style={[S.tableCell, { flex: 0.9 }]}>{row.util}%</Text>
                  {!isNursing && <Text style={[S.tableCell, { flex: 1.1 }]}>{fmtNum(row.encounters)}</Text>}
                  <Text style={[S.tableCellMono, { flex: 2.5, fontSize: 7.5 }]}>{row.formula}</Text>
                  <Text style={[S.tableCellBold, { flex: 1, textAlign: "right" }]}>{fmt(row.investment)}</Text>
                </View>
              ))}
            </View>

            {/* Cost notes */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingHorizontal: 2 }}>
              <Text style={{ fontSize: 7.5, color: brand.textTertiary }}>
                {setting.implementationFee > 0
                  ? `+ ${fmt(setting.implementationFee)} one-time implementation fee (Month ${setting.goLiveMonth})`
                  : "No implementation fee"}
              </Text>
              <Text style={{ fontSize: 7.5, fontWeight: 600, color: brand.textSecondary }}>
                Subscription total: {fmt(subscriptionTotal)}
                {setting.implementationFee > 0 ? `  ·  All-in: ${fmt(subscriptionTotal + setting.implementationFee)}` : ""}
              </Text>
            </View>
          </View>
        );
      })}

      {/* Year-by-year P&L */}
      <View style={S.divider} />
      <Text style={S.eyebrowGray}>Year-by-Year Cash Flow</Text>
      <View style={[S.tableWrap, { marginTop: 8 }]}>
        <View style={S.tableHead}>
          <Text style={[S.tableHeadCell, { flex: 1 }]}>Year</Text>
          <Text style={[S.tableHeadCell, { flex: 1.5, textAlign: "right" }]}>Value Realized</Text>
          <Text style={[S.tableHeadCell, { flex: 1.5, textAlign: "right" }]}>Investment</Text>
          <Text style={[S.tableHeadCell, { flex: 1.5, textAlign: "right" }]}>Net</Text>
          <Text style={[S.tableHeadCell, { flex: 1.5, textAlign: "right" }]}>Cumulative Net</Text>
        </View>
        {(() => {
          let cumulative = 0;
          return yearlyData.map((yr, i) => {
            cumulative += yr.netValue;
            const isLast = i === yearlyData.length - 1;
            return (
              <View key={yr.label} style={isLast ? { ...S.tableRow, borderBottomWidth: 0 } : S.tableRow}>
                <Text style={[S.tableCell, { flex: 1 }]}>{yr.label}</Text>
                <Text style={[S.tableCell, { flex: 1.5, textAlign: "right" }]}>{fmt(yr.totalValue)}</Text>
                <Text style={[S.tableCell, { flex: 1.5, textAlign: "right" }]}>{fmt(yr.investment)}</Text>
                <Text style={[yr.netValue >= 0 ? S.tableCellGreen : S.tableCellRed, { flex: 1.5, textAlign: "right" }]}>{fmt(yr.netValue)}</Text>
                <Text style={[{ flex: 1.5, textAlign: "right", fontSize: 8.5, fontWeight: 600, color: cumulative >= 0 ? brand.positive : brand.textSecondary }]}>{fmt(cumulative)}</Text>
              </View>
            );
          });
        })()}
        <View style={S.tableRowTotal}>
          <Text style={[S.tableCellBold, { flex: 1 }]}>Total ({contractYears}-Year)</Text>
          <Text style={[S.tableCellBold, { flex: 1.5, textAlign: "right" }]}>{fmt(yearlyData.reduce((s, r) => s + r.totalValue, 0))}</Text>
          <Text style={[S.tableCellBold, { flex: 1.5, textAlign: "right" }]}>{fmt(yearlyData.reduce((s, r) => s + r.investment, 0))}</Text>
          <Text style={[S.tableCellBold, { flex: 1.5, textAlign: "right", color: brand.coral }]}>{fmt(yearlyData.reduce((s, r) => s + r.netValue, 0))}</Text>
          <Text style={[{ flex: 1.5 }]} />
        </View>
      </View>

      <ScenarioPageFooter pageNum={pageNum} preparedBy={preparedBy} />
    </Page>
  );
}

function ScenarioDriversPage({
  settings, config, preparedBy,
}: {
  settings: ProformaSettingSnapshot[];
  config: ProformaConfig;
  preparedBy?: string;
}) {
  const totalValue = settings.reduce((s, v) => s + v.drivers.filter(d => d.value > 0).reduce((a, d) => a + d.value, 0), 0);

  return (
    <Page size="LETTER" style={[S.page, S.contentPage]}>
      <PageHeader label="SHARED VALUE DRIVERS" />

      <Text style={S.eyebrow}>Value Drivers</Text>
      <Text style={S.sectionIntro}>
        These clinical inputs are identical across both scenarios. They represent the value Abridge creates
        regardless of deal structure. Changing the contract pricing does not change these projections.
      </Text>

      {settings.map((setting) => {
        const active = setting.drivers.filter(d => d.value > 0);
        if (active.length === 0) return null;
        return (
          <View key={setting.id} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
              <View style={{ width: 3, height: 12, backgroundColor: setting.color, marginRight: 8, borderRadius: 2 }} />
              <Text style={{ fontSize: 10, fontWeight: 700, color: brand.textPrimary }}>{setting.label}</Text>
            </View>
            <View style={S.tableWrap}>
              <View style={S.tableHead}>
                <Text style={[S.tableHeadCell, { flex: 3 }]}>Driver</Text>
                <Text style={[S.tableHeadCell, { flex: 1 }]}>Domain</Text>
                <Text style={[S.tableHeadCell, { flex: 1, textAlign: "right" }]}>Annual Value</Text>
                <Text style={[S.tableHeadCell, { flex: 1.2, textAlign: "right" }]}>Onset</Text>
              </View>
              {active.map((driver, i) => {
                const dColor = DOMAIN_COLORS[driver.quadrant] ?? brand.black;
                return (
                  <View key={driver.id} style={i < active.length - 1 ? S.tableRow : { ...S.tableRow, borderBottomWidth: 0 }}>
                    <Text style={[S.tableCell, { flex: 3 }]}>{driver.name}</Text>
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: dColor, marginRight: 4 }} />
                      <Text style={{ fontSize: 8, color: brand.textSecondary }}>{driver.quadrant}</Text>
                    </View>
                    <Text style={[S.tableCellBold, { flex: 1, textAlign: "right" }]}>{fmt(driver.value)}</Text>
                    <Text style={[S.tableCellMono, { flex: 1.2, textAlign: "right", textTransform: "capitalize" }]}>{driver.onset === "custom" ? `Month ${Math.max(1, Math.round(driver.customOnsetMonths ?? 1))}` : driver.onset}</Text>
                  </View>
                );
              })}
              <View style={S.tableRowTotal}>
                <Text style={[S.tableCellBold, { flex: 3 }]}>{setting.label} Total</Text>
                <Text style={{ flex: 1 }} />
                <Text style={[S.tableCellBold, { flex: 1, textAlign: "right", color: brand.coral }]}>{fmt(active.reduce((s, d) => s + d.value, 0))}</Text>
                <Text style={{ flex: 1.2 }} />
              </View>
            </View>
          </View>
        );
      })}

      <View style={[S.insightBox, { marginTop: 8 }]}>
        <Text style={S.insightLabel}>Grand Total — All Settings</Text>
        <Text style={[S.insightText, { fontWeight: 600, fontSize: 11 }]}>
          {fmt(totalValue)} in annual run-rate value at full scale
        </Text>
        <Text style={[S.insightText, { marginTop: 3 }]}>
          This figure is the shared ceiling for both scenarios. Investment structure determines how quickly and
          cost-effectively the organization reaches it.
        </Text>
      </View>

      <ScenarioPageFooter pageNum={5} preparedBy={preparedBy} />
    </Page>
  );
}

function ScenarioComparisonDocument({
  settingsA, settingsB, config,
  summaryA, summaryB,
  yearlyDataA, yearlyDataB,
  organizationName, preparedBy,
}: {
  settingsA: ProformaSettingSnapshot[];
  settingsB: ProformaSettingSnapshot[];
  config: ProformaConfig;
  summaryA: ProformaSummary;
  summaryB: ProformaSummary;
  yearlyDataA: ReturnType<typeof getYearlySummary>;
  yearlyDataB: ReturnType<typeof getYearlySummary>;
  organizationName?: string;
  preparedBy?: string;
}) {
  return (
    <Document>
      <PDFCoverPage
        reportLabel="DEAL STRUCTURE ANALYSIS"
        title="Scenario Comparison"
        subtitle="Side-by-side pricing and ramp analysis"
        clientName={organizationName}
        preparedBy={preparedBy}
        showPreparedBy={!!preparedBy}
      />
      <ScenarioOverviewPage summaryA={summaryA} summaryB={summaryB} config={config} preparedBy={preparedBy} />
      <ScenarioDealPage scenario="A" settings={settingsA} config={config} yearlyData={yearlyDataA} preparedBy={preparedBy} pageNum={3} />
      <ScenarioDealPage scenario="B" settings={settingsB} config={config} yearlyData={yearlyDataB} preparedBy={preparedBy} pageNum={4} />
      <ScenarioDriversPage settings={settingsA} config={config} preparedBy={preparedBy} />
    </Document>
  );
}

export async function generateScenarioComparisonPDF(
  settings: ProformaSettingSnapshot[],
  config: ProformaConfig,
  organizationName?: string,
  preparedBy?: string,
): Promise<void> {
  const settingsA = settings;
  const settingsB = settings.map(s => s.scenarioB ? { ...s, ...s.scenarioB } : s);

  const cashFlowsA = buildMonthlyCashFlows(settingsA, config);
  const cashFlowsB = buildMonthlyCashFlows(settingsB, config);

  const summaryA = calculateProformaSummary(settingsA, config, cashFlowsA);
  const summaryB = calculateProformaSummary(settingsB, config, cashFlowsB);

  const yearlyDataA = getYearlySummary(cashFlowsA, settingsA);
  const yearlyDataB = getYearlySummary(cashFlowsB, settingsB);

  const blob = await pdf(
    <ScenarioComparisonDocument
      settingsA={settingsA}
      settingsB={settingsB}
      config={config}
      summaryA={summaryA}
      summaryB={summaryB}
      yearlyDataA={yearlyDataA}
      yearlyDataB={yearlyDataB}
      organizationName={organizationName}
      preparedBy={preparedBy}
    />
  ).toBlob();

  const org = organizationName ? organizationName.replace(/\s+/g, "-").toLowerCase() : "proforma";
  await savePdfBlob(blob, `abridge-${org}-scenario-comparison.pdf`);
}
