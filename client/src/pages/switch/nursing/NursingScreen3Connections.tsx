import { useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { staggerContainer, staggerItem } from "@/components/PageTransition";
import type { NursingPriority, NursingBaselineInputs, ConnectionBar } from "./nursingTypes";
import { PRIORITY_CONFIGS } from "./nursingTypes";
import { buildConnection, deriveShiftsPerYear } from "./nursingCalculations";

interface Screen3Props {
  baseline: NursingBaselineInputs;
  selectedPriorities: NursingPriority[];
  onNext: () => void;
  onBack: () => void;
}

function StrengthBar({ bar }: { bar: ConnectionBar }) {
  const colorMap = {
    direct: '#EA2C00',
    moderate: '#F59E0B',
    indirect: '#94A3B8',
    strategic: '#6366F1',
  };
  const color = colorMap[bar.strength];
  const strengthLabel = {
    direct: 'Direct',
    moderate: 'Moderate',
    indirect: 'Indirect (via retention)',
    strategic: 'Weak',
  }[bar.strength];

  return (
    <div className="mt-3">
      {bar.label && (
        <p className="text-xs text-[#888888] mb-1">{bar.label}</p>
      )}
      <div className="flex items-center gap-3">
        <div className="flex gap-0.5 flex-1">
          {Array.from({ length: bar.total }).map((_, i) => (
            <div
              key={i}
              className="h-2 flex-1 rounded-sm"
              style={{ backgroundColor: i < bar.filled ? color : '#E5E7EB' }}
            />
          ))}
        </div>
        <span className="text-xs text-[#888888] min-w-[60px]">{strengthLabel}</span>
      </div>
    </div>
  );
}

export default function NursingScreen3Connections({
  baseline,
  selectedPriorities,
  onNext,
  onBack,
}: Screen3Props) {
  const connections = useMemo(
    () => selectedPriorities.map(p => buildConnection(p, baseline)),
    [selectedPriorities, baseline],
  );

  const unselected = PRIORITY_CONFIGS.filter(c => !selectedPriorities.includes(c.id));
  const shiftsPerYear = deriveShiftsPerYear(baseline);

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex flex-col lg:flex-row gap-10"
      >
        <motion.div className="flex-1 max-w-[740px]" variants={staggerItem}>
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">
            Where Ambient Fits
          </p>
          <h1
            className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight"
            data-testid="text-connections-headline"
          >
            Where Ambient Nursing Documentation Fits
          </h1>
          <p className="text-base text-[#888888] mb-8 max-w-xl leading-relaxed">
            Based on your priorities, here's how reducing flowsheet documentation time connects to what you're trying to solve — and where it doesn't.
          </p>

          <div className="space-y-6">
            {connections.map((conn) => (
              <motion.div
                key={conn.priority}
                variants={staggerItem}
                className="bg-[#F5F0EB] rounded-xl overflow-hidden"
              >
                <div className="p-6 md:p-8">
                  <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide mb-4" data-testid={`text-connection-${conn.priority}`}>
                    {conn.headline}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#888888] mb-1.5">
                        How it connects
                      </p>
                      <p className="text-sm text-[#333333] leading-relaxed">{conn.howItConnects}</p>
                    </div>

                    {conn.whatResearchSays && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#888888] mb-1.5">
                          What the research says
                        </p>
                        <p className="text-sm text-[#333333] leading-relaxed">{conn.whatResearchSays}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#888888] mb-1.5">
                        What this means for ROI
                      </p>
                      {conn.whatItMeansForROI.split('\n\n').map((para, i) => (
                        <p key={i} className="text-sm text-[#333333] leading-relaxed mb-2 last:mb-0">
                          {para}
                        </p>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-[#E5E7EB]">
                      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#888888] mb-1">
                        Connection Strength
                      </p>
                      {conn.bars.map((bar, i) => (
                        <StrengthBar key={i} bar={bar} />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {unselected.length > 0 && (
            <motion.div variants={staggerItem} className="mt-8">
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer text-sm text-[#999999] hover:text-[#666666] transition-colors">
                  <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                  Other pathways — not selected as a current priority
                </summary>
                <div className="mt-4 space-y-3">
                  {unselected.map(config => (
                    <div key={config.id} className="bg-[#F9F9F9] border border-[#E5E7EB] rounded-lg p-4 opacity-60">
                      <p className="text-sm font-medium text-[#888888] uppercase tracking-wide">
                        {config.title}
                      </p>
                      <p className="text-xs text-[#AAAAAA] mt-1">{config.description}</p>
                    </div>
                  ))}
                </div>
              </details>
            </motion.div>
          )}

          <div className="mt-8">
            <StepFooter
              onBack={onBack}
              onNext={onNext}
              nextLabel="See Your Investment Case →"
              nextTestId="button-nursing-next-3"
              backTestId="button-nursing-back-3"
            />
          </div>
        </motion.div>

        <motion.aside
          className="w-full lg:w-[300px] lg:sticky lg:top-24 self-start"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="bg-[#1A1A1A] text-white rounded-xl p-6">
            <p className="text-[9px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-4">
              Your Priorities
            </p>
            <div className="h-px bg-white/10 mb-4" />

            <div className="space-y-2 mb-4">
              {PRIORITY_CONFIGS.map(config => {
                const isSelected = selectedPriorities.includes(config.id);
                return (
                  <div key={config.id} className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#EA2C00]' : 'border border-white/20'}`}>
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <p className={`text-sm ${isSelected ? 'text-white/80' : 'text-white/30'}`}>
                      {config.title}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="h-px bg-white/10 my-4" />
            <p className="text-[9px] font-semibold uppercase tracking-[2px] text-white/40 mb-3">
              Your Baseline
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Staffed beds</span>
                <span className="text-white font-medium">{baseline.staffedBeds.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Nurse FTEs</span>
                <span className="text-white font-medium">{baseline.nurseFTEs.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Occupancy</span>
                <span className="text-white font-medium">{baseline.bedOccupancy}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Shifts / year</span>
                <span className="text-white font-medium">{shiftsPerYear.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </motion.aside>
      </motion.div>
    </div>
  );
}
