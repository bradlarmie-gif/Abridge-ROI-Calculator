import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Svg,
  Rect,
  Font,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import type { ScribeInputs, ScribeCalculations } from "@/lib/scribeGapCalculator";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";

Font.registerHyphenationCallback((word) => [word]);

Font.register({
  family: "Manrope",
  fonts: [
    { src: manropeRegular, fontWeight: 400 },
    { src: manropeBold, fontWeight: 700 },
  ],
});

const colors = {
  background: "#FFFFFF",
  cards: "#F5F0EB",
  primary: "#EA2C00",
  primaryText: "#1A1A1A",
  secondary: "#666666",
  tertiary: "#999999",
  border: "#E0E0E0",
};

const styles = StyleSheet.create({
  page: {
    padding: 54,
    paddingBottom: 50,
    fontFamily: "Manrope",
    fontSize: 10.5,
    color: colors.primaryText,
    backgroundColor: colors.background,
  },
  pageWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  sectionLabel: {
    fontSize: 9,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: "bold",
  },
  sectionLabelGray: {
    fontSize: 9,
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: "bold",
  },
  sectionHeadline: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primaryText,
    marginBottom: 6,
  },
  subHeadline: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primaryText,
    marginBottom: 8,
  },
  body: {
    fontSize: 10.5,
    color: colors.secondary,
    lineHeight: 1.5,
    marginBottom: 12,
  },
  caption: {
    fontSize: 8.5,
    color: colors.tertiary,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginVertical: 10,
  },
  thickDivider: {
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    marginVertical: 12,
  },
  cardBg: {
    backgroundColor: colors.cards,
    padding: 14,
    borderRadius: 4,
  },
  calloutBox: {
    backgroundColor: colors.cards,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: 12,
  },
  footer: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerLeft: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: "bold",
  },
  footerCenter: {
    fontSize: 8.5,
    color: colors.secondary,
  },
  footerRight: {
    fontSize: 8.5,
    color: colors.tertiary,
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
  return `$${Math.round(n).toLocaleString()}`;
};

const fmtNum = (n: number): string => {
  if (isNaN(n) || n === undefined) return "0";
  return Math.round(n).toLocaleString();
};

const safe = (v: number) => (isNaN(v) ? 0 : v);

const CoverageBar = ({ percent, width = 400 }: { percent: number; width?: number }) => {
  const pct = Math.min(100, Math.max(0, safe(percent)));
  const filled = Math.max((pct / 100) * width, 3);
  return (
    <Svg width={width} height={10}>
      <Rect x={0} y={0} width={width} height={10} fill={colors.border} rx={5} />
      <Rect x={0} y={0} width={filled} height={10} fill={colors.primary} rx={5} />
    </Svg>
  );
};

const PageFooter = ({ pageNum, orgName }: { pageNum: number; orgName: string }) => (
  <View style={styles.footer}>
    <Text style={styles.footerLeft}>ABRIDGE</Text>
    <Text style={styles.footerCenter}>{orgName} {"\u00B7"} Scribe Program Analysis</Text>
    <Text style={styles.footerRight}>Page {pageNum} of 4</Text>
  </View>
);

const CostLineItem = ({
  title,
  amount,
  lines,
  isLast,
}: {
  title: string;
  amount: string;
  lines: string[];
  isLast?: boolean;
}) => (
  <View style={{ marginBottom: isLast ? 0 : 0 }}>
    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
      <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 36 }} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{title}</Text>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{amount}</Text>
        </View>
        {lines.map((line, i) => (
          <Text key={i} style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>{line}</Text>
        ))}
      </View>
    </View>
    {!isLast && <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 8 }} />}
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
  const hiddenCostPct = calculations.totalScribeCost > 0 ? Math.round((totalHiddenCosts / calculations.totalScribeCost) * 100) : 0;
  const scaleMultiplier = calculations.totalScribeCost > 0 ? Math.round(calculations.fullScribeCost / calculations.totalScribeCost) : 1;
  const fullCoverageTrueCost = Math.round(calculations.fullScribeCost * (1 + hiddenCostPct / 100));
  const scribeReplacements = Math.round(inputs.scribeCount * turnoverRate);
  const orgName = clientName || "Organization";
  const aiCostPerProvider = 2500;

  return (
    <Document>
      <PDFCoverPage
        reportLabel="SCRIBE PROGRAM ANALYSIS"
        title={orgName}
        subtitle={`${fmtNum(inputs.totalProviders)} providers \u00B7 ${fmtNum(inputs.scribeCount)} scribes \u00B7 Outpatient`}
        preparedBy={preparedBy}
      />

      {/* PAGE 1: YOUR PROGRAM (Current State + Hidden Costs) */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>YOUR PROGRAM</Text>

          <View style={[styles.cardBg, { paddingVertical: 14, paddingHorizontal: 18, marginBottom: 6 }]}>
            <Text style={{ fontSize: 14, color: colors.secondary, marginBottom: 6 }}>
              {fmtNum(inputs.totalProviders)} providers. {fmtNum(inputs.scribeCount)} scribes. {safe(calculations.coveragePercent)}% coverage.
            </Text>
            <Text style={{ fontSize: 36, fontWeight: "bold", color: colors.primary, marginBottom: 6 }}>
              True Annual Cost: {fmtCurrency(trueTotalCost)}
            </Text>
            <Text style={{ fontSize: 10.5, color: colors.secondary, lineHeight: 1.5, marginBottom: 10 }}>
              You see {fmtCurrency(calculations.totalScribeCost)} on the budget. The real number is {hiddenCostPct}% higher when you account for turnover and overhead.
            </Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{fmtCurrency(calculations.totalScribeCost)}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>direct investment</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{safe(calculations.coveragePercent)}%</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>coverage {inputs.providersWithScribes}/{inputs.totalProviders}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(trueCostPerProvider)}</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>per provider{"\u00B9"}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.background, padding: 8, borderRadius: 3, alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>{safe(calculations.scribeRatio)}:1</Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginTop: 2 }}>provider ratio</Text>
              </View>
            </View>
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabel}>THE TRUE COST</Text>
          <Text style={{ fontSize: 10.5, color: colors.secondary, lineHeight: 1.5, marginBottom: 8 }}>
            Every scribe program carries costs that don't appear on a budget line. Understanding them is essential.
          </Text>

          <View style={styles.divider} />

          <CostLineItem
            title="Direct Salary"
            amount={fmtCurrency(calculations.totalScribeCost)}
            lines={[
              `${inputs.scribeCount} scribes \u00D7 $${inputs.scribeCostPerHour}/hr \u00D7 ${inputs.scribeHoursPerWeek} hrs/wk \u00D7 50 wks`,
            ]}
          />
          <CostLineItem
            title="Turnover & Training"
            amount={fmtCurrency(annualTurnoverCost)}
            lines={[
              `~${Math.round(turnoverRate * 100)}% annual turnover \u2192 ~${scribeReplacements} replacements/year`,
              `${scribeReplacements} scribes \u00D7 ${fmtCurrency(trainingCostPerScribe)} training cost\u00B2`,
            ]}
          />
          <CostLineItem
            title="Management Overhead"
            amount={fmtCurrency(managementOverhead)}
            lines={[
              "Scheduling, supervision, QA, admin support",
              `${fmtCurrency(calculations.totalScribeCost)} \u00D7 15%\u00B3`,
            ]}
            isLast
          />

          <View style={{ borderBottomWidth: 2, borderBottomColor: colors.border, marginVertical: 8 }} />

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primaryText }}>True Annual Investment</Text>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(trueTotalCost)}</Text>
          </View>
          <Text style={{ fontSize: 9, color: colors.tertiary, textAlign: "center", marginBottom: 6 }}>
            Hidden costs add {hiddenCostPct}% to your direct investment
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionLabelGray}>COVERAGE GAP</Text>
          <View style={[styles.cardBg, { marginBottom: 6 }]}>
            <View style={{ marginBottom: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 9, color: colors.secondary }}>Covered: {safe(calculations.coveragePercent)}%</Text>
                <Text style={{ fontSize: 9, color: colors.tertiary }}>Unsupported: {100 - safe(calculations.coveragePercent)}%</Text>
              </View>
              <CoverageBar percent={calculations.coveragePercent} />
            </View>
            <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
              {fmtNum(safe(calculations.providersWithoutSupport))} providers ({100 - safe(calculations.coveragePercent)}%) document without any support. That's ~{fmtNum(safe(calculations.unsupportedDocTimeHours))} hours of unsupported documentation/year.
            </Text>
          </View>

          <View style={[styles.calloutBox, { marginBottom: 6 }]}>
            <Text style={{ fontSize: 10, color: colors.primaryText, lineHeight: 1.5 }}>
              Scribes bring real value{"\u2014"}relationships, institutional knowledge, provider trust. This isn't about replacing what works. It's about understanding the full investment and where the opportunity lies.
            </Text>
          </View>

          <View style={styles.divider} />
          <Text style={styles.caption}>
            {"\u00B9"} True cost per supported provider: {fmtCurrency(trueTotalCost)} {"\u00F7"} {inputs.providersWithScribes} = {fmtCurrency(trueCostPerProvider)}{"   "}
            {"\u00B2"} Industry average scribe turnover: 35-45%{"   "}
            {"\u00B3"} Industry benchmark for scribe program overhead
          </Text>

          <PageFooter pageNum={1} orgName={orgName} />
        </View>
      </Page>

      {/* PAGE 2: THE SCALING QUESTION (Economics + Comparison) */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>THE SCALING QUESTION</Text>
          <Text style={styles.sectionHeadline}>What Full Coverage Actually Costs</Text>
          <Text style={styles.body}>
            Scribes scale linearly{"\u2014"}no economies of scale. Here's what closing your coverage gap would require.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionLabelGray}>THE MATH</Text>

          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 50 }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Full Scribe Coverage</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(calculations.fullScribeCost)}/yr</Text>
                </View>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  {inputs.totalProviders} providers {"\u00F7"} {safe(calculations.scribeRatio)}:1 ratio = {safe(calculations.scribesNeededForFullCoverage)} scribes
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  {safe(calculations.scribesNeededForFullCoverage)} {"\u00D7"} {fmtCurrency(calculations.scribeSalaryAnnual)}/yr = {fmtCurrency(calculations.fullScribeCost)} direct
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  + hidden costs (~{hiddenCostPct}%) = {fmtCurrency(fullCoverageTrueCost)} true cost
                </Text>
              </View>
            </View>
            <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 8 }} />
          </View>

          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 40 }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Additional Investment Required</Text>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>+{fmtCurrency(calculations.costToScale)}/yr</Text>
                </View>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  Full coverage: {fmtCurrency(calculations.fullScribeCost)} {"\u2212"} Current: {fmtCurrency(calculations.totalScribeCost)}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  Plus {safe(calculations.additionalScribesNeeded)} additional scribes to hire and manage
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.cardBg, { marginBottom: 8 }]}>
            <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontWeight: "bold" }}>
              COVERAGE COMPARISON
            </Text>
            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>Today ({safe(calculations.coveragePercent)}%)</Text>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>{fmtCurrency(calculations.totalScribeCost)}</Text>
              </View>
              <CoverageBar percent={calculations.coveragePercent} />
            </View>
            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>Full Coverage (100%)</Text>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(calculations.fullScribeCost)}</Text>
              </View>
              <CoverageBar percent={100} />
            </View>
            <Text style={{ fontSize: 12, fontWeight: "bold", color: colors.primary, textAlign: "center" }}>
              {scaleMultiplier}{"\u00D7"} your current investment for full coverage
            </Text>
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabel}>A DIFFERENT APPROACH</Text>
          <Text style={styles.subHeadline}>The Per-Provider Comparison</Text>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 9, color: colors.secondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>SCRIBES</Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>{fmtCurrency(trueCostPerProvider)}</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, marginBottom: 8 }}>per provider/year</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.6 }}>
                {safe(calculations.coveragePercent)}% coverage{"\n"}
                Linear scaling{"\n"}
                {Math.round(turnoverRate * 100)}% annual turnover{"\n"}
                Training ramp: 3-6 mo
              </Text>
            </View>
            <View style={{ flex: 1, padding: 14, borderRadius: 4, backgroundColor: colors.background, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
              <Text style={{ fontSize: 9, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>AMBIENT AI</Text>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>~{fmtCurrency(aiCostPerProvider)}</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, marginBottom: 8 }}>per provider/year</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.6 }}>
                100% coverage{"\n"}
                Flat per-provider cost{"\n"}
                No turnover impact{"\n"}
                Available day one
              </Text>
            </View>
          </View>

          <View style={[styles.calloutBox, { marginBottom: 6 }]}>
            <Text style={{ fontSize: 10, color: colors.primaryText, lineHeight: 1.5 }}>
              This isn't scribes vs. AI. Many organizations find that a thoughtful blend{"\u2014"}retaining scribes where they add unique value, using AI for broader coverage{"\u2014"}delivers the best outcomes.
            </Text>
          </View>

          <PageFooter pageNum={2} orgName={orgName} />
        </View>
      </Page>

      {/* PAGE 3: WHAT WE'VE SEEN (Patterns + Transition) */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>WHAT WE'VE SEEN</Text>
          <Text style={styles.sectionHeadline}>Why Organizations Are Evolving</Text>
          <Text style={styles.body}>
            Scribes deliver genuine value. But the model has structural limitations that become visible as organizations grow.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionLabelGray}>FOUR PATTERNS</Text>

          {[
            {
              title: "1. Coverage Gaps Are Universal",
              text: "No scribe program covers 100% of providers. This creates a two-tier experience\u2014some get support, others don't.",
            },
            {
              title: "2. Turnover Erodes Quality",
              text: "Each new scribe takes months to learn a provider's preferences and specialty nuances. That learning period = lost productivity.",
            },
            {
              title: "3. Linear Costs Limit Growth",
              text: "Doubling coverage means doubling costs\u2014plus management overhead. No economies of scale.",
            },
            {
              title: "4. Right Tool, Right Problem",
              text: "Matching documentation approach to clinical setting. A thoughtful blend often delivers the best outcomes.",
            },
          ].map((pattern, i) => (
            <View key={i} style={{ marginBottom: i < 3 ? 6 : 0 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ width: 3, backgroundColor: colors.primary, marginRight: 10, borderRadius: 1, minHeight: 30 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 2 }}>{pattern.title}</Text>
                  <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>{pattern.text}</Text>
                </View>
              </View>
              {i < 3 && <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 6 }} />}
            </View>
          ))}

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabel}>THE TRANSITION QUESTION</Text>
          <Text style={styles.subHeadline}>What Organizations That Transitioned Tell Us</Text>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>"Our scribes are great"</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                Many organizations retain scribes in high-complexity settings while using AI for broader coverage.
              </Text>
            </View>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>"Providers won't accept AI notes"</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                Providers who've had good scribes are often the most surprised by AI quality. The bar is high{"\u2014"}and being met.
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>"We can't disrupt workflows"</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                90-day guided onboarding is designed for organizations with existing programs. Phased rollout, not a switch overnight.
              </Text>
            </View>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText, marginBottom: 4 }}>"What about the scribes themselves?"</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.4 }}>
                Many organizations transition scribes into clinical support, MA, or documentation quality roles. The skills transfer.
              </Text>
            </View>
          </View>

          <View style={[styles.cardBg, { alignItems: "center", paddingVertical: 12 }]}>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.primary, marginBottom: 4 }}>
              Average time from decision to full deployment: 90 days
            </Text>
            <Text style={{ fontSize: 9, color: colors.secondary }}>
              Including phased rollout alongside existing scribe program.
            </Text>
          </View>

          <PageFooter pageNum={3} orgName={orgName} />
        </View>
      </Page>

      {/* PAGE 4: YOUR ANALYSIS (Summary + Methodology) */}
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>YOUR ANALYSIS</Text>

          <View style={[styles.cardBg, { paddingVertical: 20, paddingHorizontal: 24, marginBottom: 10 }]}>
            <Text style={{ fontSize: 18, color: colors.primaryText, marginBottom: 4 }}>
              {fmtNum(inputs.totalProviders)} providers.
            </Text>
            <Text style={{ fontSize: 18, color: colors.primaryText, marginBottom: 4 }}>
              {fmtNum(inputs.scribeCount)} scribes.
            </Text>
            <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary, marginBottom: 8 }}>
              {safe(calculations.coveragePercent)}% coverage.
            </Text>
            <Text style={{ fontSize: 11, color: colors.secondary, lineHeight: 1.5 }}>
              {fmtNum(safe(calculations.providersWithoutSupport))} providers document alone. Closing that gap with scribes would cost {fmtCurrency(calculations.costToScale)} more per year.
            </Text>
          </View>

          <View style={[styles.calloutBox, { marginBottom: 10 }]}>
            <Text style={{ fontSize: 11, color: colors.primaryText, lineHeight: 1.6 }}>
              Your scribe program has delivered real value. The question isn't whether scribes work{"\u2014"}it's whether there's a more sustainable path to give every provider the documentation support they need.
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabelGray}>AT A GLANCE</Text>

          <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>COST ANALYSIS</Text>
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 4 }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>Direct Salary</Text>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>{fmtCurrency(calculations.totalScribeCost)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>Turnover & Training</Text>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>{fmtCurrency(annualTurnoverCost)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>Management Overhead</Text>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>{fmtCurrency(managementOverhead)}</Text>
              </View>
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primaryText }}>True Annual Cost</Text>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(trueTotalCost)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>Per Provider</Text>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>{fmtCurrency(trueCostPerProvider)}</Text>
              </View>
            </View>

            <View style={{ width: 1, backgroundColor: colors.border }} />

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: "bold" }}>COVERAGE ANALYSIS</Text>
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 4 }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>Current Coverage</Text>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>{safe(calculations.coveragePercent)}%</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>Unsupported Providers</Text>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>{fmtNum(safe(calculations.providersWithoutSupport))}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>Unsupported Hours</Text>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>{fmtNum(safe(calculations.unsupportedDocTimeHours))}</Text>
              </View>
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>Cost to Reach 100%</Text>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: colors.primary }}>{fmtCurrency(calculations.fullScribeCost)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>Additional Needed</Text>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>+{fmtCurrency(calculations.costToScale)}</Text>
              </View>
              <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginVertical: 4 }} />
              <Text style={{ fontSize: 9, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, marginTop: 2, fontWeight: "bold" }}>COMPARISON</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>Scribes</Text>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>{fmtCurrency(trueCostPerProvider)}/provider</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, color: colors.primaryText }}>Ambient AI</Text>
                <Text style={{ fontSize: 10, color: colors.primary }}>~{fmtCurrency(aiCostPerProvider)}/provider</Text>
              </View>
            </View>
          </View>

          <View style={styles.thickDivider} />

          <Text style={styles.sectionLabel}>METHODOLOGY</Text>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>YOUR INPUTS</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7 }}>
                {fmtNum(inputs.totalProviders)} total providers{"\n"}
                {inputs.providersWithScribes} with scribe support{"\n"}
                {inputs.scribeCount} scribes{"\n"}
                ${inputs.scribeCostPerHour}/hr, {inputs.scribeHoursPerWeek} hrs/week{"\n"}
                {fmtNum(inputs.annualEncounters)} annual encounters{"\n"}
                {safe(calculations.scribeRatio)}:1 provider ratio
              </Text>
            </View>
            <View style={[styles.cardBg, { flex: 1 }]}>
              <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>ASSUMPTIONS</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.7 }}>
                Turnover rate: {Math.round(turnoverRate * 100)}%{"\n"}
                Training cost: {fmtCurrency(trainingCostPerScribe)}/scribe{"\n"}
                Mgmt overhead: 15%{"\n"}
                Doc time: {inputs.minutesPerEncounter || 10} min/enc{"\n"}
                Working weeks: 50/year
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 8.5, color: colors.tertiary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>FORMULAS</Text>
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 8.5, color: colors.secondary, fontFamily: "Courier", lineHeight: 1.6 }}>
              Direct Cost = Scribes {"\u00D7"} Hourly {"\u00D7"} Weekly Hrs {"\u00D7"} 50 weeks{"\n"}
              Turnover Cost = Scribes {"\u00D7"} Turnover% {"\u00D7"} Training$/scribe{"\n"}
              Overhead = Direct Cost {"\u00D7"} 15%{"\n"}
              True Cost = Direct + Turnover + Overhead{"\n"}
              Coverage = Supported Providers {"\u00F7"} Total Providers{"\n"}
              Full Scale = Total Providers {"\u00F7"} Ratio {"\u00D7"} Cost/Scribe
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.5 }}>
            This analysis is for planning purposes. Hidden cost estimates use industry benchmarks. Results should be validated with your organization's specific data and operational context.
          </Text>

          <PageFooter pageNum={4} orgName={orgName} />
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

  const orgName = clientName ? clientName.replace(/[^a-zA-Z0-9]/g, "_") : "Organization";
  const fileName = `Abridge_Scribe_Analysis_${orgName}.pdf`;

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

  if (isMobile) {
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: "application/pdf" });
      const shareData = { files: [file], title: "Scribe Program Analysis" };

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
};

export default ScribePDFDocument;
