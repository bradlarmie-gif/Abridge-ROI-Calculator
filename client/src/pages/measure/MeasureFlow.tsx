import { useState, useCallback, useEffect, Component, type ReactNode, type ErrorInfo } from "react";
import { 
  type MeasureState,
  type MeasureCareSetting,
  DEFAULT_MEASURE_STATE,
} from "@/lib/measureCalculator";
import { getStateFromCurrentUrl, clearUrlState } from "@/lib/measureUrlState";
import { getDefaultOutpatientMetrics, getDefaultMetrics, syncSettingToState } from "@/lib/measureCareSettings";
import MeasureDataEntry from "./MeasureDataEntry";
import MeasureCapacity from "./MeasureCapacity";
import MeasureWorkforce from "./MeasureWorkforce";
import MeasureRevenue from "./MeasureRevenue";
import MeasureQuality from "./MeasureQuality";
import MeasureForecast from "./MeasureForecast";
import MeasureOutput from "./MeasureOutput";

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

type MeasurePhase =
  | 'setup'
  | 'capacity'
  | 'workforce'
  | 'revenue'
  | 'quality'
  | 'forecast'
  | 'output';

const LEGACY_PHASE_MAP: Record<string, MeasurePhase> = {
  data: 'setup',
  metrics: 'capacity',
  journey: 'capacity',
  financial: 'forecast',
  next: 'output',
};

const phaseToStep: Record<MeasurePhase, number> = {
  setup: 1,
  capacity: 2,
  workforce: 3,
  revenue: 4,
  quality: 5,
  forecast: 6,
  output: 7,
};

function migratePhase(requested: string | undefined | null): MeasurePhase {
  const value = requested || 'setup';
  const mapped = (LEGACY_PHASE_MAP[value] ?? value) as MeasurePhase;
  return mapped in phaseToStep ? mapped : 'setup';
}

interface MeasureFlowProps {
  onBackToJourney?: () => void;
  initialPhase?: string;
}

export default function MeasureFlow({ onBackToJourney, initialPhase }: MeasureFlowProps) {
  const [phase, setPhase] = useState<MeasurePhase>(() => migratePhase(initialPhase));
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

  // Sprint 3A no longer renders the per-phase progress bar; placeholder pages
  // own their own headers. Keep the mapping exported via reference for
  // upcoming sprints that re-introduce a global progress strip.
  void phaseToStep;

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
      // Old URLs landed users on the journey page — that becomes capacity now.
      setPhase(migratePhase('journey'));
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
  void mode;

  switch (phase) {
    case 'setup':
      return (
        <MeasureDataEntry
          state={state}
          updateState={updateState}
          onNext={() => { applySettingSync(); navigate('capacity'); }}
          onBack={onBackToJourney || (() => {})}
          onHome={goHome}
        />
      );

    case 'capacity':
      return (
        <MeasureErrorBoundary onBack={() => navigate('setup')}>
          <MeasureCapacity
            state={state}
            updateState={updateState}
            onNext={() => navigate('workforce')}
            onBack={() => navigate('setup')}
            onHome={goHome}
          />
        </MeasureErrorBoundary>
      );

    case 'workforce':
      return (
        <MeasureErrorBoundary onBack={() => navigate('capacity')}>
          <MeasureWorkforce
            state={state}
            updateState={updateState}
            onNext={() => navigate('revenue')}
            onBack={() => navigate('capacity')}
            onHome={goHome}
          />
        </MeasureErrorBoundary>
      );

    case 'revenue':
      return (
        <MeasureErrorBoundary onBack={() => navigate('workforce')}>
          <MeasureRevenue
            state={state}
            updateState={updateState}
            onNext={() => navigate('quality')}
            onBack={() => navigate('workforce')}
            onHome={goHome}
          />
        </MeasureErrorBoundary>
      );

    case 'quality':
      return (
        <MeasureErrorBoundary onBack={() => navigate('revenue')}>
          <MeasureQuality
            state={state}
            updateState={updateState}
            onNext={() => navigate('forecast')}
            onBack={() => navigate('revenue')}
            onHome={goHome}
          />
        </MeasureErrorBoundary>
      );

    case 'forecast':
      return (
        <MeasureErrorBoundary onBack={() => navigate('quality')}>
          <MeasureForecast
            state={state}
            updateState={updateState}
            onNext={() => navigate('output')}
            onBack={() => navigate('quality')}
            onHome={goHome}
          />
        </MeasureErrorBoundary>
      );

    case 'output':
      return (
        <MeasureErrorBoundary onBack={() => navigate('forecast')}>
          <MeasureOutput
            state={state}
            updateState={updateState}
            onNext={() => {}}
            onBack={() => navigate('setup')}
            onHome={goHome}
          />
        </MeasureErrorBoundary>
      );

    default:
      return null;
  }
}
