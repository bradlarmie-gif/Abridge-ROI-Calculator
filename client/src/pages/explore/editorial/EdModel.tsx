import { useMemo, useState } from "react";
import { Download, Link as LinkIcon, ArrowRight } from "lucide-react";
import { EditorialHeader, EditorialShell } from "./EditorialHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { type ExploreState } from "../ExploreFlow";
import { EXPLORE_DRIVERS, isDriverEnabled, type ExploreQuadrant } from "@/lib/exploreDrivers";
import {
  computeAllDriverValues,
  computeAllDriverCalcSummaries,
  computeExploreTotals,
} from "@/lib/exploreDriverCalcs";
import { buildExploreProformaDrivers } from "../ExploreModel";
import { PROOF_LAYER, QUADRANT_ORDER } from "./EdInvestment";
import type { ProformaSettingSnapshot, DriverOnset } from "@/pages/proforma/proformaTypes";
import { SETTING_LABELS } from "@/pages/proforma/proformaTypes";
import { PDFExportModal } from "@/components/switch/PDFExportModal";
import { generateExplorePDF, type ExplorePDFData, type ExplorePDFQuadrantData } from "@/components/explore/ExplorePDFExport";
import { copyToClipboard } from "@/lib/clipboard";
import { useToast } from "@/hooks/use-toast";

/**
 * Drop-in editorial replacement for ExploreModel.tsx — identical props.
 * Every dollar figure below is derived from the same canonical engine
 * (computeExploreTotals / computeAllDriverValues) the classic screen, PDF,
 * and proforma use — see exploreDriverCalcs.ts's own reconciliation
 * guarantees. Nothing here re-derives the totals independently.
 */
interface Props {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  totalHoursSaved: number;
  timeValue: number;
  docValue: number;
  annualInvestment: number;
  onEdit: () => void;
  onHome: () => void;
  onBack: () => void;
  onAddToProforma?: (snapshot: ProformaSettingSnapshot) => void;
  onStepClick?: (step: number) => void;
  stepLabels?: string[];
  autoCommitToProforma?: boolean;
}

// Onset per driver id — mirrors the mapping ExploreModel.handleAddToProforma
// uses when building the proforma snapshot (buildExploreProformaDrivers),
// with denials treated as delayed for this ramp (documentation-driven denial
// prevention takes a claims cycle to show up, not day one). Any quantified
// driver not listed here falls back to a sensible default by quadrant.
const DRIVER_ONSET: Record<string, DriverOnset> = {
  patientAccess: "delayed",
  lwbsRecovery: "delayed",
  admissionCapture: "delayed",
  providerWellbeing: "phased",
  physicianLocumAgency: "phased",
  scribeCostReduction: "immediate",
  nursingRetention: "phased",
  nursingAgency: "phased",
  nursingOvertime: "delayed",
  nursingHapi: "delayed",
  nursingFalls: "delayed",
  nursingCauti: "delayed",
  nursingClabsi: "delayed",
  nursingSepsis: "delayed",
  wrvu: "immediate",
  edEmLevel: "immediate",
  hccCapture: "longTerm",
  denialPrevention: "delayed",
  // DRG accuracy and observation defense are claims-cycle revenue: the corrected
  // documentation has to move through coding and billing before it shows in paid
  // claims, exactly like denial prevention. So they ramp "delayed," not day-one.
  drgAccuracy: "delayed",
  obsDefense: "delayed",
};

const FALLBACK_ONSET_BY_QUADRANT: Record<ExploreQuadrant, DriverOnset> = {
  Capacity: "delayed",
  Workforce: "delayed",
  Revenue: "immediate",
  Quality: "delayed",
};

// Display-only adoption curve for the "when it lands" chart. Each onset is a
// smooth back-loaded ramp (progress^k) rather than a hard step: more delay =
// larger exponent = more back-loaded, but the value always builds gradually,
// never a cliff. Month 12 is always 1.0, so the curve reconciles exactly to
// totalAnnualValue ("full run-rate"). This shapes the chart only; it does not
// touch engine totals or the proforma.
const ONSET_RAMP_EXPONENT: Record<DriverOnset, number> = {
  immediate: 1,
  delayed: 1.8,
  phased: 2.6,
  longTerm: 3.6,
  custom: 1.8,
};

function rampFactor(month: number, onset: DriverOnset): number {
  if (month <= 0) return 0;
  const p = Math.min(1, month / 12);
  return Math.pow(p, ONSET_RAMP_EXPONENT[onset] ?? 1.8);
}

const fmtCurrency = (n: number) => (n < 0 ? "−$" + Math.abs(Math.round(n)).toLocaleString() : "$" + Math.round(n).toLocaleString());
// Net-per-dollar keeps two decimals AND a real minus sign — a raw
// `$${n.toFixed(2)}` yielded the malformed "$-0.16" for a negative net.
const fmtPerDollar = (n: number) => (n < 0 ? "−$" : "$") + Math.abs(n).toFixed(2);
const fmtNumber = (n: number) => Math.round(n).toLocaleString();
const fmtShort = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n < 0 ? "-" : "") + "$" + (abs / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return (n < 0 ? "-" : "") + "$" + (abs / 1_000).toFixed(0) + "K";
  return fmtCurrency(n);
};

export default function EdModel({
  state,
  updateState,
  totalHoursSaved,
  annualInvestment,
  onEdit,
  onAddToProforma,
  onBack,
  onHome,
}: Props) {
  const { toast } = useToast();
  const isNursing = state.careSetting === "nursing";
  const careSettingLabel = state.careSetting ? SETTING_LABELS[state.careSetting] ?? state.careSetting : "";
  const baselineCount = isNursing ? state.nursingStaffedBeds : state.numberOfProviders;

  // ───── Canonical totals (single source of truth) ─────
  const exploreTotals = useMemo(() => computeExploreTotals(state, totalHoursSaved), [state, totalHoursSaved]);
  const allDriverValues = useMemo(() => computeAllDriverValues(state, totalHoursSaved), [state, totalHoursSaved]);
  const allDriverCalcSummaries = useMemo(() => computeAllDriverCalcSummaries(state, totalHoursSaved), [state, totalHoursSaved]);

  const totalAnnualValue = exploreTotals.totalAnnualValue;
  const valueByQuadrant = exploreTotals.valueByQuadrant;
  const netAnnualValue = totalAnnualValue - annualInvestment;
  const roi = annualInvestment > 0 ? totalAnnualValue / annualInvestment : 0;
  const netPerDollar = annualInvestment > 0 ? netAnnualValue / annualInvestment : 0;
  const noDriversEnabled = totalAnnualValue === 0;

  // ───── "When it lands" ramp — computed from the enabled drivers' real
  // onset, not an illustrative curve. otherAnnualTotal folds in any
  // "other financial benefit" annual lines (immediate onset, since they
  // carry no onset metadata of their own) so month-12 always reconciles
  // exactly to totalAnnualValue.
  const otherAnnualTotal = useMemo(
    () => (state.otherFinancialBenefits ?? []).filter((b) => b.type === "annual" && b.label.trim() && b.amount > 0).reduce((s, b) => s + b.amount, 0),
    [state.otherFinancialBenefits],
  );

  const rampEntries = useMemo(() => {
    if (!state.careSetting) return [] as { id: string; value: number; onset: DriverOnset }[];
    return EXPLORE_DRIVERS.filter((d) => d.settings.includes(state.careSetting!))
      .map((d) => ({ id: d.id, value: allDriverValues[d.id] || 0, onset: DRIVER_ONSET[d.id] ?? FALLBACK_ONSET_BY_QUADRANT[d.quadrant] }))
      .filter((d) => d.value > 0);
  }, [state.careSetting, allDriverValues]);

  const rampPoints = useMemo(() => {
    const pts: { month: number; value: number }[] = [];
    for (let m = 0; m <= 12; m++) {
      let v = otherAnnualTotal * rampFactor(m, "immediate");
      for (const entry of rampEntries) v += entry.value * rampFactor(m, entry.onset);
      pts.push({ month: m, value: v });
    }
    return pts;
  }, [rampEntries, otherAnnualTotal]);

  // Cumulative Year-1 cash view — the honest payback. Value accrues month by
  // month as adoption ramps (monthly value = that month's run-rate / 12), while
  // cost accrues linearly. Payback is where CUMULATIVE value overtakes CUMULATIVE
  // spend, not the moment the run-rate rate merely passes the cost rate (which
  // overstates how fast the investment is actually recovered).
  const cumPoints = useMemo(() => {
    const pts: { month: number; value: number; cost: number }[] = [];
    let cumV = 0;
    for (let m = 0; m <= 12; m++) {
      if (m > 0) cumV += rampPoints[m].value / 12;
      pts.push({ month: m, value: cumV, cost: annualInvestment * (m / 12) });
    }
    return pts;
  }, [rampPoints, annualInvestment]);

  const paybackMonthFrac = useMemo(() => {
    if (annualInvestment <= 0) return null; // no investment entered yet
    for (let m = 1; m <= 12; m++) {
      if (cumPoints[m].value >= cumPoints[m].cost) {
        const prevGap = cumPoints[m - 1].value - cumPoints[m - 1].cost; // <= 0
        const curGap = cumPoints[m].value - cumPoints[m].cost; // >= 0
        const frac = curGap === prevGap ? 0 : (0 - prevGap) / (curGap - prevGap);
        return (m - 1) + Math.max(0, Math.min(1, frac));
      }
    }
    return null; // hasn't paid back within the first year
  }, [cumPoints, annualInvestment]);

  // Chart geometry — viewBox 0 0 640 250, matching the locked mockup.
  const cumMax = Math.max(cumPoints[12].value, cumPoints[12].cost, 1);
  const chartX = (month: number) => 40 + (month / 12) * 580;
  const chartY = (value: number) => 220 - Math.max(0, Math.min(1, value / cumMax)) * 185;
  const valuePath = cumPoints.map((p) => `${p.month === 0 ? "M" : "L"}${chartX(p.month).toFixed(1)},${chartY(p.value).toFixed(1)}`).join(" ");
  const areaPath = `M40,220 ${cumPoints.map((p) => `L${chartX(p.month).toFixed(1)},${chartY(p.value).toFixed(1)}`).join(" ")} L620,220 Z`;
  const costPath = cumPoints.map((p) => `${p.month === 0 ? "M" : "L"}${chartX(p.month).toFixed(1)},${chartY(p.cost).toFixed(1)}`).join(" ");
  const paybackX = paybackMonthFrac !== null ? chartX(paybackMonthFrac) : null;
  const paybackY = paybackMonthFrac !== null ? chartY(annualInvestment * (paybackMonthFrac / 12)) : null;
  const valueEndY = chartY(cumPoints[12].value);

  // ───── Quadrant contribution bars ─────
  // Which domain is the non-financial proof layer depends on the setting
  // (nursing = Revenue is proof, Quality carries a dollar; everyone else the
  // reverse). Read it from the single source so the recap can never label the
  // wrong quadrant as proof or show a misleading $0.
  const proofForSetting = PROOF_LAYER[state.careSetting ?? ""] ?? {};
  const quadFill: Record<string, string> = {
    Revenue: "bg-[#EA2C00]",
    Capacity: "bg-[#F0704E]",
    Workforce: "bg-[#F4A48C]",
    Quality: "bg-[#F6B79E]",
  };
  const quadrantMax = Math.max(
    valueByQuadrant.Revenue,
    valueByQuadrant.Capacity,
    valueByQuadrant.Workforce,
    valueByQuadrant.Quality,
    1,
  );

  // ───── Model your expansion ─────
  const [expandedUtilization, setExpandedUtilization] = useState(() => Math.max(80, state.utilizationPercent));
  const expandedProviders = state.fullScaleProviders;
  const providersTrackMax = Math.max(baselineCount * 3, 500, expandedProviders);

  const derivedFullScaleEncounters = !isNursing && state.numberOfProviders > 0
    ? Math.round(state.annualEncounters * expandedProviders / state.numberOfProviders)
    : null;
  const currentAbridgeEncounters = !isNursing ? state.annualEncounters * (state.utilizationPercent / 100) : 0;
  const fullScaleAbridgeEncounters = !isNursing && derivedFullScaleEncounters !== null ? derivedFullScaleEncounters * (expandedUtilization / 100) : null;

  const expansionMultiplier = !isNursing && currentAbridgeEncounters > 0 && fullScaleAbridgeEncounters !== null
    ? fullScaleAbridgeEncounters / currentAbridgeEncounters
    : baselineCount > 0 && state.utilizationPercent > 0
      ? (expandedProviders / baselineCount) * (expandedUtilization / state.utilizationPercent)
      : 0;
  // Screen keeps NET (its card is a net-vs-net comparison, labeled "net value").
  const expandedValue = Math.round(netAnnualValue * expansionMultiplier);
  // The PDF's "at full scale" page compares against the GROSS modeled value, so
  // it needs a gross-scaled figure (today-gross → full-scale-gross, always
  // grows). Net-scaling there pitted gross vs net and could invert.
  const expandedGross = Math.round(totalAnnualValue * expansionMultiplier);
  const providerExpansionRatio = baselineCount > 0 ? expandedProviders / baselineCount : 0;
  const expandedInvestment = annualInvestment * providerExpansionRatio;
  const expandedRoi = expandedInvestment > 0 ? (totalAnnualValue * expansionMultiplier) / expandedInvestment : 0;

  const providersPct = providersTrackMax > 0 ? (expandedProviders / providersTrackMax) * 100 : 0;
  const providersTodayPct = providersTrackMax > 0 ? (baselineCount / providersTrackMax) * 100 : 0;
  const adoptionPct = expandedUtilization;
  const adoptionTodayPct = state.utilizationPercent;

  const cmpMax = Math.max(netAnnualValue, expandedValue, 1);

  // ───── Actions ─────
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(window.location.href);
    toast({ title: ok ? "Link copied" : "Couldn't copy link", description: ok ? "Share link copied to your clipboard." : "Try again or copy the URL manually." });
  };

  const handleAddToProforma = () => {
    if (!onAddToProforma || !state.careSetting) return;
    const cs = state.careSetting;
    const patientAccessValue = allDriverValues.patientAccess || 0;
    const costReductionValue = (cs !== "outpatient" && cs !== "ed" && state.timeDriverInputs.costReductionEnabled) ? state.timeDriverInputs.estimatedCostReduction : 0;
    const { drivers, retentionValue } = buildExploreProformaDrivers(state, totalHoursSaved, {
      patientAccessValue,
      costReductionValue,
      scribeCostValue: allDriverValues.scribeCostReduction || 0,
      nursingHapiValue: allDriverValues.nursingHapi || 0,
      nursingFallsValue: allDriverValues.nursingFalls || 0,
      nursingCautiValue: allDriverValues.nursingCauti || 0,
      nursingClabsiValue: allDriverValues.nursingClabsi || 0,
      nursingSepsisValue: allDriverValues.nursingSepsis || 0,
    });

    const pilotProviders = baselineCount;
    const fullScale = isNursing ? pilotProviders : state.fullScaleProviders;
    const y2Providers = Math.round(pilotProviders + (fullScale - pilotProviders) * 0.4);
    const encountersPerProvider = pilotProviders > 0 ? state.annualEncounters / pilotProviders : 0;

    // The proforma engine ramps expansionMultiplier 0→1 toward fullScaleProviders
    // and realizes each driver.value at full deployment (proformaCalculations.ts:
    // scaleSettingValue + monthly loop). So driver.value — and every value field
    // derived from it — must be the FULL-SCALE annual value, not the pilot value.
    // Explore computes at pilot providers; scale up by fullScale/pilot so value and
    // investment track together as the deal expands (mirrors ExploreModel import).
    // Nursing holds fullScale = pilot, so the factor is 1 (no provider expansion).
    const providerScaleFactor = fullScale > pilotProviders && pilotProviders > 0 ? fullScale / pilotProviders : 1;
    const scaledDrivers = providerScaleFactor > 1
      ? drivers.map((d) => ({ ...d, value: Math.round(d.value * providerScaleFactor) }))
      : drivers;
    const sumQuadrant = (q: string) => scaledDrivers.filter((d) => d.quadrant === q).reduce((s, d) => s + d.value, 0);
    const scaleUp = (n: number) => Math.round(n * providerScaleFactor);

    const snapshot: ProformaSettingSnapshot = {
      id: `${cs}-${Date.now()}`,
      careSetting: cs,
      label: SETTING_LABELS[cs] || cs,
      providerCount: pilotProviders,
      fullScaleProviders: fullScale,
      fullScaleUtilization: isNursing ? state.utilizationPercent : Math.min(expandedUtilization, 95),
      yearlyProviders: { year1: pilotProviders, year2: y2Providers, year3: fullScale },
      encounters: state.annualEncounters,
      utilizationPercent: state.utilizationPercent,
      annualValue: scaleUp(totalAnnualValue),
      timeValue: scaleUp(exploreTotals.efficiencyValue),
      docValue: scaleUp(exploreTotals.documentationValue),
      retentionValue: scaleUp(retentionValue),
      totalHoursSaved,
      drivers: scaledDrivers,
      costPerUnit: state.pricingModel === "perProvider" ? state.costPerProvider : 0,
      yearlyPricing: state.pricingModel === "perProvider"
        ? { year1: state.costPerProvider, year2: state.costPerProvider, year3: state.costPerProvider }
        : { year1: 0, year2: 0, year3: 0 },
      pricingModel: state.pricingModel === "perEncounter" ? "perEncounter" : state.pricingModel === "annual" ? "annualFlat" : state.pricingModel === "platform" ? "platform" : "perUnit",
      costPerEncounter: state.pricingModel === "perEncounter" ? (state.costPerEncounter ?? 0) : undefined,
      annualLicenseFee: (state.pricingModel === "annual" || state.pricingModel === "platform") ? state.annualLicenseFee : undefined,
      platformEncRate: state.pricingModel === "platform" ? state.platformEncRate : undefined,
      implementationFee: state.includeImplementation ? state.implementationFee : 0,
      goLiveMonth: 1,
      color: "#EA2C00",
      fullExploreState: { ...state },
      yearlyEncounters: {
        year1: state.annualEncounters,
        year2: Math.round(y2Providers * encountersPerProvider),
        year3: Math.round(fullScale * encountersPerProvider),
      },
      yearlyUtilization: { year1: state.utilizationPercent, year2: state.utilizationPercent, year3: state.utilizationPercent },
      retentionRate: 0,
      replacementCost: isNursing ? (state.timeDriverInputs.nursingReplacementCost || 56300) : (state.timeDriverInputs.replacementCost || 400000),
      capacityValue: sumQuadrant("Capacity"),
      workforceValue: sumQuadrant("Workforce"),
      revenueValue: sumQuadrant("Revenue"),
      qualityValue: sumQuadrant("Quality"),
      costOffsets: (state.costDisplacementItems ?? []).length > 0
        ? state.costDisplacementItems.map((d) => ({ id: d.id, label: d.label, annualSpend: d.annualSpend, displacementPct: d.displacementPct, transitionMonths: 12 }))
        : undefined,
    };

    onAddToProforma(snapshot);
    toast({ title: `${snapshot.label} added to proforma`, description: `${fmtCurrency(totalAnnualValue)} annual value captured` });
  };

  const handleExportPDF = async (clientName: string, preparedBy: string) => {
    setIsExporting(true);
    try {
      const buildQuadrantData = (quadrant: ExploreQuadrant): ExplorePDFQuadrantData => {
        if (!state.careSetting) return { quadrant, annualTotal: 0, oneTimeTotal: 0, drivers: [], otherFinancialBenefits: [] };
        const drivers = EXPLORE_DRIVERS.filter((d) => d.quadrant === quadrant && d.settings.includes(state.careSetting!)).map((d) => {
          const included = isDriverEnabled(d, state);
          const value = included ? (allDriverValues[d.id] || 0) : 0;
          return {
            id: d.id,
            label: d.label,
            shortDescription: d.shortDescription,
            visibility: d.visibility,
            value,
            isChild: !!d.childOfDriverId,
            calcSummary: included ? allDriverCalcSummaries[d.id] : undefined,
            isIncluded: included,
            valueArc: included ? d.valueArc : undefined,
          };
        });
        const benefits = (state.otherFinancialBenefits ?? [])
          .filter((b) => b.quadrant === quadrant && b.label.trim() && b.amount > 0)
          .map((b) => ({ label: b.label, amount: b.amount, type: b.type }));
        const driverAnnualSum = drivers.filter((d) => d.visibility === "quantified" && d.isIncluded).reduce((s, d) => s + d.value, 0);
        const benefitsAnnual = benefits.filter((b) => b.type === "annual").reduce((s, b) => s + b.amount, 0);
        const benefitsOneTime = benefits.filter((b) => b.type === "oneTime").reduce((s, b) => s + b.amount, 0);
        return { quadrant, annualTotal: driverAnnualSum + benefitsAnnual, oneTimeTotal: benefitsOneTime, drivers, otherFinancialBenefits: benefits };
      };

      const pdfData: ExplorePDFData = {
        clientName,
        preparedBy,
        date: new Date().toLocaleDateString(),
        careSettingLabel,
        careSetting: (state.careSetting ?? "outpatient") as ExplorePDFData["careSetting"],
        numberOfProviders: state.numberOfProviders,
        nursingStaffedBeds: isNursing ? state.nursingStaffedBeds : undefined,
        nursingOccupancyRate: isNursing ? state.nursingOccupancyRate : undefined,
        annualEncounters: state.annualEncounters,
        utilizationPercent: state.utilizationPercent,
        totalHoursSaved,
        minutesSavedPerEncounter: state.minutesSavedPerEncounter,
        timePathScenario: state.timePathScenario || "custom",
        quadrants: [
          buildQuadrantData("Capacity"),
          buildQuadrantData("Workforce"),
          buildQuadrantData("Revenue"),
          buildQuadrantData("Quality"),
        ],
        totalAnnualValue,
        totalOneTimeValue: exploreTotals.totalOneTimeValue,
        pricingModel: state.pricingModel,
        costPerProvider: state.pricingModel === "perProvider" ? state.costPerProvider : undefined,
        costPerEncounter: state.pricingModel === "perEncounter" ? state.costPerEncounter : undefined,
        annualLicenseFee: (state.pricingModel === "annual" || state.pricingModel === "platform") ? state.annualLicenseFee : undefined,
        platformEncRate: state.pricingModel === "platform" ? state.platformEncRate : undefined,
        implementationFee: state.implementationFee,
        includeImplementation: state.includeImplementation,
        annualInvestment,
        year2GrowthPercent: state.year2GrowthPercent,
        year3GrowthPercent: state.year3GrowthPercent,
        year1Value: totalAnnualValue,
        year2Value: Math.round(totalAnnualValue * (1 + state.year2GrowthPercent / 100)),
        year3Value: Math.round(totalAnnualValue * (1 + state.year2GrowthPercent / 100) * (1 + state.year3GrowthPercent / 100)),
        year1Investment: annualInvestment,
        year2Investment: annualInvestment,
        year3Investment: annualInvestment,
        year1Net: netAnnualValue,
        year2Net: Math.round(totalAnnualValue * (1 + state.year2GrowthPercent / 100)) - annualInvestment,
        year3Net: Math.round(totalAnnualValue * (1 + state.year2GrowthPercent / 100) * (1 + state.year3GrowthPercent / 100)) - annualInvestment,
        threeYearGrossTotal: totalAnnualValue * 3,
        threeYearInvestmentTotal: annualInvestment * 3,
        threeYearNetTotal: netAnnualValue * 3,
        projectionYears: 3,
        netAnnualValue,
        roi,
        // Same real cumulative-crossover the "When it lands" chart shows (ceil'd
        // to the customer-facing month), so the PDF can't disagree with the screen.
        paybackMonth: paybackMonthFrac !== null ? Math.max(1, Math.ceil(paybackMonthFrac)) : null,
        valuePerProvider: baselineCount > 0 ? Math.round(netAnnualValue / baselineCount) : 0,
        ...(expandedProviders > baselineCount || expandedUtilization > state.utilizationPercent
          ? {
              expansionProviders: expandedProviders,
              expansionUtilizationPercent: expandedUtilization,
              expansionAnnualValue: expandedGross,
              expansionRoi: expandedRoi,
              ...(derivedFullScaleEncounters !== null ? { expansionEncounters: derivedFullScaleEncounters } : {}),
            }
          : {}),
        costDisplacementItems: (state.costDisplacementItems ?? []).length > 0 ? state.costDisplacementItems : undefined,
      };

      await generateExplorePDF(pdfData);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <EditorialShell>
      <EditorialHeader stepName="Your Model" stepIndex={9} onBack={onBack} onHome={onHome} />
      <div className="max-w-[1160px] mx-auto px-5 sm:px-8 lg:px-12 pt-[44px] pb-[60px]">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">Value Estimator · Step 9 of 9</div>
        <h1 className="font-abridge text-[26px] sm:text-[32px] lg:text-[38px] leading-[1.08] text-[#1A1A1A] mt-[10px]">Your model.</h1>
        <p className="text-[16px] text-[#565250] mt-[13px] max-w-[620px] leading-[1.5]">
          The whole picture, built from your numbers. Ready to share, or take into a full proforma.
        </p>

        {/* Hero recap */}
        <div className="bg-[#FDFBF8] border border-[#E7E3DD] rounded-[20px] p-[26px_30px] mt-[30px] flex justify-between items-center gap-[30px] flex-wrap">
          <div>
            {/* "Net" only once a cost exists; before pricing this figure is net of nothing, so it's "value before cost" (matches EdInvestment). */}
            <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#2E2822]">{annualInvestment > 0 ? "Net annual value" : "Value before cost"}</div>
            {/* Coral is reserved for a real gain; a loss reads in neutral ink, never celebratory. */}
            <div className={`font-abridge text-[54px] leading-none mt-[7px] ${netAnnualValue >= 0 ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}>
              {fmtCurrency(netAnnualValue)}
              <span className="text-[17px] text-[#565250]"> / yr</span>
            </div>
            {annualInvestment <= 0 ? (
              <div className="inline-flex items-center gap-[9px] mt-[13px] bg-[#F2EFEA] border border-[#E7E2DB] rounded-full px-[15px] py-[8px]">
                <span className="text-[12.5px] font-bold text-[#565250]">Add your pricing to see the return</span>
              </div>
            ) : netAnnualValue > 0 ? (
              <div className="inline-flex items-center gap-[9px] mt-[13px] bg-[#FFEDE7] border border-[#F5D3C8] rounded-full px-[15px] py-[8px]">
                <span className="font-abridge text-[19px] text-[#EA2C00]">{roi.toFixed(1)}×</span>
                <span className="text-[12.5px] font-bold text-[#B02200]">≈ {fmtPerDollar(netPerDollar)} net back for every $1 spent</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-[9px] mt-[13px] bg-[#F2EFEA] border border-[#E7E2DB] rounded-full px-[15px] py-[8px]">
                <span className="font-abridge text-[19px] text-[#565250]">{roi.toFixed(1)}×</span>
                <span className="text-[12.5px] font-bold text-[#565250]">the modeled value doesn&apos;t cover the cost at this scope</span>
              </div>
            )}
          </div>
          <div className="flex gap-[30px] flex-wrap">
            <div>
              <div className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-[#7C766F]">Total value</div>
              <div className="font-abridge text-[22px] text-[#1A1A1A] mt-[5px]">{fmtCurrency(totalAnnualValue)}</div>
            </div>
            <div>
              <div className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-[#7C766F]">Investment</div>
              <div className="font-abridge text-[22px] text-[#1A1A1A] mt-[5px]">{fmtCurrency(annualInvestment)}</div>
            </div>
            <div>
              <div className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-[#7C766F]">Scope</div>
              <div className="font-abridge text-[15px] text-[#1A1A1A] mt-[5px]">
                {fmtNumber(baselineCount)} {isNursing ? "beds" : "providers"} · {careSettingLabel}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.42fr_1fr] gap-[22px] mt-[22px] items-stretch">
          {/* Ramp chart */}
          <div className="bg-[#FDFBF8] border border-[#E7E3DD] rounded-[20px] p-[22px_24px]">
            <div className="text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#2E2822] mb-[6px]">When it lands</div>
            <p className="text-[12.5px] text-[#565250] mb-[14px] leading-[1.5]">
              {annualInvestment <= 0
                ? <>Value builds as adoption grows, so year 1 lands around {fmtShort(cumPoints[12].value)} and the run-rate reaches its full {fmtShort(totalAnnualValue)} / yr by month 12. Add your investment to see the payback point.</>
                : paybackMonthFrac !== null
                  ? <>Cumulative value catches the cumulative cost by month {Math.max(1, Math.ceil(paybackMonthFrac))}, the payback point. From there it keeps compounding, and the run-rate reaches its full {fmtShort(totalAnnualValue)} / yr by month 12.</>
                  : <>Value builds as adoption grows. At this scope the cumulative value is still catching up to the cost at month 12.</>}
            </p>
            {totalAnnualValue > 0 ? (
              <>
                <svg viewBox="0 0 640 250" preserveAspectRatio="xMidYMid meet" className="w-full h-auto block">
                  <defs>
                    <linearGradient id="edModelRampGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#EA2C00" stopOpacity="0.16" />
                      <stop offset="1" stopColor="#EA2C00" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <line x1="40" y1="35" x2="620" y2="35" stroke="#EDE7DD" strokeWidth="1" />
                  <line x1="40" y1="128" x2="620" y2="128" stroke="#EDE7DD" strokeWidth="1" />
                  <line x1="40" y1="220" x2="620" y2="220" stroke="#E7E3DD" strokeWidth="1" />
                  <path d={areaPath} fill="url(#edModelRampGradient)" />
                  {annualInvestment > 0 && (
                    <path d={costPath} fill="none" stroke="#9C8E7E" strokeWidth="1.6" strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" />
                  )}
                  <path d={valuePath} fill="none" stroke="#EA2C00" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                  {paybackX !== null && paybackY !== null && (
                    <>
                      <line x1={paybackX} y1={paybackY} x2={paybackX} y2="220" stroke="#C9BCA9" strokeWidth="1" strokeDasharray="3 3" />
                      <circle cx={paybackX} cy={paybackY} r="4.5" fill="#fff" stroke="#EA2C00" strokeWidth="2.5" />
                      <text x={Math.max(44, Math.min(paybackX - 6, 512))} y={paybackY - 11} fontFamily="Manrope" fontSize="11" fontWeight="700" fill="#B02200" textAnchor={paybackX > 300 ? "end" : "start"}>
                        pays back · Mo {Math.max(1, Math.ceil(paybackMonthFrac ?? 1))}
                      </text>
                    </>
                  )}
                  <circle cx="620" cy={valueEndY} r="4" fill="#EA2C00" />
                  <text x="616" y={Math.max(24, valueEndY - 10)} fontFamily="Manrope" fontSize="10.5" fontWeight="700" fill="#9C8E7E" textAnchor="end">{fmtShort(cumPoints[12].value)} cumulative · year 1</text>
                  <text x="40" y="238" fontFamily="Manrope" fontSize="11" fill="#7C766F">Mo 1</text>
                  <text x="330" y="238" fontFamily="Manrope" fontSize="11" fill="#7C766F" textAnchor="middle">Mo 6</text>
                  <text x="620" y="238" fontFamily="Manrope" fontSize="11" fill="#7C766F" textAnchor="end">Mo 12</text>
                </svg>
                <div className="flex gap-5 mt-3">
                  <div className="flex items-center gap-[7px] text-[12px] text-[#565250]">
                    <span className="w-[14px] h-[3px] rounded-[2px] bg-[#EA2C00] inline-block" />
                    Cumulative value
                  </div>
                  {annualInvestment > 0 && (
                    <div className="flex items-center gap-[7px] text-[12px] text-[#565250]">
                      <span className="w-[14px] h-[3px] rounded-[2px] bg-[#9C8E7E] inline-block" />
                      Cumulative cost · {fmtShort(annualInvestment)} / yr
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-[13px] text-[#7C766F] py-10 text-center">
                Add value drivers in the prior steps to see how the value builds.
              </div>
            )}
          </div>

          {/* Quadrant breakdown */}
          <div className="bg-[#FDFBF8] border border-[#E7E3DD] rounded-[20px] p-[22px_24px] flex flex-col">
            <div className="text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#2E2822] mb-[6px]">Where the value comes from</div>
            <p className="text-[12.5px] text-[#565250] mb-[14px] leading-[1.5]">Across the four areas you modeled.</p>
            <div className="flex-1 flex flex-col justify-between gap-4">
              {QUADRANT_ORDER.map((q) => {
                const proofNote = proofForSetting[q];
                if (proofNote) {
                  // Proof-layer quadrant: no dollar here on purpose. Keep the row
                  // compact (no empty rail) so it reads as intentional, not missing.
                  return (
                    <div key={q} className="flex justify-between items-baseline">
                      <span className="text-[13.5px] font-bold text-[#1A1A1A]">{q}</span>
                      <span className="text-[12px] text-[#7C766F] italic">{proofNote}</span>
                    </div>
                  );
                }
                const value = valueByQuadrant[q];
                // Workforce with retention in Tracked mode counts $0 by design; show it
                // as a tracked signal (like the proof rows), never a $0 + empty bar.
                if (q === "Workforce" && value === 0 && state.retentionMode === "tracked") {
                  return (
                    <div key={q} className="flex justify-between items-baseline">
                      <span className="text-[13.5px] font-bold text-[#1A1A1A]">{q}</span>
                      <span className="text-[12px] text-[#7C766F] italic">tracked as a signal; switch Retention to Dollar to count</span>
                    </div>
                  );
                }
                return (
                  <div key={q}>
                    <div className="flex justify-between items-baseline mb-[7px]">
                      <span className="text-[13.5px] font-bold text-[#1A1A1A]">{q}</span>
                      <span className="font-abridge text-[15px] text-[#1A1A1A]">{fmtCurrency(value)}</span>
                    </div>
                    <div className="h-[9px] bg-[#F2EFEA] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${quadFill[q]}`} style={{ width: `${Math.max(value > 0 ? 4 : 0, (value / quadrantMax) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Model your expansion */}
        <div className="bg-[#FDFBF8] border border-[#E7E3DD] rounded-[20px] p-[22px_24px] mt-[22px]">
          <div className="text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#2E2822] mb-[6px]">Model your expansion</div>
          <p className="text-[12.5px] text-[#565250] mb-5 leading-[1.5]">
            Where this goes as you roll out to more {isNursing ? "beds" : "providers"} and higher adoption. Same math, larger footprint.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-[30px] items-center">
            <div>
              {/* Providers slider */}
              <div className="mb-[26px]">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[10.5px] font-extrabold tracking-[0.04em] uppercase text-[#2E2822]">{isNursing ? "Beds" : "Providers"}</div>
                    <div className="text-[12.5px] text-[#7C766F] mt-[5px]">{fmtNumber(baselineCount)} today</div>
                  </div>
                  <div className="inline-flex items-baseline gap-[1px] border border-[#EFB6A6] rounded-[10px] px-[13px] py-[4px] bg-white shadow-[0_0_0_1px_#F5D3C8]">
                    <FormattedNumberInput
                      value={expandedProviders}
                      onChange={(v) => updateState({ fullScaleProviders: v })}
                      onBlurValue={(v) => updateState({ fullScaleProviders: Math.max(v, baselineCount) })}
                      className="font-abridge text-[23px] text-[#EA2C00] leading-none border-0 h-auto p-0 shadow-none w-16 text-right focus-visible:ring-0"
                      data-testid="ed-model-input-providers"
                    />
                  </div>
                </div>
                <div className="relative h-2 bg-[#F2EFEA] rounded-full my-[22px] mr-[6px]">
                  <div className="absolute left-0 top-0 h-full bg-[#E7E2DB] rounded-full" style={{ width: `${providersTodayPct}%` }} />
                  <div className="absolute top-0 h-full bg-[#EA2C00] rounded-full" style={{ left: `${providersTodayPct}%`, width: `${Math.max(0, providersPct - providersTodayPct)}%` }} />
                  <div className="absolute -top-1 w-[2px] h-4 bg-[#B0ABA4]" style={{ left: `${providersTodayPct}%`, transform: "translateX(-50%)" }} />
                  <input
                    type="range"
                    min={baselineCount}
                    max={providersTrackMax}
                    value={expandedProviders}
                    onChange={(e) => updateState({ fullScaleProviders: Number(e.target.value) })}
                    data-testid="ed-model-slider-providers"
                    className="absolute inset-0 w-full h-4 -top-1 opacity-0 cursor-grab"
                  />
                  <div
                    className="absolute -top-[6px] w-5 h-5 rounded-full bg-white border-[2.5px] border-[#EA2C00] shadow-[0_1px_4px_rgba(0,0,0,0.18)] pointer-events-none"
                    style={{ left: `${providersPct}%`, transform: "translateX(-50%)" }}
                  />
                </div>
                <div className="flex justify-between items-baseline mt-3 gap-3">
                  <span className="text-[12px] text-[#565250]">
                    <b className="text-[#EA2C00] font-bold">+{fmtNumber(Math.max(0, expandedProviders - baselineCount))} {isNursing ? "beds" : "providers"}</b> vs today
                  </span>
                  <span className="text-[12px] text-[#7C766F] whitespace-nowrap">
                    full {isNursing ? "unit" : "team"} · <span className="text-[#565250] font-bold">{fmtNumber(expandedProviders)}</span>
                  </span>
                </div>
              </div>

              {/* Adoption slider */}
              <div>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[10.5px] font-extrabold tracking-[0.04em] uppercase text-[#2E2822]">Adoption</div>
                    <div className="text-[12.5px] text-[#7C766F] mt-[5px]">{state.utilizationPercent}% today</div>
                  </div>
                  <div className="inline-flex items-baseline gap-[1px] border border-[#EFB6A6] rounded-[10px] px-[13px] py-[4px] bg-white shadow-[0_0_0_1px_#F5D3C8]">
                    <FormattedNumberInput
                      value={expandedUtilization}
                      onChange={(v) => setExpandedUtilization(v)}
                      onBlurValue={(v) => setExpandedUtilization(Math.min(Math.max(v, state.utilizationPercent), 100))}
                      className="font-abridge text-[23px] text-[#EA2C00] leading-none border-0 h-auto p-0 shadow-none w-12 text-right focus-visible:ring-0"
                      data-testid="ed-model-input-adoption"
                    />
                    <span className="text-[13px] text-[#565250]">%</span>
                  </div>
                </div>
                <div className="relative h-2 bg-[#F2EFEA] rounded-full my-[22px] mr-[6px]">
                  <div className="absolute left-0 top-0 h-full bg-[#E7E2DB] rounded-full" style={{ width: `${adoptionTodayPct}%` }} />
                  <div className="absolute top-0 h-full bg-[#EA2C00] rounded-full" style={{ left: `${adoptionTodayPct}%`, width: `${Math.max(0, adoptionPct - adoptionTodayPct)}%` }} />
                  <div className="absolute -top-1 w-[2px] h-4 bg-[#B0ABA4]" style={{ left: `${adoptionTodayPct}%`, transform: "translateX(-50%)" }} />
                  <input
                    type="range"
                    min={state.utilizationPercent}
                    max={100}
                    value={expandedUtilization}
                    onChange={(e) => setExpandedUtilization(Number(e.target.value))}
                    data-testid="ed-model-slider-adoption"
                    className="absolute inset-0 w-full h-4 -top-1 opacity-0 cursor-grab"
                  />
                  <div
                    className="absolute -top-[6px] w-5 h-5 rounded-full bg-white border-[2.5px] border-[#EA2C00] shadow-[0_1px_4px_rgba(0,0,0,0.18)] pointer-events-none"
                    style={{ left: `${adoptionPct}%`, transform: "translateX(-50%)" }}
                  />
                </div>
                <div className="flex justify-between items-baseline mt-3 gap-3">
                  <span className="text-[12px] text-[#565250]">
                    <b className="text-[#EA2C00] font-bold">+{Math.max(0, Math.round(expandedUtilization - state.utilizationPercent))} points</b> vs today
                  </span>
                  <span className="text-[12px] text-[#7C766F] whitespace-nowrap">
                    full adoption · <span className="text-[#565250] font-bold">100%</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="border-l border-[#E7E3DD] pl-[30px]">
              <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#2E2822]">{annualInvestment > 0 ? "Projected net value at that scope" : "Projected value at that scope"}</div>
              <div className={`font-abridge text-[42px] leading-none mt-[6px] ${expandedValue >= 0 ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}>
                {fmtCurrency(expandedValue)}
                <span className="text-[15px] text-[#565250]"> / yr</span>
              </div>
              {netAnnualValue > 0 ? (
                <>
                  <div className="text-[13px] text-[#565250] mt-2">
                    {annualInvestment > 0 && (
                      <><b className="font-abridge font-normal text-[#1A1A1A]">{expandedRoi.toFixed(1)}×</b> return · </>
                    )}
                    up from <b className="font-abridge font-normal text-[#1A1A1A]">{fmtCurrency(netAnnualValue)}</b> today
                  </div>
                  <div className="mt-[18px]">
                    <div className="mb-[10px]">
                      <div className="flex justify-between text-[12px] mb-[5px]">
                        <span className="text-[#565250]">Today · {fmtNumber(baselineCount)} {isNursing ? "beds" : "providers"}</span>
                        <span className="font-abridge text-[#1A1A1A]">{fmtCurrency(netAnnualValue)}</span>
                      </div>
                      <div className="h-2 bg-[#F2EFEA] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#F4A48C]" style={{ width: `${Math.max(4, (netAnnualValue / cmpMax) * 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[12px] mb-[5px]">
                        <span className="text-[#565250]">Expanded · {fmtNumber(expandedProviders)} {isNursing ? "beds" : "providers"}</span>
                        <span className="font-abridge text-[#1A1A1A]">{fmtCurrency(expandedValue)}</span>
                      </div>
                      <div className="h-2 bg-[#F2EFEA] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#EA2C00]" style={{ width: `${Math.max(4, (expandedValue / cmpMax) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                // Net is zero/negative: a bigger footprint only scales the same
                // shortfall, so a "× return · up from …" line would read as a win.
                <div className="text-[13px] text-[#565250] mt-2 leading-[1.5]">
                  At this scope the cost still exceeds the modeled value. Add {isNursing ? "beds" : "providers"} or adoption, or revisit pricing, to clear it.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 items-center flex-wrap">
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            disabled={noDriversEnabled}
            data-testid="ed-model-download"
            className="text-[14px] font-bold rounded-[12px] px-[22px] py-[13px] inline-flex items-center gap-[9px] bg-[#EA2C00] text-white shadow-[0_2px_6px_rgba(234,44,0,0.15)] disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            Download the model
          </button>
          {onAddToProforma && (
            <button
              type="button"
              onClick={handleAddToProforma}
              disabled={noDriversEnabled}
              data-testid="ed-model-add-proforma"
              className="text-[14px] font-bold rounded-[12px] px-[22px] py-[13px] inline-flex items-center gap-[9px] bg-white text-[#1A1A1A] border border-[#E7E3DD] disabled:opacity-40"
            >
              Take into a full proforma
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyLink}
            data-testid="ed-model-copy-link"
            className="text-[14px] font-bold rounded-[12px] px-[22px] py-[13px] inline-flex items-center gap-[9px] text-[#565250] border border-transparent"
          >
            <LinkIcon className="w-4 h-4" />
            Copy share link
          </button>
          <button type="button" onClick={onEdit} data-testid="ed-model-edit" className="text-[13px] text-[#7C766F] underline ml-1">
            Edit model
          </button>
          <p className="text-[12px] text-[#7C766F] max-w-[360px] leading-[1.5] ml-auto text-right">
            An estimate built from the figures you entered, not a guarantee. You confirm the real numbers as you measure.
          </p>
        </div>
      </div>

      <PDFExportModal open={showExportModal} onClose={() => setShowExportModal(false)} onExport={handleExportPDF} isExporting={isExporting} documentType="ROI model" />
    </EditorialShell>
  );
}
