import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { DS } from "./designTokens";
import { useAssessment } from "@/lib/assessment";
import { formatDollar } from "./ambientCalculator";

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

function AnimatedBar({ percent, delay = 0, height = 6 }: { percent: number; delay?: number; height?: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setWidth(Math.min(percent, 100)), delay);
    return () => clearTimeout(timer);
  }, [percent, delay]);

  return (
    <div style={{ flex: 1, height, backgroundColor: DS.border, borderRadius: height / 2, overflow: 'hidden' }}>
      <div
        style={{
          height: '100%', backgroundColor: DS.red, borderRadius: height / 2,
          width: `${width}%`, transition: 'width 600ms ease-out',
        }}
      />
    </div>
  );
}

function FadeIn({ delay, children, className }: { delay: number; children: React.ReactNode; className?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 400ms ease-out, transform 400ms ease-out',
      }}
    >
      {children}
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
    <div style={{ fontFamily: DS.font, paddingTop: 80, paddingBottom: 80 }}>
      <div className="max-w-[600px] mx-auto">

        {/* SECTION A — THE BUILD-UP */}
        <FadeIn delay={200}>
          <p
            style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase', textAlign: 'center' }}
            className="mb-12"
            data-testid="text-buildup-label"
          >
            How Your Score Is Built
          </p>
        </FadeIn>

        {DOMAIN_ORDER.map((domain, idx) => (
          <FadeIn key={domain} delay={400 + idx * 150}>
            <div
              className="flex items-center gap-4"
              style={{ marginBottom: 20 }}
              data-testid={`domain-row-${domain}`}
            >
              <div style={{ minWidth: 130 }}>
                <p style={{ fontWeight: 600, fontSize: 15, color: DS.black, fontFamily: DS.font, lineHeight: 1.3 }}>
                  {DOMAIN_LABELS[domain]}
                </p>
                <p style={{ fontSize: 12, color: DS.muted, fontFamily: DS.font }}>
                  {getActivationLabel(domain, domainScores[domain])}
                </p>
              </div>
              <AnimatedBar percent={domainScores[domain]} delay={400 + idx * 150 + 100} height={6} />
              <p style={{ fontWeight: 700, fontSize: 17, color: DS.black, fontFamily: DS.font, minWidth: 70, textAlign: 'right' }} data-testid={`domain-score-${domain}`}>
                {domainScores[domain]} / 100
              </p>
            </div>
          </FadeIn>
        ))}

        {/* Divider */}
        <FadeIn delay={1200}>
          <div style={{ height: 1, backgroundColor: DS.border, margin: '24px 0' }} />
        </FadeIn>

        {/* Total composite row */}
        <FadeIn delay={1400}>
          <div
            style={{
              backgroundColor: DS.bg, border: `1px solid ${DS.border}`, borderRadius: 10,
              padding: '20px 24px',
            }}
            data-testid="card-composite-score"
          >
            <div className="flex items-center gap-4">
              <div style={{ minWidth: 130 }}>
                <p style={{ fontWeight: 600, fontSize: 15, color: DS.black, fontFamily: DS.font, lineHeight: 1.3 }}>
                  Documentation<br />Intelligence Score
                </p>
              </div>

              {/* Segmented bar */}
              <div style={{ flex: 1, height: 8, display: 'flex', gap: 2 }}>
                {DOMAIN_ORDER.map((domain) => {
                  const contribution = domainScores[domain] * DOMAIN_WEIGHTS[domain];
                  return (
                    <AnimatedBar
                      key={domain}
                      percent={100}
                      delay={1600}
                      height={8}
                    />
                  );
                })}
                <div style={{ flex: Math.max(0, 100 - documentationScore) / 100 * 4, height: 8, backgroundColor: DS.border, borderRadius: 4 }} />
              </div>

              <p style={{ fontWeight: 700, fontSize: 24, color: DS.black, fontFamily: DS.font, minWidth: 90, textAlign: 'right' }} data-testid="text-composite-score">
                <AnimatedCounter target={documentationScore} duration={800} delay={2000} /> / 100
              </p>
            </div>
          </div>
        </FadeIn>

        {/* SECTION B — THE VERDICT */}
        <FadeIn delay={2800} className="mt-12">
          <div className="text-center" data-testid="hero-score">
            <span style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 96, color: DS.black, lineHeight: 1 }}>
              <AnimatedCounter target={documentationScore} duration={800} delay={2800} />
            </span>
            <p style={{ fontSize: 24, color: DS.muted, fontWeight: 400, marginTop: 4 }}>/ 100</p>
          </div>
        </FadeIn>

        {/* Score bar with benchmark markers */}
        <FadeIn delay={3200} className="mt-6">
          <div style={{ position: 'relative', maxWidth: 520, margin: '0 auto' }}>
            <div style={{ width: '100%', height: 10, backgroundColor: DS.border, borderRadius: 5, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%', backgroundColor: DS.red, borderRadius: 5,
                  width: `${documentationScore}%`, transition: 'width 700ms ease-out',
                }}
                data-testid="verdict-score-bar"
              />
            </div>

            {/* Marker: Industry average at 34 */}
            <div style={{ position: 'absolute', left: '34%', top: -4, transform: 'translateX(-50%)' }} data-testid="marker-industry-avg">
              <div style={{ width: 2, height: 18, backgroundColor: DS.muted }} />
              <p style={{ fontSize: 11, color: DS.muted, fontFamily: DS.font, fontWeight: 600, textAlign: 'center', marginTop: 4 }}>34</p>
            </div>

            {/* Marker: Top quartile at 71 */}
            <div style={{ position: 'absolute', left: '71%', top: -4, transform: 'translateX(-50%)' }} data-testid="marker-top-quartile">
              <div style={{ width: 2, height: 18, backgroundColor: DS.black }} />
              <p style={{ fontSize: 11, color: DS.black, fontFamily: DS.font, fontWeight: 600, textAlign: 'center', marginTop: 4 }}>71</p>
            </div>
          </div>
        </FadeIn>

        {/* Benchmark context */}
        <FadeIn delay={3600} className="mt-10">
          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <p style={{ fontSize: 11, color: DS.muted, fontFamily: DS.font }}>
                Industry average \u2014 organizations using ambient AI today
              </p>
              <p style={{ fontSize: 17, fontWeight: 700, color: DS.black, fontFamily: DS.font }} data-testid="text-benchmark-industry">
                34 / 100
              </p>
            </div>
            <div className="text-center">
              <p style={{ fontSize: 11, color: DS.muted, fontFamily: DS.font }}>
                Top-quartile organizations
              </p>
              <p style={{ fontSize: 17, fontWeight: 700, color: DS.black, fontFamily: DS.font }} data-testid="text-benchmark-top">
                71 / 100
              </p>
            </div>
          </div>
        </FadeIn>

        {/* Verdict card */}
        <FadeIn delay={4000} className="mt-8">
          <div
            style={{
              backgroundColor: DS.bg, border: `1px solid ${DS.border}`, borderRadius: DS.radius.card,
              padding: 32, maxWidth: 520, margin: '0 auto',
            }}
            data-testid="card-verdict"
          >
            <p style={{ fontSize: 20, fontWeight: 700, color: DS.black, fontFamily: DS.font, marginBottom: 12 }} data-testid="text-verdict-headline">
              {verdict.headline}
            </p>
            <p style={{ fontSize: 17, color: DS.body, lineHeight: 1.75, fontFamily: DS.font }} data-testid="text-verdict-body">
              {verdict.body}
            </p>
          </div>
        </FadeIn>

        {/* SECTION C — THE IMPLICATION */}
        <FadeIn delay={4600} className="mt-12">
          <p
            style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase' }}
            className="mb-6"
            data-testid="text-opportunity-label"
          >
            Your Primary Opportunity
          </p>

          <div
            style={{
              backgroundColor: DS.white, border: `1px solid ${DS.border}`, borderLeft: `4px solid ${DS.red}`,
              borderRadius: 12, padding: '24px 24px 24px 20px',
            }}
            data-testid="card-primary-opportunity"
          >
            <p style={{ fontWeight: 600, fontSize: 13, color: DS.red, letterSpacing: '2.5px', textTransform: 'uppercase', fontFamily: DS.font, marginBottom: 12 }}>
              {DOMAIN_LABELS[lowestDomain]}
            </p>
            <p style={{ fontSize: 20, fontWeight: 600, color: DS.black, fontFamily: DS.font, lineHeight: 1.5, marginBottom: 16 }}>
              {OPPORTUNITY_STATEMENTS[lowestDomain]}
            </p>
            <p style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 32, color: DS.red, lineHeight: 1 }} data-testid="text-opportunity-value">
              {formatDollar(domainGaps[lowestDomain])}
            </p>
            <p style={{ fontSize: 13, color: DS.muted, fontFamily: DS.font, marginTop: 4 }}>
              estimated annual opportunity in this domain
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={4600} className="mt-8">
          <p style={{ fontSize: 15, color: DS.body, fontFamily: DS.font, textAlign: 'center', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }} data-testid="text-improvement-projection">
            Improving your score in {DOMAIN_LABELS[lowestDomain].toLowerCase()} by one activation level would move your overall Documentation Intelligence Score from {documentationScore} to an estimated {improvedTotal}.
          </p>
        </FadeIn>

        {/* Footnote */}
        <FadeIn delay={5000} className="mt-10">
          <p style={{ fontSize: 13, color: DS.muted, fontFamily: DS.font, textAlign: 'center', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }} data-testid="text-footnote">
            This score reflects your self-reported activation across four dimensions of documentation intelligence. It is not a vendor assessment. It is a diagnostic based on your organization's inputs.
          </p>
        </FadeIn>

        {/* CTA */}
        <FadeIn delay={5400} className="mt-10">
          <div className="flex items-center justify-between">
            <button onClick={onBack} style={{ fontSize: 15, color: DS.body, textDecoration: 'underline', textUnderlineOffset: '2px', cursor: 'pointer', background: 'none', border: 'none', fontFamily: DS.font, fontWeight: 500 }} data-testid="button-back">
              Back
            </button>
            <button
              onClick={onNext}
              className="inline-flex items-center gap-2"
              style={{
                fontFamily: DS.font, fontWeight: 600, fontSize: 15, padding: '15px 36px', borderRadius: DS.radius.input,
                backgroundColor: DS.red, color: DS.white, border: 'none', cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = DS.redHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = DS.red)}
              data-testid="button-next"
            >
              See What This Is Costing You
              <ArrowRight size={16} />
            </button>
          </div>
        </FadeIn>

      </div>
    </div>
  );
}
