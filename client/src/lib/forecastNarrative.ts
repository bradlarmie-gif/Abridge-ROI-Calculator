import type { ForecastCalibration, ForecastState } from "@/pages/forecast/types";
import type { ForecastResult } from "./forecastCalculator";
import { fmtCurrencyShort } from "@/pages/forecast/dashboard/charts/shared";
import { PRICING_MODEL_LABELS } from "@/pages/forecast/types";

function pluralize(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function monthLabel(m: number | null | undefined): string {
  if (m == null) return "outside the contract term";
  if (m <= 6) return `Month ${m}, ahead of most deployments`;
  if (m <= 12) return `Month ${m}, within the first year`;
  if (m <= 18) return `Month ${m}`;
  return `Month ${m}, in year ${Math.ceil(m / 12)}`;
}

export interface ForecastNarrative {
  heroSummary: string;
  breakEvenInsight: string;
  pricingInsight: string;
  adoptionInsight: string;
  topLeverRecommendation: string;
  bottomLine: string;
  driverInsights: Record<string, string>;
}

export function generateForecastNarrative(
  state: ForecastState,
  result: ForecastResult,
): ForecastNarrative {
  const partner = state.partnerName?.trim() || "this partner";
  const termYears = state.contractTermMonths / 12;
  const hasDrivers = state.valueDrivers.length > 0;
  const fromMeasure = state.importSource?.type === "measure";
  const kpis = result.kpis;
  const pricingLabel = PRICING_MODEL_LABELS[state.currentPricing.model];
  const yearWord = termYears === 1 ? "year" : "years";

  // Hero summary
  let heroSummary = "";
  if (!hasDrivers) {
    heroSummary = `${partner}'s ${termYears}-year contract totals ${fmtCurrencyShort(kpis.totalContractCost)} under ${pricingLabel} pricing. Add value drivers to model the full ROI picture.`;
  } else if (kpis.roiMultiple >= 3) {
    heroSummary = `${partner} is projecting a ${kpis.roiMultiple.toFixed(1)}x return: ${fmtCurrencyShort(kpis.totalContractValue)} in modeled value against ${fmtCurrencyShort(kpis.totalContractCost)} invested over ${termYears} ${yearWord}.${fromMeasure ? " Built on measured outcomes, not estimates." : ""}`;
  } else if (kpis.roiMultiple >= 1.5) {
    heroSummary = `${partner} is on track to generate ${fmtCurrencyShort(kpis.netContractValue)} in net value over ${termYears} ${yearWord}, a ${kpis.roiMultiple.toFixed(1)}x return on their Abridge investment.`;
  } else if (kpis.roiMultiple >= 1) {
    heroSummary = `${partner} reaches positive ROI but the margin is thin at ${kpis.roiMultiple.toFixed(1)}x. Explore pricing structures or adoption levers below to strengthen the case.`;
  } else {
    heroSummary = `Under current assumptions, ${partner} does not reach positive ROI within the ${termYears}-year term. Adjust adoption pace, pricing model, or value driver assumptions to find the path forward.`;
  }

  // Break-even insight
  let breakEvenInsight = "";
  if (!hasDrivers) {
    breakEvenInsight = "Add value drivers to calculate break-even.";
  } else if (kpis.fullBreakEvenMonth != null) {
    const monthsLeft = state.contractTermMonths - kpis.fullBreakEvenMonth;
    breakEvenInsight = `${partner} recovers their full investment at ${monthLabel(kpis.fullBreakEvenMonth)}, leaving ${pluralize(monthsLeft, "month")} of pure value creation before contract end.`;
  } else {
    breakEvenInsight = `Break-even doesn't occur within the ${termYears}-year term under current assumptions. Consider a longer contract, accelerated adoption, or a different pricing structure.`;
  }

  // Pricing insight
  let pricingInsight = "";
  if (state.comparisonPricing.length === 0) {
    pricingInsight = `Currently modeled at ${pricingLabel}. Add an alternative pricing structure below to see the financial tradeoffs side by side.`;
  } else {
    const altEntries = Object.entries(result.alternateKpis ?? {});
    const bestEntry = altEntries.reduce<[string, typeof kpis] | null>(
      (best, [id, k]) =>
        !best || k.netContractValue > best[1].netContractValue ? [id, k] : best,
      null,
    );
    if (bestEntry) {
      const [bestId, bestKpis] = bestEntry;
      const diff = bestKpis.netContractValue - kpis.netContractValue;
      const bestComp =
        state.comparisonPricing.find((c) => c.id === bestId) ?? state.comparisonPricing[0];
      const altLabel = PRICING_MODEL_LABELS[bestComp.pricing.model];
      if (diff > 0) {
        pricingInsight = `${altLabel} pricing generates ${fmtCurrencyShort(Math.abs(diff))} more in net value over ${termYears} ${yearWord}. Worth a conversation about restructuring the deal.`;
      } else {
        pricingInsight = `Current ${pricingLabel} pricing outperforms alternatives by ${fmtCurrencyShort(Math.abs(diff))} over the term. The existing structure is working in ${partner}'s favor.`;
      }
    }
  }

  // Adoption insight
  const shareVals = state.encounterShareCurve.values;
  const finalShare = shareVals.length > 0 ? shareVals[shareVals.length - 1] : 0;
  const initialShare = shareVals.length > 0 ? shareVals[0] : 0;
  let adoptionInsight = "";
  if (initialShare > 0 && finalShare > initialShare * 1.3) {
    adoptionInsight = `Encounter share is projected to grow from ${initialShare.toFixed(0)}% to ${finalShare.toFixed(0)}% over the term, a ${((finalShare / initialShare - 1) * 100).toFixed(0)}% expansion in Abridge reach. This growth drives compounding value.`;
  } else {
    adoptionInsight = `Encounter share is holding near ${initialShare.toFixed(0)}%. Modeling an expansion in coverage could significantly improve the long-term value story.`;
  }

  // Top lever recommendation
  let topLeverRecommendation = "";
  if (!hasDrivers) {
    topLeverRecommendation = "Import a Measure session or add value drivers to unlock lever recommendations.";
  } else if (kpis.fullBreakEvenMonth == null) {
    topLeverRecommendation = `The single biggest lever is adoption pace: increasing encounter share from ${initialShare.toFixed(0)}% to ${Math.min(100, initialShare + 20).toFixed(0)}% would materially accelerate break-even. Try adjusting the encounter share curve in the Growth section.`;
  } else if (kpis.roiMultiple < 2) {
    const workforceDrivers = state.valueDrivers.filter((d) => d.domain === "workforce");
    const revenueDrivers = state.valueDrivers.filter((d) => d.domain === "revenue");
    if (revenueDrivers.length === 0) {
      topLeverRecommendation = "Adding a revenue driver (wRVU lift, E/M level improvement, or denial reduction) would meaningfully strengthen the ROI multiple. These tend to be the highest-value levers for outpatient.";
    } else if (workforceDrivers.length === 0) {
      topLeverRecommendation = "A workforce retention driver would add significant long-term value that compounds over the contract. Provider replacement costs ($150K–$300K per departure) make even small retention gains financially meaningful.";
    } else {
      topLeverRecommendation = "The current model is solid. To push the multiple higher, revisit your realization rates. Even moving from 70% to 80% realization adds meaningful value at scale.";
    }
  } else {
    topLeverRecommendation = `The ROI story is compelling at ${kpis.roiMultiple.toFixed(1)}x. Focus the conversation on contract structure, specifically whether the current pricing model captures value fairly as ${partner} scales.`;
  }

  // Bottom line
  let bottomLine = "";
  if (!hasDrivers) {
    bottomLine = `Add value drivers to generate the executive summary.`;
  } else {
    bottomLine = `Bottom line: ${heroSummary} ${breakEvenInsight} ${topLeverRecommendation}`;
  }

  // Per-driver insights
  const driverInsights: Record<string, string> = {};
  for (const d of state.valueDrivers) {
    const ci = d.clinicalInputs;
    if (!ci) {
      const unit = d.scalingUnit === "perEncounter" ? "encounter"
        : d.scalingUnit === "perActiveUser" ? "active provider per month"
        : "unit";
      driverInsights[d.id] = `Estimated at ${fmtCurrencyShort(d.projectedDelta)} per ${unit}.`;
      continue;
    }
    switch (ci.formulaType) {
      case "timeSavingsWorkforce":
      case "workOutsideHoursReduction": {
        const minDelta = Math.abs((ci.metricAfter ?? 0) - (ci.metricBefore ?? 0));
        const annualHrs = (minDelta / 60) * ((state.abridgeEncountersLTM || 0) / (state.activeUsersToday || 1));
        driverInsights[d.id] = `Providers save ${minDelta.toFixed(0)} min/encounter, or ${annualHrs.toFixed(0)} hours per provider per year returned from documentation.`;
        break;
      }
      case "wrvuLift": {
        const delta = Math.abs((ci.metricAfter ?? 0) - (ci.metricBefore ?? 0));
        driverInsights[d.id] = `A ${delta.toFixed(2)} wRVU improvement per encounter at $${ci.factor1Value ?? 33}/wRVU. Better documentation captures work that was already being done.`;
        break;
      }
      case "timeSavingsCapacity": {
        const minDelta = Math.abs((ci.metricAfter ?? 0) - (ci.metricBefore ?? 0));
        const visitMin = ci.factor1Value ?? 30;
        const extraVisits = visitMin > 0 ? minDelta / visitMin : 0;
        driverInsights[d.id] = `${minDelta.toFixed(0)} min saved per encounter enables ~${extraVisits.toFixed(2)} additional visits per provider per encounter, at $${ci.factor2Value ?? 200}/visit.`;
        break;
      }
      case "cmiLift": {
        const delta = Math.abs((ci.metricAfter ?? 0) - (ci.metricBefore ?? 0));
        driverInsights[d.id] = `A ${delta.toFixed(3)} CMI improvement reflects more complete inpatient documentation. Each CMI point is worth ~$${ci.factor1Value?.toLocaleString() ?? "1,500"} at scale.`;
        break;
      }
      case "retentionLift": {
        driverInsights[d.id] = `Reducing provider turnover avoids recruiting and onboarding costs estimated at $${(ci.factor1Value ?? 150000).toLocaleString()} per departure. Long-term, compounding value.`;
        break;
      }
      case "denialReduction": {
        const delta = Math.abs((ci.metricAfter ?? 0) - (ci.metricBefore ?? 0));
        driverInsights[d.id] = `A ${delta.toFixed(1)}pp improvement in clean claim rate at $${ci.factor1Value ?? 350} average claim value. Documentation quality directly reduces first-pass denials.`;
        break;
      }
      case "emLevelLift": {
        const delta = Math.abs((ci.metricAfter ?? 0) - (ci.metricBefore ?? 0));
        driverInsights[d.id] = `A ${delta.toFixed(2)}-level improvement in average E/M coding. More complete notes support accurate level selection. This is revenue that was earned but not captured.`;
        break;
      }
      default: {
        const unit = d.scalingUnit === "perEncounter" ? "encounter" : "unit";
        driverInsights[d.id] = `Contributing ${fmtCurrencyShort(d.projectedDelta)} per ${unit} to the ${d.domain} value domain.`;
      }
    }
  }

  return {
    heroSummary,
    breakEvenInsight,
    pricingInsight,
    adoptionInsight,
    topLeverRecommendation,
    bottomLine,
    driverInsights,
  };
}

export function generateCalibrationChangeSentence(
  field: keyof ForecastCalibration,
  oldVal: number,
  newVal: number,
  netValueDelta: number,
): string {
  const labels: Record<keyof ForecastCalibration, string> = {
    otHourlyRate: "OT hourly rate",
    wrvuConversionFactor: "wRVU conversion factor",
    revenuePerVisit: "revenue per visit",
    minutesPerVisit: "avg visit length",
    avgClaimValue: "avg claim value",
    nursingHourlyRate: "nursing hourly rate",
    providerReplacementCost: "provider replacement cost",
  };
  const dir = newVal > oldVal ? "↑" : "↓";
  const valSign = netValueDelta >= 0 ? "+" : "";
  return `${labels[field]} ${dir} → net value ${valSign}${fmtCurrencyShort(netValueDelta)} over term`;
}
