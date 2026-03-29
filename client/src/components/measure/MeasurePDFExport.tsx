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
import type { MeasureState, MeasureCareSetting } from "@/lib/measureCalculator";
import { getActiveMetrics, getMonthsFromGoLive, EM_TO_WRVU, CONFIDENCE_LABELS } from "@/lib/measureCalculator";
import {
  OUTPATIENT_METRICS,
  ED_METRICS,
  INPATIENT_METRICS,
  NURSING_METRICS,
  type MetricDefinition,
} from "@/lib/measureCareSettings";
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

const C = {
  bg: "#FFFFFF",
  card: "#F5F0EB",
  orange: "#EA2C00",
  dark: "#1A1A1A",
  mid: "#666666",
  muted: "#999999",
  border: "#E5E5E5",
  altRow: "#FAFAF8",
};

const s = StyleSheet.create({
  page: {
    padding: 54,
    paddingBottom: 50,
    fontFamily: "Manrope",
    fontSize: 10,
    color: C.dark,
    backgroundColor: C.bg,
  },
  wrap: { flex: 1, flexDirection: "column" },
  eyebrow: { fontSize: 8, color: C.orange, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 },
  headline: { fontSize: 20, fontWeight: "bold", color: C.dark, lineHeight: 1.2, marginBottom: 4 },
  subline: { fontSize: 9, color: C.muted, marginBottom: 14 },
  narrative: { fontSize: 10, color: C.mid, lineHeight: 1.65, marginBottom: 12 },
  rule: { borderBottomWidth: 1, borderBottomColor: C.border, marginVertical: 10 },
  card: { backgroundColor: C.card, borderRadius: 4, padding: 14, marginBottom: 8 },
  cardOutline: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 12, marginBottom: 8 },
  callout: { backgroundColor: C.card, borderLeftWidth: 3, borderLeftColor: C.orange, padding: 12, marginBottom: 8, borderRadius: 4 },
  footer: { marginTop: "auto", flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
  footerLeft: { fontSize: 9, color: C.orange, fontWeight: "bold" },
  footerCenter: { fontSize: 8, color: C.mid },
  footerRight: { fontSize: 8, color: C.muted },
  confHeader: { fontSize: 7.5, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, textAlign: "right", marginBottom: 14 },
  statRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: C.card, padding: 12, borderRadius: 4, alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "bold", color: C.dark, marginBottom: 2 },
  statLabel: { fontSize: 8, color: C.muted, textAlign: "center" },
  metricRowHeader: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 10, backgroundColor: C.card, borderBottomWidth: 2, borderBottomColor: C.border, alignItems: "center" },
  metricRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.border, alignItems: "flex-start" },
  mName: { fontSize: 10, fontWeight: "bold", color: C.dark, flex: 1 },
  mBefore: { fontSize: 10, color: C.mid, width: 72, textAlign: "right" },
  mArrow: { fontSize: 10, color: C.muted, width: 18, textAlign: "center" },
  mAfter: { fontSize: 10, fontWeight: "bold", color: C.dark, width: 72, textAlign: "right" },
  mDelta: { fontSize: 10, fontWeight: "bold", color: C.orange, width: 60, textAlign: "right" },
  finRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  finLabel: { fontSize: 11, fontWeight: "bold", color: C.dark, flex: 1 },
  finValue: { fontSize: 11, fontWeight: "bold", color: C.orange },
  finCat: { fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  finDetail: { fontSize: 9.5, color: C.mid, lineHeight: 1.5, marginBottom: 3 },
  finFormula: { fontSize: 8.5, color: C.mid, lineHeight: 1.5, backgroundColor: C.card, padding: 8, borderRadius: 3, marginBottom: 6 },
  signalCard: { backgroundColor: C.card, borderRadius: 4, padding: 12, marginBottom: 8 },
  signalDomain: { fontSize: 8, color: C.orange, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 },
  signalTitle: { fontSize: 10, fontWeight: "bold", color: C.dark, marginBottom: 4 },
  signalChange: { fontSize: 9, color: C.muted, marginBottom: 5 },
  signalText: { fontSize: 9.5, color: C.mid, lineHeight: 1.55 },
  pipRow: { flexDirection: "row", gap: 4, marginBottom: 8 },
  pip: { flex: 1, height: 4, borderRadius: 2, backgroundColor: C.border },
  pipOn: { flex: 1, height: 4, borderRadius: 2, backgroundColor: C.orange },
  bulletRow: { flexDirection: "row", gap: 8, marginBottom: 6, alignItems: "flex-start" },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.orange, marginTop: 3 },
  bulletText: { fontSize: 9.5, color: C.mid, flex: 1, lineHeight: 1.5 },
  methRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.border },
  methKey: { fontSize: 9, color: C.mid },
  methVal: { fontSize: 9, fontWeight: "bold", color: C.dark },
});

const ALL_METRICS: MetricDefinition[] = [
  ...OUTPATIENT_METRICS,
  ...ED_METRICS,
  ...INPATIENT_METRICS,
  ...NURSING_METRICS,
];
const METRIC_MAP = new Map<string, MetricDefinition>();
for (const m of ALL_METRICS) {
  if (!METRIC_MAP.has(m.id)) METRIC_MAP.set(m.id, m);
}

const FINANCIAL_IDS = new Set([
  "wrvu", "wrvuPerEncounter",
  "em_level", "emLevel",
  "caseMixIndex", "cmi", "cc_mcc_capture", "ccMccCaptureRate",
  "lwbsRate", "lwbs_rate",
  "initial_denial_rate", "initialDenialRate", "medicalNecessityDenialRate",
  "work_outside_work_empirical", "workAfterHours", "wow_time", "wowTime",
  "burnout_assessment", "burnoutAssessment",
  "likelihood_to_stay", "likelihoodToStay",
  "lengthOfStay", "length_of_stay", "alos",
  "patients_per_provider_month", "patientsPerProviderMonth",
  "agencyLocumSpend", "agency_locum_spend",
  "physician_retention", "physicianRetention",
]);

const DEFAULT_ASMP = {
  attribution: 62,
  realization: 80,
  conversionFactor: 33,
  otPremiumRate: 75,
  edRevenuePerVisit: 480,
  drgBaseRate: 6800,
  costPerBedDay: 2500,
  revenuePerVisit: 200,
};

function computeFinancials(state: MeasureState, streamStates?: Record<string, boolean>) {
  const activeSettings = state.activeCareSettings?.length
    ? state.activeCareSettings
    : [state.careSetting || "outpatient"];
  const setting = activeSettings[0];
  const isED = activeSettings.includes("ed");
  const isIP = activeSettings.includes("inpatient");
  const providers = state.deployment.providers || state.deployment.mruProviders || 0;
  const totalEncounters = state.deployment.totalEncounters || 0;
  const utilRate = state.deployment.utilizationRate || 0;
  const adopted = Math.round(totalEncounters * (utilRate / 100));
  const cf = state.calibration.conversionFactor || DEFAULT_ASMP.conversionFactor;
  const activeMetrics = getActiveMetrics(state);

  const attrMid = DEFAULT_ASMP.attribution / 100;
  const attrLo = Math.max(0.50, attrMid - 0.12);
  const attrHi = Math.min(0.75, attrMid + 0.12);
  const realLo = Math.max(0.40, DEFAULT_ASMP.realization / 100 - 0.10);
  const realHi = Math.min(0.99, DEFAULT_ASMP.realization / 100 + 0.10);

  let billLo = 0, billHi = 0;
  const billDetails: { label: string; formula: string }[] = [];

  for (const cs of activeSettings) {
    const sd = state.settingData?.[cs] || {};
    const sAdopted = sd.deploy_totalEncounters
      ? Math.round(sd.deploy_totalEncounters * (utilRate / 100))
      : adopted;

    const wrvuMetric = activeMetrics.find(m =>
      ['wrvu', 'wrvuPerEncounter'].includes(m.metricId) && (!m.setting || m.setting === cs)
    );
    const measuredWrvuD = wrvuMetric
      ? (wrvuMetric.after ?? 0) - (wrvuMetric.before ?? 0)
      : cs === setting ? (state.documentationQuality.wrvuWith - state.documentationQuality.wrvuWithout) : 0;

    const emMetric = activeMetrics.find(m =>
      ['em_level', 'emLevel'].includes(m.metricId) && (!m.setting || m.setting === cs)
    );
    const emB = emMetric
      ? (emMetric.before ?? 0)
      : cs === setting ? state.documentationQuality.emLevelWithout : 0;
    const emA = emMetric
      ? (emMetric.after ?? 0)
      : cs === setting ? state.documentationQuality.emLevelWith : 0;
    const impliedWrvuDelta = (EM_TO_WRVU[Math.round(emA)] ?? 0) - (EM_TO_WRVU[Math.round(emB)] ?? 0);

    const wrvuD = measuredWrvuD > 0 ? measuredWrvuD : Math.max(0, impliedWrvuDelta);
    const wrvuSource = measuredWrvuD > 0 ? 'measured' : (impliedWrvuDelta > 0 ? 'implied from E/M levels' : null);

    if (wrvuD > 0 && sAdopted > 0) {
      const base = wrvuD * sAdopted * cf;
      billLo += base * attrLo * realLo;
      billHi += base * attrHi * realHi;
      const sourceNote = wrvuSource === 'implied from E/M levels'
        ? ` (implied from E/M ${emB.toFixed(0)}\u2192${emA.toFixed(0)})`
        : '';
      billDetails.push({
        label: `wRVU lift: +${wrvuD.toFixed(2)} per encounter${sourceNote}${activeSettings.length > 1 ? ` (${settingShort(cs)})` : ''}`,
        formula: `+${wrvuD.toFixed(2)} wRVU \u00D7 ${fmtN(sAdopted)} encounters \u00D7 $${cf}/wRVU \u00D7 ${DEFAULT_ASMP.realization}% realization`,
      });
    }

    if (cs === 'inpatient') {
      const cmiB = sd.cmi_before ?? 0;
      const cmiA = sd.cmi_after ?? 0;
      const cmiD = Math.max(0, cmiA - cmiB);
      const discharges = sd.deploy_totalEncounters || totalEncounters;
      if (cmiD > 0 && discharges > 0) {
        const base = cmiD * discharges * DEFAULT_ASMP.drgBaseRate;
        billLo += base * attrLo * realLo;
        billHi += base * attrHi * realHi;
        billDetails.push({
          label: `CMI improvement: +${cmiD.toFixed(3)}`,
          formula: `+${cmiD.toFixed(3)} CMI \u00D7 ${fmtN(discharges)} discharges \u00D7 $${fmtN(DEFAULT_ASMP.drgBaseRate)} DRG base rate`,
        });
      }
    }
  }

  let recLo = 0, recHi = 0;
  const recDetails: { label: string; formula: string }[] = [];

  if (isED) {
    const edSD = state.settingData?.ed || {};
    const edEnc = edSD.deploy_totalEncounters || totalEncounters;
    const lwbsD = (edSD.lwbsRate_before ?? 0) - (edSD.lwbsRate_after ?? 0);
    if (lwbsD > 0 && edEnc > 0) {
      const annualVisits = edEnc * 12;
      const recovered = (lwbsD / 100) * annualVisits;
      recLo += recovered * DEFAULT_ASMP.edRevenuePerVisit * attrLo;
      recHi += recovered * DEFAULT_ASMP.edRevenuePerVisit * attrHi;
      recDetails.push({
        label: `LWBS reduction: \u2212${lwbsD.toFixed(1)} percentage points`,
        formula: `${lwbsD.toFixed(1)}pp \u00D7 ${fmtN(annualVisits)} annual visits \u00D7 $${DEFAULT_ASMP.edRevenuePerVisit}/visit`,
      });
    }
  }

  for (const cs of activeSettings) {
    const sd = state.settingData?.[cs] || {};
    const effectiveEnc = sd.deploy_totalEncounters || totalEncounters;

    const denialMetric = activeMetrics.find(m =>
      ['initialDenialRate', 'initial_denial_rate', 'medicalNecessityDenialRate', 'denialRate', 'claimDenialRate'].includes(m.metricId)
      && (!m.setting || m.setting === cs)
    );
    const denialB = denialMetric?.before ??
      (sd.initial_denial_rate_before ?? sd.medicalNecessityDenialRate_before ?? sd.denialRate_before ?? 0);
    const denialA = denialMetric?.after ??
      (sd.initial_denial_rate_after ?? sd.medicalNecessityDenialRate_after ?? sd.denialRate_after ?? 0);
    const denialD = denialB - denialA;
    if (denialD > 0 && effectiveEnc > 0) {
      const avgCost = cs === 'inpatient' ? 3_500 : cs === 'ed' ? 500 : 350;
      const base = (denialD / 100) * effectiveEnc * avgCost;
      recLo += base * attrLo;
      recHi += base * attrHi;
      recDetails.push({
        label: `Denial rate reduction: \u2212${denialD.toFixed(1)} pts${activeSettings.length > 1 ? ` (${settingShort(cs)})` : ''}`,
        formula: `${denialD.toFixed(1)}pp \u00D7 ${fmtN(effectiveEnc)} encounters \u00D7 $${avgCost.toLocaleString()}/denial`,
      });
    }
  }

  let pfLo = 0, pfHi = 0;
  const pfDetails: { label: string; formula: string }[] = [];
  if (isIP) {
    const ipData = state.settingData?.inpatient || {};
    const alosMetric = activeMetrics.find(m =>
      ['lengthOfStay', 'alos', 'averageLengthOfStay'].includes(m.metricId)
    );
    const alosBefore = alosMetric?.before ?? (ipData.lengthOfStay_before ?? 0);
    const alosAfter = alosMetric?.after ?? (ipData.lengthOfStay_after ?? 0);
    const alosD = Math.max(0, alosBefore - alosAfter);
    const ipEnc = ipData.deploy_totalEncounters || (activeSettings.length === 1 ? totalEncounters : 0);
    if (alosD > 0 && ipEnc > 0) {
      const costBase = alosD * ipEnc * DEFAULT_ASMP.costPerBedDay;
      pfLo += costBase * attrLo;
      pfHi += costBase * attrHi;
      pfDetails.push({
        label: `ALOS cost avoidance: ${alosBefore.toFixed(1)} \u2192 ${alosAfter.toFixed(1)} days`,
        formula: `${alosD.toFixed(1)} days \u00D7 ${fmtN(ipEnc)} admissions \u00D7 $${DEFAULT_ASMP.costPerBedDay.toLocaleString()}/bed day`,
      });

      const censusConstrained = state.censusConstrained ?? false;
      if (censusConstrained) {
        const revPerAdmission = 8000;
        const revBase = alosD * ipEnc * revPerAdmission * 0.3;
        pfLo += revBase * attrLo;
        pfHi += revBase * attrHi;
        pfDetails.push({
          label: `ALOS throughput revenue (census-constrained)`,
          formula: `${alosD.toFixed(1)} days \u00D7 ${fmtN(ipEnc)} \u00D7 $${revPerAdmission.toLocaleString()} \u00D7 30% refill`,
        });
      }
    }
  }

  let capLo = 0, capHi = 0;
  if (activeSettings.includes('outpatient')) {
    const patientsMetric = activeMetrics.find(m =>
      ['patients_per_provider_month', 'patientsPerProviderMonth'].includes(m.metricId)
    );
    if (patientsMetric && patientsMetric.before != null && patientsMetric.after != null) {
      const patientD = patientsMetric.after - patientsMetric.before;
      if (patientD > 0 && providers > 0) {
        const annualVisits = patientD * providers * 12;
        const base = annualVisits * DEFAULT_ASMP.revenuePerVisit;
        capLo = base * attrLo * realLo;
        capHi = base * attrHi * realHi;
      }
    }
  }

  let costLo = 0, costHi = 0;
  const costDetails: { label: string; formula: string }[] = [];

  const ahMetric = activeMetrics.find(m =>
    ['work_after_hours_perceived', 'workAfterHours', 'work_outside_work_empirical', 'afterHours', 'chartingAfterShift', 'afterHoursWork', 'workOutsideHours'].includes(m.metricId)
  );
  const ahWithout = ahMetric?.before ?? state.timeEfficiency.workOutsideWithout ?? 0;
  const ahWith = ahMetric?.after ?? state.timeEfficiency.workOutsideWith ?? 0;
  const ahDelta = Math.max(0, ahWithout - ahWith);
  const isHourlyWorkforce = activeSettings.includes('nursing');
  if (ahDelta > 0 && providers > 0) {
    const metricDef = ahMetric ? METRIC_MAP.get(ahMetric.metricId) : undefined;
    const metricUnit = metricDef?.unit || '';
    let hrsPerWeek: number;
    if (metricUnit === 'min' || metricUnit === 'min/day') {
      hrsPerWeek = (ahDelta / 60) * 5;
    } else if (metricUnit === 'hrs/wk' || metricUnit === 'min/wk') {
      hrsPerWeek = metricUnit === 'min/wk' ? ahDelta / 60 : ahDelta;
    } else {
      hrsPerWeek = ahDelta * 5;
    }
    if (isHourlyWorkforce) {
      const annual = hrsPerWeek * providers * DEFAULT_ASMP.otPremiumRate * 52;
      costLo += annual * attrLo;
      costHi += annual * attrHi;
      costDetails.push({
        label: `After-hours OT premium reduction: \u2212${ahDelta.toFixed(1)} ${metricUnit || 'hrs/day'}/provider`,
        formula: `${hrsPerWeek.toFixed(1)} hrs/wk \u00D7 ${providers} providers \u00D7 $${DEFAULT_ASMP.otPremiumRate}/hr OT \u00D7 52 wks`,
      });
    } else {
      costDetails.push({
        label: `After-hours documentation reduced: \u2212${ahDelta.toFixed(1)} ${metricUnit || 'hrs/day'}/provider`,
        formula: `${hrsPerWeek.toFixed(1)} hrs/wk recovered \u2192 tracked as wellbeing signal (physicians are salaried)`,
      });
    }
  }

  const agencyMetric = activeMetrics.find(m =>
    ['agencyLocumSpend', 'agency_locum_spend'].includes(m.metricId)
  );
  if (agencyMetric && agencyMetric.before != null && agencyMetric.after != null) {
    const agencySavings = Math.max(0, agencyMetric.before - agencyMetric.after);
    if (agencySavings > 0) {
      costLo += agencySavings * attrLo;
      costHi += agencySavings * attrHi;
      costDetails.push({
        label: `Agency/locum spend reduction: \u2212${fmtC(agencySavings)}`,
        formula: `Observed reduction ${fmtC(agencySavings)} \u00D7 ${DEFAULT_ASMP.attribution}% attribution`,
      });
    }
  }

  const mv = state.metricValues || {};
  let burnoutD = 0, stayD = 0;
  let retentionLo = 0, retentionHi = 0;
  for (const k of Object.keys(mv)) {
    const e = mv[k];
    if (!e || e.before == null || e.after == null) continue;
    if (k.startsWith("burnout") && e.before > e.after) burnoutD = Math.max(burnoutD, e.before - e.after);
    if (k.startsWith("likelihood") && e.after > e.before) stayD = Math.max(stayD, e.after - e.before);
  }
  const replacementRange: { low: number; high: number } = ({
    outpatient: { low: 300_000, high: 500_000 },
    ed:         { low: 350_000, high: 500_000 },
    inpatient:  { low: 300_000, high: 500_000 },
    nursing:    { low: 50_000,  high: 100_000 },
  } as Record<string, { low: number; high: number }>)[setting] ?? { low: 250_000, high: 400_000 };

  if (burnoutD > 0 || stayD > 0) {
    retentionLo = 1 * replacementRange.low * attrLo;
    retentionHi = 3 * replacementRange.high * attrHi;
    costLo += retentionLo;
    costHi += retentionHi;
    const signal = burnoutD > 0
      ? `Burnout score improved ${burnoutD.toFixed(0)} pts`
      : `Likelihood to stay improved ${stayD.toFixed(0)} pts`;
    costDetails.push({
      label: "Physician retention signal",
      formula: `${signal} \u2192 1\u20133 avoided departures \u00D7 ${fmtC(replacementRange.low)}\u2013${fmtC(replacementRange.high)} replacement cost`,
    });
  }

  const physRetMetric = activeMetrics.find(m =>
    ['physicianRetention', 'physician_retention'].includes(m.metricId)
  );
  if (physRetMetric && physRetMetric.before != null && physRetMetric.after != null) {
    const retD = physRetMetric.after - physRetMetric.before;
    if (retD > 0 && providers > 0) {
      const turnoversAvoided = (retD / 100) * providers;
      const newLo = turnoversAvoided * replacementRange.low * attrLo;
      const newHi = turnoversAvoided * replacementRange.high * attrHi;
      if (newLo > retentionLo) {
        costLo = costLo - retentionLo + newLo;
        costHi = costHi - retentionHi + newHi;
        costDetails.push({
          label: `Physician retention: +${retD} pts across ${providers} providers`,
          formula: `${turnoversAvoided.toFixed(1)} turnovers avoided \u00D7 ${fmtC(replacementRange.low)}\u2013${fmtC(replacementRange.high)} replacement cost`,
        });
      }
    }
  }

  if (streamStates) {
    if (streamStates.billingCapture === false) { billLo = 0; billHi = 0; }
    if (streamStates.revenueRecovery === false) { recLo = 0; recHi = 0; }
    if (streamStates.patientFlow === false) { pfLo = 0; pfHi = 0; }
    if (streamStates.capacityRevenue === false) { capLo = 0; capHi = 0; }
    if (streamStates.costReduction === false) { costLo = 0; costHi = 0; }
  }

  const totalLo = billLo + recLo + pfLo + capLo + costLo;
  const totalHi = billHi + recHi + pfHi + capHi + costHi;

  const enabledStreams: string[] = [];
  const excludedStreams: string[] = [];
  const streamLabels: Record<string, string> = {
    billingCapture: 'Billing Capture',
    revenueRecovery: 'Revenue Recovery',
    patientFlow: 'Patient Flow',
    capacityRevenue: 'Capacity Revenue',
    costReduction: 'Cost Reduction',
  };
  if (streamStates) {
    for (const [k, label] of Object.entries(streamLabels)) {
      if (streamStates[k] === false) excludedStreams.push(label);
      else enabledStreams.push(label);
    }
  }

  return {
    hasBill: billLo > 0, billLo, billHi, billDetails,
    hasRec: recLo > 0, recLo, recHi, recDetails,
    hasPF: pfLo > 0, pfLo, pfHi, pfDetails,
    hasCap: capLo > 0, capLo, capHi,
    hasCost: costLo > 0, costLo, costHi, costDetails,
    totalLo, totalHi, totalMid: Math.round((totalLo + totalHi) / 2), hasAny: totalLo > 0,
    attrRange: `${Math.round(attrLo * 100)}\u2013${Math.round(attrHi * 100)}%`,
    enabledStreams,
    excludedStreams,
  };
}

function fmtC(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}
function fmtRange(lo: number, hi: number): string {
  const a = fmtC(lo), b = fmtC(hi);
  return a === b ? a : `${a} \u2013 ${b}`;
}
function fmtN(n: number): string { return Math.round(n).toLocaleString(); }
function fmtDelta(before: number, after: number, unit: string): string {
  const d = after - before;
  const sign = d > 0 ? "+" : "";
  const val = Math.abs(d) < 10 ? d.toFixed(2) : Math.round(d).toString();
  const suffix = unit === "%" ? "pp" : ` ${unit}`;
  const pctStr = before !== 0 ? ` (${sign}${Math.round((d / before) * 100)}%)` : "";
  return `${sign}${val}${suffix}${pctStr}`;
}
function settingShort(sv: MeasureCareSetting | string): string {
  if (sv === "ed") return "ED";
  if (sv === "inpatient") return "IP";
  if (sv === "nursing") return "NR";
  return "OP";
}
function settingFull(sv: string): string {
  if (sv === "ed") return "Emergency Department";
  if (sv === "inpatient") return "Inpatient";
  if (sv === "nursing") return "Nursing";
  return "Outpatient";
}

const Conf = ({ org }: { org: string }) => (
  <Text style={s.confHeader}>Confidential \u2014 Prepared for {org}</Text>
);

const Footer = ({ n, total, org }: { n: number; total: number; org: string }) => (
  <View style={s.footer}>
    <Text style={s.footerLeft}>ABRIDGE</Text>
    <Text style={s.footerCenter}>{org} \u00B7 Executive Business Review</Text>
    <Text style={s.footerRight}>Page {n} of {total}</Text>
  </View>
);

const MeasureEBR = ({ state }: { state: MeasureState }) => {
  const orgName = state.deployment.organizationName || "Your Organization";
  const months = getMonthsFromGoLive(state.goLiveDate, state.deployment.monthsOnAbridge);
  const providers = state.deployment.providers || state.deployment.mruProviders || 0;
  const totalProviders = state.deployment.totalProviders || providers;
  const totalEncounters = state.deployment.totalEncounters || 0;
  const utilRate = state.deployment.utilizationRate || 0;
  const adopted = Math.round(totalEncounters * (utilRate / 100));
  const activeCareSettings = state.activeCareSettings?.length
    ? state.activeCareSettings
    : [state.careSetting || "outpatient"];
  const settingLabel = activeCareSettings.map(settingFull).join(" \u00B7 ");

  const activeMetrics = getActiveMetrics(state);
  const signalMetrics = activeMetrics.filter((m) => !FINANCIAL_IDS.has(m.metricId));
  const fin = computeFinancials(state, state.streamStates);

  const hasMetrics = activeMetrics.length > 0;
  const hasFinancials = fin.hasAny;
  const hasSignals = signalMetrics.length > 0;

  const TOTAL = 4 + (hasFinancials ? 1 : 0) + (hasSignals ? 1 : 0);
  let pageN = 0;
  const P = () => ++pageN;

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const activeDomains = new Set(
    activeMetrics.map((m) => METRIC_MAP.get(m.metricId)?.domain).filter(Boolean)
  ).size;

  let maturityIdx = 0;
  if (utilRate >= 20 && activeMetrics.length >= 1) maturityIdx = 1;
  if (activeDomains >= 3 && utilRate >= 60) maturityIdx = 2;
  if (activeDomains >= 4 && utilRate >= 70 && hasFinancials) maturityIdx = 3;
  const maturityLabels = ["Unmeasured", "Signaling", "Validated", "Strategic"];
  const maturityDescs = [
    "Adoption is still ramping or baselines haven\u2019t been established yet.",
    "One or two domains are showing before/after trends. Baselines are confirmed.",
    "Three or more domains have confirmed trends with at least 60% utilization.",
    "Abridge is embedded in organizational strategy with board-ready proof.",
  ];

  return (
    <Document>
      <PDFCoverPage
        reportLabel="Executive Business Review"
        title={orgName}
        subtitle={`${providers} providers \u00B7 ${months} months \u00B7 ${settingLabel}`}
        preparedBy="Abridge Partner Success"
        disclaimerText="This EBR reflects actual deployment data and Abridge methodology. Estimates are ranges, not audited projections. See the methodology page for full assumptions and limitations."
      />

      {/* PAGE 1: Partnership */}
      <Page size="LETTER" style={s.page} wrap={false}>
        <View style={s.wrap}>
          <Conf org={orgName} />
          <Text style={s.eyebrow}>Your Partnership</Text>
          <Text style={s.headline}>Abridge at {orgName}</Text>
          <Text style={s.subline}>{settingLabel} \u00B7 {months} months since go-live \u00B7 Generated {today}</Text>

          <View style={s.statRow}>
            <View style={s.statCard}>
              <Text style={s.statNum}>{providers}</Text>
              <Text style={s.statLabel}>Providers on Abridge</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum}>{totalProviders}</Text>
              <Text style={s.statLabel}>Total Providers</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum}>{utilRate}%</Text>
              <Text style={s.statLabel}>Utilization Rate</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum}>{fmtN(adopted)}</Text>
              <Text style={s.statLabel}>Adopted Encounters</Text>
            </View>
          </View>

          <View style={s.callout}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: C.dark, marginBottom: 4 }}>A note on methodology</Text>
            <Text style={{ fontSize: 9, color: C.mid, lineHeight: 1.55 }}>
              All financial estimates in this report use an attribution range of {fin.attrRange} and a realization rate of {DEFAULT_ASMP.realization}%.
              These reflect the portion of observed improvement we attribute to Abridge and the share of theoretical value typically captured in practice.
              Where before/after data exists, we use the observed delta. Where only directional signals exist (e.g., burnout scores), we apply published benchmark ranges.
            </Text>
          </View>

          <Text style={s.narrative}>
            {orgName} has deployed Abridge across {providers} providers in {settingLabel.toLowerCase()},
            achieving {utilRate}% utilization over {months} months. This review summarizes
            {hasMetrics ? ` ${activeMetrics.length} tracked metric${activeMetrics.length > 1 ? "s" : ""}` : " the deployment"}{" "}
            and{hasFinancials ? " quantifies the financial impact of observed improvements." : " outlines the path to measurable financial impact."}
          </Text>

          <Footer n={P()} total={TOTAL} org={orgName} />
        </View>
      </Page>

      {/* PAGE 2: What Your Data Shows */}
      <Page size="LETTER" style={s.page} wrap={false}>
        <View style={s.wrap}>
          <Conf org={orgName} />
          <Text style={s.eyebrow}>Measurement</Text>
          <Text style={s.headline}>What Your Data Shows</Text>
          <Text style={s.subline}>{activeMetrics.length} metric{activeMetrics.length !== 1 ? "s" : ""} tracked across {activeDomains} domain{activeDomains !== 1 ? "s" : ""}</Text>

          <View style={s.metricRowHeader}>
            <Text style={[s.mName, { fontSize: 8, textTransform: "uppercase" as const, letterSpacing: 1 }]}>Metric</Text>
            <Text style={[s.mBefore, { fontSize: 8, textTransform: "uppercase" as const, letterSpacing: 1 }]}>Before</Text>
            <Text style={[s.mArrow, { fontSize: 8 }]}></Text>
            <Text style={[s.mAfter, { fontSize: 8, textTransform: "uppercase" as const, letterSpacing: 1 }]}>After</Text>
            <Text style={[s.mDelta, { fontSize: 8, textTransform: "uppercase" as const, letterSpacing: 1 }]}>Change</Text>
          </View>

          {activeMetrics.map((am, idx) => {
            const def = METRIC_MAP.get(am.metricId);
            const label = def?.label || am.metricId;
            const unit = def?.unit || "";
            const hasBoth = am.before != null && am.after != null;
            const settingTag = am.setting && activeCareSettings.length > 1 ? ` (${settingShort(am.setting)})` : "";

            return (
              <View key={`${am.metricId}-${am.setting}-${idx}`} style={[s.metricRow, idx % 2 === 1 ? { backgroundColor: C.altRow } : {}]}>
                <Text style={s.mName}>{label}{settingTag}</Text>
                <Text style={s.mBefore}>{hasBoth ? `${am.before}${unit === "%" ? "%" : ` ${unit}`}` : "\u2014"}</Text>
                <Text style={s.mArrow}>{hasBoth ? "\u2192" : ""}</Text>
                <Text style={s.mAfter}>{hasBoth ? `${am.after}${unit === "%" ? "%" : ` ${unit}`}` : (am.after != null ? `${am.after}${unit === "%" ? "%" : ` ${unit}`}` : "\u2014")}</Text>
                <Text style={s.mDelta}>{hasBoth ? fmtDelta(am.before!, am.after!, unit) : ""}</Text>
              </View>
            );
          })}

          <Footer n={P()} total={TOTAL} org={orgName} />
        </View>
      </Page>

      {/* PAGE 3: Financial Impact (conditional) */}
      {hasFinancials && (
        <Page size="LETTER" style={s.page} wrap={false}>
          <View style={s.wrap}>
            <Conf org={orgName} />
            <Text style={s.eyebrow}>Financial Impact</Text>
            <Text style={s.headline}>Estimated Annual Value</Text>

            <View style={[s.card, { alignItems: "center", paddingVertical: 20, marginBottom: 16 }]}>
              <Text style={{ fontSize: 28, fontWeight: "bold", color: C.orange }}>{fmtRange(Math.round(fin.totalLo), Math.round(fin.totalHi))}</Text>
              <Text style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{CONFIDENCE_LABELS[maturityLabels[maturityIdx].toLowerCase()] || 'Estimate'} (attribution: {fin.attrRange})</Text>
            </View>

            {(state.deployment.annualContractValue ?? 0) > 0 && fin.totalMid > 0 && (
              <View style={[s.card, { flexDirection: "row", justifyContent: "space-around", paddingVertical: 14, marginBottom: 14, backgroundColor: "#1A1A1A" }]}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 18, fontWeight: "bold", color: C.orange }}>{(fin.totalMid / (state.deployment.annualContractValue || 1)).toFixed(1)}\u00D7</Text>
                  <Text style={{ fontSize: 8, color: "#FFFFFF80", marginTop: 2 }}>ROI ratio</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 18, fontWeight: "bold", color: "#FFFFFF" }}>{Math.round((state.deployment.annualContractValue || 0) / (fin.totalMid / 12))}mo</Text>
                  <Text style={{ fontSize: 8, color: "#FFFFFF80", marginTop: 2 }}>Payback period</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 18, fontWeight: "bold", color: "#FFFFFF" }}>{fmtC(fin.totalMid - (state.deployment.annualContractValue || 0))}</Text>
                  <Text style={{ fontSize: 8, color: "#FFFFFF80", marginTop: 2 }}>Net value</Text>
                </View>
              </View>
            )}

            {fin.excludedStreams.length > 0 && (
              <View style={{ marginBottom: 14, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#FAF8F5", borderRadius: 6 }}>
                <Text style={{ fontSize: 8, fontWeight: "bold", color: C.dark, marginBottom: 4 }}>What&apos;s Included</Text>
                {fin.enabledStreams.length > 0 && (
                  <Text style={{ fontSize: 7, color: C.muted }}>{fin.enabledStreams.join(" \u00B7 ")}</Text>
                )}
                <Text style={{ fontSize: 7, color: C.muted, marginTop: 2 }}>Excluded by reviewer: {fin.excludedStreams.join(", ")}</Text>
              </View>
            )}

            {fin.hasBill && (
              <View style={{ marginBottom: 14 }}>
                <Text style={s.finCat}>Billing Capture</Text>
                <View style={s.finRow}>
                  <Text style={s.finLabel}>Total billing capture</Text>
                  <Text style={s.finValue}>{fmtRange(Math.round(fin.billLo), Math.round(fin.billHi))} / yr</Text>
                </View>
                {fin.billDetails.map((d, i) => (
                  <View key={i}>
                    <Text style={s.finDetail}>{d.label}</Text>
                    <Text style={s.finFormula}>{d.formula}</Text>
                  </View>
                ))}
              </View>
            )}

            {fin.hasRec && (
              <View style={{ marginBottom: 14 }}>
                <Text style={s.finCat}>Revenue Recovery</Text>
                <View style={s.finRow}>
                  <Text style={s.finLabel}>Total revenue recovery</Text>
                  <Text style={s.finValue}>{fmtRange(Math.round(fin.recLo), Math.round(fin.recHi))} / yr</Text>
                </View>
                {fin.recDetails.map((d, i) => (
                  <View key={i}>
                    <Text style={s.finDetail}>{d.label}</Text>
                    <Text style={s.finFormula}>{d.formula}</Text>
                  </View>
                ))}
              </View>
            )}

            {fin.hasPF && (
              <View style={{ marginBottom: 14 }}>
                <Text style={s.finCat}>Patient Flow</Text>
                <View style={s.finRow}>
                  <Text style={s.finLabel}>ALOS bed day savings</Text>
                  <Text style={s.finValue}>{fmtRange(Math.round(fin.pfLo), Math.round(fin.pfHi))} / yr</Text>
                </View>
                {fin.pfDetails.map((d, i) => (
                  <View key={i}>
                    <Text style={s.finDetail}>{d.label}</Text>
                    <Text style={s.finFormula}>{d.formula}</Text>
                  </View>
                ))}
              </View>
            )}

            {fin.hasCap && (
              <View style={{ marginBottom: 14 }}>
                <Text style={s.finCat}>Capacity Revenue</Text>
                <View style={s.finRow}>
                  <Text style={s.finLabel}>Outpatient capacity revenue</Text>
                  <Text style={s.finValue}>{fmtRange(Math.round(fin.capLo), Math.round(fin.capHi))} / yr</Text>
                </View>
              </View>
            )}

            {fin.hasCost && (
              <View style={{ marginBottom: 14 }}>
                <Text style={s.finCat}>Actual Cost Reduction</Text>
                <View style={s.finRow}>
                  <Text style={s.finLabel}>Total cost reduction</Text>
                  <Text style={s.finValue}>{fmtRange(Math.round(fin.costLo), Math.round(fin.costHi))} / yr</Text>
                </View>
                {fin.costDetails.map((d, i) => (
                  <View key={i}>
                    <Text style={s.finDetail}>{d.label}</Text>
                    <Text style={s.finFormula}>{d.formula}</Text>
                  </View>
                ))}
              </View>
            )}

            <Footer n={P()} total={TOTAL} org={orgName} />
          </View>
        </Page>
      )}

      {/* PAGE 4: Signals Worth Watching (conditional) */}
      {hasSignals && (
        <Page size="LETTER" style={s.page} wrap={false}>
          <View style={s.wrap}>
            <Conf org={orgName} />
            <Text style={s.eyebrow}>Beyond the Numbers</Text>
            <Text style={s.headline}>Signals Worth Watching</Text>
            <Text style={s.subline}>These metrics don't directly feed a financial formula, but they tell the story of how Abridge is changing care delivery.</Text>

            {signalMetrics.map((sm, i) => {
              const def = METRIC_MAP.get(sm.metricId);
              if (!def) return null;
              const hasBoth = sm.before != null && sm.after != null;
              return (
                <View key={i} style={s.signalCard}>
                  <Text style={s.signalDomain}>{def.domain}</Text>
                  <Text style={s.signalTitle}>{def.label}</Text>
                  {hasBoth && (
                    <Text style={s.signalChange}>
                      {sm.before}{def.unit === "%" ? "%" : ` ${def.unit}`} \u2192 {sm.after}{def.unit === "%" ? "%" : ` ${def.unit}`}
                      {" "}({fmtDelta(sm.before!, sm.after!, def.unit)})
                    </Text>
                  )}
                  <Text style={s.signalText}>{def.whyItMatters}</Text>
                </View>
              );
            })}

            <Footer n={P()} total={TOTAL} org={orgName} />
          </View>
        </Page>
      )}

      {/* PAGE 5: Maturity & What's Next */}
      <Page size="LETTER" style={s.page} wrap={false}>
        <View style={s.wrap}>
          <Conf org={orgName} />
          <Text style={s.eyebrow}>Maturity</Text>
          <Text style={s.headline}>Where You Are &amp; What{"\u2019"}s Next</Text>

          <View style={s.card}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: C.dark, marginBottom: 6 }}>Measurement Maturity</Text>
            <View style={s.pipRow}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={i <= maturityIdx ? s.pipOn : s.pip} />
              ))}
            </View>
            <Text style={{ fontSize: 12, fontWeight: "bold", color: C.orange, marginBottom: 4 }}>{maturityLabels[maturityIdx]}</Text>
            <Text style={{ fontSize: 9, color: C.mid, lineHeight: 1.5 }}>{maturityDescs[maturityIdx]}</Text>
          </View>

          <View style={s.rule} />
          <Text style={{ fontSize: 11, fontWeight: "bold", color: C.dark, marginBottom: 8 }}>Recommended Next Moves</Text>

          {[
            {
              text: maturityIdx < 2
                ? `Increase utilization from ${utilRate}% toward 60%+ to unlock validated measurement across more domains.`
                : `Sustain ${utilRate}% utilization and extend measurement to remaining domains.`,
            },
            {
              text: hasFinancials
                ? "Socialize this financial impact report with finance and operational leaders to build board-level awareness."
                : "Focus on capturing before/after data in revenue and quality domains to enable financial quantification.",
            },
            {
              text: activeCareSettings.length < 3
                ? `Expand Abridge to additional care settings beyond ${settingLabel.toLowerCase()} to capture organization-wide value.`
                : "Deepen measurement in each care setting by adding setting-specific metrics (CMI for inpatient, LWBS for ED).",
            },
            {
              text: "Schedule a follow-up EBR in 90 days to track trend lines and refine financial attribution as more data accumulates.",
            },
          ].map((item, i) => (
            <View key={i} style={s.bulletRow}>
              <View style={s.bullet} />
              <Text style={s.bulletText}>{item.text}</Text>
            </View>
          ))}

          <Footer n={P()} total={TOTAL} org={orgName} />
        </View>
      </Page>

      {/* PAGE 6: Methodology */}
      <Page size="LETTER" style={s.page} wrap={false}>
        <View style={s.wrap}>
          <Conf org={orgName} />
          <Text style={s.eyebrow}>Methodology</Text>
          <Text style={s.headline}>How We Calculate Value</Text>
          <Text style={s.subline}>Transparency is core to the Abridge measurement philosophy.</Text>

          <View style={s.card}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: C.dark, marginBottom: 8 }}>Attribution Model</Text>
            <Text style={{ fontSize: 9, color: C.mid, lineHeight: 1.55 }}>
              We apply a conservative attribution range ({fin.attrRange}) to all financial calculations.
              This reflects our assessment that Abridge is one contributor among many to observed improvements.
              The range accounts for secular trends, concurrent initiatives, and natural variance.
            </Text>
          </View>

          <Text style={{ fontSize: 10, fontWeight: "bold", color: C.dark, marginTop: 10, marginBottom: 6 }}>Assumptions</Text>
          {[
            { k: "Attribution range", v: fin.attrRange },
            { k: "Realization rate", v: `${DEFAULT_ASMP.realization}%` },
            { k: "Conversion factor ($/wRVU)", v: `$${DEFAULT_ASMP.conversionFactor}` },
            { k: "OT premium rate", v: `$${DEFAULT_ASMP.otPremiumRate}/hr` },
            { k: "ED revenue per visit", v: `$${DEFAULT_ASMP.edRevenuePerVisit}` },
            { k: "DRG base rate", v: `$${fmtN(DEFAULT_ASMP.drgBaseRate)}` },
            { k: "Cost per bed day", v: `$${fmtN(DEFAULT_ASMP.costPerBedDay)}` },
            { k: "Revenue per visit (OP)", v: `$${DEFAULT_ASMP.revenuePerVisit}` },
            { k: "Adopted encounters", v: `${fmtN(adopted)} (${utilRate}% of ${fmtN(totalEncounters)})` },
          ].map((row, i) => (
            <View key={i} style={s.methRow}>
              <Text style={s.methKey}>{row.k}</Text>
              <Text style={s.methVal}>{row.v}</Text>
            </View>
          ))}

          <View style={[s.callout, { marginTop: 14 }]}>
            <Text style={{ fontSize: 9, fontWeight: "bold", color: C.dark, marginBottom: 4 }}>What we don{"\u2019"}t count</Text>
            <Text style={{ fontSize: 9, color: C.mid, lineHeight: 1.55 }}>
              Provider satisfaction and intent to stay, recruitment advantage ("{"\u201C"}physicians ask about Abridge{"\u201D"}),
              reduced administrative backlog and prior auth delays, and audit readiness / documentation defensibility.
              These are real but difficult to isolate financially. We mention them but do not include them in any dollar estimate.
            </Text>
          </View>

          <Footer n={P()} total={TOTAL} org={orgName} />
        </View>
      </Page>
    </Document>
  );
};

export async function generateMeasurePDF(state: MeasureState): Promise<void> {
  const doc = <MeasureEBR state={state} />;
  const blob = await pdf(doc).toBlob();
  const orgName = state.deployment.organizationName || "EBR";
  const dateStr = new Date().toISOString().slice(0, 10);
  await savePdfBlob(blob, `${orgName.replace(/\s+/g, "-")}_EBR_${dateStr}.pdf`);
}
