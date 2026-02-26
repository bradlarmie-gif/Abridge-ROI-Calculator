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
import type { NursingDomain, NursingDomainState, NursingBaselineInputs } from "./nursingTypes";
import { NURSING_DOMAIN_ORDER, NURSING_DOMAIN_LABELS, LEVEL_LABELS, SCORE_MAP } from "./nursingTypes";
import {
  derivePatientDays,
  deriveShiftsPerYear,
  computeTotalScore,
  getScoreLabel,
  generateScoreNarrative,
  computePriorityPathways,
  computeDomainFeedback,
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

function BaselineAndScorePage({ baseline, domainStates }: {
  baseline: NursingBaselineInputs;
  domainStates: Record<NursingDomain, NursingDomainState>;
}) {
  const patientDays = derivePatientDays(baseline);
  const shifts = deriveShiftsPerYear(baseline);
  const totalScore = computeTotalScore(domainStates);
  const scoreLabel = getScoreLabel(totalScore, domainStates);

  return (
    <Page size="LETTER" style={s.page}>
      <Text style={s.sectionLabel}>Program Profile & Score</Text>
      <Text style={s.heading}>Nursing Documentation Readiness</Text>
      <View style={s.divider} />

      <View style={s.card}>
        <Text style={{ ...s.label, marginBottom: 6 }}>Program Profile</Text>
        <View style={{ flexDirection: "row", gap: 20, marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Staffed beds</Text>
            <Text style={s.value}>{baseline.staffedBeds || "—"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Nurse FTEs</Text>
            <Text style={s.value}>{baseline.nurseFTEs || "—"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Occupancy</Text>
            <Text style={s.value}>{baseline.bedOccupancy}%</Text>
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
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
          <View>
            <Text style={s.label}>Your Score</Text>
            <Text style={{ fontSize: 36, fontWeight: 700, color: colors.text }}>{totalScore}<Text style={{ fontSize: 18, color: colors.tertiary }}> / 100</Text></Text>
          </View>
          <Text style={{ fontSize: 10, fontWeight: 700, color: colors.primary, textTransform: "uppercase", letterSpacing: 1 }}>
            {scoreLabel}
          </Text>
        </View>
      </View>

      <View style={s.card}>
        <Text style={{ ...s.label, marginBottom: 8 }}>Domain Breakdown</Text>
        <View style={s.row}>
          <Text style={{ fontSize: 9, fontWeight: 700, color: colors.tertiary, flex: 2 }}>DOMAIN</Text>
          <Text style={{ fontSize: 9, fontWeight: 700, color: colors.tertiary, flex: 2, textAlign: "center" }}>LEVEL</Text>
          <Text style={{ fontSize: 9, fontWeight: 700, color: colors.tertiary, flex: 1, textAlign: "right" }}>SCORE</Text>
        </View>
        {NURSING_DOMAIN_ORDER.map((d) => {
          const level = domainStates[d].level;
          const score = level ? SCORE_MAP[level] : 0;
          return (
            <View key={d} style={s.row}>
              <Text style={{ fontSize: 10, color: colors.text, flex: 2 }}>{NURSING_DOMAIN_LABELS[d]}</Text>
              <Text style={{ fontSize: 9, color: colors.secondary, flex: 2, textAlign: "center" }}>
                {level ? `Level ${level} — ${LEVEL_LABELS[d][level]}` : '—'}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: 700, color: colors.text, flex: 1, textAlign: "right" }}>
                {score}/25
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={s.pageNum}>2</Text>
    </Page>
  );
}

function PriorityPathwaysPage({ baseline, domainStates }: {
  baseline: NursingBaselineInputs;
  domainStates: Record<NursingDomain, NursingDomainState>;
}) {
  const priorities = computePriorityPathways(domainStates, baseline);
  const narrative = generateScoreNarrative(domainStates, baseline);

  return (
    <Page size="LETTER" style={s.page}>
      <Text style={s.sectionLabel}>Priority Pathways</Text>
      <Text style={s.heading}>Where Documentation Burden Reduction Matters Most</Text>
      <View style={s.divider} />

      {priorities.map((p, i) => {
        const feedback = computeDomainFeedback(p.domain, p.level, domainStates[p.domain].inputs, baseline);
        return (
          <View key={p.domain} style={{ ...s.card, marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontSize: 10, fontWeight: 700, color: colors.white }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: 700, color: colors.text, marginBottom: 2 }}>
                  {NURSING_DOMAIN_LABELS[p.domain]}
                </Text>
                <Text style={{ fontSize: 8, color: colors.tertiary, marginBottom: 6 }}>
                  Level {p.level} — {p.levelLabel}
                </Text>
                <Text style={{ fontSize: 9, color: colors.secondary, lineHeight: 1.5 }}>
                  {feedback.context.split('\n').filter(Boolean).slice(0, 2).join(' ')}
                </Text>
              </View>
            </View>
          </View>
        );
      })}

      <View style={s.darkCard}>
        <Text style={{ fontSize: 8, fontWeight: 700, color: colors.primary, letterSpacing: 2, marginBottom: 8 }}>YOUR ASSESSMENT</Text>
        <Text style={{ fontSize: 10, color: "#CCCCCC", lineHeight: 1.6 }}>{narrative}</Text>
      </View>

      <View style={{ ...s.card, marginTop: 12 }}>
        <Text style={s.subheading}>Next Steps</Text>
        <Text style={s.body}>
          This assessment identifies where documentation burden creates the most pressure in your nursing program.
          The next step is a deeper working session where we model your priority pathways with specific time savings
          scenarios and your organization's data.
        </Text>
        <Text style={{ fontSize: 10, fontWeight: 700, color: colors.primary }}>
          Contact: partnerships@abridge.com
        </Text>
      </View>

      <View style={s.disclaimer}>
        <Text style={s.disclaimerText}>
          This is an organizational self-assessment designed to identify where documentation burden may be creating pressure.
          All estimates are based on your inputs and industry benchmarks. Individual results will vary. This assessment does not
          constitute financial advice or a guarantee of outcomes.
        </Text>
      </View>

      <Text style={s.pageNum}>3</Text>
    </Page>
  );
}

function NursingPdfDocument({ baseline, domainStates, orgName, facilitator }: {
  baseline: NursingBaselineInputs;
  domainStates: Record<NursingDomain, NursingDomainState>;
  orgName: string;
  facilitator: string;
}) {
  return (
    <Document>
      <PDFCoverPage
        reportLabel="AMBIENT ASSESSMENT"
        title="Nursing Edition"
        subtitle="Documentation Readiness Assessment"
        clientName={orgName}
        preparedBy={facilitator || "Abridge Partner Success"}
        disclaimerText="This assessment is for strategic planning purposes. All calculations are based on organizational self-reported data and industry benchmarks."
      />
      <BaselineAndScorePage baseline={baseline} domainStates={domainStates} />
      <PriorityPathwaysPage baseline={baseline} domainStates={domainStates} />
    </Document>
  );
}

export async function generateNursingPdf(
  baseline: NursingBaselineInputs,
  domainStates: Record<NursingDomain, NursingDomainState>,
  orgName: string,
  facilitator: string,
): Promise<void> {
  const doc = <NursingPdfDocument baseline={baseline} domainStates={domainStates} orgName={orgName} facilitator={facilitator} />;
  const blob = await pdf(doc).toBlob();
  const filename = `Nursing-Assessment-${orgName.replace(/[^a-zA-Z0-9]/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
  await savePdfBlob(blob, filename, "Ambient Assessment: Nursing Edition");
}
