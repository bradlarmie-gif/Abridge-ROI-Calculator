import { motion } from "framer-motion";
import { ArrowLeft, Download, ArrowRight, Activity, Building2, Stethoscope, Loader2 } from "lucide-react";
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

interface MethodologyNursingProps {
  onBack: () => void;
  onNavigateToSetting?: (setting: string) => void;
}

const overviewCards: DomainCardData[] = [
  {
    domain: "QUALITY",
    description: "Documentation completeness enables earlier intervention, better care continuity, and regulatory compliance. We model this domain to help surface where your data could tell the story — not to set a number before you've looked.",
    items: [
      { label: "HAPI and falls prevention", badge: "Emerging" },
      { label: "CAUTI / CLABSI / Sepsis SEP-1 compliance", badge: "Strategic" },
      { label: "HCAHPS / patient experience", badge: "Strategic" },
    ],
  },
  {
    domain: "WORKFORCE",
    description: "Nursing turnover is the most expensive workforce problem in healthcare. Documentation burden is a measurable driver. We model this domain to help surface where your data could tell the story — not to set a number before you've looked.",
    items: [
      { label: "Retention savings", badge: "Emerging" },
      { label: "Agency labor reduction", badge: "Emerging" },
    ],
  },
  {
    domain: "CAPACITY",
    description: "Overtime reduction is the most direct, payroll-verified financial driver in nursing — uniquely monetizable. We model this domain to help surface where your data could tell the story — not to set a number before you've looked.",
    items: [
      { label: "Overtime reduction (payroll data)", badge: "Demonstrated" },
    ],
  },
  {
    domain: "REVENUE",
    description: "Nurses don't bill directly. Revenue impact flows through quality, safety, and workforce stability — not billing. We model this domain to help surface where your data could tell the story — not to set a number before you've looked.",
    items: [
      { label: "Not applicable — nurses don't bill", badge: "Strategic" },
    ],
  },
];

const domainDetails: DomainDetailData[] = [
  {
    domain: "QUALITY",
    sectionTitle: "Quality",
    sectionSubtitle: "Safety events, compliance, and patient experience — where nursing documentation quality has its biggest impact",
    items: [
      {
        label: "HAPI and Falls Prevention",
        badge: "Emerging",
        explanation: "Hospital-Acquired Pressure Injuries (HAPIs) and falls are preventable safety events with significant cost and regulatory consequences. Better real-time nursing documentation enables earlier risk identification and intervention. The documentation-to-prevention link is attributable with confidence over time — but requires operational changes alongside documentation improvement. Track HAPI and fall rates on pilot units vs. control as a 12+ month signal.",
        formula: "Current HAC events × 5% documentation-preventable rate × average cost per event\n\nHAPI: $10K–$100K+ per event depending on severity. Falls: $14K–$35K per event.",
        limit: "Documentation is one enabler of HAC prevention — not the only factor. Staffing ratios, protocols, and equipment all matter. Don't attribute HAC reduction entirely to documentation.",
      },
      {
        label: "CAUTI / CLABSI / Sepsis SEP-1 Compliance",
        badge: "Strategic",
        explanation: "Real-time nursing documentation supports bundle compliance for CAUTI, CLABSI, and Sepsis SEP-1 measures. When assessments, interventions, and clinical observations are captured accurately and promptly, care team coordination improves and documentation gaps that create compliance risk are reduced. This is clinically meaningful and real — but direct financial attribution is multi-factorial and difficult to isolate to documentation alone.",
        limit: "Track compliance rates as a quality signal after implementation. Financial attribution requires isolating documentation's contribution from protocol adherence, staffing, and other factors.",
      },
      {
        label: "HCAHPS / Patient Experience",
        badge: "Strategic",
        explanation: "When nurses spend less time on documentation burden, they spend more time at the bedside. Research consistently shows bedside time correlates with patient satisfaction scores. Hospitals in the top HCAHPS quartile receive ~2% higher reimbursement through Value-Based Purchasing. We don't attribute HCAHPS improvement directly to documentation — too many variables — but it's a directional signal worth tracking as a leading indicator.",
        limit: "HCAHPS is influenced by everything from wait times to room cleanliness to physician communication. Track as a directional signal, not a direct attribution.",
      },
    ],
    honestLimit: "Quality value in nursing is real but often manifests as risk reduction and safety improvement rather than direct revenue. Track as a strategic story and a VBP conversation.",
  },
  {
    domain: "WORKFORCE",
    sectionTitle: "Workforce",
    sectionSubtitle: "Nursing retention and agency reduction — the two most financially significant workforce levers",
    items: [
      {
        label: "Retention Savings",
        badge: "Emerging",
        explanation: "Nursing turnover is the most expensive workforce problem in healthcare — NSI 2023 data shows a national average turnover rate of ~22.5%, with replacement costs ranging from $46K–$100K+ per nurse depending on specialty. Documentation burden is cited in ANA surveys as a top contributor to 30–50% of voluntary turnover. Retaining nurses who would otherwise leave due to burnout is a real and attributable financial outcome — but takes 12–18 months to observe.",
        formula: "Nurses × turnover rate × burnout % × Abridge impact % × replacement cost\n\nDefaults: turnover 18%, burnout attribution 40%, Abridge impact 15%, replacement cost $65K",
        limit: "Documentation burden is one burnout driver among many. Don't attribute all turnover change to documentation without exit interview data and validated burnout surveys to support the attribution.",
      },
      {
        label: "Agency Labor Reduction",
        badge: "Emerging",
        explanation: "When documentation burden contributes to turnover, remaining staff absorb heavier loads, burnout accelerates, and agency fill rates increase. The cycle compounds. Reducing documentation burden is one input to breaking the cycle — by improving retention, reducing vacancy rates, and decreasing reliance on agency staffing at premium costs. Agency spend is directly trackable from invoices and budget data.",
        formula: "Observed agency spend reduction × attribution % (based on retention improvement correlation)",
        limit: "Agency spend is affected by many factors — market availability, unit census, scheduling decisions. Work with your workforce analytics team to isolate documentation-driven retention improvement.",
      },
    ],
    honestLimit: "Retention and agency reduction are the two biggest nursing financial levers, and both are attributable with confidence over 12–18 months. Start tracking burnout surveys and exit data immediately — you'll need it for the attribution story.",
  },
  {
    domain: "CAPACITY",
    sectionTitle: "Capacity",
    sectionSubtitle: "Overtime reduction — the only care setting where time savings convert directly to a payroll dollar",
    items: [
      {
        label: "Overtime Reduction (Payroll Data)",
        badge: "Demonstrated",
        explanation: "Nursing is the only care setting in this methodology where we monetize time savings directly through overtime reduction. In physician settings (outpatient, ED, inpatient), physicians are salaried — time savings are modeled as capacity or retention signal. Nurses often work overtime to complete documentation after their shift ends. The mechanism we're modeling: when documentation burden decreases, on-time shift completion tends to improve and a portion of that time shows up as reduced overtime. Organizations have observed this pattern, but the magnitude varies by unit — your payroll data within 90 days will confirm or adjust the assumption.",
        formula: "Hours saved per shift × OT conversion rate × nurses × OT hourly rate × 52 weeks\n\nDefaults: 20 min/shift saved, 25% OT conversion rate, OT rate = 1.5× base hourly",
        limit: "Not all saved time converts to OT reduction. Accounts for nurses already leaving on time, shift overlap, and other documentation tasks that fill saved time. OT conversion rate of 15–40% is realistic — use your unit-level payroll data to calibrate.",
      },
    ],
    honestLimit: "Overtime reduction is the most defensible financial signal in nursing — payroll data makes it verifiable within 90 days. This is your lead metric for the 90-day validation conversation.",
  },
  {
    domain: "REVENUE",
    sectionTitle: "Revenue",
    sectionSubtitle: "Revenue impact flows through quality, safety, and workforce — not direct billing",
    items: [
      {
        label: "Not Applicable — Nurses Don't Bill Directly",
        badge: "Strategic",
        explanation: "Unlike physicians in ED, outpatient, or inpatient settings, nurses do not generate direct billing revenue. Nursing's revenue impact flows through three indirect channels: (1) quality and safety outcomes that affect Value-Based Purchasing reimbursement; (2) workforce stability that reduces agency costs and preserves operational capacity; (3) support for physician documentation that enables more accurate DRG and CC/MCC coding. These are real and meaningful — but they belong in the Quality, Workforce, and Capacity domains, not a billing revenue line.",
        limit: "The ROI case for nursing is strongest when built on overtime reduction (demonstrated, fast) and retention savings (emerging, 12–18 months). Don't try to build a billing revenue case — it doesn't hold up.",
      },
    ],
    honestLimit: "Nursing ROI is a workforce and quality story, not a billing story. The numbers are real and defensible — they just live in different domains than physician ROI.",
  },
];

export function MethodologyNursing({ onBack, onNavigateToSetting }: MethodologyNursingProps) {
  const [isExporting, setIsExporting] = useState(false);
  const domainRefs = useRef<Partial<Record<DomainName, HTMLDivElement | null>>>({});

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
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-3 uppercase tracking-tight">Nursing: How We Think About Value</h1>
          <p className="text-base text-[#666666]">Where overtime reduction is the lead metric — and retention is the long game</p>
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
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#888888', borderColor: '#888888' }}>Capacity</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">Overtime reduction</td><td className="py-3">✅ Yes (nursing only)</td><td className="py-3">Hours saved × OT conversion
rate × OT hourly rate × 52 weeks</td></tr>
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#555555', borderColor: '#555555' }}>Workforce</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">Nurse retention</td><td className="py-3">✅ Yes (if survey data provided)</td><td className="py-3">Turnovers avoided ×
$50K–$100K replacement cost</td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">Agency / locum spend</td><td className="py-3">✅ Yes (if data provided)</td><td className="py-3">Observed agency spend
reduction × attribution %</td></tr>
                    <tr><td colSpan={3} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#1A1A1A', borderColor: '#1A1A1A' }}>Quality</span></td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">Falls / HAPI prevention</td><td className="py-3 text-[#F59E0B] font-medium">Potential value — shown separately</td><td 
className="py-3">Current events × 5% doc-preventable rate × cost/event</td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">HCAHPS improvement</td><td className="py-3 text-[#F59E0B] font-medium">Signal only — not calculated</td><td 
className="py-3">Too many confounding variables to attribute</td></tr>
                    <tr className="border-b border-[#E5E5E5]"><td className="py-3">CC/MCC support for inpatient</td><td className="py-3">Not here — see Inpatient</td><td className="py-3">Captured in CMI
delta calculation</td></tr>
                  
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
                        <th className="text-left py-3 font-semibold text-black">Source</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#666666]">
                      <tr><td colSpan={4} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#888888', borderColor: '#888888' }}>Capacity</span></td></tr>
                      <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Time saved per shift</td><td 
className="py-3">15-30 minutes</td><td className="py-3">20 minutes</td><td className="py-3">Abridge customer data</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p 
className="text-xs">Based on time-motion studies across 12+ nursing implementations. Varies by unit type and existing documentation workflows.</p></TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">OT conversion rate</td><td 
className="py-3">15-40%</td><td className="py-3">25%</td><td className="py-3">Implementation studies</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">Not all
 saved time converts to OT reduction. Accounts for nurses already leaving on time, shift overlap, and other documentation tasks.</p></TooltipContent></Tooltip>
                      <tr><td colSpan={4} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#555555', borderColor: '#555555' }}>Workforce</span></td></tr>
                      <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Nurse turnover rate</td><td 
className="py-3">15-25%</td><td className="py-3">18%</td><td className="py-3">NSI Nursing Solutions</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">NSI 2023
 National Healthcare Retention & RN Staffing Report. National average ~22.5%, we use conservative 18%.</p></TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Burnout-related %</td><td 
className="py-3">30-50%</td><td className="py-3">40%</td><td className="py-3">ANA surveys</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">American Nurses
Association workplace surveys indicate burnout contributes to 30-50% of voluntary turnover. Documentation burden is a key burnout driver.</p></TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Abridge retention impact</td><td 
className="py-3">10-25%</td><td className="py-3">15%</td><td className="py-3">Conservative estimate</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p 
className="text-xs">Conservative estimate of retention improvement from reduced documentation burden. Actual impact depends on baseline burden and organizational factors.</p></TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Replacement cost</td><td 
className="py-3">$50K–$100K</td><td className="py-3">$65,000</td><td className="py-3">NSI 2023 Nursing Retention Report</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p 
className="text-xs">NSI 2023 Report range: $46K–$52K for standard bedside RN. Specialty and ICU nurses carry higher replacement costs. We use $65K as a conservative midpoint.</p></TooltipContent></Tooltip>
                      <tr><td colSpan={4} className="pt-5 pb-1"><span className="text-xs font-bold uppercase tracking-[1.5px] pl-3 border-l-2" style={{ color: '#1A1A1A', borderColor: '#1A1A1A' }}>Quality</span></td></tr>
                      <Tooltip><TooltipTrigger asChild><tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors"><td className="py-3">Documentation-preventable HAE</td><td 
className="py-3">3-10%</td><td className="py-3">5%</td><td className="py-3">Conservative estimate</td></tr></TooltipTrigger><TooltipContent side="top" className="max-w-xs"><p className="text-xs">Percentage
 of hospital-acquired events where better real-time documentation could have enabled earlier intervention. Intentionally conservative.</p></TooltipContent></Tooltip>
                  
                    </tbody>
                  </table>
                </div>
                <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                  <p className="text-sm text-[#666666]"><strong className="text-black">Why we default conservative:</strong> It's better to exceed expectations than to fall short. If your organization's
data suggests higher impact, adjust the assumptions— but start skeptical.</p>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection sectionId="honest-limits" title="The Honest Limits" subtitle="What we can measure vs. what we can only influence">
              <div className="space-y-6">
                <p className="text-[15px] text-black leading-relaxed">Not all value is created equal. Here's our honest assessment of measurability.</p>
                <div className="grid gap-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#22C55E] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">Direct &
Measurable</h4></div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Overtime hours:</strong> payroll data, before/after by unit. This is a hard dollar line — verifiable from your payroll system within 90 days.</li>
                      <li><strong>Documentation time:</strong> EHR time stamps, time studies</li>
                      <li><strong>Agency spend:</strong> Invoices, budget line items</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#F59E0B] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">Logical &
Attributable</h4></div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Retention improvement:</strong> Requires 6-12 months of data, survey correlation</li>
                      <li><strong>Burnout reduction:</strong> Measurable via validated instruments (MBI, etc.)</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3"><div className="w-3 h-3 bg-[#EF4444] rounded-full" /><h4 className="font-semibold text-black text-sm uppercase tracking-wide">Indirect &
Harder to Attribute</h4></div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Falls/HAPI prevention:</strong> Multiple factors; documentation is one enabler</li>
                      <li><strong>HCAHPS improvement:</strong> Many variables; can track but not attribute</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-[#F5F0EB] rounded-lg p-4 text-sm text-[#666666] leading-relaxed">
                  Nursing is the only care setting in this methodology where we monetize time savings directly through overtime. In physician settings (outpatient, ED, inpatient), physicians are salaried —
 time savings are modeled as capacity or retention signal, not as a payroll line.
                </div>
                <div className="border-l-2 border-[#EA2C00] pl-4">
                  <p className="text-[15px] text-[#666666]"><strong className="text-black">Our approach:</strong> We calculate everything, but we label it honestly. Direct value goes in the primary ROI.
Indirect value is shown separately as "potential" so you can decide how much weight to give it.</p>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection sectionId="validation-path" title="The Validation Path" subtitle="How to validate these assumptions with your own data">
              <div className="space-y-6">
                <p className="text-[15px] text-black leading-relaxed">Our defaults are starting points. Here's how to validate them in your organization.</p>
                <div className="space-y-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <h4 className="font-semibold text-black mb-3 text-sm uppercase tracking-wide">Before Implementation</h4>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Pull 12 months of overtime data by unit</li>
                      <li>Review agency spend and fill rates</li>
                      <li>Survey nurses on documentation burden (use validated tools)</li>
                      <li>Baseline your HAC rates (falls, HAPIs)</li>
                      <li>Document current turnover rates by tenure band</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <h4 className="font-semibold text-black mb-3 text-sm uppercase tracking-wide">At 90 Days</h4>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Time studies: documentation time before/after</li>
                      <li>OT hours on pilot units vs. control</li>
                      <li>Re-survey nurses on burden (same instrument)</li>
                      <li>Qualitative: manager observations on shift completion</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <h4 className="font-semibold text-black mb-3 text-sm uppercase tracking-wide">At 12 Months</h4>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Year-over-year OT and agency comparison</li>
                      <li>Turnover rates on Abridge units vs. system</li>
                      <li>HAC rate trends (may need longer timeframe)</li>
                      <li>HCAHPS scores (directional, not attributable)</li>
                    </ul>
                  </div>
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <h4 className="font-semibold text-black mb-3 text-sm uppercase tracking-wide">At 18+ Months</h4>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Year-over-year turnover rates on Abridge-enabled units vs. rest of system</li>
                      <li>Agency spend: compare against 18-month pre-implementation baseline</li>
                      <li>Exit interview data: is documentation burden still cited as a departure factor?</li>
                      <li>Retention intent surveys: are nurses in Abridge units reporting higher intent to stay?</li>
                    </ul>
                  </div>
                </div>
                <div className="bg-[#FFF8F0] border border-[#EA2C00]/20 rounded-lg p-5">
                  <p className="text-sm text-[#666666]"><strong className="text-black">The goal isn't to prove our model right.</strong> It's to build your organization's understanding of what ambient
documentation actually delivers in your context. Adjust the model based on what you learn.</p>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection sectionId="connected-value" title="Connected Value" subtitle="How nursing documentation supports the broader care system">
              <div className="space-y-4 text-[15px] text-black leading-relaxed">
                <p>Nursing is often framed as a cost center. The documentation picture changes that framing.</p>
                <div className="space-y-4 mt-4">
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">Nursing → Inpatient (CC/MCC support)</h4><p className="text-sm text-[#666666] leading-relaxed">Nursing documentation captures clinical observations that CDI teams use to support CC/MCC coding — skin assessments, fall risk factors, nutritional status, wound care. When
nursing notes are complete and real-time, CDI specialists have stronger evidence to defend appropriate DRG assignment. This is quantified in the inpatient methodology rather than here, to avoid
double-counting.</p></div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">Nursing → Patient Experience (HCAHPS signal)</h4><p className="text-sm text-[#666666] leading-relaxed">When nurses spend less time on documentation, they spend more time at the bedside. Research consistently shows bedside time correlates with patient satisfaction scores. We
don't attribute HCAHPS improvement directly to documentation — too many variables — but it's a directional signal worth tracking as a leading indicator after implementation.</p></div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]"><h4 className="font-bold text-black mb-2 text-sm">Nursing → Workforce Stability (system-level)</h4><p className="text-sm text-[#666666] leading-relaxed">Nursing turnover creates ripple effects: remaining staff absorb heavier loads, burnout accelerates, and the cycle continues. When documentation burden is reduced and
retention improves even modestly, the stabilization effect compounds. The system-level value of a stable nursing workforce exceeds what any single-unit retention calculation shows.</p></div>
                </div>
                <p className="text-[#666666] italic mt-4">We don't sum cross-setting values into the nursing model — attribution gets complex when value flows through multiple teams. But when building a
system-level business case, these connections are part of the story.</p>
              </div>
            </CollapsibleSection>
          </div>
        </div>

        <motion.div className="mt-12 bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] rounded-lg p-8 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="text-xl font-bold text-white mb-2">Ready to Build Your Model?</h3>
          <p className="text-[#999999] mb-6 text-sm">Use these methodology principles to create a customized ROI model for your nursing program.</p>
          <button onClick={onBack} className="inline-flex items-center gap-2 bg-[#EA2C00] hover:bg-[#D12600] text-white font-medium px-6 py-3 rounded-lg transition-colors" data-testid="button-build-model">
            Build a Nursing Model <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        <p className="text-xs text-[#888888] leading-relaxed mt-10 mb-2">Projections are modeled estimates based on user-provided inputs, published industry benchmarks, and aggregated deployment
experience. Actual results may vary based on implementation approach, provider adoption, organizational factors, and care setting. This methodology does not constitute a guarantee of financial
outcomes.</p>

        <div className="mt-12 mb-8">
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Related Methodologies</p>
          <p className="text-sm text-[#666666] mb-6">Nursing documentation often connects to broader care settings. Explore how value flows in related contexts.</p>
          <div className="grid md:grid-cols-3 gap-4">
            <button onClick={() => onNavigateToSetting?.("inpatient")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-inpatient">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Building2 className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Inpatient</p><p className="text-xs text-[#888888]">DRG & documentation quality</p></div>
            </button>
            <button onClick={() => onNavigateToSetting?.("ed")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-ed">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Activity className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Emergency</p><p className="text-xs text-[#888888]">Throughput & LWBS</p></div>
            </button>
            <button onClick={() => onNavigateToSetting?.("outpatient")} className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left" data-testid="link-setting-outpatient">
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center"><Stethoscope className="w-5 h-5 text-[#EA2C00]" /></div>
              <div><p className="font-medium text-black text-sm">Outpatient</p><p className="text-xs text-[#888888]">wRVU & patient access</p></div>
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
