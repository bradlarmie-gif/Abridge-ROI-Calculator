import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { NumberField } from "@/components/NumberField";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AttainBaseline } from "@/lib/attain/attainLevers";
import type { AttainSetting } from "@/lib/attain/attainTypes";

const PROVIDER_LABEL: Record<AttainSetting, string> = {
  outpatient: "Providers",
  ed: "ED providers",
  inpatient: "Hospitalists",
  nursing: "",
};

const PROVIDER_HELP: Record<AttainSetting, string> = {
  outpatient: "FTE providers this plan covers.",
  ed: "FTE ED physicians this plan covers.",
  inpatient: "FTE hospitalists this plan covers.",
  nursing: "",
};

const ENCOUNTER_LABEL: Record<AttainSetting, string> = {
  outpatient: "Annual encounters",
  ed: "Annual encounters",
  inpatient: "Annual discharges",
  nursing: "",
};

const ENCOUNTER_HELP: Record<AttainSetting, string> = {
  outpatient: "Total visits per year across them.",
  ed: "Total ED visits per year across them.",
  inpatient: "Total admissions per year across them.",
  nursing: "",
};

/** The nuance behind the utilization benchmark, one hover away from the
 * label instead of stretching the inline helper to two lines. */
const UTILIZATION_BENCHMARK_TIP = "Most deployments start near 50 to 60% and grow from there.";

/** Above this many discharges per hospitalist a year, the count is almost
 * certainly a whole-system figure rather than the hospitalists in scope. A
 * busy hospitalist carries a few hundred a year, so this ceiling only trips on
 * an implausible entry, never a realistic one. */
const INPATIENT_DISCHARGES_PER_HOSPITALIST_CEILING = 1500;

/**
 * A gentle plausibility hint for inpatient discharges: the driver math divides
 * discharges by hospitalists, so a whole-system discharge count against a small
 * hospitalist headcount silently inflates admissions per hospitalist and the
 * prize with it. Returns a soft note (never a hard block) only when the ratio is
 * implausibly high, so a fat-finger gets a nudge to double-check. Pure and
 * exported so it is unit-testable.
 */
export function inpatientDischargesWarning(setting: AttainSetting, baseline: AttainBaseline): string | null {
  if (setting !== "inpatient") return null;
  const providers = baseline.providers ?? 0;
  const discharges = baseline.annualEncounters ?? 0;
  if (providers <= 0 || discharges <= 0) return null;
  const perProvider = discharges / providers;
  if (perProvider <= INPATIENT_DISCHARGES_PER_HOSPITALIST_CEILING) return null;
  return `That is about ${Math.round(perProvider).toLocaleString()} discharges per hospitalist a year. Most hospitalists carry closer to 400 to 700, so double-check that this count covers only the hospitalists in scope and not the whole system.`;
}

interface StepScopeProps {
  setting: AttainSetting;
  baseline: AttainBaseline;
  onChangeBaseline: (patch: Partial<AttainBaseline>) => void;
}

/**
 * "Your starting point" - the partner's real operational baseline, the
 * stage every driver in this plan stands on. This replaced an earlier
 * version of this step that mixed in a soft "where things stand today"
 * snapshot (third-next-available, referral backlog, freed time per
 * provider) as static, non-editable illustrative facts. Those numbers
 * belonged to the goal's narrative, not to the plan's foundation, and
 * "referral backlog" in particular is a demand DECISION ("Fill the new
 * slots" on Build the case), not a starting fact - counting it here as a
 * fact would have double-counted it as a decision later. This step now
 * collects only the handful of real numbers every lever's math is built
 * from, per the shared `AttainBaseline` engine input.
 */
export default function StepScope({ setting, baseline, onChangeBaseline }: StepScopeProps) {
  const isNursing = setting === "nursing";

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step 3 · Where are you starting from?
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Your starting point
        </h1>
        <p className="text-[15px] text-[#666666] leading-relaxed max-w-[600px]" data-testid="text-step-teach">
          Every decision on the next page is measured as a move away from where you actually are today, not from an
          assumed number. Enter your real operation here, and every "adds ~$X" on the next page is built from these
          numbers, not from a benchmark that isn't yours.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#F5F0EB] rounded-xl p-8 sm:p-10 mb-6"
        data-testid="panel-attain-scope-baseline"
      >
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
          {isNursing ? "YOUR NURSING PROGRAM" : "YOUR OPERATION"}
        </p>
        <div className="h-px bg-[#D1D5DB] mb-6" />

        {isNursing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <NumberBaselineField
              label="Staffed beds"
              testid="staffed-beds"
              value={baseline.staffedBeds ?? 0}
              onChange={(v) => onChangeBaseline({ staffedBeds: v })}
              placeholder="e.g., 120"
              help="Licensed beds with active nursing staff, across the units in scope."
            />
            <NumberBaselineField
              label="Nursing FTEs"
              testid="nursing-ftes"
              value={baseline.nursingFtes ?? 0}
              onChange={(v) => onChangeBaseline({ nursingFtes: v })}
              placeholder="e.g., 180"
              help="Full-time equivalent nurses whose documentation this plan covers."
            />
            <NumberBaselineField
              label="Daily census"
              testid="daily-census"
              value={baseline.dailyCensus ?? 0}
              onChange={(v) => onChangeBaseline({ dailyCensus: v })}
              placeholder="e.g., 102"
              help="Average patients occupying those beds on a typical day. This becomes your occupancy rate."
            />
            <NumberBaselineField
              label="Adoption rate"
              testid="adoption-pct"
              value={baseline.adoptionPct ?? 0}
              onChange={(v) => onChangeBaseline({ adoptionPct: v })}
              placeholder="e.g., 50"
              suffix="%"
              max={100}
              help="Share of nurses actively documenting with Abridge today. Most deployments reach 40 to 60% within six months."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <NumberBaselineField
              label={PROVIDER_LABEL[setting]}
              testid="providers"
              value={baseline.providers ?? 0}
              onChange={(v) => onChangeBaseline({ providers: v })}
              placeholder="e.g., 40"
              help={PROVIDER_HELP[setting]}
            />
            <NumberBaselineField
              label={ENCOUNTER_LABEL[setting]}
              testid="annual-encounters"
              value={baseline.annualEncounters ?? 0}
              onChange={(v) => onChangeBaseline({ annualEncounters: v })}
              placeholder="e.g., 140,000"
              help={ENCOUNTER_HELP[setting]}
              warn={inpatientDischargesWarning(setting, baseline)}
            />
            <NumberBaselineField
              label="Utilization rate"
              testid="utilization-pct"
              value={baseline.utilizationPct ?? 0}
              onChange={(v) => onChangeBaseline({ utilizationPct: v })}
              placeholder="e.g., 70"
              suffix="%"
              max={100}
              help="Share of those encounters this plan can realistically reach."
              tip={UTILIZATION_BENCHMARK_TIP}
            />
          </div>
        )}
      </motion.div>

      <p className="text-[14px] text-[#8C8C8C] leading-relaxed max-w-[600px]" data-testid="text-attain-scope-footnote">
        These numbers are the stage every decision on the next page stands on. Demand and backlog come later, on
        the Align step, not here.
      </p>
    </div>
  );
}

interface NumberBaselineFieldProps {
  label: string;
  testid: string;
  value: number;
  onChange: (value: number) => void;
  placeholder: string;
  help: string;
  suffix?: string;
  max?: number;
  /** Extra benchmark nuance that doesn't need to live inline, one hover
   * away from the label instead. */
  tip?: string;
  /** A soft plausibility hint shown under the field when the entered number
   * looks implausible. Never blocks; just nudges a double-check. */
  warn?: string | null;
}

function NumberBaselineField({ label, testid, value, onChange, placeholder, help, suffix, max, tip, warn }: NumberBaselineFieldProps) {
  return (
    <div className="space-y-3">
      <label
        className="text-base font-medium text-black flex items-center gap-1.5"
        htmlFor={`attain-baseline-${testid}`}
      >
        {label}
        {tip && <InfoTip text={tip} testid={`tooltip-attain-baseline-${testid}`} />}
      </label>
      <div className="relative">
        <NumberField
          id={`attain-baseline-${testid}`}
          value={value}
          onValueChange={onChange}
          min={0}
          max={max}
          decimal={false}
          className={`h-12 w-full rounded-md border border-[#E5E5E5] bg-white px-3 text-base ${suffix ? "pr-9" : ""}`}
          placeholder={placeholder}
          data-testid={`input-attain-baseline-${testid}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      <p className="text-[14px] text-[#888888] leading-relaxed">{help}</p>
      {warn && (
        <p
          className="text-[13px] text-[#EA2C00] leading-relaxed"
          data-testid={`text-attain-baseline-${testid}-warn`}
        >
          {warn}
        </p>
      )}
    </div>
  );
}

/** A small, quiet info tooltip for a field label - hover/tap only, never
 * inline clutter. Same house pattern as the `InfoTip` in the D-step
 * decision chains, kept local here since this step doesn't share their
 * module. */
function InfoTip({ text, testid }: { text: string; testid: string }) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span
          className="text-[#B4B4B4] hover:text-[#8C8C8C] transition-colors cursor-help inline-flex"
          data-testid={testid}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-xs leading-relaxed">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}
