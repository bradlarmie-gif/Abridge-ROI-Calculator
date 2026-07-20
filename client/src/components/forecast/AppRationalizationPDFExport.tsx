// App Rationalization leave-behind PDF: three pages, built to the Financial
// Proforma's design language (eyebrow, Abridge display title, one dark hero KPI
// band per page, coral-left-rail insight box, dense hairline tables with side
// rails). Page 1 = the shared cover. Page 2 = the consolidation (waterfall +
// application list). Page 3 = the timing (cumulative-savings curve + a
// "Today / With Abridge" capability table). Built with @react-pdf/renderer.
// The cover is the shared PDFCoverPage (importing it also registers Abridge).
import { type ReactNode } from "react";
import { Document, Page, Text, View, StyleSheet, Svg, Rect, Line, Path, Circle, Image, Font, pdf } from "@react-pdf/renderer";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import { savePdfBlob } from "@/lib/pdf-save";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";
import abridgeLogoRed from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import {
  buildStackBars, computeNet, buildCumulativeSavings, cumulativeSavedAt, sunsetDateLabel,
  itemDisplayName, categoryLabel, itemRetired, type AppRatItem, type AppRatCategoryId,
} from "@/lib/appRationalizationCalc";

Font.registerHyphenationCallback((word) => [word]);
Font.register({ family: "Manrope", fonts: [{ src: manropeRegular, fontWeight: 400 }, { src: manropeBold, fontWeight: 700 }] });

const C = {
  coral: "#EA2C00", ink: "#1A1A1A", white: "#FFFFFF",
  warm: "#F8F7F6", light: "#F5F4F3", mid: "#E5E4E3", bord: "#D4D4D4",
  t2: "#6B7280", t3: "#9CA3AF", today: "#7E7263", stays: "#C6B9A2",
  heroBg: "#1A1A1A", heroDiv: "#2D2D2D", heroLab: "#8A8A8A", connector: "#C9BCA9", hair: "#E4DBCC",
};

// Warm taupe ramp; the same shade keys a tool across the waterfall stack, the
// stack-table rail, and the why-table rail, so a tool reads consistently.
const RAMP = ["#5A5148", "#7A6E60", "#8E8172", "#A2937F", "#B6A78F", "#C6B9A2"];
const shadeFor = (i: number) => RAMP[Math.min(i, RAMP.length - 1)];

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const short = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(a / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `$${Math.round(a / 1_000)}K`;
  return `$${Math.round(a)}`;
};

// Defensible per-capability "Today / With Abridge" copy (draft; legal-safe:
// capability + conditional, no "replaces"/"causes"). Refined by the team later.
const WHY_COPY: Record<AppRatCategoryId, { today: string; abridge: string }> = {
  ambientDoc:       { today: "Generates the note from the visit conversation.", abridge: "Abridge's core capability, generating the note across every encounter." },
  dictation:        { today: "Turns dictated speech into text in the chart.", abridge: "Captured directly by ambient documentation, reducing reliance on separate dictation." },
  scribe:           { today: "Human scribes draft the note during or after the visit.", abridge: "Drafted automatically at every visit, with no scribe to schedule." },
  cds:              { today: "Reference content clinicians look up mid-visit.", abridge: "Relevant context can surface within the documentation workflow." },
  clinicalEvidence: { today: "Literature and evidence clinicians search mid-visit.", abridge: "Relevant evidence can surface within the documentation workflow." },
  transcription:    { today: "Outsourced transcription of dictated audio.", abridge: "Captured directly by ambient documentation, reducing outsourced transcription." },
  preChartRisk:     { today: "Pre-visit review to surface risk and gaps.", abridge: "Risk and gaps can surface within the documentation workflow." },
  inEncounterCdi:   { today: "In-encounter prompts for documentation and coding.", abridge: "Documentation gaps can surface at the point of care." },
  postChartCoding:  { today: "Post-visit review to improve coding and documentation.", abridge: "Gaps can surface at the point of care; when teams act, fewer are caught downstream." },
  custom:           { today: "A documentation-adjacent tool in your stack.", abridge: "Consolidated into the Abridge platform." },
};

const CW = 516; // content width = 612 - 48*2

const s = StyleSheet.create({
  page: { fontFamily: "Manrope", fontSize: 10, color: C.ink, backgroundColor: C.white, paddingHorizontal: 48, paddingTop: 36, paddingBottom: 48 },

  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.mid, marginBottom: 16 },
  headerLogo: { height: 15 },
  headerMeta: { fontSize: 8, fontWeight: 700, color: C.t2, textTransform: "uppercase", letterSpacing: 1.5 },

  eyebrow: { fontSize: 8, fontWeight: 700, color: C.coral, letterSpacing: 2, textTransform: "uppercase", marginBottom: 5 },
  title: { fontFamily: "Abridge", fontSize: 20, color: C.ink, letterSpacing: 0.4, marginBottom: 5 },
  intro: { fontSize: 9.5, color: C.t2, lineHeight: 1.6, maxWidth: 470, marginBottom: 11 },

  heroBand: { backgroundColor: C.heroBg, borderRadius: 3, paddingVertical: 11, paddingHorizontal: 12, flexDirection: "row", marginBottom: 9 },
  heroMetric: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  heroVal: { fontSize: 20, fontWeight: 700, color: C.white, marginBottom: 3 },
  heroLab: { fontSize: 6.5, color: C.heroLab, textTransform: "uppercase", letterSpacing: 1.1, textAlign: "center" },
  heroDiv: { width: 1, backgroundColor: C.heroDiv },

  insight: { backgroundColor: C.light, paddingVertical: 10, paddingHorizontal: 14, borderLeftWidth: 3, borderLeftColor: C.coral, marginBottom: 10 },
  insightLab: { fontSize: 7.5, fontWeight: 700, color: C.coral, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 },
  insightTxt: { fontSize: 9.5, color: C.t2, lineHeight: 1.6 },
  insightEm: { color: C.ink, fontWeight: 700 },

  wfLabels: { flexDirection: "row", paddingHorizontal: 6, marginTop: 4 },
  wfLab: { flex: 1, fontSize: 7, color: C.t3, textAlign: "center", paddingHorizontal: 2 },
  wfLabEdge: { flex: 1, fontSize: 7, fontWeight: 700, color: C.ink, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.5 },
  wfBracket: { fontSize: 8.5, fontWeight: 700, color: C.coral, textAlign: "center", marginTop: 5 },
  wfVal: { position: "absolute", width: 84, textAlign: "center", fontSize: 9, fontWeight: 700, color: C.ink },
  wfValStep: { position: "absolute", width: 84, textAlign: "center", fontSize: 8, fontWeight: 700, color: C.coral },

  sechead: { fontSize: 8, fontWeight: 700, color: C.t3, letterSpacing: 2, textTransform: "uppercase", marginTop: 2, marginBottom: 8 },
  tableWrap: { borderWidth: 1, borderColor: C.mid, borderRadius: 3, overflow: "hidden" },
  thead: { flexDirection: "row", backgroundColor: C.light, paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.mid },
  thcell: { fontSize: 7, fontWeight: 700, color: C.t2, textTransform: "uppercase", letterSpacing: 0.5 },
  trow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.mid },
  trowZebra: { backgroundColor: C.warm },
  trowTotal: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 10, backgroundColor: C.light, borderTopWidth: 1, borderTopColor: C.bord },
  colName: { flexDirection: "row", alignItems: "center" },
  rail: { width: 3, height: 22, borderRadius: 1, marginRight: 8 },
  tname: { fontSize: 9, fontWeight: 700, color: C.ink },
  tcap: { fontSize: 7, color: C.t3, marginTop: 1 },
  tcell: { fontSize: 9, color: C.ink },
  tcellCoral: { fontSize: 9, fontWeight: 700, color: C.coral },
  tcellMuted: { fontSize: 9, color: C.t2 },
  whycell: { fontSize: 8.5, color: C.ink, lineHeight: 1.4, paddingRight: 10 },
  whycellMuted: { fontSize: 8.5, color: C.t2, lineHeight: 1.4, paddingRight: 10 },

  curveXlab: { position: "absolute", fontSize: 7, fontWeight: 700, color: C.t3, textAlign: "center", width: 40 },
  curveEndK: { fontSize: 6.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" },
  curveEndV: { fontSize: 11, fontWeight: 700, marginTop: 1 },

  footer: { position: "absolute", bottom: 20, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: C.mid, paddingTop: 7 },
  footL: { fontSize: 7.5, color: C.t3 },
  footR: { fontSize: 7.5, fontWeight: 700, color: C.t2 },
});

function PageHeader({ meta }: { meta: string }) {
  return (
    <View style={s.pageHeader}>
      <Image src={abridgeLogoRed} style={s.headerLogo} />
      <Text style={s.headerMeta}>{meta}</Text>
    </View>
  );
}

function Footer({ page, total, orgName }: { page: number; total: number; orgName: string }) {
  return (
    <View style={s.footer}>
      <Text style={s.footL}>{`Prepared for ${orgName || "Prospective partner"}`}</Text>
      <Text style={s.footR}>{`Page ${page} of ${total}`}</Text>
    </View>
  );
}

type Metric = { v: string; l: string; coral?: boolean };
function HeroBand({ metrics }: { metrics: Metric[] }) {
  const kids: JSX.Element[] = [];
  metrics.forEach((m, i) => {
    if (i > 0) kids.push(<View key={`d${i}`} style={s.heroDiv} />);
    kids.push(
      <View key={i} style={s.heroMetric}>
        <Text style={m.coral ? [s.heroVal, { color: C.coral }] : s.heroVal}>{m.v}</Text>
        <Text style={s.heroLab}>{m.l}</Text>
      </View>,
    );
  });
  return <View style={s.heroBand}>{kids}</View>;
}

function Insight({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={s.insight}>
      <Text style={s.insightLab}>{label}</Text>
      <Text style={s.insightTxt}>{children}</Text>
    </View>
  );
}

function Waterfall({ items }: { items: AppRatItem[] }) {
  const bars = buildStackBars(items);
  const W = CW, H = 118, TOP = 14, BASE = 108, LEFT = 6, RIGHT = 510;
  const total = Math.max(1, bars.stackTotal);
  const k = (BASE - TOP) / total;
  const yOf = (v: number) => BASE - v * k;
  const stepTools = bars.tools.filter((t) => t.sunset > 0);
  const n = 2 + stepTools.length;
  const slot = (RIGHT - LEFT) / n;
  const bw = Math.min(42, slot * 0.5);
  const half = bw / 2;
  const cx = (i: number) => LEFT + slot * (i + 0.5);

  const segs: JSX.Element[] = [];
  let cur = bars.stackTotal;
  bars.tools.forEach((t, i) => {
    const yT = yOf(cur), yB = yOf(cur - t.spend); cur -= t.spend;
    segs.push(<Rect key={`seg-${i}`} x={cx(0) - half} y={yT} width={bw} height={Math.max(1, yB - yT)} fill={shadeFor(i)} stroke={C.white} strokeWidth={1.5} />);
  });

  const steps: JSX.Element[] = [];
  const conns: JSX.Element[] = [];
  const stepVals: JSX.Element[] = [];
  let run = bars.stackTotal;
  stepTools.forEach((t, i) => {
    const before = run; run -= t.sunset;
    const xi = cx(1 + i);
    const prevX = i === 0 ? cx(0) : cx(i);
    conns.push(<Line key={`c-${i}`} x1={prevX + half} y1={yOf(before)} x2={xi - half} y2={yOf(before)} stroke={C.connector} strokeWidth={1} strokeDasharray="3 3" />);
    steps.push(<Rect key={`st-${i}`} x={xi - half} y={yOf(before)} width={bw} height={Math.max(2, yOf(run) - yOf(before))} rx={2} fill={C.coral} />);
    stepVals.push(<Text key={`sv-${i}`} style={[s.wfValStep, { left: xi - 42, top: yOf(before) - 11 }]}>{`−${short(t.sunset)}`}</Text>);
  });

  const sx = cx(n - 1);
  conns.push(<Line key="c-stays" x1={cx(n - 2) + half} y1={yOf(bars.stays)} x2={sx - half} y2={yOf(bars.stays)} stroke={C.connector} strokeWidth={1} strokeDasharray="3 3" />);
  const staysRect = <Rect x={sx - half} y={yOf(bars.stays)} width={bw} height={BASE - yOf(bars.stays)} rx={2} fill={C.stays} />;

  return (
    <View style={{ position: "relative", marginTop: 4 }}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Line x1={LEFT} y1={BASE} x2={RIGHT} y2={BASE} stroke={C.bord} strokeWidth={1} />
        {segs}
        {conns}
        {steps}
        {staysRect}
      </Svg>
      <Text style={[s.wfVal, { left: cx(0) - 42, top: yOf(bars.stackTotal) - 12 }]}>{short(bars.stackTotal)}</Text>
      {stepVals}
      <Text style={[s.wfVal, { left: sx - 42, top: yOf(bars.stays) - 12 }]}>{short(bars.stays)}</Text>
      <View style={s.wfLabels}>
        <Text style={s.wfLabEdge}>Today</Text>
        {stepTools.map((t) => <Text key={t.id} style={s.wfLab}>{t.name}</Text>)}
        <Text style={s.wfLabEdge}>Stays</Text>
      </View>
      {bars.sunset > 0 && <Text style={s.wfBracket}>{`${short(bars.sunset)} sunsets onto Abridge`}</Text>}
    </View>
  );
}

function CumulativeCurve({ items, termYears }: { items: AppRatItem[]; termYears: number }) {
  const horizon = termYears * 12;
  const cs = buildCumulativeSavings(items, horizon);
  const W = CW, H = 152, PL = 6, PR = 396, TOP = 10, BASE = 128;
  const maxY = Math.max(1, cs.nowTotal) * 1.06;
  const X = (m: number) => PL + (m / horizon) * (PR - PL);
  const Y = (v: number) => BASE - (v / maxY) * (BASE - TOP);
  const d = (mode: "plan" | "now") => {
    let p = "";
    for (let m = 0; m <= horizon; m++) p += `${m ? "L" : "M"} ${X(m).toFixed(1)} ${Y(cumulativeSavedAt(cs.tools, m, mode)).toFixed(1)} `;
    return p.trim();
  };
  const yearMarks = Array.from({ length: termYears }, (_, i) => (i + 1) * 12);

  return (
    <View style={{ position: "relative", marginTop: 2, marginBottom: 8 }}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Line x1={PL} y1={BASE} x2={PR + 110} y2={BASE} stroke={C.bord} strokeWidth={1} />
        {yearMarks.map((m) => <Line key={m} x1={X(m)} y1={TOP} x2={X(m)} y2={BASE} stroke="#EFEEEC" strokeDasharray="2 3" />)}
        <Path d={`${d("plan")} L ${X(horizon).toFixed(1)} ${BASE} L ${X(0).toFixed(1)} ${BASE} Z`} fill="rgba(234,44,0,0.08)" />
        <Path d={d("now")} stroke={C.stays} strokeWidth={1.5} strokeDasharray="5 4" fill="none" />
        <Path d={d("plan")} stroke={C.coral} strokeWidth={2.2} fill="none" />
        <Circle cx={X(horizon)} cy={Y(cs.planTotal)} r={3.2} fill={C.coral} />
        <Circle cx={X(horizon)} cy={Y(cs.nowTotal)} r={2.8} fill={C.stays} />
      </Svg>
      <Text style={[s.curveXlab, { left: X(0) - 2, top: BASE + 4, width: 40, textAlign: "left" }]}>TODAY</Text>
      {yearMarks.map((m, i) => <Text key={m} style={[s.curveXlab, { left: X(m) - 20, top: BASE + 4 }]}>{`YEAR ${i + 1}`}</Text>)}
      <View style={{ position: "absolute", left: PR + 10, top: Y(cs.nowTotal) - 9 }}>
        <Text style={[s.curveEndK, { color: C.stays }]}>If you moved now</Text>
        <Text style={[s.curveEndV, { color: C.stays }]}>{short(cs.nowTotal)}</Text>
      </View>
      <View style={{ position: "absolute", left: PR + 10, top: Y(cs.planTotal) - 9 }}>
        <Text style={[s.curveEndK, { color: C.t3 }]}>Your plan</Text>
        <Text style={[s.curveEndV, { color: C.coral }]}>{short(cs.planTotal)}</Text>
      </View>
    </View>
  );
}

const COL = { app: 2.6, spend: 1.2, disp: 0.9, value: 1.2, time: 1.1 };

function StackTable({ items, net }: { items: AppRatItem[]; net: ReturnType<typeof computeNet> }) {
  const rows = items.filter((i) => (i.annualSpend || 0) > 0);
  return (
    <View style={s.tableWrap}>
      <View style={s.thead}>
        <Text style={[s.thcell, { flex: COL.app }]}>Application</Text>
        <Text style={[s.thcell, { flex: COL.spend, textAlign: "right" }]}>Annual spend</Text>
        <Text style={[s.thcell, { flex: COL.disp, textAlign: "right" }]}>Displaced</Text>
        <Text style={[s.thcell, { flex: COL.value, textAlign: "right" }]}>Sunset value</Text>
        <Text style={[s.thcell, { flex: COL.time, textAlign: "right" }]}>Sunsets</Text>
      </View>
      {rows.map((it, i) => (
        <View key={it.id} style={i % 2 === 1 ? [s.trow, s.trowZebra] : s.trow}>
          <View style={[s.colName, { flex: COL.app }]}>
            <View style={[s.rail, { backgroundColor: shadeFor(i) }]} />
            <View>
              <Text style={s.tname}>{itemDisplayName(it)}</Text>
              <Text style={s.tcap}>{categoryLabel(it.category)}</Text>
            </View>
          </View>
          <Text style={[s.tcell, { flex: COL.spend, textAlign: "right" }]}>{money(it.annualSpend)}</Text>
          <Text style={[s.tcellMuted, { flex: COL.disp, textAlign: "right" }]}>{`${it.coveragePct}%`}</Text>
          <Text style={[s.tcellCoral, { flex: COL.value, textAlign: "right" }]}>{money(itemRetired(it))}</Text>
          <Text style={[s.tcellMuted, { flex: COL.time, textAlign: "right" }]}>{sunsetDateLabel(it.sunsetMonths)}</Text>
        </View>
      ))}
      <View style={s.trowTotal}>
        <Text style={[s.tname, { flex: COL.app }]}>Total</Text>
        <Text style={[s.tcell, { flex: COL.spend, textAlign: "right", fontWeight: 700 }]}>{money(net.stackTotal)}</Text>
        <Text style={{ flex: COL.disp }}> </Text>
        <Text style={[s.tcellCoral, { flex: COL.value, textAlign: "right" }]}>{money(net.sunset)}</Text>
        <Text style={{ flex: COL.time }}> </Text>
      </View>
    </View>
  );
}

function WhyTable({ items }: { items: AppRatItem[] }) {
  const rows = items.filter((i) => (i.annualSpend || 0) > 0);
  return (
    <View style={s.tableWrap}>
      <View style={s.thead}>
        <Text style={[s.thcell, { flex: 1.5 }]}>Capability</Text>
        <Text style={[s.thcell, { flex: 1.6 }]}>Today</Text>
        <Text style={[s.thcell, { flex: 1.9 }]}>With Abridge</Text>
      </View>
      {rows.map((it, i) => {
        const copy = WHY_COPY[it.category] ?? WHY_COPY.custom;
        const vendor = it.vendorName?.trim();
        return (
          <View key={it.id} style={i % 2 === 1 ? [s.trow, s.trowZebra] : s.trow}>
            <View style={[s.colName, { flex: 1.5 }]}>
              <View style={[s.rail, { backgroundColor: shadeFor(i) }]} />
              <View>
                <Text style={s.tname}>{categoryLabel(it.category)}</Text>
                {vendor ? <Text style={s.tcap}>{vendor}</Text> : null}
              </View>
            </View>
            <Text style={[s.whycellMuted, { flex: 1.6 }]}>{copy.today}</Text>
            <Text style={[s.whycell, { flex: 1.9 }]}>{copy.abridge}</Text>
          </View>
        );
      })}
    </View>
  );
}

function ConsolidationPage({ items, orgName, abridgePrice, totalPages }: {
  items: AppRatItem[]; orgName: string; abridgePrice: number; totalPages: number;
}) {
  const net = computeNet(items, abridgePrice);
  const n = items.filter((i) => (i.annualSpend || 0) > 0).length;
  const metrics: Metric[] = [
    { v: short(net.stackTotal), l: "Stack today" },
    { v: short(net.sunset), l: "Sunsets onto Abridge", coral: true },
    { v: short(net.abridgePrice), l: "Abridge price / yr" },
    { v: short(Math.abs(net.netSavings)), l: net.isNetCost ? "Net cost / yr" : "Net savings / yr", coral: !net.isNetCost },
  ];
  return (
    <Page size="LETTER" style={s.page} wrap={false}>
      <PageHeader meta={`Consolidation · ${orgName || "Prospective partner"}`} />
      <Text style={s.eyebrow}>The consolidation</Text>
      <Text style={s.title}>Your stack, consolidated onto Abridge</Text>
      <Text style={s.intro}>{`${n} documentation-adjacent tools cost ${short(net.stackTotal)} a year today. Most of that work overlaps what Abridge already does, so it consolidates onto one platform.`}</Text>

      <HeroBand metrics={metrics} />
      <Waterfall items={items} />

      <Insight label="What changes">
        {`${n} vendors, ${n} contracts, and ${n} renewal cycles become `}
        <Text style={s.insightEm}>one platform on a single agreement</Text>
        {". Fewer integrations to maintain, one roadmap to plan against, and one team to hold accountable."}
      </Insight>

      <Text style={s.sechead}>Your stack</Text>
      <StackTable items={items} net={net} />

      <Footer page={2} total={totalPages} orgName={orgName} />
    </Page>
  );
}

function TimingPage({ items, orgName, termYears, totalPages }: {
  items: AppRatItem[]; orgName: string; termYears: number; totalPages: number;
}) {
  const cs = buildCumulativeSavings(items, termYears * 12);
  const maxSunset = cs.tools.reduce((m, t) => Math.max(m, t.sunsetMonths), 0);
  const metrics: Metric[] = [
    { v: short(cs.planTotal), l: `Your plan · captured over ${termYears} yrs`, coral: true },
    { v: short(cs.nowTotal), l: "If you moved now" },
    { v: short(cs.gap), l: "Sooner, if you act early" },
    { v: sunsetDateLabel(maxSunset), l: "Fully consolidated" },
  ];
  return (
    <Page size="LETTER" style={s.page} wrap={false}>
      <PageHeader meta={`The timing · ${orgName || "Prospective partner"}`} />
      <Text style={s.eyebrow}>The timing</Text>
      <Text style={s.title}>Cumulative savings, over time</Text>
      <Text style={s.intro}>Each tool starts saving the moment it sunsets. The earlier a contract comes off, the more you capture over the next three years.</Text>

      <HeroBand metrics={metrics} />
      <CumulativeCurve items={items} termYears={termYears} />

      <Insight label="The read">
        {`Moving the earliest renewals forward captures about `}
        <Text style={s.insightEm}>{`${short(cs.gap)} more`}</Text>
        {` over ${termYears} years. The plan follows your own contract calendar, so nothing has to move all at once.`}
      </Insight>

      <Text style={s.sechead}>Why each capability consolidates onto Abridge</Text>
      <WhyTable items={items} />

      <Footer page={3} total={totalPages} orgName={orgName} />
    </Page>
  );
}

export function buildAppRationalizationPDFDocument(
  items: AppRatItem[], orgName: string, abridgePrice: number, termYears: number,
): JSX.Element {
  const cs = buildCumulativeSavings(items, termYears * 12);
  const totalPages = cs.hasCurve ? 3 : 2;
  return (
    <Document title={`App Rationalization${orgName ? ` · ${orgName}` : ""}`}>
      <PDFCoverPage
        reportLabel="App Rationalization"
        title="Consolidation Analysis"
        subtitle="What your documentation-adjacent stack costs today, and how much of it consolidates onto Abridge."
        clientName={orgName || undefined}
        disclaimerText="Figures are directional estimates based on the inputs provided and are intended to support planning discussions. Actual results depend on adoption, contracts, and workflow. Not a commitment or guarantee of savings."
      />
      <ConsolidationPage items={items} orgName={orgName} abridgePrice={abridgePrice} totalPages={totalPages} />
      {cs.hasCurve && <TimingPage items={items} orgName={orgName} termYears={termYears} totalPages={totalPages} />}
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
