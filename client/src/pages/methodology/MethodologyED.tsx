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
    description: "Documentation accuracy under pressure — capturing complexity that determines DRG, E/M level, and clinical defensibility. We model this domain to help surface where your data could tell the story — not to set a number before you've looked.",
    items: [
      { label: "CDI query volume on admits", badge: "Signal" },
      { label: "Note completeness rate", badge: "Signal" },
      { label: "Sepsis/stroke protocol documentation", badge: "Proof" },
    ],
  },
  {
    domain: "WORKFORCE",
    description: "Physician burnout and turnover are the ED's slow bleed — documentation burden is a measurable contributor. We model this domain to help surface where your data could tell the story — not to set a number before you've looked.",
    items: [
      { label: "Physician retention savings", badge: "Trend" },
    ],
  },
  {
    domain: "CAPACITY",
    description: "Throughput is the ED's operating system. Faster documentation is one lever — not the only one. We model this domain to help surface where your data could tell the story — not to set a number before you've looked.",
    items: [
      { label: "Documentation time per encounter (EHR)", badge: "Signal" },
      { label: "LWBS recovery (wait time sensitivity)", badge: "Trend" },
      { label: "Admission capture (downstream of LWBS)", badge: "Trend" },
    ],
  },
  {
    domain: "REVENUE",
    description: "ED coding is the most audit-vulnerable setting. Every surge creates under-documented complexity. We model this domain to help surface where your data could tell the story — not to set a number before you've looked.",
    items: [
      { label: "E/M level accuracy (claims data)", badge: "Trend" },
      { label: "Denial prevention (RCM root cause)", badge: "Trend" },
    ],
  },
];

const domainDetails: DomainDetailData[] = [
  {
    domain: "QUALITY",
    sectionTitle: "Quality",
    sectionSubtitle: "Documentation accuracy under surge — capturing clinical complexity that determines downstream outcomes",
    items: [
      {
        label: "CDI Query Volume on Admits",
        badge: "Signal",
        explanation: "When ED documentation captures presenting conditions and comorbidities completely, CDI specialists receive fewer queries to clarify the clinical picture. This is tracked daily by most CDI departments — before/after comparison is fast and clean. Better ED notes also form the foundation of inpatient DRG accuracy for admitted patients.",
        formula: "Admissions × query rate × reduction % — tracked by CDI department",
        limit: "ED notes influence but don't fully determine inpatient DRG. Attribution requires CDI tracking both ED and inpatient documentation quality together.",
      },
      {
        label: "Note Completeness Rate",
        badge: "Signal",
        explanation: "EHR timestamp data shows exactly when notes are completed and how long they take. During surges, note quality often drops — key elements get abbreviated or omitted. The hypothesis we model is that ambient capture, by removing the typing bottleneck, reduces volume-driven completeness loss; organizations have observed this pattern, and it's something CDI and compliance teams can audit directly to confirm whether it holds in your environment.",
        formula: "EHR session data: note completion time, completeness scores (CDI audit-based)",
      },
      {
        label: "Sepsis / Stroke Protocol Documentation",
        badge: "Proof",
        explanation: "Proper documentation of sepsis and stroke presentations affects both regulatory compliance (CMS sepsis bundle measures) and downstream coding accuracy. The documentation is real and the clinical stakes are high — but direct financial attribution is indirect and multi-factorial. Track as a quality signal, not a revenue line.",
      },
    ],
    honestLimit: "CDI query reduction shows up quickly. DRG impact on admitted patients is captured in the Inpatient methodology to avoid double-counting.",
  },
  {
    domain: "WORKFORCE",
    sectionTitle: "Workforce",
    sectionSubtitle: "Physician retention — the ED's most expensive and least discussed cost driver",
    items: [
      {
        label: "Physician Retention Savings",
        badge: "Trend",
        explanation: "ED burnout is a workforce crisis. Documentation burden is consistently cited in ACEP surveys and Medscape reports as a top contributor. At $250K–$500K per physician replacement (AMGA Physician Retention Survey), retaining even one additional physician could offset a significant portion of implementation cost. The link is attributable; the measurement takes 12–18 months.",
        formula: "ED physicians × turnover rate × burnout % × Abridge impact % × replacement cost\n\nDefaults: replacement cost $250K–$500K, turnover 8–15%, burnout attribution 10–20%",
        limit: "Documentation is one of many burnout drivers in the ED. Don't attribute all turnover change to documentation.",
      },
    ],
    honestLimit: "Retention impact takes 12–18 months to observe. Track exit interviews and satisfaction surveys to build the attribution case over time.",
  },
  {
    domain: "CAPACITY",
    sectionTitle: "Capacity",
    sectionSubtitle: "Throughput and time — documentation speed is one input to the ED's operational throughput",
    items: [
      {
        label: "Documentation Time Per Encounter (EHR)",
        badge: "Signal",
        explanation: "EHR timestamps show exactly when charting begins and ends. In the ED, time savings are smaller per encounter (2–5 minutes) vs. outpatient — but the ED is a volume engine. At 40,000–80,000 visits/year, 3 minutes × 50,000 visits = ~2,500 hours of physician time annually (illustrative). Early signals are often visible within weeks in deployment data.",
        formula: "Minutes saved × annual ED visits / 60 = estimated physician hours potentially returned",
      },
      {
        label: "LWBS Recovery (Wait Time Sensitivity)",
        badge: "Trend",
        explanation: "Each patient who leaves without being seen represents $300–$500+ in lost revenue. Faster documentation contributes to faster throughput, which can reduce wait times and recover some LWBS patients. Attribution is the challenge — documentation is one lever among staffing, bed management, triage protocol, and acuity mix.",
        formula: "(LWBS rate before − LWBS rate after, in pp) × annual ED visits × $480/visit × attribution %",
        limit: "If your LWBS rate is already below 2%, this lever is smaller. We let you adjust based on your reality.",
      },
      {
        label: "Admission Capture (Downstream of LWBS)",
        badge: "Trend",
        explanation: "Of patients recovered from LWBS, some require inpatient admission — converting a lost ED visit into DRG-based inpatient revenue. This driver only activates when LWBS recovery is calculated first. Without real LWBS data, don't estimate this — compounding two estimates produces a number that won't survive scrutiny.",
        formula: "Recovered LWBS patients × admission rate % × avg admission revenue × realization rate",
      },
    ],
    honestLimit: "Documentation is one input to throughput. Staffing, triage protocols, and bed management all matter. We model the documentation contribution — not the whole throughput picture.",
  },
  {
    domain: "REVENUE",
    sectionTitle: "Revenue",
    sectionSubtitle: "Coding accuracy and denial prevention — the ED's most auditable, defensible revenue domain",
    items: [
      {
        label: "E/M Level Accuracy (Claims Data)",
        badge: "Trend",
        explanation: "During surges, ED notes understate what actually happened — a physician manages complex differentials but the note reflects a simpler encounter because time was short. Claims data shows E/M level distribution shifts before and after. ED wRVU lift is typically 2–4% (lower than outpatient because ED workflows are more structured).",
        formula: "(wRVU per encounter after − before) × adopted encounters × $33/wRVU × attribution % × realization %",
      },
      {
        label: "Denial Prevention (RCM Root Cause)",
        badge: "Signal",
        explanation: "Medical necessity is the ED's denial vulnerability. When a note doesn't capture why a test was ordered or why admission was necessary, that's a denial waiting to happen — and many ED denials are unappealable because the documentation gap existed at time of service. RCM teams track documentation-related denials as a specific root cause category.",
        formula: "(denial rate before − after, in pp) × annual encounters × avg denial cost per encounter × attribution %\n\nED default: $500 per encounter",
      },
    ],
    honestLimit: "ED wRVU lift is lower than outpatient because ED documentation workflows are already more structured. We use your observed delta, not an assumed percentage.",
  },
];

const qualitativeSignals: Partial<Record<DomainName, QualitativeSignal[]>> = {
  QUALITY: [
    {
      label: "ED Note Quality (Star Rating)",
      tagline: "Composite of completeness, specificity, and structure — auditable per provider",
      howToTrack: "CDI / quality team scores ED notes on a star scale (often 1–5). Pull pre/post averages by provider. Pattern is usually visible within 90 days.",
      badge: "Signal",
    },
    {
      label: "Admission Hand-Off Completeness",
      tagline: "When the ED admits, the inpatient team starts from the ED note — completeness shows up downstream",
      howToTrack: "Audit a sample of ED-to-inpatient handoffs for SBAR completeness, presenting condition specificity, and disposition reasoning. Pair with hospitalist satisfaction surveys.",
      badge: "Trend",
    },
    {
      label: "ED Patient Experience (Press Ganey)",
      tagline: "Less keyboard time = more eye contact during the encounter",
      howToTrack: "Press Ganey ED survey, reported quarterly. Isolate the 'Doctor explained things clearly' composite. Tied directly to ED HCAHPS and value-based contract performance.",
      badge: "Trend",
    },
  ],
  WORKFORCE: [
    {
      label: "After-Hours Documentation",
      tagline: "Time spent charting after shift end — the cleanest ED burnout signal",
      howToTrack: "EHR session data after shift end. Compare same providers before and after deployment. Visible in weeks.",
      badge: "Signal",
    },
    {
      label: "Provider Engagement / Burnout Surveys",
      tagline: "Is documentation burden still cited as a top driver in ED-specific burnout assessments?",
      howToTrack: "Press Ganey provider engagement, ACEP wellness surveys, or internal pulse surveys. Track documentation burden specifically among Abridge users.",
      badge: "Trend",
    },
    {
      label: "Locum Utilization Trend",
      tagline: "Locum coverage often spikes when retention dips — track the leading indicator",
      howToTrack: "Schedule data and locum agency invoices. Track locum hours and spend per month vs. baseline. Lagging indicator for retention.",
      badge: "Trend",
    },
  ],
  CAPACITY: [
    {
      label: "Encounters per Provider per Shift",
      tagline: "Throughput per provider — directly responsive to documentation speed",
      howToTrack: "EHR encounter counts segmented by provider and shift. Compare same shift type and acuity mix pre/post for credible comparison.",
      badge: "Signal",
    },
    {
      label: "End-of-Shift Note Completion Rate",
      tagline: "% of notes signed before clock-out — a clean signal for same-shift documentation",
      howToTrack: "EHR audit logs: % of encounters with a signed note by end of shift. Often the most dramatic early metric in the ED.",
      badge: "Signal",
    },
    {
      label: "Door-to-Provider Time",
      tagline: "Front-end throughput — affected by triage, staffing, and documentation flow",
      howToTrack: "ED operational dashboard, tracked monthly. Documentation is one input — control for staffing and acuity changes when interpreting the trend.",
      badge: "Trend",
    },
  ],
  REVENUE: [
    {
      label: "Down-coding Rate",
      tagline: "% of ED encounters coded below the level supported by the actual visit complexity",
      howToTrack: "Coding team audit. Pull % of encounters down-coded due to documentation gaps. Directly responsive to documentation completeness — Abridge-moveable signal.",
      badge: "Signal",
    },
    {
      label: "Documentation-Related Denial Rate",
      tagline: "Denials specifically tied to medical necessity / documentation gaps",
      howToTrack: "RCM root-cause categorization, tracked monthly. Isolate documentation-related denials from other causes. 6+ months for credible trend.",
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
          <p className="text-base text-[#666666]">Where speed matters and every minute counts differently</p>
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
