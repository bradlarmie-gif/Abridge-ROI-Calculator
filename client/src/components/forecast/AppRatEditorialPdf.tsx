import { type CSSProperties, type ReactNode } from "react";
import abridgeLogoRed from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import abridgeSymbol from "@assets/abridge-logo-symbol_1774906992195.png";
import {
  type AppRatItem,
  itemRetired,
  itemStays,
  itemDisplayName,
  categoryLabel,
  renewalDateLabel,
  computeNet,
  timingSummary,
} from "@/lib/appRationalizationCalc";
import { buildConsolidationModel } from "@/components/forecast/ArConsolidationView";

// ────────────────────────────────────────────────────────────────
// Editorial "App Rationalization" print-to-PDF document. HTML-print
// sibling of ExploreEditorialPdf / ProformaEditorialPdf, so all four
// tool PDFs share one engine and open identically: report cover (p1),
// the pitch (p2), then the body. Pure function of `data`.
// ────────────────────────────────────────────────────────────────

export const APP_RAT_PDF_STORAGE_KEY = "abridge:apprat-pdf-data";

export interface AppRatPdfData {
  orgName: string;
  date: string;
  abridgePrice: number;
  items: AppRatItem[];
}

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

const TAN = ["#D8C7AE", "#CDB99C", "#C2AB8A", "#B79D78"];

function fmtFull(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}
function fmtShort(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

const sEyebrow: CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: C.coral };
const sLbl: CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: C.faint };
const sLead: CSSProperties = { fontSize: 13.5, color: C.muted, lineHeight: 1.5, marginTop: 8, maxWidth: 620 };
const sRule: CSSProperties = { height: 1, background: C.hair, width: "100%" };

// ───────────────────────── Shell ─────────────────────────

function Page({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div style={{ width: 816, height: 1056, background: C.page, breakAfter: "page", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, padding: "44px 60px 32px", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

function RunningHeader({ org }: { org: string }): JSX.Element {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <span className="font-abridge" style={{ fontSize: 20, color: C.coral }}>ABRIDGE</span>
          <span style={{ width: 1, height: 19, background: C.hair }} />
          <span style={sLbl}>App Rationalization</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="font-abridge" style={{ fontSize: 17 }}>{org}</div>
          <div style={{ fontSize: 12, color: C.faint }}>Tech consolidation</div>
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

function SectionEyebrow({ num, title }: { num: string; title: string }): JSX.Element {
  return (
    <div style={{ ...sEyebrow, marginTop: 20 }}>
      <span style={{ color: C.off }}>{num}</span> · {title}
    </div>
  );
}

// ───────────────────────── Page 1 · Report cover ─────────────────────────

function ReportCover({ data }: { data: AppRatPdfData }): JSX.Element {
  const model = buildConsolidationModel(data.items);
  const subtitle = `${model.vendorCount} ${model.vendorCount === 1 ? "tool" : "tools"} · ${fmtShort(model.stackTotal)} / yr documentation spend`;
  return (
    <div style={{ width: 816, height: 1056, background: "#FFFFFF", breakAfter: "page", position: "relative", overflow: "hidden" }}>
      <img src={abridgeLogoRed} alt="Abridge" style={{ position: "absolute", top: 60, left: 64, width: 120 }} />
      <img src={abridgeSymbol} alt="" style={{ position: "absolute", bottom: 92, right: 10, width: 340, opacity: 0.06 }} />
      <div style={{ position: "absolute", inset: 0, padding: "0 64px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 11, color: "#666666", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 16 }}>
          App Rationalization
        </div>
        <h1 className="font-abridge" style={{ fontSize: 48, lineHeight: 1.12, color: "#1A1A1A", letterSpacing: "-0.5px", margin: "0 0 20px", maxWidth: 620 }}>
          {data.orgName || "Prospective partner"}
        </h1>
        <div style={{ width: 80, height: 3, background: C.coral, marginBottom: 24 }} />
        <div style={{ fontSize: 17, color: "#666666", marginBottom: 44 }}>{subtitle}</div>
        <div style={{ fontSize: 10, color: "#999999", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>Prepared by</div>
        <div style={{ fontSize: 14, color: "#666666" }}>Abridge · {data.date}</div>
      </div>
      <div style={{ position: "absolute", bottom: 44, left: 64, right: 64, borderTop: "1px solid #E0E0E0", paddingTop: 12 }}>
        <div style={{ fontSize: 10.5, color: "#999999", lineHeight: 1.5 }}>
          Figures are directional estimates built from the tools and annual spend you entered. Actual savings depend on
          your contracts, adoption, and workflow. Not a commitment or guarantee of savings.
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Page 2 · The pitch ─────────────────────────

function PitchPage({ data }: { data: AppRatPdfData }): JSX.Element {
  const model = buildConsolidationModel(data.items);
  const summary = timingSummary(data.items);
  const remaining = model.rows.filter((r) => r.stays > 0).length;
  const consolidatedBy = model.freed > 0 ? (summary.planFinishMonths > 0 ? renewalDateLabel(summary.planFinishMonths) : "now") : "n/a";
  const toc = [
    { n: "01", t: "The stack of record" },
    { n: "02", t: "The consolidation" },
    { n: "03", t: "When it lands" },
    { n: "04", t: "Why only Abridge" },
  ];
  return (
    <Page>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="font-abridge" style={{ fontSize: 20, color: C.coral }}>ABRIDGE</span>
        <span style={sLbl}>App Rationalization</span>
      </div>
      <div style={{ marginTop: 128 }}>
        <div style={sEyebrow}>The consolidation case</div>
        <h2 className="font-abridge" style={{ fontSize: 44, lineHeight: 1.06, color: C.ink, margin: "10px 0 0", maxWidth: 680, letterSpacing: "-0.5px" }}>
          {fmtShort(model.freed)} a year folds back onto the Abridge you already run.
        </h2>
        <div style={{ ...sLead, marginTop: 16, maxWidth: 600 }}>
          Your documentation stack, priced on the tools and spend you entered. What Abridge can take on comes back; the
          rest stays. Not a commitment, and not a list price.
        </div>
      </div>
      <div style={{ ...sRule, margin: "30px 0 22px" }} />
      <div style={{ display: "flex", gap: 56 }}>
        {[
          { v: fmtShort(model.stackTotal), k: "Documentation spend today", coral: false },
          { v: fmtShort(model.freed), k: "Freed every year", coral: true },
          { v: `${model.vendorCount} → ${remaining}`, k: "Vendors on your bill", coral: false },
          { v: consolidatedBy, k: "Fully consolidated", coral: false },
        ].map((s, i) => (
          <div key={i}>
            <div className="font-abridge" style={{ fontSize: 30, lineHeight: 1, color: s.coral ? C.coral : C.ink }}>{s.v}</div>
            <div style={{ ...sLbl, marginTop: 7 }}>{s.k}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "auto" }}>
        <div style={{ ...sLbl, marginBottom: 6 }}>Inside this plan</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 44 }}>
          {toc.map((r) => (
            <div key={r.n} style={{ display: "flex", gap: 14, alignItems: "baseline", padding: "12px 0", borderTop: `1px solid ${C.hair}` }}>
              <span className="font-abridge" style={{ fontSize: 13, color: C.off }}>{r.n}</span>
              <span style={{ fontSize: 14, color: C.label }}>{r.t}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 20 }}>
        <div style={{ ...sRule, marginBottom: 9 }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: C.faint }}>Prepared for {data.orgName || "your team"} · {data.date}</span>
          <span style={sLbl}>Confidential</span>
        </div>
      </div>
    </Page>
  );
}

// ───────────────────────── Page 3 · The stack of record ─────────────────────────

function StackPage({ data }: { data: AppRatPdfData }): JSX.Element {
  const rows = data.items.filter((i) => (i.annualSpend || 0) > 0);
  const totalSpend = rows.reduce((a, i) => a + (i.annualSpend || 0), 0);
  const totalFreed = rows.reduce((a, i) => a + itemRetired(i), 0);
  const totalStays = rows.reduce((a, i) => a + itemStays(i), 0);
  const overallPct = totalSpend > 0 ? Math.round((totalFreed / totalSpend) * 100) : 0;
  const cols: [number, CSSProperties["textAlign"]][] = [[2.0, "left"], [1.7, "left"], [1.25, "right"], [0.8, "right"], [1.2, "right"], [1.2, "right"], [1.05, "right"]];
  const th = ["Vendor", "Capability", "Annual spend", "Cov.", "Freed", "Stays", "Renewal"];
  return (
    <Page>
      <RunningHeader org={data.orgName} />
      <SectionEyebrow num="01" title="The stack of record" />
      <h2 className="font-abridge" style={{ fontSize: 27, color: C.ink, marginTop: 7, lineHeight: 1.06 }}>
        Everything you run around the note, in one place.
      </h2>
      <div style={{ ...sLead }}>
        The authoritative list, built only from the tools and annual spend you entered. Freed is the share Abridge can
        take on; stays is the residual that remains.
      </div>
      <div style={{ marginTop: 22, border: `1px solid ${C.hair}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", background: C.tile, padding: "10px 16px" }}>
          {th.map((t, i) => (
            <span key={i} style={{ ...sLbl, fontSize: 9, flex: cols[i][0], textAlign: cols[i][1] }}>{t}</span>
          ))}
        </div>
        {rows.map((it, i) => {
          const freed = itemRetired(it);
          const staysOnly = freed === 0;
          return (
            <div key={it.id} style={{ display: "flex", alignItems: "center", padding: "10px 16px", background: i % 2 ? C.card : "#fff", borderTop: `1px solid ${C.soft}` }}>
              <span style={{ flex: cols[0][0], display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                <span style={{ width: 3, height: 22, borderRadius: 2, background: staysOnly ? C.off : TAN[i % TAN.length], flexShrink: 0 }} />
                <span className="font-abridge" style={{ fontSize: 13, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{itemDisplayName(it)}</span>
              </span>
              <span style={{ flex: cols[1][0], fontSize: 12, color: C.faint }}>{categoryLabel(it.category)}</span>
              <span style={{ flex: cols[2][0], textAlign: "right", fontSize: 12.5, color: C.ink }}>{fmtFull(it.annualSpend)}</span>
              <span style={{ flex: cols[3][0], textAlign: "right", fontSize: 12, color: C.faint }}>{it.coveragePct}%</span>
              <span style={{ flex: cols[4][0], textAlign: "right", fontSize: 12.5, color: freed > 0 ? C.coral : C.faint }}>{freed > 0 ? fmtFull(freed) : "$0"}</span>
              <span style={{ flex: cols[5][0], textAlign: "right", fontSize: 12.5, color: C.faint }}>{fmtFull(itemStays(it))}</span>
              <span style={{ flex: cols[6][0], textAlign: "right", fontSize: 11.5, color: C.faint }}>{renewalDateLabel(it.contractMonths)}</span>
            </div>
          );
        })}
        <div style={{ display: "flex", alignItems: "center", padding: "11px 16px", background: C.tile, borderTop: `1px solid ${C.hair}` }}>
          <span className="font-abridge" style={{ flex: cols[0][0], fontSize: 13, color: C.ink }}>Total</span>
          <span style={{ flex: cols[1][0], fontSize: 12, color: C.faint }}>{rows.length} {rows.length === 1 ? "vendor" : "vendors"}</span>
          <span className="font-abridge" style={{ flex: cols[2][0], textAlign: "right", fontSize: 13, color: C.ink }}>{fmtFull(totalSpend)}</span>
          <span style={{ flex: cols[3][0], textAlign: "right", fontSize: 12, color: C.faint }}>{overallPct}%</span>
          <span className="font-abridge" style={{ flex: cols[4][0], textAlign: "right", fontSize: 13, color: C.coral }}>{fmtFull(totalFreed)}</span>
          <span style={{ flex: cols[5][0], textAlign: "right", fontSize: 12.5, color: C.faint }}>{fmtFull(totalStays)}</span>
          <span style={{ flex: cols[6][0] }} />
        </div>
      </div>
      <Footer note="Figures use only the tools and annual spend you entered. For planning purposes, not a guarantee of savings." num="01" />
    </Page>
  );
}

// ───────────────────────── Page 4 · The consolidation ─────────────────────────

function ConsolidationPage({ data }: { data: AppRatPdfData }): JSX.Element {
  const model = buildConsolidationModel(data.items);
  const freedPct = model.stackTotal > 0 ? (model.freed / model.stackTotal) * 100 : 0;
  return (
    <Page>
      <RunningHeader org={data.orgName} />
      <SectionEyebrow num="02" title="The consolidation" />
      <h2 className="font-abridge" style={{ fontSize: 27, color: C.ink, marginTop: 7, lineHeight: 1.06 }}>
        What folds onto Abridge, and what stays.
      </h2>

      <div style={{ ...sLbl, marginTop: 30, marginBottom: 10 }}>Your documentation stack today · {fmtShort(model.stackTotal)} / yr</div>
      <div style={{ display: "flex", height: 46, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.hair}` }}>
        {model.rows.map((r, i) => (
          <div key={r.id} title={r.name} style={{ width: `${r.widthPct}%`, background: TAN[i % TAN.length], display: "flex", alignItems: "center", justifyContent: "center", borderRight: i < model.rows.length - 1 ? "1px solid rgba(255,255,255,.5)" : "none" }}>
            <span style={{ fontSize: 9.5, color: "#4A3F30", fontWeight: 700, padding: "0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
          </div>
        ))}
      </div>

      <div style={{ ...sLbl, marginTop: 34, marginBottom: 10 }}>Where it lands</div>
      <div style={{ display: "flex", height: 46, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.hair}` }}>
        <div style={{ width: `${freedPct}%`, background: C.coral, display: "flex", alignItems: "center", paddingLeft: 14 }}>
          <span className="font-abridge" style={{ fontSize: 15, color: "#fff" }}>{fmtShort(model.freed)}</span>
        </div>
        <div style={{ flex: 1, background: C.tile, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 14 }}>
          <span className="font-abridge" style={{ fontSize: 15, color: C.label }}>{fmtShort(model.stays)}</span>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ ...sLbl, color: C.coral }}>Onto Abridge · freed every year</span>
        <span style={sLbl}>Stays on your bill</span>
      </div>

      <div style={{ ...sLbl, marginTop: 34, marginBottom: 12 }}>Freed, tool by tool</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 40, rowGap: 2 }}>
        {model.rows.filter((r) => r.retired > 0).map((r, i) => (
          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "9px 0", borderBottom: `1px solid ${C.soft}` }}>
            <span style={{ fontSize: 12.5, color: C.label, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: TAN[i % TAN.length] }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
            </span>
            <span className="font-abridge" style={{ fontSize: 13, color: C.coral, flexShrink: 0 }}>{fmtShort(r.retired)}</span>
          </div>
        ))}
      </div>
      <Footer note="Freed is the coverage share you set for each tool times its annual spend. Displacement is not a commitment." num="02" />
    </Page>
  );
}

// ───────────────────────── Page 5 · When it lands · Why only Abridge ─────────────────────────

function TimingMoatPage({ data }: { data: AppRatPdfData }): JSX.Element {
  const summary = timingSummary(data.items);
  const net = computeNet(data.items, data.abridgePrice);
  const savers = data.items.filter((i) => itemRetired(i) > 0).sort((a, b) => a.sunsetMonths - b.sunsetMonths);
  const stats = [
    { v: fmtShort(net.sunset), k: "Freed at full consolidation", coral: true },
    { v: summary.planFinishMonths > 0 ? renewalDateLabel(summary.planFinishMonths) : "now", k: "Fully consolidated", coral: false },
    { v: summary.monthsSooner > 0 ? `${summary.monthsSooner} mo` : "on renewal", k: "Sooner than renewal", coral: false },
  ];
  return (
    <Page>
      <RunningHeader org={data.orgName} />
      <SectionEyebrow num="03" title="When it lands" />
      <h2 className="font-abridge" style={{ fontSize: 27, color: C.ink, marginTop: 7, lineHeight: 1.06 }}>
        The runway, and how fast the spend comes back.
      </h2>
      <div style={{ display: "flex", gap: 56, marginTop: 22 }}>
        {stats.map((s, i) => (
          <div key={i}>
            <div className="font-abridge" style={{ fontSize: 28, lineHeight: 1, color: s.coral ? C.coral : C.ink }}>{s.v}</div>
            <div style={{ ...sLbl, marginTop: 7 }}>{s.k}</div>
          </div>
        ))}
      </div>

      <div style={{ ...sLbl, marginTop: 30, marginBottom: 8 }}>Each tool&rsquo;s sunset</div>
      <div>
        {savers.map((it, i) => (
          <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "9px 0", borderBottom: `1px solid ${C.soft}` }}>
            <span style={{ fontSize: 13, color: C.label, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{itemDisplayName(it)}</span>
            <span style={{ display: "flex", gap: 26, alignItems: "baseline", flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: C.faint }}>sunsets {renewalDateLabel(it.sunsetMonths)}</span>
              <span className="font-abridge" style={{ fontSize: 13, color: C.coral, width: 68, textAlign: "right" }}>{fmtShort(itemRetired(it))} / yr</span>
            </span>
          </div>
        ))}
        {savers.length === 0 && <div style={{ fontSize: 12.5, color: C.faint, padding: "10px 0" }}>No tools set to displace yet.</div>}
      </div>
      {summary.gatingToolName && (
        <div style={{ fontSize: 12, color: C.faint, marginTop: 12 }}>
          The finish line is gated by {summary.gatingToolName}, the latest contract to run out.
        </div>
      )}

      <div style={{ marginTop: 34, background: C.card, border: `1px solid ${C.hair}`, borderRadius: 12, padding: "20px 22px" }}>
        <div style={sEyebrow}>04 · Why only Abridge</div>
        <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.55, marginTop: 8 }}>
          These tools each own one slice of the note. Abridge already sits in the encounter, so the capabilities you pay
          separate vendors for can fold onto the platform you run, one contract at a time as each renews. Consolidation
          expands over time; this is not a commitment.
        </div>
      </div>
      <Footer note="An estimate built from the figures you entered, not a guarantee. Contracts and adoption set the real pace." num="03" />
    </Page>
  );
}

// ───────────────────────── Document ─────────────────────────

export function AppRatEditorialPdfDocument({ data }: { data: AppRatPdfData }): JSX.Element {
  return (
    <div className="apprat-pdf-root">
      <style>{`@page { size: Letter; margin: 0; } @media print { body { margin: 0; } }`}</style>
      <ReportCover data={data} />
      <PitchPage data={data} />
      <StackPage data={data} />
      <ConsolidationPage data={data} />
      <TimingMoatPage data={data} />
    </div>
  );
}

// ───────────────────────── Sample data ─────────────────────────

export const SAMPLE_APPRAT_PDF_DATA: AppRatPdfData = {
  orgName: "Deaconess Health System",
  date: "August 2026",
  abridgePrice: 0,
  items: [
    { id: "s1", category: "ambientDoc", vendorName: "Nuance DAX", annualSpend: 480000, coveragePct: 100, contractMonths: 8, sunsetMonths: 8, rampMonths: 3 },
    { id: "s2", category: "scribe", vendorName: "ScribeAmerica", annualSpend: 360000, coveragePct: 100, contractMonths: 14, sunsetMonths: 14, rampMonths: 3 },
    { id: "s3", category: "dictation", vendorName: "Dragon Medical One", annualSpend: 210000, coveragePct: 75, contractMonths: 20, sunsetMonths: 20, rampMonths: 4 },
    { id: "s4", category: "cds", vendorName: "UpToDate", annualSpend: 140000, coveragePct: 0, contractMonths: 24, sunsetMonths: 24, rampMonths: 0 },
  ],
};
