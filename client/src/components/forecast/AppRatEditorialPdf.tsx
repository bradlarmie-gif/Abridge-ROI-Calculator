import { type CSSProperties, type ReactNode } from "react";
import abridgeLogoRed from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import abridgeSymbol from "@assets/abridge-logo-symbol_1774906992195.png";
import {
  type AppRatItem,
  type AppRatCategoryId,
  type CumulativeTool,
  itemRetired,
  itemStays,
  itemDisplayName,
  categoryLabel,
  renewalDateLabel,
  computeNet,
  timingSummary,
  buildCumulativeSavings,
} from "@/lib/appRationalizationCalc";
import { buildConsolidationModel } from "@/components/forecast/ArConsolidationView";
import { buildMoatTools } from "@/components/forecast/ArMoatView";

// Per-capability rationale: what each tool does today, and the capability
// Abridge can take on. Carried over from the react-pdf export so the HTML PDF
// keeps the same "why each consolidates" proof.
const CAPABILITY_PROOF: Record<AppRatCategoryId, { today: string; withAbridge: string }> = {
  ambientDoc: {
    today: "An ambient tool listens to the visit and drafts the note.",
    withAbridge: "Abridge drafts the note from the same conversation, so this capability can consolidate onto it.",
  },
  dictation: {
    today: "Dictation turns the clinician's spoken narration into text they then format.",
    withAbridge: "Abridge structures the note from the conversation itself, which can take on much of what dictation is used for.",
  },
  scribe: {
    today: "A scribe, in person or virtual, writes the note during or after the visit.",
    withAbridge: "Abridge produces the draft from the visit, so the scribe workflow can consolidate onto it.",
  },
  transcription: {
    today: "A transcription service types up dictated audio after the fact.",
    withAbridge: "Abridge generates structured text from the conversation live, which is the work downstream transcription was doing.",
  },
  cds: {
    today: "Clinical decision support answers reference questions at the point of care.",
    withAbridge: "Abridge surfaces context from the encounter, but a knowledge base is a different job, so this one stays on.",
  },
  clinicalEvidence: {
    today: "Evidence search tools retrieve literature and guidelines on demand.",
    withAbridge: "Abridge brings encounter context forward, but a dedicated evidence search is a different job, so this one stays on.",
  },
  preChartRisk: {
    today: "Pre-charting risk tools prep the chart from prior EMR data before the visit.",
    withAbridge: "Abridge's pre-charting is expanding toward this step; treat this as a working estimate, not a committed capability.",
  },
  inEncounterCdi: {
    today: "In-encounter CDI prompts for documentation and coding gaps during the visit.",
    withAbridge: "Abridge's coding and quality coverage is expanding toward this step; treat this as a working estimate.",
  },
  postChartCoding: {
    today: "Pre-bill review tools check the finished note against the coded case before the claim goes.",
    // Pre-Bill is a shipped product, so this no longer carries the
    // "expanding toward this step / working estimate" hedge the other two
    // coding-layer categories still use.
    withAbridge: "Abridge Pre-Bill compares the coded case with the documented stay before submission, which is the same check.",
  },
  custom: {
    today: "A documentation-adjacent tool you entered.",
    withAbridge: "Where it overlaps the note Abridge already drafts, that share can consolidate.",
  },
};

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
  page: "#FFFFFF",
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
      <img src={abridgeLogoRed} alt="Abridge" style={{ position: "absolute", top: 60, left: 60, width: 120 }} />
      <img src={abridgeSymbol} alt="" style={{ position: "absolute", bottom: 92, right: 10, width: 340, opacity: 0.06 }} />
      <div style={{ position: "absolute", inset: 0, padding: "0 60px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
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
  const net = computeNet(data.items, data.abridgePrice);
  const priced = net.abridgePrice > 0;
  // A tool "folds onto Abridge" if any of its spend consolidates (retired > 0), even partially —
  // a 75%-freed tool folds, it isn't a tool that "stays". Counting "no residual" as folded wrongly
  // bucketed partly-freed tools as staying.
  const foldedCount = model.rows.filter((r) => r.retired > 0).length;
  const consolidatedBy = model.freed > 0 ? (summary.planFinishMonths > 0 ? renewalDateLabel(summary.planFinishMonths) : "now") : "n/a";
  const toc = [
    { n: "01", t: "The stack, consolidated" },
    { n: "02", t: "When it lands" },
    { n: "03", t: "Why only Abridge" },
  ];
  return (
    <Page>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="font-abridge" style={{ fontSize: 20, color: C.coral }}>ABRIDGE</span>
        <span style={sLbl}>App Rationalization</span>
      </div>
      <div style={{ flexGrow: 1 }} />
      <div style={{ marginTop: 32 }}>
        <div style={sEyebrow}>The consolidation case</div>
        <h2 className="font-abridge" style={{ fontSize: 44, lineHeight: 1.06, color: C.ink, margin: "10px 0 0", maxWidth: 680, letterSpacing: "-0.5px" }}>
          {fmtShort(model.freed)} a year of your stack consolidates onto the Abridge you already run.
        </h2>
        <div style={{ ...sLead, marginTop: 16, maxWidth: 610 }}>
          You added these tools over the years, each for one part of the note. Abridge already drafts the note from the
          conversation, so much of that work overlaps what it does. As each contract renews, that tool can consolidate onto
          Abridge; the rest stays.
        </div>
        {priced && (
          <div style={{ marginTop: 16, fontSize: 14.5, color: C.label, lineHeight: 1.5, maxWidth: 620 }}>
            {net.isNetCost ? (
              <>
                The <b style={{ color: C.ink }}>{fmtFull(net.abridgePrice)} / yr</b> Abridge price runs{" "}
                <b style={{ color: C.ink }}>{fmtFull(-net.netSavings)} / yr</b> above what these tools free today.
              </>
            ) : (
              <>
                Net of the <b style={{ color: C.ink }}>{fmtFull(net.abridgePrice)} / yr</b> Abridge price,{" "}
                <b style={{ color: C.coral }}>{fmtFull(net.netSavings)} / yr</b> comes back.
              </>
            )}
          </div>
        )}
      </div>
      <div style={{ flexGrow: 1 }} />
      <div style={{ ...sRule, margin: "20px 0 16px" }} />
      <div style={{ display: "flex", gap: 56 }}>
        {[
          { v: fmtShort(model.stackTotal), k: "Documentation spend today", coral: false },
          { v: fmtShort(model.freed), k: "Freed every year", coral: true },
          { v: String(foldedCount), k: "Tools folded onto Abridge", coral: false },
          { v: consolidatedBy, k: "Fully consolidated", coral: false },
        ].map((s, i) => (
          <div key={i}>
            <div className="font-abridge" style={{ fontSize: 30, lineHeight: 1, color: s.coral ? C.coral : C.ink }}>{s.v}</div>
            <div style={{ ...sLbl, marginTop: 7 }}>{s.k}</div>
          </div>
        ))}
      </div>
      <div style={{ flexGrow: 1 }} />
      <div style={{ marginTop: 16 }}>
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
      <div style={{ flexGrow: 1 }} />
      <div style={{ marginTop: 16 }}>
        <div style={{ ...sRule, marginBottom: 9 }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: C.faint }}>Prepared for {data.orgName || "your team"} · {data.date}</span>
          <span style={sLbl}>Confidential</span>
        </div>
      </div>
    </Page>
  );
}

// ───────────────────────── Page 3 · The stack, consolidated ─────────────────────────

function StackPage({ data }: { data: AppRatPdfData }): JSX.Element {
  const rows = data.items.filter((i) => (i.annualSpend || 0) > 0);
  const model = buildConsolidationModel(data.items);
  const totalSpend = rows.reduce((a, i) => a + (i.annualSpend || 0), 0);
  const totalFreed = rows.reduce((a, i) => a + itemRetired(i), 0);
  const totalStays = rows.reduce((a, i) => a + itemStays(i), 0);
  const overallPct = totalSpend > 0 ? Math.round((totalFreed / totalSpend) * 100) : 0;
  const cols: [number, CSSProperties["textAlign"]][] = [[2.0, "left"], [1.7, "left"], [1.25, "right"], [0.8, "right"], [1.2, "right"], [1.2, "right"], [1.05, "right"]];
  const th = ["Vendor", "Capability", "Annual spend", "Freed %", "Freed", "Stays", "Renewal"];
  return (
    <Page>
      <RunningHeader org={data.orgName} />
      <SectionEyebrow num="01" title="The stack, consolidated" />
      <h2 className="font-abridge" style={{ fontSize: 27, color: C.ink, marginTop: 7, lineHeight: 1.06 }}>
        Everything you run around the note, and what consolidates onto Abridge.
      </h2>
      <div style={{ ...sLead }}>
        Health systems add these tools one at a time, each for a step of the note. This is the whole stack you run
        today; coral is the share Abridge can take on, because it already produces the note from the conversation.
      </div>

      {/* Hero: one bar, each tool sized by spend and split freed (coral) vs stays (tan) */}
      <div style={{ ...sLbl, marginTop: 24, marginBottom: 9 }}>Your documentation stack today · {fmtShort(model.stackTotal)} / yr</div>
      <div style={{ display: "flex", height: 72, borderRadius: 9, overflow: "hidden", border: `1px solid ${C.hair}` }}>
        {model.rows.map((r, i) => (
          <div key={r.id} style={{ width: `${r.widthPct}%`, display: "flex", borderRight: i < model.rows.length - 1 ? "2px solid #fff" : "none" }}>
            {r.retiredPct > 0 && <div style={{ width: `${r.retiredPct}%`, background: C.coral }} />}
            {r.staysPct > 0 && <div style={{ width: `${r.staysPct}%`, background: TAN[1] }} />}
          </div>
        ))}
      </div>
      {/* Under each segment: the tool and how much of it folds, so the bar teaches per-tool */}
      <div style={{ display: "flex", marginTop: 7 }}>
        {model.rows.map((r) => {
          const pct = Math.round(r.retiredPct);
          return (
            <div key={r.id} style={{ width: `${r.widthPct}%`, textAlign: "center", padding: "0 4px", overflow: "hidden" }}>
              {r.widthPct >= 8 && (
                <>
                  <div style={{ fontSize: 9.5, color: C.label, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: pct > 0 ? C.coral : C.off, marginTop: 1 }}>{pct > 0 ? `${pct}% freed` : "stays"}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 26, marginTop: 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: C.coral }} />
          <span style={{ fontSize: 12, color: C.label }}><b className="font-abridge" style={{ color: C.coral }}>{fmtShort(model.freed)}</b> consolidates onto Abridge / yr</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: TAN[1] }} />
          <span style={{ fontSize: 12, color: C.label }}><b className="font-abridge">{fmtShort(model.stays)}</b> stays on your bill</span>
        </span>
      </div>

      <div style={{ marginTop: 22, border: `1px solid ${C.hair}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", background: C.tile, padding: "16px 16px" }}>
          {th.map((t, i) => (
            <span key={i} style={{ ...sLbl, fontSize: 9, flex: cols[i][0], textAlign: cols[i][1] }}>{t}</span>
          ))}
        </div>
        {rows.map((it, i) => {
          const freed = itemRetired(it);
          return (
            <div key={it.id} style={{ display: "flex", alignItems: "center", padding: "16px 16px", background: i % 2 ? C.card : "#fff", borderTop: `1px solid ${C.soft}` }}>
              <span style={{ flex: cols[0][0], minWidth: 0 }}>
                <span className="font-abridge" style={{ fontSize: 13, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{itemDisplayName(it)}</span>
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

      <div style={{ flexGrow: 1 }} />
      {(() => {
        // "Stays" has two sources, and they read differently: tools Abridge wholly doesn't replace
        // (staysOnly), and the residual on tools it covers only in part. Naming a 75%-freed tool as
        // "staying" was wrong, so we name only the wholly-staying tools and note partial residuals.
        const staysWhole = model.rows.filter((r) => r.staysOnly).map((r) => r.name);
        const hasPartial = model.rows.some((r) => r.retired > 0 && r.stays > 0);
        const names = staysWhole.length <= 2 ? staysWhole.join(" and ") : `${staysWhole.slice(0, -1).join(", ")}, and ${staysWhole.slice(-1)}`;
        const reasons: string[] = [];
        if (staysWhole.length) reasons.push(`${names}, which Abridge doesn't replace`);
        if (hasPartial) reasons.push("the residual on tools it covers only in part");
        return (
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55, marginTop: 20, maxWidth: 650 }}>
            <b className="font-abridge" style={{ color: C.coral }}>{fmtShort(model.freed)}</b> of the {fmtShort(model.stackTotal)} you spend
            overlaps what Abridge already produces from the conversation, so it folds onto Abridge as contracts renew.
            {model.stays > 0 && reasons.length > 0 && (
              <> The <b className="font-abridge">{fmtShort(model.stays)}</b> that stays is {reasons.join(", plus ")}.</>
            )}
          </div>
        );
      })()}
      <div style={{ flexGrow: 1 }} />
      <Footer note="Figures use only the tools and annual spend you entered. For planning purposes, not a guarantee of savings." num="01" />
    </Page>
  );
}

// ───────────────────────── Page 4 · When it lands ─────────────────────────

// The sharp step chart: annual run-rate freed climbing as each tool sunsets
// (coral staircase), the "ride to renewal" baseline (dashed), and the coral
// band between them = captured sooner. Ported from the react-pdf timing chart.
function StepChart({ items }: { items: AppRatItem[] }): JSX.Element | null {
  const cs = buildCumulativeSavings(items, 60);
  const summary = timingSummary(items);
  const tools = cs.tools;
  if (tools.length === 0) return null;
  const rr = (t: CumulativeTool) => t.monthlySaving * 12;
  const FULL = Math.max(1, tools.reduce((a, t) => a + rr(t), 0));
  const spanEnd = Math.max(summary.renewalFinishMonths, summary.planFinishMonths, 6);
  const axisMax = Math.max(12, Math.ceil((spanEnd + 4) / 6) * 6);
  const xStep = axisMax <= 24 ? 6 : 12;
  const W = 690, H = 252, x0 = 50, x1 = 678, yTop = 40, yBase = 202;
  const xf = (m: number) => x0 + (Math.max(0, Math.min(m, axisMax)) / axisMax) * (x1 - x0);
  const yf = (v: number) => yBase - (v / FULL) * (yBase - yTop);
  const step = (key: "sunsetMonths" | "contractMonths"): [number, number][] => {
    const sorted = [...tools].sort((a, b) => a[key] - b[key]);
    let cum = 0;
    const p: [number, number][] = [[0, 0]];
    for (const t of sorted) { p.push([t[key], cum]); cum += rr(t); p.push([t[key], cum]); }
    p.push([axisMax, cum]);
    return p;
  };
  const toXY = (p: [number, number]) => `${xf(p[0]).toFixed(1)},${yf(p[1]).toFixed(1)}`;
  const planPts = step("sunsetMonths");
  const renewalPts = step("contractMonths");
  const planLine = "M " + planPts.map(toXY).join(" L ");
  const renewalLine = "M " + renewalPts.map(toXY).join(" L ");
  const baseArea = `M ${xf(0)},${yBase} L ` + renewalPts.map(toXY).join(" L ") + ` L ${xf(axisMax)},${yBase} Z`;
  const band = "M " + planPts.map(toXY).join(" L ") + " L " + [...renewalPts].reverse().map(toXY).join(" L ") + " Z";
  const captured = summary.capturedSooner;
  const sooner = summary.monthsSooner;
  const sortedPlan = [...tools].sort((a, b) => a.sunsetMonths - b.sunsetMonths);
  let cumP = 0;
  const nodes = sortedPlan.map((t) => { cumP += rr(t); return { id: t.id, x: xf(t.sunsetMonths), y: yf(cumP) }; });
  const year1 = tools.reduce((a, t) => a + (t.sunsetMonths <= 12 ? rr(t) : 0), 0);
  const y1x = xf(12), y1y = yf(year1);
  // Only mark Year 1 when it is a distinct, lower point worth calling out. When
  // everything already lands in year 1 (year1 == full run-rate), the marker just
  // duplicates the plateau and the Aug-'27 gridline, so it is left off.
  const showYear1 = year1 < FULL * 0.98 && axisMax > 12;
  const fx = xf(summary.planFinishMonths), bx = xf(summary.renewalFinishMonths);
  const bmid = (fx + bx) / 2;
  const marks = Array.from({ length: Math.floor(axisMax / xStep) + 1 }, (_, i) => i * xStep);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="arRamp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.coral} stopOpacity={0.18} />
          <stop offset="100%" stopColor={C.coral} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <line x1={x0} y1={yBase} x2={x1} y2={yBase} stroke={C.hair} strokeWidth={1} />
      <line x1={x0} y1={(yTop + yBase) / 2} x2={x1} y2={(yTop + yBase) / 2} stroke={C.soft} strokeWidth={1} />
      <path d={baseArea} fill="url(#arRamp)" />
      {captured > 0 && <path d={band} fill={C.coral} fillOpacity={0.2} />}
      {captured > 0 && <path d={renewalLine} fill="none" stroke="#C3B7A8" strokeWidth={2} strokeDasharray="5 5" strokeLinejoin="round" />}
      <path d={planLine} fill="none" stroke={C.coral} strokeWidth={3} strokeLinejoin="round" />
      {showYear1 && <line x1={y1x} y1={y1y} x2={y1x} y2={yBase} stroke="#D9CDBE" strokeWidth={1.5} strokeDasharray="5 5" />}
      {sooner > 0 && (
        <g>
          <line x1={fx} y1={yTop - 10} x2={fx} y2={yTop + 6} stroke={C.coral} strokeWidth={3} />
          <line x1={bx} y1={yTop - 10} x2={bx} y2={yTop + 6} stroke="#C3B7A8" strokeWidth={2} />
          <line x1={fx} y1={yTop - 2} x2={bx} y2={yTop - 2} stroke={C.coral} strokeWidth={3} />
          {/* A quiet caption, not a shouting badge — matches the screen: light
              coral tint + coral text, not a solid coral fill with white text. */}
          <rect x={bmid - 62} y={yTop - 22} width={124} height={19} rx={9.5} fill="#FFEDE7" stroke="#F6C9BC" strokeWidth={1} />
          <text x={bmid} y={yTop - 9} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.coral}>{sooner} {sooner === 1 ? "month" : "months"} sooner</text>
        </g>
      )}
      {nodes.map((n) => <circle key={n.id} cx={n.x} cy={n.y} r={5} fill={C.coral} stroke="#fff" strokeWidth={2.5} />)}
      <text x={x0 - 8} y={yf(FULL) + 4} textAnchor="end" fontSize={10} fontWeight={700} fill={C.faint}>{fmtShort(FULL)}</text>
      {/* Round the mid gridline to a clean figure — raw FULL/2 printed odd ticks
          like "$499K" that read as a glitch next to the $998K top. */}
      <text x={x0 - 8} y={(yTop + yBase) / 2 + 3} textAnchor="end" fontSize={10} fill={C.off}>{fmtShort(Math.round(FULL / 2 / 50000) * 50000)}</text>
      <text x={x0 - 8} y={yBase + 3} textAnchor="end" fontSize={10} fill={C.off}>$0</text>
      {marks.map((m) => (
        <text key={m} x={xf(m)} y={yBase + 18} textAnchor={m === 0 ? "start" : m === axisMax ? "end" : "middle"} fontSize={9} fill={C.faint}>{m === 0 ? "now" : renewalDateLabel(m)}</text>
      ))}
      <text x={x1} y={yTop - 14} textAnchor="end" fontSize={9} fontWeight={700} fill={C.coral}>{fmtShort(FULL)} / yr · full run-rate</text>
      {/* Anchor the Year-1 callout to the LEFT of its step, over the open lower
          plateau, so it clears the step riser and the Sep-'27 guide line. */}
      {showYear1 && <text x={y1x - 8} y={Math.max(y1y - 13, yTop + 13)} textAnchor="end" fontSize={9} fontWeight={700} fill={C.muted}>Year 1 · {fmtShort(year1)}</text>}
    </svg>
  );
}

function TimingReadLine({ items }: { items: AppRatItem[] }): JSX.Element {
  const s = timingSummary(items);
  const captured = s.capturedSooner;
  const sooner = s.monthsSooner;
  const consolidated = s.planFinishMonths === 0 ? "now" : renewalDateLabel(s.planFinishMonths);
  const coral = { color: C.coral, fontWeight: 700 } as const;
  const ink = { color: C.ink, fontWeight: 700 } as const;
  let body: JSX.Element;
  if (captured > 0 && sooner > 0) {
    body = (
      <>
        Your plan reaches full consolidation <span style={ink}>{consolidated}</span>,{" "}
        <span style={coral}>{sooner} months</span> ahead of riding to renewal, and captures{" "}
        <span style={coral}>{fmtShort(captured)}</span> from vendors on the way there.
      </>
    );
  } else if (captured > 0) {
    body = (
      <>
        Pulling these in captures <span style={coral}>{fmtShort(captured)}</span> you&rsquo;d otherwise keep paying
        through renewal, with the finish line at <span style={ink}>{renewalDateLabel(s.renewalFinishMonths)}</span>.
      </>
    );
  } else {
    body = (
      <>
        <span style={ink}>Every contract is riding to its renewal.</span> The spend comes back as each one ends, no
        early-exit fees assumed.
      </>
    );
  }
  return <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.55, marginTop: 14, maxWidth: 640 }}>{body}</div>;
}

function TimingPage({ data }: { data: AppRatPdfData }): JSX.Element {
  const summary = timingSummary(data.items);
  const net = computeNet(data.items, data.abridgePrice);
  const priced = net.abridgePrice > 0;
  const savers = data.items.filter((i) => itemRetired(i) > 0).sort((a, b) => a.sunsetMonths - b.sunsetMonths);
  const yearOne = savers.filter((i) => i.sunsetMonths <= 12).reduce((a, i) => a + itemRetired(i), 0);
  const stats = [
    { v: fmtShort(net.sunset), k: "Freed at full consolidation", coral: !priced },
    ...(priced
      ? [{
          v: (net.isNetCost ? "-" : "") + fmtShort(Math.abs(net.netSavings)),
          k: net.isNetCost ? "Net cost, after Abridge" : "Net back, after Abridge",
          coral: !net.isNetCost,
        }]
      : []),
    { v: summary.planFinishMonths > 0 ? renewalDateLabel(summary.planFinishMonths) : "now", k: "Fully consolidated", coral: false },
    // When there is an early-exit plan, show how much sooner; otherwise the useful
    // number is how much comes back in the first year on the renewal calendar.
    summary.monthsSooner > 0
      ? { v: `${summary.monthsSooner} mo`, k: "Sooner than renewal", coral: false }
      : { v: fmtShort(yearOne), k: "Freed by year-one exits", coral: false },
  ];
  return (
    <Page>
      <RunningHeader org={data.orgName} />
      <SectionEyebrow num="02" title="When it lands" />
      <h2 className="font-abridge" style={{ fontSize: 27, color: C.ink, marginTop: 7, lineHeight: 1.06 }}>
        No rip-and-replace. The spend comes back as each contract ends.
      </h2>
      <div style={{ ...sLead, maxWidth: 620 }}>
        Each tool comes off at its own renewal, so the finish line follows your contract calendar, not a switch you have
        to flip on day one.
      </div>
      <div style={{ display: "flex", gap: 44, marginTop: 18, flexWrap: "wrap" }}>
        {stats.map((s, i) => (
          <div key={i}>
            <div className="font-abridge" style={{ fontSize: 25, lineHeight: 1, color: s.coral ? C.coral : C.ink }}>{s.v}</div>
            <div style={{ ...sLbl, marginTop: 6 }}>{s.k}</div>
          </div>
        ))}
      </div>

      <div style={{ ...sLbl, marginTop: 26, marginBottom: 10 }}>The run-rate freed, month by month</div>
      <StepChart items={data.items} />
      {summary.capturedSooner > 0 && (
        <div style={{ display: "flex", gap: 22, marginTop: 6, fontSize: 10.5, color: C.faint }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 16, height: 3, background: C.coral, borderRadius: 2 }} /> This plan</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 16, height: 0, borderTop: `2px dashed #C3B7A8` }} /> Ride to renewal</span>
        </div>
      )}
      <TimingReadLine items={data.items} />

      <div style={{ flexGrow: 1 }} />
      <div style={{ ...sLbl, marginTop: 22, marginBottom: 4 }}>Each tool&rsquo;s sunset</div>
      <div style={{ display: "flex", ...sLbl, fontSize: 9, marginBottom: 6 }}>
        <span style={{ flex: 2 }}>Tool</span>
        <span style={{ width: 120, textAlign: "right" }}>Sunsets</span>
        <span style={{ width: 90, textAlign: "right" }}>Ramp</span>
        <span style={{ width: 90, textAlign: "right" }}>Freed / yr</span>
      </div>
      {savers.map((it) => (
        <div key={it.id} style={{ display: "flex", alignItems: "baseline", padding: "13px 0", borderTop: `1px solid ${C.soft}` }}>
          <span style={{ flex: 2, fontSize: 13, color: C.label, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{itemDisplayName(it)}</span>
          <span style={{ width: 120, textAlign: "right", fontSize: 12, color: C.faint }}>{renewalDateLabel(it.sunsetMonths)}</span>
          <span style={{ width: 90, textAlign: "right", fontSize: 12, color: C.faint }}>{it.rampMonths > 0 ? `${it.rampMonths} mo` : "instant"}</span>
          <span className="font-abridge" style={{ width: 90, textAlign: "right", fontSize: 13, color: C.coral }}>{fmtShort(itemRetired(it))}</span>
        </div>
      ))}
      {savers.length === 0 && <div style={{ fontSize: 12.5, color: C.faint, padding: "10px 0" }}>No tools set to displace yet.</div>}
      {summary.gatingToolName && (
        <div style={{ fontSize: 12, color: C.faint, marginTop: 10 }}>
          The finish line is gated by {summary.gatingToolName}, the latest contract to run out.
        </div>
      )}
      <div style={{ flexGrow: 1 }} />
      <Footer note="An estimate built from the figures you entered, not a guarantee. Contracts and adoption set the real pace." num="02" />
    </Page>
  );
}

// ───────────────────────── Page 5 · Why only Abridge ─────────────────────────

// The note's life, left to right. THEIR tools all cluster in the middle span
// (capture -> draft), which is exactly where Abridge already works, so they fold
// down into it; the two ends are where Abridge is expanding.
function CoverageChain({ items }: { items: AppRatItem[] }): JSX.Element {
  const tools = buildMoatTools(items);
  const chips = tools.length ? tools.map((t) => t.name) : ["Your capture & draft tools"];
  const stages = ["Pre-charting", "The conversation", "Capture", "Draft note", "Coding", "Quality"];
  const faded: CSSProperties = { background: "#FBE7DF", border: "1.5px dashed #F0B7A6", display: "flex", alignItems: "center", justifyContent: "center" };
  return (
    <div>
      {/* Their tools, sitting over the exact span Abridge covers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)" }}>
        <div style={{ gridColumn: "2 / 5", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 7 }}>
          {chips.map((n, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 700, color: "#6B5E4C", background: C.tile, border: `1px solid ${C.hair}`, borderRadius: 7, padding: "5px 10px", whiteSpace: "nowrap" }}>{n}</span>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", margin: "6px 0" }}>
        <div style={{ gridColumn: "2 / 5", textAlign: "center", fontSize: 12, fontWeight: 700, color: C.coral }}>↓ consolidate onto Abridge</div>
      </div>
      {/* Coverage band, aligned to the six stages: coral where Abridge works now, faded where it is expanding */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", height: 44, borderRadius: 9, overflow: "hidden" }}>
        <div style={{ gridColumn: "1 / 2", ...faded, borderRadius: "9px 0 0 9px" }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: "#B5573C" }}>&larr; expanding</span>
        </div>
        <div style={{ gridColumn: "2 / 5", background: C.coral, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", textAlign: "center" }}>Abridge, from the conversation to the draft note</span>
        </div>
        <div style={{ gridColumn: "5 / 7", ...faded, borderRadius: "0 9px 9px 0" }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: "#B5573C" }}>expanding &rarr;</span>
        </div>
      </div>
      {/* Stage labels aligned under the six columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", marginTop: 8 }}>
        {stages.map((st, i) => (
          <div key={st} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: i === 0 || i >= 4 ? C.off : C.label }}>{st}</div>
            {i === 1 && <div style={{ fontSize: 8.5, color: C.coral, fontWeight: 700 }}>the source</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function MoatPage({ data }: { data: AppRatPdfData }): JSX.Element {
  const present: AppRatCategoryId[] = [];
  for (const it of data.items) {
    if ((it.annualSpend || 0) > 0 && !present.includes(it.category)) present.push(it.category);
  }
  return (
    <Page>
      <RunningHeader org={data.orgName} />
      <SectionEyebrow num="03" title="Why only Abridge" />
      <h2 className="font-abridge" style={{ fontSize: 27, color: C.ink, marginTop: 7, lineHeight: 1.06 }}>
        The stack consolidates into Abridge.
      </h2>
      <div style={{ ...sLead }}>
        Each of these tools does one step of the note, and Abridge already covers those steps, so that spend
        consolidates onto Abridge. A point tool that does one step can&rsquo;t absorb the rest of the chain.
      </div>

      <div style={{ ...sLbl, marginTop: 26, marginBottom: 12 }}>The documentation chain, who covers what</div>
      <CoverageChain items={data.items} />

      {present.length > 0 && (
        <>
          <div style={{ ...sLbl, marginTop: 30, marginBottom: 4 }}>Why each capability consolidates</div>
          <div style={{ fontSize: 11.5, color: C.faint, lineHeight: 1.5, marginBottom: 12, maxWidth: 620 }}>
            A working draft of the rationale, capability by capability, for the tools in your stack. Coverage expands
            over time; this is not a commitment.
          </div>
          <div style={{ border: `1px solid ${C.hair}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", background: C.tile, padding: "9px 16px" }}>
              <span style={{ ...sLbl, fontSize: 9, flex: 1.3 }}>Capability</span>
              <span style={{ ...sLbl, fontSize: 9, flex: 2.2 }}>Today</span>
              <span style={{ ...sLbl, fontSize: 9, flex: 2.5 }}>With Abridge</span>
            </div>
            {present.map((cat, i) => (
              <div key={cat} style={{ display: "flex", padding: "10px 16px", background: i % 2 ? C.card : "#fff", borderTop: `1px solid ${C.soft}` }}>
                <span className="font-abridge" style={{ flex: 1.3, fontSize: 12.5, color: C.ink, paddingRight: 8 }}>{categoryLabel(cat)}</span>
                <span style={{ flex: 2.2, fontSize: 11, color: C.faint, lineHeight: 1.4, paddingRight: 10 }}>{CAPABILITY_PROOF[cat].today}</span>
                <span style={{ flex: 2.5, fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{CAPABILITY_PROOF[cat].withAbridge}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ marginTop: 26, background: C.card, border: `1px solid ${C.hair}`, borderRadius: 12, padding: "18px 22px" }}>
        <div style={sLbl}>The moat</div>
        <div className="font-abridge" style={{ fontSize: 17, color: C.ink, lineHeight: 1.3, marginTop: 8 }}>
          A competitor can match Abridge&rsquo;s price within a year. What&rsquo;s hard to match is working from{" "}
          <span style={{ color: C.coral }}>the raw conversation</span>, which is where Abridge starts. That is why
          these tools consolidate onto Abridge instead of a point tool.
        </div>
      </div>
      <Footer note="A working rationale, not a committed capability set. Coverage expands over time." num="03" />
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
      <TimingPage data={data} />
      <MoatPage data={data} />
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
