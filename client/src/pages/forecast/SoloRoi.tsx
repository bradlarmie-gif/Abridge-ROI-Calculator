import { useState } from "react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { useCountUp } from "@/hooks/useCountUp";
import { soloModel, SOLO_HAIRCUT, type PayModel } from "./soloModel";

/**
 * One provider, working out their own return.
 *
 * The commercial case this exists for: some organisations make their providers
 * pay for Abridge themselves. That provider is not evaluating it for a group,
 * they are asking "what do I get for what I am paying". So unlike the practice
 * walk there is no goal picking and no driver catalogue: everything that
 * matters to one outpatient doctor is on one screen, and every figure moves as
 * they change it.
 *
 * The point is that they UNDERSTAND it, so the chain is shown rather than the
 * conclusion: minutes off a note become hours, hours become patients only if
 * they choose to spend them that way, and fuller notes move the wRVUs on the
 * visits they already do. The slider is the teaching device: it makes the
 * trade-off between "an earlier finish" and "more patients" explicit, because
 * the same hour cannot be both.
 *
 * Three things this screen learned the hard way:
 *
 *  1. It promised that everything moves, and then kept the money four blocks
 *     below the fold. Nothing visibly happened while they filled it in. The
 *     total is now pinned under the header and climbs as they type, so the
 *     bottom line confirms something they watched assemble.
 *  2. How they are paid is asked FIRST, because it decides whose money this
 *     is. See `soloModel`. It used to caveat the coding lift and stay silent
 *     about the extra visits, so a salaried reader watched a total climb that
 *     could never reach them.
 *  3. Price is asked early, not last. For someone paying out of their own
 *     pocket it is the first thing in their head, and a total is worth more
 *     climbing towards a number already on screen than revealed against one.
 *
 * And no input carries an invented figure. "6.3 minutes now, 5.2 with
 * Abridge" sat in these fields as placeholders, which put a 1.1-minute saving
 * on screen as a finding nobody had measured, anchoring the largest number on
 * the page. The published Medicare rate is the only figure here not typed by
 * the reader, and it says so. A guard now fails the build on both.
 */

const fmt$ = (n: number) => {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (a >= 1e3) return `${sign}$${Math.round(a / 1e3)}K`;
  return `${sign}$${Math.round(a)}`;
};
const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
/**
 * Figures the reader typed are shown back exactly. `fmt$` rounds to "$3K",
 * which is right for a derived total and wrong for a price they entered as
 * 3,000: it reads as though the screen were not listening.
 */
const fmtExact$ = (n: number) => `${n < 0 ? "-" : ""}$${fmtInt(Math.abs(n))}`;
const HAIRCUT_PCT = Math.round(SOLO_HAIRCUT * 100);

const FIELD =
  "flex-1 min-w-0 h-auto border-0 rounded-none bg-transparent p-0 shadow-none text-right text-[19px] md:text-[19px] font-bold text-[#1A1A1A] tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:not-italic placeholder:font-normal placeholder:text-[15px] placeholder:text-[#C9BDAD]";
const EYEBROW = "text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-[#A69A88]";

function Num({ value, onChange, suffix, prefix, step = 1, placeholder, max, testId }: {
  value: number; onChange: (n: number) => void; suffix?: string; prefix?: string;
  step?: number; placeholder?: string; max?: number; testId: string;
}) {
  const cap = max ?? (suffix === "%" ? 100 : undefined);
  return (
    <div className="w-[152px] inline-flex items-baseline gap-1.5 border-b-2 border-[#E0D9CE] focus-within:border-[#EA2C00] transition-colors pb-1">
      {prefix && <span className="text-[14px] text-[#A69A88]">{prefix}</span>}
      <FormattedNumberInput value={value} onChange={onChange} step={step} max={cap} className={FIELD} placeholder={placeholder} data-testid={testId} />
      {suffix && <span className={`text-[14px] text-[#A69A88] ${suffix === "%" ? "-ml-1" : ""}`}>{suffix}</span>}
    </div>
  );
}

function Ask({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-stretch gap-y-2 sm:flex-row sm:items-center sm:justify-between sm:gap-x-6 py-4 border-b border-[#E8E2DA]">
      <div className="min-w-0">
        <div className="text-[15px] font-medium text-[#1A1A1A] leading-snug">{label}</div>
        {hint && <div className="text-[12.5px] text-[#A69A88] mt-1 leading-snug">{hint}</div>}
      </div>
      <div className="flex w-full justify-start sm:w-auto sm:justify-end sm:flex-shrink-0">{children}</div>
    </div>
  );
}

function Block({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <section className="mt-11">
      <div className={EYEBROW}>{eyebrow}</div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * The pin.
 *
 * Deliberately not a coral zero on arrival: an empty total is a prompt, not a
 * result. And it leads with whichever figure is actually theirs, which is the
 * hours for a salaried reader and the money for a reader paid on productivity.
 */
function SoloPin({ payModel, hoursKept, toYou, toPractice, live }: {
  payModel: PayModel | null; hoursKept: number; toYou: number; toPractice: number; live: boolean;
}) {
  const salaried = payModel === "salary";
  const money = useCountUp(salaried ? toPractice : toYou);
  const hours = useCountUp(hoursKept);

  return (
    <div
      data-testid="solo-pin"
      className="sticky top-14 sm:top-16 z-30 -mx-5 sm:-mx-8 px-5 sm:px-8 bg-[#FDFCFA] border-b border-[#E8E2DA] pt-4 pb-4"
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className={EYEBROW}>So far</span>
        {payModel === null && live && (
          <span className="text-[12px] text-[#A69A88]">say how you are paid to see the money</span>
        )}
      </div>
      {live ? (
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {salaried || payModel === null ? (
            <>
              <span data-testid="solo-pin-figure" className="font-abridge text-[34px] sm:text-[40px] leading-none text-[#1A1A1A]">
                {fmtInt(hours)} hrs
              </span>
              <span className="text-[14px] text-[#9A8C7A]">a year, yours</span>
              {salaried && toPractice > 0 && (
                <span className="text-[13px] text-[#8C8073]">
                  and <span className="font-abridge text-[16px] text-[#5E534A]">{fmt$(money)}</span> a year to whoever employs you
                </span>
              )}
            </>
          ) : (
            <>
              <span data-testid="solo-pin-figure" className={`font-abridge text-[34px] sm:text-[40px] leading-none ${toYou > 0 ? "text-[#EA2C00]" : "text-[#C9BDAD]"}`}>
                {fmt$(money)}
              </span>
              <span className="text-[14px] text-[#9A8C7A]">a year, yours</span>
              {hoursKept > 0 && (
                <span className="text-[13px] text-[#8C8073]">
                  and <span className="font-abridge text-[16px] text-[#1A1A1A]">{fmtInt(hours)}</span> hours back
                </span>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="mt-1.5">
          <div className="font-abridge text-[24px] leading-none text-[#C9BDAD]">Nothing to show yet</div>
          <div className="text-[12.5px] text-[#A69A88] mt-1.5">Answer anything below and it starts adding up here.</div>
        </div>
      )}
    </div>
  );
}

function PayChoice({ value, onPick }: { value: PayModel | null; onPick: (p: PayModel) => void }) {
  const opts: { k: PayModel; label: string; sub: string }[] = [
    { k: "productivity", label: "On productivity", sub: "wRVUs, collections or a per-visit rate" },
    { k: "salary", label: "A flat salary", sub: "the same whatever the volume" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {opts.map((o) => {
        const on = value === o.k;
        return (
          <button
            key={o.k}
            data-testid={`pay-${o.k}`}
            onClick={() => onPick(o.k)}
            className={`text-left rounded-xl border px-5 py-4 transition-colors ${
              on ? "border-[#EA2C00] bg-[#FFF7F4]" : "border-[#E0D9CE] bg-[#FDFBF8] hover:border-[#C9BDAD]"
            }`}
          >
            <div className={`text-[15px] font-semibold ${on ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}>{o.label}</div>
            <div className="text-[12.5px] text-[#8C8073] mt-1 leading-snug">{o.sub}</div>
          </button>
        );
      })}
    </div>
  );
}

export default function SoloRoi({ onBack }: { onBack: () => void }) {
  const [payModel, setPayModel] = useState<PayModel | null>(null);
  const [cost, setCost] = useState(0);
  // their week
  const [perWeek, setPerWeek] = useState(0);
  const [noteNow, setNoteNow] = useState(0);
  const [noteWith, setNoteWith] = useState(0);
  // their coding
  const [wrvuNow, setWrvuNow] = useState(0);
  const [wrvuWith, setWrvuWith] = useState(0);
  const [perWrvu, setPerWrvu] = useState(33.4);
  // what they would do with the time
  const [visitMins, setVisitMins] = useState(0);
  const [extraPerWeek, setExtraPerWeek] = useState(0);

  const m = soloModel({ payModel, perWeek, noteNow, noteWith, wrvuNow, wrvuWith, perWrvu, visitMins, extraPerWeek, cost });
  const salaried = payModel === "salary";
  const theirMoney = salaried ? m.toPractice : m.toYou;

  return (
    <div className="pt-10 pb-28">
      <div className={`mb-7 ${EYEBROW} text-[11px]`}>Outpatient</div>
      <h1 className="font-abridge text-[26px] sm:text-[32px] leading-[1.14] text-[#4A3F35] max-w-[600px]">
        What Abridge is worth to you
      </h1>
      <p className="mt-3 mb-2 text-[15px] leading-[1.55] text-[#8C8073] max-w-[560px]">
        You are the one paying for it, so the only question is what comes back
        to you. Every figure here is one you put in.
      </p>

      <SoloPin
        payModel={payModel}
        hoursKept={m.hoursKept}
        toYou={m.toYou}
        toPractice={m.toPractice}
        live={m.hasTime || m.hasMoney}
      />

      <Block eyebrow="How you are paid">
        <p className="text-[15px] leading-[1.6] text-[#5E534A] max-w-[560px] mb-4">
          This decides whose money the rest of the screen is. Paid on
          productivity, better coding and an extra patient pay you. On a flat
          salary they pay whoever employs you, and what you get is the time.
        </p>
        <PayChoice value={payModel} onPick={setPayModel} />
      </Block>

      <Block eyebrow="What you pay">
        <div className="border-t border-[#E8E2DA]">
          <Ask label="What does Abridge cost you?" hint="a year, whatever comes out of your own pocket">
            <Num value={cost} onChange={setCost} prefix="$" testId="f-cost" />
          </Ask>
        </div>
      </Block>

      <Block eyebrow="Your week">
        <div className="border-t border-[#E8E2DA]">
          <Ask label="How many patients do you see in a week?">
            <Num value={perWeek} onChange={setPerWeek} placeholder="e.g., 70" testId="f-per-week" />
          </Ask>
          <Ask label="How long does a note take you now?" hint="start to signed, on a typical one">
            <Num value={noteNow} onChange={setNoteNow} step={0.1} suffix="min" testId="f-note-now" />
          </Ask>
          <Ask label="And with Abridge?" hint="your own best guess; try a few figures and watch what moves">
            <Num value={noteWith} onChange={setNoteWith} step={0.1} suffix="min" testId="f-note-with" />
          </Ask>
        </div>
        <p className="mt-5 text-[15px] leading-[1.7] text-[#5E534A]">
          {m.hasTime ? (
            <>
              <b className="text-[#1A1A1A]">{m.savedPerNote.toFixed(1)} min</b> off each note, across{" "}
              <b className="text-[#1A1A1A]">{fmtInt(m.visitsYear)}</b> visits a year, is{" "}
              <span className="font-abridge text-[26px] text-[#EA2C00] align-baseline">{fmtInt(m.hoursBack)} hours</span> back.
            </>
          ) : (
            <span className="text-[#A69A88]">Fill in your week and the hours appear here.</span>
          )}
        </p>
      </Block>

      <Block eyebrow="Your coding">
        {payModel === null ? (
          <p className="text-[15px] leading-[1.6] text-[#A69A88] max-w-[560px]">
            Say how you are paid above and this opens up. Until then a dollar
            figure here would not tell you whose it is.
          </p>
        ) : (
          <>
            <div className="border-t border-[#E8E2DA]">
              <Ask label="Your wRVUs per visit now" hint="off a recent statement, or your best estimate">
                <Num value={wrvuNow} onChange={setWrvuNow} step={0.01} testId="f-wrvu-now" />
              </Ask>
              <Ask label="And with fuller notes?" hint="what you think a complete note would support">
                <Num value={wrvuWith} onChange={setWrvuWith} step={0.01} testId="f-wrvu-with" />
              </Ask>
              <Ask label="What you are paid per wRVU" hint="the 2026 Medicare rate is $33.40; use your own if you know it">
                <Num value={perWrvu} onChange={setPerWrvu} step={0.01} prefix="$" testId="f-per-wrvu" />
              </Ask>
            </div>
            <p className="mt-5 text-[15px] leading-[1.7] text-[#5E534A]">
              {m.codingGain > 0 ? (
                <>
                  <b className="text-[#1A1A1A]">{m.lift.toFixed(2)}</b> more wRVU on each of{" "}
                  <b className="text-[#1A1A1A]">{fmtInt(m.visitsYear)}</b> visits, at{" "}
                  <b className="text-[#1A1A1A]">${perWrvu.toFixed(2)}</b>, less{" "}
                  <b className="text-[#1A1A1A]">{HAIRCUT_PCT}%</b> for the other things that move the
                  same number, is{" "}
                  <span className={`font-abridge text-[26px] align-baseline ${salaried ? "text-[#5E534A]" : "text-[#EA2C00]"}`}>
                    {fmt$(m.codingGain)}
                  </span>{" "}
                  a year{salaried ? ", to whoever employs you." : "."}
                </>
              ) : (
                <span className="text-[#A69A88]">Put your wRVUs in and this fills itself out.</span>
              )}
            </p>
            <p className="mt-3 text-[13px] leading-[1.6] text-[#8C8073] max-w-[560px]">
              A fuller note is not the only thing that moves this number, and
              not every fuller note gets paid the way it should. So this takes{" "}
              {HAIRCUT_PCT}% off the lift you entered rather than counting all
              of it.{" "}
              {salaried
                ? "And on a flat salary it is your employer's revenue, not your pay. It is still the figure to put in front of them when you ask who should be paying for this."
                : "It reaches you because you are paid on what you produce."}
            </p>
          </>
        )}
      </Block>

      <Block eyebrow="What you do with the time">
        <p className="text-[15px] leading-[1.6] text-[#5E534A] max-w-[560px]">
          The hours are yours to spend. Turn some into patients, or keep them.
          The same hour cannot be both, so this moves both figures at once.
        </p>
        <div className="mt-6 border-t border-[#E8E2DA]">
          <Ask label="How long is a typical visit?" hint="used to work out how many fit in the time you get back">
            <Num value={visitMins} onChange={setVisitMins} suffix="min" placeholder="e.g., 20" testId="f-visit-mins" />
          </Ask>
        </div>
        <div className="mt-7">
          <div className="flex items-baseline justify-between gap-4 mb-2">
            <span className="text-[14px] font-medium text-[#1A1A1A]">Extra patients a week</span>
            <span className="font-abridge text-[15px] text-[#EA2C00] whitespace-nowrap">
              {m.maxExtraPerWeek > 0
                ? `${m.extra} of a possible ${m.maxExtraPerWeek}`
                : visitMins <= 0 ? "add a visit length" : "no room yet"}
            </span>
          </div>
          <input
            type="range" min={0} max={Math.max(1, m.maxExtraPerWeek)} step={1} value={m.extra}
            onChange={(e) => setExtraPerWeek(parseInt(e.target.value, 10))}
            disabled={m.maxExtraPerWeek <= 0}
            className="roi-slider w-full cursor-pointer"
            style={{ ["--roi-fill" as string]: `${m.maxExtraPerWeek > 0 ? (m.extra / m.maxExtraPerWeek) * 100 : 0}%` }}
          />
          {m.hasTime ? (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
              <div>
                <div className="font-abridge text-[30px] leading-none text-[#1A1A1A]">{fmtInt(m.hoursKept)} hrs</div>
                <div className="text-[12.5px] text-[#8C8073] mt-2">a year still yours</div>
              </div>
              <div>
                {payModel === null ? (
                  <div className="text-[13px] leading-[1.6] text-[#A69A88] max-w-[240px]">
                    Say how you are paid and the value of those visits shows here.
                  </div>
                ) : (
                  <>
                    <div className={`font-abridge text-[30px] leading-none ${salaried ? "text-[#5E534A]" : "text-[#EA2C00]"}`}>
                      {fmt$(m.extraGain)}
                    </div>
                    <div className="text-[12.5px] text-[#8C8073] mt-2">
                      {salaried
                        ? `from ${fmtInt(m.extraYear)} more visits a year, and this goes to your employer too`
                        : `from ${fmtInt(m.extraYear)} more visits a year`}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* No hours yet means no trade-off to make. A "0 hrs" here is a zero
               posing as an answer, which is the one thing this screen must not
               put in front of someone deciding whether to trust it. */
            <p className="mt-4 text-[13px] leading-[1.6] text-[#A69A88] max-w-[420px]">
              Fill in your week above and this works out how many patients the
              reclaimed time makes room for.
            </p>
          )}
        </div>
      </Block>

      {/*
        The verdict.

        It used to restate the pin: the same total, the same hours kept, the
        same multiple, twice on one screen (and the hours a third time, up in
        the trade-off block). That is the defect the practice path had before
        its per-tab summaries came out, so the rule is the same here. The pin
        carries what is accumulating. This carries only the judgment on it,
        which is the part the pin cannot show: what is left after they pay, and
        for a salaried reader, that the money was never theirs to begin with.
      */}
      <div className="mt-12 rounded-2xl border border-[#EAE3D9] bg-[#FDFBF8] px-7 sm:px-9 py-8">
        <div className={EYEBROW}>Where that leaves you</div>
        {!m.hasTime && !m.hasMoney ? (
          <p className="mt-4 text-[15px] leading-[1.6] text-[#8C8073] max-w-[520px]">
            Fill in your week above and this fills itself in.
          </p>
        ) : cost <= 0 || payModel === null ? (
          <p className="mt-4 text-[15px] leading-[1.6] text-[#8C8073] max-w-[520px]">
            {payModel === null
              ? "Say how you are paid, and what Abridge costs you, and this fills itself in."
              : "Add what Abridge costs you and this fills itself in."}
          </p>
        ) : salaried ? (
          <>
            <div className="mt-6">
              {/* `m.net` rather than a restated "minus what you pay": it is the
                  same figure when the model is right, and this is where it
                  shows when the model is wrong. Exact, not rounded, because on
                  a flat salary this figure IS the price they typed. */}
              <div data-testid="solo-net" className="font-abridge text-[38px] leading-none text-[#1A1A1A]">
                {fmtExact$(m.net)}
              </div>
              <div className="text-[12.5px] text-[#8C8073] mt-3">out of your own pocket, a year</div>
            </div>
            <p className="mt-7 text-[14px] leading-[1.7] text-[#5E534A] max-w-[620px]">
              On a flat salary none of that {theirMoney > 0 ? fmt$(theirMoney) : "revenue"} reaches you.
              What you get is <b className="text-[#1A1A1A]">{fmtInt(m.hoursKept)} hours</b> of your own
              time, and you are paying <b className="text-[#1A1A1A]">{fmtExact$(cost)}</b> a year for
              them. Whether that is a fair split, when the revenue lands with your employer, is the
              question to put to whoever asked you to buy it.
            </p>
          </>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
              <div>
                <div data-testid="solo-net" className={`font-abridge text-[38px] leading-none ${m.net < 0 ? "text-[#1A1A1A]" : "text-[#EA2C00]"}`}>
                  {fmt$(m.net)}
                </div>
                <div className="text-[12.5px] text-[#8C8073] mt-3">
                  {m.net < 0 ? "short, at that price" : "left over, after paying for it"}
                </div>
              </div>
              <div>
                <div className="font-abridge text-[38px] leading-none text-[#1A1A1A]">
                  {m.multiple >= 1 ? `${m.multiple.toFixed(1)}×` : `${Math.round(m.multiple * 100)}%`}
                </div>
                <div className="text-[12.5px] text-[#8C8073] mt-3">
                  of the {fmtExact$(cost)} you pay, back in a year
                </div>
              </div>
            </div>
            <p className="mt-7 text-[14px] leading-[1.7] text-[#5E534A] max-w-[620px]">
              {m.net >= 0 ? (
                <>
                  And you still keep <b className="text-[#1A1A1A]">{fmtInt(m.hoursKept)} hours</b> of
                  your own time on top of it.
                </>
              ) : (
                <>
                  On these numbers it does not cover what you pay. The hours are still real:{" "}
                  <b className="text-[#1A1A1A]">{fmtInt(m.hoursBack)}</b> of them. Whether that is worth{" "}
                  {fmtExact$(cost)} to you is a fair question to put to whoever asked you to buy it.
                </>
              )}
            </p>
          </>
        )}
      </div>

      <div className="mt-10 pt-7 border-t border-[#E8E2DA] flex items-center justify-end">
        <button onClick={onBack} className="text-[14px] font-semibold text-[#A69A88] hover:text-[#1A1A1A] transition-colors">
          Start over
        </button>
      </div>
    </div>
  );
}
