import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { LEVERS, lineOptions, type Lever, type LeverValues } from "@/lib/attain/attainLevers";
import type { LeverContributionsResult } from "@/lib/attain/attainLevers";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";

function formatCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

const TOGGLE_LABELS = ["None", "Partial", "Full"];

function isMoved(value: number | string[] | undefined, realityStart: number | string[]): boolean {
  if (Array.isArray(realityStart)) return Array.isArray(value) && value.length > 0;
  return typeof value === "number" && value !== realityStart;
}

function formatLeverValue(lever: Lever, value: number | string[] | undefined): string {
  if (lever.control === "lines") {
    const lines = Array.isArray(value) ? value : [];
    return lines.length === 0 ? "none yet" : `${lines.length} of ${lever.max}`;
  }
  if (lever.control === "toggleLevel") {
    const level = typeof value === "number" ? Math.min(2, Math.max(0, Math.round(value))) : 0;
    return TOGGLE_LABELS[level];
  }
  const n = typeof value === "number" ? value : 0;
  const decimals = lever.step < 1 ? 1 : 0;
  return `${n.toFixed(decimals)} ${lever.unit}`;
}

interface StepBuildCaseProps {
  setting: AttainSetting;
  goal: GoalId;
  values: LeverValues;
  contributions: LeverContributionsResult | null;
  onChange: (leverId: string, value: number | string[]) => void;
  onNext: () => void;
}

export default function StepBuildCase({ setting, goal, values, contributions, onChange, onNext }: StepBuildCaseProps) {
  const levers = LEVERS[goal];
  const contributionFor = (id: string) => contributions?.perLever.find((p) => p.id === id);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step 4 · What are you actually going to do?
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Build the case
        </h1>
        <p className="text-sm text-[#666666] leading-relaxed max-w-[620px]" data-testid="text-step-teach">
          Every decision below starts at your reality, where it stands today. Doing nothing new adds nothing. Move a
          decision and watch its own contribution appear, and the plan below grow by exactly that much. Nothing here
          is a preset tier; it's the sum of the decisions you actually make.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1A1A1A] rounded-2xl p-6 mb-8 sticky top-24 z-10"
        data-testid="panel-attain-buildcase-total"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[2.5px] text-white/50 mb-2">
          Your plan, built from your decisions
        </p>
        <p className="font-abridge text-4xl text-[#EA2C00]" data-testid="text-attain-buildcase-total">
          {formatCompact(contributions?.totalMargin ?? 0)}
        </p>
        <p className="text-xs text-white/50 mt-1">
          {(contributions?.totalCount ?? 0).toLocaleString()} units of value, contribution margin, from the decisions
          moved below.
        </p>
      </motion.div>

      <div className="space-y-4 mb-8">
        {levers.map((lever, i) => {
          const contribution = contributionFor(lever.id);
          const moved = isMoved(values[lever.id], lever.realityStart);
          return (
            <motion.div
              key={lever.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
              className={`rounded-xl border p-5 ${moved ? "border-[#EA2C00] bg-[#FFF6F3]" : "border-[#E5E5E5] bg-white"}`}
              data-testid={`card-attain-lever-${lever.id}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#1A1A1A]" data-testid={`text-attain-lever-label-${lever.id}`}>
                    {lever.label}
                  </h3>
                  <p className="text-xs text-[#8C8C8C] mt-1 leading-relaxed max-w-[440px]">{lever.help}</p>
                </div>
                <div className="text-right flex-shrink-0" data-testid={`text-attain-lever-contribution-${lever.id}`}>
                  <p className={`font-abridge text-xl ${moved ? "text-[#EA2C00]" : "text-[#B4B4B4]"}`}>
                    {moved ? `adds ~${formatCompact(contribution?.marginalMargin ?? 0)}` : "adds ~$0"}
                  </p>
                  <p className="text-[10px] text-[#8C8C8C]">
                    {(contribution?.marginalCount ?? 0).toLocaleString()} units ·{" "}
                    {Math.round((contribution?.pctOfTotal ?? 0) * 100)}% of your plan
                  </p>
                </div>
              </div>

              <LeverControl setting={setting} goal={goal} lever={lever} value={values[lever.id]} onChange={(v) => onChange(lever.id, v)} />
            </motion.div>
          );
        })}
      </div>

      <Button
        onClick={onNext}
        className="h-12 px-6 font-semibold rounded-full bg-black hover:bg-black/90 text-white"
        data-testid="button-attain-buildcase-continue"
      >
        Continue to commit
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

interface LeverControlProps {
  setting: AttainSetting;
  goal: GoalId;
  lever: Lever;
  value: number | string[] | undefined;
  onChange: (value: number | string[]) => void;
}

function LeverControl({ setting, goal, lever, value, onChange }: LeverControlProps) {
  if (lever.control === "lines") {
    const options = lineOptions(goal, setting);
    const selected = Array.isArray(value) ? value : [];
    if (options.length === 0) {
      return <p className="text-xs text-[#B4B4B4] italic">No line options configured for this combination yet.</p>;
    }
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((line) => {
          const active = selected.includes(line);
          return (
            <button
              key={line}
              type="button"
              onClick={() => onChange(active ? selected.filter((l) => l !== line) : [...selected, line])}
              className={`px-3 py-2 rounded-md text-sm border transition-all ${
                active ? "border-[#EA2C00] bg-[#FFF6F3] text-[#EA2C00] font-medium" : "border-[#E5E5E5] bg-white text-[#3A3A3A] hover:border-[#D8CFC4]"
              }`}
              data-testid={`chip-attain-lever-${lever.id}-${line.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {line}
            </button>
          );
        })}
      </div>
    );
  }

  if (lever.control === "toggleLevel") {
    const level = typeof value === "number" ? Math.min(2, Math.max(0, Math.round(value))) : 0;
    return (
      <div className="flex rounded-md border border-[#E5E5E5] overflow-hidden w-fit">
        {TOGGLE_LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => onChange(i)}
            className={`px-4 h-10 text-xs font-medium transition-colors ${
              level === i ? "bg-[#1A1A1A] text-white" : "bg-white text-[#8C8C8C] hover:bg-[#F5F0EB]"
            }`}
            data-testid={`button-attain-lever-${lever.id}-${label.toLowerCase()}`}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  // percent | countPerUnit — a single-value slider with a live readout.
  const n = typeof value === "number" ? value : lever.realityStart as number;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#8C8C8C]">
          Reality today: {formatLeverValue(lever, lever.realityStart)}
        </span>
        <span className="text-sm font-semibold text-[#1A1A1A]" data-testid={`text-attain-lever-value-${lever.id}`}>
          {formatLeverValue(lever, n)}
        </span>
      </div>
      <Slider
        value={[n]}
        onValueChange={(v) => onChange(v[0])}
        min={lever.min}
        max={lever.max}
        step={lever.step}
        accent="coral"
        className="w-full"
        data-testid={`slider-attain-lever-${lever.id}`}
      />
    </div>
  );
}
