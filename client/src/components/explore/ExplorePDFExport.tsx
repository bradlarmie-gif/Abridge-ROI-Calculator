import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Svg,
  Rect,
  Font,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";

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

export type ExploreCareSetting = "outpatient" | "ed" | "inpatient" | "nursing";

export interface ExploreDriver {
  id: string;
  name: string;
  value: number;
  category: "time" | "documentation";
  calcSteps?: string[];
  calibrationNote?: string;
  inputs?: Record<string, number | string>;
}

export interface ExplorePDFData {
  careSetting: ExploreCareSetting;
  clientName: string;
  preparedBy: string;

  providers: number;
  encounters: number;
  utilizationPercent: number;
  hoursReturned: number;

  nursingStaffedBeds?: number;
  nursingFTEs?: number;

  totalValue: number;
  timeValue: number;
  docValue: number;
  annualInvestment: number;
  netAnnualValue: number;
  roi: number;

  drivers: ExploreDriver[];

  fullScaleProviders: number;
  fullScaleUtilization: number;
  fullScaleValue: number;
  implementationCost: number;

  minutesSavedPerEncounter: number;
}

const fmtCurrency = (n: number): string => {
  const v = safe(n);
  if (Math.abs(v) >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `$${Math.round(v / 1000).toLocaleString()}K`;
  return `$${Math.round(v).toLocaleString()}`;
};

const fmtNum = (n: number): string => {
  return Math.round(safe(n)).toLocaleString();
};

const safe = (v: number) => (isNaN(v) || v === undefined || v === null ? 0 : v);

const ProgressBar = ({ percent, width = 400 }: { percent: number; width?: number }) => {
  const pct = Math.min(100, Math.max(0, safe(percent)));
  const filled = Math.max((pct / 100) * width, 3);
  return (
    <Svg width={width} height={10}>
      <Rect x={0} y={0} width={width} height={10} fill={colors.border} rx={5} />
      <Rect x={0} y={0} width={filled} height={10} fill={colors.primary} rx={5} />
    </Svg>
  );
};

const PageFooter = ({ pageNum, orgName, settingLabel }: { pageNum: number; orgName: string; settingLabel: string }) => (
  <View style={styles.footer}>
    <Text style={styles.footerLeft}>ABRIDGE</Text>
    <Text style={styles.footerCenter}>{orgName} {"\u00B7"} {settingLabel} Value Assessment</Text>
    <Text style={styles.footerRight}>Page {pageNum} of 4</Text>
  </View>
);

interface SettingConfig {
  label: string;
  coverLabel: string;
  providerType: string;
  providerTypePlural: string;
  coverSubtitle: (d: ExplorePDFData) => string;
  thesisQuestion: string;
  thesisParagraph: string;
  source1Label: string;
  source1Description: string;
  source1Tagline: string;
  source2Label: string;
  source2Description: string;
  source2Tagline: string;
  strategicObservation: (d: ExplorePDFData) => string;
  page2Intro: (d: ExplorePDFData) => string;
  closingInsight: string;
  keyMetrics: string[];
}

const SETTING_CONFIGS: Record<ExploreCareSetting, SettingConfig> = {
  outpatient: {
    label: "Outpatient",
    coverLabel: "OUTPATIENT VALUE ASSESSMENT",
    providerType: "provider",
    providerTypePlural: "providers",
    coverSubtitle: (d) => `${fmtNum(d.providers)} providers \u00B7 ${fmtNum(d.encounters)} encounters \u00B7 Outpatient`,
    thesisQuestion: "If we give providers time back, what happens to your practice?",
    thesisParagraph: "Ambient documentation creates value in two distinct ways: by returning time to providers (which translates to capacity, cost reduction, and retention) and by improving documentation quality (which captures revenue that already exists but isn't being coded).",
    source1Label: "TIME RECAPTURED",
    source1Description: "Hours returned to patient care, capacity expansion, and operational efficiency.",
    source1Tagline: "The constraint is time.",
    source2Label: "REVENUE OPTIMIZED",
    source2Description: "wRVU capture, HCC recapture, and denial prevention through documentation quality.",
    source2Tagline: "The notes drive the revenue.",
    strategicObservation: (d) => {
      const timePct = d.totalValue > 0 ? Math.round((d.timeValue / d.totalValue) * 100) : 0;
      return timePct > 60
        ? `Your value model is ${timePct}% time-driven. This indicates significant documentation burden\u2014providers are spending substantial time that could be redirected to patient care and capacity.`
        : `Your value model balances time recapture (${timePct}%) with documentation quality (${100 - timePct}%). This balanced profile typically indicates both operational and revenue optimization opportunities.`;
    },
    page2Intro: (d) => `${fmtNum(d.hoursReturned)} hours returned to your providers. Here\u2019s how each driver works.`,
    closingInsight: "Give providers their time back\u2014and the documentation gets better, not worse. That\u2019s the counterintuitive truth about ambient documentation. Better notes come from less time documenting.",
    keyMetrics: [
      "1. Documentation time per encounter (target: -50%)",
      "2. Provider satisfaction score (target: +15 pts)",
      "3. wRVU per encounter trend (target: +2-5%)",
    ],
  },
  ed: {
    label: "Emergency Department",
    coverLabel: "EMERGENCY DEPARTMENT VALUE ASSESSMENT",
    providerType: "ED physician",
    providerTypePlural: "ED physicians",
    coverSubtitle: (d) => `${fmtNum(d.providers)} ED physicians \u00B7 ${fmtNum(d.encounters)} encounters \u00B7 Emergency`,
    thesisQuestion: "In the ED, every minute matters. What happens when you give them back?",
    thesisParagraph: "Emergency documentation creates value through two mechanisms: throughput gains (LWBS reduction, faster disposition, admission capture) and revenue accuracy (E&M level precision, denial prevention). Speed and documentation quality are no longer a trade-off.",
    source1Label: "THROUGHPUT UNLOCKED",
    source1Description: "LWBS reduction, faster door-to-doc times, and additional patient capacity.",
    source1Tagline: "Speed saves lives\u2014and revenue.",
    source2Label: "REVENUE CAPTURED",
    source2Description: "E&M accuracy, admission capture, and denial prevention from complete documentation.",
    source2Tagline: "Capture every encounter completely.",
    strategicObservation: (d) => {
      const timePct = d.totalValue > 0 ? Math.round((d.timeValue / d.totalValue) * 100) : 0;
      return timePct > 60
        ? `Your model is ${timePct}% throughput-driven. This suggests LWBS and capacity are your primary value levers\u2014common in high-volume EDs where every recovered patient generates significant downstream value.`
        : `Your model balances throughput (${timePct}%) with revenue accuracy (${100 - timePct}%). Mature ED implementations typically optimize both simultaneously.`;
    },
    page2Intro: (d) => `${fmtNum(d.hoursReturned)} hours returned to your ED physicians. Here\u2019s how each driver works.`,
    closingInsight: "In emergency medicine, every minute spent documenting is a minute not spent with the next patient. Ambient documentation doesn\u2019t just save time\u2014it removes the trade-off between thorough documentation and throughput.",
    keyMetrics: [
      "1. Documentation time per encounter (target: -50%)",
      "2. LWBS rate reduction (target: -15-25%)",
      "3. E&M accuracy / level distribution shift",
    ],
  },
  inpatient: {
    label: "Inpatient",
    coverLabel: "INPATIENT VALUE ASSESSMENT",
    providerType: "hospitalist",
    providerTypePlural: "hospitalists",
    coverSubtitle: (d) => `${fmtNum(d.providers)} hospitalists \u00B7 ${fmtNum(d.encounters)} encounters \u00B7 Inpatient`,
    thesisQuestion: "If we give hospitalists time back, what happens to your hospital?",
    thesisParagraph: "Inpatient documentation creates value through capacity and retention (reduced rounding documentation burden, hospitalist retention) and revenue optimization (DRG accuracy, CDI efficiency, denial prevention). The notes drive the entire downstream revenue cycle.",
    source1Label: "CAPACITY UNLOCKED",
    source1Description: "Rounding time recovered, reduced burnout, and hospitalist retention.",
    source1Tagline: "The constraint is time. Remove it.",
    source2Label: "REVENUE OPTIMIZED",
    source2Description: "DRG accuracy, CDI query reduction, and denial prevention.",
    source2Tagline: "The notes drive the revenue.",
    strategicObservation: (d) => {
      const timePct = d.totalValue > 0 ? Math.round((d.timeValue / d.totalValue) * 100) : 0;
      return timePct > 50
        ? `Your model is ${timePct}% capacity-driven, indicating retention and operational gains dominate. This is common when turnover costs are high and replacement cycles are long.`
        : `Your model is ${100 - timePct}% revenue-driven. DRG accuracy and denial prevention represent the largest value pools\u2014typical for organizations with complex case mix and documentation gaps.`;
    },
    page2Intro: (d) => `${fmtNum(d.hoursReturned)} hours returned to your hospitalists. Here\u2019s how each driver works.`,
    closingInsight: "Hospitalist documentation drives everything downstream\u2014coding accuracy, denial prevention, care transitions. When the notes are complete in real-time, the entire revenue cycle benefits.",
    keyMetrics: [
      "1. Documentation time per encounter (target: -50%)",
      "2. Hospitalist satisfaction score (target: +15 pts)",
      "3. CDI query rate per admission (target: -25%)",
    ],
  },
  nursing: {
    label: "Inpatient Nursing",
    coverLabel: "NURSING VALUE ASSESSMENT",
    providerType: "bed",
    providerTypePlural: "beds",
    coverSubtitle: (d) => `${fmtNum(d.nursingStaffedBeds || 0)} beds \u00B7 ${fmtNum(d.nursingFTEs || d.providers)} nurse FTEs \u00B7 Inpatient Nursing`,
    thesisQuestion: "Nurses don\u2019t bill. So where does the value live?",
    thesisParagraph: "Nursing documentation creates value through two mechanisms: labor economics (overtime reduction, retention, agency cost avoidance) and care quality (HAPI prevention, falls reduction, patient experience). The budget impact is real\u2014and so is the care improvement.",
    source1Label: "LABOR ECONOMICS",
    source1Description: "Overtime reduction, nurse retention savings, and agency cost avoidance.",
    source1Tagline: "The budget impact is real.",
    source2Label: "CARE QUALITY",
    source2Description: "HAPI prevention, falls reduction, and patient experience improvement.",
    source2Tagline: "Better care starts with better information.",
    strategicObservation: (d) => {
      const timePct = d.totalValue > 0 ? Math.round((d.timeValue / d.totalValue) * 100) : 0;
      return timePct > 70
        ? `Your model is ${timePct}% labor economics\u2014overtime, retention, and agency costs dominate. This is typical for organizations with high turnover or significant agency dependence.`
        : `Your model balances labor economics (${timePct}%) with care quality (${100 - timePct}%). This profile suggests both staffing and patient outcomes can improve simultaneously.`;
    },
    page2Intro: (d) => `${fmtNum(d.hoursReturned)} hours returned to your nursing staff. Here\u2019s how each driver works.`,
    closingInsight: "Nurses don\u2019t bill. But their documentation drives care quality, and their time drives labor economics. Ambient documentation creates value in the two places it matters most for nursing\u2014the budget and the bedside.",
    keyMetrics: [
      "1. Documentation time per shift (target: -40%)",
      "2. Nurse satisfaction / burnout score (target: +15 pts)",
      "3. Overtime hours per FTE per week (target: -25%)",
    ],
  },
};

const ExplorePDFDocument = ({ data }: { data: ExplorePDFData }) => {
  const config = SETTING_CONFIGS[data.careSetting];
  const orgName = data.clientName || "Organization";
  const timeDrivers = data.drivers.filter((d) => d.category === "time");
  const docDrivers = data.drivers.filter((d) => d.category === "documentation");
  const timeTotal = timeDrivers.reduce((s, d) => s + safe(d.value), 0);
  const docTotal = docDrivers.reduce((s, d) => s + safe(d.value), 0);

  const unitCount = data.careSetting === "nursing" ? (data.nursingStaffedBeds || data.providers) : data.providers;
  const perUnit = unitCount > 0 ? Math.round(data.netAnnualValue / unitCount) : 0;

  const year1Value = data.netAnnualValue;
  const year1Cost = data.annualInvestment + safe(data.implementationCost);
  const year2Value = Math.round(data.netAnnualValue * 1.1);
  const year2Cost = data.annualInvestment;
  const year3Value = Math.round(data.netAnnualValue * 1.21);
  const year3Cost = data.annualInvestment;
  const cumulative1 = year1Value - year1Cost;
  const cumulative2 = cumulative1 + (year2Value - year2Cost);
  const cumulative3 = cumulative2 + (year3Value - year3Cost);
  const year3Roi = year3Cost > 0 ? ((year3Value) / year3Cost).toFixed(1) : "N/A";

  const fullScaleMultiplier = unitCount > 0
    ? (data.fullScaleProviders / unitCount) * (data.fullScaleUtilization / Math.max(data.utilizationPercent, 1))
    : 1;
  const fullScaleNetValue = Math.round(data.netAnnualValue * fullScaleMultiplier);
  const fullScaleInvestment = Math.round(data.annualInvestment * (data.fullScaleProviders / Math.max(unitCount, 1)));
  const perUnitFullScale = data.fullScaleProviders > 0 ? Math.round(fullScaleNetValue / data.fullScaleProviders) : 0;

  const realizationRates = data.drivers
    .filter((d) => d.inputs && (d.inputs.realizationRate || d.inputs.realization))
    .map((d) => ({
      name: d.name,
      rate: `${safe(Number(d.inputs?.realizationRate || d.inputs?.realization || d.inputs?.wrvuRealization || 0))}%`,
    }));

  return (
    <Document>
      <PDFCoverPage
        reportLabel={config.coverLabel}
        title={orgName}
        subtitle={config.coverSubtitle(data)}
        preparedBy={data.preparedBy}
      />

      {/* PAGE 1: THE THESIS */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>THE THESIS</Text>

          <View style={[styles.cardBg, { paddingVertical: 14, paddingHorizontal: 18, marginBottom: 8 }]}>
            <Text style={{ fontSize: 14, color: colors.secondary, marginBottom: 6 }}>
              {config.coverSubtitle(data)}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                  PROJECTED NET ANNUAL VALUE
                </Text>
                <Text style={{ fontSize: 36, fontWeight: "bold", color: colors.primary }}>
                  {fmtCurrency(data.netAnnualValue)}
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 10, lineHeight: 1.5 }}>
              {config.thesisQuestion}
            </Text>

            <View style={{ flexDirection: "row", gap: 6 }}>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{fmtNum(unitCount)}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>{config.providerTypePlural}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{fmtNum(data.encounters)}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>encounters</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{data.utilizationPercent}%</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>utilization</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(data.annualInvestment)}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>investment</Text>
              </View>
            </View>
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabel}>TWO SOURCES OF VALUE</Text>
          <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8, lineHeight: 1.5 }}>
            {config.thesisParagraph}
          </Text>

          <View style={styles.divider} />

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                {config.source1Label}
              </Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>
                {fmtCurrency(timeTotal)}
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4, marginBottom: 6 }}>
                {config.source1Description}
              </Text>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                {config.source1Tagline}
              </Text>
            </View>

            <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
              <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                {config.source2Label}
              </Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
                {fmtCurrency(docTotal)}
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4, marginBottom: 6 }}>
                {config.source2Description}
              </Text>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>
                {config.source2Tagline}
              </Text>
            </View>
          </View>

          <View style={styles.calloutBox}>
            <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
              STRATEGIC OBSERVATION
            </Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
              {config.strategicObservation(data)}
            </Text>
          </View>

          <PageFooter pageNum={1} orgName={orgName} settingLabel={config.label} />
        </View>
      </Page>

      {/* PAGE 2: VALUE DRIVERS */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>YOUR VALUE DRIVERS</Text>
          <Text style={styles.sectionHeadline}>How Time Becomes Value</Text>
          <Text style={styles.body}>
            {config.page2Intro(data)}
          </Text>

          <View style={styles.divider} />

          {timeDrivers.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.sectionLabelGray}>{config.source1Label}</Text>

              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                {timeDrivers.map((driver, i) => (
                  <View key={driver.id}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{driver.name}</Text>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(driver.value)}</Text>
                        </View>
                        {driver.calcSteps && driver.calcSteps.map((step, si) => (
                          <Text key={si} style={{ fontSize: 9, color: si === driver.calcSteps!.length - 1 ? colors.primary : colors.secondary, lineHeight: 1.5, fontWeight: si === driver.calcSteps!.length - 1 ? "bold" : "normal" }}>
                            {step}
                          </Text>
                        ))}
                        {driver.calibrationNote && (
                          <Text style={{ fontSize: 8.5, color: colors.tertiary, marginTop: 2 }}>
                            {driver.calibrationNote}
                          </Text>
                        )}
                      </View>
                    </View>
                    {i < timeDrivers.length - 1 && (
                      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 6 }} />
                    )}
                  </View>
                ))}
                <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 8 }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{config.source1Label} Subtotal</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{fmtCurrency(timeTotal)}</Text>
                </View>
              </View>
            </View>
          )}

          {docDrivers.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <View style={styles.divider} />
              <Text style={{ ...styles.sectionLabel, marginBottom: 8 }}>{config.source2Label}</Text>

              <View style={[styles.cardBg, { marginBottom: 8 }]}>
                {docDrivers.map((driver, i) => (
                  <View key={driver.id}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{driver.name}</Text>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(driver.value)}</Text>
                        </View>
                        {driver.calcSteps && driver.calcSteps.map((step, si) => (
                          <Text key={si} style={{ fontSize: 9, color: si === driver.calcSteps!.length - 1 ? colors.primary : colors.secondary, lineHeight: 1.5, fontWeight: si === driver.calcSteps!.length - 1 ? "bold" : "normal" }}>
                            {step}
                          </Text>
                        ))}
                        {driver.calibrationNote && (
                          <Text style={{ fontSize: 8.5, color: colors.tertiary, marginTop: 2 }}>
                            {driver.calibrationNote}
                          </Text>
                        )}
                      </View>
                    </View>
                    {i < docDrivers.length - 1 && (
                      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 6 }} />
                    )}
                  </View>
                ))}
                <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 8 }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{config.source2Label} Subtotal</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{fmtCurrency(docTotal)}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.thickDivider} />

          <View style={[styles.cardBg, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
            <View>
              <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                PROJECTED ANNUAL VALUE
              </Text>
              <Text style={{ fontSize: 28, fontWeight: "bold", color: colors.primary }}>
                {fmtCurrency(data.netAnnualValue)}
              </Text>
            </View>
            <Text style={{ fontSize: 10, color: colors.secondary }}>
              Per {config.providerType}: ~{fmtCurrency(perUnit)}/year
            </Text>
          </View>

          <PageFooter pageNum={2} orgName={orgName} settingLabel={config.label} />
        </View>
      </Page>

      {/* PAGE 3: THE INVESTMENT CASE */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>THE INVESTMENT CASE</Text>
          <Text style={styles.sectionHeadline}>Infrastructure, Not Expense</Text>
          <Text style={styles.body}>
            Investment stays flat while value grows. This is the signature of infrastructure{"\u2014"}fixed cost, scaling returns.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionLabelGray}>3-YEAR PROJECTION</Text>

          <View style={[styles.cardBg, { marginBottom: 8 }]}>
            <View style={{ flexDirection: "row", marginBottom: 6 }}>
              <Text style={{ flex: 1.2, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase" }}>Period</Text>
              <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Value</Text>
              <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Investment</Text>
              <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Net Value</Text>
              <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>Cumulative</Text>
            </View>
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 6 }} />

            {[
              { period: "Year 1", value: year1Value, cost: year1Cost, net: year1Value - year1Cost, cum: cumulative1 },
              { period: "Year 2", value: year2Value, cost: year2Cost, net: year2Value - year2Cost, cum: cumulative2 },
              { period: "Year 3", value: year3Value, cost: year3Cost, net: year3Value - year3Cost, cum: cumulative3 },
            ].map((row, i) => (
              <View key={i} style={{ flexDirection: "row", marginBottom: 4 }}>
                <Text style={{ flex: 1.2, fontSize: 10, color: colors.primaryText }}>{row.period}</Text>
                <Text style={{ flex: 1, fontSize: 10, color: colors.primaryText, textAlign: "right" }}>{fmtCurrency(row.value)}</Text>
                <Text style={{ flex: 1, fontSize: 10, color: colors.secondary, textAlign: "right" }}>{fmtCurrency(row.cost)}</Text>
                <Text style={{ flex: 1, fontSize: 10, color: colors.primary, fontWeight: "bold", textAlign: "right" }}>{fmtCurrency(row.net)}</Text>
                <Text style={{ flex: 1, fontSize: 10, color: colors.primary, fontWeight: "bold", textAlign: "right" }}>{fmtCurrency(row.cum)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.calloutBox}>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
              By Year 3, you{"\u2019"}re generating {year3Roi}{"\u00D7"} for every $1 invested. That{"\u2019"}s not a line item to cut in a downturn{"\u2014"}it{"\u2019"}s infrastructure to protect.
            </Text>
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabel}>AT SCALE</Text>
          <Text style={{ fontSize: 10.5, color: colors.secondary, marginBottom: 8 }}>
            Per-{config.providerType} economics remain consistent at scale.
          </Text>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                CURRENT MODEL
              </Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>
                {fmtCurrency(data.netAnnualValue)}/yr
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary }}>
                {fmtNum(unitCount)} {config.providerTypePlural}
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary }}>
                {data.utilizationPercent}% utilization
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary, marginTop: 4 }}>
                Per {config.providerType}: ~{fmtCurrency(perUnit)}/yr
              </Text>
            </View>

            <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
              <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>
                AT FULL SCALE
              </Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
                {fmtCurrency(fullScaleNetValue)}/yr
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary }}>
                {fmtNum(data.fullScaleProviders)} {config.providerTypePlural}
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary }}>
                {data.fullScaleUtilization}% utilization
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary, marginTop: 4 }}>
                Per {config.providerType}: ~{fmtCurrency(perUnitFullScale)}/yr
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabelGray}>KEY METRICS TO TRACK</Text>
          <View style={[styles.cardBg, { marginBottom: 6 }]}>
            {config.keyMetrics.map((metric, i) => (
              <Text key={i} style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.7 }}>
                {metric}
              </Text>
            ))}
          </View>

          <PageFooter pageNum={3} orgName={orgName} settingLabel={config.label} />
        </View>
      </Page>

      {/* PAGE 4: YOUR SUMMARY + METHODOLOGY */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>YOUR ASSESSMENT</Text>

          <View style={[styles.cardBg, { marginBottom: 10, paddingVertical: 16, paddingHorizontal: 20 }]}>
            <Text style={{ fontSize: 18, color: colors.primaryText, marginBottom: 4 }}>
              {fmtNum(unitCount)} {config.providerTypePlural}.
            </Text>
            <Text style={{ fontSize: 18, color: colors.primaryText, marginBottom: 4 }}>
              {fmtNum(data.encounters)} encounters.
            </Text>
            <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
              {fmtCurrency(data.netAnnualValue)} projected net value.
            </Text>
            <Text style={{ fontSize: 11, color: colors.secondary }}>
              {fmtCurrency(perUnit)} per {config.providerType} per year.
            </Text>
          </View>

          <View style={[styles.calloutBox, { marginBottom: 10 }]}>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.6 }}>
              {config.closingInsight}
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabelGray}>AT A GLANCE</Text>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                VALUE SUMMARY
              </Text>
              <View style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>{config.source1Label}</Text>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>{fmtCurrency(timeTotal)}</Text>
                </View>
                {timeDrivers.map((d) => (
                  <View key={d.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{d.name}</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{fmtCurrency(d.value)}</Text>
                  </View>
                ))}
              </View>
              <View style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>{config.source2Label}</Text>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primaryText }}>{fmtCurrency(docTotal)}</Text>
                </View>
                {docDrivers.map((d) => (
                  <View key={d.id} style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 8, marginBottom: 1 }}>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{d.name}</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary }}>{fmtCurrency(d.value)}</Text>
                  </View>
                ))}
              </View>
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>Net Annual Value</Text>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(data.netAnnualValue)}</Text>
              </View>
            </View>

            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                INVESTMENT SUMMARY
              </Text>
              <View style={{ marginBottom: 2 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>Annual Investment</Text>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtCurrency(data.annualInvestment)}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>Per {config.providerType}</Text>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtCurrency(unitCount > 0 ? data.annualInvestment / unitCount : 0)}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>Year 1 ROI</Text>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>{data.roi.toFixed(1)}{"\u00D7"}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>Year 3 Cumulative</Text>
                  <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtCurrency(cumulative3)}</Text>
                </View>
              </View>
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                UTILIZATION
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                <Text style={{ fontSize: 9, color: colors.secondary }}>Projected</Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>{data.utilizationPercent}%</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                <Text style={{ fontSize: 9, color: colors.secondary }}>Hours Returned</Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>{fmtNum(data.hoursReturned)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 9, color: colors.secondary }}>Per {config.providerType}/week</Text>
                <Text style={{ fontSize: 9, color: colors.secondary }}>
                  {unitCount > 0 ? (data.hoursReturned / unitCount / 52).toFixed(1) : "0"} hrs
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabel}>METHODOLOGY</Text>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                YOUR INPUTS
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7 }}>
                {fmtNum(unitCount)} {config.providerTypePlural}{"\n"}
                {fmtNum(data.encounters)} encounters{"\n"}
                {data.utilizationPercent}% utilization{"\n"}
                {data.minutesSavedPerEncounter} min saved{"\n"}
                {fmtCurrency(data.annualInvestment)} investment{"\n"}
                {fmtNum(data.hoursReturned)} hrs returned
              </Text>
            </View>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                REALIZATION RATES
              </Text>
              {realizationRates.length > 0 ? (
                realizationRates.map((r, i) => (
                  <Text key={i} style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7 }}>
                    {r.name}: {r.rate}
                  </Text>
                ))
              ) : (
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7 }}>
                  Values use conservative{"\n"}realization rates based on{"\n"}observed implementations.
                </Text>
              )}
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7, marginTop: 4 }}>
                Conservative by design.{"\n"}Based on observed{"\n"}implementations.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5 }}>
            This assessment is for planning purposes. Realization rates are conservative and based on observed implementations. The goal is a framework for decisions, not a prediction. Validate with your organization{"\u2019"}s data post-implementation.
          </Text>

          <PageFooter pageNum={4} orgName={orgName} settingLabel={config.label} />
        </View>
      </Page>
    </Document>
  );
};

export const generateExplorePDF = async (data: ExplorePDFData): Promise<void> => {
  const blob = await pdf(<ExplorePDFDocument data={data} />).toBlob();

  const config = SETTING_CONFIGS[data.careSetting];
  const orgName = data.clientName ? data.clientName.replace(/[^a-zA-Z0-9]/g, "_") : "Organization";
  const settingSlug = data.careSetting === "ed" ? "ED" : config.label.replace(/\s+/g, "_");
  const fileName = `Abridge_${settingSlug}_Value_Assessment_${orgName}.pdf`;

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

  if (isMobile) {
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: "application/pdf" });
      const shareData = { files: [file], title: `${config.label} Value Assessment` };

      if (navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
        }
      }
    }

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } else {
    saveAs(blob, fileName);
  }
};

export default ExplorePDFDocument;
