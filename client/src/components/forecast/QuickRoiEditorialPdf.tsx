import { type CSSProperties, type ReactNode } from "react";
import abridgeLogoRed from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import abridgeSymbol from "@assets/abridge-logo-symbol_1774906992195.png";
import {
  runRoi,
  DRIVERS,
  DOMAIN_ORDER,
  SETTING_META,
  type SettingKey,
  type Domain,
  type RoiAccount,
} from "@/pages/forecast/roiEngine";

// ─────────────────────────────────────────────────────────────────────────────
// The ROI Calculator one-pager. Same HTML-print engine as the Explore / App
// Rationalization / Proforma PDFs: a white report cover (p1), the value pitch
// (p2), then the itemized numbers (p3) and the upside + return (p4).
//
// Every dollar is recomputed here from the SAME engine (`runRoi`) the answer
// screen uses, off a snapshot of the rep's inputs — so the PDF and the screen
// reconcile by construction (guarded by quickRoiPdfReconciliation.test).
// ─────────────────────────────────────────────────────────────────────────────

export const QUICK_ROI_PDF_STORAGE_KEY = "abridge:quickroi-pdf-data";

export interface QuickRoiPdfData {
  orgName: string;
  date: string;
  setting: SettingKey;
  account: RoiAccount;
  vals: Record<string, number>;
  enabled: Record<string, boolean>;
  price: number;
  targetAdoptionPct: number;
  targetUtilPct: number;
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

function fmtFull(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}
function fmtShort(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}
function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

const sEyebrow: CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: C.coral };
const sLbl: CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: C.faint };
const sLead: CSSProperties = { fontSize: 13.5, color: C.muted, lineHeight: 1.5, marginTop: 8, maxWidth: 620 };
const sRule: CSSProperties = { height: 1, background: C.hair, width: "100%" };

// ── The computed model, straight from the engine ────────────────────────────
export function buildQuickRoiPdfModel(data: QuickRoiPdfData) {
  const meta = SETTING_META[data.setting];
  const today = runRoi(data.setting, data.account, data.vals, data.enabled);
  const potential = runRoi(data.setting, data.account, data.vals, data.enabled, {
    adoptionPct: data.targetAdoptionPct,
    utilPct: data.targetUtilPct,
  });
  const todayValue = today.total;
  const potentialValue = Math.max(potential.total, todayValue);
  const headroom = Math.max(0, potentialValue - todayValue);
  const isNursing = !!meta.isNursing;
  const hours = isNursing ? 0 : today.totalHoursSaved;
  const roi = data.price > 0 ? todayValue / data.price : 0;
  const net = todayValue - data.price;
  const onEnc = data.account.onAbridge * data.account.encPerProvider * (data.account.utilNow / 100);
  const adoptionNow = data.account.totalProviders > 0 ? (data.account.onAbridge / data.account.totalProviders) * 100 : 0;
  // Itemized on-drivers, grouped in domain order, each with its worked-math.
  const items = DRIVERS[data.setting]
    .filter((d) => data.enabled[d.id] && (today.valueById[d.id] ?? 0) > 0)
    .map((d) => ({
      id: d.id,
      title: d.title,
      domain: d.domain,
      value: today.valueById[d.id] ?? 0,
      // Use the driver's clean before/after "work" string where it has one (same
      // as the on-screen card), so the PDF never leaks the engine's raw
      // scenario-% float (e.g. "4.1025641%25 lift").
      summary: d.work ? d.work(data.vals, Math.round(onEnc)) : (today.summaryById[d.id] ?? ""),
    }));
  return { meta, today, potentialValue, headroom, todayValue, isNursing, hours, roi, net, onEnc, adoptionNow, items };
}

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
          <span style={sLbl}>ROI Calculator</span>
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
function ReportCover({ data }: { data: QuickRoiPdfData }): JSX.Element {
  const m = buildQuickRoiPdfModel(data);
  const subtitle = `${m.meta.label} · Abridge is worth ${fmtShort(m.todayValue)} a year`;
  return (
    <div style={{ width: 816, height: 1056, background: "#FFFFFF", breakAfter: "page", position: "relative", overflow: "hidden" }}>
      <img src={abridgeLogoRed} alt="Abridge" style={{ position: "absolute", top: 60, left: 64, width: 120 }} />
      <img src={abridgeSymbol} alt="" style={{ position: "absolute", bottom: 92, right: 10, width: 340, opacity: 0.06 }} />
      <div style={{ position: "absolute", inset: 0, padding: "0 64px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 11, color: "#666666", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 16 }}>ROI Calculator</div>
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
          Figures are directional estimates built from the impact-analysis numbers you entered. Actual value depends on
          adoption, documentation utilization, and your contracts. Not a commitment or guarantee.
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Page 2 · The value case ─────────────────────────
function PitchPage({ data }: { data: QuickRoiPdfData }): JSX.Element {
  const m = buildQuickRoiPdfModel(data);
  const priced = data.price > 0;
  const stats: { v: string; k: string; coral?: boolean }[] = [
    { v: fmtShort(m.todayValue), k: "Worth today", coral: true },
    { v: fmtShort(m.headroom), k: "On the table if they expand" },
  ];
  if (priced) {
    stats.push({ v: `${m.roi.toFixed(1)}×`, k: "Return on the Abridge spend" });
    stats.push({ v: fmtShort(m.net), k: "Net a year, after the price" });
  } else if (m.hours > 0) {
    stats.push({ v: fmtInt(m.hours), k: "Clinician hours back a year" });
  }
  return (
    <Page>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="font-abridge" style={{ fontSize: 20, color: C.coral }}>ABRIDGE</span>
        <span style={sLbl}>ROI Calculator</span>
      </div>
      <div style={{ flexGrow: 1 }} />
      <div style={{ marginTop: 32 }}>
        <div style={sEyebrow}>The value case</div>
        <h2 className="font-abridge" style={{ fontSize: 44, lineHeight: 1.06, color: C.ink, margin: "10px 0 0", maxWidth: 680, letterSpacing: "-0.5px" }}>
          To {data.orgName || "this partner"}, Abridge is worth {fmtShort(m.todayValue)} a year in {m.meta.label.toLowerCase()}.
        </h2>
        <div style={{ ...sLead, marginTop: 16, maxWidth: 620 }}>
          Built from the measured before and after in the impact analysis, at today's {Math.round(m.adoptionNow)}% rollout
          and {Math.round(data.account.utilNow)}% documentation utilization. Every number traces to a line the team can
          check.
          {m.hours > 0 && ` On top of the dollars, ${fmtInt(m.hours)} clinician hours a year come back, shown as time given back rather than a made-up dollar.`}
        </div>
        {priced && (
          <div style={{ marginTop: 16, fontSize: 14.5, color: C.label, lineHeight: 1.5, maxWidth: 620 }}>
            {m.net >= 0 ? (
              <>Net of the <b style={{ color: C.ink }}>{fmtFull(data.price)} / yr</b> Abridge price,{" "}
                <b style={{ color: C.coral }}>{fmtShort(m.net)} / yr</b> comes back, or{" "}
                <b style={{ color: C.ink }}>{m.roi.toFixed(1)}×</b> the Abridge spend.</>
            ) : (
              <>The <b style={{ color: C.ink }}>{fmtFull(data.price)} / yr</b> Abridge price runs{" "}
                <b style={{ color: C.ink }}>{fmtShort(-m.net)} / yr</b> above the value counted here.</>
            )}
          </div>
        )}
      </div>
      <div style={{ flexGrow: 1 }} />
      <div style={{ ...sRule, margin: "20px 0 16px" }} />
      <div style={{ display: "flex", gap: 48 }}>
        {stats.map((s, i) => (
          <div key={i}>
            <div className="font-abridge" style={{ fontSize: 30, lineHeight: 1, color: s.coral ? C.coral : C.ink }}>{s.v}</div>
            <div style={{ ...sLbl, marginTop: 7, maxWidth: 130 }}>{s.k}</div>
          </div>
        ))}
      </div>
      <div style={{ flexGrow: 1 }} />
      <div style={{ marginTop: 16 }}>
        <div style={{ ...sLbl, marginBottom: 6 }}>Inside this one-pager</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 44 }}>
          {[{ n: "01", t: "The numbers, itemized" }, { n: "02", t: "The upside, if they expand" }].map((r) => (
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

// ───────────────────────── Page 3 · What Abridge is worth ─────────────────────────
// A ramp of coral shades for the composition bar — darkest = biggest driver, so
// the eye reads the makeup by weight. Coral because this bar IS the money.
const CORAL_RAMP = ["#EA2C00", "#F0562F", "#F4785B", "#F89A82", "#FBBBA9", "#F6D3C6", "#EFE0D6"];

function NumbersPage({ data }: { data: QuickRoiPdfData }): JSX.Element {
  const m = buildQuickRoiPdfModel(data);
  const total = m.todayValue;
  const items = [...m.items].sort((a, b) => b.value - a.value);
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);
  const domainList = Array.from(new Set(items.map((it) => it.domain))).join(", ").toLowerCase();
  return (
    <Page>
      <RunningHeader org={data.orgName} />
      <SectionEyebrow num="01" title="What Abridge is worth" />

      {/* Hero — the number lands first */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "flex-end", gap: 14 }}>
        <span className="font-abridge" style={{ fontSize: 66, lineHeight: 0.92, color: C.coral, letterSpacing: "-1px" }}>{fmtShort(total)}</span>
        <span style={{ fontSize: 17, color: C.muted, paddingBottom: 8 }}>a year, counted</span>
      </div>
      <div style={{ ...sLead, marginTop: 12, maxWidth: 640 }}>
        Built from {items.length} {items.length === 1 ? "driver" : "drivers"} across {domainList}, at today's {Math.round(m.adoptionNow)}% rollout
        and {Math.round(data.account.utilNow)}% documentation utilization. Every dollar is lift only, net of realization and attribution.
      </div>

      {/* Composition bar — how the number is built, by weight */}
      <div style={{ marginTop: 34 }}>
        <div style={sLbl}>How the number is built</div>
        <div style={{ marginTop: 12, display: "flex", height: 96, borderRadius: 14, overflow: "hidden", gap: 2, background: C.tile }}>
          {items.map((it, i) => (
            <div key={it.id} style={{ width: `${Math.max(pct(it.value), 3).toFixed(2)}%`, background: CORAL_RAMP[i % CORAL_RAMP.length], minWidth: 6, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {pct(it.value) >= 16 && (
                <span className="font-abridge" style={{ fontSize: 15, color: "#FFFFFF", whiteSpace: "nowrap" }}>{fmtShort(it.value)}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ledger — each driver ties to its bar segment by the swatch color */}
      <div style={{ marginTop: 26 }}>
        {items.map((it, i) => (
          <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 24, padding: "28px 0", borderTop: `1px solid ${C.hair}` }}>
            <div style={{ display: "flex", gap: 13, alignItems: "baseline", maxWidth: 540 }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: CORAL_RAMP[i % CORAL_RAMP.length], flexShrink: 0, alignSelf: "center" }} />
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>{it.title}</div>
                <div style={{ fontSize: 10.5, color: C.faint, lineHeight: 1.5, marginTop: 2 }}>{it.summary}</div>
              </div>
            </div>
            <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
              <span className="font-abridge" style={{ fontSize: 19, color: C.coral }}>{fmtShort(it.value)}</span>
              <span style={{ fontSize: 11, color: C.faint, marginLeft: 7 }}>{Math.round(pct(it.value))}%</span>
            </div>
          </div>
        ))}
      </div>

      {m.hours > 0 && (
        <div style={{ marginTop: 22, padding: "15px 18px", background: C.tile, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Plus {fmtInt(m.hours)} clinician hours back a year</div>
            <div style={{ fontSize: 11, color: C.faint, marginTop: 3 }}>about {(m.hours / 2080).toFixed(1)} full-time clinicians' worth of documentation time</div>
          </div>
          <span style={{ ...sLbl, color: C.off }}>Measured · not counted in $</span>
        </div>
      )}

      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 15, color: C.label, lineHeight: 1.55, maxWidth: 640 }}>
          This is what the documentation already supports at today's footprint. The next page holds the same measured effect flat and grows only the volume it runs on.
        </div>
      </div>

      <div style={{ flexGrow: 1 }} />
      <Footer note="Realization and attribution rates are applied inside each line; the total counts lift only, never gross charges." num="02" />
    </Page>
  );
}

// ───────────────────────── Page 4 · The upside + return ─────────────────────────
function UpsidePage({ data }: { data: QuickRoiPdfData }): JSX.Element {
  const m = buildQuickRoiPdfModel(data);
  const priced = data.price > 0;
  const todayPct = m.potentialValue > 0 ? (m.todayValue / m.potentialValue) * 100 : 0;
  return (
    <Page>
      <RunningHeader org={data.orgName} />
      <SectionEyebrow num="02" title="The upside, if they expand" />
      <h2 className="font-abridge" style={{ fontSize: 30, lineHeight: 1.1, color: C.ink, margin: "8px 0 0" }}>
        Same measured effect, more of their volume
      </h2>
      <div style={{ ...sLead }}>
        The measured effect stays exactly where the data put it. Only the volume it runs on grows: more {m.meta.providerWord} on
        Abridge{m.isNursing ? "" : ", documenting more of their encounters"}.
      </div>

      <div style={{ marginTop: 26, display: "flex", gap: 56, alignItems: "flex-end" }}>
        <div>
          <div style={sLbl}>Worth today</div>
          <div className="font-abridge" style={{ fontSize: 40, lineHeight: 1, color: C.ink, marginTop: 6 }}>{fmtShort(m.todayValue)}</div>
        </div>
        <div style={{ fontSize: 24, color: C.off, paddingBottom: 4 }}>→</div>
        <div>
          <div style={sLbl}>At full stretch</div>
          <div className="font-abridge" style={{ fontSize: 40, lineHeight: 1, color: C.coral, marginTop: 6 }}>{fmtShort(m.potentialValue)}</div>
        </div>
        <div style={{ paddingBottom: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: C.coral }}>+{fmtShort(m.headroom)} on the table</span>
        </div>
      </div>

      {/* the made-today / on-the-table meter */}
      <div style={{ marginTop: 22 }}>
        <div style={{ height: 18, borderRadius: 9, background: "#F3D9D0", overflow: "hidden" }}>
          <div style={{ width: `${Math.max(2, Math.min(100, todayPct)).toFixed(1)}%`, height: "100%", background: C.coral }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ fontSize: 11, color: C.muted }}>Made today {fmtShort(m.todayValue)}</span>
          <span style={{ fontSize: 11, color: C.faint }}>On the table {fmtShort(m.headroom)}</span>
        </div>
      </div>

      {/* the stretch, spelled out — the two levers that grow the volume */}
      <div style={{ flexGrow: 1 }} />
      <div style={{ marginTop: 24 }}>
        <div style={sLbl}>The stretch, spelled out</div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "18px 0", borderTop: `1px solid ${C.hair}` }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>More {m.meta.providerWord} on Abridge</div>
              <div style={{ fontSize: 11.5, color: C.faint, marginTop: 3 }}>{fmtInt(data.account.onAbridge)} of {fmtInt(data.account.totalProviders)} today</div>
            </div>
            <div style={{ fontSize: 15, color: C.label }}>
              {Math.round(m.adoptionNow)}% <span style={{ color: C.off }}>→</span> <b style={{ color: C.coral }}>{data.targetAdoptionPct}%</b>
              <span style={{ fontSize: 12, color: C.faint }}> ({fmtInt(Math.round(data.account.totalProviders * data.targetAdoptionPct / 100))} of {fmtInt(data.account.totalProviders)})</span>
            </div>
          </div>
          {!m.isNursing && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "18px 0", borderTop: `1px solid ${C.hair}` }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Documenting more of their encounters</div>
                <div style={{ fontSize: 11.5, color: C.faint, marginTop: 3 }}>the share written with Abridge</div>
              </div>
              <div style={{ fontSize: 15, color: C.label }}>
                {Math.round(data.account.utilNow)}% <span style={{ color: C.off }}>→</span> <b style={{ color: C.coral }}>{data.targetUtilPct}%</b>
              </div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 14, fontSize: 12.5, color: C.faint, lineHeight: 1.55, maxWidth: 620 }}>
          The measured per-encounter effect is held exactly flat. Only these grow, so nothing here assumes a bigger lift than the data already showed.
        </div>
      </div>

      <div style={{ flexGrow: 1 }} />
      <div style={{ ...sRule, margin: "32px 0 0" }} />

      {/* the return */}
      <div style={{ flexGrow: 1 }} />
      <div style={{ marginTop: 26 }}>
        <div style={sEyebrow}>The return, on today's case</div>
        {priced ? (
          <div style={{ marginTop: 14, display: "flex", gap: 64, alignItems: "flex-end" }}>
            <div>
              <div style={sLbl}>Abridge price</div>
              <div className="font-abridge" style={{ fontSize: 26, color: C.ink, marginTop: 6 }}>{fmtFull(data.price)}</div>
            </div>
            <div>
              <div style={sLbl}>Return on the spend</div>
              <div className="font-abridge" style={{ fontSize: 44, lineHeight: 1, color: C.coral, marginTop: 4 }}>{m.roi.toFixed(1)}×</div>
            </div>
            <div>
              <div style={sLbl}>Net a year, after the price</div>
              <div className="font-abridge" style={{ fontSize: 44, lineHeight: 1, color: C.ink, marginTop: 4 }}>{fmtShort(m.net)}</div>
            </div>
          </div>
        ) : (
          <div style={{ ...sLead, marginTop: 10, fontStyle: "italic", color: C.off }}>
            Add the Abridge price on the answer screen to show the return and the net.
          </div>
        )}
      </div>

      <Footer note="The upside holds the measured per-unit effect flat and grows only the volume; it is a ceiling, not a forecast." num="03" />
    </Page>
  );
}

export function QuickRoiEditorialPdfDocument({ data }: { data: QuickRoiPdfData }): JSX.Element {
  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", color: C.ink }}>
      <ReportCover data={data} />
      <PitchPage data={data} />
      <NumbersPage data={data} />
      <UpsidePage data={data} />
      <style>{`@page { size: Letter; margin: 0; } @media print { body { margin: 0; } }`}</style>
    </div>
  );
}

// Sample data so the print route always renders (outpatient, priced).
export const SAMPLE_QUICK_ROI_PDF_DATA: QuickRoiPdfData = {
  orgName: "Summit Medical Group",
  date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  setting: "outpatient",
  account: { totalProviders: 90, onAbridge: 60, encPerProvider: 2500, utilNow: 68, minutesSaved: 1.1 },
  vals: {
    wrvuBefore: 1.95, wrvuAfter: 2.03, cf: 33.4, wrvuRealization: 75,
    // $/HCC at the Medicare Advantage anchor (see lib/hccPayers.ts) — this fixture
    // is an MA-heavy partner, tuned so the demo lands in the ~5x band against its
    // $550K price. NOTE: the Explore/Proforma/Methodology fixtures use a lower
    // blended $283/HCC tuned to THEIR params, so the fixtures are independently
    // balanced, not cross-consistent. The proper one-source fix is to regenerate
    // all PDF fixtures from the live engine (which reads the payer model); the
    // live customer PDFs already do.
    hccMembers: 18000, hccAvg: 2.5, hccRecaptureNow: 65, hccRecaptureLift: 5, hccNetNew: 0.05, hccPerHcc: 1500, hccRealization: 50,
    medNecessityDenialRate: 3, denialsCustomPercent: 50, avgClaimValue: 200, denialsRealization: 60,
  },
  enabled: { wrvu: true, hccCapture: true, denialPrevention: true },
  price: 550000,
  targetAdoptionPct: 82,
  targetUtilPct: 80,
};
