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
    { src: manropeRegular, fontWeight: 400, fontStyle: "italic" },
    { src: manropeBold, fontWeight: 700, fontStyle: "italic" },
  ],
});
Font.registerHyphenationCallback((w) => [w]);

// ─── Color system ─────────────────────────────────────────────────────────────

const colors = {
  primary: "#EA2C00",
  primaryText: "#1A1A1A",
  secondary: "#666666",
  tertiary: "#999999",
  cards: "#F5F0EB",
  separator: "#E5DCD0",
  separatorHeavy: "#D4C9BC",
  background: "#FFFFFF",
};

const domainColors: Record<string, string> = {
  Capacity:  "#2563EB",
  Workforce: "#7C3AED",
  Revenue:   "#EA2C00",
  Quality:   "#059669",
};

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

const domainCalibrationNotes: Record<string, string> = {
  Capacity:  "Calibration: Time savings are measured from documentation completion timestamps. Conversion to capacity or wellbeing value requires an additional operational assumption about where that time went — which is why realization rates on capacity drivers are typically set at 50–75%, not 100%.",
  Workforce: "Calibration: Retention impact is modeled using a threshold approach that acknowledges diminishing returns. Not every hour of documentation relief prevents a departure. The attrition reduction percentages used here reflect organizations with moderate documentation burden — conservative relative to top-quartile benchmarks.",
  Revenue:   "Calibration: Revenue improvement requires both better documentation and downstream coding execution. Attribution percentages on revenue drivers account for coding team behavior, payer policies, and timing — factors outside Abridge's direct control. Studies show 8–15% of encounters are systematically undercoded due to documentation gaps; the figures above use the lower end of that range.",
  Quality:   "Calibration: Clinical quality improvement compounds over time, which makes point-in-time measurement inherently conservative. The figures shown reflect what has been captured in the current measurement window. Organizations that continue measurement past 12 months consistently find that quality value grows faster than capacity or workforce value.",
};

const domainMeasurementRoadmaps: Record<string, Array<{ window: string; metric: string; source: string }>> = {
  Capacity: [
    { window: "Month 1–3", metric: "Documentation time per encounter and note completion rate", source: "EHR audit logs" },
    { window: "Month 3–6", metric: "Time reallocation signals — earlier sign-offs, reduced after-hours charting", source: "EHR timestamps" },
    { window: "Month 6–12+", metric: "Provider capacity utilization and schedule density changes", source: "Scheduling + EHR" },
  ],
  Workforce: [
    { window: "Month 1–3", metric: "After-hours charting frequency and documentation time per shift", source: "EHR audit logs" },
    { window: "Month 3–6", metric: "Burnout and satisfaction survey scores, PTO utilization trends", source: "HR + survey data" },
    { window: "Month 6–12+", metric: "Voluntary attrition rate vs. prior-year baseline", source: "HR records" },
  ],
  Revenue: [
    { window: "Month 1–3", metric: "E/M level distribution and documentation specificity scores", source: "EHR + coding audit" },
    { window: "Month 3–6", metric: "First-pass denial rate and wRVU capture vs. prior year", source: "RCM system" },
    { window: "Month 6–12+", metric: "HCC capture rate, CDI query reduction, net revenue per encounter", source: "Revenue Cycle + Coding" },
  ],
  Quality: [
    { window: "Month 1–3", metric: "Documentation completeness score and problem list accuracy", source: "EHR / CDI audit" },
    { window: "Month 3–6", metric: "CDI query rate and care gap closure rate", source: "CDI program + Quality" },
    { window: "Month 6–12+", metric: "Risk-adjusted quality scores and HEDIS measure performance", source: "Quality scorecard" },
  ],
};

const SETTING_SHORT_LABELS: Record<string, string> = {
  outpatient: "Outpatient",
  ed: "ED",
  inpatient: "Inpatient",
  nursing: "Nursing",
};

const DATA_SOURCE_LABELS: Record<string, string> = {
  ehr: "EHR data",
  survey: "Survey",
  admin_data: "Admin data",
  chart_review: "Chart review",
  manual_entry: "Manual entry",
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
    fontSize: 10.5,
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
    fixed
  >
    <Text style={{ fontSize: 8.5, color: colors.secondary, flex: 1 }}>{`${orgName} · ${settingLabel}`}</Text>
    <Text
      style={{ fontSize: 8.5, color: colors.tertiary, textAlign: "right", width: 72 }}
      render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
        `Page ${pageNumber - 1} / ${totalPages - 1}`
      }
    />
  </View>
);

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
        {"Solid: With Abridge   Dashed: Baseline"}
      </Text>
    </View>
  );
}

// ─── Measurement Roadmap card ─────────────────────────────────────────────────

function MeasurementRoadmapCard({ domain }: { domain: string }) {
  const milestones = domainMeasurementRoadmaps[domain];
  if (!milestones) return null;
  return (
    <View style={{ borderRadius: 4, borderWidth: 1, borderColor: colors.separator, marginTop: 12, marginBottom: 6 }} wrap={false}>
      <View style={{ backgroundColor: colors.cards, paddingVertical: 7, paddingHorizontal: 10, borderTopLeftRadius: 4, borderTopRightRadius: 4 }}>
        <Text style={{ fontSize: 7, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 2 }}>
          Measurement Roadmap
        </Text>
      </View>
      {milestones.map((m, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            paddingVertical: 7,
            paddingHorizontal: 10,
            borderTopWidth: 1,
            borderTopColor: colors.separator,
            backgroundColor: i % 2 === 0 ? "#FFFFFF" : colors.cards + "66",
          }}
        >
          <Text style={{ width: 64, fontSize: 7.5, fontWeight: "bold", color: colors.secondary, lineHeight: 1.4 }}>{m.window}</Text>
          <Text style={{ flex: 1, fontSize: 7.5, color: colors.primaryText, lineHeight: 1.4 }}>{m.metric}</Text>
          <Text style={{ width: 84, fontSize: 7, color: colors.tertiary, textAlign: "right", lineHeight: 1.4 }}>{m.source}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Driver card ──────────────────────────────────────────────────────────────

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
  const vpuStr = vpu >= 1 ? `$${vpu % 1 === 0 ? vpu.toFixed(0) : vpu.toFixed(2)}` : `$${vpu.toFixed(4).replace(/\.?0+$/, "")}`;

  const steps = [
    {
      topLabel: "CHANGE",
      value: `${deltaSign}${fmtNum(driver.delta)}`,
      bottomLabel: unit,
    },
    {
      topLabel: "VALUE / UNIT",
      value: vpuStr,
      bottomLabel: `per ${unitLabel}`,
    },
    {
      topLabel: "ATTRIBUTION",
      value: `${driver.attributionPercent}%`,
      bottomLabel: "credited to Abridge",
    },
    {
      topLabel: "REALIZED",
      value: fmtCurrency(driver.realizedValue),
      bottomLabel: "per year",
      accent: true,
    },
  ];

  return (
    <View style={{ marginTop: 6, marginBottom: 2 }} wrap={false}>
      <Text style={{ fontSize: 6.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
        How this was calculated
      </Text>
      <View style={{ flexDirection: "row", backgroundColor: colors.background, borderRadius: 3, borderWidth: 1, borderColor: colors.separator }}>
        {steps.map((step, i) => (
          <View
            key={step.topLabel}
            style={{
              flex: 1,
              paddingVertical: 6,
              paddingHorizontal: 8,
              alignItems: "center",
              borderRightWidth: i < steps.length - 1 ? 1 : 0,
              borderRightColor: colors.separator,
              backgroundColor: step.accent ? accentColor + "0A" : "transparent",
            }}
          >
            <Text style={{ fontSize: 6, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 }}>
              {step.topLabel}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: "bold", color: step.accent ? accentColor : colors.primaryText, lineHeight: 1.1 }}>
              {step.value}
            </Text>
            {step.bottomLabel ? (
              <Text style={{ fontSize: 6.5, color: colors.tertiary, marginTop: 2, textAlign: "center" }}>
                {step.bottomLabel}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function DriverCard({
  driver,
  accentColor,
  showDollars = true,
  showDataSource = false,
  showSetting = false,
}: {
  driver: MeasurePDFDriver;
  accentColor: string;
  showDollars?: boolean;
  showDataSource?: boolean;
  showSetting?: boolean;
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
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5, marginBottom: 2 }}>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.3 }}>
              {driver.label}
            </Text>
            {showSetting && driver.setting && (
              <View style={{ backgroundColor: accentColor + "18", borderRadius: 2, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 6.5, color: accentColor, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.8 }}>
                  {SETTING_SHORT_LABELS[driver.setting] ?? driver.setting}
                </Text>
              </View>
            )}
            {showDataSource && dataSourceLabel && (
              <View style={{ backgroundColor: colors.cards, borderRadius: 2, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 6.5, color: colors.secondary, textTransform: "uppercase", letterSpacing: 0.8 }}>
                  {dataSourceLabel}
                </Text>
              </View>
            )}
            {showDataSource && measuredAtLabel && (
              <View style={{ backgroundColor: colors.cards, borderRadius: 2, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 6.5, color: colors.secondary }}>
                  {measuredAtLabel}
                </Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.4 }}>
            {driver.shortDescription}
          </Text>
        </View>
        {isQuant && showDollars && (
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: accentColor, lineHeight: 1.1 }}>
              {fmtCurrency(driver.realizedValue)}
            </Text>
            <Text style={{ fontSize: 7, color: colors.tertiary }}>realized / yr</Text>
          </View>
        )}
      </View>

      {isQuant ? (
        <>
          {/* Before / With / Change — lightweight secondary evidence row */}
          <View style={{ flexDirection: "row", backgroundColor: colors.cards, borderRadius: 3, marginTop: 4, marginBottom: 4 }}>
            {[
              { label: "Before", value: driver.withoutAbridge, color: colors.secondary },
              { label: "With Abridge", value: driver.withAbridge, color: colors.primaryText },
              { label: "Change", value: driver.delta, color: accentColor, prefix: deltaSign },
            ].map(({ label, value, color: cellColor, prefix = "" }, i) => (
              <View
                key={label}
                style={{
                  flex: 1,
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  alignItems: "center",
                  borderRightWidth: i < 2 ? 1 : 0,
                  borderRightColor: colors.separator,
                }}
              >
                <Text style={{ fontSize: 6.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>
                  {label}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "bold", color: cellColor, lineHeight: 1.1 }}>
                  {`${prefix}${fmtNum(value)}`}
                </Text>
                {unit ? (
                  <Text style={{ fontSize: 6.5, color: colors.tertiary, marginTop: 1 }}>{unit}</Text>
                ) : null}
              </View>
            ))}
          </View>

          {/* Calculation chain — visual step-by-step breakdown (financial audiences) */}
          {showDollars && (
            <CalcChainRow driver={driver} accentColor={accentColor} />
          )}

          {/* Attribution context note — surfaces methodology when attribution is partial */}
          {showDollars && driver.attributionPercent < 100 && driver.attributionPercent > 0 && driver.realizedValue > 0 && (
            <View style={{ marginTop: 5, flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.tertiary, marginTop: 4, marginRight: 5, flexShrink: 0 }} />
              <Text style={{ fontSize: 7.5, color: colors.secondary, fontStyle: "italic", lineHeight: 1.45, flex: 1 }}>
                {`Attribution set to ${driver.attributionPercent}%: the remaining ${100 - driver.attributionPercent}% of the observed change is credited to concurrent factors — staffing, workflow changes, or other initiatives running in parallel.`}
              </Text>
            </View>
          )}

          {hasMonthly && driver.monthlyData && (
            <Sparkline data={driver.monthlyData} color={accentColor} />
          )}

          {driver.notes && (
            <Text style={{ fontSize: 8, color: colors.secondary, fontStyle: "italic", marginTop: 6 }}>
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
            Tracked as a leading indicator. Not included in financial totals.
          </Text>
        </>
      )}
    </View>
  );
}

// ─── Narrative generators ─────────────────────────────────────────────────────

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

function buildClinicalNarrative(data: MeasurePDFData): string {
  const orgName = data.organizationName || "Your organization";
  const allDrivers = data.quadrants.flatMap((q) => q.drivers);
  const qualDrivers = allDrivers.filter((d) => d.visibility === "qualitative");
  const activeDomains = data.quadrants.filter((q) => q.drivers.length > 0);

  if (allDrivers.length === 0) {
    return `${orgName} has deployed Abridge. Measurement tracking is in progress.`;
  }

  let text = `${orgName} is tracking ${allDrivers.length} clinical outcome${allDrivers.length !== 1 ? "s" : ""} across ${activeDomains.length} domain${activeDomains.length !== 1 ? "s" : ""}.`;

  if (qualDrivers.length > 0) {
    text += ` ${qualDrivers.length} of these are directional signals that capture where Abridge is having an effect before it translates into a financial figure.`;
  }

  return text;
}

// ─── Executive Summary page ───────────────────────────────────────────────────

function ExecutiveSummaryPage({ data, showDollars }: { data: MeasurePDFData; showDollars: boolean }) {
  const orgName = data.organizationName || "Your Organization";
  const narrative = showDollars ? buildNarrative(data) : buildClinicalNarrative(data);
  const hasNetValue = showDollars && data.bestPricingNet !== undefined && data.bestPricingInvestment !== undefined;
  const roi = hasNetValue && data.bestPricingInvestment! > 0
    ? (data.totalRealized / data.bestPricingInvestment!).toFixed(1)
    : null;

  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.pageWrapper}>
        <SectionLabel>{showDollars ? "REALIZED VALUE SUMMARY" : "DEPLOYMENT OUTCOMES"}</SectionLabel>

        {/* Hero */}
        <View style={[styles.cardBg, { marginBottom: 12, paddingVertical: 20 }]}>
          <Text style={{ fontSize: 8.5, color: colors.secondary, textTransform: "uppercase", letterSpacing: 2.5, fontWeight: "bold", marginBottom: 6 }}>
            {showDollars && data.totalRealized > 0
              ? `Realized Annual Value · ${data.careSettingLabel}`
              : `Outcomes Measured · ${data.careSettingLabel}`}
          </Text>
          {showDollars && data.totalRealized > 0 ? (
            <Text style={{ fontSize: 38, fontWeight: "bold", color: colors.primary, lineHeight: 1.0, marginBottom: 8 }}>
              {fmtCurrency(data.totalRealized)}
            </Text>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
              <Text style={{ fontSize: 38, fontWeight: "bold", color: colors.primaryText, lineHeight: 1.0 }}>
                {`${data.driversTrackedCount}`}
              </Text>
              <Text style={{ fontSize: 14, color: colors.secondary }}>
                {data.driversTrackedCount === 1 ? "outcome tracked" : "outcomes tracked"}
              </Text>
            </View>
          )}
          <Text style={{ fontSize: 9, color: colors.secondary, marginBottom: 10 }}>
            {showDollars && data.totalRealized > 0
              ? `Across ${data.driversTrackedCount} financial driver${data.driversTrackedCount !== 1 ? "s" : ""}, attribution-adjusted`
              : `Across 4 domains · ${data.careSettingLabel}`}
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

        {/* Net value / investment / ROI strip */}
        {hasNetValue && (
          <View style={{ flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 4, borderWidth: 1, borderColor: colors.separator, marginBottom: 12 }}>
            {[
              { label: "Annual Investment", value: fmtCurrency(data.bestPricingInvestment!), color: colors.primaryText },
              { label: "Net Annual Value", value: fmtCurrency(data.bestPricingNet!), color: data.bestPricingNet! >= 0 ? "#059669" : colors.primary },
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
        <Text style={styles.subSectionHeader}>
          {showDollars ? "Value by Domain" : "Coverage by Domain"}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          {(["Capacity", "Workforce", "Revenue", "Quality"] as const).map((qName) => {
            const q = data.quadrants.find((x) => x.quadrant === qName);
            const total = q?.realizedTotal ?? 0;
            const dColor = domainColors[qName] ?? colors.secondary;
            const quantCount = q?.drivers.filter((d) => d.visibility === "quantified").length ?? 0;
            const qualCount = q?.drivers.filter((d) => d.visibility === "qualitative").length ?? 0;
            const driverCount = q?.drivers.length ?? 0;
            const hasAny = driverCount > 0;
            return (
              <View
                key={qName}
                style={{
                  flex: 1,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: hasAny ? dColor + "40" : colors.separator,
                  padding: 10,
                  alignItems: "center",
                }}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: hasAny ? dColor : colors.separator, marginBottom: 5 }} />
                <Text style={{ fontSize: 7.5, fontWeight: "bold", color: hasAny ? dColor : colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>
                  {qName}
                </Text>
                {showDollars ? (
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: total > 0 ? colors.primaryText : colors.tertiary }}>
                    {total > 0 ? fmtCurrency(total) : (qualCount > 0 ? "Signals" : "Upcoming")}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: hasAny ? colors.primaryText : colors.tertiary }}>
                    {hasAny ? `${driverCount}` : "Upcoming"}
                  </Text>
                )}
                {hasAny && (
                  <Text style={{ fontSize: 6.5, color: colors.tertiary, marginTop: 2, textAlign: "center" }}>
                    {showDollars && quantCount > 0
                      ? `${quantCount} financial${qualCount > 0 ? ` + ${qualCount} signal${qualCount !== 1 ? "s" : ""}` : ""}`
                      : `outcome${driverCount !== 1 ? "s" : ""}`}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Narrative */}
        <Text style={{ fontSize: 9.5, color: colors.secondary, lineHeight: 1.65, marginBottom: 12 }}>
          {narrative}
        </Text>

        {/* ROI context — explains what the multiple means when pricing data is present */}
        {roi && (
          <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.55, marginBottom: 12, fontStyle: "italic" }}>
            {`A ${roi}× return means that for every dollar invested in Abridge, ${roi} dollars of attribution-adjusted value has been measured across the drivers in this document. This multiple will grow as additional drivers are configured and measurement matures.`}
          </Text>
        )}

        {/* About This Document — measurement philosophy upfront */}
        <View style={{ backgroundColor: colors.cards, borderRadius: 4, padding: 14, marginBottom: 14 }}>
          <Text style={{ fontSize: 7, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>
            About This Document
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {[
              "All figures derive from actual deployment data — EHR records, survey responses, or operational logs collected during this deployment. No figure uses benchmark-based extrapolation from other organizations.",
              "Attribution percentages are set manually per driver, visible on every calculation row in this document. Partial attribution is not a limitation — it is the methodology. It reflects honest accounting of concurrent factors.",
              "Drivers tracked without a dollar figure are leading indicators for future measurement cycles. They are excluded from financial totals because the causal chain has not yet been fully quantified — not because the outcome isn't real.",
            ].map((point, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", width: "100%" }}>
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 4.5, marginRight: 8, flexShrink: 0 }} />
                <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.55, flex: 1 }}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

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
  showDollars,
}: {
  section: MeasurePDFQuadrantSection;
  data: MeasurePDFData;
  showDollars: boolean;
}) {
  const orgName = data.organizationName || "Your Organization";
  const accentColor = domainColors[section.quadrant] ?? colors.primary;
  const subtitle = domainSubtitles[section.quadrant] ?? "";
  const intro = domainIntros[section.quadrant] ?? "";
  const takeaway = domainTakeaways[section.quadrant] ?? "";
  const calibrationNote = domainCalibrationNotes[section.quadrant] ?? "";
  const quantified = section.drivers.filter((d) => d.visibility === "quantified");
  const qualitative = section.drivers.filter((d) => d.visibility === "qualitative");
  const showDataSource = data.audience === 'financial';

  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.pageWrapper}>
        {/* Domain header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <View style={{ flex: 1, marginRight: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: accentColor, marginRight: 8 }} />
              <Text style={{ fontSize: 14, fontWeight: "bold", color: accentColor, textTransform: "uppercase", letterSpacing: 1.5 }}>
                {section.quadrant}
              </Text>
              {quantified.length > 0 && (
                <Text style={{ fontSize: 9, color: colors.tertiary, marginLeft: 8 }}>
                  {`${quantified.length} financial driver${quantified.length !== 1 ? "s" : ""}${qualitative.length > 0 ? ` + ${qualitative.length} signal${qualitative.length !== 1 ? "s" : ""}` : ""}`}
                </Text>
              )}
            </View>
            <Text style={{ fontSize: 9.5, color: colors.secondary, fontStyle: "italic", lineHeight: 1.4 }}>{subtitle}</Text>
          </View>
          {showDollars && section.realizedTotal > 0 && (
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

        <View style={{ borderBottomWidth: 1.5, borderBottomColor: accentColor + "40", marginBottom: 12 }} />

        {/* Domain intro — mechanism + what the data covers */}
        {intro && (
          <Text style={{ fontSize: 9.5, color: colors.secondary, lineHeight: 1.65, marginBottom: 14 }}>
            {intro}
          </Text>
        )}

        {quantified.length > 0 && (
          <>
            {quantified.map((driver) => (
              <DriverCard
                key={`${driver.id}-${driver.setting}`}
                driver={driver}
                accentColor={accentColor}
                showDollars={showDollars}
                showDataSource={showDataSource}
                showSetting={data.isMultiSetting}
              />
            ))}
          </>
        )}

        {/* Domain takeaway — framing the numbers in context after they've been seen */}
        {showDollars && quantified.length > 0 && takeaway && (
          <View style={{ backgroundColor: colors.cards, borderRadius: 4, padding: 12, marginTop: 4, marginBottom: 6 }} wrap={false}>
            <Text style={{ fontSize: 7, color: colors.secondary, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>
              Reading This Section
            </Text>
            <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.55 }}>
              {takeaway}
            </Text>
          </View>
        )}

        {/* Calibration note — explains methodology conservatism for this domain */}
        {showDollars && quantified.length > 0 && calibrationNote && (
          <View style={{ borderLeftWidth: 2, borderLeftColor: accentColor + "60", paddingLeft: 10, marginBottom: 8 }} wrap={false}>
            <Text style={{ fontSize: 7.5, color: colors.tertiary, lineHeight: 1.5 }}>
              {calibrationNote}
            </Text>
          </View>
        )}

        {/* Measurement roadmap — always shown; fills sparse pages and educates the reader */}
        <MeasurementRoadmapCard domain={section.quadrant} />

        {qualitative.length > 0 && (
          <>
            <Text style={[styles.subSectionHeader, { marginTop: quantified.length > 0 ? 8 : 0 }]}>
              Signals to Track
            </Text>
            <View style={{ backgroundColor: colors.cards, borderRadius: 4, padding: 12 }}>
              <Text style={{ fontSize: 8.5, color: colors.secondary, marginBottom: 10, lineHeight: 1.55 }}>
                These drivers are tracked as directional indicators, not financial contributors. They are excluded from totals above because the causal chain from documentation to dollar value has not yet been fully quantified for this deployment. They typically become financial drivers in subsequent measurement cycles as data quality and sample size improve.
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

// ─── Love Stories page ────────────────────────────────────────────────────────

function LoveStoriesPage({ data }: { data: MeasurePDFData }) {
  const orgName = data.organizationName || "Your Organization";
  const stories = data.loveStories ?? [];

  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.pageWrapper}>
        <SectionLabel>WHAT CLINICIANS ARE SAYING</SectionLabel>
        <Text style={styles.sectionHeadline}>In Their Own Words.</Text>
        <Text style={styles.body}>
          Financial outcomes measure what changed in the data. These stories describe what changed in the room. Provider testimonials are one of the strongest signals that documentation burden has actually decreased, because they capture the lived experience that metrics alone cannot reach.
        </Text>

        {stories.map((story, i) => (
          <View
            key={i}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 4,
              borderLeftWidth: 3,
              borderLeftColor: colors.primary,
              borderTopWidth: 1,
              borderTopColor: colors.separator,
              borderRightWidth: 1,
              borderRightColor: colors.separator,
              borderBottomWidth: 1,
              borderBottomColor: colors.separator,
              padding: 16,
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 10.5, color: colors.secondary, lineHeight: 1.7, fontStyle: "italic", marginBottom: 12 }}>
              {`“${story.text}”`}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 20, height: 1, backgroundColor: colors.primary, marginRight: 8 }} />
              <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>
                {story.attribution}
              </Text>
              {story.role && (
                <Text style={{ fontSize: 8.5, color: colors.tertiary, marginLeft: 6 }}>
                  {story.role}
                </Text>
              )}
            </View>
          </View>
        ))}

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
          Each scenario below compares annual investment against the realized value measured and reported in this document. The value figures are not projections — they are what was actually measured at current adoption. The investment figures are modeled from the pricing structure in place at the current deployment scale. The unit economics are fixed; the only variable is pricing model and tier.
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

              <View style={{ flexDirection: "row", backgroundColor: "#FFFFFF" }}>
                {[
                  { label: "Annual Investment", value: fmtCurrency(sc.investment), color: colors.primaryText },
                  { label: "Net Annual Value", value: fmtCurrency(sc.netAnnual), color: sc.netAnnual >= 0 ? "#059669" : colors.primary },
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
                      {`Note: ${sc.warning}`}
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}

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

  if (data.isMultiSetting && data.settingBreakdowns && data.settingBreakdowns.length > 0) {
    return (
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <SectionLabel>FULL DEPLOYMENT POTENTIAL</SectionLabel>
          <Text style={styles.sectionHeadline}>The Road Ahead.</Text>
          <Text style={styles.body}>
            {`This deployment spans ${data.settingBreakdowns.length} care settings. The projections below apply the same per-unit economics measured today to each setting's full-scale footprint. No new assumptions are introduced — the only variable is scale. If a driver is valued at $X per provider at current adoption, the full-scale projection applies that same $X to the complete provider footprint. Nothing is assumed about performance improvement at scale.`}
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

          <View style={{ marginTop: 14, borderRadius: 4, borderWidth: 1, borderColor: colors.separator }}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#FFFFFF", borderTopLeftRadius: 4, borderTopRightRadius: 4 }}>
              <Text style={{ flex: 2, fontSize: 9, color: colors.secondary }}>Realized Annual Value</Text>
              <Text style={{ flex: 1, fontSize: 9, color: colors.secondary, textAlign: "right" }}>{fmtCurrency(data.totalRealized)}</Text>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: "bold", color: colors.primaryText, textAlign: "right" }}>{fmtCurrency(data.totalProjected)}</Text>
            </View>
            {uplift > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 9, paddingHorizontal: 12, backgroundColor: colors.primaryText, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }}>
                <Text style={{ flex: 2, fontSize: 9, fontWeight: "bold", color: "#FFFFFF" }}>Combined Uplift</Text>
                <Text style={{ flex: 1, fontSize: 9, color: "#777777", textAlign: "right" }}>current</Text>
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
          {`The current deployment covers ${fmtNum(data.numberOfProviders)} providers at ${data.utilizationPercent}% adoption. The projection below applies the same per-unit economics measured today to the complete provider footprint at full adoption. No new assumptions are introduced — the only variable is scale. If the economics held at ${data.utilizationPercent}% adoption, they hold at 100%.`}
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
                <Text style={{ flex: 1, fontSize: 9, color: "#777777", textAlign: "right" }}>current</Text>
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

const MethodologyBullet = ({ label, text }: { label?: string; text: string }) => (
  <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 9 }} wrap={false}>
    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 5, marginRight: 8, flexShrink: 0 }} />
    <View style={{ flex: 1 }}>
      {label && (
        <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>{label}</Text>
      )}
      <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.55 }}>{text}</Text>
    </View>
  </View>
);

function MethodologyPage({ data, showPricingSection }: { data: MeasurePDFData; showPricingSection: boolean }) {
  const orgName = data.organizationName || "Your Organization";
  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.pageWrapper}>
        <SectionLabel>METHODOLOGY</SectionLabel>
        <Text style={styles.sectionHeadline}>How This Was Built.</Text>

        {/* Intro framing */}
        <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.65, marginBottom: 16 }}>
          This document reports measured outcomes from an active Abridge deployment — not projections, not benchmarks from similar organizations, and not estimates derived from industry averages. Every figure was produced by applying a consistent three-step framework to data collected during the deployment window shown on the Executive Summary page.
        </Text>

        {/* Two-column layout */}
        <View style={{ flexDirection: "row", gap: 16, marginBottom: 16 }}>
          {/* Left column: How values are calculated */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 7, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.separator, paddingBottom: 5 }}>
              How Values Are Calculated
            </Text>
            <MethodologyBullet
              label="Step 1 — Measure the Delta"
              text="The delta is the difference between the Before measurement (the metric's value before or without Abridge) and the After measurement (the metric's current value). Both are entered from actual data — EHR exports, surveys, or operational records."
            />
            <MethodologyBullet
              label="Step 2 — Apply Value Per Unit"
              text="Each unit of change is assigned a dollar value based on a standardized rate (e.g., Medicare conversion factor for wRVUs, average replacement cost for provider attrition). The rate used is shown on every driver card's calculation row."
            />
            <MethodologyBullet
              label="Step 3 — Attribution Adjustment"
              text="The gross value is multiplied by an attribution percentage to produce the realized value. Attribution reflects the team's judgment about what share of the observed change was directly caused by Abridge. Every driver's attribution percentage is visible in the calculation row. This is not a limitation — it is the methodology."
            />
          </View>

          {/* Right column: How values are bounded */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 7, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.separator, paddingBottom: 5 }}>
              How Values Are Bounded
            </Text>
            <MethodologyBullet
              label="Attribution is a judgment, not an algorithm"
              text="A 75% attribution on a $600K driver means $450K is credited to Abridge; $150K is credited to other concurrent factors. Setting attribution below 100% is not conservative hedging — it is accurate accounting. A CFO auditing these numbers should expect to see it."
            />
            <MethodologyBullet
              label="Qualitative drivers are excluded from totals"
              text="Drivers listed under Signals to Track have not been assigned dollar values because the causal chain from documentation improvement to financial outcome has not been fully established for this deployment. They are real outcomes — they simply don't belong in a dollar total yet."
            />
            <MethodologyBullet
              label="Monthly trend data is directional"
              text="When a driver is tracked in monthly mode, the sparkline shows whether improvement is consistent over time or concentrated in a single measurement period. Consistent trend lines are stronger evidence than a single before-and-after measurement."
            />
            {showPricingSection && (
              <MethodologyBullet
                label="Pricing uses stepped, not graduated, tiers"
                text="Every unit in a pricing scenario is billed at the rate of the applicable tier — not a blended average. The applied tier is highlighted in the Investment section."
              />
            )}
          </View>
        </View>

        {/* What these numbers are not */}
        <View style={{ backgroundColor: colors.cards, borderRadius: 4, padding: 14, marginBottom: 14 }}>
          <Text style={{ fontSize: 7, fontWeight: "bold", color: colors.secondary, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>
            What These Numbers Are Not
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {[
              { label: "Not benchmarks", text: "No figure in this document was extrapolated from published research or applied from a comparable organization. All inputs came from this deployment." },
              { label: "Not projections", text: "The realized values shown are what was measured in the current deployment window — not what is expected to happen at full scale. That analysis appears in the Road Ahead section, if included." },
              { label: "Not audited", text: "These figures are attribution-adjusted estimates prepared by the Abridge Partner Success team. They should be validated against your organization's operational and financial records before use in contracting or investment decisions." },
            ].map((item, i) => (
              <View key={i} style={{ flex: 1 }}>
                <Text style={{ fontSize: 8, fontWeight: "bold", color: colors.primaryText, marginBottom: 3 }}>{item.label}</Text>
                <Text style={{ fontSize: 7.5, color: colors.secondary, lineHeight: 1.5 }}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={{ fontSize: 8, fontStyle: "italic", color: colors.tertiary, lineHeight: 1.45 }}>
          This evidence summary reflects actual deployment data and Abridge methodology. Financial figures are attribution-adjusted estimates based on the measurements entered for this assessment and are not audited projections. Actual results may vary based on workflow adoption, organizational factors, and measurement methodology. Validate all key figures against your own operational data before using this document in financial or contracting decisions.
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
  const audience = data.audience ?? 'executive';

  const showDollars = audience !== 'clinical';
  const showLoveStories = (audience === 'clinical' || audience === 'executive') && (data.loveStories?.length ?? 0) > 0;
  const showPricing = (audience === 'financial' || audience === 'executive') && data.pricingScenarios.length > 0;
  const hasForecastOrExpansion = showDollars && (data.totalProjected > 0 || data.addedSettings.length > 0);
  const activeDomains = data.quadrants.filter((q) => q.drivers.length > 0);

  // Clinical: love stories appear early to set tone before the data
  // Executive: love stories appear after domain pages as supporting evidence
  const loveStoriesEarly = audience === 'clinical';

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

      <ExecutiveSummaryPage data={data} showDollars={showDollars} />

      {loveStoriesEarly && showLoveStories && <LoveStoriesPage data={data} />}

      {activeDomains.map((section) => (
        <DomainPage key={section.quadrant} section={section} data={data} showDollars={showDollars} />
      ))}

      {!loveStoriesEarly && showLoveStories && <LoveStoriesPage data={data} />}

      {hasForecastOrExpansion && <RoadAheadPage data={data} />}

      {showPricing && <PricingPage data={data} />}

      <MethodologyPage data={data} showPricingSection={showPricing} />
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
