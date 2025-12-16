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
import { PatientAccessDrawer, type PatientAccessInputs, type PatientAccessCalculations } from "@/components/PatientAccessDrawer";
import { OvertimeLocumDrawer, type OvertimeLocumInputs, type OvertimeLocumCalculations } from "@/components/OvertimeLocumDrawer";
import { type SelectedLever } from "@/pages/ObjectiveSelectionScreen";
import { defaultInputs, type RoiInputs, type LeverId, type Lever, leverLabels, leverDescriptions } from "@/lib/roi-types";
import { calculateRoi, formatCurrency, formatNumber, formatPercent } from "@/lib/roi-calculator";
import { CARE_SETTING_LABELS, SETTING_CONFIG, type CareSettingType } from "@/lib/SETTING_CONFIG";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  Users,
  BarChart3,
  TrendingUp,
  Clock,
  Percent,
  Calculator,
  Settings,
  Target,
} from "lucide-react";

interface RoiCalculatorProps {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
  onBack: () => void;
}

interface LeverWithSetting extends Lever {
  settingId: CareSettingType;
}

const leverTableDescriptions: Record<string, string> = {
  patientAccess: "Documentation steals minutes from every visit, and those minutes determine how many patients a clinician can realistically see. Returning that time improves access without increasing staffing.",
  overtime: "Much of overtime and locum spend comes from documentation spilling past scheduled hours. Completing more documentation inside the visit reduces that spillover.",
  workforce: "Burnout grows when documentation bleeds into every corner of the day. Reducing that burden helps clinicians sustain the work and stay longer.",
  riskAdjustment: "Risk models break when chronic conditions aren't consistently documented. Clearer narratives help clinicians carry forward the truth about patient complexity.",
  wrvu: "Visits are often undercoded because the documentation doesn't show the thinking behind the care. Better reasoning in the note aligns coding with reality.",
  denials: "Unrecoverable denials occur when the note doesn't clearly justify why care was needed. Stronger narratives reduce these losses at the source.",
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

export default function RoiCalculator({ selectedSettings, selectedLevers, onBack }: RoiCalculatorProps) {
  const [leverStates, setLeverStates] = useState<Map<string, boolean>>(() => {
    const map = new Map<string, boolean>();
    selectedLevers.forEach((l) => {
      map.set(`${l.settingId}:${l.leverId}`, l.active);
    });
    return map;
  });
  
  const [inputs, setInputs] = useState<RoiInputs>(() => {
    const initial: RoiInputs = JSON.parse(JSON.stringify(defaultInputs));
    const allLeverIds: LeverId[] = ["patientAccess", "overtime", "workforce", "wrvu", "denials", "riskAdjustment"];
    allLeverIds.forEach((id) => {
      initial.levers[id] = selectedLevers.some(
        (l) => l.leverId === id && l.active
      );
    });
    return initial;
  });
  const [commentary, setCommentary] = useState("");
  const [selectedLeverForModal, setSelectedLeverForModal] = useState<LeverWithSetting | null>(null);
  const [patientAccessDrawerOpen, setPatientAccessDrawerOpen] = useState(false);
  const [overtimeLocumDrawerOpen, setOvertimeLocumDrawerOpen] = useState(false);
  
  const [patientAccessInputs, setPatientAccessInputs] = useState<PatientAccessInputs>(() => {
    const clinicians = inputs.numberOfProviders;
    const encountersPerClinician = clinicians > 0 
      ? Math.round(inputs.annualOutpatientEncounters / clinicians) 
      : 0;
    return {
      minutesSavedPerEncounter: 4,
      cliniciansInScope: clinicians,
      encountersPerClinician,
      visitMinutes: 30,
      reinvestRate: 0.10,
      netRevenuePerEncounter: inputs.avgNetRevenuePerEncounter,
    };
  });
  
  useEffect(() => {
    setPatientAccessInputs(prev => ({
      ...prev,
      cliniciansInScope: inputs.numberOfProviders,
      encountersPerClinician: inputs.numberOfProviders > 0 
        ? Math.round(inputs.annualOutpatientEncounters / inputs.numberOfProviders) 
        : 0,
      netRevenuePerEncounter: inputs.avgNetRevenuePerEncounter,
    }));
  }, [inputs.numberOfProviders, inputs.annualOutpatientEncounters, inputs.avgNetRevenuePerEncounter]);
  
  const patientAccessCalculations: PatientAccessCalculations = useMemo(() => {
    const { minutesSavedPerEncounter, cliniciansInScope, encountersPerClinician, visitMinutes, reinvestRate, netRevenuePerEncounter } = patientAccessInputs;
    const totalEncounters = cliniciansInScope * encountersPerClinician;
    const hoursSavedPerEncounter = minutesSavedPerEncounter / 60;
    const totalHoursSaved = totalEncounters * hoursSavedPerEncounter;
    const reinvestedHours = totalHoursSaved * reinvestRate;
    const visitsPerHour = 60 / visitMinutes;
    const additionalVisits = reinvestedHours * visitsPerHour;
    const incrementalRevenue = additionalVisits * netRevenuePerEncounter;
    return { totalHoursSaved, reinvestedHours, additionalVisits, incrementalRevenue };
  }, [patientAccessInputs]);
  
  const handlePatientAccessInputChange = (field: keyof PatientAccessInputs, value: number) => {
    setPatientAccessInputs(prev => ({ ...prev, [field]: value }));
  };
  
  const [overtimeLocumInputs, setOvertimeLocumInputs] = useState<OvertimeLocumInputs>({
    pctHoursPreviouslyPremium: 0.20,
    pctPremiumRealized: 0.75,
    overtimeRate: 150,
    locumRate: 250,
    locumShare: 0.50,
  });
  
  const handleOvertimeLocumInputChange = (field: keyof OvertimeLocumInputs, value: number) => {
    setOvertimeLocumInputs(prev => ({ ...prev, [field]: value }));
  };

  const results = useMemo(() => calculateRoi(inputs), [inputs]);
  
  const patientAccessEnabled = leverStates.get("outpatient:patientAccess") ?? false;
  const isOutpatientSelected = selectedSettings.includes("outpatient");
  
  const adjustedClinicianHoursRecovered = useMemo(() => {
    if (patientAccessEnabled && isOutpatientSelected) {
      return patientAccessCalculations.totalHoursSaved;
    }
    return results.totalProviderHoursReclaimed;
  }, [patientAccessCalculations.totalHoursSaved, results.totalProviderHoursReclaimed, patientAccessEnabled, isOutpatientSelected]);
  
  const overtimeLocumCalculations: OvertimeLocumCalculations = useMemo(() => {
    const reclaimedHours = adjustedClinicianHoursRecovered;
    const premiumHoursExposed = reclaimedHours * overtimeLocumInputs.pctHoursPreviouslyPremium;
    const premiumHoursReduced = premiumHoursExposed * overtimeLocumInputs.pctPremiumRealized;
    const overtimeShare = 1 - overtimeLocumInputs.locumShare;
    const blendedRate = (overtimeLocumInputs.locumShare * overtimeLocumInputs.locumRate) + 
                        (overtimeShare * overtimeLocumInputs.overtimeRate);
    const annualSavings = premiumHoursReduced * blendedRate;
    return { reclaimedHours, premiumHoursExposed, premiumHoursReduced, blendedRate, annualSavings };
  }, [adjustedClinicianHoursRecovered, overtimeLocumInputs]);

  const annualAbridgeCost = useMemo(
    () =>
      inputs.numberOfProviders * inputs.monthlyCostPerProvider * 12 +
      inputs.implementationCostYear1,
    [inputs.numberOfProviders, inputs.monthlyCostPerProvider, inputs.implementationCostYear1]
  );

  const leversWithSettings: LeverWithSetting[] = useMemo(() => {
    const leverList: LeverWithSetting[] = [];
    
    selectedSettings.forEach((settingId) => {
      if (settingId === "outpatient" && selectedSettings.length === 1) {
        SETTING_CONFIG.outpatient.forEach((leverConfig) => {
          const matchingLever = results.levers.find((rl) => rl.id === leverConfig.id);
          if (matchingLever) {
            const key = `${settingId}:${leverConfig.id}`;
            const isEnabled = leverStates.get(key) ?? false;
            let overriddenValue = matchingLever.value;
            if (isEnabled) {
              if (leverConfig.id === "patientAccess") {
                overriddenValue = patientAccessCalculations.incrementalRevenue;
              } else if (leverConfig.id === "overtime") {
                overriddenValue = overtimeLocumCalculations.annualSavings;
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
            const matchingLever = results.levers.find((rl) => rl.id === l.leverId);
            if (matchingLever) {
              const key = `${settingId}:${l.leverId}`;
              const isEnabled = leverStates.get(key) ?? l.active;
              let overriddenValue = matchingLever.value;
              if (isEnabled) {
                if (l.leverId === "patientAccess" && settingId === "outpatient") {
                  overriddenValue = patientAccessCalculations.incrementalRevenue;
                } else if (l.leverId === "overtime" && settingId === "outpatient") {
                  overriddenValue = overtimeLocumCalculations.annualSavings;
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
  }, [selectedSettings, selectedLevers, results.levers, JSON.stringify(Array.from(leverStates.entries())), patientAccessCalculations.incrementalRevenue, overtimeLocumCalculations.annualSavings]);

  const totalBenefitFromSelectedLevers = useMemo(() => {
    return leversWithSettings
      .filter((l) => l.enabled)
      .reduce((sum, l) => sum + l.value, 0);
  }, [leversWithSettings]);

  const adjustedRoiMultiple = useMemo(() => {
    return annualAbridgeCost > 0 ? totalBenefitFromSelectedLevers / annualAbridgeCost : 0;
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
      const anyLeverActiveForId = Array.from(leverStates.entries()).some(
        ([k, v]) => k.endsWith(`:${leverId}`) && k !== key && v
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

  const settingsText = selectedSettings.map((s) => CARE_SETTING_LABELS[s]).join(", ");

  return (
    <div className="min-h-screen relative font-sans" style={{ backgroundColor: '#FAFAF8' }}>
      <div className="relative z-10 flex flex-col h-screen">
        <div className="bg-white border-b border-neutral-200 px-6 py-3">
          <div className="flex items-center gap-3">
            <span 
              className="text-xl font-semibold tracking-wide"
              style={{ color: '#F03319' }}
            >
              ABRIDGE
            </span>
            <span className="text-neutral-300">|</span>
            <span className="text-sm text-neutral-600">
              {settingsText}
            </span>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-96 bg-white border-r border-neutral-200 flex flex-col">
            <div className="p-6 border-b border-neutral-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="mb-2 -ml-2"
                data-testid="button-back"
              >
                Back to Selection
              </Button>
              <h1 className="text-2xl font-bold text-black">ROI Calculator</h1>
              <p className="text-xs text-neutral-500 mt-1">
                Current Selection: {settingsText}
              </p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {selectedSettings.includes("outpatient") && selectedSettings.length === 1 ? (
                  <>
                    <div className="space-y-1 mb-6">
                      <h2 className="text-lg font-semibold text-black">Scenario Inputs</h2>
                      <p className="text-xs text-neutral-500">Define who's in scope and the economics for this scenario.</p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <h3 className="pt-4 pb-1 text-xs font-semibold text-[#F03319] uppercase tracking-wide">Current Scope</h3>
                        <InputField label="Providers in Scope" helperText="Clinicians included in this scenario.">
                          <Input
                            type="number"
                            value={inputs.numberOfProviders}
                            onChange={(e) =>
                              handleInputChange("numberOfProviders", Number(e.target.value))
                            }
                            data-testid="input-num-providers"
                          />
                        </InputField>
                        <InputField label="Annual Outpatient Encounters (in scope)" helperText="Annual visits covered by Abridge for this group.">
                          <Input
                            type="number"
                            value={inputs.annualOutpatientEncounters}
                            onChange={(e) =>
                              handleInputChange("annualOutpatientEncounters", Number(e.target.value))
                            }
                            data-testid="input-encounters"
                          />
                        </InputField>
                        <InputField label="Abridge Utilization (%)" helperText="Portion of eligible visits where Abridge is actually used.">
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
                      </div>

                      <div className="space-y-3">
                        <h3 className="pt-4 pb-1 text-xs font-semibold text-[#F03319] uppercase tracking-wide">Enterprise Footprint</h3>
                        <InputField label="Enterprise Provider Count" helperText="Total clinicians across your enterprise.">
                          <Input
                            type="number"
                            value={inputs.enterpriseProviderCount}
                            onChange={(e) =>
                              handleInputChange("enterpriseProviderCount", Number(e.target.value))
                            }
                            data-testid="input-enterprise-providers"
                          />
                        </InputField>
                        <InputField label="Annual Outpatient Encounters (enterprise)" helperText="Total annual outpatient visits across the enterprise.">
                          <Input
                            type="number"
                            value={inputs.enterpriseAnnualEncounters}
                            onChange={(e) =>
                              handleInputChange("enterpriseAnnualEncounters", Number(e.target.value))
                            }
                            data-testid="input-enterprise-encounters"
                          />
                        </InputField>
                      </div>

                      <div className="space-y-3">
                        <h3 className="pt-4 pb-1 text-xs font-semibold text-[#F03319] uppercase tracking-wide">Economics</h3>
                        <InputField label="Average Revenue per Encounter ($)" helperText="Typical net revenue collected per outpatient visit.">
                          <Input
                            type="number"
                            value={inputs.avgNetRevenuePerEncounter}
                            onChange={(e) =>
                              handleInputChange("avgNetRevenuePerEncounter", Number(e.target.value))
                            }
                            data-testid="input-avg-revenue"
                          />
                        </InputField>
                        <InputField label="Cost per Provider per Month ($)" helperText="Contracted Abridge subscription per provider, per month.">
                          <Input
                            type="number"
                            value={inputs.monthlyCostPerProvider}
                            onChange={(e) =>
                              handleInputChange("monthlyCostPerProvider", Number(e.target.value))
                            }
                            data-testid="input-cost-per-provider"
                          />
                        </InputField>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-neutral-600" />
                        <h3 className="text-sm font-semibold text-neutral-800 uppercase tracking-wide">
                          Strategic Drivers
                        </h3>
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
                              onClick={() => handleLeverToggle("outpatient", lever.id as LeverId)}
                              testId={`driver-card-${lever.id}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <InputSection title="Commercial Terms" icon={<DollarSign className="h-5 w-5" />}>
                      <InputField label="Contract Length (years)">
                        <Input
                          type="number"
                          value={inputs.contractLengthYears}
                          onChange={(e) =>
                            handleInputChange("contractLengthYears", Number(e.target.value))
                          }
                          data-testid="input-contract-length"
                        />
                      </InputField>
                      <InputField label="Number of Providers">
                        <Input
                          type="number"
                          value={inputs.numberOfProviders}
                          onChange={(e) =>
                            handleInputChange("numberOfProviders", Number(e.target.value))
                          }
                          data-testid="input-num-providers"
                        />
                      </InputField>
                      <InputField label="Monthly Cost per Provider ($)">
                        <Input
                          type="number"
                          value={inputs.monthlyCostPerProvider}
                          onChange={(e) =>
                            handleInputChange("monthlyCostPerProvider", Number(e.target.value))
                          }
                          data-testid="input-monthly-cost"
                        />
                      </InputField>
                      <InputField label="Implementation Cost Year 1 ($)">
                        <Input
                          type="number"
                          value={inputs.implementationCostYear1}
                          onChange={(e) =>
                            handleInputChange("implementationCostYear1", Number(e.target.value))
                          }
                          data-testid="input-impl-cost"
                        />
                      </InputField>
                      <InputField label="Annual Abridge Cost (Year 1)" readOnly>
                        <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                          <Calculator className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold font-mono" data-testid="text-annual-cost">
                            {formatCurrency(annualAbridgeCost)}
                          </span>
                        </div>
                      </InputField>
                    </InputSection>

                    <InputSection
                      title="Baseline Volume & Economics"
                      icon={<BarChart3 className="h-5 w-5" />}
                    >
                      <InputField label="Annual Outpatient Encounters">
                        <Input
                          type="number"
                          value={inputs.annualOutpatientEncounters}
                          onChange={(e) =>
                            handleInputChange("annualOutpatientEncounters", Number(e.target.value))
                          }
                          data-testid="input-encounters"
                        />
                      </InputField>
                      <InputField label="Abridge Utilization (%)">
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
                      <InputField label="Avg Net Revenue per Encounter ($)">
                        <Input
                          type="number"
                          value={inputs.avgNetRevenuePerEncounter}
                          onChange={(e) =>
                            handleInputChange("avgNetRevenuePerEncounter", Number(e.target.value))
                          }
                          data-testid="input-avg-revenue"
                        />
                      </InputField>
                      <InputField label="Baseline wRVU per Encounter">
                        <Input
                          type="number"
                          step="0.01"
                          value={inputs.baselineWrvuPerEncounter}
                          onChange={(e) =>
                            handleInputChange("baselineWrvuPerEncounter", Number(e.target.value))
                          }
                          data-testid="input-baseline-wrvu"
                        />
                      </InputField>
                      <InputField label="Total MA Attributed Patients">
                        <Input
                          type="number"
                          value={inputs.totalMedicareAdvantagePatients}
                          onChange={(e) =>
                            handleInputChange(
                              "totalMedicareAdvantagePatients",
                              Number(e.target.value)
                            )
                          }
                          data-testid="input-ma-patients"
                        />
                      </InputField>
                      <InputField
                        label="Total Provider Hours Reclaimed"
                        helperText="Annual hours saved across all providers"
                      >
                        <Input
                          type="number"
                          value={inputs.totalProviderHoursReclaimed}
                          onChange={(e) =>
                            handleInputChange(
                              "totalProviderHoursReclaimed",
                              Number(e.target.value)
                            )
                          }
                          data-testid="input-hours-reclaimed"
                        />
                      </InputField>
                    </InputSection>

                    <LeverAccordion inputs={inputs} onInputChange={handleInputChange} />
                  </>
                )}
              </div>
            </ScrollArea>
          </aside>

          <main className="flex-1 flex flex-col overflow-hidden bg-white/50">
            <header className="p-6 border-b border-neutral-200 bg-white">
              <h2 className="text-xl font-semibold text-black">Results Summary</h2>
            </header>
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6 max-w-7xl">
                <KpiGrid>
                  <KpiCard
                    label="Return (x)"
                    value={`${adjustedRoiMultiple.toFixed(2)}x`}
                    icon={<TrendingUp className="h-8 w-8" />}
                    variant={adjustedRoiMultiple >= 1 ? "positive" : "negative"}
                  />
                  <KpiCard
                    label="Annual Impact"
                    value={formatCurrency(totalBenefitFromSelectedLevers)}
                    icon={<DollarSign className="h-8 w-8" />}
                    variant="positive"
                  />
                  <KpiCard
                    label="Annual Program Cost"
                    value={formatCurrency(annualAbridgeCost)}
                    icon={<DollarSign className="h-8 w-8" />}
                    variant="negative"
                  />
                  <KpiCard
                    label="Net Gain"
                    value={formatCurrency(adjustedNetValue)}
                    icon={<TrendingUp className="h-8 w-8" />}
                    variant={adjustedNetValue >= 0 ? "positive" : "negative"}
                  />
                  <KpiCard
                    label="Clinician Hours Recovered"
                    value={formatNumber(adjustedClinicianHoursRecovered)}
                    icon={<Clock className="h-8 w-8" />}
                    variant="neutral"
                  />
                  <KpiCard
                    label="Projected wRVU/Visit"
                    value={results.postWrvuPerEncounter.toFixed(2)}
                    icon={<Users className="h-8 w-8" />}
                    variant="neutral"
                  />
                  <KpiCard
                    label="Adjusted Denial Rate"
                    value={formatPercent(results.newEffectiveDenialRate)}
                    icon={<Percent className="h-8 w-8" />}
                    variant="positive"
                  />
                </KpiGrid>

                <WaterfallChart
                  levers={waterfallLevers}
                  investmentCost={annualAbridgeCost}
                  netValue={adjustedNetValue}
                />

                <EnterpriseExpansionChart
                  levers={waterfallLevers}
                  totalAnnualBenefit={totalBenefitFromSelectedLevers}
                  scopeEncounterCount={inputs.annualOutpatientEncounters * (inputs.abridgeUtilizationPct / 100)}
                  enterpriseEncounterCount={inputs.enterpriseAnnualEncounters * (inputs.abridgeUtilizationPct / 100)}
                />

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold">Understanding Your Drivers</CardTitle>
                    <p className="text-sm text-neutral-500">Interpretation of how each selected driver influences your current scope.</p>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16 text-center">Active</TableHead>
                          <TableHead>Lever</TableHead>
                          <TableHead>Setting</TableHead>
                          <TableHead className="text-right">Annual Value</TableHead>
                          <TableHead className="hidden md:table-cell">Description</TableHead>
                          <TableHead className="w-24"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leversWithSettings.map((lever) => {
                          const key = `${lever.settingId}:${lever.id}`;
                          return (
                            <TableRow 
                              key={key} 
                              className={!lever.enabled ? "opacity-50" : ""}
                              data-testid={`lever-row-${key}`}
                            >
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={lever.enabled}
                                  onCheckedChange={() => handleLeverToggle(lever.settingId, lever.id)}
                                  data-testid={`checkbox-${key}`}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{lever.label}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {CARE_SETTING_LABELS[lever.settingId]}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {lever.enabled ? formatCurrency(lever.value) : "—"}
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-md">
                                <span>{leverTableDescriptions[lever.id] || lever.description}</span>
                                {leverEducationalContent[lever.id] && (
                                  <>
                                    {" "}
                                    <button
                                      onClick={() => setSelectedLeverForModal(lever)}
                                      className="text-neutral-500 text-sm hover:underline cursor-pointer"
                                      data-testid={`read-more-${key}`}
                                    >
                                      Read more…
                                    </button>
                                  </>
                                )}
                              </TableCell>
                              <TableCell>
                                {lever.id === "patientAccess" && lever.settingId === "outpatient" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPatientAccessDrawerOpen(true)}
                                    className="text-xs"
                                    data-testid="button-show-work-patient-access"
                                  >
                                    Show Work
                                  </Button>
                                )}
                                {lever.id === "overtime" && lever.settingId === "outpatient" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setOvertimeLocumDrawerOpen(true)}
                                    className="text-xs"
                                    data-testid="button-show-work-overtime"
                                  >
                                    Show Work
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="font-semibold bg-muted/50">
                          <TableCell></TableCell>
                          <TableCell>Total Annual Benefit</TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(totalBenefitFromSelectedLevers)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell"></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <CommentaryBox value={commentary} onChange={setCommentary} />
              </div>
            </ScrollArea>
          </main>
        </div>
      </div>

      <Dialog open={!!selectedLeverForModal} onOpenChange={(open) => !open && setSelectedLeverForModal(null)}>
        <DialogContent className="max-w-[600px] w-full rounded-xl shadow-xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto bg-white [&>button]:top-6 [&>button]:right-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-black">
              {selectedLeverForModal?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
            {selectedLeverForModal && leverEducationalContent[selectedLeverForModal.id]}
          </div>
        </DialogContent>
      </Dialog>

      <PatientAccessDrawer
        open={patientAccessDrawerOpen}
        onClose={() => setPatientAccessDrawerOpen(false)}
        inputs={patientAccessInputs}
        onChange={handlePatientAccessInputChange}
        calculations={patientAccessCalculations}
      />

      <OvertimeLocumDrawer
        open={overtimeLocumDrawerOpen}
        onClose={() => setOvertimeLocumDrawerOpen(false)}
        inputs={overtimeLocumInputs}
        onChange={handleOvertimeLocumInputChange}
        calculations={overtimeLocumCalculations}
      />
    </div>
  );
}
