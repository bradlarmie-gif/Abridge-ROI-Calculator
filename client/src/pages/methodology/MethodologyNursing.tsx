import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronUp, Download, ArrowRight, Stethoscope, Activity, Building2 } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { generateMethodologyPDF, nursingMethodologyData } from "@/lib/methodology-pdf-generator";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';

interface MethodologyNursingProps {
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

export function MethodologyNursing({ onBack, onNavigateToSetting }: MethodologyNursingProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await generateMethodologyPDF(nursingMethodologyData);
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
              onClick={(e) => { e.preventDefault(); window.location.href = "/"; }}
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
            Nursing: How We Think About Value
          </h1>
          <p className="text-base text-[#666666]">
            Understanding where value lives when there's no billing
          </p>
        </motion.div>

        {/* Sections */}
        <div className="bg-[#F5F0EB] rounded-lg">
          <div className="px-6">
            {/* Section 1: The Context */}
            <CollapsibleSection
              sectionId="context"
              title="The Context"
              subtitle="Why nursing value is different"
              defaultOpen={true}
            >
              <div className="space-y-4 text-[15px] text-black leading-relaxed">
                <p>
                  Nursing is the hardest setting to model ROI—and the most important to get right.
                </p>
                <p>
                  In outpatient medicine, a physician saves 4 minutes per visit, and you can trace a path 
                  to wRVU lift or capacity expansion. The billing relationship creates a clear value chain.
                </p>
                <p>
                  Nurses don't bill. They don't generate wRVUs. And yet nursing documentation burden is 
                  massive—25-35% of every shift spent on flowsheets, assessments, handoffs, and charting.
                </p>
                <p className="font-semibold">So where does the value live?</p>
                <p>It lives in two places:</p>

                {/* Value Location Cards */}
                <div className="space-y-4 mt-6">
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm uppercase tracking-wide">1. Labor Economics</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      Overtime, retention, and agency spend. These are real dollars that show up in the budget. 
                      When nurses spend less time documenting, they're more likely to finish shifts on time, 
                      less likely to burn out and leave, and the organization is less dependent on expensive travel nurses.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm uppercase tracking-wide">2. Care Quality Enablement</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      Falls, pressure injuries, patient satisfaction. These outcomes are influenced by how much time 
                      nurses spend at bedside. More time caring, less time charting, better outcomes. But the causal 
                      chain is indirect—documentation supports care, it doesn't replace it.
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-[#666666] italic">
                  We model both—but we're honest about which value is direct and which is potential.
                </p>
              </div>
            </CollapsibleSection>

            {/* Section 2: The Value Mechanisms */}
            <CollapsibleSection
              sectionId="value-mechanisms"
              title="The Value Mechanisms"
              subtitle="How time saved becomes dollars"
            >
              {/* Labor Value */}
              <div className="mb-8">
                <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                  Time Saved → Labor Value
                </p>
                <div className="h-px bg-[#D1D5DB] mb-6" />

                <MechanismCard title="Overtime Reduction">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        When documentation takes less time, nurses are more likely to complete their shift on time. 
                        Some portion of reclaimed time translates to reduced overtime.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        Hours saved × Conversion rate × OT hourly rate = OT savings
                      </p>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">The key assumption:</p>
                      <p className="text-[#666666]">
                        Not all time saved becomes OT reduction. Some goes to care time, some to shift efficiency. 
                        We use a 15-40% conversion rate depending on how documentation-driven your current OT is.
                      </p>
                    </div>
                    <div className="border-l-2 border-[#EA2C00] pl-4">
                      <p className="text-[#888888] mb-1">Why this is defensible:</p>
                      <p className="text-[#666666]">
                        Overtime is measurable. Documentation time is measurable. The link between them is logical 
                        and can be validated post-implementation.
                      </p>
                    </div>
                  </div>
                </MechanismCard>

                <MechanismCard title="Retention Savings">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        Documentation burden is a top driver of nursing burnout. Burnout is a top driver of turnover. 
                        Reducing the burden can help retain nurses who would otherwise leave.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        Nurses × Turnover rate × Burnout % × Abridge impact % × Replacement cost = Retention value
                      </p>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">The key assumptions:</p>
                      <ul className="text-[#666666] space-y-1 ml-4 list-disc">
                        <li>Industry turnover: 15-25% annually</li>
                        <li>Burnout-related turnover: 30-50% of all turnover</li>
                        <li>Abridge impact: 10-25% of burnout-related turnover</li>
                        <li>Replacement cost: $40,000-$65,000 per nurse</li>
                      </ul>
                    </div>
                    <p className="text-[#666666]">
                      We use conservative defaults (15% Abridge impact) because documentation is one of many 
                      burnout factors. Staffing ratios, patient acuity, and emotional toll all matter.
                    </p>
                    <div className="border-l-2 border-[#EA2C00] pl-4">
                      <p className="text-[#888888] mb-1">Why this is defensible:</p>
                      <p className="text-[#666666]">
                        The link between documentation burden and burnout is well-established in nursing research. 
                        The question is magnitude, not direction.
                      </p>
                    </div>
                  </div>
                </MechanismCard>

                <MechanismCard title="Agency Labor Reduction">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        When nurses leave, hospitals fill gaps with travel nurses at 2-3x the cost. 
                        Better retention directly reduces agency dependency.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        Nurses retained × Weeks of coverage × Weekly premium = Agency savings
                      </p>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">The key assumptions:</p>
                      <ul className="text-[#666666] space-y-1 ml-4 list-disc">
                        <li>Average time-to-fill: 8-16 weeks</li>
                        <li>Agency premium: $2,000-$4,000/week above base</li>
                      </ul>
                    </div>
                    <p className="text-[#666666] italic">
                      This is connected to retention—if you don't enable retention savings, you can't claim agency reduction.
                    </p>
                  </div>
                </MechanismCard>
              </div>

              {/* Care Quality */}
              <div>
                <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                  Time Saved → Care Quality
                </p>
                <div className="h-px bg-[#D1D5DB] mb-6" />

                <MechanismCard title="HAPI & Falls Prevention">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        When assessments are documented in real-time, risk factors are visible faster. 
                        Earlier visibility enables earlier intervention. Earlier intervention can prevent some adverse events.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        Current events × Documentation-preventable rate × Cost per event = Potential value
                      </p>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">The key assumption:</p>
                      <p className="text-[#666666]">
                        We use a 5% "documentation-preventable" rate. This is intentionally conservative—it represents 
                        cases where real-time assessment documentation would have triggered earlier intervention.
                      </p>
                    </div>
                    <div className="bg-[#FFF8F0] border border-[#EA2C00]/20 rounded-lg p-4">
                      <p className="text-[#888888] mb-2 font-medium">Why we call this "potential" value:</p>
                      <p className="text-[#666666] mb-3">The causal chain is indirect:</p>
                      <div className="flex items-center gap-2 text-sm text-black font-mono">
                        <span>Documentation</span>
                        <span className="text-[#888888]">→</span>
                        <span>Visibility</span>
                        <span className="text-[#888888]">→</span>
                        <span>Intervention</span>
                        <span className="text-[#888888]">→</span>
                        <span>Outcome</span>
                      </div>
                      <p className="text-[#666666] mt-3">
                        We control the first step. Clinical practice controls the rest. 
                        Documentation supports good care—it doesn't replace it.
                      </p>
                      <p className="text-[#666666] mt-2 italic">
                        We show this value separately because honesty builds trust.
                      </p>
                    </div>
                  </div>
                </MechanismCard>

                <MechanismCard title="Patient Experience (HCAHPS)">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        When nurses spend less time on documentation, they spend more time with patients. 
                        Research consistently shows bedside time correlates with patient satisfaction.
                      </p>
                    </div>
                    <div className="bg-[#FFF8F0] border border-[#EA2C00]/20 rounded-lg p-4">
                      <p className="text-[#888888] mb-2 font-medium">Why we don't calculate this:</p>
                      <p className="text-[#666666]">
                        HCAHPS scores are influenced by dozens of factors—wait times, pain management, 
                        communication, environment, and more. We can't credibly attribute HCAHPS improvement 
                        to documentation alone.
                      </p>
                      <p className="text-[#666666] mt-3">
                        <strong>But consider:</strong> Hospitals in the top quartile of HCAHPS receive ~2% higher 
                        reimbursement through Value-Based Purchasing. Even small improvements matter.
                      </p>
                    </div>
                    <p className="text-[#666666] italic">
                      Track HCAHPS as a leading indicator after implementation.
                    </p>
                  </div>
                </MechanismCard>
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
                        <th className="text-left py-3 font-semibold text-black">Source</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#666666]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">Time saved per shift</td>
                            <td className="py-3">15-30 minutes</td>
                            <td className="py-3">20 minutes</td>
                            <td className="py-3">Abridge customer data</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">Based on time-motion studies across 12+ nursing implementations. Varies by unit type and existing documentation workflows.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">OT conversion rate</td>
                            <td className="py-3">15-40%</td>
                            <td className="py-3">25%</td>
                            <td className="py-3">Implementation studies</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">Not all saved time converts to OT reduction. Accounts for nurses already leaving on time, shift overlap, and other documentation tasks.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">Nurse turnover rate</td>
                            <td className="py-3">15-25%</td>
                            <td className="py-3">18%</td>
                            <td className="py-3">NSI Nursing Solutions</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">NSI 2023 National Healthcare Retention & RN Staffing Report. National average ~22.5%, we use conservative 18%.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">Burnout-related %</td>
                            <td className="py-3">30-50%</td>
                            <td className="py-3">40%</td>
                            <td className="py-3">ANA surveys</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">American Nurses Association workplace surveys indicate burnout contributes to 30-50% of voluntary turnover. Documentation burden is a key burnout driver.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">Abridge retention impact</td>
                            <td className="py-3">10-25%</td>
                            <td className="py-3">15%</td>
                            <td className="py-3">Conservative estimate</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">Conservative estimate of retention improvement from reduced documentation burden. Actual impact depends on baseline burden and organizational factors.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">Replacement cost</td>
                            <td className="py-3">$40k-$65k</td>
                            <td className="py-3">$52,000</td>
                            <td className="py-3">NSI benchmark</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">NSI 2023 Report: Average cost of turnover for bedside RN is $46,100-$51,700. Includes recruiting, training, and productivity loss.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">Documentation-preventable HAE</td>
                            <td className="py-3">3-10%</td>
                            <td className="py-3">5%</td>
                            <td className="py-3">Conservative estimate</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">Percentage of hospital-acquired events where better real-time documentation could have enabled earlier intervention. Intentionally conservative.</p>
                        </TooltipContent>
                      </Tooltip>
                    </tbody>
                  </table>
                </div>

                <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                  <p className="text-sm text-[#666666]">
                    <strong className="text-black">Why we default conservative:</strong> It's better to exceed expectations 
                    than to fall short. If your organization's data suggests higher impact, adjust the assumptions—
                    but start skeptical.
                  </p>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section 4: The Honest Limits */}
            <CollapsibleSection
              sectionId="honest-limits"
              title="The Honest Limits"
              subtitle="What we can measure vs. what we can only influence"
            >
              <div className="space-y-6">
                <p className="text-[15px] text-black leading-relaxed">
                  Not all value is created equal. Here's our honest assessment of measurability.
                </p>

                <div className="grid gap-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#22C55E] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">Direct & Measurable</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Overtime hours:</strong> Payroll data, before/after comparison</li>
                      <li><strong>Documentation time:</strong> EHR time stamps, time studies</li>
                      <li><strong>Agency spend:</strong> Invoices, budget line items</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#F59E0B] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">Logical & Attributable</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Retention improvement:</strong> Requires 6-12 months of data, survey correlation</li>
                      <li><strong>Burnout reduction:</strong> Measurable via validated instruments (MBI, etc.)</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#EF4444] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">Indirect & Harder to Attribute</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Falls/HAPI prevention:</strong> Multiple factors; documentation is one enabler</li>
                      <li><strong>HCAHPS improvement:</strong> Many variables; can track but not attribute</li>
                    </ul>
                  </div>
                </div>

                <div className="border-l-2 border-[#EA2C00] pl-4">
                  <p className="text-[15px] text-[#666666]">
                    <strong className="text-black">Our approach:</strong> We calculate everything, but we label it honestly. 
                    Direct value goes in the primary ROI. Indirect value is shown separately as "potential" so you can 
                    decide how much weight to give it.
                  </p>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section 5: The Validation Path */}
            <CollapsibleSection
              sectionId="validation-path"
              title="The Validation Path"
              subtitle="How to validate these assumptions with your own data"
            >
              <div className="space-y-6">
                <p className="text-[15px] text-black leading-relaxed">
                  Our defaults are starting points. Here's how to validate them in your organization.
                </p>

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
                </div>

                <div className="bg-[#FFF8F0] border border-[#EA2C00]/20 rounded-lg p-5">
                  <p className="text-sm text-[#666666]">
                    <strong className="text-black">The goal isn't to prove our model right.</strong> It's to build your 
                    organization's understanding of what ambient documentation actually delivers in your context. 
                    Adjust the model based on what you learn.
                  </p>
                </div>
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
            Use these methodology principles to create a customized ROI model for your nursing program.
          </p>
          <a
            href="/?explore=nursing"
            className="inline-flex items-center gap-2 bg-[#EA2C00] hover:bg-[#D12600] text-white font-medium px-6 py-3 rounded-lg transition-colors"
            data-testid="button-build-model"
          >
            Build a Nursing Model
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>

        {/* Related Care Settings */}
        <div className="mt-12 mb-8">
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
            Related Methodologies
          </p>
          <p className="text-sm text-[#666666] mb-6">
            Nursing documentation often connects to broader care settings. Explore how value flows in related contexts.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
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
              onClick={() => onNavigateToSetting?.("outpatient")}
              className="flex items-center gap-3 p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#EA2C00]/30 hover:bg-[#FFF8F0] transition-colors text-left"
              data-testid="link-setting-outpatient"
            >
              <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-[#EA2C00]" />
              </div>
              <div>
                <p className="font-medium text-black text-sm">Outpatient</p>
                <p className="text-xs text-[#888888]">wRVU & patient access</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
