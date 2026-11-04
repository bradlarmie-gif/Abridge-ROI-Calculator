import { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, Download } from "lucide-react";
import { QUICK_ROI_PDF_STORAGE_KEY } from "@/components/forecast/QuickRoiEditorialPdf";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { useFlowHistory } from "@/lib/useFlowHistory";
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
import { stashAndOpenPdf, PDF_HANDOFF_MESSAGE } from "@/lib/pdfHandoff";
import { HubTile, HubTileGrid } from "@/pages/hub/hubKit";
import { useAnimatedNumber } from "@/pages/proforma/editorial/editorialShared";
import { CapacityGoalArt, QualityGoalArt, RetentionGoalArt, RevenueGoalArt } from "@/pages/hub/hubArt";

/** Drivers whose value is built on another driver's numbers. */
const DEPENDS_ON: Record<string, string> = {
  physicianLocumAgency: "providerWellbeing",
  nursingAgency: "nursingRetention",
};

// One drawing per value group on the drivers step, from the goal-tile set.
const DOMAIN_ART: Record<string, JSX.Element> = {
  Revenue: <RevenueGoalArt />,
  Capacity: <CapacityGoalArt />,
  Workforce: <RetentionGoalArt />,
  Quality: <QualityGoalArt />,
};
import { EmergencyArt, InpatientArt, NursingArt, OutpatientArt } from "@/pages/hub/hubArt";

// The same drawings the Value Model's setting step uses, so a care setting looks
// the same wherever you pick it.
const SETTING_ART: Record<SettingKey, JSX.Element> = {
  outpatient: <OutpatientArt />,
  ed: <EmergencyArt />,
  inpatient: <InpatientArt />,
  nursing: <NursingArt />,
};

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
  const s = n < 0 ? "-" : "";
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (a >= 1e3) return `${s}$${Math.round(a / 1e3)}K`;
  return `${s}$${Math.round(a)}`;
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

const EYEBROW = "text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-[#565250]";
const STEPS = ["The account", "The drivers", "The answer"];

interface Props { onBack: () => void; onHome: () => void; pathLabel?: string; }

export default function QuickRoiCalculator({ onBack, onHome, pathLabel }: Props) {
  const [setting, setSetting] = useState<SettingKey | null>(null);
  const [step, setStep] = useState(0); // 0 = account, 1 = lift, 2 = answer
  const inPicker = setting === null;

  // The four screens here are real history entries, so the browser Back button
  // steps back through them instead of exiting the tool from wherever you
  // stood. "picker" | "<setting>:<step>".
  const position = inPicker ? "picker" : `${setting}:${step}`;
  const go = useFlowHistory("roiCalc", position, (next) => {
    if (next === "picker") { setSetting(null); setStep(0); return; }
    const [s, n] = next.split(":");
    setSetting(s as SettingKey);
    setStep(Number(n) || 0);
  });
  // Every step change starts a new screen — always open it at the top. Without
  // this, advancing while scrolled down (e.g. Lift -> Answer) opens the next
  // screen mid-page. App-level scroll reset only fires on view changes, not on
  // these in-flow step changes.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [step, setting]);
  const goBack = () => {
    if (inPicker) onBack();
    else if (step > 0) go(`${setting}:${step - 1}`);
    else go("picker");
  };
  const onStepClick = (n: number) => {
    if (n === 1) go("picker");
    else go(`${setting}:${n - 2}`);
  };
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#5E534A] antialiased">
      <UnifiedHeader
        pathType="forecast"
        pathLabel={pathLabel}
        currentStep={inPicker ? 1 : step + 2}
        totalSteps={4}
        stepName={inPicker ? "Care setting" : STEPS[step]}
        onBack={goBack}
        onHome={onHome}
        onStepClick={onStepClick}
        stepLabels={["Care setting", "The account", "The drivers", "The answer"]}
      />
      <UnifiedHeaderSpacer />
      {/* The picker is four tiles across, so it takes the hub's wide column; the
          wizard keeps its narrow reading measure. */}
      {/* One column width for every step, so the eyebrow and headline keep the
          same left edge from the picker onward. Steps that read better narrow
          (the lift, the answer) cap their own content inside it. */}
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        {inPicker
          ? <SettingPicker onPick={(s) => go(`${s}:0`)} />
          : <Wizard key={setting} setting={setting} step={step} setStep={(n) => go(`${setting}:${n}`)} onChangeSetting={() => go("picker")} />}
      </div>
    </div>
  );
}

function SettingPicker({ onPick }: { onPick: (s: SettingKey) => void }) {
  return (
    <div className="pt-12 sm:pt-16 pb-24">
      <div className={EYEBROW}>ROI Calculator · Step 1 of 4</div>
      <h1 className="font-abridge text-[28px] sm:text-[34px] leading-[1.12] text-[#1A1A1A] mt-4 max-w-[640px]">How much is Abridge worth here?</h1>
      <p className="mt-5 text-[16px] leading-[1.55] text-[#565250] max-w-[520px]">
        Three quick steps, straight from the impact analysis. First, which care setting?
      </p>
      {/*
        The same tile the hubs and the Value Model use, not a lookalike, so the
        two ways into a care setting cannot drift apart. No 01-04 numbering: the
        four settings are peers, and numbering them would imply you should start
        with outpatient. The page keeps its own sentence-case question rather than
        a hub's uppercase section title, because it is asking something.
      */}
      <div className="mt-10">
        <HubTileGrid>
          {(Object.keys(SETTING_META) as SettingKey[]).map((k, i) => (
            <HubTile
              key={k}
              title={SETTING_META[k].label}
              description={SETTING_META[k].blurb}
              art={SETTING_ART[k]}
              cta="Size this setting"
              onClick={() => onPick(k)}
              testId={`roi-setting-${k}`}
              delay={0.08 + i * 0.06}
            />
          ))}
        </HubTileGrid>
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
  // Blank by default (a live partner reads their own before/after off the impact
  // analysis); the setting's benchmark shows as a ghost placeholder, not a
  // fabricated pre-filled value.
  const [timeBefore, setTimeBefore] = useState(0);
  const [timeAfter, setTimeAfter] = useState(0);

  // ── drivers ──────────────────────────────────────────────────────────────
  // Before/after readings start BLANK: they are the partner's own measurements,
  // so a pre-filled example would read as their data. The example shows as the
  // placeholder instead, and the driver reads $0 until real numbers go in.
  const [vals, setVals] = useState<Record<string, number>>(() => {
    const v = defaultVals(setting);
    for (const dr of DRIVERS[setting]) if (dr.beforeAfter) { v[dr.beforeAfter.beforeK] = 0; v[dr.beforeAfter.afterK] = 0; }
    return v;
  });
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => defaultEnabled(setting));
  const setVal = (k: string, v: number) => setVals((p) => ({ ...p, [k]: v }));
  // Locum/agency is valued on the departures Retention avoids, so it cannot stand
  // alone: switching it on also switches Retention on, and switching Retention
  // off takes it with it. The row says so (see DEPENDS_ON).
  const toggle = (id: string) => setEnabled((p) => {
    const next = { ...p, [id]: !p[id] };
    const parent = DEPENDS_ON[id];
    if (parent && next[id]) next[parent] = true;
    for (const [child, par] of Object.entries(DEPENDS_ON)) if (par === id && !next[id]) next[child] = false;
    return next;
  });

  // ── headroom dials ────────────────────────────────────────────────────────
  const adoptionNow = totalProviders > 0 ? (onAbridge / totalProviders) * 100 : 0;
  // Default the upside to a reachable stretch: a step up in adoption from where
  // they are today (floored at 70%), at full utilization. Always shows real
  // headroom, never claims 100% of providers. The rep dials it to reality.
  const [targetAdoptionPct, setTargetAdoptionPct] = useState(() => {
    const now = d.totalProviders > 0 ? (d.onAbridge / d.totalProviders) * 100 : 0;
    return Math.min(100, Math.max(Math.round(now) + 15, 70));
  });
  // The account starts blank (partner facts are entered from the pull), so the
  // stretch target has to recompute once the real adoption is in — otherwise it
  // stays frozen at the blank-state 70% and can sit BELOW today's adoption (a
  // regressive "upside"). Re-derive a reachable stretch whenever adoption changes;
  // it never lands below where they are today.
  useEffect(() => {
    setTargetAdoptionPct(Math.min(100, Math.max(Math.round(adoptionNow) + 15, 70)));
  }, [adoptionNow]);
  // Utilization stretch: a credible ceiling, never a literal 100% of every note.
  // Caps at 90% and never sits below where they are today (recomputes with utilNow).
  const utilStretch = (u: number) => Math.max(Math.round(u), Math.min(90, Math.round(u) + 12));
  const [targetUtilPct, setTargetUtilPct] = useState(() => utilStretch(d.utilNow));
  useEffect(() => {
    setTargetUtilPct(utilStretch(utilNow));
  }, [utilNow]);
  const [price, setPrice] = useState(0);

  // HCC panel size is account-specific (the MA / risk-adjusted membership from the
  // partner's own risk-adjustment pull), so we never fabricate it from provider
  // count. It stays blank until the rep enters the real number; the driver reads
  // $0 until then rather than inflating off a guessed panel.

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
  const partnerName = partner.trim();

  const todayValue = today.total;
  const potentialValue = Math.max(potential.total, todayValue);
  const headroom = Math.max(0, potentialValue - todayValue);

  const breakdown = DRIVERS[setting]
    .filter((dr) => enabled[dr.id] && (today.valueById[dr.id] ?? 0) > 0)
    .map((dr) => ({ title: dr.title, value: today.valueById[dr.id] }));

  // ── lift-step domain tabs ──────────────────────────────────────────────────
  const [liftTab, setLiftTab] = useState(0);
  // Each value group on the drivers step can fold shut. Open by default.
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
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
    // Capacity is a measured signal, never a toggle — show its hours, or a neutral
    // dash before the account numbers are in, but never "Off".
    if (dom === "Capacity" && !isNursing) return hoursReclaimed > 0 ? `${fmtInt(hoursReclaimed)} hrs` : "—";
    return "Off";
  };
  const activeDomain = domains[Math.min(liftTab, Math.max(0, domains.length - 1))];

  // Export the one-pager: stash a snapshot of the inputs and open the HTML print
  // route (?quickroipdf=1&print=1). The PDF recomputes from these same inputs
  // through runRoi, so it reconciles with this screen by construction.
  const onExportPdf = () => {
    const data = {
      orgName: partner.trim() || "Prospective partner",
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      setting, account, vals, enabled, price, targetAdoptionPct, targetUtilPct,
    };
    try {
      stashAndOpenPdf(QUICK_ROI_PDF_STORAGE_KEY, data, "?quickroipdf=1&print=1");
    } catch (err) {
      // Loud beats a sample-data PDF handed to a customer. See lib/pdfHandoff.
      alert(err instanceof Error ? err.message : PDF_HANDOFF_MESSAGE);
    }
  };

  return (
    <div className="pt-12 sm:pt-16 pb-28">
      <div className="mb-4 text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#565250]">
        {meta.label} · Step {step + 2} of 4 <button onClick={onChangeSetting} className="normal-case tracking-normal text-[12px] font-bold text-[#8A8580] hover:text-[#EA2C00] transition-colors">· Change setting</button>
      </div>

      {step === 0 && (
        <div>
          <h1 className="font-abridge text-[28px] sm:text-[34px] leading-[1.12] text-[#1A1A1A] max-w-[640px]">Where is Abridge today?</h1>
          <p className="mt-3 text-[15.5px] leading-[1.55] text-[#565250] max-w-[560px]">Straight from the impact analysis.</p>

          <div className="mt-9 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] gap-6 lg:gap-8 items-start">
            {/* LEFT: the inputs, grouped. Same values and handlers as before. */}
            <div className="space-y-4">
              <FieldCard title="The partner">
                <Field label="Partner name">
                  <BoxText value={partner} onChange={setPartner} placeholder="e.g., Abridge Healthcare" />
                </Field>
              </FieldCard>
              <FieldCard title="The people">
                <Field label={`How many ${scopeWord} are there in total?`} hint={`the ${settingWord} population, everyone who could use Abridge here`}>
                  <BoxNum value={totalProviders} onChange={setTotalProviders} placeholder="e.g., 90" />
                </Field>
                <Field label="How many are on Abridge today?" hint={totalProviders > 0 ? `of ${fmtInt(totalProviders)} ${scopeWord} with a go-live date` : `${scopeWord} with a go-live date`}>
                  <BoxNum value={onAbridge} onChange={setOnAbridge} placeholder="e.g., 60" />
                </Field>
              </FieldCard>
              {/* Nursing is valued on nurses and patient-days, not on visits: its
                  drivers never read a per-nurse volume or a documented share, so
                  those questions are not asked. */}
              {isNursing ? (
                <FieldCard title="The patients">
                  <Field label="How many staffed beds?" hint="on the units these nurses cover">
                    <BoxNum value={staffedBeds} onChange={setStaffedBeds} placeholder="e.g., 300" />
                  </Field>
                  <Field label="Average occupancy?">
                    <BoxNum value={occupancy} onChange={setOccupancy} suffix="%" />
                  </Field>
                  <Field label="How often is Abridge used per patient?" hint="out of the patients available: used on 1 of 5 patients is 20%">
                    <BoxNum value={utilNow} onChange={setUtilNow} suffix="%" placeholder="e.g., 20" />
                  </Field>
                </FieldCard>
              ) : (
                <FieldCard title={`The ${meta.encWord}`}>
                  <Field label={`About how many ${meta.encWord} does each ${meta.providerWord.replace(/s$/, "")} handle a year?`}>
                    <BoxNum value={encPerProvider} onChange={setEncPerProvider} placeholder="e.g., 2,500" />
                  </Field>
                  <Field label={`What share of ${meta.encWord} are documented with Abridge?`} hint="the documentation utilization % from the impact analysis">
                    <BoxNum value={utilNow} onChange={setUtilNow} suffix="%" placeholder="e.g., 68" />
                  </Field>
                </FieldCard>
              )}
            </div>

            {/* RIGHT: today's footprint, built live from the inputs on the left. */}
            <div className="lg:self-stretch">
            <Footprint
              total={totalProviders}
              onAbridge={onAbridge}
              util={utilNow}
              encToday={encToday}
              totalEnc={totalProviders * encPerProvider}
              adoption={adoptionNow}
              scopeWord={scopeWord}
              encWord={meta.encWord}
              settingWord={settingWord}
              isNursing={isNursing}
              patientDays={staffedBeds * (occupancy / 100) * 365}
            />
            </div>
          </div>
          <NavRow onNext={() => setStep(1)} nextLabel="Next: the drivers" />
        </div>
      )}

      {step === 1 && (
        <div>
          <h1 className="font-abridge text-[28px] sm:text-[34px] leading-[1.12] text-[#1A1A1A] max-w-[640px]">Where does the value show up?</h1>
          <p className="mt-3 text-[15.5px] leading-[1.55] text-[#565250] max-w-[560px]">Turn on what the impact analysis measured.</p>

          <div className="mt-9 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] gap-6 lg:gap-8 items-start">
            {/* LEFT: every driver, grouped by where the value lands. No tabs, so
                the whole picture is always on the page. */}
            <div className="space-y-5">
              {domains.map((dom) => {
                const drivers = DRIVERS[setting].filter((dr) => dr.domain === dom);
                const groupValue = drivers.filter((dr) => enabled[dr.id]).reduce((sum, dr) => sum + (today.valueById[dr.id] ?? 0), 0);
                const showTime = dom === "Capacity" && !isNursing && meta.timeMetric;
                return (
                  <section key={dom} className="rounded-[22px] border border-[#E9E0D4] bg-[#F6F1EA]/90 overflow-hidden" data-testid={`lift-group-${dom}`}>
                    <header
                      role="button"
                      tabIndex={0}
                      aria-expanded={!closedGroups[dom]}
                      onClick={() => setClosedGroups((c) => ({ ...c, [dom]: !c[dom] }))}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setClosedGroups((c) => ({ ...c, [dom]: !c[dom] })); } }}
                      className="group flex items-center gap-4 px-4 sm:px-5 py-3.5 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-inset rounded-t-[22px]">
                      <div className="flex-none w-[76px] h-[48px] rounded-[12px] border border-[#E6DCCE] bg-[#EFE7DC]/70 px-1.5 py-1">{DOMAIN_ART[dom]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#443A32]">{dom}</div>
                        <div className="text-[12.5px] text-[#6B6259] mt-0.5">
                          {drivers.length === 0 ? "Time back, shown as hours" : `${drivers.length} ${drivers.length === 1 ? "driver" : "drivers"}${showTime ? " · plus time back" : ""}`}
                        </div>
                      </div>
                      <div className={`font-abridge text-[22px] tabular-nums ${groupValue > 0 ? "text-[#EA2C00]" : "text-[#C9BDAD]"}`}>
                        {groupValue > 0 ? fmtShort(groupValue) : dom === "Capacity" && hoursReclaimed > 0 ? `${fmtInt(hoursReclaimed)} hrs` : "—"}
                      </div>
                      <span className={`flex-none w-8 h-8 rounded-full border border-[#E2D8CB] bg-white/70 text-[#8A8072] flex items-center justify-center transition-colors group-hover:border-[#EA2C00] group-hover:text-[#EA2C00]`}>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${closedGroups[dom] ? "-rotate-90" : ""}`} />
                      </span>
                    </header>
                    {!closedGroups[dom] && <div className="px-2.5 pb-2.5 space-y-2">
                      {showTime && meta.timeMetric && (
                        <TimeBackBlock table={meta.timeMetric.table} before={timeBefore} after={timeAfter}
                          onBefore={setTimeBefore} onAfter={setTimeAfter} encToday={encToday} hours={hoursReclaimed}
                          dollarized={setting === "outpatient"}
                          placeholderBefore={String(meta.timeMetric.before)} placeholderAfter={String(meta.timeMetric.after)} />
                      )}
                      {drivers.map((dr) => (
                        <DriverCard key={dr.id} driver={dr} vals={vals} setVal={setVal}
                          buildsOn={DEPENDS_ON[dr.id] ? DRIVERS[setting].find((x) => x.id === DEPENDS_ON[dr.id])?.title : undefined}
                          on={!!enabled[dr.id]} onToggle={() => toggle(dr.id)} eligibleEncounters={Math.round(encToday)}
                          hoursReclaimed={hoursReclaimed} providersOnAbridge={onAbridge}
                          value={today.valueById[dr.id] ?? 0} summary={today.summaryById[dr.id] ?? ""} />
                      ))}
                    </div>}
                  </section>
                );
              })}
            </div>

            {/* RIGHT: the lift, adding up live as drivers go on. The wrapper
                stretches to the full row height so the panel can stay in view. */}
            <div className="lg:self-stretch">
            <LiftPanel
              total={todayValue}
              groups={domains.map((dom) => ({
                dom,
                value: DRIVERS[setting].filter((dr) => dr.domain === dom && enabled[dr.id]).reduce((sum, dr) => sum + (today.valueById[dr.id] ?? 0), 0),
              }))}
              items={DRIVERS[setting].filter((dr) => enabled[dr.id]).map((dr) => ({ title: dr.title, value: today.valueById[dr.id] ?? 0 }))}
              hours={hoursReclaimed}
            />
            </div>
          </div>
          <NavRow onNext={() => setStep(2)} nextLabel="See the answer" />
        </div>
      )}

      {step === 2 && (
        <AnswerStep partnerName={partnerName} breakdown={breakdown} todayValue={todayValue}
          potentialValue={potentialValue} headroom={headroom} hoursReclaimed={hoursReclaimed}
          adoptionNow={adoptionNow} utilNow={utilNow} totalProviders={totalProviders}
          targetAdoptionPct={targetAdoptionPct} setTargetAdoptionPct={setTargetAdoptionPct}
          targetUtilPct={targetUtilPct} setTargetUtilPct={setTargetUtilPct} showUtilDial isNursing={isNursing}
          price={price} setPrice={setPrice} onBack={() => setStep(1)} onExport={onExportPdf}
          groups={domains.map((dom) => ({
            dom,
            items: DRIVERS[setting].filter((dr) => dr.domain === dom && enabled[dr.id] && (today.valueById[dr.id] ?? 0) > 0).map((dr) => ({ title: dr.title, value: today.valueById[dr.id] ?? 0 })),
          }))} />
      )}
    </div>
  );
}

function StepShell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="max-w-[760px]">
      <h1 className="font-abridge text-[26px] sm:text-[32px] leading-[1.14] text-[#1A1A1A] max-w-[600px]">{title}</h1>
      <p className="mt-3 mb-9 text-[15px] leading-[1.55] text-[#565250] max-w-[560px]">{sub}</p>
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

/**
 * The lift, adding up live: the total counts up, each value group gets a bar,
 * and every driver that is on is listed with its value. Empty until something
 * is switched on, with a line saying what to do.
 */
function LiftPanel({ total, groups, items, hours }: { total: number; groups: { dom: string; value: number }[]; items: { title: string; value: number }[]; hours: number }) {
  const shown = useAnimatedNumber(total);
  const max = Math.max(1, ...groups.map((g) => g.value));
  const counted = items.filter((i) => i.value > 0);
  return (
    <div className="lg:sticky lg:top-24 rounded-[22px] border border-[#E9E0D4] bg-white shadow-[0_1px_2px_rgba(26,26,26,0.04),0_16px_40px_-24px_rgba(26,26,26,0.24)] overflow-hidden" data-testid="roi-opportunity-panel">
      <div className="px-6 pt-5 pb-4 bg-[#F6F1EA]/80 border-b border-[#E6DCCF]">
        <div className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#EA2C00]">The opportunity</div>
      </div>
      <div className="p-6">
        <div className={`font-abridge text-[52px] leading-none tabular-nums ${total > 0 ? "text-[#1A1A1A]" : "text-[#D6CABA]"}`}>{fmtShort(shown)}</div>
        <div className="mt-2 text-[14.5px] font-semibold text-[#1A1A1A]">
          {counted.length > 0 ? `a year, from ${counted.length} ${counted.length === 1 ? "driver" : "drivers"}` : "a year"}
        </div>
        {hours > 0 && <div className="mt-1 text-[13px] text-[#565250]">plus {fmtInt(hours)} clinician hours given back</div>}

        <div className="mt-6 space-y-3">
          {groups.map((g) => (
            <div key={g.dom}>
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="font-semibold text-[#443A32]">{g.dom}</span>
                <span className={`font-bold tabular-nums ${g.value > 0 ? "text-[#1A1A1A]" : "text-[#C9BDAD]"}`}>{g.value > 0 ? fmtShort(g.value) : "—"}</span>
              </div>
              <div className="mt-1.5 h-2.5 rounded-full bg-[#EFE7DC] overflow-hidden">
                <div className="h-full rounded-full bg-[#EA2C00] transition-[width] duration-700 ease-out" style={{ width: `${(g.value / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-5 border-t border-[#EFE8DE]">
          {counted.length > 0 ? (
            <ul className="space-y-2">
              {counted.map((i) => (
                <motion.li key={i.title} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
                  className="flex items-center justify-between gap-3 text-[13.5px]">
                  <span className="flex items-center gap-2 text-[#1A1A1A]"><span className="w-[6px] h-[6px] rounded-full bg-[#EA2C00]" />{i.title}</span>
                  <span className="font-semibold tabular-nums text-[#443A32]">{fmtShort(i.value)}</span>
                </motion.li>
              ))}
            </ul>
          ) : (
            <p className="text-[13.5px] text-[#6B6259] leading-relaxed">Turn on what was measured. The opportunity builds here.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── The account step's parts ────────────────────────────────────────────────
function FieldCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-[#E9E0D4] bg-[#F6F1EA]/90 px-5 sm:px-6 pt-5 pb-2">
      <div className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#443A32] mb-1">{title}</div>
      <div className="divide-y divide-[#E6DCCF]">{children}</div>
    </div>
  );
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6 py-4">
      <div className="min-w-0">
        <div className="text-[15px] font-semibold text-[#1A1A1A] leading-snug">{label}</div>
        {hint && <div className="text-[12.5px] text-[#6B6259] mt-1 leading-snug">{hint}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
const BOX = "inline-flex items-baseline gap-1.5 rounded-[12px] border border-[#E2D8CB] bg-white pl-4 pr-5 py-2.5 shadow-[inset_0_1px_2px_rgba(26,26,26,0.04)] focus-within:border-[#EA2C00] focus-within:ring-2 focus-within:ring-[#EA2C00]/15 transition-colors";
function BoxNum({ value, onChange, suffix, placeholder }: { value: number; onChange: (n: number) => void; suffix?: string; placeholder?: string }) {
  return (
    <div className={`${BOX} w-[168px]`}>
      <FormattedNumberInput value={value} onChange={onChange} step={1} className={UINPUT_CLASS} placeholder={placeholder} />
      {suffix && <span className="text-[14px] text-[#6B6259]">{suffix}</span>}
    </div>
  );
}
function BoxText({ value, onChange, placeholder }: { value: string; onChange: (s: string) => void; placeholder?: string }) {
  return (
    <div className={`${BOX} w-full sm:w-[300px]`}>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-transparent outline-none text-left text-[17px] font-bold text-[#1A1A1A] placeholder:font-normal placeholder:text-[15px] placeholder:text-[#B5AA9B]" />
    </div>
  );
}

/**
 * Today's Abridge footprint, drawn live: one figure per slice of the provider
 * population (coral = on Abridge), a bar for the share of visits documented, and
 * the visits-on-Abridge number every later dollar multiplies off. The "room to
 * grow" line is plain arithmetic on their inputs (everyone x their visits).
 */
function Footprint({ total, onAbridge, util, encToday, totalEnc, adoption, scopeWord, encWord, settingWord, isNursing = false, patientDays = 0 }: {
  total: number; onAbridge: number; util: number; encToday: number; totalEnc: number; adoption: number; scopeWord: string; encWord: string; settingWord: string;
  isNursing?: boolean; patientDays?: number;
}) {
  const FIG = 40;
  // Nursing's base is patient-days on the covered share of nurses (the same
  // scoping the quality math uses); everyone else's is visits on Abridge.
  const coveredDays = patientDays * (Math.max(0, Math.min(100, util || 0)) / 100);
  const base = isNursing ? coveredDays : encToday;
  const ready = base > 0;
  const on = total > 0 ? Math.round((Math.min(onAbridge, total) / total) * FIG) : 0;
  const shown = useAnimatedNumber(base);
  const utilPct = Math.max(0, Math.min(100, util || 0));
  return (
    <div className="lg:sticky lg:top-24 rounded-[22px] border border-[#E9E0D4] bg-white shadow-[0_1px_2px_rgba(26,26,26,0.04),0_16px_40px_-24px_rgba(26,26,26,0.24)] overflow-hidden" data-testid="roi-footprint">
      <div className="px-6 pt-5 pb-4 bg-[#F6F1EA]/80 border-b border-[#E6DCCF]">
        <div className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#EA2C00]">Today&rsquo;s Abridge footprint</div>
      </div>
      <div className="p-6">
        {/* the people */}
        <div className="rounded-[16px] border border-[#E6DCCE] bg-[#EFE7DC]/60 px-4 py-4">
          <div className="grid grid-cols-10 gap-x-2 gap-y-2.5">
            {Array.from({ length: FIG }).map((_, i) => (
              <svg key={i} viewBox="0 0 12 16" className="w-full h-auto" aria-hidden="true">
                <circle cx="6" cy="4" r="3" className={`transition-colors duration-500 ${i < on ? "fill-[#EA2C00]" : "fill-[#D9CCBB]"}`} style={{ transitionDelay: `${i * 12}ms` }} />
                <path d="M1 15.5 C1 10.5 3.2 8.6 6 8.6 S11 10.5 11 15.5 Z" className={`transition-colors duration-500 ${i < on ? "fill-[#EA2C00]" : "fill-[#E2D6C6]"}`} style={{ transitionDelay: `${i * 12}ms` }} />
              </svg>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-[12.5px]">
            <span className="font-semibold text-[#443A32]">{total > 0 ? `${fmtInt(Math.min(onAbridge, total))} of ${fmtInt(total)} ${scopeWord} on Abridge` : `Your ${scopeWord}`}</span>
            {total > 0 && <span className="font-bold text-[#EA2C00]">{Math.round(adoption)}%</span>}
          </div>
        </div>
        {/* the share of visits (or, for nursing, patients) documented */}
        {<div className="mt-3 rounded-[16px] border border-[#E6DCCE] bg-[#EFE7DC]/60 px-4 py-4">
          <div className="h-3 rounded-full bg-[#E2D6C6] overflow-hidden">
            <div className="h-full rounded-full bg-[#EA2C00] transition-[width] duration-700 ease-out" style={{ width: `${utilPct}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between text-[12.5px]">
            <span className="font-semibold text-[#443A32]">{isNursing ? "Patients documented with Abridge" : `${encWord.charAt(0).toUpperCase() + encWord.slice(1)} documented with Abridge`}</span>
            {util > 0 && <span className="font-bold text-[#EA2C00]">{Math.round(utilPct)}%</span>}
          </div>
        </div>}
        {/* the number */}
        <div className="mt-6">
          {ready ? (
            <>
              <div className="font-abridge text-[52px] leading-none text-[#1A1A1A] tabular-nums">{fmtInt(shown)}</div>
              {isNursing ? (
                <>
                  <div className="mt-2 text-[15px] font-semibold text-[#1A1A1A]">patient-days a year on Abridge-covered units</div>
                  <div className="mt-1.5 text-[13.5px] text-[#565250]">
                    {Math.round(util || 0)}% of {fmtInt(patientDays)} patient-days a year, the base the quality math runs on
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-2 text-[15px] font-semibold text-[#1A1A1A]">{encWord} a year on Abridge today, in {settingWord}</div>
                  {totalEnc > 0 && (
                    <div className="mt-1.5 text-[13.5px] text-[#565250]">
                      of {fmtInt(totalEnc)} {encWord} a year across all {fmtInt(total)} {scopeWord}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <p className="text-[14px] text-[#6B6259] leading-relaxed">Fill in the numbers and the footprint builds here.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Underlined editorial inputs
const UINPUT_CLASS = "flex-1 min-w-0 h-auto border-0 rounded-none bg-transparent p-0 shadow-none text-right text-[19px] font-bold text-[#1A1A1A] tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:not-italic placeholder:font-normal placeholder:text-[15px] placeholder:text-[#C9BDAD]";
function NumInput({ value, onChange, suffix, prefix, step = 1, w = "w-[168px]", placeholder }: { value: number; onChange: (n: number) => void; suffix?: string; prefix?: string; step?: number; w?: string; placeholder?: string }) {
  return (
    <div className={`${w} ${BOX} !py-2 !pl-3.5 !pr-4`}>
      {prefix && <span className="text-[14px] text-[#6B6259]">{prefix}</span>}
      <FormattedNumberInput value={value} onChange={onChange} step={step} className={UINPUT_CLASS} placeholder={placeholder} />
      {suffix && <span className="text-[14px] text-[#A69A88]">{suffix}</span>}
    </div>
  );
}

function NumInputAccent({ value, onChange, suffix, step = 0.01, w = "w-[96px]", placeholder }: { value: number; onChange: (n: number) => void; suffix?: string; step?: number; w?: string; placeholder?: string }) {
  return (
    <div className={`${w} ${BOX} !py-2 !pl-3.5 !pr-4 !border-[#F0C4B4] !bg-[#FFF8F5]`}>
      <FormattedNumberInput value={value} onChange={onChange} step={step} className={UINPUT_CLASS} placeholder={placeholder} />
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

function BeforeAfter({ label, table, unit, before, after, onBefore, onAfter, step = 0.01, lowerIsBetter, placeholderBefore, placeholderAfter }: {
  label: string; table?: string; unit?: string; before: number; after: number; onBefore: (n: number) => void; onAfter: (n: number) => void; step?: number; lowerIsBetter?: boolean; placeholderBefore?: string; placeholderAfter?: string;
}) {
  const delta = lowerIsBetter ? before - after : after - before;
  const good = delta > 0;
  const decimals = unit === "min" ? 1 : 2;
  const bothEntered = before > 0 && after > 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-[14px] font-semibold text-[#1A1A1A]">{label}</span>
        {table && <span className="text-[12px] text-[#6B6259]">from {table}</span>}
      </div>
      <div className="flex items-baseline gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-extrabold tracking-[0.1em] uppercase text-[#6B6259] mb-1">Before</div>
          <NumInput value={before} onChange={onBefore} step={step} suffix={unit} w="w-[150px]" placeholder={placeholderBefore} />
        </div>
        <ArrowRight className="w-4 h-4 text-[#C9BDAD] self-end mb-3.5" />
        <div>
          <div className="text-[10px] font-extrabold tracking-[0.1em] uppercase text-[#EA2C00] mb-1">After</div>
          <NumInputAccent value={after} onChange={onAfter} step={step} suffix={unit} w="w-[150px]" placeholder={placeholderAfter} />
        </div>
        {bothEntered && (
          <span className={`self-end mb-3 ml-1 text-[14px] font-bold whitespace-nowrap ${good ? "text-[#B02200]" : "text-[#B4A896]"}`}>
            {good ? (lowerIsBetter ? "−" : "+") : ""}{Math.abs(delta).toFixed(decimals)} {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-[#443A32] tabular-nums">{children}</span>;
}

/** The engine's own multiplicand formula, behind "Show the math", and the value. */
function WorkedMath({ summary, value }: { summary: string; value: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5 pt-4 border-t border-[#EFE9E0]">
      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-bold transition-colors ${open ? "border-[#EA2C00] text-[#EA2C00] bg-[#FDF1EC]" : "border-[#E2D8CB] text-[#6B6259] bg-white hover:border-[#EA2C00] hover:text-[#EA2C00]"}`}>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "" : "-rotate-90"}`} /> {open ? "Hide the math" : "Show the math"}
        </button>
        <span className={`font-abridge text-[26px] leading-none tabular-nums ${value > 0 ? "text-[#EA2C00]" : "text-[#C9BDAD]"}`}>{fmtShort(value)}<span className="text-[13px] text-[#6B6259]"> a year</span></span>
      </div>
      {open && <div className="mt-3 rounded-[12px] bg-[#F6F1EA] px-4 py-3 text-[14px] leading-[1.8] text-[#443A32]">{summary || "Enter the numbers above to build this."}</div>}
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
function DriverShell({ title, on, onToggle, value, children, note, buildsOn }: {
  title: string; on: boolean; onToggle: () => void; value: number; children: React.ReactNode; note?: string; buildsOn?: string;
}) {
  return (
    <div className={`rounded-[16px] border transition-all duration-200 ${on ? "bg-white border-[#E9E0D4] shadow-[0_1px_2px_rgba(26,26,26,0.04),0_8px_22px_-16px_rgba(26,26,26,0.16)]" : "bg-[#FBF8F4]/80 border-[#EBE3D8] hover:border-[#DDD2C4]"}`}>
      <div className="flex items-center justify-between gap-4 px-4 sm:px-5 py-3.5">
        <button type="button" onClick={onToggle} className="flex-1 min-w-0 text-left outline-none">
          <span className={`block text-[15.5px] font-semibold ${on ? "text-[#1A1A1A]" : "text-[#443A32]"}`}>{title}</span>
        </button>
        <div className="flex items-center gap-3.5">
          {on && <span className={`font-abridge text-[17px] tabular-nums ${value > 0 ? "text-[#EA2C00]" : "text-[#C9BDAD]"}`}>{fmtShort(value)}</span>}
          <Toggle on={on} onToggle={onToggle} label={`Include ${title}`} />
        </div>
      </div>
      {on && <div className="px-4 sm:px-5 pb-4 pt-1">{children}</div>}
    </div>
  );
}

/** Renders one engine driver: before/after (if any) + its editable fields + the worked math. */
function DriverCard({ driver, vals, setVal, on, onToggle, value, summary, eligibleEncounters, hoursReclaimed, providersOnAbridge, buildsOn }: {
  buildsOn?: string;
  driver: RoiDriver; vals: Record<string, number>; setVal: (k: string, v: number) => void;
  on: boolean; onToggle: () => void; value: number; summary: string; eligibleEncounters: number;
  hoursReclaimed: number; providersOnAbridge: number;
}) {
  if (driver.kind === "hcc") {
    return <HccDriverCard driver={driver} vals={vals} setVal={setVal} on={on} onToggle={onToggle} value={value} summary={summary} />;
  }
  if (driver.id === "drgAccuracy") {
    return <DrgFunnelCard vals={vals} setVal={setVal} on={on} onToggle={onToggle} value={value} discharges={eligibleEncounters} />;
  }
  if (driver.id === "patientAccess") {
    return <PatientAccessCard driver={driver} vals={vals} setVal={setVal} on={on} onToggle={onToggle} value={value} summary={summary} hoursReclaimed={hoursReclaimed} providersOnAbridge={providersOnAbridge} />;
  }
  const workStr = driver.work ? driver.work(vals, eligibleEncounters) : summary;
  const ba = driver.beforeAfter;
  return (
    <DriverShell title={driver.title} on={on} onToggle={onToggle} value={value} note={driver.note} buildsOn={buildsOn}>
      {driver.note && <p className="text-[13px] leading-[1.55] text-[#565250] max-w-[560px] mb-1">{driver.note}</p>}
      {buildsOn && (
        <p className="mt-2 mb-1 inline-flex items-center gap-2 rounded-full bg-[#F6F1EA] border border-[#E2D8CB] px-3 py-1 text-[12px] font-semibold text-[#443A32]">
          Uses the turnover numbers in {buildsOn}
        </p>
      )}
      {ba && (
        <div className={driver.note ? "mt-5" : ""}>
          <BeforeAfter label={ba.label} table={ba.table} unit={ba.unit} step={ba.step ?? 0.01}
            before={vals[ba.beforeK]} after={vals[ba.afterK]}
            onBefore={(v) => setVal(ba.beforeK, v)} onAfter={(v) => setVal(ba.afterK, v)}
            lowerIsBetter={ba.lowerIsBetter}
            placeholderBefore={String(ba.beforeDef)} placeholderAfter={String(ba.afterDef)} />
        </div>
      )}
      {driver.fields.map((f) =>
        f.k === "cf" ? (
          <ConversionField key={f.k} medicare={f.def} value={vals.cf} basis={vals.cfBasis ?? 0}
            onChange={(v, basis) => { setVal("cf", v); setVal("cfBasis", basis); }} />
        ) : (
          <FieldRow key={f.k} field={f} value={vals[f.k]} onChange={(v) => setVal(f.k, v)} />
        ),
      )}
      <WorkedMath summary={workStr} value={value} />
    </DriverShell>
  );
}

/**
 * Paid per wRVU, with its basis named. Medicare 2026 fills the published
 * conversion factor; Blended rate clears the box for the organization's own
 * number (never a guessed commercial rate). Typing a different number while on
 * Medicare flips the basis to Blended, so the label always matches the number.
 * cfBasis rides in the driver values (0 = Medicare, 1 = blended); the engine
 * ignores it.
 */
function ConversionField({ medicare, value, basis, onChange }: { medicare: number; value: number; basis: number; onChange: (v: number, basis: number) => void }) {
  const isMedicare = basis === 0;
  const chip = (on: boolean) =>
    `text-[12px] font-bold rounded-full px-3.5 py-1.5 border transition-colors ${on ? "border-[#EA2C00] bg-[#FDF1EC] text-[#EA2C00]" : "border-[#E2D8CB] bg-white text-[#565250] hover:border-[#EA2C00] hover:text-[#EA2C00]"}`;
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="text-[14px] font-medium text-[#1A1A1A]">Paid per wRVU</div>
          <div className="text-[12px] text-[#6B6259] mt-0.5">{isMedicare ? "Medicare 2026 conversion factor" : "Blended rate across payers"}</div>
        </div>
        <NumInput value={value} onChange={(v) => onChange(v, isMedicare && Math.abs(v - medicare) > 0.001 ? 1 : basis)}
          prefix="$" step={0.1} w="w-[120px]" placeholder={isMedicare ? undefined : "from finance"} />
      </div>
      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
        <button type="button" onClick={() => onChange(medicare, 0)} className={chip(isMedicare)}>Medicare 2026 · ${medicare.toFixed(2)}</button>
        <button type="button" onClick={() => onChange(isMedicare ? 0 : value, 1)} className={chip(!isMedicare)}>Blended rate</button>
      </div>
    </div>
  );
}

function FieldRow({ field, value, onChange }: { field: RoiField; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-6 mt-5">
      <div className="min-w-0">
        <div className="text-[14px] font-medium text-[#1A1A1A]">{field.label}</div>
        {field.hint && <div className="text-[12px] text-[#6B6259] mt-0.5">{field.hint}</div>}
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
    <DriverShell title={driver.title} on={on} onToggle={onToggle} value={value} note="Valued on the panel, once per member per year.">
      <p className="text-[13px] leading-[1.55] text-[#565250] max-w-[540px] mb-1">Risk capture is valued on the panel, once per member per year, never per visit. What is modelled here is recapture on the conditions a member already carries.</p>

      {pops.length > 0 && (
        <div className="mt-5 flex items-center gap-2 flex-wrap">
          {pops.map((p, i) => (
            <button key={p.label} onClick={() => { setPopIdx(i); setVal("hccPerHcc", p.perHcc); }}
              className={`text-[12px] font-bold rounded-full px-3.5 py-1.5 border transition-colors ${i === popIdx ? "border-[#EA2C00] bg-[#FDF1EC] text-[#EA2C00]" : "border-[#E2D8CB] bg-white text-[#565250] hover:border-[#EA2C00] hover:text-[#EA2C00]"}`}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-6 mt-6">
        <div className="min-w-0">
          <div className="text-[14px] font-medium text-[#1A1A1A]">Risk-adjusted members Abridge covers</div>
          <div className="text-[12.5px] text-[#6B6259] mt-1">the {pops[popIdx]?.label ?? ""} panel the providers see</div>
        </div>
        <NumInput value={vals.hccMembers} onChange={(v) => setVal("hccMembers", v)} placeholder="e.g., 45,000" w="w-[128px]" />
      </div>

      {driver.fields.filter((f) => f.k !== "hccMembers").map((f) => (
        <FieldRow key={f.k} field={f} value={vals[f.k]} onChange={(v) => setVal(f.k, v)} />
      ))}

      <WorkedMath summary={summary} value={value} />
    </DriverShell>
  );
}

/**
 * Patient access — anchored on the OBSERVED added visits a live partner already
 * sees, not an assumed reinvest %. The read-back shows what share of the
 * reclaimed hours those visits use, so the number stays tied to the time proof.
 */
function PatientAccessCard({ driver, vals, setVal, on, onToggle, value, summary, hoursReclaimed, providersOnAbridge }: {
  driver: RoiDriver; vals: Record<string, number>; setVal: (k: string, v: number) => void;
  on: boolean; onToggle: () => void; value: number; summary: string; hoursReclaimed: number; providersOnAbridge: number;
}) {
  const V = vals.accessVisitsPerProvWk || 0;
  const dur = vals.visitDuration || 30;
  const addedVisits = V * providersOnAbridge * 48;
  const hoursConsumed = addedVisits * (dur / 60);
  const pct = hoursReclaimed > 0 ? Math.round((hoursConsumed / hoursReclaimed) * 100) : 0;
  return (
    <DriverShell title={driver.title} on={on} onToggle={onToggle} value={value} note={driver.note}>
      {driver.note && <p className="text-[13px] leading-[1.55] text-[#565250] max-w-[560px] mb-1">{driver.note}</p>}
      {driver.fields.map((f) => (
        <FieldRow key={f.k} field={f} value={vals[f.k]} onChange={(v) => setVal(f.k, v)} />
      ))}
      {V > 0 && hoursReclaimed > 0 && (
        <div className="mt-6 rounded-lg bg-[#F3EEE7] px-4 py-3.5 text-[13px] leading-[1.6] text-[#5E534A]">
          That is about <span className="font-bold text-[#443A32]">{fmtInt(addedVisits)}</span> more visits a year, which uses <span className="font-bold text-[#443A32]">{pct}%</span> of the <span className="font-bold text-[#443A32]">{fmtInt(hoursReclaimed)}</span> clinician hours Abridge reclaimed.{" "}
          {pct > 100
            ? "That is more than the reclaimed time alone, so lean on the observed visits and treat the rest as other workflow gains."
            : "The rest of that time stays as capacity."}
        </div>
      )}
      <WorkedMath summary={summary} value={value} />
    </DriverShell>
  );
}

/** Centered, coral, editable rate/number for the DRG funnel table. */
function PctEdit({ value, onChange, suffix = "%", prefix, step = 1 }: { value: number; onChange: (n: number) => void; suffix?: string; prefix?: string; step?: number }) {
  return (
    <span className="inline-flex items-baseline justify-center gap-1 border-b-2 border-[#F3C9BC] pb-0.5 w-[72px]">
      {prefix && <span className="text-[12px] text-[#A69A88]">{prefix}</span>}
      <FormattedNumberInput value={value} onChange={onChange} step={step}
        className="h-auto border-0 rounded-none bg-transparent p-0 shadow-none text-center text-[15px] font-bold text-[#EA2C00] tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0"
        style={{ width: `${String(value).length + 2}ch` }} />
      {suffix && <span className="text-[12px] text-[#A69A88]">{suffix}</span>}
    </span>
  );
}

/**
 * DRG accuracy, modeled as the CDI query funnel. The funnel is the CDI program's
 * baseline (theirs). Abridge's value is the DELTA on the discharges the funnel
 * misses — the leak — netted for audit survival. No attribution/defensible haircut.
 */
function DrgFunnelCard({ vals, setVal, on, onToggle, value, discharges }: {
  vals: Record<string, number>; setVal: (k: string, v: number) => void;
  on: boolean; onToggle: () => void; value: number; discharges: number;
}) {
  const reviewed = discharges * (vals.ipDrgCdiReviewRate / 100);
  const queried = reviewed * (vals.ipDrgQueryRate / 100);
  const responded = queried * (vals.ipDrgResponseRate / 100);
  const changed = responded * (vals.ipDrgChangeRate / 100);
  const cdiRevenue = changed * vals.ipDrgWeightGain * vals.ipDrgBaseRate;
  const lost = Math.max(0, queried - changed); // flagged gaps that die in the funnel
  const abridgeCases = lost * (vals.ipDrgUpfrontCapture / 100);
  const GRID = "grid grid-cols-[1fr_84px_96px] items-baseline";

  const FRow = ({ step, rateK, prefix, suffix, cases, bold }: { step: string; rateK?: string; prefix?: string; suffix?: string; cases: string; bold?: boolean }) => (
    <div className={`${GRID} py-[11px] border-t border-[#EFE9E0]`}>
      <span className={`text-[15px] text-[#1A1A1A] ${bold ? "font-bold" : ""}`}>{step}</span>
      <span className="text-right">{rateK ? <PctEdit value={vals[rateK]} onChange={(v) => setVal(rateK, v)} prefix={prefix} suffix={suffix ?? "%"} step={suffix === "" ? 0.05 : 1} /> : <span className="text-[14px] text-[#A69A88]">—</span>}</span>
      <span className={`text-right tabular-nums ${bold ? "font-abridge text-[19px] text-[#EA2C00]" : "text-[15px] text-[#1A1A1A]"}`}>{cases}</span>
    </div>
  );

  return (
    <DriverShell title="DRG accuracy (CMI)" on={on} onToggle={onToggle} value={value}>
      <p className="text-[13px] leading-[1.55] text-[#565250] max-w-[560px] mb-1">DRG revenue moves through the CDI query funnel. This is what it catches today; Abridge is the delta on the gaps your team flags but loses.</p>

      <div className={`${GRID} mt-6 text-[10px] font-extrabold tracking-[0.1em] uppercase text-[#A69A88]`}>
        <span>What the CDI funnel catches today</span><span className="text-right">Rate</span><span className="text-right">Cases</span>
      </div>
      <FRow step="Annual discharges" cases={fmtInt(discharges)} />
      <FRow step="Reviewed by CDI" rateK="ipDrgCdiReviewRate" cases={fmtInt(reviewed)} />
      <FRow step="Query issued" rateK="ipDrgQueryRate" cases={fmtInt(queried)} />
      <FRow step="Physician responds" rateK="ipDrgResponseRate" cases={fmtInt(responded)} />
      <FRow step="Response changes the DRG" rateK="ipDrgChangeRate" cases={fmtInt(changed)} bold />
      <div className="flex items-baseline justify-between gap-3 py-[11px] border-t border-[#EFE9E0] text-[13px] text-[#565250]">
        <span className="italic flex items-baseline gap-1.5 flex-wrap">Each moves ~<PctEdit value={vals.ipDrgWeightGain} onChange={(v) => setVal("ipDrgWeightGain", v)} suffix="" step={0.05} /> weight, at <PctEdit value={vals.ipDrgBaseRate} onChange={(v) => setVal("ipDrgBaseRate", v)} prefix="$" suffix="" step={250} />/weight</span>
        <span className="whitespace-nowrap">= {fmtShort(cdiRevenue)} <span className="text-[#A69A88]">to CDI</span></span>
      </div>

      <div className="mt-6 rounded-xl px-5 py-4 bg-[#FBF3EE] border border-[#F3DDD2]">
        <p className="text-[14.5px] leading-[1.5] text-[#1A1A1A]">Of the <b>{fmtInt(queried)}</b> gaps your CDI team flags, only <b>{fmtInt(changed)}</b> get corrected. The other <b className="text-[#EA2C00]">{fmtInt(lost)}</b> die in the query process, with no response or one that doesn't stick. Abridge captures the acuity up front, so those land at the right DRG without a query.</p>
      </div>

      <div className={`${GRID} mt-6 text-[10px] font-extrabold tracking-[0.1em] uppercase text-[#A69A88]`}>
        <span>What Abridge adds, on top</span><span className="text-right">Rate</span><span className="text-right">Cases</span>
      </div>
      <FRow step="Flagged but lost" cases={fmtInt(lost)} />
      <FRow step="Captured by Abridge" rateK="ipDrgUpfrontCapture" cases={fmtInt(abridgeCases)} bold />

      <WorkedMath summary={`${fmtInt(lost)} flagged-but-lost × ${vals.ipDrgUpfrontCapture}% captured by Abridge (${fmtInt(abridgeCases)} cases) × ${vals.ipDrgWeightGain} weight × $${fmtInt(vals.ipDrgBaseRate)}/weight`} value={value} />
    </DriverShell>
  );
}

/** Reclaimed documentation time, shown as a COUNT of clinician hours, never dollarized here. */
function TimeBackBlock({ table, before, after, onBefore, onAfter, encToday, hours, dollarized, placeholderBefore, placeholderAfter }: {
  table: string; before: number; after: number; onBefore: (n: number) => void; onAfter: (n: number) => void;
  encToday: number; hours: number; dollarized: boolean; placeholderBefore?: string; placeholderAfter?: string;
}) {
  const hasNumbers = encToday > 0 && hours > 0;
  const fte = hours / 2080; // 2,080 = one clinician's paid hours a year
  return (
    <div className="rounded-[16px] border border-[#E9E0D4] bg-white px-4 sm:px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[15.5px] font-semibold text-[#1A1A1A]">Time back in the day</span>
        <span className="rounded-full bg-[#F2ECE2] px-3 py-1 text-[10px] font-extrabold tracking-[0.12em] uppercase text-[#8C7F6D] whitespace-nowrap">{dollarized ? "Measured · shown as time" : "Measured · not counted in $"}</span>
      </div>
      <div className="mt-5">
        <BeforeAfter label="Minutes in notes per encounter" table={table} unit="min" step={0.1}
          before={before} after={after} onBefore={onBefore} onAfter={onAfter} lowerIsBetter
          placeholderBefore={placeholderBefore} placeholderAfter={placeholderAfter} />
      </div>
      <div className="mt-5 pt-4 border-t border-[#EFE9E0]">
        {hasNumbers ? (
          <>
            <div className="text-[15px] leading-[1.9] text-[#5E534A]">
              <Mono>{Math.max(0, before - after).toFixed(1)} min</Mono> saved × <Mono>{fmtInt(encToday)}</Mono> Abridge encounters ÷ 60
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-[13px] text-[#A69A88]">equals</span>
              <span className="font-abridge text-[34px] leading-none text-[#1A1A1A]">{fmtInt(hours)}<span className="text-[15px] text-[#9A8C7A]"> clinician hours a year</span></span>
            </div>
            <div className="mt-2.5 text-right text-[13px] text-[#565250]">
              about <span className="font-bold text-[#443A32]">{fte.toFixed(1)}</span> full-time clinicians' worth of documentation time, back on the floor
            </div>
            <p className="mt-5 text-[13px] leading-[1.55] text-[#565250]">
              {dollarized
                ? "Shown as time given back. The share reinvested into visits is valued below, in Patient access."
                : "Shown as time given back, never converted to a made-up dollar."}
            </p>
          </>
        ) : (
          <p className="text-[13.5px] leading-[1.55] text-[#6B6259]">
            Enter the minutes before and after to see the hours given back.
          </p>
        )}
      </div>
    </div>
  );
}

function NavRow({ onBack, onNext, nextLabel }: { onBack?: () => void; onNext: () => void; nextLabel: string }) {
  return (
    <div className="flex items-center justify-between mt-10">
      {/* Back lives in the header (top left), like every screen. */}
      <span />
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
  showUtilDial: boolean; isNursing?: boolean; price: number; setPrice: (n: number) => void; onBack: () => void; onExport: () => void;
  groups: { dom: string; items: { title: string; value: number }[] }[];
}) {
  const todayShown = useCountUp(p.todayValue);
  const potentialShown = useCountUp(p.potentialValue);
  const roi = p.price > 0 ? p.todayValue / p.price : 0;
  const todayPct = p.potentialValue > 0 ? (p.todayValue / p.potentialValue) * 100 : 0;
  const headroomPct = Math.max(0, 100 - todayPct);
  const dollarLevers = p.breakdown;
  const makeup = [
    dollarLevers.map((r) => r.title).join(", "),
    p.hoursReclaimed > 0 ? `${fmtInt(p.hoursReclaimed)} clinician hours back` : "",
  ].filter(Boolean).join(", plus ");

  // Nothing is on: show an intentional empty state, not "$0" + a stray meter.
  if (p.todayValue <= 0 && p.potentialValue <= 0) {
    return (
      <div>
        <div className={EYEBROW}>The answer</div>
        <h1 className="font-abridge text-[30px] sm:text-[36px] leading-[1.12] text-[#1A1A1A] mt-4 max-w-[540px]">No drivers are on yet</h1>
        <p className="mt-5 text-[16px] leading-[1.6] text-[#5E534A] max-w-[520px]">Go back and switch on the drivers your data supports. Each one you turn on builds the number here.</p>
        <button onClick={p.onBack} className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#EA2C00] text-white text-[14px] font-bold px-7 py-3.5 hover:bg-[#d12800] transition-colors">
          Back to the drivers <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const groups = p.groups.map((g) => ({ ...g, value: g.items.reduce((sum, i) => sum + i.value, 0) }));
  const maxGroup = Math.max(1, ...groups.map((g) => g.value));
  const driverCount = groups.reduce((n, g) => n + g.items.length, 0);
  const CARD = "rounded-[22px] border border-[#E9E0D4] shadow-[0_1px_2px_rgba(26,26,26,0.04),0_16px_40px_-26px_rgba(26,26,26,0.22)]";

  return (
    <div className="space-y-5">
      {/* THE ANSWER */}
      <section className={`${CARD} bg-white overflow-hidden`} data-testid="roi-answer-hero">
        <div className="px-6 sm:px-9 pt-8 pb-8 bg-[linear-gradient(180deg,#F6F1EA_0%,#FFFFFF_100%)]">
          <div className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[#EA2C00]">The answer</div>
          <h1 className="font-abridge text-[24px] sm:text-[30px] leading-[1.14] text-[#1A1A1A] mt-3">{p.partnerName ? `To ${p.partnerName}, Abridge is worth` : "Abridge is worth"}</h1>
          <div className="font-abridge text-[64px] sm:text-[96px] leading-[0.9] text-[#EA2C00] mt-2 tabular-nums">{fmtShort(todayShown)}<span className="text-[24px] sm:text-[28px] text-[#6B6259] font-normal"> a year</span></div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-white border border-[#E2D8CB] px-3 py-1 text-[12.5px] font-semibold text-[#443A32]">{driverCount} {driverCount === 1 ? "driver" : "drivers"}</span>
            <span className="rounded-full bg-white border border-[#E2D8CB] px-3 py-1 text-[12.5px] font-semibold text-[#443A32]">today&rsquo;s {Math.round(p.adoptionNow)}% rollout</span>
            <span className="rounded-full bg-white border border-[#E2D8CB] px-3 py-1 text-[12.5px] font-semibold text-[#443A32]">{Math.round(p.utilNow)}% {p.isNursing ? "use per patient" : "utilization"}</span>
            {p.hoursReclaimed > 0 && <span className="rounded-full bg-white border border-[#E2D8CB] px-3 py-1 text-[12.5px] font-semibold text-[#443A32]">plus {fmtInt(p.hoursReclaimed)} clinician hours back</span>}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-5 items-stretch">
        {/* WHERE IT COMES FROM */}
        <section className={`${CARD} bg-[#F6F1EA]/90 p-5 sm:p-6`} data-testid="roi-answer-breakdown">
          <div className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#443A32] mb-4">Where it comes from</div>
          <div className="space-y-2.5">
            {groups.map((g) => (
              <div key={g.dom} className={`rounded-[16px] border px-3.5 py-3 ${g.value > 0 ? "bg-white border-[#E9E0D4]" : "bg-[#FBF8F4]/70 border-[#EBE3D8]"}`}>
                <div className="flex items-center gap-3">
                  <div className="flex-none w-[56px] h-[36px] rounded-[9px] border border-[#E6DCCE] bg-[#EFE7DC]/70 px-1 py-0.5 max-sm:hidden">{DOMAIN_ART[g.dom]}</div>
                  <span className="w-[86px] max-sm:w-[78px] flex-none text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#443A32]">{g.dom}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-[#EFE7DC] overflow-hidden">
                    <div className="h-full rounded-full bg-[#EA2C00] transition-[width] duration-700 ease-out" style={{ width: `${(g.value / maxGroup) * 100}%` }} />
                  </div>
                  <span className={`min-w-[64px] text-right font-abridge text-[17px] tabular-nums whitespace-nowrap ${g.value > 0 || (g.dom === "Capacity" && p.hoursReclaimed > 0) ? "text-[#1A1A1A]" : "text-[#C9BDAD]"}`}>
                    {g.value > 0 ? fmtShort(g.value) : g.dom === "Capacity" && p.hoursReclaimed > 0 ? `${fmtInt(p.hoursReclaimed)} hrs` : "—"}
                  </span>
                </div>
                {g.items.length > 0 && (
                  <div className="mt-2 pl-[154px] max-sm:pl-0 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-[#565250]">
                    {g.items.map((i) => (
                      <span key={i.title}>{i.title} <span className="font-semibold text-[#1A1A1A] tabular-nums">{fmtShort(i.value)}</span></span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* THE RETURN: price in, multiple and net out. No payback month. */}
        <section className={`${CARD} bg-white p-5 sm:p-6 flex flex-col`} data-testid="roi-answer-return">
          <div className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#443A32]">The return</div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="text-[14px] font-semibold text-[#1A1A1A]">Abridge price<div className="text-[12px] font-normal text-[#6B6259] mt-0.5">per year</div></div>
            <div className={`${BOX} w-[180px]`}>
              <span className="text-[15px] text-[#6B6259]">$</span>
              <FormattedNumberInput value={p.price} onChange={p.setPrice} className={UINPUT_CLASS} placeholder="contract rate" />
            </div>
          </div>
          <div className="mt-6 pt-5 border-t border-[#EFE8DE] flex-1 flex flex-col justify-center">
            {p.price > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-abridge text-[52px] sm:text-[60px] leading-none text-[#EA2C00] tabular-nums">{roi.toFixed(1)}×</div>
                  <div className="text-[12.5px] font-semibold text-[#443A32] mt-2">return on the Abridge spend</div>
                </div>
                <div>
                  <div className="font-abridge text-[52px] sm:text-[60px] leading-none text-[#1A1A1A] tabular-nums">{fmtShort(p.todayValue - p.price)}</div>
                  <div className="text-[12.5px] font-semibold text-[#443A32] mt-2">net a year, after the price</div>
                </div>
              </div>
            ) : (
              <p className="text-[14px] text-[#6B6259] leading-relaxed">Add the Abridge price to see the return multiple and the net.</p>
            )}
          </div>
        </section>
      </div>

      {/* THE UPSIDE */}
      <section className={`${CARD} bg-white p-5 sm:p-7`} data-testid="roi-answer-upside">
        <div className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#443A32]">The upside, with more of the organization on Abridge</div>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <span className="font-abridge text-[40px] sm:text-[52px] leading-[0.95] text-[#1A1A1A] tabular-nums">{fmtShort(potentialShown)}<span className="text-[18px] text-[#6B6259] font-normal"> a year</span></span>
          <span className="font-abridge text-[20px] text-[#EA2C00]">+{fmtShort(p.headroom)} on the table</span>
        </div>
        <div className="mt-6">
          <div className="h-3.5 rounded-full bg-[#EFE7DC] overflow-hidden flex">
            <div className="h-full bg-[#EA2C00] transition-all duration-500" style={{ width: `${todayPct}%` }} />
            <div className="h-full bg-[#F6B7A6] transition-all duration-500" style={{ width: `${headroomPct}%` }} />
          </div>
          <div className="flex justify-between mt-2.5 text-[12.5px]">
            <span className="flex items-center gap-1.5 text-[#443A32] font-semibold"><span className="w-2 h-2 rounded-full bg-[#EA2C00]" /> Today {fmtShort(p.todayValue)}</span>
            <span className="flex items-center gap-1.5 text-[#443A32] font-semibold"><span className="w-2 h-2 rounded-full bg-[#F6B7A6]" /> On the table {fmtShort(p.headroom)}</span>
          </div>
        </div>
        <div className={`mt-7 grid grid-cols-1 ${p.showUtilDial ? "md:grid-cols-2" : ""} gap-4`}>
          <Slider label={p.isNursing ? "More nurses on Abridge" : "More providers on Abridge"} value={p.targetAdoptionPct} min={Math.round(p.adoptionNow)} onChange={p.setTargetAdoptionPct} right={`${fmtInt(Math.round(p.totalProviders * p.targetAdoptionPct / 100))} of ${fmtInt(p.totalProviders)}`} />
          {p.showUtilDial && (
            <Slider label={p.isNursing ? "Using Abridge with more patients" : "Documenting more encounters with Abridge"} value={p.targetUtilPct} min={Math.round(p.utilNow)} onChange={p.setTargetUtilPct} right={`${p.targetUtilPct}%`} />
          )}
        </div>
        <p className="mt-5 text-[13px] leading-[1.6] text-[#565250]">The measured effect stays where the data put it. Only the volume it runs on grows.</p>
      </section>

      <div className="pt-3 flex items-center justify-end">
        <button onClick={p.onExport} className="inline-flex items-center gap-2 rounded-full bg-[#EA2C00] text-white text-[15px] font-bold px-8 py-4 hover:bg-[#d12800] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-2 shadow-[0_10px_24px_-12px_rgba(234,44,0,0.6)]">
          <Download className="w-4 h-4" /> Export the one-pager
        </button>
      </div>
    </div>
  );
}

function Slider({ label, value, min, onChange, right }: { label: string; value: number; min: number; onChange: (n: number) => void; right: string }) {
  const lo = Math.max(0, Math.floor(min));
  const pct = 100 > lo ? ((value - lo) / (100 - lo)) * 100 : 100;
  return (
    <div className="rounded-[16px] border border-[#E9E0D4] bg-[#F6F1EA]/80 px-4 py-3.5">
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-[14px] font-semibold text-[#1A1A1A]">{label}</span>
        <span className="font-abridge text-[16px] text-[#EA2C00] tabular-nums">{right}</span>
      </div>
      <input type="range" step={1} min={lo} max={100} value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{ background: `linear-gradient(90deg, #EA2C00 ${pct}%, #E4D8C8 ${pct}%)` }}
        className="roi-range w-full h-1.5 rounded-full appearance-none cursor-pointer" />
    </div>
  );
}
