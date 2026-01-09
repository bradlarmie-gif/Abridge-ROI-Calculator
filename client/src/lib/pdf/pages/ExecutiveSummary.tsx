import { Page, View, Text } from '@react-pdf/renderer';
import { styles, COLORS } from '../pdfStyles';
import type { PageProps } from '../pdfTypes';
import { generateExecutiveSummaryContent, formatCurrency } from '../pdfContent';

export function ExecutiveSummary({ model, config }: PageProps) {
  const summary = generateExecutiveSummaryContent(model);
  const { results } = model;
  const roiMultiple = results.roiMultiple;
  const netValue = results.netValueCreated;

  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.sectionHeader}>Executive Summary</Text>

      <Text style={{ ...styles.bodyText, fontSize: 12, color: COLORS.black, marginBottom: 20 }}>
        {summary.headline}
      </Text>

      <Text style={styles.bodyText}>
        {summary.context}
      </Text>

      <View style={styles.kpiGrid}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiValueGreen}>{formatCurrency(results.totalAnnualBenefit)}</Text>
          <Text style={styles.kpiLabel}>Total Annual Benefit</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiValue}>{formatCurrency(results.annualAbridgeCost)}</Text>
          <Text style={styles.kpiLabel}>Annual Investment</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiValueGreen}>{formatCurrency(netValue)}</Text>
          <Text style={styles.kpiLabel}>Net Value Created</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiValue}>{roiMultiple.toFixed(1)}x</Text>
          <Text style={styles.kpiLabel}>ROI Multiple</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.subsectionHeader}>Key Findings</Text>

      <View style={styles.bulletList}>
        {summary.keyFindings.map((finding, index) => (
          <View key={index} style={styles.bulletItem}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.bulletText}>{finding}</Text>
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      <Text style={styles.subsectionHeader}>Recommendation</Text>
      <Text style={styles.bodyText}>{summary.recommendation}</Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          This analysis models {model.enabledDrivers.length} value drivers across {model.careSettingLabel.toLowerCase()} care. 
          Each driver represents a distinct pathway through which Abridge creates measurable value. 
          The following pages detail the methodology, calculations, and assumptions behind each driver.
        </Text>
      </View>

      <Text style={styles.pageNumber}>2</Text>
    </Page>
  );
}
