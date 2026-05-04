import { motion } from "framer-motion";
import { ArrowLeft, Download, ArrowRight, Activity, Building2, Heart, Loader2 } from "lucide-react";
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

interface MethodologyOutpatientProps {
  onBack: () => void;
  onNavigateToSetting?: (setting: string) => void;
}

const overviewCards: DomainCardData[] = [
  {
    domain: "QUALITY",
    description: "Documentation completeness drives referral quality and risk adjustment accuracy for value-based contracts. We model this domain to help surface where your data could tell the story — not to set a number before you've looked.",
    items: [
      { label: "Referral note completeness", badge: "Proof" },
      { label: "HCC/risk adjustment for MA populations", badge: "Trend" },
    ],
  },
  {
    domain: "WORKFORCE",
    description: "Physician burnout and turnover represent the largest hidden cost in outpatient practices. We model this domain to help surface where your data could tell the story — not to set a number before you've looked.",
    items: [
      { label: "Physician retention savings", badge: "Trend" },
    ],
  },
  {
    domain: "CAPACITY",
    description: "Time saved per encounter is the outpatient multiplier — translates directly into capacity or clinical headroom. We model this domain to help surface where your data could tell the story — not to set a number before you've looked.",
    items: [
      { label: "Time per encounter (EHR timestamps)", badge: "Signal" },
      { label: "Patient access / capacity expansion", badge: "Trend" },
    ],
  },
  {
    domain: "REVENUE",
    description: "wRVU accuracy and denial prevention are the most directly attributable revenue drivers in outpatient. We model this domain to help surface where your data could tell the story — not to set a number before you've looked.",
    items: [
      { label: "wRVU accuracy (billing data)", badge: "Trend" },
      { label: "Denial prevention", badge: "Trend" },
    ],
  },
];

const domainDetails: DomainDetailData[] = [
  {
    domain: "QUALITY",
    sectionTitle: "Quality",
    sectionSubtitle: "Referral completeness and risk adjustment — documentation quality that flows downstream",
    items: [
      {
        label: "Referral Note Completeness",
        badge: "Proof",
        explanation: "When primary care documentation is complete, specialists receive better clinical context — fewer repeat tests, faster diagnoses, better care continuity. This is real and clinically meaningful, but direct financial attribution is difficult. Track as a quality signal and a differentiator in value-based contract conversations.",
        limit: "Too many variables to attribute financially. Track as a leading indicator for specialist partnership and patient experience.",
      },
      {
        label: "HCC / Risk Adjustment for MA Populations",
        badge: "Trend",
        explanation: "HCC (Hierarchical Condition Category) accuracy drives risk adjustment in Medicare Advantage plans. Complete documentation of chronic conditions supports accurate RAF (Risk Adjustment Factor) scores, which determine capitated payment levels. With 20–30% chronic condition gap rates in typical practices, this is a meaningful and attributable value driver for practices with significant MA populations.",
        formula: "MA patients × HCC gap rate × recapture % × RAF point value × capitation rate multiplier",
        limit: "Requires MA population data and coordination with your risk adjustment team. Gap rate and recapture % should come from your actual coding data, not benchmarks.",
      },
    ],
    honestLimit: "Quality value in outpatient is real but often flows downstream or into value-based contract performance rather than direct revenue. Track it — but don't put it in the primary ROI number unless you have data.",
  },
  {
    domain: "WORKFORCE",
    sectionTitle: "Workforce",
    sectionSubtitle: "Physician retention — the largest hidden cost in most outpatient organizations",
    items: [
      {
        label: "Physician Retention Savings",
        badge: "Trend",
        explanation: "Documentation burden is consistently cited as a top burnout driver in outpatient settings. At $250K–$500K per physician replacement (AMGA Physician Retention Survey), retaining one additional physician annually can significantly change the ROI picture. The link between documentation burden and burnout is well-established; the attribution to Abridge specifically takes 12–18 months to observe.",
        formula: "Physicians × turnover rate × burnout % × Abridge impact % × replacement cost\n\nDefault: replacement cost $350K, burnout attribution 10–20%",
        limit: "Documentation is one of many outpatient burnout drivers. Don't attribute all turnover change to documentation without exit interview data to support it.",
      },
    ],
    honestLimit: "Retention is the long game in outpatient. Track satisfaction surveys and exit interview data from day one so you have the attribution story at 18 months.",
  },
  {
    domain: "CAPACITY",
    sectionTitle: "Capacity",
    sectionSubtitle: "Time returned — the outpatient multiplier that unlocks access or reduces after-hours burden",
    items: [
      {
        label: "Time Per Encounter (EHR Timestamps)",
        badge: "Signal",
        explanation: "EHR session data shows exactly when documentation happens and how long it takes. This is the most immediate and unambiguous signal after deployment. In outpatient, deployment observations suggest time savings often run 2–4 minutes per encounter — with same-day note closure among the earliest signals organizations report. Illustratively, 20 patients/day × 240 working days × 3 minutes/encounter ≈ 240 hours of physician time annually per provider (model input — your data will tell the real story).",
        formula: "Minutes saved × daily encounters × working days = estimated annual physician hours potentially returned",
      },
      {
        label: "Patient Access / Capacity Expansion",
        badge: "Trend",
        explanation: "When physicians spend less time documenting, they have headroom to see more patients — or to stop working after hours. Whether that time converts to capacity depends on patient demand and scheduling decisions your leadership makes. We model the capacity potential; you decide how to use it. For practices with wait lists or access constraints, this driver can be significant.",
        formula: "Additional patients/provider/month × providers × 12 months × avg revenue per visit",
        limit: "Requires patient demand to convert time to revenue. If you're not capacity-constrained, this value goes to physician wellbeing, not incremental volume.",
      },
    ],
    honestLimit: "Time savings in outpatient are demonstrated quickly. Whether that time becomes revenue or wellbeing depends on how your organization chooses to redeploy it.",
  },
  {
    domain: "REVENUE",
    sectionTitle: "Revenue",
    sectionSubtitle: "wRVU accuracy and denial prevention — the most directly attributable financial drivers in outpatient",
    items: [
      {
        label: "wRVU Accuracy (Billing Data)",
        badge: "Trend",
        explanation: "Better documentation captures visit complexity more accurately, supporting appropriate E/M level coding. Claims data shows wRVU distribution shifts before and after. Published studies and deployment observations suggest wRVU lift may range 2–7% depending on baseline documentation quality and specialty. MGMA data shows that documentation-related undercoding is common, particularly in primary care where visit complexity is often under-documented.",
        formula: "wRVU delta per encounter × adopted encounters × $33/wRVU (CMS MPFS conversion factor)\n\nNote: commercial payers often pay higher than Medicare conversion factor — blended rate depends on payer mix",
      },
      {
        label: "Denial Prevention",
        badge: "Trend",
        explanation: "30–40% of claim denials are unappealable — permanent revenue loss because the documentation gap existed at time of service. The mechanism we're modeling: capturing clinical reasoning in real time creates an opportunity to close medical-necessity gaps at the point of care rather than after the claim is filed. Outpatient denial rates typically run 5–12% (MGMA), and documentation-related denials are an identifiable subset that your RCM team can isolate as a root cause category — that root-cause data is what would confirm or adjust the model in your setting.",
        formula: "(denial rate before − after, in pp) × annual encounters × $350/encounter × attribution %",
        limit: "Denial rates reflect many process factors beyond documentation. Work with your RCM team to isolate documentation-related denials before claiming full attribution.",
      },
    ],
    honestLimit: "wRVU lift is the most auditable outpatient revenue driver — claims data makes before/after comparison clean. Denial prevention takes 6+ months to show statistically meaningful trends.",
  },
];

const qualitativeSignals: Partial<Record<DomainName, QualitativeSignal[]>> = {
  QUALITY: [
    {
      label: "HCC Recapture Rate (MA Risk Adjustment)",
      tagline: "Are chronic conditions being re-documented in the year they need to be?",
      howToTrack: "Risk adjustment / coding team tracks suspected vs. confirmed HCC closures by provider. Pull pre/post recapture rate for MA panels. Quarterly cadence.",
      badge: "Trend",
    },
    {
      label: "Care Gap Closure Rate",
      tagline: "HEDIS-style measures that depend on documentation completeness — A1c, BP, screenings",
      howToTrack: "Population health dashboard or payer scorecard. Track gap closure rate per measure for Abridge-enabled providers vs. control. 6-month signal.",
      badge: "Trend",
    },
    {
      label: "MIPS / Quality Reporting Score",
      tagline: "Composite regulatory score that rolls up documentation-dependent measures",
      howToTrack: "CMS MIPS feedback report, annual cadence. Trend the quality category score over multiple reporting years. Long-game signal.",
      badge: "Proof",
    },
  ],
  WORKFORCE: [
    {
      label: "After-Hours Documentation (Pajama Time)",
      tagline: "Time spent charting outside scheduled work hours — the canonical outpatient burnout metric",
      howToTrack: "EHR session data outside scheduled hours. Compare same providers before and after deployment. Visible in weeks; among the earliest signals.",
      badge: "Signal",
    },
    {
      label: "Same-Day Note Closure Rate",
      tagline: "% of encounters with the note signed before the provider leaves the clinic",
      howToTrack: "EHR audit logs: % of visits with a signed note by end of day. Track per-provider trend pre/post. Often dramatic in the first 90 days.",
      badge: "Signal",
    },
    {
      label: "Provider Engagement / Burnout Surveys",
      tagline: "Is documentation burden still cited in annual engagement surveys?",
      howToTrack: "Press Ganey provider engagement, MBI, or internal pulse surveys. Isolate the documentation-burden item and trend year over year for Abridge cohort.",
      badge: "Trend",
    },
  ],
  CAPACITY: [
    {
      label: "Patient Panel Size",
      tagline: "Active panel per PCP — moves slowly, but reflects real access expansion when it does",
      howToTrack: "Empanelment data from your population health system. Trend panel size for Abridge-enabled PCPs vs. control. 6–12 month signal; control for retirements and new hires.",
      badge: "Trend",
    },
    {
      label: "No-Show Rate",
      tagline: "Downstream of better access — easier scheduling reduces patient drop-off",
      howToTrack: "Scheduling system reports. Track no-show rate trend monthly. Influenced by reminder workflows and demographics — control for those when interpreting.",
      badge: "Proof",
    },
    {
      label: "New Patient Wait Time (Third Next Available)",
      tagline: "Industry-standard access metric — reflects how quickly a new patient can be seen",
      howToTrack: "Scheduling analytics: median days to third next available appointment. Track per-provider trend. Improvement is slow but compounds.",
      badge: "Trend",
    },
  ],
  REVENUE: [
    {
      label: "E/M Level Distribution",
      tagline: "% of visits at each E/M level — the clearest leading indicator of wRVU lift",
      howToTrack: "Billing system: % of visits at 99213, 99214, 99215 by provider. Compare same provider, same patient mix pre/post. Visible in claims data within 90 days.",
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

export function MethodologyOutpatient({ onBack, onNavigateToSetting }: MethodologyOutpatientProps) {
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
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-3 uppercase tracking-tight">Outpatient: How We Think About Value</h1>
          <p className="text-base text-[#666666]">Where time saved becomes capacity — and capacity becomes revenue or wellbeing</p>
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
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#EA2C00', borderColor: '#EA2C00' }}>Revenue</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">wRVU lift</td><td className="py-3">✅ Yes</td><td className="py-3">wRVU delta × adopted encounters × $33/wRVU</td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">E/M level improvement</td><td className="py-3">✅ Yes</td><td className="py-3">E/M level delta × adopted encounters ×
~$45/level</td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">Denial rate reduction</td><td className="py-3">✅ Yes</td><td className="py-3">Denial pp delta × encounters ×
$350/encounter</td></tr>
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#888888', borderColor: '#888888' }}>Capacity</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">Patient capacity revenue</td><td className="py-3">✅ Yes (if data provided)</td><td className="py-3">Additional
patients/mo × providers × 12 × $200/visit</td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">After-hours time savings</td><td className="py-3 text-[#F59E0B] font-medium">Signal only — not monetized</td><td 
className="py-3">Tracked as hours, not dollars (salaried providers)</td></tr>
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#1A1A1A', borderColor: '#1A1A1A' }}>Quality</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">HCC / risk adjustment</td><td className="py-3">✅ Yes (if MA data provided)</td><td className="py-3">MA patients × gap
rate × recapture % × RAF point value</td></tr>
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#555555', borderColor: '#555555' }}>Workforce</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">Physician retention</td><td className="py-3">✅ Yes (if survey data provided)</td><td className="py-3">Turnovers avoided ×
 $250K–$500K replacement cost</td></tr>
                  
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>

            <CollapsibleSection sectionId="assumptions" title="The Assumptions" subtitle="What we assume to be true, and why">
              <div className="space-y-6">
                <p className="text-[15px] text-black leading-relaxed">Every model rests on assumptions. Here are ours—with ranges, not point estimates.</p>
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
className="py-3">2–4 minutes</td><td className="py-3">3 minutes</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">Based on aggregated deployment experience
across outpatient implementations. Primary care typically 2–4 min, specialists 2–3 min.</p></TooltipContent></Tooltip>
                      <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#EA2C00', borderColor: '#EA2C00' }}>Revenue</span></td></tr>
                      <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">wRVU baseline per visit</td><td 
className="py-3">1.5-2.5</td><td className="py-3">1.8</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">MGMA median wRVU per visit. Varies significantly by
specialty and payer mix.</p></TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">wRVU lift %</td><td 
className="py-3">2-7%</td><td className="py-3">4%</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">Better documentation captures visit complexity more
accurately. Studies show 2-7% improvement in E&M level accuracy.</p></TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">wRVU conversion factor</td><td 
className="py-3">$30-$50</td><td className="py-3">$33</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">CMS MPFS Medicare conversion factor ~$33 (2024).
Commercial payers often higher. Blended rate depends on payer mix.</p></TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Denial rate</td><td 
className="py-3">5-12%</td><td className="py-3">8%</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">MGMA data shows average denial rates 5-12%.
Documentation-related denials are a subset but often preventable.</p></TooltipContent></Tooltip>
                      <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#1A1A1A', borderColor: '#1A1A1A' }}>Quality</span></td></tr>
                      <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">HCC gap rate</td><td 
className="py-3">20-30%</td><td className="py-3">25%</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">Percentage of chronic conditions not captured in
documentation. Industry research shows 25-40% gap rate in typical practices.</p></TooltipContent></Tooltip>
                      <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#555555', borderColor: '#555555' }}>Workforce</span></td></tr>
                      <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Physician replacement cost</td><td 
className="py-3">$250K–$500K</td><td className="py-3">$350,000</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">AMGA Physician Retention Survey; range
reflects recruiting, onboarding, and lost productivity. Excludes lost revenue during vacancy.</p></TooltipContent></Tooltip>
                  
                    </tbody>
                  </table>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection sectionId="honest-limits" title="The Honest Limits" subtitle="What we can prove, what we can support, and what we can only enable">
              <div className="space-y-6">
                <p className="text-[15px] text-black leading-relaxed">Most vendors will tell you their product saves money. We think you deserve to know exactly how confident we are in each claim — and
what it takes to verify it.</p>
                <div className="grid gap-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#22C55E] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can
Measure This</h4></div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Documentation time per encounter:</strong> EHR session data, before/after studies. You'll see this in weeks.</li>
                      <li><strong>wRVU per visit:</strong> Claims data shows E/M distribution shifts. Measurable at 90 days.</li>
                      <li><strong>Same-day note closure:</strong> EHR timestamps. Immediate and unambiguous.</li>
                      <li><strong>After-hours documentation:</strong> Session data shows when charting happens. This is the "pajama time" metric.</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#F59E0B] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can
Influence This</h4></div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Capacity expansion:</strong> Requires patient demand and scheduling intent. We provide the time; you decide how to use it.</li>
                      <li><strong>HCC recapture:</strong> Depends on MA population, baseline gap rate, and coding workflows. Trackable but multi-factorial.</li>
                      <li><strong>Denial prevention:</strong> Doc-related denials are identifiable, but denial rates reflect many process factors.</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#EF4444] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can Only
Enable This</h4></div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Retention:</strong> Documentation burden is one of many burnout drivers. Impact takes 12-18 months to observe. Track it, but don't bet on it alone.</li>
                      <li><strong>Patient satisfaction:</strong> More present providers may improve experience, but CAHPS is influenced by everything from wait times to parking.</li>
                      <li><strong>Referral patterns:</strong> Better documentation may improve referral quality, but attribution is indirect.</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-5 border-l-2 border-[#EA2C00]">
                  <p className="text-sm text-[#666666] leading-relaxed"><strong className="text-black">Our philosophy:</strong> We'd rather show you a smaller number you can defend in a board presentation
than a larger number that falls apart under scrutiny. Key assumptions in our model are editable — because your data should drive the answer, not ours.</p>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection sectionId="validation-path" title="The Validation Path" subtitle="How to prove this with your own data — before, during, and after">
              <div className="space-y-6">
                <p className="text-[15px] text-black leading-relaxed">A model is only as good as its validation. Here's exactly what to measure and when — so you're not relying on our assumptions when you
could be relying on your data.</p>
                <div className="space-y-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-black text-sm uppercase tracking-wide">Before Implementation</h4><span className="text-xs text-[#888888] font-medium">Baseline period</span></div>
                    <p className="text-sm text-[#666666] mb-3">Lock in your baselines before anything changes. This is what makes before/after credible.</p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Pull 12 months of wRVU data by provider and specialty — you need enough volume to see patterns</li>
                      <li>Baseline E/M level distribution (what % at each level, by provider)</li>
                      <li>Document current denial rates by reason code — isolate documentation-related denials</li>
                      <li>Survey physicians on documentation burden — you'll want to repeat this</li>
                      <li>EHR session data: when does charting happen? How much is after-hours?</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 90 Days</h4><span className="text-xs text-[#888888] font-medium">Early signal</span></div>
                    <p className="text-sm text-[#666666] mb-3">Time savings and documentation quality show up fast. Revenue impact takes longer.</p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Repeat time studies — compare doc time per encounter, after-hours charting</li>
                      <li>E/M level comparison: pilot providers vs. baseline (same providers, not just average)</li>
                      <li>Same-day note closure rate — often the most dramatic early metric</li>
                      <li>Provider satisfaction survey — qualitative signal matters here</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 6-12 Months</h4><span className="text-xs text-[#888888] font-medium">Revenue validation</span></div>
                    <p className="text-sm text-[#666666] mb-3">This is where financial impact becomes statistically meaningful.</p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Year-over-year wRVU comparison — control for patient mix and volume changes</li>
                      <li>Denial rate trends by category — isolate documentation-related improvement</li>
                      <li>Capacity utilization: did volumes increase? Were new slots added?</li>
                      <li>HCC recapture rates for MA populations (if applicable)</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3"><h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 18+ Months</h4><span className="text-xs text-[#888888] font-medium">Long-term impact</span></div>
                    <p className="text-sm text-[#666666] mb-3">Retention and culture shifts take time. Don't rush this measurement.</p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Turnover rates: Abridge providers vs. control group</li>
                      <li>Exit interview data — is documentation still cited as a burnout driver?</li>
                      <li>Recruiting pipeline — are candidates asking about AI documentation tools?</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection sectionId="connected-value" title="Connected Value" subtitle="How outpatient documentation connects to the rest of your organization">
              <div className="space-y-4 text-[15px] text-black leading-relaxed">
                <p>Outpatient documentation doesn't exist in isolation. The quality of what's captured in the office visit ripples across the organization:</p>
                <div className="space-y-4 mt-4">
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">Downstream referrals</h4><p className="text-sm text-[#666666] leading-relaxed">When primary care documentation is complete, specialists receive better context. Fewer repeat tests, faster diagnoses, better outcomes. Hard to quantify, but real.</p></div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">Value-based contracts</h4><p className="text-sm text-[#666666] leading-relaxed">HCC accuracy drives risk adjustment in MA plans. Complete documentation supports accurate RAF scores, which determine capitated payments. This is quantified separately in our model for
practices with significant MA populations.</p></div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">Pre-authorization efficiency</h4><p className="text-sm text-[#666666] leading-relaxed">Complete clinical documentation reduces prior auth denials and the back-and-forth that consumes staff time. We don't model this directly, but organizations with high prior auth volumes
report meaningful time savings.</p></div>
                </div>
                <p className="text-[#666666] italic mt-4">We don't sum these into the ROI model because the attribution gets fuzzy. But they're real — and they're part of the strategic case for
documentation quality that goes beyond the numbers.</p>
              </div>
            </CollapsibleSection>
        </DomainTabExplorer>

        <motion.div className="mt-12 bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] rounded-lg p-8 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="text-xl font-bold text-white mb-2">Ready to Build Your Model?</h3>
          <p className="text-[#999999] mb-6 text-sm">Use these methodology principles to create a customized ROI model for your outpatient practice.</p>
          <button onClick={onBack} className="inline-flex items-center gap-2 bg-[#EA2C00] hover:bg-[#D12600] text-white font-medium px-6 py-3 rounded-lg transition-colors" data-testid="button-build-model">
            Build an Outpatient Model <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        <p className="text-xs text-[#888888] leading-relaxed mt-10 mb-2">Projections are modeled estimates based on user-provided inputs, published industry benchmarks, and aggregated deployment
experience. Actual results may vary based on implementation approach, provider adoption, organizational factors, and care setting. This methodology does not constitute a guarantee of financial
outcomes.</p>

        <div className="mt-12 mb-8">
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Related Methodologies</p>
          <p className="text-sm text-[#666666] mb-6">Outpatient documentation connects to other care settings. Explore how value flows in related contexts.</p>
          <div className="grid md:grid-cols-3 gap-4">
            <button onClick={() => onNavigateToSetting?.("ed")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-ed">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Activity className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Emergency</p><p className="text-xs text-[#888888]">Throughput & LWBS</p></div>
            </button>
            <button onClick={() => onNavigateToSetting?.("inpatient")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-inpatient">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Building2 className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Inpatient</p><p className="text-xs text-[#888888]">DRG & documentation quality</p></div>
            </button>
            <button onClick={() => onNavigateToSetting?.("nursing")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-nursing">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Heart className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Nursing</p><p className="text-xs text-[#888888]">OT reduction & retention</p></div>
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
