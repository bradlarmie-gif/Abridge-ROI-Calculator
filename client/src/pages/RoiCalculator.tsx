import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { InputSection, InputField } from "@/components/InputSection";
import { KpiCard, KpiGrid } from "@/components/KpiCard";
import { WaterfallChart } from "@/components/WaterfallChart";
import { EnterpriseExpansionChart } from "@/components/EnterpriseExpansionChart";
import { LeverAccordion } from "@/components/LeverAccordion";
import { CommentaryBox } from "@/components/CommentaryBox";
import { StrategicDriverCard } from "@/components/StrategicDriverCard";
import {
  PatientAccessDrawer,
  type PatientAccessInputs,
  type PatientAccessCalculations,
} from "@/components/PatientAccessDrawer";
import {
  OvertimeLocumDrawer,
  type OvertimeLocumInputs,
  type OvertimeLocumCalculations,
} from "@/components/OvertimeLocumDrawer";
import {
  ClinicianRetentionDrawer,
  type ClinicianRetentionInputs,
  type ClinicianRetentionCalculations,
} from "@/components/ClinicianRetentionDrawer";
import {
  LevelOfServiceDrawer,
  type LevelOfServiceInputs,
  type LevelOfServiceCalculations,
} from "@/components/LevelOfServiceDrawer";
import {
  MedicalNecessityDenialsDrawer,
  type MedicalNecessityDenialsInputs,
  type MedicalNecessityDenialsCalculations,
} from "@/components/MedicalNecessityDenialsDrawer";
import {
  HccConditionCaptureDrawer,
  type HccConditionCaptureInputs,
  type HccConditionCaptureCalculations,
} from "@/components/HccConditionCaptureDrawer";
import { type SelectedLever } from "@/pages/ObjectiveSelectionScreen";
import {
  defaultInputs,
  type RoiInputs,
  type LeverId,
  type Lever,
  leverLabels,
  leverDescriptions,
} from "@/lib/roi-types";
import {
  calculateRoi,
  formatCurrency,
  formatNumber,
  formatPercent,
  parseFormattedNumber,
} from "@/lib/roi-calculator";
import {
  CARE_SETTING_LABELS,
  SETTING_CONFIG,
  type CareSettingType,
  getLeverConfigById,
} from "@/lib/SETTING_CONFIG";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  Users,
  BarChart3,
  TrendingUp,
  Clock,
  Calculator,
  Target,
  FileText,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

interface RoiCalculatorProps {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
  seedInputs?: Partial<RoiInputs>;
  onBack: () => void;
}

interface LeverWithSetting extends Lever {
  settingId: CareSettingType;
}

// Category mapping for Strategic Priorities taxonomy
const CAPACITY_LABOR_LEVER_IDS: LeverId[] = [
  "patientAccess",
  "overtime",
  "workforce",
];
const REVENUE_RISK_LEVER_IDS: LeverId[] = ["wrvu", "denials", "hcc"];

// Single source of truth for the "open drawer" action (prevents Franken-buttons)
const OUTPATIENT_LEVER_ACTION: Record<
  LeverId,
  { label: string; onClick: () => void } | null
> = {
  patientAccess: null, // set inside component (needs state setters)
  overtime: null,
  workforce: null,
  wrvu: null,
  denials: null,
  hcc: null,
};

const leverTableDescriptions: Record<LeverId, string> = {
  patientAccess:
    "Returns visit-time documentation minutes back to patient capacity without adding staffing.",
  overtime:
    "Reduces premium labor when documentation no longer spills past scheduled clinic hours.",
  workforce:
    "Lowers burnout-driven turnover by reducing after-hours charting and admin drag.",
  wrvu: "Improves coding support by capturing clinical reasoning that's often missing from the note.",
  denials:
    "Reduces documentation-driven denials by strengthening medical necessity and MDM clarity.",
  hcc: "Improves risk capture by consistently documenting chronic conditions across encounters.",
};

const leverEducationalContent: Record<string, string> = {
  patientAccess: `Patient access constraints often originate from minutes lost to documentation throughout the clinic day. These small inefficiencies compress schedules, extend wait times, and limit how many visits a provider can realistically support. When documentation burden decreases, schedules stabilize, backlog shrinks, and access expands without adding hours.

Abridge returns those minutes by capturing the clinical story in real time, allowing more of the clinician's day to remain available for patient care. Documentation stops leaking into every corner of the day, and access expands not because you've added staff — but because you've removed the friction that was holding them back.`,
  overtime: `Premium labor in outpatient clinics is often a symptom of documentation spilling past scheduled hours, not true staffing shortages. When clinicians stay late to finish notes, organizations quietly accumulate overtime and rely more heavily on locums to maintain coverage.

Abridge reduces spillover work by enabling more documentation to be completed inside the visit, helping clinics reduce overtime and avoid avoidable locum spend. Work ends closer to when clinic ends, and the savings show up not just in labor costs, but in the sustainability of the work itself.`,
  workforce: `Burnout is driven less by clinical complexity and more by administrative overload. When documentation consistently extends the workday, clinicians experience higher fatigue and turnover risk.

Abridge lightens that load by reducing after-hours charting, helping create a more sustainable daily workflow that supports clinician well-being and retention. Clinicians who feel less burdened are more likely to stay — and that retention compounds into organizational stability.`,
  riskAdjustment: `Many chronic conditions exist in the record but are inconsistently restated across encounters, leading to under-reported patient complexity and weakened risk models.

Abridge generates richer clinical narratives that surface relevant conditions naturally, making it easier for clinicians to confirm or update them. This supports more accurate risk adjustment without adding administrative burden — the result is a more complete picture and more accurate risk scoring.`,
  wrvu: `Visits are frequently coded below their true complexity because documentation does not fully capture the clinical reasoning behind the encounter. When essential details of assessment and decision-making are missing, coders default to safer, lower levels.

Abridge preserves more of the clinician's thought process, enabling coding to reflect the visit's actual complexity: not upcoding, just accurate alignment. When notes reflect the full complexity of the visit, coding teams can assign the level that matches the work.`,
  denials: `A significant share of unrecoverable denials stem from insufficient documentation of medical necessity or incomplete MDM. These denials cannot be overturned through rework and represent avoidable revenue loss.

Abridge strengthens the clinical narrative by capturing clear reasoning for decisions during the visit, reducing denials that originate from documentation gaps rather than clinical care. When the story is clearer, there's less room for payers to question necessity.`,
  edPatientAccess: `Throughput in the ED is governed not only by staffing but by the pace at which clinicians can evaluate, document, and disposition patients. When documentation happens more efficiently, patients move through the system faster and fewer leave without being seen.

Abridge enables more in-flow documentation, improving ED efficiency and reducing LWBS. Documentation becomes part of the encounter rather than something that happens after it, resulting in faster disposition and shorter waits.`,
  edProviderRetention: `ED clinicians tolerate acuity, but administrative drag erodes resilience. Documentation burden contributes heavily to burnout and turnover, creating staffing instability.

By reducing cognitive load and end-of-shift documentation work, Abridge helps ED teams maintain more sustainable workloads and improves clinician retention. The job feels more like medicine again — and that makes a difference in who stays.`,
  edScribeSavings: `Scribes are often used to compensate for documentation volume that outpaces clinician capacity. When documentation becomes lighter and more synchronous with care, organizations can rebalance how scribes are used.

Abridge helps maintain support where needed while reducing dependency where documentation friction decreases. Organizations can optimize scribe programs rather than simply scaling them to meet volume.`,
  edDocumentationQuality: `Accurate ED coding and care transitions depend on clear articulation of acuity and clinical reasoning. When documentation is incomplete or rushed, it weakens both coding fidelity and downstream clinical handoffs.

Abridge captures more detail from the encounter, improving documentation quality without slowing clinicians down. The result is documentation that better reflects what actually happened — supporting more accurate coding and clearer handoffs.`,
  edDenialSavings: `Many ED denials stem from insufficient documentation of urgency, rationale, or medical decision-making. These denials consume significant administrative effort and often represent preventable revenue loss.

By strengthening the clinical narrative, Abridge reduces documentation-related ED denials tied to unclear or incomplete justification. When the story is clearer, denials drop and revenue cycle teams spend less time chasing preventable problems.`,
  rnLaborEfficiency: `A large portion of nursing overtime originates from documentation tasks that accumulate throughout the shift. When flowsheets and assessments take longer than planned, nurses finish documentation after their shift ends.

Abridge streamlines documentation in real time, helping shifts end on time and reducing avoidable overtime. Time returns to direct care and schedule reliability improves.`,
  rnRetention: `Nurses often cite documentation burden as a major driver of burnout and turnover. Heavy administrative load reduces time spent on direct patient care and increases fatigue.

Abridge lightens this burden, supporting more sustainable workflows and improving nurse retention. When the administrative load lifts, nurses can focus on what brought them to the profession — caring for patients.`,
  rnSafetyEvents: `Early indicators of patient deterioration often appear first in nursing documentation. When documentation lags or is incomplete, safety signals can be missed.

Abridge helps capture assessments more consistently and promptly, strengthening situational awareness and supporting prevention of avoidable safety events. More timely charting means earlier recognition of changes in patient status.`,
  rnDrgSeverity: `Many CC/MCC elements originate in nursing assessments and observations. When these details are inconsistently documented, patient severity is understated, affecting care planning and case mix accuracy.

Abridge improves consistency of nursing documentation, supporting more accurate severity capture. When nursing observations are reliably recorded, the full picture of patient acuity becomes visible.`,
};

function getFirstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0] : text;
}

export default function RoiCalculator({
  selectedSettings,
  selectedLevers,
  seedInputs,
  onBack,
}: RoiCalculatorProps) {
  const [leverStates, setLeverStates] = useState<Map<string, boolean>>(() => {
    const map = new Map<string, boolean>();
    selectedLevers.forEach((l) => {
      map.set(`${l.settingId}:${l.leverId}`, l.active);
    });
    return map;
  });

  const [inputs, setInputs] = useState<RoiInputs>(() => {
    // Start from defaults
    const initial: RoiInputs = JSON.parse(JSON.stringify(defaultInputs));

    // Merge any seeded values (from Care Settings)
    if (seedInputs) {
      Object.assign(initial, seedInputs);

      // If seedInputs contains nested objects, merge those too
      if (seedInputs.levers) {
        initial.levers = { ...initial.levers, ...seedInputs.levers };
      }
    }

    // Preserve lever selection logic
    const allLeverIds: LeverId[] = [
      "patientAccess",
      "overtime",
      "workforce",
      "wrvu",
      "denials",
      "hcc",
    ];

    allLeverIds.forEach((id) => {
      // if seedInputs explicitly set a lever, keep it; otherwise derive from selectedLevers
      const seeded = seedInputs?.levers?.[id];
      initial.levers[id] =
        typeof seeded === "boolean"
          ? seeded
          : selectedLevers.some((l) => l.leverId === id && l.active);
    });

    return initial;
  });

  const [commentary, setCommentary] = useState("");
  const [selectedLeverForModal, setSelectedLeverForModal] =
    useState<LeverWithSetting | null>(null);
  const [patientAccessDrawerOpen, setPatientAccessDrawerOpen] = useState(false);
  const [overtimeLocumDrawerOpen, setOvertimeLocumDrawerOpen] = useState(false);
  const [clinicianRetentionDrawerOpen, setClinicianRetentionDrawerOpen] =
    useState(false);
  const [levelOfServiceDrawerOpen, setLevelOfServiceDrawerOpen] =
    useState(false);
  const [
    medicalNecessityDenialsDrawerOpen,
    setMedicalNecessityDenialsDrawerOpen,
  ] = useState(false);
  const [hccConditionCaptureDrawerOpen, setHccConditionCaptureDrawerOpen] =
    useState(false);

  // Outpatient-only: one consistent action label + handler for each driver
  const outpatientLeverAction: Record<
    LeverId,
    { label: string; onClick: () => void } | null
  > = {
    patientAccess: {
      label: "Review inputs",
      onClick: () => setPatientAccessDrawerOpen(true),
    },
    overtime: {
      label: "Review inputs",
      onClick: () => setOvertimeLocumDrawerOpen(true),
    },
    workforce: {
      label: "Review inputs",
      onClick: () => setClinicianRetentionDrawerOpen(true),
    },
    wrvu: {
      label: "Review inputs",
      onClick: () => setLevelOfServiceDrawerOpen(true),
    },
    denials: {
      label: "Review inputs",
      onClick: () => setMedicalNecessityDenialsDrawerOpen(true),
    },
    hcc: {
      label: "Review inputs",
      onClick: () => setHccConditionCaptureDrawerOpen(true),
    },
  };

  // Helper to safely resolve the action for a lever row
  function getLeverAction(settingId: CareSettingType, leverId: LeverId) {
    if (settingId !== "outpatient") return null;
    return outpatientLeverAction[leverId] ?? null;
  }

  const [patientAccessInputs, setPatientAccessInputs] =
    useState<PatientAccessInputs>(() => {
      const clinicians = inputs.numberOfProviders;
      const encountersPerClinician =
        clinicians > 0
          ? Math.round(inputs.annualOutpatientEncounters / clinicians)
          : 0;
      return {
        minutesSavedPerEncounter: inputs.minutesSavedPerEncounter,
        cliniciansInScope: clinicians,
        encountersPerClinician,
        visitMinutes: 30,
        reinvestRate: 0.1,
        netRevenuePerEncounter: inputs.avgNetRevenuePerEncounter,
      };
    });

  useEffect(() => {
    setPatientAccessInputs((prev) => ({
      ...prev,
      cliniciansInScope: inputs.numberOfProviders,
      encountersPerClinician:
        inputs.numberOfProviders > 0
          ? Math.round(
              inputs.annualOutpatientEncounters / inputs.numberOfProviders,
            )
          : 0,
      netRevenuePerEncounter: inputs.avgNetRevenuePerEncounter,
    }));
  }, [
    inputs.numberOfProviders,
    inputs.annualOutpatientEncounters,
    inputs.avgNetRevenuePerEncounter,
  ]);

  const encountersCoveredByAbridge = useMemo(() => {
    return (
      inputs.annualOutpatientEncounters * (inputs.abridgeUtilizationPct / 100)
    );
  }, [inputs.annualOutpatientEncounters, inputs.abridgeUtilizationPct]);

  const patientAccessCalculations: PatientAccessCalculations = useMemo(() => {
    const {
      minutesSavedPerEncounter,
      visitMinutes,
      reinvestRate,
      netRevenuePerEncounter,
    } = patientAccessInputs;
    const totalMinutesSaved =
      encountersCoveredByAbridge * minutesSavedPerEncounter;
    const totalHoursSaved = totalMinutesSaved / 60;
    const reinvestedHours = totalHoursSaved * reinvestRate;
    const visitsPerHour = 60 / visitMinutes;
    const additionalVisits = reinvestedHours * visitsPerHour;
    const incrementalRevenue = additionalVisits * netRevenuePerEncounter;
    return {
      totalHoursSaved,
      reinvestedHours,
      additionalVisits,
      incrementalRevenue,
    };
  }, [patientAccessInputs, encountersCoveredByAbridge]);

  const handlePatientAccessInputChange = (
    field: keyof PatientAccessInputs,
    value: number,
  ) => {
    setPatientAccessInputs((prev) => ({ ...prev, [field]: value }));
  };

  const [overtimeLocumInputs, setOvertimeLocumInputs] =
    useState<OvertimeLocumInputs>({
      pctHoursPreviouslyPremium: 0.2,
      pctPremiumRealized: 0.75,
      overtimeRate: 150,
      locumRate: 250,
      locumShare: 0.5,
    });

  const handleOvertimeLocumInputChange = (
    field: keyof OvertimeLocumInputs,
    value: number,
  ) => {
    setOvertimeLocumInputs((prev) => ({ ...prev, [field]: value }));
  };

  const [clinicianRetentionInputs, setClinicianRetentionInputs] =
    useState<ClinicianRetentionInputs>(() => ({
      cliniciansInScope: inputs.numberOfProviders,
      attritionRate: 0.08,
      burnoutShare: 0.4,
      reductionWithAbridge: 0.5,
      realizationFactor: 0.75,
      costPerDeparture: 500000,
    }));

  useEffect(() => {
    setClinicianRetentionInputs((prev) => ({
      ...prev,
      cliniciansInScope: inputs.numberOfProviders,
    }));
  }, [inputs.numberOfProviders]);

  const handleClinicianRetentionInputChange = (
    field: keyof ClinicianRetentionInputs,
    value: number,
  ) => {
    setClinicianRetentionInputs((prev) => ({ ...prev, [field]: value }));
  };

  const [levelOfServiceInputs, setLevelOfServiceInputs] =
    useState<LevelOfServiceInputs>(() => ({
      annualEncounters: inputs.annualOutpatientEncounters,
      baselineUnderCodedRate: 15,
      pctUnderCodedCorrected: 50,
      incrementalWrvuPerVisit: 0.3,
      wrvuConversionFactor: 34,
    }));

  useEffect(() => {
    setLevelOfServiceInputs((prev) => ({
      ...prev,
      annualEncounters: inputs.annualOutpatientEncounters,
    }));
  }, [inputs.annualOutpatientEncounters]);

  const handleLevelOfServiceInputChange = (
    field: keyof LevelOfServiceInputs,
    value: number,
  ) => {
    setLevelOfServiceInputs((prev) => ({ ...prev, [field]: value }));
  };

  const [medicalNecessityDenialsInputs, setMedicalNecessityDenialsInputs] =
    useState<MedicalNecessityDenialsInputs>(() => ({
      netCollectibleRevenue: 14000000,
      baselineDenialRate: 5,
      pctRecoveredWithRework: 60,
      pctUnrecoverableDueToDocumentation: 30,
      pctReductionWithAbridge: 50,
      realizationFactor: 75,
    }));

  const handleMedicalNecessityDenialsInputChange = (
    field: keyof MedicalNecessityDenialsInputs,
    value: number,
  ) => {
    setMedicalNecessityDenialsInputs((prev) => ({ ...prev, [field]: value }));
  };

  const [hccConditionCaptureInputs, setHccConditionCaptureInputs] =
    useState<HccConditionCaptureInputs>(() => ({
      riskBasedPatients: 7000,
      avgConditionsPerPatient: 1.5,
      pctConditionsNotDocumented: 33,
      pctMissedConditionsCaptured: 60,
      pctNewlyIdentifiedConditions: 5,
      realizationFactor: 70,
      revenuePerCondition: 135,
    }));

  const handleHccConditionCaptureInputChange = (
    field: keyof HccConditionCaptureInputs,
    value: number,
  ) => {
    setHccConditionCaptureInputs((prev) => ({ ...prev, [field]: value }));
  };

  const results = useMemo(() => calculateRoi(inputs), [inputs]);

  const totalClinicianHoursRecovered = useMemo(() => {
    const minutesSaved =
      encountersCoveredByAbridge * inputs.minutesSavedPerEncounter;
    return minutesSaved / 60;
  }, [encountersCoveredByAbridge, inputs.minutesSavedPerEncounter]);

  const overtimeLocumCalculations: OvertimeLocumCalculations = useMemo(() => {
    const reclaimedHours = totalClinicianHoursRecovered;
    const premiumHoursExposed =
      reclaimedHours * overtimeLocumInputs.pctHoursPreviouslyPremium;
    const premiumHoursReduced =
      premiumHoursExposed * overtimeLocumInputs.pctPremiumRealized;
    const overtimeShare = 1 - overtimeLocumInputs.locumShare;
    const blendedRate =
      overtimeLocumInputs.locumShare * overtimeLocumInputs.locumRate +
      overtimeShare * overtimeLocumInputs.overtimeRate;
    const annualSavings = premiumHoursReduced * blendedRate;
    return {
      reclaimedHours,
      premiumHoursExposed,
      premiumHoursReduced,
      blendedRate,
      annualSavings,
    };
  }, [totalClinicianHoursRecovered, overtimeLocumInputs]);

  const clinicianRetentionCalculations: ClinicianRetentionCalculations =
    useMemo(() => {
      const {
        cliniciansInScope,
        attritionRate,
        burnoutShare,
        reductionWithAbridge,
        realizationFactor,
        costPerDeparture,
      } = clinicianRetentionInputs;
      const totalExits = cliniciansInScope * attritionRate;
      const burnoutExits = totalExits * burnoutShare;
      const modeledExitsAvoided = burnoutExits * reductionWithAbridge;
      const realizedExitsAvoided = modeledExitsAvoided * realizationFactor;
      const annualSavings = realizedExitsAvoided * costPerDeparture;
      return {
        totalExits,
        burnoutExits,
        modeledExitsAvoided,
        realizedExitsAvoided,
        annualSavings,
      };
    }, [clinicianRetentionInputs]);

  const levelOfServiceCalculations: LevelOfServiceCalculations = useMemo(() => {
    const {
      baselineUnderCodedRate,
      pctUnderCodedCorrected,
      incrementalWrvuPerVisit,
      wrvuConversionFactor,
    } = levelOfServiceInputs;
    const totalUnderCodedVisits =
      encountersCoveredByAbridge * (baselineUnderCodedRate / 100);
    const correctedVisits =
      totalUnderCodedVisits * (pctUnderCodedCorrected / 100);
    const addedWrvus = correctedVisits * incrementalWrvuPerVisit;
    const incrementalRevenue = addedWrvus * wrvuConversionFactor;
    return {
      totalUnderCodedVisits,
      correctedVisits,
      addedWrvus,
      incrementalRevenue,
    };
  }, [levelOfServiceInputs, encountersCoveredByAbridge]);

  const medicalNecessityDenialsCalculations: MedicalNecessityDenialsCalculations =
    useMemo(() => {
      const {
        netCollectibleRevenue,
        baselineDenialRate,
        pctRecoveredWithRework,
        pctUnrecoverableDueToDocumentation,
        pctReductionWithAbridge,
        realizationFactor,
      } = medicalNecessityDenialsInputs;
      const baselineDeniedRevenue =
        netCollectibleRevenue * (baselineDenialRate / 100);
      const unrecoveredAfterRework =
        baselineDeniedRevenue * (1 - pctRecoveredWithRework / 100);
      const documentationDrivenUnrecoverable =
        unrecoveredAfterRework * (pctUnrecoverableDueToDocumentation / 100);
      const modeledRecovered =
        documentationDrivenUnrecoverable * (pctReductionWithAbridge / 100);
      const realizedRecovered = modeledRecovered * (realizationFactor / 100);
      return {
        baselineDeniedRevenue,
        unrecoveredAfterRework,
        documentationDrivenUnrecoverable,
        modeledRecovered,
        realizedRecovered,
      };
    }, [medicalNecessityDenialsInputs]);

  const hccConditionCaptureCalculations: HccConditionCaptureCalculations =
    useMemo(() => {
      const {
        riskBasedPatients,
        avgConditionsPerPatient,
        pctConditionsNotDocumented,
        pctMissedConditionsCaptured,
        pctNewlyIdentifiedConditions,
        realizationFactor,
        revenuePerCondition,
      } = hccConditionCaptureInputs;
      const totalConditions = riskBasedPatients * avgConditionsPerPatient;
      const missedConditions =
        totalConditions * (pctConditionsNotDocumented / 100);
      const capturedMissedConditions =
        missedConditions * (pctMissedConditionsCaptured / 100);
      const newlyIdentifiedConditions =
        totalConditions * (pctNewlyIdentifiedConditions / 100);
      const modeledCaptured =
        capturedMissedConditions + newlyIdentifiedConditions;
      const realizedCaptured = modeledCaptured * (realizationFactor / 100);
      const annualImpact = realizedCaptured * revenuePerCondition;
      return {
        totalConditions,
        missedConditions,
        capturedMissedConditions,
        newlyIdentifiedConditions,
        modeledCaptured,
        realizedCaptured,
        annualImpact,
      };
    }, [hccConditionCaptureInputs]);

  const annualAbridgeCost = useMemo(
    () =>
      inputs.numberOfProviders * inputs.monthlyCostPerProvider * 12 +
      inputs.implementationCostYear1,
    [
      inputs.numberOfProviders,
      inputs.monthlyCostPerProvider,
      inputs.implementationCostYear1,
    ],
  );

  const leversWithSettings: LeverWithSetting[] = useMemo(() => {
    const leverList: LeverWithSetting[] = [];

    selectedSettings.forEach((settingId) => {
      if (settingId === "outpatient" && selectedSettings.length === 1) {
        SETTING_CONFIG.outpatient.forEach((leverConfig) => {
          const matchingLever = results.levers.find(
            (rl) => rl.id === leverConfig.id,
          );
          if (matchingLever) {
            const key = `${settingId}:${leverConfig.id}`;
            const isEnabled = leverStates.get(key) ?? false;
            let overriddenValue = matchingLever.value;
            if (isEnabled) {
              if (leverConfig.id === "patientAccess") {
                overriddenValue = patientAccessCalculations.incrementalRevenue;
              } else if (leverConfig.id === "overtime") {
                overriddenValue = overtimeLocumCalculations.annualSavings;
              } else if (leverConfig.id === "workforce") {
                overriddenValue = clinicianRetentionCalculations.annualSavings;
              } else if (leverConfig.id === "wrvu") {
                overriddenValue = levelOfServiceCalculations.incrementalRevenue;
              } else if (leverConfig.id === "denials") {
                overriddenValue =
                  medicalNecessityDenialsCalculations.realizedRecovered;
              } else if (leverConfig.id === "hcc") {
                overriddenValue = hccConditionCaptureCalculations.annualImpact;
              }
            }
            leverList.push({
              ...matchingLever,
              value: overriddenValue,
              settingId,
              enabled: isEnabled,
            });
          }
        });
      } else {
        selectedLevers
          .filter((l) => l.settingId === settingId)
          .forEach((l) => {
            const matchingLever = results.levers.find(
              (rl) => rl.id === l.leverId,
            );
            if (matchingLever) {
              const key = `${settingId}:${l.leverId}`;
              const isEnabled = leverStates.get(key) ?? l.active;
              let overriddenValue = matchingLever.value;
              if (isEnabled) {
                if (
                  l.leverId === "patientAccess" &&
                  settingId === "outpatient"
                ) {
                  overriddenValue =
                    patientAccessCalculations.incrementalRevenue;
                } else if (
                  l.leverId === "overtime" &&
                  settingId === "outpatient"
                ) {
                  overriddenValue = overtimeLocumCalculations.annualSavings;
                } else if (
                  l.leverId === "workforce" &&
                  settingId === "outpatient"
                ) {
                  overriddenValue =
                    clinicianRetentionCalculations.annualSavings;
                } else if (l.leverId === "wrvu" && settingId === "outpatient") {
                  overriddenValue =
                    levelOfServiceCalculations.incrementalRevenue;
                } else if (
                  l.leverId === "denials" &&
                  settingId === "outpatient"
                ) {
                  overriddenValue =
                    medicalNecessityDenialsCalculations.realizedRecovered;
                } else if (l.leverId === "hcc" && settingId === "outpatient") {
                  overriddenValue =
                    hccConditionCaptureCalculations.annualImpact;
                }
              }
              leverList.push({
                ...matchingLever,
                value: overriddenValue,
                settingId,
                enabled: isEnabled,
              });
            }
          });
      }
    });

    return leverList;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedSettings,
    selectedLevers,
    results.levers,
    JSON.stringify(Array.from(leverStates.entries())),
    patientAccessCalculations.incrementalRevenue,
    overtimeLocumCalculations.annualSavings,
    clinicianRetentionCalculations.annualSavings,
    levelOfServiceCalculations.incrementalRevenue,
    medicalNecessityDenialsCalculations.realizedRecovered,
    hccConditionCaptureCalculations.annualImpact,
  ]);

  const totalBenefitFromSelectedLevers = useMemo(() => {
    return leversWithSettings
      .filter((l) => l.enabled)
      .reduce((sum, l) => sum + l.value, 0);
  }, [leversWithSettings]);

  const capacityLaborBenefit = useMemo(() => {
    return leversWithSettings
      .filter((l) => l.enabled && CAPACITY_LABOR_LEVER_IDS.includes(l.id))
      .reduce((sum, l) => sum + l.value, 0);
  }, [leversWithSettings]);

  const revenueRiskBenefit = useMemo(() => {
    return leversWithSettings
      .filter((l) => l.enabled && REVENUE_RISK_LEVER_IDS.includes(l.id))
      .reduce((sum, l) => sum + l.value, 0);
  }, [leversWithSettings]);

  const enabledDriverCount = useMemo(() => {
    return leversWithSettings.filter((l) => l.enabled).length;
  }, [leversWithSettings]);

  const enabledCapacityLaborLevers = useMemo(() => {
    return leversWithSettings.filter(
      (l) => l.enabled && CAPACITY_LABOR_LEVER_IDS.includes(l.id),
    );
  }, [leversWithSettings]);

  const enabledRevenueRiskLevers = useMemo(() => {
    return leversWithSettings.filter(
      (l) => l.enabled && REVENUE_RISK_LEVER_IDS.includes(l.id),
    );
  }, [leversWithSettings]);

  const adjustedRoiMultiple = useMemo(() => {
    return annualAbridgeCost > 0
      ? totalBenefitFromSelectedLevers / annualAbridgeCost
      : 0;
  }, [totalBenefitFromSelectedLevers, annualAbridgeCost]);

  const adjustedNetValue = useMemo(() => {
    return totalBenefitFromSelectedLevers - annualAbridgeCost;
  }, [totalBenefitFromSelectedLevers, annualAbridgeCost]);

  const handleInputChange = (path: string, value: number | boolean) => {
    setInputs((prev) => {
      const newInputs = JSON.parse(JSON.stringify(prev)) as RoiInputs;
      const keys = path.split(".");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let current: any = newInputs;

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;

      return newInputs;
    });
  };

  const handleLeverToggle = (settingId: CareSettingType, leverId: LeverId) => {
    const key = `${settingId}:${leverId}`;
    const newState = !leverStates.get(key);

    setLeverStates((prev) => {
      const next = new Map(prev);
      next.set(key, newState);
      return next;
    });

    setInputs((prev) => {
      const newInputs = JSON.parse(JSON.stringify(prev)) as RoiInputs;
      const anyLeverActiveForId =
        Array.from(leverStates.entries()).some(
          ([k, v]) => k.endsWith(`:${leverId}`) && k !== key && v,
        ) || newState;
      newInputs.levers[leverId] = anyLeverActiveForId;
      return newInputs;
    });
  };

  const waterfallLevers: Lever[] = useMemo(() => {
    const leverMap = new Map<LeverId, Lever>();

    leversWithSettings.forEach((l) => {
      const existing = leverMap.get(l.id);
      if (existing) {
        if (l.enabled) {
          leverMap.set(l.id, {
            ...existing,
            value: existing.value + l.value,
            enabled: true,
          });
        }
      } else {
        leverMap.set(l.id, {
          id: l.id,
          label: l.label,
          value: l.enabled ? l.value : 0,
          enabled: l.enabled,
          description: l.description,
          category: l.category,
        });
      }
    });

    return Array.from(leverMap.values()).filter((l) => l.enabled);
  }, [leversWithSettings]);

  const settingsText = selectedSettings
    .map((s) => CARE_SETTING_LABELS[s])
    .join(", ");

  return (
    <div
      className="min-h-screen relative font-sans"
      style={{ backgroundColor: "#FAFAF8" }}
    >
      <div className="relative z-10 flex flex-col min-h-screen min-[1200px]:h-screen">
        <div className="bg-white border-b border-neutral-200 px-6 py-3">
          <div className="flex items-center gap-3">
            <span
              className="text-xl font-semibold tracking-wide"
              style={{ color: "#F03319" }}
            >
              ABRIDGE
            </span>
            <span className="text-neutral-300">|</span>
            <span className="text-sm text-neutral-600">{settingsText}</span>
          </div>
        </div>

        <div className="flex flex-col min-[1200px]:flex-row flex-1 min-[1200px]:overflow-hidden">
          <aside className="w-full min-[1200px]:w-96 bg-white border-b min-[1200px]:border-b-0 min-[1200px]:border-r border-neutral-200 flex flex-col shrink-0">
            {/* Header */}
            <div className="p-6 border-b border-neutral-200">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1 mb-3 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ color: "#F03319" }}
                data-testid="button-back-to-settings"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Care Settings
              </button>

              <h1 className="text-2xl font-bold text-black">ROI Calculator</h1>
              <p className="text-xs text-neutral-500 mt-1">
                Current Selection: {settingsText}
              </p>
            </div>

            {/* Sticky "Stripe-style" mini receipt */}
            <div className="p-6 border-b border-neutral-200 bg-white">
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Live preview
                  </div>

                  <Badge variant="secondary" className="text-xs shrink-0">
                    {enabledDriverCount} enabled
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2">
                    <div className="text-[11px] text-neutral-500">Net gain</div>
                    <div className="font-mono font-semibold text-neutral-900">
                      {formatCurrency(adjustedNetValue)}
                    </div>
                  </div>

                  <div className="rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2">
                    <div className="text-[11px] text-neutral-500">
                      Return (x)
                    </div>
                    <div className="font-mono font-semibold text-neutral-900">
                      {adjustedRoiMultiple.toFixed(2)}x
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-neutral-500">
                  Updates as you change inputs.
                </div>

                {/* Jump links */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="text-xs px-2.5 py-1 rounded-full border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                    onClick={() =>
                      document.getElementById("section-scope")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
                    }
                  >
                    Scope
                  </button>
                  <button
                    type="button"
                    className="text-xs px-2.5 py-1 rounded-full border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                    onClick={() =>
                      document
                        .getElementById("section-adoption")
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        })
                    }
                  >
                    Adoption
                  </button>
                  <button
                    type="button"
                    className="text-xs px-2.5 py-1 rounded-full border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                    onClick={() =>
                      document
                        .getElementById("section-economics")
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        })
                    }
                  >
                    Economics
                  </button>
                  <button
                    type="button"
                    className="text-xs px-2.5 py-1 rounded-full border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                    onClick={() =>
                      document
                        .getElementById("section-drivers")
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        })
                    }
                  >
                    Drivers
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable inputs */}
            <div className="flex-1 min-[1200px]:overflow-auto">
              <div className="p-6 space-y-6">
                {selectedSettings.includes("outpatient") &&
                selectedSettings.length === 1 ? (
                  <>
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold text-black">
                        Scenario inputs
                      </h2>
                      <p className="text-xs text-neutral-500">
                        Adjust assumptions on the left. Results update on the
                        right.
                      </p>
                    </div>

                    {/* SCOPE */}
                    <details
                      id="section-scope"
                      className="group rounded-2xl border border-neutral-200 bg-white"
                    >
                      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                            Scope
                          </div>
                          <div className="text-sm font-semibold text-neutral-900">
                            What volume is included?
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-90" />
                      </summary>

                      <div className="px-4 pb-4 pt-1 space-y-4">
                        <InputField
                          label="Providers in Scope"
                          helperText="Clinicians included in this scenario."
                        >
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatNumber(inputs.numberOfProviders)}
                            onChange={(e) =>
                              handleInputChange(
                                "numberOfProviders",
                                parseFormattedNumber(e.target.value),
                              )
                            }
                            data-testid="input-num-providers"
                          />
                        </InputField>

                        <InputField
                          label="Annual Outpatient Encounters (in scope)"
                          helperText="Annual visits covered by Abridge for this group."
                        >
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatNumber(inputs.annualOutpatientEncounters)}
                            onChange={(e) =>
                              handleInputChange(
                                "annualOutpatientEncounters",
                                parseFormattedNumber(e.target.value),
                              )
                            }
                            data-testid="input-encounters"
                          />
                        </InputField>

                        <div className="pt-2 border-t border-neutral-200" />

                        <InputField
                          label="Enterprise Provider Count"
                          helperText="Total clinicians across your enterprise."
                        >
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatNumber(inputs.enterpriseProviderCount)}
                            onChange={(e) =>
                              handleInputChange(
                                "enterpriseProviderCount",
                                parseFormattedNumber(e.target.value),
                              )
                            }
                            data-testid="input-enterprise-providers"
                          />
                        </InputField>

                        <InputField
                          label="Annual Outpatient Encounters (enterprise)"
                          helperText="Total annual outpatient visits across the enterprise."
                        >
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatNumber(inputs.enterpriseAnnualEncounters)}
                            onChange={(e) =>
                              handleInputChange(
                                "enterpriseAnnualEncounters",
                                parseFormattedNumber(e.target.value),
                              )
                            }
                            data-testid="input-enterprise-encounters"
                          />
                        </InputField>
                      </div>
                    </details>

                    {/* ADOPTION */}
                    <details
                      id="section-adoption"
                      className="group rounded-2xl border border-neutral-200 bg-white"
                    >
                      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                            Adoption
                          </div>
                          <div className="text-sm font-semibold text-neutral-900">
                            How often is ambient used?
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-90" />
                      </summary>

                      <div className="px-4 pb-4 pt-1 space-y-4">
                        <InputField
                          label="Abridge Utilization (%)"
                          helperText="Portion of eligible visits where Abridge is actually used."
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <Slider
                                value={[inputs.abridgeUtilizationPct]}
                                onValueChange={([v]) =>
                                  handleInputChange("abridgeUtilizationPct", v)
                                }
                                max={100}
                                step={1}
                                className="flex-1"
                                data-testid="slider-utilization"
                              />
                              <span className="text-sm font-mono w-12">
                                {inputs.abridgeUtilizationPct}%
                              </span>
                            </div>
                          </div>
                        </InputField>

                        <InputField
                          label="Minutes Saved per Encounter"
                          helperText="Time returned per encounter where Abridge is used."
                        >
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatNumber(inputs.minutesSavedPerEncounter)}
                            onChange={(e) =>
                              handleInputChange(
                                "minutesSavedPerEncounter",
                                parseFormattedNumber(e.target.value),
                              )
                            }
                            data-testid="input-minutes-saved"
                          />
                        </InputField>
                      </div>
                    </details>

                    {/* ECONOMICS */}
                    <details
                      id="section-economics"
                      className="group rounded-2xl border border-neutral-200 bg-white"
                    >
                      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                            Economics
                          </div>
                          <div className="text-sm font-semibold text-neutral-900">
                            Unit economics assumptions
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-90" />
                      </summary>

                      <div className="px-4 pb-4 pt-1 space-y-4">
                        <InputField
                          label="Average Revenue per Encounter ($)"
                          helperText="Typical net revenue collected per outpatient visit."
                        >
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatNumber(inputs.avgNetRevenuePerEncounter)}
                            onChange={(e) =>
                              handleInputChange(
                                "avgNetRevenuePerEncounter",
                                parseFormattedNumber(e.target.value),
                              )
                            }
                            data-testid="input-avg-revenue"
                          />
                        </InputField>

                        <InputField
                          label="Cost per Provider per Month ($)"
                          helperText="Contracted Abridge subscription per provider, per month."
                        >
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={formatNumber(inputs.monthlyCostPerProvider)}
                            onChange={(e) =>
                              handleInputChange(
                                "monthlyCostPerProvider",
                                parseFormattedNumber(e.target.value),
                              )
                            }
                            data-testid="input-cost-per-provider"
                          />
                        </InputField>
                      </div>
                    </details>

                    {/* DRIVERS */}
                    <details
                      id="section-drivers"
                      className="group rounded-2xl border border-neutral-200 bg-white"
                    >
                      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                            Drivers
                          </div>
                          <div className="text-sm font-semibold text-neutral-900">
                            What outcomes are included?
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-90" />
                      </summary>

                      <div className="px-4 pb-4 pt-1 space-y-3">
                        <div className="text-xs text-neutral-500">
                          Enable drivers to include them in totals.
                        </div>

                        <div className="space-y-2">
                          {SETTING_CONFIG.outpatient.map((lever) => {
                            const key = `outpatient:${lever.id}`;
                            const isActive = leverStates.get(key) ?? false;

                            return (
                              <StrategicDriverCard
                                key={lever.id}
                                title={lever.label}
                                active={isActive}
                                onClick={() =>
                                  handleLeverToggle(
                                    "outpatient",
                                    lever.id as LeverId,
                                  )
                                }
                                testId={`driver-card-${lever.id}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </details>
                  </>
                ) : (
                  <>
                    <InputSection
                      title="Commercial Terms"
                      icon={<DollarSign className="h-5 w-5" />}
                    >
                      <InputField
                        label="Monthly Cost per Provider"
                        helperText="Cost per provider per month"
                      >
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={formatNumber(inputs.monthlyCostPerProvider)}
                          onChange={(e) =>
                            handleInputChange(
                              "monthlyCostPerProvider",
                              parseFormattedNumber(e.target.value),
                            )
                          }
                        />
                      </InputField>
                    </InputSection>

                    <InputSection
                      title="Baseline Volume & Economics"
                      icon={<BarChart3 className="h-5 w-5" />}
                    >
                      <InputField
                        label="Number of Providers"
                        helperText="Total providers in scope"
                      >
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={formatNumber(inputs.numberOfProviders)}
                          onChange={(e) =>
                            handleInputChange(
                              "numberOfProviders",
                              parseFormattedNumber(e.target.value),
                            )
                          }
                        />
                      </InputField>

                      <InputField
                        label="Annual Outpatient Encounters"
                        helperText="Total annual encounters"
                      >
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={formatNumber(inputs.annualOutpatientEncounters)}
                          onChange={(e) =>
                            handleInputChange(
                              "annualOutpatientEncounters",
                              parseFormattedNumber(e.target.value),
                            )
                          }
                        />
                      </InputField>
                    </InputSection>

                    <LeverAccordion
                      inputs={inputs}
                      onInputChange={handleInputChange}
                    />
                  </>
                )}
              </div>
            </div>
          </aside>

          <main className="flex-1 flex flex-col min-[1200px]:overflow-hidden bg-white/50">
            <header className="p-6 border-b border-neutral-200 bg-white flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-semibold text-black">
                Results summary
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                data-testid="button-download-report"
              >
                <FileText className="h-4 w-4" />
                Download Report (PDF)
              </Button>
            </header>
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-8">
                {/* (1) Top strip: selections + model receipt (hierarchy) */}
                <div className="space-y-4">
                  {/* Compact "You chose" strip */}
                  <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          Your selections
                        </span>
                        <span className="text-neutral-300">•</span>
                        <span className="text-sm font-medium text-neutral-900">
                          {settingsText}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 md:justify-end">
                        {enabledDriverCount > 0 ? (
                          <>
                            {enabledCapacityLaborLevers.map((l) => (
                              <Badge
                                key={`${l.settingId}:${l.id}`}
                                variant="secondary"
                                className="text-[11px] px-2 py-0.5"
                              >
                                {l.label}
                              </Badge>
                            ))}
                            {enabledRevenueRiskLevers.map((l) => (
                              <Badge
                                key={`${l.settingId}:${l.id}`}
                                variant="secondary"
                                className="text-[11px] px-2 py-0.5"
                              >
                                {l.label}
                              </Badge>
                            ))}
                          </>
                        ) : (
                          <span className="text-xs text-neutral-400 italic">
                            No drivers selected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Scenario receipt (secondary weight) - collapsible */}
                  <details className="group rounded-xl border border-neutral-200 bg-neutral-50">
                    <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Scenario receipt
                      </div>
                      <ChevronRight className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-90" />
                    </summary>

                    <div className="px-4 pb-4 pt-1 grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="rounded-lg bg-white border border-neutral-200 px-3 py-2">
                        <div className="text-[11px] text-neutral-500">
                          Providers
                        </div>
                        <div className="font-mono font-semibold text-neutral-900">
                          {formatNumber(inputs.numberOfProviders)}
                        </div>
                      </div>

                      <div className="rounded-lg bg-white border border-neutral-200 px-3 py-2">
                        <div className="text-[11px] text-neutral-500">
                          Annual encounters
                        </div>
                        <div className="font-mono font-semibold text-neutral-900">
                          {formatNumber(inputs.annualOutpatientEncounters)}
                        </div>
                      </div>

                      <div className="rounded-lg bg-white border border-neutral-200 px-3 py-2">
                        <div className="text-[11px] text-neutral-500">
                          Utilization
                        </div>
                        <div className="font-mono font-semibold text-neutral-900">
                          {inputs.abridgeUtilizationPct}%
                        </div>
                      </div>

                      <div className="rounded-lg bg-white border border-neutral-200 px-3 py-2">
                        <div className="text-[11px] text-neutral-500">
                          Minutes saved
                        </div>
                        <div className="font-mono font-semibold text-neutral-900">
                          {inputs.minutesSavedPerEncounter}
                        </div>
                      </div>

                      <div className="rounded-lg bg-white border border-neutral-200 px-3 py-2">
                        <div className="text-[11px] text-neutral-500">
                          Ambient-used encounters
                        </div>
                        <div className="font-mono font-semibold text-neutral-900">
                          {formatNumber(Math.round(encountersCoveredByAbridge))}
                        </div>
                      </div>

                      <div className="rounded-lg bg-white border border-neutral-200 px-3 py-2">
                        <div className="text-[11px] text-neutral-500">
                          Drivers enabled
                        </div>
                        <div className="font-mono font-semibold text-neutral-900">
                          {enabledDriverCount}
                        </div>
                      </div>
                    </div>
                  </details>
                </div>

                {/* (3) Executive KPI row */}
                <div>
                  <KpiGrid>
                    <KpiCard
                      label="Total annual benefit"
                      value={formatCurrency(totalBenefitFromSelectedLevers)}
                      subtitle="Value from enabled drivers"
                      icon={<DollarSign className="h-8 w-8" />}
                      variant="positive"
                    />
                    <KpiCard
                      label="Annual program cost"
                      value={formatCurrency(annualAbridgeCost)}
                      subtitle="Abridge investment (Year 1)"
                      icon={<DollarSign className="h-8 w-8" />}
                      variant="negative"
                    />
                    <KpiCard
                      label="Net gain"
                      value={formatCurrency(adjustedNetValue)}
                      subtitle="Benefit minus cost"
                      icon={<TrendingUp className="h-8 w-8" />}
                      variant={adjustedNetValue >= 0 ? "positive" : "negative"}
                    />
                    <KpiCard
                      label="Return (x)"
                      value={`${adjustedRoiMultiple.toFixed(2)}x`}
                      subtitle="Value per $1 invested"
                      icon={<TrendingUp className="h-8 w-8" />}
                      variant={
                        adjustedRoiMultiple >= 1 ? "positive" : "negative"
                      }
                    />
                  </KpiGrid>
                </div>

                {/* How this model works (orientation layer) - collapsible */}
                <details className="group rounded-2xl border border-neutral-200 bg-white">
                  <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-semibold text-neutral-900">
                        How this model works
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {enabledDriverCount} drivers enabled
                      </Badge>
                    </div>
                    <ChevronRight className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-90" />
                  </summary>

                  <div className="px-4 pb-4 pt-1 space-y-3">
                    <div className="text-sm text-neutral-500">
                      Totals reflect enabled drivers only. Each line item
                      below shows its modeled contribution, based on the
                      assumptions you entered.
                    </div>

                    <div className="rounded-md bg-neutral-50 border border-neutral-200 px-3 py-2 text-sm text-neutral-700">
                      <span className="font-semibold text-neutral-900">
                        Want to validate a number?
                      </span>{" "}
                      Use <span className="font-semibold">Review inputs</span>{" "}
                      next to each driver below, or open{" "}
                      <span className="font-semibold">Model details</span> to
                      add or remove drivers.
                    </div>
                  </div>
                </details>

                {/* (4) Two-column Outcomes */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Capacity & labor outcomes - collapsible */}
                  <details className="group rounded-2xl border border-neutral-200 bg-white">
                    <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-neutral-900">
                          Capacity & labor outcomes
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          {formatCurrency(capacityLaborBenefit)}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-90" />
                    </summary>

                    <div className="px-4 pb-4 pt-1">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm font-semibold border-b border-neutral-200 pb-2">
                          <span className="text-neutral-700">
                            Modeled annual value
                          </span>
                          <span className="font-mono">
                            {formatCurrency(capacityLaborBenefit)}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm">
                          {enabledCapacityLaborLevers.length > 0 ? (
                            enabledCapacityLaborLevers.map((lever) => {
                              const openInputs = () => {
                                if (lever.id === "patientAccess")
                                  setPatientAccessDrawerOpen(true);
                                if (lever.id === "overtime")
                                  setOvertimeLocumDrawerOpen(true);
                                if (lever.id === "workforce")
                                  setClinicianRetentionDrawerOpen(true);
                              };

                              return (
                                <div
                                  key={`${lever.settingId}:${lever.id}`}
                                  className="flex justify-between items-center"
                                >
                                  <span className="text-neutral-600">
                                    {lever.label}
                                  </span>

                                  <div className="flex items-center gap-3">
                                    <span className="font-mono font-medium">
                                      {formatCurrency(lever.value)}
                                    </span>

                                    {/* One consistent CTA */}
                                    {lever.settingId === "outpatient" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={openInputs}
                                        className="h-6 px-2 text-xs text-neutral-600 hover:text-neutral-900 hover:underline underline-offset-4"
                                      >
                                        Review inputs
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-neutral-400 text-xs italic py-2">
                              No Capacity & Labor priorities selected
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </details>

                  {/* Revenue & risk outcomes - collapsible */}
                  <details className="group rounded-2xl border border-neutral-200 bg-white">
                    <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-neutral-900">
                          Revenue & risk outcomes
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          {formatCurrency(revenueRiskBenefit)}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-90" />
                    </summary>

                    <div className="px-4 pb-4 pt-1">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm font-semibold border-b border-neutral-200 pb-2">
                          <span className="text-neutral-700">
                            Modeled annual value
                          </span>
                          <span className="font-mono">
                            {formatCurrency(revenueRiskBenefit)}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm">
                          {enabledRevenueRiskLevers.length > 0 ? (
                            enabledRevenueRiskLevers.map((lever) => {
                              const openInputs = () => {
                                if (lever.id === "wrvu")
                                  setLevelOfServiceDrawerOpen(true);
                                if (lever.id === "denials")
                                  setMedicalNecessityDenialsDrawerOpen(true);
                                if (lever.id === "hcc")
                                  setHccConditionCaptureDrawerOpen(true);
                              };

                              return (
                                <div
                                  key={`${lever.settingId}:${lever.id}`}
                                  className="flex justify-between items-center"
                                >
                                  <span className="text-neutral-600">
                                    {lever.label}
                                  </span>

                                  <div className="flex items-center gap-3">
                                    <span className="font-mono font-medium">
                                      {formatCurrency(lever.value)}
                                    </span>

                                    {/* One consistent CTA */}
                                    {lever.settingId === "outpatient" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={openInputs}
                                        className="h-6 px-2 text-xs text-neutral-600 hover:text-neutral-900 hover:underline underline-offset-4"
                                      >
                                        Review inputs
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-neutral-400 text-xs italic py-2">
                              No Revenue & Risk priorities selected
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </details>
                </div>

                {/* (5) Model details (collapsed by default) */}
                <Card className="w-full overflow-hidden border-neutral-200 bg-white">
                  <CardContent className="p-0">
                    <details className="group">
                      <summary className="list-none cursor-pointer select-none px-6 py-5 flex items-start justify-between gap-6 hover:bg-neutral-50 transition-colors">
                        <div>
                          <div className="text-base font-semibold text-neutral-900">
                            Model details
                          </div>
                          <div className="text-sm text-neutral-500 mt-1">
                            Review what's included in totals, and enable
                            additional drivers.
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant="secondary" className="text-xs">
                            {enabledDriverCount} included
                          </Badge>

                          <span className="text-xs text-neutral-500 group-open:hidden">
                            Show
                          </span>
                          <span className="text-xs text-neutral-500 hidden group-open:inline">
                            Hide
                          </span>

                          {/* Chevron (rotates) */}
                          <svg
                            className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-180"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </summary>

                      <div className="border-t border-neutral-200">
                        <div className="overflow-x-auto">
                          <Table className="min-w-[900px]">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-20 text-center text-xs uppercase tracking-wide text-neutral-500">
                                  Include
                                </TableHead>
                                <TableHead className="text-xs uppercase tracking-wide text-neutral-500">
                                  Driver
                                </TableHead>
                                <TableHead className="w-32 text-xs uppercase tracking-wide text-neutral-500">
                                  Setting
                                </TableHead>
                                <TableHead className="w-40 text-right text-xs uppercase tracking-wide text-neutral-500">
                                  Annual value
                                </TableHead>
                                <TableHead className="w-48 text-right text-xs uppercase tracking-wide text-neutral-500">
                                  Actions
                                </TableHead>
                              </TableRow>
                            </TableHeader>

                            <TableBody>
                              {(() => {
                                const activeLevers = leversWithSettings.filter(
                                  (l) => l.enabled,
                                );
                                const inactiveLevers =
                                  leversWithSettings.filter((l) => !l.enabled);

                                const renderActions = (
                                  lever: LeverWithSetting,
                                ) => {
                                  const action = getLeverAction(
                                    lever.settingId,
                                    lever.id,
                                  );

                                  return (
                                    <div className="flex justify-end items-center gap-3">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSelectedLeverForModal(lever)
                                        }
                                        className="text-xs text-neutral-500 hover:text-neutral-900 hover:underline underline-offset-4"
                                      >
                                        Why
                                      </button>

                                      {action ? (
                                        <button
                                          type="button"
                                          onClick={action.onClick}
                                          className="text-xs text-neutral-600 hover:text-neutral-900 hover:underline underline-offset-4"
                                        >
                                          {action.label}
                                        </button>
                                      ) : (
                                        <span className="text-xs text-neutral-300">
                                          —
                                        </span>
                                      )}
                                    </div>
                                  );
                                };

                                return (
                                  <>
                                    {/* Section: Included */}
                                    <TableRow className="bg-neutral-50">
                                      <TableCell
                                        colSpan={5}
                                        className="px-6 py-3"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                                            Included drivers
                                          </span>
                                          <span className="text-xs text-neutral-500">
                                            {activeLevers.length}
                                          </span>
                                        </div>
                                      </TableCell>
                                    </TableRow>

                                    {activeLevers.length > 0 ? (
                                      activeLevers.map((lever) => {
                                        const key = `${lever.settingId}:${lever.id}`;

                                        return (
                                          <TableRow
                                            key={key}
                                            className="hover:bg-neutral-50 transition-colors"
                                            data-testid={`lever-row-${key}`}
                                          >
                                            <TableCell className="text-center">
                                              <Checkbox
                                                checked
                                                onCheckedChange={() =>
                                                  handleLeverToggle(
                                                    lever.settingId,
                                                    lever.id,
                                                  )
                                                }
                                                data-testid={`checkbox-${key}`}
                                              />
                                            </TableCell>

                                            <TableCell className="font-medium text-neutral-900">
                                              {lever.label}
                                            </TableCell>

                                            <TableCell>
                                              <Badge
                                                variant="secondary"
                                                className="text-xs"
                                              >
                                                {
                                                  CARE_SETTING_LABELS[
                                                    lever.settingId
                                                  ]
                                                }
                                              </Badge>
                                            </TableCell>

                                            <TableCell className="text-right font-mono">
                                              {formatCurrency(lever.value)}
                                            </TableCell>

                                            <TableCell className="text-right">
                                              {renderActions(lever)}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })
                                    ) : (
                                      <TableRow>
                                        <TableCell
                                          colSpan={5}
                                          className="px-6 py-6"
                                        >
                                          <div className="text-sm text-neutral-400 italic text-center">
                                            No drivers currently included
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )}

                                    {/* Section: Available */}
                                    {inactiveLevers.length > 0 && (
                                      <>
                                        <TableRow className="bg-neutral-50">
                                          <TableCell
                                            colSpan={5}
                                            className="px-6 py-3"
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                                                Available drivers
                                              </span>
                                              <span className="text-xs text-neutral-500">
                                                {inactiveLevers.length}
                                              </span>
                                            </div>
                                          </TableCell>
                                        </TableRow>

                                        {inactiveLevers.map((lever) => {
                                          const key = `${lever.settingId}:${lever.id}`;

                                          return (
                                            <TableRow
                                              key={key}
                                              className="hover:bg-neutral-50 transition-colors opacity-60"
                                              data-testid={`lever-row-${key}`}
                                            >
                                              <TableCell className="text-center">
                                                <Checkbox
                                                  checked={false}
                                                  onCheckedChange={() =>
                                                    handleLeverToggle(
                                                      lever.settingId,
                                                      lever.id,
                                                    )
                                                  }
                                                  data-testid={`checkbox-${key}`}
                                                />
                                              </TableCell>

                                              <TableCell className="font-medium text-neutral-900">
                                                {lever.label}
                                              </TableCell>

                                              <TableCell>
                                                <Badge
                                                  variant="secondary"
                                                  className="text-xs"
                                                >
                                                  {
                                                    CARE_SETTING_LABELS[
                                                      lever.settingId
                                                    ]
                                                  }
                                                </Badge>
                                              </TableCell>

                                              <TableCell className="text-right font-mono text-neutral-400">
                                                {formatCurrency(lever.value)}
                                              </TableCell>

                                              <TableCell className="text-right">
                                                {renderActions(lever)}
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </>
                                    )}
                                  </>
                                );
                              })()}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </details>
                  </CardContent>
                </Card>

                {/* (6) Scale - Enterprise Expansion Chart - collapsible */}
                <details className="group rounded-2xl border border-neutral-200 bg-white">
                  <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-neutral-900">
                        Enterprise scale projection
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        View projected value at full deployment
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-90" />
                  </summary>

                  <div className="px-4 pb-4 pt-1">
                    <EnterpriseExpansionChart
                      levers={waterfallLevers}
                      totalAnnualBenefit={totalBenefitFromSelectedLevers}
                      scopeEncounterCount={encountersCoveredByAbridge}
                      enterpriseEncounterCount={
                        inputs.enterpriseAnnualEncounters *
                        (inputs.abridgeUtilizationPct / 100)
                      }
                      providersInScope={inputs.numberOfProviders}
                      enterpriseProviders={inputs.enterpriseProviderCount}
                      utilizationPct={inputs.abridgeUtilizationPct}
                    />
                  </div>
                </details>

                {/* (7) Notes for internal review (PDF carry-forward) - collapsible */}
                <details className="group rounded-2xl border border-neutral-200 bg-white">
                  <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-semibold text-neutral-900">
                        Notes for internal review
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Optional
                      </Badge>
                    </div>
                    <ChevronRight className="h-4 w-4 text-neutral-400 transition-transform group-open:rotate-90" />
                  </summary>

                  <div className="px-4 pb-4 pt-1 space-y-4">
                    <p className="text-sm text-neutral-500">
                      These notes are included in the exported PDF to help others
                      understand scope, assumptions, and next steps.
                    </p>

                    {/* Quick add chips */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Confirm scope & utilization assumptions",
                        "Validate driver inputs with Finance",
                        "Review with Ops leadership",
                        "Align on rollout timeline",
                        "Decide pilot → enterprise criteria",
                      ].map((text) => (
                        <button
                          key={text}
                          type="button"
                          onClick={() =>
                            setCommentary((prev) => {
                              const next = prev?.trim?.()
                                ? `${prev.trim()}\n• ${text}`
                                : `• ${text}`;
                              return next;
                            })
                          }
                          className="text-xs px-2.5 py-1 rounded-full border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 transition-colors"
                          data-testid={`button-add-note-${text.slice(0, 10).replace(/\s+/g, '-').toLowerCase()}`}
                        >
                          + {text}
                        </button>
                      ))}
                    </div>

                    {/* Notes textarea */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-neutral-700">
                        Context / assumptions (included in PDF)
                      </label>
                      <textarea
                        value={commentary}
                        onChange={(e) => setCommentary(e.target.value)}
                        placeholder="Example: This model assumes 70% utilization and the same enabled drivers at enterprise scale. Finance to confirm cost baseline and net revenue per encounter."
                        className="w-full min-h-[120px] resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                        data-testid="textarea-notes"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-neutral-500">
                          Tip: write for someone who wasn't in the room.
                        </p>
                        <button
                          type="button"
                          onClick={() => setCommentary("")}
                          className="text-xs text-neutral-500 hover:text-neutral-900 hover:underline underline-offset-4"
                          data-testid="button-clear-notes"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </ScrollArea>
          </main>

      {/* Lever Detail Modal */}
      {selectedLeverForModal && (
        <Dialog
          open={!!selectedLeverForModal}
          onOpenChange={() => setSelectedLeverForModal(null)}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedLeverForModal.label}</DialogTitle>
              <DialogDescription>
                {getLeverConfigById(
                  selectedLeverForModal.settingId,
                  selectedLeverForModal.id,
                )?.description || "No description available."}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Care Setting</span>
                <span className="font-medium">
                  {CARE_SETTING_LABELS[selectedLeverForModal.settingId]}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Annual Value</span>
                <span className="font-mono font-medium">
                  {formatCurrency(selectedLeverForModal.value)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">This lever drives</span>
                <span className="text-right max-w-[200px]">
                  {getLeverConfigById(
                    selectedLeverForModal.settingId,
                    selectedLeverForModal.id,
                  )?.driverSummary || "—"}
                </span>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => setSelectedLeverForModal(null)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
        </div>
      </div>
    </div>
  );
}