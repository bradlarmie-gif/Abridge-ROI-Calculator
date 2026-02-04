import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface MethodologyInpatientProps {
  onBack: () => void;
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

export function MethodologyInpatient({ onBack }: MethodologyInpatientProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-[800px] mx-auto px-6 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#666666] hover:text-black transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Methodology</span>
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
              subtitle="Why inpatient value requires different thinking"
              defaultOpen={true}
            >
              <div className="space-y-4 text-[15px] text-black leading-relaxed">
                <p>
                  Inpatient medicine sits at the intersection of high documentation burden and 
                  complex revenue mechanics. Hospitalists don't bill like outpatient providers—
                  they document across the entire admission, and that documentation directly 
                  affects DRG assignment.
                </p>
                <p>
                  Time savings per admission are larger (15-45 minutes) because hospitalists 
                  document multiple notes: H&Ps, progress notes, discharge summaries, procedures. 
                  Each represents an opportunity for Abridge to reduce burden.
                </p>
                <p className="font-semibold">Where inpatient value lives:</p>

                <div className="space-y-4 mt-6">
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm uppercase tracking-wide">1. Documentation Quality → DRG Accuracy</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      Clinical complexity that's discussed but not documented affects DRG weight—
                      and reimbursement. Better documentation supports appropriate CC/MCC capture, 
                      reduces CDI queries, and prevents denials on audit.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm uppercase tracking-wide">2. Time Efficiency → Rounding Capacity</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      When hospitalists spend less time on documentation, they can round more 
                      efficiently—potentially seeing more patients or spending more time per patient. 
                      This affects throughput and length of stay.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm uppercase tracking-wide">3. Clinician Sustainability</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      Hospitalist burnout and turnover are significant. Documentation burden 
                      is a major driver. Replacement costs are substantial ($400k-$600k).
                    </p>
                  </div>
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
                        When clinical conversations are fully documented, conditions that affect 
                        DRG weight are captured. This isn't upcoding—it's ensuring documentation 
                        reflects the care actually delivered.
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
                        <li>Admissions with documentation opportunities: 20-30%</li>
                        <li>DRG weight improvement when captured: 0.3-0.5</li>
                        <li>Base DRG payment: $6,000-$8,000</li>
                        <li>Realization rate: 50% (conservative)</li>
                      </ul>
                    </div>
                    <div className="border-l-2 border-[#EA2C00] pl-4">
                      <p className="text-[#888888] mb-1">Why this is defensible:</p>
                      <p className="text-[#666666]">
                        CDI data already shows documentation gaps. Claims data can track DRG 
                        shifts before/after. This is measurable—the question is magnitude.
                      </p>
                    </div>
                  </div>
                </MechanismCard>

                <MechanismCard title="CDI Query Reduction">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        When documentation is complete upfront, CDI teams spend less time querying 
                        physicians. This saves CDI labor and physician time.
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
                        <li>Baseline query rate: 25-35% of admissions</li>
                        <li>Query reduction: 15-35%</li>
                        <li>Cost per query (labor + delay): $40-$60</li>
                      </ul>
                    </div>
                  </div>
                </MechanismCard>

                <MechanismCard title="Denial Prevention">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        Inpatient denials are costly. Documentation that supports level of care 
                        and medical necessity prevents denials that can't be recovered on appeal.
                      </p>
                    </div>
                    <div>
                      <p className="text-[#666666]">
                        This is included in the DRG Accuracy calculation to avoid double-counting—
                        complete documentation supports both appropriate DRG assignment AND denial prevention.
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
                        When hospitalists spend less time documenting, they can round more efficiently. 
                        This may translate to seeing more patients or spending more time per patient.
                      </p>
                    </div>
                    <div className="bg-[#FFF8F0] border border-[#EA2C00]/20 rounded-lg p-4">
                      <p className="text-[#888888] mb-2 font-medium">Why we show this as qualitative:</p>
                      <p className="text-[#666666]">
                        Unlike outpatient, hospitalist capacity doesn't directly translate to revenue. 
                        The value is real (more time with patients, potentially shorter LOS) but harder 
                        to quantify directly. We show hours returned rather than dollar value.
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
                        Hospitalist burnout drives turnover. Documentation burden is a significant 
                        contributor. Reducing the burden can help retain hospitalists who would otherwise leave.
                      </p>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">Hospitalist-specific defaults:</p>
                      <ul className="text-[#666666] space-y-1 ml-4 list-disc">
                        <li>Turnover rate: 8-12% annually</li>
                        <li>Burnout-related: 40-50%</li>
                        <li>Replacement cost: $350,000-$500,000</li>
                      </ul>
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
                      <tr className="border-b border-[#E5E5E5]">
                        <td className="py-3">Time saved per admission</td>
                        <td className="py-3">15-45 minutes</td>
                        <td className="py-3">30 minutes</td>
                      </tr>
                      <tr className="border-b border-[#E5E5E5]">
                        <td className="py-3">Admissions with documentation opportunity</td>
                        <td className="py-3">20-30%</td>
                        <td className="py-3">25%</td>
                      </tr>
                      <tr className="border-b border-[#E5E5E5]">
                        <td className="py-3">DRG protection rate (Typical)</td>
                        <td className="py-3">15-25%</td>
                        <td className="py-3">20%</td>
                      </tr>
                      <tr className="border-b border-[#E5E5E5]">
                        <td className="py-3">DRG weight improvement</td>
                        <td className="py-3">0.3-0.5</td>
                        <td className="py-3">0.4</td>
                      </tr>
                      <tr className="border-b border-[#E5E5E5]">
                        <td className="py-3">Base DRG payment</td>
                        <td className="py-3">$5,500-$7,500</td>
                        <td className="py-3">$6,000</td>
                      </tr>
                      <tr className="border-b border-[#E5E5E5]">
                        <td className="py-3">CDI query rate</td>
                        <td className="py-3">25-35%</td>
                        <td className="py-3">30%</td>
                      </tr>
                      <tr className="border-b border-[#E5E5E5]">
                        <td className="py-3">Query reduction %</td>
                        <td className="py-3">15-35%</td>
                        <td className="py-3">25%</td>
                      </tr>
                      <tr className="border-b border-[#E5E5E5]">
                        <td className="py-3">Cost per query</td>
                        <td className="py-3">$40-$60</td>
                        <td className="py-3">$50</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section 4: The Honest Limits */}
            <CollapsibleSection
              sectionId="honest-limits"
              title="The Honest Limits"
              subtitle="What's measurable vs. attributable in inpatient"
            >
              <div className="space-y-6">
                <div className="grid gap-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#22C55E] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">Direct & Measurable</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Documentation time:</strong> EHR timestamps per note type</li>
                      <li><strong>CDI query rates:</strong> CDI department tracking</li>
                      <li><strong>DRG distribution:</strong> Claims data, CMI tracking</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#F59E0B] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">Logical & Attributable</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>DRG improvement:</strong> Measurable, but multi-factorial (CDI, coding, documentation)</li>
                      <li><strong>Denial reduction:</strong> Trackable, requires 6+ months of data</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#EF4444] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">Indirect</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>LOS impact:</strong> Many factors; documentation is one contributor</li>
                      <li><strong>Rounding efficiency:</strong> Real but hard to quantify in dollars</li>
                      <li><strong>Retention:</strong> Long-term measurement needed</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section 5: The Validation Path */}
            <CollapsibleSection
              sectionId="validation-path"
              title="The Validation Path"
              subtitle="How to validate in your hospitalist program"
            >
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <h4 className="font-semibold text-black mb-3 text-sm uppercase tracking-wide">Before Implementation</h4>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Pull 12 months of CMI data by hospitalist</li>
                      <li>Baseline CDI query rates and response times</li>
                      <li>Document current DRG denial rates</li>
                      <li>Baseline documentation time (if available)</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <h4 className="font-semibold text-black mb-3 text-sm uppercase tracking-wide">At 90 Days</h4>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Documentation time by note type</li>
                      <li>CDI query rate trends</li>
                      <li>Hospitalist satisfaction surveys</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <h4 className="font-semibold text-black mb-3 text-sm uppercase tracking-wide">At 12 Months</h4>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Year-over-year CMI comparison</li>
                      <li>DRG denial rate trends</li>
                      <li>Hospitalist turnover rates</li>
                      <li>LOS trends (with caveats about attribution)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>
    </div>
  );
}
