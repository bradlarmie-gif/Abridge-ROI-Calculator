import { Fragment, type ReactNode } from "react";
import { DOMAIN_COLORS, DOMAIN_INK } from "@/lib/domainColors";
import abridgeLogoRed from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import abridgeSymbol from "@assets/abridge-logo-symbol_1774906992195.png";

// ────────────────────────────────────────────────────────────────
// Editorial "Financial Proforma" print-to-PDF document.
// Pixel-faithful React reproduction of the locked 7-section design
// (see scratchpad/proforma-pdf-mock.html). Pure function of `data` —
// no hooks, no window access — so it renders identically in print.
//
// The per-setting drill-down maps over data.settings[], so 2/3/4 care
// settings each get their own page(s), with a no-bleed height budget so
// a driver-heavy setting paginates cleanly and nothing exceeds 1056px.
// ────────────────────────────────────────────────────────────────

export const PROFORMA_PDF_STORAGE_KEY = "abridge:proforma-pdf";

// Per-setting display colors (descending emphasis). Matches the mock:
// setting 1 = coral, setting 2 = soft pink, then warmer neutrals.
export const PF_SETTING_COLORS = ["#EA2C00", "#F4A48C", "#F0704E", "#AFA491"] as const;

// Domain accent colors (mock --rev / --cap / --wf / --off).
const DOMAIN_COLOR = DOMAIN_COLORS; // one app-wide palette (lib/domainColors)

// ───────────────────────── Types ─────────────────────────

export interface PfDriver {
  label: string;
  value: number; // at full scale, $/yr
  desc: string;
  /** " × "-joined math chain, no trailing "= value" (that is appended). */
  chain?: string;
}

export interface PfDomainGroup {
  key: "Revenue" | "Capacity" | "Workforce" | "Quality";
  total: number;
  drivers: PfDriver[];
}

export interface PfRampYear {
  year: number;
  value: number;
  providers: number;
  utilization: number;
}

export interface PfSetting {
  id: string;
  label: string;
  color: string;
  pilotProviders: number;
  fullScaleProviders: number;
  encounters: number; // annual, at full scale
  goLiveMonth: number;
  atScaleValue: number;
  encounterLabel: string; // "encounters / yr" | "ED visits / yr" | "discharges / yr" | "patient-days / yr"
  providerWord?: string;  // "providers" | "nurses"
  narrative: string;
  domains: PfDomainGroup[];
  ramp: PfRampYear[];
  signals: string[];
}

export interface PfDomainTile {
  key: string;
  value: number;
  pct: number;
  northStar: string;
  counted: boolean;
}

export interface PfYearRow {
  perSetting: { id: string; value: number }[];
  total: number;
  revenue: number;
  capacity: number;
  workforce: number;
  quality: number;
  investment: number;
  net: number;
  cumulativeNet: number;
  roi: number;
}

export interface PfKeyVal {
  label: string;
  value: string;
}

export interface PfCostRow {
  label: string;
  years: number[];
  total: number;
}

export interface PfScenario {
  name: string;
  realizationPct: number;
  net: number;
  roi: number;
  paybackLabel: string;
  highlight?: boolean;
}

export interface PfCashPoint {
  month: number;
  cumNet: number;
}

export interface PfHeld {
  title: string;
  body: string;
}

export interface PfMilestone {
  label: string;
  body: string;
}

export interface PfProofStep {
  title: string;
  body: string;
}

export interface ProformaPdfData {
  org: string;
  date: string;
  // headline
  termNet: number;
  termYears: number; // contract term length in years (drives all "N-year" copy)
  roi: number; // term value / cost
  paybackMonth: number | null;
  runRateValue: number; // $/yr at full scale
  // page 2 · the case, grounded
  settings: PfSetting[];
  operation: PfKeyVal[];
  domainTiles: PfDomainTile[];
  thesis: string;
  // page 3 · how value builds
  years: PfYearRow[];
  milestones: PfMilestone[];
  whenValueLands: string;
  theRead: string;
  // page 4 · the investment case
  costRows: PfCostRow[];
  totalInvestmentRow: PfCostRow;
  costNote: string;
  scenarios: PfScenario[];
  scenarioNote: string;
  modelInputs: PfKeyVal[];
  cashFlow: PfCashPoint[];
  heldConservative: PfHeld[];
  // closing
  closingStatement: string;
  proofSteps: PfProofStep[];
  handoff: string;
}

// ───────────────────────── Formatters ─────────────────────────

/** "$2.65M" (2-dec M), "$731K" (round K), "$228" — matches the mock. */
function fmtMoney(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${sign}$${Math.round(a / 1e3)}K`;
  return `${sign}$${Math.round(a)}`;
}

/** Always 2-decimal millions, e.g. "$0.55M", "$2.65M" — case-level figures. */
function fmtM(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  return `${sign}$${(a / 1e6).toFixed(2)}M`;
}

/** Parenthesized cost, e.g. "($0.80M)". */
function fmtCost(n: number): string {
  return `(${fmtM(Math.abs(n))})`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Compact count: "352K", "18,000" stays full below 100K only when asked. */
function fmtCount(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (a >= 1e3) return `${Math.round(n / 1e3)}K`;
  return `${Math.round(n)}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// ───────────────────────── Chain parser ─────────────────────────

interface ChainTile {
  n: string;
  u: string;
}

function parseChain(summary?: string): ChainTile[] {
  if (!summary) return [];
  return summary
    .replace(/\s*\|\s*/g, " × ")
    .split(" × ")
    .map((raw) => {
      const tok = raw.trim();
      const m = tok.match(/^(.*?)([−-]?\$?[\d,]+(?:\.\d+)?[%KMB]?(?:\s*\/\s*[A-Za-z0-9]+)?)\s*(.*)$/);
      if (!m) return { n: tok, u: "" };
      return { n: m[2].replace(/\s*\/\s*/g, "/"), u: m[3].trim() };
    });
}

function Chain({ chain, value }: { chain?: string; value: number }): JSX.Element {
  const tiles = parseChain(chain);
  // No mapped formula for this driver — keep the separator rhythm, but don't
  // render a dangling "= $X a year".
  if (tiles.length === 0) return <div className="chain" />;
  return (
    <div className="chain">
      {tiles.map((t, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="op">×</span>}
          <div className="ct">
            <div className="n">{t.n}</div>
            {t.u && <div className="u">{t.u}</div>}
          </div>
        </Fragment>
      ))}
      <span className="op">=</span>
      <div className="ct">
        <div className="n" style={{ color: "var(--coral)" }}>
          {fmtMoney(value)}
        </div>
        <div className="u">a year</div>
      </div>
    </div>
  );
}

// ───────────────────────── Stylesheet ─────────────────────────
// The mock's CSS, scoped under `.pf` so it can't leak into the app. The
// Abridge + Manrope faces are already registered app-wide (index.css +
// the Google Fonts link in index.html), so no @font-face is needed here.

const CSS = `
@page { size: Letter; margin: 0; }
@media print { body { margin: 0; } .pf { background: #fff !important; padding: 0 !important; } .pf .sheet { box-shadow: none !important; margin: 0 auto !important; } }
.pf { --page:#FFFFFF; --card:#FDFBF8; --hair:#E8E2DA; --soft:#F1EBE3; --coral:#EA2C00; --ink:#1A1A1A; --label:#2E2822; --muted:#5E534A; --faint:#786C5E; --off:#AFA491; --cap:#F0704E; --rev:#EA2C00; --wf:#F4A48C; background:#DED8D0; font-family:'Manrope',sans-serif; color:var(--ink); -webkit-font-smoothing:antialiased; padding:34px 0; }
.pf * { box-sizing:border-box; margin:0; padding:0; }
.pf .abr { font-family:'Abridge','Manrope'; font-weight:normal; }
.pf .sheet { width:816px; height:1056px; background:var(--page); margin:0 auto 30px; position:relative; box-shadow:0 8px 34px rgba(60,46,32,.16); overflow:hidden; }
.pf .sheet:not(:last-child) { break-after:page; }
.pf .in { position:absolute; inset:0; padding:44px 56px 30px; display:flex; flex-direction:column; }
.pf .rhead { display:flex; justify-content:space-between; align-items:baseline; padding-bottom:11px; border-bottom:1px solid var(--hair); }
.pf .rhead .l { font-size:10px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:var(--faint); }
.pf .rhead .n { font-family:'Abridge'; font-size:15px; color:var(--off); }
.pf .eyebrow { font-size:11px; font-weight:800; letter-spacing:.16em; text-transform:uppercase; color:var(--coral); }
.pf .lbl { font-size:10px; font-weight:800; letter-spacing:.13em; text-transform:uppercase; color:var(--faint); }
.pf .chaptitle { font-family:'Abridge'; font-size:30px; color:var(--ink); line-height:1.05; margin-top:8px; }
.pf .stat .v { font-family:'Abridge'; font-size:28px; }
.pf .stat .v.coral { color:var(--coral); }
.pf .stat .k { font-size:9px; color:var(--faint); text-transform:uppercase; letter-spacing:.07em; font-weight:800; margin-top:5px; }
.pf .dot { width:10px; height:10px; border-radius:3px; flex:none; display:inline-block; }
.pf .mini { display:flex; height:7px; border-radius:99px; overflow:hidden; margin-top:9px; }
.pf .domtile { border:1px solid var(--hair); border-radius:13px; background:var(--card); padding:14px 16px; }
.pf .northstar { font-size:10.5px; color:var(--faint); line-height:1.4; margin-top:6px; }
.pf .pgnum { position:absolute; bottom:16px; left:0; right:0; text-align:center; font-size:9px; letter-spacing:.1em; color:var(--off); text-transform:uppercase; }
.pf .drv { display:flex; align-items:baseline; justify-content:space-between; padding:9px 0 3px; }
.pf .drv .nm { font-size:14px; font-weight:700; color:var(--label); }
.pf .drv .vl { font-family:'Abridge'; font-size:16px; color:var(--coral); }
.pf .dsc { font-size:11px; color:var(--faint); line-height:1.35; padding-bottom:6px; }
.pf .chain { display:flex; gap:10px; align-items:center; flex-wrap:wrap; padding:2px 0 10px; border-bottom:1px solid var(--soft); }
.pf .chain .ct .n { font-family:'Abridge'; font-size:14px; color:var(--ink); line-height:1; }
.pf .chain .ct .u { font-size:8px; color:var(--faint); margin-top:3px; letter-spacing:.02em; }
.pf .chain .op { font-size:11px; color:#C9BCA9; }
.pf .domhead { display:flex; align-items:center; justify-content:space-between; margin-top:13px; padding-bottom:4px; }
.pf .dompill { display:flex; align-items:center; gap:8px; }
.pf .dompill .p { font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
.pf .domtot { font-family:'Abridge'; font-size:15px; color:var(--ink); }
.pf .tbl { width:100%; border-collapse:collapse; margin-top:6px; }
.pf .tbl th { font-size:9px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; color:var(--faint); text-align:right; padding:7px 9px; }
.pf .tbl th:first-child { text-align:left; }
.pf .tbl td { font-size:12px; padding:7px 9px; text-align:right; border-top:1px solid var(--soft); }
.pf .tbl td:first-child { text-align:left; color:var(--muted); }
.pf .tbl .num { font-family:'Abridge'; color:var(--ink); }
.pf .tbl .sub td { color:var(--faint); font-size:11px; padding:5px 9px; border-top:none; }
.pf .tbl .sub td:first-child { padding-left:22px; }
.pf .step { display:flex; gap:12px; align-items:flex-start; padding:8px 0; }
.pf .stepn { width:24px; height:24px; border-radius:99px; border:1.5px solid var(--coral); color:var(--coral); font-family:'Abridge'; font-size:13px; display:flex; align-items:center; justify-content:center; flex:none; }
.pf .sig { display:flex; align-items:baseline; gap:8px; padding:14px 0; border-bottom:1px solid var(--soft); }
.pf .sig .d { width:5px; height:5px; border-radius:99px; background:var(--coral); flex:none; position:relative; top:-2px; }
.pf .held { display:flex; gap:9px; padding:8px 0; border-bottom:1px solid var(--soft); }
.pf .held .d { width:5px; height:5px; border-radius:99px; background:var(--coral); flex:none; position:relative; top:6px; }
.pf .ms { border:1px solid var(--hair); border-radius:12px; background:var(--card); padding:13px 15px; }
`;

// ───────────────────────── Shell ─────────────────────────

function Sheet({
  children,
  pgnum,
}: {
  children: ReactNode;
  pgnum?: string;
}): JSX.Element {
  return (
    <div className="sheet">
      <div className="in">
        {children}
        {pgnum && <div className="pgnum">{pgnum}</div>}
      </div>
    </div>
  );
}

function RunningHeader({ label, num }: { label: string; num: string }): JSX.Element {
  return (
    <div className="rhead">
      <span className="l">{label}</span>
      <span className="n">{num}</span>
    </div>
  );
}

// ───────────────────────── Page 1 · Report cover ─────────────────────────

// The universal Abridge report cover, shared across every tool PDF: white page,
// coral wordmark, org name as title, faint symbol corner mark, disclaimer foot.
// Matched pixel-for-pixel to Explore's cover so all tools open identically.
function ReportCover({ data }: { data: ProformaPdfData }): JSX.Element {
  const term = data.years?.length ?? 3;
  const labels = data.settings.map((s) => s.label);
  const settingsSummary =
    labels.length <= 3 ? labels.join(" · ") : `${cap(numWord(labels.length))} care settings`;
  const subtitle = `${settingsSummary} · ${term}-year term`;
  return (
    <div className="sheet" style={{ background: "#FFFFFF" }}>
      <img src={abridgeLogoRed} alt="Abridge" style={{ position: "absolute", top: 60, left: 64, width: 120 }} />
      <img src={abridgeSymbol} alt="" style={{ position: "absolute", bottom: 92, right: 10, width: 340, opacity: 0.06 }} />
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
          Financial Proforma
        </div>
        <h1 className="abr" style={{ fontSize: 48, lineHeight: 1.12, color: "#1A1A1A", letterSpacing: "-0.5px", margin: "0 0 20px", maxWidth: 620 }}>
          {data.org}
        </h1>
        <div style={{ width: 80, height: 3, background: "var(--coral)", marginBottom: 24 }} />
        <div style={{ fontSize: 17, color: "#666666", marginBottom: 44 }}>{subtitle}</div>
        <div style={{ fontSize: 10, color: "#999999", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>
          Prepared by
        </div>
        <div style={{ fontSize: 14, color: "#666666" }}>Abridge · {data.date}</div>
      </div>
      <div style={{ position: "absolute", bottom: 44, left: 64, right: 64, borderTop: "1px solid #E0E0E0", paddingTop: 12 }}>
        <div style={{ fontSize: 10.5, color: "#999999", lineHeight: 1.5 }}>
          This proforma is for planning purposes. Every figure is built from partner-provided volume and economics,
          and results depend on adoption and how teams act on what the documentation surfaces.
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Page 2 · The pitch ─────────────────────────

function CoverInner({ data }: { data: ProformaPdfData }): JSX.Element {
  const chapters: [string, string][] = [
    ["01", "The case, grounded"],
    ["02", `How value builds over ${termYrsWord(data.termYears)}`],
    ["03", "The investment case"],
    ...data.settings.map((s, i): [string, string] => [pad2(4 + i), `${s.label}, in detail`]),
    [pad2(4 + data.settings.length), "The number is yours"],
  ];
  const settingCount = data.settings.length;
  const paybackTxt =
    data.paybackMonth != null ? `Month ${data.paybackMonth}` : "In term";
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="abr" style={{ fontSize: 21, color: "var(--coral)" }}>
          ABRIDGE
        </span>
        <span className="lbl">Financial Proforma</span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div className="eyebrow">The {data.termYears}-year case</div>
        <h1 className="abr" style={{ fontSize: 56, lineHeight: 1.02, marginTop: 16, maxWidth: 640 }}>
          {data.termNet >= 0
            ? `A ${fmtM(data.termNet)} case, paid back in ${data.paybackMonth != null ? `${numWord(data.paybackMonth)} months` : "term"}.`
            : `A ${termYrsWord(data.termYears)} case that does not clear its cost yet.`}
        </h1>
        <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.5, marginTop: 20, maxWidth: 530 }}>
          {settingCount === 1 ? "One care setting" : `${cap(numWord(settingCount))} care settings`}, modeled on {data.org}'s own volume and economics over a {data.termYears}-year term. Not a benchmark, and not a list price.
        </p>
        <div style={{ display: "flex", gap: 48, marginTop: 38, paddingTop: 24, borderTop: "1px solid var(--hair)" }}>
          <div className="stat">
            <div className="v coral" style={{ fontSize: 32 }}>{fmtM(data.termNet)}</div>
            <div className="k">{cap(numWord(data.termYears))}-year net value</div>
          </div>
          <div className="stat">
            <div className="v" style={{ fontSize: 32 }}>{data.roi.toFixed(1)}×</div>
            <div className="k">Return on investment</div>
          </div>
          <div className="stat">
            <div className="v" style={{ fontSize: 32 }}>{paybackTxt}</div>
            <div className="k">Payback</div>
          </div>
        </div>
      </div>
      <div>
        <div className="lbl" style={{ marginBottom: 11 }}>Inside this model</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 40px" }}>
          {chapters.map(([no, title]) => (
            <div
              key={no}
              style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--label)", borderBottom: "1px solid var(--soft)", paddingBottom: 7 }}
            >
              <span className="abr" style={{ color: "var(--off)" }}>{no}</span> {title}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22, fontSize: 11, color: "var(--faint)" }}>
          <span>Prepared with your team · {data.org} · {data.date}</span>
          <span>Confidential</span>
        </div>
      </div>
    </>
  );
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
function numWord(n: number): string {
  return n >= 0 && n <= 20 ? WORDS[n] : String(n);
}

/** "over three years" / "over one year" — grammatical term-length phrase. */
function termYrsWord(n: number): string {
  return n === 1 ? "one year" : `${numWord(n)} years`;
}

// ───────────────────────── Page 2 · The case, grounded ─────────────────────────

function DealCard({ s }: { s: PfSetting }): JSX.Element {
  const rev = s.domains.find((d) => d.key === "Revenue")?.total ?? 0;
  const cap = s.domains.find((d) => d.key === "Capacity")?.total ?? 0;
  const wf = s.domains.find((d) => d.key === "Workforce")?.total ?? 0;
  // Quality carries a dollar only in Nursing; elsewhere it is $0 and drops out.
  const qua = s.domains.find((d) => d.key === "Quality")?.total ?? 0;
  const sum = rev + cap + wf + qua || 1;
  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="dot" style={{ background: s.color }} />
          <span className="abr" style={{ fontSize: 20 }}>{s.label}</span>
        </div>
        <span className="abr" style={{ fontSize: 17 }}>
          {fmtM(s.atScaleValue)}
          <span style={{ fontSize: 10, color: "var(--faint)" }}>/yr</span>
        </span>
      </div>
      <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 5 }}>
        {s.pilotProviders} → {s.fullScaleProviders} {s.providerWord ?? "providers"} · ≈{fmtCount(s.encounters)} {s.encounterLabel} · go-live month {s.goLiveMonth}
      </div>
      <div className="mini">
        <div style={{ width: `${(rev / sum) * 100}%`, background: "var(--rev)" }} />
        <div style={{ width: `${(cap / sum) * 100}%`, background: "var(--cap)" }} />
        <div style={{ width: `${(wf / sum) * 100}%`, background: "var(--wf)" }} />
        {qua > 0 && <div style={{ width: `${(qua / sum) * 100}%`, background: "var(--off)" }} />}
      </div>
      <div style={{ fontSize: 10, color: "var(--faint)", marginTop: 6 }}>
        Revenue {fmtMoney(rev)} · Capacity {fmtMoney(cap)} · Workforce {fmtMoney(wf)}
        {qua > 0 ? ` · Quality ${fmtMoney(qua)}` : ""}
      </div>
    </div>
  );
}

function CaseInner({ data }: { data: ProformaPdfData }): JSX.Element {
  const paybackTxt = data.paybackMonth != null ? `Month ${data.paybackMonth}` : "In term";
  // When more than two settings are modeled the deal-card grid gains a row;
  // compact the section rhythm so page 2 still lands inside 1056px (no bleed).
  const dense = data.settings.length > 2;
  const secMt = dense ? 12 : 20;
  return (
    <>
      <RunningHeader label={`The ${data.termYears}-year case · ${data.org}`} num="01" />
      <div className="eyebrow" style={{ marginTop: 16 }}>The case, grounded</div>
      <h2 className="chaptitle">What the deal is, and where the value comes from.</h2>

      {/* Page 2 (the pitch) owns the 3-year net / payback / ROI trio; this page
          grounds the case in the annual run-rate the operation actually produces. */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, marginTop: dense ? 12 : 18, padding: dense ? "12px 0" : "16px 0", borderTop: "1px solid var(--hair)", borderBottom: "1px solid var(--hair)" }}>
        <div>
          <div className="v coral" style={{ fontSize: 46, lineHeight: 1 }}>{fmtM(data.runRateValue)}<span style={{ fontSize: 16, color: "var(--faint)" }}>/yr</span></div>
          <div className="k" style={{ marginTop: 6 }}>At full scale · clinical value, counted once</div>
        </div>
        <p style={{ fontSize: 12, color: "var(--faint)", lineHeight: 1.5, maxWidth: 320, paddingBottom: 4 }}>
          What the operation produces in a year once {data.settings.length === 1 ? "the care setting reaches" : data.settings.length === 2 ? "both care settings reach" : `all ${numWord(data.settings.length)} care settings reach`} full adoption. The {data.termYears}-year case compounds from this run-rate as teams ramp; payback lands in {paybackTxt.toLowerCase()}.
        </p>
      </div>

      <div className="lbl" style={{ marginTop: dense ? 14 : 18, marginBottom: 4 }}>
        The deal · {numWord(data.settings.length)} care setting{data.settings.length === 1 ? "" : "s"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {data.settings.map((s) => <DealCard key={s.id} s={s} />)}
      </div>

      <div className="lbl" style={{ marginTop: secMt, marginBottom: 9 }}>The operation we modeled · carried over from your Explore inputs</div>
      <div style={{ display: "flex", justifyContent: "space-between", border: "1px solid var(--hair)", borderRadius: 14, background: "var(--card)", padding: "13px 24px" }}>
        {data.operation.map((o) => (
          <div key={o.label}>
            <div className="abr" style={{ fontSize: 17 }}>{o.value}</div>
            <div style={{ fontSize: 9, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 800, marginTop: 3 }}>{o.label}</div>
          </div>
        ))}
      </div>

      <div className="lbl" style={{ marginTop: secMt, marginBottom: 10 }}>Where the value comes from · at full scale, {fmtMoney(data.runRateValue)} / yr</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {data.domainTiles.map((t) => (
          <div className="domtile" key={t.key}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="dot" style={{ background: DOMAIN_COLOR[t.key] ?? "var(--off)" }} />
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--label)" }}>{t.key}</span>
              </div>
              {t.counted ? (
                <span className="abr" style={{ fontSize: 16, color: "var(--coral)" }}>
                  {fmtMoney(t.value)}<span style={{ fontSize: 10, color: "var(--faint)" }}> · {t.pct}%</span>
                </span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--faint)" }}>tracked, not counted</span>
              )}
            </div>
            <div className="northstar">{t.northStar}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: secMt, border: "1px solid var(--hair)", borderRadius: 15, background: "var(--card)", padding: dense ? "14px 22px" : "18px 22px" }}>
        <div className="lbl" style={{ color: "var(--label)", marginBottom: 7 }}>The thesis</div>
        <div className="abr" style={{ fontSize: 18, lineHeight: 1.34, color: "var(--ink)" }}>{data.thesis}</div>
      </div>
    </>
  );
}

// ───────────────────────── Page 3 · How value builds ─────────────────────────

function StackedBar({ data }: { data: ProformaPdfData }): JSX.Element {
  const years = data.years;
  const maxTotal = Math.max(...years.map((y) => y.total), 1);
  const baseY = 166;
  const maxH = 132;
  const scale = maxH / maxTotal;
  const W = 900;
  const left = 60;
  const usable = 820;
  const slot = usable / years.length;
  const barW = Math.min(150, slot * 0.62);
  return (
    <svg viewBox={`0 0 ${W} 190`} style={{ width: "100%", marginTop: 12 }}>
      <line x1="30" y1={baseY} x2="880" y2={baseY} stroke="var(--hair)" />
      {years.map((y, yi) => {
        const cx = left + slot * (yi + 0.5);
        const x = cx - barW / 2;
        let cursorY = baseY;
        const segs = data.settings.map((s) => {
          const v = y.perSetting.find((p) => p.id === s.id)?.value ?? 0;
          const h = v * scale;
          cursorY -= h;
          return { color: s.color, y: cursorY, h };
        });
        const topY = cursorY;
        const invY = baseY - y.investment * scale;
        return (
          <g key={yi}>
            {segs.map((sg, si) => sg.h > 0 && (
              <rect key={si} x={x} y={sg.y} width={barW} height={sg.h} fill={sg.color} />
            ))}
            <line x1={x} y1={invY} x2={x + barW} y2={invY} stroke="#5E534A" strokeWidth="1.4" strokeDasharray="4 3" />
            <text x={cx} y={topY - 8} fontSize="12" fill="var(--ink)" textAnchor="middle" className="abr">{fmtM(y.total)}</text>
            <text x={cx} y="184" fontSize="10" fill="var(--faint)" textAnchor="middle">Year {yi + 1}</text>
          </g>
        );
      })}
      <text x="880" y="114" fontSize="9" fill="var(--muted)" textAnchor="end">investment</text>
    </svg>
  );
}

function HowValueInner({ data }: { data: ProformaPdfData }): JSX.Element {
  const years = data.years;
  const sum = (f: (y: PfYearRow) => number) => years.reduce((a, y) => a + f(y), 0);
  // The final column is a 3-YEAR TOTAL column (Investment and Net above it are 3-year sums),
  // so the ROI in it must be the true term ratio: total value ÷ total investment. Anything else
  // (e.g. the last year's annual ROI) fails to foot against the Investment/Net totals in its own
  // column and contradicts the cover's 3-year ROI. total value = total net + total investment.
  const totalInvestment = sum((y) => y.investment);
  const roi3 = totalInvestment > 0 ? (sum((y) => y.net) + totalInvestment) / totalInvestment : data.roi;
  return (
    <>
      <RunningHeader label={`The ${data.termYears}-year case · ${data.org}`} num="02" />
      <div className="eyebrow" style={{ marginTop: 16 }}>How value builds over {termYrsWord(data.termYears)}</div>
      <h2 className="chaptitle">The case, year by year.</h2>

      <StackedBar data={data} />
      <div style={{ display: "flex", gap: 18, marginTop: 0, flexWrap: "wrap" }}>
        {data.settings.map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)" }}>
            <span className="dot" style={{ background: s.color }} />{s.label}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)" }}>
          <span style={{ width: 14, height: 2, background: "#5E534A", display: "inline-block" }} />Investment
        </div>
      </div>

      <div className="lbl" style={{ marginTop: 16 }}>{data.termYears}-year financial summary</div>
      <table className="tbl">
        <thead>
          <tr>
            <th>Care setting</th>
            {years.map((_, i) => <th key={i}>Year {i + 1}</th>)}
            <th>{data.termYears}-year</th>
          </tr>
        </thead>
        <tbody>
          {data.settings.map((s) => (
            <tr key={s.id}>
              <td>{s.label}</td>
              {years.map((y, i) => <td className="num" key={i}>{fmtM(y.perSetting.find((p) => p.id === s.id)?.value ?? 0)}</td>)}
              <td className="num">{fmtM(sum((y) => y.perSetting.find((p) => p.id === s.id)?.value ?? 0))}</td>
            </tr>
          ))}
          <tr style={{ background: "#F4EEE6" }}>
            <td style={{ fontWeight: 800, color: "var(--label)" }}>Total value</td>
            {years.map((y, i) => <td className="num" style={{ fontWeight: 800 }} key={i}>{fmtM(y.total)}</td>)}
            <td className="num" style={{ fontWeight: 800 }}>{fmtM(sum((y) => y.total))}</td>
          </tr>
          <tr className="sub">
            <td>Revenue</td>
            {years.map((y, i) => <td key={i}>{fmtM(y.revenue)}</td>)}
            <td>{fmtM(sum((y) => y.revenue))}</td>
          </tr>
          <tr className="sub">
            <td>Capacity</td>
            {years.map((y, i) => <td key={i}>{fmtM(y.capacity)}</td>)}
            <td>{fmtM(sum((y) => y.capacity))}</td>
          </tr>
          <tr className="sub">
            <td>Workforce</td>
            {years.map((y, i) => <td key={i}>{fmtM(y.workforce)}</td>)}
            <td>{fmtM(sum((y) => y.workforce))}</td>
          </tr>
          {sum((y) => y.quality) > 0 && (
            <tr className="sub">
              <td>Quality</td>
              {years.map((y, i) => <td key={i}>{fmtM(y.quality)}</td>)}
              <td>{fmtM(sum((y) => y.quality))}</td>
            </tr>
          )}
          <tr>
            <td>Investment</td>
            {years.map((y, i) => <td className="num" key={i}>{fmtCost(y.investment)}</td>)}
            <td className="num">{fmtCost(sum((y) => y.investment))}</td>
          </tr>
          <tr style={{ background: "#FEF3EF" }}>
            <td style={{ fontWeight: 800, color: "var(--label)" }}>Net value</td>
            {years.map((y, i) => <td className="num" style={{ fontWeight: 800 }} key={i}>{fmtM(y.net)}</td>)}
            <td className="num" style={{ fontWeight: 800, color: "var(--coral)" }}>{fmtM(sum((y) => y.net))}</td>
          </tr>
          <tr>
            <td>Cumulative net</td>
            {years.map((y, i) => <td className="num" key={i}>{fmtM(y.cumulativeNet)}</td>)}
            <td className="num" style={{ color: "var(--off)" }}>n/a</td>
          </tr>
          <tr>
            <td>Return on investment</td>
            {years.map((y, i) => <td className="num" key={i}>{y.roi.toFixed(1)}×</td>)}
            <td className="num" style={{ color: "var(--coral)" }}>{roi3.toFixed(1)}×</td>
          </tr>
        </tbody>
      </table>

      <div className="lbl" style={{ marginTop: 16, marginBottom: 9 }}>Deployment milestones</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${data.milestones.length},1fr)`, gap: 13 }}>
        {data.milestones.map((m) => (
          <div className="ms" key={m.label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="lbl">{m.label}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.45, marginTop: 7 }}>{m.body}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "auto", display: "flex", gap: 22, alignItems: "center", borderTop: "1px solid var(--hair)", paddingTop: 14 }}>
        <div style={{ flex: 1 }}>
          <span className="lbl">When value lands</span>
          <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6, marginTop: 6 }}>{data.whenValueLands}</div>
        </div>
        <div style={{ flex: 1 }}>
          <span className="lbl">The read</span>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.45, marginTop: 6 }}>{data.theRead}</div>
        </div>
      </div>
    </>
  );
}

// ───────────────────────── Page 4 · The investment case ─────────────────────────

function CashFlowCurve({ data }: { data: ProformaPdfData }): JSX.Element {
  const pts = data.cashFlow;
  if (pts.length === 0) return <svg viewBox="0 0 820 158" style={{ width: "100%" }} />;
  const months = Math.max(...pts.map((p) => p.month), 1);
  const maxPos = Math.max(...pts.map((p) => p.cumNet), 1);
  const minNeg = Math.min(...pts.map((p) => p.cumNet), 0);
  const x0 = 55, x1 = 800, topY = 16, baseY = 72; // baseY = break-even
  const xFor = (m: number) => x0 + (m / months) * (x1 - x0);
  const yFor = (v: number) => {
    if (v >= 0) return baseY - (v / maxPos) * (baseY - topY);
    const floor = 118;
    return minNeg < 0 ? baseY + (v / minNeg) * (floor - baseY) : baseY;
  };
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(p.month).toFixed(1)},${yFor(p.cumNet).toFixed(1)}`).join(" ");
  // payback = first month cumNet crosses to >= 0 after being negative
  let payback: number | null = null;
  let wasNeg = false;
  for (const p of pts) {
    if (p.cumNet < 0) wasNeg = true;
    if (wasNeg && p.cumNet >= 0 && payback === null) payback = p.month;
  }
  const pbX = payback != null ? xFor(payback) : null;
  const end = pts[pts.length - 1];
  return (
    <svg viewBox="0 0 820 158" style={{ width: "100%" }}>
      <line x1="40" y1={baseY} x2="800" y2={baseY} stroke="var(--hair)" strokeDasharray="4 3" />
      <text x="44" y={baseY - 6} fontSize="9" fill="var(--faint)">break-even</text>
      <path d={path} fill="none" stroke="var(--coral)" strokeWidth="2.6" />
      {pbX != null && (
        <>
          <circle cx={pbX} cy={baseY} r="4.5" fill="#fff" stroke="var(--coral)" strokeWidth="2.5" />
          <text x={pbX} y={baseY + 18} fontSize="10" fill="var(--muted)" textAnchor="middle">Month {payback}</text>
        </>
      )}
      <text x="800" y="12" fontSize="12" fill="var(--coral)" textAnchor="end" className="abr">+{fmtM(end.cumNet)}</text>
      <text x={x0} y="150" fontSize="9" fill="var(--faint)">Month 0</text>
      <text x="800" y="150" fontSize="9" fill="var(--faint)" textAnchor="end">Month {months}</text>
    </svg>
  );
}

function InvestmentInner({ data }: { data: ProformaPdfData }): JSX.Element {
  const years = data.years;
  const cell = (v: number) => (v === 0 ? "$0" : fmtMoney(v));
  return (
    <>
      <RunningHeader label={`The ${data.termYears}-year case · ${data.org}`} num="03" />
      <div className="eyebrow" style={{ marginTop: 16 }}>The investment case</div>
      <h2 className="chaptitle">What it costs, and how the case holds.</h2>

      <div className="lbl" style={{ marginTop: 18 }}>What it costs</div>
      <table className="tbl">
        <thead>
          <tr>
            <th>Pricing</th>
            {years.map((_, i) => <th key={i}>Year {i + 1}</th>)}
            <th>{data.termYears}-year</th>
          </tr>
        </thead>
        <tbody>
          {data.costRows.map((r) => (
            <tr key={r.label}>
              <td>{r.label}</td>
              {r.years.map((v, i) => <td className="num" key={i}>{cell(v)}</td>)}
              <td className="num">{cell(r.total)}</td>
            </tr>
          ))}
          <tr style={{ background: "#F4EEE6" }}>
            <td style={{ fontWeight: 800, color: "var(--label)" }}>{data.totalInvestmentRow.label}</td>
            {data.totalInvestmentRow.years.map((v, i) => <td className="num" style={{ fontWeight: 800 }} key={i}>{fmtM(v)}</td>)}
            <td className="num" style={{ fontWeight: 800 }}>{fmtM(data.totalInvestmentRow.total)}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 7, lineHeight: 1.45 }}>{data.costNote}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 24, marginTop: 20 }}>
        <div>
          <div className="lbl" style={{ marginBottom: 9 }}>How robust is the case</div>
          <table className="tbl" style={{ marginTop: 0 }}>
            <thead>
              <tr>
                <th></th>
                {data.scenarios.map((s) => <th key={s.name}>{s.name}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Realization</td>
                {data.scenarios.map((s) => <td className="num" key={s.name}>{s.realizationPct}%</td>)}
              </tr>
              <tr>
                <td>{data.termYears}-year net value</td>
                {data.scenarios.map((s) => <td className="num" key={s.name} style={s.highlight ? { color: "var(--coral)", fontWeight: 800 } : undefined}>{fmtM(s.net)}</td>)}
              </tr>
              <tr>
                <td>Return on investment</td>
                {data.scenarios.map((s) => <td className="num" key={s.name} style={s.highlight ? { color: "var(--coral)" } : undefined}>{s.roi.toFixed(1)}×</td>)}
              </tr>
              <tr>
                <td>Payback</td>
                {data.scenarios.map((s) => <td className="num" key={s.name} style={s.highlight ? { color: "var(--coral)" } : undefined}>{s.paybackLabel}</td>)}
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.45, marginTop: 10 }}>{data.scenarioNote}</div>
        </div>
        <div>
          <div className="lbl" style={{ marginBottom: 9 }}>Model inputs</div>
          <div style={{ border: "1px solid var(--hair)", borderRadius: 14, background: "var(--card)", padding: "6px 16px" }}>
            {data.modelInputs.map((m, i) => (
              <div key={m.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < data.modelInputs.length - 1 ? "1px solid var(--soft)" : "none", fontSize: 11.5 }}>
                <span style={{ color: "var(--muted)" }}>{m.label}</span>
                <span className="abr">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="lbl" style={{ marginBottom: 9 }}>Cumulative net cash flow · when the deal turns positive</div>
        <div style={{ border: "1px solid var(--hair)", borderRadius: 14, background: "var(--card)", padding: "14px 20px 8px" }}>
          <CashFlowCurve data={data} />
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="lbl" style={{ marginBottom: 6 }}>Where we held conservative</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 30px" }}>
          {data.heldConservative.map((h, i) => (
            <div className="held" key={i} style={i >= 2 ? { border: "none" } : undefined}>
              <span className="d" />
              <span style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
                <b style={{ color: "var(--label)", fontWeight: 700 }}>{h.title}</b> {h.body}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ───────────────────────── Pages 5..N · Setting drill-down ─────────────────────────

function estDriver(desc: string, chain?: string): number {
  const descLines = Math.max(1, Math.ceil((desc?.length ?? 0) / 95));
  const tiles = chain ? chain.replace(/\s*\|\s*/g, " × ").split(" × ").length + 1 : 2;
  const chainRows = Math.max(1, Math.ceil(tiles / 5));
  return 28 + descLines * 15 + chainRows * 44 + 12;
}

const RHEAD_H = 38;
const HEADER_FIRST = 112;
const HEADER_CONT = 54;
const DOMHEAD_H = 38;
const TRAILER_H = 246; // ramp + signals + margins
const PAGE_H = 982;

interface Atom {
  h: number;
  node: ReactNode;
}

function SettingHeader({ s }: { s: PfSetting }): JSX.Element {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span className="dot" style={{ background: s.color, width: 12, height: 12 }} />
            <span className="abr" style={{ fontSize: 28 }}>{s.label}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--faint)", marginTop: 5 }}>
            {s.pilotProviders} → {s.fullScaleProviders} {s.providerWord ?? "providers"} · ≈{fmtCount(s.encounters)} {s.encounterLabel} · go-live month {s.goLiveMonth} · run-rate at full utilization
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="abr" style={{ fontSize: 25, color: "var(--coral)" }}>{fmtM(s.atScaleValue)}</div>
          <div style={{ fontSize: 9, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800 }}>per year</div>
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, marginTop: 13, maxWidth: 660 }}>{s.narrative}</p>
    </>
  );
}

function SettingTrailer({ s }: { s: PfSetting }): JSX.Element {
  const maxVal = Math.max(...s.ramp.map((r) => r.value), 1);
  return (
    <>
      <div style={{ marginTop: 34 }}>
        <div className="lbl" style={{ marginBottom: 11 }}>This setting over the term</div>
        {s.ramp.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "24px 0", borderBottom: i < s.ramp.length - 1 ? "1px solid var(--soft)" : "none" }}>
            <span style={{ width: 54, fontSize: 12, color: "var(--muted)" }}>Year {r.year}</span>
            <div style={{ flex: 1, height: 22, background: "var(--soft)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: `${(r.value / maxVal) * 100}%`, height: "100%", background: "var(--coral)" }} />
            </div>
            <span className="abr" style={{ width: 58, textAlign: "right", fontSize: 15 }}>{fmtM(r.value)}</span>
            <span style={{ width: 210, fontSize: 11, color: "var(--faint)", textAlign: "right" }}>{r.providers} providers · {r.utilization}% utilization</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 36 }}>
        <div className="lbl" style={{ marginBottom: 9 }}>Signals to track · quality, not counted</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 30px" }}>
          {s.signals.map((sig, i) => (
            <div className="sig" key={i} style={i >= 2 ? { border: "none" } : undefined}>
              <span className="d" /><span style={{ fontSize: 12, color: "var(--muted)" }}>{sig}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/** Build the (possibly multiple) inner nodes for one care setting's drill-down. */
function buildSettingInner(s: PfSetting, chapterNum: string): ReactNode[] {
  const atoms: Atom[] = [];
  for (const dom of s.domains) {
    // When a domain has a single driver, the domain total and the driver value
    // are identical; showing both stacks the same number twice. Suppress the
    // per-driver value in that case and let the domain header carry it.
    const single = dom.drivers.length === 1;
    dom.drivers.forEach((d, idx) => {
      const isFirst = idx === 0;
      atoms.push({
        h: (isFirst ? DOMHEAD_H : 0) + estDriver(d.desc, d.chain),
        node: (
          <div>
            {isFirst && (
              <div className="domhead">
                <div className="dompill">
                  <span className="dot" style={{ background: DOMAIN_COLOR[dom.key] }} />
                  <span className="p" style={{ color: DOMAIN_INK }}>{dom.key}</span>
                </div>
                <span className="domtot">{fmtMoney(dom.total)}</span>
              </div>
            )}
            <div className="drv">
              <span className="nm">{d.label}</span>
              {!single && <span className="vl">{fmtMoney(d.value)}</span>}
            </div>
            <div className="dsc">{d.desc}</div>
            <Chain chain={d.chain} value={d.value} />
          </div>
        ),
      });
    });
  }

  // Greedy pack driver atoms into pages honoring the height budget.
  const pages: Atom[][] = [[]];
  let used = 0;
  let budget = PAGE_H - RHEAD_H - HEADER_FIRST;
  for (const a of atoms) {
    if (used + a.h > budget && pages[pages.length - 1].length > 0) {
      pages.push([]);
      used = 0;
      budget = PAGE_H - RHEAD_H - HEADER_CONT;
    }
    pages[pages.length - 1].push(a);
    used += a.h;
  }
  // Place the trailer (ramp + signals): on the last driver page if it fits,
  // otherwise on its own continuation page.
  let trailerOwnPage = false;
  if (budget - used < TRAILER_H) trailerOwnPage = true;

  const totalPages = pages.length + (trailerOwnPage ? 1 : 0);
  const nodes: ReactNode[] = pages.map((pageAtoms, pi) => {
    const isFirst = pi === 0;
    const isTrailerHere = !trailerOwnPage && pi === pages.length - 1;
    return (
      <Fragment key={pi}>
        <RunningHeader label="Care setting, in detail" num={chapterNum} />
        {isFirst ? (
          <SettingHeader s={s} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 16 }}>
            <span className="dot" style={{ background: s.color, width: 12, height: 12 }} />
            <span className="abr" style={{ fontSize: 22 }}>{s.label}</span>
            <span style={{ fontSize: 12, color: "var(--off)" }}>(continued)</span>
          </div>
        )}
        {pageAtoms.map((a, i) => <div key={i}>{a.node}</div>)}
        {isTrailerHere && <SettingTrailer s={s} />}
      </Fragment>
    );
  });
  if (trailerOwnPage) {
    nodes.push(
      <Fragment key="trailer">
        <RunningHeader label="Care setting, in detail" num={chapterNum} />
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 16 }}>
          <span className="dot" style={{ background: s.color, width: 12, height: 12 }} />
          <span className="abr" style={{ fontSize: 22 }}>{s.label}</span>
          <span style={{ fontSize: 12, color: "var(--off)" }}>(continued)</span>
        </div>
        <SettingTrailer s={s} />
      </Fragment>,
    );
  }
  void totalPages;
  return nodes;
}

// ───────────────────────── Last page · Closing ─────────────────────────

function ClosingInner({ data, num }: { data: ProformaPdfData; num: string }): JSX.Element {
  return (
    <>
      <RunningHeader label="The number is yours" num={num} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div className="eyebrow">The number is yours</div>
        <h2 className="abr" style={{ fontSize: 36, lineHeight: 1.14, marginTop: 14, maxWidth: 640 }}>{data.closingStatement}</h2>

        <div className="lbl" style={{ marginTop: 40, marginBottom: 6, color: "var(--label)" }}>How we prove it, together</div>
        {data.proofSteps.map((st, i) => (
          <div className="step" key={i}>
            <span className="stepn">{i + 1}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{st.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--faint)", marginTop: 2 }}>{st.body}</div>
            </div>
          </div>
        ))}

        <div style={{ border: "1.5px solid var(--coral)", borderRadius: 18, background: "#FEF6F3", padding: "22px 26px", marginTop: 30 }}>
          <div className="abr" style={{ fontSize: 20, color: "var(--ink)", lineHeight: 1.3 }}>{data.handoff}</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px solid var(--hair)", paddingTop: 16 }}>
        <div style={{ fontSize: 11, color: "var(--faint)" }}>Prepared for {data.org} · {data.date} · Confidential</div>
        <span className="abr" style={{ fontSize: 20, color: "var(--coral)" }}>ABRIDGE</span>
      </div>
    </>
  );
}

// ───────────────────────── Document ─────────────────────────

export function ProformaEditorialPdfDocument({ data }: { data: ProformaPdfData }): JSX.Element {
  // Assemble the setting drill-down pages first so we know the total count.
  const settingNodes: ReactNode[] = [];
  data.settings.forEach((s, i) => {
    buildSettingInner(s, pad2(4 + i)).forEach((n) => settingNodes.push(n));
  });
  const closingNum = pad2(4 + data.settings.length);

  const total = 2 /*report cover + pitch*/ + 3 /*case,howvalue,investment*/ + settingNodes.length + 1 /*closing*/;
  const pg = (n: number) => `Abridge · Financial Proforma · ${n} of ${total}`;
  let p = 1;

  const reportCoverPg = p++; // page 1 (front matter, no footer number)
  const pitchPg = p++; // page 2 (front matter, no footer number)
  const casePg = p++;
  const howPg = p++;
  const invPg = p++;
  void reportCoverPg;
  void pitchPg;

  return (
    <div className="pf">
      <style>{CSS}</style>
      <ReportCover data={data} />
      <Sheet><CoverInner data={data} /></Sheet>
      <Sheet pgnum={pg(casePg)}><CaseInner data={data} /></Sheet>
      <Sheet pgnum={pg(howPg)}><HowValueInner data={data} /></Sheet>
      <Sheet pgnum={pg(invPg)}><InvestmentInner data={data} /></Sheet>
      {settingNodes.map((n, i) => (
        <Sheet key={i} pgnum={pg(p++)}>{n}</Sheet>
      ))}
      <Sheet pgnum={pg(p++)}><ClosingInner data={data} num={closingNum} /></Sheet>
    </div>
  );
}

// ───────────────────────── Sample data (matches the mock) ─────────────────────────

export const SAMPLE_PROFORMA_PDF_DATA: ProformaPdfData = {
  org: "Deaconess Health System",
  date: "July 2026",
  termNet: 2650000,
  termYears: 3,
  roi: 2.2,
  paybackMonth: 14,
  runRateValue: 2010000,
  settings: [
    {
      id: "outpatient-1",
      label: "Outpatient",
      color: PF_SETTING_COLORS[0],
      pilotProviders: 120,
      fullScaleProviders: 240,
      encounters: 210000,
      goLiveMonth: 1,
      atScaleValue: 1460000,
      encounterLabel: "encounters / yr",
      narrative:
        "Outpatient is where the case is won: the highest volume, the richest documentation-driven revenue, and the most provider time to give back.",
      domains: [
        {
          key: "Revenue",
          total: 731000,
          drivers: [
            {
              label: "wRVU capture",
              value: 412000,
              desc: "Complete documentation lifts the coded acuity of visits already delivered, recovering wRVUs that thin notes leave on the table.",
              chain: "184,000 wRVUs / yr × 1.8% recovery × $124 per wRVU",
            },
            {
              label: "HCC recapture",
              value: 319000,
              desc: "Chronic conditions surfaced and documented at the visit raise risk-adjustment accuracy for the Medicare Advantage panel.",
              chain: "18,000 MA members × 0.125 HCC / life × $283 per HCC × 50% realization",
            },
          ],
        },
        {
          key: "Capacity",
          total: 549000,
          drivers: [
            {
              label: "Patient access",
              value: 549000,
              desc: "Time returned from after-hours charting reopens visit slots, adding contribution margin at the current no-show adjusted rate.",
              chain: "3,210 added visits × $228 margin / visit × 75% realization",
            },
          ],
        },
        {
          key: "Workforce",
          total: 180000,
          drivers: [
            {
              label: "Provider wellbeing",
              value: 180000,
              desc: "Lower documentation burden reduces the turnover risk that carries real recruiting and lost-productivity cost.",
              chain: "240 providers × $3,000 turnover-risk value × 25% attribution",
            },
          ],
        },
      ],
      ramp: [
        { year: 1, value: 850000, providers: 160, utilization: 55 },
        { year: 2, value: 1350000, providers: 220, utilization: 80 },
        { year: 3, value: 1460000, providers: 240, utilization: 95 },
      ],
      signals: [
        "Time in note, weekly per provider",
        "Same-day chart closure rate",
        "HCC capture completeness",
        "Provider-reported burnout",
      ],
    },
    {
      id: "ed-1",
      label: "Emergency",
      color: PF_SETTING_COLORS[1],
      pilotProviders: 80,
      fullScaleProviders: 110,
      encounters: 142000,
      goLiveMonth: 4,
      atScaleValue: 550000,
      encounterLabel: "ED visits / yr",
      narrative:
        "Emergency stacks onto the case in year one: faster throughput protects revenue that otherwise walks out the door, and a hard-to-staff team gets time back.",
      domains: [
        {
          key: "Revenue",
          total: 390000,
          drivers: [
            {
              label: "LWBS recovery",
              value: 210000,
              desc: "Faster documentation shortens throughput, so fewer patients leave without being seen and their care is retained.",
              chain: "142,000 ED visits / yr × 1.1% LWBS avoided × $134 margin / visit",
            },
            {
              label: "Admission documentation",
              value: 180000,
              desc: "Complete ED notes support the medical necessity and acuity of admissions, protecting earned inpatient revenue.",
              chain: "9,400 admissions / yr × $256 uplift / admit × 7.5% realization",
            },
          ],
        },
        {
          key: "Capacity",
          total: 95000,
          drivers: [
            {
              label: "Throughput, freed clinician time",
              value: 95000,
              desc: "Time returned to clinicians during the shift adds usable capacity at the department's contribution rate per hour.",
              chain: "1,900 freed hours / yr × $50 contribution / hr",
            },
          ],
        },
        {
          key: "Workforce",
          total: 65000,
          drivers: [
            {
              label: "Provider wellbeing",
              value: 65000,
              desc: "Reduced charting load lowers burnout-driven turnover risk among a hard-to-staff emergency workforce.",
              chain: "110 providers × $2,364 turnover-risk value × 25% attribution",
            },
          ],
        },
      ],
      ramp: [
        { year: 1, value: 170000, providers: 60, utilization: 40 },
        { year: 2, value: 550000, providers: 100, utilization: 80 },
        { year: 3, value: 550000, providers: 110, utilization: 95 },
      ],
      signals: [
        "Left-without-being-seen rate",
        "Door-to-provider time",
        "Admission documentation completeness",
        "Provider-reported burnout",
      ],
    },
  ],
  operation: [
    { label: "Providers at scale", value: "350" },
    { label: "Encounters / yr", value: "≈352K" },
    { label: "MA members", value: "18,000" },
    { label: "Utilization at scale", value: "95%" },
    { label: "Clinician hrs returned", value: "≈48K" },
  ],
  domainTiles: [
    { key: "Revenue", value: 1121000, pct: 56, counted: true, northStar: "Documentation that captures the acuity and services already delivered, so earned revenue is not lost to thin notes." },
    { key: "Capacity", value: 644000, pct: 32, counted: true, northStar: "Clinician hours returned from after-hours charting to patient care and added access." },
    { key: "Workforce", value: 245000, pct: 12, counted: true, northStar: "Turnover risk reduced as the documentation burden that drives burnout comes down." },
    { key: "Quality", value: 0, pct: 0, counted: false, northStar: "Safety and experience signals we monitor with you, but deliberately leave out of the dollar case." },
  ],
  thesis:
    "Outpatient carries the case on documentation-driven revenue and freed provider time; Emergency stacks on in year one as it goes live. The investment is front-loaded while teams ramp, and the return compounds as adoption deepens and the second setting matures.",
  years: [
    { perSetting: [{ id: "outpatient-1", value: 850000 }, { id: "ed-1", value: 170000 }], total: 1020000, revenue: 640000, capacity: 290000, workforce: 90000, quality: 0, investment: 800000, net: 220000, cumulativeNet: 220000, roi: 1.3 },
    { perSetting: [{ id: "outpatient-1", value: 1350000 }, { id: "ed-1", value: 550000 }], total: 1900000, revenue: 1080000, capacity: 640000, workforce: 180000, quality: 0, investment: 740000, net: 1160000, cumulativeNet: 1380000, roi: 1.9 },
    { perSetting: [{ id: "outpatient-1", value: 1460000 }, { id: "ed-1", value: 550000 }], total: 2010000, revenue: 1120000, capacity: 640000, workforce: 250000, quality: 0, investment: 740000, net: 1270000, cumulativeNet: 2650000, roi: 2.2 },
  ],
  milestones: [
    { label: "Year 1 · Foundation", body: "220 providers live · 180K encounters documented · both settings ramping." },
    { label: "Year 2 · Scaling", body: "320 providers · 310K encounters · Emergency matured, adoption deep." },
    { label: "Year 3 · Maturity", body: "350 providers · 352K encounters · full scale at a $2.01M run-rate." },
  ],
  whenValueLands:
    "Revenue from month 1 · Capacity from month 3 · Quality signals from month 3 · Workforce phased 35% / 75% / 100% across years 1 to 3.",
  theRead:
    "Year one is the investment year while teams ramp; payback lands in month 14 once Emergency is live. From there the case compounds to $2.65M net.",
  costRows: [
    { label: "Per active provider, annual", years: [740000, 740000, 740000], total: 2220000 },
    { label: "Implementation, one-time", years: [60000, 0, 0], total: 60000 },
  ],
  totalInvestmentRow: { label: "Total investment", years: [800000, 740000, 740000], total: 2280000 },
  costNote:
    "Blended rate ≈ $2,250 / provider / year across both settings. Cost displacement from retired tooling is modeled separately in App Rationalization and deliberately excluded from this return.",
  scenarios: [
    { name: "Conservative", realizationPct: 70, net: 1170000, roi: 1.5, paybackLabel: "Mo 19" },
    { name: "Base", realizationPct: 100, net: 2650000, roi: 2.2, paybackLabel: "Mo 14", highlight: true },
    { name: "Optimistic", realizationPct: 130, net: 4130000, roi: 2.8, paybackLabel: "Mo 11" },
  ],
  scenarioNote:
    "Flex realization by ±30% and even the conservative case clears its cost several times over. The base sits between the two, with room on either side as adoption runs behind or ahead of plan.",
  modelInputs: [
    { label: "Contract term", value: "36 months" },
    { label: "Implementation ramp", value: "3 months" },
    { label: "Utilization at scale", value: "95%" },
    { label: "Workforce phasing", value: "35 / 75 / 100%" },
    { label: "Value onset", value: "Rev M1 · Cap M3" },
    { label: "Sensitivity range", value: "±30%" },
  ],
  cashFlow: buildSampleCashFlow(2650000, 14, 36, 100000),
  heldConservative: [
    { title: "Margin, not charges.", body: "Value is contribution margin, not gross billing." },
    { title: "Attribution only.", body: "We count the lift attributed to Abridge, not the whole team's work." },
    { title: "Ramp modeled.", body: "Value is delayed while adoption builds, not switched on day one." },
    { title: "Quality left uncounted.", body: "Real signals are tracked, but kept out of the dollars." },
  ],
  closingStatement:
    "Every figure here is your own volume and economics, yours to verify, and ours to prove alongside you.",
  proofSteps: [
    { title: "Instrument the signals in your EHR", body: "The same drivers in this model, wired to live EHR signals, no new reporting burden." },
    { title: "Measure the before, then the after", body: "A clean baseline so the lift is yours, not a benchmark." },
    { title: "Report attainment every quarter", body: "Track the case against reality, and adjust the deal as the numbers land." },
  ],
  handoff:
    "Next, we build the attainment plan together in Value Attainment, the signals, owners, and dates that turn this model into measured results.",
};

/**
 * A plausible cumulative-net curve that ends exactly at `termNet` and crosses
 * break-even at `payback`. Used by the SAMPLE and as a fallback when the live
 * engine hasn't supplied real monthly points. Monotone after the trough.
 */
export function buildSampleCashFlow(termNet: number, payback: number, months: number, month0Outlay: number): PfCashPoint[] {
  const pts: PfCashPoint[] = [];
  const troughMonth = Math.max(1, Math.round(payback * 0.45));
  const troughVal = -Math.abs(month0Outlay) * 2.4;
  for (let m = 0; m <= months; m++) {
    let v: number;
    if (m <= troughMonth) {
      v = -Math.abs(month0Outlay) + (troughVal + Math.abs(month0Outlay)) * (m / troughMonth);
    } else if (m <= payback) {
      v = troughVal + (0 - troughVal) * ((m - troughMonth) / (payback - troughMonth));
    } else {
      v = (termNet) * ((m - payback) / (months - payback));
    }
    pts.push({ month: m, cumNet: Math.round(v) });
  }
  return pts;
}
