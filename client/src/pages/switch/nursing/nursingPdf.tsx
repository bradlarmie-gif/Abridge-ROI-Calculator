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
import manropeRegular from "../../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../../assets/fonts/manrope-bold.ttf";
import type { NursingInputs } from "./nursingTypes";
import { BURDEN_INDICATORS } from "./nursingTypes";
import {
  totalDocMinPerShift,
  derivePatientDays,
  deriveShiftsPerYear,
  computeAllPathways,
  generateSummaryNarrative,
  computeOvertimeNarrative,
  computeRetentionNarrative,
  computeAgencyNarrative,
  computeBedsideNarrative,
  PATHWAY_LABELS,
} from "./nursingCalculations";

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
  text: "#1A1A1A",
  secondary: "#666666",
  tertiary: "#999999",
  border: "#E0E0E0",
  dark: "#1A1A1A",
  white: "#FFFFFF",
};

const s = StyleSheet.create({
  page: {
    padding: 54,
    paddingBottom: 50,
    fontFamily: "Manrope",
    backgroundColor: colors.background,
  },
  pageNum: {
    position: "absolute",
    bottom: 24,
    right: 54,
    fontSize: 8,
    color: colors.tertiary,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: colors.primary,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  heading: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 6,
  },
  body: {
    fontSize: 10,
    color: colors.secondary,
    lineHeight: 1.6,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.cards,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  darkCard: {
    backgroundColor: colors.dark,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  label: {
    fontSize: 9,
    color: colors.tertiary,
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.text,
  },
  badge: {
    fontSize: 8,
    fontWeight: 700,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  disclaimer: {
    position: "absolute",
    bottom: 36,
    left: 54,
    right: 54,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  disclaimerText: {
    fontSize: 7.5,
    color: colors.tertiary,
    lineHeight: 1.5,
  },
});

function BurdenProfilePage({ inputs }: { inputs: NursingInputs }) {
  const docMin = totalDocMinPerShift(inputs);
  const patientDays = derivePatientDays(inputs);
  const shifts = deriveShiftsPerYear(inputs);
  const selectedIndicators = BURDEN_INDICATORS.filter(b => inputs.burdenIndicators.includes(b.id));

  return (
    <Page size="LETTER" style={s.page}>
      <Text style={s.sectionLabel}>Burden Profile</Text>
      <Text style={s.heading}>Documentation Burden Assessment</Text>
      <View style={s.divider} />

      <View style={s.card}>
        <Text style={{ ...s.label, marginBottom: 6 }}>Program Profile</Text>
        <View style={{ flexDirection: "row", gap: 20, marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Staffed beds</Text>
            <Text style={s.value}>{inputs.staffedBeds || "—"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Nurse FTEs</Text>
            <Text style={s.value}>{inputs.nurseFTEs || "—"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Occupancy</Text>
            <Text style={s.value}>{inputs.bedOccupancy}%</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Patient days/year</Text>
            <Text style={{ ...s.value, fontSize: 13 }}>{patientDays > 0 ? patientDays.toLocaleString() : "—"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Shifts/year</Text>
            <Text style={{ ...s.value, fontSize: 13 }}>{shifts > 0 ? shifts.toLocaleString() : "—"}</Text>
          </View>
        </View>
      </View>

      <View style={s.card}>
        <Text style={{ ...s.label, marginBottom: 6 }}>Documentation Time Per Shift</Text>
        <View style={{ flexDirection: "row", gap: 20, marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Flowsheets</Text>
            <Text style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{inputs.docTimeFlowsheets || "—"} min</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Care plans</Text>
            <Text style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{inputs.docTimeCare || "—"} min</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Handoff</Text>
            <Text style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{inputs.docTimeHandoff || "—"} min</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Other</Text>
            <Text style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{inputs.docTimeOther || "—"} min</Text>
          </View>
        </View>
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 6, padding: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 10, fontWeight: 700, color: colors.text }}>Total per shift</Text>
          <Text style={{ fontSize: 14, fontWeight: 700, color: colors.primary }}>{docMin > 0 ? `${docMin} min` : "—"}</Text>
        </View>
      </View>

      {selectedIndicators.length > 0 && (
        <View style={s.card}>
          <Text style={{ ...s.label, marginBottom: 6 }}>Burden Indicators ({selectedIndicators.length} of 10)</Text>
          {selectedIndicators.map((ind, i) => (
            <View key={ind.id} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 4 }}>
              <Text style={{ fontSize: 9, color: colors.primary, marginRight: 6 }}>•</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, flex: 1, lineHeight: 1.4 }}>{ind.label}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={s.pageNum}>2</Text>
    </Page>
  );
}

function ValuePathwaysPage({ inputs }: { inputs: NursingInputs }) {
  const pathways = computeAllPathways(inputs);

  const getNarrative = (key: string): string => {
    switch (key) {
      case "overtime": return computeOvertimeNarrative(inputs);
      case "retention": return computeRetentionNarrative(inputs);
      case "agency": return computeAgencyNarrative(inputs);
      case "bedside": return computeBedsideNarrative(inputs);
      case "quality": return "Documentation quality concerns affect care transitions, compliance, and reimbursement. A deeper analysis would identify which quality dimensions create the most risk.";
      default: return "";
    }
  };

  const relBadge = (rel: string) => {
    const bg = rel === "high" ? "#FDE8E4" : rel === "moderate" ? "#FEF3C7" : "#F3F4F6";
    const color = rel === "high" ? colors.primary : rel === "moderate" ? "#92400E" : "#6B7280";
    return { backgroundColor: bg, color };
  };

  return (
    <Page size="LETTER" style={s.page}>
      <Text style={s.sectionLabel}>Value Pathways</Text>
      <Text style={s.heading}>Where Burden Creates Opportunity</Text>
      <View style={s.divider} />

      {pathways.map((p) => {
        const badge = relBadge(p.relevance);
        return (
          <View key={p.key} style={{ ...s.card, marginBottom: 8, padding: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: 700, color: colors.text }}>{p.label}</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <Text style={{ ...s.badge, backgroundColor: badge.backgroundColor, color: badge.color }}>
                  {p.relevance.charAt(0).toUpperCase() + p.relevance.slice(1)}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 8.5, color: colors.secondary, lineHeight: 1.5 }}>
              {getNarrative(p.key)}
            </Text>
          </View>
        );
      })}

      <Text style={s.pageNum}>3</Text>
    </Page>
  );
}

function SummaryPage({ inputs }: { inputs: NursingInputs }) {
  const pathways = computeAllPathways(inputs);
  const narrative = generateSummaryNarrative(pathways, inputs);

  const relColor = (rel: string) => {
    if (rel === "high") return colors.primary;
    if (rel === "moderate") return "#D97706";
    return "#9CA3AF";
  };

  const dataLabel = (d: string) => {
    return d === "no" ? "No" : d.charAt(0).toUpperCase() + d.slice(1);
  };

  return (
    <Page size="LETTER" style={s.page}>
      <Text style={s.sectionLabel}>Summary & Next Steps</Text>
      <Text style={s.heading}>Your Value Pathway Profile</Text>
      <View style={s.divider} />

      <View style={s.card}>
        <View style={s.row}>
          <Text style={{ fontSize: 9, fontWeight: 700, color: colors.tertiary, flex: 2 }}>PATHWAY</Text>
          <Text style={{ fontSize: 9, fontWeight: 700, color: colors.tertiary, flex: 1, textAlign: "center" }}>RELEVANCE</Text>
          <Text style={{ fontSize: 9, fontWeight: 700, color: colors.tertiary, flex: 1, textAlign: "center" }}>DATA</Text>
        </View>
        {pathways.map((p) => (
          <View key={p.key} style={s.row}>
            <Text style={{ fontSize: 10, color: colors.text, flex: 2 }}>{p.label}</Text>
            <Text style={{ fontSize: 9, fontWeight: 700, color: relColor(p.relevance), flex: 1, textAlign: "center" }}>
              {p.relevance.charAt(0).toUpperCase() + p.relevance.slice(1)}
            </Text>
            <Text style={{ fontSize: 9, color: colors.secondary, flex: 1, textAlign: "center" }}>
              {dataLabel(p.dataAvailable)}
            </Text>
          </View>
        ))}
      </View>

      <View style={s.darkCard}>
        <Text style={{ fontSize: 8, fontWeight: 700, color: colors.primary, letterSpacing: 2, marginBottom: 8 }}>YOUR ASSESSMENT</Text>
        <Text style={{ fontSize: 10, color: "#CCCCCC", lineHeight: 1.6 }}>{narrative}</Text>
      </View>

      <View style={{ ...s.card, marginTop: 12 }}>
        <Text style={s.subheading}>Next Steps</Text>
        <Text style={s.body}>
          This assessment identifies where documentation burden creates the most cost and risk in your nursing program. 
          The next step is a deeper working session where we model your highest-relevance pathways with real numbers — 
          specific to your organization. It's strategic planning, not a product demonstration.
        </Text>
        <Text style={{ fontSize: 10, fontWeight: 700, color: colors.primary }}>
          Contact: partnerships@abridge.com
        </Text>
      </View>

      <View style={s.disclaimer}>
        <Text style={s.disclaimerText}>
          This is an organizational self-assessment designed to identify where documentation burden may be creating cost or risk.
          All estimates are based on your inputs and industry benchmarks. Individual results will vary. This assessment does not
          constitute financial advice or a guarantee of outcomes.
        </Text>
      </View>

      <Text style={s.pageNum}>4</Text>
    </Page>
  );
}

function NursingPdfDocument({ inputs, orgName, facilitator }: {
  inputs: NursingInputs;
  orgName: string;
  facilitator: string;
}) {
  return (
    <Document>
      <PDFCoverPage
        reportLabel="AMBIENT ASSESSMENT"
        title="Nursing Edition"
        subtitle="Pre-ROI Value Pathway Discovery"
        clientName={orgName}
        preparedBy={facilitator || "Abridge Partner Success"}
        disclaimerText="This assessment is for strategic planning purposes. All calculations are based on organizational self-reported data and industry benchmarks."
      />
      <BurdenProfilePage inputs={inputs} />
      <ValuePathwaysPage inputs={inputs} />
      <SummaryPage inputs={inputs} />
    </Document>
  );
}

export async function generateNursingPdf(
  inputs: NursingInputs,
  orgName: string,
  facilitator: string,
): Promise<void> {
  const doc = <NursingPdfDocument inputs={inputs} orgName={orgName} facilitator={facilitator} />;
  const blob = await pdf(doc).toBlob();
  const filename = `Nursing-Assessment-${orgName.replace(/[^a-zA-Z0-9]/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
  await savePdfBlob(blob, filename, "Ambient Assessment: Nursing Edition");
}
