import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { categoryForGoal } from "@/lib/attain/attainGoals";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";
import {
  getScript,
  resolveResult,
  briefThesis,
  briefRoles,
  briefPlaybook,
  briefFoundation,
  groundingQuestions,
  WHY_NOW,
  BRIEF,
  type DiscoveryAnswers,
  type DiscoveryScript,
  type GroundingQuestion,
  type FoundationRead,
} from "@/lib/attain/discovery";

/**
 * Value Attainment Strategy: a consultant-style discovery interview. Qualitative
 * grounding, then a branching walk per goal (one question per page, advance on
 * click, a "what we're hearing" ledger accumulating alongside), then a synthesized
 * brief that reframes the problem and names where the real value is, and hands to
 * the ROI. Its own component so it never touches the shared Plan/Progress engine.
 */

interface Props {
  setting: AttainSetting;
  settingLabel: string;
  goals: GoalId[];
  partner: string;
  initialAnswers: DiscoveryAnswers;
  onPersistAnswers: (a: DiscoveryAnswers) => void;
  onFinish?: () => void;
  onExit: () => void;
}
export interface VSEHandle { back: () => void }

type Pos =
  | { kind: "ground"; idx: number }
  | { kind: "triage" }
  | { kind: "goal"; goalIdx: number; qid: string }
  | { kind: "whynow" }
  | { kind: "brief" };

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const ValueStrategyExperience = forwardRef<VSEHandle, Props>(function ValueStrategyExperience(
  { setting, settingLabel, goals, partner, initialAnswers, onPersistAnswers, onFinish, onExit },
  ref,
) {
  const authoredAll = useMemo(
    () => goals.filter((g) => !!getScript(setting, g)),
    [goals, setting],
  );
  const pending = useMemo(() => goals.filter((g) => !getScript(setting, g)), [goals, setting]);
  const ground = useMemo(() => groundingQuestions(setting), [setting]);
  const multi = authoredAll.length > 1;

  const [answers, setAnswers] = useState<DiscoveryAnswers>(initialAnswers);
  // priority order (triage can move the chosen goal first)
  const [order, setOrder] = useState<GoalId[]>(authoredAll);
  const [pos, setPos] = useState<Pos>(() => (authoredAll.length ? { kind: "ground", idx: 0 } : { kind: "brief" }));
  const [history, setHistory] = useState<Pos[]>([]);
  const [reflect, setReflect] = useState<string | null>(null);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [pos]);

  const persist = (next: DiscoveryAnswers) => { setAnswers(next); onPersistAnswers(next); };
  const advance = (from: Pos, to: Pos, refl: string | null = null) => {
    setHistory((h) => [...h, from]);
    setReflect(refl);
    setPos(to);
  };

  const goalEntry = (goalIdx: number): Pos => ({ kind: "goal", goalIdx, qid: getScript(setting, order[goalIdx])!.entry });

  // ── transitions ────────────────────────────────────────────────────────────
  const answerGround = (qid: string, optId: string) => {
    if (pos.kind !== "ground") return;
    persist({ ...answers, [`_ground:${qid}`]: optId });
    if (pos.idx + 1 < ground.length) advance(pos, { kind: "ground", idx: pos.idx + 1 });
    else if (multi) advance(pos, { kind: "triage" });
    else advance(pos, goalEntry(0));
  };
  const answerTriage = (goalId: GoalId) => {
    if (pos.kind !== "triage") return;
    const reordered = [goalId, ...authoredAll.filter((g) => g !== goalId)];
    setOrder(reordered);
    persist({ ...answers, ["_triage"]: goalId });
    advance(pos, { kind: "goal", goalIdx: 0, qid: getScript(setting, reordered[0])!.entry });
  };
  const answerGoal = (optId: string) => {
    if (pos.kind !== "goal") return;
    const goal = order[pos.goalIdx];
    const script = getScript(setting, goal)!;
    const opt = script.questions[pos.qid].options.find((o) => o.id === optId);
    if (!opt) return;
    persist({ ...answers, [`${goal}:${pos.qid}`]: optId });
    if (opt.next === BRIEF) {
      if (pos.goalIdx + 1 < order.length) advance(pos, goalEntry(pos.goalIdx + 1));
      else advance(pos, { kind: "whynow" });
    } else {
      advance(pos, { kind: "goal", goalIdx: pos.goalIdx, qid: opt.next }, opt.reflect ?? null);
    }
  };
  const answerWhyNow = (optId: string) => {
    if (pos.kind !== "whynow") return;
    persist({ ...answers, ["_ground:whynow"]: optId });
    advance(pos, { kind: "brief" });
  };

  const back = () => {
    if (history.length > 0) {
      setReflect(null);
      setPos(history[history.length - 1]);
      setHistory((h) => h.slice(0, -1));
    } else {
      onExit();
    }
  };
  useImperativeHandle(ref, () => ({ back }));

  if (authoredAll.length === 0) {
    return (
      <div className="max-w-[720px] mx-auto px-6 py-16 text-center">
        <h1 className="font-abridge text-[28px] text-[#1A1A1A]">This discovery is being authored.</h1>
        <p className="text-[15px] text-[#6B6B6B] mt-3">Pick a setting and a goal with a live interview to walk it.</p>
        <button onClick={onExit} className="mt-8 inline-flex items-center gap-2 text-[14px] font-semibold text-[#1A1A1A]"><ArrowLeft className="w-4 h-4" /> Back</button>
      </div>
    );
  }

  // ── the "what we're hearing" ledger (accumulates as they answer) ─────────────
  const ledger = buildLedger(setting, ground, order, answers);

  if (pos.kind === "brief") {
    return <Brief setting={setting} settingLabel={settingLabel} partner={partner} order={order} pending={pending} answers={answers} triaged={multi} onFinish={onFinish} />;
  }

  // Everything else is a single-select question with the ledger alongside.
  let stepEyebrow = "";
  let prompt = "";
  let teach = "";
  let options: { id: string; label: string; teach?: string }[] = [];
  let selected: string | undefined;
  let onPick: (id: string) => void = () => {};

  if (pos.kind === "ground") {
    const q = ground[pos.idx];
    stepEyebrow = q.eyebrow;
    prompt = q.prompt; teach = q.teach; options = q.options;
    selected = answers[`_ground:${q.id}`];
    onPick = (id) => answerGround(q.id, id);
  } else if (pos.kind === "triage") {
    stepEyebrow = "First, the priority";
    prompt = "If you could only move one of these this year, which matters most?";
    teach = "A good strategy is a choice. We will walk them all, but the one you pick leads the plan.";
    options = order.map((g) => ({ id: g, label: categoryForGoal(setting, g) }));
    selected = answers["_triage"];
    onPick = (id) => answerTriage(id as GoalId);
  } else if (pos.kind === "whynow") {
    stepEyebrow = WHY_NOW.eyebrow;
    prompt = WHY_NOW.prompt; teach = WHY_NOW.teach; options = WHY_NOW.options;
    selected = answers["_ground:whynow"];
    onPick = (id) => answerWhyNow(id);
  } else {
    const goal = order[pos.goalIdx];
    const script = getScript(setting, goal)!;
    const q = script.questions[pos.qid];
    stepEyebrow = q.eyebrow ?? categoryForGoal(setting, goal);
    prompt = q.prompt; teach = q.teach ?? ""; options = q.options;
    selected = answers[`${goal}:${pos.qid}`];
    onPick = (id) => answerGoal(id);
  }

  const contextLabel =
    pos.kind === "goal"
      ? `${settingLabel} · ${categoryForGoal(setting, order[pos.goalIdx])}${order.length > 1 ? ` · ${pos.goalIdx + 1} of ${order.length}` : ""}`
      : settingLabel;

  return (
    <div className="max-w-[1080px] mx-auto px-6 py-8 md:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1px_320px] gap-x-[52px] gap-y-8">
        {/* LEFT — the question */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#B4A896] mb-5">{contextLabel}</p>
          {reflect && (
            <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-[#FAF7F2] border border-[#EDE8E1] px-4 py-3">
              <Check className="w-4 h-4 text-[#EA2C00] mt-[2px] flex-shrink-0" strokeWidth={2.5} />
              <p className="text-[13.5px] text-[#3A342E] leading-snug">{reflect}</p>
            </div>
          )}
          {stepEyebrow && <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-3">{stepEyebrow}</p>}
          <h1 className="font-abridge text-[28px] md:text-[36px] text-[#1A1A1A] leading-[1.13] mb-3">{prompt}</h1>
          {teach && <p className="text-[15px] text-[#5A5248] leading-relaxed max-w-[540px] mb-8">{teach}</p>}

          <div className="border-t border-[#E8E2DA]">
            {options.map((o) => {
              const on = selected === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onPick(o.id)}
                  data-testid={testId(pos, o.id)}
                  className={`group relative w-full text-left flex items-center gap-4 pl-4 pr-3 py-5 border-b border-[#E8E2DA] transition-all cursor-pointer hover:pl-5 ${on ? "bg-[#FBE7E1]/40" : "hover:bg-[#F6F2EC]"}`}
                >
                  {on && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#EA2C00]" aria-hidden />}
                  <div className="min-w-0 flex-1">
                    <div className={`text-[17px] leading-snug ${on ? "font-semibold text-[#EA2C00]" : "font-medium text-[#1A1A1A]"}`}>{o.label}</div>
                    {o.teach && <div className="text-[13px] text-[#8C8073] leading-snug mt-1 max-w-[520px]">{o.teach}</div>}
                  </div>
                  <ArrowRight className={`w-5 h-5 flex-shrink-0 transition-all ${on ? "text-[#EA2C00]" : "text-[#C9BDAD] group-hover:text-[#EA2C00] group-hover:translate-x-1"}`} strokeWidth={1.8} />
                </button>
              );
            })}
          </div>
        </div>

        {/* vertical hairline */}
        <div className="hidden lg:block bg-[#E8E2DA]" />

        {/* RIGHT — what we're hearing */}
        <Ledger groups={ledger} />
      </div>
    </div>
  );
});

export default ValueStrategyExperience;

// ── the accumulating ledger ──────────────────────────────────────────────────
interface LedgerGroup { label: string; items: string[] }

function buildLedger(setting: AttainSetting, ground: GroundingQuestion[], order: GoalId[], answers: DiscoveryAnswers): LedgerGroup[] {
  const groups: LedgerGroup[] = [];
  const groundItems: string[] = [];
  for (const q of ground) {
    const a = answers[`_ground:${q.id}`];
    const opt = q.options.find((o) => o.id === a);
    if (opt) groundItems.push(opt.capture);
  }
  if (groundItems.length) groups.push({ label: "Grounding", items: groundItems });

  for (const goal of order) {
    const res = resolveResult(setting, goal, answers);
    if (res && res.narrative.length) groups.push({ label: categoryForGoal(setting, goal), items: res.narrative });
  }
  const why = WHY_NOW.options.find((o) => o.id === answers["_ground:whynow"]);
  if (why) groups.push({ label: "Why now", items: [why.capture] });
  return groups;
}

function Ledger({ groups }: { groups: LedgerGroup[] }) {
  return (
    <div className="lg:pt-1">
      <div className="text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#8C8073]">What we're hearing</div>
      {groups.length === 0 ? (
        <p className="text-[13px] text-[#B4A896] italic mt-4 leading-relaxed">We will assemble the picture here as we go.</p>
      ) : (
        <div className="mt-4 space-y-5">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#B4A896] mb-2">{g.label}</div>
              <ul className="space-y-2">
                {g.items.map((it, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-[#3A342E]">
                    <span className="mt-[7px] w-[5px] h-[5px] rounded-full bg-[#D8CFC0] flex-shrink-0" />
                    <span>{cap(it)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── the synthesized brief ────────────────────────────────────────────────────
function Brief({
  setting, settingLabel, partner, order, pending, answers, triaged, onFinish,
}: {
  setting: AttainSetting; settingLabel: string; partner: string; order: GoalId[];
  pending: GoalId[]; answers: DiscoveryAnswers; triaged: boolean; onFinish?: () => void;
}) {
  const results = order.map((goal) => ({ goal, script: getScript(setting, goal)!, res: resolveResult(setting, goal, answers) }));

  // cross-goal ranking sentence
  const counted = results.filter((r) => r.res?.lever).map((r) => categoryForGoal(setting, r.goal));
  const proofs = results.filter((r) => !r.res?.lever && (r.res?.proof || r.script.proofLine) && !r.res?.honest).map((r) => categoryForGoal(setting, r.goal));
  const honests = results.filter((r) => r.res?.honest && !r.res?.lever).map((r) => categoryForGoal(setting, r.goal));
  const rankBits: string[] = [];
  if (counted.length) rankBits.push(`${listPhrase(counted)} ${counted.length > 1 ? "carry" : "carries"} the near-term dollars`);
  if (proofs.length) rankBits.push(`${listPhrase(proofs)} ${proofs.length > 1 ? "are" : "is"} proof, tracked not counted`);
  if (honests.length) rankBits.push(`${listPhrase(honests)} ${honests.length > 1 ? "are" : "is"} honestly not documentation's to fix`);

  const classOf = (goal: GoalId): "counted" | "proof" | "honest" => {
    const r = results.find((x) => x.goal === goal);
    if (r?.res?.lever) return "counted";
    if (r?.res?.honest) return "honest";
    return "proof";
  };
  const [selected, setSelected] = useState<GoalId>(order[0]);
  const active = order.includes(selected) ? selected : order[0];
  const activeEntry = results.find((r) => r.goal === active)!;
  const activeFoundation = briefFoundation(setting, active, settingLabel, answers);

  return (
    <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-8 md:py-12">
      {/* hero — a mirror ("where you are, where you want to go") when the active
          goal is a foundation read; the older verdict framing otherwise. */}
      {activeFoundation ? (
        <>
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-3">The foundation</p>
          <h1 className="font-abridge text-[32px] md:text-[46px] text-[#1A1A1A] leading-[1.05] mb-4">
            {partner.trim() ? `Where ${partner.trim()} stands today, and where you want to go.` : "Where you are today, and where you want to go."}
          </h1>
          <p className="text-[15.5px] text-[#4A4238] leading-relaxed max-w-[620px]">
            No numbers yet. This is your current picture and your target, in plain terms. Next we size the gap between them, then build the plan to close it.
          </p>
        </>
      ) : (
        <>
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-3">The discovery brief</p>
          <h1 className="font-abridge text-[32px] md:text-[46px] text-[#1A1A1A] leading-[1.05] mb-4">
            Here is what you are really after{partner.trim() ? <>, {partner.trim()}</> : null}.
          </h1>
          <p className="text-[15.5px] text-[#4A4238] leading-relaxed max-w-[600px]">
            No numbers, on purpose. This is the problem in plain terms and where the value actually is. Next we put your figures to it and build the ROI together.
          </p>
          {rankBits.length > 0 && (
            <div className="mt-7 rounded-2xl border border-[#E8E2DA] bg-[#FCFBF9] pl-5 pr-6 py-4 border-l-[3px] border-l-[#EA2C00] max-w-[760px]">
              <p className="text-[10px] font-bold uppercase tracking-[1.6px] text-[#EA2C00] mb-1.5">The verdict</p>
              <p className="text-[15.5px] text-[#1A1A1A] leading-relaxed">{cap(rankBits.join("; "))}.</p>
            </div>
          )}
        </>
      )}

      {/* goal pills — one goal read at a time */}
      {order.length > 1 && (
        <div className="flex flex-wrap gap-2.5 mt-8">
          {order.map((goal) => {
            const on = goal === active;
            const c = classOf(goal);
            const dot = c === "counted" ? "bg-[#EA2C00]" : c === "proof" ? "bg-[#B78A5A]" : "bg-[#C4B8A8]";
            return (
              <button
                key={goal}
                type="button"
                onClick={() => setSelected(goal)}
                data-testid={`brief-pill-${goal}`}
                className={`inline-flex items-center gap-2 rounded-full pl-3 pr-4 py-2 text-[13px] font-semibold border transition-colors ${
                  on ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-white text-[#4A4238] border-[#E8E2DA] hover:border-[#B4A896]"
                }`}
              >
                <span className={`w-[7px] h-[7px] rounded-full ${dot}`} />
                {categoryForGoal(setting, goal)}
              </button>
            );
          })}
        </div>
      )}

      {/* the selected goal read */}
      <div className="mt-8">
        <GoalBrief setting={setting} settingLabel={settingLabel} goal={active} script={activeEntry.script} res={activeEntry.res} answers={answers} />
      </div>

      {pending.length > 0 && (
        <div className="mt-10 rounded-xl bg-[#FAF7F2] border border-dashed border-[#D8CFC0] px-5 py-4">
          <p className="text-[13px] text-[#8C8073] leading-relaxed">
            {pending.map((g) => categoryForGoal(setting, g)).join(", ")}: the discovery for {pending.length > 1 ? "these is" : "this is"} being authored and will join the brief soon.
          </p>
        </div>
      )}

      <div className="mt-12 flex items-center justify-end border-t border-[#E8E2DA] pt-6">
        <button type="button" onClick={onFinish} data-testid="discovery-build-roi" className="inline-flex items-center gap-2 rounded-xl bg-[#EA2C00] text-white text-[14px] font-semibold px-5 py-2.5 hover:bg-[#d12800] transition-colors">
          {counted.length > 0 ? "Build the ROI on this" : "Take this into the ROI"} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function GoalBrief({
  setting, settingLabel, goal, script, res, answers,
}: {
  setting: AttainSetting; settingLabel: string; goal: GoalId; script: DiscoveryScript;
  res: ReturnType<typeof resolveResult>; answers: DiscoveryAnswers;
}) {
  const goalLabel = categoryForGoal(setting, goal);
  const lever = res?.lever;
  const proof = res?.proof ?? (res && !lever && !res.honest ? script.proofLine : undefined);
  const honest = res?.honest;

  const foundation = briefFoundation(setting, goal, settingLabel, answers);
  if (foundation) {
    return <FoundationCard settingLabel={settingLabel} goalLabel={goalLabel} foundation={foundation} />;
  }

  const thesis = briefThesis(setting, goal, settingLabel, answers);
  const roles = briefRoles(setting, goal, settingLabel, answers);
  const playbook = briefPlaybook(setting, goal, settingLabel, answers);

  // theory-of-change chain
  const testNode = honest ? "not documentation's to fix" : proof ? "a proof-play" : "documentation is the lever";
  const valueNode = lever ? lever.label : proof ? "Tracked, not counted" : "Elsewhere";

  const hingeText = honest
    ? "You flagged that a good part of this sits outside what a better note can fix, so we would size only the documentation-attributable share and be straight about the rest."
    : script.caveat;

  return (
    <div className="rounded-3xl border border-[#E8E2DA] bg-white overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* LEFT: the read */}
        <div className="lg:col-span-7 px-7 py-7 lg:pr-9">
          <p className="text-[10px] font-bold uppercase tracking-[1.6px] text-[#8C8073] mb-3">{settingLabel} · {goalLabel}</p>
          <p className="text-[19px] md:text-[20px] text-[#1A1A1A] leading-[1.55]">{thesis}</p>

          {/* the theory-of-change chain */}
          <div className="mt-6 flex items-stretch gap-2">
            <ChainNode label="The aim" value={goalLabel} />
            <ChainArrow />
            <ChainNode label="The test" value={testNode} muted />
            <ChainArrow />
            <ChainNode label="Where the value is" value={valueNode} coral={!!lever} />
          </div>

          {playbook && (
            <p className="text-[13px] text-[#8C8073] leading-relaxed mt-6 pt-5 border-t border-[#F0EAE3]">
              <span className="font-bold uppercase tracking-[0.06em] text-[#B4A896] text-[10px] mr-1.5">At the table</span>
              {roles.join(" · ")}
            </p>
          )}
        </div>

        {/* RIGHT: the operating read, or the hinge + table when there is no play yet */}
        <div className="lg:col-span-5 bg-[#FBFAF7] border-t lg:border-t-0 lg:border-l border-[#EFE9E1] px-7 py-7 flex flex-col">
          {playbook ? (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[1.6px] text-[#B78A5A] mb-4">The operating read</p>
              <div className="space-y-4">
                <PlaybookRow label="The lever" value={playbook.lever} />
                <PlaybookRow label="How it turns into money" value={playbook.mechanism} />
                <PlaybookRow label="What has to hold" value={playbook.holds} />
                <PlaybookRow label="You'll see it first as" value={playbook.signal} coral />
              </div>
              <p className="text-[11.5px] text-[#8C8073] leading-relaxed mt-5 pt-3.5 border-t border-[#EFE9E1]">
                The owner and review cadence get set in the Plan, and the signal above becomes what it tracks.
              </p>
            </>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[1.6px] text-[#B78A5A] mb-3">The hinge</p>
              <p className="text-[14px] text-[#3A342E] leading-relaxed">{hingeText}</p>
              <div className="mt-5 pt-4 border-t border-[#EFE9E1]">
                <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#B4A896] mb-1.5">At the table</p>
                <p className="text-[13px] text-[#6E675C] leading-relaxed">{roles.join(" · ")}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// The foundation read: a current-state / desired-state mirror. Strategy's real
// job, per the reshape — gather where they are and where they want to go, and
// let the honesty fall out of the picture (the bridge), not a verdict.
function FoundationCard({ settingLabel, goalLabel, foundation }: { settingLabel: string; goalLabel: string; foundation: FoundationRead }) {
  return (
    <div className="rounded-3xl border border-[#E8E2DA] bg-white overflow-hidden">
      <div className="px-7 pt-6 pb-1">
        <p className="text-[10px] font-bold uppercase tracking-[1.6px] text-[#8C8073]">{settingLabel} · {goalLabel}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* WHERE YOU ARE */}
        <div className="px-7 pt-5 pb-7 lg:pr-9">
          <p className="text-[11px] font-bold uppercase tracking-[1.6px] text-[#4A4238] mb-4">Where you are</p>
          <div className="space-y-4">
            {foundation.current.map((it) => (
              <FoundationRow key={it.label} label={it.label} value={it.value} />
            ))}
          </div>
        </div>
        {/* WHERE YOU WANT TO GO */}
        <div className="px-7 pt-5 pb-7 bg-[#FBFAF7] border-t lg:border-t-0 lg:border-l border-[#EFE9E1]">
          <p className="text-[11px] font-bold uppercase tracking-[1.6px] text-[#B78A5A] mb-4">Where you want to go</p>
          <div className="space-y-4">
            {foundation.desired.map((it) => (
              <FoundationRow key={it.label} label={it.label} value={it.value} coral={it.label === foundation.signalLabel} />
            ))}
          </div>
        </div>
      </div>
      {/* the bridge: the gap goes to ROI, the path to the Plan; honesty lives here */}
      <div className="px-7 py-5 border-t border-[#EFE9E1] bg-[#FCFBF9]">
        <p className="text-[13.5px] text-[#4A4238] leading-relaxed">
          <span className="font-bold uppercase tracking-[0.06em] text-[#B4A896] text-[10px] mr-2">Next</span>
          {foundation.bridge}
        </p>
      </div>
    </div>
  );
}

function FoundationRow({ label, value, coral }: { label: string; value: string; coral?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#B4A896] mb-1">{label}</div>
      <div className={`text-[15px] leading-snug ${coral ? "text-[#EA2C00] font-semibold" : "text-[#1A1A1A] font-medium"}`}>{value}</div>
    </div>
  );
}

function PlaybookRow({ label, value, coral }: { label: string; value: string; coral?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#B4A896] mb-1">{label}</div>
      <div className={`text-[13.5px] leading-snug ${coral ? "text-[#EA2C00] font-semibold" : "text-[#3A342E]"}`}>{value}</div>
    </div>
  );
}

function ChainNode({ label, value, coral, muted }: { label: string; value: string; coral?: boolean; muted?: boolean }) {
  return (
    <div className={`flex-1 min-w-0 rounded-xl border px-3.5 py-3 ${coral ? "border-[#EA2C00] bg-[#FBE7E1]/50" : "border-[#E8E2DA] bg-[#FCFBF9]"}`}>
      <div className="text-[9px] font-bold uppercase tracking-[0.07em] text-[#B4A896] mb-1">{label}</div>
      <div className={`text-[13.5px] leading-snug ${coral ? "font-abridge text-[#EA2C00]" : muted ? "text-[#6E675C]" : "font-semibold text-[#1A1A1A]"}`}>{value}</div>
    </div>
  );
}
function ChainArrow() {
  return <div className="flex items-center text-[#C9BDAD] flex-shrink-0"><ArrowRight className="w-4 h-4" strokeWidth={2} /></div>;
}

// ── helpers ──────────────────────────────────────────────────────────────────
function joinClauses(clauses: string[]): string {
  if (clauses.length === 1) return clauses[0];
  if (clauses.length === 2) return `${clauses[0]} and ${clauses[1]}`;
  return `${clauses.slice(0, -1).join(", ")}, and ${clauses[clauses.length - 1]}`;
}
function listPhrase(items: string[]): string {
  return joinClauses(items);
}
function testId(pos: Pos, optId: string): string {
  if (pos.kind === "ground") return `discovery-ground-${pos.idx}-${optId}`;
  if (pos.kind === "triage") return `discovery-triage-${optId}`;
  if (pos.kind === "whynow") return `discovery-whynow-${optId}`;
  if (pos.kind === "goal") return `discovery-opt-${optId}`; // goal option ids are unique within a question
  return `discovery-${optId}`;
}
