import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAssessment } from "@/lib/assessment";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { DOMAIN_ORDER, DOMAIN_LABELS, ACTIVATION_LABELS, SCORE_MAP, scoreToActivationLevel, type Domain } from "./domainCalculations";

interface Screen3Props {
  onNext: () => void;
  onBack: () => void;
  onNavigateToDomain?: () => void;
}

type DomainKey = Domain;

const DOMAIN_INSIGHTS: Record<DomainKey, Record<1 | 2, string>> = {
  capacity: {
    1: "Recovered time isn't being tracked or deployed.",
    2: "Recovered time is measured but not being converted to access.",
  },
  revenue: {
    1: "No one has connected documentation quality to how your organization gets paid.",
    2: "Revenue signals observed but not measured.",
  },
  workforce: {
    1: "After-hours burden reduced but broader workforce impact isn't tracked.",
    2: "Burden is measured but not connected to retention or labor costs.",
  },
  risk: {
    1: "Documentation quality improved but nothing downstream has changed.",
    2: "Quality monitoring started but downstream workflows aren't connected.",
  },
};

const TIEBREAKER_ORDER: DomainKey[] = ['risk', 'revenue', 'workforce', 'capacity'];

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

export default function Screen3Score({ onNext, onBack, onNavigateToDomain }: Screen3Props) {
  const { state } = useAssessment();
  const { inputs } = state;
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const domainScores: Record<DomainKey, number> = useMemo(() => ({
    capacity: inputs.capacityScore || 0,
    revenue: inputs.revenueScore || 0,
    workforce: inputs.workforceScore || 0,
    risk: inputs.riskScore || 0,
  }), [inputs.capacityScore, inputs.revenueScore, inputs.workforceScore, inputs.riskScore]);

  const totalScore = useMemo(() =>
    domainScores.capacity + domainScores.revenue + domainScores.workforce + domainScores.risk
  , [domainScores]);

  const domainLevels: Record<DomainKey, number> = useMemo(() => ({
    capacity: scoreToActivationLevel('capacity', domainScores.capacity),
    revenue: scoreToActivationLevel('revenue', domainScores.revenue),
    workforce: scoreToActivationLevel('workforce', domainScores.workforce),
    risk: scoreToActivationLevel('risk', domainScores.risk),
  }), [domainScores]);

  const lowestDomain = useMemo(() => {
    let lowest: DomainKey = TIEBREAKER_ORDER[0];
    let lowestLevel = domainLevels[lowest];
    for (const d of TIEBREAKER_ORDER) {
      if (domainLevels[d] < lowestLevel) {
        lowest = d;
        lowestLevel = domainLevels[d];
      }
    }
    return lowest;
  }, [domainLevels]);

  const strongDomains = useMemo(() =>
    DOMAIN_ORDER.filter(d => domainLevels[d] >= 3).map(d => DOMAIN_LABELS[d])
  , [domainLevels]);

  const weakDomains = useMemo(() =>
    DOMAIN_ORDER.filter(d => domainLevels[d] <= 2).map(d => DOMAIN_LABELS[d])
  , [domainLevels]);

  const getVerdict = (score: number) => {
    const lowestLevel = domainLevels[lowestDomain];
    const insightLevel = Math.min(lowestLevel, 2) as 1 | 2;
    const domainInsight = DOMAIN_INSIGHTS[lowestDomain][insightLevel];

    if (score <= 30) {
      return {
        headline: 'Early stages. Significant opportunity across all domains.',
        body: `Your organization is in the early stages of capturing ambient ROI. Time is being saved, but value capture is largely unmeasured and unstructured. Your biggest opportunity is in ${DOMAIN_LABELS[lowestDomain].toLowerCase()} — ${domainInsight.toLowerCase()}`,
      };
    }
    if (score <= 50) {
      return {
        headline: 'Emerging awareness. Key domains remain unmeasured.',
        body: `Your organization is beginning to capture ambient ROI${weakDomains.length > 0 ? `, but ${weakDomains.join(' and ')} remain${weakDomains.length === 1 ? 's' : ''} in early stages` : ''}. Your biggest opportunity is in ${DOMAIN_LABELS[lowestDomain].toLowerCase()} — ${domainInsight.toLowerCase()}`,
      };
    }
    if (score <= 70) {
      return {
        headline: 'Actively managing in some areas. Significant opportunity remains.',
        body: `Your organization is actively managing ambient ROI in ${strongDomains.join(' and ') || 'some domains'}${weakDomains.length > 0 ? `, but ${weakDomains.join(' and ')} remain${weakDomains.length === 1 ? 's' : ''} in early stages` : ''}. Your biggest opportunity is in ${DOMAIN_LABELS[lowestDomain].toLowerCase()} — ${domainInsight.toLowerCase()}`,
      };
    }
    if (score <= 85) {
      return {
        headline: 'Strategically managed. Closing the final gaps.',
        body: `Your organization is strategically managing ambient ROI across ${strongDomains.join(', ') || 'multiple domains'}. Focus on ${DOMAIN_LABELS[lowestDomain].toLowerCase()} to reach full maturity — ${domainInsight.toLowerCase()}`,
      };
    }
    return {
      headline: 'Best in class across domains.',
      body: 'Your organization has institutionalized ambient ROI across all four domains. This is strategic-level documentation intelligence.',
    };
  };

  const verdict = getVerdict(totalScore);

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
          Ambient Assessment Score across four domains
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
                const level = scoreToActivationLevel(domain, domainScores[domain]) as 1 | 2 | 3 | 4;
                const domainScore = domainScores[domain];
                const barPercent = (domainScore / 25) * 100;
                return (
                  <div key={domain}>
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + idx * 0.15, duration: 0.5 }}
                    >
                      <button
                        type="button"
                        className="w-full flex items-center gap-4 h-14 cursor-pointer bg-transparent border-none hover:bg-white/40 rounded-lg transition-colors px-2 -mx-2"
                        onClick={onNavigateToDomain}
                        data-testid={`domain-row-${domain}`}
                      >
                        <div className="w-[35%] text-left">
                          <p className="font-semibold text-sm text-black leading-tight">
                            {DOMAIN_LABELS[domain]}
                          </p>
                          <p className="text-xs text-[#888888] italic">
                            {ACTIVATION_LABELS[domain][level]}
                          </p>
                        </div>
                        <div className="w-[45%]">
                          <AnimatedBar percent={barPercent} delay={400 + idx * 150 + 100} height={5} />
                        </div>
                        <p className="font-bold text-sm text-black w-[20%] text-right" data-testid={`domain-score-${domain}`}>
                          {domainScore} / 25
                        </p>
                      </button>
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

                  <div className="flex-1 max-w-[200px]" style={{ height: 8 }}>
                    <AnimatedBar percent={(totalScore / 100) * 100} delay={1600} height={8} />
                  </div>

                  <p className="font-bold text-2xl text-black min-w-[80px] text-right" data-testid="text-composite-score">
                    <AnimatedCounter target={totalScore} duration={800} delay={2000} /> / 100
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.4, duration: 0.5 }}
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
            transition={{ delay: 2.8, duration: 0.5 }}
          >
            <button
              type="button"
              onClick={() => setMethodologyOpen(!methodologyOpen)}
              className="text-sm text-[#888888] italic underline underline-offset-2 cursor-pointer bg-transparent border-none mb-6 hover:text-[#666666] transition-colors"
              data-testid="button-methodology-toggle"
            >
              How is this calculated?
            </button>

            <AnimatePresence>
              {methodologyOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <p className="text-sm text-[#888888] leading-relaxed mb-8 pl-1" data-testid="text-methodology">
                    Each domain contributes up to 25 points based on the maturity level you selected. Level 1 = 6 pts, Level 2 = 12 pts, Level 3 = 19 pts, Level 4 = 25 pts. Your total score reflects how intentionally your organization is managing the value created by ambient documentation.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.0, duration: 0.5 }}
          >
            <StepFooter onBack={onBack} onNext={onNext} nextLabel="See What This Is Costing You →" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.2, duration: 0.5 }}
          >
            <p className="text-xs text-[#888888] italic mt-4 leading-relaxed" data-testid="text-disclaimer">
              This score reflects organizational self-assessment across four domains. It does not guarantee specific financial outcomes. Individual results vary.
            </p>
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

            <p className="text-[12px] font-medium text-white/50 uppercase tracking-[1.5px] mb-4">
              Documentation Intelligence Score
            </p>

            <div className="text-center mb-2">
              <span className="text-white font-bold text-[72px] leading-none" data-testid="hero-score">
                <AnimatedCounter target={totalScore} duration={800} delay={2400} />
              </span>
              <p className="text-lg text-white/40 font-normal mt-1">/ 100</p>
            </div>

            <div className="relative my-6">
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#EA2C00] rounded-full transition-all duration-700"
                  style={{ width: `${totalScore}%` }}
                  data-testid="verdict-score-bar"
                />
              </div>

              <div className="absolute -top-0.5" style={{ left: '25%', transform: 'translateX(-50%)' }}>
                <div className="w-px h-3 bg-white/30" />
              </div>
              <div className="absolute -top-0.5" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                <div className="w-px h-3 bg-white/30" />
              </div>
              <div className="absolute -top-0.5" style={{ left: '75%', transform: 'translateX(-50%)' }}>
                <div className="w-px h-3 bg-white/30" />
              </div>
            </div>

            <div className="space-y-1.5 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Early deployment</span>
                <span className="text-sm font-bold text-white/50">25</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Measured</span>
                <span className="text-sm font-bold text-white/50">50</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Strategically managed</span>
                <span className="text-sm font-bold text-white/70">75</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Best in class</span>
                <span className="text-sm font-bold text-white">100</span>
              </div>
            </div>

            <div className="h-px bg-white/10 my-5" />

            <p className="text-[12px] font-medium text-white/50 uppercase tracking-[1.5px] mb-3">
              Domain Scores
            </p>
            <div className="space-y-2.5">
              {DOMAIN_ORDER.map((domain) => (
                <div key={domain}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-white/70">{DOMAIN_LABELS[domain]}</span>
                    <span className="text-white font-semibold" data-testid={`sidebar-score-${domain}`}>{domainScores[domain]}</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#EA2C00] rounded-full transition-all duration-500"
                      style={{ width: `${(domainScores[domain] / 25) * 100}%` }}
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
