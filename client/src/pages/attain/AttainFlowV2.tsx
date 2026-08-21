import { useEffect, useRef, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import StepVision from "./steps/StepVision";
import StepScope from "./steps/StepScope";
import { SettingStep } from "./preview/AttainFunnel";
import { type ExperienceSlice, type Chapter } from "./preview/MultiCategoryPreview";
import ValueStrategyExperience, { type VSEHandle } from "./valuestrategy/ValueStrategyExperience";
import PlanBuildExperience, { type PlanBuildState } from "./planning/PlanBuildExperience";
import { ATTAIN_MATRIX } from "./preview/attainCells";
import { loadPlanByName, loadSnapshot, saveSnapshot, clearSnapshot, type AttainSnapshot } from "./attainStorage";
import { categoryForGoal, goalDefs } from "@/lib/attain/attainGoals";
import { STRATEGY_GOALS } from "@/lib/attain/valueStrategy";
import type { DiscoveryAnswers } from "@/lib/attain/discovery";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";
import type { AttainBaseline } from "@/lib/attain/attainLevers";

// Re-exported so the reachability test can assert the funnel and the PDF builder
// resolve GoalId→category through the exact same source of truth (no drift).
export { categoryForGoal };

/**
 * THROWAWAY graft target (?attainv2=1). Real funnel + header, then the editorial
 * AttainExperience. The whole plan (funnel choices + every answer + readings + the
 * review log) autosaves to localStorage and restores on load, so it survives refresh
 * and accumulates across quarterly reviews.
 */

const SETTING_LABEL: Record<AttainSetting, string> = { outpatient: "Outpatient", ed: "ED", inpatient: "Inpatient", nursing: "Nursing" };

function cellsFor(setting: AttainSetting, goals: GoalId[]) {
  const label = SETTING_LABEL[setting];
  // Setting-aware resolution: capacity → "Inpatient Capacity" on inpatient, "Nursing Capacity" on
  // nursing, etc. (see attainGoals.categoryForGoal). A hardcoded map here is what orphaned the
  // Inpatient Capacity cell before — no goal could ever resolve to it.
  return goals.map((g) => ATTAIN_MATRIX.find((c) => c.setting === label && c.category === categoryForGoal(setting, g))).filter(Boolean) as typeof ATTAIN_MATRIX;
}

type Phase = "partner" | "setting" | "vision" | "scope" | "experience";

export default function AttainFlowV2({
  onBackToJourney,
  onHome,
  chapters,
  onFinish,
  autoResume,
  flowLabel,
  buildCta,
  experienceLabel,
  mode,
}: {
  onBackToJourney?: () => void;
  // The Abridge logo target: always the top home hub. Falls back to onBackToJourney.
  onHome?: () => void;
  // Value Attainment Hub: mount a SUBSET of chapters. Value Strategy runs
  // ["align","strategy"] and hands off via onFinish; Planning runs
  // ["plan","progress"] and autoResumes the active saved plan (skips the funnel).
  chapters?: Chapter[];
  onFinish?: () => void;
  autoResume?: boolean;
  // "strategy" swaps the experience for the no-dollar Value Attainment Strategy
  // backward-trace build + map (align/strategy). Planning leaves this unset and
  // keeps the shared Plan/Progress engine untouched.
  mode?: "strategy";
  // Copy overrides so the shared Attain engine names itself per hub section.
  // Defaults preserve the combined Attain flow.
  flowLabel?: string; // section label in the header + chapter nav ("Attain" default)
  buildCta?: string; // the funnel's final button ("Build the plan" default)
  experienceLabel?: string; // stepName shown once in the experience ("Your plan" default)
} = {}) {
  // Always open on the name step. We never auto-resume the "active" plan, because that
  // silently assumed the last partner (reopening straight into, say, Mayo Clinic, with no
  // way to start someone new). Instead the partner types a name; if a plan is saved under
  // that exact name, Continue resumes it (see resumeIfExists), otherwise they start fresh.
  const [saved, setSaved] = useState<AttainSnapshot | null>(null);
  const [phase, setPhase] = useState<Phase>("partner");
  const [setting, setSetting] = useState<AttainSetting | null>(null);
  const [goals, setGoals] = useState<GoalId[]>([]);
  const [baseline, setBaseline] = useState<AttainBaseline>({});
  const [partner, setPartner] = useState<string>("");
  const [confirmingReset, setConfirmingReset] = useState(false);
  // Planning's build-walk flips into a Progress/tracking view internally; it
  // reports that up so the header breadcrumb reads "Progress" instead of "Your plan".
  const [planTracking, setPlanTracking] = useState(false);

  // latest experience answers, reported up from AttainExperience; set on resume or as they work
  const expRef = useRef<ExperienceSlice | null>(null);
  // Value Attainment Strategy (mode="strategy"): the discovery interview answers.
  // Held in its own ref so it never touches the Plan/Progress slice.
  const discoveryRef = useRef<DiscoveryAnswers | null>(null);
  // The discovery experience exposes its back() so the header's single Back button
  // steps back through the interview, then exits to the funnel (no double Back).
  const vseRef = useRef<VSEHandle | null>(null);
  // The rebuilt owner-grouped Plan (planning mode) keeps its state in its own ref
  // so it persists to the snapshot without touching the Align/Progress slice.
  const planBuildRef = useRef<PlanBuildState | null>(null);

  // Strategy mode is the pre-ROI discovery interview, so it drops the numeric
  // Starting Point step (numbers get agreed later, in the Plan/ROI).
  const PHASES: Phase[] = mode === "strategy"
    ? ["partner", "setting", "vision", "experience"]
    : ["partner", "setting", "vision", "scope", "experience"];

  const buildSnapshot = (): AttainSnapshot => ({
    partner, phase, setting, goals: goals as string[], baseline: baseline as Record<string, number | undefined>,
    pickedByCat: expRef.current?.pickedByCat ?? {},
    playsByCat: expRef.current?.playsByCat ?? {},
    answersByCat: expRef.current?.answersByCat ?? {},
    inputsByCat: expRef.current?.inputsByCat ?? {},
    metricsByCat: expRef.current?.metricsByCat ?? {},
    readingsByCat: expRef.current?.readingsByCat ?? {},
    peopleByCat: expRef.current?.peopleByCat ?? {},
    customsByCat: expRef.current?.customsByCat ?? {},
    cadenceByCat: expRef.current?.cadenceByCat ?? {},
    alignDone: expRef.current?.alignDone ?? [],
    planDone: expRef.current?.planDone ?? [],
    chapter: expRef.current?.chapter,
    catIdx: expRef.current?.catIdx,
    reviewLog: expRef.current?.reviewLog ?? [],
    discovery: discoveryRef.current ?? undefined,
    planBuild: planBuildRef.current ?? undefined,
    savedAt: 0,
  });

  // autosave once a plan actually exists (setting chosen) — not while typing the name on step 1
  useEffect(() => { if (setting) saveSnapshot(buildSnapshot()); /* eslint-disable-next-line */ }, [partner, phase, setting, goals, baseline]);

  const onPersistAnswers = (a: DiscoveryAnswers) => { discoveryRef.current = a; saveSnapshot(buildSnapshot()); };
  const onPersistPlanBuild = (s: PlanBuildState) => { planBuildRef.current = s; saveSnapshot(buildSnapshot()); };

  const startOver = () => {
    clearSnapshot(partner);
    expRef.current = null; discoveryRef.current = null; planBuildRef.current = null; setSaved(null); setConfirmingReset(false);
    setPartner(""); setSetting(null); setGoals([]); setBaseline({}); setPhase("partner");
  };

  // Rehydrate the whole flow from a saved snapshot (used by both the type-the-name resume and the
  // one-click "Resume {name}" on step 1). Restores the partner name too, so the one-click path
  // never asks them to retype it.
  const hydrateFrom = (existing: AttainSnapshot) => {
    expRef.current = existing as unknown as ExperienceSlice;
    discoveryRef.current = existing.discovery ?? null;
    planBuildRef.current = existing.planBuild ?? null;
    setSaved(existing);
    setPartner(existing.partner ?? partner);
    setSetting((existing.setting as AttainSetting) ?? null);
    setGoals((existing.goals as GoalId[]) ?? []);
    setBaseline((existing.baseline as AttainBaseline) ?? {});
    // Resume FORWARD, never back onto this "who's it for" screen. A saved plan can carry
    // phase "partner" (autosave fires if you hit Back to step 1 on a plan that already has a
    // setting), which would make Continue re-land here and read as a dead button. A plan with a
    // setting belongs in the experience, so anything at or before "partner" resumes there.
    const savedIdx = PHASES.indexOf(existing.phase as Phase);
    setPhase(savedIdx > 0 ? PHASES[savedIdx] : "experience");
  };

  // Planning entry (autoResume): skip the funnel and pick up the active saved plan
  // straight in the experience. If there's no active plan, fall through to the
  // partner step so they can resume a saved strategy by name.
  useEffect(() => {
    if (!autoResume) return;
    const active = loadSnapshot();
    if (active?.setting) hydrateFrom(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // typing an existing partner name and continuing resumes that partner's saved plan
  const resumeIfExists = (): boolean => {
    const existing = loadPlanByName(partner);
    if (!existing?.setting) return false;
    hydrateFrom(existing);
    return true;
  };

  const idx = PHASES.indexOf(phase);
  const canContinue = phase === "partner" ? partner.trim().length > 0 : phase === "setting" ? !!setting : phase === "vision" ? goals.length > 0 : true;
  const stepName = phase === "partner" ? "Who it's for" : phase === "setting" ? "Care setting" : phase === "vision" ? "What you're after" : phase === "scope" ? "Starting point" : (mode !== "strategy" && planTracking ? "Progress" : (experienceLabel ?? "Your plan"));

  const goBack = () => {
    // In the discovery interview, the header Back steps back through the questions
    // (and exits to the funnel from the first one) via the experience's handle.
    if (phase === "experience" && mode === "strategy" && vseRef.current) { vseRef.current.back(); return; }
    if (idx > 0) setPhase(PHASES[idx - 1]); else onBackToJourney?.();
  };
  const goNext = () => {
    if (!canContinue) return;
    if (phase === "partner" && resumeIfExists()) return;
    if (idx < PHASES.length - 1) setPhase(PHASES[idx + 1]);
  };

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-[#FFFFFF]">
      <UnifiedHeader
        pathType="attain"
        pathLabel={flowLabel}
        currentStep={idx + 1}
        totalSteps={PHASES.length}
        stepName={stepName}
        onBack={goBack}
        onHome={onHome ?? onBackToJourney ?? (() => setPhase("setting"))}
        rightAction={(partner.trim() || saved) ? (
          <div className="flex items-center gap-3 text-[11px]">
            {/* The planning walk carries its own "Download the plan" (plan-based PDF);
                the old dollar-based header export is retired here. */}
            <span className="hidden md:inline text-[#B4A896] italic whitespace-nowrap">autosaved{partner.trim() ? ` · ${partner.trim()}` : ""}</span>
            <button type="button" onClick={() => setConfirmingReset(true)} className="hidden md:inline-flex items-center gap-1 text-slate-500 hover:text-[#EA2C00] transition-colors"><RotateCcw className="w-3 h-3" /> Start over</button>
          </div>
        ) : undefined}
      />
      {phase === "experience" ? (
        mode === "strategy" ? (
          <><UnifiedHeaderSpacer /><ValueStrategyExperience ref={vseRef} key={partner} setting={setting!} settingLabel={SETTING_LABEL[setting!]} goals={goals} partner={partner} initialAnswers={discoveryRef.current ?? {}} onPersistAnswers={onPersistAnswers} onFinish={onFinish} onExit={() => setPhase("vision")} /></>
        ) : (
          <><UnifiedHeaderSpacer /><PlanBuildExperience key={partner} embedded setting={setting!} goals={goals} partner={partner.trim() || undefined} baseline={baseline} initial={planBuildRef.current ?? undefined} onPersist={onPersistPlanBuild} onTrackingChange={setPlanTracking} onExit={() => setPhase("vision")} /></>
        )
      ) : (
        <><UnifiedHeaderSpacer /><div className={`${phase === "scope" ? "max-w-[1040px]" : "max-w-[760px]"} mx-auto px-6 py-8 md:py-12`}>
          {phase === "partner" && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-3">Step 1 · Start here</p>
              {mode === "strategy" ? (
                <>
                  <h1 className="font-abridge text-[32px] md:text-[42px] text-[#1A1A1A] leading-[1.1] mb-5">Start with the outcome.<br className="hidden md:inline" /> Trace back to what makes it real.</h1>
                  <p className="text-[16px] text-[#4A4A4A] leading-relaxed max-w-[600px] mb-3">Before any ROI or financial model, a value attainment strategy maps how the outcome actually happens: the operating conditions, the decisions, the behaviors, and the dependencies that have to hold for it to land.</p>
                  <p className="text-[16px] text-[#4A4A4A] leading-relaxed max-w-[600px] mb-10">The financial work comes later and proves it. First, who are we building this for?</p>
                </>
              ) : (
                <>
                  <h1 className="font-abridge text-[32px] md:text-[42px] text-[#1A1A1A] leading-[1.1] mb-5">Turn the strategy into a plan<br className="hidden md:inline" /> you can run.</h1>
                  <p className="text-[16px] text-[#4A4A4A] leading-relaxed max-w-[600px] mb-3">This turns the value attainment strategy into an owned, step-by-step plan: the metrics that prove it, the owner on each one, the plays that move them, and the review cadence that keeps it honest.</p>
                  <p className="text-[16px] text-[#4A4A4A] leading-relaxed max-w-[600px] mb-10">You track attainment against it over time. First, who are we building this for?</p>
                </>
              )}
              <label className="block text-[11px] font-bold uppercase tracking-[1.5px] text-[#8C8073] mb-3">Partner or organization</label>
              <input value={partner} onChange={(e) => setPartner(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && canContinue) goNext(); }} placeholder="e.g., Northgate Medical Group" autoFocus className="w-full max-w-[520px] bg-transparent border-0 border-b-2 border-[#E0D9CE] rounded-none px-0 pb-2 font-abridge text-[26px] text-[#1A1A1A] outline-none transition-colors focus:border-[#EA2C00] placeholder:text-[#C4BCB0] placeholder:font-sans placeholder:text-[18px]" />
              {partner.trim() && loadPlanByName(partner)?.setting && <p className="text-[12px] text-[#EA2C00] mt-3">A saved plan for this name will pick up where you left off.</p>}
            </div>
          )}
          {phase === "setting" && <SettingStep selected={setting} onPick={(s) => { setSetting(s); setPhase("vision"); }} />}
          {phase === "vision" && setting && (
            <StepVision
              setting={setting}
              selectedGoals={goals}
              onToggle={(g) => setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))}
              goals={mode === "strategy" ? goalDefs(setting, STRATEGY_GOALS[setting]) : undefined}
              preferOutcome={mode === "strategy"}
            />
          )}
          {phase === "scope" && setting && (
            <StepScope setting={setting} goals={goals} baseline={baseline} onChangeBaseline={(patch) => setBaseline((prev) => ({ ...prev, ...patch }))} />
          )}

          {/* The care-setting step advances on row click (Explore parity), so it
              carries no Continue button; every other funnel step does. */}
          {phase !== "setting" && (
            <div className="mt-10 flex items-center justify-end border-t border-[#E8E2DA] pt-6">
              <button onClick={goNext} disabled={!canContinue} className="inline-flex items-center gap-2 rounded-xl bg-[#EA2C00] text-white text-[14px] font-semibold px-5 py-2.5 hover:bg-[#d12800] disabled:bg-transparent disabled:text-[#B4A896] disabled:border disabled:border-[#E0D9CE] disabled:cursor-not-allowed transition-colors">
                {idx === PHASES.length - 2 ? (buildCta ?? "Build the plan") : "Continue"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div></>
      )}

      {/* Start-over confirm — a small modal so the whole page registers the destructive action */}
      {confirmingReset && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1A1A1A]/30 backdrop-blur-[2px] px-4" onClick={() => setConfirmingReset(false)}>
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E2DA] shadow-2xl w-full max-w-[400px] p-7" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-abridge text-[23px] text-[#1A1A1A] leading-tight mb-2.5">Start over?</h3>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-7">
              This clears {partner.trim() ? <span className="font-semibold text-[#1A1A1A]">{partner.trim()}</span> : "this"}&rsquo;s plan from this device and takes you back to the start. It can&rsquo;t be undone.
            </p>
            <div className="flex justify-end items-center gap-2">
              <button type="button" onClick={() => setConfirmingReset(false)} className="text-[14px] font-semibold text-slate-500 hover:text-slate-800 px-4 py-2.5 rounded-xl transition-colors">Cancel</button>
              <button type="button" onClick={startOver} className="text-[14px] font-semibold text-white bg-[#EA2C00] hover:bg-[#d12800] rounded-xl px-5 py-2.5 transition-colors">Yes, clear it</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
