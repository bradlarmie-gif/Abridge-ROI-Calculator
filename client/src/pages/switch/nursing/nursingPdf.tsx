import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";
import type { NursingPriority, NursingBaselineInputs } from "./nursingTypes";
import { PRIORITY_CONFIGS } from "./nursingTypes";
import {
  derivePatientDays,
  deriveShiftsPerYear,
  buildConnection,
  classifyPathways,
  generatePrimaryPathwaySummary,
  getRecommendedFocus,
} from "./nursingCalculations";

Font.register({
  family: "Manrope",
  fonts: [
    { src: "https://fonts.gstatic.com/s/manrope/v15/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk59FO_F87jxeN7B.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/manrope/v15/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk7jFO_F87jxeN7B.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/manrope/v15/xn7_YHE41ni1AdIRqAuZuw1Bx9mbZk7LFO_F87jxeN7B.ttf", fontWeight: 700 },
  ],
});

const c = {
  red: "#EA2C00",
  black: "#1A1A1A",
  dark: "#333333",
  mid: "#666666",
  light: "#999999",
  border: "#E5E7EB",
  bg: "#F5F0EB",
  white: "#FFFFFF",
};

const s = StyleSheet.create({
  page: { padding: 50, fontFamily: "Manrope", fontSize: 10, color: c.dark },
  coverPage: { padding: 50, fontFamily: "Manrope", backgroundColor: c.black, justifyContent: "center" },
  sectionLabel: { fontSize: 8, fontWeight: 700, color: c.red, letterSpacing: 2, textTransform: "uppercase" as const, marginBottom: 6 },
  heading: { fontSize: 20, fontWeight: 700, color: c.black, marginBottom: 8 },
  subheading: { fontSize: 14, fontWeight: 700, color: c.black, marginBottom: 6 },
  body: { fontSize: 9, color: c.dark, lineHeight: 1.6, marginBottom: 6 },
  small: { fontSize: 8, color: c.light, lineHeight: 1.5 },
  divider: { height: 1, backgroundColor: c.border, marginVertical: 10 },
  card: { backgroundColor: c.bg, borderRadius: 8, padding: 14, marginBottom: 10 },
  row: { flexDirection: "row" as const, justifyContent: "space-between" as const, marginBottom: 4 },
  rowLabel: { fontSize: 9, color: c.mid },
  rowValue: { fontSize: 9, fontWeight: 600, color: c.black },
  prioritySelected: { fontSize: 9, color: c.black, marginBottom: 3 },
  priorityUnselected: { fontSize: 9, color: c.light, marginBottom: 3 },
  connectionCard: { borderLeftWidth: 3, borderLeftColor: c.red, paddingLeft: 10, marginBottom: 12 },
  pathwayPrimary: { backgroundColor: c.bg, borderRadius: 6, padding: 10, marginBottom: 8 },
  pathwaySupporting: { backgroundColor: "#F9F9F9", borderRadius: 6, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: c.border },
  footer: { position: "absolute" as const, bottom: 30, left: 50, right: 50, flexDirection: "row" as const, justifyContent: "space-between" as const },
  footerText: { fontSize: 7, color: c.light },
});

function CoverPage({ orgName, facilitator }: { orgName: string; facilitator: string }) {
  return (
    <Page size="LETTER" style={s.coverPage}>
      <Text style={{ fontSize: 8, fontWeight: 700, color: c.red, letterSpacing: 3, marginBottom: 20 }}>
        ABRIDGE
      </Text>
      <Text style={{ fontSize: 28, fontWeight: 700, color: c.white, marginBottom: 8 }}>
        Ambient Assessment
      </Text>
      <Text style={{ fontSize: 16, fontWeight: 400, color: "rgba(255,255,255,0.6)", marginBottom: 30 }}>
        Nursing Edition
      </Text>
      <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginBottom: 20 }} />
      <Text style={{ fontSize: 12, fontWeight: 600, color: c.white, marginBottom: 4 }}>
        {orgName}
      </Text>
      {facilitator && (
        <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>
          Prepared by {facilitator}
        </Text>
      )}
      <Text style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>
        {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </Text>
    </Page>
  );
}

function BaselinePrioritiesPage({
  baseline,
  selectedPriorities,
}: {
  baseline: NursingBaselineInputs;
  selectedPriorities: NursingPriority[];
}) {
  const patientDays = derivePatientDays(baseline);
  const shifts = deriveShiftsPerYear(baseline);

  return (
    <Page size="LETTER" style={s.page}>
      <Text style={s.sectionLabel}>Program Profile & Priorities</Text>
      <Text style={s.heading}>Your Nursing Program</Text>

      <View style={s.card}>
        <View style={s.row}>
          <Text style={s.rowLabel}>Staffed beds</Text>
          <Text style={s.rowValue}>{baseline.staffedBeds.toLocaleString()}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.rowLabel}>Nurse FTEs</Text>
          <Text style={s.rowValue}>{baseline.nurseFTEs.toLocaleString()}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.rowLabel}>Bed occupancy</Text>
          <Text style={s.rowValue}>{baseline.bedOccupancy}%</Text>
        </View>
        <View style={s.divider} />
        <View style={s.row}>
          <Text style={s.rowLabel}>Patient days / year</Text>
          <Text style={s.rowValue}>{patientDays.toLocaleString()}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.rowLabel}>Shifts / year</Text>
          <Text style={s.rowValue}>{shifts.toLocaleString()}</Text>
        </View>
      </View>

      <View style={{ marginTop: 14 }}>
        <Text style={s.sectionLabel}>Your Priorities</Text>
        {PRIORITY_CONFIGS.map(config => {
          const isSelected = selectedPriorities.includes(config.id);
          return (
            <Text key={config.id} style={isSelected ? s.prioritySelected : s.priorityUnselected}>
              {isSelected ? "[x]" : "[ ]"} {config.title}
            </Text>
          );
        })}
      </View>

      <View style={s.footer}>
        <Text style={s.footerText}>Abridge Nursing Assessment</Text>
        <Text style={s.footerText}>Page 2</Text>
      </View>
    </Page>
  );
}

function ConnectionsPage({
  baseline,
  selectedPriorities,
}: {
  baseline: NursingBaselineInputs;
  selectedPriorities: NursingPriority[];
}) {
  const connections = selectedPriorities.map(p => buildConnection(p, baseline));

  return (
    <Page size="LETTER" style={s.page}>
      <Text style={s.sectionLabel}>Where Ambient Fits</Text>
      <Text style={s.heading}>Priority Connections</Text>

      {connections.map(conn => {
        const config = PRIORITY_CONFIGS.find(c => c.id === conn.priority)!;
        return (
          <View key={conn.priority} style={s.connectionCard}>
            <Text style={{ fontSize: 10, fontWeight: 700, color: c.black, marginBottom: 4 }}>
              {config.title}
            </Text>
            <Text style={s.body}>{conn.howItConnects}</Text>
            {conn.whatResearchSays && (
              <Text style={s.small}>{conn.whatResearchSays}</Text>
            )}
            <Text style={{ ...s.small, marginTop: 4 }}>
              Connection: {conn.bars.map(b => `${b.label ? b.label + ': ' : ''}${b.filled}/${b.total}`).join(' | ')}
            </Text>
          </View>
        );
      })}

      <View style={s.footer}>
        <Text style={s.footerText}>Abridge Nursing Assessment</Text>
        <Text style={s.footerText}>Page 3</Text>
      </View>
    </Page>
  );
}

function AlignmentPage({
  baseline,
  selectedPriorities,
}: {
  baseline: NursingBaselineInputs;
  selectedPriorities: NursingPriority[];
}) {
  const pathways = classifyPathways(selectedPriorities, baseline);
  const primaryLabel = generatePrimaryPathwaySummary(selectedPriorities);
  const recommendedFocus = getRecommendedFocus(selectedPriorities);

  const primary = pathways.filter(p => p.role === "primary");
  const supporting = pathways.filter(p => p.role === "supporting");

  return (
    <Page size="LETTER" style={s.page}>
      <Text style={s.sectionLabel}>Your Investment Case</Text>
      <Text style={s.heading}>Strategic Alignment</Text>

      <View style={s.pathwayPrimary}>
        <Text style={{ fontSize: 8, fontWeight: 700, color: c.red, letterSpacing: 1.5, marginBottom: 4 }}>
          PRIMARY PATHWAY
        </Text>
        <Text style={{ fontSize: 13, fontWeight: 700, color: c.black, marginBottom: 6 }}>
          {primaryLabel}
        </Text>
        {primary.map(p => {
          const config = PRIORITY_CONFIGS.find(cfg => cfg.id === p.priority)!;
          return (
            <View key={p.priority} style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 9, fontWeight: 600, color: c.black }}>→ {config.title}</Text>
              <Text style={s.body}>{p.narrative}</Text>
            </View>
          );
        })}
      </View>

      {supporting.length > 0 && (
        <View style={s.pathwaySupporting}>
          <Text style={{ fontSize: 8, fontWeight: 700, color: c.mid, letterSpacing: 1.5, marginBottom: 4 }}>
            SUPPORTING ARGUMENTS
          </Text>
          {supporting.map(p => {
            const config = PRIORITY_CONFIGS.find(cfg => cfg.id === p.priority)!;
            return (
              <View key={p.priority} style={{ marginBottom: 4 }}>
                <Text style={{ fontSize: 9, fontWeight: 600, color: c.dark }}>— {config.title}</Text>
                <Text style={s.body}>{p.narrative}</Text>
              </View>
            );
          })}
        </View>
      )}

      {recommendedFocus.length > 0 && (
        <View style={{ marginTop: 14 }}>
          <Text style={s.sectionLabel}>Recommended ROI Focus</Text>
          {recommendedFocus.map((f, i) => (
            <Text key={i} style={{ fontSize: 9, color: c.black, marginBottom: 2 }}>
              {f.startsWith("Supporting") ? f : `→ ${f}`}
            </Text>
          ))}
        </View>
      )}

      <View style={s.footer}>
        <Text style={s.footerText}>Abridge Nursing Assessment</Text>
        <Text style={s.footerText}>Page 4</Text>
      </View>
    </Page>
  );
}

export async function generateNursingPdf(
  baseline: NursingBaselineInputs,
  selectedPriorities: NursingPriority[],
  orgName: string,
  facilitator: string,
) {
  const doc = (
    <Document>
      <CoverPage orgName={orgName} facilitator={facilitator} />
      <BaselinePrioritiesPage baseline={baseline} selectedPriorities={selectedPriorities} />
      <ConnectionsPage baseline={baseline} selectedPriorities={selectedPriorities} />
      <AlignmentPage baseline={baseline} selectedPriorities={selectedPriorities} />
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nursing-assessment-${orgName.toLowerCase().replace(/\s+/g, "-")}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
