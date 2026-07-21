import { X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GOAL_CATALOG } from "@/lib/attain/attainGoals";
import type { AttainSetting } from "@/lib/attain/attainTypes";
import type { AttainSaveState } from "@/lib/attain/attainUrlState";

const SETTING_LABELS: Record<AttainSetting, string> = {
  outpatient: "Outpatient",
  ed: "Emergency",
  inpatient: "Inpatient",
  nursing: "Nursing",
};

/** "Jul 14, 2026" — matches the absolute-date convention the Progress tab
 * uses everywhere else (see StepAttainment.tsx's `formatDate`), never a
 * relative "2 days ago" that reads differently depending on when it's
 * opened. */
function formatSavedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "earlier";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface AttainResumePromptProps {
  draft: AttainSaveState;
  onResume: () => void;
  onDismiss: () => void;
}

/**
 * Save-and-return's "come back with no link" half. Shown once, on a fresh
 * Attain entry, only when this browser holds a local draft (see
 * AttainFlow.tsx's `resumeDraft` and attainUrlState.ts's `readAttainDraft`).
 * Purely an offer, never forced — accepting rehydrates the whole plan and
 * jumps to the Attainment hub; dismissing just hides this card for the rest
 * of the visit and leaves the draft untouched, so it can still be offered
 * again next time.
 */
export default function AttainResumePrompt({ draft, onResume, onDismiss }: AttainResumePromptProps) {
  const settingLabel = draft.state.setting ? SETTING_LABELS[draft.state.setting] : "your";
  const goalLabels = draft.goals.map((g) => GOAL_CATALOG[g]?.label ?? g).join(" + ");

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[820px] mx-auto mb-8 bg-[#1A1A1A] border border-[#EA2C00] rounded-lg p-5 flex items-start gap-4"
      data-testid="banner-attain-resume-prompt"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[2.5px] text-[#EA2C00] mb-1.5">Pick up where you left off</p>
        <h3 className="font-abridge text-lg text-white mb-1.5">Resume your in-progress plan?</h3>
        <p className="text-[12px] text-white/70 leading-relaxed mb-4">
          You have a {settingLabel} plan{goalLabels ? ` for ${goalLabels}` : ""} saved on this device from{" "}
          {formatSavedAt(draft.savedAt)}. Resuming rehydrates every decision, commitment, and progress entry exactly
          as you left it.
        </p>
        <div className="flex items-center gap-3">
          <Button
            className="h-9 px-4 bg-[#EA2C00] hover:bg-[#D42600] text-white text-xs"
            data-testid="button-attain-resume-accept"
            onClick={onResume}
          >
            Resume plan
          </Button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-white/60 hover:text-white font-semibold"
            data-testid="button-attain-resume-dismiss"
          >
            Start fresh instead
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-white/40 hover:text-white flex-shrink-0"
        aria-label="Dismiss"
        data-testid="button-attain-resume-close"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
