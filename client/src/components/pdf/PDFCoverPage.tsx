import { Page, View, Text, StyleSheet, Svg, Path, Circle, Line } from "@react-pdf/renderer";

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
    bottom: 50,
    left: 60,
    right: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  
  logoText: {
    fontSize: 16,
    color: colors.white,
    letterSpacing: 6,
    fontWeight: "normal",
    fontFamily: "Helvetica",
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
  const gridSpacingX = 66; // ~9 columns
  const gridSpacingY = 76; // ~11 rows
  
  return (
    <Page size="A4" style={styles.page}>
      {/* Grid Pattern Background */}
      <View style={styles.gridContainer}>
        <Svg width={pageWidth} height={pageHeight} viewBox={`0 0 ${pageWidth} ${pageHeight}`}>
          {/* Vertical grid lines - white, thin */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <Line
              key={`v-${i}`}
              x1={gridSpacingX * i}
              y1={0}
              x2={gridSpacingX * i}
              y2={pageHeight}
              stroke="#FFFFFF"
              strokeWidth={0.5}
              strokeOpacity={0.3}
            />
          ))}
          {/* Horizontal grid lines - white, thin */}
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
            <Line
              key={`h-${i}`}
              x1={0}
              y1={gridSpacingY * i}
              x2={pageWidth}
              y2={gridSpacingY * i}
              stroke="#FFFFFF"
              strokeWidth={0.5}
              strokeOpacity={0.3}
            />
          ))}
          
          {/* Curved growth line - white, parabolic/exponential shape */}
          <Path
            d="M 50 820 C 100 810 200 790 280 720 C 360 650 420 520 470 380 C 520 240 550 100 570 0"
            stroke="#FFFFFF"
            strokeWidth={1.5}
            strokeOpacity={0.6}
            fill="none"
          />
          
          {/* Data points on the curve - white */}
          <Circle cx={120} cy={800} r={4} fill="#FFFFFF" fillOpacity={0.7} />
          <Circle cx={220} cy={770} r={4} fill="#FFFFFF" fillOpacity={0.7} />
          <Circle cx={340} cy={620} r={4} fill="#FFFFFF" fillOpacity={0.7} />
          <Circle cx={440} cy={430} r={4} fill="#FFFFFF" fillOpacity={0.7} />
          <Circle cx={520} cy={200} r={4} fill="#FFFFFF" fillOpacity={0.7} />
          <Circle cx={560} cy={50} r={4} fill="#FFFFFF" fillOpacity={0.7} />
        </Svg>
      </View>
      
      {/* Main Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.reportLabel}>{reportLabel}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      
      {/* Subtitle Area */}
      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {displayClientName && (
          <Text style={styles.clientName}>{displayClientName}</Text>
        )}
      </View>
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.logoText}>ABRIDGE</Text>
        
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
