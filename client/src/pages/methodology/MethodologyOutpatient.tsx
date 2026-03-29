import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronUp, Download, ArrowRight, Activity, Building2, Heart, Loader2 } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { generateMethodologyPDF } from "@/lib/methodology-pdf-export";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';

interface MethodologyOutpatientProps {
  onBack: () => void;
  onNavigateToSetting?: (setting: string) => void;
}

interface SectionProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  sectionId: string;
}

function CollapsibleSection({ title, subtitle, children, defaultOpen = false, sectionId }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border-b border-[#E5E5E5] last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-start justify-between text-left"
        data-testid={`button-section-${sectionId}`}
      >
        <div>
          <h2 className="text-lg font-bold text-black uppercase tracking-tight">{title}</h2>
          <p className="text-sm text-[#888888] mt-1">{subtitle}</p>
        </div>
        <div className="ml-4 mt-1">
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-[#888888]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#888888]" />
          )}
        </div>
      </button>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="pb-8"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

function MechanismCard({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-lg mb-4 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 flex items-center justify-between text-left hover:bg-[#F9FAFB] transition-colors"
        data-testid={`button-mechanism-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <h4 className="font-semibold text-black uppercase tracking-wide text-sm">{title}</h4>
        <div className="ml-4 flex-shrink-0">
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-[#888888]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#888888]" />
          )}
        </div>
      </button>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-6 pb-6"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

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
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-[800px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href="/"
              onClick={(e) => { e.preventDefault(); onBack(); }}
              className="flex items-center"
              data-testid="link-home-logo"
            >
              <img src={abridgeLogo} alt="Abridge" className="h-5 md:h-6" />
            </a>
            <span className="text-[#E5E5E5]">|</span>
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-[#666666] hover:text-black transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="w-3 h-3" />
              <span className="text-xs font-medium uppercase tracking-wide">Methodology</span>
            </button>
          </div>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 text-[#666666] hover:text-black transition-colors text-sm disabled:opacity-50"
            data-testid="button-export-pdf"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? "Exporting..." : "Export PDF"}</span>
          </button>
        </div>
      </header>

      <div className="max-w-[800px] mx-auto px-6 py-12">
        {/* Hero Section */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-3 uppercase tracking-tight">
            Outpatient: How We Think About Value
          </h1>
          <p className="text-base text-[#666666]">
            Where billing creates a clear path from time to revenue
          </p>
        </motion.div>

        {/* Sections */}
        <div className="bg-[#F5F0EB] rounded-lg">
          <div className="px-6">
            {/* Section 1: The Context */}
            <CollapsibleSection
              sectionId="context"
              title="The Context"
              subtitle="Why outpatient has the clearest path from time to value — and why that doesn't make it simple"
              defaultOpen={true}
            >
              <div className="space-y-4 text-[15px] text-black leading-relaxed">
                <p>
                  Outpatient is the setting where everyone starts the ROI conversation — because 
                  the math looks easy. A physician saves 3 minutes per visit. Multiply by encounters, 
                  multiply by hourly rate. Done.
                </p>
                <p>
                  Except it's not that simple. The 3 minutes is real. But what happens to those 3 minutes 
                  is a strategic question that each organization answers differently.
                </p>
                <p>
                  Some practices reinvest in capacity — more patients, more revenue. Others let physicians 
                  go home on time — less burnout, better retention. Some see the bigger win in documentation 
                  quality: notes that actually capture the complexity of the visit, leading to appropriate 
                  E/M coding and fewer denials. Most organizations see a combination of all three.
                </p>
                <p>
                  The billing relationship makes outpatient the most <em>traceable</em> setting. Every wRVU has 
                  a dollar conversion. Every visit has a claim. Every denial has a root cause. Unlike nursing, 
                  where value shows up in labor economics, or inpatient, where DRG weight drives everything — 
                  outpatient value can be tracked visit by visit.
                </p>
                <p>
                  But traceable doesn't mean automatic. The value only realizes if the organization makes 
                  decisions about how to use recaptured time.
                </p>
                <p className="font-semibold">Two value lanes — both real, both different to measure:</p>

                <div className="space-y-4 mt-6">
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm uppercase tracking-wide">1. Time Recaptured</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      Reduced pajama time and after-hours documentation. Less need for locums or overtime. 
                      Potential to see more patients — or the same patients with less burnout. The question 
                      isn't whether time is saved. It's what your organization does with it.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm uppercase tracking-wide">2. Documentation Quality</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      Most clinical conversations contain complexity that gets discussed but doesn't 
                      make it into the note. That gap costs money — in under-coded visits, missed HCC 
                      conditions, and denials that can't be appealed because the documentation wasn't 
                      there. Abridge captures what's said, so the note reflects what actually happened.
                    </p>
                  </div>
                </div>

                <div className="mt-6 bg-white rounded-lg p-5 border-l-2 border-[#EA2C00]">
                  <p className="text-sm text-[#666666] leading-relaxed">
                    <strong className="text-black">Our approach:</strong> We model both lanes — but we're honest about 
                    which value is directly measurable and which depends on downstream decisions. Time savings are 
                    defensible in any conversation. Revenue optimization depends on coding workflows, payer mix, 
                    and whether your practice actually has patient demand to fill new slots.
                  </p>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section 2: The Value Mechanisms */}
            <CollapsibleSection
              sectionId="value-mechanisms"
              title="The Value Mechanisms"
              subtitle="How time saved becomes dollars"
            >
              {/* Time Efficiency */}
              <div className="mb-8">
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                  Time Saved → Efficiency Value
                </p>
                <div className="h-px bg-[#D1D5DB] mb-6" />

                <div className="bg-white border border-[#E5E5E5] rounded-lg p-6 mb-4">
                  <p className="text-[15px] text-black leading-relaxed">
                    Time saved in outpatient goes to one of three places: additional patients seen with recovered 
                    appointment capacity, same patients with better documentation quality, or provider wellbeing. 
                    We model the first two financially. The third is tracked as a leading indicator for retention — 
                    not as a dollar line — because physicians are salaried and hourly rate calculations don't 
                    reflect how their time is actually compensated.
                  </p>
                </div>

                <MechanismCard title="Patient Capacity">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        If a provider saves 3 minutes per visit across 20 visits, that's 60 minutes. 
                        Some practices convert that time to additional patient slots — if demand exists 
                        and access is a strategic priority. Others don't, and that's a legitimate choice.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        Hours freed × % allocated to capacity × Revenue per visit × Realization rate
                      </p>
                    </div>
                    <div className="border-l-2 border-[#EA2C00] pl-4">
                      <p className="text-[#888888] mb-1">Why this is defensible:</p>
                      <p className="text-[#666666]">
                        Schedule utilization data shows open slots. Patient wait-lists show demand. 
                        Volume trends can be tracked pre/post. The conversion rate is the key variable — 
                        we default to 30-50% because not all freed time becomes visits, and we'd rather 
                        undercount than overclaim.
                      </p>
                    </div>
                    <div className="bg-[#FFF8F0] border border-[#EA2C00]/20 rounded-lg p-4">
                      <p className="text-[#666666]">
                        <strong className="text-black">Honest limit:</strong> Capacity expansion requires 
                        patient demand, scheduling changes, and organizational intent. If your panels are 
                        full and access isn't a priority, this lever is smaller. We let you adjust or disable it.
                      </p>
                    </div>
                  </div>
                </MechanismCard>

                <MechanismCard title="Clinician Wellbeing & Retention">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        Burnout drives turnover. Documentation burden is consistently cited as a top contributor 
                        to burnout. Reducing the burden can help retain physicians who would otherwise leave — 
                        and physician replacement is extraordinarily expensive.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        Providers × Turnover rate × Burnout % × Abridge impact % × Replacement cost
                      </p>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">Key assumptions:</p>
                      <ul className="text-[#666666] space-y-1 ml-4 list-disc">
                        <li>Physician replacement cost: $250,000-$500,000 (AMGA Physician Retention Survey)</li>
                        <li>Burnout-related turnover: 30-50% of all physician turnover</li>
                        <li>Abridge impact on burnout-related turnover: 10-20%</li>
                      </ul>
                    </div>
                    <div className="border-l-2 border-[#EA2C00] pl-4">
                      <p className="text-[#888888] mb-1">Why this is defensible:</p>
                      <p className="text-[#666666]">
                        The link between documentation burden and burnout is well-established — AMA, KLAS, 
                        and Medscape surveys consistently rank it as a top driver. The question is magnitude, 
                        not direction. We use conservative impact rates because documentation is one of many 
                        burnout factors.
                      </p>
                    </div>
                    <p className="text-[#666666] italic">
                      This is the slowest ROI lever to measure — 12-18 months minimum — but often the largest 
                      in absolute dollar terms.
                    </p>
                  </div>
                </MechanismCard>
              </div>

              {/* Documentation Quality */}
              <div>
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                  Documentation Quality → Revenue Value
                </p>
                <div className="h-px bg-[#D1D5DB] mb-6" />

                <MechanismCard title="wRVU Accuracy">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        Most visits contain clinical complexity that gets discussed but doesn't make it 
                        into the note. A 99214 that should have been a 99215. A procedure that was performed 
                        but not documented. This is capturing what actually happened.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        (wRVU per encounter after) − (wRVU per encounter before) × adopted encounters × $33/wRVU × attribution % × realization %
                      </p>
                    </div>
                    <div className="border-l-2 border-[#EA2C00] pl-4">
                      <p className="text-[#888888] mb-1">Why this is defensible:</p>
                      <p className="text-[#666666]">
                        This uses your observed before/after wRVU per encounter — not an assumed lift percentage. 
                        The delta is what your data shows. The attribution range (50–75%) accounts for other 
                        factors that may have contributed to the change.
                      </p>
                    </div>
                  </div>
                </MechanismCard>

                <MechanismCard title="HCC / Risk Adjustment">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        In Medicare Advantage, documentation specificity directly affects the Hierarchical Condition Category 
                        codes assigned to patients. HCC codes determine the Risk Adjustment Factor (RAF) score, which 
                        determines the capitated payment rate. When ambient documentation captures chronic conditions, 
                        comorbidities, and clinical complexity with greater specificity, RAF scores more accurately reflect 
                        the actual burden of care — and payments follow.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        MA patients × HCC gap rate × recapture improvement % × RAF point value × per-member-per-year payment = HCC value
                      </p>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">The key assumptions:</p>
                      <ul className="text-[#666666] space-y-1 ml-4 list-disc">
                        <li>HCC gap rate: 20–30% — industry research shows 25–40% of chronic conditions go under-documented in a typical practice</li>
                        <li>Recapture improvement: 10–20% of existing gaps — conservative; depends on provider adoption and coding workflows</li>
                        <li>RAF point value: varies by CMS payment model; typically $800–$1,500 per HCC point per member per year</li>
                        <li>Per-member-per-year payment: your MA contract rate — this number lives in your payer contracts, not in any benchmark</li>
                      </ul>
                    </div>
                    <div className="border-l-2 border-[#EA2C00] pl-4">
                      <p className="text-[#888888] mb-1">Why this requires your data:</p>
                      <p className="text-[#666666]">
                        HCC value is real but it requires three numbers from your organization: your MA patient panel size, 
                        your current RAF score, and your payer's per-member-per-year rate. Without those, any estimate is a 
                        benchmark range, not a calculation. If you have those numbers, this is often the largest single value 
                        driver in the outpatient model.
                      </p>
                    </div>
                    <p className="text-[#666666] italic">
                      If your practice has less than 20% Medicare Advantage patients, this driver is likely immaterial. If MA 
                      represents 30%+ of your panel, it warrants a dedicated conversation with your revenue cycle team 
                      before the next contract negotiation.
                    </p>
                  </div>
                </MechanismCard>

                <MechanismCard title="Denial Prevention">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        Here's the number most organizations don't track well: 30-40% of claim denials 
                        are "unappealable" — permanent revenue loss because the documentation wasn't there 
                        at the time of service. You can't retroactively document medical necessity. Abridge 
                        captures clinical reasoning in real-time, preventing these gaps before they become denials.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        (denial rate before − denial rate after, in percentage points) × annual encounters × avg denial cost per encounter × attribution %
                      </p>
                    </div>
                    <div className="border-l-2 border-[#EA2C00] pl-4">
                      <p className="text-[#888888] mb-1">Why this is defensible:</p>
                      <p className="text-[#666666]">
                        Outpatient default: $350 per encounter. Attribution range applied — the doc-related share 
                        of denials is captured in the attribution factor, not as a separate multiplier.
                      </p>
                    </div>
                  </div>
                </MechanismCard>
              </div>
            </CollapsibleSection>

            {/* Section: What Goes Into the Number */}
            <CollapsibleSection
              sectionId="what-goes-in"
              title="What Goes Into the Number"
              subtitle="Exactly what the calculator uses — and what it doesn't"
              defaultOpen={false}
            >
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
                    <tr className="border-b border-[#E5E5E5]">
                      <td className="py-3">wRVU lift</td>
                      <td className="py-3">✅ Yes</td>
                      <td className="py-3">wRVU delta × adopted encounters × $33/wRVU</td>
                    </tr>
                    <tr className="border-b border-[#E5E5E5]">
                      <td className="py-3">E/M level improvement</td>
                      <td className="py-3">✅ Yes</td>
                      <td className="py-3">E/M level delta × adopted encounters × ~$45/level</td>
                    </tr>
                    <tr className="border-b border-[#E5E5E5]">
                      <td className="py-3">Denial rate reduction</td>
                      <td className="py-3">✅ Yes</td>
                      <td className="py-3">Denial pp delta × encounters × $350/encounter</td>
                    </tr>
                    <tr className="border-b border-[#E5E5E5]">
                      <td className="py-3">Patient capacity revenue</td>
                      <td className="py-3">✅ Yes (if data provided)</td>
                      <td className="py-3">Additional patients/mo × providers × 12 × $200/visit</td>
                    </tr>
                    <tr className="border-b border-[#E5E5E5]">
                      <td className="py-3">HCC / risk adjustment</td>
                      <td className="py-3">✅ Yes (if MA data provided)</td>
                      <td className="py-3">MA patients × gap rate × recapture % × RAF point value</td>
                    </tr>
                    <tr className="border-b border-[#E5E5E5]">
                      <td className="py-3">Physician retention</td>
                      <td className="py-3">✅ Yes (if survey data provided)</td>
                      <td className="py-3">Turnovers avoided × $250K–$500K replacement cost</td>
                    </tr>
                    <tr className="border-b border-[#E5E5E5]">
                      <td className="py-3">After-hours time savings</td>
                      <td className="py-3 text-[#F59E0B] font-medium">Signal only — not monetized</td>
                      <td className="py-3">Tracked as hours, not dollars (salaried providers)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>

            {/* Section 3: The Assumptions */}
            <CollapsibleSection
              sectionId="assumptions"
              title="The Assumptions"
              subtitle="What we assume to be true, and why"
            >
              <div className="space-y-6">
                <p className="text-[15px] text-black leading-relaxed">
                  Every model rests on assumptions. Here are ours—with ranges, not point estimates.
                </p>

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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">Time saved per encounter</td>
                            <td className="py-3">2–4 minutes</td>
                            <td className="py-3">3 minutes</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">Based on aggregated deployment experience across outpatient implementations. Primary care typically 2–4 min, specialists 2–3 min.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">wRVU baseline per visit</td>
                            <td className="py-3">1.5-2.5</td>
                            <td className="py-3">1.8</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">MGMA median wRVU per visit. Varies significantly by specialty and payer mix.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">wRVU lift %</td>
                            <td className="py-3">2-7%</td>
                            <td className="py-3">4%</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">Better documentation captures visit complexity more accurately. Studies show 2-7% improvement in E&M level accuracy.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">wRVU conversion factor</td>
                            <td className="py-3">$30-$50</td>
                            <td className="py-3">$33</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">CMS MPFS Medicare conversion factor ~$33 (2024). Commercial payers often higher. Blended rate depends on payer mix.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">HCC gap rate</td>
                            <td className="py-3">20-30%</td>
                            <td className="py-3">25%</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">Percentage of chronic conditions not captured in documentation. Industry research shows 25-40% gap rate in typical practices.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">Denial rate</td>
                            <td className="py-3">5-12%</td>
                            <td className="py-3">8%</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">MGMA data shows average denial rates 5-12%. Documentation-related denials are a subset but often preventable.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">Physician replacement cost</td>
                            <td className="py-3">$250K–$500K</td>
                            <td className="py-3">$350,000</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">AMGA Physician Retention Survey; range reflects recruiting, onboarding, and lost productivity. Excludes lost revenue during vacancy.</p>
                        </TooltipContent>
                      </Tooltip>
                    </tbody>
                  </table>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section 4: The Honest Limits */}
            <CollapsibleSection
              sectionId="honest-limits"
              title="The Honest Limits"
              subtitle="What we can prove, what we can support, and what we can only enable"
            >
              <div className="space-y-6">
                <p className="text-[15px] text-black leading-relaxed">
                  Most vendors will tell you their product saves money. We think you deserve to know 
                  exactly how confident we are in each claim — and what it takes to verify it.
                </p>
                <div className="grid gap-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#22C55E] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can Measure This</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Documentation time per encounter:</strong> EHR session data, before/after studies. You'll see this in weeks.</li>
                      <li><strong>wRVU per visit:</strong> Claims data shows E/M distribution shifts. Measurable at 90 days.</li>
                      <li><strong>Same-day note closure:</strong> EHR timestamps. Immediate and unambiguous.</li>
                      <li><strong>After-hours documentation:</strong> Session data shows when charting happens. This is the "pajama time" metric.</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#F59E0B] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can Influence This</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Capacity expansion:</strong> Requires patient demand and scheduling intent. We provide the time; you decide how to use it.</li>
                      <li><strong>HCC recapture:</strong> Depends on MA population, baseline gap rate, and coding workflows. Trackable but multi-factorial.</li>
                      <li><strong>Denial prevention:</strong> Doc-related denials are identifiable, but denial rates reflect many process factors.</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#EF4444] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can Only Enable This</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Retention:</strong> Documentation burden is one of many burnout drivers. Impact takes 12-18 months to observe. Track it, but don't bet on it alone.</li>
                      <li><strong>Patient satisfaction:</strong> More present providers may improve experience, but CAHPS is influenced by everything from wait times to parking.</li>
                      <li><strong>Referral patterns:</strong> Better documentation may improve referral quality, but attribution is indirect.</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-5 border-l-2 border-[#EA2C00]">
                  <p className="text-sm text-[#666666] leading-relaxed">
                    <strong className="text-black">Our philosophy:</strong> We'd rather show you a smaller number 
                    you can defend in a board presentation than a larger number that falls apart under scrutiny. 
                    Key assumptions in our model are editable — because your data should drive the answer, not ours.
                  </p>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section 5: The Validation Path */}
            <CollapsibleSection
              sectionId="validation-path"
              title="The Validation Path"
              subtitle="How to prove this with your own data — before, during, and after"
            >
              <div className="space-y-6">
                <p className="text-[15px] text-black leading-relaxed">
                  A model is only as good as its validation. Here's exactly what to measure and when — 
                  so you're not relying on our assumptions when you could be relying on your data.
                </p>
                <div className="space-y-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">Before Implementation</h4>
                      <span className="text-xs text-[#888888] font-medium">Baseline period</span>
                    </div>
                    <p className="text-sm text-[#666666] mb-3">
                      Lock in your baselines before anything changes. This is what makes before/after credible.
                    </p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Pull 12 months of wRVU data by provider and specialty — you need enough volume to see patterns</li>
                      <li>Baseline E/M level distribution (what % at each level, by provider)</li>
                      <li>Document current denial rates by reason code — isolate documentation-related denials</li>
                      <li>Survey physicians on documentation burden — you'll want to repeat this</li>
                      <li>EHR session data: when does charting happen? How much is after-hours?</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 90 Days</h4>
                      <span className="text-xs text-[#888888] font-medium">Early signal</span>
                    </div>
                    <p className="text-sm text-[#666666] mb-3">
                      Time savings and documentation quality show up fast. Revenue impact takes longer.
                    </p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Repeat time studies — compare doc time per encounter, after-hours charting</li>
                      <li>E/M level comparison: pilot providers vs. baseline (same providers, not just average)</li>
                      <li>Same-day note closure rate — often the most dramatic early metric</li>
                      <li>Provider satisfaction survey — qualitative signal matters here</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 6-12 Months</h4>
                      <span className="text-xs text-[#888888] font-medium">Revenue validation</span>
                    </div>
                    <p className="text-sm text-[#666666] mb-3">
                      This is where financial impact becomes statistically meaningful.
                    </p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Year-over-year wRVU comparison — control for patient mix and volume changes</li>
                      <li>Denial rate trends by category — isolate documentation-related improvement</li>
                      <li>Capacity utilization: did volumes increase? Were new slots added?</li>
                      <li>HCC recapture rates for MA populations (if applicable)</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 18+ Months</h4>
                      <span className="text-xs text-[#888888] font-medium">Long-term impact</span>
                    </div>
                    <p className="text-sm text-[#666666] mb-3">
                      Retention and culture shifts take time. Don't rush this measurement.
                    </p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Turnover rates: Abridge providers vs. control group</li>
                      <li>Exit interview data — is documentation still cited as a burnout driver?</li>
                      <li>Recruiting pipeline — are candidates asking about AI documentation tools?</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section 6: Connected Value */}
            <CollapsibleSection
              sectionId="connected-value"
              title="Connected Value"
              subtitle="How outpatient documentation connects to the rest of your organization"
            >
              <div className="space-y-4 text-[15px] text-black leading-relaxed">
                <p>
                  Outpatient documentation doesn't exist in isolation. The quality of what's captured 
                  in the office visit ripples across the organization:
                </p>
                <div className="space-y-4 mt-4">
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm">Downstream referrals</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      When primary care documentation is complete, specialists receive better context. 
                      Fewer repeat tests, faster diagnoses, better outcomes. Hard to quantify, but real.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm">Value-based contracts</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      HCC accuracy drives risk adjustment in MA plans. Complete documentation 
                      supports accurate RAF scores, which determine capitated payments. This is 
                      quantified separately in our model for practices with significant MA populations.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm">Pre-authorization efficiency</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      Complete clinical documentation reduces prior auth denials and the back-and-forth 
                      that consumes staff time. We don't model this directly, but organizations with 
                      high prior auth volumes report meaningful time savings.
                    </p>
                  </div>
                </div>
                <p className="text-[#666666] italic mt-4">
                  We don't sum these into the ROI model because the attribution gets fuzzy. But they're real — 
                  and they're part of the strategic case for documentation quality that goes beyond the numbers.
                </p>
              </div>
            </CollapsibleSection>
          </div>
        </div>

        {/* Build a Model CTA */}
        <motion.div 
          className="mt-12 bg-gradient-to-r from-[#1A1A1A] to-[#2D2D2D] rounded-lg p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-xl font-bold text-white mb-2">Ready to Build Your Model?</h3>
          <p className="text-[#999999] mb-6 text-sm">
            Use these methodology principles to create a customized ROI model for your outpatient practice.
          </p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 bg-[#EA2C00] hover:bg-[#D12600] text-white font-medium px-6 py-3 rounded-lg transition-colors"
            data-testid="button-build-model"
          >
            Build an Outpatient Model
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        <p className="text-xs text-[#AAAAAA] leading-relaxed mt-10 mb-2">
          Projections are modeled estimates based on user-provided inputs, published industry benchmarks, and aggregated deployment experience. Actual results may vary based on implementation approach, provider adoption, organizational factors, and care setting. This methodology does not constitute a guarantee of financial outcomes.
        </p>

        {/* Related Care Settings */}
        <div className="mt-12 mb-8">
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
            Related Methodologies
          </p>
          <p className="text-sm text-[#666666] mb-6">
            Outpatient documentation connects to other care settings. Explore how value flows in related contexts.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={() => onNavigateToSetting?.("ed")}
              className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left"
              data-testid="link-setting-ed"
            >
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#EA2C00]" />
              </div>
              <div>
                <p className="font-medium text-black text-sm">Emergency</p>
                <p className="text-xs text-[#888888]">Throughput & LWBS</p>
              </div>
            </button>
            <button
              onClick={() => onNavigateToSetting?.("inpatient")}
              className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left"
              data-testid="link-setting-inpatient"
            >
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#EA2C00]" />
              </div>
              <div>
                <p className="font-medium text-black text-sm">Inpatient</p>
                <p className="text-xs text-[#888888]">DRG & documentation quality</p>
              </div>
            </button>
            <button
              onClick={() => onNavigateToSetting?.("nursing")}
              className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left"
              data-testid="link-setting-nursing"
            >
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center">
                <Heart className="w-5 h-5 text-[#EA2C00]" />
              </div>
              <div>
                <p className="font-medium text-black text-sm">Nursing</p>
                <p className="text-xs text-[#888888]">OT reduction & retention</p>
              </div>
            </button>
          </div>
        </div>
      </div>
      
      {/* Download toast notification */}
      {isExporting && (
        <div 
          className="fixed bottom-4 right-4 bg-[#EA2C00] text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50"
          data-testid="toast-pdf-download"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Preparing your PDF...</span>
        </div>
      )}
    </div>
  );
}
