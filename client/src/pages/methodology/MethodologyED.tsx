import { motion } from "framer-motion";
import { ArrowLeft, Download, ArrowRight, Stethoscope, Building2, Heart, Loader2 } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { generateMethodologyPDF } from "@/lib/methodology-pdf-export";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';
import {
  DomainTabExplorer,
  CollapsibleSection,
  ValueAccrualSection,
  type DomainCardData,
  type DomainDetailData,
  type DomainName,
  type QualitativeSignal,
  type ValueAccrualStage,
} from "@/components/methodology/MethodologyShared";

interface MethodologyEDProps {
  onBack: () => void;
  onNavigateToSetting?: (setting: string) => void;
}

const overviewCards: DomainCardData[] = [
  {
    domain: "QUALITY",
    description: "Documentation accuracy under pressure — capturing complexity that determines CDI query rate, E/M level accuracy, and clinical defensibility. The first domain where Abridge's impact becomes measurable.",
    items: [
      { label: "CDI query volume on admits", badge: "Signal" },
      { label: "HCAHPS doctor communication score", badge: "Trend" },
    ],
  },
  {
    domain: "WORKFORCE",
    description: "Physician burnout and turnover are the ED's slow bleed — documentation burden is the most attributable and most Abridge-moveable contributor.",
    items: [
      { label: "After-shift charting time", badge: "Signal" },
      { label: "Physician retention savings", badge: "Trend" },
    ],
  },
  {
    domain: "CAPACITY",
    description: "Throughput is the ED's operating system. Faster documentation is one lever — the right lever only when physician availability is the bottleneck.",
    items: [
      { label: "Documentation time per encounter", badge: "Signal" },
      { label: "LWBS rate", badge: "Trend" },
    ],
  },
  {
    domain: "REVENUE",
    description: "ED coding is the most audit-vulnerable setting. Every surge creates under-documented complexity. Two drivers with direct RCM measurement paths.",
    items: [
      { label: "E/M level accuracy (claims data)", badge: "Trend" },
      { label: "Denial prevention (RCM root cause)", badge: "Signal" },
    ],
  },
];

const domainDetails: DomainDetailData[] = [
  {
    domain: "QUALITY",
    sectionTitle: "Quality",
    sectionSubtitle: "Documentation accuracy under surge — the first place Abridge's impact becomes measurable",
    honestLimit: "CDI query reduction on admits is the cleanest quality signal from the ED. DRG impact on admitted patients is quantified in the Inpatient methodology to prevent double-counting.",
    items: [
      {
        label: "CDI Query Volume on Admits",
        badge: "Signal",
        explanation: "",
        mechanism: "Ambient documentation captures presenting conditions, comorbidities, and clinical reasoning as they're verbalized during the encounter. CDI specialists working admitted cases receive documentation that already answers their questions — reducing the need to send a query back to the attending.",
        whyItMatters: "Each CDI query requires 15–30 minutes of physician response time and delays the billing cycle for that case. CDI departments track query rate monthly — before/after comparison is fast and clean. A 20% reduction on admitted patients represents meaningful physician hours returned each week.",
        whenToExpect: "Month 2–3 after consistent adoption on admits. CDI teams review notes continuously — the pattern becomes visible within 1–2 billing cycles. This is your earliest cross-departmental signal that documentation quality is improving.",
        formula: "Admissions × query rate reduction % × physician response time per query\n\nTracked directly by your CDI department — no modeling required.",
      },
      {
        label: "HCAHPS Doctor Communication Score",
        badge: "Trend",
        explanation: "",
        mechanism: "Physicians using ambient documentation spend less time looking at a screen and more time making eye contact with the patient. When the note is writing itself, the physician can be fully present in the conversation — patients notice, and they respond in surveys.",
        whyItMatters: "HCAHPS Doctor Communication is one of five domains in Value-Based Purchasing. CMS puts 2% of Medicare inpatient payments at risk based in part on these scores. A 1–2 point improvement in the composite can shift a hospital from the penalty zone to neutral or positive territory.",
        whenToExpect: "Month 3–6 for survey signal. HCAHPS is reported quarterly — needs 2–3 survey cycles before a meaningful trend is visible. Isolate 'doctor listened carefully' and 'doctor explained things clearly' specifically, not just the overall composite.",
        formula: "HCAHPS domain composite score delta × Medicare inpatient volume × VBP multiplier\n\nVBP penalty/bonus ranges from -2% to +2% of Medicare base DRG payments.",
      },
    ],
  },
  {
    domain: "WORKFORCE",
    sectionTitle: "Workforce",
    sectionSubtitle: "The physician experience — the most visceral and most measurable Abridge impact in the ED",
    honestLimit: "Documentation is one of many burnout drivers in the ED. Don't attribute all retention improvement to documentation — but do attribute the documentation-specific change, which is directly Abridge-moveable.",
    items: [
      {
        label: "After-Shift Charting Time",
        badge: "Signal",
        explanation: "",
        mechanism: "Abridge generates a drafted note by the time the patient leaves. The physician reviews and signs instead of writing from scratch after hours. The note that used to take 20–30 minutes at midnight takes 5 minutes to review.",
        whyItMatters: "ED physicians average 45–90 minutes of unpaid after-shift charting per shift. This is the most visceral metric for physician buy-in — when this number drops, physicians notice immediately and talk about it. EHR session data after shift end is directly measurable without a survey.",
        whenToExpect: "Week 4–8 for active users. Among the fastest metrics to show change because it's a direct behavioral outcome with no lag — no billing cycle, no coding team, no survey cycle. Track in EHR audit logs: session time after scheduled shift end.",
        formula: "Minutes of after-shift EHR session time per provider per shift — compare same providers pre/post deployment.\n\nTarget: visible reduction in Week 4–8 for consistent users.",
      },
      {
        label: "Physician Retention Savings",
        badge: "Trend",
        explanation: "",
        mechanism: "Documentation burden is consistently cited in ACEP surveys and Medscape reports as a top driver of ED physician burnout. When you remove the primary mechanical cause — the act of writing — you address the underlying driver, not a symptom. Physicians who feel the work is sustainable are the ones who stay.",
        whyItMatters: "Replacing an ED physician costs $250,000–$500,000 fully loaded — recruitment, credentialing, locum coverage during the gap, productivity ramp. An ED group running 10% annual turnover on 30 physicians replaces 3 physicians per year. Preventing one additional departure can offset a full year of Abridge costs.",
        whenToExpect: "Month 12–18 for statistically meaningful data. Turnover is a lagging indicator. Track satisfaction scores and exit interview data as the leading indicators — specifically documentation burden as a sub-question, not just overall satisfaction.",
        formula: "Turnovers avoided × blended replacement cost\n\nDefaults: replacement cost $250K–$500K, turnover rate 8–15%, documentation attribution 10–20%",
        limit: "Correlation between documentation burden and turnover is well-documented; individual causal attribution is not. Use as a directional estimate, not a guarantee.",
      },
    ],
  },
  {
    domain: "CAPACITY",
    sectionTitle: "Capacity",
    sectionSubtitle: "Throughput and time — documentation speed is one input; physician bottleneck is the prerequisite",
    honestLimit: "This domain only moves if physician availability is your throughput bottleneck. If LWBS is driven by bed availability, nursing ratios, or ancillary wait times, faster documentation doesn't move the needle. We make this explicit so you set expectations correctly with your ED leadership before presenting these numbers.",
    items: [
      {
        label: "Documentation Time Per Encounter",
        badge: "Signal",
        explanation: "",
        mechanism: "Ambient capture converts charting from a memory exercise after the patient leaves into a real-time drafting process. Instead of reconstructing an encounter from mental notes, the physician reviews and edits a draft that already exists by the time the patient leaves the room.",
        whyItMatters: "At 40,000–80,000 ED visits per year, 3 minutes saved per encounter = 2,000–4,000 physician hours annually. This is the prerequisite for all other capacity improvements — if documentation time doesn't move, throughput and LWBS won't move either.",
        whenToExpect: "Week 6–8 for active users. EHR session timestamps show exactly when charting happens — this is your cleanest early signal and typically among the first metrics that move in deployment data.",
        formula: "Minutes saved per encounter × annual ED visits / 60 = estimated physician hours returned annually\n\nED default: 3 min saved/encounter (range 2–5 min)",
      },
      {
        label: "LWBS Rate",
        badge: "Trend",
        explanation: "",
        mechanism: "When physician documentation time drops, physicians can begin the next encounter sooner. In EDs where physician availability — not bed availability — is the throughput bottleneck, faster documentation directly reduces door-to-provider time, which directly reduces LWBS.",
        whyItMatters: "Each LWBS patient represents approximately $480 in lost revenue. At a 2% LWBS rate on 50,000 visits, a 0.5 percentage point reduction = ~$240,000 in recovered revenue annually. LWBS is also a CMS-tracked metric with reputational and regulatory implications.",
        whenToExpect: "Month 3–6 for a credible trend. Requires group-level behavior change, not just a few early adopters. Seasonal variation means you need a controlled year-over-year comparison — same months, same staffing context — to isolate the documentation signal.",
        formula: "(LWBS rate before − LWBS rate after, in pp) × annual ED visits × $480/visit × attribution %\n\nAttribution default: 25% (documentation is one of several throughput levers)",
        limit: "Only activate this driver if your ED's throughput analysis shows physician availability — not beds, nursing ratios, or ancillary services — as the primary LWBS driver.",
      },
    ],
  },
  {
    domain: "REVENUE",
    sectionTitle: "Revenue",
    sectionSubtitle: "Coding accuracy and denial prevention — the ED's most auditable, defensible revenue domain",
    honestLimit: "ED wRVU lift is lower than outpatient (2–4% vs 5–8%) because ED documentation workflows are already more structured. Use your observed E/M distribution data, not assumed percentages, for any number you'll defend with RCM.",
    items: [
      {
        label: "E/M Level Accuracy",
        badge: "Trend",
        explanation: "",
        mechanism: "ED documentation under time pressure tends toward default mid-level codes. Abridge captures the full clinical conversation — the presenting complaint, the exam findings, the decision-making — so the note reflects what actually happened, not what could be recalled and typed in 3 minutes. Coders see complete documentation and assign the code the complexity warrants.",
        whyItMatters: "Every ED visit is billed at an E/M level. A shift from Level 3 to Level 4 on high-complexity encounters adds ~0.7 wRVU per visit. Across 40,000–80,000 annual ED visits, even a 2–4% shift in distribution is meaningful annual revenue — on work the physician already did.",
        whenToExpect: "Month 2–3 for initial signal. The improved note exists immediately, but it takes one full billing cycle (30–45 days from encounter to payment) plus coding team adjustment before the aggregate distribution shift is clean. Plan for 2–3 billing cycles before comparing distributions.",
        formula: "wRVU delta × adopted encounters × $33.40/wRVU (CMS 2026) × attribution % × realization %\n\nED baseline: 2.5 wRVU/encounter. Expected lift: 2–4%.",
      },
      {
        label: "Denial Prevention (Documentation-Related)",
        badge: "Signal",
        explanation: "",
        mechanism: "Medical necessity denials happen when the note doesn't show why the level of care was warranted. Abridge captures clinical reasoning that physicians verbalize but rarely have time to write — the severity of symptoms, the decision tree, the alternatives considered. That reasoning, preserved in the note at time of service, is what payers need to adjudicate the claim.",
        whyItMatters: "A 1 percentage point reduction in documentation-related denial rate on 50,000 visits at ~$500 average denial cost = ~$250,000 in recovered revenue annually. Documentation-related denials are entirely preventable — they represent revenue earned but not collected.",
        whenToExpect: "Month 3–6 for RCM signal. Denial root-cause data requires 90+ days of claims volume to show a statistically meaningful trend. Track documentation-specific denial rate separately — RCM teams can pull this breakdown by denial reason code.",
        formula: "(Denial rate before − after, in pp) × annual encounters × avg denial cost per encounter × attribution %\n\nED default: $500 per denied encounter",
        limit: "Track documentation-related denials separately from coverage, eligibility, and authorization denials — Abridge only moves the documentation-related bucket.",
      },
    ],
  },
];

const qualitativeSignals: Partial<Record<DomainName, QualitativeSignal[]>> = {
  QUALITY: [
    {
      label: "Admission Hand-Off Completeness",
      tagline: "When the ED admits, the inpatient team starts from the ED note — completeness shows up in CDI query rates downstream",
      howToTrack: "Audit a sample of ED-to-inpatient handoffs for SBAR completeness, presenting condition specificity, and disposition reasoning. Pair with hospitalist satisfaction surveys. Signal within 60–90 days.",
      badge: "Trend",
    },
    {
      label: "ED Patient Experience (Press Ganey)",
      tagline: "Less keyboard time = more eye contact — patients notice when the physician is fully present",
      howToTrack: "Press Ganey ED survey reported quarterly. Isolate 'Doctor explained things clearly' and 'Doctor listened carefully' items. Tied directly to ED HCAHPS and value-based contract performance.",
      badge: "Trend",
    },
  ],
  WORKFORCE: [
    {
      label: "Provider Burnout Survey Score",
      tagline: "Is documentation burden still cited as a top driver in ED-specific burnout assessments?",
      howToTrack: "Press Ganey provider engagement, ACEP wellness surveys, or internal pulse surveys. Track documentation burden specifically as a sub-question among Abridge users. 2–3 month cadence to see initial signal.",
      badge: "Trend",
    },
    {
      label: "Locum Utilization Trend",
      tagline: "Locum coverage often spikes when retention dips — track the leading indicator",
      howToTrack: "Schedule data and locum agency invoices. Track locum hours and spend per month vs. baseline. Useful as a corroborating retention indicator at 12+ months.",
      badge: "Trend",
    },
  ],
  CAPACITY: [
    {
      label: "End-of-Shift Note Completion Rate",
      tagline: "% of notes signed before clock-out — a clean signal for same-shift documentation",
      howToTrack: "EHR audit logs: % of encounters with a signed note by end of shift. Often the most dramatic early metric in the ED — sometimes moves within the first two weeks of consistent use.",
      badge: "Signal",
    },
    {
      label: "Door-to-Provider Time",
      tagline: "Front-end throughput — affected by triage, staffing, and documentation flow",
      howToTrack: "ED operational dashboard tracked monthly. Documentation is one input — control for staffing and acuity changes when interpreting the trend. More meaningful after 6+ months of data.",
      badge: "Trend",
    },
  ],
  REVENUE: [
    {
      label: "Down-Coding Rate",
      tagline: "% of ED encounters coded below the level supported by the actual visit complexity",
      howToTrack: "Coding team audit. Pull % of encounters down-coded due to documentation gaps. Compare same providers, same shift types. Directly responsive to documentation completeness — Abridge-moveable signal.",
      badge: "Signal",
    },
    {
      label: "Admission Capture (Downstream of LWBS)",
      tagline: "Of patients recovered from LWBS, some require inpatient admission — converting lost ED visits into DRG revenue",
      howToTrack: "Only track if LWBS recovery is already being measured. Recovered LWBS patients × historical admission rate × avg admission revenue. Don't compound two estimates without real LWBS data.",
      badge: "Trend",
    },
  ],
};

const edValueAccrualStages: ValueAccrualStage[] = [
  {
    badge: "Signal",
    timing: "Week 6–8",
    title: "The Provider Feels It",
    description: "After-shift charting drops. Documentation time per encounter measurably shorter in EHR audit logs. Individual providers using Abridge consistently are your first observable signal — visible before any aggregate data moves.",
  },
  {
    badge: "Trend",
    timing: "Month 2–3",
    title: "The Chart Shows It",
    description: "E/M level distribution starts to shift in claims data. CDI query rates on admitted patients start to drop. These require one full billing cycle to become visible — the note improves immediately, but coding and CDI response take time.",
  },
  {
    badge: "Proof",
    timing: "Month 3–18",
    title: "The System Measures It",
    description: "LWBS rate trend, denial rate by root cause, HCAHPS doctor communication composite, and eventually turnover data. Downstream of documentation maturity — requires data volume and controlled comparisons for statistical credibility.",
  },
];

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
          <button onClick={handleExportPDF} disabled={isExporting} className="flex items-center gap-2 text-[#666666] hover:text-black transition-colors text-sm disabled:opacity-50" 
data-testid="button-export-pdf">
            <Download className="w-4 h-4" />
            <span>{isExporting ? "Exporting..." : "Export PDF"}</span>
          </button>
        </div>
      </header>

      <div className="max-w-[800px] mx-auto px-6 py-12">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-3 uppercase tracking-tight">Emergency Department: How Value Accrues</h1>
          <p className="text-base text-[#666666]">What changes in your ED with ambient documentation — and when. Built for CFO scrutiny.</p>
        </motion.div>

        <ValueAccrualSection stages={edValueAccrualStages} />

        <div className="mb-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-[#E5E5E5]" />
          <span className="text-[10px] font-bold uppercase tracking-[2px] text-[#888888] whitespace-nowrap">Four Domains</span>
          <div className="flex-1 h-px bg-[#E5E5E5]" />
        </div>

        <DomainTabExplorer
          hideOverviewGrid={true}
          cards={overviewCards}
          domainDetails={domainDetails}
          qualitativeByDomain={qualitativeSignals}
        >
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
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#1A1A1A', borderColor: '#1A1A1A' }}>Quality</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">CDI / DRG impact on admitted patients</td><td className="py-3 text-[#F59E0B] font-medium">Not here — see Inpatient</td><td
 className="py-3">Captured in CMI delta calculation</td></tr>
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#888888', borderColor: '#888888' }}>Capacity</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">LWBS reduction</td><td className="py-3">✅ Yes</td><td className="py-3">LWBS pp delta × annual visits ×
$480/visit</td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">Admission capture from LWBS recovery</td><td className="py-3">✅ Yes (if LWBS data provided)</td><td 
className="py-3">Recovered patients × admission rate × avg DRG revenue</td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">After-hours time savings</td><td className="py-3 text-[#F59E0B] font-medium">Signal only — not monetized</td><td 
className="py-3">Tracked as hours (salaried providers)</td></tr>
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#EA2C00', borderColor: '#EA2C00' }}>Revenue</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">wRVU / E/M lift</td><td className="py-3">✅ Yes</td><td className="py-3">wRVU delta × adopted encounters ×
$33/wRVU</td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">Denial rate reduction</td><td className="py-3">✅ Yes</td><td className="py-3">Denial pp delta × encounters ×
$500/encounter</td></tr>
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#555555', borderColor: '#555555' }}>Workforce</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">ED physician retention</td><td className="py-3">✅ Yes (if survey data provided)</td><td className="py-3">Turnovers
avoided × $250K–$500K</td></tr>
                  
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>

            <CollapsibleSection sectionId="assumptions" title="The Assumptions" subtitle="ED-specific defaults and ranges">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#D1D5DB]">
                      <th className="text-left py-3 font-semibold text-black">Assumption</th>
                      <th className="text-left py-3 font-semibold text-black">Range</th>
                      <th className="text-left py-3 font-semibold text-black">Our Default</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#666666]">
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#888888', borderColor: '#888888' }}>Capacity</span></td></tr>
                    <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Time saved per encounter</td><td 
className="py-3">2-5 minutes</td><td className="py-3">3 minutes</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">ED documentation is faster-paced with more
templated workflows. Time savings are smaller per encounter but high volume amplifies impact.</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">LWBS rate</td><td 
className="py-3">2-4%</td><td className="py-3">3%</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">Left Without Being Seen rate. National benchmark is ~2-3%.
 High-volume urban EDs may see 4-5%+.</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">LWBS recovery rate</td><td 
className="py-3">5-15%</td><td className="py-3">10%</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">Percentage of LWBS patients recovered through reduced
wait times. Conservative estimate.</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Avg ED visit revenue</td><td 
className="py-3">$400-$600</td><td className="py-3">$480</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">Blended average across facility and professional
fees. Varies significantly by payer mix and acuity.</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">ED admission rate</td><td 
className="py-3">15-25%</td><td className="py-3">20%</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">Percentage of ED visits resulting in inpatient
admission. Higher rates correlate with higher acuity patient population.</p></TooltipContent></Tooltip>
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#EA2C00', borderColor: '#EA2C00' }}>Revenue</span></td></tr>
                    <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">ED wRVU baseline</td><td 
className="py-3">2.0-3.0</td><td className="py-3">2.5</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">ACEP benchmarks for ED encounters. Higher than
outpatient due to acuity and complexity of ED visits.</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">wRVU lift %</td><td 
className="py-3">2-4%</td><td className="py-3">3%</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">ED coding often under-captures complexity. Better
documentation supports higher E&M levels when clinically appropriate.</p></TooltipContent></Tooltip>
                  
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>

            <CollapsibleSection sectionId="honest-limits" title="The Honest Limits" subtitle="What we can prove, what we can support, and what we can only enable in the ED">
              <div className="space-y-6">
                <p className="text-[15px] text-black leading-relaxed">The ED is operationally complex. Many factors drive throughput, revenue, and retention. We're transparent about exactly how much of
each outcome we can credibly attribute to documentation improvement.</p>
                <div className="grid gap-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#22C55E] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can
Measure This</h4></div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Documentation time per encounter:</strong> EHR timestamps show exactly when charting happens and how long it takes. Visible in weeks.</li>
                      <li><strong>E/M level distribution:</strong> Claims data shows coding accuracy shifts. Compare high-volume vs. low-volume shifts for proof.</li>
                      <li><strong>Denial rates by category:</strong> RCM data identifies documentation-related denials specifically. Track before and after.</li>
                      <li><strong>LWBS rate:</strong> Most EDs track this. The metric is clean — the attribution is the challenge.</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#F59E0B] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can
Influence This</h4></div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Throughput improvement:</strong> Documentation is one input to throughput. Staffing, bed management, triage protocols all matter. We contribute, we don't control.</li>
                      <li><strong>Door-to-doc time:</strong> Influenced by staffing, space, acuity mix, and workflow design. Documentation speed is a factor, not the only factor.</li>
                      <li><strong>CDI query reduction:</strong> Better ED notes reduce queries, but inpatient documentation matters too. Track ED-specific query rates.</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#EF4444] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can Only
Enable This</h4></div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>DRG impact on admitted patients:</strong> ED documentation influences but doesn't determine inpatient DRG. Requires downstream tracking.</li>
                      <li><strong>Retention:</strong> Documentation burden is one of many ED burnout drivers. Impact takes 12-18 months. Real, but not the whole story.</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-5 border-l-2 border-[#EA2C00]">
                  <p className="text-sm text-[#666666] leading-relaxed"><strong className="text-black">Our philosophy:</strong> We'd rather show you a smaller number you can defend in an ED leadership
meeting than a larger number that falls apart when your leadership asks "how did you attribute that?" Key assumptions are editable — because your ED's data should drive the answer, not our defaults.</p>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection sectionId="validation-path" title="The Validation Path" subtitle="How to prove this with your ED's data — before, during, and after">
              <div className="space-y-6">
                <p className="text-[15px] text-black leading-relaxed">ED metrics move fast but are noisy. Seasonality, staffing changes, and patient mix all affect outcomes. Here's how to build a credible
before/after comparison despite the noise.</p>
                <div className="space-y-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-black text-sm uppercase tracking-wide">Before Implementation</h4><span className="text-xs text-[#888888] font-medium">Baseline period</span></div>
                    <p className="text-sm text-[#666666] mb-3">Get 12 months minimum — ED metrics are seasonal and you need to control for that.</p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>LWBS data by month, day of week, and shift — you need to see the patterns</li>
                      <li>E/M level distribution by provider and shift volume</li>
                      <li>CDI query rates specifically for ED-to-inpatient cases</li>
                      <li>Door-to-doc and door-to-disposition times</li>
                      <li>Denial rates with root cause categorization</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 90 Days</h4><span className="text-xs text-[#888888] font-medium">Early signal</span></div>
                    <p className="text-sm text-[#666666] mb-3">Documentation improvements show fast. Throughput takes longer. Be patient with LWBS.</p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Documentation time per encounter — this is often among the earliest signals organizations observe</li>
                      <li>E/M level trends (compare same providers, same shift types)</li>
                      <li>LWBS rate monitoring — but caveat for seasonality and staffing changes</li>
                      <li>Physician satisfaction surveys — qualitative signal matters in the ED</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 6-12 Months</h4><span className="text-xs text-[#888888] font-medium">Operational validation</span></div>
                    <p className="text-sm text-[#666666] mb-3">Throughput and revenue signals become statistically meaningful with enough volume.</p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Year-over-year LWBS comparison (same months, controlling for volume)</li>
                      <li>CDI query rate trends for admitted patients</li>
                      <li>Denial rate trends by documentation-related categories</li>
                      <li>Door-to-disposition trends — control for staffing and volume changes</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 18+ Months</h4><span className="text-xs text-[#888888] font-medium">Long-term impact</span></div>
                    <p className="text-sm text-[#666666] mb-3">Retention is the long game. Don't rush this measurement.</p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Physician turnover: Abridge providers vs. non-Abridge (if applicable)</li>
                      <li>Locum utilization trends</li>
                      <li>Exit interview data — is documentation still a cited burnout factor?</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection sectionId="connected-value" title="Connected Value" subtitle="How ED documentation connects to the rest of your organization">
              <div className="space-y-4 text-[15px] text-black leading-relaxed">
                <p>The ED doesn't operate in isolation. Documentation quality here creates ripple effects across the organization:</p>
                <div className="space-y-4 mt-4">
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">ED → Inpatient (DRG impact)</h4><p className="text-sm text-[#666666] leading-relaxed">Better ED documentation is the foundation of DRG accuracy for admitted patients — when presenting conditions, comorbidities, and clinical reasoning are captured at the point of care, the
inpatient stay begins with a stronger clinical picture. We quantify this in the Inpatient methodology, not here, to prevent double-counting.</p></div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">ED → Nursing (care continuity)</h4><p className="text-sm text-[#666666] leading-relaxed">ED nursing documentation feeds into inpatient handoffs. When assessments are captured in real-time during the ED stay, the transition to floor nursing has better clinical context —
reducing missed information at a high-risk transition point.</p></div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">ED → Outpatient (follow-up quality)</h4><p className="text-sm text-[#666666] leading-relaxed">Complete ED documentation improves follow-up care. When the PCP gets a comprehensive ED visit note, they can continue care without gaps. Hard to quantify, but
real.</p></div>
                </div>
                <p className="text-[#666666] italic mt-4">We don't sum these cross-setting values into the ED model because the attribution gets complex. But they're part of the strategic case for
comprehensive documentation that goes beyond the ED's own P&L.</p>
              </div>
            </CollapsibleSection>
        </DomainTabExplorer>

        <motion.div className="mt-12 bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] rounded-lg p-8 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="text-xl font-bold text-white mb-2">Ready to Build Your Model?</h3>
          <p className="text-[#999999] mb-6 text-sm">Use these methodology principles to create a customized ROI model for your emergency department.</p>
          <button onClick={onBack} className="inline-flex items-center gap-2 bg-[#EA2C00] hover:bg-[#D12600] text-white font-medium px-6 py-3 rounded-lg transition-colors" data-testid="button-build-model">
            Build an ED Model <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        <p className="text-xs text-[#888888] leading-relaxed mt-10 mb-2">Projections are modeled estimates based on user-provided inputs, published industry benchmarks, and aggregated deployment
experience. Actual results may vary based on implementation approach, provider adoption, organizational factors, and care setting. This methodology does not constitute a guarantee of financial
outcomes.</p>

        <div className="mt-12 mb-8">
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Related Methodologies</p>
          <p className="text-sm text-[#666666] mb-6">ED patients often flow to inpatient. Explore how value chains connect across settings.</p>
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
        <div className="fixed bottom-4 right-4 bg-[#EA2C00] text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50" 
data-testid="toast-pdf-download">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Preparing your PDF...</span>
        </div>
      )}
    </div>
  );
}
