import { useMemo, useState } from "react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";

/**
 * One provider, working out their own return.
 *
 * The commercial case this exists for: some organisations make their providers
 * pay for Abridge themselves. That provider is not evaluating it for a group,
 * they are asking "what do I get for what I am paying". So unlike the practice
 * walk there is no goal picking, no payer-model question and no driver
 * catalogue: everything that matters to one outpatient doctor is on one screen,
 * and every figure moves as they change it.
 *
 * The point is that they UNDERSTAND it, so the chain is shown rather than the
 * conclusion: minutes off a note become hours, hours become patients only if
 * they choose to spend them that way, and fuller notes move the wRVUs on the
 * visits they already do. The slider is the teaching device: it makes the
 * trade-off between "an earlier finish" and "more patients" explicit, because
 * the same hour cannot be both.
 */

const WEEKS = 46;            // a working year, allowing for leave
const ATTRIBUTION = 0.75;    // the note's share of a coding lift; CDI and coding education move it too

const fmt$ = (n: number) => {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (a >= 1e3) return `${sign}$${Math.round(a / 1e3)}K`;
  return `${sign}$${Math.round(a)}`;
};
const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");

const FIELD =
  "flex-1 min-w-0 h-auto border-0 rounded-none bg-transparent p-0 shadow-none text-right text-[19px] md:text-[19px] font-bold text-[#1A1A1A] tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:not-italic placeholder:font-normal placeholder:text-[15px] placeholder:text-[#C9BDAD]";

function Num({ value, onChange, suffix, prefix, step = 1, placeholder, max }: {
  value: number; onChange: (n: number) => void; suffix?: string; prefix?: string;
  step?: number; placeholder?: string; max?: number;
}) {
  const cap = max ?? (suffix === "%" ? 100 : undefined);
  return (
    <div className="w-[132px] inline-flex items-baseline gap-1.5 border-b-2 border-[#E0D9CE] focus-within:border-[#EA2C00] transition-colors pb-1">
      {prefix && <span className="text-[14px] text-[#A69A88]">{prefix}</span>}
      <FormattedNumberInput value={value} onChange={onChange} step={step} max={cap} className={FIELD} placeholder={placeholder} />
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
      <div className="text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-[#A69A88]">{eyebrow}</div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function SoloRoi({ onBack }: { onBack: () => void }) {
  // their week
  const [perWeek, setPerWeek] = useState(0);
  const [noteNow, setNoteNow] = useState(0);
  const [noteWith, setNoteWith] = useState(0);
  // their coding
  const [wrvuNow, setWrvuNow] = useState(0);
  const [wrvuWith, setWrvuWith] = useState(0);
  const [perWrvu, setPerWrvu] = useState(33.4);
  // what they'd do with the time
  const [visitMins, setVisitMins] = useState(0);
  const [extraPerWeek, setExtraPerWeek] = useState(0);
  // what they pay
  const [cost, setCost] = useState(0);

  const m = useMemo(() => {
    const visitsYear = perWeek * WEEKS;
    const savedPerNote = Math.max(0, noteNow - noteWith);
    const hoursBack = (savedPerNote * visitsYear) / 60;

    // the reclaimed time is the budget; you cannot spend the same hour twice
    const maxExtraPerWeek = visitMins > 0 ? Math.floor((hoursBack / WEEKS) * 60 / visitMins) : 0;
    const extra = Math.min(extraPerWeek, maxExtraPerWeek);
    const extraYear = extra * WEEKS;
    const hoursSpent = (extraYear * visitMins) / 60;
    const hoursKept = Math.max(0, hoursBack - hoursSpent);

    // fuller notes on the visits already happening
    const lift = Math.max(0, wrvuWith - wrvuNow);
    const codingGain = visitsYear * lift * perWrvu * ATTRIBUTION;
    // and the visits the reclaimed time makes room for, at their own rate
    const extraGain = extraYear * (wrvuWith > 0 ? wrvuWith : wrvuNow) * perWrvu;

    const total = codingGain + extraGain;
    const net = total - cost;
    const multiple = cost > 0 ? total / cost : 0;
    return { visitsYear, savedPerNote, hoursBack, maxExtraPerWeek, extra, extraYear, hoursSpent, hoursKept, lift, codingGain, extraGain, total, net, multiple };
  }, [perWeek, noteNow, noteWith, wrvuNow, wrvuWith, perWrvu, visitMins, extraPerWeek, cost]);

  const hasTime = m.hoursBack > 0;
  const hasMoney = m.total > 0;

  return (
    <div className="pt-10 pb-28">
      <div className="mb-7 text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#A69A88]">Outpatient</div>
      <h1 className="font-abridge text-[26px] sm:text-[32px] leading-[1.14] text-[#4A3F35] max-w-[600px]">
        What Abridge is worth to you
      </h1>
      <p className="mt-3 mb-2 text-[15px] leading-[1.55] text-[#8C8073] max-w-[560px]">
        Everything is on this one screen and everything moves. Change any number
        and watch what it does.
      </p>

      <Block eyebrow="Your week">
        <div className="border-t border-[#E8E2DA]">
          <Ask label="How many patients do you see in a week?">
            <Num value={perWeek} onChange={setPerWeek} placeholder="e.g., 70" />
          </Ask>
          <Ask label="How long does a note take you now?" hint="start to signed, on a typical one">
            <Num value={noteNow} onChange={setNoteNow} step={0.1} suffix="min" placeholder="6.3" />
          </Ask>
          <Ask label="And with Abridge?" hint="your estimate; the faded number is what we typically see">
            <Num value={noteWith} onChange={setNoteWith} step={0.1} suffix="min" placeholder="5.2" />
          </Ask>
        </div>
        <p className="mt-5 text-[15px] leading-[1.7] text-[#5E534A]">
          {hasTime ? (
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
        <div className="border-t border-[#E8E2DA]">
          <Ask label="Your wRVUs per visit now" hint="off a recent statement, or your best estimate">
            <Num value={wrvuNow} onChange={setWrvuNow} step={0.01} placeholder="1.95" />
          </Ask>
          <Ask label="And with fuller notes?" hint="what you think a complete note would support">
            <Num value={wrvuWith} onChange={setWrvuWith} step={0.01} placeholder="2.03" />
          </Ask>
          <Ask label="What you are paid per wRVU" hint="the 2026 Medicare rate is $33.40; use your own if you know it">
            <Num value={perWrvu} onChange={setPerWrvu} step={0.01} prefix="$" />
          </Ask>
        </div>
        <p className="mt-5 text-[15px] leading-[1.7] text-[#5E534A]">
          {m.codingGain > 0 ? (
            <>
              <b className="text-[#1A1A1A]">{m.lift.toFixed(2)}</b> more wRVU on each of{" "}
              <b className="text-[#1A1A1A]">{fmtInt(m.visitsYear)}</b> visits, at{" "}
              <b className="text-[#1A1A1A]">${perWrvu}</b>, counting{" "}
              <b className="text-[#1A1A1A]">{Math.round(ATTRIBUTION * 100)}%</b> of it to the note, is{" "}
              <span className="font-abridge text-[26px] text-[#EA2C00] align-baseline">{fmt$(m.codingGain)}</span> a year.
            </>
          ) : (
            <span className="text-[#A69A88]">Put your wRVUs in and this fills itself out.</span>
          )}
        </p>
        <p className="mt-3 text-[13px] leading-[1.6] text-[#8C8073] max-w-[560px]">
          Only some of a coding lift belongs to the note: coding education and
          CDI move it too, so we count {Math.round(ATTRIBUTION * 100)}% of it.
          And this only reaches you if you are paid on productivity. On a flat
          salary it goes to your employer, and what you get is the time above.
        </p>
      </Block>

      <Block eyebrow="What you do with the time">
        <p className="text-[15px] leading-[1.6] text-[#5E534A] max-w-[560px]">
          The hours are yours to spend. Turn some into patients, or keep them.
          The same hour cannot be both, so this moves both figures at once.
        </p>
        <div className="mt-6 border-t border-[#E8E2DA]">
          <Ask label="How long is a typical visit?" hint="used to work out how many fit in the time you get back">
            <Num value={visitMins} onChange={setVisitMins} suffix="min" placeholder="e.g., 20" />
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
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
            <div>
              <div className="font-abridge text-[30px] leading-none text-[#1A1A1A]">{fmtInt(m.hoursKept)} hrs</div>
              <div className="text-[12.5px] text-[#8C8073] mt-2">a year still yours</div>
            </div>
            <div>
              <div className="font-abridge text-[30px] leading-none text-[#EA2C00]">{fmt$(m.extraGain)}</div>
              <div className="text-[12.5px] text-[#8C8073] mt-2">
                from {fmtInt(m.extraYear)} more visits a year
              </div>
            </div>
          </div>
        </div>
      </Block>

      <Block eyebrow="What it costs you">
        <div className="border-t border-[#E8E2DA]">
          <Ask label="What do you pay for Abridge?" hint="a year, whatever comes out of your pocket">
            <Num value={cost} onChange={setCost} prefix="$" placeholder="e.g., 3,000" />
          </Ask>
        </div>
      </Block>

      <div className={`mt-12 rounded-2xl border px-7 sm:px-9 py-8 transition-colors ${m.net < 0 && cost > 0 ? "border-[#E0D9CE] bg-[#FDFBF8]" : "border-[#EAE3D9] bg-[#FDFBF8]"}`}>
        <div className="text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-[#A69A88]">Where that leaves you</div>
        {!hasMoney && !hasTime ? (
          <p className="mt-4 text-[15px] leading-[1.6] text-[#8C8073] max-w-[520px]">
            Fill in your week above and this fills itself in.
          </p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-x-10 gap-y-8">
              <div>
                <div className="font-abridge text-[38px] leading-none text-[#EA2C00]">{fmt$(m.total)}</div>
                <div className="text-[12.5px] text-[#8C8073] mt-3">a year, on your own numbers</div>
              </div>
              <div>
                <div className="font-abridge text-[38px] leading-none text-[#1A1A1A]">{fmtInt(m.hoursKept)} hrs</div>
                <div className="text-[12.5px] text-[#8C8073] mt-3">still your own time</div>
              </div>
              <div>
                <div className="font-abridge text-[38px] leading-none text-[#1A1A1A]">{cost > 0 ? fmt$(m.net) : "—"}</div>
                <div className="text-[12.5px] text-[#8C8073] mt-3">
                  {cost <= 0 ? "add what you pay to see this" : m.net < 0 ? "short, at that price" : "left over, after paying for it"}
                </div>
              </div>
            </div>
            {cost > 0 && (
              <p className="mt-7 text-[14px] leading-[1.7] text-[#5E534A] max-w-[620px]">
                {m.net >= 0 ? (
                  <>
                    That is <b className="text-[#1A1A1A]">{m.multiple.toFixed(1)}×</b> what you pay,
                    and you still keep <b className="text-[#1A1A1A]">{fmtInt(m.hoursKept)} hours</b> of
                    your own time on top.
                  </>
                ) : (
                  <>
                    On these numbers it does not cover what you pay. The hours are
                    still real: {fmtInt(m.hoursBack)} of them. Whether that is worth{" "}
                    {fmt$(cost)} to you is a fair question to put to whoever asked
                    you to buy it.
                  </>
                )}
              </p>
            )}
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
