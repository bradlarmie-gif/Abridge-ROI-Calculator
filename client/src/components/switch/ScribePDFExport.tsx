import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
  Svg,
  Rect,
  Font,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import type { ScribeInputs, ScribeCalculations } from "@/lib/scribeGapCalculator";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";

Font.registerHyphenationCallback((word) => [word]);

const C = {
  primary: "#EA2C00",
  lightAccent: "#FFF5F2",
  black: "#1A1A1A",
  dark: "#333333",
  gray: "#666666",
  light: "#999999",
  border: "#E0E0E0",
  beige: "#F5F0EB",
  white: "#FFFFFF",
};

const s = StyleSheet.create({
  page: {
    padding: 0,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: C.black,
    backgroundColor: C.white,
  },
  wrap: {
    flex: 1,
    flexDirection: "column",
  },
  hdr: {
    paddingHorizontal: 50,
    paddingTop: 40,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  hdrLabel: {
    fontSize: 10,
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
  },
  hdrTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: C.black,
    marginBottom: 8,
    letterSpacing: -0.3,
    lineHeight: 1.2,
  },
  hdrSub: {
    fontSize: 11,
    color: C.gray,
    lineHeight: 1.5,
    maxWidth: 420,
  },
  body: {
    paddingHorizontal: 50,
    paddingTop: 18,
    flex: 1,
  },
  secLabel: {
    fontSize: 10,
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  secTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: C.black,
    marginBottom: 6,
  },
  secSub: {
    fontSize: 11,
    color: C.gray,
    marginBottom: 14,
    lineHeight: 1.5,
  },
  txt: {
    fontSize: 11,
    color: C.dark,
    lineHeight: 1.6,
    marginBottom: 10,
  },
  sep: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 12,
  },
  foot: {
    marginTop: "auto",
    marginHorizontal: 50,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footTxt: {
    fontSize: 9,
    color: C.light,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.beige,
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 9,
    color: C.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
    textAlign: "center",
  },
  statVal: {
    fontSize: 20,
    fontWeight: "bold",
    color: C.black,
  },
  statValAccent: {
    fontSize: 20,
    fontWeight: "bold",
    color: C.primary,
  },
  statSub: {
    fontSize: 9,
    color: C.gray,
    marginTop: 2,
    textAlign: "center",
  },
  callout: {
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
    backgroundColor: C.beige,
    padding: 14,
    borderRadius: 6,
    marginBottom: 12,
  },
  calloutHead: {
    fontSize: 12,
    fontWeight: "bold",
    color: C.black,
    marginBottom: 4,
  },
  calloutTxt: {
    fontSize: 11,
    color: C.dark,
    lineHeight: 1.5,
  },
  orgLabel: {
    fontSize: 10,
    color: C.gray,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  orgText: {
    fontSize: 13,
    color: C.dark,
    marginBottom: 4,
  },
  orgDesc: {
    fontSize: 11,
    color: C.gray,
    lineHeight: 1.5,
    marginBottom: 12,
  },
  totalCard: {
    backgroundColor: C.beige,
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    marginBottom: 14,
  },
  totalLabel: {
    fontSize: 10,
    color: C.gray,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  totalVal: {
    fontSize: 48,
    fontWeight: "bold",
    color: C.primary,
    marginBottom: 4,
  },
  totalSub: {
    fontSize: 11,
    color: C.gray,
    textAlign: "center",
  },
  gapCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
    borderRadius: 6,
    marginBottom: 10,
    overflow: "hidden",
  },
  gapHdr: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  gapTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: C.black,
  },
  gapVal: {
    fontSize: 20,
    fontWeight: "bold",
    color: C.primary,
  },
  gapBody: {
    padding: 12,
    backgroundColor: C.beige,
  },
  gapStep: {
    fontSize: 10,
    color: C.dark,
    lineHeight: 1.7,
    marginBottom: 2,
  },
  valCard: {
    flex: 1,
    backgroundColor: C.beige,
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
  },
  metaRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  metaCol: {
    flex: 1,
    paddingRight: 14,
  },
  metaHd: {
    fontSize: 10,
    fontWeight: "bold",
    color: C.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  metaItem: {
    fontSize: 10,
    color: C.dark,
    lineHeight: 1.6,
    marginBottom: 1,
  },
  metaNote: {
    fontSize: 9,
    color: C.light,
    lineHeight: 1.4,
    marginTop: 10,
    fontStyle: "italic",
  },
  patCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  patNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.beige,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  patNumTxt: {
    fontSize: 11,
    fontWeight: "bold",
    color: C.black,
  },
  patContent: {
    flex: 1,
  },
  patTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: C.black,
    marginBottom: 3,
  },
  patTxt: {
    fontSize: 10,
    color: C.dark,
    lineHeight: 1.4,
  },
  benchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  benchYou: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    backgroundColor: C.beige,
    alignItems: "center",
  },
  benchTarget: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    backgroundColor: C.white,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
    alignItems: "center",
  },
  benchLabel: {
    fontSize: 9,
    color: C.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  benchVal: {
    fontSize: 24,
    fontWeight: "bold",
    color: C.black,
  },
  benchValAccent: {
    fontSize: 24,
    fontWeight: "bold",
    color: C.primary,
  },
  dimLabelSm: {
    fontSize: 10,
    color: C.gray,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 6,
  },
});

interface ScribePDFData {
  inputs: ScribeInputs;
  calculations: ScribeCalculations;
  clientName?: string;
  preparedBy?: string;
}

const fmtCurrency = (n: number): string => {
  if (isNaN(n) || n === undefined) return "$0";
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n.toLocaleString()}`;
};

const fmtNum = (n: number): string => {
  if (isNaN(n) || n === undefined) return "0";
  return n.toLocaleString();
};

const safe = (v: number) => (isNaN(v) ? 0 : v);

const Bar = ({ percent, width = 280 }: { percent: number; width?: number }) => {
  const pct = Math.min(100, Math.max(0, safe(percent)));
  const filled = Math.max((pct / 100) * width, 3);
  return (
    <Svg width={width} height={8}>
      <Rect x={0} y={0} width={width} height={8} fill={C.border} rx={4} />
      <Rect x={0} y={0} width={filled} height={8} fill={C.primary} rx={4} />
    </Svg>
  );
};

const Footer = ({ page, total }: { page: number; total: number }) => (
  <View style={s.foot}>
    <Image src={abridgeLogoPath} style={{ width: 60 }} />
    <Text style={s.footTxt}>Page {page} of {total}</Text>
  </View>
);

const ScribePDFDocument = ({ inputs, calculations, clientName, preparedBy }: ScribePDFData) => {
  const turnoverRate = (inputs.turnoverRate > 0 ? inputs.turnoverRate : 40) / 100;
  const trainingCostPerScribe = inputs.trainingCostPerScribe > 0 ? inputs.trainingCostPerScribe : 5000;
  const annualTurnoverCost = Math.round(inputs.scribeCount * turnoverRate * trainingCostPerScribe);
  const managementOverhead = Math.round(calculations.totalScribeCost * 0.15);
  const totalHiddenCosts = annualTurnoverCost + managementOverhead;
  const trueTotalCost = calculations.totalScribeCost + totalHiddenCosts;
  const trueCostPerProvider = inputs.providersWithScribes > 0 ? Math.round(trueTotalCost / inputs.providersWithScribes) : 0;
  const scaleMultiplier = calculations.totalScribeCost > 0 ? Math.round(calculations.fullScribeCost / calculations.totalScribeCost) : 1;
  const totalPages = 5;

  return (
    <Document>
      <PDFCoverPage
        reportLabel="SCRIBE PROGRAM ANALYSIS"
        title={"Documentation\nInvestment Review"}
        clientName={clientName}
        preparedBy={preparedBy}
      />

      {/* PAGE 2: YOUR PROGRAM TODAY */}
      <Page size="LETTER" style={s.page} wrap={false}>
        <View style={s.wrap}>
          <View style={s.hdr}>
            <Text style={s.hdrLabel}>Current State</Text>
            <Text style={s.hdrTitle}>Your Scribe Program Today</Text>
          </View>

          <View style={s.body}>
            <Text style={s.orgLabel}>Your Organization</Text>
            <Text style={s.orgText}>
              {fmtNum(inputs.totalProviders)} providers  {'\u00B7'}  {fmtNum(inputs.scribeCount)} scribes  {'\u00B7'}  {fmtNum(inputs.annualEncounters)} annual encounters
            </Text>
            <Text style={s.orgDesc}>
              You've built a scribe program that supports {inputs.providersWithScribes} of {inputs.totalProviders} providers. This analysis examines your investment holistically{'\u2014'}including the costs that don't appear on a budget line.
            </Text>

            <View style={[s.sep, { marginVertical: 8 }]} />

            <Text style={s.dimLabelSm}>Program Overview</Text>
            <View style={s.row}>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Direct Investment</Text>
                <Text style={s.statVal}>{fmtCurrency(calculations.totalScribeCost)}</Text>
                <Text style={s.statSub}>{inputs.scribeCount} scribes annually</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Provider Coverage</Text>
                <Text style={s.statVal}>{safe(calculations.coveragePercent)}%</Text>
                <Text style={s.statSub}>{inputs.providersWithScribes} of {inputs.totalProviders}</Text>
              </View>
            </View>
            <View style={s.row}>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Cost Per Provider</Text>
                <Text style={s.statValAccent}>{fmtCurrency(trueCostPerProvider)}</Text>
                <Text style={s.statSub}>including hidden costs</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Scribe Ratio</Text>
                <Text style={s.statVal}>{safe(calculations.scribeRatio)}:1</Text>
                <Text style={s.statSub}>providers per scribe</Text>
              </View>
            </View>

            <View style={s.sep} />

            <Text style={s.dimLabelSm}>Coverage Gap</Text>
            <Text style={s.txt}>
              {safe(calculations.providersWithoutSupport)} providers ({100 - safe(calculations.coveragePercent)}% of your organization) document without scribe support. That's approximately {fmtNum(safe(calculations.unsupportedDocTimeHours))} hours of unsupported documentation time each year.
            </Text>

            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 9, color: C.gray }}>Current Coverage</Text>
                <Text style={{ fontSize: 9, color: C.primary, fontWeight: "bold" }}>{safe(calculations.coveragePercent)}%</Text>
              </View>
              <Bar percent={calculations.coveragePercent} width={412} />
            </View>

            <View style={s.callout}>
              <Text style={s.calloutHead}>What This Tells Us</Text>
              <Text style={s.calloutTxt}>
                Scribes bring real value{'\u2014'}they build relationships with providers and learn institutional nuances. This isn't about replacing what works. It's about understanding the full picture of your investment and where the opportunity lies.
              </Text>
            </View>
          </View>

          <Footer page={1} total={totalPages} />
        </View>
      </Page>

      {/* PAGE 3: THE HIDDEN COSTS */}
      <Page size="LETTER" style={s.page} wrap={false}>
        <View style={s.wrap}>
          <View style={s.hdr}>
            <Text style={s.hdrLabel}>Hidden Costs</Text>
            <Text style={s.hdrTitle}>Beyond the Budget Line</Text>
            <Text style={s.hdrSub}>
              Every scribe program carries operational costs that rarely appear in budget discussions. Understanding these is essential to evaluating your true investment.
            </Text>
          </View>

          <View style={s.body}>
            <Text style={[s.dimLabelSm, { textAlign: "center" }]}>True Annual Investment</Text>
            <View style={s.totalCard}>
              <Text style={s.totalVal}>{fmtCurrency(trueTotalCost)}</Text>
              <Text style={s.totalSub}>total cost including hidden overhead</Text>
            </View>

            <View style={s.sep} />

            <Text style={s.dimLabelSm}>Cost Breakdown</Text>
            <View style={s.gapCard}>
              <View style={s.gapHdr}>
                <Text style={s.gapTitle}>Turnover & Training</Text>
                <Text style={s.gapVal}>{fmtCurrency(annualTurnoverCost)}</Text>
              </View>
              <View style={s.gapBody}>
                <Text style={s.gapStep}>Annual turnover rate: ~{Math.round(turnoverRate * 100)}%</Text>
                <Text style={s.gapStep}>Scribes replaced per year: ~{Math.round(inputs.scribeCount * turnoverRate)}</Text>
                <Text style={s.gapStep}>Training cost per replacement: ~{fmtCurrency(trainingCostPerScribe)}</Text>
                <Text style={[s.gapStep, { color: C.primary, fontWeight: "bold" }]}>{Math.round(inputs.scribeCount * turnoverRate)} scribes {'\u00D7'} {fmtCurrency(trainingCostPerScribe)} = {fmtCurrency(annualTurnoverCost)}</Text>
              </View>
            </View>

            <View style={s.gapCard}>
              <View style={s.gapHdr}>
                <Text style={s.gapTitle}>Management Overhead</Text>
                <Text style={s.gapVal}>{fmtCurrency(managementOverhead)}</Text>
              </View>
              <View style={s.gapBody}>
                <Text style={s.gapStep}>Scheduling, supervision, quality assurance, admin support</Text>
                <Text style={s.gapStep}>Industry standard: ~15% of direct program cost</Text>
                <Text style={[s.gapStep, { color: C.primary, fontWeight: "bold" }]}>{fmtCurrency(calculations.totalScribeCost)} {'\u00D7'} 15% = {fmtCurrency(managementOverhead)}</Text>
              </View>
            </View>

            <View style={s.sep} />

            <View style={s.row}>
              <View style={s.benchYou}>
                <Text style={s.benchLabel}>Direct Costs</Text>
                <Text style={s.benchVal}>{fmtCurrency(calculations.totalScribeCost)}</Text>
              </View>
              <View style={s.benchYou}>
                <Text style={s.benchLabel}>Hidden Costs</Text>
                <Text style={s.benchValAccent}>{fmtCurrency(totalHiddenCosts)}</Text>
              </View>
              <View style={s.benchTarget}>
                <Text style={s.benchLabel}>True Total</Text>
                <Text style={s.benchValAccent}>{fmtCurrency(trueTotalCost)}</Text>
              </View>
            </View>

            <Text style={{ fontSize: 9, color: C.light, fontStyle: "italic", textAlign: "center" }}>
              Hidden costs add {calculations.totalScribeCost > 0 ? Math.round((totalHiddenCosts / calculations.totalScribeCost) * 100) : 0}% to your direct investment
            </Text>
          </View>

          <Footer page={2} total={totalPages} />
        </View>
      </Page>

      {/* PAGE 4: SCALING ECONOMICS */}
      <Page size="LETTER" style={s.page} wrap={false}>
        <View style={s.wrap}>
          <View style={s.hdr}>
            <Text style={s.hdrLabel}>Scaling Economics</Text>
            <Text style={s.hdrTitle}>What Full Coverage Looks Like</Text>
            <Text style={s.hdrSub}>
              Scribes scale linearly{'\u2014'}there are no economies of scale. Here's what closing your coverage gap would actually cost.
            </Text>
          </View>

          <View style={s.body}>
            <Text style={s.secLabel}>The Math</Text>

            <View style={s.gapCard}>
              <View style={s.gapHdr}>
                <Text style={s.gapTitle}>Full Scribe Coverage</Text>
                <Text style={s.gapVal}>{fmtCurrency(calculations.fullScribeCost)}/yr</Text>
              </View>
              <View style={s.gapBody}>
                <Text style={s.gapStep}>{inputs.totalProviders} providers {'\u00D7'} 1 scribe per {safe(calculations.scribeRatio)} providers</Text>
                <Text style={s.gapStep}>= {safe(calculations.scribesNeededForFullCoverage)} scribes needed at current cost structure</Text>
                <Text style={[s.gapStep, { color: C.primary, fontWeight: "bold" }]}>= {fmtCurrency(calculations.fullScribeCost)}/year</Text>
              </View>
            </View>

            <View style={s.gapCard}>
              <View style={s.gapHdr}>
                <Text style={s.gapTitle}>Additional Investment Required</Text>
                <Text style={s.gapVal}>+{fmtCurrency(calculations.costToScale)}/yr</Text>
              </View>
              <View style={s.gapBody}>
                <Text style={s.gapStep}>Full coverage: {fmtCurrency(calculations.fullScribeCost)}</Text>
                <Text style={s.gapStep}>Current investment: {fmtCurrency(calculations.totalScribeCost)}</Text>
                <Text style={[s.gapStep, { color: C.primary, fontWeight: "bold" }]}>Gap: +{fmtCurrency(calculations.costToScale)} additional per year</Text>
              </View>
            </View>

            <View style={s.sep} />

            <Text style={s.dimLabelSm}>Coverage Comparison</Text>
            <View style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: C.black }}>Today ({safe(calculations.coveragePercent)}%)</Text>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: C.black }}>{fmtCurrency(calculations.totalScribeCost)}</Text>
              </View>
              <Bar percent={calculations.coveragePercent} width={412} />
            </View>
            <View style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 10, color: C.primary, fontWeight: "bold" }}>Full Coverage (100%)</Text>
                <Text style={{ fontSize: 10, color: C.primary, fontWeight: "bold" }}>{fmtCurrency(calculations.fullScribeCost)}</Text>
              </View>
              <Bar percent={100} width={412} />
            </View>

            <View style={s.row}>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Scale Factor</Text>
                <Text style={s.statValAccent}>{scaleMultiplier}{'\u00D7'}</Text>
                <Text style={s.statSub}>your current investment</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Additional Scribes</Text>
                <Text style={s.statVal}>{safe(calculations.additionalScribesNeeded)}</Text>
                <Text style={s.statSub}>to hire and manage</Text>
              </View>
            </View>

            <View style={s.callout}>
              <Text style={s.calloutHead}>A Different Path</Text>
              <Text style={s.calloutTxt}>
                Ambient AI documentation can support every provider{'\u2014'}without the linear cost curve. Imagine giving all {inputs.totalProviders} providers documentation support tomorrow, without hiring a single additional scribe.
              </Text>
            </View>
          </View>

          <Footer page={3} total={totalPages} />
        </View>
      </Page>

      {/* PAGE 5: WHAT THIS MEANS */}
      <Page size="LETTER" style={s.page} wrap={false}>
        <View style={s.wrap}>
          <View style={s.hdr}>
            <Text style={s.hdrLabel}>Perspective</Text>
            <Text style={s.hdrTitle}>What We've Seen</Text>
            <Text style={s.hdrSub}>
              Across hundreds of organizations, these patterns emerge consistently when evaluating documentation support models.
            </Text>
          </View>

          <View style={s.body}>
            <Text style={s.secLabel}>Common Patterns</Text>
            <Text style={s.secTitle}>Why Organizations Are Evolving</Text>
            <Text style={s.secSub}>
              Scribes deliver genuine value. But the model has structural limitations that become more visible as organizations grow.
            </Text>

            <View style={s.patCard}>
              <View style={s.patNum}>
                <Text style={s.patNumTxt}>1</Text>
              </View>
              <View style={s.patContent}>
                <Text style={s.patTitle}>Coverage Gaps Are Universal</Text>
                <Text style={s.patTxt}>
                  No scribe program we've evaluated covers 100% of providers. The economics simply don't allow it. This creates a two-tier experience where some providers get support and others don't.
                </Text>
              </View>
            </View>

            <View style={s.patCard}>
              <View style={s.patNum}>
                <Text style={s.patNumTxt}>2</Text>
              </View>
              <View style={s.patContent}>
                <Text style={s.patTitle}>Turnover Erodes Quality</Text>
                <Text style={s.patTxt}>
                  High scribe turnover means constantly retraining. Each new scribe takes months to learn a provider's preferences, specialty nuances, and documentation style. That learning period represents lost productivity.
                </Text>
              </View>
            </View>

            <View style={s.patCard}>
              <View style={s.patNum}>
                <Text style={s.patNumTxt}>3</Text>
              </View>
              <View style={s.patContent}>
                <Text style={s.patTitle}>Linear Costs Limit Growth</Text>
                <Text style={s.patTxt}>
                  Unlike technology, human labor doesn't benefit from economies of scale. Doubling coverage means doubling costs{'\u2014'}plus the management overhead to coordinate a larger team.
                </Text>
              </View>
            </View>

            <View style={s.patCard}>
              <View style={s.patNum}>
                <Text style={s.patNumTxt}>4</Text>
              </View>
              <View style={s.patContent}>
                <Text style={s.patTitle}>The Right Tool for the Right Problem</Text>
                <Text style={s.patTxt}>
                  This isn't about scribes vs. AI. It's about matching the right documentation approach to each clinical setting. Many organizations find that a thoughtful blend delivers the best outcomes.
                </Text>
              </View>
            </View>

            <View style={s.callout}>
              <Text style={s.calloutHead}>The Bottom Line</Text>
              <Text style={s.calloutTxt}>
                Your scribe program has delivered real value. The question isn't whether to keep it{'\u2014'}it's whether there's a more sustainable path to give every provider the documentation support they need.
              </Text>
            </View>
          </View>

          <Footer page={4} total={totalPages} />
        </View>
      </Page>

      {/* PAGE 6: YOUR SUMMARY */}
      <Page size="LETTER" style={s.page} wrap={false}>
        <View style={s.wrap}>
          <View style={s.hdr}>
            <Text style={s.hdrLabel}>Summary</Text>
            <Text style={s.hdrTitle}>Your Complete Profile</Text>
            <Text style={s.hdrSub}>
              Everything in one view. Your starting point for the conversation ahead.
            </Text>
          </View>

          <View style={s.body}>
            <View style={s.row}>
              <View style={s.statCard}>
                <Text style={s.statLabel}>True Annual Cost</Text>
                <Text style={s.statValAccent}>{fmtCurrency(trueTotalCost)}</Text>
                <Text style={s.statSub}>including hidden costs</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Provider Coverage</Text>
                <Text style={s.statVal}>{safe(calculations.coveragePercent)}%</Text>
                <Text style={s.statSub}>{inputs.providersWithScribes} of {inputs.totalProviders}</Text>
              </View>
            </View>
            <View style={s.row}>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Cost to Scale</Text>
                <Text style={s.statValAccent}>{scaleMultiplier}{'\u00D7'}</Text>
                <Text style={s.statSub}>+{fmtCurrency(calculations.costToScale)}/yr</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Per Provider</Text>
                <Text style={s.statVal}>{fmtCurrency(trueCostPerProvider)}</Text>
                <Text style={s.statSub}>annual true cost</Text>
              </View>
            </View>

            <View style={s.sep} />

            <Text style={s.secTitle}>Cost Components</Text>
            <View style={s.benchRow}>
              <View style={s.benchYou}>
                <Text style={s.benchLabel}>Direct Salary</Text>
                <Text style={s.benchVal}>{fmtCurrency(calculations.totalScribeCost)}</Text>
              </View>
              <View style={s.benchYou}>
                <Text style={s.benchLabel}>Turnover</Text>
                <Text style={s.benchVal}>{fmtCurrency(annualTurnoverCost)}</Text>
              </View>
              <View style={s.benchTarget}>
                <Text style={s.benchLabel}>Overhead</Text>
                <Text style={s.benchValAccent}>{fmtCurrency(managementOverhead)}</Text>
              </View>
            </View>

            <View style={s.sep} />

            <View style={s.metaRow}>
              <View style={s.metaCol}>
                <Text style={s.metaHd}>Your Inputs</Text>
                <Text style={s.metaItem}>{'\u2022'} {fmtNum(inputs.totalProviders)} total providers</Text>
                <Text style={s.metaItem}>{'\u2022'} {inputs.providersWithScribes} with scribe support</Text>
                <Text style={s.metaItem}>{'\u2022'} {inputs.scribeCount} scribes</Text>
                <Text style={s.metaItem}>{'\u2022'} ${inputs.scribeCostPerHour}/hr, {inputs.scribeHoursPerWeek} hrs/week</Text>
                <Text style={s.metaItem}>{'\u2022'} {fmtNum(inputs.annualEncounters)} annual encounters</Text>
              </View>
              <View style={s.metaCol}>
                <Text style={s.metaHd}>Assumptions</Text>
                <Text style={s.metaItem}>{'\u2022'} Turnover rate: {Math.round(turnoverRate * 100)}%</Text>
                <Text style={s.metaItem}>{'\u2022'} Training cost: {fmtCurrency(trainingCostPerScribe)}/scribe</Text>
                <Text style={s.metaItem}>{'\u2022'} Management overhead: 15%</Text>
                <Text style={s.metaItem}>{'\u2022'} {inputs.minutesPerEncounter || 10} min/encounter doc time</Text>
                <Text style={s.metaItem}>{'\u2022'} 50 working weeks/year</Text>
              </View>
            </View>

            <Text style={s.metaNote}>
              This analysis is for planning purposes. All calculations are based on inputs provided and industry benchmarks. Results should be validated with your organization's specific data and operational context.
            </Text>
          </View>

          <Footer page={5} total={totalPages} />
        </View>
      </Page>
    </Document>
  );
};

export const generateScribePDF = async (
  inputs: ScribeInputs,
  calculations: ScribeCalculations,
  clientName?: string,
  preparedBy?: string
): Promise<void> => {
  const blob = await pdf(
    <ScribePDFDocument
      inputs={inputs}
      calculations={calculations}
      clientName={clientName}
      preparedBy={preparedBy}
    />
  ).toBlob();

  const fileName = clientName
    ? `Abridge_Scribe_Analysis_${clientName.replace(/\s+/g, "_")}.pdf`
    : "Abridge_Scribe_Analysis.pdf";

  saveAs(blob, fileName);
};

export default ScribePDFDocument;
