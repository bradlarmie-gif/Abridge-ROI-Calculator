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
import ForecastConfigure from "./ForecastConfigure";
import ForecastBuild from "./ForecastBuild";
import ForecastDashboard from "./ForecastDashboard";

export type ForecastPhase = "start" | "configure" | "build" | "dashboard" | "output";

export const FORECAST_SETUP_STEPS: Array<{ phase: ForecastPhase; label: string }> = [
  { phase: "start", label: "Start" },
  { phase: "configure", label: "Configure" },
  { phase: "build", label: "Build scenarios" },
];

interface ForecastFlowProps {
  onBackToJourney?: () => void;
}

export default function ForecastFlow({ onBackToJourney }: ForecastFlowProps) {
  const [phase, setPhase] = useState<ForecastPhase>("start");
  const [state, setState] = useState<ForecastState>(() => getInitialForecastState());

  // Hydrate from URL once on mount, then strip the URL param
  useEffect(() => {
    if (window.location.search.includes("f=")) {
      clearUrlState();
    }
  }, []);

  // Persist whenever state changes
  useEffect(() => {
    persistSession(state);
  }, [state]);

  // Scroll to top on phase change
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
          onNext={() => navigate("configure")}
          onHome={goHome}
        />
      );

    case "configure":
      return (
        <ForecastConfigure
          state={state}
          updateState={updateState}
          onNext={() => navigate("build")}
          onBack={() => navigate("start")}
          onHome={goHome}
        />
      );

    case "build":
      return (
        <ForecastBuild
          state={state}
          updateState={updateState}
          onNext={() => navigate("dashboard")}
          onBack={() => navigate("configure")}
          onHome={goHome}
        />
      );

    case "dashboard":
    case "output":
      return (
        <ForecastDashboard
          state={state}
          onBack={() => navigate("build")}
          onHome={goHome}
        />
      );

    default:
      return null;
  }
}
