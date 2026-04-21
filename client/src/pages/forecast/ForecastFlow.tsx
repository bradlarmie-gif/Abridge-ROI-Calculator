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
import { convertMeasureToForecast } from "@/lib/measureToForecast";
import { decodeStateFromUrl as decodeMeasureState } from "@/lib/measureUrlState";
import { useToast } from "@/hooks/use-toast";
import ForecastStart from "./ForecastStart";
import ForecastBaseline from "./ForecastBaseline";
import ForecastContract from "./ForecastContract";
import ForecastDashboard from "./ForecastDashboard";

export type ForecastPhase = "start" | "baseline" | "contract" | "results";

const MEASURE_HANDOFF_KEY = "abridge_measure_to_forecast_v1";

export const FORECAST_SETUP_STEPS: Array<{ phase: ForecastPhase; label: string }> = [
  { phase: "start", label: "Start" },
  { phase: "baseline", label: "Baseline" },
  { phase: "contract", label: "Contract & Pricing" },
];

interface ForecastFlowProps {
  onBackToJourney?: () => void;
}

export default function ForecastFlow({ onBackToJourney }: ForecastFlowProps) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<ForecastPhase>("start");
  const [state, setState] = useState<ForecastState>(() => getInitialForecastState());

  useEffect(() => {
    if (window.location.search.includes("f=")) {
      clearUrlState();
    }
    // Measure → Forecast handoff via sessionStorage + ?source=measure
    const params = new URLSearchParams(window.location.search);
    if (params.get("source") === "measure") {
      try {
        const raw = sessionStorage.getItem(MEASURE_HANDOFF_KEY);
        if (raw) {
          const decoded = decodeMeasureState(raw);
          if (decoded) {
            const seeded = convertMeasureToForecast(decoded);
            setState({ ...seeded, updatedAt: Date.now() });
            setPhase("baseline");
            toast({
              title: "Imported from Measure",
              description:
                seeded.valueDrivers.length > 0
                  ? `Seeded ${seeded.valueDrivers.length} measured driver${
                      seeded.valueDrivers.length === 1 ? "" : "s"
                    }.`
                  : "Baseline seeded from your Measure session.",
            });
          }
        }
      } catch (err) {
        console.error("Measure handoff failed", err);
      } finally {
        sessionStorage.removeItem(MEASURE_HANDOFF_KEY);
        const url = new URL(window.location.href);
        url.searchParams.delete("source");
        window.history.replaceState({}, "", url.pathname + (url.search || ""));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
