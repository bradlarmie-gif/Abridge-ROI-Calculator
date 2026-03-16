import { useEffect, useRef, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAssessment } from "@/lib/assessment";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { DOMAIN_ORDER, DOMAIN_LABELS, ACTIVATION_LABELS, scoreToActivationLevel, tenureScoreBand, type Domain, type ActivationLevel } from "./domainCalculations";

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
    1: "No one has analyzed whether documentation changes are affecting reimbursement.",
    2: "Directional signals observed but not formally validated.",
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
  const startValue = Math.max(target - 8, 0);
  const [current, setCurrent] = useState(startValue);
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
      setCurrent(startValue + Math.round(eased * (target - startValue)));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, started, startValue]);

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

  const strongestDomain = useMemo(() => {
    return DOMAIN_ORDER.reduce((best, d) =>
      domainLevels[d] > domainLevels[best] ? d : best
    , DOMAIN_ORDER[0]);
  }, [domainLevels]);

  const providers = inputs.providers || 0;

  const archetype = useMemo(() => {
    const high = DOMAIN_ORDER.filter(d => domainLevels[d] >= 3);
    const unmeasured = DOMAIN_ORDER.filter(d => domainLevels[d] === 1);
    const allL1 = unmeasured.length === 4;
    const allHigh = DOMAIN_ORDER.every(d => domainLevels[d] >= 3);

    const joinNames = (arr: DomainKey[]) => {
      const names = arr.map(d => DOMAIN_LABELS[d]);
      if (names.length === 0) return '';
      if (names.length === 1) return names[0];
      return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
    };

    if (allL1) {
      return {
        name: 'Live. Not Yet Measured.',
        body: `The deployment is running across ${providers > 0 ? providers.toLocaleString() + ' providers' : 'your organization'}. What it's returning — in revenue, workforce, and quality terms — hasn't been formally analyzed yet. That's where most organizations begin. It's also where most stay longest.`,
      };
    }

    if (allHigh) {
      return {
        name: 'Strategic Maturity.',
        body: 'Four domains measured, connected, and managed. This is where most ambient deployments aspire to be and few reach. The work ahead is deepening strategic integration — not building the measurement foundation.',
      };
    }

    if (high.length === 0) {
      const l2count = DOMAIN_ORDER.filter(d => domainLevels[d] === 2).length;
      if (l2count >= 3) {
        return {
          name: 'Early Measurement Across All Domains.',
          body: 'Every domain has moved from awareness to data. None has been pushed to validated, actionable impact yet. The measurement foundation is in place — the question is which domain gets pushed first, and what it unlocks.',
        };
      }
      return {
        name: 'Measuring the Basics. Opportunity Ahead.',
        body: `Some domains have moved from awareness to data. Most of the ambient value story hasn't been told yet.${providers > 0 ? ` At ${providers.toLocaleString()} providers, the confirmed value is a starting point — not the ceiling.` : ''}`,
      };
    }

    if (high.length === 1) {
      const d = high[0];
      const uStr = unmeasured.length > 0 ? joinNames(unmeasured) : '';
      const uVerb = unmeasured.length === 1 ? 'hasn\'t' : 'haven\'t';
      const profiles: Record<DomainKey, { name: string; body: string }> = {
        capacity: {
          name: 'Time Captured. Financial Story Unwritten.',
          body: `Recovered time has moved into operational action. The revenue, workforce, and quality implications of that decision — what it's producing beyond the time itself — haven't been formally analyzed.${uStr ? ` ${uStr} ${uVerb} been measured yet.` : ''}`,
        },
        revenue: {
          name: 'Revenue Signal Measured. Ecosystem Unmeasured.',
          body: `The documentation-to-revenue connection is on your radar and being measured. The capacity, workforce, and quality dimensions that inform and amplify that signal ${uVerb} been connected yet.${uStr ? ` ${uStr} remain${unmeasured.length === 1 ? 's' : ''} unmeasured.` : ''}`,
        },
        workforce: {
          name: 'Provider Experience Quantified. Broader Picture Unmeasured.',
          body: `You've quantified what ambient is doing for your providers. The organizational implications — what that relief means for access capacity, revenue, and downstream quality — ${uVerb} been formally connected yet.`,
        },
        risk: {
          name: 'Quality Infrastructure Present. Value Chain Not Yet Built.',
          body: `Documentation quality is being tracked and monitored. The connection from that quality improvement to coding accuracy, CDI, and compliance programs ${uVerb} been formalized yet.${uStr ? ` ${uStr} remain${unmeasured.length === 1 ? 's' : ''} unmeasured.` : ''}`,
        },
      };
      return profiles[d];
    }

    if (high.length >= 3) {
      const gap = DOMAIN_ORDER.filter(d => domainLevels[d] < 3);
      const gapStr = joinNames(gap);
      return {
        name: 'Measuring Across Most Domains.',
        body: `Three or more domains are generating confirmed, validated value.${gapStr ? ` ${gapStr} is the remaining gap — and at your scale, it's worth closing before the next planning cycle.` : ' The work ahead is deepening each domain, not widening the foundation.'}`,
      };
    }

    const pair = [...high].sort().join('+') as string;
    const uStr = unmeasured.length > 0 ? joinNames(unmeasured) : '';
    const pairMap: Record<string, { name: string; body: string }> = {
      'capacity+revenue': {
        name: 'Operational and Financial Capture Underway.',
        body: `Time recovery is in action and revenue impact is measured.${uStr ? ` ${uStr} remain${unmeasured.length === 1 ? 's' : ''} unmeasured — and at your scale, those domains typically carry significant additional value.` : ''}`,
      },
      'capacity+workforce': {
        name: 'Provider and Operational Value Captured.',
        body: `The time recovery and workforce dimensions are measured and connected. Revenue impact and quality downstream effects — often the highest-value domains per provider — haven't been formally analyzed yet.`,
      },
      'capacity+risk': {
        name: 'Operations and Quality Tracked. Revenue and Workforce Unmeasured.',
        body: `Time conversion and quality monitoring are in place. Revenue impact and workforce implications — which typically represent the largest financial returns at scale — haven't been formally measured.`,
      },
      'revenue+workforce': {
        name: 'Financial and Provider Value Both Measured.',
        body: `Revenue impact and workforce implications are both on the table. Capacity conversion strategy and quality downstream effects haven't been connected yet — and they compound the value of what you've already built.`,
      },
      'revenue+risk': {
        name: 'Financial and Clinical Intelligence Present.',
        body: `Revenue and quality dimensions are measured. Capacity conversion and workforce implications — often where the largest per-provider ROI lives — haven't been formally analyzed yet.`,
      },
      'risk+workforce': {
        name: 'Clinical Quality and Provider Experience Measured.',
        body: `Documentation quality and workforce impact are tracked. The capacity and revenue dimensions — what recovered time produces and what documentation quality is worth in billing — remain unmeasured.`,
      },
    };

    return pairMap[pair] || {
      name: 'Multiple Domains Measured.',
      body: `Multiple dimensions of ambient value are being captured.${uStr ? ` ${uStr} ${unmeasured.length === 1 ? 'hasn\'t' : 'haven\'t'} been formally analyzed yet.` : ' The work ahead is connecting the measured domains into a unified strategic picture.'}`,
    };
  }, [domainLevels, providers]);

  const tenureModifier = useMemo(() => {
    const tenure = inputs.deploymentTenure;
    if (!tenure) return null;
    const band = tenureScoreBand(totalScore);
    const matrix: Record<string, Record<'low' | 'mid' | 'high', string>> = {
      '0-6': {
        low: "You're early. Most organizations at this stage are still stabilizing adoption — this profile is expected. The question at 6 months isn't your score. It's whether you're building the measurement habits now.",
        mid: "Six months in with meaningful measurement already underway. You're ahead of the typical adoption curve.",
        high: "Less than 6 months in with strong measurement across multiple domains. That's unusual — it typically signals a pre-existing measurement culture or a focused implementation team.",
      },
      '6-12': {
        low: "A year in, and the measurement infrastructure is still forming. This is common — and also when the pattern gets set. Organizations that build measurement habits at 12 months don't usually have to rebuild them at 24.",
        mid: "A year in with several domains measured. You're past early adoption and moving into deliberate value realization. The next 12 months determine whether this becomes a strategic capability or stays informal.",
        high: "One year in with strong maturity. This pace is uncommon. Organizations that move this fast typically have explicit executive sponsorship of the measurement work — not just the deployment.",
      },
      '12-24': {
        low: "One to two years in, and most of the value story hasn't been told yet. The window to build measurement infrastructure is narrowing — not because it closes, but because every month without it is a month of value sitting uncounted.",
        mid: "One to two years in with moderate maturity. Some domains are yielding confirmed value; others haven't been analyzed. At this stage, the gap isn't about adoption — it's about whether there's a structured program to capture what's already generating returns.",
        high: "One to two years in with strong maturity. You've used the deployment period to build real infrastructure. The work ahead is integration and depth.",
      },
      '24+': {
        low: "Two or more years live, and the measurement foundation hasn't been built. This is the highest-urgency profile in this assessment — not because the deployment has failed, but because value has been generating without being counted for a long time. What you find when you look will be surprising.",
        mid: "Two or more years live with mixed maturity. Some domains are yielding confirmed value; others have been generating returns that no one has looked at yet. At this tenure, that's a prioritization problem, not a knowledge problem.",
        high: "Two or more years live with strong maturity. This is where few organizations arrive. The deployment isn't just generating value — it's being managed as a strategic asset.",
      },
    };
    return matrix[tenure]?.[band] ?? null;
  }, [inputs.deploymentTenure, totalScore]);

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight">
          Here's where you stand.
        </h1>
        <p className="text-base text-[#888888]">
          Four domains. One score. Here's where your organization actually is.
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
        <div className="flex-1 max-w-[700px]">

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="bg-[#F5F0EB] rounded-lg p-5 sm:p-8 md:p-10 mb-8" data-testid="card-buildup">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2" data-testid="text-buildup-label">
                Score Breakdown
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
                      transition={{ delay: 0.15 + idx * 0.1, duration: 0.5 }}
                    >
                      <button
                        type="button"
                        className="w-full flex items-center gap-4 h-14 cursor-pointer bg-transparent border-none hover:bg-white/40 rounded-lg transition-colors px-2 -mx-2"
                        onClick={onNavigateToDomain}
                        data-testid={`domain-row-${domain}`}
                      >
                        <div className="w-[40%] sm:w-[35%] text-left">
                          <p className="font-semibold text-xs sm:text-sm text-black leading-tight">
                            {DOMAIN_LABELS[domain]}
                          </p>
                          <p className="text-[11px] sm:text-xs text-[#888888] italic">
                            → {ACTIVATION_LABELS[domain][level]}
                          </p>
                        </div>
                        <div className="hidden sm:block w-[45%]">
                          <AnimatedBar percent={barPercent} delay={400 + idx * 150 + 100} height={5} />
                        </div>
                        <p className="font-bold text-sm text-black w-[60%] sm:w-[20%] text-right" data-testid={`domain-score-${domain}`}>
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
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <div
                  className="bg-white/60 rounded-lg px-5 py-4 mt-3 flex items-center justify-between gap-4"
                  data-testid="card-composite-score"
                >
                  <p className="font-semibold text-sm text-black">
                    Your Maturity Score
                  </p>

                  <div className="flex-1 max-w-[200px]" style={{ height: 8 }}>
                    <AnimatedBar percent={(totalScore / 100) * 100} delay={900} height={8} />
                  </div>

                  <p className="font-bold text-xl sm:text-2xl text-black min-w-[60px] sm:min-w-[80px] text-right" data-testid="text-composite-score">
                    <AnimatedCounter target={totalScore} duration={800} delay={800} /> / 100
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            <div className="bg-[#1A1A1A] rounded-lg p-5 sm:p-8 md:p-10 mb-8" data-testid="card-verdict">
              <p className="text-[11px] font-medium text-white/40 uppercase tracking-[1.5px] mb-4">
                Your Ambient Profile
              </p>
              <p className="text-xl sm:text-2xl font-bold text-white leading-tight mb-4" data-testid="text-verdict-headline">
                {archetype.name}
              </p>
              <div className="h-px bg-white/10 mb-4" />
              <p className="text-sm text-white/60 leading-relaxed" data-testid="text-verdict-body">
                {archetype.body}
              </p>
              {tenureModifier && (
                <>
                  <div className="h-px bg-white/10 mt-4" />
                  <p className="text-xs text-white/40 italic leading-relaxed mt-4" data-testid="text-tenure-modifier">
                    {tenureModifier}
                  </p>
                </>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.5 }}
          >
            <StepFooter onBack={onBack} onNext={onNext} nextLabel="See What This Means in Dollars →" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
          >
            <p className="text-xs text-[#888888] italic mt-4 leading-relaxed" data-testid="text-disclaimer">
              Self-assessment across four domains. Each domain scores 0–25 based on activation level (L1=4, L2=12, L3=19, L4=25). Does not guarantee specific financial outcomes.
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

            <p className="text-[12px] font-medium text-white/50 uppercase tracking-[1.5px] mb-5">
              Strategic Snapshot
            </p>

            <div className="mb-5">
              <p className="text-[11px] font-medium text-white/40 uppercase tracking-[1.5px] mb-2">
                Where You're Measuring
              </p>
              <p className="font-bold text-white text-base leading-tight mb-1.5" data-testid="snapshot-strongest-domain">
                {DOMAIN_LABELS[strongestDomain]}
              </p>
              <p className="text-xs text-white/50 leading-relaxed">
                Level {domainLevels[strongestDomain]} — {ACTIVATION_LABELS[strongestDomain][domainLevels[strongestDomain] as ActivationLevel]}
              </p>
            </div>

            <div className="h-px bg-white/10 mb-5" />

            <div className="mb-5">
              <p className="text-[11px] font-medium text-[#EA2C00]/80 uppercase tracking-[1.5px] mb-2">
                Biggest Opportunity
              </p>
              <p className="font-bold text-white text-base leading-tight mb-1.5" data-testid="snapshot-weakest-domain">
                {DOMAIN_LABELS[lowestDomain]}
              </p>
              <p className="text-xs text-white/50 leading-relaxed">
                {DOMAIN_INSIGHTS[lowestDomain][Math.min(domainLevels[lowestDomain], 2) as 1 | 2]}
              </p>
            </div>

            <div className="h-px bg-white/10 mb-5" />

            <p className="text-xs text-white/30 leading-relaxed italic">
              The next screen translates each domain into dollar terms — what's confirmed, and what hasn't been looked at yet.
            </p>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
