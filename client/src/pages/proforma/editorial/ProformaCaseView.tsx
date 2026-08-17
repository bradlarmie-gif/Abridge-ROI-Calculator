import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import type { ProformaSettingSnapshot, ProformaConfig } from "../proformaTypes";
import {
  T,
  fmt,
  Lbl,
  Seg,
  ChapterNav,
  AnimatedMoney,
  AnimatedX,
  StackedBuildChart,
  StressTest,
  computeCaseModel,
  useNarrow,
  type Chapter,
  type CaseSettingMeta,
} from "./editorialShared";

/* ─────────────────────────── financial summary matrix ─────────────────────────── */
// Label + one column per term year + a term-total column, so the table stays
// aligned whether the deal is 1 or 5 years.
const gridFor = (nYears: number) => `1.5fr ${Array(Math.max(1, nYears)).fill("1fr").join(" ")} 1.05fr`;

function FRow({ children, style, grid }: { children: React.ReactNode; style?: React.CSSProperties; grid: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: grid, padding: "12px 26px", alignItems: "baseline", ...style }}>
      {children}
    </div>
  );
}
function Num({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span className="font-abridge" style={{ textAlign: "right", fontSize: 16, ...style }}>
      {children}
    </span>
  );
}

// A driver's contribution to a given period, allocated by its at-scale share of
// its setting's clinical value. Shares sum to 1, so the driver rows always
// reconcile back to the setting row for every year.
function driverShares(meta: CaseSettingMeta): { id: string; name: string; share: number }[] {
  const total = meta.drivers.reduce((a, d) => a + d.value, 0) || 1;
  return meta.drivers.map((d) => ({ id: d.id, name: d.name, share: d.value / total }));
}

function SettingMatrixRow({
  meta,
  yearValues,
  termValue,
  expanded,
  onToggle,
  lastRow,
  grid,
}: {
  meta: CaseSettingMeta;
  yearValues: number[];
  termValue: number;
  expanded: boolean;
  onToggle: () => void;
  lastRow: boolean;
  grid: string;
}) {
  const shares = driverShares(meta);
  return (
    <>
      <FRow grid={grid} style={{ borderBottom: `1px solid ${lastRow ? T.hair : T.soft}`, cursor: "pointer" }}>
        <span style={{ fontSize: 13.5, color: T.label, fontWeight: 700, display: "flex", alignItems: "center", gap: 9 }} onClick={onToggle}>
          <motion.span animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }} style={{ color: T.off, fontSize: 10, width: 10, display: "inline-block" }}>▸</motion.span>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: meta.color, flex: "none" }} />
          {meta.label}
        </span>
        {yearValues.map((v, i) => (
          <Num key={i}>{fmt(v)}</Num>
        ))}
        <Num>{fmt(termValue)}</Num>
      </FRow>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: "hidden", background: "#FBF8F4", borderBottom: `1px solid ${T.soft}` }}>
            {shares.map((d) => (
              <div key={d.id} style={{ display: "grid", gridTemplateColumns: grid, padding: "9px 26px", alignItems: "baseline" }}>
                <span style={{ fontSize: 12.5, color: T.muted, paddingLeft: 29 }}>{d.name}</span>
                {yearValues.map((v, i) => (
                  <span key={i} className="font-abridge" style={{ textAlign: "right", fontSize: 13.5, color: T.faint }}>{fmt(v * d.share)}</span>
                ))}
                <span className="font-abridge" style={{ textAlign: "right", fontSize: 13.5, color: T.coral }}>{fmt(termValue * d.share)}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─────────────────────────── the chapter ─────────────────────────── */
export interface ProformaCaseViewProps {
  settings: ProformaSettingSnapshot[];
  config: ProformaConfig;
  onNavigate: (c: Chapter) => void;
}

export default function ProformaCaseView({ settings, config, onNavigate }: ProformaCaseViewProps) {
  const model = useMemo(() => computeCaseModel(settings, config), [settings, config]);
  const [mode, setMode] = useState<"year" | "quarter">("year");
  const [isolatedId, setIsolatedId] = useState<string | null>(null);
  const [expandedSetting, setExpandedSetting] = useState<string | null>(model.settingsMeta[0]?.id ?? null);

  const { years, settingsMeta, termValue, termInvestment, termNet, termDisplaced, payback, paybackWithDisplacement, roi, runRate, termYears } = model;
  const narrow = useNarrow();
  const grid = gridFor(years.length);
  // The displacement-acceleration story: real break-even once you count the
  // legacy spend Abridge displaces (shown only when it actually lands sooner).
  const displacementBeat = termDisplaced > 0 && paybackWithDisplacement != null && payback != null && paybackWithDisplacement < payback;

  // Mini scoreboard (per-year run-rate = last year value / investment / net).
  const lastYear = years[years.length - 1];
  const scoreboard: { v: number; k: string; coral?: boolean }[] = [
    { v: lastYear?.clinical ?? 0, k: "Value / yr", coral: true },
    { v: lastYear?.investment ?? 0, k: "Investment" },
    { v: (lastYear?.clinical ?? 0) - (lastYear?.investment ?? 0), k: "Net / yr" },
    ...((lastYear?.displaced ?? 0) > 0 ? [{ v: lastYear.displaced, k: "Displaced / yr" }] : []),
  ];

  let cumRunning = 0;
  const cumByYear = years.map((y) => (cumRunning += y.net));

  const paybackLabel = payback != null ? `Month ${payback}` : "—";
  const anchor = settingsMeta[0];
  const stacked = settingsMeta.length > 1 ? settingsMeta[1] : null;

  return (
    <div style={{ background: T.page, minHeight: "100vh", color: T.ink, fontFamily: "Manrope, sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <UnifiedHeader
        pathType="forecast"
        pathLabel="Financial"
        showBack={false}
        centerContent={<ChapterNav active="case" onNavigate={onNavigate} />}
        rightAction={
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {scoreboard.map((m) => (
              <div key={m.k}>
                <AnimatedMoney value={m.v} className="font-abridge" style={{ fontSize: 18, lineHeight: 1, color: m.coral ? T.coral : T.ink, display: "block" }} />
                <div style={{ fontSize: 9, color: T.faint, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 800, marginTop: 3 }}>{m.k}</div>
              </div>
            ))}
            <div>
              <div className="font-abridge" style={{ fontSize: 18, lineHeight: 1, color: T.ink }}>{settings.length}</div>
              <div style={{ fontSize: 9, color: T.faint, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 800, marginTop: 3 }}>Settings</div>
            </div>
          </div>
        }
      />
      <UnifiedHeaderSpacer />

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "36px 40px 60px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: T.coral }}>Chapter 02 · The case</div>
        <h1 className="font-abridge" style={{ fontSize: 40, lineHeight: 1.04, color: T.ink, marginTop: 8 }}>The case, over {termYears === 1 ? "one year" : `${termYears} years`}.</h1>
        <p style={{ fontSize: 15.5, color: T.muted, lineHeight: 1.5, marginTop: 12, maxWidth: 640 }}>
          How the value builds as each care setting comes online and adoption deepens.
          {anchor ? ` ${anchor.label} anchors year one` : ""}
          {stacked ? `; ${stacked.label} stacks on when it goes live in month ${stacked.goLiveMonth}.` : "."}
        </p>

        {/* HERO: stacked build + verdict */}
        <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1.6fr 1fr", gap: narrow ? 24 : 34, marginTop: 26, alignItems: "center" }}>
          <div style={{ border: `1px solid ${T.hair}`, borderRadius: 20, background: T.card, padding: "24px 26px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <Lbl>Value by care setting, building over the term</Lbl>
              <Seg options={[{ key: "year", label: "By year" }, { key: "quarter", label: "By quarter" }]} value={mode} onChange={setMode} />
            </div>
            <StackedBuildChart model={model} mode={mode} isolatedId={isolatedId} onIsolate={setIsolatedId} variant="compact" />
          </div>
          <div>
            <AnimatedMoney value={termNet} className="font-abridge" style={{ fontSize: 56, color: T.coral, lineHeight: 0.9 }} />
            <div style={{ marginTop: 4 }}><Lbl>{termYears === 3 ? "Three-year" : `${termYears}-year`} net value</Lbl></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 22 }}>
              <Stat v={paybackLabel} k="Payback" />
              <Stat v={<AnimatedX value={roi} />} k="Return on investment" coral />
              <Stat v={<AnimatedMoney value={termValue} />} k={`${termYears}-year value`} />
              <Stat v={<AnimatedMoney value={termInvestment} />} k={`${termYears}-year investment`} />
            </div>
          </div>
        </div>

        {/* FINANCIAL SUMMARY MATRIX */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 38, marginBottom: 2 }}>
          <Lbl>{termYears}-year financial summary</Lbl>
          <span style={{ fontSize: 11, color: T.off }}>Expand a setting to see its value drivers</span>
        </div>
        <div style={{ border: `1px solid ${T.hair}`, borderRadius: 18, background: T.card, overflowX: "auto", marginTop: 12 }}>
          <div style={{ minWidth: 380 + years.length * 96 }}>
          <FRow grid={grid} style={{ borderBottom: `1px solid ${T.hair}`, background: "#FBF7F1" }}>
            <Lbl />
            {years.map((_, i) => (
              <Lbl key={i} style={{ textAlign: "right" }}>Year {i + 1}</Lbl>
            ))}
            <Lbl style={{ textAlign: "right" }}>{termYears}-year</Lbl>
          </FRow>

          {settingsMeta.map((meta, si) => {
            const yv = years.map((y) => y.perSetting.find((x) => x.id === meta.id)?.value ?? 0);
            const tv = yv.reduce((a, b) => a + b, 0);
            return (
              <SettingMatrixRow
                key={meta.id}
                meta={meta}
                yearValues={yv}
                termValue={tv}
                expanded={expandedSetting === meta.id}
                onToggle={() => setExpandedSetting((cur) => (cur === meta.id ? null : meta.id))}
                lastRow={si === settingsMeta.length - 1}
                grid={grid}
              />
            );
          })}

          {/* totals */}
          <FRow grid={grid} style={{ borderBottom: `1px solid ${T.soft}`, background: "#F4EEE6" }}>
            <span style={{ fontSize: 13.5, color: T.label, fontWeight: 800 }}>Total value</span>
            {years.map((y, i) => (<Num key={i}>{fmt(y.clinical)}</Num>))}
            <Num>{fmt(termValue)}</Num>
          </FRow>
          <FRow grid={grid} style={{ borderBottom: `1px solid ${T.soft}` }}>
            <span style={{ fontSize: 13.5, color: T.muted }}>Investment</span>
            {years.map((y, i) => (<Num key={i} style={{ color: T.muted }}>({fmt(y.investment)})</Num>))}
            <Num style={{ color: T.muted }}>({fmt(termInvestment)})</Num>
          </FRow>
          <FRow grid={grid} style={{ borderBottom: `1px solid ${T.soft}`, background: "#FEF3EF" }}>
            <span style={{ fontSize: 13.5, color: T.label, fontWeight: 800 }}>Net value</span>
            {years.map((y, i) => (<Num key={i}>{fmt(y.net)}</Num>))}
            <Num style={{ color: T.coral }}>{fmt(termNet)}</Num>
          </FRow>
          {termDisplaced > 0 && (
            <FRow grid={grid} style={{ borderBottom: `1px solid ${T.soft}` }}>
              <span style={{ fontSize: 13.5, color: T.muted }}>Cost displaced <span style={{ fontSize: 11, color: T.faint }}>· returned, separate from value</span></span>
              {years.map((y, i) => (<Num key={i} style={{ color: T.coral }}>{fmt(y.displaced)}</Num>))}
              <Num style={{ color: T.coral }}>{fmt(termDisplaced)}</Num>
            </FRow>
          )}
          <FRow grid={grid} style={{ borderBottom: `1px solid ${T.soft}` }}>
            <span style={{ fontSize: 13.5, color: T.muted }}>Cumulative net</span>
            {cumByYear.map((c, i) => (<Num key={i} style={{ color: T.muted }}>{fmt(c)}</Num>))}
            <Num style={{ color: T.off }}>—</Num>
          </FRow>
          <FRow grid={grid}>
            <span style={{ fontSize: 13.5, color: T.muted }}>Return on investment</span>
            {years.map((y, i) => (<Num key={i}>{y.roi.toFixed(1)}×</Num>))}
            <Num style={{ color: T.coral }}>{roi.toFixed(1)}×</Num>
          </FRow>
          </div>
        </div>

        {/* STRESS TEST */}
        <div style={{ marginTop: 34 }}>
          <StressTest termValue={termValue} termInvestment={termInvestment} termNet={termNet} />
        </div>

        {/* THE READ */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", border: "1px solid #F0D9CF", borderRadius: 14, background: "#FEF9F7", padding: "16px 22px", marginTop: 32 }}>
          <Lbl style={{ color: T.coral, whiteSpace: "nowrap", paddingTop: 2 }}>The read</Lbl>
          <div className="font-abridge" style={{ fontSize: 17, color: T.ink, lineHeight: 1.35, maxWidth: 860 }}>
            {payback != null ? (
              <>Year one is the investment year while the team ramps; on clinical value alone, payback lands in <span style={{ color: T.coral }}>month {payback}</span>{stacked ? ` once ${stacked.label} is online` : ""}. From there the settings compound to <span style={{ color: T.coral }}>{fmt(termNet)} net</span> over the term.{displacementBeat ? <> Counting the <span style={{ color: T.coral }}>{fmt(termDisplaced)}</span> in legacy spend Abridge displaces, real break-even comes sooner, in <span style={{ color: T.coral }}>month {paybackWithDisplacement}</span>.</> : null}</>
            ) : (
              <>The case has not yet cleared its cost inside the term. Tune the ramp, pricing, or drivers in Build the deal, then the settings compound toward a <span style={{ color: T.coral }}>{fmt(runRate)}</span> run-rate.</>
            )}
          </div>
        </div>

        {/* NAV */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32 }}>
          <button onClick={() => onNavigate("build")} style={{ background: "none", border: "none", color: T.faint, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>← Back to build</button>
          <button onClick={() => onNavigate("present")} style={{ background: T.coral, color: "#fff", border: "none", fontFamily: "Manrope", fontWeight: 700, fontSize: 15, padding: "14px 26px", borderRadius: 12, cursor: "pointer" }}>Present the case →</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ v, k, coral }: { v: React.ReactNode; k: string; coral?: boolean }) {
  return (
    <div>
      <div className="font-abridge" style={{ fontSize: 30, color: coral ? T.coral : T.ink }}>{v}</div>
      <div style={{ fontSize: 10, color: T.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginTop: 5 }}>{k}</div>
    </div>
  );
}
