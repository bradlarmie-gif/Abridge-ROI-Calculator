import { Document, Page, Text, View, StyleSheet, Font, pdf } from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import manropeRegular from "../../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../../assets/fonts/manrope-bold.ttf";
import abridgeFont from "../../../assets/fonts/abridge.otf";
import { buildFromSnapshot, type PlanCat } from "./attainPdfData";
import { loadSnapshot, loadPlanByName, type AttainSnapshot } from "../attainStorage";
import type { PdfData } from "./AttainPdfPage1";

/**
 * The Attain PDF as a real @react-pdf document, matching every other export in the app:
 * the shared PDFCoverPage ("A" cover) first, then the case page, then one page per
 * category. generateAttainPDF() renders it to a blob and downloads it to the device.
 */

Font.register({ family: "Manrope", fonts: [{ src: manropeRegular, fontWeight: 400 }, { src: manropeBold, fontWeight: 700 }] });
Font.register({ family: "Abridge", src: abridgeFont });
Font.registerHyphenationCallback((w) => [w]);

const C = { bg: "#FDFCFA", coral: "#EA2C00", ink: "#1A1A1A", body: "#3A3A3A", gray: "#8C8C8C", muted: "#B4A896", hair: "#EFEAE1", tan: "#FAF7F2", tanLine: "#E8E1D6", dark: "#1A1A1A" };

const fmt$ = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${Math.round(n)}`);

const s = StyleSheet.create({
  page: { padding: 48, paddingBottom: 42, fontFamily: "Manrope", fontSize: 10, color: C.body, backgroundColor: C.bg },
  mast: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 1, borderBottomColor: C.hair, paddingBottom: 12, marginBottom: 18 },
  mastLabel: { fontSize: 8.5, letterSpacing: 2, color: C.gray, textTransform: "uppercase", fontWeight: 700 },
  mastPartner: { fontSize: 12, fontFamily: "Abridge", color: C.ink, textAlign: "right" },
  mastMeta: { fontSize: 8.5, color: C.gray, marginTop: 2, textAlign: "right" },
  label: { fontSize: 8.5, letterSpacing: 2, color: C.gray, textTransform: "uppercase", fontWeight: 700 },
  hero: { fontSize: 44, fontFamily: "Abridge", color: C.coral, marginTop: 4 },
  heroUnit: { fontSize: 14, color: C.gray },
  intro: { fontSize: 10.5, color: C.body, lineHeight: 1.5, marginTop: 8, marginBottom: 20, maxWidth: 430 },
  twoCol: { flexDirection: "row", justifyContent: "space-between", gap: 28 },
  col: { flex: 1 },
  catRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.hair },
  catTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  catName: { fontSize: 13, fontFamily: "Abridge", color: C.ink },
  catNameOff: { fontSize: 13, fontFamily: "Abridge", color: C.muted },
  catVal: { fontSize: 12, fontFamily: "Abridge", color: C.ink },
  bar: { height: 5, borderRadius: 3, backgroundColor: C.hair, marginTop: 5, marginBottom: 4, overflow: "hidden" },
  barFill: { height: 5, borderRadius: 3, backgroundColor: C.coral },
  note: { fontSize: 8.5, color: C.gray, lineHeight: 1.4 },
  off: { fontSize: 8, letterSpacing: 1, color: C.muted, textTransform: "uppercase" },
  chainRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 8 },
  chainVal: { fontSize: 18, fontFamily: "Abridge", color: C.ink, width: 74 },
  chainLbl: { fontSize: 9.5, color: C.gray, flex: 1, lineHeight: 1.3 },
  small: { fontSize: 9, color: C.gray, lineHeight: 1.5, marginTop: 10 },
  scoreboard: { backgroundColor: C.dark, borderRadius: 10, padding: 20, marginTop: "auto" },
  sbLabel: { fontSize: 8.5, letterSpacing: 2, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 },
  sbText: { fontSize: 11, color: "rgba(255,255,255,0.9)", lineHeight: 1.5 },
  foot: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  footText: { fontSize: 8, color: C.muted },
  // category page
  catHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 2, borderBottomColor: C.ink, paddingBottom: 8, marginBottom: 16 },
  catTitle: { fontSize: 24, fontFamily: "Abridge", color: C.ink },
  owner: { fontSize: 10, color: C.body, textAlign: "right" },
  sectionLabel: { fontSize: 8.5, letterSpacing: 2, color: C.muted, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 },
  metricRow: { paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.hair },
  metricTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  mName: { fontSize: 10, color: C.ink, flex: 1, paddingRight: 6 },
  mSource: { fontSize: 7.5, letterSpacing: 0.8, color: C.muted, textTransform: "uppercase", marginTop: 3 },
  mNums: { fontSize: 10, color: C.body, textAlign: "right" },
  cadence: { fontSize: 9.5, color: C.gray, marginTop: 10, marginBottom: 18, lineHeight: 1.5 },
  chainStep: { flexDirection: "row", alignItems: "baseline", marginBottom: 5 },
  chainN: { fontSize: 11, fontFamily: "Abridge", color: C.coral, width: 16 },
  chainStepText: { fontSize: 10.5, color: C.ink },
  assumpRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.hair },
  assumpLabel: { fontSize: 9.5, color: C.body },
  assumpVal: { fontSize: 10, fontFamily: "Abridge", color: C.ink },
  honesty: { fontSize: 8.5, color: C.gray, lineHeight: 1.5, marginTop: 10, fontStyle: "italic" },
  opensBand: { backgroundColor: C.dark, borderRadius: 10, padding: 18, marginTop: 16 },
  openTitle: { fontSize: 11, fontFamily: "Abridge", color: "#FFFFFF", marginBottom: 2 },
  openDesc: { fontSize: 9, color: "rgba(255,255,255,0.6)", lineHeight: 1.4, marginBottom: 8 },
});

function Mast({ partner, setting, date, section }: { partner: string; setting: string; date: string; section: string }) {
  return (
    <View style={s.mast}>
      <Text style={s.mastLabel}>{section}</Text>
      <View>
        <Text style={s.mastPartner}>{partner}</Text>
        <Text style={s.mastMeta}>{setting} · {date}</Text>
      </View>
    </View>
  );
}

function Foot({ partner, page }: { partner: string; page: number }) {
  return (
    <View style={s.foot}>
      <Text style={s.footText}>Value Attainment Plan · {partner}</Text>
      <Text style={s.footText}>ABRIDGE · PAGE {page}</Text>
    </View>
  );
}

function CasePage({ data }: { data: PdfData }) {
  const entered = data.categories.filter((c) => c.entered);
  const maxVal = Math.max(1, ...entered.map((c) => c.value));
  return (
    <Page size="LETTER" style={s.page}>
      <Mast partner={data.partner} setting={data.setting} date={data.date} section="Value Attainment Plan" />
      <Text style={s.label}>The value in play{entered.length > 1 ? ", all categories" : ""}</Text>
      {data.total > 0
        ? <Text style={s.hero}>{fmt$(data.total)}<Text style={s.heroUnit}> / year</Text></Text>
        : <Text style={s.hero}>Not yet sized</Text>}
      <Text style={s.intro}>Built entirely from your own volume, your economics, and the realization you set with us. Not a benchmark, and not a list price.</Text>

      <View style={s.twoCol}>
        <View style={s.col}>
          <Text style={[s.label, { marginBottom: 8 }]}>Across your categories</Text>
          {data.categories.map((c) => (
            <View key={c.name} style={s.catRow}>
              <View style={s.catTop}>
                <Text style={c.entered ? s.catName : s.catNameOff}>{c.name}</Text>
                {c.entered ? <Text style={s.catVal}>{fmt$(c.value)}/yr</Text> : <Text style={s.off}>Not in this plan</Text>}
              </View>
              {c.entered && <View style={s.bar}><View style={[s.barFill, { width: `${Math.round((c.value / maxVal) * 100)}%` }]} /></View>}
              {c.note ? <Text style={s.note}>{c.note}</Text> : null}
            </View>
          ))}
        </View>
        <View style={s.col}>
          <Text style={[s.label, { marginBottom: 8 }]}>How the number is built</Text>
          {data.chain.length > 0 && (
            <Text style={{ fontSize: 9.5, color: C.body, lineHeight: 1.4, marginBottom: 10 }}>
              A lighter documentation load is the shared lever. {data.chainCategory ?? "Your largest line"}, your largest line, runs this chain:
            </Text>
          )}
          {data.chain.map((step, i) => (
            <View key={i} style={s.chainRow}>
              <Text style={s.chainVal}>{step.value}</Text>
              <Text style={s.chainLbl}>{step.label}</Text>
            </View>
          ))}
          <Text style={s.small}>Every number here is yours, set with us. Nothing is a benchmark.</Text>
        </View>
      </View>

      <View style={s.scoreboard}>
        <Text style={s.sbLabel}>From here, the scoreboard</Text>
        <Text style={s.sbText}>Measurement begins at go-live. Every review fills this plan with what you have realized against the promise, and shows the gap in full.</Text>
      </View>
      <Foot partner={data.partner} page={1} />
    </Page>
  );
}

function MetricList({ items }: { items: PlanCat["signals"] }) {
  return (
    <View>
      {items.map((m, i) => (
        <View key={i} style={s.metricRow}>
          <View style={s.metricTop}>
            <Text style={s.mName}>{m.name}</Text>
            <Text style={s.mNums}>{m.today} {"->"} {m.target} {m.unit}</Text>
          </View>
          <Text style={s.mSource}>{m.source}</Text>
        </View>
      ))}
    </View>
  );
}

function CategoryPage({ c, data, page }: { c: PlanCat; data: PdfData; page: number }) {
  return (
    <Page size="LETTER" style={s.page}>
      <Mast partner={data.partner} setting={data.setting} date={data.date} section="The Plan" />
      <View style={s.catHeader}>
        <Text style={s.catTitle}>{c.name}</Text>
        <Text style={s.owner}>{c.owner.name}{c.owner.role ? ` · ${c.owner.role}` : ""}</Text>
      </View>

      <View style={s.twoCol}>
        <View style={s.col}>
          <Text style={s.sectionLabel}>What Abridge can enable</Text>
          <MetricList items={c.signals} />
        </View>
        <View style={s.col}>
          <Text style={s.sectionLabel}>The outcomes they open</Text>
          <MetricList items={c.outcomes} />
        </View>
      </View>
      <Text style={s.cadence}>Reviewed {c.cadence.toLowerCase()} against the baselines above. The signals move first; the outcomes follow.</Text>

      <View style={s.twoCol}>
        <View style={s.col}>
          <Text style={s.sectionLabel}>How the number holds: the chain</Text>
          {c.chain.map((step, i) => (
            <View key={i} style={s.chainStep}>
              <Text style={s.chainN}>{i + 1}</Text>
              <Text style={s.chainStepText}>{step}</Text>
            </View>
          ))}
          <Text style={s.honesty}>{c.honesty}</Text>
        </View>
        <View style={s.col}>
          <Text style={s.sectionLabel}>The assumptions</Text>
          {c.assumptions.map((a, i) => (
            <View key={i} style={s.assumpRow}>
              <Text style={s.assumpLabel}>{a.label}</Text>
              <Text style={s.assumpVal}>{a.value}</Text>
            </View>
          ))}
          <Text style={s.honesty}>Seeded conservatively. Editable, and shown in full.</Text>
        </View>
      </View>

      {c.opens.length > 0 && (
        <View style={s.opensBand}>
          <Text style={[s.sbLabel, { marginBottom: 10 }]}>What this opens, beyond the number</Text>
          <View style={s.twoCol}>
            {c.opens.slice(0, 3).map((o, i) => (
              <View key={i} style={s.col}>
                <Text style={s.openTitle}>{o.title}</Text>
                <Text style={s.openDesc}>{o.desc}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <Foot partner={data.partner} page={page} />
    </Page>
  );
}

function AttainDocument({ data, categories }: { data: PdfData; categories: PlanCat[] }) {
  return (
    <Document title={`Value Attainment Plan - ${data.partner}`}>
      <PDFCoverPage
        reportLabel="ABRIDGE · VALUE ATTAINMENT"
        title={data.partner}
        subtitle="Value Attainment Plan"
        clientName={`${data.setting} · ${data.date}`}
        disclaimerText="Built from partner-provided inputs. Results depend on adoption and how teams act on what the documentation surfaces. Counted once, at margin, never charges."
      />
      <CasePage data={data} />
      {categories.map((c, i) => <CategoryPage key={c.name} c={c} data={data} page={i + 2} />)}
    </Document>
  );
}

/** Render the Attain PDF for the saved plan and download it to the device. */
export async function generateAttainPDF(partner?: string): Promise<void> {
  const snap: AttainSnapshot | null = (partner && partner.trim() ? loadPlanByName(partner) : null) ?? loadSnapshot();
  const built = buildFromSnapshot(snap);
  if (!built) return;
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${(built.data.partner || "attain").replace(/\s+/g, "-")}-value-attainment-${dateStr}.pdf`;
  const blob = await pdf(<AttainDocument data={built.data} categories={built.categories} />).toBlob();
  await savePdfBlob(blob, filename);
}
