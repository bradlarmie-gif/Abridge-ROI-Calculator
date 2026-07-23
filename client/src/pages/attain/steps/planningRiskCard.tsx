import type { AttainSetting } from "@/lib/attain/attainTypes";

/**
 * The optional partner-disclosed risk card, shared by the single-goal and
 * multi-goal MEASUREMENT PLAN pages (StepMeasurementPlan / StepMultiMeasurementPlan).
 *
 * This used to live in the now-retired phased plan step; it moved here when
 * that surface was deleted so the measurement plan pages keep exactly the same
 * one optional risk line at their foot, unchanged.
 */

/** The goals a measurement plan can hold — the same set the shared surface
 * supports. */
export type PlanningGoal = "access" | "retention" | "revenue" | "quality" | "capacity";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[8px] font-bold uppercase tracking-wide text-[#8C8C8C] mb-1">{children}</p>;
}

/** A goal-flavored example for the optional partner-risk field. A multi-
 * priority plan carries one plan-wide risk, so it uses a deliberately generic
 * example rather than any single priority's wording. */
export function riskPlaceholderFor(goal: PlanningGoal | null, setting: AttainSetting): string {
  if (goal === null) return "e.g. a hiring freeze slows one of these priorities until the Q3 review";
  if (goal === "revenue") return "e.g. the coding team is mid-transition to a new vendor until Q3";
  if (goal === "quality") return "e.g. the wound-care nurse is out on leave until the Q3 backfill";
  if (goal === "capacity") return "e.g. a census surge is driving overtime that charting cannot touch until the Q3 hiring class fills";
  if (goal === "retention") return "e.g. a covering-shift policy refills the freed time until the Q3 staffing review";
  if (goal === "access" && setting === "ed") return "e.g. triage staffing is short until the Q3 hiring class fills";
  return "e.g. new scheduling template is blocked until the EHR upgrade in Q3";
}

/** The optional partner-disclosed risk, one per plan. Only becomes part of the
 * plan once it is filled in; we never invent a weak link. */
export function PlanningRiskCard({
  partnerRisk,
  onChangePartnerRisk,
  placeholder,
}: {
  partnerRisk: string;
  onChangePartnerRisk: (text: string) => void;
  placeholder: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#D8CFC4] bg-white p-5 mb-4" data-testid="card-planning-risk">
      <FieldLabel>Anything the partner has flagged that could slow this down? (optional)</FieldLabel>
      <input
        value={partnerRisk}
        onChange={(e) => onChangePartnerRisk(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-[#D8CFC4] bg-white px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#EA2C00]"
        data-testid="input-planning-partner-risk"
      />
      {partnerRisk.trim() && (
        <div className="mt-3 bg-[#FFF6F3] border-l-[3px] border-[#EA2C00] rounded-r-md p-3" data-testid="callout-planning-risk">
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#EA2C00] mb-1">Flagged by the partner</p>
          <p className="text-[13px] text-[#1A1A1A] leading-relaxed">{partnerRisk.trim()}</p>
        </div>
      )}
    </div>
  );
}
