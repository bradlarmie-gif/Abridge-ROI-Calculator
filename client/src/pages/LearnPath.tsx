import React, { useState, useMemo, useCallback } from "react";
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
  BarChart2,
  Target,
  Search,
  Shield,
  Sparkles,
  Layers
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { GlobalHeader } from "@/components/GlobalHeader";

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

interface InteractiveInput {
  id: string;
  label: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  format?: "currency" | "percent" | "number" | "minutes";
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
  // Rich content sections
  theProblem?: string;
  whyDefensible?: string[];
  theSignal?: string[];
  interactiveInputs?: InteractiveInput[];
  calculateValue?: (inputs: Record<string, number>) => number;
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
        theProblem: "Physicians routinely stay 1-2 hours past their scheduled day to finish documentation. This isn't just a morale issue—it's a direct cost. Overtime triggers premium pay (1.5x), and when physicians burn out or leave, locum coverage costs $275-400/hour. The documentation burden creates a compounding financial drain that most organizations accept as 'the cost of doing business.'",
        whyDefensible: [
          "Payroll data shows overtime hours before and after implementation",
          "Time-tracking systems capture documentation time directly",
          "Locum invoices provide clear cost benchmarks",
          "Industry data: 60% of physicians report staying late for documentation (MGMA)"
        ],
        theSignal: [
          "Your organization regularly uses locum tenens to maintain access",
          "Payroll shows consistent overtime among clinical staff",
          "Physicians report 'pajama time' completing notes at home",
          "Exit interviews cite documentation burden as a factor"
        ],
        theory: "Documentation often extends past scheduled hours, triggering overtime pay. By returning time to clinicians, organizations reduce the need for after-hours work and expensive locum coverage to maintain access.",
        interactiveInputs: [
          { id: "providers", label: "Providers", defaultValue: 40, min: 10, max: 200, step: 5, unit: "", format: "number" },
          { id: "otPercent", label: "% with overtime", defaultValue: 60, min: 20, max: 100, step: 5, unit: "%", format: "percent" },
          { id: "hoursPerWeek", label: "OT hours/week", defaultValue: 4, min: 1, max: 10, step: 1, unit: "hrs", format: "number" },
          { id: "reductionRate", label: "Reduction rate", defaultValue: 70, min: 30, max: 90, step: 5, unit: "%", format: "percent" }
        ],
        calculateValue: (inputs: Record<string, number>) => {
          const providersWithOT = inputs.providers * (inputs.otPercent / 100);
          const annualOTHours = providersWithOT * inputs.hoursPerWeek * 50;
          const hoursSaved = annualOTHours * (inputs.reductionRate / 100);
          const premiumHours = hoursSaved * 0.3;
          return Math.round(premiumHours * 150);
        },
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
        theProblem: "Most healthcare organizations face the same paradox: patients can't get appointments, but providers feel overworked. The bottleneck isn't clinical skill—it's the invisible tax of documentation. Every minute spent on notes is a minute not spent with patients. When you return that time, you create capacity that didn't exist before.",
        whyDefensible: [
          "Visit volume is tracked in your practice management system",
          "Wait times for new patient appointments are measurable",
          "Revenue per visit is known from billing data",
          "Time savings are measurable through EHR timestamps"
        ],
        theSignal: [
          "New patient wait times exceed 2-3 weeks",
          "Referrals are being sent elsewhere due to capacity",
          "Physicians are turning away same-day requests",
          "Revenue targets are limited by visit volume, not payer mix"
        ],
        theory: "When clinicians spend less time on documentation, they have capacity to see additional patients. Not all saved time converts to visits—scheduling, room availability, and other factors limit realization—but even a modest portion creates meaningful revenue.",
        interactiveInputs: [
          { id: "timeSaved", label: "Time saved/encounter", defaultValue: 2.5, min: 1, max: 5, step: 0.5, unit: "min", format: "minutes" },
          { id: "encounters", label: "Annual encounters", defaultValue: 52000, min: 10000, max: 150000, step: 5000, unit: "", format: "number" },
          { id: "realization", label: "Realization rate", defaultValue: 20, min: 10, max: 40, step: 5, unit: "%", format: "percent" },
          { id: "revenuePerVisit", label: "Revenue per visit", defaultValue: 200, min: 100, max: 400, step: 25, unit: "$", format: "currency" }
        ],
        calculateValue: (inputs: Record<string, number>) => {
          const hoursReturned = (inputs.timeSaved * inputs.encounters) / 60;
          const usableHours = hoursReturned * (inputs.realization / 100);
          const additionalVisits = usableHours * 2; // 30 min per visit
          return Math.round(additionalVisits * inputs.revenuePerVisit);
        },
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
        theProblem: "Physician turnover is one of the most expensive problems in healthcare. When a physician leaves, you lose 3-6 months of productivity during recruitment, pay signing bonuses, and endure months of ramp-up. Meanwhile, the remaining physicians absorb extra workload, accelerating their own burnout. It's a spiral—and documentation burden is at the center of it.",
        whyDefensible: [
          "HR tracks turnover rates and replacement costs",
          "Exit interviews frequently cite administrative burden",
          "Industry benchmarks: physician replacement costs $500K-$1M (MGMA, AAFP)",
          "Burnout surveys show documentation as top driver (Medscape)"
        ],
        theSignal: [
          "Turnover rates exceed 5-6% annually",
          "Exit interviews mention documentation or work-life balance",
          "Engagement surveys show declining satisfaction",
          "Physicians are requesting reduced schedules"
        ],
        theory: "Documentation burden is the #1 driver of physician burnout. Reducing this burden improves satisfaction and retention. Replacing a physician costs $500K-1M when you factor in recruiting, onboarding, and lost revenue.",
        interactiveInputs: [
          { id: "providers", label: "Providers", defaultValue: 40, min: 10, max: 200, step: 5, unit: "", format: "number" },
          { id: "turnoverRate", label: "Turnover rate", defaultValue: 6, min: 2, max: 15, step: 1, unit: "%", format: "percent" },
          { id: "burnoutAttribution", label: "Burnout attribution", defaultValue: 45, min: 20, max: 70, step: 5, unit: "%", format: "percent" },
          { id: "replacementCost", label: "Replacement cost", defaultValue: 500000, min: 300000, max: 1000000, step: 50000, unit: "$", format: "currency" }
        ],
        calculateValue: (inputs: Record<string, number>) => {
          const departures = inputs.providers * (inputs.turnoverRate / 100);
          const burnoutRelated = departures * (inputs.burnoutAttribution / 100);
          const prevented = burnoutRelated * 0.30; // 30% Abridge attribution
          return Math.round(prevented * inputs.replacementCost);
        },
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
      main: "Nursing ROI is different. Nurses don't bill—there's no wRVU capture or E/M coding to optimize. The value is purely about protecting your most expensive and scarce resource: your nursing workforce. Every hour returned to bedside care is real. Every overtime hour eliminated hits the budget directly. Every nurse you retain is $50K you don't spend on replacement. This isn't about revenue generation. It's about:",
      highlight: "COST PROTECTION",
      followup: "And workforce sustainability."
    },
    referenceScenario: {
      providers: 300,
      providerLabel: "nurses",
      annualVisits: 150000,
      visitLabel: "documentation events",
      adoption: 60,
      eligibleEncounters: 90000,
      description: "We'll walk through the math using a 300-nurse deployment as an example:"
    },
    timeSavedSubtitle: "Nurses spend 25-35% of their shift on documentation. Returning that time means less overtime, less burnout, and less reliance on expensive agency staff.",
    docQualitySubtitle: "Real-time documentation improves compliance and care continuity—important for regulatory readiness, but harder to monetize.",
    drivers: [
      {
        id: "nursing-overtime",
        name: "Overtime Reduction",
        description: "The most directly measurable impact",
        whyItMatters: "The quick win—immediate payroll savings",
        referenceValue: 656100,
        icon: DollarSign,
        lane: "time",
        order: 1,
        theory: "Nursing overtime is often driven by end-of-shift documentation catch-up. When charting happens in real-time throughout the shift, nurses leave on time. This is real budget savings you can measure in 30 days.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "CURRENT OVERTIME",
            question: "How much OT exists today?",
            inputs: [
              { label: "Nurses", value: "300" },
              { label: "OT hrs/week", value: "4" },
              { label: "Weeks/year", value: "50" }
            ],
            output: { label: "Annual OT hrs", value: "60,000" }
          },
          {
            stepNumber: 2,
            stepLabel: "DOCUMENTATION-DRIVEN OT",
            question: "How much is charting catch-up?",
            inputs: [
              { label: "Total OT hours", value: "60,000" },
              { label: "Doc-related", value: "45%" }
            ],
            output: { label: "Doc-driven OT", value: "27,000 hrs" }
          },
          {
            stepNumber: 3,
            stepLabel: "OT ELIMINATED",
            question: "How much can real-time documentation prevent?",
            inputs: [
              { label: "Doc-driven OT", value: "27,000" },
              { label: "Reduction rate", value: "60%" },
              { label: "Adoption", value: "60%" }
            ],
            output: { label: "Hours eliminated", value: "9,720" }
          },
          {
            stepNumber: 4,
            stepLabel: "COST SAVINGS",
            question: "What's the budget impact?",
            inputs: [
              { label: "Hours eliminated", value: "9,720" },
              { label: "OT rate", value: "$67.50/hr" }
            ],
            output: { label: "Annual savings", value: "$656,100" }
          }
        ],
        caveat: "This is DIRECT, MEASURABLE savings. Track it month-over-month."
      },
      {
        id: "doc-time-savings",
        name: "Documentation Time Savings",
        description: "Return hours to bedside care",
        whyItMatters: "More time at the bedside—where care happens",
        referenceValue: 531563,
        icon: Timer,
        lane: "time",
        order: 2,
        theory: "Nurses spend 25-35% of their shift on documentation—time taken away from patients. Ambient documentation into flowsheets captures assessments, vitals, and observations in real-time.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "DOCUMENTATION BURDEN",
            question: "How much time is spent charting?",
            inputs: [
              { label: "Nurses", value: "300" },
              { label: "Hrs/shift", value: "2.5" },
              { label: "Shifts/week", value: "3" },
              { label: "Weeks/year", value: "50" }
            ],
            output: { label: "Annual doc hours", value: "112,500" }
          },
          {
            stepNumber: 2,
            stepLabel: "TIME RETURNED",
            question: "How much can Abridge give back?",
            inputs: [
              { label: "Doc hours", value: "112,500" },
              { label: "Reduction", value: "35%" },
              { label: "Adoption", value: "60%" }
            ],
            output: { label: "Hours returned", value: "23,625" }
          },
          {
            stepNumber: 3,
            stepLabel: "VALUE OF TIME",
            question: "What's this worth?",
            inputs: [
              { label: "Hours returned", value: "23,625" },
              { label: "Hourly rate", value: "$45" },
              { label: "Realization", value: "50%" }
            ],
            output: { label: "Annual value", value: "$531,563" }
          }
        ],
        caveat: "This time doesn't disappear from payroll—but it DOES get redirected to bedside care, patient education, and discharge prep."
      },
      {
        id: "agency-reduction",
        name: "Agency & Travel Nurse Reduction",
        description: "Convert expensive agency spend to staff positions",
        whyItMatters: "Reduce premium labor costs",
        referenceValue: 292500,
        icon: Users,
        lane: "time",
        order: 3,
        theory: "When staff nurses burn out and leave, hospitals fill gaps with agency nurses at 3-4× the cost. Improving retention through reduced documentation burden directly impacts agency spend.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "CURRENT AGENCY UTILIZATION",
            question: "How much agency are you using?",
            inputs: [
              { label: "Nurses", value: "300" },
              { label: "Agency %", value: "15%" }
            ],
            output: { label: "Agency FTEs", value: "45" }
          },
          {
            stepNumber: 2,
            stepLabel: "AGENCY PREMIUM",
            question: "What's the cost difference?",
            inputs: [
              { label: "Staff salary", value: "$85,000/yr" },
              { label: "Agency cost", value: "$150,000/yr" }
            ],
            output: { label: "Premium per FTE", value: "$65,000" }
          },
          {
            stepNumber: 3,
            stepLabel: "AGENCY REDUCTION",
            question: "How much can better retention reduce agency needs?",
            inputs: [
              { label: "Agency FTEs", value: "45" },
              { label: "Reduction", value: "10%" }
            ],
            output: { label: "FTEs converted", value: "4.5" }
          },
          {
            stepNumber: 4,
            stepLabel: "COST SAVINGS",
            question: "What's the budget impact?",
            inputs: [
              { label: "FTEs converted", value: "4.5" },
              { label: "Premium", value: "$65,000" }
            ],
            output: { label: "Annual savings", value: "$292,500" }
          }
        ],
        caveat: "This is an indirect benefit—the logic chain is: better retention → less agency need → budget savings."
      },
      {
        id: "nurse-retention",
        name: "Nurse Retention",
        description: "Address the top driver of nursing burnout",
        whyItMatters: "The long game—12+ months to see full impact",
        referenceValue: 150000,
        icon: UserCheck,
        lane: "time",
        order: 4,
        theory: "Nursing turnover costs $40-60K per nurse. Documentation burden is consistently cited as a top driver of burnout. Reducing this burden improves job satisfaction and retention.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "BASELINE TURNOVER",
            question: "What's the current situation?",
            inputs: [
              { label: "Nurses", value: "300" },
              { label: "Turnover rate", value: "18%" }
            ],
            output: { label: "Annual departures", value: "54" }
          },
          {
            stepNumber: 2,
            stepLabel: "BURNOUT-RELATED",
            question: "How much is burnout-driven?",
            inputs: [
              { label: "Departures", value: "54" },
              { label: "Burnout factor", value: "55%" }
            ],
            output: { label: "Burnout departures", value: "29.7" }
          },
          {
            stepNumber: 3,
            stepLabel: "DOCUMENTATION ATTRIBUTION",
            question: "How much is documentation's fault?",
            inputs: [
              { label: "Burnout departures", value: "29.7" },
              { label: "Doc-related", value: "25%" }
            ],
            output: { label: "Doc-related departures", value: "7.4" }
          },
          {
            stepNumber: 4,
            stepLabel: "ABRIDGE IMPACT",
            question: "What can Abridge prevent?",
            inputs: [
              { label: "Doc-related", value: "7.4" },
              { label: "Prevention rate", value: "40%" }
            ],
            output: { label: "Departures avoided", value: "3.0" }
          },
          {
            stepNumber: 5,
            stepLabel: "COST SAVINGS",
            question: "What's the dollar value?",
            inputs: [
              { label: "Avoided", value: "3.0" },
              { label: "Replacement cost", value: "$50,000" }
            ],
            output: { label: "Annual savings", value: "$150,000" }
          }
        ],
        caveat: "Retention impact typically measurable after 12+ months."
      },
      {
        id: "doc-timeliness-completeness",
        name: "Documentation Timeliness & Completeness",
        description: "Regulatory readiness and care continuity",
        whyItMatters: "Compliance and risk management value",
        referenceValue: 50000,
        icon: ClipboardCheck,
        lane: "quality",
        order: 1,
        theory: "Regulatory requirements demand timely, complete documentation. Late or incomplete charting creates compliance risk. Real-time ambient documentation ensures assessments are captured when they happen—not reconstructed hours later.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "CURRENT GAPS",
            question: "What's the compliance situation?",
            inputs: [
              { label: "Late documentation (>2 hrs)", value: "~20% of charts" },
              { label: "Incomplete assessments", value: "~15% of fields" }
            ],
            output: { label: "Compliance gaps", value: "Significant" }
          },
          {
            stepNumber: 2,
            stepLabel: "IMPROVEMENT",
            question: "How much can real-time documentation help?",
            inputs: [
              { label: "Late docs", value: "20% → 5%" },
              { label: "Incomplete", value: "15% → 5%" }
            ],
            output: { label: "Improvement", value: "67-75%" }
          },
          {
            stepNumber: 3,
            stepLabel: "VALUE",
            question: "What's this worth?",
            inputs: [
              { label: "Reduced audit prep", value: "Yes" },
              { label: "Survey readiness", value: "Yes" },
              { label: "Legal exposure", value: "Reduced" }
            ],
            output: { label: "Operational value", value: "$50,000" }
          }
        ],
        caveat: "This is harder to quantify but real from a risk management and regulatory perspective."
      },
      {
        id: "hapi-prevention",
        name: "HAPI Prevention",
        description: "Better documentation supports skin integrity protocols",
        whyItMatters: "CMS penalties can exceed $100K per preventable injury",
        referenceValue: 75000,
        icon: ShieldCheck,
        lane: "quality",
        order: 2,
        theory: "Hospital-acquired pressure injuries (HAPIs) are largely preventable with proper turning protocols and documentation. Real-time documentation ensures skin assessments and repositioning are captured when they happen, supporting protocol compliance.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "CURRENT HAPI RATE",
            question: "What's the baseline situation?",
            inputs: [
              { label: "Patient days/year", value: "~100,000" },
              { label: "HAPI rate", value: "2.5%" }
            ],
            output: { label: "Annual HAPIs", value: "~25 events" }
          },
          {
            stepNumber: 2,
            stepLabel: "DOCUMENTATION IMPACT",
            question: "How many could better documentation help prevent?",
            inputs: [
              { label: "Current HAPIs", value: "25" },
              { label: "Doc-driven improvement", value: "15%" }
            ],
            output: { label: "Events prevented", value: "3-4" }
          },
          {
            stepNumber: 3,
            stepLabel: "COST AVOIDANCE",
            question: "What's the value of prevention?",
            inputs: [
              { label: "Events prevented", value: "3.75" },
              { label: "Cost per HAPI", value: "$20,000" }
            ],
            output: { label: "Annual savings", value: "$75,000" }
          }
        ],
        caveat: "The causal link between documentation and prevention is indirect but supported by quality improvement data. CMS penalties add additional financial exposure."
      },
      {
        id: "falls-prevention",
        name: "Falls Prevention",
        description: "Documentation supports fall risk protocols",
        whyItMatters: "Falls are the most common patient safety event in hospitals",
        referenceValue: 50000,
        icon: AlertTriangle,
        lane: "quality",
        order: 3,
        theory: "Fall prevention requires timely risk assessments and intervention documentation. When nurses document in real-time, fall risk status is current and visible to the care team, enabling proactive interventions.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "CURRENT FALL RATE",
            question: "What's the baseline situation?",
            inputs: [
              { label: "Patient days/year", value: "~100,000" },
              { label: "Falls per 1,000 days", value: "3.5" }
            ],
            output: { label: "Annual falls", value: "~350 events" }
          },
          {
            stepNumber: 2,
            stepLabel: "DOCUMENTATION IMPACT",
            question: "How many could timely documentation help prevent?",
            inputs: [
              { label: "Current falls", value: "350" },
              { label: "With injury", value: "~30%" },
              { label: "Doc improvement", value: "8%" }
            ],
            output: { label: "Injuries prevented", value: "~8" }
          },
          {
            stepNumber: 3,
            stepLabel: "COST AVOIDANCE",
            question: "What's the value of prevention?",
            inputs: [
              { label: "Injuries prevented", value: "8" },
              { label: "Avg cost per injury", value: "$6,250" }
            ],
            output: { label: "Annual savings", value: "$50,000" }
          }
        ],
        caveat: "Falls prevention is multi-factorial. Documentation is one supporting element alongside physical interventions, staffing, and environment."
      },
      {
        id: "survey-compliance",
        name: "Survey & Compliance Readiness",
        description: "Always ready for regulatory inspections",
        whyItMatters: "CMS citations can result in payment suspensions",
        referenceValue: 40000,
        icon: ClipboardCheck,
        lane: "quality",
        order: 4,
        theory: "Regulatory surveys examine documentation completeness and timeliness. Real-time charting ensures documentation is always survey-ready, reducing the scramble before inspections and the risk of citations.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "SURVEY PREP EFFORT",
            question: "How much effort goes into survey prep?",
            inputs: [
              { label: "Chart reviews/year", value: "200 hrs" },
              { label: "Remediation work", value: "150 hrs" }
            ],
            output: { label: "Annual prep hours", value: "350 hrs" }
          },
          {
            stepNumber: 2,
            stepLabel: "EFFORT REDUCTION",
            question: "How much can real-time documentation help?",
            inputs: [
              { label: "Prep hours", value: "350" },
              { label: "Reduction", value: "40%" }
            ],
            output: { label: "Hours saved", value: "140 hrs" }
          },
          {
            stepNumber: 3,
            stepLabel: "VALUE",
            question: "What's this worth operationally?",
            inputs: [
              { label: "Staff hours saved", value: "140" },
              { label: "Hourly rate", value: "$50" },
              { label: "Risk reduction", value: "+ $33K" }
            ],
            output: { label: "Annual value", value: "$40,000" }
          }
        ],
        caveat: "The risk reduction component is harder to quantify but represents real financial exposure for non-compliance."
      },
      {
        id: "care-coordination",
        name: "Care Coordination",
        description: "Improved handoffs and care continuity",
        whyItMatters: "80% of serious medical errors involve miscommunication during handoffs",
        referenceValue: 30000,
        icon: Users,
        lane: "quality",
        order: 5,
        theory: "Real-time documentation ensures current patient status is visible to all care team members. This reduces communication gaps during shift changes and improves care coordination across the hospital.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "HANDOFF FREQUENCY",
            question: "How many handoffs happen?",
            inputs: [
              { label: "Nurses", value: "300" },
              { label: "Handoffs/week", value: "3" },
              { label: "Weeks/year", value: "50" }
            ],
            output: { label: "Annual handoffs", value: "45,000" }
          },
          {
            stepNumber: 2,
            stepLabel: "TIME SAVINGS",
            question: "How much time can real-time docs save?",
            inputs: [
              { label: "Handoffs", value: "45,000" },
              { label: "Minutes saved", value: "2 min" }
            ],
            output: { label: "Hours saved", value: "1,500 hrs" }
          },
          {
            stepNumber: 3,
            stepLabel: "VALUE",
            question: "What's this worth?",
            inputs: [
              { label: "Hours saved", value: "1,500" },
              { label: "Avg rate", value: "$45/hr" },
              { label: "Realization", value: "45%" }
            ],
            output: { label: "Annual value", value: "$30,375" }
          }
        ],
        caveat: "Care coordination improvements also reduce errors, but that value is harder to quantify and track."
      },
      {
        id: "patient-experience",
        name: "Patient Experience (HCAHPS)",
        description: "More time at bedside = better patient satisfaction",
        whyItMatters: "HCAHPS scores affect VBP reimbursement",
        referenceValue: 25000,
        icon: Activity,
        lane: "quality",
        order: 6,
        theory: "When nurses spend less time at computer stations and more time with patients, satisfaction improves. HCAHPS scores in nursing communication and responsiveness correlate with documentation burden reduction.",
        calculationSteps: [
          {
            stepNumber: 1,
            stepLabel: "CURRENT HCAHPS",
            question: "What's the baseline situation?",
            inputs: [
              { label: "Nursing communication", value: "78th percentile" },
              { label: "Target", value: "85th percentile" }
            ],
            output: { label: "Gap", value: "7 percentile points" }
          },
          {
            stepNumber: 2,
            stepLabel: "IMPROVEMENT PATHWAY",
            question: "How does more bedside time help?",
            inputs: [
              { label: "Time returned to bedside", value: "+35 min/shift" },
              { label: "Patient interactions", value: "+2/shift" }
            ],
            output: { label: "Expected impact", value: "+2-3 percentile" }
          },
          {
            stepNumber: 3,
            stepLabel: "VALUE",
            question: "What's the VBP impact?",
            inputs: [
              { label: "HCAHPS improvement", value: "2.5 percentile" },
              { label: "VBP exposure", value: "$1M" },
              { label: "HCAHPS weight", value: "25%" }
            ],
            output: { label: "Potential value", value: "$25,000" }
          }
        ],
        caveat: "HCAHPS is influenced by many factors. Documentation burden is one contributor to nursing satisfaction and bedside time."
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

function CalculationStepCard({ step, isLast, index = 0 }: { step: CalculationStep; isLast: boolean; index?: number }) {
  return (
    <div 
      className="relative animate-in fade-in slide-in-from-bottom-2 duration-300"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
    >
      <div className="bg-gradient-to-br from-[#F8F9FA] to-white rounded-lg p-5 border border-neutral-100 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="mb-4">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-[#EA2C00] text-white text-xs font-bold flex items-center justify-center">
              {step.stepNumber}
            </span>
            <span className="text-xs font-bold text-[#EA2C00] tracking-wide uppercase">
              {step.stepLabel}
            </span>
          </div>
          <div className="text-sm text-[#6B7280] italic pl-8">{step.question}</div>
        </div>
        
        <div className="flex items-end justify-between gap-4 flex-wrap pl-8">
          <div className="flex items-end gap-3 flex-wrap flex-1">
            {step.inputs.map((input, idx) => (
              <div key={idx} className="flex items-end gap-3">
                {idx > 0 && (
                  <span className="text-[#9CA3AF] font-mono text-lg pb-1">×</span>
                )}
                <div className="text-center">
                  <div className="text-xs text-[#6B7280] mb-1">{input.label}</div>
                  <div className="font-mono text-[#111827] font-medium text-base bg-white border border-neutral-200 rounded-md pb-1.5 pt-1 px-3 min-w-[70px] shadow-sm">
                    {input.value}
                  </div>
                </div>
              </div>
            ))}
            <span className="text-[#9CA3AF] font-mono text-lg pb-1">=</span>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-[#6B7280] mb-1">{step.output.label}</div>
            <div className="font-mono text-white bg-emerald-600 font-bold text-lg rounded-md pb-1.5 pt-1 px-4 min-w-[90px] shadow-sm">
              {step.output.value}
            </div>
          </div>
        </div>
      </div>
      
      {!isLast && (
        <div className="flex justify-center py-1.5">
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-2 bg-gradient-to-b from-emerald-400 to-emerald-200"></div>
            <ChevronDown className="w-4 h-4 text-emerald-400 -mt-1" />
          </div>
        </div>
      )}
    </div>
  );
}

function InteractiveMiniCalculator({ 
  driver, 
  onCalculatedValue 
}: { 
  driver: Driver; 
  onCalculatedValue: (value: number) => void;
}) {
  const [inputs, setInputs] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    driver.interactiveInputs?.forEach(input => {
      initial[input.id] = input.defaultValue;
    });
    return initial;
  });

  const calculatedValue = useMemo(() => {
    if (driver.calculateValue) {
      return driver.calculateValue(inputs);
    }
    return driver.referenceValue;
  }, [inputs, driver]);

  // Notify parent of value changes - use useEffect to avoid side effects during render
  React.useEffect(() => {
    onCalculatedValue(calculatedValue);
  }, [calculatedValue, onCalculatedValue]);

  const formatValue = (value: number, format?: string) => {
    switch (format) {
      case "currency": return `$${value.toLocaleString()}`;
      case "percent": return `${value}%`;
      case "minutes": return `${value} min`;
      default: return value.toString();
    }
  };

  if (!driver.interactiveInputs || driver.interactiveInputs.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 border border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-[#EA2C00]" />
        <span className="text-sm font-semibold text-[#111827]">Try It Yourself</span>
        <span className="text-xs text-[#6B7280] ml-1">— adjust the inputs</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {driver.interactiveInputs.map((input) => (
          <div key={input.id} className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-[#6B7280]">{input.label}</label>
              <span className="text-sm font-semibold text-[#111827] font-mono">
                {formatValue(inputs[input.id], input.format)}
              </span>
            </div>
            <Slider
              value={[inputs[input.id]]}
              onValueChange={([value]) => setInputs(prev => ({ ...prev, [input.id]: value }))}
              min={input.min}
              max={input.max}
              step={input.step}
              className="w-full"
              data-testid={`slider-${driver.id}-${input.id}`}
            />
            <div className="flex justify-between text-[10px] text-[#9CA3AF]">
              <span>{formatValue(input.min, input.format)}</span>
              <span>{formatValue(input.max, input.format)}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-slate-200">
        <div>
          <div className="text-xs text-[#6B7280] mb-0.5">Estimated Annual Value</div>
          <div className="text-xs text-[#9CA3AF]">Based on your inputs</div>
        </div>
        <div className="text-2xl font-bold text-emerald-600 font-mono">
          ${calculatedValue.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function DriverAccordion({ 
  driver, 
  isExpanded, 
  onToggle,
  onViewed,
  onTryInExplore
}: { 
  driver: Driver; 
  isExpanded: boolean; 
  onToggle: () => void;
  onViewed: () => void;
  onTryInExplore: () => void;
}) {
  const Icon = driver.icon;
  const [calculatedValue, setCalculatedValue] = useState(driver.referenceValue);
  const hasRichContent = driver.theProblem || driver.whyDefensible || driver.theSignal;
  const hasInteractive = driver.interactiveInputs && driver.interactiveInputs.length > 0;
  
  // Stable callback to avoid re-render loops
  const handleCalculatedValue = useCallback((value: number) => {
    setCalculatedValue(value);
  }, []);
  
  const handleToggle = () => {
    if (!isExpanded) {
      onViewed();
    }
    onToggle();
  };

  return (
    <div className="border border-neutral-200 rounded-xl overflow-visible bg-white shadow-sm">
      <button
        onClick={handleToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover-elevate rounded-xl"
        data-testid={`accordion-${driver.id}`}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#FEF0EC] flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-[#EA2C00]" />
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-[#111827]">{driver.name}</h4>
            <p className="text-sm text-[#6B7280]">{driver.whyItMatters}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-emerald-600 font-semibold">
            ${(hasInteractive ? calculatedValue : driver.referenceValue).toLocaleString()}
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
          
          {/* The Problem - Rich Content */}
          {driver.theProblem && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-[#EA2C00]" />
                <span className="text-sm font-semibold text-[#111827]">The Problem</span>
              </div>
              <p className="text-sm text-[#4B5563] leading-relaxed">{driver.theProblem}</p>
            </div>
          )}
          
          {/* Why It's Defensible */}
          {driver.whyDefensible && driver.whyDefensible.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-[#EA2C00]" />
                <span className="text-sm font-semibold text-[#111827]">Why It's Defensible</span>
              </div>
              <ul className="space-y-2">
                {driver.whyDefensible.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-[#4B5563]">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* The Signal */}
          {driver.theSignal && driver.theSignal.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-4 h-4 text-[#EA2C00]" />
                <span className="text-sm font-semibold text-[#111827]">The Signal</span>
                <span className="text-xs text-[#6B7280]">— how to know if this applies</span>
              </div>
              <ul className="space-y-2">
                {driver.theSignal.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-[#4B5563]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#EA2C00] mt-2 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Divider if rich content exists */}
          {hasRichContent && (
            <div className="border-t border-neutral-100 pt-2" />
          )}
          
          {/* Interactive Mini Calculator */}
          {hasInteractive && (
            <InteractiveMiniCalculator 
              driver={driver} 
              onCalculatedValue={handleCalculatedValue}
            />
          )}
          
          {/* The Theory - Simplified if rich content exists */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-[#EA2C00]" />
              <span className="text-sm font-semibold text-[#111827]">
                {hasRichContent ? "The Math in Plain English" : "The Theory"}
              </span>
            </div>
            <p className="text-sm text-[#6B7280] leading-relaxed">{driver.theory}</p>
          </div>
          
          {/* How We Calculate It */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-4 h-4 text-[#EA2C00]" />
              <span className="text-sm font-semibold text-[#111827]">Step-by-Step Calculation</span>
            </div>
            <div className="space-y-0">
              {driver.calculationSteps.map((step, idx) => (
                <CalculationStepCard 
                  key={idx} 
                  step={step} 
                  isLast={idx === driver.calculationSteps.length - 1}
                  index={idx}
                />
              ))}
            </div>
          </div>
          
          {/* Caveat Note */}
          {driver.caveat && (
            <div className="flex items-start gap-2 text-sm text-[#6B7280] bg-amber-50 border border-amber-100 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span>{driver.caveat}</span>
            </div>
          )}
          
          {/* Try This in Explore CTA */}
          <div className="pt-4 border-t border-neutral-100">
            <div className="bg-gradient-to-r from-[#FEF0EC] to-[#FFF7ED] rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#111827]">Ready to model your own scenario?</p>
                <p className="text-xs text-[#6B7280]">Use your actual data in the full calculator</p>
              </div>
              <Button
                onClick={onTryInExplore}
                size="sm"
                className="bg-[#EA2C00] text-white flex items-center gap-1.5 flex-shrink-0"
                data-testid={`button-try-explore-${driver.id}`}
              >
                Try in Explore
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
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
  const timeDrivers = config?.drivers.filter(d => d.lane === "time").sort((a, b) => a.order - b.order) || [];
  const qualityDrivers = config?.drivers.filter(d => d.lane === "quality").sort((a, b) => a.order - b.order) || [];
  const showBridge = viewedDrivers.size >= 2;

  if (screen === "selection") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 via-white to-neutral-50">
        <GlobalHeader 
          pageName="Learn the Methodology" 
          onBack={onBack}
        />
        <div className="h-[72px]" />

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
                        ? "border-[#EA2C00] bg-[#FEF0EC]" 
                        : "border-neutral-200 bg-white"
                    }`}
                    data-testid={`setting-${setting}`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#EA2C00] flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="w-10 h-10 rounded-lg bg-[#FEF0EC] flex items-center justify-center mb-3">
                      <Icon className={`w-5 h-5 ${isSelected ? "text-[#EA2C00]" : "text-[#6B7280]"}`} />
                    </div>
                    <h3 className="font-semibold text-[#111827] mb-1">{cfg.name}</h3>
                    <p className="text-sm text-[#6B7280]">{cfg.subtitle}</p>
                  </button>
                );
              })}
              
              <button
                onClick={() => handleSettingSelect("inpatient")}
                className={`relative p-5 rounded-xl border-2 text-left hover-elevate ${
                  selectedSetting === "inpatient"
                    ? "border-[#EA2C00] bg-[#FEF0EC]"
                    : "border-neutral-200 bg-white"
                }`}
                data-testid="card-inpatient"
              >
                {selectedSetting === "inpatient" && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#EA2C00] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="w-10 h-10 rounded-lg bg-[#FEF0EC] flex items-center justify-center mb-3">
                  <Building2 className={`w-5 h-5 ${selectedSetting === "inpatient" ? "text-[#EA2C00]" : "text-[#6B7280]"}`} />
                </div>
                <h3 className="font-semibold text-[#111827] mb-1">Inpatient</h3>
                <p className="text-sm text-[#6B7280]">Hospital admissions, rounding</p>
              </button>
            </div>

            <Button
              onClick={handleContinue}
              disabled={!selectedSetting}
              size="lg"
              className="w-full bg-[#EA2C00] border-[#EA2C00] text-white font-semibold"
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
      <GlobalHeader 
        pageName={config?.name || "Methodology"} 
        onBack={handleBackToSelection}
      />
      <div className="h-[72px]" />

      <main className="max-w-4xl mx-auto px-6 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#111827] tracking-tight mb-2">
            The ROI Framework for {config?.name}
          </h1>
          <p className="text-[#6B7280]">Understanding where value actually comes from</p>
        </div>

        {/* Value Framework Visualization */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 md:p-8 mb-10 text-white" data-testid="value-framework">
          <div className="flex items-center gap-2 mb-6">
            <Layers className="w-5 h-5 text-[#EA2C00]" />
            <h3 className="text-sm font-bold tracking-wide">THE VALUE FRAMEWORK</h3>
          </div>
          
          <p className="text-slate-300 mb-8 max-w-2xl">
            {config?.insightText.main} <span className="text-white font-semibold">{config?.insightText.highlight}</span> {config?.insightText.followup}
          </p>
          
          {/* Visual Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Time Saved Pillar */}
            <button
              onClick={() => document.getElementById('time-section')?.scrollIntoView({ behavior: 'smooth' })}
              className={`relative p-5 rounded-xl text-left transition-all duration-200 ${
                selectedSetting === "nursing" 
                  ? "bg-gradient-to-br from-[#EA2C00] to-[#d12700] ring-2 ring-white/20 hover:ring-white/40" 
                  : "bg-white/10 hover:bg-white/20"
              }`}
              data-testid="framework-time-card"
            >
              {selectedSetting === "nursing" && (
                <span className="absolute top-3 right-3 text-[10px] font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded">PRIMARY</span>
              )}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Time Saved</h4>
                  <p className="text-xs text-white/70">{config?.timeSavedSubtitle}</p>
                </div>
              </div>
              <div className="space-y-1.5 pl-1">
                {timeDrivers.slice(0, 3).map(d => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span className="text-white/80">{d.name}</span>
                    <span className="font-mono text-emerald-400 text-xs">${(d.referenceValue / 1000).toFixed(0)}K</span>
                  </div>
                ))}
                {timeDrivers.length > 3 && (
                  <div className="text-xs text-white/50 pt-1">+{timeDrivers.length - 3} more drivers</div>
                )}
              </div>
            </button>
            
            {/* Quality Pillar */}
            <button
              onClick={() => document.getElementById('quality-section')?.scrollIntoView({ behavior: 'smooth' })}
              className={`relative p-5 rounded-xl text-left transition-all duration-200 ${
                selectedSetting === "nursing"
                  ? "bg-white/5 opacity-80 hover:opacity-90"
                  : "bg-white/10 hover:bg-white/20"
              }`}
              data-testid="framework-quality-card"
            >
              {selectedSetting === "nursing" && (
                <span className="absolute top-3 right-3 text-[10px] font-bold tracking-wider bg-white/10 px-2 py-0.5 rounded text-white/60">SUPPORTING</span>
              )}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Documentation Quality</h4>
                  <p className="text-xs text-white/70">{config?.docQualitySubtitle}</p>
                </div>
              </div>
              <div className="space-y-1.5 pl-1">
                {qualityDrivers.slice(0, 3).map(d => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span className="text-white/80">{d.name}</span>
                    <span className="font-mono text-emerald-400 text-xs">${(d.referenceValue / 1000).toFixed(0)}K</span>
                  </div>
                ))}
                {qualityDrivers.length > 3 && (
                  <div className="text-xs text-white/50 pt-1">+{qualityDrivers.length - 3} more drivers</div>
                )}
              </div>
            </button>
          </div>
          
          {/* Combined Value */}
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10">
            <div>
              <div className="text-xs text-white/60 mb-0.5">Combined Reference Value</div>
              <div className="text-sm text-white/80">Based on {config?.referenceScenario.providers} {config?.referenceScenario.providerLabel} scenario</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                ${[...timeDrivers, ...qualityDrivers].reduce((sum, d) => sum + d.referenceValue, 0).toLocaleString()}
              </div>
              <div className="text-xs text-white/60">per year</div>
            </div>
          </div>
        </div>

        {/* Reference Scenario Card */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 mb-10" data-testid="reference-scenario-card">
          <h3 className="text-sm font-bold text-[#111827] tracking-wide mb-4">REFERENCE SCENARIO</h3>
          
          <p className="text-[#6B7280] mb-6">{config?.referenceScenario.description}</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
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
              <span className="text-lg font-bold text-emerald-600">~{config?.referenceScenario.eligibleEncounters.toLocaleString()}</span>
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
              <Clock className="w-5 h-5 text-[#EA2C00]" />
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
                onTryInExplore={handleStartCalculator}
              />
            ))}
          </div>
        </div>

        {/* Documentation Quality Section */}
        <div className="mb-10" id="quality-section">
          <div className="border-t border-neutral-200 pt-6 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#EA2C00]" />
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
                onTryInExplore={handleStartCalculator}
              />
            ))}
          </div>
        </div>

        {/* Nursing-only: What we're NOT claiming callout */}
        {selectedSetting === "nursing" && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 mb-10" data-testid="nursing-disclaimer">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-[#111827] mb-2">A NOTE ON NURSING VALUE DRIVERS</h4>
                <p className="text-sm text-[#6B7280] mb-3">
                  Nursing ROI is different from physician settings. There's no wRVU capture or E/M coding. Instead, value flows through:
                </p>
                <ul className="text-sm text-[#6B7280] space-y-1.5 mb-3">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Direct cost savings</strong> — overtime reduction and agency avoidance are measurable in payroll data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Retention value</strong> — preventing turnover avoids $40-60K replacement costs per nurse</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Quality indicators</strong> — HAPI, falls, HCAHPS shown with clear caveats about indirect attribution</span>
                  </li>
                </ul>
                <p className="text-sm text-[#111827] font-medium">We show the theory and math—you decide what's defensible for your organization.</p>
              </div>
            </div>
          </div>
        )}

        {/* Combined Reference Value Summary - Itemized */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 mb-10 shadow-sm" data-testid="value-summary-card">
          <h3 className="text-sm font-bold text-[#111827] tracking-wide mb-6">COMBINED REFERENCE VALUE</h3>
          
          <div className="space-y-6">
            {/* Time Saved Breakdown */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-[#EA2C00]" />
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
                <FileText className="w-4 h-4 text-[#EA2C00]" />
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
                <span className="font-mono font-bold text-emerald-600 text-2xl">
                  ${(timeDrivers.reduce((sum, d) => sum + d.referenceValue, 0) + qualityDrivers.reduce((sum, d) => sum + d.referenceValue, 0)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-[#6B7280]">
                <span>For {config?.referenceScenario.providers} {config?.referenceScenario.providerLabel} at {config?.referenceScenario.adoption}% adoption</span>
                <span className="font-mono">
                  ~${Math.round((timeDrivers.reduce((sum, d) => sum + d.referenceValue, 0) + qualityDrivers.reduce((sum, d) => sum + d.referenceValue, 0)) / (config?.referenceScenario.providers || 1)).toLocaleString()} per {selectedSetting === "nursing" ? "nurse" : selectedSetting === "inpatient" ? "hospitalist" : "provider"}/year
                </span>
              </div>
              {selectedSetting === "nursing" && (
                <p className="text-xs text-[#6B7280] mt-4 italic">
                  Nursing ROI is primarily cost avoidance, not revenue generation. But cost avoidance is real money—it hits the same budget line.
                </p>
              )}
            </div>
          </div>
        </div>

        {showBridge && (
          <div className="bg-white border border-neutral-200 rounded-2xl p-8 md:p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-sm">
            <p className="text-lg text-[#111827] mb-4">
              You've seen the framework.
            </p>
            
            <p className="text-[#6B7280] mb-4 max-w-xl mx-auto">
              The reference scenario showed potential value of <span className="font-semibold text-emerald-600">${(timeDrivers.reduce((sum, d) => sum + d.referenceValue, 0) + qualityDrivers.reduce((sum, d) => sum + d.referenceValue, 0)).toLocaleString()}</span> for a {config?.referenceScenario.providers}-{config?.referenceScenario.providerLabel === "physicians" ? "physician ED" : config?.referenceScenario.providerLabel === "nurses" ? "nurse deployment" : config?.referenceScenario.providerLabel === "hospitalists" ? "hospitalist program" : "provider practice"}. But your {selectedSetting === "inpatient" ? "program" : "organization"} is different.
            </p>
            
            <p className="text-[#6B7280] mb-8">
              {selectedSetting === "ed" 
                ? "Different physician count. Different LWBS rates. Different scribe situation."
                : selectedSetting === "nursing"
                ? "Different nurse count. Different OT rates. Different agency utilization."
                : selectedSetting === "inpatient"
                ? "Different hospitalist count. Different turnover rates. Different case mix."
                : "Different provider count. Different volumes. Different payer mix."}
            </p>
            
            <p className="text-[#111827] font-semibold mb-6">
              Ready to see what Abridge could mean for YOUR {selectedSetting === "ed" ? "ED" : selectedSetting === "nursing" ? "nursing team" : selectedSetting === "inpatient" ? "inpatient program" : "practice"}?
            </p>
            
            <div className="flex flex-col items-center gap-4">
              <Button
                onClick={handleStartCalculator}
                size="lg"
                className="bg-[#EA2C00] border-[#EA2C00] text-white font-semibold px-8"
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
