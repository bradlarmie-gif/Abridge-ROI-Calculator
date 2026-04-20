import { motion } from "framer-motion";
import { ArrowLeft, Download, ArrowRight, Activity, Stethoscope, Heart, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { generateMethodologyPDF } from "@/lib/methodology-pdf-export";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';
import {
  DomainOverviewGrid,
  DomainDetailSection,
  CollapsibleSection,
  type DomainCardData,
  type DomainDetailData,
  type DomainName,
} from "@/components/methodology/MethodologyShared";

interface MethodologyInpatientProps {
  onBack: () => void;
  onNavigateToSetting?: (setting: string) => void;
}

const overviewCards: DomainCardData[] = [
  {
    domain: "QUALITY",
    description: "CDI query reduction and CC/MCC capture are daily, trackable signals of documentation improvement. We model this domain to help surface where your data could tell the story — not to set a number before you've looked.",
    items: [
      { label: "CDI query reduction (tracked daily)", badge: "Demonstrated" },
      { label: "CC/MCC documentation completeness", badge: "Demonstrated" },
    ],
  },
  {
    domain: "WORKFORCE",
    description: "Hospitalist burnout from documentation burden is real and expensive. Turnover drives operational and financial risk. We model this domain to help surface where your data could tell the story — not to set a number before you've looked.",
    items: [
      { label: "Hospitalist retention savings", badge: "Emerging" },
    ],
  },
  {
    domain: "CAPACITY",
    description: "Time returned from documentation becomes rounding time, discharge planning time, or clinical headroom. We model this domain to help surface where your data could tell the story — not to set a number before you've looked.",
    items: [
      { label: "Time returned to clinical care (EHR)", badge: "Demonstrated" },
      { label: "Discharge planning timeliness", badge: "Strategic" },
    ],
  },
  {
    domain: "REVENUE",
    description: "DRG accuracy and concurrent review are the core inpatient revenue levers — both tied directly to documentation quality. We model this domain to help surface where your data could tell the story — not to set a number before you've looked.",
    items: [
      { label: "DRG accuracy / CMI improvement", badge: "Demonstrated" },
      { label: "Concurrent review & denial prevention", badge: "Emerging" },
    ],
  },
];

const domainDetails: DomainDetailData[] = [
  {
    domain: "QUALITY",
    sectionTitle: "Quality",
    sectionSubtitle: "CDI query reduction and CC/MCC capture — the most trackable quality signals in inpatient",
    items: [
      {
        label: "CDI Query Reduction (Tracked Daily)",
        badge: "Demonstrated",
        explanation: "CDI departments track query rates daily. When documentation is more complete at the point of care, CDI specialists receive fewer queries to clarify clinical complexity. This is one of the fastest and cleanest signals after deployment — before/after comparison at the provider or unit level is straightforward. Most CDI teams can pull this data within 90 days of implementation.",
        formula: "Admissions × CDI query rate × reduction % × $50/query (CDI specialist time cost)\n\nACDIS benchmark: 25–35% query rate, $40–60/query",
      },
      {
        label: "CC/MCC Documentation Completeness",
        badge: "Demonstrated",
        explanation: "Complication and Comorbidity (CC) and Major Comorbidity (MCC) capture rates directly affect DRG assignment. When documentation captures qualifying conditions completely and accurately, CC/MCC capture improves — shifting DRG weight upward where clinically appropriate. CDI teams audit this daily. It's the most direct connection between documentation quality and DRG revenue.",
        formula: "CC/MCC capture rate improvement × discharges × average DRG weight delta × base rate",
      },
    ],
    honestLimit: "CDI query reduction shows immediately. CC/MCC improvement and CMI impact require 6+ months of data to be statistically credible. Track query rates first, then validate CMI movement.",
  },
  {
    domain: "WORKFORCE",
    sectionTitle: "Workforce",
    sectionSubtitle: "Hospitalist retention — one of the highest-cost turnover scenarios in hospital medicine",
    items: [
      {
        label: "Hospitalist Retention Savings",
        badge: "Emerging",
        explanation: "Hospitalist medicine has some of the highest turnover in healthcare — relentless documentation, overnight admits, and high patient volumes create a unique burnout profile. When a hospitalist leaves, you face coverage gaps, locum costs, and recruiting timelines that stretch months. Documentation burden is consistently cited in exit interviews — but attribution requires tracking it deliberately.",
        formula: "Hospitalists × turnover rate × burnout % × Abridge impact % × replacement cost\n\nDefaults: turnover 8–12%, burnout attribution 40–50%, replacement cost $250K–$500K (AMGA)",
        limit: "Track exit interview data — is documentation burden cited? Compare turnover in Abridge-enabled programs vs. those without. The measurement takes time, but the signal is usually there within 18 months.",
      },
    ],
    honestLimit: "Retention impact is real but takes 12–18 months to observe. Don't claim causation without exit interview data and enough N to be statistically meaningful.",
  },
  {
    domain: "CAPACITY",
    sectionTitle: "Capacity",
    sectionSubtitle: "Time returned — from rounding efficiency to discharge planning quality",
    items: [
      {
        label: "Time Returned to Clinical Care (EHR)",
        badge: "Demonstrated",
        explanation: "EHR session data for H&Ps, progress notes, and discharge summaries shows documentation time directly. In inpatient, time savings are larger per encounter than outpatient — 15–45 minutes across all note types for a typical admission. That time can return to rounding, patient conversations, or discharge coordination. Early signals are often visible within weeks in deployment data — and this is often among the earliest signals organizations observe across inpatient metrics.",
        formula: "Minutes saved per admission × annual admissions / 60 = estimated physician hours potentially returned annually",
      },
      {
        label: "Discharge Planning Timeliness",
        badge: "Strategic",
        explanation: "Better discharge summaries — captured in real-time during discharge conversations rather than retrospectively — improve care transition quality and reduce documentation lag. Discharge documentation lag is an EHR-measurable metric. While faster, more complete discharge summaries may reduce readmissions, attribution is indirect and multi-factorial. Track as a quality signal and a care continuity story.",
        limit: "Readmission attribution is complex. Track discharge documentation lag time as a direct metric. Don't attribute readmission reduction to documentation alone without controlling for multiple other factors.",
      },
    ],
    honestLimit: "Time savings in inpatient are demonstrated quickly and are often the most dramatic early metric. How that time is used — more patient time, faster discharges, or reduced after-hours burden — depends on your hospitalist program's operational decisions.",
  },
  {
    domain: "REVENUE",
    sectionTitle: "Revenue",
    sectionSubtitle: "DRG accuracy and denial prevention — where inpatient documentation quality becomes dollars",
    items: [
      {
        label: "DRG Accuracy / CMI Improvement",
        badge: "Demonstrated",
        explanation: "Case Mix Index (CMI) is the clearest inpatient revenue signal — it reflects the average DRG weight of your patient population. The hypothesis we model: when documentation more completely captures clinical complexity, CMI tends to move upward where clinically appropriate. Claims data tracks this quarterly, and CDI teams can compare ambient-AI-enabled providers against a control cohort to test whether the shift is real in your environment. This is the inpatient equivalent of wRVU lift — trackable, auditable, and defensible when validated with your own data.",
        formula: "CMI delta × annual discharges × $6,800 (CMS IPPS base rate)\n\nIllustrative model input: CMI improvement of 0.01 across 5,000 discharges × $6,800 ≈ $340,000",
      },
      {
        label: "Concurrent Review & Denial Prevention",
        badge: "Emerging",
        explanation: "Observation vs. inpatient status denials are driven by medical necessity documentation. When clinical reasoning for admission, continued stay, and discharge is captured in real-time, concurrent review becomes more defensible. Documentation-related denials are an identifiable RCM root cause. At $3,500+ per inpatient case denial, even small improvements in denial rates represent significant recovery.",
        formula: "(denial rate before − after, in pp) × annual discharges × $3,500/case × attribution %",
        limit: "Denial rates reflect many process factors — utilization management workflows, payer behavior, and clinical documentation all contribute. Work with your RCM team to isolate documentation-related denials before claiming full attribution.",
      },
    ],
    honestLimit: "CMI improvement is the crown jewel of inpatient ROI — but it requires 6–12 months of data and CDI collaboration to be credible. Don't present CMI improvement without provider-level data to support it.",
  },
];

export function MethodologyInpatient({ onBack, onNavigateToSetting }: MethodologyInpatientProps) {
  const [isExporting, setIsExporting] = useState(false);
  const domainRefs = useRef<Partial<Record<DomainName, HTMLDivElement | null>>>({});

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

  const scrollToDomain = (domain: DomainName) => {
    const el = domainRefs.current[domain];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
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
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-3 uppercase tracking-tight">Inpatient: How We Think About Value</h1>
          <p className="text-base text-[#666666]">Where documentation quality becomes DRG accuracy — and DRG accuracy becomes revenue</p>
        </motion.div>

        <DomainOverviewGrid cards={overviewCards} onDomainClick={scrollToDomain} />

        <div className="bg-[#F5F0EB] rounded-lg">
          <div className="px-6">
            {domainDetails.map((detail) => (
              <DomainDetailSection
                key={detail.domain}
                data={detail}
                sectionRef={{ current: domainRefs.current[detail.domain] ?? null } as React.RefObject<HTMLDivElement>}
              />
            ))}

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
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#EA2C00', borderColor: '#EA2C00' }}>Revenue</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">CMI / DRG accuracy</td><td className="py-3">✅ Yes</td><td className="py-3">CMI delta × discharges × $6,800</td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">ALOS reduction</td><td className="py-3">✅ Yes</td><td className="py-3">Days saved × admissions × $2,500/bed day</td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">Denial rate reduction</td><td className="py-3">✅ Yes</td><td className="py-3">Denial pp delta × encounters ×
$3,500/case</td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">Obs/IP status defense</td><td className="py-3">✅ Yes (if denial data provided)</td><td className="py-3">Admissions at
risk × denial rate × avg claim delta × doc-attributable %</td></tr>
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#1A1A1A', borderColor: '#1A1A1A' }}>Quality</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">CDI query reduction</td><td className="py-3 text-[#F59E0B] font-medium">Explore model: ✅ calculated · Measure model:
signal only</td><td className="py-3">Admissions × query rate × reduction % × $50/query</td></tr>
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#888888', borderColor: '#888888' }}>Capacity</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">Rounding efficiency</td><td className="py-3 text-[#F59E0B] font-medium">Hours only — not monetized</td><td 
className="py-3">Physician time is salaried</td></tr>
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#555555', borderColor: '#555555' }}>Workforce</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">Hospitalist retention</td><td className="py-3">✅ Yes (if survey data provided)</td><td className="py-3">Turnovers avoided
 × $250K–$500K</td></tr>
                  
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>

            <CollapsibleSection sectionId="assumptions" title="The Assumptions" subtitle="Inpatient-specific defaults and ranges">
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
                    <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Time saved per admission</td><td 
className="py-3">15-45 minutes</td><td className="py-3">30 minutes</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">Total documentation time saved across
H&P, progress notes, and discharge summary. Higher for complex admissions.</p></TooltipContent></Tooltip>
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#EA2C00', borderColor: '#EA2C00' }}>Revenue</span></td></tr>
                    <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">DRG base rate</td><td 
className="py-3">$6,000–$8,000</td><td className="py-3">$6,800</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">CMS IPPS base rate; varies by hospital wage
index and DSH adjustment.</p></TooltipContent></Tooltip>
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#1A1A1A', borderColor: '#1A1A1A' }}>Quality</span></td></tr>
                    <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">CDI query rate</td><td 
className="py-3">25-35%</td><td className="py-3">30%</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">ACDIS benchmark. Shown here as context for the signal —
 query reduction is not included as a direct financial line in the calculator.</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Query reduction %</td><td 
className="py-3">15-35%</td><td className="py-3">25%</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">Expected reduction in CDI queries when documentation is
 more complete at point of care.</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Cost per query</td><td 
className="py-3">$40-$60</td><td className="py-3">$50</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">CDI specialist time cost per query including creation,
 tracking, and follow-up. Based on ACDIS productivity benchmarks.</p></TooltipContent></Tooltip>
                  
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>

            <CollapsibleSection sectionId="honest-limits" title="The Honest Limits" subtitle="What we can prove, what we can support, and what we can only enable in inpatient">
              <div className="space-y-6">
                <p className="text-[15px] text-black leading-relaxed">Inpatient revenue is team-produced. Documentation is step one, but CDI, coding, and clinical operations all affect the final outcome.
We're honest about what documentation improvement can and can't claim credit for.</p>
                <div className="grid gap-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#22C55E] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can
Measure This</h4></div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Documentation time per note type:</strong> EHR session data for H&Ps, progress notes, discharge summaries. Visible in weeks.</li>
                      <li><strong>CDI query rates:</strong> CDI departments track this daily. Before/after comparison is clean and fast.</li>
                      <li><strong>CMI trends:</strong> Claims data, tracked quarterly. Compare Abridge providers vs. control group.</li>
                      <li><strong>Note completeness:</strong> CDI can assess documentation quality directly. Audit-ready evidence.</li>
                      <li><strong>Discharge documentation lag:</strong> Time from discharge order to completed discharge summary is an EHR-measurable metric.</li>
                      <li><strong>Obs/IP status defense:</strong> Medical necessity denial rates by root cause are tracked by revenue cycle.</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#F59E0B] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can
Influence This</h4></div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>DRG accuracy:</strong> Documentation is the input; CDI, coding, and payer response determine the output. Trackable, but multi-factorial.</li>
                      <li><strong>Denial prevention:</strong> Documentation-related denials are identifiable. Requires 6+ months of data to see trends.</li>
                      <li><strong>Readmission-related documentation:</strong> Better discharge summaries may reduce readmissions, but many factors contribute.</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#EF4444] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can Only
Enable This</h4></div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Length of stay:</strong> Many factors drive LOS — staffing, bed management, discharge planning, social determinants. Documentation is one contributor. Don't
over-attribute.</li>
                      <li><strong>Rounding efficiency:</strong> Real in hours, harder to convert to dollars. We show hours, not revenue.</li>
                      <li><strong>Retention:</strong> Long-term measurement needed. Track, but don't claim causation prematurely.</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-5 border-l-2 border-[#EA2C00]">
                  <p className="text-sm text-[#666666] leading-relaxed"><strong className="text-black">Our philosophy:</strong> We'd rather show you a defensible DRG improvement number based on CDI data
than a speculative LOS reduction based on assumptions. Key variables in our model are editable — because your CDI team knows your gaps better than any default can.</p>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection sectionId="validation-path" title="The Validation Path" subtitle="How to prove this with your hospitalist program's data — before, during, and after">
              <div className="space-y-6">
                <p className="text-[15px] text-black leading-relaxed">Inpatient has an advantage: your CDI department already tracks most of the metrics you need. Here's how to leverage that existing
infrastructure for a credible ROI story.</p>
                <div className="space-y-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-black text-sm uppercase tracking-wide">Before Implementation</h4><span className="text-xs text-[#888888] font-medium">Baseline period</span></div>
                    <p className="text-sm text-[#666666] mb-3">Work with CDI and coding to establish baselines. Most of this data already exists.</p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>12 months of CMI data by hospitalist — you need provider-level granularity</li>
                      <li>CDI query rates by provider and query type</li>
                      <li>DRG denial rates with documentation-related root cause analysis</li>
                      <li>Documentation time estimates (if EHR data is available)</li>
                      <li>CC/MCC capture rates — your CDI team tracks this</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 90 Days</h4><span className="text-xs text-[#888888] font-medium">Early signal</span></div>
                    <p className="text-sm text-[#666666] mb-3">CDI query reduction shows up fast. CMI takes longer because of claims lag.</p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Documentation time by note type — H&Ps, progress notes, discharges</li>
                      <li>CDI query rate trends (this is often the earliest financial signal)</li>
                      <li>Note quality assessment from CDI perspective</li>
                      <li>Hospitalist satisfaction surveys — qualitative signal matters</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 6-12 Months</h4><span className="text-xs text-[#888888] font-medium">Revenue validation</span></div>
                    <p className="text-sm text-[#666666] mb-3">CMI and denial data become statistically meaningful. This is your board presentation window.</p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Year-over-year CMI comparison by provider cohort</li>
                      <li>CC/MCC capture rate trends</li>
                      <li>DRG denial rate trends — isolate documentation-related categories</li>
                      <li>CDI productivity metrics — are CDI specialists covering more cases?</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 18+ Months</h4><span className="text-xs text-[#888888] font-medium">Long-term impact</span></div>
                    <p className="text-sm text-[#666666] mb-3">Retention and culture shifts. Don't rush this measurement.</p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Hospitalist turnover: Abridge-enabled program vs. pre-implementation</li>
                      <li>LOS trends (with appropriate controls for patient acuity changes)</li>
                      <li>Exit interview data — is documentation still cited as a burnout factor?</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection sectionId="connected-value" title="Connected Value" subtitle="How inpatient documentation connects to the rest of your organization">
              <div className="space-y-4 text-[15px] text-black leading-relaxed">
                <p>Inpatient sits at the center of the hospital value chain. Documentation here connects to almost every other care setting:</p>
                <div className="space-y-4 mt-4">
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">ED → Inpatient (upstream feed)</h4><p className="text-sm text-[#666666] leading-relaxed">ED documentation quality directly affects the starting point of inpatient care. When ED notes capture presenting conditions and comorbidities completely, CDI teams have a stronger
foundation. We quantify this in the ED methodology to avoid double-counting.</p></div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">Nursing → Inpatient (CC/MCC support)</h4><p className="text-sm text-[#666666] leading-relaxed">Nursing documentation captures clinical observations that support CC/MCC coding — skin assessments, fall risk documentation, nutritional status. When nursing notes are
complete, CDI teams have additional evidence to support DRG accuracy.</p></div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">Inpatient → Outpatient (discharge quality)</h4><p className="text-sm text-[#666666] leading-relaxed">Complete discharge summaries improve post-discharge follow-up care. When the PCP receives a comprehensive discharge note, medication reconciliation, follow-up, and care
continuity all improve. This connects to readmission reduction, though attribution is indirect.</p></div>
                </div>
                <p className="text-[#666666] italic mt-4">We don't sum cross-setting values into the inpatient model — the attribution gets complex when value flows through multiple teams. But when
building a system-level business case, these connections matter.</p>
              </div>
            </CollapsibleSection>
          </div>
        </div>

        <motion.div className="mt-12 bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] rounded-lg p-8 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="text-xl font-bold text-white mb-2">Ready to Build Your Model?</h3>
          <p className="text-[#999999] mb-6 text-sm">Use these methodology principles to create a customized ROI model for your hospitalist program.</p>
          <button onClick={onBack} className="inline-flex items-center gap-2 bg-[#EA2C00] hover:bg-[#D12600] text-white font-medium px-6 py-3 rounded-lg transition-colors" data-testid="button-build-model">
            Build an Inpatient Model <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        <p className="text-xs text-[#888888] leading-relaxed mt-10 mb-2">Projections are modeled estimates based on user-provided inputs, published industry benchmarks, and aggregated deployment
experience. Actual results may vary based on implementation approach, provider adoption, organizational factors, and care setting. This methodology does not constitute a guarantee of financial
outcomes.</p>

        <div className="mt-12 mb-8">
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Related Methodologies</p>
          <p className="text-sm text-[#666666] mb-6">Inpatient connects to ED admissions and nursing care. Explore how value chains connect.</p>
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
        <div className="fixed bottom-4 right-4 bg-[#EA2C00] text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50" 
data-testid="toast-pdf-download">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Preparing your PDF...</span>
        </div>
      )}
    </div>
  );
}
