export type MethodologyCareSetting = "outpatient" | "ed" | "inpatient" | "nursing";

export interface MethodologyMathLine { name: string; formula: string; value: number }
export interface MethodologyChainStep { n: string; title: string; desc: string }
export interface MethodologyAttainStep { title: string; desc: string }

export interface MethodologySetting {
  id: MethodologyCareSetting;
  label: string;
  unit: string;               // "per visit"
  lever: string;              // "Volume is the lever."
  leverBlurb: string;         // lead under the headline
  dominantLever: string;      // comparison cell
  recordChanges: string;      // comparison cell
  comparisonSignals: string;  // condensed for the matrix
  comparisonOutcomes: string; // condensed for the matrix
  chain: MethodologyChainStep[];
  leadingSignals: string[];
  laggingOutcomes: string[];
  math: MethodologyMathLine[];
  attain: MethodologyAttainStep[];
  proofNote: string;
}

export const METHODOLOGY_ORDER: MethodologyCareSetting[] = ["outpatient", "ed", "inpatient", "nursing"];

export const METHODOLOGY_SETTINGS: MethodologySetting[] = [
  {
    id: "outpatient",
    label: "Outpatient",
    unit: "per visit",
    lever: "Volume is the lever.",
    leverBlurb:
      "The highest-volume setting, where a small gain on every visit compounds into the largest dollar case and the most clinician time to give back.",
    dominantLever: "Volume × margin. The highest-volume setting; small per-visit gains compound.",
    recordChanges: "The coded acuity of every visit (E/M level, chronic conditions) and time returned.",
    comparisonSignals: "Note completeness, conditions surfaced per visit, time in note.",
    comparisonOutcomes: "Captured wRVUs, recaptured HCCs, reopened visit access.",
    chain: [
      { n: "01 · The record changes", title: "A complete note, at the point of care", desc: "The visit is captured as delivered, not reconstructed from memory hours later." },
      { n: "02 · The mechanism", title: "Acuity is coded; time is returned", desc: "It supports the E/M level, surfaces conditions, and returns charting hours." },
      { n: "03 · The dollar", title: "Earned revenue, and added access", desc: "wRVUs and HCCs thin notes left behind get captured; reopened slots add margin. Counted once." },
    ],
    leadingSignals: ["Note completeness ↑", "Conditions surfaced per visit ↑", "Time in note, per provider ↓"],
    laggingOutcomes: ["Captured wRVUs against baseline ↑", "HCC capture completeness ↑", "Reopened visit access ↑"],
    math: [
      { name: "wRVU capture", formula: "248,000 wRVUs × 5% lift × $33.40 /wRVU × 90% realization", value: 372744 },
      { name: "HCC recapture", formula: "18,000 members × 0.125 HCC/member × $283 /HCC × 50% realization", value: 318375 },
      { name: "Patient access", formula: "2,334 added visits × $220 margin/visit", value: 513480 },
    ],
    attain: [
      { title: "Code to what the note documents", desc: "A complete record supports the level of service and the conditions addressed. Where coding works to that record, the wRVUs and HCCs you earned get captured." },
      { title: "Book the hours it returns", desc: "Returned charting time becomes access only once it is scheduled. Booked as visits, it turns into margin." },
      { title: "Keep every claim to the record", desc: "Nothing is coded beyond what the record supports, and the lift is measured against your own baseline. Defensible, and yours." },
    ],
    proofNote: "Documentation quality is tracked as proof that protects the revenue above: care-gap closure, HEDIS/Stars, denial defensibility. It leads the dollars and is never added to the total.",
  },
  {
    id: "ed",
    label: "Emergency",
    unit: "per encounter",
    lever: "Speed is the lever.",
    leverBlurb:
      "A throughput-constrained setting where revenue walks out the door, and a complete note both protects the level and keeps the department moving.",
    dominantLever: "Speed under pressure. Throughput-constrained; revenue walks out the door.",
    recordChanges: "A defensible E/M level and a note that keeps the department moving.",
    comparisonSignals: "Note completeness, charting time per patient.",
    comparisonOutcomes: "E/M level accuracy, fewer patients left without being seen.",
    chain: [
      { n: "01 · The record changes", title: "A complete note, in real time", desc: "The visit is documented as it happens, even under ED pressure." },
      { n: "02 · The mechanism", title: "Level supported; throughput protected", desc: "The note supports the E/M level and shortens charting, so the provider reaches the next patient." },
      { n: "03 · The dollar", title: "Coded acuity, and revenue that stays", desc: "E/M levels reflect the care delivered; fewer patients leave before being seen." },
    ],
    leadingSignals: ["Note completeness ↑", "Charting time per patient ↓", "Chart closed before end of shift ↑"],
    laggingOutcomes: ["E/M level accuracy ↑", "Fewer patients left without being seen ↓", "Door-to-provider time ↓"],
    math: [
      { name: "E/M level coding", formula: "264,000 ED visits × 3% coded to a higher supported level × $30 margin", value: 237600 },
      { name: "Throughput & LWBS", formula: "264,000 visits × 0.5% fewer left without being seen × $200 margin/visit", value: 264000 },
    ],
    attain: [
      { title: "Code to the documented level", desc: "A complete note supports the E/M level the visit warranted. Where coding works to that record, the coded acuity reflects the care delivered." },
      { title: "Convert returned time to throughput", desc: "Charting time returned means providers reach the next patient sooner. Where that happens, fewer patients leave before being seen." },
      { title: "Keep every claim to the record", desc: "Nothing is coded beyond what the note supports, measured against your own baseline. Defensible, and yours." },
    ],
    proofNote: "Safety and experience signals (door-to-provider time, LWBS) are tracked as proof and kept out of the dollar case.",
  },
  {
    id: "inpatient",
    label: "Inpatient",
    unit: "per discharge",
    lever: "Acuity is the lever.",
    leverBlurb:
      "Few, high-value encounters where case-mix is everything, and a complete note supports the codes and the level of care a complex stay warrants.",
    dominantLever: "Acuity on complex stays. Few, high-value encounters; case-mix is everything.",
    recordChanges: "Complete case-mix and the support for the status a stay warrants.",
    comparisonSignals: "Note completeness, CDI query burden.",
    comparisonOutcomes: "Case-mix (DRG) accuracy, observation-status defense.",
    chain: [
      { n: "01 · The record changes", title: "A complete note across the stay", desc: "The full clinical picture of a complex admission is captured." },
      { n: "02 · The mechanism", title: "Case-mix and status, supported", desc: "The note supports the codes and the level of care the stay warrants." },
      { n: "03 · The dollar", title: "Accurate DRG, defended status", desc: "Case-mix reflects true acuity; observation downgrades are defensible." },
    ],
    leadingSignals: ["Note completeness ↑", "CDI query burden ↓", "Documentation turnaround ↓"],
    laggingOutcomes: ["Case-mix (DRG) accuracy ↑", "Observation-status defense ↑", "Case-mix index trend ↑"],
    math: [
      { name: "DRG / case-mix accuracy", formula: "12,000 discharges × 3% more accurate case-mix × $1,000 margin", value: 360000 },
      { name: "Observation-status defense", formula: "2,000 status reviews × 20% defended × $1,000 margin", value: 400000 },
    ],
    attain: [
      { title: "Code to the documented acuity", desc: "CDI and coding work the complete note, so case-mix reflects the stay actually delivered." },
      { title: "Defend status with the record", desc: "Where the note supports inpatient status, observation downgrades are appealable on the documentation." },
      { title: "Keep every claim to the record", desc: "Nothing is coded beyond what the note supports, measured against your own baseline. Defensible, and yours." },
    ],
    proofNote: "Case-mix index trend and query metrics are tracked as proof alongside the dollar case, not added to it.",
  },
  {
    id: "nursing",
    label: "Nursing",
    unit: "per patient-day",
    lever: "Time is the lever.",
    leverBlurb:
      "A mostly non-billing setting where the value is hours returned to the bedside and harm avoided. Revenue is the proof layer, not the point.",
    dominantLever: "Time at the bedside & safety. Mostly non-billing; the value is hours and harm avoided.",
    recordChanges: "Flowsheet completeness and hours returned from charting.",
    comparisonSignals: "Flowsheet completeness, time in documentation.",
    comparisonOutcomes: "Returned bedside time, harm events avoided, overtime down (revenue is the proof layer).",
    chain: [
      { n: "01 · The record changes", title: "Flowsheets complete, in real time", desc: "Documentation is captured at the bedside, not caught up on later." },
      { n: "02 · The mechanism", title: "Hours returned; risks surfaced", desc: "Charting time returns to care, and safety-relevant findings surface earlier in the record." },
      { n: "03 · The dollar", title: "Time returned, and harm avoided", desc: "Returned hours go back to patients; fewer safety events (HAPI, falls, sepsis) avoid real penalty and cost." },
    ],
    leadingSignals: ["Flowsheet completeness ↑", "Time in documentation ↓", "Charting after shift ↓"],
    laggingOutcomes: ["Returned bedside time ↑", "Fewer harm events (HAPI, falls, sepsis) ↓", "Overtime hours ↓"],
    math: [
      { name: "Harm avoided (HAPI, falls, sepsis)", formula: "40 events avoided/yr × $14,000 cost and penalty per event", value: 560000 },
      { name: "Overtime avoided", formula: "400 nurses × 0.5 overtime hour/week × $52 /hour × 46 weeks", value: 478400 },
    ],
    attain: [
      { title: "Prevent the harm the record surfaces", desc: "Falls, HAPI, and infections show earlier in a complete record. Where teams act on them, fewer occur, and each avoided event avoids real penalty and cost." },
      { title: "Return the hours to the bedside", desc: "Documentation time saved becomes care time where it is protected, not backfilled with new tasks." },
      { title: "Keep every claim to the record", desc: "Only harm the record surfaces and hours it returns are counted, measured against your own baseline. Defensible, and yours." },
    ],
    proofNote: "In nursing, Revenue is the proof layer (little of the work is billed). The dollar case is the harm a complete record helps avoid and the time it returns.",
  },
];
