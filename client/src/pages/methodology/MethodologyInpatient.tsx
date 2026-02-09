import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronUp, Download, ArrowRight, Stethoscope, Activity, Heart, Loader2 } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { generateMethodologyPDF } from "@/lib/methodology-pdf-export";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';

interface MethodologyInpatientProps {
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

export function MethodologyInpatient({ onBack, onNavigateToSetting }: MethodologyInpatientProps) {
  const [isExporting, setIsExporting] = useState(false);

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
            Inpatient: How We Think About Value
          </h1>
          <p className="text-base text-[#666666]">
            Where documentation complexity meets DRG economics
          </p>
        </motion.div>

        {/* Sections */}
        <div className="bg-[#F5F0EB] rounded-lg">
          <div className="px-6">
            {/* Section 1: The Context */}
            <CollapsibleSection
              sectionId="context"
              title="The Context"
              subtitle="One note can be worth thousands in DRG value — but the economics work differently here"
              defaultOpen={true}
            >
              <div className="space-y-4 text-[15px] text-black leading-relaxed">
                <p>
                  Inpatient is where documentation has the highest per-note financial impact in 
                  healthcare. A single admission note that captures an additional CC/MCC can shift 
                  DRG weight by 0.3-0.5 — worth $2,000-$4,000 in reimbursement. No other care 
                  setting has this kind of per-documentation dollar density.
                </p>
                <p>
                  But the economics work differently than outpatient. Hospitalists don't bill per-visit 
                  wRVUs the same way. Value shows up in DRG accuracy, CDI efficiency, and the 
                  operational cost of documentation burden across an entire admission — H&Ps, daily 
                  progress notes, procedure notes, discharge summaries. That's 15-40 minutes of 
                  documentation time per admission, across multiple touchpoints.
                </p>
                <p>
                  The challenge is that inpatient revenue is team-produced. The hospitalist documents, 
                  CDI reviews, coders assign, and the DRG determines payment. Ambient AI improves 
                  step one — and when step one is better, every downstream step benefits.
                </p>
                <p className="font-semibold">Three value paths — each with distinct measurement approaches:</p>

                <div className="space-y-4 mt-6">
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm uppercase tracking-wide">1. Documentation Quality → DRG Accuracy</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      This is the highest-value mechanism. When clinical conversations capture 
                      comorbidities, complications, and clinical reasoning completely, DRG assignment 
                      reflects true patient acuity. This isn't upcoding — it's ensuring documentation 
                      reflects the care actually delivered. CDI teams know exactly how much opportunity 
                      exists; Abridge helps capture it at the point of care instead of retrospectively.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm uppercase tracking-wide">2. Time Efficiency → Rounding Quality</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      When hospitalists spend less time documenting, the time returns to clinical 
                      care — more thorough rounds, earlier discharges, better handoffs. Unlike 
                      outpatient where time converts to additional visits, inpatient time value 
                      shows up in care quality and operational efficiency. Harder to quantify in 
                      dollars, but real in outcomes.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm uppercase tracking-wide">3. Clinician Sustainability</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      Hospitalist programs face chronic turnover challenges. Documentation burden during 
                      overnight admits and weekend shifts is a major driver. At $400k-$600k per replacement, 
                      every hospitalist retained represents significant avoided cost.
                    </p>
                  </div>
                </div>

                <div className="mt-6 bg-white rounded-lg p-5 border-l-2 border-[#EA2C00]">
                  <p className="text-sm text-[#666666] leading-relaxed">
                    <strong className="text-black">The inpatient difference:</strong> In outpatient, the provider 
                    who documents is the one who bills. In inpatient, documentation flows through a team — 
                    physician, CDI, coder — before it becomes revenue. Our model accounts for this by focusing 
                    on CDI-measurable outcomes rather than assumptions about coding behavior.
                  </p>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section 2: The Value Mechanisms */}
            <CollapsibleSection
              sectionId="value-mechanisms"
              title="The Value Mechanisms"
              subtitle="How documentation drives inpatient economics"
            >
              {/* DRG Value */}
              <div className="mb-8">
                <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                  Documentation Quality → DRG Value
                </p>
                <div className="h-px bg-[#D1D5DB] mb-6" />

                <MechanismCard title="DRG Accuracy & CC/MCC Capture">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        A hospitalist discusses acute kidney injury with the team, adjusts fluids, 
                        monitors labs — but the progress note says "renal function stable." That missing 
                        specificity can cost $2,000-$4,000 in DRG weight. Multiply across thousands of 
                        admissions and you have a documentation gap worth millions. Ambient AI captures 
                        the clinical conversation — the comorbidities mentioned, the reasoning discussed, 
                        the complications managed — so the note reflects what actually happened.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        Admissions at risk × Protection rate × DRG weight increase × Base payment × Realization
                      </p>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">Key assumptions:</p>
                      <ul className="text-[#666666] space-y-1 ml-4 list-disc">
                        <li>Admissions with documentation opportunities: 20-30% (your CDI team can tell you your number)</li>
                        <li>DRG weight improvement when captured: 0.3-0.5 (based on CMS CC/MCC differentials)</li>
                        <li>Base DRG payment: $6,000-$8,000 (varies by hospital and region)</li>
                        <li>Realization rate: 50% — conservative because not every opportunity converts</li>
                      </ul>
                    </div>
                    <div className="border-l-2 border-[#EA2C00] pl-4">
                      <p className="text-[#888888] mb-1">Why this is defensible:</p>
                      <p className="text-[#666666]">
                        Your CDI department already tracks documentation gaps — they know the query rate, 
                        the response rate, and the revenue impact. This isn't hypothetical; it's data your 
                        organization already has. Claims data shows DRG distributions before and after. 
                        CMI trends are tracked quarterly. The measurement infrastructure exists.
                      </p>
                    </div>
                  </div>
                </MechanismCard>

                <MechanismCard title="CDI Query Reduction">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        Every CDI query represents a documentation gap — something that should have been 
                        in the note but wasn't. Each query costs $40-$60 in CDI labor (creation, tracking, 
                        follow-up) plus physician time to respond. When documentation captures clinical 
                        detail at the point of care, fewer queries are needed.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        Admissions × Query rate × Reduction % × Cost per query
                      </p>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">Key assumptions:</p>
                      <ul className="text-[#666666] space-y-1 ml-4 list-disc">
                        <li>Baseline query rate: 25-35% of admissions (ACDIS benchmarks)</li>
                        <li>Query reduction: 15-35% (depends on current documentation quality)</li>
                        <li>Cost per query: $40-$60 (CDI specialist time + physician response)</li>
                      </ul>
                    </div>
                    <div className="border-l-2 border-[#EA2C00] pl-4">
                      <p className="text-[#888888] mb-1">Why this is defensible:</p>
                      <p className="text-[#666666]">
                        CDI departments track query volume meticulously — it's their core operational metric. 
                        Before/after comparison is straightforward. The cost per query is well-established 
                        in ACDIS benchmarks. This is one of the cleanest metrics to measure.
                      </p>
                    </div>
                  </div>
                </MechanismCard>

                <MechanismCard title="Denial Prevention">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        Inpatient denials are the most expensive in healthcare — average claim values 
                        of $8,000-$15,000 at stake. Medical necessity denials, observation vs. inpatient 
                        status challenges, and DRG downgrade audits all stem from documentation gaps. 
                        Complete, real-time documentation is the strongest defense.
                      </p>
                    </div>
                    <div className="bg-[#FFF8F0] border border-[#EA2C00]/20 rounded-lg p-4">
                      <p className="text-[#666666]">
                        <strong className="text-black">Note on accounting:</strong> We include denial prevention 
                        value within the DRG Accuracy calculation to avoid double-counting — complete 
                        documentation supports both appropriate DRG assignment AND denial prevention. 
                        They're two sides of the same documentation quality coin.
                      </p>
                    </div>
                  </div>
                </MechanismCard>
              </div>

              {/* Time Efficiency */}
              <div className="mb-8">
                <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                  Time Saved → Efficiency Value
                </p>
                <div className="h-px bg-[#D1D5DB] mb-6" />

                <MechanismCard title="Rounding Efficiency">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        When hospitalists spend less time documenting, that time returns to the bedside. 
                        More thorough rounds, earlier discharge planning conversations, better handoffs 
                        between shifts. The downstream effects touch length of stay, patient satisfaction, 
                        and care coordination quality.
                      </p>
                    </div>
                    <div className="bg-[#FFF8F0] border border-[#EA2C00]/20 rounded-lg p-4">
                      <p className="text-[#888888] mb-2 font-medium">Why we show this as qualitative:</p>
                      <p className="text-[#666666]">
                        Unlike outpatient, hospitalist time savings don't convert directly to revenue via 
                        additional encounters. The value is real — more time per patient, potentially shorter 
                        LOS, better discharge planning — but the dollar conversion requires assumptions 
                        we're not comfortable making. We show hours returned rather than dollar value, 
                        and let your operational team assess the impact in their context.
                      </p>
                    </div>
                    <div className="border-l-2 border-[#EA2C00] pl-4">
                      <p className="text-[#888888] mb-1">Why this matters even without dollar attribution:</p>
                      <p className="text-[#666666]">
                        If 20 hospitalists each save 30 minutes per admission across 15 admissions/month, 
                        that's 150 hours of physician time returned to clinical care monthly. That's real 
                        capacity — even if we can't put a precise dollar figure on it.
                      </p>
                    </div>
                  </div>
                </MechanismCard>
              </div>

              {/* Clinician Wellbeing */}
              <div>
                <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                  Time Saved → Clinician Sustainability
                </p>
                <div className="h-px bg-[#D1D5DB] mb-6" />

                <MechanismCard title="Retention Savings">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        Hospitalist medicine has some of the highest turnover in healthcare. The documentation 
                        burden is relentless — overnight admits, weekend coverage, high patient volumes with 
                        complex notes. When a hospitalist leaves, you lose institutional knowledge, face 
                        coverage gaps, and spend months recruiting. The financial impact extends far beyond 
                        the replacement cost.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        Hospitalists × Turnover rate × Burnout % × Abridge impact % × Replacement cost
                      </p>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">Hospitalist-specific defaults:</p>
                      <ul className="text-[#666666] space-y-1 ml-4 list-disc">
                        <li>Turnover rate: 8-12% annually (often higher than other specialties)</li>
                        <li>Burnout-related: 40-50% of departures</li>
                        <li>Replacement cost: $350,000-$500,000 (recruiting, onboarding, lost productivity)</li>
                      </ul>
                    </div>
                    <div className="border-l-2 border-[#EA2C00] pl-4">
                      <p className="text-[#888888] mb-1">Why this is defensible:</p>
                      <p className="text-[#666666]">
                        Track exit interview data — is documentation burden cited? Compare turnover in 
                        Abridge-enabled programs vs. those without. The measurement takes time, but 
                        the signal is usually there within 18 months.
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
              subtitle="Inpatient-specific defaults and ranges"
            >
              <div className="space-y-6">
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
                            <td className="py-3">Time saved per admission</td>
                            <td className="py-3">15-45 minutes</td>
                            <td className="py-3">30 minutes</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">Total documentation time saved across H&P, progress notes, and discharge summary. Higher for complex admissions.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">Admissions with documentation opportunity</td>
                            <td className="py-3">20-30%</td>
                            <td className="py-3">25%</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">Percentage of admissions where better documentation could protect or improve DRG assignment. Based on CDI opportunity assessments.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">DRG protection rate (Typical)</td>
                            <td className="py-3">15-25%</td>
                            <td className="py-3">20%</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">Percentage of at-risk admissions where documentation successfully protects appropriate DRG assignment.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">DRG weight improvement</td>
                            <td className="py-3">0.3-0.5</td>
                            <td className="py-3">0.4</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">Average DRG weight increase when documentation captures CC/MCC appropriately. Based on CMS DRG weight differentials.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">Base DRG payment</td>
                            <td className="py-3">$5,500-$7,500</td>
                            <td className="py-3">$6,000</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">CMS base rate varies by hospital. Actual payment = base rate × DRG weight × wage index adjustments.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">CDI query rate</td>
                            <td className="py-3">25-35%</td>
                            <td className="py-3">30%</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">ACDIS benchmark for percentage of admissions requiring CDI queries. Real-time documentation reduces need for retrospective queries.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">Query reduction %</td>
                            <td className="py-3">15-35%</td>
                            <td className="py-3">25%</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">Expected reduction in CDI queries when documentation is more complete at point of care.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">Cost per query</td>
                            <td className="py-3">$40-$60</td>
                            <td className="py-3">$50</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">CDI specialist time cost per query including creation, tracking, and follow-up. Based on ACDIS productivity benchmarks.</p>
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
              subtitle="What we can prove, what we can support, and what we can only enable in inpatient"
            >
              <div className="space-y-6">
                <p className="text-[15px] text-black leading-relaxed">
                  Inpatient revenue is team-produced. Documentation is step one, but CDI, coding, 
                  and clinical operations all affect the final outcome. We're honest about what 
                  documentation improvement can and can't claim credit for.
                </p>
                <div className="grid gap-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#22C55E] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can Measure This</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Documentation time per note type:</strong> EHR session data for H&Ps, progress notes, discharge summaries. Visible in weeks.</li>
                      <li><strong>CDI query rates:</strong> CDI departments track this daily. Before/after comparison is clean and fast.</li>
                      <li><strong>CMI trends:</strong> Claims data, tracked quarterly. Compare Abridge providers vs. control group.</li>
                      <li><strong>Note completeness:</strong> CDI can assess documentation quality directly. Audit-ready evidence.</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#F59E0B] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can Influence This</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>DRG accuracy:</strong> Documentation is the input; CDI, coding, and payer response determine the output. Trackable, but multi-factorial.</li>
                      <li><strong>Denial prevention:</strong> Documentation-related denials are identifiable. Requires 6+ months of data to see trends.</li>
                      <li><strong>Discharge documentation quality:</strong> Better discharge summaries may reduce readmissions, but many factors contribute.</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#EF4444] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can Only Enable This</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Length of stay:</strong> Many factors drive LOS — staffing, bed management, discharge planning, social determinants. Documentation is one contributor. Don't over-attribute.</li>
                      <li><strong>Rounding efficiency:</strong> Real in hours, harder to convert to dollars. We show hours, not revenue.</li>
                      <li><strong>Retention:</strong> Long-term measurement needed. Track, but don't claim causation prematurely.</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-5 border-l-2 border-[#EA2C00]">
                  <p className="text-sm text-[#666666] leading-relaxed">
                    <strong className="text-black">Our philosophy:</strong> We'd rather show you a defensible DRG 
                    improvement number based on CDI data than a speculative LOS reduction based on assumptions. 
                    Every variable in our model is editable — because your CDI team knows your gaps better 
                    than any default can.
                  </p>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section 5: The Validation Path */}
            <CollapsibleSection
              sectionId="validation-path"
              title="The Validation Path"
              subtitle="How to prove this with your hospitalist program's data — before, during, and after"
            >
              <div className="space-y-6">
                <p className="text-[15px] text-black leading-relaxed">
                  Inpatient has an advantage: your CDI department already tracks most of the metrics 
                  you need. Here's how to leverage that existing infrastructure for a credible ROI story.
                </p>
                <div className="space-y-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">Before Implementation</h4>
                      <span className="text-xs text-[#888888] font-medium">Baseline period</span>
                    </div>
                    <p className="text-sm text-[#666666] mb-3">
                      Work with CDI and coding to establish baselines. Most of this data already exists.
                    </p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>12 months of CMI data by hospitalist — you need provider-level granularity</li>
                      <li>CDI query rates by provider and query type</li>
                      <li>DRG denial rates with documentation-related root cause analysis</li>
                      <li>Documentation time estimates (if EHR data is available)</li>
                      <li>CC/MCC capture rates — your CDI team tracks this</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 90 Days</h4>
                      <span className="text-xs text-[#888888] font-medium">Early signal</span>
                    </div>
                    <p className="text-sm text-[#666666] mb-3">
                      CDI query reduction shows up fast. CMI takes longer because of claims lag.
                    </p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Documentation time by note type — H&Ps, progress notes, discharges</li>
                      <li>CDI query rate trends (this is often the earliest financial signal)</li>
                      <li>Note quality assessment from CDI perspective</li>
                      <li>Hospitalist satisfaction surveys — qualitative signal matters</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 6-12 Months</h4>
                      <span className="text-xs text-[#888888] font-medium">Revenue validation</span>
                    </div>
                    <p className="text-sm text-[#666666] mb-3">
                      CMI and denial data become statistically meaningful. This is your board presentation window.
                    </p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Year-over-year CMI comparison by provider cohort</li>
                      <li>CC/MCC capture rate trends</li>
                      <li>DRG denial rate trends — isolate documentation-related categories</li>
                      <li>CDI productivity metrics — are CDI specialists covering more cases?</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 18+ Months</h4>
                      <span className="text-xs text-[#888888] font-medium">Long-term impact</span>
                    </div>
                    <p className="text-sm text-[#666666] mb-3">
                      Retention and culture shifts. Don't rush this measurement.
                    </p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Hospitalist turnover: Abridge-enabled program vs. pre-implementation</li>
                      <li>LOS trends (with appropriate controls for patient acuity changes)</li>
                      <li>Exit interview data — is documentation still cited as a burnout factor?</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section 6: Connected Value */}
            <CollapsibleSection
              sectionId="connected-value"
              title="Connected Value"
              subtitle="How inpatient documentation connects to the rest of your organization"
            >
              <div className="space-y-4 text-[15px] text-black leading-relaxed">
                <p>
                  Inpatient sits at the center of the hospital value chain. Documentation here 
                  connects to almost every other care setting:
                </p>
                <div className="space-y-4 mt-4">
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm">ED → Inpatient (upstream feed)</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      ED documentation quality directly affects the starting point of inpatient care. 
                      When ED notes capture presenting conditions and comorbidities completely, CDI teams 
                      have a stronger foundation. We quantify this in the ED methodology to avoid double-counting.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm">Nursing → Inpatient (CC/MCC support)</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      Nursing documentation captures clinical observations that support CC/MCC coding — 
                      skin assessments, fall risk documentation, nutritional status. When nursing notes 
                      are complete, CDI teams have additional evidence to support DRG accuracy.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm">Inpatient → Outpatient (discharge quality)</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      Complete discharge summaries improve post-discharge follow-up care. When the PCP 
                      receives a comprehensive discharge note, medication reconciliation, follow-up, 
                      and care continuity all improve. This connects to readmission reduction, though 
                      attribution is indirect.
                    </p>
                  </div>
                </div>
                <p className="text-[#666666] italic mt-4">
                  We don't sum cross-setting values into the inpatient model — the attribution gets 
                  complex when value flows through multiple teams. But when building a system-level 
                  business case, these connections matter.
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
            Use these methodology principles to create a customized ROI model for your hospitalist program.
          </p>
          <a
            href="/?explore=inpatient"
            className="inline-flex items-center gap-2 bg-[#EA2C00] hover:bg-[#D12600] text-white font-medium px-6 py-3 rounded-lg transition-colors"
            data-testid="button-build-model"
          >
            Build an Inpatient Model
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>

        {/* Related Care Settings */}
        <div className="mt-12 mb-8">
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
            Related Methodologies
          </p>
          <p className="text-sm text-[#666666] mb-6">
            Inpatient connects to ED admissions and nursing care. Explore how value chains connect.
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
                <p className="text-xs text-[#888888]">Admissions originate here</p>
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
                <p className="text-xs text-[#888888]">Inpatient nursing documentation</p>
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
                <p className="text-xs text-[#888888]">Post-discharge follow-up</p>
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
