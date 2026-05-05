import { motion } from "framer-motion";
import { ArrowLeft, Download, ArrowRight, Stethoscope, Building2, Heart, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { generateMethodologyPDF } from "@/lib/methodology-pdf-export";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';
import {
  CollapsibleSection,
  DomainImpactCard,
  ImpactBadge,
  domainColors,
  type BadgeType,
  type DomainCardData,
  type DomainDetailData,
  type DomainName,
  type QualitativeSignal,
} from "@/components/methodology/MethodologyShared";

interface MethodologyEDProps {
  onBack: () => void;
  onNavigateToSetting?: (setting: string) => void;
}

// ─── Domain Methodology Data ──────────────────────────────────────────────────

type EDMechanism = {
  label: string;
  description: string;
};

const edDomainMethodology = [
  {
    domain: "CAPACITY" as DomainName,
    tagline: "Throughput & Patient Flow",
    problem: "ED throughput is constrained by physician time, documentation time, and cognitive load. But this only improves when physician documentation is the actual bottleneck — not beds, nursing ratios, or ancillary wait times. Establish which constraint owns your LWBS before modeling this domain.",
    outcomes: [
      { label: "LWBS rate", direction: "↓" as const },
      { label: "Additional admissions captured", direction: "↑" as const },
    ],
    mechanisms: [
      { label: "Patients per provider per hour", description: "When charting time drops, providers complete their note faster and move to the next patient sooner. This is the primary throughput mechanism — but only activates when physician time, not bed availability, is your actual constraint." },
      { label: "Time in note per encounter", description: "How long a provider spends in the EHR charting each patient. Studies on ambient AI in similar settings show 30–50% reduction for consistent users — from 8–15 minutes to 2–4 minutes of note review." },
      { label: "Door-to-disposition time", description: "Total time from patient arrival to discharge or admission decision. Documentation speed is one input — testing turnaround, specialist availability, and bed management all contribute. We model documentation's share." },
      { label: "Door-to-provider time", description: "Time from patient arrival to first provider contact. When providers close prior notes faster, they're available for the next patient sooner — directly reducing the front-end queue." },
    ] as EDMechanism[],
  },
  {
    domain: "WORKFORCE" as DomainName,
    tagline: "Clinician Wellbeing & Retention",
    problem: "ED clinicians chart after shifts, experience some of the highest burnout rates in medicine, and are among the most expensive providers to replace. Documentation burden is the most directly attributable and most Abridge-moveable driver of that burnout.",
    outcomes: [
      { label: "Clinician wellbeing", direction: "↑" as const },
      { label: "Voluntary turnover", direction: "↓" as const },
    ],
    mechanisms: [
      { label: "After-hours charting time (pajama time)", description: "Time spent charting after the shift ends. ED physicians average 45–90 minutes of unpaid post-shift documentation per shift. Abridge generates a draft while the encounter happens — the provider reviews and signs instead of writing from scratch." },
      { label: "Cognitive load during shift", description: "The mental overhead of knowing documentation is accumulating. When the note writes itself in real time, providers focus on the patient in front of them — not on what they'll need to reconstruct later." },
      { label: "Clinician satisfaction scores", description: "Validated instruments (Mini Z, ACEP surveys) consistently rank documentation burden as the #1 or #2 driver of ED physician burnout. This mechanism tracks whether that burden is actually dropping for Abridge users." },
    ] as EDMechanism[],
  },
  {
    domain: "REVENUE" as DomainName,
    tagline: "RVU Capture & Denial Prevention",
    problem: "ED revenue is highly sensitive to documentation quality. Overworked clinicians write abbreviated notes — meaning under-coded visits, missed billing elements, and delayed or denied claims. This is revenue earned but not collected.",
    outcomes: [
      { label: "wRVU per encounter", direction: "↑" as const },
      { label: "Medical necessity denials", direction: "↓" as const },
    ],
    mechanisms: [
      { label: "E/M level distribution (99281–99285)", description: "The five ED E/M levels. Under time pressure, providers default to mid-level codes even when complexity warrants higher. Ambient capture preserves the clinical reasoning that supports the appropriate code — so coders have what they need." },
      { label: "Charge lag", description: "Days from service to billing. Faster note completion means faster coding queue. Every day of lag is cash flow deferred — and late notes occasionally miss billing windows entirely." },
      { label: "Medical necessity denial rate", description: "Claims denied because documentation didn't justify the level of care. When the note captures the clinical reasoning verbalized during the encounter, payers have what they need to adjudicate the claim correctly the first time." },
    ] as EDMechanism[],
  },
  {
    domain: "QUALITY" as DomainName,
    tagline: "Clinical Documentation Integrity",
    problem: "Incomplete ED notes are a clinical and financial liability. They create CDI query loops, expose the organization in malpractice cases, and trigger penalties through Value-Based Purchasing and CMS quality measures.",
    outcomes: [
      { label: "CDI query volume", direction: "↓" as const },
      { label: "Quality penalty exposure", direction: "↓" as const },
    ],
    mechanisms: [
      { label: "CDI query volume on admissions", description: "How often CDI specialists send queries back to the attending to clarify the clinical picture for DRG coding. Better ED notes answer these questions before they're asked — reducing physician response time and accelerating billing." },
      { label: "HCAHPS Doctor Communication score", description: "The 'doctor listened carefully / explained things clearly' composite in value-based purchasing. Providers using ambient documentation spend less time at the keyboard and more time making eye contact — patients respond in surveys." },
      { label: "Sepsis bundle (SEP-1) documentation", description: "Real-time sepsis documentation captures the timing and sequence of clinical actions required for bundle compliance — improving both regulatory performance and downstream DRG accuracy for admitted patients." },
      { label: "Malpractice documentation exposure", description: "Incomplete documentation is the primary liability risk in retrospective review. A timestamped, verbatim note of clinical reasoning provides defensible documentation that memory-based charting after the fact often cannot." },
    ] as EDMechanism[],
  },
];

// ─── Metric Detail Data ───────────────────────────────────────────────────────

const domainDetails: DomainDetailData[] = [
  {
    domain: "CAPACITY",
    sectionTitle: "Capacity",
    sectionSubtitle: "Throughput and time",
    honestLimit: "This domain only moves if physician availability is your throughput bottleneck. If LWBS is driven by bed availability, nursing ratios, or ancillary wait times, faster documentation doesn't move the needle.",
    items: [
      {
        label: "Documentation Time Per Encounter",
        badge: "Signal",
        explanation: "",
        mechanism: "Ambient capture converts charting from a memory exercise after the patient leaves into a real-time drafting process. The physician reviews and edits a note that already exists by the time the patient leaves the room.",
        whyItMatters: "At 40,000–80,000 ED visits per year, 3 minutes saved per encounter = 2,000–4,000 physician hours annually. This is the prerequisite for all other capacity improvements.",
        whenToExpect: "Week 6–8 for active users. EHR session timestamps show exactly when charting happens — this is your cleanest early signal.",
        formula: "Minutes saved per encounter × annual ED visits / 60 = physician hours returned annually\n\nED default: 3 min saved/encounter (range 2–5 min)",
      },
      {
        label: "Door-to-Disposition Time",
        badge: "Trend",
        explanation: "",
        mechanism: "When documentation time drops, physicians complete each encounter faster and can begin the next sooner. This compresses the total length of stay from arrival to disposition decision.",
        whyItMatters: "Door-to-disposition is the ED's primary operational throughput metric — tracked in every morning huddle. A 10-minute reduction across 50,000 visits represents significant capacity recapture.",
        whenToExpect: "Month 2–3 in operational dashboards. Requires group-level adoption, not just early users, and needs to control for acuity mix and shift volume changes.",
        formula: "Average door-to-disposition time delta (minutes) × annual ED visits\n\nTrack same shift types, same months, year-over-year to control for seasonality.",
      },
      {
        label: "LWBS Rate",
        badge: "Proof",
        explanation: "",
        mechanism: "Faster documentation → faster throughput → shorter wait times → fewer patients leaving before being seen. This chain holds only when physician availability is the bottleneck.",
        whyItMatters: "Each LWBS patient represents ~$480 in lost revenue. At 2% on 50,000 visits, a 0.5pp reduction = ~$240,000 annually. LWBS is also a CMS-tracked metric with reputational implications.",
        whenToExpect: "Month 3–6 for a credible trend. Seasonal variation requires controlled year-over-year comparison.",
        formula: "(LWBS rate before − after, in pp) × annual ED visits × $480/visit × attribution %\n\nAttribution default: 25% (documentation is one of several throughput levers)",
        limit: "Only model this if your ED's bottleneck analysis points to physician availability, not beds or nursing.",
      },
      {
        label: "Door-to-Provider Time",
        badge: "Proof",
        explanation: "",
        mechanism: "When physicians close out notes faster, they become available for the next patient sooner. Door-to-provider time drops as documentation friction decreases.",
        whyItMatters: "Door-to-provider is a key driver of patient satisfaction and a leading indicator for LWBS. CMS tracks it as part of the ED throughput composite.",
        whenToExpect: "Month 3–6. Requires the same controlled comparison as LWBS — same months, same shift types.",
        formula: "Average door-to-provider time delta (minutes) — tracked in ED operational dashboard or EHR flow reports.",
      },
    ],
  },
  {
    domain: "WORKFORCE",
    sectionTitle: "Workforce",
    sectionSubtitle: "Clinician wellbeing and retention",
    honestLimit: "Documentation is one of many burnout drivers in the ED. Don't attribute all retention improvement to documentation — but do attribute the documentation-specific component, which is directly Abridge-moveable.",
    items: [
      {
        label: "After-Shift Charting Time",
        badge: "Signal",
        explanation: "",
        mechanism: "Abridge generates a drafted note by the time the patient leaves. The physician reviews and signs instead of writing from scratch after hours. A 25-minute post-shift note becomes a 5-minute review.",
        whyItMatters: "ED physicians average 45–90 minutes of unpaid after-shift charting per shift. When this drops, physicians notice immediately — and it's the most visceral, attributable improvement in their daily experience.",
        whenToExpect: "Week 4–8 for active users. Directly measurable in EHR audit logs: session time after scheduled shift end. No billing cycle, no survey cadence.",
        formula: "EHR session minutes after shift end — compare same providers before and after deployment.\n\nTarget: 50–70% reduction for consistent Abridge users.",
      },
      {
        label: "Clinician Satisfaction Score",
        badge: "Trend",
        explanation: "",
        mechanism: "When the primary mechanical cause of burnout — nightly charting — is removed, satisfaction scores respond. Track the documentation burden sub-question specifically, not just overall satisfaction.",
        whyItMatters: "Satisfaction scores are the 6–12 month leading indicator before turnover data appears. Moving this metric before turnover shows up is how you make the retention case proactively.",
        whenToExpect: "Month 2–4 for initial survey signal. Use validated instruments (Mini-Z, ACEP wellness survey, or Press Ganey provider engagement) on a quarterly cadence.",
        formula: "Documentation burden score delta (provider survey, 1–5 scale)\n\nIsolate documentation sub-question from overall satisfaction for Abridge attribution.",
      },
      {
        label: "Voluntary Physician Turnover",
        badge: "Proof",
        explanation: "",
        mechanism: "Documentation burden drives burnout. Burnout drives exit. When you remove the primary operational complaint — nightly charting, interrupted evenings — you remove a key reason physicians look elsewhere or reduce hours.",
        whyItMatters: "Replacing an ED physician costs $250,000–$500,000 fully loaded. An ED group with 10% turnover on 30 physicians replaces 3 per year. Preventing one additional departure can offset a year of Abridge costs.",
        whenToExpect: "Month 12–18 for statistically meaningful data. Use satisfaction and exit interview data as leading indicators — specifically documentation burden as a named reason for departure.",
        formula: "Turnovers avoided × blended replacement cost\n\nDefaults: replacement cost $250K–$500K, turnover 8–15%, documentation attribution 10–20%",
        limit: "Correlation between documentation burden and turnover is well-documented; individual causal attribution is not. Use as directional, not guaranteed.",
      },
    ],
  },
  {
    domain: "REVENUE",
    sectionTitle: "Revenue",
    sectionSubtitle: "Coding accuracy and denial prevention",
    honestLimit: "ED wRVU lift is lower than outpatient (2–4% vs 5–8%) because ED documentation workflows are already more structured. Use your observed E/M distribution data, not assumed percentages.",
    items: [
      {
        label: "E/M Level Distribution (99281–99285)",
        badge: "Trend",
        explanation: "",
        mechanism: "ED documentation under time pressure defaults to mid-level codes. Abridge captures the full clinical conversation — presenting complaint, exam findings, decision-making — so the note reflects what actually happened. Coders assign the code the complexity warrants.",
        whyItMatters: "A shift from Level 3 to Level 4 adds ~0.7 wRVU per visit. Across 40,000–80,000 annual ED visits, even a 2–4% distribution shift is meaningful annual revenue — on work the physician already did.",
        whenToExpect: "Month 2–3 for initial signal. Takes one full billing cycle (30–45 days encounter to payment) plus coding team adjustment before the aggregate distribution shift is clean.",
        formula: "wRVU delta per encounter × adopted encounters × $33.40/wRVU (CMS 2026) × realization %\n\nED baseline: 2.5 wRVU/encounter. Expected lift: 2–4%.",
      },
      {
        label: "Charge Lag (Time to Bill)",
        badge: "Signal",
        explanation: "",
        mechanism: "When notes are completed the same day — or same shift — the claim can be submitted without delay. After-shift backlogs mean some visits don't get a signed note for 24–48 hours, delaying the billing cycle.",
        whyItMatters: "Faster billing improves cash flow and reduces the risk of timely filing denials. RCM teams track days-to-bill directly.",
        whenToExpect: "Week 6–8. Same-day note completion rate is visible in EHR audit logs as soon as physicians are using Abridge consistently.",
        formula: "Average days from encounter to signed note — compare before/after.\n\nTarget: same-day note completion rate moving from X% to X+Y%.",
      },
      {
        label: "Medical Necessity Denial Rate",
        badge: "Proof",
        explanation: "",
        mechanism: "Medical necessity denials happen when the note doesn't show why the level of care was warranted. Abridge captures clinical reasoning physicians verbalize but rarely write — severity of symptoms, decision tree, alternatives considered. That reasoning at time of service is what payers need.",
        whyItMatters: "A 1pp reduction in documentation-related denial rate on 50,000 visits at ~$500 average denial cost = ~$250,000 in recovered revenue. These denials are entirely preventable.",
        whenToExpect: "Month 3–6 for RCM signal. Needs 90+ days of claims volume to show a statistically meaningful trend. Track documentation-specific denials separately.",
        formula: "(Denial rate before − after, in pp) × annual encounters × avg denial cost × attribution %\n\nED default: $500 per denied encounter",
        limit: "Track documentation-related denials separately from coverage, eligibility, and authorization denials — Abridge only moves the documentation bucket.",
      },
    ],
  },
  {
    domain: "QUALITY",
    sectionTitle: "Quality",
    sectionSubtitle: "Clinical documentation integrity",
    honestLimit: "CDI query reduction on admits is the cleanest quality signal from the ED. DRG impact on admitted patients is quantified in the Inpatient methodology to prevent double-counting.",
    items: [
      {
        label: "CDI Query Volume on Admits",
        badge: "Signal",
        explanation: "",
        mechanism: "Ambient documentation captures presenting conditions, comorbidities, and clinical reasoning as they're verbalized. CDI specialists receive documentation that already answers their questions — reducing the need to send a query back to the attending.",
        whyItMatters: "Each CDI query requires 15–30 minutes of physician response time and delays the billing cycle for that case. CDI departments track query rate monthly — before/after comparison is fast and clean.",
        whenToExpect: "Month 2–3 after consistent adoption on admits. CDI teams review notes continuously — pattern visible within 1–2 billing cycles.",
        formula: "Admissions × query rate reduction % × physician response time per query\n\nTracked directly by your CDI department — no modeling required.",
      },
      {
        label: "HCAHPS Doctor Communication Score",
        badge: "Trend",
        explanation: "",
        mechanism: "Physicians using ambient documentation spend less time on a screen and more time making eye contact. When the note is writing itself, the physician is fully present — patients notice and respond in surveys.",
        whyItMatters: "HCAHPS Doctor Communication affects CMS Value-Based Purchasing — 2% of Medicare base payments are at risk. A 1–2 point improvement in the composite can shift a hospital from penalty zone to neutral or positive.",
        whenToExpect: "Month 3–6 for survey signal. HCAHPS reported quarterly — needs 2–3 cycles. Isolate 'doctor listened carefully' and 'doctor explained things clearly' specifically.",
        formula: "HCAHPS domain composite score delta × Medicare inpatient volume × VBP multiplier\n\nVBP penalty/bonus ranges −2% to +2% of Medicare base DRG payments.",
      },
      {
        label: "Sepsis Bundle Documentation (SEP-1)",
        badge: "Proof",
        explanation: "",
        mechanism: "Sepsis bundle compliance requires complete, timestamped documentation of clinical reasoning, assessment findings, and interventions. Ambient documentation captures this in real time rather than from memory after the critical window.",
        whyItMatters: "SEP-1 is a CMS-reported quality measure. Non-compliance affects quality scores, star ratings, and can contribute to VBP penalties. Incomplete sepsis documentation is a documented factor in malpractice cases.",
        whenToExpect: "Month 3–6. Quality measure reporting lags clinical care — needs a full quarter of data to show a trend.",
        formula: "SEP-1 compliance rate delta (%) — tracked by quality department.\n\nNote: attribution to documentation specifically requires controlling for protocol adherence and staffing changes.",
        limit: "SEP-1 compliance is multi-factorial — documentation is necessary but not sufficient. Track as a quality signal, not a standalone Abridge-attributable outcome.",
      },
    ],
  },
];

// ─── ED Domain Card ───────────────────────────────────────────────────────────

function EDDomainCard({
  data,
  detailData,
  isExpanded,
  onToggle,
}: {
  data: typeof edDomainMethodology[0];
  detailData: DomainDetailData | undefined;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const color = domainColors[data.domain];
  const [expandedMechanism, setExpandedMechanism] = useState<string | null>(null);

  return (
    <div className="rounded-lg overflow-hidden border border-[#E5E5E5] mb-4 bg-white shadow-sm">
      <div className="bg-[#1A1A1A] px-7 py-6 flex items-start justify-between gap-6">
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[2.5px] mb-2 text-[#EA2C00]">
            {data.domain}
          </p>
          <h3 className="text-[22px] font-bold text-white leading-tight tracking-tight">{data.tagline}</h3>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2 mt-1">
          {data.outcomes.map((o) => (
            <div
              key={o.label}
              className="flex items-center gap-2 bg-white/8 border border-white/15 rounded-sm px-3 py-1.5"
            >
              <span className="text-white/80 text-[12px] font-medium">{o.label}</span>
              <span className="text-[14px] font-bold" style={{ color }}>{o.direction}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white px-7 pt-5 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#AAAAAA] mb-2">The Problem</p>
        <p className="text-[14px] text-[#444444] leading-relaxed">{data.problem}</p>
      </div>

      <div className="bg-white px-7 pb-5 pt-1">
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#AAAAAA] mb-3">Value Mechanisms</p>
        <div className="space-y-0">
          {data.mechanisms.map((mechanism) => (
            <div key={mechanism.label} className="border-b border-[#F2EDE8] last:border-b-0">
              <button
                onClick={() => setExpandedMechanism(expandedMechanism === mechanism.label ? null : mechanism.label)}
                className="w-full flex items-center gap-3 py-2.5 text-left group"
                data-testid={`button-mechanism-${data.domain.toLowerCase()}-${mechanism.label.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <div
                  className="w-[3px] h-4 rounded-full shrink-0 transition-opacity"
                  style={{ backgroundColor: '#EA2C00', opacity: expandedMechanism === mechanism.label ? 1 : 0.4 }}
                />
                <span className="flex-1 text-[13px] text-[#333333] font-medium group-hover:text-black transition-colors">
                  {mechanism.label}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#AAAAAA] transition-transform shrink-0 ${expandedMechanism === mechanism.label ? 'rotate-180' : ''}`}
                />
              </button>
              {expandedMechanism === mechanism.label && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pb-3 pl-6 pr-2"
                >
                  <p className="text-[12px] text-[#666666] leading-relaxed border-l-2 border-[#EA2C00]/30 pl-3">
                    {mechanism.description}
                  </p>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div
        onClick={onToggle}
        className="bg-[#F5F0EB] px-7 py-4 border-t border-[#EDE8E2] flex items-center justify-between cursor-pointer"
        data-testid={`button-toggle-domain-${data.domain.toLowerCase()}`}
      >
        <span className="text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color }}>
          {isExpanded ? "Hide the metrics" : "Explore the metrics →"}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" style={{ color }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color }} />
        )}
      </div>

      {isExpanded && detailData && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="bg-[#F5F0EB] px-7 pb-7 pt-4">
            <div className="space-y-3">
              {detailData.honestLimit && (
                <div className="border-l-2 border-[#EA2C00] pl-4 py-2 bg-white rounded-sm">
                  <p className="text-[10px] font-semibold text-[#EA2C00] mb-1">Honest limit</p>
                  <p className="text-xs text-[#666666] leading-relaxed">{detailData.honestLimit}</p>
                </div>
              )}
              {detailData.items.map((item) => (
                <DomainImpactCard key={item.label} item={item} accentColor={color} />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── ED Domain Methodology Section ───────────────────────────────────────────

function EDDomainMethodologySection() {
  const [expandedDomain, setExpandedDomain] = useState<DomainName | null>(null);

  return (
    <div className="mb-10">
      <div className="mb-6 pb-3 border-b-2 border-[#EA2C00]">
        <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#888888] mb-2">Methodology</p>
        <h2 className="text-[24px] font-bold text-black tracking-tight">Understanding the Value</h2>
        <p className="text-sm text-[#888888] mt-1">
          Four domains. Each has a distinct problem, a set of mechanisms, and a measurement path. Start with whichever matters most to your organization.
        </p>
      </div>
      <div className="space-y-4">
        {edDomainMethodology.map((domain) => {
          const detailData = domainDetails.find((d) => d.domain === domain.domain);
          const isExpanded = expandedDomain === domain.domain;
          return (
            <EDDomainCard
              key={domain.domain}
              data={domain}
              detailData={detailData}
              isExpanded={isExpanded}
              onToggle={() => setExpandedDomain(isExpanded ? null : domain.domain)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── ED Adoption Section ──────────────────────────────────────────────────────

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

// ─── ED Value Arc Section ─────────────────────────────────────────────────────

function EDValueArcSection() {
  const stages = [
    {
      badge: "Signal" as BadgeType,
      timing: "Week 6–8",
      title: "The Provider Feels It",
      domains: ["WORKFORCE", "CAPACITY"] as DomainName[],
      description: "After-shift charting drops. Documentation time per encounter measurably shorter. Visible in EHR audit logs before any aggregate data moves.",
    },
    {
      badge: "Trend" as BadgeType,
      timing: "Month 2–3",
      title: "The Chart Shows It",
      domains: ["REVENUE", "QUALITY"] as DomainName[],
      description: "E/M level distribution shifts in claims data. CDI query rates on admits drop. One full billing cycle required before the aggregate signal is clean.",
    },
    {
      badge: "Proof" as BadgeType,
      timing: "Month 3–18",
      title: "The System Measures It",
      domains: ["CAPACITY", "REVENUE", "WORKFORCE", "QUALITY"] as DomainName[],
      description: "LWBS, denial rates, HCAHPS, physician retention. Downstream of documentation maturity — requires controlled comparisons for statistical credibility.",
    },
  ];

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
          const cellBg =
            stage.badge === "Signal" ? "bg-white" : stage.badge === "Trend" ? "bg-[#F9F7F5]" : "bg-[#F5F0EB]";
          const chipStyles: Record<DomainName, string> = {
            CAPACITY: "bg-[#F0EEEC] text-[#888888]",
            WORKFORCE: "bg-[#EDECEB] text-[#555555]",
            REVENUE: "bg-[#FFF0EC] text-[#EA2C00]",
            QUALITY: "bg-[#E8E8E8] text-[#1A1A1A]",
          };
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
                  <span
                    key={d}
                    className={`rounded-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${chipStyles[d]}`}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MethodologyED({ onBack, onNavigateToSetting }: MethodologyEDProps) {
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
        <div className="max-w-[800px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center cursor-pointer bg-transparent border-none p-0" data-testid="link-home-logo">
              <img src={abridgeLogo} alt="Abridge" className="h-5 md:h-6" />
            </button>
            <span className="text-[#E5E5E5]">|</span>
            <button onClick={onBack} className="flex items-center gap-1 text-[#666666] hover:text-black transition-colors" data-testid="button-back">
              <ArrowLeft className="w-3 h-3" />
              <span className="text-xs font-medium uppercase tracking-wide">Methodology</span>
            </button>
          </div>
          <button onClick={handleExportPDF} disabled={isExporting} className="flex items-center gap-2 text-[#666666] hover:text-black transition-colors text-sm disabled:opacity-50" data-testid="button-export-pdf">
            <Download className="w-4 h-4" />
            <span>{isExporting ? "Exporting..." : "Export PDF"}</span>
          </button>
        </div>
      </header>

      <div className="max-w-[800px] mx-auto px-6 py-12">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#EA2C00] mb-4">Emergency Department</p>
          <h1 className="text-[32px] md:text-[40px] font-bold text-black leading-tight tracking-tight mb-4">
            How We Think<br />About Value
          </h1>
          <p className="text-[15px] text-[#666666] max-w-[500px] mx-auto leading-relaxed">
            A guided framework for building a defensible ROI case with your emergency department leadership team.
          </p>
        </motion.div>

        <EDDomainMethodologySection />

        <EDAdoptionSection />

        <EDValueArcSection />

        <div className="mt-12 mb-10">
          <div className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[2.5px] text-[#888888] mb-2">Methodology Reference</p>
            <h2 className="text-[24px] font-bold text-black tracking-tight">The Full Framework</h2>
            <p className="text-[14px] text-[#888888] mt-1.5">Formulas, assumptions, and honest limits — for the scrutinizers in the room.</p>
          </div>
          <div className="divide-y divide-[#E5E5E5] border border-[#E5E5E5] rounded-lg overflow-hidden">
            <div className="px-6">
            <CollapsibleSection sectionId="what-goes-in" title="What Goes Into the Number" subtitle="Exactly what the calculator uses — and what it doesn't">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#D1D5DB]">
                      <th className="text-left py-3 font-semibold text-black">Value Driver</th>
                      <th className="text-left py-3 font-semibold text-black">In the Calculator?</th>
                      <th className="text-left py-3 font-semibold text-black">Formula</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#666666]">
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#888888', borderColor: '#888888' }}>Capacity</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">LWBS reduction</td><td className="py-3">✅ Yes</td><td className="py-3">LWBS pp delta × annual visits × $480/visit</td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">Admission capture from LWBS recovery</td><td className="py-3">✅ Yes (if LWBS data provided)</td><td className="py-3">Recovered patients × admission rate × avg DRG revenue</td></tr>
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#EA2C00', borderColor: '#EA2C00' }}>Revenue</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">wRVU / E/M lift</td><td className="py-3">✅ Yes</td><td className="py-3">wRVU delta × adopted encounters × $33.40/wRVU</td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">Denial rate reduction</td><td className="py-3">✅ Yes</td><td className="py-3">Denial pp delta × encounters × $500/encounter</td></tr>
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#555555', borderColor: '#555555' }}>Workforce</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">ED physician retention</td><td className="py-3">✅ Yes (if survey data provided)</td><td className="py-3">Turnovers avoided × $250K–$500K</td></tr>
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#1A1A1A', borderColor: '#1A1A1A' }}>Quality</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">CDI / DRG impact on admitted patients</td><td className="py-3 text-[#F59E0B] font-medium">Not here — see Inpatient</td><td className="py-3">Captured in CMI delta calculation</td></tr>
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>

            </div>
            <div className="px-6">
            <CollapsibleSection sectionId="assumptions" title="The Assumptions" subtitle="ED-specific defaults and ranges">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#D1D5DB]">
                      <th className="text-left py-3 font-semibold text-black">Assumption</th>
                      <th className="text-left py-3 font-semibold text-black">Range</th>
                      <th className="text-left py-3 font-semibold text-black">Default</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#666666]">
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#888888', borderColor: '#888888' }}>Capacity</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">Time saved per encounter</td><td className="py-3">2–5 min</td><td className="py-3">3 min</td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">LWBS rate</td><td className="py-3">2–4%</td><td className="py-3">3%</td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">Avg ED visit revenue</td><td className="py-3">$400–$600</td><td className="py-3">$480</td></tr>
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#EA2C00', borderColor: '#EA2C00' }}>Revenue</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">ED wRVU baseline</td><td className="py-3">2.0–3.0</td><td className="py-3">2.5</td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">wRVU lift %</td><td className="py-3">2–4%</td><td className="py-3">3%</td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">Avg denied claim cost</td><td className="py-3">$350–$650</td><td className="py-3">$500</td></tr>
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#555555', borderColor: '#555555' }}>Workforce</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">Physician replacement cost</td><td className="py-3">$250K–$500K</td><td className="py-3">$350K</td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">Annual turnover rate</td><td className="py-3">8–15%</td><td className="py-3">10%</td></tr>
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>

            </div>
            <div className="px-6">
            <CollapsibleSection sectionId="honest-limits" title="The Honest Limits" subtitle="What we can prove, what we can support, and what we can only enable">
              <div className="space-y-4">
                <div className="bg-white border border-[#E5E5E5] rounded-sm p-5">
                  <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#22C55E] rounded-full" /><h4 className="font-semibold text-black text-sm">We Can Measure This</h4></div>
                  <ul className="text-sm text-[#666666] space-y-2 ml-5 list-disc">
                    <li><strong>Documentation time per encounter:</strong> EHR timestamps. Visible in weeks.</li>
                    <li><strong>E/M level distribution:</strong> Claims data shows coding accuracy shifts.</li>
                    <li><strong>Denial rates by root cause:</strong> RCM data, documentation-specific bucket.</li>
                    <li><strong>After-shift charting time:</strong> EHR audit logs after shift end.</li>
                  </ul>
                </div>
                <div className="bg-white border border-[#E5E5E5] rounded-sm p-5">
                  <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#F59E0B] rounded-full" /><h4 className="font-semibold text-black text-sm">We Can Influence This</h4></div>
                  <ul className="text-sm text-[#666666] space-y-2 ml-5 list-disc">
                    <li><strong>Throughput and door times:</strong> Documentation is one input. Staffing, beds, and triage protocols all matter.</li>
                    <li><strong>LWBS rate:</strong> Only moves if physician availability is the constraint.</li>
                    <li><strong>HCAHPS scores:</strong> Eye contact and presence improve with ambient — but documentation is one of many factors.</li>
                  </ul>
                </div>
                <div className="bg-white border border-[#E5E5E5] rounded-sm p-5">
                  <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#EF4444] rounded-full" /><h4 className="font-semibold text-black text-sm">We Can Only Enable This</h4></div>
                  <ul className="text-sm text-[#666666] space-y-2 ml-5 list-disc">
                    <li><strong>DRG impact on admitted patients:</strong> ED documentation influences but doesn't determine inpatient DRG. See Inpatient methodology.</li>
                    <li><strong>Retention:</strong> Documentation burden is one of many ED burnout drivers. Impact takes 12–18 months.</li>
                  </ul>
                </div>
                <div className="bg-white rounded-sm p-5 border-l-2 border-[#EA2C00]">
                  <p className="text-sm text-[#666666] leading-relaxed"><strong className="text-black">Our philosophy:</strong> We'd rather show you a smaller number you can defend in an ED leadership meeting than a larger number that falls apart when your CFO asks "how did you attribute that?"</p>
                </div>
              </div>
            </CollapsibleSection>
            </div>
          </div>
        </div>

        <motion.div className="mt-4 mb-10 bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] rounded-lg p-8 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="text-xl font-bold text-white mb-2">Ready to Build Your Model?</h3>
          <p className="text-[#999999] mb-6 text-sm">Use these methodology principles to create a customized ROI model for your emergency department.</p>
          <button onClick={onBack} className="inline-flex items-center gap-2 bg-[#EA2C00] hover:bg-[#D12600] text-white font-medium px-6 py-3 rounded-lg transition-colors" data-testid="button-build-model">
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
