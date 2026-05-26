import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowLeft, Download, ArrowRight, Activity, Stethoscope, Heart, Loader2 } from "lucide-react";
import { generateMethodologyPDF } from "@/lib/methodology-pdf-export";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';
import {
  CollapsibleSection,
  ImpactBadge,
  NarrativeText,
  type BadgeType,
  type DomainName,
} from "@/components/methodology/MethodologyShared";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MethodologyInpatientProps {
  onBack: () => void;
  onNavigateToSetting?: (setting: string) => void;
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
        tag: 'Matters most if…',
        body: "Utilization management is flagging documentation gaps as a reason for delayed discharge orders, your avoidable day rate is above peer benchmark, or CDI query loops are slowing down the discharge planning process.",
      },
    ],
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
        window: 'Week 4–8',
        desc: 'Note timeliness moves',
        metrics: [
          { name: 'Progress Note Completion Time', source: 'EHR timestamps · time from encounter end to note sign · per-provider · direct Abridge signal', badge: 'Week 4–8', why: "The direct Abridge signal for inpatient. When the progress note is done before the care team disperses, every downstream step — case management, discharge planning, coordination — can start immediately." },
          { name: 'Same-Encounter Note Completion Rate', source: 'EHR data · % of progress notes signed before provider leaves the unit · Abridge vs. baseline', badge: 'Week 6–10', why: "Measures whether the behavior change is consistent, not just occasional. A high rate means the clinical picture is reliably available early — not just sometimes — enabling earlier discharge planning." },
        ],
        callout: "Graduation signal: When progress note completion time reaches a consistent same-encounter low, the documentation bottleneck has closed. Start watching whether case management is now getting earlier discharge notification.",
      },
      trend: {
        window: 'Month 2–5',
        desc: 'Planning and coordination follow',
        metrics: [
          { name: 'Time to Discharge Goal Documentation', source: 'UM or case management system · days from admission to documented discharge goal · Abridge providers vs. non-Abridge', badge: 'Month 2–4', why: "Earlier discharge goal documentation gives case management more runway to arrange next-level-of-care. The earlier the goal is documented, the earlier the entire discharge chain can start." },
          { name: 'Case Manager Notification Lead Time', source: 'Case management system · hours between physician progress note sign and CM review of note · proxy for shared clinical picture lag', badge: 'Month 2–5', why: "Exposes whether note timeliness improvement is actually translating to earlier discharge planning — or whether case managers are still waiting for notes even after physicians sign them." },
          { name: 'Discharge Summary Timeliness', source: 'HIM / EHR data · hours from patient discharge to signed discharge summary · Abridge providers vs. baseline', badge: 'Month 2–4', why: "Late discharge summaries delay post-acute placement, primary care follow-up, and care transitions. When ambient documentation reduces the burden of producing the discharge summary itself, the clock from discharge to signed handoff shortens — giving downstream providers what they need sooner." },
        ],
        callout: '',
      },
      proof: {
        window: 'Month 4–12',
        desc: 'Delay cause codes move',
        metrics: [
          { name: 'Documentation-Attributed Delay Rate', source: 'UM cause code data · delays specifically coded as documentation-related · Abridge cohort vs. non-Abridge · requires UM system access', badge: 'Month 4–8', why: "The specific UM cause code that documentation directly causes. This is the only LOS-adjacent metric where documentation is the proximate cause — a defensible, isolated attribution." },
          { name: 'Avoidable Day Rate', source: 'UM system · avoidable days per 100 admissions · Abridge providers vs. baseline · filter for documentation-related codes', badge: 'Month 6–12', why: "The downstream financial expression of documentation delays. Avoidable days reduce payer revenue and attract concurrent review scrutiny — declining rate is both an efficiency and denial prevention signal." },
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
        tag: 'CFO conversation',
        body: "Replacing a hospitalist costs an estimated $250K–$500K fully loaded — recruiting, credentialing, onboarding, productivity ramp. Locum coverage during the vacancy adds further cost at 2–3× employed rates.",
      },
      {
        tag: 'CMO conversation',
        body: 'Documentation burden is the top-cited driver of hospitalist burnout. Reducing the mechanical charting load is the most direct, fastest-acting lever for improving physician wellbeing — ahead of schedule changes, team restructuring, or wellness programs.',
      },
    ],
    matterLayout: '2col',
    alsoNote: "Hospitalists who aren't burned out document more thoroughly (Quality → DRG accuracy) and are more present in patient conversations (Capacity → HCAHPS). This domain's outcomes connect across the full value story.",
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
        window: 'Week 4–8',
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
          { name: 'Provider Wellbeing Score', source: 'Validated burnout assessment survey · Abridge vs. non-Abridge providers at same site · quarterly cadence', badge: 'Month 2–4', why: "Wellbeing improves on a lag from documentation burden reduction. The cognitive load of carrying undone notes has a psychological weight that takes time to lift even after the workflow changes." },
          { name: 'Intent to Stay', source: 'Institutional engagement survey or validated single-item intent measure · trended quarterly', badge: 'Month 3–5', why: "Intent to stay moves before actual departures, giving organizations a window to intervene. Watch for divergence between Abridge adopters and non-adopters — that divergence is the leading signal." },
          { name: 'Satisfaction with Documentation Workflow', source: 'Department-specific pulse or EHR satisfaction survey · Abridge adopters vs. non-adopters', badge: 'Month 2–4', why: "Changes faster than wellbeing and is a leading indicator of both retention and adoption sustainability. If satisfaction isn't improving, investigate whether adoption is real." },
        ],
        callout: "The CFO bridge: Wellbeing scores don't appear on a balance sheet. Build the bridge explicitly: improved wellbeing is a leading indicator of lower voluntary departure intent, which translates to reduced replacement and locum costs.",
      },
      proof: {
        window: 'Month 12–18',
        desc: 'Retention and cost impact',
        metrics: [
          { name: 'Voluntary Hospitalist Turnover Rate', source: 'HR data · annual voluntary departures / total headcount · Abridge units vs. comparable non-Abridge units', badge: 'Month 12–18', why: "The lagging retention outcome. Requires 12+ months because departure decisions have long lead times and are measured annually — but confirms the workforce story when it arrives." },
          { name: 'Locum & Agency Utilization', source: 'Finance / staffing data · locum hours and cost per open shift · year-over-year comparison', badge: 'Month 9–18', why: "Open shifts filled by locums represent the financial cost of workforce instability. Declining locum dependence is the CFO's proof that the retention story is real, not just survey-reported." },
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
        tag: 'Matters most if…',
        body: "Your CMI is below peer benchmark despite similar patient acuity, your CDI team is running high query volume, your coder query-back rate is above 15%, or your DRG downgrade rate on concurrent review is climbing.",
      },
    ],
    alsoNote: "Observation status defense and audit protection. When progress notes capture clinical reasoning for continued inpatient level of care, concurrent review is more defensible — and payer audits have a harder time finding documentation gaps to challenge.",
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
          { name: 'Progress Note Completion Time ↓', source: 'EHR analytics · time from note open to note signed · Abridge providers vs. baseline · available within 2–4 weeks of rollout', badge: 'Week 4–6', why: "When note completion time drops, clinical reasoning is being captured during the encounter rather than reconstructed hours later. This is the upstream gate — CDI query volume, CC/MCC capture, and DRG defensibility all depend on this moving first." },
          { name: 'Clinical Detail Per Note ↑', source: 'EHR or NLP tool · diagnostic specificity score or codeable diagnosis count per note · Abridge providers vs. baseline · CDI software often tracks this natively', badge: 'Week 4–8', why: "More specific notes — conditions documented with the terminology and detail CDI and coders need — reduce query volume before it starts. This is the behavioral shift that cascades into CC/MCC capture and DRG defensibility." },
        ],
        callout: "Why start here: CDI query rates, CC/MCC capture, and case mix index all depend on documentation completeness arriving at the point of care — they can't improve if note specificity isn't changing first.",
      },
      trend: {
        window: 'Month 1–6',
        desc: 'CDI and coding signals emerge',
        metrics: [
          { name: 'CDI Query Rate per Provider', source: 'CDI team data · queries per 100 admissions · Abridge providers vs. baseline · most teams track this daily', badge: 'Month 1–3', why: "CDI queries are a real-time measure of documentation gaps. When Abridge is working, CDI should have less to chase because clinical reasoning is captured during the encounter." },
          { name: 'CC/MCC Capture Rate', source: 'CDI or coding team · % of eligible admissions with CC or MCC codes assigned · compare Abridge providers vs. control cohort', badge: 'Month 3–5', why: "Complication and comorbidity codes determine DRG weight and reimbursement level. Complete, specific notes allow CDI and coders to assign these codes without physician clarification after the fact." },
          { name: 'DRG Downgrade Rate', source: 'Revenue cycle · % of DRGs downgraded on coding review or payer challenge · documentation-related downgrades specifically', badge: 'Month 3–6', why: "Payers challenge DRG assignments when the supporting documentation is vague. Declining downgrade rate means notes are holding up to payer review — direct revenue protection." },
          { name: 'Claims Rework Staff Hours ↓', source: 'RCM system or billing team logs · staff hours per week spent reworking denied or rejected inpatient claims · trended monthly', badge: 'Month 2–4', why: "Inpatient claims average $15K–$20K per admission, making each documentation-related denial proportionally more costly to rework than outpatient. Tracking staff hours on rework isolates the operational burden of poor documentation before denial rate numbers themselves move — and it's a metric the revenue cycle team can pull without waiting for quarterly reports." },
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
    badge: 'Severity Capture & Risk Adjustment',
    northStar: 'Risk-Adjusted Quality Score Accuracy',
    direction: '↑',
    northStarSub: "Quality programs measure outcomes relative to expected outcomes — and expected outcomes are calculated from documented complexity. When documentation understates severity, quality scores look worse than the care actually was. Documentation is the input to risk adjustment, not an afterthought.",
    matterBoxes: [
      {
        tag: 'Matters most if…',
        body: "Your observed-to-expected ratios on mortality or readmissions look worse than peer hospitals with similar patient populations, CDI query volume on complex admissions is high, or your CMO is concerned that quality scores don't reflect actual care quality.",
      },
    ],
    alsoNote: "CDI graduation — when CDI query volume drops consistently, it's the signal that documentation is capturing complexity at the point of care rather than requiring clarification after the fact. The quality and revenue stories converge here.",
    chain: [
      { key: 'source', label: 'Abridge Ambient', sub: 'hospital documentation AI', isSource: true },
      {
        key: 'complexity', label: 'Clinical Complexity Documented ↑', sub: 'conditions, severity captured',
        detail: {
          cols: [
            { l: 'What it means', b: 'The full constellation of a patient\'s clinical conditions — acute and chronic, primary and comorbid — documented with the specificity required for risk adjustment systems to calculate an accurate expected outcome.' },
            { l: 'Why it\'s the foundation', b: 'Risk adjustment algorithms (APR-DRGs, CMS HCC, 3M) use documented diagnoses to calculate expected outcomes. If the documentation understates how sick the patient was, the expected outcome is set too low — and any death or readmission looks worse than peers.' },
            { l: 'What Abridge captures', b: "The rounding conversation contains the clinical picture. When ambient capture preserves that conversation in the note — chronic conditions mentioned in passing, comorbidities relevant to the plan — risk adjustment has the data it needs." },
          ],
          grad: "When CDI query rates drop, it means documentation is arriving complete. That's the signal complexity documentation has improved. Start watching severity classification rates as the next confirmation.",
        },
      },
      {
        key: 'severity', label: 'Severity of Illness Captured ↑', sub: 'complex patients classified correctly',
        detail: {
          cols: [
            { l: 'What it measures', b: 'The degree to which patients with high clinical severity are classified at the correct APR-DRG Severity of Illness (SOI) level — particularly SOI 3 (major) and SOI 4 (extreme) for the most complex cases.' },
            { l: 'Why classification matters', b: "SOI level directly affects expected outcome calculations. A patient classified as SOI 2 who is actually SOI 3 has a lower expected mortality — making any bad outcome look worse than it was on risk-adjusted reports." },
            { l: 'The documentation connection', b: "SOI assignment is driven by secondary diagnoses — the comorbidities and complications that documentation often omits. Ambient capture preserves these conditions, enabling accurate SOI classification without CDI prompting." },
          ],
        },
      },
      {
        key: 'riskadjust', label: 'Risk Adjustment Accurate ↑', sub: 'actual patient mix reflected',
        detail: {
          cols: [
            { l: 'What it means', b: 'Expected outcomes are calculated from an accurate picture of patient severity — so observed-to-expected ratios reflect care quality rather than documentation quality.' },
            { l: 'The quality program impact', b: "CMS publicly reports observed-to-expected mortality and readmission ratios. Hospitals with inaccurate documentation appear to have worse outcomes than they do — and can receive payment penalties based on that inaccuracy." },
            { l: 'Where to look', b: "Compare your O/E ratios to peer hospitals. If your documentation is understating severity, your O/E ratios will be higher than peers with similar patient populations. That's the gap ambient documentation is closing." },
          ],
        },
      },
      {
        key: 'score', label: 'Quality Score Accuracy ↑', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'Publicly reported quality metrics — CMS Value-Based Purchasing scores, core measure compliance rates, O/E mortality and readmission ratios — that accurately reflect care quality because risk adjustment has the data it needs.' },
            { l: 'Data source', b: 'CMS public reporting (Hospital Compare), internal quality reporting system, accreditation body reporting. Trended quarterly. Requires 6–12 months of claims data to show meaningful movement.' },
            { l: 'The reputational value', b: "CMS Overall Hospital Quality Star Rating is publicly visible to patients choosing where to receive care. Improving star ratings through better documentation accuracy — not by changing care — is one of the most defensible quality improvement arguments." },
          ],
        },
      },
      {
        key: 'cdiqueries', label: 'CDI Query Volume ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'The rate at which CDI specialists send queries back to attending physicians to clarify documented conditions for coding and quality measurement purposes.' },
            { l: 'Why declining queries is the graduation signal', b: "When CDI query volume drops, it means documentation is arriving with what CDI needs. The query is a lagging correction for a documentation gap that should never have existed. Ambient capture closes the gap at the point of care." },
            { l: 'The dual impact', b: "Every CDI query that doesn't need to be sent is physician time returned, CDI specialist time freed for higher-complexity review, and a billing cycle accelerated. Query volume reduction is a quality and an operational efficiency outcome simultaneously." },
          ],
        },
      },
    ],
    timeline: {
      signal: {
        window: 'Week 4–8',
        desc: 'Documentation behavior shifts',
        metrics: [
          { name: 'Progress Note Completeness Rate ↑', source: 'EHR analytics or CDI software · % of progress notes meeting completeness criteria (required elements present) · Abridge providers vs. baseline', badge: 'Week 4–6', why: "When progress notes consistently capture the full clinical picture — acute diagnoses, relevant comorbidities, clinical reasoning for the plan — risk adjustment systems have the data they need. This is the earliest observable signal that quality score inputs are improving." },
          { name: 'Clinical Specificity Per Note ↑', source: 'CDI software or NLP · average number of codeable diagnoses captured per admission · Abridge providers vs. baseline · proxy for documentation depth', badge: 'Week 4–8', why: "CDI queries exist because documentation is missing specificity that risk adjustment requires. When specificity improves at the point of care, CDI has less to chase — and severity classification data follows." },
          { name: 'Condition Present on Admission (POA) Documentation Rate ↑', source: 'Coding or CDI audit · % of admissions where all relevant conditions are documented as POA in H&P or admission note · Abridge providers vs. baseline', badge: 'Week 4–8', why: "When conditions present at admission aren't documented as such, CMS logic defaults them to hospital-acquired — triggering HAC penalties and distorting risk-adjusted quality scores. Ambient documentation captures chronic and acute conditions as they're discussed during the admission encounter, when POA status is clinically obvious, rather than leaving it to retrospective coding inference." },
        ],
        callout: "Why start here: CDI query volume, SOI classification, and O/E ratios all follow from note completeness. Documentation specificity is the input; quality scores are the output — and they move in that order.",
      },
      trend: {
        window: 'Month 1–7',
        desc: 'CDI and severity capture respond',
        metrics: [
          { name: 'CDI Query Rate per Provider', source: 'CDI team data · queries per 100 admissions · Abridge providers vs. baseline · CDI teams track this continuously', badge: 'Month 1–3', why: "CDI querying the same notes Abridge drafted means notes aren't yet capturing the clinical specificity CDI expects. A declining query rate confirms that documentation behavior changes are translating into the clinical detail CDI needs." },
          { name: 'High-Severity Case Classification Rate (SOI Level 3/4)', source: 'CDI or coding team · % of eligible admissions classified at major or extreme severity · Abridge cohort vs. baseline', badge: 'Month 3–6', why: "Accurate severity classification requires documentation of clinical complexity. Rising SOI 3/4 rate means the clinical story being delivered is now being captured in the documentation — not just coded later." },
          { name: 'Chronic Condition Documentation Rate', source: 'EHR or CDI data · % of admissions where relevant chronic conditions are documented with appropriate specificity · proxy for completeness', badge: 'Month 3–7', why: "Chronic conditions need documentation at every admission to support risk adjustment and quality measure attribution. Abridge captures the clinical reasoning that makes this happen consistently." },
        ],
        callout: "The severity capture story: SOI level improvement shows up in CDI and coding data before it appears in publicly reported quality scores. Track it at the provider cohort level to build the attribution story before external reporting reflects it.",
      },
      proof: {
        window: 'Month 6–18',
        desc: 'Quality scores reflect reality',
        metrics: [
          { name: 'Observed vs. Expected Mortality Rate', source: 'Quality reporting system or CMS · O/E ratio trended quarterly · compare Abridge provider cohort to baseline and peers', badge: 'Month 6–12', why: "O/E mortality rate is risk-adjusted — it only improves if documentation accurately reflects patient severity. Improving O/E means the true clinical complexity is now being captured before outcomes are measured." },
          { name: 'Core Measure Compliance Rate', source: 'Quality program data · % of qualifying encounters meeting core measure documentation requirements · Abridge providers vs. non-Abridge', badge: 'Month 6–12', why: "Core measure compliance requires specific documentation elements captured in real time. Ambient capture during clinical encounters makes these elements available without retrospective documentation." },
          { name: '30-Day Readmission Rate (Risk-Adjusted)', source: 'CMS or internal quality data · risk-adjusted readmission rate · directional comparison to peer benchmark · affected by accurate risk adjustment input', badge: 'Month 9–18', why: "Risk-adjusted readmission is affected by accurate documentation of patient complexity at discharge. Better documentation of chronic conditions and clinical reasoning supports accurate risk adjustment input." },
        ],
        callout: "The long game: Risk-adjusted quality scores reflect care from months prior and change slowly. The strategy is to show CDI query reduction early, SOI capture improvement at mid-term, and quality score movement as the long-term confirmation. Each stage builds credibility for the next.",
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
    narrative: "Inpatient DRG reimbursement is driven by case complexity — specifically whether complication and comorbidity codes (CCs and MCCs) are captured in the discharge record. When clinical documentation doesn't reflect the full severity of a patient's conditions, CDI teams must issue queries to resolve ambiguity. Unresolved queries or documentation gaps result in lower DRG weights and reduced reimbursement. More thorough clinical documentation may reduce CDI query burden and support higher case mix capture. The model quantifies this through estimated CMI improvement multiplied against discharge volume and base rate.",
    chain: ['Clinical Documentation Specificity ↑', 'CC/MCC Capture Rate ↑', 'CDI Query Rate ↓'],
    chainOutput: 'Case Mix Index ↑',
    steps: [
      {
        vars: [
          { v: 'Annual inpatient discharges', kind: 'input' },
          { v: 'Estimated CMI improvement', kind: 'input' },
          { v: 'Hospital base rate', kind: 'input' },
        ],
        result: 'DRG revenue impact',
      },
      {
        vars: [
          { v: 'Annual encounters', kind: 'input' },
          { v: 'Documentation denial rate reduction', kind: 'input' },
          { v: 'Avg inpatient denial value', kind: 'benchmark', hint: '~$500–1,200' },
        ],
        result: 'Denial recovery',
      },
      {
        vars: [
          { v: 'DRG revenue impact', kind: 'derived' },
          { v: 'Denial recovery', kind: 'derived', op: '+' },
        ],
        result: 'Total estimated revenue',
        isFinal: true,
      },
    ],
  },
  {
    domain: 'QUALITY',
    tag: 'tracked',
    narrative: "Risk-adjusted quality metrics — observed-to-expected mortality, readmission rates, PSI-90 composite — depend on the severity adjustment applied to each case. Severity adjustment is only as accurate as the severity documentation. When comorbidities and complications are underrepresented in the record, risk models underestimate expected outcomes, and performance appears worse than it actually is. More complete documentation may produce more accurate risk adjustment, which in turn may improve O/E ratios and CMS program performance. These signals are tracked over time; dollar amounts are not modeled directly.",
    chain: ['Comorbidity Documentation ↑', 'Risk Model Inputs Accurate ↑', 'O/E Ratio Improves ↑'],
    chainOutput: 'VBP Performance ↑',
    note: "Overlaps with Revenue via VBP, HACRP, and HRRP quality programs. Not modeled in dollars — program payouts use CMS-specific formulas. Tracked as O/E mortality ratio, core measure compliance, and risk-adjusted readmission rate.",
  },
];

// ─── Personas & Discovery Questions ──────────────────────────────────────────

const ipFrameworkPersonas: Record<DomainName, string[]> = {
  CAPACITY:  ['COO', 'Hospitalist Director'],
  WORKFORCE: ['CMO', 'CHRO'],
  REVENUE:   ['CFO', 'CDI Director'],
  QUALITY:   ['VP Quality', 'CMO'],
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
    'When you look at your O/E mortality or readmission ratios, do your hospitalists believe the risk adjustment accurately reflects patient severity?',
    'How are your VBP or HRRP scores trending — and is documentation quality coming up in root cause analysis of performance gaps?',
    'How much of your quality team\'s bandwidth is spent resolving documentation-related flags versus driving improvement initiatives?',
  ],
};

// ─── Value Architecture Component ────────────────────────────────────────────

function IPValueArchitectureSection() {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['CAPACITY', 'WORKFORCE', 'REVENUE', 'QUALITY']));
  const tagCfg = {
    modeled: { label: 'Modeled', cls: 'bg-[#1A1A1A] text-white' },
    tracked: { label: 'Signal',  cls: 'bg-[#F0EDE8] text-[#666666]' },
  };
  return (
    <div className="mt-10 mb-10">
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#888888] mb-1.5">The Value Architecture</p>
        <h2 className="text-[22px] font-bold text-black tracking-tight">How Abridge Creates Value</h2>
        <p className="text-[13px] text-[#888888] mt-1">Four domains. Each formula shows the full calculation — which numbers are yours, which are industry estimates, and how they chain together.</p>
      </div>
      <div className="divide-y divide-[#EDEBE6] border border-[#E4DDD4] rounded-xl overflow-hidden">
        {ipFramework.map((item) => {
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
              {questions.length > 0 && (
                <div className="mb-4 border-l-2 border-[#F0EDE8] pl-3">
                  <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-[#BBBBBB] mb-2">Ask to explore</p>
                  <ul className="space-y-1.5">
                    {questions.map((q, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-[#C4BBAD] text-[12px] shrink-0 mt-0.5">›</span>
                        <span className="text-[12px] text-[#777777] italic leading-snug">{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-1.5 mb-4">
                {item.chain.map((step, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-[#C0B8B0] text-xs">→</span>}
                    <span className="text-[10px] font-medium text-[#444444] bg-[#F6F3EF] border border-[#E4DDD5] rounded-md px-2.5 py-1.5 leading-none whitespace-nowrap">{step}</span>
                  </div>
                ))}
                {item.chainOutput && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#C0B8B0] text-xs">→</span>
                    <span className="text-[10px] font-semibold text-white bg-[#1A1A1A] rounded-md px-2.5 py-1.5 leading-none whitespace-nowrap">{item.chainOutput}</span>
                  </div>
                )}
              </div>
              {item.steps && (
                <div className="rounded-xl overflow-hidden border border-[#DEDAD2]">
                  <div className="flex items-center justify-between px-5 py-2.5 bg-[#F2EDE5] border-b border-[#DEDAD2]">
                    <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#999999]">How it's calculated</span>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-[9px] h-[9px] rounded-sm bg-white border border-[#C8BFB4] inline-block"></span>
                        <span className="text-[8px] text-[#BBBBBB] tracking-wide">your input</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-[9px] h-[9px] rounded-sm bg-[#FDF5E4] border border-[#DCBF60] inline-block"></span>
                        <span className="text-[8px] text-[#BBBBBB] tracking-wide">industry est.</span>
                      </span>
                    </div>
                  </div>
                  {item.steps.map((step, si) => (
                    <div key={si}>
                      {step.vars.map((variable, vi) => {
                        const op = variable.op ?? (vi > 0 ? '×' : '');
                        const isDerived = variable.kind === 'derived';
                        const isBenchmark = variable.kind === 'benchmark' || variable.kind === 'default';
                        const rowBg = isDerived ? 'bg-[#F7F3EE]' : isBenchmark ? 'bg-[#FFFDF6]' : 'bg-white';
                        return (
                          <div key={vi} className={`flex items-stretch border-b border-[#EDE7DF] ${rowBg}`}>
                            <div className="w-10 flex items-center justify-center shrink-0 border-r border-[#EDE7DF]">
                              <span className="font-mono text-[15px] font-light text-[#C8C0B4]">{op}</span>
                            </div>
                            <div className="flex flex-1 items-center justify-between gap-4 px-4 py-[11px]">
                              <span className={`text-[12.5px] leading-snug ${isDerived ? 'text-[#888888]' : 'text-[#1A1A1A]'}`}>
                                {variable.v}
                              </span>
                              <span className={`text-[8px] font-bold tracking-[0.1em] uppercase shrink-0 ${
                                isDerived ? 'text-[#C8C0B8]'
                                : isBenchmark ? 'text-[#9A7000]'
                                : 'text-[#C8C0B8]'
                              }`}>
                                {isDerived ? 'carried forward'
                                  : variable.kind === 'benchmark' ? (variable.hint ? `est. · ${variable.hint}` : 'industry est.')
                                  : variable.kind === 'default' ? (variable.hint ? `assumed · ${variable.hint}` : 'assumed')
                                  : 'your input'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      <div className={`flex items-stretch ${step.isFinal ? 'bg-[#1A1A1A]' : 'bg-[#EAE4DC] border-b border-[#D8D0C4]'}`}>
                        <div className={`w-10 flex items-center justify-center shrink-0 border-r ${step.isFinal ? 'border-[#333]' : 'border-[#D8D0C4]'}`}>
                          <span className={`font-mono text-[15px] font-light ${step.isFinal ? 'text-white/50' : 'text-[#999]'}`}>=</span>
                        </div>
                        <div className="flex flex-1 items-center px-4 py-[11px]">
                          <span className={`leading-snug ${step.isFinal ? 'text-[13px] font-bold text-white tracking-tight' : 'text-[12.5px] font-semibold text-[#3A3630]'}`}>
                            {step.result}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {item.note && (
                <p className="text-[11px] text-[#888888] leading-relaxed mt-3">{item.note}</p>
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

        {data.alsoNote && (
          <div className="mt-3 px-4 py-4 rounded-xl border border-[#E0D4C4] bg-[#FAF6EF]">
            <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-[#999999] mb-1.5">Also Enables</p>
            <p className="text-[12px] text-[#555555] leading-relaxed">{data.alsoNote}</p>
          </div>
        )}
      </div>

      {/* ── CAUSAL CHAIN ── */}
      <div className="px-8 py-6 border-b border-[#F0F0F0]">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold tracking-[0.11em] uppercase text-[#888888]">How Abridge enables progress toward this outcome</p>
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

// ─── IP Domain Methodology Section ───────────────────────────────────────────

function IPDomainMethodologySection() {
  const [activeDomain, setActiveDomain] = useState(ipDomainCards[0].domain);
  const activeCard = ipDomainCards.find(c => c.domain === activeDomain)!;

  return (
    <div className="mb-10">
      <div className="mb-6 pb-3 border-b-2 border-[#EA2C00]">
        <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#888888] mb-2">The Inpatient Value Story</p>
        <h2 className="text-[24px] font-bold text-black tracking-tight">Four Domains of Value</h2>
        <p className="text-sm text-[#888888] mt-1">
          Each domain has a distinct North Star outcome, a causal chain showing how Abridge enables it, and a measurement path with honest timelines.
        </p>
      </div>
      <div className="bg-[#F5F0EB] rounded-xl p-1 flex mb-5">
        {ipDomainCards.map(card => {
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
  const stages: { badge: BadgeType; timing: string; title: string; description: string; domains: DomainName[] }[] = [
    {
      badge: "Signal",
      timing: "Week 4–8",
      title: "The Provider Feels It",
      description: "H&P and progress note drafts appear in real time. After-shift charting drops measurably. EHR session timestamps show documentation time falling within weeks of consistent use.",
      domains: ["CAPACITY", "WORKFORCE"],
    },
    {
      badge: "Trend",
      timing: "Month 2–4",
      title: "CDI Notices It",
      description: "Progress note specificity improves. CDI query rates drop as notes capture clinical reasoning without prompting. CC/MCC capture begins moving in claims data.",
      domains: ["QUALITY", "REVENUE"],
    },
    {
      badge: "Proof",
      timing: "Month 6–18",
      title: "The System Measures It",
      description: "CMI improvement validated against a provider cohort. Medical necessity denial rates traceable to documentation quality. Hospitalist retention signal begins to emerge.",
      domains: ["REVENUE", "WORKFORCE"],
    },
  ];

  const chipStyles: Record<DomainName, string> = {
    CAPACITY: "bg-[#F0EEEC] text-[#888888]",
    WORKFORCE: "bg-[#EDECEB] text-[#555555]",
    REVENUE: "bg-[#FFF0EC] text-[#EA2C00]",
    QUALITY: "bg-[#E8E8E8] text-[#1A1A1A]",
  };

  return (
    <div className="mb-10">
      <div className="mb-6 pb-3 border-b-2 border-[#EA2C00]">
        <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#888888] mb-2">Value Arc</p>
        <h2 className="text-[24px] font-bold text-black tracking-tight">How It Accrues Over Time</h2>
        <p className="text-sm text-[#888888] mt-1">
          Value doesn't arrive all at once. The sequence is mechanistically predictable — not arbitrary.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 border border-[#E5E5E5] rounded-lg overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#E5E5E5]">
        {stages.map((stage) => {
          const cellBg = stage.badge === "Signal" ? "bg-white" : stage.badge === "Trend" ? "bg-[#F9F7F5]" : "bg-[#F5F0EB]";
          return (
            <div key={stage.badge} className={`${cellBg} px-6 py-6`}>
              <div className="flex items-center justify-between mb-3">
                <ImpactBadge type={stage.badge} />
                <span className="text-[11px] font-medium text-[#888888]">{stage.timing}</span>
              </div>
              <p className="text-[17px] font-bold text-black tracking-tight mb-2">{stage.title}</p>
              <p className="text-[12px] text-[#666666] leading-relaxed mb-4">{stage.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {stage.domains.map((d) => (
                  <span key={d} className={`rounded-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${chipStyles[d]}`}>{d}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MethodologyInpatient({ onBack, onNavigateToSetting }: MethodologyInpatientProps) {
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
            <button onClick={onBack} className="flex items-center cursor-pointer bg-transparent border-none p-0" data-testid="link-home-logo">
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

        <IPDomainMethodologySection />

        <IPValueArcSection />

        <IPValueArchitectureSection />

        <motion.div className="mt-4 mb-10 bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] rounded-lg p-8 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="text-xl font-bold text-white mb-2">Ready to Build Your Model?</h3>
          <p className="text-[#999999] mb-6 text-sm">Use these methodology principles to create a customized ROI model for your hospitalist program.</p>
          <button onClick={onBack} className="inline-flex items-center gap-2 bg-[#EA2C00] hover:bg-[#D12600] text-white font-medium px-6 py-3 rounded-lg transition-colors" data-testid="button-build-model">
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
