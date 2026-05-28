import { motion } from "framer-motion";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import type { SwitchInputs } from "@/lib/switchGapCalculator";

interface ScreenHospitalTypeProps {
  onNext: () => void;
}

type OrgType = SwitchInputs['orgType'];

const ORG_TYPE_OPTIONS: { value: OrgType; label: string; sub: string }[] = [
  {
    value: 'amc',
    label: 'Academic Medical Center',
    sub: 'Teaching hospital or health system affiliated with a medical school.',
  },
  {
    value: 'community',
    label: 'Community Hospital or Regional Health System',
    sub: 'Independent or regionally-aligned hospital serving a defined geography.',
  },
  {
    value: 'idn',
    label: 'Integrated Delivery Network (IDN)',
    sub: 'Multi-hospital system with owned ambulatory, post-acute, and/or insurance assets.',
  },
  {
    value: 'physician_group',
    label: 'Physician Group or Medical Group',
    sub: 'Ambulatory-first or multispecialty group — not primarily hospital-based.',
  },
  {
    value: 'other',
    label: 'Other',
    sub: "Specialty hospital, critical access, or doesn't fit a category above.",
  },
];

export default function ScreenHospitalType({ onNext }: ScreenHospitalTypeProps) {
  const { state, dispatch } = useAssessment();
  const orgType = state.inputs.orgType || '';
  const orgName = state.inputs.organizationName?.trim() || '';

  const handleSelect = (v: OrgType) => {
    dispatch(assessmentActions.updateInput('orgType', v));
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
          ? <>What type of<br />organization is<br />{orgName}?</>
          : <>What type of<br />organization<br />are you?</>
        }
      </motion.h1>

      <motion.div
        className="bg-[#EA2C00] h-[2px] mb-6 sm:mb-10"
        initial={{ width: 0 }}
        animate={{ width: 44 }}
        transition={{ delay: 0.6, duration: 0.5, ease: 'easeOut' }}
      />

      <div className="flex flex-col gap-3">
        {ORG_TYPE_OPTIONS.map((opt, i) => {
          const isSelected = orgType === opt.value;
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
