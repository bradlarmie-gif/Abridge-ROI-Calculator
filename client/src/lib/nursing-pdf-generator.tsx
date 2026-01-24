import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
  Svg,
  Path,
  Line,
  Circle,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";

export interface DriverCalculation {
  id: string;
  name: string;
  value: number;
  category: "labor" | "quality" | "qualitative";
  inputs: Record<string, unknown>;
  isPotentialValue?: boolean;
}

export interface JourneyData {
  pilotBeds: number;
  pilotEvents: number;
  pilotUtilization: number;
  pilotValue: number;
  fullScaleBeds: number;
  fullScaleUtilization: number;
  fullScaleValue: number;
  scalingPace: string;
  scalingMonths: number;
  networkEffect: number;
}

export interface NursingPDFData {
  organizationName?: string;
  careSetting: string;
  unitName: string;
  unitNamePlural: string;

  staffedBeds: number;
  nurseFTEs: number;
  documentationEvents: number;
  eligibleEvents: number;
  utilization: number;
  timeSavedPerEvent: number;
  hoursReturned: number;

  totalValue: number;
  potentialValue: number;
  investment: number;
  netGain: number;
  roi: number;
  costPerBed: number;

  drivers: DriverCalculation[];
  laborTotal: number;
  qualityTotal: number;
  laborPct: number;
  qualityPct: number;

  year1Value: number;
  year2Value: number;
  year3Value: number;
  year1Cost: number;
  year2Cost: number;
  year3Cost: number;
  threeYearValue: number;
  threeYearCost: number;
  threeYearNet: number;

  journey: JourneyData;
}

const colors = {
  primary: "#EA2C00",
  primaryLight: "#FEF2F0",
  primaryDark: "#C42400",
  green: "#059669",
  greenLight: "#ECFDF5",
  greenDark: "#047857",
  black: "#111827",
  darkGray: "#374151",
  mediumGray: "#6B7280",
  lightGray: "#9CA3AF",
  paleGray: "#F9FAFB",
  borderGray: "#E5E7EB",
  white: "#FFFFFF",
  success: "#059669",
  successLight: "#d1fae5",
  warning: "#f59e0b",
  warningLight: "#fef3c7",
  amber: "#F59E0B",
  amberLight: "#FEF3C7",
  amberDark: "#92400E",
  blue: "#3B82F6",
  blueLight: "#EFF6FF",
  purple: "#7C3AED",
  purpleLight: "#F3E8FF",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.black,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  logo: {
    width: 80,
    height: 20,
  },
  headerRight: {
    textAlign: "right",
  },
  headerTitle: {
    fontSize: 9,
    color: colors.mediumGray,
  },
  pageTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  pageSubtitle: {
    fontSize: 8.5,
    color: colors.mediumGray,
    marginBottom: 16,
    fontStyle: "italic",
  },
  narrativeBox: {
    backgroundColor: colors.paleGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 14,
    marginBottom: 16,
  },
  narrativeText: {
    fontSize: 8.5,
    lineHeight: 1.5,
    color: colors.darkGray,
  },
  narrativeBold: {
    fontWeight: "bold",
    color: colors.black,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricsRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 10,
    marginRight: 8,
    alignItems: "center",
  },
  metricCardLast: {
    marginRight: 0,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.green,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 7,
    color: colors.mediumGray,
    textTransform: "uppercase",
    textAlign: "center",
  },
  valueBreakdown: {
    flexDirection: "row",
    marginBottom: 16,
  },
  valueColumn: {
    flex: 1,
    marginRight: 12,
  },
  valueColumnLast: {
    marginRight: 0,
  },
  valueColumnTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  progressName: {
    fontSize: 7.5,
    color: colors.darkGray,
  },
  progressValue: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: colors.black,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.paleGray,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  investmentSection: {
    backgroundColor: colors.paleGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  investmentTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  investmentRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  investmentCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 8,
    marginRight: 6,
    alignItems: "center",
  },
  investmentCardLast: {
    marginRight: 0,
  },
  cardLabel: {
    fontSize: 6,
    color: colors.mediumGray,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.black,
  },
  potentialValueNote: {
    backgroundColor: colors.amberLight,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },
  potentialValueTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.amberDark,
    marginBottom: 4,
  },
  potentialValueText: {
    fontSize: 7.5,
    color: colors.amberDark,
    lineHeight: 1.4,
  },
  qualitativeSection: {
    backgroundColor: colors.blueLight,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  qualitativeTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.blue,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  qualitativeItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  qualitativeBullet: {
    fontSize: 8,
    color: colors.blue,
    marginRight: 6,
  },
  qualitativeText: {
    fontSize: 7.5,
    color: colors.darkGray,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 7,
    color: colors.lightGray,
  },
  driverHeader: {
    marginBottom: 16,
  },
  driverCategory: {
    fontSize: 7,
    color: colors.mediumGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  driverName: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  driverValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.green,
    fontFamily: "Helvetica-Bold",
  },
  driverValuePotential: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.amber,
    fontFamily: "Helvetica-Bold",
  },
  theoryBox: {
    backgroundColor: colors.amberLight,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: 4,
    padding: 14,
    marginBottom: 16,
  },
  theoryTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.amberDark,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  theoryText: {
    fontSize: 8.5,
    lineHeight: 1.5,
    color: colors.amberDark,
  },
  calcSection: {
    marginBottom: 16,
  },
  calcTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stepBox: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  stepLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 2,
  },
  stepQuestion: {
    fontSize: 7.5,
    color: colors.mediumGray,
    fontStyle: "italic",
    marginBottom: 6,
  },
  stepCalc: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  stepInput: {
    backgroundColor: colors.paleGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  stepInputText: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    fontFamily: "Courier",
  },
  mono: {
    fontFamily: "Courier",
  },
  stepOperator: {
    fontSize: 10,
    color: colors.mediumGray,
    marginRight: 6,
  },
  stepEquals: {
    fontSize: 10,
    color: colors.mediumGray,
    marginHorizontal: 6,
  },
  stepResult: {
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepResultText: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.green,
    fontFamily: "Courier",
  },
  stepNote: {
    fontSize: 7,
    color: colors.mediumGray,
    fontStyle: "italic",
    marginTop: 4,
  },
  calloutBox: {
    backgroundColor: colors.amberLight,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: 4,
    padding: 12,
    marginBottom: 14,
  },
  calloutTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.amberDark,
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 7.5,
    color: colors.amberDark,
    lineHeight: 1.4,
  },
  benchmarkBox: {
    backgroundColor: colors.paleGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 12,
    marginBottom: 14,
  },
  benchmarkTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.darkGray,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  benchmarkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  benchmarkLabel: {
    fontSize: 7.5,
    color: colors.darkGray,
  },
  benchmarkValue: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: colors.black,
  },
  finalValueBox: {
    backgroundColor: colors.greenLight,
    borderWidth: 2,
    borderColor: colors.green,
    borderRadius: 4,
    padding: 14,
    marginBottom: 14,
    alignItems: "center",
  },
  finalValueLabel: {
    fontSize: 8,
    color: colors.greenDark,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  finalValueAmount: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.green,
    fontFamily: "Helvetica-Bold",
  },
  finalValueAmountPotential: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.amber,
    fontFamily: "Helvetica-Bold",
  },
  implicationBox: {
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 4,
    padding: 12,
    marginBottom: 14,
  },
  implicationTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.greenDark,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  implicationText: {
    fontSize: 8,
    color: colors.greenDark,
    lineHeight: 1.5,
  },
  potentialCallout: {
    backgroundColor: colors.amberLight,
    borderWidth: 2,
    borderColor: colors.amber,
    borderRadius: 4,
    padding: 14,
    marginBottom: 14,
  },
  potentialCalloutTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.amberDark,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  potentialCalloutText: {
    fontSize: 8,
    color: colors.amberDark,
    lineHeight: 1.5,
  },
  fullPictureCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
  },
  fullPictureTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 4,
  },
  fullPictureDescription: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.4,
    marginBottom: 6,
  },
  fullPictureImpact: {
    fontSize: 7,
    color: colors.mediumGray,
    fontStyle: "italic",
  },
  fullPictureWhyNot: {
    fontSize: 7,
    color: colors.blue,
    fontStyle: "italic",
    lineHeight: 1.4,
  },
  valueBreakdownIntro: {
    backgroundColor: colors.paleGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  valueBreakdownIntroTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  valueBreakdownIntroText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
  },
  methodologySection: {
    marginBottom: 16,
  },
  methodologyBox: {
    backgroundColor: colors.paleGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
  },
  methodologyTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  methodologyItem: {
    fontSize: 7.5,
    color: colors.darkGray,
    marginBottom: 3,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.paleGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 7,
    fontWeight: "bold",
    color: colors.darkGray,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.borderGray,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableCell: {
    flex: 1,
    fontSize: 8,
    color: colors.darkGray,
  },
  tableCellBold: {
    flex: 1,
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
  },
  closingSection: {
    marginTop: 20,
  },
  closingQuote: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
  },
  closingQuoteText: {
    fontSize: 9,
    fontStyle: "italic",
    color: colors.primaryDark,
    lineHeight: 1.6,
    textAlign: "center",
  },
  closingHighlight: {
    fontWeight: "bold",
  },
  connectedSection: {
    backgroundColor: colors.blueLight,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: 4,
    padding: 14,
    marginBottom: 16,
  },
  connectedTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.blue,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  connectedSubtitle: {
    fontSize: 8,
    color: colors.blue,
    fontStyle: "italic",
    marginBottom: 8,
  },
  connectedText: {
    fontSize: 8,
    color: colors.darkGray,
    lineHeight: 1.5,
  },
  journeyChart: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 16,
    marginBottom: 14,
  },
  journeyScenario: {
    flexDirection: "row",
    marginBottom: 14,
  },
  journeyScenarioCard: {
    flex: 1,
    backgroundColor: colors.paleGray,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    padding: 10,
    marginRight: 8,
  },
  journeyScenarioCardHighlight: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.green,
    borderRadius: 4,
    padding: 10,
  },
  journeyScenarioTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 6,
  },
  journeyScenarioTitleHighlight: {
    fontSize: 8,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 6,
  },
  journeyScenarioRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  journeyScenarioCheck: {
    fontSize: 8,
    color: colors.mediumGray,
    marginRight: 6,
  },
  journeyScenarioText: {
    fontSize: 8,
    color: colors.darkGray,
  },
  journeyScenarioValue: {
    fontWeight: "bold",
    color: colors.black,
  },
  journeyScenarioValueGreen: {
    fontWeight: "bold",
    color: colors.green,
  },
  compoundingBox: {
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 4,
    padding: 14,
    marginBottom: 14,
  },
  compoundingTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: colors.greenDark,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  compoundingValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.green,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  compoundingSubtext: {
    fontSize: 8,
    color: colors.greenDark,
  },
});

const formatCurrency = (value: number): string => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${value.toLocaleString()}`;
};

const formatNumber = (value: number): string => {
  return value.toLocaleString();
};

const driverTheories: Record<string, string> = {
  nursingOvertime: `Every nursing unit has a rhythm: shift start, rounds, assessments, medications, documentation, handoff, shift end. In theory, documentation fits within the shift. In practice, it doesn't.

Nurses routinely stay 30-60 minutes past their scheduled shift to finish charting. Multiply that across your FTEs, 5 days a week, 50 weeks a year—and you're looking at tens of thousands of overtime hours. At 1.5× pay, that's real budget impact.

But here's the thing: not all overtime is documentation. Some is patient acuity. Some is understaffing. Some is just the nature of nursing. We estimate ~33% of overtime is specifically end-of-shift charting catch-up—the kind that real-time ambient documentation can address.

This is the most measurable driver in nursing. You can track it in payroll data, week over week, unit by unit. If overtime drops after Abridge deployment, you'll see it.`,

  nursingAgency: `Agency and travel nurses exist because hospitals can't retain enough staff nurses. The reasons are complex—compensation, schedules, ratios, culture—but documentation burden is consistently in the top 3 complaints in nursing exit interviews.

The math is stark: a staff RN costs $70-90K fully loaded. An agency RN costs $140-200K when you factor agency fees, housing, travel stipends, and benefits. That's a $75,000+ premium per FTE.

Now here's the chain of logic: Documentation burden drives burnout. Burnout drives turnover. Turnover creates staffing gaps. Gaps get filled with agency nurses. Agency nurses cost 2× staff nurses.

If you can break any link in that chain, you reduce agency spend. Abridge targets the first link: documentation burden. When nurses spend less time charting, they're less burned out. When they're less burned out, more of them stay. When more of them stay, you need fewer travelers.

We model only 10% of agency FTEs converting back to staff positions—driven by the retention improvement from documentation burden reduction. Some organizations see more. But we'd rather understate than overstate an indirect benefit.`,

  nursingRetention: `Nursing turnover runs 18-25% annually—significantly higher than most hospital roles. The cost per departure is $40-60K when you factor in recruiting, hiring, onboarding, training, and the productivity ramp for new nurses learning unit workflows.

But the real cost is harder to measure: institutional knowledge lost, team dynamics disrupted, patient relationships broken, and the burden on remaining staff who pick up extra shifts.

Why do nurses leave? The research is consistent: workload and patient ratios, schedules and work-life balance, compensation and career growth, and administrative burden and documentation.

Documentation burden shows up in every nursing satisfaction survey. It's the thing nurses didn't sign up for. They became nurses to care for patients, not to chart about caring for patients.

Here's where we're careful: nursing burnout is multifactorial. Documentation is ONE driver, not THE driver. Unlike physicians—where 50% of burnout is documentation-related—nurses face additional pressures (ratios, acuity, physical demands) that Abridge doesn't address.

We use 15% attribution for nursing (vs 30% for physicians) because we want to be honest about what documentation improvement can and can't do. It helps. It's not a silver bullet.`,

  nursingHAPI: `Hospital-acquired pressure injuries (HAPIs) are a quality measure, a patient safety issue, and a financial drain. CMS doesn't reimburse for them. The hospital absorbs the full cost—$10,000 to $50,000+ depending on severity.

HAPIs happen when: skin assessments are missed or delayed, turning schedules aren't followed, risk factors aren't communicated across shifts, and early warning signs aren't documented and acted on.

Real-time documentation can help with all of these. When assessments are charted as they happen (not hours later at end of shift), the information is available sooner. When risk factors are captured in conversation, they're less likely to be forgotten.

BUT HERE'S WHERE WE'RE CAREFUL: HAPIs are prevented through clinical care—turning, positioning, nutrition, skin care, mobility. Documentation supports this but doesn't replace it. A perfectly documented patient can still develop a pressure injury if the interventions don't happen.

The causal link between documentation and HAPI prevention is indirect: Better documentation → better visibility → earlier intervention → fewer HAPIs. We believe this link is real. We've seen it in nursing units that improved documentation practices. But we can't claim a direct 1:1 relationship.

That's why we show this as "POTENTIAL VALUE"—not to diminish it, but to be intellectually honest about the causal chain.`,

  nursingFalls: `Patient falls cost $3K-$30K per incident. Prevention depends on real-time risk awareness and timely interventions—both of which require time at the bedside.

Falls happen when: risk assessments are incomplete or delayed, mobility and toileting schedules aren't followed, environmental hazards aren't identified and addressed, and nursing staff are stretched too thin to provide adequate supervision.

Real-time documentation means nurses spend less time charting and more time at the bedside where they can observe early signs of fall risk—confusion, restlessness, attempts to get out of bed.

Like HAPI prevention, this is an indirect benefit. The chain is: less charting time → more bedside presence → better situational awareness → faster intervention → fewer falls. The mechanism is clear, but direct attribution is complex.

We show this as "POTENTIAL VALUE" because the causal link, while well-supported, is indirect. Your quality team can help you assess whether the assumed prevention rate fits your patient population.`,
};

const driverImplications: Record<string, (value: number, data: NursingPDFData) => string> = {
  nursingOvertime: (value, data) => {
    const hoursReduced = (data.drivers.find(d => d.id === "nursingOvertime")?.inputs?.hoursReduced as number) || 0;
    return `${formatNumber(Math.round(hoursReduced))} overtime hours eliminated annually—that's ${formatCurrency(value)} in direct payroll savings. This shows up immediately in your labor reports and is one of the most measurable impacts of ambient documentation.`;
  },
  nursingAgency: (value, data) => {
    const ftesReplaced = (data.drivers.find(d => d.id === "nursingAgency")?.inputs?.ftesReplaced as number) || 0;
    return `Converting ${ftesReplaced.toFixed(1)} agency FTEs to staff positions saves ${formatCurrency(value)} annually. Beyond cost, this improves care continuity—agency nurses don't know your patients, your workflows, or your culture.`;
  },
  nursingRetention: (value, data) => {
    const nursesRetained = (data.drivers.find(d => d.id === "nursingRetention")?.inputs?.nursesRetained as number) || 0;
    return `Retaining ${nursesRetained.toFixed(1)} additional nurses per year saves ${formatCurrency(value)} in replacement costs. This is a 12+ month impact—but satisfaction and engagement improvements often appear within months.`;
  },
  nursingHAPI: (value, data) => {
    const hapisAvoided = (data.drivers.find(d => d.id === "nursingHAPI")?.inputs?.hapisAvoided as number) || 0;
    return `If ${hapisAvoided.toFixed(1)} HAPIs are prevented through better bedside time and assessment documentation, that's ${formatCurrency(value)} in avoided costs. This is potential value—the causal link is indirect but well-supported in literature.`;
  },
  nursingFalls: (value, data) => {
    const fallsAvoided = (data.drivers.find(d => d.id === "nursingFalls")?.inputs?.fallsAvoided as number) || 0;
    return `If ${fallsAvoided.toFixed(1)} falls are prevented through improved bedside presence and situational awareness, that's ${formatCurrency(value)} in avoided costs. This is potential value—attribution is indirect but the mechanism is clear.`;
  },
};

interface StepData {
  label: string;
  question: string;
  inputs: Array<{ value: string; label?: string }>;
  operators?: string[];
  result: string;
  note?: string;
  noteHighlight?: boolean;
}

function getDriverSteps(driver: DriverCalculation, data: NursingPDFData): StepData[] {
  const inputs = driver.inputs;
  
  switch (driver.id) {
    case "nursingOvertime":
      return [
        {
          label: "Step 1: Daily OT Per Nurse",
          question: "How much overtime does documentation drive?",
          inputs: [
            { value: `${inputs.otMinutesPerShift || 15}`, label: "min/shift" },
          ],
          result: `${inputs.otMinutesPerShift || 15} min overtime`,
          note: "Documentation catch-up typically adds 15-30 minutes per shift.",
        },
        {
          label: "Step 2: Annual OT Hours",
          question: "What's the total overtime impact?",
          inputs: [
            { value: formatNumber(inputs.nurseFTEs as number || data.nurseFTEs), label: "nurses" },
            { value: `${inputs.otMinutesPerShift || 15}`, label: "min" },
            { value: `${inputs.shiftsPerYear || 260}`, label: "shifts" },
          ],
          operators: ["x", "x", "÷ 60 ="],
          result: `${formatNumber(Math.round(inputs.hoursReduced as number || 0))} hrs`,
          note: "260 shifts = 5 shifts/week × 52 weeks average per nurse.",
        },
        {
          label: "Step 3: OT Cost Eliminated",
          question: "What's the savings?",
          inputs: [
            { value: formatNumber(Math.round(inputs.hoursReduced as number || 0)), label: "hours" },
            { value: formatCurrency(inputs.otRate as number || 60), label: "OT rate" },
          ],
          operators: ["x"],
          result: formatCurrency(driver.value),
          note: "OT rate = 1.5× base ($40-50/hr → $60-75/hr).",
        },
      ];

    case "nursingAgency":
      return [
        {
          label: "Step 1: Agency Utilization",
          question: "How much agency coverage are you using?",
          inputs: [
            { value: formatNumber(inputs.agencyFTEs as number || 5), label: "agency FTEs" },
          ],
          result: `${inputs.agencyFTEs || 5} FTE agency`,
          note: "Count all agency/travel nurses as FTE equivalents.",
        },
        {
          label: "Step 2: Reduction Target",
          question: "How much can be converted to staff?",
          inputs: [
            { value: formatNumber(inputs.agencyFTEs as number || 5), label: "agency FTEs" },
            { value: `${inputs.reductionPct || 20}%`, label: "reduction" },
          ],
          operators: ["x"],
          result: `${(inputs.ftesReplaced as number || 0).toFixed(1)} FTEs`,
          note: "Conservative 20% reduction through improved retention.",
        },
        {
          label: "Step 3: Cost Savings",
          question: "What's the annual savings?",
          inputs: [
            { value: (inputs.ftesReplaced as number || 0).toFixed(1), label: "FTEs" },
            { value: formatCurrency(inputs.premiumPerFTE as number || 75000), label: "premium" },
          ],
          operators: ["x"],
          result: formatCurrency(driver.value),
          note: "Agency premium = $75K/FTE over staff cost annually.",
        },
      ];

    case "nursingRetention":
      return [
        {
          label: "Step 1: Annual Turnover",
          question: "How many nurses leave annually?",
          inputs: [
            { value: formatNumber(inputs.nurseFTEs as number || data.nurseFTEs), label: "nurses" },
            { value: `${inputs.turnoverRate || 20}%`, label: "turnover" },
          ],
          operators: ["x"],
          result: `${(inputs.annualDepartures as number || 0).toFixed(1)} departures`,
          note: "Nursing turnover averages 18-25%.",
        },
        {
          label: "Step 2: Burnout-Related",
          question: "How many are burnout-driven?",
          inputs: [
            { value: (inputs.annualDepartures as number || 0).toFixed(1), label: "departures" },
            { value: `${inputs.burnoutPct || 40}%`, label: "burnout" },
          ],
          operators: ["x"],
          result: `${(inputs.burnoutDepartures as number || 0).toFixed(1)} burnout`,
          note: "Documentation is a top burnout driver in nursing.",
        },
        {
          label: "Step 3: Abridge Impact",
          question: "How many can be retained?",
          inputs: [
            { value: (inputs.burnoutDepartures as number || 0).toFixed(1), label: "at-risk" },
            { value: `${inputs.abridgeImpact || 25}%`, label: "impact" },
          ],
          operators: ["x"],
          result: `${(inputs.nursesRetained as number || 0).toFixed(1)} retained`,
          note: "Conservative estimate—full impact takes 12+ months.",
        },
        {
          label: "Step 4: Cost Savings",
          question: "What's the value?",
          inputs: [
            { value: (inputs.nursesRetained as number || 0).toFixed(1), label: "retained" },
            { value: formatCurrency(inputs.replacementCost as number || 50000), label: "cost" },
          ],
          operators: ["x"],
          result: formatCurrency(driver.value),
          note: "Replacement cost: $40K-$60K including recruiting/onboarding.",
        },
      ];

    case "nursingHAPI":
      return [
        {
          label: "Step 1: Baseline HAPI Rate",
          question: "How many HAPIs occur annually?",
          inputs: [
            { value: formatNumber(inputs.staffedBeds as number || data.staffedBeds), label: "beds" },
            { value: `${((inputs.hapiRate as number) || 2).toFixed(1)}%`, label: "rate" },
          ],
          operators: ["x"],
          result: `${(inputs.baselineHapis as number || 0).toFixed(1)} HAPIs`,
          note: "National average HAPI rate is 2-3% of admissions.",
        },
        {
          label: "Step 2: Prevention Potential",
          question: "How many could be prevented?",
          inputs: [
            { value: (inputs.baselineHapis as number || 0).toFixed(1), label: "HAPIs" },
            { value: `${inputs.preventionRate || 10}%`, label: "prevention" },
          ],
          operators: ["x"],
          result: `${(inputs.hapisAvoided as number || 0).toFixed(1)} avoided`,
          note: "Conservative 10% through better assessment time.",
        },
        {
          label: "Step 3: Cost Avoidance",
          question: "What's the potential value?",
          inputs: [
            { value: (inputs.hapisAvoided as number || 0).toFixed(1), label: "avoided" },
            { value: formatCurrency(inputs.hapiCost as number || 20000), label: "cost" },
          ],
          operators: ["x"],
          result: formatCurrency(driver.value),
          note: "HAPI cost: $10K-$50K average. We use $20K.",
          noteHighlight: true,
        },
      ];

    case "nursingFalls":
      return [
        {
          label: "Step 1: Baseline Fall Rate",
          question: "How many falls occur annually?",
          inputs: [
            { value: formatNumber(inputs.staffedBeds as number || data.staffedBeds), label: "beds" },
            { value: `${((inputs.fallRate as number) || 3).toFixed(1)}%`, label: "rate" },
          ],
          operators: ["x"],
          result: `${(inputs.baselineFalls as number || 0).toFixed(1)} falls`,
          note: "Average fall rate: 3-5 per 1,000 patient days.",
        },
        {
          label: "Step 2: Prevention Potential",
          question: "How many could be prevented?",
          inputs: [
            { value: (inputs.baselineFalls as number || 0).toFixed(1), label: "falls" },
            { value: `${inputs.preventionRate || 10}%`, label: "prevention" },
          ],
          operators: ["x"],
          result: `${(inputs.fallsAvoided as number || 0).toFixed(1)} avoided`,
          note: "Conservative 10% through better bedside time.",
        },
        {
          label: "Step 3: Cost Avoidance",
          question: "What's the potential value?",
          inputs: [
            { value: (inputs.fallsAvoided as number || 0).toFixed(1), label: "avoided" },
            { value: formatCurrency(inputs.fallCost as number || 6500), label: "cost" },
          ],
          operators: ["x"],
          result: formatCurrency(driver.value),
          note: "Fall cost: $3K-$30K average. We use $6,500.",
          noteHighlight: true,
        },
      ];

    default:
      return [];
  }
}

const ExecutiveSummary = ({ data, pageNum, totalPages }: { data: NursingPDFData; pageNum: number; totalPages: number }) => {
  const laborDrivers = data.drivers.filter(d => d.category === "labor");
  const qualityDrivers = data.drivers.filter(d => d.category === "quality");
  const qualitativeDrivers = data.drivers.filter(d => d.category === "qualitative");
  const valuePerBed = Math.round(data.netGain / data.staffedBeds);

  const getDriverColor = (index: number, total: number, isLabor: boolean): string => {
    const baseColor = isLabor ? colors.green : colors.amber;
    return baseColor;
  };

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src={abridgeLogoPath} style={styles.logo} />
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>{data.careSetting} ROI Assessment</Text>
        </View>
      </View>

      <Text style={styles.pageTitle}>EXECUTIVE SUMMARY</Text>
      <Text style={styles.pageSubtitle}>
        {data.staffedBeds} {data.unitNamePlural} | {formatNumber(data.documentationEvents)} documentation events | {data.utilization}% utilization
      </Text>

      <View style={styles.narrativeBox}>
        <Text style={styles.narrativeText}>
          <Text style={styles.narrativeBold}>Nursing documentation is different from physician documentation—and so is the ROI model.</Text>
          {"\n\n"}In outpatient and ED settings, the value story is relatively straightforward: time saved converts to visits, wRVUs, and revenue. In nursing, the story is more complex. Time saved doesn't generate revenue directly—it changes how nurses spend their shift, which cascades into retention, agency costs, patient safety, and experience scores.
          {"\n\n"}This assessment models that cascade. We start with what's most measurable (overtime, retention, agency spend) and work toward outcomes that are real but harder to attribute directly (HAPI prevention, falls, HCAHPS). We're transparent about where we're confident and where we're being conservative.
          {"\n\n"}The goal isn't to hand you a number. It's to give you a framework for thinking about value—one you can stress-test with your CNO, your finance team, and your frontline nursing leaders.
        </Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{formatCurrency(data.netGain)}</Text>
          <Text style={styles.metricLabel}>Net Annual Value</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{data.roi.toFixed(1)}x</Text>
          <Text style={styles.metricLabel}>ROI Multiple</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{formatCurrency(valuePerBed)}</Text>
          <Text style={styles.metricLabel}>Value per Bed</Text>
        </View>
        <View style={[styles.metricCard, styles.metricCardLast]}>
          <Text style={[styles.metricValue, { color: colors.amber }]}>{formatCurrency(data.potentialValue)}</Text>
          <Text style={styles.metricLabel}>Potential Value</Text>
        </View>
      </View>

      <View style={styles.valueBreakdownIntro}>
        <Text style={styles.valueBreakdownIntroTitle}>Where Nursing Value Comes From</Text>
        <Text style={styles.valueBreakdownIntroText}>
          <Text style={{ fontWeight: "bold" }}>Labor & Operational</Text> — Direct cost savings you can track in payroll and staffing data. Overtime goes down. Agency utilization drops. Turnover slows. These are measurable month-over-month.
          {"\n\n"}<Text style={{ fontWeight: "bold" }}>Quality & Safety</Text> — Cost avoidance through better outcomes. Fewer HAPIs. Fewer falls. These are real, but the causal link to documentation is indirect—we show them as "potential value" to be intellectually honest.
          {"\n\n"}<Text style={{ fontWeight: "bold" }}>Qualitative</Text> — Benefits that matter (HCAHPS, care coordination) but aren't included in the ROI total. They're part of the full picture, not the financial model.
        </Text>
      </View>

      <View style={styles.valueBreakdown}>
        <View style={styles.valueColumn}>
          <Text style={styles.valueColumnTitle}>Labor Cost Benefits ({formatCurrency(data.laborTotal)})</Text>
          {laborDrivers.map((driver, i) => (
            <View key={driver.id} style={styles.progressContainer}>
              <View style={styles.progressLabel}>
                <Text style={styles.progressName}>{driver.name}</Text>
                <Text style={styles.progressValue}>{formatCurrency(driver.value)}</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min((driver.value / data.laborTotal) * 100, 100)}%`,
                      backgroundColor: colors.green,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
        <View style={[styles.valueColumn, styles.valueColumnLast]}>
          <Text style={[styles.valueColumnTitle, { color: colors.amber }]}>Quality & Safety Benefits ({formatCurrency(data.qualityTotal)})</Text>
          {qualityDrivers.map((driver, i) => (
            <View key={driver.id} style={styles.progressContainer}>
              <View style={styles.progressLabel}>
                <Text style={styles.progressName}>{driver.name}</Text>
                <Text style={[styles.progressValue, { color: colors.amber }]}>{formatCurrency(driver.value)}</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min((driver.value / data.qualityTotal) * 100, 100)}%`,
                      backgroundColor: colors.amber,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
          <Text style={{ fontSize: 7, color: colors.amberDark, fontStyle: "italic", marginTop: 4 }}>
            * Shown as "Potential Value" — indirect causal link
          </Text>
        </View>
      </View>

      <View style={styles.potentialValueNote}>
        <Text style={styles.potentialValueTitle}>About Potential Value</Text>
        <Text style={styles.potentialValueText}>
          Quality & Safety benefits (HAPI Prevention, Falls Prevention) are shown separately because the causal link is indirect. More bedside time → better assessments → fewer adverse events. The mechanism is clear, but attribution is complex. We include these as "potential value" rather than in the main ROI calculation.
        </Text>
      </View>

      <View style={styles.qualitativeSection}>
        <Text style={styles.qualitativeTitle}>Qualitative Benefits (Not Quantified)</Text>
        {qualitativeDrivers.map((driver) => (
          <View key={driver.id} style={styles.qualitativeItem}>
            <Text style={styles.qualitativeBullet}>•</Text>
            <Text style={styles.qualitativeText}>{driver.name}</Text>
          </View>
        ))}
        <Text style={{ fontSize: 7, color: colors.blue, marginTop: 6, fontStyle: "italic" }}>
          These outcomes matter—they're just harder to quantify with confidence. See "The Full Picture" page for details.
        </Text>
      </View>

      <View style={styles.investmentSection}>
        <Text style={styles.investmentTitle}>Your Investment</Text>
        <View style={styles.investmentRow}>
          <View style={styles.investmentCard}>
            <Text style={styles.cardLabel}>Staffed Beds</Text>
            <Text style={styles.cardValue}>{data.staffedBeds}</Text>
          </View>
          <View style={styles.investmentCard}>
            <Text style={styles.cardLabel}>Monthly Cost</Text>
            <Text style={styles.cardValue}>${data.costPerBed}/{data.unitName}</Text>
          </View>
          <View style={styles.investmentCard}>
            <Text style={styles.cardLabel}>Annual Investment</Text>
            <Text style={styles.cardValue}>{formatCurrency(data.investment)}</Text>
          </View>
          <View style={[styles.investmentCard, styles.investmentCardLast]}>
            <Text style={styles.cardLabel}>Net Value Created</Text>
            <Text style={[styles.cardValue, { color: colors.green }]}>{formatCurrency(data.netGain)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated by Abridge</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const DriverPage = ({ driver, data, pageNum, totalPages }: { driver: DriverCalculation; data: NursingPDFData; pageNum: number; totalPages: number }) => {
  const theory = driverTheories[driver.id] || "";
  const implication = driverImplications[driver.id]?.(driver.value, data) || "";
  const steps = getDriverSteps(driver, data);
  const isPotential = driver.isPotentialValue;
  const categoryLabel = driver.category === "labor" ? "Labor Cost Benefit" : "Quality & Safety Benefit";

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src={abridgeLogoPath} style={styles.logo} />
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>{data.careSetting} ROI Assessment</Text>
        </View>
      </View>

      <View style={styles.driverHeader}>
        <Text style={styles.driverCategory}>{categoryLabel}</Text>
        <Text style={styles.driverName}>{driver.name}</Text>
        <Text style={isPotential ? styles.driverValuePotential : styles.driverValue}>
          {formatCurrency(driver.value)} {isPotential ? "(Potential)" : "annually"}
        </Text>
      </View>

      <View style={styles.theoryBox}>
        <Text style={styles.theoryTitle}>Why This Matters</Text>
        <Text style={styles.theoryText}>{theory}</Text>
      </View>

      {isPotential && (
        <View style={styles.potentialCallout}>
          <Text style={styles.potentialCalloutTitle}>Why This Is Potential Value</Text>
          <Text style={styles.potentialCalloutText}>
            This benefit has an indirect causal chain: ambient documentation → less time charting → more time at bedside → better assessments → fewer adverse events. The mechanism is well-supported in literature, but direct attribution is complex. We show this separately from hard ROI so you can evaluate it with appropriate context.
          </Text>
        </View>
      )}

      <View style={styles.calcSection}>
        <Text style={styles.calcTitle}>How We Calculate This</Text>
        {steps.map((step, i) => (
          <View key={i} style={styles.stepBox}>
            <Text style={styles.stepLabel}>{step.label}</Text>
            <Text style={styles.stepQuestion}>{step.question}</Text>
            <View style={styles.stepCalc}>
              {step.inputs.map((input, j) => (
                <View key={j} style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={styles.stepInput}>
                    <Text style={styles.stepInputText}>
                      {input.value}{input.label ? ` ${input.label}` : ""}
                    </Text>
                  </View>
                  {step.operators && step.operators[j] && (
                    <Text style={styles.stepOperator}>{step.operators[j]}</Text>
                  )}
                </View>
              ))}
              <Text style={styles.stepEquals}>=</Text>
              <View style={isPotential ? [styles.stepResult, { backgroundColor: colors.amberLight, borderColor: colors.amber }] : styles.stepResult}>
                <Text style={isPotential ? [styles.stepResultText, { color: colors.amber }] : styles.stepResultText}>{step.result}</Text>
              </View>
            </View>
            {step.note && (
              <Text style={[styles.stepNote, step.noteHighlight ? { color: colors.amberDark, fontWeight: "bold" } : {}]}>
                {step.note}
              </Text>
            )}
          </View>
        ))}
      </View>

      <View style={isPotential ? [styles.finalValueBox, { backgroundColor: colors.amberLight, borderColor: colors.amber }] : styles.finalValueBox}>
        <Text style={[styles.finalValueLabel, isPotential ? { color: colors.amberDark } : {}]}>
          {isPotential ? "Potential Annual Value" : "Annual Value"}
        </Text>
        <Text style={isPotential ? styles.finalValueAmountPotential : styles.finalValueAmount}>
          {formatCurrency(driver.value)}
        </Text>
      </View>

      <View style={isPotential ? [styles.implicationBox, { backgroundColor: colors.amberLight, borderColor: colors.amber }] : styles.implicationBox}>
        <Text style={[styles.implicationTitle, isPotential ? { color: colors.amberDark } : {}]}>What This Means</Text>
        <Text style={[styles.implicationText, isPotential ? { color: colors.amberDark } : {}]}>{implication}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated by Abridge</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const FullPicturePage = ({ data, pageNum, totalPages }: { data: NursingPDFData; pageNum: number; totalPages: number }) => {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src={abridgeLogoPath} style={styles.logo} />
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>{data.careSetting} ROI Assessment</Text>
        </View>
      </View>

      <Text style={styles.pageTitle}>THE FULL PICTURE</Text>
      <Text style={styles.pageSubtitle}>What else gets better—and why we don't put a number on it</Text>

      <View style={styles.narrativeBox}>
        <Text style={styles.narrativeText}>
          Your ROI model captures outcomes we can measure with confidence: overtime, retention, agency spend, and (with caveats) patient safety events. But ambient documentation also improves areas that are harder to quantify—and often matter just as much to your organization.
          {"\n\n"}We're showing these separately because we want to be honest about what we can and can't measure. These benefits are real. They show up in surveys, in audits, in patient feedback, in the daily experience of nurses. But attributing a dollar value would require assumptions we're not comfortable making.
        </Text>
      </View>

      <View style={styles.fullPictureCard}>
        <Text style={styles.fullPictureTitle}>Patient Experience (HCAHPS)</Text>
        <Text style={styles.fullPictureDescription}>
          Patients notice when nurses are fully present versus distracted by documentation. The research is clear: nurse communication scores correlate with bedside presence. When nurses chart at the bedside on a laptop, patients perceive divided attention. When nurses are fully present—making eye contact, listening actively, explaining clearly—scores improve.
          {"\n\n"}Ambient documentation removes the laptop from the interaction. The nurse can focus on the patient. The charting happens automatically.
        </Text>
        <Text style={styles.fullPictureImpact}>Impacts: "Nurse listened carefully" scores, "Nurse explained things" ratings, overall nurse communication domain, VBP reimbursement tied to HCAHPS</Text>
        <Text style={[styles.fullPictureWhyNot, { marginTop: 6 }]}>Why we don't quantify: HCAHPS is influenced by dozens of factors—staffing, acuity, room cleanliness, food quality, pain management. Isolating the documentation effect is nearly impossible.</Text>
      </View>

      <View style={styles.fullPictureCard}>
        <Text style={styles.fullPictureTitle}>Survey & Compliance Readiness</Text>
        <Text style={styles.fullPictureDescription}>
          Complete documentation is your first line of defense in any survey. Joint Commission, CMS, state surveys—they all start with the chart. When documentation is complete, timely, and accurate, surveyors find what they're looking for. When it's not, you get findings, corrective action plans, and follow-up visits.
          {"\n\n"}Real-time documentation means charts are always current. There's no end-of-shift catch-up. No "I'll finish that later." The documentation exists because the conversation happened.
        </Text>
        <Text style={styles.fullPictureImpact}>Impacts: Survey deficiency rates, time spent preparing for surveys, remediation costs after findings, staff anxiety around survey readiness</Text>
        <Text style={[styles.fullPictureWhyNot, { marginTop: 6 }]}>Why we don't quantify: Survey outcomes are binary and infrequent. Attributing a dollar value would require assumptions about deficiency probability that vary too much by organization.</Text>
      </View>

      <View style={styles.fullPictureCard}>
        <Text style={styles.fullPictureTitle}>Care Coordination</Text>
        <Text style={styles.fullPictureDescription}>
          Handoffs are only as good as the documentation behind them. Shift-to-shift handoffs, department-to-department transfers, discharge planning—they all depend on complete, accurate, timely documentation. When documentation lags, information gets lost. When it's real-time, everyone works from the same current picture.
        </Text>
        <Text style={styles.fullPictureImpact}>Impacts: Shift-to-shift handoff quality, interdepartmental communication, miscommunication-related safety events, time spent "hunting" for information</Text>
        <Text style={[styles.fullPictureWhyNot, { marginTop: 6 }]}>Why we don't quantify: Care coordination benefits are diffuse and hard to isolate. Better handoffs lead to fewer errors, faster care, better outcomes—but the causal chain is long and confounded.</Text>
      </View>

      <View style={styles.calloutBox}>
        <Text style={styles.calloutTitle}>Why This Matters</Text>
        <Text style={styles.calloutText}>
          We could have assigned dollar values to these outcomes. Other vendors do. But we'd rather give you a conservative ROI you can defend than an inflated one that falls apart under scrutiny.
        </Text>
        <Text style={[styles.calloutText, { marginTop: 8, fontWeight: "bold" }]}>
          These outcomes are real—they show up in surveys, in patient feedback, in the daily experience of nurses. And they matter to your board, your CNO, and your patients.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated by Abridge</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const JourneyPage = ({ data, pageNum, totalPages }: { data: NursingPDFData; pageNum: number; totalPages: number }) => {
  const journey = data.journey;
  const valueMultiple = journey.pilotValue > 0 ? (journey.fullScaleValue / journey.pilotValue).toFixed(1) : "N/A";
  const paceLabels: Record<string, string> = {
    measured: "36 months",
    steady: "24 months",
    aggressive: "18 months",
  };
  const timeline = paceLabels[journey.scalingPace] || "24 months";

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src={abridgeLogoPath} style={styles.logo} />
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>{data.careSetting} ROI Assessment</Text>
        </View>
      </View>

      <Text style={styles.pageTitle}>YOUR VALUE JOURNEY</Text>
      <Text style={styles.pageSubtitle}>From pilot to full scale</Text>

      <View style={styles.narrativeBox}>
        <Text style={styles.narrativeText}>
          <Text style={styles.narrativeBold}>Implementation follows a proven path.</Text> Starting with a pilot group of {journey.pilotBeds} {data.unitNamePlural.toLowerCase()}, you'll prove value quickly before expanding. This isn't just about adding more units—it's about building compounding returns as adoption increases.
        </Text>
        <Text style={[styles.narrativeText, { marginTop: 8 }]}>
          At full scale with {journey.fullScaleBeds} {data.unitNamePlural.toLowerCase()} and {journey.fullScaleUtilization}% utilization, annual value reaches {formatCurrency(journey.fullScaleValue)}—a {valueMultiple}x increase from pilot. The journey matters as much as the destination.
        </Text>
      </View>

      <View style={styles.journeyChart}>
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          <View style={{ width: 55, justifyContent: "space-between", paddingVertical: 4, height: 100 }}>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textAlign: "right" }}>{formatCurrency(journey.fullScaleValue)}</Text>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textAlign: "right" }}>{formatCurrency(Math.round((journey.fullScaleValue + journey.pilotValue) / 2))}</Text>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textAlign: "right" }}>{formatCurrency(journey.pilotValue)}</Text>
            <Text style={{ fontSize: 7, color: colors.mediumGray, textAlign: "right" }}>$0</Text>
          </View>
          
          <View style={{ flex: 1, marginLeft: 8, height: 100, position: "relative" }}>
            <Svg width={400} height={100} viewBox="0 0 400 100">
              <Line x1="0" y1="25" x2="400" y2="25" stroke={colors.borderGray} strokeWidth="0.5" />
              <Line x1="0" y1="50" x2="400" y2="50" stroke={colors.borderGray} strokeWidth="0.5" />
              <Line x1="0" y1="75" x2="400" y2="75" stroke={colors.borderGray} strokeWidth="0.5" />
              <Line x1="0" y1="100" x2="400" y2="100" stroke={colors.borderGray} strokeWidth="1" />
              <Line x1="0" y1="0" x2="0" y2="100" stroke={colors.borderGray} strokeWidth="1" />
              
              <Line 
                x1="20" 
                y1="85" 
                x2="380" 
                y2="15" 
                stroke={colors.lightGray} 
                strokeWidth="2" 
                strokeDasharray="6,4" 
              />
              
              <Path 
                d="M 20 85 Q 120 55, 200 40 Q 300 20, 380 15" 
                stroke={colors.green} 
                strokeWidth="2.5" 
                fill="none" 
              />
              
              <Path 
                d="M 20 85 Q 120 55, 200 40 Q 300 20, 380 15 L 380 15 L 20 85 Z" 
                fill={colors.greenLight} 
                opacity="0.5" 
              />
              
              <Circle cx="20" cy="85" r="6" fill={colors.primary} stroke={colors.white} strokeWidth="2" />
              <Circle cx="380" cy="10" r="6" fill={colors.green} stroke={colors.white} strokeWidth="2" />
            </Svg>
            
            <Text style={{ position: "absolute", bottom: 2, left: 4, fontSize: 7, color: colors.primary, fontWeight: "bold" }}>Today</Text>
            <Text style={{ position: "absolute", top: -2, right: 4, fontSize: 7, color: colors.green, fontWeight: "bold" }}>Full Scale</Text>
            
            <View style={{ position: "absolute", top: 35, left: 160, backgroundColor: colors.greenLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: colors.green }}>
              <Text style={{ fontSize: 8, color: colors.green, fontWeight: "bold", textAlign: "center" }}>+{formatCurrency(journey.networkEffect)}</Text>
              <Text style={{ fontSize: 6, color: colors.greenDark, textAlign: "center" }}>compounding bonus</Text>
            </View>
          </View>
        </View>
        
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingLeft: 63, paddingRight: 10, marginBottom: 4 }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 7, color: colors.primary, fontWeight: "bold" }}>Today</Text>
            <Text style={{ fontSize: 6, color: colors.mediumGray }}>{journey.pilotBeds} {data.unitNamePlural}</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 6, color: colors.mediumGray }}>6 mo</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 6, color: colors.mediumGray }}>12 mo</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 6, color: colors.mediumGray }}>18 mo</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 7, color: colors.green, fontWeight: "bold" }}>Full Scale</Text>
            <Text style={{ fontSize: 6, color: colors.mediumGray }}>{journey.fullScaleBeds} {data.unitNamePlural}</Text>
          </View>
        </View>
      </View>

      <View style={styles.journeyScenario}>
        <View style={styles.journeyScenarioCard}>
          <Text style={styles.journeyScenarioTitle}>Pilot Phase</Text>
          <View style={styles.journeyScenarioRow}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}><Text style={styles.journeyScenarioValue}>{journey.pilotBeds}</Text> {data.unitNamePlural.toLowerCase()}</Text>
          </View>
          <View style={styles.journeyScenarioRow}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}><Text style={styles.journeyScenarioValue}>{formatNumber(journey.pilotEvents)}</Text> documentation events</Text>
          </View>
          <View style={styles.journeyScenarioRow}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}><Text style={styles.journeyScenarioValue}>{journey.pilotUtilization}%</Text> utilization target</Text>
          </View>
          <View style={[styles.journeyScenarioRow, { marginTop: 6 }]}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}>Annual value: <Text style={styles.journeyScenarioValue}>{formatCurrency(journey.pilotValue)}</Text></Text>
          </View>
        </View>

        <View style={styles.journeyScenarioCardHighlight}>
          <Text style={styles.journeyScenarioTitleHighlight}>Full Scale</Text>
          <View style={styles.journeyScenarioRow}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}><Text style={styles.journeyScenarioValueGreen}>{journey.fullScaleBeds}</Text> {data.unitNamePlural.toLowerCase()}</Text>
          </View>
          <View style={styles.journeyScenarioRow}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}><Text style={styles.journeyScenarioValueGreen}>{journey.fullScaleUtilization}%</Text> utilization target</Text>
          </View>
          <View style={styles.journeyScenarioRow}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}>{timeline} timeline</Text>
          </View>
          <View style={[styles.journeyScenarioRow, { marginTop: 6 }]}>
            <Text style={styles.journeyScenarioCheck}>-</Text>
            <Text style={styles.journeyScenarioText}>Annual value: <Text style={styles.journeyScenarioValueGreen}>{formatCurrency(journey.fullScaleValue)}</Text></Text>
          </View>
        </View>
      </View>

      <View style={styles.compoundingBox}>
        <Text style={styles.compoundingTitle}>The Compounding Effect</Text>
        <Text style={styles.compoundingValue}>+{formatCurrency(journey.networkEffect)}</Text>
        <Text style={styles.compoundingSubtext}>Additional annual value from network effects at full scale</Text>
      </View>

      <View style={styles.narrativeBox}>
        <Text style={styles.narrativeText}>
          <Text style={styles.narrativeBold}>Value doesn't grow linearly—it compounds.</Text> As more units adopt Abridge, documentation quality improves floor by floor. Overtime patterns shift. Agency reliance drops. The value per bed increases even as you add beds.
        </Text>
        <Text style={[styles.narrativeText, { marginTop: 8 }]}>
          This is why pilot success often understates full-scale potential. At {journey.fullScaleUtilization}% utilization with {journey.fullScaleBeds} {data.unitNamePlural.toLowerCase()}, network effects add {formatCurrency(journey.networkEffect)} to your annual value—bringing total potential to {formatCurrency(journey.fullScaleValue + journey.networkEffect)}.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated by Abridge</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const MethodologyPage = ({ data, pageNum, totalPages }: { data: NursingPDFData; pageNum: number; totalPages: number }) => {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src={abridgeLogoPath} style={styles.logo} />
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>{data.careSetting} ROI Assessment</Text>
        </View>
      </View>

      <View style={styles.connectedSection}>
        <Text style={styles.connectedTitle}>CONNECTED VALUE</Text>
        <Text style={styles.connectedSubtitle}>Nursing + Inpatient compounds your results</Text>
        <Text style={styles.connectedText}>
          This assessment models nursing-specific value. Organizations implementing Abridge across nursing and inpatient settings see compounding benefits: nurses charting faster means hospitalists get better context, CDI has cleaner records to work with, and the entire documentation ecosystem improves.
        </Text>
      </View>

      <Text style={styles.pageTitle}>METHODOLOGY & ASSUMPTIONS</Text>
      <Text style={styles.pageSubtitle}>How we built your model</Text>

      <View style={styles.methodologySection}>
        <View style={styles.methodologyBox}>
          <Text style={styles.methodologyTitle}>Your Inputs</Text>
          <Text style={styles.methodologyItem}>{data.staffedBeds} {data.unitNamePlural}</Text>
          <Text style={styles.methodologyItem}>{formatNumber(data.nurseFTEs)} nurse FTEs</Text>
          <Text style={styles.methodologyItem}>{data.utilization}% expected utilization</Text>
          <Text style={styles.methodologyItem}>{data.timeSavedPerEvent} min saved per documentation event</Text>
          <Text style={styles.methodologyItem}>${data.costPerBed}/{data.unitName}/month</Text>
        </View>

        <View style={styles.methodologyBox}>
          <Text style={styles.methodologyTitle}>Labor Cost Benchmarks</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>Metric</Text>
            <Text style={styles.tableHeaderCell}>Range</Text>
            <Text style={styles.tableHeaderCell}>Default</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>RN Base Hourly Rate</Text>
            <Text style={styles.tableCell}>$40-$50</Text>
            <Text style={styles.tableCellBold}>$45</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>OT Rate (1.5×)</Text>
            <Text style={styles.tableCell}>$60-$75</Text>
            <Text style={styles.tableCellBold}>$60</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Agency Premium</Text>
            <Text style={styles.tableCell}>$65K-$85K/FTE</Text>
            <Text style={styles.tableCellBold}>$75K/FTE</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Replacement Cost</Text>
            <Text style={styles.tableCell}>$40K-$60K</Text>
            <Text style={styles.tableCellBold}>$50K</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Turnover Rate</Text>
            <Text style={styles.tableCell}>18-25%</Text>
            <Text style={styles.tableCellBold}>20%</Text>
          </View>
        </View>

        <View style={styles.methodologyBox}>
          <Text style={styles.methodologyTitle}>Quality & Safety Benchmarks</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>Metric</Text>
            <Text style={styles.tableHeaderCell}>Range</Text>
            <Text style={styles.tableHeaderCell}>Default</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>HAPI Cost</Text>
            <Text style={styles.tableCell}>$10K-$50K</Text>
            <Text style={styles.tableCellBold}>$20K</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Fall Cost</Text>
            <Text style={styles.tableCell}>$3K-$30K</Text>
            <Text style={styles.tableCellBold}>$6,500</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>HAPI Rate</Text>
            <Text style={styles.tableCell}>2-3%</Text>
            <Text style={styles.tableCellBold}>2%</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Fall Rate</Text>
            <Text style={styles.tableCell}>3-5%</Text>
            <Text style={styles.tableCellBold}>3%</Text>
          </View>
        </View>
      </View>

      <View style={styles.calloutBox}>
        <Text style={styles.calloutTitle}>Conservative by Design</Text>
        <Text style={styles.calloutText}>
          Every assumption here can be adjusted. We start conservative because credibility matters more than inflated projections. Your actual results may differ—often in positive ways we didn't model.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated by Abridge</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const ClosingPage = ({ data, pageNum, totalPages }: { data: NursingPDFData; pageNum: number; totalPages: number }) => {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Image src={abridgeLogoPath} style={styles.logo} />
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>{data.careSetting} ROI Assessment</Text>
        </View>
      </View>

      <View style={styles.closingSection}>
        <View style={styles.closingQuote}>
          <Text style={styles.closingQuoteText}>
            "Nursing documentation carries a different kind of weight—it's not just about coding or billing. It's about <Text style={styles.closingHighlight}>patient safety</Text>, <Text style={styles.closingHighlight}>regulatory compliance</Text>, and the daily experience of nurses who spend 25-35% of their shift charting instead of caring. The ROI is measurable. The impact on culture is harder to quantify—but often matters more."
          </Text>
        </View>

        <View style={styles.narrativeBox}>
          <Text style={styles.narrativeText}>
            <Text style={styles.narrativeBold}>This assessment represents a starting point.</Text> The calculations here are based on industry benchmarks and conservative assumptions. Your organization's actual experience will depend on current documentation workflows, nurse engagement, and implementation approach.
          </Text>
          <Text style={[styles.narrativeText, { marginTop: 8 }]}>
            What this model doesn't capture: the relief on nurses' faces when they realize they can go home on time. The quality of patient interactions when nurses aren't typing. The cultural shift when documentation stops being a burden.
          </Text>
          <Text style={[styles.narrativeText, { marginTop: 8 }]}>
            Those outcomes matter. They're just harder to put in a spreadsheet.
          </Text>
        </View>

        <View style={styles.benchmarkBox}>
          <Text style={styles.benchmarkTitle}>Your Summary</Text>
          <View style={styles.benchmarkRow}>
            <Text style={styles.benchmarkLabel}>Total Annual Value (Labor)</Text>
            <Text style={[styles.benchmarkValue, { color: colors.green }]}>{formatCurrency(data.laborTotal)}</Text>
          </View>
          <View style={styles.benchmarkRow}>
            <Text style={styles.benchmarkLabel}>Potential Value (Quality)</Text>
            <Text style={[styles.benchmarkValue, { color: colors.amber }]}>{formatCurrency(data.qualityTotal)}</Text>
          </View>
          <View style={styles.benchmarkRow}>
            <Text style={styles.benchmarkLabel}>Annual Investment</Text>
            <Text style={styles.benchmarkValue}>{formatCurrency(data.investment)}</Text>
          </View>
          <View style={[styles.benchmarkRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.benchmarkLabel, { fontWeight: "bold" }]}>Net Value Created</Text>
            <Text style={[styles.benchmarkValue, { color: colors.green, fontSize: 10 }]}>{formatCurrency(data.netGain)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Generated by Abridge</Text>
        <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
      </View>
    </Page>
  );
};

const NursingROIDocument = ({ data }: { data: NursingPDFData }) => {
  const quantifiedDrivers = data.drivers.filter(d => d.category === "labor" || d.category === "quality");
  const totalPages = 2 + quantifiedDrivers.length + 3; // Executive + drivers + FullPicture + Journey + Methodology + Closing

  let currentPage = 1;

  return (
    <Document>
      <ExecutiveSummary data={data} pageNum={currentPage++} totalPages={totalPages} />
      {quantifiedDrivers.map((driver) => (
        <DriverPage key={driver.id} driver={driver} data={data} pageNum={currentPage++} totalPages={totalPages} />
      ))}
      <FullPicturePage data={data} pageNum={currentPage++} totalPages={totalPages} />
      <JourneyPage data={data} pageNum={currentPage++} totalPages={totalPages} />
      <MethodologyPage data={data} pageNum={currentPage++} totalPages={totalPages} />
      <ClosingPage data={data} pageNum={currentPage++} totalPages={totalPages} />
    </Document>
  );
};

export async function generateNursingROIPDF(data: NursingPDFData): Promise<void> {
  const blob = await pdf(<NursingROIDocument data={data} />).toBlob();
  const filename = `Abridge_Nursing_ROI_${data.organizationName?.replace(/\s+/g, "_") || "Assessment"}_${new Date().toISOString().split("T")[0]}.pdf`;
  saveAs(blob, filename);
}
