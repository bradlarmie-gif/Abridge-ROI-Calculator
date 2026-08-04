import { useState } from "react";
import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { NumberField } from "@/components/NumberField";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { categoryForGoal } from "@/lib/attain/attainGoals";
import type { AttainBaseline } from "@/lib/attain/attainLevers";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";

/**
 * The static "what a unit is worth" numbers, revealed on the Starting Point
 * only for the goals the partner actually picked (a margin for Access, a wRVU
 * value for Revenue, a replacement cost for Retention). Pulling these here
 * keeps every dollar OUT of the strategy questions downstream. They hold the
 * line, they don't move over time, which is why they live with the baseline
 * and not on the Plan (that's where the tracked metrics live).
 */
interface EconField { key: string; label: string; placeholder: string; prefix?: string; suffix?: string; decimal?: boolean; help: string }
// Maps each picked goal's category to the static dollar(s) it rides on. Follows
// the four-domains doctrine: the tracked/proof domains carry NO dollar here
// (Inpatient Capacity, and the Quality proof layer on OP/ED/IP), so they emit
// no field. Nursing carries its own economics (overtime, harm cost, RN replace).
function econFieldsForGoals(setting: AttainSetting, goals: GoalId[]): EconField[] {
  const cats = new Set(goals.map((g) => categoryForGoal(setting, g)).filter(Boolean) as string[]);
  const out: EconField[] = [];
  // Capacity dollar — outpatient/ED only (Inpatient Capacity is tracked, no dollar).
  if (cats.has("Patient Access")) {
    out.push({ key: "marginPerVisit", label: setting === "ed" ? "Margin per ED visit" : "Margin per visit", placeholder: "e.g., 220", prefix: "$", help: "The contribution margin a filled visit brings in." });
    // ED throughput has a downstream rail: a share of recovered LWBS patients
    // are admitted, so the inpatient admission margin counts too.
    if (setting === "ed") out.push({ key: "marginPerAdmission", label: "Margin per admission", placeholder: "e.g., 4,000", prefix: "$", help: "Contribution margin when a recovered ED patient is admitted to inpatient." });
  }
  // Nursing capacity dollar — overtime recovered as documentation lands in-shift.
  if (cats.has("Nursing Capacity"))
    out.push({ key: "overtimeRate", label: "Overtime rate", placeholder: "e.g., 65", prefix: "$", suffix: "/hr", help: "Loaded nursing overtime cost per hour." });
  // Revenue dollar — OP: coding lift (wRVU) + risk capture (HCC); ED: E/M wRVU; IP: DRG base.
  if (cats.has("Revenue Capture")) {
    if (setting === "inpatient") {
      out.push({ key: "drgBase", label: "DRG base rate", placeholder: "e.g., 12,000", prefix: "$", help: "Blended base payment per discharge." });
    } else {
      out.push({ key: "valuePerWrvu", label: "Value per wRVU", placeholder: "e.g., 33.40", prefix: "$", decimal: true, help: "Your blended dollar per wRVU." });
      if (setting === "outpatient") out.push({ key: "valuePerHcc", label: "Value per HCC", placeholder: "e.g., 1,200", prefix: "$", help: "Annual risk-adjusted revenue per HCC recaptured." });
    }
  }
  // Retention dollar — replacement cost, setting-aware noun.
  if (cats.has("Provider Retention"))
    out.push({ key: "replacementCost", label: setting === "nursing" ? "Cost to replace a nurse" : setting === "inpatient" ? "Cost to replace a hospitalist" : "Cost to replace a provider", placeholder: setting === "nursing" ? "e.g., 60,000" : "e.g., 250,000", prefix: "$", help: "Fully loaded recruit and ramp cost of one departure." });
  // Nursing quality dollar — harm avoidance (HAPIs, falls, CAUTI, sepsis).
  if (cats.has("Quality & Safety"))
    out.push({ key: "costPerEvent", label: "Cost per preventable event", placeholder: "e.g., 12,000", prefix: "$", help: "Blended cost of one preventable harm event." });
  return out;
}

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
  goals?: GoalId[];
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
export default function StepScope({ setting, goals = [], baseline, onChangeBaseline }: StepScopeProps) {
  const isNursing = setting === "nursing";
  // The static per-unit values behind the goals they picked, revealed for every
  // setting. Local prototype state for now (not yet wired to the engine);
  // defaults live in the "e.g." placeholder until they type over one.
  const econFields = econFieldsForGoals(setting, goals);
  const [econ, setEcon] = useState<Record<string, number>>({});

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10 max-w-[620px]">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-step-eyebrow">
          Step 3 · Where are you starting from?
        </p>
        <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-step-title">
          Your starting point
        </h1>
        <p className="text-[15px] text-[#666666] leading-relaxed" data-testid="text-step-teach">
          Start with your real operation. Everything we calculate next is built from these numbers, not a
          benchmark.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-[minmax(0,1fr)_360px] gap-x-16 gap-y-10 items-start">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        data-testid="panel-attain-scope-baseline"
      >
        <p className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-[1.8px] mb-6">
          {isNursing ? "Your nursing program" : "Your operation"}
        </p>

        {isNursing ? (
          <>
            {/* Row 1 — the raw scale of the nursing program. */}
            <div className="grid grid-cols-2 gap-x-10 gap-y-9 max-w-[460px]">
              <NumberBaselineField
                label="Staffed beds"
                testid="staffed-beds"
                value={baseline.staffedBeds ?? 0}
                onChange={(v) => onChangeBaseline({ staffedBeds: v })}
                placeholder="e.g., 120"
                max={10_000}
                help="Beds with active nursing staff, units in scope."
              />
              <NumberBaselineField
                label="Nursing FTEs"
                testid="nursing-ftes"
                value={baseline.nursingFtes ?? 0}
                onChange={(v) => onChangeBaseline({ nursingFtes: v })}
                placeholder="e.g., 180"
                max={100_000}
                help="Nurses whose documentation this plan covers."
              />
              <NumberBaselineField
                label="Daily census"
                testid="daily-census"
                value={baseline.dailyCensus ?? 0}
                onChange={(v) => onChangeBaseline({ dailyCensus: v })}
                placeholder="e.g., 102"
                max={10_000}
                help="Patients in those beds on a typical day."
              />
            </div>

            {/* Row 2 — usage today: nurses recording, the number that gets a target on the Plan. */}
            <p className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-[1.8px] mt-10 mb-6">Usage today</p>
            <div className="grid grid-cols-2 gap-x-10 gap-y-9 max-w-[460px]">
              <NumberBaselineField
                label="Monthly recording users"
                testid="mru-recording"
                value={baseline.mruRecording ?? 0}
                onChange={(v) => onChangeBaseline({ mruRecording: v })}
                placeholder="e.g., 140"
                max={100_000}
                help="Of your nurses, how many record with Abridge each month."
              />
            </div>
          </>
        ) : (
          <>
            {/* Row 1 — the raw scale: how many providers, how many visits.
                A 2-column grid so both fields (and their underlines) align. */}
            <div className="grid grid-cols-2 gap-x-10 gap-y-9 max-w-[460px]">
              <NumberBaselineField
                label={PROVIDER_LABEL[setting]}
                testid="providers"
                value={baseline.providers ?? 0}
                onChange={(v) => onChangeBaseline({ providers: v })}
                placeholder="e.g., 40"
                max={50_000}
                help={PROVIDER_HELP[setting]}
              />
              <NumberBaselineField
                label={ENCOUNTER_LABEL[setting]}
                testid="annual-encounters"
                value={baseline.annualEncounters ?? 0}
                onChange={(v) => onChangeBaseline({ annualEncounters: v })}
                placeholder="e.g., 140,000"
                max={50_000_000}
                help={ENCOUNTER_HELP[setting]}
                warn={inpatientDischargesWarning(setting, baseline)}
              />
            </div>

            {/* Row 2 — usage today: the two numbers that get a target on the Plan.
                Utilization is encounter-level reach; MRU is provider-level uptake.
                Same 2-column grid so it lines up under row 1. */}
            <p className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-[1.8px] mt-10 mb-6">Usage today</p>
            <div className="grid grid-cols-2 gap-x-10 gap-y-9 max-w-[460px]">
              <NumberBaselineField
                label="Utilization"
                testid="utilization-pct"
                value={baseline.utilizationPct ?? 0}
                onChange={(v) => onChangeBaseline({ utilizationPct: v })}
                placeholder="e.g., 70"
                suffix="%"
                max={100}
                help="Share of your encounters Abridge is on today."
                tip={UTILIZATION_BENCHMARK_TIP}
              />
              <NumberBaselineField
                label="Monthly recording users"
                testid="mru-recording"
                value={baseline.mruRecording ?? 0}
                onChange={(v) => onChangeBaseline({ mruRecording: v })}
                placeholder="e.g., 80"
                max={50_000}
                help={`Of your ${setting === "ed" ? "ED providers" : (PROVIDER_LABEL[setting] || "providers").toLowerCase()}, how many record with Abridge each month.`}
              />
            </div>
          </>
        )}
      </motion.div>

      {/* The goal-driven "what a unit is worth" card, every setting. The static
          per-unit numbers reveal here for the goals they picked, in the same
          editorial "e.g." field style, so no dollar ever lands in the strategy
          questions downstream. */}
      <motion.aside
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-[#E8E2DA] bg-[#FAF7F2] p-6 md:p-7 w-full"
        data-testid="panel-attain-scope-econ"
      >
        <p className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-[1.8px] mb-5">What a unit is worth</p>
        {econFields.length > 0 ? (
          <>
            <div className="flex flex-col gap-7">
              {econFields.map((f, i) => (
                <motion.div key={f.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * i }}>
                  <NumberBaselineField
                    label={f.label}
                    testid={`econ-${f.key}`}
                    value={econ[f.key] ?? 0}
                    onChange={(v) => setEcon((p) => ({ ...p, [f.key]: v }))}
                    placeholder={f.placeholder}
                    prefix={f.prefix}
                    suffix={f.suffix}
                    decimal={f.decimal}
                    help={f.help}
                    width="w-full"
                  />
                </motion.div>
              ))}
            </div>
            <p className="text-[12.5px] text-[#8C8C8C] leading-relaxed mt-6 pt-5 border-t border-[#E8E2DA]">
              These hold the line, they don't move. Defaults sit here; change any if you know yours. The plan is measured against them.
            </p>
          </>
        ) : (
          <div>
            <p className="font-abridge text-[52px] leading-none text-[#D8CFC0] mb-3">&mdash;</p>
            <p className="text-[13.5px] text-[#8C8C8C] leading-relaxed">Pick your goals and the numbers behind them appear here.</p>
          </div>
        )}
      </motion.aside>
      </div>
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
  prefix?: string;
  decimal?: boolean;
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

function NumberBaselineField({ label, testid, value, onChange, placeholder, help, suffix, prefix, decimal = false, max, tip, warn, width = "w-full" }: NumberBaselineFieldProps) {
  return (
    <div className={width}>
      <label
        className="text-[10px] font-semibold uppercase tracking-[1.6px] text-[#8C8C8C] flex items-center gap-1 mb-2"
        htmlFor={`attain-baseline-${testid}`}
      >
        {label}
        {tip && <InfoTip text={tip} testid={`tooltip-attain-baseline-${testid}`} />}
      </label>
      {/* The underline lives on the wrapper (full width), not the input, so every
          field's line is the same length regardless of value or a %/$ marker. */}
      <div className="flex items-baseline gap-1.5 border-b-2 border-[#E0D9CE] pb-1 transition-colors focus-within:border-[#EA2C00]">
        {prefix && <span className="font-abridge text-2xl text-[#B4B4B4]">{prefix}</span>}
        <NumberField
          id={`attain-baseline-${testid}`}
          value={value}
          onValueChange={onChange}
          min={0}
          max={max}
          decimal={decimal}
          className="flex-1 min-w-0 bg-transparent border-0 rounded-none px-0 font-abridge text-3xl text-[#1A1A1A] outline-none placeholder:font-sans placeholder:text-[15px] placeholder:text-[#C4BCB0]"
          placeholder={placeholder}
          data-testid={`input-attain-baseline-${testid}`}
        />
        {suffix && <span className="font-abridge text-2xl text-[#B4B4B4]">{suffix}</span>}
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
