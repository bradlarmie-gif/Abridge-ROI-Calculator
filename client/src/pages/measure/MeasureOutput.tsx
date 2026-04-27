import { useMemo, useState } from "react";
import { Download, Edit, ArrowLeft, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  EXPLORE_DRIVERS,
  type ExploreSetting,
  type ExploreQuadrant,
} from "@/lib/exploreDrivers";
import { computeAddedSettingValue, SETTING_LABELS } from "@/lib/forecastDefaults";
import {
  computeScenarioInvestment,
  PRICING_MODEL_LABELS,
  PRICING_MODEL_RATE_SUFFIX,
  PRICING_MODEL_SCALE_LABEL,
} from "@/lib/forecastPricing";
import {
  generateMeasurePDF,
  type MeasurePDFData,
  type MeasurePDFDriver,
  type MeasurePDFQuadrantSection,
} from "@/components/measure/MeasurePDFExport";
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

function buildDriverPayload(
  driver: (typeof EXPLORE_DRIVERS)[number],
  entry: MeasureDriverEntry,
): MeasurePDFDriver {
  const md = driver.measureDefaults;
  const sortedMonthly = [...(entry.monthlyData || [])].sort((a, b) => a.month.localeCompare(b.month));
  const latest = sortedMonthly[sortedMonthly.length - 1];
  const effWith = entry.isMonthlyMode && latest ? latest.withAbridge : entry.withAbridge;
  const effWithout = entry.isMonthlyMode && latest ? latest.withoutAbridge : entry.withoutAbridge;
  const delta = effWith - effWithout;
  const isQuantifiable = driver.visibility === "quantified" && Boolean(md);
  const realizedValue = isQuantifiable
    ? Math.round(delta * entry.valuePerUnit * (entry.attributionPercent / 100) * (entry.realizationPercent / 100))
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

export default function MeasureOutput({ state, updateState, onNext, onBack, onHome }: MeasureOutputProps) {
  void updateState;
  void onNext;
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const setting = (state.careSetting || "outpatient") as ExploreSetting;
  const dep = state.deployment as any;

  // Build per-quadrant sections — only drivers the user actually tracked
  const quadrants: MeasurePDFQuadrantSection[] = useMemo(() => {
    return QUADRANT_ORDER.map((q) => {
      const drivers = EXPLORE_DRIVERS.filter(
        (d) => d.quadrant === q && d.settings.includes(setting) && state.trackedDrivers && state.trackedDrivers[d.id],
      ).map((d) => buildDriverPayload(d, state.trackedDrivers[d.id]));

      const realizedTotal = drivers.reduce((sum, d) => sum + d.realizedValue, 0);
      return { quadrant: q, realizedTotal, drivers };
    });
  }, [setting, state.trackedDrivers]);

  const totalRealized = quadrants.reduce((sum, q) => sum + q.realizedTotal, 0);
  const driversTrackedCount = quadrants.reduce((sum, q) => sum + q.drivers.length, 0);

  // Forecast totals — replicate the math from MeasureForecast
  const baseline = useMemo(
    () => ({
      providers: dep?.providers ?? 0,
      utilizationPercent: dep?.utilizationRate ?? 0,
      encounters: dep?.totalEncounters ?? 0,
      staffedBeds: dep?.staffedBeds ?? 0,
      occupancyPercent: dep?.occupancyPercent ?? 0,
    }),
    [dep],
  );

  const projected = useMemo(
    () => ({
      providers: state.forecastScenario?.providers ?? 0,
      utilizationPercent: state.forecastScenario?.utilizationPercent ?? 0,
      encounters: state.forecastScenario?.encounters ?? 0,
      staffedBeds: state.forecastScenario?.staffedBeds ?? 0,
      occupancyPercent: state.forecastScenario?.occupancyPercent ?? 0,
    }),
    [state.forecastScenario],
  );

  const totalProjected = useMemo(() => {
    return quadrants.reduce((sum, q) => {
      return (
        sum +
        q.drivers.reduce((qSum, drv) => {
          const driverDef = EXPLORE_DRIVERS.find((d) => d.id === drv.id);
          if (!driverDef?.measureDefaults) return qSum + drv.realizedValue;
          const axis = driverDef.measureDefaults.scaleAxis;
          let scale = 1;
          if (axis === "providers") {
            const baseScale = baseline.providers * (baseline.utilizationPercent / 100);
            const projScale = projected.providers * (projected.utilizationPercent / 100);
            scale = baseScale > 0 ? projScale / baseScale : 1;
          } else if (axis === "encounters") {
            const baseScale = baseline.encounters * (baseline.utilizationPercent / 100);
            const projScale = projected.encounters * (projected.utilizationPercent / 100);
            scale = baseScale > 0 ? projScale / baseScale : 1;
          } else if (axis === "patientDays") {
            const baseScale = baseline.staffedBeds * (baseline.occupancyPercent / 100);
            const projScale = projected.staffedBeds * (projected.occupancyPercent / 100);
            scale = baseScale > 0 ? projScale / baseScale : 1;
          }
          return qSum + Math.round(drv.realizedValue * scale);
        }, 0)
      );
    }, 0);
  }, [quadrants, baseline, projected]);

  const addedSettings = state.forecastScenario?.addedSettings ?? [];
  const addedSettingsTotal = addedSettings.reduce((sum, a) => sum + computeAddedSettingValue(a), 0);
  const combinedAnnualTotal = totalProjected + addedSettingsTotal;

  const pricingScenarios = state.forecastScenario?.pricingScenarios ?? [];
  const combinedProviders = projected.providers + addedSettings.reduce((s, a) => s + (a.providers || 0), 0);
  const combinedEncounters = projected.encounters + addedSettings.reduce((s, a) => s + (a.encounters || 0), 0);

  const evaluatedPricing = useMemo(() => {
    return pricingScenarios.map((sc) => {
      const scale =
        sc.model === "perProvider" ? combinedProviders : sc.model === "perEncounter" ? combinedEncounters : 0;
      const { value: investment, tier, warning } = computeScenarioInvestment(sc, scale);
      const net = combinedAnnualTotal - investment;
      const roi = investment > 0 ? combinedAnnualTotal / investment : 0;
      return { scenario: sc, scale, investment, tier, warning, net, roi };
    });
  }, [pricingScenarios, combinedProviders, combinedEncounters, combinedAnnualTotal]);

  const bestValueId = useMemo(() => {
    if (evaluatedPricing.length < 2) return null;
    const valid = evaluatedPricing.filter((e) => !e.warning && e.investment > 0);
    if (valid.length === 0) return null;
    valid.sort((a, b) => a.investment - b.investment);
    return valid[0].scenario.id;
  }, [evaluatedPricing]);

  const bestEntry = bestValueId ? evaluatedPricing.find((e) => e.scenario.id === bestValueId) : null;

  const titleScenario = (label: string) => label.charAt(0).toUpperCase() + label.slice(1);

  const buildPDFData = (): MeasurePDFData => ({
    organizationName: dep?.organizationName || undefined,
    date: new Date().toLocaleDateString(),
    careSettingLabel: SETTING_LABELS[setting],
    monthsLive: dep?.monthsOnAbridge ?? undefined,

    careSetting: setting,
    numberOfProviders: baseline.providers,
    utilizationPercent: baseline.utilizationPercent,
    annualEncounters: baseline.encounters,
    staffedBeds: setting === "nursing" ? baseline.staffedBeds : undefined,
    occupancyPercent: setting === "nursing" ? baseline.occupancyPercent : undefined,

    totalRealized,
    totalProjected,
    addedSettingsTotal,
    combinedAnnualTotal,
    driversTrackedCount,

    quadrants,

    forecastBaseline: baseline,
    forecastProjected: projected,

    addedSettings: addedSettings.map((a) => ({
      settingLabel: SETTING_LABELS[a.setting as ExploreSetting] || String(a.setting),
      providers: a.providers || 0,
      utilizationPercent: a.utilizationPercent || 0,
      encounters: a.encounters || 0,
      staffedBeds: a.staffedBeds || 0,
      occupancyPercent: a.occupancyPercent || 0,
      scenarioLabel: titleScenario(a.scenario || "typical"),
      estimatedValue: computeAddedSettingValue(a),
      isOverridden: (a as any).customValueOverride !== undefined && (a as any).customValueOverride > 0,
      isNursing: a.setting === "nursing",
    })),

    pricingScenarios: evaluatedPricing.map((e) => ({
      label: e.scenario.label,
      modelLabel: PRICING_MODEL_LABELS[e.scenario.model],
      rateSuffix: PRICING_MODEL_RATE_SUFFIX[e.scenario.model],
      tiers: e.scenario.tiers.map((t) => ({
        thresholdFrom: t.thresholdFrom,
        thresholdTo: t.thresholdTo,
        rate: t.rate,
      })),
      appliedTier: e.tier
        ? { thresholdFrom: e.tier.thresholdFrom, thresholdTo: e.tier.thresholdTo, rate: e.tier.rate }
        : null,
      scale: e.scale,
      scaleLabel: PRICING_MODEL_SCALE_LABEL[e.scenario.model],
      investment: e.investment,
      netAnnual: e.net,
      roi: e.roi,
      isBestValue: e.scenario.id === bestValueId,
      warning: e.warning,
    })),

    bestPricingScenarioLabel: bestEntry?.scenario.label,
    bestPricingInvestment: bestEntry?.investment,
    bestPricingNet: bestEntry?.net,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      await generateMeasurePDF(buildPDFData());
      toast({ title: "Evidence doc generated", description: "PDF download has started." });
    } catch (err) {
      console.error("PDF generation failed", err);
      toast({
        title: "Export failed",
        description: "Could not generate the PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (n: number) => "$" + Math.round(n).toLocaleString();

  const noContent = totalRealized === 0 && combinedAnnualTotal === 0 && driversTrackedCount === 0;

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={7}
        totalSteps={7}
        stepName="Outcome Summary"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3">
            Outcome Summary
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight">
            Your Outcomes
          </h1>
          <p className="text-base text-[#888888]">
            Realized value, projected scale, and recommended pricing.
          </p>
        </motion.div>

        {noContent ? (
          <motion.div
            className="bg-[#1A1A1A] rounded-2xl p-12 text-center mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <FileText className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-3 font-abridge uppercase tracking-tight">
              Build the evidence first
            </h2>
            <p className="text-base text-white/60 max-w-md mx-auto mb-6">
              No drivers are tracked yet. Walk back through the quadrant pages to capture realized
              outcomes for this customer.
            </p>
            <Button
              onClick={() => onBack()}
              className="h-12 px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-semibold rounded-full"
              data-testid="button-back-to-forecast"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Forecast
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Hero stat cards */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="bg-[#1A1A1A] rounded-xl p-5" data-testid="card-realized-today">
                <p className="text-xs font-medium text-white/50 uppercase tracking-[1.5px] mb-1">
                  Realized Today
                </p>
                <p className="text-3xl font-bold text-white">{formatCurrency(totalRealized)}</p>
                <p className="text-xs text-white/50 mt-1">
                  {driversTrackedCount} driver{driversTrackedCount === 1 ? "" : "s"} tracked
                </p>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl p-5" data-testid="card-projected-scale">
                <p className="text-xs font-medium text-white/50 uppercase tracking-[1.5px] mb-1">
                  Projected at Scale
                </p>
                <p className="text-3xl font-bold text-[#EA2C00]">
                  {formatCurrency(combinedAnnualTotal)}
                </p>
                <p className="text-xs text-white/50 mt-1">
                  {addedSettings.length > 0
                    ? `Includes ${addedSettings.length} expansion${addedSettings.length === 1 ? "" : "s"}`
                    : "Single setting"}
                </p>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl p-5" data-testid="card-best-pricing">
                <p className="text-xs font-medium text-white/50 uppercase tracking-[1.5px] mb-1">
                  Best Pricing Net
                </p>
                {bestEntry ? (
                  <>
                    <p className="text-3xl font-bold text-white">{formatCurrency(bestEntry.net)}</p>
                    <p className="text-xs text-white/50 mt-1">
                      {bestEntry.scenario.label} (★ Best Value)
                    </p>
                  </>
                ) : pricingScenarios.length === 1 ? (
                  <>
                    <p className="text-3xl font-bold text-white">
                      {formatCurrency(evaluatedPricing[0].net)}
                    </p>
                    <p className="text-xs text-white/50 mt-1">{evaluatedPricing[0].scenario.label}</p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-white/40">—</p>
                    <p className="text-xs text-white/50 mt-1">
                      Add a pricing scenario in Forecast
                    </p>
                  </>
                )}
              </div>
            </motion.div>

            {/* Per-quadrant realized totals */}
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {quadrants.map((q) => (
                <div
                  key={q.quadrant}
                  className="bg-[#FAFAF8] border border-[#E5E5E5] rounded-xl p-4"
                  data-testid={`card-quadrant-${q.quadrant.toLowerCase()}`}
                >
                  <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-1">
                    {q.quadrant}
                  </p>
                  <p className="text-lg font-bold text-[#1A1A1A]">
                    {q.realizedTotal > 0 ? formatCurrency(q.realizedTotal) : "—"}
                  </p>
                  <p className="text-[11px] text-[#888888] mt-0.5">
                    {q.drivers.length} driver{q.drivers.length === 1 ? "" : "s"}
                  </p>
                </div>
              ))}
            </motion.div>

            {/* Action row */}
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                onClick={handleExport}
                disabled={exporting}
                className="h-12 px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-semibold rounded-full gap-2"
                data-testid="button-download-evidence-doc"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Download Evidence Doc
                  </>
                )}
              </Button>
              <Button
                onClick={onBack}
                variant="outline"
                className="h-12 px-6 border-[#E5E5E5] text-[#666666] hover:bg-[#F5F0EB] rounded-full gap-2"
                data-testid="button-edit-model"
              >
                <Edit className="w-4 h-4" /> Edit Model
              </Button>
            </motion.div>

            <p className="text-center text-xs text-[#888888]">
              Evidence doc reflects current realized values, forecast scenarios, and pricing
              comparisons exactly as configured.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
