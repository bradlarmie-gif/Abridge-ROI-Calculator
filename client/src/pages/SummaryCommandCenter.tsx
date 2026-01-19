import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Pencil,
  FileText,
  Share2,
  ChevronDown,
  Clock,
  FileCheck,
  TrendingUp,
  ChevronRight,
  Plus,
  Download,
  Copy,
  Check,
  AlertCircle,
  Target,
  Users,
  DollarSign,
  BarChart3,
  Lightbulb,
  Info,
} from "lucide-react";
import { type CareSettingType, CARE_SETTING_LABELS } from "@/lib/SETTING_CONFIG";
import { type SelectedLever } from "@/pages/ObjectiveSelectionScreen";
import { type ModelResults } from "@/pages/ModelBuilder";

// ============================================================================
// TYPES
// ============================================================================

type ViewMode = "executive" | "detailed" | "methodology" | "scenarios" | "sensitivity";

interface SummaryCommandCenterProps {
  selectedSettings: CareSettingType[];
  selectedLevers: SelectedLever[];
  modelResults: ModelResults;
  onBack: () => void;
  onEditModel: () => void;
  activeTab?: ViewMode;
  onTabChange?: (tab: ViewMode) => void;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("en-US").format(value);
};

// ============================================================================
// DRIVER METADATA
// ============================================================================

const DRIVER_METADATA: Record<string, {
  name: string;
  category: "time" | "quality";
  categoryLabel: string;
  icon: typeof Clock;
  description: string;
  methodology: {
    logic: string;
    formula: string;
    assumptions: { label: string; value: string; source: string }[];
    factors: { increase: string[]; decrease: string[] };
    validation: string[];
  };
}> = {
  overtime: {
    name: "Overtime & Locum Savings",
    category: "time",
    categoryLabel: "Capacity & Labor",
    icon: Clock,
    description: "After-hours documentation reduction",
    methodology: {
      logic: "When clinicians spend less time on documentation, overtime hours decrease. Abridge reduces documentation time by an average of 70%, eliminating the need for after-hours charting.",
      formula: "OT Hours Saved = Eligible Encounters × Time Saved per Encounter × OT Reduction Rate\nAnnual Savings = OT Hours Saved × Hourly OT Rate",
      assumptions: [
        { label: "Documentation time reduction", value: "70%", source: "Abridge deployment data (n=200+)" },
        { label: "OT reduction rate", value: "50-80%", source: "Customer surveys" },
        { label: "Average OT hourly rate", value: "$150/hr", source: "Industry benchmark" },
      ],
      factors: {
        increase: ["Higher baseline overtime", "More after-hours documentation", "Higher hourly rates"],
        decrease: ["Already low overtime", "Part-time providers", "Scribes already in use"],
      },
      validation: ["Review current overtime reports", "Survey providers on after-hours documentation time"],
    },
  },
  patientAccess: {
    name: "Patient Access",
    category: "time",
    categoryLabel: "Capacity & Labor",
    icon: Users,
    description: "Time returned → visit capacity",
    methodology: {
      logic: "Time saved on documentation can be converted to additional patient visits. Each 15-20 minutes saved enables approximately one additional visit per day.",
      formula: "New Visits = Eligible Encounters × Time Saved × Visit Conversion Rate\nAnnual Value = New Visits × Revenue per Visit",
      assumptions: [
        { label: "Time saved per encounter", value: "3-5 min", source: "Abridge benchmark data" },
        { label: "Visit conversion rate", value: "25-40%", source: "Customer implementations" },
        { label: "Revenue per visit", value: "$150-250", source: "Organization input" },
      ],
      factors: {
        increase: ["High patient demand", "Waitlist exists", "Revenue maximization focus"],
        decrease: ["No patient demand", "Scheduling constraints", "Preference for work-life balance"],
      },
      validation: ["Check current patient waitlist", "Review scheduling capacity", "Confirm revenue per visit"],
    },
  },
  retention: {
    name: "Clinician Retention",
    category: "time",
    categoryLabel: "Capacity & Labor",
    icon: Users,
    description: "Reduced turnover from lower admin burden",
    methodology: {
      logic: "Documentation burden is a leading cause of clinician burnout and turnover. Reducing this burden improves satisfaction and retention.",
      formula: "Departures Avoided = Providers × Turnover Reduction Rate\nAnnual Savings = Departures Avoided × Replacement Cost",
      assumptions: [
        { label: "Turnover reduction", value: "0.5-2%", source: "HR industry studies" },
        { label: "Replacement cost", value: "$250,000-500,000", source: "MGMA benchmarks" },
      ],
      factors: {
        increase: ["High current turnover", "Documentation cited in exit interviews", "Competitive job market"],
        decrease: ["Low baseline turnover", "Other retention initiatives", "Small provider count"],
      },
      validation: ["Review exit interview data", "Calculate current replacement costs", "Survey provider satisfaction"],
    },
  },
  levelOfService: {
    name: "Accurate Level of Service",
    category: "quality",
    categoryLabel: "Revenue & Risk",
    icon: DollarSign,
    description: "Accurate wRVU capture from better documentation",
    methodology: {
      logic: "Better documentation captures the true complexity of patient encounters, leading to more accurate (often higher) coding levels.",
      formula: "Visits Affected = Eligible Encounters × Improvement Rate\nAnnual Value = Visits Affected × wRVU Improvement × wRVU Rate",
      assumptions: [
        { label: "Coding improvement rate", value: "5-15%", source: "Coding analysis studies" },
        { label: "Average wRVU uplift", value: "0.3-0.5 wRVU", source: "Customer data" },
        { label: "wRVU rate", value: "$40-60", source: "Organization input" },
      ],
      factors: {
        increase: ["Current undercoding patterns", "Complex patient population", "Detailed documentation requirements"],
        decrease: ["Already optimized coding", "Simple visit types", "Existing CDI programs"],
      },
      validation: ["Review current coding distribution", "Analyze E/M level patterns", "Compare to specialty benchmarks"],
    },
  },
  hccCapture: {
    name: "HCC & Chronic Condition Capture",
    category: "quality",
    categoryLabel: "Revenue & Risk",
    icon: FileCheck,
    description: "Improved risk adjustment from complete documentation",
    methodology: {
      logic: "Comprehensive documentation ensures all chronic conditions are captured, improving risk adjustment scores and associated revenue.",
      formula: "Conditions Captured = Eligible Encounters × Capture Rate Improvement\nAnnual Value = Conditions Captured × Average HCC Value",
      assumptions: [
        { label: "HCC capture improvement", value: "3-8%", source: "Risk adjustment studies" },
        { label: "Average HCC value", value: "$1,000-3,000", source: "CMS data + customer mix" },
      ],
      factors: {
        increase: ["Value-based contracts", "High chronic condition prevalence", "Current documentation gaps"],
        decrease: ["Fee-for-service only", "Existing robust capture", "Low-acuity population"],
      },
      validation: ["Review HCC capture rates", "Analyze RAF score trends", "Compare to expected vs. actual"],
    },
  },
  denials: {
    name: "Documentation-Related Denials",
    category: "quality",
    categoryLabel: "Revenue & Risk",
    icon: AlertCircle,
    description: "Reduced claim denials from complete documentation",
    methodology: {
      logic: "Complete, accurate documentation reduces claim denials related to insufficient documentation or coding errors.",
      formula: "Denials Avoided = Total Claims × Current Denial Rate × Reduction Rate\nAnnual Value = Denials Avoided × Average Claim Value",
      assumptions: [
        { label: "Documentation denial reduction", value: "30-50%", source: "Revenue cycle studies" },
        { label: "Average claim value", value: "$200-400", source: "Organization data" },
      ],
      factors: {
        increase: ["High current denial rate", "Documentation-related denials common", "Complex payer mix"],
        decrease: ["Low denial rates", "Denials not documentation-related", "Strong existing processes"],
      },
      validation: ["Analyze denial reasons", "Review documentation-related denials specifically", "Calculate rework costs"],
    },
  },
  // ED-specific drivers
  edThroughput: {
    name: "Patient Throughput / LWBS Reduction",
    category: "time",
    categoryLabel: "Capacity & Throughput",
    icon: Clock,
    description: "Reduced left-without-being-seen rates through faster documentation",
    methodology: {
      logic: "Faster documentation means faster disposition, reducing ED wait times and LWBS rates. Each minute saved per encounter compounds across high-volume ED operations.",
      formula: "LWBS Avoided = Annual Encounters × LWBS Rate × Reduction Rate\nAnnual Value = LWBS Avoided × Lost Revenue per LWBS",
      assumptions: [
        { label: "LWBS rate", value: "2-5%", source: "ED operational data" },
        { label: "LWBS reduction with Abridge", value: "15-25%", source: "ED deployment data" },
        { label: "Lost revenue per LWBS", value: "$500-800", source: "ED billing analysis" },
      ],
      factors: {
        increase: ["High baseline LWBS rate", "High ED volume", "Admission revenue potential"],
        decrease: ["Already low LWBS", "Staffing is primary bottleneck", "Low patient volume"],
      },
      validation: ["Review current LWBS rates", "Calculate average ED revenue per visit", "Analyze admission conversion rates"],
    },
  },
  edScribe: {
    name: "Scribe Cost Reduction",
    category: "time",
    categoryLabel: "Capacity & Labor",
    icon: Users,
    description: "Reduced scribe FTE requirements",
    methodology: {
      logic: "Abridge can replace or reduce scribe coverage, converting variable scribe costs to a more predictable technology investment.",
      formula: "FTE Reduction = Current Scribe FTEs × Reduction Rate\nAnnual Savings = FTE Reduction × Annual Scribe Cost",
      assumptions: [
        { label: "Scribe FTE reduction", value: "50-75%", source: "ED deployment data" },
        { label: "Annual scribe cost per FTE", value: "$45,000-65,000", source: "Industry benchmarks" },
      ],
      factors: {
        increase: ["Large current scribe program", "High scribe costs", "Scribe turnover issues"],
        decrease: ["No scribes currently", "Scribes valued for non-documentation tasks", "Contract restrictions"],
      },
      validation: ["Confirm current scribe FTEs and costs", "Review scribe contract terms", "Assess non-documentation scribe duties"],
    },
  },
  edRetention: {
    name: "Physician Retention",
    category: "time",
    categoryLabel: "Capacity & Labor",
    icon: Users,
    description: "Reduced turnover from lower admin burden",
    methodology: {
      logic: "ED physicians face high burnout from documentation burden. Reducing this burden improves satisfaction and retention, avoiding costly replacement.",
      formula: "Departures Avoided = Physicians × Turnover Reduction Rate\nAnnual Savings = Departures Avoided × Replacement Cost",
      assumptions: [
        { label: "Turnover reduction", value: "0.5-2%", source: "HR industry studies" },
        { label: "ED physician replacement cost", value: "$750,000-1,200,000", source: "MGMA + ED-specific data" },
      ],
      factors: {
        increase: ["High current turnover", "Documentation cited in exit interviews", "Competitive job market"],
        decrease: ["Low baseline turnover", "Other retention initiatives", "Small physician count"],
      },
      validation: ["Review exit interview data", "Calculate current replacement costs", "Survey physician satisfaction"],
    },
  },
  edLevelOfService: {
    name: "Level-of-Service Accuracy",
    category: "quality",
    categoryLabel: "Revenue & Risk",
    icon: DollarSign,
    description: "Accurate E/M and wRVU capture from comprehensive documentation",
    methodology: {
      logic: "ED encounters often involve high complexity that is under-documented. Better documentation captures true complexity, improving coding accuracy.",
      formula: "Visits Affected = Eligible Encounters × Improvement Rate\nAnnual Value = Visits Affected × wRVU Improvement × wRVU Rate",
      assumptions: [
        { label: "Coding improvement rate", value: "8-15%", source: "ED coding analysis" },
        { label: "Average wRVU uplift", value: "0.8-1.5 wRVU", source: "ED customer data" },
        { label: "wRVU rate", value: "$45-70", source: "Organization input" },
      ],
      factors: {
        increase: ["Current undercoding patterns", "High-acuity patient mix", "Complex procedures common"],
        decrease: ["Already optimized coding", "Strong existing CDI", "Low-acuity ED"],
      },
      validation: ["Review current E/M level distribution", "Compare to ED benchmarks", "Analyze missed documentation elements"],
    },
  },
  edDenials: {
    name: "Documentation-Related Denials",
    category: "quality",
    categoryLabel: "Revenue & Risk",
    icon: AlertCircle,
    description: "Reduced claim denials from complete ED documentation",
    methodology: {
      logic: "ED documentation is particularly prone to denials due to time pressure. Complete, real-time documentation reduces these denials.",
      formula: "Denials Avoided = Total Claims × Current Denial Rate × Doc-Related % × Reduction Rate\nAnnual Value = Denials Avoided × Average ED Claim Value",
      assumptions: [
        { label: "ED denial rate", value: "8-12%", source: "ED billing data" },
        { label: "Documentation-related %", value: "40%", source: "Denial analysis" },
        { label: "Documentation denial reduction", value: "30-50%", source: "Revenue cycle studies" },
        { label: "Average ED claim value", value: "$500-850", source: "Organization data" },
      ],
      factors: {
        increase: ["High current denial rate", "Time pressure in documentation", "Complex payer mix"],
        decrease: ["Low denial rates", "Denials not documentation-related", "Strong existing processes"],
      },
      validation: ["Analyze ED-specific denial reasons", "Review documentation-related denials", "Calculate rework costs"],
    },
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SummaryCommandCenter({
  selectedSettings,
  selectedLevers,
  modelResults,
  onBack,
  onEditModel,
  activeTab = "executive",
  onTabChange,
}: SummaryCommandCenterProps) {
  const [localActiveMode, setLocalActiveMode] = useState<ViewMode>(activeTab);
  
  const activeMode = activeTab;
  const setActiveMode = (tab: ViewMode) => {
    setLocalActiveMode(tab);
    onTabChange?.(tab);
  };
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(new Set());
  const [copiedLink, setCopiedLink] = useState(false);

  // Calculate derived values
  const settingLabel = selectedSettings.length > 0 
    ? CARE_SETTING_LABELS[selectedSettings[0]] || "Outpatient" 
    : "Outpatient";
  
  const isEDSetting = selectedSettings.includes("ed");

  // Categorize drivers by type
  const categorizedDrivers = useMemo(() => {
    const timeDrivers: { id: string; name: string; value: number }[] = [];
    const qualityDrivers: { id: string; name: string; value: number }[] = [];

    Object.entries(modelResults.driverResults).forEach(([id, driver]) => {
      const metadata = DRIVER_METADATA[id];
      if (metadata?.category === "time") {
        timeDrivers.push({ id, name: driver.name, value: driver.value });
      } else {
        qualityDrivers.push({ id, name: driver.name, value: driver.value });
      }
    });

    return { timeDrivers, qualityDrivers };
  }, [modelResults.driverResults]);

  const timeTotal = categorizedDrivers.timeDrivers.reduce((sum, d) => sum + d.value, 0);
  const qualityTotal = categorizedDrivers.qualityDrivers.reduce((sum, d) => sum + d.value, 0);
  const timePercent = modelResults.totalBenefit > 0 ? Math.round((timeTotal / modelResults.totalBenefit) * 100) : 0;
  const qualityPercent = 100 - timePercent;

  // Multi-year projections
  const multiYear = useMemo(() => {
    const year1Benefit = modelResults.totalBenefit;
    const year2Benefit = year1Benefit * 1.1; // 10% improvement
    const year3Benefit = year1Benefit * 1.2; // 20% improvement

    const annualCost = modelResults.investment;

    return {
      year1: { benefit: year1Benefit, cost: annualCost, net: year1Benefit - annualCost },
      year2: { benefit: year2Benefit, cost: annualCost, net: year2Benefit - annualCost },
      year3: { benefit: year3Benefit, cost: annualCost, net: year3Benefit - annualCost },
      total: {
        benefit: year1Benefit + year2Benefit + year3Benefit,
        cost: annualCost * 3,
        net: (year1Benefit - annualCost) + (year2Benefit - annualCost) + (year3Benefit - annualCost),
      },
    };
  }, [modelResults]);

  // Scenario comparisons
  const scenarios = useMemo(() => {
    const current = {
      providers: modelResults.providers,
      encounters: modelResults.encounters,
      utilization: modelResults.utilizationRate,
      benefit: modelResults.totalBenefit,
      investment: modelResults.investment,
      net: modelResults.netGain,
      roi: modelResults.roiMultiple,
      perProvider: modelResults.netGain / modelResults.providers,
    };

    const pilot = {
      providers: 10,
      encounters: 10 * 2000,
      utilization: 0.5,
      benefit: Math.round(current.benefit * (10 / current.providers) * 0.8),
      investment: 10 * 140 * 12,
      net: 0,
      roi: 0,
      perProvider: 0,
    };
    pilot.net = pilot.benefit - pilot.investment;
    pilot.roi = pilot.investment > 0 ? pilot.benefit / pilot.investment : 0;
    pilot.perProvider = pilot.net / pilot.providers;

    const full = {
      providers: current.providers * 2,
      encounters: current.encounters * 2,
      utilization: 0.75,
      benefit: Math.round(current.benefit * 2.2),
      investment: Math.round(current.investment * 1.8), // Volume discount
      net: 0,
      roi: 0,
      perProvider: 0,
    };
    full.net = full.benefit - full.investment;
    full.roi = full.investment > 0 ? full.benefit / full.investment : 0;
    full.perProvider = full.net / full.providers;

    return { current, pilot, full };
  }, [modelResults]);

  // Sensitivity analysis
  const sensitivity = useMemo(() => {
    const variables = [
      {
        name: "Utilization Rate",
        low: { value: "50%", netValue: modelResults.netGain * 0.77, roi: modelResults.roiMultiple * 0.77 },
        current: { value: `${Math.round(modelResults.utilizationRate * 100)}%`, netValue: modelResults.netGain, roi: modelResults.roiMultiple },
        high: { value: "85%", netValue: modelResults.netGain * 1.31, roi: modelResults.roiMultiple * 1.31 },
      },
      {
        name: "Time Savings Realization",
        low: { value: "50%", netValue: modelResults.netGain * 0.7, roi: modelResults.roiMultiple * 0.7 },
        current: { value: "70%", netValue: modelResults.netGain, roi: modelResults.roiMultiple },
        high: { value: "90%", netValue: modelResults.netGain * 1.3, roi: modelResults.roiMultiple * 1.3 },
      },
      {
        name: "Documentation Quality Impact",
        low: { value: "Conservative", netValue: modelResults.netGain * 0.75, roi: modelResults.roiMultiple * 0.75 },
        current: { value: "Typical", netValue: modelResults.netGain, roi: modelResults.roiMultiple },
        high: { value: "Aggressive", netValue: modelResults.netGain * 1.4, roi: modelResults.roiMultiple * 1.4 },
      },
    ];

    // Breakeven calculation: what utilization would give ROI = 1x?
    const breakevenUtilization = modelResults.investment / modelResults.totalBenefit * modelResults.utilizationRate;
    const breakevenPercentWrong = Math.round((1 - (modelResults.investment / modelResults.totalBenefit)) * 100);

    return { variables, breakevenUtilization, breakevenPercentWrong };
  }, [modelResults]);

  const toggleDriver = (driverId: string) => {
    setExpandedDrivers(prev => {
      const next = new Set(prev);
      if (next.has(driverId)) {
        next.delete(driverId);
      } else {
        next.add(driverId);
      }
      return next;
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const tabs: { id: ViewMode; label: string }[] = [
    { id: "executive", label: "Executive Summary" },
    { id: "detailed", label: "Detailed Breakdown" },
    { id: "methodology", label: "Methodology" },
    { id: "scenarios", label: "Scenarios" },
    { id: "sensitivity", label: "Sensitivity" },
  ];

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderPersistentHeader = () => (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Back link + Model summary */}
          <div className="flex items-center gap-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              data-testid="button-back-to-model-builder"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to Model Builder</span>
            </button>
            <div className="hidden md:flex items-center gap-3 text-sm text-gray-600">
              <span className="font-medium text-gray-900">{settingLabel}</span>
              <span className="text-gray-300">│</span>
              <span>{formatNumber(modelResults.providers)} {isEDSetting ? "physicians" : "providers"}</span>
              <span className="text-gray-300">│</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(modelResults.netGain)} net value</span>
              <span className="text-gray-300">│</span>
              <span className="font-semibold text-emerald-600">{modelResults.roiMultiple.toFixed(1)}x ROI</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onEditModel}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              data-testid="button-edit-model"
            >
              <Pencil className="h-4 w-4" />
              Edit Model
            </button>

            <div className="relative">
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                data-testid="button-export"
              >
                <FileText className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4" />
              </button>

              {exportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export as PDF (Executive)
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export as PDF (Full Detail)
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Export as Slides
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={handleCopyLink}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    {copiedLink ? "Link Copied!" : "Copy Link"}
                  </button>
                </div>
              )}
            </div>

            <button
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#E85D3F] rounded-lg hover:bg-[#d14e32] transition-colors"
              data-testid="button-share"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-1 border-b border-gray-200 -mb-px overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveMode(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeMode === tab.id
                  ? "text-[#E85D3F] border-[#E85D3F]"
                  : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
              }`}
              data-testid={`tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderExecutiveSummary = () => (
    <div className="space-y-8">
      {/* Hero Metrics */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-emerald-600 mb-2" data-testid="metric-net-value">
              {formatCurrency(modelResults.netGain)}
            </div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">Net Annual Value</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-emerald-600 mb-2" data-testid="metric-roi">
              {modelResults.roiMultiple.toFixed(1)}x
            </div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">Return on Investment</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-emerald-600 mb-2" data-testid="metric-payback">
              {modelResults.paybackMonths.toFixed(1)} mo
            </div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">Payback Period</div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-8 text-sm text-gray-600 border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <span>Total Annual Benefit: <span className="font-semibold">{formatCurrency(modelResults.totalBenefit)}</span></span>
          </div>
          <span className="text-gray-300">│</span>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-400" />
            <span>Annual Investment: <span className="font-semibold">{formatCurrency(modelResults.investment)}</span></span>
          </div>
        </div>
      </div>

      {/* The Value Story */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">The Value Story</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Time Saved Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-medium text-gray-900">TIME SAVED</span>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-emerald-600">{formatCurrency(timeTotal)}</div>
                <div className="text-sm text-gray-500">{timePercent}%</div>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              {categorizedDrivers.timeDrivers.map(driver => (
                <li key={driver.id} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  {driver.name}: {formatCurrency(driver.value)}
                </li>
              ))}
            </ul>
          </div>

          {/* Documentation Quality Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <FileCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <span className="font-medium text-gray-900">DOC QUALITY</span>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-emerald-600">{formatCurrency(qualityTotal)}</div>
                <div className="text-sm text-gray-500">{qualityPercent}%</div>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              {categorizedDrivers.qualityDrivers.map(driver => (
                <li key={driver.id} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {driver.name}: {formatCurrency(driver.value)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Split Bar */}
        <div className="mt-4 h-3 rounded-full overflow-hidden flex bg-gray-100">
          <div className="bg-blue-500 h-full" style={{ width: `${timePercent}%` }} />
          <div className="bg-emerald-500 h-full" style={{ width: `${qualityPercent}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Time Saved ({timePercent}%)</span>
          <span>Documentation Quality ({qualityPercent}%)</span>
        </div>
      </div>

      {/* Multi-Year View */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Multi-Year Projection</h3>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left font-medium text-gray-500"></th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Year 1</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Year 2</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">Year 3</th>
                <th className="px-6 py-3 text-right font-medium text-gray-900 bg-emerald-50">3-Year Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-6 py-4 font-medium text-gray-900">Value</td>
                <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(multiYear.year1.benefit)}</td>
                <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(multiYear.year2.benefit)}</td>
                <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(multiYear.year3.benefit)}</td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900 bg-emerald-50">{formatCurrency(multiYear.total.benefit)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-6 py-4 font-medium text-gray-900">Cost</td>
                <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(multiYear.year1.cost)}</td>
                <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(multiYear.year2.cost)}</td>
                <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(multiYear.year3.cost)}</td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900 bg-emerald-50">{formatCurrency(multiYear.total.cost)}</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium text-gray-900">Net Value</td>
                <td className="px-6 py-4 text-right font-semibold text-emerald-600">{formatCurrency(multiYear.year1.net)}</td>
                <td className="px-6 py-4 text-right font-semibold text-emerald-600">{formatCurrency(multiYear.year2.net)}</td>
                <td className="px-6 py-4 text-right font-semibold text-emerald-600">{formatCurrency(multiYear.year3.net)}</td>
                <td className="px-6 py-4 text-right font-bold text-emerald-600 bg-emerald-50">{formatCurrency(multiYear.total.net)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Assumptions */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Assumptions</h3>
        <ul className="space-y-2 text-sm text-gray-600 mb-4">
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2" />
            <span>{formatNumber(modelResults.providers)} {isEDSetting ? "physicians" : "providers"} with {formatNumber(modelResults.encounters)} annual encounters</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2" />
            <span>{Math.round(modelResults.utilizationRate * 100)}% adoption rate = {formatNumber(modelResults.eligibleEncounters)} eligible encounters</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2" />
            <span>Investment of {formatCurrency(modelResults.investment)} annually</span>
          </li>
        </ul>
        <div className="flex gap-4">
          <button
            onClick={() => setActiveMode("methodology")}
            className="text-sm font-medium text-[#E85D3F] hover:text-[#d14e32] flex items-center gap-1"
          >
            See full methodology
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={onEditModel}
            className="text-sm font-medium text-[#E85D3F] hover:text-[#d14e32] flex items-center gap-1"
          >
            Adjust assumptions
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderDetailedBreakdown = () => (
    <div className="space-y-8">
      {/* Your Baseline */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Your Baseline</h3>
          <button
            onClick={onEditModel}
            className="inline-flex items-center gap-1 text-sm font-medium text-[#E85D3F] hover:text-[#d14e32]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(modelResults.providers)}</div>
            <div className="text-sm text-gray-500">{isEDSetting ? "ED Physicians" : "Providers"}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(modelResults.encounters)}</div>
            <div className="text-sm text-gray-500">Annual Encounters</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{Math.round(modelResults.utilizationRate * 100)}%</div>
            <div className="text-sm text-gray-500">Utilization</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">{formatNumber(modelResults.eligibleEncounters)}</div>
            <div className="text-sm text-gray-500">Eligible Encounters</div>
          </div>
        </div>
      </div>

      {/* Time Saved Benefits */}
      {categorizedDrivers.timeDrivers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Time Saved Benefits</h3>
            <span className="text-lg font-bold text-emerald-600">{formatCurrency(timeTotal)}</span>
          </div>
          <div className="space-y-3">
            {categorizedDrivers.timeDrivers.map(driver => renderDriverAccordion(driver.id))}
          </div>
        </div>
      )}

      {/* Documentation Quality Benefits */}
      {categorizedDrivers.qualityDrivers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Documentation Quality Benefits</h3>
            <span className="text-lg font-bold text-emerald-600">{formatCurrency(qualityTotal)}</span>
          </div>
          <div className="space-y-3">
            {categorizedDrivers.qualityDrivers.map(driver => renderDriverAccordion(driver.id))}
          </div>
        </div>
      )}

      {/* Add Another Driver */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Another Driver</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(DRIVER_METADATA)
            .filter(([id]) => !modelResults.driverResults[id])
            .slice(0, 4)
            .map(([id, meta]) => (
              <div key={id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{meta.name}</div>
                  <div className="text-sm text-gray-500">{meta.description}</div>
                </div>
                <button
                  onClick={onEditModel}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#E85D3F] border border-[#E85D3F] rounded-lg hover:bg-[#E85D3F] hover:text-white transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  const renderDriverAccordion = (driverId: string) => {
    const driver = modelResults.driverResults[driverId];
    const metadata = DRIVER_METADATA[driverId];
    if (!driver || !metadata) return null;

    const isExpanded = expandedDrivers.has(driverId);
    const Icon = metadata.icon;

    return (
      <div key={driverId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleDriver(driverId)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          data-testid={`accordion-detail-${driverId}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Icon className="h-5 w-5 text-gray-600" />
            </div>
            <div className="text-left">
              <div className="font-medium text-gray-900">{driver.name}</div>
              <div className="text-sm text-gray-500">{metadata.description}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-emerald-600">{formatCurrency(driver.value)}</span>
            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </div>
        </button>

        {isExpanded && (
          <div className="px-6 pb-6 border-t border-gray-100 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Your Inputs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Your Inputs</h4>
                  <button
                    onClick={onEditModel}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#E85D3F]"
                  >
                    <Pencil className="h-3 w-3" />
                    Change
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Eligible Encounters</span>
                    <span className="font-medium">{formatNumber(modelResults.eligibleEncounters)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Driver Value</span>
                    <span className="font-medium text-emerald-600">{formatCurrency(driver.value)}</span>
                  </div>
                </div>
              </div>

              {/* Your Calculation */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Your Calculation</h4>
                <div className="bg-blue-50 rounded-lg p-4 text-sm font-mono">
                  <div className="text-gray-600">{formatNumber(modelResults.eligibleEncounters)} encounters</div>
                  <div className="text-gray-600">× driver rate</div>
                  <div className="border-t border-blue-200 my-2" />
                  <div className="font-bold text-emerald-600">= {formatCurrency(driver.value)}</div>
                </div>
              </div>
            </div>

            {/* Abridge Assumptions */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Abridge Assumptions</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  {metadata.methodology.assumptions.slice(0, 2).map((assumption, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2" />
                      <span className="text-gray-600">
                        <span className="font-medium">{assumption.label}:</span> {assumption.value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Based on 200+ deployments
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMethodology = () => (
    <div className="space-y-8">
      {/* The Core Framework */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">The Core Framework</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Time Saved</h4>
              <p className="text-sm text-gray-600">
                Abridge reduces documentation time, freeing clinicians for patient care, eliminating overtime, and improving work-life balance.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <FileCheck className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Documentation Quality</h4>
              <p className="text-sm text-gray-600">
                Comprehensive, accurate notes improve coding accuracy, capture chronic conditions, and reduce claim denials.
              </p>
            </div>
          </div>
        </div>
        <div className="h-4 rounded-full overflow-hidden flex bg-gray-100">
          <div className="bg-blue-500 h-full" style={{ width: `${timePercent}%` }} />
          <div className="bg-emerald-500 h-full" style={{ width: `${qualityPercent}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Time Saved ({timePercent}%)</span>
          <span>Documentation Quality ({qualityPercent}%)</span>
        </div>
      </div>

      {/* Driver Methodologies */}
      {Object.entries(modelResults.driverResults).map(([driverId, driver]) => {
        const metadata = DRIVER_METADATA[driverId];
        if (!metadata) return null;
        const Icon = metadata.icon;

        return (
          <div key={driverId} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Icon className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{driver.name}</h3>
                <p className="text-sm text-gray-500">{metadata.categoryLabel}</p>
              </div>
            </div>

            {/* The Logic */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">The Logic</h4>
              <p className="text-sm text-gray-600">{metadata.methodology.logic}</p>
            </div>

            {/* The Formula */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">The Formula</h4>
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
                {metadata.methodology.formula}
              </pre>
            </div>

            {/* Key Assumptions */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Key Assumptions & Sources</h4>
              <div className="space-y-3">
                {metadata.methodology.assumptions.map((assumption, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{assumption.label}</div>
                      <div className="text-sm text-gray-500">{assumption.source}</div>
                    </div>
                    <div className="font-mono text-sm font-medium text-[#E85D3F]">{assumption.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* What Would Change This */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-emerald-50 rounded-lg p-4">
                <h5 className="text-sm font-medium text-emerald-800 mb-2">Would Increase Value</h5>
                <ul className="space-y-1 text-sm text-emerald-700">
                  {metadata.methodology.factors.increase.map((factor, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <TrendingUp className="h-3 w-3" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <h5 className="text-sm font-medium text-red-800 mb-2">Would Decrease Value</h5>
                <ul className="space-y-1 text-sm text-red-700">
                  {metadata.methodology.factors.decrease.map((factor, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <TrendingUp className="h-3 w-3 rotate-180" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* How to Validate */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">How to Validate</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {metadata.methodology.validation.map((step, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-gray-400" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}

      {/* What We Don't Include */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">What We Don't Include</h3>
        <p className="text-sm text-gray-600 mb-4">
          Our goal is to provide defensible, not inflated, projections. We intentionally exclude:
        </p>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            Soft benefits like provider satisfaction or patient experience improvements
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            Long-term strategic value of data and analytics
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            Potential legal/compliance risk reduction
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            Training and onboarding time savings
          </li>
        </ul>
      </div>

      {/* Export */}
      <div className="flex gap-4">
        <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          <Download className="h-4 w-4" />
          Download as PDF
        </button>
        <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          <Copy className="h-4 w-4" />
          Copy to Clipboard
        </button>
      </div>
    </div>
  );

  const renderScenarios = () => (
    <div className="space-y-8">
      {/* Comparison Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left font-medium text-gray-500"></th>
                <th className="px-6 py-4 text-right font-medium text-gray-900 bg-[#E85D3F]/10">Current Model</th>
                <th className="px-6 py-4 text-right font-medium text-gray-500">Pilot (10)</th>
                <th className="px-6 py-4 text-right font-medium text-gray-500">Full Deployment</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-6 py-4 font-medium text-gray-900">{isEDSetting ? "ED Physicians" : "Providers"}</td>
                <td className="px-6 py-4 text-right font-semibold bg-[#E85D3F]/5">{formatNumber(scenarios.current.providers)}</td>
                <td className="px-6 py-4 text-right text-gray-600">{formatNumber(scenarios.pilot.providers)}</td>
                <td className="px-6 py-4 text-right text-gray-600">{formatNumber(scenarios.full.providers)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-6 py-4 font-medium text-gray-900">Encounters</td>
                <td className="px-6 py-4 text-right font-semibold bg-[#E85D3F]/5">{formatNumber(scenarios.current.encounters)}</td>
                <td className="px-6 py-4 text-right text-gray-600">{formatNumber(scenarios.pilot.encounters)}</td>
                <td className="px-6 py-4 text-right text-gray-600">{formatNumber(scenarios.full.encounters)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-6 py-4 font-medium text-gray-900">Utilization</td>
                <td className="px-6 py-4 text-right font-semibold bg-[#E85D3F]/5">{Math.round(scenarios.current.utilization * 100)}%</td>
                <td className="px-6 py-4 text-right text-gray-600">{Math.round(scenarios.pilot.utilization * 100)}%</td>
                <td className="px-6 py-4 text-right text-gray-600">{Math.round(scenarios.full.utilization * 100)}%</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-6 py-4 font-medium text-gray-900">Annual Benefit</td>
                <td className="px-6 py-4 text-right font-semibold text-emerald-600 bg-[#E85D3F]/5">{formatCurrency(scenarios.current.benefit)}</td>
                <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(scenarios.pilot.benefit)}</td>
                <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(scenarios.full.benefit)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-6 py-4 font-medium text-gray-900">Investment</td>
                <td className="px-6 py-4 text-right font-semibold bg-[#E85D3F]/5">{formatCurrency(scenarios.current.investment)}</td>
                <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(scenarios.pilot.investment)}</td>
                <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(scenarios.full.investment)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-6 py-4 font-medium text-gray-900">Net Value</td>
                <td className="px-6 py-4 text-right font-bold text-emerald-600 bg-[#E85D3F]/5">{formatCurrency(scenarios.current.net)}</td>
                <td className="px-6 py-4 text-right font-semibold text-emerald-600">{formatCurrency(scenarios.pilot.net)}</td>
                <td className="px-6 py-4 text-right font-semibold text-emerald-600">{formatCurrency(scenarios.full.net)}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-6 py-4 font-medium text-gray-900">ROI</td>
                <td className="px-6 py-4 text-right font-bold text-emerald-600 bg-[#E85D3F]/5">{scenarios.current.roi.toFixed(1)}x</td>
                <td className="px-6 py-4 text-right font-semibold text-emerald-600">{scenarios.pilot.roi.toFixed(1)}x</td>
                <td className="px-6 py-4 text-right font-semibold text-emerald-600">{scenarios.full.roi.toFixed(1)}x</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-medium text-gray-900">Per-Provider Value</td>
                <td className="px-6 py-4 text-right font-bold text-emerald-600 bg-[#E85D3F]/5">{formatCurrency(scenarios.current.perProvider)}</td>
                <td className="px-6 py-4 text-right font-semibold text-emerald-600">{formatCurrency(scenarios.pilot.perProvider)}</td>
                <td className="px-6 py-4 text-right font-semibold text-emerald-600">{formatCurrency(scenarios.full.perProvider)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Insight Callout */}
      <div className="bg-blue-50 rounded-xl p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h4 className="font-medium text-blue-900 mb-1">Insight</h4>
          <p className="text-sm text-blue-800">
            Per-provider value increases with scale due to volume pricing and higher utilization rates. 
            A full deployment generates{" "}
            <span className="font-semibold">{formatCurrency(scenarios.full.perProvider - scenarios.pilot.perProvider)}</span> more per provider than a pilot.
          </p>
        </div>
      </div>

      {/* Quick Scenarios */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Scenarios</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onEditModel}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            What if we added ED?
          </button>
          <button
            onClick={onEditModel}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            What if utilization reached 80%?
          </button>
          {Object.entries(DRIVER_METADATA)
            .filter(([id]) => !modelResults.driverResults[id])
            .slice(0, 2)
            .map(([id, meta]) => (
              <button
                key={id}
                onClick={onEditModel}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                What if we included {meta.name}?
              </button>
            ))}
        </div>
      </div>
    </div>
  );

  const renderSensitivity = () => (
    <div className="space-y-8">
      {/* Current Model Reference */}
      <div className="bg-emerald-50 rounded-xl p-6 text-center">
        <div className="text-3xl font-bold text-emerald-600 mb-1" data-testid="sensitivity-current-value">
          {formatCurrency(modelResults.netGain)} net annual value
        </div>
        <div className="text-lg text-emerald-700">({modelResults.roiMultiple.toFixed(1)}x ROI)</div>
      </div>

      {/* Variable Sensitivity */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Variable Sensitivity</h3>
        <div className="space-y-4">
          {sensitivity.variables.map((variable, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
              <h4 className="font-medium text-gray-900 mb-4">{variable.name}</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Low</div>
                  <div className="font-mono text-lg font-medium text-gray-700">{variable.low.value}</div>
                  <div className="text-sm text-gray-600 mt-2">{formatCurrency(variable.low.netValue)}</div>
                  <div className="text-xs text-gray-500">{variable.low.roi.toFixed(1)}x ROI</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 border-2 border-emerald-200">
                  <div className="text-sm text-emerald-600 mb-1">Current</div>
                  <div className="font-mono text-lg font-bold text-emerald-700">{variable.current.value}</div>
                  <div className="text-sm text-emerald-600 mt-2 font-semibold">{formatCurrency(variable.current.netValue)}</div>
                  <div className="text-xs text-emerald-500">{variable.current.roi.toFixed(1)}x ROI</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">High</div>
                  <div className="font-mono text-lg font-medium text-gray-700">{variable.high.value}</div>
                  <div className="text-sm text-gray-600 mt-2">{formatCurrency(variable.high.netValue)}</div>
                  <div className="text-xs text-gray-500">{variable.high.roi.toFixed(1)}x ROI</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Breakeven Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Breakeven Analysis</h3>
        <p className="text-sm text-gray-600 mb-4">Your model breaks even (ROI = 1x) if:</p>
        <ul className="space-y-2 text-sm text-gray-600 mb-6">
          <li className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Utilization drops to {Math.round(sensitivity.breakevenUtilization * 100)}%
          </li>
          <li className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            All driver values are reduced by {100 - Math.round(modelResults.investment / modelResults.totalBenefit * 100)}%
          </li>
        </ul>
        <div className="bg-emerald-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="font-medium text-emerald-800">Robust Model</div>
              <div className="text-sm text-emerald-700">
                The model would need to be <span className="font-bold">{sensitivity.breakevenPercentWrong}% wrong</span> to not deliver positive ROI.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Line */}
      <div className="bg-gray-900 rounded-xl p-6 text-center">
        <BarChart3 className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
        <div className="text-lg font-semibold text-white mb-2">Bottom Line</div>
        <p className="text-gray-300 text-sm max-w-xl mx-auto">
          This model is robust. Even under pessimistic assumptions where utilization drops and driver values are reduced, 
          Abridge delivers positive ROI. The breakeven threshold is significantly below your projected performance.
        </p>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {renderPersistentHeader()}

      {/* Close dropdown when clicking outside */}
      {exportDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setExportDropdownOpen(false)}
        />
      )}

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeMode === "executive" && renderExecutiveSummary()}
        {activeMode === "detailed" && renderDetailedBreakdown()}
        {activeMode === "methodology" && renderMethodology()}
        {activeMode === "scenarios" && renderScenarios()}
        {activeMode === "sensitivity" && renderSensitivity()}
      </main>
    </div>
  );
}
