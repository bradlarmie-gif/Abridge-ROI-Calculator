import { Document, Page, Text, View, StyleSheet, pdf, Font, Image } from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";
import abridgeLogoRed from "@assets/abridge-logo-wordmark-red_1769187440253.png";

// Customer-facing one-pager for the deal desk: leads with the net savings, makes the
// vendor consolidation obvious, then shows the single recommended price. Same react-pdf
// machinery as the Proforma export so it stays on one pipeline.

Font.registerHyphenationCallback((w) => [w]);
Font.register({
  family: "Manrope",
  fonts: [
    { src: manropeRegular, fontWeight: 400 },
    { src: manropeBold, fontWeight: 700 },
  ],
});

const C = {
  black: "#1A1A1A",
  coral: "#EA2C00",
  coralSoft: "#FFF0ED",
  coralLine: "#F3C9BF",
  cream: "#F7F6F3",
  border: "#E5E4E3",
  hair: "#EFEEEC",
  sub: "#6B7280",
  tertiary: "#9CA3AF",
};

function money(n: number): string {
  const v = Math.round(n);
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000).toLocaleString()}K`;
  return `$${v.toLocaleString()}`;
}

export interface PricingSummaryArgs {
  partnerName: string;
  termYears: number;
  modelLabel: string;
  yearCosts: number[];        // gross Abridge cost per contract year
  totalContract: number;      // gross over the term
  vendors: { label: string; annual: number }[];
  retiredPerYear: number;     // displaceable spend per year at scale
  coveredOverTerm: number;    // displaced over the term (ramped)
  netOverTerm: number;        // gross − displaced over the term
  pctCovered: number;         // 0–100
  annualValue?: number;
  termVtc?: number | null;
}

const S = StyleSheet.create({
  page: {
    fontFamily: "Manrope",
    fontSize: 10,
    color: C.black,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 52,
    paddingTop: 40,
    paddingBottom: 40,
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 26,
  },
  logo: { height: 18 },
  headerTitle: { fontSize: 13, fontWeight: 700 },
  headerMeta: { fontSize: 9, color: C.sub, marginTop: 3 },

  kicker: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.coral,
    fontWeight: 700,
    marginBottom: 12,
  },
  sectionKicker: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.sub,
    fontWeight: 700,
    marginBottom: 12,
  },

  // Bottom line
  bottomLine: {
    backgroundColor: C.coralSoft,
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 20,
    marginBottom: 26,
  },
  blRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  blLabel: { fontSize: 11, color: C.black },
  blValue: { fontSize: 11, fontWeight: 700 },
  netRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.coralLine,
  },
  netLabel: { fontSize: 12, fontWeight: 700, color: C.black },
  netValue: { fontSize: 26, fontWeight: 700, color: C.coral },

  section: { marginBottom: 24 },
  vendorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
  },
  vendorLabel: { fontSize: 10.5, color: C.black },
  vendorVal: { fontSize: 10.5, fontWeight: 700 },
  perYr: { fontSize: 8, color: C.tertiary, fontWeight: 400 },
  retireRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: C.black,
  },
  retireLabel: { fontSize: 11, fontWeight: 700 },
  retireVal: { fontSize: 14, fontWeight: 700 },
  coveredNote: { fontSize: 9.5, color: C.sub, marginTop: 10 },

  yearRow: { flexDirection: "row", marginHorizontal: -4 },
  yearCell: {
    flex: 1,
    backgroundColor: C.cream,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginHorizontal: 4,
  },
  yearLabel: { fontSize: 8, textTransform: "uppercase", letterSpacing: 1, color: C.sub, marginBottom: 5 },
  yearVal: { fontSize: 15, fontWeight: 700 },
  roiNote: { fontSize: 9.5, color: C.sub, marginTop: 12 },

  footer: {
    marginTop: "auto",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footerText: { fontSize: 8, color: C.tertiary },
});

function PricingSummaryDoc(a: PricingSummaryArgs) {
  const hasSavings = a.coveredOverTerm > 0 && a.vendors.length > 0;
  const date = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <Document>
      <PDFCoverPage
        reportLabel="PRICING & SAVINGS"
        title={`${a.termYears}-Year Pricing Summary`}
        subtitle={a.modelLabel}
        clientName={a.partnerName || undefined}
        disclaimerText="Figures reflect conservative estimates derived from the inputs provided. They are for planning and do not constitute a guarantee of pricing or financial performance; final terms govern."
      />

      <Page size="LETTER" style={S.page}>
        <View style={S.header}>
          <Image src={abridgeLogoRed} style={S.logo} />
          <View style={{ alignItems: "flex-end" }}>
            <Text style={S.headerTitle}>Pricing &amp; Savings Summary</Text>
            <Text style={S.headerMeta}>{a.partnerName || "Prepared for your organization"} · {date}</Text>
          </View>
        </View>

        <View style={S.bottomLine}>
          <Text style={S.kicker}>The bottom line</Text>
          {hasSavings ? (
            <>
              <View style={S.blRow}>
                <Text style={S.blLabel}>{a.termYears}-year cost with Abridge</Text>
                <Text style={S.blValue}>{money(a.totalContract)}</Text>
              </View>
              <View style={S.blRow}>
                <Text style={S.blLabel}>Covered by tools you retire</Text>
                <Text style={[S.blValue, { color: C.coral }]}>− {money(a.coveredOverTerm)}</Text>
              </View>
              <View style={S.netRow}>
                <Text style={S.netLabel}>Net new investment</Text>
                <Text style={S.netValue}>{money(a.netOverTerm)}</Text>
              </View>
            </>
          ) : (
            <View style={S.netRow}>
              <Text style={S.netLabel}>{a.termYears}-year cost with Abridge</Text>
              <Text style={S.netValue}>{money(a.totalContract)}</Text>
            </View>
          )}
        </View>

        {hasSavings && (
          <View style={S.section}>
            <Text style={S.sectionKicker}>What you consolidate today</Text>
            {a.vendors.map((v, i) => (
              <View key={i} style={S.vendorRow}>
                <Text style={S.vendorLabel}>{v.label}</Text>
                <Text style={S.vendorVal}>{money(v.annual)}<Text style={S.perYr}> /yr</Text></Text>
              </View>
            ))}
            <View style={S.retireRow}>
              <Text style={S.retireLabel}>You retire / year</Text>
              <Text style={S.retireVal}>{money(a.retiredPerYear)}</Text>
            </View>
            <Text style={S.coveredNote}>
              {Math.round(a.pctCovered)}% of Abridge is paid for by spend you already make.
            </Text>
          </View>
        )}

        <View style={S.section}>
          <Text style={S.sectionKicker}>Your pricing — {a.modelLabel}</Text>
          <View style={S.yearRow}>
            {a.yearCosts.map((c, i) => (
              <View key={i} style={S.yearCell}>
                <Text style={S.yearLabel}>Year {i + 1}</Text>
                <Text style={S.yearVal}>{money(c)}</Text>
              </View>
            ))}
          </View>
          {a.annualValue && a.termVtc ? (
            <Text style={S.roiNote}>
              At an estimated {money(a.annualValue)}/yr of value, that is a {a.termVtc.toFixed(1)}× return over the term.
            </Text>
          ) : null}
        </View>

        <View style={S.footer}>
          <Text style={S.footerText}>
            Prepared by Abridge · {date}. Figures are estimates for planning and may vary with final contract terms.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generatePricingSummaryPDF(args: PricingSummaryArgs): Promise<void> {
  const blob = await pdf(<PricingSummaryDoc {...args} />).toBlob();
  const org = args.partnerName ? args.partnerName.replace(/\s+/g, "-").toLowerCase() : "pricing";
  await savePdfBlob(blob, `abridge-${org}-pricing-summary.pdf`);
}
