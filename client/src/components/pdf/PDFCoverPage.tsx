import { Page, View, Text, StyleSheet, Svg, Path, Circle, Line, Image } from "@react-pdf/renderer";
import abridgeLogoWhite from "@assets/abridge-logo-wordmark-white_1769912213277.png";

interface PDFCoverPageProps {
  reportLabel: string;
  title: string;
  subtitle: string;
  clientName?: string;
  preparedBy?: string;
}

const colors = {
  primary: "#EA2C00",
  primaryDark: "#D12600",
  white: "#FFFFFF",
  lightOrange: "rgba(255, 255, 255, 0.15)",
  subtleOrange: "rgba(255, 255, 255, 0.6)",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.primary,
    position: "relative",
  },
  
  gridContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  contentContainer: {
    flex: 1,
    padding: 60,
    paddingTop: 120,
    position: "relative",
    zIndex: 10,
  },
  
  reportLabel: {
    fontSize: 11,
    color: colors.subtleOrange,
    letterSpacing: 2,
    marginBottom: 16,
    textTransform: "uppercase",
  },
  
  title: {
    fontSize: 52,
    fontWeight: "bold",
    color: colors.white,
    lineHeight: 1.1,
    letterSpacing: -1,
    marginBottom: 40,
  },
  
  subtitleContainer: {
    position: "absolute",
    bottom: 180,
    right: 60,
    maxWidth: 200,
    textAlign: "right",
  },
  
  subtitle: {
    fontSize: 14,
    color: colors.subtleOrange,
    lineHeight: 1.5,
  },
  
  clientName: {
    fontSize: 12,
    color: colors.white,
    marginTop: 8,
    fontWeight: "bold",
  },
  
  footer: {
    position: "absolute",
    bottom: 40,
    left: 45,
    right: 45,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  
  logo: {
    width: 80,
    height: 16,
  },
  
  preparedByContainer: {
    alignItems: "flex-end",
  },
  
  preparedByLabel: {
    fontSize: 8,
    color: colors.subtleOrange,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  
  preparedByName: {
    fontSize: 10,
    color: colors.white,
  },
});

export function PDFCoverPage({ 
  reportLabel, 
  title, 
  subtitle, 
  clientName,
  preparedBy 
}: PDFCoverPageProps) {
  const displayClientName = clientName || "";
  const displayPreparedBy = preparedBy || "Abridge";
  
  // A4 dimensions in points: 595 x 842
  const pageWidth = 595;
  const pageHeight = 842;
  const gridSpacingX = 85; // ~7 columns, more spaced out
  const gridSpacingY = 105; // ~8 rows, more spaced out
  
  return (
    <Page size="A4" style={styles.page}>
      {/* Grid Pattern Background */}
      <View style={styles.gridContainer}>
        <Svg width={pageWidth} height={pageHeight} viewBox={`0 0 ${pageWidth} ${pageHeight}`}>
          {/* Vertical grid lines - subtle white */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Line
              key={`v-${i}`}
              x1={gridSpacingX * i}
              y1={0}
              x2={gridSpacingX * i}
              y2={pageHeight}
              stroke="#FFFFFF"
              strokeWidth={0.5}
              strokeOpacity={0.15}
            />
          ))}
          {/* Horizontal grid lines - subtle white */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Line
              key={`h-${i}`}
              x1={0}
              y1={gridSpacingY * i}
              x2={pageWidth}
              y2={gridSpacingY * i}
              stroke="#FFFFFF"
              strokeWidth={0.5}
              strokeOpacity={0.15}
            />
          ))}
          
          {/* Curved growth line - smooth exponential curve */}
          <Path
            d="M 100 810 C 180 805 280 785 360 720 S 480 520 530 350 S 570 120 585 20"
            stroke="#FFFFFF"
            strokeWidth={1.5}
            strokeOpacity={0.35}
            fill="none"
          />
          
          {/* 5 Data points positioned ON the curve */}
          <Circle cx={150} cy={805} r={4} fill="#FFFFFF" fillOpacity={0.45} />
          <Circle cx={320} cy={755} r={4} fill="#FFFFFF" fillOpacity={0.45} />
          <Circle cx={450} cy={585} r={4} fill="#FFFFFF" fillOpacity={0.45} />
          <Circle cx={540} cy={310} r={4} fill="#FFFFFF" fillOpacity={0.45} />
          <Circle cx={580} cy={80} r={4} fill="#FFFFFF" fillOpacity={0.45} />
        </Svg>
      </View>
      
      {/* Main Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.reportLabel}>{reportLabel}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      
      
      {/* Footer */}
      <View style={styles.footer}>
        <Image src={abridgeLogoWhite} style={styles.logo} />
        
        {displayPreparedBy && (
          <View style={styles.preparedByContainer}>
            <Text style={styles.preparedByLabel}>Prepared By</Text>
            <Text style={styles.preparedByName}>{displayPreparedBy}</Text>
          </View>
        )}
      </View>
    </Page>
  );
}
