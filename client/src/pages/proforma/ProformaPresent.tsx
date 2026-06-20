import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ChevronDown, Building2, HeartPulse, BedDouble, Stethoscope, Plus, Minus } from "lucide-react";
import type { ProformaSettingSnapshot, ProformaConfig, ProformaSummary } from "./proformaTypes";
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
  ipCdi: "Fewer documentation queries to chase down",
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
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}
function fmtNum(n: number): string {
  return Math.round(n).toLocaleString();
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
              {beat === 0 && <TimeBeat settings={settings} config={config} totalHours={settings.reduce((s, v) => s + (v.totalHoursSaved || 0), 0)} orgName={orgName} onOrgNameChange={onOrgNameChange} />}
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
                  />
                );
              })()}
              {beat === COMBINE_BEAT && (
                <CombineBeat settings={settings} summary={summary} perSettingTotals={perSettingTotals} term={term} showMath={showMath} />
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
function TimeBeat({ settings, config, totalHours, orgName, onOrgNameChange }: {
  settings: ProformaSettingSnapshot[];
  config: ProformaConfig;
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
  const utilStart = config.yearlyUtilization?.year1 ?? 0;
  const utilEnd = config.yearlyUtilization?.year3 ?? config.yearlyUtilization?.year2 ?? utilStart;
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
        <Stat label="Expansion" value={`${fmtNum(pilot)} → ${fmtNum(full)}`} />
        <span className="hidden h-8 w-px bg-white/10 sm:block" />
        <Stat label="Adoption" value={utilEnd > 0 ? `${utilStart}% → ${utilEnd}%` : "—"} accent />
        <span className="hidden h-8 w-px bg-white/10 sm:block" />
        <Stat label="Care settings" value={`${settings.length}`} />
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Beats 2..N: one care setting ──────────────────────────────────────────────
function SettingBeat({ setting, index, count, totals, term, showMath }: {
  setting: ProformaSettingSnapshot;
  index: number;
  count: number;
  totals: { contractValue: number; contractInvestment: number };
  term: string;
  showMath: boolean;
}) {
  const Icon = ICONS[setting.careSetting] || Building2;
  const color = SETTING_COLORS[setting.careSetting] || CORAL;
  const unit = SETTING_UNIT_LABELS[setting.careSetting] || "providers";
  const multiple = totals.contractInvestment > 0 ? totals.contractValue / totals.contractInvestment : 0;
  // At-scale formula per driver (only those that reconcile to the dollar shown).
  const formulas = useMemo(() => computeSettingDriverFormulas(setting), [setting]);
  const [openDriver, setOpenDriver] = useState<string | null>(null);

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
            <p className="mt-1 text-sm text-white/30">Captured today: $0. Every dollar is net-new.</p>
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

      {/* Supporting line — wraps on small screens instead of overflowing */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-4 text-center">
        <Stat label={`${term} value`} value={fmt(totals.contractValue)} />
        <span className="hidden h-8 w-px bg-white/10 sm:block" />
        <Stat label="Investment" value={totals.contractInvestment > 0 ? fmt(totals.contractInvestment) : "—"} />
        <span className="hidden h-8 w-px bg-white/10 sm:block" />
        <Stat label="Value-to-cost" value={multiple > 0 ? `${multiple.toFixed(1)}×` : "—"} accent />
      </div>

      <p className="mt-7 text-center text-sm text-white/35">
        {fmtNum(setting.providerCount)} &rarr; {fmtNum(setting.fullScaleProviders)} {unit} &middot; live month {setting.goLiveMonth}
      </p>

      <AnimatePresence>
        {showMath && setting.drivers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-6 text-left sm:px-8">
              <p className={`${KICKER} mb-4`}>How this is built</p>
              {(() => {
                const shown = setting.drivers.filter(d => d.value > 0);
                const driverTotal = shown.reduce((s, d) => s + d.value, 0) || 1;
                return (
                  <div className="space-y-3">
                    {shown.map(d => {
                      const formula = formulas[d.id];
                      const isOpen = openDriver === d.id;
                      return (
                        <div key={d.id} className="border-b border-white/[0.06] pb-2.5 last:border-0 last:pb-0">
                          <button
                            type="button"
                            disabled={!formula}
                            onClick={() => setOpenDriver(isOpen ? null : d.id)}
                            className={`flex w-full items-baseline justify-between gap-3 text-left ${formula ? "cursor-pointer" : "cursor-default"}`}
                            data-testid={`present-driver-${d.id}`}
                          >
                            <span className="flex items-center gap-2 text-sm text-white/85">
                              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: QUADRANT_COLOR[d.quadrant] || "#888" }} />
                              {d.name}
                              {formula && (
                                <ChevronDown className={`h-3.5 w-3.5 text-white/30 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                              )}
                            </span>
                            <span className="flex-shrink-0 text-sm font-semibold text-white/90">{fmt(d.value)}</span>
                          </button>
                          <p className="mt-1 pl-4 text-xs leading-relaxed text-white/40">
                            {Math.round((d.value / driverTotal) * 100)}% of value
                            {DRIVER_BLURB[d.id] ? ` · ${DRIVER_BLURB[d.id]}` : ""}
                          </p>
                          <AnimatePresence>
                            {isOpen && formula && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <p className="mt-2 ml-4 rounded-lg bg-black/30 px-3 py-2 text-[11px] leading-relaxed text-white/55">
                                  {formula} <span className="text-white/80">= {fmt(d.value)}</span>
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                    <p className="pt-1 text-[11px] text-white/25">{Object.keys(formulas).length > 0 ? "Tap a driver to see how it's calculated." : ""}</p>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Beat N+1: combine ─────────────────────────────────────────────────────────
function CombineBeat({ settings, summary, perSettingTotals, term, showMath }: {
  settings: ProformaSettingSnapshot[];
  summary: ProformaSummary;
  perSettingTotals: Record<string, { contractValue: number; contractInvestment: number }>;
  term: string;
  showMath: boolean;
}) {
  const contributions = settings
    .map(s => ({ id: s.id, label: SETTING_LABELS[s.careSetting] || s.label, color: SETTING_COLORS[s.careSetting] || CORAL, value: s.annualValue }))
    .filter(s => s.value > 0);
  const total = contributions.reduce((s, x) => s + x.value, 0) || 1;

  // Provider expansion across the term — the "when it lands" payoff of the engine.
  const termYears = parseInt(term, 10) || 1;
  const ramp = [1, 2, 3].slice(0, Math.max(termYears, 1)).map(yr =>
    settings.reduce((s, v) => {
      const yp = v.yearlyProviders;
      const val = yr === 1
        ? (yp?.year1 ?? v.providerCount)
        : yr === 2
          ? (yp?.year2 ?? Math.round(((v.providerCount || 0) + (v.fullScaleProviders || 0)) / 2))
          : (yp?.year3 ?? v.fullScaleProviders);
      return s + (val || 0);
    }, 0),
  );
  const rampMax = Math.max(...ramp, 1);

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
      </div>

      {/* When it lands — providers expand over the term; the run-rate follows */}
      {ramp.length > 1 && (
        <div className="mx-auto mt-11 max-w-md">
          <p className={`${KICKER} mb-4`}>When it lands</p>
          <div className="flex items-end justify-center gap-4">
            {ramp.map((p, i) => (
              <div key={i} className="flex-1">
                <motion.div
                  className="mx-auto w-3/5 rounded-t"
                  initial={{ height: 0 }}
                  animate={{ height: `${18 + (p / rampMax) * 46}px` }}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  style={{ backgroundColor: i === ramp.length - 1 ? CORAL : "rgba(255,255,255,0.18)" }}
                />
                <p className="mt-2 text-[11px] text-white/40">Year {i + 1}</p>
                <p className="text-xs text-white/70">{fmtNum(p)}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-white/35">
            Providers ramp to full scale; the {fmt(summary.runRateValue)}/yr run-rate is fully on by year {termYears}.
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
  return (
    <div className="text-center">
      <motion.p className={KICKER} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        {orgName ? orgName : "The case"}
      </motion.p>
      <motion.h2
        className="mt-5 text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15, ease }}
      >
        The case, in one line
      </motion.h2>

      <motion.div
        className="mt-10 flex flex-wrap items-center justify-center gap-x-9 gap-y-5"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4, ease }}
      >
        <Stat label="Hours reclaimed / year" value={fmtNum(totalHours)} />
        <span className="hidden h-9 w-px bg-white/10 sm:block" />
        <Stat label={`Net ${term.toLowerCase()} value`} value={fmt(summary.termNet)} accent />
        <span className="hidden h-9 w-px bg-white/10 sm:block" />
        <Stat label="Value-to-cost" value={summary.valueToCost > 0 ? `${summary.valueToCost.toFixed(1)}×` : "—"} />
      </motion.div>

      <motion.p
        className="mx-auto mt-11 max-w-lg text-sm leading-relaxed text-white/40"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.8 }}
      >
        Status quo captures none of it. This is what Abridge puts on the table: clinician time first, and the dollars that follow.
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
