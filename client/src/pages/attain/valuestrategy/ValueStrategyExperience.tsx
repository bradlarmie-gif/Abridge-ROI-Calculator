import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { ArrowRight, ArrowLeft, Check, Download, Plus } from "lucide-react";
import { motion } from "framer-motion";
import {
  AccessGoalArt,
  CapacityGoalArt,
  ExperienceGoalArt,
  MapOutcomeArt,
  QualityGoalArt,
  RetentionGoalArt,
  RevenueGoalArt,
} from "@/pages/hub/hubArt";

// The goal drawings from the "Pick the goals" tiles, reused small in the ledger so
// each section reads as the tile they chose.
const GOAL_ART: Record<GoalId, JSX.Element> = {
  access: <AccessGoalArt />,
  retention: <RetentionGoalArt />,
  revenue: <RevenueGoalArt />,
  quality: <QualityGoalArt />,
  capacity: <CapacityGoalArt />,
  experience: <ExperienceGoalArt />,
};
import { goalDisplayLabel } from "@/lib/attain/attainGoals";
import type { AttainSetting, GoalId } from "@/lib/attain/attainTypes";
import {
  getScript,
  resolveResult,
  briefFoundation,
  groundingQuestions,
  goalNotes,
  groundingNotes,
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
  /** Hand the discovery answers to the ROI side. Stays the secondary exit. */
  onFinish?: () => void;
  /** Carry straight on into the plan. Primary exit once discovery lives inside
   *  the planning walk, so the interview no longer dead-ends at the brief. */
  onContinueToPlan?: () => void;
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
  { setting, settingLabel, goals, partner, initialAnswers, onPersistAnswers, onFinish, onContinueToPlan, onExit },
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
  // The "add it in their words" field opens on demand (or when a note exists).
  const [noteOpen, setNoteOpen] = useState(false);

  useEffect(() => { window.scrollTo({ top: 0 }); setNoteOpen(false); }, [pos]);

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
  const ledger = buildLedger(setting, ground, order, answers, activeIdx, pos.kind === "ground");

  if (pos.kind === "brief") {
    return <Brief setting={setting} settingLabel={settingLabel} partner={partner} order={order} pending={pending} answers={answers} triaged={multi} onFinish={onFinish} onContinueToPlan={onContinueToPlan} />;
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
      onContinue = () => advanceFromGround();
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
      onContinue = () => continueGoal();
    }
  }

  // Every question (goal + grounding, not triage) gets a subtle free-text "add your
  // own" note. It's captured as a concept for us to consider — it shows in the brief
  // and the PDF, but it pins no lever, so it never enters the ROI build.
  const customKey =
    pos.kind === "goal" ? `_note:${order[pos.goalIdx]}:${pos.qid}` :
    pos.kind === "ground" ? `_note:_ground:${ground[pos.idx].id}` :
    null;
  const noteVal = customKey ? (answers[customKey] ?? "") : "";
  const hasNote = !!noteVal.trim();
  const setNote = (v: string) => {
    if (!customKey) return;
    const next = { ...answers };
    if (v.trim()) next[customKey] = v; else delete next[customKey];
    persist(next);
  };
  const showContinue = multiSelect || rankMode || hasNote;
  const continueBlocked = rankMode
    ? rankCount < authoredAll.length
    : multiSelect
      ? (selectedIds.length === 0 && !hasNote)
      : false;

  // One line says where you are: the section, and how far through it.
  const sectionLine =
    pos.kind === "ground"
      ? `Grounding · ${pos.idx + 1} of ${ground.length}`
      : pos.kind === "triage"
        ? "Your priorities"
        : `${goalDisplayLabel(setting, order[pos.goalIdx])}${order.length > 1 ? ` · priority ${pos.goalIdx + 1} of ${order.length}` : ""}${stepEyebrow && stepEyebrow !== goalDisplayLabel(setting, order[pos.goalIdx]) ? ` · ${stepEyebrow}` : ""}`;
  const pickHint = rankMode ? "Tap in order of priority." : multiSelect ? "Pick any that apply." : "Pick one.";

  return (
    <div className="max-w-[1080px] mx-auto px-6 py-8 md:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1px_320px] gap-x-[52px] gap-y-8">
        {/* LEFT — the question */}
        <div>

          {reflect && (
            <div className="mb-6 flex items-center gap-2.5">
              <Check className="w-4 h-4 text-[#EA2C00] flex-shrink-0" strokeWidth={2.5} />
              <p className="text-[14px] text-[#5A5248] leading-snug">{reflect}</p>
            </div>
          )}
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-3" data-testid="discovery-section">{sectionLine}</p>
          <h1 className="font-abridge text-[28px] md:text-[36px] text-[#1A1A1A] leading-[1.13] mb-3">{prompt}</h1>
          {teach && <p className="text-[15px] text-[#565250] leading-relaxed max-w-[560px]">{teach}</p>}
          <p className="text-[12.5px] font-bold text-[#443A32] mt-4 mb-4">{pickHint}</p>

          {/* Answers as rounded tan options. The marker says how to answer: a
              circle is pick one, a square is pick any, a number is a rank. The
              chosen answer turns coral. */}
          <div className="flex flex-col gap-2.5">
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
                  className={`group relative w-full text-left flex items-center gap-4 rounded-[16px] border px-4 py-4 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-2 ${
                    on
                      ? "bg-[#FDF6F2] border-[#EA2C00] ring-1 ring-[#EA2C00]"
                      : "bg-[#F6F1EA]/90 border-[#E9E0D4] hover:border-[#D9CDBD] hover:bg-[#F3EDE4]"
                  }`}
                >
                  {rankMode ? (
                    <span className={`w-[26px] h-[26px] rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 text-[13px] font-bold transition-colors ${rnk > 0 ? "bg-[#EA2C00] border-[#EA2C00] text-white" : "bg-white border-[#CDBFAF] text-transparent group-hover:border-[#8C8073]"}`}>{rnk > 0 ? rnk : "0"}</span>
                  ) : multiSelect ? (
                    <span className={`w-[22px] h-[22px] rounded-[6px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${on ? "bg-[#EA2C00] border-[#EA2C00]" : "bg-white border-[#CDBFAF] group-hover:border-[#8C8073]"}`}>
                      {on && <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.75} />}
                    </span>
                  ) : (
                    <span className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${on ? "border-[#EA2C00]" : "bg-white border-[#CDBFAF] group-hover:border-[#8C8073]"}`}>
                      {on && <span className="w-[10px] h-[10px] rounded-full bg-[#EA2C00]" />}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[16.5px] leading-snug font-medium text-[#1A1A1A]">{o.label}</div>
                    {o.teach && <div className="text-[13px] text-[#565250] leading-snug mt-1 max-w-[520px]">{o.teach}</div>}
                  </div>
                  {/* A pick-one answer moves on as soon as it is tapped; the arrow says so. */}
                  {!rankMode && !multiSelect && (
                    <ArrowRight className={`w-[18px] h-[18px] flex-shrink-0 transition-all ${on ? "text-[#EA2C00]" : "text-[#C9BDAD] group-hover:text-[#EA2C00] group-hover:translate-x-1"}`} strokeWidth={1.8} />
                  )}
                </button>
              );
            })}
          </div>
          {customKey && (noteOpen || hasNote ? (
            <input
              type="text"
              value={noteVal}
              autoFocus={noteOpen && !hasNote}
              onChange={(e) => setNote(e.target.value)}
              data-testid="discovery-note-input"
              placeholder="In their words. A note for us, not the ROI."
              className="mt-4 w-full rounded-[14px] bg-white border border-[#E2D8CB] focus:border-[#EA2C00] px-4 py-3 text-[15px] text-[#1A1A1A] placeholder:text-[#B5AA9B] outline-none transition-colors"
            />
          ) : (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              data-testid="discovery-note-open"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-dashed border-[#D6CABA] px-4 py-2 text-[13px] font-semibold text-[#6B6259] hover:border-[#EA2C00] hover:text-[#EA2C00] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add it in their words
            </button>
          ))}
          {showContinue && (
            <div className="mt-7 flex items-center gap-5">
              <button
                type="button"
                onClick={onContinue}
                disabled={continueBlocked}
                data-testid={rankMode ? "triage-continue" : "ground-continue"}
                className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold transition-colors ${continueBlocked ? "bg-[#EFE9E1] text-[#B4A896] cursor-not-allowed" : "bg-[#EA2C00] text-white hover:bg-[#D02700] cursor-pointer"}`}
              >
                Continue <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </button>
              {rankMode && continueBlocked && rankCount > 0 && (
                <span className="text-[13px] text-[#B4A896]">Rank {authoredAll.length - rankCount} more to continue</span>
              )}
              {rankMode && rankCount > 0 && (
                <button type="button" onClick={resetRank} data-testid="triage-reset" className="text-[13px] text-[#B4A896] hover:text-[#8C8073] transition-colors">Reset</button>
              )}
            </div>
          )}
        </div>

        {/* vertical hairline */}
        <div className="hidden lg:block bg-[#E8E2DA]" />

        {/* RIGHT — what we're hearing */}
        <Ledger groups={ledger} partner={partner} />
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
interface LedgerGroup { label: string; items: string[]; notes: string[]; state: LedgerState; goal?: GoalId; keepItems?: boolean }

function buildLedger(setting: AttainSetting, ground: GroundingQuestion[], order: GoalId[], answers: DiscoveryAnswers, activeIdx: number, inGround: boolean): LedgerGroup[] {
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
  const gNotes = groundingNotes(setting, answers);
  // Grounding is always listed so the card shows its whole shape from question one.
  groups.push({ label: "Grounding", items: groundItems, notes: gNotes, state: inGround ? "active" : "done", goal: undefined, keepItems: true });

  order.forEach((goal, i) => {
    const res = resolveResult(setting, goal, answers);
    const items = res?.narrative ?? [];
    const state: LedgerState = i < activeIdx ? "done" : i === activeIdx ? "active" : "upcoming";
    groups.push({ label: goalDisplayLabel(setting, goal), items, notes: goalNotes(setting, goal, answers), state, goal });
  });
  return groups;
}

/**
 * "What we're hearing": a live notes card. Every section is laid out from the
 * first question (Grounding, then one per goal, each with that goal's drawing), so
 * the card is never blank and doubles as "where am I". New lines arrive coral and
 * settle to ink. Finished sections get a check; Grounding keeps its lines because
 * every later section leans on them.
 */
function Ledger({ groups, partner }: { groups: LedgerGroup[]; partner: string }) {
  return (
    <div className="lg:pt-1">
      <div className="rounded-[20px] border border-[#E9E0D4] bg-[#FDFBF8] shadow-[0_1px_2px_rgba(26,26,26,0.04),0_10px_28px_-18px_rgba(26,26,26,0.16)] overflow-hidden lg:sticky lg:top-24">
        <div className="px-5 py-4 bg-[#F6F1EA]/80 border-b border-[#E6DCCF]">
          <div className="text-[10.5px] font-extrabold tracking-[0.1em] uppercase text-[#EA2C00]">What we&rsquo;re hearing</div>
          {partner.trim() && <div className="font-abridge text-[18px] text-[#1A1A1A] mt-0.5 truncate">{cap(partner.trim())}</div>}
        </div>
        <div className="divide-y divide-[#EFE8DE]">
          {groups.map((g) => {
            const done = g.state === "done";
            const active = g.state === "active";
            const upcoming = g.state === "upcoming";
            const showItems = active || (done && g.keepItems);
            return (
              <div key={g.label} className={`px-5 py-4 transition-opacity ${upcoming ? "opacity-55" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex-none w-[46px] h-[30px] rounded-[8px] border px-1 py-0.5 ${active ? "border-[#F0CDBF] bg-[#FBEDE6]" : "border-[#E6DCCE] bg-[#EFE7DC]/70"}`}>
                    {g.goal ? GOAL_ART[g.goal] : <MapOutcomeArt />}
                  </div>
                  <span className={`flex-1 min-w-0 text-[11px] font-extrabold uppercase tracking-[0.07em] ${active ? "text-[#1A1A1A]" : "text-[#6B6259]"}`}>{g.label}</span>
                  {done && (
                    <span className="flex-none w-5 h-5 rounded-full bg-[#EA2C00] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </span>
                  )}
                  {active && <span className="flex-none text-[10px] font-bold uppercase tracking-[0.08em] text-[#EA2C00]">Now</span>}
                </div>
                {showItems && (g.items.length || g.notes.length) ? (
                  <ul className="mt-3 space-y-2 pl-[58px]">
                    {g.items.map((it, i) => (
                      <motion.li
                        key={`${g.label}:${it}`}
                        initial={{ opacity: 0, y: 6, color: "#EA2C00" }}
                        animate={{ opacity: 1, y: 0, color: "#3A342E" }}
                        transition={{ duration: 0.35, color: { duration: 1.6, delay: 0.3 } }}
                        className="text-[13.5px] leading-snug"
                      >
                        {cap(it)}
                      </motion.li>
                    ))}
                    {g.notes.length > 0 && <li><NoteLines notes={g.notes} /></li>}
                  </ul>
                ) : active ? (
                  <p className="mt-2.5 pl-[58px] text-[12.5px] text-[#9A8F82]">Building as they answer.</p>
                ) : upcoming ? (
                  <p className="mt-1.5 pl-[58px] text-[12px] text-[#9A8F82]">Coming up</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Free-text notes in the customer's own words — shown in the ledger under their
// section. Quiet italic, quoted, so they read as asides to consider, not counted picks.
function NoteLines({ notes, pad }: { notes: string[]; pad?: boolean }) {
  if (!notes.length) return null;
  return (
    <ul className={`space-y-1.5 ${pad ? "pl-[14px] mt-2" : ""}`}>
      {notes.map((n, i) => (
        <li key={i} className="text-[13px] leading-snug text-[#8C8073] italic">&ldquo;{n}&rdquo;</li>
      ))}
    </ul>
  );
}

// ── the synthesized brief ────────────────────────────────────────────────────
function Brief({
  setting, settingLabel, partner, order, pending, answers, triaged, onFinish, onContinueToPlan,
}: {
  setting: AttainSetting; settingLabel: string; partner: string; order: GoalId[];
  pending: GoalId[]; answers: DiscoveryAnswers; triaged: boolean;
  onFinish?: () => void; onContinueToPlan?: () => void;
}) {
  const results = order.map((goal) => ({ goal, script: getScript(setting, goal)!, res: resolveResult(setting, goal, answers) }));

  // cross-goal ranking sentence. Classify the same way the pill dots do: a real
  // documentation play (proofDriverId/proof/proofLine) counts as PROOF even when an
  // honest-out was also picked — only a pure honest-out lands in "not ours to fix".
  const isCounted = (r: typeof results[number]) => !!r.res?.lever;
  const isProof = (r: typeof results[number]) => !isCounted(r) && !!(r.res?.proofDriverId || r.res?.proof || r.script.proofLine);
  const isHonest = (r: typeof results[number]) => !isCounted(r) && !isProof(r) && !!r.res?.honest;
  const counted = results.filter(isCounted).map((r) => goalDisplayLabel(setting, r.goal));
  const proofs = results.filter(isProof).map((r) => goalDisplayLabel(setting, r.goal));
  const honests = results.filter(isHonest).map((r) => goalDisplayLabel(setting, r.goal));
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
  const downloadWriteup = () => { try { window.open("?strategypdf=1&print=1", "_blank"); } catch { /* ignore */ } };
  const gNotes = groundingNotes(setting, answers);

  return (
    <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-8 md:py-12">
      {/* hero — the current/target mirror, then (multi-goal) the one-line read of
          which priority carries the dollars vs. what's tracked as proof. */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[#EA2C00] pt-1">
          The foundation{partner.trim() ? ` · ${cap(partner.trim())}` : ""}
        </p>
        <button
          type="button"
          onClick={downloadWriteup}
          data-testid="discovery-download-writeup"
          className="inline-flex items-center gap-2 rounded-full border border-[#D8CFC0] px-4 py-2 text-[13px] font-semibold text-[#4A4238] hover:border-[#B4A896] hover:bg-[#FAF7F2] transition-colors flex-shrink-0"
        >
          <Download className="w-4 h-4" /> Download the write-up
        </button>
      </div>
      <p className="text-[14.5px] text-[#565250] leading-relaxed max-w-[620px]">
        No numbers yet. This is your current picture and your target, in plain terms. Next we size the gap between them, then build the plan to close it.
      </p>
      {order.length > 1 && rankBits.length > 0 && (
        <p className="mt-5 text-[15.5px] text-[#1A1A1A] leading-relaxed max-w-[840px] font-medium">
          {cap(rankBits.join("; "))}.
        </p>
      )}

      {/* goal pills — shown in ranked priority order, one goal read at a time */}
      {order.length > 1 && (
        <div className="mt-8">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[#443A32] mb-3">Your priorities, in order</p>
          {/* One drawn tab per goal, in priority order. The small line under the
              name says what kind of value it is, the same three-way split as the
              sentence above (dollars / proof / not documentation's to fix). */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {order.map((goal, i) => {
            const on = goal === active;
            const c = classOf(goal);
            const kind = c === "counted" ? "Carries the dollars" : c === "proof" ? "Proof, tracked" : "Not documentation's to fix";
            return (
              <button
                key={goal}
                type="button"
                onClick={() => setSelected(goal)}
                data-testid={`brief-pill-${goal}`}
                aria-pressed={on}
                className={`group flex items-center gap-3 rounded-[16px] border p-2 pr-4 text-left transition-all ${
                  on ? "bg-[#FDF6F2] border-[#EA2C00] ring-1 ring-[#EA2C00]" : "bg-[#F6F1EA]/90 border-[#E9E0D4] hover:border-[#D9CDBD] hover:-translate-y-0.5"
                }`}
              >
                <span className={`flex-none w-[64px] h-[42px] rounded-[10px] border px-1 py-0.5 ${on ? "border-[#F0CDBF] bg-[#FBEDE6]" : "border-[#E6DCCE] bg-[#EFE7DC]/70"}`}>
                  {GOAL_ART[goal]}
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#6B6259]">#{i + 1}</span>
                  <span className="block text-[14.5px] font-semibold text-[#1A1A1A] leading-tight truncate">{goalDisplayLabel(setting, goal)}</span>
                  <span className={`block text-[11.5px] mt-0.5 ${c === "counted" ? "text-[#EA2C00] font-semibold" : "text-[#6B6259]"}`}>{kind}</span>
                </span>
              </button>
            );
          })}
          </div>
        </div>
      )}

      {gNotes.length > 0 && (
        <div className="mt-8">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[#443A32] mb-3">In your words · on the ground</p>
          <ul className="space-y-2 max-w-[880px]">
            {gNotes.map((n, i) => (
              <li key={i} className="text-[15px] leading-snug text-[#5A5248] italic">&ldquo;{n}&rdquo;</li>
            ))}
          </ul>
        </div>
      )}

      {/* the selected goal read */}
      <div className="mt-10">
        <GoalBrief setting={setting} settingLabel={settingLabel} goal={active} answers={answers} rank={order.indexOf(active) + 1} total={order.length} />
      </div>

      {pending.length > 0 && (
        <div className="mt-10 rounded-xl bg-[#FAF7F2] border border-dashed border-[#D8CFC0] px-5 py-4">
          <p className="text-[13px] text-[#8C8073] leading-relaxed">
            {pending.map((g) => goalDisplayLabel(setting, g)).join(", ")}: the discovery for {pending.length > 1 ? "these is" : "this is"} being authored and will join the brief soon.
          </p>
        </div>
      )}

      {/* Two exits, deliberately unequal. Discovery now sits inside the planning
          walk, so carrying on into the plan is the path; the ROI hand-off is the
          same one-click it always was, kept as the quieter option beside it. */}
      <div className="mt-12 flex flex-wrap items-center justify-end gap-x-7 gap-y-3 border-t border-[#E8E2DA] pt-6">
        {/* Both handlers required: a mount without the ROI hand-off (the deep-link
            attain route) would otherwise render a button wired to nothing. */}
        {onContinueToPlan && onFinish && (
          <button type="button" onClick={onFinish} data-testid="discovery-build-roi" className="text-[13.5px] font-semibold text-[#8C8073] underline underline-offset-4 decoration-[#D8CFC0] hover:text-[#EA2C00] hover:decoration-[#EA2C00] transition-colors">
            {counted.length > 0 ? "or build the ROI on this" : "or take this into the ROI"}
          </button>
        )}
        <button
          type="button"
          onClick={onContinueToPlan ?? onFinish}
          data-testid={onContinueToPlan ? "discovery-continue-to-plan" : "discovery-build-roi"}
          className="inline-flex items-center gap-2 rounded-full bg-[#EA2C00] text-white text-[14px] font-bold px-6 py-3 hover:bg-[#d12800] transition-colors"
        >
          {onContinueToPlan ? "Continue to the plan" : counted.length > 0 ? "Build the ROI on this" : "Take this into the ROI"} <ArrowRight className="w-4 h-4" />
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
  // Context (where it lives, what's already in place, the rank) is background to
  // the story, so it rides as small chips under the three cards.
  const tried = triedFoundationRow(setting, answers);
  const context: string[] = [];
  const scopeItem = foundation.current.length > 1 ? foundation.current[0] : null;
  if (scopeItem) context.push(...(Array.isArray(scopeItem.value) ? scopeItem.value : [scopeItem.value]).map(cap));
  if (tried) {
    const vals = Array.isArray(tried.value) ? tried.value : [tried.value];
    context.push(...vals.map((v) => (v === "Nothing formal yet" ? "Nothing formal in place yet" : `${cap(v)} in place`)));
  }
  if (rank && total && total > 1) context.push(`Priority #${rank} of ${total} this year`);
  const notes = goalNotes(setting, goal, answers);
  return (
    <>
      <FoundationCard settingLabel={settingLabel} goalLabel={goalDisplayLabel(setting, goal)} foundation={foundation} context={context} />
      {notes.length > 0 && (
        <div className="mt-8 pt-6 border-t border-[#EAE4DB] max-w-[880px]">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-[#443A32] mb-3">In your words · a note for us, not the ROI</p>
          <ul className="space-y-2">
            {notes.map((n, i) => (
              <li key={i} className="text-[15px] leading-snug text-[#5A5248] italic">&ldquo;{n}&rdquo;</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
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
const asList = (v: string | string[] | undefined) => (v == null ? [] : Array.isArray(v) ? v : [v]);
// Items that already contain "and" get a comma before the joining "and", so
// "a referral and new-patient backlog, and long waits" never reads as one blur.
const phrase = (xs: string[]) => {
  if (xs.length <= 1) return xs[0] ?? "";
  const glue = xs.some((x) => / and /.test(x)) ? ", and " : " and ";
  return xs.length === 2 ? `${xs[0]}${glue}${xs[1]}` : `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;
};
const lower1 = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/**
 * The foundation as a one-glance story, built only from their answers and the
 * script's own bridge text: a headline that is their problem and their target,
 * then today → what has to change → how you'll know, then the context as chips.
 */
function FoundationCard({ settingLabel, goalLabel, foundation, context }: { settingLabel: string; goalLabel: string; foundation: FoundationRead; context: string[] }) {
  const gapItem = foundation.current[foundation.current.length - 1];
  const gaps = foundation.current.length > 1 || gapItem?.label !== "Concentrated in" ? asList(gapItem?.value) : [];
  const horizon = foundation.desired.find((d) => d.label === "On what timeframe");
  const signal = foundation.desired.find((d) => d.label === foundation.signalLabel);
  const target = foundation.desired.find((d) => d !== horizon && d !== signal);
  const targets = asList(target?.value);
  const signals = asList(signal?.value);
  // The bridge's first sentence is the point; the rest is the detail under it.
  // Every bridge opens with the same scaffolding sentence ("The gap between these
  // is what the ROI sizes next..."), which the intro already says. Drop it, and
  // lead with the first sentence that is specific to this goal.
  const sentences = foundation.bridge.split(/(?<=[.!?])\s+/).filter(Boolean);
  const specific = sentences.filter((x) => !/^The gap between these\b/i.test(x));
  const lead = specific[0] ?? foundation.bridge;
  const rest = specific.slice(1).join(" ");
  const crumb = goalLabel.toLowerCase().startsWith(settingLabel.toLowerCase()) ? goalLabel : `${settingLabel} · ${goalLabel}`;

  const Card = ({ n, title, children, accent }: { n: string; title: string; children: React.ReactNode; accent?: boolean }) => (
    <div className={`h-full rounded-[20px] border p-6 ${accent ? "bg-white border-[#E9E0D4] border-t-[3px] border-t-[#EA2C00] shadow-[0_1px_2px_rgba(26,26,26,0.04),0_10px_28px_-18px_rgba(26,26,26,0.16)]" : "bg-[#F6F1EA]/90 border-[#E9E0D4]"}`}>
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#443A32] mb-4">
        <span className="font-abridge text-[12px] text-[#AE9F8C] mr-2">{n}</span>
        {title}
      </p>
      {children}
    </div>
  );
  const Arrow = () => (
    <div className="hidden lg:flex items-center justify-center">
      <span className="w-8 h-8 rounded-full bg-white border border-[#E2D8CB] text-[#EA2C00] flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(26,26,26,0.12)]">
        <ArrowRight className="w-4 h-4" />
      </span>
    </div>
  );

  return (
    <div>
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#6B6259]">{crumb}</p>
      {gaps.length > 0 ? (
        <h1 className="font-abridge text-[30px] md:text-[40px] leading-[1.1] text-[#1A1A1A] mt-2 max-w-[960px] text-balance">
          Today: {phrase(gaps.map(lower1))}.
        </h1>
      ) : (
        <h1 className="font-abridge text-[30px] md:text-[40px] leading-[1.1] text-[#1A1A1A] mt-2">Where you are, and where you want to go.</h1>
      )}
      {targets.length > 0 && (
        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-2 max-w-[960px]">
          <p className="text-[18px] md:text-[20px] leading-snug text-[#565250] text-balance">
            {/* The target's own label ("Where the freed slots go", "The change you
                want"), so the line always says exactly what was asked. */}
            <span className="font-semibold text-[#EA2C00]">{target!.label === "The change you want" ? "The goal" : target!.label}:</span>{" "}
            {phrase(targets.map(lower1))}.
          </p>
          {horizon && (
            <span className="rounded-full bg-[#F6F1EA] border border-[#E2D8CB] px-3 py-1 text-[12.5px] font-semibold text-[#443A32]">
              {cap(String(horizon.value))}
            </span>
          )}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_36px_1.25fr_36px_1fr] items-stretch gap-y-3">
        <Card n="01" title="Today">
          <ul className="space-y-2.5">
            {gaps.map((g) => (
              <li key={g} className="text-[16px] font-medium leading-snug text-[#1A1A1A]">{cap(g)}</li>
            ))}
          </ul>
        </Card>
        <Arrow />
        <Card n="02" title="What has to change" accent>
          <p className="text-[17px] font-semibold leading-snug text-[#1A1A1A] text-pretty">{lead}</p>
          {rest && <p className="mt-3 text-[13.5px] leading-relaxed text-[#565250]">{rest}</p>}
        </Card>
        <Arrow />
        <Card n="03" title="How you'll know">
          <ul className="space-y-2.5">
            {signals.map((v) => (
              <li key={v} className="flex items-start gap-2 text-[16px] font-medium leading-snug text-[#1A1A1A]">
                <span className="mt-[8px] w-[6px] h-[6px] rounded-full bg-[#EA2C00] flex-none" />
                <span>{cap(v)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {context.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#6B6259] mr-1">The context</span>
          {context.map((c) => (
            <span key={c} className="rounded-full border border-[#E2D8CB] bg-white px-3 py-1 text-[12.5px] font-semibold text-[#443A32]">{c}</span>
          ))}
        </div>
      )}
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
