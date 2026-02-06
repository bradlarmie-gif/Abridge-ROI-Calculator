import { Page, View, Text, StyleSheet, Svg, Path, Image, Font } from "@react-pdf/renderer";
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
  curveContainer: {
    position: "absolute",
    bottom: 80,
    right: 0,
    width: 300,
    height: 300,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 54,
    paddingTop: 54,
    justifyContent: "center",
    position: "relative",
    zIndex: 10,
  },
  logo: {
    width: 90,
    position: "absolute",
    top: 54,
    left: 54,
  },
  reportLabel: {
    fontSize: 9,
    color: colors.gray,
    letterSpacing: 3,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 36,
    fontFamily: "Abridge",
    fontWeight: "bold",
    color: colors.black,
    lineHeight: 1.2,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  redRule: {
    width: 60,
    height: 2,
    backgroundColor: colors.primary,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 32,
  },
  metaLabel: {
    fontSize: 9,
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
  preparedByText: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 4,
  },
  disclaimer: {
    position: "absolute",
    bottom: 36,
    left: 54,
    right: 54,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  disclaimerText: {
    fontSize: 8.5,
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
  const displayPreparedBy = preparedBy || "Abridge Partner Success";
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Page size="LETTER" style={styles.page}>
      <Image src={abridgeLogoRed} style={styles.logo} />

      <View style={styles.curveContainer}>
        <Svg width={300} height={300} viewBox="0 0 300 300">
          <Path
            d="M 300 0 Q 250 50 200 120 Q 150 190 80 240 Q 40 270 0 300"
            stroke={colors.primary}
            strokeWidth={80}
            fill="none"
            strokeOpacity={0.08}
            strokeLinecap="round"
          />
        </Svg>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.reportLabel}>{reportLabel}</Text>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.redRule} />

        {subtitle ? (
          <Text style={styles.subtitle}>{subtitle}</Text>
        ) : null}

        {clientName ? (
          <View>
            <Text style={styles.metaLabel}>Prepared For</Text>
            <Text style={styles.clientName}>{clientName}</Text>
          </View>
        ) : null}

        <Text style={styles.metaLabel}>PREPARED BY</Text>
        <Text style={styles.preparedByText}>
          {displayPreparedBy} {"\u00B7"} {today}
        </Text>
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          This assessment is for planning purposes. Calculations are based on actual deployment data and Abridge methodology.
        </Text>
      </View>
    </Page>
  );
}
