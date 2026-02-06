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
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import type { SwitchInputs, SwitchCalculations } from "@/lib/switchGapCalculator";
import { ABRIDGE_BENCHMARKS, VALUE_ASSUMPTIONS } from "@/lib/switchGapCalculator";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";

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
  card: {
    backgroundColor: C.beige,
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
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
  dimCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  dimHdr: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dimName: {
    fontSize: 14,
    fontWeight: "bold",
    color: C.black,
  },
  dimPct: {
    fontSize: 11,
    color: C.primary,
  },
  dimRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  dimLabel: {
    fontSize: 9,
    color: C.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  dimVal: {
    fontSize: 16,
    fontWeight: "bold",
    color: C.black,
  },
  dimValAccent: {
    fontSize: 16,
    fontWeight: "bold",
    color: C.primary,
  },
  dimInsight: {
    fontSize: 10,
    color: C.gray,
    lineHeight: 1.4,
    backgroundColor: C.beige,
    padding: 8,
    borderRadius: 4,
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
  valCard: {
    flex: 1,
    backgroundColor: C.beige,
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
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
  scoreCard: {
    backgroundColor: C.beige,
    borderRadius: 8,
    padding: 18,
    marginBottom: 10,
    alignItems: "center",
  },
  scoreVal: {
    fontSize: 52,
    fontWeight: "bold",
    color: C.black,
    marginBottom: 2,
  },
  scoreMaturity: {
    fontSize: 14,
    fontWeight: "bold",
    color: C.primary,
    marginBottom: 10,
  },
  scoreDesc: {
    fontSize: 10,
    color: C.gray,
    textAlign: "center",
    lineHeight: 1.5,
    marginTop: 8,
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

interface AmbientPDFData {
  inputs: SwitchInputs;
  calculations: SwitchCalculations;
  clientName: string;
  preparedBy: string;
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

const maturityLabel = (score: number): string => {
  if (score >= 80) return "Mature Implementation";
  if (score >= 65) return "Developing Well";
  if (score >= 50) return "Early Progress";
  return "Just Getting Started";
};

const safe = (v: number) => (isNaN(v) ? 0 : v);

const Bar = ({ score, width = 240 }: { score: number; width?: number }) => {
  const pct = Math.min(100, Math.max(0, safe(score)));
  const filled = Math.max((pct / 100) * width, 3);
  return (
    <Svg width={width} height={8}>
      <Rect x={0} y={0} width={width} height={8} fill={C.border} rx={4} />
      <Rect x={0} y={0} width={filled} height={8} fill={C.primary} rx={4} />
    </Svg>
  );
};

const SmBar = ({ score, width = 140 }: { score: number; width?: number }) => {
  const pct = Math.min(100, Math.max(0, safe(score)));
  const filled = Math.max((pct / 100) * width, 3);
  return (
    <Svg width={width} height={6}>
      <Rect x={0} y={0} width={width} height={6} fill={C.border} rx={3} />
      <Rect x={0} y={0} width={filled} height={6} fill={C.primary} rx={3} />
    </Svg>
  );
};

const Footer = ({ page }: { page: number }) => (
  <View style={s.foot}>
    <Image src={abridgeLogoPath} style={{ width: 60 }} />
    <Text style={s.footTxt}>Page {page} of 6</Text>
  </View>
);

const AmbientPDFDocument = ({ data }: { data: AmbientPDFData }) => {
  const { inputs, calculations } = data;
  const providers = inputs.providers || 75;
  const encounters = inputs.annualEncounters || 150000;
  const monthlyGap = Math.round(calculations.annualGap / 12);
  const eligibleEncounters = Math.round(encounters * ABRIDGE_BENCHMARKS.utilization / 100);

  return (
    <Document>
      <PDFCoverPage
        reportLabel="AMBIENT ASSESSMENT"
        title={"Performance &\nOpportunity"}
        clientName={data.clientName}
        preparedBy={data.preparedBy}
      />

      {/* PAGE 2: YOUR PERFORMANCE PROFILE */}
      <Page size="LETTER" style={s.page} wrap={false}>
        <View style={s.wrap}>
          <View style={s.hdr}>
            <Text style={s.hdrLabel}>Your Performance Profile</Text>
            <Text style={s.hdrTitle}>Where You Are Today</Text>
          </View>

          <View style={s.body}>
            <Text style={s.orgLabel}>Your Organization</Text>
            <Text style={s.orgText}>
              {fmtNum(providers)} providers  {'\u00B7'}  {fmtNum(encounters)} annual encounters
            </Text>
            <Text style={s.orgDesc}>
              You've invested in ambient AI for your providers. This assessment measures how that investment is performing and where the opportunity lies ahead.
            </Text>

            <View style={[s.sep, { marginVertical: 8 }]} />

            <Text style={[s.dimLabelSm, { textAlign: "center" }]}>Value Realization Score</Text>
            <View style={s.scoreCard}>
              <Text style={s.scoreVal}>{safe(calculations.realizationScore)}%</Text>
              <Text style={s.scoreMaturity}>{maturityLabel(calculations.realizationScore)}</Text>
              <View style={{ width: 260 }}>
                <Bar score={calculations.realizationScore} width={260} />
              </View>
            </View>
            <Text style={s.scoreDesc}>
              This score compares your metrics against what mature Abridge implementations typically achieve. It's a starting point for understanding{'\u2014'}not a grade.
            </Text>

            <View style={s.sep} />

            <Text style={s.dimLabelSm}>Your Four Dimensions</Text>
            <View style={s.row}>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Adoption</Text>
                <Text style={s.statVal}>{inputs.utilization}%</Text>
                <Text style={s.statSub}>of providers using AI</Text>
                <Text style={[s.statSub, { color: C.primary, marginTop: 2 }]}>vs. {ABRIDGE_BENCHMARKS.utilization}%</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Efficiency</Text>
                <Text style={s.statVal}>{inputs.timeSavedPerEncounter} min</Text>
                <Text style={s.statSub}>saved per encounter</Text>
                <Text style={[s.statSub, { color: C.primary, marginTop: 2 }]}>vs. {ABRIDGE_BENCHMARKS.timeSavedAvg} min</Text>
              </View>
            </View>
            <View style={s.row}>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Quality</Text>
                <Text style={s.statVal}>+{inputs.wrvuLift}%</Text>
                <Text style={s.statSub}>wRVU improvement</Text>
                <Text style={[s.statSub, { color: C.primary, marginTop: 2 }]}>vs. +{ABRIDGE_BENCHMARKS.wrvuLift}%</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Experience</Text>
                <Text style={s.statVal}>{inputs.satisfaction}%</Text>
                <Text style={s.statSub}>would recommend</Text>
                <Text style={[s.statSub, { color: C.primary, marginTop: 2 }]}>vs. {ABRIDGE_BENCHMARKS.satisfaction}%</Text>
              </View>
            </View>

            <View style={s.callout}>
              <Text style={s.calloutHead}>What This Tells Us</Text>
              <Text style={s.calloutTxt}>
                {calculations.realizationScore >= 75
                  ? "You're ahead of most implementations we see. The focus now is refinement\u2014finding the remaining friction points and addressing them systematically."
                  : calculations.realizationScore >= 50
                  ? "You've made real progress. The infrastructure is in place. The opportunity ahead is in optimization\u2014understanding which specific factors are limiting value and addressing them."
                  : "You're in the early stages of realizing value. This is normal\u2014most organizations start here. The important thing is understanding why and having a path forward."
                }
              </Text>
            </View>
          </View>

          <Footer page={1} />
        </View>
      </Page>

      {/* PAGE 3: BENCHMARKS */}
      <Page size="LETTER" style={s.page} wrap={false}>
        <View style={s.wrap}>
          <View style={s.hdr}>
            <Text style={s.hdrLabel}>Benchmarks</Text>
            <Text style={s.hdrTitle}>What Mature Implementations Achieve</Text>
            <Text style={s.hdrSub}>
              These benchmarks reflect actual performance from established Abridge implementations. They represent achievable ranges{'\u2014'}not aspirational targets.
            </Text>
          </View>

          <View style={s.body}>
            <View style={s.dimCard}>
              <View style={s.dimHdr}>
                <Text style={s.dimName}>Adoption</Text>
                <Text style={s.dimPct}>{safe(calculations.utilizationScore)}% of benchmark</Text>
              </View>
              <View style={s.dimRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.dimLabel}>You</Text>
                  <Text style={s.dimVal}>{inputs.utilization}%</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.dimLabel}>Abridge Benchmark</Text>
                  <Text style={s.dimValAccent}>{ABRIDGE_BENCHMARKS.utilization}%</Text>
                </View>
                <View style={{ flex: 1, justifyContent: "flex-end" }}>
                  <SmBar score={calculations.utilizationScore} />
                </View>
              </View>
              <Text style={s.dimInsight}>
                Adoption measures how many providers consistently use AI documentation. When adoption is below 60%, it typically reflects workflow friction rather than a technology problem{'\u2014'}the tool isn't fitting naturally into how providers work.
              </Text>
            </View>

            <View style={s.dimCard}>
              <View style={s.dimHdr}>
                <Text style={s.dimName}>Efficiency</Text>
                <Text style={s.dimPct}>{safe(calculations.efficiencyScore)}% of benchmark</Text>
              </View>
              <View style={s.dimRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.dimLabel}>You</Text>
                  <Text style={s.dimVal}>{inputs.timeSavedPerEncounter} min</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.dimLabel}>Abridge Benchmark</Text>
                  <Text style={s.dimValAccent}>{ABRIDGE_BENCHMARKS.timeSavedAvg} min</Text>
                </View>
                <View style={{ flex: 1, justifyContent: "flex-end" }}>
                  <SmBar score={calculations.efficiencyScore} />
                </View>
              </View>
              <Text style={s.dimInsight}>
                Per-encounter documentation time reduction. When providers report lower savings, it often reflects workflow friction{'\u2014'}editing time, integration gaps, or notes that don't match their clinical style.
              </Text>
            </View>

            <View style={s.dimCard}>
              <View style={s.dimHdr}>
                <Text style={s.dimName}>Documentation Quality</Text>
                <Text style={s.dimPct}>{safe(calculations.qualityScore)}% of benchmark</Text>
              </View>
              <View style={s.dimRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.dimLabel}>You</Text>
                  <Text style={s.dimVal}>+{inputs.wrvuLift}%</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.dimLabel}>Abridge Benchmark</Text>
                  <Text style={s.dimValAccent}>+{ABRIDGE_BENCHMARKS.wrvuLift}%</Text>
                </View>
                <View style={{ flex: 1, justifyContent: "flex-end" }}>
                  <SmBar score={calculations.qualityScore} />
                </View>
              </View>
              <Text style={s.dimInsight}>
                Better documentation captures clinical complexity more accurately. Higher wRVU lift often indicates baseline documentation was incomplete. Lift within the benchmark range with already-strong documentation is equally healthy.
              </Text>
            </View>

            <View style={s.dimCard}>
              <View style={s.dimHdr}>
                <Text style={s.dimName}>Provider Experience</Text>
                <Text style={s.dimPct}>{safe(calculations.satisfactionScore)}% of benchmark</Text>
              </View>
              <View style={s.dimRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.dimLabel}>You</Text>
                  <Text style={s.dimVal}>{inputs.satisfaction}%</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.dimLabel}>Abridge Benchmark</Text>
                  <Text style={s.dimValAccent}>{ABRIDGE_BENCHMARKS.satisfaction}%</Text>
                </View>
                <View style={{ flex: 1, justifyContent: "flex-end" }}>
                  <SmBar score={calculations.satisfactionScore} />
                </View>
              </View>
              <Text style={s.dimInsight}>
                Provider experience is a leading indicator of sustained adoption. When experience scores are low, adoption tends to follow{'\u2014'}sometimes months later. Understanding what's driving the experience is essential to long-term value.
              </Text>
            </View>
          </View>

          <Footer page={2} />
        </View>
      </Page>

      {/* PAGE 4: THE OPPORTUNITY AHEAD */}
      <Page size="LETTER" style={s.page} wrap={false}>
        <View style={s.wrap}>
          <View style={s.hdr}>
            <Text style={s.hdrLabel}>Your Value Opportunity</Text>
            <Text style={s.hdrTitle}>The Opportunity Ahead</Text>
            <Text style={s.hdrSub}>
              The difference between your current performance and what mature implementations achieve{'\u2014'}expressed in hours, encounters, and dollars.
            </Text>
          </View>

          <View style={s.body}>
            <Text style={[s.dimLabelSm, { textAlign: "center" }]}>Annual Value Opportunity</Text>
            <View style={s.totalCard}>
              <Text style={s.totalVal}>{fmtCurrency(calculations.annualGap)}</Text>
              <Text style={s.totalSub}>potential additional value per year</Text>
            </View>

            <View style={s.sep} />

            <Text style={s.dimLabelSm}>What This Looks Like</Text>
            <View style={s.row}>
              <View style={s.valCard}>
                <Text style={s.statLabel}>Adoption</Text>
                <Text style={s.statValAccent}>{fmtCurrency(calculations.utilizationGapValue)}</Text>
                <Text style={s.statSub}>
                  {fmtNum(Math.round(encounters * (ABRIDGE_BENCHMARKS.utilization - inputs.utilization) / 100))} additional encounters with AI documentation
                </Text>
              </View>
              <View style={s.valCard}>
                <Text style={s.statLabel}>Efficiency</Text>
                <Text style={s.statValAccent}>{fmtCurrency(calculations.efficiencyGapValue)}</Text>
                <Text style={s.statSub}>
                  {fmtNum(calculations.efficiencyGapHours)} hours of provider time reclaimed
                </Text>
              </View>
              <View style={s.valCard}>
                <Text style={s.statLabel}>Quality</Text>
                <Text style={s.statValAccent}>{fmtCurrency(calculations.wrvuGapValue)}</Text>
                <Text style={s.statSub}>from improved documentation capture</Text>
              </View>
            </View>

            <View style={s.callout}>
              <Text style={s.calloutHead}>How to Read This</Text>
              <Text style={s.calloutTxt}>
                These aren't guaranteed outcomes. They represent what the math suggests based on benchmark performance. The path to capturing this value depends on addressing the specific factors in your implementation.
              </Text>
            </View>

            <View style={s.sep} />

            <Text style={s.secTitle}>The Timeline</Text>
            <Text style={[s.txt, { marginBottom: 8 }]}>
              Value grows as implementation matures. Earlier action accelerates value capture.
            </Text>

            <View style={s.row}>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Monthly Opportunity</Text>
                <Text style={s.statVal}>{fmtCurrency(monthlyGap)}</Text>
                <Text style={s.statSub}>potential value per month</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>3-Year Projection</Text>
                <Text style={s.statVal}>{fmtCurrency(calculations.threeYearGap)}</Text>
                <Text style={s.statSub}>cumulative value</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Room to Grow</Text>
                <Text style={s.statVal}>{100 - safe(calculations.realizationScore)}%</Text>
                <Text style={s.statSub}>remaining potential</Text>
              </View>
            </View>
          </View>

          <Footer page={3} />
        </View>
      </Page>

      {/* PAGE 5: THE MATH */}
      <Page size="LETTER" style={s.page} wrap={false}>
        <View style={s.wrap}>
          <View style={s.hdr}>
            <Text style={s.hdrLabel}>Transparency</Text>
            <Text style={s.hdrTitle}>The Math</Text>
            <Text style={s.hdrSub}>
              Every number traces back to your inputs and clearly stated assumptions. Adjust any value to match your organization's reality.
            </Text>
          </View>

          <View style={s.body}>
            <Text style={s.secLabel}>Calculation Breakdown</Text>

            {calculations.utilizationGapValue > 0 && (
              <View style={s.gapCard}>
                <View style={s.gapHdr}>
                  <Text style={s.gapTitle}>Adoption Opportunity</Text>
                  <Text style={s.gapVal}>{fmtCurrency(calculations.utilizationGapValue)}</Text>
                </View>
                <View style={s.gapBody}>
                  <Text style={s.gapStep}>Your adoption: {inputs.utilization}% {'\u2192'} Benchmark: {ABRIDGE_BENCHMARKS.utilization}% = {ABRIDGE_BENCHMARKS.utilization - inputs.utilization} point gap</Text>
                  <Text style={s.gapStep}>Additional encounters: {fmtNum(Math.round(encounters * (ABRIDGE_BENCHMARKS.utilization - inputs.utilization) / 100))}</Text>
                  <Text style={s.gapStep}>Time value: {'\u00D7'} {ABRIDGE_BENCHMARKS.timeSavedAvg} min {'\u00D7'} ${VALUE_ASSUMPTIONS.hourlyRate}/hr {'\u00D7'} {VALUE_ASSUMPTIONS.timeConversionRate * 100}% conversion</Text>
                  <Text style={[s.gapStep, { color: C.primary, fontWeight: "bold" }]}>= {fmtCurrency(calculations.utilizationGapValue)} / year</Text>
                </View>
              </View>
            )}

            {calculations.efficiencyGapValue > 0 && (
              <View style={s.gapCard}>
                <View style={s.gapHdr}>
                  <Text style={s.gapTitle}>Efficiency Opportunity</Text>
                  <Text style={s.gapVal}>{fmtCurrency(calculations.efficiencyGapValue)}</Text>
                </View>
                <View style={s.gapBody}>
                  <Text style={s.gapStep}>Your time saved: {inputs.timeSavedPerEncounter} min {'\u2192'} Benchmark: {ABRIDGE_BENCHMARKS.timeSavedAvg} min = {(ABRIDGE_BENCHMARKS.timeSavedAvg - inputs.timeSavedPerEncounter).toFixed(1)} min gap</Text>
                  <Text style={s.gapStep}>Encounters with AI: {fmtNum(eligibleEncounters)} (at {ABRIDGE_BENCHMARKS.utilization}% adoption)</Text>
                  <Text style={s.gapStep}>Additional hours saved: {fmtNum(Math.round((ABRIDGE_BENCHMARKS.timeSavedAvg - inputs.timeSavedPerEncounter) * eligibleEncounters / 60))} hours/year</Text>
                  <Text style={[s.gapStep, { color: C.primary, fontWeight: "bold" }]}>Value: {'\u00D7'} ${VALUE_ASSUMPTIONS.hourlyRate}/hr {'\u00D7'} {VALUE_ASSUMPTIONS.timeConversionRate * 100}% = {fmtCurrency(calculations.efficiencyGapValue)}</Text>
                </View>
              </View>
            )}

            {calculations.wrvuGapValue > 0 && (
              <View style={s.gapCard}>
                <View style={s.gapHdr}>
                  <Text style={s.gapTitle}>Documentation Quality (wRVU)</Text>
                  <Text style={s.gapVal}>{fmtCurrency(calculations.wrvuGapValue)}</Text>
                </View>
                <View style={s.gapBody}>
                  <Text style={s.gapStep}>Your wRVU lift: +{inputs.wrvuLift}% {'\u2192'} Benchmark: +{ABRIDGE_BENCHMARKS.wrvuLift}% = {(ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift).toFixed(1)}% gap</Text>
                  <Text style={s.gapStep}>Base wRVU: {VALUE_ASSUMPTIONS.avgWRVUPerEncounter} per encounter {'\u00D7'} {fmtNum(eligibleEncounters)} encounters</Text>
                  <Text style={s.gapStep}>Additional wRVU: {'\u00D7'} {(ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift).toFixed(1)}% improvement</Text>
                  <Text style={[s.gapStep, { color: C.primary, fontWeight: "bold" }]}>Value: {'\u00D7'} ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU {'\u00D7'} {Math.round(VALUE_ASSUMPTIONS.wrvuRealization * 100)}% = {fmtCurrency(calculations.wrvuGapValue)}</Text>
                </View>
              </View>
            )}

            {calculations.utilizationGapValue === 0 && calculations.efficiencyGapValue === 0 && calculations.wrvuGapValue === 0 && (
              <View style={s.callout}>
                <Text style={s.calloutHead}>At Benchmark</Text>
                <Text style={s.calloutTxt}>
                  Your implementation is performing at or above benchmark across all measured dimensions. The focus now shifts from closing gaps to maintaining excellence.
                </Text>
              </View>
            )}

            <View style={s.metaRow}>
              <View style={s.metaCol}>
                <Text style={s.metaHd}>Your Inputs</Text>
                <Text style={s.metaItem}>{'\u2022'} {fmtNum(providers)} providers</Text>
                <Text style={s.metaItem}>{'\u2022'} {fmtNum(encounters)} annual encounters</Text>
                <Text style={s.metaItem}>{'\u2022'} {inputs.utilization}% adoption rate</Text>
                <Text style={s.metaItem}>{'\u2022'} {inputs.timeSavedPerEncounter} min saved/encounter</Text>
                <Text style={s.metaItem}>{'\u2022'} +{inputs.wrvuLift}% wRVU lift</Text>
                <Text style={s.metaItem}>{'\u2022'} {inputs.satisfaction}% would recommend</Text>
              </View>
              <View style={s.metaCol}>
                <Text style={s.metaHd}>Value Assumptions</Text>
                <Text style={s.metaItem}>{'\u2022'} Provider cost: ${VALUE_ASSUMPTIONS.hourlyRate}/hour</Text>
                <Text style={s.metaItem}>{'\u2022'} wRVU value: ${VALUE_ASSUMPTIONS.wrvuDollarValue}</Text>
                <Text style={s.metaItem}>{'\u2022'} Time conversion: {VALUE_ASSUMPTIONS.timeConversionRate * 100}%</Text>
                <Text style={s.metaItem}>{'\u2022'} wRVU realization: {Math.round(VALUE_ASSUMPTIONS.wrvuRealization * 100)}%</Text>
              </View>
            </View>
          </View>

          <Footer page={4} />
        </View>
      </Page>

      {/* PAGE 6: PATTERNS */}
      <Page size="LETTER" style={s.page} wrap={false}>
        <View style={s.wrap}>
          <View style={s.hdr}>
            <Text style={s.hdrLabel}>Patterns</Text>
            <Text style={s.hdrTitle}>What We've Seen Work</Text>
            <Text style={s.hdrSub}>
              Across hundreds of ambient AI implementations, these patterns consistently influence outcomes.
            </Text>
          </View>

          <View style={s.body}>
            <Text style={s.secLabel}>Common Patterns</Text>
            <Text style={s.secTitle}>Why Some Implementations Succeed</Text>
            <Text style={s.secSub}>
              Technology alone doesn't change behavior. The organizations that capture full value share certain characteristics.
            </Text>

            <View style={s.patCard}>
              <View style={s.patNum}>
                <Text style={s.patNumTxt}>1</Text>
              </View>
              <View style={s.patContent}>
                <Text style={s.patTitle}>Adoption Is a Human Challenge</Text>
                <Text style={s.patTxt}>
                  Change management isn't a phase{'\u2014'}it's ongoing. The most effective implementations have dedicated resources for provider onboarding, feedback loops, and continuous improvement.
                </Text>
              </View>
            </View>

            <View style={s.patCard}>
              <View style={s.patNum}>
                <Text style={s.patNumTxt}>2</Text>
              </View>
              <View style={s.patContent}>
                <Text style={s.patTitle}>Continuous Optimization Matters</Text>
                <Text style={s.patTxt}>
                  Set-it-and-forget-it doesn't work. Mature implementations review performance regularly, identify friction points, and make adjustments. The tool improves because someone is paying attention.
                </Text>
              </View>
            </View>

            <View style={s.patCard}>
              <View style={s.patNum}>
                <Text style={s.patNumTxt}>3</Text>
              </View>
              <View style={s.patContent}>
                <Text style={s.patTitle}>Deep Customization Drives Results</Text>
                <Text style={s.patTxt}>
                  Generic configurations miss the nuances of different specialties and workflows. Organizations that invest in specialty-specific workflows see meaningfully higher adoption and satisfaction.
                </Text>
              </View>
            </View>

            <View style={s.patCard}>
              <View style={s.patNum}>
                <Text style={s.patNumTxt}>4</Text>
              </View>
              <View style={s.patContent}>
                <Text style={s.patTitle}>Executive Visibility Sustains Momentum</Text>
                <Text style={s.patTxt}>
                  When leadership tracks ambient AI as a strategic initiative{'\u2014'}not just an IT project{'\u2014'}resources and attention follow. Executive sponsorship correlates strongly with sustained adoption.
                </Text>
              </View>
            </View>

            <View style={s.callout}>
              <Text style={s.calloutHead}>The Bottom Line</Text>
              <Text style={s.calloutTxt}>
                The technology matters. But the approach to implementation, adoption, and ongoing optimization matters just as much. We've seen this consistently across hundreds of organizations.
              </Text>
            </View>
          </View>

          <Footer page={5} />
        </View>
      </Page>

      {/* PAGE 7: YOUR SUMMARY */}
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
                <Text style={s.statLabel}>Realization Score</Text>
                <Text style={s.statVal}>{safe(calculations.realizationScore)}%</Text>
                <Text style={[s.statSub, { color: C.primary }]}>{maturityLabel(calculations.realizationScore)}</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Annual Opportunity</Text>
                <Text style={s.statValAccent}>{fmtCurrency(calculations.annualGap)}</Text>
                <Text style={s.statSub}>potential value</Text>
              </View>
            </View>
            <View style={s.row}>
              <View style={s.statCard}>
                <Text style={s.statLabel}>3-Year Projection</Text>
                <Text style={s.statVal}>{fmtCurrency(calculations.threeYearGap)}</Text>
                <Text style={s.statSub}>cumulative</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Monthly</Text>
                <Text style={s.statValAccent}>{fmtCurrency(monthlyGap)}</Text>
                <Text style={s.statSub}>per month</Text>
              </View>
            </View>

            <View style={s.sep} />

            <Text style={s.secTitle}>Your Dimensions vs. Benchmark</Text>

            <View style={s.benchRow}>
              <View style={s.benchYou}>
                <Text style={s.benchLabel}>Adoption - You</Text>
                <Text style={s.benchVal}>{inputs.utilization}%</Text>
              </View>
              <View style={s.benchTarget}>
                <Text style={s.benchLabel}>Adoption - Benchmark</Text>
                <Text style={s.benchValAccent}>{ABRIDGE_BENCHMARKS.utilization}%</Text>
              </View>
            </View>

            <View style={s.benchRow}>
              <View style={s.benchYou}>
                <Text style={s.benchLabel}>Efficiency - You</Text>
                <Text style={s.benchVal}>{inputs.timeSavedPerEncounter} min</Text>
              </View>
              <View style={s.benchTarget}>
                <Text style={s.benchLabel}>Efficiency - Benchmark</Text>
                <Text style={s.benchValAccent}>{ABRIDGE_BENCHMARKS.timeSavedAvg} min</Text>
              </View>
            </View>

            <View style={s.benchRow}>
              <View style={s.benchYou}>
                <Text style={s.benchLabel}>Quality - You</Text>
                <Text style={s.benchVal}>+{inputs.wrvuLift}%</Text>
              </View>
              <View style={s.benchTarget}>
                <Text style={s.benchLabel}>Quality - Benchmark</Text>
                <Text style={s.benchValAccent}>+{ABRIDGE_BENCHMARKS.wrvuLift}%</Text>
              </View>
            </View>

            <View style={s.benchRow}>
              <View style={s.benchYou}>
                <Text style={s.benchLabel}>Experience - You</Text>
                <Text style={s.benchVal}>{inputs.satisfaction}%</Text>
              </View>
              <View style={s.benchTarget}>
                <Text style={s.benchLabel}>Experience - Benchmark</Text>
                <Text style={s.benchValAccent}>{ABRIDGE_BENCHMARKS.satisfaction}%</Text>
              </View>
            </View>

            <View style={s.callout}>
              <Text style={s.calloutHead}>What This Means</Text>
              <Text style={s.calloutTxt}>
                {calculations.realizationScore >= 75
                  ? `At ${safe(calculations.realizationScore)}%, you're outperforming most implementations. The ${fmtCurrency(calculations.annualGap)} remaining opportunity is about refinement\u2014finding edge cases and optimizing further. The foundation is strong.`
                  : calculations.realizationScore >= 50
                  ? `At ${safe(calculations.realizationScore)}%, you've made real progress. The ${fmtCurrency(calculations.annualGap)} opportunity ahead isn't about starting over\u2014it's about understanding which specific factors are limiting value and addressing them. The answers are usually specific and actionable.`
                  : `At ${safe(calculations.realizationScore)}%, you're early in the journey. That's normal. The ${fmtCurrency(calculations.annualGap)} ahead represents what's possible with the right support. The encouraging part: you don't need to change everything. Usually it's a few specific things that explain most of the gap.`
                }
              </Text>
            </View>

            <Text style={s.metaNote}>
              This assessment is for planning purposes. All calculations are based on inputs provided and Abridge benchmark data. Actual results depend on implementation approach, organizational readiness, and clinical workflow factors.
            </Text>
          </View>

          <Footer page={6} />
        </View>
      </Page>
    </Document>
  );
};

export async function generateAmbientPDF(data: Omit<AmbientPDFData, 'calculations'> & { calculations: SwitchCalculations }): Promise<void> {
  const blob = await pdf(<AmbientPDFDocument data={data} />).toBlob();
  const fileName = `ambient-assessment-${new Date().toISOString().split('T')[0]}.pdf`;

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

  if (isMobile) {
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: "application/pdf" });
      const shareData = { files: [file], title: "Ambient Assessment" };

      if (navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
        }
      }
    }

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } else {
    saveAs(blob, fileName);
  }
}
