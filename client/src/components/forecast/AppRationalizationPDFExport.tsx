// App Rationalization leave-behind PDF: a shared cover + up to three content
// pages that reproduce the locked on-screen App Rationalization flow, one page
// per screen:
//   1. Cover           — the shared PDFCoverPage.
//   2. The consolidation — ArConsolidationView: the two aligned "today vs after
//      fold-in" bars, the three stats, the already-in-place / net note, and a
//      dense per-tool table.
//   3. When it lands   — ConsolidationTiming: the run-rate step chart (ride to
//      renewal vs your plan), the read line, a per-tool timing table, and stats.
//   4. Why only Abridge — ArMoatView: the documentation-chain diagram and the
//      verbatim moat line.
//
// Every number comes from the calc (appRationalizationCalc.ts) or the two view
// model builders (buildConsolidationModel, buildMoatTools) the screens use, so
// the leave-behind always reconciles with what the rep saw. In particular the
// consolidation "Freed / yr" and the timing "full run-rate ceiling" are both
// Σ itemRetired, so they agree by construction.
//
// Follows pdf_layout_guidelines.md: page padding 54 / paddingBottom 72, a fixed
// 3-slot footer (ABRIDGE · org name · page number, cover unnumbered),
// wrap={false} on every atomic bar / row / card, and minPresenceAhead on the
// section titles. Fonts (Abridge + Manrope) are registered explicitly here
// rather than relying on PDFCoverPage's side-effect.
import { type ReactNode } from "react";
import {
  Document, Page, Text, View, StyleSheet, Svg, Rect, Line, Path, Circle, G,
  Defs, LinearGradient, Stop, Font, pdf,
} from "@react-pdf/renderer";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import { savePdfBlob } from "@/lib/pdf-save";
import abridgeFont from "../../assets/fonts/abridge.otf";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";
import {
  buildStackBars, computeNet, buildCumulativeSavings, timingSummary,
  renewalDateLabel, itemDisplayName, categoryLabel, itemRetired, itemStays,
  type AppRatItem, type CumulativeTool,
} from "@/lib/appRationalizationCalc";
import { buildConsolidationModel, freedRegionLeftPct } from "@/components/forecast/ArConsolidationView";
import { buildMoatTools } from "@/components/forecast/ArMoatView";

// Register the two brand faces explicitly (Manrope needs the → / · glyphs the
// core Helvetica lacks; the display face is Abridge). Don't hyphenate.
Font.register({ family: "Abridge", src: abridgeFont, fontWeight: 400 });
Font.register({ family: "Manrope", fonts: [{ src: manropeRegular, fontWeight: 400 }, { src: manropeBold, fontWeight: 700 }] });
Font.registerHyphenationCallback((word) => [word]);

// Warm editorial palette lifted from the on-screen views (cream/tan surfaces,
// black display headlines, coral reserved for money/accents).
const C = {
  coral: "#EA2C00", coralDark: "#B02200", ink: "#1A1A1A", body: "#8C7E6E",
  label: "#443A32", muted: "#6A5F52", faint: "#B4A99B", line: "#E8E2DA",
  cream: "#FDFCFA", tan: "#FAF7F2", stays: "#E7DCCE", white: "#FFFFFF",
  hair: "#F2ECE4", chipBorder: "#EEE7DD", chip: "#F7F2EC", grid: "#F1EAE0",
};
// The same warm tans the consolidation view cycles across tools.
const TAN_SHADES = ["#C4B39E", "#B3A188", "#CBBCA6", "#BFAE98", "#C9B8A2", "#BCAB94"];

const CW = 504; // content width = 612 (LETTER) - 54 * 2

// Full dollars with commas ($1,470,000) — stats, bar totals, table amounts.
const fmtFull = (n: number) => `$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
// One-decimal compact ($1.5M / $95K) — consolidation legend / inline "stays on".
const fmtM = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `$${Math.round(a / 1_000)}K`;
  return `$${Math.round(a)}`;
};
// Two-decimal compact ($1.47M / $820K) — the timing chart + read line.
const fmtC = (n: number) => {
  const a = Math.abs(Math.round(n));
  if (a >= 1_000_000) return `$${(a / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `$${Math.round(a / 1_000)}K`;
  return `$${a}`;
};

// ────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    paddingTop: 54, paddingLeft: 54, paddingRight: 54, paddingBottom: 72,
    fontFamily: "Manrope", fontSize: 9.5, color: C.body, backgroundColor: C.white,
  },

  // Interior chrome
  top: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 14,
  },
  topWordmark: { fontFamily: "Abridge", fontSize: 13, color: C.coral, letterSpacing: 0.5 },
  topLabel: { fontSize: 8, fontWeight: 700, color: C.body, letterSpacing: 2, textTransform: "uppercase" },

  footer: {
    position: "absolute", bottom: 28, left: 54, right: 54, flexDirection: "row",
    alignItems: "center", borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8,
  },
  footerLeft: { width: 90, flexShrink: 0, fontSize: 7.5, fontWeight: 700, color: C.coral, letterSpacing: 0.5 },
  footerCenter: { flex: 1, textAlign: "center", paddingHorizontal: 8, fontSize: 7.5, color: C.faint },
  footerRight: { width: 90, flexShrink: 0, textAlign: "right", fontSize: 7.5, fontWeight: 700, color: C.muted },

  // Titles
  eyebrow: { fontSize: 8.5, fontWeight: 700, color: C.coral, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 4 },
  title: { fontFamily: "Abridge", fontSize: 22, color: C.ink, marginBottom: 9, lineHeight: 1.08 },
  lead: { fontSize: 10, lineHeight: 1.5, color: C.body, marginBottom: 12, maxWidth: CW },

  // Bar block
  barLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 },
  barLabelK: { fontSize: 8.5, fontWeight: 700, color: C.label, letterSpacing: 1, textTransform: "uppercase" },
  barLabelV: { fontSize: 9, color: C.body },
  barLabelNum: { fontFamily: "Abridge", fontSize: 12, color: C.ink },
  barLabelNumCoral: { fontFamily: "Abridge", fontSize: 12, color: C.coral },

  // Legend chips
  legendRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },
  legChip: {
    flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.chipBorder,
    backgroundColor: C.chip, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8,
    marginRight: 7, marginBottom: 7,
  },
  legSwatch: { width: 8, height: 8, borderRadius: 2, marginRight: 5 },
  legName: { fontSize: 8, fontWeight: 700, color: "#2E2822", marginRight: 5 },
  legAmt: { fontSize: 8, color: C.muted },
  legStaysTag: {
    marginLeft: 5, fontSize: 6, fontWeight: 700, color: C.body, letterSpacing: 0.4,
    textTransform: "uppercase", backgroundColor: C.white, borderWidth: 1, borderColor: "#E0D6C8",
    borderRadius: 8, paddingVertical: 1, paddingHorizontal: 5,
  },

  // Note (already-in-place / net)
  noteRow: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  noteChipCoral: {
    fontSize: 7.5, fontWeight: 700, color: C.coral, letterSpacing: 0.4, textTransform: "uppercase",
    backgroundColor: "#FFEDE7", borderRadius: 10, paddingVertical: 3, paddingHorizontal: 9, marginRight: 9,
  },
  noteChipNeutral: {
    fontSize: 7.5, fontWeight: 700, color: C.label, letterSpacing: 0.4, textTransform: "uppercase",
    backgroundColor: "#F5F0EB", borderWidth: 1, borderColor: C.line, borderRadius: 10,
    paddingVertical: 3, paddingHorizontal: 9, marginRight: 9,
  },
  noteText: { flex: 1, fontSize: 9, color: C.body, lineHeight: 1.45 },
  noteEm: { color: "#2E2822", fontWeight: 700 },
  noteEmCoral: { color: C.coral, fontWeight: 700 },

  // Stats row (3 columns, top+bottom hairline)
  statsRow: { flexDirection: "row", marginTop: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line },
  statCell: { flex: 1, paddingVertical: 14, paddingRight: 16, borderRightWidth: 1, borderRightColor: C.line },
  statCellMid: { flex: 1, paddingVertical: 14, paddingHorizontal: 16, borderRightWidth: 1, borderRightColor: C.line },
  statCellLast: { flex: 1, paddingVertical: 14, paddingLeft: 16 },
  statK: { fontSize: 7.5, fontWeight: 700, color: C.label, letterSpacing: 0.7, textTransform: "uppercase" },
  statN: { fontFamily: "Abridge", fontSize: 21, color: C.ink, marginTop: 6 },
  statNCoral: { fontFamily: "Abridge", fontSize: 21, color: C.coral, marginTop: 6 },
  statUnit: { fontSize: 8.5, color: C.body },
  statSub: { fontSize: 8.5, fontWeight: 700, color: C.coral, marginTop: 3 },

  // Section subhead
  sechead: { fontSize: 8, fontWeight: 700, color: C.label, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 16, marginBottom: 8 },

  // Table
  table: { borderWidth: 1, borderColor: C.line, borderRadius: 4, overflow: "hidden" },
  thead: { flexDirection: "row", backgroundColor: C.tan, paddingVertical: 6, paddingHorizontal: 9, borderBottomWidth: 1, borderBottomColor: C.line },
  th: { fontSize: 7, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  trow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 9, borderBottomWidth: 1, borderBottomColor: C.hair },
  trowAlt: { backgroundColor: C.cream },
  trowTotal: { flexDirection: "row", alignItems: "center", paddingVertical: 7, paddingHorizontal: 9, backgroundColor: C.tan, borderTopWidth: 1, borderTopColor: C.line },
  colName: { flexDirection: "row", alignItems: "center" },
  rail: { width: 3, height: 20, borderRadius: 1, marginRight: 7 },
  tName: { fontSize: 8.5, fontWeight: 700, color: C.ink },
  tCap: { fontSize: 7, color: C.faint, marginTop: 1 },
  tCell: { fontSize: 8.5, color: C.ink },
  tCellMuted: { fontSize: 8.5, color: C.body },
  tCellCoral: { fontSize: 8.5, fontWeight: 700, color: C.coral },

  // Timing chart chrome
  chartTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 },
  chartLegend: { flexDirection: "row", alignItems: "center" },
  chartLegItem: { flexDirection: "row", alignItems: "center", marginLeft: 14 },
  chartLegText: { fontSize: 8, color: C.body, marginLeft: 4 },
  chartBox: { borderWidth: 1, borderColor: C.line, borderRadius: 12, backgroundColor: C.white, paddingVertical: 8, paddingHorizontal: 10 },
  chartRel: { position: "relative" },
  ov: { position: "absolute", fontSize: 6.5, color: C.muted },

  readline: { fontSize: 9.5, color: C.body, lineHeight: 1.5, marginTop: 12, maxWidth: CW },
  readCoral: { fontFamily: "Abridge", fontSize: 10.5, color: C.coral },
  readNeutral: { fontWeight: 700, color: "#5E534A" },

  // Moat chain
  chainRel: { position: "relative", marginTop: 12 },
  chainBox: {
    position: "absolute", justifyContent: "center", paddingHorizontal: 10, borderRadius: 7,
  },
  chainToolText: { fontSize: 8, fontWeight: 700, color: "#5E534A" },
  chainFold: { position: "absolute", right: 9, top: 0, bottom: 0, fontSize: 7, fontWeight: 700, color: C.coral },
  chainAbText: { fontFamily: "Abridge", fontSize: 9, color: C.white },
  chainRegionText: { fontSize: 7.5, fontWeight: 700, color: C.coralDark },
  chainRegionSmall: { fontSize: 6, fontWeight: 700, color: C.coralDark, letterSpacing: 0.4, textTransform: "uppercase" },
  stageLabel: { position: "absolute", fontSize: 7.5, fontWeight: 700, color: C.label, letterSpacing: 0.2 },
  stageLabelSoon: { position: "absolute", fontSize: 7.5, fontWeight: 700, color: C.faint, letterSpacing: 0.2 },
  stageSub: { fontSize: 6.5, fontWeight: 400, color: C.body, marginTop: 3 },
  stageSrcTag: {
    fontSize: 6, fontWeight: 700, color: C.coral, letterSpacing: 0.4, textTransform: "uppercase",
    backgroundColor: "#FFEDE7", borderRadius: 8, paddingVertical: 2, paddingHorizontal: 5, marginTop: 4,
  },

  moatBlock: { marginTop: 30, borderTopWidth: 2, borderTopColor: C.ink, paddingTop: 14 },
  moatK: { fontSize: 8, fontWeight: 700, color: C.label, letterSpacing: 1.5, textTransform: "uppercase" },
  moatBig: { fontFamily: "Abridge", fontSize: 17, color: C.ink, lineHeight: 1.25, marginTop: 10 },
  moatBigCoral: { color: C.coral },

  emptyNote: {
    borderWidth: 1, borderColor: C.line, borderRadius: 12, backgroundColor: C.tan,
    padding: 22, textAlign: "center", fontSize: 9.5, color: C.body,
  },
});

// ────────────────────────────────────────────────────────────────────────
// Chrome
// ────────────────────────────────────────────────────────────────────────

const FOOTER_ORG_MAX = 60;
function truncateOrg(name: string): string {
  const t = (name || "").trim();
  if (!t) return "Prospective partner";
  return t.length <= FOOTER_ORG_MAX ? t : `${t.slice(0, FOOTER_ORG_MAX - 1).trimEnd()}…`;
}

function InteriorHeader() {
  return (
    <View style={s.top} fixed>
      <Text style={s.topWordmark}>ABRIDGE</Text>
      <Text style={s.topLabel}>Forecast · App Rationalization</Text>
    </View>
  );
}

function InteriorFooter({ orgName }: { orgName: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerLeft}>ABRIDGE</Text>
      <Text style={s.footerCenter}>{truncateOrg(orgName)}</Text>
      <Text style={s.footerRight} render={({ pageNumber, totalPages }) => `Page ${pageNumber - 1} of ${totalPages - 1}`} />
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Page 2 · The consolidation (ArConsolidationView)
// ────────────────────────────────────────────────────────────────────────

const CONS_BAR_H = 34;

function ConsolidationBars({ model }: { model: ReturnType<typeof buildConsolidationModel> }) {
  // Precompute each tool's slot (x, width) once; both bars share the order/widths.
  let acc = 0;
  const segs = model.rows.map((r) => {
    const x = acc;
    const w = (CW * r.widthPct) / 100;
    acc += w;
    return { r, x, w };
  });
  const freedLeft = (CW * freedRegionLeftPct(model.rows)) / 100;

  return (
    <View>
      {/* TODAY */}
      <View wrap={false}>
        <View style={s.barLabelRow}>
          <Text style={s.barLabelK}>Documentation spend today</Text>
          <Text style={s.barLabelV}>
            <Text style={s.barLabelNum}>{fmtFull(model.stackTotal)}</Text>
            {` / yr · ${model.vendorCount} ${model.vendorCount === 1 ? "vendor" : "vendors"}`}
          </Text>
        </View>
        <Svg width={CW} height={CONS_BAR_H}>
          {segs.map(({ r, x, w }) => (
            <Rect
              key={r.id}
              x={x + 1}
              y={0}
              width={Math.max(1, w - 2)}
              height={CONS_BAR_H}
              rx={3}
              fill={r.staysOnly ? C.stays : r.shade}
            />
          ))}
        </Svg>
      </View>

      {/* AFTER FOLD-IN */}
      <View wrap={false} style={{ marginTop: 16 }}>
        <View style={s.barLabelRow}>
          <Text style={s.barLabelK}>After you fold in</Text>
          <Text style={s.barLabelV}>
            <Text style={s.barLabelNumCoral}>{fmtFull(model.freed)}</Text>
            {` / yr freed · ${fmtM(model.stays)} stays on`}
          </Text>
        </View>
        <View style={s.chartRel}>
          <Svg width={CW} height={CONS_BAR_H}>
            {segs.map(({ r, x, w }) => {
              const inner = Math.max(1, w - 2);
              const coralW = (inner * r.retiredPct) / 100;
              const staysW = (inner * r.staysPct) / 100;
              return (
                <G key={r.id}>
                  {r.retired > 0 && <Rect x={x + 1} y={0} width={coralW} height={CONS_BAR_H} fill={C.coral} />}
                  {r.stays > 0 && <Rect x={x + 1 + coralW} y={0} width={staysW} height={CONS_BAR_H} fill={C.stays} />}
                </G>
              );
            })}
          </Svg>
          {model.freed > 0 && (
            <View style={{ position: "absolute", left: freedLeft + 8, top: 0, height: CONS_BAR_H, justifyContent: "center" }}>
              <Text style={{ fontSize: 6.5, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: 0.6, textTransform: "uppercase" }}>
                Freed every year
              </Text>
              <Text style={{ fontFamily: "Abridge", fontSize: 13, color: C.white, marginTop: 2 }}>
                {fmtFull(model.freed)}
                <Text style={{ fontSize: 7.5, color: "rgba(255,255,255,0.75)" }}> / yr</Text>
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Legend */}
      <View style={s.legendRow}>
        {model.rows.map((r) => (
          <View key={r.id} style={s.legChip}>
            <View style={[s.legSwatch, { backgroundColor: r.staysOnly ? C.stays : r.shade }]} />
            <Text style={s.legName}>{r.name}</Text>
            <Text style={s.legAmt}>{fmtM(r.spend)}</Text>
            {r.staysOnly ? <Text style={s.legStaysTag}>Stays</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function ConsolidationNote({ items, abridgePrice }: { items: AppRatItem[]; abridgePrice: number }) {
  const net = computeNet(items, abridgePrice);
  if (net.abridgePrice === 0) {
    return (
      <View style={s.noteRow} wrap={false}>
        <Text style={s.noteChipCoral}>Already in place</Text>
        <Text style={s.noteText}>
          Abridge is a cost you already carry, so nothing new gets added here. These tools just fold onto it.
        </Text>
      </View>
    );
  }
  return (
    <View style={s.noteRow} wrap={false}>
      <Text style={s.noteChipNeutral}>Net of Abridge</Text>
      {net.isNetCost ? (
        <Text style={s.noteText}>
          {"The "}
          <Text style={s.noteEm}>{fmtM(net.abridgePrice)}</Text>
          {" / yr Abridge price runs "}
          <Text style={s.noteEm}>{fmtM(-net.netSavings)}</Text>
          {" / yr above what these tools free today."}
        </Text>
      ) : (
        <Text style={s.noteText}>
          {"Net of the "}
          <Text style={s.noteEm}>{fmtM(net.abridgePrice)}</Text>
          {" / yr Abridge price, "}
          <Text style={s.noteEmCoral}>{fmtM(net.netSavings)}</Text>
          {" / yr comes back."}
        </Text>
      )}
    </View>
  );
}

function ConsolidationTable({ items }: { items: AppRatItem[] }) {
  const rows = items.filter((i) => (i.annualSpend || 0) > 0);
  const totalSpend = rows.reduce((a, i) => a + (i.annualSpend || 0), 0);
  const totalFreed = rows.reduce((a, i) => a + itemRetired(i), 0);
  const totalStays = rows.reduce((a, i) => a + itemStays(i), 0);
  return (
    <View style={s.table}>
      <View style={s.thead}>
        <Text style={[s.th, { flex: 2.5 }]}>Tool</Text>
        <Text style={[s.th, { flex: 1.2, textAlign: "right" }]}>Annual spend</Text>
        <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Coverage</Text>
        <Text style={[s.th, { flex: 1.2, textAlign: "right" }]}>Freed</Text>
        <Text style={[s.th, { flex: 1.2, textAlign: "right" }]}>Stays</Text>
      </View>
      {rows.map((it, i) => (
        <View key={it.id} style={i % 2 === 1 ? [s.trow, s.trowAlt] : s.trow} wrap={false}>
          <View style={[s.colName, { flex: 2.5 }]}>
            <View style={[s.rail, { backgroundColor: TAN_SHADES[i % TAN_SHADES.length] }]} />
            <View>
              <Text style={s.tName}>{itemDisplayName(it)}</Text>
              <Text style={s.tCap}>{categoryLabel(it.category)}</Text>
            </View>
          </View>
          <Text style={[s.tCell, { flex: 1.2, textAlign: "right" }]}>{fmtFull(it.annualSpend)}</Text>
          <Text style={[s.tCellMuted, { flex: 1, textAlign: "right" }]}>{`${it.coveragePct}%`}</Text>
          <Text style={[s.tCellCoral, { flex: 1.2, textAlign: "right" }]}>{fmtFull(itemRetired(it))}</Text>
          <Text style={[s.tCellMuted, { flex: 1.2, textAlign: "right" }]}>{fmtFull(itemStays(it))}</Text>
        </View>
      ))}
      <View style={s.trowTotal} wrap={false}>
        <Text style={[s.tName, { flex: 2.5 }]}>Total</Text>
        <Text style={[s.tCell, { flex: 1.2, textAlign: "right", fontWeight: 700 }]}>{fmtFull(totalSpend)}</Text>
        <Text style={{ flex: 1 }}> </Text>
        <Text style={[s.tCellCoral, { flex: 1.2, textAlign: "right" }]}>{fmtFull(totalFreed)}</Text>
        <Text style={[s.tCellMuted, { flex: 1.2, textAlign: "right" }]}>{fmtFull(totalStays)}</Text>
      </View>
    </View>
  );
}

function ConsolidationPage({ items, orgName, abridgePrice }: {
  items: AppRatItem[]; orgName: string; abridgePrice: number;
}) {
  const model = buildConsolidationModel(items);
  return (
    <Page size="LETTER" style={s.page}>
      <InteriorHeader />
      <Text style={s.eyebrow}>The consolidation</Text>
      <Text style={s.title} minPresenceAhead={60}>Fold it onto what you already run.</Text>
      <Text style={s.lead}>
        You already pay for Abridge, so the documentation and scribe spend that overlaps it doesn&rsquo;t move to a new
        bill. It just goes away. Tools Abridge doesn&rsquo;t replace, like clinical reference, stay on.
      </Text>

      {model.stackTotal === 0 ? (
        <View style={s.emptyNote} wrap={false}>
          <Text>Add applications with annual spend to see the consolidation.</Text>
        </View>
      ) : (
        <>
          <ConsolidationBars model={model} />
          <ConsolidationNote items={items} abridgePrice={abridgePrice} />

          <View style={s.statsRow} wrap={false}>
            <View style={s.statCell}>
              <Text style={s.statK}>Documentation spend today</Text>
              <Text style={s.statN}>{fmtFull(model.stackTotal)}<Text style={s.statUnit}> / yr</Text></Text>
            </View>
            <View style={s.statCellMid}>
              <Text style={s.statK}>Still on after fold-in</Text>
              <Text style={s.statN}>{fmtFull(model.stays)}<Text style={s.statUnit}> / yr</Text></Text>
            </View>
            <View style={s.statCellLast}>
              <Text style={s.statK}>Freed every year</Text>
              <Text style={s.statNCoral}>{fmtFull(model.freed)}<Text style={s.statUnit}> / yr</Text></Text>
            </View>
          </View>

          <Text style={s.sechead} minPresenceAhead={50}>Your documentation stack, tool by tool</Text>
          <ConsolidationTable items={items} />
        </>
      )}

      <InteriorFooter orgName={orgName} />
    </Page>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Page 3 · When it lands (ConsolidationTiming)
// ────────────────────────────────────────────────────────────────────────

// The step chart is authored in the same 1000x300 viewBox the on-screen chart
// uses, then rendered into a CW-wide box. Overlaid <Text> labels are placed in
// pixel space via this uniform scale (react-pdf's Svg does not lay out its own
// <Text> reliably; see attain-pdf.tsx).
const VB_W = 1000, VB_H = 300;
const T_X0 = 70, T_X1 = 980, T_Y0 = 40, T_Y1 = 250;
const K = CW / VB_W; // uniform scale to pixel space
const PX = (v: number) => v * K;
const CHART_H = VB_H * K; // ≈ 151

function stepPts(tools: CumulativeTool[], key: "sunsetMonths" | "contractMonths", runRate: (t: CumulativeTool) => number, axisMax: number): [number, number][] {
  const sorted = [...tools].sort((a, b) => a[key] - b[key]);
  let cum = 0;
  const p: [number, number][] = [[0, 0]];
  for (const t of sorted) { p.push([t[key], cum]); cum += runRate(t); p.push([t[key], cum]); }
  p.push([axisMax, cum]);
  return p;
}

function TimingChart({ items }: { items: AppRatItem[] }) {
  const cs = buildCumulativeSavings(items, 60);
  const summary = timingSummary(items);
  const tools = cs.tools;
  const runRate = (t: CumulativeTool) => t.monthlySaving * 12;
  const FULL = Math.max(1, tools.reduce((a, t) => a + runRate(t), 0));

  const spanEnd = Math.max(summary.renewalFinishMonths, summary.planFinishMonths, 6);
  const axisMax = Math.max(12, Math.ceil((spanEnd + 4) / 6) * 6);
  const xStep = axisMax <= 24 ? 6 : 12;

  const xf = (m: number) => T_X0 + (Math.max(0, Math.min(m, axisMax)) / axisMax) * (T_X1 - T_X0);
  const yf = (v: number) => T_Y1 - (v / FULL) * (T_Y1 - T_Y0);
  const toXY = (p: [number, number]) => `${xf(p[0]).toFixed(1)},${yf(p[1]).toFixed(1)}`;

  const planPts = stepPts(tools, "sunsetMonths", runRate, axisMax);
  const renewalPts = stepPts(tools, "contractMonths", runRate, axisMax);
  const planLine = "M " + planPts.map(toXY).join(" L ");
  const renewalLine = "M " + renewalPts.map(toXY).join(" L ");
  const baseArea = `M ${xf(0)},${T_Y1} L ` + renewalPts.map(toXY).join(" L ") + ` L ${xf(axisMax)},${T_Y1} Z`;
  const band = "M " + planPts.map(toXY).join(" L ") + " L " + [...renewalPts].reverse().map(toXY).join(" L ") + " Z";

  const captured = summary.capturedSooner;
  const sooner = summary.monthsSooner;

  // Named dots on the plan line (dots only in print; names live in the table).
  const sortedPlan = [...tools].sort((a, b) => a.sunsetMonths - b.sunsetMonths);
  let cumPlan = 0;
  const nodes = sortedPlan.map((t) => { cumPlan += runRate(t); return { id: t.id, x: xf(t.sunsetMonths), y: yf(cumPlan) }; });

  const year1 = tools.reduce((a, t) => a + (t.sunsetMonths <= 12 ? runRate(t) : 0), 0);
  const y1x = xf(12), y1y = yf(year1);

  const fx = xf(summary.planFinishMonths), bx = xf(summary.renewalFinishMonths);
  const bmid = (fx + bx) / 2;
  const bLabel = `${sooner} ${sooner === 1 ? "month" : "months"} sooner`;
  const bw = Math.max(120, bLabel.length * 8.2);

  const marks = Array.from({ length: Math.floor(axisMax / xStep) + 1 }, (_, i) => i * xStep);

  return (
    <View style={s.chartRel}>
      <Svg width={CW} height={CHART_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
        <Defs>
          <LinearGradient id="ar-ramp" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={C.coral} stopOpacity={0.2} />
            <Stop offset="100%" stopColor={C.coral} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        <Line x1={T_X0} y1={T_Y1} x2={T_X1} y2={T_Y1} stroke={C.line} strokeWidth={1} />
        <Line x1={T_X0} y1={(T_Y0 + T_Y1) / 2} x2={T_X1} y2={(T_Y0 + T_Y1) / 2} stroke={C.grid} strokeWidth={1} />

        <Path d={baseArea} fill="url(#ar-ramp)" />
        {captured > 0 && <Path d={band} fill={C.coral} fillOpacity={0.22} />}
        {captured > 0 && <Path d={renewalLine} fill="none" stroke="#C3B7A8" strokeWidth={2} strokeDasharray="5 5" strokeLinejoin="round" />}
        <Path d={planLine} fill="none" stroke={C.coral} strokeWidth={3} strokeLinejoin="round" />

        <Line x1={y1x} y1={y1y} x2={y1x} y2={T_Y1} stroke="#D9CDBE" strokeWidth={1.5} strokeDasharray="5 5" />

        {sooner > 0 && (
          <G>
            <Line x1={fx} y1={T_Y0 - 8} x2={fx} y2={T_Y0 + 8} stroke={C.coral} strokeWidth={3} />
            <Line x1={bx} y1={T_Y0 - 8} x2={bx} y2={T_Y0 + 8} stroke="#C3B7A8" strokeWidth={2} />
            <Line x1={fx} y1={T_Y0} x2={bx} y2={T_Y0} stroke={C.coral} strokeWidth={3} />
            <Rect x={bmid - bw / 2} y={T_Y0 - 32} width={bw} height={24} rx={12} fill={C.coral} />
          </G>
        )}

        {nodes.map((n) => (
          <Circle key={n.id} cx={n.x} cy={n.y} r={5.5} fill={C.coral} stroke={C.white} strokeWidth={3} />
        ))}
      </Svg>

      {/* Overlaid labels (pixel space) */}
      <Text style={[s.ov, { left: 0, top: PX(T_Y0 + 4) - 4, width: PX(T_X0) - 4, textAlign: "right" }]}>{fmtC(FULL)}</Text>
      <Text style={[s.ov, { left: 0, top: PX(T_Y1) - 4, width: PX(T_X0) - 4, textAlign: "right" }]}>$0</Text>
      {marks.map((m) => (
        <Text key={m} style={[s.ov, { left: PX(xf(m)) - 40, top: PX(T_Y1) + 6, width: 80, textAlign: "center" }]}>
          {m === 0 ? `now · ${renewalDateLabel(0)}` : renewalDateLabel(m)}
        </Text>
      ))}
      <Text style={[s.ov, { left: PX(T_X1) - 170, top: PX(T_Y0) - 12, width: 170, textAlign: "right", fontSize: 7, fontWeight: 700, color: C.coral }]}>
        {`${fmtC(FULL)} / yr · full run-rate`}
      </Text>
      <Text style={[s.ov, { left: PX(y1x) + 4, top: PX(Math.max(y1y + 18, T_Y0 + 22)) - 4, width: 110, fontSize: 7, fontWeight: 700, color: "#5E534A" }]}>
        {`Year 1 · ${fmtC(year1)}`}
      </Text>
      {sooner > 0 && (
        <Text style={[s.ov, { left: PX(bmid) - 50, top: PX(T_Y0 - 24) - 3, width: 100, textAlign: "center", fontSize: 7, fontWeight: 700, color: C.white }]}>
          {bLabel}
        </Text>
      )}
    </View>
  );
}

function Coral({ children }: { children: ReactNode }) {
  return <Text style={s.readCoral}>{children}</Text>;
}
function Neutral({ children }: { children: ReactNode }) {
  return <Text style={s.readNeutral}>{children}</Text>;
}

function TimingReadLine({ items }: { items: AppRatItem[] }) {
  const summary = timingSummary(items);
  const captured = summary.capturedSooner;
  const sooner = summary.monthsSooner;
  const consolidated = summary.planFinishMonths === 0 ? "now" : renewalDateLabel(summary.planFinishMonths);
  if (captured > 0 && sooner > 0) {
    return (
      <Text style={s.readline}>
        {"Your plan reaches full consolidation "}
        <Neutral>{consolidated}</Neutral>
        {", "}
        <Coral>{`${sooner} months`}</Coral>
        {" ahead of riding to renewal, and captures "}
        <Coral>{fmtC(captured)}</Coral>
        {" from vendors on the way there."}
      </Text>
    );
  }
  if (captured > 0) {
    return (
      <Text style={s.readline}>
        {"Pulling these in captures "}
        <Coral>{fmtC(captured)}</Coral>
        {" you'd otherwise keep paying through renewal. The finish line holds at "}
        <Neutral>{renewalDateLabel(summary.renewalFinishMonths)}</Neutral>
        {" until you pull "}
        <Neutral>{summary.gatingToolName}</Neutral>
        {" in too."}
      </Text>
    );
  }
  return (
    <Text style={s.readline}>
      <Neutral>Every contract is riding to its renewal.</Neutral>
      {" Pull one in below and the gap that opens up is savings you capture sooner instead of paying through renewal."}
    </Text>
  );
}

function TimingTable({ items }: { items: AppRatItem[] }) {
  const cs = buildCumulativeSavings(items, 60);
  const byId = new Map(cs.tools.map((t) => [t.id, t]));
  const rows = items.filter((i) => (i.annualSpend || 0) > 0);
  return (
    <View style={s.table}>
      <View style={s.thead}>
        <Text style={[s.th, { flex: 2.4 }]}>Tool</Text>
        <Text style={[s.th, { flex: 1.2, textAlign: "right" }]}>Renewal date</Text>
        <Text style={[s.th, { flex: 1.2, textAlign: "right" }]}>Exit date</Text>
        <Text style={[s.th, { flex: 1.3, textAlign: "right" }]}>Captured sooner</Text>
      </View>
      {rows.map((it, i) => {
        const t = byId.get(it.id);
        const rowStyle = i % 2 === 1 ? [s.trow, s.trowAlt] : s.trow;
        if (!t) {
          return (
            <View key={it.id} style={rowStyle} wrap={false}>
              <View style={[s.colName, { flex: 2.4 }]}>
                <View style={[s.rail, { backgroundColor: C.stays }]} />
                <Text style={[s.tName, { color: C.body }]}>{itemDisplayName(it)}</Text>
              </View>
              <Text style={[s.tCellMuted, { flex: 1.2, textAlign: "right" }]}>stays on</Text>
              <Text style={[s.tCellMuted, { flex: 1.2, textAlign: "right" }]}>—</Text>
              <Text style={[s.tCellMuted, { flex: 1.3, textAlign: "right" }]}>—</Text>
            </View>
          );
        }
        const mtm = t.contractMonths === 0;
        const renewal = mtm ? "now" : renewalDateLabel(t.contractMonths);
        const exit = mtm ? "now" : t.earlyMonths <= 0 ? "rides to renewal" : renewalDateLabel(t.sunsetMonths);
        return (
          <View key={it.id} style={rowStyle} wrap={false}>
            <View style={[s.colName, { flex: 2.4 }]}>
              <View style={[s.rail, { backgroundColor: C.coral }]} />
              <Text style={s.tName}>{t.name}</Text>
            </View>
            <Text style={[s.tCell, { flex: 1.2, textAlign: "right" }]}>{renewal}</Text>
            <Text style={[s.tCell, { flex: 1.2, textAlign: "right" }]}>{exit}</Text>
            <Text style={[t.earlySaving > 0 ? s.tCellCoral : s.tCellMuted, { flex: 1.3, textAlign: "right" }]}>
              {t.earlySaving > 0 ? fmtFull(t.earlySaving) : "—"}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function TimingPage({ items, orgName }: { items: AppRatItem[]; orgName: string }) {
  const cs = buildCumulativeSavings(items, 60);
  const summary = timingSummary(items);
  const runRate = (t: CumulativeTool) => t.monthlySaving * 12;
  const year1 = cs.tools.reduce((a, t) => a + (t.sunsetMonths <= 12 ? runRate(t) : 0), 0);
  const captured = summary.capturedSooner;
  const sooner = summary.monthsSooner;
  const consolidated = summary.planFinishMonths === 0 ? "now" : renewalDateLabel(summary.planFinishMonths);

  return (
    <Page size="LETTER" style={s.page}>
      <InteriorHeader />
      <Text style={s.eyebrow}>When it lands</Text>
      <Text style={s.title} minPresenceAhead={60}>How soon it lands is your call.</Text>
      <Text style={s.lead}>
        You already run Abridge, so every tool you retire is pure additional savings. Each contract frees its spend on
        its real renewal date; negotiate out early and it lands sooner.
      </Text>

      <View wrap={false}>
        <View style={s.chartTitleRow}>
          <Text style={s.barLabelK}>Additional savings, on the calendar</Text>
          <View style={s.chartLegend}>
            <View style={s.chartLegItem}>
              <Svg width={18} height={4}><Line x1={0} y1={2} x2={18} y2={2} stroke="#C3B7A8" strokeWidth={2} strokeDasharray="3 3" /></Svg>
              <Text style={s.chartLegText}>ride to renewal</Text>
            </View>
            <View style={s.chartLegItem}>
              <Svg width={18} height={4}><Line x1={0} y1={2} x2={18} y2={2} stroke={C.coral} strokeWidth={3} /></Svg>
              <Text style={s.chartLegText}>your plan</Text>
            </View>
          </View>
        </View>
        <View style={s.chartBox}>
          <TimingChart items={items} />
        </View>
      </View>

      <TimingReadLine items={items} />

      <View style={s.statsRow} wrap={false}>
        <View style={s.statCell}>
          <Text style={s.statK}>Additional savings, year 1</Text>
          <Text style={s.statN}>{fmtFull(year1)}<Text style={s.statUnit}> / yr</Text></Text>
        </View>
        <View style={s.statCellMid}>
          <Text style={s.statK}>Captured sooner by acting</Text>
          <Text style={captured > 0 ? s.statNCoral : [s.statN, { color: C.faint }]}>{fmtFull(captured)}</Text>
        </View>
        <View style={s.statCellLast}>
          <Text style={s.statK}>Fully consolidated</Text>
          <Text style={s.statN}>{consolidated}</Text>
          {sooner > 0 && <Text style={s.statSub}>{`${sooner} mo earlier than ${renewalDateLabel(summary.renewalFinishMonths)}`}</Text>}
        </View>
      </View>

      <Text style={s.sechead} minPresenceAhead={50}>When each contract comes off</Text>
      <TimingTable items={items} />

      <InteriorFooter orgName={orgName} />
    </Page>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Page 4 · Why only Abridge (ArMoatView)
// ────────────────────────────────────────────────────────────────────────

function MoatChain({ items }: { items: AppRatItem[] }) {
  const tools = buildMoatTools(items);
  const hasTools = tools.length > 0;
  const bars = hasTools ? tools.map((t) => t.name) : ["Your capture tools"];

  const col = CW / 6;
  const TOOL_H = 22;
  const GAP = 6;
  const BAR_H = 34;
  const REGION_GAP = 12;
  const LABEL_H = 44;

  const toolsBlockH = bars.length * TOOL_H + (bars.length - 1) * GAP;
  const barTop = toolsBlockH + REGION_GAP;
  const labelTop = barTop + BAR_H + 10;
  const chainH = labelTop + LABEL_H;

  return (
    <View style={[s.chainRel, { height: chainH }]}>
      {/* Vertical gridlines behind the diagram */}
      <Svg width={CW} height={chainH} style={{ position: "absolute", left: 0, top: 0 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Line key={i} x1={col * i} y1={0} x2={col * i} y2={barTop + BAR_H} stroke="#EFE8DF" strokeWidth={1} />
        ))}
      </Svg>

      {/* Fold-in tool bars (Capture / Draft columns 3-4) */}
      {bars.map((name, i) => (
        <View
          key={i}
          style={[s.chainBox, {
            left: col * 2, width: col * 2, top: i * (TOOL_H + GAP), height: TOOL_H,
            backgroundColor: "#EFE7DC", borderWidth: 1, borderColor: "#E1D7C9",
          }]}
        >
          <Text style={s.chainToolText}>{name}</Text>
          <Text style={s.chainFold}>↓ folds in</Text>
        </View>
      ))}

      {/* Coverage row: dashed pre-charting · coral Abridge · dashed coding/quality */}
      <View style={[s.chainBox, {
        left: 0, width: col, top: barTop, height: BAR_H, alignItems: "center",
        borderWidth: 1.5, borderColor: "#F0B7A6", borderStyle: "dashed", backgroundColor: "#FBE7DF",
        borderTopLeftRadius: 8, borderBottomLeftRadius: 8, borderTopRightRadius: 0, borderBottomRightRadius: 0,
      }]}>
        <Text style={s.chainRegionText}>Pre-charting</Text>
        <Text style={s.chainRegionSmall}>expanding</Text>
      </View>
      <View style={[s.chainBox, {
        left: col, width: col * 3, top: barTop, height: BAR_H, backgroundColor: C.coral, borderRadius: 0,
      }]}>
        <Text style={s.chainAbText}>Abridge, from the conversation to the draft note</Text>
      </View>
      <View style={[s.chainBox, {
        left: col * 4, width: col * 2, top: barTop, height: BAR_H, alignItems: "center",
        borderWidth: 1.5, borderColor: "#F0B7A6", borderStyle: "dashed", backgroundColor: "#FBE7DF",
        borderTopRightRadius: 8, borderBottomRightRadius: 8, borderTopLeftRadius: 0, borderBottomLeftRadius: 0,
      }]}>
        <Text style={s.chainRegionText}>Coding · Quality</Text>
        <Text style={s.chainRegionSmall}>expanding</Text>
      </View>

      {/* Stage labels */}
      <View style={[{ position: "absolute", top: labelTop, left: 0, width: col - 4 }]}>
        <Text style={[s.stageLabelSoon, { position: "relative", left: 0, top: 0 }]}>Pre-charting</Text>
        <Text style={s.stageSub}>prep, from EMR data everyone has</Text>
      </View>
      <View style={[{ position: "absolute", top: labelTop, left: col, width: col - 4 }]}>
        <Text style={[s.stageLabel, { position: "relative", left: 0, top: 0 }]}>The conversation</Text>
        <Text style={s.stageSrcTag}>the source</Text>
      </View>
      <Text style={[s.stageLabel, { top: labelTop, left: col * 2 }]}>Capture</Text>
      <Text style={[s.stageLabel, { top: labelTop, left: col * 3 }]}>Draft note</Text>
      <Text style={[s.stageLabelSoon, { top: labelTop, left: col * 4 }]}>Coding</Text>
      <Text style={[s.stageLabelSoon, { top: labelTop, left: col * 5 }]}>Quality</Text>
    </View>
  );
}

function MoatPage({ items, orgName }: { items: AppRatItem[]; orgName: string }) {
  return (
    <Page size="LETTER" style={s.page}>
      <InteriorHeader />
      <Text style={s.eyebrow}>Why only Abridge</Text>
      <Text style={s.title} minPresenceAhead={60}>The stack folds into Abridge.</Text>
      <Text style={s.lead}>
        Each of these tools does one step of the note, and Abridge already covers those steps, so they fold in. A
        single-step tool has nothing for the rest to fold onto.
      </Text>

      <Text style={s.sechead}>The documentation chain, who covers what</Text>
      <MoatChain items={items} />

      <View style={s.moatBlock} wrap={false}>
        <Text style={s.moatK}>The moat</Text>
        <Text style={s.moatBig}>
          Price is a move any vendor can match in a year. Working from the conversation itself is not.{" "}
          <Text style={s.moatBigCoral}>That is why the stack folds onto Abridge, and not onto a tool that does one step.</Text>
        </Text>
      </View>

      <InteriorFooter orgName={orgName} />
    </Page>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Document + export
// ────────────────────────────────────────────────────────────────────────

export function buildAppRationalizationPDFDocument(
  items: AppRatItem[], orgName: string, abridgePrice: number, horizonYears: number,
): JSX.Element {
  void horizonYears; // the timing calendar is derived from the contracts themselves
  // Timing + moat only carry weight once at least one tool actually frees spend
  // (freed > 0 ⇔ buildCumulativeSavings has a curve). Otherwise it's Cover +
  // consolidation only, like the old file's conditional third page.
  const hasSavings = buildCumulativeSavings(items, 60).hasCurve;
  return (
    <Document title={`App Rationalization${orgName ? ` · ${orgName}` : ""}`}>
      <PDFCoverPage
        reportLabel="Forecast · App Rationalization"
        title="App Rationalization"
        subtitle="How your documentation stack folds onto the Abridge you already run."
        clientName={orgName || undefined}
        disclaimerText="Figures are directional estimates based on the inputs provided and are intended to support planning discussions. Actual savings depend on your contracts, adoption, and workflow. Not a commitment or guarantee of savings."
      />
      <ConsolidationPage items={items} orgName={orgName} abridgePrice={abridgePrice} />
      {hasSavings && <TimingPage items={items} orgName={orgName} />}
      {hasSavings && <MoatPage items={items} orgName={orgName} />}
    </Document>
  );
}

export async function generateAppRationalizationPDF(
  items: AppRatItem[], orgName: string, abridgePrice: number, horizonYears: number,
): Promise<void> {
  const doc = buildAppRationalizationPDFDocument(items, orgName, abridgePrice, horizonYears);
  const blob = await pdf(doc).toBlob();
  const org = (orgName || "partner").trim().replace(/\s+/g, "-").toLowerCase();
  await savePdfBlob(blob, `abridge-${org}-app-rationalization.pdf`);
}
