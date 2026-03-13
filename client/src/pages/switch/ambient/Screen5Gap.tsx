import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { useAssessment } from "@/lib/assessment";
import { formatDollar, formatDollarFull } from "./ambientCalculator";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Legend, Tooltip,
} from "recharts";
import {
  type Domain, type ActivationLevel,
  DOMAIN_ORDER, DOMAIN_LABELS, ACTIVATION_LABELS,
  scoreToActivationLevel,
  ANNUAL_HOURS,
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
  const strategic = payload.find((p: any) => p.dataKey === 'strategic');
  const current = payload.find((p: any) => p.dataKey === 'current');
  const gap = (strategic?.value || 0) - (current?.value || 0);
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 shadow-sm">
      <p className="text-xs font-semibold text-black mb-1.5">{label}</p>
      {strategic && <p className="text-xs text-[#EA2C00]">With strategic action: {formatDollarFull(strategic.value)}</p>}
      {current && <p className="text-xs text-[#888888]">Current trajectory: {formatDollarFull(current.value)}</p>}
      <p className="text-xs font-bold text-[#EA2C00] mt-1">Gap: {formatDollarFull(gap)}</p>
    </div>
  );
}

interface NextLevelContent {
  domainLabel: string;
  currentLevelLabel: string;
  nextLevelLabel: string | null;
  narrative: string;
  formula?: string;
  lowEstimate?: number;
  highEstimate?: number;
}

function getNextLevelContent(
  domain: Domain,
  level: ActivationLevel,
  providers: number,
  documentedEncounters: number,
  revenuePerVisit: number,
  providerRate: number,
  currentValue: number,
  hasValue: boolean,
  recoveredHours: number = 0,
  netTimeSaved: number = 3,
  annualEncounters: number = 0,
): NextLevelContent {
  const base: NextLevelContent = {
    domainLabel: DOMAIN_LABELS[domain].toUpperCase(),
    currentLevelLabel: ACTIVATION_LABELS[domain][level],
    nextLevelLabel: level < 4 ? ACTIVATION_LABELS[domain][(level + 1) as ActivationLevel] : null,
    narrative: '',
  };

  if (domain === 'capacity') {
    if (level === 1) {
      const hoursFromUserInput = Math.round((netTimeSaved * annualEncounters) / 60);
      const bmkValueLow = Math.round(hoursFromUserInput * providerRate * 0.20);
      const bmkValueHigh = Math.round(hoursFromUserInput * providerRate * 0.35);
      base.narrative = `The time is coming back. The number isn't in front of anyone yet. That's the gap — not the hours, but what happens to them without a name attached.${annualEncounters > 0 ? `\n\nOPPORTUNITY AHEAD: When the total hours are quantified and in front of leadership, organizations typically move from awareness to deployment within one quarter — unlocking ${formatDollar(bmkValueLow)}–${formatDollar(bmkValueHigh)} annually at your scale.` : ''}`;
      if (annualEncounters > 0) {
        base.formula = `${netTimeSaved} min × ${annualEncounters.toLocaleString()} encounters / 60 = ${hoursFromUserInput.toLocaleString()} hrs\nLow: ${hoursFromUserInput.toLocaleString()} hrs × $${providerRate.toLocaleString()}/hr × 20% = ${formatDollar(bmkValueLow)}\nHigh: ${hoursFromUserInput.toLocaleString()} hrs × $${providerRate.toLocaleString()}/hr × 35% = ${formatDollar(bmkValueHigh)}`;
        base.lowEstimate = bmkValueLow;
        base.highEstimate = bmkValueHigh;
      }
    } else if (level === 2) {
      const hardSavings = Math.round(recoveredHours * providerRate * 0.25);
      const additionalVisits = Math.round(recoveredHours / 0.5);
      const revenueOpportunity = additionalVisits * revenuePerVisit;
      if (recoveredHours > 0) {
        base.narrative = `Your ${recoveredHours.toLocaleString()} recovered hours — at $${providerRate.toLocaleString()}/hr with 25% redeployment = ${formatDollar(hardSavings)} in hard savings, plus capacity for ${additionalVisits.toLocaleString()} additional patient visits at $${revenuePerVisit.toLocaleString()} = ${formatDollar(revenueOpportunity)} in potential revenue. The question your organization hasn't answered yet is whether that time can be structurally converted into access.`;
        base.formula = `Hard savings: ${recoveredHours.toLocaleString()} hrs × $${providerRate.toLocaleString()}/hr × 25% = ${formatDollar(hardSavings)}\nAdditional visits: ${recoveredHours.toLocaleString()} hrs / 0.5 hrs per visit = ${additionalVisits.toLocaleString()} visits\nRevenue: ${additionalVisits.toLocaleString()} visits × $${revenuePerVisit.toLocaleString()} = ${formatDollar(revenueOpportunity)}\nTotal opportunity: ${formatDollar(hardSavings + revenueOpportunity)}`;
        base.lowEstimate = hardSavings;
        base.highEstimate = hardSavings + revenueOpportunity;
      } else {
        const bmkHours = Math.round((documentedEncounters * netTimeSaved) / 60);
        const bmkValueLow = Math.round(bmkHours * providerRate * 0.20);
        const bmkValueHigh = Math.round(bmkHours * providerRate * 0.35);
        base.narrative = `Benchmark: ${netTimeSaved} min saved × ${documentedEncounters.toLocaleString()} encounters ÷ 60 = ${bmkHours.toLocaleString()} hours recovered. At $${providerRate.toLocaleString()}/hr with 20–35% redeployment = ${formatDollar(bmkValueLow)}–${formatDollar(bmkValueHigh)} annually. The question your organization hasn't answered yet is whether that time can be structurally converted into access.`;
        base.formula = `${netTimeSaved} min × ${documentedEncounters.toLocaleString()} encounters / 60 = ${bmkHours.toLocaleString()} hrs\nLow: ${bmkHours.toLocaleString()} hrs × $${providerRate.toLocaleString()}/hr × 20% = ${formatDollar(bmkValueLow)}\nHigh: ${bmkHours.toLocaleString()} hrs × $${providerRate.toLocaleString()}/hr × 35% = ${formatDollar(bmkValueHigh)}`;
        base.lowEstimate = bmkValueLow;
        base.highEstimate = bmkValueHigh;
      }
    } else if (level === 3) {
      const low = 1 * providerRate * ANNUAL_HOURS;
      const high = 3 * providerRate * ANNUAL_HOURS;
      base.narrative = `You're generating ${hasValue ? formatDollar(currentValue) : 'measured capacity value'} through access redesign. The next level of maturity is using recovered capacity as a planning variable — informing hiring decisions, site expansion, and service line strategy. Organizations at this level report 1-3 FTE equivalent impact in workforce planning.`;
      base.formula = `1 FTE × $${providerRate.toLocaleString()}/hr × ${ANNUAL_HOURS.toLocaleString()} = ${formatDollar(low)}\n3 FTE × $${providerRate.toLocaleString()}/hr × ${ANNUAL_HOURS.toLocaleString()} = ${formatDollar(high)}`;
      base.lowEstimate = low;
      base.highEstimate = high;
    } else {
      base.narrative = "Capacity is fully connected to operational decisions. The work here is deepening it — expanding the number of providers in the model, tightening the link between recovered time and financial outcomes, and keeping hiring plans informed by ambient data.";
    }
  } else if (domain === 'revenue') {
    if (level === 1) {
      base.narrative = "Your revenue cycle team hasn't engaged with the documentation change yet. The first step is asking whether coding or CDI teams have noticed a difference — most organizations are surprised by what surfaces.";
    } else if (level === 2) {
      const low = Math.round(documentedEncounters * revenuePerVisit * 0.02);
      const high = Math.round(documentedEncounters * revenuePerVisit * 0.07);
      base.narrative = `You've identified revenue signals but haven't quantified the impact. Organizations who move from signals to measurement typically find 2-7% improvement in coding-related revenue. At your encounter volume, even 2% represents ${formatDollar(low)} annually.`;
      base.formula = `${documentedEncounters.toLocaleString()} encounters × $${revenuePerVisit.toLocaleString()} × 2% = ${formatDollar(low)}\n${documentedEncounters.toLocaleString()} encounters × $${revenuePerVisit.toLocaleString()} × 7% = ${formatDollar(high)}`;
      base.lowEstimate = low;
      base.highEstimate = high;
    } else if (level === 3) {
      base.narrative = `You've measured ${hasValue ? formatDollar(currentValue) : 'documentation-driven revenue impact'}. The next level of maturity is making documentation quality an ongoing, governed input to revenue cycle operations — not a one-time study. Organizations at this level treat documentation quality the way they treat charge capture: continuously monitored and optimized.`;
    } else {
      base.narrative = "Revenue cycle is fully connected. The work here is deepening it — documentation quality governance, payer negotiations, and the financial story that comes with it.";
    }
  } else if (domain === 'workforce') {
    if (level === 1) {
      base.narrative = "Providers report less after-hours work. The next step is quantifying it — in-clinic time plus a structured provider survey turns that anecdotal relief into a retention-relevant data point.";
    } else if (level === 2) {
      const midpoint = Math.round(providers * 0.07 * 350000);
      const attributionLow = Math.round(midpoint * 0.20);
      const attributionHigh = Math.round(midpoint * 0.30);
      base.narrative = `Effort reduction is measured. What hasn't been asked yet is what turnover is costing — and how much of it traces back to documentation burden. At industry-average rates, that exposure is significant at your scale.`;
      base.formula = `At ${providers.toLocaleString()} providers, industry midpoints put total annual turnover cost at ${formatDollar(midpoint)}. Burden-driven attribution of 20–30% puts the ambient-connected exposure at ${formatDollar(attributionLow)}–${formatDollar(attributionHigh)}.`;
      base.lowEstimate = midpoint;
    } else if (level === 3) {
      base.narrative = `You've quantified ${hasValue ? formatDollar(currentValue) : 'turnover exposure'}. The next level of maturity is seeing documentation burden reduction show up in actual labor spend — reduced agency reliance, reduced locum usage. Organizations at this level report $5K-$30K/month in agency and locum spend reduction.`;
      base.formula = `$5K × 12 = $60K annually (low end)\n$30K × 12 = $360K annually (high end)`;
      base.lowEstimate = 60000;
      base.highEstimate = 360000;
    } else {
      base.narrative = "You're at the highest maturity level. Continue tracking agency and locum spend against documentation burden metrics to validate the long-term trend.";
    }
  } else if (domain === 'risk') {
    if (level === 1) {
      const riskL1Low = Math.round(documentedEncounters * revenuePerVisit * 0.02 / 1000);
      const riskL1High = Math.round(documentedEncounters * revenuePerVisit * 0.05 / 1000);
      base.narrative = `Documentation quality is improving across every encounter. Without systematic monitoring, that signal never reaches coding, CDI, or quality teams — and the risk-adjusted revenue it represents stays invisible. Year 1 of quality monitoring typically surfaces the highest-impact gaps first.\n\nTHE NEXT LEVEL UNLOCKS: Organizations that move from informal to structured quality monitoring in Year 1 typically capture an initial 2–5% improvement in coding accuracy across ambient-documented encounters. At your scale, that translates to $${riskL1Low.toLocaleString()}K–$${riskL1High.toLocaleString()}K in Year 1 uplift — before deepening downstream integration.`;
      base.formula = `${documentedEncounters.toLocaleString()} encounters × $${revenuePerVisit.toLocaleString()} × 2% = $${riskL1Low.toLocaleString()}K (low)\n${documentedEncounters.toLocaleString()} encounters × $${revenuePerVisit.toLocaleString()} × 5% = $${riskL1High.toLocaleString()}K (high)\nFirst-year capture rate: 2–5% of documentation-driven revenue uplift`;
      base.lowEstimate = riskL1Low * 1000;
      base.highEstimate = riskL1High * 1000;
    } else if (level === 2) {
      const riskLow = Math.round(documentedEncounters * 0.15 * 75 / 1000) * 1000;
      const riskHigh = Math.round(documentedEncounters * 0.15 * 200 / 1000) * 1000;
      base.narrative = `You're tracking quality dimensions. The next step is connecting documentation quality to the workflows that depend on it — CDI, coding, quality reporting, chart abstraction. Each connection unlocks operational efficiency and positions your documentation infrastructure for what's coming: AI-driven CDI, automated quality reporting, and structured data for payer negotiations.\n\nOPPORTUNITY AHEAD: Active monitoring at this level supports documentation accuracy. Organizations advancing to Level 3–4 with closed-loop correction typically capture an additional $75–$200 per patient in HCC/risk-adjustment accuracy. At ${documentedEncounters.toLocaleString()} encounters, that's a ${formatDollar(riskLow)}–${formatDollar(riskHigh)} annual opportunity at the next level.`;
    } else if (level === 3) {
      const riskL3Low = Math.round(documentedEncounters * 0.15 * 125 / 1000) * 1000;
      const riskL3High = Math.round(documentedEncounters * 0.15 * 300 / 1000) * 1000;
      base.narrative = `You've connected downstream workflows${hasValue ? `, saving an estimated ${formatDollar(currentValue)} annually` : ''}. The next level is making documentation quality a strategic input — informing payer strategy, value-based care design, and compliance governance. This is where documentation stops being a clinical byproduct and becomes organizational intelligence.\n\nOPPORTUNITY AHEAD: With correction workflows in place, your organization is positioned to quantify risk-adjustment accuracy. Benchmark: $125–$300 per relevant encounter at 15% risk-adjustment relevance = ${formatDollar(riskL3Low)}–${formatDollar(riskL3High)} annual opportunity.`;
    } else {
      base.narrative = "You're at the highest maturity level. Your documentation infrastructure is positioned for next-generation AI applications — from automated prior authorization to predictive quality reporting. Continue expanding the data asset across organizational strategy.";
    }
  }

  return base;
}

export default function Screen5Gap({ onNext, onBack, onNavigateToBaseline }: Screen5Props) {
  const { state } = useAssessment();
  const { inputs } = state;

  const providers = inputs.providers || 0;
  const annualEncounters = inputs.annualEncounters || 0;
  const utilization = inputs.utilization || 0;
  const revenuePerVisit = inputs.revenuePerVisit || 200;
  const providerRate = inputs.providerRate || 150;
  const documentedEncounters = Math.round(annualEncounters * (utilization / 100));
  const benchmarkUtilization = 76;
  const benchmarkTimeSavedLow = 2.0;
  const benchmarkTimeSavedHigh = 3.0;
  const benchmarkDocumentedEncounters = Math.round(annualEncounters * (benchmarkUtilization / 100));
  const benchmarkHoursRecovered = Math.round((benchmarkDocumentedEncounters * benchmarkTimeSavedHigh) / 60);
  const userTimeSaved = inputs.timeSavedPerEncounter || 0;
  const userHoursRecovered = userTimeSaved > 0 ? Math.round((documentedEncounters * userTimeSaved) / 60) : 0;

  const domainScores: Record<Domain, number> = useMemo(() => ({
    capacity: inputs.capacityScore || 0,
    revenue: inputs.revenueScore || 0,
    workforce: inputs.workforceScore || 0,
    risk: inputs.riskScore || 0,
  }), [inputs.capacityScore, inputs.revenueScore, inputs.workforceScore, inputs.riskScore]);

  const domainLevels: Record<Domain, ActivationLevel> = useMemo(() => ({
    capacity: scoreToActivationLevel('capacity', domainScores.capacity),
    revenue: scoreToActivationLevel('revenue', domainScores.revenue),
    workforce: scoreToActivationLevel('workforce', domainScores.workforce),
    risk: scoreToActivationLevel('risk', domainScores.risk),
  }), [domainScores]);

  const domainGaps: Record<Domain, number> = useMemo(() => ({
    capacity: inputs.capacityGap || 0,
    revenue: inputs.revenueGap || 0,
    workforce: inputs.workforceGap || 0,
    risk: inputs.riskGap || 0,
  }), [inputs.capacityGap, inputs.revenueGap, inputs.workforceGap, inputs.riskGap]);

  const domainHasValue: Record<Domain, boolean> = useMemo(() => ({
    capacity: inputs.capacityHasValue || false,
    revenue: inputs.revenueHasValue || false,
    workforce: inputs.workforceHasValue || false,
    risk: inputs.riskHasValue || false,
  }), [inputs.capacityHasValue, inputs.revenueHasValue, inputs.workforceHasValue, inputs.riskHasValue]);

  const totalMeasured = useMemo(() => {
    let sum = 0;
    for (const d of DOMAIN_ORDER) {
      if (domainHasValue[d]) sum += domainGaps[d];
    }
    return sum;
  }, [domainGaps, domainHasValue]);

  const hasMeasuredDomains = DOMAIN_ORDER.some(d => domainHasValue[d]);
  const allAtLevel4 = DOMAIN_ORDER.every(d => domainLevels[d] === 4);

  const nextLevelContents = useMemo(() => {
    const result: Record<Domain, NextLevelContent> = {} as any;
    for (const d of DOMAIN_ORDER) {
      result[d] = getNextLevelContent(
        d, domainLevels[d], providers, documentedEncounters,
        revenuePerVisit, providerRate, domainGaps[d], domainHasValue[d],
        userHoursRecovered,
        userTimeSaved > 0 ? userTimeSaved : benchmarkTimeSavedHigh,
        annualEncounters
      );
    }
    return result;
  }, [domainLevels, providers, documentedEncounters, revenuePerVisit, providerRate, domainGaps, domainHasValue, userHoursRecovered, userTimeSaved, benchmarkTimeSavedHigh, annualEncounters]);

  const estimatedTotal = useMemo(() => {
    let sum = 0;
    for (const d of DOMAIN_ORDER) {
      if (domainLevels[d] >= 4) continue;
      if (domainHasValue[d]) {
        sum += domainGaps[d];
      } else {
        sum += nextLevelContents[d].lowEstimate ?? 0;
      }
    }
    return sum;
  }, [domainLevels, domainHasValue, domainGaps, nextLevelContents]);

  const strategicAnnual = useMemo(() => {
    let sum = totalMeasured;
    for (const d of DOMAIN_ORDER) {
      const content = nextLevelContents[d];
      if (content.lowEstimate && domainLevels[d] < 4) {
        sum += content.lowEstimate;
      }
    }
    return sum;
  }, [totalMeasured, nextLevelContents, domainLevels]);

  const annualGap = strategicAnnual - totalMeasured;
  const monthlyGap = Math.round(annualGap / 12);

  const displayedMonthly = Math.round(totalMeasured / 12);
  const displayedWeekly = Math.round(totalMeasured / 52);
  const displayedDaily = Math.round(totalMeasured / 365);

  const chartData = useMemo(() => {
    const points = [
      { months: 0, label: 'Today' },
      { months: 6, label: '6mo' },
      { months: 12, label: '12mo' },
      { months: 18, label: '18mo' },
      { months: 24, label: '24mo' },
      { months: 36, label: '36mo' },
    ];
    return points.map(p => ({
      label: p.label,
      strategic: Math.round(totalMeasured + strategicAnnual * (p.months / 12)),
      current: Math.round(totalMeasured + totalMeasured * (p.months / 12)),
    }));
  }, [strategicAnnual, totalMeasured]);

  const gap36mo = chartData[chartData.length - 1].strategic - chartData[chartData.length - 1].current;
  const sixMonthGap = Math.round(annualGap / 2);
  const wait12mo = annualGap;

  const [expandedDomains, setExpandedDomains] = useState<Record<Domain, boolean>>({
    capacity: true, revenue: true, workforce: true, risk: true,
  });

  const toggleDomain = (d: Domain) => {
    setExpandedDomains(prev => ({ ...prev, [d]: !prev[d] }));
  };

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>

      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight" data-testid="text-gap-heading">
          What staying here costs you.
        </h1>
        <p className="text-base text-[#888888]">
          The gap between your current trajectory and full deployment — modeled across 36 months.
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
        <div className="flex-1 max-w-[700px]">

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
            <div className="bg-[#F5F0EB] rounded-lg p-5 sm:p-8 md:p-10 mb-8" data-testid="card-deployment-reality">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                Where You Stand Today
              </p>
              <div className="h-px bg-[#E5E7EB] mb-6" />

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E7EB]">
                      <th className="text-left py-2 font-medium text-[#888888] text-xs uppercase tracking-wide"></th>
                      <th className="text-right py-2 font-medium text-[#888888] text-xs uppercase tracking-wide">You</th>
                      <th className="text-right py-2 font-medium text-[#888888] text-xs uppercase tracking-wide">Peer Benchmark</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#E5E7EB]/50">
                      <td className="py-3 font-semibold text-black">Utilization</td>
                      <td className="py-3 text-right font-bold text-black" data-testid="reality-util-you">{utilization > 0 ? `${utilization}%` : '—'}</td>
                      <td className="py-3 text-right text-[#888888]">{benchmarkUtilization}%</td>
                    </tr>
                    <tr className="border-b border-[#E5E7EB]/50">
                      <td className="py-3 font-semibold text-black">Time saved / encounter</td>
                      <td className="py-3 text-right font-bold text-black" data-testid="reality-time-you">
                        {userTimeSaved > 0 ? `${userTimeSaved} min` : (
                          onNavigateToBaseline ? (
                            <button type="button" onClick={onNavigateToBaseline} className="text-xs text-[#E8350A] underline cursor-pointer bg-transparent border-none p-0" data-testid="link-add-time-saved">Add in baseline →</button>
                          ) : '—'
                        )}
                      </td>
                      <td className="py-3 text-right text-[#888888]">{benchmarkTimeSavedLow}–{benchmarkTimeSavedHigh} min</td>
                    </tr>
                    <tr className="border-b border-[#E5E7EB]/50">
                      <td className="py-3 font-semibold text-black">Documented encounters</td>
                      <td className="py-3 text-right font-bold text-black" data-testid="reality-encounters-you">{documentedEncounters > 0 ? documentedEncounters.toLocaleString() : '—'}</td>
                      <td className="py-3 text-right text-[#888888]">{benchmarkDocumentedEncounters.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-semibold text-black">Hours recovered annually</td>
                      <td className="py-3 text-right font-bold text-black" data-testid="reality-hours-you">
                        {userHoursRecovered > 0 ? `${userHoursRecovered.toLocaleString()} hrs` : (
                          userTimeSaved <= 0 && onNavigateToBaseline ? (
                            <button type="button" onClick={onNavigateToBaseline} className="text-xs text-[#E8350A] underline cursor-pointer bg-transparent border-none p-0" data-testid="link-add-hours-recovered">Add in baseline →</button>
                          ) : '—'
                        )}
                      </td>
                      <td className="py-3 text-right text-[#888888]">{benchmarkHoursRecovered.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-[#888888] italic mt-4 leading-relaxed">
                Peer benchmark reflects top-performing Abridge deployments.
              </p>
            </div>
          </motion.div>

          {(hasMeasuredDomains || annualGap > 0) && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
              <div className="bg-[#F5F0EB] rounded-lg p-5 sm:p-8 md:p-10 mb-8" data-testid="card-chart">
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                  36-Month Trajectory
                </p>
                <p className="text-sm text-[#888888] mb-6">
                  Your current path vs. what full maturity unlocks.
                </p>
                <div className="h-[220px] sm:h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 5, left: 5, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#888888' }} />
                      <YAxis
                        tickFormatter={(v: number) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`}
                        tick={{ fontSize: 12, fill: '#888888' }}
                        width={70}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        formatter={(value: string) => (
                          <span className="text-xs text-black">
                            {value === 'strategic' ? 'With strategic action' : 'Status quo (current path)'}
                          </span>
                        )}
                        wrapperStyle={{ paddingTop: 12 }}
                      />
                      <Line type="monotone" dataKey="strategic" stroke="#EA2C00" strokeWidth={2} dot={{ r: 4, fill: '#EA2C00' }} fill="none" name="strategic" />
                      <Line type="monotone" dataKey="current" stroke="#888888" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: '#888888' }} fill="none" name="current" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <p className="text-sm text-[#888888] leading-relaxed mt-4" data-testid="text-chart-summary">
                  The 36-month gap between your current path and full maturity: approximately <span className="font-bold text-black">{formatDollar(gap36mo)}</span>.
                </p>
                <p className="text-xs text-[#888888] italic mt-2">
                  Year 1 includes a 90-day ramp. Years 2–3 project at maintained optimization.
                </p>
                <p className="text-xs text-[#888888] italic mt-1">
                  Projections based on your inputs and next-level benchmark ranges (low end). Actual results depend on organizational execution. Individual results vary.
                </p>
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}>
            <div className="bg-[#F5F0EB] rounded-lg p-5 sm:p-8 md:p-10 mb-8" data-testid="card-next-level">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                What Drives the Gap
              </p>
              <div className="h-px bg-[#E5E7EB] mb-6" />

              {DOMAIN_ORDER.map((domain, idx) => {
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
                          <p className="text-xs font-medium text-[#EA2C00] uppercase tracking-[1px]">
                            {content.domainLabel} — Level {domainLevels[domain]}
                          </p>
                          {content.nextLevelLabel && (
                            <p className="text-xs text-[#888888] mt-0.5">
                              Next level: {content.nextLevelLabel}
                            </p>
                          )}
                        </div>
                        <span className="text-[#888888] text-lg transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          ▾
                        </span>
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
                              <p className="text-[11px] font-semibold text-[#C8372D] uppercase tracking-[1.5px] mb-1.5">
                                The Next Level Unlocks
                              </p>
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
                          <div className="bg-white/50 rounded-md p-3">
                            <pre className="text-xs text-[#888888] font-mono whitespace-pre-wrap leading-relaxed" data-testid={`formula-${domain}`}>
                              {content.formula}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    {idx < DOMAIN_ORDER.length - 1 && <div className="h-px bg-[#E5E7EB]/50" />}
                  </div>
                );
              })}
            </div>

          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.5 }}>
            <StepFooter onBack={onBack} onNext={onNext} nextLabel="See My Summary →" />
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0, duration: 0.5 }}>
            <p className="text-xs text-[#888888] italic mt-4 leading-relaxed" data-testid="text-gap-disclaimer">
              Projections are directional estimates based on your inputs and published benchmark data. Ranges reflect next-level maturity modeling using conservative assumptions. Actual results depend on organizational execution and market conditions. Individual results vary.
            </p>
          </motion.div>

          <div className={STEP_FOOTER_SPACER_CLASS} />
        </div>

        <motion.div
          className="w-full lg:w-[320px] flex-shrink-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
        >
          <div className="bg-[#1A1A1A] rounded-xl p-6 lg:sticky lg:top-24" data-testid="panel-gap-summary">

            <p className="text-[12px] font-medium text-white/50 uppercase tracking-[1.5px] mb-4">
              Value at a Glance
            </p>
            <p className="text-xs text-white/40 leading-relaxed mb-4">
              Based on your inputs and maturity levels across all four domains:
            </p>

            {allAtLevel4 ? (
              <>
                <p className="font-bold text-xl text-white leading-none mb-1" data-testid="panel-hero-value">
                  Full value captured
                </p>
                <p className="text-xs text-white/40 mb-5">Your deployment is at strategic maturity across all four domains.</p>
              </>
            ) : (
              <>
                <p className="font-bold text-2xl sm:text-3xl text-[#EA2C00] leading-none mb-1" data-testid="panel-hero-value">
                  {formatDollar(estimatedTotal)}
                </p>
                <p className="text-xs text-white/40 mb-5">estimated annually (benchmark low-end)</p>
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
                  <div>
                    <p className="text-white font-bold text-base sm:text-lg leading-none" data-testid="value-monthly">
                      ${Math.round(estimatedTotal / 12).toLocaleString()}
                    </p>
                    <p className="text-[11px] sm:text-[12px] text-white/40 uppercase tracking-wide mt-1">/ month</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-base sm:text-lg leading-none" data-testid="value-weekly">
                      ${Math.round(estimatedTotal / 52).toLocaleString()}
                    </p>
                    <p className="text-[11px] sm:text-[12px] text-white/40 uppercase tracking-wide mt-1">/ week</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-base sm:text-lg leading-none" data-testid="value-daily">
                      ${Math.round(estimatedTotal / 365).toLocaleString()}
                    </p>
                    <p className="text-[11px] sm:text-[12px] text-white/40 uppercase tracking-wide mt-1">/ day</p>
                  </div>
                </div>
              </>
            )}

            <div className="h-px bg-white/10 my-5" />

            <p className="text-[12px] font-medium text-white/50 uppercase tracking-[1.5px] mb-3">
              With Strategic Action
            </p>
            <p className="font-bold text-xl sm:text-2xl text-white leading-none mb-1" data-testid="panel-strategic-value">
              {formatDollar(strategicAnnual)}
            </p>
            <p className="text-xs text-white/40 mb-2">projected annually (low-end estimates)</p>
            {estimatedTotal > 0 && (
              <p className="text-sm text-[#EA2C00] font-bold" data-testid="panel-gap-amount">
                Gap: +{formatDollar(estimatedTotal)} / year
              </p>
            )}

            <div className="h-px bg-white/10 my-5" />

            <p className="text-[12px] font-medium text-white/50 uppercase tracking-[1.5px] mb-3">
              The Trajectory Gap
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">Monthly momentum gap</span>
                <span className="font-bold text-sm text-[#EA2C00]" data-testid="value-wait-monthly">
                  {formatDollar(monthlyGap)}
                </span>
              </div>
              <p className="text-[11px] text-white/40 italic leading-relaxed">
                Value your deployment is positioned to capture as each domain matures.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">6-month trajectory gap</span>
                <span className="font-bold text-sm text-[#EA2C00]" data-testid="value-wait-6mo">
                  {formatDollar(sixMonthGap)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">Annual trajectory gap</span>
                <span className="font-bold text-sm text-[#EA2C00]" data-testid="value-wait-12mo">
                  {formatDollar(wait12mo)}
                </span>
              </div>
              <p className="text-[11px] text-white/30 italic leading-relaxed mt-1" data-testid="text-ramp-note">
                Reflects projected run-rate value at next-level maturity. First 3–6 months include a ramp period.
              </p>
            </div>

            <div className="h-px bg-white/10 my-5" />

            <p className="text-[12px] font-medium text-white/50 uppercase tracking-[1.5px] mb-3">
              Domain Values
            </p>
            <div className="space-y-2">
              {DOMAIN_ORDER.map((domain) => {
                const isAtL4 = domainLevels[domain] >= 4;
                const hasConfirmed = domainHasValue[domain];
                const displayValue = hasConfirmed
                  ? domainGaps[domain]
                  : (isAtL4 ? 0 : (nextLevelContents[domain].lowEstimate ?? 0));
                return (
                  <div key={domain} className="flex items-center justify-between text-sm">
                    <span className="text-white/70">{DOMAIN_LABELS[domain]}</span>
                    <span className={hasConfirmed ? "text-white font-semibold" : "text-white/50 text-xs"} data-testid={`sidebar-domain-${domain}`}>
                      {isAtL4 ? 'Captured' : formatDollar(displayValue)}
                      {!hasConfirmed && !isAtL4 && displayValue > 0 ? ' *' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
            {DOMAIN_ORDER.some(d => !domainHasValue[d] && domainLevels[d] < 4) && (
              <p className="text-[10px] text-white/30 mt-2">* benchmark low-end estimate</p>
            )}

            <div className="h-px bg-white/10 my-5" />

            <p className="text-xs text-white/60 leading-relaxed italic">
              Based on your inputs and next-level projections. Individual results vary.
            </p>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
