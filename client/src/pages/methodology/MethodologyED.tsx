import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface MethodologyEDProps {
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

export function MethodologyED({ onBack }: MethodologyEDProps) {
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
            Emergency: How We Think About Value
          </h1>
          <p className="text-base text-[#666666]">
            Where speed matters and every minute counts differently
          </p>
        </motion.div>

        {/* Sections */}
        <div className="bg-[#F5F0EB] rounded-lg">
          <div className="px-6">
            {/* Section 1: The Context */}
            <CollapsibleSection
              sectionId="context"
              title="The Context"
              subtitle="Why ED value shows up differently"
              defaultOpen={true}
            >
              <div className="space-y-4 text-[15px] text-black leading-relaxed">
                <p>
                  The ED is a different animal. Documentation happens faster, volume is unpredictable, 
                  and the connection between documentation and revenue follows different paths.
                </p>
                <p>
                  Time savings per encounter are smaller in the ED—1-3 minutes vs. 4-6 in outpatient—because 
                  ED documentation is already faster-paced with more templated workflows. But with 40,000+ 
                  visits per year, those minutes compound.
                </p>
                <p className="font-semibold">Where ED value lives:</p>

                <div className="space-y-4 mt-6">
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm uppercase tracking-wide">1. Throughput & LWBS</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      Every patient who leaves without being seen (LWBS) is lost revenue—often $300-500+ 
                      per visit. Faster documentation can reduce door-to-doc time and improve throughput, 
                      potentially recovering LWBS patients.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm uppercase tracking-wide">2. Documentation Quality</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      ED notes often understate complexity during surges. Better documentation captures 
                      appropriate E/M levels, supports medical necessity, and—for admitted patients—
                      affects the entire inpatient DRG assignment through CDI.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm uppercase tracking-wide">3. Clinician Sustainability</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      ED burnout is at crisis levels. Documentation burden contributes significantly. 
                      Retention savings are substantial given the cost to replace ED physicians ($400k-$700k).
                    </p>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section 2: The Value Mechanisms */}
            <CollapsibleSection
              sectionId="value-mechanisms"
              title="The Value Mechanisms"
              subtitle="How time saved becomes dollars in the ED"
            >
              {/* Throughput */}
              <div className="mb-8">
                <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                  Time Saved → Throughput Value
                </p>
                <div className="h-px bg-[#D1D5DB] mb-6" />

                <MechanismCard title="LWBS Recovery">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        Faster documentation contributes to faster throughput. Some portion of LWBS 
                        patients can be recovered if door-to-doc time improves.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        LWBS patients × Recovery rate × Revenue per visit = LWBS value
                      </p>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">Key assumptions:</p>
                      <ul className="text-[#666666] space-y-1 ml-4 list-disc">
                        <li>National LWBS rate: 2-4%</li>
                        <li>Documentation-attributable recovery: 5-15%</li>
                        <li>Average ED visit revenue: $300-$500</li>
                      </ul>
                    </div>
                    <div className="bg-[#FFF8F0] border border-[#EA2C00]/20 rounded-lg p-4">
                      <p className="text-[#666666]">
                        <strong className="text-black">Honest limit:</strong> Many factors drive LWBS—staffing, 
                        triage, bed availability. Documentation is one lever, not the only one. 
                        We use conservative recovery rates.
                      </p>
                    </div>
                  </div>
                </MechanismCard>
              </div>

              {/* Documentation Quality */}
              <div className="mb-8">
                <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                  Documentation Quality → Revenue Value
                </p>
                <div className="h-px bg-[#D1D5DB] mb-6" />

                <MechanismCard title="E&M Level Accuracy">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        During high-volume surges, ED notes often understate complexity. Complete 
                        documentation of medical decision-making supports appropriate E/M coding.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        Encounters × Baseline wRVU × Lift % × Conversion factor
                      </p>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">ED-specific notes:</p>
                      <p className="text-[#666666]">
                        ED wRVU lift is typically lower than outpatient (2-4% vs 3-7%) because 
                        ED workflows are already more templated and fast-paced.
                      </p>
                    </div>
                  </div>
                </MechanismCard>

                <MechanismCard title="Medical Necessity & Denials">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        Medical necessity documentation is critical in the ED. Incomplete notes 
                        lead to denials that can't be appealed—permanent revenue loss.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        Encounters × Denial rate × Med necessity % × Prevention rate × Claim value
                      </p>
                    </div>
                  </div>
                </MechanismCard>

                <MechanismCard title="CDI & Inpatient Connection">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        For admitted patients, ED documentation becomes the foundation of the inpatient 
                        record. Better ED notes reduce CDI queries and support appropriate DRG assignment.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        Admissions × DRG improvement rate × Avg DRG value increase
                      </p>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">Key assumption:</p>
                      <p className="text-[#666666]">
                        Typical ED admission rate: 15-25% of visits. The DRG impact only applies 
                        to admitted patients.
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
                        ED physician burnout is at crisis levels. Documentation burden is a major 
                        contributor. Reducing this burden can help retain physicians who would otherwise leave.
                      </p>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">ED-specific considerations:</p>
                      <ul className="text-[#666666] space-y-1 ml-4 list-disc">
                        <li>ED physician replacement cost: $400,000-$700,000</li>
                        <li>ED turnover rates: Often higher than other specialties</li>
                        <li>Locum ED coverage: $250-$400/hour</li>
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
              subtitle="ED-specific defaults and ranges"
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
                        <td className="py-3">Time saved per encounter</td>
                        <td className="py-3">1-3 minutes</td>
                        <td className="py-3">2 minutes</td>
                      </tr>
                      <tr className="border-b border-[#E5E5E5]">
                        <td className="py-3">ED wRVU baseline</td>
                        <td className="py-3">2.0-3.0</td>
                        <td className="py-3">2.5</td>
                      </tr>
                      <tr className="border-b border-[#E5E5E5]">
                        <td className="py-3">wRVU lift %</td>
                        <td className="py-3">2-4%</td>
                        <td className="py-3">3%</td>
                      </tr>
                      <tr className="border-b border-[#E5E5E5]">
                        <td className="py-3">LWBS rate</td>
                        <td className="py-3">2-4%</td>
                        <td className="py-3">3%</td>
                      </tr>
                      <tr className="border-b border-[#E5E5E5]">
                        <td className="py-3">LWBS recovery rate</td>
                        <td className="py-3">5-15%</td>
                        <td className="py-3">10%</td>
                      </tr>
                      <tr className="border-b border-[#E5E5E5]">
                        <td className="py-3">Avg ED visit revenue</td>
                        <td className="py-3">$300-$500</td>
                        <td className="py-3">$400</td>
                      </tr>
                      <tr className="border-b border-[#E5E5E5]">
                        <td className="py-3">ED admission rate</td>
                        <td className="py-3">15-25%</td>
                        <td className="py-3">20%</td>
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
              subtitle="What's measurable vs. influential in the ED"
            >
              <div className="space-y-6">
                <div className="grid gap-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#22C55E] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">Direct & Measurable</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Documentation time:</strong> EHR timestamps</li>
                      <li><strong>E/M level distribution:</strong> Claims data</li>
                      <li><strong>Denial rates:</strong> Payer reports</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#F59E0B] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">Logical but Multi-Factorial</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>LWBS improvement:</strong> Many factors; documentation is one</li>
                      <li><strong>Door-to-doc time:</strong> Influenced by staffing, space, acuity</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#EF4444] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">Indirect</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>CDI/DRG impact:</strong> Requires tracking admitted patients downstream</li>
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
              subtitle="How to validate in your ED"
            >
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <h4 className="font-semibold text-black mb-3 text-sm uppercase tracking-wide">Before Implementation</h4>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Pull 12 months of LWBS data</li>
                      <li>Baseline E/M level distribution</li>
                      <li>Document CDI query rates for ED-to-inpatient cases</li>
                      <li>Baseline door-to-doc times</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <h4 className="font-semibold text-black mb-3 text-sm uppercase tracking-wide">At 90 Days</h4>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Documentation time comparison</li>
                      <li>E/M level trends</li>
                      <li>LWBS rate monitoring (with caveats about seasonality)</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <h4 className="font-semibold text-black mb-3 text-sm uppercase tracking-wide">At 12 Months</h4>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Year-over-year LWBS and throughput comparison</li>
                      <li>CDI query rate trends for admitted patients</li>
                      <li>Denial rate trends</li>
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
