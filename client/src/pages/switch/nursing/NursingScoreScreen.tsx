import { useMemo } from "react";
import { motion } from "framer-motion";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { staggerContainer, staggerItem } from "@/components/PageTransition";
import type { NursingDomain, NursingDomainState, NursingBaselineInputs } from "./nursingTypes";
import { NURSING_DOMAIN_ORDER, NURSING_DOMAIN_LABELS, LEVEL_LABELS, SCORE_MAP } from "./nursingTypes";
import { computeTotalScore, getScoreLabel, generateScoreNarrative, hasAnyDomainSelected } from "./nursingCalculations";

interface ScoreScreenProps {
  baseline: NursingBaselineInputs;
  domainStates: Record<NursingDomain, NursingDomainState>;
  onNext: () => void;
  onBack: () => void;
}

const SCORE_RANGE = [
  { label: 'Not yet assessed', threshold: 25 },
  { label: 'Pressure identified', threshold: 50 },
  { label: 'Actively measuring', threshold: 75 },
  { label: 'Strategically managed', threshold: 100 },
];

export default function NursingScoreScreen({ baseline, domainStates, onNext, onBack }: ScoreScreenProps) {
  const totalScore = useMemo(() => computeTotalScore(domainStates), [domainStates]);
  const scoreLabel = useMemo(() => getScoreLabel(totalScore, domainStates), [totalScore, domainStates]);
  const narrative = useMemo(() => generateScoreNarrative(domainStates, baseline), [domainStates, baseline]);

  const scorePercent = Math.min(100, Math.max(0, totalScore));

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="max-w-[900px] mx-auto"
      >
        <motion.div className="text-center mb-10" variants={staggerItem}>
          <h1
            className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight"
            data-testid="text-score-headline"
          >
            Your Nursing Program Assessment
          </h1>
          <p className="text-base text-[#888888] max-w-[520px] mx-auto">
            Where documentation burden is creating the most pressure — and where reducing it could make the biggest difference.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-10">
          <motion.div className="flex-1" variants={staggerItem}>
            <div className="bg-[#F5F0EB] rounded-xl p-8 md:p-10 mb-8">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-6">Your Score</p>

              <div className="flex items-end gap-3 mb-2">
                <span className="text-6xl font-bold text-[#1A1A1A] leading-none" data-testid="text-total-score">{totalScore}</span>
                <span className="text-2xl font-bold text-[#888888] leading-none mb-1">/ 100</span>
              </div>

              <p className="text-sm font-semibold uppercase tracking-[1px] mb-6" style={{ color: '#EA2C00' }} data-testid="text-score-label">
                {scoreLabel}
              </p>

              <div className="relative mb-3">
                <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: '#EA2C00' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${scorePercent}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                  />
                </div>
              </div>

              <div className="flex justify-between">
                {SCORE_RANGE.map((r, i) => (
                  <span key={i} className="text-[9px] text-[#999999] text-center" style={{ width: '25%' }}>
                    {r.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-[#F5F0EB] rounded-xl p-8 md:p-10 mb-8">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">Domain Breakdown</p>
              <div className="h-px bg-[#E5E7EB] mb-4" />

              <div className="space-y-3">
                {NURSING_DOMAIN_ORDER.map((d) => {
                  const state = domainStates[d];
                  const level = state.level;
                  const score = level ? SCORE_MAP[level] : 0;
                  const levelLabel = level ? LEVEL_LABELS[d][level] : '—';
                  return (
                    <div key={d} className="flex items-center justify-between py-2 border-b border-[#E5E7EB]/50 last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#1A1A1A]" data-testid={`text-domain-name-${d}`}>
                          {NURSING_DOMAIN_LABELS[d]}
                        </p>
                        <p className="text-xs text-[#888888]">
                          {level ? `Level ${level} — ${levelLabel}` : 'Not assessed'}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-[#1A1A1A] ml-4" data-testid={`text-domain-score-${d}`}>
                        {score}<span className="text-sm text-[#888888] font-normal">/25</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <StepFooter
              onBack={onBack}
              onNext={onNext}
              nextLabel="See Priority Pathways"
              nextTestId="button-nursing-next-score"
              backTestId="button-nursing-back-score"
            />
          </motion.div>

          <motion.aside
            className="w-full lg:w-[320px] lg:sticky lg:top-24 self-start"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <div className="bg-[#1A1A1A] text-white rounded-xl p-6">
              <p className="text-[9px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-4">
                Your Assessment
              </p>
              <div className="h-px bg-white/10 mb-4" />

              <div className="text-sm text-white/80 leading-relaxed space-y-3">
                {narrative.split('. ').filter(Boolean).map((sentence, i) => (
                  <p key={i}>{sentence.endsWith('.') ? sentence : `${sentence}.`}</p>
                ))}
              </div>

              <p className="text-[10px] text-white/30 italic mt-4">
                Based on your self-reported organizational assessment.
              </p>
            </div>
          </motion.aside>
        </div>
      </motion.div>
    </div>
  );
}
