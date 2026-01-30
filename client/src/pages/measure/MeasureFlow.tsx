import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { 
  type MeasureState,
  type MeasureCareSetting,
  DEFAULT_MEASURE_STATE,
} from "@/lib/measureCalculator";
import MeasureWelcome from "./MeasureWelcome";
import MeasureEffect from "./MeasureEffect";
import MeasureAllocate from "./MeasureAllocate";
import MeasureStory from "./MeasureStory";
import MeasureTrends from "./MeasureTrends";

type MeasurePhase = 'welcome' | 'effect' | 'allocate' | 'story' | 'trends';

export default function MeasureFlow() {
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<MeasurePhase>('welcome');
  const [state, setState] = useState<MeasureState>(DEFAULT_MEASURE_STATE);

  const updateState = useCallback((updates: Partial<MeasureState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSelectCareSetting = useCallback((setting: MeasureCareSetting) => {
    updateState({ careSetting: setting });
  }, [updateState]);

  const goHome = useCallback(() => {
    setLocation('/');
  }, [setLocation]);

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
        />
      );
    
    case 'allocate':
      return (
        <MeasureAllocate
          state={state}
          updateState={updateState}
          onNext={() => navigate('story')}
          onBack={() => navigate('effect')}
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
        />
      );
    
    default:
      return null;
  }
}
