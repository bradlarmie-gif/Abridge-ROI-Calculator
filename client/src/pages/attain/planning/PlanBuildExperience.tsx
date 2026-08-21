import { useMemo, useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import {
  buildOutcomePlan,
  applyOverlay,
  keyOwners,
  ABRIDGE_OWNER,
  type OutcomePlan,
  type PlanOwner,
  type PlanStep,
  type PlanOverlay,
  type OwnerNames,
} from "@/lib/attain/planBuild";
import { SETTING_GOAL_MATRIX } from "@/lib/attain/attainGoals";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";
import type { AttainBaseline } from "@/lib/attain/attainLevers";

/**
 * The rebuilt Planning experience — a guided build-walk that deconstructs each
 * outcome into its owners + the metrics they track, then a synthesized plan.
 *
 *   1 · Owners   — assign a real person to each owner-role.
 *   2 · Targets  — per outcome, set each metric's target + by-when (baselines carry forward).
 *   3 · Cadence  — how often it's reviewed + the one accountable owner.
 *   4 · The plan — the owner-grouped plan, on a page. Download / start tracking.
 *
 * Reads the `planBuild` join as its single source of truth. State is lifted so a
 * parent (AttainFlowV2) can persist it to the AttainSnapshot; the flagged
 * preview runs it standalone.
 */

const C = {
  ink: "#1A1A1A", body: "#4A4238", muted: "#6E675C", faint: "#8C8073",
  hair: "#E8E2DA", hair2: "#EDE8E1", surface: "#FCFBF9", wash: "#FBE7E1", coral: "#EA2C00",
} as const;

export interface PlanBuildState {
  ownerNames: OwnerNames;
  overlayByGoal: Partial<Record<GoalId, PlanOverlay>>;
  cadence: "monthly" | "quarterly";
  execOwner: string;
  /** Progress: this review's current reading per step, keyed by goal then step n. */
  readingsByGoal?: Partial<Record<GoalId, Record<number, string>>>;
}
const EMPTY_STATE: PlanBuildState = { ownerNames: {}, overlayByGoal: {}, cadence: "monthly", execOwner: "", readingsByGoal: {} };

/** parse a loose numeric string ("55%", "1,200") to a number, or null. */
function numOf(s?: string): number | null {
  if (!s) return null;
  const n = Number(s.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}
/** how far a reading has moved from baseline toward target, 0..1, or null. */
function stepAttain(baseline?: string, target?: string, reading?: string): number | null {
  const b = numOf(baseline), t = numOf(target), r = numOf(reading);
  if (b === null || t === null || r === null || t === b) return null;
  return Math.max(0, Math.min(1, (r - b) / (t - b)));
}

const LAYER_LABEL: Record<PlanStep["layer"], string> = {
  leading: "Abridge proves", operational: "The team runs", outcome: "The outcome",
};

// ── shared atoms ─────────────────────────────────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#EA2C00] mb-3">{children}</div>;
}
function TextInput({ value, onChange, placeholder, width }: { value: string; onChange: (v: string) => void; placeholder?: string; width?: number }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={width ? { width } : undefined}
      className="bg-transparent border-0 border-b-2 border-[#E0D9CE] rounded-none px-0 pb-1 text-[15px] text-[#1A1A1A] outline-none transition-colors focus:border-[#EA2C00] placeholder:text-[#C4BCB0]"
    />
  );
}
function SourceChip({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#E0D9CE] px-[8px] py-[2px] text-[10px] font-bold uppercase tracking-[0.08em] text-[#8C8073] whitespace-nowrap">
      {source}
    </span>
  );
}

// ── final synthesized-plan rows (read-only) ──────────────────────────────────
function StepRow({ step }: { step: PlanStep }) {
  const isOutcome = step.layer === "outcome";
  return (
    <div className="flex items-start justify-between gap-4 py-[13px] border-b border-[#EDE8E1] last:border-b-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[9px] font-bold uppercase tracking-[0.1em] ${isOutcome ? "text-[#EA2C00]" : step.layer === "leading" ? "text-[#8C8073]" : "text-[#A79E92]"}`}>{LAYER_LABEL[step.layer]}</span>
          {step.fragile && <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#B78A5A]">Make-or-break</span>}
        </div>
        <div className={`text-[14.5px] leading-[1.35] ${isOutcome ? "font-bold text-[#1A1A1A]" : "text-[#2E2822]"}`}>{step.name}</div>
        <div className="mt-[3px] text-[12.5px] text-[#6E675C] leading-[1.4]">Watch: {step.signal}</div>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <SourceChip source={step.source} />
        <div className="text-[12px] text-[#A79E92] tabular-nums">
          {step.baseline || "—"}<span className="mx-1 text-[#C9BDAD]">&rarr;</span>
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
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C8073] mb-1">{owner.isAbridge ? "Enables it · shared" : "Owner"}</div>
          <div className="font-abridge text-[18px] text-[#1A1A1A] leading-tight">{owner.person || owner.role}</div>
          {owner.person && <div className="text-[12px] text-[#8C8073] mt-0.5">{owner.role}</div>}
        </div>
        <span className="text-[11px] text-[#A79E92] whitespace-nowrap">{owner.steps.length} {owner.steps.length === 1 ? "metric" : "metrics"}</span>
      </div>
      {owner.steps.map((s) => <StepRow key={s.n} step={s} />)}
    </div>
  );
}

// ── the walk ─────────────────────────────────────────────────────────────────
type StepKey = "owners" | "targets" | "cadence" | "plan";
const STEPS: { key: StepKey; label: string }[] = [
  { key: "owners", label: "Owners" }, { key: "targets", label: "Targets" },
  { key: "cadence", label: "Cadence" }, { key: "plan", label: "The plan" },
];

export default function PlanBuildExperience({
  setting = "outpatient", partner = "your team",
  initial, onPersist, goals: goalsProp, embedded = false, onExit, baseline, onTrackingChange,
}: {
  setting?: AttainSetting; partner?: string;
  initial?: PlanBuildState; onPersist?: (s: PlanBuildState) => void;
  /** the goals the partner picked in the funnel; defaults to the full matrix. */
  goals?: GoalId[];
  /** when mounted inside the funnel, suppress the standalone header and route
   * Back-at-first-step to the funnel instead of a dead end. */
  embedded?: boolean;
  onExit?: () => void;
  /** Starting Point numbers, carried in so the adoption baseline pre-fills. */
  baseline?: AttainBaseline;
  /** Report when the walk flips into Progress/tracking, so the funnel header
   * breadcrumb can read "Progress" instead of "Your plan". */
  onTrackingChange?: (tracking: boolean) => void;
}) {
  const goals = (goalsProp && goalsProp.length ? goalsProp : SETTING_GOAL_MATRIX[setting]);
  // Carry the thread: the recording % from the Starting Point becomes the leading
  // "Abridge adopted" step's baseline on every outcome. Everything else stays
  // editable-blank (no fabricated numbers).
  const basePlans = useMemo(() => {
    const mruPct = baseline?.mruRecording && baseline?.providers ? Math.round((baseline.mruRecording / baseline.providers) * 100) : null;
    return goals.map((g) => {
      const plan = buildOutcomePlan(setting, g);
      if (mruPct === null) return plan;
      return { ...plan, owners: plan.owners.map((o) => ({ ...o, steps: o.steps.map((s) => (s.isAbridge && /recording/i.test(s.signal) && !s.baseline ? { ...s, baseline: `${mruPct}%` } : s)) })) };
    });
  }, [setting, goals, baseline]);
  const [state, setState] = useState<PlanBuildState>(initial ?? EMPTY_STATE);
  const [pos, setPos] = useState(0);
  const [tracking, setTracking] = useState(false);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pos, tracking]);
  useEffect(() => { onPersist?.(state); }, [state, onPersist]);
  useEffect(() => { onTrackingChange?.(tracking); }, [tracking, onTrackingChange]);

  const stepKey = STEPS[pos].key;
  const patch = (p: Partial<PlanBuildState>) => setState((s) => ({ ...s, ...p }));
  const setOwner = (role: string, name: string) => patch({ ownerNames: { ...state.ownerNames, [role]: name } });
  const setEntry = (goal: GoalId, n: number, field: "target" | "byWhen" | "baseline", v: string) =>
    patch({ overlayByGoal: { ...state.overlayByGoal, [goal]: { ...(state.overlayByGoal[goal] ?? {}), [n]: { ...((state.overlayByGoal[goal] ?? {})[n] ?? {}), [field]: v } } } });
  const readings = state.readingsByGoal ?? {};
  const setReading = (goal: GoalId, n: number, v: string) =>
    patch({ readingsByGoal: { ...readings, [goal]: { ...(readings[goal] ?? {}), [n]: v } } });

  // plans with the partner overlay applied (for targets + final plan)
  const plans = useMemo(
    () => basePlans.map((p) => applyOverlay(p, state.overlayByGoal[p.goal] ?? {}, state.ownerNames)),
    [basePlans, state.overlayByGoal, state.ownerNames],
  );
  const namedOwnerCount = Object.values(state.ownerNames).filter((v) => v.trim()).length;

  // ── Progress / tracking mode ───────────────────────────────────────────────
  if (tracking) {
    const allSteps = plans.flatMap((p) => p.owners.flatMap((o) => o.steps.map((s) => ({ goal: p.goal, s }))));
    const attains = allSteps.map(({ goal, s }) => stepAttain(s.baseline, s.target, readings[goal]?.[s.n])).filter((a): a is number => a !== null);
    const overall = attains.length ? Math.round((attains.reduce((x, y) => x + y, 0) / attains.length) * 100) : 0;
    return (
      <div className={embedded ? "bg-white" : "min-h-screen bg-white"}>
        <div className={`${embedded ? "" : "sticky top-0 z-10"} bg-white/95 backdrop-blur border-b border-[#EDE8E1]`}>
          <div className="max-w-[960px] mx-auto px-6 h-14 flex items-center justify-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#EA2C00]">Progress</span>
          </div>
        </div>
        <div className="max-w-[960px] mx-auto px-6 pt-12 pb-28">
          <Eyebrow>The plan, measured</Eyebrow>
          <h1 className="font-abridge text-[34px] md:text-[40px] leading-[1.08] text-[#1A1A1A] mb-3">How far along are we?</h1>
          <p className="text-[15px] text-[#4A4238] leading-relaxed mb-8 max-w-[600px]">Drop in this review's reading for each metric. Attainment builds from how far each has moved from its baseline toward the target.</p>
          <div className="rounded-[16px] border border-[#E8E2DA] bg-[#FCFBF9] px-6 py-6 mb-10">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C8073] mb-2">Attainment, all outcomes</div>
            {attains.length ? (
              <>
                <div className="font-abridge text-[52px] leading-none text-[#EA2C00]">{overall}<span className="text-[26px]">%</span></div>
                <div className="mt-4 h-2 rounded-full bg-[#E8E2DA] overflow-hidden"><div className="h-full bg-[#EA2C00] transition-all" style={{ width: `${overall}%` }} /></div>
                <div className="text-[12px] text-[#8C8073] mt-2">{attains.length} {attains.length === 1 ? "metric" : "metrics"} with a reading, against {attains.length === 1 ? "its" : "their"} baseline and target.</div>
              </>
            ) : (
              <p className="text-[15px] text-[#4A4238] leading-relaxed mt-1 max-w-[520px]">Enter this review's readings below. Attainment builds here as each metric moves from its baseline toward the target.</p>
            )}
          </div>
          {plans.map((p) => (
            <section key={p.goal} className="mb-10">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA2C00] mb-3">{p.chainTitle}</div>
              <div className="rounded-[14px] border border-[#E8E2DA] overflow-hidden">
                {p.owners.flatMap((o) => o.steps).map((s, i, arr) => {
                  const a = stepAttain(s.baseline, s.target, readings[p.goal]?.[s.n]);
                  return (
                    <div key={s.n} className={`px-5 py-4 ${i < arr.length - 1 ? "border-b border-[#EDE8E1]" : ""}`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-[14px] text-[#2E2822] leading-tight">{s.name}</div>
                          <div className="text-[12px] text-[#8C8073] mt-0.5">{s.signal}</div>
                        </div>
                        <div className="flex items-center gap-2.5 flex-shrink-0 text-[13px]">
                          <span className="text-[#A79E92] tabular-nums w-[54px] text-right">{s.baseline || "—"}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#C9BDAD]" />
                          <TextInput value={readings[p.goal]?.[s.n] ?? ""} onChange={(v) => setReading(p.goal, s.n, v)} placeholder="now" width={64} />
                          <ArrowRight className="w-3.5 h-3.5 text-[#C9BDAD]" />
                          <span className={`tabular-nums w-[54px] ${s.target ? "text-[#EA2C00] font-semibold" : "text-[#C4BCB0]"}`}>{s.target || "target"}</span>
                        </div>
                      </div>
                      {a !== null && <div className="mt-2.5 h-1.5 rounded-full bg-[#E8E2DA] overflow-hidden"><div className="h-full bg-[#EA2C00]" style={{ width: `${Math.round(a * 100)}%` }} /></div>}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-[#EDE8E1]">
          <div className="max-w-[960px] mx-auto px-6 h-[68px] flex items-center justify-between">
            <button onClick={() => setTracking(false)} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#6E675C] hover:text-[#1A1A1A]"><ArrowLeft className="w-4 h-4" /> Back to the plan</button>
            <span className="text-[12px] text-[#8C8073]">Reviewed {state.cadence}{state.execOwner ? ` · ${state.execOwner} accountable` : ""}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "bg-white" : "min-h-screen bg-white"}>
      {/* progress rail — standalone only; the funnel supplies its own header. When
          embedded, the step rail sits just under the app header instead. */}
      <div className={`${embedded ? "" : "sticky top-0 z-10"} bg-white/95 backdrop-blur border-b border-[#EDE8E1]`}>
        <div className={`max-w-[960px] mx-auto px-6 h-14 flex items-center ${embedded ? "justify-center" : "justify-between"}`}>
          {!embedded && <span className="font-abridge text-[18px] text-[#EA2C00]">ABRIDGE</span>}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <span key={s.key} className={`text-[11px] font-bold uppercase tracking-[0.1em] ${i === pos ? "text-[#1A1A1A]" : i < pos ? "text-[#EA2C00]" : "text-[#C9BDAD]"}`}>
                {i > 0 && <span className="mx-2 text-[#E0D9CE]">·</span>}{s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[960px] mx-auto px-6 pt-12 pb-28">
        {stepKey === "owners" && (
          <div>
            <Eyebrow>Build the plan · Owners</Eyebrow>
            <h1 className="font-abridge text-[34px] md:text-[40px] leading-[1.08] text-[#1A1A1A] mb-3">Who owns each step?</h1>
            <p className="text-[15px] text-[#4A4238] leading-relaxed mb-9 max-w-[600px]">A plan only moves if a specific person owns the make-or-break. Name the few people who own the hard part of each outcome, and the champion beside Abridge. The rest default to their role; you can fill them later.</p>
            {/* One enabling owner across the whole plan */}
            <div className="flex items-center justify-between gap-6 rounded-[12px] border border-[#E8E2DA] bg-[#FCFBF9] px-5 py-4 mb-8">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C8073] mb-1">Enables it · shared</div>
                <div className="font-abridge text-[17px] text-[#1A1A1A]">{ABRIDGE_OWNER}</div>
                <div className="text-[12.5px] text-[#8C8073] mt-0.5">Proves the leading signals across every outcome.</div>
              </div>
              <TextInput value={state.ownerNames[ABRIDGE_OWNER] ?? ""} onChange={(v) => setOwner(ABRIDGE_OWNER, v)} placeholder="Your champion" width={220} />
            </div>
            {basePlans.map((p) => {
              const key = keyOwners(p);
              return (
                <section key={p.goal} className="mb-8">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA2C00] mb-3">{p.chainTitle}</div>
                  <div className="space-y-2.5">
                    {key.map((o) => {
                      const hasFragile = o.steps.some((s) => s.fragile);
                      return (
                        <div key={o.role} className="flex items-center justify-between gap-6 rounded-[12px] border border-[#E8E2DA] bg-[#FCFBF9] px-5 py-4">
                          <div className="min-w-0">
                            <div className={`text-[10px] font-bold uppercase tracking-[0.12em] mb-1 ${hasFragile ? "text-[#B78A5A]" : "text-[#8C8073]"}`}>{hasFragile ? "Make-or-break" : "Owns the outcome"}</div>
                            <div className="font-abridge text-[17px] text-[#1A1A1A]">{o.role}</div>
                            <div className="text-[12.5px] text-[#8C8073] mt-0.5 truncate max-w-[440px]">{o.steps[0].name}</div>
                          </div>
                          <TextInput value={state.ownerNames[o.role] ?? ""} onChange={(v) => setOwner(o.role, v)} placeholder="Name the person" width={220} />
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {stepKey === "targets" && (
          <div>
            <Eyebrow>Build the plan · Targets</Eyebrow>
            <h1 className="font-abridge text-[34px] md:text-[40px] leading-[1.08] text-[#1A1A1A] mb-3">Set the target for each metric.</h1>
            <p className="text-[15px] text-[#4A4238] leading-relaxed mb-9 max-w-[600px]">For each metric, set where it is today, where you're driving it, and by when. These become the baseline the plan is measured against.</p>
            {plans.map((p) => (
              <section key={p.goal} className="mb-10">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA2C00] mb-3">{p.chainTitle}</div>
                <div className="rounded-[14px] border border-[#E8E2DA] overflow-hidden">
                  {p.owners.flatMap((o) => o.steps).map((s, i, arr) => (
                    <div key={s.n} className={`flex items-center justify-between gap-4 px-5 py-3.5 ${i < arr.length - 1 ? "border-b border-[#EDE8E1]" : ""} ${s.layer === "outcome" ? "bg-[#FBE7E1]/25" : ""}`}>
                      <div className="min-w-0">
                        <div className="text-[14px] text-[#2E2822] leading-tight">{s.name}</div>
                        <div className="text-[12px] text-[#8C8073] mt-0.5">{s.signal}</div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 text-[13px]">
                        <TextInput value={(state.overlayByGoal[p.goal]?.[s.n]?.baseline) ?? (s.baseline ?? "")} onChange={(v) => setEntry(p.goal, s.n, "baseline", v)} placeholder="today" width={64} />
                        <ArrowRight className="w-3.5 h-3.5 text-[#C9BDAD]" />
                        <TextInput value={(state.overlayByGoal[p.goal]?.[s.n]?.target) ?? ""} onChange={(v) => setEntry(p.goal, s.n, "target", v)} placeholder="target" width={64} />
                        <span className="text-[#C9BDAD]">by</span>
                        <TextInput value={(state.overlayByGoal[p.goal]?.[s.n]?.byWhen) ?? ""} onChange={(v) => setEntry(p.goal, s.n, "byWhen", v)} placeholder="when" width={56} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {stepKey === "cadence" && (
          <div>
            <Eyebrow>Build the plan · Cadence</Eyebrow>
            <h1 className="font-abridge text-[34px] md:text-[40px] leading-[1.08] text-[#1A1A1A] mb-3">How often do we review it?</h1>
            <p className="text-[15px] text-[#4A4238] leading-relaxed mb-9 max-w-[600px]">The plan is only real if it's checked on a schedule. Pick the cadence and the one person accountable for the whole plan.</p>
            <div className="flex gap-3 mb-10">
              {(["monthly", "quarterly"] as const).map((c) => (
                <button key={c} onClick={() => patch({ cadence: c })} className={`rounded-[12px] border px-6 py-4 text-left transition-colors ${state.cadence === c ? "border-[#EA2C00] bg-[#FBE7E1]/30" : "border-[#E8E2DA] bg-white hover:bg-[#FCFBF9]"}`}>
                  <div className={`font-abridge text-[18px] ${state.cadence === c ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}>{c === "monthly" ? "Monthly" : "Quarterly"}</div>
                  <div className="text-[12.5px] text-[#8C8073] mt-1">{c === "monthly" ? "Tight loop; catch drift early." : "Lighter touch; for slower-moving outcomes."}</div>
                </button>
              ))}
            </div>
            <div className="max-w-[420px]">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C8073] mb-2">Accountable for the whole plan</div>
              <TextInput value={state.execOwner} onChange={(v) => patch({ execOwner: v })} placeholder="e.g., VP of Value Realization" width={360} />
            </div>
          </div>
        )}

        {stepKey === "plan" && (
          <div>
            <Eyebrow>The plan</Eyebrow>
            <h1 className="font-abridge text-[36px] md:text-[42px] leading-[1.08] text-[#1A1A1A] mb-4 max-w-[680px]">Here is the plan to attain it, {partner}.</h1>
            <p className="text-[15px] text-[#4A4238] leading-relaxed mb-3 max-w-[600px]">Every outcome, broken into the few things a specific person can move. {state.execOwner ? <><b className="text-[#1A1A1A]">{state.execOwner}</b> is accountable; reviewed {state.cadence}.</> : <>Reviewed {state.cadence}.</>}</p>
            <div className="mb-11" />
            {plans.map((p) => (
              <section key={p.goal} className="mb-12">
                <div className="border-l-2 border-[#EA2C00] pl-5 mb-5">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#EA2C00] mb-1.5">The outcome · {p.displayCategory}</div>
                  <h2 className="font-abridge text-[26px] leading-[1.1] text-[#1A1A1A]">{p.chainTitle}</h2>
                </div>
                {p.owners.map((o) => <OwnerCard key={o.role} owner={o} />)}
              </section>
            ))}

            {/* The premium close — the commitment. */}
            <section className="mt-4 rounded-[18px] bg-[#1A1A1A] text-white px-8 py-9">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#F7A488] mb-3">The commitment</div>
              <h2 className="font-abridge text-[28px] md:text-[32px] leading-[1.12] mb-4 max-w-[620px]">
                {plans.length} {plans.length === 1 ? "outcome" : "outcomes"}, owned and measured. Not left to hope.
              </h2>
              <p className="text-[14.5px] leading-relaxed text-white/70 max-w-[600px] mb-1">
                {namedOwnerCount > 0 ? <><b className="text-white">{namedOwnerCount}</b> named {namedOwnerCount === 1 ? "owner" : "owners"} carry the make-or-break, </> : "Each make-or-break has an owner, "}
                the leading signals Abridge proves move first, and the outcome follows, reviewed{" "}
                <b className="text-white">{state.cadence}</b>{state.execOwner ? <>, with <b className="text-white">{state.execOwner}</b> accountable for the whole plan.</> : "."}
              </p>
              <p className="text-[13px] text-white/45 mb-7">This is the deal after the deal: the promise, made real and tracked against your own numbers.</p>
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => {
                  // Hand the real org + setting to the plan PDF (localStorage is the
                  // route's data channel) so it never opens on the sample org.
                  try {
                    localStorage.setItem("abridge:plan-pdf-data", JSON.stringify({
                      orgName: partner && partner !== "your team" ? partner : "Your organization",
                      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
                      setting,
                      plans,             // fully resolved: owner names + baselines + targets applied
                      cadence: state.cadence,
                      execOwner: state.execOwner || undefined,
                    }));
                  } catch { /* private mode: fall back to the sample */ }
                  window.open(`/?planpdf=${setting}`, "_blank");
                }} className="inline-flex items-center gap-2 rounded-[10px] bg-[#EA2C00] text-white px-6 py-3 text-[14px] font-bold hover:bg-[#d12800]">
                  Download the plan <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => setTracking(true)} className="inline-flex items-center gap-2 rounded-[10px] border border-white/25 text-white px-6 py-3 text-[14px] font-bold hover:bg-white/5">
                  Start tracking <Check className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-7 pt-5 border-t border-white/10 text-[12px] text-white/40">
                Prepared with your team &middot; {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* footer nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-[#EDE8E1]">
        <div className="max-w-[960px] mx-auto px-6 h-[68px] flex items-center justify-between">
          <button onClick={() => (pos === 0 ? onExit?.() : setPos((p) => Math.max(0, p - 1)))} disabled={pos === 0 && !onExit} className={`inline-flex items-center gap-1.5 text-[14px] font-semibold ${pos === 0 && !onExit ? "text-[#C9BDAD]" : "text-[#6E675C] hover:text-[#1A1A1A]"}`}>
            <ArrowLeft className="w-4 h-4" /> {pos === 0 ? "Back" : "Previous step"}
          </button>
          {pos < STEPS.length - 1 ? (
            <button onClick={() => setPos((p) => Math.min(STEPS.length - 1, p + 1))} className="inline-flex items-center gap-2 rounded-[10px] bg-[#EA2C00] text-white px-6 py-3 text-[14px] font-bold hover:bg-[#d12800]">
              {stepKey === "cadence" ? "See the plan" : "Continue"} <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => setTracking(true)} className="inline-flex items-center gap-2 rounded-[10px] bg-[#EA2C00] text-white px-6 py-3 text-[14px] font-bold hover:bg-[#d12800]">
              <Check className="w-4 h-4" /> Start tracking
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
