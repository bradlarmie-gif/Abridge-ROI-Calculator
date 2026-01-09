import { Page, View, Text } from '@react-pdf/renderer';
import { styles, COLORS } from '../pdfStyles';
import type { PageProps } from '../pdfTypes';
import { formatCurrency, formatPercent } from '../pdfContent';
import { leverLabels } from '../../roi-types';

export function ValueBreakdown({ model, config }: PageProps) {
  const { results, enabledDrivers, driverValues } = model;
  const totalBenefit = results.totalAnnualBenefit;

  const sortedDrivers = enabledDrivers
    .map(id => ({ id, value: driverValues[id] || 0 }))
    .sort((a, b) => b.value - a.value);

  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.sectionHeader}>Value Breakdown</Text>

      <Text style={styles.bodyText}>
        The total projected annual benefit of {formatCurrency(totalBenefit)} is distributed across {enabledDrivers.length} value drivers. 
        Each driver represents a distinct mechanism through which Abridge creates financial value.
      </Text>

      <View style={{ ...styles.valueCard, marginTop: 20 }}>
        <View style={styles.row}>
          <Text style={styles.valueCardHeader}>Total Annual Benefit</Text>
          <Text style={styles.valueAmount}>{formatCurrency(totalBenefit)}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.tableHeaderCell, flex: 3 }}>Value Driver</Text>
          <Text style={{ ...styles.tableHeaderCell, flex: 1, textAlign: 'right' }}>Annual Value</Text>
          <Text style={{ ...styles.tableHeaderCell, flex: 1, textAlign: 'right' }}>% of Total</Text>
        </View>

        {sortedDrivers.map((driver, index) => {
          const percentage = totalBenefit > 0 ? (driver.value / totalBenefit) * 100 : 0;
          return (
            <View key={driver.id} style={styles.tableRow}>
              <Text style={{ ...styles.tableCellBold, flex: 3 }}>
                {leverLabels[driver.id]}
              </Text>
              <Text style={{ ...styles.tableCell, flex: 1, textAlign: 'right', color: COLORS.green }}>
                {formatCurrency(driver.value)}
              </Text>
              <Text style={{ ...styles.tableCell, flex: 1, textAlign: 'right' }}>
                {formatPercent(percentage)}
              </Text>
            </View>
          );
        })}

        <View style={{ ...styles.tableRow, borderTop: `2 solid ${COLORS.border}`, marginTop: 8 }}>
          <Text style={{ ...styles.tableCellBold, flex: 3 }}>Total</Text>
          <Text style={{ ...styles.tableCellBold, flex: 1, textAlign: 'right', color: COLORS.green }}>
            {formatCurrency(totalBenefit)}
          </Text>
          <Text style={{ ...styles.tableCellBold, flex: 1, textAlign: 'right' }}>100%</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.subsectionHeader}>Investment Context</Text>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bodyText}>Annual Investment:</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...styles.bodyText, textAlign: 'right', fontWeight: 'bold', color: COLORS.black }}>
            {formatCurrency(results.annualAbridgeCost)}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bodyText}>Net Value Created:</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...styles.bodyText, textAlign: 'right', fontWeight: 'bold', color: COLORS.green }}>
            {formatCurrency(results.netValueCreated)}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bodyText}>ROI Multiple:</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...styles.bodyText, textAlign: 'right', fontWeight: 'bold', color: COLORS.black }}>
            {results.roiMultiple.toFixed(1)}x
          </Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          The following pages provide detailed calculations, methodology explanations, and assumption validation guidance for each value driver.
        </Text>
      </View>

      <Text style={styles.pageNumber}>3</Text>
    </Page>
  );
}
