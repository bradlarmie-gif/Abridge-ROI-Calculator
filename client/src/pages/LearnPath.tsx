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

type CareSettingType = "outpatient" | "ed" | "nursing" | "inpatient";
type LearnScreen = "selection" | "methodology";

interface CalculationStep {
  stepNumber: number;
  stepLabel: string;
  question: string;
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
  whyItMatters: string;
  referenceValue: number;
  icon: React.ElementType;
  lane: "time" | "quality";
  order: number;
  theory: string;
  calculationSteps: CalculationStep[];
  caveat?: string;
}

interface SettingConfig {
  name: string;
  icon: React.ElementType;
  subtitle: string;
  insightText: {
    main: string;
    highlight: string;
    followup: string;
  };
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
    insightText: {
      main: "Most people think ambient just saves time. That's true—but incomplete. Time saved is only",
      highlight: "HALF",
      followup: "the value. The other half? Documentation that's actually better than manual notes."
    },
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
        id: "overtime-locum",
        name: "Overtime & Locum Savings",
        description: "Less premium labor needed",
        whyItMatters: "The quick win—measurable impact in 30 days",
        referenceValue: 151200,
        icon: DollarSign,
        lane: "time",
        order: 1,
        theory: "Documentation often extends past scheduled hours, triggering overtime pay. By returning time to clinicians, organizations reduce the need for after-hours work and expensive locum coverage to maintain access.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "AFTER-HOURS BASELINE",
            question: "How much overtime exists today?",
            inputs: [
              { label: "Providers with OT", value: "40 × 60%" },
              { label: "Hours/week × weeks", value: "4 × 50" }
            ],
            output: { label: "Annual OT hours", value: "4,800 hrs" }
          },
          {
            stepNumber: 2,
            stepLabel: "HOURS ELIMINATED",
            question: "How much can Abridge reduce?",
            inputs: [
              { label: "Baseline OT hours", value: "4,800 hrs" },
              { label: "Reduction rate", value: "70%" }
            ],
            output: { label: "Hours saved", value: "3,360 hrs" }
          },
          {
            stepNumber: 3,
            stepLabel: "PREMIUM LABOR PORTION",
            question: "What portion is premium pay?",
            inputs: [
              { label: "Hours saved", value: "3,360 hrs" },
              { label: "Premium rate %", value: "30%" }
            ],
            output: { label: "Premium hours", value: "1,008 hrs" }
          },
          {
            stepNumber: 4,
            stepLabel: "COST SAVINGS",
            question: "What's the dollar value?",
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
        id: "patient-access",
        name: "Patient Access",
        description: "More visits possible with time returned",
        whyItMatters: "Convert time into additional visits—if demand exists",
        referenceValue: 173200,
        icon: Users,
        lane: "time",
        order: 2,
        theory: "When clinicians spend less time on documentation, they have capacity to see additional patients. Not all saved time converts to visits—scheduling, room availability, and other factors limit realization—but even a modest portion creates meaningful revenue.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "TIME RETURNED",
            question: "How much time does Abridge give back?",
            inputs: [
              { label: "Time saved per encounter", value: "2.5 min" },
              { label: "Eligible encounters", value: "52,000" }
            ],
            output: { label: "Hours returned", value: "2,167 hrs" }
          },
          {
            stepNumber: 2,
            stepLabel: "REALITY CHECK",
            question: "How much can realistically convert to visits?",
            inputs: [
              { label: "Hours returned", value: "2,167 hrs" },
              { label: "Realization factor", value: "20%" }
            ],
            output: { label: "Usable hours", value: "433 hrs" }
          },
          {
            stepNumber: 3,
            stepLabel: "NEW VISITS",
            question: "How many additional visits is that?",
            inputs: [
              { label: "Usable hours", value: "433 hrs" },
              { label: "Time per visit", value: "30 min" }
            ],
            output: { label: "Additional visits", value: "866 visits" }
          },
          {
            stepNumber: 4,
            stepLabel: "REVENUE",
            question: "What's the revenue impact?",
            inputs: [
              { label: "Additional visits", value: "866" },
              { label: "Revenue per visit", value: "$200" }
            ],
            output: { label: "Annual value", value: "$173,200" }
          }
        ]
      },
      {
        id: "clinician-retention",
        name: "Clinician Retention",
        description: "Reduced burnout, lower turnover costs",
        whyItMatters: "The long game—12+ months to see full impact",
        referenceValue: 160000,
        icon: UserCheck,
        lane: "time",
        order: 3,
        theory: "Documentation burden is the #1 driver of physician burnout. Reducing this burden improves satisfaction and retention. Replacing a physician costs $500K-1M when you factor in recruiting, onboarding, and lost revenue.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "BASELINE TURNOVER",
            question: "What's the current turnover situation?",
            inputs: [
              { label: "Providers", value: "40" },
              { label: "Annual turnover", value: "6%" }
            ],
            output: { label: "Departures/year", value: "2.4" }
          },
          {
            stepNumber: 2,
            stepLabel: "BURNOUT-RELATED",
            question: "How much is burnout-driven?",
            inputs: [
              { label: "Annual departures", value: "2.4" },
              { label: "Burnout attribution", value: "45%" }
            ],
            output: { label: "Preventable", value: "1.08" }
          },
          {
            stepNumber: 3,
            stepLabel: "ABRIDGE ATTRIBUTION",
            question: "What can Abridge prevent?",
            inputs: [
              { label: "Preventable departures", value: "1.08" },
              { label: "Abridge impact", value: "30%" }
            ],
            output: { label: "Departures avoided", value: "0.32" }
          },
          {
            stepNumber: 4,
            stepLabel: "COST SAVINGS",
            question: "What's the dollar value?",
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
        whyItMatters: "Capture the complexity you're already delivering",
        referenceValue: 131040,
        icon: TrendingUp,
        lane: "quality",
        order: 1,
        theory: "Physicians under time pressure often undercode visits—documenting a Level 3 when the encounter truly warranted Level 4. AI documentation captures the full clinical picture, ensuring accurate E/M coding.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "E/M ENCOUNTERS",
            question: "How many E/M visits are there?",
            inputs: [
              { label: "Eligible encounters", value: "52,000" },
              { label: "E/M portion", value: "80%" }
            ],
            output: { label: "E/M visits", value: "41,600" }
          },
          {
            stepNumber: 2,
            stepLabel: "UNDER-CODED",
            question: "How many are being under-coded?",
            inputs: [
              { label: "E/M visits", value: "41,600" },
              { label: "Undercode rate", value: "10%" }
            ],
            output: { label: "Affected visits", value: "4,160" }
          },
          {
            stepNumber: 3,
            stepLabel: "wRVU LIFT",
            question: "What's the revenue opportunity?",
            inputs: [
              { label: "Affected visits", value: "4,160" },
              { label: "wRVU delta × rate", value: "0.7 × $45" }
            ],
            output: { label: "Annual value", value: "$131,040" }
          }
        ]
      },
      {
        id: "denials-reduction",
        name: "Documentation-Related Denials",
        description: "Fewer rejected claims",
        whyItMatters: "Better notes, fewer rejections, faster payment",
        referenceValue: 127500,
        icon: FileX,
        lane: "quality",
        order: 2,
        theory: "Incomplete documentation leads to claim denials and costly rework. AI-generated notes are more comprehensive, reducing the denial rate for documentation-related issues.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "TOTAL DENIALS",
            question: "How many claims are denied today?",
            inputs: [
              { label: "Eligible encounters", value: "52,000" },
              { label: "Denial rate", value: "7%" }
            ],
            output: { label: "Annual denials", value: "3,640" }
          },
          {
            stepNumber: 2,
            stepLabel: "DOC-RELATED",
            question: "How many are documentation-related?",
            inputs: [
              { label: "Total denials", value: "3,640" },
              { label: "Doc-related %", value: "35%" }
            ],
            output: { label: "Doc denials", value: "1,274" }
          },
          {
            stepNumber: 3,
            stepLabel: "PREVENTED",
            question: "How many can Abridge prevent?",
            inputs: [
              { label: "Doc denials", value: "1,274" },
              { label: "Improvement", value: "40%" }
            ],
            output: { label: "Prevented", value: "510" }
          },
          {
            stepNumber: 4,
            stepLabel: "VALUE",
            question: "What's the dollar value?",
            inputs: [
              { label: "Prevented denials", value: "510" },
              { label: "Avg claim value", value: "$250" }
            ],
            output: { label: "Annual value", value: "$127,500" }
          }
        ]
      },
      {
        id: "hcc-capture",
        name: "HCC & Chronic Condition Capture",
        description: "RAF score improvement",
        whyItMatters: "For risk contracts: document what's discussed",
        referenceValue: 524160,
        icon: ShieldCheck,
        lane: "quality",
        order: 3,
        theory: "Risk adjustment relies on complete documentation of chronic conditions. AI ensures conditions mentioned in conversation get documented, improving RAF scores for value-based contracts.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "RISK-BASED ENCOUNTERS",
            question: "How many encounters are in risk contracts?",
            inputs: [
              { label: "Eligible encounters", value: "52,000" },
              { label: "In risk contracts", value: "35%" }
            ],
            output: { label: "Risk encounters", value: "18,200" }
          },
          {
            stepNumber: 2,
            stepLabel: "HCC GAP",
            question: "How many HCCs are being missed?",
            inputs: [
              { label: "Risk encounters", value: "18,200" },
              { label: "Capture gap", value: "30%" }
            ],
            output: { label: "Opportunities", value: "5,460" }
          },
          {
            stepNumber: 3,
            stepLabel: "ABRIDGE IMPROVEMENT",
            question: "How many can Abridge capture?",
            inputs: [
              { label: "HCC opportunities", value: "5,460" },
              { label: "Improvement rate", value: "20%" }
            ],
            output: { label: "HCCs captured", value: "1,092" }
          },
          {
            stepNumber: 4,
            stepLabel: "REVENUE",
            question: "What's the risk-adjusted revenue?",
            inputs: [
              { label: "HCCs × value × audit", value: "1,092 × $800 × 60%" }
            ],
            output: { label: "Annual value", value: "$524,160" }
          }
        ],
        caveat: "Varies significantly based on payer mix and current capture rates"
      }
    ]
  },
  ed: {
    name: "Emergency Department",
    icon: Zap,
    subtitle: "High-volume, fast-paced encounters",
    insightText: {
      main: "In the ED, time isn't about seeing MORE patients—they're already in your waiting room. Time is about seeing them FASTER. Faster documentation means faster disposition, lower LWBS rates, and more beds turning over.",
      highlight: "FASTER",
      followup: "And if you're using scribes, there's a direct cost replacement opportunity."
    },
    referenceScenario: {
      providers: 25,
      providerLabel: "physicians",
      annualVisits: 45000,
      visitLabel: "annual visits",
      adoption: 70,
      eligibleEncounters: 31500,
      description: "We'll walk through the math using a mid-sized emergency department as an example:"
    },
    timeSavedSubtitle: "When ED physicians document faster, patients move through faster",
    docQualitySubtitle: "ED visits involve complex decision-making that's hard to capture under pressure",
    drivers: [
      {
        id: "throughput",
        name: "Patient Throughput (LWBS)",
        description: "LWBS reduction, revenue recaptured",
        whyItMatters: "Keep patients from walking out—capture that revenue",
        referenceValue: 189000,
        icon: Activity,
        lane: "time",
        order: 1,
        theory: "When patients leave without being seen, you lose that revenue entirely. Faster documentation means faster throughput, shorter wait times, and fewer walkouts.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "CURRENT LWBS RATE",
            question: "How many patients are you losing?",
            inputs: [
              { label: "Annual visits", value: "45,000" },
              { label: "LWBS rate", value: "3.5%" }
            ],
            output: { label: "Patients leaving", value: "1,575" }
          },
          {
            stepNumber: 2,
            stepLabel: "THROUGHPUT IMPROVEMENT",
            question: "How much can faster documentation help?",
            inputs: [
              { label: "Patients leaving", value: "1,575" },
              { label: "LWBS improvement", value: "20%" }
            ],
            output: { label: "Patients retained", value: "315" }
          },
          {
            stepNumber: 3,
            stepLabel: "REVENUE RECAPTURED",
            question: "What's that worth?",
            inputs: [
              { label: "Patients retained", value: "315" },
              { label: "Avg ED visit", value: "$600" }
            ],
            output: { label: "Annual value", value: "$189,000" }
          }
        ],
        caveat: "Some retained patients would have been admitted (~15%). Conservative model excludes admission revenue."
      },
      {
        id: "scribe-reduction",
        name: "Scribe Cost Reduction",
        description: "Convert labor cost to technology investment",
        whyItMatters: "Convert labor cost to technology investment",
        referenceValue: 337500,
        icon: Users,
        lane: "time",
        order: 2,
        theory: "Many EDs rely on scribes to handle documentation burden. Abridge can reduce scribe needs or eliminate them entirely—freeing up significant labor budget.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "CURRENT SCRIBE INVESTMENT",
            question: "What are you spending on scribes?",
            inputs: [
              { label: "Physicians × scribe FTE each", value: "25 × 0.5" },
              { label: "Cost per FTE", value: "$45,000/year" }
            ],
            output: { label: "Annual cost", value: "$562,500" }
          },
          {
            stepNumber: 2,
            stepLabel: "SCRIBE REDUCTION",
            question: "How many can Abridge replace?",
            inputs: [
              { label: "Current FTEs", value: "12.5" },
              { label: "Reduction rate", value: "60%" }
            ],
            output: { label: "FTEs reduced", value: "7.5" }
          },
          {
            stepNumber: 3,
            stepLabel: "COST SAVINGS",
            question: "What's the budget impact?",
            inputs: [
              { label: "FTEs reduced", value: "7.5" },
              { label: "Cost per FTE", value: "$45,000" }
            ],
            output: { label: "Annual savings", value: "$337,500" }
          }
        ],
        caveat: "Some organizations redeploy scribes rather than eliminate—still creates budget flexibility"
      },
      {
        id: "ed-retention",
        name: "Physician Retention",
        description: "Reduced ED burnout and turnover",
        whyItMatters: "The long game—ED burnout is severe",
        referenceValue: 240000,
        icon: UserCheck,
        lane: "time",
        order: 3,
        theory: "ED physicians face extreme burnout—over 40% report symptoms. Documentation burden extends shifts and destroys work-life balance. Reducing this burden improves retention.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "BASELINE TURNOVER",
            question: "What's the current turnover situation?",
            inputs: [
              { label: "ED physicians", value: "25" },
              { label: "Annual turnover", value: "8%" }
            ],
            output: { label: "Departures/year", value: "2.0" }
          },
          {
            stepNumber: 2,
            stepLabel: "BURNOUT-RELATED",
            question: "How much is burnout-driven?",
            inputs: [
              { label: "Annual departures", value: "2.0" },
              { label: "Burnout-related", value: "50%" }
            ],
            output: { label: "Preventable", value: "1.0" }
          },
          {
            stepNumber: 3,
            stepLabel: "ABRIDGE ATTRIBUTION",
            question: "What can Abridge prevent?",
            inputs: [
              { label: "Preventable", value: "1.0" },
              { label: "Attribution", value: "30%" }
            ],
            output: { label: "Departures avoided", value: "0.30" }
          },
          {
            stepNumber: 4,
            stepLabel: "COST SAVINGS",
            question: "What's the dollar value?",
            inputs: [
              { label: "Departures avoided", value: "0.30" },
              { label: "Replacement cost", value: "$800,000" }
            ],
            output: { label: "Annual savings", value: "$240,000" }
          }
        ],
        caveat: "ED physician replacement costs $750K-1.2M. Retention impact measurable after 12-18 months."
      },
      {
        id: "ed-los",
        name: "Level-of-Service Accuracy",
        description: "Capture true acuity in wRVUs",
        whyItMatters: "Capture the complexity you're already delivering",
        referenceValue: 204120,
        icon: TrendingUp,
        lane: "quality",
        order: 1,
        theory: "ED visits involve complex medical decision-making, but under time pressure, documentation often doesn't capture the full MDM picture. Abridge ensures appropriate E/M levels are supported.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "E/M ENCOUNTERS",
            question: "How many encounters are billable E/M?",
            inputs: [
              { label: "Documented encounters", value: "31,500" },
              { label: "E/M percentage", value: "90%" }
            ],
            output: { label: "E/M encounters", value: "28,350" }
          },
          {
            stepNumber: 2,
            stepLabel: "UNDER-CODED VISITS",
            question: "How many are coded below actual complexity?",
            inputs: [
              { label: "E/M encounters", value: "28,350" },
              { label: "Under-coded rate", value: "12%" }
            ],
            output: { label: "Affected visits", value: "3,402" }
          },
          {
            stepNumber: 3,
            stepLabel: "wRVU LIFT",
            question: "What's the revenue impact?",
            inputs: [
              { label: "Affected visits × wRVU delta", value: "3,402 × 1.2" },
              { label: "$/wRVU", value: "$50" }
            ],
            output: { label: "Annual value", value: "$204,120" }
          }
        ]
      },
      {
        id: "ed-denials",
        name: "Documentation-Related Denials",
        description: "ED claims face heavy scrutiny—better notes win",
        whyItMatters: "ED claims face heavy scrutiny—better notes win",
        referenceValue: 368550,
        icon: FileX,
        lane: "quality",
        order: 2,
        theory: "ED claims face intense payer scrutiny. Medical necessity, level of service, and procedure documentation are common denial triggers. Complete, real-time documentation reduces these denials.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "ED DENIAL VOLUME",
            question: "How many claims are denied?",
            inputs: [
              { label: "Documented encounters", value: "31,500" },
              { label: "Denial rate", value: "10%" }
            ],
            output: { label: "Annual denials", value: "3,150" }
          },
          {
            stepNumber: 2,
            stepLabel: "DOCUMENTATION-RELATED",
            question: "How many are doc-related?",
            inputs: [
              { label: "Total denials", value: "3,150" },
              { label: "Doc-related", value: "40%" }
            ],
            output: { label: "Doc denials", value: "1,260" }
          },
          {
            stepNumber: 3,
            stepLabel: "DENIALS PREVENTED",
            question: "How many can better documentation prevent?",
            inputs: [
              { label: "Doc denials", value: "1,260" },
              { label: "Improvement", value: "45%" }
            ],
            output: { label: "Prevented", value: "567" }
          },
          {
            stepNumber: 4,
            stepLabel: "VALUE RECOVERED",
            question: "What's the revenue impact?",
            inputs: [
              { label: "Prevented", value: "567" },
              { label: "Avg claim", value: "$650" }
            ],
            output: { label: "Annual value", value: "$368,550" }
          }
        ]
      }
    ]
  },
  nursing: {
    name: "Nursing",
    icon: HeartPulse,
    subtitle: "Bedside documentation, care coordination",
    insightText: {
      main: "Nurses spend up to 35% of their shift on documentation—time that could be at the bedside. Ambient AI captures care activities in real-time, returning hours to where they matter most:",
      highlight: "PATIENT CARE",
      followup: "Plus, real-time documentation reduces end-of-shift overtime and improves note completeness."
    },
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
        id: "nursing-overtime",
        name: "Overtime Reduction",
        description: "Eliminate end-of-shift charting overtime",
        whyItMatters: "The quick win—immediate payroll savings",
        referenceValue: 162000,
        icon: DollarSign,
        lane: "time",
        order: 1,
        theory: "End-of-shift documentation frequently pushes nurses into overtime. Real-time documentation eliminates this burden, reducing premium labor costs.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "BASELINE OVERTIME",
            question: "How much overtime exists today?",
            inputs: [
              { label: "Nurses", value: "150" },
              { label: "OT hrs/week × weeks", value: "3 × 52" }
            ],
            output: { label: "Annual OT hrs", value: "23,400" }
          },
          {
            stepNumber: 2,
            stepLabel: "REDUCTION",
            question: "How much can Abridge reduce?",
            inputs: [
              { label: "OT hours", value: "23,400" },
              { label: "Reduction rate", value: "30%" }
            ],
            output: { label: "Hours eliminated", value: "7,020" }
          },
          {
            stepNumber: 3,
            stepLabel: "COST SAVINGS",
            question: "What's the dollar value?",
            inputs: [
              { label: "Hours eliminated", value: "7,020" },
              { label: "OT premium", value: "$23/hr" }
            ],
            output: { label: "Annual savings", value: "$162,000" }
          }
        ]
      },
      {
        id: "doc-time-savings",
        name: "Documentation Time Savings",
        description: "Hours returned to direct patient care",
        whyItMatters: "More time at the bedside—where care happens",
        referenceValue: 486000,
        icon: Timer,
        lane: "time",
        order: 2,
        theory: "Nurses spend up to 35% of their shift on documentation. Ambient AI captures care activities in real-time, returning hours to the bedside where they improve patient outcomes and satisfaction.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "DOCUMENTATION EVENTS",
            question: "How many documentation events happen?",
            inputs: [
              { label: "Annual events", value: "108,000" }
            ],
            output: { label: "Total events", value: "108,000" }
          },
          {
            stepNumber: 2,
            stepLabel: "TIME SAVINGS",
            question: "How much time does Abridge give back?",
            inputs: [
              { label: "Events", value: "108,000" },
              { label: "Time saved", value: "2.5 min" }
            ],
            output: { label: "Hours returned", value: "4,500 hrs" }
          },
          {
            stepNumber: 3,
            stepLabel: "DIRECT VALUE",
            question: "What's the direct labor value?",
            inputs: [
              { label: "Hours returned", value: "4,500" },
              { label: "Hourly rate", value: "$45" }
            ],
            output: { label: "Direct value", value: "$202,500" }
          },
          {
            stepNumber: 4,
            stepLabel: "PRODUCTIVITY MULTIPLIER",
            question: "What's the total productivity impact?",
            inputs: [
              { label: "Direct value", value: "$202,500" },
              { label: "Multiplier", value: "2.4x" }
            ],
            output: { label: "Annual value", value: "$486,000" }
          }
        ]
      },
      {
        id: "nurse-retention",
        name: "Nurse Retention",
        description: "Reduced burnout and turnover",
        whyItMatters: "The long game—12+ months to see full impact",
        referenceValue: 270000,
        icon: UserCheck,
        lane: "time",
        order: 3,
        theory: "Documentation burden is a top driver of nursing burnout and turnover. With replacement costs of $50K-80K per nurse, even modest retention improvements create significant value.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "CURRENT TURNOVER",
            question: "What's the current turnover situation?",
            inputs: [
              { label: "Nurses", value: "150" },
              { label: "Turnover rate", value: "18%" }
            ],
            output: { label: "Annual departures", value: "27" }
          },
          {
            stepNumber: 2,
            stepLabel: "RETENTION IMPACT",
            question: "How many can Abridge help retain?",
            inputs: [
              { label: "Departures", value: "27" },
              { label: "Improvement", value: "15%" }
            ],
            output: { label: "Nurses retained", value: "4" }
          },
          {
            stepNumber: 3,
            stepLabel: "REPLACEMENT SAVINGS",
            question: "What's the dollar value?",
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
        whyItMatters: "Real-time notes support better clinical decisions",
        referenceValue: 108000,
        icon: ClipboardCheck,
        lane: "quality",
        order: 1,
        theory: "Delayed documentation leads to errors and omissions. Real-time capture ensures accuracy and supports clinical decision-making during the care episode.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "DOCUMENTED EVENTS",
            question: "How many events are documented?",
            inputs: [
              { label: "Annual events", value: "108,000" }
            ],
            output: { label: "Total", value: "108,000" }
          },
          {
            stepNumber: 2,
            stepLabel: "TIMELINESS IMPROVEMENT",
            question: "How much faster is real-time capture?",
            inputs: [
              { label: "Current lag", value: "4+ hours" },
              { label: "New lag", value: "<15 min" }
            ],
            output: { label: "Improvement", value: "95%" }
          },
          {
            stepNumber: 3,
            stepLabel: "ERROR REDUCTION VALUE",
            question: "What's the value of fewer errors?",
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
        whyItMatters: "Complete notes mean better compliance",
        referenceValue: 135000,
        icon: FileText,
        lane: "quality",
        order: 2,
        theory: "Rushed documentation often misses required fields, leading to compliance issues and downstream problems. AI ensures comprehensive capture of all care activities.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "DOCUMENTATION EVENTS",
            question: "How many events need documentation?",
            inputs: [
              { label: "Annual events", value: "108,000" }
            ],
            output: { label: "Total", value: "108,000" }
          },
          {
            stepNumber: 2,
            stepLabel: "COMPLETENESS IMPROVEMENT",
            question: "How much more complete are AI notes?",
            inputs: [
              { label: "Events", value: "108,000" },
              { label: "Improvement rate", value: "5%" }
            ],
            output: { label: "Improved events", value: "5,400" }
          },
          {
            stepNumber: 3,
            stepLabel: "COMPLIANCE VALUE",
            question: "What's the compliance value?",
            inputs: [
              { label: "Improved events", value: "5,400" },
              { label: "Value per event", value: "$25" }
            ],
            output: { label: "Annual value", value: "$135,000" }
          }
        ]
      }
    ]
  },
  inpatient: {
    name: "Inpatient",
    icon: Building2,
    subtitle: "Hospital admissions, rounding",
    insightText: {
      main: "Inpatient ROI works differently. Hospitalists don't see MORE patients when they document faster—the census is driven by admissions, not rounding speed. But the value is real: physicians get their lives back (protecting your workforce), and documentation quality drives revenue integrity (protecting your reimbursement). Two value streams.",
      highlight: "DIFFERENT",
      followup: "Different from outpatient. Here's how the math works."
    },
    referenceScenario: {
      providers: 20,
      providerLabel: "hospitalists",
      annualVisits: 8000,
      visitLabel: "admissions/year",
      adoption: 65,
      eligibleEncounters: 5200,
      description: "We'll walk through the math using a typical hospitalist program as an example:"
    },
    timeSavedSubtitle: "Hospitalists spend 2+ hours daily on documentation—often after hours or at home",
    docQualitySubtitle: "Inpatient documentation directly drives DRG assignment and CC/MCC capture",
    drivers: [
      {
        id: "rounding-efficiency",
        name: "Rounding Efficiency & Time Savings",
        description: "Give hospitalists their time back",
        whyItMatters: "Give hospitalists their time back",
        referenceValue: 243750,
        icon: Timer,
        lane: "time",
        order: 1,
        theory: "Hospitalists spend 2+ hours per day on documentation—much of it after rounds or at home. Abridge captures notes in real-time at the bedside, returning that time to patient care, teaching, discharge planning, or personal life.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "DOCUMENTATION BURDEN",
            question: "How much time is spent documenting?",
            inputs: [
              { label: "Hospitalists × hrs/day × days", value: "20 × 2.5 × 250" }
            ],
            output: { label: "Annual doc hours", value: "12,500 hrs" }
          },
          {
            stepNumber: 2,
            stepLabel: "TIME RETURNED",
            question: "How much can Abridge give back?",
            inputs: [
              { label: "Doc hours", value: "12,500" },
              { label: "Reduction × adoption", value: "40% × 65%" }
            ],
            output: { label: "Hours returned", value: "3,250 hrs" }
          },
          {
            stepNumber: 3,
            stepLabel: "VALUE OF TIME",
            question: "What's that time worth?",
            inputs: [
              { label: "Hours returned", value: "3,250" },
              { label: "Opportunity cost", value: "$75/hr" }
            ],
            output: { label: "Annual value", value: "$243,750" }
          }
        ],
        caveat: "This is 'time value'—it doesn't directly generate revenue, but it affects retention, quality of life, and capacity for complex cases."
      },
      {
        id: "hospitalist-retention",
        name: "Hospitalist Retention",
        description: "Address the #1 driver of hospitalist turnover",
        whyItMatters: "Address the #1 driver of hospitalist turnover",
        referenceValue: 160000,
        icon: UserCheck,
        lane: "time",
        order: 2,
        theory: "Hospitalist programs face a retention crisis—turnover rates of 15-20% are common. Documentation burden is the #1 cited frustration. Replacing a hospitalist costs $400-600K.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "BASELINE TURNOVER",
            question: "What's the current situation?",
            inputs: [
              { label: "Hospitalists", value: "20" },
              { label: "Turnover rate", value: "15%" }
            ],
            output: { label: "Departures/year", value: "3.0" }
          },
          {
            stepNumber: 2,
            stepLabel: "BURNOUT-RELATED",
            question: "How much is burnout-driven?",
            inputs: [
              { label: "Departures", value: "3.0" },
              { label: "Burnout-related", value: "60%" }
            ],
            output: { label: "Preventable", value: "1.8" }
          },
          {
            stepNumber: 3,
            stepLabel: "DOCUMENTATION ATTRIBUTION",
            question: "How much is documentation's fault?",
            inputs: [
              { label: "Preventable", value: "1.8" },
              { label: "Doc-driven", value: "35%" }
            ],
            output: { label: "Doc-related departures", value: "0.63" }
          },
          {
            stepNumber: 4,
            stepLabel: "ABRIDGE IMPACT",
            question: "What can Abridge prevent?",
            inputs: [
              { label: "Doc-related", value: "0.63" },
              { label: "Prevention rate", value: "50%" }
            ],
            output: { label: "Departures avoided", value: "0.32" }
          },
          {
            stepNumber: 5,
            stepLabel: "COST SAVINGS",
            question: "What's the dollar value?",
            inputs: [
              { label: "Departures avoided", value: "0.32" },
              { label: "Replacement cost", value: "$500,000" }
            ],
            output: { label: "Annual savings", value: "$160,000" }
          }
        ],
        caveat: "Hospitalist turnover is significantly higher than other specialties. Retention impact measurable after 12-18 months."
      },
      {
        id: "cc-mcc-capture",
        name: "CC/MCC Capture (DRG Optimization)",
        description: "Document the complexity you're managing",
        whyItMatters: "Document the complexity you're managing",
        referenceValue: 374400,
        icon: TrendingUp,
        lane: "quality",
        order: 1,
        theory: "DRG reimbursement depends on documented comorbidities. Conditions discussed at bedside but not captured in notes mean missed CC/MCC assignments and lower DRG weights. Abridge ensures what's discussed gets documented.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "ADMISSIONS WITH OPPORTUNITY",
            question: "How many admissions have documentation gaps?",
            inputs: [
              { label: "Documented admissions", value: "5,200" },
              { label: "With gaps", value: "40%" }
            ],
            output: { label: "Opportunities", value: "2,080" }
          },
          {
            stepNumber: 2,
            stepLabel: "CAPTURE IMPROVEMENT",
            question: "How much can Abridge help?",
            inputs: [
              { label: "Opportunities", value: "2,080" },
              { label: "Improvement rate", value: "15%" }
            ],
            output: { label: "Admissions improved", value: "312" }
          },
          {
            stepNumber: 3,
            stepLabel: "DRG WEIGHT IMPACT",
            question: "What's the revenue impact?",
            inputs: [
              { label: "Admissions × weight × base", value: "312 × 0.4 × $6,000" }
            ],
            output: { label: "Gross impact", value: "$748,800" }
          },
          {
            stepNumber: 4,
            stepLabel: "REALITY CHECK",
            question: "What passes audit?",
            inputs: [
              { label: "Gross impact", value: "$748,800" },
              { label: "Realization rate", value: "50%" }
            ],
            output: { label: "Annual value", value: "$374,400" }
          }
        ],
        caveat: "Work with your CDI team to validate capture rates for your specific case mix."
      },
      {
        id: "cdi-query-reduction",
        name: "CDI Query Reduction",
        description: "Better initial documentation = less rework",
        whyItMatters: "Better initial documentation = less rework",
        referenceValue: 30000,
        icon: ClipboardCheck,
        lane: "quality",
        order: 2,
        theory: "CDI teams spend enormous effort querying physicians for clarification. Better initial documentation reduces query volume—saving CDI time and reducing physician interruptions.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "CURRENT QUERY VOLUME",
            question: "How many queries happen today?",
            inputs: [
              { label: "Admissions", value: "8,000" },
              { label: "Query rate", value: "30%" }
            ],
            output: { label: "Queries/year", value: "2,400" }
          },
          {
            stepNumber: 2,
            stepLabel: "QUERIES AVOIDED",
            question: "How many can better documentation prevent?",
            inputs: [
              { label: "Queries", value: "2,400" },
              { label: "Reduction rate", value: "25%" }
            ],
            output: { label: "Queries avoided", value: "600" }
          },
          {
            stepNumber: 3,
            stepLabel: "VALUE",
            question: "What's the operational savings?",
            inputs: [
              { label: "Queries avoided", value: "600" },
              { label: "Cost per query", value: "$50" }
            ],
            output: { label: "Annual savings", value: "$30,000" }
          }
        ],
        caveat: "Additional benefit: Faster DRG finalization → faster billing cycles"
      },
      {
        id: "inpatient-denials",
        name: "Documentation-Related Denials",
        description: "Protect your reimbursement",
        whyItMatters: "Protect your reimbursement",
        referenceValue: 268800,
        icon: FileX,
        lane: "quality",
        order: 3,
        theory: "Inpatient claims face rigorous payer review. Medical necessity, level of care, and clinical indicators must be clearly documented. Incomplete notes lead to costly denials and appeals.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "DENIAL VOLUME",
            question: "How many claims are denied?",
            inputs: [
              { label: "Admissions", value: "8,000" },
              { label: "Denial rate", value: "5%" }
            ],
            output: { label: "Annual denials", value: "400" }
          },
          {
            stepNumber: 2,
            stepLabel: "DOCUMENTATION-RELATED",
            question: "How many are doc-related?",
            inputs: [
              { label: "Denials", value: "400" },
              { label: "Doc-related", value: "35%" }
            ],
            output: { label: "Doc denials", value: "140" }
          },
          {
            stepNumber: 3,
            stepLabel: "PREVENTION",
            question: "How many can better documentation prevent?",
            inputs: [
              { label: "Doc denials", value: "140" },
              { label: "Prevention rate", value: "40%" }
            ],
            output: { label: "Denials prevented", value: "56" }
          },
          {
            stepNumber: 4,
            stepLabel: "VALUE",
            question: "What's the revenue impact?",
            inputs: [
              { label: "Prevented", value: "56" },
              { label: "Avg claim", value: "$12,000" }
            ],
            output: { label: "Gross value", value: "$672,000" }
          },
          {
            stepNumber: 5,
            stepLabel: "CONSERVATIVE ADJUSTMENT",
            question: "What's the permanent save rate?",
            inputs: [
              { label: "Gross value", value: "$672,000" },
              { label: "Permanent rate", value: "40%" }
            ],
            output: { label: "Annual value", value: "$268,800" }
          }
        ],
        caveat: "Many denials are eventually overturned on appeal—this counts only permanent saves."
      }
    ]
  }
};

function CalculationStepCard({ step, isLast }: { step: CalculationStep; isLast: boolean }) {
  return (
    <div className="relative">
      <div className="bg-[#F8F9FA] rounded-lg p-5 animate-in fade-in duration-300">
        <div className="mb-4">
          <div className="text-xs font-bold text-[#6B7280] tracking-wide mb-1">
            STEP {step.stepNumber}: {step.stepLabel}
          </div>
          <div className="text-sm text-[#6B7280] italic">{step.question}</div>
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
            <p className="text-sm text-[#6B7280]">{driver.whyItMatters}</p>
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
  const timeDrivers = config?.drivers.filter(d => d.lane === "time").sort((a, b) => a.order - b.order) || [];
  const qualityDrivers = config?.drivers.filter(d => d.lane === "quality").sort((a, b) => a.order - b.order) || [];
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
              
              <button
                onClick={() => handleSettingSelect("inpatient")}
                className={`p-5 rounded-xl border-2 text-left transition-all ${
                  selectedSetting === "inpatient"
                    ? "border-[#E85D3F] bg-[#FEF2F0]"
                    : "border-neutral-200 bg-white hover-elevate"
                }`}
                data-testid="card-inpatient"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                  selectedSetting === "inpatient" ? "bg-[#E85D3F]" : "bg-[#FEF2F0]"
                }`}>
                  <Building2 className={`w-5 h-5 ${selectedSetting === "inpatient" ? "text-white" : "text-[#E85D3F]"}`} />
                </div>
                <h3 className="font-semibold text-[#111827] mb-1">Inpatient</h3>
                <p className="text-sm text-[#6B7280]">Hospital admissions, rounding</p>
              </button>
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
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#111827] tracking-tight mb-2">
            The ROI Framework for {config?.name}
          </h1>
          <p className="text-[#6B7280]">Understanding where value actually comes from</p>
        </div>

        {/* THE INSIGHT - Framing Statement */}
        <div className="bg-[#F8F9FA] border-l-4 border-[#E85D3F] rounded-r-lg p-5 mb-8" data-testid="insight-callout">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-[#E85D3F]" />
            <span className="text-xs font-bold text-[#111827] tracking-wide">THE INSIGHT</span>
          </div>
          <p className="text-[#111827] mb-3">
            {config?.insightText.main} <span className="font-semibold">{config?.insightText.highlight}</span> {config?.insightText.followup}
          </p>
          <p className="text-[#6B7280] text-sm">
            Two value streams. One technology. Here's how the math works.
          </p>
        </div>

        {/* Visual Framework - Now ABOVE Reference Scenario */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => document.getElementById('time-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="p-6 bg-white border border-[#E5E7EB] rounded-xl text-left hover-elevate"
            data-testid="framework-time-card"
          >
            <Clock className="w-8 h-8 text-[#E85D3F] mb-3" />
            <h3 className="font-bold text-[#111827] text-lg mb-2">Time Saved</h3>
            <p className="text-sm text-[#6B7280] mb-4">
              When clinicians document faster, that time can be redirected to care or recovered as cost savings.
            </p>
            <ul className="text-sm text-[#6B7280] space-y-1">
              {timeDrivers.map(d => (
                <li key={d.id} className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-[#6B7280]"></span>
                  {d.name}
                </li>
              ))}
            </ul>
          </button>
          
          <button
            onClick={() => document.getElementById('quality-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="p-6 bg-white border border-[#E5E7EB] rounded-xl text-left hover-elevate"
            data-testid="framework-quality-card"
          >
            <FileText className="w-8 h-8 text-[#E85D3F] mb-3" />
            <h3 className="font-bold text-[#111827] text-lg mb-2">Doc Quality</h3>
            <p className="text-sm text-[#6B7280] mb-4">
              AI captures more complete information than rushed manual documentation. Better notes drive downstream revenue.
            </p>
            <ul className="text-sm text-[#6B7280] space-y-1">
              {qualityDrivers.map(d => (
                <li key={d.id} className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-[#6B7280]"></span>
                  {d.name}
                </li>
              ))}
            </ul>
          </button>
        </div>

        {/* Reference Scenario Card */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 mb-10" data-testid="reference-scenario-card">
          <h3 className="text-sm font-bold text-[#111827] tracking-wide mb-4">REFERENCE SCENARIO</h3>
          
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
          
          <div className="border-t border-neutral-200 pt-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#6B7280]">→</span>
              <span className="text-lg font-bold text-[#E85D3F]">~{config?.referenceScenario.eligibleEncounters.toLocaleString()}</span>
              <span className="text-[#111827]">Abridge-documented encounters/year</span>
            </div>
            <p className="text-sm text-[#6B7280] mt-2">
              This is your multiplier. Everything below builds from this.
            </p>
          </div>
        </div>

        {/* Time Saved Section */}
        <div className="mb-10" id="time-section">
          <div className="border-t border-neutral-200 pt-6 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#E85D3F]" />
              <span className="font-bold text-[#111827]">Time Saved Benefits</span>
            </div>
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

        {/* Documentation Quality Section */}
        <div className="mb-10" id="quality-section">
          <div className="border-t border-neutral-200 pt-6 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#E85D3F]" />
              <span className="font-bold text-[#111827]">Documentation Quality Benefits</span>
            </div>
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

        {/* Combined Reference Value Summary - Itemized */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 mb-10 shadow-sm" data-testid="value-summary-card">
          <h3 className="text-sm font-bold text-[#111827] tracking-wide mb-6">COMBINED REFERENCE VALUE</h3>
          
          <div className="space-y-6">
            {/* Time Saved Breakdown */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-[#E85D3F]" />
                <span className="text-sm font-semibold text-[#111827]">Time Saved Benefits</span>
              </div>
              <div className="space-y-2 pl-6">
                {timeDrivers.map(d => (
                  <div key={d.id} className="flex justify-between items-center">
                    <span className="text-sm text-[#6B7280]">{d.name}</span>
                    <span className="font-mono text-sm text-[#111827]">${d.referenceValue.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center border-t border-neutral-100 pt-2 mt-2">
                  <span className="text-sm font-medium text-[#111827]">Subtotal</span>
                  <span className="font-mono font-semibold text-[#111827]">
                    ${timeDrivers.reduce((sum, d) => sum + d.referenceValue, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Quality Breakdown */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-[#E85D3F]" />
                <span className="text-sm font-semibold text-[#111827]">Documentation Quality Benefits</span>
              </div>
              <div className="space-y-2 pl-6">
                {qualityDrivers.map(d => (
                  <div key={d.id} className="flex justify-between items-center">
                    <span className="text-sm text-[#6B7280]">{d.name}</span>
                    <span className="font-mono text-sm text-[#111827]">${d.referenceValue.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center border-t border-neutral-100 pt-2 mt-2">
                  <span className="text-sm font-medium text-[#111827]">Subtotal</span>
                  <span className="font-mono font-semibold text-[#111827]">
                    ${qualityDrivers.reduce((sum, d) => sum + d.referenceValue, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Total */}
            <div className="border-t-2 border-neutral-200 pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-[#111827]">TOTAL POTENTIAL VALUE</span>
                <span className="font-mono font-bold text-[#E85D3F] text-2xl">
                  ${(timeDrivers.reduce((sum, d) => sum + d.referenceValue, 0) + qualityDrivers.reduce((sum, d) => sum + d.referenceValue, 0)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-[#6B7280]">
                <span>For {config?.referenceScenario.providers} {config?.referenceScenario.providerLabel} at {config?.referenceScenario.adoption}% adoption</span>
                <span className="font-mono">
                  ~${Math.round((timeDrivers.reduce((sum, d) => sum + d.referenceValue, 0) + qualityDrivers.reduce((sum, d) => sum + d.referenceValue, 0)) / (config?.referenceScenario.providers || 1)).toLocaleString()} per provider/year
                </span>
              </div>
            </div>
          </div>
        </div>

        {showBridge && (
          <div className="bg-white border border-neutral-200 rounded-2xl p-8 md:p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-sm">
            <p className="text-lg text-[#111827] mb-4">
              You've seen the framework.
            </p>
            
            <p className="text-[#6B7280] mb-4 max-w-xl mx-auto">
              The reference scenario showed potential value of <span className="font-semibold text-[#E85D3F]">${(timeDrivers.reduce((sum, d) => sum + d.referenceValue, 0) + qualityDrivers.reduce((sum, d) => sum + d.referenceValue, 0)).toLocaleString()}</span> for a {config?.referenceScenario.providers}-{config?.referenceScenario.providerLabel === "physicians" ? "physician ED" : config?.referenceScenario.providerLabel === "nurses" ? "nurse unit" : config?.referenceScenario.providerLabel === "hospitalists" ? "hospitalist program" : "provider practice"}. But your {selectedSetting === "inpatient" ? "program" : "organization"} is different.
            </p>
            
            <p className="text-[#6B7280] mb-8">
              {selectedSetting === "ed" 
                ? "Different physician count. Different LWBS rates. Different scribe situation."
                : selectedSetting === "nursing"
                ? "Different nurse count. Different documentation workflows. Different overtime patterns."
                : selectedSetting === "inpatient"
                ? "Different hospitalist count. Different turnover rates. Different case mix."
                : "Different provider count. Different volumes. Different payer mix."}
            </p>
            
            <p className="text-[#111827] font-semibold mb-6">
              Ready to see what Abridge could mean for YOUR {selectedSetting === "ed" ? "ED" : selectedSetting === "nursing" ? "unit" : selectedSetting === "inpatient" ? "inpatient program" : "practice"}?
            </p>
            
            <div className="flex flex-col items-center gap-4">
              <Button
                onClick={handleStartCalculator}
                size="lg"
                className="bg-[#E85D3F] border-[#E85D3F] text-white font-semibold px-8"
                data-testid="button-build-roi"
              >
                Build My ROI Model
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="ghost"
                onClick={handleBackToSelection}
                className="text-[#6B7280]"
                data-testid="button-explore-more"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Or explore another care setting
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
