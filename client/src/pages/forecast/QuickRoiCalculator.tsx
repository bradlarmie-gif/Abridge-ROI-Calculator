import { useMemo, useState, useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";

/**
 * ROI Calculator — a guided, editorial three-step flow that turns an Abridge
 * impact-analysis data pull into dollars for a partner, then shows the headroom
 * if they expand. Built for someone who has never done this: one task at a time,
 * plain language, before -> after pairs read straight off the named pull table.
 *
 * Dollars come only from levers a pull cleanly supports (coding wRVU x CF, HCC).
 * Reclaimed documentation time is shown as a measured COUNT of clinician hours,
 * never dollarized. Nursing keeps an overtime lever (a real payroll rate).
 *
 * Model: value today = per-encounter lift x encounters Abridge touched today
 * (providers on Abridge x their visits x utilization). Headroom = same lift with
 * the adoption + utilization dials turned up. Volume scales, the effect never does.
 */

type SettingKey = "outpatient" | "ed" | "inpatient" | "nursing";

interface LeverField { k: string; label: string; def: number; prefix?: string; suffix?: string; step?: number; }
interface Lever {
  id: string; domain: string; title: string; optional?: boolean; note?: string;
  before: LeverField; after: LeverField; rate: LeverField; unit?: string; table?: string;
  perEnc: (f: Record<string, number>) => number;
}
interface HccCfg { populations: { label: string; perHcc: number }[]; members: number; before: number; after: number; }
interface SettingCfg {
  label: string; blurb: string; providerWord: string; encWord: string; visitWord: string;
  defaults: { totalProviders: number; onAbridge: number; encPerProvider: number; utilNow: number };
  levers: Lever[];
  hcc?: HccCfg; // risk capture is modeled on the panel (per member / year), not per visit
  timeMetric?: { before: number; after: number; table: string };
}
const HCC_POPULATIONS = [
  { label: "Medicare Advantage", perHcc: 1200 },
  { label: "Medicaid MCO", perHcc: 800 },
  { label: "ACA / Exchange", perHcc: 1000 },
];

const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
const fmtShort = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
};

const codingLever = (before: number, after: number): Lever => ({
  id: "coding", domain: "Revenue", title: "Coding accuracy", unit: "wRVU", table: "Transaction wRVU/enc table",
  before: { k: "wrvuBefore", label: "wRVU / visit", def: before, step: 0.01 },
  after: { k: "wrvuAfter", label: "wRVU / visit", def: after, step: 0.01 },
  rate: { k: "cf", label: "Paid per wRVU (2026 conversion factor)", def: 33.4, prefix: "$", step: 0.1 },
  perEnc: (f) => Math.max(0, f.wrvuAfter - f.wrvuBefore) * f.cf,
});
const CFG: Record<SettingKey, SettingCfg> = {
  outpatient: {
    label: "Outpatient", blurb: "Office visits, primary care and specialty.",
    providerWord: "providers", encWord: "visits", visitWord: "visit",
    defaults: { totalProviders: 458, onAbridge: 340, encPerProvider: 3500, utilNow: 74 },
    levers: [codingLever(1.95, 2.03)],
    hcc: { populations: HCC_POPULATIONS, members: 25000, before: 2.4, after: 2.7 },
    timeMetric: { before: 6.26, after: 5.12, table: "Time in Notes table" },
  },
  ed: {
    label: "Emergency", blurb: "The emergency department.",
    providerWord: "providers", encWord: "ED visits", visitWord: "visit",
    defaults: { totalProviders: 80, onAbridge: 55, encPerProvider: 3000, utilNow: 70 },
    levers: [codingLever(1.9, 2.05)],
    hcc: { populations: HCC_POPULATIONS, members: 6000, before: 1.8, after: 2.0 },
    timeMetric: { before: 6.5, after: 5.1, table: "Time in Notes table" },
  },
  inpatient: {
    label: "Inpatient", blurb: "Hospital medicine.",
    providerWord: "providers", encWord: "encounters", visitWord: "encounter",
    defaults: { totalProviders: 90, onAbridge: 60, encPerProvider: 2500, utilNow: 68 },
    levers: [codingLever(2.1, 2.28)],
    hcc: { populations: HCC_POPULATIONS, members: 12000, before: 2.6, after: 2.9 },
    timeMetric: { before: 9.0, after: 6.5, table: "Time in Notes table" },
  },
  nursing: {
    label: "Nursing", blurb: "Inpatient nursing.",
    providerWord: "nurses", encWord: "care events", visitWord: "care event",
    defaults: { totalProviders: 600, onAbridge: 420, encPerProvider: 1800, utilNow: 65 },
    levers: [
      {
        id: "overtime", domain: "Capacity", title: "Overtime avoided", unit: "min", table: "Time in Notes table",
        note: "Counts reclaimed charting time that would otherwise be paid as overtime. Set the rate to your blended OT rate; leave visits that don't hit overtime out of the count.",
        before: { k: "timeBefore", label: "charting / care event", def: 4.5, step: 0.1 },
        after: { k: "timeAfter", label: "charting / care event", def: 3.5, step: 0.1 },
        rate: { k: "otRate", label: "Overtime rate per hour (payroll)", def: 65, prefix: "$" },
        perEnc: (f) => (Math.max(0, f.timeBefore - f.timeAfter) / 60) * f.otRate,
      },
    ],
  },
};

function useCountUp(value: number, ms = 550): number {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number>();
  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(from + (value - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, ms]);
  return shown;
}

const EYEBROW = "text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-[#A69A88]";

interface Props { onBack: () => void; onHome: () => void; }

export default function QuickRoiCalculator({ onBack, onHome }: Props) {
  const [setting, setSetting] = useState<SettingKey | null>(null);
  const [step, setStep] = useState(0); // 0 = account, 1 = lift, 2 = answer
  const inPicker = setting === null;
  const goBack = () => {
    if (inPicker) onBack();
    else if (step > 0) setStep(step - 1);
    else { setSetting(null); setStep(0); }
  };
  const onStepClick = (n: number) => {
    if (n === 1) { setSetting(null); setStep(0); }
    else setStep(n - 2);
  };
  return (
    <div className="min-h-screen bg-[#FDFCFA] text-[#5E534A] antialiased">
      <UnifiedHeader
        pathType="forecast"
        currentStep={inPicker ? 1 : step + 2}
        totalSteps={4}
        stepName={inPicker ? "Care setting" : STEPS[step]}
        onBack={goBack}
        onHome={onHome}
        onStepClick={onStepClick}
        stepLabels={["Care setting", "The account", "The lift", "The answer"]}
      />
      <UnifiedHeaderSpacer />
      <div className="max-w-[760px] mx-auto px-5 sm:px-8">
        {inPicker
          ? <SettingPicker onPick={(s) => { setSetting(s); setStep(0); }} />
          : <Wizard key={setting} setting={setting} step={step} setStep={setStep} onChangeSetting={() => { setSetting(null); setStep(0); }} />}
      </div>
    </div>
  );
}

function SettingPicker({ onPick }: { onPick: (s: SettingKey) => void }) {
  return (
    <div className="pt-12 sm:pt-16 pb-24">
      <div className={EYEBROW}>ROI Calculator</div>
      <h1 className="font-abridge text-[32px] sm:text-[40px] leading-[1.08] text-[#1A1A1A] mt-4 max-w-[640px]">How much is Abridge making your partner?</h1>
      <p className="mt-5 text-[16px] leading-[1.55] text-[#8C8073] max-w-[520px]">
        Three quick steps, straight from an impact-analysis pull. First, which care setting?
      </p>
      <div className="mt-12 border-t border-[#E8E2DA]">
        {(Object.keys(CFG) as SettingKey[]).map((k) => (
          <button key={k} onClick={() => onPick(k)}
            className="group w-full text-left flex items-center justify-between gap-6 py-6 border-b border-[#E8E2DA] hover:pl-2 transition-all">
            <div>
              <span className="font-abridge text-[26px] text-[#1A1A1A] group-hover:text-[#EA2C00] transition-colors">{CFG[k].label}</span>
              <span className="ml-4 text-[14px] text-[#A69A88]">{CFG[k].blurb}</span>
            </div>
            <ArrowRight className="w-5 h-5 text-[#C9BDAD] group-hover:text-[#EA2C00] group-hover:translate-x-1 transition-all flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

const STEPS = ["The account", "The lift", "The answer"];

function Wizard({ setting, step, setStep, onChangeSetting }: { setting: SettingKey; step: number; setStep: (n: number) => void; onChangeSetting: () => void }) {
  const cfg = CFG[setting];
  const d = cfg.defaults;
  // Everything is scoped to THIS care setting, not the whole system.
  const scopeWord = cfg.providerWord === "nurses" ? "nurses" : `${cfg.label.toLowerCase()} providers`;
  const settingWord = cfg.label.toLowerCase();
  const [partner, setPartner] = useState("");
  const [totalProviders, setTotalProviders] = useState(d.totalProviders);
  const [onAbridge, setOnAbridge] = useState(d.onAbridge);
  const [encPerProvider, setEncPerProvider] = useState(d.encPerProvider);
  const [utilNow, setUtilNow] = useState(d.utilNow);
  const [fields, setFields] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    cfg.levers.forEach((l) => { init[l.before.k] = l.before.def; init[l.after.k] = l.after.def; init[l.rate.k] = l.rate.def; });
    return init;
  });
  const [on, setOn] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}; cfg.levers.forEach((l) => { init[l.id] = !l.optional; }); return init;
  });
  const [timeBefore, setTimeBefore] = useState(cfg.timeMetric?.before ?? 0);
  const [timeAfter, setTimeAfter] = useState(cfg.timeMetric?.after ?? 0);
  const [targetAdoptionPct, setTargetAdoptionPct] = useState(100);
  const [targetUtilPct, setTargetUtilPct] = useState(100);
  const [price, setPrice] = useState(0);

  const setF = (k: string, v: number) => setFields((p) => ({ ...p, [k]: v }));
  const adoptionNow = totalProviders > 0 ? (onAbridge / totalProviders) * 100 : 0;
  const encToday = onAbridge * encPerProvider * (utilNow / 100);
  const encTarget = totalProviders * (targetAdoptionPct / 100) * encPerProvider * (targetUtilPct / 100);

  const results = useMemo(() => cfg.levers.map((l) => {
    const f = { [l.before.k]: fields[l.before.k], [l.after.k]: fields[l.after.k], [l.rate.k]: fields[l.rate.k] };
    return { lever: l, perEnc: on[l.id] ? l.perEnc(f) : 0 };
  }), [cfg, fields, on]);
  const valuePerEnc = results.reduce((s, r) => s + r.perEnc, 0);

  // HCC / risk capture is a PANEL calculation — value accrues once per member
  // per year (RAF), never per visit. So it's computed separately from the
  // per-encounter levers and scales with adoption (more providers cover more of
  // the panel), not with per-visit utilization.
  const hccCfg = cfg.hcc;
  const [hccOn, setHccOn] = useState(false);
  const [hccPopIdx, setHccPopIdx] = useState(0);
  const [hccMembers, setHccMembers] = useState(hccCfg?.members ?? 0);
  const [hccBefore, setHccBefore] = useState(hccCfg?.before ?? 0);
  const [hccAfter, setHccAfter] = useState(hccCfg?.after ?? 0);
  const [hccPerHcc, setHccPerHcc] = useState(hccCfg?.populations[0].perHcc ?? 1200);
  const hccDelta = Math.max(0, hccAfter - hccBefore);
  const hccValue = hccOn && hccCfg ? hccDelta * hccMembers * hccPerHcc : 0;
  const adoptionScale = adoptionNow > 0 ? targetAdoptionPct / adoptionNow : 1;
  const hccPotential = hccValue * adoptionScale;

  const todayValue = valuePerEnc * encToday + hccValue;
  const potentialValue = valuePerEnc * encTarget + hccPotential;
  const headroom = Math.max(0, potentialValue - todayValue);
  const hoursReclaimed = cfg.timeMetric ? (Math.max(0, timeBefore - timeAfter) / 60) * encToday : 0;
  const partnerName = partner.trim() || "this partner";
  const breakdown = [
    ...results.filter((r) => r.perEnc > 0).map((r) => ({ title: r.lever.title, value: r.perEnc * encToday })),
    ...(hccValue > 0 ? [{ title: "Risk capture (HCC)", value: hccValue }] : []),
  ];

  // Group the lift levers by domain so Step 2 can offer a clean tab to move
  // between the Revenue / Capacity sections instead of one long scroll.
  const [liftTab, setLiftTab] = useState(0);
  const liftGroups = useMemo(() => {
    const order = ["Revenue", "Capacity", "Quality"];
    return order
      .map((dom) => {
        const levs = results.filter((r) => r.lever.domain === dom);
        const hasTime = dom === "Capacity" && !!cfg.timeMetric;
        if (!levs.length && !hasTime) return null;
        const dollar = levs.reduce((s, r) => s + r.perEnc * encToday, 0) + (dom === "Revenue" ? hccValue : 0);
        const summary = dollar > 0 ? fmtShort(dollar) : hasTime ? `${fmtInt(hoursReclaimed)} hrs` : "—";
        return { dom, levs, hasTime, summary };
      })
      .filter(Boolean) as { dom: string; levs: typeof results; hasTime: boolean; summary: string }[];
  }, [results, cfg, encToday, hoursReclaimed, hccValue]);
  const activeGroup = liftGroups[Math.min(liftTab, Math.max(0, liftGroups.length - 1))];

  return (
    <div className="pt-10 pb-28">
      <div className="mb-7 text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#A69A88]">
        {cfg.label} <button onClick={onChangeSetting} className="text-[#B4A896] hover:text-[#EA2C00] transition-colors">· change</button>
      </div>

      {step === 0 && (
        <StepShell title="Who is this partner, and how big are they?" sub="You'll find these on the pull's methodology and utilization pages.">
          <div className="border-t border-[#E8E2DA]">
            <Row label="Partner name">
              <TextInput value={partner} onChange={setPartner} placeholder="e.g., Bronson Healthcare" />
            </Row>
            <Row label={`How many ${scopeWord} does this partner have?`} hint={`the ${settingWord} population — everyone who could use Abridge here`}>
              <NumInput value={totalProviders} onChange={setTotalProviders} />
            </Row>
            <Row label="How many are on Abridge today?" hint={`of ${fmtInt(totalProviders)} — ${scopeWord} with a go-live date`}>
              <NumInput value={onAbridge} onChange={setOnAbridge} />
            </Row>
            <Row label={`About how many ${cfg.encWord} does each ${cfg.providerWord.replace(/s$/, "")} see a year?`}>
              <NumInput value={encPerProvider} onChange={setEncPerProvider} />
            </Row>
            <Row label="Of their visits, what share are documented with Abridge?" hint="the utilization % from the pull">
              <NumInput value={utilNow} onChange={setUtilNow} suffix="%" />
            </Row>
          </div>
          <p className="mt-7 text-[15px] leading-[1.6] text-[#5E534A]">
            So Abridge is on about <span className="font-abridge text-[#1A1A1A]">{fmtInt(encToday)}</span> {cfg.encWord} a year in {settingWord} right now — {Math.round(adoptionNow)}% of {scopeWord}, on {Math.round(utilNow)}% of their visits.
          </p>
          <NavRow onNext={() => setStep(1)} nextLabel="Next: the lift" />
        </StepShell>
      )}

      {step === 1 && (
        <StepShell title="What changed after they turned Abridge on?" sub="Read the before and after off the named table. It was this, now it's this.">
          {/* section tabs — navigate between the domains */}
          <div className="flex items-center gap-7 border-b border-[#E8E2DA]">
            {liftGroups.map((g, i) => (
              <button key={g.dom} onClick={() => setLiftTab(i)} className="relative flex items-baseline gap-2 pb-3 -mb-px outline-none group">
                <span className={`text-[13px] font-bold tracking-[0.01em] transition-colors ${i === liftTab ? "text-[#1A1A1A]" : "text-[#A69A88] group-hover:text-[#5E534A]"}`}>{g.dom}</span>
                <span className={`font-abridge text-[14px] transition-colors ${i === liftTab ? "text-[#EA2C00]" : "text-[#C9BDAD]"}`}>{g.summary}</span>
                {i === liftTab && <span className="absolute left-0 right-0 bottom-[-1px] h-[2px] bg-[#EA2C00]" />}
              </button>
            ))}
          </div>

          <div>
            {activeGroup?.levs.map(({ lever, perEnc }) => (
              <LiftRow key={lever.id} lever={lever} on={on[lever.id]} onToggle={() => setOn((p) => ({ ...p, [lever.id]: !p[lever.id] }))}
                fields={fields} setF={setF} perYear={perEnc * encToday} visitWord={cfg.visitWord} perEnc={perEnc} encToday={encToday} />
            ))}
            {activeGroup?.dom === "Revenue" && hccCfg && (
              <HccCard cfg={hccCfg} on={hccOn} onToggle={() => setHccOn((v) => !v)}
                popIdx={hccPopIdx} onPop={(i) => { setHccPopIdx(i); setHccPerHcc(hccCfg.populations[i].perHcc); }}
                members={hccMembers} setMembers={setHccMembers} before={hccBefore} setBefore={setHccBefore}
                after={hccAfter} setAfter={setHccAfter} perHcc={hccPerHcc} setPerHcc={setHccPerHcc} delta={hccDelta} value={hccValue} />
            )}
            {activeGroup?.hasTime && cfg.timeMetric && (
              <div className="py-8 border-b border-[#E8E2DA]">
                <div className="text-[17px] font-bold text-[#1A1A1A]">Time back in the day</div>
                <div className="mt-5">
                  <BeforeAfter label="Minutes in notes per visit" table={cfg.timeMetric.table} unit="min" step={0.1}
                    before={timeBefore} after={timeAfter} onBefore={setTimeBefore} onAfter={setTimeAfter} lowerIsBetter />
                </div>
                <div className="mt-7 pt-6 border-t border-[#EFE9E0]">
                  <div className="text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-[#A69A88] mb-3">How the number is built</div>
                  <div className="text-[15px] leading-[2] text-[#5E534A]">
                    <Mono>{Math.max(0, timeBefore - timeAfter).toFixed(1)} min</Mono> saved × <Mono>{fmtInt(encToday)}</Mono> Abridge visits ÷ 60
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-[13px] text-[#A69A88]">equals</span>
                    <span className="font-abridge text-[34px] leading-none text-[#1A1A1A]">{fmtInt(hoursReclaimed)}<span className="text-[15px] text-[#9A8C7A]"> clinician hours a year</span></span>
                  </div>
                  <p className="mt-4 text-[13px] leading-[1.55] text-[#8C8073]">Shown as time given back — never converted to a made-up dollar.</p>
                </div>
              </div>
            )}
          </div>
          <NavRow onBack={() => setStep(0)} onNext={() => setStep(2)} nextLabel="See the answer" />
        </StepShell>
      )}

      {step === 2 && (
        <AnswerStep partnerName={partnerName} cfg={cfg} breakdown={breakdown} todayValue={todayValue}
          potentialValue={potentialValue} headroom={headroom} hoursReclaimed={hoursReclaimed}
          adoptionNow={adoptionNow} utilNow={utilNow} totalProviders={totalProviders}
          targetAdoptionPct={targetAdoptionPct} setTargetAdoptionPct={setTargetAdoptionPct}
          targetUtilPct={targetUtilPct} setTargetUtilPct={setTargetUtilPct}
          price={price} setPrice={setPrice} onBack={() => setStep(1)} />
      )}
    </div>
  );
}

function StepShell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-abridge text-[32px] sm:text-[40px] leading-[1.08] text-[#1A1A1A] max-w-[600px]">{title}</h1>
      <p className="mt-3 mb-9 text-[15px] leading-[1.55] text-[#8C8073] max-w-[560px]">{sub}</p>
      {children}
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-5 border-b border-[#E8E2DA]">
      <div className="min-w-0">
        <div className="text-[15px] font-medium text-[#1A1A1A] leading-snug">{label}</div>
        {hint && <div className="text-[12.5px] text-[#A69A88] mt-1 leading-snug">{hint}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// Underlined editorial inputs
const UINPUT_CLASS = "flex-1 min-w-0 h-auto border-0 rounded-none bg-transparent p-0 shadow-none text-right text-[19px] font-bold text-[#1A1A1A] tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0";
function NumInput({ value, onChange, suffix, prefix, step = 1, w = "w-[168px]" }: { value: number; onChange: (n: number) => void; suffix?: string; prefix?: string; step?: number; w?: string }) {
  return (
    <div className={`${w} inline-flex items-baseline gap-1.5 border-b-2 border-[#E0D9CE] focus-within:border-[#EA2C00] transition-colors pb-1`}>
      {prefix && <span className="text-[14px] text-[#A69A88]">{prefix}</span>}
      <FormattedNumberInput value={value} onChange={onChange} step={step} className={UINPUT_CLASS} />
      {suffix && <span className="text-[14px] text-[#A69A88]">{suffix}</span>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (s: string) => void; placeholder?: string }) {
  return (
    <div className="w-[168px] inline-flex border-b-2 border-[#E0D9CE] focus-within:border-[#EA2C00] transition-colors pb-1">
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-transparent outline-none text-right text-[18px] font-bold text-[#1A1A1A] placeholder:font-normal placeholder:text-[15px] placeholder:text-[#C9BDAD]" />
    </div>
  );
}

function BeforeAfter({ label, table, unit, before, after, onBefore, onAfter, step = 0.01, lowerIsBetter }: {
  label: string; table?: string; unit?: string; before: number; after: number; onBefore: (n: number) => void; onAfter: (n: number) => void; step?: number; lowerIsBetter?: boolean;
}) {
  const delta = lowerIsBetter ? before - after : after - before;
  const good = delta > 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-[14px] font-medium text-[#1A1A1A]">{label}</span>
        {table && <span className="text-[12px] text-[#A69A88]">from the {table}</span>}
      </div>
      <div className="flex items-baseline gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-extrabold tracking-[0.1em] uppercase text-[#A69A88] mb-1">Before</div>
          <NumInput value={before} onChange={onBefore} step={step} suffix={unit} w="w-[96px]" />
        </div>
        <ArrowRight className="w-4 h-4 text-[#C9BDAD] self-end mb-2.5" />
        <div>
          <div className="text-[10px] font-extrabold tracking-[0.1em] uppercase text-[#EA2C00] mb-1">After</div>
          <NumInputAccent value={after} onChange={onAfter} step={step} suffix={unit} w="w-[96px]" />
        </div>
        <span className={`self-end mb-2.5 ml-1 text-[14px] font-bold whitespace-nowrap ${good ? "text-[#B02200]" : "text-[#B4A896]"}`}>
          {good ? (lowerIsBetter ? "−" : "+") : ""}{Math.abs(delta).toFixed(unit === "min" ? 1 : 2)} {unit}
        </span>
      </div>
    </div>
  );
}

function NumInputAccent({ value, onChange, suffix, step = 0.01, w = "w-[96px]" }: { value: number; onChange: (n: number) => void; suffix?: string; step?: number; w?: string }) {
  return (
    <div className={`${w} inline-flex items-baseline gap-1.5 border-b-2 border-[#EA2C00] pb-1`}>
      <FormattedNumberInput value={value} onChange={onChange} step={step} className={UINPUT_CLASS} />
      {suffix && <span className="text-[14px] text-[#A69A88]">{suffix}</span>}
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-[#443A32] tabular-nums">{children}</span>;
}
function LiftRow({ lever, on, onToggle, fields, setF, perYear, perEnc, encToday, visitWord }: {
  lever: Lever; on: boolean; onToggle: () => void; fields: Record<string, number>; setF: (k: string, v: number) => void; perYear: number; perEnc: number; encToday: number; visitWord: string;
}) {
  if (lever.optional && !on) {
    return (
      <div className="py-6 border-b border-[#E8E2DA] flex items-center justify-between">
        <span className="text-[17px] font-bold text-[#B4A896]">{lever.title}</span>
        <button onClick={onToggle} className="text-[13px] font-bold text-[#B02200] hover:text-[#EA2C00] transition-colors">+ Add if the pull has it</button>
      </div>
    );
  }
  return (
    <div className="py-8 border-b border-[#E8E2DA]">
      <div className="flex items-center justify-between">
        <span className="text-[17px] font-bold text-[#1A1A1A]">{lever.title}</span>
        {lever.optional && <button onClick={onToggle} className="text-[12px] font-bold text-[#B4A896] hover:text-[#EA2C00] transition-colors">Remove</button>}
      </div>
      {lever.note && <p className="mt-2 text-[13px] leading-[1.55] text-[#8C8073] max-w-[560px]">{lever.note}</p>}
      <div className="mt-5">
        <BeforeAfter label={`${lever.unit} / ${lever.unit === "min" ? "care event" : "visit"}`} table={lever.table} unit={lever.unit} step={lever.before.step}
          before={fields[lever.before.k]} after={fields[lever.after.k]} onBefore={(v) => setF(lever.before.k, v)} onAfter={(v) => setF(lever.after.k, v)} lowerIsBetter={lever.unit === "min"} />
      </div>
      <div className="flex items-center justify-between gap-6 mt-6">
        <span className="text-[14px] text-[#5E534A]">{lever.rate.label}</span>
        <NumInput value={fields[lever.rate.k]} onChange={(v) => setF(lever.rate.k, v)} prefix={lever.rate.prefix} step={lever.rate.step} w="w-[92px]" />
      </div>
      {(() => {
        const isTime = lever.unit === "min";
        const before = fields[lever.before.k]; const after = fields[lever.after.k]; const rate = fields[lever.rate.k];
        const delta = isTime ? Math.max(0, before - after) : Math.max(0, after - before);
        return (
          <div className="mt-7 pt-6 border-t border-[#EFE9E0]">
            <div className="text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-[#A69A88] mb-3">How the number is built</div>
            <div className="text-[15px] leading-[2] text-[#5E534A]">
              {isTime
                ? <><Mono>{delta.toFixed(1)} min</Mono> saved ÷ 60 × <Mono>${fmtInt(rate)}/hr</Mono> = <Mono>${perEnc.toFixed(2)}</Mono> per {visitWord}</>
                : <><Mono>{delta.toFixed(2)} {lever.unit}</Mono> lift × <Mono>${rate}</Mono> per {lever.unit} = <Mono>${perEnc.toFixed(2)}</Mono> per {visitWord}</>}
              <br />
              <Mono>${perEnc.toFixed(2)}</Mono> per {visitWord} × <Mono>{fmtInt(encToday)}</Mono> Abridge {visitWord}s a year
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-[13px] text-[#A69A88]">equals</span>
              <span className="font-abridge text-[34px] leading-none text-[#EA2C00]">{fmtShort(perYear)}<span className="text-[15px] text-[#9A8C7A]"> a year</span></span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function HccCard({ cfg, on, onToggle, popIdx, onPop, members, setMembers, before, setBefore, after, setAfter, perHcc, setPerHcc, delta, value }: {
  cfg: HccCfg; on: boolean; onToggle: () => void; popIdx: number; onPop: (i: number) => void;
  members: number; setMembers: (n: number) => void; before: number; setBefore: (n: number) => void;
  after: number; setAfter: (n: number) => void; perHcc: number; setPerHcc: (n: number) => void; delta: number; value: number;
}) {
  if (!on) {
    return (
      <div className="py-6 border-b border-[#E8E2DA] flex items-center justify-between">
        <span className="text-[17px] font-bold text-[#B4A896]">Risk capture (HCC)</span>
        <button onClick={onToggle} className="text-[13px] font-bold text-[#B02200] hover:text-[#EA2C00] transition-colors">+ Add if they carry risk</button>
      </div>
    );
  }
  return (
    <div className="py-8 border-b border-[#E8E2DA]">
      <div className="flex items-center justify-between">
        <span className="text-[17px] font-bold text-[#1A1A1A]">Risk capture (HCC)</span>
        <button onClick={onToggle} className="text-[12px] font-bold text-[#B4A896] hover:text-[#EA2C00] transition-colors">Remove</button>
      </div>
      <p className="mt-2 text-[13px] leading-[1.55] text-[#8C8073] max-w-[520px]">Risk capture is valued on the panel — once per member, per year — not per visit.</p>

      {/* population */}
      <div className="mt-5 flex items-center gap-2">
        {cfg.populations.map((p, i) => (
          <button key={p.label} onClick={() => onPop(i)}
            className={`text-[12px] font-bold rounded-full px-3.5 py-1.5 transition-colors ${i === popIdx ? "bg-[#1A1A1A] text-white" : "border border-[#E8E2DA] text-[#8C8073] hover:border-[#1A1A1A] hover:text-[#1A1A1A]"}`}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-6 mt-6">
        <div className="min-w-0">
          <div className="text-[14px] font-medium text-[#1A1A1A]">Risk-adjusted members Abridge covers</div>
          <div className="text-[12.5px] text-[#A69A88] mt-1">the {cfg.populations[popIdx].label} panel seen by Abridge providers</div>
        </div>
        <NumInput value={members} onChange={setMembers} w="w-[128px]" />
      </div>

      <div className="mt-6">
        <BeforeAfter label="HCC captured per member, per year" table="risk-adjustment report" unit="HCC" step={0.01}
          before={before} after={after} onBefore={setBefore} onAfter={setAfter} />
      </div>
      <div className="flex items-center justify-between gap-6 mt-6">
        <span className="text-[14px] text-[#5E534A]">Value per HCC captured (RAF)</span>
        <NumInput value={perHcc} onChange={setPerHcc} prefix="$" w="w-[104px]" />
      </div>

      <div className="mt-7 pt-6 border-t border-[#EFE9E0]">
        <div className="text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-[#A69A88] mb-3">How the number is built</div>
        <div className="text-[15px] leading-[2] text-[#5E534A]">
          <Mono>{delta.toFixed(2)} HCC</Mono> more per member × <Mono>{fmtInt(members)}</Mono> members × <Mono>${fmtInt(perHcc)}</Mono> per HCC
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-[13px] text-[#A69A88]">equals</span>
          <span className="font-abridge text-[34px] leading-none text-[#EA2C00]">{fmtShort(value)}<span className="text-[15px] text-[#9A8C7A]"> a year</span></span>
        </div>
      </div>
    </div>
  );
}

function NavRow({ onBack, onNext, nextLabel }: { onBack?: () => void; onNext: () => void; nextLabel: string }) {
  return (
    <div className="flex items-center justify-between mt-10">
      {onBack ? <button onClick={onBack} className="text-[14px] font-semibold text-[#A69A88] hover:text-[#1A1A1A] transition-colors">Back</button> : <span />}
      <button onClick={onNext} className="inline-flex items-center gap-2 rounded-full bg-[#EA2C00] text-white text-[14px] font-bold px-7 py-3.5 hover:bg-[#d12800] transition-colors">
        {nextLabel} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function AnswerStep(p: {
  partnerName: string; cfg: SettingCfg; breakdown: { title: string; value: number }[];
  todayValue: number; potentialValue: number; headroom: number; hoursReclaimed: number;
  adoptionNow: number; utilNow: number; totalProviders: number;
  targetAdoptionPct: number; setTargetAdoptionPct: (n: number) => void; targetUtilPct: number; setTargetUtilPct: (n: number) => void;
  price: number; setPrice: (n: number) => void; onBack: () => void;
}) {
  const todayShown = useCountUp(p.todayValue);
  const potentialShown = useCountUp(p.potentialValue);
  const roi = p.price > 0 ? p.todayValue / p.price : 0;
  const todayPct = p.potentialValue > 0 ? (p.todayValue / p.potentialValue) * 100 : 0;
  const headroomPct = Math.max(0, 100 - todayPct);
  const dollarLevers = p.breakdown;
  const makeup = [
    dollarLevers.map((r) => r.title.toLowerCase()).join(" and "),
    p.hoursReclaimed > 0 ? `${fmtInt(p.hoursReclaimed)} clinician hours back` : "",
  ].filter(Boolean).join(", plus ");

  return (
    <div>
      {/* Beat 1 — what it's making today */}
      <div className={EYEBROW}>The answer</div>
      <h1 className="font-abridge text-[30px] sm:text-[36px] leading-[1.12] text-[#1A1A1A] mt-4">Abridge is making {p.partnerName}</h1>
      <div className="font-abridge text-[66px] sm:text-[92px] leading-[0.88] text-[#EA2C00] mt-3">{fmtShort(todayShown)}<span className="text-[26px] text-[#9A8C7A] font-normal"> a year</span></div>
      <p className="mt-5 text-[16px] leading-[1.6] text-[#5E534A] max-w-[560px]">
        From {makeup} — at today's {Math.round(p.adoptionNow)}% rollout, {Math.round(p.utilNow)}% utilization.
      </p>

      {/* Beat 2 — the upside */}
      <div className="mt-14 pt-1">
        <div className={EYEBROW}>The upside, if they expand</div>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <span className="font-abridge text-[44px] sm:text-[56px] leading-[0.9] text-[#1A1A1A]">{fmtShort(potentialShown)}<span className="text-[20px] text-[#9A8C7A] font-normal"> a year</span></span>
          <span className="font-abridge text-[22px] text-[#EA2C00]">+{fmtShort(p.potentialValue - p.todayValue)} on the table</span>
        </div>

        {/* the meter: solid coral = already made, light = reachable headroom */}
        <div className="mt-7">
          <div className="h-3 rounded-full bg-[#EDE5D8] overflow-hidden flex">
            <div className="h-full bg-[#EA2C00] transition-all duration-500" style={{ width: `${todayPct}%` }} />
            <div className="h-full bg-[#F6B7A6] transition-all duration-500" style={{ width: `${headroomPct}%` }} />
          </div>
          <div className="flex justify-between mt-2.5 text-[12.5px]">
            <span className="flex items-center gap-1.5 text-[#8C8073]"><span className="w-2 h-2 rounded-full bg-[#EA2C00]" /> Made today {fmtShort(p.todayValue)}</span>
            <span className="flex items-center gap-1.5 text-[#8C8073]"><span className="w-2 h-2 rounded-full bg-[#F6B7A6]" /> On the table {fmtShort(p.potentialValue - p.todayValue)}</span>
          </div>
        </div>

        {/* the dials */}
        <div className="mt-9 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6">
          <Slider label="More providers on Abridge" value={p.targetAdoptionPct} min={Math.round(p.adoptionNow)} onChange={p.setTargetAdoptionPct} right={`${fmtInt(Math.round(p.totalProviders * p.targetAdoptionPct / 100))} of ${fmtInt(p.totalProviders)}`} />
          <Slider label="Using it on more of their visits" value={p.targetUtilPct} min={Math.round(p.utilNow)} onChange={p.setTargetUtilPct} right={`${p.targetUtilPct}%`} />
        </div>
        <p className="mt-6 text-[13.5px] leading-[1.6] text-[#8C8073] max-w-[560px]">
          Same per-visit lift you measured, on more visits. Volume grows, the effect stays exactly where the data put it.
        </p>
      </div>

      {/* footer: makeup + price, quiet */}
      <div className="mt-14 pt-6 border-t border-[#E8E2DA] flex flex-wrap items-center justify-between gap-y-4 gap-x-8">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          {dollarLevers.map((r) => (
            <span key={r.title} className="text-[13px] text-[#8C8073]">{r.title} <span className="font-abridge text-[15px] text-[#1A1A1A]">{fmtShort(r.value)}</span></span>
          ))}
          {p.hoursReclaimed > 0 && <span className="text-[13px] text-[#8C8073]">Hours back <span className="font-abridge text-[15px] text-[#1A1A1A]">{fmtInt(p.hoursReclaimed)}</span></span>}
        </div>
        <div className="flex items-center gap-4">
          {p.price > 0 && <span className="text-[13px] text-[#8C8073]"><span className="font-abridge text-[18px] text-[#1A1A1A]">{roi.toFixed(1)}×</span> · {fmtShort(p.todayValue - p.price)} net</span>}
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] text-[#A69A88] whitespace-nowrap">Abridge price</span>
            <NumInput value={p.price} onChange={p.setPrice} prefix="$" w="w-[104px]" />
          </div>
        </div>
      </div>

      <button onClick={p.onBack} className="mt-8 text-[14px] font-semibold text-[#A69A88] hover:text-[#1A1A1A] transition-colors">Back to the numbers</button>
    </div>
  );
}

function Slider({ label, value, min, onChange, right }: { label: string; value: number; min: number; onChange: (n: number) => void; right: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[14px] font-medium text-[#1A1A1A]">{label}</span>
        <span className="font-abridge text-[15px] text-[#EA2C00]">{right}</span>
      </div>
      <input type="range" step={1} min={Math.max(0, Math.floor(min))} max={100} value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))} className="w-full accent-[#EA2C00] h-1 cursor-pointer" />
    </div>
  );
}
