import { useState } from "react";
import { 
  ArrowLeft, 
  ChevronRight, 
  ChevronDown, 
  Lightbulb, 
  Calculator, 
  Settings,
  BarChart3,
  AlertTriangle,
  Building2,
  FileText,
  Clock,
  Users,
  TrendingUp,
  Info
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
    rows: { label: string; value: string; note?: string }[];
  }[];
  keyVariables: string[];
  rangeConservative: string;
  rangeTypical: string;
  referenceValue: number;
}

// Nursing reference scenario
const NURSING_REFERENCE_SCENARIO = {
  staffedBeds: 200,
  documentationEventsPerYear: 332150,
  adoptionPercent: 65,
  get eligibleEvents() {
    return Math.round(this.documentationEventsPerYear);
  },
};

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
          { label: "Utilization rate", value: "65%", note: "(typical)" },
          { label: "Eligible events", value: "332,150" },
        ],
      },
      {
        title: "STEP 2: TIME RETURNED",
        rows: [
          { label: "Minutes saved per documentation event", value: "4 min", note: "(typical)" },
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
          { label: "Impact timeline: Retention improvements typically measurable at 12+ months as turnover is an annual metric.", value: "", note: "info" },
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
          { label: "This is an INDIRECT relationship. Documentation supports but does not directly prevent safety events.", value: "", note: "warning" },
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
          { label: "This is an INDIRECT relationship. Documentation supports but does not directly assign codes.", value: "", note: "warning" },
        ],
      },
    ],
    keyVariables: ["Annual discharges", "CC/MCC opportunity rate", "Documentation gap rate", "Revenue lift"],
    rangeConservative: "$80k-140k",
    rangeTypical: "$150k-250k",
    referenceValue: 170188,
  },
};

// Driver icons mapping
const DRIVER_ICONS: Record<string, typeof Clock> = {
  documentation_time_savings: Clock,
  overtime_reduction: Clock,
  agency_reduction: Users,
  nurse_retention: Users,
  documentation_timeliness: FileText,
  documentation_completeness: FileText,
  safety_event_reduction: AlertTriangle,
  ccmcc_support: Building2,
};

// Format currency
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return `$${value.toLocaleString()}`;
}

// Format number with commas
function formatNumber(value: number): string {
  return value.toLocaleString();
}

export default function NursingValueMethodology({
  selectedDrivers,
  onBack,
  onContinue,
}: NursingValueMethodologyProps) {
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(new Set());

  // Get nursing drivers from config
  const nursingDrivers = SETTING_CONFIG.nursing || [];

  // Get selected driver info
  const selectedDriverInfo = selectedDrivers
    .map((driverId) => {
      const driver = nursingDrivers.find((d: LeverConfig) => d.id === driverId);
      const methodology = NURSING_DRIVER_METHODOLOGY[driverId];
      if (!driver || !methodology) return null;
      return { ...driver, methodology };
    })
    .filter(Boolean) as (LeverConfig & { methodology: DriverMethodology })[];

  // Calculate total reference value
  const totalReferenceValue = selectedDriverInfo.reduce(
    (sum, driver) => sum + driver.methodology.referenceValue,
    0
  );

  // Check if any selected drivers have warnings
  const hasIndirectDrivers = selectedDriverInfo.some((d) => d.hasWarning);

  const toggleExpanded = (driverId: string) => {
    setExpandedDrivers((prev) => {
      const next = new Set(prev);
      if (next.has(driverId)) {
        next.delete(driverId);
      } else {
        next.add(driverId);
      }
      return next;
    });
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12 md:py-16 pb-32">
      <div className="max-w-4xl">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 mb-8 text-sm font-semibold text-[#F03319] transition-opacity hover:opacity-70"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Header */}
        <div className="mb-10">
          <h2 className="text-3xl md:text-4xl font-medium text-neutral-900 leading-tight mb-4">
            Value Methodology
          </h2>
          <p className="text-lg text-neutral-600 leading-relaxed">
            This reference scenario shows potential value for a typical mid-sized practice. Review how each driver creates value, then customize with your specific numbers in the next step.
          </p>
        </div>

        {/* Reference Scenario Section */}
        <section className="mb-10">
          <div className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/50 border border-slate-200 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-neutral-900">Reference Scenario</h3>
              <p className="text-sm text-neutral-500">Typical mid-sized community hospital</p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5">
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3 bg-white rounded-lg px-2 sm:px-4 py-3 border border-slate-100">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-50 flex-shrink-0">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div className="text-center sm:text-left min-w-0">
                  <div className="text-base sm:text-xl font-bold text-neutral-900 font-mono">{NURSING_REFERENCE_SCENARIO.staffedBeds}</div>
                  <div className="text-[10px] sm:text-xs text-neutral-500">staffed beds</div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3 bg-white rounded-lg px-2 sm:px-4 py-3 border border-slate-100">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-50 flex-shrink-0">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </div>
                <div className="text-center sm:text-left min-w-0">
                  <div className="text-base sm:text-xl font-bold text-neutral-900 font-mono">{formatNumber(NURSING_REFERENCE_SCENARIO.documentationEventsPerYear)}</div>
                  <div className="text-[10px] sm:text-xs text-neutral-500">events/year</div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3 bg-white rounded-lg px-2 sm:px-4 py-3 border border-slate-100">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-50 flex-shrink-0">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                </div>
                <div className="text-center sm:text-left min-w-0">
                  <div className="text-base sm:text-xl font-bold text-neutral-900 font-mono">{NURSING_REFERENCE_SCENARIO.adoptionPercent}%</div>
                  <div className="text-[10px] sm:text-xs text-neutral-500">adoption</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
              <Calculator className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-600">This creates:</span>
              <span className="text-base font-semibold text-neutral-900">
                ~{formatNumber(NURSING_REFERENCE_SCENARIO.eligibleEvents)} Abridge-documented events/year
              </span>
            </div>
          </div>
        </section>

        {/* Value Drivers Section */}
        <section className="mb-10">
          <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4">
            Your Selected Value Drivers
          </h3>

          <div className="space-y-4">
            {selectedDriverInfo.map((driver) => {
              const DriverIcon = DRIVER_ICONS[driver.id] || FileText;
              const isExpanded = expandedDrivers.has(driver.id);
              const methodology = driver.methodology;

              return (
                <div
                  key={driver.id}
                  className="rounded-xl border border-neutral-200 bg-white overflow-hidden"
                  data-testid={`driver-card-${driver.id}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpanded(driver.id)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-neutral-50 transition-colors"
                    data-testid={`driver-toggle-${driver.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${driver.hasWarning ? 'bg-amber-50' : 'bg-[#FFF5F3]'}`}>
                        <DriverIcon className={`w-5 h-5 ${driver.hasWarning ? 'text-amber-600' : 'text-[#F03319]'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          {driver.hasWarning && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                          <span className="font-semibold text-neutral-900">{driver.label}</span>
                        </div>
                        <div className="text-sm text-neutral-500">
                          Reference value: <span className="font-mono font-medium text-green-600">{formatCurrency(methodology.referenceValue)}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-neutral-100">
                      {/* The Theory */}
                      <div className="mt-5 mb-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-semibold text-neutral-700">The Theory</span>
                        </div>
                        <p className="text-sm text-neutral-600 leading-relaxed pl-6">
                          {methodology.theory}
                        </p>
                      </div>

                      {/* How We Calculate It */}
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Calculator className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-semibold text-neutral-700">How We Calculate It</span>
                        </div>
                        <div className="space-y-4 pl-6">
                          {methodology.calculationSteps.map((step, idx) => (
                            <div key={idx} className="bg-slate-50 rounded-lg p-4">
                              <div className="text-xs font-semibold text-neutral-500 uppercase mb-2">{step.title}</div>
                              <div className="space-y-1">
                                {step.rows.map((row, rowIdx) => {
                                  if (row.note === "warning") {
                                    return (
                                      <div key={rowIdx} className="mt-2 p-2 rounded bg-amber-50 border border-amber-200">
                                        <span className="text-xs text-amber-800 flex items-center gap-1.5">
                                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                          {row.label}
                                        </span>
                                      </div>
                                    );
                                  }
                                  if (row.note === "info") {
                                    return (
                                      <div key={rowIdx} className="mt-2 p-2 rounded bg-blue-50 border border-blue-200">
                                        <span className="text-xs text-blue-800 flex items-center gap-1.5">
                                          <Info className="w-3.5 h-3.5 flex-shrink-0" />
                                          {row.label}
                                        </span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={rowIdx} className="flex items-center justify-between text-sm">
                                      <span className="text-neutral-600">{row.label}</span>
                                      <span className="font-mono text-neutral-900">
                                        {row.value}
                                        {row.note && <span className="text-[#F03319]/70 text-xs ml-1">{row.note}</span>}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Key Variables */}
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Settings className="w-4 h-4 text-neutral-500" />
                          <span className="text-sm font-semibold text-neutral-700">Key Variables You'll Customize</span>
                        </div>
                        <div className="flex flex-wrap gap-2 pl-6">
                          {methodology.keyVariables.map((v, idx) => (
                            <span key={idx} className="px-3 py-1 bg-neutral-100 rounded-full text-xs text-neutral-600">
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Range Across Customers */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart3 className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-semibold text-neutral-700">Range Across Customers</span>
                        </div>
                        <div className="flex gap-4 pl-6">
                          <div className="flex-1 bg-neutral-100 rounded-lg px-4 py-3 text-center">
                            <div className="text-xs text-neutral-500 mb-1">Conservative</div>
                            <div className="font-semibold text-neutral-700">{methodology.rangeConservative}</div>
                          </div>
                          <div className="flex-1 bg-[#FFF5F3] rounded-lg px-4 py-3 text-center">
                            <div className="text-xs text-[#F03319] mb-1">Typical</div>
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
        </section>

        {/* Combined Impact Summary */}
        <section className="mb-10">
          <div className="rounded-xl bg-white border border-neutral-200 p-6">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4">
              Combined Impact (Reference Scenario)
            </h3>

            <div className="space-y-3 mb-4">
              {selectedDriverInfo.map((driver) => (
                <div key={driver.id} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-700">
                    {driver.label}
                    {driver.hasWarning && <span className="text-amber-500 ml-1">*</span>}
                  </span>
                  <span className="font-mono font-medium text-neutral-900">{formatCurrency(driver.methodology.referenceValue)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-neutral-900">Total Annual Benefit</span>
                <span className="text-2xl font-bold text-green-600 font-mono">
                  {formatCurrency(totalReferenceValue)}
                </span>
              </div>
            </div>
          </div>

          {/* Callout box */}
          <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-4 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              This is before accounting for investment costs. Next, you'll input your specifics to see YOUR numbers.
            </p>
          </div>
        </section>

        {/* Important to Know Warning */}
        <section className="mb-6">
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900 mb-2">Important to Know</h4>
                <p className="text-sm text-amber-800 mb-3">
                  These calculations use typical assumptions from 200+ health system partners.
                </p>
                <p className="text-sm text-amber-800 mb-2 font-medium">
                  Important limitations:
                </p>
                <ul className="text-sm text-amber-800 space-y-1 ml-4 list-disc mb-3">
                  <li>We don't have access to your specific labor costs, staffing models, or financial systems</li>
                  <li>Labor value assumptions use blended averages—your actual rates may vary</li>
                  <li>Retention value assumes turnover attribution can be measured over 12+ months</li>
                  {hasIndirectDrivers && (
                    <li><strong>Drivers marked with * have indirect relationships</strong>—value is directional, not guaranteed</li>
                  )}
                </ul>
                <p className="text-sm text-amber-800 font-medium">
                  The formulas stay the same—only YOUR numbers change. Adjust assumptions to reflect your organization's reality.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-neutral-200/60 shadow-lg">
        <div className="max-w-[1200px] mx-auto px-6 py-4">
          <Button
            onClick={onContinue}
            size="lg"
            className="w-full bg-[#111827] text-white hover:bg-[#1f2937] rounded-xl font-semibold"
            data-testid="button-continue"
          >
            Continue
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
