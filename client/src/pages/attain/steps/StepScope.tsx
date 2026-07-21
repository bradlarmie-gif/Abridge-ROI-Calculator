import { motion } from "framer-motion";
import { NumberField } from "@/components/NumberField";
import type { AttainBaseline } from "@/lib/attain/attainLevers";
import type { AttainSetting } from "@/lib/attain/attainTypes";

const PROVIDER_LABEL: Record<AttainSetting, string> = {
  outpatient: "Providers",
  ed: "ED providers",
  inpatient: "Hospitalists",
  nursing: "",
};

const PROVIDER_HELP: Record<AttainSetting, string> = {
  outpatient: "Full-time equivalent providers whose documentation this plan covers.",
  ed: "Full-time equivalent ED physicians whose documentation this plan covers.",
  inpatient: "Full-time equivalent hospitalists whose documentation this plan covers.",
  nursing: "",
};

const ENCOUNTER_LABEL: Record<AttainSetting, string> = {
  outpatient: "Annual encounters",
  ed: "Annual encounters",
  inpatient: "Annual discharges",
  nursing: "",
};

const ENCOUNTER_HELP: Record<AttainSetting, string> = {
  outpatient: "Total visits per year across those providers.",
  ed: "Total ED visits per year across those physicians.",
  inpatient: "Total admissions per year across those hospitalists.",
  nursing: "",
};

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
        <p className="text-sm text-[#666666] leading-relaxed max-w-[600px]" data-testid="text-step-teach">
          Every decision on the next page is measured as a move away from where you actually are today, not from an
          assumed number. Enter your real operation here, and every "adds ~$X" on the next page is built from these
          numbers, not from a benchmark that isn't yours.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#F5F0EB] rounded-xl p-6 sm:p-8 mb-6"
        data-testid="panel-attain-scope-baseline"
      >
        <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
          {isNursing ? "YOUR NURSING PROGRAM" : "YOUR OPERATION"}
        </p>
        <div className="h-px bg-[#D1D5DB] mb-6" />

        {isNursing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
            />
            <NumberBaselineField
              label="Utilization rate"
              testid="utilization-pct"
              value={baseline.utilizationPct ?? 0}
              onChange={(v) => onChangeBaseline({ utilizationPct: v })}
              placeholder="e.g., 70"
              suffix="%"
              max={100}
              help="Share of those encounters this plan can realistically reach. Most deployments start near 50 to 60% and grow from there."
            />
          </div>
        )}
      </motion.div>

      <p className="text-xs text-[#8C8C8C] max-w-[600px]" data-testid="text-attain-scope-footnote">
        These numbers are the stage every decision on the next page stands on. Nothing about your demand, backlog,
        or referral queue belongs here, those are decisions you make on Build the case, not facts about today.
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
}

function NumberBaselineField({ label, testid, value, onChange, placeholder, help, suffix, max }: NumberBaselineFieldProps) {
  return (
    <div className="space-y-2.5">
      <label className="text-sm font-medium text-black" htmlFor={`attain-baseline-${testid}`}>
        {label}
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
      <p className="text-xs text-[#888888] leading-relaxed">{help}</p>
    </div>
  );
}
