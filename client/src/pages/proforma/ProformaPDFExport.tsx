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
  Path,
} from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";
import abridgeLogoRed from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import type { ProformaSettingSnapshot, ProformaConfig, ProformaDriver } from "./proformaTypes";
import type { ProformaSummary } from "./proformaTypes";
import { SETTING_LABELS, SETTING_UNIT_LABELS, ONSET_DELAY_MONTHS } from "./proformaTypes";
import {
  buildMonthlyCashFlows,
  groupByQuarter,
  calculateProformaSummary,
  getYearlySummary,
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
  docBlue: "#1E3A5F",
  timeRed: "#EA2C00",
  retentionAmber: "#D4930A",
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
  return `${val}%`;
}

function fmtNum(n: number) {
  return Math.round(n).toLocaleString();
}

function fmtPrice(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  if (Math.abs(n) < 100) return `$${n.toFixed(2)}`;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtNumShort(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 100_000) return `${Math.round(n / 1_000)}K`;
  return Math.round(n).toLocaleString();
}

function contractTermLabel(months: number): string {
  if (months % 12 === 0) return `${months / 12}-Year`;
  return `${months}-Month`;
}

function unitLabel(careSetting: string, plural = true): string {
  const label = SETTING_UNIT_LABELS[careSetting] || "providers";
  return plural ? label : label.replace(/s$/, "");
}

function getSettingInputSummary(snapshot: ProformaSettingSnapshot): string[] {
  const s = snapshot.fullExploreState;
  if (!s) return [];
  const t = s.timeDriverInputs;
  const d = s.docQualityInputs;
  if (!t || !d) return [];
  const cs = snapshot.careSetting;
  const lines: string[] = [];

  const providers = snapshot.providerCount ?? s.numberOfProviders ?? 0;
  const encounters = snapshot.encounters ?? s.annualEncounters ?? 0;
  const util = snapshot.utilizationPercent ?? s.utilizationPercent ?? 0;

  if (cs === "nursing") {
    lines.push(`${s.nursingStaffedBeds ?? 0} staffed beds \u00B7 ${providers} nurse FTEs`);
  } else {
    lines.push(`${providers} ${unitLabel(cs)} \u00B7 ${encounters.toLocaleString()} encounters/yr`);
  }
  const minSaved = s.minutesSavedPerEncounter ?? 0;
  lines.push(`${util}% utilization \u00B7 ${minSaved % 1 !== 0 ? minSaved.toFixed(1) : minSaved} min saved/encounter`);

  if (cs === "outpatient") {
    if (t.patientAccessEnabled) {
      const visitsPerWk = (t as any).additionalVisitsPerWeek ?? 2;
      lines.push(`Capacity: ${visitsPerWk} visits/wk per provider · ${t.visitDuration}min visits · $${t.revenuePerVisit}/visit`);
    }
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
    if (t.nursingRetentionEnabled) lines.push(`Retention: ${t.nursingTurnoverRate}% turnover \u00B7 $${(t.nursingReplacementCost ?? 0).toLocaleString()} replacement`);
  }

  if (t.wellbeingEnabled && t.calculateRetentionValue && cs !== "nursing") {
    lines.push(`Retention: ${t.annualTurnoverRate}% turnover \u00B7 ${t.retentionImpactScenario} impact`);
  }
  if (t.costReductionEnabled && t.estimatedCostReduction > 0) {
    lines.push(`Cost reduction: $${t.estimatedCostReduction.toLocaleString()}/yr`);
  }

  return lines;
}

const WRVU_SCENARIOS: Record<string, number> = { conservative: 2, typical: 5, aggressive: 7 };
const DENIALS_SCENARIOS: Record<string, number> = { conservative: 25, typical: 50, aggressive: 75 };
const RETENTION_SCENARIOS: Record<string, number> = { conservative: 20, typical: 30, optimistic: 40 };
const DRG_SCENARIOS: Record<string, number> = { conservative: 15, typical: 20, aggressive: 25 };
const CDI_SCENARIOS: Record<string, number> = { conservative: 15, typical: 25, aggressive: 35 };

function fmtK(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function getDriverCalcSteps(driver: ProformaDriver, snapshot: ProformaSettingSnapshot): string[] {
  const s = snapshot.fullExploreState;
  if (!s) return [];
  const t = s.timeDriverInputs;
  const d = s.docQualityInputs;
  const cs = snapshot.careSetting;
  const encounters = snapshot.encounters ?? s.annualEncounters ?? 0;
  const providers = snapshot.providerCount ?? s.numberOfProviders ?? 0;
  const util = snapshot.utilizationPercent ?? s.utilizationPercent ?? 100;
  const eligibleEnc = Math.round(encounters * (util / 100));

  switch (driver.id) {
    case "wrvu": {
      const liftPct = WRVU_SCENARIOS[d.wrvuScenario] || 5;
      return [
        `${d.currentWrvu} wRVU/enc \u00D7 ${liftPct}% lift \u00D7 ${eligibleEnc.toLocaleString()} encounters`,
        `\u00D7 $${d.conversionFactor}/wRVU \u00D7 ${d.wrvuRealization}% realization`,
        `= ${fmtK(driver.value)}/year`,
      ];
    }
    case "hcc":
      return [
        `MA patients \u00D7 gap rate \u00D7 recapture rate \u00D7 RAF value`,
        `\u00D7 ${d.hccRealization}% realization`,
        `= ${fmtK(driver.value)}/year`,
      ];
    case "denials": {
      const preventPct = DENIALS_SCENARIOS[d.denialsScenario] || 50;
      return [
        `${eligibleEnc.toLocaleString()} enc \u00D7 ${d.denialRate}% denial rate`,
        `\u00D7 ${d.unappealableRate}% doc-related \u00D7 ${preventPct}% prevented`,
        `\u00D7 $${d.avgClaimValue.toLocaleString()}/claim = ${fmtK(driver.value)}/year`,
      ];
    }
    case "patientAccess": {
      const visitsPerWk = (t as any).additionalVisitsPerWeek ?? 2;
      const providerCount = snapshot.providerCount ?? s.numberOfProviders ?? 0;
      const annualVisits = visitsPerWk * providerCount * 48;
      return [
        `${visitsPerWk} visits/wk \u00D7 ${providerCount} providers \u00D7 48 wks = ${annualVisits.toLocaleString()} visits`,
        `${annualVisits.toLocaleString()} \u00D7 $${t.revenuePerVisit}/visit = ${fmtK(driver.value)}/year`,
      ];
    }
    case "retention": {
      if (cs === "nursing") {
        return [
          `${providers} FTEs \u00D7 ${t.nursingTurnoverRate}% turnover \u00D7 40% burnout-related`,
          `\u00D7 ${t.retentionImpactScenario} impact \u00D7 $${(t.nursingReplacementCost ?? 0).toLocaleString()} replacement`,
          `= ${fmtK(driver.value)}/year`,
        ];
      }
      const impactPct = RETENTION_SCENARIOS[t.retentionImpactScenario] || 30;
      return [
        `${providers} providers \u00D7 ${t.annualTurnoverRate}% turnover \u00D7 ${t.burnoutRelatedTurnover}% burnout-related`,
        `\u00D7 ${impactPct}% Abridge impact \u00D7 $${t.replacementCost.toLocaleString()} replacement cost`,
        `= ${fmtK(driver.value)}/year`,
      ];
    }
    case "edLwbs": {
      const recovered = Math.round(encounters * (t.edLwbsRate / 100) * (t.edLwbsReduction / 100));
      return [
        `${encounters.toLocaleString()} enc \u00D7 ${t.edLwbsRate}% LWBS \u00D7 ${t.edLwbsReduction}% reduction`,
        `${recovered.toLocaleString()} recovered \u00D7 $${t.edRevenuePerVisit}/visit \u00D7 ${t.edLwbsRealization}% realization`,
        `= ${fmtK(driver.value)}/year`,
      ];
    }
    case "edAdmission": {
      const recoveredBase = Math.round(encounters * (t.edLwbsRate / 100) * (t.edLwbsReduction / 100));
      return [
        `${recoveredBase.toLocaleString()} recovered \u00D7 ${t.edAdmissionRate}% admission rate`,
        `\u00D7 $${t.edAdmissionRevenue.toLocaleString()}/admission \u00D7 ${t.edAdmissionRealization}% realization`,
        `= ${fmtK(driver.value)}/year`,
      ];
    }
    case "nursingOt": {
      const nurseFtes = s.numberOfProviders ?? providers;
      const currentOtPerYear = nurseFtes * (t.nursingOtHoursPerNurseWeek || 4) * 52;
      const otHoursElim = Math.round(currentOtPerYear * (t.nursingOtReductionPercent / 100));
      return [
        `${nurseFtes} nurses \u00D7 ${t.nursingOtHoursPerNurseWeek || 4} OT hrs/wk \u00D7 52 wks = ${currentOtPerYear.toLocaleString()} OT hrs/yr`,
        `${currentOtPerYear.toLocaleString()} \u00D7 ${t.nursingOtReductionPercent}% reduction = ${otHoursElim.toLocaleString()} hrs eliminated`,
        `${otHoursElim.toLocaleString()} \u00D7 $${t.nursingOtHourlyRate}/hr = ${fmtK(driver.value)}/year`,
      ];
    }
    case "ipDrg": {
      const captureRate = DRG_SCENARIOS[d.ipDrgScenario] || 20;
      return [
        `${eligibleEnc.toLocaleString()} enc \u00D7 ${d.ipDrgAtRiskRate}% at-risk \u00D7 ${captureRate}% captured`,
        `\u00D7 ${d.ipDrgWeightIncrease} wt increase \u00D7 $${d.ipDrgBasePayment.toLocaleString()} base`,
        `\u00D7 ${d.ipDrgRealization}% realization = ${fmtK(driver.value)}/year`,
      ];
    }
    case "ipObsDefense":
      return [
        `${eligibleEnc.toLocaleString()} admissions \u00D7 ${d.ipObsDefenseDenialRate}% denial rate \u00D7 $${d.ipObsDefenseClaimValue.toLocaleString()} avg claim`,
        `\u00D7 ${d.ipObsDefenseDocContribution}% doc contribution \u00D7 ${d.ipObsDefenseRealization}% realization`,
        `= ${fmtK(driver.value)}/year`,
      ];
    case "ipCdi": {
      const reductionRate = CDI_SCENARIOS[d.ipCdiScenario] || 25;
      return [
        `${eligibleEnc.toLocaleString()} enc \u00D7 ${d.ipCdiQueryRate}% query rate \u00D7 ${reductionRate}% reduced`,
        `\u00D7 $${d.ipCdiCostPerQuery}/query = ${fmtK(driver.value)}/year`,
      ];
    }
    case "ipCdiCapacity":
      return [
        `${t.ipCdiCapacityFtes} CDI FTEs \u00D7 $${t.ipCdiCapacitySalary.toLocaleString()} salary`,
        `\u00D7 ${t.ipCdiCapacityQueryTimePct}% query time \u00D7 ${t.ipCdiCapacityReductionPct}% reduction = ${fmtK(driver.value)}/year`,
      ];
    case "costReduction":
      return [`Estimated annual cost reduction: ${fmtK(driver.value)}/year`];
    case "docQuality":
      return [`Implied documentation quality value from time allocated to complete notes = ${fmtK(driver.value)}/year`];
    case "nursingHapi":
      return [`HAPI risk reduction through improved documentation = ${fmtK(driver.value)}/year`];
    case "nursingFalls":
      return [`Fall risk visibility gap closure = ${fmtK(driver.value)}/year`];
    case "nursingHac":
      return [`HAC penalty avoidance through documentation = ${fmtK(driver.value)}/year`];
    default:
      return [];
  }
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
              const retH = (bar.retentionValue / niceMax) * svgH;
              const timeH = (bar.timeValue / niceMax) * svgH;
              const docH = (bar.docValue / niceMax) * svgH;
              const retY = scaleY(bar.retentionValue);
              const timeY = scaleY(bar.retentionValue + bar.timeValue);
              const docY = scaleY(bar.retentionValue + bar.timeValue + bar.docValue);
              const invH = (bar.investment / niceMax) * svgH;
              const invY = scaleY(bar.investment);
              const invBarW = Math.max(barW * 0.18, 3);

              return (
                <G key={`bar-${i}`}>
                  {retH > 0.5 && <Rect x={x} y={retY} width={barW} height={retH} fill={colors.retentionAmber} fillOpacity={0.75} rx={1} />}
                  {timeH > 0.5 && <Rect x={x} y={timeY} width={barW} height={timeH} fill={colors.timeRed} fillOpacity={0.75} />}
                  {docH > 0.5 && <Rect x={x} y={docY} width={barW} height={docH} fill={colors.docBlue} fillOpacity={0.8} rx={1} />}
                  {invH > 0.5 && <Rect x={x + barW + 2} y={invY} width={invBarW} height={invH} fill="#78716C" fillOpacity={0.35} rx={1} />}
                  {invH > 0.5 && <SvgLine x1={x + barW + 2} y1={invY} x2={x + barW + 2 + invBarW} y2={invY} stroke="#78716C" strokeWidth={0.8} />}
                </G>
              );
            })}

            {paybackQuarter && (() => {
              const idx = data.findIndex(d => d.label === paybackQuarter);
              if (idx < 0) return null;
              const x = idx * groupW + barGap + barW / 2;
              return <SvgLine x1={x} y1={0} x2={x} y2={svgH} stroke={colors.retentionAmber} strokeWidth={0.8} strokeDasharray="4 2" />;
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
          <View style={{ width: 10, height: 6, backgroundColor: colors.docBlue, borderRadius: 1, opacity: 0.8 }} />
          <Text style={{ fontSize: 7, color: "#666666" }}>Doc Quality</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 10, height: 6, backgroundColor: colors.timeRed, borderRadius: 1, opacity: 0.75 }} />
          <Text style={{ fontSize: 7, color: "#666666" }}>Capacity & Efficiency</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 10, height: 6, backgroundColor: colors.retentionAmber, borderRadius: 1, opacity: 0.75 }} />
          <Text style={{ fontSize: 7, color: "#666666" }}>Retention</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 10, height: 6, backgroundColor: "#78716C", borderRadius: 1, opacity: 0.4 }} />
          <Text style={{ fontSize: 7, color: "#666666" }}>Investment</Text>
        </View>
        {paybackQuarter && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 10, height: 0, borderTopWidth: 1, borderTopColor: colors.retentionAmber, borderStyle: "dashed" }} />
            <Text style={{ fontSize: 7, color: colors.retentionAmber }}>Payback</Text>
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
        {docW > 0 && <Rect x={0} y={0} width={docW} height={h} fill={colors.docBlue} fillOpacity={0.8} rx={docPct >= 98 ? 3 : 0} />}
        {docW > 6 && <Rect x={0} y={0} width={6} height={h} fill={colors.docBlue} fillOpacity={0.8} rx={3} />}
        {timeW > 0 && <Rect x={docW} y={0} width={timeW} height={h} fill={colors.timeRed} fillOpacity={0.75} />}
        {retW > 0 && <Rect x={docW + timeW} y={0} width={retW} height={h} fill={colors.retentionAmber} fillOpacity={0.75} rx={retPct > 0 ? 3 : 0} />}
      </Svg>
      <View style={{ flexDirection: "row", marginTop: 3 }}>
        {docPct >= 8 && (
          <View style={{ flex: docPct, alignItems: docPct > 12 ? "center" : "flex-start" }}>
            <Text style={{ fontSize: 6.5, color: colors.docBlue }}>{docPct}% Doc Quality</Text>
          </View>
        )}
        {timePct >= 8 && (
          <View style={{ flex: timePct, alignItems: timePct > 12 ? "center" : "flex-start" }}>
            <Text style={{ fontSize: 6.5, color: colors.timeRed }}>{timePct}% Capacity</Text>
          </View>
        )}
        {retPct >= 8 && (
          <View style={{ flex: retPct, alignItems: retPct > 12 ? "center" : "flex-end" }}>
            <Text style={{ fontSize: 6.5, color: colors.retentionAmber }}>{retPct}% Retention</Text>
          </View>
        )}
      </View>
    </View>
  );
}


const TOTAL_PDF_PAGES = 9;

const PageFooter = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => (
  <View style={styles.footer}>
    <Text style={styles.footerLeft}>ABRIDGE</Text>
    <Text style={styles.footerCenter}>Confidential</Text>
    <Text style={styles.footerRight}>Page {pageNum} of {totalPages}</Text>
  </View>
);

interface ProformaPDFProps {
  settings: ProformaSettingSnapshot[];
  config: ProformaConfig;
  summary: ProformaSummary;
  yearlyData: ReturnType<typeof getYearlySummary>;
  organizationName?: string;
  preparedBy?: string;
}

function ProformaPDFDocument({ settings, config, summary, yearlyData, chartData, paybackQuarter, organizationName, preparedBy }: ProformaPDFProps & { chartData: ChartBar[]; paybackQuarter: string | null; organizationName?: string; preparedBy?: string }) {
  const termLabel = contractTermLabel(config.contractTermMonths);
  const contractYears = Math.ceil(config.contractTermMonths / 12);
  const hasInvestment = summary.termInvestment > 0;
  const settingInputSummaries = settings.map(s => ({ setting: s, inputs: getSettingInputSummary(s) }));
  const anyPerEncounter = settings.some(s => s.pricingModel === "perEncounter");
  const allPerEncounter = settings.every(s => s.pricingModel === "perEncounter");
  const hasNursing = settings.some(s => s.careSetting === "nursing");

  const totalDocValue = yearlyData.reduce((s, y) => s + y.docValue, 0);
  const totalTimeValue = yearlyData.reduce((s, y) => s + y.timeValue, 0);
  const totalRetentionValue = yearlyData.reduce((s, y) => s + y.retentionValue, 0);
  const totalAllValue = totalDocValue + totalTimeValue + totalRetentionValue;
  const docPct = totalAllValue > 0 ? Math.round((totalDocValue / totalAllValue) * 100) : 0;
  const timePct = totalAllValue > 0 ? Math.round((totalTimeValue / totalAllValue) * 100) : 0;
  const retPct = totalAllValue > 0 ? Math.round((totalRetentionValue / totalAllValue) * 100) : 0;

  const totalInitial = settings.reduce((s, v) => s + (v.yearlyProviders?.year1 || v.providerCount), 0);
  const totalFullScale = settings.reduce((s, v) => s + (v.fullScaleProviders || v.providerCount), 0);

  const totalInitialEncounters = settings.reduce((s, v) => s + (v.yearlyEncounters?.year1 || v.encounters || 0), 0);
  const totalFullScaleEncounters = settings.reduce((s, v) => {
    const ye = v.yearlyEncounters;
    if (!ye) return s + (v.encounters || 0);
    return s + (contractYears >= 3 ? ye.year3 : contractYears >= 2 ? ye.year2 : ye.year1);
  }, 0);
  const totalHoursSaved = settings.reduce((s, v) => s + v.totalHoursSaved, 0);

  const settingNames = settings.map(s => SETTING_LABELS[s.careSetting] || s.label).join(", ");

  const delayedOnsetMonths = ONSET_DELAY_MONTHS.delayed;

  function buildYearNarrative(yearIdx: number, y: typeof yearlyData[0]): { title: string; desc: string } {
    const yearNum = yearIdx + 1;
    const totalLicensed = settings.reduce((sum, s) => sum + (y.bySettings[s.id]?.licensedProviders || 0), 0);
    const totalEncounters = settings.reduce((sum, s) => sum + (y.bySettings[s.id]?.encounters || 0), 0);
    const prevLicensed = yearIdx > 0 ? settings.reduce((sum, s) => sum + (yearlyData[yearIdx - 1].bySettings[s.id]?.licensedProviders || 0), 0) : 0;
    const prevEncounters = yearIdx > 0 ? settings.reduce((sum, s) => sum + (yearlyData[yearIdx - 1].bySettings[s.id]?.encounters || 0), 0) : 0;
    const isScaling = yearIdx > 0 && (allPerEncounter ? totalEncounters > prevEncounters : totalLicensed > prevLicensed);
    const hasRetention = y.retentionValue > 0;
    const hasCapacity = y.timeValue > 0;
    const hasDocQuality = y.docValue > 0;
    const unitLbl = allPerEncounter ? "Contracted Encounters" : (() => { const labels = Array.from(new Set(settings.map(s => unitLabel(s.careSetting)))); return labels.join(" and "); })();
    const scaleLabel = allPerEncounter ? fmtNum(totalEncounters) : fmtNum(totalLicensed);

    if (yearNum === 1) {
      const driverList: string[] = [];
      if (hasDocQuality) driverList.push("documentation quality");
      if (hasCapacity) driverList.push(`capacity and efficiency (after a ${delayedOnsetMonths}-month operational lag)`);
      if (hasRetention) driverList.push("early retention effects");
      return {
        title: `Building the Foundation with ${scaleLabel} ${unitLbl}`,
        desc: `The ${config.implementationRampMonths}-month implementation ramp establishes workflows and adoption. ${driverList.length > 0 ? `Value begins with ${driverList.join(", ")}.` : ""} Year 1 projects ${fmt(y.totalValue)} in organizational value.`,
      };
    }
    if (yearNum === 2) {
      return {
        title: isScaling ? `Scaling to ${scaleLabel} ${unitLbl}` : `Deepening Adoption Across ${scaleLabel} ${unitLbl}`,
        desc: `${isScaling ? "Expanded deployment broadens the value base." : "Mature adoption strengthens value realization."} ${hasRetention ? "Retention value begins to materialize as clinician satisfaction compounds." : "Capacity and efficiency gains reach steady state."} Year 2 projects ${fmt(y.totalValue)} in organizational value.`,
      };
    }
    if (yearNum === 3) {
      return {
        title: `Full Impact at ${scaleLabel} ${unitLbl}`,
        desc: `All value drivers are contributing at or near full scale. ${hasRetention ? "Retention effects reach their target phasing." : ""} The organization is projected to realize ${fmt(y.totalValue)} in value${y.totalValue >= Math.max(...yearlyData.map(yd => yd.totalValue)) ? ` ${"\u2014"} the strongest year of the partnership` : ""}.`,
      };
    }
    if (yearNum === 4) {
      return {
        title: `Sustained Returns ${"\u2014"} Year ${yearNum}`,
        desc: `Mature adoption delivers predictable, recurring value. Operational workflows are fully embedded, and the organization benefits from ${fmt(y.totalValue)} in projected value with minimal incremental effort.`,
      };
    }
    return {
      title: `Long-Term Value ${"\u2014"} Year ${yearNum}`,
      desc: `The partnership reaches full maturity. Compounded efficiency gains and deeply embedded workflows deliver ${fmt(y.totalValue)} in projected organizational impact.`,
    };
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <Document>
      {/* PAGE 1: COVER */}
      <PDFCoverPage
        reportLabel="FINANCIAL PROFORMA"
        title={`${termLabel} ${settings.length === 1 ? `${SETTING_LABELS[settings[0].careSetting] || settings[0].label} ` : ""}Value Model`}
        subtitle={settingNames}
        clientName={organizationName}
        preparedBy={preparedBy}
        disclaimerText="This model reflects conservative estimates derived from user inputs and aggregated deployment experience. All assumptions are documented. Projections do not constitute a guarantee of financial performance."
      />

      {/* PAGE 2: EXECUTIVE SUMMARY */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>EXECUTIVE SUMMARY</Text>
          <Text style={styles.sectionHeadline}>The Investment Case at a Glance</Text>

          <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
            <View style={[styles.cardBg, { flex: 1, alignItems: "center", paddingVertical: 12 }]}>
              <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.positive }}>{hasInvestment ? `${summary.valueToCost.toFixed(1)}x` : "N/A"}</Text>
              <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>Value-to-Cost</Text>
            </View>
            <View style={[styles.cardBg, { flex: 1, alignItems: "center", paddingVertical: 12 }]}>
              <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.primaryText }}>{Math.round(summary.simpleROI * 100)}%</Text>
              <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>Simple ROI</Text>
            </View>
            <View style={[styles.cardBg, { flex: 1, alignItems: "center", paddingVertical: 12 }]}>
              <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.primaryText }}>{summary.paybackMonth ? `${summary.paybackMonth} mo` : "\u2014"}</Text>
              <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>Payback</Text>
            </View>
            <View style={[styles.cardBg, { flex: 1, alignItems: "center", paddingVertical: 12 }]}>
              <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.primary }}>{fmt(summary.termNet)}</Text>
              <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>{termLabel} Net Value</Text>
            </View>
          </View>

          <View style={styles.calloutBox}>
            <Text style={{ fontSize: 10, color: colors.primaryText, lineHeight: 1.6, fontWeight: "bold", marginBottom: 6 }}>
              This {termLabel.toLowerCase()} partnership is projected to deliver {fmt(summary.termNet)} in net organizational value {"\u2014"} a {summary.valueToCost.toFixed(1)}x return on investment.
            </Text>
            <Text style={{ fontSize: 9.5, color: colors.secondary, lineHeight: 1.6, marginBottom: 6 }}>
              {allPerEncounter
                ? (totalInitialEncounters !== totalFullScaleEncounters
                  ? `The model scales from ${fmtNum(totalInitialEncounters)} to ${fmtNum(totalFullScaleEncounters)} contracted encounters over ${contractYears} year${contractYears > 1 ? "s" : ""}, with a total investment of ${fmt(summary.termInvestment)}.`
                  : `Across ${fmtNum(totalFullScaleEncounters)} contracted encounters over ${contractYears} year${contractYears > 1 ? "s" : ""}, the total investment is ${fmt(summary.termInvestment)}.`)
                : (totalInitial !== totalFullScale
                  ? `The model scales from ${fmtNum(totalInitial)} to ${fmtNum(totalFullScale)} ${(() => { const labels = Array.from(new Set(settings.map(s => unitLabel(s.careSetting)))); return labels.join(" and "); })()} over ${contractYears} year${contractYears > 1 ? "s" : ""}, with a total investment of ${fmt(summary.termInvestment)}.`
                  : `Across ${fmtNum(totalFullScale)} ${(() => { const labels = Array.from(new Set(settings.map(s => unitLabel(s.careSetting)))); return labels.join(" and "); })()} over ${contractYears} year${contractYears > 1 ? "s" : ""}, the total investment is ${fmt(summary.termInvestment)}.`)}
            </Text>
            <Text style={{ fontSize: 9.5, color: colors.secondary, lineHeight: 1.6, marginBottom: 6 }}>
              Value realization follows a deliberate phasing: documentation quality improvements begin after a {config.implementationRampMonths}-month implementation ramp, capacity and efficiency gains follow after an additional {delayedOnsetMonths}-month operational lag, and retention value phases in conservatively as clinician satisfaction compounds.
            </Text>
            <Text style={{ fontSize: 9.5, color: colors.secondary, lineHeight: 1.6 }}>
              At full scale, the model projects {fmt(summary.runRateValue)} in annual recurring value{summary.paybackMonth ? ` with payback at month ${summary.paybackMonth}` : ""}.
            </Text>
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabelGray}>KEY INPUTS</Text>
          <View style={[styles.cardBg, { padding: 12 }]}>
            {settings.map(s => {
              const settingColor = s.color || colors.primary;
              return (
                <View key={s.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6, borderLeftWidth: 3, borderLeftColor: settingColor, paddingLeft: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{s.label}</Text>
                    <Text style={{ fontSize: 8, color: colors.secondary }}>
                      {s.pricingModel === "perEncounter"
                        ? (() => {
                            const ye = s.yearlyEncounters ?? { year1: s.encounters, year2: s.encounters, year3: s.encounters };
                            return [
                              `Y1: ${fmtNum(ye.year1)}`,
                              contractYears >= 2 ? `Y2: ${fmtNum(ye.year2)}` : null,
                              contractYears >= 3 ? `Y3: ${fmtNum(ye.year3)}` : null,
                            ].filter(Boolean).join(" \u2192 ") + " encounters";
                          })()
                        : s.yearlyProviders
                        ? [
                            `Y1: ${s.yearlyProviders.year1}`,
                            contractYears >= 2 ? `Y2: ${s.yearlyProviders.year2}` : null,
                            contractYears >= 3 ? `Y3: ${s.yearlyProviders.year3}` : null,
                          ].filter(Boolean).join(" \u2192 ") + ` ${unitLabel(s.careSetting)}`
                        : `${s.providerCount} \u2192 ${s.fullScaleProviders || s.providerCount} ${unitLabel(s.careSetting)}`} {"\u00B7"} {s.pricingModel === "perEncounter" && s.yearlyUtilization
                        ? [
                            `Y1: ${s.yearlyUtilization.year1}%`,
                            contractYears >= 2 ? `Y2: ${s.yearlyUtilization.year2}%` : null,
                            contractYears >= 3 ? `Y3: ${s.yearlyUtilization.year3}%` : null,
                          ].filter(Boolean).join(" \u2192 ") + " util"
                        : `${s.utilizationPercent}% utilization`} {"\u00B7"} {(() => {
                        const yp = s.yearlyPricing;
                        const price = s.pricingModel === "annualFlat"
                          ? (yp?.year1 ?? s.annualLicenseFee ?? 0)
                          : s.pricingModel === "perEncounter"
                          ? (yp?.year1 ?? s.costPerEncounter ?? 0)
                          : (yp?.year1 ?? s.costPerUnit);
                        const suffix = s.pricingModel === "annualFlat" ? "/yr flat" : s.pricingModel === "perEncounter" ? "/encounter" : `/${unitLabel(s.careSetting, false)}/mo`;
                        return `${fmtPrice(price)}${suffix}`;
                      })()}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: settingColor }}>{fmt(s.annualValue)}</Text>
                </View>
              );
            })}

            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 6 }} />
            <View style={{ flexDirection: "row", gap: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.docBlue }} />
                <Text style={{ fontSize: 7.5, color: colors.secondary }}>Immediate {"\u2014"} Doc quality</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.timeRed }} />
                <Text style={{ fontSize: 7.5, color: colors.secondary }}>Delayed ({ONSET_DELAY_MONTHS.delayed}mo) {"\u2014"} Capacity</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.retentionAmber }} />
                <Text style={{ fontSize: 7.5, color: colors.secondary }}>Phased {"\u2014"} Retention</Text>
              </View>
            </View>
          </View>

          <PageFooter pageNum={2} totalPages={TOTAL_PDF_PAGES} />
        </View>
      </Page>

      {/* PAGE 3: KEY ASSUMPTIONS & INPUTS */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>MODEL INPUTS</Text>
          <Text style={styles.sectionHeadline}>Key Assumptions & Configuration</Text>
          <Text style={styles.body}>
            Every number in this model traces back to specific inputs provided during configuration. This page documents the assumptions that drive the projections.
          </Text>

          <Text style={styles.sectionLabelGray}>DEPLOYMENT PROFILE</Text>
          {settings.map(s => {
            const settingColor = s.color || colors.primary;
            const isPerEnc = s.pricingModel === "perEncounter";
            const es = s.fullExploreState;
            const yp = s.yearlyProviders;
            const ye = s.yearlyEncounters;
            const priceLbl = s.pricingModel === "annualFlat" ? "Annual Fixed Fee" : isPerEnc ? "Per Encounter" : "Per Provider/Month";
            const priceVal = s.pricingModel === "annualFlat"
              ? (s.yearlyPricing?.year1 ?? s.annualLicenseFee ?? 0)
              : isPerEnc
              ? (s.yearlyPricing?.year1 ?? s.costPerEncounter ?? 0)
              : (s.yearlyPricing?.year1 ?? s.costPerUnit);
            const priceSuffix = s.pricingModel === "annualFlat" ? "/yr" : isPerEnc ? "/enc" : "/mo";

            return (
              <View key={s.id} style={[styles.cardBg, { marginBottom: 8, padding: 0 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <View style={{ width: 4, height: 16, backgroundColor: settingColor, borderRadius: 2, marginRight: 8 }} />
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: colors.primaryText, flex: 1 }}>{s.label}</Text>
                  <Text style={{ fontSize: 9, color: colors.tertiary }}>{priceLbl}</Text>
                </View>

                <View style={{ flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, gap: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>SCALE</Text>
                    {s.careSetting === "nursing" ? (
                      <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5 }}>
                        {es?.nursingStaffedBeds ?? 0} staffed beds{"\n"}{s.providerCount} nurse FTEs
                      </Text>
                    ) : isPerEnc ? (
                      <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5 }}>
                        {ye ? `${fmtNum(ye.year1)}${contractYears >= 2 ? ` \u2192 ${fmtNum(ye.year2)}` : ""}${contractYears >= 3 ? ` \u2192 ${fmtNum(ye.year3)}` : ""} encounters` : `${fmtNum(s.encounters)} encounters/yr`}
                        {"\n"}{s.providerCount} {unitLabel(s.careSetting)}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5 }}>
                        {yp ? `${yp.year1}${contractYears >= 2 ? ` \u2192 ${yp.year2}` : ""}${contractYears >= 3 ? ` \u2192 ${yp.year3}` : ""} ${unitLabel(s.careSetting)}` : `${s.providerCount} ${unitLabel(s.careSetting)}`}
                        {"\n"}{fmtNum(s.encounters)} encounters/yr
                      </Text>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>UTILIZATION</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5 }}>
                      {s.yearlyUtilization
                        ? `Y1: ${s.yearlyUtilization.year1}%${contractYears >= 2 ? `  Y2: ${s.yearlyUtilization.year2}%` : ""}${contractYears >= 3 ? `  Y3: ${s.yearlyUtilization.year3}%` : ""}`
                        : `${s.utilizationPercent}%`}
                      {"\n"}{es?.minutesSavedPerEncounter != null ? (es.minutesSavedPerEncounter % 1 !== 0 ? es.minutesSavedPerEncounter.toFixed(1) : es.minutesSavedPerEncounter) : 0} min saved/encounter
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>PRICING</Text>
                    <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5 }}>
                      {fmtPrice(priceVal)}{priceSuffix}
                      {s.implementationFee > 0 ? `\n${fmt(s.implementationFee)} implementation` : ""}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>ANNUAL VALUE</Text>
                    <Text style={{ fontSize: 13, fontWeight: "bold", color: settingColor }}>{fmt(s.annualValue)}</Text>
                  </View>
                </View>
              </View>
            );
          })}

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabelGray}>IMPLEMENTATION & PHASING</Text>
          <View style={[styles.cardBg, { padding: 12 }]}>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>CONTRACT TERM</Text>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{termLabel}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>IMPLEMENTATION RAMP</Text>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{config.implementationRampMonths} months</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>OPERATIONAL LAG</Text>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{delayedOnsetMonths} months</Text>
              </View>
            </View>

            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 8 }} />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>RETENTION PHASING</Text>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 3, padding: 4, alignItems: "center" }}>
                    <Text style={{ fontSize: 7, color: colors.tertiary }}>Y1</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.retentionAmber }}>{config.retentionPhasing.year1Pct}%</Text>
                  </View>
                  {contractYears >= 2 && (
                    <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 3, padding: 4, alignItems: "center" }}>
                      <Text style={{ fontSize: 7, color: colors.tertiary }}>Y2</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.retentionAmber }}>{config.retentionPhasing.year2Pct}%</Text>
                    </View>
                  )}
                  {contractYears >= 3 && (
                    <View style={{ flex: 1, backgroundColor: colors.background, borderRadius: 3, padding: 4, alignItems: "center" }}>
                      <Text style={{ fontSize: 7, color: colors.tertiary }}>Y3</Text>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.retentionAmber }}>{config.retentionPhasing.year3Pct}%</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>VALUE ONSET</Text>
                <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5 }}>
                  Doc quality: immediate after ramp{"\n"}
                  Capacity & efficiency: +{delayedOnsetMonths}mo delay{"\n"}
                  Retention: phased per schedule above
                </Text>
              </View>
            </View>
          </View>

          <PageFooter pageNum={3} totalPages={TOTAL_PDF_PAGES} />
        </View>
      </Page>

      {/* PAGE 4: VALUE DRIVER DETAIL */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>VALUE DRIVERS</Text>
          <Text style={styles.sectionHeadline}>How the Value Breaks Down</Text>
          <Text style={styles.body}>
            Each driver below represents a specific, measurable improvement. Together, they form the basis of the projected return.
          </Text>

          {settings.map(s => {
            const settingColor = s.color || colors.primary;
            const docDrivers = s.drivers.filter(d => d.category === "documentation" && d.value > 0);
            const timeDrivers = s.drivers.filter(d => d.category === "time" && d.onset !== "phased" && d.value > 0);
            const retentionDrivers = s.drivers.filter(d => d.onset === "phased" && d.value > 0);
            const allDrivers = [...docDrivers, ...timeDrivers, ...retentionDrivers];
            if (allDrivers.length === 0) return null;

            return (
              <View key={s.id} style={{ marginBottom: 10 }}>
                {settings.length > 1 && (
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                    <View style={{ width: 4, height: 12, backgroundColor: settingColor, borderRadius: 2, marginRight: 6 }} />
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{s.label}</Text>
                  </View>
                )}

                {allDrivers.map(driver => {
                  const calcSteps = getDriverCalcSteps(driver, s);
                  const categoryColor = driver.category === "documentation" ? colors.docBlue : driver.onset === "phased" ? colors.retentionAmber : colors.timeRed;
                  const categoryLabel = driver.category === "documentation" ? "Immediate" : driver.onset === "phased" ? "Phased" : `Delayed (${delayedOnsetMonths}mo)`;

                  return (
                    <View key={driver.id} style={[styles.cardBg, { marginBottom: 4, padding: 0 }]}>
                      <View style={{ flexDirection: "row" }}>
                        <View style={{ width: 3, backgroundColor: categoryColor, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }} />
                        <View style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 7 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={{ fontSize: 9.5, fontWeight: "bold", color: colors.primaryText }}>{driver.name}</Text>
                              <Text style={{ fontSize: 6.5, color: categoryColor, textTransform: "uppercase", letterSpacing: 0.5 }}>{categoryLabel}</Text>
                            </View>
                            <Text style={{ fontSize: 10, fontWeight: "bold", color: categoryColor }}>{fmt(driver.value)}</Text>
                          </View>
                          {calcSteps.map((step, si) => (
                            <Text key={si} style={{
                              fontSize: 8,
                              color: si === calcSteps.length - 1 ? categoryColor : colors.secondary,
                              fontWeight: si === calcSteps.length - 1 ? "bold" : "normal",
                              lineHeight: 1.4,
                            }}>{step}</Text>
                          ))}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabelGray}>CATEGORY SUBTOTALS</Text>
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
            {totalDocValue > 0 && (
              <View style={[styles.cardBg, { flex: 1, alignItems: "center", paddingVertical: 10 }]}>
                <View style={{ width: 20, height: 3, backgroundColor: colors.docBlue, borderRadius: 1, marginBottom: 6 }} />
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{fmt(totalDocValue)}</Text>
                <Text style={{ fontSize: 7.5, color: colors.tertiary, marginTop: 2 }}>Documentation Quality</Text>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.docBlue, marginTop: 2 }}>{docPct}%</Text>
              </View>
            )}
            {totalTimeValue > 0 && (
              <View style={[styles.cardBg, { flex: 1, alignItems: "center", paddingVertical: 10 }]}>
                <View style={{ width: 20, height: 3, backgroundColor: colors.timeRed, borderRadius: 1, marginBottom: 6 }} />
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{fmt(totalTimeValue)}</Text>
                <Text style={{ fontSize: 7.5, color: colors.tertiary, marginTop: 2 }}>Capacity & Efficiency</Text>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.timeRed, marginTop: 2 }}>{timePct}%</Text>
              </View>
            )}
            {totalRetentionValue > 0 && (
              <View style={[styles.cardBg, { flex: 1, alignItems: "center", paddingVertical: 10 }]}>
                <View style={{ width: 20, height: 3, backgroundColor: colors.retentionAmber, borderRadius: 1, marginBottom: 6 }} />
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{fmt(totalRetentionValue)}</Text>
                <Text style={{ fontSize: 7.5, color: colors.tertiary, marginTop: 2 }}>Retention</Text>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.retentionAmber, marginTop: 2 }}>{retPct}%</Text>
              </View>
            )}
          </View>

          <Text style={styles.sectionLabelGray}>WORKFORCE IMPACT</Text>
          <View style={[styles.cardBg, { padding: 0, flexDirection: "row" }]}>
            <View style={{ flex: 1, padding: 10, alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primaryText }}>{fmtNum(Math.round(totalHoursSaved))}</Text>
              <Text style={{ fontSize: 7.5, color: colors.tertiary, marginTop: 2, textAlign: "center" }}>hours/year returned{"\n"}to clinical care</Text>
            </View>
            <View style={{ width: 0.5, backgroundColor: colors.border }} />
            <View style={{ flex: 1, padding: 10, alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primaryText }}>{totalInitial > 0 ? (totalHoursSaved / totalInitial / 52).toFixed(1) : "0"}</Text>
              <Text style={{ fontSize: 7.5, color: colors.tertiary, marginTop: 2, textAlign: "center" }}>hours/week{"\n"}per {unitLabel(settings[0]?.careSetting || "outpatient", false)}</Text>
            </View>
            <View style={{ width: 0.5, backgroundColor: colors.border }} />
            <View style={{ flex: 1, padding: 10, alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primaryText }}>{totalInitial > 0 ? (totalHoursSaved / totalInitial / 8).toFixed(0) : "0"}</Text>
              <Text style={{ fontSize: 7.5, color: colors.tertiary, marginTop: 2, textAlign: "center" }}>days/year not{"\n"}at a keyboard</Text>
            </View>
          </View>

          <PageFooter pageNum={4} totalPages={TOTAL_PDF_PAGES} />
        </View>
      </Page>

      {/* PAGE 5: CONTRACT PROJECTION */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>{termLabel.toUpperCase()} PROJECTION</Text>
          <Text style={styles.sectionHeadline}>How Value Builds Over Time</Text>
          <Text style={styles.body}>
            Value builds progressively as the deployment matures. Documentation quality gains (navy) appear first, capacity and efficiency improvements (red) follow after a {delayedOnsetMonths}-month operational lag, and retention value (gold) compounds over the contract term.
          </Text>

          <View style={[styles.cardBg, { padding: 16, marginBottom: 10 }]}>
            <PDFValueChart data={chartData} paybackQuarter={paybackQuarter} />
          </View>

          <View style={[styles.cardBg, { marginBottom: 10, padding: 14 }]}>
            <View style={{ flexDirection: "row", marginBottom: 6 }}>
              <Text style={{ flex: 2, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase" }}></Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.tertiary, textTransform: "uppercase", textAlign: "right" }}>{y.label}</Text>
              ))}
              <Text style={{ flex: 1, fontSize: 8.5, fontWeight: "bold", color: colors.primary, textTransform: "uppercase", textAlign: "right" }}>Total</Text>
            </View>
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 4 }} />

            {settings.map((s, si) => (
              <View key={s.id} style={{ flexDirection: "row", marginBottom: 2, backgroundColor: si % 2 === 0 ? colors.cards : "transparent", paddingVertical: 2 }}>
                <Text style={{ flex: 2, fontSize: 9, color: colors.primaryText }}>{s.label}</Text>
                {yearlyData.map(y => (
                  <Text key={y.label} style={{ flex: 1, fontSize: 9, color: colors.secondary, textAlign: "right" }}>{fmt(y.bySettings[s.id]?.value || 0)}</Text>
                ))}
                <Text style={{ flex: 1, fontSize: 9, fontWeight: "bold", textAlign: "right" }}>
                  {fmt(yearlyData.reduce((sum, y) => sum + (y.bySettings[s.id]?.value || 0), 0))}
                </Text>
              </View>
            ))}

            <View style={{ borderBottomWidth: 2, borderBottomColor: colors.primaryText, marginVertical: 4 }} />
            <View style={{ flexDirection: "row", marginBottom: 2 }}>
              <Text style={{ flex: 2, fontSize: 9, fontWeight: "bold" }}>Total Value</Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 9, fontWeight: "bold", textAlign: "right" }}>{fmt(y.totalValue)}</Text>
              ))}
              <Text style={{ flex: 1, fontSize: 9, fontWeight: "bold", color: colors.primary, textAlign: "right" }}>{fmt(summary.termValue)}</Text>
            </View>

            <View style={{ flexDirection: "row", marginBottom: 1, paddingLeft: 8 }}>
              <Text style={{ flex: 2, fontSize: 7.5, color: colors.docBlue }}>Doc Quality (immediate)</Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 7.5, color: colors.tertiary, textAlign: "right" }}>{fmt(y.docValue)}</Text>
              ))}
              <Text style={{ flex: 1, fontSize: 7.5, color: colors.tertiary, textAlign: "right" }}>{fmt(totalDocValue)}</Text>
            </View>
            <View style={{ flexDirection: "row", marginBottom: 1, paddingLeft: 8 }}>
              <Text style={{ flex: 2, fontSize: 7.5, color: colors.timeRed }}>Capacity & Efficiency ({ONSET_DELAY_MONTHS.delayed}mo delay)</Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 7.5, color: colors.tertiary, textAlign: "right" }}>{fmt(y.timeValue)}</Text>
              ))}
              <Text style={{ flex: 1, fontSize: 7.5, color: colors.tertiary, textAlign: "right" }}>{fmt(totalTimeValue)}</Text>
            </View>
            <View style={{ flexDirection: "row", marginBottom: 2, paddingLeft: 8 }}>
              <Text style={{ flex: 2, fontSize: 7.5, color: colors.retentionAmber }}>Retention (phased)</Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 7.5, color: colors.tertiary, textAlign: "right" }}>{fmt(y.retentionValue)}</Text>
              ))}
              <Text style={{ flex: 1, fontSize: 7.5, color: colors.tertiary, textAlign: "right" }}>{fmt(totalRetentionValue)}</Text>
            </View>

            <View style={{ flexDirection: "row", marginBottom: 1, paddingLeft: 8 }}>
              <Text style={{ flex: 2, fontSize: 7.5, color: colors.tertiary }}>{settings.every(s => s.pricingModel === "perEncounter") ? "Contracted Encounters" : "Licensed Providers"}</Text>
              {yearlyData.map(y => {
                const allEnc = settings.every(s => s.pricingModel === "perEncounter");
                const total = allEnc
                  ? settings.reduce((sum, s) => sum + (y.bySettings[s.id]?.encounters || 0), 0)
                  : settings.reduce((sum, s) => sum + (y.bySettings[s.id]?.licensedProviders || 0), 0);
                return <Text key={y.label} style={{ flex: 1, fontSize: 7.5, color: colors.tertiary, textAlign: "right" }}>{fmtNum(total)}</Text>;
              })}
              <Text style={{ flex: 1, fontSize: 7.5, color: colors.tertiary, textAlign: "right" }}>
                {(() => {
                  const allEnc = settings.every(s => s.pricingModel === "perEncounter");
                  const last = yearlyData[yearlyData.length - 1];
                  return fmtNum(settings.reduce((sum, s) => sum + (allEnc ? (last?.bySettings[s.id]?.encounters || 0) : (last?.bySettings[s.id]?.licensedProviders || 0)), 0));
                })()}
              </Text>
            </View>
            <View style={{ flexDirection: "row", marginBottom: 2, paddingLeft: 8 }}>
              <Text style={{ flex: 2, fontSize: 7.5, color: colors.tertiary }}>{settings.every(s => s.pricingModel === "perEncounter") ? "Utilized Encounters" : settings.some(s => s.pricingModel === "perEncounter") ? "Active Volume" : "Actively Documenting"}</Text>
              {yearlyData.map(y => {
                const total = settings.reduce((sum, s) => sum + (y.bySettings[s.id]?.providers || 0), 0);
                return <Text key={y.label} style={{ flex: 1, fontSize: 7.5, color: colors.tertiary, textAlign: "right" }}>{fmtNum(total)}</Text>;
              })}
              <Text style={{ flex: 1, fontSize: 7.5, color: colors.tertiary, textAlign: "right" }}>
                {fmtNum(settings.reduce((sum, s) => sum + (yearlyData[yearlyData.length - 1]?.bySettings[s.id]?.providers || 0), 0))}
              </Text>
            </View>

            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 3 }} />
            <View style={{ flexDirection: "row", marginBottom: 2 }}>
              <Text style={{ flex: 2, fontSize: 9, color: colors.negative }}>Investment</Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 9, color: colors.negative, textAlign: "right" }}>({fmt(y.investment)})</Text>
              ))}
              <Text style={{ flex: 1, fontSize: 9, color: colors.negative, fontWeight: "bold", textAlign: "right" }}>({fmt(summary.termInvestment)})</Text>
            </View>

            <View style={{ borderBottomWidth: 2, borderBottomColor: colors.primaryText, marginVertical: 3 }} />
            <View style={{ flexDirection: "row" }}>
              <Text style={{ flex: 2, fontSize: 9, fontWeight: "bold" }}>Net Value</Text>
              {yearlyData.map(y => (
                <Text key={y.label} style={{ flex: 1, fontSize: 9, fontWeight: "bold", color: y.netValue >= 0 ? colors.positive : colors.negative, textAlign: "right" }}>
                  {y.netValue >= 0 ? fmt(y.netValue) : `(${fmt(Math.abs(y.netValue))})`}
                </Text>
              ))}
              <Text style={{ flex: 1, fontSize: 9, fontWeight: "bold", color: summary.termNet >= 0 ? colors.positive : colors.negative, textAlign: "right" }}>
                {summary.termNet >= 0 ? fmt(summary.termNet) : `(${fmt(Math.abs(summary.termNet))})`}
              </Text>
            </View>
          </View>

          {summary.paybackMonth && (
            <Text style={{ fontSize: 8, color: colors.tertiary, marginBottom: 4 }}>
              Payback period reflects the month in which cumulative net value turns positive, accounting for the {config.implementationRampMonths}-month implementation ramp and subscription costs from day one. Actual time to value may vary based on training completion, workflow integration, and provider adoption speed.
            </Text>
          )}

          <PageFooter pageNum={5} totalPages={TOTAL_PDF_PAGES} />
        </View>
      </Page>

      {/* PAGE 6: YEAR-BY-YEAR NARRATIVE */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>YEAR-BY-YEAR OUTLOOK</Text>
          <Text style={styles.sectionHeadline}>How the Deployment Unfolds</Text>
          <Text style={styles.body}>
            Each year of the partnership has a distinct character. Value compounds as adoption deepens, retention effects materialize, and the organization operationalizes freed-up capacity.
          </Text>

          {totalHoursSaved > 0 && (
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
              <View style={[styles.cardBg, { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 }]}>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary }}>{fmtNum(Math.round(totalHoursSaved))}</Text>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>annual hours returned{"\n"}to clinical care</Text>
              </View>
              <View style={[styles.cardBg, { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 }]}>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary }}>{allPerEncounter ? fmtNumShort(totalFullScaleEncounters) : fmtNum(totalFullScale)}</Text>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>{allPerEncounter ? "encounters" : (() => { const labels = Array.from(new Set(settings.map(s => unitLabel(s.careSetting)))); return labels.join(" and "); })()}{"\n"}at full scale</Text>
              </View>
              <View style={[styles.cardBg, { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 }]}>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary }}>{fmt(summary.runRateValue)}</Text>
                <Text style={{ fontSize: 8.5, color: colors.secondary }}>annual run-rate{"\n"}value at maturity</Text>
              </View>
            </View>
          )}

          {yearlyData.map((y, idx) => {
            const yearNum = idx + 1;
            const h = buildYearNarrative(idx, y);
            const totalLicensed = settings.reduce((sum, s) => sum + (y.bySettings[s.id]?.licensedProviders || 0), 0);
            const totalActive = settings.reduce((sum, s) => sum + (y.bySettings[s.id]?.providers || 0), 0);
            const totalYearEncounters = settings.reduce((sum, s) => sum + (y.bySettings[s.id]?.encounters || 0), 0);
            const adoptionPct = totalLicensed > 0 ? Math.round((totalActive / totalLicensed) * 100) : 0;
            const encUtilPct = totalYearEncounters > 0 ? Math.round((totalActive / totalYearEncounters) * 100) : 0;

            return (
              <View key={y.label} style={[styles.cardBg, { borderLeftWidth: 3, borderLeftColor: colors.primary, marginBottom: 8, padding: 12 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <View>
                    <Text style={{ fontSize: 8, color: colors.primary, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "bold" }}>YEAR {yearNum} ({y.label})</Text>
                    <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.primaryText, marginTop: 2 }}>{h.title}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primaryText }}>{fmt(y.totalValue)}</Text>
                    <Text style={{ fontSize: 7, color: colors.tertiary }}>projected value</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 6 }}>{h.desc}</Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View>
                    <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase" }}>{allPerEncounter ? "Contracted" : "Licensed"}</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold" }}>{allPerEncounter ? fmtNum(totalYearEncounters) : fmtNum(totalLicensed)}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase" }}>{allPerEncounter ? "Utilized" : "Active"}</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold" }}>{fmtNum(totalActive)}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase" }}>Adoption Rate</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold" }}>{allPerEncounter ? encUtilPct : adoptionPct}%</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase" }}>Investment</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold" }}>{fmt(y.investment)}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 7, color: colors.tertiary, textTransform: "uppercase" }}>Net</Text>
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: y.netValue >= 0 ? colors.positive : colors.negative }}>
                      {y.netValue >= 0 ? fmt(y.netValue) : `(${fmt(Math.abs(y.netValue))})`}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          {totalAllValue > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabelGray}>VALUE COMPOSITION</Text>
              <PDFProportionBar docPct={docPct} timePct={timePct} retPct={retPct} />
            </>
          )}

          <View style={styles.calloutBox}>
            <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>
              STRATEGIC OBSERVATION
            </Text>
            <Text style={{ fontSize: 10, color: colors.secondary, lineHeight: 1.5 }}>
              {(() => {
                const vtc = summary.valueToCost;
                const dominantDriver = docPct >= timePct && docPct >= retPct ? "documentation quality" : timePct >= retPct ? "capacity and efficiency" : "retention";
                const dominantPct = Math.max(docPct, timePct, retPct);
                const strengthPhrase = vtc >= 4 ? "exceptionally strong" : vtc >= 2.5 ? "compelling" : vtc >= 1.5 ? "favorable" : "positive";
                const paybackPhrase = summary.paybackMonth && summary.paybackMonth <= 6 ? ` The projected ${summary.paybackMonth}-month payback reflects rapid time-to-value.` : summary.paybackMonth && summary.paybackMonth <= 12 ? ` Payback within the first year reinforces the near-term financial case.` : "";

                if (settings.length === 1) {
                  return `This ${settingNames} deployment presents a ${strengthPhrase} financial case, with ${dominantDriver} representing ${dominantPct}% of total value. A single-setting model provides a focused proof of value ${"\u2014"} once outcomes are validated, this framework extends naturally to additional care settings.${paybackPhrase}`;
                }
                return `Across ${settings.length} care settings (${settingNames}), this model delivers a ${strengthPhrase} ${vtc.toFixed(1)}x return weighted toward ${dominantDriver} (${dominantPct}% of total value). The multi-setting approach diversifies value sources and strengthens the organizational case for investment.${paybackPhrase}`;
              })()}
            </Text>
          </View>

          <PageFooter pageNum={6} totalPages={TOTAL_PDF_PAGES} />
        </View>
      </Page>

      {/* PAGE 7: SENSITIVITY & RISK */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>SCENARIO ANALYSIS</Text>
          <Text style={styles.sectionHeadline}>Confidence Range & Cost of Delay</Text>
          <Text style={styles.body}>
            Robust financial planning accounts for variability. This section brackets the range of likely outcomes and quantifies the opportunity cost of deferred implementation.
          </Text>

          <Text style={styles.sectionLabelGray}>SENSITIVITY ANALYSIS</Text>
          <View style={[styles.cardBg, { padding: 12, marginBottom: 10 }]}>
            <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5, marginBottom: 8 }}>
              Scenarios vary only value realization rate (70%{"\u2013"}130%). Subscription cost is held constant {"\u2014"} it{"\u2019"}s contractual.
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 10, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginBottom: 2 }}>70% REALIZATION</Text>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primaryText }}>
                  {hasInvestment ? `${(summary.termValue * 0.7 / summary.termInvestment).toFixed(1)}x` : "N/A"}
                </Text>
                <Text style={{ fontSize: 7, color: colors.tertiary, marginTop: 2 }}>Conservative VTC</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 14, borderRadius: 3, alignItems: "center", borderBottomWidth: 2, borderBottomColor: colors.primary }}>
                <Text style={{ fontSize: 8, color: colors.primary, marginBottom: 4 }}>YOUR ASSUMPTIONS</Text>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary }}>{hasInvestment ? `${summary.valueToCost.toFixed(1)}x` : "N/A"}</Text>
                <Text style={{ fontSize: 7, color: colors.primary, marginTop: 4 }}>Base Case VTC</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 10, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginBottom: 2 }}>130% REALIZATION</Text>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.positive }}>
                  {hasInvestment ? `${(summary.termValue * 1.3 / summary.termInvestment).toFixed(1)}x` : "N/A"}
                </Text>
                <Text style={{ fontSize: 7, color: colors.positive, marginTop: 2 }}>Optimistic VTC</Text>
              </View>
            </View>
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabelGray}>COST OF INACTION</Text>
          <View style={[styles.cardBg, { padding: 12, marginBottom: 10 }]}>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 10, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primaryText }}>{fmtNum(Math.round(totalHoursSaved / 12))}</Text>
                <Text style={{ fontSize: 7.5, color: colors.tertiary, marginTop: 2, textAlign: "center" }}>provider hours freed monthly</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 10, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primaryText }}>{fmt(Math.round(summary.runRateValue / 12))}</Text>
                <Text style={{ fontSize: 7.5, color: colors.tertiary, marginTop: 2, textAlign: "center" }}>estimated monthly value deferred</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 10, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.primaryText }}>{fmtNum(Math.round(totalHoursSaved))}</Text>
                <Text style={{ fontSize: 7.5, color: colors.tertiary, marginTop: 2, textAlign: "center" }}>annual hours returned to care</Text>
              </View>
            </View>
            <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5 }}>
              Every month without implementation, {allPerEncounter ? "your organization defers" : `your ${(() => { const labels = Array.from(new Set(settings.map(s => unitLabel(s.careSetting)))); return labels.join(" and "); })()} spend`} {fmtNum(Math.round(totalHoursSaved / 12))} hours {allPerEncounter ? "of documentation time" : "on documentation"} that could be redirected to patient care {"\u2014"} representing {fmt(Math.round(summary.runRateValue / 12))} in deferred organizational value.
            </Text>
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabelGray}>MODEL CONFIDENCE</Text>
          {(() => {
            const strongItems: string[] = [];
            if (totalDocValue > 0) strongItems.push("Documentation quality");
            if (totalTimeValue > 0) strongItems.push("Capacity & efficiency");
            if (totalRetentionValue > 0) strongItems.push("Retention value");
            strongItems.push("Cost structure");
            strongItems.push("Adoption ramp");

            const weakItems: string[] = [];
            if (totalRetentionValue > 0) weakItems.push("Retention isolation");
            if (totalDocValue > 0) weakItems.push("Revenue realization");
            weakItems.push("Operational change");
            weakItems.push("Provider ramp smoothness");
            if (totalTimeValue === 0) weakItems.push("Capacity not modeled");
            if (totalRetentionValue === 0) weakItems.push("Retention not modeled");

            return (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={[styles.cardBg, { flex: 1 }]}>
                  <Text style={{ fontSize: 9, color: colors.positive, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>STRONGEST</Text>
                  <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.6 }}>
                    {strongItems.map(item => `\u2022 ${item}`).join("\n")}
                  </Text>
                </View>
                <View style={[styles.cardBg, { flex: 1 }]}>
                  <Text style={{ fontSize: 9, color: colors.negative, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: "bold" }}>WEAKEST</Text>
                  <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.6 }}>
                    {weakItems.map(item => `\u2022 ${item}`).join("\n")}
                  </Text>
                </View>
              </View>
            );
          })()}

          <PageFooter pageNum={7} totalPages={TOTAL_PDF_PAGES} />
        </View>
      </Page>

      {/* PAGE 8: METHODOLOGY & ASSUMPTIONS */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>METHODOLOGY & ASSUMPTIONS</Text>
          <Text style={styles.sectionHeadline}>Modeling Framework & Assumptions</Text>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>YOUR INPUTS</Text>
              {settingInputSummaries.map(({ setting: s, inputs }) => (
                <View key={s.id} style={{ marginBottom: 5 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: s.color || colors.primaryText, marginBottom: 1 }}>{s.label}</Text>
                  <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.5 }}>
                    {s.pricingModel === "perEncounter"
                      ? (() => {
                          const ye = s.yearlyEncounters ?? { year1: s.encounters, year2: s.encounters, year3: s.encounters };
                          return [
                            `Y1: ${fmtNum(ye.year1)}`,
                            contractYears >= 2 ? `Y2: ${fmtNum(ye.year2)}` : null,
                            contractYears >= 3 ? `Y3: ${fmtNum(ye.year3)}` : null,
                          ].filter(Boolean).join(" \u2192 ") + " encounters";
                        })()
                      : s.yearlyProviders
                      ? [
                          `Y1: ${s.yearlyProviders.year1}`,
                          contractYears >= 2 ? `Y2: ${s.yearlyProviders.year2}` : null,
                          contractYears >= 3 ? `Y3: ${s.yearlyProviders.year3}` : null,
                        ].filter(Boolean).join(" \u2192 ") + ` ${unitLabel(s.careSetting)}`
                      : `${s.providerCount} \u2192 ${s.fullScaleProviders || s.providerCount} ${unitLabel(s.careSetting)}`}{"\n"}
                    {(() => {
                      const yp = s.yearlyPricing;
                      const prices = yp ? [yp.year1, yp.year2, yp.year3].slice(0, Math.min(contractYears, 3)) : null;
                      const hasVaried = prices && prices.some(p => p !== prices[0]);
                      const suffix = s.pricingModel === "annualFlat" ? "/yr" : s.pricingModel === "perEncounter" ? "/enc" : `/${unitLabel(s.careSetting, false)}/mo`;
                      const defaultPrice = s.pricingModel === "annualFlat" ? (s.annualLicenseFee ?? 0) : s.pricingModel === "perEncounter" ? (s.costPerEncounter ?? 0) : s.costPerUnit;
                      if (hasVaried && prices) {
                        return prices.map((p, i) => `Y${i + 1}: ${fmtPrice(p)}`).join(" \u2192 ") + suffix;
                      }
                      return `${fmtPrice(prices?.[0] ?? defaultPrice)}${suffix}${s.pricingModel === "annualFlat" ? " flat" : ""}`;
                    })()}
                    {s.implementationFee > 0 ? ` \u00B7 ${fmt(s.implementationFee)} impl` : ""}
                  </Text>
                  {inputs.length > 0 && (
                    <Text style={{ fontSize: 7, color: colors.tertiary, lineHeight: 1.4, marginTop: 1 }}>{inputs.join(" \u00B7 ")}</Text>
                  )}
                </View>
              ))}
            </View>

            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>CALCULATION METHOD</Text>
              <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.8, marginBottom: 6 }}>
                Contract term: {termLabel} ({config.contractTermMonths} months){"\n"}
                Implementation ramp: {config.implementationRampMonths} months (gradual onset){"\n"}
                Utilization targets: {(() => {
                  if (anyPerEncounter) {
                    return settings.map(s => {
                      const yu = s.yearlyUtilization;
                      if (yu) {
                        return `${s.label}: ${[`${yu.year1}% Y1`, contractYears >= 2 ? `${yu.year2}% Y2` : null, contractYears >= 3 ? `${yu.year3}% Y3` : null].filter(Boolean).join(", ")}`;
                      }
                      return `${s.label}: ${s.utilizationPercent}%`;
                    }).join("; ");
                  }
                  const base = [
                    `${config.yearlyUtilization.year1}% Y1`,
                    contractYears >= 2 ? `${config.yearlyUtilization.year2}% Y2` : null,
                    contractYears >= 3 ? `${config.yearlyUtilization.year3}% Y3` : null,
                  ].filter(Boolean).join(", ");
                  const nursingNote = config.nursingYearlyUtilization && hasNursing
                    ? ` (Nursing: ${[config.nursingYearlyUtilization.year1, contractYears >= 2 ? config.nursingYearlyUtilization.year2 : null, contractYears >= 3 ? config.nursingYearlyUtilization.year3 : null].filter(v => v != null).join("/")}%)`
                    : "";
                  return base + nursingNote;
                })()}{"\n"}
                {allPerEncounter ? "Encounter expansion" : "Provider expansion"}: Per-year allocation{"\n"}
                Onset timing: Immediate / {ONSET_DELAY_MONTHS.delayed}mo delay / phased{"\n"}
                Retention phasing: {[
                  `${config.retentionPhasing.year1Pct}% Y1`,
                  contractYears >= 2 ? `${config.retentionPhasing.year2Pct}% Y2` : null,
                  contractYears >= 3 ? `${config.retentionPhasing.year3Pct}% Y3` : null,
                ].filter(Boolean).join(", ")}
              </Text>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>RETURN METHODOLOGY</Text>
              <Text style={{ fontSize: 8, color: colors.secondary, lineHeight: 1.5 }}>
                Value-to-Cost: total value / total cost.{"\n"}Simple ROI: net value / total cost.{"\n"}Payback: month cumulative net value turns positive.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabelGray}>DATA SOURCES</Text>
          <View style={[styles.cardBg, { marginBottom: 8 }]}>
            <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.6 }}>
              {"\u2022"} Capacity & efficiency: Informed by Abridge health system deployment experience and published time-motion research{"\n"}
              {"\u2022"} Industry benchmarks: MGMA, CMS, proprietary health system datasets{"\n"}
              {"\u2022"} Conservative design: Where uncertainty exists, conservative assumptions applied{"\n"}
              {"\u2022"} Retention: Delayed-onset, phased conservatively over {contractYears > 1 ? `${contractYears} years` : "the contract term"}
            </Text>
          </View>

          <Text style={styles.sectionLabelGray}>LIMITATIONS</Text>
          <View style={[styles.cardBg, { marginBottom: 8 }]}>
            <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.6 }}>
              This proforma is for financial planning purposes only. Projections are modeled estimates based on user-provided inputs and published benchmarks. Actual results will depend on implementation quality, organizational adoption, and operational factors unique to your environment. These projections do not constitute a guarantee of financial outcomes. We encourage validation of every assumption against organization-specific data.
            </Text>
          </View>

          <PageFooter pageNum={8} totalPages={TOTAL_PDF_PAGES} />
        </View>
      </Page>

      {/* PAGE 9: BACK COVER */}
      <Page size="LETTER" style={[styles.page, { padding: 0 }]} wrap={false}>
        <View style={{ position: "absolute", top: 0, left: 0, width: 300, height: 300 }}>
          <Svg width={300} height={300} viewBox="0 0 300 300">
            <Path
              d="M 0 300 Q 50 250 120 200 Q 190 150 240 80 Q 270 40 300 0"
              stroke={colors.primary}
              strokeWidth={80}
              fill="none"
              strokeOpacity={0.06}
              strokeLinecap="round"
            />
          </Svg>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 72 }}>
          <Image src={abridgeLogoRed} style={{ width: 140, marginBottom: 24 }} />

          <View style={{ borderTopWidth: 2, borderTopColor: colors.primary, width: 80, marginBottom: 24 }} />

          <Text style={{ fontSize: 14, color: colors.secondary, marginBottom: 6 }}>Prepared for</Text>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.primaryText, marginBottom: 24 }}>{organizationName || "Organization"}</Text>

          <Text style={{ fontSize: 10, color: colors.tertiary, marginBottom: 4 }}>{dateStr}</Text>
          {preparedBy && <Text style={{ fontSize: 10, color: colors.tertiary, marginBottom: 4 }}>Prepared by {preparedBy}</Text>}
          <Text style={{ fontSize: 10, color: colors.tertiary, marginBottom: 36 }}>{termLabel} Financial Proforma {"\u00B7"} {settingNames}</Text>

          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, width: "100%", marginBottom: 16 }} />

          <Text style={{ fontSize: 8, color: colors.tertiary, textAlign: "center", lineHeight: 1.6, maxWidth: 380 }}>
            This document contains confidential information prepared exclusively for the intended recipient. Projections are modeled estimates and do not constitute a guarantee of financial outcomes. {"\u00A9"} {today.getFullYear()} Abridge AI, Inc. All rights reserved.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateProformaPDF(
  settings: ProformaSettingSnapshot[],
  config: ProformaConfig,
  organizationName?: string,
  preparedBy?: string
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
  if (summary.paybackMonth) {
    const monthIdx = summary.paybackMonth - 1;
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + monthIdx, 1);
    const q = Math.floor(d.getMonth() / 3) + 1;
    const yr = String(d.getFullYear()).slice(-2);
    paybackQuarter = `Q${q} '${yr}`;
  }

  const blob = await pdf(
    <ProformaPDFDocument
      settings={settings}
      config={config}
      summary={summary}
      yearlyData={yearlyData}
      chartData={chartData}
      paybackQuarter={paybackQuarter}
      organizationName={organizationName}
      preparedBy={preparedBy}
    />
  ).toBlob();

  const sanitizedOrg = (organizationName || "Organization").replace(/[^a-zA-Z0-9]/g, "_");
  await savePdfBlob(blob, `Abridge_${sanitizedOrg}_Proforma.pdf`, `${organizationName || "Organization"} Proforma`);
}
