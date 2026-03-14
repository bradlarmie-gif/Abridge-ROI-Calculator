import { useState, useMemo } from "react";
import { ArrowRight, Download, Loader2, FileText, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAssessment } from "@/lib/assessment";
import { formatDollar } from "./ambientCalculator";
import {
  generateAmbientAssessmentPDF,
  opportunityText,
  type AmbientAssessmentPDFData,
} from "@/lib/ambient-assessment-pdf";
import {
  ACTIVATION_LABELS,
  scoreToActivationLevel,
  DOMAIN_ORDER,
  DOMAIN_LABELS,
  type Domain,
  type ActivationLevel,
} from "./domainCalculations";

interface Screen6Props {
  onBack: () => void;
  onBackToJourney?: () => void;
  onNavigateToExplore?: (providers: number, encounters: number) => void;
}

const parseDomainInputs = (json: string): Record<string, number | string> => {
  try { return JSON.parse(json); } catch { return {}; }
};

const ACCESS_OUTCOME_OPTIONS = [
  'Panel size increased',
  'New patient slots opened',
  'Same-day/urgent access expanded',
  'Referral-to-visit time reduced',
  'Third-next-available improved',
  'No-show backfill utilized',
];

const QUALITY_ATTRIBUTES_LABELS = [
  'Completeness', 'Specificity', 'Quality measures', 'Compliance', 'HCC / RAF accuracy',
];

const DOWNSTREAM_WORKFLOWS_LABELS = [
  'CDI', 'Coding accuracy', 'Quality measures', 'Prior authorization', 'Chart abstraction', 'Risk adjustment',
];

const STRATEGIC_INTEGRATIONS_LABELS = [
  'Quality program design', 'Value-based care', 'Compliance governance', 'AI and automation readiness', 'Payer strategy', 'Clinical research',
];

const REVENUE_INTEGRATIONS_LABELS = [
  'Specialty-level revenue analysis', 'CDI strategy', 'Payer negotiations', 'Proactive denial prevention', 'Financial planning line item', 'Shared doc-to-revenue view',
];

const OBSERVATION_AREAS_LABELS = [
  'wRVU trending up', 'Coding specificity improving', 'Denial rates trending down', 'Collections trending up', 'CDI queries decreasing', 'Coder productivity improving',
];

const SURVEY_FINDINGS_LABELS = [
  'Reduced documentation burden', 'Better work-life balance', 'Less after-hours charting', 'Higher job satisfaction', 'Would recommend to peers',
];

function resolveChecklist(csv: string | undefined, labels: string[]): string[] {
  if (!csv) return [];
  return csv.split(',').filter(Boolean).map(i => labels[parseInt(i)] || '').filter(Boolean);
}

function fmtDollar(n: number): string {
  if (!n) return '';
  return `$${n.toLocaleString()}`;
}

function buildUserInputsSummary(domain: Domain, level: number, raw: Record<string, number | string>): Record<string, string> {
  const out: Record<string, string> = {};

  if (domain === 'capacity') {
    if (raw.timeSaved) out['Time saved per encounter'] = `${raw.timeSaved} min`;
    if (raw.unmeasuredTime === 'true') out['Time savings'] = 'Using benchmark (2\u20133 min)';
    if (level === 2) {
      if (raw.accessDecisionStage) {
        const stageLabels: Record<string, string> = {
          evaluating: 'Evaluating',
          planning: 'Planning',
          piloting: 'Piloting',
          implementing: 'Implementing',
        };
        out['Access decision stage'] = stageLabels[raw.accessDecisionStage as string] || String(raw.accessDecisionStage);
      }
    }
    if (level === 3) {
      if (raw.additionalPatientsPerMonth) out['Additional patients/provider/month'] = `${raw.additionalPatientsPerMonth}`;
      if (raw.capacityAccessConfidence) out['Data confidence'] = String(raw.capacityAccessConfidence).charAt(0).toUpperCase() + String(raw.capacityAccessConfidence).slice(1);
      if (raw.redesignedProviders) out['Providers in redesign'] = `${raw.redesignedProviders}`;
    }
    if (level === 4) {
      const outcomes = resolveChecklist(raw.accessOutcomes as string, ACCESS_OUTCOME_OPTIONS);
      if (outcomes.length) out['Access outcomes tracked'] = outcomes.join(', ');
      if (raw.additionalPatientsPerMonth) out['Additional patients/provider/month'] = `${raw.additionalPatientsPerMonth}`;
    }
  }

  if (domain === 'revenue') {
    if (level === 1) {
      if (raw.revenueCycleEngaged) out['Revenue cycle engagement'] = raw.revenueCycleEngaged === 'yes' ? 'Formally engaged' : raw.revenueCycleEngaged === 'informal' ? 'Conversations started' : 'Not yet';
      if (raw.emComplexity) out['E&M complexity'] = String(raw.emComplexity) === 'mostly_l3' ? 'Mostly Level 3' : String(raw.emComplexity) === 'mix_l3_l4' ? 'Mix of Level 3–4' : String(raw.emComplexity) === 'mostly_l4_l5' ? 'Mostly Level 4–5' : 'Unsure';
    }
    if (level === 2) {
      const areas = resolveChecklist(raw.observedMovement as string, OBSERVATION_AREAS_LABELS);
      if (areas.length) out['Areas showing movement'] = areas.join(', ');
      if (raw.directionalEstimate) {
        const estLabels: Record<string, string> = { under_1: 'Under 1%', '1_3': '1–3%', '3_5': '3–5%', '5_plus': '5%+', not_sure: 'Not sure' };
        out['Directional estimate'] = estLabels[raw.directionalEstimate as string] || String(raw.directionalEstimate);
      }
    }
    if (level === 3) {
      if (raw.revenueMetricType) out['Metric measured'] = String(raw.revenueMetricType);
      if (raw.measuredWrvuDelta) out['Measured wRVU delta'] = `+${raw.measuredWrvuDelta}`;
      if (raw.measuredCollectionsDelta) out['Collections delta'] = fmtDollar(Number(raw.measuredCollectionsDelta));
      if (raw.measuredRevenuePct) out['Revenue improvement'] = `${raw.measuredRevenuePct}%`;
      if (raw.measuredDenialReduction) out['Denial rate reduction'] = `${raw.measuredDenialReduction}%`;
    }
    if (level === 4) {
      const areas = resolveChecklist(raw.revenueIntegrations as string, REVENUE_INTEGRATIONS_LABELS);
      if (areas.length) out['Strategic integrations'] = areas.join(', ');
      if (raw.recognizedRevenue) out['Attributed annual revenue'] = fmtDollar(Number(raw.recognizedRevenue));
    }
  }

  if (domain === 'workforce') {
    if (level === 1) {
      if (raw.afterHoursReduction) out['After-hours reduction'] = `${raw.afterHoursReduction} hrs/week`;
    }
    if (level === 2) {
      if (raw.editTimeSaved) out['In-clinic time saved'] = `${raw.editTimeSaved} min/day`;
      if (raw.confirmedAfterHoursReduction) out['Confirmed after-hours reduction'] = `${raw.confirmedAfterHoursReduction} hrs/week`;
      if (raw.surveyType) out['Survey approach'] = String(raw.surveyType);
      const findings = resolveChecklist(raw.surveyFindings as string, SURVEY_FINDINGS_LABELS);
      if (findings.length) out['Survey findings'] = findings.join(', ');
    }
    if (level === 3) {
      if (raw.turnoverRate) out['Annual turnover rate'] = `${raw.turnoverRate}%`;
      if (raw.replacementCost) out['Replacement cost per provider'] = fmtDollar(Number(raw.replacementCost));
      if (raw.docBurdenShare) out['Documentation burden share'] = `${raw.docBurdenShare}%`;
    }
    if (level === 4) {
      const WORKFORCE_STRATEGY_SHORT = [
        'Recruitment and hiring',
        'Retention program design',
        'Time-to-fill tracking',
        'Provider experience strategy',
        'Staffing model decisions',
        'Agency/locum spend management',
      ];
      const WORKFORCE_OUTCOME_SHORT = [
        'Turnover rate decreased',
        'Time-to-fill decreased',
        'Agency/locum reliance decreased',
        'Provider satisfaction improved',
        'Recruitment acceptance improved',
      ];
      const strategies = resolveChecklist(raw.workforceStrategies as string, WORKFORCE_STRATEGY_SHORT);
      if (strategies.length) out['Strategic integrations'] = strategies.join(', ');
      if (raw.workforceOutcomesStatus) {
        const statusLabels: Record<string, string> = { not_yet: 'Not yet measured', anecdotal: 'Anecdotal only', yes: 'Measurable outcomes confirmed' };
        out['Outcomes status'] = statusLabels[String(raw.workforceOutcomesStatus)] || String(raw.workforceOutcomesStatus);
      }
      const outcomes = resolveChecklist(raw.workforceOutcomes as string, WORKFORCE_OUTCOME_SHORT);
      if (outcomes.length) out['Measured outcomes'] = outcomes.join(', ');
      if (raw.agencyReduction) out['Monthly agency/locum reduction'] = fmtDollar(Number(raw.agencyReduction));
    }
  }

  if (domain === 'risk') {
    if (level === 1) {
      if (raw.qualityDownstreamConnected) {
        const labels: Record<string, string> = { yes: 'One team formally engaged', informal: 'Starting informally', no: 'Not yet' };
        out['Downstream connection'] = labels[String(raw.qualityDownstreamConnected)] || String(raw.qualityDownstreamConnected);
      }
    }
    if (level === 2) {
      const attrs = resolveChecklist(raw.qualityAttributes as string, QUALITY_ATTRIBUTES_LABELS);
      if (attrs.length) out['Quality attributes tracked'] = attrs.join(', ');
    }
    if (level === 3) {
      const wf = resolveChecklist(raw.connectedWorkflows as string, DOWNSTREAM_WORKFLOWS_LABELS);
      if (wf.length) out['Connected areas'] = wf.join(', ');
      if (raw.qualityMeasurementDepth) {
        const depthLabels: Record<string, string> = { qualitative: 'Qualitative', partial: 'Partially measured', measured: 'Measured data available' };
        out['Measurement depth'] = depthLabels[String(raw.qualityMeasurementDepth)] || String(raw.qualityMeasurementDepth);
      }
      if (raw.downstreamValue) out['Downstream quality value'] = fmtDollar(Number(raw.downstreamValue));
    }
    if (level === 4) {
      const si = resolveChecklist(raw.strategicIntegrations as string, STRATEGIC_INTEGRATIONS_LABELS);
      if (si.length) out['Strategic areas'] = si.join(', ');
      if (raw.executiveOwner) out['Executive owner'] = raw.executiveOwner === 'yes' ? 'Yes' : 'Not yet';
      if (raw.strategicValue) out['Strategic value'] = fmtDollar(Number(raw.strategicValue));
    }
  }

  return out;
}

const ROADMAP_STRATEGIC_ORDER: Domain[] = ['capacity', 'workforce', 'risk', 'revenue'];

const ROADMAP_CARDS: Record<Domain, Record<ActivationLevel, { currentStateLabel: string; nextLevelUnlock: string }>> = {
  capacity: {
    1: {
      currentStateLabel: "Time is being recovered. No operational decision has been made about how to use it.",
      nextLevelUnlock: "An organizational decision about converting recovered time into patient access — whether evaluating, planning, piloting, or implementing scheduling changes.",
    },
    2: {
      currentStateLabel: "Your organization has decided to convert recovered time into patient access.",
      nextLevelUnlock: "Measured patient volume increases — confirmed additional patients per provider per month attributed to recovered time, with revenue calculated.",
    },
    3: {
      currentStateLabel: "Additional patients are being seen with recovered time. Access revenue is measured.",
      nextLevelUnlock: "Tracking of downstream access outcomes — panel growth, same-day access, referral conversion — attributed to recovered time.",
    },
    4: {
      currentStateLabel: "Access outcomes are tracked and attributed to recovered time. Revenue reflects confirmed patient volume.",
      nextLevelUnlock: "",
    },
  },
  workforce: {
    1: {
      currentStateLabel: "Providers report feeling less burdened. That signal hasn't been formally measured.",
      nextLevelUnlock: "Structured measurement of in-clinic and after-hours time savings — turning anecdotal relief into an organizational data point that supports retention decisions and provider contracts.",
    },
    2: {
      currentStateLabel: "Burden reduction is measured. In-clinic and after-hours time savings are quantified.",
      nextLevelUnlock: "Modeling turnover costs with documentation burden as a contributing factor — connecting provider experience data to retention economics.",
    },
    3: {
      currentStateLabel: "Turnover exposure is modeled with documentation burden as a factor.",
      nextLevelUnlock: "Documentation burden reduction becomes a variable in workforce strategy — informing recruitment, retention programs, staffing models, and provider experience decisions.",
    },
    4: {
      currentStateLabel: "Documentation burden reduction is informing workforce strategy across recruitment, retention, staffing, and provider experience.",
      nextLevelUnlock: "",
    },
  },
  risk: {
    1: {
      currentStateLabel: "Documentation quality has improved. No one has measured how or connected it downstream.",
      nextLevelUnlock: "Systematic tracking of documentation quality attributes — completeness, specificity, compliance readiness, and risk adjustment capture.",
    },
    2: {
      currentStateLabel: "Documentation quality attributes are being tracked systematically.",
      nextLevelUnlock: "Connecting documentation quality to at least one downstream program — CDI, coding, quality measures, prior authorization, chart abstraction, or risk adjustment.",
    },
    3: {
      currentStateLabel: "Documentation quality improvements are connected to at least one downstream program or workflow.",
      nextLevelUnlock: "Documentation quality positioned as a strategic organizational asset — informing quality program design, value-based care, compliance governance, and AI readiness.",
    },
    4: {
      currentStateLabel: "Structured documentation informs organizational strategy — quality programs, value-based care, compliance governance, and AI readiness.",
      nextLevelUnlock: "",
    },
  },
  revenue: {
    1: {
      currentStateLabel: "No one has analyzed whether documentation changes are affecting reimbursement.",
      nextLevelUnlock: "Observing trends in coding, denials, and collections — the directional signal that documentation is affecting revenue.",
    },
    2: {
      currentStateLabel: "Your organization has observed trends suggesting documentation is affecting reimbursement. Not yet formally validated.",
      nextLevelUnlock: "A formal before/after analysis that quantifies the documentation-driven revenue impact — giving leadership a number they can stand behind.",
    },
    3: {
      currentStateLabel: "Before/after analysis completed. Documentation-driven revenue impact quantified.",
      nextLevelUnlock: "Documentation intelligence integrated into revenue strategy — where documentation quality drives payer positioning, financial planning, and proactive denial prevention.",
    },
    4: {
      currentStateLabel: "Documentation intelligence drives revenue cycle strategy, payer positioning, and financial planning.",
      nextLevelUnlock: "",
    },
  },
};

function getHeroNarrative(domainLevels: Record<string, number>): string {
  const { capacity, workforce, risk, revenue } = domainLevels;
  const atCeiling = [capacity, workforce, risk, revenue].filter(l => l === 4).length;
  if (atCeiling === 4) return "You're operating at full maturity across all four domains. The opportunity now is sustaining and deepening.";
  if (atCeiling >= 2) return "You've reached leading maturity in several domains. The remaining gaps are where your next unlock lives.";
  if (revenue === 4) return "Documentation intelligence is driving your revenue strategy. Capacity, Workforce, and Quality are where the next level of value gets built.";
  return "Your deployment is established. What follows is the specific path to making it work at full strategic scale.";
}

export default function Screen6Invitation({ onBack, onNavigateToExplore }: Screen6Props) {
  const { state } = useAssessment();
  const { inputs } = state;

  const [isExporting, setIsExporting] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [exportOrgName, setExportOrgName] = useState("");
  const [exportPreparedBy, setExportPreparedBy] = useState("");

  const providers = inputs.providers || 0;
  const annualEncounters = inputs.annualEncounters || 0;
  const utilization = inputs.utilization || 45;
  const timeSavings = inputs.timeSavedPerEncounter || 0;
  const revenuePerVisit = inputs.revenuePerVisit || 200;

  const domainHasValue: Record<string, boolean> = useMemo(() => ({
    capacity: inputs.capacityHasValue || false,
    revenue: inputs.revenueHasValue || false,
    workforce: inputs.workforceHasValue || false,
    risk: inputs.riskHasValue || false,
  }), [inputs.capacityHasValue, inputs.revenueHasValue, inputs.workforceHasValue, inputs.riskHasValue]);

  const domainData = useMemo(() => {
    const scores: Record<string, number> = {
      capacity: inputs.capacityScore || 0,
      revenue: inputs.revenueScore || 0,
      workforce: inputs.workforceScore || 0,
      risk: inputs.riskScore || 0,
    };
    const gaps: Record<string, number> = {
      capacity: inputs.capacityGap || 0,
      revenue: inputs.revenueGap || 0,
      workforce: inputs.workforceGap || 0,
      risk: inputs.riskGap || 0,
    };

    const r: Record<string, any> = {};
    for (const d of DOMAIN_ORDER) {
      const level = scoreToActivationLevel(d, scores[d]);
      const rawInputs = parseDomainInputs((inputs as any)[`${d}DomainInputs`] || '{}');
      r[d] = {
        activationLevel: level,
        activationLabel: ACTIVATION_LABELS[d][level],
        score: scores[d],
        gapValue: gaps[d],
        hasValue: domainHasValue[d],
        headlineMetric: (inputs as any)[`${d}HeadlineMetric`] || '',
        primaryOpportunity: opportunityText[d]?.[level] || '',
        context: (inputs as any)[`${d}Context`] || '',
        formula: (inputs as any)[`${d}Formula`] || '',
        footnote: (inputs as any)[`${d}Footnote`] || '',
        userInputs: buildUserInputsSummary(d as Domain, level, rawInputs),
      };
    }
    return r;
  }, [inputs, domainHasValue]);

  const totalScore = useMemo(() => {
    return (inputs.capacityScore || 0) + (inputs.revenueScore || 0) +
           (inputs.workforceScore || 0) + (inputs.riskScore || 0);
  }, [inputs.capacityScore, inputs.revenueScore, inputs.workforceScore, inputs.riskScore]);

  const displayedTotal = useMemo(() => {
    let sum = 0;
    for (const d of DOMAIN_ORDER) {
      if (domainHasValue[d]) sum += (inputs as any)[`${d}Gap`] || 0;
    }
    return sum;
  }, [inputs, domainHasValue]);

  const hasMeasuredDomains = DOMAIN_ORDER.some(d => domainHasValue[d]);

  const displayedMonthly = Math.round(displayedTotal / 12);
  const displayedDaily = Math.round(displayedTotal / 365);

  const assessmentDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric"
    });
  }, []);

  const dt = displayedTotal;
  const actNow3yr = Math.round(dt * 3.45);
  const permanentlyLost6mo = Math.round(dt * 0.42);
  const permanentlyLost12mo = Math.round(dt * 0.95);

  const openExportModal = () => {
    setExportSuccess(false);
    setExportError(false);
    setExportModalOpen(true);
  };

  const heroNarrative = useMemo(() => {
    const domainLevels: Record<string, number> = {};
    for (const d of DOMAIN_ORDER) {
      domainLevels[d] = domainData[d]?.activationLevel || 1;
    }
    return getHeroNarrative(domainLevels);
  }, [domainData]);

  const assessmentNarrative = useMemo(() => {
    const domainLevels: Record<string, number> = {};
    for (const d of DOMAIN_ORDER) {
      domainLevels[d] = domainData[d]?.activationLevel || 1;
    }
    const TIEBREAKER: (typeof DOMAIN_ORDER[number])[] = ['risk', 'revenue', 'workforce', 'capacity'];
    let lowestDomain = TIEBREAKER[0];
    let lowestLevel = domainLevels[lowestDomain];
    for (const d of TIEBREAKER) {
      if (domainLevels[d] < lowestLevel) { lowestDomain = d; lowestLevel = domainLevels[d]; }
    }
    const strongDomains = DOMAIN_ORDER.filter(d => domainLevels[d] >= 3).map(d => DOMAIN_LABELS[d]);
    const weakDomains = DOMAIN_ORDER.filter(d => domainLevels[d] <= 2).map(d => DOMAIN_LABELS[d]);

    const INSIGHTS: Record<string, Record<1|2, string>> = {
      capacity: { 1: "Recovered time isn't being tracked or deployed.", 2: "Recovered time is measured but not being converted to access." },
      revenue: { 1: "No one has analyzed whether documentation changes are affecting reimbursement.", 2: "Directional signals observed but not formally validated." },
      workforce: { 1: "After-hours burden reduced but broader workforce impact isn't tracked.", 2: "Burden is measured but not connected to retention or labor costs." },
      risk: { 1: "Documentation quality improved but no downstream teams have been engaged.", 2: "Quality attributes tracked but not yet connected to downstream programs." },
    };
    const insightLevel = Math.min(lowestLevel, 2) as 1|2;
    const domainInsight = INSIGHTS[lowestDomain]?.[insightLevel] || '';
    const lowestLabel = DOMAIN_LABELS[lowestDomain as Domain].toLowerCase();

    if (totalScore <= 30) return `Your organization is in the early stages of capturing ambient ROI. Time is being saved, but value capture is largely unmeasured and unstructured. Your biggest opportunity is in ${lowestLabel} \u2014 ${domainInsight.toLowerCase()}`;
    if (totalScore <= 50) return `Your organization is beginning to capture ambient ROI${weakDomains.length > 0 ? `, but ${weakDomains.join(' and ')} remain${weakDomains.length === 1 ? 's' : ''} in early stages` : ''}. Your biggest opportunity is in ${lowestLabel} \u2014 ${domainInsight.toLowerCase()}`;
    if (totalScore <= 70) return `Your organization is actively managing ambient ROI in ${strongDomains.join(' and ') || 'some domains'}${weakDomains.length > 0 ? `, but ${weakDomains.join(' and ')} remain${weakDomains.length === 1 ? 's' : ''} in early stages` : ''}. Your biggest opportunity is in ${lowestLabel} \u2014 ${domainInsight.toLowerCase()}`;
    if (totalScore <= 85) return `Your organization is strategically managing ambient ROI across ${strongDomains.join(', ') || 'multiple domains'}. Focus on ${lowestLabel} to reach full maturity \u2014 ${domainInsight.toLowerCase()}`;
    return 'Your organization has institutionalized ambient ROI across all four domains. This is strategic-level documentation intelligence.';
  }, [domainData, totalScore]);

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(false);
    setExportSuccess(false);
    try {
      const pdfData: AmbientAssessmentPDFData = {
        organizationName: exportOrgName || "Your Organization",
        preparedBy: exportPreparedBy || undefined,
        assessmentDate: new Date().toLocaleDateString("en-US", {
          month: "long", day: "numeric", year: "numeric"
        }),
        providers,
        annualEncounters,
        utilization,
        timeSavings,
        documentationScore: totalScore,
        totalAnnualGap: dt,
        monthlyGap: displayedMonthly,
        dailyGap: displayedDaily,
        actNow3yr,
        wait6mo3yr: Math.round(dt * (3.45 - 0.42)),
        wait12mo3yr: Math.round(dt * (3.45 - 0.95)),
        permanentlyLost6mo,
        permanentlyLost12mo,
        revenuePerVisit,
        providerRate: inputs.providerRate || 150,
        conversionFactor: inputs.conversionFactor || 33,
        assessmentNarrative,
        orgContext: {
          systemSize: (inputs as any).systemSize || 0,
          orgType: (inputs as any).orgType || '',
          payerMixMedicare: (inputs as any).payerMixMedicare || 0,
          payerMixMedicaid: (inputs as any).payerMixMedicaid || 0,
          payerMixCommercial: (inputs as any).payerMixCommercial || 0,
        },
        domains: {
          capacity: domainData.capacity as any,
          revenue: domainData.revenue as any,
          workforce: domainData.workforce as any,
          risk: domainData.risk as any,
        },
      };
      await generateAmbientAssessmentPDF(pdfData);
      setExportSuccess(true);
    } catch (err) {
      console.error('PDF generation failed:', err instanceof Error ? err.message : err, err);
      setExportError(true);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <motion.div
        className="bg-[#1A1A1A] rounded-xl -mx-4 sm:-mx-6 px-4 sm:px-6 py-8 sm:py-10 md:py-12 mb-8 sm:mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-[800px] mx-auto text-center">
          <p className="text-[12px] font-medium text-white/40 uppercase tracking-[2px] mb-6" data-testid="text-hero-label">
            Your Ambient AI Assessment
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-16 mb-8">
            <div>
              <p className="text-[12px] font-medium text-white/40 uppercase tracking-[1.5px] mb-2">Your Score</p>
              <p className="text-[40px] sm:text-[56px] md:text-[64px] font-bold text-white leading-none" data-testid="hero-score-value">
                {totalScore}
              </p>
              <p className="text-lg text-white/30 font-normal mt-1">/ 100</p>
            </div>

            <div className="hidden sm:block w-px h-20 bg-white/10" />

            <div>
              <p className="text-[12px] font-medium text-white/40 uppercase tracking-[1.5px] mb-2">Measured Value</p>
              {hasMeasuredDomains ? (
                <>
                  <p className="text-[28px] sm:text-[40px] md:text-[48px] font-bold text-[#EA2C00] leading-none" data-testid="hero-total-value">
                    {formatDollar(displayedTotal)}
                  </p>
                  <p className="text-lg text-white/30 font-normal mt-1">annually</p>
                </>
              ) : (
                <p className="text-[28px] font-bold text-white/30 leading-none" data-testid="hero-total-value">
                  Not yet measured
                </p>
              )}
            </div>
          </div>

          <p className="text-sm text-white/50 leading-relaxed max-w-[500px] mx-auto" data-testid="text-capture-line">
            {heroNarrative}
          </p>
        </div>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
        <div className="flex-1 max-w-[700px]">

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="bg-[#F5F0EB] rounded-lg p-5 sm:p-8 md:p-10 mb-8" data-testid="card-roadmap">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                Your Roadmap to Full Scale
              </p>
              <div className="h-px bg-[#E5E7EB] mb-2" />
              <p className="text-sm text-[#888888] leading-relaxed mb-6">
                Each domain has a defined next level. Here's what unlocking it looks like — and what it makes possible.
              </p>

              {ROADMAP_STRATEGIC_ORDER.map((domain) => {
                const d = domainData[domain];
                const level = (d?.activationLevel || 1) as ActivationLevel;
                const cardCopy = ROADMAP_CARDS[domain as Domain][level];
                return (
                  <div key={domain} className="border border-[#E5E7EB] rounded-lg p-5 mb-3 bg-white/60" data-testid={`roadmap-${domain}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-[#EA2C00] uppercase tracking-[1px]">
                        {DOMAIN_LABELS[domain as Domain]}
                      </p>
                      <span className="text-[11px] font-medium text-[#888888] bg-[#F5F0EB] rounded-full px-2.5 py-0.5">
                        Level {level} of 4
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-black leading-snug mb-2">
                      {cardCopy.currentStateLabel}
                    </p>
                    {level < 4 && (
                      <div className="border-l-2 border-[#EA2C00] pl-3 mt-3">
                        <p className="text-[11px] font-semibold text-[#EA2C00] uppercase tracking-[1px] mb-1">
                          Next level unlocks
                        </p>
                        <p className="text-sm text-[#444444] leading-relaxed">
                          {cardCopy.nextLevelUnlock}
                        </p>
                      </div>
                    )}
                    {level === 4 && (
                      <p className="text-sm text-[#888888] leading-relaxed italic mt-1">
                        Leading practice. Continue deepening integration and governance.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
          >
            <div className="bg-[#F5F0EB] rounded-lg p-5 sm:p-8 md:p-10" data-testid="card-invitation">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                The Conversation Worth Having
              </p>
              <div className="h-px bg-[#E5E7EB] mb-6" />

              <h2 className="text-xl md:text-2xl font-bold text-black font-abridge uppercase tracking-tight leading-[1.3] mb-4" data-testid="text-invitation-headline">
                Let's walk through your roadmap together.
              </h2>
              <p className="text-sm text-[#888888] leading-relaxed mb-6">
                Bring this assessment to a working session with Abridge. We'll walk each domain's next level against your operational realities — and map a sequenced plan that fits where you actually are.
              </p>

              <div className="flex flex-col items-start gap-3">
                <Button
                  onClick={() => onNavigateToExplore?.(providers, annualEncounters)}
                  className="bg-[#EA2C00] text-white border-[#EA2C00] rounded-full px-6 font-medium gap-2"
                  data-testid="button-explore-value"
                >
                  Explore Value with Abridge →
                  <ArrowRight size={16} />
                </Button>
                <button
                  onClick={openExportModal}
                  className="text-sm text-[#888888] underline underline-offset-2 hover:text-black transition-colors bg-transparent border-none cursor-pointer"
                  data-testid="button-export"
                >
                  Download Your Assessment
                </button>
              </div>

            </div>
          </motion.div>

          <p className="text-xs text-[#888888] leading-relaxed mt-8 mb-4 italic" data-testid="text-summary-disclaimer">
            This assessment provides directional estimates based on organizational self-assessment and the inputs you provide. It does not guarantee specific financial outcomes. Benchmarks reflect maturity-based scoring and aggregated deployment data. Roadmap guidance is general — specific implementation should be tailored to your organization. Individual results vary. Methodology available on request.
          </p>
        </div>

        <motion.div
          className="w-full lg:w-[320px] flex-shrink-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
        >
          <div className="bg-[#1A1A1A] rounded-xl p-6 lg:sticky lg:top-24" data-testid="panel-summary">

            <p className="text-[12px] font-medium text-white/40 uppercase tracking-[2px] mb-4">
              Assessment Summary
            </p>

            <div className="flex items-end gap-3 mb-1">
              <span className="text-white font-bold text-[36px] sm:text-[48px] leading-none" data-testid="panel-score">
                {totalScore}
              </span>
              <span className="text-white/30 text-lg mb-1">/ 100</span>
            </div>
            <p className="text-xs text-white/40 mb-5">Ambient Assessment Score</p>

            <div className="h-px bg-white/10 my-4" />

            <p className="text-[12px] font-medium text-white/40 uppercase tracking-[1.5px] mb-3">
              Measured Value
            </p>

            {hasMeasuredDomains ? (
              <>
                <p className="font-bold text-2xl text-[#EA2C00] leading-none mb-1" data-testid="panel-total-value">
                  {formatDollar(displayedTotal)}
                </p>
                <p className="text-xs text-white/40 mb-4">annually</p>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-5">
                  <div>
                    <p className="text-white font-bold text-base sm:text-lg leading-none" data-testid="panel-monthly">
                      ${displayedMonthly.toLocaleString()}
                    </p>
                    <p className="text-[11px] sm:text-[12px] text-white/40 uppercase tracking-wide mt-1">/ month</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-base sm:text-lg leading-none" data-testid="panel-daily">
                      ${displayedDaily.toLocaleString()}
                    </p>
                    <p className="text-[11px] sm:text-[12px] text-white/40 uppercase tracking-wide mt-1">/ day</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="font-bold text-xl text-white/30 leading-none mb-1" data-testid="panel-total-value">
                  Not yet measured
                </p>
                <p className="text-xs text-white/40 mb-4">complete domain inputs to see value</p>
              </>
            )}

            <div className="h-px bg-white/10 my-5" />

            <p className="text-[12px] font-medium text-white/40 uppercase tracking-[1.5px] mb-3">
              Domain Scores
            </p>
            <div className="space-y-2">
              {DOMAIN_ORDER.map((domain) => (
                <div key={domain} className="flex items-center justify-between text-sm">
                  <span className="text-white/60">{DOMAIN_LABELS[domain]}</span>
                  <span className="text-white font-semibold" data-testid={`panel-domain-score-${domain}`}>
                    {domainData[domain]?.score || 0}
                  </span>
                </div>
              ))}
            </div>

            <div className="h-px bg-white/10 my-5" />

            <p className="text-[12px] font-medium text-white/40 uppercase tracking-[1.5px] mb-3">
              Your Inputs
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Providers</span>
                <span className="text-white/80 font-medium">{providers}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Encounters / yr</span>
                <span className="text-white/80 font-medium">{annualEncounters.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Utilization</span>
                <span className="text-white/80 font-medium">{utilization}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Time saved</span>
                <span className="text-white/80 font-medium">{timeSavings > 0 ? `${timeSavings} min` : '—'}</span>
              </div>
            </div>

            <div className="h-px bg-white/10 my-5" />

            <p className="text-xs text-white/40 mb-2">Completed {assessmentDate}</p>
            <p className="text-xs text-white/40 leading-relaxed italic">
              Based on organizational self-assessment. Estimates are directional. Individual results vary.
            </p>

          </div>
        </motion.div>
      </div>

      <Dialog open={exportModalOpen} onOpenChange={(open) => { setExportModalOpen(open); if (!open) setExportSuccess(false); }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#EA2C00]" />
              Export Ambient Assessment
            </DialogTitle>
            <DialogDescription>
              Generate a professional PDF report with your assessment results, domain analysis, and cost-of-inaction projections.
            </DialogDescription>
          </DialogHeader>

          {exportError ? (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg" data-testid="text-pdf-error">PDF Generation Failed</h3>
                <p className="text-sm text-neutral-500 mt-1">
                  Something went wrong. Please try again.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  className="flex-1"
                  onClick={() => { setExportError(false); handleExport(); }}
                  data-testid="button-retry-pdf"
                >
                  Retry
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setExportModalOpen(false)}
                  data-testid="button-close-error"
                >
                  Close
                </Button>
              </div>
            </div>
          ) : !exportSuccess ? (
            <div className="space-y-5 py-3">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="export-org-name" className="text-sm font-medium">
                    Organization name
                  </Label>
                  <Input
                    id="export-org-name"
                    placeholder="e.g., Memorial Health System"
                    value={exportOrgName}
                    onChange={(e) => setExportOrgName(e.target.value)}
                    data-testid="input-export-org-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="export-prepared-by" className="text-sm font-medium">
                    Prepared by (optional)
                  </Label>
                  <Input
                    id="export-prepared-by"
                    placeholder="e.g., Partner Success Team"
                    value={exportPreparedBy}
                    onChange={(e) => setExportPreparedBy(e.target.value)}
                    data-testid="input-export-prepared-by"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-neutral-500 border-t pt-4">
                <span>Estimated length: <span className="font-medium">8 pages</span></span>
                <span>Format: <span className="font-medium">PDF</span></span>
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setExportModalOpen(false)}
                  data-testid="button-cancel-export"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-[#EA2C00]"
                  onClick={handleExport}
                  disabled={isExporting}
                  data-testid="button-generate-pdf"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Generate PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">PDF Generated Successfully</h3>
                <p className="text-sm text-neutral-500 mt-1">
                  Check your downloads folder for the file.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleExport}
                  data-testid="button-download-again"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Again
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setExportModalOpen(false)}
                  data-testid="button-close-export"
                >
                  <X className="mr-2 h-4 w-4" />
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
