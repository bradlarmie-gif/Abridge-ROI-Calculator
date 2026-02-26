import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
  Font,
} from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";

Font.registerHyphenationCallback((word) => [word]);

export type CareSetting = "nursing" | "outpatient" | "ed" | "inpatient";

export interface Assumption {
  name: string;
  range: string;
  defaultValue: string;
  source: string;
  sourceDetail?: string;
}

export interface ValueMechanism {
  title: string;
  description: string;
  measurability: "direct" | "indirect" | "qualitative";
}

export interface MethodologyPDFData {
  careSetting: CareSetting;
  settingLabel: string;
  contextSummary: string;
  valueMechanisms: ValueMechanism[];
  assumptions: Assumption[];
  honestLimits: {
    directMeasures: string[];
    indirectMeasures: string[];
  };
  validationSteps: string[];
}

const brand = {
  black: "#1A1A1A",
  white: "#FFFFFF",
  red: "#EA2C00",
  warmGray: "#F8F7F6",
  lightGray: "#F5F4F3",
  midGray: "#E5E4E3",
  borderGray: "#D4D4D4",
  textPrimary: "#1A1A1A",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: brand.white,
    paddingHorizontal: 48,
    paddingVertical: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: brand.textPrimary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  logo: {
    width: 80,
    height: 20,
  },
  headerRight: {
    textAlign: "right",
  },
  headerDate: {
    fontSize: 9,
    color: brand.textTertiary,
  },
  headerLabel: {
    fontSize: 9,
    color: brand.textSecondary,
    marginTop: 2,
  },
  title: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: brand.textSecondary,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 24,
  },
  sectionContent: {
    fontSize: 10,
    color: brand.textPrimary,
    lineHeight: 1.6,
    marginBottom: 16,
  },
  table: {
    marginTop: 8,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: brand.lightGray,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: brand.borderGray,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: brand.textPrimary,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: brand.midGray,
  },
  tableCell: {
    fontSize: 9,
    color: brand.textSecondary,
  },
  col1: { width: "30%" },
  col2: { width: "20%" },
  col3: { width: "20%" },
  col4: { width: "30%" },
  mechanismCard: {
    backgroundColor: brand.warmGray,
    padding: 12,
    marginBottom: 8,
    borderRadius: 4,
  },
  mechanismTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginBottom: 4,
  },
  mechanismDescription: {
    fontSize: 9,
    color: brand.textSecondary,
    lineHeight: 1.5,
  },
  measurabilityBadge: {
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  directBadge: {
    backgroundColor: "#D1FAE5",
    color: "#065F46",
  },
  indirectBadge: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
  },
  qualitativeBadge: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
  },
  bulletList: {
    marginTop: 8,
    marginLeft: 12,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bullet: {
    width: 12,
    fontSize: 9,
    color: brand.textSecondary,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    color: brand.textSecondary,
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: brand.midGray,
  },
  footerText: {
    fontSize: 8,
    color: brand.textTertiary,
  },
  footerPage: {
    fontSize: 8,
    color: brand.textTertiary,
  },
  principleBox: {
    backgroundColor: brand.warmGray,
    padding: 16,
    marginTop: 24,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: brand.red,
  },
  principleText: {
    fontSize: 10,
    color: brand.textPrimary,
    fontStyle: "italic",
    lineHeight: 1.6,
  },
});

function getMeasurabilityStyle(measurability: string) {
  switch (measurability) {
    case "direct":
      return styles.directBadge;
    case "indirect":
      return styles.indirectBadge;
    default:
      return styles.qualitativeBadge;
  }
}

function getMeasurabilityLabel(measurability: string) {
  switch (measurability) {
    case "direct":
      return "Directly Measurable";
    case "indirect":
      return "Indirectly Attributable";
    default:
      return "Qualitative";
  }
}

function MethodologyDocument({ data }: { data: MethodologyPDFData }) {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.headerDate}>{today}</Text>
            <Text style={styles.headerLabel}>ROI Methodology</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{data.settingLabel}: How We Think About Value</Text>
        <Text style={styles.subtitle}>
          A transparent methodology for calculating return on investment
        </Text>

        {/* Context */}
        <Text style={styles.sectionTitle}>The Context</Text>
        <Text style={styles.sectionContent}>{data.contextSummary}</Text>

        {/* Value Mechanisms */}
        <Text style={styles.sectionTitle}>Value Mechanisms</Text>
        {data.valueMechanisms.map((mechanism, index) => (
          <View key={index} style={styles.mechanismCard}>
            <Text style={styles.mechanismTitle}>{mechanism.title}</Text>
            <Text style={styles.mechanismDescription}>{mechanism.description}</Text>
            <Text style={[styles.measurabilityBadge, getMeasurabilityStyle(mechanism.measurability)]}>
              {getMeasurabilityLabel(mechanism.measurability)}
            </Text>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Abridge ROI Studio | Methodology Reference</Text>
          <Text style={styles.footerPage} render={({ pageNumber, totalPages }) => `${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={abridgeLogoPath} style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.headerLabel}>{data.settingLabel} Methodology</Text>
          </View>
        </View>

        {/* Assumptions Table */}
        <Text style={styles.sectionTitle}>Key Assumptions</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.col1]}>Assumption</Text>
            <Text style={[styles.tableHeaderCell, styles.col2]}>Range</Text>
            <Text style={[styles.tableHeaderCell, styles.col3]}>Default</Text>
            <Text style={[styles.tableHeaderCell, styles.col4]}>Source</Text>
          </View>
          {data.assumptions.map((assumption, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.col1]}>{assumption.name}</Text>
              <Text style={[styles.tableCell, styles.col2]}>{assumption.range}</Text>
              <Text style={[styles.tableCell, styles.col3]}>{assumption.defaultValue}</Text>
              <Text style={[styles.tableCell, styles.col4]}>{assumption.source}</Text>
            </View>
          ))}
        </View>

        {/* Honest Limits */}
        <Text style={styles.sectionTitle}>What We Can Measure</Text>
        <Text style={styles.sectionContent}>Directly Measurable:</Text>
        <View style={styles.bulletList}>
          {data.honestLimits.directMeasures.map((item, index) => (
            <View key={index} style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.sectionContent, { marginTop: 12 }]}>Indirectly Attributable:</Text>
        <View style={styles.bulletList}>
          {data.honestLimits.indirectMeasures.map((item, index) => (
            <View key={index} style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Validation Path */}
        <Text style={styles.sectionTitle}>Validation Path</Text>
        <View style={styles.bulletList}>
          {data.validationSteps.map((step, index) => (
            <View key={index} style={styles.bulletItem}>
              <Text style={styles.bullet}>{index + 1}.</Text>
              <Text style={styles.bulletText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Principle Box */}
        <View style={styles.principleBox}>
          <Text style={styles.principleText}>
            "The goal isn't to prove our model right. It's to build your organization's understanding 
            of what ambient documentation actually delivers in your context. Adjust the model based on what you learn."
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Abridge ROI Studio | Methodology Reference</Text>
          <Text style={styles.footerPage} render={({ pageNumber, totalPages }) => `${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function generateMethodologyPDF(data: MethodologyPDFData): Promise<void> {
  const doc = <MethodologyDocument data={data} />;
  const blob = await pdf(doc).toBlob();
  const filename = `abridge-methodology-${data.careSetting}-${new Date().toISOString().split("T")[0]}.pdf`;
  
  await savePdfBlob(blob, filename);
}

export const nursingMethodologyData: MethodologyPDFData = {
  careSetting: "nursing",
  settingLabel: "Nursing",
  contextSummary: "Nursing value is fundamentally different from physician-focused ROI. Nurses don't bill for services, so there's no direct revenue tied to their documentation. Value shows up in labor efficiency—overtime reduction, agency spend, and retention—plus the harder-to-measure benefits of more time at the bedside.",
  valueMechanisms: [
    {
      title: "Overtime Reduction",
      description: "Time saved on documentation can reduce overtime hours. We convert saved time using the OT conversion rate, applying 1.5x hourly rate for OT hours eliminated.",
      measurability: "direct",
    },
    {
      title: "Retention Savings",
      description: "Documentation burden is a key burnout driver. Reducing burden may improve retention, avoiding replacement costs of $40-60K per nurse.",
      measurability: "indirect",
    },
    {
      title: "HAPI Prevention",
      description: "Real-time documentation enables earlier visibility of pressure injury risk, supporting prevention protocols.",
      measurability: "indirect",
    },
    {
      title: "Falls Prevention",
      description: "Better documentation of mobility status and risk factors supports fall prevention programs.",
      measurability: "indirect",
    },
    {
      title: "Patient Experience (HCAHPS)",
      description: "More bedside time correlates with patient satisfaction, though HCAHPS is influenced by many factors.",
      measurability: "qualitative",
    },
  ],
  assumptions: [
    { name: "Time saved per shift", range: "15-30 min", defaultValue: "20 min", source: "Abridge customer data" },
    { name: "OT conversion rate", range: "15-40%", defaultValue: "25%", source: "Implementation studies" },
    { name: "Nurse turnover rate", range: "15-25%", defaultValue: "18%", source: "NSI Nursing Solutions" },
    { name: "Burnout-related %", range: "30-50%", defaultValue: "40%", source: "ANA studies" },
    { name: "Replacement cost", range: "$40-60K", defaultValue: "$50K", source: "NSI 2023 Report" },
    { name: "HAPI rate", range: "1.5-3.5/1K days", defaultValue: "2.5/1K days", source: "AHRQ benchmarks" },
    { name: "Prevention rate", range: "3-10%", defaultValue: "5%", source: "Conservative estimate" },
  ],
  honestLimits: {
    directMeasures: ["Overtime hours before/after", "Time-motion documentation time", "Shift completion rates"],
    indirectMeasures: ["Turnover rates (many factors)", "HAC rates (clinical practice matters)", "Patient satisfaction (dozens of factors)"],
  },
  validationSteps: [
    "Baseline OT and agency spend on pilot units",
    "Survey nursing staff on documentation burden",
    "Track time-motion studies pre/post implementation",
    "Compare turnover rates on Abridge vs. control units",
    "Monitor HAC and HCAHPS trends (directional only)",
  ],
};

export const outpatientMethodologyData: MethodologyPDFData = {
  careSetting: "outpatient",
  settingLabel: "Outpatient",
  contextSummary: "Outpatient care ties documentation directly to revenue through E&M coding, wRVUs, and quality programs. Time savings can translate to patient access, coding accuracy, and reduced administrative burden. The value chain from documentation to revenue is more direct than other settings.",
  valueMechanisms: [
    {
      title: "Patient Access",
      description: "Time saved on documentation can be reallocated to see additional patients, directly increasing capacity and revenue.",
      measurability: "direct",
    },
    {
      title: "wRVU Optimization",
      description: "Better documentation captures the true complexity of visits, potentially improving wRVU production per encounter.",
      measurability: "direct",
    },
    {
      title: "HCC Capture",
      description: "Comprehensive documentation improves chronic condition capture, increasing risk adjustment scores for value-based contracts.",
      measurability: "direct",
    },
    {
      title: "Denial Prevention",
      description: "Complete documentation reduces claim denials and rework costs.",
      measurability: "indirect",
    },
    {
      title: "Clinician Wellbeing",
      description: "Reduced documentation burden may improve retention and reduce burnout-related turnover.",
      measurability: "indirect",
    },
  ],
  assumptions: [
    { name: "Time saved per encounter", range: "2-4.5 min", defaultValue: "3 min", source: "Abridge customer data" },
    { name: "Additional capacity %", range: "5-15%", defaultValue: "10%", source: "Time reallocation studies" },
    { name: "wRVU per visit", range: "$1.50-2.50", defaultValue: "$2.00", source: "MGMA benchmarks" },
    { name: "HCC capture improvement", range: "5-15%", defaultValue: "10%", source: "RAF optimization studies" },
    { name: "Denial rate baseline", range: "5-15%", defaultValue: "8%", source: "Revenue cycle data" },
    { name: "Turnover rate", range: "6-12%", defaultValue: "8%", source: "AMGA surveys" },
  ],
  honestLimits: {
    directMeasures: ["Documentation time per encounter", "Encounters per day", "wRVU production", "HCC gap closure rates"],
    indirectMeasures: ["Denial rates (coding practice matters)", "Retention rates (many factors)", "Patient satisfaction"],
  },
  validationSteps: [
    "Baseline documentation time per encounter",
    "Track daily encounter volume before/after",
    "Monitor wRVU production trends",
    "Measure HCC gap closure rates",
    "Compare denial rates pre/post implementation",
  ],
};

export const edMethodologyData: MethodologyPDFData = {
  careSetting: "ed",
  settingLabel: "Emergency Department",
  contextSummary: "ED economics are driven by throughput. Every minute saved in documentation can reduce door-to-disposition time, decrease LWBS rates, and improve patient flow. The fast-paced environment means smaller per-encounter time savings, but high volume amplifies impact.",
  valueMechanisms: [
    {
      title: "LWBS Recovery",
      description: "Faster documentation reduces wait times and door-to-disposition, recovering patients who would otherwise leave without being seen.",
      measurability: "direct",
    },
    {
      title: "Admission Capture",
      description: "Better documentation supports appropriate admission decisions and revenue capture.",
      measurability: "indirect",
    },
    {
      title: "E&M Accuracy",
      description: "Complete documentation captures visit complexity accurately, supporting appropriate coding levels.",
      measurability: "direct",
    },
    {
      title: "Denial Prevention",
      description: "Thorough documentation reduces medical necessity denials and observation status downgrades.",
      measurability: "indirect",
    },
    {
      title: "Clinician Wellbeing",
      description: "Reduced documentation burden in high-pressure environment may improve retention.",
      measurability: "indirect",
    },
  ],
  assumptions: [
    { name: "Time saved per encounter", range: "2-4 min", defaultValue: "3 min", source: "ED workflow studies" },
    { name: "LWBS rate baseline", range: "2-5%", defaultValue: "3%", source: "ED benchmarks" },
    { name: "LWBS recovery rate", range: "10-30%", defaultValue: "20%", source: "Flow improvement studies" },
    { name: "Average ED claim", range: "$200-400", defaultValue: "$300", source: "Payer mix data" },
    { name: "wRVU baseline", range: "2.0-3.0", defaultValue: "2.5", source: "ACEP data" },
    { name: "Denial rate", range: "8-15%", defaultValue: "10%", source: "Revenue cycle data" },
  ],
  honestLimits: {
    directMeasures: ["Door-to-disposition time", "LWBS rates", "Encounters per hour", "E&M level distribution"],
    indirectMeasures: ["Admission rates (clinical judgment)", "Denial rates (payer behavior)", "Throughput (system-wide factors)"],
  },
  validationSteps: [
    "Baseline LWBS rate and door-to-disposition time",
    "Track documentation time per encounter",
    "Monitor hourly throughput changes",
    "Compare E&M level distribution pre/post",
    "Measure denial rate trends",
  ],
};

export const inpatientMethodologyData: MethodologyPDFData = {
  careSetting: "inpatient",
  settingLabel: "Inpatient",
  contextSummary: "Inpatient economics center on DRG accuracy and length of stay. Documentation quality directly affects case mix index and reimbursement. Unlike outpatient, value comes from per-admission documentation completeness rather than per-encounter efficiency.",
  valueMechanisms: [
    {
      title: "DRG Accuracy",
      description: "Complete documentation captures comorbidities and complications, supporting appropriate DRG assignment and protecting against downgrades.",
      measurability: "direct",
    },
    {
      title: "CDI Query Reduction",
      description: "Real-time documentation reduces Clinical Documentation Integrity queries, saving CDI specialist time and improving efficiency.",
      measurability: "direct",
    },
    {
      title: "Rounding Efficiency",
      description: "Time saved on documentation can be reallocated to patient care and earlier discharges.",
      measurability: "indirect",
    },
    {
      title: "Clinician Wellbeing",
      description: "Hospitalist burnout rates are high. Reduced documentation burden may improve retention.",
      measurability: "indirect",
    },
  ],
  assumptions: [
    { name: "Time saved per admission", range: "15-40 min", defaultValue: "30 min", source: "Inpatient studies" },
    { name: "At-risk admissions", range: "20-30%", defaultValue: "25%", source: "CDI benchmarks" },
    { name: "DRG protection rate", range: "15-25%", defaultValue: "20%", source: "Documentation improvement data" },
    { name: "DRG weight increase", range: "0.3-0.5", defaultValue: "0.4", source: "CMS data" },
    { name: "Base DRG payment", range: "$5-7K", defaultValue: "$6K", source: "Hospital payment data" },
    { name: "CDI query rate", range: "25-35%", defaultValue: "30%", source: "ACDIS benchmarks" },
    { name: "Query cost", range: "$40-60", defaultValue: "$50", source: "CDI productivity data" },
  ],
  honestLimits: {
    directMeasures: ["CDI query rates", "Documentation completion time", "CC/MCC capture rates"],
    indirectMeasures: ["DRG assignment (coding judgment)", "Length of stay (clinical factors)", "Readmission rates (care quality)"],
  },
  validationSteps: [
    "Baseline CDI query rates and resolution time",
    "Track CC/MCC capture rates before/after",
    "Monitor case mix index trends",
    "Compare documentation completion times",
    "Measure hospitalist satisfaction and retention",
  ],
};
