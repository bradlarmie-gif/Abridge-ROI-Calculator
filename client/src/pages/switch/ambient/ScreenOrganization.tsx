import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAssessment, assessmentActions } from "@/lib/assessment";

interface ScreenOrganizationProps {
  onNext: () => void;
}

export default function ScreenOrganization({ onNext }: ScreenOrganizationProps) {
  const { state, dispatch } = useAssessment();
  const value = state.inputs.organizationName || '';
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    const t = setTimeout(() => inputRef.current?.focus(), 500);
    return () => clearTimeout(t);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(assessmentActions.updateInput('organizationName', e.target.value));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) onNext();
  };

  const canProceed = value.trim().length > 0;

  return (
    <div className="min-h-[60vh] sm:min-h-[72vh] flex flex-col justify-center max-w-[680px]">

      <motion.p
        className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[4px] mb-6 sm:mb-12"
        style={{ fontFamily: "'Manrope', sans-serif" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        Ambient Assessment
      </motion.p>

      <motion.p
        className="text-[#6B6057] mb-5"
        style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 300,
          fontSize: 'clamp(1rem, 1.4vw, 1.15rem)',
          lineHeight: 1.5,
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
      >
        This assessment is for
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="your health system"
          className="headline-input w-full bg-transparent outline-none font-abridge uppercase text-[#1A1A1A] pb-4"
          style={{
            lineHeight: 1.04,
            borderBottom: `2px solid ${focused || value ? '#EA2C00' : '#C8C0B5'}`,
            transition: 'border-color 0.25s ease',
          }}
        />
      </motion.div>

      <div className="mt-6 sm:mt-8 relative h-12">
        {/* Hint — hidden instantly when canProceed, no overlap */}
        <p
          className="absolute top-1/2 -translate-y-1/2 text-xs text-[#BBBBBB]"
          style={{
            fontFamily: "'Manrope', sans-serif",
            opacity: canProceed ? 0 : 1,
            pointerEvents: canProceed ? 'none' : 'auto',
          }}
        >
          Type the name and press Enter
        </p>

        {/* Button — animates in on top, no exit needed */}
        <AnimatePresence>
          {canProceed && (
            <motion.button
              key="continue"
              type="button"
              onClick={onNext}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute top-1/2 -translate-y-1/2 left-0 inline-flex items-center gap-2 bg-[#1A1A1A] text-white rounded-full hover:bg-[#EA2C00] transition-colors duration-300 border-none cursor-pointer"
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 600,
                fontSize: '0.875rem',
                letterSpacing: '0.3px',
                padding: '0.875rem 2rem',
              }}
            >
              Continue →
            </motion.button>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
