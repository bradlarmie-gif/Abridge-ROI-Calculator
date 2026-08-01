import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import { Stethoscope, Zap, ChevronDown, Plus, Trash2 } from "lucide-react";
import type {
  ProformaSettingSnapshot,
  ProformaConfig,
  ProformaDriver,
  DriverOnset,
  ExploreQuadrant,
  CostOffset,
} from "../proformaTypes";
import { DEFAULT_PROFORMA_CONFIG } from "../proformaTypes";
import { DEFAULT_EXPLORE_STATE } from "@/pages/explore";
import {
  buildMonthlyCashFlows,
  calculateProformaSummary,
  groupByYear,
  costOffsetDisplacedAmount,
} from "@/lib/proformaCalculations";
import { computeSettingDriverFormulas } from "@/lib/presentFormulas";
import { applyExclusions } from "./editorialShared";

/* ─────────────────────────── design tokens ─────────────────────────── */
const T = {
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

// Mix-bar colors (the one composition element). Coral reserved for money;
// Revenue = coral, Capacity/Workforce = warm neutrals so the screen stays restrained.
const QUADRANT_MIX: Record<ExploreQuadrant, string> = {
  Revenue: "#EA2C00",
  Capacity: "#F0704E",
  Workforce: "#F4A48C",
  Quality: "#D9CFC0",
};

const DRIVER_DESCRIPTION: Record<string, string> = {
  hcc: "Chronic conditions re-documented and newly surfaced during the visit, valued per plan.",
  patientAccess: "Added visit capacity the freed documentation time opens up, valued at the margin per visit.",
  wrvu: "More completely coded encounters lifting work-RVU capture, valued per wRVU.",
  providerWellbeing: "Documentation burden lifted off providers, valued as retained capacity and lower turnover risk.",
  locum: "Reduced reliance on locum and agency coverage as capacity is recovered.",
};

const ONSET_ORDER: { key: DriverOnset; label: string }[] = [
  { key: "immediate", label: "Now" },
  { key: "delayed", label: "Month 3+" },
  { key: "phased", label: "Phased" },
  { key: "longTerm", label: "Month 12+" },
  { key: "custom", label: "Custom" },
];

/* ─────────────────────────── formatting ─────────────────────────── */
function fmt(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}
/* ─────────────────────── animated count-up hook ─────────────────────── */
function useAnimatedNumber(value: number, duration = 0.7): number {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    const controls = animate(from, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, duration]);
  return display;
}

function AnimatedMoney({ value, className, style }: { value: number; className?: string; style?: React.CSSProperties }) {
  const v = useAnimatedNumber(value);
  return <span className={className} style={style}>{fmt(v)}</span>;
}

/* ─────────────────────────── small styled controls ─────────────────────────── */
function Lbl({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: T.faint, ...style }}>
      {children}
    </span>
  );
}

function MiniSeg<Opt extends string>({ options, value, onChange }: { options: { key: Opt; label: string }[]; value: Opt; onChange: (k: Opt) => void }) {
  return (
    <div style={{ display: "inline-flex", border: `1px solid ${T.hair}`, borderRadius: 8, overflow: "hidden" }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "5px 10px",
              border: "none",
              cursor: "pointer",
              background: on ? T.ink : "transparent",
              color: on ? "#fff" : T.faint,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Pill({ on, children, onClick }: { on?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11.5,
        fontWeight: 700,
        color: on ? T.coral : T.muted,
        background: on ? "#FEF6F3" : "#F5F0EA",
        border: `1px solid ${on ? T.coral : T.hair}`,
        borderRadius: 999,
        padding: "6px 12px",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        width: 34,
        height: 20,
        borderRadius: 99,
        background: on ? T.coral : "#E3DACE",
        position: "relative",
        flex: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 16 : 2,
          width: 16,
          height: 16,
          borderRadius: 99,
          background: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,.15)",
          transition: "left .18s cubic-bezier(.22,1,.36,1)",
        }}
      />
    </button>
  );
}

/** Focus-safe numeric cell — text-backed so it can be fully cleared while editing. */
function NumCell({
  value,
  onChange,
  kLabel,
  prefix,
  suffix,
  decimals = false,
  cellStyle,
  valueStyle,
  kStyle,
  format,
  variant = "cell",
}: {
  value: number;
  onChange: (n: number) => void;
  kLabel?: string;
  prefix?: string;
  suffix?: string;
  decimals?: boolean;
  cellStyle?: React.CSSProperties;
  valueStyle?: React.CSSProperties;
  kStyle?: React.CSSProperties;
  format?: (n: number) => string;
  variant?: "cell" | "chain";
}) {
  const fmtVal = format ?? ((n: number) => String(n));
  const [text, setText] = useState(fmtVal(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(fmtVal(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const parse = (s: string) => {
    const cleaned = s.replace(decimals ? /[^0-9.]/g : /[^0-9]/g, "");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };
  const isChain = variant === "chain";
  const numFontSize = (valueStyle?.fontSize as number) ?? (isChain ? 19 : 15);
  return (
    <label
      style={
        isChain
          ? { textAlign: "center", display: "inline-block", cursor: "text", ...cellStyle }
          : { border: `1px solid ${T.hair}`, borderRadius: 9, background: "#fff", padding: "6px 12px", textAlign: "center", minWidth: 74, display: "inline-block", cursor: "text", ...cellStyle }
      }
    >
      <span style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 1 }}>
        {prefix && <span className="font-abridge" style={{ fontSize: numFontSize, color: T.ink, ...valueStyle }}>{prefix}</span>}
        <input
          value={text}
          inputMode={decimals ? "decimal" : "numeric"}
          onFocus={() => {
            focused.current = true;
            setText(String(value));
          }}
          onBlur={() => {
            focused.current = false;
            setText(fmtVal(value));
          }}
          onChange={(e) => {
            setText(e.target.value);
            onChange(parse(e.target.value));
          }}
          className="font-abridge"
          style={{
            width: `${Math.max(2, text.length + 1)}ch`,
            maxWidth: 96,
            border: "none",
            outline: "none",
            background: "transparent",
            textAlign: "center",
            fontSize: numFontSize,
            color: T.ink,
            padding: 0,
            lineHeight: 1,
            ...valueStyle,
          }}
        />
        {suffix && <span className="font-abridge" style={{ fontSize: numFontSize, color: T.ink, ...valueStyle }}>{suffix}</span>}
      </span>
      {kLabel && (
        <span
          style={
            isChain
              ? { display: "block", fontSize: 9.5, color: T.faint, marginTop: 3, ...kStyle }
              : { display: "block", fontSize: 9, color: T.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2, ...kStyle }
          }
        >
          {kLabel}
        </span>
      )}
    </label>
  );
}

/** Read-only "held at full scale" cell for term years beyond the 3-year ramp. */
function HeldCell({ value, suffix, prefix, kLabel }: { value: number; suffix?: string; prefix?: string; kLabel?: string }) {
  return (
    <div style={{ border: `1px dashed ${T.hair}`, borderRadius: 9, background: T.page, padding: "6px 12px", textAlign: "center", minWidth: 74, display: "inline-block" }}>
      <span className="font-abridge" style={{ fontSize: 15, color: T.muted }}>{prefix}{commaFmt(value)}{suffix}</span>
      {kLabel && (
        <span style={{ display: "block", fontSize: 9, color: T.faint, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>
          {kLabel} · held
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────── reactive value-ramp chart ─────────────────────────── */
function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x},${p2.y.toFixed(1)}`;
  }
  return d;
}

function ValueRamp({ series }: { series: number[] }) {
  const W = 320;
  const H = 104;
  const padL = 12;
  const padR = 12;
  const baseY = 88;
  const topY = 10;
  const n = Math.max(series.length, 1);
  const maxVal = Math.max(...series, 1) * 1.06;
  const pts = series.map((v, i) => ({
    x: n === 1 ? padL : padL + (i / (n - 1)) * (W - padL - padR),
    y: baseY - (v / maxVal) * (baseY - topY),
  }));
  if (pts.length === 1) pts.push({ x: W - padR, y: pts[0].y });
  const line = buildSmoothPath(pts);
  const area = `${line} L${pts[pts.length - 1].x},${baseY} L${pts[0].x},${baseY} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", marginTop: 6 }}>
      <line x1={padL} y1={baseY} x2={W - padR} y2={baseY} stroke={T.hair} />
      {pts.map((p, i) => (
        <line key={i} x1={p.x} y1={topY + 4} x2={p.x} y2={baseY} stroke="#F1EBE3" />
      ))}
      <motion.path d={area} fill={T.coral} fillOpacity={0.09} initial={false} animate={{ d: area }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} />
      <motion.path d={line} fill="none" stroke={T.coral} strokeWidth={2.4} strokeLinecap="round" initial={false} animate={{ d: line }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} />
      {pts.map((p, i) => {
        const last = i === pts.length - 1;
        return (
          <motion.circle
            key={i}
            cx={p.x}
            r={last ? 4.2 : 3.4}
            fill={last ? T.coral : "#fff"}
            stroke={T.coral}
            strokeWidth={last ? 0 : 2}
            initial={false}
            animate={{ cy: p.y }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />
        );
      })}
      {series.map((_, i) => (
        <text
          key={i}
          x={pts[i]?.x ?? 0}
          y={100}
          fontFamily="Manrope"
          fontSize={9}
          fill={T.faint}
          textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"}
        >
          Y{i + 1}
        </text>
      ))}
    </svg>
  );
}

/* ─────────────────────────── driver row ─────────────────────────── */
function QuadTag({ quadrant, dim }: { quadrant: ExploreQuadrant; dim?: boolean }) {
  const isQuality = quadrant === "Quality";
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        padding: "3px 7px",
        borderRadius: 5,
        flex: "none",
        opacity: dim ? 0.5 : 1,
        background: isQuality ? T.soft : "#FDECE7",
        color: isQuality ? T.faint : "#B02200",
      }}
    >
      {quadrant}
    </span>
  );
}

const commaFmt = (n: number) => Math.round(n).toLocaleString();
const decFmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3))));

function DriverRow({
  driver,
  isOff,
  expanded,
  onToggleOff,
  onToggleExpand,
  formula,
  onOnsetChange,
}: {
  driver: ProformaDriver;
  isOff: boolean;
  expanded: boolean;
  onToggleOff: () => void;
  onToggleExpand: () => void;
  formula?: string;
  onOnsetChange: (o: DriverOnset) => void;
}) {
  const isProof = driver.quadrant === "Quality" || driver.value <= 0;

  // Proof row — never counted, no switch, no expand.
  if (isProof) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 0", borderBottom: `1px solid ${T.soft}`, opacity: 0.85 }}>
        <span style={{ width: 34, flex: "none" }} />
        <QuadTag quadrant={driver.quadrant} />
        <span style={{ flex: 1, fontWeight: 700, fontSize: 14.5, color: T.faint }}>{driver.name}</span>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: T.faint }}>Proof · not counted</span>
      </div>
    );
  }

  const Row = (
    <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
      <Switch on={!isOff} onClick={onToggleOff} />
      <QuadTag quadrant={driver.quadrant} dim={isOff} />
      <button
        onClick={onToggleExpand}
        style={{
          flex: 1,
          textAlign: "left",
          fontWeight: 700,
          fontSize: 14.5,
          color: isOff ? T.off : T.label,
          textDecoration: isOff ? "line-through" : "none",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        {driver.name}
      </button>
      {isOff ? (
        <span style={{ fontSize: 12, fontWeight: 700, color: T.off }}>Off</span>
      ) : (
        <span className="font-abridge" style={{ fontSize: 17, color: T.coral }}>{fmt(driver.value)}</span>
      )}
    </div>
  );

  return (
    <div style={{ borderBottom: expanded ? "none" : `1px solid ${T.soft}` }}>
      {expanded ? (
        <div style={{ background: "#fff", border: `1px solid ${T.hair}`, borderRadius: 12, padding: "14px 16px", margin: "8px 0 10px" }}>
          {Row}
          {DRIVER_DESCRIPTION[driver.id] && (
            <div style={{ fontSize: 11.5, color: T.faint, marginTop: 8 }}>{DRIVER_DESCRIPTION[driver.id]}</div>
          )}
          {/* Real reconciling formula — the same math Explore shows, tied to the
              dollar on the right. Clinical inputs are edited in Explore; the
              proforma owns deployment, pricing and timing (below). */}
          <div style={{ marginTop: 13, paddingTop: 13, borderTop: `1px solid ${T.soft}` }}>
            <Lbl style={{ display: "block", marginBottom: 7 }}>How the number is built</Lbl>
            {formula ? (
              <div style={{ fontSize: 13.5, lineHeight: 1.85, color: T.muted }}>{formula}</div>
            ) : (
              <div style={{ fontSize: 12.5, color: T.faint, fontStyle: "italic", lineHeight: 1.6 }}>
                Built from this setting's Explore model. Adjust the clinical inputs in Explore to change it.
              </div>
            )}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 11 }}>
              <span style={{ fontSize: 12, color: T.faint }}>equals</span>
              <span className="font-abridge" style={{ fontSize: 22, color: T.coral, lineHeight: 1 }}>
                {fmt(driver.value)}<span style={{ fontSize: 11, color: T.faint }}> a year</span>
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
            <Lbl style={{ margin: 0 }}>Timing</Lbl>
            <MiniSeg options={ONSET_ORDER} value={driver.onset} onChange={onOnsetChange} />
          </div>
        </div>
      ) : (
        <div style={{ padding: "14px 0" }}>{Row}</div>
      )}
    </div>
  );
}

/* ─────────────────────────── setting card ─────────────────────────── */
const SETTING_ICON: Record<string, typeof Stethoscope> = {
  outpatient: Stethoscope,
  ed: Zap,
  inpatient: Stethoscope,
  nursing: Stethoscope,
};

const GOLIVE_OPTIONS = [1, 2, 3, 4, 6, 9, 12];

function SettingCard({
  setting,
  config,
  excluded,
  expanded,
  onToggleExpanded,
  onUpdateSetting,
  onRemove,
  onToggleDriverOff,
}: {
  setting: ProformaSettingSnapshot;
  config: ProformaConfig;
  excluded: Set<string>;
  expanded: boolean;
  onToggleExpanded: () => void;
  onUpdateSetting: (updates: Partial<ProformaSettingSnapshot>) => void;
  onRemove: () => void;
  onToggleDriverOff: (driverId: string) => void;
}) {
  const Icon = SETTING_ICON[setting.careSetting] ?? Stethoscope;
  // Real, reconciling per-driver formulas (the same math Explore shows), keyed
  // by proforma driver id. Read-only here; clinical inputs are edited in Explore.
  const driverFormulas = useMemo(() => computeSettingDriverFormulas(setting), [setting]);
  // The deal term can run to 5 years; the rollout ramps to full scale over its
  // first 3 years (the engine's model), then HOLDS at full scale for the rest of
  // the term. So there are up to 3 editable anchors, and years 4-5 are shown as
  // held so a 5-year term never looks like it's missing inputs.
  const termYears = Math.min(5, Math.max(1, Math.round(config.contractTermMonths / 12)));
  const yearKeys = (["year1", "year2", "year3"] as const).slice(0, Math.min(3, termYears));
  const heldYears = Math.max(0, termYears - yearKeys.length);
  const [rampMode, setRampMode] = useState<"year" | "quarter">("year");
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

  // Effective (exclusion-applied) setting drives the solo engine run.
  const effective = useMemo<ProformaSettingSnapshot>(() => {
    if (excluded.size === 0) return setting;
    let removed = 0;
    const drivers = setting.drivers.map((d) => {
      if (excluded.has(d.id)) {
        removed += d.value;
        return { ...d, value: 0 };
      }
      return d;
    });
    return { ...setting, drivers, annualValue: setting.annualValue - removed };
  }, [setting, excluded]);

  const solo = useMemo(() => {
    const cfg = { ...config, systemWideFee: undefined };
    const flows = buildMonthlyCashFlows([effective], cfg);
    const years = groupByYear(flows);
    return {
      series: years.map((y) => y.totalValue),
      atScale: effective.annualValue,
      year1Investment: years[0]?.investment ?? 0,
    };
  }, [effective, config]);

  const pricingModel = setting.pricingModel ?? "perUnit";
  const perYearPricing = !!setting.yearlyPricing;

  const activeDrivers = setting.drivers.filter((d) => d.quadrant !== "Quality" && d.value > 0 && !excluded.has(d.id));
  // "This setting's mix" — quadrant composition of the active (counted) value.
  const mixTotal = activeDrivers.reduce((s, d) => s + d.value, 0);
  const mix = (["Revenue", "Capacity", "Workforce"] as const)
    .map((q) => ({ q, value: activeDrivers.filter((d) => d.quadrant === q).reduce((s, d) => s + d.value, 0) }))
    .filter((m) => m.value > 0);
  // Sort: value drivers by value desc, quality/proof last.
  const orderedDrivers = [...setting.drivers].sort((a, b) => {
    const aq = a.quadrant === "Quality" || a.value <= 0 ? 1 : 0;
    const bq = b.quadrant === "Quality" || b.value <= 0 ? 1 : 0;
    if (aq !== bq) return aq - bq;
    return b.value - a.value;
  });

  const updateDriverOnset = (driverId: string, onset: DriverOnset) => {
    onUpdateSetting({ drivers: setting.drivers.map((d) => (d.id === driverId ? { ...d, onset } : d)) });
  };

  // Cost offsets — legacy vendor spend Abridge displaces (ramped over the
  // transition). The engine (buildMonthlyCashFlows) already consumes these.
  const offsets = setting.costOffsets ?? [];
  const settingDisplaced = offsets.reduce((a, o) => a + costOffsetDisplacedAmount(o), 0);
  const setOffsets = (next: CostOffset[]) => onUpdateSetting({ costOffsets: next });
  const addOffset = () =>
    setOffsets([...offsets, { id: `off-${Date.now()}`, label: "Legacy tool", annualSpend: 100000, displacementPct: 100, transitionMonths: 6 }]);
  const updateOffset = (id: string, patch: Partial<CostOffset>) =>
    setOffsets(offsets.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  const removeOffset = (id: string) => setOffsets(offsets.filter((o) => o.id !== id));

  const setYearProviders = (key: "year1" | "year2" | "year3", n: number) => {
    const yp = { year1: setting.providerCount, year2: setting.fullScaleProviders, year3: setting.fullScaleProviders, ...setting.yearlyProviders, [key]: n };
    const patch: Partial<ProformaSettingSnapshot> = { yearlyProviders: yp };
    if (key === "year1") patch.providerCount = n;
    const lastYearKey = yearKeys[yearKeys.length - 1];
    patch.fullScaleProviders = yp[lastYearKey];
    onUpdateSetting(patch);
  };
  const setYearUtil = (key: "year1" | "year2" | "year3", n: number) => {
    const yu = { year1: 40, year2: 60, year3: 80, ...setting.yearlyUtilization, [key]: n };
    const lastYearKey = yearKeys[yearKeys.length - 1];
    onUpdateSetting({ yearlyUtilization: yu, utilizationPercent: yu[lastYearKey], fullScaleUtilization: yu[lastYearKey] });
  };
  // Pricing is stored MONTHLY per provider; the cells edit ANNUAL per provider.
  const setYearPricing = (key: "year1" | "year2" | "year3", annual: number) => {
    const base = setting.yearlyPricing ?? { year1: setting.costPerUnit, year2: setting.costPerUnit, year3: setting.costPerUnit };
    onUpdateSetting({ yearlyPricing: { ...base, [key]: annual / 12 } });
  };

  const providersFor = (key: "year1" | "year2" | "year3") =>
    setting.yearlyProviders?.[key] ?? (key === "year1" ? setting.providerCount : setting.fullScaleProviders);
  const utilFor = (key: "year1" | "year2" | "year3") =>
    setting.yearlyUtilization?.[key] ?? { year1: 40, year2: 60, year3: 80 }[key];
  const priceFor = (key: "year1" | "year2" | "year3") =>
    setting.yearlyPricing?.[key] ?? setting.costPerUnit;

  const pricingLabel: Record<string, string> = {
    perUnit: "Per provider",
    perEncounter: "Per encounter",
    annualFlat: "Annual",
    platform: "Platform",
  };

  return (
    <div style={{ border: `1px solid ${expanded ? "#D9CFC0" : T.hair}`, borderRadius: 18, background: T.card, marginTop: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px" }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: T.tile, display: "flex", alignItems: "center", justifyContent: "center", color: T.label, flex: "none" }}>
          <Icon size={20} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="font-abridge" style={{ fontSize: 23, color: T.ink }}>{setting.label}</div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: T.faint, marginTop: 2 }}>
            {setting.careSetting === "ed" ? "Emergency department" : "Primary care & specialty"} · go-live month {setting.goLiveMonth}
          </div>
        </div>
        {!expanded && (
          <div style={{ fontSize: 12.5, color: T.faint, textAlign: "right", marginRight: 8, lineHeight: 1.4 }}>
            {pricingLabel[pricingModel]} · {fmt(solo.atScale)}/yr
            <br />
            {providersFor("year1")} → {providersFor(yearKeys[yearKeys.length - 1])} providers · {utilFor("year1")} → {utilFor(yearKeys[yearKeys.length - 1])}% adoption
          </div>
        )}
        <div style={{ textAlign: "right" }}>
          <div className="font-abridge" style={{ fontSize: 22, color: T.ink }}>
            {fmt(solo.atScale)}
            <span style={{ fontSize: 12, color: T.faint }}>/yr</span>
          </div>
          {expanded && <Lbl style={{ display: "block", marginTop: 2 }}>Value at full scale</Lbl>}
        </div>
        <button onClick={onToggleExpanded} style={{ background: "none", border: "none", cursor: "pointer", color: T.off, display: "flex" }}>
          <motion.span animate={{ rotate: expanded ? 0 : -90 }} transition={{ duration: 0.2 }} style={{ display: "flex" }}>
            <ChevronDown size={18} />
          </motion.span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "2px 24px 22px" }}>
              {/* ROLLOUT */}
              <div style={{ borderTop: `1px solid ${T.hair}`, paddingTop: 15, marginTop: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Lbl>Rollout · how fast it ramps</Lbl>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 11, color: T.faint, display: "flex", alignItems: "center", gap: 6 }}>
                      Go-live
                      <select
                        value={setting.goLiveMonth}
                        onChange={(e) => onUpdateSetting({ goLiveMonth: Number(e.target.value) })}
                        className="font-abridge"
                        style={{ border: `1px solid ${T.hair}`, borderRadius: 7, padding: "3px 6px", fontSize: 13, color: T.ink, background: "#fff" }}
                      >
                        {GOLIVE_OPTIONS.map((m) => (
                          <option key={m} value={m}>Month {m}</option>
                        ))}
                      </select>
                    </span>
                    <MiniSeg options={[{ key: "year", label: "By year" }, { key: "quarter", label: "By quarter" }]} value={rampMode} onChange={setRampMode} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 30, alignItems: "center" }}>
                  <div>
                    {rampMode === "year" ? (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                          <span style={{ width: 96, fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: T.faint }}>Providers</span>
                          {yearKeys.map((k, i) => (
                            <NumCell key={k} value={providersFor(k)} onChange={(n) => setYearProviders(k, n)} kLabel={`Year ${i + 1}`} />
                          ))}
                          {Array.from({ length: heldYears }).map((_, i) => (
                            <HeldCell key={`hp${i}`} value={providersFor("year3")} kLabel={`Year ${yearKeys.length + i + 1}`} />
                          ))}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <span style={{ width: 96, fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: T.faint }}>Adoption</span>
                          {yearKeys.map((k, i) => (
                            <NumCell key={k} value={utilFor(k)} onChange={(n) => setYearUtil(k, n)} kLabel={`Year ${i + 1}`} suffix="%" />
                          ))}
                          {Array.from({ length: heldYears }).map((_, i) => (
                            <HeldCell key={`hu${i}`} value={utilFor("year3")} suffix="%" kLabel={`Year ${yearKeys.length + i + 1}`} />
                          ))}
                        </div>
                        {heldYears > 0 && (
                          <div style={{ fontSize: 11.5, color: T.faint, marginTop: 9, lineHeight: 1.5 }}>
                            Ramps to full scale by year 3, then holds there through year {termYears}. Editing the year-4+ ramp is coming soon.
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: T.faint, lineHeight: 1.6 }}>
                        Quarterly ramp is derived from the yearly targets. Switch to <b style={{ color: T.muted }}>By year</b> to edit the anchors.
                        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                          {yearKeys.map((k, i) => (
                            <span key={k} style={{ border: `1px solid ${T.hair}`, borderRadius: 8, background: "#fff", padding: "5px 10px", fontSize: 11, color: T.muted }}>
                              Y{i + 1} · {providersFor(k)}p · {utilFor(k)}%
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <Lbl>Value ramp</Lbl>
                      <span className="font-abridge" style={{ fontSize: 13, color: T.coral }}>{fmt(solo.atScale)} at scale</span>
                    </div>
                    <ValueRamp series={solo.series} />
                  </div>
                </div>
              </div>

              {/* PRICING */}
              <div style={{ borderTop: `1px solid ${T.hair}`, paddingTop: 15, marginTop: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <Lbl>Pricing</Lbl>
                  <MiniSeg
                    options={[{ key: "flat", label: "Flat" }, { key: "peryear", label: "Per year" }]}
                    value={perYearPricing ? "peryear" : "flat"}
                    onChange={(m) => {
                      if (m === "peryear") {
                        onUpdateSetting({ yearlyPricing: { year1: setting.costPerUnit, year2: setting.costPerUnit, year3: setting.costPerUnit } });
                      } else {
                        onUpdateSetting({ yearlyPricing: undefined });
                      }
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {(["perUnit", "perEncounter", "annualFlat", "platform"] as const).map((m) => (
                    <Pill key={m} on={pricingModel === m} onClick={() => onUpdateSetting({ pricingModel: m })}>
                      {pricingLabel[m]}
                    </Pill>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                  {perYearPricing ? (
                    <>
                      {yearKeys.map((k, i) => (
                        <NumCell key={k} value={Math.round(priceFor(k) * 12)} onChange={(n) => setYearPricing(k, n)} kLabel={`Y${i + 1} / provider`} prefix="$" format={commaFmt} />
                      ))}
                      {Array.from({ length: heldYears }).map((_, i) => (
                        <HeldCell key={`hpr${i}`} value={Math.round(priceFor("year3") * 12)} prefix="$" kLabel={`Y${yearKeys.length + i + 1} / provider`} />
                      ))}
                    </>
                  ) : (
                    <NumCell value={Math.round(setting.costPerUnit * 12)} onChange={(n) => onUpdateSetting({ costPerUnit: n / 12 })} kLabel="Per provider / yr" prefix="$" format={commaFmt} />
                  )}
                  <span style={{ paddingBottom: 8, color: T.off }}>→</span>
                  <div>
                    <Lbl style={{ marginBottom: 6, display: "block" }}>Investment · yr 1</Lbl>
                    <span className="font-abridge" style={{ fontSize: 19, color: T.ink }}>
                      {fmt(solo.year1Investment)}
                      <span style={{ fontSize: 11, color: T.faint }}>/yr</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* DRIVERS */}
              <div style={{ borderTop: `1px solid ${T.hair}`, paddingTop: 15, marginTop: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Lbl>Where the value comes from</Lbl>
                  <span style={{ fontSize: 11.5, color: T.faint }}>Switch on/off · expand any driver to see the math</span>
                </div>
                {orderedDrivers.map((d) => (
                  <DriverRow
                    key={d.id}
                    driver={d}
                    isOff={excluded.has(d.id)}
                    expanded={expandedDriver === d.id}
                    onToggleOff={() => onToggleDriverOff(d.id)}
                    onToggleExpand={() => setExpandedDriver((cur) => (cur === d.id ? null : d.id))}
                    formula={driverFormulas[d.id]}
                    onOnsetChange={(o) => updateDriverOnset(d.id, o)}
                  />
                ))}
              </div>

              {/* THE ONE COMPOSITION ELEMENT — this setting's mix */}
              <div style={{ borderTop: `1px solid ${T.hair}`, paddingTop: 15, marginTop: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
                  <Lbl>This setting's mix</Lbl>
                  <span className="font-abridge" style={{ fontSize: 14, color: T.ink }}>
                    {fmt(mixTotal)}
                    <span style={{ fontSize: 10, color: T.faint }}>/yr</span>
                  </span>
                </div>
                <div style={{ display: "flex", height: 22, borderRadius: 7, overflow: "hidden", background: T.soft }}>
                  {mix.map((m) => {
                    const pct = mixTotal > 0 ? (m.value / mixTotal) * 100 : 0;
                    const wide = pct > 16;
                    return (
                      <motion.div
                        key={m.q}
                        initial={false}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        style={{ background: QUADRANT_MIX[m.q], display: "flex", alignItems: "center", paddingLeft: wide ? 11 : 0, color: "#fff", fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden" }}
                      >
                        {wide && `${m.q} · ${fmt(m.value)}`}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* WHAT THEY STOP PAYING FOR — cost offsets as a first-class deal lever.
                  Legacy spend Abridge displaces, surfaced separately from clinical value. */}
              <div style={{ borderTop: `1px solid ${T.hair}`, paddingTop: 15, marginTop: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <Lbl>What they stop paying for</Lbl>
                  {settingDisplaced > 0 && (
                    <span className="font-abridge" style={{ fontSize: 14, color: T.coral }}>
                      {fmt(settingDisplaced)}<span style={{ fontSize: 10, color: T.faint }}> /yr displaced</span>
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: T.faint, marginBottom: 10, lineHeight: 1.5, maxWidth: 560 }}>
                  Legacy tools Abridge replaces. The spend comes back, ramped over the switch, and is counted separately from clinical value so it never inflates the ROI.
                </div>

                {offsets.length === 0 ? (
                  <button
                    onClick={addOffset}
                    style={{ width: "100%", textAlign: "left", fontSize: 13, fontWeight: 700, color: T.coral, background: "#fff", border: `1px dashed ${T.coral}`, borderRadius: 10, padding: "13px 15px", display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                  >
                    <Plus size={14} /> Add a tool Abridge replaces
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {offsets.map((o) => (
                      <div key={o.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, background: "#fff", border: `1px solid ${T.hair}`, borderRadius: 10, padding: "11px 13px" }}>
                        <input
                          value={o.label}
                          onChange={(e) => updateOffset(o.id, { label: e.target.value })}
                          placeholder="Legacy tool"
                          style={{ flex: "1 1 130px", minWidth: 110, fontSize: 13.5, fontWeight: 700, color: T.label, background: "none", border: "none", borderBottom: `1px solid ${T.hair}`, padding: "2px 0", outline: "none" }}
                        />
                        <NumCell value={o.annualSpend} onChange={(n) => updateOffset(o.id, { annualSpend: n })} kLabel="Annual spend" prefix="$" format={commaFmt} />
                        <NumCell value={o.displacementPct} onChange={(n) => updateOffset(o.id, { displacementPct: n })} kLabel="Displaced" suffix="%" />
                        <NumCell value={o.transitionMonths} onChange={(n) => updateOffset(o.id, { transitionMonths: n })} kLabel="Transition (mo)" />
                        <div style={{ textAlign: "right", minWidth: 82 }}>
                          <div className="font-abridge" style={{ fontSize: 15, color: T.coral, lineHeight: 1 }}>{fmt(costOffsetDisplacedAmount(o))}</div>
                          <div style={{ fontSize: 9, color: T.faint, marginTop: 3 }}>displaced / yr</div>
                        </div>
                        <button onClick={() => removeOffset(o.id)} title="Remove offset" style={{ background: "none", border: "none", cursor: "pointer", color: T.off, display: "inline-flex", padding: 4 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <button onClick={addOffset} style={{ alignSelf: "flex-start", fontSize: 12, fontWeight: 700, color: T.coral, background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                      <Plus size={13} /> Add another
                    </button>
                  </div>
                )}
              </div>

              {/* ADVANCED */}
              <div style={{ borderTop: `1px solid ${T.hair}`, marginTop: 14, paddingTop: 14, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: T.off, marginRight: 4 }}>Advanced</span>
                {["Scenario B pricing", "Edit encounter volumes", "Compare all pricing models"].map((c) => (
                  <span key={c} title="Coming soon" style={{ fontSize: 12, fontWeight: 600, color: T.muted, background: T.page, border: `1px solid ${T.hair}`, borderRadius: 8, padding: "7px 12px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "default" }}>
                    <Plus size={13} style={{ color: T.off }} /> {c}
                  </span>
                ))}
                <button
                  onClick={onRemove}
                  style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: T.off, background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
                >
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────── the workbench ─────────────────────────── */
type ChapterKey = "build" | "case" | "present";
const CHAPTERS: { key: ChapterKey; n: string; label: string }[] = [
  { key: "build", n: "01", label: "Build the deal" },
  { key: "case", n: "02", label: "The case" },
  { key: "present", n: "03", label: "Present" },
];

const TERM_OPTIONS = [
  { months: 12, label: "1 yr" },
  { months: 24, label: "2 yr" },
  { months: 36, label: "3 yr" },
  { months: 48, label: "4 yr" },
  { months: 60, label: "5 yr" },
];

export interface ProformaWorkbenchProps {
  settings: ProformaSettingSnapshot[];
  config: ProformaConfig;
  onUpdateSetting: (id: string, updates: Partial<ProformaSettingSnapshot>) => void;
  onUpdateConfig: (updates: Partial<ProformaConfig>) => void;
  onRemoveSetting: (id: string) => void;
  onNavigate?: (c: ChapterKey) => void;
}

export default function ProformaWorkbench({ settings, config, onUpdateSetting, onUpdateConfig, onRemoveSetting, onNavigate }: ProformaWorkbenchProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(settings.slice(0, 1).map((s) => s.id)));

  const excludedFor = useCallback(
    (id: string) => new Set((settings.find((s) => s.id === id)?.drivers ?? []).filter((d) => d.excluded).map((d) => d.id)),
    [settings],
  );

  // Exclusions resolved from the shared driver.excluded flag — the SAME source
  // Case and Present read (via applyExclusions), so no chapter can disagree.
  const effectiveSettings = useMemo(() => applyExclusions(settings), [settings]);

  const { summary, quadrantTotals } = useMemo(() => {
    const flows = buildMonthlyCashFlows(effectiveSettings, config);
    const s = calculateProformaSummary(effectiveSettings, config, flows);
    const last = flows.slice(-12);
    const q = {
      Capacity: last.reduce((a, r) => a + r.capacityValue, 0),
      Revenue: last.reduce((a, r) => a + r.revenueValue, 0),
      Workforce: last.reduce((a, r) => a + r.workforceValue, 0),
    };
    return { summary: s, quadrantTotals: q };
  }, [effectiveSettings, config]);

  const yearlyValue = summary.runRateValue;
  const yearlyInvestment = summary.runRateInvestment;
  const yearlyNet = yearlyValue - yearlyInvestment;
  const termYears = Math.max(1, Math.round(config.contractTermMonths / 12));
  // Legacy spend Abridge displaces, at full ramp. Shown SEPARATELY from clinical
  // value (Way C doctrine) — real cash returned, never juicing the ROI multiple.
  const displacedPerYr = effectiveSettings.reduce(
    (s, st) => s + (st.costOffsets ?? []).reduce((a, o) => a + costOffsetDisplacedAmount(o), 0),
    0,
  );

  // "The read"
  const topDomain = (Object.entries(quadrantTotals).sort((a, b) => b[1] - a[1])[0]?.[0]) ?? "Capacity";
  const topShare = yearlyValue > 0 ? Math.round(((quadrantTotals as Record<string, number>)[topDomain] / yearlyValue) * 100) : 0;
  const read =
    summary.paybackMonth != null
      ? `At this ramp the deal clears its cost by month ${summary.paybackMonth} and reaches ${fmt(summary.termNet)} net over ${termYears === 1 ? "the first year" : `${termYears} years`}. ${topDomain} carries about ${topShare}% of the value at run-rate.`
      : `The deal has not yet cleared its cost inside a ${termYears}-year term. Tune the ramp, pricing, or drivers below. ${topDomain} carries about ${topShare}% of the value at run-rate.`;

  const toggleExpanded = (id: string) =>
    setExpandedIds((cur) => {
      const next = new Set(cur);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleDriverOff = (settingId: string, driverId: string) => {
    const s = settings.find((x) => x.id === settingId);
    if (!s) return;
    onUpdateSetting(settingId, {
      drivers: s.drivers.map((d) => (d.id === driverId ? { ...d, excluded: !d.excluded } : d)),
    });
  };


  const scoreboard: { v: number; k: string; coral?: boolean }[] = [
    { v: yearlyValue, k: "Value / yr", coral: true },
    { v: yearlyInvestment, k: "Investment" },
    { v: yearlyNet, k: "Net / yr" },
    ...(displacedPerYr > 0 ? [{ v: displacedPerYr, k: "Displaced / yr" }] : []),
  ];

  return (
    <div style={{ background: T.page, minHeight: "100vh", color: T.ink, fontFamily: "Manrope, sans-serif", WebkitFontSmoothing: "antialiased" }}>
      {/* TOP BAR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", borderBottom: `1px solid ${T.hair}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <span className="font-abridge" style={{ fontSize: 20, color: T.coral }}>ABRIDGE</span>
          <div style={{ display: "flex", gap: 26 }}>
            {CHAPTERS.map((c) => {
              const active = c.key === "build";
              return (
                <button key={c.n} onClick={() => onNavigate?.(c.key)} style={{ fontSize: 13, color: active ? T.ink : T.faint, fontWeight: 600, display: "flex", alignItems: "center", gap: 7, cursor: onNavigate ? "pointer" : "default", background: "none", border: "none", padding: 0 }}>
                  <span style={{ fontSize: 10, color: active ? T.coral : T.off }}>{c.n}</span> {c.label}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {scoreboard.map((m) => (
            <div key={m.k}>
              <AnimatedMoney value={m.v} className="font-abridge" style={{ fontSize: 19, lineHeight: 1, color: m.coral ? T.coral : T.ink, display: "block" }} />
              <div style={{ fontSize: 9, color: T.faint, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 800, marginTop: 3 }}>{m.k}</div>
            </div>
          ))}
          <div>
            <div className="font-abridge" style={{ fontSize: 19, lineHeight: 1, color: T.ink }}>{settings.length}</div>
            <div style={{ fontSize: 9, color: T.faint, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 800, marginTop: 3 }}>Settings</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "34px 40px 60px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: T.coral }}>Chapter 01 · Build the deal</div>
        <h1 className="font-abridge" style={{ fontSize: 40, lineHeight: 1.04, color: T.ink, marginTop: 8 }}>Build the deal.</h1>
        <p style={{ fontSize: 15.5, color: T.muted, lineHeight: 1.5, marginTop: 12, maxWidth: 640 }}>
          Each care setting becomes a line in the deal. Set how fast it rolls out, how it's priced, and which drivers count, then the case builds from it.
        </p>

        {/* DEAL-WIDE TERMS */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 30, border: `1px solid ${T.hair}`, borderRadius: 14, background: T.card, padding: "15px 22px", marginTop: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: T.faint, marginBottom: 6 }}>Contract term</div>
            <div style={{ display: "inline-flex", border: `1px solid ${T.hair}`, borderRadius: 8, overflow: "hidden" }}>
              {TERM_OPTIONS.map((o) => {
                const on = config.contractTermMonths === o.months;
                return (
                  <button key={o.months} onClick={() => onUpdateConfig({ contractTermMonths: o.months })} style={{ fontSize: 11, fontWeight: 700, padding: "5px 10px", border: "none", cursor: "pointer", background: on ? T.ink : "transparent", color: on ? "#fff" : T.faint }}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: T.faint, marginBottom: 6 }}>System-wide fee · all settings</div>
            <NumCell value={config.systemWideFee ?? 0} onChange={(n) => onUpdateConfig({ systemWideFee: n })} prefix="$" suffix="" cellStyle={{ minWidth: 110 }} />
          </div>
          <div style={{ paddingBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.coral, cursor: "default" }}>Advanced deal assumptions →</span>
            <div style={{ fontSize: 10.5, color: T.off, marginTop: 3 }}>ramp speed · retention phasing · defaults</div>
          </div>
        </div>

        {/* THE READ */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", border: "1px solid #F0D9CF", borderRadius: 14, background: "#FEF9F7", padding: "16px 22px", marginTop: 14 }}>
          <Lbl style={{ color: T.coral, whiteSpace: "nowrap", paddingTop: 2 }}>The read</Lbl>
          <div className="font-abridge" style={{ fontSize: 17, color: T.ink, lineHeight: 1.35, maxWidth: 840 }}>{read}</div>
        </div>

        {/* SETTING CARDS */}
        {settings.map((s) => (
          <SettingCard
            key={s.id}
            setting={s}
            config={config}
            excluded={excludedFor(s.id)}
            expanded={expandedIds.has(s.id)}
            onToggleExpanded={() => toggleExpanded(s.id)}
            onUpdateSetting={(u) => onUpdateSetting(s.id, u)}
            onRemove={() => onRemoveSetting(s.id)}
            onToggleDriverOff={(driverId) => toggleDriverOff(s.id, driverId)}
          />
        ))}

        {/* ADD SETTING (placeholder) */}
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: T.faint, marginTop: 26 }}>Add a care setting</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          {["Inpatient", "Nursing"].map((label) => (
            <div key={label} style={{ border: `1.5px dashed ${T.hair}`, borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, color: T.muted }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, border: `1.5px dashed ${T.off}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.off }}>
                <Plus size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: T.ink }}>{label}</div>
                <div style={{ fontSize: 12 }}>Build it in Explore, then it lands here</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32 }}>
          <span style={{ fontSize: 13, color: T.faint }}>{settings.length} settings · {fmt(yearlyValue)}/yr modeled so far</span>
          <button onClick={() => onNavigate?.("case")} style={{ background: T.coral, color: "#fff", border: "none", fontFamily: "Manrope", fontWeight: 700, fontSize: 15, padding: "14px 26px", borderRadius: 12, cursor: "pointer" }}>
            See the {termYears}-year case →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── sample data ─────────────────────────── */
type DriverSeed = { id: string; name: string; value: number; quadrant: ExploreQuadrant; onset: DriverOnset; category: "time" | "documentation"; excluded?: boolean };

function buildSetting(
  base: {
    id: string;
    careSetting: ProformaSettingSnapshot["careSetting"];
    label: string;
    providerCount: number;
    fullScaleProviders: number;
    utilizationPercent: number;
    yearlyProviders: { year1: number; year2: number; year3: number };
    yearlyUtilization: { year1: number; year2: number; year3: number };
    costPerUnit: number;
    yearlyPricing?: { year1: number; year2: number; year3: number };
    goLiveMonth: number;
    color: string;
    drivers: DriverSeed[];
    costOffsets?: CostOffset[];
  },
): ProformaSettingSnapshot {
  const drivers: ProformaDriver[] = base.drivers.map((d) => ({ id: d.id, name: d.name, value: d.value, quadrant: d.quadrant, onset: d.onset, category: d.category, excluded: d.excluded }));
  const annualValue = drivers.reduce((s, d) => s + d.value, 0);
  const q = (name: ExploreQuadrant) => drivers.filter((d) => d.quadrant === name).reduce((s, d) => s + d.value, 0);
  return {
    id: base.id,
    careSetting: base.careSetting,
    label: base.label,
    providerCount: base.providerCount,
    fullScaleProviders: base.fullScaleProviders,
    fullScaleUtilization: base.utilizationPercent,
    encounters: base.fullScaleProviders * 2400,
    utilizationPercent: base.utilizationPercent,
    annualValue,
    timeValue: q("Capacity"),
    docValue: q("Revenue"),
    retentionValue: q("Workforce"),
    totalHoursSaved: base.fullScaleProviders * 120,
    drivers,
    // Engine convention: costPerUnit / yearlyPricing are MONTHLY per-provider
    // rates (annual investment = rate × providers × 12). Sample values are given
    // as annual per-provider dollars, so divide by 12 here.
    costPerUnit: base.costPerUnit / 12,
    pricingModel: "perUnit",
    yearlyPricing: base.yearlyPricing
      ? { year1: base.yearlyPricing.year1 / 12, year2: base.yearlyPricing.year2 / 12, year3: base.yearlyPricing.year3 / 12 }
      : undefined,
    implementationFee: 0,
    goLiveMonth: base.goLiveMonth,
    color: base.color,
    fullExploreState: { ...DEFAULT_EXPLORE_STATE },
    yearlyProviders: base.yearlyProviders,
    yearlyUtilization: base.yearlyUtilization,
    capacityValue: q("Capacity"),
    workforceValue: q("Workforce"),
    revenueValue: q("Revenue"),
    qualityValue: q("Quality"),
    costOffsets: base.costOffsets,
  };
}

export const SAMPLE_PROFORMA_SETTINGS: ProformaSettingSnapshot[] = [
  buildSetting({
    id: "outpatient-1",
    careSetting: "outpatient",
    label: "Outpatient",
    providerCount: 120,
    fullScaleProviders: 240,
    utilizationPercent: 80,
    yearlyProviders: { year1: 120, year2: 180, year3: 240 },
    yearlyUtilization: { year1: 40, year2: 60, year3: 80 },
    costPerUnit: 2250,
    yearlyPricing: { year1: 2250, year2: 2250, year3: 2100 },
    goLiveMonth: 1,
    color: "#E8350A",
    drivers: [
      { id: "patientAccess", name: "Patient access", value: 549000, quadrant: "Capacity", onset: "immediate", category: "time" },
      { id: "wrvu", name: "wRVU capture", value: 412000, quadrant: "Revenue", onset: "delayed", category: "documentation" },
      { id: "hcc", name: "HCC recapture", value: 319000, quadrant: "Revenue", onset: "delayed", category: "documentation" },
      { id: "providerWellbeing", name: "Provider wellbeing", value: 180000, quadrant: "Workforce", onset: "phased", category: "time" },
      { id: "locum", name: "Locum & agency avoidance", value: 95000, quadrant: "Workforce", onset: "phased", category: "time", excluded: true },
      { id: "docQuality", name: "Documentation quality", value: 0, quadrant: "Quality", onset: "immediate", category: "documentation" },
    ],
    costOffsets: [
      { id: "legacy-scribe", label: "Legacy ambient scribe", annualSpend: 180000, displacementPct: 100, transitionMonths: 6 },
    ],
  }),
  buildSetting({
    id: "ed-1",
    careSetting: "ed",
    label: "Emergency",
    providerCount: 80,
    fullScaleProviders: 110,
    utilizationPercent: 75,
    yearlyProviders: { year1: 80, year2: 95, year3: 110 },
    yearlyUtilization: { year1: 50, year2: 60, year3: 75 },
    costPerUnit: 1750,
    goLiveMonth: 4,
    color: "#BF2A06",
    drivers: [
      { id: "edLwbs", name: "Throughput & LWBS", value: 260000, quadrant: "Capacity", onset: "immediate", category: "time" },
      { id: "wrvu", name: "E/M level coding", value: 240000, quadrant: "Revenue", onset: "delayed", category: "documentation" },
      { id: "providerWellbeing", name: "Provider wellbeing", value: 50000, quadrant: "Workforce", onset: "phased", category: "time" },
    ],
  }),
];

export const SAMPLE_PROFORMA_CONFIG: ProformaConfig = {
  ...DEFAULT_PROFORMA_CONFIG,
  contractTermMonths: 36,
  systemWideFee: 50000,
};
