import { useState, useCallback, useEffect } from "react";
import { 
  type MeasureState,
  type MeasureCareSetting,
  DEFAULT_MEASURE_STATE,
} from "@/lib/measureCalculator";
import { getStateFromCurrentUrl, clearUrlState } from "@/lib/measureUrlState";
import { getDefaultOutpatientMetrics, getDefaultMetrics } from "@/lib/measureCareSettings";
import MeasureDataEntry from "./MeasureDataEntry";
import MeasureTransformation from "./MeasureTransformation";
import MeasureScenarios from "./MeasureScenarios";
import MeasureAllocate from "./MeasureAllocate";
import MeasureOpportunity from "./MeasureOpportunity";
import MeasureStory from "./MeasureStory";

type MeasurePhase = 'data' | 'change' | 'scenarios' | 'value' | 'opportunity' | 'story';

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
      setPhase('change');
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
          onNext={() => navigate('change')}
          onBack={goHome}
          onHome={goHome}
        />
      );
    
    case 'change':
      return (
        <MeasureTransformation
          state={state}
          onNext={() => navigate('scenarios')}
          onBack={() => navigate('data')}
          onHome={goHome}
          mode={mode}
        />
      );

    case 'scenarios':
      return (
        <MeasureScenarios
          state={state}
          updateState={updateState}
          onNext={() => navigate('value')}
          onBack={() => navigate('change')}
          onHome={goHome}
        />
      );
    
    case 'value':
      return (
        <MeasureAllocate
          state={state}
          updateState={updateState}
          onNext={() => navigate('opportunity')}
          onBack={() => navigate('scenarios')}
          onHome={goHome}
        />
      );
    
    case 'opportunity':
      return (
        <MeasureOpportunity
          state={state}
          updateState={updateState}
          onNext={() => navigate('story')}
          onBack={() => navigate('value')}
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
