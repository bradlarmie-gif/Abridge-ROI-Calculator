import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
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
  separator: "#F0EBE4",
  separatorHeavy: "#E5DCD0",
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
  sectionHeadline: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primaryText,
    marginBottom: 6,
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
  cardBg: {
    backgroundColor: colors.cards,
    padding: 14,
    borderRadius: 4,
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

// ───────────────────────── Type exports ─────────────────────────

export type ExploreCareSetting = "outpatient" | "ed" | "inpatient" | "nursing";

/**
 * @deprecated Legacy alias preserved for backward import compatibility.
 * The unified Sprint 2H PDF uses the quadrant-aware shape below.
 */
export interface ExploreDriver {
  id: string;
  name: string;
  value: number;
  category?: "time" | "documentation";
  calcSteps?: string[];
  calibrationNote?: string;
  inputs?: Record<string, number | string>;
}

export interface ExplorePDFQuadrantDriver {
  id: string;
  label: string;
  shortDescription: string;
  visibility: "quantified" | "qualitative";
  value: number;
  isChild?: boolean;
}

export interface ExplorePDFOtherBenefit {
  label: string;
  amount: number;
  type: "annual" | "oneTime";
}

export interface ExplorePDFQuadrantData {
  quadrant: "Capacity" | "Workforce" | "Revenue" | "Quality";
  annualTotal: number;
  oneTimeTotal: number;
  drivers: ExplorePDFQuadrantDriver[];
  otherFinancialBenefits: ExplorePDFOtherBenefit[];
}

export interface ExplorePDFData {
  // Cover page (preserved from prior shape)
  clientName: string;
  preparedBy: string;
  date: string;
  careSettingLabel: string;

  // Practice / setup
  careSetting: ExploreCareSetting;
  numberOfProviders: number;
  nursingStaffedBeds?: number;
  nursingOccupancyRate?: number;
  annualEncounters: number;
  utilizationPercent: number;

  // Time savings
  totalHoursSaved: number;
  minutesSavedPerEncounter: number;
  timePathScenario: string;

  // Quadrants — ordered Capacity, Workforce, Revenue, Quality
  quadrants: ExplorePDFQuadrantData[];
  totalAnnualValue: number;
  totalOneTimeValue: number;

  // Investment
  pricingModel: "perProvider" | "perEncounter" | "annual";
  costPerProvider?: number;
  costPerEncounter?: number;
  annualLicenseFee?: number;
  implementationFee: number;
  includeImplementation: boolean;
  annualInvestment: number;

  // 3-Year Projection
  year2GrowthPercent: number;
  year3GrowthPercent: number;
  year1Value: number;
  year2Value: number;
  year3Value: number;
  year1Investment: number;
  year2Investment: number;
  year3Investment: number;
  year1Net: number;
  year2Net: number;
  year3Net: number;
  threeYearGrossTotal: number;
  threeYearInvestmentTotal: number;
  threeYearNetTotal: number;

  // Headline
  netAnnualValue: number;
  roi: number;
  valuePerProvider: number;
}

// ───────────────────────── Helpers ─────────────────────────

const fmtCurrency = (n: number): string => {
  const v = Math.round(n);
  if (Math.abs(v) >= 1_000_000) {
    return `$${(v / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(v) >= 1000) {
    return `$${Math.round(v / 1000).toLocaleString()}K`;
  }
  return `$${v.toLocaleString()}`;
};

const fmtCurrencyExact = (n: number): string => `$${Math.round(n).toLocaleString()}`;

const fmtNum = (n: number): string => Math.round(n).toLocaleString();

// ───────────────────────── Reusable components ─────────────────────────

const PageFooter = ({
  pageNum,
  orgName,
  settingLabel,
  totalPages,
}: {
  pageNum: number;
  orgName: string;
  settingLabel: string;
  totalPages: number;
}) => (
  <View style={styles.footer} fixed>
    <Text style={styles.footerLeft}>Abridge</Text>
    <Text style={styles.footerCenter}>
      {orgName} · {settingLabel} ROI Model
    </Text>
    <Text style={styles.footerRight}>
      Page {pageNum} of {totalPages}
    </Text>
  </View>
);

const StatBlock = ({
  label,
  value,
  caption,
  emphasis = false,
}: {
  label: string;
  value: string;
  caption?: string;
  emphasis?: boolean;
}) => (
  <View style={{ flex: 1, paddingHorizontal: 6 }}>
    <Text
      style={{
        fontSize: 8,
        color: colors.secondary,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 4,
      }}
    >
      {label}
    </Text>
    <Text
      style={{
        fontSize: emphasis ? 22 : 18,
        fontWeight: "bold",
        color: emphasis ? colors.primary : colors.primaryText,
        marginBottom: caption ? 2 : 0,
      }}
    >
      {value}
    </Text>
    {caption ? (
      <Text style={{ fontSize: 8.5, color: colors.tertiary }}>{caption}</Text>
    ) : null}
  </View>
);

const DriverRow = ({ driver }: { driver: ExplorePDFQuadrantDriver }) => {
  const indent = driver.isChild ? 14 : 0;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 6,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.separator,
        paddingLeft: indent,
      }}
      wrap={false}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text
          style={{
            fontSize: 10.5,
            fontWeight: "bold",
            color: colors.primaryText,
            marginBottom: 2,
          }}
        >
          {driver.isChild ? `↳ ${driver.label}` : driver.label}
        </Text>
        <Text style={{ fontSize: 8.5, color: colors.tertiary, lineHeight: 1.4 }}>
          {driver.shortDescription}
        </Text>
      </View>
      <View style={{ width: 110, alignItems: "flex-end" }}>
        {driver.visibility === "quantified" ? (
          <Text
            style={{
              fontSize: 11,
              fontWeight: "bold",
              color: colors.primaryText,
            }}
          >
            {fmtCurrency(driver.value)}
          </Text>
        ) : (
          <Text
            style={{
              fontSize: 9.5,
              color: colors.tertiary,
              fontStyle: "italic",
            }}
          >
            Qualitative
          </Text>
        )}
      </View>
    </View>
  );
};

const BenefitRow = ({ benefit }: { benefit: ExplorePDFOtherBenefit }) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 6,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.separator,
    }}
    wrap={false}
  >
    <Text
      style={{
        fontSize: 10,
        color: colors.primary,
        fontWeight: "bold",
        marginRight: 8,
      }}
    >
      +
    </Text>
    <View style={{ flex: 1, paddingRight: 12 }}>
      <Text
        style={{
          fontSize: 10.5,
          fontWeight: "bold",
          color: colors.primaryText,
        }}
      >
        {benefit.label}
      </Text>
    </View>
    <View style={{ width: 160, alignItems: "flex-end" }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "bold",
          color: colors.primaryText,
        }}
      >
        {fmtCurrency(benefit.amount)}{" "}
        <Text style={{ fontSize: 8.5, color: colors.tertiary, fontWeight: 400 }}>
          {benefit.type === "annual" ? "annual" : "one-time (Y1)"}
        </Text>
      </Text>
    </View>
  </View>
);

const QuadrantSection = ({ q }: { q: ExplorePDFQuadrantData }) => {
  const isEmpty = q.drivers.length === 0 && q.otherFinancialBenefits.length === 0;
  return (
    <View style={{ marginBottom: 18 }} wrap>
      <View style={{ marginBottom: 8 }}>
        <Text style={styles.sectionLabel}>{q.quadrant}</Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              color: colors.primaryText,
            }}
          >
            {fmtCurrency(q.annualTotal)} <Text style={{ fontSize: 10, color: colors.secondary, fontWeight: 400 }}>annual</Text>
          </Text>
          {q.oneTimeTotal > 0 ? (
            <Text style={{ fontSize: 9.5, color: colors.tertiary }}>
              + {fmtCurrency(q.oneTimeTotal)} one-time (Y1)
            </Text>
          ) : null}
        </View>
      </View>

      {isEmpty ? (
        <Text
          style={{
            fontSize: 9.5,
            color: colors.tertiary,
            fontStyle: "italic",
            paddingVertical: 6,
          }}
        >
          No drivers selected for this quadrant.
        </Text>
      ) : (
        <View>
          {q.drivers.map((d) => (
            <DriverRow key={d.id} driver={d} />
          ))}
          {q.otherFinancialBenefits.map((b, i) => (
            <BenefitRow key={`b-${i}`} benefit={b} />
          ))}
        </View>
      )}
    </View>
  );
};

const YearCard = ({
  label,
  headline,
  net,
  caption,
  investment,
  showInvestment,
  netInRed = true,
}: {
  label: string;
  headline: string;
  net: string;
  caption?: string;
  investment?: string;
  showInvestment?: boolean;
  netInRed?: boolean;
}) => (
  <View
    style={{
      flex: 1,
      marginHorizontal: 4,
      padding: 12,
      backgroundColor: colors.cards,
      borderRadius: 4,
    }}
    wrap={false}
  >
    <Text
      style={{
        fontSize: 8,
        color: colors.secondary,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 6,
      }}
    >
      {label}
    </Text>
    <Text
      style={{
        fontSize: 16,
        fontWeight: "bold",
        color: colors.primaryText,
        marginBottom: 2,
      }}
    >
      {headline}
    </Text>
    {caption ? (
      <Text style={{ fontSize: 8, color: colors.tertiary, marginBottom: 6 }}>
        {caption}
      </Text>
    ) : (
      <View style={{ height: 6 }} />
    )}
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: colors.separator,
        marginVertical: 4,
      }}
    />
    <Text
      style={{
        fontSize: 10.5,
        fontWeight: "bold",
        color: netInRed ? colors.primary : colors.secondary,
        marginTop: 4,
      }}
    >
      Net: {net}
    </Text>
    {showInvestment && investment ? (
      <Text
        style={{
          fontSize: 9,
          color: colors.tertiary,
          marginTop: 2,
        }}
      >
        Investment: {investment}
      </Text>
    ) : null}
  </View>
);

// ───────────────────────── Document ─────────────────────────

const TOTAL_PAGES = 6; // Cover page is unnumbered; numbered pages are 1..6

const ExplorePDFDocument = ({ data }: { data: ExplorePDFData }) => {
  const orgName = data.clientName || "Organization";
  const settingLabel = data.careSettingLabel || "";

  const subtitle = (() => {
    if (data.careSetting === "nursing" && data.nursingStaffedBeds) {
      return `${fmtNum(data.nursingStaffedBeds)} beds · ${fmtNum(
        data.numberOfProviders,
      )} nurses · Nursing`;
    }
    return `${fmtNum(data.numberOfProviders)} providers · ${fmtNum(
      data.annualEncounters,
    )} encounters · ${settingLabel}`;
  })();

  const investmentLine = (() => {
    if (data.pricingModel === "perProvider" && data.costPerProvider) {
      const units =
        data.careSetting === "nursing" && data.nursingStaffedBeds
          ? data.nursingStaffedBeds
          : data.numberOfProviders;
      const unitWord = data.careSetting === "nursing" ? "beds" : "providers";
      return `${fmtNum(units)} ${unitWord} × $${fmtNum(
        data.costPerProvider,
      )}/mo × 12 = ${fmtCurrencyExact(data.annualInvestment)}/year`;
    }
    if (data.pricingModel === "perEncounter" && data.costPerEncounter) {
      return `${fmtNum(data.annualEncounters)} encounters × $${data.costPerEncounter.toFixed(
        2,
      )} = ${fmtCurrencyExact(data.annualInvestment)}/year`;
    }
    if (data.pricingModel === "annual" && data.annualLicenseFee) {
      return `Annual license fee: ${fmtCurrencyExact(data.annualLicenseFee)}/year`;
    }
    return `${fmtCurrencyExact(data.annualInvestment)}/year`;
  })();

  const pricingModelLabel =
    data.pricingModel === "perProvider"
      ? "Per provider, per month"
      : data.pricingModel === "perEncounter"
        ? "Per encounter"
        : "Annual fixed fee";

  const netCaption =
    data.totalOneTimeValue > 0
      ? "Year 1, including one-time benefits"
      : "Year 1";

  const coverLabel = (() => {
    switch (data.careSetting) {
      case "ed":
        return "EMERGENCY DEPARTMENT VALUE ASSESSMENT";
      case "inpatient":
        return "INPATIENT VALUE ASSESSMENT";
      case "nursing":
        return "NURSING VALUE ASSESSMENT";
      case "outpatient":
      default:
        return "OUTPATIENT VALUE ASSESSMENT";
    }
  })();

  const scenarioLabel = (() => {
    const raw = (data.timePathScenario || "custom").toLowerCase();
    if (raw === "aggressive") return "optimistic";
    return raw;
  })();

  return (
    <Document>
      {/* COVER PAGE — Untouched per Sprint 2H spec */}
      <PDFCoverPage
        reportLabel={coverLabel}
        title={orgName}
        subtitle={subtitle}
        preparedBy={data.preparedBy}
      />

      {/* PAGE 1 — EXECUTIVE SUMMARY */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>EXECUTIVE SUMMARY</Text>
          <Text style={styles.sectionHeadline}>
            Projected ROI for {orgName}
          </Text>
          <Text style={styles.body}>
            This model translates Abridge documentation efficiency into
            quantified financial impact across four ROI quadrants — Capacity,
            Workforce, Revenue, and Quality. Year-over-year projections apply
            user-configured growth rates to the recurring annual value.
          </Text>

          <View
            style={[
              styles.cardBg,
              { flexDirection: "row", paddingVertical: 18, marginBottom: 16 },
            ]}
          >
            <StatBlock
              label="Net Annual Value"
              value={fmtCurrency(data.year1Net)}
              caption={netCaption}
              emphasis
            />
            <StatBlock
              label="3-Year Net Value"
              value={fmtCurrency(data.threeYearNetTotal)}
              caption="Cumulative, after investment"
            />
            <StatBlock
              label="Return on Investment"
              value={`${data.roi.toFixed(1)}×`}
              caption="Year 1 value / investment"
            />
          </View>

          <View
            style={[
              styles.cardBg,
              { flexDirection: "row", paddingVertical: 14 },
            ]}
          >
            <StatBlock
              label="Total Annual Value"
              value={fmtCurrency(data.totalAnnualValue)}
              caption="Recurring across drivers + benefits"
            />
            <StatBlock
              label="Total Investment (Y1)"
              value={fmtCurrency(data.annualInvestment)}
              caption={pricingModelLabel}
            />
            <StatBlock
              label="Value per Provider"
              value={fmtCurrency(data.valuePerProvider)}
              caption={`${fmtNum(data.totalHoursSaved)} hours returned`}
            />
          </View>

          <PageFooter
            pageNum={1}
            orgName={orgName}
            settingLabel={settingLabel}
            totalPages={TOTAL_PAGES}
          />
        </View>
      </Page>

      {/* PAGE 2 — PRACTICE & SETUP + TIME SAVINGS */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>PRACTICE & SETUP</Text>
          <Text style={styles.sectionHeadline}>{settingLabel} engagement</Text>

          <View style={[styles.cardBg, { marginBottom: 18 }]}>
            {data.careSetting === "nursing" ? (
              <>
                <Text style={{ fontSize: 10.5, marginBottom: 4 }}>
                  <Text style={{ fontWeight: "bold" }}>Staffed beds:</Text>{" "}
                  {fmtNum(data.nursingStaffedBeds || 0)}
                </Text>
                <Text style={{ fontSize: 10.5, marginBottom: 4 }}>
                  <Text style={{ fontWeight: "bold" }}>Occupancy rate:</Text>{" "}
                  {data.nursingOccupancyRate ?? 0}%
                </Text>
                <Text style={{ fontSize: 10.5, marginBottom: 4 }}>
                  <Text style={{ fontWeight: "bold" }}>Nurse FTEs:</Text>{" "}
                  {fmtNum(data.numberOfProviders)}
                </Text>
              </>
            ) : (
              <Text style={{ fontSize: 10.5, marginBottom: 4 }}>
                <Text style={{ fontWeight: "bold" }}>Providers:</Text>{" "}
                {fmtNum(data.numberOfProviders)}
              </Text>
            )}
            <Text style={{ fontSize: 10.5, marginBottom: 4 }}>
              <Text style={{ fontWeight: "bold" }}>Annual encounters:</Text>{" "}
              {fmtNum(data.annualEncounters)}
            </Text>
            <Text style={{ fontSize: 10.5 }}>
              <Text style={{ fontWeight: "bold" }}>Adoption / utilization:</Text>{" "}
              {data.utilizationPercent}%
            </Text>
          </View>

          <Text style={styles.sectionLabel}>TIME SAVINGS</Text>
          <Text style={styles.sectionHeadline}>
            {fmtNum(data.totalHoursSaved)} hours returned annually
          </Text>
          <Text style={styles.body}>
            Modeled at {data.minutesSavedPerEncounter} minutes saved per
            encounter using a {scenarioLabel} time-savings scenario.
            Recovered time fuels each of the quadrant value drivers on the
            following pages.
          </Text>

          <PageFooter
            pageNum={2}
            orgName={orgName}
            settingLabel={settingLabel}
            totalPages={TOTAL_PAGES}
          />
        </View>
      </Page>

      {/* PAGE 3+ — VALUE BY QUADRANT (may flow across pages) */}
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>VALUE BY QUADRANT</Text>
          <Text style={styles.sectionHeadline}>
            Where the {fmtCurrency(data.totalAnnualValue)} comes from
          </Text>
          <Text style={styles.body}>
            Each quadrant reflects how Abridge's documentation efficiency
            translates into operational and financial outcomes. Some drivers
            carry quantified financial models; others are qualitative outcomes
            tracked post-deployment.
          </Text>

          {data.quadrants.map((q) => (
            <QuadrantSection key={q.quadrant} q={q} />
          ))}

          <PageFooter
            pageNum={3}
            orgName={orgName}
            settingLabel={settingLabel}
            totalPages={TOTAL_PAGES}
          />
        </View>
      </Page>

      {/* PAGE — INVESTMENT */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>INVESTMENT</Text>
          <Text style={styles.sectionHeadline}>
            {fmtCurrency(data.annualInvestment)} annual investment
          </Text>
          <Text style={styles.body}>
            Pricing model: {pricingModelLabel}.
          </Text>

          <View style={[styles.cardBg, { marginBottom: 14 }]}>
            <Text style={{ fontSize: 10.5, marginBottom: 6 }}>
              {investmentLine}
            </Text>
            {data.includeImplementation && data.implementationFee > 0 ? (
              <Text style={{ fontSize: 9.5, color: colors.tertiary }}>
                A one-time implementation fee of{" "}
                {fmtCurrencyExact(data.implementationFee)} applies separately
                from recurring investment shown above.
              </Text>
            ) : null}
          </View>

          <View style={{ flexDirection: "row" }}>
            <StatBlock
              label="Total Annual Value"
              value={fmtCurrency(data.totalAnnualValue)}
            />
            <StatBlock
              label="Annual Investment"
              value={fmtCurrency(data.annualInvestment)}
            />
            <StatBlock
              label="Net Annual Value"
              value={fmtCurrency(data.netAnnualValue)}
              emphasis
            />
          </View>

          <PageFooter
            pageNum={4}
            orgName={orgName}
            settingLabel={settingLabel}
            totalPages={TOTAL_PAGES}
          />
        </View>
      </Page>

      {/* PAGE — 3-YEAR PROJECTION */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>3-YEAR PROJECTION</Text>
          <Text style={styles.sectionHeadline}>
            {fmtCurrency(data.threeYearNetTotal)} cumulative net value
          </Text>
          <Text style={styles.body}>
            Years 2 and 3 apply {data.year2GrowthPercent}% and{" "}
            {data.year3GrowthPercent}% growth to annual recurring value. For
            per-encounter pricing, encounter volume scales by the same
            percentages, so investment grows alongside value.
          </Text>

          <View style={{ flexDirection: "row", marginBottom: 14 }}>
            <YearCard
              label="Year 1"
              headline={fmtCurrency(data.year1Value)}
              net={fmtCurrency(data.year1Net)}
              caption={
                data.totalOneTimeValue > 0
                  ? `Includes ${fmtCurrency(data.totalOneTimeValue)} one-time`
                  : undefined
              }
              investment={fmtCurrency(data.year1Investment)}
              showInvestment={data.pricingModel === "perEncounter"}
            />
            <YearCard
              label="Year 2"
              headline={fmtCurrency(data.year2Value)}
              net={fmtCurrency(data.year2Net)}
              caption={`+${data.year2GrowthPercent}% growth`}
              investment={fmtCurrency(data.year2Investment)}
              showInvestment={data.pricingModel === "perEncounter"}
            />
            <YearCard
              label="Year 3"
              headline={fmtCurrency(data.year3Value)}
              net={fmtCurrency(data.year3Net)}
              caption={`+${data.year3GrowthPercent}% growth`}
              investment={fmtCurrency(data.year3Investment)}
              showInvestment={data.pricingModel === "perEncounter"}
            />
          </View>

          <View
            style={[
              styles.cardBg,
              {
                paddingVertical: 16,
                borderLeftWidth: 3,
                borderLeftColor: colors.primary,
              },
            ]}
          >
            <Text
              style={{
                fontSize: 8,
                color: colors.secondary,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 4,
              }}
            >
              3-Year Total
            </Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: colors.primaryText,
                marginBottom: 4,
              }}
            >
              {fmtCurrency(data.threeYearGrossTotal)}{" "}
              <Text style={{ fontSize: 10, color: colors.secondary, fontWeight: 400 }}>
                gross value
              </Text>
            </Text>
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: colors.separatorHeavy,
                marginVertical: 8,
              }}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "bold",
                color: colors.primary,
                marginBottom: 4,
              }}
            >
              Net: {fmtCurrency(data.threeYearNetTotal)}
            </Text>
            <Text style={{ fontSize: 10, color: colors.tertiary }}>
              Investment: {fmtCurrency(data.threeYearInvestmentTotal)}
            </Text>
          </View>

          <PageFooter
            pageNum={5}
            orgName={orgName}
            settingLabel={settingLabel}
            totalPages={TOTAL_PAGES}
          />
        </View>
      </Page>

      {/* PAGE — METHODOLOGY */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.pageWrapper}>
          <Text style={styles.sectionLabel}>METHODOLOGY</Text>
          <Text style={styles.sectionHeadline}>How these numbers were built</Text>

          <Text
            style={{
              fontSize: 10.5,
              fontWeight: "bold",
              color: colors.primaryText,
              marginBottom: 4,
              marginTop: 8,
            }}
          >
            Quadrant structure
          </Text>
          <Text style={styles.body}>
            Value is organized into four ROI quadrants: Capacity, Workforce,
            Revenue, and Quality. Each quadrant reflects how Abridge's
            documentation efficiency translates into operational and financial
            outcomes. Some drivers carry quantified financial models; others
            are qualitative outcomes tracked post-deployment.
          </Text>

          <Text
            style={{
              fontSize: 10.5,
              fontWeight: "bold",
              color: colors.primaryText,
              marginBottom: 4,
              marginTop: 8,
            }}
          >
            Time-savings scenarios
          </Text>
          <Text style={styles.body}>
            Time savings are modeled across three scenarios — Conservative,
            Typical, and Optimistic — based on the minutes saved per encounter
            you provided. The {scenarioLabel} scenario was used for
            this model.
          </Text>

          <Text
            style={{
              fontSize: 10.5,
              fontWeight: "bold",
              color: colors.primaryText,
              marginBottom: 4,
              marginTop: 8,
            }}
          >
            Year-over-year growth
          </Text>
          <Text style={styles.body}>
            Annual recurring value is projected forward using growth rates you
            configured (Year 2 default 10%, Year 3 default 10%). For
            per-encounter pricing, encounter volume scales by the same
            percentages, so investment grows alongside value. For per-provider
            and annual-fee pricing, investment is held constant across all
            three years.
          </Text>

          <Text
            style={{
              fontSize: 10.5,
              fontWeight: "bold",
              color: colors.primaryText,
              marginBottom: 4,
              marginTop: 8,
            }}
          >
            Realization & confidence
          </Text>
          <Text style={styles.body}>
            Each driver applies a realization rate that haircuts the gross
            modeled value to reflect operational adoption, billing capture,
            and partner-specific factors. Validate against historical
            performance data when available.
          </Text>

          <PageFooter
            pageNum={6}
            orgName={orgName}
            settingLabel={settingLabel}
            totalPages={TOTAL_PAGES}
          />
        </View>
      </Page>
    </Document>
  );
};

// ───────────────────────── Public API ─────────────────────────

export const generateExplorePDF = async (data: ExplorePDFData): Promise<void> => {
  const blob = await pdf(<ExplorePDFDocument data={data} />).toBlob();
  const safeOrg = (data.clientName || "abridge").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const safeDate = new Date().toISOString().slice(0, 10);
  await savePdfBlob(blob, `abridge-roi-${safeOrg}-${safeDate}.pdf`);
};
