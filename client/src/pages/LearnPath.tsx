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
  AlertTriangle,
  BarChart2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import abridgeLogo from "@assets/abridge-logo-wordmark-black-onwhite_1767885563802.jpg";

interface LearnPathProps {
  onBack: () => void;
  onStartCalculator?: (setting: CareSettingType) => void;
}

type CareSettingType = "outpatient" | "ed" | "nursing";
type LearnScreen = "selection" | "methodology";

interface CalculationStep {
  stepNumber: number;
  stepLabel: string;
  inputs: {
    label: string;
    value: string;
  }[];
  output: {
    label: string;
    value: string;
  };
}

interface Driver {
  id: string;
  name: string;
  description: string;
  referenceValue: number;
  icon: React.ElementType;
  lane: "time" | "quality";
  theory: string;
  calculationSteps: CalculationStep[];
  caveat?: string;
}

interface SettingConfig {
  name: string;
  icon: React.ElementType;
  subtitle: string;
  referenceScenario: {
    providers: number;
    providerLabel: string;
    annualVisits: number;
    visitLabel: string;
    adoption: number;
    eligibleEncounters: number;
    description: string;
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
      providers: 40,
      providerLabel: "providers",
      annualVisits: 80000,
      visitLabel: "annual visits",
      adoption: 65,
      eligibleEncounters: 52000,
      description: "We'll walk through the math using a typical mid-sized outpatient practice as an example:"
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
          {
            stepNumber: 1,
            stepLabel: "TIME RETURNED",
            inputs: [
              { label: "Time saved per encounter", value: "2.5 min" },
              { label: "Eligible encounters", value: "52,000" }
            ],
            output: { label: "Hours returned", value: "2,167 hrs" }
          },
          {
            stepNumber: 2,
            stepLabel: "REALITY CHECK",
            inputs: [
              { label: "Hours returned", value: "2,167 hrs" },
              { label: "Realization factor", value: "20%" }
            ],
            output: { label: "Usable hours", value: "433 hrs" }
          },
          {
            stepNumber: 3,
            stepLabel: "NEW VISITS",
            inputs: [
              { label: "Usable hours", value: "433 hrs" },
              { label: "Time per visit", value: "30 min" }
            ],
            output: { label: "Additional visits", value: "866 visits" }
          },
          {
            stepNumber: 4,
            stepLabel: "REVENUE",
            inputs: [
              { label: "Additional visits", value: "866" },
              { label: "Revenue per visit", value: "$200" }
            ],
            output: { label: "Annual value", value: "$173,200" }
          }
        ]
      },
      {
        id: "overtime-locum",
        name: "Overtime & Locum Savings",
        description: "Less premium labor needed",
        referenceValue: 151200,
        icon: DollarSign,
        lane: "time",
        theory: "Documentation often extends past scheduled hours, triggering overtime pay. By returning time to clinicians, organizations reduce the need for after-hours work and expensive locum coverage to maintain access.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "AFTER-HOURS BASELINE",
            inputs: [
              { label: "Providers with OT", value: "40 × 60%" },
              { label: "Hours/week × weeks", value: "4 × 50" }
            ],
            output: { label: "Annual OT hours", value: "4,800 hrs" }
          },
          {
            stepNumber: 2,
            stepLabel: "HOURS ELIMINATED",
            inputs: [
              { label: "Baseline OT hours", value: "4,800 hrs" },
              { label: "Reduction rate", value: "70%" }
            ],
            output: { label: "Hours saved", value: "3,360 hrs" }
          },
          {
            stepNumber: 3,
            stepLabel: "PREMIUM LABOR PORTION",
            inputs: [
              { label: "Hours saved", value: "3,360 hrs" },
              { label: "Premium rate %", value: "30%" }
            ],
            output: { label: "Premium hours", value: "1,008 hrs" }
          },
          {
            stepNumber: 4,
            stepLabel: "COST SAVINGS",
            inputs: [
              { label: "Premium hours", value: "1,008 hrs" },
              { label: "OT rate", value: "$150/hr" }
            ],
            output: { label: "Annual savings", value: "$151,200" }
          }
        ],
        caveat: "Some organizations see higher impact if using locums ($275/hr)"
      },
      {
        id: "clinician-retention",
        name: "Clinician Retention",
        description: "Reduced burnout, lower turnover costs",
        referenceValue: 160000,
        icon: UserCheck,
        lane: "time",
        theory: "Documentation burden is the #1 driver of physician burnout. Reducing this burden improves satisfaction and retention. Replacing a physician costs $500K-1M when you factor in recruiting, onboarding, and lost revenue.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "BASELINE TURNOVER",
            inputs: [
              { label: "Providers", value: "40" },
              { label: "Annual turnover", value: "6%" }
            ],
            output: { label: "Departures/year", value: "2.4" }
          },
          {
            stepNumber: 2,
            stepLabel: "BURNOUT-RELATED",
            inputs: [
              { label: "Annual departures", value: "2.4" },
              { label: "Burnout attribution", value: "45%" }
            ],
            output: { label: "Preventable", value: "1.08" }
          },
          {
            stepNumber: 3,
            stepLabel: "ABRIDGE ATTRIBUTION",
            inputs: [
              { label: "Preventable departures", value: "1.08" },
              { label: "Abridge impact", value: "30%" }
            ],
            output: { label: "Departures avoided", value: "0.32" }
          },
          {
            stepNumber: 4,
            stepLabel: "COST SAVINGS",
            inputs: [
              { label: "Departures avoided", value: "0.32" },
              { label: "Replacement cost", value: "$500,000" }
            ],
            output: { label: "Annual savings", value: "$160,000" }
          }
        ],
        caveat: "Retention impact typically measurable after 12-18 months"
      },
      {
        id: "level-of-service",
        name: "Accurate Level of Service",
        description: "Capture appropriate wRVU value",
        referenceValue: 131040,
        icon: TrendingUp,
        lane: "quality",
        theory: "Physicians under time pressure often undercode visits—documenting a Level 3 when the encounter truly warranted Level 4. AI documentation captures the full clinical picture, ensuring accurate E/M coding.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "E/M ENCOUNTERS",
            inputs: [
              { label: "Eligible encounters", value: "52,000" },
              { label: "E/M portion", value: "80%" }
            ],
            output: { label: "E/M visits", value: "41,600" }
          },
          {
            stepNumber: 2,
            stepLabel: "UNDER-CODED",
            inputs: [
              { label: "E/M visits", value: "41,600" },
              { label: "Undercode rate", value: "10%" }
            ],
            output: { label: "Affected visits", value: "4,160" }
          },
          {
            stepNumber: 3,
            stepLabel: "wRVU LIFT",
            inputs: [
              { label: "Affected visits", value: "4,160" },
              { label: "wRVU delta × rate", value: "0.7 × $45" }
            ],
            output: { label: "Annual value", value: "$131,040" }
          }
        ]
      },
      {
        id: "hcc-capture",
        name: "HCC & Chronic Condition Capture",
        description: "RAF score improvement",
        referenceValue: 524160,
        icon: ShieldCheck,
        lane: "quality",
        theory: "Risk adjustment relies on complete documentation of chronic conditions. AI ensures conditions mentioned in conversation get documented, improving RAF scores for value-based contracts.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "RISK-BASED ENCOUNTERS",
            inputs: [
              { label: "Eligible encounters", value: "52,000" },
              { label: "In risk contracts", value: "35%" }
            ],
            output: { label: "Risk encounters", value: "18,200" }
          },
          {
            stepNumber: 2,
            stepLabel: "HCC GAP",
            inputs: [
              { label: "Risk encounters", value: "18,200" },
              { label: "Capture gap", value: "30%" }
            ],
            output: { label: "Opportunities", value: "5,460" }
          },
          {
            stepNumber: 3,
            stepLabel: "ABRIDGE IMPROVEMENT",
            inputs: [
              { label: "HCC opportunities", value: "5,460" },
              { label: "Improvement rate", value: "20%" }
            ],
            output: { label: "HCCs captured", value: "1,092" }
          },
          {
            stepNumber: 4,
            stepLabel: "REVENUE",
            inputs: [
              { label: "HCCs × value × audit", value: "1,092 × $800 × 60%" }
            ],
            output: { label: "Annual value", value: "$524,160" }
          }
        ],
        caveat: "Varies significantly based on payer mix and current capture rates"
      },
      {
        id: "denials-reduction",
        name: "Documentation-Related Denials",
        description: "Fewer rejected claims",
        referenceValue: 127500,
        icon: FileX,
        lane: "quality",
        theory: "Incomplete documentation leads to claim denials and costly rework. AI-generated notes are more comprehensive, reducing the denial rate for documentation-related issues.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "TOTAL DENIALS",
            inputs: [
              { label: "Eligible encounters", value: "52,000" },
              { label: "Denial rate", value: "7%" }
            ],
            output: { label: "Annual denials", value: "3,640" }
          },
          {
            stepNumber: 2,
            stepLabel: "DOC-RELATED",
            inputs: [
              { label: "Total denials", value: "3,640" },
              { label: "Doc-related %", value: "35%" }
            ],
            output: { label: "Doc denials", value: "1,274" }
          },
          {
            stepNumber: 3,
            stepLabel: "PREVENTED",
            inputs: [
              { label: "Doc denials", value: "1,274" },
              { label: "Improvement", value: "40%" }
            ],
            output: { label: "Prevented", value: "510" }
          },
          {
            stepNumber: 4,
            stepLabel: "VALUE",
            inputs: [
              { label: "Prevented denials", value: "510" },
              { label: "Avg claim value", value: "$250" }
            ],
            output: { label: "Annual value", value: "$127,500" }
          }
        ]
      }
    ]
  },
  ed: {
    name: "Emergency Department",
    icon: Zap,
    subtitle: "High-volume, fast-paced encounters",
    referenceScenario: {
      providers: 25,
      providerLabel: "physicians",
      annualVisits: 45000,
      visitLabel: "annual visits",
      adoption: 70,
      eligibleEncounters: 31500,
      description: "We'll walk through the math using a mid-sized emergency department as an example:"
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
          {
            stepNumber: 1,
            stepLabel: "TIME SAVINGS",
            inputs: [
              { label: "Time per encounter", value: "3 min" },
              { label: "Eligible encounters", value: "31,500" }
            ],
            output: { label: "Hours returned", value: "1,575 hrs" }
          },
          {
            stepNumber: 2,
            stepLabel: "ADDITIONAL CAPACITY",
            inputs: [
              { label: "Hours returned", value: "1,575 hrs" },
              { label: "Utilization rate", value: "40%" }
            ],
            output: { label: "Additional patients", value: "630" }
          },
          {
            stepNumber: 3,
            stepLabel: "REVENUE CAPTURED",
            inputs: [
              { label: "Additional patients", value: "630" },
              { label: "Avg ED visit", value: "$500" }
            ],
            output: { label: "Annual value", value: "$315,000" }
          }
        ]
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
          {
            stepNumber: 1,
            stepLabel: "CURRENT SCRIBE COVERAGE",
            inputs: [
              { label: "Physicians", value: "25" },
              { label: "With scribes", value: "40%" }
            ],
            output: { label: "Scribe FTEs", value: "10" }
          },
          {
            stepNumber: 2,
            stepLabel: "SCRIBE REDUCTION",
            inputs: [
              { label: "Current FTEs", value: "10" },
              { label: "Reduction rate", value: "50%" }
            ],
            output: { label: "FTEs saved", value: "5" }
          },
          {
            stepNumber: 3,
            stepLabel: "LABOR SAVINGS",
            inputs: [
              { label: "FTEs saved", value: "5" },
              { label: "Annual cost", value: "$36,000" }
            ],
            output: { label: "Annual savings", value: "$180,000" }
          }
        ]
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
          {
            stepNumber: 1,
            stepLabel: "BASELINE TURNOVER",
            inputs: [
              { label: "ED physicians", value: "25" },
              { label: "Annual turnover", value: "8%" }
            ],
            output: { label: "Departures/year", value: "2.0" }
          },
          {
            stepNumber: 2,
            stepLabel: "BURNOUT ATTRIBUTION",
            inputs: [
              { label: "Annual departures", value: "2.0" },
              { label: "Burnout-related", value: "50%" }
            ],
            output: { label: "Preventable", value: "1.0" }
          },
          {
            stepNumber: 3,
            stepLabel: "RETENTION BENEFIT",
            inputs: [
              { label: "Preventable", value: "1.0" },
              { label: "Abridge impact", value: "30%" }
            ],
            output: { label: "Retained", value: "0.3 FTE" }
          },
          {
            stepNumber: 4,
            stepLabel: "REPLACEMENT SAVINGS",
            inputs: [
              { label: "FTE retained", value: "0.3" },
              { label: "Replacement cost", value: "$650,000" }
            ],
            output: { label: "Annual savings", value: "$195,000" }
          }
        ],
        caveat: "Retention impact typically measurable after 12-18 months"
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
          {
            stepNumber: 1,
            stepLabel: "DOCUMENTED ENCOUNTERS",
            inputs: [
              { label: "Eligible ED visits", value: "31,500" }
            ],
            output: { label: "Total", value: "31,500" }
          },
          {
            stepNumber: 2,
            stepLabel: "CODING IMPROVEMENT",
            inputs: [
              { label: "ED visits", value: "31,500" },
              { label: "Undercode rate", value: "10%" }
            ],
            output: { label: "Affected", value: "3,150" }
          },
          {
            stepNumber: 3,
            stepLabel: "wRVU CAPTURE",
            inputs: [
              { label: "Affected visits", value: "3,150" },
              { label: "wRVU delta", value: "$50" }
            ],
            output: { label: "Annual value", value: "$157,500" }
          }
        ]
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
          {
            stepNumber: 1,
            stepLabel: "TOTAL DENIALS",
            inputs: [
              { label: "ED encounters", value: "31,500" },
              { label: "Denial rate", value: "8%" }
            ],
            output: { label: "Annual denials", value: "2,520" }
          },
          {
            stepNumber: 2,
            stepLabel: "DOC-RELATED",
            inputs: [
              { label: "Total denials", value: "2,520" },
              { label: "Doc-related", value: "30%" }
            ],
            output: { label: "Doc denials", value: "756" }
          },
          {
            stepNumber: 3,
            stepLabel: "PREVENTED",
            inputs: [
              { label: "Doc denials", value: "756" },
              { label: "Improvement", value: "25%" }
            ],
            output: { label: "Prevented", value: "189" }
          },
          {
            stepNumber: 4,
            stepLabel: "VALUE",
            inputs: [
              { label: "Prevented", value: "189" },
              { label: "Avg claim", value: "$500" }
            ],
            output: { label: "Annual value", value: "$94,500" }
          }
        ]
      }
    ]
  },
  nursing: {
    name: "Nursing",
    icon: HeartPulse,
    subtitle: "Bedside documentation, care coordination",
    referenceScenario: {
      providers: 150,
      providerLabel: "nurses",
      annualVisits: 180000,
      visitLabel: "documentation events",
      adoption: 60,
      eligibleEncounters: 108000,
      description: "We'll walk through the math using a 200-bed hospital nursing deployment as an example:"
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
          {
            stepNumber: 1,
            stepLabel: "DOCUMENTATION EVENTS",
            inputs: [
              { label: "Annual events", value: "108,000" }
            ],
            output: { label: "Total events", value: "108,000" }
          },
          {
            stepNumber: 2,
            stepLabel: "TIME SAVINGS",
            inputs: [
              { label: "Events", value: "108,000" },
              { label: "Time saved", value: "2.5 min" }
            ],
            output: { label: "Hours returned", value: "4,500 hrs" }
          },
          {
            stepNumber: 3,
            stepLabel: "DIRECT VALUE",
            inputs: [
              { label: "Hours returned", value: "4,500" },
              { label: "Hourly rate", value: "$45" }
            ],
            output: { label: "Direct value", value: "$202,500" }
          },
          {
            stepNumber: 4,
            stepLabel: "PRODUCTIVITY MULTIPLIER",
            inputs: [
              { label: "Direct value", value: "$202,500" },
              { label: "Multiplier", value: "2.4x" }
            ],
            output: { label: "Annual value", value: "$486,000" }
          }
        ]
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
          {
            stepNumber: 1,
            stepLabel: "BASELINE OVERTIME",
            inputs: [
              { label: "Nurses", value: "150" },
              { label: "OT hrs/week × weeks", value: "3 × 52" }
            ],
            output: { label: "Annual OT hrs", value: "23,400" }
          },
          {
            stepNumber: 2,
            stepLabel: "REDUCTION",
            inputs: [
              { label: "OT hours", value: "23,400" },
              { label: "Reduction rate", value: "30%" }
            ],
            output: { label: "Hours eliminated", value: "7,020" }
          },
          {
            stepNumber: 3,
            stepLabel: "COST SAVINGS",
            inputs: [
              { label: "Hours eliminated", value: "7,020" },
              { label: "OT premium", value: "$23/hr" }
            ],
            output: { label: "Annual savings", value: "$162,000" }
          }
        ]
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
          {
            stepNumber: 1,
            stepLabel: "CURRENT TURNOVER",
            inputs: [
              { label: "Nurses", value: "150" },
              { label: "Turnover rate", value: "18%" }
            ],
            output: { label: "Annual departures", value: "27" }
          },
          {
            stepNumber: 2,
            stepLabel: "RETENTION IMPACT",
            inputs: [
              { label: "Departures", value: "27" },
              { label: "Improvement", value: "15%" }
            ],
            output: { label: "Nurses retained", value: "4" }
          },
          {
            stepNumber: 3,
            stepLabel: "REPLACEMENT SAVINGS",
            inputs: [
              { label: "Retained", value: "4" },
              { label: "Replacement cost", value: "$67,500" }
            ],
            output: { label: "Annual savings", value: "$270,000" }
          }
        ],
        caveat: "Retention impact typically measurable after 12-18 months"
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
          {
            stepNumber: 1,
            stepLabel: "DOCUMENTED EVENTS",
            inputs: [
              { label: "Annual events", value: "108,000" }
            ],
            output: { label: "Total", value: "108,000" }
          },
          {
            stepNumber: 2,
            stepLabel: "TIMELINESS IMPROVEMENT",
            inputs: [
              { label: "Current lag", value: "4+ hours" },
              { label: "New lag", value: "<15 min" }
            ],
            output: { label: "Improvement", value: "95%" }
          },
          {
            stepNumber: 3,
            stepLabel: "ERROR REDUCTION VALUE",
            inputs: [
              { label: "Events improved", value: "108,000" },
              { label: "Value per event", value: "$1" }
            ],
            output: { label: "Annual value", value: "$108,000" }
          }
        ]
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
          {
            stepNumber: 1,
            stepLabel: "DOCUMENTATION EVENTS",
            inputs: [
              { label: "Annual events", value: "108,000" }
            ],
            output: { label: "Total", value: "108,000" }
          },
          {
            stepNumber: 2,
            stepLabel: "COMPLETENESS IMPROVEMENT",
            inputs: [
              { label: "Events", value: "108,000" },
              { label: "Improvement rate", value: "5%" }
            ],
            output: { label: "Improved events", value: "5,400" }
          },
          {
            stepNumber: 3,
            stepLabel: "COMPLIANCE VALUE",
            inputs: [
              { label: "Improved events", value: "5,400" },
              { label: "Value per event", value: "$25" }
            ],
            output: { label: "Annual value", value: "$135,000" }
          }
        ]
      }
    ]
  }
};

function CalculationStepCard({ step, isLast }: { step: CalculationStep; isLast: boolean }) {
  return (
    <div className="relative">
      <div className="bg-[#F8F9FA] rounded-lg p-5 animate-in fade-in duration-300">
        <div className="text-xs font-bold text-[#6B7280] tracking-wide mb-4">
          STEP {step.stepNumber}: {step.stepLabel}
        </div>
        
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="flex items-end gap-3 flex-wrap flex-1">
            {step.inputs.map((input, idx) => (
              <div key={idx} className="flex items-end gap-3">
                {idx > 0 && (
                  <span className="text-[#9CA3AF] font-mono text-lg pb-1">×</span>
                )}
                <div className="text-center">
                  <div className="text-xs text-[#6B7280] mb-1">{input.label}</div>
                  <div className="font-mono text-[#111827] font-medium border-b-2 border-[#E5E7EB] pb-1 px-2">
                    {input.value}
                  </div>
                </div>
              </div>
            ))}
            <span className="text-[#9CA3AF] font-mono text-lg pb-1">=</span>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-[#6B7280] mb-1">{step.output.label}</div>
            <div className="font-mono text-[#E85D3F] font-bold text-lg border-b-2 border-[#E85D3F] pb-1 px-2">
              {step.output.value}
            </div>
          </div>
        </div>
      </div>
      
      {!isLast && (
        <div className="flex justify-center py-2">
          <div className="w-0.5 h-4 bg-[#E5E7EB]"></div>
        </div>
      )}
    </div>
  );
}

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
        <div className="px-5 pb-6 pt-3 border-t border-neutral-100 space-y-6 animate-in slide-in-from-top-2 duration-300">
          {/* The Theory */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-[#E85D3F]" />
              <span className="text-sm font-semibold text-[#111827]">The Theory</span>
            </div>
            <p className="text-sm text-[#6B7280] leading-relaxed">{driver.theory}</p>
          </div>
          
          {/* How We Calculate It */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-4 h-4 text-[#E85D3F]" />
              <span className="text-sm font-semibold text-[#111827]">How We Calculate It</span>
            </div>
            <div className="space-y-0">
              {driver.calculationSteps.map((step, idx) => (
                <CalculationStepCard 
                  key={idx} 
                  step={step} 
                  isLast={idx === driver.calculationSteps.length - 1}
                />
              ))}
            </div>
          </div>
          
          {/* Caveat Note */}
          {driver.caveat && (
            <div className="flex items-start gap-2 text-sm text-[#6B7280]">
              <AlertTriangle className="w-4 h-4 text-[#9CA3AF] mt-0.5 flex-shrink-0" />
              <span>{driver.caveat}</span>
            </div>
          )}
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

        {/* Reference Scenario Card - Now at top */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 mb-8" data-testid="reference-scenario-card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-5 h-5 text-[#E85D3F]" />
            <h3 className="text-sm font-bold text-[#111827] tracking-wide">REFERENCE SCENARIO</h3>
          </div>
          
          <p className="text-[#6B7280] mb-6">{config?.referenceScenario.description}</p>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[#F8F9FA] rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#111827]">{config?.referenceScenario.providers}</div>
              <div className="text-sm text-[#6B7280]">{config?.referenceScenario.providerLabel}</div>
            </div>
            <div className="bg-[#F8F9FA] rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#111827]">{config?.referenceScenario.annualVisits.toLocaleString()}</div>
              <div className="text-sm text-[#6B7280]">{config?.referenceScenario.visitLabel}</div>
            </div>
            <div className="bg-[#F8F9FA] rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#111827]">{config?.referenceScenario.adoption}%</div>
              <div className="text-sm text-[#6B7280]">adoption</div>
            </div>
          </div>
          
          <p className="text-sm text-[#111827] font-medium mb-3">
            This creates ~{config?.referenceScenario.eligibleEncounters.toLocaleString()} Abridge-documented encounters/year
          </p>
          
          <div className="flex items-start gap-2 text-sm text-[#6B7280] bg-[#FEF2F0] rounded-lg p-3">
            <Lightbulb className="w-4 h-4 text-[#E85D3F] mt-0.5 flex-shrink-0" />
            <span>In the calculator, you'll input YOUR numbers</span>
          </div>
        </div>

        {/* Visual Framework */}
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

        {/* Combined Reference Value Summary */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 mb-10" data-testid="value-summary-card">
          <h3 className="text-sm font-bold text-[#111827] tracking-wide mb-6">COMBINED REFERENCE VALUE</h3>
          
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-[#6B7280]">Time Saved Benefits:</span>
              <span className="font-mono font-bold text-[#111827]">
                ${timeDrivers.reduce((sum, d) => sum + d.referenceValue, 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#6B7280]">Documentation Quality:</span>
              <span className="font-mono font-bold text-[#111827]">
                ${qualityDrivers.reduce((sum, d) => sum + d.referenceValue, 0).toLocaleString()}
              </span>
            </div>
            <div className="border-t border-neutral-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[#111827]">Total Potential:</span>
                <span className="font-mono font-bold text-[#E85D3F] text-xl">
                  ${(timeDrivers.reduce((sum, d) => sum + d.referenceValue, 0) + qualityDrivers.reduce((sum, d) => sum + d.referenceValue, 0)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-[#6B7280]">
            For {config?.referenceScenario.providers} {config?.referenceScenario.providerLabel} with {config?.referenceScenario.adoption}% adoption
          </p>
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
