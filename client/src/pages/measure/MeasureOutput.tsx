import { useMemo, useState } from "react";
import { Download, ArrowLeft, Loader2, FileText, TrendingUp, ChevronDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  EXPLORE_DRIVERS,
  type ExploreSetting,
  type ExploreQuadrant,
} from "@/lib/exploreDrivers";
import { SETTING_LABELS } from "@/lib/forecastDefaults";
import {
  type MeasurePDFData,
  type MeasurePDFDriver,
  type MeasurePDFQuadrantSection,
} from "@/components/measure/MeasurePDFExport";
import { generateMeasureNarrativePDF } from "@/components/measure/MeasureNarrativePDF";
import { type MeasureState, type MeasureDriverEntry } from "@/lib/measureCalculator";
import { useToast } from "@/hooks/use-toast";

interface MeasureOutputProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

const QUADRANT_ORDER: ExploreQuadrant[] = ["Capacity", "Workforce", "Revenue", "Quality"];

const QUADRANT_COLORS: Record<string, string> = {
  Capacity: '#2563EB',
  Workforce: '#7C3AED',
  Revenue: '#EA2C00',
  Quality: '#059669',
};

const QUADRANT_TAGLINES: Record<string, string> = {
  Capacity: 'Time reclaimed — and what it became',
  Workforce: 'The retention story, in the provider\'s own numbers',
  Revenue: 'Documentation accuracy showing up in the bill',
  Quality: 'Clinical signals building the long-term case',
};

const SETTING_BADGE: Record<string, string> = { outpatient: 'OP', ed: 'ED', inpatient: 'IP', nursing: 'Nsg' };

// ─── Sparkline (SVG, no recharts needed) ───────────────────────────────────────
function Sparkline({ values, lowerIsBetter, id }: { values: number[]; lowerIsBetter?: boolean; id: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range === 0) return null;

  const W = 72, H = 28, pad = 3;
  const pts = values.map((v, i) => [
    pad + (i / (values.length - 1)) * (W - pad * 2),
    pad + ((max - v) / range) * (H - pad * 2),
  ] as [number, number]);

  const linePath = `M ${pts.map(([x, y]) => `${x},${y}`).join(' L ')}`;
  const areaPath = `${linePath} L ${pts[pts.length - 1][0]},${H - pad} L ${pts[0][0]},${H - pad} Z`;

  const improved = lowerIsBetter
    ? values[values.length - 1] < values[0]
    : values[values.length - 1] > values[0];
  const color = improved ? '#059669' : '#EF4444';
  const gid = `sg-${id.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg width={W} height={H} className="overflow-visible flex-shrink-0" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gid})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
    </svg>
  );
}

// ─── Build driver payload ──────────────────────────────────────────────────────
function buildDriverPayload(
  driver: (typeof EXPLORE_DRIVERS)[number],
  entry: MeasureDriverEntry,
): MeasurePDFDriver {
  const md = driver.measureDefaults;
  const sortedMonthly = [...(entry.monthlyData || [])].sort((a, b) => a.month.localeCompare(b.month));
  const latest = sortedMonthly[sortedMonthly.length - 1];
  const effWith = entry.isMonthlyMode && latest ? latest.withAbridge : entry.withAbridge;
  const effWithout = entry.isMonthlyMode && latest ? latest.withoutAbridge : entry.withoutAbridge;
  const delta = entry.lowerIsBetter ? effWithout - effWith : effWith - effWithout;
  const isQuantifiable = driver.visibility === "quantified" && Boolean(md);
  const scale = (entry.scaleDivisor && entry.scaleDivisor > 0 && entry.scaleValue !== undefined)
    ? entry.scaleValue / entry.scaleDivisor
    : 1;
  const realizedValue = isQuantifiable
    ? Math.round(delta * entry.valuePerUnit * scale * (entry.attributionPercent / 100))
    : 0;

  return {
    id: driver.id,
    label: driver.label,
    shortDescription: driver.shortDescription,
    visibility: driver.visibility,
    isMonthlyMode: Boolean(entry.isMonthlyMode),
    withoutAbridge: effWithout,
    withAbridge: effWith,
    delta,
    valuePerUnit: entry.valuePerUnit,
    attributionPercent: entry.attributionPercent,
    realizationPercent: entry.realizationPercent,
    realizedValue,
    notes: entry.notes,
    monthlyData: sortedMonthly.length > 0 ? sortedMonthly : undefined,
    deltaUnit: md?.deltaUnit,
    deltaLabel: md?.deltaLabel,
    valuePerUnitLabel: md?.valuePerUnitLabel,
    valuePerUnitPrefix: md?.valuePerUnitPrefix,
  };
}

// ─── Financial driver card ─────────────────────────────────────────────────────
function FinancialDriverCard({
  drv,
  settingBadges,
  lowerIsBetter,
}: {
  drv: MeasurePDFDriver;
  settingBadges: string[];
  lowerIsBetter?: boolean;
}) {
  const hasData = drv.withoutAbridge !== 0 || drv.withAbridge !== 0;
  const positiveOutcome = drv.delta >= 0;
  const sparkValues = drv.monthlyData?.map(m => m.withAbridge);

  return (
    <div className="bg-white rounded-xl border border-[#E8E8E8] overflow-hidden">
      {/* Card top */}
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-semibold text-[15px] text-black leading-snug">{drv.label}</p>
            {settingBadges.map(s => (
              <span key={s} className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#F0EBE4] text-[9px] font-bold text-[#8C7E6E] uppercase tracking-wide">
                {SETTING_BADGE[s] ?? s}
              </span>
            ))}
          </div>
          <p className="text-xs text-[#999999] leading-relaxed">{drv.shortDescription}</p>
        </div>
        {drv.realizedValue !== 0 && (
          <div className="text-right flex-shrink-0">
            <p className="text-xl font-bold text-[#EA2C00] tabular-nums leading-none">
              {'$' + Math.round(drv.realizedValue).toLocaleString()}
            </p>
            <p className="text-[10px] text-[#AAAAAA] mt-0.5">realized / yr</p>
          </div>
        )}
      </div>

      {/* Before → After data row */}
      {hasData && drv.deltaUnit && (
        <div className="mx-5 mb-4">
          <div className="grid grid-cols-3 gap-0 bg-[#F7F7F5] rounded-xl overflow-hidden border border-[#EEEEEE]">
            <div className="text-center py-3 px-2">
              <p className="text-[10px] font-medium text-[#AAAAAA] uppercase tracking-wide mb-1">Before</p>
              <p className="text-base font-bold text-[#333333] tabular-nums">{drv.withoutAbridge.toLocaleString()}</p>
              <p className="text-[10px] text-[#BBBBBB] mt-0.5">{drv.deltaUnit}</p>
            </div>
            <div className="text-center py-3 px-2 border-x border-[#EEEEEE]">
              <p className="text-[10px] font-medium text-[#AAAAAA] uppercase tracking-wide mb-1">With Abridge</p>
              <p className="text-base font-bold text-[#333333] tabular-nums">{drv.withAbridge.toLocaleString()}</p>
              <p className="text-[10px] text-[#BBBBBB] mt-0.5">{drv.deltaUnit}</p>
            </div>
            <div className="text-center py-3 px-2">
              <p className="text-[10px] font-medium text-[#AAAAAA] uppercase tracking-wide mb-1">Change</p>
              <p className={`text-base font-bold tabular-nums ${positiveOutcome ? 'text-emerald-600' : 'text-red-500'}`}>
                {positiveOutcome ? '+' : ''}{drv.delta.toLocaleString()}
              </p>
              <p className="text-[10px] text-[#BBBBBB] mt-0.5">{drv.deltaUnit}</p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom: attribution + sparkline */}
      <div className="flex items-center justify-between px-5 pb-4 gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#F0EBE4] text-[10px] font-medium text-[#8C7E6E]">
            {drv.attributionPercent}% attributed to Abridge
          </span>
          {drv.realizationPercent !== undefined && drv.realizationPercent !== 100 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#F5F5F5] text-[10px] font-medium text-[#888888]">
              {drv.realizationPercent}% realization
            </span>
          )}
          {drv.isMonthlyMode && sparkValues && sparkValues.length >= 2 && (
            <span className="text-[10px] text-[#AAAAAA]">{sparkValues.length}-month trend</span>
          )}
        </div>
        {sparkValues && sparkValues.length >= 2 && (
          <Sparkline values={sparkValues} lowerIsBetter={lowerIsBetter} id={drv.id} />
        )}
      </div>

      {/* Notes */}
      {drv.notes && (
        <div className="mx-5 mb-4 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
          <MessageSquare className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">{drv.notes}</p>
        </div>
      )}
    </div>
  );
}

// ─── Signal driver row ─────────────────────────────────────────────────────────
function SignalDriverRow({
  drv,
  settingBadges,
  lowerIsBetter,
}: {
  drv: MeasurePDFDriver;
  settingBadges: string[];
  lowerIsBetter?: boolean;
}) {
  const hasData = drv.withoutAbridge !== 0 || drv.withAbridge !== 0;
  const sparkValues = drv.monthlyData?.map(m => m.withAbridge);
  const delta = lowerIsBetter ? drv.withoutAbridge - drv.withAbridge : drv.withAbridge - drv.withoutAbridge;
  const improved = delta > 0;

  return (
    <div className="flex items-center gap-3 py-3 px-4 rounded-xl border border-[#EEEEEE] bg-white">
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#CCCCCC' }} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-[#1A1A1A]">{drv.label}</p>
          {settingBadges.map(s => (
            <span key={s} className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#F0EBE4] text-[9px] font-bold text-[#8C7E6E] uppercase tracking-wide">
              {SETTING_BADGE[s] ?? s}
            </span>
          ))}
          {hasData && drv.deltaUnit && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums ${
              improved ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>
              {improved ? '↑' : '↓'}
              {' '}{drv.withoutAbridge.toLocaleString()} → {drv.withAbridge.toLocaleString()} {drv.deltaUnit}
            </span>
          )}
          {!hasData && (
            <span className="text-[10px] text-[#BBBBBB] italic">tracking</span>
          )}
        </div>
        {drv.notes && (
          <div className="flex items-start gap-1.5 mt-1.5">
            <MessageSquare className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">{drv.notes}</p>
          </div>
        )}
      </div>

      {sparkValues && sparkValues.length >= 2 && (
        <Sparkline values={sparkValues} lowerIsBetter={lowerIsBetter} id={`sig-${drv.id}`} />
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function MeasureOutput({ state, updateState, onNext, onBack, onHome }: MeasureOutputProps) {
  void updateState;
  const [exporting, setExporting] = useState(false);
  const [expandedQuadrants, setExpandedQuadrants] = useState<Record<string, boolean>>({
    Capacity: true, Workforce: true, Revenue: true, Quality: true,
  });
  const { toast } = useToast();

  const toggleQuadrant = (q: string) =>
    setExpandedQuadrants(prev => ({ ...prev, [q]: !prev[q] }));

  const activeSettings = (
    state.activeCareSettings && state.activeCareSettings.length > 0
      ? state.activeCareSettings
      : [state.careSetting || 'outpatient']
  ) as ExploreSetting[];

  const dep = state.deployment as any;

  const quadrants: MeasurePDFQuadrantSection[] = useMemo(() => {
    return QUADRANT_ORDER.map((q) => {
      const drivers: MeasurePDFDriver[] = [];
      for (const setting of activeSettings) {
        const st = state.trackedDrivers?.[setting] || {};
        EXPLORE_DRIVERS
          .filter(d => d.quadrant === q && d.settings.includes(setting) && st[d.id])
          .forEach(d => {
            drivers.push({ ...buildDriverPayload(d, st[d.id]), setting });
          });
      }
      const realizedTotal = drivers.reduce((sum, d) => sum + d.realizedValue, 0);
      return { quadrant: q, realizedTotal, drivers };
    });
  }, [activeSettings, state.trackedDrivers]);

  const totalRealized = quadrants.reduce((sum, q) => sum + q.realizedTotal, 0);
  const driversTrackedCount = quadrants.reduce((sum, q) => sum + q.drivers.length, 0);
  const financialDriverCount = quadrants.reduce((sum, q) => sum + q.drivers.filter(d => d.visibility === 'quantified').length, 0);
  const signalDriverCount = driversTrackedCount - financialDriverCount;
  const activeQuadrantCount = quadrants.filter(q => q.drivers.length > 0).length;

  const isMultiSetting = activeSettings.length > 1;
  const primarySetting = activeSettings[0];
  const careSettingLabel = isMultiSetting
    ? activeSettings.map(s => SETTING_LABELS[s]).join(' + ')
    : SETTING_LABELS[primarySetting];

  const getDriverSettingBadges = (drv: MeasurePDFDriver) => {
    if (!isMultiSetting) return [];
    return drv.setting ? [drv.setting] : [];
  };

  const getDriverLowerIsBetter = (drvId: string) => {
    return EXPLORE_DRIVERS.find(d => d.id === drvId)?.measureDefaults?.lowerIsBetter;
  };

  const buildPDFData = (): MeasurePDFData => ({
    organizationName: dep?.organizationName || undefined,
    date: new Date().toLocaleDateString(),
    careSettingLabel,
    monthsLive: dep?.monthsOnAbridge ?? undefined,
    careSetting: primarySetting,
    numberOfProviders: dep?.providers ?? 0,
    utilizationPercent: dep?.utilizationRate ?? 0,
    annualEncounters: dep?.totalEncounters ?? 0,
    staffedBeds: activeSettings.includes("nursing") ? (dep?.staffedBeds ?? 0) : undefined,
    occupancyPercent: activeSettings.includes("nursing") ? (dep?.occupancyPercent ?? 0) : undefined,
    totalRealized,
    totalProjected: totalRealized,
    addedSettingsTotal: 0,
    combinedAnnualTotal: totalRealized,
    driversTrackedCount,
    quadrants,
    forecastBaseline: { providers: dep?.providers ?? 0, utilizationPercent: dep?.utilizationRate ?? 0, encounters: dep?.totalEncounters ?? 0, staffedBeds: 0, occupancyPercent: 0 },
    forecastProjected: state.forecastScenario ?? { providers: 0, utilizationPercent: 0, encounters: 0, staffedBeds: 0, occupancyPercent: 0 },
    addedSettings: [],
    pricingScenarios: [],
    bestPricingScenarioLabel: undefined,
    bestPricingInvestment: undefined,
    bestPricingNet: undefined,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      await generateMeasureNarrativePDF(buildPDFData());
      toast({ title: "Evidence doc generated", description: "PDF download has started." });
    } catch (err) {
      console.error("PDF generation failed", err);
      toast({ title: "Export failed", description: "Could not generate the PDF. Please try again.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (n: number) => "$" + Math.round(n).toLocaleString();
  const noContent = driversTrackedCount === 0;

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      <UnifiedHeader
        pathType="measure"
        currentStep={6}
        totalSteps={6}
        stepName="Evidence Summary"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-8 md:py-12">

        {noContent ? (
          /* ── Empty state ───────────────────────────────────────────────── */
          <motion.div
            className="bg-[#1A1A1A] rounded-2xl p-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <FileText className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-3 font-abridge uppercase tracking-tight">
              Build the evidence first
            </h2>
            <p className="text-base text-white/50 max-w-md mx-auto mb-6">
              No drivers are tracked yet. Walk back through the domain pages to capture outcomes for this customer.
            </p>
            <Button
              onClick={onBack}
              className="h-12 px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-semibold rounded-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Quality
            </Button>
          </motion.div>
        ) : (
          <>
            {/* ── Hero ──────────────────────────────────────────────────────── */}
            <motion.div
              className="bg-[#1A1A1A] rounded-2xl p-7 md:p-8 mb-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              data-testid="card-realized-today"
            >
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

                {/* Left: headline number + context */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[2px] mb-3">
                    Realized Annual Value · {careSettingLabel}
                  </p>
                  <p className="text-5xl md:text-6xl font-bold text-white tabular-nums leading-none mb-3">
                    {totalRealized > 0 ? formatCurrency(totalRealized) : '—'}
                  </p>
                  <p className="text-sm text-white/40 mb-5">
                    {financialDriverCount > 0
                      ? `Across ${financialDriverCount} financial driver${financialDriverCount === 1 ? '' : 's'}, attribution-adjusted`
                      : 'Add financial drivers to see dollar impact'}
                  </p>

                  {/* Deployment context chips */}
                  <div className="flex flex-wrap gap-2">
                    {dep?.organizationName && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white/60">
                        {dep.organizationName}
                      </span>
                    )}
                    {dep?.providers > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white/60">
                        {dep.providers} providers
                      </span>
                    )}
                    {dep?.monthsOnAbridge > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white/60">
                        {dep.monthsOnAbridge} months live
                      </span>
                    )}
                    {dep?.utilizationRate > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white/60">
                        {dep.utilizationRate}% adoption
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: domain breakdown */}
                <div className="lg:w-[300px] flex-shrink-0">
                  <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[2px] mb-4">
                    Value by Domain
                  </p>
                  <div className="space-y-3">
                    {QUADRANT_ORDER.map(q => {
                      const qd = quadrants.find(x => x.quadrant === q);
                      const val = qd?.realizedTotal ?? 0;
                      const pct = totalRealized > 0 ? (val / totalRealized) * 100 : 0;
                      const color = QUADRANT_COLORS[q];
                      const dCount = qd?.drivers.length ?? 0;
                      return (
                        <div key={q}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                              <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wide">{q}</span>
                              {dCount > 0 && (
                                <span className="text-[10px] text-white/30">{dCount} driver{dCount === 1 ? '' : 's'}</span>
                              )}
                            </div>
                            <span className="text-sm font-bold text-white/80 tabular-nums">
                              {val > 0 ? formatCurrency(val) : <span className="text-white/25">—</span>}
                            </span>
                          </div>
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, backgroundColor: color, opacity: pct > 0 ? 1 : 0 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] text-white/30">
                    <span>{driversTrackedCount} drivers · {activeQuadrantCount} of 4 domains</span>
                    {signalDriverCount > 0 && <span>{signalDriverCount} signals tracked</span>}
                  </div>
                </div>

              </div>
            </motion.div>

            {/* ── Domain sections ───────────────────────────────────────────── */}
            <motion.div
              className="space-y-3 mb-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {quadrants.filter(q => q.drivers.length > 0).map((q, qi) => {
                const color = QUADRANT_COLORS[q.quadrant];
                const isExpanded = expandedQuadrants[q.quadrant] ?? true;
                const financialDrivers = q.drivers.filter(d => d.visibility === 'quantified');
                const signalDrivers = q.drivers.filter(d => d.visibility === 'qualitative');
                const tagline = QUADRANT_TAGLINES[q.quadrant];

                return (
                  <motion.div
                    key={q.quadrant}
                    className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + qi * 0.05 }}
                    data-testid={`section-quadrant-${q.quadrant.toLowerCase()}`}
                  >
                    {/* Section header */}
                    <button
                      onClick={() => toggleQuadrant(q.quadrant)}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#FAFAF8] transition-colors text-left group"
                      data-testid={`toggle-quadrant-${q.quadrant.toLowerCase()}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-black uppercase tracking-wide">{q.quadrant}</span>
                            <span className="text-xs text-[#AAAAAA]">
                              {q.drivers.length} driver{q.drivers.length === 1 ? '' : 's'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#AAAAAA] leading-none mt-0.5 truncate">{tagline}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        {q.realizedTotal > 0 && (
                          <span className="text-base font-bold tabular-nums" style={{ color }}>
                            {formatCurrency(q.realizedTotal)}
                          </span>
                        )}
                        <ChevronDown
                          className={`w-4 h-4 text-[#CCCCCC] transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                        />
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-[#F0F0F0]">

                            {/* Financial drivers */}
                            {financialDrivers.length > 0 && (
                              <div className="p-5">
                                <p className="text-[10px] font-bold text-[#888888] uppercase tracking-[1.5px] mb-3">
                                  Financial Impact
                                </p>
                                <div className="space-y-3">
                                  {financialDrivers.map(drv => (
                                    <FinancialDriverCard
                                      key={drv.id}
                                      drv={drv}
                                      settingBadges={getDriverSettingBadges(drv)}
                                      lowerIsBetter={getDriverLowerIsBetter(drv.id)}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Signal drivers */}
                            {signalDrivers.length > 0 && (
                              <div className={`px-5 pb-5 ${financialDrivers.length > 0 ? 'pt-0' : 'pt-5'}`}>
                                {financialDrivers.length > 0 && (
                                  <div className="h-px bg-[#F0F0F0] mb-4" />
                                )}
                                <p className="text-[10px] font-bold text-[#888888] uppercase tracking-[1.5px] mb-3">
                                  Signal Evidence
                                </p>
                                <div className="space-y-2">
                                  {signalDrivers.map(drv => (
                                    <SignalDriverRow
                                      key={drv.id}
                                      drv={drv}
                                      settingBadges={getDriverSettingBadges(drv)}
                                      lowerIsBetter={getDriverLowerIsBetter(drv.id)}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* ── Scale & Forecast CTA ──────────────────────────────────────── */}
            <motion.div
              className="bg-[#1A1A1A] rounded-2xl p-6 mb-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#EA2C00]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <TrendingUp className="w-5 h-5 text-[#EA2C00]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">Model the ceiling</p>
                    <p className="text-sm text-white/50 leading-relaxed max-w-sm">
                      What does this look like at full adoption? Across new care settings? Compare pricing scenarios and project the next 3 years.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={onNext}
                  className="h-11 px-6 bg-white hover:bg-white/90 text-black font-semibold rounded-full gap-2 flex-shrink-0"
                  data-testid="button-open-forecast"
                >
                  Scale &amp; Forecast
                  <TrendingUp className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>

            {/* ── Download ─────────────────────────────────────────────────── */}
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 pb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <Button
                onClick={handleExport}
                disabled={exporting}
                className="h-12 px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-semibold rounded-full gap-2"
                data-testid="button-download-evidence-doc"
              >
                {exporting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                ) : (
                  <><Download className="w-4 h-4" /> Download Evidence Doc</>
                )}
              </Button>
            </motion.div>

          </>
        )}
      </div>
    </div>
  );
}
