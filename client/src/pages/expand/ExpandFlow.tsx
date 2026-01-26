import { useState, useCallback } from "react";
import { PageTransition } from "@/components/PageTransition";
import { BrandedLoadingOverlay } from "@/components/BrandedLoadingOverlay";
import ExpandSettingSelection from "./ExpandSettingSelection";
import ExpandDeploymentSetup from "./ExpandDeploymentSetup";
import ExpandDataEntry from "./ExpandDataEntry";
import ExpandValueConfiguration from "./ExpandValueConfiguration";
import ExpandResults from "./ExpandResults";
import { type ValueConfigData, EXPAND_ROI_DEFAULTS } from "@/lib/expandRoiCalculator";

// ============================================================================
// TYPES
// ============================================================================

export type DataEntryMode = "simple" | "detailed";
export type MetricEntryMode = "quick" | "trend";

export interface DeploymentData {
  setting: "outpatient" | "ed" | "inpatient" | "nursing";
  providers: number | null;
  annualEncounters: number | null;
  utilizationRate: number | null;
  monthsOnAbridge: number | null;
  dataEntryMode: DataEntryMode;
}

// Per-metric entry modes (quick = before/after, trend = monthly data)
export interface MetricEntryModes {
  wrvuCapture: MetricEntryMode;
  timeSavings: MetricEntryMode;
  chartClosure: MetricEntryMode;
  levelOfService: MetricEntryMode;
  workOutsideWork: MetricEntryMode;
  clinicianSatisfaction: MetricEntryMode;
}

// Trend data entry for monthly values
export interface TrendDataEntry {
  baseline: number | null;
  monthlyData: (number | null)[];
}

// Trend data for all metrics
export interface MetricTrendData {
  wrvuCapture: TrendDataEntry;
  timeSavings: TrendDataEntry;
  chartClosure: TrendDataEntry;
  levelOfService: TrendDataEntry;
  workOutsideWork: TrendDataEntry;
  clinicianSatisfaction: TrendDataEntry;
}

// Track which metrics have trend data enabled
export interface MetricEntryModeState {
  wrvuCapture: "quick" | "trend";
  timeSavings: "quick" | "trend";
  chartClosure: "quick" | "trend";
  levelOfService: "quick" | "trend";
  workOutsideWork: "quick" | "trend";
  clinicianSatisfaction: "quick" | "trend";
}

export interface TimelineDataPoint {
  month: number;
  value: number | null;
  label: string;
}

export interface TimelineData {
  timeSavings: TimelineDataPoint[];
  workOutsideWork: TimelineDataPoint[];
  wrvuCapture: TimelineDataPoint[];
  clinicianSatisfaction: TimelineDataPoint[];
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
  averageBefore: number | null;
  averageAfter: number | null;
  useDetailed: boolean;
}

export interface WrvuCaptureData {
  before: number | null;
  after: number | null;
}

export interface ChartClosureData {
  before: { within24: number; "24to48": number; "48to72": number; over72: number };
  after: { within24: number; "24to48": number; "48to72": number; over72: number };
  sameDayBefore: number | null;
  sameDayAfter: number | null;
  useDetailed: boolean;
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
// EXPAND FLOW MAIN COMPONENT (5 Steps)
// 1. Setting Selection
// 2. Deployment Setup  
// 3. Data Entry
// 4. Value Configuration
// 5. Your Results (consolidated)
// ============================================================================

export default function ExpandFlow({ onBackToJourney, onGoToExplore }: ExpandFlowProps = {}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  
  // Deployment configuration - starts BLANK
  const [deploymentData, setDeploymentData] = useState<DeploymentData>({
    setting: "outpatient",
    providers: null,
    annualEncounters: null,
    utilizationRate: null,
    monthsOnAbridge: null,
    dataEntryMode: "simple",
  });
  
  // Timeline data for detailed mode
  const [timelineData, setTimelineData] = useState<TimelineData>({
    timeSavings: [],
    workOutsideWork: [],
    wrvuCapture: [],
    clinicianSatisfaction: [],
  });
  
  // Selected metrics to analyze - PRIMARY metrics pre-selected by default
  const [selectedMetrics, setSelectedMetrics] = useState<MetricType[]>([
    "wrvuCapture", 
    "timeSavings", 
    "chartClosure"
  ]);
  
  // Value configuration for tiered ROI calculation
  const [valueConfig, setValueConfig] = useState<ValueConfigData>({
    timeConversionMethod: "none",
    conversionPercent: EXPAND_ROI_DEFAULTS.timeConversionPercent,
    overtimeReduction: null,
    estimateRetention: false,
    departuresPrevented: 0,
    wrvuAttribution: EXPAND_ROI_DEFAULTS.wrvuAttribution,
  });
  
  // Actual metrics data (before/after) - all blank
  // Using Level 1-5 IDs instead of CPT codes for Level of Service
  const [metricsData, setMetricsData] = useState<MetricsData>({
    timeSavings: { before: null, after: null },
    workOutsideWork: { before: null, after: null },
    levelOfService: {
      before: { level5: 0, level4: 0, level3: 0, level2: 0, level1: 0 },
      after: { level5: 0, level4: 0, level3: 0, level2: 0, level1: 0 },
      averageBefore: null,
      averageAfter: null,
      useDetailed: false,
    },
    wrvuCapture: { before: null, after: null },
    chartClosure: { 
      before: { within24: 0, "24to48": 0, "48to72": 0, over72: 0 },
      after: { within24: 0, "24to48": 0, "48to72": 0, over72: 0 },
      sameDayBefore: null,
      sameDayAfter: null,
      useDetailed: false,
    },
    clinicianSatisfaction: { before: null, after: null, recommendRate: null },
  });
  
  // Trend data for each metric (monthly values)
  const [metricTrendData, setMetricTrendData] = useState<MetricTrendData>({
    wrvuCapture: { baseline: null, monthlyData: Array(12).fill(null) },
    timeSavings: { baseline: null, monthlyData: Array(12).fill(null) },
    chartClosure: { baseline: null, monthlyData: Array(12).fill(null) },
    levelOfService: { baseline: null, monthlyData: Array(12).fill(null) },
    workOutsideWork: { baseline: null, monthlyData: Array(12).fill(null) },
    clinicianSatisfaction: { baseline: null, monthlyData: Array(12).fill(null) },
  });
  
  // Track which metrics are using trend entry mode
  const [metricEntryModes, setMetricEntryModes] = useState<MetricEntryModeState>({
    wrvuCapture: "quick",
    timeSavings: "quick",
    chartClosure: "quick",
    levelOfService: "quick",
    workOutsideWork: "quick",
    clinicianSatisfaction: "quick",
  });

  const goNext = () => {
    if (currentStep === 4) {
      setShowLoadingOverlay(true);
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
      window.scrollTo(0, 0);
    }
  };

  const handleLoadingComplete = useCallback(() => {
    setShowLoadingOverlay(false);
    setCurrentStep(5);
    window.scrollTo(0, 0);
  }, []);

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
            timelineData={timelineData}
            setTimelineData={setTimelineData}
            metricTrendData={metricTrendData}
            setMetricTrendData={setMetricTrendData}
            metricEntryModes={metricEntryModes}
            setMetricEntryModes={setMetricEntryModes}
            onNext={goNext}
            onBack={goBack}
            onBackToJourney={goBackToJourney}
          />
        );
      case 4:
        return (
          <ExpandValueConfiguration
            deploymentData={deploymentData}
            selectedMetrics={selectedMetrics}
            metricsData={metricsData}
            valueConfig={valueConfig}
            setValueConfig={setValueConfig}
            onNext={goNext}
            onBack={goBack}
            onBackToJourney={goBackToJourney}
          />
        );
      case 5:
        return (
          <ExpandResults
            deploymentData={deploymentData}
            selectedMetrics={selectedMetrics}
            metricsData={metricsData}
            timelineData={timelineData}
            metricTrendData={metricTrendData}
            metricEntryModes={metricEntryModes}
            valueConfig={valueConfig}
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
      <BrandedLoadingOverlay 
        isVisible={showLoadingOverlay} 
        onComplete={handleLoadingComplete}
      />
      <PageTransition pageKey={`expand-step-${currentStep}`}>
        {renderStep()}
      </PageTransition>
    </div>
  );
}
