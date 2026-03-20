import { useState, useCallback, useEffect } from "react";
import { 
  type MeasureState,
  type MeasureCareSetting,
  DEFAULT_MEASURE_STATE,
} from "@/lib/measureCalculator";
import { getStateFromCurrentUrl, clearUrlState } from "@/lib/measureUrlState";
import { getDefaultOutpatientMetrics, getDefaultMetrics, syncSettingToState } from "@/lib/measureCareSettings";
import MeasureDataEntry from "./MeasureDataEntry";
import MeasureMetricSelection from "./MeasureMetricSelection";
import MeasureJourney from "./MeasureJourney";
import MeasureStage from "./MeasureStage";
import MeasureAllocate from "./MeasureAllocate";
import MeasureScenarios from "./MeasureScenarios";
import MeasureOpportunity from "./MeasureOpportunity";
import MeasureStory from "./MeasureStory";

type MeasurePhase = 'data' | 'metricSelection' | 'journey' | 'stage' | 'value' | 'adoption' | 'opportunity' | 'story';

interface MeasureFlowProps {
  onBackToJourney?: () => void;
}

export default function MeasureFlow({ onBackToJourney }: MeasureFlowProps) {
  const [phase, setPhase] = useState<MeasurePhase>('data');
  const [presentMode, setPresentMode] = useState(false);
  const [state, setState] = useState<MeasureState>({
    ...DEFAULT_MEASURE_STATE,
    careSetting: 'outpatient',
    settingData: {
      outpatient: getDefaultOutpatientMetrics(),
      ed: getDefaultMetrics('ed'),
      inpatient: getDefaultMetrics('inpatient'),
      nursing: getDefaultMetrics('nursing'),
    },
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
  }, [phase]);

  useEffect(() => {
    const urlState = getStateFromCurrentUrl();
    if (urlState) {
      setState(urlState);
      setPhase('journey');
      clearUrlState();
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'p' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setPresentMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const updateState = useCallback((updates: Partial<MeasureState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const applySettingSync = useCallback(() => {
    setState(prev => {
      const setting = prev.careSetting || 'outpatient';
      const metrics = prev.settingData[setting];
      if (!metrics) return prev;
      const synced = syncSettingToState(setting, metrics);
      return {
        ...prev,
        timeEfficiency: { ...prev.timeEfficiency, ...synced.timeEfficiency },
        documentationQuality: { ...prev.documentationQuality, ...synced.documentationQuality },
        calibration: { ...prev.calibration, ...synced.calibration },
        allocation: { ...prev.allocation, ...synced.allocation },
      };
    });
  }, []);

  const goHome = useCallback(() => {
    if (onBackToJourney) {
      onBackToJourney();
    } else {
      window.location.href = '/';
    }
  }, [onBackToJourney]);

  const navigate = useCallback((nextPhase: MeasurePhase) => {
    setPhase(nextPhase);
  }, []);

  const mode = presentMode ? 'present' as const : 'build' as const;

  switch (phase) {
    case 'data':
      return (
        <MeasureDataEntry
          state={state}
          updateState={updateState}
          onNext={() => { applySettingSync(); navigate('metricSelection'); }}
          onBack={goHome}
          onHome={goHome}
        />
      );

    case 'metricSelection':
      return (
        <MeasureMetricSelection
          state={state}
          updateState={updateState}
          onNext={() => { applySettingSync(); navigate('journey'); }}
          onBack={() => navigate('data')}
          onHome={goHome}
        />
      );

    case 'journey':
      return (
        <MeasureJourney
          state={state}
          onNext={() => navigate('stage')}
          onBack={() => navigate('metricSelection')}
          onHome={goHome}
          mode={mode}
        />
      );

    case 'stage':
      return (
        <MeasureStage
          state={state}
          onNext={() => navigate('value')}
          onBack={() => navigate('journey')}
          onHome={goHome}
        />
      );

    case 'value':
      return (
        <MeasureAllocate
          state={state}
          updateState={updateState}
          onNext={() => navigate('adoption')}
          onBack={() => navigate('stage')}
          onHome={goHome}
        />
      );

    case 'adoption':
      return (
        <MeasureScenarios
          state={state}
          updateState={updateState}
          onNext={() => navigate('opportunity')}
          onBack={() => navigate('value')}
          onHome={goHome}
        />
      );
    
    case 'opportunity':
      return (
        <MeasureOpportunity
          state={state}
          updateState={updateState}
          onNext={() => navigate('story')}
          onBack={() => navigate('adoption')}
          onHome={goHome}
        />
      );
    
    case 'story':
      return (
        <MeasureStory
          state={state}
          onBack={() => navigate('opportunity')}
          onHome={goHome}
        />
      );
    
    default:
      return null;
  }
}
