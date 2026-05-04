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
} from "@/components/methodology/MethodologyShared";

interface MethodologyEDProps {
  onBack: () => void;
  onNavigateToSetting?: (setting: string) => void;
}

const overviewCards: DomainCardData[] = [
  {
    domain: "QUALITY",
    description: "Documentation specificity determines CDI query volume and patient experience scores. Both are measurable, both are Abridge-moveable, and both connect to financial outcomes an executive will recognize.",
    items: [
      { label: "CDI query volume on admits", badge: "Trend" },
      { label: "HCAHPS doctor communication score", badge: "Trend" },
    ],
  },
  {
    domain: "WORKFORCE",
    description: "Documentation burden is the most cited and most measurable driver of ED physician burnout. After-shift charting time is EHR-measurable within weeks. Retention impact takes longer — but the replacement cost math is unambiguous.",
    items: [
      { label: "After-shift charting time (pajama time)", badge: "Signal" },
      { label: "Provider satisfaction / burnout surveys", badge: "Trend" },
      { label: "Physician turnover rate", badge: "Proof" },
    ],
  },
  {
    domain: "CAPACITY",
    description: "Documentation speed is one input to throughput — not the only one. We model it carefully and require you to confirm whether physician time is actually your throughput constraint before claiming LWBS impact.",
    items: [
      { label: "Documentation time per encounter (EHR)", badge: "Signal" },
      { label: "LWBS rate", badge: "Trend" },
    ],
  },
  {
    domain: "REVENUE",
    description: "ED coding is the most audit-vulnerable setting. Under time pressure, physicians default to mid-level codes. Complete documentation shifts that distribution — and the billing cycle creates a clean, attributable before/after signal.",
    items: [
      { label: "E/M level accuracy / wRVU per encounter", badge: "Trend" },
      { label: "Denial rate (documentation-related)", badge: "Trend" },
    ],
  },
];

const domainDetails: DomainDetailData[] = [
  {
    domain: "QUALITY",
    sectionTitle: "Quality",
    sectionSubtitle: "CDI specificity and patient experience — the two quality signals that connect directly to financial outcomes",
    items: [
      {
        label: "CDI Query Volume on Admits",
        badge: "Trend",
        explanation: "CDI queries happen when a note lacks the specificity to support accurate DRG coding — the coder can't tell if the patient had a complication, a severity level, or a comorbidity that would change the code. Abridge captures the clinical reasoning that physicians verbalize during the encounter: the severity assessment, the differential, the specific findings. That specificity, preserved in the note, answers the CDI question before it's asked. CDI departments track query volume monthly — it's one of the cleaner before/after metrics in the hospital.",
        formula: "CDI queries per admission × reduction % × cost per query (CDI labor + physician response time, typically $50–$100 fully loaded)",
        limit: "CDI query reduction from ED notes affects admitted patients. This is a joint ED + inpatient signal — track query rate on ED-origin cases specifically to isolate attribution.",
      },
      {
        label: "HCAHPS Doctor Communication Score",
        badge: "Trend",
        explanation: "Physicians using ambient documentation spend less time looking at a screen and more time making eye contact with the patient. When the note is drafting itself, the physician can be fully present in the conversation. Patients notice — and report it in surveys. The HCAHPS doctor communication composite ('doctors always explained things clearly / listened carefully / treated me with respect') is directly affected by physician presence during the encounter.",
        formula: "HCAHPS Doctor Communication composite score (Press Ganey reporting). Value-Based Purchasing: CMS puts 2% of Medicare inpatient payments at risk based in part on HCAHPS domain scores. A 1–2 point composite improvement can shift a hospital from the penalty zone to neutral.",
        limit: "HCAHPS is reported quarterly — you need 2–3 survey cycles before the trend is statistically meaningful. Isolate the doctor communication sub-items specifically, not just overall satisfaction.",
      },
    ],
    honestLimit: "CDI query reduction shows up in 2–3 billing cycles. HCAHPS requires quarterly survey cycles. Neither is a Day 1 signal — but both are clean, measurable, and directly linked to financial outcomes executives track.",
  },
  {
    domain: "WORKFORCE",
    sectionTitle: "Workforce",
    sectionSubtitle: "Physician time, satisfaction, and retention — the ED's most expensive and most measurable cost driver",
    items: [
      {
        label: "After-Shift Charting Time (Pajama Time)",
        badge: "Signal",
        explanation: "Abridge generates a drafted note by the time the patient leaves. The physician reviews and edits instead of writing from scratch. The note that used to take 20–30 minutes at midnight takes 5 minutes to review. ED physicians average 45–90 minutes of unpaid after-shift charting per shift. That's time with their families, their sleep, their life outside medicine. When this number drops, physicians notice immediately — and they talk about it. EHR session data after shift end is directly measurable: compare the same providers before and after deployment.",
        formula: "Minutes of post-shift EHR activity per provider per shift (before vs. after). EHR session timestamps — pull shift end time + last EHR activity by provider.",
      },
      {
        label: "Physician Retention Savings",
        badge: "Proof",
        explanation: "Documentation burden is consistently the #1 or #2 driver of ED physician burnout in ACEP and Medscape surveys. Burnout drives exit. When you reduce a physician's primary operational complaint — nightly charting, interrupted evenings, weekend catch-up — you remove a key reason they look for other positions or reduce clinical hours. At $250,000–$500,000 per physician replacement (recruitment, credentialing, locum coverage during the gap, productivity ramp), preventing even one departure more than offsets a year of Abridge costs for most groups.",
        formula: "ED physicians × annual turnover rate × burnout attribution % × Abridge retention impact % × replacement cost\n\nDefaults: replacement cost $250K–$500K, turnover 8–15%, burnout attribution 10–20%",
        limit: "Documentation burden is one of many burnout drivers. Don't attribute all turnover change to documentation. The right claim: Abridge addresses the most commonly cited operational complaint, and that's attributable. The rest is multi-factorial.",
      },
    ],
    honestLimit: "After-shift charting shows up in weeks. Satisfaction surveys at 2–4 months. Turnover data takes 12–18 months to be statistically credible. Build the case in layers — don't try to prove retention ROI in quarter one.",
  },
  {
    domain: "CAPACITY",
    sectionTitle: "Capacity",
    sectionSubtitle: "Documentation speed is one input to ED throughput — but only if physician time is actually your bottleneck",
    items: [
      {
        label: "Documentation Time Per Encounter (EHR)",
        badge: "Signal",
        explanation: "Ambient documentation captures the encounter as it happens. Instead of writing from memory after the patient leaves, the physician reviews and edits a drafted note. EHR timestamp data shows exactly when charting begins, when it ends, and whether it happens during the encounter or after the shift. In consistent users, documentation time typically drops 30–50%. In the ED at 40,000–80,000 visits per year, even 3 minutes per encounter recaptured is a meaningful shift in how physicians spend their clinical hours.",
        formula: "Minutes saved per encounter × annual ED visits / 60 = physician hours returned annually (illustrative — use your EHR session data for the actual number)",
      },
      {
        label: "LWBS Rate",
        badge: "Trend",
        explanation: "When physician documentation time drops, physicians can begin the next encounter sooner. In EDs where physician availability — not bed availability — is the throughput bottleneck, faster documentation directly reduces door-to-provider time, which directly reduces the number of patients who leave without being seen. Each LWBS patient represents approximately $480 in lost revenue plus negative patient experience and regulatory exposure. At a 2% LWBS rate on 50,000 annual visits, a half-point reduction is roughly $240,000 recovered annually — on revenue the ED already earned by keeping the doors open.",
        formula: "(LWBS rate before − after, in pp) × annual ED visits × ~$480/visit × attribution %",
        limit: "This metric only moves if physician time is your throughput bottleneck. If you're constrained by bed availability, nursing ratios, or ancillary service wait times, faster documentation does not move LWBS. We require you to confirm this explicitly before we include this driver — a number that falls apart in a leadership meeting is worse than no number.",
      },
    ],
    honestLimit: "Documentation is one input to throughput. Staffing, triage protocols, and bed management all matter. The LWBS model requires explicit confirmation that physician time is your constraint — not an assumption.",
  },
  {
    domain: "REVENUE",
    sectionTitle: "Revenue",
    sectionSubtitle: "Coding accuracy and denial prevention — the ED's most auditable revenue opportunity",
    items: [
      {
        label: "E/M Level Accuracy (Claims Data)",
        badge: "Trend",
        explanation: "Under time pressure, ED physicians manage complex differentials but document simpler encounters because that's what can be written in 3 minutes. Abridge captures the full clinical conversation — the presenting complaint, exam findings, and decision-making — so the note reflects what actually happened. Coders see complete documentation and assign the code the complexity warrants. Claims data shows E/M level distribution before and after — it's one of the cleanest revenue signals in the ED because the before/after comparison is in your own billing system.",
        formula: "(wRVU per encounter after − before) × adopted encounters × $33.40/wRVU × attribution % × realization %\n\nED wRVU lift is typically 2–7% (lower than outpatient because ED workflows are already more structured)",
        limit: "Plan for 2–3 billing cycles (60–90 days) before comparing E/M distributions. The improved note exists immediately, but the billing cycle (30–45 days encounter to payment) plus coding team behavior adjustment means the aggregate signal takes time to be clean.",
      },
      {
        label: "Denial Rate (Documentation-Related)",
        badge: "Trend",
        explanation: "Medical necessity denials are the top ED denial type — payers reject claims when the note doesn't show why the level of care was warranted. Abridge captures the clinical reasoning that physicians verbalize but rarely have time to write: the severity of symptoms, the differential diagnosis, the alternatives considered. That reasoning, preserved in the note, is what payers need to adjudicate the claim. RCM teams track documentation-related denials as a specific root cause category — this is a metric your revenue cycle team already monitors.",
        formula: "(denial rate before − after, in pp) × annual encounters × avg denial cost × attribution %\n\nED default: ~$450–$500 per denied encounter",
        limit: "RCM denial trend data requires 90+ days of claims volume to show a statistically meaningful pattern. Track documentation-specific denials separately from other denial causes — the attribution depends on isolating that root cause.",
      },
    ],
    honestLimit: "Revenue signals in the ED are measurable but require patience with the billing cycle. E/M level data and denial root-cause both need 60–90+ days before the trend is clean enough to present to finance.",
  },
];

const qualitativeSignals: Partial<Record<DomainName, QualitativeSignal[]>> = {
  QUALITY: [
    {
      label: "Down-Coding Rate",
      tagline: "% of encounters coded below the level supported by actual visit complexity — the most direct coding accuracy signal",
      howToTrack: "Coding team audit: pull % of encounters down-coded due to documentation gaps. Compare same acuity cohort before and after deployment. Directly responsive to documentation completeness. 60–90 days for a meaningful trend.",
      badge: "Trend",
    },
  ],
  WORKFORCE: [
    {
      label: "Provider Engagement / Burnout Surveys",
      tagline: "Documentation burden specifically — not just overall satisfaction",
      howToTrack: "Use ACEP wellness surveys, Mini Z, Maslach, or internal pulse surveys. Track the documentation burden sub-question specifically among Abridge users vs. non-users. Meaningful trend at 2–4 months. Satisfaction is the 6-month leading indicator before turnover data appears.",
      badge: "Trend",
    },
    {
      label: "Locum Utilization Trend",
      tagline: "Locum coverage spikes when retention dips — track the leading financial indicator",
      howToTrack: "Schedule data and locum agency invoices. Track locum hours and spend per month vs. baseline. This is a lagging indicator for retention but a leading indicator for locum cost savings — and it's a number finance already tracks.",
      badge: "Trend",
    },
  ],
  CAPACITY: [
    {
      label: "End-of-Shift Note Completion Rate",
      tagline: "% of notes signed before clock-out — often the most dramatic early signal in the ED",
      howToTrack: "EHR audit logs: % of encounters with a signed note by end of shift. Compare same providers pre/post. This is frequently one of the first metrics to move visibly — and it's a clean operational win to report to clinical leadership.",
      badge: "Signal",
    },
    {
      label: "Encounters per Provider per Shift",
      tagline: "Direct throughput signal — but requires controlling for acuity mix",
      howToTrack: "EHR encounter counts segmented by provider and shift type. Compare same shift type and acuity cohort pre/post. A change here with controlled comparison is one of the strongest capacity claims you can make.",
      badge: "Trend",
    },
  ],
  REVENUE: [
    {
      label: "Documentation-Related Denial Rate",
      tagline: "Denials tied specifically to medical necessity gaps — the most defensible revenue signal",
      howToTrack: "RCM root-cause categorization, tracked monthly. Isolate documentation-related denials from authorization, eligibility, and other denial types. 90+ days for a credible trend. This is the number your CFO will ask about.",
      badge: "Trend",
    },
  ],
};

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
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-3 uppercase tracking-tight">Emergency: How We Think About Value</h1>
          <p className="text-base text-[#666666]">What changes in your ED with ambient documentation — and when. Built for CFO scrutiny.</p>
        </motion.div>

        <ValueAccrualSection />

        <DomainTabExplorer
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
