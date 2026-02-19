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
import MeasureAllocate from "./MeasureAllocate";
import MeasureOpportunity from "./MeasureOpportunity";
import MeasureStory from "./MeasureStory";

type MeasurePhase = 'data' | 'change' | 'value' | 'opportunity' | 'story';

interface MeasureFlowProps {
  onBackToJourney?: () => void;
}

export default function MeasureFlow({ onBackToJourney }: MeasureFlowProps) {
  const [phase, setPhase] = useState<MeasurePhase>('data');
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
          onNext={() => navigate('value')}
          onBack={() => navigate('data')}
          onHome={goHome}
        />
      );
    
    case 'value':
      return (
        <MeasureAllocate
          state={state}
          updateState={updateState}
          onNext={() => navigate('opportunity')}
          onBack={() => navigate('change')}
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
