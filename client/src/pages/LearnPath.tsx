import { useState } from "react";
import { 
  ArrowLeft, 
  ArrowRight, 
  Stethoscope, 
  Zap, 
  HeartPulse, 
  Building2,
  Clock,
  FileText,
  Check,
  ChevronDown,
  ChevronUp,
  Users,
  DollarSign,
  UserCheck,
  TrendingUp,
  ShieldCheck,
  FileX,
  Timer,
  Activity,
  ClipboardCheck,
  Lightbulb,
  Calculator,
  SlidersHorizontal,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import abridgeLogo from "@assets/abridge-logo-wordmark-black-onwhite_1767885563802.jpg";

interface LearnPathProps {
  onBack: () => void;
  onStartCalculator?: (setting: CareSettingType) => void;
}

type CareSettingType = "outpatient" | "ed" | "nursing";
type LearnScreen = "selection" | "methodology";

interface Driver {
  id: string;
  name: string;
  description: string;
  referenceValue: number;
  icon: React.ElementType;
  lane: "time" | "quality";
  theory: string;
  calculationSteps: {
    label: string;
    formula: string;
    result: string;
  }[];
  customizableInputs: string[];
  ranges: {
    conservative: string;
    typical: string;
  };
}

interface SettingConfig {
  name: string;
  icon: React.ElementType;
  subtitle: string;
  referenceScenario: {
    title: string;
    details: string;
    encounters: string;
  };
  timeSavedSubtitle: string;
  docQualitySubtitle: string;
  drivers: Driver[];
}

const SETTING_CONFIGS: Record<CareSettingType, SettingConfig> = {
  outpatient: {
    name: "Outpatient",
    icon: Stethoscope,
    subtitle: "Primary care, specialty visits, clinics",
    referenceScenario: {
      title: "Reference: Typical mid-sized outpatient practice",
      details: "40 providers | 80,000 annual visits | 65% adoption",
      encounters: "~52,000 Abridge-documented encounters/year"
    },
    timeSavedSubtitle: "2.5 min returned per encounter",
    docQualitySubtitle: "More complete, accurate notes",
    drivers: [
      {
        id: "patient-access",
        name: "Patient Access",
        description: "More visits possible with time returned",
        referenceValue: 173200,
        icon: Users,
        lane: "time",
        theory: "When clinicians spend less time on documentation, they have capacity to see additional patients. Not all saved time converts to visits—scheduling, room availability, and other factors limit realization—but even a modest portion creates meaningful revenue.",
        calculationSteps: [
          { label: "Time Returned", formula: "2.5 min × 52,000 encounters", result: "2,167 hours" },
          { label: "Reality Check", formula: "2,167 hrs × 20% realization", result: "433 usable hours" },
          { label: "New Visits", formula: "433 hrs ÷ 30 min/visit", result: "866 additional visits" },
          { label: "Revenue Impact", formula: "866 visits × $200/visit", result: "$173,200" }
        ],
        customizableInputs: ["Provider count", "Visit volume", "Revenue per visit", "Realization factor"],
        ranges: { conservative: "$80K-120K", typical: "$150K-200K" }
      },
      {
        id: "overtime-locum",
        name: "Overtime & Locum Savings",
        description: "Less premium labor needed",
        referenceValue: 89400,
        icon: DollarSign,
        lane: "time",
        theory: "Documentation often extends past scheduled hours, triggering overtime pay. By returning time to clinicians, organizations reduce the need for after-hours work and expensive locum coverage to maintain access.",
        calculationSteps: [
          { label: "Overtime Hours Saved", formula: "2,167 hrs × 15% overtime portion", result: "325 OT hours eliminated" },
          { label: "Cost Avoidance", formula: "325 hrs × $275/hr OT rate", result: "$89,375" }
        ],
        customizableInputs: ["Overtime rate", "Locum rate", "Current overtime hours"],
        ranges: { conservative: "$40K-70K", typical: "$80K-120K" }
      },
      {
        id: "clinician-retention",
        name: "Clinician Retention",
        description: "Reduced burnout, lower turnover costs",
        referenceValue: 156000,
        icon: UserCheck,
        lane: "time",
        theory: "Documentation burden is the #1 driver of physician burnout. Reducing this burden improves satisfaction and retention. Replacing a physician costs $500K-1M when you factor in recruiting, onboarding, and lost revenue.",
        calculationSteps: [
          { label: "Burnout Reduction", formula: "52,000 encounters × time savings", result: "Measurable satisfaction improvement" },
          { label: "Turnover Avoided", formula: "1 physician retained × 30% attribution", result: "0.3 physician equivalents" },
          { label: "Cost Savings", formula: "0.3 × $520,000 replacement cost", result: "$156,000" }
        ],
        customizableInputs: ["Current turnover rate", "Replacement cost", "Attribution factor"],
        ranges: { conservative: "$75K-125K", typical: "$140K-200K" }
      },
      {
        id: "level-of-service",
        name: "Accurate Level of Service",
        description: "Capture appropriate wRVU value",
        referenceValue: 124800,
        icon: TrendingUp,
        lane: "quality",
        theory: "Physicians under time pressure often undercode visits—documenting a Level 3 when the encounter truly warranted Level 4. AI documentation captures the full clinical picture, ensuring accurate E/M coding.",
        calculationSteps: [
          { label: "Eligible Encounters", formula: "52,000 documented encounters", result: "52,000" },
          { label: "Upcoding Opportunity", formula: "52,000 × 8% undercode rate", result: "4,160 visits affected" },
          { label: "Revenue Lift", formula: "4,160 × $30 wRVU delta", result: "$124,800" }
        ],
        customizableInputs: ["Current undercode rate", "wRVU rate", "E/M mix"],
        ranges: { conservative: "$60K-100K", typical: "$110K-150K" }
      },
      {
        id: "hcc-capture",
        name: "HCC & Chronic Condition Capture",
        description: "RAF score improvement",
        referenceValue: 208000,
        icon: ShieldCheck,
        lane: "quality",
        theory: "Risk adjustment relies on complete documentation of chronic conditions. AI ensures conditions mentioned in conversation get documented, improving RAF scores for value-based contracts.",
        calculationSteps: [
          { label: "Value-Based Lives", formula: "52,000 × 40% in risk contracts", result: "20,800 eligible encounters" },
          { label: "HCC Recapture", formula: "20,800 × 5% improvement", result: "1,040 conditions captured" },
          { label: "RAF Value", formula: "1,040 × $200 per HCC", result: "$208,000" }
        ],
        customizableInputs: ["% in risk contracts", "HCC capture improvement", "Value per HCC"],
        ranges: { conservative: "$100K-160K", typical: "$180K-250K" }
      },
      {
        id: "denials-reduction",
        name: "Documentation-Related Denials",
        description: "Fewer rejected claims",
        referenceValue: 78000,
        icon: FileX,
        lane: "quality",
        theory: "Incomplete documentation leads to claim denials and costly rework. AI-generated notes are more comprehensive, reducing the denial rate for documentation-related issues.",
        calculationSteps: [
          { label: "Annual Claims", formula: "52,000 documented encounters", result: "52,000 claims" },
          { label: "Denial Reduction", formula: "52,000 × 0.5% denial improvement", result: "260 denials avoided" },
          { label: "Value Recovered", formula: "260 × $300 avg claim value", result: "$78,000" }
        ],
        customizableInputs: ["Current denial rate", "Average claim value", "% documentation-related"],
        ranges: { conservative: "$40K-65K", typical: "$70K-100K" }
      }
    ]
  },
  ed: {
    name: "Emergency Department",
    icon: Zap,
    subtitle: "High-volume, fast-paced encounters",
    referenceScenario: {
      title: "Reference: Mid-sized emergency department",
      details: "25 physicians | 45,000 annual visits | 70% adoption",
      encounters: "~31,500 Abridge-documented encounters/year"
    },
    timeSavedSubtitle: "Faster documentation, more throughput",
    docQualitySubtitle: "Real-time capture during fast encounters",
    drivers: [
      {
        id: "throughput",
        name: "Patient Throughput",
        description: "LWBS reduction, more patients seen",
        referenceValue: 315000,
        icon: Activity,
        lane: "time",
        theory: "In the ED, every minute of documentation time affects throughput. Reducing documentation burden lets physicians disposition patients faster, reducing Left Without Being Seen (LWBS) rates and capturing additional revenue.",
        calculationSteps: [
          { label: "Time Savings", formula: "3 min × 31,500 encounters", result: "1,575 hours returned" },
          { label: "Additional Capacity", formula: "1,575 hrs × 40% utilization", result: "630 additional patients" },
          { label: "Revenue Captured", formula: "630 × $500 avg ED visit", result: "$315,000" }
        ],
        customizableInputs: ["Current LWBS rate", "Average ED revenue", "Time per encounter"],
        ranges: { conservative: "$150K-250K", typical: "$280K-380K" }
      },
      {
        id: "scribe-reduction",
        name: "Scribe Cost Reduction",
        description: "Replace or reduce scribe coverage",
        referenceValue: 180000,
        icon: Users,
        lane: "time",
        theory: "Many EDs employ scribes to handle documentation. Ambient AI can reduce or replace scribe needs, providing significant labor savings while maintaining documentation quality.",
        calculationSteps: [
          { label: "Current Scribe Coverage", formula: "25 physicians × 40% with scribes", result: "10 scribe FTEs" },
          { label: "Scribe Reduction", formula: "10 FTEs × 50% reduction", result: "5 FTEs saved" },
          { label: "Labor Savings", formula: "5 × $36,000 annual cost", result: "$180,000" }
        ],
        customizableInputs: ["Current scribe FTEs", "Scribe hourly rate", "Reduction percentage"],
        ranges: { conservative: "$80K-140K", typical: "$160K-220K" }
      },
      {
        id: "ed-retention",
        name: "Workforce Retention",
        description: "Reduced ED burnout and turnover",
        referenceValue: 195000,
        icon: UserCheck,
        lane: "time",
        theory: "ED physicians face extreme burnout rates. Documentation burden compounds the stress of high-acuity care. Reducing this burden improves retention in a specialty where replacement is costly and difficult.",
        calculationSteps: [
          { label: "Burnout Impact", formula: "31,500 encounters × reduced burden", result: "Measurable improvement" },
          { label: "Retention Benefit", formula: "0.3 physicians retained", result: "0.3 FTE" },
          { label: "Replacement Savings", formula: "0.3 × $650,000 cost", result: "$195,000" }
        ],
        customizableInputs: ["Current turnover rate", "Replacement cost", "Attribution factor"],
        ranges: { conservative: "$100K-160K", typical: "$175K-240K" }
      },
      {
        id: "ed-los",
        name: "Level-of-Service Accuracy",
        description: "Capture true acuity in wRVUs",
        referenceValue: 157500,
        icon: TrendingUp,
        lane: "quality",
        theory: "ED encounters are complex and fast-moving. Documentation often misses elements that support higher E/M levels. AI captures the full clinical picture in real-time.",
        calculationSteps: [
          { label: "Documented Encounters", formula: "31,500 ED visits", result: "31,500" },
          { label: "Coding Improvement", formula: "31,500 × 10% undercode rate", result: "3,150 affected" },
          { label: "wRVU Capture", formula: "3,150 × $50 delta", result: "$157,500" }
        ],
        customizableInputs: ["Current undercode rate", "wRVU rate", "Acuity mix"],
        ranges: { conservative: "$80K-130K", typical: "$140K-190K" }
      },
      {
        id: "ed-denials",
        name: "Documentation-Related Denials",
        description: "Reduce claim rejections",
        referenceValue: 94500,
        icon: FileX,
        lane: "quality",
        theory: "ED claims face high scrutiny. Incomplete or inconsistent documentation leads to denials. Real-time AI capture ensures thorough documentation that withstands payer review.",
        calculationSteps: [
          { label: "Annual ED Claims", formula: "31,500 encounters", result: "31,500 claims" },
          { label: "Denial Improvement", formula: "31,500 × 0.6% reduction", result: "189 denials avoided" },
          { label: "Revenue Recovered", formula: "189 × $500 avg", result: "$94,500" }
        ],
        customizableInputs: ["Current denial rate", "Average claim value", "% documentation-related"],
        ranges: { conservative: "$50K-80K", typical: "$85K-120K" }
      }
    ]
  },
  nursing: {
    name: "Nursing",
    icon: HeartPulse,
    subtitle: "Bedside documentation, care coordination",
    referenceScenario: {
      title: "Reference: 200-bed hospital nursing deployment",
      details: "150 nurses | 180,000 documentation events/year | 60% adoption",
      encounters: "~108,000 Abridge-documented events/year"
    },
    timeSavedSubtitle: "Hours returned to bedside care",
    docQualitySubtitle: "Point-of-care documentation",
    drivers: [
      {
        id: "doc-time-savings",
        name: "Documentation Time Savings",
        description: "Hours returned to direct patient care",
        referenceValue: 486000,
        icon: Timer,
        lane: "time",
        theory: "Nurses spend up to 35% of their shift on documentation. Ambient AI captures care activities in real-time, returning hours to the bedside where they improve patient outcomes and satisfaction.",
        calculationSteps: [
          { label: "Documentation Events", formula: "108,000 events/year", result: "108,000" },
          { label: "Time Savings", formula: "108,000 × 2.5 min saved", result: "4,500 hours returned" },
          { label: "Value of Time", formula: "4,500 hrs × $45/hr", result: "$202,500 direct value" },
          { label: "Productivity Multiplier", formula: "$202,500 × 2.4x", result: "$486,000" }
        ],
        customizableInputs: ["Nurse count", "Documentation events", "Hourly rate", "Productivity factor"],
        ranges: { conservative: "$250K-380K", typical: "$450K-600K" }
      },
      {
        id: "nursing-overtime",
        name: "Overtime Reduction",
        description: "Eliminate end-of-shift charting overtime",
        referenceValue: 162000,
        icon: DollarSign,
        lane: "time",
        theory: "End-of-shift documentation frequently pushes nurses into overtime. Real-time documentation eliminates this burden, reducing premium labor costs.",
        calculationSteps: [
          { label: "Overtime Hours", formula: "150 nurses × 3 hrs OT/week", result: "23,400 OT hrs/year" },
          { label: "Reduction Rate", formula: "23,400 × 30% reduction", result: "7,020 hrs eliminated" },
          { label: "Cost Savings", formula: "7,020 × $23/hr OT premium", result: "$162,000" }
        ],
        customizableInputs: ["Current OT hours", "OT rate premium", "Reduction percentage"],
        ranges: { conservative: "$80K-130K", typical: "$145K-200K" }
      },
      {
        id: "nurse-retention",
        name: "Nurse Retention",
        description: "Reduced burnout and turnover",
        referenceValue: 270000,
        icon: UserCheck,
        lane: "time",
        theory: "Documentation burden is a top driver of nursing burnout and turnover. With replacement costs of $50K-80K per nurse, even modest retention improvements create significant value.",
        calculationSteps: [
          { label: "Current Turnover", formula: "150 nurses × 18% turnover", result: "27 nurses leave/year" },
          { label: "Retention Impact", formula: "27 × 15% improvement", result: "4 nurses retained" },
          { label: "Replacement Savings", formula: "4 × $67,500 avg cost", result: "$270,000" }
        ],
        customizableInputs: ["Nurse count", "Turnover rate", "Replacement cost", "Attribution"],
        ranges: { conservative: "$140K-220K", typical: "$250K-340K" }
      },
      {
        id: "doc-timeliness",
        name: "Documentation Timeliness",
        description: "Real-time vs. end-of-shift documentation",
        referenceValue: 108000,
        icon: ClipboardCheck,
        lane: "quality",
        theory: "Delayed documentation leads to errors and omissions. Real-time capture ensures accuracy and supports clinical decision-making during the care episode.",
        calculationSteps: [
          { label: "Documented Events", formula: "108,000 events", result: "108,000" },
          { label: "Timeliness Improvement", formula: "From 4+ hrs to <15 min avg", result: "95% improvement" },
          { label: "Error Reduction Value", formula: "108,000 × $1 per event", result: "$108,000" }
        ],
        customizableInputs: ["Current documentation lag", "Error rate", "Error cost"],
        ranges: { conservative: "$55K-90K", typical: "$95K-135K" }
      },
      {
        id: "doc-completeness",
        name: "Documentation Completeness",
        description: "All required elements captured",
        referenceValue: 135000,
        icon: FileText,
        lane: "quality",
        theory: "Rushed documentation often misses required fields, leading to compliance issues and downstream problems. AI ensures comprehensive capture of all care activities.",
        calculationSteps: [
          { label: "Documentation Events", formula: "108,000 events", result: "108,000" },
          { label: "Completeness Improvement", formula: "108,000 × 5% more complete", result: "5,400 improved events" },
          { label: "Value per Event", formula: "5,400 × $25 compliance value", result: "$135,000" }
        ],
        customizableInputs: ["Completeness rate", "Compliance value", "Audit risk"],
        ranges: { conservative: "$70K-110K", typical: "$120K-165K" }
      }
    ]
  }
};

function DriverAccordion({ 
  driver, 
  isExpanded, 
  onToggle,
  onViewed 
}: { 
  driver: Driver; 
  isExpanded: boolean; 
  onToggle: () => void;
  onViewed: () => void;
}) {
  const Icon = driver.icon;
  
  const handleToggle = () => {
    if (!isExpanded) {
      onViewed();
    }
    onToggle();
  };

  return (
    <div className="border border-neutral-200 rounded-xl overflow-visible bg-white">
      <button
        onClick={handleToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover-elevate rounded-xl"
        data-testid={`accordion-${driver.id}`}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#FEF2F0] flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-[#E85D3F]" />
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-[#111827]">{driver.name}</h4>
            <p className="text-sm text-[#6B7280]">{driver.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[#E85D3F] font-semibold">
            ${driver.referenceValue.toLocaleString()}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[#6B7280]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#6B7280]" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-5 pb-5 pt-2 border-t border-neutral-100 space-y-6 animate-in slide-in-from-top-2 duration-300">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-[#E85D3F]" />
              <span className="text-sm font-semibold text-[#111827]">The Theory</span>
            </div>
            <p className="text-sm text-[#6B7280] leading-relaxed">{driver.theory}</p>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-[#E85D3F]" />
              <span className="text-sm font-semibold text-[#111827]">How We Calculate It</span>
            </div>
            <div className="space-y-2">
              {driver.calculationSteps.map((step, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg animate-in fade-in duration-300"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <span className="w-6 h-6 rounded-full bg-[#E85D3F] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-[#6B7280] block">{step.label}</span>
                    <span className="text-sm text-[#111827] font-mono">{step.formula}</span>
                  </div>
                  <span className="text-sm font-semibold text-[#E85D3F] whitespace-nowrap">{step.result}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <SlidersHorizontal className="w-4 h-4 text-[#E85D3F]" />
              <span className="text-sm font-semibold text-[#111827]">What You'd Customize</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {driver.customizableInputs.map((input, idx) => (
                <span 
                  key={idx}
                  className="px-3 py-1 bg-[#FEF2F0] text-[#E85D3F] text-sm rounded-full"
                >
                  {input}
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-[#E85D3F]" />
              <span className="text-sm font-semibold text-[#111827]">Range Across Customers</span>
            </div>
            <p className="text-sm text-[#6B7280]">
              Conservative: <span className="font-semibold">{driver.ranges.conservative}</span> | 
              Typical: <span className="font-semibold">{driver.ranges.typical}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LearnPath({ onBack, onStartCalculator }: LearnPathProps) {
  const [screen, setScreen] = useState<LearnScreen>("selection");
  const [selectedSetting, setSelectedSetting] = useState<CareSettingType | null>(null);
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(new Set());
  const [viewedDrivers, setViewedDrivers] = useState<Set<string>>(new Set());

  const handleSettingSelect = (setting: CareSettingType) => {
    setSelectedSetting(setting);
  };

  const handleContinue = () => {
    if (selectedSetting) {
      setScreen("methodology");
      setExpandedDrivers(new Set());
      setViewedDrivers(new Set());
    }
  };

  const handleBackToSelection = () => {
    setScreen("selection");
  };

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

  const markDriverViewed = (driverId: string) => {
    setViewedDrivers(prev => new Set(prev).add(driverId));
  };

  const handleStartCalculator = () => {
    if (selectedSetting && onStartCalculator) {
      onStartCalculator(selectedSetting);
    }
  };

  const config = selectedSetting ? SETTING_CONFIGS[selectedSetting] : null;
  const timeDrivers = config?.drivers.filter(d => d.lane === "time") || [];
  const qualityDrivers = config?.drivers.filter(d => d.lane === "quality") || [];
  const showBridge = viewedDrivers.size >= 2;

  if (screen === "selection") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 via-white to-neutral-50">
        <header className="bg-white/95 backdrop-blur-sm border-b border-neutral-200">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
            <div className="flex items-center gap-3">
              <img src={abridgeLogo} alt="Abridge" className="h-6" data-testid="img-logo" />
              <span className="text-sm text-[#6B7280] font-medium">ROI Calculator</span>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-12 md:py-20">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-[#111827] tracking-tight mb-4">
              How Ambient ROI Actually Works
            </h1>
            <p className="text-lg text-[#6B7280] max-w-xl mx-auto">
              Most ROI calculators give you a number. We'll show you the methodology—so you can defend it in any meeting.
            </p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="mb-6">
              <label className="text-sm font-semibold text-[#111827] block mb-1">
                Select a care setting to explore
              </label>
              <p className="text-sm text-[#6B7280]">
                Each setting has unique workflows and value drivers. We'll show you exactly how ROI is calculated for your environment.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {(["outpatient", "ed", "nursing"] as CareSettingType[]).map((setting) => {
                const cfg = SETTING_CONFIGS[setting];
                const Icon = cfg.icon;
                const isSelected = selectedSetting === setting;
                
                return (
                  <button
                    key={setting}
                    onClick={() => handleSettingSelect(setting)}
                    className={`relative p-5 rounded-xl border-2 text-left hover-elevate ${
                      isSelected 
                        ? "border-[#E85D3F] bg-[#FEF2F0]" 
                        : "border-neutral-200 bg-white"
                    }`}
                    data-testid={`setting-${setting}`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#E85D3F] flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="w-10 h-10 rounded-lg bg-[#FEF2F0] flex items-center justify-center mb-3">
                      <Icon className={`w-5 h-5 ${isSelected ? "text-[#E85D3F]" : "text-[#6B7280]"}`} />
                    </div>
                    <h3 className="font-semibold text-[#111827] mb-1">{cfg.name}</h3>
                    <p className="text-sm text-[#6B7280]">{cfg.subtitle}</p>
                  </button>
                );
              })}
              
              <div className="relative p-5 rounded-xl border-2 border-neutral-200 bg-neutral-50 opacity-60 cursor-not-allowed">
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-neutral-200 rounded text-xs text-neutral-600 font-medium">
                  Coming soon
                </div>
                <div className="w-10 h-10 rounded-lg bg-neutral-200 flex items-center justify-center mb-3">
                  <Building2 className="w-5 h-5 text-neutral-400" />
                </div>
                <h3 className="font-semibold text-neutral-500 mb-1">Inpatient</h3>
                <p className="text-sm text-neutral-400">Hospital admissions, rounding</p>
              </div>
            </div>

            <Button
              onClick={handleContinue}
              disabled={!selectedSetting}
              size="lg"
              className="w-full bg-[#E85D3F] border-[#E85D3F] text-white font-semibold"
              data-testid="button-show-math"
            >
              Show Me the Math
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 via-white to-neutral-50">
      <header className="bg-white/95 backdrop-blur-sm border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToSelection}
            data-testid="button-back-methodology"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
          <div className="flex items-center gap-4">
            <img src={abridgeLogo} alt="Abridge" className="h-6 hidden sm:block" data-testid="img-logo-methodology" />
            {config && (
              <div className="flex items-center gap-2 px-3 py-1 bg-[#FEF2F0] rounded-full">
                <config.icon className="w-4 h-4 text-[#E85D3F]" />
                <span className="text-sm font-medium text-[#E85D3F]">{config.name}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 md:py-12">
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-[#111827] tracking-tight mb-2">
            The ROI Framework for {config?.name}
          </h1>
          <p className="text-[#6B7280]">Understanding where value actually comes from</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 mb-8">
          <div className="text-center mb-8">
            <span className="inline-block px-4 py-2 bg-[#111827] text-white text-sm font-semibold rounded-full mb-6">
              AMBIENT DOCUMENTATION
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-[#111827] mb-1">Time Saved</h3>
                <p className="text-sm text-[#6B7280]">{config?.timeSavedSubtitle}</p>
              </div>
              
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-bold text-[#111827] mb-1">Documentation Quality</h3>
                <p className="text-sm text-[#6B7280]">{config?.docQualitySubtitle}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#FEF2F0] border border-[#E85D3F]/20 rounded-xl p-5 mb-8">
          <h4 className="font-semibold text-[#111827] mb-1">{config?.referenceScenario.title}</h4>
          <p className="text-sm text-[#6B7280] mb-2">{config?.referenceScenario.details}</p>
          <p className="text-sm font-medium text-[#E85D3F]">{config?.referenceScenario.encounters}</p>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-lg">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-[#111827]">Time Saved Benefits</span>
          </div>
          <div className="space-y-3">
            {timeDrivers.map(driver => (
              <DriverAccordion
                key={driver.id}
                driver={driver}
                isExpanded={expandedDrivers.has(driver.id)}
                onToggle={() => toggleDriver(driver.id)}
                onViewed={() => markDriverViewed(driver.id)}
              />
            ))}
          </div>
        </div>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4 p-3 bg-emerald-50 rounded-lg">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-[#111827]">Documentation Quality Benefits</span>
          </div>
          <div className="space-y-3">
            {qualityDrivers.map(driver => (
              <DriverAccordion
                key={driver.id}
                driver={driver}
                isExpanded={expandedDrivers.has(driver.id)}
                onToggle={() => toggleDriver(driver.id)}
                onViewed={() => markDriverViewed(driver.id)}
              />
            ))}
          </div>
        </div>

        {showBridge && (
          <div className="bg-[#FEF2F0] border border-[#E85D3F]/20 rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-bold text-[#111827] mb-4">Now You Understand the Framework</h3>
            
            <div className="mb-4">
              <p className="text-sm text-[#6B7280] mb-3">Drivers you've explored:</p>
              <div className="flex flex-wrap gap-2">
                {Array.from(viewedDrivers).map(id => {
                  const driver = config?.drivers.find(d => d.id === id);
                  if (!driver) return null;
                  return (
                    <span key={id} className="flex items-center gap-1 px-3 py-1 bg-white border border-[#E85D3F]/30 rounded-full text-sm text-[#111827]">
                      <Check className="w-3 h-3 text-[#E85D3F]" />
                      {driver.name}
                    </span>
                  );
                })}
              </div>
            </div>
            
            <p className="text-[#6B7280] mb-6">
              Ready to build a model with YOUR organization's numbers?
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleStartCalculator}
                size="lg"
                className="bg-[#E85D3F] border-[#E85D3F] text-white font-semibold"
                data-testid="button-build-roi"
              >
                Build My ROI Model
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => setExpandedDrivers(new Set())}
                data-testid="button-explore-more"
              >
                Explore more drivers
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
