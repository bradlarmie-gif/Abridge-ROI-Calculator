import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { Checkbox } from "@/components/ui/checkbox";

interface ScreenPatientExperienceProps {
  onNext: () => void;
  onBack: () => void;
}

const AWARENESS_OPTIONS = [
  {
    v: 'not_yet',
    noticeable: 'not_tracked',
    formalized: 'no',
    label: "Not yet — no one has looked at this",
    sub: "The patient dimension of this deployment hasn't been examined.",
  },
  {
    v: 'some',
    noticeable: 'occasionally',
    formalized: 'no',
    label: 'Some feedback has surfaced, but nothing is being tracked',
    sub: 'Signals exist. No one has started connecting them to the deployment.',
  },
  {
    v: 'mentioned',
    noticeable: 'frequently',
    formalized: 'discussed',
    label: 'Providers or patients have brought it up on their own',
    sub: "The feedback is there — it just hasn't been formally captured yet.",
  },
  {
    v: 'reported',
    noticeable: 'frequently',
    formalized: 'yes',
    label: "Yes — it's part of how we talk about the deployment",
    sub: "Patient experience is woven into how we describe ambient's impact.",
  },
];

const ROOM_SIGNALS = [
  { key: 'provider_present', label: 'Providers more present — more eye contact, less screen time' },
  { key: 'feel_heard', label: 'Patients or families have said they feel more heard' },
  { key: 'fewer_interruptions', label: 'Fewer interruptions — providers focused on the conversation' },
  { key: 'better_summaries', label: 'Better after-visit summaries and care follow-through' },
  { key: 'satisfaction_scores', label: 'Patients or staff are informally reporting that visits feel different' },
  { key: 'love_story', label: "A provider has shared a story — a moment that couldn't have happened before" },
];

const FORMAL_DATA_OPTIONS = [
  {
    v: 'yes_scores',
    label: 'Yes — HCAHPS or Press Ganey scores have moved',
    sub: 'Formal patient experience data showing measurable change.',
  },
  {
    v: 'yes_nps',
    label: 'Yes — NPS or internal satisfaction surveys show movement',
    sub: 'Survey data reflecting the shift in experience.',
  },
  {
    v: 'tracking_no_change',
    label: "We track it, but haven't seen movement yet",
    sub: "The data collection is in place — attribution hasn't emerged.",
  },
  {
    v: 'not_yet',
    label: "Not yet — we haven't looked at this data",
    sub: 'The formal data question is still ahead.',
  },
];

export default function ScreenPatientExperience({ onNext, onBack }: ScreenPatientExperienceProps) {
  const { state, dispatch } = useAssessment();
  const { inputs } = state;

  const awareness = inputs.patientExperienceAwareness as string || '';
  const signalsCsv = inputs.patientExperienceSignals as string || '';
  const signals = signalsCsv.split(',').filter(Boolean);
  const formalData = inputs.patientExperienceFormalData as string || '';

  const showQ2Q3 = !!awareness && awareness !== 'not_yet';
  const [q2Visible, setQ2Visible] = useState(showQ2Q3);
  const [q3Visible, setQ3Visible] = useState(showQ2Q3);

  useEffect(() => {
    if (showQ2Q3 && !q2Visible) {
      const t = setTimeout(() => setQ2Visible(true), 150);
      return () => clearTimeout(t);
    }
    if (!showQ2Q3) {
      setQ2Visible(false);
      setQ3Visible(false);
    }
  }, [showQ2Q3, q2Visible]);

  useEffect(() => {
    if (showQ2Q3 && !q3Visible) {
      const t = setTimeout(() => setQ3Visible(true), 380);
      return () => clearTimeout(t);
    }
  }, [showQ2Q3, q3Visible]);

  const setAwareness = (opt: typeof AWARENESS_OPTIONS[number]) => {
    dispatch(assessmentActions.updateInput('patientExperienceAwareness', opt.v));
    dispatch(assessmentActions.updateInput('patientExperienceNoticeable', opt.noticeable));
    dispatch(assessmentActions.updateInput('patientExperienceFormalized', opt.formalized));
  };

  const toggleSignal = (key: string) => {
    const current = new Set(signals);
    if (current.has(key)) current.delete(key); else current.add(key);
    dispatch(assessmentActions.updateInput('patientExperienceSignals', Array.from(current).join(',')));
  };

  const setFormalDataVal = (v: string) => {
    dispatch(assessmentActions.updateInput('patientExperienceFormalData', v));
  };

  const canContinue = !!awareness;

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>

      {/* ── HERO CARD (beige) ── */}
      <motion.div
        className="bg-[#F5F0EB] rounded-2xl overflow-hidden mb-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="px-6 sm:px-8 md:px-10 py-7 sm:py-9">

          {/* Eyebrow */}
          <p
            className="text-[9px] font-semibold uppercase tracking-[3px] mb-5"
            style={{ fontFamily: "'Manrope', sans-serif", color: 'rgba(234,44,0,0.75)' }}
          >
            Patient Experience · Beyond the Score
          </p>

          {/* Headline */}
          <h1
            className="font-abridge uppercase text-[#1A1A1A] leading-[1.04] mb-3"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)' }}
          >
            The patient<br />was in the room.
          </h1>

          {/* Red rule */}
          <div className="w-10 h-[2px] bg-[#EA2C00] mb-5" />

          {/* Q1 */}
          <label
            className="block text-sm font-semibold text-[#1A1A1A] mb-3"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Has the change in the room been noticed?
          </label>

          <div className="flex flex-col gap-2">
            {AWARENESS_OPTIONS.map(opt => {
              const selected = awareness === opt.v;
              return (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setAwareness(opt)}
                  className={`w-full text-left rounded-xl cursor-pointer transition-all duration-200 active:scale-[0.995] border-2 p-3.5 ${
                    selected
                      ? 'border-[#EA2C00] bg-white/90'
                      : 'border-[rgba(26,26,26,0.12)] bg-white/65 hover:border-[rgba(26,26,26,0.25)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                      selected ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#C8C0B5] bg-white'
                    }`} />
                    <div>
                      <p
                        className="text-sm font-semibold text-[#1A1A1A] leading-snug mb-0.5"
                        style={{ fontFamily: "'Manrope', sans-serif" }}
                      >
                        {opt.label}
                      </p>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ fontFamily: "'Manrope', sans-serif", color: 'rgba(26,26,26,0.62)' }}
                      >
                        {opt.sub}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

        </div>
      </motion.div>

      {/* ── Q2 — room signals ── */}
      <AnimatePresence>
        {q2Visible && (
          <motion.div
            className="bg-white rounded-2xl overflow-hidden mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.35 }}
          >
            <div className="px-6 sm:px-8 md:px-10 py-7 sm:py-8">
              <label className="block text-sm font-semibold text-[#EA2C00] mb-4" style={{ fontFamily: "'Manrope', sans-serif" }}>
                What are you hearing from the room?
              </label>
              <div className="flex flex-col gap-2.5">
                {ROOM_SIGNALS.map(sig => {
                  const selected = signals.includes(sig.key);
                  return (
                    <label
                      key={sig.key}
                      className={`flex items-start gap-3 rounded-lg border-2 px-3.5 py-3.5 cursor-pointer transition-all active:scale-[0.995] ${
                        selected
                          ? 'border-[#EA2C00] bg-[#FFF5F2]'
                          : 'border-[rgba(26,26,26,0.12)] bg-white hover:border-[rgba(26,26,26,0.25)]'
                      }`}
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleSignal(sig.key)}
                        className="mt-0.5 flex-shrink-0"
                      />
                      <span className="text-sm text-[#1A1A1A] select-none leading-snug" style={{ fontFamily: "'Manrope', sans-serif" }}>
                        {sig.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Q3 — formal data ── */}
      <AnimatePresence>
        {q3Visible && (
          <motion.div
            className="bg-white rounded-2xl overflow-hidden mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.35 }}
          >
            <div className="px-6 sm:px-8 md:px-10 py-7 sm:py-8">
              <label className="block text-sm font-semibold text-[#EA2C00] mb-4" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Is this showing up in your formal patient experience data?
              </label>
              <div className="flex flex-col gap-2.5">
                {FORMAL_DATA_OPTIONS.map(opt => {
                  const selected = formalData === opt.v;
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setFormalDataVal(opt.v)}
                      className={`rounded-lg p-3.5 text-left transition-all cursor-pointer active:scale-[0.995] border-2 ${
                        selected
                          ? 'bg-[#FFF5F2] border-[#EA2C00]'
                          : 'bg-white border-[rgba(26,26,26,0.12)] hover:border-[rgba(26,26,26,0.25)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                          selected ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#C8C0B5] bg-white'
                        }`} />
                        <div>
                          <p className="text-sm font-semibold text-[#1A1A1A] leading-snug mb-0.5" style={{ fontFamily: "'Manrope', sans-serif" }}>
                            {opt.label}
                          </p>
                          <p className="text-xs leading-relaxed" style={{ fontFamily: "'Manrope', sans-serif", color: 'rgba(26,26,26,0.62)' }}>
                            {opt.sub}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CTA ── */}
      <AnimatePresence>
        {canContinue && (
          <motion.div
            className="pt-4 pb-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white rounded-full hover:bg-[#EA2C00] transition-colors duration-300 border-none cursor-pointer"
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 600,
                fontSize: '0.875rem',
                letterSpacing: '0.3px',
                padding: '1rem 2.25rem',
              }}
            >
              Calculate the Score →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
