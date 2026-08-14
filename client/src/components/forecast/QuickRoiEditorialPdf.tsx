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
      <div style={{ marginTop: 128 }}>
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
                <b style={{ color: C.coral }}>{fmtFull(m.net)} / yr</b> comes back, or{" "}
                <b style={{ color: C.ink }}>{m.roi.toFixed(1)}×</b> the Abridge spend.</>
            ) : (
              <>The <b style={{ color: C.ink }}>{fmtFull(data.price)} / yr</b> Abridge price runs{" "}
                <b style={{ color: C.ink }}>{fmtFull(-m.net)} / yr</b> above the value counted here.</>
            )}
          </div>
        )}
      </div>
      <div style={{ ...sRule, margin: "30px 0 22px" }} />
      <div style={{ display: "flex", gap: 48 }}>
        {stats.map((s, i) => (
          <div key={i}>
            <div className="font-abridge" style={{ fontSize: 30, lineHeight: 1, color: s.coral ? C.coral : C.ink }}>{s.v}</div>
            <div style={{ ...sLbl, marginTop: 7, maxWidth: 130 }}>{s.k}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "auto" }}>
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

// ───────────────────────── Page 3 · The numbers, itemized ─────────────────────────
function NumbersPage({ data }: { data: QuickRoiPdfData }): JSX.Element {
  const m = buildQuickRoiPdfModel(data);
  const domainsWithItems = DOMAIN_ORDER.filter((dom) => m.items.some((it) => it.domain === dom));
  return (
    <Page>
      <RunningHeader org={data.orgName} />
      <SectionEyebrow num="01" title="The numbers, itemized" />
      <h2 className="font-abridge" style={{ fontSize: 30, lineHeight: 1.1, color: C.ink, margin: "8px 0 0" }}>
        What Abridge is worth today
      </h2>
      <div style={{ ...sLead, marginBottom: 6 }}>Each driver, the measured way it was built, and the dollars it carries. Turned off drivers are not shown.</div>

      <div style={{ marginTop: 14, flex: 1, overflow: "hidden" }}>
        {domainsWithItems.map((dom) => (
          <div key={dom} style={{ marginBottom: 16 }}>
            <div style={{ ...sLbl, color: C.off, marginBottom: 8 }}>{dom}</div>
            {m.items.filter((it) => it.domain === dom).map((it) => (
              <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 24, padding: "9px 0", borderTop: `1px solid ${C.hair}` }}>
                <div style={{ maxWidth: 500 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{it.title}</div>
                  <div style={{ fontSize: 11, color: C.faint, lineHeight: 1.5, marginTop: 3 }}>{it.summary}</div>
                </div>
                <div className="font-abridge" style={{ fontSize: 20, color: C.coral, whiteSpace: "nowrap" }}>{fmtShort(it.value)}</div>
              </div>
            ))}
          </div>
        ))}

        {m.hours > 0 && (
          <div style={{ marginTop: 4, padding: "12px 16px", background: C.tile, borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Time back in the day</div>
                <div style={{ fontSize: 11, color: C.faint, marginTop: 3 }}>{fmtInt(m.hours)} clinician hours a year · shown as time, never converted to a dollar</div>
              </div>
              <span style={{ ...sLbl, color: C.off }}>Measured · not counted in $</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "14px 0 4px", borderTop: `2px solid ${C.ink}` }}>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: C.ink }}>Counted value today</span>
        <span className="font-abridge" style={{ fontSize: 30, color: C.coral }}>{fmtShort(m.todayValue)}<span style={{ fontSize: 14, color: C.faint }}> a year</span></span>
      </div>
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
        <div style={{ height: 12, borderRadius: 6, background: "#F3D9D0", overflow: "hidden" }}>
          <div style={{ width: `${Math.max(2, Math.min(100, todayPct)).toFixed(1)}%`, height: "100%", background: C.coral }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ fontSize: 11, color: C.muted }}>Made today {fmtShort(m.todayValue)}</span>
          <span style={{ fontSize: 11, color: C.faint }}>On the table {fmtShort(m.headroom)}</span>
        </div>
      </div>

      {/* the stretch, spelled out — the two levers that grow the volume */}
      <div style={{ marginTop: 34 }}>
        <div style={sLbl}>The stretch, spelled out</div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 0", borderTop: `1px solid ${C.hair}` }}>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 0", borderTop: `1px solid ${C.hair}` }}>
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

      <div style={{ ...sRule, margin: "32px 0 0" }} />

      {/* the return */}
      <div style={{ marginTop: 26 }}>
        <div style={sEyebrow}>The return</div>
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
  orgName: "Prospective partner",
  date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  setting: "outpatient",
  account: { totalProviders: 90, onAbridge: 60, encPerProvider: 2500, utilNow: 68, minutesSaved: 1.1 },
  vals: {
    wrvuBefore: 1.95, wrvuAfter: 2.03, cf: 33.4, wrvuRealization: 75,
    hccMembers: 18000, hccAvg: 2.5, hccRecaptureNow: 65, hccRecaptureLift: 5, hccNetNew: 0.05, hccPerHcc: 1500, hccRealization: 50,
    medNecessityDenialRate: 3, denialsCustomPercent: 50, avgClaimValue: 200, denialsRealization: 60,
  },
  enabled: { wrvu: true, hccCapture: true, denialPrevention: true },
  price: 550000,
  targetAdoptionPct: 82,
  targetUtilPct: 80,
};
