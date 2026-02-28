import { useMemo, useState } from "react";
import { Download, ChevronDown, ChevronUp, Edit, FileText, TrendingUp, Link, BarChart3, Check, AlertTriangle, Sparkles, FileCheck, Loader2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type ExploreState } from "./ExploreFlow";
import { PDFExportModal } from "@/components/switch/PDFExportModal";
import { useToast } from "@/hooks/use-toast";
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { generateExplorePDF, type ExploreDriver, type ExplorePDFData } from "@/components/explore/ExplorePDFExport";
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
}: ExploreModelProps) {
  const [showMethodology, setShowMethodology] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const totalValue = timeValue + docValue;
  const netAnnualValue = totalValue - annualInvestment;
  const roi = annualInvestment > 0 ? totalValue / annualInvestment : 0;
  const valuePerProvider = state.numberOfProviders > 0 ? Math.round(netAnnualValue / state.numberOfProviders) : 0;

  const hasQualitativeDrivers = useMemo(() => {
    const { timeDriverInputs: t, docQualityInputs: d } = state;
    if (state.careSetting === 'outpatient') return t.wellbeingEnabled && !t.calculateRetentionValue;
    if (state.careSetting === 'ed') return t.wellbeingEnabled && !t.calculateRetentionValue;
    if (state.careSetting === 'inpatient') return (t.wellbeingEnabled && !t.calculateRetentionValue) || t.ipRoundingEnabled;
    if (state.careSetting === 'nursing') return d.nursingHcahpsEnabled || t.nursingCareTimeEnabled;
    return false;
  }, [state]);
  const isQualitativeOnly = totalValue === 0 && hasQualitativeDrivers;

  // Calculate patient access and cost reduction separately
  const { timeDriverInputs, docQualityInputs } = state;
  
  const patientAccessValue = useMemo(() => {
    if (!timeDriverInputs.patientAccessEnabled) return 0;
    const hoursTowardCapacity = totalHoursSaved * (timeDriverInputs.capacityPercent / 100);
    const potentialVisits = hoursTowardCapacity * (60 / timeDriverInputs.visitDuration);
    return Math.round(potentialVisits * timeDriverInputs.revenuePerVisit);
  }, [totalHoursSaved, timeDriverInputs]);

  const costReductionValue = timeDriverInputs.costReductionEnabled ? timeDriverInputs.estimatedCostReduction : 0;

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

  const isED = state.careSetting === 'ed';
  const isNursing = state.careSetting === 'nursing';

  // Doc value breakdown
  const eligibleEncounters = state.annualEncounters * (state.utilizationPercent / 100);
  const wrvuScenarios: Record<string, number> = { conservative: 2, typical: 5, aggressive: 7 };
  const hccScenarios: Record<string, number> = { conservative: 6, typical: 10, aggressive: 15 };
  const denialsScenarios: Record<string, number> = { conservative: 25, typical: 50, aggressive: 75 };

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

  const retentionScenarios: Record<string, number> = { conservative: 20, typical: 30, optimistic: 40 };

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
    return Math.round(queriesAvoided * docQualityInputs.ipCdiCostPerQuery);
  }, [isInpatient, eligibleEncounters, docQualityInputs]);

  const hoursPerProviderPerWeek = state.numberOfProviders > 0 
    ? (totalHoursSaved / state.numberOfProviders / 52).toFixed(1)
    : '0';

  const nursingOtValue = useMemo(() => {
    if (!isNursing || !state.timeDriverInputs.nursingOtEnabled) return 0;
    const otHoursEliminated = totalHoursSaved * (state.timeDriverInputs.nursingOtReductionPercent / 100);
    return Math.round(otHoursEliminated * state.timeDriverInputs.nursingOtHourlyRate);
  }, [isNursing, totalHoursSaved, state.timeDriverInputs]);

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
    if (!isNursing || !state.timeDriverInputs.nursingAgencyEnabled || !state.timeDriverInputs.nursingRetentionEnabled) return 0;
    const weeksOfCoverage = state.timeDriverInputs.nursingAgencyWeeksPerVacancy || 12;
    const weeklyPremium = state.timeDriverInputs.nursingAgencyWeeklyPremium || 2500;
    return Math.round(nursingRetainedCount * weeksOfCoverage * weeklyPremium);
  }, [isNursing, nursingRetainedCount, state.timeDriverInputs]);

  const nursingCareTimeEffectiveness = useMemo(() => {
    if (!isNursing) return 1;
    const carePercent = state.timeDriverInputs.nursingCareTimePercent / 100;
    return 0.30 + (carePercent * 0.70);
  }, [isNursing, state.timeDriverInputs.nursingCareTimePercent]);

  const nursingCareQualityPotential = useMemo(() => {
    if (!isNursing) return 0;
    const { docQualityInputs } = state;
    const patientDays = state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
    let total = 0;
    if (docQualityInputs.nursingHapiEnabled) {
      const hapIs = (patientDays / 1000) * docQualityInputs.nursingHapiRate;
      total += hapIs * (docQualityInputs.nursingHapiPreventionRate / 100) * docQualityInputs.nursingHapiCost * nursingCareTimeEffectiveness;
    }
    if (docQualityInputs.nursingFallsEnabled) {
      const falls = (patientDays / 1000) * docQualityInputs.nursingFallsRate;
      total += falls * (docQualityInputs.nursingFallsPreventionRate / 100) * docQualityInputs.nursingFallsCost * nursingCareTimeEffectiveness;
    }
    return Math.round(total);
  }, [isNursing, state.nursingStaffedBeds, state.nursingOccupancyRate, state.docQualityInputs, nursingCareTimeEffectiveness]);

  const valuePerBed = isNursing && state.nursingStaffedBeds > 0 ? Math.round(totalValue / state.nursingStaffedBeds) : 0;
  const netPerBedYear = isNursing && state.nursingStaffedBeds > 0 ? Math.round(netAnnualValue / state.nursingStaffedBeds) : 0;

  const nursingHapiValue = useMemo(() => {
    if (!isNursing || !state.docQualityInputs.nursingHapiEnabled) return 0;
    const patientDays = state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
    const hapIs = (patientDays / 1000) * state.docQualityInputs.nursingHapiRate;
    return Math.round(hapIs * (state.docQualityInputs.nursingHapiPreventionRate / 100) * state.docQualityInputs.nursingHapiCost * nursingCareTimeEffectiveness);
  }, [isNursing, state.nursingStaffedBeds, state.nursingOccupancyRate, state.docQualityInputs, nursingCareTimeEffectiveness]);

  const nursingFallsValue = useMemo(() => {
    if (!isNursing || !state.docQualityInputs.nursingFallsEnabled) return 0;
    const patientDays = state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
    const falls = (patientDays / 1000) * state.docQualityInputs.nursingFallsRate;
    return Math.round(falls * (state.docQualityInputs.nursingFallsPreventionRate / 100) * state.docQualityInputs.nursingFallsCost * nursingCareTimeEffectiveness);
  }, [isNursing, state.nursingStaffedBeds, state.nursingOccupancyRate, state.docQualityInputs, nursingCareTimeEffectiveness]);

  const nursingCareTimePerWeek = isNursing && state.timeDriverInputs.nursingCareTimeEnabled 
    ? ((totalHoursSaved / state.numberOfProviders / 52) * (state.timeDriverInputs.nursingCareTimePercent / 100)).toFixed(1) 
    : '0';

  // 3-year projection (10% growth per year)
  const implementationCost = state.includeImplementation ? state.implementationFee : 0;
  const year1Value = totalValue - implementationCost;
  const year2Value = Math.round(totalValue * 1.1);
  const year3Value = Math.round(totalValue * 1.21);
  const threeYearTotal = year1Value + year2Value + year3Value;

  // Expansion opportunity (use fullScaleProviders from state, editable utilization)
  const expandedProviders = state.fullScaleProviders;
  const [expandedUtilization, setExpandedUtilization] = useState(80);
  const expansionMultiplier = (expandedProviders / state.numberOfProviders) * (expandedUtilization / state.utilizationPercent);
  const expandedValue = Math.round(netAnnualValue * expansionMultiplier);
  
  // Full scale investment scales with provider count (not utilization - you pay per provider)
  const providerExpansionRatio = expandedProviders / state.numberOfProviders;
  const expandedInvestment = annualInvestment * providerExpansionRatio;
  const expandedRoi = expandedInvestment > 0 ? (totalValue * expansionMultiplier) / expandedInvestment : 0;

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
    if (ipCdiValue > 0) drivers.push({ id: "ipCdi", name: "CDI Query Reduction", value: ipCdiValue, category: "documentation", onset: "immediate" as const });
    if (nursingHapiValue > 0) drivers.push({ id: "nursingHapi", name: "HAPI Prevention", value: nursingHapiValue, category: "documentation", onset: "immediate" as const });
    if (nursingFallsValue > 0) drivers.push({ id: "nursingFalls", name: "Falls Prevention", value: nursingFallsValue, category: "documentation", onset: "immediate" as const });

    const retentionValue = isNursing
      ? nursingRetentionValue + nursingAgencyValue
      : clinicianRetentionValue;

    if (retentionValue > 0) {
      drivers.push({ id: "retention", name: isNursing ? "Nurse Retention" : "Clinician Retention", value: retentionValue, category: "time", onset: "phased" as const });
    }

    const pilotProviders = isNursing ? state.nursingStaffedBeds : state.numberOfProviders;
    const snapshot: ProformaSettingSnapshot = {
      id: `${cs}-${Date.now()}`,
      careSetting: cs,
      label: SETTING_LABELS[cs] || cs,
      providerCount: pilotProviders,
      fullScaleProviders: isNursing ? pilotProviders : state.fullScaleProviders,
      fullScaleUtilization: isNursing ? state.utilizationPercent : Math.min(expandedUtilization, 95),
      encounters: state.annualEncounters,
      utilizationPercent: state.utilizationPercent,
      annualValue: totalValue,
      timeValue,
      docValue,
      retentionValue,
      totalHoursSaved,
      drivers,
      costPerUnit: state.costPerProvider,
      implementationFee: state.includeImplementation ? state.implementationFee : 0,
      goLiveMonth: 1,
      color: SETTING_COLORS[cs] || "#EA2C00",
      fullExploreState: { ...state },
    };

    onAddToProforma(snapshot);
    toast({
      title: `${snapshot.label} added to proforma`,
      description: `${formatCurrency(totalValue)} annual value captured`,
    });
  };

  // Scaling pace options
  const [selectedPace, setSelectedPace] = useState<'measured' | 'steady' | 'aggressive'>('steady');
  
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
      const drivers: ExploreDriver[] = [];
      const fmtK = (n: number) => Math.abs(n) >= 1000 ? `$${Math.round(n / 1000)}K` : `$${Math.round(n)}`;

      if (state.careSetting === 'outpatient') {
        if (timeDriverInputs.patientAccessEnabled && patientAccessValue > 0) {
          const hoursTowardCapacity = totalHoursSaved * (timeDriverInputs.capacityPercent / 100);
          const potentialVisits = hoursTowardCapacity * (60 / timeDriverInputs.visitDuration);
          drivers.push({
            id: 'patientAccess', name: 'Patient Access', value: patientAccessValue, category: 'time',
            calcSteps: [
              `${totalHoursSaved.toLocaleString()} hrs \u00D7 ${timeDriverInputs.capacityPercent}% toward capacity = ${Math.round(hoursTowardCapacity).toLocaleString()} hrs`,
              `${Math.round(hoursTowardCapacity).toLocaleString()} hrs \u00D7 (60/${timeDriverInputs.visitDuration} min) = ${Math.round(potentialVisits).toLocaleString()} visits`,
              `${Math.round(potentialVisits).toLocaleString()} \u00D7 $${timeDriverInputs.revenuePerVisit}/visit = ${fmtK(patientAccessValue)}/year`,
            ],
          });
        }
        if (timeDriverInputs.costReductionEnabled && costReductionValue > 0) {
          drivers.push({
            id: 'costReduction', name: 'Cost Reduction', value: costReductionValue, category: 'time',
            calcSteps: [`Estimated annual cost reduction: ${fmtK(costReductionValue)}/year`],
          });
        }
        if (docQualityInputs.wrvuEnabled && wrvuValue > 0) {
          const wrvuLiftPct = wrvuScenarios[docQualityInputs.wrvuScenario];
          drivers.push({
            id: 'wrvu', name: 'wRVU Improvement', value: wrvuValue, category: 'documentation',
            calcSteps: [
              `${docQualityInputs.currentWrvu} wRVU/enc \u00D7 ${wrvuLiftPct}% lift \u00D7 ${eligibleEncounters.toLocaleString()} encounters`,
              `\u00D7 $${docQualityInputs.conversionFactor}/wRVU \u00D7 ${docQualityInputs.wrvuRealization}% realization`,
              `= ${fmtK(wrvuValue)}/year`,
            ],
            inputs: { realizationRate: docQualityInputs.wrvuRealization },
          });
        }
        if (docQualityInputs.hccEnabled && hccValue > 0) {
          drivers.push({
            id: 'hcc', name: 'HCC Capture', value: hccValue, category: 'documentation',
            calcSteps: [
              `MA patients \u00D7 gap rate \u00D7 recapture rate \u00D7 RAF value`,
              `\u00D7 ${docQualityInputs.hccRealization}% realization`,
              `= ${fmtK(hccValue)}/year`,
            ],
            inputs: { realizationRate: docQualityInputs.hccRealization },
          });
        }
        if (docQualityInputs.denialsEnabled && denialsValue > 0) {
          drivers.push({
            id: 'denials', name: 'Denial Prevention', value: denialsValue, category: 'documentation',
            calcSteps: [
              `${eligibleEncounters.toLocaleString()} enc \u00D7 ${docQualityInputs.denialRate}% denial rate`,
              `\u00D7 ${docQualityInputs.unappealableRate}% doc-related \u00D7 ${denialsScenarios[docQualityInputs.denialsScenario]}% prevented`,
              `\u00D7 $${docQualityInputs.avgClaimValue.toLocaleString()}/claim = ${fmtK(denialsValue)}/year`,
            ],
            inputs: { realizationRate: docQualityInputs.denialsRealization },
          });
        }
        if (timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue && clinicianRetentionValue > 0) {
          const impactPct = retentionScenarios[timeDriverInputs.retentionImpactScenario] || 30;
          drivers.push({
            id: 'clinicianRetention', name: 'Clinician Retention', value: clinicianRetentionValue, category: 'time',
            calcSteps: [
              `${state.numberOfProviders} providers \u00D7 ${timeDriverInputs.annualTurnoverRate}% turnover \u00D7 ${timeDriverInputs.burnoutRelatedTurnover}% burnout-related`,
              `\u00D7 ${impactPct}% Abridge impact \u00D7 $${timeDriverInputs.replacementCost.toLocaleString()} replacement cost`,
              `= ${fmtK(clinicianRetentionValue)}/year`,
            ],
          });
        }
      } else if (state.careSetting === 'ed') {
        if (timeDriverInputs.edLwbsEnabled && (edLwbsValue > 0 || edAdmissionCaptureValue > 0)) {
          const combined = edLwbsValue + edAdmissionCaptureValue;
          drivers.push({
            id: 'edThroughput', name: 'Patient Throughput (LWBS)', value: combined, category: 'time',
            calcSteps: [
              `${state.annualEncounters.toLocaleString()} enc \u00D7 ${timeDriverInputs.edLwbsRate}% LWBS \u00D7 ${timeDriverInputs.edLwbsReduction}% reduction`,
              `${Math.round(edRecoveredPatients).toLocaleString()} recovered \u00D7 $${timeDriverInputs.edRevenuePerVisit}/visit`,
              `LWBS: ${fmtK(edLwbsValue)} + Admissions: ${fmtK(edAdmissionCaptureValue)} = ${fmtK(combined)}/year`,
            ],
            inputs: { realizationRate: timeDriverInputs.edLwbsRealization },
          });
        }
        if (timeDriverInputs.costReductionEnabled && costReductionValue > 0) {
          drivers.push({
            id: 'edCostReduction', name: 'Cost Reduction', value: costReductionValue, category: 'time',
            calcSteps: [`Estimated annual cost reduction: ${fmtK(costReductionValue)}/year`],
          });
        }
        if (timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue && clinicianRetentionValue > 0) {
          const impactPct = retentionScenarios[timeDriverInputs.retentionImpactScenario] || 30;
          drivers.push({
            id: 'edRetention', name: 'Clinician Retention', value: clinicianRetentionValue, category: 'time',
            calcSteps: [
              `${state.numberOfProviders} physicians \u00D7 ${timeDriverInputs.annualTurnoverRate}% turnover \u00D7 ${timeDriverInputs.burnoutRelatedTurnover}% burnout-related`,
              `\u00D7 ${impactPct}% Abridge impact \u00D7 $${timeDriverInputs.replacementCost.toLocaleString()} replacement cost`,
              `= ${fmtK(clinicianRetentionValue)}/year`,
            ],
          });
        }
        if (docQualityInputs.wrvuEnabled && wrvuValue > 0) {
          const wrvuLiftPct = wrvuScenarios[docQualityInputs.wrvuScenario];
          drivers.push({
            id: 'edLevelOfService', name: 'Level-of-Service Accuracy', value: wrvuValue, category: 'documentation',
            calcSteps: [
              `${docQualityInputs.currentWrvu} wRVU/enc \u00D7 ${wrvuLiftPct}% lift \u00D7 ${eligibleEncounters.toLocaleString()} encounters`,
              `\u00D7 $${docQualityInputs.conversionFactor}/wRVU \u00D7 ${docQualityInputs.wrvuRealization}% realization`,
              `= ${fmtK(wrvuValue)}/year`,
            ],
            inputs: { realizationRate: docQualityInputs.wrvuRealization },
          });
        }
        if (docQualityInputs.denialsEnabled && denialsValue > 0) {
          drivers.push({
            id: 'edDenials', name: 'Denial Prevention', value: denialsValue, category: 'documentation',
            calcSteps: [
              `${eligibleEncounters.toLocaleString()} enc \u00D7 ${docQualityInputs.denialRate}% denial rate`,
              `\u00D7 ${docQualityInputs.unappealableRate}% doc-related \u00D7 ${denialsScenarios[docQualityInputs.denialsScenario]}% prevented`,
              `\u00D7 $${docQualityInputs.avgClaimValue.toLocaleString()}/claim = ${fmtK(denialsValue)}/year`,
            ],
            inputs: { realizationRate: docQualityInputs.denialsRealization },
          });
        }
      } else if (state.careSetting === 'inpatient') {
        if (timeDriverInputs.costReductionEnabled && costReductionValue > 0) {
          drivers.push({
            id: 'ipCostReduction', name: 'Cost Reduction', value: costReductionValue, category: 'time',
            calcSteps: [`Estimated annual cost reduction: ${fmtK(costReductionValue)}/year`],
          });
        }
        if (timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue && ipWellbeingRetentionValue > 0) {
          const impactPct = retentionScenarios[timeDriverInputs.retentionImpactScenario] || 30;
          drivers.push({
            id: 'inpatientRetention', name: 'Hospitalist Retention', value: ipWellbeingRetentionValue, category: 'time',
            calcSteps: [
              `${state.numberOfProviders} hospitalists \u00D7 ${timeDriverInputs.annualTurnoverRate}% turnover \u00D7 ${timeDriverInputs.burnoutRelatedTurnover}% burnout-related`,
              `\u00D7 ${impactPct}% Abridge impact \u00D7 $${timeDriverInputs.replacementCost.toLocaleString()} replacement cost`,
              `= ${fmtK(ipWellbeingRetentionValue)}/year`,
            ],
          });
        }
        if (docQualityInputs.ipDrgEnabled && ipDrgValue > 0) {
          const captureRate = docQualityInputs.ipDrgScenario === 'conservative' ? 15 : docQualityInputs.ipDrgScenario === 'typical' ? 20 : 25;
          drivers.push({
            id: 'inpatientDRG', name: 'DRG Accuracy', value: ipDrgValue, category: 'documentation',
            calcSteps: [
              `${eligibleEncounters.toLocaleString()} enc \u00D7 ${docQualityInputs.ipDrgAtRiskRate}% at-risk \u00D7 ${captureRate}% captured`,
              `\u00D7 ${docQualityInputs.ipDrgWeightIncrease} wt increase \u00D7 $${docQualityInputs.ipDrgBasePayment.toLocaleString()} base`,
              `\u00D7 ${docQualityInputs.ipDrgRealization}% realization = ${fmtK(ipDrgValue)}/year`,
            ],
            inputs: { realizationRate: docQualityInputs.ipDrgRealization },
          });
        }
        if (docQualityInputs.ipCdiEnabled && ipCdiValue > 0) {
          const reductionRate = docQualityInputs.ipCdiScenario === 'conservative' ? 15 : docQualityInputs.ipCdiScenario === 'typical' ? 25 : 35;
          drivers.push({
            id: 'inpatientCDI', name: 'CDI Query Reduction', value: ipCdiValue, category: 'documentation',
            calcSteps: [
              `${eligibleEncounters.toLocaleString()} enc \u00D7 ${docQualityInputs.ipCdiQueryRate}% query rate \u00D7 ${reductionRate}% reduced`,
              `\u00D7 $${docQualityInputs.ipCdiCostPerQuery}/query = ${fmtK(ipCdiValue)}/year`,
            ],
          });
        }
      } else if (state.careSetting === 'nursing') {
        if (timeDriverInputs.nursingOtEnabled && nursingOtValue > 0) {
          const otHours = Math.round(totalHoursSaved * (timeDriverInputs.nursingOtReductionPercent / 100));
          drivers.push({
            id: 'nursingOT', name: 'OT Reduction', value: nursingOtValue, category: 'time',
            calcSteps: [
              `${totalHoursSaved.toLocaleString()} hrs saved \u00D7 ${timeDriverInputs.nursingOtReductionPercent}% OT conversion = ${otHours.toLocaleString()} OT hrs`,
              `${otHours.toLocaleString()} \u00D7 $${timeDriverInputs.nursingOtHourlyRate}/hr = ${fmtK(nursingOtValue)}/year`,
            ],
          });
        }
        if (timeDriverInputs.nursingRetentionEnabled && nursingRetentionValue > 0) {
          drivers.push({
            id: 'nursingRetention', name: 'Retention Savings', value: nursingRetentionValue, category: 'time',
            calcSteps: [
              `${state.numberOfProviders} FTEs \u00D7 ${timeDriverInputs.nursingTurnoverRate}% turnover \u00D7 40% burnout-related`,
              `\u00D7 ${timeDriverInputs.retentionImpactScenario} impact \u00D7 $${timeDriverInputs.nursingReplacementCost.toLocaleString()} replacement`,
              `= ${fmtK(nursingRetentionValue)}/year`,
            ],
          });
        }
        if (timeDriverInputs.nursingAgencyEnabled && nursingAgencyValue > 0) {
          drivers.push({
            id: 'nursingAgency', name: 'Agency Cost Avoidance', value: nursingAgencyValue, category: 'time',
            calcSteps: [
              `${nursingRetainedCount.toFixed(1)} retained \u00D7 ${timeDriverInputs.nursingAgencyWeeksPerVacancy} wks \u00D7 $${timeDriverInputs.nursingAgencyWeeklyPremium.toLocaleString()}/wk`,
              `= ${fmtK(nursingAgencyValue)}/year`,
            ],
          });
        }
        if (nursingCareQualityPotential > 0) {
          const parts: string[] = [];
          if (nursingHapiValue > 0) parts.push(`HAPI prevention: ${fmtK(nursingHapiValue)}`);
          if (nursingFallsValue > 0) parts.push(`Falls prevention: ${fmtK(nursingFallsValue)}`);
          parts.push(`= ${fmtK(nursingCareQualityPotential)}/year`);
          drivers.push({
            id: 'nursingCareQuality', name: 'Care Quality (Potential)', value: nursingCareQualityPotential, category: 'documentation',
            calcSteps: parts,
            calibrationNote: 'Potential value based on adverse event prevention rates.',
          });
        }
      }

      const fullScaleValue = state.careSetting === 'nursing'
        ? Math.round(netAnnualValue * (expandedProviders / state.nursingStaffedBeds) * (expandedUtilization / state.utilizationPercent))
        : Math.round(netAnnualValue * (expandedProviders / state.numberOfProviders) * (expandedUtilization / state.utilizationPercent));

      const qualitativeDrivers: string[] = [];
      if (state.careSetting === 'outpatient') {
        if (timeDriverInputs.wellbeingEnabled && !timeDriverInputs.calculateRetentionValue) qualitativeDrivers.push('Clinician Wellbeing');
      } else if (state.careSetting === 'ed') {
        if (timeDriverInputs.wellbeingEnabled && !timeDriverInputs.calculateRetentionValue) qualitativeDrivers.push('Clinician Wellbeing');
      } else if (state.careSetting === 'inpatient') {
        if (timeDriverInputs.ipRoundingEnabled) qualitativeDrivers.push('Rounding Efficiency');
        if (timeDriverInputs.wellbeingEnabled && !timeDriverInputs.calculateRetentionValue) qualitativeDrivers.push('Clinician Wellbeing');
      } else if (state.careSetting === 'nursing') {
        if (state.docQualityInputs.nursingHcahpsEnabled) qualitativeDrivers.push('HCAHPS Improvement');
        if (state.timeDriverInputs.nursingCareTimeEnabled) qualitativeDrivers.push('Bedside Time');
      }

      const pdfData: ExplorePDFData = {
        careSetting: state.careSetting as ExplorePDFData['careSetting'],
        clientName,
        preparedBy,
        providers: state.numberOfProviders,
        encounters: state.annualEncounters,
        utilizationPercent: state.utilizationPercent,
        hoursReturned: totalHoursSaved,
        nursingStaffedBeds: state.nursingStaffedBeds,
        nursingFTEs: state.numberOfProviders,
        totalValue,
        timeValue,
        docValue,
        annualInvestment,
        netAnnualValue,
        roi,
        drivers,
        qualitativeDrivers,
        fullScaleProviders: expandedProviders,
        fullScaleUtilization: expandedUtilization,
        fullScaleValue,
        implementationCost: state.includeImplementation ? state.implementationFee : 0,
        minutesSavedPerEncounter: state.minutesSavedPerEncounter,
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
      timeCardTitle: 'Time Back',
      timeCardDescription: 'Documentation consumes 1-2 hours per clinician daily. Abridge eliminates most of this burden.',
      driver1: 'Patient Access',
      driver2: 'Cost Reduction',
      driver3: 'Clinician Wellbeing',
      docCardTitle: 'Documentation Quality',
      docCardDescription: 'When documentation is complete and accurate, downstream revenue follows.',
      docDriver1: 'wRVU Improvement',
      docDriver2: 'HCC Capture',
      docDriver3: 'Denial Prevention',
      showHCC: true,
    },
    ed: {
      timeCardTitle: 'Time Back',
      timeCardDescription: 'Faster documentation means shorter door-to-doc times and reduced LWBS rates.',
      driver1: 'LWBS Recovery',
      driver2: 'Admission Capture',
      driver3: 'Clinician Wellbeing',
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
      driver2: 'Clinician Wellbeing',
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
      timeCardDescription: 'Less time documenting means nurses finish on time and stay longer.',
      driver1: 'OT Reduction',
      driver2: 'Retention Savings',
      driver3: 'Agency Reduction',
      docCardTitle: 'Care Quality',
      docCardDescription: 'Complete documentation supports better care and fewer adverse events.',
      docDriver1: 'HAPI Prevention',
      docDriver2: 'Falls Prevention',
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
      />
      <UnifiedHeaderSpacer />

      {/* HERO SECTION - Dark Background */}
      <motion.div
        className="bg-[#1A1A1A] py-12 md:py-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
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
            <p className="text-5xl md:text-7xl font-bold text-[#EA2C00] mb-1" data-testid="text-net-value">
              {formatCurrency(netAnnualValue)}
            </p>
          )}
          {!isQualitativeOnly && <p className="text-xl text-[#888888] mb-4">/ year</p>}
          {isQualitativeOnly && <p className="text-sm text-[#888888] mb-4">Strategic value — not dollarized</p>}

          {/* Subtext */}
          <p className="text-base text-[#888888] mb-8">
            {isQualitativeOnly
              ? "Enable quantitative levers to build a financial case"
              : `${formatCurrency(totalValue)} value – ${formatCurrency(annualInvestment)} investment`}
          </p>

          {/* Stat Cards */}
          {isNursing ? (
            <div className="flex justify-center gap-4 flex-wrap">
              <div className="bg-[#2A2A2A] rounded-lg px-6 py-4 min-w-[120px]" data-testid="stat-roi">
                <p className="text-2xl font-bold text-white">{roi.toFixed(1)}×</p>
                <p className="text-xs text-[#888888]">ROI</p>
              </div>
              <div className="bg-[#2A2A2A] rounded-lg px-6 py-4 min-w-[120px]" data-testid="stat-per-bed">
                <p className="text-2xl font-bold text-white">{formatCurrency(netPerBedYear)}</p>
                <p className="text-xs text-[#888888]">per bed/yr</p>
              </div>
              <div className="bg-[#2A2A2A] rounded-lg px-6 py-4 min-w-[120px]" data-testid="stat-hours-saved">
                <p className="text-2xl font-bold text-white">{formatNumber(totalHoursSaved)}</p>
                <p className="text-xs text-[#888888]">hours saved</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center gap-4 flex-wrap">
              <div className="bg-[#2A2A2A] rounded-lg px-6 py-4 min-w-[120px]" data-testid="stat-roi">
                <p className="text-2xl font-bold text-white">{roi.toFixed(1)}×</p>
                <p className="text-xs text-[#888888]">ROI</p>
              </div>
              <div className="bg-[#2A2A2A] rounded-lg px-6 py-4 min-w-[120px]" data-testid="stat-per-provider">
                <p className="text-2xl font-bold text-white">{formatCurrency(valuePerProvider)}</p>
                <p className="text-xs text-[#888888]">per provider</p>
              </div>
              <div className="bg-[#2A2A2A] rounded-lg px-6 py-4 min-w-[120px]" data-testid="stat-hours-saved">
                <p className="text-2xl font-bold text-white">{formatNumber(totalHoursSaved)}</p>
                <p className="text-xs text-[#888888]">hours saved</p>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-sm text-[#666666] mt-6 italic">
            These projections reflect conservative assumptions. See Methodology for details.
          </p>
        </div>
      </motion.div>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-10 md:py-12">
        
        {/* WHERE THE VALUE COMES FROM */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-center text-xl font-bold text-black mb-2">
            Where the Value Comes From
          </p>
          {isNursing ? (
            <p className="text-center text-base text-[#888888] mb-6">
              Abridge creates value through staffing efficiency and care quality—each with its own drivers and assumptions.
            </p>
          ) : (
            <p className="text-center text-base text-[#888888] mb-6">
              Abridge creates value through two mechanisms—each with its own drivers and assumptions.
            </p>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Time/Efficiency Card */}
            <div className="bg-[#F5F0EB] rounded-xl p-6">
              <p className="text-sm font-bold text-black uppercase tracking-wide mb-2">{labels.timeCardTitle}</p>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-8 bg-[#EA2C00] rounded-full" />
                <p className="text-2xl font-bold text-[#EA2C00]">{formatCurrency(timeValue)} / year</p>
              </div>

              <div className="h-px bg-[#E5E5E5] mb-4" />

              <p className="text-sm text-[#666666] mb-4">
                {labels.timeCardDescription}
              </p>

              <div className="h-px bg-[#E5E5E5] mb-4" />

              <div className="space-y-2 text-sm">
                {isNursing ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• OT Reduction</span>
                      <span className="font-semibold text-black">{state.timeDriverInputs.nursingOtEnabled ? formatCurrency(nursingOtValue) : '—'}</span>
                    </div>
                    {state.timeDriverInputs.nursingOtEnabled && (
                      <p className="text-xs text-[#888888] pl-4">({state.timeDriverInputs.nursingOtReductionPercent}% conversion)</p>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• Retention Savings</span>
                      <span className="font-semibold text-black">{state.timeDriverInputs.nursingRetentionEnabled ? formatCurrency(nursingRetentionValue) : '—'}</span>
                    </div>
                    {state.timeDriverInputs.nursingRetentionEnabled && (
                      <p className="text-xs text-[#888888] pl-4">({nursingRetainedCount.toFixed(1)} nurses retained)</p>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• Agency Reduction</span>
                      <span className="font-semibold text-black">{state.timeDriverInputs.nursingAgencyEnabled && state.timeDriverInputs.nursingRetentionEnabled ? formatCurrency(nursingAgencyValue) : '—'}</span>
                    </div>
                    {state.timeDriverInputs.nursingAgencyEnabled && state.timeDriverInputs.nursingRetentionEnabled && (
                      <p className="text-xs text-[#888888] pl-4">({state.timeDriverInputs.nursingAgencyWeeksPerVacancy} weeks × ${state.timeDriverInputs.nursingAgencyWeeklyPremium.toLocaleString()})</p>
                    )}
                    <div className="h-px bg-[#E5E5E5] mt-3 mb-2" />
                    <p className="text-sm text-[#666666]">
                      Care time returned: <span className="font-semibold text-black">{nursingCareTimePerWeek} hrs/wk</span> per nurse
                    </p>
                  </>
                ) : isED ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• {labels.driver1}</span>
                      <span className="font-semibold text-black">{timeDriverInputs.edLwbsEnabled ? formatCurrency(edLwbsValue) : '—'}</span>
                    </div>
                    {timeDriverInputs.edLwbsEnabled && (
                      <p className="text-xs text-[#888888] pl-4">({timeDriverInputs.edLwbsReduction}% LWBS reduction)</p>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• {labels.driver2}</span>
                      <span className="font-semibold text-black">{timeDriverInputs.edThroughputEnabled && timeDriverInputs.edLwbsEnabled ? formatCurrency(edAdmissionCaptureValue) : '—'}</span>
                    </div>
                    {timeDriverInputs.edThroughputEnabled && timeDriverInputs.edLwbsEnabled && (
                      <p className="text-xs text-[#888888] pl-4">({timeDriverInputs.edAdmissionRate}% admission rate)</p>
                    )}
                    {timeDriverInputs.costReductionEnabled && costReductionValue > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-[#666666]">• Cost Reduction</span>
                          <span className="font-semibold text-black">{formatCurrency(costReductionValue)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• {labels.driver3}</span>
                      <span className="font-semibold text-black">{timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue ? formatCurrency(clinicianRetentionValue) : timeDriverInputs.wellbeingEnabled ? `${hoursPerProviderPerWeek} hrs/wk` : '—'}</span>
                    </div>
                    {timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue && (
                      <p className="text-xs text-[#888888] pl-4">({timeDriverInputs.retentionImpactScenario === 'conservative' ? '20' : timeDriverInputs.retentionImpactScenario === 'typical' ? '30' : '40'}% retention lift)</p>
                    )}
                    {timeDriverInputs.wellbeingEnabled && !timeDriverInputs.calculateRetentionValue && (
                      <p className="text-xs text-[#888888] pl-4">(qualitative)</p>
                    )}
                  </>
                ) : isInpatient ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• {labels.driver1}</span>
                      <span className="font-semibold text-black">{`${hoursPerProviderPerWeek} hrs/wk`}</span>
                    </div>
                    <p className="text-xs text-[#888888] pl-4">(qualitative)</p>
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• {labels.driver2}</span>
                      <span className="font-semibold text-black">{timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue ? formatCurrency(ipWellbeingRetentionValue) : '—'}</span>
                    </div>
                    {timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue && (
                      <p className="text-xs text-[#888888] pl-4">({timeDriverInputs.retentionImpactScenario === 'conservative' ? '20' : timeDriverInputs.retentionImpactScenario === 'typical' ? '30' : '40'}% retention lift)</p>
                    )}
                    {timeDriverInputs.wellbeingEnabled && !timeDriverInputs.calculateRetentionValue && (
                      <p className="text-xs text-[#888888] pl-4">(qualitative)</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• {labels.driver1}</span>
                      <span className="font-semibold text-black">{timeDriverInputs.patientAccessEnabled ? formatCurrency(patientAccessValue) : '—'}</span>
                    </div>
                    {timeDriverInputs.patientAccessEnabled && (
                      <p className="text-xs text-[#888888] pl-4">({timeDriverInputs.capacityPercent}% to capacity)</p>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• {labels.driver2}</span>
                      <span className="font-semibold text-black">{costReductionValue > 0 ? formatCurrency(costReductionValue) : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• {labels.driver3}</span>
                      <span className="font-semibold text-black">{timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue ? formatCurrency(clinicianRetentionValue) : timeDriverInputs.wellbeingEnabled ? `${hoursPerProviderPerWeek} hrs/wk` : '—'}</span>
                    </div>
                    {timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue && (
                      <p className="text-xs text-[#888888] pl-4">({timeDriverInputs.retentionImpactScenario === 'conservative' ? '20' : timeDriverInputs.retentionImpactScenario === 'typical' ? '30' : '40'}% retention lift)</p>
                    )}
                    {timeDriverInputs.wellbeingEnabled && !timeDriverInputs.calculateRetentionValue && (
                      <p className="text-xs text-[#888888] pl-4">(qualitative)</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Documentation Quality Card */}
            <div className="bg-[#F5F0EB] rounded-xl p-6">
              <p className="text-sm font-bold text-black uppercase tracking-wide mb-2">{labels.docCardTitle}</p>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-8 bg-[#EA2C00] rounded-full" />
                {isNursing ? (
                  <p className="text-2xl font-bold text-[#EA2C00]">{formatCurrency(nursingCareQualityPotential)} / year <span className="text-base font-medium text-[#888888]">(potential)</span></p>
                ) : (
                  <p className="text-2xl font-bold text-[#EA2C00]">{formatCurrency(docValue)} / year</p>
                )}
              </div>

              <div className="h-px bg-[#E5E5E5] mb-4" />

              <p className="text-sm text-[#666666] mb-4">
                {labels.docCardDescription}
              </p>

              <div className="h-px bg-[#E5E5E5] mb-4" />

              <div className="space-y-2 text-sm">
                {isNursing ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• HAPI Prevention</span>
                      <span className="font-semibold text-black">{state.docQualityInputs.nursingHapiEnabled ? formatCurrency(nursingHapiValue) : '—'}</span>
                    </div>
                    {state.docQualityInputs.nursingHapiEnabled && (
                      <p className="text-xs text-[#888888] pl-4">(potential)</p>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• Falls Prevention</span>
                      <span className="font-semibold text-black">{state.docQualityInputs.nursingFallsEnabled ? formatCurrency(nursingFallsValue) : '—'}</span>
                    </div>
                    {state.docQualityInputs.nursingFallsEnabled && (
                      <p className="text-xs text-[#888888] pl-4">(potential)</p>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• HCAHPS</span>
                      <span className="font-semibold text-black">—</span>
                    </div>
                    <p className="text-xs text-[#888888] pl-4">(qualitative)</p>
                    <div className="h-px bg-[#E5E5E5] mt-3 mb-2" />
                    <p className="text-xs text-[#888888] italic">
                      This is potential value—requires clinical practice, not just docs.
                    </p>
                  </>
                ) : isInpatient ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• {labels.docDriver1}</span>
                      <span className="font-semibold text-black">{docQualityInputs.ipDrgEnabled ? formatCurrency(ipDrgValue) : '—'}</span>
                    </div>
                    {docQualityInputs.ipDrgEnabled && (
                      <p className="text-xs text-[#888888] pl-4">({docQualityInputs.ipDrgScenario === 'conservative' ? '15' : docQualityInputs.ipDrgScenario === 'typical' ? '20' : '25'}% protection)</p>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• {labels.docDriver2}</span>
                      <span className="font-semibold text-black">{docQualityInputs.ipCdiEnabled ? formatCurrency(ipCdiValue) : '—'}</span>
                    </div>
                    {docQualityInputs.ipCdiEnabled && (
                      <p className="text-xs text-[#888888] pl-4">({docQualityInputs.ipCdiScenario === 'conservative' ? '15' : docQualityInputs.ipCdiScenario === 'typical' ? '25' : '35'}% query reduction)</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• {labels.docDriver1}</span>
                      <span className="font-semibold text-black">{docQualityInputs.wrvuEnabled ? formatCurrency(wrvuValue) : '—'}</span>
                    </div>
                    {docQualityInputs.wrvuEnabled && (
                      <p className="text-xs text-[#888888] pl-4">({wrvuScenarios[docQualityInputs.wrvuScenario]}% lift)</p>
                    )}
                    {labels.showHCC && (
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• {labels.docDriver2}</span>
                      <span className="font-semibold text-black">{docQualityInputs.hccEnabled ? formatCurrency(hccValue) : '—'}</span>
                    </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• {labels.docDriver3}</span>
                      <span className="font-semibold text-black">{docQualityInputs.denialsEnabled ? formatCurrency(denialsValue) : '—'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
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
            <div className="bg-[#F5F0EB] rounded-xl p-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                  <Link className="w-5 h-5 text-[#EA2C00]" />
                </div>
                <div>
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
              
              <div className="bg-[#5B4FE9] rounded-xl p-4 text-white">
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
            <div className="bg-[#F5F0EB] rounded-xl p-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                  <Link className="w-5 h-5 text-[#EA2C00]" />
                </div>
                <div>
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
                <p className="text-sm text-[#888888]">Nursing documentation supports the inpatient revenue cycle</p>
              </div>
            </div>
            <div className="bg-[#F5F0EB] rounded-xl p-8">
              <p className="text-sm text-[#666666] mb-5">
                When nurses document thoroughly and in real-time, it directly supports inpatient coding and reimbursement.
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
                    <p className="text-sm font-medium">These benefits are quantified in the <span className="font-bold">Inpatient setting</span>.</p>
                    <p className="text-sm opacity-80 mt-1">If your organization uses Abridge for both Nursing and Hospitalists, the documentation creates a complete clinical picture from admission through discharge.</p>
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

          <div className="bg-[#F5F0EB] rounded-xl p-6">
            {/* Today vs Full Scale Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-center">
                <p className="text-sm font-medium text-[#888888] mb-1">TODAY</p>
                <p className="text-2xl font-bold text-black">{isNursing ? formatNumber(state.nursingStaffedBeds) : formatNumber(state.numberOfProviders)}</p>
                <p className="text-sm text-[#888888]">{isNursing ? 'beds' : 'providers'}</p>
                <p className="text-sm text-[#888888]">{state.utilizationPercent}% {isNursing ? 'adoption' : 'util'}</p>
              </div>
              
              <div className="flex-1 px-6 flex items-center justify-center">
                <span className="text-sm text-[#888888]">expansion →</span>
              </div>

              <div className="text-center">
                <p className="text-sm font-medium text-[#888888] mb-1">FULL SCALE</p>
                <FormattedNumberInput
                  value={state.fullScaleProviders}
                  onChange={(v: number) => updateState({ fullScaleProviders: v })}
                  onBlurValue={(v: number) => updateState({ fullScaleProviders: Math.max(v, state.numberOfProviders) })}
                  className="h-10 w-24 text-center text-2xl font-bold bg-white border border-[#E5E5E5] rounded-lg"
                  data-testid="input-full-scale-providers"
                />
                <p className="text-sm text-[#888888]">{isNursing ? 'beds' : 'providers'}</p>
                <div className="flex items-center justify-center gap-1">
                  <FormattedNumberInput
                    value={expandedUtilization}
                    onChange={(v: number) => setExpandedUtilization(v)}
                    onBlurValue={(v: number) => setExpandedUtilization(Math.min(Math.max(v, 1), 100))}
                    className="h-6 w-12 text-center text-sm bg-white border border-[#E5E5E5] rounded"
                    data-testid="input-full-scale-utilization"
                  />
                  <span className="text-sm text-[#888888]">% {isNursing ? 'adoption' : 'util'}</span>
                </div>
              </div>
            </div>

            {/* Comparison Cards */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-5">
                <p className="text-sm font-medium text-[#888888] mb-2">TODAY'S VALUE</p>
                <p className="text-3xl font-bold text-black mb-1">{formatCurrency(netAnnualValue)}</p>
                <p className="text-sm text-[#888888]">/ year</p>
                <p className="text-base text-[#888888] mt-2">{roi.toFixed(1)}× ROI</p>
              </div>
              <div className="bg-[#EA2C00] rounded-lg p-5">
                <p className="text-sm font-medium text-white/80 mb-2">FULL SCALE VALUE</p>
                <p className="text-3xl font-bold text-white mb-1">{formatCurrency(expandedValue)}</p>
                <p className="text-sm text-white/80">/ year</p>
                <p className="text-base text-white/80 mt-2">{expandedRoi.toFixed(1)}× ROI</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* GROWTH TRAJECTORY */}
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

          <div className="bg-white rounded-xl border border-[#E5E5E5] p-6">
            {/* Pace Selector */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-sm text-[#888888]">Expansion pace:</span>
              <div className="flex gap-1">
                {(['measured', 'steady', 'aggressive'] as const).map((pace) => (
                  <Button
                    key={pace}
                    variant={selectedPace === pace ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedPace(pace)}
                    className={`rounded-full ${
                      selectedPace === pace 
                        ? "bg-[#EA2C00] text-white" 
                        : "bg-[#F5F0EB] text-[#888888]"
                    }`}
                    data-testid={`pace-${pace}`}
                  >
                    {paceConfig[pace].months}mo
                  </Button>
                ))}
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
            <div className="h-[400px] bg-white rounded-lg">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 40, left: 10, bottom: 40 }}>
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
                    tick={{ fill: "#888888", fontSize: 12 }}
                    tickFormatter={(v) => formatCurrency(v)}
                    width={65}
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

        {/* 3-YEAR PROJECTION */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <p className="text-center text-xl font-bold text-black mb-6">
            3-Year Projection
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-5 text-center">
              <p className="text-sm text-[#888888] mb-2">Year 1</p>
              <p className="text-xl font-bold text-black">{formatCurrency(year1Value)}</p>
            </div>
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-5 text-center">
              <p className="text-sm text-[#888888] mb-2">Year 2</p>
              <p className="text-xl font-bold text-black">{formatCurrency(year2Value)}</p>
            </div>
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-5 text-center">
              <p className="text-sm text-[#888888] mb-2">Year 3</p>
              <p className="text-xl font-bold text-black">{formatCurrency(year3Value)}</p>
            </div>
            <div className="bg-[#F5F0EB] rounded-lg p-5 text-center">
              <p className="text-sm text-[#888888] mb-2">3-Year Net</p>
              <p className="text-xl font-bold text-[#EA2C00]">{formatCurrency(threeYearTotal)}</p>
            </div>
          </div>

          <p className="text-sm text-[#888888] text-center mt-4">
            {implementationCost > 0 ? `Year 1 includes ${formatCurrency(implementationCost)} implementation fee. ` : ''}
            Years 2-3 assume 10% value growth from improved utilization.
          </p>
        </motion.div>

        {/* EXPORT SECTION */}
        <motion.div
          className="bg-[#F5F0EB] rounded-xl p-6 mb-8"
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
              ) : (
                <p className="text-sm text-[#888888]">
                  {careSettingLabel} · {formatNumber(state.numberOfProviders)} providers · ${formatNumber(state.costPerProvider)}/provider/mo
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              {onAddToProforma && (
                <Button
                  onClick={handleAddToProforma}
                  className="gap-2 bg-[#EA2C00] hover:bg-[#D42800] text-white sm:bg-transparent sm:text-[#EA2C00] sm:border sm:border-[#EA2C00] sm:hover:bg-[#EA2C00]/5 order-1 h-11 sm:h-9 text-sm font-semibold"
                  data-testid="button-add-proforma"
                >
                  <Layers className="w-4 h-4" />
                  Add to Proforma
                </Button>
              )}
              <Button
                onClick={() => setShowExportModal(true)}
                className={`gap-2 order-2 h-11 sm:h-9 text-sm font-semibold ${onAddToProforma ? "bg-[#1A1A1A] hover:bg-black text-white" : "bg-[#EA2C00] hover:bg-[#D42800] text-white"}`}
                data-testid="button-export"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
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
                      <strong className="text-black">Patient Access:</strong> {timeDriverInputs.capacityPercent}% of reclaimed time toward capacity × ${timeDriverInputs.revenuePerVisit}/visit × {timeDriverInputs.visitDuration} min visits.
                    </p>
                  )}
                  {docQualityInputs.wrvuEnabled && (
                    <p>
                      <strong className="text-black">wRVU:</strong> {wrvuScenarios[docQualityInputs.wrvuScenario]}% improvement × ${docQualityInputs.conversionFactor} conversion factor × {docQualityInputs.wrvuRealization}% realization.
                    </p>
                  )}
                  <p>
                    <strong className="text-black">Growth assumptions:</strong> 10% annual improvement from workflow maturity.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="text-[11px] text-[#AAAAAA] leading-relaxed mt-8 mb-4 text-center max-w-2xl mx-auto">
          Projections are modeled estimates based on user-provided inputs, published industry benchmarks, and Abridge deployment data. Actual results may vary based on implementation approach, provider adoption, organizational factors, and care setting. This does not constitute a guarantee of financial outcomes.
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
