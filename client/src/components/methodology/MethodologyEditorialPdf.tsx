import type { CSSProperties, ReactNode } from "react";
import {
  METHODOLOGY_SETTINGS,
  type MethodologySetting,
} from "@/lib/methodologyContent";
import abridgeLogoRed from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import abridgeSymbol from "@assets/abridge-logo-symbol_1774906992195.png";

// ────────────────────────────────────────────────────────────────
// Editorial "The Methodology" print-to-PDF document.
// A single flagship educational document: cover, the record opening,
// the comparison matrix, four setting chapters, and the attainment
// close. Pure function of the static content module: no props, no
// hooks, no window access, so it renders identically server-side and
// in print. Mirrors the sheet scaffold and tokens in
// client/src/components/explore/ExploreEditorialPdf.tsx.
// ────────────────────────────────────────────────────────────────

const C = {
  page: "#FDFCFA",
  card: "#FDFBF8",
  hair: "#E8E2DA",
  soft: "#F1EBE3",
  coral: "#EA2C00",
  ink: "#1A1A1A",
  label: "#2E2822",
  muted: "#5E534A",
  faint: "#786C5E",
  off: "#AFA491",
  cap: "#F0704E",
  wf: "#F4A48C",
} as const;

// ───────────────────────── Formatting helper ─────────────────────────

/** "$1.46M" / "$373K" — 1-2 sig decimals for M, 0 for K. */
function fmtShort(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) {
    const s = (n / 1e6).toFixed(2).replace(/0$/, "");
    return `$${s}M`;
  }
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

// ───────────────────────── Shared style atoms ─────────────────────────

const sEyebrow: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: C.coral,
  marginTop: 22,
};
const sLbl: CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: C.faint,
};
const sHeadline: CSSProperties = {
  fontSize: 34,
  lineHeight: 1.06,
  color: C.ink,
  marginTop: 8,
};
const sLead: CSSProperties = {
  fontSize: 13.5,
  color: C.muted,
  lineHeight: 1.5,
  marginTop: 10,
  maxWidth: 640,
};
const sRule: CSSProperties = { height: 1, background: C.hair, width: "100%" };

// ───────────────────────── Shell components ─────────────────────────

function Page({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}): JSX.Element {
  return (
    <div id={id} className="sheet" style={{ position: "relative" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "44px 60px 32px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function RunningHeader({ section }: { section: string }): JSX.Element {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <span className="font-abridge" style={{ fontSize: 20, color: C.coral }}>
            ABRIDGE
          </span>
          <span style={{ width: 1, height: 19, background: C.hair }} />
          <span style={sLbl}>The Methodology</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={sLbl}>{section}</span>
        </div>
      </div>
      <div style={{ ...sRule, marginTop: 14 }} />
    </>
  );
}

function Footer({ note, num }: { note: string; num: string }): JSX.Element {
  return (
    <div style={{ marginTop: "auto" }}>
      <div style={{ ...sRule, marginBottom: 9 }} />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: C.faint, lineHeight: 1.4, maxWidth: 580 }}>{note}</span>
        <span style={sLbl}>Abridge &middot; {num}</span>
      </div>
    </div>
  );
}

// ───────────────────────── Page 1 · Cover ─────────────────────────

function CoverPage(): JSX.Element {
  return (
    <div
      className="sheet"
      style={{
        background: "#FFFFFF",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <img src={abridgeLogoRed} alt="Abridge" style={{ position: "absolute", top: 60, left: 64, width: 120 }} />
      <img
        src={abridgeSymbol}
        alt=""
        style={{ position: "absolute", bottom: 92, right: 10, width: 340, opacity: 0.06 }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "0 64px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: 11, color: "#666666", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 16 }}>
          Reference document
        </div>
        <h1
          className="font-abridge"
          style={{ fontSize: 48, lineHeight: 1.12, color: "#1A1A1A", letterSpacing: "-0.5px", margin: 0, marginBottom: 20, maxWidth: 620 }}
        >
          The Methodology
        </h1>
        <div style={{ width: 80, height: 3, background: C.coral, marginBottom: 24 }} />
        <div style={{ fontSize: 17, color: "#666666", marginBottom: 44 }}>
          How ambient documentation creates value
        </div>
        <div style={{ fontSize: 10, color: "#999999", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>
          Prepared by
        </div>
        <div style={{ fontSize: 14, color: "#666666" }}>Abridge</div>
      </div>

      <div style={{ position: "absolute", bottom: 44, left: 64, right: 64, borderTop: "1px solid #E0E0E0", paddingTop: 12 }}>
        <div style={{ fontSize: 10.5, color: "#999999", lineHeight: 1.5 }}>
          This document explains how the value model works, care setting by care setting. The math shown is
          illustrative; your own volume and economics are modeled in Explore.
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Page 2 · The record ─────────────────────────

// Two side-by-side record cards: a thin, ragged note written after the visit
// from memory, next to a near-complete record captured during the visit. The
// widths below are static and illustrative, standing for the same visit
// recorded two ways.
const THIN_LINES = [84, 54, 72, 40, 50, 64, 30, 44, 58, 34, 20];
const THIN_INK = new Set([1, 4, 7, 9]); // 0-indexed positions carrying tint
const FULL_LINES = [100, 95, 98, 90, 99, 93, 96, 92, 99, 94, 97];
const FULL_INK = new Set([0, 2, 4, 6, 8, 10]);

function RecordCard({
  caption,
  subcaption,
  widths,
  inkAt,
  accent,
}: {
  caption: string;
  subcaption: string;
  widths: number[];
  inkAt: Set<number>;
  accent: boolean;
}): JSX.Element {
  return (
    <div
      style={{
        border: `1px solid ${accent ? "#F1C9BC" : C.hair}`,
        borderRadius: 16,
        padding: "26px 26px 28px",
        background: accent ? "#FFF9F6" : C.card,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: accent ? C.coral : C.faint,
          marginBottom: 4,
        }}
      >
        {caption}
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 18 }}>{subcaption}</div>
      {widths.map((w, i) => (
        <div
          key={i}
          style={{
            height: 9,
            borderRadius: 5,
            marginBottom: 12,
            width: `${w}%`,
            background: accent ? (inkAt.has(i) ? C.coral : "#F2B7A6") : inkAt.has(i) ? "#CFC6B9" : "#E7DFD5",
          }}
        />
      ))}
    </div>
  );
}

function FloorCell({
  dot,
  name,
  desc,
}: {
  dot: string;
  name: string;
  desc: string;
}): JSX.Element {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 800, color: C.ink }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: dot, display: "inline-block" }} />
        {name}
      </div>
      <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.4, marginTop: 5, maxWidth: 160 }}>{desc}</div>
    </div>
  );
}

function RecordPage(): JSX.Element {
  return (
    <Page>
      <RunningHeader section="The record" />
      <div style={sEyebrow}>The record</div>
      <h2 className="font-abridge" style={sHeadline}>
        The note is written from <span style={{ color: C.coral }}>memory</span>.
      </h2>
      <p style={sLead}>
        It gets written after the visit, in whatever time is left, so it holds a fraction of what happened:
        the level of care given, the conditions addressed, the reason behind a decision. That work is real.
        It just never reaches the record. Ambient documentation captures the visit as it happens, so the
        note reflects the care actually delivered.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 44px 1fr", alignItems: "stretch", marginTop: 22 }}>
        <RecordCard
          caption="What there was time to type"
          subcaption="Written afterward, from memory"
          widths={THIN_LINES}
          inkAt={THIN_INK}
          accent={false}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: C.off, fontSize: 22 }}>
          &rarr;
        </div>
        <RecordCard
          caption="What actually happened"
          subcaption="Captured during the visit"
          widths={FULL_LINES}
          inkAt={FULL_INK}
          accent
        />
      </div>
      <p style={{ fontSize: 12, color: C.muted, marginTop: 14, lineHeight: 1.5, textAlign: "center" }}>
        The same visit, recorded two ways.{" "}
        <b style={{ color: C.ink, fontWeight: 700 }}>Every number in this document comes from closing that gap.</b>
      </p>

      <div style={{ marginTop: "auto", borderTop: `1px solid ${C.hair}`, paddingTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <span style={sLbl}>What we can measure today</span>
          <span style={{ fontSize: 11, color: C.faint, fontStyle: "italic" }}>the floor, not the ceiling</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
          <FloorCell
            dot={C.coral}
            name="Revenue"
            desc="Acuity and services already delivered, captured instead of lost to thin notes."
          />
          <FloorCell dot={C.cap} name="Capacity" desc="Clinician hours returned from after-hours charting to patient care." />
          <FloorCell dot={C.wf} name="Workforce" desc="The documentation burden that drives burnout, lifted." />
          <FloorCell dot={C.off} name="Quality" desc="Care gaps and safety signals surfaced in the record, tracked, not counted." />
        </div>
      </div>

      <Footer
        note="These four are the part we can put a defensible number on. A complete record makes more possible than we count here."
        num="01"
      />
    </Page>
  );
}

// ───────────────────────── Page 3 · The comparison ─────────────────────────

const SETTING_DOT: Record<string, string> = {
  outpatient: C.coral,
  ed: C.cap,
  inpatient: "#C0603E",
  nursing: C.wf,
};

function ComparisonRow({ s }: { s: MethodologySetting }): JSX.Element {
  return (
    <tr>
      <td style={{ padding: "15px 12px 15px 0", borderBottom: `1px solid ${C.hair}`, verticalAlign: "top", width: 130 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 9, height: 9, borderRadius: 99, background: SETTING_DOT[s.id], display: "inline-block" }} />
          <span className="font-abridge" style={{ fontSize: 17, color: C.ink }}>
            {s.label}
          </span>
        </div>
        <span
          style={{
            display: "inline-block",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: ".06em",
            textTransform: "uppercase",
            color: C.coral,
            background: "#FCEDE8",
            borderRadius: 5,
            padding: "2px 7px",
            marginTop: 6,
          }}
        >
          {s.unit}
        </span>
      </td>
      <td style={{ padding: "15px 12px 15px 0", borderBottom: `1px solid ${C.hair}`, verticalAlign: "top", fontSize: 12, color: C.muted, lineHeight: 1.4 }}>
        {s.dominantLever}
      </td>
      <td style={{ padding: "15px 12px 15px 0", borderBottom: `1px solid ${C.hair}`, verticalAlign: "top", fontSize: 12, color: C.muted, lineHeight: 1.4 }}>
        {s.recordChanges}
      </td>
      <td style={{ padding: "15px 12px 15px 0", borderBottom: `1px solid ${C.hair}`, verticalAlign: "top", fontSize: 12, color: C.muted, lineHeight: 1.4 }}>
        {s.comparisonSignals}
      </td>
      <td style={{ padding: "15px 0 15px 0", borderBottom: `1px solid ${C.hair}`, verticalAlign: "top", fontSize: 12, color: C.muted, lineHeight: 1.4 }}>
        {s.comparisonOutcomes}
      </td>
    </tr>
  );
}

function ComparisonPage(): JSX.Element {
  return (
    <Page>
      <RunningHeader section="The comparison" />
      <div style={sEyebrow}>The comparison</div>
      <h2 className="font-abridge" style={sHeadline}>
        The same record. Four economics.
      </h2>
      <p style={sLead}>
        A complete record does the same thing everywhere: it reflects the care actually delivered. But it
        lands on different money, because each setting&rsquo;s work, payment, and constraint are different.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 22, fontSize: 12 }}>
        <thead>
          <tr>
            {["Setting", "The dominant lever", "What the record changes", "The signal you see first", "The outcome it opens"].map(
              (h, i) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    fontSize: 9.5,
                    fontWeight: 800,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: C.faint,
                    padding: i === 0 ? "0 12px 10px 0" : "0 12px 10px 0",
                    verticalAlign: "bottom",
                    borderBottom: `2px solid ${C.ink}`,
                  }}
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {METHODOLOGY_SETTINGS.map((s) => (
            <ComparisonRow key={s.id} s={s} />
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 11.5, color: C.faint, marginTop: 16, lineHeight: 1.5, fontStyle: "italic" }}>
        Read down the &ldquo;signal you see first&rdquo; column: in every setting, the leading indicator is
        a documentation signal you can watch in weeks. The outcomes follow over quarters. That order is the
        whole basis for attaining the value.
      </p>

      <Footer
        note="One mechanism, four economics. The chapters that follow build each column out with the math."
        num="02"
      />
    </Page>
  );
}

// ───────────────────────── Pages 4-7 · Setting chapters ─────────────────────────

function ChainStep({ n, title, desc, last }: { n: string; title: string; desc: string; last: boolean }): JSX.Element {
  return (
    <div style={{ padding: "18px 20px", borderRight: last ? "none" : `1px solid ${C.hair}`, flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: C.coral }}>{n}</div>
      <div className="font-abridge" style={{ fontSize: 15, marginTop: 6, color: C.ink }}>
        {title}
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 7, lineHeight: 1.45 }}>{desc}</div>
    </div>
  );
}

function SignalCard({ heading, items }: { heading: string; items: string[] }): JSX.Element {
  return (
    <div style={{ border: `1px solid ${C.hair}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: C.faint, marginBottom: 10 }}>
        {heading}
      </div>
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            fontSize: 13,
            color: C.ink,
            padding: "6px 0",
            borderBottom: i < items.length - 1 ? `1px solid ${C.soft}` : "none",
          }}
        >
          {it}
        </div>
      ))}
    </div>
  );
}

function ChapterPage({ s, index }: { s: MethodologySetting; index: number }): JSX.Element {
  return (
    <Page id={`chapter-${s.id}`}>
      <RunningHeader section={s.label} />
      <div style={sEyebrow}>
        Setting {index + 1} of 4 &middot; {s.label}
      </div>
      <h2 className="font-abridge" style={sHeadline}>
        {s.lever}
      </h2>
      <p style={sLead}>{s.leverBlurb}</p>

      <div
        style={{
          display: "flex",
          marginTop: 20,
          border: `1px solid ${C.hair}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {s.chain.map((c, i) => (
          <ChainStep key={i} n={c.n} title={c.title} desc={c.desc} last={i === s.chain.length - 1} />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }}>
        <SignalCard heading="The signal you see first &middot; weeks" items={s.leadingSignals} />
        <SignalCard heading="The outcome it opens &middot; quarters" items={s.laggingOutcomes} />
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ ...sLbl, marginBottom: 4 }}>The math, illustrated</div>
        {s.math.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              padding: "11px 0",
              borderBottom: `1px solid ${C.hair}`,
            }}
          >
            <div>
              <div className="font-abridge" style={{ fontSize: 15, color: C.ink }}>
                {m.name}
              </div>
              <div style={{ fontSize: 11.5, color: C.faint, marginTop: 3 }}>{m.formula}</div>
            </div>
            <div className="font-abridge" style={{ fontSize: 16, color: C.coral }}>
              {fmtShort(m.value)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: C.coral, marginBottom: 13 }}>
          How you attain it
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
          {s.attain.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span className="font-abridge" style={{ fontSize: 16, color: C.coral, lineHeight: 1, flexShrink: 0 }}>
                {i + 1}
              </span>
              <div>
                <div className="font-abridge" style={{ fontSize: 13, color: C.ink, lineHeight: 1.2 }}>
                  {a.title}
                </div>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4, marginTop: 5 }}>{a.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Footer note="Illustrative figures. Your own volume and economics are modeled in Explore." num={`0${index + 3}`} />
    </Page>
  );
}

// ───────────────────────── Final page · The attainment close ─────────────────────────

interface AttainmentStep {
  n: string;
  title: string;
  desc: string;
}

const ATTAINMENT_STEPS: AttainmentStep[] = [
  {
    n: "Baseline",
    title: "Set your starting point",
    desc: "Your own volume and economics replace the illustrative figures shown here. That model lives in Explore.",
  },
  {
    n: "Signals",
    title: "Watch the leading indicator",
    desc: "Note or flowsheet completeness and time in documentation are the signals that move first, inside weeks.",
  },
  {
    n: "Review",
    title: "Confirm the outcome",
    desc: "The lagging outcomes, coded acuity, case-mix, returned bedside time, show up over the following quarters. Measure holds the trend.",
  },
  {
    n: "Act",
    title: "Close the gap",
    desc: "Where a signal stalls before the outcome, the owning team decides what changes next. Attain tracks who owns it and by when.",
  },
];

function ClosePage(): JSX.Element {
  return (
    <Page>
      <RunningHeader section="The attainment close" />
      <div style={sEyebrow}>The attainment close</div>
      <h2 className="font-abridge" style={sHeadline}>
        The number becomes real when you measure it.
      </h2>
      <p style={sLead}>
        Everything in this document is illustrative, built to show how the mechanism works, not what your
        organization will see. The path from the mechanism to a number that is yours runs through the rest
        of this tool.
      </p>

      <div
        style={{
          display: "flex",
          marginTop: 26,
          border: `1px solid ${C.hair}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {ATTAINMENT_STEPS.map((step, i) => (
          <div
            key={step.n}
            style={{
              flex: 1,
              padding: "18px 20px",
              borderRight: i < ATTAINMENT_STEPS.length - 1 ? `1px solid ${C.hair}` : "none",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: C.coral }}>
              0{i + 1} &middot; {step.n}
            </div>
            <div className="font-abridge" style={{ fontSize: 15, marginTop: 6, color: C.ink }}>
              {step.title}
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 7, lineHeight: 1.45 }}>{step.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 30 }}>
        <div style={{ ...sLbl, marginBottom: 12 }}>Where each step lives</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
          <div style={{ border: `1px solid ${C.hair}`, borderRadius: 14, padding: "18px 20px", background: C.card }}>
            <div className="font-abridge" style={{ fontSize: 17, color: C.ink }}>
              Explore
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 7, lineHeight: 1.45 }}>
              Builds the model on your own volume and economics, replacing the illustrative figures here.
            </div>
          </div>
          <div style={{ border: `1px solid ${C.hair}`, borderRadius: 14, padding: "18px 20px", background: C.card }}>
            <div className="font-abridge" style={{ fontSize: 17, color: C.ink }}>
              Measure
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 7, lineHeight: 1.45 }}>
              Watches the leading signals and lagging outcomes over time, against your baseline.
            </div>
          </div>
          <div
            style={{
              border: `1.5px solid ${C.coral}`,
              borderRadius: 14,
              padding: "18px 20px",
              background: "#FEF6F3",
            }}
          >
            <div className="font-abridge" style={{ fontSize: 17, color: C.coral }}>
              Attain
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 7, lineHeight: 1.45 }}>
              Tracks who owns each link in the chain and what happens where a signal stalls before it opens
              the outcome.
            </div>
          </div>
        </div>
      </div>

      <Footer
        note="A reference document. The number that matters is the one modeled on your own operation and measured over time."
        num="07"
      />
    </Page>
  );
}

// ───────────────────────── Document ─────────────────────────

export default function MethodologyEditorialPdfDocument(): JSX.Element {
  return (
    <div className="methodology-pdf-root">
      <style>{`
        @page { size: Letter; margin: 0; }
        @media print { body { margin: 0; } }
        .methodology-pdf-root .sheet {
          width: 816px;
          height: 1056px;
          background: ${C.page};
          margin: 0 auto;
        }
        .methodology-pdf-root .sheet:not(:last-child) {
          break-after: page;
        }
      `}</style>
      <CoverPage />
      <RecordPage />
      <ComparisonPage />
      {METHODOLOGY_SETTINGS.map((s, i) => (
        <ChapterPage key={s.id} s={s} index={i} />
      ))}
      <ClosePage />
    </div>
  );
}
