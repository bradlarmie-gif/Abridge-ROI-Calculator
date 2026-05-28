import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAssessment, assessmentActions } from "@/lib/assessment";

interface ScreenTenureProps {
  onNext: () => void;
}

const TENURE_OPTIONS = [
  {
    value: '0-6' as const,
    label: 'Less than 6 months',
    sub: "Early deployment — the technology is working, but data is still accumulating.",
  },
  {
    value: '6-12' as const,
    label: '6 to 12 months',
    sub: "Enough time for patterns to emerge across the provider base.",
  },
  {
    value: '12-24' as const,
    label: '1 to 2 years',
    sub: 'A full data picture is available — across cohorts, specialties, and use cases.',
  },
  {
    value: '24+' as const,
    label: 'More than 2 years',
    sub: "Deep deployment history across the full organization.",
  },
];

export default function ScreenTenure({ onNext }: ScreenTenureProps) {
  const { state, dispatch } = useAssessment();
  const tenure = state.inputs.deploymentTenure || '';
  const orgName = state.inputs.organizationName?.trim() || '';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const handleSelect = (v: typeof TENURE_OPTIONS[number]['value']) => {
    dispatch(assessmentActions.updateInput('deploymentTenure', v));
    setTimeout(() => onNext(), 280);
  };

  return (
    <div className="pt-8 pb-12 sm:pt-14 sm:pb-16 max-w-[640px]">

      <motion.p
        className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[4px] mb-5 sm:mb-10"
        style={{ fontFamily: "'Manrope', sans-serif" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        Ambient Assessment
      </motion.p>

      <motion.h1
        className="font-abridge uppercase text-[#1A1A1A] leading-[1.04] mb-8"
        style={{ fontSize: 'clamp(1.9rem, 5vw, 4rem)' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {orgName
            ? <>How long has<br />{orgName}<br />been live on ambient?</>
            : <>How long have you<br />been live on ambient?</>
          }
      </motion.h1>

      <motion.div
        className="bg-[#EA2C00] h-[2px] mb-6 sm:mb-10"
        initial={{ width: 0 }}
        animate={{ width: 44 }}
        transition={{ delay: 0.6, duration: 0.5, ease: 'easeOut' }}
      />

      <div className="flex flex-col gap-3">
        {TENURE_OPTIONS.map((opt, i) => {
          const isSelected = tenure === opt.value;
          return (
            <motion.button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 + i * 0.08, duration: 0.4 }}
              className={`text-left px-6 py-5 rounded-2xl border transition-all duration-200 relative ${
                isSelected
                  ? 'border-[#EA2C00] bg-[#EA2C00]/5'
                  : 'border-[#C8C0B5] bg-white hover:border-[#EA2C00]/40 hover:bg-[#FFF8F6]'
              }`}
            >
              {isSelected && (
                <div className="absolute left-0 top-4 bottom-4 w-[3px] bg-[#EA2C00] rounded-full" />
              )}
              <p
                className="font-semibold text-base mb-1 leading-snug text-[#1A1A1A]"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                {opt.label}
              </p>
              <p
                className={`text-sm leading-relaxed transition-colors duration-200 ${
                  isSelected ? 'text-[#EA2C00]/80' : 'text-[#6B6057]'
                }`}
                style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 400 }}
              >
                {opt.sub}
              </p>
            </motion.button>
          );
        })}
      </div>

    </div>
  );
}
