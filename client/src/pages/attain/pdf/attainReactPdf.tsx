/**
 * The REAL Attain "Export PDF" — a downloadable @react-pdf/renderer Document for
 * the LIVE v2 flow (AttainExperience). Page 1 is the shared PDFCoverPage ("Cover
 * A", same as the App Rationalization / Proforma leave-behinds); the interior
 * pages reproduce the editorial Attain design (cream / coral / Abridge face) that
 * the on-screen ?attainpdf=1 HTML preview established.
 *
 * The cardinal rule: every dollar/count/percent here comes from `buildFromSnapshot`
 * (attainPdfData.ts), which runs the SAME engine (`engineValueInPlay`) the live
 * AttainExperience screen renders. This module never invents a figure; it only
 * lays out what that adapter already reconciled. See attainPdfReconciliation.test.ts
 * for the guardrail that the PDF headline total equals the engine's own sum.
 *
 * Follows pdf_layout_guidelines.md: LETTER, padding 54 / paddingBottom 72, a fixed
 * 3-slot footer (ABRIDGE · org · page, cover unnumbered), wrap={false} on every
 * atomic row/card, minPresenceAhead on section headings. No Svg (bars are Views),
 * so there is no NaN-coordinate render trap. Claim-safe copy throughout.
 */
import { Document, Page, Text, View, StyleSheet, Font, pdf } from "@react-pdf/renderer";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import { savePdfBlob } from "@/lib/pdf-save";
import abridgeFont from "../../../assets/fonts/abridge.otf";
import manropeRegular from "../../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../../assets/fonts/manrope-bold.ttf";
import { buildFromSnapshot, type PlanCat } from "./attainPdfData";
import { type PdfData } from "./AttainPdfPage1";
import type { AttainSnapshot } from "../attainStorage";

// Register the two brand faces explicitly (Manrope carries the → / · glyphs the
// core Helvetica lacks; Abridge is the display face). Don't hyphenate.
Font.register({ family: "Abridge", src: abridgeFont, fontWeight: 400 });
Font.register({ family: "Manrope", fonts: [{ src: manropeRegular, fontWeight: 400 }, { src: manropeBold, fontWeight: 700 }] });
Font.registerHyphenationCallback((word) => [word]);

const C = {
  coral: "#EA2C00",
  ink: "#1A1A1A",
  body: "#3A3A3A",
  muted: "#8C8C8C",
  faint: "#B4A896",
  hairline: "#EFEAE1",
  tan: "#D8CFC0",
  track: "#EFEAE1",
  cream: "#FDFCFA",
  white: "#FFFFFF",
};

const CW = 504; // content width = 612 (LETTER) - 54 * 2

const fmt$ = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${Math.round(n)}`);
const clampPct = (n: number) => `${Math.max(0, Math.min(100, Math.round(n)))}%`;

const s = StyleSheet.create({
  page: { paddingTop: 46, paddingLeft: 54, paddingRight: 54, paddingBottom: 72, fontFamily: "Manrope", fontSize: 9.5, color: C.body, backgroundColor: C.cream },

  // Masthead (interior header)
  mast: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  mastLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  mastWordmark: { fontFamily: "Abridge", fontSize: 13, color: C.coral, letterSpacing: 0.5 },
  mastDivide: { width: 1, height: 13, backgroundColor: C.tan },
  mastLabel: { fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: 2, textTransform: "uppercase" },
  mastPartner: { fontFamily: "Abridge", fontSize: 13, color: C.ink },
  mastMeta: { fontSize: 8.5, color: C.muted, marginTop: 2, textAlign: "right" },
  rule: { height: 1, backgroundColor: C.hairline, marginTop: 14, marginBottom: 16 },

  // Footer (fixed, 3-slot)
  footer: { position: "absolute", bottom: 30, left: 54, right: 54, flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: C.hairline, paddingTop: 8 },
  footL: { width: 150, flexShrink: 0, fontSize: 7.5, color: C.faint },
  footC: { flex: 1, textAlign: "center", fontSize: 7.5, color: C.faint },
  footR: { width: 150, flexShrink: 0, textAlign: "right", fontSize: 7.5, color: C.faint, textTransform: "uppercase", letterSpacing: 1 },

  // Typography
  eyebrow: { fontSize: 8.5, fontWeight: 700, color: C.muted, letterSpacing: 2.5, textTransform: "uppercase" },
  lead: { fontSize: 10.5, lineHeight: 1.5, color: C.body, maxWidth: CW },

  // Case hero
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 24 },
  heroTotal: { fontFamily: "Abridge", fontSize: 60, color: C.coral, lineHeight: 1 },
  heroTotalUnit: { fontSize: 18, color: C.muted },
  heroNotSized: { fontFamily: "Abridge", fontSize: 34, color: C.ink },
  heroRight: { alignItems: "flex-end" },
  heroRightN: { fontFamily: "Abridge", fontSize: 22, color: C.ink, lineHeight: 1 },
  heroRightK: { fontSize: 8, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 3, marginBottom: 10 },

  // Two-column
  cols: { flexDirection: "row", gap: 34 },
  colWide: { flex: 1.15 },
  colNarrow: { flex: 1 },

  // Category rows (breakdown bars)
  catRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.hairline },
  catHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 },
  catName: { fontFamily: "Abridge", fontSize: 15, color: C.ink },
  catNameOff: { fontFamily: "Abridge", fontSize: 15, color: "#C0B7A8" },
  catVal: { fontFamily: "Abridge", fontSize: 15, color: C.ink },
  catValUnit: { fontSize: 9, color: C.muted },
  catNote: { fontSize: 9, color: C.muted, lineHeight: 1.35, marginTop: 5 },
  catOff: { fontSize: 8, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "#C0B7A8" },
  track: { height: 7, borderRadius: 4, backgroundColor: C.track, overflow: "hidden" },
  fill: { height: 7, borderRadius: 4, backgroundColor: C.coral },
  trackFlat: { height: 7, borderRadius: 4, backgroundColor: "#F1ECE4" },

  // Chain (how the number is built)
  chainNote: { fontSize: 9.5, color: C.body, lineHeight: 1.5, marginBottom: 12 },
  chainRow: { flexDirection: "row", alignItems: "baseline", gap: 12, marginBottom: 8 },
  chainVal: { fontFamily: "Abridge", fontSize: 19, color: C.ink, width: 92, flexShrink: 0 },
  chainLbl: { fontSize: 9, color: C.muted, lineHeight: 1.35, flex: 1 },

  // Opens (3-col grid)
  opensRow: { flexDirection: "row", gap: 22 },
  opensCol: { flex: 1 },
  opensCatName: { fontFamily: "Abridge", fontSize: 13, marginBottom: 7 },
  opensBullet: { flexDirection: "row", gap: 6, marginBottom: 5 },
  opensDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: C.coral, marginTop: 5, flexShrink: 0 },
  opensText: { fontSize: 9, color: C.body, lineHeight: 1.35, flex: 1 },
  opensOff: { fontSize: 9, color: "#C0B7A8", lineHeight: 1.35 },

  // Dark scoreboard band
  band: { backgroundColor: C.ink, borderRadius: 12, padding: 20 },
  bandLabel: { fontSize: 8, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 10 },
  bandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 24 },
  bandBody: { fontSize: 10.5, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, maxWidth: 340 },
  bandBigN: { fontFamily: "Abridge", fontSize: 34, color: C.coral, lineHeight: 1 },
  bandBigK: { fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginTop: 5 },

  // Per-category page
  catPageHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 },
  catPageTitle: { fontFamily: "Abridge", fontSize: 32, color: C.ink, lineHeight: 1 },
  catPageOwner: { fontSize: 9.5, color: C.muted },
  catPageOwnerName: { fontFamily: "Abridge", fontSize: 13, color: C.ink },
  blackRule: { height: 2, backgroundColor: C.ink },

  sectionLbl: { fontSize: 8.5, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.faint, marginBottom: 10 },

  // Metric rows
  metricRow: { paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.hairline },
  metricTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8 },
  metricName: { fontSize: 9.5, color: C.ink, flex: 1, lineHeight: 1.3 },
  metricNums: { flexDirection: "row", alignItems: "baseline", gap: 4, flexShrink: 0 },
  metricToday: { fontSize: 9, color: C.muted },
  metricArrow: { fontSize: 9, color: "#C4BCB0" },
  metricTarget: { fontSize: 9, fontWeight: 700 },
  metricUnit: { fontSize: 9, color: C.muted },
  metricSource: { fontSize: 7, letterSpacing: 1, textTransform: "uppercase", color: C.faint, marginTop: 3 },

  cadenceNote: { fontSize: 9, color: C.muted, lineHeight: 1.4, marginTop: 12 },

  // Chain + assumptions (per-category)
  chainStepRow: { flexDirection: "row", alignItems: "baseline", gap: 12, marginBottom: 10 },
  chainStepN: { fontFamily: "Abridge", fontSize: 14, color: C.coral, width: 16, flexShrink: 0 },
  chainStepT: { fontSize: 10, color: C.ink, lineHeight: 1.35, flex: 1 },
  honesty: { fontSize: 9, color: C.muted, lineHeight: 1.5, marginTop: 12 },
  assumRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", borderBottomWidth: 1, borderBottomColor: C.hairline, paddingBottom: 8, marginBottom: 8 },
  assumLbl: { fontSize: 9.5, color: C.body, flex: 1 },
  assumVal: { fontFamily: "Abridge", fontSize: 14, color: C.ink, flexShrink: 0 },
  assumFoot: { fontSize: 8.5, color: C.faint, marginTop: 10 },

  // Opens dark band (per-category)
  opensBand: { backgroundColor: C.ink, borderRadius: 12, padding: 20 },
  opensBandTitle: { fontFamily: "Abridge", fontSize: 13, color: C.white, marginBottom: 6, lineHeight: 1.2 },
  opensBandDesc: { fontSize: 9, color: "rgba(255,255,255,0.55)", lineHeight: 1.4 },
});

// The four domain pill colors already used across the app screens and the theme.
const CAT_COLOR: Record<string, string> = {
  "Patient Access": C.ink,
  "Provider Retention": "#574A43",
  "Revenue Capture": C.coral,
  "Quality & Safety": "#6B7280",
  "Nursing Capacity": C.ink,
};

function Masthead({ section, data }: { section: string; data: PdfData }) {
  return (
    <View fixed>
      <View style={s.mast}>
        <View style={s.mastLeft}>
          <Text style={s.mastWordmark}>ABRIDGE</Text>
          <View style={s.mastDivide} />
          <Text style={s.mastLabel}>{section}</Text>
        </View>
        <View>
          <Text style={s.mastPartner}>{data.partner}</Text>
          <Text style={s.mastMeta}>{`${data.setting} · ${data.date}`}</Text>
        </View>
      </View>
      <View style={s.rule} />
    </View>
  );
}

function Footer({ data }: { data: PdfData }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footL}>{`Value Attainment Plan · ${data.partner}`}</Text>
      <Text style={s.footC}>
        Counted once, valued at margin, never charges.
      </Text>
      <Text style={s.footR} render={({ pageNumber }) => `Abridge · Page ${pageNumber - 1}`} />
    </View>
  );
}

function Bar({ pct, flat }: { pct: number; flat?: boolean }) {
  if (flat) return <View style={s.trackFlat} />;
  return (
    <View style={s.track}>
      <View style={[s.fill, { width: clampPct(pct) }]} />
    </View>
  );
}

// ── Page 2 · The case ──────────────────────────────────────────────────────
function CasePage({ data, categories }: { data: PdfData; categories: PlanCat[] }) {
  const enteredCount = data.categories.filter((c) => c.entered).length;
  const cadence = categories.some((c) => c.cadence.toLowerCase() === "monthly") ? "Monthly" : "Quarterly";

  return (
    <Page size="LETTER" style={s.page}>
      <Masthead section="The Case" data={data} />

      {/* Hero */}
      <View style={s.heroRow} wrap={false}>
        <View>
          <Text style={[s.eyebrow, { marginBottom: 10 }]}>The value in play, all categories</Text>
          {data.total > 0 ? (
            <Text style={s.heroTotal}>
              {fmt$(data.total)}
              <Text style={s.heroTotalUnit}> / year</Text>
            </Text>
          ) : (
            <Text style={s.heroNotSized}>Not yet sized</Text>
          )}
        </View>
        <View style={s.heroRight}>
          <Text style={s.heroRightN}>
            {enteredCount}
            <Text style={{ fontSize: 14, color: C.muted }}>{` of ${data.categories.length}`}</Text>
          </Text>
          <Text style={s.heroRightK}>categories in play</Text>
          <Text style={s.heroRightN}>{cadence}</Text>
          <Text style={s.heroRightK}>review cadence</Text>
        </View>
      </View>
      <Text style={[s.lead, { marginTop: 14 }]}>
        Built entirely from your own volume, your economics, and the realization you set with us. Not a benchmark, and not a list price.
      </Text>

      <View style={s.rule} />

      {/* Two columns: breakdown + how it's built */}
      <View style={s.cols}>
        <View style={s.colWide}>
          <Text style={[s.eyebrow, { marginBottom: 8 }]}>Across your categories</Text>
          {data.categories.map((c) => {
            const pct = data.total > 0 ? (c.value / data.total) * 100 : 0;
            return (
              <View key={c.name} style={s.catRow} wrap={false}>
                <View style={s.catHead}>
                  <Text style={c.entered ? s.catName : s.catNameOff}>{c.name}</Text>
                  {c.entered ? (
                    <Text style={s.catVal}>
                      {fmt$(c.value)}
                      <Text style={s.catValUnit}> / yr</Text>
                    </Text>
                  ) : (
                    <Text style={s.catOff}>Not in this plan</Text>
                  )}
                </View>
                <Bar pct={pct} flat={!c.entered} />
                <Text style={c.entered ? s.catNote : s.opensOff}>
                  {c.entered ? c.note : "Available to turn on in a later review."}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={s.colNarrow}>
          <Text style={[s.eyebrow, { marginBottom: 12 }]}>How the number is built</Text>
          <Text style={s.chainNote}>
            {`A lighter documentation load is the shared lever. ${data.chainCategory ?? "Your largest line"}, your largest line, runs this chain:`}
          </Text>
          {data.chain.map((step, i) => (
            <View key={i} style={s.chainRow} wrap={false}>
              <Text style={s.chainVal}>{step.value}</Text>
              <Text style={s.chainLbl}>{step.label}</Text>
            </View>
          ))}
          <View style={[s.rule, { marginTop: 6, marginBottom: 12 }]} />
          <Text style={s.chainLbl}>
            Minutes saved is seeded conservatively, then measured on Progress. Every other number here is yours.
          </Text>
        </View>
      </View>

      {/* What this opens */}
      <View style={s.rule} />
      <Text style={[s.eyebrow, { marginBottom: 12 }]} minPresenceAhead={80}>What this opens, beyond the number</Text>
      <View style={s.opensRow} wrap={false}>
        {data.categories.map((c) => (
          <View key={c.name} style={s.opensCol}>
            <Text style={[s.opensCatName, { color: c.entered ? C.ink : "#C0B7A8" }]}>{c.name}</Text>
            {c.entered ? (
              (c.opens ?? []).map((o) => (
                <View key={o} style={s.opensBullet}>
                  <View style={s.opensDot} />
                  <Text style={s.opensText}>{o}</Text>
                </View>
              ))
            ) : (
              <Text style={s.opensOff}>Not part of this plan.</Text>
            )}
          </View>
        ))}
      </View>

      {/* Scoreboard band */}
      <View style={{ marginTop: 22 }} wrap={false}>
        <View style={s.band}>
          <Text style={s.bandLabel}>From here, the scoreboard</Text>
          <View style={s.bandRow}>
            <Text style={s.bandBody}>
              Measurement begins at go-live. Every review fills the plan with what you have realized against the promise, and shows the gap in full.
            </Text>
            <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
              <Text style={s.bandBigN}>0%</Text>
              <Text style={s.bandBigK}>realized to date</Text>
            </View>
          </View>
        </View>
      </View>

      <Footer data={data} />
    </Page>
  );
}

// ── Metric row (signals / outcomes) ────────────────────────────────────────
function MetricRow({ m, accent }: { m: PlanCat["signals"][number]; accent?: boolean }) {
  return (
    <View style={s.metricRow} wrap={false}>
      <View style={s.metricTop}>
        <Text style={s.metricName}>{m.name}</Text>
        <View style={s.metricNums}>
          <Text style={s.metricToday}>{m.today}</Text>
          <Text style={s.metricArrow}>{"→"}</Text>
          <Text style={[s.metricTarget, { color: accent ? C.coral : C.ink }]}>{m.target}</Text>
          <Text style={s.metricUnit}>{m.unit}</Text>
        </View>
      </View>
      <Text style={s.metricSource}>{m.source}</Text>
    </View>
  );
}

// ── Per-category page (plan + proof) ────────────────────────────────────────
function CategoryPage({ data, c, idx, total }: { data: PdfData; c: PlanCat; idx: number; total: number }) {
  const accent = CAT_COLOR[c.name] ?? C.ink;
  return (
    <Page size="LETTER" style={s.page}>
      <Masthead section={`The Plan · ${idx} of ${total} categories`} data={data} />

      <View style={s.catPageHead} wrap={false}>
        <Text style={[s.catPageTitle, { color: accent === C.coral ? C.coral : C.ink }]}>{c.name}</Text>
        <Text style={s.catPageOwner}>
          <Text style={s.catPageOwnerName}>{c.owner.name}</Text>
          {c.owner.role ? ` · ${c.owner.role}` : ""}
        </Text>
      </View>
      <View style={s.blackRule} />

      {/* What we measure */}
      <View style={[s.cols, { marginTop: 24 }]}>
        <View style={s.colNarrow}>
          <Text style={s.sectionLbl}>What Abridge can enable</Text>
          {c.signals.map((m) => <MetricRow key={m.name} m={m} accent />)}
        </View>
        <View style={s.colNarrow}>
          <Text style={s.sectionLbl}>The outcomes they open</Text>
          {c.outcomes.map((m) => <MetricRow key={m.name} m={m} />)}
        </View>
      </View>
      <Text style={s.cadenceNote}>
        {`Reviewed ${c.cadence.toLowerCase()} against the baselines above. The signals move first; the outcomes follow.`}
      </Text>

      <View style={[s.rule, { marginTop: 22, marginBottom: 22 }]} />

      {/* Why it holds: chain + assumptions */}
      <View style={s.cols}>
        <View style={s.colWide}>
          <Text style={s.sectionLbl}>How the number holds: the chain</Text>
          {c.chain.map((step, i) => (
            <View key={i} style={s.chainStepRow} wrap={false}>
              <Text style={s.chainStepN}>{i + 1}</Text>
              <Text style={s.chainStepT}>{step}</Text>
            </View>
          ))}
          <Text style={s.honesty}>{c.honesty}</Text>
        </View>
        <View style={s.colNarrow}>
          <Text style={s.sectionLbl}>The assumptions</Text>
          {c.assumptions.length === 0 ? (
            <Text style={s.chainLbl}>Seeded from published figures; no partner inputs required.</Text>
          ) : (
            c.assumptions.map((a) => (
              <View key={a.label} style={s.assumRow} wrap={false}>
                <Text style={s.assumLbl}>{a.label}</Text>
                <Text style={s.assumVal}>{a.value}</Text>
              </View>
            ))
          )}
          <Text style={s.assumFoot}>Seeded conservatively. Editable, and shown in full.</Text>
        </View>
      </View>

      {/* What this opens */}
      {c.opens.length > 0 && (
        <View style={{ marginTop: 22 }} wrap={false}>
          <View style={s.opensBand}>
            <Text style={s.bandLabel}>What this opens, beyond the number</Text>
            <View style={s.opensRow}>
              {c.opens.map((o) => (
                <View key={o.title} style={s.opensCol}>
                  <Text style={s.opensBandTitle}>{o.title}</Text>
                  <Text style={s.opensBandDesc}>{o.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      <Footer data={data} />
    </Page>
  );
}

/** The full Attain PDF Document: Cover (shared PDFCoverPage) → the case → one
 * spread per plan category. Built purely from `buildFromSnapshot`'s output. */
export function buildAttainPdfDocument(data: PdfData, categories: PlanCat[]): JSX.Element {
  return (
    <Document title={`Value Attainment Plan · ${data.partner}`}>
      <PDFCoverPage
        reportLabel="Attain · Value Attainment"
        title="Value Attainment Plan"
        subtitle="What we agreed to, and how we'll prove it."
        clientName={data.partner}
        disclaimerText="Built from partner-provided inputs and valued at contribution margin, counted once. A value attainment plan is a shared commitment, co-authored at kickoff and measured at each review. Results depend on adoption and how teams act on what the documentation surfaces."
      />
      <CasePage data={data} categories={categories} />
      {categories.map((c, i) => (
        <CategoryPage key={c.name} data={data} c={c} idx={i + 1} total={categories.length} />
      ))}
    </Document>
  );
}

function slugify(name: string): string {
  return (name || "partner").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "partner";
}

/** Live "Export PDF" entry point: turn the partner's saved v2 plan into the
 * downloadable PDF (auto-downloads on desktop, shares on mobile). Throws a clear
 * error if the plan isn't far enough along to size — the caller surfaces a toast. */
export async function generateAttainPdf(snap: AttainSnapshot | null | undefined): Promise<void> {
  const built = buildFromSnapshot(snap);
  if (!built) {
    throw new Error("The plan needs a care setting and at least one category before it can be exported.");
  }
  const doc = buildAttainPdfDocument(built.data, built.categories);
  const blob = await pdf(doc).toBlob();
  await savePdfBlob(blob, `abridge-${slugify(built.data.partner)}-value-attainment.pdf`, `Value Attainment Plan · ${built.data.partner}`);
}
