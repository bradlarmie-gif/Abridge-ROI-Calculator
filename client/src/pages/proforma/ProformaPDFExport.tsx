import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
  Svg,
  Rect,
  Line as SvgLine,
  G,
  Circle,
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
  groupByQuarter,
  calculateProformaSummary,
  getYearlySummary,
  buildAnnualIRRCashFlows,
  calculateAnnualIRR,
  getContractStartDate,
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

function fmtPct(n: number, cap = 200) {
  const val = Math.round(n * 100);
  if (val > cap) return `${cap}%+`;
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

interface EnrichedDriver {
  id: string;
  name: string;
  value: number;
  category: "time" | "documentation";
  onset: string;
  calcSteps: string[];
  calibrationNote?: string;
}

const wrvuScenarios: Record<string, number> = { conservative: 2, typical: 5, aggressive: 7 };
const denialsScenarios: Record<string, number> = { conservative: 25, typical: 50, aggressive: 75 };
const retentionScenarios: Record<string, number> = { conservative: 20, typical: 30, optimistic: 40 };
const nursingRetentionImpactRates: Record<string, number> = { conservative: 10, typical: 15, optimistic: 25 };

function buildDriverCalcSteps(snapshot: ProformaSettingSnapshot): EnrichedDriver[] {
  const s = snapshot.fullExploreState;
  const t = s.timeDriverInputs;
  const d = s.docQualityInputs;
  const cs = snapshot.careSetting;
  const fmtK = (n: number) => Math.abs(n) >= 1000 ? `$${Math.round(n / 1000)}K` : `$${Math.round(n)}`;
  const eligibleEncounters = s.annualEncounters * (s.utilizationPercent / 100);
  const totalHoursSaved = snapshot.totalHoursSaved;
  const result: EnrichedDriver[] = [];

  if (cs === "outpatient") {
    const paDriver = snapshot.drivers.find(dd => dd.id === "patientAccess");
    if (paDriver && paDriver.value > 0) {
      const hoursTowardCapacity = totalHoursSaved * (t.capacityPercent / 100);
      const potentialVisits = hoursTowardCapacity * (60 / t.visitDuration);
      result.push({
        ...paDriver, calcSteps: [
          `${totalHoursSaved.toLocaleString()} hrs \u00D7 ${t.capacityPercent}% toward capacity = ${Math.round(hoursTowardCapacity).toLocaleString()} hrs`,
          `${Math.round(hoursTowardCapacity).toLocaleString()} hrs \u00D7 (60/${t.visitDuration} min) = ${Math.round(potentialVisits).toLocaleString()} visits`,
          `${Math.round(potentialVisits).toLocaleString()} \u00D7 $${t.revenuePerVisit}/visit = ${fmtK(paDriver.value)}/year`,
        ],
      });
    }
    const crDriver = snapshot.drivers.find(dd => dd.id === "costReduction");
    if (crDriver && crDriver.value > 0) {
      result.push({ ...crDriver, calcSteps: [`Estimated annual cost reduction: ${fmtK(crDriver.value)}/year`] });
    }
    const wrvuDriver = snapshot.drivers.find(dd => dd.id === "wrvu");
    if (wrvuDriver && wrvuDriver.value > 0) {
      const wrvuLiftPct = wrvuScenarios[d.wrvuScenario] || 5;
      result.push({
        ...wrvuDriver, calcSteps: [
          `${d.currentWrvu} wRVU/enc \u00D7 ${wrvuLiftPct}% lift \u00D7 ${eligibleEncounters.toLocaleString()} encounters`,
          `\u00D7 $${d.conversionFactor}/wRVU \u00D7 ${d.wrvuRealization}% realization`,
          `= ${fmtK(wrvuDriver.value)}/year`,
        ],
      });
    }
    const hccDriver = snapshot.drivers.find(dd => dd.id === "hcc");
    if (hccDriver && hccDriver.value > 0) {
      const hccScenarios: Record<string, number> = { conservative: 6, typical: 10, aggressive: 15 };
      const recapturePct = hccScenarios[d.hccScenario] || 10;
      const maPatients = s.numberOfProviders * d.panelSize * (d.maPercent / 100);
      const gapPatients = maPatients * (d.gapRate / 100);
      result.push({
        ...hccDriver, calcSteps: [
          `${s.numberOfProviders} providers \u00D7 ${d.panelSize} panel \u00D7 ${d.maPercent}% MA = ${Math.round(maPatients).toLocaleString()} MA patients`,
          `${Math.round(maPatients).toLocaleString()} \u00D7 ${d.gapRate}% gap \u00D7 ${recapturePct}% recaptured \u00D7 ${d.avgHccs} avg HCCs`,
          `\u00D7 ${d.rafImpact} RAF \u00D7 $${d.annualPayment.toLocaleString()} \u00D7 ${d.hccRealization}% realization = ${fmtK(hccDriver.value)}/year`,
        ],
      });
    }
    const denDriver = snapshot.drivers.find(dd => dd.id === "denials");
    if (denDriver && denDriver.value > 0) {
      result.push({
        ...denDriver, calcSteps: [
          `${eligibleEncounters.toLocaleString()} enc \u00D7 ${d.denialRate}% denial rate`,
          `\u00D7 ${d.unappealableRate}% doc-related \u00D7 ${denialsScenarios[d.denialsScenario] || 50}% prevented`,
          `\u00D7 $${d.avgClaimValue.toLocaleString()}/claim \u00D7 ${d.denialsRealization}% realization = ${fmtK(denDriver.value)}/year`,
        ],
      });
    }
    const retDriver = snapshot.drivers.find(dd => dd.id === "retention");
    if (retDriver && retDriver.value > 0) {
      const impactPct = retentionScenarios[t.retentionImpactScenario] || 30;
      result.push({
        ...retDriver, calcSteps: [
          `${s.numberOfProviders} providers \u00D7 ${t.annualTurnoverRate}% turnover \u00D7 ${t.burnoutRelatedTurnover}% burnout-related`,
          `\u00D7 ${impactPct}% Abridge impact \u00D7 $${t.replacementCost.toLocaleString()} replacement cost`,
          `= ${fmtK(retDriver.value)}/year`,
        ],
      });
    }
  } else if (cs === "ed") {
    const lwbsDriver = snapshot.drivers.find(dd => dd.id === "edLwbs");
    const admDriver = snapshot.drivers.find(dd => dd.id === "edAdmission");
    const edRecoveredPatients = s.annualEncounters * (t.edLwbsRate / 100) * (t.edLwbsReduction / 100);
    if (lwbsDriver && lwbsDriver.value > 0) {
      result.push({
        ...lwbsDriver, calcSteps: [
          `${s.annualEncounters.toLocaleString()} enc \u00D7 ${t.edLwbsRate}% LWBS \u00D7 ${t.edLwbsReduction}% reduction = ${Math.round(edRecoveredPatients).toLocaleString()} recovered`,
          `${Math.round(edRecoveredPatients).toLocaleString()} \u00D7 $${t.edRevenuePerVisit}/visit \u00D7 ${t.edLwbsRealization}% realization`,
          `= ${fmtK(lwbsDriver.value)}/year`,
        ],
      });
    }
    if (admDriver && admDriver.value > 0) {
      const admittedPatients = Math.round(edRecoveredPatients * (t.edAdmissionRate / 100));
      result.push({
        ...admDriver, calcSteps: [
          `${Math.round(edRecoveredPatients).toLocaleString()} recovered \u00D7 ${t.edAdmissionRate}% admission rate = ${admittedPatients.toLocaleString()} admitted`,
          `${admittedPatients.toLocaleString()} \u00D7 $${t.edAdmissionRevenue.toLocaleString()} \u00D7 ${t.edAdmissionRealization}% realization`,
          `= ${fmtK(admDriver.value)}/year`,
        ],
      });
    }
    const crDriver = snapshot.drivers.find(dd => dd.id === "costReduction");
    if (crDriver && crDriver.value > 0) {
      result.push({ ...crDriver, calcSteps: [`Estimated annual cost reduction: ${fmtK(crDriver.value)}/year`] });
    }
    const wrvuDriver = snapshot.drivers.find(dd => dd.id === "wrvu");
    if (wrvuDriver && wrvuDriver.value > 0) {
      const wrvuLiftPct = wrvuScenarios[d.wrvuScenario] || 5;
      result.push({
        ...wrvuDriver, calcSteps: [
          `${d.currentWrvu} wRVU/enc \u00D7 ${wrvuLiftPct}% lift \u00D7 ${eligibleEncounters.toLocaleString()} encounters`,
          `\u00D7 $${d.conversionFactor}/wRVU \u00D7 ${d.wrvuRealization}% realization`,
          `= ${fmtK(wrvuDriver.value)}/year`,
        ],
      });
    }
    const denDriver = snapshot.drivers.find(dd => dd.id === "denials");
    if (denDriver && denDriver.value > 0) {
      result.push({
        ...denDriver, calcSteps: [
          `${eligibleEncounters.toLocaleString()} enc \u00D7 ${d.denialRate}% denial rate`,
          `\u00D7 ${d.unappealableRate}% doc-related \u00D7 ${denialsScenarios[d.denialsScenario] || 50}% prevented`,
          `\u00D7 $${d.avgClaimValue.toLocaleString()}/claim \u00D7 ${d.denialsRealization}% realization = ${fmtK(denDriver.value)}/year`,
        ],
      });
    }
    const retDriver = snapshot.drivers.find(dd => dd.id === "retention");
    if (retDriver && retDriver.value > 0) {
      const impactPct = retentionScenarios[t.retentionImpactScenario] || 30;
      result.push({
        ...retDriver, calcSteps: [
          `${s.numberOfProviders} physicians \u00D7 ${t.annualTurnoverRate}% turnover \u00D7 ${t.burnoutRelatedTurnover}% burnout-related`,
          `\u00D7 ${impactPct}% Abridge impact \u00D7 $${t.replacementCost.toLocaleString()} replacement cost`,
          `= ${fmtK(retDriver.value)}/year`,
        ],
      });
    }
  } else if (cs === "inpatient") {
    const crDriver = snapshot.drivers.find(dd => dd.id === "costReduction");
    if (crDriver && crDriver.value > 0) {
      result.push({ ...crDriver, calcSteps: [`Estimated annual cost reduction: ${fmtK(crDriver.value)}/year`] });
    }
    const retDriver = snapshot.drivers.find(dd => dd.id === "retention");
    if (retDriver && retDriver.value > 0) {
      const impactPct = retentionScenarios[t.retentionImpactScenario] || 30;
      result.push({
        ...retDriver, calcSteps: [
          `${s.numberOfProviders} hospitalists \u00D7 ${t.annualTurnoverRate}% turnover \u00D7 ${t.burnoutRelatedTurnover}% burnout-related`,
          `\u00D7 ${impactPct}% Abridge impact \u00D7 $${t.replacementCost.toLocaleString()} replacement cost`,
          `= ${fmtK(retDriver.value)}/year`,
        ],
      });
    }
    const drgDriver = snapshot.drivers.find(dd => dd.id === "ipDrg");
    if (drgDriver && drgDriver.value > 0) {
      const captureRate = d.ipDrgScenario === "conservative" ? 15 : d.ipDrgScenario === "typical" ? 20 : 25;
      result.push({
        ...drgDriver, calcSteps: [
          `${eligibleEncounters.toLocaleString()} enc \u00D7 ${d.ipDrgAtRiskRate}% at-risk \u00D7 ${captureRate}% captured`,
          `\u00D7 ${d.ipDrgWeightIncrease} wt increase \u00D7 $${d.ipDrgBasePayment.toLocaleString()} base`,
          `\u00D7 ${d.ipDrgRealization}% realization = ${fmtK(drgDriver.value)}/year`,
        ],
      });
    }
    const cdiDriver = snapshot.drivers.find(dd => dd.id === "ipCdi");
    if (cdiDriver && cdiDriver.value > 0) {
      const reductionRate = d.ipCdiScenario === "conservative" ? 15 : d.ipCdiScenario === "typical" ? 25 : 35;
      result.push({
        ...cdiDriver, calcSteps: [
          `${eligibleEncounters.toLocaleString()} enc \u00D7 ${d.ipCdiQueryRate}% query rate \u00D7 ${reductionRate}% reduced`,
          `\u00D7 $${d.ipCdiCostPerQuery}/query = ${fmtK(cdiDriver.value)}/year`,
        ],
      });
    }
  } else if (cs === "nursing") {
    const otDriver = snapshot.drivers.find(dd => dd.id === "nursingOt");
    if (otDriver && otDriver.value > 0) {
      const otHours = Math.round(totalHoursSaved * (t.nursingOtReductionPercent / 100));
      result.push({
        ...otDriver, calcSteps: [
          `${totalHoursSaved.toLocaleString()} hrs saved \u00D7 ${t.nursingOtReductionPercent}% OT conversion = ${otHours.toLocaleString()} OT hrs`,
          `${otHours.toLocaleString()} \u00D7 $${t.nursingOtHourlyRate}/hr = ${fmtK(otDriver.value)}/year`,
        ],
      });
    }
    const retDriver = snapshot.drivers.find(dd => dd.id === "retention");
    if (retDriver && retDriver.value > 0) {
      const impactRate = nursingRetentionImpactRates[t.retentionImpactScenario] || 15;
      result.push({
        ...retDriver, calcSteps: [
          `${s.numberOfProviders} FTEs \u00D7 ${t.nursingTurnoverRate}% turnover \u00D7 40% burnout-related`,
          `\u00D7 ${impactRate}% impact \u00D7 $${t.nursingReplacementCost.toLocaleString()} replacement`,
          `= ${fmtK(retDriver.value)}/year`,
        ],
      });
    }
    const hapiDriver = snapshot.drivers.find(dd => dd.id === "nursingHapi");
    if (hapiDriver && hapiDriver.value > 0) {
      result.push({
        ...hapiDriver, calcSteps: [
          `Patient days \u00D7 HAPI rate \u00D7 ${d.nursingHapiPreventionRate}% prevention \u00D7 $${d.nursingHapiCost.toLocaleString()}/event`,
          `= ${fmtK(hapiDriver.value)}/year`,
        ],
        calibrationNote: "Potential value based on adverse event prevention rates.",
      });
    }
    const fallsDriver = snapshot.drivers.find(dd => dd.id === "nursingFalls");
    if (fallsDriver && fallsDriver.value > 0) {
      result.push({
        ...fallsDriver, calcSteps: [
          `Patient days \u00D7 falls rate \u00D7 ${d.nursingFallsPreventionRate}% prevention \u00D7 $${d.nursingFallsCost.toLocaleString()}/event`,
          `= ${fmtK(fallsDriver.value)}/year`,
        ],
        calibrationNote: "Potential value based on adverse event prevention rates.",
      });
    }
  }

  for (const driver of snapshot.drivers) {
    if (!result.find(r => r.id === driver.id)) {
      result.push({ ...driver, calcSteps: [`Annual value: ${fmtK(driver.value)}/year`] });
    }
  }

  return result;
}

function getSettingInputSummary(snapshot: ProformaSettingSnapshot): string[] {
  const s = snapshot.fullExploreState;
  const t = s.timeDriverInputs;
  const d = s.docQualityInputs;
  const cs = snapshot.careSetting;
  const lines: string[] = [];

  if (cs === "nursing") {
    lines.push(`${s.nursingStaffedBeds} staffed beds \u00B7 ${s.numberOfProviders} nurse FTEs`);
  } else {
    lines.push(`${s.numberOfProviders} ${unitLabel(cs)} \u00B7 ${s.annualEncounters.toLocaleString()} encounters/yr`);
  }
  lines.push(`${s.utilizationPercent}% utilization \u00B7 ${s.minutesSavedPerEncounter} min saved/encounter`);

  if (cs === "outpatient") {
    if (t.patientAccessEnabled) lines.push(`Capacity: ${t.capacityPercent}% \u00B7 ${t.visitDuration}min visits \u00B7 $${t.revenuePerVisit}/visit`);
    if (d.wrvuEnabled) lines.push(`wRVU: ${d.wrvuScenario} scenario \u00B7 ${d.wrvuRealization}% realization`);
    if (d.hccEnabled) lines.push(`HCC: ${d.hccRealization}% realization`);
    if (d.denialsEnabled) lines.push(`Denials: ${d.denialRate}% rate \u00B7 ${d.denialsScenario} scenario \u00B7 ${d.denialsRealization}% realization`);
  } else if (cs === "ed") {
    if (t.edLwbsEnabled) lines.push(`LWBS: ${t.edLwbsRate}% rate \u00B7 ${t.edLwbsReduction}% reduction \u00B7 $${t.edRevenuePerVisit}/visit`);
    if (d.wrvuEnabled) lines.push(`Level-of-Service: ${d.wrvuScenario} scenario \u00B7 ${d.wrvuRealization}% realization`);
    if (d.denialsEnabled) lines.push(`Denials: ${d.denialRate}% rate \u00B7 ${d.denialsScenario} scenario`);
  } else if (cs === "inpatient") {
    if (d.ipDrgEnabled) lines.push(`DRG: ${d.ipDrgScenario} scenario \u00B7 ${d.ipDrgRealization}% realization`);
    if (d.ipCdiEnabled) lines.push(`CDI: ${d.ipCdiScenario} scenario \u00B7 ${d.ipCdiQueryRate}% query rate`);
  } else if (cs === "nursing") {
    if (t.nursingOtEnabled) lines.push(`OT: ${t.nursingOtReductionPercent}% reduction \u00B7 $${t.nursingOtHourlyRate}/hr`);
    if (t.nursingRetentionEnabled) lines.push(`Retention: ${t.nursingTurnoverRate}% turnover \u00B7 $${t.nursingReplacementCost.toLocaleString()} replacement`);
  }

  if (t.wellbeingEnabled && t.calculateRetentionValue && cs !== "nursing") {
    lines.push(`Retention: ${t.annualTurnoverRate}% turnover \u00B7 ${t.retentionImpactScenario} impact`);
  }
  if (t.costReductionEnabled && t.estimatedCostReduction > 0) {
    lines.push(`Cost reduction: $${t.estimatedCostReduction.toLocaleString()}/yr`);
  }

  return lines;
}

function getMathPageCount(settings: ProformaSettingSnapshot[]): number {
  const totalDrivers = settings.reduce((sum, s) => sum + s.drivers.length, 0);
  if (totalDrivers > 10 || settings.length > 3) return 2;
  return 1;
}

function fmtAxis(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

interface ChartBar {
  label: string;
  docValue: number;
  timeValue: number;
  retentionValue: number;
  investment: number;
  total: number;
}

function PDFValueChart({ data, paybackQuarter }: { data: ChartBar[]; paybackQuarter: string | null }) {
  const svgW = 416;
  const svgH = 180;
  const barCount = data.length || 1;
  const groupW = svgW / barCount;
  const barW = Math.min(groupW * 0.6, 26);
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
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: 48, justifyContent: "space-between", paddingRight: 4, height: svgH }}>
          {[...ticks].reverse().map((tick, i) => (
            <Text key={`yt-${i}`} style={{ fontSize: 6.5, color: "#999999", textAlign: "right" }}>{fmtAxis(tick)}</Text>
          ))}
        </View>

        <View style={{ flex: 1 }}>
          <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
            {ticks.map((tick, i) => (
              <SvgLine key={`gl-${i}`} x1={0} y1={scaleY(tick)} x2={svgW} y2={scaleY(tick)} stroke="#E5E0DB" strokeWidth={0.5} strokeDasharray={i === 0 ? undefined : "3 2"} />
            ))}

            {data.map((bar, i) => {
              const x = i * groupW + barGap;
              const docH = (bar.docValue / niceMax) * svgH;
              const timeH = (bar.timeValue / niceMax) * svgH;
              const retH = (bar.retentionValue / niceMax) * svgH;
              const docY = scaleY(bar.docValue);
              const timeY = scaleY(bar.docValue + bar.timeValue);
              const retY = scaleY(bar.docValue + bar.timeValue + bar.retentionValue);
              const invH = (bar.investment / niceMax) * svgH;
              const invY = scaleY(bar.investment);
              const invBarW = Math.max(barW * 0.18, 3);

              return (
                <G key={`bar-${i}`}>
                  {docH > 0.5 && <Rect x={x} y={docY} width={barW} height={docH} fill="#2563EB" fillOpacity={0.8} rx={1} />}
                  {timeH > 0.5 && <Rect x={x} y={timeY} width={barW} height={timeH} fill="#EA2C00" fillOpacity={0.75} />}
                  {retH > 0.5 && <Rect x={x} y={retY} width={barW} height={retH} fill="#059669" fillOpacity={0.75} rx={1} />}
                  {invH > 0.5 && <Rect x={x + barW + 2} y={invY} width={invBarW} height={invH} fill="#1A1A1A" fillOpacity={0.12} rx={1} />}
                  {invH > 0.5 && <SvgLine x1={x + barW + 2} y1={invY} x2={x + barW + 2 + invBarW} y2={invY} stroke="#1A1A1A" strokeWidth={0.8} strokeDasharray="2 1" />}
                </G>
              );
            })}

            {paybackQuarter && (() => {
              const idx = data.findIndex(d => d.label === paybackQuarter);
              if (idx < 0) return null;
              const x = idx * groupW + barGap + barW / 2;
              return <SvgLine x1={x} y1={0} x2={x} y2={svgH} stroke="#059669" strokeWidth={0.8} strokeDasharray="4 2" />;
            })()}

            <SvgLine x1={0} y1={svgH} x2={svgW} y2={svgH} stroke="#D5D0CB" strokeWidth={1} />
          </Svg>
        </View>
      </View>

      <View style={{ flexDirection: "row", paddingLeft: 48 }}>
        {data.map((bar, i) => (
          <View key={`xl-${i}`} style={{ width: svgW / barCount, alignItems: "center", paddingTop: 3 }}>
            <Text style={{ fontSize: 6, color: "#666666" }}>{bar.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 16, marginTop: 10, paddingLeft: 48 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 10, height: 6, backgroundColor: "#2563EB", borderRadius: 1, opacity: 0.8 }} />
          <Text style={{ fontSize: 7, color: "#666666" }}>Doc Quality</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 10, height: 6, backgroundColor: "#EA2C00", borderRadius: 1, opacity: 0.75 }} />
          <Text style={{ fontSize: 7, color: "#666666" }}>Time Savings</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 10, height: 6, backgroundColor: "#059669", borderRadius: 1, opacity: 0.75 }} />
          <Text style={{ fontSize: 7, color: "#666666" }}>Retention</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 10, height: 6, backgroundColor: "#1A1A1A", borderRadius: 1, opacity: 0.15 }} />
          <Text style={{ fontSize: 7, color: "#666666" }}>Investment</Text>
        </View>
        {paybackQuarter && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 10, height: 0, borderTopWidth: 1, borderTopColor: "#059669", borderStyle: "dashed" }} />
            <Text style={{ fontSize: 7, color: "#059669" }}>Payback</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function PDFProportionBar({ docPct, timePct, retPct }: { docPct: number; timePct: number; retPct: number }) {
  const barW = 486;
  const h = 8;

  const docW = Math.max((docPct / 100) * barW, docPct > 0 ? 2 : 0);
  const retW = Math.max((retPct / 100) * barW, retPct > 0 ? 2 : 0);
  const timeW = barW - docW - retW;

  return (
    <View style={{ marginTop: 8, marginBottom: 6 }}>
      <Svg width={barW} height={h} viewBox={`0 0 ${barW} ${h}`}>
        {docW > 0 && <Rect x={0} y={0} width={docW} height={h} fill="#2563EB" fillOpacity={0.8} rx={docPct >= 98 ? 3 : 0} />}
        {docW > 0 && <Rect x={0} y={0} width={Math.min(docW, 6)} height={h} fill="#2563EB" fillOpacity={0.8} rx={3} />}
        {timeW > 0 && <Rect x={docW} y={0} width={timeW} height={h} fill="#EA2C00" fillOpacity={0.75} />}
        {retW > 0 && <Rect x={docW + timeW} y={0} width={retW} height={h} fill="#059669" fillOpacity={0.75} rx={retPct > 0 ? 3 : 0} />}
      </Svg>
      <View style={{ flexDirection: "row", marginTop: 3 }}>
        {docPct > 0 && (
          <View style={{ flex: docPct, alignItems: docPct > 12 ? "center" : "flex-start" }}>
            <Text style={{ fontSize: 6.5, color: "#2563EB" }}>{docPct}% Doc Quality</Text>
          </View>
        )}
        {timePct > 0 && (
          <View style={{ flex: timePct, alignItems: timePct > 12 ? "center" : "flex-start" }}>
            <Text style={{ fontSize: 6.5, color: "#EA2C00" }}>{timePct}% Time Savings</Text>
          </View>
        )}
        {retPct > 0 && (
          <View style={{ flex: retPct, alignItems: retPct > 12 ? "center" : "flex-end" }}>
            <Text style={{ fontSize: 6.5, color: "#059669" }}>{retPct}% Retention</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function PDFOnsetTimeline() {
  const w = 458;
  const svgH = 22;
  const lineY = 11;

  const points = [
    { pct: 0.03, label: "Month 1", sublabel: "Doc Quality", color: "#2563EB" },
    { pct: 0.12, label: "Month 4", sublabel: "Time Savings", color: "#EA2C00" },
    { pct: 0.4, label: "Year 2", sublabel: "Retention 50%", color: "#059669" },
    { pct: 0.97, label: "Year 3", sublabel: "Full Retention", color: "#059669" },
  ];

  return (
    <View>
      <Svg width={w} height={svgH} viewBox={`0 0 ${w} ${svgH}`}>
        <SvgLine x1={8} y1={lineY} x2={w - 8} y2={lineY} stroke="#E5E0DB" strokeWidth={2} />
        <SvgLine x1={(w - 16) * points[2].pct + 8} y1={lineY - 1} x2={(w - 16) * points[3].pct + 8} y2={lineY - 1} stroke="#059669" strokeWidth={4} strokeOpacity={0.18} />
        {points.map((pt, i) => {
          const cx = (w - 16) * pt.pct + 8;
          return (
            <G key={`op-${i}`}>
              <Circle cx={cx} cy={lineY} r={5} fill={pt.color} />
              <Circle cx={cx} cy={lineY} r={2.5} fill="#FFFFFF" />
            </G>
          );
        })}
      </Svg>
      <View style={{ flexDirection: "row", marginTop: 3, justifyContent: "space-between" }}>
        <View style={{ alignItems: "flex-start" }}>
          <Text style={{ fontSize: 6.5, fontWeight: "bold", color: "#1A1A1A" }}>Month 1</Text>
          <Text style={{ fontSize: 5.5, color: "#2563EB" }}>Doc Quality</Text>
        </View>
        <View style={{ alignItems: "center", marginLeft: -20 }}>
          <Text style={{ fontSize: 6.5, fontWeight: "bold", color: "#1A1A1A" }}>Month 4</Text>
          <Text style={{ fontSize: 5.5, color: "#EA2C00" }}>Time Savings</Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 6.5, fontWeight: "bold", color: "#1A1A1A" }}>Year 2</Text>
          <Text style={{ fontSize: 5.5, color: "#059669" }}>Retention 50%</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 6.5, fontWeight: "bold", color: "#1A1A1A" }}>Year 3</Text>
          <Text style={{ fontSize: 5.5, color: "#059669" }}>Full Retention</Text>
        </View>
      </View>
    </View>
  );
}

function PDFSensitivityBars({ conservative, base, optimistic }: { conservative: number; base: number; optimistic: number }) {
  const w = 120;
  const maxVal = Math.max(conservative, base, optimistic, 0.01);
  const barH = 5;
  const gap = 4;
  const totalH = barH * 3 + gap * 2;
  const scale = (v: number) => Math.max((v / maxVal) * w * 0.9, 3);

  return (
    <View style={{ marginTop: 6 }}>
      <Svg width={w} height={totalH} viewBox={`0 0 ${w} ${totalH}`}>
        <Rect x={0} y={0} width={scale(conservative)} height={barH} fill="#999999" fillOpacity={0.45} rx={2} />
        <Rect x={0} y={barH + gap} width={scale(base)} height={barH} fill="#EA2C00" fillOpacity={0.65} rx={2} />
        <Rect x={0} y={(barH + gap) * 2} width={scale(optimistic)} height={barH} fill="#059669" fillOpacity={0.55} rx={2} />
      </Svg>
    </View>
  );
}

const BASE_PAGES = 8;

const PageFooter = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => (
  <View style={styles.footer}>
    <Text style={styles.footerLeft}>ABRIDGE</Text>
    <Text style={styles.footerCenter}>Organization Proforma</Text>
    <Text style={styles.footerRight}>Page {pageNum} of {totalPages}</Text>
  </View>
);

interface ProformaPDFProps {
  settings: ProformaSettingSnapshot[];
  config: ProformaConfig;
  summary: ProformaSummary;
  yearlyData: ReturnType<typeof getYearlySummary>;
  sensitivityIRR: { conservative: number; optimistic: number; consValid: boolean; optValid: boolean };
}

function ProformaPDFDocument({ settings, config, summary, yearlyData, sensitivityIRR, chartData, paybackQuarter }: ProformaPDFProps & { chartData: ChartBar[]; paybackQuarter: string | null }) {
  const termLabel = contractTermLabel(config.contractTermMonths);
  const hasInvestment = settings.some(s => s.implementationFee > 0 || s.costPerUnit > 0);
  const irrLabel = summary.irrMethod === "mirr" ? "MIRR" : "IRR";
  const irrDisplay = hasInvestment && summary.irrValid ? fmtPct(summary.irr) : "N/A";
  const mathPages = getMathPageCount(settings);
  const TOTAL_PAGES = BASE_PAGES + mathPages;
  const enrichedBySettings = settings.map(s => ({ setting: s, drivers: buildDriverCalcSteps(s) }));
  const settingInputSummaries = settings.map(s => ({ setting: s, inputs: getSettingInputSummary(s) }));

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
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.positive }}>{hasInvestment ? `${summary.valueToCost.toFixed(1)}x` : "N/A"}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>Value-to-Cost</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{summary.paybackMonth ? `${summary.paybackMonth} mo` : "\u2014"}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>Payback</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{Math.round(summary.simpleROI * 100)}%</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>Simple ROI</Text>
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

          {totalAllValue > 0 && (
            <PDFProportionBar docPct={docPct} timePct={timePct} retPct={retPct} />
          )}

          <View style={styles.calloutBox}>
            <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
              STRATEGIC OBSERVATION
            </Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
              {strategicObservation}
            </Text>
          </View>

          <PageFooter pageNum={1} totalPages={TOTAL_PAGES} />
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

          <PageFooter pageNum={2} totalPages={TOTAL_PAGES} />
        </View>
      </Page>

      {/* PAGE 3: THE VALUE TRAJECTORY */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>THE VALUE TRAJECTORY</Text>
          <Text style={styles.sectionHeadline}>How Value Builds Over Time</Text>
          <Text style={styles.body}>
            This chart shows how value accumulates quarter by quarter across your deployment. Documentation quality value (blue) appears first, time savings (red) join after a 3-month operational lag, and retention value (green) phases in over years. The thin bars represent your subscription investment for comparison.
          </Text>

          <View style={[styles.cardBg, { padding: 16, marginBottom: 10 }]}>
            <PDFValueChart data={chartData} paybackQuarter={paybackQuarter} />
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>FINAL QUARTER RUN-RATE</Text>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary }}>{chartData.length > 0 ? fmt(chartData[chartData.length - 1].total) : "\u2014"}</Text>
              <Text style={{ fontSize: 8, color: colors.secondary, marginTop: 2 }}>per quarter at full scale</Text>
            </View>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{termLabel.toUpperCase()} TOTAL VALUE</Text>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText }}>{fmt(summary.threeYearValue)}</Text>
              <Text style={{ fontSize: 8, color: colors.secondary, marginTop: 2 }}>cumulative across all quarters</Text>
            </View>
            {summary.paybackMonth && (
              <View style={[styles.cardBg, { flex: 1 }]}>
                <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>PAYBACK POINT</Text>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.positive }}>Month {summary.paybackMonth}</Text>
                <Text style={{ fontSize: 8, color: colors.secondary, marginTop: 2 }}>cumulative value exceeds cost</Text>
              </View>
            )}
          </View>

          <View style={styles.calloutBox}>
            <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
              READING THIS CHART
            </Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
              The stacked bars show how each value category contributes to total quarterly value. Notice how blue (doc quality) dominates early quarters, then red (time savings) joins and grows, and green (retention) gradually phases in. This onset sequencing is why Month 12 looks very different from Month 1 {"\u2014"} and why patience with the deployment timeline pays off.
            </Text>
          </View>

          <PageFooter pageNum={3} totalPages={TOTAL_PAGES} />
        </View>
      </Page>

      {/* PAGE 4 (and optionally 5): SHOWING OUR MATH */}
      {(() => {
        const mathPageStartNum = 4;
        const settingsPerPage = mathPages === 1 ? enrichedBySettings.length : Math.ceil(enrichedBySettings.length / 2);
        const chunks: typeof enrichedBySettings[] = [];
        for (let i = 0; i < enrichedBySettings.length; i += settingsPerPage) {
          chunks.push(enrichedBySettings.slice(i, i + settingsPerPage));
        }
        return chunks.map((chunk, pageIdx) => (
          <Page key={`math-${pageIdx}`} size="LETTER" style={styles.page} wrap={false}>
            <View style={styles.pageWrapper}>
              {pageIdx === 0 && (
                <>
                  <Text style={styles.sectionLabel}>SHOWING OUR MATH</Text>
                  <Text style={styles.sectionHeadline}>Every Number Has a Formula</Text>
                  <Text style={styles.body}>
                    Transparency builds trust. Below is the calculation behind every driver in this model {"\u2014"} the inputs you provided, the formula applied, and the result. Nothing is hidden.
                  </Text>
                </>
              )}
              {pageIdx > 0 && (
                <>
                  <Text style={styles.sectionLabel}>SHOWING OUR MATH (CONTINUED)</Text>
                  <View style={{ marginBottom: 8 }} />
                </>
              )}

              {chunk.map(({ setting, drivers }) => {
                const settingColor = setting.color || colors.primary;
                const timeDrivers = drivers.filter(dd => dd.category === "time");
                const docDrivers = drivers.filter(dd => dd.category === "documentation");
                const timeTotal = timeDrivers.reduce((sum, dd) => sum + dd.value, 0);
                const docTotal = docDrivers.reduce((sum, dd) => sum + dd.value, 0);

                const renderDriverGroup = (groupDrivers: EnrichedDriver[]) =>
                  groupDrivers.map((driver, i) => (
                    <View key={driver.id}>
                      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                        <View style={{ width: 3, backgroundColor: settingColor, marginRight: 10, borderRadius: 1, minHeight: 36 }} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                            <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText }}>{driver.name}</Text>
                            <Text style={{ fontSize: 9.5, fontWeight: "bold", color: settingColor }}>{fmt(driver.value)}</Text>
                          </View>
                          {driver.calcSteps.map((step, si) => (
                            <Text key={si} style={{
                              fontSize: 8.5,
                              color: si === driver.calcSteps.length - 1 ? settingColor : colors.secondary,
                              lineHeight: 1.5,
                              fontWeight: si === driver.calcSteps.length - 1 ? "bold" : "normal",
                            }}>
                              {step}
                            </Text>
                          ))}
                          {driver.calibrationNote && (
                            <Text style={{ fontSize: 7.5, color: colors.tertiary, marginTop: 2 }}>
                              {driver.calibrationNote}
                            </Text>
                          )}
                        </View>
                      </View>
                      {i < groupDrivers.length - 1 && (
                        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
                      )}
                    </View>
                  ));

                return (
                  <View key={setting.id} style={[styles.cardBg, { borderLeftWidth: 3, borderLeftColor: settingColor, marginBottom: 10, padding: 12 }]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primaryText }}>{setting.label}</Text>
                      <Text style={{ fontSize: 11, fontWeight: "bold", color: settingColor }}>{fmt(setting.annualValue)}/yr</Text>
                    </View>

                    {timeDrivers.length > 0 && (
                      <View style={{ marginBottom: 6 }}>
                        <Text style={{ fontSize: 8, color: colors.timeRed, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>TIME RECAPTURED</Text>
                        {renderDriverGroup(timeDrivers)}
                        <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 5 }} />
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>Time Subtotal</Text>
                          <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>{fmt(timeTotal)}</Text>
                        </View>
                      </View>
                    )}

                    {docDrivers.length > 0 && (
                      <View>
                        {timeDrivers.length > 0 && <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />}
                        <Text style={{ fontSize: 8, color: colors.docBlue, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>DOCUMENTATION QUALITY</Text>
                        {renderDriverGroup(docDrivers)}
                        <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 5 }} />
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>Documentation Subtotal</Text>
                          <Text style={{ fontSize: 8.5, fontWeight: "bold", color: colors.primaryText }}>{fmt(docTotal)}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}

              <PageFooter pageNum={mathPageStartNum + pageIdx} totalPages={TOTAL_PAGES} />
            </View>
          </Page>
        ));
      })()}

      {/* PAGE after math: HOW VALUE MATERIALIZES */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>HOW VALUE MATERIALIZES</Text>
          <Text style={styles.sectionHeadline}>Not All Value Shows Up on Day One</Text>
          <Text style={styles.body}>
            One of the most important aspects of this model is honesty about timing. Different value drivers materialize at different speeds, and this proforma accounts for that reality rather than assuming everything starts immediately.
          </Text>

          <View style={[styles.cardBg, { padding: 14, marginBottom: 10 }]}>
            <Text style={{ fontSize: 8, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>ONSET TIMELINE</Text>
            <PDFOnsetTimeline />
          </View>

          <View style={[styles.cardBg, { borderLeftWidth: 3, borderLeftColor: colors.docBlue, marginBottom: 8 }]}>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.docBlue, marginBottom: 3 }}>Layer 1: Documentation Quality (Immediate)</Text>
            <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.45, marginBottom: 3 }}>
              wRVU, HCC recapture, denial prevention, DRG accuracy, CDI efficiency. These activate from day one {"\u2014"} better, more complete notes are inherent to the technology with a brief one-month learning curve.
            </Text>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.docBlue }}>
              {termLabel} contribution: {fmt(totalDocValue)} ({docPct}% of total)
            </Text>
          </View>

          <View style={[styles.cardBg, { borderLeftWidth: 3, borderLeftColor: colors.timeRed, marginBottom: 8 }]}>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.timeRed, marginBottom: 3 }}>Layer 2: Time Savings (3-Month Delay)</Text>
            <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.45, marginBottom: 3 }}>
              Patient access, throughput, LWBS reduction, cost reduction, overtime. Time is saved immediately, but economic value requires operational change {"\u2014"} scheduling, templates, staffing. We model a 3-month lag with gradual ramp.
            </Text>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.timeRed }}>
              {termLabel} contribution: {fmt(totalTimeValue)} ({timePct}% of total)
            </Text>
          </View>

          <View style={[styles.cardBg, { borderLeftWidth: 3, borderLeftColor: colors.retentionGreen, marginBottom: 8 }]}>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.retentionGreen, marginBottom: 3 }}>Layer 3: Retention & Wellbeing (Phased Over Years)</Text>
            <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.45, marginBottom: 3 }}>
              Clinician and nurse retention, wellbeing improvements. Phased conservatively: {config.retentionPhasing.year1Pct}% Y1, {config.retentionPhasing.year2Pct}% Y2, {config.retentionPhasing.year3Pct}% Y3 {"\u2014"} deliberately understating early-period retention value.
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

          <PageFooter pageNum={4 + mathPages} totalPages={TOTAL_PAGES} />
        </View>
      </Page>

      {/* THE FINANCIAL PROJECTION */}
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
              Scenarios vary only value realization rate (70%{"\u2013"}130%). Subscription cost is held constant {"\u2014"} it{"\u2019"}s contractual.
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginBottom: 2 }}>70% REALIZATION</Text>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>
                  {sensitivityIRR.consValid ? fmtPct(sensitivityIRR.conservative) : "N/A"}
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center", borderBottomWidth: 2, borderBottomColor: colors.primary }}>
                <Text style={{ fontSize: 8, color: colors.primary, marginBottom: 2 }}>YOUR ASSUMPTIONS</Text>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary }}>{irrDisplay}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginBottom: 2 }}>130% REALIZATION</Text>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.positive }}>
                  {sensitivityIRR.optValid ? fmtPct(sensitivityIRR.optimistic) : "N/A"}
                </Text>
              </View>
            </View>
            {sensitivityIRR.consValid && sensitivityIRR.optValid && (
              <View style={{ marginTop: 8, alignItems: "center" }}>
                <PDFSensitivityBars
                  conservative={sensitivityIRR.conservative}
                  base={summary.irrValid ? summary.irr : 0}
                  optimistic={sensitivityIRR.optimistic}
                />
              </View>
            )}
          </View>

          <PageFooter pageNum={5 + mathPages} totalPages={TOTAL_PAGES} />
        </View>
      </Page>

      {/* THE INVESTMENT CASE */}
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
              <Text style={{ fontSize: 9, color: colors.positive, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>VALUE-TO-COST</Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.positive, marginBottom: 4 }}>
                {hasInvestment ? `${summary.valueToCost.toFixed(1)}x` : "N/A"}
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                {hasInvestment
                  ? `Total contract value divided by total contract cost. A ${summary.valueToCost.toFixed(1)}x ratio means the organization receives $${summary.valueToCost.toFixed(2)} in value for every $1 invested over the ${termLabel.toLowerCase()} term.`
                  : "No cost entered. Value-to-Cost requires an investment to calculate."}
              </Text>
            </View>

            <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primaryText }}>
              <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>SIMPLE ROI</Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>
                {Math.round(summary.simpleROI * 100)}%
              </Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                Total net value divided by total cost. {Math.round(summary.simpleROI * 100)}% means ${(1 + summary.simpleROI).toFixed(2)} back for every $1 invested.
                {hasInvestment && summary.irrValid ? ` Annual ${irrLabel}: ${irrDisplay}.` : ""}
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
              <Text style={{ flex: 1, fontSize: 9, fontWeight: "bold", color: colors.primary, textAlign: "right" }}>{fmt(summary.runRateValue)}</Text>
              <Text style={{ flex: 1, fontSize: 9, fontWeight: "bold", textAlign: "right" }}>{fmt(totalMonthlyCost)}</Text>
            </View>
          </View>

          <View style={styles.calloutBox}>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
              Providers expand according to per-year allocation (Y1 {"\u2192"} Y2 {"\u2192"} Y3). Within each year, providers ramp linearly between targets. This models a realistic organizational rollout {"\u2014"} not a theoretical day-one deployment. Investment cost scales proportionally with provider count.
            </Text>
          </View>

          <PageFooter pageNum={6 + mathPages} totalPages={TOTAL_PAGES} />
        </View>
      </Page>

      {/* ASSUMPTIONS & METHODOLOGY */}
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
              {settingInputSummaries.map(({ setting: s, inputs }) => (
                <View key={s.id} style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: s.color || colors.primaryText, marginBottom: 2 }}>{s.label}</Text>
                  <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.6 }}>
                    Y1: {s.yearlyProviders?.year1 || s.providerCount} {unitLabel(s.careSetting)}{"\n"}
                    Y2: {s.yearlyProviders?.year2 || s.providerCount} {unitLabel(s.careSetting)}{"\n"}
                    {config.contractTermMonths >= 36 ? `Y3: ${s.yearlyProviders?.year3 || s.fullScaleProviders || s.providerCount} ${unitLabel(s.careSetting)}\n` : ""}
                    {fmt(s.costPerUnit)}/{unitLabel(s.careSetting, false)}/mo{"\n"}
                    {s.implementationFee > 0 ? `${fmt(s.implementationFee)} implementation` : "No implementation fee"}
                  </Text>
                  {inputs.length > 0 && (
                    <Text style={{ fontSize: 7.5, color: colors.tertiary, lineHeight: 1.5, marginTop: 2 }}>
                      {inputs.join("\n")}
                    </Text>
                  )}
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

          <Text style={styles.sectionLabelGray}>RETURN METHODOLOGY</Text>
          <View style={[styles.cardBg, { marginBottom: 8 }]}>
            <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.6 }}>
              Value-to-Cost is the primary metric: total contract value divided by total contract cost. IRR is calculated on annual cash flow periods {"\u2014"} Period 0 is the total cost basis (implementation fees plus full contract subscription: {fmt(summary.threeYearInvestment)}). Subsequent periods are annual gross value realized. This total-cost-basis approach answers: {"\u201C"}What is my annualized return on total spend?{"\u201D"}
              {summary.irrMethod === "mirr" ? " This model used Modified IRR (MIRR) because the cash flows have multiple sign changes." : ""}
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

          <PageFooter pageNum={7 + mathPages} totalPages={TOTAL_PAGES} />
        </View>
      </Page>

      {/* HONEST LIMITS & NEXT STEPS */}
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

          <PageFooter pageNum={8 + mathPages} totalPages={TOTAL_PAGES} />
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
  const startDate = getContractStartDate();

  const quarterlyData = groupByQuarter(cashFlows, startDate);
  const chartData: ChartBar[] = quarterlyData.map(q => ({
    label: q.label,
    docValue: q.docValue,
    timeValue: q.timeValue,
    retentionValue: q.retentionValue,
    investment: q.investment,
    total: q.docValue + q.timeValue + q.retentionValue,
  }));

  let paybackQuarter: string | null = null;
  for (const q of quarterlyData) {
    if (q.cumulativeNet >= 0) {
      paybackQuarter = q.label;
      break;
    }
  }

  const scaleSettings = (s: ProformaSettingSnapshot, vf: number) => ({
    ...s,
    annualValue: s.annualValue * vf,
    retentionValue: s.retentionValue * vf,
    drivers: s.drivers.map(d => ({ ...d, value: d.value * vf })),
  });
  const conservative = settings.map(s => scaleSettings(s, 0.7));
  const optimistic = settings.map(s => scaleSettings(s, 1.3));
  const consCF = buildMonthlyCashFlows(conservative, config);
  const optCF = buildMonthlyCashFlows(optimistic, config);
  const consResult = calculateAnnualIRR(buildAnnualIRRCashFlows(conservative, config, consCF));
  const optResult = calculateAnnualIRR(buildAnnualIRRCashFlows(optimistic, config, optCF));
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
      chartData={chartData}
      paybackQuarter={paybackQuarter}
    />
  ).toBlob();

  await savePdfBlob(blob, "Abridge_Organization_Proforma.pdf", "Organization Proforma");
}
