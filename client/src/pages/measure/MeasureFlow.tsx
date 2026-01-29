import { useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { 
  type MeasureState,
  type DeploymentData,
  type MetricSelection,
  type MetricKey,
  type TimeAllocation,
  getDefaultMeasureState,
  hasOperationalEfficiencyMetrics,
  getSelectedMetricDefinitions,
} from "@/lib/measureCalculator";
import MeasureWelcome from "./MeasureWelcome";
import MeasureDeployment from "./MeasureDeployment";
import MeasureMetrics from "./MeasureMetrics";
import MeasureDocument from "./MeasureDocument";
import MeasureAllocate from "./MeasureAllocate";
import MeasureStory from "./MeasureStory";

type MeasurePhase = 'welcome' | 'deployment' | 'metrics' | 'document' | 'allocate' | 'story' | 'expand';

export default function MeasureFlow() {
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<MeasurePhase>('welcome');
  const [state, setState] = useState<MeasureState>(getDefaultMeasureState());

  const updateDeployment = useCallback(<K extends keyof DeploymentData>(key: K, value: DeploymentData[K]) => {
    setState(prev => ({
      ...prev,
      deployment: { ...prev.deployment, [key]: value }
    }));
  }, []);

  const updateMetric = useCallback((key: MetricKey, value: boolean) => {
    setState(prev => ({
      ...prev,
      selectedMetrics: { ...prev.selectedMetrics, [key]: value }
    }));
  }, []);

  const updateMetricData = useCallback((key: string, field: 'before' | 'after', value: number | null) => {
    setState(prev => ({
      ...prev,
      metricData: {
        ...prev.metricData,
        [key]: { ...prev.metricData[key as keyof typeof prev.metricData], [field]: value }
      }
    }));
  }, []);

  const updateTimeAllocation = useCallback((allocation: TimeAllocation) => {
    setState(prev => ({
      ...prev,
      timeAllocation: allocation
    }));
  }, []);

  const goHome = useCallback(() => {
    setLocation('/');
  }, [setLocation]);

  const shouldShowAllocate = useMemo(() => 
    hasOperationalEfficiencyMetrics(state.selectedMetrics),
    [state.selectedMetrics]
  );

  const handleNextFromDocument = useCallback(() => {
    if (shouldShowAllocate) {
      setPhase('allocate');
    } else {
      setPhase('story');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [shouldShowAllocate]);

  const handleBackFromAllocate = useCallback(() => {
    setPhase('document');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBackFromStory = useCallback(() => {
    if (shouldShowAllocate) {
      setPhase('allocate');
    } else {
      setPhase('document');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [shouldShowAllocate]);

  const navigate = useCallback((nextPhase: MeasurePhase) => {
    setPhase(nextPhase);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  switch (phase) {
    case 'welcome':
      return (
        <MeasureWelcome
          onNext={() => navigate('deployment')}
          onBack={goHome}
        />
      );
    
    case 'deployment':
      return (
        <MeasureDeployment
          deployment={state.deployment}
          updateDeployment={updateDeployment}
          onNext={() => navigate('metrics')}
          onBack={() => navigate('welcome')}
          onHome={goHome}
        />
      );
    
    case 'metrics':
      return (
        <MeasureMetrics
          selectedMetrics={state.selectedMetrics}
          updateMetric={updateMetric}
          onNext={() => navigate('document')}
          onBack={() => navigate('deployment')}
          onHome={goHome}
        />
      );
    
    case 'document':
      return (
        <MeasureDocument
          state={state}
          updateMetricData={updateMetricData}
          onNext={handleNextFromDocument}
          onBack={() => navigate('metrics')}
          onHome={goHome}
        />
      );
    
    case 'allocate':
      return (
        <MeasureAllocate
          state={state}
          updateTimeAllocation={updateTimeAllocation}
          onNext={() => navigate('story')}
          onBack={handleBackFromAllocate}
          onHome={goHome}
        />
      );
    
    case 'story':
      return (
        <MeasureStory
          state={state}
          onBack={handleBackFromStory}
          onHome={goHome}
          onExpand={() => navigate('expand')}
        />
      );
    
    case 'expand':
      return (
        <MeasureStory
          state={state}
          onBack={() => navigate('story')}
          onHome={goHome}
        />
      );
    
    default:
      return null;
  }
}
