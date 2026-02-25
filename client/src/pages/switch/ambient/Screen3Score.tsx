import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { useAssessment } from "@/lib/assessment";
import { formatDollar } from "./ambientCalculator";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { DOMAIN_ORDER, DOMAIN_LABELS, DOMAIN_WEIGHTS, ACTIVATION_LABELS, scoreToActivationLevel, type Domain } from "./domainCalculations";

interface Screen3Props {
  onNext: () => void;
  onBack: () => void;
}

type DomainKey = Domain;

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
    <div className="flex-1 bg-[#E5E7EB] rounded-full overflow-hidden" style={{ height }}>
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

  const domainHasValue: Record<DomainKey, boolean> = useMemo(() => ({
    capacity: inputs.capacityHasValue || false,
    revenue: inputs.revenueHasValue || false,
    workforce: inputs.workforceHasValue || false,
    risk: inputs.riskHasValue || false,
  }), [inputs.capacityHasValue, inputs.revenueHasValue, inputs.workforceHasValue, inputs.riskHasValue]);

  const documentationScore = useMemo(() => Math.round(
    (domainScores.capacity * 0.30) +
    (domainScores.revenue * 0.25) +
    (domainScores.workforce * 0.25) +
    (domainScores.risk * 0.20)
  ), [domainScores]);

  const lowestDomain = useMemo(() => {
    return DOMAIN_ORDER.reduce((low, d) => domainScores[d] < domainScores[low] ? d : low, DOMAIN_ORDER[0]);
  }, [domainScores]);

  const domainsBelowL3 = useMemo(() => {
    return DOMAIN_ORDER.filter(d => {
      const level = scoreToActivationLevel(d, domainScores[d]);
      return level < 3;
    });
  }, [domainScores]);

  const getVerdict = (score: number) => {
    if (score <= 25) return {
      headline: 'Early stages of ambient ROI.',
      body: 'Your organization is in the early stages of ambient ROI. Time is being saved, but value capture is largely unmeasured and unstructured.',
    };
    if (score <= 50) {
      const belowL3Names = domainsBelowL3.map(d => DOMAIN_LABELS[d].toLowerCase()).join(', ');
      return {
        headline: 'Beginning to capture ambient ROI.',
        body: `Your organization is beginning to capture ambient ROI, but significant opportunity remains across ${belowL3Names || 'key domains'}.`,
      };
    }
    if (score <= 75) return {
      headline: 'Actively managing ambient ROI.',
      body: `Your organization is actively managing ambient ROI across multiple domains. Focus on ${DOMAIN_LABELS[lowestDomain].toLowerCase()} to reach full maturity.`,
    };
    return {
      headline: 'Institutionalized documentation intelligence.',
      body: 'Your organization has institutionalized ambient ROI across all four domains. This is strategic-level documentation intelligence.',
    };
  };

  const verdict = getVerdict(documentationScore);

  const totalGap = useMemo(() => {
    let sum = 0;
    for (const d of DOMAIN_ORDER) {
      if (domainHasValue[d]) sum += domainGaps[d];
    }
    return sum;
  }, [domainGaps, domainHasValue]);

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight">
          Your Score
        </h1>
        <p className="text-base text-[#888888]">
          Documentation Intelligence Score across four domains
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-1 max-w-[700px]">

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="bg-[#F5F0EB] rounded-lg p-8 md:p-10 mb-8" data-testid="card-buildup">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2" data-testid="text-buildup-label">
                How Your Score Is Built
              </p>
              <div className="h-px bg-[#E5E7EB] mb-6" />

              {DOMAIN_ORDER.map((domain, idx) => {
                const level = scoreToActivationLevel(domain, domainScores[domain]);
                return (
                  <div key={domain}>
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + idx * 0.15, duration: 0.5 }}
                    >
                      <div className="flex items-center gap-4 h-12" data-testid={`domain-row-${domain}`}>
                        <div className="w-[35%]">
                          <p className="font-semibold text-sm text-black leading-tight">
                            {DOMAIN_LABELS[domain]}
                          </p>
                          <p className="text-xs text-[#888888] italic">
                            {ACTIVATION_LABELS[domain][level]}
                          </p>
                        </div>
                        <div className="w-[45%]">
                          <AnimatedBar percent={domainScores[domain]} delay={400 + idx * 150 + 100} height={5} />
                        </div>
                        <p className="font-bold text-sm text-black w-[20%] text-right" data-testid={`domain-score-${domain}`}>
                          {domainScores[domain]} / 100
                        </p>
                      </div>
                    </motion.div>
                    {idx < DOMAIN_ORDER.length - 1 && (
                      <div className="h-px bg-[#E5E7EB]/50" />
                    )}
                  </div>
                );
              })}

              <div className="h-px bg-[#E5E7EB] mt-4" />

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4, duration: 0.5 }}
              >
                <div
                  className="bg-white/60 rounded-lg px-5 py-4 mt-3 flex items-center justify-between gap-4"
                  data-testid="card-composite-score"
                >
                  <p className="font-semibold text-sm text-black">
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

                  <p className="font-bold text-2xl text-black min-w-[80px] text-right" data-testid="text-composite-score">
                    <AnimatedCounter target={documentationScore} duration={800} delay={2000} /> / 100
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.6, duration: 0.5 }}
          >
            <div className="bg-[#F5F0EB] rounded-lg p-8 md:p-10 mb-8" data-testid="card-verdict">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                Assessment
              </p>
              <div className="h-px bg-[#E5E7EB] mb-6" />
              <p className="text-lg font-bold text-black mb-2" data-testid="text-verdict-headline">
                {verdict.headline}
              </p>
              <p className="text-sm text-[#888888] leading-relaxed" data-testid="text-verdict-body">
                {verdict.body}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 4.2, duration: 0.5 }}
          >
            <div className="bg-[#F5F0EB] rounded-lg p-8 md:p-10 mb-8" data-testid="card-domain-values">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                Domain Value Summary
              </p>
              <div className="h-px bg-[#E5E7EB] mb-6" />

              {DOMAIN_ORDER.map((domain, idx) => (
                <div key={domain}>
                  <div className="flex items-center justify-between py-3" data-testid={`domain-value-row-${domain}`}>
                    <span className="font-semibold text-sm text-black">{DOMAIN_LABELS[domain]}</span>
                    <span className={`font-bold text-base ${domainHasValue[domain] ? 'text-black' : 'text-[#888888]'}`}>
                      {domainHasValue[domain] ? formatDollar(domainGaps[domain]) : 'Not yet measured'}
                    </span>
                  </div>
                  {idx < DOMAIN_ORDER.length - 1 && <div className="h-px bg-[#E5E7EB]/50" />}
                </div>
              ))}

              <div className="h-px bg-[#E5E7EB] mt-1" />
              <div className="bg-white/60 rounded-lg px-4 py-3.5 mt-3 flex items-center justify-between">
                <span className="font-semibold text-sm text-black">Total Measured Value</span>
                <span className="font-bold text-xl text-[#EA2C00]" data-testid="value-total-measured">
                  {totalGap > 0 ? formatDollar(totalGap) : 'Not yet measured'}
                </span>
              </div>
              <p className="text-xs text-[#888888] italic mt-2">
                Total includes only domains with measured values.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 4.6, duration: 0.5 }}
          >
            <StepFooter onBack={onBack} onNext={onNext} nextLabel="See What This Is Costing You" />
          </motion.div>

          <div className={STEP_FOOTER_SPACER_CLASS} />
        </div>

        <motion.div
          className="w-full lg:w-[320px] flex-shrink-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 2.0, duration: 0.6, ease: "easeOut" }}
        >
          <div className="bg-[#1A1A1A] rounded-xl p-6 lg:sticky lg:top-24" data-testid="panel-score-hero">

            <p className="text-[10px] font-medium text-white/50 uppercase tracking-[1.5px] mb-4">
              Documentation Intelligence Score
            </p>

            <div className="text-center mb-2">
              <span className="text-white font-bold text-[72px] leading-none" data-testid="hero-score">
                <AnimatedCounter target={documentationScore} duration={800} delay={2400} />
              </span>
              <p className="text-lg text-white/40 font-normal mt-1">/ 100</p>
            </div>

            <div className="relative my-6">
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#EA2C00] rounded-full transition-all duration-700"
                  style={{ width: `${documentationScore}%` }}
                  data-testid="verdict-score-bar"
                />
              </div>

              <div className="absolute -top-0.5" style={{ left: '34%', transform: 'translateX(-50%)' }} data-testid="marker-industry-avg">
                <div className="w-px h-3 bg-white/40" />
              </div>

              <div className="absolute -top-0.5" style={{ left: '71%', transform: 'translateX(-50%)' }} data-testid="marker-top-quartile">
                <div className="w-px h-3 bg-white/70" />
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Industry average</span>
                <span className="text-sm font-bold text-white/70" data-testid="text-benchmark-industry">34</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Top quartile</span>
                <span className="text-sm font-bold text-white" data-testid="text-benchmark-top">71</span>
              </div>
            </div>

            <div className="h-px bg-white/10 my-5" />

            <p className="text-[10px] font-medium text-white/50 uppercase tracking-[1.5px] mb-3">
              Domain Scores
            </p>
            <div className="space-y-2.5">
              {DOMAIN_ORDER.map((domain) => (
                <div key={domain}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-white/70">{DOMAIN_LABELS[domain]}</span>
                    <span className="text-white font-semibold">{domainScores[domain]}</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#EA2C00] rounded-full transition-all duration-500"
                      style={{ width: `${domainScores[domain]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
