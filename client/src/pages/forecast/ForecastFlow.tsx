import { useCallback, useEffect, useState } from "react";
import {
  type ForecastState,
  makeEmptyForecastState,
} from "./types";
import {
  clearUrlState,
  getInitialForecastState,
  persistSession,
} from "@/lib/forecastUrlState";
import ForecastStart from "./ForecastStart";
import ForecastBaseline from "./ForecastBaseline";
import ForecastContract from "./ForecastContract";
import ForecastDashboard from "./ForecastDashboard";

export type ForecastPhase = "start" | "baseline" | "contract" | "results";

export const FORECAST_SETUP_STEPS: Array<{ phase: ForecastPhase; label: string }> = [
  { phase: "start", label: "Start" },
  { phase: "baseline", label: "Baseline" },
  { phase: "contract", label: "Contract & Pricing" },
];

interface ForecastFlowProps {
  onBackToJourney?: () => void;
}

export default function ForecastFlow({ onBackToJourney }: ForecastFlowProps) {
  const [phase, setPhase] = useState<ForecastPhase>("start");
  const [state, setState] = useState<ForecastState>(() => getInitialForecastState());

  useEffect(() => {
    if (window.location.search.includes("f=")) {
      clearUrlState();
    }
  }, []);

  useEffect(() => {
    persistSession(state);
  }, [state]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [phase]);

  const updateState = useCallback((updates: Partial<ForecastState>) => {
    setState((prev) => ({ ...prev, ...updates, updatedAt: Date.now() }));
  }, []);

  const replaceState = useCallback((next: ForecastState) => {
    setState({ ...next, updatedAt: Date.now() });
  }, []);

  const resetState = useCallback(() => {
    setState(makeEmptyForecastState());
  }, []);

  const goHome = useCallback(() => {
    if (onBackToJourney) onBackToJourney();
    else window.location.href = "/";
  }, [onBackToJourney]);

  const navigate = useCallback((next: ForecastPhase) => setPhase(next), []);

  switch (phase) {
    case "start":
      return (
        <ForecastStart
          state={state}
          updateState={updateState}
          replaceState={replaceState}
          resetState={resetState}
          onNext={() => navigate("baseline")}
          onHome={goHome}
        />
      );

    case "baseline":
      return (
        <ForecastBaseline
          state={state}
          updateState={updateState}
          onNext={() => navigate("contract")}
          onBack={() => navigate("start")}
          onHome={goHome}
        />
      );

    case "contract":
      return (
        <ForecastContract
          state={state}
          updateState={updateState}
          onNext={() => navigate("results")}
          onBack={() => navigate("baseline")}
          onHome={goHome}
        />
      );

    case "results":
      return (
        <ForecastDashboard
          state={state}
          updateState={updateState}
          replaceState={replaceState}
          onBack={() => navigate("contract")}
          onHome={goHome}
        />
      );

    default:
      return null;
  }
}
