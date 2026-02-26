import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";
import type { NursingPriority, NursingBaselineInputs, AllPriorityInputs } from "./nursingTypes";
import { PRIORITY_CONFIGS } from "./nursingTypes";
import {
  derivePatientDays,
  deriveShiftsPerYear,
  buildPrioritySummary,
  generateFocusNarrative,
  computeRetentionImpact,
  computeStaffingImpact,
  getOTNarrative,
  fmtDollar,
  RESEARCH_NOTE,
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
  subheading: { fontSize: 12, fontWeight: 700, color: c.black, marginBottom: 6 },
  body: { fontSize: 9, color: c.dark, lineHeight: 1.6, marginBottom: 6 },
  small: { fontSize: 8, color: c.light, lineHeight: 1.5 },
  divider: { height: 1, backgroundColor: c.border, marginVertical: 10 },
  card: { backgroundColor: c.bg, borderRadius: 8, padding: 14, marginBottom: 10 },
  row: { flexDirection: "row" as const, justifyContent: "space-between" as const, marginBottom: 4 },
  rowLabel: { fontSize: 9, color: c.mid },
  rowValue: { fontSize: 9, fontWeight: 600, color: c.black },
  prioritySelected: { fontSize: 9, color: c.black, marginBottom: 3 },
  priorityUnselected: { fontSize: 9, color: c.light, marginBottom: 3 },
  summaryCard: { borderLeftWidth: 3, borderLeftColor: c.red, paddingLeft: 10, marginBottom: 12 },
  footer: { position: "absolute" as const, bottom: 30, left: 50, right: 50, flexDirection: "row" as const, justifyContent: "space-between" as const },
  footerText: { fontSize: 7, color: c.light },
  disclaimer: { fontSize: 7, color: c.light, fontStyle: "italic" as const, marginTop: 10 },
});

const DISCLAIMER = "This assessment is for strategic planning purposes. All estimates are based on organizational self-assessment and your inputs. Individual results vary.";

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
      <View style={s.footer}>
        <Text style={{ fontSize: 7, color: "rgba(255,255,255,0.2)" }}>{DISCLAIMER}</Text>
      </View>
    </Page>
  );
}

function PrioritiesPage({
  baseline,
  selectedPriorities,
  inputs,
}: {
  baseline: NursingBaselineInputs;
  selectedPriorities: NursingPriority[];
  inputs: AllPriorityInputs;
}) {
  const patientDays = derivePatientDays(baseline);
  const shifts = deriveShiftsPerYear(baseline);
  const retentionImpact = computeRetentionImpact(inputs.retention, baseline);
  const staffingImpact = computeStaffingImpact(inputs.staffingCosts, baseline);

  return (
    <Page size="LETTER" style={s.page}>
      <Text style={s.sectionLabel}>Your Priorities</Text>
      <Text style={s.heading}>Program Profile & Key Data</Text>

      <View style={s.card}>
        <Text style={{ fontSize: 8, fontWeight: 700, color: c.mid, letterSpacing: 1.5, marginBottom: 8 }}>DEPLOYMENT</Text>
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

      <View style={{ marginTop: 10 }}>
        <Text style={{ fontSize: 8, fontWeight: 700, color: c.mid, letterSpacing: 1.5, marginBottom: 8 }}>PRIORITIES SELECTED</Text>
        {PRIORITY_CONFIGS.map(config => {
          const isSelected = selectedPriorities.includes(config.id);
          return (
            <Text key={config.id} style={isSelected ? s.prioritySelected : s.priorityUnselected}>
              {isSelected ? "[x]" : "[ ]"} {config.title}
            </Text>
          );
        })}
      </View>

      <View style={{ marginTop: 10 }}>
        <Text style={{ fontSize: 8, fontWeight: 700, color: c.mid, letterSpacing: 1.5, marginBottom: 8 }}>KEY DATA POINTS</Text>
        {inputs.retention.turnoverRate > 0 && (
          <View style={s.row}>
            <Text style={s.rowLabel}>Turnover rate</Text>
            <Text style={s.rowValue}>{inputs.retention.turnoverRate}%</Text>
          </View>
        )}
        {retentionImpact.totalCost > 0 && (
          <View style={s.row}>
            <Text style={s.rowLabel}>Annual turnover cost</Text>
            <Text style={s.rowValue}>{fmtDollar(retentionImpact.totalCost)}</Text>
          </View>
        )}
        {inputs.staffingCosts.otMinPerShift > 0 && (
          <View style={s.row}>
            <Text style={s.rowLabel}>Documentation OT</Text>
            <Text style={s.rowValue}>{inputs.staffingCosts.otMinPerShift} min/shift</Text>
          </View>
        )}
        {inputs.staffingCosts.otFrequency && (
          <View style={s.row}>
            <Text style={s.rowLabel}>OT frequency</Text>
            <Text style={s.rowValue}>{inputs.staffingCosts.otFrequency === 'occasionally' ? 'Occasional' : inputs.staffingCosts.otFrequency === 'frequently' ? 'Frequent' : 'Almost always'}</Text>
          </View>
        )}
        {staffingImpact.annualAgency > 0 && (
          <View style={s.row}>
            <Text style={s.rowLabel}>Annual agency spend</Text>
            <Text style={s.rowValue}>{fmtDollar(staffingImpact.annualAgency)}</Text>
          </View>
        )}
        {inputs.bedsidePresence.docHoursPerShift > 0 && (
          <View style={s.row}>
            <Text style={s.rowLabel}>Doc hours/shift</Text>
            <Text style={s.rowValue}>{inputs.bedsidePresence.docHoursPerShift} hrs</Text>
          </View>
        )}
      </View>

      <Text style={s.disclaimer}>{DISCLAIMER}</Text>
      <View style={s.footer}>
        <Text style={s.footerText}>Abridge Nursing Assessment</Text>
        <Text style={s.footerText}>Page 2</Text>
      </View>
    </Page>
  );
}

function StrategicPicturePage({
  baseline,
  selectedPriorities,
  inputs,
}: {
  baseline: NursingBaselineInputs;
  selectedPriorities: NursingPriority[];
  inputs: AllPriorityInputs;
}) {
  const summaries = selectedPriorities.map(p => buildPrioritySummary(p, inputs, baseline));
  const unselected = PRIORITY_CONFIGS.filter(cfg => !selectedPriorities.includes(cfg.id));

  return (
    <Page size="LETTER" style={s.page}>
      <Text style={s.sectionLabel}>Strategic Picture</Text>
      <Text style={s.heading}>Your Priorities & Documentation Burden</Text>

      {summaries.map(summary => {
        const config = PRIORITY_CONFIGS.find(cfg => cfg.id === summary.priority)!;
        return (
          <View key={summary.priority} style={s.summaryCard}>
            <Text style={{ fontSize: 10, fontWeight: 700, color: c.black, marginBottom: 4 }}>
              {config.title}
            </Text>
            <Text style={s.body}>{summary.situation}</Text>
            <Text style={{ ...s.body, fontStyle: "italic" as const, color: c.mid }}>{summary.connection}</Text>
          </View>
        );
      })}

      {unselected.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 8, color: c.light, marginBottom: 4 }}>
            Not selected: {unselected.map(u => u.title).join(', ')}
          </Text>
        </View>
      )}

      <Text style={s.disclaimer}>{DISCLAIMER}</Text>
      <View style={s.footer}>
        <Text style={s.footerText}>Abridge Nursing Assessment</Text>
        <Text style={s.footerText}>Page 3</Text>
      </View>
    </Page>
  );
}

function FocusPage({
  baseline,
  selectedPriorities,
  inputs,
}: {
  baseline: NursingBaselineInputs;
  selectedPriorities: NursingPriority[];
  inputs: AllPriorityInputs;
}) {
  const focus = generateFocusNarrative(selectedPriorities, inputs, baseline);

  return (
    <Page size="LETTER" style={s.page}>
      <Text style={s.sectionLabel}>Recommended Focus + Next Steps</Text>
      <Text style={s.heading}>How to Frame the Investment Case</Text>

      <View style={s.card}>
        <Text style={{ fontSize: 8, fontWeight: 700, color: c.mid, letterSpacing: 1.5, marginBottom: 6 }}>YOUR SITUATION</Text>
        <Text style={s.body}>{focus.situation}</Text>
      </View>

      {focus.framingOptions.length > 0 && (
        <View style={{ marginTop: 6 }}>
          <Text style={{ fontSize: 8, fontWeight: 700, color: c.mid, letterSpacing: 1.5, marginBottom: 6 }}>WAYS TO FRAME THE CONVERSATION</Text>
          {focus.framingOptions.map((option, i) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 9, fontWeight: 700, color: c.black, marginBottom: 2 }}>{option.title}</Text>
              <Text style={s.body}>{option.body}</Text>
              <Text style={{ fontSize: 7, color: c.light }}>Best audience: {option.audience}</Text>
            </View>
          ))}
        </View>
      )}

      {focus.evaluation.length > 0 && (
        <View style={{ marginTop: 6 }}>
          <Text style={{ fontSize: 8, fontWeight: 700, color: c.mid, letterSpacing: 1.5, marginBottom: 6 }}>EVALUATION CRITERIA</Text>
          {focus.evaluation.map((q, i) => (
            <Text key={i} style={{ ...s.body, paddingLeft: 10 }}>• {q}</Text>
          ))}
          <Text style={s.body}>
            If the answer to these questions is yes, the investment case aligns with what your nursing program is trying to accomplish.
          </Text>
        </View>
      )}

      <View style={{ marginTop: 14, backgroundColor: c.bg, borderRadius: 6, padding: 12 }}>
        <Text style={{ fontSize: 9, fontWeight: 600, color: c.black, marginBottom: 4 }}>What Comes Next</Text>
        <Text style={s.body}>
          Whether you're evaluating technology, building a business case internally, or just trying to understand the landscape — this assessment is yours to use however it's most helpful.
        </Text>
        <Text style={{ fontSize: 9, color: c.mid }}>
          Contact: partnerships@abridge.com
        </Text>
      </View>

      <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 }}>
        <Text style={{ fontSize: 7, fontWeight: 600, color: c.light, marginBottom: 3 }}>ABOUT THIS ASSESSMENT</Text>
        <Text style={{ fontSize: 7, color: c.light, lineHeight: 1.5 }}>
          This assessment reflects your organization's self-reported priorities, interventions, and data. No assumptions are made about the impact of any specific technology. Connection statements reference published nursing workforce research (NSI, ANA, AMN Healthcare). All calculations use only the inputs you provided.
        </Text>
        <Text style={{ fontSize: 7, color: c.light, lineHeight: 1.5, marginTop: 3 }}>{RESEARCH_NOTE}</Text>
      </View>

      <Text style={s.disclaimer}>{DISCLAIMER}</Text>
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
  inputs: AllPriorityInputs,
  orgName: string,
  facilitator: string,
) {
  const doc = (
    <Document>
      <CoverPage orgName={orgName} facilitator={facilitator} />
      <PrioritiesPage baseline={baseline} selectedPriorities={selectedPriorities} inputs={inputs} />
      <StrategicPicturePage baseline={baseline} selectedPriorities={selectedPriorities} inputs={inputs} />
      <FocusPage baseline={baseline} selectedPriorities={selectedPriorities} inputs={inputs} />
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
