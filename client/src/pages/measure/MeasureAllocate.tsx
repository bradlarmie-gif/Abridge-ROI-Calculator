import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { 
  type MeasureState, 
  type DataSource,
  type DomainStatus,
  formatCurrency, 
  formatNumber,
  calculateConfirmedValue,
  deriveEngagementContext,
  computeDomainStatus,
  getMonthsFromGoLive,
} from "@/lib/measureCalculator";
import { EngagementContextBar } from "@/components/measure/EngagementContextBar";
import NarrativePanel from "@/components/measure/NarrativePanel";
import { generateNarrative } from "@/lib/measureNarrative";

function DataSourceBadge({ source }: { source: DataSource }) {
  const config: Record<DataSource, { label: string; bg: string; text: string }> = {
    analytics: { label: 'Analytics Pull', bg: 'bg-green-100', text: 'text-green-700' },
    benchmark: { label: 'Partner Platform', bg: 'bg-blue-100', text: 'text-blue-700' },
    estimate: { label: 'Team Estimate', bg: 'bg-gray-100', text: 'text-gray-600' },
  };
  const c = config[source] || config.estimate;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${c.bg} ${c.text}`} data-testid="badge-data-source">
      {c.label}
    </span>
  );
}

function formatSmartRange(low: number, high: number): string {
  const lowFmt = formatCurrency(low);
  const highFmt = formatCurrency(high);
  if (lowFmt === highFmt) return lowFmt;
  return `${lowFmt}\u2013${highFmt}`;
}

interface DomainValueRow {
  label: string;
  value: number;
  valueHigh?: number;
  note?: string;
  hoursNote?: string;
  metricOnly?: boolean;
}

interface DomainSection {
  name: string;
  status: DomainStatus;
  rows: DomainValueRow[];
  preSignalNote?: string;
}

function DomainValueCard({ domain, dataSource, delay = 0 }: { domain: DomainSection; dataSource: DataSource; delay?: number }) {
  const muted = domain.status === 'no-data';
  const dollarRows = domain.rows.filter(r => !r.metricOnly);
  const totalLow = dollarRows.reduce((s, r) => s + r.value, 0);
  const totalHigh = dollarRows.reduce((s, r) => s + (r.valueHigh ?? r.value), 0);

  return (
    <motion.div
      className={`rounded-lg border p-4 mb-3 ${muted ? 'bg-[#FAFAFA] border-[#F0F0F0]' : 'bg-white border-[#E5E5E5]'}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      data-testid={`domain-value-${domain.name.toLowerCase().replace(/\s/g, '-')}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className={`text-xs font-bold uppercase tracking-[1.5px] ${muted ? 'text-[#CCCCCC]' : 'text-[#1A1A1A]'}`}>{domain.name}</h4>
        {!muted && <DataSourceBadge source={dataSource} />}
      </div>

      {muted ? (
        <p className="text-xs italic text-[#CCCCCC] py-2">{domain.preSignalNote || 'No data entered'}</p>
      ) : (
        <>
          {domain.rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-[#F5F5F5] last:border-b-0">
              <div className="flex-1 min-w-0">
                <span className="text-sm text-[#666666]">{row.label}</span>
                {row.hoursNote && <span className="text-xs text-[#999999] ml-1">({row.hoursNote})</span>}
              </div>
              <span className="text-sm font-semibold text-[#1A1A1A] flex-shrink-0 ml-3">
                {row.metricOnly ? (
                  <span className="text-xs font-medium text-[#999999]">{row.note}</span>
                ) : (
                  row.valueHigh ? formatSmartRange(row.value, row.valueHigh) : formatCurrency(row.value)
                )}
              </span>
            </div>
          ))}
          {dollarRows.length > 1 && (
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#E5E5E5]">
              <span className="text-xs font-semibold text-[#1A1A1A] uppercase">Domain Total</span>
              <span className="text-sm font-bold text-[#EA2C00]">{formatSmartRange(totalLow, totalHigh)}</span>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

interface MeasureAllocateProps {
  state: MeasureState;
  updateState?: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function MeasureAllocate({
  state,
  onNext,
  onBack,
  onHome,
}: MeasureAllocateProps) {
  const confirmed = useMemo(() => calculateConfirmedValue(state), [state]);
  const context = useMemo(() => deriveEngagementContext(state), [state]);
  const domainStatus = useMemo(() => computeDomainStatus(state), [state]);
  const narrative = useMemo(() => generateNarrative('value', state), [state]);
  const months = getMonthsFromGoLive(state.goLiveDate, state.deployment.monthsOnAbridge);

  const careSetting = state.careSetting || "outpatient";
  const isInpatient = careSetting === "inpatient";
  const isED = careSetting === "ed";
  const isNursing = careSetting === "nursing";
  const providerLabel = isNursing ? "nurses" : "providers";
  const d = confirmed.domains;

  const qualityDomain: DomainSection = useMemo(() => {
    const rows: DomainValueRow[] = [];
    if (d.wrvuDelta > 0) {
      rows.push({ label: 'wRVU lift', value: 0, metricOnly: true, note: `+${d.wrvuDelta.toFixed(2)} wRVU/encounter` });
    }
    if (isInpatient && d.qualityValueLow > 0) {
      rows.push({ label: 'CMI improvement', value: d.qualityValueLow, valueHigh: d.qualityValueHigh });
    }
    return { name: 'Quality', status: domainStatus.quality, rows };
  }, [d, domainStatus.quality, isInpatient]);

  const workforceDomain: DomainSection = useMemo(() => {
    const rows: DomainValueRow[] = [];
    if (d.workforceValue > 0) {
      rows.push({ label: 'Efficiency value', value: d.workforceValue, hoursNote: `${formatNumber(Math.round(d.efficiencyHours))} hrs at $${state.calibration.otHourlyRate}/hr` });
    }
    if (d.qualityHoursPerWeek > 0) {
      rows.push({ label: 'Wellbeing hours returned', value: 0, metricOnly: true, note: `${d.qualityHoursPerWeek.toFixed(1)} hrs/provider/wk` });
    }
    return { name: 'Workforce', status: domainStatus.workforce, rows };
  }, [d, state.calibration.otHourlyRate, domainStatus.workforce]);

  const revenueDomain: DomainSection = useMemo(() => {
    const rows: DomainValueRow[] = [];
    if (!isNursing && !isInpatient && d.revenueValueLow > 0) {
      rows.push({ label: 'wRVU revenue impact', value: d.revenueValueLow, valueHigh: d.revenueValueHigh });
    }
    if (isInpatient && d.denialValue > 0) {
      rows.push({ label: 'Denial reduction', value: d.denialValue });
    }
    return { name: 'Revenue', status: domainStatus.revenue, rows };
  }, [d, isNursing, isInpatient, domainStatus.revenue]);

  const capacityLabel = isInpatient ? 'Patient Flow' : isED ? 'Throughput' : 'Capacity';
  const capacityDomain: DomainSection = useMemo(() => {
    const rows: DomainValueRow[] = [];
    if (d.capacityValue > 0) {
      rows.push({ label: `Additional ${isInpatient ? 'throughput' : isED ? 'patients seen' : 'visits'} value`, value: d.capacityValue });
    }
    return {
      name: capacityLabel,
      status: domainStatus.capacity,
      rows,
      preSignalNote: months < 6 ? 'Signal expected at month 6. Too early for capacity data.' : undefined,
    };
  }, [d, isInpatient, isED, capacityLabel, domainStatus.capacity, months]);

  const domains = [qualityDomain, workforceDomain, revenueDomain, capacityDomain];
  const heroValue = formatSmartRange(confirmed.low, confirmed.high);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={4}
        totalSteps={6}
        stepName="What It's Worth"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <EngagementContextBar context={context} dataSource={state.dataSource} organizationName={state.deployment.organizationName} />

        <NarrativePanel narrative={narrative} />

        <motion.div
          className="bg-[#F5F0EB] rounded-xl p-8 text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          data-testid="section-hero-value"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px]">Estimated Annual Value</p>
            <DataSourceBadge source={state.dataSource} />
          </div>
          <p className="text-5xl md:text-[56px] font-bold text-[#EA2C00] mb-3" data-testid="text-hero-value">
            {heroValue}
          </p>
          <p className="text-sm text-[#666666]">
            Across {state.deployment.providers} {providerLabel} at {state.deployment.utilizationRate}% adoption
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2">
            <h2 className="text-xs font-bold uppercase tracking-[1.5px] text-[#1A1A1A] mb-4">What the Math Shows</h2>
            {domains.map((dd, i) => (
              <DomainValueCard key={dd.name} domain={dd} dataSource={state.dataSource} delay={0.15 + i * 0.07} />
            ))}

            <motion.div
              className="bg-[#F9F7F4] rounded-lg border border-[#E8E2DA] p-4 mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#1A1A1A]">Total Estimated Value</span>
                <span className="text-lg font-bold text-[#EA2C00]" data-testid="text-total-value">{heroValue}</span>
              </div>
              <p className="text-[10px] text-[#999999]">
                Standard methodology: 50% efficiency, 30% capacity, 20% wellbeing allocation. Talk to your CSM to discuss org-specific adjustments.
              </p>
            </motion.div>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[1.5px] text-[#999999] mb-4">Also Real. Not Quantified.</h2>
            <motion.div
              className="bg-[#FAFAFA] rounded-lg border border-[#F0F0F0] p-5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              data-testid="section-not-counted"
            >
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[#666666] leading-relaxed">
                    Physician satisfaction and retention sentiment {"–"} real effects, not traceable to a single documented encounter
                  </p>
                </div>
                <div className="h-px bg-[#F0F0F0]" />
                <div>
                  <p className="text-sm text-[#666666] leading-relaxed">
                    Patient experience correlation {"–"} directional signal, not attributable
                  </p>
                </div>
                <div className="h-px bg-[#F0F0F0]" />
                <div>
                  <p className="text-sm text-[#666666] leading-relaxed">
                    Recruitment differentiation {"–"} documented but not dollarized
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-[#E5E5E5]">
                <p className="text-xs text-[#999999] italic leading-relaxed">
                  We only put dollar signs on what we can trace directly to your documented encounters. Everything else is real {"–"} and worth naming in the right conversation.
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div 
          className="flex justify-center relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            onClick={onNext}
            className="h-[52px] px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-next"
          >
            Where You{"'"}re Going
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
