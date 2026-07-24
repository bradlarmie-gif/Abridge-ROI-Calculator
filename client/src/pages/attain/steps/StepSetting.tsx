import { Check } from "lucide-react";
import { motion } from "framer-motion";
import type { AttainSetting } from "@/lib/attain/attainTypes";

interface SettingOption {
  id: AttainSetting;
  label: string;
  shortDesc: string;
  description: string;
}

const SETTINGS: SettingOption[] = [
  {
    id: "outpatient",
    label: "Outpatient",
    shortDesc: "Primary care & specialty",
    description: "Panel access, wRVU capture, and provider retention across clinics.",
  },
  {
    id: "ed",
    label: "Emergency",
    shortDesc: "Emergency department",
    description: "Throughput, LWBS recovery, coding accuracy, and provider retention.",
  },
  {
    id: "inpatient",
    label: "Inpatient",
    shortDesc: "Hospital medicine",
    description: "DRG accuracy, CDI turnaround, and hospitalist retention.",
  },
  {
    id: "nursing",
    label: "Nursing",
    shortDesc: "Inpatient nursing",
    description: "Bundle compliance, preventable harm, and nurse retention.",
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

      {/* Editorial light cards: a hairline card, no icon, coral only on select. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 max-w-[720px]">
        {SETTINGS.map((s, i) => {
          const isSelected = selected === s.id;
          return (
            <motion.button
              key={s.id}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => onSelect(s.id)}
              className={`relative text-left rounded-lg border p-4 transition-colors ${
                isSelected ? "border-[#EA2C00] bg-[#FFF9F7]" : "border-[#E7E0D6] bg-white hover:border-[#D8CFC4]"
              }`}
              data-testid={`card-attain-setting-${s.id}`}
            >
              {isSelected && <Check className="absolute top-3.5 right-3.5 w-4 h-4 text-[#EA2C00]" strokeWidth={2.75} />}
              <h3 className={`text-[15px] font-semibold mb-0.5 ${isSelected ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}>
                {s.label}
              </h3>
              <p className="text-[11px] text-[#8C8C8C] mb-1.5">{s.shortDesc}</p>
              <p className="text-[12.5px] text-[#8C8C8C] leading-relaxed pr-4">{s.description}</p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
