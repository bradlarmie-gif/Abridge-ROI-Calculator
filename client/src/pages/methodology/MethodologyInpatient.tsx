import { motion, useInView } from "framer-motion";
import { useState, useRef } from "react";
import { ArrowLeft, Download, ArrowRight, Activity, Stethoscope, Heart, Loader2 } from "lucide-react";
import { generateMethodologyPDF } from "@/lib/methodology-pdf-export";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';
import {
  NarrativeText,
  type BadgeType,
  type DomainName,
} from "@/components/methodology/MethodologyShared";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MethodologyInpatientProps {
  onBack: () => void;
  onHome?: () => void;
  onNavigateToSetting?: (setting: string) => void;
  onBuildModel?: () => void;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeCol = { l: string; b: string };
type NodeDetail = { cols: NodeCol[]; grad?: string };

type ChainNode = {
  key: string;
  label: string;
  sub: string;
  isSource?: true;
  isOutcome?: true;
  detail?: NodeDetail;
};

type TimelineMetric = { name: string; source: string; badge: string; why?: string };

type TimelineStage = {
  window: string;
  desc: string;
  metrics: TimelineMetric[];
  callout: string;
};

type MatterBox = { tag: string; body: string };

type FormulaVar = {
  v: string;
  op?: string;
  kind: 'input' | 'benchmark' | 'default' | 'derived';
  hint?: string;
};
type FormulaStep = { vars: FormulaVar[]; result: string; isFinal?: boolean };
type FrameworkItem = {
  domain: DomainName;
  tag: 'modeled' | 'tracked';
  narrative: string;
  chain: string[];
  chainOutput?: string;
  steps?: FormulaStep[];
  note?: string;
};

type IPDomainCardData = {
  domain: DomainName;
  number: string;
  badge: string;
  northStar: string;
  direction: '↑' | '↓';
  northStarSub: string;
  matterBoxes: MatterBox[];
  matterLayout?: '2col';
  alsoNote?: string;
  chain: ChainNode[];
  timeline: {
    signal: TimelineStage;
    trend: TimelineStage;
    proof: TimelineStage;
  };
};

// ─── Domain Data ──────────────────────────────────────────────────────────────

const ipDomainCards: IPDomainCardData[] = [
  // ── CAPACITY ──────────────────────────────────────────────────────────────
  {
    domain: 'CAPACITY',
    number: 'Domain 1 of 4',
    badge: 'Discharge Planning Efficiency',
    northStar: 'Documentation-Attributed Discharge Delays',
    direction: '↓',
    northStarSub: 'Length of stay has too many drivers to claim. Documentation-attributed delays are a specific UM cause code — a trackable gap between when a patient is medically ready to discharge and when the documentation exists to act on it.',
    matterBoxes: [
      {
        tag: 'COO / VP Patient Care',
        body: "UM flagging documentation gaps as a cause of discharge delays, avoidable day rate above peer benchmark, or CDI query loops holding up discharge planning. Documentation bottlenecks create LOS variance that staffing and care management alone can't resolve.",
      },
      {
        tag: 'CFO',
        body: "Avoidable days cost on both sides — observation revenue is lower than inpatient, and payer denials increase when documentation doesn't establish medical necessity per level of care. Reducing documentation-driven LOS variance is direct cost avoidance.",
      },
    ],
    matterLayout: '2col',
    chain: [
      { key: 'source', label: 'Abridge Ambient', sub: 'hospital documentation AI', isSource: true },
      {
        key: 'timeliness', label: 'Progress Note Timeliness ↑', sub: 'note available before rounding ends',
        detail: {
          cols: [
            { l: 'What it measures', b: 'The time between when a rounding encounter ends and when the progress note is completed and signed — captured via EHR timestamps.' },
            { l: 'Why timeliness is the mechanism', b: 'When the progress note is complete before the care team disperses, case managers, social workers, and consultants can act on the clinical picture without waiting for a note that lands hours later. The delay is often the note, not the decision.' },
            { l: 'What Abridge changes', b: 'Ambient capture drafts the progress note during the rounding conversation. The provider reviews and signs before leaving the patient\'s room — turning a 4–8 hour note lag into a same-encounter turnaround.' },
          ],
          grad: "When progress note completion time reaches a consistent same-encounter low, the documentation bottleneck has closed. Start watching whether case management is now getting earlier discharge notification — that's the next signal.",
        },
      },
      {
        key: 'sharedpicture', label: 'Shared Clinical Picture ↑', sub: 'nurses, case managers, consultants',
        detail: {
          cols: [
            { l: 'What it represents', b: 'The degree to which every member of the care team — nursing, case management, social work, consulting specialists — has access to a current and complete clinical picture at the same time.' },
            { l: 'Why it matters for discharge', b: 'Discharge planning requires coordinated decisions across multiple teams. When each team is working from a different version of the clinical picture — some from this morning\'s rounding note, some from yesterday\'s — coordination delays compound.' },
            { l: 'How to observe it', b: 'Indirectly, through case management notes and UM documentation of delay cause. A shared clinical picture shows up as earlier discharge goal documentation and fewer "awaiting provider note" delay codes.' },
          ],
        },
      },
      {
        key: 'planning', label: 'Discharge Planning Initiated Earlier', sub: 'goals set day-of, not day-before',
        detail: {
          cols: [
            { l: 'What it measures', b: 'How early in the admission the care team documents a discharge goal — and how far in advance that goal is acted on by case management, social work, and facilities.' },
            { l: 'The compounding effect', b: 'Discharge planning that starts on day 2 of a 4-day admission has twice as much runway as planning that starts on day 3. Complete progress notes enable earlier goal-setting, which in turn enables earlier action on the entire discharge chain.' },
            { l: 'How to track it', b: 'UM system discharge goal entry dates vs. actual discharge date. Case management notes documenting when discharge planning was initiated. EHR-based "anticipated discharge date" documentation by physicians.' },
          ],
        },
      },
      {
        key: 'delays', label: 'Documentation-Attributed Delays ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'Days delayed specifically because clinical documentation was incomplete or unavailable — distinct from delays caused by clinical instability, social factors, or placement wait times.' },
            { l: 'Data source', b: 'UM delay cause codes (typically within the case management or UM system). Filter specifically for documentation-related codes. Compare Abridge provider cohort vs. non-Abridge cohort.' },
            { l: 'Why it\'s honest attribution', b: "This is the only LOS-adjacent metric where documentation is the direct cause. We don't claim to move LOS broadly — we claim to move the documentation-specific cause codes. That's a defensible attribution." },
          ],
        },
      },
      {
        key: 'avoidable', label: 'Avoidable Day Rate ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'The percentage of inpatient days that UM classifies as avoidable — days the patient remained admitted when clinical criteria for discharge or step-down were met.' },
            { l: 'How to track it', b: 'UM system avoidable day flags. Not all avoidable days are documentation-attributed — case management can typically break out which codes relate to documentation vs. placement vs. family vs. clinical.' },
            { l: 'The financial connection', b: "Payers track avoidable days and use them to challenge medical necessity on concurrent review. A declining avoidable day rate is both an efficiency metric and a denial prevention signal." },
          ],
        },
      },
    ],
    timeline: {
      signal: {
        window: 'Week 4–10',
        desc: 'Note timeliness moves',
        metrics: [
          { name: 'Morning Rounding Note Completion Time ↓', source: 'EHR timestamps · time from rounding start to progress note signature · per-provider · pre/post comparison', badge: 'Week 4–8', why: "When progress notes are completed during or immediately after rounds, care team notifications and discharge planning can start hours earlier. Morning rounding note speed sets the tempo for the entire day's throughput." },
          { name: 'Same-Encounter Note Completion Rate', source: 'EHR data · % of progress notes signed before provider leaves the unit · Abridge vs. baseline', badge: 'Week 6–10', why: "Measures whether the behavior change is consistent, not just occasional. A high rate means the clinical picture is reliably available early — not just sometimes — enabling earlier discharge planning." },
        ],
        callout: "Graduation signal: When progress note completion time reaches a consistent same-encounter low, the documentation bottleneck has closed. Start watching whether case management is now getting earlier discharge notification.",
      },
      trend: {
        window: 'Month 2–5',
        desc: 'Planning and coordination follow',
        metrics: [
          { name: 'Case Manager Notification Lead Time', source: 'Case management system · hours between physician progress note sign and CM review of note · proxy for shared clinical picture lag', badge: 'Month 2–5', why: "Exposes whether note timeliness improvement is actually translating to earlier discharge planning — or whether case managers are still waiting for notes even after physicians sign them." },
          { name: 'Time to Discharge Goal Documentation', source: 'UM or case management system · days from admission to documented discharge goal · Abridge providers vs. non-Abridge', badge: 'Month 2–4', why: "Earlier discharge goal documentation gives case management more runway to arrange next-level-of-care. The earlier the goal is documented, the earlier the entire discharge chain can start." },
        ],
        callout: "Three signals, one story: Discharge goal documentation moving earlier gives case management more runway. Case manager notification lead time confirms that earlier planning is actually happening — not just documented in the note. Discharge summary timeliness confirms the handoff is cleaner at the end. All three need to trend together before documentation-attributed delay codes will move in the proof stage.",
      },
      proof: {
        window: 'Month 4–12',
        desc: 'Delay cause codes move',
        metrics: [
          { name: 'Avoidable Day Rate', source: 'UM system · avoidable days per 100 admissions · Abridge providers vs. baseline · filter for documentation-related codes', badge: 'Month 6–12', why: "The downstream financial expression of documentation delays. Avoidable days reduce payer revenue and attract concurrent review scrutiny — declining rate is both an efficiency and denial prevention signal." },
          { name: 'Discharge Order Lead Time ↓', source: 'EHR data · time from physician discharge decision to signed discharge order and note · per-provider · automatically captured', badge: 'Month 4–8', why: "When discharge documentation is completed during the encounter rather than deferred, the time between the discharge decision and the signed order falls. This is a direct, defensible capacity metric — no manual chart review required, no UM coding needed." },
          { name: 'Length of Stay (documentation-attributed cohort)', source: 'EHR or UM system · average LOS · Abridge provider cohort vs. matched non-Abridge cohort · treat as directional signal, not primary attribution', badge: 'Month 6–12', why: "LOS has many drivers beyond documentation — patient acuity, discharge destination availability, payer requirements. Track it alongside documentation-attributed delay rate rather than as a standalone Abridge proof point. When LOS trends down in concert with declining documentation delays, the story is defensible. When LOS is flat but documentation delays are down, that's still a meaningful operational win." },
        ],
        callout: "Why cause codes matter: Avoidable day rate is a broad metric with many drivers. The subset coded as documentation-attributed is the one where Abridge has direct attribution. Always filter to that specific cause code bucket when building the story.",
      },
    },
  },

  // ── WORKFORCE ─────────────────────────────────────────────────────────────
  {
    domain: 'WORKFORCE',
    number: 'Domain 2 of 4',
    badge: 'Clinician Wellbeing & Retention',
    northStar: 'Voluntary Turnover',
    direction: '↓',
    northStarSub: "Hospitalists manage 15–20 patients per shift, each requiring a progress note. That's 2–4 hours of daily documentation before the shift ends — and another hour after. Burnout here is mathematical, not emotional. Fix the math.",
    matterBoxes: [
      {
        tag: 'CFO',
        body: "Replacing a hospitalist costs an estimated $250K–$500K fully loaded — recruiting, credentialing, onboarding, productivity ramp. Locum coverage during the vacancy adds further cost at 2–3× employed rates.",
      },
      {
        tag: 'CMO',
        body: 'Documentation burden is the top-cited driver of hospitalist burnout. Reducing the mechanical charting load is the most direct, fastest-acting lever for improving physician wellbeing — ahead of schedule changes, team restructuring, or wellness programs.',
      },
    ],
    matterLayout: '2col',
    chain: [
      { key: 'source', label: 'Abridge Ambient', sub: 'hospital documentation AI', isSource: true },
      {
        key: 'pajama', label: 'After-Shift Charting ↓', sub: '15 notes × 8 min = 2 hrs nightly',
        detail: {
          cols: [
            { l: 'What it measures', b: 'Time spent charting after the shift ends — the sum of incomplete progress notes, H&Ps, and consult responses carried over from the shift.' },
            { l: 'Data source', b: 'EHR audit logs. Session activity after scheduled shift end per provider, pre- and post-Abridge adoption. No survey needed — the behavior is directly measurable.' },
            { l: 'The math', b: "15 patients × 8 minutes per progress note = 2 hours of nightly charting before anything else. Ambient capture turns this from a creation task into a 2-minute review per note — returning 60–90 minutes per shift." },
          ],
          grad: "When post-shift EHR session time reaches a stable low, providers have their evenings back. The next signal to watch is how that recovery translates to wellbeing scores at Month 2–4.",
        },
      },
      {
        key: 'cogload', label: 'Cognitive Load During Rounding ↓', sub: 'present with patients',
        detail: {
          cols: [
            { l: 'What it represents', b: "The mental overhead of knowing you have 15 progress notes to write after seeing 15 patients. This isn't just fatigue — it's the awareness throughout rounding that every conversation is also a documentation task to be completed later." },
            { l: 'How to observe it', b: 'Indirectly: documentation time per encounter (EHR logs) and self-reported cognitive fatigue on validated burnout instruments. Not a standalone metric — it manifests in satisfaction scores and wellbeing surveys.' },
            { l: 'Why it matters beyond hours', b: "Cognitive load reduction is what connects documentation efficiency to care quality and clinical decision-making. Physicians who aren't mentally composing the next note while talking to the current patient are more present — and more thorough." },
          ],
        },
      },
      {
        key: 'wellbeing', label: 'Provider Wellbeing ↑', sub: 'leading indicator of retention',
        detail: {
          cols: [
            { l: 'What it measures', b: 'Physician satisfaction, burnout level, and perceived work-life balance — captured through a validated burnout assessment survey or institutional engagement instrument.' },
            { l: 'Data source', b: 'Most health systems use an institutional survey or SHM/ACP-provided burnout instrument. Compare Abridge adopters to non-adopters at the same site for a controlled comparison. Quarterly cadence is sufficient.' },
            { l: "Why it's a financial metric", b: "Wellbeing is a leading indicator of voluntary departure. Improving it is both a mission outcome and a 12-month financial forecast. A CMO can use wellbeing data to make the retention case before turnover numbers mature." },
          ],
        },
      },
      {
        key: 'turnover', label: 'Voluntary Turnover ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'The percentage of hospitalists who voluntarily leave their role — the primary financial metric for workforce stability.' },
            { l: 'Data source', b: 'HR data. Voluntary departure rate by department. Compare Abridge units to non-Abridge units, controlling for seniority and program size.' },
            { l: 'The financial case', b: "Replacing one hospitalist is estimated at $250K–$500K (recruiting, credentialing, onboarding, lost productivity). At 10% turnover on 30 hospitalists, that's 3 replacements per year. Preventing one additional departure can offset a year of Abridge costs." },
          ],
        },
      },
      {
        key: 'locum', label: 'Locum Spend ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'The cost and volume of locum and agency physicians used to fill open shifts during hospitalist vacancies — the direct financial consequence of turnover.' },
            { l: 'Data source', b: 'Finance and staffing data. Locum hours × rate per shift. Compare year-over-year as retention improves.' },
            { l: 'Why it\'s often the faster number', b: "Locum spend responds within months of a departure and is tracked in real time by finance. It's often more visible to CFOs than the longer-term turnover calculation." },
          ],
        },
      },
    ],
    timeline: {
      signal: {
        window: 'Week 4–10',
        desc: 'Charting behavior changes',
        metrics: [
          { name: 'After-Shift Charting Time (Pajama Time)', source: 'EHR session logs · minutes after scheduled shift end · per-provider · no survey needed', badge: 'Week 4–8', why: "Hospitalists finishing notes after shift end is a persistent burnout driver — undone work carries cognitive weight into the next shift. This is the earliest signal that Abridge is recapturing that time." },
          { name: 'Progress Note Completion Rate (Same Shift)', source: "EHR data · % of notes signed before provider's shift ends · Abridge vs. baseline", badge: 'Week 6–10', why: "Confirms that behavioral change is consistent — notes being done during the shift, not carried to the next. High rate means the documentation burden has genuinely lifted, not just moved." },
        ],
        callout: "Why start here: Post-shift EHR data is objective, requires no coordination, and is the most visceral proof point for clinicians. Pajama time reduction is the metric physicians talk about to each other — and that conversation is your organic adoption strategy.",
      },
      trend: {
        window: 'Month 2–5',
        desc: 'Wellbeing signals emerge',
        metrics: [
          { name: 'Intent to Stay', source: 'Institutional engagement survey or validated single-item intent measure · trended quarterly', badge: 'Month 3–5', why: "Intent to stay moves before actual departures, giving organizations a window to intervene. Watch for divergence between Abridge adopters and non-adopters — that divergence is the leading signal." },
          { name: 'Provider Wellbeing Score', source: 'Validated burnout assessment survey · Abridge vs. non-Abridge providers at same site · quarterly cadence', badge: 'Month 2–4', why: "Wellbeing improves on a lag from documentation burden reduction. The cognitive load of carrying undone notes has a psychological weight that takes time to lift even after the workflow changes." },
          { name: 'Satisfaction with Documentation Workflow', source: 'Department-specific pulse or EHR satisfaction survey · Abridge adopters vs. non-adopters', badge: 'Month 2–4', why: "Changes faster than wellbeing and is a leading indicator of both retention and adoption sustainability. If satisfaction isn't improving, investigate whether adoption is real." },
        ],
        callout: "The CFO bridge: Wellbeing scores don't appear on a balance sheet. Build the bridge explicitly: improved wellbeing is a leading indicator of lower voluntary departure intent, which translates to reduced replacement and locum costs.",
      },
      proof: {
        window: 'Month 9–18',
        desc: 'Retention and cost impact',
        metrics: [
          { name: 'Locum & Agency Utilization', source: 'Finance / staffing data · locum hours and cost per open shift · year-over-year comparison', badge: 'Month 9–18', why: "Open shifts filled by locums represent the financial cost of workforce instability. Declining locum dependence is the CFO's proof that the retention story is real, not just survey-reported." },
          { name: 'Voluntary Hospitalist Turnover Rate', source: 'HR data · annual voluntary departures / total headcount · Abridge units vs. comparable non-Abridge units', badge: 'Month 12–18', why: "The lagging retention outcome. Requires 12+ months because departure decisions have long lead times and are measured annually — but confirms the workforce story when it arrives." },
        ],
        callout: "Why the long timeline: Turnover is a lagging indicator. You need 12–18 months before departures are statistically meaningful. The strategy is to prove wellbeing early, build the CFO bridge at Month 6, and let turnover data confirm the story as it matures.",
      },
    },
  },

  // ── REVENUE ───────────────────────────────────────────────────────────────
  {
    domain: 'REVENUE',
    number: 'Domain 3 of 4',
    badge: 'Case Mix & DRG Accuracy',
    northStar: 'Case Mix Index',
    direction: '↑',
    northStarSub: 'CMI is the financial fingerprint of clinical complexity. When documentation captures the full clinical story — comorbidities, complications, severity — DRG weights reflect what was actually managed, not what was minimally documented.',
    matterBoxes: [
      {
        tag: 'CFO / Revenue Cycle',
        body: "CMI below peer benchmark despite comparable acuity, CDI query volume above 4 per provider per month, or DRG downgrade rate climbing on concurrent review. Query reduction and CMI improvement both compound across high admission volumes.",
      },
      {
        tag: 'CMO / CDO',
        body: "Documentation quality is a DRG accuracy problem. When hospitalists capture the full clinical picture in real time, the code reflects the encounter — CDI queries become exceptions rather than routine workflow overhead.",
      },
    ],
    matterLayout: '2col',
    chain: [
      { key: 'source', label: 'Abridge Ambient', sub: 'hospital documentation AI', isSource: true },
      {
        key: 'detail', label: 'Clinical Detail Captured ↑', sub: 'specificity, complexity documented',
        detail: {
          cols: [
            { l: 'What it means', b: 'The degree to which the H&P and progress notes capture clinical specificity — not just the primary diagnosis but the full constellation of conditions, complications, and comorbidities that characterize the patient\'s actual complexity.' },
            { l: 'Why documentation is the gap', b: "Physicians verbalize this complexity during rounding. What doesn't make it into the note is what the coder and CDI team can't act on — because documentation is the only evidence that exists for coding purposes." },
            { l: 'What Abridge changes', b: "Ambient capture preserves the clinical conversation as it happens — comorbidities mentioned in passing, exam findings that would normally be omitted from a hurried note, reasoning that connects diagnosis to plan. All of that is now in the record." },
          ],
          grad: "When CDI query-back rates and coder query rates start declining, it means the notes are arriving with what's needed. That's the signal the documentation foundation has changed — watch CC/MCC capture rates as confirmation.",
        },
      },
      {
        key: 'ccmcc', label: 'CC/MCC Documentation ↑', sub: 'qualifying comorbidities captured',
        detail: {
          cols: [
            { l: 'What it measures', b: 'Complication and Comorbidity (CC) and Major Complication and Comorbidity (MCC) documentation — the specific coded conditions that drive DRG weight upward when they\'re present and documented with sufficient specificity.' },
            { l: 'Why specificity is required', b: 'A diagnosis documented as "anemia" doesn\'t qualify as a CC. "Iron deficiency anemia" does. A diagnosis of "heart failure" doesn\'t qualify as an MCC. "Acute systolic heart failure" does. The clinical condition may be the same — the documentation specificity determines the code.' },
            { l: 'How to track it', b: 'CDI tracks CC/MCC capture rates daily. Compare Abridge-enabled providers to a control cohort — same patient population, same complexity, different documentation tool.' },
          ],
        },
      },
      {
        key: 'drg', label: 'DRG Accuracy ↑', sub: 'code reflects clinical reality',
        detail: {
          cols: [
            { l: 'What it means', b: 'The DRG assigned by coding reflects what was actually managed — not the minimum supportable by the documentation. DRG accuracy improvement means fewer CDI queries, fewer coder query-backs, and fewer post-discharge payer challenges.' },
            { l: 'Why query volume is the signal', b: 'CDI queries are documentation failures made visible. Each query represents a clinical condition that was known but not captured with enough specificity for coding purposes. Reducing queries means the notes are arriving complete.' },
            { l: 'The lag', b: "DRG accuracy is a lagging metric — it shows up in claims data, which has a 30–90 day lag from service to final code. CDI query volume is the leading signal you can watch in real time." },
          ],
        },
      },
      {
        key: 'cmi', label: 'CMI ↑', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'The average DRG relative weight across all discharges — the single most useful summary of the mix and complexity of cases a hospital manages. A CMI of 2.0 means cases are, on average, twice as resource-intensive as the national base.' },
            { l: 'Data source', b: 'Claims data. Tracked monthly by finance and CDI. Compare Abridge provider cohort to non-Abridge cohort — or same providers pre/post adoption — with sufficient discharge volume for statistical significance.' },
            { l: 'Peer benchmarking', b: "Compare your CMI to peer hospitals with similar payor mix and patient population using CMS IPPS data. If your CMI is consistently below peers with similar complexity, documentation is likely the gap — not case mix." },
          ],
        },
      },
      {
        key: 'denials', label: 'Denial Rate ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'Claims denied by payers for documentation-related reasons — primarily medical necessity failures on concurrent review of inpatient stays.' },
            { l: 'Data source', b: 'Revenue cycle system. Isolate documentation-related denials from total denial volume. The subset where the denial reason cites insufficient documentation of medical necessity or level of care is the attributable bucket.' },
            { l: 'The concurrent review connection', b: "Payers audit continued inpatient stays by reading daily progress notes. When notes capture the clinical reasoning for why the patient still requires inpatient-level care — not just what was done — concurrent review is far more defensible." },
          ],
        },
      },
    ],
    timeline: {
      signal: {
        window: 'Week 4–8',
        desc: 'Documentation behavior shifts',
        metrics: [
          { name: 'Admission Note Completeness Score ↑', source: 'CDI or coding team note audit (sampled) · presence of key documentation elements per admission · trended monthly', badge: 'Week 6–10', why: "Admission note quality sets the DRG. When clinical reasoning, comorbidities, and presenting complexity are captured in real time, downstream query volume drops and coding starts from a complete record rather than a partial one." },
          { name: 'CDI Query Rate per Provider ↓', source: 'CDI team data · queries per attending per month · Abridge providers vs. baseline · tracked daily by CDI teams', badge: 'Week 4–8', why: "CDI query rate is the most operationally immediate revenue signal for inpatient. Each query represents a documentation gap that required human follow-up. When Abridge captures clinical complexity in real time, queries become unnecessary — and this is measurable within weeks, well before DRG or CMI data has time to move." },
        ],
        callout: "Why start here: CDI query rates, CC/MCC capture, and case mix index all depend on documentation completeness arriving at the point of care — they can't improve if note specificity isn't changing first.",
      },
      trend: {
        window: 'Month 1–6',
        desc: 'CDI and coding signals emerge',
        metrics: [
          { name: 'Claims Rework Staff Hours ↓', source: 'RCM system or billing team logs · staff hours per week spent reworking denied or rejected inpatient claims · trended monthly', badge: 'Month 2–4', why: "Inpatient claims average $15K–$20K per admission, making each documentation-related denial proportionally more costly to rework than outpatient. Tracking staff hours on rework isolates the operational burden of poor documentation before denial rate numbers themselves move — and it's a metric the revenue cycle team can pull without waiting for quarterly reports." },
          { name: 'CC/MCC Capture Rate ↑', source: 'CDI or coding team · % of eligible admissions with CC or MCC codes assigned · Abridge providers vs. control cohort', badge: 'Month 3–5', why: "As CDI query rate falls, CC/MCC capture should rise — confirming that documentation specificity is translating into accurate DRG coding. This is a direct revenue metric: CC/MCC codes determine DRG weight, and DRG weight determines reimbursement." },
          { name: 'DRG Downgrade Rate', source: 'Revenue cycle · % of DRGs downgraded on coding review or payer challenge · documentation-related downgrades specifically', badge: 'Month 3–6', why: "Payers challenge DRG assignments when the supporting documentation is vague. Declining downgrade rate means notes are holding up to payer review — direct revenue protection." },
        ],
        callout: "The CC/MCC capture story: Track this at the provider level, not just in aggregate. Providers who adopt Abridge consistently often show CC/MCC improvement within their own patient cohort before it shows up in hospital-wide CMI data.",
      },
      proof: {
        window: 'Month 6–12',
        desc: 'CMI and denial trends confirm',
        metrics: [
          { name: 'Case Mix Index vs. Peer Benchmark', source: 'CMS IPPS data or internal finance · Abridge provider cohort vs. pre-Abridge baseline · requires sufficient discharge volume', badge: 'Month 6–12', why: "CMI is the aggregate expression of documentation completeness — how complex your documented patient population is relative to peers. Rising CMI reflects better capture of care actually delivered." },
          { name: 'Denial Rate (Documentation-Related)', source: 'Revenue cycle · documentation-related denials per 100 claims · isolated from coding and eligibility denials', badge: 'Month 6–12', why: "Documentation denials are preventable. Declining rate is the proof that note quality is consistently meeting payer standards — the financial expression of the documentation completeness story." },
        ],
        callout: "The peer benchmark frame: If your CMI is improving while peers are flat, documentation quality is the differentiator. CMS IPPS public data lets you build that comparison — and it's more compelling than a before/after that could be explained by case mix shift.",
      },
    },
  },

  // ── QUALITY ───────────────────────────────────────────────────────────────
  {
    domain: 'QUALITY',
    number: 'Domain 4 of 4',
    badge: 'CDI Quality, Physician Presence & Readmissions',
    northStar: '30-Day Readmission Rate',
    direction: '↓',
    northStarSub: "Documentation drives readmission performance through two paths: clinical specificity that reduces CDI queries and enables accurate risk adjustment — and the physician presence that ambient documentation creates at the bedside. A hospitalist who is not navigating the EHR during rounds is fully present with the patient. HCAHPS measures that. Readmissions are the proof.",
    matterBoxes: [
      {
        tag: 'CMO / VP Quality',
        body: "Your HRRP report shows excess readmissions in any of the 6 penalized conditions, your HCAHPS doctor communication composite is below the 50th percentile, your CDI team is running above 4 queries per provider per month, or your VBP Total Performance Score is being dragged down by patient experience.",
      },
      {
        tag: 'CFO',
        body: "HRRP imposes up to 3% penalties on all base Medicare DRG payments — not just penalized conditions — for hospitals with excess readmissions in 6 high-volume conditions. HCAHPS doctor communication drives 25% of the VBP Total Performance Score, putting 2% of base Medicare payments at risk from a single domain.",
      },
    ],
    matterLayout: '2col',
    chain: [
      { key: 'source', label: 'Abridge Ambient', sub: 'hospital documentation AI', isSource: true },
      {
        key: 'cdiqueries', label: 'CDI Query Rate ↓', sub: 'documentation specificity improving',
        detail: {
          cols: [
            { l: 'What it measures', b: "CDI queries per attending per month — each query represents a note that lacked the specificity needed for accurate DRG and severity assignment. Typical range: 2–8 queries per provider per month. Target is below 1." },
            { l: 'Why it falls with Abridge', b: "When the attending narrates clinical reasoning at the bedside and Abridge captures it, the diagnostic specificity CDI would query is already in the note. 'Iron deficiency anemia' instead of 'anemia.' 'Acute systolic heart failure' instead of 'CHF.' The query becomes unnecessary." },
            { l: 'The dual impact', b: "Lower CDI query rate signals better documentation quality AND reduces the query-response cycle that occupies physician time. It's the earliest quality signal and a workforce efficiency indicator simultaneously." },
          ],
          grad: "When CDI query rate per provider reaches a stable low, documentation specificity has genuinely changed — not just occasionally, but consistently. Start watching HCAHPS doctor communication scores as the patient experience confirmation.",
        },
      },
      {
        key: 'presence', label: 'Physician Presence at Bedside ↑', sub: 'less time in the chart, more time with the patient',
        detail: {
          cols: [
            { l: 'The mechanism', b: "When documentation is captured automatically during rounds, the physician's full attention is on the patient — not on remembering what needs to go in the note later. HCAHPS 'Doctor Communication' measures this: whether the doctor listened, explained, and was present." },
            { l: 'The VBP connection', b: "Doctor communication is one of four HCAHPS domains driving 25% of the VBP Total Performance Score. A 5-point improvement in the doctor communication composite can shift a hospital from the 40th to the 60th percentile — crossing the VBP bonus threshold." },
            { l: 'How to observe it', b: "After-hours EHR session time falling is the operational signal. Rising HCAHPS doctor communication scores are the patient-experience confirmation — typically visible at the 2–3 quarter mark after rollout." },
          ],
        },
      },
      {
        key: 'hcahps', label: 'HCAHPS Doctor Communication ↑', sub: '25% of VBP Total Performance Score', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: "The patient's perception of doctor communication — whether the doctor communicated clearly, listened carefully, and was present. Composite score 0–100; national average ~79; top quartile ~88." },
            { l: 'Why it connects to documentation', b: "A physician navigating the EHR during a patient conversation is visibly not listening. Ambient documentation removes the keyboard from the interaction — and patients notice. Multiple health systems report HCAHPS doctor communication scores moving within 3–4 months of ambient deployment." },
            { l: 'Financial stake', b: "HCAHPS drives 25% of VBP TPS. Hospitals scoring below peers in doctor communication are leaving real payment adjustments on the table — adjustments tied directly to whether the physician was present during the encounter." },
          ],
        },
      },
      {
        key: 'readmission', label: '30-Day Readmission Rate ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: "The rate of patients readmitted within 30 days — the most scrutinized quality metric in hospital medicine, publicly reported, and the basis for HRRP penalties on all Medicare DRG payments in hospitals with excess readmissions in 6 conditions: AMI, HF, pneumonia, CABG, COPD, and hip/knee replacement." },
            { l: 'The documentation chain', b: "Complete H&P and progress notes inform post-acute placement. Complete consult notes ensure specialist recommendations are available at the time of discharge. Complete medication reconciliation reduces the information gaps that send patients back. The discharge summary — completed while the encounter is still in memory — is the care transition document that prevents the preventable readmission." },
            { l: 'Attribution note', b: "30-day readmission has many drivers. We don't claim documentation alone drives the outcome. We claim that documentation gaps are a measurable contributor, and that Abridge closes those gaps. Track alongside CDI query rate and discharge summary timeliness to build the causal chain." },
          ],
        },
      },
    ],
    timeline: {
      signal: {
        window: 'Week 4–8',
        desc: 'CDI query rate moves first',
        metrics: [
          { name: 'Clinical Reasoning Capture Rate ↑', source: 'CDI audit sample · presence of differential reasoning, decision rationale, and plan specificity in progress notes · quarterly review', badge: 'Week 6–10', why: "Quality measure compliance depends on documented reasoning, not just documented actions. This tracks whether notes contain the clinical thinking required for measure attribution — the most direct leading indicator of quality measure improvement." },
          { name: 'Same-Shift Progress Note Completion Rate ↑', source: 'EHR audit logs · progress notes signed before shift end · per-provider · pre/post comparison', badge: 'Week 4–8', why: "Same-shift note completion is the first observable signal that documentation quality is improving. Notes completed during rounds capture clinical reasoning at the moment it occurs rather than reconstructed hours later — the quality story starts here." },
        ],
        callout: "Why start here: CDI query rate is the earliest quality signal and requires no additional data infrastructure — CDI teams already track it daily. It's the proof that documentation specificity has changed before any quality program data becomes available.",
      },
      trend: {
        window: 'Month 2–6',
        desc: 'Patient experience and discharge signals emerge',
        metrics: [
          { name: 'Core Measure Documentation Rate ↑', source: 'Quality team review · percentage of discharges with required core measure documentation elements present · trended quarterly', badge: 'Month 3–6', why: "Core measure compliance requires documentation of specific clinical events and decisions — sepsis bundles, VTE prophylaxis, pneumonia vaccination. As documentation completeness improves with Abridge, attribution to core measures follows. This is the trend-stage leading indicator before HRRP and VBP scores move." },
          { name: 'Discharge Summary Timeliness', source: 'HIM / EHR data · hours from patient discharge to signed discharge summary · Abridge providers vs. baseline', badge: 'Month 2–5', why: "The discharge summary is the care transition document that the next provider needs before the patient gets readmitted. When ambient documentation reduces the burden of producing it, the clock from discharge to signed handoff shortens." },
          { name: 'HCAHPS Doctor Communication Composite', source: 'HCAHPS survey results · doctor communication composite score · quarterly CAHPS data · Abridge provider cohort vs. non-Abridge', badge: 'Month 3–6', why: "Doctor communication is the fastest-moving HCAHPS domain when documentation burden falls — because it directly measures whether the physician was present in the encounter. When the keyboard is out of the interaction, patients notice within 2–3 survey cycles." },
        ],
        callout: "The HCAHPS bridge: Doctor communication composite drives 25% of VBP TPS. A 5-point improvement can shift a hospital toward the VBP bonus threshold — tied directly to whether the physician was present during rounds.",
      },
      proof: {
        window: 'Month 9–18',
        desc: 'Readmission rate and VBP performance confirm',
        metrics: [
          { name: '30-Day Readmission Rate (HRRP Conditions)', source: 'CMS HRRP report or internal quality data · risk-adjusted readmission rate · Abridge provider cohort vs. non-Abridge · AMI, HF, pneumonia, CABG, COPD, hip/knee', badge: 'Month 9–18', why: "The lagging proof metric. HRRP penalties are calculated annually across 6 high-volume conditions. Declining readmission rate in these conditions is the financial and quality confirmation that the discharge documentation chain is working." },
          { name: 'VBP Total Performance Score', source: 'CMS VBP program · hospital-level TPS trended annually · HCAHPS doctor communication contributes 25% of patient experience domain weight', badge: 'Month 9–18', why: "VBP TPS determines the sign of the Medicare payment adjustment — bonus or penalty. HCAHPS doctor communication drives 25% of the patient experience domain. Hospitals above the 50th percentile receive bonuses; hospitals below receive penalties. Moving the doctor communication composite by 5–10 points changes that calculation." },
        ],
        callout: "The long game: Readmission rate and VBP TPS change slowly. The strategy is to prove CDI query reduction early (Week 4–8), show HCAHPS doctor communication improvement at Month 3–6, and let readmission rate and VBP scores confirm the story as they mature.",
      },
    },
  },
];

// ─── Value Architecture Data ──────────────────────────────────────────────────

const ipFramework: FrameworkItem[] = [
  {
    domain: 'CAPACITY',
    tag: 'modeled',
    narrative: "Under DRG reimbursement, each day a patient stays beyond the expected length of stay represents an avoidable cost — the difference between what the payer covers and what the day costs. Documentation-attributed discharge delays occur when progress notes aren't completed in time to support a discharge order, or when the clinical rationale isn't present in the chart. The model estimates savings from reducing documentation-related delays specifically — not total LOS improvement, which has many drivers beyond documentation.",
    chain: ['Progress Note Timeliness ↑', 'Discharge Documentation Complete ↑', 'Documentation-Attributed Delays ↓'],
    chainOutput: 'Avoidable Days ↓',
    steps: [
      {
        vars: [
          { v: 'Annual discharges', kind: 'input' },
          { v: '% with doc-attributed discharge delay', kind: 'input' },
        ],
        result: 'Delay events/year',
      },
      {
        vars: [
          { v: 'Delay events/year', kind: 'derived' },
          { v: 'Expected reduction with ambient', kind: 'benchmark', hint: '~30–45%' },
          { v: 'Avg delay duration (days)', kind: 'benchmark', hint: '~0.5–1.0' },
        ],
        result: 'Avoidable days recovered',
      },
      {
        vars: [
          { v: 'Avoidable days recovered', kind: 'derived' },
          { v: 'Per-diem cost differential', kind: 'input' },
        ],
        result: 'Avoidable day savings',
        isFinal: true,
      },
    ],
  },
  {
    domain: 'WORKFORCE',
    tag: 'modeled',
    narrative: "Hospitalists carry documentation obligations across every patient on their panel — progress notes, discharge summaries, and consultation responses that accumulate across a shift. Documentation that isn't completed during rounds often extends into evenings and weekends. Industry sources estimate hospitalist and inpatient physician replacement costs at $350K–$500K per departure, reflecting the competitive recruiting environment, locum coverage, and onboarding time. The model attributes only a defensible fraction of departures to documentation rather than claiming all turnover stems from it.",
    chain: ['Round Documentation Burden ↓', 'Post-Shift EHR Time ↓', 'Provider Wellbeing ↑', 'Intent to Stay ↑'],
    chainOutput: 'Voluntary Turnover ↓',
    steps: [
      {
        vars: [
          { v: 'Annual voluntary departures', kind: 'input' },
          { v: 'Documentation-attributable fraction', kind: 'benchmark', hint: '~20–30%' },
          { v: 'Expected improvement with ambient', kind: 'benchmark', hint: '~25–35%' },
        ],
        result: 'Est. departures avoided/yr',
      },
      {
        vars: [
          { v: 'Est. departures avoided', kind: 'derived' },
          { v: 'Hospitalist replacement cost', kind: 'benchmark', hint: '$350K–$500K' },
        ],
        result: 'Estimated retention savings',
        isFinal: true,
      },
    ],
    note: 'Modeled when burnout survey or intent-to-stay data is available. Treated as a leading indicator otherwise.',
  },
  {
    domain: 'REVENUE',
    tag: 'modeled',
    narrative: "Inpatient documentation quality drives revenue through two distinct mechanisms. First, DRG accuracy: when clinical reasoning is captured in real time, CC/MCC codes are preserved — the complication and comorbidity specificity that drives DRG weight and case mix index. Every missed CC shifts a DRG by 0.3–0.5 weight points; every missed MCC by 0.5–1.0. Second, admission status defense: payers audit inpatient stays post-discharge and reclassify to observation APC status when medical necessity documentation is insufficient. The financial consequence is the IP-to-obs revenue delta — typically $3K–$8K per downgraded case. Both mechanisms are modeled separately because they have different triggers, different defensibility arguments, and different activation rates.",
    chain: ['Clinical Documentation Specificity ↑', 'CC/MCC Capture Rate ↑', 'CDI Query Rate ↓'],
    chainOutput: 'Case Mix Index ↑ + Obs Downgrades ↓',
    steps: [
      {
        vars: [
          { v: 'Eligible encounters', kind: 'input' },
          { v: '% admissions with at-risk DRG', kind: 'input' },
          { v: '% protected with ambient doc', kind: 'benchmark', hint: '15–25%' },
          { v: 'DRG weight increase per protected case', kind: 'input' },
          { v: 'Hospital base rate', kind: 'input' },
        ],
        result: 'DRG accuracy value',
      },
      {
        vars: [
          { v: 'Eligible encounters', kind: 'input' },
          { v: '% downgrade rate (IP → obs)', kind: 'input' },
          { v: 'IP-to-obs revenue delta per case', kind: 'benchmark', hint: '~$3K–$8K' },
          { v: '% doc-preventable (scenario)', kind: 'benchmark', hint: 'Conservative 25% / Typical 40% / Aggressive 55%' },
        ],
        result: 'Obs defense value',
      },
      {
        vars: [
          { v: 'DRG accuracy value', kind: 'derived' },
          { v: 'Obs defense value', kind: 'derived', op: '+' },
          { v: 'Realization haircut', kind: 'input' },
        ],
        result: 'Total estimated revenue',
        isFinal: true,
      },
    ],
  },
  {
    domain: 'QUALITY',
    tag: 'tracked',
    narrative: "The inpatient quality story runs through physician presence and documentation specificity — and tracks as a leading-to-lagging chain. CDI query rate is the leading signal: when ambient documentation captures clinical reasoning at the point of care, CDI has fewer gaps to query. HCAHPS doctor communication is the patient experience signal: a physician not navigating the EHR during rounds is present in the encounter — and patients report it within 2–3 survey cycles. 30-day readmission rate is the lagging proof: complete discharge documentation enables the post-acute coordination that prevents the preventable readmission. VBP and HRRP create real financial stakes — but program payouts use CMS-specific formulas and are tracked directionally rather than modeled.",
    chain: ['CDI Query Rate ↓', 'Physician Presence at Bedside ↑', 'HCAHPS Doctor Communication ↑'],
    chainOutput: '30-Day Readmission Rate ↓',
    note: "Tracked signals: CDI query rate per provider (leading — Week 4–8), HCAHPS doctor communication composite (patient experience — Month 3–6), 30-day readmission rate (lagging proof — Month 9–18). VBP TPS and HRRP penalty exposure provide financial stakes but are not modeled in dollar terms.",
  },
];

// ─── Personas & Discovery Questions ──────────────────────────────────────────

const ipFrameworkPersonas: Record<DomainName, string[]> = {
  CAPACITY:  ['COO', 'Hospitalist Director'],
  WORKFORCE: ['CMO', 'CHRO'],
  REVENUE:   ['CFO', 'CDI Director'],
  QUALITY:   ['CMO', 'VP Quality', 'CFO'],
};

const ipFrameworkQuestions: Record<DomainName, string[]> = {
  CAPACITY: [
    'What fraction of your average length of stay is documentation-related — meaning the patient is clinically ready but the discharge summary isn\'t done?',
    'How are you measuring discharge-before-noon performance, and does documentation completion time factor into that metric?',
    'When a bed clears late due to documentation delay, what\'s the downstream cost to operations — and are you capturing that anywhere?',
  ],
  WORKFORCE: [
    'What does post-shift EHR activity look like for your hospitalists — are they commonly charting evenings or weekends?',
    'How are you measuring hospitalist burnout right now, and has documentation come up as a specific driver in exit interviews?',
    'What\'s it costing you to replace a hospitalist — and do you know how many recent departures were documentation-related?',
  ],
  REVENUE: [
    'What\'s your current case mix index, and does your CDI team believe the documentation is reflecting the full complexity of care you\'re delivering?',
    'How many CDI queries is your team issuing per 100 discharges, and what\'s the query response rate?',
    'Are there DRG weight losses on your high-complexity cases that your CDI team attributes to documentation gaps?',
  ],
  QUALITY: [
    'How many CDI queries is your team issuing per attending per month — and when you ask CDI, do they believe the query volume is coming down or holding steady?',
    'What does your HCAHPS doctor communication composite look like relative to peer benchmark — and has documentation burden come up in any conversation about patient experience?',
    'Are you currently in HRRP penalty status for any of the 6 conditions, or tracking close to the excess readmission threshold in any of them?',
  ],
};

// ─── Value Architecture Component ────────────────────────────────────────────

function IPValueArchitectureSection() {
  const domainOrder: DomainName[] = ['WORKFORCE', 'CAPACITY', 'REVENUE', 'QUALITY'];
  const sortedFramework = [...ipFramework].sort((a, b) => domainOrder.indexOf(a.domain) - domainOrder.indexOf(b.domain));
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['WORKFORCE', 'CAPACITY', 'REVENUE', 'QUALITY']));
  const tagCfg = {
    modeled: { label: 'Modeled', cls: 'bg-[#1A1A1A] text-white' },
    tracked: { label: 'Signal',  cls: 'bg-[#F0EDE8] text-[#666666]' },
  };
  return (
    <div className="mt-10 mb-10">
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#888888] mb-1.5">The Value Architecture</p>
        <h2 className="text-[22px] font-bold text-black tracking-tight">The Evidence Model</h2>
        <p className="text-[13px] text-[#888888] mt-1">Four domains. Each formula shows the full calculation — which numbers are yours, which are industry estimates, and how they chain together.</p>
      </div>
      <div className="divide-y divide-[#EDEBE6] border border-[#E4DDD4] rounded-xl overflow-hidden">
        {sortedFramework.map((item) => {
          const tc = tagCfg[item.tag];
          const isCollapsed = collapsed.has(item.domain);
          const personas = ipFrameworkPersonas[item.domain] ?? [];
          const questions = ipFrameworkQuestions[item.domain] ?? [];
          return (
            <div key={item.domain} className="bg-white">
              <button
                onClick={() => setCollapsed(prev => {
                  const next = new Set(prev);
                  if (next.has(item.domain)) next.delete(item.domain);
                  else next.add(item.domain);
                  return next;
                })}
                className="w-full flex items-center gap-3 px-6 py-5 text-left hover:bg-[#FAFAF8] transition-colors outline-none focus:outline-none"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#444444]">
                  {item.domain.charAt(0) + item.domain.slice(1).toLowerCase()}
                </p>
                <span className={`inline-block text-[9px] font-bold tracking-[0.07em] uppercase px-2.5 py-1 rounded-full whitespace-nowrap ${tc.cls}`}>
                  {tc.label}
                </span>
                <span className="ml-auto flex items-center gap-3">
                  {personas.length > 0 && (
                    <span className="hidden sm:block text-[9px] text-[#C4BBAD] tracking-wide">{personas.join(' · ')}</span>
                  )}
                  <svg className={`w-4 h-4 text-[#BBBBBB] shrink-0 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              {!isCollapsed && (
              <div className="px-6 pb-6">
              <NarrativeText text={item.narrative} />
              <div className="mb-4" style={{ borderLeft: "2px solid rgba(234,44,0,0.20)", paddingLeft: 14 }}>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#AAAAAA] mb-1.5">Evidence Chain</p>
                <p className="text-[12px] text-[#666666] leading-[1.55]">
                  {item.chain.join(' → ')}
                  {item.chainOutput && <> → <span className="font-semibold text-[#333333]">{item.chainOutput}</span></>}
                </p>
              </div>
              {item.steps && (
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #EEEAE4" }}>
                  <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "#AAAAAA", marginBottom: 12 }}>The Calculation</p>
                  {item.steps.map((step, si) => (
                    <div key={si} style={{ marginTop: si > 0 ? 20 : 0 }}>
                      {step.vars.map((variable, vi) => {
                        const op = variable.op ?? (vi > 0 ? '×' : '');
                        const isDerived = variable.kind === 'derived';
                        const isBenchmark = variable.kind === 'benchmark' || variable.kind === 'default';
                        const kindLabel = isDerived ? 'carried forward'
                          : variable.kind === 'benchmark' ? (variable.hint ? `est.  ${variable.hint}` : 'industry est.')
                          : variable.kind === 'default' ? (variable.hint ? `assumed  ${variable.hint}` : 'assumed')
                          : 'your input';
                        return (
                          <div key={vi} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, padding: "7px 0", borderBottom: "1px solid #F0EBE4" }}>
                            <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                              <span style={{ width: 14, textAlign: "right", fontFamily: "monospace", fontSize: 13, fontWeight: 300, color: "#C8C0B4", flexShrink: 0 }}>{op}</span>
                              <span style={{ fontSize: 12.5, lineHeight: 1.35, color: isDerived ? '#BBBBBB' : '#1A1A1A' }}>{variable.v}</span>
                            </span>
                            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0, whiteSpace: "nowrap", color: isBenchmark ? '#9A7000' : '#C8C0B8' }}>{kindLabel}</span>
                          </div>
                        );
                      })}
                      <div style={{ borderTop: step.isFinal ? "1.5px solid #1A1A1A" : "1px solid #C8C0B4", marginTop: 2, paddingTop: 8, paddingBottom: 4, display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ width: 14, textAlign: "right", fontFamily: "monospace", fontSize: 13, fontWeight: 300, color: step.isFinal ? "#1A1A1A" : "#AAAAAA", flexShrink: 0 }}>=</span>
                        <span style={{ fontSize: step.isFinal ? 13 : 12.5, fontWeight: step.isFinal ? 700 : 600, color: step.isFinal ? '#1A1A1A' : '#555555', letterSpacing: step.isFinal ? '-0.01em' : 'normal' }}>{step.result}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {item.note && (
                <p className="text-[11px] text-[#888888] leading-relaxed mt-3">{item.note}</p>
              )}
              {questions.length > 0 && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #EEEAE4" }}>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#CCCCCC", marginBottom: 8 }}>Discovery Questions</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {questions.map((q, i) => (
                      <p key={i} style={{ fontSize: 11.5, color: "#AAAAAA", fontStyle: "italic", lineHeight: 1.5 }}>{q}</p>
                    ))}
                  </div>
                </div>
              )}
              </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Chain Node Component ─────────────────────────────────────────────────────

function ChainNodeBtn({
  node,
  isActive,
  onClick,
}: {
  node: ChainNode;
  isActive: boolean;
  onClick: () => void;
}) {
  const base = "flex-shrink-0 px-4 py-2.5 rounded-lg border text-[11px] font-semibold text-center leading-tight select-none transition-all duration-150 outline-none focus:outline-none";

  let cls = base;
  if (node.isSource) {
    cls += " bg-[#EA2C00] border-[#EA2C00] text-white cursor-default";
  } else if (node.isOutcome) {
    cls += isActive
      ? " bg-[#1A1A1A] border-[#1A1A1A] border-solid text-white -translate-y-0.5 shadow-lg shadow-black/20 cursor-pointer"
      : " bg-[#FAF6EF] border-[#E0D4C0] border-dashed text-[#665544] hover:bg-[#F2EAE0] hover:border-[#D0C0A8] cursor-pointer";
  } else {
    cls += isActive
      ? " bg-[#1A1A1A] border-[#1A1A1A] text-white -translate-y-0.5 shadow-lg shadow-black/20 cursor-pointer"
      : " bg-[#FAFAFA] border-[#E4E4E4] text-[#333] hover:border-[#C8C8C8] hover:bg-[#F4F4F4] hover:-translate-y-px hover:shadow-md cursor-pointer";
  }

  return (
    <button className={cls} onClick={onClick} disabled={!!node.isSource}>
      <span className="whitespace-nowrap">{node.label}</span>
      {node.sub && (
        <span className={`block text-[9px] font-medium mt-0.5 whitespace-nowrap ${node.isSource ? 'text-white/40' : isActive ? 'text-white/55' : 'text-[#888888]'}`}>
          {node.sub}
        </span>
      )}
    </button>
  );
}

// ─── IP Domain Card ───────────────────────────────────────────────────────────

function IPDomainCard({ data }: { data: IPDomainCardData }) {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<'s' | 't' | 'p'>('s');
  const [activeMetric, setActiveMetric] = useState<number | null>(null);

  const mainChain = data.chain.filter(n => !n.isOutcome);
  const outcomes = data.chain.filter(n => n.isOutcome);

  function handleNodeClick(node: ChainNode) {
    if (!node.isSource && node.detail) {
      setActiveNode(prev => (prev === node.key ? null : node.key));
    }
  }

  const activeDetail = data.chain.find(n => n.key === activeNode)?.detail ?? null;
  const stageMap = { s: data.timeline.signal, t: data.timeline.trend, p: data.timeline.proof };
  const stageLabels = { s: 'Signal', t: 'Trend', p: 'Proof' };
  const currentStage = stageMap[activeStage];

  return (
    <div className="rounded-xl overflow-hidden border border-[#E5E5E5] mb-5 bg-white shadow-sm">

      {/* ── HERO ── */}
      <div className="px-8 pt-7 pb-6 bg-white">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#999999] mb-1.5">{data.number} · Inpatient</p>
            <p className="text-base font-bold text-[#1A1A1A]">{data.domain.charAt(0) + data.domain.slice(1).toLowerCase()}</p>
          </div>
          <div className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-medium text-[#EA2C00] border border-[#EA2C00]/30 bg-[#EA2C00]/[0.06] whitespace-nowrap">
            {data.badge}
          </div>
        </div>

        <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-[#999999] mb-3">North Star Outcome</p>
        <div className="text-[40px] font-extrabold leading-none tracking-tight text-[#1A1A1A] mb-3">
          {data.northStar}{' '}
          <span className="text-[#EA2C00] font-light text-[36px]">{data.direction}</span>
        </div>
        <p className="text-sm text-[#888888] leading-relaxed max-w-[640px]">{data.northStarSub}</p>
      </div>

      <div className="bg-[#FAF6EF] px-8 py-5 border-t border-b border-[#EDE8E0]">
        <div className={data.matterLayout === '2col' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
          {data.matterBoxes.map((box, i) => (
            <div key={i} className="p-4 rounded-xl bg-white border border-[#E8DDD0]">
              <p className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#777777] mb-1.5">{box.tag}</p>
              <p className="text-[13px] text-[#555555] leading-[1.55]">{box.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CAUSAL CHAIN ── */}
      <div className="px-8 py-6 border-b border-[#F0F0F0]">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold tracking-[0.11em] uppercase text-[#888888]">How Abridge supports progress toward this outcome</p>
          <p className="text-[11px] text-[#888888] italic">Click any step to explore</p>
        </div>

        <div className="flex items-center overflow-x-auto pb-0.5">
          {mainChain.map((node, i) => (
            <div key={node.key} className="flex items-center flex-shrink-0">
              {i > 0 && <span className="flex-shrink-0 mx-1.5 text-[#999999] text-sm">→</span>}
              <ChainNodeBtn node={node} isActive={activeNode === node.key} onClick={() => handleNodeClick(node)} />
            </div>
          ))}
          {outcomes.length > 0 && (
            <>
              <span className="flex-shrink-0 mx-1.5 text-[#999999] text-sm">→</span>
              <div className="flex-shrink-0 flex flex-col gap-1.5 border-l border-[#D4D4D4] pl-3 ml-0.5">
                {outcomes.map(node => (
                  <ChainNodeBtn key={node.key} node={node} isActive={activeNode === node.key} onClick={() => handleNodeClick(node)} />
                ))}
              </div>
            </>
          )}
        </div>

        {activeDetail && (
          <motion.div
            key={activeNode}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-4 bg-[#FAF6EF] border border-[#E8DDD0] rounded-xl p-5"
          >
            <div className="grid grid-cols-3 gap-5">
              {activeDetail.cols.map((col, i) => (
                <div key={i}>
                  <p className="text-[9px] font-bold tracking-[0.1em] uppercase text-[#A89078] mb-1.5">{col.l}</p>
                  <p className="text-[12px] text-[#444] leading-relaxed">{col.b}</p>
                </div>
              ))}
            </div>
            {activeDetail.grad && (
              <div className="mt-3.5 px-3.5 py-2.5 bg-white border border-[#E0D4C0] rounded-lg text-[12px] text-[#555] leading-relaxed">
                <span className="font-semibold">Graduation signal:</span> {activeDetail.grad}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* ── TIMELINE ── */}
      <div className="px-8 py-6">
        <p className="text-[10px] font-bold tracking-[0.11em] uppercase text-[#888888] mb-4">What to track — and when to expect movement</p>

        <div className="flex border border-[#E4E4E4] rounded-xl overflow-hidden mb-0">
          {(['s', 't', 'p'] as const).map((s) => {
            const stage = stageMap[s];
            const isOpen = activeStage === s;
            return (
              <button
                key={s}
                onClick={() => { setActiveStage(s); setActiveMetric(null); }}
                className={`flex-1 px-4 py-3.5 text-left transition-colors duration-150 border-r border-[#E4E4E4] last:border-r-0 outline-none focus:outline-none ${isOpen ? 'bg-[#1A1A1A]' : 'bg-white hover:bg-[#FAFAFA]'}`}
              >
                <p className={`text-[9px] font-bold tracking-[0.12em] uppercase mb-1 ${isOpen ? 'text-white/[0.28]' : 'text-[#888888]'}`}>{stageLabels[s]}</p>
                <p className={`text-[15px] font-bold leading-none ${isOpen ? 'text-white' : 'text-[#1A1A1A]'}`}>{stage.window}</p>
                <p className={`text-[11px] mt-0.5 ${isOpen ? 'text-white/[0.32]' : 'text-[#888888]'}`}>{stage.desc}</p>
              </button>
            );
          })}
        </div>

        <motion.div
          key={activeStage}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          className="border border-[#E4E4E4] border-t-0 rounded-b-xl overflow-hidden bg-white"
        >
          {currentStage.metrics.map((metric, i) => {
            const isMetricOpen = activeMetric === i;
            return (
              <div key={i} className="border-b border-[#F4F4F4] last:border-b-0">
                <button
                  onClick={() => setActiveMetric(isMetricOpen ? null : i)}
                  className={`w-full flex items-center gap-4 px-5 py-3.5 text-left border-l-[3px] transition-all outline-none focus:outline-none ${isMetricOpen ? 'bg-[#FAF6EF] border-l-[#EA2C00]' : 'bg-white border-l-transparent hover:bg-[#FAFAFA] hover:border-l-[#E8DDD0]'}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#1A1A1A] mb-0.5">{metric.name}</p>
                    <p className="text-[11px] text-[#888888] leading-snug">{metric.source}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`text-[9px] font-bold tracking-[0.07em] uppercase px-2.5 py-1 rounded whitespace-nowrap ${activeStage === 'p' ? 'bg-[#FAF6EF] text-[#A08060]' : 'bg-[#F4F4F4] text-[#888888]'}`}>
                      {metric.badge}
                    </div>
                    {metric.why && (
                      <svg className={`w-3 h-3 text-[#BBBBBB] transition-transform duration-150 flex-shrink-0 ${isMetricOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </button>
                {isMetricOpen && metric.why && (
                  <div className="px-5 py-3 bg-[#FAF6EF] border-l-[3px] border-l-[#EA2C00]">
                    <p className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#999999] mb-1">Why this metric</p>
                    <p className="text-[12px] text-[#444444] leading-relaxed">{metric.why}</p>
                  </div>
                )}
              </div>
            );
          })}
          {currentStage.callout && (
            <div className="px-5 py-3.5 border-t border-[#EEEBE6] bg-[#FAF7F2] text-[12px] text-[#666] leading-relaxed">
              {currentStage.callout.startsWith('Graduation signal') || currentStage.callout.startsWith('Why') || currentStage.callout.startsWith('The ') ? (
                <>
                  <span className="font-semibold text-[#444]">{currentStage.callout.split(':')[0]}:</span>
                  {currentStage.callout.split(':').slice(1).join(':')}
                </>
              ) : currentStage.callout}
            </div>
          )}
        </motion.div>
      </div>

      <div className="px-8 py-3 border-t border-[#F0F0F0] bg-[#FAF7F2] text-[11px] text-[#777777] leading-relaxed">
        Results vary based on EHR configuration, provider adoption, CDI program maturity, and organizational factors. Timelines represent ranges and should be validated against your organization's baseline data.
      </div>
    </div>
  );
}

// ─── IP Adoption Section ──────────────────────────────────────────────────────

function IPAdoptionSection() {
  const metrics = [
    {
      tag: "Breadth",
      label: "% of hospitalists using ambient",
      why: "Is Abridge in the workflow for most providers, or concentrated in a few early adopters? Coverage below 60–70% makes attribution claims unreliable — the downstream numbers reflect a subpopulation, not the program.",
      source: "Platform analytics / Abridge dashboard",
    },
    {
      tag: "Depth",
      label: "% of encounters using ambient",
      why: "Are providers using it every patient, or selectively? Selective use creates attribution gaps. Downstream metrics only hold when use is consistent across encounters — not just when it's convenient.",
      source: "Platform analytics vs. EHR encounter count",
    },
    {
      tag: "Quality",
      label: "Avg ambient session duration",
      why: "Sessions under 5 minutes typically indicate abandonment before full note capture. Complete inpatient rounding encounters run 10–20 minutes. Duration is the behavioral proof the session actually captured the clinical conversation.",
      source: "Platform analytics",
    },
    {
      tag: "Output",
      label: "% of note completed by ambient vs. manual",
      why: "Confirms the note is Abridge-generated — not opened as a template and then typed over. The higher this percentage, the stronger every downstream attribution claim in this framework.",
      source: "Platform analytics / EHR audit logs",
    },
  ];

  return (
    <div className="mb-10 bg-[#1A1A1A] rounded-lg overflow-hidden">
      <div className="h-[3px] bg-[#EA2C00]" />
      <div className="px-6 pt-6 pb-5">
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-1.5">Non-Negotiable</p>
        <h3 className="text-base font-bold text-white mb-3">Foundational: Adoption & Utilization</h3>
        <p className="text-[13px] text-[#888888] leading-relaxed">
          Every number in this framework is downstream of this section. If adoption is real — consistent, complete, across most providers — the downstream story holds. If adoption is thin, every metric becomes a correlation instead of a cause. These four gates determine attribution. Verify them first, every time.
        </p>
      </div>
      <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="bg-[#242424] rounded-sm p-4 border-l-2 border-[#EA2C00]">
            <p className="text-[9px] font-bold uppercase tracking-[1.5px] text-[#EA2C00] mb-2">{m.tag}</p>
            <p className="text-[13px] text-white font-semibold mb-2">{m.label}</p>
            <p className="text-[12px] text-[#999999] leading-relaxed mb-2.5">{m.why}</p>
            <p className="text-[10px] text-[#555555]">{m.source}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── IP Domain Methodology Section ───────────────────────────────────────────

function IPDomainMethodologySection() {
  const domainOrder: DomainName[] = ['WORKFORCE', 'CAPACITY', 'REVENUE', 'QUALITY'];
  const sortedCards = [...ipDomainCards].sort((a, b) => domainOrder.indexOf(a.domain) - domainOrder.indexOf(b.domain));
  const [activeDomain, setActiveDomain] = useState(sortedCards[0].domain);
  const activeCard = sortedCards.find(c => c.domain === activeDomain)!;

  return (
    <div className="mb-10">
      <div className="mb-6 pb-3 border-b-2 border-[#EA2C00]">
        <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#888888] mb-2">The Inpatient Value Story</p>
        <h2 className="text-[24px] font-bold text-black tracking-tight">Four Domains of Value</h2>
        <p className="text-sm text-[#888888] mt-1">
          Each domain has a distinct North Star outcome, a causal chain showing how Abridge supports it, and a measurement path with honest timelines.
        </p>
      </div>
      <div className="bg-[#F5F0EB] rounded-xl p-1 flex mb-5">
        {sortedCards.map(card => {
          const isActive = activeDomain === card.domain;
          return (
            <button
              key={card.domain}
              onClick={() => setActiveDomain(card.domain)}
              className={`flex-1 px-3 py-3 rounded-lg text-center transition-all duration-150 outline-none focus:outline-none ${isActive ? 'bg-[#1A1A1A] shadow-sm' : 'hover:bg-[#EDE8E2]'}`}
            >
              <p className={`text-[11px] font-bold uppercase tracking-[0.08em] leading-none mb-1 ${isActive ? 'text-white' : 'text-[#888]'}`}>
                {card.domain.charAt(0) + card.domain.slice(1).toLowerCase()}
              </p>
              <p className={`text-[9px] leading-tight truncate ${isActive ? 'text-white/40' : 'text-[#999999]'}`}>
                {card.northStar} {card.direction}
              </p>
            </button>
          );
        })}
      </div>
      <motion.div key={activeDomain} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        <IPDomainCard data={activeCard} />
      </motion.div>
    </div>
  );
}

// ─── Value Arc Section ────────────────────────────────────────────────────────

function IPValueArcSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const stages: { number: string; badge: BadgeType; timing: string; title: string; description: string; activeDomains: DomainName[] }[] = [
    {
      number: "01",
      badge: "Signal",
      timing: "Week 4–8",
      title: "The Provider Feels It",
      description: "H&P and progress note drafts appear in real time. After-shift charting drops measurably. EHR session timestamps show documentation time falling within weeks of consistent use.",
      activeDomains: ["CAPACITY", "WORKFORCE"],
    },
    {
      number: "02",
      badge: "Trend",
      timing: "Month 2–4",
      title: "CDI Notices It",
      description: "Progress note specificity improves. CDI query rates drop as notes capture clinical reasoning without prompting. CC/MCC capture begins moving in claims data.",
      activeDomains: ["QUALITY", "REVENUE"],
    },
    {
      number: "03",
      badge: "Proof",
      timing: "Month 6–18",
      title: "The System Measures It",
      description: "CMI improvement validated against a provider cohort. Medical necessity denial rates traceable to documentation quality. Hospitalist retention signal begins to emerge.",
      activeDomains: ["REVENUE", "WORKFORCE"],
    },
  ];

  return (
    <div ref={ref} className="mb-10 rounded-2xl overflow-hidden" style={{ background: "linear-gradient(160deg, #141210 0%, #1C1714 100%)" }}>
      <div className="px-8 pt-10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <p className="text-[11px] font-bold uppercase tracking-[2.5px] mb-2" style={{ color: "#EA2C00" }}>Value Arc</p>
          <h2 className="text-[24px] font-bold text-white tracking-tight">How Value Accrues Over Time</h2>
          <p className="text-[13px] mt-1.5 max-w-[520px] leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>
            Value doesn't arrive all at once. The sequence is mechanistically predictable — each stage builds on the last.
          </p>
        </motion.div>

        <div className="relative hidden md:block mb-7" style={{ height: 20 }}>
          <div className="absolute left-0 right-0" style={{ top: "50%", height: 1, background: "rgba(255,255,255,0.07)", transform: "translateY(-50%)" }} />
          <motion.div
            className="absolute left-0"
            style={{ top: "50%", height: 1.5, transform: "translateY(-50%)", background: "linear-gradient(90deg, rgba(234,44,0,0.35) 0%, #EA2C00 100%)", borderRadius: 2 }}
            initial={{ width: "0%" }}
            animate={isInView ? { width: "100%" } : {}}
            transition={{ duration: 2.0, ease: "linear", delay: 0.5 }}
          />
          <div className="relative grid grid-cols-3 gap-3 h-full">
            {stages.map((_, i) => (
              <div key={i} className="flex justify-center items-center">
                <motion.div
                  style={{ width: 8, height: 8, borderRadius: "50%", background: "#EA2C00", position: "relative", zIndex: 1 }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={isInView ? { scale: 1, opacity: 1 } : {}}
                  transition={{ delay: 0.5 + 2.0 * ([1 / 6, 1 / 2, 5 / 6][i]), duration: 0.22, ease: "backOut" }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {stages.map((stage, i) => (
            <motion.div
              key={stage.badge}
              initial={{ opacity: 0, y: 14 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: [0.85, 1.5, 2.1][i], ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-xl p-6 overflow-hidden flex flex-col"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div
                className="absolute bottom-1 right-2.5 text-[44px] font-black leading-none select-none pointer-events-none"
                style={{ color: "rgba(255,255,255,0.04)", fontVariantNumeric: "tabular-nums" }}
              >
                {stage.number}
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.35)" }}>{stage.badge}</span>
                <span className="text-[11px] font-medium tabular-nums" style={{ color: "rgba(255,255,255,0.28)" }}>{stage.timing}</span>
              </div>
              <p className="text-[19px] font-bold text-white tracking-tight leading-snug mb-2">{stage.title}</p>
              <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{stage.description}</p>
              <div className="flex flex-wrap gap-1.5 pt-4 mt-auto" style={i < 2 ? { borderTop: "1px solid rgba(255,255,255,0.07)" } : undefined}>
                {stage.activeDomains.map(d => (
                  <span key={d} className="rounded-sm px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide" style={{ background: "rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.65)" }}>
                    {d}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MethodologyInpatient({ onBack, onHome, onNavigateToSetting, onBuildModel }: MethodologyInpatientProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await generateMethodologyPDF("inpatient");
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF export failed. Please try again or check your browser settings.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onHome ?? onBack} className="flex items-center cursor-pointer bg-transparent border-none p-0" data-testid="link-home-logo">
              <img src={abridgeLogo} alt="Abridge" className="h-5 md:h-6" />
            </button>
            <span className="text-[#E5E5E5]">|</span>
            <button onClick={onBack} className="flex items-center gap-1 text-[#666666] hover:text-black transition-colors" data-testid="button-back">
              <ArrowLeft className="w-3 h-3" />
              <span className="text-xs font-medium uppercase tracking-wide">Value Story</span>
            </button>
          </div>
          <button onClick={handleExportPDF} disabled={isExporting} className="flex items-center gap-2 text-[#666666] hover:text-black transition-colors text-sm disabled:opacity-50" data-testid="button-export-pdf">
            <Download className="w-4 h-4" />
            <span>{isExporting ? "Exporting..." : "Export PDF"}</span>
          </button>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-12">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#EA2C00] mb-4">Inpatient</p>
          <h1 className="text-[32px] md:text-[40px] font-bold text-black leading-tight tracking-tight mb-4">
            How We Think<br />About Value
          </h1>
          <p className="text-[15px] text-[#666666] max-w-[560px] mx-auto leading-relaxed">
            H&P notes, progress notes, and consult documentation — the three note types where documentation quality becomes DRG accuracy and clinician time.
          </p>
        </motion.div>

        <IPValueArcSection />

        <IPDomainMethodologySection />

        <IPValueArchitectureSection />

        <motion.div className="mt-4 mb-10 bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] rounded-lg p-8 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="text-xl font-bold text-white mb-2">Ready to Build Your Model?</h3>
          <p className="text-[#999999] mb-6 text-sm">Use these methodology principles to create a customized ROI model for your hospitalist program.</p>
          <button onClick={onBuildModel ?? onBack} className="inline-flex items-center gap-2 bg-[#EA2C00] hover:bg-[#D12600] text-white font-medium px-6 py-3 rounded-lg transition-colors" data-testid="button-build-model">
            Build an Inpatient Model <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        <p className="text-xs text-[#888888] leading-relaxed mb-6">Projections are modeled estimates based on user-provided inputs, published industry benchmarks, and aggregated deployment experience. Actual results may vary based on implementation approach, provider adoption, organizational factors, and care setting.</p>

        <div className="mb-8">
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Related Methodologies</p>
          <div className="grid md:grid-cols-3 gap-4">
            <button onClick={() => onNavigateToSetting?.("ed")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-ed">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Activity className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Emergency</p><p className="text-xs text-[#888888]">Admissions originate here</p></div>
            </button>
            <button onClick={() => onNavigateToSetting?.("nursing")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-nursing">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Heart className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Nursing</p><p className="text-xs text-[#888888]">Inpatient nursing documentation</p></div>
            </button>
            <button onClick={() => onNavigateToSetting?.("outpatient")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-outpatient">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Stethoscope className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Outpatient</p><p className="text-xs text-[#888888]">Post-discharge follow-up</p></div>
            </button>
          </div>
        </div>
      </div>

      {isExporting && (
        <div className="fixed bottom-4 right-4 bg-[#EA2C00] text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50" data-testid="toast-pdf-download">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Preparing your PDF...</span>
        </div>
      )}
    </div>
  );
}
