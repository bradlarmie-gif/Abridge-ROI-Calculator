import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { useAssessment } from "@/lib/assessment";
import { formatDollar, formatDollarFull } from "./ambientCalculator";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
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
            narrative = `Ambient has been running, but recovered time hasn't been formally tracked or redeployed. Organizations at your scale (${providers > 0 ? providers.toLocaleString() + ' providers' : 'similar size'}) typically find $${lowEstimate.toLocaleString()}–$${highEstimate.toLocaleString()} per year in access revenue when they first run this analysis.\n\nOPPORTUNITY AHEAD: Start with a time-tracking study across a cohort of providers. Even a 30-day pilot generates the data needed to confirm or refute the benchmark range.`;
            formula = `Benchmark range: ${providers} providers × $1,000–$3,000 = $${lowEstimate.toLocaleString()}–$${highEstimate.toLocaleString()}/year`;
          } else if (level === 2) {
            const minsPerEncounter = domainInputs.minsPerEncounter || 3;
            const conversionRate = domainInputs.conversionRate || 0.25;
            const providerRate = inputs.providerRate || 150;
            const calculated = Math.round((documentedEncounters * minsPerEncounter / 60) * conversionRate * providerRate);
            lowEstimate = calculated;
            highEstimate = Math.round(calculated * 1.5);
            narrative = `Time savings are measured. Now the question is whether that time is being actively redeployed into clinical revenue.\n\nOPPORTUNITY AHEAD: ${formatDollarFull(lowEstimate)}–${formatDollarFull(highEstimate)} annually in access revenue is accessible if recovered time converts to additional appointments.`;
            formula = `${documentedEncounters.toLocaleString()} encounters × ${minsPerEncounter} min saved ÷ 60 × ${Math.round(conversionRate * 100)}% conversion × $${providerRate}/hr = ${formatDollarFull(calculated)}`;
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
            narrative = `Documentation quality has likely improved — but no one has analyzed whether reimbursement has followed. Organizations at your scale typically find $${lowEstimate.toLocaleString()}–$${highEstimate.toLocaleString()} per year in coding and denial impact when they first run this analysis.\n\nOPPORTUNITY AHEAD: A retrospective coding audit — comparing pre/post ambient documentation — typically takes 4–6 weeks and produces the data needed to confirm the benchmark range.`;
            formula = `Benchmark range: ${providers} providers × $4,000–$12,000 = $${lowEstimate.toLocaleString()}–$${highEstimate.toLocaleString()}/year`;
          } else if (level === 2) {
            const wrvuLift = domainInputs.wrvuLift || 0.05;
            const conversionFactor = inputs.conversionFactor || 33;
            const calculated = Math.round(documentedEncounters * wrvuLift * conversionFactor);
            lowEstimate = calculated;
            highEstimate = Math.round(calculated * 1.4);
            narrative = `Coding signals are showing up in the data. Formalizing that signal into a validated reimbursement metric is the next step.\n\nOPPORTUNITY AHEAD: ${formatDollarFull(lowEstimate)}–${formatDollarFull(highEstimate)} annually in confirmed coding impact once the metric is validated.`;
            formula = `${documentedEncounters.toLocaleString()} encounters × ${wrvuLift} wRVU lift × $${conversionFactor} conversion = ${formatDollarFull(calculated)}`;
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
            narrative = `Provider burden has likely decreased — but the workforce and retention impact hasn't been formally measured. Organizations at your scale typically find $${lowEstimate.toLocaleString()}–$${highEstimate.toLocaleString()} per year in avoided turnover and burden costs when they first run this analysis.\n\nOPPORTUNITY AHEAD: A provider satisfaction survey benchmarked against pre-ambient baseline is typically the fastest path to confirming this range.`;
            formula = `Benchmark range: ${providers} providers × $1,500–$4,000 = $${lowEstimate.toLocaleString()}–$${highEstimate.toLocaleString()}/year`;
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
            narrative = `Documentation quality has improved — but no downstream quality program has been connected to it. Organizations at your scale typically find $${lowEstimate.toLocaleString()}–$${highEstimate.toLocaleString()} per year in quality and compliance value when they first run this analysis.\n\nOPPORTUNITY AHEAD: Start with a documentation completeness audit. It typically generates the baseline data needed to build the quality program.`;
            formula = `Benchmark range: ${providers} providers × $1,000–$3,000 = $${lowEstimate.toLocaleString()}–$${highEstimate.toLocaleString()}/year`;
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
      if (domainHasValue[d]) sum += domainGaps[d];
    }
    return sum;
  }, [domainHasValue, domainGaps]);

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

  const annualGap = strategicAnnual - totalMeasured;

  const chartData = useMemo(() => {
    const annualGapOnly = strategicAnnual - totalMeasured;
    return [
      { month: 0, gap: 0 },
      { month: 12, gap: Math.round(annualGapOnly * 0.9) },
      { month: 24, gap: Math.round(annualGapOnly * 1.9) },
      { month: 36, gap: Math.round(annualGapOnly * 2.9) },
    ];
  }, [strategicAnnual, totalMeasured]);

  const gap36mo = chartData[chartData.length - 1].gap;

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
      return `${mStr} ${mVerb} generating confirmed value. ${uStr} ${uVerb} been measured — and at 2+ years, that's a long time for value to be generating without being counted. The ranges below are benchmarks. At your tenure, the more useful question is: what has the cost of not measuring been?`;
    }

    return `Your score reflects what your organization has chosen to analyze. ${mStr} ${mVerb} generating confirmed, calculable value. ${uStr} ${uVerb} been formally measured yet. The range sitting in those domains — based on what organizations your size typically find — is significant.`;
  }, [measuredDomainsList, unmeasuredDomainsList, inputs.deploymentTenure, providers]);

  const [expandedDomains, setExpandedDomains] = useState<Record<Domain, boolean>>({
    capacity: true, revenue: true, workforce: true, risk: true,
  });
  const toggleDomain = (domain: Domain) => setExpandedDomains(prev => ({ ...prev, [domain]: !prev[domain] }));

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight" data-testid="text-gap-heading">
          Here's what that score means.
        </h1>
        <p className="text-base text-[#888888]">
          What you're capturing — and what you haven't analyzed yet.
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
        <div className="flex-1 max-w-[700px]">

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.5 }}>
            <p className="text-sm text-[#525252] leading-relaxed mb-6" data-testid="text-reframe">
              {reframeText}
            </p>
          </motion.div>

          {(totalMeasured > 0 || unmeasuredLow > 0) && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-[#FFF0ED] rounded-lg p-4" data-testid="tile-measured">
                  <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-2">What the Math Shows</p>
                  <p className="font-bold text-xl text-[#EA2C00] leading-none mb-1" data-testid="value-measured">
                    {totalMeasured > 0 ? <CountUpNumber target={totalMeasured} /> : '—'}
                  </p>
                  <p className="text-xs text-[#888888]">per year · from your data</p>
                </div>
                <div className="bg-[#F5F0EB] rounded-lg p-4" data-testid="tile-unmeasured">
                  <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1.5px] mb-2">What Hasn't Been Measured</p>
                  {unmeasuredLow > 0 ? (
                    <>
                      <p className="font-bold text-xl text-[#888888] leading-none mb-1" data-testid="value-unmeasured">
                        {unmeasuredHigh > unmeasuredLow
                          ? `$${unmeasuredLow.toLocaleString()}–$${unmeasuredHigh.toLocaleString()}`
                          : `$${unmeasuredLow.toLocaleString()}`}
                      </p>
                      <p className="text-xs text-[#888888]">per year · benchmark range</p>
                    </>
                  ) : (
                    <p className="font-bold text-xl text-[#888888] leading-none mb-1">—</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-[#888888] italic leading-relaxed mb-8">
                The first number is what the math shows based on your data. The second is a benchmark range — what organizations your size typically find when they analyze domains you haven't measured yet.
              </p>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
            <div className="bg-[#F5F0EB] rounded-lg p-5 sm:p-8 md:p-10 mb-8" data-testid="card-next-level">

              {measuredDomainsList.length > 0 && (
                <div className={unmeasuredDomainsList.length > 0 ? 'mb-8' : ''}>
                  <div className="flex items-center gap-2 mb-5">
                    <span className="w-2 h-2 rounded-full bg-[#EA2C00] flex-shrink-0" />
                    <p className="text-[11px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px]">
                      What You're Capturing
                    </p>
                  </div>
                  {measuredDomainsList.map((domain, idx) => {
                    const content = nextLevelContents[domain];
                    const isExpanded = expandedDomains[domain];
                    return (
                      <div key={domain} data-testid={`next-level-${domain}`}>
                        <button
                          type="button"
                          className="w-full text-left py-4 cursor-pointer bg-transparent border-none hover:bg-white/30 rounded-lg transition-colors px-2 -mx-2"
                          onClick={() => toggleDomain(domain)}
                          data-testid={`toggle-next-level-${domain}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-xs font-semibold uppercase tracking-[1px] text-[#EA2C00]">
                                  {content.domainLabel}
                                </p>
                                <span className="text-xs text-[#EA2C00]">— Level {domainLevels[domain]}</span>
                              </div>
                              {content.nextLevelLabel && (
                                <p className="text-xs text-[#888888]">Next level: {content.nextLevelLabel}</p>
                              )}
                            </div>
                            <span className="text-[#888888] text-lg transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-2 pb-4">
                            {content.narrative.includes('OPPORTUNITY AHEAD:') ? (
                              <div data-testid={`narrative-${domain}`}>
                                <p className="text-sm text-[#888888] leading-relaxed mb-3">
                                  {content.narrative.split('\n\nOPPORTUNITY AHEAD:')[0]}
                                </p>
                                <div className="mt-3 pt-3 border-t border-[#E5E7EB]/50">
                                  <p className="text-[11px] font-semibold text-[#C8372D] uppercase tracking-[1.5px] mb-1.5">The Next Level Unlocks</p>
                                  <p className="text-sm text-[#888888] italic leading-relaxed">
                                    {content.narrative.split('OPPORTUNITY AHEAD:')[1].trim()}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-[#888888] leading-relaxed mb-3" data-testid={`narrative-${domain}`}>
                                {content.narrative}
                              </p>
                            )}
                            {content.formula && (
                              <div className="bg-white/50 rounded-md p-3 mt-3">
                                <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1px] mb-2">How We Got Here</p>
                                <pre className="text-xs text-[#888888] font-mono whitespace-pre-wrap leading-relaxed" data-testid={`formula-${domain}`}>
                                  {content.formula}
                                </pre>
                              </div>
                            )}
                            {domain === 'capacity' && domainLevels.capacity >= 3 && inputs.capacityAccessConfidence === 'aspirational' && (
                              <div className="mt-3 pt-3 border-t border-[#E5E7EB]/50 flex gap-2" data-testid="warning-aspirational-capacity">
                                <span className="text-[#888888] text-sm flex-shrink-0">⚠</span>
                                <p className="text-xs text-[#888888] italic leading-relaxed">
                                  Your access data is marked as a planning target, not confirmed scheduling data. This figure is a planning scenario — validate with actual scheduling records before using it in leadership conversations.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                        {idx < measuredDomainsList.length - 1 && <div className="h-px bg-[#E5E7EB]/50" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {measuredDomainsList.length > 0 && unmeasuredDomainsList.length > 0 && (
                <div className="h-px bg-[#E5E7EB] mb-8" />
              )}

              {unmeasuredDomainsList.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <span className="w-2 h-2 rounded-full bg-[#888888] flex-shrink-0" />
                    <p className="text-[11px] font-semibold text-[#888888] uppercase tracking-[1.5px]">
                      What You Haven't Measured Yet
                    </p>
                  </div>
                  {unmeasuredDomainsList.map((domain, idx) => {
                    const content = nextLevelContents[domain];
                    const isExpanded = expandedDomains[domain];
                    const isLongTenure = tenureIsLong(inputs.deploymentTenure || '');
                    const months = tenureMonthsMidpoint(inputs.deploymentTenure || '');
                    const years = months / 12;
                    const costLow = isLongTenure && content.lowEstimate ? Math.round(content.lowEstimate * years) : 0;
                    const costHigh = isLongTenure && content.highEstimate ? Math.round(content.highEstimate * years) : 0;
                    return (
                      <div key={domain} data-testid={`next-level-${domain}`}>
                        <button
                          type="button"
                          className="w-full text-left py-4 cursor-pointer bg-transparent border-none hover:bg-white/30 rounded-lg transition-colors px-2 -mx-2"
                          onClick={() => toggleDomain(domain)}
                          data-testid={`toggle-next-level-${domain}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-xs font-semibold uppercase tracking-[1px] text-[#888888]">
                                  {content.domainLabel}
                                </p>
                                <span className="text-[10px] font-semibold text-[#888888] border border-[#D1D5DB] rounded px-1.5 py-0.5 uppercase tracking-[1px]">
                                  Not Yet Measured
                                </span>
                              </div>
                              <p className="text-xs text-[#888888]">
                                First step: {ACTIVATION_LABELS[domain][2]}
                              </p>
                            </div>
                            <span className="text-[#888888] text-lg transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-2 pb-4">
                            <p className="text-sm text-[#888888] leading-relaxed mb-3" data-testid={`narrative-${domain}`}>
                              {content.narrative.split('\n\nOPPORTUNITY AHEAD:')[0]}
                            </p>
                            {content.formula && (
                              <div className="bg-white/50 rounded-md p-3 mt-3">
                                <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1px] mb-2">Benchmark Range Formula</p>
                                <pre className="text-xs text-[#888888] font-mono whitespace-pre-wrap leading-relaxed" data-testid={`formula-${domain}`}>
                                  {content.formula}
                                </pre>
                                <p className="text-[11px] text-[#888888] italic mt-2 pt-2 border-t border-[#E5E7EB]/50">
                                  Benchmark range — reflects what organizations at your scale typically find when they first run this analysis. Not a projection.
                                </p>
                              </div>
                            )}
                            {isLongTenure && costLow > 0 && (
                              <div className="mt-4 bg-white/70 rounded-lg p-4" data-testid={`cost-of-time-${domain}`}>
                                <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1.5px] mb-2">What May Already Be On The Table</p>
                                <p className="text-sm text-[#525252] leading-relaxed">
                                  If the benchmark range applies to your organization, and you've been deployed for approximately {months} months, the value that has been generating without being counted could be in the range of{' '}
                                  <span className="font-semibold text-black">
                                    ${costLow.toLocaleString()}–${costHigh.toLocaleString()}
                                  </span>
                                  {' '}over that period.
                                </p>
                                <p className="text-xs text-[#888888] italic mt-2">
                                  This is illustrative, not a confirmed figure. It uses the benchmark range multiplied by your approximate deployment tenure.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                        {idx < unmeasuredDomainsList.length - 1 && <div className="h-px bg-[#E5E7EB]/50" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {annualGap > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
              <div className="bg-[#F5F0EB] rounded-lg p-5 sm:p-8 md:p-10 mb-8" data-testid="card-chart">
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">
                  Cost of Inaction
                </p>
                <p className="text-sm text-[#888888] mb-6">
                  Value accumulating unmeasured each year you don't act — at your scale.
                </p>
                <div className="h-[220px] sm:h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="month"
                        tickFormatter={(v) => `Mo ${v}`}
                        tick={{ fontSize: 11, fill: '#888888' }}
                      />
                      <YAxis
                        tickFormatter={(v) => formatDollar(v)}
                        tick={{ fontSize: 11, fill: '#888888' }}
                        width={70}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="gap"
                        stroke="#EA2C00"
                        strokeWidth={3}
                        dot={{ fill: '#EA2C00', r: 5 }}
                        activeDot={{ r: 7 }}
                        name="Unmeasured value accumulating"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-sm text-[#888888] leading-relaxed mt-4" data-testid="text-chart-summary">
                  At your current measurement pace, approximately <span className="font-bold text-black">{formatDollar(gap36mo)}</span> in value will have accumulated unmeasured over 36 months.
                </p>
                <p className="text-xs text-[#888888] italic mt-2">
                  Based on low-end benchmark ranges for unmeasured domains at your scale. Individual results vary.
                </p>
              </div>
            </motion.div>
          )}

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

            <p className="text-[12px] font-medium text-white/50 uppercase tracking-[1.5px] mb-2">
              Full Potential
            </p>
            <p className="text-xs text-white/30 leading-relaxed mb-5">
              If every domain reached next-level maturity — low-end estimate.
            </p>

            {allAtLevel4 ? (
              <p className="font-bold text-2xl text-white leading-none mb-1" data-testid="panel-hero-value">
                Full value captured
              </p>
            ) : (
              <p className="font-bold text-[44px] sm:text-[52px] text-white leading-none mb-1" data-testid="panel-hero-value">
                {formatDollar(strategicAnnual)}
              </p>
            )}
            <p className="text-xs text-white/30 mb-6">per year</p>

            <div className="h-px bg-white/10 mb-5" />

            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-medium text-white/40 uppercase tracking-[1.5px] mb-1">Confirmed Today</p>
                <p className="font-bold text-xl text-[#EA2C00] leading-none" data-testid="panel-confirmed-value">
                  {totalMeasured > 0 ? formatDollar(totalMeasured) : '—'}
                </p>
                <p className="text-xs text-white/30 mt-0.5">per year · from your data</p>
              </div>

              {unmeasuredLow > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-white/40 uppercase tracking-[1.5px] mb-1">Not Yet Measured</p>
                  <p className="font-bold text-xl text-white/60 leading-none" data-testid="panel-unmeasured-range">
                    {unmeasuredHigh > unmeasuredLow
                      ? `${formatDollar(unmeasuredLow)}–${formatDollar(unmeasuredHigh)}`
                      : formatDollar(unmeasuredLow)}
                  </p>
                  <p className="text-xs text-white/30 mt-0.5">per year · benchmark range</p>
                </div>
              )}
            </div>

            {inputs.deploymentTenure && (
              <>
                <div className="h-px bg-white/10 mb-4 mt-5" />
                <div>
                  <p className="text-[11px] font-medium text-white/40 uppercase tracking-[1.5px] mb-1">Time in Deployment</p>
                  <p className="font-medium text-sm text-white/70">{tenureLabel(inputs.deploymentTenure)}</p>
                </div>
              </>
            )}

            <div className="h-px bg-white/10 my-5" />

            <p className="text-xs text-white/30 leading-relaxed italic">
              The gap between confirmed and potential is the conversation ahead. The organizations measuring all of this don't get there alone.
            </p>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
