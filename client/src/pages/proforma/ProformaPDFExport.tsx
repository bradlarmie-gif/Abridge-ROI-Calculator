import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";
import type { ProformaSettingSnapshot, ProformaConfig } from "./proformaTypes";
import type { ProformaSummary } from "./proformaTypes";
import { SETTING_LABELS, SETTING_UNIT_LABELS, ONSET_LABELS } from "./proformaTypes";
import {
  buildMonthlyCashFlows,
  calculateProformaSummary,
  getYearlySummary,
  buildIRRCashFlows,
  calculateIRR,
} from "@/lib/proformaCalculations";

Font.registerHyphenationCallback((word) => [word]);

Font.register({
  family: "Manrope",
  fonts: [
    { src: manropeRegular, fontWeight: 400 },
    { src: manropeBold, fontWeight: 700 },
  ],
});

const colors = {
  background: "#FFFFFF",
  cards: "#F5F0EB",
  primary: "#EA2C00",
  primaryText: "#1A1A1A",
  secondary: "#666666",
  tertiary: "#999999",
  border: "#E0E0E0",
  positive: "#059669",
  negative: "#DC2626",
  docBlue: "#2563EB",
  timeRed: "#EA2C00",
  retentionGreen: "#059669",
  warningBg: "#FEF3C7",
  warningBorder: "#F59E0B",
  warningText: "#92400E",
};

const styles = StyleSheet.create({
  page: {
    padding: 54,
    paddingBottom: 50,
    fontFamily: "Manrope",
    fontSize: 10.5,
    color: colors.primaryText,
    backgroundColor: colors.background,
  },
  pageWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  sectionLabel: {
    fontSize: 9,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: "bold",
  },
  sectionLabelGray: {
    fontSize: 9,
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: "bold",
  },
  sectionHeadline: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primaryText,
    marginBottom: 6,
  },
  body: {
    fontSize: 10.5,
    color: colors.secondary,
    lineHeight: 1.5,
    marginBottom: 12,
  },
  caption: {
    fontSize: 8.5,
    color: colors.tertiary,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginVertical: 10,
  },
  thickDivider: {
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    marginVertical: 12,
  },
  cardBg: {
    backgroundColor: colors.cards,
    padding: 14,
    borderRadius: 4,
  },
  calloutBox: {
    backgroundColor: colors.cards,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: 12,
  },
  footer: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerLeft: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: "bold",
  },
  footerCenter: {
    fontSize: 8.5,
    color: colors.secondary,
  },
  footerRight: {
    fontSize: 8.5,
    color: colors.tertiary,
  },
});

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtPct(n: number) {
  const val = Math.round(n * 100);
  if (val > 999) return ">999%";
  return `${val}%`;
}

function fmtNum(n: number) {
  return Math.round(n).toLocaleString();
}

function contractTermLabel(months: number): string {
  return `${months / 12}-Year`;
}

function unitLabel(careSetting: string, plural = true): string {
  const label = SETTING_UNIT_LABELS[careSetting] || "providers";
  return plural ? label : label.replace(/s$/, "");
}

const TOTAL_PAGES = 7;

const PageFooter = ({ pageNum }: { pageNum: number }) => (
  <View style={styles.footer}>
    <Text style={styles.footerLeft}>ABRIDGE</Text>
    <Text style={styles.footerCenter}>Organization Proforma</Text>
    <Text style={styles.footerRight}>Page {pageNum} of {TOTAL_PAGES}</Text>
  </View>
);

interface ProformaPDFProps {
  settings: ProformaSettingSnapshot[];
  config: ProformaConfig;
  summary: ProformaSummary;
  yearlyData: ReturnType<typeof getYearlySummary>;
  sensitivityIRR: { conservative: number; optimistic: number; consValid: boolean; optValid: boolean };
}

function ProformaPDFDocument({ settings, config, summary, yearlyData, sensitivityIRR }: ProformaPDFProps) {
  const termLabel = contractTermLabel(config.contractTermMonths);
  const hasInvestment = settings.some(s => s.implementationFee > 0 || s.costPerUnit > 0);
  const irrLabel = summary.irrMethod === "mirr" ? "MIRR" : "IRR";
  const irrDisplay = hasInvestment && summary.irrValid ? fmtPct(summary.irr) : "N/A";

  const totalDocValue = yearlyData.reduce((s, y) => s + y.docValue, 0);
  const totalTimeValue = yearlyData.reduce((s, y) => s + y.timeValue, 0);
  const totalRetentionValue = yearlyData.reduce((s, y) => s + y.retentionValue, 0);
  const totalAllValue = totalDocValue + totalTimeValue + totalRetentionValue;
  const docPct = totalAllValue > 0 ? Math.round((totalDocValue / totalAllValue) * 100) : 0;
  const timePct = totalAllValue > 0 ? Math.round((totalTimeValue / totalAllValue) * 100) : 0;
  const retPct = totalAllValue > 0 ? Math.round((totalRetentionValue / totalAllValue) * 100) : 0;

  const totalProviders = settings.reduce((s, v) => s + v.providerCount, 0);
  const totalFullScale = settings.reduce((s, v) => s + (v.fullScaleProviders || v.providerCount), 0);
  const totalImplFees = settings.reduce((s, v) => s + v.implementationFee, 0);
  const totalMonthlyCost = settings.reduce((s, v) => s + v.costPerUnit * v.providerCount, 0);

  const settingNames = settings.map(s => SETTING_LABELS[s.careSetting] || s.label).join(", ");

  const strategicObservation = (() => {
    if (settings.length === 1) {
      return `This model focuses on ${settingNames}. A single-setting deployment provides a focused proof of value. Once baselines are established and outcomes measured, this model can be extended to additional care settings to compound organizational impact.`;
    }
    const dominant = docPct > timePct ? "documentation quality" : "time recapture";
    return `Across ${settings.length} care settings (${settingNames}), your value model is ${dominant}-dominant (${docPct}% documentation, ${timePct}% time savings, ${retPct}% retention). Multi-setting deployments compound value: clinicians share best practices across departments, and the organizational change management overhead is amortized. The staggered go-live schedule reduces implementation risk while accelerating time to value.`;
  })();

  return (
    <Document>
      <PDFCoverPage
        reportLabel="ORGANIZATION PROFORMA"
        title="Organization"
        subtitle={`Multi-Setting Financial Model \u00B7 ${settings.length} Care Setting${settings.length > 1 ? "s" : ""} \u00B7 ${termLabel} Contract`}
        disclaimerText="This proforma is for financial planning purposes. Projections are modeled estimates based on user-provided inputs and published benchmarks. They do not constitute a guarantee of financial outcomes."
      />

      {/* PAGE 1: THE THESIS */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>THE THESIS</Text>
          <Text style={styles.sectionHeadline}>What happens when you deploy ambient documentation across your entire organization?</Text>
          <Text style={styles.body}>
            This proforma models the financial impact of Abridge across {settings.length} care setting{settings.length > 1 ? "s" : ""} over a {termLabel.toLowerCase()} contract term. It accounts for provider expansion, adoption ramp, onset timing by driver type, and conservative retention phasing to produce a defensible investment case.
          </Text>

          <View style={[styles.cardBg, { paddingVertical: 16, paddingHorizontal: 18, marginBottom: 10 }]}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                  PROJECTED {termLabel.toUpperCase()} NET VALUE
                </Text>
                <Text style={{ fontSize: 36, fontWeight: "bold", color: colors.primary }}>
                  {fmt(summary.threeYearNet)}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 6 }}>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{Math.round(summary.simpleROI * 100)}%</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>Simple ROI</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.positive }}>{irrDisplay}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>{irrLabel}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{summary.paybackMonth ? `${summary.paybackMonth} mo` : "\u2014"}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>Payback</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{fmtNum(summary.totalHours)}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>Hours Returned</Text>
              </View>
            </View>
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabel}>TWO SOURCES OF VALUE</Text>
          <Text style={styles.body}>
            Ambient documentation creates value in two distinct ways: by returning time to clinicians (which translates to capacity, cost reduction, and retention) and by improving documentation quality (which captures revenue that already exists but isn{"\u2019"}t being coded). Across your settings, these sources combine to create {fmt(summary.threeYearValue)} in total projected value.
          </Text>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                TIME RECAPTURED
              </Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>
                {totalTimeValue > 0 ? fmt(totalTimeValue) : "\u2014"}
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                {timePct}% of total value. Hours returned to patient care, capacity expansion, and operational efficiency.
              </Text>
            </View>

            <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
              <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                REVENUE OPTIMIZED
              </Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
                {totalDocValue > 0 ? fmt(totalDocValue) : "\u2014"}
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                {docPct}% of total value. Capture of complexity, denial prevention, and coding accuracy.
              </Text>
            </View>
          </View>

          {totalRetentionValue > 0 && (
            <View style={[styles.cardBg, { marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
              <View>
                <Text style={{ fontSize: 9, color: colors.retentionGreen, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
                  RETENTION & WELLBEING
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                  {retPct}% of total value. Phased conservatively over {termLabel.toLowerCase()}.
                </Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.retentionGreen }}>{fmt(totalRetentionValue)}</Text>
            </View>
          )}

          <View style={styles.calloutBox}>
            <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
              STRATEGIC OBSERVATION
            </Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
              {strategicObservation}
            </Text>
          </View>

          <PageFooter pageNum={1} />
        </View>
      </Page>

      {/* PAGE 2: YOUR CARE SETTINGS */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>YOUR CARE SETTINGS</Text>
          <Text style={styles.sectionHeadline}>{settings.length} Setting{settings.length > 1 ? "s" : ""}, One Integrated Model</Text>
          <Text style={styles.body}>
            Each care setting has unique value drivers, onset timing, and scaling characteristics. This model accounts for staggered go-live dates, per-setting utilization rates, and provider expansion trajectories to project realistic organizational impact.
          </Text>

          {settings.map(s => {
            const settingColor = s.color || colors.primary;
            return (
              <View key={s.id} style={[styles.cardBg, { borderLeftWidth: 3, borderLeftColor: settingColor, marginBottom: 8 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: "bold", marginBottom: 3 }}>{s.label}</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>
                      {s.yearlyProviders
                        ? `Y1: ${s.yearlyProviders.year1} \u2192 Y2: ${s.yearlyProviders.year2} \u2192 Y3: ${s.yearlyProviders.year3}`
                        : `${s.providerCount} \u2192 ${s.fullScaleProviders || s.providerCount}`} {unitLabel(s.careSetting)} {"\u00B7"} {s.utilizationPercent}% utilization {"\u00B7"} Go-live Month {s.goLiveMonth}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 18, fontWeight: "bold", color: settingColor }}>{fmt(s.annualValue)}</Text>
                    <Text style={{ fontSize: 7, color: colors.secondary }}>{fmtNum(s.totalHoursSaved)} hrs/yr</Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>
                  {s.drivers.map(d => {
                    const onsetColor = d.onset === "immediate" ? colors.docBlue :
                      d.onset === "delayed" ? colors.timeRed : colors.retentionGreen;
                    return (
                      <View key={d.id} style={{ backgroundColor: colors.background, borderRadius: 3, paddingHorizontal: 7, paddingVertical: 3, borderLeftWidth: 2, borderLeftColor: onsetColor }}>
                        <Text style={{ fontSize: 7 }}>{d.name}: {fmt(d.value)}</Text>
                        <Text style={{ fontSize: 5.5, color: colors.tertiary }}>{ONSET_LABELS[d.onset]}</Text>
                      </View>
                    );
                  })}
                </View>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Text style={{ fontSize: 8, color: colors.secondary }}>Investment: {fmt(s.costPerUnit)}/{unitLabel(s.careSetting, false)}/mo</Text>
                  <Text style={{ fontSize: 8, color: colors.secondary }}>Impl: {s.implementationFee > 0 ? fmt(s.implementationFee) : "\u2014"}</Text>
                </View>
              </View>
            );
          })}

          <View style={[styles.cardBg, { marginTop: 4 }]}>
            <Text style={{ fontSize: 9, fontWeight: "bold", marginBottom: 4 }}>Onset Timing Legend</Text>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.docBlue }} />
                <Text style={{ fontSize: 7.5, color: colors.secondary }}>Immediate {"\u2014"} Doc quality from day one</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.timeRed }} />
                <Text style={{ fontSize: 7.5, color: colors.secondary }}>Delayed (3mo) {"\u2014"} Operational change needed</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.retentionGreen }} />
                <Text style={{ fontSize: 7.5, color: colors.secondary }}>Phased {"\u2014"} Retention over Y1/Y2/Y3</Text>
              </View>
            </View>
          </View>

          <PageFooter pageNum={2} />
        </View>
      </Page>

      {/* PAGE 3: HOW VALUE MATERIALIZES */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>HOW VALUE MATERIALIZES</Text>
          <Text style={styles.sectionHeadline}>Not All Value Shows Up on Day One</Text>
          <Text style={styles.body}>
            One of the most important aspects of this model is honesty about timing. Different value drivers materialize at different speeds, and this proforma accounts for that reality rather than assuming everything starts immediately.
          </Text>

          <View style={styles.divider} />

          <View style={[styles.cardBg, { borderLeftWidth: 3, borderLeftColor: colors.docBlue, marginBottom: 10 }]}>
            <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.docBlue, marginBottom: 4 }}>Layer 1: Documentation Quality (Immediate)</Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
              wRVU improvement, HCC recapture, denial prevention, DRG accuracy, CDI efficiency. These drivers activate from day one because the AI produces better, more complete notes immediately. There is a brief learning curve (approximately one month) as clinicians adapt their workflow, but the documentation improvement is inherent to the technology.
            </Text>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.docBlue }}>
              {termLabel} contribution: {fmt(totalDocValue)} ({docPct}% of total)
            </Text>
          </View>

          <View style={[styles.cardBg, { borderLeftWidth: 3, borderLeftColor: colors.timeRed, marginBottom: 10 }]}>
            <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.timeRed, marginBottom: 4 }}>Layer 2: Time Savings (3-Month Delay)</Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
              Patient access, throughput, LWBS reduction, cost reduction, overtime elimination. Time is saved immediately, but translating that time into economic value requires operational change {"\u2014"} scheduling adjustments, template redesign, or staffing model updates. We model a 3-month lag with a gradual ramp-up to account for this reality.
            </Text>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.timeRed }}>
              {termLabel} contribution: {fmt(totalTimeValue)} ({timePct}% of total)
            </Text>
          </View>

          <View style={[styles.cardBg, { borderLeftWidth: 3, borderLeftColor: colors.retentionGreen, marginBottom: 10 }]}>
            <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.retentionGreen, marginBottom: 4 }}>Layer 3: Retention & Wellbeing (Phased Over Years)</Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5, marginBottom: 4 }}>
              Clinician retention, nurse retention, and wellbeing improvements. These are the longest-term drivers. Reducing burnout takes sustained adoption. We phase these conservatively: {config.retentionPhasing.year1Pct}% in Year 1, {config.retentionPhasing.year2Pct}% in Year 2, {config.retentionPhasing.year3Pct}% in Year 3. This means the model deliberately understates early-period retention value.
            </Text>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.retentionGreen }}>
              {termLabel} contribution: {fmt(totalRetentionValue)} ({retPct}% of total)
            </Text>
          </View>

          <View style={styles.calloutBox}>
            <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
              WHY THIS MATTERS
            </Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
              Many ROI models assume all value starts on day one. This model does not. The onset timing creates a realistic cash flow profile where Month 1 looks very different from Month 12. If you{"\u2019"}re evaluating this against competing proposals that show immediate full-value, ask how they account for operational adoption and organizational change management.
            </Text>
          </View>

          <PageFooter pageNum={3} />
        </View>
      </Page>

      {/* PAGE 4: THE FINANCIAL PROJECTION */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>THE FINANCIAL PROJECTION</Text>
          <Text style={styles.sectionHeadline}>{termLabel} Outlook</Text>
          <Text style={styles.body}>
            Value is phased by driver onset timing with per-year provider allocation and adoption ramp applied. Investment scales with provider count as the deployment expands across Y1, Y2, and Y3.
          </Text>

          <View style={[styles.cardBg, { marginBottom: 10, padding: 16 }]}>
            <View style={{ flexDirection: "row", marginBottom: 8 }}>
              <Text style={{ flex: 2, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase" }}></Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>{y.label}</Text>
              ))}
              <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.primary, textTransform: "uppercase", textAlign: "right" }}>{termLabel} Total</Text>
            </View>
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 6 }} />

            {settings.map(s => (
              <View key={s.id} style={{ flexDirection: "row", marginBottom: 3 }}>
                <Text style={{ flex: 2, fontSize: 9, color: colors.primaryText }}>{s.label}</Text>
                {yearlyData.map(y => (
                  <Text key={y.label} style={{ flex: 1, fontSize: 9, color: colors.secondary, textAlign: "right" }}>{fmt(y.bySettings[s.id]?.value || 0)}</Text>
                ))}
                <Text style={{ flex: 1, fontSize: 9, fontWeight: "bold", textAlign: "right" }}>
                  {fmt(yearlyData.reduce((sum, y) => sum + (y.bySettings[s.id]?.value || 0), 0))}
                </Text>
              </View>
            ))}

            <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 6 }} />

            <View style={{ flexDirection: "row", marginBottom: 3 }}>
              <Text style={{ flex: 2, fontSize: 9, fontWeight: "bold" }}>Total Value</Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 9, fontWeight: "bold", textAlign: "right" }}>{fmt(y.totalValue)}</Text>
              ))}
              <Text style={{ flex: 1, fontSize: 9, fontWeight: "bold", color: colors.primary, textAlign: "right" }}>{fmt(summary.threeYearValue)}</Text>
            </View>

            <View style={{ flexDirection: "row", marginBottom: 1, paddingLeft: 8 }}>
              <Text style={{ flex: 2, fontSize: 8, color: colors.docBlue }}>Doc Quality (immediate)</Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 8, color: colors.tertiary, textAlign: "right" }}>{fmt(y.docValue)}</Text>
              ))}
              <Text style={{ flex: 1, fontSize: 8, color: colors.tertiary, textAlign: "right" }}>{fmt(totalDocValue)}</Text>
            </View>
            <View style={{ flexDirection: "row", marginBottom: 1, paddingLeft: 8 }}>
              <Text style={{ flex: 2, fontSize: 8, color: colors.timeRed }}>Time Savings (3mo delay)</Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 8, color: colors.tertiary, textAlign: "right" }}>{fmt(y.timeValue)}</Text>
              ))}
              <Text style={{ flex: 1, fontSize: 8, color: colors.tertiary, textAlign: "right" }}>{fmt(totalTimeValue)}</Text>
            </View>
            <View style={{ flexDirection: "row", marginBottom: 3, paddingLeft: 8 }}>
              <Text style={{ flex: 2, fontSize: 8, color: colors.retentionGreen }}>Retention (phased)</Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 8, color: colors.tertiary, textAlign: "right" }}>{fmt(y.retentionValue)}</Text>
              ))}
              <Text style={{ flex: 1, fontSize: 8, color: colors.tertiary, textAlign: "right" }}>{fmt(totalRetentionValue)}</Text>
            </View>

            <View style={{ flexDirection: "row", marginBottom: 1, paddingLeft: 8 }}>
              <Text style={{ flex: 2, fontSize: 8, color: colors.tertiary }}>Active Providers</Text>
              {yearlyData.map(y => {
                const total = settings.reduce((sum, s) => sum + (y.bySettings[s.id]?.providers || 0), 0);
                return (
                  <Text key={y.label} style={{ flex: 1, fontSize: 8, color: colors.tertiary, textAlign: "right" }}>{fmtNum(total)}</Text>
                );
              })}
              <Text style={{ flex: 1, fontSize: 8, color: colors.tertiary, textAlign: "right" }}>
                {(() => { const last = yearlyData[yearlyData.length - 1]; return last ? fmtNum(settings.reduce((sum, s) => sum + (last.bySettings[s.id]?.providers || 0), 0)) : "\u2014"; })()}
              </Text>
            </View>

            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />

            <View style={{ flexDirection: "row", marginBottom: 3 }}>
              <Text style={{ flex: 2, fontSize: 9, color: colors.negative }}>Investment</Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 9, color: colors.negative, textAlign: "right" }}>({fmt(y.investment)})</Text>
              ))}
              <Text style={{ flex: 1, fontSize: 9, color: colors.negative, fontWeight: "bold", textAlign: "right" }}>({fmt(summary.threeYearInvestment)})</Text>
            </View>

            <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 4 }} />

            <View style={{ flexDirection: "row" }}>
              <Text style={{ flex: 2, fontSize: 9, fontWeight: "bold" }}>Net Value</Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 9, fontWeight: "bold", color: y.netValue >= 0 ? colors.positive : colors.negative, textAlign: "right" }}>
                  {y.netValue >= 0 ? fmt(y.netValue) : `(${fmt(Math.abs(y.netValue))})`}
                </Text>
              ))}
              <Text style={{ flex: 1, fontSize: 9, fontWeight: "bold", color: summary.threeYearNet >= 0 ? colors.positive : colors.negative, textAlign: "right" }}>
                {summary.threeYearNet >= 0 ? fmt(summary.threeYearNet) : `(${fmt(Math.abs(summary.threeYearNet))})`}
              </Text>
            </View>
          </View>

          {summary.paybackMonth && (
            <View style={[styles.calloutBox, { marginBottom: 8 }]}>
              <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
                The investment reaches payback at Month {summary.paybackMonth}. After that point, every dollar of value generated is net positive. By the end of the contract, the organization has generated {fmt(summary.threeYearNet)} above its total investment of {fmt(summary.threeYearInvestment)}.
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionLabelGray}>SENSITIVITY ANALYSIS</Text>
          <View style={[styles.cardBg, { padding: 12 }]}>
            <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 8 }}>
              Two-sided analysis: Conservative applies a 20% reduction to value drivers and 10% increase to subscription costs. Optimistic applies a 20% increase to value and 10% reduction to costs.
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginBottom: 2 }}>CONSERVATIVE</Text>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>
                  {sensitivityIRR.consValid ? fmtPct(sensitivityIRR.conservative) : "N/A"}
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center", borderBottomWidth: 2, borderBottomColor: colors.primary }}>
                <Text style={{ fontSize: 8, color: colors.primary, marginBottom: 2 }}>BASE CASE</Text>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary }}>{irrDisplay}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginBottom: 2 }}>OPTIMISTIC</Text>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.positive }}>
                  {sensitivityIRR.optValid ? fmtPct(sensitivityIRR.optimistic) : "N/A"}
                </Text>
              </View>
            </View>
          </View>

          <PageFooter pageNum={4} />
        </View>
      </Page>

      {/* PAGE 5: THE INVESTMENT CASE */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>THE INVESTMENT CASE</Text>
          <Text style={styles.sectionHeadline}>Infrastructure, Not Expense</Text>
          <Text style={styles.body}>
            Investment stays flat per provider while value grows with scale, adoption, and time. This is the signature of infrastructure {"\u2014"} fixed cost per unit, compounding returns. The question isn{"\u2019"}t whether this investment pays back. It{"\u2019"}s how quickly, and by how much.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionLabelGray}>WHAT THE NUMBERS MEAN</Text>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>SIMPLE ROI</Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>
                {Math.round(summary.simpleROI * 100)}%
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                Total net value divided by total cost. A {Math.round(summary.simpleROI * 100)}% ROI means the organization receives ${(1 + summary.simpleROI).toFixed(2)} for every $1 invested over the {termLabel.toLowerCase()} term.
              </Text>
            </View>

            <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.positive }}>
              <Text style={{ fontSize: 9, color: colors.positive, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{irrLabel}</Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.positive, marginBottom: 4 }}>
                {irrDisplay}
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                {hasInvestment && summary.irrValid
                  ? `Annualized return that accounts for the time value of money. Period 0 is implementation fees only (${fmt(totalImplFees)}). Subsequent periods are net monthly cash flows.`
                  : `IRR is not applicable because implementation fees are $0. Without an upfront capital outlay, the rate of return on investment is undefined. Use Simple ROI and payback to evaluate.`}
              </Text>
            </View>
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabel}>ECONOMICS BY SETTING</Text>

          <View style={[styles.cardBg, { marginBottom: 8, padding: 14 }]}>
            <View style={{ flexDirection: "row", marginBottom: 6 }}>
              <Text style={{ flex: 2, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase" }}>Setting</Text>
              <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Y1</Text>
              <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Y2</Text>
              {config.contractTermMonths >= 36 && (
                <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Y3</Text>
              )}
              <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Annual Value</Text>
              <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Monthly Cost</Text>
            </View>
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 6 }} />
            {settings.map(s => (
              <View key={s.id} style={{ flexDirection: "row", marginBottom: 3 }}>
                <Text style={{ flex: 2, fontSize: 9 }}>{s.label}</Text>
                <Text style={{ flex: 1, fontSize: 9, textAlign: "right" }}>{(s.yearlyProviders?.year1 || s.providerCount)} {unitLabel(s.careSetting)}</Text>
                <Text style={{ flex: 1, fontSize: 9, textAlign: "right" }}>{(s.yearlyProviders?.year2 || s.providerCount)} {unitLabel(s.careSetting)}</Text>
                {config.contractTermMonths >= 36 && (
                  <Text style={{ flex: 1, fontSize: 9, textAlign: "right" }}>{(s.yearlyProviders?.year3 || s.fullScaleProviders || s.providerCount)} {unitLabel(s.careSetting)}</Text>
                )}
                <Text style={{ flex: 1, fontSize: 9, textAlign: "right" }}>{fmt(s.annualValue)}</Text>
                <Text style={{ flex: 1, fontSize: 9, textAlign: "right" }}>{fmt(s.costPerUnit * (s.yearlyProviders?.year1 || s.providerCount))}</Text>
              </View>
            ))}
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
            <View style={{ flexDirection: "row" }}>
              <Text style={{ flex: 2, fontSize: 9, fontWeight: "bold" }}>Total</Text>
              <Text style={{ flex: 1, fontSize: 9, fontWeight: "bold", textAlign: "right" }}>{totalProviders}</Text>
              <Text style={{ flex: 1, fontSize: 9, fontWeight: "bold", textAlign: "right" }}>{settings.reduce((s, v) => s + (v.yearlyProviders?.year2 || v.providerCount), 0)}</Text>
              {config.contractTermMonths >= 36 && (
                <Text style={{ flex: 1, fontSize: 9, fontWeight: "bold", textAlign: "right" }}>{settings.reduce((s, v) => s + (v.yearlyProviders?.year3 || v.fullScaleProviders || v.providerCount), 0)}</Text>
              )}
              <Text style={{ flex: 1, fontSize: 9, fontWeight: "bold", color: colors.primary, textAlign: "right" }}>{fmt(summary.totalSystemValue)}</Text>
              <Text style={{ flex: 1, fontSize: 9, fontWeight: "bold", textAlign: "right" }}>{fmt(totalMonthlyCost)}</Text>
            </View>
          </View>

          <View style={styles.calloutBox}>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
              Providers expand according to per-year allocation (Y1 {"\u2192"} Y2 {"\u2192"} Y3). Within each year, providers ramp linearly between targets. This models a realistic organizational rollout {"\u2014"} not a theoretical day-one deployment. Investment cost scales proportionally with provider count.
            </Text>
          </View>

          <PageFooter pageNum={5} />
        </View>
      </Page>

      {/* PAGE 6: ASSUMPTIONS & METHODOLOGY */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>ASSUMPTIONS & METHODOLOGY</Text>
          <Text style={styles.sectionHeadline}>How We Built This Model</Text>
          <Text style={styles.body}>
            Every assumption in this model is designed to be verifiable. Below is a complete accounting of inputs, calculation methodology, and the conservative design choices that underpin these projections.
          </Text>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                YOUR INPUTS
              </Text>
              {settings.map(s => (
                <View key={s.id} style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>{s.label}</Text>
                  <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.6 }}>
                    Y1: {s.yearlyProviders?.year1 || s.providerCount} {unitLabel(s.careSetting)}{"\n"}
                    Y2: {s.yearlyProviders?.year2 || s.providerCount} {unitLabel(s.careSetting)}{"\n"}
                    {config.contractTermMonths >= 36 ? `Y3: ${s.yearlyProviders?.year3 || s.fullScaleProviders || s.providerCount} ${unitLabel(s.careSetting)}\n` : ""}
                    {s.utilizationPercent}% utilization{"\n"}
                    {fmt(s.costPerUnit)}/{unitLabel(s.careSetting, false)}/mo{"\n"}
                    {s.implementationFee > 0 ? `${fmt(s.implementationFee)} implementation` : "No implementation fee"}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                HOW WE CALCULATED
              </Text>
              <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.6, marginBottom: 6 }}>
                Contract term: {termLabel} ({config.contractTermMonths} months){"\n"}
                Adoption ramp: S-curve over 12 months{"\n"}
                Provider expansion: Per-year allocation (Y1/Y2/Y3){"\n"}
                Utilization ramp: S-curve to full utilization
              </Text>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, marginTop: 4 }}>
                RETENTION PHASING
              </Text>
              <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.6 }}>
                Year 1: {config.retentionPhasing.year1Pct}%{"\n"}
                Year 2: {config.retentionPhasing.year2Pct}%{"\n"}
                Year 3: {config.retentionPhasing.year3Pct}%
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabelGray}>{irrLabel} METHODOLOGY</Text>
          <View style={[styles.cardBg, { marginBottom: 8 }]}>
            <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.6 }}>
              Standard finance model. {totalImplFees > 0
                ? `Period 0 is the upfront capital investment (implementation fees: ${fmt(totalImplFees)}).`
                : "Period 0 is the first month\u2019s subscription cost (used as the investment baseline when no implementation fees are present)."} Periods 1{"\u2013"}{config.contractTermMonths} are net monthly cash flows (value generated minus ongoing subscription cost). Calculated using Newton-Raphson iteration with 13 initial guesses and bisection fallback. Every result is cross-validated: NPV at the found rate must be within 0.1% of total cash flow magnitude.
              {summary.irrMethod === "mirr" ? " This model used Modified IRR (MIRR) because the cash flows have multiple sign changes. MIRR uses a finance rate for negative flows and a reinvestment rate for positive flows, always producing a unique, defensible rate." : ""}
            </Text>
          </View>

          <Text style={styles.sectionLabelGray}>DATA SOURCES</Text>
          <View style={[styles.cardBg, { marginBottom: 8 }]}>
            <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.6 }}>
              {"\u2022"} Time savings benchmarks: Based on validated data from Abridge implementations across 200+ health systems.{"\n"}
              {"\u2022"} Industry benchmarks: Revenue, cost, and utilization parameters from MGMA, CMS, and proprietary health system datasets.{"\n"}
              {"\u2022"} Conservative by design: Where uncertainty exists, calculations use conservative assumptions to avoid overstating projected benefits.
            </Text>
          </View>

          <PageFooter pageNum={6} />
        </View>
      </Page>

      {/* PAGE 7: HONEST LIMITS & NEXT STEPS */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>WHAT THIS MODEL DOES {"\u2014"} AND DOESN{"\u2019"}T {"\u2014"} TELL YOU</Text>
          <Text style={styles.sectionHeadline}>An Honest Assessment</Text>
          <Text style={styles.body}>
            No model is perfect. This proforma is designed to be directionally accurate and conservatively calibrated, but it has limitations that you should understand before making investment decisions.
          </Text>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 9, color: colors.positive, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                WHERE THE MODEL IS STRONGEST
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7 }}>
                {"\u2022"} Time savings {"\u2014"} well-validated across 200+ deployments{"\n"}
                {"\u2022"} Documentation quality {"\u2014"} directly measurable from note output{"\n"}
                {"\u2022"} Adoption ramp {"\u2014"} based on observed S-curve patterns{"\n"}
                {"\u2022"} Cost structure {"\u2014"} per-unit pricing is known and fixed
              </Text>
            </View>

            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 9, color: colors.negative, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                WHERE ESTIMATES ARE WEAKEST
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7 }}>
                {"\u2022"} Retention {"\u2014"} hardest to isolate from other factors{"\n"}
                {"\u2022"} Revenue realization {"\u2014"} depends on payer mix and coding practices{"\n"}
                {"\u2022"} Operational change {"\u2014"} time savings translation varies by organization{"\n"}
                {"\u2022"} Provider expansion {"\u2014"} per-year targets assume smooth ramp within each year
              </Text>
            </View>
          </View>

          <View style={styles.calloutBox}>
            <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
              THE HONEST TAKE
            </Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
              This model is designed to help you think about the investment, not to sell you on it. The sensitivity range ({sensitivityIRR.consValid ? fmtPct(sensitivityIRR.conservative) : "N/A"} to {sensitivityIRR.optValid ? fmtPct(sensitivityIRR.optimistic) : "N/A"} {irrLabel}) brackets the likely outcomes. Your actual results will depend on implementation quality, organizational adoption, and operational factors unique to your environment. We encourage you to validate every assumption against your own data.
            </Text>
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabelGray}>KEY METRICS TO TRACK POST-DEPLOYMENT</Text>
          <View style={[styles.cardBg, { marginBottom: 10 }]}>
            <Text style={{ fontSize: 9.5, color: colors.secondary, lineHeight: 1.7 }}>
              1. Documentation time per encounter (target: -50%){"\n"}
              2. Provider/nurse satisfaction score (target: +15 pts){"\n"}
              3. Utilization rate across deployed settings{"\n"}
              4. Revenue per encounter or per admission trend{"\n"}
              5. Turnover rate in deployed vs. non-deployed departments
            </Text>
          </View>

          <Text style={styles.sectionLabelGray}>RECOMMENDED NEXT STEPS</Text>
          <View style={[styles.cardBg, { marginBottom: 10 }]}>
            <Text style={{ fontSize: 9.5, color: colors.secondary, lineHeight: 1.7 }}>
              1. Validate assumptions with your finance and operations teams.{"\n"}
              2. Identify pilot departments for initial deployment.{"\n"}
              3. Establish baseline metrics for time, documentation quality, and workforce satisfaction.{"\n"}
              4. Schedule a conversation with your Abridge team to refine this model with organization-specific data.
            </Text>
          </View>

          <View style={{ backgroundColor: colors.warningBg, borderRadius: 4, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.warningBorder }}>
            <Text style={{ fontSize: 9, color: colors.warningText, fontWeight: "bold", marginBottom: 3 }}>Important Disclaimer</Text>
            <Text style={{ fontSize: 8.5, color: colors.warningText, lineHeight: 1.5 }}>
              This proforma is for financial planning purposes only. Projections are modeled estimates based on user-provided inputs and published benchmarks. Actual results will depend on implementation quality, organizational adoption, and operational factors unique to your environment. These projections do not constitute a guarantee of financial outcomes.
            </Text>
          </View>

          <PageFooter pageNum={7} />
        </View>
      </Page>
    </Document>
  );
}

export async function generateProformaPDF(
  settings: ProformaSettingSnapshot[],
  config: ProformaConfig
): Promise<void> {
  const cashFlows = buildMonthlyCashFlows(settings, config);
  const summary = calculateProformaSummary(settings, config, cashFlows);
  const yearlyData = getYearlySummary(cashFlows, settings);

  const scaleSettings = (s: ProformaSettingSnapshot, vf: number, cf: number) => ({
    ...s,
    annualValue: s.annualValue * vf,
    retentionValue: s.retentionValue * vf,
    drivers: s.drivers.map(d => ({ ...d, value: d.value * vf })),
    costPerUnit: s.costPerUnit * cf,
  });
  const conservative = settings.map(s => scaleSettings(s, 0.8, 1.1));
  const optimistic = settings.map(s => scaleSettings(s, 1.2, 0.9));
  const consCF = buildMonthlyCashFlows(conservative, config);
  const optCF = buildMonthlyCashFlows(optimistic, config);
  const consResult = calculateIRR(buildIRRCashFlows(conservative, config, consCF));
  const optResult = calculateIRR(buildIRRCashFlows(optimistic, config, optCF));
  const sensitivityIRR = {
    conservative: consResult.isValid ? consResult.annualizedRate : 0,
    optimistic: optResult.isValid ? optResult.annualizedRate : 0,
    consValid: consResult.isValid,
    optValid: optResult.isValid,
  };

  const blob = await pdf(
    <ProformaPDFDocument
      settings={settings}
      config={config}
      summary={summary}
      yearlyData={yearlyData}
      sensitivityIRR={sensitivityIRR}
    />
  ).toBlob();

  await savePdfBlob(blob, "Abridge_Organization_Proforma.pdf", "Organization Proforma");
}
