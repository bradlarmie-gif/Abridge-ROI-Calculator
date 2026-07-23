import { useState } from "react";
import { Check } from "lucide-react";

/**
 * THROWAWAY comparison page (reachable at `?alignpreview=1`) so the product
 * owner can pick an option-selection style for the Align/Plan surfaces. Delete
 * after a style is chosen. It renders the SAME real Align content in three
 * genuinely-different premium treatments, each anchored in THIS app's own
 * visual language (cream #F4F0EA grounds, #E7E0D6 hairlines, dark #1A1A1A
 * numbered badges, coral #EA2C00 accents, soft-coral #FFF6F3 selected state).
 * Self-contained: no engine, DB, or auth, so it always renders.
 */

interface PreviewOption {
  id: string;
  label: string;
  helper: string;
}

const Q_OUTCOME = {
  eyebrow: "Question 1 of 2",
  prompt: "What are you really after?",
  helper: "All three run on the same freed time. This sets the framing.",
  options: [
    { id: "backlog", label: "Burn down the backlog", helper: "Work through the patients already referred and waiting to be seen." },
    { id: "wait", label: "Cut the wait for a new appointment", helper: "Get a new patient in sooner, so the time to the next open slot drops." },
    { id: "grow", label: "Open room to grow", helper: "Create durable new capacity to take on more patients over time." },
  ] as PreviewOption[],
  defaultSelected: "wait",
};

const Q_WHO = {
  eyebrow: "Question 2 of 2",
  prompt: "Who is this for?",
  helper: "Your provider count carries over from Starting Point. Pick the cut.",
  options: [
    { id: "all", label: "All lines and providers", helper: "All 40 providers on your starting-point count, not broken out by a specific line." },
    { id: "focused", label: "A focused set", helper: "Specific lines or providers you want to open access for first." },
  ] as PreviewOption[],
  defaultSelected: "all",
};

// ── Shared question header, identical across the three styles ────────────────

function QuestionHeader({ eyebrow, prompt, helper }: { eyebrow: string; prompt: string; helper: string }) {
  return (
    <div className="mb-4">
      <div className="mb-2">
        <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#EA2C00]">{eyebrow}</span>
      </div>
      <h3 className="text-[20px] md:text-[22px] font-bold text-[#1A1A1A] leading-snug mb-1.5">{prompt}</h3>
      <p className="text-[14px] text-[#8C8C8C] leading-relaxed max-w-[600px]">{helper}</p>
    </div>
  );
}

// ── STYLE A — EDITORIAL LIST ────────────────────────────────────────────────
// No per-option boxes. Full-width rows on thin hairline dividers; selected gets
// a coral left-accent bar + coral title + a coral check on the right.

function StyleAQuestion({ q }: { q: typeof Q_OUTCOME }) {
  const [selected, setSelected] = useState(q.defaultSelected);
  return (
    <div>
      <QuestionHeader eyebrow={q.eyebrow} prompt={q.prompt} helper={q.helper} />
      <div className="border-t border-[#EFEAE1]">
        {q.options.map((option) => {
          const isSel = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelected(option.id)}
              aria-pressed={isSel}
              className="group relative w-full text-left pl-5 pr-3 py-4 border-b border-[#EFEAE1] transition-colors duration-200 hover:bg-[#FBFAF7]"
            >
              {isSel && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#EA2C00]" aria-hidden />}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className={`text-[16px] leading-snug ${isSel ? "font-semibold text-[#EA2C00]" : "font-medium text-[#1A1A1A]"}`}>
                    {option.label}
                  </p>
                  <p className="text-[13px] text-[#8C8C8C] leading-snug mt-1 max-w-[560px]">{option.helper}</p>
                </div>
                {isSel && (
                  <Check className="w-[18px] h-[18px] text-[#EA2C00] flex-shrink-0 mt-0.5" strokeWidth={2.75} aria-hidden />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── STYLE B — MINIMAL TILES ─────────────────────────────────────────────────
// Borderless tiles on a subtle cream ground with generous whitespace; no hard
// edges when unselected. Selected = soft coral tint fill + coral title + check.

function StyleBQuestion({ q }: { q: typeof Q_OUTCOME }) {
  const [selected, setSelected] = useState(q.defaultSelected);
  const cols = q.options.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3";
  return (
    <div>
      <QuestionHeader eyebrow={q.eyebrow} prompt={q.prompt} helper={q.helper} />
      <div className={`grid grid-cols-1 ${cols} gap-2 rounded-2xl bg-[#F4F0EA] p-2.5`}>
        {q.options.map((option) => {
          const isSel = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelected(option.id)}
              aria-pressed={isSel}
              className={`group h-full text-left rounded-xl p-5 transition-all duration-200 ${
                isSel ? "bg-[#FFF6F3] shadow-[0_1px_2px_rgba(234,44,0,0.06)]" : "bg-transparent hover:bg-white/60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-[15px] leading-snug ${isSel ? "font-semibold text-[#EA2C00]" : "font-medium text-[#1A1A1A]"}`}>
                    {option.label}
                  </p>
                  <p className="text-[13px] text-[#8C8C8C] leading-snug mt-1.5">{option.helper}</p>
                </div>
                <span
                  className={`mt-px flex-shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center transition-all ${
                    isSel ? "bg-[#EA2C00]" : "border border-[#D8CFC4] group-hover:border-[#B4B4B4]"
                  }`}
                  aria-hidden
                >
                  {isSel && <Check className="w-[11px] h-[11px] text-white" strokeWidth={2.75} />}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── STYLE C — APP FAMILY (numbered dark badge + scorecard row) ───────────────
// Reads as the same family as the rest of the app: the dark #1A1A1A index badge
// from the measurement chain, two-line rows on a cream ground, a right-aligned
// selectable control. Selected row lifts to soft coral (#FFF6F3 / #F3C9BE), and
// its badge turns coral, exactly like the app's selected surfaces.

const C_INDEX = ["A", "B", "C", "D", "E"];

function StyleCQuestion({ q }: { q: typeof Q_OUTCOME }) {
  const [selected, setSelected] = useState(q.defaultSelected);
  return (
    <div>
      <QuestionHeader eyebrow={q.eyebrow} prompt={q.prompt} helper={q.helper} />
      <div className="rounded-2xl border border-[#E7E0D6] bg-[#F4F0EA] p-2.5 space-y-2">
        {q.options.map((option, i) => {
          const isSel = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelected(option.id)}
              aria-pressed={isSel}
              className={`group w-full text-left rounded-xl border px-4 py-3.5 transition-all duration-200 ${
                isSel ? "border-[#F3C9BE] bg-[#FFF6F3]" : "border-transparent bg-white hover:border-[#E7E0D6]"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <span
                  className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-[12px] font-bold text-white font-abridge transition-colors ${
                    isSel ? "bg-[#EA2C00]" : "bg-[#1A1A1A]"
                  }`}
                  aria-hidden
                >
                  {C_INDEX[i]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-[15px] leading-snug ${isSel ? "font-semibold text-[#EA2C00]" : "font-semibold text-[#1A1A1A]"}`}>
                    {option.label}
                  </p>
                  <p className="text-[12.5px] text-[#8C8C8C] leading-snug mt-0.5">{option.helper}</p>
                </div>
                <span
                  className={`flex-shrink-0 flex items-center justify-center w-[22px] h-[22px] rounded-full transition-all ${
                    isSel ? "bg-[#EA2C00]" : "border border-[#D8CFC4] group-hover:border-[#B4B4B4]"
                  }`}
                  aria-hidden
                >
                  {isSel && <Check className="w-[12px] h-[12px] text-white" strokeWidth={2.75} />}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Style section scaffold ───────────────────────────────────────────────────

function StyleSection({
  letter,
  title,
  blurb,
  children,
}: {
  letter: string;
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-16">
      <div className="flex items-baseline gap-4 mb-1">
        <span className="text-[40px] font-bold text-[#1A1A1A] font-abridge leading-none">STYLE {letter}</span>
        <span className="text-[18px] font-semibold text-[#EA2C00]">{title}</span>
      </div>
      <p className="text-[13px] text-[#8C8C8C] leading-relaxed max-w-[640px] mb-7">{blurb}</p>
      <div className="rounded-2xl border border-[#E7E0D6] bg-white p-7 md:p-9 space-y-10">{children}</div>
    </section>
  );
}

export default function AlignStylePreview() {
  return (
    <div className="min-h-screen bg-[#F4F0EA] py-14 px-4">
      <div className="max-w-[820px] mx-auto">
        <div className="mb-14">
          <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#EA2C00]">Throwaway comparison</span>
          <h1 className="text-[32px] md:text-[38px] font-bold text-[#1A1A1A] leading-tight mt-2">
            Pick an Align option style
          </h1>
          <p className="text-[15px] text-[#8C8C8C] leading-relaxed max-w-[640px] mt-3">
            The same real Align content in three premium treatments, each drawn from this app's own visual language.
            Every style shows a three-option question and a two-option question, with one option pre-selected so the
            selected state is visible. Nothing here touches the live flow.
          </p>
        </div>

        <StyleSection
          letter="A"
          title="Editorial list"
          blurb="No boxes at all. Options are full-width rows on thin hairline dividers. Selection reads as a coral left-accent bar, a coral title, and a small coral check on the right. Refined and quiet, like a well-set page."
        >
          <StyleAQuestion q={Q_OUTCOME} />
          <StyleAQuestion q={Q_WHO} />
        </StyleSection>

        <StyleSection
          letter="B"
          title="Minimal tiles"
          blurb="Borderless tiles on a subtle cream ground with generous whitespace. No hard edges when unselected. Selection fills with a soft coral tint plus a coral title and check. Airy and calm."
        >
          <StyleBQuestion q={Q_OUTCOME} />
          <StyleBQuestion q={Q_WHO} />
        </StyleSection>

        <StyleSection
          letter="C"
          title="Numbered rows (app family)"
          blurb="The same family as the rest of the app. Each option carries the dark index badge from the measurement chain, a two-line row, and a right-aligned selector. The selected row lifts to soft coral and its badge turns coral, exactly like the surfaces you already like."
        >
          <StyleCQuestion q={Q_OUTCOME} />
          <StyleCQuestion q={Q_WHO} />
        </StyleSection>
      </div>
    </div>
  );
}
