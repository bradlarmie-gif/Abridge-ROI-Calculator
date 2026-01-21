import { useState } from "react";
import ExpandSettingSelection from "./ExpandSettingSelection";
import ExpandDeploymentSetup from "./ExpandDeploymentSetup";
import ExpandPerformanceDashboard from "./ExpandPerformanceDashboard";
import ExpandROIStory from "./ExpandROIStory";
import ExpandJourneyExpansion from "./ExpandJourneyExpansion";

// ============================================================================
// TYPES
// ============================================================================

export interface DeploymentData {
  setting: "outpatient" | "ed" | "inpatient" | "nursing";
  providers: number;
  annualEncounters: number;
  utilizationRate: number;
  monthsOnAbridge: number;
}

export interface MetricsData {
  timeSavings: { before: number; after: number };
  levelOfService: {
    before: { [key: string]: number };
    after: { [key: string]: number };
  };
  chartClosure: { before: number; after: number };
  wrvuCapture: { before: number; after: number };
  workAfterHours: { before: number; after: number };
}

export type MetricType = "timeSavings" | "levelOfService" | "chartClosure" | "wrvuCapture" | "workAfterHours";

export interface ExpandFlowProps {
  onBackToJourney?: () => void;
  onGoToExplore?: () => void;
}

// ============================================================================
// EXPAND FLOW MAIN COMPONENT
// ============================================================================

export default function ExpandFlow({ onBackToJourney, onGoToExplore }: ExpandFlowProps = {}) {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Deployment configuration
  const [deploymentData, setDeploymentData] = useState<DeploymentData>({
    setting: "outpatient",
    providers: 150,
    annualEncounters: 195000,
    utilizationRate: 72,
    monthsOnAbridge: 6,
  });
  
  // Selected metrics to analyze
  const [selectedMetrics, setSelectedMetrics] = useState<MetricType[]>([
    "timeSavings",
    "levelOfService",
    "chartClosure",
    "wrvuCapture",
  ]);
  
  // Actual metrics data (before/after)
  const [metricsData, setMetricsData] = useState<MetricsData>({
    timeSavings: { before: 12, after: 4.5 },
    levelOfService: {
      before: { "99215": 35, "99214": 45, "99213": 15, "99212": 4, "99211": 1 },
      after: { "99215": 42, "99214": 44, "99213": 11, "99212": 2, "99211": 1 },
    },
    chartClosure: { before: 36, after: 4.2 },
    wrvuCapture: { before: 1.42, after: 1.49 },
    workAfterHours: { before: 8, after: 4 },
  });

  const goNext = () => setCurrentStep((prev) => Math.min(prev + 1, 5));
  const goBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));
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
          />
        );
      case 3:
        return (
          <ExpandPerformanceDashboard
            deploymentData={deploymentData}
            selectedMetrics={selectedMetrics}
            metricsData={metricsData}
            setMetricsData={setMetricsData}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 4:
        return (
          <ExpandROIStory
            deploymentData={deploymentData}
            metricsData={metricsData}
            selectedMetrics={selectedMetrics}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case 5:
        return (
          <ExpandJourneyExpansion
            deploymentData={deploymentData}
            metricsData={metricsData}
            selectedMetrics={selectedMetrics}
            onBack={goBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      {renderStep()}
    </div>
  );
}
