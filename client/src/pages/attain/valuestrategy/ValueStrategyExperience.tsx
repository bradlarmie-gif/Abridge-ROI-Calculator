import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { ArrowRight, ArrowLeft, Check, Download } from "lucide-react";
import { goalDisplayLabel } from "@/lib/attain/attainGoals";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";
import {
  getScript,
  resolveResult,
  briefFoundation,
  groundingQuestions,
  BRIEF,
  type DiscoveryAnswers,
  type GroundingQuestion,
  type FoundationRead,
  type FoundationItem,
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
  // priority order — the triage rank sets it; restore from a saved rank on reload.
  const [order, setOrder] = useState<GoalId[]>(() => {
    const raw = initialAnswers["_rank"];
    if (raw) {
      const rank = (raw.split(",").filter(Boolean) as GoalId[]).filter((g) => authoredAll.includes(g));
      return [...rank, ...authoredAll.filter((g) => !rank.includes(g))];
    }
    return authoredAll;
  });
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
  // Shown as a "you're in a new section now" beat when the walk moves to the next
  // ranked goal (only when there's more than one).
  const goalTransition = (nextIdx: number): string | null =>
    order.length > 1 ? `Now your #${nextIdx + 1} priority: ${goalDisplayLabel(setting, order[nextIdx])}.` : null;

  // ── transitions ────────────────────────────────────────────────────────────
  const advanceFromGround = () => {
    if (pos.kind !== "ground") return;
    if (pos.idx + 1 < ground.length) advance(pos, { kind: "ground", idx: pos.idx + 1 });
    else if (multi) advance(pos, { kind: "triage" });
    else advance(pos, goalEntry(0));
  };
  const answerGround = (qid: string, optId: string) => {
    if (pos.kind !== "ground") return;
    persist({ ...answers, [`_ground:${qid}`]: optId });
    advanceFromGround();
  };
  // Multi-select grounding (an inventory, not a single judgment): each pick is a
  // boolean key so it round-trips through autosave; "Nothing formal yet" is the
  // exclusive choice that clears the rest.
  const toggleGround = (q: GroundingQuestion, optId: string) => {
    const key = `_ground:${q.id}:${optId}`;
    const next = { ...answers };
    if (optId === "nothing") {
      const wasOn = !!next[key];
      for (const o of q.options) delete next[`_ground:${q.id}:${o.id}`];
      if (!wasOn) next[key] = "1";
    } else {
      delete next[`_ground:${q.id}:nothing`];
      if (next[key]) delete next[key]; else next[key] = "1";
    }
    persist(next);
  };
  // Priority ranking: tap in order (1, 2, 3…); tap a ranked goal to drop it and the
  // rest renumber; Reset clears. The rank drives the walk order and the brief.
  const currentRank = (): GoalId[] => {
    const raw = answers["_rank"];
    return raw ? (raw.split(",").filter(Boolean) as GoalId[]).filter((g) => authoredAll.includes(g)) : [];
  };
  const toggleRank = (goalId: GoalId) => {
    const rank = currentRank();
    const next = rank.includes(goalId) ? rank.filter((g) => g !== goalId) : [...rank, goalId];
    persist({ ...answers, ["_rank"]: next.join(",") });
  };
  const resetRank = () => persist({ ...answers, ["_rank"]: "" });
  const continueTriage = () => {
    if (pos.kind !== "triage") return;
    const rank = currentRank();
    const ordered = [...rank, ...authoredAll.filter((g) => !rank.includes(g))];
    setOrder(ordered);
    persist({ ...answers, ["_rank"]: rank.join(","), ["_triage"]: rank[0] ?? ordered[0] });
    advance(pos, { kind: "goal", goalIdx: 0, qid: getScript(setting, ordered[0])!.entry });
  };
  const answerGoal = (optId: string) => {
    if (pos.kind !== "goal") return;
    const goal = order[pos.goalIdx];
    const script = getScript(setting, goal)!;
    const opt = script.questions[pos.qid].options.find((o) => o.id === optId);
    if (!opt) return;
    persist({ ...answers, [`${goal}:${pos.qid}`]: optId });
    if (opt.next === BRIEF) {
      if (pos.goalIdx + 1 < order.length) advance(pos, goalEntry(pos.goalIdx + 1), goalTransition(pos.goalIdx + 1));
      else advance(pos, { kind: "brief" });
    } else {
      advance(pos, { kind: "goal", goalIdx: pos.goalIdx, qid: opt.next }, opt.reflect ?? null);
    }
  };
  // A multi-select goal question stores one boolean per chosen option, then Continue
  // advances via the step's shared next (every option on a multi step shares one).
  const toggleGoal = (goal: GoalId, qid: string, optId: string) => {
    const key = `${goal}:${qid}:${optId}`;
    const next = { ...answers };
    if (next[key]) delete next[key]; else next[key] = "1";
    persist(next);
  };
  const continueGoal = () => {
    if (pos.kind !== "goal") return;
    const goal = order[pos.goalIdx];
    const q = getScript(setting, goal)!.questions[pos.qid];
    const nextId = q.options[0]?.next;
    if (nextId === BRIEF) {
      if (pos.goalIdx + 1 < order.length) advance(pos, goalEntry(pos.goalIdx + 1), goalTransition(pos.goalIdx + 1));
      else advance(pos, { kind: "brief" });
    } else if (nextId) {
      advance(pos, { kind: "goal", goalIdx: pos.goalIdx, qid: nextId });
    }
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

  // ── the "what we're hearing" ledger (a progress spine that accumulates) ──────
  // activeIdx marks which goal is being walked: earlier goals collapse to a checked
  // line, later goals show faint. Before any goal (ground/triage) nothing is active.
  const activeIdx = pos.kind === "goal" ? pos.goalIdx : pos.kind === "brief" ? order.length : -1;
  const ledger = buildLedger(setting, ground, order, answers, activeIdx);

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
  let multiSelect = false;
  let selectedIds: string[] = [];
  let onToggle: (id: string) => void = () => {};
  let onContinue: () => void = () => {};
  let rankMode = false;
  let rankOf: (id: string) => number = () => 0;
  let rankCount = 0;

  if (pos.kind === "ground") {
    const q = ground[pos.idx];
    stepEyebrow = q.eyebrow;
    prompt = q.prompt; teach = q.teach; options = q.options;
    if (q.multi) {
      multiSelect = true;
      selectedIds = q.options.filter((o) => answers[`_ground:${q.id}:${o.id}`] === "1").map((o) => o.id);
      onToggle = (id) => toggleGround(q, id);
      onContinue = () => advanceFromGround();
    } else {
      selected = answers[`_ground:${q.id}`];
      onPick = (id) => answerGround(q.id, id);
    }
  } else if (pos.kind === "triage") {
    stepEyebrow = "First, your priorities";
    prompt = "Rank these by what matters most this year.";
    teach = "A good strategy is a choice. Tap in the order that matters; #1 leads the plan and we walk them that way.";
    options = authoredAll.map((g) => ({ id: g, label: goalDisplayLabel(setting, g) }));
    rankMode = true;
    const rank = currentRank();
    rankOf = (id) => { const i = rank.indexOf(id as GoalId); return i < 0 ? 0 : i + 1; };
    rankCount = rank.length;
    onToggle = (id) => toggleRank(id as GoalId);
    onContinue = () => continueTriage();
  } else {
    const goal = order[pos.goalIdx];
    const script = getScript(setting, goal)!;
    const q = script.questions[pos.qid];
    stepEyebrow = q.eyebrow ?? goalDisplayLabel(setting, goal);
    prompt = q.prompt; teach = q.teach ?? ""; options = q.options;
    if (q.multi) {
      multiSelect = true;
      selectedIds = q.options.filter((o) => answers[`${goal}:${pos.qid}:${o.id}`] === "1").map((o) => o.id);
      onToggle = (id) => toggleGoal(goal, pos.qid, id);
      onContinue = () => continueGoal();
    } else {
      selected = answers[`${goal}:${pos.qid}`];
      onPick = (id) => answerGoal(id);
    }
  }

  const contextLabel =
    pos.kind === "goal"
      ? `${settingLabel} · ${goalDisplayLabel(setting, order[pos.goalIdx])}${order.length > 1 ? ` · Priority ${pos.goalIdx + 1} of ${order.length}` : ""}`
      : settingLabel;

  return (
    <div className="max-w-[1080px] mx-auto px-6 py-8 md:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1px_320px] gap-x-[52px] gap-y-8">
        {/* LEFT — the question */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#B4A896] mb-5">{contextLabel}</p>
          {reflect && (
            <div className="mb-6 flex items-center gap-2.5">
              <Check className="w-4 h-4 text-[#EA2C00] flex-shrink-0" strokeWidth={2.5} />
              <p className="text-[14px] text-[#5A5248] leading-snug">{reflect}</p>
            </div>
          )}
          {stepEyebrow && <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-3">{stepEyebrow}</p>}
          <h1 className="font-abridge text-[28px] md:text-[36px] text-[#1A1A1A] leading-[1.13] mb-3">{prompt}</h1>
          {teach && <p className="text-[15px] text-[#5A5248] leading-relaxed max-w-[540px] mb-8">{teach}</p>}

          <div className="border-t border-[#E8E2DA]">
            {options.map((o) => {
              const rnk = rankMode ? rankOf(o.id) : 0;
              const on = rankMode ? rnk > 0 : multiSelect ? selectedIds.includes(o.id) : selected === o.id;
              const pickIt = rankMode || multiSelect ? onToggle : onPick;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => pickIt(o.id)}
                  data-testid={testId(pos, o.id)}
                  aria-pressed={rankMode || multiSelect ? on : undefined}
                  className={`group relative w-full text-left flex items-center gap-4 pl-4 pr-3 py-5 border-b border-[#E8E2DA] transition-all cursor-pointer ${rankMode || multiSelect ? "" : "hover:pl-5"} ${on ? "bg-[#F3EEE7]" : "hover:bg-[#F9F6F1]"}`}
                >
                  {on && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#C4B9A8]" aria-hidden />}
                  <div className="min-w-0 flex-1">
                    <div className={`text-[17px] leading-snug ${on ? "font-semibold text-[#1A1A1A]" : "font-medium text-[#1A1A1A]"}`}>{o.label}</div>
                    {o.teach && <div className="text-[13px] text-[#8C8073] leading-snug mt-1 max-w-[520px]">{o.teach}</div>}
                  </div>
                  {rankMode ? (
                    <span className={`w-[26px] h-[26px] rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 text-[13px] font-bold transition-colors ${rnk > 0 ? "bg-[#8C8073] border-[#8C8073] text-white" : "border-[#CDBFAF] text-transparent group-hover:border-[#8C8073]"}`}>{rnk > 0 ? rnk : "0"}</span>
                  ) : multiSelect ? (
                    <span className={`w-[22px] h-[22px] rounded-[6px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${on ? "bg-[#8C8073] border-[#8C8073]" : "border-[#CDBFAF] group-hover:border-[#8C8073]"}`}>
                      {on && <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.75} />}
                    </span>
                  ) : (
                    <ArrowRight className={`w-5 h-5 flex-shrink-0 transition-all ${on ? "text-[#6E675C]" : "text-[#C9BDAD] group-hover:text-[#8C8073] group-hover:translate-x-1"}`} strokeWidth={1.8} />
                  )}
                </button>
              );
            })}
          </div>
          {(multiSelect || rankMode) && (() => {
            // Rank mode requires EVERY selected goal ranked — so no goal the partner
            // didn't order gets stamped "#N priority" in the brief.
            const blocked = rankMode ? rankCount < authoredAll.length : selectedIds.length === 0;
            const remaining = authoredAll.length - rankCount;
            return (
              <div className="mt-7 flex items-center gap-5">
                <button
                  type="button"
                  onClick={onContinue}
                  disabled={blocked}
                  data-testid={rankMode ? "triage-continue" : "ground-continue"}
                  className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold transition-colors ${blocked ? "bg-[#EFE9E1] text-[#B4A896] cursor-not-allowed" : "bg-[#EA2C00] text-white hover:bg-[#D02700] cursor-pointer"}`}
                >
                  Continue <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </button>
                {rankMode && blocked && rankCount > 0 && (
                  <span className="text-[13px] text-[#B4A896]">Rank {remaining} more to continue</span>
                )}
                {rankMode && rankCount > 0 && (
                  <button type="button" onClick={resetRank} data-testid="triage-reset" className="text-[13px] text-[#B4A896] hover:text-[#8C8073] transition-colors">Reset</button>
                )}
              </div>
            );
          })()}
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

// ── the accumulating ledger (a progress spine) ───────────────────────────────
// Grounding stays as persistent context. Each goal is a section: the one being
// walked is expanded (building live), completed goals collapse to a checked
// headline, and upcoming goals show faint — so the rail stays short and doubles
// as "where am I in the walk."
type LedgerState = "context" | "done" | "active" | "upcoming";
interface LedgerGroup { label: string; items: string[]; state: LedgerState }

function buildLedger(setting: AttainSetting, ground: GroundingQuestion[], order: GoalId[], answers: DiscoveryAnswers, activeIdx: number): LedgerGroup[] {
  const groups: LedgerGroup[] = [];
  const groundItems: string[] = [];
  for (const q of ground) {
    if (q.multi) {
      for (const o of q.options) if (answers[`_ground:${q.id}:${o.id}`] === "1") groundItems.push(o.capture);
    } else {
      const opt = q.options.find((o) => o.id === answers[`_ground:${q.id}`]);
      if (opt) groundItems.push(opt.capture);
    }
  }
  if (groundItems.length) groups.push({ label: "Grounding", items: groundItems, state: "context" });

  order.forEach((goal, i) => {
    const res = resolveResult(setting, goal, answers);
    const items = res?.narrative ?? [];
    const state: LedgerState = i < activeIdx ? "done" : i === activeIdx ? "active" : "upcoming";
    groups.push({ label: goalDisplayLabel(setting, goal), items, state });
  });
  return groups;
}

function Ledger({ groups }: { groups: LedgerGroup[] }) {
  const answered = groups.some((g) => g.items.length);
  return (
    <div className="lg:pt-1">
      <div className="text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#8C8073]">What we're hearing</div>
      {!answered ? (
        <p className="text-[13px] text-[#B4A896] italic mt-4 leading-relaxed">We will assemble the picture here as we go.</p>
      ) : (
        <div className="mt-4 space-y-5">
          {groups.map((g) => {
            // Completed goal: one calm checked line, not its full list.
            if (g.state === "done") {
              return (
                <div key={g.label} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#B0A48F] flex-shrink-0" strokeWidth={2.5} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#B4A896]">{g.label}</span>
                </div>
              );
            }
            // Upcoming goal: faint header only.
            if (g.state === "upcoming") {
              return (
                <div key={g.label} className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#D6CBBA]">{g.label}</div>
              );
            }
            // The active goal: a filled marker + darker header make it clearly "you are
            // here," and a placeholder line orients before the first pick lands.
            if (g.state === "active") {
              return (
                <div key={g.label}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-[6px] h-[6px] rounded-full bg-[#8C8073] flex-shrink-0" />
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#4A4238]">{g.label}</span>
                  </div>
                  {g.items.length ? (
                    <ul className="space-y-2 pl-[14px]">
                      {g.items.map((it, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-[#3A342E]">
                          <span className="mt-[7px] w-[5px] h-[5px] rounded-full flex-shrink-0 bg-[#C4B9A8]" />
                          <span>{cap(it)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-[#C4B9A8] italic leading-snug pl-[14px]">Building as you answer.</p>
                  )}
                </div>
              );
            }
            // Grounding (context): expanded, muted header.
            return (
              <div key={g.label}>
                <div className="text-[10px] font-bold uppercase tracking-[0.06em] mb-2 text-[#B4A896]">{g.label}</div>
                <ul className="space-y-2">
                  {g.items.map((it, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-[#3A342E]">
                      <span className="mt-[7px] w-[5px] h-[5px] rounded-full flex-shrink-0 bg-[#D8CFC0]" />
                      <span>{cap(it)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
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
  const counted = results.filter((r) => r.res?.lever).map((r) => goalDisplayLabel(setting, r.goal));
  const proofs = results.filter((r) => !r.res?.lever && (r.res?.proof || r.script.proofLine) && !r.res?.honest).map((r) => goalDisplayLabel(setting, r.goal));
  const honests = results.filter((r) => r.res?.honest && !r.res?.lever).map((r) => goalDisplayLabel(setting, r.goal));
  const rankBits: string[] = [];
  if (counted.length) rankBits.push(`${listPhrase(counted)} ${counted.length > 1 ? "carry" : "carries"} the near-term dollars`);
  if (proofs.length) rankBits.push(`${listPhrase(proofs)} ${proofs.length > 1 ? "are" : "is"} proof, tracked not counted`);
  if (honests.length) rankBits.push(`${listPhrase(honests)} ${honests.length > 1 ? "are" : "is"} honestly not documentation's to fix`);

  const classOf = (goal: GoalId): "counted" | "proof" | "honest" => {
    const r = results.find((x) => x.goal === goal);
    if (r?.res?.lever) return "counted";
    // A real documentation play survives even when an honest-out was ALSO picked
    // (mirrors the bridge, which stays bridgeProof). Only fall to "honest" when it
    // stands alone — otherwise the pill dot would contradict the bridge + handoff.
    if (r?.res?.proofDriverId || r?.res?.proof) return "proof";
    if (r?.res?.honest) return "honest";
    return "proof";
  };
  const [selected, setSelected] = useState<GoalId>(order[0]);
  const active = order.includes(selected) ? selected : order[0];
  const activeFoundation = briefFoundation(setting, active, settingLabel, answers);

  return (
    <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-8 md:py-12">
      {/* hero — the current/target mirror, then (multi-goal) the one-line read of
          which priority carries the dollars vs. what's tracked as proof. */}
      <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-3">The foundation</p>
      <h1 className="font-abridge text-[32px] md:text-[46px] text-[#1A1A1A] leading-[1.05] mb-4">
        {partner.trim() ? `Where ${partner.trim()} stands today, and where you want to go.` : "Where you are today, and where you want to go."}
      </h1>
      <p className="text-[15.5px] text-[#4A4238] leading-relaxed max-w-[620px]">
        No numbers yet. This is your current picture and your target, in plain terms. Next we size the gap between them, then build the plan to close it.
      </p>
      {order.length > 1 && rankBits.length > 0 && (
        <p className="mt-6 text-[16px] text-[#1A1A1A] leading-relaxed max-w-[840px] font-medium">
          {cap(rankBits.join("; "))}.
        </p>
      )}

      {/* goal pills — shown in ranked priority order, one goal read at a time */}
      {order.length > 1 && (
        <div className="mt-8">
          <p className="text-[10px] font-bold uppercase tracking-[1.6px] text-[#B4A896] mb-3">Your priorities, in order</p>
          <div className="flex flex-wrap gap-2.5">
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
                {goalDisplayLabel(setting, goal)}
              </button>
            );
          })}
          </div>
        </div>
      )}

      {/* the selected goal read */}
      <div className="mt-8">
        <GoalBrief setting={setting} settingLabel={settingLabel} goal={active} answers={answers} rank={order.indexOf(active) + 1} total={order.length} />
      </div>

      {pending.length > 0 && (
        <div className="mt-10 rounded-xl bg-[#FAF7F2] border border-dashed border-[#D8CFC0] px-5 py-4">
          <p className="text-[13px] text-[#8C8073] leading-relaxed">
            {pending.map((g) => goalDisplayLabel(setting, g)).join(", ")}: the discovery for {pending.length > 1 ? "these is" : "this is"} being authored and will join the brief soon.
          </p>
        </div>
      )}

      <div className="mt-12 flex items-center justify-between border-t border-[#E8E2DA] pt-6">
        <button
          type="button"
          onClick={() => { try { window.open("?strategypdf=1&print=1", "_blank"); } catch { /* ignore */ } }}
          data-testid="discovery-download-writeup"
          className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#4A4238] hover:text-[#1A1A1A] transition-colors"
        >
          <Download className="w-4 h-4" /> Download the write-up
        </button>
        <button type="button" onClick={onFinish} data-testid="discovery-build-roi" className="inline-flex items-center gap-2 rounded-xl bg-[#EA2C00] text-white text-[14px] font-semibold px-5 py-2.5 hover:bg-[#d12800] transition-colors">
          {counted.length > 0 ? "Build the ROI on this" : "Take this into the ROI"} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function GoalBrief({
  setting, settingLabel, goal, answers, rank, total,
}: {
  setting: AttainSetting; settingLabel: string; goal: GoalId; answers: DiscoveryAnswers; rank?: number; total?: number;
}) {
  const foundation = briefFoundation(setting, goal, settingLabel, answers);
  if (!foundation) return null;
  // The left column carries a third "where you are" row so it balances the right (3 x 3):
  // multi-goal gets the priority rank (where scale's "today it is" used to sit); single-goal
  // gets "already in place" from grounding, since there's no rank to show.
  const thirdRow: FoundationItem = rank && total && total > 1
    ? { label: "Priority this year", value: `#${rank} of ${total}` }
    : (triedFoundationRow(setting, answers) ?? { label: "", value: "" });
  const current = thirdRow.label ? [...foundation.current, thirdRow] : foundation.current;
  return <FoundationCard settingLabel={settingLabel} goalLabel={goalDisplayLabel(setting, goal)} foundation={{ ...foundation, current }} />;
}

// The "already in place" row for single-goal briefs: what they told us is already
// running (from grounding "tried"), so the left column has a real third row.
function triedFoundationRow(setting: AttainSetting, answers: DiscoveryAnswers): FoundationItem | null {
  const q = groundingQuestions(setting).find((x) => x.id === "tried");
  if (!q) return null;
  const picks = q.options.filter((o) => answers[`_ground:tried:${o.id}`] === "1");
  if (!picks.length) return null;
  if (picks.some((o) => o.id === "nothing")) return { label: "Already in place", value: "Nothing formal yet" };
  return { label: "Already in place", value: picks.map((o) => o.label) };
}

// The foundation read: a current-state / desired-state mirror. Strategy's real
// job, per the reshape — gather where they are and where they want to go, and
// let the honesty fall out of the picture (the bridge), not a verdict.
// The foundation read, de-boxed: no card border, no tinted panel — structure comes
// from typography, whitespace, and one center hairline. Multi-select fields render as
// clean stacked lines, not comma run-ons.
function FoundationCard({ settingLabel, goalLabel, foundation }: { settingLabel: string; goalLabel: string; foundation: FoundationRead }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[1.9px] text-[#8C8073] mb-8">{goalLabel.toLowerCase().startsWith(settingLabel.toLowerCase()) ? goalLabel : `${settingLabel} · ${goalLabel}`}</p>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1px_1fr] gap-x-14 gap-y-10">
        {/* WHERE YOU ARE */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[1.9px] text-[#4A4238] mb-7">Where you are</p>
          <div className="space-y-7">
            {foundation.current.map((it) => (
              <FoundationRow key={it.label} label={it.label} value={it.value} />
            ))}
          </div>
        </div>
        {/* center hairline */}
        <div className="hidden lg:block bg-[#EAE4DB]" />
        {/* WHERE YOU WANT TO GO */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[1.9px] text-[#B78A5A] mb-7">Where you want to go</p>
          <div className="space-y-7">
            {foundation.desired.map((it) => (
              <FoundationRow key={it.label} label={it.label} value={it.value} coral={it.label === foundation.signalLabel} />
            ))}
          </div>
        </div>
      </div>
      {/* the bridge: quiet, hairline-separated — the gap goes to ROI, honesty lives here */}
      <div className="mt-11 pt-6 border-t border-[#EAE4DB] max-w-[880px]">
        <p className="text-[14px] text-[#5A5248] leading-relaxed">
          <span className="font-bold uppercase tracking-[0.08em] text-[#B4A896] text-[10px] mr-2 align-[1px]">Next</span>
          {foundation.bridge}
        </p>
      </div>
    </div>
  );
}

function FoundationRow({ label, value, coral }: { label: string; value: string | string[]; coral?: boolean }) {
  // `coral` marks the success signal — a leading metric, not money or an action, so it
  // gets the warm accent. A multi-select value comes as a list: each pick its own line
  // (capitalized), so it reads as structure, not a comma run-on.
  const items = (Array.isArray(value) ? value : [value]).map((v) => cap(v));
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#B4A896] mb-2">{label}</div>
      <div className="space-y-1.5">
        {items.map((v, i) => (
          <div key={i} className={`text-[16px] leading-snug ${coral ? "text-[#8A6D3B] font-semibold" : "text-[#1A1A1A] font-medium"}`}>{v}</div>
        ))}
      </div>
    </div>
  );
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
  if (pos.kind === "goal") return `discovery-opt-${optId}`; // goal option ids are unique within a question
  return `discovery-${optId}`;
}
