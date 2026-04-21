import { Document, Page, Text, View, StyleSheet, Svg, Rect, Line, Path, pdf, Font } from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";
import type { ForecastState, ForecastValueDriver, ValueDomain, DriverOnset, PricingModel } from "@/pages/forecast/types";
import { CARE_SETTING_LABELS, VALUE_DOMAIN_LABELS, ONSET_DELAY_MONTHS, PRICING_MODEL_LABELS } from "@/pages/forecast/types";
import { calculateForecast, type ForecastResult } from "@/lib/forecastCalculator";

Font.registerHyphenationCallback((word) => [word]);
Font.register({ family: "Manrope", fonts: [{ src: manropeRegular, fontWeight: 400 }, { src: manropeBold, fontWeight: 700 }] });

const C = { bg: "#FFFFFF", card: "#F5F0EB", orange: "#EA2C00", dark: "#1A1A1A", mid: "#666666", muted: "#999999", border: "#E5E5E5", green: "#0F8A5F", red: "#D63A1A" };

const s = StyleSheet.create({
  page: { padding: 54, paddingBottom: 50, fontFamily: "Manrope", fontSize: 10, color: C.dark, backgroundColor: C.bg },
  headline: { fontSize: 20, fontWeight: "bold", color: C.dark, marginBottom: 4 },
  subline: { fontSize: 9, color: C.muted, marginBottom: 14 },
  eyebrow: { fontSize: 8, color: C.orange, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 },
  card: { backgroundColor: C.card, borderRadius: 4, padding: 14, marginBottom: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  gridCell: { backgroundColor: C.card, borderRadius: 4, padding: 14, width: "48.5%", marginBottom: 8 },
  smallLabel: { fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  largeValue: { fontSize: 18, fontWeight: "bold", color: C.dark },
  narrative: { fontSize: 11, color: C.mid, lineHeight: 1.65, marginTop: 16 },
  bold: { fontWeight: "bold", color: C.dark },
  footer: { marginTop: "auto", flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8 },
  footerLeft: { fontSize: 9, color: C.orange, fontWeight: "bold" },
  footerCenter: { fontSize: 8, color: C.mid },
  footerRight: { fontSize: 8, color: C.muted },
  subheader: { fontSize: 12, fontWeight: "bold", color: C.dark, marginTop: 16, marginBottom: 8 },
  tableHeader: { backgroundColor: C.card, flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, alignItems: "center" },
  tableRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: C.border, alignItems: "center" },
  colLabel: { fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: 1 },
  placeholder: { padding: 24, backgroundColor: C.card, borderRadius: 4, textAlign: "center", fontSize: 10, color: C.muted },
  chartContainer: { marginTop: 10, marginBottom: 10 },
  legend: { flexDirection: "row", flexWrap: "wrap", marginTop: 8, gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  swatch: { width: 8, height: 8, borderRadius: 1 },
  bulletRow: { flexDirection: "row", gap: 8, marginBottom: 6, alignItems: "flex-start" },
  bullet: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.orange, marginTop: 4 },
  callout: { backgroundColor: C.card, borderLeftWidth: 3, borderLeftColor: C.orange, padding: 12, marginTop: 12, borderRadius: 4 },
});

// Helpers
const fmtCurrency = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString()}`;
const fmtCurrencyShort = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
};
const fmtPct = (n: number) => `${Math.round(n)}%`;
const breakEvenLabel = (m: number | null) => m ? `Month ${m}` : "Not reached within term";

const PageFooter = ({ partnerName, dateStr }: { partnerName: string, dateStr: string }) => (
  <View style={s.footer} fixed>
    <Text style={s.footerLeft}>ABRIDGE FORECAST</Text>
    <Text style={s.footerCenter}>{partnerName} • Generated {dateStr}</Text>
    <Text style={s.footerRight} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
  </View>
);

const ONSET_LABELS: Record<DriverOnset, string> = {
  immediate: "Immediate",
  delayed: "Delayed (5mo)",
  phased: "Phased (6mo)",
  longTerm: "Long-term (15mo)",
};

const SCALING_LABELS = {
  perEncounter: "/enc",
  perActiveUser: "/user",
  perBed: "/bed",
  annualFlat: "Annual",
};

const DOMAIN_FILLS = {
  capacity: "#EA2C00",
  revenue: "#1E3A5F",
  workforce: "#D4930A",
  quality: "#2D7377"
};

const DOMAIN_LEGEND = [
  { label: "Billing/Capacity", color: DOMAIN_FILLS.capacity },
  { label: "Revenue", color: DOMAIN_FILLS.revenue },
  { label: "Cost/Workforce", color: DOMAIN_FILLS.workforce },
  { label: "Quality", color: DOMAIN_FILLS.quality }
];

function summaryNarrative(state: ForecastState, result: ForecastResult, partnerName: string) {
  const termMonths = state.contractTermMonths;
  const netValue = result.kpis.netContractValue;
  const fastBE = breakEvenLabel(result.kpis.fastBreakEvenMonth);
  const fullBE = breakEvenLabel(result.kpis.fullBreakEvenMonth);
  
  const parts = [
    { text: "Based on current trajectory and measured outcomes, " },
    { text: partnerName, bold: true },
    { text: " is projected to realize " },
    { text: fmtCurrency(netValue), bold: true },
    { text: " in net value over the " },
    { text: `${termMonths}-month`, bold: true },
    { text: " remaining contract term. Fast break-even is expected in " },
    { text: "Month " + fastBE, bold: true },
    { text: ", full break-even in " },
    { text: "Month " + fullBE, bold: true },
    { text: "." }
  ];

  if (state.valueDrivers.length === 0) {
    parts.push({ text: " No value drivers have been added yet — the projection above reflects pricing only." });
  }

  return (
    <Text style={s.narrative}>
      {parts.map((p, i) => (
        <Text key={i} style={p.bold ? s.bold : {}}>{p.text}</Text>
      ))}
    </Text>
  );
}

function formatPricingModel(p: { model: PricingModel; unitPrice: number; secondaryModel?: PricingModel; secondaryUnitPrice?: number }) {
  const fmt = (m: PricingModel, u: number) => {
    if (m === 'perProvider') return `$${u}/provider/mo`;
    if (m === 'perStaffedBed') return `$${u}/bed/mo`;
    if (m === 'annualFlat') return `$${u.toLocaleString()}/yr`;
    if (m === 'perEncounter') return `$${u}/enc`;
    return `$${u}`;
  };

  if (p.model === 'hybrid') {
    return `$${p.unitPrice}/provider + ${fmt(p.secondaryModel || 'perEncounter', p.secondaryUnitPrice || 0)} secondary`;
  }
  return fmt(p.model, p.unitPrice);
}

export function ForecastPDF({ state, result, partnerName, dateStr }: { state: ForecastState; result: ForecastResult; partnerName: string; dateStr: string; }): JSX.Element {
  const termYears = Math.ceil(state.contractTermMonths / 12);
  
  let contractWindowString = `${state.contractTermMonths / 12}-year contract`;
  if (state.contractStartDate) {
    const start = new Date(state.contractStartDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + state.contractTermMonths);
    const dtf = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
    contractWindowString = `${dtf.format(start)} \u2192 ${dtf.format(end)}`;
  }

  const hasEncounterPricing = state.currentPricing.model === 'perEncounter' || 
    state.currentPricing.model === 'hybrid' || 
    state.comparisonPricing.some(c => c.pricing.model === 'perEncounter' || c.pricing.model === 'hybrid');

  const domainTotalsByYear: Record<number, Record<ValueDomain, number>> = {};
  for (let y = 1; y <= termYears; y++) {
    domainTotalsByYear[y] = { capacity: 0, revenue: 0, workforce: 0, quality: 0 };
    for (let m = (y - 1) * 12 + 1; m <= Math.min(y * 12, state.contractTermMonths); m++) {
      const row = result.monthly[m - 1];
      if (!row) continue;
      domainTotalsByYear[y].capacity += row.valueByDomain.capacity;
      domainTotalsByYear[y].revenue += row.valueByDomain.revenue;
      domainTotalsByYear[y].workforce += row.valueByDomain.workforce;
      domainTotalsByYear[y].quality += row.valueByDomain.quality;
    }
  }

  return (
    <Document title={`Forecast Report - ${partnerName}`}>
      <Page size="A4" style={{ padding: 0 }}>
        <PDFCoverPage reportLabel="ABRIDGE FORECAST" title={partnerName} subtitle="Forecast" clientName={contractWindowString} />
      </Page>

      {/* Page 2: Executive Summary */}
      <Page size="A4" style={s.page}>
        <View style={{ flex: 1 }}>
          <Text style={s.headline}>Executive Summary</Text>
          <Text style={s.subline}>Headline projections across the {termYears}-year term</Text>
          
          <View style={s.grid}>
            <View style={s.gridCell}>
              <Text style={s.smallLabel}>Total Contract Value</Text>
              <Text style={s.largeValue}>{fmtCurrencyShort(result.kpis.totalContractValue)}</Text>
            </View>
            <View style={s.gridCell}>
              <Text style={s.smallLabel}>Net Contract Value</Text>
              <Text style={[s.largeValue, result.kpis.netContractValue < 0 ? { color: C.red } : {}]}>
                {fmtCurrencyShort(result.kpis.netContractValue)}
              </Text>
            </View>
            <View style={s.gridCell}>
              <Text style={s.smallLabel}>ROI Multiple</Text>
              <Text style={s.largeValue}>{result.kpis.roiMultiple.toFixed(2)}x</Text>
            </View>
            <View style={s.gridCell}>
              <Text style={s.smallLabel}>Fast Break-Even</Text>
              <Text style={s.largeValue}>{breakEvenLabel(result.kpis.fastBreakEvenMonth)}</Text>
            </View>
            <View style={s.gridCell}>
              <Text style={s.smallLabel}>Full Break-Even</Text>
              <Text style={s.largeValue}>{breakEvenLabel(result.kpis.fullBreakEvenMonth)}</Text>
            </View>
            {(state.currentPricing.model === 'perEncounter' || state.currentPricing.model === 'hybrid') && (
              <View style={s.gridCell}>
                <Text style={s.smallLabel}>Runway Month</Text>
                <Text style={s.largeValue}>
                  {result.kpis.runwayMonth ? `Month ${result.kpis.runwayMonth}` : "Within capacity for full term"}
                </Text>
              </View>
            )}
          </View>

          {summaryNarrative(state, result, partnerName)}
        </View>
        <PageFooter partnerName={partnerName} dateStr={dateStr} />
      </Page>

      {/* Page 3: Where You Are Today */}
      <Page size="A4" style={s.page}>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>{state.importSource.type === 'measure' ? "IMPORTED FROM MEASURE" : "USER INPUT"}</Text>
          <Text style={s.headline}>Where You Are Today</Text>
          
          <View style={s.grid}>
            <View style={[s.gridCell, { padding: 12 }]}>
              <Text style={s.smallLabel}>Active Users Today</Text>
              <Text style={[s.largeValue, { fontSize: 16 }]}>{state.activeUsersToday.toLocaleString()}</Text>
            </View>
            <View style={[s.gridCell, { padding: 12 }]}>
              <Text style={s.smallLabel}>Provisioned Seats</Text>
              <Text style={[s.largeValue, { fontSize: 16 }]}>{state.provisionedSeats.toLocaleString()}</Text>
            </View>
            <View style={[s.gridCell, { padding: 12 }]}>
              <Text style={s.smallLabel}>Abridge Encounter Share</Text>
              <Text style={[s.largeValue, { fontSize: 16 }]}>
                {state.totalOrgEncountersLTM > 0 
                  ? `${((state.abridgeEncountersLTM / state.totalOrgEncountersLTM) * 100).toFixed(1)}%` 
                  : "0%"}
              </Text>
            </View>
            <View style={[s.gridCell, { padding: 12 }]}>
              <Text style={s.smallLabel}>Total Encounters LTM</Text>
              <Text style={[s.largeValue, { fontSize: 16 }]}>{state.totalOrgEncountersLTM.toLocaleString()}</Text>
            </View>
          </View>

          <Text style={s.subheader}>Measured outcomes by domain</Text>
          {state.valueDrivers.length === 0 ? (
            <Text style={s.placeholder}>No measured outcomes captured yet — add value drivers on the Dashboard.</Text>
          ) : (
            <View>
              <View style={s.tableHeader}>
                <Text style={[s.colLabel, { flex: 1 }]}>Driver</Text>
                <Text style={[s.colLabel, { width: 80, textAlign: "right" }]}>Measured Δ</Text>
                <Text style={[s.colLabel, { width: 70, textAlign: "right" }]}>Confidence</Text>
                <Text style={[s.colLabel, { width: 70, textAlign: "right" }]}>Realization</Text>
              </View>
              {state.valueDrivers.map(d => (
                <View key={d.id} style={s.tableRow}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", flex: 1 }}>{d.label}</Text>
                  <Text style={{ fontSize: 9, width: 80, textAlign: "right" }}>
                    {d.measuredDelta !== undefined ? `$${d.measuredDelta.toLocaleString()}` : "—"}
                  </Text>
                  <Text style={{ fontSize: 9, width: 70, textAlign: "right" }}>{d.confidence}%</Text>
                  <Text style={{ fontSize: 9, width: 70, textAlign: "right" }}>{d.realizationPct}%</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <PageFooter partnerName={partnerName} dateStr={dateStr} />
      </Page>

      {/* Page 4: Forward Forecast Assumptions */}
      <Page size="A4" style={s.page}>
        <View style={{ flex: 1 }}>
          <Text style={s.headline}>Forward Forecast Assumptions</Text>
          
          <View style={s.grid}>
            <View style={[s.gridCell, { width: "48.5%" }]}>
              <Text style={s.smallLabel}>Adoption</Text>
              <Text style={{ fontSize: 10, fontWeight: "bold" }}>{state.adoptionCurve.type.toUpperCase()}</Text>
              <Text style={{ fontSize: 9, color: C.mid }}>Ramp: {state.adoptionCurve.rampMonths} mo</Text>
              <Text style={{ fontSize: 9, color: C.mid }}>{state.adoptionCurve.startPct}% \u2192 {state.adoptionCurve.endPct}%</Text>
            </View>
            <View style={[s.gridCell, { width: "48.5%" }]}>
              <Text style={s.smallLabel}>Encounter Share Basis</Text>
              <Text style={{ fontSize: 14, fontWeight: "bold" }}>
                {(state.encounterShareCurve.values.reduce((a, b) => a + b, 0) / state.encounterShareCurve.values.length).toFixed(1)}%
              </Text>
            </View>
          </View>

          <View style={[s.card, { padding: 12 }]}>
            <Text style={s.smallLabel}>Utilization by year</Text>
            {Array.from({ length: termYears }).map((_, i) => {
              const year = i + 1;
              const startIdx = i * 4;
              const qVals = state.utilizationCurve.values.slice(startIdx, startIdx + 4);
              const avgUtil = qVals.length ? qVals.reduce((a, b) => a + b, 0) / qVals.length : 0;
              const barWidth = (avgUtil / 100) * 380;
              return (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  <Text style={{ width: 40, fontSize: 8, color: C.mid }}>Y{year}</Text>
                  <Svg width="400" height="12">
                    <Rect x="0" y="0" width="380" height="12" fill={C.border} rx="2" />
                    <Rect x="0" y="0" width={barWidth} height="12" fill={C.orange} rx="2" />
                  </Svg>
                  <Text style={{ marginLeft: 8, fontSize: 8, fontWeight: "bold" }}>{Math.round(avgUtil)}%</Text>
                </View>
              );
            })}
            <Text style={{ fontSize: 8, color: C.muted, marginTop: 4 }}>
              Historical growth: {((state.historicalGrowthMonthly.reduce((a,b)=>a+b,0)/state.historicalGrowthMonthly.length)).toFixed(2)}% MoM ({state.growthSource === 'benchmark' ? 'AMC benchmark' : 'partner-provided'})
            </Text>
          </View>

          <Text style={s.subheader}>Projected active users over term</Text>
          <View style={s.chartContainer}>
            <Svg width="480" height="120">
              <Line x1="40" y1="100" x2="460" y2="100" stroke={C.border} strokeWidth="1" />
              {(() => {
                const points: [number, number][] = [];
                const maxVal = Math.max(...result.monthly.map(r => r.activeUsers), 10);
                const chartWidth = 420;
                const chartHeight = 80;
                
                const qMonths = [];
                for (let m = 0; m <= state.contractTermMonths; m += 3) qMonths.push(m);
                if (qMonths[qMonths.length - 1] !== state.contractTermMonths) qMonths.push(state.contractTermMonths);

                qMonths.forEach((m) => {
                  const val = m === 0 ? (state.activeUsersToday * (state.adoptionCurve.startPct/100) * (state.utilizationCurve.values[0]/100)) : result.monthly[m-1].activeUsers;
                  const x = 40 + (m / state.contractTermMonths) * chartWidth;
                  const y = 100 - (val / maxVal) * chartHeight;
                  points.push([x, y]);
                });

                const pathData = points.reduce((acc, p, i) => i === 0 ? `M ${p[0]} ${p[1]}` : `${acc} L ${p[0]} ${p[1]}`, "");
                return (
                  <>
                    <Path d={pathData} fill="none" stroke={C.orange} strokeWidth="1.5" />
                    <Text x="40" y="112" style={{ fontSize: 8, fill: C.muted }}>Today</Text>
                    <Text x="440" y="112" style={{ fontSize: 8, fill: C.muted }}>Y{termYears}</Text>
                  </>
                );
              })()}
            </Svg>
          </View>
        </View>
        <PageFooter partnerName={partnerName} dateStr={dateStr} />
      </Page>

      {/* Page 5: Value Extrapolation */}
      <Page size="A4" style={s.page}>
        <View style={{ flex: 1 }}>
          <Text style={s.headline}>Value Extrapolation</Text>
          {state.valueDrivers.length === 0 ? (
            <View style={[s.placeholder, { marginTop: 20, padding: 32 }]}>
              <Text>No value drivers added — projection reflects pricing only. Add drivers on the Dashboard to see value extrapolation.</Text>
            </View>
          ) : (
            <>
              <View style={[s.tableHeader, { marginTop: 10 }]}>
                <Text style={[s.colLabel, { flex: 1 }]}>Driver</Text>
                <Text style={[s.colLabel, { width: 60, textAlign: "right" }]}>Meas Δ</Text>
                <Text style={[s.colLabel, { width: 60, textAlign: "right" }]}>Proj Δ</Text>
                <Text style={[s.colLabel, { width: 50, textAlign: "right" }]}>Conf</Text>
                <Text style={[s.colLabel, { width: 50, textAlign: "right" }]}>Real</Text>
                <Text style={[s.colLabel, { width: 60, textAlign: "right" }]}>Onset</Text>
                <Text style={[s.colLabel, { width: 45, textAlign: "right" }]}>Scal</Text>
              </View>
              {state.valueDrivers.map(d => (
                <View key={d.id} style={s.tableRow}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", flex: 1 }}>{d.label}</Text>
                  <Text style={{ fontSize: 8, width: 60, textAlign: "right" }}>{d.measuredDelta !== undefined ? `$${d.measuredDelta.toLocaleString()}` : "—"}</Text>
                  <Text style={{ fontSize: 8, width: 60, textAlign: "right" }}>${d.projectedDelta.toLocaleString()}</Text>
                  <Text style={{ fontSize: 8, width: 50, textAlign: "right", color: d.confidence > 75 ? C.green : d.confidence > 50 ? C.orange : C.muted }}>{d.confidence}%</Text>
                  <Text style={{ fontSize: 8, width: 50, textAlign: "right" }}>{d.realizationPct}%</Text>
                  <Text style={{ fontSize: 8, width: 60, textAlign: "right" }}>{ONSET_LABELS[d.onset]}</Text>
                  <Text style={{ fontSize: 8, width: 45, textAlign: "right" }}>{SCALING_LABELS[d.scalingUnit]}</Text>
                </View>
              ))}

              <Text style={s.subheader}>Domain totals over contract</Text>
              <View style={s.chartContainer}>
                <Svg width="480" height="130">
                  <Line x1="40" y1="100" x2="460" y2="100" stroke={C.border} strokeWidth="1" />
                  {(() => {
                    const chartWidth = 400;
                    const chartHeight = 90;
                    const maxYearValue = Math.max(...Object.values(domainTotalsByYear).map(y => y.capacity + y.revenue + y.workforce + y.quality), 1000);
                    
                    return Array.from({ length: termYears }).map((_, i) => {
                      const y = i + 1;
                      const data = domainTotalsByYear[y];
                      const x = 60 + i * (chartWidth / termYears);
                      const barWidth = 20;
                      
                      let currentY = 100;
                      return (['capacity', 'revenue', 'workforce', 'quality'] as ValueDomain[]).map(domain => {
                        const val = data[domain];
                        const h = (val / maxYearValue) * chartHeight;
                        const rect = <Rect key={`${y}-${domain}`} x={x} y={currentY - h} width={barWidth} height={h} fill={DOMAIN_FILLS[domain]} />;
                        currentY -= h;
                        return rect;
                      });
                    });
                  })()}
                  {Array.from({ length: termYears }).map((_, i) => (
                    <Text key={i} x={70 + i * (400 / termYears)} y="112" style={{ fontSize: 8, fill: C.muted }}>Y{i+1}</Text>
                  ))}
                </Svg>
                <View style={s.legend}>
                  {DOMAIN_LEGEND.map(item => (
                    <View key={item.label} style={s.legendItem}>
                      <View style={[s.swatch, { backgroundColor: item.color }]} />
                      <Text style={{ fontSize: 8, color: C.mid }}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>
        <PageFooter partnerName={partnerName} dateStr={dateStr} />
      </Page>

      {/* Page 6: Pricing Scenario Comparison */}
      <Page size="A4" style={s.page}>
        <View style={{ flex: 1 }}>
          <Text style={s.headline}>Pricing Scenario Comparison</Text>
          <View style={[s.tableHeader, { marginTop: 10 }]}>
            <Text style={[s.colLabel, { flex: 1 }]}>Plan</Text>
            <Text style={[s.colLabel, { width: 100 }]}>Model</Text>
            <Text style={[s.colLabel, { width: 100, textAlign: "right" }]}>Unit Price</Text>
            <Text style={[s.colLabel, { width: 90, textAlign: "right" }]}>Total Cost</Text>
            <Text style={[s.colLabel, { width: 70, textAlign: "right" }]}>Δ vs Cur</Text>
          </View>
          <View style={s.tableRow}>
            <Text style={{ fontSize: 9, fontWeight: "bold", flex: 1 }}>Current</Text>
            <Text style={{ fontSize: 8, width: 100 }}>{PRICING_MODEL_LABELS[state.currentPricing.model]}</Text>
            <Text style={{ fontSize: 8, width: 100, textAlign: "right" }}>{formatPricingModel(state.currentPricing)}</Text>
            <Text style={{ fontSize: 9, fontWeight: "bold", width: 90, textAlign: "right" }}>{fmtCurrencyShort(result.kpis.totalContractCost)}</Text>
            <Text style={{ fontSize: 8, width: 70, textAlign: "right" }}>—</Text>
          </View>
          {state.comparisonPricing.map(cmp => {
            const cmpResult = result.alternateKpis[cmp.id];
            const delta = cmpResult.totalContractCost - result.kpis.totalContractCost;
            return (
              <View key={cmp.id} style={s.tableRow}>
                <Text style={{ fontSize: 9, flex: 1 }}>{cmp.label}</Text>
                <Text style={{ fontSize: 8, width: 100 }}>{PRICING_MODEL_LABELS[cmp.pricing.model]}</Text>
                <Text style={{ fontSize: 8, width: 100, textAlign: "right" }}>{formatPricingModel(cmp.pricing)}</Text>
                <Text style={{ fontSize: 8, width: 90, textAlign: "right" }}>{fmtCurrencyShort(cmpResult.totalContractCost)}</Text>
                <Text style={{ fontSize: 8, width: 70, textAlign: "right", color: delta > 0 ? C.red : C.green }}>
                  {delta > 0 ? `+${fmtCurrencyShort(delta)}` : `-${fmtCurrencyShort(Math.abs(delta))}`}
                </Text>
              </View>
            );
          })}

          <View style={s.chartContainer}>
            <Svg width="480" height="160">
              <Line x1="40" y1="130" x2="460" y2="130" stroke={C.border} strokeWidth="1" />
              {(() => {
                const chartWidth = 420;
                const chartHeight = 110;
                const allPlans = [{ id: 'curr', costArr: result.monthly.map(r => r.cost), label: 'Current' }, ...state.comparisonPricing.map(c => ({ id: c.id, costArr: result.alternateMonthly[c.id].map(r => r.cost), label: c.label }))];
                
                const cumulativeCosts = allPlans.map(p => {
                  let sum = 0;
                  return p.costArr.map(c => sum += c);
                });
                const maxCumulative = Math.max(...cumulativeCosts.flat(), 1000);

                return allPlans.map((p, planIdx) => {
                  const costs = cumulativeCosts[planIdx];
                  const points: [number, number][] = [[40, 130]];
                  for (let m = 3; m <= state.contractTermMonths; m += 3) {
                    const x = 40 + (m / state.contractTermMonths) * chartWidth;
                    const y = 130 - (costs[m-1] / maxCumulative) * chartHeight;
                    points.push([x, y]);
                  }
                  const pathData = points.reduce((acc, pt, i) => i === 0 ? `M ${pt[0]} ${pt[1]}` : `${acc} L ${pt[0]} ${pt[1]}`, "");
                  const colors = [C.orange, C.dark, "#1E3A5F", "#D4930A", "#2D7377"];
                  const dashes = ["", "4 2", "8 4", "2 2", "4 4"];
                  return (
                    <Path key={p.id} d={pathData} fill="none" stroke={colors[planIdx % colors.length]} strokeWidth="1.5" strokeDasharray={dashes[planIdx % dashes.length]} />
                  );
                });
              })()}
            </Svg>
            <View style={s.legend}>
               <View style={s.legendItem}><View style={[s.swatch, { backgroundColor: C.orange }]} /><Text style={{ fontSize: 8 }}>Current</Text></View>
               {state.comparisonPricing.map((cmp, i) => {
                 const colors = [C.dark, "#1E3A5F", "#D4930A", "#2D7377"];
                 return (
                   <View key={cmp.id} style={s.legendItem}>
                     <View style={[s.swatch, { backgroundColor: colors[i % colors.length] }]} />
                     <Text style={{ fontSize: 8 }}>{cmp.label}</Text>
                   </View>
                 );
               })}
            </View>
          </View>

          {(() => {
            const savings = state.comparisonPricing
              .map(c => ({ label: c.label, savings: result.kpis.totalContractCost - result.alternateKpis[c.id].totalContractCost }))
              .filter(c => c.savings > 0)
              .sort((a, b) => b.savings - a.savings);

            return (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 10, color: C.mid, lineHeight: 1.6 }}>
                  <Text style={s.bold}>Why this matters: </Text>
                  {savings.length > 0 
                    ? `Switching to ${savings[0].label} would save ${fmtCurrency(savings[0].savings)} over the contract term. Optimization of pricing models ensures that encounter-mode or hybrid pricing decouples cost from headcount as your program scales.`
                    : "Your current pricing remains the lowest-cost option among configured comparisons."}
                </Text>
              </View>
            );
          })()}
        </View>
        <PageFooter partnerName={partnerName} dateStr={dateStr} />
      </Page>

      {/* Page 7: Encounter Runway (Conditional) */}
      {hasEncounterPricing && (
        <Page size="A4" style={s.page}>
          <View style={{ flex: 1 }}>
            <Text style={s.headline}>Encounter Runway</Text>
            <View style={s.chartContainer}>
              <Svg width="480" height="160">
                <Line x1="40" y1="130" x2="460" y2="130" stroke={C.border} strokeWidth="1" />
                {(() => {
                  const chartWidth = 420;
                  const chartHeight = 110;
                  const limit = state.currentPricing.contractEncounterLimit || 0;
                  const ceiling = state.currentPricing.capacityCeiling || 0;
                  const maxVal = Math.max(result.monthly[result.monthly.length-1].cumulativeEncounters, limit, ceiling, 100);
                  
                  const points: [number, number][] = [[40, 130]];
                  result.monthly.forEach((r, i) => {
                    if ((i + 1) % 3 === 0 || i === result.monthly.length - 1) {
                      const x = 40 + ((i + 1) / state.contractTermMonths) * chartWidth;
                      const y = 130 - (r.cumulativeEncounters / maxVal) * chartHeight;
                      points.push([x, y]);
                    }
                  });
                  const pathData = points.reduce((acc, p, i) => i === 0 ? `M ${p[0]} ${p[1]}` : `${acc} L ${p[0]} ${p[1]}`, "");
                  
                  return (
                    <>
                      <Path d={pathData} fill="none" stroke={C.orange} strokeWidth="2" />
                      {limit > 0 && (
                        <View>
                          <Line x1="40" y1={130 - (limit/maxVal)*chartHeight} x2="460" y2={130 - (limit/maxVal)*chartHeight} stroke={C.dark} strokeWidth="1" strokeDasharray="4 2" />
                          <Text x="400" y={120 - (limit/maxVal)*chartHeight} style={{ fontSize: 7, fill: C.dark }}>Contract Limit</Text>
                        </View>
                      )}
                      {ceiling > 0 && (
                         <View>
                           <Line x1="40" y1={130 - (ceiling/maxVal)*chartHeight} x2="460" y2={130 - (ceiling/maxVal)*chartHeight} stroke={C.muted} strokeWidth="1" strokeDasharray="1 2" />
                           <Text x="400" y={120 - (ceiling/maxVal)*chartHeight} style={{ fontSize: 7, fill: C.muted }}>Capacity Ceiling</Text>
                         </View>
                      )}
                      {result.kpis.runwayMonth && (
                        <Line x1={40 + (result.kpis.runwayMonth / state.contractTermMonths) * chartWidth} y1="20" x2={40 + (result.kpis.runwayMonth / state.contractTermMonths) * chartWidth} y2="130" stroke={C.red} strokeWidth="0.5" />
                      )}
                    </>
                  );
                })()}
              </Svg>
            </View>

            <View style={s.callout}>
              <Text style={{ fontSize: 10, marginBottom: 4 }}>Runway: <Text style={s.bold}>{result.kpis.runwayMonth ? `Month ${result.kpis.runwayMonth}` : 'Not hit within term'}</Text></Text>
              <Text style={{ fontSize: 10, marginBottom: 4 }}>Capacity breach: <Text style={s.bold}>{result.kpis.capacityBreachMonth ? `Month ${result.kpis.capacityBreachMonth}` : 'Not breached'}</Text></Text>
              <Text style={{ fontSize: 10 }}>Projected overage: <Text style={s.bold}>{fmtCurrency(result.kpis.projectedOverage)}</Text></Text>
            </View>

            <Text style={s.subheader}>Projected monthly encounters</Text>
            <View style={s.tableHeader}>
               <Text style={[s.colLabel, { width: 60 }]}>Month</Text>
               <Text style={[s.colLabel, { width: 100, textAlign: "right" }]}>Active Users</Text>
               <Text style={[s.colLabel, { flex: 1, textAlign: "right" }]}>Monthly Encounters</Text>
               <Text style={[s.colLabel, { width: 120, textAlign: "right" }]}>Cumulative</Text>
            </View>
            {[6, 12, 18, 24].filter(m => m <= state.contractTermMonths).map(m => {
              const row = result.monthly[m-1];
              return (
                <View key={m} style={s.tableRow}>
                  <Text style={{ fontSize: 9, width: 60 }}>Month {m}</Text>
                  <Text style={{ fontSize: 9, width: 100, textAlign: "right" }}>{Math.round(row.activeUsers).toLocaleString()}</Text>
                  <Text style={{ fontSize: 9, flex: 1, textAlign: "right" }}>{Math.round(row.monthlyAbridgeEncounters).toLocaleString()}</Text>
                  <Text style={{ fontSize: 9, width: 120, textAlign: "right" }}>{Math.round(row.cumulativeEncounters).toLocaleString()}</Text>
                </View>
              );
            })}
          </View>
          <PageFooter partnerName={partnerName} dateStr={dateStr} />
        </Page>
      )}

      {/* Page 8: Recommendations */}
      <Page size="A4" style={s.page}>
        <View style={{ flex: 1 }}>
          <Text style={s.headline}>Recommendations</Text>
          <View style={{ marginTop: 10 }}>
            {(() => {
              const bullets: string[] = [];
              result.alerts.forEach(a => { if (!bullets.includes(a.message)) bullets.push(a.message); });
              
              if (result.kpis.runwayMonth && result.kpis.runwayMonth < state.contractTermMonths) {
                bullets.push(`Plan to renegotiate encounter limit in Month ${Math.max(1, result.kpis.runwayMonth - 3)} (3 months before runway).`);
              }
              
              state.comparisonPricing.forEach(cmp => {
                const savings = result.kpis.totalContractCost - result.alternateKpis[cmp.id].totalContractCost;
                if (savings > result.kpis.totalContractCost * 0.1) {
                  bullets.push(`Consider switching to ${cmp.label} for ${fmtCurrencyShort(savings)} savings over the term.`);
                }
              });

              state.valueDrivers.forEach(d => {
                if (d.confidence < 70 || d.realizationPct < 70) {
                  bullets.push(`Improve adoption playbook for ${d.label} to push break-even earlier — currently capped by ${d.confidence < 70 ? 'low confidence' : 'low realization'}.`);
                }
                if (d.onset === 'longTerm') {
                  bullets.push(`${d.label} won't materialize until late in the term — consider an interim leading indicator.`);
                }
              });

              if (bullets.length < 3) {
                bullets.push(`Run another EBR after Month ${Math.min(12, Math.floor(state.contractTermMonths / 2))} to reconcile projection vs measured.`);
              }

              return bullets.slice(0, 6).map((b, i) => (
                <View key={i} style={s.bulletRow}>
                  <View style={s.bullet} />
                  <Text style={{ fontSize: 10, color: C.mid, lineHeight: 1.5, flex: 1 }}>{b}</Text>
                </View>
              ));
            })()}
          </View>
        </View>
        <PageFooter partnerName={partnerName} dateStr={dateStr} />
      </Page>

      {/* Page 9: Methodology & Assumptions */}
      <Page size="A4" style={s.page}>
        <View style={{ flex: 1 }}>
          <Text style={s.headline}>Methodology & Assumptions</Text>
          
          <Text style={[s.subheader, { marginTop: 14 }]}>Confidence labels</Text>
          <View style={{ borderTopWidth: 1, borderTopColor: C.border }}>
            {[
              { label: "0-50%", def: "Benchmark estimate (no measured signal yet)" },
              { label: "51-75%", def: "Directional estimate (signal observed)" },
              { label: "76-90%", def: "Based on measured outcomes" },
              { label: "91-100%", def: "Financially documented" }
            ].map((row, i) => (
              <View key={i} style={[s.tableRow, { paddingVertical: 5 }]}>
                <Text style={{ width: 80, fontSize: 9, fontWeight: "bold" }}>{row.label}</Text>
                <Text style={{ flex: 1, fontSize: 9, color: C.mid }}>{row.def}</Text>
              </View>
            ))}
          </View>

          <Text style={s.subheader}>Onset definitions</Text>
          <View style={{ borderTopWidth: 1, borderTopColor: C.border }}>
            {[
              { label: "Immediate", def: `Starts in Month ${ONSET_DELAY_MONTHS.immediate}` },
              { label: "Delayed", def: `Starts in Month ${ONSET_DELAY_MONTHS.delayed}` },
              { label: "Phased", def: `Starts in Month ${ONSET_DELAY_MONTHS.phased}` },
              { label: "Long-term", def: `Starts in Month ${ONSET_DELAY_MONTHS.longTerm}` }
            ].map((row, i) => (
              <View key={i} style={[s.tableRow, { paddingVertical: 5 }]}>
                <Text style={{ width: 80, fontSize: 9, fontWeight: "bold" }}>{row.label}</Text>
                <Text style={{ flex: 1, fontSize: 9, color: C.mid }}>{row.def}</Text>
              </View>
            ))}
            <Text style={{ fontSize: 8, color: C.muted, marginTop: 4, fontStyle: "italic" }}>Once started, drivers ramp linearly over 3 months to full value.</Text>
          </View>

          <Text style={s.subheader}>Data provenance</Text>
          <View style={{ borderTopWidth: 1, borderTopColor: C.border }}>
            <View style={[s.tableRow, { paddingVertical: 5 }]}>
              <View style={{ backgroundColor: C.orange, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 2, marginRight: 8 }}>
                <Text style={{ fontSize: 7, color: "#FFF", fontWeight: "bold" }}>FROM MEASURE</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 9, color: C.mid }}>Hydrated from a Measure session</Text>
            </View>
            <View style={[s.tableRow, { paddingVertical: 5 }]}>
              <View style={{ backgroundColor: C.dark, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 2, marginRight: 8 }}>
                <Text style={{ fontSize: 7, color: "#FFF", fontWeight: "bold" }}>USER INPUT</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 9, color: C.mid }}>Entered manually on Forecast screens</Text>
            </View>
            <View style={[s.tableRow, { paddingVertical: 5 }]}>
              <View style={{ backgroundColor: C.muted, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 2, marginRight: 8 }}>
                <Text style={{ fontSize: 7, color: "#FFF", fontWeight: "bold" }}>BENCHMARK</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 9, color: C.mid }}>Filled from AMC reference where partner data wasn't supplied</Text>
            </View>
          </View>
          
          <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 }}>
            <Text style={{ fontSize: 9, color: C.mid }}>
              <Text style={s.bold}>Growth Source: </Text>
              {state.growthSource === 'benchmark' 
                ? "Used AMC benchmark of 4% MoM as growth proxy." 
                : "Used partner-provided historical MoM growth (last 6 months averaged)."}
            </Text>
          </View>
        </View>
        <PageFooter partnerName={partnerName} dateStr={dateStr} />
      </Page>
    </Document>
  );
}

export async function generateForecastPDF(state: ForecastState): Promise<void> {
  const result = calculateForecast(state);
  const partnerName = state.partnerName?.trim() || "Untitled Partner";
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${partnerName.replace(/\s+/g, "-")}-forecast-${dateStr}.pdf`;
  const doc = <ForecastPDF state={state} result={result} partnerName={partnerName} dateStr={dateStr} />;
  const blob = await pdf(doc).toBlob();
  await savePdfBlob(blob, filename);
}
