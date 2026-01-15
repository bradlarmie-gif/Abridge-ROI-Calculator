import { useState } from "react";
import { 
  ArrowLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  Lightbulb, 
  Calculator, 
  Sliders,
  BarChart3,
  AlertTriangle,
  Building2,
  ClipboardList,
  Clock,
  Info,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SETTING_CONFIG, type LeverConfig } from "@/lib/SETTING_CONFIG";

interface NursingValueMethodologyProps {
  selectedDrivers: string[];
  onBack: () => void;
  onContinue: () => void;
}

interface DriverMethodology {
  id: string;
  theory: string;
  calculationSteps: {
    title: string;
    rows: { label: string; value: string }[];
  }[];
  keyVariables: string[];
  rangeConservative: string;
  rangeTypical: string;
  referenceValue: number;
}

const NURSING_DRIVER_METHODOLOGY: Record<string, DriverMethodology> = {
  documentation_time_savings: {
    id: "documentation_time_savings",
    theory: "Nurses spend significant time documenting into flowsheets throughout each shift. Ambient documentation reduces time spent on manual entry, returning hours to nursing staff. This time can be reinvested in patient care or captured as labor efficiency.",
    calculationSteps: [
      {
        title: "STEP 1: DOCUMENTATION VOLUME",
        rows: [
          { label: "Staffed beds", value: "200" },
          { label: "Documentation events per patient per shift", value: "7" },
          { label: "Shifts per day", value: "3" },
          { label: "Days per year", value: "365" },
          { label: "Total events per year", value: "511,000" },
          { label: "Utilization rate", value: "65% (typical)" },
          { label: "Eligible events", value: "332,150" },
        ],
      },
      {
        title: "STEP 2: TIME RETURNED",
        rows: [
          { label: "Minutes saved per documentation event", value: "4 min (typical)" },
          { label: "Total minutes saved", value: "1,328,600" },
          { label: "Hours returned annually", value: "22,143 hrs" },
        ],
      },
      {
        title: "STEP 3: VALUE EQUIVALENT",
        rows: [
          { label: "Avg nurse hourly rate", value: "$45" },
          { label: "Labor value equivalent", value: "$996,435" },
        ],
      },
    ],
    keyVariables: ["Staffed beds", "Patients per nurse", "Minutes saved per event", "Flowsheets in scope", "Utilization rate"],
    rangeConservative: "$400k-600k",
    rangeTypical: "$800k-1.2M",
    referenceValue: 996435,
  },
  overtime_reduction: {
    id: "overtime_reduction",
    theory: "End-of-shift documentation often pushes nurses into overtime. By enabling real-time documentation during patient interactions, Abridge helps nurses complete shifts on time, reducing overtime hours and associated premium pay.",
    calculationSteps: [
      {
        title: "STEP 1: OVERTIME BASELINE",
        rows: [
          { label: "Total nursing FTEs", value: "280" },
          { label: "Hours per FTE per year", value: "2,080" },
          { label: "% of hours as overtime", value: "8%" },
          { label: "Total OT hours annually", value: "46,592" },
        ],
      },
      {
        title: "STEP 2: REDUCTION POTENTIAL",
        rows: [
          { label: "% OT attributable to documentation", value: "35%" },
          { label: "Documentation-related OT hours", value: "16,307" },
          { label: "Reduction with Abridge", value: "60%" },
          { label: "OT hours avoided", value: "9,784" },
        ],
      },
      {
        title: "STEP 3: SAVINGS CALCULATION",
        rows: [
          { label: "OT premium rate (1.5x of $45)", value: "$67.50" },
          { label: "Base rate offset", value: "-$45.00" },
          { label: "Net savings per hour", value: "$22.50" },
          { label: "Total overtime savings", value: "$460,688" },
        ],
      },
    ],
    keyVariables: ["Nursing FTEs", "Current OT %", "OT attributable to documentation", "Reduction rate"],
    rangeConservative: "$200k-350k",
    rangeTypical: "$400k-600k",
    referenceValue: 460688,
  },
  agency_reduction: {
    id: "agency_reduction",
    theory: "Travel and agency nurses command significant premiums. By improving working conditions and reducing burnout, organizations can decrease reliance on premium labor. Better retention means fewer gaps to fill with expensive temporary staff.",
    calculationSteps: [
      {
        title: "STEP 1: AGENCY BASELINE",
        rows: [
          { label: "Total nursing hours needed", value: "582,400" },
          { label: "Current agency fill rate", value: "12%" },
          { label: "Agency hours annually", value: "69,888" },
        ],
      },
      {
        title: "STEP 2: REDUCTION POTENTIAL",
        rows: [
          { label: "Agency reduction with retention", value: "20%" },
          { label: "Agency hours reduced", value: "13,978" },
        ],
      },
      {
        title: "STEP 3: SAVINGS CALCULATION",
        rows: [
          { label: "Agency rate premium", value: "$95/hr" },
          { label: "Staff rate", value: "$45/hr" },
          { label: "Net premium per hour", value: "$50" },
          { label: "Total agency savings", value: "$832,000" },
        ],
      },
    ],
    keyVariables: ["Agency fill rate", "Agency premium", "Retention improvement", "Total nursing hours"],
    rangeConservative: "$400k-600k",
    rangeTypical: "$700k-1M",
    referenceValue: 832000,
  },
  nurse_retention: {
    id: "nurse_retention",
    theory: "Nursing turnover is extremely costly—often 1.5-2x annual salary when accounting for recruiting, onboarding, and productivity ramp. Documentation burden is a leading cause of burnout. Reducing this burden improves job satisfaction and retention.",
    calculationSteps: [
      {
        title: "STEP 1: TURNOVER BASELINE",
        rows: [
          { label: "Total nursing staff", value: "280" },
          { label: "Annual turnover rate", value: "22%" },
          { label: "Departures per year", value: "62" },
        ],
      },
      {
        title: "STEP 2: RETENTION IMPROVEMENT",
        rows: [
          { label: "Turnover attributable to burnout", value: "40%" },
          { label: "Burnout-related departures", value: "25" },
          { label: "Reduction with Abridge", value: "25%" },
          { label: "Departures avoided", value: "6" },
        ],
      },
      {
        title: "STEP 3: VALUE CALCULATION",
        rows: [
          { label: "Avg nurse salary", value: "$75,000" },
          { label: "Replacement cost multiplier", value: "0.87x" },
          { label: "Cost per departure", value: "$65,520" },
          { label: "Total retention value", value: "$393,120" },
        ],
      },
    ],
    keyVariables: ["Total nursing staff", "Turnover rate", "Burnout attribution", "Replacement cost"],
    rangeConservative: "$200k-350k",
    rangeTypical: "$350k-500k",
    referenceValue: 393120,
  },
  documentation_timeliness: {
    id: "documentation_timeliness",
    theory: "Delayed documentation creates gaps in care coordination. Real-time ambient documentation ensures that assessments, vitals, and care notes are immediately available to the care team, improving handoffs and reducing clinical risk.",
    calculationSteps: [
      {
        title: "STEP 1: TIMELINESS BASELINE",
        rows: [
          { label: "Critical assessments per day", value: "450" },
          { label: "Current avg documentation lag", value: "2.5 hrs" },
          { label: "Target documentation lag", value: "15 min" },
        ],
      },
      {
        title: "STEP 2: IMPROVEMENT VALUE",
        rows: [
          { label: "Care coordination errors from lag", value: "12/month" },
          { label: "Errors avoided with real-time", value: "8/month" },
          { label: "Avg cost per coordination error", value: "$150" },
        ],
      },
      {
        title: "STEP 3: ANNUAL VALUE",
        rows: [
          { label: "Monthly savings", value: "$1,200" },
          { label: "Annual documentation timeliness value", value: "$15,000" },
        ],
      },
    ],
    keyVariables: ["Critical assessments", "Current lag time", "Error rate", "Error cost"],
    rangeConservative: "$8k-12k",
    rangeTypical: "$12k-20k",
    referenceValue: 15000,
  },
  documentation_completeness: {
    id: "documentation_completeness",
    theory: "Incomplete documentation leads to compliance issues, failed audits, and clinical gaps. Ambient documentation captures the full patient interaction, ensuring key fields are populated and nothing is missed due to time pressure.",
    calculationSteps: [
      {
        title: "STEP 1: COMPLETENESS BASELINE",
        rows: [
          { label: "Required documentation fields", value: "45" },
          { label: "Current completion rate", value: "78%" },
          { label: "Target completion rate", value: "95%" },
        ],
      },
      {
        title: "STEP 2: COMPLIANCE VALUE",
        rows: [
          { label: "Audit deficiencies per quarter", value: "25" },
          { label: "Avg remediation cost per deficiency", value: "$175" },
          { label: "Deficiencies avoided with Abridge", value: "100/year" },
        ],
      },
      {
        title: "STEP 3: ANNUAL VALUE",
        rows: [
          { label: "Total documentation completeness value", value: "$17,500" },
        ],
      },
    ],
    keyVariables: ["Required fields", "Current completion rate", "Audit deficiency rate", "Remediation cost"],
    rangeConservative: "$10k-15k",
    rangeTypical: "$15k-25k",
    referenceValue: 17500,
  },
  safety_event_reduction: {
    id: "safety_event_reduction",
    theory: "Timely and complete documentation supports identification of at-risk patients for pressure injuries, falls, and other safety events. While documentation is just one component, it enables appropriate care planning and risk mitigation.",
    calculationSteps: [
      {
        title: "STEP 1: SAFETY EVENT BASELINE",
        rows: [
          { label: "Patient days per year", value: "73,000" },
          { label: "HAPI rate per 1,000 patient days", value: "2.5" },
          { label: "Fall rate per 1,000 patient days", value: "3.2" },
          { label: "Total safety events", value: "416" },
        ],
      },
      {
        title: "STEP 2: ATTRIBUTION TO DOCUMENTATION",
        rows: [
          { label: "Events with documentation gaps", value: "35%" },
          { label: "Documentation-related events", value: "146" },
          { label: "Potential reduction with better docs", value: "15%" },
          { label: "Events potentially avoided", value: "22" },
        ],
      },
      {
        title: "STEP 3: VALUE CALCULATION",
        rows: [
          { label: "Avg cost per safety event", value: "$5,857" },
          { label: "Total safety event value", value: "$128,850" },
        ],
      },
    ],
    keyVariables: ["Patient days", "Current safety event rates", "Documentation gap attribution", "Event cost"],
    rangeConservative: "$50k-100k",
    rangeTypical: "$100k-200k",
    referenceValue: 128850,
  },
  ccmcc_support: {
    id: "ccmcc_support",
    theory: "Complete clinical documentation supports CDI efforts to capture appropriate CC/MCC codes. While Abridge doesn't directly assign codes, comprehensive nursing notes provide the clinical indicators CDI specialists need.",
    calculationSteps: [
      {
        title: "STEP 1: CASE MIX BASELINE",
        rows: [
          { label: "Annual discharges", value: "8,500" },
          { label: "Cases with potential CC/MCC opportunity", value: "25%" },
          { label: "Opportunity cases", value: "2,125" },
        ],
      },
      {
        title: "STEP 2: DOCUMENTATION IMPACT",
        rows: [
          { label: "Cases with nursing documentation gaps", value: "40%" },
          { label: "Gap cases", value: "850" },
          { label: "Capture improvement with better docs", value: "20%" },
          { label: "Additional captures", value: "170" },
        ],
      },
      {
        title: "STEP 3: REVENUE IMPACT",
        rows: [
          { label: "Avg CC/MCC revenue lift", value: "$1,001" },
          { label: "Total CC/MCC support value", value: "$170,188" },
        ],
      },
    ],
    keyVariables: ["Annual discharges", "CC/MCC opportunity rate", "Documentation gap rate", "Revenue lift"],
    rangeConservative: "$80k-140k",
    rangeTypical: "$150k-250k",
    referenceValue: 170188,
  },
};

export default function NursingValueMethodology({
  selectedDrivers,
  onBack,
  onContinue,
}: NursingValueMethodologyProps) {
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(new Set([selectedDrivers[0] || ""]));
  
  const nursingDrivers = SETTING_CONFIG.nursing;
  const selectedDriverConfigs = nursingDrivers.filter(d => selectedDrivers.includes(d.id));
  
  const toggleExpanded = (driverId: string) => {
    setExpandedDrivers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(driverId)) {
        newSet.delete(driverId);
      } else {
        newSet.add(driverId);
      }
      return newSet;
    });
  };

  const totalReferenceValue = selectedDrivers.reduce((sum, id) => {
    const methodology = NURSING_DRIVER_METHODOLOGY[id];
    return sum + (methodology?.referenceValue || 0);
  }, 0);

  const getDriverIcon = (driverId: string) => {
    switch (driverId) {
      case "documentation_time_savings":
      case "overtime_reduction":
        return <Clock className="w-5 h-5" />;
      case "agency_reduction":
      case "nurse_retention":
        return <Building2 className="w-5 h-5" />;
      case "documentation_timeliness":
      case "documentation_completeness":
        return <ClipboardList className="w-5 h-5" />;
      case "safety_event_reduction":
      case "ccmcc_support":
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12 md:py-16 pb-32">
        <div className="max-w-4xl">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-8 text-sm font-semibold text-[#F03319]"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Strategic Priorities
          </Button>

          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Value Methodology
            </h1>
            <p className="text-lg text-neutral-600 leading-relaxed">
              This reference scenario shows potential value for a typical mid-sized hospital.
              Review how each driver creates value, then customize with your specific numbers
              in the next step.
            </p>
          </div>

          {/* Reference Scenario Card */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-6 md:p-8 mb-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#F03319]" />
              <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">
                Reference Scenario
              </h2>
            </div>
            <p className="text-neutral-600 mb-6">
              Typical 200-bed community hospital, med-surg focused
            </p>
            
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-neutral-900 font-mono">200</div>
                <div className="text-sm text-neutral-500 mt-1">staffed beds</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-neutral-900 font-mono">332,150</div>
                <div className="text-sm text-neutral-500 mt-1">documentation events/year</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-neutral-900 font-mono">65%</div>
                <div className="text-sm text-neutral-500 mt-1">adoption</div>
              </div>
            </div>

            <div className="bg-neutral-50 rounded-xl p-4 flex items-center gap-3">
              <Info className="w-5 h-5 text-neutral-400 flex-shrink-0" />
              <p className="text-sm text-neutral-600">
                This creates: <span className="font-semibold">~332,150 Abridge-documented events per year</span>
              </p>
            </div>
          </div>

          {/* Your Selected Value Drivers */}
          <div className="mb-10">
            <h2 className="text-xl font-bold text-neutral-900 mb-6">
              Your Selected Value Drivers
            </h2>
            
            <div className="space-y-4">
              {selectedDriverConfigs.map((driver) => {
                const methodology = NURSING_DRIVER_METHODOLOGY[driver.id];
                const isExpanded = expandedDrivers.has(driver.id);
                
                if (!methodology) return null;

                return (
                  <div
                    key={driver.id}
                    className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden"
                    data-testid={`driver-card-${driver.id}`}
                  >
                    {/* Header */}
                    <div
                      onClick={() => toggleExpanded(driver.id)}
                      className="w-full flex items-center justify-between p-5 text-left cursor-pointer"
                      data-testid={`driver-toggle-${driver.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${driver.hasWarning ? 'bg-amber-100 text-amber-600' : 'bg-[#FFF5F3] text-[#F03319]'}`}>
                          {getDriverIcon(driver.id)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            {driver.hasWarning && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                            <span className="font-semibold text-neutral-900">{driver.label}</span>
                          </div>
                          <div className="text-sm text-neutral-500">
                            Reference value: <span className="font-semibold text-neutral-700">{formatCurrency(methodology.referenceValue)}</span>
                          </div>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-neutral-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-neutral-100">
                        {/* Important Limitation Warning for indirect drivers */}
                        {driver.hasWarning && (
                          <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <div className="font-semibold text-amber-800 mb-2">Important Limitation</div>
                                <p className="text-sm text-amber-700 mb-3">
                                  This is an <strong>INDIRECT</strong> relationship. We cannot claim that
                                  Abridge directly prevents these events.
                                </p>
                                <div className="text-sm text-amber-700">
                                  <p className="font-medium mb-1">What we CAN say:</p>
                                  <ul className="list-disc list-inside space-y-1 ml-2">
                                    <li>Timely documentation supports identification of at-risk patients</li>
                                    <li>Complete assessment documentation enables appropriate care planning</li>
                                    <li>Documentation is ONE component of prevention protocols</li>
                                  </ul>
                                </div>
                                <p className="text-sm text-amber-700 mt-3 italic">
                                  This value is speculative and for directional planning only.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* The Theory */}
                        <div className="mt-5">
                          <div className="flex items-center gap-2 mb-3">
                            <Lightbulb className="w-4 h-4 text-[#F03319]" />
                            <span className="text-sm font-semibold text-neutral-700">The Theory</span>
                          </div>
                          <p className="text-neutral-600 text-sm leading-relaxed">
                            {methodology.theory}
                          </p>
                        </div>

                        {/* How We Calculate It */}
                        <div className="mt-6">
                          <div className="flex items-center gap-2 mb-3">
                            <Calculator className="w-4 h-4 text-[#F03319]" />
                            <span className="text-sm font-semibold text-neutral-700">How We Calculate It</span>
                          </div>
                          <div className="bg-neutral-50 rounded-xl p-4 space-y-4">
                            {methodology.calculationSteps.map((step, stepIdx) => (
                              <div key={stepIdx}>
                                <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                                  {step.title}
                                </div>
                                <div className="space-y-1">
                                  {step.rows.map((row, rowIdx) => (
                                    <div key={rowIdx} className="flex justify-between text-sm">
                                      <span className="text-neutral-600">{row.label}</span>
                                      <span className="font-mono text-neutral-900">{row.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Key Variables */}
                        <div className="mt-6">
                          <div className="flex items-center gap-2 mb-3">
                            <Sliders className="w-4 h-4 text-[#F03319]" />
                            <span className="text-sm font-semibold text-neutral-700">Key Variables You'll Customize</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {methodology.keyVariables.map((variable, idx) => (
                              <span key={idx} className="px-3 py-1 bg-neutral-100 rounded-full text-sm text-neutral-600">
                                {variable}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Range Across Customers */}
                        <div className="mt-6">
                          <div className="flex items-center gap-2 mb-3">
                            <BarChart3 className="w-4 h-4 text-[#F03319]" />
                            <span className="text-sm font-semibold text-neutral-700">Range Across Customers</span>
                          </div>
                          <div className="flex gap-4">
                            <div className="flex-1 bg-neutral-100 rounded-lg p-3 text-center">
                              <div className="text-xs text-neutral-500 mb-1">Conservative</div>
                              <div className="font-semibold text-neutral-700">{methodology.rangeConservative}</div>
                            </div>
                            <div className="flex-1 bg-[#FFF5F3] rounded-lg p-3 text-center">
                              <div className="text-xs text-neutral-500 mb-1">Typical</div>
                              <div className="font-semibold text-[#F03319]">{methodology.rangeTypical}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Combined Impact Summary */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-6 md:p-8 mb-10">
            <h2 className="text-lg font-bold text-neutral-900 mb-6 uppercase tracking-wide">
              Combined Impact (Reference Scenario)
            </h2>
            
            <div className="space-y-3 mb-6">
              {selectedDriverConfigs.map((driver) => {
                const methodology = NURSING_DRIVER_METHODOLOGY[driver.id];
                if (!methodology) return null;
                
                return (
                  <div key={driver.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-700">{driver.label}</span>
                      {driver.hasWarning && <span className="text-amber-500">*</span>}
                    </div>
                    <span className="font-mono font-semibold text-neutral-900">
                      {formatCurrency(methodology.referenceValue)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-neutral-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-neutral-900">Total Annual Benefit</span>
                <span className="font-mono text-2xl font-bold text-[#0E9F6E]">
                  {formatCurrency(totalReferenceValue)}
                </span>
              </div>
            </div>

            {selectedDriverConfigs.some(d => d.hasWarning) && (
              <p className="text-xs text-neutral-500 mt-4 italic">
                *Indirect relationship—see methodology for limitations
              </p>
            )}

            <div className="bg-neutral-50 rounded-xl p-4 mt-6 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-neutral-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-600">
                This is before accounting for investment costs. Next, you'll
                input your specifics to see YOUR numbers.
              </p>
            </div>
          </div>

          {/* Important to Know */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 md:p-8 mb-10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-800 mb-3">Important to Know</h3>
                <p className="text-sm text-amber-700 mb-4">
                  These calculations use typical assumptions from health system
                  implementations.
                </p>
                <div className="text-sm text-amber-700">
                  <p className="font-medium mb-2">Important limitations:</p>
                  <ul className="list-disc list-inside space-y-1.5 ml-2">
                    <li>We don't have access to your specific labor costs, overtime patterns, or turnover data</li>
                    <li>Time savings assumptions use industry estimates—your actual may vary based on current workflows</li>
                    <li>Quality & Revenue drivers (marked with *) have indirect relationships and require validation</li>
                    <li>Long-term metrics (retention) may require 12+ months to measure</li>
                  </ul>
                </div>
                <p className="text-sm text-amber-700 mt-4">
                  The formulas stay the same—only <strong>YOUR numbers</strong> change. Adjust
                  assumptions to reflect your organization's reality.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-neutral-200/60 shadow-lg">
        <div className="max-w-[1200px] mx-auto px-6 py-4">
          <Button
            onClick={onContinue}
            size="lg"
            className="w-full bg-neutral-900 text-white rounded-xl px-8 py-4 font-semibold text-lg"
            data-testid="button-continue"
          >
            Continue to Baseline Assumptions
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
