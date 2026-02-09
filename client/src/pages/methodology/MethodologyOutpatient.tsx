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
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-lg p-6 mb-4">
      <h4 className="font-semibold text-black mb-4 uppercase tracking-wide text-sm">{title}</h4>
      {children}
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
              subtitle="Why outpatient is the most straightforward setting"
              defaultOpen={true}
            >
              <div className="space-y-4 text-[15px] text-black leading-relaxed">
                <p>
                  Outpatient medicine has the clearest value chain of any care setting.
                </p>
                <p>
                  When a physician saves 4 minutes per visit, that time can flow into more patients, 
                  better documentation (higher E/M coding), reduced after-hours work, or simply going 
                  home on time. Each path has a measurable financial outcome.
                </p>
                <p>
                  The billing relationship makes this traceable. Unlike nursing, where value shows up 
                  in labor economics, outpatient value shows up in revenue—wRVUs, capacity, and 
                  documentation quality that supports proper coding.
                </p>
                <p className="font-semibold">The two value lanes:</p>

                {/* Value Location Cards */}
                <div className="space-y-4 mt-6">
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm uppercase tracking-wide">1. Time Efficiency</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      Reduced pajama time and after-hours documentation. Less need for locums or overtime. 
                      Potential to see more patients (capacity expansion) or same patients with less burnout.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm uppercase tracking-wide">2. Documentation Quality</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      Better notes capture complexity that's discussed but not documented. This shows up as 
                      wRVU lift (higher E/M levels), HCC capture (risk adjustment), and denial prevention 
                      (medical necessity documentation).
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-[#666666] italic">
                  Most organizations see value in both lanes—the question is which dominates in your context.
                </p>
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
                <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                  Time Saved → Efficiency Value
                </p>
                <div className="h-px bg-[#D1D5DB] mb-6" />

                <MechanismCard title="Overtime & Locum Reduction">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        Physicians spend 1-2 hours per day on documentation outside of patient care. 
                        Reducing this burden decreases overtime and the need for expensive locum coverage.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        Time saved × Encounters × (Overtime rate or Locum cost) × Conversion factor
                      </p>
                    </div>
                    <div className="border-l-2 border-[#EA2C00] pl-4">
                      <p className="text-[#888888] mb-1">Why this is defensible:</p>
                      <p className="text-[#666666]">
                        Payroll systems track overtime. Locum invoices are available. Time-tracking can 
                        measure documentation before/after.
                      </p>
                    </div>
                  </div>
                </MechanismCard>

                <MechanismCard title="Capacity Expansion">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        Some organizations reinvest time savings into additional patient slots. 
                        If demand exists and access is a priority, saved documentation time can 
                        convert to additional visits.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        Time saved × Conversion to visits × Revenue per visit
                      </p>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">The key assumption:</p>
                      <p className="text-[#666666]">
                        Not all time becomes visits. We use a 30-50% conversion factor. The rest goes 
                        to quality of life, thoroughness, or other activities.
                      </p>
                    </div>
                  </div>
                </MechanismCard>

                <MechanismCard title="Clinician Wellbeing & Retention">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        Burnout drives turnover. Documentation burden is a top contributor to burnout. 
                        Reducing the burden can help retain physicians who would otherwise leave.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        Providers × Turnover rate × Burnout % × Impact % × Replacement cost
                      </p>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">Key assumptions:</p>
                      <ul className="text-[#666666] space-y-1 ml-4 list-disc">
                        <li>Physician replacement cost: $500,000-$1,000,000</li>
                        <li>Burnout-related turnover: 30-50%</li>
                        <li>Abridge impact: 10-20% (conservative)</li>
                      </ul>
                    </div>
                  </div>
                </MechanismCard>
              </div>

              {/* Documentation Quality */}
              <div>
                <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                  Documentation Quality → Revenue Value
                </p>
                <div className="h-px bg-[#D1D5DB] mb-6" />

                <MechanismCard title="wRVU Improvement">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        Better documentation captures the complexity that's discussed but not written down. 
                        When notes fully reflect visit intensity, E/M levels code appropriately.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        Encounters × Current wRVU × Lift % × Conversion factor × Realization rate
                      </p>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">Typical range:</p>
                      <p className="text-[#666666]">2-7% wRVU lift, with 50% realization rate (conservative).</p>
                    </div>
                  </div>
                </MechanismCard>

                <MechanismCard title="HCC Capture">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        In Medicare Advantage, HCC codes drive risk adjustment and capitated revenue. 
                        Complete documentation ensures conditions discussed are captured for RAF scoring.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        MA patients × Gap rate × Capture improvement × RAF value × Payment
                      </p>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">Key assumptions:</p>
                      <ul className="text-[#666666] space-y-1 ml-4 list-disc">
                        <li>Typical HCC gap rate: 25-35%</li>
                        <li>RAF impact per HCC: 0.10-0.15</li>
                        <li>Annual payment per RAF point: $10,000-$12,000</li>
                      </ul>
                    </div>
                  </div>
                </MechanismCard>

                <MechanismCard title="Denial Prevention">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        30-40% of denials are "unappealable"—permanent revenue loss due to documentation gaps. 
                        Abridge captures clinical reasoning in real-time, preventing these denials before they occur.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        Denials × Unappealable % × Prevention rate × Avg claim value × Realization
                      </p>
                    </div>
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
                      </tr>
                    </thead>
                    <tbody className="text-[#666666]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">Time saved per encounter</td>
                            <td className="py-3">2-6 minutes</td>
                            <td className="py-3">4 minutes</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">Based on time-motion studies across outpatient implementations. Primary care typically 4-6 min, specialists 2-4 min.</p>
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
                            <td className="py-3">$35-$50</td>
                            <td className="py-3">$42</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">CMS Medicare conversion factor ~$35. Commercial payers often 20-40% higher. Blended rate depends on payer mix.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">HCC gap rate</td>
                            <td className="py-3">25-35%</td>
                            <td className="py-3">33%</td>
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
                            <td className="py-3">$500k-$1M</td>
                            <td className="py-3">$750,000</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">AMGA/MGMA studies show total replacement cost including recruiting, onboarding, and lost productivity. Varies by specialty.</p>
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
              subtitle="What we can measure vs. what we can only influence"
            >
              <div className="space-y-6">
                <div className="grid gap-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#22C55E] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">Direct & Measurable</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Documentation time:</strong> EHR timestamps, before/after studies</li>
                      <li><strong>wRVU per visit:</strong> Claims data, coding analysis</li>
                      <li><strong>Denial rates:</strong> Payer reports, RCM data</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#F59E0B] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">Logical & Attributable</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Capacity expansion:</strong> Requires workflow changes to realize</li>
                      <li><strong>HCC capture:</strong> Depends on MA population and baseline gaps</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#EF4444] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">Indirect & Harder to Attribute</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Retention impact:</strong> Multiple factors; 6-12 months to measure</li>
                      <li><strong>Patient satisfaction:</strong> Can track but not directly attribute</li>
                    </ul>
                  </div>
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
                <div className="space-y-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <h4 className="font-semibold text-black mb-3 text-sm uppercase tracking-wide">Before Implementation</h4>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Pull 12 months of wRVU data by provider and specialty</li>
                      <li>Baseline E/M level distribution</li>
                      <li>Document current denial rates and reasons</li>
                      <li>Survey physicians on documentation burden</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <h4 className="font-semibold text-black mb-3 text-sm uppercase tracking-wide">At 90 Days</h4>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Time studies on documentation</li>
                      <li>E/M level comparison (pilot vs. baseline)</li>
                      <li>Provider satisfaction surveys</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <h4 className="font-semibold text-black mb-3 text-sm uppercase tracking-wide">At 12 Months</h4>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Year-over-year wRVU comparison</li>
                      <li>Denial rate trends</li>
                      <li>Turnover rates on Abridge providers vs. control</li>
                    </ul>
                  </div>
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
            Use these methodology principles to create a customized ROI model for your outpatient practice.
          </p>
          <a
            href="/?explore=outpatient"
            className="inline-flex items-center gap-2 bg-[#EA2C00] hover:bg-[#D12600] text-white font-medium px-6 py-3 rounded-lg transition-colors"
            data-testid="button-build-model"
          >
            Build an Outpatient Model
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>

        {/* Related Care Settings */}
        <div className="mt-12 mb-8">
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
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
