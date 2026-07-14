import { Document, Page, Text, View, StyleSheet, pdf, Font, Image } from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";
import abridgeLogoRed from "@assets/abridge-logo-wordmark-red_1769187440253.png";

// Customer-facing deal-desk summary. Page 2 tells the switch story (net after retiring
// existing spend, plus the return); page 3 lays every option out side by side so the
// better deal is unmistakable. Same react-pdf pipeline as the other exports.

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
  muted: "#8C7E6E",
};

function money(n: number): string {
  const v = Math.round(n);
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000).toLocaleString()}K`;
  return `$${v.toLocaleString()}`;
}

export interface PricingOptionRow {
  label: string;
  isWinner: boolean;
  modelLabel: string;
  totalContract: number;
  netTotal: number;
  netAnnual: number;
  costPerProvider: number | null;
  costPerEncounter: number | null;
  escalatorPct: number;
  termVtc: number | null;
  annualRoiPct: number | null;
  paybackMonths: number | null;
  yearCosts: number[];
}

export interface PricingSummaryArgs {
  partnerName: string;
  termYears: number;
  modelLabel: string;
  recommendedLabel: string;
  savingsVsNext: number;
  yearCosts: number[];        // gross Abridge cost per contract year (recommended)
  totalContract: number;      // gross over the term (recommended)
  vendors: { label: string; annual: number }[];
  retiredPerYear: number;     // displaceable spend per year at scale
  coveredOverTerm: number;    // displaced over the term (ramped)
  netOverTerm: number;        // gross − displaced over the term
  pctCovered: number;         // 0–100
  annualValue?: number;
  termVtc?: number | null;
  options: PricingOptionRow[];
}

const S = StyleSheet.create({
  page: {
    fontFamily: "Manrope",
    fontSize: 10,
    color: C.black,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 52,
    paddingTop: 38,
    paddingBottom: 34,
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 20,
  },
  logo: { height: 17 },
  headerTitle: { fontSize: 12.5, fontWeight: 700 },
  headerMeta: { fontSize: 9, color: C.sub, marginTop: 3 },

  kicker: { fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", color: C.coral, fontWeight: 700, marginBottom: 10 },
  sectionKicker: { fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", color: C.sub, fontWeight: 700, marginBottom: 10 },
  lead: { fontSize: 12.5, color: C.black, lineHeight: 1.5, marginBottom: 18 },
  leadStrong: { fontWeight: 700, color: C.coral },

  // Bottom line
  bottomLine: { backgroundColor: C.coralSoft, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 18, marginBottom: 22 },
  blRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  blLabel: { fontSize: 11, color: C.black },
  blValue: { fontSize: 11, fontWeight: 700 },
  netRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.coralLine },
  netLabel: { fontSize: 12, fontWeight: 700, color: C.black },
  netValue: { fontSize: 26, fontWeight: 700, color: C.coral },

  section: { marginBottom: 22 },
  vendorRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.hair },
  vendorLabel: { fontSize: 10.5, color: C.black },
  vendorVal: { fontSize: 10.5, fontWeight: 700 },
  perYr: { fontSize: 8, color: C.tertiary, fontWeight: 400 },
  retireRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 9, paddingTop: 9, borderTopWidth: 1, borderTopColor: C.black },
  retireLabel: { fontSize: 11, fontWeight: 700 },
  retireVal: { fontSize: 14, fontWeight: 700 },
  coveredNote: { fontSize: 9.5, color: C.sub, marginTop: 9 },

  yearRow: { flexDirection: "row", marginHorizontal: -4 },
  yearCell: { flex: 1, backgroundColor: C.cream, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 13, marginHorizontal: 4 },
  yearLabel: { fontSize: 8, textTransform: "uppercase", letterSpacing: 1, color: C.sub, marginBottom: 5 },
  yearVal: { fontSize: 15, fontWeight: 700 },
  roiNote: { fontSize: 9.5, color: C.sub, marginTop: 11 },

  // Return box (page 2)
  returnBox: { flexDirection: "row", backgroundColor: C.black, borderRadius: 10, overflow: "hidden" },
  returnCell: { flex: 1, paddingVertical: 16, paddingHorizontal: 14 },
  returnDivide: { borderLeftWidth: 1, borderLeftColor: "#333333" },
  returnLabel: { fontSize: 7.5, textTransform: "uppercase", letterSpacing: 1, color: "#9A9A9A", marginBottom: 5 },
  returnValue: { fontSize: 20, fontWeight: 700, color: "#FFFFFF" },
  returnValueCoral: { fontSize: 20, fontWeight: 700, color: C.coral },

  // Comparison table (page 3)
  tRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.hair, minHeight: 26 },
  tHeadRow: { flexDirection: "row", alignItems: "flex-end", borderBottomWidth: 1.5, borderBottomColor: C.border, paddingBottom: 6, marginBottom: 2 },
  tMetric: { flex: 1.5, fontSize: 9.5, color: C.sub, paddingVertical: 6 },
  tCell: { flex: 1, fontSize: 10, textAlign: "right", paddingVertical: 6, paddingHorizontal: 6 },
  tHeadCell: { flex: 1, fontSize: 10, fontWeight: 700, textAlign: "right", paddingHorizontal: 6 },
  tHeadSub: { fontSize: 7, fontWeight: 400, color: C.muted },
  winnerBg: { backgroundColor: C.coralSoft },

  footer: { marginTop: "auto", paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  footerText: { fontSize: 8, color: C.tertiary },
});

function fmtRoi(x: number | null): string {
  return x !== null ? `${x.toFixed(1)}×` : "—";
}
function fmtMoneyOrDash(n: number | null): string {
  return n !== null ? money(n) : "—";
}

function PricingSummaryDoc(a: PricingSummaryArgs) {
  const hasSavings = a.coveredOverTerm > 0 && a.vendors.length > 0;
  const hasValue = !!(a.annualValue && a.termVtc);
  const date = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const opts = a.options.length ? a.options : [];
  const winnerIdx = Math.max(0, opts.findIndex((o) => o.isWinner));
  const maxYears = opts.reduce((m, o) => Math.max(m, o.yearCosts.length), a.yearCosts.length);

  const Head = ({ label }: { label: string }) => (
    <View style={S.header}>
      <Image src={abridgeLogoRed} style={S.logo} />
      <View style={{ alignItems: "flex-end" }}>
        <Text style={S.headerTitle}>{label}</Text>
        <Text style={S.headerMeta}>{a.partnerName || "Prepared for your organization"} · {date}</Text>
      </View>
    </View>
  );

  return (
    <Document>
      <PDFCoverPage
        reportLabel="PRICING & SAVINGS"
        title={`${a.termYears}-Year Pricing Summary`}
        subtitle={a.modelLabel}
        clientName={a.partnerName || undefined}
        disclaimerText="Figures reflect conservative estimates derived from the inputs provided. They are for planning and do not constitute a guarantee of pricing or financial performance; final terms govern."
      />

      {/* PAGE 2 — the switch story */}
      <Page size="LETTER" style={S.page}>
        <Head label="Pricing & Savings Summary" />

        <Text style={S.lead}>
          {hasSavings
            ? <>Your recommended path is <Text style={S.leadStrong}>{a.recommendedLabel}</Text>. Over {a.termYears} years it costs {money(a.totalContract)}, but {money(a.coveredOverTerm)} of that is already covered by tools you retire — a net new investment of <Text style={S.leadStrong}>{money(a.netOverTerm)}</Text>.</>
            : <>Your recommended path is <Text style={S.leadStrong}>{a.recommendedLabel}</Text>, at {money(a.totalContract)} over {a.termYears} years.</>}
        </Text>

        <View style={S.bottomLine}>
          <Text style={S.kicker}>The bottom line</Text>
          {hasSavings ? (
            <>
              <View style={S.blRow}><Text style={S.blLabel}>{a.termYears}-year cost with Abridge</Text><Text style={S.blValue}>{money(a.totalContract)}</Text></View>
              <View style={S.blRow}><Text style={S.blLabel}>Covered by tools you retire</Text><Text style={[S.blValue, { color: C.coral }]}>− {money(a.coveredOverTerm)}</Text></View>
              <View style={S.netRow}><Text style={S.netLabel}>Net new investment</Text><Text style={S.netValue}>{money(a.netOverTerm)}</Text></View>
            </>
          ) : (
            <View style={S.netRow}><Text style={S.netLabel}>{a.termYears}-year cost with Abridge</Text><Text style={S.netValue}>{money(a.totalContract)}</Text></View>
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
            <View style={S.retireRow}><Text style={S.retireLabel}>You retire / year</Text><Text style={S.retireVal}>{money(a.retiredPerYear)}</Text></View>
            <Text style={S.coveredNote}>{Math.round(a.pctCovered)}% of Abridge is paid for by spend you already make.</Text>
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
        </View>

        {hasValue && (
          <View style={S.section}>
            <Text style={S.sectionKicker}>The return</Text>
            <View style={S.returnBox}>
              <View style={S.returnCell}>
                <Text style={S.returnLabel}>Estimated value / yr</Text>
                <Text style={S.returnValue}>{money(a.annualValue!)}</Text>
              </View>
              <View style={[S.returnCell, S.returnDivide]}>
                <Text style={S.returnLabel}>Return over term</Text>
                <Text style={S.returnValueCoral}>{a.termVtc!.toFixed(1)}×</Text>
              </View>
              <View style={[S.returnCell, S.returnDivide]}>
                <Text style={S.returnLabel}>Net investment</Text>
                <Text style={S.returnValue}>{money(a.netOverTerm)}</Text>
              </View>
            </View>
            <Text style={S.roiNote}>At an estimated {money(a.annualValue!)}/yr of value, {a.recommendedLabel} returns {a.termVtc!.toFixed(1)}× over the {a.termYears}-year term.</Text>
          </View>
        )}

        <View style={S.footer}>
          <Text style={S.footerText}>Prepared by Abridge · {date}. Figures are estimates for planning and may vary with final contract terms.</Text>
        </View>
      </Page>

      {/* PAGE 3 — itemized comparison */}
      {opts.length > 0 && (
        <Page size="LETTER" style={S.page}>
          <Head label="How the Options Compare" />

          <Text style={S.lead}>
            {a.savingsVsNext > 0
              ? <><Text style={S.leadStrong}>{a.recommendedLabel}</Text> is {money(a.savingsVsNext)} less than the next option over the {a.termYears}-year term. Every option they're weighing, side by side.</>
              : <>Every option, side by side. <Text style={S.leadStrong}>{a.recommendedLabel}</Text> is the recommended path.</>}
          </Text>

          {/* Comparison table */}
          <View style={S.section}>
            <View style={S.tHeadRow}>
              <Text style={[S.tMetric, { fontWeight: 700, color: C.sub }]}>Metric</Text>
              {opts.map((o, i) => (
                <View key={i} style={[S.tHeadCell, i === winnerIdx ? S.winnerBg : {}]}>
                  <Text style={{ fontSize: 10, fontWeight: 700, textAlign: "right", color: i === winnerIdx ? C.coral : C.black }}>{o.label}{i === winnerIdx ? " · best" : ""}</Text>
                  <Text style={[S.tHeadSub, { textAlign: "right" }]}>{o.modelLabel}</Text>
                </View>
              ))}
            </View>

            {([
              { k: "Total contract", f: (o: PricingOptionRow) => money(o.totalContract) },
              ...(hasSavings ? [{ k: "Covered by retired spend", f: (o: PricingOptionRow) => money(Math.max(0, o.totalContract - o.netTotal)) }] : []),
              { k: "Net over term", f: (o: PricingOptionRow) => money(o.netTotal), strong: true },
              { k: "Net / year", f: (o: PricingOptionRow) => money(o.netAnnual) },
              { k: "Annual escalator", f: (o: PricingOptionRow) => (o.escalatorPct > 0 ? `+${o.escalatorPct}%` : "Flat") },
              { k: "Cost / provider", f: (o: PricingOptionRow) => fmtMoneyOrDash(o.costPerProvider) },
              { k: "Cost / encounter", f: (o: PricingOptionRow) => (o.costPerEncounter !== null ? `$${o.costPerEncounter.toFixed(2)}` : "—") },
              ...(hasValue ? [
                { k: "Return over term", f: (o: PricingOptionRow) => fmtRoi(o.termVtc) },
                { k: "Payback", f: (o: PricingOptionRow) => (o.paybackMonths !== null ? `${o.paybackMonths} mo` : "—") },
              ] : []),
            ] as { k: string; f: (o: PricingOptionRow) => string; strong?: boolean }[]).map((row, ri) => (
              <View key={ri} style={S.tRow}>
                <Text style={[S.tMetric, row.strong ? { fontWeight: 700, color: C.black } : {}]}>{row.k}</Text>
                {opts.map((o, i) => (
                  <Text
                    key={i}
                    style={[
                      S.tCell,
                      i === winnerIdx ? S.winnerBg : {},
                      { fontWeight: row.strong || i === winnerIdx ? 700 : 400, color: i === winnerIdx ? C.coral : C.black },
                    ]}
                  >
                    {row.f(o)}
                  </Text>
                ))}
              </View>
            ))}
          </View>

          {/* Cost by year, per option */}
          <View style={S.section}>
            <Text style={S.sectionKicker}>Cost by year</Text>
            <View style={S.tHeadRow}>
              <Text style={[S.tMetric, { fontWeight: 700, color: C.sub }]}>Option</Text>
              {Array.from({ length: maxYears }, (_, y) => (
                <Text key={y} style={S.tHeadCell}>Year {y + 1}</Text>
              ))}
            </View>
            {opts.map((o, i) => (
              <View key={i} style={S.tRow}>
                <Text style={[S.tMetric, { color: i === winnerIdx ? C.coral : C.black, fontWeight: i === winnerIdx ? 700 : 400 }]}>{o.label}</Text>
                {Array.from({ length: maxYears }, (_, y) => (
                  <Text key={y} style={[S.tCell, i === winnerIdx ? { color: C.coral, fontWeight: 700 } : {}]}>
                    {o.yearCosts[y] !== undefined ? money(o.yearCosts[y]) : "—"}
                  </Text>
                ))}
              </View>
            ))}
          </View>

          <View style={S.footer}>
            <Text style={S.footerText}>Prepared by Abridge · {date}. Figures are estimates for planning and may vary with final contract terms.</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}

export async function generatePricingSummaryPDF(args: PricingSummaryArgs): Promise<void> {
  const blob = await pdf(<PricingSummaryDoc {...args} />).toBlob();
  const org = args.partnerName ? args.partnerName.replace(/\s+/g, "-").toLowerCase() : "pricing";
  await savePdfBlob(blob, `abridge-${org}-pricing-summary.pdf`);
}
