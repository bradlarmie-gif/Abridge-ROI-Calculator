import { Page, View, Text } from '@react-pdf/renderer';
import { styles, COLORS } from '../pdfStyles';
import type { PageProps } from '../pdfTypes';

export function CoverPage({ model, config }: PageProps) {
  const exportTypeLabel = {
    baseline: 'Baseline ROI Model',
    scenario: 'Scenario Analysis',
    comparison: 'Scenario Comparison',
  }[config.exportType];

  return (
    <Page size="LETTER" style={styles.coverPage}>
      <View style={{ marginTop: 60 }}>
        <Text style={{ fontSize: 12, color: COLORS.abridgeOrange, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 24 }}>
          ABRIDGE ROI STUDIO
        </Text>
        
        <Text style={styles.coverTitle}>
          Return on Investment Analysis
        </Text>
        
        <Text style={styles.coverSubtitle}>
          {exportTypeLabel}
        </Text>

        <View style={{ marginTop: 48 }}>
          <Text style={styles.coverOrg}>
            {model.organizationName || 'Your Organization'}
          </Text>
          
          <Text style={styles.coverMeta}>
            {model.careSettingLabel}
          </Text>
          
          <Text style={styles.coverMeta}>
            {model.inputs.numberOfProviders} Providers · {model.inputs.annualOutpatientEncounters.toLocaleString()} Annual Encounters
          </Text>
        </View>

        {model.preparedFor && (
          <View style={{ marginTop: 32 }}>
            <Text style={{ fontSize: 11, color: COLORS.gray, textAlign: 'center' }}>
              Prepared for: {model.preparedFor}
            </Text>
          </View>
        )}

        {model.preparedBy && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 11, color: COLORS.gray, textAlign: 'center' }}>
              Prepared by: {model.preparedBy}
            </Text>
          </View>
        )}
      </View>

      <View style={{ marginTop: 'auto', paddingBottom: 40 }}>
        <Text style={styles.coverDate}>
          Generated: {model.generatedDate}
        </Text>
        
        <Text style={styles.coverBranding}>
          Powered by Abridge · abridge.com
        </Text>
        
        <Text style={{ fontSize: 9, color: COLORS.lightGray, textAlign: 'center', marginTop: 16 }}>
          This analysis is based on user-provided inputs and industry benchmarks.
        </Text>
        <Text style={{ fontSize: 9, color: COLORS.lightGray, textAlign: 'center' }}>
          Actual results may vary based on implementation factors and organizational context.
        </Text>
      </View>
    </Page>
  );
}
