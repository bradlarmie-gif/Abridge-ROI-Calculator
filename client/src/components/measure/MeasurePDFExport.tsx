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
  const multiSetting = activeSettings.length > 1;

  const providerSettings = activeSettings.filter(s => s !== 'nursing');
  const providerSettingCount = Math.max(1, providerSettings.length);

  const resolveSettingCounts = (s: MeasureCareSetting | string) => {
    const sData = state.settingData?.[s as MeasureCareSetting] || {};
    const splitCount = s === 'nursing' ? 1 : providerSettingCount;
    const sProviders = sData.deploy_providers
      ?? (multiSetting ? Math.round(providers / splitCount) : providers);
    const sEncounters = sData.deploy_totalEncounters
      ?? (multiSetting ? Math.round(totalEncounters / splitCount) : totalEncounters);
    const sAdopted = Math.round(sEncounters * (utilRate / 100));
    return { sProviders, sEncounters, sAdopted };
  };

  const pdfSettingTotals: Record<string, { providers: number; encounters: number; low: number; high: number }> = {};
  for (const s of activeSettings) {
    const { sProviders, sEncounters } = resolveSettingCounts(s);
    pdfSettingTotals[s] = { providers: sProviders, encounters: sEncounters, low: 0, high: 0 };
  }

  let billLo = 0, billHi = 0;
  const billDetails: { label: string; formula: string }[] = [];

  for (const cs of activeSettings) {
    const sd = state.settingData?.[cs] || {};
    const { sAdopted } = resolveSettingCounts(cs);

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
      const lo = base * attrLo * realLo;
      const hi = base * attrHi * realHi;
      billLo += lo;
      billHi += hi;
      if (pdfSettingTotals[cs]) { pdfSettingTotals[cs].low += lo; pdfSettingTotals[cs].high += hi; }
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
      const discharges = sd.deploy_totalEncounters || resolveSettingCounts(cs).sEncounters;
      if (cmiD > 0 && discharges > 0) {
        const base = cmiD * discharges * DEFAULT_ASMP.drgBaseRate;
        const cLo = base * attrLo * realLo;
        const cHi = base * attrHi * realHi;
        billLo += cLo;
        billHi += cHi;
        if (pdfSettingTotals[cs]) { pdfSettingTotals[cs].low += cLo; pdfSettingTotals[cs].high += cHi; }
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
    const edEnc = edSD.deploy_totalEncounters || resolveSettingCounts('ed').sEncounters;
    const lwbsD = (edSD.lwbsRate_before ?? 0) - (edSD.lwbsRate_after ?? 0);
    if (lwbsD > 0 && edEnc > 0) {
      const annualVisits = edEnc * 12;
      const recovered = (lwbsD / 100) * annualVisits;
      const lwLo = recovered * DEFAULT_ASMP.edRevenuePerVisit * attrLo;
      const lwHi = recovered * DEFAULT_ASMP.edRevenuePerVisit * attrHi;
      recLo += lwLo;
      recHi += lwHi;
      if (pdfSettingTotals.ed) { pdfSettingTotals.ed.low += lwLo; pdfSettingTotals.ed.high += lwHi; }
      recDetails.push({
        label: `LWBS reduction: \u2212${lwbsD.toFixed(1)} percentage points`,
        formula: `${lwbsD.toFixed(1)}pp \u00D7 ${fmtN(annualVisits)} annual visits \u00D7 $${DEFAULT_ASMP.edRevenuePerVisit}/visit`,
      });
    }
  }

  for (const cs of activeSettings) {
    const sd = state.settingData?.[cs] || {};
    const effectiveEnc = sd.deploy_totalEncounters || resolveSettingCounts(cs).sEncounters;

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
      const dLo = base * attrLo;
      const dHi = base * attrHi;
      recLo += dLo;
      recHi += dHi;
      if (pdfSettingTotals[cs]) { pdfSettingTotals[cs].low += dLo; pdfSettingTotals[cs].high += dHi; }
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
    const ipEnc = ipData.deploy_totalEncounters || resolveSettingCounts('inpatient').sEncounters;
    if (alosD > 0 && ipEnc > 0) {
      const costBase = alosD * ipEnc * DEFAULT_ASMP.costPerBedDay;
      const acLo = costBase * attrLo;
      const acHi = costBase * attrHi;
      pfLo += acLo;
      pfHi += acHi;
      if (pdfSettingTotals.inpatient) { pdfSettingTotals.inpatient.low += acLo; pdfSettingTotals.inpatient.high += acHi; }
      pfDetails.push({
        label: `ALOS cost avoidance: ${alosBefore.toFixed(1)} \u2192 ${alosAfter.toFixed(1)} days`,
        formula: `${alosD.toFixed(1)} days \u00D7 ${fmtN(ipEnc)} admissions \u00D7 $${DEFAULT_ASMP.costPerBedDay.toLocaleString()}/bed day`,
      });

      const censusConstrained = state.censusConstrained ?? false;
      if (censusConstrained) {
        const revPerAdmission = 8000;
        const revBase = alosD * ipEnc * revPerAdmission * 0.3;
        const rvLo = revBase * attrLo;
        const rvHi = revBase * attrHi;
        pfLo += rvLo;
        pfHi += rvHi;
        if (pdfSettingTotals.inpatient) { pdfSettingTotals.inpatient.low += rvLo; pdfSettingTotals.inpatient.high += rvHi; }
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
      const opProv = resolveSettingCounts('outpatient').sProviders;
      if (patientD > 0 && opProv > 0) {
        const annualVisits = patientD * opProv * 12;
        const base = annualVisits * DEFAULT_ASMP.revenuePerVisit;
        capLo = base * attrLo * realLo;
        capHi = base * attrHi * realHi;
        if (pdfSettingTotals.outpatient) { pdfSettingTotals.outpatient.low += capLo; pdfSettingTotals.outpatient.high += capHi; }
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
    costDetails.push({
      label: `After-hours documentation eliminated: \u2212${ahDelta.toFixed(1)} ${metricUnit || 'hrs/day'}/provider`,
      formula: `Tracked as capacity recovered and wellbeing signal \u2014 not monetized for salaried providers`,
    });
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
  } as Record<string, { low: number; high: number }>)[setting] ?? { low: 250_000, high: 500_000 };

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
      formula: `${signal} \u2192 1\u20133 avoided departures \u00D7 $250K\u2013$500K replacement cost (AMGA benchmark)`,
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
  const streamDataMap: { key: string; label: string; has: boolean }[] = [
    { key: 'billingCapture', label: 'Billing Capture', has: billLo > 0 },
    { key: 'revenueRecovery', label: 'Revenue Recovery', has: recLo > 0 },
    { key: 'patientFlow', label: 'Patient Flow', has: pfLo > 0 },
    { key: 'capacityRevenue', label: 'Capacity Revenue', has: capLo > 0 },
    { key: 'costReduction', label: 'Cost Reduction', has: costLo > 0 },
  ];
  for (const sd of streamDataMap) {
    if (!sd.has && !(streamStates && streamStates[sd.key] === false)) continue;
    if (streamStates && streamStates[sd.key] === false) excludedStreams.push(sd.label);
    else enabledStreams.push(sd.label);
  }

  const settingBreakdown = multiSetting ? activeSettings.map(s => {
    const st = pdfSettingTotals[s] || { providers: 0, encounters: 0, low: 0, high: 0 };
    return {
      setting: s,
      label: s === 'ed' ? 'Emergency Dept' : s === 'inpatient' ? 'Inpatient' : s === 'nursing' ? 'Nursing' : 'Outpatient',
      providers: st.providers,
      encounters: st.encounters,
      totalLow: st.low,
      totalHigh: st.high,
    };
  }) : [];

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
    settingBreakdown,
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
  const annualContractValue = state.deployment.annualContractValue ?? 0;
  const activeCareSettings = state.activeCareSettings?.length
    ? state.activeCareSettings
    : [state.careSetting || "outpatient"];
  const settingLabel = activeCareSettings.map(settingFull).join(" \u00B7 ");

  const activeMetrics = getActiveMetrics(state);
  const fin = computeFinancials(state, state.streamStates);
  const hasFinancials = fin.hasAny;

  const TOTAL = 4 + (hasFinancials ? 1 : 0);
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

  const domainBuckets: Record<string, typeof activeMetrics> = {
    "Documentation Quality": [],
    "Time Efficiency": [],
    "Patient Access & Throughput": [],
    "Workforce & Retention": [],
    "Other Metrics": [],
  };
  for (const am of activeMetrics) {
    const def = METRIC_MAP.get(am.metricId);
    const d = (def?.domain || "").toLowerCase();
    if (d.includes("documentation") || d.includes("billing") || d.includes("coding")) {
      domainBuckets["Documentation Quality"].push(am);
    } else if (d.includes("time") || d.includes("efficiency") || d.includes("after")) {
      domainBuckets["Time Efficiency"].push(am);
    } else if (d.includes("access") || d.includes("throughput") || d.includes("patient") || d.includes("flow")) {
      domainBuckets["Patient Access & Throughput"].push(am);
    } else if (d.includes("retention") || d.includes("burnout") || d.includes("workforce") || d.includes("satisfaction")) {
      domainBuckets["Workforce & Retention"].push(am);
    } else {
      domainBuckets["Other Metrics"].push(am);
    }
  }
  const domainOrder = ["Documentation Quality", "Time Efficiency", "Patient Access & Throughput", "Workforce & Retention", "Other Metrics"];

  const streamDescriptions: Record<string, string> = {
    "Billing Capture": "Improved documentation quality drives higher wRVU coding accuracy and E/M level capture.",
    "Revenue Recovery": "Faster, cleaner notes reduce left-without-being-seen events and denial rates.",
    "Patient Flow": "Shorter documentation time enables faster discharge decisions and lower length of stay.",
    "Capacity Revenue": "Time recovered per provider translates to additional appointment capacity.",
    "Workforce": "Burnout and retention signals suggest reduced turnover risk \u2014 modeled against replacement costs.",
  };
  const streamValues: { name: string; lo: number; hi: number }[] = [];
  if (fin.hasBill) streamValues.push({ name: "Billing Capture", lo: fin.billLo, hi: fin.billHi });
  if (fin.hasRec) streamValues.push({ name: "Revenue Recovery", lo: fin.recLo, hi: fin.recHi });
  if (fin.hasPF) streamValues.push({ name: "Patient Flow", lo: fin.pfLo, hi: fin.pfHi });
  if (fin.hasCap) streamValues.push({ name: "Capacity Revenue", lo: fin.capLo, hi: fin.capHi });
  if (fin.hasCost) streamValues.push({ name: "Workforce", lo: fin.costLo, hi: fin.costHi });

  const nextSteps: string[][] = [
    [
      "Establish before/after data in at least one domain before the next EBR.",
      "Drive adoption to 20% \u2014 the minimum threshold for measurable signal.",
      "Identify one provider champion to anchor the internal measurement narrative.",
    ],
    [
      `Expand before/after tracking to ${Math.max(0, 3 - activeDomains)} more domain${3 - activeDomains !== 1 ? "s" : ""} \u2014 3 domains is the Validated threshold.`,
      "Run a structured Abridge vs. non-Abridge encounter analysis for CMO review.",
      "Share a one-page findings brief with your finance team \u2014 the data is there.",
    ],
    [
      "Prepare a formal outcomes report for CFO and CMO \u2014 you have board-ready data.",
      "Drive adoption to 70%+ to reach Strategic maturity.",
      "Set one specific expansion target \u2014 adoption depth or provider count \u2014 and name an owner.",
    ],
    [
      "Publish findings internally \u2014 this report is board-level proof.",
      "Explore a second care setting to add a new measurement category.",
      "Partner with Abridge to document this as a case study.",
    ],
  ];

  return (
    <Document>
      <PDFCoverPage
        reportLabel="Executive Business Review"
        title={orgName}
        subtitle={`${providers} providers \u00B7 ${months} months \u00B7 ${settingLabel}`}
        preparedBy="Abridge Partner Success"
        disclaimerText="This EBR reflects actual deployment data and Abridge methodology. Estimates are ranges, not audited projections."
      />

      {/* PAGE 1: Scorecard */}
      <Page size="LETTER" style={s.page} wrap={false}>
        <View style={s.wrap}>
          <Conf org={orgName} />
          <Text style={s.eyebrow}>Executive Business Review</Text>
          <Text style={s.headline}>{orgName}</Text>
          <Text style={s.subline}>{settingLabel} {"\u00B7"} {months} months with Abridge {"\u00B7"} Generated {today}</Text>

          <View style={s.statRow}>
            <View style={s.statCard}>
              <Text style={s.statNum}>{providers}</Text>
              <Text style={s.statLabel}>Providers on Abridge</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum}>{totalProviders}</Text>
              <Text style={s.statLabel}>Total Providers</Text>
            </View>
          </View>
          <View style={s.statRow}>
            <View style={s.statCard}>
              <Text style={s.statNum}>{utilRate}%</Text>
              <Text style={s.statLabel}>Utilization Rate</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum}>{activeDomains}</Text>
              <Text style={s.statLabel}>Domains Measured</Text>
            </View>
          </View>

          {annualContractValue > 0 && fin.totalMid > 0 && (() => {
            const roiRatio = (fin.totalMid / annualContractValue).toFixed(1);
            const payback = Math.round((annualContractValue / fin.totalMid) * 12);
            const netVal = fin.totalMid - annualContractValue;
            return (
              <View style={{ backgroundColor: C.dark, borderRadius: 4, padding: 14, marginBottom: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text style={{ fontSize: 20, fontWeight: "bold", color: C.orange }}>{roiRatio}{"\u00D7"}</Text>
                    <Text style={{ fontSize: 8, color: "#FFFFFF66", marginTop: 2 }}>ROI ratio</Text>
                  </View>
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text style={{ fontSize: 20, fontWeight: "bold", color: "#FFFFFF" }}>{payback}mo</Text>
                    <Text style={{ fontSize: 8, color: "#FFFFFF66", marginTop: 2 }}>Payback period</Text>
                  </View>
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text style={{ fontSize: 20, fontWeight: "bold", color: "#FFFFFF" }}>{fmtC(netVal)}</Text>
                    <Text style={{ fontSize: 8, color: "#FFFFFF66", marginTop: 2 }}>Net value / yr</Text>
                  </View>
                </View>
              </View>
            );
          })()}

          <Text style={s.narrative}>
            {orgName} has been running Abridge for {months} months across {settingLabel.toLowerCase()}, with {utilRate}% of encounters now using the tool. Data has been collected across {activeDomains} measurement domain{activeDomains !== 1 ? "s" : ""}, placing {orgName} at the {maturityLabels[maturityIdx]} stage of the Abridge measurement journey.
          </Text>

          <Footer n={P()} total={TOTAL} org={orgName} />
        </View>
      </Page>

      {/* PAGE 2: What Changed */}
      <Page size="LETTER" style={s.page} wrap={false}>
        <View style={s.wrap}>
          <Conf org={orgName} />
          <Text style={s.eyebrow}>Your Data</Text>
          <Text style={s.headline}>What Changed Since Abridge</Text>
          <Text style={s.subline}>{activeMetrics.length} metric{activeMetrics.length !== 1 ? "s" : ""} tracked {"\u00B7"} {activeDomains} domain{activeDomains !== 1 ? "s" : ""}</Text>

          {domainOrder.map((domainName) => {
            const metrics = domainBuckets[domainName];
            if (!metrics || metrics.length === 0) return null;
            return (
              <View key={domainName} style={{ marginBottom: 10 }}>
                <Text style={[s.eyebrow, { marginBottom: 2 }]}>{domainName}</Text>
                {metrics.map((am, idx) => {
                  const def = METRIC_MAP.get(am.metricId);
                  const label = def?.label || am.metricId;
                  const unit = def?.unit || "";
                  const hasBoth = am.before != null && am.after != null;
                  const settingTag = am.setting && activeCareSettings.length > 1 ? ` (${settingShort(am.setting)})` : "";
                  const delta = hasBoth ? fmtDelta(am.before!, am.after!, unit) : "";
                  return (
                    <View key={`${am.metricId}-${am.setting}-${idx}`} style={[s.cardOutline, { marginBottom: 6 }]}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={s.mName}>{label}{settingTag}</Text>
                        {delta ? <Text style={{ fontSize: 10, fontWeight: "bold", color: C.orange }}>{delta}</Text> : null}
                      </View>
                      {hasBoth && (
                        <Text style={{ fontSize: 8, color: C.muted, marginTop: 3 }}>
                          Before: {am.before}{unit === "%" ? "%" : ` ${unit}`} {"\u2192"} After: {am.after}{unit === "%" ? "%" : ` ${unit}`}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}

          <Footer n={P()} total={TOTAL} org={orgName} />
        </View>
      </Page>

      {/* PAGE 3: The Financial Case (conditional) */}
      {hasFinancials && (
        <Page size="LETTER" style={s.page} wrap={false}>
          <View style={s.wrap}>
            <Conf org={orgName} />
            <Text style={s.eyebrow}>Financial Impact</Text>
            <Text style={s.headline}>What the Numbers Add Up To</Text>

            <View style={[s.card, { alignItems: "center", paddingVertical: 20, marginBottom: 10 }]}>
              <Text style={{ fontSize: 28, fontWeight: "bold", color: C.orange }}>{fmtRange(Math.round(fin.totalLo), Math.round(fin.totalHi))}</Text>
              <Text style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>estimated annual value {"\u00B7"} {activeDomains} domain{activeDomains !== 1 ? "s" : ""} measured</Text>
            </View>

            {annualContractValue > 0 && fin.totalMid > 0 && (() => {
              const roiRatio = (fin.totalMid / annualContractValue).toFixed(1);
              const payback = Math.round((annualContractValue / fin.totalMid) * 12);
              const netVal = fin.totalMid - annualContractValue;
              return (
                <View style={{ backgroundColor: C.dark, borderRadius: 4, padding: 14, marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <View style={{ alignItems: "center", flex: 1 }}>
                      <Text style={{ fontSize: 20, fontWeight: "bold", color: C.orange }}>{roiRatio}{"\u00D7"}</Text>
                      <Text style={{ fontSize: 8, color: "#FFFFFF66", marginTop: 2 }}>ROI ratio</Text>
                    </View>
                    <View style={{ alignItems: "center", flex: 1 }}>
                      <Text style={{ fontSize: 20, fontWeight: "bold", color: "#FFFFFF" }}>{payback}mo</Text>
                      <Text style={{ fontSize: 8, color: "#FFFFFF66", marginTop: 2 }}>Payback period</Text>
                    </View>
                    <View style={{ alignItems: "center", flex: 1 }}>
                      <Text style={{ fontSize: 20, fontWeight: "bold", color: "#FFFFFF" }}>{fmtC(netVal)}</Text>
                      <Text style={{ fontSize: 8, color: "#FFFFFF66", marginTop: 2 }}>Net value / yr</Text>
                    </View>
                  </View>
                </View>
              );
            })()}

            {streamValues.map((sv, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <Text style={{ flex: 2, fontSize: 10, fontWeight: "bold", color: C.dark }}>{sv.name}</Text>
                <Text style={{ flex: 1.5, fontSize: 10, fontWeight: "bold", color: C.orange, textAlign: "right" }}>{fmtRange(Math.round(sv.lo), Math.round(sv.hi))} / yr</Text>
                <Text style={{ flex: 3, fontSize: 8, color: C.muted, paddingLeft: 10 }}>{streamDescriptions[sv.name] || ""}</Text>
              </View>
            ))}

            <View style={[s.callout, { marginTop: 10 }]}>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: C.dark, marginBottom: 4 }}>What this doesn{"\u2019"}t include</Text>
              <Text style={{ fontSize: 9, color: C.mid, lineHeight: 1.55 }}>
                After-hours documentation burden (not monetized for salaried staff), recruitment advantage, prior auth delays, and audit defensibility.
              </Text>
            </View>

            <Text style={{ fontSize: 7, color: C.muted, marginTop: 8, lineHeight: 1.4 }}>
              Estimates use {fin.attrRange} attribution and {DEFAULT_ASMP.realization}% realization. See methodology for assumptions.
            </Text>

            <Footer n={P()} total={TOTAL} org={orgName} />
          </View>
        </Page>
      )}

      {/* PAGE 4: What's Next */}
      <Page size="LETTER" style={s.page} wrap={false}>
        <View style={s.wrap}>
          <Conf org={orgName} />
          <Text style={s.eyebrow}>Your Path Forward</Text>
          <Text style={s.headline}>Where {orgName} Goes From Here</Text>

          <View style={s.card}>
            <View style={s.pipRow}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={i <= maturityIdx ? s.pipOn : s.pip} />
              ))}
            </View>
            <Text style={{ fontSize: 12, fontWeight: "bold", color: C.orange, marginBottom: 4 }}>{maturityLabels[maturityIdx]}</Text>
            <Text style={{ fontSize: 9, color: C.mid, lineHeight: 1.5 }}>{maturityDescs[maturityIdx]}</Text>
          </View>

          {(utilRate < 75 || providers < totalProviders) && (
            <View style={[s.card, { marginTop: 4 }]}>
              <Text style={[s.eyebrow, { marginBottom: 6 }]}>Expansion Opportunity</Text>
              {utilRate < 75 && utilRate > 0 && fin.totalLo > 0 && (
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: 10, color: C.dark, lineHeight: 1.5 }}>
                    Deepen to 75% adoption {"\u2192"} additional {fmtRange(Math.round(fin.totalLo * (75 / utilRate - 1)), Math.round(fin.totalHi * (75 / utilRate - 1)))} / yr
                  </Text>
                </View>
              )}
              {providers < totalProviders && providers > 0 && fin.totalLo > 0 && (() => {
                const perProvLo = fin.totalLo / providers;
                const perProvHi = fin.totalHi / providers;
                const addCount = totalProviders - providers;
                return (
                  <View style={{ marginBottom: 6 }}>
                    <Text style={{ fontSize: 10, color: C.dark, lineHeight: 1.5 }}>
                      Expand to {totalProviders} providers {"\u2192"} additional {fmtRange(Math.round(perProvLo * addCount), Math.round(perProvHi * addCount))} / yr
                    </Text>
                  </View>
                );
              })()}
            </View>
          )}

          <View style={s.rule} />
          <Text style={{ fontSize: 11, fontWeight: "bold", color: C.dark, marginBottom: 8 }}>Concrete Next Steps</Text>

          {nextSteps[maturityIdx].map((step, i) => (
            <View key={i} style={s.bulletRow}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: C.orange, width: 16 }}>{i + 1}.</Text>
              <Text style={[s.bulletText, { fontSize: 10 }]}>{step}</Text>
            </View>
          ))}

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
