import { Page, View, Text } from '@react-pdf/renderer';
import { styles, COLORS } from '../pdfStyles';
import type { PageProps } from '../pdfTypes';
import { formatNumber } from '../pdfContent';

interface AssumptionsPageProps extends PageProps {
  pageNumber: number;
}

export function Assumptions({ model, config, pageNumber }: AssumptionsPageProps) {
  const { inputs, careSettingLabel } = model;

  const coreAssumptions = [
    {
      category: 'Practice Parameters',
      items: [
        { label: 'Number of Providers', value: inputs.numberOfProviders.toString(), validation: 'Verify against FTE count' },
        { label: 'Annual Encounters', value: formatNumber(inputs.annualOutpatientEncounters), validation: 'Match to PM system totals' },
        { label: 'Abridge Utilization', value: `${inputs.abridgeUtilizationPct}%`, validation: '85% typical at mature state' },
        { label: 'Care Setting', value: careSettingLabel, validation: 'Confirms calculation model used' },
      ],
    },
    {
      category: 'Time Savings',
      items: [
        { label: 'Minutes Saved per Encounter', value: `${inputs.minutesSavedPerEncounter} min`, validation: 'Based on Abridge benchmarks across 200+ systems' },
        { label: 'Baseline wRVU per Encounter', value: inputs.baselineWrvuPerEncounter.toFixed(2), validation: 'Pull from practice management data' },
      ],
    },
    {
      category: 'Investment',
      items: [
        { label: 'Monthly Cost per Provider', value: `$${formatNumber(inputs.monthlyCostPerProvider)}`, validation: 'Per contract terms' },
        { label: 'Annual License Cost per Provider', value: `$${formatNumber(inputs.monthlyCostPerProvider * 12)}`, validation: 'Calculated from monthly cost' },
      ],
    },
  ];

  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.sectionHeader}>Model Assumptions</Text>

      <Text style={styles.bodyText}>
        This analysis is built on the following assumptions. Each assumption includes validation guidance to help you 
        confirm accuracy against your organization's actual data.
      </Text>

      {coreAssumptions.map((section, sectionIndex) => (
        <View key={sectionIndex} style={{ marginTop: 16 }}>
          <Text style={styles.subsectionHeader}>{section.category}</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ ...styles.tableHeaderCell, flex: 2 }}>Parameter</Text>
              <Text style={{ ...styles.tableHeaderCell, flex: 1 }}>Value</Text>
              <Text style={{ ...styles.tableHeaderCell, flex: 2 }}>How to Validate</Text>
            </View>
            {section.items.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.assumptionRow}>
                <Text style={{ ...styles.assumptionLabel, flex: 2 }}>{item.label}</Text>
                <Text style={{ ...styles.assumptionValue, flex: 1 }}>{item.value}</Text>
                <Text style={{ ...styles.assumptionValidation, flex: 2 }}>{item.validation}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.divider} />

      <Text style={styles.subsectionHeader}>Data Sources & Methodology</Text>

      <View style={styles.bulletList}>
        <View style={styles.bulletItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={{ fontWeight: 'bold' }}>Time Savings:</Text> Based on validated data from Abridge implementations across 200+ health systems, 
            measuring documentation time before and after deployment.
          </Text>
        </View>
        <View style={styles.bulletItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={{ fontWeight: 'bold' }}>Industry Benchmarks:</Text> Revenue, cost, and utilization parameters derived from MGMA, 
            CMS, and proprietary health system datasets.
          </Text>
        </View>
        <View style={styles.bulletItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={{ fontWeight: 'bold' }}>Conservative Estimates:</Text> Where uncertainty exists, calculations use conservative 
            assumptions to avoid overstating projected benefits.
          </Text>
        </View>
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>Important Disclaimer</Text>
        <Text style={styles.warningText}>
          This ROI analysis is intended for planning purposes only. Actual results will depend on implementation quality, 
          organizational adoption, and operational factors unique to your environment. The projections herein are based on 
          data from comparable implementations but do not guarantee specific outcomes.
        </Text>
      </View>

      {model.customNotes && (
        <View style={{ marginTop: 16 }}>
          <Text style={styles.subsectionHeader}>Additional Notes</Text>
          <Text style={styles.bodyText}>{model.customNotes}</Text>
        </View>
      )}

      <Text style={styles.pageNumber}>{pageNumber}</Text>
    </Page>
  );
}
