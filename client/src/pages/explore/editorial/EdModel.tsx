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
  drgAccuracy: "immediate",
  obsDefense: "immediate",
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

  const crossMonthFrac = useMemo(() => {
    if (annualInvestment <= 0) return 0;
    for (let m = 1; m <= 12; m++) {
      if (rampPoints[m].value >= annualInvestment) {
        const prev = rampPoints[m - 1].value;
        const cur = rampPoints[m].value;
        const frac = cur === prev ? 0 : (annualInvestment - prev) / (cur - prev);
        return (m - 1) + Math.max(0, Math.min(1, frac));
      }
    }
    return null; // doesn't clear cost within the 12-month window
  }, [rampPoints, annualInvestment]);

  // Chart geometry — viewBox 0 0 640 250, matching the locked mockup.
  const chartX = (month: number) => 40 + (month / 12) * 580;
  const chartY = (value: number) => (totalAnnualValue > 0 ? 220 - Math.max(0, Math.min(1, value / totalAnnualValue)) * 185 : 220);
  const linePath = rampPoints.map((p) => `${p.month === 0 ? "M" : "L"}${chartX(p.month).toFixed(1)},${chartY(p.value).toFixed(1)}`).join(" ");
  const areaPath = `M40,220 ${rampPoints.map((p) => `L${chartX(p.month).toFixed(1)},${chartY(p.value).toFixed(1)}`).join(" ")} L620,220 Z`;
  const investmentY = totalAnnualValue > 0 ? 220 - Math.max(0, Math.min(1, annualInvestment / totalAnnualValue)) * 185 : 200;
  const crossX = crossMonthFrac !== null ? chartX(crossMonthFrac) : null;

  // ───── Quadrant contribution bars ─────
  const quadrantMax = Math.max(valueByQuadrant.Revenue, valueByQuadrant.Capacity, valueByQuadrant.Workforce, 1);
  const quadrantBars: { name: string; value: number; dim?: boolean; fillClass: string }[] = [
    { name: "Revenue", value: valueByQuadrant.Revenue, fillClass: "bg-[#EA2C00]" },
    { name: "Capacity", value: valueByQuadrant.Capacity, fillClass: "bg-[#F0704E]" },
    { name: "Workforce", value: valueByQuadrant.Workforce, fillClass: "bg-[#F4A48C]" },
  ];

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
  const expandedValue = Math.round(netAnnualValue * expansionMultiplier);
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
      annualValue: totalAnnualValue,
      timeValue: exploreTotals.efficiencyValue,
      docValue: exploreTotals.documentationValue,
      retentionValue: Math.round(retentionValue),
      totalHoursSaved,
      drivers,
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
      capacityValue: valueByQuadrant.Capacity,
      workforceValue: valueByQuadrant.Workforce,
      revenueValue: valueByQuadrant.Revenue,
      qualityValue: valueByQuadrant.Quality,
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
        valuePerProvider: baselineCount > 0 ? Math.round(netAnnualValue / baselineCount) : 0,
        ...(expandedProviders > baselineCount || expandedUtilization > state.utilizationPercent
          ? {
              expansionProviders: expandedProviders,
              expansionUtilizationPercent: expandedUtilization,
              expansionAnnualValue: expandedValue,
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
      <EditorialHeader stepName="Your Model" stepIndex={9} onBack={onBack} />
      <div className="max-w-[1160px] mx-auto px-12 pt-[44px] pb-[60px]">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#5E534A]">Explore · Step 9 of 9</div>
        <h1 className="font-abridge text-[38px] leading-[1.06] text-[#1A1A1A] mt-[10px]">Your model.</h1>
        <p className="text-[16px] text-[#5E534A] mt-[13px] max-w-[620px] leading-[1.5]">
          The whole picture, built from your numbers. Ready to share, or take into a full proforma.
        </p>

        {/* Hero recap */}
        <div className="bg-[#FDFBF8] border border-[#DED5C8] rounded-[20px] p-[26px_30px] mt-[30px] flex justify-between items-center gap-[30px] flex-wrap">
          <div>
            <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#2E2822]">Net annual value</div>
            <div className="font-abridge text-[54px] text-[#EA2C00] leading-none mt-[7px]">
              {fmtCurrency(netAnnualValue)}
              <span className="text-[17px] text-[#5E534A]"> / yr</span>
            </div>
            <div className="inline-flex items-center gap-[9px] mt-[13px] bg-[#FFEDE7] border border-[#F5D3C8] rounded-full px-[15px] py-[8px]">
              <span className="font-abridge text-[19px] text-[#EA2C00]">{roi.toFixed(1)}×</span>
              <span className="text-[12.5px] font-bold text-[#B02200]">≈ ${netPerDollar.toFixed(2)} net back for every $1 spent</span>
            </div>
          </div>
          <div className="flex gap-[30px] flex-wrap">
            <div>
              <div className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-[#786C5E]">Total value</div>
              <div className="font-abridge text-[22px] text-[#1A1A1A] mt-[5px]">{fmtCurrency(totalAnnualValue)}</div>
            </div>
            <div>
              <div className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-[#786C5E]">Investment</div>
              <div className="font-abridge text-[22px] text-[#1A1A1A] mt-[5px]">{fmtCurrency(annualInvestment)}</div>
            </div>
            <div>
              <div className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-[#786C5E]">Scope</div>
              <div className="font-abridge text-[15px] text-[#1A1A1A] mt-[5px]">
                {fmtNumber(baselineCount)} {isNursing ? "beds" : "providers"} · {careSettingLabel}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1.42fr_1fr] gap-[22px] mt-[22px] items-stretch">
          {/* Ramp chart */}
          <div className="bg-[#FDFBF8] border border-[#DED5C8] rounded-[20px] p-[22px_24px]">
            <div className="text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#2E2822] mb-[6px]">When it lands</div>
            <p className="text-[12.5px] text-[#5E534A] mb-[14px] leading-[1.5]">
              {crossMonthFrac !== null
                ? <>Value ramps as adoption grows. It clears the cost by month {Math.max(1, Math.ceil(crossMonthFrac))}, then climbs to full run-rate.</>
                : <>Value ramps as adoption grows toward full run-rate.</>}
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
                  <line x1="40" y1="220" x2="620" y2="220" stroke="#DED5C8" strokeWidth="1" />
                  <path d={areaPath} fill="url(#edModelRampGradient)" />
                  <path d={linePath} fill="none" stroke="#EA2C00" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                  <line x1="40" y1={investmentY} x2="620" y2={investmentY} stroke="#9C8E7E" strokeWidth="1.6" strokeDasharray="5 4" />
                  {crossX !== null && (
                    <>
                      <line x1={crossX} y1={investmentY} x2={crossX} y2="220" stroke="#C9BCA9" strokeWidth="1" strokeDasharray="3 3" />
                      <circle cx={crossX} cy={investmentY} r="4.5" fill="#fff" stroke="#EA2C00" strokeWidth="2.5" />
                      <text x={Math.max(44, crossX - 58)} y={investmentY - 10} fontFamily="Manrope" fontSize="11" fontWeight="700" fill="#B02200">
                        clears the cost · Mo {Math.max(1, Math.ceil(crossMonthFrac ?? 1))}
                      </text>
                    </>
                  )}
                  <circle cx="620" cy="35.5" r="4" fill="#EA2C00" />
                  <text x="588" y="27" fontFamily="Manrope" fontSize="11" fontWeight="700" fill="#B02200" textAnchor="middle">full run-rate</text>
                  <text x="40" y="238" fontFamily="Manrope" fontSize="11" fill="#786C5E">Mo 1</text>
                  <text x="330" y="238" fontFamily="Manrope" fontSize="11" fill="#786C5E" textAnchor="middle">Mo 6</text>
                  <text x="620" y="238" fontFamily="Manrope" fontSize="11" fill="#786C5E" textAnchor="end">Mo 12</text>
                  <text x="620" y="49" fontFamily="Manrope" fontSize="10.5" fontWeight="700" fill="#B02200" textAnchor="end">{fmtShort(totalAnnualValue)}</text>
                </svg>
                <div className="flex gap-5 mt-3">
                  <div className="flex items-center gap-[7px] text-[12px] text-[#5E534A]">
                    <span className="w-[14px] h-[3px] rounded-[2px] bg-[#EA2C00] inline-block" />
                    Value run-rate
                  </div>
                  <div className="flex items-center gap-[7px] text-[12px] text-[#5E534A]">
                    <span className="w-[14px] h-[3px] rounded-[2px] bg-[#9C8E7E] inline-block" />
                    Investment {fmtShort(annualInvestment)} / yr
                  </div>
                </div>
              </>
            ) : (
              <div className="text-[13px] text-[#786C5E] py-10 text-center">
                Add value drivers in the prior steps to see when this clears the cost.
              </div>
            )}
          </div>

          {/* Quadrant breakdown */}
          <div className="bg-[#FDFBF8] border border-[#DED5C8] rounded-[20px] p-[22px_24px] flex flex-col">
            <div className="text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#2E2822] mb-[6px]">Where the value comes from</div>
            <p className="text-[12.5px] text-[#5E534A] mb-[14px] leading-[1.5]">Across the four areas you modeled.</p>
            <div className="flex-1 flex flex-col justify-between gap-4">
              {quadrantBars.map((bar) => (
                <div key={bar.name}>
                  <div className="flex justify-between items-baseline mb-[7px]">
                    <span className="text-[13.5px] font-bold text-[#1A1A1A]">{bar.name}</span>
                    <span className="font-abridge text-[15px] text-[#1A1A1A]">{fmtCurrency(bar.value)}</span>
                  </div>
                  <div className="h-[9px] bg-[#F1EBE3] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${bar.fillClass}`} style={{ width: `${Math.max(bar.value > 0 ? 4 : 0, (bar.value / quadrantMax) * 100)}%` }} />
                  </div>
                </div>
              ))}
              <div>
                <div className="flex justify-between items-baseline mb-[7px]">
                  <span className="text-[13.5px] font-bold text-[#1A1A1A]">Quality</span>
                  <span className="text-[12px] text-[#786C5E] italic">proof, counted in Revenue</span>
                </div>
                <div className="h-[9px] bg-transparent rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Model your expansion */}
        <div className="bg-[#FDFBF8] border border-[#DED5C8] rounded-[20px] p-[22px_24px] mt-[22px]">
          <div className="text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#2E2822] mb-[6px]">Model your expansion</div>
          <p className="text-[12.5px] text-[#5E534A] mb-5 leading-[1.5]">
            Where this goes as you roll out to more {isNursing ? "beds" : "providers"} and higher adoption. Same math, larger footprint.
          </p>
          <div className="grid grid-cols-[1fr_1.15fr] gap-[30px] items-center">
            <div>
              {/* Providers slider */}
              <div className="mb-[26px]">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[10.5px] font-extrabold tracking-[0.04em] uppercase text-[#2E2822]">{isNursing ? "Beds" : "Providers"}</div>
                    <div className="text-[12.5px] text-[#786C5E] mt-[5px]">{fmtNumber(baselineCount)} today</div>
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
                <div className="relative h-2 bg-[#F1EBE3] rounded-full my-[22px] mr-[6px]">
                  <div className="absolute left-0 top-0 h-full bg-[#E4D9CC] rounded-full" style={{ width: `${providersTodayPct}%` }} />
                  <div className="absolute top-0 h-full bg-[#EA2C00] rounded-full" style={{ left: `${providersTodayPct}%`, width: `${Math.max(0, providersPct - providersTodayPct)}%` }} />
                  <div className="absolute -top-1 w-[2px] h-4 bg-[#B4A99B]" style={{ left: `${providersTodayPct}%`, transform: "translateX(-50%)" }} />
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
                  <span className="text-[12px] text-[#5E534A]">
                    <b className="text-[#EA2C00] font-bold">+{fmtNumber(Math.max(0, expandedProviders - baselineCount))} {isNursing ? "beds" : "providers"}</b> vs today
                  </span>
                  <span className="text-[12px] text-[#786C5E] whitespace-nowrap">
                    full {isNursing ? "unit" : "team"} · <span className="text-[#5E534A] font-bold">{fmtNumber(expandedProviders)}</span>
                  </span>
                </div>
              </div>

              {/* Adoption slider */}
              <div>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[10.5px] font-extrabold tracking-[0.04em] uppercase text-[#2E2822]">Adoption</div>
                    <div className="text-[12.5px] text-[#786C5E] mt-[5px]">{state.utilizationPercent}% today</div>
                  </div>
                  <div className="inline-flex items-baseline gap-[1px] border border-[#EFB6A6] rounded-[10px] px-[13px] py-[4px] bg-white shadow-[0_0_0_1px_#F5D3C8]">
                    <FormattedNumberInput
                      value={expandedUtilization}
                      onChange={(v) => setExpandedUtilization(v)}
                      onBlurValue={(v) => setExpandedUtilization(Math.min(Math.max(v, state.utilizationPercent), 100))}
                      className="font-abridge text-[23px] text-[#EA2C00] leading-none border-0 h-auto p-0 shadow-none w-12 text-right focus-visible:ring-0"
                      data-testid="ed-model-input-adoption"
                    />
                    <span className="text-[13px] text-[#5E534A]">%</span>
                  </div>
                </div>
                <div className="relative h-2 bg-[#F1EBE3] rounded-full my-[22px] mr-[6px]">
                  <div className="absolute left-0 top-0 h-full bg-[#E4D9CC] rounded-full" style={{ width: `${adoptionTodayPct}%` }} />
                  <div className="absolute top-0 h-full bg-[#EA2C00] rounded-full" style={{ left: `${adoptionTodayPct}%`, width: `${Math.max(0, adoptionPct - adoptionTodayPct)}%` }} />
                  <div className="absolute -top-1 w-[2px] h-4 bg-[#B4A99B]" style={{ left: `${adoptionTodayPct}%`, transform: "translateX(-50%)" }} />
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
                  <span className="text-[12px] text-[#5E534A]">
                    <b className="text-[#EA2C00] font-bold">+{Math.max(0, Math.round(expandedUtilization - state.utilizationPercent))} points</b> vs today
                  </span>
                  <span className="text-[12px] text-[#786C5E] whitespace-nowrap">
                    full adoption · <span className="text-[#5E534A] font-bold">100%</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="border-l border-[#DED5C8] pl-[30px]">
              <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#2E2822]">Projected net value at that scope</div>
              <div className="font-abridge text-[42px] text-[#EA2C00] leading-none mt-[6px]">
                {fmtCurrency(expandedValue)}
                <span className="text-[15px] text-[#5E534A]"> / yr</span>
              </div>
              <div className="text-[13px] text-[#5E534A] mt-2">
                <b className="font-abridge font-normal text-[#1A1A1A]">{expandedRoi.toFixed(1)}×</b> return · up from <b className="font-abridge font-normal text-[#1A1A1A]">{fmtCurrency(netAnnualValue)}</b> today
              </div>
              <div className="mt-[18px]">
                <div className="mb-[10px]">
                  <div className="flex justify-between text-[12px] mb-[5px]">
                    <span className="text-[#5E534A]">Today · {fmtNumber(baselineCount)} {isNursing ? "beds" : "providers"}</span>
                    <span className="font-abridge text-[#1A1A1A]">{fmtCurrency(netAnnualValue)}</span>
                  </div>
                  <div className="h-2 bg-[#F1EBE3] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#F4A48C]" style={{ width: `${Math.max(4, (netAnnualValue / cmpMax) * 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[12px] mb-[5px]">
                    <span className="text-[#5E534A]">Expanded · {fmtNumber(expandedProviders)} {isNursing ? "beds" : "providers"}</span>
                    <span className="font-abridge text-[#1A1A1A]">{fmtCurrency(expandedValue)}</span>
                  </div>
                  <div className="h-2 bg-[#F1EBE3] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#EA2C00]" style={{ width: `${Math.max(4, (expandedValue / cmpMax) * 100)}%` }} />
                  </div>
                </div>
              </div>
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
              className="text-[14px] font-bold rounded-[12px] px-[22px] py-[13px] inline-flex items-center gap-[9px] bg-white text-[#1A1A1A] border border-[#DED5C8] disabled:opacity-40"
            >
              Take into a full proforma
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleCopyLink}
            data-testid="ed-model-copy-link"
            className="text-[14px] font-bold rounded-[12px] px-[22px] py-[13px] inline-flex items-center gap-[9px] text-[#5E534A] border border-transparent"
          >
            <LinkIcon className="w-4 h-4" />
            Copy share link
          </button>
          <button type="button" onClick={onEdit} data-testid="ed-model-edit" className="text-[13px] text-[#786C5E] underline ml-1">
            Edit model
          </button>
          <p className="text-[12px] text-[#786C5E] max-w-[360px] leading-[1.5] ml-auto text-right">
            An estimate built from the figures you entered, not a guarantee. You confirm the real numbers as you measure.
          </p>
        </div>
      </div>

      <PDFExportModal open={showExportModal} onClose={() => setShowExportModal(false)} onExport={handleExportPDF} isExporting={isExporting} documentType="ROI model" />
    </EditorialShell>
  );
}
