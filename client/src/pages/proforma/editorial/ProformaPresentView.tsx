import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProformaSettingSnapshot, ProformaConfig } from "../proformaTypes";
import { generateProformaEditorialPDF } from "@/components/proforma/ProformaPDFExport";
import {
  T,
  fmt,
  wordify,
  Lbl,
  ChapterNav,
  AnimatedMoney,
  AnimatedX,
  StackedBuildChart,
  StressTest,
  computeCaseModel,
  type Chapter,
  type CaseDriver,
} from "./editorialShared";

/* ─────────────────────────── driver math chain ─────────────────────────── */
// Mirrors the Build workbench's breakdown seeds so the "show the math" chain in
// Present reads the same. The per-unit rate (U) is back-solved from the driver's
// value, so V × L × U × R always multiplies out to the dollar shown.
const CHAIN_SEED: Record<string, { labels: [string, string, string, string]; V: number; L: number; R: number }> = {
  hcc: { labels: ["members", "HCC lift / life", "per HCC", "realization"], V: 18000, L: 0.125, R: 50 },
  patientAccess: { labels: ["panel size", "visits / life", "$ / visit", "realization"], V: 24000, L: 0.6, R: 60 },
  wrvu: { labels: ["encounters", "wRVU lift", "$ / wRVU", "realization"], V: 180000, L: 0.35, R: 65 },
  providerWellbeing: { labels: ["providers", "hours saved", "$ / hour", "realization"], V: 120, L: 180, R: 55 },
  locum: { labels: ["shifts avoided", "coverage", "$ / shift", "realization"], V: 60, L: 1, R: 70 },
};

const num = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : String(Number(n.toFixed(3))));

function DriverChain({ driver }: { driver: CaseDriver }) {
  const seed = CHAIN_SEED[driver.id] ?? { labels: ["volume", "lift / unit", "$ / unit", "realization"] as [string, string, string, string], V: 1000, L: 1, R: 60 };
  const U = driver.value / (seed.V * seed.L * (seed.R / 100)) || 0;
  const cells: { n: string; u: string }[] = [
    { n: num(seed.V), u: seed.labels[0] },
    { n: num(seed.L), u: seed.labels[1] },
    { n: `$${Math.round(U).toLocaleString()}`, u: seed.labels[2] },
    { n: `${seed.R}%`, u: seed.labels[3] },
  ];
  return (
    <div style={{ display: "flex", gap: 13, alignItems: "center", flexWrap: "wrap", margin: "8px 0 4px", paddingLeft: 23 }}>
      {cells.map((c, i) => (
        <span key={i} style={{ display: "flex", gap: 13, alignItems: "center" }}>
          <span style={{ textAlign: "center" }}>
            <span className="font-abridge" style={{ fontSize: 17, color: T.ink, lineHeight: 1, display: "block" }}>{c.n}</span>
            <span style={{ fontSize: 9, color: T.faint, marginTop: 3, display: "block" }}>{c.u}</span>
          </span>
          <span style={{ fontSize: 13, color: "#C9BCA9" }}>×</span>
        </span>
      ))}
      <span style={{ fontSize: 13, color: "#C9BCA9" }}>=</span>
      <span style={{ textAlign: "center" }}>
        <span className="font-abridge" style={{ fontSize: 17, color: T.coral, lineHeight: 1, display: "block" }}>{fmt(driver.value)}</span>
        <span style={{ fontSize: 9, color: T.faint, marginTop: 3, display: "block" }}>a year</span>
      </span>
    </div>
  );
}

/* ─────────────────────────── expandable setting ─────────────────────────── */
function DealSetting({
  meta,
  defaultOpen,
}: {
  meta: import("./editorialShared").CaseSettingMeta;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [openDriver, setOpenDriver] = useState<string | null>(null);

  return (
    <>
      <div onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 0", borderBottom: `1px solid ${T.soft}`, cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.2 }} style={{ color: T.off, fontSize: 11, width: 12, display: "inline-block" }}>▾</motion.span>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: meta.color, flex: "none" }} />
          <span className="font-abridge" style={{ fontSize: 21 }}>{meta.label}</span>
          <span style={{ fontSize: 12, color: T.faint }}>{meta.providerCount} → {meta.fullScaleProviders} providers · go-live month {meta.goLiveMonth}</span>
        </div>
        <span className="font-abridge" style={{ fontSize: 19 }}>{fmt(meta.atScale)}<span style={{ fontSize: 12, color: T.faint }}>/yr</span></span>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: "hidden", background: "#FBF8F4", borderBottom: `1px solid ${T.soft}` }}>
            <div style={{ padding: "14px 0 16px 23px" }}>
              {meta.drivers.map((d, i) => {
                const isOpen = openDriver === d.id;
                return (
                  <div key={d.id}>
                    <div
                      onClick={() => setOpenDriver((cur) => (cur === d.id ? null : d.id))}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: i === meta.drivers.length - 1 && !isOpen ? "none" : `1px solid ${T.soft}`, cursor: "pointer" }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: T.label, display: "flex", alignItems: "center", gap: 8 }}>
                        {d.name}
                        <span style={{ fontSize: 10, color: T.off }}>{isOpen ? "hide math" : "show math"}</span>
                      </span>
                      <span className="font-abridge" style={{ fontSize: 15, color: T.coral }}>{fmt(d.value)}</span>
                    </div>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.24 }} style={{ overflow: "hidden" }}>
                          <DriverChain driver={d} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─────────────────────────── the chapter ─────────────────────────── */
const STEP = { border: `1.5px solid ${T.coral}`, color: T.coral } as const;

export interface ProformaPresentViewProps {
  settings: ProformaSettingSnapshot[];
  config: ProformaConfig;
  org: string;
  onNavigate: (c: Chapter) => void;
}

export default function ProformaPresentView({ settings, config, org, onNavigate }: ProformaPresentViewProps) {
  const model = useMemo(() => computeCaseModel(settings, config), [settings, config]);
  const [isolatedId, setIsolatedId] = useState<string | null>(null);
  const [showStress, setShowStress] = useState(false);

  const { settingsMeta, termValue, termInvestment, termNet, payback, roi, runRate, termYears } = model;

  const conservative = termValue * 0.7 - termInvestment;
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const headline = payback != null
    ? `A ${fmt(termNet)} case, paid back in ${wordify(payback)} months.`
    : `A ${fmt(runRate)} run-rate case, built over ${termYears === 3 ? "three" : wordify(termYears)} years.`;

  return (
    <div style={{ background: T.page, minHeight: "100vh", color: T.ink, fontFamily: "Manrope, sans-serif", WebkitFontSmoothing: "antialiased" }}>
      {/* TOP BAR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", borderBottom: `1px solid ${T.hair}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <span className="font-abridge" style={{ fontSize: 20, color: T.coral }}>ABRIDGE</span>
          <ChapterNav active="present" onNavigate={onNavigate} />
        </div>
        <button
          onClick={() => generateProformaEditorialPDF(settings, config, org)}
          style={{ background: T.ink, color: "#fff", border: "none", fontFamily: "Manrope", fontWeight: 700, fontSize: 13, padding: "9px 16px", borderRadius: 9, cursor: "pointer" }}
        >
          Download the deal PDF ↓
        </button>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "52px 40px 70px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: T.coral }}>The case · {org}</div>
        <h1 className="font-abridge" style={{ fontSize: 58, lineHeight: 1.03, color: T.ink, marginTop: 16, maxWidth: 820 }}>{headline}</h1>
        <p style={{ fontSize: 16, color: T.muted, lineHeight: 1.5, marginTop: 18, maxWidth: 640 }}>
          {settings.length === 1 ? "One care setting" : `${wordify(settings.length).replace(/^\w/, (c) => c.toUpperCase())} care settings`}, modeled on your own volume and economics over {termYears === 3 ? "three" : wordify(termYears)} years. Everything here opens up, tap any line to see exactly how it's built.
        </p>

        {/* 4 STATS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginTop: 40, padding: "26px 0", borderTop: `1px solid ${T.hair}`, borderBottom: `1px solid ${T.hair}` }}>
          <Cell v={<AnimatedMoney value={termNet} />} k={`${termYears === 3 ? "Three" : wordify(termYears)}-year net value`} coral />
          <Cell v={payback != null ? `Month ${payback}` : "—"} k="Payback" />
          <Cell v={<AnimatedX value={roi} />} k="Return on investment" />
          <Cell v={<span><AnimatedMoney value={runRate} /><span style={{ fontSize: 14, color: T.faint }}>/yr</span></span>} k="At full scale" />
        </div>

        {/* THE DEAL */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 44, marginBottom: 4 }}>
          <Lbl>The deal</Lbl>
          <span style={{ fontSize: 11, color: T.off }}>Tap a setting to see its drivers and the math</span>
        </div>
        {settingsMeta.map((meta, i) => (
          <DealSetting key={meta.id} meta={meta} defaultOpen={i === 0} />
        ))}

        {/* THE 3-YEAR ARC */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 44, marginBottom: 14 }}>
          <Lbl>How it builds over {termYears === 3 ? "three" : wordify(termYears)} years</Lbl>
          <span style={{ fontSize: 11, color: T.off }}>By year · tap a setting to isolate it</span>
        </div>
        <StackedBuildChart model={model} mode="year" isolatedId={isolatedId} onIsolate={setIsolatedId} variant="wide" />

        {/* WHY IT HOLDS */}
        <div onClick={() => setShowStress((s) => !s)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${T.hair}`, borderRadius: 14, background: T.card, padding: "18px 22px", marginTop: 40, cursor: "pointer" }}>
          <div>
            <div style={{ marginBottom: 5 }}><Lbl>Why it holds</Lbl></div>
            <div style={{ fontSize: 14, color: T.muted }}>
              Even the conservative case (<b className="font-abridge" style={{ fontStyle: "normal", color: T.ink }}>{fmt(conservative)}</b> net) clears the cost several times over.
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.coral }}>{showStress ? "Hide the stress test ↑" : "See the stress test →"}</span>
        </div>
        <AnimatePresence initial={false}>
          {showStress && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: "hidden" }}>
              <div style={{ marginTop: 16 }}>
                <StressTest termValue={termValue} termInvestment={termInvestment} termNet={termNet} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CLOSE + FORWARD */}
        <div style={{ border: `1.5px solid ${T.coral}`, borderRadius: 22, background: "#FEF6F3", padding: "32px 36px", marginTop: 44 }}>
          <Lbl style={{ color: T.coral }}>The number is yours</Lbl>
          <div className="font-abridge" style={{ fontSize: 26, color: T.ink, marginTop: 10, lineHeight: 1.25, maxWidth: 720 }}>
            Every figure here is your own volume and economics, yours to verify, and ours to prove alongside you.
          </div>
          <div style={{ borderTop: "1px solid #F6D9CF", marginTop: 22, paddingTop: 20 }}>
            <div style={{ marginBottom: 4 }}><Lbl style={{ color: T.label }}>How we prove it, together</Lbl></div>
            {[
              { t: "Instrument the signals in your Epic", b: "The same drivers above, wired to live Epic signals, no new reporting burden." },
              { t: "Measure the before, then the after", b: "A clean baseline so the lift is yours, not a benchmark." },
              { t: "Report attainment every quarter", b: "Track the case against reality, and adjust the deal as the numbers land." },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "12px 0" }}>
                <span className="font-abridge" style={{ width: 26, height: 26, borderRadius: 99, ...STEP, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{i + 1}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{s.t}</div>
                  <div style={{ fontSize: 12.5, color: T.faint, marginTop: 2 }}>{s.b}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22, gap: 20, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12.5, color: T.muted }}>Prepared with your team · {monthLabel}</div>
            <button style={{ background: T.coral, color: "#fff", border: "none", fontFamily: "Manrope", fontWeight: 700, fontSize: 15, padding: "14px 28px", borderRadius: 12, cursor: "pointer" }}>
              Build the plan together, in Value Attainment →
            </button>
          </div>
        </div>

        {/* back nav */}
        <div style={{ marginTop: 28 }}>
          <button onClick={() => onNavigate("case")} style={{ background: "none", border: "none", color: T.faint, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>← Back to the 3-year case</button>
        </div>
      </div>
    </div>
  );
}

function Cell({ v, k, coral }: { v: React.ReactNode; k: string; coral?: boolean }) {
  return (
    <div>
      <div className="font-abridge" style={{ fontSize: 34, color: coral ? T.coral : T.ink }}>{v}</div>
      <div style={{ fontSize: 10, color: T.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginTop: 6 }}>{k}</div>
    </div>
  );
}
