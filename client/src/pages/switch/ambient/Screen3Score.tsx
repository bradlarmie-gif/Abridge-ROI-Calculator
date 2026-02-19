import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { DS } from "./designTokens";
import { useAssessment } from "@/lib/assessment";
import { formatDollar } from "./ambientCalculator";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";

interface Screen3Props {
  onNext: () => void;
  onBack: () => void;
}

type DomainKey = 'capacity' | 'revenue' | 'workforce' | 'risk';

const DOMAIN_WEIGHTS: Record<DomainKey, number> = {
  capacity: 0.30,
  revenue: 0.25,
  workforce: 0.25,
  risk: 0.20,
};

const DOMAIN_LABELS: Record<DomainKey, string> = {
  capacity: 'Capacity',
  revenue: 'Revenue',
  workforce: 'Workforce',
  risk: 'Risk',
};

const DOMAIN_ORDER: DomainKey[] = ['capacity', 'revenue', 'workforce', 'risk'];

const ACTIVATION_THRESHOLDS: Record<DomainKey, Record<number, string>> = {
  capacity: { 15: 'Not yet captured', 35: 'Informally tracked', 65: 'Actively managed', 90: 'Systematically deployed' },
  revenue: { 10: 'Not connected', 30: 'Some improvement', 62: 'Actively managed', 88: 'Revenue infrastructure' },
  workforce: { 20: 'Surveys only', 40: 'Scores improved', 65: 'Burden measured', 85: 'Retention connected' },
  risk: { 15: 'Not connected', 38: 'Note completeness', 62: 'Audit ready', 90: 'Future ready' },
};

function getActivationLabel(domain: DomainKey, score: number): string {
  const thresholds = ACTIVATION_THRESHOLDS[domain];
  const bases = Object.keys(thresholds).map(Number).sort((a, b) => b - a);
  for (const base of bases) {
    if (score >= base - 5) return thresholds[base];
  }
  return thresholds[bases[bases.length - 1]];
}

function nextLevelScore(current: number): number {
  if (current < 35) return 35;
  if (current < 65) return 65;
  if (current < 90) return 90;
  return current;
}

const OPPORTUNITY_STATEMENTS: Record<DomainKey, string> = {
  capacity: 'Recovered time is not being systematically deployed into enterprise value.',
  revenue: 'Documentation fidelity is not yet connected to revenue integrity strategy.',
  workforce: 'After-hours burden is not yet measured as a leading retention indicator.',
  risk: 'Documentation infrastructure is not yet positioned as the foundation for what comes next.',
};

function AnimatedCounter({ target, duration = 800, delay = 0 }: { target: number; duration?: number; delay?: number }) {
  const [current, setCurrent] = useState(0);
  const [started, setStarted] = useState(false);
  const startTime = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
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
  }, [target, duration, started]);

  return <>{current}</>;
}

function AnimatedBar({ percent, delay = 0, height = 5 }: { percent: number; delay?: number; height?: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setWidth(Math.min(percent, 100)), delay);
    return () => clearTimeout(timer);
  }, [percent, delay]);

  return (
    <div className="flex-1 bg-[#EDEAE5] rounded-full overflow-hidden" style={{ height }}>
      <div
        className="h-full bg-[#EA2C00] rounded-full transition-all duration-500 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export default function Screen3Score({ onNext, onBack }: Screen3Props) {
  const { state } = useAssessment();
  const { inputs } = state;

  const domainScores: Record<DomainKey, number> = useMemo(() => ({
    capacity: inputs.capacityScore || 0,
    revenue: inputs.revenueScore || 0,
    workforce: inputs.workforceScore || 0,
    risk: inputs.riskScore || 0,
  }), [inputs.capacityScore, inputs.revenueScore, inputs.workforceScore, inputs.riskScore]);

  const domainGaps: Record<DomainKey, number> = useMemo(() => ({
    capacity: inputs.capacityGap || 0,
    revenue: inputs.revenueGap || 0,
    workforce: inputs.workforceGap || 0,
    risk: inputs.riskGap || 0,
  }), [inputs.capacityGap, inputs.revenueGap, inputs.workforceGap, inputs.riskGap]);

  const documentationScore = useMemo(() => Math.round(
    (domainScores.capacity * 0.30) +
    (domainScores.revenue * 0.25) +
    (domainScores.workforce * 0.25) +
    (domainScores.risk * 0.20)
  ), [domainScores]);

  const lowestDomain = useMemo(() => {
    return DOMAIN_ORDER.reduce((low, d) => domainScores[d] < domainScores[low] ? d : low, DOMAIN_ORDER[0]);
  }, [domainScores]);

  const improvedDomainScore = nextLevelScore(domainScores[lowestDomain]);
  const improvementDelta = improvedDomainScore - domainScores[lowestDomain];
  const improvedTotal = Math.round(documentationScore + (improvementDelta * DOMAIN_WEIGHTS[lowestDomain]));

  const getVerdict = (score: number) => {
    if (score < 34) return {
      headline: 'Below the industry average.',
      body: 'Your documentation infrastructure is in early activation. Significant enterprise value is available across all four domains \u2014 none of it requires new technology.',
    };
    if (score <= 50) return {
      headline: 'At the industry average.',
      body: 'Most organizations that deploy ambient AI land here. The gap to top quartile is not incremental. It is a fundamentally different relationship with documentation infrastructure.',
    };
    if (score <= 70) return {
      headline: 'Above the industry average.',
      body: 'You have activated more than most. The remaining gap to top quartile is concentrated in specific domains \u2014 and addressable with the right infrastructure.',
    };
    if (score <= 85) return {
      headline: 'Approaching top-quartile performance.',
      body: 'Strong documentation intelligence. The remaining opportunity is in the domains where activation is still partial.',
    };
    return {
      headline: 'Top-quartile documentation intelligence.',
      body: 'Your organization is among the highest performers in documentation infrastructure activation. The remaining opportunity is in optimization, not activation.',
    };
  };

  const verdict = getVerdict(documentationScore);

  return (
    <div className="font-[Manrope,sans-serif] pt-[72px] pb-20">
      <div className="max-w-xl mx-auto">

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="bg-[#F5F0EB] border border-[#E8E0D8] rounded-xl p-6" data-testid="card-buildup">
            <p className="font-abridge text-[11px] font-semibold uppercase tracking-[2px] text-[#9B9B9B] mb-5" data-testid="text-buildup-label">
              How Your Score Is Built
            </p>

            {DOMAIN_ORDER.map((domain, idx) => (
              <div key={domain}>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + idx * 0.15, duration: 0.5 }}
                >
                  <div
                    className="flex items-center gap-4 h-12"
                    data-testid={`domain-row-${domain}`}
                  >
                    <div className="w-[35%]">
                      <p className="font-semibold text-[15px] text-[#1A1A1A] font-[Manrope,sans-serif] leading-tight">
                        {DOMAIN_LABELS[domain]}
                      </p>
                      <p className="text-xs text-[#9B9B9B] font-[Manrope,sans-serif] italic">
                        {getActivationLabel(domain, domainScores[domain])}
                      </p>
                    </div>
                    <div className="w-[45%]">
                      <AnimatedBar percent={domainScores[domain]} delay={400 + idx * 150 + 100} height={5} />
                    </div>
                    <p className="font-bold text-[15px] text-[#1A1A1A] font-[Manrope,sans-serif] w-[20%] text-right" data-testid={`domain-score-${domain}`}>
                      {domainScores[domain]} / 100
                    </p>
                  </div>
                </motion.div>
                {idx < DOMAIN_ORDER.length - 1 && (
                  <div className="h-px bg-[#F0F0F0]" />
                )}
              </div>
            ))}

            <div className="h-px bg-[#E5E7EB] mt-4" />

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.5 }}
            >
              <div
                className="bg-[#F7F6F4] rounded-lg px-5 py-4 mt-3 flex items-center justify-between gap-4"
                data-testid="card-composite-score"
              >
                <p className="font-semibold text-[15px] text-[#1A1A1A] font-[Manrope,sans-serif]">
                  Documentation Intelligence Score
                </p>

                <div className="flex-1 flex gap-0.5 max-w-[200px]" style={{ height: 8 }}>
                  {DOMAIN_ORDER.map((domain) => {
                    const contribution = Math.round(domainScores[domain] * DOMAIN_WEIGHTS[domain]);
                    return (
                      <div key={domain} className="overflow-hidden" style={{ flex: contribution, height: 8 }}>
                        <AnimatedBar percent={100} delay={1600} height={8} />
                      </div>
                    );
                  })}
                  <div className="bg-[#E5E7EB] rounded" style={{ flex: Math.max(1, 100 - documentationScore), height: 8 }} />
                </div>

                <p className="font-bold text-2xl text-[#1A1A1A] font-[Manrope,sans-serif] min-w-[80px] text-right" data-testid="text-composite-score">
                  <AnimatedCounter target={documentationScore} duration={800} delay={2000} /> / 100
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          className="mt-12"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.8, duration: 0.5 }}
        >
          <div className="text-center" data-testid="hero-score">
            <span className="text-[#1A1A1A] font-bold text-[96px] leading-none">
              <AnimatedCounter target={documentationScore} duration={800} delay={2800} />
            </span>
            <p className="text-2xl text-[#9B9B9B] font-normal mt-1">/ 100</p>
          </div>
        </motion.div>

        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3.2, duration: 0.5 }}
        >
          <div className="relative max-w-[480px] mx-auto">
            <div className="w-full h-2.5 bg-[#EDEAE5] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#EA2C00] rounded-full transition-all duration-700"
                style={{ width: `${documentationScore}%` }}
                data-testid="verdict-score-bar"
              />
            </div>

            <div className="absolute -top-1" style={{ left: '34%', transform: 'translateX(-50%)' }} data-testid="marker-industry-avg">
              <div className="w-0.5 h-[18px] bg-[#9B9B9B]" />
              <p className="text-[11px] text-[#9B9B9B] font-[Manrope,sans-serif] font-semibold text-center mt-1">34</p>
            </div>

            <div className="absolute -top-1" style={{ left: '71%', transform: 'translateX(-50%)' }} data-testid="marker-top-quartile">
              <div className="w-0.5 h-[18px] bg-[#1A1A1A]" />
              <p className="text-[11px] text-[#1A1A1A] font-[Manrope,sans-serif] font-semibold text-center mt-1">71</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="mt-7"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3.6, duration: 0.5 }}
        >
          <div className="bg-[#F5F0EB] border border-[#E8E0D8] rounded-xl p-6 max-w-[480px] mx-auto">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[13px] text-[#9B9B9B] font-[Manrope,sans-serif]">
                  Industry average — organizations using ambient AI today
                </p>
                <p className="text-[17px] font-bold text-[#1A1A1A] font-[Manrope,sans-serif] whitespace-nowrap" data-testid="text-benchmark-industry">
                  34 / 100
                </p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-[13px] text-[#9B9B9B] font-[Manrope,sans-serif]">
                  Top-quartile organizations
                </p>
                <p className="text-[17px] font-bold text-[#1A1A1A] font-[Manrope,sans-serif] whitespace-nowrap" data-testid="text-benchmark-top">
                  71 / 100
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="mt-7"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 4.0, duration: 0.5 }}
        >
          <div
            className="bg-[#F5F0EB] border border-[#E8E0D8] rounded-xl px-7 py-6"
            data-testid="card-verdict"
          >
            <p className="text-xl font-bold text-[#1A1A1A] font-[Manrope,sans-serif] mb-3" data-testid="text-verdict-headline">
              {verdict.headline}
            </p>
            <p className="text-[17px] text-[#4B4B4B] leading-[1.75] font-[Manrope,sans-serif]" data-testid="text-verdict-body">
              {verdict.body}
            </p>
          </div>
        </motion.div>

        <motion.div
          className="mt-12"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 4.6, duration: 0.5 }}
        >
          <p
            className="font-abridge text-[11px] font-semibold uppercase tracking-[2px] text-[#9B9B9B] mb-6"
            data-testid="text-opportunity-label"
          >
            Your Primary Opportunity
          </p>

          <div
            className="bg-[#F5F0EB] border border-[#E8E0D8] border-l-[3px] border-l-[#EA2C00] rounded-xl p-6"
            data-testid="card-primary-opportunity"
          >
            <p className="font-abridge text-[11px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-3">
              {DOMAIN_LABELS[lowestDomain]}
            </p>
            <p className="text-xl font-semibold text-[#1A1A1A] font-[Manrope,sans-serif] leading-relaxed mb-4">
              {OPPORTUNITY_STATEMENTS[lowestDomain]}
            </p>
            <p className="font-[Manrope,sans-serif] font-bold text-[32px] text-[#EA2C00] leading-none" data-testid="text-opportunity-value">
              {formatDollar(domainGaps[lowestDomain])}
            </p>
            <p className="text-[13px] text-[#9B9B9B] font-[Manrope,sans-serif] mt-1">
              estimated annual opportunity in this domain
            </p>
            <div className="h-px bg-[#E5E7EB] my-4" />
            <p className="text-[15px] text-[#4B4B4B] font-[Manrope,sans-serif] leading-[1.7]">
              Improving your score in {DOMAIN_LABELS[lowestDomain].toLowerCase()} by one activation level would move your overall Documentation Intelligence Score from {documentationScore} to an estimated {improvedTotal}.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 5.0, duration: 0.5 }}
        >
          <StepFooter onBack={onBack} onNext={onNext} nextLabel="See What This Is Costing You" />
        </motion.div>

        <div className={STEP_FOOTER_SPACER_CLASS} />
      </div>
    </div>
  );
}
