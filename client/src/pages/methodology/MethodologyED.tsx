/**
 * REPLIT IMPLEMENTATION FILE
 * Replace: client/src/pages/methodology/MethodologyED.tsx
 *
 * Keeps all existing page structure (header, hero text, adoption section,
 * value arc, full framework, CTA, related links). Replaces only the
 * EDDomainMethodologySection domain cards with the new interactive design:
 * North Star → Causal Chain (clickable) → Signal/Trend/Proof timeline.
 */

import { motion, useInView } from "framer-motion";
import { useState, useRef } from "react";
import { ArrowLeft, Download, ArrowRight, Stethoscope, Building2, Heart, Loader2 } from "lucide-react";
import { generateMethodologyPDF } from "@/lib/methodology-pdf-export";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';
import {
  NarrativeText,
  type BadgeType,
  type DomainName,
} from "@/components/methodology/MethodologyShared";

interface MethodologyEDProps {
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

type EDDomainCardData = {
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

const edDomainCards: EDDomainCardData[] = [
  // ── CAPACITY ──────────────────────────────────────────────────────────────
  {
    domain: 'CAPACITY',
    number: 'Domain 1 of 4',
    badge: 'Throughput & Patient Flow',
    northStar: 'LWBS Rate',
    direction: '↓',
    northStarSub: 'Left without being seen — driven by throughput improvement and additional volume filling the recaptured capacity.',
    matterBoxes: [
      {
        tag: 'Matters most if…',
        body: "Your LWBS rate is above benchmark, you're competing on patient access, or your CFO is asking why throughput hasn't improved despite staffing investments.",
      },
    ],
    chain: [
      { key: 'source', label: 'Abridge Ambient', sub: 'documentation AI', isSource: true },
      {
        key: 'doctime', label: 'Documentation Time ↓', sub: 'per encounter',
        detail: {
          cols: [
            { l: 'What it measures', b: 'Minutes of active documentation per encounter — captured via EHR session timestamps, comparing pre- and post-Abridge at the provider level.' },
            { l: 'Data source', b: 'EHR audit logs. Pull the delta between encounter open and note-sign timestamp per provider. No survey data needed.' },
            { l: 'When it moves', b: 'Visible within 6–8 weeks of consistent use. Continues to improve through the first 3–4 months as provider comfort grows.' },
          ],
          grad: "When this metric stabilizes at a consistent low, your physicians have recaptured shift capacity. That's the signal to start watching door-to-provider and throughput metrics.",
        },
      },
      {
        key: 'throughput', label: 'ED Throughput ↑', sub: 'per shift',
        detail: {
          cols: [
            { l: 'What it measures', b: 'The number of patients a provider or the department moves through assessment and disposition in a shift — the operational output of freed documentation time.' },
            { l: 'How to observe it', b: 'Patients per provider per hour (shift-normalized). Also visible as decreasing door-to-provider and door-to-disposition medians from EDIS data.' },
            { l: 'Why it matters', b: "Throughput is the mechanism. Without it, neither LWBS nor volume improvement follows — it's the necessary intermediate step in the chain." },
          ],
        },
      },
      {
        key: 'capacity', label: 'Capacity Headroom', sub: 'beds clear sooner',
        detail: {
          cols: [
            { l: 'What it represents', b: 'Beds clearing faster and providers becoming available for the next patient sooner — the operational window that Abridge helps create.' },
            { l: 'How to observe it', b: 'Indirectly, through door-to-disposition time and occupancy trends. Also visible in scheduling utilization and open-bay time data.' },
            { l: 'Why it matters', b: "Capacity headroom is the bridge between throughput improvement and LWBS improvement. The capacity has to exist before it can be filled by new volume." },
          ],
        },
      },
      {
        key: 'lwbs', label: 'LWBS Rate ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'Patients who register but leave before being seen — the most visible signal of ED access failure to leadership, payers, and competing systems.' },
            { l: 'Data source', b: 'EDIS registration and disposition data. Benchmark: 1–2% is strong; 3–5%+ warrants active intervention.' },
            { l: 'Why it requires volume', b: "LWBS rate decreases when capacity headroom is filled by additional patients. Throughput improvement alone isn't enough — the volume has to be there." },
          ],
        },
      },
      {
        key: 'volume', label: 'Patient Volume ↑', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'Net new patient visits above baseline — patients who previously left (LWBS) or chose a competing ED now captured because of shorter wait times.' },
            { l: 'Data source', b: 'Visit delta vs. comparable baseline period, seasonality-adjusted. Pair with door-to-provider trends to build the attribution story.' },
            { l: 'Relationship to LWBS', b: "These two move together. Rising volume confirms recaptured capacity is being utilized — it's the financial proof of the throughput story." },
          ],
        },
      },
    ],
    timeline: {
      signal: {
        window: 'Week 4–8',
        desc: 'What Abridge directly moves',
        metrics: [
          { name: 'Documentation Time Per Encounter', source: 'EHR audit logs · pre/post per-provider · most direct Abridge signal', badge: 'Week 6–8', why: "Everything in this domain flows from here. If documentation time isn't falling, throughput won't improve and LWBS won't move — this is the first gate to check before expecting any downstream metric." },
          { name: 'After-Shift Charting Time', source: 'EHR session minutes after scheduled shift end · per-provider', badge: 'Week 4–6', why: "Documentation deferred past the shift blocked the provider from turning over to the next patient. This is the earliest signal available — it appears before door-to-provider time has had time to move." },
        ],
        callout: "Graduation signal: When documentation time reaches a stable low, your physicians have recaptured bandwidth. That's the trigger to start watching Trend-stage process metrics — not a plateau, a foundation.",
      },
      trend: {
        window: 'Month 2–5',
        desc: 'Process metrics that follow',
        metrics: [
          { name: 'Door-to-Provider Time', source: 'Triage system or EDIS · median by shift · trended monthly', badge: 'Month 3–5', why: "The primary throughput signal. When providers finish documentation faster, they're available for the next patient sooner — door-to-provider is where that operational change shows up first." },
          { name: 'Door-to-Disposition Time', source: 'ED tracking board · median LOS proxy · admitted vs. discharged split', badge: 'Month 4–7', why: "Full-cycle throughput. Faster documentation during the encounter compresses the time from presentation to disposition decision — but only if the note timeliness improvement holds." },
          { name: 'Patients Per Provider Per Hour', source: 'Scheduling + EHR · by shift type · volume-normalized', badge: 'Month 3–6', why: "The normalized throughput measure. Rising throughput here is the causal mechanism behind both LWBS improvement and volume growth — you need this moving before claiming either." },
        ],
        callout: '',
      },
      proof: {
        window: 'Month 7–12+',
        desc: 'Strategic outcome',
        metrics: [
          { name: 'LWBS Rate (%)', source: 'EDIS registration + disposition · monthly · requires comparable baseline', badge: 'Month 7–12+', why: "The North Star outcome. Requires recaptured capacity to be filled with additional volume before it moves — which is why it takes 7–12+ months and requires active volume management alongside the documentation work." },
          { name: 'Additional Patient Volume', source: 'Visit delta vs. baseline · seasonality-adjusted · fills recaptured capacity', badge: 'Month 9–12+', why: "The financial proof of recaptured capacity. Rising volume alongside declining LWBS confirms the story — capacity headroom was created and is being utilized." },
        ],
        callout: 'Why these move together: LWBS rate decreases when throughput improves and additional volume fills the recaptured capacity. Track them as a pair — one without the other is an incomplete picture.',
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
    northStarSub: 'Physician retention is the financial outcome — but wellbeing is the leading signal. One precedes the other, and you can prove wellbeing long before turnover data matures.',
    matterBoxes: [
      {
        tag: 'CFO conversation',
        body: "Each physician departure costs an estimated $250K–$500K to replace — recruiting, credentialing, onboarding, lost productivity. Locum coverage during vacancy adds further cost. Retention is the financial story.",
      },
      {
        tag: 'CMO conversation',
        body: 'ED physicians have among the highest burnout rates in medicine. Documentation burden is a top-cited contributor. Wellbeing improvement is a mission outcome — and a proof point you can show in months, not years.',
      },
    ],
    matterLayout: '2col',
    alsoNote: "Engaged, non-burned-out physicians document more thoroughly (Quality) and see patients more efficiently (Capacity). This domain's outcomes ripple across the full value story.",
    chain: [
      { key: 'source', label: 'Abridge Ambient', sub: 'documentation AI', isSource: true },
      {
        key: 'pajama', label: 'After-Shift Charting ↓', sub: 'pajama time',
        detail: {
          cols: [
            { l: 'What it measures', b: 'Time physicians spend charting after their shift ends — captured via EHR session logs comparing activity timestamps to scheduled shift end time.' },
            { l: 'Data source', b: 'EHR audit logs. No survey needed. Pull session activity after shift end per provider, pre- and post-Abridge adoption.' },
            { l: 'Why it matters', b: "Pajama time is the most cited contributor to ED physician burnout. Reducing it directly returns personal time — the most visceral benefit Abridge delivers." },
          ],
          grad: "When pajama time approaches zero consistently, providers have their evenings back. The next signal to watch is how that recovery translates to wellbeing scores at Month 3–4.",
        },
      },
      {
        key: 'cogload', label: 'In-Shift Cognitive Load ↓', sub: 'during encounters',
        detail: {
          cols: [
            { l: 'What it represents', b: 'The mental overhead of toggling between patient care and documentation during a shift — context-switching that degrades both the care and the documentation.' },
            { l: 'How to observe it', b: 'Indirectly: documentation time per encounter (EHR logs) and self-reported cognitive fatigue on validated instruments. Not a standalone metric.' },
            { l: 'Why it matters', b: "Cognitive load reduction is what connects documentation efficiency to patient care quality and clinical decision-making. It's the mechanism behind both workforce and quality outcomes." },
          ],
        },
      },
      {
        key: 'wellbeing', label: 'Provider Wellbeing ↑', sub: 'leading indicator',
        detail: {
          cols: [
            { l: 'What it measures', b: 'Physician satisfaction, burnout level, and perceived work-life balance — captured through a validated burnout assessment survey or institutional engagement instrument.' },
            { l: 'Data source', b: 'Most health systems use an institutional survey or vendor-provided burnout instrument. Compare Abridge adopters to non-adopters at the same site for a controlled comparison.' },
            { l: "Why it's both", b: "Wellbeing is a leading indicator of turnover AND a strategic outcome in its own right. A CMO can use wellbeing improvement as a proof point before turnover data matures." },
          ],
        },
      },
      {
        key: 'turnover', label: 'Voluntary Turnover ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'The percentage of physicians who voluntarily leave their role in a given year — the primary financial metric for workforce stability.' },
            { l: 'Data source', b: 'HR data. Voluntary departure rate by department. Compare Abridge units to non-Abridge units, controlling for seniority and specialty mix.' },
            { l: 'The financial case', b: "Replacing one ED physician is estimated to cost $250K–$500K (recruiting, credentialing, onboarding, lost productivity). Even 1–2 fewer departures per year covers Abridge's cost many times over." },
          ],
        },
      },
      {
        key: 'locum', label: 'Locum Spend ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'The cost and volume of locum/agency physicians used to fill open shifts during vacancies — the direct financial consequence of turnover.' },
            { l: 'Data source', b: 'Finance and staffing data. Locum hours × rate per shift. Compare year-over-year as retention improves.' },
            { l: 'Relationship to turnover', b: "These move together. As voluntary departures decrease, the pipeline of locum shifts needed during vacancy periods shrinks. Track them as a pair for the complete financial picture." },
          ],
        },
      },
    ],
    timeline: {
      signal: {
        window: 'Week 4–8',
        desc: 'Behavioral change in EHR data',
        metrics: [
          { name: 'After-Shift Charting Time (Pajama Time)', source: 'EHR session logs · minutes after scheduled shift end · per-provider · no survey needed', badge: 'Week 4–6', why: "Pajama time in the ED is a patient safety and burnout issue — providers reviewing prior cases while starting new ones. This is the most sensitive early Abridge signal in the ED." },
          { name: 'Documentation Time Per Encounter', source: 'EHR audit logs · active time on note per encounter · pre/post comparison', badge: 'Week 6–8', why: "Confirms notes are being completed during the encounter, not deferred. Downstream wellbeing improvements can't happen until this is consistently low across the department." },
        ],
        callout: "Why start here: EHR data is objective and requires no survey coordination. Pajama time reduction is the most visceral proof point for clinicians — and the most believable one for administrators skeptical of self-reported wellbeing data.",
      },
      trend: {
        window: 'Month 2–5',
        desc: 'Wellbeing signals emerge',
        metrics: [
          { name: 'Provider Wellbeing Score', source: 'Validated burnout assessment survey · Abridge vs. non-Abridge providers at same site · run quarterly', badge: 'Month 3–6', why: "Burnout recovery lags documentation relief by 2–4 months — the psychological recovery takes time. This is the mechanism connecting reduced documentation burden to eventual retention improvement." },
          { name: 'Intent to Stay', source: 'Validated single-item or institutional engagement survey · trended quarterly', badge: 'Month 3–6', why: "Intent to stay moves before actual departures, giving you a window to act. Watch for divergence between Abridge adopters and non-adopters before annual turnover data is available." },
          { name: 'Satisfaction with Documentation Workflow', source: 'EHR satisfaction survey or department-specific pulse · Abridge adopters vs. non-adopters', badge: 'Month 2–4', why: "The most direct attitudinal signal. Can improve faster than deeper wellbeing metrics and is a leading indicator of both adoption sustainability and eventual intent-to-stay improvement." },
        ],
        callout: 'The CFO bridge: Wellbeing scores don\'t directly appear on a balance sheet. Build the bridge explicitly: improved wellbeing is a leading indicator of lower voluntary departure intent. This converts a soft metric into a financial forecast.',
      },
      proof: {
        window: 'Month 12–18',
        desc: 'Retention and cost impact',
        metrics: [
          { name: 'Voluntary Physician Turnover Rate', source: 'HR data · annual departures / total headcount · Abridge units vs. comparable non-Abridge units', badge: 'Month 12–18', why: "The lagging outcome — takes 12–18 months because departure decisions have long lead times and are measured annually. Requires cohort-level comparison to be meaningful." },
          { name: 'Locum & Agency Utilization', source: 'Staffing / finance data · locum hours and cost per open shift · year-over-year comparison', badge: 'Month 9–18', why: "Open shifts filled by locums indicate workforce instability. As turnover drops, locum dependency drops — this is the financial expression of the retention story that CFOs can see directly." },
          { name: 'Vacancy Fill Time', source: 'HR data · days from open to filled per physician role · trended annually', badge: 'Month 12+', why: "How long it takes to fill an open physician role. Declining fill time indicates the employer brand has improved — a lagging indicator of the retention story becoming known in the market." },
        ],
        callout: "Why the long timeline: Turnover is a lagging indicator — you need 12–18 months of data before departures are statistically meaningful. The strategy is to prove wellbeing early, build the CFO bridge at Month 6, and let the turnover data confirm the story as it matures.",
      },
    },
  },

  // ── REVENUE ───────────────────────────────────────────────────────────────
  {
    domain: 'REVENUE',
    number: 'Domain 3 of 4',
    badge: 'Coding Integrity & Denial Prevention',
    northStar: 'Revenue Per Visit',
    direction: '↑',
    northStarSub: 'The revenue story in ED runs on two tracks — E/M coding lift and denial reduction. Neither alone tells the full picture. Both are driven by documentation completeness.',
    matterBoxes: [
      {
        tag: 'Matters most if…',
        body: "Your E/M distribution is skewed toward mid-level codes, your medical necessity denial rate is above 3–5%, or your revenue cycle team is flagging documentation gaps as a root cause of write-offs.",
      },
    ],
    alsoNote: "This is frequently the larger financial impact of the two revenue tracks — E/M coding uplift and denial recovery — and it lives in your revenue cycle team, not with the physician alone. Cross-departmental visibility is required to tell the full story.",
    chain: [
      { key: 'source', label: 'Abridge Ambient', sub: 'documentation AI', isSource: true },
      {
        key: 'completeness', label: 'Documentation Completeness ↑', sub: 'clinical detail captured',
        detail: {
          cols: [
            { l: 'What it means', b: 'The degree to which a note captures the full clinical picture — HPI depth, assessment specificity, plan rationale. More complete notes support higher E/M levels and withstand payer scrutiny.' },
            { l: 'How to measure it', b: 'CDI or coding team note audits (sampled). Some EHRs have built-in documentation completeness scoring. Same-day closure rate is a behavioral proxy.' },
            { l: "Why it's first", b: 'Every downstream revenue outcome — E/M level, denial rate, CDI queries — is upstream-gated by note completeness. This is the root cause.' },
          ],
          grad: "When same-day closure and charge lag reach a consistent low, the documentation foundation is set. That's the signal to start watching E/M distribution and denial rate data.",
        },
      },
      {
        key: 'emlevels', label: 'E/M Level Support ↑', sub: 'acuity documented',
        detail: {
          cols: [
            { l: 'What it measures', b: 'The distribution of E/M codes assigned across visits — the mix of 99281 through 99285 for ED. Higher acuity codes require more thorough documentation to support.' },
            { l: 'Data source', b: 'Billing system. Pull the distribution per provider (not just average) and compare pre/post Abridge adoption. Same-provider comparison controls for acuity differences.' },
            { l: 'The honest truth', b: "E/M lift is real but modest. Under-coding happens when documentation doesn't capture complexity. Better notes support the code the physician intended, not a dramatic upward shift." },
          ],
        },
      },
      {
        key: 'medevidence', label: 'Medical Necessity Evidence ↑', sub: 'reasoning captured',
        detail: {
          cols: [
            { l: 'What it captures', b: 'The clinical reasoning behind diagnostic and treatment decisions — the "why" of the encounter, not just the "what." Payers require this to approve medical necessity.' },
            { l: 'Where it shows up', b: 'Denial prevention: notes with clear medical necessity reasoning are far less likely to trigger payer denials. CDI: better reasoning reduces CDI query loops on admissions.' },
            { l: "Why it's separate", b: 'Medical necessity evidence and E/M level support are related but distinct. A note can support a high E/M level but still lack the clinical reasoning needed to withstand a payer audit.' },
          ],
        },
      },
      {
        key: 'wrvu', label: 'wRVU Per Encounter ↑', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'Work relative value units per encounter — the primary physician productivity metric and the basis for most professional fee revenue in ED.' },
            { l: 'Data source', b: 'Billing system. Per-provider comparison. Control for acuity mix and payer mix when comparing cohorts. Show distribution shifts, not just mean change.' },
            { l: 'Expectation setting', b: 'E/M improvement is recovery of revenue already being earned but not fully captured — documentation now supports the code the physician intended. Show the distribution shift alongside the mean.' },
          ],
        },
      },
      {
        key: 'denials', label: 'Denial Rate ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'The percentage of claims denied by payers for documentation-related reasons — primarily medical necessity failures. Distinct from coding denials and eligibility denials.' },
            { l: 'Data source', b: 'Revenue cycle system. Isolate documentation-related denials from total denial volume. Track appeal success rate separately — better documentation improves appeals too.' },
            { l: "Why it's often bigger", b: "At scale across thousands of ED encounters, denial reduction frequently exceeds the E/M coding story in total dollar impact. One prevented denial = avoided cost plus the write-off value." },
          ],
        },
      },
    ],
    timeline: {
      signal: {
        window: 'Week 2–8',
        desc: 'Documentation behavior shifts',
        metrics: [
          { name: 'Documentation Time Per Encounter ↓', source: 'EHR audit logs · active documentation time per encounter · pre/post per-provider · most direct Abridge signal', badge: 'Week 2–4', why: "When documentation time per encounter drops, the note is being generated in parallel with the encounter rather than reconstructed after it. This is the upstream gate — E/M accuracy, charge lag, and denial rate all depend on this moving first." },
          { name: 'Same-Day Note Closure Rate ↑', source: 'EHR data · % of notes signed same calendar day as encounter · Abridge providers vs. baseline', badge: 'Week 4–8', why: "Notes closed same-shift mean charges submitted same-day and clinical reasoning captured before it fades. This is the documentation behavior proof that Abridge is changing how providers complete their notes — not just how fast they type." },
        ],
        callout: "Why start here: E/M accuracy, charge lag, and denial rate all follow from documentation completeness — they can't improve if notes aren't changing first. These two metrics are the documentation foundation. Everything else is downstream.",
      },
      trend: {
        window: 'Month 1–4',
        desc: 'Billing and coding patterns emerge',
        metrics: [
          { name: 'Charge Lag (Days to Bill)', source: 'Revenue cycle system · days from date of service to charge submission · trended monthly', badge: 'Month 1–2', why: "Same-day note closure drives same-day charge submission. Shorter lag means faster cash flow and lower denial risk — the first financial signal that documentation behavior has changed." },
          { name: 'Claims Rework Staff Hours ↓', source: 'RCM system or billing team logs · staff hours per week spent reworking denied or rejected ED claims · trended monthly', badge: 'Month 1–3', why: "Documentation-related denials require staff time to write appeal letters and resubmit. When note quality improves and medical necessity is documented in real time, that work simply doesn't get triggered. Tracking rework hours isolates the operational cost of poor documentation before the denial rate itself moves." },
          { name: 'E/M Level Distribution', source: 'Billing system · % of visits at each level (99281–99285) · same-provider pre/post comparison', badge: 'Month 2–4', why: "Complete notes support the level of service actually delivered. Watch the distribution shift toward appropriate higher levels (99284–99285), not just the mean — the mix is the real signal." },
          { name: 'CDI Query Rate on ED Admissions', source: 'CDI team data · queries per 100 admissions · Abridge providers vs. baseline', badge: 'Month 2–4', why: "CDI querying the ED team means the documentation didn't fully capture the clinical picture on first creation. A declining query rate means less documentation rework and more accurate initial coding." },
        ],
        callout: 'The distribution shift matters more than the average: A single wRVU average can be flat while the underlying distribution shifts meaningfully — fewer mid-level codes, more high-acuity codes. Always show the distribution, not just the mean.',
      },
      proof: {
        window: 'Month 4–9',
        desc: 'Financial recovery confirmed',
        metrics: [
          { name: 'wRVU Per Encounter', source: 'Billing system · per-provider pre/post · show distribution (99281–99285 mix), not just mean — distribution shift is the real signal', badge: 'Month 3–6', why: "The financial proof that documentation completeness translates to appropriate reimbursement. Provider-level pre/post comparison is the attribution story — and distribution shift, not just mean, is the real signal." },
          { name: 'Medical Necessity Denial Rate', source: 'Revenue cycle · documentation-related denials per 100 claims · isolate from coding and eligibility denials', badge: 'Month 4–9', why: "Documentation-related denials are entirely preventable. A declining rate is proof that note quality is consistently meeting payer standards — not just improving on average." },
        ],
        callout: "The distribution matters more than the average: A flat wRVU mean can mask a meaningful shift in the underlying code distribution. Show both — the mean and the mix — so the story doesn't get dismissed because one number didn't move dramatically.",
      },
    },
  },

  // ── QUALITY ───────────────────────────────────────────────────────────────
  {
    domain: 'QUALITY',
    number: 'Domain 4 of 4',
    badge: 'Protocol Adherence & Clinical Evidence',
    northStar: 'Quality Measure Compliance',
    direction: '↑',
    northStarSub: "If it wasn't documented, it didn't happen. Providers in the ED often deliver compliant care — the gap is that time-sensitive clinical reasoning never makes it into the chart. Abridge captures the \"why\" in real time, not reconstructed hours later.",
    matterBoxes: [
      {
        tag: 'CMO / VP Quality',
        body: "Your compliance gaps don't match your clinical team's account of care delivered — providers believe they did the work, but the record doesn't support it. CMS core measure pressure on sepsis, stroke, or STEMI documentation. Quality team hours consumed by deficiency resolution rather than improvement initiatives.",
      },
      {
        tag: 'CFO / COO',
        body: "Documentation deficiency resolution is a hidden operational cost — peer review, HIM rework, and appeal cycles that rarely surface in quality dashboards. Every hour the quality team spends closing documentation gaps is an hour not spent on performance improvement that reduces readmissions, penalties, or length of stay.",
      },
    ],
    alsoNote: "Documentation quality in the ED has downstream effects that extend beyond quality scores — it reduces CDI query burden on ED-to-admit transitions and strengthens the clinical record for risk and compliance review.",
    chain: [
      { key: 'source', label: 'Abridge Ambient', sub: 'documentation AI', isSource: true },
      {
        key: 'realtimedoc', label: 'In-Encounter Documentation ↑', sub: 'real-time, not reconstructed',
        detail: {
          cols: [
            { l: 'What it means', b: 'Documentation captured during the encounter itself — while the patient is present or the clinical event is active — rather than reconstructed from memory at the end of a shift.' },
            { l: 'Why timing matters', b: 'Time-sensitive quality measures (sepsis, stroke, STEMI) require documentation of when clinical events were recognized and why decisions were made. Reconstructed notes often lack the specific timestamps and reasoning quality programs require.' },
            { l: 'How to observe it', b: 'Same-shift note completion rate from EHR data. Also visible in CDI query reduction — when documentation is captured in real time, clarification queries drop because the story is already there.' },
          ],
          grad: "When same-shift completion stabilizes, providers have shifted from reconstructing to capturing in real time. That's the foundation for quality measure attribution improvement.",
        },
      },
      {
        key: 'reasoning', label: 'Clinical Reasoning Captured ↑', sub: 'the "why" alongside the "what"',
        detail: {
          cols: [
            { l: 'What it captures', b: 'The clinical reasoning — the "why" behind diagnoses, orders, and treatment decisions. Quality programs increasingly require evidence of decision-making, not just actions taken.' },
            { l: 'Where it matters', b: 'Sepsis: documentation of recognition criteria and reasoning for bundle elements. Stroke: clinical decision-making around tPA eligibility. Core measures: medical necessity evidence woven into the note narrative.' },
            { l: 'The gap Abridge closes', b: 'When providers reconstruct notes post-shift, the "what happened" is preserved but the "why" is often compressed or lost. Ambient capture preserves the reasoning as it was articulated.' },
          ],
        },
      },
      {
        key: 'attribution', label: 'Quality Attribution ↑', sub: 'care mapped to measures',
        detail: {
          cols: [
            { l: 'What it means', b: 'The degree to which documented care can be mapped by quality systems to the specific measures that require it — sepsis bundles, core measures, protocol elements.' },
            { l: 'The attribution gap', b: "Providers may have delivered every required bundle element, but if the documentation doesn't contain the expected terminology, timestamps, or structure, the quality system can't attribute it as compliant." },
            { l: 'How to close it', b: 'Real-time documentation with clinical reasoning present gives quality reviewers and automated systems the evidence they need. Attribution improves not because care changed but because the record now supports it.' },
          ],
        },
      },
      {
        key: 'compliance', label: 'Compliance Score ↑', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'The percentage of qualifying encounters that meet the documentation and care requirements for a given quality measure — CMS core measures, condition-specific bundles, or internal quality program metrics.' },
            { l: 'Data source', b: 'Quality reporting system or CMS submissions. Pull at the individual measure level, not just composite. Compare Abridge provider cohort to pre-Abridge baseline with sufficient volume for significance.' },
            { l: 'Timeline expectation', b: 'Compliance scores have reporting lag — they often reflect care from weeks prior. Track the upstream documentation metrics first; the score is confirmation, not discovery.' },
          ],
        },
      },
      {
        key: 'deficiency', label: 'Deficiency Rate ↓', sub: '', isOutcome: true,
        detail: {
          cols: [
            { l: 'What it measures', b: 'The percentage of encounter records flagged by HIM or the quality team for incomplete, ambiguous, or deficient documentation — a direct indicator of real-time documentation quality.' },
            { l: 'Data source', b: 'HIM or clinical documentation quality system. Compare Abridge providers vs. non-Abridge cohort. Track resolution time (days to deficiency closure) alongside rate.' },
            { l: "Why it's a dual signal", b: "A falling deficiency rate means less rework for clinical staff and less review burden for the quality team. It's both a documentation quality metric and a quality operations efficiency metric." },
          ],
        },
      },
    ],
    timeline: {
      signal: {
        window: 'Month 1–3',
        desc: 'Documentation behavior shifts',
        metrics: [
          { name: 'Note Completion Rate (Same Shift)', source: "EHR data · % of notes signed before end of provider's shift · Abridge providers vs. baseline", badge: 'Week 4–8', why: "Quality measure capture requires documentation to exist when it's needed. Same-shift completion is the upstream gate — if it's not high, nothing downstream will reliably close." },
          { name: 'Note Completeness Score ↑', source: 'CDI audit or documentation quality review · average completeness % across ED notes · Abridge providers vs. baseline', badge: 'Month 1–3', why: "Same-shift completion tells you when the note was signed; completeness tells you what it actually captured. A note signed on time but missing clinical reasoning, HPI depth, or time-sensitive decision documentation still fails quality review. This is the foundational quality signal — every measure attribution, sepsis bundle element, and deficiency rate metric downstream depends on it." },
          { name: 'CDI Query Rate on ED Admissions', source: 'CDI team data · queries per 100 ED-to-admit transitions · tracks whether documentation required clarification after the encounter', badge: 'Month 1–3', why: "CDI querying ED-to-admit transitions means the clinical picture wasn't captured in the ED note. A declining query rate means Abridge notes are already capturing what CDI was having to chase after the fact." },
        ],
        callout: "Graduation signal: When same-shift note completion stabilizes and CDI queries on ED admissions trend down, the clinical story is being captured in real time. That's the trigger to start watching quality measure attribution in the Trend stage.",
      },
      trend: {
        window: 'Month 3–6',
        desc: 'Measure attribution improves',
        metrics: [
          { name: 'Core Measure Documentation Rate', source: 'Quality reporting system · % of qualifying encounters with required documentation elements present · trended monthly', badge: 'Month 3–5', why: "Core measures (STEMI, sepsis, stroke) require specific time-stamped elements. Ambient documentation captures these in real time during the clinical encounter rather than reconstructed hours later." },
          { name: 'Sepsis Bundle Documentation Completeness', source: 'ED quality data · % of sepsis-qualifying encounters with recognition time, clinical reasoning, and bundle element documentation', badge: 'Month 2–5', why: "Sepsis bundle documentation requires capturing recognition timing, decision-making, and intervention timing. Ambient notes capture this in the moment — retrospective documentation misses or compresses these details." },
          { name: 'Documentation Deficiency Rate', source: 'HIM system · % of charts flagged for incomplete documentation · Abridge providers vs. non-Abridge cohort', badge: 'Month 3–6', why: "Deficiencies indicate what reviewers found incomplete after the fact. A declining deficiency rate means notes are complete enough on first creation — reducing audit burden and quality team workload." },
        ],
        callout: "The attribution gap: Core measure compliance often improves before the formal compliance score reflects it — because attribution logic has a lag. Track the documentation elements directly first. The score follows.",
      },
      proof: {
        window: 'Month 6–12',
        desc: 'Quality scores confirmed',
        metrics: [
          { name: 'Quality Measure Compliance Score', source: 'CMS / quality program reporting · composite or individual measure score · Abridge provider cohort vs. pre-Abridge baseline · requires sufficient volume', badge: 'Month 6–12', why: "The composite outcome. All upstream documentation improvements converge here — but it takes 6–12 months because it requires sufficient volume to be statistically meaningful." },
          { name: 'Peer Review / Deficiency Resolution Rate', source: 'Quality operations data · hours spent on documentation deficiency review and resolution · leading indicator of quality team capacity freed', badge: 'Month 6–10', why: "Quality team hours spent resolving deficiencies are hours not spent on improvement work. As Abridge notes reduce deficiency volume, quality capacity is freed for higher-value activity." },
        ],
        callout: "Why deficiency rate is a meaningful outcome: Every hour the quality team spends resolving documentation gaps is an hour not spent on improvement initiatives. A declining deficiency rate is both a quality signal and a workforce efficiency signal for the quality program itself.",
      },
    },
  },
];

// ─── Value Architecture Data ──────────────────────────────────────────────────

const edFramework: FrameworkItem[] = [
  {
    domain: 'CAPACITY',
    tag: 'modeled',
    narrative: 'Left-without-being-seen events represent visits the ED attempted to serve but lost — typically driven by wait times that become unacceptable before the patient is seen. Documentation burden is one contributor to throughput delays: when physicians spend more time charting per patient, availability to see and disposition the next one is reduced. The model estimates potential revenue recovery from a reduction in LWBS volume using your visit volume, baseline LWBS rate, and expected improvement factor — then applies a fraction to limit the attribution to documentation-related delays specifically.',
    chain: ['Documentation Time/Patient ↓', 'Physician Availability ↑', 'Bed Cycle Time ↓', 'LWBS Events ↓'],
    chainOutput: 'Volume Recovered ↑',
    steps: [
      {
        vars: [
          { v: 'Annual ED visit volume', kind: 'input' },
          { v: 'Baseline LWBS rate (%)', kind: 'input' },
        ],
        result: 'LWBS events/year',
      },
      {
        vars: [
          { v: 'LWBS events/year', kind: 'derived' },
          { v: 'Documentation-attributable LWBS fraction', kind: 'benchmark', hint: '~25%' },
          { v: 'Expected improvement with ambient', kind: 'benchmark', hint: '~30–45%' },
        ],
        result: 'Recovered visits/year',
      },
      {
        vars: [
          { v: 'Recovered visits/year', kind: 'derived' },
          { v: 'Net revenue per ED visit', kind: 'input' },
        ],
        result: 'Revenue from recovered volume',
        isFinal: true,
      },
    ],
  },
  {
    domain: 'WORKFORCE',
    tag: 'modeled',
    narrative: 'Emergency medicine physicians frequently report completing documentation after their shift ends — a pattern driven by the volume and acuity of ED encounters. Industry sources estimate EM physician turnover costs at $350K–$600K per departure, reflecting the specialized recruiting market, locum coverage costs, and onboarding time. The model explicitly attributes only a fraction of departures to documentation burden rather than claiming all turnover stems from it — making the causal link defensible and the estimate conservative.',
    chain: ['Shift-End Chart Backlog ↓', 'After-Hours EHR Activity ↓', 'Provider Wellbeing ↑', 'Intent to Stay ↑'],
    chainOutput: 'Voluntary Turnover ↓',
    steps: [
      {
        vars: [
          { v: 'Annual voluntary EM departures', kind: 'input' },
          { v: 'Documentation-attributable fraction', kind: 'benchmark', hint: '~25%' },
          { v: 'Expected improvement with ambient', kind: 'benchmark', hint: '~25–35%' },
        ],
        result: 'Est. departures avoided/yr',
      },
      {
        vars: [
          { v: 'Est. departures avoided', kind: 'derived' },
          { v: 'EM physician replacement cost', kind: 'benchmark', hint: '$350K–$600K' },
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
    narrative: "ED E/M coding uses a 5-level system, and the appropriate level depends on the complexity documented at the time of the encounter. When notes are incomplete, the supporting documentation for higher-acuity codes may not be present, even when the clinical work warranted them. This coding effect applies to E/M-coded ED visits specifically — not all ED encounters — so the model denominates by that subset explicitly. A parallel denial component captures claim-integrity benefit; incomplete ED notes are a commonly cited trigger for medical necessity denials, particularly for inpatient admissions originating from the ED.",
    chain: ['MDM Documentation ↑', 'E/M Level Accuracy ↑', 'Claim Integrity ↑'],
    chainOutput: 'Revenue Per Visit ↑',
    steps: [
      {
        vars: [
          { v: 'Total annual ED visits', kind: 'input' },
          { v: 'E/M-coded visit fraction', kind: 'benchmark', hint: '~85%' },
        ],
        result: 'Annual E/M ED visits',
      },
      {
        vars: [
          { v: 'Annual E/M ED visits', kind: 'derived' },
          { v: 'E/M level improvement rate', kind: 'input' },
          { v: 'Avg revenue delta per level change', kind: 'benchmark', hint: '~$60–100' },
        ],
        result: 'E/M coding impact',
      },
      {
        vars: [
          { v: 'Annual E/M ED visits', kind: 'derived' },
          { v: 'Documentation denial rate reduction', kind: 'input' },
          { v: 'Avg ED denial value', kind: 'benchmark', hint: '~$200–400' },
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
    narrative: 'ED quality programs — sepsis core measures, stroke protocol documentation, CDI query resolution — depend on clinical records that are specific, timely, and complete. When documentation of time-sensitive interventions or bundle elements is incomplete, core measure attribution may not occur even when care was delivered. More thorough ambient documentation may reduce deficiency rates and CDI query volume by ensuring the record reflects what actually occurred. These outcomes are tracked as performance signals; dollar values are not modeled, as they depend on specific measure thresholds and payer contracts.',
    chain: ['Bundle Documentation Completeness ↑', 'Core Measure Criteria Met ↑', 'CDI Query Rate ↓'],
    chainOutput: 'Quality Performance ↑',
    note: 'Not modeled in dollars — quality incentive amounts depend on measure thresholds and payer contracts. Tracked as core measure compliance rate, CDI query volume, and documentation deficiency rate.',
  },
];

// ─── Personas & Discovery Questions ──────────────────────────────────────────

const edFrameworkPersonas: Record<DomainName, string[]> = {
  CAPACITY:  ['COO', 'ED Medical Director'],
  WORKFORCE: ['CMO', 'CHRO'],
  REVENUE:   ['CFO', 'VP Revenue Cycle'],
  QUALITY:   ['VP Quality', 'CMO'],
};

const edFrameworkQuestions: Record<DomainName, string[]> = {
  CAPACITY: [
    'What does your current LWBS rate look like — and do you know how much of it is documentation-related versus boarding or staffing?',
    'When a physician finishes a note, how long before they\'re available for the next patient — is there a way you measure that today?',
    'If throughput improved by 10%, would you have the staffing and physical capacity to absorb that additional volume?',
  ],
  WORKFORCE: [
    'How are you measuring physician burnout or intent to stay right now — and is documentation specifically coming up as a driver?',
    'What\'s voluntary turnover costing you in the ED physician group — are you tracking replacement cost per departure?',
    'If you could give your physicians 30 minutes back per shift, what would the organizational benefit look like?',
  ],
  REVENUE: [
    'Where does your E/M distribution sit right now — are you seeing a skew toward mid-level codes that might reflect under-documentation?',
    'What\'s your current medical necessity denial rate on ED claims, and do you know what fraction is documentation-attributable?',
    'Is your revenue cycle team flagging documentation gaps as a root cause of write-offs or code downgrades?',
  ],
  QUALITY: [
    'When you look at core measure compliance gaps, do your clinicians feel the care was delivered but the documentation didn\'t capture it?',
    'How much time does your quality team spend on documentation deficiency resolution versus actual improvement initiatives?',
    'Are CDI queries on your ED-to-admit transitions trending up — and do you know what\'s driving them?',
  ],
};

// ─── Value Architecture Component ────────────────────────────────────────────

function EDValueArchitectureSection() {
  const domainOrder: DomainName[] = ['WORKFORCE', 'CAPACITY', 'REVENUE', 'QUALITY'];
  const sortedFramework = [...edFramework].sort((a, b) => domainOrder.indexOf(a.domain) - domainOrder.indexOf(b.domain));
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['WORKFORCE', 'CAPACITY', 'REVENUE', 'QUALITY']));
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
        {sortedFramework.map((item) => {
          const tc = tagCfg[item.tag];
          const isCollapsed = collapsed.has(item.domain);
          const personas = edFrameworkPersonas[item.domain] ?? [];
          const questions = edFrameworkQuestions[item.domain] ?? [];
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

// ─── New ED Domain Card ───────────────────────────────────────────────────────

function NewEDDomainCard({ data }: { data: EDDomainCardData }) {
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
            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#999999] mb-1.5">{data.number} · Emergency Department</p>
            <p className="text-base font-bold text-[#1A1A1A]">{data.domain.charAt(0) + data.domain.slice(1).toLowerCase()}</p>
          </div>
          <div className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-medium text-[#EA2C00] border border-[#EA2C00]/30 bg-[#EA2C00]/[0.06] whitespace-nowrap">
            {data.badge}
          </div>
        </div>

        <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-[#999999] mb-3">North Star Outcome</p>
        <div className="text-[44px] font-extrabold leading-none tracking-tight text-[#1A1A1A] mb-3">
          {data.northStar}{' '}
          <span className="text-[#EA2C00] font-light text-[38px]">{data.direction}</span>
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

        {/* Chain row */}
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

        {/* Detail panel */}
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

        {/* Tab bar */}
        <div className="flex border border-[#E4E4E4] rounded-xl overflow-hidden mb-0">
          {(['s', 't', 'p'] as const).map((s, idx) => {
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

        {/* Stage body */}
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

      {/* Legal */}
      <div className="px-8 py-3 border-t border-[#F0F0F0] bg-[#FAF7F2] text-[11px] text-[#777777] leading-relaxed">
        Results vary based on EHR configuration, provider adoption, and operational factors outside Abridge's control. This framework is a measurement guide — not a performance guarantee. Timelines represent ranges and should be validated against your organization's baseline.
      </div>
    </div>
  );
}

// ─── ED Domain Methodology Section ───────────────────────────────────────────
// Keeps the existing heading exactly as-is; replaces only the domain cards.

function EDDomainMethodologySection() {
  const domainOrder: DomainName[] = ['WORKFORCE', 'CAPACITY', 'REVENUE', 'QUALITY'];
  const sortedCards = [...edDomainCards].sort((a, b) => domainOrder.indexOf(a.domain) - domainOrder.indexOf(b.domain));
  const [activeDomain, setActiveDomain] = useState(sortedCards[0].domain);
  const activeCard = sortedCards.find(c => c.domain === activeDomain)!;

  return (
    <div className="mb-10">
      <div className="mb-6 pb-3 border-b-2 border-[#EA2C00]">
        <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#888888] mb-2">Methodology</p>
        <h2 className="text-[24px] font-bold text-black tracking-tight">Understanding the Value</h2>
        <p className="text-sm text-[#888888] mt-1">
          Four domains. Each has a distinct North Star outcome, a causal chain showing how Abridge enables it, and a measurement path with honest timelines.
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
        <NewEDDomainCard data={activeCard} />
      </motion.div>
    </div>
  );
}

// ─── Adoption Section (unchanged) ────────────────────────────────────────────

function EDAdoptionSection() {
  const metrics = [
    { label: "% of ED clinicians using ambient", note: "Platform analytics / Abridge dashboard" },
    { label: "% of encounters using ambient", note: "Platform analytics vs. EHR encounter count" },
    { label: "Notes generated per shift", note: "Platform analytics" },
    { label: "Avg ambient session duration", note: "Platform analytics" },
    { label: "% of note completed by ambient vs. manual", note: "Platform analytics / EHR audit logs" },
  ];

  return (
    <div className="mb-10 bg-[#1A1A1A] rounded-sm overflow-hidden">
      <div className="px-6 pt-6 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-1">Non-Negotiable</p>
        <h3 className="text-base font-bold text-white mb-2">Foundational: Adoption & Utilization</h3>
        <p className="text-[13px] text-[#888888] leading-relaxed">
          If adoption isn't demonstrated, no downstream metric can be attributed to Abridge. Every ROI conversation has to establish these first — before any capacity, revenue, or quality number carries weight.
        </p>
      </div>
      <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="bg-[#2D2D2D] rounded-sm p-4">
            <p className="text-[13px] text-white font-medium mb-1">{m.label}</p>
            <p className="text-[11px] text-[#666666]">{m.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Value Arc Section (unchanged) ───────────────────────────────────────────

function EDValueArcSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const stages: { number: string; badge: BadgeType; timing: string; title: string; description: string; activeDomains: DomainName[] }[] = [
    {
      number: "01",
      badge: "Signal",
      timing: "Week 6–8",
      title: "The Provider Feels It",
      description: "After-shift charting drops. Documentation time per encounter measurably shorter. Visible in EHR audit logs before any aggregate data moves.",
      activeDomains: ["WORKFORCE", "CAPACITY"],
    },
    {
      number: "02",
      badge: "Trend",
      timing: "Month 2–3",
      title: "The Chart Shows It",
      description: "E/M level distribution shifts in claims data. CDI query rates on admits drop. One full billing cycle required before the aggregate signal is clean.",
      activeDomains: ["REVENUE", "QUALITY"],
    },
    {
      number: "03",
      badge: "Proof",
      timing: "Month 3–18",
      title: "The System Measures It",
      description: "LWBS, denial rates, quality compliance, physician retention. Downstream of documentation maturity — requires controlled comparisons for statistical credibility.",
      activeDomains: ["CAPACITY", "REVENUE", "WORKFORCE", "QUALITY"],
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

// ─── Main Export ──────────────────────────────────────────────────────────────

export function MethodologyED({ onBack, onHome, onNavigateToSetting, onBuildModel }: MethodologyEDProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await generateMethodologyPDF("ed");
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
          <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#EA2C00] mb-4">Emergency Department</p>
          <h1 className="text-[32px] md:text-[40px] font-bold text-black leading-tight tracking-tight mb-4">
            How We Think<br />About Value
          </h1>
          <p className="text-[15px] text-[#666666] max-w-[500px] mx-auto leading-relaxed">
            A guided framework for building a defensible ROI case with your emergency department leadership team.
          </p>
        </motion.div>

        <EDValueArcSection />

        <EDDomainMethodologySection />

        <EDAdoptionSection />

        <EDValueArchitectureSection />

        <motion.div className="mt-4 mb-10 bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] rounded-lg p-8 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="text-xl font-bold text-white mb-2">Ready to Build Your Model?</h3>
          <p className="text-[#999999] mb-6 text-sm">Use these methodology principles to create a customized ROI model for your emergency department.</p>
          <button onClick={onBuildModel ?? onBack} className="inline-flex items-center gap-2 bg-[#EA2C00] hover:bg-[#D12600] text-white font-medium px-6 py-3 rounded-lg transition-colors" data-testid="button-build-model">
            Build an ED Model <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        <p className="text-xs text-[#888888] leading-relaxed mb-6">Projections are modeled estimates based on user-provided inputs, published industry benchmarks, and aggregated deployment experience. Actual results may vary based on implementation approach, provider adoption, organizational factors, and care setting.</p>

        <div className="mb-8">
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Related Methodologies</p>
          <div className="grid md:grid-cols-3 gap-4">
            <button onClick={() => onNavigateToSetting?.("inpatient")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-inpatient">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Building2 className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Inpatient</p><p className="text-xs text-[#888888]">ED admissions flow here</p></div>
            </button>
            <button onClick={() => onNavigateToSetting?.("outpatient")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-outpatient">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Stethoscope className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Outpatient</p><p className="text-xs text-[#888888]">wRVU & patient access</p></div>
            </button>
            <button onClick={() => onNavigateToSetting?.("nursing")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-nursing">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Heart className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Nursing</p><p className="text-xs text-[#888888]">ED nursing documentation</p></div>
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
