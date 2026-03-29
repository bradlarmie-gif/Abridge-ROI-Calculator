import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Stethoscope, Zap, HeartPulse, ClipboardList } from "lucide-react";
import { useAssessment } from "@/lib/assessment";
import { formatDollar, formatDollarFull } from "./ambientCalculator";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  type Domain, type ActivationLevel,
  DOMAIN_ORDER, DOMAIN_LABELS, ACTIVATION_LABELS,
  scoreToActivationLevel,
  ANNUAL_HOURS,
  tenureLabel, tenureMonthsMidpoint, tenureIsLong,
} from "./domainCalculations";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";

interface Screen5Props {
  onNext: () => void;
  onBack: () => void;
  onNavigateToBaseline?: () => void;
}

function CountUpNumber({ target, duration = 1400, prefix = "$" }: { target: number; duration?: number; prefix?: string }) {
  const [current, setCurrent] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startTime.current = null;
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return <>{prefix}{current.toLocaleString()}</>;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const gap = payload.find((p: any) => p.dataKey === 'gap');
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 shadow-sm text-xs">
      <p className="font-semibold text-black mb-1">Month {label}</p>
      {gap && <p className="text-[#EA2C00] font-bold">Unmeasured value: {formatDollar(gap.value)}</p>}
      <p className="text-[#888888] mt-1">accumulated since deployment</p>
    </div>
  );
}

export default function Screen5Gap({ onNext, onBack, onNavigateToBaseline }: Screen5Props) {
  const { state } = useAssessment();
  const { inputs } = state;

  const DOMAIN_ICONS: Record<Domain, typeof Stethoscope> = {
    capacity: Stethoscope,
    revenue: Zap,
    workforce: HeartPulse,
    risk: ClipboardList,
  };

  const providers = inputs.providers || 0;
  const annualEncounters = inputs.annualEncounters || 0;
  const utilization = inputs.utilization || 0;
  const userTimeSaved = (inputs as any).timeSavedPerEncounter || 0;

  const benchmarkUtilization = 76;
  const benchmarkTimeSavedLow = 2;
  const benchmarkTimeSavedHigh = 4;

  const documentedEncounters = Math.round(annualEncounters * (utilization / 100));
  const benchmarkDocumentedEncounters = Math.round(annualEncounters * (benchmarkUtilization / 100));
  const userHoursRecovered = Math.round((documentedEncounters * userTimeSaved) / 60);
  const benchmarkHoursRecovered = Math.round((benchmarkDocumentedEncounters * 3) / 60);

  const domainLevels: Record<Domain, number> = useMemo(() => ({
    capacity: scoreToActivationLevel('capacity', inputs.capacityScore || 0),
    revenue: scoreToActivationLevel('revenue', inputs.revenueScore || 0),
    workforce: scoreToActivationLevel('workforce', inputs.workforceScore || 0),
    risk: scoreToActivationLevel('risk', inputs.riskScore || 0),
  }), [inputs.capacityScore, inputs.revenueScore, inputs.workforceScore, inputs.riskScore]);

  const domainHasValue: Record<Domain, boolean> = useMemo(() => ({
    capacity: inputs.capacityHasValue || false,
    revenue: inputs.revenueHasValue || false,
    workforce: inputs.workforceHasValue || false,
    risk: inputs.riskHasValue || false,
  }), [inputs.capacityHasValue, inputs.revenueHasValue, inputs.workforceHasValue, inputs.riskHasValue]);

  const domainGaps: Record<Domain, number> = useMemo(() => ({
    capacity: inputs.capacityGap || 0,
    revenue: inputs.revenueGap || 0,
    workforce: inputs.workforceGap || 0,
    risk: inputs.riskGap || 0,
  }), [inputs.capacityGap, inputs.revenueGap, inputs.workforceGap, inputs.riskGap]);

  const nextLevelContents: Record<Domain, {
    domainLabel: string;
    currentLevelLabel: string;
    nextLevelLabel: string | null;
    narrative: string;
    formula: string | null;
    lowEstimate: number | null;
    highEstimate: number | null;
  }> = useMemo(() => {
    const result = {} as Record<Domain, any>;
    for (const domain of DOMAIN_ORDER) {
      const level = domainLevels[domain] as ActivationLevel;
      const nextLevel = Math.min(level + 1, 4) as ActivationLevel;
      const domainLabel = DOMAIN_LABELS[domain];
      const currentLevelLabel = ACTIVATION_LABELS[domain][level];
      const nextLevelLabel = level < 4 ? ACTIVATION_LABELS[domain][nextLevel] : null;

      let narrative = '';
      let formula: string | null = null;
      let lowEstimate: number | null = null;
      let highEstimate: number | null = null;

      if (domainHasValue[domain] && inputs[`${domain}Context` as keyof typeof inputs]) {
        narrative = inputs[`${domain}Context` as keyof typeof inputs] as string || '';
        formula = inputs[`${domain}Formula` as keyof typeof inputs] as string || null;
        lowEstimate = domainGaps[domain];
        highEstimate = domainGaps[domain];
      } else {
        const domainInputsStr = inputs[`${domain}DomainInputs` as keyof typeof inputs] as string || '{}';
        let domainInputs: any = {};
        try { domainInputs = JSON.parse(domainInputsStr); } catch {}

        if (domain === 'capacity') {
          if (level === 1) {
            lowEstimate = Math.round(providers * 1000);
            highEstimate = Math.round(providers * 3000);
            narrative = `Recovered time is generating value. It hasn't been counted yet. Organizations at your scale (${providers > 0 ? providers.toLocaleString() + ' providers' : 'similar size'}) typically find $${lowEstimate.toLocaleString()}–$${highEstimate.toLocaleString()} per year in access revenue when they first run this analysis.\n\nOPPORTUNITY AHEAD: Start with a time-tracking study across a cohort of providers. Even a 30-day pilot generates the data needed to confirm or refute the benchmark range.`;
            formula = `Benchmark range: ${providers} providers × $1,000–$3,000 = $${lowEstimate.toLocaleString()}–$${highEstimate.toLocaleString()}/year\n\nSource: MGMA Physician Compensation data; published literature on access revenue from documentation efficiency`;
          } else if (level === 2) {
            const revenuePerVisit = inputs.revenuePerVisit || 200;
            const benchmarkPatientsLow = 3;
            const benchmarkPatientsHigh = 8;
            const annualVisitsLow = Math.round(providers * benchmarkPatientsLow * 11);
            const annualVisitsHigh = Math.round(providers * benchmarkPatientsHigh * 11);
            lowEstimate = Math.round(annualVisitsLow * revenuePerVisit);
            highEstimate = Math.round(annualVisitsHigh * revenuePerVisit);
            narrative = `Recovered time is actively being directed. The next step is measuring how many additional patients are being seen.\n\nOPPORTUNITY AHEAD: Organizations with structured access redesign report 3–8 additional patients/provider/month. At ${providers.toLocaleString()} providers × $${revenuePerVisit}/visit, that's ${formatDollarFull(lowEstimate)}–${formatDollarFull(highEstimate)} annually.`;
            formula = `${providers} providers × ${benchmarkPatientsLow}–${benchmarkPatientsHigh} patients/month × 11 months × $${revenuePerVisit}/visit = ${formatDollarFull(lowEstimate)}–${formatDollarFull(highEstimate)}`;
          } else if (level === 3) {
            const accessRevenue = domainInputs.accessRevenue || 0;
            const revenuePerVisit = inputs.revenuePerVisit || 200;
            lowEstimate = Math.round(accessRevenue * revenuePerVisit * 0.8);
            highEstimate = Math.round(accessRevenue * revenuePerVisit);
            narrative = `Access is expanding. The next level tracks the downstream impact on scheduling efficiency and care team capacity — not just appointment volume.\n\nOPPORTUNITY AHEAD: ${formatDollarFull(lowEstimate)}–${formatDollarFull(highEstimate)} annually from optimized scheduling and care team capacity.`;
            formula = `${accessRevenue} additional visits × $${revenuePerVisit} revenue per visit = ${formatDollarFull(highEstimate)}`;
          } else {
            narrative = 'Your capacity domain is at full maturity. Time recovery is tracked, converted to access, and integrated into scheduling and workforce planning.';
          }
        } else if (domain === 'revenue') {
          if (level === 1) {
            lowEstimate = Math.round(providers * 4000);
            highEstimate = Math.round(providers * 12000);
            narrative = `Documentation quality has improved. Whether reimbursement followed is the question — and the answer is almost always yes. Organizations at your scale typically find $${lowEstimate.toLocaleString()}–$${highEstimate.toLocaleString()} per year in coding and denial impact when they first run this analysis.\n\nOPPORTUNITY AHEAD: A retrospective coding audit — comparing pre/post ambient documentation — typically takes 4–6 weeks and produces the data needed to confirm the benchmark range.`;
            formula = `Benchmark range: ${providers} providers × $4,000–$12,000 = $${lowEstimate.toLocaleString()}–$${highEstimate.toLocaleString()}/year\n\nSource: AMA/MGMA coding benchmarks; published studies on documentation-driven revenue improvement (2–7%)`;
          } else if (level === 2) {
            narrative = `Directional signals are visible. Your organization has observed trends suggesting documentation is affecting reimbursement, but the impact has not been formally validated.\n\nOPPORTUNITY AHEAD: A formal before/after analysis (Level 3) would quantify the signal. Organizations with validated measurement have reported 2–7% revenue improvement.`;
            formula = null;
            lowEstimate = null;
            highEstimate = null;
          } else if (level === 3) {
            const codingGain = domainInputs.codingGain || 0;
            lowEstimate = Math.round(codingGain * 0.85);
            highEstimate = Math.round(codingGain * 1.15);
            narrative = `Revenue impact is confirmed and validated. The next level integrates CDI workflows and denial management into a unified reimbursement optimization program.\n\nOPPORTUNITY AHEAD: ${formatDollarFull(lowEstimate)}–${formatDollarFull(highEstimate)} in additional reimbursement from integrated CDI and denial management.`;
            formula = `Validated coding gain: $${codingGain.toLocaleString()} (±15% range)`;
          } else {
            narrative = 'Your revenue domain is at full maturity. Documentation-driven coding, CDI, and denial management are integrated and generating confirmed value.';
          }
        } else if (domain === 'workforce') {
          if (level === 1) {
            lowEstimate = Math.round(providers * 1500);
            highEstimate = Math.round(providers * 4000);
            narrative = `Provider burden has decreased. The retention and workforce economics of that decrease haven't been formally counted yet. Organizations at your scale typically find $${lowEstimate.toLocaleString()}–$${highEstimate.toLocaleString()} per year in avoided turnover and burden costs when they first run this analysis.\n\nOPPORTUNITY AHEAD: A provider satisfaction survey benchmarked against pre-ambient baseline is typically the fastest path to confirming this range.`;
            formula = `Benchmark range: ${providers} providers × $1,500–$4,000 = $${lowEstimate.toLocaleString()}–$${highEstimate.toLocaleString()}/year\n\nSource: AMGA Physician Retention Survey; replacement cost literature range $250K–$500K per physician`;
          } else if (level === 2) {
            const satisfactionLift = domainInputs.satisfactionLift || 10;
            const turnoverCost = domainInputs.turnoverCost || 50000;
            const turnoverReduction = Math.round(providers * (satisfactionLift / 100) * 0.3);
            const calculated = Math.round(turnoverReduction * turnoverCost);
            lowEstimate = Math.round(calculated * 0.7);
            highEstimate = calculated;
            narrative = `Provider satisfaction data exists. The next step is connecting that satisfaction signal to retention outcomes and modeling the avoided turnover value.\n\nOPPORTUNITY AHEAD: ${formatDollarFull(lowEstimate)}–${formatDollarFull(highEstimate)} annually in avoided turnover costs once the satisfaction-retention connection is validated.`;
            formula = `${providers} providers × ${satisfactionLift}% satisfaction lift × 30% retention effect × $${turnoverCost.toLocaleString()} replacement cost = ${formatDollarFull(calculated)}`;
          } else if (level === 3) {
            const retentionValue = domainInputs.retentionValue || 0;
            lowEstimate = Math.round(retentionValue * 0.9);
            highEstimate = Math.round(retentionValue * 1.1);
            narrative = `Workforce ROI is confirmed and tracked. The next level integrates workforce planning — using the data to inform hiring, scheduling, and load balancing decisions.\n\nOPPORTUNITY AHEAD: ${formatDollarFull(lowEstimate)}–${formatDollarFull(highEstimate)} from workforce planning optimization on top of confirmed retention value.`;
            formula = `Validated retention value: $${retentionValue.toLocaleString()} (±10% range)`;
          } else {
            narrative = 'Your workforce domain is at full maturity. Provider satisfaction, retention, and workforce planning are integrated and generating confirmed value.';
          }
        } else if (domain === 'risk') {
          if (level === 1) {
            lowEstimate = Math.round(providers * 1000);
            highEstimate = Math.round(providers * 3000);
            narrative = `Documentation quality has improved. The downstream value — in quality programs, compliance, and CDI — hasn't been connected to it yet. Organizations at your scale typically find $${lowEstimate.toLocaleString()}–$${highEstimate.toLocaleString()} per year in quality and compliance value when they first run this analysis.\n\nOPPORTUNITY AHEAD: Start with a documentation completeness audit. It typically generates the baseline data needed to build the quality program.`;
            formula = `Benchmark range: ${providers} providers × $1,000–$3,000 = $${lowEstimate.toLocaleString()}–$${highEstimate.toLocaleString()}/year\n\nSource: CMS quality penalty exposure data; CDI program ROI literature`;
          } else if (level === 2) {
            const qualityScore = domainInputs.qualityScore || 70;
            const complianceRisk = domainInputs.complianceRisk || 0.02;
            const calculated = Math.round(annualEncounters * complianceRisk * 500);
            lowEstimate = Math.round(calculated * 0.8);
            highEstimate = calculated;
            narrative = `Quality monitoring is in place. The next step is connecting that monitoring to payer contracts and compliance programs.\n\nOPPORTUNITY AHEAD: ${formatDollarFull(lowEstimate)}–${formatDollarFull(highEstimate)} annually in confirmed quality and compliance value once connected to payer programs.`;
            formula = `${annualEncounters.toLocaleString()} encounters × ${Math.round(complianceRisk * 100)}% risk rate × $500 avg impact = ${formatDollarFull(calculated)}`;
          } else if (level === 3) {
            const qualityValue = domainInputs.qualityValue || 0;
            lowEstimate = Math.round(qualityValue * 0.9);
            highEstimate = Math.round(qualityValue * 1.2);
            narrative = `Quality infrastructure is built and connected to payer programs. The next level integrates population health management and value-based care metrics.\n\nOPPORTUNITY AHEAD: ${formatDollarFull(lowEstimate)}–${formatDollarFull(highEstimate)} from value-based care program integration.`;
            formula = `Validated quality value: $${qualityValue.toLocaleString()} (range ±10–20%)`;
          } else {
            narrative = 'Your quality domain is at full maturity. Documentation quality, compliance programs, and value-based care metrics are integrated and generating confirmed value.';
          }
        }

        result[domain] = { domainLabel, currentLevelLabel, nextLevelLabel, narrative, formula, lowEstimate, highEstimate };
      }

      if (!result[domain]) {
        result[domain] = {
          domainLabel: DOMAIN_LABELS[domain],
          currentLevelLabel: ACTIVATION_LABELS[domain][domainLevels[domain] as ActivationLevel],
          nextLevelLabel: domainLevels[domain] < 4 ? ACTIVATION_LABELS[domain][Math.min(domainLevels[domain] + 1, 4) as ActivationLevel] : null,
          narrative: inputs[`${domain}Context` as keyof typeof inputs] as string || '',
          formula: inputs[`${domain}Formula` as keyof typeof inputs] as string || null,
          lowEstimate: domainGaps[domain] || null,
          highEstimate: domainGaps[domain] || null,
        };
      }
    }
    return result;
  }, [domainLevels, domainHasValue, domainGaps, inputs, providers, annualEncounters, documentedEncounters]);

  const totalMeasured = useMemo(() => {
    let sum = 0;
    for (const d of DOMAIN_ORDER) {
      if (domainHasValue[d]) {
        if (d === 'revenue' && domainLevels[d] === 2) continue;
        sum += domainGaps[d];
      }
    }
    return sum;
  }, [domainHasValue, domainGaps, domainLevels]);

  const unmeasuredLow = useMemo(() => {
    let sum = 0;
    for (const d of DOMAIN_ORDER) {
      if (domainLevels[d] === 1 && !domainHasValue[d]) {
        sum += nextLevelContents[d].lowEstimate ?? 0;
      }
    }
    return sum;
  }, [domainLevels, domainHasValue, nextLevelContents]);

  const unmeasuredHigh = useMemo(() => {
    let sum = 0;
    for (const d of DOMAIN_ORDER) {
      if (domainLevels[d] === 1 && !domainHasValue[d]) {
        sum += nextLevelContents[d].highEstimate ?? nextLevelContents[d].lowEstimate ?? 0;
      }
    }
    return sum;
  }, [domainLevels, domainHasValue, nextLevelContents]);

  const allAtLevel4 = DOMAIN_ORDER.every(d => domainLevels[d] >= 4);

  const totalNextLevel = useMemo(() => {
    let sum = 0;
    for (const d of DOMAIN_ORDER) {
      if (domainLevels[d] >= 4) continue;
      sum += nextLevelContents[d].lowEstimate ?? 0;
    }
    return sum;
  }, [domainLevels, nextLevelContents]);

  const strategicAnnual = useMemo(() => {
    let sum = totalMeasured;
    for (const d of DOMAIN_ORDER) {
      if (domainLevels[d] >= 4) continue;
      if (!domainHasValue[d]) {
        sum += nextLevelContents[d].lowEstimate ?? 0;
      }
    }
    return sum;
  }, [totalMeasured, nextLevelContents, domainLevels, domainHasValue]);

  const annualGap = unmeasuredLow;

  const chartData = useMemo(() => {
    const g = strategicAnnual - totalMeasured;
    if (g <= 0) return [];
    return [
      { month: 0,  gap: 0 },
      { month: 4,  gap: Math.round(g * 0.08) },
      { month: 8,  gap: Math.round(g * 0.22) },
      { month: 12, gap: Math.round(g * 0.42) },
      { month: 16, gap: Math.round(g * 0.68) },
      { month: 20, gap: Math.round(g * 1.02) },
      { month: 24, gap: Math.round(g * 1.45) },
      { month: 28, gap: Math.round(g * 1.98) },
      { month: 32, gap: Math.round(g * 2.52) },
      { month: 36, gap: Math.round(g * 3.1) },
    ];
  }, [strategicAnnual, totalMeasured]);

  const gap36mo = useMemo(() => {
    if (!chartData.length) return 0;
    return chartData[chartData.length - 1].gap;
  }, [chartData]);

  const measuredDomainsList = useMemo(() =>
    DOMAIN_ORDER.filter(d => domainLevels[d] >= 2)
  , [domainLevels]);

  const unmeasuredDomainsList = useMemo(() =>
    DOMAIN_ORDER.filter(d => domainLevels[d] === 1)
  , [domainLevels]);

  const reframeText = useMemo(() => {
    const tenure = inputs.deploymentTenure || '';
    const mNames = measuredDomainsList.map(d => DOMAIN_LABELS[d]);
    const uNames = unmeasuredDomainsList.map(d => DOMAIN_LABELS[d]);
    const join = (arr: string[]) =>
      arr.length === 1 ? arr[0] : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
    const mVerb = mNames.length === 1 ? 'is' : 'are';
    const uVerb = uNames.length === 1 ? "hasn't" : "haven't";

    if (uNames.length === 0) {
      return "You're measuring across all four domains. The gap ahead is in deepening each one — not widening the foundation.";
    }

    const tLabel = tenureLabel(tenure);

    if (mNames.length === 0) {
      if (!tenure || tenure === '0-6') {
        return `The deployment is live. At this stage — less than 6 months in — it's expected that none of the four domains have formal measurement in place yet. The figures below are benchmark ranges from organizations your size that have run this analysis. They're not what you've captured. They're what will be on the table once you start looking.`;
      }
      if (tenure === '6-12' || tenure === '12-24') {
        return `The deployment has been running ${tLabel}. Across all four domains, the value generating from your deployment hasn't been formally analyzed yet. That's the most common pattern at this stage. It's also where the gap between organizations that move and organizations that don't begins to compound.`;
      }
      if (tenure === '24+') {
        return `Two or more years live across ${providers > 0 ? providers.toLocaleString() : 'your'} providers, and no domain has been formally measured. The value has been there. The benchmark ranges below reflect what organizations your size typically find when they first run this analysis. At 2+ years, 'finding it' is no longer the question. The question is how much longer it sits uncounted.`;
      }
    }

    const mStr = join(mNames);
    const uStr = join(uNames);

    if (!tenure || tenure === '0-6' || tenure === '6-12') {
      return `${mStr} ${mVerb} generating confirmed, calculable value. ${uStr} ${uVerb} been formally measured yet. The ranges below reflect what organizations your size typically find when they first analyze those domains — not projections, but what gets found when you look.`;
    }
    if (tenure === '12-24') {
      return `${mStr} ${mVerb} generating confirmed, calculable value. ${uStr} ${uVerb} been formally measured yet — and at 1–2 years in deployment, the question isn't whether that value exists. It's how long it's been there.`;
    }
    if (tenure === '24+') {
      return `${mStr} ${mVerb} generating confirmed value. ${uStr} ${uVerb} been measured — and at 2+ years, that value has been accumulating without formal measurement. The ranges below are benchmarks. At your tenure, the more useful question is: what has the value of acting now become?`;
    }

    return `Your score reflects what your organization has chosen to analyze. ${mStr} ${mVerb} generating confirmed, calculable value. ${uStr} ${uVerb} been formally measured yet. The range sitting in those domains — based on what organizations your size typically find — is significant.`;
  }, [measuredDomainsList, unmeasuredDomainsList, inputs.deploymentTenure, providers]);

  const topDomain = useMemo(() => {
    const measured = DOMAIN_ORDER.filter(d => domainHasValue[d]);
    if (measured.length > 0) {
      return measured.reduce((best, d) => domainGaps[d] > domainGaps[best] ? d : best, measured[0]);
    }
    return DOMAIN_ORDER.find(d => domainLevels[d] === 1) ?? DOMAIN_ORDER[0];
  }, [domainHasValue, domainGaps, domainLevels]);

  const [expandedDomains, setExpandedDomains] = useState<Record<Domain, boolean>>(() => {
    const init: Record<Domain, boolean> = { capacity: false, revenue: false, workforce: false, risk: false };
    return init;
  });

  useEffect(() => {
    setExpandedDomains({ capacity: false, revenue: false, workforce: false, risk: false, [topDomain]: true } as Record<Domain, boolean>);
  }, [topDomain]);
  const toggleDomain = (domain: Domain) => setExpandedDomains(prev => ({ ...prev, [domain]: !prev[domain] }));

  const revL2Value = useMemo(() => {
    if (domainLevels.revenue === 2 && domainHasValue.revenue) return domainGaps.revenue;
    return 0;
  }, [domainLevels.revenue, domainHasValue.revenue, domainGaps.revenue]);

  const qualityAttrCount = useMemo(() => {
    const inp = (inputs.riskDomainInputs as string) || '{}';
    try {
      const parsed: Record<string, string | number> = JSON.parse(inp);
      const csv = (parsed.qualityAttributes as string) || '';
      return csv.split(',').filter(Boolean).length;
    } catch { return 0; }
  }, [inputs.riskDomainInputs]);

  const capacityConfidence = useMemo(() => {
    const inp = (inputs.capacityDomainInputs as string) || '{}';
    try {
      const parsed: Record<string, string | number> = JSON.parse(inp);
      return (parsed.capacityAccessConfidence as string) || '';
    } catch { return ''; }
  }, [inputs.capacityDomainInputs]);

  const domainStatusLine = useMemo((): Record<Domain, { text: string; isConfirmed: boolean; isSignal: boolean }> => {
    const result = {} as Record<Domain, { text: string; isConfirmed: boolean; isSignal: boolean }>;

    for (const d of DOMAIN_ORDER) {
      const level = domainLevels[d];
      const hasValue = domainHasValue[d];
      const gap = domainGaps[d];
      const low = nextLevelContents[d].lowEstimate;
      const high = nextLevelContents[d].highEstimate;
      const range = low && high && high > low
        ? `$${low.toLocaleString()}–$${high.toLocaleString()} est.`
        : low ? `$${low.toLocaleString()} est.` : null;

      if (d === 'capacity') {
        if (level >= 2 && hasValue) result[d] = { text: `${formatDollar(gap)} confirmed · per year`, isConfirmed: true, isSignal: false };
        else if (level === 2) result[d] = { text: 'Time savings measured · access revenue not yet modeled', isConfirmed: false, isSignal: false };
        else result[d] = { text: range ? `Not yet in the picture · ${range}` : 'Not yet measured', isConfirmed: false, isSignal: false };
      } else if (d === 'revenue') {
        if (level >= 3 && hasValue) result[d] = { text: `${formatDollar(gap)} confirmed · per year`, isConfirmed: true, isSignal: false };
        else if (level === 2 && hasValue) result[d] = { text: `${formatDollar(gap)}/yr signal · not yet confirmed in billing`, isConfirmed: false, isSignal: true };
        else if (level === 2) result[d] = { text: 'Coding signals observed · not yet confirmed in billing', isConfirmed: false, isSignal: true };
        else result[d] = { text: range ? `Not yet in the picture · ${range}` : 'Not yet measured', isConfirmed: false, isSignal: false };
      } else if (d === 'workforce') {
        if (level >= 3 && hasValue) result[d] = { text: `${formatDollar(gap)} confirmed · per year`, isConfirmed: true, isSignal: false };
        else if (level === 2) result[d] = { text: 'Satisfaction data present · retention value not yet modeled', isConfirmed: false, isSignal: false };
        else result[d] = { text: range ? `Not yet in the picture · ${range}` : 'Not yet measured', isConfirmed: false, isSignal: false };
      } else {
        if (level >= 3 && hasValue) result[d] = { text: `${formatDollar(gap)} confirmed · per year`, isConfirmed: true, isSignal: false };
        else if (level === 2) result[d] = { text: qualityAttrCount > 0 ? `${qualityAttrCount} of 5 quality dimensions tracked · financial connection not yet built` : 'Quality monitoring active · financial connection not yet built', isConfirmed: false, isSignal: false };
        else result[d] = { text: range ? `Not yet in the picture · ${range}` : 'Not yet measured', isConfirmed: false, isSignal: false };
      }
    }
    return result;
  }, [domainLevels, domainHasValue, domainGaps, nextLevelContents, qualityAttrCount]);

  const bradsRead = useMemo(() => {
    const tenure = inputs.deploymentTenure || '';
    const measuredCount = measuredDomainsList.length;
    const unmeasuredCount = unmeasuredDomainsList.length;

    if (unmeasuredCount === 0) {
      return "You're measuring across all four domains. The next chapter is about deepening each one — not finding new ones. The organizations that move fastest from here are the ones that embed measurement into the regular operating rhythm.";
    }
    if (measuredCount === 0) {
      if (tenure === '24+') {
        return `Two or more years live, and none of the four domains have been formally measured. The value has been there. The question — the one worth asking in this room — is how much longer it waits.`;
      }
      return `The deployment is live. The measurement program hasn't started yet. That's the most common profile at this stage — and it's exactly where the strategic opportunity sits. The organizations that define this internally are the ones that own the story.`;
    }
    if (tenure === '24+' && unmeasuredCount > 0) {
      const uNames = unmeasuredDomainsList.map(d => DOMAIN_LABELS[d]).join(' and ');
      return `At 2+ years, ${uNames} ${unmeasuredCount === 1 ? 'has' : 'have'} been generating value without being counted. The question is whether your organization is going to own that story — or whether it stays in the background.`;
    }
    return `The measurement foundation is in place. ${unmeasuredDomainsList.map(d => DOMAIN_LABELS[d]).join(' and ')} ${unmeasuredDomainsList.length === 1 ? 'is' : 'are'} the next chapter. The question isn't whether the value is there — it's whether this quarter is when the organization decides to measure it.`;
  }, [measuredDomainsList, unmeasuredDomainsList, inputs.deploymentTenure]);

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>

      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3">
          Your Trajectory
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-4 font-abridge uppercase tracking-tight" data-testid="text-gap-heading">
          {inputs.deploymentTenure
            ? `Here's what ${tenureLabel(inputs.deploymentTenure)} of ambient documentation looks like, measured.`
            : "Here's what your ambient deployment looks like, measured."
          }
        </h1>
        <p className="text-sm text-[#525252] leading-relaxed max-w-2xl" data-testid="text-reframe">
          {reframeText}
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
        <div className="flex-1 max-w-[700px]">

          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <div className="bg-[#1A1A1A] rounded-xl p-6 sm:p-8">
              {totalMeasured > 0 ? (
                <>
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-[2px] mb-2">Confirmed Annual Value</p>
                  <p className="font-bold text-[56px] sm:text-[72px] leading-none text-[#EA2C00] tracking-tight mb-2" data-testid="value-measured">
                    <CountUpNumber target={totalMeasured} />
                  </p>
                  <p className="text-sm text-white/40 mb-4">
                    Confirmed across {DOMAIN_ORDER.filter(d => domainHasValue[d] && !(d === 'revenue' && domainLevels[d] === 2)).length} of 4 domains · per year
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-[2px] mb-2">Confirmed Annual Value</p>
                  <p className="font-bold text-[56px] leading-none text-white/15 tracking-tight mb-2" data-testid="value-measured">—</p>
                  <p className="text-sm text-white/30 mb-4">No domains formally measured yet</p>
                </>
              )}

              {unmeasuredLow > 0 && (
                <div className="pt-4 border-t border-white/[0.08]">
                  <p className="text-[10px] font-semibold text-white/25 uppercase tracking-[2px] mb-1">Not yet in the picture</p>
                  <p className="text-xl font-bold text-white/40" data-testid="value-unmeasured">
                    + {unmeasuredHigh > unmeasuredLow
                      ? `$${unmeasuredLow.toLocaleString()}–$${unmeasuredHigh.toLocaleString()}`
                      : `$${unmeasuredLow.toLocaleString()}`} est.
                  </p>
                  <p className="text-[11px] text-white/20 mt-1">benchmark range · based on your scale</p>
                </div>
              )}

              {revL2Value > 0 && (
                <div className="mt-4 pt-4 border-t border-white/[0.08] flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold text-[#F59E0B]/70 uppercase tracking-[1.5px]">Revenue Signal</p>
                    <p className="text-xs text-white/30 mt-0.5">Signals observed · not yet confirmed in billing data · Next: retrospective coding audit</p>
                  </div>
                  <span className="text-sm font-bold text-[#F59E0B]/80 flex-shrink-0">~{formatDollar(revL2Value)}/yr</span>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-3" data-testid="domain-band">
              {DOMAIN_ORDER.map((domain) => {
                const Icon = DOMAIN_ICONS[domain];
                const level = domainLevels[domain];
                const status = domainStatusLine[domain];
                const content = nextLevelContents[domain];
                const isExpanded = expandedDomains[domain];

                return (
                  <div
                    key={domain}
                    className="bg-[#F5F0EB] rounded-xl overflow-hidden"
                    data-testid={`domain-card-${domain}`}
                  >
                    <button
                      type="button"
                      className="w-full text-left p-4 sm:p-5 bg-transparent border-none cursor-pointer hover:bg-black/[0.02] transition-colors"
                      onClick={() => toggleDomain(domain)}
                      data-testid={`toggle-domain-${domain}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 mt-0.5" style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                            <Icon className={`w-4 h-4 ${status.isConfirmed ? 'text-[#EA2C00]' : status.isSignal ? 'text-[#F59E0B]' : 'text-[#AAAAAA]'}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="text-xs font-bold uppercase tracking-[1px] text-[#1A1A1A]">
                                {DOMAIN_LABELS[domain]}
                              </p>
                              <span className={`text-[9px] font-semibold uppercase tracking-[1px] px-1.5 py-0.5 rounded ${
                                level >= 3 ? 'bg-[#EA2C00]/10 text-[#EA2C00]' :
                                level === 2 ? 'bg-[#1A1A1A]/[0.08] text-[#666666]' :
                                'bg-[#1A1A1A]/[0.05] text-[#AAAAAA]'
                              }`}>
                                L{level}
                              </span>
                            </div>
                            <p className={`text-[11px] leading-snug ${
                              status.isConfirmed ? 'text-[#EA2C00] font-medium' :
                              status.isSignal ? 'text-[#92400E]' :
                              'text-[#888888]'
                            }`}>
                              {status.text}
                            </p>
                          </div>
                        </div>
                        <span className="text-[#AAAAAA] text-base flex-shrink-0 mt-1 transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-4 border-t border-[#E5E5E5]/60">
                        <p className="text-xs text-[#888888] leading-relaxed mt-3" data-testid={`narrative-${domain}`}>
                          {content.narrative.split('\n\nOPPORTUNITY AHEAD:')[0]}
                        </p>
                        {content.narrative.includes('OPPORTUNITY AHEAD:') && (
                          <div className="mt-3 pt-3 border-t border-[#E5E5E5]/60">
                            <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-1">The next level unlocks</p>
                            <p className="text-xs text-[#888888] leading-relaxed">
                              {content.narrative.split('OPPORTUNITY AHEAD:')[1].trim()}
                            </p>
                          </div>
                        )}
                        {content.formula && (
                          <div className="bg-white/50 rounded-md p-3 mt-3">
                            <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1px] mb-2">
                              {domainLevels[domain] === 1 ? 'Benchmark Range Formula' : 'How We Got Here'}
                            </p>
                            <pre className="text-xs text-[#888888] font-mono whitespace-pre-wrap leading-relaxed" data-testid={`formula-${domain}`}>
                              {content.formula}
                            </pre>
                          </div>
                        )}
                        {domain === 'capacity' && domainLevels.capacity >= 3 && capacityConfidence === 'aspirational' && (
                          <div className="mt-3 pt-3 border-t border-[#E5E5E5]/60 flex gap-2">
                            <span className="text-[#888888] text-xs flex-shrink-0">⚠</span>
                            <p className="text-[11px] text-[#888888] italic leading-relaxed">
                              Access data marked as a planning target — validate with scheduling records before using in a formal business case.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {chartData.length > 0 && (
            <motion.div
              className="mb-10"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
            >
              <div className="bg-[#F5F0EB] rounded-xl p-5 sm:p-7" data-testid="card-chart">
                <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-[2px] mb-1">
                  Value of Acting Now
                </p>
                <p className="text-sm font-medium text-[#1A1A1A] mb-1">
                  {formatDollar(gap36mo)} in value at stake over 36 months.
                </p>
                <p className="text-xs text-[#888888] mb-5">
                  What closing the measurement gap is worth at your scale.
                </p>
                <div className="h-[200px] sm:h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="gapGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EA2C00" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#EA2C00" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="month"
                        ticks={[0, 12, 24, 36]}
                        tickFormatter={(v: number) => v === 0 ? 'Now' : `Mo ${v}`}
                        tick={{ fontSize: 11, fill: '#9CA3AF' }}
                      />
                      <YAxis
                        tickFormatter={(v) => formatDollar(v)}
                        tick={{ fontSize: 11, fill: '#888888' }}
                        width={70}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="gap"
                        stroke="#EA2C00"
                        strokeWidth={2.5}
                        fill="url(#gapGradient)"
                        dot={{ fill: '#EA2C00', r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Value of acting now"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-[#888888] italic leading-relaxed mt-4" data-testid="text-chart-rationale">
                  Compounds because measurement enables optimization — organizations that measure early improve faster, widening the gap with each passing quarter.
                </p>
              </div>
            </motion.div>
          )}

          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <div className="border-l-4 border-[#EA2C00] pl-5 py-1" data-testid="brads-read">
              <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[2px] mb-3">
                Brad's Read
              </p>
              <p className="text-sm text-[#1A1A1A] leading-relaxed font-medium">
                {bradsRead}
              </p>
            </div>
          </motion.div>

          <div className="mt-8 pt-6 border-t border-[#E5E5E5]">
            <p className="text-xs text-[#AAAAAA] leading-relaxed">
              Dollar values shown are modeled estimates based on user-provided inputs and published industry benchmarks. Capacity: based on MGMA Physician Compensation data and published literature on time-to-access in ambulatory care. Revenue: based on published studies reporting 2–7% revenue improvement from documentation specificity; AMA and MGMA coding benchmarks. Workforce: based on AMGA Physician Retention Survey; replacement cost literature range $250K–$500K per physician. Quality: based on CMS quality penalty exposure data and CDI program ROI literature. Actual results depend on implementation approach, provider adoption, and organizational factors. Abridge makes no guarantee of financial results.
            </p>
          </div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.5 }}>
            <StepFooter onBack={onBack} onNext={onNext} nextLabel="See My Summary →" />
          </motion.div>

          <div className={STEP_FOOTER_SPACER_CLASS} />
        </div>

        <motion.div
          className="w-full lg:w-[280px] flex-shrink-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="bg-[#1A1A1A] rounded-xl p-6 lg:sticky lg:top-24" data-testid="panel-gap-summary">

            {(() => {
              const totalScore = DOMAIN_ORDER.reduce((sum, d) => {
                const lvl = domainLevels[d];
                const scoreMap: Record<number, number> = { 1: 4, 2: 12, 3: 19, 4: 25 };
                return sum + (scoreMap[lvl] ?? 0);
              }, 0);
              const band = totalScore <= 16 ? 'Pre-Measurement' : totalScore <= 38 ? 'Signal' : totalScore <= 60 ? 'Confirmed' : totalScore <= 79 ? 'Managed ROI' : 'Strategic Asset';
              return (
                <div className="flex items-center justify-between mb-6">
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-[2px]">Maturity Score</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{totalScore}</span>
                    <span className="text-[9px] font-semibold text-white/30 border border-white/15 rounded-full px-2 py-0.5 uppercase tracking-[1.5px]">{band}</span>
                  </div>
                </div>
              );
            })()}

            <div className="h-px bg-white/[0.08] mb-6" />

            <p className="text-[10px] font-semibold text-white/35 uppercase tracking-[2px] mb-3">Confirmed Today</p>
            {totalMeasured > 0 ? (
              <p className="font-bold text-[52px] leading-none text-[#EA2C00] tracking-tight mb-1" data-testid="panel-confirmed-value">
                {formatDollar(totalMeasured)}
              </p>
            ) : (
              <p className="font-bold text-[52px] leading-none text-white/15 tracking-tight mb-1">—</p>
            )}
            <p className="text-[11px] text-white/25 mb-6">per year · from your inputs</p>

            {domainHasValue.capacity && domainHasValue.revenue && (
              <p className="text-[10px] text-white/25 leading-relaxed mb-4">
                If your Capacity and Revenue figures reflect activity from the same patient encounters, review the combined total with your finance team before use in a formal business case.
              </p>
            )}

            {unmeasuredLow > 0 && (
              <>
                <div className="h-px bg-white/[0.08] mb-5" />
                <p className="text-[10px] font-semibold text-white/35 uppercase tracking-[2px] mb-2">Not Yet in the Picture</p>
                <p className="font-bold text-2xl text-white/50 leading-none tracking-tight mb-1" data-testid="panel-unmeasured-range">
                  {formatDollar(unmeasuredLow)}–{formatDollar(unmeasuredHigh)}
                </p>
                <p className="text-[11px] text-white/25 mb-5">per year · benchmark range</p>
              </>
            )}

            {!allAtLevel4 && (
              <>
                <div className="h-px bg-white/[0.08] mb-5" />
                <p className="text-[10px] font-semibold text-white/25 uppercase tracking-[2px] mb-2">Full Picture</p>
                <p className="font-bold text-lg text-white/35 leading-none tracking-tight mb-1">{formatDollar(strategicAnnual)}</p>
                <p className="text-[11px] text-white/20 mb-5">confirmed + benchmark low</p>
              </>
            )}

            {inputs.deploymentTenure && (
              <>
                <div className="h-px bg-white/[0.08] mb-5" />
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-[2px] mb-1">In Deployment</p>
                <p className="text-sm font-medium text-white/55">{tenureLabel(inputs.deploymentTenure)}</p>
              </>
            )}

            <div className="h-px bg-white/[0.08] mt-6 mb-5" />
            <p className="text-[11px] text-white/25 leading-relaxed italic">
              The gap between confirmed and potential is the conversation ahead.
            </p>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
