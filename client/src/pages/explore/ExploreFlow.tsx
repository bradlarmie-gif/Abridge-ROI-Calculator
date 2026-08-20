import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import ExploreCareSettings from "./ExploreCareSettings";
import ExploreOpportunity from "./ExploreOpportunity";
import ExploreTimeSavings from "./ExploreTimeSavings";

import ExploreCapacity from "./ExploreCapacity";
import ExploreWorkforce from "./ExploreWorkforce";
import ExploreRevenue from "./ExploreRevenue";
import ExploreQuality from "./ExploreQuality";
import ExploreInvestment from "./ExploreInvestment";
import ExploreModel from "./ExploreModel";
import EdCareSetting from "./editorial/EdCareSetting";
import EdRevenue from "./editorial/EdRevenue";
import EdQuality from "./editorial/EdQuality";
import EdPractice from "./editorial/EdPractice";
import EdTimeSavings from "./editorial/EdTimeSavings";
import EdCapacity from "./editorial/EdCapacity";
import EdWorkforce from "./editorial/EdWorkforce";
import EdInvestment from "./editorial/EdInvestment";
import EdModel from "./editorial/EdModel";
import {
  computeCapacityBreakdown,
  computeWorkforceBreakdown,
  computeRevenueBreakdown,
  type PriorQuadrantEntry,
} from "@/lib/exploreQuadrantValues";
import { computeExploreTotals } from "@/lib/exploreDriverCalcs";


// The Explore state model lives in ./exploreState so that non-UI consumers can
// import it without pulling in this flow. Re-exported here so existing imports
// of "@/pages/explore/exploreState" keep resolving.
import {
  type ExploreCareSetting,
  type OtherFinancialBenefitItem,
  type CostDisplacementItem,
  type TimePathScenario,
  type DocPathFocus,
  type TimeDriverInputs,
  type HccPlan,
  type DocQualityInputs,
  type ExploreState,
  type ExplorePhase,
  deriveInpatientMinutesPerAdmission,
  DEFAULT_EXPLORE_STATE,
  resolveExplorePhase,
} from "./exploreState";
export * from "./exploreState";
interface ExploreFlowProps {
  onBackToJourney?: () => void;
  onBackToProforma?: () => void;
  initialCareSetting?: ExploreCareSetting;
  initialPhase?: ExplorePhase;
  initialExploreState?: ExploreState;
  onAddToProforma?: (snapshot: import("@/pages/proforma/proformaTypes").ProformaSettingSnapshot) => void;
  disabledCareSettings?: ExploreCareSetting[];
  onDataRequest?: () => void;
  /** THROWAWAY preview flag (?explorepreview=1): render editorial-brand screens
   * where built, else fall back to the existing (interactive) screen. */
  editorial?: boolean;
  /** Entered pre-seeded (e.g. from the discovery brief): the care setting is
   * already chosen, so the practice step's Back returns to the discovery bridge
   * via onExitToDiscovery instead of re-asking the care setting. */
  lockCareSetting?: boolean;
  onExitToDiscovery?: () => void;
}

export default function ExploreFlow({ onBackToJourney, onBackToProforma, initialCareSetting, initialPhase, initialExploreState, onAddToProforma, disabledCareSettings = [], onDataRequest, editorial = false, lockCareSetting = false, onExitToDiscovery }: ExploreFlowProps) {
  const [phase, setPhase] = useState<ExplorePhase>(() => {
    const requested = initialPhase || (initialExploreState ? 'practice' : 'careSetting');
    return resolveExplorePhase(requested, !!initialExploreState && !!onAddToProforma);
  });
  const [state, setState] = useState<ExploreState>(() => {
    if (initialExploreState) {
      return { ...DEFAULT_EXPLORE_STATE, ...initialExploreState };
    }
    const fresh = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: initialCareSetting || null,
    };
    return fresh;
  });

  const fullScaleManualRef = useRef(false);

  const updateState = useCallback((updates: Partial<ExploreState>) => {
    if ('fullScaleProviders' in updates) {
      fullScaleManualRef.current = true;
    }
    setState(prev => {
      const next = { ...prev, ...updates };
      if (updates.numberOfProviders !== undefined && next.timeDriverInputs.accessProviders > 0) {
        next.timeDriverInputs = {
          ...next.timeDriverInputs,
          accessProviders: Math.min(next.timeDriverInputs.accessProviders, updates.numberOfProviders),
        };
      }
      // Inpatient: minutesSavedPerEncounter is DERIVED from the per-note-type
      // components as a blended minutes-per-admission, so the whole value engine
      // (drivers, proforma, ROI calc, PDF) keeps reading one canonical field.
      // Runs on every inpatient update so ALOS changes on Practice and note-type
      // edits on Time both keep it in sync.
      if (next.careSetting === 'inpatient') {
        next.minutesSavedPerEncounter = deriveInpatientMinutesPerAdmission(next);
      }
      return next;
    });
  }, []);

  const prevCareSettingRef = useRef(state.careSetting);
  useEffect(() => {
    if (state.careSetting && state.careSetting !== prevCareSettingRef.current) {
      const newCareSetting = state.careSetting;
      setState(() => {
        const fresh = { ...DEFAULT_EXPLORE_STATE, careSetting: newCareSetting };
        if (newCareSetting === 'ed') {
          fresh.docQualityInputs = {
            ...fresh.docQualityInputs,
            currentWrvu: 1.8,
            medNecessityDenialRate: 5,
            avgClaimValue: 1200,
          };
        }
        return fresh;
      });
    }
    prevCareSettingRef.current = state.careSetting;
  }, [state.careSetting]);

  const prevBaselineRef = useRef({ providers: state.numberOfProviders, beds: state.nursingStaffedBeds });
  useEffect(() => {
    if (fullScaleManualRef.current) return;
    const baselineCount = state.careSetting === 'nursing' ? state.nursingStaffedBeds : state.numberOfProviders;
    if (baselineCount > 0) {
      setState(prev => ({ ...prev, fullScaleProviders: baselineCount * 2 }));
    }
    prevBaselineRef.current = { providers: state.numberOfProviders, beds: state.nursingStaffedBeds };
  }, [state.numberOfProviders, state.nursingStaffedBeds, state.careSetting]);

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
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view === 'explore' && event.state?.explorePhase) {
        const requested = event.state.explorePhase as string;
        const resolved = resolveExplorePhase(requested, !!initialExploreState && !!onAddToProforma);
        setPhase(resolved);
        window.scrollTo({ top: 0, behavior: 'instant' });
      } else if (event.state?.view === 'journey' || !event.state?.view) {
        if (onBackToProforma) {
          onBackToProforma();
        } else if (onBackToJourney) {
          onBackToJourney();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    const currentState = window.history.state || {};
    if (!currentState.explorePhase || currentState.view !== 'explore') {
      window.history.replaceState({
        ...currentState,
        view: 'explore',
        explorePhase: phase
      }, '');
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [onBackToJourney, onBackToProforma, initialExploreState, onAddToProforma]);

  const goHome = useCallback(() => {
    if (onBackToProforma) {
      onBackToProforma();
    } else if (onBackToJourney) {
      onBackToJourney();
    } else {
      window.location.href = '/';
    }
  }, [onBackToProforma, onBackToJourney]);

  const navigate = useCallback((nextPhase: ExplorePhase) => {
    // When editing an existing proforma setting, the proforma owns deployment/
    // expansion — the Explore "investment" (expansion) page is irrelevant and its
    // output is discarded on merge. Make it unreachable so users can't land on it
    // and think a ramp change there will stick. Redirect to the model summary.
    const target = resolveExplorePhase(nextPhase, !!initialExploreState && !!onAddToProforma);
    setPhase(target);
    window.history.pushState({
      view: 'explore',
      explorePhase: target
    }, '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [initialExploreState, onAddToProforma]);

  // Fast-exit: when editing an existing proforma setting's drivers, let the user
  // commit from any driver screen and jump straight back to the Business Case,
  // skipping the investment + model pages. Routes THROUGH ExploreModel's existing
  // handleAddToProforma (via autoCommitToProforma) so the numbers match the normal flow.
  const isEditingProforma = !!initialExploreState && !!onAddToProforma;
  // "Back to Business Case" should appear whenever we arrived from the proforma —
  // editing an existing setting OR adding a new one — for a consistent escape
  // hatch on every screen. (Expansion-page hiding stays edit-only below.)
  const cameFromProforma = !!onBackToProforma && !!onAddToProforma;
  const [fastExitCommit, setFastExitCommit] = useState(false);
  const fastExitToProforma = useCallback(() => {
    setFastExitCommit(true);
    navigate('model');
  }, [navigate]);

  // Calculate total hours saved
  const totalHoursSaved = useMemo(() => {
    const isNursing = state.careSetting === 'nursing';
    
    if (isNursing) {
      // Nursing uses per-shift model
      const totalShiftsPerYear = state.numberOfProviders * state.nursingShiftsPerNurseYear;
      const eligibleShifts = totalShiftsPerYear * (state.utilizationPercent / 100);
      const totalMinutes = eligibleShifts * state.minutesSavedPerEncounter;
      return Math.round(totalMinutes / 60);
    } else {
      // Other care settings use per-encounter model
      const eligibleEncounters = state.annualEncounters * (state.utilizationPercent / 100);
      const totalMinutes = eligibleEncounters * state.minutesSavedPerEncounter;
      return Math.round(totalMinutes / 60);
    }
  }, [state.careSetting, state.annualEncounters, state.utilizationPercent, state.minutesSavedPerEncounter, state.numberOfProviders, state.nursingShiftsPerNurseYear, state.nursingMinutesPerShift]);

  // Canonical headline totals — same driver engine the Your Model screen, PDF,
  // and proforma use. The Investment screen consumes these so its Total Value
  // and ROI can never diverge from the Model screen (see exploreTotals.test.ts).
  //
  // timeValue/docValue (passed down to ExploreModel) used to be independent
  // re-derivations of this same math — a parallel computation that could
  // (and did) drift from the engine, e.g. the nursing-quality drivers
  // (HAPI/Falls/CAUTI/CLABSI/Sepsis) were never included in the old docValue
  // calc at all. They are now just this total's efficiency/documentation
  // split, so they can't drift (see exploreSnapshotParity.test.ts).
  const exploreTotals = useMemo(
    () => computeExploreTotals(state, totalHoursSaved),
    [state, totalHoursSaved],
  );
  const timeValue = exploreTotals.efficiencyValue;
  const docValue = exploreTotals.documentationValue;

  // Calculate annual investment
  const annualInvestment = useMemo(() => {
    if (state.pricingModel === 'perProvider') {
      const units = state.careSetting === 'nursing' ? state.nursingStaffedBeds : state.numberOfProviders;
      return units * state.costPerProvider * 12;
    }
    if (state.pricingModel === 'perEncounter') {
      return state.annualEncounters * state.costPerEncounter;
    }
    if (state.pricingModel === 'platform') {
      return state.annualLicenseFee + state.annualEncounters * state.platformEncRate;
    }
    return state.annualLicenseFee;
  }, [state.pricingModel, state.numberOfProviders, state.nursingStaffedBeds, state.costPerProvider, state.annualLicenseFee, state.careSetting, state.annualEncounters, state.costPerEncounter, state.platformEncRate]);

  const isNursing = state.careSetting === 'nursing';
  const isED = state.careSetting === 'ed';
  const isInpatient = state.careSetting === 'inpatient';

  let content: React.ReactNode = null;

  switch (phase) {
    case 'careSetting':
      content = editorial ? (
        <EdCareSetting
          selectedSetting={disabledCareSettings.includes(state.careSetting as ExploreCareSetting) ? null : state.careSetting}
          onSelectSetting={(setting: ExploreCareSetting) => {
            if (disabledCareSettings.includes(setting)) return;
            updateState({ careSetting: setting });
          }}
          onNext={() => navigate('practice')}
          onBack={goHome}
          onHome={goHome}
          disabledSettings={disabledCareSettings}
          onDataRequest={onDataRequest}
        />
      ) : (
        <ExploreCareSettings
          selectedSetting={disabledCareSettings.includes(state.careSetting as ExploreCareSetting) ? null : state.careSetting}
          onSelectSetting={(setting: ExploreCareSetting) => {
            if (disabledCareSettings.includes(setting)) return;
            updateState({ careSetting: setting });
          }}
          onNext={() => navigate('practice')}
          onBack={goHome}
          onHome={goHome}
          disabledSettings={disabledCareSettings}
          onDataRequest={onDataRequest}
        />
      );
      break;
    
    case 'practice':
      content = editorial ? (
        <EdPractice
          state={state}
          updateState={updateState}
          onNext={() => navigate('timeSavings')}
          onBack={() => (lockCareSetting && onExitToDiscovery ? onExitToDiscovery() : navigate('careSetting'))}
          onHome={goHome}
          onReturnToBusinessCase={cameFromProforma ? fastExitToProforma : undefined}
        />
      ) : (
        <ExploreOpportunity
          state={state}
          updateState={updateState}
          onNext={() => navigate('timeSavings')}
          onBack={() => (lockCareSetting && onExitToDiscovery ? onExitToDiscovery() : navigate('careSetting'))}
          onHome={goHome}
          onReturnToBusinessCase={cameFromProforma ? fastExitToProforma : undefined}
        />
      );
      break;
    
    case 'timeSavings':
      content = editorial ? (
        <EdTimeSavings
          state={state}
          updateState={updateState}
          onNext={() => {
            navigate('capacity');
          }}
          onBack={() => navigate('practice')}
          onHome={goHome}
          onReturnToBusinessCase={cameFromProforma ? fastExitToProforma : undefined}
        />
      ) : (
        <ExploreTimeSavings
          state={state}
          updateState={updateState}
          onNext={() => {
            navigate('capacity');
          }}
          onBack={() => navigate('practice')}
          onHome={goHome}
          onReturnToBusinessCase={cameFromProforma ? fastExitToProforma : undefined}
        />
      );
      break;
    
    case 'capacity': {
      const priorQuadrants: PriorQuadrantEntry[] = [];
      content = editorial ? (
        <EdCapacity
          state={state}
          updateState={updateState}
          totalHoursSaved={totalHoursSaved}
          priorQuadrants={priorQuadrants}
          onNext={() => navigate('workforce')}
          onBack={() => navigate('timeSavings')}
          onHome={goHome}
          onReturnToBusinessCase={cameFromProforma ? fastExitToProforma : undefined}
        />
      ) : (
        <ExploreCapacity
          state={state}
          updateState={updateState}
          totalHoursSaved={totalHoursSaved}
          priorQuadrants={priorQuadrants}
          onNext={() => navigate('workforce')}
          onBack={() => navigate('timeSavings')}
          onHome={goHome}
          onReturnToBusinessCase={cameFromProforma ? fastExitToProforma : undefined}
        />
      );
      break;
    }
    
    case 'workforce': {
      const capacity = computeCapacityBreakdown(state, totalHoursSaved);
      const priorQuadrants: PriorQuadrantEntry[] = [
        { key: 'capacity', label: 'Capacity', value: capacity.quadrantAnnualTotal },
      ];
      content = editorial ? (
        <EdWorkforce
          state={state}
          updateState={updateState}
          totalHoursSaved={totalHoursSaved}
          priorQuadrants={priorQuadrants}
          onNext={() => navigate('revenue')}
          onBack={() => navigate('capacity')}
          onHome={goHome}
          onReturnToBusinessCase={cameFromProforma ? fastExitToProforma : undefined}
        />
      ) : (
        <ExploreWorkforce
          state={state}
          updateState={updateState}
          totalHoursSaved={totalHoursSaved}
          priorQuadrants={priorQuadrants}
          onNext={() => navigate('revenue')}
          onBack={() => navigate('capacity')}
          onHome={goHome}
          onReturnToBusinessCase={cameFromProforma ? fastExitToProforma : undefined}
        />
      );
      break;
    }
    
    case 'revenue': {
      const capacity = computeCapacityBreakdown(state, totalHoursSaved);
      const workforce = computeWorkforceBreakdown(state, totalHoursSaved);
      const priorQuadrants: PriorQuadrantEntry[] = [
        { key: 'capacity', label: 'Capacity', value: capacity.quadrantAnnualTotal },
        { key: 'workforce', label: 'Workforce', value: workforce.quadrantAnnualTotal },
      ];
      content = editorial ? (
        <EdRevenue
          state={state}
          updateState={updateState}
          totalHoursSaved={totalHoursSaved}
          priorQuadrants={priorQuadrants}
          onNext={() => navigate('quality')}
          onBack={() => navigate('workforce')}
          onHome={goHome}
          onReturnToBusinessCase={cameFromProforma ? fastExitToProforma : undefined}
        />
      ) : (
        <ExploreRevenue
          state={state}
          updateState={updateState}
          totalHoursSaved={totalHoursSaved}
          priorQuadrants={priorQuadrants}
          onNext={() => navigate('quality')}
          onBack={() => navigate('workforce')}
          onHome={goHome}
          onReturnToBusinessCase={cameFromProforma ? fastExitToProforma : undefined}
        />
      );
      break;
    }

    case 'quality': {
      const capacity = computeCapacityBreakdown(state, totalHoursSaved);
      const workforce = computeWorkforceBreakdown(state, totalHoursSaved);
      const revenue = computeRevenueBreakdown(state, totalHoursSaved);
      const priorQuadrants: PriorQuadrantEntry[] = [
        { key: 'capacity', label: 'Capacity', value: capacity.quadrantAnnualTotal },
        { key: 'workforce', label: 'Workforce', value: workforce.quadrantAnnualTotal },
        { key: 'revenue', label: 'Revenue', value: revenue.quadrantAnnualTotal },
      ];
      content = editorial ? (
        <EdQuality
          state={state}
          updateState={updateState}
          totalHoursSaved={totalHoursSaved}
          priorQuadrants={priorQuadrants}
          onNext={() => navigate('investment')}
          onBack={() => navigate('revenue')}
          onHome={goHome}
          onReturnToBusinessCase={cameFromProforma ? fastExitToProforma : undefined}
        />
      ) : (
        <ExploreQuality
          state={state}
          updateState={updateState}
          totalHoursSaved={totalHoursSaved}
          priorQuadrants={priorQuadrants}
          onNext={() => navigate('investment')}
          onBack={() => navigate('revenue')}
          onHome={goHome}
          onReturnToBusinessCase={cameFromProforma ? fastExitToProforma : undefined}
        />
      );
      break;
    }
    
    case 'investment':
      content = editorial ? (
        <EdInvestment
          state={state}
          updateState={updateState}
          totalHoursSaved={totalHoursSaved}
          efficiencyValue={exploreTotals.efficiencyValue}
          documentationValue={exploreTotals.documentationValue}
          onNext={() => navigate('model')}
          onBack={() => navigate('quality')}
          onHome={goHome}
        />
      ) : (
        <ExploreInvestment
          state={state}
          updateState={updateState}
          totalHoursSaved={totalHoursSaved}
          efficiencyValue={exploreTotals.efficiencyValue}
          documentationValue={exploreTotals.documentationValue}
          onNext={() => navigate('model')}
          onBack={() => navigate('quality')}
          onHome={goHome}
        />
      );
      break;
    
    case 'model': {
      const stepPhaseMap: ExplorePhase[] = [
        'careSetting',
        'practice',
        'timeSavings',
        'capacity',
        'workforce',
        'revenue',
        'quality',
        'investment',
        'model',
      ];
      const stepLabels = [
        'Care Setting',
        'Practice',
        'Time Savings',
        'Capacity',
        'Workforce',
        'Revenue',
        'Quality',
        'Investment',
        'Your Model',
      ];
      content = editorial ? (
        <EdModel
          state={state}
          updateState={updateState}
          totalHoursSaved={totalHoursSaved}
          timeValue={timeValue}
          docValue={docValue}
          annualInvestment={annualInvestment}
          onEdit={() => navigate('practice')}
          onBack={() => navigate(isEditingProforma ? 'quality' : 'investment')}
          onHome={goHome}
          onAddToProforma={onAddToProforma}
          onStepClick={(step: number) => navigate(stepPhaseMap[step - 1])}
          stepLabels={stepLabels}
          autoCommitToProforma={fastExitCommit}
        />
      ) : (
        <ExploreModel
          state={state}
          updateState={updateState}
          totalHoursSaved={totalHoursSaved}
          timeValue={timeValue}
          docValue={docValue}
          annualInvestment={annualInvestment}
          onEdit={() => navigate('practice')}
          onBack={() => navigate(isEditingProforma ? 'quality' : 'investment')}
          onHome={goHome}
          onAddToProforma={onAddToProforma}
          onStepClick={(step: number) => navigate(stepPhaseMap[step - 1])}
          stepLabels={stepLabels}
          autoCommitToProforma={fastExitCommit}
        />
      );
      break;
    }
  }

  return <>{content}</>;
}

export { ExploreFlow };
