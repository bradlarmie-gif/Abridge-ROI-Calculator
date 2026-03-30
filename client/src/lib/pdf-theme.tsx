import {
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import abridgeLogoPath from "@assets/abridge-logo-symbol_1774900660514.png";

// ============================================================================
// PREMIUM COLOR PALETTE - SHARED ACROSS ALL METHODOLOGY PDFS
// ============================================================================

export const brand = {
  black: "#1A1A1A",
  darkGray: "#333333",
  mediumGray: "#666666",
  lightGray: "#999999",
  borderGray: "#E5E5E5",
  tableBorder: "#E0E0E0",
  tableHeader: "#F5F5F5",
  tableAlt: "#FAFAFA",
  cardBg: "#FFFFFF",
  abridgeRed: "#EA2C00",
  warmBeige: "#F5F0EB",
  calloutBg: "#FFF8F6",
  
  // Card accent colors (matching badge types)
  directAccent: "#2E7D32",
  indirectAccent: "#F9A825",
  potentialAccent: "#757575",
  qualitativeAccent: "#607D8B",
  connectedAccent: "#1976D2",
  
  directBg: "#E8F5E9",
  directText: "#1B5E20",
  directBorder: "#C8E6C9",
  
  indirectBg: "#FFF8E1",
  indirectText: "#F57F17",
  indirectBorder: "#FFECB3",
  
  potentialBg: "#F5F5F5",
  potentialText: "#616161",
  potentialBorder: "#E0E0E0",
  
  qualitativeBg: "#ECEFF1",
  qualitativeText: "#78909C",
  qualitativeBorder: "#CFD8DC",
  
  connectedBg: "#E3F2FD",
  connectedText: "#1565C0",
  connectedBorder: "#BBDEFB",
};

// ============================================================================
// SHARED STYLES - PREMIUM VERSION
// ============================================================================

export const sharedStyles = StyleSheet.create({
  page: {
    padding: 38,
    paddingBottom: 48,
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.4,
    color: brand.darkGray,
    backgroundColor: "#FFFFFF",
  },
  
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    marginTop: -38,
    marginLeft: -38,
    marginRight: -38,
    paddingVertical: 10,
    paddingHorizontal: 38,
    backgroundColor: brand.warmBeige,
    borderBottomWidth: 2,
    borderBottomColor: brand.abridgeRed,
  },
  logo: {
    width: 14,
    height: 14,
  },
  headerTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.mediumGray,
    letterSpacing: 0.5,
  },
  
  mainTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: "Helvetica",
    color: brand.mediumGray,
    marginBottom: 16,
  },
  
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    letterSpacing: 0.3,
    marginTop: 12,
    marginBottom: 8,
    paddingBottom: 3,
    borderBottomWidth: 2,
    borderBottomColor: brand.black,
  },
  sectionHeaderFirst: {
    marginTop: 0,
  },
  
  bodyText: {
    fontSize: 9,
    lineHeight: 1.45,
    color: brand.darkGray,
    marginBottom: 10,
  },
  
  twoColumn: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  threeColumn: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  column: {
    flex: 1,
  },
  
  card: {
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 3,
    padding: 9,
    backgroundColor: brand.cardBg,
  },
  cardWithAccent: {
    borderTopWidth: 3,
  },
  cardTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginTop: 5,
    marginBottom: 2,
  },
  cardText: {
    fontSize: 8,
    lineHeight: 1.4,
    color: brand.darkGray,
  },
  
  callout: {
    borderLeftWidth: 3,
    borderLeftColor: brand.abridgeRed,
    backgroundColor: brand.calloutBg,
    paddingLeft: 10,
    paddingVertical: 7,
    paddingRight: 10,
    marginTop: 10,
    marginBottom: 8,
  },
  calloutLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.abridgeRed,
  },
  calloutText: {
    fontSize: 8,
    fontFamily: "Helvetica-Oblique",
    lineHeight: 1.4,
    color: brand.darkGray,
  },
  
  table: {
    borderWidth: 1,
    borderColor: brand.tableBorder,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: brand.tableHeader,
    borderBottomWidth: 2,
    borderBottomColor: brand.abridgeRed,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  tableRowAlt: {
    backgroundColor: brand.tableAlt,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    fontSize: 8,
    color: brand.darkGray,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  
  limitsColumn: {
    flex: 1,
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 3,
    padding: 7,
    backgroundColor: brand.cardBg,
  },
  limitsHeader: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginBottom: 2,
  },
  limitsSubtext: {
    fontSize: 7,
    color: brand.mediumGray,
    marginBottom: 4,
  },
  limitsBullet: {
    fontSize: 7,
    color: brand.darkGray,
    marginBottom: 1,
  },
  
  footer: {
    position: "absolute",
    bottom: 22,
    left: 38,
    right: 38,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: brand.abridgeRed,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: brand.lightGray,
  },
  footerPage: {
    fontSize: 7,
    color: brand.lightGray,
  },
  
  // Value mechanism card styles
  mechanismCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: brand.borderGray,
    borderRadius: 3,
    padding: 8,
    backgroundColor: brand.cardBg,
    borderTopWidth: 3,
  },
  mechanismTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: brand.black,
    marginBottom: 3,
  },
  mechanismText: {
    fontSize: 7,
    lineHeight: 1.35,
    color: brand.darkGray,
  },
});

// ============================================================================
// BADGE COMPONENT
// ============================================================================

export type BadgeType = "direct" | "indirect" | "potential" | "qualitative" | "connected";

export function Badge({ type }: { type: BadgeType }) {
  const config = {
    direct: { bg: brand.directBg, text: brand.directText, border: brand.directBorder, label: "DIRECTLY MEASURABLE" },
    indirect: { bg: brand.indirectBg, text: brand.indirectText, border: brand.indirectBorder, label: "INDIRECTLY ATTRIBUTABLE" },
    potential: { bg: brand.potentialBg, text: brand.potentialText, border: brand.potentialBorder, label: "POTENTIAL VALUE" },
    qualitative: { bg: brand.qualitativeBg, text: brand.qualitativeText, border: brand.qualitativeBorder, label: "QUALITATIVE" },
    connected: { bg: brand.connectedBg, text: brand.connectedText, border: brand.connectedBorder, label: "CONNECTED TO RETENTION" },
  };
  const c = config[type];
  
  return (
    <Text style={{
      fontSize: 6,
      fontFamily: "Helvetica-Bold",
      letterSpacing: 0.2,
      marginBottom: 5,
      paddingVertical: 2,
      paddingHorizontal: 4,
      borderRadius: 2,
      alignSelf: "flex-start" as const,
      backgroundColor: c.bg,
      color: c.text,
      borderWidth: 1,
      borderColor: c.border,
    }}>
      {c.label}
    </Text>
  );
}

// ============================================================================
// SECTION HEADER COMPONENT
// ============================================================================

export function SectionHeader({ title, isFirst = false }: { title: string; isFirst?: boolean }) {
  return (
    <Text style={[sharedStyles.sectionHeader, isFirst ? sharedStyles.sectionHeaderFirst : {}]}>{title}</Text>
  );
}

// ============================================================================
// PAGE HEADER COMPONENT
// ============================================================================

export function PageHeader({ rightText = "ROI METHODOLOGY" }: { rightText?: string }) {
  return (
    <View style={sharedStyles.header}>
      <Image src={abridgeLogoPath} style={sharedStyles.logo} />
      <Text style={sharedStyles.headerTitle}>{rightText}</Text>
    </View>
  );
}

// ============================================================================
// PAGE FOOTER COMPONENT
// ============================================================================

export function PageFooter({ 
  pageNum, 
  totalPages, 
  careSetting 
}: { 
  pageNum: number; 
  totalPages: number; 
  careSetting: string;
}) {
  return (
    <View style={sharedStyles.footer}>
      <Text style={sharedStyles.footerText}>Abridge ROI Methodology | {careSetting}</Text>
      <Text style={sharedStyles.footerPage}>Page {pageNum} of {totalPages}</Text>
    </View>
  );
}

// ============================================================================
// CALLOUT COMPONENT
// ============================================================================

export function Callout({ label, text }: { label: string; text: string }) {
  return (
    <View style={sharedStyles.callout}>
      <Text style={sharedStyles.calloutText}>
        <Text style={sharedStyles.calloutLabel}>{label}: </Text>
        {text}
      </Text>
    </View>
  );
}

// ============================================================================
// VALUE MECHANISM CARD COMPONENT
// ============================================================================

export function ValueMechanismCard({ 
  title, 
  badgeType, 
  description 
}: { 
  title: string; 
  badgeType: BadgeType; 
  description: string;
}) {
  const accentColors = {
    direct: brand.directAccent,
    indirect: brand.indirectAccent,
    potential: brand.potentialAccent,
    qualitative: brand.qualitativeAccent,
    connected: brand.connectedAccent,
  };
  
  return (
    <View style={[sharedStyles.mechanismCard, { borderTopColor: accentColors[badgeType] }]}>
      <Badge type={badgeType} />
      <Text style={sharedStyles.mechanismTitle}>{title}</Text>
      <Text style={sharedStyles.mechanismText}>{description}</Text>
    </View>
  );
}

// ============================================================================
// VALIDATION PATH CARD COMPONENT
// ============================================================================

export function ValidationCard({ 
  title, 
  beforeItems, 
  afterItems, 
  timeline 
}: { 
  title: string; 
  beforeItems: string; 
  afterItems: string; 
  timeline: string;
}) {
  return (
    <View style={[sharedStyles.card, sharedStyles.column, { padding: 7 }]}>
      <Text style={sharedStyles.cardTitle}>{title}</Text>
      <Text style={sharedStyles.cardLabel}>Before:</Text>
      <Text style={sharedStyles.cardText}>{beforeItems}</Text>
      <Text style={sharedStyles.cardLabel}>After:</Text>
      <Text style={sharedStyles.cardText}>{afterItems}</Text>
      <Text style={[sharedStyles.cardText, { marginTop: 3, fontFamily: "Helvetica-Bold" }]}>
        Timeline: {timeline}
      </Text>
    </View>
  );
}

// ============================================================================
// ASSUMPTIONS TABLE COMPONENT
// ============================================================================

export function AssumptionsTable({ 
  rows 
}: { 
  rows: Array<{ input: string; range: string; defaultVal: string; rationale: string }>;
}) {
  return (
    <View style={sharedStyles.table}>
      <View style={sharedStyles.tableHeader}>
        <Text style={[sharedStyles.tableHeaderCell, { flex: 2.5 }]}>Input</Text>
        <Text style={[sharedStyles.tableHeaderCell, { flex: 1 }]}>Range</Text>
        <Text style={[sharedStyles.tableHeaderCell, { flex: 1 }]}>Default</Text>
        <Text style={[sharedStyles.tableHeaderCell, { flex: 2 }]}>Rationale</Text>
      </View>
      {rows.map((row, index) => (
        <View 
          key={index} 
          style={[
            sharedStyles.tableRow, 
            index % 2 === 1 ? sharedStyles.tableRowAlt : {},
            index === rows.length - 1 ? sharedStyles.tableRowLast : {}
          ]}
        >
          <Text style={[sharedStyles.tableCell, { flex: 2.5 }]}>{row.input}</Text>
          <Text style={[sharedStyles.tableCell, { flex: 1 }]}>{row.range}</Text>
          <Text style={[sharedStyles.tableCell, { flex: 1 }]}>{row.defaultVal}</Text>
          <Text style={[sharedStyles.tableCell, { flex: 2 }]}>{row.rationale}</Text>
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// LIMITS COLUMNS COMPONENT
// ============================================================================

export function LimitsColumns({ 
  measure, 
  influence, 
  enable 
}: { 
  measure: { items: string[] }; 
  influence: { items: string[] }; 
  enable: { items: string[] };
}) {
  return (
    <View style={sharedStyles.threeColumn}>
      <View style={sharedStyles.limitsColumn}>
        <Text style={sharedStyles.limitsHeader}>[+] WHAT WE MEASURE</Text>
        <Text style={sharedStyles.limitsSubtext}>Direct attribution</Text>
        {measure.items.map((item, i) => (
          <Text key={i} style={sharedStyles.limitsBullet}>- {item}</Text>
        ))}
      </View>
      <View style={sharedStyles.limitsColumn}>
        <Text style={sharedStyles.limitsHeader}>[~] WHAT WE INFLUENCE</Text>
        <Text style={sharedStyles.limitsSubtext}>Indirect attribution</Text>
        {influence.items.map((item, i) => (
          <Text key={i} style={sharedStyles.limitsBullet}>- {item}</Text>
        ))}
      </View>
      <View style={sharedStyles.limitsColumn}>
        <Text style={sharedStyles.limitsHeader}>[ ] WHAT WE ENABLE</Text>
        <Text style={sharedStyles.limitsSubtext}>Supportive only</Text>
        {enable.items.map((item, i) => (
          <Text key={i} style={sharedStyles.limitsBullet}>- {item}</Text>
        ))}
      </View>
    </View>
  );
}

// Export logo path for use in generators
export { abridgeLogoPath };
