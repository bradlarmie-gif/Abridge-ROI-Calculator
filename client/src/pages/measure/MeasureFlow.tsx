import { useState, useCallback, useEffect, Component, type ReactNode, type ErrorInfo } from "react";
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
import MeasureAllocate from "./MeasureAllocate";
import MeasureOpportunity from "./MeasureOpportunity";

class MeasureErrorBoundary extends Component<
  { children: ReactNode; onBack: () => void },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[MeasureErrorBoundary]', error.message, error.stack, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-8">
          <div className="max-w-lg text-center">
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Something went wrong</h2>
            <pre className="text-xs text-left bg-[#F5F0EB] p-4 rounded-lg overflow-auto max-h-60 mb-4 whitespace-pre-wrap">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => { this.setState({ error: null }); this.props.onBack(); }}
              className="px-6 py-2 bg-[#EA2C00] text-white rounded-lg"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

type MeasurePhase = 'data' | 'metrics' | 'journey' | 'financial' | 'next';

interface MeasureFlowProps {
  onBackToJourney?: () => void;
}

export default function MeasureFlow({ onBackToJourney }: MeasureFlowProps) {
  const [phase, setPhase] = useState<MeasurePhase>('data');
  const [presentMode, setPresentMode] = useState(false);
  const [state, setState] = useState<MeasureState>({
    ...DEFAULT_MEASURE_STATE,
    careSetting: 'outpatient',
    activeCareSettings: ['outpatient'],
    settingData: {
      outpatient: getDefaultOutpatientMetrics(),
      ed: getDefaultMetrics('ed'),
      inpatient: getDefaultMetrics('inpatient'),
      nursing: getDefaultMetrics('nursing'),
    },
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
    const t = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }, 50);
    return () => clearTimeout(t);
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
          onNext={() => { applySettingSync(); navigate('metrics'); }}
          onBack={goHome}
          onHome={goHome}
        />
      );

    case 'metrics':
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
          onNext={() => navigate('financial')}
          onBack={() => navigate('metrics')}
          onHome={goHome}
        />
      );

    case 'financial':
      return (
        <MeasureErrorBoundary onBack={() => navigate('journey')}>
          <MeasureAllocate
            state={state}
            updateState={updateState}
            onNext={() => navigate('next')}
            onBack={() => navigate('journey')}
            onHome={goHome}
          />
        </MeasureErrorBoundary>
      );

    case 'next':
      return (
        <MeasureOpportunity
          state={state}
          updateState={updateState}
          onBack={() => navigate('financial')}
          onHome={goHome}
        />
      );
    
    default:
      return null;
  }
}
