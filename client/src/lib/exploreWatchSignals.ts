import type { ExploreCareSetting } from "@/pages/explore/exploreState";
import type { ExploreQuadrant } from "@/lib/exploreDrivers";

/**
 * "What you can watch": the signal library shown under each Explore value
 * driver. Every signal STARTS from the documentation (the `inNote` beat), so
 * the throughline always reads documentation → the measurable signal → why it
 * matters. Copy is capability + observation only, never a causal/guarantee
 * claim (see the defensible-claims doctrine): "tends to", "leading indicator",
 * "you confirm on your own numbers", never "Abridge reduces X".
 *
 * The point is the tease: a leader sees a measure they hadn't thought to watch,
 * and "Trace it" shows the honest throughline back to the documentation.
 */
export interface WatchSignal {
  /** The metric name. */
  name: string;
  /** One-line "what it is", shown collapsed. */
  what: string;
  /** Beat 1: what changes in the documentation (the first link). */
  inNote: string;
  /** Beat 2: the measurable signal that results. */
  signal: string;
  /** Beat 3: why it matters, tied to the dollar, non-causal. */
  matters: string;
}

export interface WatchDomain {
  /** Short phrase naming the dollar this domain drives (e.g. "documentation-driven overtime"). */
  dollar: string;
  signals: WatchSignal[];
}

type QuadrantKey = ExploreQuadrant; // "Capacity" | "Workforce" | "Revenue" | "Quality"

export const WATCH_SIGNALS: Partial<
  Record<ExploreCareSetting, Partial<Record<QuadrantKey, WatchDomain>>>
> = {
  nursing: {
    Capacity: {
      dollar: "documentation-driven overtime",
      signals: [
        {
          name: "Point-of-care documentation rate",
          what: "Share charted at the bedside, not batched at shift end",
          inNote:
            "Abridge lets the nurse capture the care event at the bedside, as it happens, instead of holding it for the end of the shift.",
          signal:
            "So the share of documentation completed at the point of care becomes something you can watch climb, week over week.",
          matters:
            "It is the upstream behavior behind the after-shift charting that turns into paid overtime. As it rises, the post-shift queue tends to shrink. You confirm the link on your own numbers; we don't assume it.",
        },
        {
          name: "Post-shift flowsheet queue",
          what: "Open flowsheet entries still waiting at clock-out",
          inNote:
            "When charting happens in the moment, fewer flowsheet rows are left open when the shift ends.",
          signal:
            "The size of the documentation queue at end of shift is a number you can pull from the EHR.",
          matters:
            "A shrinking queue is the clearest early sign that documentation is no longer spilling past the shift, which is where the catch-up overtime lives.",
        },
        {
          name: "Documentation lag",
          what: "Minutes from the care event to the chart entry",
          inNote:
            "Ambient capture closes the gap between doing the care and recording it.",
          signal:
            "The median minutes between a care event and its chart entry is measurable per unit.",
          matters:
            "Lag is where both accuracy and time erode. A shorter lag is the leading indicator sitting underneath nearly every other signal on this page.",
        },
        {
          name: "On-time shift completion rate",
          what: "Share of shifts ending on time",
          inNote:
            "Less end-of-shift charting means fewer nurses held past the clock to finish notes.",
          signal:
            "The percentage of shifts that end on time is trackable from timekeeping.",
          matters:
            "It is the human-felt version of the overtime line, and it tends to be the first thing nurses notice change.",
        },
      ],
    },

    Workforce: {
      dollar: "retention and agency spend",
      signals: [
        {
          name: "After-shift charting minutes",
          what: "EHR time logged after the shift ends",
          inNote:
            "The documentation that used to follow the nurse home is captured during the shift instead.",
          signal:
            "Minutes of EHR use logged outside scheduled hours is one of the fastest signals in the record.",
          matters:
            "After-hours charting is one of the most-cited contributors to burnout. It tends to move before intent-to-leave does, so it is the earliest read you have on retention risk.",
        },
        {
          name: "First-year RN turnover",
          what: "Turnover among nurses in their first year",
          inNote:
            "A lighter documentation load lands hardest on new grads who are still building charting speed.",
          signal:
            "First-year turnover is a rate you already report; watch it against the documentation-burden signals above.",
          matters:
            "First-year leavers are the most expensive to replace and the most sensitive to charting load, so the connection tends to surface here first.",
        },
        {
          name: "Burnout score (MBI / Mini-Z)",
          what: "Validated burnout measure, run on a cadence",
          inNote:
            "The after-hours charting a lighter documentation load removes is a measured input to burnout.",
          signal:
            "A validated burnout instrument, run on a regular cadence, gives you the trend line.",
          matters:
            "It is the lagging confirmation of the after-hours signal above. When the fast signal moves first and burnout follows, you are seeing the same story twice.",
        },
        {
          name: "Likelihood to stay",
          what: "Nurses' stated intent to remain in role",
          inNote:
            "The daily friction a lighter charting load removes is what a stay-or-leave question is really measuring.",
          signal:
            "A short intent-to-stay pulse gives you the number without a full engagement survey.",
          matters:
            "It is the closest survey proxy to the retention dollar, and the last of these signals to move: the confirmation, not the leading edge.",
        },
      ],
    },

    Quality: {
      dollar: "the documentation-attributable share of harm-event cost across HAPI, falls, CAUTI, CLABSI, and sepsis",
      signals: [
        {
          name: "Present-on-admission documentation accuracy",
          what: "Whether harm is documented as present on day one",
          inNote:
            "Abridge captures the admission skin and risk assessment in the note, at the bedside, on day one.",
          signal:
            "How accurately a pressure injury, infection, or condition is recorded as present-on-admission is auditable per case.",
          matters:
            "Accurate present-on-admission documentation is what separates a penalized hospital-acquired event from one that is not counted against you. It sits entirely on the documentation, and most teams never watch it directly.",
        },
        {
          name: "Braden reassessment timeliness",
          what: "Is the pressure-injury risk score current, or hours stale",
          inNote:
            "Real-time bedside capture keeps the Braden score current instead of frozen at the last batched entry.",
          signal:
            "The share of Braden reassessments completed on schedule is measurable per unit.",
          matters:
            "Protocols act on the documented score. When the score is current, the intervention it triggers acts on live information rather than a stale entry.",
        },
        {
          name: "Line & catheter daily-necessity documentation",
          what: "Every device-day questioned in the note",
          inNote:
            "Point-of-care prompts put the daily necessity review for each central line and catheter into the note.",
          signal:
            "The rate of documented daily necessity reviews, and the device-days that follow, is trackable.",
          matters:
            "The documented daily necessity review is the timestamped prompt supporting the care team's timely removal decisions.",
        },
        {
          name: "Early-warning-score documentation lag",
          what: "How fast deterioration is captured (MEWS / NEWS)",
          inNote:
            "Vitals and assessments captured at the bedside feed the early-warning score in real time, not on a lag.",
          signal:
            "The delay between a deteriorating vital and its documented score is measurable.",
          matters:
            "A shorter lag is more time for the rapid-response team to act. It is the documentation signal that sits upstream of sepsis and failure-to-rescue.",
        },
        {
          name: "Turn & reposition documentation compliance",
          what: "Documented repositioning against the schedule",
          inNote:
            "Repositioning is logged at the bedside as it happens, not reconstructed later.",
          signal:
            "Compliance against the turn schedule is measurable straight from the flowsheet.",
          matters:
            "It is the intervention behind the HAPI number. Documented compliance is the proof the protocol is actually running, not just ordered.",
        },
      ],
    },

    Revenue: {
      dollar: "tracked, not counted; no dollar here",
      signals: [
        {
          name: "Nurse-documented CC/MCC support",
          what: "Malnutrition, pressure-injury stage, functional status in the note",
          inNote:
            "The nurse's assessment of nutrition, skin stage, and functional and cognitive status is captured completely in the note.",
          signal:
            "How often these nurse-documented conditions are present and specific is measurable.",
          matters:
            "These assessments are frequently the evidence behind the secondary diagnoses that lift a case's severity. When the nursing note is complete, fewer of those queries go unanswered.",
        },
        {
          name: "CDI query response rate & turnaround",
          what: "Nursing assessments that corroborate the physician note",
          inNote:
            "Complete, timely nursing documentation gives the CDI team the corroborating evidence already in the chart.",
          signal:
            "The share of CDI queries answered, and how fast, is a number CDI already tracks.",
          matters:
            "Faster, higher-response queries close the loop that protects DRG accuracy. It ties nursing documentation directly to the revenue conversation.",
        },
        {
          name: "Charge-capture accuracy",
          what: "Infusions, procedures, and supplies missed when charting lags",
          inNote:
            "Captured at the point of care, the billable act and its charge are recorded together.",
          signal:
            "The rate of billable nursing activity captured versus missed is auditable.",
          matters:
            "A charge that never reaches the chart never reaches the claim. Point-of-care capture is where that leakage tends to close.",
        },
      ],
    },
  },
};

/** The watch-signal domain for a setting/quadrant, or undefined if not authored yet. */
export function watchDomainFor(
  setting: ExploreCareSetting | null,
  quadrant: QuadrantKey,
): WatchDomain | undefined {
  if (!setting) return undefined;
  return WATCH_SIGNALS[setting]?.[quadrant];
}
