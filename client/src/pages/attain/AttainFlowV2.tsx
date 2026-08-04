import { useEffect, useRef, useState } from "react";
import { ArrowRight, RotateCcw, Download } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import StepVision from "./steps/StepVision";
import StepScope from "./steps/StepScope";
import { SettingStep } from "./preview/AttainFunnel";
import { AttainExperience, type ExperienceSlice } from "./preview/MultiCategoryPreview";
import { ATTAIN_MATRIX } from "./preview/attainCells";
import { loadPlanByName, loadSnapshot, saveSnapshot, clearSnapshot, type AttainSnapshot } from "./attainStorage";
import { categoryForGoal } from "@/lib/attain/attainGoals";
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
const PHASES: Phase[] = ["partner", "setting", "vision", "scope", "experience"];

export default function AttainFlowV2({ onBackToJourney }: { onBackToJourney?: () => void } = {}) {
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
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  // latest experience answers, reported up from AttainExperience; set on resume or as they work
  const expRef = useRef<ExperienceSlice | null>(null);

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
    savedAt: 0,
  });

  // autosave once a plan actually exists (setting chosen) — not while typing the name on step 1
  useEffect(() => { if (setting) saveSnapshot(buildSnapshot()); /* eslint-disable-next-line */ }, [partner, phase, setting, goals, baseline]);

  const onPersist = (slice: ExperienceSlice) => { expRef.current = slice; saveSnapshot(buildSnapshot()); };

  // Export the live plan as the real editorial PDF (cover + the case + a spread
  // per category), built from the SAME engine the on-screen numbers use so the
  // download reconciles with what the partner just saw. Never fail silently: a
  // throw inside pdf().toBlob() surfaces a destructive toast so the rep can retry.
  const handleExport = async () => {
    setExporting(true);
    try {
      const mod = await import("./pdf/attainReactPdf");
      await mod.generateAttainPdf(buildSnapshot());
    } catch (err) {
      console.error("Attain PDF export failed:", err);
      // Surface the real reason instead of a generic line, so a failure in the
      // field is self-describing (no DevTools needed to diagnose it).
      const reason = err instanceof Error && err.message ? err.message : "Unknown error";
      toast({ title: "Export failed", description: reason, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const startOver = () => {
    clearSnapshot(partner);
    expRef.current = null; setSaved(null); setConfirmingReset(false);
    setPartner(""); setSetting(null); setGoals([]); setBaseline({}); setPhase("partner");
  };

  // Rehydrate the whole flow from a saved snapshot (used by both the type-the-name resume and the
  // one-click "Resume {name}" on step 1). Restores the partner name too, so the one-click path
  // never asks them to retype it.
  const hydrateFrom = (existing: AttainSnapshot) => {
    expRef.current = existing as unknown as ExperienceSlice;
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

  // typing an existing partner name and continuing resumes that partner's saved plan
  const resumeIfExists = (): boolean => {
    const existing = loadPlanByName(partner);
    if (!existing?.setting) return false;
    hydrateFrom(existing);
    return true;
  };

  // The last plan worked on on this device — offered as a one-click resume on step 1 while the
  // name field is still empty, so a plain reload doesn't force the partner to retype the name.
  const activePlan = phase === "partner" && !partner.trim() ? loadSnapshot() : null;

  const idx = PHASES.indexOf(phase);
  const canContinue = phase === "partner" ? partner.trim().length > 0 : phase === "setting" ? !!setting : phase === "vision" ? goals.length > 0 : true;
  const stepName = phase === "partner" ? "Who it's for" : phase === "setting" ? "Care setting" : phase === "vision" ? "What you're after" : phase === "scope" ? "Starting point" : "Your plan";

  const cells = setting ? cellsFor(setting, goals) : [];

  const goBack = () => { if (idx > 0) setPhase(PHASES[idx - 1]); else onBackToJourney?.(); };
  const goNext = () => {
    if (!canContinue) return;
    if (phase === "partner" && resumeIfExists()) return;
    if (idx < PHASES.length - 1) setPhase(PHASES[idx + 1]);
  };

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-[#FDFCFA]">
      <UnifiedHeader
        pathType="attain"
        currentStep={idx + 1}
        totalSteps={PHASES.length}
        stepName={stepName}
        onBack={goBack}
        onHome={onBackToJourney ?? (() => setPhase("setting"))}
        rightAction={(partner.trim() || saved) ? (
          <div className="flex items-center gap-3 text-[11px]">
            {phase === "experience" && (
              <button type="button" onClick={handleExport} disabled={exporting} data-testid="attain-export-pdf" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E8E2DA] bg-white text-[12px] font-bold text-[#1A1A1A] hover:border-[#1A1A1A] disabled:opacity-50 transition-colors">
                <Download className="w-3.5 h-3.5" strokeWidth={2.25} />
                {exporting ? "Preparing…" : "Export PDF"}
              </button>
            )}
            <span className="hidden md:inline text-[#B4A896] italic whitespace-nowrap">autosaved{partner.trim() ? ` · ${partner.trim()}` : ""}</span>
            <button type="button" onClick={() => setConfirmingReset(true)} className="hidden md:inline-flex items-center gap-1 text-slate-500 hover:text-[#EA2C00] transition-colors"><RotateCcw className="w-3 h-3" /> Start over</button>
          </div>
        ) : undefined}
      />
      {phase === "experience" ? (
        <><UnifiedHeaderSpacer /><AttainExperience key={partner} setting={SETTING_LABEL[setting!]} cells={cells} baseline={baseline} initial={buildSnapshot()} onPersist={onPersist} /></>
      ) : (
        <><UnifiedHeaderSpacer /><div className={`${phase === "scope" ? "max-w-[1040px]" : "max-w-[760px]"} mx-auto px-6 py-8 md:py-12`}>
          {phase === "partner" && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-2">Step 1 · Who's this for?</p>
              <h1 className="font-abridge text-[32px] md:text-[40px] text-[#1A1A1A] leading-tight mb-4">Who are we building this plan for?</h1>
              <p className="text-[15px] text-[#6B6B6B] leading-relaxed max-w-[560px] mb-8">Name the partner or organization. Your plan autosaves under this name on this device, so you can close it and pick it back up here anytime.</p>
              <input value={partner} onChange={(e) => setPartner(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && canContinue) goNext(); }} placeholder="e.g., Northgate Medical Group" autoFocus className="w-full max-w-[520px] bg-transparent border-0 border-b-2 border-[#E0D9CE] rounded-none px-0 pb-2 font-abridge text-[26px] text-[#1A1A1A] outline-none transition-colors focus:border-[#EA2C00] placeholder:text-[#C4BCB0] placeholder:font-sans placeholder:text-[18px]" />
              {partner.trim() && loadPlanByName(partner)?.setting && <p className="text-[12px] text-[#EA2C00] mt-3">A saved plan for this name will pick up where you left off.</p>}
              {activePlan?.setting && activePlan.partner && (
                <div className="mt-8 pt-6 border-t border-[#E8E2DA]">
                  <p className="text-[12px] text-[#8C8C8C] mb-2.5">Or pick up where you left off:</p>
                  <button type="button" onClick={() => hydrateFrom(activePlan)} className="inline-flex items-center gap-2 rounded-xl border border-[#E0D9CE] bg-white text-[14px] font-semibold text-[#1A1A1A] px-5 py-2.5 hover:border-[#1A1A1A] transition-colors">
                    Resume {activePlan.partner} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
          {phase === "setting" && <SettingStep selected={setting} onSelect={setSetting} />}
          {phase === "vision" && setting && (
            <StepVision setting={setting} selectedGoals={goals} onToggle={(g) => setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))} />
          )}
          {phase === "scope" && setting && (
            <StepScope setting={setting} goals={goals} baseline={baseline} onChangeBaseline={(patch) => setBaseline((prev) => ({ ...prev, ...patch }))} />
          )}

          <div className="mt-10 flex items-center justify-end border-t border-[#E8E2DA] pt-6">
            <button onClick={goNext} disabled={!canContinue} className="inline-flex items-center gap-2 rounded-xl bg-[#EA2C00] text-white text-[14px] font-semibold px-5 py-2.5 hover:bg-[#d12800] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {phase === "scope" ? "Build the plan" : "Continue"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div></>
      )}

      {/* Start-over confirm — a small modal so the whole page registers the destructive action */}
      {confirmingReset && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1A1A1A]/30 backdrop-blur-[2px] px-4" onClick={() => setConfirmingReset(false)}>
          <div className="bg-[#FDFCFA] rounded-2xl border border-[#E8E2DA] shadow-2xl w-full max-w-[400px] p-7" onClick={(e) => e.stopPropagation()}>
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
