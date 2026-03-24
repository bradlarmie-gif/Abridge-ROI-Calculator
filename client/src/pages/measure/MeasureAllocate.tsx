import { useMemo } from "react";
import { ArrowRight, TrendingUp, Clock, DollarSign, Activity, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { 
  type MeasureState, 
  type DataSource,
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

const DOMAIN_ICONS: Record<string, typeof TrendingUp> = {
  Workforce: Clock,
  Revenue: DollarSign,
  Quality: Activity,
  Capacity: TrendingUp,
  'Patient Flow': TrendingUp,
  Throughput: TrendingUp,
};

interface DomainCardData {
  name: string;
  icon: typeof TrendingUp;
  valueLow: number;
  valueHigh: number;
  detail: string;
  active: boolean;
  inactiveNote?: string;
}

function DomainBreakdownCard({ domain, delay = 0 }: { domain: DomainCardData; delay?: number }) {
  return (
    <motion.div
      className={`rounded-xl border p-5 ${domain.active ? 'bg-[#FAF8F5] border-[#E8E2DA]' : 'bg-[#FAFAFA] border-[#F0F0F0]'}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      data-testid={`domain-card-${domain.name.toLowerCase().replace(/\s/g, '-')}`}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${domain.active ? 'bg-[#EA2C00]/10' : 'bg-[#F0F0F0]'}`}>
          <domain.icon className={`w-4 h-4 ${domain.active ? 'text-[#EA2C00]' : 'text-[#CCCCCC]'}`} />
        </div>
        <h4 className={`text-xs font-bold uppercase tracking-[1.5px] ${domain.active ? 'text-[#1A1A1A]' : 'text-[#CCCCCC]'}`}>
          {domain.name}
        </h4>
      </div>

      {domain.active ? (
        <>
          <p className="text-2xl font-bold text-[#1A1A1A] mb-1" data-testid={`domain-value-${domain.name.toLowerCase().replace(/\s/g, '-')}`}>
            {formatSmartRange(domain.valueLow, domain.valueHigh)}
          </p>
          <p className="text-xs text-[#888888] leading-relaxed">{domain.detail}</p>
        </>
      ) : (
        <p className="text-xs italic text-[#CCCCCC] py-1">{domain.inactiveNote || 'No data entered'}</p>
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

  const attributionDelta = confirmed.high - confirmed.low;
  const perPoint = attributionDelta / 25;
  const impactLow = confirmed.high;
  const impactHigh = confirmed.high + perPoint * 15;

  const heroValue = formatSmartRange(Math.round(impactLow), Math.round(impactHigh));

  const wrvuDelta = state.documentationQuality.wrvuWith - state.documentationQuality.wrvuWithout;
  const timeSavedPerNote = Math.max(0, state.timeEfficiency.timeInNotesWithout - state.timeEfficiency.timeInNotesWith);
  const adoptedEncounters = Math.round(state.deployment.totalEncounters * (state.deployment.encounterCoverageRate / 100));

  const workforceScaleLow = 75 / 50;
  const workforceScaleHigh = 90 / 50;

  const domainCards: DomainCardData[] = useMemo(() => {
    const cards: DomainCardData[] = [];

    const wfActive = domainStatus.workforce !== 'no-data' && d.workforceValue > 0;
    cards.push({
      name: 'Workforce',
      icon: Clock,
      valueLow: wfActive ? Math.round(d.workforceValue * workforceScaleLow) : 0,
      valueHigh: wfActive ? Math.round(d.workforceValue * workforceScaleHigh) : 0,
      detail: wfActive
        ? `${formatNumber(Math.round(d.efficiencyHours))} hours reclaimed across ${state.deployment.providers} ${providerLabel}`
        : '',
      active: wfActive,
      inactiveNote: 'Time efficiency data not yet entered',
    });

    if (!isNursing) {
      const revActive = domainStatus.revenue !== 'no-data' && (d.revenueValueLow > 0 || d.revenueValueHigh > 0);
      const revLow = d.revenueValueLow * (75 / 50);
      const revHigh = d.revenueValueHigh * (90 / 75);
      cards.push({
        name: 'Revenue',
        icon: DollarSign,
        valueLow: revActive ? Math.round(revLow) : 0,
        valueHigh: revActive ? Math.round(revHigh) : 0,
        detail: revActive
          ? isInpatient
            ? 'CMI improvement and denial reduction impact'
            : wrvuDelta > 0 ? `+${wrvuDelta.toFixed(2)} wRVU lift per encounter` : 'Revenue capture improvement'
          : '',
        active: revActive,
        inactiveNote: 'Revenue metrics not yet entered',
      });
    }

    const capLabel = isInpatient ? 'Patient Flow' : isED ? 'Throughput' : 'Capacity';
    const capActive = domainStatus.capacity !== 'no-data' && d.capacityValue > 0;
    cards.push({
      name: capLabel,
      icon: TrendingUp,
      valueLow: capActive ? Math.round(d.capacityValue * workforceScaleLow) : 0,
      valueHigh: capActive ? Math.round(d.capacityValue * workforceScaleHigh) : 0,
      detail: capActive
        ? isED ? 'Additional patients seen from throughput gains' : 'Additional visits from reclaimed time'
        : '',
      active: capActive,
      inactiveNote: months < 6 ? 'Signal expected at month 6' : 'Capacity data not yet entered',
    });

    const qualActive = domainStatus.quality !== 'no-data' && (d.qualityValueLow > 0 || d.qualityValueHigh > 0 || d.qualityHoursPerWeek > 0);
    cards.push({
      name: 'Quality',
      icon: Heart,
      valueLow: qualActive ? Math.round(d.qualityValueLow * workforceScaleLow) : 0,
      valueHigh: qualActive ? Math.round(d.qualityValueHigh * workforceScaleHigh) : 0,
      detail: qualActive
        ? d.qualityHoursPerWeek > 0
          ? `${d.qualityHoursPerWeek.toFixed(1)} hrs/provider/wk returned to wellbeing`
          : isInpatient ? 'CMI-driven quality improvement' : 'Documentation quality gains'
        : '',
      active: qualActive,
      inactiveNote: 'Quality metrics not yet entered',
    });

    return cards;
  }, [d, domainStatus, state.deployment.providers, providerLabel, isInpatient, isED, isNursing, wrvuDelta, months, workforceScaleLow, workforceScaleHigh]);

  const activeDomains = domainCards.filter(dc => dc.active);
  const inactiveDomains = domainCards.filter(dc => !dc.active);
  const encounterLabel = isInpatient ? "discharges" : isNursing ? "shifts" : "encounters";

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={5}
        totalSteps={7}
        stepName="Your Estimated Impact"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <EngagementContextBar context={context} dataSource={state.dataSource} organizationName={state.deployment.organizationName} deployment={state.deployment} />

        <NarrativePanel narrative={narrative} />

        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight" data-testid="text-page-title">
            Your Estimated Impact
          </h1>
          <p className="text-base text-[#888888]">
            Based on your data, here{"'"}s what Abridge is delivering across your organization.
          </p>
        </motion.div>

        <motion.div
          className="bg-[#FAF8F5] rounded-xl border border-[#E8E2DA] p-8 text-center mb-8"
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
          <p className="text-sm text-[#888888] mb-1">
            Across {formatNumber(state.deployment.mruProviders !== undefined ? state.deployment.mruProviders : state.deployment.providers)} active {providerLabel} covering {formatNumber(state.deployment.abridgeEncounters > 0 ? state.deployment.abridgeEncounters : adoptedEncounters)} of {formatNumber(state.deployment.totalEncounters)} encounters
          </p>
          <p className="text-xs text-[#AAAAAA]">
            75{"\u2013"}90% of observed improvement attributed to Abridge
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <h2 className="text-xs font-bold uppercase tracking-[1.5px] text-[#1A1A1A] mb-4">Value by Domain</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeDomains.map((dc, i) => (
              <DomainBreakdownCard key={dc.name} domain={dc} delay={0.2 + i * 0.07} />
            ))}
          </div>
          {inactiveDomains.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {inactiveDomains.map((dc, i) => (
                <DomainBreakdownCard key={dc.name} domain={dc} delay={0.35 + i * 0.07} />
              ))}
            </div>
          )}
        </motion.div>

        {(timeSavedPerNote > 0 || wrvuDelta > 0) && (
          <motion.div
            className="bg-[#FAF8F5] rounded-xl border border-[#E8E2DA] p-6 mb-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            data-testid="section-formula"
          >
            <h3 className="text-xs font-bold uppercase tracking-[1.5px] text-[#1A1A1A] mb-4">Show Your Work</h3>

            {timeSavedPerNote > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-3.5 h-3.5 text-[#EA2C00]" />
                  <span className="text-xs font-semibold text-[#666666] uppercase tracking-wider">Time Efficiency</span>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[#E8E2DA]">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-[#1A1A1A]">{timeSavedPerNote} min</p>
                      <p className="text-[10px] text-[#999999] uppercase">saved per note</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[#1A1A1A]">{formatNumber(adoptedEncounters)}</p>
                      <p className="text-[10px] text-[#999999] uppercase">adopted {encounterLabel}</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[#EA2C00]">{formatNumber(Math.round(d.totalHoursSaved))}</p>
                      <p className="text-[10px] text-[#999999] uppercase">hours reclaimed</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {wrvuDelta > 0 && !isNursing && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-3.5 h-3.5 text-[#EA2C00]" />
                  <span className="text-xs font-semibold text-[#666666] uppercase tracking-wider">Documentation Quality</span>
                </div>
                <div className="bg-white rounded-lg p-4 border border-[#E8E2DA]">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-[#1A1A1A]">+{wrvuDelta.toFixed(2)}</p>
                      <p className="text-[10px] text-[#999999] uppercase">wRVU delta</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[#1A1A1A]">${state.calibration.conversionFactor}</p>
                      <p className="text-[10px] text-[#999999] uppercase">conversion factor</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[#EA2C00]">{formatSmartRange(Math.round(d.revenueValueHigh), Math.round(d.revenueValueHigh * (90 / 75)))}</p>
                      <p className="text-[10px] text-[#999999] uppercase">revenue impact</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <p className="text-[10px] text-[#AAAAAA] mt-4 italic leading-relaxed">
              Values reflect 75{"\u2013"}90% attribution to Abridge. Methodology: efficiency hours valued at opportunity cost, wRVU lift credited at observed capture rates.
            </p>
          </motion.div>
        )}

        <motion.div
          className="bg-[#FAFAFA] rounded-xl border border-[#F0F0F0] p-5 mb-8 max-w-lg mx-auto"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          data-testid="section-not-counted"
        >
          <h3 className="text-xs font-bold uppercase tracking-[1.5px] text-[#999999] mb-3">Also Real. Not Quantified.</h3>
          <div className="space-y-2">
            {[
              'Physician satisfaction and retention',
              'Patient experience correlation',
              'Recruitment differentiation',
            ].map((item) => (
              <p key={item} className="text-sm text-[#888888] leading-relaxed">{"\u2022"} {item}</p>
            ))}
          </div>
          <p className="text-[10px] text-[#AAAAAA] mt-3 italic">
            Dollar signs only where we can trace directly to documented encounters.
          </p>
        </motion.div>

        <motion.div 
          className="flex justify-center relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <Button
            onClick={onNext}
            className="h-[52px] px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-next"
          >
            What Adoption Could Mean
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
