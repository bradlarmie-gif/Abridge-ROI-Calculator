import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProformaSettingSnapshot, ProformaConfig } from "../proformaTypes";
import { settingVocab } from "../proformaTypes";
import { generateProformaEditorialPDF } from "@/components/proforma/ProformaPDFExport";
import { computeSettingDriverFormulas } from "@/lib/presentFormulas";
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

/* ─────────────────────────── driver "show the math" ─────────────────────────── */
// The REAL reconciling formula string (the same source Build and the PDF use).
// No fabricated constants: when a driver has no single clean formula we say so,
// rather than invent one that only looks like "your own numbers."
function DriverChain({ driver, formula }: { driver: CaseDriver; formula?: string }) {
  return (
    <div style={{ margin: "8px 0 6px", paddingLeft: 23 }}>
      {formula ? (
        <div style={{ fontSize: 13, lineHeight: 1.8, color: T.muted }}>{formula}</div>
      ) : (
        <div style={{ fontSize: 12.5, color: T.faint, fontStyle: "italic", lineHeight: 1.6 }}>
          Built from this setting's Explore model. Adjust the clinical inputs in Explore to change it.
        </div>
      )}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 7 }}>
        <span style={{ fontSize: 11, color: T.faint }}>equals</span>
        <span className="font-abridge" style={{ fontSize: 17, color: T.coral }}>{fmt(driver.value)}<span style={{ fontSize: 10, color: T.faint }}> a year</span></span>
      </div>
    </div>
  );
}

/* ─────────────────────────── expandable setting ─────────────────────────── */
function DealSetting({
  meta,
  defaultOpen,
  formulas,
}: {
  meta: import("./editorialShared").CaseSettingMeta;
  defaultOpen: boolean;
  formulas: Record<string, string>;
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
          <span style={{ fontSize: 12, color: T.faint }}>{meta.providerCount} → {meta.fullScaleProviders} {settingVocab(meta.careSetting).providerWord} · go-live month {meta.goLiveMonth}</span>
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
                          <DriverChain driver={d} formula={formulas[d.id]} />
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

  const { settingsMeta, termValue, termInvestment, termNet, termDisplaced, payback, paybackWithDisplacement, roi, runRate, termYears } = model;
  // Displacement-acceleration story: headline payback is clinical-only; real
  // break-even lands sooner once the displaced legacy spend is counted.
  const displacementBeat = termDisplaced > 0 && paybackWithDisplacement != null && payback != null && paybackWithDisplacement < payback;

  const conservative = termValue * 0.7 - termInvestment;
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  // Real reconciling per-driver formulas, keyed by setting id (same source as
  // Build + the PDF). No fabricated chains.
  const formulasById = useMemo(
    () => Object.fromEntries(settings.map((s) => [s.id, computeSettingDriverFormulas(s)])),
    [settings],
  );

  // Copy must match the sign of the deal: only a winning deal gets triumphant
  // language, so a losing (e.g. 1-year) case is never dressed as a win.
  const wins = termNet > 0 && payback != null;
  const termWord = termYears === 1 ? "one year" : `${termYears === 3 ? "three" : wordify(termYears)} years`;
  const headline = wins
    ? `A ${fmt(termNet)} case, paid back in ${wordify(payback!)} months.`
    : termNet > 0
      ? `A ${fmt(termNet)} net case over ${termWord}.`
      : `This ${termYears === 1 ? "one-year" : `${wordify(termYears)}-year`} term doesn't clear its cost yet.`;

  return (
    <div style={{ background: T.page, minHeight: "100vh", color: T.ink, fontFamily: "Manrope, sans-serif", WebkitFontSmoothing: "antialiased" }}>
      {/* TOP BAR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", rowGap: 12, padding: "16px 40px", borderBottom: `1px solid ${T.hair}` }}>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 26 }}>
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
        {displacementBeat && (
          <p style={{ fontSize: 15, color: T.muted, lineHeight: 1.5, marginTop: 12, maxWidth: 640 }}>
            That payback is on clinical value alone. Counting the <span style={{ color: T.coral, fontWeight: 700 }}>{fmt(termDisplaced)}</span> in legacy spend Abridge displaces, real break-even comes sooner, in month {paybackWithDisplacement}.
          </p>
        )}

        {/* STATS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 24, marginTop: 40, padding: "26px 0", borderTop: `1px solid ${T.hair}`, borderBottom: `1px solid ${T.hair}` }}>
          <Cell v={<AnimatedMoney value={termNet} />} k={`${termYears === 3 ? "Three" : wordify(termYears)}-year net value`} coral />
          <Cell v={payback != null ? `Month ${payback}` : "—"} k="Payback" />
          <Cell v={<AnimatedX value={roi} />} k="Return on investment" />
          <Cell v={<span><AnimatedMoney value={runRate} /><span style={{ fontSize: 14, color: T.faint }}>/yr</span></span>} k="At full scale" />
          {termDisplaced > 0 && (
            <Cell v={<span><AnimatedMoney value={termDisplaced} /></span>} k="Cost displaced · over the term" />
          )}
        </div>

        {/* THE DEAL */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 44, marginBottom: 4 }}>
          <Lbl>The deal</Lbl>
          <span style={{ fontSize: 11, color: T.off }}>Tap a setting to see its drivers and the math</span>
        </div>
        {settingsMeta.map((meta, i) => (
          <DealSetting key={meta.id} meta={meta} defaultOpen={i === 0} formulas={formulasById[meta.id] ?? {}} />
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
            <div style={{ marginBottom: 5 }}><Lbl>{conservative > 0 ? "Why it holds" : "How it moves"}</Lbl></div>
            <div style={{ fontSize: 14, color: T.muted }}>
              {conservative > 0 ? (
                <>Even the conservative case (<b className="font-abridge" style={{ fontStyle: "normal", color: T.ink }}>{fmt(conservative)}</b> net) still clears the cost.</>
              ) : (
                <>The conservative case (<b className="font-abridge" style={{ fontStyle: "normal", color: T.ink }}>{fmt(conservative)}</b> net) does not clear the cost; adoption and ramp are what carry it.</>
              )}
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
          <button onClick={() => onNavigate("case")} style={{ background: "none", border: "none", color: T.faint, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>← Back to the case</button>
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
