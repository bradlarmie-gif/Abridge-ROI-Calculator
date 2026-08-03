import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { ExplorePDFData, ExplorePDFQuadrantData } from "./ExplorePDFExport";
import { PROOF_LAYER } from "@/pages/explore/editorial/EdInvestment";
import abridgeLogoRed from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import abridgeSymbol from "@assets/abridge-logo-symbol_1774906992195.png";

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

// ───────────────────────── Proof-layer resolution ─────────────────────────
// Which domain(s) are the NON-FINANCIAL proof layer is a property of the
// setting, read from the SAME source the live model recap uses (PROOF_LAYER):
// nursing = Revenue, inpatient = Capacity + Quality, everyone else = Quality.
// The PDF must never hardcode "Quality" or it contradicts the page it sits on
// (nursing prices Quality as a real dollar).

type PdfProofDomain = "Capacity" | "Workforce" | "Revenue" | "Quality";

function proofDomainsFor(careSetting: string): PdfProofDomain[] {
  const keys = Object.keys(PROOF_LAYER[careSetting] ?? {}) as PdfProofDomain[];
  return keys.length > 0 ? keys : ["Quality"];
}

/** "Quality" · "Revenue" · "Capacity and Quality" · "A, B, and C". */
function joinAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
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

export function parseChain(summary?: string): ChainTile[] {
  if (!summary) return [];
  // Flatten multi-plan HCC summaries ("… | MCO: …") into one chain, then split
  // on the multiplication joiner.
  return summary
    .replace(/\s*\|\s*/g, " × ")
    .split(" × ")
    .map((raw) => {
      const tok = raw.trim();
      // Non-greedy leading text (a plan name / label) → number → trailing unit.
      // The unit (including a "/x" like "/wRVU" or "/replacement") always drops
      // into the small caption, so the big number tile stays narrow and can't
      // overflow onto the next tile or the result (long units like "replacement"
      // used to bleed across the row).
      const m = tok.match(
        /^(.*?)([−-]?\$?[\d,]+(?:\.\d+)?[%KMB]?)\s*(\/?.*)$/,
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
  // Prefer the REAL cumulative-crossover month the model screen computed and
  // threaded through, so the PDF's "When it lands" agrees with the interactive
  // one (they used to disagree: real ramp vs a closed-form approximation).
  // null = model does not pay back within year 1. undefined = not provided
  // (older snapshots / the sample), so fall back to the approximation.
  if (data.paybackMonth !== undefined) {
    return data.paybackMonth === null
      ? null
      : Math.min(12, Math.max(1, Math.round(data.paybackMonth)));
  }
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

// The standard Abridge cover, matched to PDFCoverPage (the react-pdf cover
// every other report uses) but expressed in this HTML-print document: white
// page, red wordmark top-left, org name as the title, faint symbol corner
// mark, disclaimer footer.
function CoverPage({ data }: { data: ExplorePDFData }): JSX.Element {
  const reportLabel = (() => {
    switch (data.careSetting) {
      case "ed":
        return "EMERGENCY DEPARTMENT VALUE ASSESSMENT";
      case "inpatient":
        return "INPATIENT VALUE ASSESSMENT";
      case "nursing":
        return "NURSING VALUE ASSESSMENT";
      default:
        return "OUTPATIENT VALUE ASSESSMENT";
    }
  })();
  const scope =
    data.careSetting === "nursing"
      ? `${fmtNum(data.nursingStaffedBeds ?? 0)} staffed beds`
      : `${fmtNum(data.numberOfProviders)} providers`;
  // Nursing scopes by beds × occupancy (patient-days), not encounters — never
  // print "0 encounters" for a setting that has none.
  const subtitle =
    data.careSetting === "nursing"
      ? `${scope}${data.nursingOccupancyRate ? ` · ${data.nursingOccupancyRate}% occupancy` : ""} · ${data.careSettingLabel}`
      : `${scope} · ${fmtNum(data.annualEncounters)} encounters · ${data.careSettingLabel}`;

  return (
    <div
      style={{
        width: 816,
        height: 1056,
        background: "#FFFFFF",
        breakAfter: "page",
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
          {reportLabel}
        </div>
        <h1
          className="font-abridge"
          style={{ fontSize: 48, lineHeight: 1.12, color: "#1A1A1A", letterSpacing: "-0.5px", margin: 0, marginBottom: 20, maxWidth: 620 }}
        >
          {data.clientName}
        </h1>
        <div style={{ width: 80, height: 3, background: C.coral, marginBottom: 24 }} />
        <div style={{ fontSize: 17, color: "#666666", marginBottom: 44 }}>{subtitle}</div>
        <div style={{ fontSize: 10, color: "#999999", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>
          Prepared by
        </div>
        <div style={{ fontSize: 14, color: "#666666" }}>
          {data.preparedBy} {"·"} {data.date}
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 44, left: 64, right: 64, borderTop: "1px solid #E0E0E0", paddingTop: 12 }}>
        <div style={{ fontSize: 10.5, color: "#999999", lineHeight: 1.5 }}>
          This assessment is for planning purposes. Every figure is built from partner-provided volume and
          economics, and results depend on adoption and how teams act on what the documentation surfaces.
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Page 2 · The pitch (overview) ─────────────────────────

// The universal "pitch" page: the report-cover shell (page 1) is followed by
// this one on every tool. Fixed skeleton — wordmark + tag, coral eyebrow,
// headline sentence, lead, stat trio, table of contents — filled with THIS
// tool's own tag, number, stats, and sections.
function PitchPage({ data }: { data: ExplorePDFData }): JSX.Element {
  const toc = [
    { n: "01", t: "The number, grounded" },
    { n: "02", t: "Where the value comes from" },
    { n: "03", t: "The investment case" },
    { n: "04", t: "At full scale" },
  ];
  const isNursing = data.careSetting === "nursing";
  const scope = isNursing
    ? `${fmtNum(data.nursingStaffedBeds ?? 0)} staffed beds`
    : `${fmtNum(data.numberOfProviders)} providers and ${fmtNum(data.annualEncounters)} encounters`;

  return (
    <Page>
      {/* Top row: wordmark left, tool tag right (matches the pitch across tools) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="font-abridge" style={{ fontSize: 20, color: C.coral }}>
          ABRIDGE
        </span>
        <span style={sLbl}>Value Model</span>
      </div>

      {/* Headline block, dropped for editorial whitespace */}
      <div style={{ marginTop: 128 }}>
        <div style={sEyebrow}>The value on the table</div>
        <h2
          className="font-abridge"
          style={{ fontSize: 44, lineHeight: 1.06, color: C.ink, margin: "10px 0 0", maxWidth: 660, letterSpacing: "-0.5px" }}
        >
          {fmtShort(data.totalAnnualValue)} in value a year, built from your own volume.
        </h2>
        <div style={{ ...sLead, marginTop: 16, maxWidth: 600 }}>
          {data.careSettingLabel}, modeled on {data.clientName}&rsquo;s {scope}. Not a benchmark, and not a
          projection.
        </div>
      </div>

      {/* Hairline + stat trio */}
      <div style={{ ...sRule, margin: "30px 0 22px" }} />
      <div style={{ display: "flex", gap: 56 }}>
        {[
          { v: fmtShort(data.totalAnnualValue), k: "Annual value", coral: true },
          { v: fmtShort(data.valuePerProvider), k: isNursing ? "Per bed" : "Per provider", coral: false },
          { v: data.totalHoursSaved.toLocaleString("en-US"), k: "Clinician hours returned", coral: false },
        ].map((s, i) => (
          <div key={i}>
            <div className="font-abridge" style={{ fontSize: 34, lineHeight: 1, color: s.coral ? C.coral : C.ink }}>
              {s.v}
            </div>
            <div style={{ ...sLbl, marginTop: 7 }}>{s.k}</div>
          </div>
        ))}
      </div>

      {/* Table of contents, pinned near the foot */}
      <div style={{ marginTop: "auto" }}>
        <div style={{ ...sLbl, marginBottom: 6 }}>Inside this assessment</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 44 }}>
          {toc.map((r) => (
            <div
              key={r.n}
              style={{ display: "flex", gap: 14, alignItems: "baseline", padding: "12px 0", borderTop: `1px solid ${C.hair}` }}
            >
              <span className="font-abridge" style={{ fontSize: 13, color: C.off }}>
                {r.n}
              </span>
              <span style={{ fontSize: 14, color: C.label }}>{r.t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Light footer, no section number; the report body starts at 01 */}
      <div style={{ marginTop: 20 }}>
        <div style={{ ...sRule, marginBottom: 9 }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: C.faint }}>
            Prepared for {data.clientName} · {data.date}
          </span>
          <span style={sLbl}>Confidential</span>
        </div>
      </div>
    </Page>
  );
}

// ───────────────────────── Page 3 · 01 The number, grounded ─────────────────────────

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

  const isNursing = data.careSetting === "nursing";
  const providerCell =
    isNursing && data.nursingStaffedBeds != null
      ? { v: fmtNum(data.nursingStaffedBeds), k: "Beds" }
      : { v: fmtNum(data.numberOfProviders), k: "Providers" };
  // Nursing has no encounters; its volume analog is patient-days
  // (beds × occupancy × 365). Everyone else counts annual encounters.
  const volumeCell = isNursing
    ? {
        v: fmtNum(
          Math.round((data.nursingStaffedBeds ?? 0) * ((data.nursingOccupancyRate ?? 0) / 100) * 365),
        ),
        k: "Annual patient-days",
      }
    : { v: data.annualEncounters.toLocaleString("en-US"), k: "Annual encounters" };
  // Nursing time is saved per shift / care event, not per note.
  const savedPerLabel = isNursing ? "Saved per shift" : "Saved per note";
  const proofDomains = proofDomainsFor(data.careSetting);

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
          volumeCell,
          { v: `${data.utilizationPercent}%`, k: "On Abridge today" },
          { v: `${data.minutesSavedPerEncounter} min`, k: savedPerLabel },
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
        note={`Counted once, valued at margin, never charges. ${joinAnd(proofDomains)} ${proofDomains.length > 1 ? "are" : "is"} tracked as proof and never added to the dollar total.`}
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

function MutedDomain({
  q,
  proofDomains,
}: {
  q: ExplorePDFQuadrantData;
  proofDomains: PdfProofDomain[];
}): JSX.Element {
  // A domain is muted for one of two reasons: it is inherently proof-only
  // (no quantified drivers exist for this setting — e.g. Quality, or Nursing
  // Revenue), or it is a money domain whose drivers are simply switched off in
  // this run. The framing differs.
  const quantifiedNames = q.drivers
    .filter((d) => d.visibility === "quantified")
    .map((d) => d.label);
  const proofOnly = quantifiedNames.length === 0;
  const rightLabel = proofOnly ? "Proof · not counted" : "Not modeled";
  // The Quality-as-proof gloss only applies where Quality is actually this
  // setting's proof layer (outpatient/ED/inpatient). For nursing, Quality
  // carries a dollar and Revenue is the proof layer, so a muted nursing
  // Quality falls through to the generic proof/unmodeled framing.
  const qualityIsProof = q.quadrant === "Quality" && proofDomains.includes("Quality");
  const body = qualityIsProof
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
  const proofDomains = proofDomainsFor(data.careSetting);
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
          {joinAnd(proofDomains)} · the proof running underneath, uncounted
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
const BUDGET_FIRST = 880;
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
  const proofDomains = proofDomainsFor(data.careSetting);

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
      atoms.push({ h: H_MUTED, node: <MutedDomain q={q} proofDomains={proofDomains} /> });
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
  const downMultNum = inv > 0 ? (total * 0.7) / inv : 0;
  const downMultBare = inv > 0 ? `${downMultNum.toFixed(1)}×` : "—";

  // Nursing prices per staffed bed, not per provider.
  const isNursing = data.careSetting === "nursing";
  const bedScope = data.nursingStaffedBeds ?? data.numberOfProviders;
  let pricingLabel = "Annual license";
  let rateVal: number | undefined;
  let rateUnit = "/ yr";
  switch (data.pricingModel) {
    case "perProvider":
      pricingLabel = isNursing ? "Per bed" : "Per provider";
      rateVal = data.costPerProvider;
      rateUnit = isNursing ? "/ bed / yr" : "/ provider / yr";
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
      ? `Annual license · ${isNursing ? `${bedScope} beds` : `${data.numberOfProviders} providers`}`
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
        30% and this is the upside.
        {downMultNum >= 1
          ? ` Even the downside clears the recurring investment, at ${downMultBare} in year one.`
          : ""}
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
            {downMultNum >= 1
              ? `Even a 30% miss returns ${downMultBare} in year one. The plan pays for itself well before the downside case.`
              : `At the modeled scope, the configured plan returns ${data.roi.toFixed(1)}× in year one.`}
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

  // Nursing scopes by staffed beds, not providers — label and count accordingly.
  const isNursing = data.careSetting === "nursing";
  const unit = isNursing ? "beds" : "providers";
  const unitSingular = isNursing ? "bed" : "provider";
  const unitCap = isNursing ? "Beds" : "Providers";
  const teamWord = isNursing ? "unit" : "team";
  const scopeToday = isNursing && data.nursingStaffedBeds != null ? data.nursingStaffedBeds : data.numberOfProviders;

  const statCells: { v: ReactNode; k: string }[] = [
    { v: `${scopeToday} → ${data.expansionProviders}`, k: unitCap },
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
          ? `Same math, larger footprint. From today's ${scopeToday} ${unit} at ${data.utilizationPercent}% adoption to the full ${teamWord} at ${data.expansionUtilizationPercent}%, the value compounds on both levers at once.`
          : `Same math, larger footprint. The value scales with your footprint as adoption deepens and more of the ${teamWord} comes on.`}
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
                Today · {scopeToday} {unit} · {data.utilizationPercent}%
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
                Full {teamWord} · {data.expansionProviders} {unit} · {data.expansionUtilizationPercent}%
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

          <p style={{ fontSize: 10.5, color: C.faint, lineHeight: 1.5, marginTop: 10 }}>
            Total annual value, before the recurring investment. The interactive model shows the same
            expansion net of investment.
          </p>

          <div style={{ ...sLbl, marginTop: 26, marginBottom: 10 }}>What changes at full scale</div>
          <StatBand cells={statCells} />

          <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, marginTop: 18, maxWidth: 660 }}>
            The value compounds on two levers at once, more {unit} on Abridge, and deeper adoption
            within each. Lifting adoption from {data.utilizationPercent}% to{" "}
            {data.expansionUtilizationPercent}% alone carries today's figure toward{" "}
            <b className="font-abridge" style={{ fontStyle: "normal" }}>
              {fmtShort(mid)}
            </b>
            , before a single new {unitSingular} is added.
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
              label={`Same ${teamWord}, deeper`}
              width={exp > 0 ? Math.min(100, (mid / exp) * 100) : 0}
              color="#F0704E"
            />
            <div style={{ padding: "0 16px 14px", color: C.off, fontSize: 10.5, textAlign: "center", lineHeight: 1.3 }}>
              ＋ {unit}
              <br />
              {scopeToday} → {data.expansionProviders}
            </div>
            <ScaleStep
              amount={fmtShort(exp)}
              label={`Full ${teamWord} · ${data.expansionUtilizationPercent}%`}
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
      <PitchPage data={data} />
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
      annualTotal: 513480,
      oneTimeTotal: 0,
      otherFinancialBenefits: [],
      drivers: [
        {
          id: "patientAccess",
          label: "Patient access",
          shortDescription:
            "A lighter documentation load returns clinician time; a share fills as visit headroom, valued at your margin per visit.",
          visibility: "quantified",
          value: 513480,
          isIncluded: true,
          calcSummary: "2,334 added visits × $220/visit",
        },
      ],
    },
    {
      quadrant: "Revenue",
      annualTotal: 691083,
      oneTimeTotal: 0,
      otherFinancialBenefits: [],
      drivers: [
        {
          id: "wRVU",
          label: "wRVU capture",
          shortDescription:
            "A more complete note supports the level of service delivered, lifting captured wRVUs against baseline.",
          visibility: "quantified",
          value: 372708,
          isIncluded: true,
          calcSummary: "248,000 wRVUs × 5% lift × $33.40/wRVU × 90% realization",
        },
        {
          id: "hccRecapture",
          label: "HCC recapture",
          shortDescription:
            "Chronic conditions re-documented and newly surfaced during the visit, valued per plan.",
          visibility: "quantified",
          value: 318375,
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
            "A lighter after-hours load reduces the burnout-driven share of turnover, valued at replacement cost.",
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
  totalAnnualValue: 1384563,
  totalOneTimeValue: 0,

  pricingModel: "perProvider",
  costPerProvider: 2250,
  implementationFee: 60000,
  includeImplementation: true,
  annualInvestment: 270000,

  year2GrowthPercent: 0,
  year3GrowthPercent: 0,
  year1Value: 1384563,
  year2Value: 1384563,
  year3Value: 1384563,
  year1Investment: 270000,
  year2Investment: 270000,
  year3Investment: 270000,
  year1Net: 1114563,
  year2Net: 1114563,
  year3Net: 1114563,
  threeYearGrossTotal: 4153689,
  threeYearInvestmentTotal: 810000,
  threeYearNetTotal: 3343689,
  projectionYears: 3,

  netAnnualValue: 1114563,
  roi: 5.1,
  valuePerProvider: 11538,

  expansionProviders: 240,
  expansionUtilizationPercent: 90,
  expansionAnnualValue: 6230534,
  expansionRoi: 11.5,
  expansionEncounters: 630000,
};
