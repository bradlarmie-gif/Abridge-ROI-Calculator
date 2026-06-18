import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Building2, HeartPulse, BedDouble, Stethoscope, Plus, Minus } from "lucide-react";
import type { ProformaSettingSnapshot, ProformaConfig, ProformaSummary } from "./proformaTypes";
import { SETTING_COLORS, SETTING_LABELS, SETTING_UNIT_LABELS } from "./proformaTypes";
import { AnimatedValue } from "@/components/explore/AnimatedValue";

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
  onExit: () => void;
}

const KICKER = "text-[11px] font-semibold uppercase tracking-[3px] text-white/40";
const SUPPORT = "text-white/55";

export default function ProformaPresent({ settings, config, summary, perSettingTotals, onExit }: ProformaPresentProps) {
  // Beat 0 = hook, 1..N = each setting, N+1 = combine.
  const totalBeats = settings.length + 2;
  const [beat, setBeat] = useState(0);
  const [showMath, setShowMath] = useState(false);

  useEffect(() => { setShowMath(false); }, [beat]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setBeat(b => Math.min(b + 1, totalBeats - 1));
      else if (e.key === "ArrowLeft") setBeat(b => Math.max(b - 1, 0));
      else if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [totalBeats, onExit]);

  const term = termLabel(config.contractTermMonths);

  return (
    <motion.div
      className="fixed inset-0 z-50 text-white overflow-hidden"
      style={{ background: "radial-gradient(120% 120% at 50% 0%, #1C1813 0%, #100E0C 55%, #0A0908 100%)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="proforma-present"
    >
      {/* Exit */}
      <button
        onClick={onExit}
        className="absolute top-5 right-5 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        data-testid="button-present-exit"
      >
        <X className="h-3.5 w-3.5" /> Exit
      </button>

      {/* Stage */}
      <div className="flex h-full w-full items-center justify-center px-6 pb-24 pt-16">
        <div className="w-full max-w-[920px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={beat}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {beat === 0 && <HookBeat settings={settings} summary={summary} term={term} showMath={showMath} />}
              {beat >= 1 && beat <= settings.length && (
                <SettingBeat
                  setting={settings[beat - 1]}
                  index={beat}
                  count={settings.length}
                  totals={perSettingTotals[settings[beat - 1].id] ?? { contractValue: 0, contractInvestment: 0 }}
                  term={term}
                  showMath={showMath}
                />
              )}
              {beat === settings.length + 1 && (
                <CombineBeat settings={settings} summary={summary} perSettingTotals={perSettingTotals} term={term} showMath={showMath} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Show the math */}
      <button
        onClick={() => setShowMath(s => !s)}
        className="absolute bottom-6 left-6 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        data-testid="button-present-show-math"
      >
        {showMath ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        {showMath ? "Hide the math" : "Show the math"}
      </button>

      {/* Nav: prev · dots · next */}
      <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4">
        <button
          onClick={() => setBeat(b => Math.max(b - 1, 0))}
          disabled={beat === 0}
          className="rounded-full p-1.5 text-white/50 transition hover:text-white disabled:opacity-25"
          data-testid="button-present-prev"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          {Array.from({ length: totalBeats }, (_, i) => (
            <button
              key={i}
              onClick={() => setBeat(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === beat ? 22 : 6,
                backgroundColor: i === beat ? CORAL : "rgba(255,255,255,0.25)",
              }}
              aria-label={`Go to beat ${i + 1}`}
            />
          ))}
        </div>
        <button
          onClick={() => setBeat(b => Math.min(b + 1, totalBeats - 1))}
          disabled={beat === totalBeats - 1}
          className="rounded-full p-1.5 text-white/50 transition hover:text-white disabled:opacity-25"
          data-testid="button-present-next"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  );
}

// ── Beat 1: the hook ────────────────────────────────────────────────────────
function HookBeat({ settings, summary, term, showMath }: {
  settings: ProformaSettingSnapshot[];
  summary: ProformaSummary;
  term: string;
  showMath: boolean;
}) {
  const settingNames = settings.map(s => SETTING_LABELS[s.careSetting] || s.label).join(" · ");
  return (
    <div className="text-center">
      <p className={KICKER}>Business Case</p>
      <p className="mt-3 text-sm text-white/45">{settings.length} care setting{settings.length === 1 ? "" : "s"} &middot; {term} term</p>

      <div className="mt-10">
        <AnimatedValue
          value={summary.termNet}
          format={fmt}
          fromZero
          duration={1100}
          className="block text-7xl md:text-8xl font-bold tracking-tight"
        />
        <p className="mt-3 text-lg text-white/50">Net value over the {term.toLowerCase()} term</p>
      </div>

      <div className="mt-9 inline-flex items-center gap-6 rounded-2xl border border-white/10 bg-white/[0.03] px-7 py-4">
        <Stat label="Value-to-cost" value={summary.valueToCost > 0 ? `${summary.valueToCost.toFixed(1)}×` : "—"} accent />
        <span className="h-8 w-px bg-white/10" />
        <Stat label="Payback" value={summary.paybackMonth ? `${summary.paybackMonth} mo` : "—"} />
      </div>

      <p className="mt-12 text-sm text-white/35">{settingNames}</p>

      <AnimatePresence>
        {showMath && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-auto mt-8 grid max-w-lg grid-cols-2 gap-x-10 gap-y-3 rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-6 text-left">
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

      <h2 className="mt-5 text-center text-4xl md:text-5xl font-bold tracking-tight">{SETTING_LABELS[setting.careSetting] || setting.label}</h2>

      <div className="mt-8 text-center">
        {setting.annualValue > 0 ? (
          <AnimatedValue value={setting.annualValue} format={fmt} fromZero duration={950}
            className="block text-6xl md:text-7xl font-bold tracking-tight" style={{ color }} />
        ) : (
          <span className="block text-5xl font-bold text-white/70">Qualitative</span>
        )}
        <p className="mt-2 text-base text-white/50">annual value at scale</p>
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

      {/* Supporting line */}
      <div className="mt-10 flex items-center justify-center gap-7 text-center">
        <Stat label={`${term} value`} value={fmt(totals.contractValue)} />
        <span className="h-8 w-px bg-white/10" />
        <Stat label="Investment" value={totals.contractInvestment > 0 ? fmt(totals.contractInvestment) : "—"} />
        <span className="h-8 w-px bg-white/10" />
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
            <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-6">
              <p className={`${KICKER} mb-4`}>How this is built</p>
              <div className="space-y-2.5">
                {setting.drivers.filter(d => d.value > 0).map(d => (
                  <MathRow key={d.id} label={d.name} value={fmt(d.value)} />
                ))}
              </div>
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

  return (
    <div className="text-center">
      <p className={KICKER}>Together</p>
      <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">The full picture</h2>

      <div className="mt-9">
        <AnimatedValue value={summary.runRateValue} format={fmt} fromZero duration={1000}
          className="block text-6xl md:text-7xl font-bold tracking-tight" style={{ color: CORAL }} />
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

      <div className="mt-11 flex items-center justify-center gap-8">
        <Stat label={`${term} total`} value={fmt(summary.termValue)} />
        <span className="h-9 w-px bg-white/10" />
        <Stat label="Investment" value={fmt(summary.termInvestment)} />
        <span className="h-9 w-px bg-white/10" />
        <Stat label={`Net ${term.toLowerCase()}`} value={fmt(summary.termNet)} accent />
        <span className="h-9 w-px bg-white/10" />
        <Stat label="Payback" value={summary.paybackMonth ? `${summary.paybackMonth} mo` : "—"} />
      </div>

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
