import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
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
  CARD_CLASS,
  type Chapter,
  type CaseDriver,
} from "./editorialShared";
import { PDF_HANDOFF_MESSAGE } from "@/lib/pdfHandoff";
import {
  BeforeAfterArt,
  EmergencyArt,
  InpatientArt,
  NursingArt,
  OutpatientArt,
  QuarterlyArt,
  SignalsArt,
} from "@/pages/hub/hubArt";

// The same drawing as the setting's tile everywhere else in the app.
const SETTING_ART: Record<string, JSX.Element> = {
  outpatient: <OutpatientArt />,
  ed: <EmergencyArt />,
  inpatient: <InpatientArt />,
  nursing: <NursingArt />,
};

/** Round arrow button used on every expandable row in the proforma. */
function RoundToggle({ open, size = 30 }: { open: boolean; size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className={`flex-none rounded-full border flex items-center justify-center transition-colors ${
        open ? "border-[#EA2C00] text-[#EA2C00] bg-white" : "border-[#E2D8CB] text-[#8A8072] bg-white/70 group-hover:border-[#EA2C00] group-hover:text-[#EA2C00]"
      }`}
    >
      <motion.svg animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }} width="11" height="11" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 2 L6.5 5 L3.5 8" />
      </motion.svg>
    </span>
  );
}

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
    <div className={`${CARD_CLASS} overflow-hidden mt-3`}>
      <div onClick={() => setOpen((o) => !o)} className="group bg-[#F6F1EA]/80" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "10px 22px 10px 10px", cursor: "pointer", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
          <div className="flex-none w-[96px] h-[58px] rounded-[12px] border border-[#E6DCCE] bg-[#EFE7DC]/70 px-1.5 py-1">
            {SETTING_ART[meta.careSetting] ?? null}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: meta.color, flex: "none" }} />
              <span className="font-abridge" style={{ fontSize: 21, color: T.ink }}>{meta.label}</span>
            </div>
            <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>{meta.providerCount} → {meta.fullScaleProviders} {settingVocab(meta.careSetting).providerWord} · go-live month {meta.goLiveMonth}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="font-abridge" style={{ fontSize: 20, color: T.ink }}>{fmt(meta.atScale)}<span style={{ fontSize: 12, color: T.faint }}>/yr</span></span>
          <RoundToggle open={open} />
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: "hidden", borderTop: "1px solid #E6DCCF" }}>
            <div style={{ padding: "8px 22px 12px 22px" }}>
              {meta.drivers.map((d, i) => {
                const isOpen = openDriver === d.id;
                return (
                  <div key={d.id}>
                    <div
                      onClick={() => setOpenDriver((cur) => (cur === d.id ? null : d.id))}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: i === meta.drivers.length - 1 && !isOpen ? "none" : `1px solid ${T.soft}`, cursor: "pointer" }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: T.label, display: "flex", alignItems: "center", gap: 10 }}>
                        {d.name}
                        <span
                          className={`rounded-full border px-2.5 py-[3px] text-[10.5px] font-bold transition-colors ${
                            isOpen ? "border-[#EA2C00] text-[#EA2C00] bg-[#FDF1EC]" : "border-[#E2D8CB] text-[#7A6F63] bg-white hover:border-[#EA2C00] hover:text-[#EA2C00]"
                          }`}
                        >
                          {isOpen ? "Hide the math" : "Show the math"}
                        </span>
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
    </div>
  );
}

/* ─────────────────────────── the chapter ─────────────────────────── */

export interface ProformaPresentViewProps {
  settings: ProformaSettingSnapshot[];
  config: ProformaConfig;
  org: string;
  onNavigate: (c: Chapter) => void;
  onHome?: () => void;
}

export default function ProformaPresentView({ settings, config, org, onNavigate, onHome }: ProformaPresentViewProps) {
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
      <UnifiedHeader
        pathType="forecast"
        pathLabel="The Numbers"
        showBack={false}
        onHome={onHome}
        centerContent={<ChapterNav active="present" onNavigate={onNavigate} />}
        rightAction={
          <button
            onClick={() => {
              try {
                generateProformaEditorialPDF(settings, config, org);
              } catch (err) {
                alert(err instanceof Error ? err.message : PDF_HANDOFF_MESSAGE);
              }
            }}
            style={{ background: T.ink, color: "#fff", border: "none", fontFamily: "Manrope", fontWeight: 700, fontSize: 13, padding: "9px 16px", borderRadius: 9, cursor: "pointer" }}
          >
            Download the deal PDF ↓
          </button>
        }
      />
      <UnifiedHeaderSpacer />

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
        <div className="mt-10 rounded-[20px] border border-[#E9E0D4] bg-[#F6F1EA]/90 shadow-[0_1px_2px_rgba(26,26,26,0.04),0_8px_24px_-14px_rgba(26,26,26,0.10)] grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] [&>*]:px-6 [&>*]:py-6 [&>*+*]:border-l [&>*+*]:border-[#E6DCCF]">
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
        <div className={CARD_CLASS} style={{ marginTop: 44, padding: "24px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <Lbl>How it builds over {termYears === 3 ? "three" : wordify(termYears)} years</Lbl>
            <span style={{ fontSize: 11, color: T.off }}>By year</span>
          </div>
          <StackedBuildChart model={model} mode="year" isolatedId={isolatedId} onIsolate={setIsolatedId} variant="wide" />
        </div>

        {/* WHY IT HOLDS */}
        <div onClick={() => setShowStress((s) => !s)} className={`group ${CARD_CLASS} transition-all hover:border-[#DDD2C4]`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "18px 22px", marginTop: 16, cursor: "pointer" }}>
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
          <span style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: T.coral }}>{showStress ? "Hide the stress test" : "See the stress test"}</span>
            <RoundToggle open={showStress} />
          </span>
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

        {/* CLOSE + FORWARD. A clean white panel (the heavy coral frame read as a
            warning); the three proof steps are drawn tiles like the rest of the app. */}
        <div className="rounded-[24px] border border-[#E9E0D4] bg-white shadow-[0_1px_2px_rgba(26,26,26,0.04),0_16px_40px_-24px_rgba(26,26,26,0.22)]" style={{ padding: "32px 36px", marginTop: 44 }}>
          <Lbl style={{ color: T.coral }}>The number is yours</Lbl>
          <div className="font-abridge text-balance" style={{ fontSize: 26, color: T.ink, marginTop: 10, lineHeight: 1.25, maxWidth: 760 }}>
            Every figure here is your own volume and economics, yours to verify, and ours to prove alongside you.
          </div>
          <div style={{ marginTop: 26 }}>
            <div style={{ marginBottom: 12 }}><Lbl>How we prove it, together</Lbl></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {[
                { t: "Instrument the signals in your EHR", b: "The same drivers above, wired to live EHR signals, no new reporting burden.", art: <SignalsArt /> },
                { t: "Measure the before, then the after", b: "A clean baseline so the lift is yours, not a benchmark.", art: <BeforeAfterArt /> },
                { t: "Report attainment every quarter", b: "Track the case against reality, and adjust the deal as the numbers land.", art: <QuarterlyArt /> },
              ].map((s, i) => (
                <div key={i} className="group rounded-[18px] border border-[#E9E0D4] bg-[#F6F1EA]/90 p-2.5 transition-all duration-300 hover:-translate-y-1 hover:border-[#DDD2C4] hover:shadow-[0_18px_40px_-22px_rgba(26,26,26,0.24)]">
                  <div className="relative h-[110px] rounded-[13px] border border-[#E6DCCE] bg-[#EFE7DC]/70 px-3 py-3">
                    {s.art}
                    <span className="absolute left-3 top-2 font-abridge text-[11.5px] tracking-[0.08em] text-[#AE9F8C]">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div style={{ padding: "14px 10px 8px" }}>
                    <div className="md:min-h-[2.6em]" style={{ fontWeight: 700, fontSize: 14.5, color: T.ink, lineHeight: 1.3 }}>{s.t}</div>
                    <div style={{ fontSize: 12.5, color: T.muted, marginTop: 6, lineHeight: 1.5 }}>{s.b}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 26, gap: 20, flexWrap: "wrap", borderTop: "1px solid #EFE8DE", paddingTop: 22 }}>
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
      <div className="font-abridge" style={{ fontSize: 32, color: coral ? T.coral : T.ink, whiteSpace: "nowrap" }}>{v}</div>
      <div style={{ fontSize: 10, color: "#443A32", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, marginTop: 6, lineHeight: 1.4 }}>{k}</div>
    </div>
  );
}
