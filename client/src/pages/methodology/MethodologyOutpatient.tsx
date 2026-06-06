import { motion, useInView } from "framer-motion";
import { useState, useRef } from "react";
import { ArrowLeft, Download, ArrowRight, Activity, Building2, Heart, Loader2 } from "lucide-react";
import { generateMethodologyPDF } from "@/lib/methodology-pdf-export";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';
import {
  NarrativeText,
  type BadgeType,
  type DomainName,
} from "@/components/methodology/MethodologyShared";

interface MethodologyOutpatientProps {
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

type OPDomainCardData = {
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

const opDomainCards: OPDomainCardData[] = [
  // ── CAPACITY ──────────────────────────────────────────────────────────────
  {
    domain: 'CAPACITY',
    number: 'Domain 1 of 4',
    badge: 'Panel Capacity & Appointment Access',
    northStar: 'Patient Access',
    direction: '↑',
    northStarSub: "Third next available, same-day slot availability, and panel size are the metrics — but Patient Access is the outcome. When providers spend less time documenting per visit, they have more time for visits.",
    matterBoxes: [
      {
        tag: 'COO / Practice Operations',
        body: "Third next available above benchmark, providers running behind schedule, or same-day access limited. Persistent schedule delays are frequently a documentation load problem — physicians are finishing prior charts during appointment time.",
      },
      {
        tag: 'CFO',
        body: "Each additional visit slot freed by documentation efficiency is direct revenue. Panel capacity expansion also defers the need for provider headcount additions. The model shows incremental encounter value against program cost.",
      },
    ],
    matterLayout: '2col',
    chain: [
      { key: 'source', label: 'Abridge Ambient', sub: 'outpatient documentation AI', isSource: true },
      {
        key: 'doctime', label: 'Visit Documentation Time ↓', sub: 'per encounter',
        detail: {
          cols: [
            { l: 'What it measures', b: 'Minutes spent on documentation per outpatient visit — captured via EHR session timestamps. This is the primary lever Abridge directly controls in the outpatient setting.' },
            { l: 'Data source', b: 'EHR audit logs. Time from encounter open to note sign per provider. No additional infrastructure needed — compare same providers before and after Abridge adoption.' },
            { l: 'When it moves', b: 'Visible within 4–8 weeks for consistent users. The most reliable early signal before any downstream access metrics are available.' },
          ],
          grad: "When documentation time reaches a consistent low across your panel, providers have recaptured shift time. That's the signal to start watching whether same-day availability and appointment density are increasing.",
        },
      },
      {
        key: 'clintime', label: 'Available Clinical Time ↑', sub: 'per provider per shift',
        detail: {
          cols: [
            { l: 'What it represents', b: "Minutes freed from documentation that become available for additional patient encounters, care coordination, or inbox management — without extending the provider's workday." },
            { l: 'How to observe it', b: 'Aggregate EHR session time reduction × provider panel size. Also visible in appointment density changes and same-day slot fill rates as scheduling utilizes recaptured time.' },
            { l: 'Why it matters', b: "Clinical time is the constraint in outpatient access. When documentation consumes less of it, the same provider can handle more appointments — without asking anyone to work longer." },
          ],
        },
      },
      {
        key: 'panelcap', label: 'Panel Capacity ↑', sub: 'visits the panel can absorb',
        detail: {
          cols: [
            { l: 'What it means', b: 'The total number of patient visits a provider\'s panel can accommodate per day or week — a function of available clinical time and visit length.' },
            { l: 'The documentation connection', b: 'If a provider saves 3 minutes per visit and sees 24 patients per day, that\'s 72 minutes of documentation time returned — enough for 1–2 additional visits at typical outpatient visit lengths.' },
            { l: 'How scheduling sees it', b: 'Recaptured time shows up as available appointment slots. Scheduling teams see it as the ability to offer same-day or next-day access they couldn\'t offer before.' },
          ],
        },
      },
      {
        key: 'access', label: 'Patient Access ↑', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'The ease with which patients can get an appointment — measured by Third Next Available (TNA) appointment days, same-day slot availability rate, and new patient acceptance rate.' },
            { l: 'Data source', b: 'Scheduling system. Third Next Available is the primary industry standard metric — it reflects true availability, not just open slots on a calendar. Track by provider and department.' },
            { l: 'Why access matters competitively', b: "In markets where patients choose providers, access is a competitive differentiator. Reducing TNA from 21 days to 14 days can measurably affect patient satisfaction scores and market share." },
          ],
        },
      },
      {
        key: 'sameday', label: 'Same-Day Availability ↑', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'The percentage of appointment slots that remain available for same-day scheduling — a direct measure of panel flexibility and documentation-time efficiency.' },
            { l: 'Data source', b: 'Scheduling system. Track same-day fill rate and how often same-day slots are offered versus unavailable by provider.' },
            { l: 'Why it\'s separate from TNA', b: "Third Next Available measures planned access. Same-day availability measures urgent access — the ability to accommodate a patient who calls this morning. Both improve when documentation time decreases." },
          ],
        },
      },
    ],
    timeline: {
      signal: {
        window: 'Week 4–8',
        desc: 'Documentation time drops',
        metrics: [
          { name: 'Post-Visit Note Completion Time', source: 'EHR audit logs · time from encounter end to note sign · per-provider · pre/post comparison', badge: 'Week 4–8', why: "The upstream driver of everything in this domain. If providers aren't completing notes faster, no downstream access or throughput improvements are possible — this is the first gate to check." },
          { name: 'Same-Day Note Completion Rate', source: "EHR data · % of outpatient notes signed same calendar day as encounter · Abridge vs. baseline", badge: 'Week 4–8', why: "Notes signed the same day mean no evening documentation backlog and no charge lag. It's the cleanest early proof that real-time documentation is taking hold, not just deferred." },
        ],
        callout: "Graduation signal: When documentation time reaches a consistent low and same-day note completion rate is high, providers have recaptured shift time. Start watching whether scheduling teams are seeing new appointment availability.",
      },
      trend: {
        window: 'Month 2–4',
        desc: 'Scheduling absorbs recaptured time',
        metrics: [
          { name: 'After-Hours EHR Activity', source: 'EHR session logs · documentation activity outside scheduled clinic hours · per-provider · pajama time proxy', badge: 'Month 2–4', why: "Pajama time dropping means providers have genuinely recaptured shift hours — not just deferred work to the next day. Without after-hours activity falling, same-day slot availability won't open up." },
          { name: 'Same-Day Appointment Slot Availability', source: 'Scheduling system · % of shifts with same-day slots open vs. fully booked · by provider', badge: 'Month 2–4', why: "The first scheduling signal that recaptured documentation time is turning into real capacity. Watch this before TNA improves — it moves faster because it reflects day-level flexibility, not average access." },
        ],
        callout: "Two signals, one story: After-hours activity falling confirms the recaptured time is real — not deferred to the next morning, not absorbed by inbox, but genuinely returned. Same-day slot availability rising confirms scheduling is absorbing it. Both need to move together before Third Next Available can show meaningful improvement. Access can't open up if freed documentation time never reaches the schedule.",
      },
      proof: {
        window: 'Month 4–12',
        desc: 'Access metrics confirm',
        metrics: [
          { name: 'Third Next Available Appointment', source: 'Scheduling system · days from "today" to third open appointment slot · industry-standard access metric · track monthly by provider and department', badge: 'Month 4–8', why: "The gold standard outpatient access metric. It reflects true availability, not just open calendar slots. Takes 4–8 months because scheduling systems need time to fill new capacity and establish a trend." },
          { name: 'Panel Size per Provider', source: 'Practice management system · active patients per provider · trended quarterly · higher panel size = more patients served', badge: 'Month 6–12', why: "A rising panel means the practice is absorbing more patients with the same providers — the ultimate proof that documentation efficiency translated to real access expansion, not just returned hours." },
        ],
        callout: "Why Third Next Available: It's the gold standard outpatient access metric because it reflects true availability, not just calendar white space. A declining TNA shows that documentation efficiency is translating into schedulable capacity — not just hours returned to providers.",
      },
    },
  },

  // ── WORKFORCE ─────────────────────────────────────────────────────────────
  {
    domain: 'WORKFORCE',
    number: 'Domain 2 of 4',
    badge: 'Provider Wellbeing & Retention',
    northStar: 'Voluntary Turnover',
    direction: '↓',
    northStarSub: "Outpatient providers spend more time on documentation than nearly any other clinical activity. The average office-based physician spends 2 hours per day on EHR-related tasks outside of patient care — most of it after clinic hours.",
    matterBoxes: [
      {
        tag: 'CFO',
        body: "Replacing a primary care physician costs an estimated $250K–$350K in recruiting, credentialing, and practice rebuild costs. Replacing a specialist is often higher. Reducing documentation-driven turnover has direct financial impact.",
      },
      {
        tag: 'CMO',
        body: "Documentation burden is the #1 cited driver of outpatient physician burnout. It shows up specifically as pajama time — the hours spent finishing notes after patients have left and the clinic has closed for the day.",
      },
    ],
    matterLayout: '2col'
    chain: [
      { key: 'source', label: 'Abridge Ambient', sub: 'outpatient documentation AI', isSource: true },
      {
        key: 'pajama', label: 'After-Visit Charting Time ↓', sub: 'pajama time',
        detail: {
          cols: [
            { l: 'What it measures', b: 'Time spent charting after clinic hours end — captured via EHR session logs comparing activity timestamps to scheduled clinic end time.' },
            { l: 'Data source', b: 'EHR audit logs. Session activity after last scheduled appointment per provider, pre- and post-Abridge adoption. No survey needed.' },
            { l: 'The outpatient specificity', b: "Outpatient pajama time is driven by volume. A provider seeing 24 patients per day who carries 3 minutes of incomplete documentation per visit enters the evening with 72 minutes of charting backlog. Ambient capture eliminates the backlog at the point of care." },
          ],
          grad: "When post-clinic EHR session time approaches zero consistently, providers have their evenings back. The next signal to watch is whether that recovery translates to wellbeing scores at the next survey cycle.",
        },
      },
      {
        key: 'burden', label: 'Evening Documentation Burden ↓', sub: 'clinic ends when clinic ends',
        detail: {
          cols: [
            { l: 'What it captures', b: 'The total accumulation of documentation left incomplete after the last patient leaves — inbox responses, prior authorization documentation, and unsigned notes all compound into the evening burden.' },
            { l: 'Why it compounds', b: 'For outpatient providers, documentation burden is a nightly reset problem — each day starts fresh but the incomplete work from the previous evening competes with the day ahead. Ambient capture prevents the backlog from forming.' },
            { l: 'How to observe it', b: 'EHR session activity after 6pm by provider. InBasket message response rates and timing. Patient satisfaction with provider availability (a proxy for attentiveness).' },
          ],
        },
      },
      {
        key: 'wellbeing', label: 'Provider Wellbeing ↑', sub: 'leading indicator of retention',
        detail: {
          cols: [
            { l: 'What it measures', b: 'Physician satisfaction, burnout level, and perceived work-life balance — captured through a validated burnout assessment survey or institutional engagement instrument.' },
            { l: 'Data source', b: 'Most health systems use institutional surveys or AMA/ACP-provided burnout instruments. Compare Abridge adopters to non-adopters at the same site. Quarterly cadence is sufficient.' },
            { l: 'Why it predicts turnover', b: "Wellbeing scores respond within 2–4 months of pajama time reduction. That's 6–8 months before voluntary turnover data becomes statistically meaningful. Survey data lets you tell the retention story proactively." },
          ],
        },
      },
      {
        key: 'turnover', label: 'Voluntary Turnover ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'The percentage of outpatient physicians and advanced practice providers who voluntarily leave their practice in a given year.' },
            { l: 'Data source', b: 'HR data. Voluntary departure rate by department. Compare Abridge providers to non-Abridge providers, controlling for specialty and seniority.' },
            { l: 'The financial case', b: "At $250K–$350K per replacement for primary care and higher for specialists, even one additional retention per year covers a significant portion of program cost. Documentation burden is consistently cited in exit interviews as a contributing factor." },
          ],
        },
      },
      {
        key: 'locum', label: 'Locum & Temp Spend ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'The cost and volume of locum, agency, and temporary provider coverage used to fill gaps during vacancies and during periods of reduced provider availability.' },
            { l: 'Data source', b: 'Finance and staffing data. Locum hours × rate per shift. Compare year-over-year as retention improves.' },
            { l: 'Why it shows up quickly', b: "Locum spend responds within months of a departure and is tracked in real time. It's often the number that CFOs associate most concretely with turnover cost." },
          ],
        },
      },
    ],
    timeline: {
      signal: {
        window: 'Week 4–8',
        desc: 'Pajama time drops',
        metrics: [
          { name: 'After-Hours Charting Time (Pajama Time)', source: 'EHR session logs · documentation activity after scheduled clinic end · per-provider · most direct Abridge signal', badge: 'Week 4–8', why: "Documentation burden shows up first in after-hours work. If pajama time isn't dropping, adoption needs to be investigated before expecting any retention improvements downstream." },
          { name: 'Post-Visit Note Completion Time', source: 'EHR timestamps · time from encounter end to note sign · proxy for real-time documentation adoption', badge: 'Week 4–8', why: "Confirms that documentation is happening during the encounter, not after. Faster note completion means less carry-home cognitive load per shift — the root cause of burnout." },
        ],
        callout: "Why start here: EHR audit data is objective and requires no survey coordination. Pajama time reduction is the metric physicians talk about to each other — and that word-of-mouth conversation is your most effective adoption strategy.",
      },
      trend: {
        window: 'Month 2–5',
        desc: 'Wellbeing signals emerge',
        metrics: [
          { name: 'Provider Wellbeing Score', source: 'Validated burnout assessment survey · Abridge vs. non-Abridge providers at same site · quarterly', badge: 'Month 2–4', why: "Burnout improvement lags documentation relief by 2–4 months — the psychological recovery takes time. This is the mechanism that connects reduced documentation burden to eventual retention improvement." },
          { name: 'Satisfaction with Documentation Workflow', source: 'EHR satisfaction survey or department pulse · Abridge adopters vs. non-adopters', badge: 'Month 2–4', why: "The most direct attitudinal signal — do providers feel the tool is helping? Tracks separately from wellbeing because satisfaction can improve faster and is a leading indicator of adoption sustainability." },
          { name: 'Intent to Stay', source: 'Institutional engagement survey or validated single-item measure · trended quarterly', badge: 'Month 3–5', why: "Intent to stay moves before actual departures, giving you a window to act. Watch for divergence between Abridge adopters and non-adopters before annual turnover data is available." },
        ],
        callout: "The CFO bridge: Wellbeing scores don't appear on a balance sheet. Build the connection explicitly: improved wellbeing is a leading indicator of lower voluntary departure intent, which translates directly into reduced replacement and locum costs at quantifiable rates.",
      },
      proof: {
        window: 'Month 9–18',
        desc: 'Retention and cost confirmed',
        metrics: [
          { name: 'Locum & Agency Utilization', source: 'Finance / staffing data · locum hours and cost per open shift · year-over-year comparison', badge: 'Month 9–18', why: "Locum spend drops when fewer providers are leaving or on medical leave from burnout. It's the financial proof of the workforce story that CFOs can see directly in the budget." },
          { name: 'Voluntary Turnover Rate', source: 'HR data · annual voluntary departures / headcount · Abridge providers vs. non-Abridge or pre-adoption baseline', badge: 'Month 12–18', why: "The lagging outcome — takes 12–18 months because departure decisions have long lead times and are measured annually. Meaningful only in comparison to a baseline cohort, not in isolation." },
        ],
        callout: "Why the long timeline: Voluntary turnover is a lagging indicator — you need 12–18 months before departure rates are statistically meaningful. The strategy is to demonstrate pajama time reduction early, link it to wellbeing at Month 4, and let turnover data confirm the story as it matures.",
      },
    },
  },

  // ── REVENUE ───────────────────────────────────────────────────────────────
  {
    domain: 'REVENUE',
    number: 'Domain 3 of 4',
    badge: 'E/M Accuracy & Denial Prevention',
    northStar: 'Revenue Per Visit',
    direction: '↑',
    northStarSub: "E/M coding in outpatient runs on Medical Decision Making. When documentation captures the full complexity of the clinical conversation, codes reflect what was actually managed — and revenue per visit reflects the work actually done.",
    matterBoxes: [
      {
        tag: 'CFO / VP Revenue Cycle',
        body: "E/M distribution underrepresenting complexity, first-pass claim acceptance below 95%, or revenue cycle citing documentation gaps as a denial root cause. Two recovery mechanisms — coding accuracy and denial prevention — both improve with the same intervention.",
      },
      {
        tag: 'CMO / CDO',
        body: "When documentation doesn't capture the complexity of the visit, the physician is billing below the work actually performed. Improved note quality recovers revenue already earned — it's attribution, not upcoding.",
      },
    ],
    matterLayout: '2col'
    chain: [
      { key: 'source', label: 'Abridge Ambient', sub: 'outpatient documentation AI', isSource: true },
      {
        key: 'completeness', label: 'Documentation Completeness ↑', sub: 'full clinical conversation captured',
        detail: {
          cols: [
            { l: 'What it means', b: "The degree to which a note captures the full clinical encounter — presenting complaint, HPI depth, relevant history, exam findings, and Medical Decision Making. Under time pressure, providers document the minimum. Ambient capture preserves what was actually discussed." },
            { l: 'Why the conversation is the evidence', b: "The medical decision-making that justifies a Level 4 or Level 5 code happens in the conversation — the review of prior records, the weighing of diagnostic options, the reasoning behind the plan. If that reasoning isn't in the note, the code isn't supportable." },
            { l: 'How to measure it', b: 'Charge lag (days to bill) is the behavioral proxy — faster, more complete notes close the billing cycle sooner. E/M level distribution shifts are the financial signal.' },
          ],
          grad: "When same-day note completion rate reaches a consistent high and charge lag drops, the documentation foundation is set. Start watching E/M distribution data as the next signal.",
        },
      },
      {
        key: 'emlevels', label: 'E/M Level Support ↑', sub: 'visit complexity documented',
        detail: {
          cols: [
            { l: 'What it measures', b: 'The degree to which visit notes contain the documentation elements required to support higher E/M levels — specifically the Medical Decision Making complexity that distinguishes Level 3 from Level 4 and Level 4 from Level 5.' },
            { l: 'The under-coding pattern', b: "Providers under time pressure default to lower E/M codes because the note doesn't support the complexity of what was actually managed. This is revenue earned but not captured — and it happens at scale across a full panel." },
            { l: 'Data source', b: 'Billing system. Pull E/M distribution per provider and compare pre/post Abridge adoption. Use same-provider comparison to control for patient acuity differences.' },
          ],
        },
      },
      {
        key: 'mdm', label: 'Medical Decision Making Documented ↑', sub: 'the "why" behind the plan',
        detail: {
          cols: [
            { l: 'What it captures', b: "The clinical reasoning behind diagnosis and treatment decisions — the provider's assessment of the number of diagnoses, data reviewed, and risk of complications. Under AMA 2021 guidelines, MDM is the primary E/M level driver." },
            { l: 'Why the reasoning is often missing', b: "Providers articulate their reasoning during the encounter — out loud, to the patient. Under time pressure, that reasoning doesn't make it into the note. Ambient capture preserves it without requiring the provider to type it separately." },
            { l: 'Where it matters most', b: 'Level 4 (moderate MDM) and Level 5 (high MDM) documentation. These are the codes most frequently under-captured and most frequently challenged in payer audits.' },
          ],
        },
      },
      {
        key: 'revenuepervisit', label: 'Revenue Per Visit ↑', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'Average wRVUs per encounter × conversion factor, net of payer mix adjustments. The primary financial metric for outpatient physician productivity and practice revenue.' },
            { l: 'Data source', b: 'Billing system. Per-provider comparison. Show both the mean and the E/M distribution — a distribution shift toward higher codes often looks small in the mean but is significant in aggregate.' },
            { l: 'Expectation setting', b: 'Outpatient E/M improvement is recovering revenue already earned but not fully captured. Expected lift of 5–8% in wRVU per encounter for consistent users. The distribution shift matters more than the mean.' },
          ],
        },
      },
      {
        key: 'denials', label: 'Denial Rate ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: "Claims denied by payers for documentation-related reasons — primarily insufficient medical necessity documentation or E/M level not supported by the note." },
            { l: 'Data source', b: 'Revenue cycle system. Isolate documentation-related denials from coverage and eligibility denials. First-pass acceptance rate is the positive framing of this metric.' },
            { l: 'Why documentation denials are preventable', b: "Unlike eligibility or authorization denials, documentation-related denials happen because the note didn't contain what the payer needed to adjudicate. When the note captures the clinical reasoning, those denials don't happen." },
          ],
        },
      },
    ],
    timeline: {
      signal: {
        window: 'Week 2 – Month 3',
        desc: 'Documentation behavior shifts',
        metrics: [
          { name: 'Documentation Time Per Visit ↓', source: 'EHR audit logs · active documentation time per encounter · pre/post per-provider · most direct Abridge signal', badge: 'Week 2–4', why: "When documentation time per visit drops, the note is being completed during or immediately after the encounter rather than in the evening. This is the upstream behavior that E/M accuracy, first-pass rates, and wRVU per encounter all depend on." },
          { name: 'Same-Day Note Completion Rate ↑', source: 'EHR data · % of outpatient notes signed same calendar day as encounter · Abridge providers vs. baseline', badge: 'Week 4–8', why: "Notes signed the same day are the foundation for accurate coding, same-day charge submission, and lower denial risk. When this rate is consistently high, the documentation behavior has changed — the revenue metrics follow." },
          { name: 'Prior Authorization Peer-to-Peer Review Rate ↓', source: 'Utilization management system or prior auth platform · # of peer-to-peer reviews initiated per 100 prior auth requests · trended monthly', badge: 'Month 1–3', why: "P2P reviews are triggered when the initial prior auth request lacks sufficient clinical justification. When notes capture full medical necessity — diagnosis context, previous treatments tried, clinical rationale — prior auths are approved on first submission more often. Fewer P2P reviews per month is a leading signal that documentation quality is meeting payer standards before billing even begins." },
        ],
        callout: "Why start here: E/M level distribution, first-pass acceptance rate, and wRVU per encounter all follow from documentation completeness. These metrics can't move if the notes aren't changing first — documentation behavior is the gate.",
      },
      trend: {
        window: 'Month 1–5',
        desc: 'Coding and billing signals emerge',
        metrics: [
          { name: 'E/M Level Distribution per Provider', source: 'Billing system · % of visits at each level (99202–99215) · same-provider pre/post comparison · show distribution, not just mean', badge: 'Month 1–3', why: "Complete notes enable accurate E/M coding at the level of care actually delivered. Watch the distribution shift toward appropriate higher levels — the story is in the mix, not just the average." },
          { name: 'First-Pass Claim Acceptance Rate', source: 'Revenue cycle system · % of claims accepted without denial or revision on first submission · trended monthly', badge: 'Month 1–3', why: "Notes with sufficient specificity pass coding review without queries. A rising first-pass rate means less rework, faster cash flow, and proof that note quality is improving before the revenue numbers confirm it." },
          { name: 'Claims Rework Staff Hours ↓', source: 'RCM system or billing team logs · staff hours per week spent reworking denied or rejected outpatient claims · trended monthly', badge: 'Month 1–3', why: "Documentation-related denials require staff time to pull records, write appeal letters, and resubmit. When note quality improves, the same work simply isn't triggered. Tracking rework hours isolates the operational cost of poor documentation before the denial rate number itself moves." },
          { name: 'HCC Capture Rate', source: 'Coding or quality team · % of eligible Medicare Advantage patients with documented HCC codes · Abridge vs. baseline · connects revenue and quality stories', badge: 'Month 3–5', why: "Accurate chronic condition documentation allows HCC codes to be assigned — not upcoding, but complete capture. This bridges the revenue and quality stories: better documentation supports both risk adjustment and quality measure attribution." },
        ],
        callout: "The HCC connection: For Medicare Advantage panels, accurate chronic condition documentation supports both E/M level and HCC risk adjustment. These are not competing narratives — they're the same documentation quality story told to two different audiences.",
      },
      proof: {
        window: 'Month 3–9',
        desc: 'Revenue impact confirmed',
        metrics: [
          { name: 'wRVU Per Encounter', source: 'Billing system · per-provider pre/post · show distribution (99202–99215), not just mean · provider-level granularity required', badge: 'Month 3–6', why: "The financial proof that documentation completeness translates to appropriate reimbursement. Provider-level pre/post comparison shows the attribution — and the distribution shift (not just the mean) is the real signal." },
          { name: 'Documentation-Related Denial Rate', source: 'Revenue cycle · documentation denials per 100 claims · isolated from coding and eligibility denials', badge: 'Month 4–9', why: "Denials caused by documentation gaps are entirely preventable. A declining rate is the clearest proof that note quality is consistently meeting payer standards — not just improving on average." },
        ],
        callout: "The honest attribution: E/M improvement is recovery, not inflation. Providers were managing the complexity — the documentation wasn't supporting the code. When the note reflects what happened, revenue per visit reflects the work actually done.",
      },
    },
  },

  // ── QUALITY ───────────────────────────────────────────────────────────────
  {
    domain: 'QUALITY',
    number: 'Domain 4 of 4',
    badge: 'HEDIS & Preventive Care Attribution',
    northStar: 'Care Gap Closure Rate',
    direction: '↑',
    northStarSub: "Care gaps close through two mechanisms: documentation quality and physician presence. When documentation happens automatically, providers aren't mentally composing the note during the visit — they're fully in the encounter, which means they notice and act on more gaps. And when care is delivered, it gets captured with the specificity quality systems require.",
    matterBoxes: [
      {
        tag: 'CMO / VP Quality',
        body: "HEDIS scores below benchmark despite strong clinical performance, or quality gaps that don't match the care your team reports delivering. The gap is frequently documentation attribution — care was delivered, but not captured in a way quality systems can attribute.",
      },
      {
        tag: 'CFO',
        body: "Value-based contracts pay for documented quality performance. STARS ratings and shared savings calculations depend on care gap closure evidence. Documentation quality improvement is a direct quality revenue lever.",
      },
    ],
    matterLayout: '2col'
    chain: [
      { key: 'source', label: 'Abridge Ambient', sub: 'outpatient documentation AI', isSource: true },
      {
        key: 'presence', label: 'Physician Presence in Visit ↑', sub: 'cognitive bandwidth freed',
        detail: {
          cols: [
            { l: 'The second causal path', b: "Documentation burden doesn't just affect notes — it affects the visit itself. A physician planning to document after the encounter spends cognitive energy during the visit tracking what to remember, not fully engaging with the clinical checklist in front of them." },
            { l: 'What changes with Abridge', b: "When documentation is happening automatically, the physician's attention is fully on the patient. That presence makes it more likely they notice an overdue screening, raise it with the patient, and act on it — not just capture it in the note afterward." },
            { l: 'Why this matters', b: "This mechanism increases the rate at which care gaps are actually addressed during visits — not just the rate at which already-addressed gaps are properly documented. It's a distinct and additive effect." },
          ],
          grad: "This path is harder to isolate in data, but rising care gap closure rates in high-utilization Abridge practices — especially for proactive gaps the physician must raise — are the clearest indicator it's operating.",
        },
      },
      {
        key: 'capture', label: 'Preventive & Chronic Care Captured ↑', sub: 'delivered care documented',
        detail: {
          cols: [
            { l: 'What it means', b: "Preventive services (screenings, counseling, immunizations) and chronic disease management activities documented with the specificity quality measurement systems require — not just a notation that they were addressed." },
            { l: 'The documentation gap', b: "Providers often deliver the care and document it briefly. Quality measurement systems require specific terminology, codes, and clinical context to attribute the service. When documentation is minimal, services are missed even when care is delivered." },
            { l: 'What Abridge preserves', b: "The clinical conversation typically includes the preventive care discussion — the recommendation, the patient response, and the plan. Ambient capture preserves this specificity in the note automatically." },
          ],
          grad: "When post-visit note completeness reaches a consistent high for preventive and chronic care visits, the documentation foundation is in place. Start watching quality measure attribution rates as confirmation.",
        },
      },
      {
        key: 'attribution', label: 'Quality Measure Attribution ↑', sub: 'care mapped to measures',
        detail: {
          cols: [
            { l: 'What it means', b: 'The degree to which documented clinical care can be attributed by quality measurement systems (HEDIS, STARS) to the specific measures they track — diabetes management, preventive screenings, medication adherence, and others.' },
            { l: 'The attribution gap', b: "Providers may have counseled a patient on colorectal cancer screening, but if the note says 'discussed preventive care' rather than documenting the specific screening recommendation and patient decision, HEDIS can't attribute it as a care gap closure." },
            { l: 'How complete notes close the gap', b: "Specific documentation — naming the screening, documenting the result or referral, capturing the patient conversation — is what turns a clinical activity into an attributed care gap closure." },
          ],
        },
      },
      {
        key: 'hedis', label: 'HEDIS Compliance ↑', sub: 'measures met and attributed',
        detail: {
          cols: [
            { l: 'What it measures', b: "HEDIS (Healthcare Effectiveness Data and Information Set) — the primary quality measurement framework used by health plans to evaluate clinical performance. Over 90 measures spanning preventive care, chronic disease management, and behavioral health." },
            { l: 'Why documentation is the gap', b: "HEDIS measurement relies on administrative claims and medical record review. For medical record measures, the record must contain the evidence. Incomplete documentation means measures go unmet even when care was delivered." },
            { l: 'The plan relationship', b: "Payers report HEDIS scores and use them to evaluate network performance. Better HEDIS scores strengthen value-based contract negotiations and can affect network inclusion for high-performing practices." },
          ],
        },
      },
      {
        key: 'caregap', label: 'Care Gap Closure Rate ↑', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'The percentage of identified care gaps — preventive services due, chronic disease management protocols needed, screenings overdue — that are documented as closed in the measurement period.' },
            { l: 'Data source', b: 'Health plan data, population health platform, or practice\'s own care gap tracking system. Compare Abridge providers vs. baseline or non-Abridge cohort. Monthly or quarterly trending.' },
            { l: 'Why it connects to revenue', b: "In value-based contracts, care gap closure rate often ties directly to quality bonus payments. Better documentation that closes gaps faster means faster access to quality-performance revenue." },
          ],
        },
      },
      {
        key: 'stars', label: 'STARS Rating ↑', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: "CMS Medicare Advantage STARS rating — a 1–5 star quality rating that affects CMS bonus payments to health plans and influences patient plan selection. Higher star ratings earn higher bonus payments." },
            { l: 'The financial connection', b: "CMS bonus payments for 4-star and 5-star plans can run into the hundreds of millions of dollars for large insurers — creating strong financial incentives for plans to improve provider documentation quality." },
            { l: 'The provider relationship', b: "Practices that consistently document quality measure elements are preferred partners for high-performing MA plans. Better STARS performance strengthens network relationships and value-based contract terms." },
          ],
        },
      },
    ],
    timeline: {
      signal: {
        window: 'Week 4–10',
        desc: 'Note specificity improves',
        metrics: [
          { name: 'Note Completeness Score ↑', source: 'CDI audit, chart review rubric, or documentation quality tool · average completeness % across outpatient notes · Abridge providers vs. baseline', badge: 'Week 4–8', why: "Completeness is the upstream input for every downstream quality metric. HEDIS attribution, care gap closure, and chronic condition management all require notes that capture the full clinical encounter — not just the visit date and chief complaint. This is the foundational signal to establish before any outcome measure is credible." },
          { name: 'Care Gap Documentation Rate', source: "EHR or population health platform · % of scheduled care gap visits resulting in a documented care gap closure · Abridge vs. baseline · early proxy for attribution quality", badge: 'Week 4–8', why: "The upstream gate for everything downstream. If care gaps are being closed but not documented with sufficient specificity, quality systems can't attribute the closure. This measures whether documentation is opening that door." },
          { name: 'Post-Visit Note Specificity', source: 'Qualitative or CDI audit · % of notes containing specific terminology for preventive services vs. generic "discussed" language · directional signal', badge: 'Week 6–10', why: "Specific language (e.g., 'mammogram discussed, patient declined due to preference') is the difference between a closeable quality measure and a missed attribution. Generic notes can't be acted on by quality systems." },
        ],
        callout: "Graduation signal: When post-visit note specificity for preventive and chronic care visits reaches a consistent high, the documentation foundation is in place. Start watching quality measure attribution rates as the next confirmation.",
      },
      trend: {
        window: 'Month 2–5',
        desc: 'Measure attribution improves',
        metrics: [
          { name: 'Quality Measure Attribution Rate', source: 'Population health platform or health plan data · % of qualifying visits resulting in attributed quality measure closure · Abridge providers vs. baseline', badge: 'Month 2–4', why: "Connects documentation specificity to actual quality measure closure — this is where better notes turn into performance credit. The transition from documenting to attributing is the key signal." },
          { name: 'HEDIS Composite Score', source: 'Health plan or practice-level HEDIS reporting · composite across relevant measures · compare Abridge providers to non-Abridge cohort', badge: 'Month 3–5', why: "The first composite quality signal reportable to health plans. Takes 3–5 months because it requires sufficient encounter volume to show a trend — but this is what payers and VBC contracts actually measure." },
          { name: 'Specialist Callback Rate on Referrals ↓', source: 'Referral management platform or specialist office log · # of callbacks or incomplete referrals per 100 outbound referrals · trended monthly', badge: 'Month 2–4', why: "When referral documentation is incomplete — missing relevant history, current medications, or the clinical question for the specialist — the receiving provider calls back for more information before they can act. A declining callback rate is a clean signal that outbound documentation quality is improving. It also shortens time-to-specialist-care for patients." },
        ],
        callout: "The attribution lag: HEDIS measurement uses claims and records from the measurement year. Real-time documentation improvement shows up in population health platforms first, then in formal HEDIS reporting at year-end. Track the leading indicator, not just the annual score.",
      },
      proof: {
        window: 'Month 9–18',
        desc: 'Quality scores confirm',
        metrics: [
          { name: 'HEDIS Composite Score vs. Benchmark', source: 'Health plan reporting · annual HEDIS composite score · Abridge provider cohort vs. prior year and peer practices', badge: 'Month 9–18', why: "The annual strategic proof point — how Abridge-enabled practices compare to peers on the measures health plans use to allocate bonuses. Documentation is not the only driver, but it's the foundational one." },
          { name: 'MA STARS Rating', source: 'CMS plan-level reporting · annual STARS rating · directional comparison to prior year · documentation quality is one of many contributors', badge: 'Month 12–18', why: "STARS ratings affect rebate dollars and quality bonuses in Medicare Advantage. Documentation is one of many contributors, but accurate and complete notes are the foundation every other quality intervention builds on." },
        ],
        callout: "The long game: STARS ratings reflect care from the prior measurement year and change slowly. The strategy is to demonstrate care gap closure rate improvement early, link it to HEDIS intermediate scores at Month 6, and let the annual STARS data confirm the story at Year 2.",
      },
    },
  },
];

// ─── Value Architecture Data ──────────────────────────────────────────────────

const opFramework: FrameworkItem[] = [
  {
    domain: 'CAPACITY',
    tag: 'modeled',
    narrative: 'Clinical time is the binding constraint on outpatient panel capacity. Published research suggests physicians spend 1–2 hours daily on EHR tasks outside patient care. When ambient documentation reduces time per visit, that recovered time may become available for additional appointments — though not all of it converts directly to schedulable slots. Workflow absorption, administrative tasks, and scheduling constraints mean a realistic conversion is typically 40–50% of documentation time saved. The model applies that realization rate explicitly, then divides by visit length to produce an actual appointment count.',
    chain: ['Documentation Time/Visit ↓', 'Available Clinical Time ↑', 'Panel Capacity ↑'],
    chainOutput: 'Patient Access ↑',
    steps: [
      {
        vars: [
          { v: 'Minutes saved per visit', kind: 'input' },
          { v: 'Daily E/M visits per provider', kind: 'input' },
          { v: 'Time-to-visit realization rate', kind: 'benchmark', hint: '~45%' },
        ],
        result: 'Realizable min/provider/day',
      },
      {
        vars: [
          { v: 'Realizable min/provider/day', kind: 'derived' },
          { v: 'Avg E/M visit length (min)', kind: 'input', op: '÷' },
        ],
        result: 'Additional appts/provider/day',
      },
      {
        vars: [
          { v: 'Additional appts/day', kind: 'derived' },
          { v: 'Provider FTEs', kind: 'input' },
          { v: 'Working days/year', kind: 'default', hint: '240' },
          { v: 'Net revenue per visit', kind: 'input' },
        ],
        result: 'Annual capacity revenue',
        isFinal: true,
      },
    ],
  },
  {
    domain: 'WORKFORCE',
    tag: 'modeled',
    narrative: 'Documentation burden is consistently cited in published research as a leading contributor to outpatient physician burnout — particularly work extending beyond scheduled clinic hours. Industry estimates (MGMA, AAFP) place voluntary physician replacement costs at $250K–$500K per departure, accounting for recruiting, locum coverage, credentialing, and productivity ramp. Not all voluntary departures are documentation-attributable; the model explicitly applies an estimated fraction rather than claiming all turnover stems from documentation, making the connection defensible.',
    chain: ['After-Hours Charting ↓', 'Evening Documentation Burden ↓', 'Provider Wellbeing ↑', 'Intent to Stay ↑'],
    chainOutput: 'Voluntary Turnover ↓',
    steps: [
      {
        vars: [
          { v: 'Annual voluntary departures', kind: 'input' },
          { v: 'Documentation-attributable fraction', kind: 'benchmark', hint: '~20%' },
          { v: 'Expected improvement with ambient', kind: 'benchmark', hint: '~25–35%' },
        ],
        result: 'Est. departures avoided/yr',
      },
      {
        vars: [
          { v: 'Est. departures avoided', kind: 'derived' },
          { v: 'Physician replacement cost', kind: 'benchmark', hint: '$250K–$450K' },
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
    narrative: 'Outpatient E/M codes under MDM-based guidelines require specific documentation of problems addressed, data reviewed, and management risk. When documentation is incomplete, coding may land at a lower level than the encounter warranted — not because care wasn\'t delivered, but because the record doesn\'t fully reflect it. This effect applies specifically to E/M-coded visits, not all encounters, so the model denominates by E/M visit volume explicitly. A separate denial component captures claim-integrity benefit, as documentation gaps are a commonly cited root cause of first-pass outpatient billing failures.',
    chain: ['Documentation Completeness ↑', 'MDM Elements Captured ↑', 'E/M Level Accuracy ↑'],
    chainOutput: 'Revenue Per Visit ↑',
    steps: [
      {
        vars: [
          { v: 'Total annual visits', kind: 'input' },
          { v: 'E/M-coded visit fraction', kind: 'benchmark', hint: '~75%' },
        ],
        result: 'Annual E/M visit volume',
      },
      {
        vars: [
          { v: 'Annual E/M visits', kind: 'derived' },
          { v: 'E/M level improvement rate', kind: 'input' },
          { v: 'Avg revenue delta per level', kind: 'benchmark', hint: '~$40–60' },
        ],
        result: 'E/M coding impact',
      },
      {
        vars: [
          { v: 'Annual E/M visits', kind: 'derived' },
          { v: 'Documentation denial rate reduction', kind: 'input' },
          { v: 'Avg outpatient denial value', kind: 'benchmark', hint: '~$150–250' },
        ],
        result: 'Denial recovery',
      },
      {
        vars: [
          { v: 'E/M coding impact', kind: 'derived' },
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
    narrative: 'HEDIS and STARS performance is partly a documentation attribution problem. Care provided but not recorded with the specificity quality measurement systems require may not be attributed as a care gap closure. When ambient documentation captures the encounter more completely — the specific screening discussed, the patient\'s response, the clinical plan — there may be more attributable evidence available for measure review. Attribution improvements are tracked over time but not modeled in dollars, as quality incentive amounts are health plan- and contract-specific.',
    chain: ['Documentation Specificity ↑', 'Care Gap Attribution ↑', 'HEDIS Composite ↑'],
    chainOutput: 'STARS Performance ↑',
    note: 'Not modeled in dollars — quality incentive amounts depend on health plan contracts, measure thresholds, and payer mix. Tracked as HEDIS composite score, care gap closure rate, and MA STARS directional movement.',
  },
];

// ─── Personas & Discovery Questions ──────────────────────────────────────────

const opFrameworkPersonas: Record<DomainName, string[]> = {
  CAPACITY:  ['CMO', 'Practice Administrator'],
  WORKFORCE: ['CMO', 'CHRO'],
  REVENUE:   ['CFO', 'VP Revenue Cycle'],
  QUALITY:   ['VP Quality', 'Health Plan Lead'],
};

const opFrameworkQuestions: Record<DomainName, string[]> = {
  CAPACITY: [
    'Are you tracking third-next-available-appointment, and is documentation time a known contributor to the access constraint?',
    'If providers could see 1–2 more patients per day without extending their day, what would that mean for your access and revenue?',
    'Are you tracking after-hours EHR time for outpatient physicians — and do you know how much is documentation versus other tasks?',
  ],
  WORKFORCE: [
    'What does voluntary physician turnover look like in your outpatient setting, and has documentation burden come up in exit conversations?',
    'Are providers frequently completing notes during evenings or weekends — and is that reflected in your EHR data?',
    'What would it mean for your physician satisfaction scores if after-hours charting dropped significantly?',
  ],
  REVENUE: [
    'How does your E/M distribution compare to what your clinical leadership thinks reflects the actual complexity mix you\'re seeing?',
    'What\'s your current first-pass denial rate, and do you know what fraction is driven by documentation gaps versus eligibility or coding issues?',
    'Are your coders flagging documentation gaps as a root cause of coding downgrades or claims rejections?',
  ],
  QUALITY: [
    'What are your HEDIS or STARS scores, and is care gap attribution — care that was delivered but not credited — a factor in your performance?',
    'When your quality team looks at care gap closures that didn\'t get attributed, how often is the root cause documentation rather than care delivery?',
    'Are health plan contracts tying any bonuses or risk arrangements to quality performance that your documentation gaps might be affecting?',
  ],
};

// ─── Value Architecture Component ────────────────────────────────────────────

function OPValueArchitectureSection() {
  const domainOrder: DomainName[] = ['WORKFORCE', 'CAPACITY', 'REVENUE', 'QUALITY'];
  const sortedFramework = [...opFramework].sort((a, b) => domainOrder.indexOf(a.domain) - domainOrder.indexOf(b.domain));
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
          const personas = opFrameworkPersonas[item.domain] ?? [];
          const questions = opFrameworkQuestions[item.domain] ?? [];
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

// ─── OP Domain Card ───────────────────────────────────────────────────────────

function OPDomainCard({ data }: { data: OPDomainCardData }) {
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
            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#999999] mb-1.5">{data.number} · Outpatient</p>
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
        Results vary based on EHR configuration, provider adoption, payer mix, and organizational factors. Timelines represent ranges and should be validated against your organization's baseline data.
      </div>
    </div>
  );
}

// ─── OP Adoption Section ──────────────────────────────────────────────────────

function OPAdoptionSection() {
  const metrics = [
    {
      tag: "Breadth",
      label: "% of outpatient clinicians using ambient",
      why: "Is Abridge in the workflow for most providers, or concentrated in a few early adopters? Coverage below 60–70% makes attribution claims unreliable — the downstream numbers reflect a subpopulation, not the practice.",
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
      why: "Sessions under 5 minutes typically indicate abandonment before full note capture. Complete outpatient visits run 10–20 minutes. Duration is the behavioral proof the session actually captured the clinical conversation.",
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

// ─── OP Domain Methodology Section ───────────────────────────────────────────

function OPDomainMethodologySection() {
  const domainOrder: DomainName[] = ['WORKFORCE', 'CAPACITY', 'REVENUE', 'QUALITY'];
  const sortedCards = [...opDomainCards].sort((a, b) => domainOrder.indexOf(a.domain) - domainOrder.indexOf(b.domain));
  const [activeDomain, setActiveDomain] = useState(sortedCards[0].domain);
  const activeCard = sortedCards.find(c => c.domain === activeDomain)!;

  return (
    <div className="mb-10">
      <div className="mb-6 pb-3 border-b-2 border-[#EA2C00]">
        <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#888888] mb-2">The Outpatient Value Story</p>
        <h2 className="text-[24px] font-bold text-black tracking-tight">Four Domains of Value</h2>
        <p className="text-sm text-[#888888] mt-1">
          Each domain has a distinct North Star outcome, a causal chain showing how Abridge enables it, and a measurement path with honest timelines.
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
        <OPDomainCard data={activeCard} />
      </motion.div>
    </div>
  );
}

// ─── Value Arc Section ────────────────────────────────────────────────────────

function OPValueArcSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const stages: {
    number: string;
    badge: BadgeType;
    timing: string;
    title: string;
    description: string;
    activeDomains: DomainName[];
  }[] = [
    {
      number: "01",
      badge: "Signal",
      timing: "Week 4–8",
      title: "The Provider Feels It",
      description: "Post-visit note completion time drops. Pajama time approaches zero. EHR audit logs show documentation closing at the point of care.",
      activeDomains: ["WORKFORCE", "CAPACITY"],
    },
    {
      number: "02",
      badge: "Trend",
      timing: "Month 2–4",
      title: "The Schedule & Chart Show It",
      description: "E/M level distribution shifts in billing data. Care gap documentation rates rise. Same-day slot availability improves as clinical time is recaptured.",
      activeDomains: ["REVENUE", "QUALITY"],
    },
    {
      number: "03",
      badge: "Proof",
      timing: "Month 6–18",
      title: "The Practice Measures It",
      description: "Third Next Available improves. HEDIS composite scores respond. Provider retention data confirms what wellbeing surveys predicted at Month 3.",
      activeDomains: ["CAPACITY", "WORKFORCE", "REVENUE", "QUALITY"],
    },
  ];

  return (
    <div ref={ref} className="mb-10 rounded-2xl overflow-hidden" style={{ background: "linear-gradient(160deg, #141210 0%, #1C1714 100%)" }}>
      <div className="px-8 pt-10 pb-8">

        {/* Header */}
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

        {/* Stage cards */}
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
              {/* Faint background number — tucked into bottom-right corner */}
              <div
                className="absolute bottom-1 right-2.5 text-[44px] font-black leading-none select-none pointer-events-none"
                style={{ color: "rgba(255,255,255,0.04)", fontVariantNumeric: "tabular-nums" }}
              >
                {stage.number}
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {stage.badge}
                </span>
                <span className="text-[11px] font-medium tabular-nums" style={{ color: "rgba(255,255,255,0.28)" }}>
                  {stage.timing}
                </span>
              </div>

              <p className="text-[19px] font-bold text-white tracking-tight leading-snug mb-2">{stage.title}</p>
              <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{stage.description}</p>

              {/* Active domains only — mt-auto pins this row to the bottom of every card */}
              <div className="flex flex-wrap gap-1.5 pt-4 mt-auto" style={i < 2 ? { borderTop: "1px solid rgba(255,255,255,0.07)" } : undefined}>
                {stage.activeDomains.map(d => (
                  <span
                    key={d}
                    className="rounded-sm px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide"
                    style={{ background: "rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.65)" }}
                  >
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

export function MethodologyOutpatient({ onBack, onHome, onNavigateToSetting, onBuildModel }: MethodologyOutpatientProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await generateMethodologyPDF("outpatient");
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
          <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#EA2C00] mb-4">Outpatient</p>
          <h1 className="text-[32px] md:text-[40px] font-bold text-black leading-tight tracking-tight mb-4">
            How We Think<br />About Value
          </h1>
          <p className="text-[15px] text-[#666666] max-w-[560px] mx-auto leading-relaxed">
            Office visits, primary care, and specialty — where documentation burden is daily and access is the competitive constraint.
          </p>
        </motion.div>

        <OPValueArcSection />

        <OPDomainMethodologySection />

        <OPValueArchitectureSection />

        <motion.div className="mt-4 mb-10 bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] rounded-lg p-8 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="text-xl font-bold text-white mb-2">Ready to Build Your Model?</h3>
          <p className="text-[#999999] mb-6 text-sm">Use these methodology principles to create a customized ROI model for your outpatient practice.</p>
          <button onClick={onBuildModel ?? onBack} className="inline-flex items-center gap-2 bg-[#EA2C00] hover:bg-[#D12600] text-white font-medium px-6 py-3 rounded-lg transition-colors" data-testid="button-build-model">
            Build an Outpatient Model <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        <p className="text-xs text-[#888888] leading-relaxed mb-6">Projections are modeled estimates based on user-provided inputs, published industry benchmarks, and aggregated deployment experience. Actual results may vary based on implementation approach, provider adoption, organizational factors, and care setting.</p>

        <div className="mb-8">
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Related Methodologies</p>
          <div className="grid md:grid-cols-3 gap-4">
            <button onClick={() => onNavigateToSetting?.("ed")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-ed">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Activity className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Emergency</p><p className="text-xs text-[#888888]">High-volume documentation pressure</p></div>
            </button>
            <button onClick={() => onNavigateToSetting?.("inpatient")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-inpatient">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Building2 className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Inpatient</p><p className="text-xs text-[#888888]">DRG accuracy & CMI</p></div>
            </button>
            <button onClick={() => onNavigateToSetting?.("nursing")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-nursing">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Heart className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Nursing</p><p className="text-xs text-[#888888]">Flowsheet & care documentation</p></div>
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
