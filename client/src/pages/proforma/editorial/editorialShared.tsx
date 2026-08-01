import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  buildMonthlyCashFlows,
  calculateProformaSummary,
  groupByYear,
  groupByQuarter,
} from "@/lib/proformaCalculations";
import type { ProformaSettingSnapshot, ProformaConfig, ProformaCashFlowRow, ExploreQuadrant } from "../proformaTypes";

/**
 * Apply per-driver on/off (driver.excluded) to a settings array, zeroing
 * excluded drivers and recomputing the setting's rolled-up value fields. This is
 * the ONE place exclusions are resolved, so every chapter (Build, Case, Present)
 * and the engine see the same numbers — the on/off can never make the chapters
 * disagree.
 */
export function applyExclusions(settings: ProformaSettingSnapshot[]): ProformaSettingSnapshot[] {
  return settings.map((s) => {
    if (!s.drivers.some((d) => d.excluded)) return s;
    const drivers = s.drivers.map((d) => (d.excluded ? { ...d, value: 0 } : d));
    const q = (name: ExploreQuadrant) => drivers.filter((d) => d.quadrant === name).reduce((a, d) => a + d.value, 0);
    return {
      ...s,
      drivers,
      annualValue: drivers.reduce((a, d) => a + d.value, 0),
      capacityValue: q("Capacity"),
      workforceValue: q("Workforce"),
      revenueValue: q("Revenue"),
      qualityValue: q("Quality"),
      timeValue: q("Capacity"),
      docValue: q("Revenue"),
      retentionValue: q("Workforce"),
    };
  });
}

/* ─────────────────────────── design tokens ─────────────────────────── */
export const T = {
  page: "#FDFCFA",
  card: "#FDFBF8",
  hair: "#E8E2DA",
  soft: "#F1EBE3",
  coral: "#EA2C00",
  ink: "#1A1A1A",
  label: "#2E2822",
  muted: "#5E534A",
  faint: "#786C5E",
  tile: "#F3EEE7",
  off: "#AFA491",
};

// Per-setting palette for the stacked build chart. Coral is reserved for the
// first (anchor) setting; the rest step down through warm neutrals so money
// still reads coral and the stack stays restrained.
export const SETTING_PALETTE = ["#EA2C00", "#F4A48C", "#E5BFA8", "#C98B6E"];
export const settingColor = (idx: number) => SETTING_PALETTE[idx % SETTING_PALETTE.length];

/* ─────────────────────────── formatting ─────────────────────────── */
export function fmt(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
/** Small integer → words (0–99), used for the Present headline. */
export function wordify(n: number): string {
  if (n < 20) return ONES[n] ?? String(n);
  if (n < 100) {
    const t = Math.floor(n / 10);
    const r = n % 10;
    return r === 0 ? TENS[t] : `${TENS[t]}-${ONES[r]}`;
  }
  return String(n);
}

/* ─────────────────────── animated count-up hook ─────────────────────── */
export function useAnimatedNumber(value: number, duration = 0.8): number {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    const start = performance.now();
    let raf = 0;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const t = Math.min((now - start) / (duration * 1000), 1);
      setDisplay(from + (value - from) * ease(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

export function AnimatedMoney({ value, className, style }: { value: number; className?: string; style?: React.CSSProperties }) {
  const v = useAnimatedNumber(value);
  return <span className={className} style={style}>{fmt(v)}</span>;
}

export function AnimatedX({ value, className, style }: { value: number; className?: string; style?: React.CSSProperties }) {
  const v = useAnimatedNumber(value);
  return <span className={className} style={style}>{v.toFixed(1)}×</span>;
}

/* ─────────────────────────── small styled bits ─────────────────────────── */
export function Lbl({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: T.faint, ...style }}>
      {children}
    </span>
  );
}

/* ─────────────────────────── chapter nav ─────────────────────────── */
export type Chapter = "build" | "case" | "present";
const CHAPTER_LIST: { key: Chapter; n: string; label: string }[] = [
  { key: "build", n: "01", label: "Build the deal" },
  { key: "case", n: "02", label: "The 3-year case" },
  { key: "present", n: "03", label: "Present" },
];

export function ChapterNav({ active, onNavigate }: { active: Chapter; onNavigate?: (c: Chapter) => void }) {
  return (
    <div style={{ display: "flex", gap: 26 }}>
      {CHAPTER_LIST.map((c) => {
        const on = c.key === active;
        return (
          <button
            key={c.key}
            onClick={() => onNavigate?.(c.key)}
            style={{
              fontSize: 13,
              color: on ? T.ink : T.faint,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 7,
              cursor: onNavigate ? "pointer" : "default",
              background: "none",
              border: "none",
              padding: 0,
            }}
          >
            <span style={{ fontSize: 10, color: on ? T.coral : T.off }}>{c.n}</span> {c.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── segmented toggle ─────────────────────────── */
export function Seg<Opt extends string>({ options, value, onChange }: { options: { key: Opt; label: string }[]; value: Opt; onChange: (k: Opt) => void }) {
  return (
    <div style={{ display: "inline-flex", border: `1px solid ${T.hair}`, borderRadius: 8, overflow: "hidden" }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            style={{ fontSize: 11, fontWeight: 700, padding: "5px 11px", border: "none", cursor: "pointer", background: on ? T.ink : "transparent", color: on ? "#fff" : T.faint }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── the case model ─────────────────────────── */
export interface CaseDriver { id: string; name: string; value: number }
export interface CaseSettingMeta {
  id: string;
  label: string;
  color: string;
  careSetting: string;
  goLiveMonth: number;
  providerCount: number;
  fullScaleProviders: number;
  atScale: number;
  drivers: CaseDriver[];
}
export interface CasePeriod {
  label: string;
  perSetting: { id: string; value: number }[];
  clinical: number;
  investment: number;
  net: number;
  cumNet: number;
  roi: number;
}
export interface CaseModel {
  years: CasePeriod[];
  quarters: CasePeriod[];
  settingsMeta: CaseSettingMeta[];
  termValue: number;
  termInvestment: number;
  termNet: number;
  payback: number | null;
  roi: number;
  runRate: number;
  termYears: number;
}

// Clinical value = Revenue + Capacity + Workforce (Quality is proof-only and
// Cost Displacement lives in App Rationalization — both are kept out of the
// dollar case, exactly as the PDF does). Every figure below reconciles from the
// engine: drivers → setting, settings → period, periods → term.
function clinicalOf(row: { revenueValue: number; capacityValue: number; workforceValue: number }): number {
  return row.revenueValue + row.capacityValue + row.workforceValue;
}
function settingClinical(b?: { revenueValue: number; capacityValue: number; workforceValue: number }): number {
  return b ? b.revenueValue + b.capacityValue + b.workforceValue : 0;
}

function toPeriods(rows: ProformaCashFlowRow[], settings: ProformaSettingSnapshot[]): CasePeriod[] {
  let cum = 0;
  return rows.map((r) => {
    const clinical = clinicalOf(r);
    const net = clinical - r.investment;
    cum += net;
    return {
      label: r.label,
      perSetting: settings.map((s) => ({ id: s.id, value: settingClinical(r.bySettings[s.id]) })),
      clinical,
      investment: r.investment,
      net,
      cumNet: cum,
      roi: r.investment > 0 ? clinical / r.investment : 0,
    };
  });
}

export function computeCaseModel(settings: ProformaSettingSnapshot[], config: ProformaConfig): CaseModel {
  const flows = buildMonthlyCashFlows(settings, config);
  const summary = calculateProformaSummary(settings, config, flows);
  const yearRows = groupByYear(flows);
  const quarterRows = groupByQuarter(flows);

  const years = toPeriods(yearRows, settings);
  const quarters = toPeriods(quarterRows, settings);

  const settingsMeta: CaseSettingMeta[] = settings.map((s, idx) => ({
    id: s.id,
    label: s.label,
    color: settingColor(idx),
    careSetting: s.careSetting,
    goLiveMonth: s.goLiveMonth,
    providerCount: s.providerCount,
    fullScaleProviders: s.fullScaleProviders,
    atScale: (s.revenueValue ?? 0) + (s.capacityValue ?? 0) + (s.workforceValue ?? 0),
    drivers: s.drivers
      .filter((d) => d.quadrant !== "Quality" && d.value > 0)
      .map((d) => ({ id: d.id, name: d.name, value: d.value }))
      .sort((a, b) => b.value - a.value),
  }));

  const termValue = years.reduce((a, y) => a + y.clinical, 0);
  const termInvestment = years.reduce((a, y) => a + y.investment, 0);
  const termNet = termValue - termInvestment;
  const roi = termInvestment > 0 ? termValue / termInvestment : 0;
  const runRate = settingsMeta.reduce((a, s) => a + s.atScale, 0);

  return {
    years,
    quarters,
    settingsMeta,
    termValue,
    termInvestment,
    termNet,
    payback: summary.paybackMonth,
    roi,
    runRate,
    termYears: years.length,
  };
}

/* ─────────────────────────── stacked build chart ─────────────────────────── */
/**
 * Value stacked by care setting across the term, with a per-period dashed
 * investment marker. Tapping a setting in the legend isolates it (the other
 * settings drop out and the labels reflect the isolated setting only).
 */
export function StackedBuildChart({
  model,
  mode,
  isolatedId,
  onIsolate,
  variant = "wide",
}: {
  model: CaseModel;
  mode: "year" | "quarter";
  isolatedId: string | null;
  onIsolate: (id: string | null) => void;
  variant?: "wide" | "compact";
}) {
  const periods = mode === "year" ? model.years : model.quarters;
  const metas = model.settingsMeta;

  const W = variant === "wide" ? 920 : 600;
  const H = variant === "wide" ? 240 : 250;
  const padL = 40;
  const padR = variant === "wide" ? 20 : 12;
  const baseY = H - 30;
  const topY = 34;

  const barW = variant === "wide" ? (mode === "year" ? 140 : 52) : (mode === "year" ? 96 : 34);

  // Scale to the largest stacked total (or investment) across the term.
  const totalFor = (p: CasePeriod) =>
    isolatedId ? (p.perSetting.find((x) => x.id === isolatedId)?.value ?? 0) : p.clinical;
  const maxVal = Math.max(...periods.map((p) => Math.max(totalFor(p), p.investment)), 1) * 1.14;
  const h = (v: number) => (v / maxVal) * (baseY - topY);

  const n = periods.length;
  const slot = (W - padL - padR) / n;
  const cx = (i: number) => padL + slot * i + slot / 2;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%" }}>
        <line x1={padL} y1={baseY} x2={W - padR} y2={baseY} stroke={T.hair} />
        {periods.map((p, i) => {
          const x = cx(i) - barW / 2;
          const total = totalFor(p);
          let yCursor = baseY;
          const visibleMetas = isolatedId ? metas.filter((m) => m.id === isolatedId) : metas;
          const invY = baseY - h(p.investment);
          return (
            <g key={i}>
              {visibleMetas.map((m) => {
                const seg = p.perSetting.find((x2) => x2.id === m.id);
                const v = seg?.value ?? 0;
                if (v <= 0) return null;
                const segH = h(v);
                yCursor -= segH;
                return (
                  <motion.rect
                    key={m.id}
                    x={x}
                    width={barW}
                    initial={false}
                    animate={{ y: yCursor, height: segH }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    fill={m.color}
                  />
                );
              })}
              {/* per-period investment marker */}
              <motion.line
                x1={x}
                x2={x + barW}
                initial={false}
                animate={{ y1: invY, y2: invY }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                stroke="#5E534A"
                strokeWidth={1.4}
                strokeDasharray="4 3"
              />
              <motion.text
                x={cx(i)}
                initial={false}
                animate={{ y: baseY - h(total) - 10 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                fontFamily="Manrope"
                fontSize={variant === "wide" ? 13 : 12}
                fontWeight={700}
                fill={T.ink}
                textAnchor="middle"
                className="font-abridge"
              >
                {fmt(total)}
              </motion.text>
              <text x={cx(i)} y={baseY + 18} fontFamily="Manrope" fontSize={variant === "wide" ? 11 : 10.5} fill={T.faint} textAnchor="middle">
                {mode === "year" ? `Year ${i + 1}` : p.label}
              </text>
            </g>
          );
        })}
        {variant === "wide" && (
          <text x={W - padR} y={baseY - h(periods[periods.length - 1]?.investment ?? 0) - 4} fontFamily="Manrope" fontSize={10} fill={T.muted} textAnchor="end">
            investment
          </text>
        )}
      </svg>
      <div style={{ display: "flex", gap: variant === "wide" ? 22 : 18, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
        {metas.map((m) => {
          const on = !isolatedId || isolatedId === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onIsolate(isolatedId === m.id ? null : m.id)}
              style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: on ? T.muted : T.off, background: "none", border: "none", cursor: "pointer", padding: 0, opacity: on ? 1 : 0.55 }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 3, background: m.color, flex: "none" }} />
              {m.label}
            </button>
          );
        })}
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: T.muted }}>
          <span style={{ width: 14, height: 2, background: "#5E534A", display: "inline-block" }} />
          Investment
        </div>
        <span style={{ fontSize: 11, color: T.off, marginLeft: "auto" }}>
          {isolatedId ? "Tap it again to show all" : "Tap a setting to isolate it"}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────── stress test ─────────────────────────── */
/**
 * Sensitivity band: flex realization by ±p% on the value side only (matching
 * the PDF's scenario math), holding investment fixed. Base is the current term
 * net; conservative / optimistic swing symmetrically around it.
 */
export function StressTest({ termValue, termInvestment, termNet }: { termValue: number; termInvestment: number; termNet: number }) {
  const [pct, setPct] = useState(30);
  const p = pct / 100;
  const conservative = termValue * (1 - p) - termInvestment;
  const optimistic = termValue * (1 + p) - termInvestment;

  const W = 560;
  const H = 76;
  const x0 = 70;
  const x1 = 450;
  const min = conservative;
  const max = optimistic;
  const span = max - min || 1;
  const xFor = (v: number) => x0 + ((v - min) / span) * (x1 - x0);
  const baseX = xFor(termNet);

  return (
    <div style={{ border: `1px solid ${T.hair}`, borderRadius: 18, background: T.card, padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Lbl>Stress test · how the 3-year net holds</Lbl>
        <div style={{ display: "inline-flex", gap: 6 }}>
          {[15, 20, 25, 30].map((v) => {
            const on = v === pct;
            return (
              <button
                key={v}
                onClick={() => setPct(v)}
                style={{ fontSize: 11, fontWeight: 700, padding: "5px 11px", borderRadius: 999, cursor: "pointer", color: on ? T.coral : T.faint, background: on ? "#FEF6F3" : "#F5F0EA", border: `1px solid ${on ? T.coral : T.hair}` }}
              >
                ±{v}%
              </button>
            );
          })}
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.5, marginBottom: 16, maxWidth: 640 }}>
        Today's figure sits toward the conservative end, so it has room to be beaten, not defended.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%" }}>
        <line x1={30} y1={56} x2={530} y2={56} stroke={T.hair} />
        <rect x={x0} y={34} width={x1 - x0} height={12} rx={6} fill="#F6D9CF" />
        <motion.rect y={34} height={12} rx={6} fill={T.coral} initial={false} animate={{ x: x0, width: Math.max(baseX - x0, 0) }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} />
        <g fontFamily="Manrope">
          <motion.circle cy={40} r={4.5} fill="#fff" stroke="#C9BCA9" strokeWidth={2} initial={false} animate={{ cx: x0 }} />
          <text x={x0} y={22} fontSize={14} fontWeight={700} fill={T.label} textAnchor="middle" className="font-abridge">{fmt(conservative)}</text>
          <text x={x0} y={70} fontSize={9.5} fill={T.faint} textAnchor="middle">Conservative</text>
        </g>
        <g fontFamily="Manrope">
          <motion.circle cy={40} r={7} fill="#fff" stroke={T.coral} strokeWidth={3.5} initial={false} animate={{ cx: baseX }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} />
          <motion.text y={22} fontSize={15} fontWeight={700} fill={T.coral} textAnchor="middle" className="font-abridge" initial={false} animate={{ x: baseX }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>{fmt(termNet)}</motion.text>
          <motion.text y={70} fontSize={9.5} fill={T.faint} textAnchor="middle" initial={false} animate={{ x: baseX }} transition={{ duration: 0.45 }}>Base</motion.text>
        </g>
        <g fontFamily="Manrope">
          <motion.circle cy={40} r={4.5} fill="#fff" stroke="#C9BCA9" strokeWidth={2} initial={false} animate={{ cx: x1 }} />
          <text x={x1} y={22} fontSize={14} fontWeight={700} fill={T.label} textAnchor="middle" className="font-abridge">{fmt(optimistic)}</text>
          <text x={x1} y={70} fontSize={9.5} fill={T.faint} textAnchor="middle">Optimistic</text>
        </g>
      </svg>
      <div style={{ fontSize: 11.5, color: T.faint, marginTop: 14, borderTop: `1px solid ${T.soft}`, paddingTop: 12 }}>
        What moves it: adoption pace, the realization you set on each driver, and how much is attributed to Abridge vs your existing teams.
      </div>
    </div>
  );
}
