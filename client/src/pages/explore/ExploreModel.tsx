import { useMemo, useState } from "react";
import { Download, ChevronDown, ChevronUp, Edit, FileText, TrendingUp, Link, BarChart3, Check, AlertTriangle, Sparkles, FileCheck, Loader2, Layers, Users, Clock, DollarSign, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type ExploreState, type OtherFinancialBenefitItem } from "./ExploreFlow";
import { EXPLORE_DRIVERS, isDriverEnabled, type ExploreQuadrant } from "@/lib/exploreDrivers";
import { PDFExportModal } from "@/components/switch/PDFExportModal";
import { useToast } from "@/hooks/use-toast";
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { generateExplorePDF, type ExplorePDFData } from "@/components/explore/ExplorePDFExport";
import type { ProformaSettingSnapshot } from "@/pages/proforma/proformaTypes";
import { SETTING_COLORS, SETTING_LABELS } from "@/pages/proforma/proformaTypes";

interface ExploreModelProps {
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
}

export default function ExploreModel({
  state,
  updateState,
  totalHoursSaved,
  timeValue,
  docValue,
  annualInvestment,
  onEdit,
  onHome,
  onBack,
  onAddToProforma,
  onStepClick,
  stepLabels,
}: ExploreModelProps) {
  const [showMethodology, setShowMethodology] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const { toast } = useToast();

  const isNursingForTotal = state.careSetting === 'nursing';

  // ───── Per-quadrant value calculations ─────

  const allDriverValues = useMemo(() => {
    const result: Record<string, number> = {};
    const td = state.timeDriverInputs as any;
    const dq = state.docQualityInputs as any;
    const setting = state.careSetting;
    const eligibleEncounters = Math.round(state.annualEncounters * (state.utilizationPercent / 100));
    const isED = setting === 'ed';
    const isIP = setting === 'inpatient';
    const isOP = setting === 'outpatient';
    const isNursing = setting === 'nursing';
    const isPhysician = isOP || isED || isIP;

    // ─── Capacity ───
    if (isOP && td.patientAccessEnabled) {
      const eff = Math.min(td.accessProviders || state.numberOfProviders, state.numberOfProviders);
      const hrsPerProvWk = state.numberOfProviders > 0 ? totalHoursSaved / state.numberOfProviders / 48 : 0;
      const reinvest = (td.capacityRealizationPercent ?? 25) / 100;
      const visitHrs = (td.visitDuration ?? 30) / 60;
      const visitsPerWk = visitHrs > 0 ? Math.round((hrsPerProvWk * reinvest / visitHrs) * 10) / 10 : 0;
      result.patientAccess = Math.round(visitsPerWk * eff * 48 * td.revenuePerVisit);
    }
    if (isED && td.edLwbsEnabled) {
      const lwbs = state.annualEncounters * (td.edLwbsRate / 100);
      const recovered = lwbs * (td.edLwbsReduction / 100);
      result.lwbsRecovery = Math.round(recovered * td.edRevenuePerVisit * (td.edLwbsRealization / 100));
      if (td.edThroughputEnabled) {
        const adm = recovered * (td.edAdmissionRate / 100);
        result.admissionCapture = Math.round(adm * td.edAdmissionRevenue * (td.edAdmissionRealization / 100));
      }
    }

    // ─── Workforce ───
    const retentionScenarios: Record<string, number> = { conservative: 5, typical: 10, optimistic: 15 };
    const nursingScenariosWf: Record<string, number> = { conservative: 10, typical: 15, optimistic: 25 };
    if (isPhysician && td.wellbeingEnabled && td.calculateRetentionValue) {
      const turnover = td.annualTurnoverRate / 100;
      const burnout = td.burnoutRelatedTurnover / 100;
      const impact = retentionScenarios[td.retentionImpactScenario] / 100;
      const retained = state.numberOfProviders * turnover * burnout * impact;
      result.providerWellbeing = Math.round(retained * td.replacementCost);
      if (td.physicianAgencyEnabled) {
        result.physicianLocumAgency = Math.round(retained * td.physicianAgencyWeeksPerVacancy * td.physicianAgencyWeeklyPremium);
      }
    }
    if (isNursing && td.nursingRetentionEnabled) {
      const turnover = td.nursingTurnoverRate / 100;
      const impact = nursingScenariosWf[td.retentionImpactScenario] / 100;
      const burnoutDep = state.numberOfProviders * turnover * 0.40;
      const retained = burnoutDep * impact;
      result.nursingRetention = Math.round(retained * td.nursingReplacementCost);
      if (td.nursingAgencyEnabled) {
        result.nursingAgency = Math.round(retained * td.nursingAgencyWeeksPerVacancy * td.nursingAgencyWeeklyPremium);
      }
    }
    if (isNursing && td.nursingOtEnabled) {
      const otHrs = td.nursingOtHoursPerNurseWeek * (td.nursingOtReductionPercent / 100) * state.numberOfProviders * 52;
      result.nursingOvertime = Math.round(otHrs * td.nursingOtHourlyRate);
    }

    // ─── Revenue ───
    const wrvuScenariosLocal: Record<string, number> = isED ? { conservative: 1, typical: 2.5, aggressive: 4 } : { conservative: 2, typical: 5, aggressive: 7 };
    const denialsScenariosLocal: Record<string, number> = isED ? { conservative: 15, typical: 30, aggressive: 50 } : { conservative: 25, typical: 50, aggressive: 75 };
    const hccScenariosLocal: Record<string, number> = { conservative: 6, typical: 10, aggressive: 15 };

    if (dq.wrvuEnabled && (isOP || isED)) {
      const lift = (dq.currentWrvu * wrvuScenariosLocal[dq.wrvuScenario]) / 100;
      const value = eligibleEncounters * lift * dq.conversionFactor * (dq.wrvuRealization / 100);
      if (isED) result.edEmLevel = Math.round(value);
      else result.wrvu = Math.round(value);
    }
    if (dq.hccEnabled && isOP) {
      const recap = hccScenariosLocal[dq.hccScenario] / 100;
      const ma = state.numberOfProviders * dq.panelSize * (dq.maPercent / 100);
      const gap = ma * (dq.gapRate / 100);
      const recaptured = gap * recap;
      result.hccCapture = Math.round(recaptured * dq.avgHccs * dq.rafImpact * dq.annualPayment * (dq.hccRealization / 100));
    }
    if (dq.denialsEnabled && (isOP || isED)) {
      const prev = denialsScenariosLocal[dq.denialsScenario] / 100;
      const tot = eligibleEncounters * (dq.denialRate / 100);
      const unapp = tot * (dq.unappealableRate / 100);
      result.denialPrevention = Math.round(unapp * prev * dq.avgClaimValue * (dq.denialsRealization / 100));
    }
    if (isIP && dq.ipDrgEnabled) {
      const protectScenarios: Record<string, number> = { conservative: 15, typical: 20, aggressive: 25 };
      const pct = protectScenarios[dq.ipDrgScenario] / 100;
      const atRisk = eligibleEncounters * (dq.ipDrgAtRiskRate / 100);
      result.drgAccuracy = Math.round(atRisk * pct * dq.ipDrgWeightIncrease * dq.ipDrgBasePayment * (dq.ipDrgRealization / 100));
    }
    if (isIP && dq.ipCdiEnabled) {
      const cdiScenarios: Record<string, number> = { conservative: 15, typical: 25, aggressive: 35 };
      const pct = cdiScenarios[dq.ipCdiScenario] / 100;
      const queries = eligibleEncounters * (dq.ipCdiQueryRate / 100);
      result.cdiQueryReduction = Math.round(queries * pct * dq.ipCdiCostPerQuery * (dq.ipCdiRealization / 100));
    }
    if (isIP && dq.ipObsDefenseEnabled) {
      const gross = eligibleEncounters * (dq.ipObsDefenseDenialRate / 100) * dq.ipObsDefenseClaimValue * (dq.ipObsDefenseDocContribution / 100);
      result.obsDefense = Math.round(gross * (dq.ipObsDefenseRealization / 100));
    }
    if (isIP && dq.ipEmCodingEnabled) {
      const losVal = (state as any).ipAvgLengthOfStay ?? 4.5;
      const progressPerAdm = Math.max(losVal - 2, 1);
      const totalCharges = eligibleEncounters * (1 + progressPerAdm + dq.ipEmCodingConsultsPerAdmission);
      const gapMap: Record<string, number> = { conservative: 8, typical: 12, optimistic: 18 };
      const gapPct = (gapMap[dq.ipEmCodingGapScenario] ?? 12) / 100;
      result.emCodingAccuracy = Math.round(totalCharges * gapPct * dq.ipEmCodingAvgRevenueLift * (dq.ipEmCodingRealization / 100));
    }

    // ─── Quality (Nursing only quantified) ───
    if (isNursing) {
      const patientDays = state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
      if (dq.nursingHapiEnabled) {
        const hapis = (patientDays / 1000) * dq.nursingHapiRate;
        result.nursingHapi = Math.round(hapis * (dq.nursingHapiPreventionRate / 100) * dq.nursingHapiCost);
      }
      if (dq.nursingFallsEnabled) {
        const falls = (patientDays / 1000) * dq.nursingFallsRate;
        result.nursingFalls = Math.round(falls * (dq.nursingFallsPreventionRate / 100) * dq.nursingFallsCost);
      }
      if (dq.nursingCautiEnabled) {
        const cathDays = patientDays * (dq.nursingCautiUtilizationRatio / 100);
        const cautis = (cathDays / 1000) * dq.nursingCautiRate;
        result.nursingCauti = Math.round(cautis * (dq.nursingCautiPreventionRate / 100) * dq.nursingCautiCost);
      }
      if (dq.nursingClabsiEnabled) {
        const lineDays = patientDays * (dq.nursingClabsiUtilizationRatio / 100);
        const clabsi = (lineDays / 1000) * dq.nursingClabsiRate;
        result.nursingClabsi = Math.round(clabsi * (dq.nursingClabsiPreventionRate / 100) * dq.nursingClabsiCost);
      }
      if (dq.nursingSepsisEnabled) {
        const sepsis = (patientDays / 1000) * dq.nursingSepsisRatePerThousand;
        const nonComp = sepsis * ((100 - dq.nursingSepsisCurrentCompliance) / 100);
        const docLag = nonComp * (dq.nursingSepsisDocLagPercent / 100);
        result.nursingSepsis = Math.round(docLag * dq.nursingSepsisExcessCostPerCase * (dq.nursingSepsisRealization / 100));
      }
    }

    return result;
  }, [state, totalHoursSaved]);

  const valueByQuadrant = useMemo(() => {
    const totals: Record<ExploreQuadrant, number> = { Capacity: 0, Workforce: 0, Revenue: 0, Quality: 0 };
    if (!state.careSetting) return totals;
    EXPLORE_DRIVERS.forEach(d => {
      if (d.settings.includes(state.careSetting!)) {
        totals[d.quadrant] += allDriverValues[d.id] || 0;
      }
    });
    return totals;
  }, [allDriverValues, state.careSetting]);

  const benefitsByQuadrant = useMemo(() => {
    const result: Record<ExploreQuadrant, { annual: number; oneTime: number; items: OtherFinancialBenefitItem[] }> = {
      Capacity: { annual: 0, oneTime: 0, items: [] },
      Workforce: { annual: 0, oneTime: 0, items: [] },
      Revenue: { annual: 0, oneTime: 0, items: [] },
      Quality: { annual: 0, oneTime: 0, items: [] },
    };
    (state.otherFinancialBenefits ?? []).forEach(b => {
      if (b.label.trim() && b.amount > 0) {
        const slot = result[b.quadrant];
        slot.items.push(b);
        if (b.type === 'annual') slot.annual += b.amount;
        else slot.oneTime += b.amount;
      }
    });
    return result;
  }, [state.otherFinancialBenefits]);

  const totalAnnualValue = useMemo(() => {
    const driverSum = Object.values(valueByQuadrant).reduce((s, v) => s + v, 0);
    const benefitSum = Object.values(benefitsByQuadrant).reduce((s, b) => s + b.annual, 0);
    return driverSum + benefitSum;
  }, [valueByQuadrant, benefitsByQuadrant]);

  const totalOneTimeValue = useMemo(() => {
    return Object.values(benefitsByQuadrant).reduce((s, b) => s + b.oneTime, 0);
  }, [benefitsByQuadrant]);

  // Preserve nursingCareQualityPotential as a derived value for downstream PDF consumers
  const nursingCareQualityPotential = isNursingForTotal ? valueByQuadrant.Quality : 0;

  const noDriversEnabled = totalAnnualValue === 0 && totalOneTimeValue === 0;
  const netAnnualValue = totalAnnualValue - annualInvestment;
  const roi = annualInvestment > 0 ? totalAnnualValue / annualInvestment : 0;
  const valuePerProvider = state.numberOfProviders > 0 ? Math.round(netAnnualValue / state.numberOfProviders) : 0;

  const hasQualitativeDrivers = useMemo(() => {
    const { timeDriverInputs: t, docQualityInputs: d } = state;
    if (state.careSetting === 'outpatient') return t.wellbeingEnabled && !t.calculateRetentionValue;
    if (state.careSetting === 'ed') return t.wellbeingEnabled && !t.calculateRetentionValue;
    if (state.careSetting === 'inpatient') return (t.wellbeingEnabled && !t.calculateRetentionValue) || t.ipRoundingEnabled;
    if (state.careSetting === 'nursing') return d.nursingHcahpsEnabled;
    return false;
  }, [state]);
  const isQualitativeOnly = totalAnnualValue === 0 && hasQualitativeDrivers;

  // Calculate patient access and cost reduction separately
  const { timeDriverInputs, docQualityInputs } = state;
  const isOutpatientSetting = state.careSetting === 'outpatient';
  
  const effectiveAccessProviders = Math.min(timeDriverInputs.accessProviders || state.numberOfProviders, state.numberOfProviders);

  const derivedVisitsPerWeek = useMemo(() => {
    if (state.numberOfProviders <= 0 || totalHoursSaved <= 0) return 0;
    const hrsPerProvPerWeek = totalHoursSaved / state.numberOfProviders / 48;
    const reinvestmentRate = (timeDriverInputs.capacityRealizationPercent ?? 25) / 100;
    const visitDurationHrs = (timeDriverInputs.visitDuration ?? 30) / 60;
    if (visitDurationHrs <= 0) return 0;
    return Math.round((hrsPerProvPerWeek * reinvestmentRate / visitDurationHrs) * 10) / 10;
  }, [totalHoursSaved, state.numberOfProviders, timeDriverInputs.capacityRealizationPercent, timeDriverInputs.visitDuration]);

  const patientAccessValue = useMemo(() => {
    if (!timeDriverInputs.patientAccessEnabled) return 0;
    const annualVisits = derivedVisitsPerWeek * effectiveAccessProviders * 48;
    return Math.round(annualVisits * timeDriverInputs.revenuePerVisit);
  }, [timeDriverInputs, effectiveAccessProviders, derivedVisitsPerWeek]);

  const isED = state.careSetting === 'ed';
  const costReductionValue = (!isOutpatientSetting && !isED && timeDriverInputs.costReductionEnabled) ? timeDriverInputs.estimatedCostReduction : 0;

  // ED-specific value calculations
  const edRecoveredPatients = useMemo(() => {
    const lwbsPatients = state.annualEncounters * (timeDriverInputs.edLwbsRate / 100);
    return lwbsPatients * (timeDriverInputs.edLwbsReduction / 100);
  }, [state.annualEncounters, timeDriverInputs.edLwbsRate, timeDriverInputs.edLwbsReduction]);

  const edLwbsValue = useMemo(() => {
    if (!timeDriverInputs.edLwbsEnabled) return 0;
    const grossValue = edRecoveredPatients * timeDriverInputs.edRevenuePerVisit;
    return Math.round(grossValue * (timeDriverInputs.edLwbsRealization / 100));
  }, [edRecoveredPatients, timeDriverInputs.edLwbsEnabled, timeDriverInputs.edRevenuePerVisit, timeDriverInputs.edLwbsRealization]);

  // Admission Capture uses LWBS recovered patients as base
  const edAdmissionCaptureValue = useMemo(() => {
    if (!timeDriverInputs.edThroughputEnabled || !timeDriverInputs.edLwbsEnabled) return 0;
    const admittedPatients = edRecoveredPatients * (timeDriverInputs.edAdmissionRate / 100);
    const grossValue = admittedPatients * timeDriverInputs.edAdmissionRevenue;
    return Math.round(grossValue * (timeDriverInputs.edAdmissionRealization / 100));
  }, [edRecoveredPatients, timeDriverInputs.edThroughputEnabled, timeDriverInputs.edLwbsEnabled, timeDriverInputs.edAdmissionRate, timeDriverInputs.edAdmissionRevenue, timeDriverInputs.edAdmissionRealization]);

  const isNursing = state.careSetting === 'nursing';

  // Doc value breakdown
  const eligibleEncounters = state.annualEncounters * (state.utilizationPercent / 100);
  const isEDForScenarios = state.careSetting === 'ed';
  const wrvuScenarios: Record<string, number> = isEDForScenarios
    ? { conservative: 1, typical: 2.5, aggressive: 4 }
    : { conservative: 2, typical: 5, aggressive: 7 };
  const hccScenarios: Record<string, number> = { conservative: 6, typical: 10, aggressive: 15 };
  const denialsScenarios: Record<string, number> = isEDForScenarios
    ? { conservative: 15, typical: 30, aggressive: 50 }
    : { conservative: 25, typical: 50, aggressive: 75 };

  const wrvuValue = useMemo(() => {
    if (!docQualityInputs.wrvuEnabled) return 0;
    const wrvuLiftPercent = wrvuScenarios[docQualityInputs.wrvuScenario];
    const wrvuLift = docQualityInputs.currentWrvu * (wrvuLiftPercent / 100);
    const totalWrvus = eligibleEncounters * wrvuLift;
    const grossValue = totalWrvus * docQualityInputs.conversionFactor;
    return Math.round(grossValue * (docQualityInputs.wrvuRealization / 100));
  }, [eligibleEncounters, docQualityInputs]);

  const hccValue = useMemo(() => {
    // HCC only applies to Outpatient
    const isOutpatient = state.careSetting === 'outpatient';
    if (!isOutpatient || !docQualityInputs.hccEnabled) return 0;
    const recapturePercent = hccScenarios[docQualityInputs.hccScenario];
    const maPatients = state.numberOfProviders * docQualityInputs.panelSize * (docQualityInputs.maPercent / 100);
    const gapPatients = maPatients * (docQualityInputs.gapRate / 100);
    const recaptured = gapPatients * (recapturePercent / 100);
    const hccsRecaptured = recaptured * docQualityInputs.avgHccs;
    const rafValue = hccsRecaptured * docQualityInputs.rafImpact * docQualityInputs.annualPayment;
    return Math.round(rafValue * (docQualityInputs.hccRealization / 100));
  }, [state.numberOfProviders, docQualityInputs]);

  const denialsValue = useMemo(() => {
    if (!docQualityInputs.denialsEnabled) return 0;
    const preventionPercent = denialsScenarios[docQualityInputs.denialsScenario];
    const totalDenials = eligibleEncounters * (docQualityInputs.denialRate / 100);
    const unappealable = totalDenials * (docQualityInputs.unappealableRate / 100);
    const prevented = unappealable * (preventionPercent / 100);
    return Math.round(prevented * docQualityInputs.avgClaimValue * (docQualityInputs.denialsRealization / 100));
  }, [eligibleEncounters, docQualityInputs]);

  // Inpatient-specific calculations
  const isInpatient = state.careSetting === 'inpatient';

  const retentionScenarios: Record<string, number> = { conservative: 5, typical: 10, optimistic: 15 };

  const clinicianRetentionValue = useMemo(() => {
    if (!timeDriverInputs.wellbeingEnabled || !timeDriverInputs.calculateRetentionValue) return 0;
    if (state.careSetting === 'nursing') return 0;
    const retentionPercent = retentionScenarios[timeDriverInputs.retentionImpactScenario] || 30;
    const providersLeaving = state.numberOfProviders * (timeDriverInputs.annualTurnoverRate / 100);
    const burnoutRelated = providersLeaving * (timeDriverInputs.burnoutRelatedTurnover / 100);
    const retained = burnoutRelated * (retentionPercent / 100);
    return Math.round(retained * timeDriverInputs.replacementCost);
  }, [state.numberOfProviders, state.careSetting, timeDriverInputs]);

  const ipWellbeingRetentionValue = clinicianRetentionValue;

  // Inpatient: DRG Accuracy Value
  const ipDrgValue = useMemo(() => {
    if (!isInpatient || !docQualityInputs.ipDrgEnabled) return 0;
    const ipDrgProtectionScenarios: Record<string, number> = { conservative: 15, typical: 20, aggressive: 25 };
    const protectionPercent = ipDrgProtectionScenarios[docQualityInputs.ipDrgScenario];
    const admissionsAtRisk = eligibleEncounters * (docQualityInputs.ipDrgAtRiskRate / 100);
    const admissionsProtected = admissionsAtRisk * (protectionPercent / 100);
    const grossValue = admissionsProtected * docQualityInputs.ipDrgWeightIncrease * docQualityInputs.ipDrgBasePayment;
    return Math.round(grossValue * (docQualityInputs.ipDrgRealization / 100));
  }, [isInpatient, eligibleEncounters, docQualityInputs]);

  // Inpatient: CDI Query Reduction Value
  const ipCdiValue = useMemo(() => {
    if (!isInpatient || !docQualityInputs.ipCdiEnabled) return 0;
    const ipCdiReductionScenarios: Record<string, number> = { conservative: 15, typical: 25, aggressive: 35 };
    const reductionPercent = ipCdiReductionScenarios[docQualityInputs.ipCdiScenario];
    const totalQueries = eligibleEncounters * (docQualityInputs.ipCdiQueryRate / 100);
    const queriesAvoided = totalQueries * (reductionPercent / 100);
    return Math.round(queriesAvoided * docQualityInputs.ipCdiCostPerQuery * (docQualityInputs.ipCdiRealization / 100));
  }, [isInpatient, eligibleEncounters, docQualityInputs]);

  const ipObsDefenseValue = useMemo(() => {
    if (!isInpatient || !docQualityInputs.ipObsDefenseEnabled) return 0;
    const gross = eligibleEncounters * (docQualityInputs.ipObsDefenseDenialRate / 100) * docQualityInputs.ipObsDefenseClaimValue * (docQualityInputs.ipObsDefenseDocContribution / 100);
    return Math.round(gross * (docQualityInputs.ipObsDefenseRealization / 100));
  }, [isInpatient, eligibleEncounters, docQualityInputs]);

  const ipEmCodingValue = useMemo(() => {
    if (!isInpatient || !docQualityInputs.ipEmCodingEnabled) return 0;
    const los = state.ipAvgLengthOfStay ?? 4.5;
    const progressPerAdmission = Math.max(los - 2, 1);
    const totalCharges = eligibleEncounters * (1 + progressPerAdmission + docQualityInputs.ipEmCodingConsultsPerAdmission);
    const gapScenarios: Record<string, number> = { conservative: 8, typical: 12, optimistic: 18 };
    const gapPct = (gapScenarios[docQualityInputs.ipEmCodingGapScenario] ?? 12) / 100;
    const grossValue = totalCharges * gapPct * docQualityInputs.ipEmCodingAvgRevenueLift;
    return Math.round(grossValue * (docQualityInputs.ipEmCodingRealization / 100));
  }, [isInpatient, eligibleEncounters, docQualityInputs, state.ipAvgLengthOfStay]);

  const hoursPerProviderPerWeek = state.numberOfProviders > 0 
    ? (isED
        ? (totalHoursSaved * ((timeDriverInputs.edAllocDocQualityPercent + timeDriverInputs.edAllocWellbeingPercent) / 100) / state.numberOfProviders / 48)
        : (totalHoursSaved / state.numberOfProviders / 48)
      ).toFixed(1)
    : '0';

  const nursingOtValue = useMemo(() => {
    if (!isNursing || !state.timeDriverInputs.nursingOtEnabled) return 0;
    const otHoursEliminated = Math.round(
      state.timeDriverInputs.nursingOtHoursPerNurseWeek *
      (state.timeDriverInputs.nursingOtReductionPercent / 100) *
      state.numberOfProviders *
      52
    );
    return Math.round(otHoursEliminated * state.timeDriverInputs.nursingOtHourlyRate);
  }, [isNursing, state.numberOfProviders, state.timeDriverInputs]);

  const nursingRetentionImpactRates: Record<string, number> = { conservative: 10, typical: 15, optimistic: 25 };

  const nursingRetainedCount = useMemo(() => {
    if (!isNursing || !state.timeDriverInputs.nursingRetentionEnabled) return 0;
    const leavingPerYear = state.numberOfProviders * (state.timeDriverInputs.nursingTurnoverRate / 100);
    const burnoutDepartures = leavingPerYear * 0.40;
    const impactRate = (nursingRetentionImpactRates[state.timeDriverInputs.retentionImpactScenario] || 15) / 100;
    return burnoutDepartures * impactRate;
  }, [isNursing, state.numberOfProviders, state.timeDriverInputs]);

  const nursingRetentionValue = useMemo(() => {
    if (!isNursing || !state.timeDriverInputs.nursingRetentionEnabled) return 0;
    return Math.round(nursingRetainedCount * state.timeDriverInputs.nursingReplacementCost);
  }, [isNursing, nursingRetainedCount, state.timeDriverInputs]);

  const nursingAgencyValue = useMemo(() => {
    if (!isNursing || !state.timeDriverInputs.nursingAgencyEnabled) return 0;
    const retainedForAgency = state.timeDriverInputs.nursingRetentionEnabled
      ? nursingRetainedCount
      : 0;
    const weeksOfCoverage = state.timeDriverInputs.nursingAgencyWeeksPerVacancy || 12;
    const weeklyPremium = state.timeDriverInputs.nursingAgencyWeeklyPremium || 2500;
    return Math.round(retainedForAgency * weeksOfCoverage * weeklyPremium);
  }, [isNursing, nursingRetainedCount, state.timeDriverInputs]);

  const valuePerBed = isNursing && state.nursingStaffedBeds > 0 ? Math.round(totalAnnualValue / state.nursingStaffedBeds) : 0;
  const netPerBedYear = isNursing && state.nursingStaffedBeds > 0 ? Math.round(netAnnualValue / state.nursingStaffedBeds) : 0;

  const nursingHapiValue = useMemo(() => {
    if (!isNursing || !state.docQualityInputs.nursingHapiEnabled) return 0;
    const patientDays = state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
    const hapIs = (patientDays / 1000) * state.docQualityInputs.nursingHapiRate;
    return Math.round(hapIs * (state.docQualityInputs.nursingHapiPreventionRate / 100) * state.docQualityInputs.nursingHapiCost);
  }, [isNursing, state.nursingStaffedBeds, state.nursingOccupancyRate, state.docQualityInputs]);

  const nursingFallsValue = useMemo(() => {
    if (!isNursing || !state.docQualityInputs.nursingFallsEnabled) return 0;
    const patientDays = state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
    const falls = (patientDays / 1000) * state.docQualityInputs.nursingFallsRate;
    return Math.round(falls * (state.docQualityInputs.nursingFallsPreventionRate / 100) * state.docQualityInputs.nursingFallsCost);
  }, [isNursing, state.nursingStaffedBeds, state.nursingOccupancyRate, state.docQualityInputs]);

  const nursingHacPenalty = useMemo(() => {
    if (!isNursing || !state.docQualityInputs.nursingHacEnabled || !state.docQualityInputs.nursingHacBottomQuartile) return 0;
    return Math.round(state.docQualityInputs.nursingHacMedicareRevenue * 0.01);
  }, [isNursing, state.docQualityInputs]);

  const nursingCautiValue = useMemo(() => {
    if (!isNursing || !state.docQualityInputs.nursingCautiEnabled) return 0;
    const patientDays = state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
    const cathDays = patientDays * (state.docQualityInputs.nursingCautiUtilizationRatio / 100);
    return Math.round((cathDays / 1000) * state.docQualityInputs.nursingCautiRate * (state.docQualityInputs.nursingCautiPreventionRate / 100) * state.docQualityInputs.nursingCautiCost);
  }, [isNursing, state.nursingStaffedBeds, state.nursingOccupancyRate, state.docQualityInputs]);

  const nursingClabsiValue = useMemo(() => {
    if (!isNursing || !state.docQualityInputs.nursingClabsiEnabled) return 0;
    const patientDays = state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
    const clDays = patientDays * (state.docQualityInputs.nursingClabsiUtilizationRatio / 100);
    return Math.round((clDays / 1000) * state.docQualityInputs.nursingClabsiRate * (state.docQualityInputs.nursingClabsiPreventionRate / 100) * state.docQualityInputs.nursingClabsiCost);
  }, [isNursing, state.nursingStaffedBeds, state.nursingOccupancyRate, state.docQualityInputs]);

  const nursingSepsisValue = useMemo(() => {
    if (!isNursing || !state.docQualityInputs.nursingSepsisEnabled) return 0;
    const patientDays = state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
    const sepsisPerYear = (patientDays / 1000) * state.docQualityInputs.nursingSepsisRatePerThousand;
    const nonCompliant = sepsisPerYear * ((100 - state.docQualityInputs.nursingSepsisCurrentCompliance) / 100);
    const docLagCases = nonCompliant * (state.docQualityInputs.nursingSepsisDocLagPercent / 100);
    return Math.round(docLagCases * state.docQualityInputs.nursingSepsisExcessCostPerCase * (state.docQualityInputs.nursingSepsisRealization / 100));
  }, [isNursing, state.nursingStaffedBeds, state.nursingOccupancyRate, state.docQualityInputs]);

  // 3-year projection (Y2/Y3 growth driven by state, one-time benefits in Y1 only)
  const implementationCost = state.includeImplementation ? state.implementationFee : 0;
  const year1Value = useMemo(() => {
    return totalAnnualValue + totalOneTimeValue;
  }, [totalAnnualValue, totalOneTimeValue]);

  const year2Value = useMemo(() => {
    return Math.round(totalAnnualValue * (1 + state.year2GrowthPercent / 100));
  }, [totalAnnualValue, state.year2GrowthPercent]);

  const year3Value = useMemo(() => {
    return Math.round(year2Value * (1 + state.year3GrowthPercent / 100));
  }, [year2Value, state.year3GrowthPercent]);

  // Per-year encounter projections (uses the same Y2/Y3 growth as value)
  const year1Encounters = useMemo(() => state.annualEncounters, [state.annualEncounters]);

  const year2Encounters = useMemo(() => {
    return Math.round(year1Encounters * (1 + state.year2GrowthPercent / 100));
  }, [year1Encounters, state.year2GrowthPercent]);

  const year3Encounters = useMemo(() => {
    return Math.round(year2Encounters * (1 + state.year3GrowthPercent / 100));
  }, [year2Encounters, state.year3GrowthPercent]);

  // Per-year investment projections (varies by pricing model)
  const year1Investment = useMemo(() => annualInvestment, [annualInvestment]);

  const year2Investment = useMemo(() => {
    if (state.pricingModel === 'perEncounter') {
      return Math.round(year2Encounters * (state.costPerEncounter ?? 0));
    }
    return state.pricingModel === 'perProvider'
      ? (state.careSetting === 'nursing' ? state.nursingStaffedBeds : state.numberOfProviders) * state.costPerProvider * 12
      : state.annualLicenseFee;
  }, [state.pricingModel, year2Encounters, state.costPerEncounter, state.numberOfProviders, state.nursingStaffedBeds, state.costPerProvider, state.annualLicenseFee, state.careSetting]);

  const year3Investment = useMemo(() => {
    if (state.pricingModel === 'perEncounter') {
      return Math.round(year3Encounters * (state.costPerEncounter ?? 0));
    }
    return state.pricingModel === 'perProvider'
      ? (state.careSetting === 'nursing' ? state.nursingStaffedBeds : state.numberOfProviders) * state.costPerProvider * 12
      : state.annualLicenseFee;
  }, [state.pricingModel, year3Encounters, state.costPerEncounter, state.numberOfProviders, state.nursingStaffedBeds, state.costPerProvider, state.annualLicenseFee, state.careSetting]);

  // Per-year net value
  const year1Net = useMemo(() => year1Value - year1Investment, [year1Value, year1Investment]);
  const year2Net = useMemo(() => year2Value - year2Investment, [year2Value, year2Investment]);
  const year3Net = useMemo(() => year3Value - year3Investment, [year3Value, year3Investment]);

  const threeYearGrossTotal = useMemo(() => year1Value + year2Value + year3Value, [year1Value, year2Value, year3Value]);
  const threeYearNetTotal = useMemo(() => year1Net + year2Net + year3Net, [year1Net, year2Net, year3Net]);
  const threeYearInvestmentTotal = useMemo(() => year1Investment + year2Investment + year3Investment, [year1Investment, year2Investment, year3Investment]);

  // Expansion opportunity (use fullScaleProviders from state, editable utilization)
  const expandedProviders = state.fullScaleProviders;
  const [expandedUtilization, setExpandedUtilization] = useState(80);
  const expansionMultiplier = (expandedProviders / state.numberOfProviders) * (expandedUtilization / state.utilizationPercent);
  const expandedValue = Math.round(netAnnualValue * expansionMultiplier);
  
  // Full scale investment scales with provider count (not utilization - you pay per provider)
  const providerExpansionRatio = expandedProviders / state.numberOfProviders;
  const expandedInvestment = annualInvestment * providerExpansionRatio;
  const expandedRoi = expandedInvestment > 0 ? (totalAnnualValue * expansionMultiplier) / expandedInvestment : 0;

  const handleAddToProforma = () => {
    if (!onAddToProforma || !state.careSetting) return;
    const cs = state.careSetting;
    const drivers: ProformaSettingSnapshot["drivers"] = [];

    if (patientAccessValue > 0) drivers.push({ id: "patientAccess", name: "Patient Access", value: patientAccessValue, category: "time", onset: "delayed" as const });
    if (edLwbsValue > 0) drivers.push({ id: "edLwbs", name: "LWBS Recovery", value: edLwbsValue, category: "time", onset: "delayed" as const });
    if (edAdmissionCaptureValue > 0) drivers.push({ id: "edAdmission", name: "Admission Capture", value: edAdmissionCaptureValue, category: "time", onset: "delayed" as const });
    if (costReductionValue > 0) drivers.push({ id: "costReduction", name: "Cost Reduction", value: costReductionValue, category: "time", onset: "delayed" as const });
    if (nursingOtValue > 0) drivers.push({ id: "nursingOt", name: "OT Reduction", value: nursingOtValue, category: "time", onset: "delayed" as const });
    if (wrvuValue > 0) drivers.push({ id: "wrvu", name: "wRVU Uplift", value: wrvuValue, category: "documentation", onset: "immediate" as const });
    if (hccValue > 0) drivers.push({ id: "hcc", name: "HCC Recapture", value: hccValue, category: "documentation", onset: "immediate" as const });
    if (denialsValue > 0) drivers.push({ id: "denials", name: "Denial Prevention", value: denialsValue, category: "documentation", onset: "immediate" as const });
    if (ipDrgValue > 0) drivers.push({ id: "ipDrg", name: "DRG Accuracy", value: ipDrgValue, category: "documentation", onset: "immediate" as const });
    if (ipObsDefenseValue > 0) drivers.push({ id: "ipObsDefense", name: "Obs/IP Status Defense", value: ipObsDefenseValue, category: "documentation", onset: "immediate" as const });
    if (ipCdiValue > 0) drivers.push({ id: "ipCdi", name: "CDI Query Reduction", value: ipCdiValue, category: "documentation", onset: "immediate" as const });
    if (nursingHapiValue > 0) drivers.push({ id: "nursingHapi", name: "HAPI Risk Reduction", value: nursingHapiValue, category: "documentation", onset: "delayed" as const });
    if (nursingFallsValue > 0) drivers.push({ id: "nursingFalls", name: "Fall Risk Visibility", value: nursingFallsValue, category: "documentation", onset: "delayed" as const });
    if (nursingCautiValue > 0) drivers.push({ id: "nursingCauti", name: "CAUTI Bundle Compliance", value: nursingCautiValue, category: "documentation", onset: "delayed" as const });
    if (nursingClabsiValue > 0) drivers.push({ id: "nursingClabsi", name: "CLABSI Bundle Compliance", value: nursingClabsiValue, category: "documentation", onset: "delayed" as const });
    if (nursingSepsisValue > 0) drivers.push({ id: "nursingSepsis", name: "Sepsis SEP-1 Bundle", value: nursingSepsisValue, category: "documentation", onset: "delayed" as const });

    for (const item of state.timeDriverInputs.nursingAdditionalCostSavings) {
      if (item.amount > 0 && item.label) {
        drivers.push({ id: `additionalCost-${item.id}`, name: item.label, value: item.amount, category: "time", onset: "immediate" as const });
      }
    }

    const hasDocDrivers = drivers.some(d => d.category === "documentation" && d.value > 0);
    if (!hasDocDrivers && docValue === 0 && totalHoursSaved > 0) {
      const docAllocPct = isOutpatientSetting ? timeDriverInputs.opAllocDocQualityPercent
        : isED ? timeDriverInputs.edAllocDocQualityPercent
        : isInpatient ? timeDriverInputs.ipAllocQualityPercent
        : 0;
      if (docAllocPct > 0) {
        const docQualityHours = totalHoursSaved * (docAllocPct / 100);
        const providerValuePerHour = state.annualEncounters > 0 && state.numberOfProviders > 0
          ? (timeValue / (totalHoursSaved || 1))
          : 150;
        const impliedDocValue = Math.round(docQualityHours * Math.max(providerValuePerHour, 50));
        if (impliedDocValue > 0) {
          drivers.push({ id: "docQuality", name: "Documentation Quality", value: impliedDocValue, category: "documentation", onset: "immediate" as const });
        }
      }
    }

    const retentionValue = isNursing
      ? nursingRetentionValue + nursingAgencyValue
      : clinicianRetentionValue;

    if (retentionValue > 0) {
      drivers.push({ id: "retention", name: isNursing ? "Nurse Retention" : "Clinician Retention", value: retentionValue, category: "time", onset: "phased" as const });
    }

    const pilotProviders = isNursing ? state.nursingStaffedBeds : state.numberOfProviders;
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
      yearlyProviders: {
        year1: pilotProviders,
        year2: y2Providers,
        year3: fullScale,
      },
      encounters: state.annualEncounters,
      utilizationPercent: state.utilizationPercent,
      annualValue: totalAnnualValue + drivers.filter(d => d.id === "docQuality").reduce((s, d) => s + d.value, 0),
      timeValue,
      docValue: docValue + drivers.filter(d => d.id === "docQuality").reduce((s, d) => s + d.value, 0),
      retentionValue,
      totalHoursSaved,
      drivers,
      costPerUnit: state.pricingModel === 'perProvider' ? state.costPerProvider : 0,
      yearlyPricing: state.pricingModel === 'perProvider'
        ? { year1: state.costPerProvider, year2: state.costPerProvider, year3: state.costPerProvider }
        : { year1: 0, year2: 0, year3: 0 },
      pricingModel: state.pricingModel === 'perEncounter' ? 'perEncounter' : state.pricingModel === 'annual' ? 'annualFlat' : 'perUnit',
      costPerEncounter: state.pricingModel === 'perEncounter' ? (state.costPerEncounter ?? 0) : undefined,
      annualLicenseFee: state.pricingModel === 'annual' ? state.annualLicenseFee : undefined,
      implementationFee: state.includeImplementation ? state.implementationFee : 0,
      goLiveMonth: 1,
      color: SETTING_COLORS[cs] || "#EA2C00",
      fullExploreState: { ...state },
      yearlyEncounters: {
        year1: state.annualEncounters,
        year2: Math.round(y2Providers * encountersPerProvider),
        year3: Math.round(fullScale * encountersPerProvider),
      },
      yearlyUtilization: {
        year1: state.utilizationPercent,
        year2: state.utilizationPercent,
        year3: state.utilizationPercent,
      },
      retentionRate: retentionValue > 0 ? 0 : (isNursing ? 0 : 0.5),
      replacementCost: isNursing ? (state.timeDriverInputs.nursingReplacementCost || 56300) : (state.timeDriverInputs.replacementCost || 400000),
    };

    onAddToProforma(snapshot);
    toast({
      title: `${snapshot.label} added to proforma`,
      description: `${formatCurrency(totalAnnualValue)} annual value captured`,
    });
  };

  // Scaling pace options
  const [selectedPace, setSelectedPace] = useState<'measured' | 'steady' | 'aggressive'>('steady');

  const PACE_GROWTH_PRESETS: Record<'measured' | 'steady' | 'aggressive', { y2: number; y3: number }> = {
    measured: { y2: 5, y3: 5 },
    steady: { y2: 10, y3: 10 },
    aggressive: { y2: 15, y3: 15 },
  };

  const handlePaceChange = (paceKey: 'measured' | 'steady' | 'aggressive') => {
    const preset = PACE_GROWTH_PRESETS[paceKey] ?? { y2: 10, y3: 10 };
    setSelectedPace(paceKey);
    updateState({
      year2GrowthPercent: preset.y2,
      year3GrowthPercent: preset.y3,
    });
  };
  
  const paceConfig = {
    measured: { months: 36, label: '36mo', maturityMultiplier: 1.05 },
    steady: { months: 24, label: '24mo', maturityMultiplier: 1.10 },
    aggressive: { months: 18, label: '18mo', maturityMultiplier: 1.15 },
  };

  const currentPace = paceConfig[selectedPace];

  // Chart data for growth trajectory
  const chartData = useMemo(() => {
    const points: Array<{
      month: number;
      linearValue: number;
      projectedValue: number;
      providers: number;
      utilization: number;
      milestoneLabel: string;
      isPilot: boolean;
      isFullScale: boolean;
    }> = [];

    const totalMonths = currentPace.months;
    const pilotValue = netAnnualValue;
    const pilotProviders = state.numberOfProviders;
    const pilotUtil = state.utilizationPercent;
    const fullScaleProviders = expandedProviders;
    const fullScaleUtil = expandedUtilization;

    // Create milestone points
    const milestones = [0, 6, 12, 18, 24].filter(m => m <= totalMonths);
    if (!milestones.includes(totalMonths)) {
      milestones.push(totalMonths);
    }
    milestones.sort((a, b) => a - b);

    milestones.forEach((month) => {
      const progress = month / totalMonths;
      
      const providers = Math.round(pilotProviders + (fullScaleProviders - pilotProviders) * progress);
      const utilizationProgress = Math.pow(progress, 0.8);
      const utilization = Math.round(pilotUtil + (fullScaleUtil - pilotUtil) * utilizationProgress);
      
      // Linear value: simple provider scaling
      const linearValue = Math.round(pilotValue * (providers / pilotProviders));
      
      // Projected value: includes utilization boost and maturity gains
      const utilizationBoost = utilization / pilotUtil;
      const maturityBoost = 1 + ((currentPace.maturityMultiplier - 1) * Math.pow(progress, 1.5));
      const projectedValue = Math.round(linearValue * utilizationBoost * maturityBoost);

      points.push({
        month,
        linearValue,
        projectedValue,
        providers,
        utilization,
        milestoneLabel: month === 0 ? 'Today' : month === totalMonths ? 'Full Scale' : `${month}mo`,
        isPilot: month === 0,
        isFullScale: month === totalMonths,
      });
    });

    return points;
  }, [netAnnualValue, state.numberOfProviders, state.utilizationPercent, expandedProviders, expandedUtilization, currentPace]);

  const formatCurrency = (n: number) => {
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'K';
    return '$' + n.toLocaleString();
  };

  const formatNumber = (n: number) => n.toLocaleString();

  const handleExportPDF = async (clientName: string, preparedBy: string) => {
      setIsExporting(true);
      try {
        const careSettingLabels: Record<string, string> = {
          outpatient: 'Outpatient',
          ed: 'Emergency',
          inpatient: 'Inpatient',
          nursing: 'Nursing',
        };

        const buildQuadrantData = (quadrant: ExploreQuadrant): import("@/components/explore/ExplorePDFExport").ExplorePDFQuadrantData => {
          if (!state.careSetting) {
            return { quadrant, annualTotal: 0, oneTimeTotal: 0, drivers: [], otherFinancialBenefits: [] };
          }
          const drivers = EXPLORE_DRIVERS
            .filter(d => d.quadrant === quadrant && d.settings.includes(state.careSetting!) && isDriverEnabled(d, state))
            .map(d => ({
              id: d.id,
              label: d.label,
              shortDescription: d.shortDescription,
              visibility: d.visibility,
              value: allDriverValues[d.id] || 0,
              isChild: Boolean(d.childOfDriverId),
            }));

          const benefits = (state.otherFinancialBenefits ?? [])
            .filter(b => b.quadrant === quadrant && b.label.trim() && b.amount > 0)
            .map(b => ({ label: b.label, amount: b.amount, type: b.type }));

          const driverAnnualSum = drivers
            .filter(d => d.visibility === 'quantified')
            .reduce((s, d) => s + d.value, 0);
          const benefitsAnnual = benefits.filter(b => b.type === 'annual').reduce((s, b) => s + b.amount, 0);
          const benefitsOneTime = benefits.filter(b => b.type === 'oneTime').reduce((s, b) => s + b.amount, 0);

          return {
            quadrant,
            annualTotal: driverAnnualSum + benefitsAnnual,
            oneTimeTotal: benefitsOneTime,
            drivers,
            otherFinancialBenefits: benefits,
          };
        };

        const careSettingForData = (state.careSetting ?? 'outpatient') as ExplorePDFData['careSetting'];

        const pdfData: ExplorePDFData = {
          // Cover page
          clientName,
          preparedBy,
          date: new Date().toLocaleDateString(),
          careSettingLabel: state.careSetting ? (careSettingLabels[state.careSetting] || state.careSetting) : '',

          // Practice
          careSetting: careSettingForData,
          numberOfProviders: state.numberOfProviders,
          nursingStaffedBeds: state.careSetting === 'nursing' ? state.nursingStaffedBeds : undefined,
          nursingOccupancyRate: state.careSetting === 'nursing' ? state.nursingOccupancyRate : undefined,
          annualEncounters: state.annualEncounters,
          utilizationPercent: state.utilizationPercent,

          // Time savings
          totalHoursSaved,
          minutesSavedPerEncounter: state.minutesSavedPerEncounter,
          timePathScenario: state.timePathScenario || 'custom',

          // Quadrants
          quadrants: [
            buildQuadrantData('Capacity'),
            buildQuadrantData('Workforce'),
            buildQuadrantData('Revenue'),
            buildQuadrantData('Quality'),
          ],
          totalAnnualValue,
          totalOneTimeValue,

          // Investment
          pricingModel: state.pricingModel,
          costPerProvider: state.pricingModel === 'perProvider' ? state.costPerProvider : undefined,
          costPerEncounter: state.pricingModel === 'perEncounter' ? state.costPerEncounter : undefined,
          annualLicenseFee: state.pricingModel === 'annual' ? state.annualLicenseFee : undefined,
          implementationFee: state.implementationFee,
          includeImplementation: state.includeImplementation,
          annualInvestment,

          // 3-Year Projection
          year2GrowthPercent: state.year2GrowthPercent,
          year3GrowthPercent: state.year3GrowthPercent,
          year1Value,
          year2Value,
          year3Value,
          year1Investment,
          year2Investment,
          year3Investment,
          year1Net,
          year2Net,
          year3Net,
          threeYearGrossTotal,
          threeYearInvestmentTotal,
          threeYearNetTotal,

          // Headline
          netAnnualValue: year1Net,
          roi: annualInvestment > 0 ? totalAnnualValue / annualInvestment : 0,
          valuePerProvider: state.numberOfProviders > 0 ? Math.round(year1Net / state.numberOfProviders) : 0,
        };

        await generateExplorePDF(pdfData);

        setShowExportModal(false);
        toast({
          title: "PDF Downloaded",
          description: "Your ROI model has been saved.",
          variant: "brand",
        });
      } catch (error: any) {
        console.error("PDF generation error:", error?.message || error?.toString?.() || JSON.stringify(error), error);
        toast({
          title: "Export Failed",
          description: error?.message || "Unable to generate PDF. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsExporting(false);
      }
    };

  const careSettingLabel = state.careSetting === 'outpatient' ? 'Outpatient' :
    state.careSetting === 'ed' ? 'Emergency Department' :
    state.careSetting === 'inpatient' ? 'Inpatient' : 'Nursing';

  // Care setting-specific driver labels
  const driverLabels = {
    outpatient: {
      timeCardTitle: 'Efficiency Value',
      timeCardDescription: 'Time saved on documentation is redirected to patient access and provider wellbeing.',
      driver1: 'Patient Access',
      driver2: 'Provider Wellbeing',
      driver3: '',
      docCardTitle: 'Documentation Quality',
      docCardDescription: 'When documentation is complete and accurate, downstream revenue follows.',
      docDriver1: 'wRVU Improvement',
      docDriver2: 'HCC Capture',
      docDriver3: 'Denial Prevention',
      showHCC: true,
    },
    ed: {
      timeCardTitle: 'Throughput Value',
      timeCardDescription: 'Faster documentation means shorter door-to-doc times, reduced LWBS rates, and shift sustainability.',
      driver1: 'LWBS Recovery',
      driver2: 'Admission Capture',
      driver3: 'Provider Wellbeing',
      docCardTitle: 'Documentation Quality',
      docCardDescription: 'Complete documentation supports accurate coding and reduces claim denials.',
      docDriver1: 'E&M Level Accuracy',
      docDriver2: '', // No HCC for ED
      docDriver3: 'Denial Prevention',
      showHCC: false,
    },
    inpatient: {
      timeCardTitle: 'Clinical Operations',
      timeCardDescription: 'Reduced documentation burden allows hospitalists to focus on patient care and rounding.',
      driver1: 'Rounding Efficiency',
      driver2: 'Provider Wellbeing',
      driver3: '',
      docCardTitle: 'Documentation Quality',
      docCardDescription: 'Accurate documentation drives DRG accuracy and reduces CDI queries.',
      docDriver1: 'DRG Accuracy',
      docDriver2: 'CDI Query Reduction',
      docDriver3: '',
      showHCC: false,
    },
    nursing: {
      timeCardTitle: 'Staffing Efficiency',
      timeCardDescription: 'Time saved on flowsheet documentation reduces end-of-shift overtime and improves nurse retention.',
      driver1: 'OT Reduction',
      driver2: 'Retention Savings',
      driver3: 'Agency Reduction',
      docCardTitle: 'Care Quality',
      docCardDescription: 'Better flowsheet documentation creates a real-time clinical picture — reducing the risk events that are most sensitive to documentation gaps.',
      docDriver1: 'HAPI Risk: Documentation Impact',
      docDriver2: 'Fall Risk Visibility Gap',
      docDriver3: 'HCAHPS',
      showHCC: false,
    },
  };

  const labels = driverLabels[state.careSetting || 'outpatient'];

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={7}
        totalSteps={7}
        stepName="Your Model"
        onBack={onBack}
        onHome={onHome}
        onStepClick={onStepClick}
        stepLabels={stepLabels}

      />
      <UnifiedHeaderSpacer />

      {/* HERO SECTION - Dark Background */}
      <motion.div
        className="bg-[#1A1A1A] py-12 md:py-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {noDriversEnabled ? (
          <div className="max-w-[900px] mx-auto px-4 sm:px-6">
            <div className="bg-[#1A1A1A] rounded-2xl p-12 text-center">
              <p className="text-xs font-medium text-[#EA2C00] uppercase tracking-[1.5px] mb-3">
                Your Model
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 font-abridge uppercase tracking-tight">
                Build your value story
              </h2>
              <p className="text-base text-white/60 max-w-md mx-auto mb-6">
                You haven't enabled any drivers yet. Go back to choose the value drivers that match your organization's strategy.
              </p>
              <Button
                onClick={onEdit}
                className="h-12 px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-semibold rounded-full"
                data-testid="button-empty-state-edit"
              >
                Go back to drivers
              </Button>
            </div>
          </div>
        ) : (
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 text-center">
          {/* Context Badge */}
          <div className="inline-block bg-[#2A2A2A] rounded-full px-4 py-1.5 mb-6">
            {isNursing ? (
              <span className="text-xs text-[#888888]">
                {careSettingLabel} · {formatNumber(state.nursingStaffedBeds)} beds · {formatNumber(state.numberOfProviders)} nurse FTEs
              </span>
            ) : (
              <span className="text-xs text-[#888888]">
                {careSettingLabel} · {formatNumber(state.numberOfProviders)} providers
              </span>
            )}
          </div>

          {/* Label */}
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[2px] mb-3">
            {isQualitativeOnly ? "Assessment Type" : "Projected Net Value"}
          </p>

          {/* Hero Number */}
          {isQualitativeOnly ? (
            <p className="text-3xl md:text-4xl font-bold text-[#EA2C00] mb-1" data-testid="text-net-value">
              Qualitative Assessment
            </p>
          ) : (
            <p className="text-4xl sm:text-5xl md:text-7xl font-bold text-[#EA2C00] mb-1" data-testid="text-net-value">
              {formatCurrency(netAnnualValue)}
            </p>
          )}
          {!isQualitativeOnly && <p className="text-xl text-[#888888] mb-4">/ year</p>}
          {!isQualitativeOnly && <p className="text-xs text-[#888888] uppercase tracking-wide mb-4">Year 1, including one-time benefits</p>}
          {isQualitativeOnly && <p className="text-sm text-[#888888] mb-4">Strategic value — not dollarized</p>}

          {/* Subtext */}
          <p className="text-base text-[#888888] mb-8">
            {isQualitativeOnly
              ? "Enable quantitative levers to build a financial case"
              : `${formatCurrency(totalAnnualValue)} value – ${formatCurrency(annualInvestment)} investment`}
          </p>

          {/* Stat Cards */}
          {isNursing ? (
            <div className="flex justify-center gap-4 flex-wrap">
              <div className="bg-[#2A2A2A] rounded-lg px-4 sm:px-6 py-3 sm:py-4 min-w-[90px] sm:min-w-[120px]" data-testid="stat-roi">
                <p className="text-xl sm:text-2xl font-bold text-white">{roi.toFixed(1)}×</p>
                <p className="text-xs text-[#888888]">ROI</p>
              </div>
              <div className="bg-[#2A2A2A] rounded-lg px-4 sm:px-6 py-3 sm:py-4 min-w-[90px] sm:min-w-[120px]" data-testid="stat-per-bed">
                <p className="text-xl sm:text-2xl font-bold text-white">{formatCurrency(netPerBedYear)}</p>
                <p className="text-xs text-[#888888]">per bed/yr</p>
              </div>
              <div className="bg-[#2A2A2A] rounded-lg px-4 sm:px-6 py-3 sm:py-4 min-w-[90px] sm:min-w-[120px]" data-testid="stat-hours-saved">
                <p className="text-xl sm:text-2xl font-bold text-white">{formatNumber(totalHoursSaved)}</p>
                <p className="text-xs text-[#888888]">hours saved</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center gap-4 flex-wrap">
              <div className="bg-[#2A2A2A] rounded-lg px-4 sm:px-6 py-3 sm:py-4 min-w-[90px] sm:min-w-[120px]" data-testid="stat-roi">
                <p className="text-xl sm:text-2xl font-bold text-white">{roi.toFixed(1)}×</p>
                <p className="text-xs text-[#888888]">ROI</p>
              </div>
              <div className="bg-[#2A2A2A] rounded-lg px-4 sm:px-6 py-3 sm:py-4 min-w-[90px] sm:min-w-[120px]" data-testid="stat-per-provider">
                <p className="text-xl sm:text-2xl font-bold text-white">{formatCurrency(valuePerProvider)}</p>
                <p className="text-xs text-[#888888]">per provider</p>
              </div>
              <div className="bg-[#2A2A2A] rounded-lg px-4 sm:px-6 py-3 sm:py-4 min-w-[90px] sm:min-w-[120px]" data-testid="stat-hours-saved">
                <p className="text-xl sm:text-2xl font-bold text-white">{formatNumber(totalHoursSaved)}</p>
                <p className="text-xs text-[#888888]">hours saved</p>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-sm text-[#666666] mt-6 italic">
            These projections reflect conservative assumptions. See Methodology for details.
          </p>
        </div>
        )}
      </motion.div>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-10 md:py-12">

        {/* QUICK ASSUMPTIONS EDITOR */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <p className="text-xs font-medium text-[#999999] uppercase tracking-[2px] mb-3 text-center">Quick Adjustments</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
            {/* Practice Panel */}
            <div className="bg-[#F9F6F2] rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedPanel(expandedPanel === 'practice' ? null : 'practice')}
                className="w-full flex items-center justify-between p-4 hover:bg-[#F0ECE6] transition-colors"
                data-testid="button-expand-practice"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-[#EA2C00]" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-neutral-900">Practice</p>
                    <p className="text-xs text-neutral-500">
                      {isNursing
                        ? `${formatNumber(state.nursingStaffedBeds)} beds · ${formatNumber(state.numberOfProviders)} FTEs`
                        : `${formatNumber(state.numberOfProviders)} providers · ${formatNumber(state.encountersPerProvider)} enc/yr`}
                    </p>
                  </div>
                </div>
                {expandedPanel === 'practice' ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
              </button>
              <AnimatePresence>
                {expandedPanel === 'practice' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      <div className="h-px bg-neutral-200" />
                      {isNursing ? (
                        <>
                          <div>
                            <label className="block text-[12px] text-neutral-500 mb-1">Staffed Beds</label>
                            <FormattedNumberInput
                              value={state.nursingStaffedBeds}
                              onChange={(v) => updateState({ nursingStaffedBeds: Math.max(v, 1) })}
                              className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                              data-testid="input-quick-beds"
                            />
                          </div>
                          <div>
                            <label className="block text-[12px] text-neutral-500 mb-1">Nurse FTEs</label>
                            <FormattedNumberInput
                              value={state.numberOfProviders}
                              onChange={(v) => updateState({ numberOfProviders: Math.max(v, 1) })}
                              className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                              data-testid="input-quick-ftes"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-[12px] text-neutral-500 mb-1">Providers</label>
                            <FormattedNumberInput
                              value={state.numberOfProviders}
                              onChange={(v) => {
                                const providers = Math.max(v, 1);
                                updateState({ numberOfProviders: providers, annualEncounters: providers * state.encountersPerProvider });
                              }}
                              className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                              data-testid="input-quick-providers"
                            />
                          </div>
                          <div>
                            <label className="block text-[12px] text-neutral-500 mb-1">Encounters / Provider / Year</label>
                            <FormattedNumberInput
                              value={state.encountersPerProvider}
                              onChange={(v) => {
                                const enc = Math.max(v, 1);
                                updateState({ encountersPerProvider: enc, annualEncounters: state.numberOfProviders * enc });
                              }}
                              className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                              data-testid="input-quick-encounters"
                            />
                          </div>
                          <div>
                            <label className="block text-[12px] text-neutral-500 mb-1">Utilization %</label>
                            <FormattedNumberInput
                              value={state.utilizationPercent}
                              onChange={(v) => updateState({ utilizationPercent: Math.min(Math.max(v, 1), 100) })}
                              className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                              data-testid="input-quick-utilization"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Time Savings Panel */}
            <div className="bg-[#F9F6F2] rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedPanel(expandedPanel === 'time' ? null : 'time')}
                className="w-full flex items-center justify-between p-4 hover:bg-[#F0ECE6] transition-colors"
                data-testid="button-expand-time"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#EA2C00]" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-neutral-900">Time Savings</p>
                    <p className="text-xs text-neutral-500">{state.minutesSavedPerEncounter} min/encounter saved</p>
                  </div>
                </div>
                {expandedPanel === 'time' ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
              </button>
              <AnimatePresence>
                {expandedPanel === 'time' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      <div className="h-px bg-neutral-200" />
                      <div>
                        <label className="block text-[12px] text-neutral-500 mb-1">Minutes Saved / Encounter</label>
                        <FormattedNumberInput
                          value={state.minutesSavedPerEncounter}
                          onChange={(v) => updateState({ minutesSavedPerEncounter: Math.max(v, 0) })}
                          className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                          data-testid="input-quick-minutes"
                        />
                      </div>
                      <p className="text-[12px] text-neutral-400 italic">
                        {formatNumber(totalHoursSaved)} total hours saved/year
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Investment Panel */}
            <div className="bg-[#F9F6F2] rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedPanel(expandedPanel === 'investment' ? null : 'investment')}
                className="w-full flex items-center justify-between p-4 hover:bg-[#F0ECE6] transition-colors"
                data-testid="button-expand-investment"
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4 text-[#EA2C00]" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-neutral-900">Investment</p>
                    <p className="text-xs text-neutral-500">{formatCurrency(annualInvestment)}/yr</p>
                  </div>
                </div>
                {expandedPanel === 'investment' ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
              </button>
              <AnimatePresence>
                {expandedPanel === 'investment' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      <div className="h-px bg-neutral-200" />
                      {state.pricingModel === 'perProvider' ? (
                        <div>
                          <label className="block text-[12px] text-neutral-500 mb-1">
                            {isNursing ? '$ / Bed / Month' : '$ / Provider / Month'}
                          </label>
                          <FormattedNumberInput
                            value={state.costPerProvider}
                            onChange={(v) => updateState({ costPerProvider: Math.max(v, 0) })}
                            prefix="$"
                            className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                            data-testid="input-quick-cost"
                          />
                        </div>
                      ) : state.pricingModel === 'perEncounter' ? (
                        <div>
                          <label className="block text-[12px] text-neutral-500 mb-1">$ / Encounter</label>
                          <FormattedNumberInput
                            value={state.costPerEncounter}
                            onChange={(v) => updateState({ costPerEncounter: Math.max(v, 0) })}
                            step={0.01}
                            className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                            data-testid="input-quick-encounter-cost"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[12px] text-neutral-500 mb-1">Annual License Fee</label>
                          <FormattedNumberInput
                            value={state.annualLicenseFee}
                            onChange={(v) => updateState({ annualLicenseFee: Math.max(v, 0) })}
                            prefix="$"
                            className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                            data-testid="input-quick-license"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-[12px] text-neutral-500 mb-1">Implementation Fee</label>
                        <FormattedNumberInput
                          value={state.implementationFee}
                          onChange={(v) => updateState({ implementationFee: Math.max(v, 0) })}
                          prefix="$"
                          className="w-full text-right text-sm h-8 bg-white border border-neutral-300 rounded-lg px-2"
                          data-testid="input-quick-impl-fee"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {onStepClick && (
            <p className="text-[12px] text-neutral-400 text-center mt-3 italic">
              For driver selections and detailed inputs, click any step dot above to jump back.
            </p>
          )}
        </motion.div>
        
        {/* How Your Numbers Were Built — quadrant cards */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-center mb-6">
            <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-2">
              How Your Numbers Were Built
            </p>
            <h2 className="text-xl md:text-2xl font-bold text-black font-abridge uppercase tracking-tight">
              Value by Quadrant
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(['Capacity', 'Workforce', 'Revenue', 'Quality'] as const).map((quadrant) => {
              const drivers = state.careSetting
                ? EXPLORE_DRIVERS.filter(d =>
                    d.quadrant === quadrant &&
                    d.settings.includes(state.careSetting!) &&
                    isDriverEnabled(d, state)
                  )
                : [];
              const benefits = benefitsByQuadrant[quadrant];
              const driverSum = valueByQuadrant[quadrant];
              const cardAnnual = driverSum + benefits.annual;
              const hasContent = drivers.length > 0 || benefits.items.length > 0;

              const subtitleByQuadrant: Record<ExploreQuadrant, string> = {
                Capacity: 'Throughput, access, and reinvested time',
                Workforce: 'Retention, sustainability, and labor stability',
                Revenue: 'Coding, denials, and reimbursement integrity',
                Quality: 'Clinical outcomes, safety, and experience',
              };

              return (
                <div
                  key={quadrant}
                  className="bg-white border border-[#E5E5E5] rounded-xl p-5 flex flex-col"
                  data-testid={`quadrant-card-${quadrant.toLowerCase()}`}
                >
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-1">{quadrant}</p>
                    <p className="text-xs text-[#888888] leading-tight">{subtitleByQuadrant[quadrant]}</p>
                  </div>

                  <div className="mb-4">
                    <p className="text-2xl font-bold text-black">
                      {cardAnnual > 0 ? formatCurrency(cardAnnual) : '—'}
                    </p>
                    <p className="text-xs text-[#888888]">annual</p>
                    {benefits.oneTime > 0 && (
                      <p className="text-xs text-[#666666] mt-1">+ {formatCurrency(benefits.oneTime)} one-time (Y1)</p>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    {!hasContent && (
                      <p className="text-xs text-[#AAAAAA] italic">No drivers selected.</p>
                    )}
                    {drivers.map(d => {
                      const isQual = d.visibility === 'qualitative';
                      const value = allDriverValues[d.id] || 0;
                      return (
                        <div key={d.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-[#666666] truncate flex-1 min-w-0">{d.label}</span>
                          <span className={`font-medium flex-shrink-0 ${isQual ? 'text-[#888888] italic' : 'text-black'}`}>
                            {isQual ? 'Qualitative' : (value > 0 ? formatCurrency(value) : '—')}
                          </span>
                        </div>
                      );
                    })}
                    {benefits.items.map(b => (
                      <div key={b.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-[#666666] truncate flex-1 min-w-0">{b.label || 'Other benefit'}</span>
                        <span className="font-medium text-black flex-shrink-0">
                          {formatCurrency(b.amount)}
                          {b.type === 'oneTime' && <span className="text-[10px] text-[#888888] ml-1">Y1</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ED-specific Downstream Value narrative section */}
        {state.careSetting === 'ed' && (
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <div className="bg-[#F5F0EB] rounded-xl p-4 sm:p-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
                  <Link className="w-5 h-5 text-[#EA2C00]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base text-black uppercase tracking-wide">Downstream Value</h3>
                  <p className="text-sm text-[#888888] italic">The ED admission note is just the beginning</p>
                </div>
              </div>
              
              <p className="text-sm text-[#666666] mb-5">
                When an ED physician decides to admit a patient, their documentation becomes the foundation for 
                inpatient revenue. The conditions they capture, the medical necessity they establish, and the clinical 
                reasoning they document all determine what happens downstream.
              </p>

              <p className="text-sm font-semibold text-black mb-3">Better ED documentation directly impacts:</p>
              
              <div className="space-y-3 mb-5">
                <div className="bg-white rounded-lg p-4 border border-[#E5E5E5] border-l-4 border-l-[#EA2C00]">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-[#888888]" />
                    <span className="font-semibold text-black">DRG & CMI Capture</span>
                  </div>
                  <p className="text-sm text-[#666666]">CCs and MCCs documented in ED carry forward to inpatient coding. What's captured here determines your case mix.</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[#E5E5E5] border-l-4 border-l-[#EA2C00]">
                  <div className="flex items-center gap-2 mb-1">
                    <Check className="w-4 h-4 text-[#888888]" />
                    <span className="font-semibold text-black">Medical Necessity</span>
                  </div>
                  <p className="text-sm text-[#666666]">The admission decision is documented in ED. This is your first line of defense against status denials and downgrades.</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[#E5E5E5] border-l-4 border-l-[#EA2C00]">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-[#888888]" />
                    <span className="font-semibold text-black">CDI Efficiency</span>
                  </div>
                  <p className="text-sm text-[#666666]">When the ED note is complete, CDI teams spend less time querying physicians and more time on complex cases.</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[#E5E5E5] border-l-4 border-l-[#EA2C00]">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-[#888888]" />
                    <span className="font-semibold text-black">Denial Prevention</span>
                  </div>
                  <p className="text-sm text-[#666666]">Payer audits start with the admission note. Complete documentation from day one means stronger appeals.</p>
                </div>
              </div>
              
              <div className="bg-[#2A2A2A] rounded-xl p-4 text-white">
                <div className="flex items-start gap-3">
                  <FileCheck className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">These benefits are quantified in the <span className="font-bold">Inpatient Setting</span>.</p>
                    <p className="text-sm opacity-80 mt-1">If your organization admits patients from the ED, the value compounds when both settings use Abridge.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Inpatient-specific Connected Value narrative section */}
        {state.careSetting === 'inpatient' && (
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <div className="bg-[#F5F0EB] rounded-xl p-4 sm:p-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
                  <Link className="w-5 h-5 text-[#EA2C00]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base text-black uppercase tracking-wide">Connected Value</h3>
                  <p className="text-sm text-[#888888] italic">ED + Inpatient compounds your results</p>
                </div>
              </div>
              
              <div className="bg-black rounded-xl p-4 text-white mb-5">
                <div className="flex items-start gap-3">
                  <FileCheck className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">If you're also using Abridge in <span className="font-bold">ED</span>, the documentation quality benefits are amplified.</p>
                    <p className="text-sm opacity-80 mt-1">The admission documentation that starts in ED flows directly into inpatient coding and denial defense.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 mb-5">
                <div className="bg-white rounded-lg p-4 border border-[#E5E5E5] border-l-4 border-l-[#EA2C00]">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-[#888888]" />
                    <span className="font-semibold text-black">DRG Capture</span>
                  </div>
                  <p className="text-sm text-[#666666]">CCs/MCCs documented in ED carry forward — your case mix starts stronger from admission.</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[#E5E5E5] border-l-4 border-l-[#EA2C00]">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-[#888888]" />
                    <span className="font-semibold text-black">CDI Efficiency</span>
                  </div>
                  <p className="text-sm text-[#666666]">When the ED note is complete, CDI teams query less and focus on complex cases.</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[#E5E5E5] border-l-4 border-l-[#EA2C00]">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-[#888888]" />
                    <span className="font-semibold text-black">Denial Prevention</span>
                  </div>
                  <p className="text-sm text-[#666666]">Medical necessity documented at admission is your first line of defense against payer audits.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Nursing-specific Connected Value section */}
        {state.careSetting === 'nursing' && (
          <motion.div className="mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#F5F0EB] flex items-center justify-center">
                <Link className="w-5 h-5 text-[#EA2C00]" />
              </div>
              <div>
                <h3 className="font-bold text-base text-black uppercase tracking-wide">Connected Value</h3>
                <p className="text-sm text-[#888888]">Nursing flowsheet documentation amplifies value in connected care settings</p>
              </div>
            </div>
            <div className="bg-[#F5F0EB] rounded-xl p-4 sm:p-8">
              <p className="text-sm text-[#666666] mb-5">
                Real-time flowsheet documentation creates the clinical record that downstream teams depend on — from inpatient coders to hospitalist billers.
              </p>
              <div className="grid md:grid-cols-2 gap-4 mb-5">
                <div className="bg-white rounded-lg p-4 border border-[#E5E5E5] border-l-4 border-l-[#EA2C00]">
                  <p className="font-semibold text-black mb-1">CC/MCC Capture</p>
                  <p className="text-sm text-[#666666]">Nursing assessments capture clinical indicators that support accurate DRG assignment. &quot;Patient appears malnourished&quot; feeds coding directly.</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[#E5E5E5] border-l-4 border-l-[#EA2C00]">
                  <p className="font-semibold text-black mb-1">Medical Necessity</p>
                  <p className="text-sm text-[#666666]">Real-time nursing docs provide evidence of patient acuity—critical for payer appeals.</p>
                </div>
              </div>
              <div className="bg-[#2A2A2A] rounded-xl p-4 text-white">
                <div className="flex items-start gap-3">
                  <FileCheck className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm opacity-90">The value above reflects nursing-only documentation. If your organization also uses Abridge for Hospitalists, the clinical record built by nursing directly extends the ROI of the Inpatient model — no double-counting.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* THE EXPANSION OPPORTUNITY */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <p className="text-center text-xl font-bold text-black mb-2">
            The Expansion Opportunity
          </p>
          <p className="text-center text-base text-[#888888] mb-6">
            A successful pilot proves value. Strategic expansion multiplies it.
          </p>

          <div className="bg-[#F5F0EB] rounded-xl p-4 sm:p-6">
            {/* Today vs Full Scale Header */}
            <div className="flex items-center justify-between gap-2 mb-6">
              <div className="text-center min-w-0 flex-shrink-0">
                <p className="text-xs sm:text-sm font-medium text-[#888888] mb-1">TODAY</p>
                <p className="text-xl sm:text-2xl font-bold text-black">{isNursing ? formatNumber(state.nursingStaffedBeds) : formatNumber(state.numberOfProviders)}</p>
                <p className="text-xs sm:text-sm text-[#888888]">{isNursing ? 'beds' : 'providers'}</p>
                <p className="text-xs sm:text-sm text-[#888888]">{state.utilizationPercent}% {isNursing ? 'adoption' : 'util'}</p>
              </div>
              
              <div className="flex-1 px-2 sm:px-6 flex items-center justify-center">
                <span className="text-xs sm:text-sm text-[#888888]">expansion →</span>
              </div>

              <div className="text-center min-w-0 flex-shrink-0">
                <p className="text-xs sm:text-sm font-medium text-[#888888] mb-1">FULL SCALE</p>
                <FormattedNumberInput
                  value={state.fullScaleProviders}
                  onChange={(v: number) => updateState({ fullScaleProviders: v })}
                  onBlurValue={(v: number) => updateState({ fullScaleProviders: Math.max(v, isNursing ? state.nursingStaffedBeds : state.numberOfProviders) })}
                  className="h-9 sm:h-10 w-20 sm:w-24 text-center text-xl sm:text-2xl font-bold bg-white border border-[#E5E5E5] rounded-lg"
                  data-testid="input-full-scale-providers"
                />
                <p className="text-xs sm:text-sm text-[#888888]">{isNursing ? 'beds' : 'providers'}</p>
                <div className="flex items-center justify-center gap-1">
                  <FormattedNumberInput
                    value={expandedUtilization}
                    onChange={(v: number) => setExpandedUtilization(v)}
                    onBlurValue={(v: number) => setExpandedUtilization(Math.min(Math.max(v, 1), 100))}
                    className="h-6 w-12 text-center text-sm bg-white border border-[#E5E5E5] rounded"
                    data-testid="input-full-scale-utilization"
                  />
                  <span className="text-xs sm:text-sm text-[#888888]">% {isNursing ? 'adoption' : 'util'}</span>
                </div>
              </div>
            </div>

            {/* Comparison Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white rounded-lg p-4 sm:p-5">
                <p className="text-xs sm:text-sm font-medium text-[#888888] mb-1 sm:mb-2">TODAY'S VALUE</p>
                <p className="text-2xl sm:text-3xl font-bold text-black mb-1">{formatCurrency(netAnnualValue)}</p>
                <p className="text-sm text-[#888888]">/ year</p>
                <p className="text-sm sm:text-base text-[#888888] mt-2">{roi.toFixed(1)}× ROI</p>
              </div>
              <div className="bg-[#EA2C00] rounded-lg p-4 sm:p-5">
                <p className="text-xs sm:text-sm font-medium text-white/80 mb-1 sm:mb-2">FULL SCALE VALUE</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mb-1">{formatCurrency(expandedValue)}</p>
                <p className="text-sm text-white/80">/ year</p>
                <p className="text-sm sm:text-base text-white/80 mt-2">{expandedRoi.toFixed(1)}× ROI</p>
              </div>
            </div>
          </div>

          {isNursing && (
            <p className="text-sm text-[#888888] text-center mt-4">
              As adoption scales, documentation consistency improves — which compounds the care quality benefits above.
            </p>
          )}
        </motion.div>

        {/* GROWTH TRAJECTORY */}
        {!noDriversEnabled && (
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-center text-xl font-bold text-black mb-2">
            Growth Trajectory
          </p>
          <p className="text-center text-base text-[#888888] mb-6">
            Projected value vs. linear scaling as you expand from pilot to full scale.
          </p>

          <div className="bg-white rounded-xl border border-[#E5E5E5] p-3 sm:p-6">
            {/* Pace Selector */}
            <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
              <span className="text-sm text-[#888888]">Expansion pace:</span>
              <div className="flex gap-1">
                {(['measured', 'steady', 'aggressive'] as const).map((pace) => (
                  <Button
                    key={pace}
                    variant={selectedPace === pace ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handlePaceChange(pace)}
                    className={`rounded-full min-h-[40px] min-w-[64px] flex-col px-3 py-1 h-auto ${
                      selectedPace === pace 
                        ? "bg-[#EA2C00] text-white" 
                        : "bg-[#F5F0EB] text-[#888888]"
                    }`}
                    data-testid={`pace-${pace}`}
                  >
                    <span>{paceConfig[pace].months}mo</span>
                    <span className={`block text-[10px] mt-0.5 ${selectedPace === pace ? 'text-white/80' : 'text-[#888888]'}`}>
                      Y2 +{PACE_GROWTH_PRESETS[pace].y2}% · Y3 +{PACE_GROWTH_PRESETS[pace].y3}%
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom growth overrides */}
            <div className="flex items-center justify-center gap-4 mb-4 text-sm flex-wrap">
              <span className="text-[#888888]">Custom growth:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#666666]">Y2</span>
                <input
                  type="number"
                  value={state.year2GrowthPercent}
                  onChange={(e) => updateState({ year2GrowthPercent: parseFloat(e.target.value) || 0 })}
                  className="w-14 h-7 text-center bg-white border border-[#E5E5E5] rounded text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none"
                  data-testid="input-y2-growth"
                />
                <span className="text-[#888888]">%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#666666]">Y3</span>
                <input
                  type="number"
                  value={state.year3GrowthPercent}
                  onChange={(e) => updateState({ year3GrowthPercent: parseFloat(e.target.value) || 0 })}
                  className="w-14 h-7 text-center bg-white border border-[#E5E5E5] rounded text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none"
                  data-testid="input-y3-growth"
                />
                <span className="text-[#888888]">%</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-[#EA2C00] rounded-full" />
                <span className="text-[#666666]">Projected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 border-t-2 border-dashed border-[#D1D5DB]" />
                <span className="text-[#666666]">Linear</span>
              </div>
            </div>

            {/* Chart - BIGGER */}
            <div className="h-[280px] sm:h-[400px] bg-white rounded-lg touch-manipulation">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 40 }}>
                  <defs>
                    <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EA2C00" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#EA2C00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  
                  <XAxis 
                    dataKey="month"
                    type="number"
                    domain={[0, currentPace.months]}
                    axisLine={{ stroke: '#E5E5E5', strokeWidth: 1 }}
                    tickLine={false}
                    tick={(props: { x: number; y: number; payload: { value: number } }) => {
                      const { x, y, payload } = props;
                      const point = chartData.find(d => d.month === payload.value);
                      if (!point) return <g />;
                      const anchor = point.isFullScale ? "end" : point.isPilot ? "start" : "middle";
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text 
                            x={0} 
                            y={16} 
                            textAnchor={anchor} 
                            fill={point.isPilot || point.isFullScale ? "#EA2C00" : "#888888"}
                            fontSize={12}
                            fontWeight={point.isPilot || point.isFullScale ? 700 : 400}
                          >
                            {point.milestoneLabel}
                          </text>
                        </g>
                      );
                    }}
                    ticks={chartData.map(d => d.month)}
                    height={40}
                  />
                
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#888888", fontSize: 11 }}
                    tickFormatter={(v) => formatCurrency(v)}
                    width={55}
                  />
                  
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-[#E5E5E5] rounded-lg p-4 shadow-lg">
                          <p className="font-semibold text-black text-base mb-1">{data.milestoneLabel}</p>
                          <p className="text-sm text-[#888888] mb-3">{data.providers} {isNursing ? 'beds' : 'providers'} · {data.utilization}% {isNursing ? 'adoption' : 'util'}</p>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-6">
                              <span className="text-[#EA2C00]">Projected:</span>
                              <span className="font-semibold text-[#EA2C00]">{formatCurrency(data.projectedValue)}</span>
                            </div>
                            <div className="flex justify-between gap-6">
                              <span className="text-[#888888]">Linear:</span>
                              <span className="text-[#888888]">{formatCurrency(data.linearValue)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  
                  <Area 
                    type="monotone" 
                    dataKey="projectedValue" 
                    stroke="none"
                    fill="url(#projectedGradient)"
                  />
                  
                  <Line 
                    type="monotone" 
                    dataKey="linearValue" 
                    stroke="#D1D5DB" 
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                  />
                  
                  <Line 
                    type="monotone" 
                    dataKey="projectedValue" 
                    stroke="#EA2C00" 
                    strokeWidth={3}
                    dot={false}
                  />
                  
                  <ReferenceDot 
                    x={0} 
                    y={chartData[0]?.projectedValue || 0} 
                    r={8} 
                    fill="#EA2C00" 
                    stroke="white"
                    strokeWidth={3}
                  />
                  
                  <ReferenceDot 
                    x={currentPace.months} 
                    y={chartData[chartData.length - 1]?.projectedValue || 0} 
                    r={8} 
                    fill="#EA2C00" 
                    stroke="white"
                    strokeWidth={3}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <p className="text-sm text-[#888888] text-center mt-4 italic">
              Projected value includes utilization improvement and workflow maturity gains over linear provider scaling.
            </p>
          </div>
        </motion.div>
        )}

        {/* 3-YEAR PROJECTION */}
        {!noDriversEnabled && (
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <p className="text-center text-xl font-bold text-black mb-6">
            3-Year Projection
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-3 sm:p-5 text-center" data-testid="projection-year-1">
              <p className="text-xs sm:text-sm text-[#888888] mb-1 sm:mb-2">Year 1</p>
              <p className="text-lg sm:text-xl font-bold text-black">{formatCurrency(year1Value)}</p>
              {totalOneTimeValue > 0 && (
                <p className="text-xs text-[#888888] mt-1">Includes {formatCurrency(totalOneTimeValue)} one-time</p>
              )}
              <div className="h-px bg-[#F0EBE4] my-3" />
              <p className="text-sm">
                <span className="text-[#888888]">Net: </span>
                <span className={`font-semibold ${year1Net >= 0 ? 'text-[#EA2C00]' : 'text-[#888888]'}`} data-testid="projection-year-1-net">{formatCurrency(year1Net)}</span>
              </p>
              {state.pricingModel === 'perEncounter' && (
                <p className="text-xs text-[#AAAAAA] mt-1">Investment: {formatCurrency(year1Investment)}</p>
              )}
            </div>
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-3 sm:p-5 text-center" data-testid="projection-year-2">
              <p className="text-xs sm:text-sm text-[#888888] mb-1 sm:mb-2">Year 2</p>
              <p className="text-lg sm:text-xl font-bold text-black">{formatCurrency(year2Value)}</p>
              <p className="text-xs text-[#888888] mt-1">+{state.year2GrowthPercent}% growth</p>
              <div className="h-px bg-[#F0EBE4] my-3" />
              <p className="text-sm">
                <span className="text-[#888888]">Net: </span>
                <span className={`font-semibold ${year2Net >= 0 ? 'text-[#EA2C00]' : 'text-[#888888]'}`} data-testid="projection-year-2-net">{formatCurrency(year2Net)}</span>
              </p>
              {state.pricingModel === 'perEncounter' && (
                <p className="text-xs text-[#AAAAAA] mt-1">Investment: {formatCurrency(year2Investment)}</p>
              )}
            </div>
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-3 sm:p-5 text-center" data-testid="projection-year-3">
              <p className="text-xs sm:text-sm text-[#888888] mb-1 sm:mb-2">Year 3</p>
              <p className="text-lg sm:text-xl font-bold text-black">{formatCurrency(year3Value)}</p>
              <p className="text-xs text-[#888888] mt-1">+{state.year3GrowthPercent}% growth</p>
              <div className="h-px bg-[#F0EBE4] my-3" />
              <p className="text-sm">
                <span className="text-[#888888]">Net: </span>
                <span className={`font-semibold ${year3Net >= 0 ? 'text-[#EA2C00]' : 'text-[#888888]'}`} data-testid="projection-year-3-net">{formatCurrency(year3Net)}</span>
              </p>
              {state.pricingModel === 'perEncounter' && (
                <p className="text-xs text-[#AAAAAA] mt-1">Investment: {formatCurrency(year3Investment)}</p>
              )}
            </div>
            <div className="bg-[#F5F0EB] rounded-lg p-3 sm:p-5 text-center" data-testid="projection-three-year-total">
              <p className="text-xs sm:text-sm text-[#888888] mb-1 sm:mb-2">3-Year Value</p>
              <p className="text-lg sm:text-xl font-bold text-[#EA2C00]">{formatCurrency(threeYearGrossTotal)}</p>
              <p className="text-xs text-[#888888] mt-1">gross value</p>
              <div className="h-px bg-[#E5DCD0] my-3" />
              <p className="text-base">
                <span className="text-[#888888]">Net: </span>
                <span className={`font-semibold ${threeYearNetTotal >= 0 ? 'text-[#EA2C00]' : 'text-[#888888]'}`} data-testid="projection-three-year-net">{formatCurrency(threeYearNetTotal)}</span>
              </p>
              <p className="text-xs text-[#AAAAAA] mt-1">Investment: {formatCurrency(threeYearInvestmentTotal)}</p>
            </div>
          </div>

          <p className="text-sm text-[#888888] text-center mt-4">
            Years 2 and 3 apply {state.year2GrowthPercent}% and {state.year3GrowthPercent}% growth to annual recurring value. {state.pricingModel === 'perEncounter'
              ? 'For per-encounter pricing, encounter volume scales by the same percentages, so investment grows alongside value.'
              : 'For per-provider or annual-license pricing, investment is held constant across years.'}
          </p>
        </motion.div>
        )}

        {/* EXPORT SECTION */}
        <motion.div
          className="bg-[#F5F0EB] rounded-xl p-4 sm:p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-black uppercase tracking-wide mb-1">Your Analysis</p>
              {isNursing ? (
                <p className="text-sm text-[#888888]">
                  {careSettingLabel} · {formatNumber(state.nursingStaffedBeds)} beds · ${formatNumber(state.costPerProvider)}/bed/mo
                </p>
              ) : state.pricingModel === 'perEncounter' ? (
                <p className="text-sm text-[#888888]">
                  {careSettingLabel} · {formatNumber(state.numberOfProviders)} providers · ${(state.costPerEncounter ?? 0).toFixed(2)}/encounter
                </p>
              ) : (
                <p className="text-sm text-[#888888]">
                  {careSettingLabel} · {formatNumber(state.numberOfProviders)} providers · ${formatNumber(state.costPerProvider)}/provider/mo
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              {!noDriversEnabled && onAddToProforma && (
                <Button
                  onClick={handleAddToProforma}
                  className="gap-2 bg-[#EA2C00] hover:bg-[#D42800] text-white sm:bg-transparent sm:text-[#EA2C00] sm:border sm:border-[#EA2C00] sm:hover:bg-[#EA2C00]/5 order-1 h-11 sm:h-9 text-sm font-semibold"
                  data-testid="button-add-proforma"
                  title="Saves this model to your multi-setting pricing proposal"
                >
                  <Layers className="w-4 h-4" />
                  Add to Pricing Proposal
                </Button>
              )}
              {!noDriversEnabled && (
              <Button
                onClick={() => setShowExportModal(true)}
                className={`gap-2 order-2 h-11 sm:h-9 text-sm font-semibold ${onAddToProforma ? "bg-[#1A1A1A] hover:bg-black text-white" : "bg-[#EA2C00] hover:bg-[#D42800] text-white"}`}
                data-testid="button-export"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
              )}
              <Button
                variant="outline"
                onClick={onEdit}
                className="gap-2 border-neutral-300 text-neutral-600 order-3 h-11 sm:h-9 text-sm"
                data-testid="button-edit"
              >
                <Edit className="w-4 h-4" />
                Edit Model
              </Button>
            </div>
          </div>
        </motion.div>

        {/* METHODOLOGY */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E5E5] rounded-lg hover-elevate text-sm text-[#888888]"
            data-testid="button-methodology"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Methodology & Assumptions — understand how we calculated these
            </span>
            {showMethodology ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          <AnimatePresence>
            {showMethodology && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 bg-white border border-t-0 border-[#E5E5E5] rounded-b-lg text-sm text-[#666666] space-y-3">
                  <p>
                    <strong className="text-black">Time savings:</strong> {state.minutesSavedPerEncounter} min per encounter × {formatNumber(Math.round(state.annualEncounters * state.utilizationPercent / 100))} eligible encounters.
                  </p>
                  <p>
                    <strong className="text-black">Utilization rate:</strong> {state.utilizationPercent}% of encounters projected to use Abridge.
                  </p>
                  {timeDriverInputs.patientAccessEnabled && (
                    <p>
                      <strong className="text-black">Patient Access:</strong> {derivedVisitsPerWeek} visits/wk × {effectiveAccessProviders}{effectiveAccessProviders < state.numberOfProviders ? ` of ${state.numberOfProviders}` : ''} providers × 48 wks × ${timeDriverInputs.revenuePerVisit}/visit ({timeDriverInputs.capacityRealizationPercent}% of saved time reinvested).
                    </p>
                  )}
                  {docQualityInputs.wrvuEnabled && (
                    <p>
                      <strong className="text-black">wRVU:</strong> {wrvuScenarios[docQualityInputs.wrvuScenario]}% improvement × ${docQualityInputs.conversionFactor} conversion factor × {docQualityInputs.wrvuRealization}% realization.
                    </p>
                  )}
                  <p>
                    <strong className="text-black">Growth assumptions:</strong> Year 2 uses {state.year2GrowthPercent}% growth and Year 3 uses {state.year3GrowthPercent}% growth (compounded over Year 2). Adjust the pace selector or override the percentages directly.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="text-xs text-[#AAAAAA] leading-relaxed mt-8 mb-4 text-center max-w-2xl mx-auto">
          Projections are modeled estimates based on user-provided inputs, published industry benchmarks, and aggregated deployment experience. Actual results may vary based on implementation approach, provider adoption, organizational factors, and care setting. This does not constitute a guarantee of financial outcomes.
        </p>

        <PDFExportModal
          open={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExportPDF}
          isExporting={isExporting}
          documentType="ROI model"
        />

      </div>
    </div>
  );
}
