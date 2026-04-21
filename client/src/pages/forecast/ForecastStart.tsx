import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  Download,
  FilePlus,
  FolderOpen,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  type ForecastState,
  makeEmptyForecastState,
} from "./types";
import { listSavedForecasts } from "@/lib/forecastUrlState";
import { decodeStateFromUrl as decodeMeasureState } from "@/lib/measureUrlState";
import { resolveShortLink } from "@/lib/shortLinks";
import { convertMeasureToForecast } from "@/lib/measureToForecast";
import {
  listRecentMeasureSessions,
  decodeMeasureSession,
  type MeasureSessionEntry,
} from "@/lib/measureSessionsRegistry";
import type { SavedForecast } from "./types";

interface ForecastStartProps {
  state: ForecastState;
  updateState: (updates: Partial<ForecastState>) => void;
  replaceState: (next: ForecastState) => void;
  resetState: () => void;
  onNext: () => void;
  onHome: () => void;
}

const FORECAST_STEP_LABELS = ["Start", "Baseline", "Contract & Pricing"];

export default function ForecastStart({
  state,
  updateState,
  replaceState,
  resetState,
  onNext,
  onHome,
}: ForecastStartProps) {
  const { toast } = useToast();
  const [importOpen, setImportOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [shortLink, setShortLink] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  const savedForecasts = useMemo<SavedForecast[]>(() => listSavedForecasts(), [savedOpen]);
  const recentMeasureSessions = useMemo<MeasureSessionEntry[]>(
    () => listRecentMeasureSessions(),
    [importOpen],
  );

  const handleStartFromScratch = () => {
    const fresh = makeEmptyForecastState();
    fresh.partnerName = state.partnerName;
    fresh.partnerNotes = state.partnerNotes;
    fresh.importSource = { type: "scratch" };
    replaceState(fresh);
    onNext();
  };

  const seedFromMeasureState = (
    measurePayload: ReturnType<typeof decodeMeasureState>,
    sourceLabel: string,
  ) => {
    if (!measurePayload) {
      toast({
        title: "Couldn't read Measure session",
        description: "The link or session may be from an older version.",
        variant: "destructive",
      });
      return false;
    }
    const seeded = convertMeasureToForecast(measurePayload);
    seeded.partnerNotes = state.partnerNotes;
    if (state.partnerName && !seeded.partnerName) seeded.partnerName = state.partnerName;
    replaceState(seeded);
    toast({
      title: "Imported from Measure",
      description:
        seeded.valueDrivers.length > 0
          ? `${sourceLabel} · ${seeded.valueDrivers.length} measured driver${
              seeded.valueDrivers.length === 1 ? "" : "s"
            }`
          : `${sourceLabel} · baseline seeded`,
    });
    return true;
  };

  const handleResolveShortLink = async () => {
    if (!shortLink.trim()) {
      toast({
        title: "Paste a Measure link",
        description: "We'll resolve it and seed your forecast.",
        variant: "destructive",
      });
      return;
    }
    setIsResolving(true);
    try {
      const resolved = await resolveShortLink(shortLink.trim());
      if (resolved.paramKey !== "measure_state") {
        toast({
          title: "That's not a Measure link",
          description: `Expected measure_state, got ${resolved.paramKey}.`,
          variant: "destructive",
        });
        return;
      }
      const decoded = decodeMeasureState(resolved.payload);
      if (seedFromMeasureState(decoded, "Resolved from short link")) {
        setImportOpen(false);
        setShortLink("");
        onNext();
      }
    } catch (err) {
      toast({
        title: "Couldn't resolve link",
        description: err instanceof Error ? err.message : "Please check the URL.",
        variant: "destructive",
      });
    } finally {
      setIsResolving(false);
    }
  };

  const handleLoadRecentMeasure = (entry: MeasureSessionEntry) => {
    const decoded = decodeMeasureSession(entry);
    if (seedFromMeasureState(decoded, entry.partnerName)) {
      setImportOpen(false);
      onNext();
    }
  };

  const handleLoadSaved = (saved: SavedForecast) => {
    replaceState(saved.state);
    setSavedOpen(false);
    toast({
      title: "Loaded saved forecast",
      description: saved.name,
    });
    onNext();
  };

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="forecast"
        currentStep={1}
        totalSteps={3}
        stepName="Start"
        onBack={onHome}
        onHome={onHome}
        stepLabels={FORECAST_STEP_LABELS}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 md:pt-12 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-10 md:mb-14"
        >
          <p
            className="text-[11px] uppercase font-medium text-[#EA2C00] mb-3"
            style={{ letterSpacing: "2.5px" }}
          >
            Forecast
          </p>
          <h1
            className="text-3xl md:text-5xl font-bold text-[#1A1A1A] font-abridge uppercase mb-4"
            style={{ letterSpacing: "0.02em" }}
          >
            Model the road ahead
          </h1>
          <p className="text-base md:text-lg text-[#666666] max-w-2xl leading-relaxed">
            Forward-model an existing partner&apos;s ROI under different pricing
            structures, adoption curves, and contract terms. Start from a Measure
            session, a saved forecast, or a clean slate.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="bg-[#F5F0EB] rounded-xl p-5 md:p-6 mb-10 grid gap-4 md:grid-cols-2"
          data-testid="forecast-partner-context"
        >
          <div>
            <label
              htmlFor="forecast-partner-name"
              className="block text-[11px] uppercase font-medium text-[#666666] mb-2"
              style={{ letterSpacing: "1.5px" }}
            >
              Partner name
            </label>
            <Input
              id="forecast-partner-name"
              value={state.partnerName}
              onChange={(e) => updateState({ partnerName: e.target.value })}
              placeholder="e.g. Memorial Health System"
              className="bg-white border-neutral-200"
              data-testid="input-forecast-partner-name"
            />
          </div>
          <div>
            <label
              htmlFor="forecast-notes"
              className="block text-[11px] uppercase font-medium text-[#666666] mb-2"
              style={{ letterSpacing: "1.5px" }}
            >
              Internal context (optional)
            </label>
            <Textarea
              id="forecast-notes"
              value={state.partnerNotes}
              onChange={(e) => updateState({ partnerNotes: e.target.value })}
              placeholder="Renewal context, pricing pressure, expansion appetite…"
              rows={2}
              className="bg-white border-neutral-200 resize-none"
              data-testid="input-forecast-notes"
            />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          <EntryCard
            index={0}
            icon={<Download className="w-6 h-6 text-[#EA2C00]" />}
            tagline="From a measured baseline"
            title="Import from Measure"
            description="Pull providers, encounters, and confirmed value from an existing Measure session, then forecast forward."
            cta="Paste a Measure link"
            onClick={() => setImportOpen(true)}
            testId="card-forecast-import"
          />
          <EntryCard
            index={1}
            icon={<FilePlus className="w-6 h-6 text-[#EA2C00]" />}
            tagline="Pricing exploration"
            title="Start from scratch"
            description="Begin with a clean slate. Configure care settings, adoption, and pricing yourself."
            cta="New forecast"
            onClick={handleStartFromScratch}
            testId="card-forecast-scratch"
          />
          <EntryCard
            index={2}
            icon={<FolderOpen className="w-6 h-6 text-[#EA2C00]" />}
            tagline="Pick up where you left off"
            title="Load saved Forecast"
            description={
              savedForecasts.length > 0
                ? `${savedForecasts.length} saved scenario${savedForecasts.length === 1 ? "" : "s"} on this device.`
                : "Saved forecasts on this device will show up here."
            }
            cta={savedForecasts.length > 0 ? "Open library" : "No saved forecasts yet"}
            onClick={() => setSavedOpen(true)}
            disabled={savedForecasts.length === 0}
            testId="card-forecast-saved"
          />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 flex items-center justify-between gap-4 pt-6 border-t border-neutral-100"
        >
          <p className="text-xs text-neutral-400">
            Internal Abridge tool · forecasts are saved to this browser only.
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              resetState();
              toast({
                title: "Forecast reset",
                description: "Starting from a clean state.",
              });
            }}
            className="text-xs text-neutral-500"
            data-testid="button-forecast-reset"
          >
            Reset session
          </Button>
        </motion.div>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import from Measure</DialogTitle>
            <DialogDescription>
              Paste a Measure link or select from a recent session on this
              device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label
                htmlFor="forecast-shortlink"
                className="block text-[11px] uppercase font-medium text-[#666666] mb-2"
                style={{ letterSpacing: "1.5px" }}
              >
                Short link
              </label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-md px-3">
                  <LinkIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  <Input
                    id="forecast-shortlink"
                    value={shortLink}
                    onChange={(e) => setShortLink(e.target.value)}
                    placeholder="https://…/s/abc123"
                    className="border-0 bg-transparent px-0 focus-visible:ring-0"
                    data-testid="input-forecast-shortlink"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-md border border-neutral-200 p-3">
              <p className="text-[11px] uppercase font-medium text-[#666666] mb-2" style={{ letterSpacing: "1.5px" }}>
                Recent Measure sessions
              </p>
              {recentMeasureSessions.length === 0 ? (
                <p className="text-xs text-neutral-400 py-2 text-center">
                  None on this device yet — open a Measure session and we'll list it here.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {recentMeasureSessions.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => handleLoadRecentMeasure(entry)}
                      className="w-full text-left bg-white hover:bg-neutral-50 border border-neutral-200 rounded px-3 py-2 transition-colors group flex items-center justify-between gap-2"
                      data-testid={`row-recent-measure-${entry.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-900 truncate">
                          {entry.partnerName}
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          {entry.settings.join(" · ")} ·{" "}
                          {new Date(entry.savedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-[#EA2C00] transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setImportOpen(false)}
              data-testid="button-forecast-import-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolveShortLink}
              disabled={isResolving}
              className="bg-[#EA2C00] text-white hover:bg-[#C22000]"
              data-testid="button-forecast-import-resolve"
            >
              {isResolving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resolving…
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={savedOpen} onOpenChange={setSavedOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Saved forecasts</DialogTitle>
            <DialogDescription>
              Forecasts are saved to this browser only.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2 max-h-80 overflow-y-auto">
            {savedForecasts.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-8">
                No saved forecasts yet.
              </p>
            ) : (
              savedForecasts.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleLoadSaved(s)}
                  className="w-full text-left bg-white hover:bg-neutral-50 border border-neutral-200 rounded-md px-4 py-3 transition-colors group"
                  data-testid={`row-forecast-saved-${s.id}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {s.name}
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Saved {new Date(s.savedAt).toLocaleString()}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-[#EA2C00] transition-colors" />
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EntryCard({
  index,
  icon,
  tagline,
  title,
  description,
  cta,
  onClick,
  disabled = false,
  testId,
}: {
  index: number;
  icon: React.ReactNode;
  tagline: string;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
  disabled?: boolean;
  testId: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 + index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={disabled ? undefined : { y: -4 }}
      className="h-full"
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`w-full h-full text-left flex flex-col rounded-xl p-7 min-h-[280px] transition-all ${
          disabled
            ? "bg-neutral-50 border border-neutral-100 cursor-not-allowed opacity-70"
            : "bg-[#F5F0EB] hover:bg-[#EDE7E0] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-2"
        }`}
        data-testid={testId}
      >
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-5">
          {icon}
        </div>
        <p className="text-[12px] text-[#EA2C00] font-medium mb-1.5">{tagline}</p>
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-2.5">{title}</h3>
        <p className="text-sm text-[#666666] leading-relaxed flex-1 mb-5">
          {description}
        </p>
        <div
          className={`inline-flex items-center gap-1 text-sm font-medium ${
            disabled ? "text-neutral-400" : "text-[#EA2C00]"
          }`}
        >
          {cta}
          {!disabled && <ChevronRight className="w-4 h-4" />}
        </div>
      </button>
    </motion.div>
  );
}
