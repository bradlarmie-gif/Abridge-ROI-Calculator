import { motion, useInView } from "framer-motion";
import { useState, useRef } from "react";
import { ArrowLeft, Download, ArrowRight, Activity, Building2, Stethoscope, Loader2 } from "lucide-react";
import { generateMethodologyPDF } from "@/lib/methodology-pdf-export";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';
import {
  NarrativeText,
  type BadgeType,
  type DomainName,
} from "@/components/methodology/MethodologyShared";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MethodologyNursingProps {
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

type NursingDomainCardData = {
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

const nursingDomainCards: NursingDomainCardData[] = [
  // ── CAPACITY ──────────────────────────────────────────────────────────────
  {
    domain: 'CAPACITY',
    number: 'Domain 1 of 4',
    badge: 'Shift Completion & Staffing Efficiency',
    northStar: 'Nursing Overtime',
    direction: '↓',
    northStarSub: "Nursing is the only care setting where documentation time savings convert directly to a payroll dollar. Nurses are hourly. Every minute of post-shift charting that ambient flowsheet capture eliminates is a minute that doesn't appear on the overtime register — multiplied across a panel of 5–6 patients per shift.",
    matterBoxes: [
      {
        tag: 'COO / CNO',
        body: "Overtime a visible line item in the nursing budget, or time-and-attendance data showing consistent post-shift EHR activity. Post-shift documentation time is a direct overtime driver — nurses finishing charts after clock-out are working beyond scheduled hours.",
      },
      {
        tag: 'CFO',
        body: "EHR audit logs tie directly to time-and-attendance data — nurses finishing charts after shift end are charging overtime hours for documentation. This makes documentation ROI payroll-verifiable within 90 days, not a modeled estimate.",
      },
    ],
    matterLayout: '2col',
    chain: [
      { key: 'source', label: 'Abridge Nursing', sub: 'ambient flowsheet AI', isSource: true },
      {
        key: 'flowsheet', label: 'Flowsheet Documentation Time ↓', sub: '8 min/patient × 5–6 patients per shift',
        detail: {
          cols: [
            { l: 'What it measures', b: 'Time spent completing flowsheet entries, assessments, and nursing notes per patient during and after a shift. Captured via EHR session timestamps — no self-reporting required.' },
            { l: 'Why the panel multiplier matters', b: "Ambient documentation in physician settings saves time on one encounter at a time. In nursing, one shift covers 5–6 patients. Eight minutes saved per patient is 40–50 minutes per shift — a full OT increment that appears in payroll within the billing cycle." },
            { l: 'What Abridge Nursing changes', b: "Ambient flowsheet capture documents observations, assessments, and care events at the point of care as the nurse completes them. The end-of-shift charting queue shrinks from 60–90 minutes to a brief review — not because nurses work faster, but because the chart is already current." },
          ],
          grad: "When post-shift EHR session time reaches a stable low across the panel, the documentation bottleneck has closed. Payroll data in the next billing period will confirm the OT impact.",
        },
      },
      {
        key: 'endshift', label: 'End-of-Shift Charting Burden ↓', sub: 'batched charting replaced by point-of-care',
        detail: {
          cols: [
            { l: 'What it measures', b: 'The volume of documentation tasks deferred to the end of shift — vital sign backfill, assessment completion, care event entries — that must be resolved before the nurse can clock out.' },
            { l: 'How to observe it', b: "EHR session logs. Time distribution of documentation events across the shift. Pre-Abridge: documentation clusters heavily in the final 90 minutes. Post-Abridge: distribution flattens as entries occur throughout the shift at the point of care." },
            { l: 'Why it matters beyond overtime', b: "End-of-shift charting is also a quality risk. Documentation entered hours after a care event relies on recall rather than real-time observation. Reducing the end-of-shift queue is simultaneously a labor efficiency win and a clinical record quality improvement." },
          ],
        },
      },
      {
        key: 'ontimeshifts', label: 'Shifts Complete On Time ↑', sub: 'on-time clock-out rate',
        detail: {
          cols: [
            { l: 'What it measures', b: "The percentage of nurses clocking out within 15 minutes of scheduled shift end. Tracked in your time-and-attendance system — already exists, no new infrastructure needed." },
            { l: 'Why it\'s operationally verifiable', b: "On-time clock-out rate is the most directly observable signal that documentation burden is or isn't extending the shift. Nursing managers watch this daily. When it improves on Abridge units, the conversation with finance is straightforward: here's payroll before, here's payroll after." },
            { l: 'The attribution chain', b: "On-time clock-out → fewer OT hours → payroll reduction. The chain is simple enough that a CFO can follow it from the time-and-attendance report to the OT budget line without requiring a complex model." },
          ],
        },
      },
      {
        key: 'overtime', label: 'Overtime Hours ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: "Total hours paid at the overtime rate per unit per pay period — the direct financial output of on-time shift completion. Pulled from payroll and time-and-attendance systems." },
            { l: 'Data source', b: "Payroll system. Compare OT hours per nurse per pay period on Abridge-deployed units vs. the same units in the 12 months before deployment. Control for census variation and scheduling changes." },
            { l: 'Why it\'s the fastest financially verifiable metric', b: "Physician documentation savings are modeled as capacity or retention signal — physicians are salaried. Nursing OT is a hard dollar line in the payroll register. The payroll system shows the impact within 90 days without any modeling required." },
          ],
        },
      },
      {
        key: 'staffingbudget', label: 'Staffing Budget Freed ↑', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it means', b: "OT reduction frees staffing budget that can be redirected to core headcount, per diem reduction, or simply recovered as margin. The budget line is directly visible in finance without attribution modeling." },
            { l: 'Data source', b: "Nursing department budget. Compare actual OT spend vs. budget projection on pilot units. Finance tracks this monthly — the unit manager and CNO both have visibility to the number." },
            { l: 'Secondary effect', b: "Consistent on-time shift completion also reduces the informal staffing pressure on charge nurses — they spend less time managing who's staying late to finish charting and more time on patient flow and floor coverage decisions." },
          ],
        },
      },
    ],
    timeline: {
      signal: {
        window: 'Week 4–8',
        desc: 'Post-shift EHR activity drops',
        metrics: [
          { name: 'Documentation Event Distribution Across Shift', source: 'EHR timestamps · % of documentation events occurring in last 2 hours vs. spread across full shift · pre/post comparison', badge: 'Week 4–8', why: "End-of-shift documentation backlog is visible before overtime data catches up. If nurses are documenting throughout the shift rather than the last 2 hours, the overtime overhang will shrink." },
          { name: 'Post-Shift EHR Session Time', source: 'EHR audit logs · minutes of session activity after scheduled shift end · per nurse · no survey needed', badge: 'Week 4–6', why: "Post-shift EHR activity is the nursing equivalent of pajama time — documentation carried home from the unit. This is the earliest and most direct signal that the documentation burden is lifting." },
        ],
        callout: "Why start here: Post-shift EHR data is objective, requires no new infrastructure, and is visible to nursing managers before any payroll cycle comparison is possible. It's also the signal nurses experience directly — which drives organic peer-to-peer adoption.",
      },
      trend: {
        window: 'Month 2–4',
        desc: 'OT data begins to move',
        metrics: [
          { name: 'On-Time Clock-Out Rate', source: 'Time-and-attendance system · % of nurses clocking out within 15 min of shift end · Abridge units vs. baseline', badge: 'Month 2–3', why: "Clock-out time is the operational expression of documentation burden — nurses who finish documentation during the shift leave on time. This moves faster than payroll-based overtime data." },
          { name: 'Overtime Hours Per Unit Per Pay Period', source: 'Payroll system · OT hours by unit · Abridge pilot units vs. comparable non-Abridge units · monthly comparison', badge: 'Month 2–4', why: "The aggregated expression of per-nurse documentation burden across the unit. Monthly comparison on Abridge units vs. control shows whether the capacity recapture is real and scalable." },
        ],
        callout: "The CFO conversation: Overtime data lands before any modeled or attributed metric. Present it simply: OT hours on these three units, before deployment vs. after, controlled for census. No model needed.",
      },
      proof: {
        window: 'Month 6–12',
        desc: 'Annual budget impact confirmed',
        metrics: [
          { name: 'Annual OT Spend Comparison (Pilot Units)', source: 'Payroll / finance · year-over-year OT dollars on Abridge units vs. prior 12 months · adjusted for census and scheduled changes', badge: 'Month 6–12', why: "The financial proof — OT dollars reduced on Abridge pilot units vs. baseline. This is what the CFO and CNO care about at the organizational level." },
          { name: 'Staffing Budget Variance', source: 'Nursing department budget · actual OT spend vs. budget projection on pilot units · trended monthly', badge: 'Month 9–12', why: "The budget expression of the capacity story. If OT is falling on Abridge units, that shows up as favorable variance vs. budget — a clean financial proof point for finance leadership." },
        ],
        callout: "The proof frame: A 12-month payroll comparison on units with consistent Abridge adoption is the most credible CFO-ready metric in the nursing story. It requires no assumptions — the payroll system is the source of truth.",
      },
    },
  },

  // ── WORKFORCE ─────────────────────────────────────────────────────────────
  {
    domain: 'WORKFORCE',
    number: 'Domain 2 of 4',
    badge: 'Nurse Wellbeing & Retention',
    northStar: 'Voluntary Turnover',
    direction: '↓',
    northStarSub: "Nursing turnover runs 15–22% nationally. Documentation burden is consistently cited in ANA surveys as a top driver of the voluntary departures in that range. The mechanism is mathematical: a 12-hour shift generating 60–90 minutes of post-shift charting compresses recovery time for every nurse on every shift.",
    matterBoxes: [
      {
        tag: 'CFO',
        body: "Replacing one bedside RN costs an estimated $50K–$100K fully loaded — recruiting, onboarding, orientation, productivity ramp. Specialty and ICU nurses run higher. A unit with 20 nurses at 18% turnover replaces 3–4 nurses per year. Agency and travel nurse coverage during vacancies adds cost at 2–3× employed rates.",
      },
      {
        tag: 'CNO',
        body: "Documentation burden is the most actionable lever for nurse wellbeing because it's addressable at the tool level — unlike scheduling, patient acuity, or staffing ratios, which require system-level changes. Ambient flowsheet documentation reduces the per-patient charting burden across the full panel, shift after shift.",
      },
    ],
    matterLayout: '2col',
    chain: [
      { key: 'source', label: 'Abridge Nursing', sub: 'ambient flowsheet AI', isSource: true },
      {
        key: 'burden', label: 'Documentation Burden Per Patient ↓', sub: 'multiplied across 5–6 patient panel',
        detail: {
          cols: [
            { l: 'What it measures', b: "Per-patient documentation time across the full nursing panel — flowsheet entries, assessments, care event documentation. The defining difference from physician settings: nurses manage 5–6 patients per shift, so any per-patient reduction compounds." },
            { l: 'Data source', b: "EHR session logs. Time per patient per shift for documentation-related activity. Pre-Abridge baseline vs. post-adoption comparison. Time-motion studies can validate the log data if needed." },
            { l: 'Why panel size is the mechanism', b: "A physician saving 8 minutes per encounter saves time one note at a time. A nurse saving 8 minutes per patient across a 6-patient panel saves 48 minutes per shift — the full charting burden reduction that drives overtime and wellbeing changes simultaneously." },
          ],
          grad: "When per-patient documentation time reaches a consistent low, the burden has shifted from batched end-of-shift work to distributed point-of-care capture. Watch wellbeing survey scores at Month 2–4 as the next signal.",
        },
      },
      {
        key: 'stress', label: 'End-of-Shift Stress ↓', sub: 'mental load of backlogged charting',
        detail: {
          cols: [
            { l: 'What it represents', b: "The awareness throughout a shift that documentation is accumulating — 6 patients, each requiring assessments, vitals, and care documentation, all deferred to the last 90 minutes. This cognitive load manifests as stress even when the physical workload is manageable." },
            { l: 'How to observe it', b: "Indirectly: validated burnout instruments with documentation-specific subscores (NDNQI RN Job Satisfaction Survey, Maslach Burnout Inventory documentation subscale). Not a standalone metric — it manifests in satisfaction scores and intent-to-stay surveys." },
            { l: 'Why it precedes retention changes', b: "Stress reduction from documentation burden relief shows up in wellbeing data at Month 2–4, before turnover data is statistically meaningful. This is the bridge that lets a CNO make the financial case before the lagging retention data arrives." },
          ],
        },
      },
      {
        key: 'wellbeing', label: 'Nurse Wellbeing ↑', sub: 'leading indicator of retention',
        detail: {
          cols: [
            { l: 'What it measures', b: "Nurse satisfaction, burnout level, and perceived work-life balance — captured through a validated burnout assessment survey or institutional engagement instrument. The documentation-specific subscores are the most Abridge-attributable dimensions." },
            { l: 'Data source', b: "Institutional survey, NDNQI, or validated burnout instrument. Administer the same instrument at baseline and at 90-day intervals on pilot vs. control units. The documentation subscore should move faster than composite engagement scores." },
            { l: 'The financial bridge', b: "Wellbeing is a leading indicator of voluntary departure. A CNO who can show improving wellbeing scores at Month 3 has a credible 12-month retention forecast — and a CFO who can see the trend can plan for reduced recruitment spend before the turnover data matures." },
          ],
        },
      },
      {
        key: 'turnover', label: 'Voluntary Turnover ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: "Annual voluntary departures per unit, tracked against system average and pre-deployment baseline. The primary financial metric for workforce stability in the nursing cost model." },
            { l: 'Data source', b: "HR data. Voluntary departure rate by unit. Compare Abridge units to non-Abridge units, controlling for tenure distribution and unit type. Exit interview data specifically — is documentation burden still cited as a departure reason?" },
            { l: 'Why it\'s a long-cycle metric', b: "Turnover data requires 12–18 months before it's statistically meaningful. The strategy is to prove wellbeing early (Month 2–4), build the CFO bridge at Month 6, and let turnover data confirm the story as it matures." },
          ],
        },
      },
      {
        key: 'travelnurse', label: 'Travel Nurse Spend ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: "The cost and volume of travel and agency nurses used to fill open shifts created by vacancies — the direct financial consequence of voluntary turnover." },
            { l: 'Data source', b: "Finance and staffing data. Agency hours and cost per open shift, month over month. Travel nurse spend responds within months of a departure and is highly visible in the nursing budget." },
            { l: 'Why it\'s often the faster number', b: "Agency spend is a real-time financial signal that's easier to attribute than long-term turnover trends. It often moves before annual turnover statistics are meaningful — and it's the number CNOs and CFOs talk about when discussing workforce cost." },
          ],
        },
      },
    ],
    timeline: {
      signal: {
        window: 'Week 4–8',
        desc: 'Burden shifts, early signal',
        metrics: [
          { name: 'Per-Patient Documentation Time', source: 'EHR session logs · documentation time per patient per shift · Abridge units vs. baseline · panel multiplier visible in aggregate', badge: 'Week 4–8', why: "The panel multiplier signal — how much documentation time per patient is Abridge recapturing? Multiply by census and you have the total shift-level capacity freed across the unit." },
          { name: 'Post-Shift Documentation Queue Size', source: 'EHR audit logs · number of open tasks and unsigned entries at scheduled shift end · pre/post comparison', badge: 'Week 4–8', why: "An unsigned documentation queue at shift end is a direct predictor of overtime and end-of-shift stress. Declining queue size means the shift is genuinely closing out — not just deferred to early next shift." },
        ],
        callout: "Why start here: Burden reduction is what nurses experience first, and that experience is what drives peer-to-peer adoption. The EHR log data confirms what nurses are feeling — and provides the baseline for the wellbeing survey comparison at Month 2.",
      },
      trend: {
        window: 'Month 2–4',
        desc: 'Wellbeing signal emerges',
        metrics: [
          { name: 'Agency / Travel Nurse Fill Rate', source: 'Staffing data · % of shifts filled by agency vs. core staff · monthly by unit · early signal of vacancy pressure', badge: 'Month 2–4', why: "Agency fill rate rising is a leading indicator of vacancy pressure — nurses leaving or on leave. Declining fill rate suggests stability is improving before annual turnover data confirms it." },
          { name: 'Documentation Burden Score (Survey)', source: 'Validated burnout instrument or NDNQI survey · documentation-specific subscale · Abridge units vs. control · quarterly cadence', badge: 'Month 2–4', why: "The attitudinal measure — do nurses feel the documentation burden is manageable? Survey-based but validated. Tracks the psychological relief that follows the operational improvement." },
          { name: 'Intent to Stay', source: 'Institutional engagement survey or validated single-item intent measure · Abridge adopters vs. non-adopters at same unit · trended quarterly', badge: 'Month 3–5', why: "Nursing intent-to-stay is a leading indicator that moves before actual departure decisions. Watch for divergence between Abridge units and non-Abridge units — that gap is the signal." },
        ],
        callout: "The CNO bridge: Wellbeing scores at Month 2–4 are the evidence that connects reduced documentation burden to the retention forecast. Present the trend as a leading indicator — not a claim — and let the 12-month data confirm it.",
      },
      proof: {
        window: 'Month 12–18',
        desc: 'Retention and cost confirmed',
        metrics: [
          { name: 'Agency and Travel Nurse Spend', source: 'Finance · annual agency cost on pilot units vs. 12-month pre-deployment baseline · adjusted for census', badge: 'Month 12–18', why: "Agency spend drops as fewer nurses leave or request leave. CNO and CFO both care about this number directly — it's the financial proxy for workforce stability." },
          { name: 'Voluntary Nurse Turnover Rate', source: 'HR data · annual voluntary departures per unit · Abridge units vs. comparable non-Abridge units · requires 12+ months of data', badge: 'Month 12–18', why: "The lagging outcome — takes 12–18 months because nurse turnover is measured annually and departure decisions have long lead times. Confirms the workforce story when it arrives." },
        ],
        callout: "The long game: Turnover is a lagging indicator. The strategy is to show burden reduction early, wellbeing improvement at mid-term, and agency spend reduction as the near-term financial signal — then let turnover data confirm the story as the program matures.",
      },
    },
  },

  // ── REVENUE ───────────────────────────────────────────────────────────────
  {
    domain: 'REVENUE',
    number: 'Domain 3 of 4',
    badge: 'Clinical Record Integrity',
    northStar: 'Compliance Deficiency Rate',
    direction: '↓',
    northStarSub: "Nurses don't generate billing codes — but nursing documentation is audited. CMS, state surveyors, and commercial payers review nursing records during audits. Incomplete flowsheets and missing assessments are deficiency findings. Complete records are the defense.",
    matterBoxes: [
      {
        tag: 'CFO / Revenue Cycle',
        body: "Concurrent review by payers finding documentation gaps that support denial activity, or compliance team flagging nursing records as a denial risk. Incomplete nursing documentation creates revenue exposure that payer audits will find.",
      },
      {
        tag: 'CMO / CNO',
        body: "CMS survey or Joint Commission citations for nursing record deficiencies. Complete nursing records are the evidentiary foundation for both clinical quality reviews and payer compliance — the same documentation problem drives both risks.",
      },
    ],
    matterLayout: '2col',
    chain: [
      { key: 'source', label: 'Abridge Nursing', sub: 'ambient flowsheet AI', isSource: true },
      {
        key: 'completeness', label: 'Flowsheet Completeness ↑', sub: 'assessments captured at point of care',
        detail: {
          cols: [
            { l: 'What it measures', b: "The percentage of required flowsheet fields — vital signs, fall risk scores, skin assessments, intake/output, pain scores — completed within the required documentation window. EHR compliance tracking reports this already in most systems." },
            { l: 'Why point-of-care timing matters', b: "A Braden scale completed 6 hours after the assessment it was supposed to reflect is a documentation deficiency — even if the assessment itself was done correctly. Ambient flowsheet capture closes the gap between the care event and the chart entry." },
            { l: 'How to track it', b: "EHR compliance dashboards typically report assessment completion rates and on-time completion rates by unit. Compare Abridge units to control units at the same interval. This is often visible in the first 30 days of deployment." },
          ],
          grad: "When flowsheet completion rates reach a consistent high and on-time completion rates stabilize, the documentation foundation has changed. Start watching for deficiency findings in the next audit cycle as the lagging confirmation.",
        },
      },
      {
        key: 'accuracy', label: 'Clinical Record Accuracy ↑', sub: 'observations documented as they happen',
        detail: {
          cols: [
            { l: 'What it means', b: "The degree to which nursing documentation reflects the actual clinical picture at the time of care — not a recalled summary entered hours later. Accuracy and timeliness are related: documentation entered at the point of care is more accurate than documentation reconstructed from memory at shift end." },
            { l: 'Why auditors care', b: "CMS and payer auditors look for internal consistency between nursing records and physician documentation. Discrepancies — a nursing note reporting a patient as ambulatory while the physician notes bed rest, or a skin assessment that doesn't match wound care documentation — are findings." },
            { l: 'How to assess it', b: "Internal compliance team chart review. Sample 10–15 charts per unit per month and score for documentation accuracy, specificity, and internal consistency. Compare Abridge units to control. Many compliance departments have existing audit tools for this." },
          ],
        },
      },
      {
        key: 'auditvuln', label: 'Audit Vulnerability ↓', sub: 'documentation gaps are the target',
        detail: {
          cols: [
            { l: 'What it means', b: "The exposure to adverse findings from CMS surveys, Joint Commission reviews, or payer concurrent review created by incomplete or untimely nursing documentation. Audit vulnerability is reduced when records are complete, accurate, and internally consistent." },
            { l: 'Why documentation gaps are the specific risk', b: "Payer and regulatory auditors can't review care that wasn't documented. A fall risk assessment that wasn't charted is, for audit purposes, a fall risk assessment that wasn't done. Complete records defend against denials and findings by demonstrating that care was assessed and interventions were taken." },
            { l: 'How to track it', b: "Compliance team audit findings specifically related to nursing documentation. Compare finding rates before and after Abridge deployment on pilot units. Joint Commission and CMS survey readiness assessments can also quantify the gap." },
          ],
        },
      },
      {
        key: 'compliance', label: 'Compliance Deficiency Rate ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: "The rate of deficiency findings attributable to nursing documentation gaps in regulatory surveys, accreditation reviews, and internal compliance audits. Tracked by the compliance department as a program metric." },
            { l: 'Data source', b: "Compliance team audit data. CMS survey findings, Joint Commission corrective action items, internal audit results — all filtered for nursing documentation-related deficiencies specifically." },
            { l: 'The financial connection', b: "Deficiency findings can trigger corrective action plans, payment penalties, or conditions of participation reviews. Beyond the direct cost, a pattern of documentation deficiencies in nursing records creates audit risk for inpatient claims that depend on complete supporting documentation." },
          ],
        },
      },
      {
        key: 'revenueatrisk', label: 'Revenue-at-Risk ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: "The portion of inpatient revenue at risk because nursing documentation gaps weaken the clinical record that supports medical necessity, level-of-care, or quality metric compliance." },
            { l: 'The concurrent review connection', b: "Commercial payers conduct concurrent review of inpatient stays by reading nursing notes alongside physician documentation. When nursing records are incomplete or delayed, payers find documentation gaps to support downgrade or denial activity." },
            { l: 'How to quantify it', b: "Revenue cycle team: isolate denials where nursing documentation was cited in the denial rationale. Track the trend on Abridge units vs. control. This is a smaller and more attributable subset than total denial volume." },
          ],
        },
      },
    ],
    timeline: {
      signal: {
        window: 'Week 4–8',
        desc: 'Completeness rates respond',
        metrics: [
          { name: 'Flowsheet Completion Rate', source: 'EHR compliance dashboard · % of required assessments completed within required window · Abridge units vs. baseline · most EHRs report this natively', badge: 'Week 4–6', why: "Incomplete flowsheets are the most common nursing documentation deficiency in compliance audits. Rising completion rate is the first signal that documentation discipline is improving with Abridge support." },
          { name: 'On-Time Assessment Completion Rate', source: 'EHR data · % of scheduled assessments (Braden, fall risk, pain) completed within required timeframe · per unit · daily tracking', badge: 'Week 4–8', why: "Time-critical assessments (fall risk, Braden, pain) must be completed within required windows. Abridge reduces cognitive competition for documentation time, making on-time completion more consistent." },
        ],
        callout: "Why start here: Flowsheet completion rates are visible in existing EHR dashboards within the first month. It's the fastest signal available and requires no new data infrastructure. Compliance teams often already track it.",
      },
      trend: {
        window: 'Month 2–5',
        desc: 'Internal audit findings improve',
        metrics: [
          { name: 'Documentation Deficiency Finding Rate', source: 'Internal audit results · deficiency findings per 100 charts reviewed · Abridge units vs. pre-deployment baseline', badge: 'Month 3–5', why: "Deficiency findings per chart reviewed is the normalized compliance signal. A declining rate means the average quality of nursing documentation is rising — not just a few star performers improving." },
          { name: 'Internal Compliance Audit Score (Nursing Documentation)', source: 'Compliance team · chart review scoring on Abridge pilot units vs. control · monthly sample of 10–15 charts per unit', badge: 'Month 2–4', why: "Monthly chart reviews give the fastest feedback on whether documentation is meeting organizational standards — the quality team's leading indicator before regulatory surveys arrive." },
        ],
        callout: "The compliance team bridge: Internal audit data at Month 2–4 provides the attributable evidence that connects flowsheet completeness to documentation quality. It's the metric compliance officers can take to a corrective action plan conversation.",
      },
      proof: {
        window: 'Month 9–18',
        desc: 'Audit and denial trends confirm',
        metrics: [
          { name: 'Documentation-Related Denial Rate', source: 'Revenue cycle · denials citing nursing documentation gaps · isolated from total denial volume · Abridge unit cohort vs. baseline', badge: 'Month 9–18', why: "Nursing documentation gaps cause payer denials for medical necessity and level-of-care. Declining denial rate is the revenue cycle proof that nursing documentation quality improvements are financially material." },
          { name: 'Regulatory Survey Deficiency Rate (Nursing Documentation)', source: 'Compliance team · CMS or TJC nursing documentation deficiency findings · trended year-over-year', badge: 'Month 12–18', why: "The annual regulatory proof point — what CMS or TJC found in nursing documentation. A year-over-year decline is the strategic narrative that compliance leadership can present to the board." },
        ],
        callout: "The attribution challenge: Regulatory survey findings are infrequent and multi-factorial. The stronger ongoing signal is the documentation-related denial subset in concurrent review — it's continuous, attributable, and tracked by revenue cycle already.",
      },
    },
  },

  // ── QUALITY ───────────────────────────────────────────────────────────────
  {
    domain: 'QUALITY',
    number: 'Domain 4 of 4',
    badge: 'Patient Safety & Bundle Compliance',
    northStar: 'Nursing-Sensitive Harm Events',
    direction: '↓',
    northStarSub: "Falls, HAPIs, CAUTIs, CLABSIs — these are nursing-sensitive outcomes because nursing documentation is the clinical record for the assessments and interventions that prevent them. Real-time documentation closes the gap between a care event and when it's visible in the chart.",
    matterBoxes: [
      {
        tag: 'CNO / VP Patient Safety',
        body: "Nursing-sensitive harm event rates tracked as a safety program goal, specific targets for fall rates, HAPI incidence, or bundle compliance that nursing documentation directly enables.",
      },
      {
        tag: 'CFO / COO',
        body: "CMS HAC Reduction Program imposes payment reductions for hospitals in the worst-performing quartile. Nursing documentation quality influences harm event attributions that feed HAC scores and the publicly visible CMS star rating.",
      },
    ],
    matterLayout: '2col',
    chain: [
      { key: 'source', label: 'Abridge Nursing', sub: 'ambient flowsheet AI', isSource: true },
      {
        key: 'assessment', label: 'Real-Time Assessment Documentation ↑', sub: 'fall risk, skin, vital trends at bedside',
        detail: {
          cols: [
            { l: 'What it measures', b: "The timeliness of nursing assessment documentation — fall risk scores, Braden scale skin assessments, vital sign trends — captured at the point of care rather than reconstructed hours later at shift end." },
            { l: 'Why real-time matters for safety', b: "A fall risk reassessment entered 4 hours after it was conducted is a 4-hour window where a change in fall risk isn't visible to the care team. The oncoming nurse, the charge nurse, and the attending physician all work from a stale record during that window." },
            { l: 'What Abridge Nursing changes', b: "Ambient flowsheet documentation captures assessments as the nurse completes them at the bedside. The chart reflects the current patient state continuously rather than episodically — closing the documentation lag that creates safety gaps." },
          ],
          grad: "When assessment completion rates reach a consistent high and on-time rates stabilize, the documentation foundation for harm prevention has been established. Watch protocol and bundle compliance rates as the next signal.",
        },
      },
      {
        key: 'bundle', label: 'Protocol & Bundle Completion ↑', sub: 'every step documented as done',
        detail: {
          cols: [
            { l: 'What it measures', b: "The percentage of care bundle components — CAUTI prevention bundle, CLABSI central line bundle, sepsis bundle SEP-1, pressure injury prevention protocol — documented as completed by nursing." },
            { l: 'Why documentation is required evidence', b: "Bundle compliance is measured from documentation. A bundle step completed but not documented is, for compliance purposes, a bundle step not completed. Ambient flowsheet capture makes documentation the natural conclusion of a care task rather than a separate task performed later." },
            { l: 'How to track it', b: "EHR-based bundle compliance tracking. Most quality teams pull this report already. Compare completion rates on Abridge units to baseline and control units at the same interval. SEP-1 is a CMS-reported quality measure — track it specifically." },
          ],
        },
      },
      {
        key: 'prevention', label: 'Prevention Measures Verified ↑', sub: 'bundles followed, not just ordered',
        detail: {
          cols: [
            { l: 'What it represents', b: "The degree to which prevention protocols are executed and documented throughout the patient stay — not just initiated at admission. Turn schedules for pressure injury prevention, catheter care documentation, hand hygiene compliance, central line dressing change records." },
            { l: 'Why ongoing documentation matters', b: "A pressure injury prevention order doesn't prevent a pressure injury — nursing execution of the turn schedule does. Documentation that interventions were performed at the required intervals is both the evidence of compliance and the accountability mechanism that drives consistent execution." },
            { l: 'How to observe it', b: "Protocol adherence rates by unit, tracked by nursing quality teams. Chart audits for documentation of specific prevention interventions. Compare Abridge pilot units to control units on the same floor or during the same patient population period." },
          ],
        },
      },
      {
        key: 'harmevents', label: 'Harm Event Rate ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: "Nursing-sensitive adverse events per 1,000 patient days — falls, hospital-acquired pressure injuries (HAPIs), catheter-associated UTIs (CAUTIs), and central line-associated bloodstream infections (CLABSIs)." },
            { l: 'Data source', b: "Quality reporting system. Most hospitals track nursing-sensitive harm events monthly by unit. NDNQI benchmarking provides peer comparison. CMS HAC data is reported annually and publicly available for strategic context." },
            { l: 'Why it\'s a lagging indicator', b: "Harm events are low-frequency outcomes that require substantial volume and time to show statistically meaningful trends. A single unit with 20 beds may see only 3–5 fall events per month — not enough to detect a small change in rate quickly. Plan for 6–18 months of data." },
          ],
        },
      },
      {
        key: 'bundlecompliance', label: 'Bundle Compliance Rate ↑', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: "The percentage of applicable patient encounters where care bundles (SEP-1, CAUTI prevention, CLABSI prevention) were completed and documented. A composite of protocol adherence across the patient stay." },
            { l: 'Data source', b: "EHR-based bundle compliance tracking, reported by quality and infection control teams. SEP-1 is a CMS-reported measure — it appears in public reporting and affects Value-Based Purchasing scoring." },
            { l: 'Why it\'s the leading indicator', b: "Bundle compliance moves before harm event rates do — it's a process measure that leads the outcome measure. When bundle compliance reaches a stable high on Abridge units, harm event rate improvement should follow as a lagging confirmation. Build the story in that sequence." },
          ],
        },
      },
    ],
    timeline: {
      signal: {
        window: 'Week 4–Month 2',
        desc: 'Assessment timeliness responds',
        metrics: [
          { name: 'Fall Risk Assessment Completion Rate', source: 'EHR quality dashboard · % of required fall risk reassessments completed on time · Abridge units vs. control · daily tracking', badge: 'Week 4–8', why: "Falls are the most common nursing-sensitive harm event. On-time fall risk reassessment is the upstream gate — if it's not happening consistently, prevention protocols can't be triggered reliably." },
          { name: 'Skin & Pressure Injury Assessment Completion Rate', source: 'EHR quality dashboard · Braden scale completion within required window · per unit · pre/post comparison', badge: 'Week 4–8', why: "Braden scale completion within required windows is the documentation gate for pressure injury prevention. Abridge reduces the documentation competition that causes nurses to defer these assessments." },
        ],
        callout: "Why start here: Assessment completion rates are the most direct and fastest-moving signal for nursing quality. They're tracked by quality teams already, require no new data infrastructure, and show improvement before bundle compliance or harm event data is available.",
      },
      trend: {
        window: 'Month 2–6',
        desc: 'Bundle compliance and protocol adherence move',
        metrics: [
          { name: 'Care Bundle Compliance Rate (SEP-1, CAUTI, CLABSI)', source: 'EHR bundle tracking / quality team · % bundle completion per applicable encounter · Abridge units vs. control · monthly', badge: 'Month 2–5', why: "Bundles require documentation of each element to get credit for compliance. Complete ambient nursing notes capture bundle elements as care is delivered — not reconstructed later from memory." },
          { name: 'Protocol Adherence Rate (Turn Schedule, Line Care)', source: 'Nursing quality audit · documentation of prevention protocol completion · chart review sample · Abridge vs. baseline', badge: 'Month 2–6', why: "Prevention protocols require documentation to verify they happened. Abridge-supported documentation makes protocol adherence visible in a way that manual charting under time pressure often misses." },
        ],
        callout: "The graduation signal: When bundle compliance reaches a stable high on Abridge units, that's the trigger to start monitoring harm event rates as the lagging confirmation. Don't expect harm events to move until bundle compliance is consistent.",
      },
      proof: {
        window: 'Month 6–18',
        desc: 'Harm event rates confirm',
        metrics: [
          { name: 'CMS HAC Reduction Score', source: 'CMS public reporting · Hospital-Acquired Condition Reduction Program score · annual · directional signal for strategic narrative', badge: 'Month 12–18', why: "The annual strategic quality narrative for boards and quality committees. Documentation is one of many contributors, but accurate, timely nursing documentation is the foundation every bundle compliance measure builds on." },
          { name: 'Nursing-Sensitive Harm Event Rate', source: 'Quality reporting system / NDNQI · falls, HAPIs, CAUTIs, CLABSIs per 1,000 patient days · Abridge units vs. peer benchmark · requires sufficient volume', badge: 'Month 6–18', why: "The North Star outcome — falls, HAPIs, CAUTIs, CLABSIs per 1,000 patient days. Takes 6–18 months because harm events require sufficient volume and time to show a statistically meaningful trend." },
        ],
        callout: "The volume caveat: Harm events are low-frequency outcomes. A single unit may not have sufficient event volume to show a statistically significant rate change quickly. Use the multi-unit aggregate, or supplement with bundle compliance rates as the primary near-term evidence.",
      },
    },
  },
];

// ─── Value Architecture Data ──────────────────────────────────────────────────

const nursingFramework: FrameworkItem[] = [
  {
    domain: 'CAPACITY',
    tag: 'modeled',
    narrative: "Nursing is the only care setting where documentation efficiency directly maps to payroll dollars: nurses are hourly employees, and documentation extending beyond shift end generates overtime costs. The formula is direct — if documentation time per patient decreases, nurses may complete shift obligations within scheduled hours, reducing overtime events. The model applies a realization rate to account for the fact that not all saved time avoids overtime; some is absorbed by other end-of-shift tasks. This makes the calculation conservative and defensible.",
    chain: ['Documentation Time/Patient ↓', 'Shift Completion Rate ↑', 'Overtime Events ↓'],
    chainOutput: 'Payroll OT Cost ↓',
    steps: [
      {
        vars: [
          { v: 'Minutes saved per patient', kind: 'input' },
          { v: 'Patients per nurse per shift', kind: 'input' },
          { v: 'OT realization rate', kind: 'benchmark', hint: '~40%' },
        ],
        result: 'OT-avoidable min/nurse/shift',
      },
      {
        vars: [
          { v: 'OT-avoidable min/shift', kind: 'derived' },
          { v: '60 min/hr', kind: 'default', hint: '60', op: '÷' },
        ],
        result: 'OT-avoidable hrs/nurse/shift',
      },
      {
        vars: [
          { v: 'OT-avoidable hrs/shift', kind: 'derived' },
          { v: 'Nursing FTEs', kind: 'input' },
          { v: 'Annual shifts/nurse', kind: 'default', hint: '~182' },
          { v: 'OT hourly rate', kind: 'input' },
        ],
        result: 'Estimated OT cost reduction',
        isFinal: true,
      },
    ],
  },
  {
    domain: 'WORKFORCE',
    tag: 'modeled',
    narrative: "Documentation burden is consistently cited in nursing surveys as a top driver of intent to leave. Industry sources (NSI Nursing Solutions, AONL) estimate RN replacement costs at $50K–$100K per departure, including agency coverage, recruitment, onboarding, and orientation. The model explicitly attributes only a fraction of voluntary departures to documentation burden rather than claiming all turnover stems from it — the same conservative approach applied in every workforce domain.",
    chain: ['Shift-End Documentation ↓', 'After-Hours EHR Activity ↓', 'Nurse Wellbeing ↑', 'Intent to Stay ↑'],
    chainOutput: 'Voluntary Turnover ↓',
    steps: [
      {
        vars: [
          { v: 'Annual voluntary RN departures', kind: 'input' },
          { v: 'Documentation-attributable fraction', kind: 'benchmark', hint: '~20–25%' },
          { v: 'Expected improvement with ambient', kind: 'benchmark', hint: '~25–35%' },
        ],
        result: 'Est. departures avoided/yr',
      },
      {
        vars: [
          { v: 'Est. departures avoided', kind: 'derived' },
          { v: 'RN replacement cost', kind: 'benchmark', hint: '$50K–$100K' },
        ],
        result: 'Estimated retention savings',
        isFinal: true,
      },
    ],
    note: 'Modeled when intent-to-stay or burnout survey data is available. Treated as a leading indicator otherwise.',
  },
  {
    domain: 'REVENUE',
    tag: 'modeled',
    narrative: "Payer medical necessity and level-of-care determinations depend on nursing documentation — admission assessments, flowsheet completion, and care intervention records. Documentation deficiencies give payers grounds to reduce or deny level-of-care authorization. More complete nursing documentation may reduce documentation-related denials by ensuring the clinical record supports the requested level of care. The model estimates the financial impact by applying your denial rate reduction to nursing encounter volume, restricted to the fraction of denials attributable to documentation deficiencies.",
    chain: ['Nursing Assessment Completeness ↑', 'Flowsheet Deficiency Rate ↓', 'Claim Integrity ↑'],
    chainOutput: 'Documentation-Related Denials ↓',
    steps: [
      {
        vars: [
          { v: 'Annual nursing encounters', kind: 'input' },
          { v: 'Baseline denial rate (%)', kind: 'input' },
        ],
        result: 'Annual denied claims',
      },
      {
        vars: [
          { v: 'Annual denied claims', kind: 'derived' },
          { v: 'Documentation-related denial fraction', kind: 'benchmark', hint: '~20%' },
          { v: 'Expected improvement with ambient', kind: 'benchmark', hint: '~20–30%' },
        ],
        result: 'Recovered claims/year',
      },
      {
        vars: [
          { v: 'Recovered claims/year', kind: 'derived' },
          { v: 'Avg denial value', kind: 'benchmark', hint: '~$350–600' },
        ],
        result: 'Estimated denial prevention savings',
        isFinal: true,
      },
    ],
  },
  {
    domain: 'QUALITY',
    tag: 'modeled',
    narrative: "Nursing-sensitive harm events — pressure injuries (HAPIs), falls, CAUTIs, CLABSIs, and sepsis — are documentation-sensitive: real-time assessment and bundle documentation is what lets prevention protocols be triggered and verified. The model quantifies this in dollars, conservatively. For each condition it starts from the unit's event rate per 1,000 patient-days, credits only the fraction of events that better documentation can realistically prevent — not all of them, because the causal link is indirect — and multiplies by the cost per event. Because only that documentation-attributable prevention fraction is credited, the figure is deliberately conservative. Harm-rate confirmation in the field still takes 12–18 months; the expected dollar impact is modeled up front.",
    chain: ['Assessment Timeliness ↑', 'Bundle Documentation Rate ↑', 'Prevention Protocols Verified ↑', 'Harm Events ↓'],
    chainOutput: 'Avoided Harm-Event Cost ↓',
    steps: [
      {
        vars: [
          { v: 'Annual patient-days', kind: 'input' },
          { v: 'Event rate / 1,000 patient-days', kind: 'benchmark', hint: '~1–4' },
        ],
        result: 'Baseline harm events/year',
      },
      {
        vars: [
          { v: 'Baseline harm events', kind: 'derived' },
          { v: 'Documentation-preventable fraction', kind: 'benchmark', hint: '~5–30%' },
        ],
        result: 'Events avoided/year',
      },
      {
        vars: [
          { v: 'Events avoided/year', kind: 'derived' },
          { v: 'Cost per event', kind: 'benchmark', hint: '$3.5K–$25K' },
        ],
        result: 'Estimated harm-prevention savings',
        isFinal: true,
      },
    ],
    note: "Modeled per condition (HAPI, falls, CAUTI, CLABSI, sepsis) from your event rates per 1,000 patient-days. Conservative by design — only the documentation-attributable prevention fraction is credited, since the causal link is indirect. Harm-rate trends still take 12–18 months to confirm in the field.",
  },
];

// ─── Personas & Discovery Questions ──────────────────────────────────────────

const nursingFrameworkPersonas: Record<DomainName, string[]> = {
  CAPACITY:  ['CNO', 'COO'],
  WORKFORCE: ['CNO', 'CHRO'],
  REVENUE:   ['CFO', 'CNO'],
  QUALITY:   ['CNO', 'VP Patient Safety'],
};

const nursingFrameworkQuestions: Record<DomainName, string[]> = {
  CAPACITY: [
    'Are your nurses regularly working past the end of their shifts to complete documentation — and do you know by how much on average?',
    'How much of your nursing overtime cost is driven by documentation completion versus clinical care demand?',
    'If nurses could finish documentation during the shift, what would the downstream effect be on overtime spend and nurse satisfaction?',
  ],
  WORKFORCE: [
    'What does documentation burden look like in your exit interview data — is it a cited driver of intent to leave?',
    'What\'s your annual RN turnover rate, and do you have a sense of what fraction is burnout-related versus compensation or career growth?',
    'What\'s your cost to replace an RN — including agency coverage, recruiting, onboarding, and orientation?',
  ],
  REVENUE: [
    'What\'s your current medical necessity denial rate, and do you know how much of it traces back to nursing documentation deficiencies?',
    'Are your denial reviewers flagging flowsheet completion gaps or assessment deficiencies as root causes?',
    'Is your revenue cycle team able to isolate nursing documentation as a contributing driver in denial patterns?',
  ],
  QUALITY: [
    'How are your nursing-sensitive quality measures trending — fall rates, CAUTI, CLABSI, HAPI — and is documentation completeness a known gap?',
    'Can your team distinguish between harm events that occurred versus events that occurred but weren\'t properly documented for quality tracking?',
    'How much of your quality team\'s bandwidth is spent on bundle compliance documentation reviews versus actual improvement work?',
  ],
};

// ─── Value Architecture Component ────────────────────────────────────────────

function NursingValueArchitectureSection() {
  const domainOrder: DomainName[] = ['WORKFORCE', 'CAPACITY', 'REVENUE', 'QUALITY'];
  const sortedFramework = [...nursingFramework].sort((a, b) => domainOrder.indexOf(a.domain) - domainOrder.indexOf(b.domain));
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
          const personas = nursingFrameworkPersonas[item.domain] ?? [];
          const questions = nursingFrameworkQuestions[item.domain] ?? [];
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

// ─── Nursing Domain Card ──────────────────────────────────────────────────────

function NursingDomainCard({ data }: { data: NursingDomainCardData }) {
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
            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#999999] mb-1.5">{data.number} · Nursing</p>
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
          <p className="text-[10px] font-bold tracking-[0.11em] uppercase text-[#888888]">How Abridge Nursing enables progress toward this outcome</p>
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
        Results vary based on EHR configuration, unit adoption, care setting, and organizational factors. Timelines represent ranges and should be validated against your organization's baseline data. Harm events are low-frequency outcomes requiring sufficient volume for statistically meaningful trends.
      </div>
    </div>
  );
}

// ─── Nursing Adoption Section ─────────────────────────────────────────────────

function NursingAdoptionSection() {
  const metrics = [
    {
      tag: "Breadth",
      label: "% of nurses using ambient flowsheet",
      why: "Is Abridge in the workflow for most nurses on pilot units, or only a few early adopters? Coverage below 60–70% makes unit-level attribution unreliable — the overtime and compliance story only holds at scale.",
      source: "Platform analytics / Abridge dashboard",
    },
    {
      tag: "Depth",
      label: "% of patient assessments using ambient",
      why: "Are nurses using it for every patient, or selectively? The panel-level overtime story depends on consistent use across all 5–6 patients per shift — selective use creates gaps that break the aggregate math.",
      source: "Platform analytics vs. EHR assessment count",
    },
    {
      tag: "Quality",
      label: "Avg ambient session duration",
      why: "Short sessions indicate abandonment before full assessment capture. A complete nursing documentation event runs 8–15 minutes per patient. Duration confirms the tool is capturing actual bedside care, not just being opened.",
      source: "Platform analytics",
    },
    {
      tag: "Output",
      label: "% of flowsheet completed by ambient vs. manual",
      why: "Confirms the flowsheet entry is ambient-captured — not opened and then manually typed. The higher this percentage, the stronger every downstream claim about overtime reduction and documentation quality.",
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
          Every number in this framework is downstream of this section. If adoption is real — consistent, complete, across most nurses on pilot units — the downstream story holds. If adoption is thin, every metric becomes a correlation instead of a cause. These four gates determine attribution. Verify them first, every time.
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

// ─── Nursing Domain Methodology Section ──────────────────────────────────────

function NursingDomainMethodologySection() {
  const domainOrder: DomainName[] = ['WORKFORCE', 'CAPACITY', 'REVENUE', 'QUALITY'];
  const sortedCards = [...nursingDomainCards].sort((a, b) => domainOrder.indexOf(a.domain) - domainOrder.indexOf(b.domain));
  const [activeDomain, setActiveDomain] = useState(sortedCards[0].domain);
  const activeCard = sortedCards.find(c => c.domain === activeDomain)!;

  return (
    <div className="mb-10">
      <div className="mb-6 pb-3 border-b-2 border-[#EA2C00]">
        <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#888888] mb-2">The Nursing Value Story</p>
        <h2 className="text-[24px] font-bold text-black tracking-tight">Four Domains of Value</h2>
        <p className="text-sm text-[#888888] mt-1">
          Each domain has a distinct North Star outcome, a causal chain showing how Abridge Nursing enables it, and a measurement path with honest timelines.
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
        <NursingDomainCard data={activeCard} />
      </motion.div>
    </div>
  );
}

// ─── Value Arc Section ────────────────────────────────────────────────────────

function NursingValueArcSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const stages: { number: string; badge: BadgeType; timing: string; title: string; description: string; activeDomains: DomainName[] }[] = [
    {
      number: "01",
      badge: "Signal",
      timing: "Week 4–8",
      title: "The Nurse Feels It",
      description: "Post-shift charting drops measurably. More documentation completed during the shift. On-time clock-out improves. EHR session data and payroll both show the change within the first 90 days.",
      activeDomains: ["CAPACITY", "WORKFORCE"],
    },
    {
      number: "02",
      badge: "Trend",
      timing: "Month 2–5",
      title: "Shift & Compliance Metrics Move",
      description: "Safety assessment completion rates rise. Bundle compliance improves on pilot units. Documentation burden scores drop on pulse surveys. OT data shows the payroll impact.",
      activeDomains: ["QUALITY", "WORKFORCE"],
    },
    {
      number: "03",
      badge: "Proof",
      timing: "Month 6–18",
      title: "Safety & Retention Confirmed",
      description: "Voluntary turnover trending down on Abridge units vs. control. Agency fill rate declining. Harm event rates moving in the direction of bundle compliance gains from earlier periods.",
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

export function MethodologyNursing({ onBack, onHome, onNavigateToSetting, onBuildModel }: MethodologyNursingProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await generateMethodologyPDF("nursing");
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
          <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#EA2C00] mb-4">Nursing</p>
          <h1 className="text-[32px] md:text-[40px] font-bold text-black leading-tight tracking-tight mb-4">
            How We Think<br />About Value
          </h1>
          <p className="text-[15px] text-[#666666] max-w-[560px] mx-auto leading-relaxed">
            Inpatient nursing — where flowsheet documentation time compounds across a panel of 5–6 patients per shift, and the only care setting where documentation savings convert directly to a payroll dollar.
          </p>
        </motion.div>

        <NursingValueArcSection />

        <NursingDomainMethodologySection />

        <NursingValueArchitectureSection />

        <motion.div className="mt-4 mb-10 bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] rounded-lg p-8 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="text-xl font-bold text-white mb-2">Ready to Build Your Model?</h3>
          <p className="text-[#999999] mb-6 text-sm">Use these methodology principles to create a customized ROI model for your nursing program.</p>
          <button onClick={onBuildModel ?? onBack} className="inline-flex items-center gap-2 bg-[#EA2C00] hover:bg-[#D12600] text-white font-medium px-6 py-3 rounded-lg transition-colors" data-testid="button-build-model">
            Build a Nursing Model <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        <p className="text-xs text-[#888888] leading-relaxed mb-6">Projections are modeled estimates based on user-provided inputs, published industry benchmarks, and aggregated deployment experience. Actual results may vary based on implementation approach, provider adoption, organizational factors, and care setting. This methodology does not constitute a guarantee of financial outcomes.</p>

        <div className="mb-8">
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Related Methodologies</p>
          <div className="grid md:grid-cols-3 gap-4">
            <button onClick={() => onNavigateToSetting?.("inpatient")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-inpatient">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Building2 className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Inpatient</p><p className="text-xs text-[#888888]">DRG accuracy & documentation quality</p></div>
            </button>
            <button onClick={() => onNavigateToSetting?.("ed")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-ed">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Activity className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Emergency</p><p className="text-xs text-[#888888]">Throughput & LWBS rate</p></div>
            </button>
            <button onClick={() => onNavigateToSetting?.("outpatient")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-outpatient">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Stethoscope className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Outpatient</p><p className="text-xs text-[#888888]">wRVU & patient access</p></div>
            </button>
          </div>
        </div>
      </div>

      {isExporting && (
        <div className="fixed bottom-4 right-4 bg-[#EA2C00] text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50" data-testid="toast-pdf-download">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Preparing your PDF...</span>
        </div>
      )}
    </div>
  );
}
