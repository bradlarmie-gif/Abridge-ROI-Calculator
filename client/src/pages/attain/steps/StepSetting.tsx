import { Stethoscope, Zap, ClipboardList, HeartPulse, Check } from "lucide-react";
import { motion } from "framer-motion";
import type { AttainSetting } from "@/lib/attain/attainTypes";

interface SettingOption {
  id: AttainSetting;
  label: string;
  shortDesc: string;
  description: string;
  icon: typeof Stethoscope;
}

const SETTINGS: SettingOption[] = [
  {
    id: "outpatient",
    label: "Outpatient",
    shortDesc: "Primary care & specialty",
    description: "Panel access, wRVU capture, and provider retention across clinics.",
    icon: Stethoscope,
  },
  {
    id: "ed",
    label: "Emergency",
    shortDesc: "Emergency department",
    description: "Throughput, LWBS recovery, coding accuracy, and provider retention.",
    icon: Zap,
  },
  {
    id: "inpatient",
    label: "Inpatient",
    shortDesc: "Hospital medicine",
    description: "DRG accuracy, CDI turnaround, and hospitalist retention.",
    icon: ClipboardList,
  },
  {
    id: "nursing",
    label: "Nursing",
    shortDesc: "Inpatient nursing",
    description: "Bundle compliance, preventable harm, and nurse retention.",
    icon: HeartPulse,
  },
];

interface StepSettingProps {
  selected: AttainSetting | null;
  onSelect: (setting: AttainSetting) => void;
}

export default function StepSetting({ selected, onSelect }: StepSettingProps) {
  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step 1 · Where does this plan live?
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Pick the care setting
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed max-w-[560px]" data-testid="text-step-teach">
          Every Value Attainment plan is scoped to one care setting, because the goals, the value chain, and the
          benchmarks all change with it. Pick where this plan is aimed. You can build a separate plan for another
          setting later.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {SETTINGS.map((s, i) => {
          const Icon = s.icon;
          const isSelected = selected === s.id;
          return (
            <motion.button
              key={s.id}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => onSelect(s.id)}
              className={`text-left rounded-xl p-5 border-2 transition-all ${
                isSelected ? "border-[#EA2C00] bg-[#FFF6F3]" : "border-[#E5E5E5] bg-white hover:border-[#D8CFC4]"
              }`}
              data-testid={`card-attain-setting-${s.id}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#EA2C00]" />
                </div>
                {isSelected && <Check className="w-5 h-5 text-[#EA2C00]" />}
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">{s.label}</h3>
              <p className="text-xs text-[#8C8C8C] mb-2">{s.shortDesc}</p>
              <p className="text-sm text-[#3A3A3A] leading-relaxed">{s.description}</p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
