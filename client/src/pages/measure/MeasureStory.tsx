import { useMemo, useState } from "react";
import { Download, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { 
  type MeasureState, 
  type DataSource,
  formatCurrency, 
  formatNumber,
  calculateExpansionResults,
  calculateConfirmedValue,
  getDefaultScenarios,
  calculateScenario,
  deriveEngagementContext,
  computeDomainStatus,
  type DomainStatus,
  getMonthsFromGoLive,
} from "@/lib/measureCalculator";
import { EngagementContextBar } from "@/components/measure/EngagementContextBar";

function DataSourceBadge({ source }: { source: DataSource }) {
  const config: Record<DataSource, { label: string; bg: string; text: string }> = {
    analytics: { label: 'Analytics-backed', bg: 'bg-green-100', text: 'text-green-700' },
    benchmark: { label: 'Abridge-verified', bg: 'bg-blue-100', text: 'text-blue-700' },
    estimate: { label: 'Estimated', bg: 'bg-gray-100', text: 'text-gray-600' },
  };
  const c = config[source] || config.estimate;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${c.bg} ${c.text}`} data-testid="badge-data-source">
      {c.label}
    </span>
  );
}
import { generateMeasurePDF } from "@/components/measure/MeasurePDFExport";
import { PDFExportModal } from "@/components/switch/PDFExportModal";
import { useToast } from "@/hooks/use-toast";

function formatSmartRange(low: number, high: number): string {
  const lowFmt = formatCurrency(low);
  const highFmt = formatCurrency(high);
  if (lowFmt === highFmt) return lowFmt;
  return `${lowFmt} \u2013 ${highFmt}`;
}

interface MeasureStoryProps {
  state: MeasureState;
  onBack: () => void;
  onHome: () => void;
}

function DomainRow({ name, status, value, valueHigh, hoursNote, dark }: {
  name: string;
  status: DomainStatus;
  value: number;
  valueHigh?: number;
  hoursNote?: string;
  dark?: boolean;
}) {
  const muted = status === 'no-data';
  return (
    <div className={`flex items-center justify-between py-3 border-b last:border-b-0 ${dark ? 'border-white/10' : 'border-[#F0F0F0]'} ${muted ? 'opacity-40' : ''}`}
      data-testid={`domain-row-${name.toLowerCase().replace(/\s/g, '-')}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${muted ? 'bg-gray-300' : status === 'validated' ? 'bg-green-500' : status === 'signaling' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
        <span className={`text-sm ${dark ? 'text-white/80' : 'text-[#1A1A1A]'}`}>{name}</span>
      </div>
      <div className="text-right">
        {muted ? (
          <span className={`text-xs italic ${dark ? 'text-white/30' : 'text-[#CCCCCC]'}`}>Not yet measured</span>
        ) : (
          <>
            <span className={`text-sm font-semibold ${dark ? 'text-white' : 'text-[#1A1A1A]'}`}>
              {value > 0 ? (valueHigh ? formatSmartRange(value, valueHigh) : formatCurrency(value)) : '\u2014'}
            </span>
            {hoursNote && <span className={`text-xs ml-2 ${dark ? 'text-white/40' : 'text-[#999999]'}`}>{hoursNote}</span>}
          </>
        )}
      </div>
    </div>
  );
}

export default function MeasureStory({ state, onBack, onHome }: MeasureStoryProps) {
  const [showMethodology, setShowMethodology] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { toast } = useToast();

  const careSetting = state.careSetting || "outpatient";
  const isInpatient = careSetting === "inpatient";
  const isED = careSetting === "ed";
  const isNursing = careSetting === "nursing";

  const context = useMemo(() => deriveEngagementContext(state), [state]);
  const domainStatus = useMemo(() => computeDomainStatus(state), [state]);
  const months = getMonthsFromGoLive(state.goLiveDate, state.deployment.monthsOnAbridge);

  const results = useMemo(() => {
    const deployment = state.deployment;
    const timeEfficiency = state.timeEfficiency;
    const calibration = state.calibration;
    const docQuality = state.documentationQuality;

    const timeSavedPerNote = Math.max(0, timeEfficiency.timeInNotesWithout - timeEfficiency.timeInNotesWith);
    const adoptedEncounters = Math.round(deployment.totalEncounters * (deployment.utilizationRate / 100));
    const totalHoursSaved = (timeSavedPerNote * adoptedEncounters) / 60;
    const annualFactor = 12 / Math.max(deployment.monthsOnAbridge, 1);

    let qualityValue = 0;
    let qualityValueHigh = 0;
    let workforceValue = 0;
    let revenueValue = 0;
    let revenueValueHigh = 0;
    let capacityValue = 0;
    let totalValueLow = 0;
    let totalValueHigh = 0;

    const efficiencyHours = totalHoursSaved * 0.5;
    workforceValue = efficiencyHours * calibration.otHourlyRate;

    const wrvuLift = docQuality.wrvuWith - docQuality.wrvuWithout;
    if (!isNursing && wrvuLift > 0) {
      qualityValue = wrvuLift * adoptedEncounters * calibration.conversionFactor * 0.50 * annualFactor;
      qualityValueHigh = wrvuLift * adoptedEncounters * calibration.conversionFactor * 0.75 * annualFactor;
      revenueValue = qualityValue;
      revenueValueHigh = qualityValueHigh;
    }

    if (isInpatient) {
      const metrics = state.settingData?.inpatient || {};
      const cmiDelta = Math.max(0, (metrics.cmi_after ?? 0) - (metrics.cmi_before ?? 0));
      const cmiPointValue = metrics.vm_cmiPointValue ?? calibration.conversionFactor ?? 1500;
      if (cmiDelta > 0) {
        qualityValue += cmiDelta * adoptedEncounters * cmiPointValue * 0.50 * annualFactor;
        qualityValueHigh += cmiDelta * adoptedEncounters * cmiPointValue * 0.75 * annualFactor;
      }
      const denialsDelta = Math.max(0, (metrics.denialsPer100_before ?? 0) - (metrics.denialsPer100_after ?? 0));
      if (denialsDelta > 0) {
        const dVal = (denialsDelta / 100) * adoptedEncounters * (metrics.vm_denialCostPerCase ?? 3200) * annualFactor;
        revenueValue += dVal;
        revenueValueHigh += dVal;
      }
    }

    if (isED) {
      const throughputHours = totalHoursSaved * 0.3;
      const addlPatients = throughputHours * (60 / calibration.minutesPerVisit);
      capacityValue = addlPatients * calibration.revenuePerVisit * annualFactor;
    } else if (!isInpatient && !isNursing) {
      const capHours = totalHoursSaved * 0.2;
      const addlVisits = capHours * (60 / calibration.minutesPerVisit);
      capacityValue = addlVisits * calibration.revenuePerVisit * annualFactor;
    }

    totalValueLow = qualityValue + workforceValue + revenueValue + capacityValue;
    totalValueHigh = qualityValueHigh + workforceValue + revenueValueHigh + capacityValue;

    const expansion = calculateExpansionResults(
      state, totalValueLow, totalValueHigh, totalHoursSaved,
      state.expansionTargets?.targetAdoption,
      state.expansionTargets?.targetProviders
    );

    return {
      totalHoursSaved,
      qualityValue,
      qualityValueHigh,
      workforceValue,
      revenueValue,
      revenueValueHigh,
      capacityValue,
      totalValueLow,
      totalValueHigh,
      expansion,
    };
  }, [state, careSetting]);

  const hoursPerProvider = state.deployment.providers > 0
    ? Math.round(results.totalHoursSaved / state.deployment.providers)
    : 0;

  const handleExportPDF = async (clientName: string, preparedBy: string) => {
    setIsExporting(true);
    try {
      await generateMeasurePDF(state, clientName, preparedBy);
      setShowExportModal(false);
      toast({
        title: "PDF Downloaded",
        description: "Your Executive Summary has been saved.",
        variant: "brand",
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({
        title: "Export Failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const phaseNarrative = useMemo(() => {
    if (context.phase === 1) {
      return `${state.deployment.providers} ${isNursing ? 'nurses' : 'providers'} are ${months} months into their Abridge deployment. Documentation efficiency is the first signal \u2014 and it\u2019s live. The foundation is set for deeper value domains to emerge.`;
    }
    if (context.phase === 2) {
      return `At ${months} months, your deployment has moved beyond documentation speed. Workforce and revenue signals are beginning to appear \u2014 the kind of evidence that builds a credible renewal case.`;
    }
    if (context.phase === 3) {
      return `${months} months in, your data spans multiple value domains. ${isInpatient ? 'Patient flow' : isED ? 'Throughput' : 'Capacity'} signals are emerging \u2014 the organization is beginning to do more with the time Abridge has returned.`;
    }
    return `At ${months}+ months, Abridge value is embedded across the organization. Your data tells a strategic story \u2014 one that supports expansion, board-level reporting, and long-term investment framing.`;
  }, [context.phase, months, state.deployment.providers, isNursing, isInpatient, isED]);

  const confirmed = useMemo(() => calculateConfirmedValue(state), [state]);
  const typicalScenario = useMemo(() => {
    const defaults = getDefaultScenarios(state);
    const typicalInputs = state.scenarioOverrides?.typical ?? defaults.typical;
    const isCustomized = state.scenarioOverrides?.typicalCustom ?? false;
    return calculateScenario(state, typicalInputs, 'typical', isCustomized);
  }, [state]);

  const gapVsConfirmed = Math.max(0, typicalScenario.annualValue - (confirmed.low + confirmed.high) / 2);

  const gapClosers = useMemo(() => {
    const items: string[] = [];
    if (state.deployment.utilizationRate < 60) {
      items.push('Deepen adoption');
    }
    const noDataDomains = Object.entries(domainStatus)
      .filter(([, s]) => s === 'no-data')
      .map(([d]) => d.charAt(0).toUpperCase() + d.slice(1));
    noDataDomains.forEach(d => { if (items.length < 2) items.push(`Measure ${d}`); });
    const totalProviders = state.deployment.totalProviders || state.deployment.providers;
    if (totalProviders > state.deployment.providers && items.length < 2) {
      items.push(`Expand to ${totalProviders} providers`);
    }
    if (items.length === 0) items.push('Continue current trajectory');
    return items.slice(0, 2);
  }, [state, domainStatus]);

  const capacityLabel = isInpatient ? 'Patient Flow' : isED ? 'Throughput' : 'Capacity';

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={6}
        totalSteps={6}
        stepName="Executive Summary"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <EngagementContextBar context={context} dataSource={state.dataSource} organizationName={state.deployment.organizationName} />

        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-3">
            Phase {context.phase} {"–"} {context.phaseLabel}
          </p>
          <p className="text-base text-[#666666] max-w-xl mx-auto leading-relaxed">
            {phaseNarrative}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <motion.div
            className="rounded-xl p-6"
            style={{ backgroundColor: '#1A1A1A' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            data-testid="section-confirmed"
          >
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-[2px] mb-4">Confirmed Value</p>
            <p className="text-3xl font-bold text-white mb-2" data-testid="text-confirmed-value">
              {formatSmartRange(confirmed.low, confirmed.high)}
              <span className="text-sm font-normal text-white/40"> / year</span>
            </p>
            <p className="text-xs text-white/40 mb-4">
              {months} months of deployment data, {state.deployment.providers} {isNursing ? 'nurses' : 'providers'}, {formatNumber(confirmed.adoptedEncounters)} encounters
            </p>
            <div className="mb-3">
              <DataSourceBadge source={state.dataSource} />
            </div>

            <div className="border-t border-white/10 pt-3 space-y-0">
              <DomainRow name="Quality" status={domainStatus.quality} value={results.qualityValue} valueHigh={results.qualityValueHigh} dark />
              <DomainRow name="Workforce" status={domainStatus.workforce} value={results.workforceValue} hoursNote={`${formatNumber(Math.round(results.totalHoursSaved * 0.5))} hrs`} dark />
              <DomainRow name="Revenue" status={domainStatus.revenue} value={results.revenueValue} valueHigh={results.revenueValueHigh} dark />
              <DomainRow name={capacityLabel} status={domainStatus.capacity} value={results.capacityValue} dark />
            </div>
          </motion.div>

          <motion.div
            className="rounded-xl p-6"
            style={{ backgroundColor: '#F5F0EB' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            data-testid="section-scenario"
          >
            <p className="text-[11px] font-semibold text-[#999999] uppercase tracking-[2px] mb-4">Typical Scenario</p>
            <p className="text-3xl font-bold text-[#EA2C00] mb-2" data-testid="text-scenario-value">
              {formatCurrency(typicalScenario.annualValue)}
              <span className="text-sm font-normal text-[#999999]"> / year</span>
            </p>
            <p className="text-xs text-[#999999] mb-4">
              {typicalScenario.inputs.providers} {isNursing ? 'nurses' : 'providers'} at {typicalScenario.inputs.adoptionRate}% adoption, {typicalScenario.inputs.attributionRate}% attribution
            </p>

            {gapVsConfirmed > 0 && (
              <div className="bg-white rounded-lg p-4 mb-4 border-l-4 border-[#EA2C00]">
                <p className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-[1px] mb-1">Gap vs Confirmed</p>
                <p className="text-xl font-bold text-[#EA2C00]" data-testid="text-gap-value">
                  {formatCurrency(gapVsConfirmed)}
                </p>
              </div>
            )}

            {gapClosers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#1A1A1A] mb-2">Closes by:</p>
                <ul className="space-y-1">
                  {gapClosers.map((item, i) => (
                    <li key={i} className="text-sm text-[#666666] flex gap-2">
                      <span className="text-xs font-bold text-[#EA2C00] mt-0.5">{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        </div>

        {(state.customMetrics || []).filter((cm) => cm.label.trim()).length > 0 && (
          <motion.div
            className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            data-testid="section-custom-metrics"
          >
            <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-5">
              Additional Metrics
            </p>
            {(state.customMetrics || [])
              .filter((cm) => cm.label.trim())
              .map((cm) => {
                const delta = cm.after - cm.before;
                const pct = cm.before !== 0 ? ((delta / cm.before) * 100).toFixed(1) : null;
                return (
                  <div
                    key={cm.id}
                    className="flex items-center justify-between py-3 border-b border-[#F0F0F0] last:border-b-0"
                    data-testid={`story-custom-${cm.id}`}
                  >
                    <span className="text-sm text-[#1A1A1A]">{cm.label}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-[#999999]">{cm.before} {'\u2192'} {cm.after}</span>
                      {pct && (
                        <span className={`text-xs font-semibold ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-[#EA2C00]' : 'text-[#666666]'}`}>
                          {delta > 0 ? '+' : ''}{pct}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#D1D5DB] transition-colors text-sm text-[#999999]"
            data-testid="button-methodology"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              How We Calculated This
            </span>
            {showMethodology ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          <AnimatePresence initial={false}>
            {showMethodology && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-5 bg-white border border-t-0 border-[#E5E5E5] rounded-b-lg text-sm text-[#666666] space-y-3">
                  <p>
                    <strong className="text-[#1A1A1A]">Time savings:</strong> Based on {Math.max(0, state.timeEfficiency.timeInNotesWithout - state.timeEfficiency.timeInNotesWith)} min saved per {isNursing ? "shift" : isInpatient ? "discharge" : "encounter"} {"\u00D7"} {formatNumber(Math.round(state.deployment.totalEncounters * (state.deployment.utilizationRate / 100)))} Abridge-documented {isNursing ? "shifts" : isInpatient ? "discharges" : "encounters"}.
                  </p>
                  <p>
                    <strong className="text-[#1A1A1A]">Allocation:</strong> Fixed 50% efficiency / 30% capacity / 20% wellbeing allocation applied to recovered time. Efficiency hours valued at ${state.calibration.otHourlyRate}/hr. Wellbeing hours shown as time returned, not dollarized.
                  </p>
                  {!isNursing && (
                    <p>
                      <strong className="text-[#1A1A1A]">Documentation quality:</strong>{" "}
                      {isInpatient
                        ? "CMI improvement, denial reduction, and CDI efficiency. Range reflects 50\u201375% attribution for DRG accuracy."
                        : isED
                        ? "E/M level accuracy and throughput recovery. Range reflects 50\u201375% attribution."
                        : `wRVU lift of ${(state.documentationQuality.wrvuWith - state.documentationQuality.wrvuWithout).toFixed(2)}/encounter. Range reflects 50\u201375% attribution.`
                      }
                    </p>
                  )}
                  <p>
                    <strong className="text-[#1A1A1A]">Data source:</strong>{" "}
                    {state.dataSource === 'analytics' ? 'Values sourced from EHR/analytics pull.' : state.dataSource === 'benchmark' ? 'Values sourced from Abridge analytics platform.' : 'Values are team estimates based on observation.'}
                  </p>
                  <p>
                    <strong className="text-[#1A1A1A]">Expansion:</strong> Deepen assumes {state.expansionTargets?.targetAdoption ?? 80}% utilization. Expand based on per-{isNursing ? "nurse" : "provider"} economics applied to {results.expansion.expandProviders} {isNursing ? "nurses" : "providers"}.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          className="bg-white rounded-xl border border-[#E5E5E5] p-5 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          data-testid="section-share"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-[#1A1A1A] mb-1">Share This Summary</p>
              <p className="text-sm text-[#999999]">
                Export a polished PDF for leadership
              </p>
            </div>
            <Button
              onClick={() => setShowExportModal(true)}
              className="bg-[#EA2C00] hover:bg-[#D42800] text-white rounded-md px-5 h-10 gap-2"
              data-testid="button-export"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
          </div>
        </motion.div>

        <PDFExportModal
          open={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExportPDF}
          isExporting={isExporting}
          documentType="executive summary"
        />

        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <button
            onClick={onHome}
            className="text-sm text-[#999999] hover:text-[#666666] transition-colors underline"
            data-testid="button-start-over"
          >
            Start Over
          </button>
        </motion.div>

        <div className="mt-8 pt-6 border-t border-[#E5E5E5]">
          <p className="text-xs text-[#999999] leading-relaxed text-center max-w-2xl mx-auto">
            Projections are modeled estimates based on user-provided inputs, published industry benchmarks, and aggregated deployment experience. Actual results may vary based on implementation approach, provider adoption, organizational factors, and care setting. This does not constitute a guarantee of financial outcomes.
          </p>
        </div>
      </div>
    </div>
  );
}
