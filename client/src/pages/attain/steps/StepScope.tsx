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

  // The live "stage" derived from what they have typed so far, read straight
  // back to them so the step feels like it is building their foundation, not
  // collecting a form. Non-nursing: the reachable encounters (encounters x
  // utilization) every next-page dollar stands on. Nursing: today's occupancy
  // and adoption. Everything degrades cleanly to a prompt while still blank.
  const providers = baseline.providers ?? 0;
  const encounters = baseline.annualEncounters ?? 0;
  const util = baseline.utilizationPct ?? 0;
  const reachable = encounters > 0 && util > 0 ? Math.round((encounters * util) / 100) : 0;

  const beds = baseline.staffedBeds ?? 0;
  const census = baseline.dailyCensus ?? 0;
  const ftes = baseline.nursingFtes ?? 0;
  const adoption = baseline.adoptionPct ?? 0;
  const occupancy = beds > 0 && census > 0 ? Math.round((census / beds) * 100) : 0;

  const providerWord = (PROVIDER_LABEL[setting] || "providers").toLowerCase();
  const stage = isNursing
    ? {
        ready: occupancy > 0,
        value: `${occupancy}%`,
        label: "occupancy today",
        sub: `${ftes.toLocaleString()} nurse${ftes === 1 ? "" : "s"} in scope${adoption > 0 ? `, ${adoption}% on Abridge today` : ""}`,
        prompt: "Enter your program above to see today's occupancy.",
      }
    : {
        ready: reachable > 0,
        value: reachable.toLocaleString(),
        label: "encounters within reach",
        sub: `across ${providers.toLocaleString()} ${providerWord}`,
        prompt: "Enter your numbers above to see what's within reach.",
      };

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step 3 · Where are you starting from?
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Your starting point
        </h1>
        <p className="text-[15px] text-[#666666] leading-relaxed max-w-[560px]" data-testid="text-step-teach">
          Start with your real operation. Everything the next page calculates is built from these numbers, not a
          benchmark.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
        data-testid="panel-attain-scope-baseline"
      >
        <p className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-[1.8px] mb-6">
          {isNursing ? "Your nursing program" : "Your operation"}
        </p>

        {isNursing ? (
          <div className="flex flex-wrap gap-x-12 gap-y-8">
            <NumberBaselineField
              label="Staffed beds"
              testid="staffed-beds"
              value={baseline.staffedBeds ?? 0}
              onChange={(v) => onChangeBaseline({ staffedBeds: v })}
              placeholder="e.g., 120"
              help="Beds with active nursing staff, units in scope."
              width="w-32"
            />
            <NumberBaselineField
              label="Nursing FTEs"
              testid="nursing-ftes"
              value={baseline.nursingFtes ?? 0}
              onChange={(v) => onChangeBaseline({ nursingFtes: v })}
              placeholder="e.g., 180"
              help="Nurses whose documentation this plan covers."
              width="w-32"
            />
            <NumberBaselineField
              label="Daily census"
              testid="daily-census"
              value={baseline.dailyCensus ?? 0}
              onChange={(v) => onChangeBaseline({ dailyCensus: v })}
              placeholder="e.g., 102"
              help="Patients in those beds on a typical day."
              width="w-32"
            />
            <NumberBaselineField
              label="Adoption rate"
              testid="adoption-pct"
              value={baseline.adoptionPct ?? 0}
              onChange={(v) => onChangeBaseline({ adoptionPct: v })}
              placeholder="e.g., 50"
              suffix="%"
              max={100}
              help="Nurses documenting with Abridge today."
              width="w-24"
            />
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-14 gap-y-8">
            <NumberBaselineField
              label={PROVIDER_LABEL[setting]}
              testid="providers"
              value={baseline.providers ?? 0}
              onChange={(v) => onChangeBaseline({ providers: v })}
              placeholder="e.g., 40"
              help={PROVIDER_HELP[setting]}
              width="w-28"
            />
            <NumberBaselineField
              label={ENCOUNTER_LABEL[setting]}
              testid="annual-encounters"
              value={baseline.annualEncounters ?? 0}
              onChange={(v) => onChangeBaseline({ annualEncounters: v })}
              placeholder="e.g., 140,000"
              help={ENCOUNTER_HELP[setting]}
              warn={inpatientDischargesWarning(setting, baseline)}
              width="w-48"
            />
            <NumberBaselineField
              label="Utilization"
              testid="utilization-pct"
              value={baseline.utilizationPct ?? 0}
              onChange={(v) => onChangeBaseline({ utilizationPct: v })}
              placeholder="e.g., 70"
              suffix="%"
              max={100}
              help="Share you can realistically reach."
              tip={UTILIZATION_BENCHMARK_TIP}
              width="w-28"
            />
          </div>
        )}

        {/* The live stage, read back from their own numbers. The coral figure
            echoes the Attainment output, so the foundation and the payoff speak
            the same visual language. */}
        <div className="mt-10" data-testid="panel-attain-scope-stage" aria-live="polite">
          {stage.ready ? (
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <motion.span
                key={stage.value}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-abridge text-3xl md:text-4xl text-[#EA2C00] leading-none"
                data-testid="text-attain-scope-stage-value"
              >
                {stage.value}
              </motion.span>
              <span className="text-[14px] text-[#6B6B6B] leading-relaxed">
                <span className="font-semibold text-[#3A3A3A]">{stage.label}</span>, {stage.sub}
              </span>
            </div>
          ) : (
            <p className="text-[13.5px] text-[#8C8C8C] leading-relaxed max-w-[560px]" data-testid="text-attain-scope-stage-prompt">
              {stage.prompt}
            </p>
          )}
        </div>
      </motion.div>
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
  /** Field wrapper width (a Tailwind class like "w-28"), so the editorial
   * underline fields sit at natural, non-bulky widths in a wrapping row. */
  width?: string;
}

function NumberBaselineField({ label, testid, value, onChange, placeholder, help, suffix, max, tip, warn, width = "w-32" }: NumberBaselineFieldProps) {
  return (
    <div className={width}>
      <label
        className="text-[10px] font-semibold uppercase tracking-[1.6px] text-[#8C8C8C] flex items-center gap-1 mb-2"
        htmlFor={`attain-baseline-${testid}`}
      >
        {label}
        {tip && <InfoTip text={tip} testid={`tooltip-attain-baseline-${testid}`} />}
      </label>
      <div className="flex items-baseline">
        <NumberField
          id={`attain-baseline-${testid}`}
          value={value}
          onValueChange={onChange}
          min={0}
          max={max}
          decimal={false}
          className={`${suffix ? "w-16" : "w-full"} bg-transparent border-0 border-b-2 border-[#E0D9CE] rounded-none px-0 pb-1 font-abridge text-3xl text-[#1A1A1A] outline-none transition-colors focus:border-[#EA2C00] placeholder:font-sans placeholder:text-[15px] placeholder:text-[#C4BCB0]`}
          placeholder={placeholder}
          data-testid={`input-attain-baseline-${testid}`}
        />
        {suffix && <span className="font-abridge text-2xl text-[#B4B4B4] ml-1.5">{suffix}</span>}
      </div>
      <p className="text-[12px] text-[#8C8C8C] leading-relaxed mt-2">{help}</p>
      {warn && (
        <p
          className="text-[12px] text-[#EA2C00] leading-relaxed mt-1.5 max-w-[220px]"
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
