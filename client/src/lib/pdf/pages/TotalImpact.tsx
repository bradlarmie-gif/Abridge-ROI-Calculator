import { Page, View, Text } from '@react-pdf/renderer';
import { styles, COLORS } from '../pdfStyles';
import type { PageProps } from '../pdfTypes';
import { formatCurrency, formatNumber } from '../pdfContent';
import { leverLabels } from '../../roi-types';

interface TotalImpactPageProps extends PageProps {
  pageNumber: number;
}

export function TotalImpact({ model, config, pageNumber }: TotalImpactPageProps) {
  const { results, enabledDrivers, driverValues, inputs } = model;
  const netValue = results.netValueCreated;
  const roiMultiple = results.roiMultiple;
  const paybackMonths = results.annualAbridgeCost / (results.totalAnnualBenefit / 12);

  const fiveYearProjection = {
    year1: netValue,
    year2: netValue * 1.05,
    year3: netValue * 1.10,
    year4: netValue * 1.15,
    year5: netValue * 1.20,
  };
  const fiveYearTotal = Object.values(fiveYearProjection).reduce((a, b) => a + b, 0);

  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.sectionHeader}>Total Financial Impact</Text>

      <Text style={styles.bodyText}>
        This page summarizes the complete financial impact of Abridge implementation across all {enabledDrivers.length} value drivers analyzed.
      </Text>

      <View style={styles.kpiGrid}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiValueGreen}>{formatCurrency(results.totalAnnualBenefit)}</Text>
          <Text style={styles.kpiLabel}>Annual Benefit</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiValue}>{formatCurrency(results.annualAbridgeCost)}</Text>
          <Text style={styles.kpiLabel}>Annual Investment</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiValueGreen}>{formatCurrency(netValue)}</Text>
          <Text style={styles.kpiLabel}>Net Annual Value</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiValue}>{roiMultiple.toFixed(1)}x</Text>
          <Text style={styles.kpiLabel}>ROI Multiple</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.subsectionHeader}>Investment Efficiency Metrics</Text>

      <View style={styles.row}>
        <Text style={{ ...styles.bodyText, flex: 2 }}>Payback Period:</Text>
        <Text style={{ ...styles.bodyText, flex: 1, textAlign: 'right', fontWeight: 'bold' }}>
          {paybackMonths.toFixed(1)} months
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={{ ...styles.bodyText, flex: 2 }}>Value per Provider:</Text>
        <Text style={{ ...styles.bodyText, flex: 1, textAlign: 'right', fontWeight: 'bold' }}>
          {formatCurrency(netValue / inputs.numberOfProviders)}/year
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={{ ...styles.bodyText, flex: 2 }}>Value per Encounter:</Text>
        <Text style={{ ...styles.bodyText, flex: 1, textAlign: 'right', fontWeight: 'bold' }}>
          {formatCurrency(results.totalAnnualBenefit / inputs.annualOutpatientEncounters)}
        </Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.subsectionHeader}>Five-Year Projection</Text>
      <Text style={styles.bodyText}>
        Assuming 5% annual growth in realized value as adoption matures and optimization increases:
      </Text>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.tableHeaderCell, flex: 1 }}>Year</Text>
          <Text style={{ ...styles.tableHeaderCell, flex: 2, textAlign: 'right' }}>Annual Net Value</Text>
          <Text style={{ ...styles.tableHeaderCell, flex: 2, textAlign: 'right' }}>Cumulative</Text>
        </View>
        {[1, 2, 3, 4, 5].map((year) => {
          const yearKey = `year${year}` as keyof typeof fiveYearProjection;
          const cumulative = Object.entries(fiveYearProjection)
            .filter(([key]) => parseInt(key.replace('year', '')) <= year)
            .reduce((sum, [_, val]) => sum + val, 0);
          return (
            <View key={year} style={styles.tableRow}>
              <Text style={{ ...styles.tableCellBold, flex: 1 }}>Year {year}</Text>
              <Text style={{ ...styles.tableCell, flex: 2, textAlign: 'right', color: COLORS.green }}>
                {formatCurrency(fiveYearProjection[yearKey])}
              </Text>
              <Text style={{ ...styles.tableCell, flex: 2, textAlign: 'right' }}>
                {formatCurrency(cumulative)}
              </Text>
            </View>
          );
        })}
        <View style={{ ...styles.tableRow, backgroundColor: COLORS.cardBg }}>
          <Text style={{ ...styles.tableCellBold, flex: 1 }}>5-Year Total</Text>
          <Text style={{ ...styles.tableCellBold, flex: 2, textAlign: 'right', color: COLORS.green }}>
            {formatCurrency(fiveYearTotal)}
          </Text>
          <Text style={{ ...styles.tableCellBold, flex: 2, textAlign: 'right' }}></Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          These projections assume continued Abridge utilization at {model.inputs.abridgeUtilizationPct}% and stable operational parameters. 
          Actual growth may be higher as providers become more proficient and adoption increases across additional workflows.
        </Text>
      </View>

      <Text style={styles.pageNumber}>{pageNumber}</Text>
    </Page>
  );
}
