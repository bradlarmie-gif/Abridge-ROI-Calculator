import { Page, View, Text, StyleSheet, Svg, Path, Circle, Line, Image, Font } from "@react-pdf/renderer";
import abridgeLogoRed from "@assets/abridge-logo-wordmark-red_1769187440253.png";
import abridgeFont from "../../assets/fonts/abridge.otf";

Font.register({
  family: "Abridge",
  src: abridgeFont,
});

interface PDFCoverPageProps {
  reportLabel: string;
  title: string;
  subtitle?: string;
  clientName?: string;
  preparedBy?: string;
}

const colors = {
  primary: "#EA2C00",
  black: "#1A1A1A",
  gray: "#666666",
  lightGray: "#999999",
  border: "#E0E0E0",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.white,
    position: "relative",
    padding: 0,
  },
  chartContainer: {
    position: "absolute",
    bottom: 100,
    right: 50,
    width: 180,
    height: 120,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 60,
    paddingTop: 72,
    justifyContent: "center",
    position: "relative",
    zIndex: 10,
  },
  logo: {
    width: 90,
    position: "absolute",
    top: 72,
    left: 60,
  },
  reportLabel: {
    fontSize: 10,
    color: colors.gray,
    letterSpacing: 3,
    marginBottom: 14,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 42,
    fontFamily: "Abridge",
    fontWeight: "bold",
    color: colors.black,
    lineHeight: 1.2,
    letterSpacing: -1,
    marginBottom: 36,
  },
  divider: {
    width: "40%",
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 28,
  },
  metaLabel: {
    fontSize: 10,
    color: colors.lightGray,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  clientName: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 20,
  },
  preparedByName: {
    fontSize: 14,
    color: colors.black,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 4,
  },
  disclaimer: {
    position: "absolute",
    bottom: 40,
    left: 60,
    right: 60,
  },
  disclaimerText: {
    fontSize: 9,
    color: colors.lightGray,
    fontStyle: "italic",
    lineHeight: 1.5,
  },
});

export function PDFCoverPage({
  reportLabel,
  title,
  clientName,
  preparedBy,
}: PDFCoverPageProps) {
  const displayClientName = clientName || "";
  const displayPreparedBy = preparedBy || "Abridge";
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Page size="LETTER" style={styles.page}>
      <Image src={abridgeLogoRed} style={styles.logo} />

      <View style={styles.chartContainer}>
        <Svg width={180} height={120} viewBox="0 0 180 120">
          {[0, 1, 2, 3].map((i) => (
            <Line
              key={`grid-h-${i}`}
              x1={0}
              y1={i * 40}
              x2={180}
              y2={i * 40}
              stroke={colors.border}
              strokeWidth={0.4}
              strokeOpacity={0.1}
            />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <Line
              key={`grid-v-${i}`}
              x1={i * 45}
              y1={0}
              x2={i * 45}
              y2={120}
              stroke={colors.border}
              strokeWidth={0.4}
              strokeOpacity={0.1}
            />
          ))}
          <Path
            d="M 8 110 Q 60 100 100 65 T 172 10"
            stroke={colors.primary}
            strokeWidth={1.5}
            fill="none"
            strokeOpacity={0.2}
          />
          <Circle cx={40} cy={100} r={2.5} fill={colors.primary} fillOpacity={0.3} />
          <Circle cx={80} cy={78} r={2.5} fill={colors.primary} fillOpacity={0.3} />
          <Circle cx={120} cy={48} r={2.5} fill={colors.primary} fillOpacity={0.3} />
          <Circle cx={155} cy={20} r={2.5} fill={colors.primary} fillOpacity={0.3} />
        </Svg>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.reportLabel}>{reportLabel}</Text>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.divider} />

        {displayClientName ? (
          <View>
            <Text style={styles.metaLabel}>Prepared For</Text>
            <Text style={styles.clientName}>{displayClientName}</Text>
          </View>
        ) : null}

        {displayPreparedBy ? (
          <View>
            <Text style={styles.metaLabel}>Prepared By</Text>
            <Text style={styles.preparedByName}>{displayPreparedBy}</Text>
          </View>
        ) : null}

        <Text style={styles.dateText}>{today}</Text>
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          This assessment is for planning purposes. Calculations are based on inputs provided and Abridge benchmark data.
        </Text>
      </View>
    </Page>
  );
}
