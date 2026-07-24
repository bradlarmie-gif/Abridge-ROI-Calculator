import { Fragment, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ChevronDown, Building2, HeartPulse, BedDouble, Stethoscope, Plus, Minus, TrendingUp, TrendingDown } from "lucide-react";
import type { ProformaSettingSnapshot, ProformaConfig, ProformaSummary, ProformaDriver } from "./proformaTypes";
import { SETTING_COLORS, SETTING_LABELS, SETTING_UNIT_LABELS } from "./proformaTypes";
import { AnimatedValue } from "@/components/explore/AnimatedValue";
import { computeSettingDriverFormulas } from "@/lib/presentFormulas";

/**
 * Present mode — a guided, full-screen story for walking a room of executives
 * through the business case: open on the combined outcome, a chapter per care
 * setting, then combine. Same numbers/engine as the build view; this is a lens
 * on top. Dark "lights-down" stage that echoes the hub's dark hero, with the
 * Abridge coral + per-setting colors so it reads as the same product.
 */

const ICONS: Record<string, typeof Building2> = {
  outpatient: Building2,
  ed: HeartPulse,
  inpatient: BedDouble,
  nursing: Stethoscope,
};

// Quadrant palette tuned for the dark stage (the build view's #1A1A1A Revenue /
// dark slate would vanish on black) — same families, lifted for contrast.
const QUADRANT: { key: keyof QuadrantValues; label: string; color: string }[] = [
  { key: "capacityValue", label: "Capacity", color: "#FF5230" },
  { key: "workforceValue", label: "Workforce", color: "#93A4BC" },
  { key: "revenueValue", label: "Revenue", color: "#E8DCC8" },
  { key: "qualityValue", label: "Quality", color: "#8A8F99" },
];

interface QuadrantValues {
  capacityValue: number;
  workforceValue: number;
  revenueValue: number;
  qualityValue: number;
}

const CORAL = "#FF5230";

// Quadrant dot color (matches the composition bar above) keyed by the driver's
// quadrant name.
const QUADRANT_COLOR: Record<string, string> = {
  Capacity: "#FF5230",
  Workforce: "#93A4BC",
  Revenue: "#E8DCC8",
  Quality: "#8A8F99",
};

// Plain, CFO-readable "what this actually is" line per driver — keyed by the
// proforma driver id (see ExploreModel snapshot builder). We show the mechanism
// + each driver's share of the setting's value, NOT a raw formula: the proforma
// scales driver values to the deployment, so a printed formula wouldn't tie out
// to the dollar shown. Mechanism + share is honest and reconciles.
const DRIVER_BLURB: Record<string, string> = {
  patientAccess: "Reclaimed documentation time turned into added patient visits",
  edLwbs: "Patients who would have left without being seen, now kept",
  edAdmission: "Appropriate admissions captured from recovered ED throughput",
  costReduction: "Direct operating cost removed",
  nursingOt: "Overtime hours avoided as charting speeds up",
  scribeCost: "Scribe spend removed as Abridge covers the documentation role",
  wrvu: "More complete notes supporting accurate visit-level coding",
  hcc: "Chronic conditions documented and risk-adjusted correctly",
  denials: "Denials avoided through cleaner, more defensible documentation",
  ipDrg: "Inpatient stays coded to the correct severity",
  ipObsDefense: "Observation-vs-inpatient status defended against downgrades",
  docQuality: "Cleaner documentation flowing through to reimbursement",
  retention: "Providers retained who would otherwise have left",
  nursingHapi: "Pressure-injury risk caught and documented earlier",
  nursingFalls: "Fall risk surfaced and acted on sooner",
  nursingCauti: "Catheter-bundle compliance documented consistently",
  nursingClabsi: "Line-bundle compliance documented consistently",
  nursingSepsis: "SEP-1 sepsis bundle steps documented on time",
};

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) {
    const k = Math.round(n / 1_000);
    if (Math.abs(k) >= 1_000) return `$${(n / 1_000_000).toFixed(1)}M`; // $999.5k+ rolls to $1.0M, never "$1000K"
    return `$${k.toLocaleString()}K`;
  }
  return `$${Math.round(n).toLocaleString()}`;
}
function fmtNum(n: number): string {
  return Math.round(n).toLocaleString();
}
// "A → B suffix", collapsed to just "A suffix" when there's no ramp (start === end).
function rampLabel(a: number, b: number, suffix = ""): string {
  const tail = suffix ? ` ${suffix}` : "";
  return Math.round(a) === Math.round(b)
    ? `${fmtNum(a)}${tail}`
    : `${fmtNum(a)} → ${fmtNum(b)}${tail}`;
}
function termLabel(months: number): string {
  return `${months / 12}-Year`;
}

interface ProformaPresentProps {
  settings: ProformaSettingSnapshot[];
  config: ProformaConfig;
  summary: ProformaSummary;
  perSettingTotals: Record<string, { contractValue: number; contractInvestment: number }>;
  orgName: string;
  onOrgNameChange: (name: string) => void;
  onExit: () => void;
}

const KICKER = "text-[11px] font-semibold uppercase tracking-[3px] text-white/40";

export default function ProformaPresent({ settings, config, summary, perSettingTotals, orgName, onOrgNameChange, onExit }: ProformaPresentProps) {
  // Arc: 0 = Time, 1 = Dollars, 2..N+1 = each setting, N+2 = Together, N+3 = Close.
  const N = settings.length;
  const FIRST_SETTING = 2;
  const COMBINE_BEAT = N + 2;
  const CLOSE_BEAT = N + 3;
  const totalBeats = N + 4;
  const [beat, setBeat] = useState(0);
  const [showMath, setShowMath] = useState(false);

  useEffect(() => { setShowMath(false); }, [beat]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack typing in the org-name field.
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
        if (e.key === "Escape") (el as HTMLInputElement).blur();
        return;
      }
      if (e.key === "ArrowRight") setBeat(b => Math.min(b + 1, totalBeats - 1));
      else if (e.key === "ArrowLeft") setBeat(b => Math.max(b - 1, 0));
      else if (e.key === "Escape") onExit();
      else if (/^[1-9]$/.test(e.key)) {
        // Jump straight to a care setting (1 = first setting) — agility on a call.
        const n = parseInt(e.key, 10);
        if (n <= N) setBeat(FIRST_SETTING + n - 1);
      } else if (e.key === "0") setBeat(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [totalBeats, N, onExit]);

  const term = termLabel(config.contractTermMonths);

  // Labeled chapters for the jump rail.
  const chapters = [
    { label: "Time", beat: 0 },
    { label: "Value", beat: 1 },
    ...settings.map((s, i) => ({ label: SETTING_LABELS[s.careSetting] || s.label, beat: FIRST_SETTING + i })),
    { label: "Together", beat: COMBINE_BEAT },
    { label: "The case", beat: CLOSE_BEAT },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-50 text-white overflow-hidden"
      style={{ background: "radial-gradient(120% 120% at 50% 0%, #1C1813 0%, #100E0C 55%, #0A0908 100%)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="proforma-present"
    >
      {/* Top bar: chapter rail (scrolls horizontally on small screens) + exit.
          A flex header so the rail and exit can never overlap on a phone. */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 px-3 py-3 sm:px-4">
        <div className="flex flex-1 items-center justify-start gap-1 overflow-x-auto sm:justify-center [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chapters.map((c) => (
            <button
              key={c.beat}
              onClick={() => setBeat(c.beat)}
              className="shrink-0 rounded-full px-3 py-1 text-[11px] font-medium tracking-wide transition-colors"
              style={
                c.beat === beat
                  ? { backgroundColor: CORAL, color: "#fff" }
                  : { color: "rgba(255,255,255,0.4)" }
              }
              onMouseEnter={(e) => { if (c.beat !== beat) e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}
              onMouseLeave={(e) => { if (c.beat !== beat) e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
              data-testid={`present-chapter-${c.beat}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          onClick={onExit}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          data-testid="button-present-exit"
        >
          <X className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Exit</span>
        </button>
      </div>

      {/* Stage — scrolls vertically so nothing clips on short/small screens */}
      <div className="absolute inset-0 overflow-y-auto">
        <div className="flex min-h-full w-full items-center justify-center px-5 py-24 sm:px-6">
          <div className="w-full max-w-[920px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={beat}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {beat === 0 && <TimeBeat settings={settings} totalHours={settings.reduce((s, v) => s + (v.totalHoursSaved || 0), 0)} orgName={orgName} onOrgNameChange={onOrgNameChange} />}
              {beat === 1 && <DollarsBeat settings={settings} summary={summary} term={term} showMath={showMath} />}
              {beat >= FIRST_SETTING && beat < COMBINE_BEAT && (() => {
                const s = settings[beat - FIRST_SETTING];
                return (
                  <SettingBeat
                    setting={s}
                    index={beat - FIRST_SETTING + 1}
                    count={N}
                    totals={perSettingTotals[s.id] ?? { contractValue: 0, contractInvestment: 0 }}
                    term={term}
                    showMath={showMath}
                    systemFee={config.systemWideFee ?? 0}
                  />
                );
              })()}
              {beat === COMBINE_BEAT && (
                <CombineBeat settings={settings} summary={summary} perSettingTotals={perSettingTotals} term={term} showMath={showMath} systemFee={config.systemWideFee ?? 0} />
              )}
              {beat === CLOSE_BEAT && (
                <CloseBeat summary={summary} term={term} orgName={orgName} totalHours={settings.reduce((s, v) => s + (v.totalHoursSaved || 0), 0)} />
              )}
            </motion.div>
          </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bottom bar: show-math (left) · nav (center) — a flex bar so they
          never collide on a phone. */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-2 px-3 py-3 sm:px-4">
        <button
          onClick={() => setShowMath(s => !s)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          data-testid="button-present-show-math"
        >
          {showMath ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{showMath ? "Hide the math" : "Show the math"}</span>
        </button>

        <div className="flex items-center gap-4 sm:gap-5">
          <button
            onClick={() => setBeat(b => Math.max(b - 1, 0))}
            disabled={beat === 0}
            className="rounded-full p-1.5 text-white/50 transition hover:text-white disabled:opacity-25"
            data-testid="button-present-prev"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-[11px] tabular-nums tracking-widest text-white/35">{beat + 1} / {totalBeats}</span>
          <button
            onClick={() => setBeat(b => Math.min(b + 1, totalBeats - 1))}
            disabled={beat === totalBeats - 1}
            className="rounded-full p-1.5 text-white/50 transition hover:text-white disabled:opacity-25"
            data-testid="button-present-next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <span className="w-8 shrink-0" aria-hidden />
      </div>
    </motion.div>
  );
}

// ── Beat 0: TIME — the operational truth that starts the story ────────────────
// Lead with the hours handed back (count up), then the engine that turns them
// into value: expansion (pilot → full) and adoption (utilization climbing).
function TimeBeat({ settings, totalHours, orgName, onOrgNameChange }: {
  settings: ProformaSettingSnapshot[];
  totalHours: number;
  orgName: string;
  onOrgNameChange: (name: string) => void;
}) {
  const ease = [0.22, 1, 0.36, 1] as const;
  const pilot = settings.reduce((s, v) => s + (v.providerCount || 0), 0);
  const full = settings.reduce((s, v) => s + (v.fullScaleProviders || 0), 0);
  // Name the NON-time value actually in this deal, so the open doesn't read as
  // "Abridge is just a time-saver" — but never claims a pillar that isn't there.
  const revTotal = settings.reduce((s, v) => s + (v.revenueValue || 0), 0);
  const qualTotal = settings.reduce((s, v) => s + (v.qualityValue || 0), 0);
  const otherValue = [revTotal > 0 ? "captured revenue" : null, qualTotal > 0 ? "clinical quality" : null].filter(Boolean) as string[];
  const breadth = otherValue.length > 0
    ? `Time is the most visible return. The same documentation also shows up as ${otherValue.join(" and ")}.`
    : "Time is the most visible return, not the only one.";
  // Adoption = provider-weighted blend of each setting's ACTUAL utilization
  // (start → at scale), so it's true for a mixed multi-setting deal rather than
  // the org-wide default ramp.
  const wPilot = pilot || 1;
  const wFull = full || 1;
  const utilStart = Math.round(settings.reduce((s, v) => s + (v.utilizationPercent || 0) * (v.providerCount || 0), 0) / wPilot);
  const utilEnd = Math.round(settings.reduce((s, v) => s + ((v.fullScaleUtilization || v.utilizationPercent || 0)) * (v.fullScaleProviders || 0), 0) / wFull);

  // Providers and nursing beds are different units — never sum them together.
  const provSettings = settings.filter(s => s.careSetting !== "nursing");
  const bedSettings = settings.filter(s => s.careSetting === "nursing");
  const sumKey = (arr: ProformaSettingSnapshot[], k: "providerCount" | "fullScaleProviders") => arr.reduce((s, v) => s + (v[k] || 0), 0);
  const engineStats: { label: string; value: string; accent?: boolean }[] = [];
  if (provSettings.length > 0) {
    engineStats.push({
      label: bedSettings.length > 0 ? "Providers" : "Expansion",
      value: rampLabel(sumKey(provSettings, "providerCount"), sumKey(provSettings, "fullScaleProviders")),
    });
  }
  if (bedSettings.length > 0) {
    engineStats.push({
      label: "Beds",
      value: rampLabel(sumKey(bedSettings, "providerCount"), sumKey(bedSettings, "fullScaleProviders")),
    });
  }
  engineStats.push({ label: "Adoption", value: utilEnd > 0 ? (utilStart === utilEnd ? `${utilEnd}%` : `${utilStart}% → ${utilEnd}%`) : "—", accent: true });
  engineStats.push({ label: "Care settings", value: `${settings.length}` });
  return (
    <div className="text-center">
      <motion.div
        className="flex items-center justify-center gap-1.5"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
      >
        <input
          value={orgName}
          onChange={(e) => onOrgNameChange(e.target.value)}
          placeholder="Organization"
          className="bg-transparent text-right text-[11px] font-semibold uppercase tracking-[3px] text-white/45 placeholder-white/20 focus:text-white/80 focus:outline-none"
          // +5ch headroom so uppercase + letter-spacing never clips the value/placeholder.
          style={{ width: `${Math.max(orgName.length, "Organization".length) + 5}ch` }}
          data-testid="present-org-name"
        />
        <span className={KICKER}>· Business Case</span>
      </motion.div>

      <motion.div
        className="mt-10"
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25, ease }}
      >
        <AnimatedValue
          value={totalHours}
          format={fmtNum}
          fromZero
          duration={1300}
          className="block text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight"
        />
        <p className="mt-3 text-lg text-white/50">clinician hours reclaimed every year</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/35">{breadth}</p>
      </motion.div>

      {/* The engine: expansion + adoption — why the value grows */}
      <motion.div
        className="mt-9 inline-flex flex-wrap items-center justify-center gap-x-7 gap-y-4 rounded-2xl border border-white/10 bg-white/[0.03] px-7 py-4"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.5, ease }}
      >
        {engineStats.map((st, i) => (
          <Fragment key={st.label}>
            {i > 0 && <span className="hidden h-8 w-px bg-white/10 sm:block" />}
            <Stat label={st.label} value={st.value} accent={st.accent} />
          </Fragment>
        ))}
      </motion.div>

      <motion.p
        className="mx-auto mt-10 max-w-md text-sm leading-relaxed text-white/35"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 1.8 }}
      >
        The more your team adopts it and the wider you roll it out, the more time comes back. The value scales right alongside it.
      </motion.p>
    </div>
  );
}

// ── Beat 1: DOLLARS — what that reclaimed time is worth ───────────────────────
// Sequenced reveal: the big number lands alone, then the proof.
function DollarsBeat({ settings, summary, term, showMath }: {
  settings: ProformaSettingSnapshot[];
  summary: ProformaSummary;
  term: string;
  showMath: boolean;
}) {
  const settingNames = settings.map(s => SETTING_LABELS[s.careSetting] || s.label).join(" · ");
  const ease = [0.22, 1, 0.36, 1] as const;
  return (
    <div className="text-center">
      <motion.p className={KICKER} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        What that time is worth
      </motion.p>

      <motion.div
        className="mt-8"
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2, ease }}
      >
        <AnimatedValue
          value={summary.termNet}
          format={fmt}
          fromZero
          duration={1300}
          className="block text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight"
          style={{ color: CORAL }}
        />
        <p className="mt-3 text-lg text-white/50">Net value over the {term.toLowerCase()} term</p>
        <p className="mt-1 text-sm text-white/30">Status quo delivers none of it. This is the lift.</p>
      </motion.div>

      <motion.div
        className="mt-9 inline-flex items-center gap-6 rounded-2xl border border-white/10 bg-white/[0.03] px-7 py-4"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 1.4, ease }}
      >
        <Stat label="Value-to-cost" value={summary.valueToCost > 0 ? `${summary.valueToCost.toFixed(1)}×` : "—"} accent />
        <span className="h-8 w-px bg-white/10" />
        <Stat label="Payback" value={summary.paybackMonth ? `${summary.paybackMonth} mo` : "—"} />
      </motion.div>

      <motion.p
        className="mt-12 text-sm text-white/35"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 1.7 }}
      >
        {settingNames}
      </motion.p>

      <AnimatePresence>
        {showMath && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-auto mt-8 grid max-w-lg grid-cols-1 gap-x-10 gap-y-3 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-6 text-left sm:grid-cols-2 sm:px-8">
              <MathRow label="Annual value at scale" value={fmt(summary.runRateValue)} />
              <MathRow label={`${term} total value`} value={fmt(summary.termValue)} />
              <MathRow label={`${term} investment`} value={fmt(summary.termInvestment)} />
              <MathRow label={`Net ${term.toLowerCase()} value`} value={fmt(summary.termNet)} accent />
              {summary.displacementSavings > 0 && (
                <MathRow label="+ Vendor spend displaced (separate savings)" value={fmt(summary.displacementSavings)} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Beats 2..N: one care setting ──────────────────────────────────────────────
function SettingBeat({ setting, index, count, totals, term, showMath, systemFee }: {
  setting: ProformaSettingSnapshot;
  index: number;
  count: number;
  totals: { contractValue: number; contractInvestment: number };
  term: string;
  showMath: boolean;
  systemFee: number;
}) {
  const Icon = ICONS[setting.careSetting] || Building2;
  const color = SETTING_COLORS[setting.careSetting] || CORAL;
  const unit = SETTING_UNIT_LABELS[setting.careSetting] || "providers";
  const multiple = totals.contractInvestment > 0 ? totals.contractValue / totals.contractInvestment : 0;
  // At-scale formula per driver (only those that reconcile to the dollar shown).
  const formulas = useMemo(() => computeSettingDriverFormulas(setting), [setting]);

  // Full-screen "show the math" view — one driver at a time, anchored to this setting.
  const mathDrivers = useMemo(() => setting.drivers.filter(d => d.value > 0), [setting]);
  const [mathIdx, setMathIdx] = useState(0);
  if (showMath && mathDrivers.length > 0) {
    return (
      <SettingMathView
        setting={setting} index={index} count={count} color={color} Icon={Icon}
        formulas={formulas} drivers={mathDrivers}
        activeIdx={Math.min(mathIdx, mathDrivers.length - 1)} onIdx={setMathIdx}
      />
    );
  }

  const segs = QUADRANT
    .map(q => ({ ...q, value: (setting[q.key] as number) ?? 0 }))
    .filter(s => s.value > 0);
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;

  return (
    <div>
      <div className="flex items-center justify-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}22` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </span>
        <p className={KICKER}>Care setting {index} of {count}</p>
      </div>

      <h2 className="mt-5 text-center text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">{SETTING_LABELS[setting.careSetting] || setting.label}</h2>

      <div className="mt-8 text-center">
        {setting.annualValue > 0 ? (
          <>
            <AnimatedValue value={setting.annualValue} format={fmt} fromZero duration={950}
              className="block text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight" style={{ color }} />
            <p className="mt-2 text-base text-white/50">annual value at scale</p>
            <p className="mt-1 text-sm text-white/30">None of this is captured today — every dollar is net-new.</p>
          </>
        ) : (
          <>
            <span className="block text-5xl font-bold text-white/70">Qualitative</span>
            <p className="mt-2 text-base text-white/50">strategic value, not dollarized</p>
          </>
        )}
      </div>

      {/* Composition — bespoke, grows on entry */}
      {segs.length > 0 && (
        <div className="mx-auto mt-9 max-w-xl">
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            {segs.map((s, i) => (
              <motion.div
                key={s.key}
                initial={{ width: 0 }}
                animate={{ width: `${(s.value / total) * 100}%` }}
                transition={{ duration: 0.7, delay: 0.25 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                style={{ backgroundColor: s.color }}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1.5">
            {segs.map(s => (
              <span key={s.key} className="text-xs text-white/55">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: s.color }} />
                {s.label} <span className="text-white/40">{fmt(s.value)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Supporting line — wraps on small screens instead of overflowing. When
          this setting has no direct cost (it's covered by the system-wide fee),
          show the value + a clear note instead of dead "—" investment stats. */}
      {totals.contractInvestment > 0 ? (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-4 text-center">
          <Stat label={`${term} value`} value={fmt(totals.contractValue)} />
          <span className="hidden h-8 w-px bg-white/10 sm:block" />
          <Stat label="Investment" value={fmt(totals.contractInvestment)} />
          <span className="hidden h-8 w-px bg-white/10 sm:block" />
          <Stat label="Value-to-cost" value={multiple > 0 ? `${multiple.toFixed(1)}×` : "—"} accent />
        </div>
      ) : (
        <div className="mt-10 text-center">
          <Stat label={`${term} value`} value={fmt(totals.contractValue)} />
          <p className="mt-3 text-sm text-white/35">
            {systemFee > 0 ? "Cost is carried by the system-wide fee, shown in Together." : "No direct cost entered for this setting."}
          </p>
        </div>
      )}

      <p className="mt-7 text-center text-sm text-white/35">
        {rampLabel(setting.providerCount, setting.fullScaleProviders, unit)} &middot; live month {setting.goLiveMonth}
      </p>

      {mathDrivers.length > 0 && (
        <p className="mt-8 text-center text-xs text-white/25">Show the math to see how every dollar is built.</p>
      )}
    </div>
  );
}

// Full-screen per-driver calculation view for a care setting (the "show the math" takeover).
function SettingMathView({ setting, index, count, color, Icon, formulas, drivers, activeIdx, onIdx }: {
  setting: ProformaSettingSnapshot;
  index: number;
  count: number;
  color: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  formulas: Record<string, string>;
  drivers: ProformaDriver[];
  activeIdx: number;
  onIdx: (i: number) => void;
}) {
  const active = drivers[activeIdx] ?? drivers[0];
  const driverTotal = drivers.reduce((s, d) => s + d.value, 0) || 1;
  const formula = formulas[active.id];
  const factors = formula ? formula.split(" × ") : [];
  const prev = drivers[(activeIdx - 1 + drivers.length) % drivers.length];
  const next = drivers[(activeIdx + 1) % drivers.length];

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}22` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </span>
        <p className={KICKER}>{SETTING_LABELS[setting.careSetting] || setting.label} &middot; setting {index} of {count}</p>
      </div>

      <motion.div key={active.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        <h2 className="mt-6 text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">{active.name}</h2>
        <p className="mt-3 text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight" style={{ color }}>{fmt(active.value)}</p>
        <p className="mt-2 text-sm text-white/40">
          {Math.round((active.value / driverTotal) * 100)}% of this setting&rsquo;s value
          {DRIVER_BLURB[active.id] ? ` · ${DRIVER_BLURB[active.id]}` : ""}
        </p>

        {factors.length > 0 ? (
          <div className="mx-auto mt-9 max-w-md text-left">
            {factors.map((f, idx) => (
              <div key={idx} className="flex items-baseline gap-3 border-b border-white/[0.05] py-2.5 last:border-0">
                <span className="w-5 flex-shrink-0 text-right text-lg text-white/25">{idx === 0 ? "" : "×"}</span>
                <span className="text-lg sm:text-xl text-white/85">{f}</span>
              </div>
            ))}
            <div className="mt-3 flex items-baseline gap-3 border-t border-white/15 pt-3.5">
              <span className="w-5 flex-shrink-0 text-right text-2xl text-white/30">=</span>
              <span className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color }}>{fmt(active.value)}</span>
            </div>
          </div>
        ) : (
          <p className="mx-auto mt-9 max-w-md text-base text-white/50">Strategic value — not reduced to a single formula.</p>
        )}
      </motion.div>

      {drivers.length > 1 && (
        <>
          <div className="mt-11 flex items-center justify-center gap-5 sm:gap-8">
            <button
              type="button"
              onClick={() => onIdx((activeIdx - 1 + drivers.length) % drivers.length)}
              className="flex max-w-[42%] items-center gap-1.5 text-sm text-white/45 transition-colors hover:text-white"
              data-testid="present-math-prev"
            >
              <ChevronLeft className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{prev.name}</span>
            </button>
            <span className="text-white/15">·</span>
            <button
              type="button"
              onClick={() => onIdx((activeIdx + 1) % drivers.length)}
              className="flex max-w-[42%] items-center gap-1.5 text-sm text-white/45 transition-colors hover:text-white"
              data-testid="present-math-next"
            >
              <span className="truncate">{next.name}</span>
              <ChevronRight className="h-4 w-4 flex-shrink-0" />
            </button>
          </div>
          <p className="mt-3 text-[11px] uppercase tracking-wider text-white/25">Driver {activeIdx + 1} of {drivers.length}</p>
        </>
      )}
    </div>
  );
}

// ── Beat N+1: combine ─────────────────────────────────────────────────────────
function CombineBeat({ settings, summary, perSettingTotals, term, showMath, systemFee }: {
  settings: ProformaSettingSnapshot[];
  summary: ProformaSummary;
  perSettingTotals: Record<string, { contractValue: number; contractInvestment: number }>;
  term: string;
  showMath: boolean;
  systemFee: number;
}) {
  const contributions = settings
    .map(s => ({ id: s.id, label: SETTING_LABELS[s.careSetting] || s.label, color: SETTING_COLORS[s.careSetting] || CORAL, value: s.annualValue }))
    .filter(s => s.value > 0);
  const total = contributions.reduce((s, x) => s + x.value, 0) || 1;

  // Value ramp across the term — the "when it lands" payoff. Providers can be flat,
  // but adoption climbing (and partial year-1 from go-live timing) ramps realized value
  // toward the at-scale run-rate. Realized value ≈ annual value × (providers/full) ×
  // (adoption/full) × (months live / 12 in year 1).
  const termYears = parseInt(term, 10) || 1;
  const yearFactors = [1, 2, 3].slice(0, Math.max(termYears, 1)).map(yr =>
    settings.reduce((s, v) => {
      const yp = v.yearlyProviders;
      const prov = yr === 1 ? (yp?.year1 ?? v.providerCount)
        : yr === 2 ? (yp?.year2 ?? Math.round(((v.providerCount || 0) + (v.fullScaleProviders || 0)) / 2))
        : (yp?.year3 ?? v.fullScaleProviders);
      const yu = v.yearlyUtilization;
      const util = yr === 1 ? (yu?.year1 ?? v.utilizationPercent)
        : yr === 2 ? (yu?.year2 ?? Math.round(((v.utilizationPercent || 0) + (v.fullScaleUtilization || v.utilizationPercent || 0)) / 2))
        : (yu?.year3 ?? v.fullScaleUtilization ?? v.utilizationPercent);
      const fullProv = v.fullScaleProviders || v.providerCount || 1;
      const fullUtil = v.fullScaleUtilization || v.utilizationPercent || 1;
      const rampFrac = Math.min(1, (prov / fullProv) * (util / fullUtil));
      const liveFraction = yr === 1 ? Math.max(0, (12 - ((v.goLiveMonth || 1) - 1)) / 12) : 1;
      return s + (v.annualValue || 0) * rampFrac * liveFraction;
    }, 0),
  );
  // Anchor the final year to the at-scale run-rate shown above; scale earlier years to it.
  const lastFactor = yearFactors[yearFactors.length - 1] || 1;
  const yearValue = yearFactors.map(f => (lastFactor > 0 ? summary.runRateValue * (f / lastFactor) : 0));
  const valueMax = Math.max(...yearValue, 1);

  return (
    <div className="text-center">
      <p className={KICKER}>Together</p>
      <h2 className="mt-4 text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">The full picture</h2>

      <div className="mt-9">
        <AnimatedValue value={summary.runRateValue} format={fmt} fromZero duration={1000}
          className="block text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight" style={{ color: CORAL }} />
        <p className="mt-2 text-base text-white/50">combined annual value at scale</p>
      </div>

      {/* Per-setting contribution to the total */}
      {contributions.length > 0 && (
        <div className="mx-auto mt-9 max-w-2xl">
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            {contributions.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ width: 0 }}
                animate={{ width: `${(c.value / total) * 100}%` }}
                transition={{ duration: 0.7, delay: 0.25 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                style={{ backgroundColor: c.color }}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-1.5">
            {contributions.map(c => (
              <span key={c.id} className="text-xs text-white/55">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: c.color }} />
                {c.label} <span className="text-white/40">{fmt(c.value)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-11 flex flex-wrap items-center justify-center gap-x-7 gap-y-4">
        <Stat label={`${term} total`} value={fmt(summary.termValue)} />
        <span className="hidden h-9 w-px bg-white/10 sm:block" />
        <Stat label="Investment" value={fmt(summary.termInvestment)} />
        <span className="hidden h-9 w-px bg-white/10 sm:block" />
        <Stat label={`Net ${term.toLowerCase()}`} value={fmt(summary.termNet)} accent />
        <span className="hidden h-9 w-px bg-white/10 sm:block" />
        <Stat label="Payback" value={summary.paybackMonth ? `${summary.paybackMonth} mo` : "—"} />
        {summary.displacementSavings > 0 && (
          <>
            <span className="hidden h-9 w-px bg-white/10 sm:block" />
            <Stat label="Vendor spend displaced" value={fmt(summary.displacementSavings)} />
          </>
        )}
      </div>

      {/* When it lands — realized value builds over the term toward the run-rate */}
      {yearValue.length > 1 && (
        <div className="mx-auto mt-11 max-w-md">
          <p className={`${KICKER} mb-4`}>When it lands</p>
          <div className="flex items-end justify-center gap-4">
            {yearValue.map((val, i) => (
              <div key={i} className="flex-1">
                <motion.div
                  className="mx-auto w-3/5 rounded-t"
                  initial={{ height: 0 }}
                  animate={{ height: `${20 + (val / valueMax) * 64}px` }}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  style={{ backgroundColor: i === yearValue.length - 1 ? CORAL : "rgba(255,255,255,0.18)" }}
                />
                <p className="mt-2 text-[11px] text-white/40">Year {i + 1}</p>
                <p className="text-sm font-semibold text-white/85">{fmt(val)}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-white/35">
            Value builds as adoption climbs; the {fmt(summary.runRateValue)}/yr run-rate is fully on by year {termYears}.
          </p>
        </div>
      )}

      <AnimatePresence>
        {showMath && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-6 text-left">
              <p className={`${KICKER} mb-4`}>By care setting</p>
              <div className="space-y-2.5">
                {settings.map(s => {
                  const t = perSettingTotals[s.id] ?? { contractValue: 0, contractInvestment: 0 };
                  const m = t.contractInvestment > 0 ? t.contractValue / t.contractInvestment : 0;
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-white/70">{SETTING_LABELS[s.careSetting] || s.label}</span>
                      <span className="text-white/45">
                        {fmt(t.contractValue)} value &middot; {t.contractInvestment > 0 ? fmt(t.contractInvestment) : "—"} cost
                        {m > 0 && <span className="ml-2" style={{ color: CORAL }}>{m.toFixed(1)}×</span>}
                      </span>
                    </div>
                  );
                })}
                {systemFee > 0 && (
                  <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-2.5 text-sm">
                    <span className="text-white/70">System-wide fee</span>
                    <span className="text-white/45">{fmt(systemFee * (parseInt(term, 10) || 1))} cost · covers every setting</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Beat N+3: CLOSE — the landing ─────────────────────────────────────────────
function CloseBeat({ summary, term, orgName, totalHours }: {
  summary: ProformaSummary;
  term: string;
  orgName: string;
  totalHours: number;
}) {
  const ease = [0.22, 1, 0.36, 1] as const;

  // Sensitivity band: ±20% on realized value, recomputed against the fixed investment.
  const SENS = 0.2;
  const inv = summary.termInvestment || 1;
  const scenarios = [
    { key: "Conservative", value: summary.termValue * (1 - SENS), base: false },
    { key: "Base", value: summary.termValue, base: true },
    { key: "Optimistic", value: summary.termValue * (1 + SENS), base: false },
  ].map(s => ({ ...s, net: s.value - summary.termInvestment, vtc: s.value / inv }));
  const cons = scenarios[0];

  // Operational signals the buyer would watch to confirm the value is real.
  const signals: { label: string; dir: "up" | "down" }[] = [
    { label: "Documentation time per note", dir: "down" },
    { label: "Visits per provider / day", dir: "up" },
    { label: "Coding accuracy (E/M level)", dir: "up" },
    { label: "Claim denial rate", dir: "down" },
    { label: "After-hours charting", dir: "down" },
  ];

  return (
    <div className="text-center">
      <motion.p className={KICKER} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        {orgName ? orgName : "The case"}
      </motion.p>
      <motion.h2
        className="mt-5 text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15, ease }}
      >
        Even the conservative case pays.
      </motion.h2>

      {/* Sensitivity band — Conservative / Base / Optimistic */}
      <motion.div
        className="mx-auto mt-9 max-w-2xl"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35, ease }}
      >
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10">
          {scenarios.map(s => (
            <div key={s.key} className={`px-2 py-5 sm:px-4 ${s.base ? "bg-[#1b1b1b]" : "bg-[#111111]"}`}>
              <p className={`text-[10px] uppercase tracking-wider ${s.base ? "text-white/65" : "text-white/35"}`}>{s.key}</p>
              <p className="mt-2 text-xl sm:text-3xl font-bold tracking-tight" style={s.base ? { color: CORAL } : { color: "rgba(255,255,255,0.85)" }}>{fmt(s.net)}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/30">net {term.toLowerCase()}</p>
              <p className="mt-2.5 text-xs sm:text-sm font-semibold text-white/65">{s.vtc.toFixed(1)}× value-to-cost</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-white/35">
          Range reflects ±20% on realized value — adoption and coding accuracy vary by site.
          {cons.vtc > 1 ? ` Even at the conservative end it returns ${cons.vtc.toFixed(1)}× and pays for itself.` : ""}
        </p>
      </motion.div>

      {/* Signals to track — how you'll know it's working */}
      <motion.div
        className="mx-auto mt-10 max-w-md"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.55, ease }}
      >
        <p className={`${KICKER} mb-4`}>What to watch as it works</p>
        <div className="space-y-2.5 text-left">
          {signals.map(sig => (
            <div key={sig.label} className="flex items-center justify-between border-b border-white/[0.06] pb-2 last:border-0 last:pb-0">
              <span className="text-sm text-white/70">{sig.label}</span>
              <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: CORAL }}>
                {sig.dir === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {sig.dir === "up" ? "up" : "down"}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.p
        className="mx-auto mt-10 max-w-lg text-sm leading-relaxed text-white/40"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.85 }}
      >
        {fmtNum(totalHours)} clinician hours reclaimed a year — status quo captures none of it. Clinician time first, and the dollars that follow.
      </motion.p>
    </div>
  );
}

// ── shared bits ───────────────────────────────────────────────────────────────
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold tracking-tight" style={accent ? { color: CORAL } : undefined}>{value}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wider text-white/40">{label}</p>
    </div>
  );
}

function MathRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-white/55">{label}</span>
      <span className="font-semibold" style={accent ? { color: CORAL } : { color: "rgba(255,255,255,0.9)" }}>{value}</span>
    </div>
  );
}
