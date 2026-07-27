import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { ExplorePDFData, ExplorePDFQuadrantData } from "./ExplorePDFExport";

// ────────────────────────────────────────────────────────────────
// Editorial "Value Model" print-to-PDF document.
// Pixel-faithful React reproduction of the locked 5-chapter design.
// Pure function of `data` — no hooks, no window access — so it renders
// identically server-side / in print.
// ────────────────────────────────────────────────────────────────

// Locked palette (exact hex from the design mock)
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
  tile: "#F3EEE7",
} as const;

// Segment colors for the synthesis stacked bar (descending value order)
const SEG_COLORS = [C.coral, "#F0704E", "#F4A48C", "#F8C4B4"];

// ───────────────────────── Formatting helpers ─────────────────────────

/** "$1.46M" / "$549K" — 1–2 sig decimals for M, 0 for K. */
function fmtShort(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) {
    const s = (n / 1e6).toFixed(2).replace(/0$/, "");
    return `$${s}M`;
  }
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

/** "$270,000" — exact, comma-grouped. */
function fmtFull(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** Compact count: "350K", "1.5M", "120" (no leading $). */
function fmtNum(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (a >= 1e3) return `${Math.round(n / 1e3)}K`;
  return `${Math.round(n)}`;
}

function titleCase(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

// ───────────────────────── Chain parser ─────────────────────────
// Splits a calcSummary on " × " and parses each token into a numeric
// {n} tile head and a {u} faint unit caption. Unparseable tokens fall
// back to showing the whole token as {n}.

interface ChainTile {
  p?: string; // optional prefix (e.g. a plan name like "Medicare Advantage:")
  n: string;
  u: string;
}

function parseChain(summary?: string): ChainTile[] {
  if (!summary) return [];
  // Flatten multi-plan HCC summaries ("… | MCO: …") into one chain, then split
  // on the multiplication joiner.
  return summary
    .replace(/\s*\|\s*/g, " × ")
    .split(" × ")
    .map((raw) => {
      const tok = raw.trim();
      // Non-greedy leading text (a plan name / label) → number → trailing unit.
      const m = tok.match(
        /^(.*?)([−-]?\$?[\d,]+(?:\.\d+)?[%KMB]?(?:\/[A-Za-z0-9]+)?)\s*(.*)$/,
      );
      if (!m) return { n: tok, u: "" };
      const pre = m[1].replace(/[:\s]+$/, "").trim();
      return { p: pre || undefined, n: m[2], u: m[3].trim() };
    });
}

// ───────────────────────── Haircut extractor ─────────────────────────
// Scans every included driver's calcSummary for discount tokens; dedupes
// by the matched word; up to 4 cells.

interface Haircut {
  value: string;
  label: string;
}

function extractHaircuts(data: ExplorePDFData): Haircut[] {
  const seen = new Set<string>();
  const out: Haircut[] = [];
  for (const q of data.quadrants) {
    for (const d of q.drivers) {
      if (!d.isIncluded || !d.calcSummary) continue;
      const re =
        /(\d+(?:\.\d+)?)%\s*(realization|survives|attributed|holds|prevention|reduction|impact|defend)/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(d.calcSummary)) !== null) {
        const word = m[2].toLowerCase();
        if (seen.has(word)) continue;
        seen.add(word);
        out.push({ value: `${m[1]}%`, label: titleCase(m[2]) });
        if (out.length >= 4) return out;
      }
    }
  }
  return out;
}

// ───────────────────────── Ramp geometry ─────────────────────────

/** Month (1–12) at which cumulative value clears the recurring cost. */
function crossoverMonth(data: ExplorePDFData): number | null {
  if (data.annualInvestment <= 0) return null;
  const ratio = data.annualInvestment / Math.max(1, data.totalAnnualValue);
  const raw = 12 * Math.pow(ratio, 1 / 2.4);
  return Math.min(12, Math.max(1, Math.round(raw)));
}

/** Point on the smoothed ramp curve at a given month, in viewBox coords. */
function rampMarker(month: number): { x: number; y: number } {
  const xs = [20, 120, 210, 332];
  const ys = [150, 148, 112, 24];
  const bez = (t: number, p: number[]) => {
    const u = 1 - t;
    return u * u * u * p[0] + 3 * u * u * t * p[1] + 3 * u * t * t * p[2] + t * t * t * p[3];
  };
  const targetX = 20 + ((month - 1) / 11) * (332 - 20);
  let bestT = 0;
  let bestDiff = Infinity;
  for (let i = 0; i <= 1000; i++) {
    const t = i / 1000;
    const diff = Math.abs(bez(t, xs) - targetX);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestT = t;
    }
  }
  return { x: bez(bestT, xs), y: bez(bestT, ys) };
}

// ───────────────────────── Shared style atoms ─────────────────────────

const sEyebrow: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: C.coral,
};
const sLbl: CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: C.faint,
};
const sHeadline: CSSProperties = {
  fontSize: 30,
  lineHeight: 1.05,
  color: C.ink,
  marginTop: 7,
};
const sLead: CSSProperties = {
  fontSize: 13.5,
  color: C.muted,
  lineHeight: 1.5,
  marginTop: 8,
  maxWidth: 640,
};
const sRule: CSSProperties = { height: 1, background: C.hair, width: "100%" };
const sChainOp: CSSProperties = { fontSize: 14, color: "#C9BCA9" };

// ───────────────────────── Shell components ─────────────────────────

function Page({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div
      style={{
        width: 816,
        height: 1056,
        background: C.page,
        breakAfter: "page",
        position: "relative",
      }}
    >
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

function RunningHeader({ data }: { data: ExplorePDFData }): JSX.Element {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <span className="font-abridge" style={{ fontSize: 20, color: C.coral }}>
            ABRIDGE
          </span>
          <span style={{ width: 1, height: 19, background: C.hair }} />
          <span style={sLbl}>Value Model</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="font-abridge" style={{ fontSize: 17 }}>
            {data.clientName}
          </div>
          <div style={{ fontSize: 12, color: C.faint }}>
            {data.careSettingLabel} · {data.date}
          </div>
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
        <span style={{ fontSize: 10, color: C.faint, lineHeight: 1.4, maxWidth: 560 }}>{note}</span>
        <span style={sLbl}>Abridge · {num}</span>
      </div>
    </div>
  );
}

function StatBand({ cells }: { cells: { v: ReactNode; k: string }[] }): JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        border: `1px solid ${C.hair}`,
        borderRadius: 14,
        overflow: "hidden",
        background: C.card,
      }}
    >
      {cells.map((c, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            padding: "13px 16px",
            borderRight: i < cells.length - 1 ? `1px solid ${C.hair}` : "none",
          }}
        >
          <div className="font-abridge" style={{ fontSize: 20, color: C.ink }}>
            {c.v}
          </div>
          <div
            style={{
              fontSize: 9,
              color: C.faint,
              textTransform: "uppercase",
              letterSpacing: ".07em",
              fontWeight: 700,
              marginTop: 3,
            }}
          >
            {c.k}
          </div>
        </div>
      ))}
    </div>
  );
}

function Chain({ summary, value }: { summary?: string; value: number }): JSX.Element {
  const tiles = parseChain(summary);
  return (
    <div style={{ display: "flex", gap: 13, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
      {tiles.map((t, i) => (
        <Fragment key={i}>
          {i > 0 && <span style={sChainOp}>×</span>}
          <div style={{ maxWidth: 150 }}>
            {t.p && (
              <div style={{ fontSize: 8.5, color: C.faint, lineHeight: 1.1, marginBottom: 1, maxWidth: 130 }}>
                {t.p}
              </div>
            )}
            <div className="font-abridge" style={{ fontSize: 19, color: C.ink, lineHeight: 1 }}>
              {t.n}
            </div>
            <div style={{ fontSize: 9, color: C.faint, marginTop: 3 }}>{t.u}</div>
          </div>
        </Fragment>
      ))}
      <span style={sChainOp}>=</span>
      <div>
        <div className="font-abridge" style={{ fontSize: 19, color: C.coral, lineHeight: 1 }}>
          {fmtShort(value)}
        </div>
        <div style={{ fontSize: 9, color: C.faint, marginTop: 3 }}>a year</div>
      </div>
    </div>
  );
}

// ───────────────────────── Page 1 · Cover ─────────────────────────

const COVER_CHAPTERS: [string, string, string][] = [
  ["01", "The number, grounded", "The total, tied to your real volume"],
  ["02", "Where the value comes from", "Four value areas, and the math behind each"],
  ["03", "The investment case", "Conservative to optimistic, and the price"],
  ["04", "At full scale", "Where this goes as you roll out further"],
];

function CoverPage({ data }: { data: ExplorePDFData }): JSX.Element {
  return (
    <Page>
      <div className="font-abridge" style={{ fontSize: 26, color: C.coral, letterSpacing: ".02em" }}>
        ABRIDGE
      </div>
      <div style={{ ...sEyebrow, marginTop: 76 }}>Value Model</div>
      <h1
        className="font-abridge"
        style={{ fontSize: 56, lineHeight: 1.04, color: C.ink, marginTop: 14, maxWidth: 600 }}
      >
        The value in your documentation, built from your numbers.
      </h1>
      <p style={{ fontSize: 15.5, color: C.muted, lineHeight: 1.5, marginTop: 18, maxWidth: 560 }}>
        A model for {data.clientName}. Every figure is your own volume and economics, never a
        benchmark, sized to what better documentation can realistically move.
      </p>

      <div style={{ ...sLbl, marginTop: 52, fontSize: 10.5 }}>The modeled value</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 30, marginTop: 8 }}>
        <div>
          <span className="font-abridge" style={{ fontSize: 82, lineHeight: 0.9, color: C.coral }}>
            {fmtShort(data.totalAnnualValue)}
          </span>
          <span style={{ fontSize: 25, color: C.faint }}> / year</span>
        </div>
        <div
          style={{
            fontSize: 14.5,
            color: C.muted,
            lineHeight: 1.45,
            maxWidth: 250,
            paddingBottom: 8,
          }}
        >
          Across four value areas at today's {data.utilizationPercent}% adoption. Net of investment,
          about a {data.roi.toFixed(1)}× return.
        </div>
      </div>

      <div style={{ ...sLbl, marginTop: 50, fontSize: 10.5 }}>Inside this model</div>
      <div style={{ marginTop: 12 }}>
        {COVER_CHAPTERS.map(([no, title, desc]) => (
          <div
            key={no}
            style={{ display: "flex", padding: "14px 0", borderBottom: `1px solid ${C.hair}` }}
          >
            <div className="font-abridge" style={{ width: 44, fontSize: 18, color: C.off }}>
              {no}
            </div>
            <div className="font-abridge" style={{ width: 250, fontSize: 20 }}>
              {title}
            </div>
            <div style={{ fontSize: 14, color: C.faint, alignSelf: "center" }}>{desc}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "auto" }}>
        <div style={{ ...sRule, marginBottom: 15 }} />
        <div style={{ display: "flex", gap: 56 }}>
          <div>
            <div style={sLbl}>Organization</div>
            <div className="font-abridge" style={{ fontSize: 17, marginTop: 5 }}>
              {data.clientName}
            </div>
          </div>
          <div>
            <div style={sLbl}>Care setting</div>
            <div className="font-abridge" style={{ fontSize: 17, marginTop: 5 }}>
              {data.careSettingLabel}
            </div>
          </div>
          <div>
            <div style={sLbl}>Prepared</div>
            <div className="font-abridge" style={{ fontSize: 17, marginTop: 5 }}>
              {data.date}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 10, color: C.faint, lineHeight: 1.4, marginTop: 15 }}>
          Powered by Abridge · abridge.com · Built from partner-provided inputs; results depend on
          adoption and how teams act on what the documentation surfaces.
        </div>
      </div>
    </Page>
  );
}

// ───────────────────────── Page 2 · 01 The number, grounded ─────────────────────────

function ValueBar({ label, total, max }: { label: string; total: number; max: number }): JSX.Element {
  const counted = total > 0;
  return (
    <div style={{ marginBottom: 14, opacity: counted ? 1 : 0.72 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="font-abridge" style={{ fontSize: 19, color: counted ? C.ink : C.off }}>
          {label}
        </span>
        {counted ? (
          <span className="font-abridge" style={{ fontSize: 18 }}>
            {fmtShort(total)}
            <span style={{ fontSize: 10, color: C.faint }}>/yr</span>
          </span>
        ) : (
          <span style={sLbl}>Proof · not counted</span>
        )}
      </div>
      <div style={{ height: 7, background: "#EFE9E1", borderRadius: 99, overflow: "hidden", marginTop: 6 }}>
        <div
          style={{
            height: "100%",
            background: C.coral,
            borderRadius: 99,
            width: `${max > 0 ? (total / max) * 100 : 0}%`,
          }}
        />
      </div>
    </div>
  );
}

function RampChart({ data }: { data: ExplorePDFData }): JSX.Element {
  const month = crossoverMonth(data);
  const marker = month != null ? rampMarker(month) : null;
  return (
    <div>
      <div style={{ ...sLbl, marginBottom: 8 }}>When it lands</div>
      <svg viewBox="0 0 340 176" style={{ width: "100%" }}>
        <line x1="20" y1="16" x2="332" y2="16" stroke="#EFE9E1" />
        <line x1="20" y1="84" x2="332" y2="84" stroke="#EFE9E1" />
        <line x1="20" y1="150" x2="332" y2="150" stroke={C.hair} />
        {marker && (
          <line
            x1="20"
            y1={marker.y}
            x2="332"
            y2={marker.y}
            stroke="#9C8E7E"
            strokeWidth="1.2"
            strokeDasharray="5 4"
          />
        )}
        <path d="M20,150 C120,148 210,112 332,24 L332,150 Z" fill="#EA2C00" fillOpacity="0.08" />
        <path d="M20,150 C120,148 210,112 332,24" fill="none" stroke={C.coral} strokeWidth="2.5" />
        <circle cx="332" cy="24" r="4" fill={C.coral} />
        {marker && (
          <>
            <line
              x1={marker.x}
              y1={marker.y}
              x2={marker.x}
              y2="150"
              stroke="#C9BCA9"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={marker.x} cy={marker.y} r="4.5" fill="#fff" stroke={C.coral} strokeWidth="2.5" />
            {/* Anchor the label so it can never overflow the chart box: when
                the crossover lands early (marker to the left) the label extends
                RIGHT into open space; when late, it extends LEFT. */}
            <text
              x={marker.x >= 180 ? marker.x - 10 : marker.x + 8}
              y={marker.y - 8}
              fontFamily="Manrope"
              fontSize="10"
              fontWeight="700"
              fill="#B02200"
              textAnchor={marker.x >= 180 ? "end" : "start"}
            >
              clears the cost · Mo {month}
            </text>
          </>
        )}
        <text x="20" y="168" fontFamily="Manrope" fontSize="9.5" fill={C.faint}>
          Mo 1
        </text>
        <text x="330" y="168" fontFamily="Manrope" fontSize="9.5" fill={C.faint} textAnchor="end">
          Mo 12
        </text>
      </svg>
      <p style={{ fontSize: 11.5, color: C.faint, lineHeight: 1.45, marginTop: 8 }}>
        {month != null
          ? `Value ramps as adoption grows, clearing the recurring cost around month ${month}, then climbing to full run-rate by month 12.`
          : "Value ramps as adoption grows toward full run-rate by month 12."}
      </p>
    </div>
  );
}

function NumberPage({ data }: { data: ExplorePDFData }): JSX.Element {
  const sorted = [...data.quadrants].sort((a, b) => b.annualTotal - a.annualTotal);
  const max = Math.max(...data.quadrants.map((q) => q.annualTotal), 1);
  const haircuts = extractHaircuts(data);

  const providerCell =
    data.careSetting === "nursing" && data.nursingStaffedBeds != null
      ? { v: fmtNum(data.nursingStaffedBeds), k: "Beds" }
      : { v: fmtNum(data.numberOfProviders), k: "Providers" };

  return (
    <Page>
      <RunningHeader data={data} />
      <div style={{ ...sEyebrow, marginTop: 20 }}>
        <span style={{ color: C.off }}>01</span> · The number, grounded
      </div>
      <h2 className="font-abridge" style={sHeadline}>
        Before it means anything, here's what it's built on.
      </h2>
      <p style={sLead}>
        Every figure in this model traces back to your own operation. Start with the shape of it,
        then the number falls out.
      </p>

      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 22 }}
      >
        <div>
          <div style={sLbl}>The modeled value, all areas</div>
          <div style={{ marginTop: 2 }}>
            <span className="font-abridge" style={{ fontSize: 78, lineHeight: 0.9, color: C.coral }}>
              {fmtShort(data.totalAnnualValue)}
            </span>
            <span style={{ fontSize: 24, color: C.faint }}> / year</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 22, textAlign: "right", paddingBottom: 6 }}>
          <div>
            <div className="font-abridge" style={{ fontSize: 26 }}>
              {fmtShort(data.netAnnualValue)}
            </div>
            <div style={{ ...sLbl, marginTop: 2 }}>Net annual value</div>
          </div>
          <div>
            <div className="font-abridge" style={{ fontSize: 26, color: C.coral }}>
              {data.roi.toFixed(1)}×
            </div>
            <div style={{ ...sLbl, marginTop: 2 }}>Year-1 return</div>
          </div>
        </div>
      </div>

      <div style={{ ...sLbl, marginTop: 22, marginBottom: 9 }}>Your operation, as modeled</div>
      <StatBand
        cells={[
          providerCell,
          { v: data.annualEncounters.toLocaleString("en-US"), k: "Annual encounters" },
          { v: `${data.utilizationPercent}%`, k: "On Abridge today" },
          { v: `${data.minutesSavedPerEncounter} min`, k: "Saved per note" },
          { v: data.timePathScenario, k: "Time path" },
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 26 }}>
        <div>
          <div style={{ ...sLbl, marginBottom: 12 }}>Where the value comes from</div>
          {sorted.map((q) => (
            <ValueBar key={q.quadrant} label={q.quadrant} total={q.annualTotal} max={max} />
          ))}
        </div>
        <RampChart data={data} />
      </div>

      {haircuts.length > 0 && (
        <>
          <div style={{ ...sLbl, marginTop: 28, marginBottom: 9 }}>
            The haircuts that keep it honest
          </div>
          <StatBand cells={haircuts.map((h) => ({ v: h.value, k: h.label }))} />
          <p style={{ fontSize: 12, color: C.faint, lineHeight: 1.5, marginTop: 11, maxWidth: 680 }}>
            Every dollar is discounted before it's counted, only the share that realistically
            survives adoption, coding review, and audit. These are the levers you set with us, and
            can tighten any time.
          </p>
        </>
      )}

      <Footer
        note="Counted once, valued at margin, never charges. Quality is tracked as proof and never added to the dollar total."
        num="01"
      />
    </Page>
  );
}

// ───────────────────────── Page 3 · 02 Where the value comes from ─────────────────────────

function DomainHeader({ q }: { q: ExplorePDFQuadrantData }): JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        borderBottom: `1px solid ${C.hair}`,
        paddingBottom: 6,
        marginTop: 13,
      }}
    >
      <span className="font-abridge" style={{ fontSize: 21, color: C.ink }}>
        {q.quadrant}
      </span>
      <span className="font-abridge" style={{ fontSize: 19, color: C.coral }}>
        {fmtShort(q.annualTotal)}
        <span style={{ fontSize: 10, color: C.faint }}>/yr</span>
      </span>
    </div>
  );
}

function DriverCard({
  label,
  value,
  desc,
  summary,
  last,
}: {
  label: string;
  value: number;
  desc: string;
  summary?: string;
  last: boolean;
}): JSX.Element {
  return (
    <div
      style={{
        padding: last ? "10px 0 2px" : "10px 0 11px",
        borderBottom: last ? "none" : `1px solid ${C.soft}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.label }}>{label}</span>
        <span className="font-abridge" style={{ fontSize: 16, color: C.coral }}>
          {fmtShort(value)}
        </span>
      </div>
      <div style={{ fontSize: 11, color: C.faint, marginTop: 2, maxWidth: 560, lineHeight: 1.35 }}>
        {desc}
      </div>
      <Chain summary={summary} value={value} />
    </div>
  );
}

function MutedDomain({ q }: { q: ExplorePDFQuadrantData }): JSX.Element {
  // A domain is muted for one of two reasons: it is inherently proof-only
  // (no quantified drivers exist for this setting — e.g. Quality, or Nursing
  // Revenue), or it is a money domain whose drivers are simply switched off in
  // this run. The framing differs.
  const quantifiedNames = q.drivers
    .filter((d) => d.visibility === "quantified")
    .map((d) => d.label);
  const proofOnly = quantifiedNames.length === 0;
  const rightLabel = proofOnly ? "Proof · not counted" : "Not modeled";
  const body =
    q.quadrant === "Quality"
      ? "Documentation quality is tracked as proof that protects the revenue above, care-gap closure, HEDIS/Stars, denial-defensibility. It leads the dollars and is never added to the total."
      : proofOnly
        ? `${q.quadrant} here is tracked as proof: the signals that support the value above, never added to the dollar total.`
        : `Available to model in ${q.quadrant}: ${quantifiedNames.join(", ")}. Off in this run.`;
  return (
    <div style={{ marginTop: 13 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          borderBottom: `1px solid ${C.hair}`,
          paddingBottom: 6,
        }}
      >
        <span className="font-abridge" style={{ fontSize: 21, color: C.off }}>
          {q.quadrant}
        </span>
        <span style={sLbl}>{rightLabel}</span>
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: C.off,
          marginTop: 7,
          lineHeight: 1.4,
          fontStyle: "italic",
          maxWidth: 660,
        }}
      >
        {body}
      </div>
    </div>
  );
}

function SynthesisBar({ data }: { data: ExplorePDFData }): JSX.Element {
  const positives = data.quadrants
    .filter((q) => q.annualTotal > 0)
    .sort((a, b) => b.annualTotal - a.annualTotal);
  const total = data.totalAnnualValue || 1;
  return (
    <div style={{ marginTop: 22, borderTop: `1px solid ${C.hair}`, paddingTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={sLbl}>The four areas, together</span>
        <span className="font-abridge" style={{ fontSize: 18 }}>
          {fmtShort(data.totalAnnualValue)}
          <span style={{ fontSize: 11, color: C.faint }}>/yr</span>
        </span>
      </div>
      <div style={{ display: "flex", height: 34, borderRadius: 9, overflow: "hidden", marginTop: 10 }}>
        {positives.map((q, i) => (
          <div
            key={q.quadrant}
            style={{
              width: `${(q.annualTotal / total) * 100}%`,
              background: SEG_COLORS[Math.min(i, SEG_COLORS.length - 1)],
              display: "flex",
              alignItems: "center",
              paddingLeft: 12,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {q.quadrant} · {fmtShort(q.annualTotal)}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <div style={{ height: 5, flex: 1, background: C.soft, borderRadius: 99 }} />
        <span style={{ fontSize: 10, color: C.off, whiteSpace: "nowrap" }}>
          Quality · the proof running underneath, uncounted
        </span>
      </div>
    </div>
  );
}

// Estimated block heights (px) used for greedy pagination.
const H_HEADER = 42;
const H_MUTED = 72;
const H_AVAIL = 20;
const H_SYNTH = 115;
// True usable px for breakdown atoms per page = 1056 minus chrome (pad ~76,
// running header ~50, footer ~40, and the title block: full eyebrow+headline+
// lead ~100 on the first page, a compact "(cont.)" ~44 after). Budgets sit a
// hair under so an accurately-estimated page can never exceed 1056 (no bleed),
// while the common single-setting model still lands on ONE page.
const BUDGET_FIRST = 785;
const BUDGET_CONT = 845;

// Content-aware height estimate for a driver card: title row + wrapped
// description lines + wrapped math-chain rows + padding. Accurate estimates are
// what keep the greedy packer from overflowing the page bottom.
function estDriverH(desc: string, summary?: string): number {
  const descLines = Math.max(1, Math.ceil((desc?.length ?? 0) / 82));
  const tiles = summary ? summary.replace(/\s*\|\s*/g, " × ").split(" × ").length + 1 : 2;
  const chainRows = Math.max(1, Math.ceil(tiles / 5));
  return 24 + descLines * 15 + chainRows * 44 + 18;
}

interface BreakAtom {
  h: number;
  node: ReactNode;
}

// A quadrant carries counted value when it has an included quantified driver.
function quadValue(q: ExplorePDFQuadrantData): number {
  return q.drivers.some((d) => d.visibility === "quantified" && d.isIncluded !== false && d.value > 0)
    ? q.annualTotal
    : -1;
}

function buildBreakdownPages(data: ExplorePDFData): JSX.Element[] {
  const atoms: BreakAtom[] = [];

  // Lead with where the money actually is: money-bearing domains first
  // (largest first), then proof/unmodeled domains as the quiet tail. A stable
  // sort keeps the muted domains in their natural order. This means every
  // setting opens on its strongest material — and for nursing the harm-
  // reduction chains lead instead of three empty domains.
  const ordered = [...data.quadrants].sort((a, b) => quadValue(b) - quadValue(a));

  for (const q of ordered) {
    const includedQuant = q.drivers.filter(
      (d) => d.visibility === "quantified" && d.isIncluded !== false && d.value > 0,
    );
    const available = q.drivers.filter(
      (d) => d.visibility === "quantified" && d.isIncluded === false,
    );

    if (includedQuant.length === 0) {
      atoms.push({ h: H_MUTED, node: <MutedDomain q={q} /> });
      continue;
    }

    includedQuant.forEach((d, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === includedQuant.length - 1;
      const availHere = isLast && available.length > 0;
      const h = (isFirst ? H_HEADER : 0) + estDriverH(d.shortDescription, d.calcSummary) + (availHere ? H_AVAIL : 0);
      atoms.push({
        h,
        node: (
          <div>
            {isFirst && <DomainHeader q={q} />}
            <DriverCard
              label={d.label}
              value={d.value}
              desc={d.shortDescription}
              summary={d.calcSummary}
              last={isLast}
            />
            {availHere && (
              <div style={{ fontSize: 10.5, color: C.off, marginTop: 8, fontStyle: "italic" }}>
                Also here: {available.map((a) => a.label).join(", ")}. Available to model next.
              </div>
            )}
          </div>
        ),
      });
    });
  }

  const synthAtom: BreakAtom = { h: H_SYNTH, node: <SynthesisBar data={data} /> };

  // First, a greedy pass just to learn how many pages the content needs
  // (respecting the per-page budgets). Then rebalance the atoms across exactly
  // that many pages so the content spreads evenly — a greedy fill leaves a
  // near-empty "tail" page (e.g. one driver + the synthesis bar), which reads
  // as broken. Balanced fill makes every page look intentional.
  let gCount = 1;
  let gUsed = 0;
  let gBudget = BUDGET_FIRST;
  for (const a of [...atoms, synthAtom]) {
    if (gUsed + a.h > gBudget && gUsed > 0) {
      gCount += 1;
      gUsed = 0;
      gBudget = BUDGET_CONT;
    }
    gUsed += a.h;
  }

  const pages: BreakAtom[][] = [];
  if (gCount <= 1) {
    pages.push([...atoms, synthAtom]);
  } else {
    const totalH = atoms.reduce((s, a) => s + a.h, 0) + H_SYNTH;
    const target = totalH / gCount;
    let cur: BreakAtom[] = [];
    let used = 0;
    for (const a of atoms) {
      cur.push(a);
      used += a.h;
      // close a page once it reaches the even target, keeping the last page
      // open to absorb the remainder + the synthesis bar.
      if (pages.length < gCount - 1 && used >= target) {
        pages.push(cur);
        cur = [];
        used = 0;
      }
    }
    cur.push(synthAtom);
    pages.push(cur);
  }
  if (pages.length === 0) pages.push([synthAtom]);

  return pages.map((pageAtoms, pi) => (
    <Page key={pi}>
      <RunningHeader data={data} />
      {pi === 0 ? (
        <>
          <div style={{ ...sEyebrow, marginTop: 18 }}>
            <span style={{ color: C.off }}>02</span> · Where the value comes from
          </div>
          <h2 className="font-abridge" style={sHeadline}>
            Four places a better note moves money.
          </h2>
          <p style={sLead}>
            This is the whole map. What you turned on is built out in full, with the exact math; the
            rest stays visible as what's there to model next.
          </p>
        </>
      ) : (
        <div style={{ ...sEyebrow, marginTop: 18 }}>
          <span style={{ color: C.off }}>02</span> · Where the value comes from (cont.)
        </div>
      )}
      {pageAtoms.map((a, i) => (
        <div key={i}>{a.node}</div>
      ))}
      <Footer
        note="Each driver is counted once and valued at margin. The math shown is exactly how the number is built from your inputs."
        num="02"
      />
    </Page>
  ));
}

// ───────────────────────── Page 4 · 03 The investment case ─────────────────────────

function ScenarioCard({
  eyebrow,
  amount,
  ret,
  note,
  highlight,
}: {
  eyebrow: string;
  amount: string;
  ret: string;
  note: string;
  highlight?: boolean;
}): JSX.Element {
  return (
    <div
      style={{
        border: highlight ? `1.5px solid ${C.coral}` : `1px solid ${C.hair}`,
        borderRadius: 16,
        padding: "18px 20px",
        background: highlight ? "#FEF6F3" : C.card,
      }}
    >
      <div style={{ ...sLbl, color: highlight ? C.coral : C.faint }}>{eyebrow}</div>
      <div
        className="font-abridge"
        style={{ fontSize: 31, marginTop: 6, color: highlight ? C.coral : C.ink }}
      >
        {amount}
      </div>
      <div
        className="font-abridge"
        style={{ fontSize: 16, marginTop: 2, color: highlight ? C.coral : C.label }}
      >
        {ret}
      </div>
      <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>{note}</div>
    </div>
  );
}

function CostRow({ k, children }: { k: ReactNode; children: ReactNode }): JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: `1px solid ${C.soft}`,
      }}
    >
      <span style={{ fontSize: 13, color: C.muted }}>{k}</span>
      <span className="font-abridge" style={{ fontSize: 15 }}>
        {children}
      </span>
    </div>
  );
}

function InvestmentPage({ data }: { data: ExplorePDFData }): JSX.Element {
  const inv = data.annualInvestment;
  const total = data.totalAnnualValue;
  const mult = (v: number) => (inv > 0 ? `${(v / inv).toFixed(1)}× return` : "—");
  const downMultBare = inv > 0 ? `${((total * 0.7) / inv).toFixed(1)}×` : "—";

  let pricingLabel = "Annual license";
  let rateVal: number | undefined;
  let rateUnit = "/ yr";
  switch (data.pricingModel) {
    case "perProvider":
      pricingLabel = "Per provider";
      rateVal = data.costPerProvider;
      rateUnit = "/ provider / yr";
      break;
    case "perEncounter":
      pricingLabel = "Per encounter";
      rateVal = data.costPerEncounter;
      rateUnit = "/ encounter";
      break;
    case "annual":
      pricingLabel = "Annual license";
      rateVal = data.annualLicenseFee;
      rateUnit = "/ yr";
      break;
    case "platform":
      pricingLabel = "Platform";
      rateVal = data.platformEncRate;
      rateUnit = "/ encounter";
      break;
  }

  const licenseLabel =
    data.pricingModel === "perProvider"
      ? `Annual license · ${data.numberOfProviders} providers`
      : "Annual license";
  const year1Cash = inv + (data.includeImplementation ? data.implementationFee : 0);

  return (
    <Page>
      <RunningHeader data={data} />
      <div style={{ ...sEyebrow, marginTop: 20 }}>
        <span style={{ color: C.off }}>03</span> · The investment case
      </div>
      <h2 className="font-abridge" style={sHeadline}>
        Conservative even before it's optimistic.
      </h2>
      <p style={sLead}>
        Hit 100% of the plan and here's the return. Miss it by 30% and this is your floor; beat it by
        30% and this is the upside. Even the downside clears the recurring investment nearly four
        times over.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 20 }}>
        <ScenarioCard
          eyebrow="Downside · miss plan by 30%"
          amount={fmtShort(total * 0.7)}
          ret={mult(total * 0.7)}
          note="Slower adoption or tighter realization"
        />
        <ScenarioCard
          eyebrow="On plan · 100%"
          amount={fmtShort(total)}
          ret={`${data.roi.toFixed(1)}× return`}
          note="Your configured model"
          highlight
        />
        <ScenarioCard
          eyebrow="Upside · beat plan by 30%"
          amount={fmtShort(total * 1.3)}
          ret={mult(total * 1.3)}
          note="Faster adoption, full realization"
        />
      </div>

      <div style={{ ...sRule, margin: "26px 0 0" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 22 }}>
        <div>
          <div style={{ ...sLbl, marginBottom: 12 }}>What it costs</div>
          <CostRow k="Pricing model">{pricingLabel}</CostRow>
          <CostRow k="Rate">
            {rateVal != null ? fmtFull(rateVal) : "—"}{" "}
            <span style={{ fontSize: 11, color: C.faint }}>{rateUnit}</span>
          </CostRow>
          <CostRow k={licenseLabel}>{fmtFull(inv)}</CostRow>
          <CostRow k="Implementation · one-time">
            {data.includeImplementation ? fmtFull(data.implementationFee) : "—"}
          </CostRow>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.label }}>
              True Year-1 cash outlay
            </span>
            <span className="font-abridge" style={{ fontSize: 19, color: C.coral }}>
              {fmtFull(year1Cash)}
            </span>
          </div>
        </div>
        <div>
          <div style={{ ...sLbl, marginBottom: 12 }}>Against the value</div>
          <div
            style={{
              border: `1px solid ${C.hair}`,
              borderRadius: 16,
              padding: "20px 22px",
              background: C.card,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 13, color: C.muted }}>Modeled value</span>
              <span className="font-abridge" style={{ fontSize: 22 }}>
                {fmtShort(total)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginTop: 10,
              }}
            >
              <span style={{ fontSize: 13, color: C.muted }}>Recurring investment</span>
              <span className="font-abridge" style={{ fontSize: 22 }}>
                {fmtShort(inv)}
              </span>
            </div>
            <div style={{ ...sRule, margin: "14px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.label }}>Net annual value</span>
              <span className="font-abridge" style={{ fontSize: 26 }}>
                {fmtShort(data.netAnnualValue)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginTop: 10,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: C.label }}>Year-1 return</span>
              <span className="font-abridge" style={{ fontSize: 26, color: C.coral }}>
                {data.roi.toFixed(1)}×
              </span>
            </div>
          </div>
          <p style={{ fontSize: 11, color: C.faint, lineHeight: 1.45, marginTop: 12 }}>
            Even a 30% miss returns {downMultBare} in year one. The plan pays for itself well before
            the downside case.
          </p>
        </div>
      </div>

      <Footer
        note="Scenarios flex performance ±30% against plan; every input stays yours. An estimate, not a guarantee."
        num="03"
      />
    </Page>
  );
}

// ───────────────────────── Page 5 · 04 At full scale + close ─────────────────────────

function ScaleStep({
  amount,
  label,
  width,
  color,
  highlight,
}: {
  amount: string;
  label: string;
  width: number;
  color: string;
  highlight?: boolean;
}): JSX.Element {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div className="font-abridge" style={{ fontSize: 26, color: highlight ? C.coral : C.ink }}>
        {amount}
      </div>
      <div style={{ ...sLbl, marginTop: 4, color: C.muted }}>{label}</div>
      <div style={{ height: 9, background: "#EFE9E1", borderRadius: 99, overflow: "hidden", marginTop: 11 }}>
        <div style={{ height: "100%", background: color, borderRadius: 99, width: `${width}%` }} />
      </div>
    </div>
  );
}

function ClosingBlock({ data }: { data: ExplorePDFData }): JSX.Element {
  return (
    <div
      style={{
        marginTop: 26,
        border: `1.5px solid ${C.coral}`,
        borderRadius: 20,
        background: "#FEF6F3",
        padding: "26px 30px",
      }}
    >
      <div style={{ ...sLbl, color: C.coral }}>The number is yours</div>
      <div
        className="font-abridge"
        style={{ fontSize: 23, color: C.ink, marginTop: 8, lineHeight: 1.25, maxWidth: 620 }}
      >
        Not a benchmark, not a list price, every figure here is yours to verify, and ours to prove
        alongside you.
      </div>
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 18 }}
      >
        <div style={{ fontSize: 12, color: C.muted }}>
          Prepared with your team · {data.clientName} · {data.date}
        </div>
        <div className="font-abridge" style={{ fontSize: 18, color: C.coral }}>
          ABRIDGE
        </div>
      </div>
    </div>
  );
}

function ScalePage({ data }: { data: ExplorePDFData }): JSX.Element {
  const hasExpansion = data.expansionAnnualValue != null;
  const total = data.totalAnnualValue;
  const exp = data.expansionAnnualValue ?? 0;
  const mid =
    data.expansionUtilizationPercent && data.utilizationPercent
      ? total * (data.expansionUtilizationPercent / data.utilizationPercent)
      : total;

  const statCells: { v: ReactNode; k: string }[] = [
    { v: `${data.numberOfProviders} → ${data.expansionProviders}`, k: "Providers" },
    {
      v: `${data.utilizationPercent} → ${data.expansionUtilizationPercent}%`,
      k: "Adoption",
    },
    ...(data.expansionEncounters != null
      ? [
          {
            v: `${fmtNum(data.annualEncounters)} → ${fmtNum(data.expansionEncounters)}`,
            k: "Encounters",
          },
        ]
      : []),
    {
      v: `${data.roi.toFixed(1)}× → ${data.expansionRoi != null ? data.expansionRoi.toFixed(1) : "—"}×`,
      k: "Year-1 return",
    },
  ];

  return (
    <Page>
      <RunningHeader data={data} />
      <div style={{ ...sEyebrow, marginTop: 20 }}>
        <span style={{ color: C.off }}>04</span> · At full scale
      </div>
      <h2 className="font-abridge" style={sHeadline}>
        Today is the smallest this gets.
      </h2>
      <p style={sLead}>
        {hasExpansion
          ? `Same math, larger footprint. From today's ${data.numberOfProviders} providers at ${data.utilizationPercent}% adoption to the full team at ${data.expansionUtilizationPercent}%, the value compounds on both levers at once.`
          : "Same math, larger footprint. The value scales with your footprint as adoption deepens and more of the team comes on."}
      </p>

      {hasExpansion ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 22 }}>
            <div
              style={{
                border: `1px solid ${C.hair}`,
                borderRadius: 18,
                padding: "22px 24px",
                background: C.card,
              }}
            >
              <div style={sLbl}>
                Today · {data.numberOfProviders} providers · {data.utilizationPercent}%
              </div>
              <div className="font-abridge" style={{ fontSize: 38, marginTop: 8 }}>
                {fmtShort(total)}
                <span style={{ fontSize: 14, color: C.faint }}>/yr</span>
              </div>
              <div style={{ height: 10, background: "#EFE9E1", borderRadius: 99, overflow: "hidden", marginTop: 14 }}>
                <div
                  style={{
                    height: "100%",
                    background: "#F4A48C",
                    borderRadius: 99,
                    width: `${exp > 0 ? Math.min(100, (total / exp) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
            <div
              style={{
                border: `1.5px solid ${C.coral}`,
                borderRadius: 18,
                padding: "22px 24px",
                background: "#FEF6F3",
              }}
            >
              <div style={{ ...sLbl, color: C.coral }}>
                Full team · {data.expansionProviders} providers · {data.expansionUtilizationPercent}%
              </div>
              <div className="font-abridge" style={{ fontSize: 38, marginTop: 8, color: C.coral }}>
                {fmtShort(exp)}
                <span style={{ fontSize: 14, color: C.faint }}>/yr</span>
              </div>
              <div style={{ height: 10, background: "#EFE9E1", borderRadius: 99, overflow: "hidden", marginTop: 14 }}>
                <div style={{ height: "100%", background: C.coral, borderRadius: 99, width: "100%" }} />
              </div>
            </div>
          </div>

          <div style={{ ...sLbl, marginTop: 26, marginBottom: 10 }}>What changes at full scale</div>
          <StatBand cells={statCells} />

          <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, marginTop: 18, maxWidth: 660 }}>
            The value compounds on two levers at once, more providers on Abridge, and deeper adoption
            within each. Lifting adoption from {data.utilizationPercent}% to{" "}
            {data.expansionUtilizationPercent}% alone carries today's figure toward{" "}
            <b className="font-abridge" style={{ fontStyle: "normal" }}>
              {fmtShort(mid)}
            </b>
            , before a single new provider is added.
          </p>

          <div style={{ ...sLbl, marginTop: 26, marginBottom: 14 }}>The path there</div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <ScaleStep
              amount={fmtShort(total)}
              label={`Today · ${data.utilizationPercent}%`}
              width={exp > 0 ? Math.min(100, (total / exp) * 100) : 0}
              color="#F4A48C"
            />
            <div style={{ padding: "0 16px 14px", color: C.off, fontSize: 10.5, textAlign: "center", lineHeight: 1.3 }}>
              ＋ adoption
              <br />
              {data.utilizationPercent} → {data.expansionUtilizationPercent}%
            </div>
            <ScaleStep
              amount={fmtShort(mid)}
              label="Same team, deeper"
              width={exp > 0 ? Math.min(100, (mid / exp) * 100) : 0}
              color="#F0704E"
            />
            <div style={{ padding: "0 16px 14px", color: C.off, fontSize: 10.5, textAlign: "center", lineHeight: 1.3 }}>
              ＋ providers
              <br />
              {data.numberOfProviders} → {data.expansionProviders}
            </div>
            <ScaleStep
              amount={fmtShort(exp)}
              label={`Full team · ${data.expansionUtilizationPercent}%`}
              width={100}
              color={C.coral}
              highlight
            />
          </div>
        </>
      ) : (
        <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, marginTop: 22, maxWidth: 660 }}>
          The same math scales as you extend Abridge to more of the team and deepen adoption within
          each. As the footprint grows, today's {fmtShort(total)} grows with it, on the very inputs
          shown throughout this model.
        </p>
      )}

      <ClosingBlock data={data} />

      <Footer
        note="An estimate built from the figures you entered, not a guarantee. You confirm the real numbers as you measure."
        num="04"
      />
    </Page>
  );
}

// ───────────────────────── Document ─────────────────────────

export function ExploreEditorialPdfDocument({ data }: { data: ExplorePDFData }): JSX.Element {
  return (
    <div className="explore-pdf-root">
      <style>{`@page { size: Letter; margin: 0; } @media print { body { margin: 0; } }`}</style>
      <CoverPage data={data} />
      <NumberPage data={data} />
      {buildBreakdownPages(data)}
      <InvestmentPage data={data} />
      <ScalePage data={data} />
    </div>
  );
}

// ───────────────────────── Sample data ─────────────────────────

export const SAMPLE_EXPLORE_PDF_DATA: ExplorePDFData = {
  clientName: "Deaconess Health System",
  preparedBy: "Abridge",
  date: "July 2026",
  careSettingLabel: "Outpatient",

  careSetting: "outpatient",
  numberOfProviders: 120,
  annualEncounters: 350000,
  utilizationPercent: 40,

  totalHoursSaved: 4667,
  minutesSavedPerEncounter: 2,
  timePathScenario: "Phased",

  quadrants: [
    {
      quadrant: "Capacity",
      annualTotal: 549000,
      oneTimeTotal: 0,
      otherFinancialBenefits: [],
      drivers: [
        {
          id: "patientAccess",
          label: "Patient access",
          shortDescription:
            "A lighter documentation load returns clinician time; a share fills as visit headroom, valued at your margin per visit.",
          visibility: "quantified",
          value: 549000,
          isIncluded: true,
          calcSummary: "140,000 visits × 2 min saved × 25% headroom filled × $220/visit",
        },
      ],
    },
    {
      quadrant: "Revenue",
      annualTotal: 731000,
      oneTimeTotal: 0,
      otherFinancialBenefits: [],
      drivers: [
        {
          id: "wRVU",
          label: "wRVU capture",
          shortDescription:
            "A more complete note supports the level of service delivered, lifting captured wRVUs against baseline.",
          visibility: "quantified",
          value: 412000,
          isIncluded: true,
          calcSummary: "248,000 wRVUs × 5% lift × $33.40/wRVU × 90% realization",
        },
        {
          id: "hccRecapture",
          label: "HCC recapture",
          shortDescription:
            "Chronic conditions re-documented and newly surfaced during the visit, valued per plan.",
          visibility: "quantified",
          value: 319000,
          isIncluded: true,
          calcSummary: "18,000 members × 0.125 HCCs per member × $283/HCC × 50% realization",
        },
      ],
    },
    {
      quadrant: "Workforce",
      annualTotal: 180000,
      oneTimeTotal: 0,
      otherFinancialBenefits: [],
      drivers: [
        {
          id: "providerWellbeing",
          label: "Provider wellbeing",
          shortDescription:
            "A lighter after-hours load prevents the burnout-driven share of turnover, valued at replacement cost.",
          visibility: "quantified",
          value: 180000,
          isIncluded: true,
          calcSummary:
            "120 providers × 12% turnover × 40% burnout × 12.5% impact × $250,000/replacement",
        },
        {
          id: "locumAvoidance",
          label: "Locum & agency spend avoidance",
          shortDescription:
            "Fewer vacancies to backfill with premium contract labor as retention improves.",
          visibility: "quantified",
          value: 120000,
          isIncluded: false,
          calcSummary: "12 locum weeks avoided × $10,000/week",
        },
      ],
    },
    {
      quadrant: "Quality",
      annualTotal: 0,
      oneTimeTotal: 0,
      otherFinancialBenefits: [],
      drivers: [
        {
          id: "careGapClosure",
          label: "Care-gap closure",
          shortDescription: "Open care gaps surfaced and closed in the note.",
          visibility: "qualitative",
          value: 0,
          isIncluded: false,
        },
        {
          id: "hedisStars",
          label: "HEDIS / Stars quality",
          shortDescription: "Documentation that supports quality measure performance.",
          visibility: "qualitative",
          value: 0,
          isIncluded: false,
        },
        {
          id: "denialDefensibility",
          label: "Denial defensibility",
          shortDescription: "A stronger record to defend the claim on appeal.",
          visibility: "qualitative",
          value: 0,
          isIncluded: false,
        },
      ],
    },
  ],
  totalAnnualValue: 1460000,
  totalOneTimeValue: 0,

  pricingModel: "perProvider",
  costPerProvider: 2250,
  implementationFee: 60000,
  includeImplementation: true,
  annualInvestment: 270000,

  year2GrowthPercent: 0,
  year3GrowthPercent: 0,
  year1Value: 1460000,
  year2Value: 1460000,
  year3Value: 1460000,
  year1Investment: 270000,
  year2Investment: 270000,
  year3Investment: 270000,
  year1Net: 1190000,
  year2Net: 1190000,
  year3Net: 1190000,
  threeYearGrossTotal: 4380000,
  threeYearInvestmentTotal: 810000,
  threeYearNetTotal: 3570000,
  projectionYears: 3,

  netAnnualValue: 1190000,
  roi: 5.4,
  valuePerProvider: 12167,

  expansionProviders: 240,
  expansionUtilizationPercent: 90,
  expansionAnnualValue: 6600000,
  expansionRoi: 8.1,
  expansionEncounters: 630000,
};
