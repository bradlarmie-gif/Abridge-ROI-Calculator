import { useMemo } from "react";
import { buildOutcomePlan, type OutcomePlan, type PlanOwner, type PlanStep } from "@/lib/attain/planBuild";
import { SETTING_GOAL_MATRIX } from "@/lib/attain/attainGoals";
import type { AttainSetting } from "@/lib/attain/attainTypes";

/**
 * The synthesized plan — "the plan, on a page." Reads each chosen outcome as its
 * owner-grouped deconstruction: who owns each step, and the metric they track
 * toward the outcome (leading Abridge-proven signal -> operational middle -> the
 * booked outcome), each with its source. Editorial, at the discovery bar.
 *
 * v1 renders the read-only synthesized plan (the close of the build-walk). The
 * per-step baseline/target/owner entry walk layers on top of the same join.
 */

const C = {
  ink: "#1A1A1A",
  body: "#4A4238",
  muted: "#6E675C",
  faint: "#8C8073",
  hair: "#E8E2DA",
  hair2: "#EDE8E1",
  surface: "#FCFBF9",
  wash: "#FBE7E1",
  coral: "#EA2C00",
} as const;

const LAYER_LABEL: Record<PlanStep["layer"], string> = {
  leading: "Abridge proves",
  operational: "The team runs",
  outcome: "The outcome",
};

function SourceChip({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#E0D9CE] px-[8px] py-[2px] text-[10px] font-bold uppercase tracking-[0.08em] text-[#8C8073] whitespace-nowrap">
      {source}
    </span>
  );
}

function StepRow({ step }: { step: PlanStep }) {
  const isOutcome = step.layer === "outcome";
  return (
    <div className="flex items-start justify-between gap-4 py-[13px] border-b border-[#EDE8E1] last:border-b-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-[9px] font-bold uppercase tracking-[0.1em] ${isOutcome ? "text-[#EA2C00]" : step.layer === "leading" ? "text-[#8C8073]" : "text-[#A79E92]"}`}
          >
            {LAYER_LABEL[step.layer]}
          </span>
          {step.fragile && (
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#B78A5A]">Make-or-break</span>
          )}
        </div>
        <div className={`text-[14.5px] leading-[1.35] ${isOutcome ? "font-bold text-[#1A1A1A]" : "text-[#2E2822]"}`}>
          {step.name}
        </div>
        <div className="mt-[3px] text-[12.5px] text-[#6E675C] leading-[1.4]">
          Watch: {step.signal}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <SourceChip source={step.source} />
        <div className="text-[12px] text-[#A79E92] tabular-nums">
          {step.baseline ? step.baseline : "—"}
          <span className="mx-1 text-[#C9BDAD]">&rarr;</span>
          {step.target ? <span className="text-[#EA2C00] font-semibold">{step.target}</span> : "target"}
        </div>
      </div>
    </div>
  );
}

function OwnerCard({ owner }: { owner: PlanOwner }) {
  return (
    <div className="rounded-[14px] border border-[#E8E2DA] bg-[#FCFBF9] px-5 py-[18px] mb-3">
      <div className="flex items-baseline justify-between gap-3 mb-2.5 pb-2.5 border-b border-[#E8E2DA]">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C8073] mb-1">
            {owner.isAbridge ? "Abridge + your champion" : "Owner"}
          </div>
          <div className="font-abridge text-[18px] text-[#1A1A1A] leading-tight">
            {owner.person || owner.role}
          </div>
          {owner.person && <div className="text-[12px] text-[#8C8073] mt-0.5">{owner.role}</div>}
        </div>
        <span className="text-[11px] text-[#A79E92] whitespace-nowrap">
          {owner.steps.length} {owner.steps.length === 1 ? "metric" : "metrics"}
        </span>
      </div>
      {owner.steps.map((s) => (
        <StepRow key={s.n} step={s} />
      ))}
    </div>
  );
}

function OutcomeBlock({ plan }: { plan: OutcomePlan }) {
  return (
    <section className="mb-12">
      <div className="border-l-2 border-[#EA2C00] pl-5 mb-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA2C00] mb-1.5">
          The outcome &middot; {plan.category}
        </div>
        <h2 className="font-abridge text-[26px] leading-[1.1] text-[#1A1A1A]">{plan.chainTitle}</h2>
        <p className="text-[14px] text-[#6E675C] leading-relaxed mt-2 max-w-[560px]">
          Deconstructed into the people who own each step and the metric each one watches to know it is
          moving &mdash; the Abridge-proven signals lead, the outcome follows.
        </p>
      </div>
      {plan.owners.map((o) => (
        <OwnerCard key={o.role} owner={o} />
      ))}
    </section>
  );
}

export default function PlanBuildExperience({
  setting = "outpatient",
  partner = "your team",
}: {
  setting?: AttainSetting;
  partner?: string;
}) {
  const plans = useMemo(
    () => SETTING_GOAL_MATRIX[setting].map((goal) => buildOutcomePlan(setting, goal)),
    [setting],
  );
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[900px] mx-auto px-6 pt-16 pb-24">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#EA2C00] mb-3">The plan</div>
        <h1 className="font-abridge text-[36px] md:text-[42px] leading-[1.08] text-[#1A1A1A] mb-4 max-w-[680px]">
          Here is the plan to attain it, {partner}.
        </h1>
        <p className="text-[15px] text-[#4A4238] leading-relaxed mb-12 max-w-[600px]">
          Every outcome, broken into the few things a specific person can move. Each owner tracks their
          metrics against the outcome, on the cadence you set.
        </p>
        {plans.map((p) => (
          <OutcomeBlock key={p.goal} plan={p} />
        ))}
      </div>
    </div>
  );
}
