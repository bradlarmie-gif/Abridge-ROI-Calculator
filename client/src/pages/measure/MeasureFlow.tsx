import { useState, useCallback, useEffect } from "react";
import { 
  type MeasureState,
  type MeasureCareSetting,
  DEFAULT_MEASURE_STATE,
} from "@/lib/measureCalculator";
import { getStateFromCurrentUrl, clearUrlState } from "@/lib/measureUrlState";
import MeasureWelcome from "./MeasureWelcome";
import MeasureEffect from "./MeasureEffect";
import MeasureAllocate from "./MeasureAllocate";
import MeasureStory from "./MeasureStory";
import MeasureTrends from "./MeasureTrends";

type MeasurePhase = 'welcome' | 'effect' | 'allocate' | 'story' | 'trends';

interface MeasureFlowProps {
  onBackToJourney?: () => void;
}

export default function MeasureFlow({ onBackToJourney }: MeasureFlowProps) {
  const [phase, setPhase] = useState<MeasurePhase>('welcome');
  const [state, setState] = useState<MeasureState>(DEFAULT_MEASURE_STATE);
  const [isLoadedFromUrl, setIsLoadedFromUrl] = useState(false);

  // Load state from URL on mount
  useEffect(() => {
    const urlState = getStateFromCurrentUrl();
    if (urlState) {
      setState(urlState);
      setIsLoadedFromUrl(true);
      // Skip to effect page since data is pre-loaded
      setPhase('effect');
      // Clean the URL
      clearUrlState();
    }
  }, []);

  const updateState = useCallback((updates: Partial<MeasureState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSelectCareSetting = useCallback((setting: MeasureCareSetting) => {
    updateState({ careSetting: setting });
  }, [updateState]);

  const goHome = useCallback(() => {
    if (onBackToJourney) {
      onBackToJourney();
    } else {
      window.location.href = '/';
    }
  }, [onBackToJourney]);

  const navigate = useCallback((nextPhase: MeasurePhase) => {
    setPhase(nextPhase);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  switch (phase) {
    case 'welcome':
      return (
        <MeasureWelcome
          selectedSetting={state.careSetting}
          onSelectSetting={handleSelectCareSetting}
          onNext={() => navigate('effect')}
          onBack={goHome}
          onHome={goHome}
        />
      );
    
    case 'effect':
      return (
        <MeasureEffect
          state={state}
          updateState={updateState}
          onNext={() => navigate('allocate')}
          onBack={() => navigate('welcome')}
          onViewTrends={() => navigate('trends')}
          onHome={goHome}
        />
      );
    
    case 'allocate':
      return (
        <MeasureAllocate
          state={state}
          updateState={updateState}
          onNext={() => navigate('story')}
          onBack={() => navigate('effect')}
          onHome={goHome}
        />
      );
    
    case 'story':
      return (
        <MeasureStory
          state={state}
          onBack={() => navigate('allocate')}
          onHome={goHome}
        />
      );
    
    case 'trends':
      return (
        <MeasureTrends
          state={state}
          onBack={() => navigate('effect')}
          onHome={goHome}
        />
      );
    
    default:
      return null;
  }
}
