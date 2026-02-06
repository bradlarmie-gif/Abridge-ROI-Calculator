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
  subtitle: string;
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
  warmBeige: "#F5F0EB",
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
    right: 40,
    width: 200,
    height: 140,
  },

  contentContainer: {
    flex: 1,
    padding: 60,
    paddingTop: 80,
    position: "relative",
    zIndex: 10,
  },

  logo: {
    width: 90,
    marginBottom: 60,
  },

  reportLabel: {
    fontSize: 11,
    color: colors.gray,
    letterSpacing: 2,
    marginBottom: 16,
    textTransform: "uppercase",
  },

  title: {
    fontSize: 48,
    fontFamily: "Abridge",
    fontWeight: "bold",
    color: colors.black,
    lineHeight: 1.1,
    letterSpacing: -1,
    marginBottom: 40,
  },

  divider: {
    width: 200,
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 32,
  },

  metaLabel: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 4,
  },

  metaValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
    marginBottom: 20,
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
    fontSize: 8,
    color: colors.lightGray,
    lineHeight: 1.5,
  },
});

export function PDFCoverPage({
  reportLabel,
  title,
  subtitle,
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
    <Page size="A4" style={styles.page}>
      <View style={styles.chartContainer}>
        <Svg width={200} height={140} viewBox="0 0 200 140">
          {[0, 1, 2, 3, 4].map((i) => (
            <Line
              key={`grid-h-${i}`}
              x1={0}
              y1={i * 35}
              x2={200}
              y2={i * 35}
              stroke={colors.border}
              strokeWidth={0.5}
              strokeOpacity={0.5}
            />
          ))}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Line
              key={`grid-v-${i}`}
              x1={i * 40}
              y1={0}
              x2={i * 40}
              y2={140}
              stroke={colors.border}
              strokeWidth={0.5}
              strokeOpacity={0.5}
            />
          ))}
          <Path
            d="M 10 130 Q 80 120 120 80 T 190 10"
            stroke={colors.primary}
            strokeWidth={2}
            fill="none"
            strokeOpacity={0.6}
          />
          <Circle cx={50} cy={122} r={3} fill={colors.primary} fillOpacity={0.5} />
          <Circle cx={100} cy={95} r={3} fill={colors.primary} fillOpacity={0.5} />
          <Circle cx={140} cy={60} r={3} fill={colors.primary} fillOpacity={0.5} />
          <Circle cx={175} cy={25} r={3} fill={colors.primary} fillOpacity={0.5} />
        </Svg>
      </View>

      <View style={styles.contentContainer}>
        <Image src={abridgeLogoRed} style={styles.logo} />

        <Text style={styles.reportLabel}>{reportLabel}</Text>
        <Text style={styles.title}>{title}</Text>

        <View style={styles.divider} />

        {displayClientName ? (
          <View>
            <Text style={styles.metaLabel}>Prepared for</Text>
            <Text style={styles.metaValue}>{displayClientName}</Text>
          </View>
        ) : null}

        {displayPreparedBy ? (
          <View>
            <Text style={styles.metaLabel}>Prepared by</Text>
            <Text style={styles.metaValue}>{displayPreparedBy}</Text>
          </View>
        ) : null}

        <Text style={styles.dateText}>{today}</Text>
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          This assessment is for planning purposes. All calculations are based on inputs provided and Abridge benchmark data.
        </Text>
      </View>
    </Page>
  );
}
