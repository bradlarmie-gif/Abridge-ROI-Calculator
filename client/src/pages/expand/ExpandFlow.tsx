import { useState } from "react";
import ExpandSettingSelection from "./ExpandSettingSelection";
import ExpandDeploymentSetup from "./ExpandDeploymentSetup";
import ExpandDataEntry from "./ExpandDataEntry";
import ExpandPerformanceDashboard from "./ExpandPerformanceDashboard";
import ExpandROIStory from "./ExpandROIStory";
import ExpandJourneyExpansion from "./ExpandJourneyExpansion";

// ============================================================================
// TYPES
// ============================================================================

export interface DeploymentData {
  setting: "outpatient" | "ed" | "inpatient" | "nursing";
  providers: number | null;
  annualEncounters: number | null;
  utilizationRate: number | null;
  monthsOnAbridge: number | null;
}

export interface TimeSavingsData {
  before: number | null;
  after: number | null;
}

export interface WorkOutsideWorkData {
  before: number | null;
  after: number | null;
}

export interface LevelOfServiceData {
  before: { [code: string]: number };
  after: { [code: string]: number };
}

export interface WrvuCaptureData {
  before: number | null;
  after: number | null;
}

export interface ChartClosureData {
  before: { within24: number; "24to48": number; "48to72": number; over72: number };
  after: { within24: number; "24to48": number; "48to72": number; over72: number };
}

export interface ClinicianSatisfactionData {
  before: number | null;
  after: number | null;
  recommendRate: number | null;
}

export interface MetricsData {
  timeSavings: TimeSavingsData;
  workOutsideWork: WorkOutsideWorkData;
  levelOfService: LevelOfServiceData;
  wrvuCapture: WrvuCaptureData;
  chartClosure: ChartClosureData;
  clinicianSatisfaction: ClinicianSatisfactionData;
}

export type MetricType = 
  | "timeSavings" 
  | "workOutsideWork" 
  | "levelOfService" 
  | "wrvuCapture" 
  | "chartClosure" 
  | "clinicianSatisfaction";

export interface ExpandFlowProps {
  onBackToJourney?: () => void;
  onGoToExplore?: () => void;
}

// ============================================================================
// EXPAND FLOW MAIN COMPONENT (6 Steps)
// ============================================================================

export default function ExpandFlow({ onBackToJourney, onGoToExplore }: ExpandFlowProps = {}) {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Deployment configuration - starts BLANK
  const [deploymentData, setDeploymentData] = useState<DeploymentData>({
    setting: "outpatient",
    providers: null,
    annualEncounters: null,
    utilizationRate: null,
    monthsOnAbridge: null,
  });
  
  // Selected metrics to analyze - NOTHING pre-selected
  const [selectedMetrics, setSelectedMetrics] = useState<MetricType[]>([]);
  
  // Actual metrics data (before/after) - all blank
  // Using Level 1-5 IDs instead of CPT codes for Level of Service
  const [metricsData, setMetricsData] = useState<MetricsData>({
    timeSavings: { before: null, after: null },
    workOutsideWork: { before: null, after: null },
    levelOfService: {
      before: { level5: 0, level4: 0, level3: 0, level2: 0, level1: 0 },
      after: { level5: 0, level4: 0, level3: 0, level2: 0, level1: 0 },
    },
    wrvuCapture: { before: null, after: null },
    chartClosure: { 
      before: { within24: 0, "24to48": 0, "48to72": 0, over72: 0 },
      after: { within24: 0, "24to48": 0, "48to72": 0, over72: 0 },
    },
    clinicianSatisfaction: { before: null, after: null, recommendRate: null },
  });

  const goNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 6));
    window.scrollTo(0, 0);
  };
  const goBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };
  const goBackToJourney = () => onBackToJourney?.();
  const goToExplore = () => onGoToExplore?.();

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ExpandSettingSelection
            onNext={goNext}
            onExplore={goToExplore}
            onBack={goBackToJourney}
          />
        );
      case 2:
        return (
          <ExpandDeploymentSetup
            deploymentData={deploymentData}
            setDeploymentData={setDeploymentData}
            selectedMetrics={selectedMetrics}
            setSelectedMetrics={setSelectedMetrics}
            onNext={goNext}
            onBack={goBack}
            onBackToJourney={goBackToJourney}
          />
        );
      case 3:
        return (
          <ExpandDataEntry
            deploymentData={deploymentData}
            selectedMetrics={selectedMetrics}
            metricsData={metricsData}
            setMetricsData={setMetricsData}
            onNext={goNext}
            onBack={goBack}
            onBackToJourney={goBackToJourney}
          />
        );
      case 4:
        return (
          <ExpandPerformanceDashboard
            deploymentData={deploymentData}
            selectedMetrics={selectedMetrics}
            metricsData={metricsData}
            onNext={goNext}
            onBack={goBack}
            onBackToJourney={goBackToJourney}
          />
        );
      case 5:
        return (
          <ExpandROIStory
            deploymentData={deploymentData}
            metricsData={metricsData}
            selectedMetrics={selectedMetrics}
            onNext={goNext}
            onBack={goBack}
            onBackToJourney={goBackToJourney}
          />
        );
      case 6:
        return (
          <ExpandJourneyExpansion
            deploymentData={deploymentData}
            metricsData={metricsData}
            selectedMetrics={selectedMetrics}
            onBack={goBack}
            onBackToJourney={goBackToJourney}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {renderStep()}
    </div>
  );
}
