import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import type { Domain } from "./ambient/domainCalculations";
import { LEVEL_NAMES, DOMAIN_LABELS, DOMAIN_ORDER } from "./ambient/domainCalculations";
import { PageTransition } from "@/components/PageTransition";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";

import ScreenOrganization from "./ambient/ScreenOrganization";
import ScreenTenure from "./ambient/ScreenTenure";
import ScreenHospitalType from "./ambient/ScreenHospitalType";
import ScreenScale from "./ambient/ScreenScale";
import ScreenDomains from "./ambient/Screen4Domains";
import ScreenPatientExperience from "./ambient/ScreenPatientExperience";
import ScreenScore from "./ambient/Screen3Score";
import Screen5Gap from "./ambient/Screen5Gap";

interface AmbientNarrativeFlowProps {
  onBack: () => void;
  onBackToJourney?: () => void;
  onNavigateToExplore?: (providers: number, encounters: number) => void;
}

const TOTAL_SCREENS = 8;

const STEP_NAMES = [
  "Organization",
  "Tenure",
  "Organization Type",
  "Scale",
  "Four Domains",
  "Patient Experience",
  "Score",
  "Domain Analysis",
];

// ── Framework Introduction Overlay ─────────────────────────────────────────
const FRAMEWORK_LEVELS = [
  {
    num: 1,
    name: LEVEL_NAMES[1],
    desc: "Value is generating. The measurement story hasn't started yet. This is the most common starting point across all four domains.",
    borderColor: 'rgba(234,44,0,0.60)',
    borderWidth: '4px',
    nameColor: 'rgba(255,255,255,0.90)',
    descColor: 'rgba(255,255,255,0.55)',
  },
  {
    num: 2,
    name: LEVEL_NAMES[2],
    desc: "Directional signals are visible in the data. The direction is clear — a formal number hasn't been committed to yet.",
    borderColor: 'rgba(234,44,0,0.60)',
    borderWidth: '4px',
    nameColor: 'rgba(255,255,255,0.90)',
    descColor: 'rgba(255,255,255,0.55)',
  },
  {
    num: 3,
    name: LEVEL_NAMES[3],
    desc: 'A formal dollar figure is on the books. The value is calculable, auditable, and attributable to the deployment.',
    borderColor: 'rgba(234,44,0,0.60)',
    borderWidth: '4px',
    nameColor: 'rgba(255,255,255,0.90)',
    descColor: 'rgba(255,255,255,0.55)',
  },
  {
    num: 4,
    name: LEVEL_NAMES[4],
    desc: 'Documentation intelligence is actively informing decisions — care model design, payer strategy, workforce planning, clinical AI.',
    borderColor: 'rgba(234,44,0,0.60)',
    borderWidth: '4px',
    nameColor: 'rgba(255,255,255,0.90)',
    descColor: 'rgba(255,255,255,0.55)',
  },
] as const;

function FrameworkIntroOverlay({ onComplete }: { onComplete: () => void }) {
  const ITEM_H = 78;
  const [visibleCount, setVisibleCount] = useState(0);
  const [markerIdx, setMarkerIdx] = useState<number | null>(null);
  const [settled, setSettled] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const timers = [
      setTimeout(() => setVisibleCount(1), 700),
      setTimeout(() => setVisibleCount(2), 1350),
      setTimeout(() => setVisibleCount(3), 2000),
      setTimeout(() => setVisibleCount(4), 2650),
      // marker appears and scans
      setTimeout(() => setMarkerIdx(0), 3400),
      setTimeout(() => setMarkerIdx(1), 4100),
      setTimeout(() => setMarkerIdx(2), 4750),
      setTimeout(() => setMarkerIdx(3), 5350),
      // marker holds at L4 after scan — no presupposed starting position
      setTimeout(() => setSettled(true), 6050),
      setTimeout(() => setShowText(true), 6750),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const markerY = (markerIdx ?? 0) * ITEM_H + ITEM_H / 2 - 6;

  return (
    <motion.div
      className="fixed inset-0 bg-[#1A1A1A] z-[60] overflow-y-auto cursor-pointer"
      onClick={onComplete}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Skip button */}
      <motion.button
        type="button"
        onClick={(e) => { e.stopPropagation(); onComplete(); }}
        className="absolute top-5 right-6 text-xs text-white/35 hover:text-white/70 transition-colors border-none bg-transparent cursor-pointer z-10"
        style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 500, letterSpacing: '0.5px' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        Skip →
      </motion.button>

      <div className="min-h-full flex flex-col lg:grid lg:grid-cols-[4fr_6fr]">

        {/* ── LEFT: Narrative ── */}
        <div className="p-6 sm:p-8 lg:p-12 xl:p-16 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-white/[0.07]">

          <motion.p
            className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[4px] mb-10"
            style={{ fontFamily: "'Manrope', sans-serif" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            Before We Begin
          </motion.p>

          <motion.h2
            className="font-abridge uppercase text-white leading-[1.04] mb-10"
            style={{ fontSize: 'clamp(2rem, 3vw, 3.4rem)' }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            Four domains.<br />Four levels.
          </motion.h2>

          <motion.div
            className="bg-[#EA2C00] h-[2px] mb-8"
            initial={{ width: 0 }}
            animate={{ width: 44 }}
            transition={{ delay: 0.7, duration: 0.5, ease: 'easeOut' }}
          />

          <motion.p
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 300,
              fontSize: 'clamp(0.88rem, 1.1vw, 0.98rem)',
              lineHeight: 1.85,
              color: 'rgba(255,255,255,0.58)',
              marginBottom: '3rem',
              maxWidth: 'min(100%, 380px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.95, duration: 0.6 }}
          >
            Ambient deployments generate value across four domains simultaneously.
            For each one, the assessment reads where the organization stands.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.5 }}
            style={{
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 500,
              fontSize: '0.78rem',
              letterSpacing: '0.5px',
              color: 'rgba(255,255,255,0.28)',
            }}
          >
            Tap anywhere to continue →
          </motion.p>

        </div>

        {/* ── RIGHT: Animated level reveal ── */}
        <div className="p-6 sm:p-8 lg:p-12 xl:p-16 flex flex-col justify-center">

          <motion.p
            className="text-[9px] font-semibold uppercase tracking-[3px] mb-10"
            style={{ fontFamily: "'Manrope', sans-serif", color: 'rgba(255,255,255,0.40)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: visibleCount > 0 ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          >
            How each domain is rated
          </motion.p>

          {/* Level names + scanning marker */}
          <div className="relative pl-8">

            {/* Marker */}
            {markerIdx !== null && (
              <motion.div
                className="absolute left-0 top-0 flex items-center pointer-events-none z-10"
                initial={{ opacity: 0, y: markerY }}
                animate={{ opacity: 1, y: markerY }}
                transition={{
                  opacity: { duration: 0.35 },
                  y: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
                }}
              >
                <motion.div
                  className="w-[10px] h-[10px] rounded-full bg-[#EA2C00] flex-shrink-0"
                  animate={{
                    boxShadow: '0 0 0 3px rgba(234,44,0,0.22), 0 0 18px rgba(234,44,0,0.55)',
                  }}
                  transition={{}}
                />
                <div
                  className="h-px ml-2 flex-shrink-0"
                  style={{
                    width: 28,
                    background: 'linear-gradient(to right, rgba(234,44,0,0.55), transparent)',
                  }}
                />
              </motion.div>
            )}

            {/* Level names */}
            {FRAMEWORK_LEVELS.map((level, i) => (
              <div
                key={level.num}
                style={{ height: `${ITEM_H}px` }}
                className="flex items-center"
              >
                <motion.span
                  className="font-abridge uppercase leading-none select-none"
                  style={{ fontSize: 'clamp(1.55rem, 2.6vw, 2.5rem)' }}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{
                    opacity: visibleCount > i ? 0.82 : 0,
                    x: visibleCount > i ? 0 : 18,
                    color: 'rgba(255,255,255,0.82)',
                  }}
                  transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  {level.name}
                </motion.span>
              </div>
            ))}
          </div>

          {/* Settlement text */}
          <AnimatePresence>
            {showText && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65 }}
                className="mt-5 pl-8"
              >
                <p style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontWeight: 500,
                  fontSize: '0.82rem',
                  letterSpacing: '0.3px',
                  color: 'rgba(255,255,255,0.60)',
                }}>
                  Each domain is read independently —
                </p>
                <p style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontWeight: 300,
                  fontSize: '0.82rem',
                  letterSpacing: '0.3px',
                  marginTop: '4px',
                  color: 'rgba(255,255,255,0.42)',
                }}>
                  where one lands doesn't determine the others.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>
    </motion.div>
  );
}

// ── Score Reveal Overlay ────────────────────────────────────────────────────
function ScoreRevealOverlay({ onComplete }: { onComplete: () => void }) {
  const [showCta, setShowCta] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => setShowCta(true), 2600);
    return () => { document.body.style.overflow = prev; clearTimeout(t); };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 bg-[#1A1A1A] z-[60] flex flex-col items-center justify-center px-6 cursor-pointer"
      onClick={onComplete}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.p
        className="text-[9px] font-semibold text-white/45 uppercase tracking-[4px] mb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        Ambient Value Domains
      </motion.p>

      <div className="flex flex-col items-center gap-4 mb-12">
        {['CAPACITY', 'REVENUE', 'WORKFORCE', 'QUALITY'].map((name, i) => (
          <motion.p
            key={name}
            className="text-sm font-bold text-white/70 uppercase tracking-[5px]"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.38, duration: 0.4, ease: 'easeOut' }}
          >
            {name}
          </motion.p>
        ))}
      </div>

      <motion.div
        className="bg-[#EA2C00] h-[2px] mb-6"
        initial={{ width: 0 }}
        animate={{ width: 32 }}
        transition={{ delay: 1.9, duration: 0.5, ease: 'easeOut' }}
      />

      <AnimatePresence>
        {showCta && (
          <motion.button
            type="button"
            onClick={onComplete}
            className="inline-flex items-center gap-2 bg-white text-[#1A1A1A] rounded-full border-none cursor-pointer hover:bg-[#EA2C00] hover:text-white transition-colors duration-300 mt-2"
            style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.3px', padding: '0.875rem 2rem' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            See the Score →
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Flow ───────────────────────────────────────────────────────────────
export default function AmbientNarrativeFlow({
  onBack,
  onBackToJourney,
  onNavigateToExplore,
}: AmbientNarrativeFlowProps) {
  const [initialDomain, setInitialDomain] = useState<Domain>('capacity');
  const [showScoreReveal, setShowScoreReveal] = useState(false);
  const [showFrameworkIntro, setShowFrameworkIntro] = useState(false);
  const { state, dispatch } = useAssessment();
  const { inputs } = state;
  const currentStep = state.navigation.currentStep;

  const canProceedFromScale =
    inputs.providers > 0 && inputs.annualEncounters > 0 && inputs.utilization > 0;

  // Reliable scroll-to-top after every step transition
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [currentStep]);

  const goToStep = (step: number) => {
    if (step < 1 || step > TOTAL_SCREENS) return;
    dispatch(assessmentActions.setStep(step));
  };

  const handleNext = () => {
    dispatch(assessmentActions.completeStep(currentStep));

    // After Scale (step 4), show the framework intro before domains
    if (currentStep === 4) {
      if (!canProceedFromScale) return;
      setShowFrameworkIntro(true);
      return;
    }

    // After Patient Experience (step 6), show score reveal overlay
    if (currentStep === 6) {
      setShowScoreReveal(true);
      return;
    }

    goToStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep === 1) {
      onBack();
    } else {
      goToStep(currentStep - 1);
    }
  };

  const handleHome = () => {
    if (onBackToJourney) {
      onBackToJourney();
    } else if (onBack) {
      onBack();
    }
  };

  const handleFrameworkIntroComplete = () => {
    setShowFrameworkIntro(false);
    goToStep(5);
  };

  const handleScoreRevealComplete = () => {
    setShowScoreReveal(false);
    goToStep(7);
  };

  const renderScreen = () => {
    switch (currentStep) {
      case 1:
        return <ScreenOrganization onNext={handleNext} />;
      case 2:
        return <ScreenTenure onNext={handleNext} />;
      case 3:
        return <ScreenHospitalType onNext={handleNext} />;
      case 4:
        return <ScreenScale onNext={handleNext} onBack={handleBack} />;
      case 5:
        return <ScreenDomains onNext={handleNext} onBack={handleBack} initialDomain={initialDomain} />;
      case 6:
        return <ScreenPatientExperience onNext={handleNext} onBack={handleBack} />;
      case 7:
        return (
          <ScreenScore
            onNext={handleNext}
            onBack={handleBack}
            onNavigateToDomain={(domain) => { setInitialDomain(domain); goToStep(5); }}
          />
        );
      case 8:
        return (
          <Screen5Gap
            onBack={handleBack}
            onNavigateToBaseline={() => goToStep(4)}
            onNavigateToExplore={onNavigateToExplore}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">

      <AnimatePresence>
        {showFrameworkIntro && (
          <FrameworkIntroOverlay onComplete={handleFrameworkIntroComplete} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScoreReveal && <ScoreRevealOverlay onComplete={handleScoreRevealComplete} />}
      </AnimatePresence>

      <UnifiedHeader
        pathType="switch"
        currentStep={currentStep}
        totalSteps={TOTAL_SCREENS}
        stepName={STEP_NAMES[currentStep - 1]}
        onBack={handleBack}
        showBack={currentStep !== 5}
        onHome={handleHome}
      />
      <UnifiedHeaderSpacer />

      <main className="px-6 md:px-16 lg:px-24 py-8 md:py-12">
        <PageTransition pageKey={`ambient-screen-${currentStep}`}>
          {renderScreen()}
        </PageTransition>
      </main>
    </div>
  );
}
