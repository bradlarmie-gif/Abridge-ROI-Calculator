import { useState } from "react";
import { Check } from "lucide-react";
import type { CareSettingType } from "@/lib/SETTING_CONFIG";
import type { RoiInputs, RoiResults, LeverId } from "@/lib/roi-types";
import type {
  BaselineData,
  ExpansionInputs,
  ExpansionResults,
  PhasedPlan,
  DriverValidation,
} from "./expansion-types";
import { Step1_BaselineReview } from "./Step1_BaselineReview";
import { Step2_ExpansionPlan } from "./Step2_ExpansionPlan";
import { Step3_RealityCheck } from "./Step3_RealityCheck";
import { Step4_MaturityModel } from "./Step4_MaturityModel";

interface ExpansionCalculatorProps {
  careSetting: CareSettingType;
  inputs: RoiInputs;
  results: RoiResults;
  onBack: () => void;
  onSave: (expansionResults: ExpansionResults, expansionInputs: ExpansionInputs) => void;
}

const STEP_LABELS = ["Your Baseline", "Expansion Plan", "Reality Check", "Your Model"];

function createBaselineData(
  inputs: RoiInputs,
  results: RoiResults
): BaselineData {
  const benefits: Partial<Record<LeverId, number>> = {};
  const activeDrivers: LeverId[] = [];

  results.levers.forEach((lever) => {
    if (lever.enabled && lever.value > 0) {
      benefits[lever.id] = lever.value;
      activeDrivers.push(lever.id);
    }
  });

  return {
    providers: inputs.numberOfProviders,
    encounters: inputs.annualOutpatientEncounters,
    utilization: inputs.abridgeUtilizationPct / 100,
    costPerProviderMonth: inputs.monthlyCostPerProvider,
    annualCost: results.annualAbridgeCost,
    totalBenefit: results.totalAnnualBenefit,
    netGain: results.netValueCreated,
    roi: results.roiMultiple,
    benefits,
    activeDrivers,
  };
}

function createInitialExpansionInputs(
  baseline: BaselineData
): ExpansionInputs {
  const defaultPhasedPlan: PhasedPlan = {
    wave1: { providers: 0, month: 1 },
    wave2: { providers: 0, month: 4 },
    wave3: { providers: 0, month: 7 },
  };

  return {
    targetProviders: baseline.providers,
    rolloutType: "phased",
    phasedPlan: defaultPhasedPlan,
    pricingModel: "per-provider",
    enterpriseCost: null,
    driverValidations: {} as Record<LeverId, DriverValidation>,
  };
}

export function ExpansionCalculator({
  careSetting,
  inputs,
  results,
  onBack,
  onSave,
}: ExpansionCalculatorProps) {
  const [currentStep, setCurrentStep] = useState(1);
  
  const baselineData = createBaselineData(inputs, results);
  
  const [expansionInputs, setExpansionInputs] = useState<ExpansionInputs>(
    () => createInitialExpansionInputs(baselineData)
  );

  const updateInputs = (updates: Partial<ExpansionInputs>) => {
    setExpansionInputs((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSave = (expansionResults: ExpansionResults) => {
    onSave(expansionResults, expansionInputs);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between gap-2">
          {STEP_LABELS.map((label, index) => {
            const stepNum = index + 1;
            const isActive = currentStep >= stepNum;
            const isComplete = currentStep > stepNum;

            return (
              <div key={stepNum} className="flex items-center flex-1 last:flex-initial">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-colors ${
                      isComplete
                        ? "bg-[#0E9F6E] text-white"
                        : isActive
                        ? "bg-[#F03319] text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                    data-testid={`step-indicator-${stepNum}`}
                  >
                    {isComplete ? <Check className="h-5 w-5" /> : stepNum}
                  </div>
                  <span
                    className={`text-xs font-medium text-center whitespace-nowrap ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {index < STEP_LABELS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mt-[-20px] ${
                      currentStep > stepNum ? "bg-[#0E9F6E]" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-4">
          {currentStep === 1 && (
            <Step1_BaselineReview
              baseline={baselineData}
              careSetting={careSetting}
              onContinue={nextStep}
              onBack={onBack}
            />
          )}

          {currentStep === 2 && (
            <Step2_ExpansionPlan
              baseline={baselineData}
              inputs={expansionInputs}
              onUpdate={updateInputs}
              onContinue={nextStep}
              onBack={prevStep}
            />
          )}

          {currentStep === 3 && (
            <Step3_RealityCheck
              baseline={baselineData}
              inputs={expansionInputs}
              careSetting={careSetting}
              onUpdate={updateInputs}
              onContinue={nextStep}
              onBack={prevStep}
            />
          )}

          {currentStep === 4 && (
            <Step4_MaturityModel
              baseline={baselineData}
              inputs={expansionInputs}
              onBack={prevStep}
              onSave={handleSave}
            />
          )}
        </div>
      </div>
    </div>
  );
}
