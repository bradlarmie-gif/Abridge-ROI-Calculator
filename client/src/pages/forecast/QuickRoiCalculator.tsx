import { useMemo, useState, useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  type SettingKey,
  type RoiDriver,
  type RoiField,
  type RoiAccount,
  type Domain,
  SETTING_META,
  DRIVERS,
  DOMAIN_ORDER,
  defaultVals,
  defaultEnabled,
  runRoi,
} from "./roiEngine";

/**
 * ROI Calculator — a guided, editorial three-step flow that turns an Abridge
 * impact-analysis data pull into dollars for a partner, then shows the headroom
 * if they expand.
 *
 * Every dollar is produced by the SAME canonical Explore engine
 * (`computeAllDriverValues`) the Explore path uses — see `roiEngine.ts`. The
 * "how the number is built" line is the engine's own calc-summary string, so the
 * number and its arithmetic can never disagree, and can never disagree with the
 * promise the partner was sold in Explore. That reconciliation is the point:
 * this is the proof side of the same value story.
 *
 * Design rules the partner-success rep must never trip over:
 *   - every input is editable, including realization / attribution — no locked
 *     numbers, ever;
 *   - the drivers are the real per-setting Explore drivers (the ED has LWBS and
 *     admission capture, not HCC; outpatient has Patient Access, not a made-up
 *     capacity lever) — nothing invented;
 *   - reclaimed documentation time is shown as a COUNT of clinician hours, never
 *     dollarized on its own.
 *
 * Value today runs the engine on the encounters Abridge touches now (providers
 * on Abridge × their visits × utilization). Headroom re-runs the same engine
 * with the adoption + utilization dials turned up. Volume scales, the measured
 * effect never does.
 */

const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
const fmtShort = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
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
const STEPS = ["The account", "The lift", "The answer"];

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
        {(Object.keys(SETTING_META) as SettingKey[]).map((k) => (
          <button key={k} onClick={() => onPick(k)}
            className="group w-full text-left flex items-center justify-between gap-6 py-6 border-b border-[#E8E2DA] hover:pl-2 transition-all">
            <div>
              <span className="font-abridge text-[26px] text-[#1A1A1A] group-hover:text-[#EA2C00] transition-colors">{SETTING_META[k].label}</span>
              <span className="ml-4 text-[14px] text-[#A69A88]">{SETTING_META[k].blurb}</span>
            </div>
            <ArrowRight className="w-5 h-5 text-[#C9BDAD] group-hover:text-[#EA2C00] group-hover:translate-x-1 transition-all flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

function Wizard({ setting, step, setStep, onChangeSetting }: { setting: SettingKey; step: number; setStep: (n: number) => void; onChangeSetting: () => void }) {
  const meta = SETTING_META[setting];
  const d = meta.defaults;
  const isNursing = !!meta.isNursing;
  // Everything is scoped to THIS care setting, not the whole system.
  const scopeWord = isNursing ? "nurses" : `${meta.label.toLowerCase()} providers`;
  const settingWord = meta.label.toLowerCase();

  // ── account ──────────────────────────────────────────────────────────────
  const [partner, setPartner] = useState("");
  const [totalProviders, setTotalProviders] = useState(d.totalProviders);
  const [onAbridge, setOnAbridge] = useState(d.onAbridge);
  const [encPerProvider, setEncPerProvider] = useState(d.encPerProvider);
  const [utilNow, setUtilNow] = useState(d.utilNow);
  const [staffedBeds, setStaffedBeds] = useState(d.staffedBeds ?? 0);
  const [occupancy, setOccupancy] = useState(d.occupancy ?? 85);
  // Documentation minutes in notes (before -> after). Feeds Patient Access
  // dollars (outpatient) and the reclaimed-hours proof (all physician settings).
  const [timeBefore, setTimeBefore] = useState(meta.timeMetric?.before ?? 0);
  const [timeAfter, setTimeAfter] = useState(meta.timeMetric?.after ?? 0);

  // ── drivers ──────────────────────────────────────────────────────────────
  const [vals, setVals] = useState<Record<string, number>>(() => defaultVals(setting));
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => defaultEnabled(setting));
  const setVal = (k: string, v: number) => setVals((p) => ({ ...p, [k]: v }));
  const toggle = (id: string) => setEnabled((p) => ({ ...p, [id]: !p[id] }));

  // ── headroom dials ────────────────────────────────────────────────────────
  const adoptionNow = totalProviders > 0 ? (onAbridge / totalProviders) * 100 : 0;
  // Default the upside to a reachable stretch: a step up in adoption from where
  // they are today (floored at 70%), at full utilization. Always shows real
  // headroom, never claims 100% of providers. The rep dials it to reality.
  const [targetAdoptionPct, setTargetAdoptionPct] = useState(() => {
    const now = d.totalProviders > 0 ? (d.onAbridge / d.totalProviders) * 100 : 0;
    return Math.min(100, Math.max(Math.round(now) + 15, 70));
  });
  const [targetUtilPct, setTargetUtilPct] = useState(100);
  const [price, setPrice] = useState(0);

  const account: RoiAccount = useMemo(() => ({
    totalProviders, onAbridge, encPerProvider, utilNow,
    minutesSaved: isNursing ? 0 : Math.max(0, timeBefore - timeAfter),
    staffedBeds: isNursing ? staffedBeds : undefined,
    occupancy: isNursing ? occupancy : undefined,
  }), [totalProviders, onAbridge, encPerProvider, utilNow, isNursing, timeBefore, timeAfter, staffedBeds, occupancy]);

  // Both runs come straight from the canonical engine.
  const today = useMemo(() => runRoi(setting, account, vals, enabled), [setting, account, vals, enabled]);
  const potential = useMemo(
    () => runRoi(setting, account, vals, enabled, { adoptionPct: targetAdoptionPct, utilPct: targetUtilPct }),
    [setting, account, vals, enabled, targetAdoptionPct, targetUtilPct],
  );

  const encToday = onAbridge * encPerProvider * (utilNow / 100);
  const hoursReclaimed = isNursing ? 0 : today.totalHoursSaved;
  const partnerName = partner.trim() || "this partner";

  const todayValue = today.total;
  const potentialValue = Math.max(potential.total, todayValue);
  const headroom = Math.max(0, potentialValue - todayValue);

  const breakdown = DRIVERS[setting]
    .filter((dr) => enabled[dr.id] && (today.valueById[dr.id] ?? 0) > 0)
    .map((dr) => ({ title: dr.title, value: today.valueById[dr.id] }));

  // ── lift-step domain tabs ──────────────────────────────────────────────────
  const [liftTab, setLiftTab] = useState(0);
  const domains = useMemo(() => DOMAIN_ORDER.filter((dom) => {
    const hasDrivers = DRIVERS[setting].some((dr) => dr.domain === dom);
    const capacityTime = dom === "Capacity" && !isNursing; // reclaimed-hours proof lives here
    return hasDrivers || capacityTime;
  }), [setting, isNursing]);
  const tabSummary = (dom: Domain): string => {
    const dollar = DRIVERS[setting]
      .filter((dr) => dr.domain === dom && enabled[dr.id])
      .reduce((s, dr) => s + (today.valueById[dr.id] ?? 0), 0);
    if (dollar > 0) return fmtShort(dollar);
    if (dom === "Capacity" && !isNursing && hoursReclaimed > 0) return `${fmtInt(hoursReclaimed)} hrs`;
    return "Off";
  };
  const activeDomain = domains[Math.min(liftTab, Math.max(0, domains.length - 1))];

  return (
    <div className="pt-10 pb-28">
      <div className="mb-7 text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#A69A88]">
        {meta.label} <button onClick={onChangeSetting} className="text-[#B4A896] hover:text-[#EA2C00] transition-colors">· change</button>
      </div>

      {step === 0 && (
        <StepShell title="Who is this partner, and how big are they?" sub="You'll find these on the pull's methodology and utilization pages.">
          <div className="border-t border-[#E8E2DA]">
            <Row label="Partner name">
              <TextInput value={partner} onChange={setPartner} placeholder="e.g., Bronson Healthcare" />
            </Row>
            <Row label={`How many ${scopeWord} does this partner have?`} hint={`the ${settingWord} population, everyone who could use Abridge here`}>
              <NumInput value={totalProviders} onChange={setTotalProviders} />
            </Row>
            <Row label="How many are on Abridge today?" hint={`of ${fmtInt(totalProviders)} ${scopeWord} with a go-live date`}>
              <NumInput value={onAbridge} onChange={setOnAbridge} />
            </Row>
            <Row label={`About how many ${meta.encWord} does each ${meta.providerWord.replace(/s$/, "")} handle a year?`}>
              <NumInput value={encPerProvider} onChange={setEncPerProvider} />
            </Row>
            <Row label={`Of their ${meta.encWord}, what share are documented with Abridge?`} hint="the utilization % from the pull">
              <NumInput value={utilNow} onChange={setUtilNow} suffix="%" />
            </Row>
            {isNursing && (
              <>
                <Row label="How many staffed beds?" hint="drives the patient-days behind the quality math">
                  <NumInput value={staffedBeds} onChange={setStaffedBeds} />
                </Row>
                <Row label="Average occupancy?">
                  <NumInput value={occupancy} onChange={setOccupancy} suffix="%" />
                </Row>
              </>
            )}
          </div>
          <p className="mt-7 text-[15px] leading-[1.6] text-[#5E534A]">
            So Abridge is on about <span className="font-abridge text-[#1A1A1A]">{fmtInt(encToday)}</span> {meta.encWord} a year in {settingWord} right now. That is {Math.round(adoptionNow)}% of {scopeWord}, on {Math.round(utilNow)}% of their {meta.encWord}.
          </p>
          <NavRow onNext={() => setStep(1)} nextLabel="Next: the lift" />
        </StepShell>
      )}

      {step === 1 && (
        <StepShell title="What changed after they turned Abridge on?" sub="Read the before and after off the named table. It was this, now it's this. Every number here is yours to edit.">
          {/* section tabs — navigate between the domains */}
          <div className="flex items-center gap-7 border-b border-[#E8E2DA] flex-wrap">
            {domains.map((dom, i) => (
              <button key={dom} onClick={() => setLiftTab(i)} className="relative flex items-baseline gap-2 pb-3 -mb-px outline-none group">
                <span className={`text-[13px] font-bold tracking-[0.01em] transition-colors ${i === liftTab ? "text-[#1A1A1A]" : "text-[#A69A88] group-hover:text-[#5E534A]"}`}>{dom}</span>
                <span className={`font-abridge text-[14px] transition-colors ${i === liftTab ? "text-[#EA2C00]" : "text-[#C9BDAD]"}`}>{tabSummary(dom)}</span>
                {i === liftTab && <span className="absolute left-0 right-0 bottom-[-1px] h-[2px] bg-[#EA2C00]" />}
              </button>
            ))}
          </div>

          <div className="pt-6 space-y-4">
            {activeDomain === "Capacity" && !isNursing && meta.timeMetric && (
              <TimeBackBlock table={meta.timeMetric.table} before={timeBefore} after={timeAfter}
                onBefore={setTimeBefore} onAfter={setTimeAfter} encToday={encToday} hours={hoursReclaimed}
                dollarized={setting === "outpatient"} />
            )}
            {DRIVERS[setting].filter((dr) => dr.domain === activeDomain).map((dr) => (
              <DriverCard key={dr.id} driver={dr} vals={vals} setVal={setVal}
                on={!!enabled[dr.id]} onToggle={() => toggle(dr.id)} eligibleEncounters={Math.round(encToday)}
                value={today.valueById[dr.id] ?? 0} summary={today.summaryById[dr.id] ?? ""} />
            ))}
          </div>
          <NavRow onBack={() => setStep(0)} onNext={() => setStep(2)} nextLabel="See the answer" />
        </StepShell>
      )}

      {step === 2 && (
        <AnswerStep partnerName={partnerName} breakdown={breakdown} todayValue={todayValue}
          potentialValue={potentialValue} headroom={headroom} hoursReclaimed={hoursReclaimed}
          adoptionNow={adoptionNow} utilNow={utilNow} totalProviders={totalProviders}
          targetAdoptionPct={targetAdoptionPct} setTargetAdoptionPct={setTargetAdoptionPct}
          targetUtilPct={targetUtilPct} setTargetUtilPct={setTargetUtilPct} showUtilDial={!isNursing}
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

function NumInputAccent({ value, onChange, suffix, step = 0.01, w = "w-[96px]" }: { value: number; onChange: (n: number) => void; suffix?: string; step?: number; w?: string }) {
  return (
    <div className={`${w} inline-flex items-baseline gap-1.5 border-b-2 border-[#EA2C00] pb-1`}>
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
  const decimals = unit === "min" ? 1 : 2;
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
          {good ? (lowerIsBetter ? "−" : "+") : ""}{Math.abs(delta).toFixed(decimals)} {unit}
        </span>
      </div>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-[#443A32] tabular-nums">{children}</span>;
}

/** The engine's own multiplicand formula string + the engine's value. */
function WorkedMath({ summary, value }: { summary: string; value: number }) {
  return (
    <div className="mt-7 pt-6 border-t border-[#EFE9E0]">
      <div className="text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-[#A69A88] mb-3">How the number is built</div>
      <div className="text-[15px] leading-[1.9] text-[#5E534A]">{summary || "Turn this driver on to build the number."}</div>
      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-[13px] text-[#A69A88]">equals</span>
        <span className="font-abridge text-[34px] leading-none text-[#EA2C00]">{fmtShort(value)}<span className="text-[15px] text-[#9A8C7A]"> a year</span></span>
      </div>
    </div>
  );
}

/** The universal on/off switch that lives in every driver card's header. */
function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onToggle}
      className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-2 ${on ? "bg-[#EA2C00]" : "bg-[#E0D9CE] hover:bg-[#D2C8B8]"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

/**
 * Every driver is its own card with a switch, so any driver can be turned off,
 * and the boundary between one driver and the next is unmistakable. The card's
 * own annual total sits in the header so the list is scannable.
 */
function DriverShell({ title, on, onToggle, value, children }: {
  title: string; on: boolean; onToggle: () => void; value: number; children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border transition-colors ${on ? "border-[#EAE3D9] bg-[#FDFBF8]" : "border-[#EFE9E0] bg-transparent"}`}>
      <div className="flex items-center justify-between gap-4 px-6 py-5">
        <span className={`text-[17px] font-bold ${on ? "text-[#1A1A1A]" : "text-[#B4A896]"}`}>{title}</span>
        <div className="flex items-center gap-4">
          {on
            ? <span className="font-abridge text-[18px] text-[#EA2C00] tabular-nums">{fmtShort(value)}</span>
            : <span className="text-[12px] font-semibold text-[#B4A896] whitespace-nowrap">Not counted</span>}
          <Toggle on={on} onToggle={onToggle} label={`Include ${title}`} />
        </div>
      </div>
      {on && <div className="px-6 pb-7 border-t border-[#EFE9E0] pt-6">{children}</div>}
    </div>
  );
}

/** Renders one engine driver: before/after (if any) + its editable fields + the worked math. */
function DriverCard({ driver, vals, setVal, on, onToggle, value, summary, eligibleEncounters }: {
  driver: RoiDriver; vals: Record<string, number>; setVal: (k: string, v: number) => void;
  on: boolean; onToggle: () => void; value: number; summary: string; eligibleEncounters: number;
}) {
  if (driver.kind === "hcc") {
    return <HccDriverCard driver={driver} vals={vals} setVal={setVal} on={on} onToggle={onToggle} value={value} summary={summary} />;
  }
  const workStr = driver.work ? driver.work(vals, eligibleEncounters) : summary;
  const ba = driver.beforeAfter;
  return (
    <DriverShell title={driver.title} on={on} onToggle={onToggle} value={value}>
      {driver.note && <p className="text-[13px] leading-[1.55] text-[#8C8073] max-w-[560px] mb-1">{driver.note}</p>}
      {ba && (
        <div className={driver.note ? "mt-5" : ""}>
          <BeforeAfter label={ba.label} table={ba.table} unit={ba.unit} step={ba.step ?? 0.01}
            before={vals[ba.beforeK]} after={vals[ba.afterK]}
            onBefore={(v) => setVal(ba.beforeK, v)} onAfter={(v) => setVal(ba.afterK, v)}
            lowerIsBetter={ba.lowerIsBetter} />
        </div>
      )}
      {driver.fields.map((f) => (
        <FieldRow key={f.k} field={f} value={vals[f.k]} onChange={(v) => setVal(f.k, v)} />
      ))}
      <WorkedMath summary={workStr} value={value} />
    </DriverShell>
  );
}

function FieldRow({ field, value, onChange }: { field: RoiField; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-6 mt-5">
      <div className="min-w-0">
        <div className="text-[14px] text-[#5E534A]">{field.label}</div>
        {field.hint && <div className="text-[12px] text-[#A69A88] mt-0.5">{field.hint}</div>}
      </div>
      <NumInput value={value} onChange={onChange} prefix={field.prefix} suffix={field.suffix} step={field.step ?? 1} w="w-[120px]" />
    </div>
  );
}

/** Risk capture (HCC) — valued on the panel, once per member per year, never per visit. */
function HccDriverCard({ driver, vals, setVal, on, onToggle, value, summary }: {
  driver: RoiDriver; vals: Record<string, number>; setVal: (k: string, v: number) => void;
  on: boolean; onToggle: () => void; value: number; summary: string;
}) {
  const pops = driver.populations ?? [];
  const [popIdx, setPopIdx] = useState(0);
  return (
    <DriverShell title={driver.title} on={on} onToggle={onToggle} value={value}>
      <p className="text-[13px] leading-[1.55] text-[#8C8073] max-w-[520px] mb-1">Risk capture is valued on the panel, once per member per year, not per visit.</p>

      {pops.length > 0 && (
        <div className="mt-5 flex items-center gap-2 flex-wrap">
          {pops.map((p, i) => (
            <button key={p.label} onClick={() => { setPopIdx(i); setVal("hccPerHcc", p.perHcc); }}
              className={`text-[12px] font-bold rounded-full px-3.5 py-1.5 transition-colors ${i === popIdx ? "bg-[#1A1A1A] text-white" : "border border-[#E8E2DA] text-[#8C8073] hover:border-[#1A1A1A] hover:text-[#1A1A1A]"}`}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-6 mt-6">
        <div className="min-w-0">
          <div className="text-[14px] font-medium text-[#1A1A1A]">Risk-adjusted members Abridge covers</div>
          <div className="text-[12.5px] text-[#A69A88] mt-1">the {pops[popIdx]?.label ?? ""} panel seen by Abridge providers</div>
        </div>
        <NumInput value={vals.hccMembers} onChange={(v) => setVal("hccMembers", v)} w="w-[128px]" />
      </div>

      <div className="mt-6">
        <BeforeAfter label="HCC captured per member, per year" table="risk-adjustment report" unit="HCC" step={0.01}
          before={vals.hccBefore} after={vals.hccAfter} onBefore={(v) => setVal("hccBefore", v)} onAfter={(v) => setVal("hccAfter", v)} />
      </div>
      <div className="flex items-center justify-between gap-6 mt-6">
        <span className="text-[14px] text-[#5E534A]">Value per HCC captured (RAF)</span>
        <NumInput value={vals.hccPerHcc} onChange={(v) => setVal("hccPerHcc", v)} prefix="$" w="w-[104px]" />
      </div>
      <div className="flex items-center justify-between gap-6 mt-5">
        <span className="text-[14px] text-[#5E534A]">Realization (audit survival)</span>
        <NumInput value={vals.hccRealization} onChange={(v) => setVal("hccRealization", v)} suffix="%" w="w-[104px]" />
      </div>

      <WorkedMath summary={summary} value={value} />
    </DriverShell>
  );
}

/** Reclaimed documentation time, shown as a COUNT of clinician hours, never dollarized here. */
function TimeBackBlock({ table, before, after, onBefore, onAfter, encToday, hours, dollarized }: {
  table: string; before: number; after: number; onBefore: (n: number) => void; onAfter: (n: number) => void;
  encToday: number; hours: number; dollarized: boolean;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#E5DDD1] bg-transparent px-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[17px] font-bold text-[#1A1A1A]">Time back in the day</span>
        <span className="text-[10px] font-extrabold tracking-[0.12em] uppercase text-[#B4A896] whitespace-nowrap">Measured · not counted in $</span>
      </div>
      <div className="mt-5">
        <BeforeAfter label="Minutes in notes per encounter" table={table} unit="min" step={0.1}
          before={before} after={after} onBefore={onBefore} onAfter={onAfter} lowerIsBetter />
      </div>
      <div className="mt-7 pt-6 border-t border-[#EFE9E0]">
        <div className="text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-[#A69A88] mb-3">How the number is built</div>
        <div className="text-[15px] leading-[1.9] text-[#5E534A]">
          <Mono>{Math.max(0, before - after).toFixed(1)} min</Mono> saved × <Mono>{fmtInt(encToday)}</Mono> Abridge encounters ÷ 60
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-[13px] text-[#A69A88]">equals</span>
          <span className="font-abridge text-[34px] leading-none text-[#1A1A1A]">{fmtInt(hours)}<span className="text-[15px] text-[#9A8C7A]"> clinician hours a year</span></span>
        </div>
        <p className="mt-4 text-[13px] leading-[1.55] text-[#8C8073]">
          {dollarized
            ? "Shown as time given back. The share reinvested into visits is valued below, in Patient access."
            : "Shown as time given back, never converted to a made-up dollar."}
        </p>
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
  partnerName: string; breakdown: { title: string; value: number }[];
  todayValue: number; potentialValue: number; headroom: number; hoursReclaimed: number;
  adoptionNow: number; utilNow: number; totalProviders: number;
  targetAdoptionPct: number; setTargetAdoptionPct: (n: number) => void; targetUtilPct: number; setTargetUtilPct: (n: number) => void;
  showUtilDial: boolean; price: number; setPrice: (n: number) => void; onBack: () => void;
}) {
  const todayShown = useCountUp(p.todayValue);
  const potentialShown = useCountUp(p.potentialValue);
  const roi = p.price > 0 ? p.todayValue / p.price : 0;
  const todayPct = p.potentialValue > 0 ? (p.todayValue / p.potentialValue) * 100 : 0;
  const headroomPct = Math.max(0, 100 - todayPct);
  const dollarLevers = p.breakdown;
  const makeup = [
    dollarLevers.map((r) => r.title.toLowerCase()).join(", "),
    p.hoursReclaimed > 0 ? `${fmtInt(p.hoursReclaimed)} clinician hours back` : "",
  ].filter(Boolean).join(", plus ");

  return (
    <div>
      {/* Beat 1 — what it's making today */}
      <div className={EYEBROW}>The answer</div>
      <h1 className="font-abridge text-[30px] sm:text-[36px] leading-[1.12] text-[#1A1A1A] mt-4">Abridge is making {p.partnerName}</h1>
      <div className="font-abridge text-[66px] sm:text-[92px] leading-[0.88] text-[#EA2C00] mt-3">{fmtShort(todayShown)}<span className="text-[26px] text-[#9A8C7A] font-normal"> a year</span></div>
      <p className="mt-5 text-[16px] leading-[1.6] text-[#5E534A] max-w-[560px]">
        {makeup ? <>From {makeup}, at today's {Math.round(p.adoptionNow)}% rollout and {Math.round(p.utilNow)}% utilization.</> : "Turn on the drivers your pull supports to build the number."}
      </p>

      {/* Beat 2 — the upside */}
      <div className="mt-14 pt-1">
        <div className={EYEBROW}>The upside, if they expand</div>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <span className="font-abridge text-[44px] sm:text-[56px] leading-[0.9] text-[#1A1A1A]">{fmtShort(potentialShown)}<span className="text-[20px] text-[#9A8C7A] font-normal"> a year</span></span>
          <span className="font-abridge text-[22px] text-[#EA2C00]">+{fmtShort(p.headroom)} on the table</span>
        </div>

        {/* the meter: solid coral = already made, light = reachable headroom */}
        <div className="mt-7">
          <div className="h-3 rounded-full bg-[#EDE5D8] overflow-hidden flex">
            <div className="h-full bg-[#EA2C00] transition-all duration-500" style={{ width: `${todayPct}%` }} />
            <div className="h-full bg-[#F6B7A6] transition-all duration-500" style={{ width: `${headroomPct}%` }} />
          </div>
          <div className="flex justify-between mt-2.5 text-[12.5px]">
            <span className="flex items-center gap-1.5 text-[#8C8073]"><span className="w-2 h-2 rounded-full bg-[#EA2C00]" /> Made today {fmtShort(p.todayValue)}</span>
            <span className="flex items-center gap-1.5 text-[#8C8073]"><span className="w-2 h-2 rounded-full bg-[#F6B7A6]" /> On the table {fmtShort(p.headroom)}</span>
          </div>
        </div>

        {/* the dials */}
        <div className={`mt-9 grid grid-cols-1 ${p.showUtilDial ? "sm:grid-cols-2" : ""} gap-x-10 gap-y-6`}>
          <Slider label="More providers on Abridge" value={p.targetAdoptionPct} min={Math.round(p.adoptionNow)} onChange={p.setTargetAdoptionPct} right={`${fmtInt(Math.round(p.totalProviders * p.targetAdoptionPct / 100))} of ${fmtInt(p.totalProviders)}`} />
          {p.showUtilDial && (
            <Slider label="Using it on more of their encounters" value={p.targetUtilPct} min={Math.round(p.utilNow)} onChange={p.setTargetUtilPct} right={`${p.targetUtilPct}%`} />
          )}
        </div>
        <p className="mt-6 text-[13.5px] leading-[1.6] text-[#8C8073] max-w-[560px]">
          The measured effect stays exactly where the data put it. Only the volume it runs on grows.
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
