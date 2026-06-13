import { Document, Page, Text, View, StyleSheet, Svg, Rect, Line, Path, pdf, Font } from "@react-pdf/renderer";
import { format } from "date-fns";
import { savePdfBlob } from "@/lib/pdf-save";
import { PDFCoverPage } from "@/components/pdf/PDFCoverPage";
import manropeRegular from "../../assets/fonts/manrope-regular.ttf";
import manropeBold from "../../assets/fonts/manrope-bold.ttf";
import type { ForecastState, ForecastValueDriver, ValueDomain, DriverOnset, PricingModel, ForecastCalibration } from "@/pages/forecast/types";
import { CARE_SETTING_LABELS, VALUE_DOMAIN_LABELS, ONSET_DELAY_MONTHS, PRICING_MODEL_LABELS, DEFAULT_FORECAST_CALIBRATION } from "@/pages/forecast/types";
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
  if (abs >= 10_000) {
    const k = Math.round(abs / 1_000);
    if (k >= 1000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    return `${sign}$${k}K`;
  }
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

type NarrativePart = { text: string; bold?: boolean };

function executiveNarrative(state: ForecastState, result: ForecastResult, partnerName: string) {
  const termMonths = state.contractTermMonths;
  const termYears = Math.max(1, Math.round(termMonths / 12));
  const roi = result.kpis.roiMultiple;
  const tcv = result.kpis.totalContractValue;
  const ncv = result.kpis.netContractValue;
  const cost = result.kpis.totalContractCost;
  const fullBE = result.kpis.fullBreakEvenMonth;
  const fromMeasure = state.importSource.type === 'measure';

  const p1: NarrativePart[] = [];
  if (cost <= 0) {
    // No pricing entered yet — ROI is undefined, so don't claim "no positive ROI".
    p1.push(
      { text: partnerName, bold: true },
      { text: " has " },
      { text: fmtCurrencyShort(tcv), bold: true },
      { text: " in modeled value. Enter pricing to see ROI, net value, and break-even." },
    );
  } else if (roi >= 3) {
    p1.push(
      { text: partnerName, bold: true },
      { text: " is projecting a " },
      { text: `${roi.toFixed(1)}x return`, bold: true },
      { text: " — " },
      { text: fmtCurrencyShort(tcv), bold: true },
      { text: " in modeled value against " },
      { text: fmtCurrencyShort(cost), bold: true },
      { text: ` invested over ${termYears} years.` },
    );
    if (fromMeasure) p1.push({ text: " Built on measured clinical outcomes, not estimates." });
  } else if (roi >= 1.5) {
    p1.push(
      { text: partnerName, bold: true },
      { text: " is on track to generate " },
      { text: fmtCurrencyShort(ncv), bold: true },
      { text: " in net value — a " },
      { text: `${roi.toFixed(1)}x return`, bold: true },
      { text: ` on their Abridge investment over ${termYears} years.` },
    );
  } else if (roi >= 1) {
    p1.push(
      { text: partnerName, bold: true },
      { text: " reaches positive ROI but the margin is thin at " },
      { text: `${roi.toFixed(2)}x`, bold: true },
      { text: ". The sections below identify the levers to strengthen the case." },
    );
  } else {
    p1.push(
      { text: "Under current assumptions, " },
      { text: partnerName, bold: true },
      { text: ` does not reach positive ROI within the ${termYears}-year term. Adjusting adoption pace or pricing model significantly changes this picture.` },
    );
  }

  const p2: NarrativePart[] = [];
  if (fullBE) {
    const remaining = Math.max(0, termMonths - fullBE);
    p2.push(
      { text: partnerName, bold: true },
      { text: " recovers their full investment at " },
      { text: `Month ${fullBE}`, bold: true },
      { text: ", leaving " },
      { text: `${remaining} months`, bold: true },
      { text: " of value creation before contract end." },
    );
  } else {
    p2.push({ text: `Break-even does not occur within the ${termYears}-year term under current assumptions.` });
  }

  const drivers = state.valueDrivers;
  const hasRevenue = drivers.some(d => d.domain === 'revenue');
  const hasWorkforce = drivers.some(d => d.domain === 'workforce');
  const p3: NarrativePart[] = [];
  if (drivers.length === 0) {
    p3.push({ text: "Add value drivers to unlock the full ROI picture." });
  } else if (roi < 2 && !hasRevenue) {
    p3.push(
      { text: "Adding a revenue driver — " },
      { text: "wRVU lift, E/M level improvement, or denial reduction", bold: true },
      { text: " — would meaningfully strengthen the ROI multiple." },
    );
  } else if (roi < 2 && !hasWorkforce) {
    p3.push(
      { text: "A " },
      { text: "provider retention driver", bold: true },
      { text: " would add significant long-term value. Replacement costs of " },
      { text: "$150K–$300K", bold: true },
      { text: " per departure make even small retention gains financially meaningful." },
    );
  } else if (roi >= 2) {
    p3.push(
      { text: "The ROI story is compelling. Focus the conversation on whether the current " },
      { text: "pricing structure", bold: true },
      { text: " captures value fairly as " },
      { text: partnerName, bold: true },
      { text: " scales." },
    );
  } else {
    p3.push({ text: "Diversifying across additional value domains would further de-risk the projection." });
  }

  const renderPara = (parts: NarrativePart[], idx: number) => (
    <Text key={idx} style={[{ fontSize: 10, color: C.mid, lineHeight: 1.65 }, idx === 0 ? { marginTop: 16 } : { marginTop: 10 }]}>
      {parts.map((p, i) => (
        <Text key={i} style={p.bold ? s.bold : {}}>{p.text}</Text>
      ))}
    </Text>
  );

  return (
    <View>
      {renderPara(p1, 0)}
      {renderPara(p2, 1)}
      {renderPara(p3, 2)}
    </View>
  );
}

function provenanceCallout(state: ForecastState) {
  const fromMeasure = state.importSource.type === 'measure';
  if (fromMeasure) {
    const measuredCount = state.valueDrivers.filter(d => d.source === 'measure').length;
    const importedAt = state.importSource.importedAt;
    const monthYear = importedAt ? format(new Date(importedAt), 'MMM yyyy') : '—';
    return (
      <View style={{ marginTop: 14, borderWidth: 1, borderColor: C.orange, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 10 }}>
        <Text style={{ fontSize: 8, color: C.orange, fontWeight: 'bold', letterSpacing: 1 }}>
          SOURCED FROM MEASURE · {measuredCount} measured outcome{measuredCount === 1 ? '' : 's'} imported · {monthYear}
        </Text>
      </View>
    );
  }
  return (
    <View style={{ marginTop: 14, borderWidth: 1, borderColor: C.muted, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 10 }}>
      <Text style={{ fontSize: 8, color: C.muted, fontWeight: 'bold', letterSpacing: 1 }}>
        EXPLORATORY MODEL · assumptions entered manually — no measured outcomes yet
      </Text>
    </View>
  );
}

function calibrationRatesTable(cal: ForecastCalibration | undefined) {
  const c = cal ?? DEFAULT_FORECAST_CALIBRATION;
  const rows: [string, string][] = [
    ['OT Hourly Rate', `$${c.otHourlyRate}/hr`],
    ['wRVU Conversion', `$${c.wrvuConversionFactor}/wRVU`],
    ['Revenue Per Visit', `$${c.revenuePerVisit}/visit`],
    ['Avg Visit Length', `${c.minutesPerVisit} min`],
  ];
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={s.smallLabel}>Calibration rates used</Text>
      {rows.map(([k, v], i) => (
        <View key={i} style={{ flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Text style={{ flex: 1, fontSize: 8, color: C.mid }}>{k}</Text>
          <Text style={{ width: 120, fontSize: 8, textAlign: 'right' }}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

function driverCalcChain(d: ForecastValueDriver, cal: ForecastCalibration) {
  const ci = d.clinicalInputs;
  if (!ci || !ci.formulaType) return null;
  const before = ci.metricBefore ?? 0;
  const after = ci.metricAfter ?? 0;
  const alloc = ci.allocationPct ?? 100;
  const projDelta = d.projectedDelta;
  let lines: string[] | null = null;

  switch (ci.formulaType) {
    case 'timeSavingsWorkforce': {
      const delta = before - after;
      const hrs = (delta / 60).toFixed(2);
      lines = [
        `${before} min/enc \u2192 ${after} min/enc = ${delta.toFixed(1)} min saved`,
        `\u00f7 60 = ${hrs} hrs \u00d7 $${cal.otHourlyRate}/hr \u00d7 ${alloc}% allocation`,
        `= ${fmtCurrencyShort(projDelta)}/encounter`,
      ];
      break;
    }
    case 'wrvuLift': {
      const delta = (after - before).toFixed(2);
      lines = [
        `${before} \u2192 ${after} wRVU/enc = +${delta} wRVU delta`,
        `\u00d7 $${cal.wrvuConversionFactor}/wRVU`,
        `= ${fmtCurrencyShort(projDelta)}/encounter`,
      ];
      break;
    }
    case 'emLevelLift': {
      const delta = (after - before).toFixed(2);
      const f1 = ci.factor1Value ?? 0;
      lines = [
        `Avg E/M level: ${before} \u2192 ${after} = +${delta} level improvement`,
        `\u00d7 $${f1}/level`,
        `= ${fmtCurrencyShort(projDelta)}/encounter`,
      ];
      break;
    }
    case 'denialReduction': {
      const delta = (before - after).toFixed(1);
      lines = [
        `Initial denial rate: ${before}% \u2192 ${after}% = ${delta}pp reduction`,
        `\u00d7 $${cal.avgClaimValue} avg claim value`,
        `= ${fmtCurrencyShort(projDelta)} recovered per encounter`,
      ];
      break;
    }
    default:
      return null;
  }

  return (
    <View key={`chain-${d.id}`} style={{ backgroundColor: '#FAFAFA', borderLeftWidth: 2, borderLeftColor: C.orange, padding: 8, marginBottom: 6 }}>
      <Text style={{ fontSize: 8, color: C.orange, fontWeight: 'bold', marginBottom: 4 }}>
        {d.label.toUpperCase()} · HOW WE GOT HERE
      </Text>
      {lines.map((ln, i) => (
        <Text key={i} style={{ fontSize: 8, fontFamily: 'Courier', color: C.dark, lineHeight: 1.4 }}>{ln}</Text>
      ))}
    </View>
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
              <Text style={s.largeValue}>{result.kpis.totalContractCost > 0 ? `${result.kpis.roiMultiple.toFixed(2)}x` : "—"}</Text>
            </View>
            <View style={s.gridCell}>
              <Text style={s.smallLabel}>Break-Even</Text>
              <Text style={s.largeValue}>{breakEvenLabel(result.kpis.fullBreakEvenMonth)}</Text>
            </View>
            <View style={s.gridCell}>
              <Text style={s.smallLabel}>Break-Even (excl. long-term)</Text>
              <Text style={s.largeValue}>{breakEvenLabel(result.kpis.fastBreakEvenMonth)}</Text>
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

          {executiveNarrative(state, result, partnerName)}
          {provenanceCallout(state)}
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
                <Text style={[s.colLabel, { width: 80, textAlign: "right" }]}>Before → After</Text>
                <Text style={[s.colLabel, { width: 70, textAlign: "right" }]}>Clinical Unit</Text>
                <Text style={[s.colLabel, { width: 60, textAlign: "right" }]}>$/Unit</Text>
                <Text style={[s.colLabel, { width: 60, textAlign: "right" }]}>Conf</Text>
                <Text style={[s.colLabel, { width: 50, textAlign: "right" }]}>Real</Text>
              </View>
              {state.valueDrivers.map(d => {
                const ci = d.clinicalInputs;
                const beforeAfter = (ci?.metricBefore !== undefined && ci?.metricAfter !== undefined)
                  ? `${ci.metricBefore.toFixed(1)} \u2192 ${ci.metricAfter.toFixed(1)}`
                  : "—";
                const unit = ci?.metricUnit ?? "—";
                return (
                  <View key={d.id} style={s.tableRow}>
                    <Text style={{ fontSize: 9, fontWeight: "bold", flex: 1 }}>{d.label}</Text>
                    <Text style={{ fontSize: 8, width: 80, textAlign: "right" }}>{beforeAfter}</Text>
                    <Text style={{ fontSize: 8, width: 70, textAlign: "right", color: C.mid }}>{unit}</Text>
                    <Text style={{ fontSize: 8, width: 60, textAlign: "right" }}>{fmtCurrencyShort(d.projectedDelta)}</Text>
                    <Text style={{ fontSize: 8, width: 60, textAlign: "right", color: d.confidence > 75 ? C.green : d.confidence > 50 ? C.orange : C.muted }}>{d.confidence}%</Text>
                    <Text style={{ fontSize: 8, width: 50, textAlign: "right" }}>{d.realizationPct}%</Text>
                  </View>
                );
              })}
            </View>
          )}

          {calibrationRatesTable(state.calibration)}
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
                  // "Today" anchor is the actual current active-user count — not
                  // deflated by future adoption/utilization ramp params (which
                  // are forward-looking and caused a kink at the chart origin).
                  const val = m === 0 ? state.activeUsersToday : result.monthly[m-1].activeUsers;
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

              <View style={{ marginTop: 12 }}>
                {state.valueDrivers
                  .filter(d => {
                    const ft = d.clinicalInputs?.formulaType;
                    return ft === 'timeSavingsWorkforce' || ft === 'wrvuLift' || ft === 'emLevelLift' || ft === 'denialReduction';
                  })
                  .slice(0, 3)
                  .map(d => driverCalcChain(d, state.calibration ?? DEFAULT_FORECAST_CALIBRATION))}
              </View>

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
              const drivers = state.valueDrivers;
              const hasRevenue = drivers.some(d => d.domain === 'revenue');
              const hasWorkforce = drivers.some(d => d.domain === 'workforce');
              const roi = result.kpis.roiMultiple;
              const termMonths = state.contractTermMonths;

              // 1. Top lever recommendation
              if (drivers.length === 0) {
                bullets.push("Add value drivers to unlock the full ROI picture — start with the highest-confidence measured outcomes.");
              } else if (roi < 2 && !hasRevenue) {
                bullets.push(`To strengthen ROI beyond ${roi.toFixed(1)}x, add a revenue value driver — wRVU lift, E/M level improvement, or denial reduction.`);
              } else if (roi < 2 && !hasWorkforce) {
                bullets.push(`To strengthen ROI beyond ${roi.toFixed(1)}x, add a provider retention driver. Replacement costs of $150K–$300K make even small retention gains material.`);
              } else if (roi >= 2) {
                bullets.push(`At ${roi.toFixed(1)}x ROI the story is compelling. Focus the conversation on whether the current pricing structure captures value fairly as ${partnerName} scales.`);
              } else {
                bullets.push("Diversify across additional value domains to de-risk the projection.");
              }

              // 2. Pricing opportunity (>5% net value lift)
              const baseNet = result.kpis.netContractValue;
              const altCandidates = state.comparisonPricing
                .map(cmp => {
                  const alt = result.alternateKpis[cmp.id];
                  if (!alt) return null;
                  const lift = alt.netContractValue - baseNet;
                  return { cmp, alt, lift };
                })
                .filter((x): x is { cmp: typeof state.comparisonPricing[number]; alt: typeof result.kpis; lift: number } =>
                  x !== null && x.lift > 0 && x.lift > Math.abs(baseNet) * 0.05,
                )
                .sort((a, b) => b.lift - a.lift);
              const bestAlt = altCandidates[0];
              if (bestAlt) {
                const conversationMonth = Math.max(1, termMonths - 3);
                bullets.push(`Model a switch to ${bestAlt.cmp.label} — it generates ${fmtCurrencyShort(bestAlt.lift)} more in net value over the term. Schedule the pricing conversation before Month ${conversationMonth}.`);
              }

              // 3. Adoption opportunity (encounter share growth >0.1, i.e. 10pp)
              const shareVals = state.encounterShareCurve.values;
              if (shareVals.length > 1) {
                const initial = shareVals[0];
                const final = shareVals[shareVals.length - 1];
                if (final - initial > 10) {
                  bullets.push(`Expanding encounter coverage from ${initial.toFixed(0)}% to ${final.toFixed(0)}% is a key growth lever. Set a quarterly milestone and track against it.`);
                }
              }

              // 4. Up to 2 system alerts
              const seen = new Set(bullets);
              let alertsAdded = 0;
              for (const a of result.alerts) {
                if (alertsAdded >= 2) break;
                if (seen.has(a.message)) continue;
                bullets.push(a.message);
                seen.add(a.message);
                alertsAdded++;
              }

              // 5. Closing EBR action (always last)
              const ebrMonth = Math.min(12, Math.max(1, Math.floor(termMonths / 2)));
              bullets.push(`Schedule an EBR at Month ${ebrMonth} to reconcile projection against actual measured outcomes.`);

              return bullets.map((b, i) => (
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
