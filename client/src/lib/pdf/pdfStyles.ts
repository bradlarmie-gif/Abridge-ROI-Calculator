import { StyleSheet } from '@react-pdf/renderer';

export const COLORS = {
  abridgeOrange: '#EA2C00',
  abridgeRed: '#EA2C00',
  black: '#111827',
  darkGray: '#374151',
  gray: '#6B7280',
  lightGray: '#9CA3AF',
  green: '#059669',
  cardBg: '#F9FAFB',
  warningBg: '#FEF3C7',
  warningBorder: '#F59E0B',
  warningText: '#92400E',
  infoBg: '#EFF6FF',
  border: '#E5E7EB',
  white: '#FFFFFF',
  mathBg: '#FFFBF5',
};

export const styles = StyleSheet.create({
  page: {
    paddingTop: 72,
    paddingBottom: 72,
    paddingLeft: 72,
    paddingRight: 72,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: COLORS.black,
    backgroundColor: COLORS.white,
  },
  
  coverPage: {
    paddingTop: 120,
    paddingBottom: 72,
    paddingLeft: 72,
    paddingRight: 72,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: COLORS.black,
    backgroundColor: COLORS.white,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
  },

  pageNumber: {
    position: 'absolute',
    fontSize: 10,
    bottom: 30,
    right: 72,
    color: COLORS.lightGray,
  },

  pageFooter: {
    position: 'absolute',
    fontSize: 9,
    bottom: 30,
    left: 72,
    color: COLORS.lightGray,
  },

  sectionHeader: {
    fontSize: 14,
    color: COLORS.abridgeOrange,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: 'bold',
    marginBottom: 16,
  },

  subsectionHeader: {
    fontSize: 12,
    color: COLORS.black,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },

  bodyText: {
    fontSize: 11,
    color: COLORS.gray,
    lineHeight: 1.6,
    marginBottom: 8,
  },

  emphasis: {
    color: COLORS.black,
    fontWeight: 'bold',
  },

  coverTitle: {
    fontSize: 32,
    color: COLORS.black,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },

  coverSubtitle: {
    fontSize: 18,
    color: COLORS.gray,
    marginBottom: 24,
    textAlign: 'center',
  },

  coverMeta: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 8,
    textAlign: 'center',
  },

  coverOrg: {
    fontSize: 16,
    color: COLORS.black,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },

  coverDate: {
    fontSize: 12,
    color: COLORS.lightGray,
    marginTop: 24,
    textAlign: 'center',
  },

  coverBranding: {
    fontSize: 10,
    color: COLORS.lightGray,
    textAlign: 'center',
    marginTop: 'auto',
  },

  valueCard: {
    backgroundColor: COLORS.cardBg,
    border: `1 solid ${COLORS.border}`,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },

  valueCardHeader: {
    fontSize: 14,
    color: COLORS.black,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  valueAmount: {
    fontSize: 24,
    color: COLORS.green,
    fontWeight: 'bold',
  },

  valueLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
  },

  driverCard: {
    border: `1 solid ${COLORS.border}`,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },

  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  driverTitle: {
    fontSize: 14,
    color: COLORS.black,
    fontWeight: 'bold',
  },

  driverValue: {
    fontSize: 16,
    color: COLORS.green,
    fontWeight: 'bold',
  },

  driverDescription: {
    fontSize: 11,
    color: COLORS.gray,
    lineHeight: 1.5,
    marginBottom: 12,
  },

  mathSection: {
    backgroundColor: COLORS.mathBg,
    padding: 12,
    borderRadius: 4,
    marginVertical: 12,
  },

  mathHeader: {
    fontSize: 10,
    color: COLORS.abridgeOrange,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  mathStep: {
    fontSize: 10,
    fontFamily: 'Courier',
    color: COLORS.black,
    marginBottom: 4,
  },

  mathResult: {
    fontSize: 11,
    fontFamily: 'Courier',
    color: COLORS.green,
    fontWeight: 'bold',
    marginTop: 8,
    paddingTop: 8,
    borderTop: `1 solid ${COLORS.border}`,
  },

  warningBox: {
    backgroundColor: COLORS.warningBg,
    border: `1 solid ${COLORS.warningBorder}`,
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
  },

  warningTitle: {
    fontSize: 10,
    color: COLORS.warningText,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  warningText: {
    fontSize: 10,
    color: COLORS.warningText,
  },

  infoBox: {
    backgroundColor: COLORS.infoBg,
    borderRadius: 6,
    padding: 12,
    marginVertical: 12,
  },

  infoText: {
    fontSize: 10,
    color: COLORS.darkGray,
    lineHeight: 1.5,
  },

  table: {
    width: '100%',
    marginVertical: 16,
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderBottom: `2 solid ${COLORS.border}`,
    paddingVertical: 8,
  },

  tableHeaderCell: {
    fontSize: 10,
    color: COLORS.black,
    fontWeight: 'bold',
    padding: 4,
  },

  tableRow: {
    flexDirection: 'row',
    borderBottom: `1 solid ${COLORS.border}`,
    paddingVertical: 8,
  },

  tableCell: {
    fontSize: 11,
    color: COLORS.gray,
    padding: 4,
  },

  tableCellBold: {
    fontSize: 11,
    color: COLORS.black,
    fontWeight: 'bold',
    padding: 4,
  },

  divider: {
    borderBottom: `1 solid ${COLORS.border}`,
    marginVertical: 16,
  },

  heavyDivider: {
    borderBottom: `2 solid ${COLORS.border}`,
    marginVertical: 20,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  column: {
    flexDirection: 'column',
  },

  flex1: {
    flex: 1,
  },

  flex2: {
    flex: 2,
  },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 16,
  },

  kpiBox: {
    width: '48%',
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    marginRight: '2%',
  },

  kpiValue: {
    fontSize: 24,
    color: COLORS.black,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  kpiValueGreen: {
    fontSize: 24,
    color: COLORS.green,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  kpiLabel: {
    fontSize: 10,
    color: COLORS.gray,
    textTransform: 'uppercase',
  },

  bulletList: {
    marginVertical: 8,
    paddingLeft: 12,
  },

  bulletItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },

  bulletPoint: {
    fontSize: 11,
    color: COLORS.gray,
    marginRight: 8,
  },

  bulletText: {
    fontSize: 11,
    color: COLORS.gray,
    flex: 1,
    lineHeight: 1.5,
  },

  assumptionRow: {
    flexDirection: 'row',
    borderBottom: `1 solid ${COLORS.border}`,
    paddingVertical: 10,
  },

  assumptionLabel: {
    flex: 1,
    fontSize: 11,
    color: COLORS.black,
    fontWeight: 'bold',
  },

  assumptionValue: {
    flex: 1,
    fontSize: 11,
    color: COLORS.gray,
  },

  assumptionValidation: {
    flex: 2,
    fontSize: 10,
    color: COLORS.lightGray,
    fontStyle: 'italic',
  },

  comparisonHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },

  comparisonColumn: {
    flex: 1,
    alignItems: 'center',
  },

  comparisonLabel: {
    fontSize: 10,
    color: COLORS.gray,
    marginBottom: 4,
  },

  comparisonValue: {
    fontSize: 16,
    color: COLORS.black,
    fontWeight: 'bold',
  },

  comparisonDelta: {
    fontSize: 12,
    color: COLORS.green,
    fontWeight: 'bold',
  },

  comparisonDeltaNegative: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: 'bold',
  },
});

export default styles;
