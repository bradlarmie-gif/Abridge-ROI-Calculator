// App Rationalization leave-behind PDF: two pages, the shared cover, then one
// complete page (the consolidation waterfall, the "how it rolls out" beat, and
// the itemized stack). Built with @react-pdf/renderer to match the other ROI PDFs.
// The cover is the shared PDFCoverPage (importing it also registers Abridge).
import { Document, Page, Text, View, StyleSheet, Svg, Rect, Line, Path, Font, pdf } from "@react-pdf/renderer";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import { savePdfBlob } from "@/lib/pdf-save";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";
import {
  buildStackBars, computeNet, buildCumulativeSavings, cumulativeSavedAt, sunsetDateLabel,
  itemDisplayName, categoryLabel, itemRetired, type AppRatItem,
} from "@/lib/appRationalizationCalc";

Font.registerHyphenationCallback((word) => [word]);
Font.register({ family: "Manrope", fonts: [{ src: manropeRegular, fontWeight: 400 }, { src: manropeBold, fontWeight: 700 }] });

const C = {
  coral: "#EA2C00", ink: "#1A1A1A", t2: "#6B7280", t3: "#9CA3AF",
  today: "#7E7263", stays: "#C6B9A2", statement: "#3A342E",
  light: "#F5F4F3", mid: "#E5E4E3", hair: "#E4DBCC", connector: "#C9BCA9", white: "#FFFFFF",
};

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const short = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `$${Math.round(a / 1_000)}K`;
  return `$${Math.round(a)}`;
};

const s = StyleSheet.create({
  page: { fontFamily: "Manrope", fontSize: 10, color: C.ink, backgroundColor: C.white, paddingHorizontal: 48, paddingTop: 40, paddingBottom: 40 },

  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  eyebrow: { fontSize: 8, fontWeight: 700, color: C.coral, letterSpacing: 2, textTransform: "uppercase" },
  headline: { fontFamily: "Abridge", fontSize: 22, color: C.ink, marginTop: 7, letterSpacing: -0.3 },
  subline: { fontSize: 9.5, color: C.t2, marginTop: 6 },
  netLabel: { fontSize: 7.5, fontWeight: 700, color: C.t3, letterSpacing: 1.4, textTransform: "uppercase", textAlign: "right" },
  netValue: { fontSize: 26, fontWeight: 700, color: C.coral, letterSpacing: -0.3, textAlign: "right", marginTop: 2 },
  netValueInk: { fontSize: 26, fontWeight: 700, color: C.ink, letterSpacing: -0.3, textAlign: "right", marginTop: 2 },

  wfWrap: { position: "relative", marginTop: 20, height: 152 },
  wfSunset: { position: "absolute", fontSize: 8.5, fontWeight: 700, color: C.coral, textAlign: "center" },
  wfColVal: { fontSize: 9, fontWeight: 700, color: C.ink, textAlign: "center" },
  wfColStep: { fontSize: 8, fontWeight: 700, color: C.coral, textAlign: "center" },
  wfColCap: { fontSize: 7, color: C.t3, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.3, marginTop: 1 },

  coiWrap: { marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: C.mid },
  coiEyebrow: { fontSize: 8, fontWeight: 700, color: C.t3, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 },
  coiEnds: { flexDirection: "row", gap: 24, marginTop: 8 },
  coiEndK: { fontSize: 7, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" },
  coiEndV: { fontSize: 11.5, fontWeight: 700, marginTop: 1 },
  coiEndNote: { fontSize: 8, fontWeight: 400, color: C.t2, marginTop: 1 },

  sec: { fontSize: 8, fontWeight: 700, color: C.t3, letterSpacing: 2, textTransform: "uppercase", marginTop: 26, marginBottom: 10 },
  tHead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.mid, paddingBottom: 8, paddingHorizontal: 4 },
  tHeadCell: { fontSize: 7, fontWeight: 700, color: C.t3, letterSpacing: 1, textTransform: "uppercase" },
  tRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.light, paddingVertical: 10, paddingHorizontal: 4 },
  tName: { fontSize: 9.5, fontWeight: 700, color: C.ink },
  tCap: { fontSize: 8, color: C.t3, marginTop: 1 },
  tCell: { fontSize: 9.5, color: C.ink },
  tCoral: { fontSize: 9.5, fontWeight: 700, color: C.coral },
  tWhen: { fontSize: 9, color: C.t2 },
  tFoot: { flexDirection: "row", alignItems: "center", borderTopWidth: 1.5, borderTopColor: C.ink, paddingVertical: 11, paddingHorizontal: 4 },
  tFootCell: { fontSize: 9.5, fontWeight: 700, color: C.ink },
  tFootCoral: { fontSize: 9.5, fontWeight: 700, color: C.coral },

  footer: { marginTop: "auto", flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.mid, paddingTop: 9 },
  fL: { fontSize: 7.5, color: C.coral, fontWeight: 700, letterSpacing: 0.4 },
  fC: { fontSize: 7.5, color: C.t2 },
  fR: { fontSize: 7.5, color: C.t3, fontWeight: 700 },
});

// column widths (fractions of the content row)
const COL = { app: "35%", spend: "17%", disp: "12%", value: "18%", time: "18%" };

function Waterfall({ items }: { items: AppRatItem[] }) {
  const bars = buildStackBars(items);
  const W = 516, H = 150, TOP = 14, BASE = 118, LEFT = 6, RIGHT = 510;
  const total = Math.max(1, bars.stackTotal);
  const k = (BASE - TOP) / total;
  const yOf = (v: number) => BASE - v * k;
  const stepTools = bars.tools.filter((t) => t.sunset > 0);
  const n = 2 + stepTools.length;
  const slot = (RIGHT - LEFT) / n;
  const bw = Math.min(38, slot * 0.5);
  const half = bw / 2;
  const cx = (i: number) => LEFT + slot * (i + 0.5);

  // today composed stack (segments by spend)
  const segs: JSX.Element[] = [];
  let cur = bars.stackTotal;
  bars.tools.forEach((t, i) => {
    const yT = yOf(cur), yB = yOf(cur - t.spend); cur -= t.spend;
    segs.push(<Rect key={`seg-${i}`} x={cx(0) - half} y={yT} width={bw} height={Math.max(1, yB - yT)} fill={C.today} stroke={C.white} strokeWidth={1.5} />);
  });

  // coral decrement steps + dashed connectors
  const steps: JSX.Element[] = [];
  const conns: JSX.Element[] = [];
  let run = bars.stackTotal;
  stepTools.forEach((t, i) => {
    const before = run; run -= t.sunset;
    const xi = cx(1 + i);
    const prevX = i === 0 ? cx(0) : cx(i);
    conns.push(<Line key={`c-${i}`} x1={prevX + half} y1={yOf(before)} x2={xi - half} y2={yOf(before)} stroke={C.connector} strokeWidth={1} strokeDasharray="3 3" />);
    steps.push(<Rect key={`st-${i}`} x={xi - half} y={yOf(before)} width={bw} height={Math.max(2, yOf(run) - yOf(before))} rx={2} fill={C.coral} />);
  });
  // stays bar
  const sx = cx(n - 1);
  conns.push(<Line key="c-stays" x1={cx(n - 2) + half} y1={yOf(bars.stays)} x2={sx - half} y2={yOf(bars.stays)} stroke={C.connector} strokeWidth={1} strokeDasharray="3 3" />);
  const staysRect = <Rect x={sx - half} y={yOf(bars.stays)} width={bw} height={BASE - yOf(bars.stays)} rx={2} fill={C.stays} />;

  // labels
  const lab = (left: number) => ({ position: "absolute" as const, left: left - 42, top: 122, width: 84 });
  const stepLabels = stepTools.map((t, i) => (
    <View key={`l-${i}`} style={lab(cx(1 + i))}>
      <Text style={s.wfColStep}>{`−${short(t.sunset)}`}</Text>
      <Text style={s.wfColCap}>{t.name}</Text>
    </View>
  ));
  const sunsetX = (cx(1) + cx(Math.max(1, stepTools.length))) / 2;

  return (
    <View style={s.wfWrap}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Line x1={LEFT} y1={BASE} x2={RIGHT} y2={BASE} stroke={C.hair} strokeWidth={1} />
        {segs}
        {conns}
        {steps}
        {staysRect}
      </Svg>
      <Text style={[s.wfSunset, { left: sunsetX - 100, top: 0, width: 200 }]}>{`${short(bars.sunset)} sunsets onto Abridge`}</Text>
      <View style={lab(cx(0))}><Text style={s.wfColVal}>{short(bars.stackTotal)}</Text><Text style={s.wfColCap}>today</Text></View>
      {stepLabels}
      <View style={lab(cx(n - 1))}><Text style={s.wfColVal}>{short(bars.stays)}</Text><Text style={s.wfColCap}>stays</Text></View>
    </View>
  );
}

// The "when" story as a quiet static curve: cumulative savings under the plan
// against the ceiling if every tool moved today. Mirrors the on-screen timing view.
function CumulativeSavings({ items, termYears }: { items: AppRatItem[]; termYears: number }) {
  const horizon = termYears * 12;
  const cs = buildCumulativeSavings(items, horizon);
  if (!cs.hasCurve) return null;
  const W = 516, H = 124, TOP = 8, BASE = 104, LEFT = 6, RIGHT = 430; // right gutter for labels
  const maxY = Math.max(1, cs.nowTotal) * 1.06;
  const X = (m: number) => LEFT + (m / horizon) * (RIGHT - LEFT);
  const Y = (v: number) => BASE - (v / maxY) * (BASE - TOP);
  const d = (mode: "plan" | "now") => {
    let p = "";
    for (let m = 0; m <= horizon; m++) p += `${m ? "L" : "M"} ${X(m).toFixed(1)} ${Y(cumulativeSavedAt(cs.tools, m, mode)).toFixed(1)} `;
    return p.trim();
  };
  return (
    <View style={s.coiWrap}>
      <Text style={s.coiEyebrow}>Cumulative savings, over time</Text>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Line x1={LEFT} y1={BASE} x2={RIGHT + 80} y2={BASE} stroke={C.hair} strokeWidth={1} />
        <Path d={`${d("plan")} L ${X(horizon).toFixed(1)} ${BASE} L ${X(0).toFixed(1)} ${BASE} Z`} fill="rgba(234,44,0,0.08)" />
        <Path d={d("now")} stroke={C.stays} strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
        <Path d={d("plan")} stroke={C.coral} strokeWidth={2} fill="none" />
      </Svg>
      <View style={s.coiEnds}>
        <View>
          <Text style={[s.coiEndK, { color: C.t3 }]}>If you moved now</Text>
          <Text style={[s.coiEndV, { color: C.t3 }]}>{short(cs.nowTotal)}</Text>
        </View>
        <View>
          <Text style={[s.coiEndK, { color: C.coral }]}>Your plan</Text>
          <Text style={[s.coiEndV, { color: C.coral }]}>{short(cs.planTotal)}</Text>
          <Text style={s.coiEndNote}>{`captured over ${termYears} yrs`}</Text>
        </View>
      </View>
    </View>
  );
}

function ContentPage({ items, orgName, abridgePrice, termYears, dateStr }: {
  items: AppRatItem[]; orgName: string; abridgePrice: number; termYears: number; dateStr: string;
}) {
  const net = computeNet(items, abridgePrice);
  const rows = items.filter((i) => (i.annualSpend || 0) > 0);

  return (
    <Page size="LETTER" style={s.page} wrap={false}>
      <View style={s.head}>
        <View>
          <Text style={s.eyebrow}>Consolidation</Text>
          <Text style={s.headline}>Your stack, consolidated onto Abridge</Text>
          <Text style={s.subline}>{`${short(net.stackTotal)} across these tools today · ${short(net.stays)} stays`}</Text>
        </View>
        <View>
          <Text style={s.netLabel}>{net.isNetCost ? "Net cost / yr" : "Net savings / yr"}</Text>
          <Text style={net.isNetCost ? s.netValueInk : s.netValue}>{short(Math.abs(net.netSavings))}</Text>
        </View>
      </View>

      <Waterfall items={items} />

      <CumulativeSavings items={items} termYears={termYears} />

      <Text style={s.sec}>Your stack</Text>
      <View style={s.tHead}>
        <Text style={[s.tHeadCell, { width: COL.app }]}>Application</Text>
        <Text style={[s.tHeadCell, { width: COL.spend, textAlign: "right" }]}>Annual spend</Text>
        <Text style={[s.tHeadCell, { width: COL.disp, textAlign: "right" }]}>Displaced</Text>
        <Text style={[s.tHeadCell, { width: COL.value, textAlign: "right" }]}>Sunset value</Text>
        <Text style={[s.tHeadCell, { width: COL.time, paddingLeft: 18 }]}>Timeline</Text>
      </View>
      {rows.map((it) => (
        <View key={it.id} style={s.tRow}>
          <View style={{ width: COL.app }}>
            <Text style={s.tName}>{itemDisplayName(it)}</Text>
            <Text style={s.tCap}>{categoryLabel(it.category)}</Text>
          </View>
          <Text style={[s.tCell, { width: COL.spend, textAlign: "right" }]}>{money(it.annualSpend)}</Text>
          <Text style={[s.tCell, { width: COL.disp, textAlign: "right", color: C.t2 }]}>{`${it.coveragePct}%`}</Text>
          <Text style={[s.tCoral, { width: COL.value, textAlign: "right" }]}>{money(itemRetired(it))}</Text>
          <Text style={[s.tWhen, { width: COL.time, paddingLeft: 18 }]}>{sunsetDateLabel(it.sunsetMonths)}</Text>
        </View>
      ))}
      <View style={s.tFoot}>
        <Text style={[s.tFootCell, { width: COL.app }]}>Total</Text>
        <Text style={[s.tFootCell, { width: COL.spend, textAlign: "right" }]}>{money(net.stackTotal)}</Text>
        <Text style={{ width: COL.disp }}> </Text>
        <Text style={[s.tFootCoral, { width: COL.value, textAlign: "right" }]}>{money(net.sunset)}</Text>
        <Text style={{ width: COL.time }}> </Text>
      </View>

      <View style={s.footer}>
        <Text style={s.fL}>ABRIDGE · APP RATIONALIZATION</Text>
        <Text style={s.fC}>{`${orgName || "Prospective partner"} · Generated ${dateStr}`}</Text>
        <Text style={s.fR}>Page 2 of 2</Text>
      </View>
    </Page>
  );
}

export function buildAppRationalizationPDFDocument(
  items: AppRatItem[], orgName: string, abridgePrice: number, termYears: number,
): JSX.Element {
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return (
    <Document title={`App Rationalization${orgName ? ` · ${orgName}` : ""}`}>
      <PDFCoverPage
        reportLabel="App Rationalization"
        title="Consolidation Analysis"
        subtitle="What your documentation-adjacent stack costs today, and how much of it consolidates onto Abridge."
        clientName={orgName || undefined}
        disclaimerText="Figures are directional estimates based on the inputs provided and are intended to support planning discussions. Actual results depend on adoption, contracts, and workflow. Not a commitment or guarantee of savings."
      />
      <ContentPage items={items} orgName={orgName} abridgePrice={abridgePrice} termYears={termYears} dateStr={dateStr} />
    </Document>
  );
}

export async function generateAppRationalizationPDF(
  items: AppRatItem[], orgName: string, abridgePrice: number, termYears: number,
): Promise<void> {
  const doc = buildAppRationalizationPDFDocument(items, orgName, abridgePrice, termYears);
  const blob = await pdf(doc).toBlob();
  const org = (orgName || "partner").trim().replace(/\s+/g, "-").toLowerCase();
  await savePdfBlob(blob, `abridge-${org}-app-rationalization.pdf`);
}
