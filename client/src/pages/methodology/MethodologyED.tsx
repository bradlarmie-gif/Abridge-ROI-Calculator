import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronUp, Download, ArrowRight, Stethoscope, Building2, Heart, Loader2 } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { generateMethodologyPDF } from "@/lib/methodology-pdf-export";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';

interface MethodologyEDProps {
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
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-[800px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center cursor-pointer bg-transparent border-none p-0"
              data-testid="link-home-logo"
            >
              <img src={abridgeLogo} alt="Abridge" className="h-5 md:h-6" />
            </button>
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
              subtitle="Why you can't schedule value in the ED — it shows up in the patients you keep and the complexity you capture"
              defaultOpen={true}
            >
              <div className="space-y-4 text-[15px] text-black leading-relaxed">
                <p>
                  In the ED, you can't schedule value. There are no appointment slots to optimize, 
                  no panels to expand. Patients arrive when they arrive, and value shows up in 
                  three places: the patients you keep, the complexity you capture, and the physicians 
                  you retain.
                </p>
                <p>
                  Time savings per encounter are smaller here — 2–4 minutes vs. 2–4 in outpatient — 
                  because ED documentation is already faster-paced with more templated workflows. But 
                  the ED is a volume engine. At 40,000-80,000 visits per year, those minutes compound 
                  into something real. Three minutes across 50,000 visits is 2,500 hours of physician time.
                </p>
                <p>
                  The harder question is: where does that time go? In outpatient, you can trace 
                  time to wRVUs. In the ED, the value chain is more operational — it shows up in 
                  throughput, LWBS recovery, and the quality of documentation during surges when 
                  notes get rushed.
                </p>
                <p className="font-semibold">Three value paths — each with different measurement challenges:</p>

                <div className="space-y-4 mt-6">
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm uppercase tracking-wide">1. Throughput & LWBS</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      Each patient who leaves without being seen represents lost revenue — typically $300–$500+ per visit 
                      (based on blended facility and professional fees). Faster documentation contributes to faster throughput, which can 
                      recover some of these patients. But documentation is one factor among many — staffing, 
                      triage, bed availability all matter. We model the contribution honestly.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm uppercase tracking-wide">2. Documentation Quality Under Pressure</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      This is the ED's unique challenge: notes get worse when volume gets high. During surges, 
                      documentation quality drops — E/M levels understate complexity, medical necessity 
                      gets under-documented, and for admitted patients, the ED note becomes the foundation 
                      of the entire inpatient DRG. Ambient AI doesn't get tired during a surge.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm uppercase tracking-wide">3. Clinician Sustainability</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      ED burnout is a workforce crisis, not a trend. Documentation burden is a significant 
                      contributor. At $250K-$500K per physician replacement, retention isn't a soft metric — 
                      it's an existential budget line item for many EDs.
                    </p>
                  </div>
                </div>

                <div className="mt-6 bg-white rounded-lg p-5 border-l-2 border-[#EA2C00]">
                  <p className="text-sm text-[#666666] leading-relaxed">
                    <strong className="text-black">Our approach:</strong> We model all three paths but we're honest 
                    about which are directly measurable and which depend on operational decisions your ED team 
                    makes. LWBS recovery is trackable. E/M accuracy is auditable. Throughput improvement 
                    depends on how your team uses recaptured time.
                  </p>
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
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                  Time Saved → Throughput Value
                </p>
                <div className="h-px bg-[#D1D5DB] mb-6" />

                <MechanismCard title="LWBS Recovery">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        When physicians spend less time documenting, they move through patients faster. 
                        Faster throughput means shorter wait times. Shorter wait times mean fewer patients 
                        leave before being seen. Each recovered LWBS patient is revenue that was walking 
                        out the door.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        (LWBS rate before − LWBS rate after, in percentage points) × annual ED visits × $480/visit × attribution %
                      </p>
                    </div>
                    <div className="border-l-2 border-[#EA2C00] pl-4">
                      <p className="text-[#888888] mb-1">Why this is defensible:</p>
                      <p className="text-[#666666]">
                        This uses your observed before/after LWBS rate — not an assumed recovery percentage. 
                        The delta is what your data shows. Annual visits = monthly ED volume × 12.
                      </p>
                    </div>
                    <div className="bg-[#FFF8F0] border border-[#EA2C00]/20 rounded-lg p-4">
                      <p className="text-[#666666]">
                        <strong className="text-black">Honest limit:</strong> LWBS is driven by staffing, triage 
                        protocols, bed availability, and patient expectations. Documentation speed is one lever, 
                        not the only one. If your LWBS rate is already below 2%, this lever is smaller. 
                        We let you adjust based on your reality.
                      </p>
                    </div>
                  </div>
                </MechanismCard>

                <MechanismCard title="Admission Capture">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        Of the patients recovered from LWBS, some will require inpatient admission. When those patients 
                        are retained rather than leaving, the ED visit converts to inpatient admission revenue — DRG-based 
                        payment on top of the ED facility and professional fees. This driver only activates when LWBS 
                        Recovery is calculated first; the recovered patient population is the base.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        Recovered LWBS patients × admission rate % × avg admission revenue × realization rate = admission capture value
                      </p>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">The key assumptions:</p>
                      <ul className="text-[#666666] space-y-1 ml-4 list-disc">
                        <li>Admission rate from recovered LWBS patients: 15–25% (patients who left without being seen and required inpatient care)</li>
                        <li>Average admission revenue: $8,000–$12,000 (DRG-based; varies by payer mix and case mix)</li>
                        <li>Realization rate: 70–80% — accounts for payer mix, bed availability, and coding factors</li>
                      </ul>
                    </div>
                    <div className="border-l-2 border-[#EA2C00] pl-4">
                      <p className="text-[#888888] mb-1">Why this is defensible:</p>
                      <p className="text-[#666666]">
                        ED admission rates are tracked in your operational data. The recovered patient population comes 
                        directly from the LWBS calculation — it's not a new assumption, it's an extension of the same 
                        patient cohort. The admission revenue figure uses your actual DRG base rate, not a benchmark.
                      </p>
                    </div>
                    <div className="bg-[#FFF8F0] border border-[#EA2C00]/20 rounded-lg p-4">
                      <p className="text-[#666666]">
                        <strong className="text-black">Important:</strong> This calculation depends on LWBS Recovery. If you 
                        don't have LWBS data, don't estimate admission capture — the compounding of two estimates produces 
                        a number that won't survive scrutiny. Run LWBS first, get the data, then layer in admission capture.
                      </p>
                    </div>
                  </div>
                </MechanismCard>
              </div>

              {/* Documentation Quality */}
              <div className="mb-8">
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                  Documentation Quality → Revenue Value
                </p>
                <div className="h-px bg-[#D1D5DB] mb-6" />

                <MechanismCard title="E&M Level Accuracy">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        During surges, ED notes understate what actually happened. A physician manages 
                        a complex patient — multiple differentials, medication adjustments, procedure 
                        decisions — but the note reflects a simpler encounter because there wasn't time 
                        to document the full decision-making. That's revenue left on the table.
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
                        ED wRVU lift is typically lower than outpatient (2–4% vs 3–7%) because ED workflows 
                        are already more structured. We use your actual observed delta, not an assumed percentage.
                      </p>
                    </div>
                  </div>
                </MechanismCard>

                <MechanismCard title="Medical Necessity & Denials">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        Medical necessity is the ED's denial vulnerability. When a note doesn't capture 
                        why a test was ordered, why a patient was admitted, or why observation wasn't 
                        sufficient — that's a denial waiting to happen. And many ED denials are 
                        unappealable because the documentation gap existed at the time of service.
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
                        ED default: $500 per encounter (higher than outpatient due to higher acuity claims). 
                        Attribution range accounts for the documentation-related share.
                      </p>
                    </div>
                  </div>
                </MechanismCard>

              </div>

              {/* Clinician Wellbeing */}
              <div>
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                  Time Saved → Clinician Sustainability
                </p>
                <div className="h-px bg-[#D1D5DB] mb-6" />

                <MechanismCard title="Retention Savings">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-[#888888] mb-1">The mechanism:</p>
                      <p className="text-black">
                        ED physician burnout isn't a trend — it's a workforce crisis. Documentation burden 
                        is consistently cited as a top contributor. When an ED physician leaves, the cost 
                        isn't just recruiting — it's locum coverage at $250-$400/hour, coverage gaps that 
                        affect throughput, and the institutional knowledge that walks out the door.
                      </p>
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-[#888888] mb-1">The calculation:</p>
                      <p className="font-mono text-black text-sm">
                        ED physicians × Turnover rate × Burnout % × Abridge impact % × Replacement cost
                      </p>
                    </div>
                    <div>
                      <p className="text-[#888888] mb-1">ED-specific defaults:</p>
                      <ul className="text-[#666666] space-y-1 ml-4 list-disc">
                        <li>Replacement cost: $250,000-$500,000 (AMGA Physician Retention Survey benchmark)</li>
                        <li>Turnover: Often 8-15%, above the physician average</li>
                        <li>Locum coverage: $250-$400/hour during vacancy period</li>
                      </ul>
                    </div>
                    <div className="border-l-2 border-[#EA2C00] pl-4">
                      <p className="text-[#888888] mb-1">Why this is defensible:</p>
                      <p className="text-[#666666]">
                        The link between documentation burden and ED burnout is well-established — ACEP surveys, 
                        Medscape reports, and internal exit interviews consistently cite it. We use conservative 
                        impact rates (10-20%) because documentation is one of many burnout drivers in the ED. 
                        But the replacement cost is real and verifiable.
                      </p>
                    </div>
                    <p className="text-[#666666] italic">
                      This takes 12-18 months to measure — but in a setting with $250K-$500K replacement costs, 
                      retaining even one additional physician can justify the investment. We apply the conservative 
                      end of the AMGA range. Locum coverage costs during vacancy are tracked separately as agency spend.
                    </p>
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
                      <td className="py-3">LWBS reduction</td>
                      <td className="py-3">✅ Yes</td>
                      <td className="py-3">LWBS pp delta × annual visits × $480/visit</td>
                    </tr>
                    <tr className="border-b border-[#E5E5E5]">
                      <td className="py-3">wRVU / E/M lift</td>
                      <td className="py-3">✅ Yes</td>
                      <td className="py-3">wRVU delta × adopted encounters × $33/wRVU</td>
                    </tr>
                    <tr className="border-b border-[#E5E5E5]">
                      <td className="py-3">Denial rate reduction</td>
                      <td className="py-3">✅ Yes</td>
                      <td className="py-3">Denial pp delta × encounters × $500/encounter</td>
                    </tr>
                    <tr className="border-b border-[#E5E5E5]">
                      <td className="py-3">CDI / DRG impact on admitted patients</td>
                      <td className="py-3 text-[#F59E0B] font-medium">Not here — see Inpatient</td>
                      <td className="py-3">Captured in CMI delta calculation</td>
                    </tr>
                    <tr className="border-b border-[#E5E5E5]">
                      <td className="py-3">Admission capture from LWBS recovery</td>
                      <td className="py-3">✅ Yes (if LWBS data provided)</td>
                      <td className="py-3">Recovered patients × admission rate × avg DRG revenue</td>
                    </tr>
                    <tr className="border-b border-[#E5E5E5]">
                      <td className="py-3">ED physician retention</td>
                      <td className="py-3">✅ Yes (if survey data provided)</td>
                      <td className="py-3">Turnovers avoided × $250K–$500K</td>
                    </tr>
                    <tr className="border-b border-[#E5E5E5]">
                      <td className="py-3">After-hours time savings</td>
                      <td className="py-3 text-[#F59E0B] font-medium">Signal only — not monetized</td>
                      <td className="py-3">Tracked as hours (salaried providers)</td>
                    </tr>
                  </tbody>
                </table>
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">Time saved per encounter</td>
                            <td className="py-3">2-4 minutes</td>
                            <td className="py-3">3 minutes</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">ED documentation is faster-paced with more templated workflows. Time savings are smaller per encounter but high volume amplifies impact.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">ED wRVU baseline</td>
                            <td className="py-3">2.0-3.0</td>
                            <td className="py-3">2.5</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">ACEP benchmarks for ED encounters. Higher than outpatient due to acuity and complexity of ED visits.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">wRVU lift %</td>
                            <td className="py-3">2-4%</td>
                            <td className="py-3">3%</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">ED coding often under-captures complexity. Better documentation supports higher E&M levels when clinically appropriate.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">LWBS rate</td>
                            <td className="py-3">2-4%</td>
                            <td className="py-3">3%</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">Left Without Being Seen rate. National benchmark is ~2-3%. High-volume urban EDs may see 4-5%+.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">LWBS recovery rate</td>
                            <td className="py-3">5-15%</td>
                            <td className="py-3">10%</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">Percentage of LWBS patients recovered through reduced wait times. Conservative estimate—actual recovery depends on throughput improvement.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">Avg ED visit revenue</td>
                            <td className="py-3">$400-$600</td>
                            <td className="py-3">$480</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">Blended average across facility and professional fees. Varies significantly by payer mix and acuity.</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <tr className="border-b border-[#E5E5E5] hover:bg-[#F5F0EB] cursor-help transition-colors">
                            <td className="py-3">ED admission rate</td>
                            <td className="py-3">15-25%</td>
                            <td className="py-3">20%</td>
                          </tr>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">Percentage of ED visits resulting in inpatient admission. Higher rates correlate with higher acuity patient population.</p>
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
              subtitle="What we can prove, what we can support, and what we can only enable in the ED"
            >
              <div className="space-y-6">
                <p className="text-[15px] text-black leading-relaxed">
                  The ED is operationally complex. Many factors drive throughput, revenue, and retention. 
                  We're transparent about exactly how much of each outcome we can credibly attribute to 
                  documentation improvement.
                </p>
                <div className="grid gap-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#22C55E] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can Measure This</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Documentation time per encounter:</strong> EHR timestamps show exactly when charting happens and how long it takes. Visible in weeks.</li>
                      <li><strong>E/M level distribution:</strong> Claims data shows coding accuracy shifts. Compare high-volume vs. low-volume shifts for proof.</li>
                      <li><strong>Denial rates by category:</strong> RCM data identifies documentation-related denials specifically. Track before and after.</li>
                      <li><strong>LWBS rate:</strong> Most EDs track this. The metric is clean — the attribution is the challenge.</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#F59E0B] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can Influence This</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>Throughput improvement:</strong> Documentation is one input to throughput. Staffing, bed management, triage protocols all matter. We contribute, we don't control.</li>
                      <li><strong>Door-to-doc time:</strong> Influenced by staffing, space, acuity mix, and workflow design. Documentation speed is a factor, not the only factor.</li>
                      <li><strong>CDI query reduction:</strong> Better ED notes reduce queries, but inpatient documentation matters too. Track ED-specific query rates.</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 bg-[#EF4444] rounded-full" />
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">We Can Only Enable This</h4>
                    </div>
                    <ul className="text-sm text-[#666666] space-y-2 ml-5">
                      <li><strong>DRG impact on admitted patients:</strong> ED documentation influences but doesn't determine inpatient DRG. Requires downstream tracking.</li>
                      <li><strong>Retention:</strong> Documentation burden is one of many ED burnout drivers. Impact takes 12-18 months. Real, but not the whole story.</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-5 border-l-2 border-[#EA2C00]">
                  <p className="text-sm text-[#666666] leading-relaxed">
                    <strong className="text-black">Our philosophy:</strong> We'd rather show you a smaller number 
                    you can defend in an ED leadership meeting than a larger number that falls apart when your 
                    leadership asks "how did you attribute that?" Key assumptions are editable — because your ED's 
                    data should drive the answer, not our defaults.
                  </p>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section 5: The Validation Path */}
            <CollapsibleSection
              sectionId="validation-path"
              title="The Validation Path"
              subtitle="How to prove this with your ED's data — before, during, and after"
            >
              <div className="space-y-6">
                <p className="text-[15px] text-black leading-relaxed">
                  ED metrics move fast but are noisy. Seasonality, staffing changes, and patient mix 
                  all affect outcomes. Here's how to build a credible before/after comparison despite the noise.
                </p>
                <div className="space-y-4">
                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">Before Implementation</h4>
                      <span className="text-xs text-[#888888] font-medium">Baseline period</span>
                    </div>
                    <p className="text-sm text-[#666666] mb-3">
                      Get 12 months minimum — ED metrics are seasonal and you need to control for that.
                    </p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>LWBS data by month, day of week, and shift — you need to see the patterns</li>
                      <li>E/M level distribution by provider and shift volume</li>
                      <li>CDI query rates specifically for ED-to-inpatient cases</li>
                      <li>Door-to-doc and door-to-disposition times</li>
                      <li>Denial rates with root cause categorization</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 90 Days</h4>
                      <span className="text-xs text-[#888888] font-medium">Early signal</span>
                    </div>
                    <p className="text-sm text-[#666666] mb-3">
                      Documentation improvements show fast. Throughput takes longer. Be patient with LWBS.
                    </p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Documentation time per encounter — this will be the most dramatic early metric</li>
                      <li>E/M level trends (compare same providers, same shift types)</li>
                      <li>LWBS rate monitoring — but caveat for seasonality and staffing changes</li>
                      <li>Physician satisfaction surveys — qualitative signal matters in the ED</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 6-12 Months</h4>
                      <span className="text-xs text-[#888888] font-medium">Operational validation</span>
                    </div>
                    <p className="text-sm text-[#666666] mb-3">
                      Throughput and revenue signals become statistically meaningful with enough volume.
                    </p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Year-over-year LWBS comparison (same months, controlling for volume)</li>
                      <li>CDI query rate trends for admitted patients</li>
                      <li>Denial rate trends by documentation-related categories</li>
                      <li>Door-to-disposition trends — control for staffing and volume changes</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-black text-sm uppercase tracking-wide">At 18+ Months</h4>
                      <span className="text-xs text-[#888888] font-medium">Long-term impact</span>
                    </div>
                    <p className="text-sm text-[#666666] mb-3">
                      Retention is the long game. Don't rush this measurement.
                    </p>
                    <ul className="text-sm text-[#666666] space-y-2 ml-4 list-disc">
                      <li>Physician turnover: Abridge providers vs. non-Abridge (if applicable)</li>
                      <li>Locum utilization trends</li>
                      <li>Exit interview data — is documentation still a cited burnout factor?</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Section 6: Connected Value */}
            <CollapsibleSection
              sectionId="connected-value"
              title="Connected Value"
              subtitle="How ED documentation connects to the rest of your organization"
            >
              <div className="space-y-4 text-[15px] text-black leading-relaxed">
                <p>
                  The ED doesn't operate in isolation. Documentation quality here creates 
                  ripple effects across the organization:
                </p>
                <div className="space-y-4 mt-4">
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm">ED → Inpatient (DRG impact)</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      Better ED documentation is the foundation of DRG accuracy for admitted patients — when 
                      presenting conditions, comorbidities, and clinical reasoning are captured at the point 
                      of care, the inpatient stay begins with a stronger clinical picture. We quantify this 
                      in the Inpatient methodology, not here, to prevent double-counting. If you're modeling 
                      both settings, do not include DRG value in the ED calculation.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm">ED → Nursing (care continuity)</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      ED nursing documentation feeds into inpatient handoffs. When assessments are 
                      captured in real-time during the ED stay, the transition to floor nursing has 
                      better clinical context — reducing missed information at a high-risk transition point.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-5 border border-[#E5E5E5]">
                    <h4 className="font-bold text-black mb-2 text-sm">ED → Outpatient (follow-up quality)</h4>
                    <p className="text-sm text-[#666666] leading-relaxed">
                      Complete ED documentation improves follow-up care. When the PCP gets a comprehensive 
                      ED visit note, they can continue care without gaps. Hard to quantify, but real.
                    </p>
                  </div>
                </div>
                <p className="text-[#666666] italic mt-4">
                  We don't sum these cross-setting values into the ED model because the attribution 
                  gets complex. But they're part of the strategic case for comprehensive documentation 
                  that goes beyond the ED's own P&L.
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
            Use these methodology principles to create a customized ROI model for your emergency department.
          </p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 bg-[#EA2C00] hover:bg-[#D12600] text-white font-medium px-6 py-3 rounded-lg transition-colors"
            data-testid="button-build-model"
          >
            Build an ED Model
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
            ED patients often flow to inpatient. Explore how value chains connect across settings.
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
                <p className="text-xs text-[#888888]">ED admissions flow here</p>
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
                <p className="text-xs text-[#888888]">ED nursing documentation</p>
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
