import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { DS } from "./designTokens";
import { useAssessment } from "@/lib/assessment";
import { calculateAmbientScore } from "./ambientCalculator";

interface Screen3Props {
  onNext: () => void;
  onBack: () => void;
}

function AnimatedNumber({ target, duration = 1400 }: { target: number; duration?: number }) {
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

  return <>{current}</>;
}

function ScoreBar({ score, delay = 0 }: { score: number; delay?: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setWidth(Math.min(score, 100)), delay);
    return () => clearTimeout(timer);
  }, [score, delay]);

  return (
    <div style={{ width: '100%', maxWidth: 480, height: 10, backgroundColor: DS.border, borderRadius: 5, overflow: 'hidden', margin: '0 auto' }}>
      <div
        style={{
          height: '100%', backgroundColor: DS.red, borderRadius: 5,
          width: `${width}%`, transition: 'width 700ms ease-out',
        }}
        data-testid="score-bar-fill"
      />
    </div>
  );
}

export default function Screen3Score({ onNext, onBack }: Screen3Props) {
  const { state } = useAssessment();
  const { inputs } = state;

  const result = useMemo(() => calculateAmbientScore(
    inputs.providers, inputs.annualEncounters,
    inputs.utilization || 45, inputs.timeSavedPerEncounter || 2.0,
    inputs.dataMode,
  ), [inputs]);

  const [phase, setPhase] = useState<'reveal' | 'benchmarks' | 'verdict'>('reveal');
  const [showCTA, setShowCTA] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('benchmarks'), 900);
    const t2 = setTimeout(() => setPhase('verdict'), 1600);
    const t3 = setTimeout(() => setShowCTA(true), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center" style={{ fontFamily: DS.font, minHeight: 'calc(100vh - 56px)', paddingTop: 80, paddingBottom: 80 }}>
      <div className="w-full max-w-[480px] text-center">
        <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase' }} className="mb-14" data-testid="text-screen3-label">
          Documentation Intelligence Score
        </p>

        <div className="mb-6" data-testid="score-number">
          <span style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 96, color: DS.black, lineHeight: 1 }}>
            <AnimatedNumber target={result.score} />
          </span>
        </div>

        <p style={{ fontSize: 24, color: DS.muted, fontWeight: 400 }} className="mb-6">/ 100</p>

        <ScoreBar score={result.score} delay={200} />

        <div
          className="mt-12 transition-all duration-500"
          style={{ opacity: phase === 'benchmarks' || phase === 'verdict' ? 1 : 0, transform: phase === 'benchmarks' || phase === 'verdict' ? 'translateY(0)' : 'translateY(6px)' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 13, color: DS.muted }} className="mb-1">
                Industry average — organizations using ambient AI today
              </p>
              <p style={{ fontSize: 24, fontWeight: 700, color: DS.black }}>34 / 100</p>
            </div>
            <div>
              <p style={{ fontSize: 13, color: DS.muted }} className="mb-1">
                Top-quartile organizations
              </p>
              <p style={{ fontSize: 24, fontWeight: 700, color: DS.black }}>71 / 100</p>
            </div>
          </div>
        </div>

        <div
          className="mt-12 transition-all duration-500"
          style={{ opacity: phase === 'verdict' ? 1 : 0, transform: phase === 'verdict' ? 'translateY(0)' : 'translateY(6px)' }}
        >
          <div style={{ backgroundColor: DS.bg, border: `1px solid ${DS.border}`, borderRadius: DS.radius.card, padding: 32 }}>
            <p style={{ fontSize: 20, color: DS.black, lineHeight: 1.7, fontFamily: DS.font, fontWeight: 400 }} data-testid="text-verdict">
              {result.verdictLine}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between w-full mt-14">
          <button onClick={onBack} style={{ fontSize: 15, color: DS.body, textDecoration: 'underline', textUnderlineOffset: '2px', cursor: 'pointer', background: 'none', border: 'none', fontFamily: DS.font, fontWeight: 500 }} data-testid="button-back">
            Back
          </button>
          <button
            onClick={onNext}
            className="inline-flex items-center gap-2 transition-all duration-300"
            style={{
              fontFamily: DS.font, fontWeight: 600, fontSize: 15, padding: '15px 36px', borderRadius: DS.radius.input,
              backgroundColor: DS.red, color: DS.white, border: 'none', cursor: 'pointer',
              opacity: showCTA ? 1 : 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = DS.redHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = DS.red)}
            data-testid="button-next"
          >
            See What's Driving Your Score
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
