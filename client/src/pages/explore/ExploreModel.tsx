import { useMemo, useState } from "react";
import { Download, ChevronDown, ChevronUp, Edit, FileText, TrendingUp, Link, BarChart3, Check, AlertTriangle, Sparkles, FileCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type ExploreState } from "./ExploreFlow";
import { PDFExportModal } from "@/components/switch/PDFExportModal";
import { useToast } from "@/hooks/use-toast";
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { generateOutpatientROIPDF } from "@/lib/outpatient-pdf-generator";
import { generateEDROIPDF } from "@/lib/ed-pdf-generator";
import { generateInpatientROIPDF } from "@/lib/inpatient-pdf-generator";
import { generateNursingROIPDF } from "@/lib/nursing-pdf-generator";
import { transformToOutpatientPDFData } from "@/lib/outpatient-pdf-data-transformer";
import { transformToEDPDFData } from "@/lib/ed-pdf-data-transformer";
import { transformToInpatientPDFData } from "@/lib/inpatient-pdf-data-transformer";
import { transformToNursingPDFData } from "@/lib/nursing-pdf-data-transformer";

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
}: ExploreModelProps) {
  const [showMethodology, setShowMethodology] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const totalValue = timeValue + docValue;
  const netAnnualValue = totalValue - annualInvestment;
  const roi = annualInvestment > 0 ? totalValue / annualInvestment : 0;
  
  // Care setting flags
  const isED = state.careSetting === 'ed';
  const isInpatient = state.careSetting === 'inpatient';
  const isNursing = state.careSetting === 'nursing';
  
  // For nursing, calculate value per staffed bed; for others, per provider
  const valuePerUnit = isNursing 
    ? (state.nursingStaffedBeds > 0 ? Math.round(netAnnualValue / state.nursingStaffedBeds) : 0)
    : (state.numberOfProviders > 0 ? Math.round(netAnnualValue / state.numberOfProviders) : 0);

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

  // Doc value breakdown
  const eligibleEncounters = state.annualEncounters * (state.utilizationPercent / 100);
  const wrvuScenarios: Record<string, number> = { conservative: 2, typical: 5, aggressive: 7 };
  const hccScenarios: Record<string, number> = { conservative: 10, typical: 15, aggressive: 25 };
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
  // Inpatient: Clinician Wellbeing Retention Value
  const ipWellbeingRetentionValue = useMemo(() => {
    if (!isInpatient || !timeDriverInputs.wellbeingEnabled || !timeDriverInputs.calculateRetentionValue) return 0;
    const retentionScenarios: Record<string, number> = { conservative: 20, typical: 30, optimistic: 40 };
    const retentionPercent = retentionScenarios[timeDriverInputs.retentionImpactScenario] || 30;
    // Use the same property names as ExploreFlow for consistency
    const providersLeaving = state.numberOfProviders * (timeDriverInputs.annualTurnoverRate / 100);
    const burnoutRelated = providersLeaving * (timeDriverInputs.burnoutRelatedTurnover / 100);
    const retained = burnoutRelated * (retentionPercent / 100);
    return Math.round(retained * timeDriverInputs.replacementCost);
  }, [isInpatient, state.numberOfProviders, timeDriverInputs]);

  // Nursing: Retention Value (matches ExploreFlow calculation)
  const nursingRetentionValue = useMemo(() => {
    // For nursing, only check nursingRetentionEnabled (no calculateRetentionValue required)
    if (!isNursing || !timeDriverInputs.nursingRetentionEnabled) return 0;
    // Uses nursing-specific turnover rate and replacement cost
    const nurseFTEs = state.numberOfProviders;
    const leavingPerYear = nurseFTEs * (timeDriverInputs.nursingTurnoverRate / 100);
    const retained = leavingPerYear * 0.10; // Fixed 10% retention rate
    return Math.round(retained * timeDriverInputs.nursingReplacementCost);
  }, [isNursing, state.numberOfProviders, timeDriverInputs.nursingRetentionEnabled, timeDriverInputs.nursingTurnoverRate, timeDriverInputs.nursingReplacementCost]);

  // Nursing: OT Reduction Value
  const nursingOTValue = useMemo(() => {
    if (!isNursing || !timeDriverInputs.nursingOtEnabled) return 0;
    const weeksPerYear = 52;
    const totalCurrentOt = state.numberOfProviders * timeDriverInputs.nursingOtHoursPerNurseWeek * weeksPerYear;
    const rawOtReduced = totalHoursSaved * (timeDriverInputs.nursingOtReductionPercent / 100);
    const otHoursReduced = Math.min(rawOtReduced, totalCurrentOt);
    return Math.round(otHoursReduced * timeDriverInputs.nursingOtHourlyRate * 1.5);
  }, [isNursing, state.numberOfProviders, totalHoursSaved, timeDriverInputs.nursingOtEnabled, timeDriverInputs.nursingOtHoursPerNurseWeek, timeDriverInputs.nursingOtReductionPercent, timeDriverInputs.nursingOtHourlyRate]);

  // Nursing: Care Time Value (qualitative - just track if enabled)
  const nursingCareTimeEnabled = isNursing && timeDriverInputs.nursingCareTimeEnabled;

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

  // 3-year projection (10% growth per year)
  const implementationCost = state.includeImplementation ? state.implementationFee : 0;
  const year1Value = netAnnualValue - implementationCost;
  const year2Value = Math.round(netAnnualValue * 1.1);
  const year3Value = Math.round(netAnnualValue * 1.21);
  const threeYearTotal = year1Value + year2Value + year3Value;

  // Expansion opportunity (use fullScaleProviders from state, editable utilization)
  // For nursing, base is staffed beds; for others, it's providers
  const pilotUnits = isNursing ? state.nursingStaffedBeds : state.numberOfProviders;
  const expandedProviders = state.fullScaleProviders;
  const [expandedUtilization, setExpandedUtilization] = useState(80);
  const expansionMultiplier = pilotUnits > 0 ? (expandedProviders / pilotUnits) * (expandedUtilization / state.utilizationPercent) : 1;
  const expandedValue = Math.round(netAnnualValue * expansionMultiplier);
  
  // Full scale investment scales with unit count (staffed beds for nursing, providers for others)
  const unitExpansionRatio = pilotUnits > 0 ? expandedProviders / pilotUnits : 1;
  const expandedInvestment = annualInvestment * unitExpansionRatio;
  const expandedRoi = expandedInvestment > 0 ? (totalValue * expansionMultiplier) / expandedInvestment : 0;

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
    // For nursing, use staffed beds; for others, use providers
    const pilotProviders = isNursing ? state.nursingStaffedBeds : state.numberOfProviders;
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
  }, [netAnnualValue, isNursing, state.nursingStaffedBeds, state.numberOfProviders, state.utilizationPercent, expandedProviders, expandedUtilization, currentPace]);

  const formatCurrency = (n: number) => {
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'K';
    return '$' + n.toLocaleString();
  };

  const formatNumber = (n: number) => n.toLocaleString();

  const handleExportPDF = async (clientName: string, preparedBy: string) => {
    setIsExporting(true);
    try {
      // Build driver results with care-setting-specific keys that match what transformers expect
      const driverResults: Record<string, { name: string; value: number; inputs?: Record<string, any> }> = {};
      
      // Journey inputs for scaling projection (common to all)
      const journeyInputs = {
        pilotProviders: state.numberOfProviders,
        pilotEncounters: state.annualEncounters,
        pilotUtilization: state.utilizationPercent,
        pilotValue: netAnnualValue,
        fullScaleProviders: expandedProviders,
        fullScaleUtilization: expandedUtilization,
        fullScaleValue: Math.round(netAnnualValue * (expandedProviders / state.numberOfProviders) * (expandedUtilization / state.utilizationPercent)),
        scalingPace: selectedPace,
        networkEffect: 0,
      };
      
      if (state.careSetting === 'outpatient') {
        // Outpatient uses keys: patientAccess, overtime, workforce, wrvu, hcc, denials
        if (timeDriverInputs.patientAccessEnabled && patientAccessValue > 0) {
          driverResults.patientAccess = { name: 'Patient Access', value: patientAccessValue };
        }
        if (timeDriverInputs.costReductionEnabled && costReductionValue > 0) {
          driverResults.overtime = { name: 'Overtime Reduction', value: costReductionValue };
        }
        if (docQualityInputs.wrvuEnabled && wrvuValue > 0) {
          driverResults.wrvu = { name: 'wRVU Improvement', value: wrvuValue };
        }
        if (docQualityInputs.hccEnabled && hccValue > 0) {
          driverResults.hcc = { name: 'HCC Capture', value: hccValue };
        }
        if (docQualityInputs.denialsEnabled && denialsValue > 0) {
          driverResults.denials = { name: 'Denial Prevention', value: denialsValue };
        }
        
        const modelResults = {
          totalBenefit: totalValue,
          investment: annualInvestment,
          providers: state.numberOfProviders,
          encounters: state.annualEncounters,
          utilizationRate: state.utilizationPercent,
          costPerMonth: state.costPerProvider,
          timeSavedPerEncounter: 2.5,
          driverResults,
        };
        const pdfData = transformToOutpatientPDFData(modelResults, journeyInputs, 'Outpatient', clientName, preparedBy);
        await generateOutpatientROIPDF(pdfData);
        
      } else if (state.careSetting === 'ed') {
        // ED uses keys: edThroughput, edRetention, edLevelOfService, edDenials
        if (timeDriverInputs.edLwbsEnabled && edLwbsValue > 0) {
          driverResults.edThroughput = { 
            name: 'Patient Throughput (LWBS)', 
            value: edLwbsValue + edAdmissionCaptureValue,
            inputs: {
              lwbsRate: timeDriverInputs.edLwbsRate,
              lwbsReduction: timeDriverInputs.edLwbsReduction,
              revenuePerVisit: timeDriverInputs.edRevenuePerVisit,
              realizationRate: timeDriverInputs.edLwbsRealization,
            }
          };
        }
        if (docQualityInputs.wrvuEnabled && wrvuValue > 0) {
          driverResults.edLevelOfService = { 
            name: 'Level-of-Service Accuracy', 
            value: wrvuValue,
            inputs: {
              scenario: docQualityInputs.wrvuScenario,
              currentWrvu: docQualityInputs.currentWrvu,
              conversionFactor: docQualityInputs.conversionFactor,
              realizationRate: docQualityInputs.wrvuRealization,
            }
          };
        }
        if (docQualityInputs.denialsEnabled && denialsValue > 0) {
          driverResults.edDenials = { 
            name: 'Denial Prevention', 
            value: denialsValue,
            inputs: {
              scenario: docQualityInputs.denialsScenario,
              denialRate: docQualityInputs.denialRate,
              avgClaimValue: docQualityInputs.avgClaimValue,
            }
          };
        }
        
        const modelResults = {
          totalBenefit: totalValue,
          investment: annualInvestment,
          providers: state.numberOfProviders,
          encounters: state.annualEncounters,
          utilizationRate: state.utilizationPercent,
          costPerMonth: state.costPerProvider,
          timeSavedPerEncounter: 2.5,
          driverResults,
        };
        const pdfData = transformToEDPDFData(modelResults, journeyInputs, undefined, clientName, preparedBy);
        await generateEDROIPDF(pdfData);
        
      } else if (state.careSetting === 'inpatient') {
        // Inpatient uses keys: inpatientRetention, inpatientCCMCC, inpatientCDI, inpatientDenials
        if (timeDriverInputs.wellbeingEnabled && timeDriverInputs.calculateRetentionValue && ipWellbeingRetentionValue > 0) {
          driverResults.inpatientRetention = { 
            name: 'Hospitalist Retention', 
            value: ipWellbeingRetentionValue,
            inputs: {
              turnoverRate: timeDriverInputs.annualTurnoverRate,
              burnoutPct: timeDriverInputs.burnoutRelatedTurnover,
              abridgeImpact: timeDriverInputs.retentionImpactScenario === 'conservative' ? 20 : 
                             timeDriverInputs.retentionImpactScenario === 'typical' ? 30 : 40,
              replacementCost: timeDriverInputs.replacementCost,
            }
          };
        }
        if (docQualityInputs.ipDrgEnabled && ipDrgValue > 0) {
          driverResults.inpatientCCMCC = { 
            name: 'DRG Accuracy (Prevent Downcoding)', 
            value: ipDrgValue,
            inputs: {
              gapRate: docQualityInputs.ipDrgAtRiskRate,
              captureRate: docQualityInputs.ipDrgScenario === 'conservative' ? 15 : 
                           docQualityInputs.ipDrgScenario === 'typical' ? 20 : 25,
              drgWeightIncrease: docQualityInputs.ipDrgWeightIncrease,
              baseDrgPayment: docQualityInputs.ipDrgBasePayment,
              realizationRate: docQualityInputs.ipDrgRealization,
            }
          };
        }
        if (docQualityInputs.ipCdiEnabled && ipCdiValue > 0) {
          driverResults.inpatientCDI = { 
            name: 'CDI Query Reduction', 
            value: ipCdiValue,
            inputs: {
              queryRate: docQualityInputs.ipCdiQueryRate,
              reductionRate: docQualityInputs.ipCdiScenario === 'conservative' ? 15 : 
                             docQualityInputs.ipCdiScenario === 'typical' ? 25 : 35,
              costPerQuery: docQualityInputs.ipCdiCostPerQuery,
            }
          };
        }
        if (docQualityInputs.denialsEnabled && denialsValue > 0) {
          driverResults.inpatientDenials = { 
            name: 'Documentation-Related Denials', 
            value: denialsValue,
            inputs: {
              denialRate: docQualityInputs.denialRate,
              docRelatedPct: docQualityInputs.unappealableRate,
              captureRate: docQualityInputs.denialsScenario === 'conservative' ? 25 : 
                           docQualityInputs.denialsScenario === 'typical' ? 50 : 75,
              avgClaimValue: docQualityInputs.avgClaimValue,
            }
          };
        }
        
        const modelResults = {
          totalBenefit: totalValue,
          investment: annualInvestment,
          providers: state.numberOfProviders,
          encounters: state.annualEncounters,
          utilizationRate: state.utilizationPercent,
          costPerMonth: state.costPerProvider,
          timeSavedPerEncounter: 2.5,
          driverResults,
        };
        const pdfData = transformToInpatientPDFData(modelResults, journeyInputs, undefined, clientName, preparedBy);
        await generateInpatientROIPDF(pdfData);
        
      } else if (state.careSetting === 'nursing') {
        // Nursing uses keys: nursingOvertime, nursingAgency, nursingRetention, etc.
        if (timeDriverInputs.nursingOtEnabled && nursingOTValue > 0) {
          driverResults.nursingOvertime = { 
            name: 'Overtime Reduction', 
            value: nursingOTValue,
            inputs: {
              estimatedSavings: nursingOTValue,
            }
          };
        }
        if (timeDriverInputs.nursingRetentionEnabled && nursingRetentionValue > 0) {
          driverResults.nursingRetention = { 
            name: 'Nurse Retention', 
            value: nursingRetentionValue,
            inputs: {
              turnoverRate: timeDriverInputs.nursingTurnoverRate,
              retentionLift: 10,
              replacementCost: timeDriverInputs.nursingReplacementCost,
            }
          };
        }
        
        const nursingModelResults = {
          totalBenefit: totalValue,
          investment: annualInvestment,
          staffedBeds: state.numberOfProviders,
          nurseFTEs: Math.round(state.numberOfProviders * 1.5),
          documentationEvents: state.annualEncounters,
          utilizationRate: state.utilizationPercent,
          costPerMonth: state.costPerProvider,
          timeSavedPerEvent: 5,
          driverResults,
        };
        const nursingJourneyInputs = {
          pilotBeds: state.numberOfProviders,
          pilotEvents: state.annualEncounters,
          pilotUtilization: state.utilizationPercent,
          pilotValue: netAnnualValue,
          fullScaleBeds: expandedProviders,
          fullScaleUtilization: expandedUtilization,
          fullScaleValue: Math.round(netAnnualValue * (expandedProviders / state.numberOfProviders) * (expandedUtilization / state.utilizationPercent)),
          scalingPace: selectedPace,
          networkEffect: 0,
        };
        const pdfData = transformToNursingPDFData(nursingModelResults, nursingJourneyInputs, undefined, clientName, preparedBy);
        await generateNursingROIPDF(pdfData);
      }
      
      setShowExportModal(false);
      toast({
        title: "PDF Downloaded",
        description: "Your ROI model has been saved.",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Export Failed",
        description: "Unable to generate PDF. Please try again.",
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
      timeCardDescription: 'Less time documenting means more time at the bedside and reduced overtime.',
      driver1: 'OT Reduction',
      driver2: 'Retention Savings',
      driver3: 'Care Time',
      docCardTitle: 'Care Quality',
      docCardDescription: 'Complete documentation supports better care plans and reduces adverse events.',
      docDriver1: 'Care Plan Quality',
      docDriver2: 'Falls Prevention',
      docDriver3: 'HAPI Prevention',
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
            <span className="text-xs text-[#888888]">
              {careSettingLabel} · {formatNumber(isNursing ? state.nursingStaffedBeds : state.numberOfProviders)} {isNursing ? 'staffed beds' : 'providers'}
            </span>
          </div>

          {/* Label */}
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[2px] mb-3">
            Projected Net Value
          </p>

          {/* Hero Number */}
          <p className="text-5xl md:text-7xl font-bold text-[#EA2C00] mb-1" data-testid="text-net-value">
            {formatCurrency(netAnnualValue)}
          </p>
          <p className="text-xl text-[#888888] mb-4">/ year</p>

          {/* Subtext */}
          <p className="text-base text-[#888888] mb-8">
            {formatCurrency(totalValue)} value – {formatCurrency(annualInvestment)} investment
          </p>

          {/* Stat Cards */}
          <div className="flex justify-center gap-4 flex-wrap">
            <div className="bg-[#2A2A2A] rounded-lg px-6 py-4 min-w-[120px]" data-testid="stat-roi">
              <p className="text-2xl font-bold text-white">{roi.toFixed(1)}×</p>
              <p className="text-xs text-[#888888]">ROI</p>
            </div>
            <div className="bg-[#2A2A2A] rounded-lg px-6 py-4 min-w-[120px]" data-testid="stat-per-provider">
              <p className="text-2xl font-bold text-white">{formatCurrency(valuePerUnit)}</p>
              <p className="text-xs text-[#888888]">{isNursing ? 'per staffed bed' : 'per provider'}</p>
            </div>
            <div className="bg-[#2A2A2A] rounded-lg px-6 py-4 min-w-[120px]" data-testid="stat-hours-saved">
              <p className="text-2xl font-bold text-white">{formatNumber(totalHoursSaved)}</p>
              <p className="text-xs text-[#888888]">hours saved</p>
            </div>
          </div>

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
          <p className="text-center text-base text-[#888888] mb-6">
            Abridge creates value through two mechanisms—each with its own drivers and assumptions.
          </p>

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
                {isED ? (
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
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• {labels.driver3}</span>
                      <span className="font-semibold text-black">{timeDriverInputs.wellbeingEnabled ? `${hoursPerProviderPerWeek} hrs/wk` : '—'}</span>
                    </div>
                    {timeDriverInputs.wellbeingEnabled && (
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
                ) : isNursing ? (
                  <>
                    {/* OT Reduction */}
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• {labels.driver1}</span>
                      <span className="font-semibold text-black">{timeDriverInputs.nursingOtEnabled ? formatCurrency(nursingOTValue) : '—'}</span>
                    </div>
                    {timeDriverInputs.nursingOtEnabled && (
                      <p className="text-xs text-[#888888] pl-4">({timeDriverInputs.nursingOtReductionPercent}% OT reduction)</p>
                    )}
                    {/* Retention Savings */}
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• {labels.driver2}</span>
                      <span className="font-semibold text-black">{timeDriverInputs.nursingRetentionEnabled ? formatCurrency(nursingRetentionValue) : '—'}</span>
                    </div>
                    {timeDriverInputs.nursingRetentionEnabled && (
                      <p className="text-xs text-[#888888] pl-4">(10% retention lift)</p>
                    )}
                    {/* Care Time */}
                    <div className="flex justify-between">
                      <span className="text-[#666666]">• {labels.driver3}</span>
                      <span className="font-semibold text-black">{nursingCareTimeEnabled ? `${hoursPerProviderPerWeek} hrs/wk` : '—'}</span>
                    </div>
                    {nursingCareTimeEnabled && (
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
                      <span className="font-semibold text-black">{timeDriverInputs.wellbeingEnabled ? `${hoursPerProviderPerWeek} hrs/wk` : '—'}</span>
                    </div>
                    {timeDriverInputs.wellbeingEnabled && (
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
                <p className="text-2xl font-bold text-[#EA2C00]">{formatCurrency(docValue)} / year</p>
              </div>

              <div className="h-px bg-[#E5E5E5] mb-4" />

              <p className="text-sm text-[#666666] mb-4">
                {labels.docCardDescription}
              </p>

              <div className="h-px bg-[#E5E5E5] mb-4" />

              <div className="space-y-2 text-sm">
                {isInpatient ? (
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
                <p className="text-2xl font-bold text-black">{formatNumber(isNursing ? state.nursingStaffedBeds : state.numberOfProviders)}</p>
                <p className="text-sm text-[#888888]">{isNursing ? 'staffed beds' : 'providers'}</p>
                <p className="text-sm text-[#888888]">{state.utilizationPercent}% util</p>
              </div>
              
              <div className="flex-1 px-6 flex items-center justify-center">
                <span className="text-sm text-[#888888]">expansion →</span>
              </div>

              <div className="text-center">
                <p className="text-sm font-medium text-[#888888] mb-1">FULL SCALE</p>
                <FormattedNumberInput
                  value={state.fullScaleProviders}
                  onChange={(v: number) => updateState({ fullScaleProviders: Math.max(v, isNursing ? state.nursingStaffedBeds : state.numberOfProviders) })}
                  className="h-10 w-24 text-center text-2xl font-bold bg-white border border-[#E5E5E5] rounded-lg"
                  data-testid="input-full-scale-providers"
                />
                <p className="text-sm text-[#888888]">{isNursing ? 'staffed beds' : 'providers'}</p>
                <div className="flex items-center justify-center gap-1">
                  <FormattedNumberInput
                    value={expandedUtilization}
                    onChange={(v: number) => setExpandedUtilization(Math.min(Math.max(v, 1), 100))}
                    className="h-6 w-12 text-center text-sm bg-white border border-[#E5E5E5] rounded"
                    data-testid="input-full-scale-utilization"
                  />
                  <span className="text-sm text-[#888888]">% util</span>
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
                          <p className="text-sm text-[#888888] mb-3">{data.providers} {isNursing ? 'staffed beds' : 'providers'} · {data.utilization}% util</p>
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
              <p className="text-sm text-[#888888]">
                {careSettingLabel} · {formatNumber(isNursing ? state.nursingStaffedBeds : state.numberOfProviders)} {isNursing ? 'staffed beds' : 'providers'} · ${formatNumber(state.costPerProvider)}/{isNursing ? 'bed' : 'provider'}/mo
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onEdit}
                className="gap-2 border-black text-black"
                data-testid="button-edit"
              >
                <Edit className="w-4 h-4" />
                Edit Model
              </Button>
              <Button
                onClick={() => setShowExportModal(true)}
                className="bg-[#EA2C00] text-white gap-2"
                data-testid="button-export"
              >
                <Download className="w-4 h-4" />
                Download PDF
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
