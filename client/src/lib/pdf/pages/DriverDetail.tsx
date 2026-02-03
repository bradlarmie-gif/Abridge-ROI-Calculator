import { Page, View, Text } from '@react-pdf/renderer';
import { styles, COLORS } from '../pdfStyles';
import type { DriverPageProps } from '../pdfTypes';
import { formatCurrency } from '../pdfContent';

interface DriverDetailPageProps extends DriverPageProps {
  pageNumber: number;
}

export function DriverDetail({ model, config, driverId, driverValue, explanation, pageNumber }: DriverDetailPageProps) {
  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.driverCard}>
        <View style={styles.driverHeader}>
          <Text style={styles.driverTitle}>{explanation.title}</Text>
          <Text style={styles.driverValue}>{formatCurrency(driverValue)}</Text>
        </View>
      </View>

      <Text style={styles.subsectionHeader}>The Problem</Text>
      <Text style={styles.driverDescription}>{explanation.problem}</Text>

      <Text style={styles.subsectionHeader}>The Solution</Text>
      <Text style={styles.driverDescription}>{explanation.solution}</Text>

      <View style={styles.mathSection}>
        <Text style={styles.mathHeader}>Calculation Detail</Text>
        {explanation.mathSteps.map((step, index) => (
          <Text key={index} style={styles.mathStep}>{step}</Text>
        ))}
        <Text style={styles.mathResult}>Annual Value: {formatCurrency(driverValue)}</Text>
      </View>

      <Text style={styles.subsectionHeader}>What This Means</Text>
      <Text style={styles.driverDescription}>{explanation.meaning}</Text>

      <Text style={styles.subsectionHeader}>Why It Matters</Text>
      <Text style={styles.driverDescription}>{explanation.whyItMatters}</Text>

      <View style={styles.divider} />

      <Text style={styles.subsectionHeader}>Key Assumptions</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.tableHeaderCell, flex: 1 }}>Parameter</Text>
          <Text style={{ ...styles.tableHeaderCell, flex: 1 }}>Value Used</Text>
          <Text style={{ ...styles.tableHeaderCell, flex: 2 }}>Validation</Text>
        </View>
        {explanation.assumptions.map((assumption, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={{ ...styles.tableCellBold, flex: 1 }}>{assumption.label}</Text>
            <Text style={{ ...styles.tableCell, flex: 1 }}>{assumption.value}</Text>
            <Text style={{ ...styles.tableCell, flex: 2, fontSize: 9, fontWeight: 500 }}>
              {assumption.validation}
              {assumption.industryRange && ` (${assumption.industryRange})`}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>Validation Guidance</Text>
        <Text style={styles.warningText}>{explanation.validationGuidance}</Text>
      </View>

      <Text style={styles.pageNumber}>{pageNumber}</Text>
    </Page>
  );
}
