import { useMemo } from "react";
import { ArrowRight, ArrowUpRight, Clock, FileText, TrendingUp, Heart, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { 
  type MeasureState, 
  calculateMeasureResults, 
  formatPercent,
  formatNumber,
} from "@/lib/measureCalculator";

interface MeasureTransformationProps {
  state: MeasureState;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

function ComparisonCard({ 
  icon: Icon,
  title,
  beforeValue,
  afterValue,
  beforeLabel,
  afterLabel,
  deltaText,
  insight,
  perProviderNote,
  delay = 0,
}: {
  icon: typeof Clock;
  title: string;
  beforeValue: number;
  afterValue: number;
  beforeLabel: string;
  afterLabel: string;
  deltaText: string;
  insight: string;
  perProviderNote?: string;
  delay?: number;
}) {
  const maxVal = Math.max(beforeValue, afterValue, 0.1);
  const beforeWidth = Math.max((beforeValue / maxVal) * 100, 5);
  const afterWidth = Math.max((afterValue / maxVal) * 100, 5);

  return (
    <motion.div
      className="bg-white rounded-lg border border-[#E5E5E5] p-5"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[#FFF5F2] flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#EA2C00]" />
        </div>
        <h3 className="text-base font-semibold text-black">{title}</h3>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-[#888888] w-14 uppercase tracking-[1px]">Before</span>
          <div className="flex-1 h-8 bg-[#F5F5F5] rounded overflow-hidden relative">
            <motion.div 
              className="h-full bg-[#D1D5DB] rounded flex items-center px-3"
              initial={{ width: 0 }}
              animate={{ width: `${beforeWidth}%` }}
              transition={{ delay: delay + 0.2, duration: 0.5, ease: "easeOut" }}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-black">
              {beforeLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-[#888888] w-14 uppercase tracking-[1px]">After</span>
          <div className="flex-1 h-8 bg-[#FFF5F2] rounded overflow-hidden relative">
            <motion.div 
              className="h-full bg-[#EA2C00] rounded flex items-center px-3"
              initial={{ width: 0 }}
              animate={{ width: `${afterWidth}%` }}
              transition={{ delay: delay + 0.3, duration: 0.5, ease: "easeOut" }}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-black">
              {afterLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <motion.div 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E5E5] rounded"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.5, duration: 0.3 }}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-black" />
          <span className="text-[13px] font-medium text-black">{deltaText}</span>
        </motion.div>
        <p className="text-sm text-[#666666] italic">{insight}</p>
      </div>

      {perProviderNote && (
        <p className="text-xs text-[#999999] mt-3">{perProviderNote}</p>
      )}
    </motion.div>
  );
}

export default function MeasureTransformation({ 
  state, 
  onNext, 
  onBack,
  onHome,
}: MeasureTransformationProps) {
  const results = useMemo(() => calculateMeasureResults(state), [state]);
  const careSetting = state.careSetting || "outpatient";
  const isInpatient = careSetting === "inpatient";
  const isED = careSetting === "ed";
  const isNursing = careSetting === "nursing";
  const inpatientMetrics = state.settingData?.inpatient || {};
  const edMetrics = state.settingData?.ed || {};
  const nursingMetrics = state.settingData?.nursing || {};

  const timeReclaimed = Math.max(0, state.timeEfficiency.timeInNotesWithout - state.timeEfficiency.timeInNotesWith);
  const pajamaTimeSaved = Math.max(0, state.timeEfficiency.workOutsideWithout - state.timeEfficiency.workOutsideWith);

  const totalHoursSaved = (timeReclaimed * state.deployment.totalEncounters) / 60;
  const hoursPerProvider = state.deployment.providers > 0 ? Math.round(totalHoursSaved / state.deployment.providers) : 0;

  const adoptedEncounters = Math.round(state.deployment.totalEncounters * (state.deployment.utilizationRate / 100));
  const nonAdoptedEncounters = state.deployment.totalEncounters - adoptedEncounters;

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={2}
        totalSteps={5}
        stepName="What Changed"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight" data-testid="text-page-title">
            What Changed
          </h1>
          <p className="text-base text-[#888888]" data-testid="text-page-subtitle">
            Same providers. Same patients. Different documentation experience.
          </p>
        </motion.div>

        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-5 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          data-testid="section-stats-banner"
        >
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="border-l-4 border-[#EA2C00] pl-3">
              <p className="text-2xl md:text-3xl font-bold text-black">{state.deployment.providers}</p>
              <p className="text-[11px] text-[#888888] uppercase tracking-[1.5px]">Providers</p>
            </div>
            <div className="border-l-4 border-[#EA2C00] pl-3">
              <p className="text-2xl md:text-3xl font-bold text-black">{formatNumber(state.deployment.totalEncounters)}</p>
              <p className="text-[11px] text-[#888888] uppercase tracking-[1.5px]">{isInpatient ? "Discharges" : isNursing ? "Shifts" : "Encounters"}</p>
            </div>
            <div className="border-l-4 border-[#EA2C00] pl-3">
              <p className="text-2xl md:text-3xl font-bold text-black">{state.deployment.utilizationRate}%</p>
              <p className="text-[11px] text-[#888888] uppercase tracking-[1.5px]">Adoption</p>
            </div>
            <div className="border-l-4 border-[#EA2C00] pl-3">
              <p className="text-2xl md:text-3xl font-bold text-black">{state.deployment.monthsOnAbridge}mo</p>
              <p className="text-[11px] text-[#888888] uppercase tracking-[1.5px]">On Abridge</p>
            </div>
            <div className="border-l-4 border-[#EA2C00] pl-3">
              <p className="text-2xl md:text-3xl font-bold text-black">{hoursPerProvider} hrs</p>
              <p className="text-[11px] text-[#888888] uppercase tracking-[1.5px]">Saved Per Provider</p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-4 mb-6">
          <ComparisonCard
            icon={Clock}
            title={isNursing ? "Charting Time" : "Documentation Time"}
            beforeValue={state.timeEfficiency.timeInNotesWithout}
            afterValue={state.timeEfficiency.timeInNotesWith}
            beforeLabel={`${state.timeEfficiency.timeInNotesWithout} min`}
            afterLabel={`${state.timeEfficiency.timeInNotesWith} min`}
            deltaText={`${timeReclaimed} min saved per ${isNursing ? "shift" : "note"}`}
            insight={isNursing ? "Time returned to bedside care" : "Time returned to patient care"}
            perProviderNote={`Per provider: ${hoursPerProvider} hours saved over ${state.deployment.monthsOnAbridge} months`}
            delay={0.15}
          />

          {isInpatient && (
            <>
              <ComparisonCard
                icon={FileText}
                title="CMI"
                beforeValue={inpatientMetrics.cmi_before ?? 0}
                afterValue={inpatientMetrics.cmi_after ?? 0}
                beforeLabel={(inpatientMetrics.cmi_before ?? 0).toFixed(2)}
                afterLabel={(inpatientMetrics.cmi_after ?? 0).toFixed(2)}
                deltaText={`+${((inpatientMetrics.cmi_after ?? 0) - (inpatientMetrics.cmi_before ?? 0)).toFixed(2)} CMI improvement`}
                insight="Higher acuity capture per discharge"
                delay={0.25}
              />

              <ComparisonCard
                icon={TrendingUp}
                title="Denials per 100 Claims"
                beforeValue={inpatientMetrics.denialsPer100_before ?? 0}
                afterValue={inpatientMetrics.denialsPer100_after ?? 0}
                beforeLabel={`${(inpatientMetrics.denialsPer100_before ?? 0).toFixed(1)}`}
                afterLabel={`${(inpatientMetrics.denialsPer100_after ?? 0).toFixed(1)}`}
                deltaText={`${((inpatientMetrics.denialsPer100_before ?? 0) - (inpatientMetrics.denialsPer100_after ?? 0)).toFixed(1)} fewer per 100`}
                insight="Reduced rework and revenue leakage"
                delay={0.35}
              />

              <ComparisonCard
                icon={Info}
                title="CDI Queries per 100 Cases"
                beforeValue={inpatientMetrics.cdiQueriesPer100_before ?? 0}
                afterValue={inpatientMetrics.cdiQueriesPer100_after ?? 0}
                beforeLabel={`${inpatientMetrics.cdiQueriesPer100_before ?? 0}`}
                afterLabel={`${inpatientMetrics.cdiQueriesPer100_after ?? 0}`}
                deltaText={`${((inpatientMetrics.cdiQueriesPer100_before ?? 0) - (inpatientMetrics.cdiQueriesPer100_after ?? 0))} fewer per 100`}
                insight="Less CDI follow-up needed"
                delay={0.45}
              />

              <ComparisonCard
                icon={TrendingUp}
                title="Same-Day Completion"
                beforeValue={state.timeEfficiency.sameDayClosureWithout}
                afterValue={state.timeEfficiency.sameDayClosureWith}
                beforeLabel={`${state.timeEfficiency.sameDayClosureWithout}%`}
                afterLabel={`${state.timeEfficiency.sameDayClosureWith}%`}
                deltaText={`+${results.sameDayClosureDelta} percentage points`}
                insight="Notes completed same day"
                delay={0.55}
              />
            </>
          )}

          {isED && (
            <>
              <ComparisonCard
                icon={TrendingUp}
                title="Door-to-Doc Time"
                beforeValue={state.timeEfficiency.timeToCloseWithout}
                afterValue={state.timeEfficiency.timeToCloseWith}
                beforeLabel={`${state.timeEfficiency.timeToCloseWithout} min`}
                afterLabel={`${state.timeEfficiency.timeToCloseWith} min`}
                deltaText={`${Math.max(0, state.timeEfficiency.timeToCloseWithout - state.timeEfficiency.timeToCloseWith)} min faster`}
                insight="Patients seen sooner"
                delay={0.25}
              />

              <ComparisonCard
                icon={Heart}
                title="LWBS Rate"
                beforeValue={state.timeEfficiency.sameDayClosureWithout}
                afterValue={state.timeEfficiency.sameDayClosureWith}
                beforeLabel={`${state.timeEfficiency.sameDayClosureWithout}%`}
                afterLabel={`${state.timeEfficiency.sameDayClosureWith}%`}
                deltaText={`${Math.max(0, state.timeEfficiency.sameDayClosureWithout - state.timeEfficiency.sameDayClosureWith).toFixed(1)} pp reduction`}
                insight="Fewer patients leaving without being seen"
                delay={0.35}
              />

              {(state.documentationQuality.emLevelWithout > 0 || state.documentationQuality.emLevelWith > 0) && (
                <ComparisonCard
                  icon={FileText}
                  title="E/M Level"
                  beforeValue={state.documentationQuality.emLevelWithout}
                  afterValue={state.documentationQuality.emLevelWith}
                  beforeLabel={state.documentationQuality.emLevelWithout.toFixed(2)}
                  afterLabel={state.documentationQuality.emLevelWith.toFixed(2)}
                  deltaText={`+${(state.documentationQuality.emLevelWith - state.documentationQuality.emLevelWithout).toFixed(2)} level improvement`}
                  insight="More accurate acuity capture"
                  delay={0.45}
                />
              )}

              <ComparisonCard
                icon={Heart}
                title="After-Hours Work"
                beforeValue={state.timeEfficiency.workOutsideWithout}
                afterValue={state.timeEfficiency.workOutsideWith}
                beforeLabel={`${state.timeEfficiency.workOutsideWithout.toFixed(1)} hrs`}
                afterLabel={`${state.timeEfficiency.workOutsideWith.toFixed(1)} hrs`}
                deltaText={`${pajamaTimeSaved.toFixed(1)} hours back per day`}
                insight="Less charting after shifts"
                delay={0.55}
              />
            </>
          )}

          {isNursing && (
            <>
              <ComparisonCard
                icon={Heart}
                title="Overtime Hours"
                beforeValue={state.timeEfficiency.workOutsideWithout}
                afterValue={state.timeEfficiency.workOutsideWith}
                beforeLabel={`${state.timeEfficiency.workOutsideWithout.toFixed(1)} hrs/wk`}
                afterLabel={`${state.timeEfficiency.workOutsideWith.toFixed(1)} hrs/wk`}
                deltaText={`${pajamaTimeSaved.toFixed(1)} fewer overtime hours`}
                insight="Reduced overtime burden"
                delay={0.25}
              />

              {((nursingMetrics.turnoverRate_before ?? 0) > 0 || (nursingMetrics.turnoverRate_after ?? 0) > 0) && (
                <ComparisonCard
                  icon={TrendingUp}
                  title="Turnover Rate"
                  beforeValue={nursingMetrics.turnoverRate_before ?? 0}
                  afterValue={nursingMetrics.turnoverRate_after ?? 0}
                  beforeLabel={`${(nursingMetrics.turnoverRate_before ?? 0).toFixed(1)}%`}
                  afterLabel={`${(nursingMetrics.turnoverRate_after ?? 0).toFixed(1)}%`}
                  deltaText={`${Math.max(0, (nursingMetrics.turnoverRate_before ?? 0) - (nursingMetrics.turnoverRate_after ?? 0)).toFixed(1)} pp reduction`}
                  insight="Improved nurse retention"
                  delay={0.35}
                />
              )}

              {((nursingMetrics.fallsRate_before ?? 0) > 0 || (nursingMetrics.fallsRate_after ?? 0) > 0) && (
                <ComparisonCard
                  icon={Info}
                  title="Falls Rate (per 1,000)"
                  beforeValue={nursingMetrics.fallsRate_before ?? 0}
                  afterValue={nursingMetrics.fallsRate_after ?? 0}
                  beforeLabel={`${(nursingMetrics.fallsRate_before ?? 0).toFixed(1)}`}
                  afterLabel={`${(nursingMetrics.fallsRate_after ?? 0).toFixed(1)}`}
                  deltaText={`${Math.max(0, (nursingMetrics.fallsRate_before ?? 0) - (nursingMetrics.fallsRate_after ?? 0)).toFixed(1)} fewer per 1,000`}
                  insight="Safer patient outcomes"
                  delay={0.45}
                />
              )}

              {((nursingMetrics.hapiRate_before ?? 0) > 0 || (nursingMetrics.hapiRate_after ?? 0) > 0) && (
                <ComparisonCard
                  icon={Info}
                  title="HAPI Rate (per 1,000)"
                  beforeValue={nursingMetrics.hapiRate_before ?? 0}
                  afterValue={nursingMetrics.hapiRate_after ?? 0}
                  beforeLabel={`${(nursingMetrics.hapiRate_before ?? 0).toFixed(1)}`}
                  afterLabel={`${(nursingMetrics.hapiRate_after ?? 0).toFixed(1)}`}
                  deltaText={`${Math.max(0, (nursingMetrics.hapiRate_before ?? 0) - (nursingMetrics.hapiRate_after ?? 0)).toFixed(1)} fewer per 1,000`}
                  insight="Reduced hospital-acquired injuries"
                  delay={0.55}
                />
              )}
            </>
          )}

          {!isInpatient && !isED && !isNursing && (
            <>
              <ComparisonCard
                icon={FileText}
                title="Revenue Capture"
                beforeValue={state.documentationQuality.wrvuWithout}
                afterValue={state.documentationQuality.wrvuWith}
                beforeLabel={state.documentationQuality.wrvuWithout.toFixed(2)}
                afterLabel={state.documentationQuality.wrvuWith.toFixed(2)}
                deltaText={`${formatPercent(results.wrvuDeltaPercent, true)} per encounter`}
                insight="Capturing clinical complexity"
                delay={0.25}
              />

              <ComparisonCard
                icon={TrendingUp}
                title="Same-Day Closure"
                beforeValue={state.timeEfficiency.sameDayClosureWithout}
                afterValue={state.timeEfficiency.sameDayClosureWith}
                beforeLabel={`${state.timeEfficiency.sameDayClosureWithout}%`}
                afterLabel={`${state.timeEfficiency.sameDayClosureWith}%`}
                deltaText={`+${results.sameDayClosureDelta} percentage points`}
                insight="Documentation completed during the visit"
                delay={0.35}
              />

              <ComparisonCard
                icon={Heart}
                title="Work-Life Balance"
                beforeValue={state.timeEfficiency.workOutsideWithout}
                afterValue={state.timeEfficiency.workOutsideWith}
                beforeLabel={`${state.timeEfficiency.workOutsideWithout.toFixed(1)} hrs`}
                afterLabel={`${state.timeEfficiency.workOutsideWith.toFixed(1)} hrs`}
                deltaText={`${pajamaTimeSaved.toFixed(1)} hours back per day`}
                insight="Evenings reclaimed"
                delay={0.45}
              />
            </>
          )}
        </div>

        {state.deployment.utilizationRate < 100 && (
          <motion.div
            className="bg-[#F5F0EB] rounded-lg p-5 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            data-testid="section-headroom"
          >
            <div className="flex items-start gap-3">
              <div className="w-1 bg-[#EA2C00] rounded-full self-stretch flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-[1.5px] mb-2">
                  At {state.deployment.utilizationRate}% Adoption
                </p>
                <p className="text-xs text-[#666666] leading-relaxed">
                  These results are based on {formatNumber(adoptedEncounters)} of your {formatNumber(state.deployment.totalEncounters)} {isInpatient ? "discharges" : isNursing ? "shifts" : "encounters"}. The remaining {formatNumber(nonAdoptedEncounters)} {isInpatient ? "discharges are" : isNursing ? "shifts are" : "encounters are"} still being documented without Abridge{'\u2014'}representing additional headroom within your current providers.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-base text-[#666666] italic">
            Here's what this means for your organization.
          </p>
        </motion.div>

        <motion.div 
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Button
            onClick={onNext}
            className="h-11 px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-see-value"
          >
            See the Value
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
