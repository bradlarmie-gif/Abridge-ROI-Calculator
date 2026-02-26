import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { Checkbox } from "@/components/ui/checkbox";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import type { NursingDomain, NursingLevel, NursingDomainState, NursingBaselineInputs } from "./nursingTypes";
import {
  NURSING_DOMAIN_ORDER, NURSING_DOMAIN_LABELS, NURSING_DOMAIN_CONFIGS,
  WORKFORCE_TURNOVER_DRIVERS, WORKFORCE_RETENTION_INTERVENTIONS,
  LABOR_MANAGEMENT_INTERVENTIONS,
  EXPERIENCE_MEASURING, EXPERIENCE_STRATEGY_AREAS,
  QUALITY_GAPS, QUALITY_METRICS, QUALITY_GOVERNANCE,
} from "./nursingTypes";
import { computeDomainFeedback, type DomainFeedback } from "./nursingCalculations";

interface NursingDomainScreenProps {
  baseline: NursingBaselineInputs;
  domainStates: Record<NursingDomain, NursingDomainState>;
  setDomainStates: React.Dispatch<React.SetStateAction<Record<NursingDomain, NursingDomainState>>>;
  onNext: () => void;
  onBack: () => void;
}

function FormulaDisplay({ formula }: { formula: string }) {
  if (!formula) return null;
  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <p className="text-[10px] font-medium text-white/40 uppercase tracking-[1.5px] mb-2">Formula</p>
      {formula.split('\n').map((line, i) => (
        <p key={i} className="text-[11px] text-white/50 italic leading-relaxed font-mono">{line}</p>
      ))}
    </div>
  );
}

export default function NursingDomainScreen({
  baseline,
  domainStates,
  setDomainStates,
  onNext,
  onBack,
}: NursingDomainScreenProps) {
  const [activeDomain, setActiveDomain] = useState<NursingDomain>('workforce');

  const currentState = domainStates[activeDomain];
  const config = NURSING_DOMAIN_CONFIGS[activeDomain];
  const activeIdx = NURSING_DOMAIN_ORDER.indexOf(activeDomain);

  const setLevel = useCallback((level: NursingLevel) => {
    setDomainStates(prev => ({
      ...prev,
      [activeDomain]: { ...prev[activeDomain], level },
    }));
  }, [activeDomain, setDomainStates]);

  const setInput = useCallback((key: string, value: string | number) => {
    setDomainStates(prev => ({
      ...prev,
      [activeDomain]: {
        ...prev[activeDomain],
        inputs: { ...prev[activeDomain].inputs, [key]: value },
      },
    }));
  }, [activeDomain, setDomainStates]);

  const toggleCheckbox = useCallback((key: string, index: number) => {
    const current = (currentState.inputs[key] as string) || '';
    const set = new Set(current.split(',').filter(Boolean));
    const idx = String(index);
    if (set.has(idx)) set.delete(idx); else set.add(idx);
    setInput(key, Array.from(set).join(','));
  }, [currentState.inputs, setInput]);

  const isChecked = useCallback((key: string, index: number): boolean => {
    const current = (currentState.inputs[key] as string) || '';
    return current.split(',').filter(Boolean).includes(String(index));
  }, [currentState.inputs]);

  const feedback = useMemo((): DomainFeedback | null => {
    if (!currentState.level) return null;
    return computeDomainFeedback(activeDomain, currentState.level, currentState.inputs, baseline);
  }, [activeDomain, currentState.level, currentState.inputs, baseline]);

  const handleAdvance = () => {
    const idx = NURSING_DOMAIN_ORDER.indexOf(activeDomain);
    if (idx < NURSING_DOMAIN_ORDER.length - 1) {
      setActiveDomain(NURSING_DOMAIN_ORDER[idx + 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onNext();
    }
  };

  const handleDomainBack = () => {
    const idx = NURSING_DOMAIN_ORDER.indexOf(activeDomain);
    if (idx > 0) {
      setActiveDomain(NURSING_DOMAIN_ORDER[idx - 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onBack();
    }
  };

  const renderWorkforceInputs = () => {
    const level = currentState.level;
    if (!level) return null;

    if (level === 1) {
      return (
        <p className="text-sm text-[#888888] italic">
          No additional inputs needed. Your retention is stable.
        </p>
      );
    }

    const turnoverInput = (
      <>
        <div className="mb-5">
          <label className="block text-sm font-medium text-black mb-1">Annual RN turnover rate</label>
          <div className="flex items-center gap-2">
            <FormattedNumberInput
              value={(currentState.inputs.turnoverRate as number) || 0}
              onChange={(v) => setInput('turnoverRate', Math.min(100, Math.max(0, v)))}
              placeholder=""
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-turnover-rate"
            />
            <span className="text-sm text-[#888888]">%</span>
          </div>
          <p className="text-xs text-[#999999] italic mt-2">National average: 18–22% (NSI Nursing Solutions)</p>
        </div>
        <div className="mb-5">
          <label className="block text-sm font-medium text-black mb-1">Average cost to replace an RN</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={(currentState.inputs.replacementCost as number) || 0}
              onChange={(v) => setInput('replacementCost', Math.max(0, v))}
              placeholder=""
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-replacement-cost"
            />
          </div>
          <p className="text-xs text-[#999999] italic mt-2">Industry range: $40K–$65K per RN (NSI Nursing Solutions)</p>
        </div>
      </>
    );

    if (level === 2) return turnoverInput;

    if (level === 3) {
      return (
        <>
          {turnoverInput}
          <div>
            <label className="block text-sm font-medium text-black mb-3">What is driving turnover? (select all that apply)</label>
            <div className="flex flex-col gap-2.5">
              {WORKFORCE_TURNOVER_DRIVERS.map((driver, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Checkbox
                    id={`turnover-driver-${i}`}
                    checked={isChecked('turnoverDrivers', i)}
                    onCheckedChange={() => toggleCheckbox('turnoverDrivers', i)}
                    data-testid={`checkbox-turnover-driver-${i}`}
                  />
                  <label htmlFor={`turnover-driver-${i}`} className="text-sm text-[#525252] cursor-pointer select-none leading-snug">
                    {driver}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        {turnoverInput}
        <div>
          <label className="block text-sm font-medium text-black mb-3">What retention interventions are in place?</label>
          <div className="flex flex-col gap-2.5">
            {WORKFORCE_RETENTION_INTERVENTIONS.map((intervention, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Checkbox
                  id={`retention-intervention-${i}`}
                  checked={isChecked('retentionInterventions', i)}
                  onCheckedChange={() => toggleCheckbox('retentionInterventions', i)}
                  data-testid={`checkbox-retention-intervention-${i}`}
                />
                <label htmlFor={`retention-intervention-${i}`} className="text-sm text-[#525252] cursor-pointer select-none leading-snug">
                  {intervention}
                </label>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  const renderLaborCostInputs = () => {
    const level = currentState.level;
    if (!level) return null;

    if (level === 1) {
      return (
        <p className="text-sm text-[#888888] italic">
          No additional inputs needed.
        </p>
      );
    }

    if (level === 2) {
      const docOTFactor = currentState.inputs.docOTFactor as string;
      return (
        <>
          <div className="mb-5">
            <label className="block text-sm font-medium text-black mb-3">Is end-of-shift documentation a factor in nursing overtime?</label>
            <div className="flex flex-col gap-2.5">
              {[
                { id: 'no', label: 'Not significantly' },
                { id: 'yes', label: 'Yes — nurses regularly stay late to finish charting' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setInput('docOTFactor', opt.id)}
                  className={`rounded-lg p-4 text-left text-sm transition-all cursor-pointer ${
                    docOTFactor === opt.id
                      ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                      : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                  }`}
                  data-testid={`radio-doc-ot-${opt.id}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <AnimatePresence>
            {docOTFactor === 'yes' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-medium text-black mb-1">
                  Estimated OT minutes per nurse per shift attributable to documentation
                </label>
                <div className="flex items-center gap-2">
                  <FormattedNumberInput
                    value={(currentState.inputs.otMinPerShift as number) || 0}
                    onChange={(v) => setInput('otMinPerShift', Math.max(0, v))}
                    placeholder=""
                    className="w-full h-12 bg-white border-[#E5E7EB]"
                    data-testid="input-ot-min"
                  />
                  <span className="text-sm text-[#888888]">min</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      );
    }

    if (level === 3) {
      const agencyDriver = currentState.inputs.agencyDriver as string;
      return (
        <>
          <div className="mb-5">
            <label className="block text-sm font-medium text-black mb-1">Monthly agency or travel nurse spend</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#888888]">$</span>
              <FormattedNumberInput
                value={(currentState.inputs.agencyMonthlySpend as number) || 0}
                onChange={(v) => setInput('agencyMonthlySpend', Math.max(0, v))}
                placeholder=""
                className="w-full h-12 bg-white border-[#E5E7EB]"
                data-testid="input-agency-spend"
              />
              <span className="text-sm text-[#888888]">/month</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-3">What percentage of agency reliance is driven by retention challenges?</label>
            <div className="flex flex-col gap-2.5">
              {[
                { id: 'minimal', label: 'Minimal — mostly seasonal or census-driven' },
                { id: 'moderate', label: 'Moderate — partly driven by open positions from turnover' },
                { id: 'significant', label: 'Significant — directly tied to our inability to retain' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setInput('agencyDriver', opt.id)}
                  className={`rounded-lg p-4 text-left text-sm transition-all cursor-pointer ${
                    agencyDriver === opt.id
                      ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                      : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                  }`}
                  data-testid={`radio-agency-driver-${opt.id}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="mb-5">
          <label className="block text-sm font-medium text-black mb-1">Monthly agency or travel nurse spend</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={(currentState.inputs.agencyMonthlySpend as number) || 0}
              onChange={(v) => setInput('agencyMonthlySpend', Math.max(0, v))}
              placeholder=""
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-agency-spend-l4"
            />
            <span className="text-sm text-[#888888]">/month</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-black mb-3">What labor management interventions are in place?</label>
          <div className="flex flex-col gap-2.5">
            {LABOR_MANAGEMENT_INTERVENTIONS.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Checkbox
                  id={`labor-intervention-${i}`}
                  checked={isChecked('laborInterventions', i)}
                  onCheckedChange={() => toggleCheckbox('laborInterventions', i)}
                  data-testid={`checkbox-labor-intervention-${i}`}
                />
                <label htmlFor={`labor-intervention-${i}`} className="text-sm text-[#525252] cursor-pointer select-none leading-snug">
                  {item}
                </label>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  const renderExperienceInputs = () => {
    const level = currentState.level;
    if (!level) return null;

    if (level === 1) {
      return (
        <p className="text-sm text-[#888888] italic">
          No additional inputs. This is the most common starting point — documentation burden is acknowledged but not measured.
        </p>
      );
    }

    if (level === 2) {
      const bedsideGoal = currentState.inputs.bedsideGoal as string;
      const burdenSurvey = currentState.inputs.burdenSurvey as string;
      return (
        <>
          <div className="mb-5">
            <label className="block text-sm font-medium text-black mb-3">Is increasing bedside time a stated organizational goal?</label>
            <div className="flex flex-col gap-2.5">
              {[
                { id: 'discussed', label: "It's discussed but not formalized" },
                { id: 'leadership_priority', label: "Yes — it's a nursing leadership priority" },
                { id: 'quality_goal', label: "Yes — it's part of organizational quality goals" },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setInput('bedsideGoal', opt.id)}
                  className={`rounded-lg p-4 text-left text-sm transition-all cursor-pointer ${
                    bedsideGoal === opt.id
                      ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                      : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                  }`}
                  data-testid={`radio-bedside-goal-${opt.id}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-3">Have you conducted a nursing documentation burden survey?</label>
            <div className="flex flex-col gap-2.5">
              {[
                { id: 'not_yet', label: 'Not yet' },
                { id: 'informally', label: 'Informally' },
                { id: 'structured', label: 'Yes — structured survey' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setInput('burdenSurvey', opt.id)}
                  className={`rounded-lg p-4 text-left text-sm transition-all cursor-pointer ${
                    burdenSurvey === opt.id
                      ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                      : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                  }`}
                  data-testid={`radio-burden-survey-${opt.id}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      );
    }

    if (level === 3) {
      return (
        <div>
          <label className="block text-sm font-medium text-black mb-3">What are you measuring?</label>
          <div className="flex flex-col gap-2.5">
            {EXPERIENCE_MEASURING.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Checkbox
                  id={`experience-metric-${i}`}
                  checked={isChecked('experienceMetrics', i)}
                  onCheckedChange={() => toggleCheckbox('experienceMetrics', i)}
                  data-testid={`checkbox-experience-metric-${i}`}
                />
                <label htmlFor={`experience-metric-${i}`} className="text-sm text-[#525252] cursor-pointer select-none leading-snug">
                  {item}
                </label>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div>
        <label className="block text-sm font-medium text-black mb-3">Where do nurse experience metrics factor into organizational strategy?</label>
        <div className="flex flex-col gap-2.5">
          {EXPERIENCE_STRATEGY_AREAS.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <Checkbox
                id={`experience-strategy-${i}`}
                checked={isChecked('experienceStrategy', i)}
                onCheckedChange={() => toggleCheckbox('experienceStrategy', i)}
                data-testid={`checkbox-experience-strategy-${i}`}
              />
              <label htmlFor={`experience-strategy-${i}`} className="text-sm text-[#525252] cursor-pointer select-none leading-snug">
                {item}
              </label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderQualityInputs = () => {
    const level = currentState.level;
    if (!level) return null;

    if (level === 1) {
      return (
        <p className="text-sm text-[#888888] italic">
          No additional inputs. Documentation quality hasn't been formally assessed.
        </p>
      );
    }

    if (level === 2) {
      return (
        <div>
          <label className="block text-sm font-medium text-black mb-3">Where have you identified documentation quality gaps?</label>
          <div className="flex flex-col gap-2.5">
            {QUALITY_GAPS.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Checkbox
                  id={`quality-gap-${i}`}
                  checked={isChecked('qualityGaps', i)}
                  onCheckedChange={() => toggleCheckbox('qualityGaps', i)}
                  data-testid={`checkbox-quality-gap-${i}`}
                />
                <label htmlFor={`quality-gap-${i}`} className="text-sm text-[#525252] cursor-pointer select-none leading-snug">
                  {item}
                </label>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (level === 3) {
      return (
        <div>
          <label className="block text-sm font-medium text-black mb-3">What documentation quality metrics are you tracking?</label>
          <div className="flex flex-col gap-2.5">
            {QUALITY_METRICS.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Checkbox
                  id={`quality-metric-${i}`}
                  checked={isChecked('qualityMetrics', i)}
                  onCheckedChange={() => toggleCheckbox('qualityMetrics', i)}
                  data-testid={`checkbox-quality-metric-${i}`}
                />
                <label htmlFor={`quality-metric-${i}`} className="text-sm text-[#525252] cursor-pointer select-none leading-snug">
                  {item}
                </label>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div>
        <label className="block text-sm font-medium text-black mb-3">Where does documentation quality factor into governance?</label>
        <div className="flex flex-col gap-2.5">
          {QUALITY_GOVERNANCE.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <Checkbox
                id={`quality-governance-${i}`}
                checked={isChecked('qualityGovernance', i)}
                onCheckedChange={() => toggleCheckbox('qualityGovernance', i)}
                data-testid={`checkbox-quality-governance-${i}`}
              />
              <label htmlFor={`quality-governance-${i}`} className="text-sm text-[#525252] cursor-pointer select-none leading-snug">
                {item}
              </label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDomainInputs = () => {
    switch (activeDomain) {
      case 'workforce': return renderWorkforceInputs();
      case 'laborCost': return renderLaborCostInputs();
      case 'experience': return renderExperienceInputs();
      case 'quality': return renderQualityInputs();
    }
  };

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <div className="flex items-center justify-center gap-3 mb-10">
        {NURSING_DOMAIN_ORDER.map((d, idx) => {
          const isActive = d === activeDomain;
          const isComplete = idx < activeIdx;
          return (
            <div key={d} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => isComplete && setActiveDomain(d)}
                  className={`text-[10px] sm:text-xs font-medium uppercase tracking-[1px] sm:tracking-[1.5px] mb-2 ${
                    isActive ? 'text-[#EA2C00]' : isComplete ? 'text-black cursor-pointer hover:text-[#EA2C00] transition-colors' : 'text-[#888888]'
                  }`}
                  data-testid={`domain-label-${d}`}
                  disabled={!isComplete && !isActive}
                >
                  {NURSING_DOMAIN_LABELS[d]}
                </button>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isActive ? 'bg-[#EA2C00]' : isComplete ? 'bg-black' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid={`domain-dot-${d}`}
                />
              </div>
              {idx < NURSING_DOMAIN_ORDER.length - 1 && (
                <div className="w-4 sm:w-8 h-px bg-[#D1D5DB] mt-5" />
              )}
            </div>
          );
        })}
      </div>

      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        key={`header-${activeDomain}`}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight" data-testid="text-domain-headline">
          {config.headline}
        </h1>
        <p className="text-base text-[#888888] max-w-[520px] mx-auto" data-testid="text-domain-subtitle">
          {config.subtitle}
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-1 max-w-[700px]">
          <div className="bg-[#F5F0EB] rounded-lg p-8 md:p-10 mb-8">
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2" data-testid="text-domain-label">
              Where is your organization today?
            </p>
            <div className="h-px bg-[#E5E7EB] mb-6" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config.cards.map((card, cardIdx) => {
                const isSelected = currentState.level === card.level;
                return (
                  <motion.button
                    key={card.level}
                    type="button"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: cardIdx * 0.06, ease: "easeOut" }}
                    onClick={() => setLevel(card.level)}
                    className={`rounded-lg p-5 text-left min-h-[110px] transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#EA2C00]/5 border-2 border-[#EA2C00]"
                        : "bg-white/80 border border-[#E5E7EB]"
                    }`}
                    data-testid={`activation-card-${activeDomain}-${card.level}`}
                  >
                    <p className={`font-bold text-2xl leading-none mb-2 ${isSelected ? 'text-[#EA2C00]' : 'text-[#E5E7EB]'}`}>
                      {card.level}
                    </p>
                    <p className={`text-sm text-black mb-1 ${isSelected ? 'font-bold' : 'font-semibold'}`}>
                      {card.label}
                    </p>
                    <p className={`text-sm leading-snug ${isSelected ? 'text-black/80' : 'text-[#888888]'}`}>
                      {card.description}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {currentState.level && (
              <motion.div
                key={`${activeDomain}-${currentState.level}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="mb-8"
              >
                <div className="bg-[#F5F0EB] rounded-lg p-8 md:p-10">
                  <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                    Refine Your Inputs
                  </p>
                  <div className="h-px bg-[#E5E7EB] mb-6" />
                  {renderDomainInputs()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <StepFooter
            onBack={handleDomainBack}
            onNext={handleAdvance}
            nextLabel={config.nextLabel}
            nextDisabled={!currentState.level}
          />
          <div className={STEP_FOOTER_SPACER_CLASS} />
        </div>

        <motion.div
          className="w-full lg:w-[320px] flex-shrink-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          key={`sidebar-${activeDomain}`}
        >
          <div className="bg-[#1A1A1A] rounded-xl p-6 lg:sticky lg:top-24" data-testid="card-domain-feedback">
            <p className="text-[11px] font-medium text-white/70 uppercase tracking-[1.5px] mb-4">
              Estimated Impact
            </p>

            {feedback ? (
              <>
                <p className="font-bold text-xl text-[#EA2C00] leading-tight mb-4" data-testid="text-feedback-headline">
                  {feedback.headline}
                </p>

                <div className="h-px bg-white/10 my-4" />

                <div className="text-sm text-white/80 leading-relaxed mb-4 space-y-2">
                  {feedback.context.split('\n').filter(Boolean).map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>

                {feedback.footnote && (
                  <p className="text-xs text-white/40 italic leading-relaxed">
                    {feedback.footnote}
                  </p>
                )}

                <FormulaDisplay formula={feedback.formula} />

                <p className="text-[10px] text-white/30 italic mt-3">
                  Estimates based on your inputs. Individual results vary.
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-2xl text-white/30 leading-[1.1] mb-4">—</p>
                <div className="h-px bg-white/10 my-4" />
                <p className="text-sm text-white/50 leading-relaxed">
                  Select where your organization is today to see estimated impact.
                </p>
              </>
            )}

            <div className="h-px bg-white/10 my-5" />

            <p className="text-[10px] font-medium text-white/50 uppercase tracking-[1.5px] mb-3">
              Domain Progress
            </p>
            <div className="space-y-2">
              {NURSING_DOMAIN_ORDER.map((d) => {
                const isActive = d === activeDomain;
                const dState = domainStates[d];
                const hasLevel = dState.level !== null;
                return (
                  <div key={d} className="flex items-center justify-between text-sm">
                    <span className={isActive ? 'text-white font-medium' : 'text-white/50'}>
                      {NURSING_DOMAIN_LABELS[d]}
                    </span>
                    <span className={hasLevel ? 'text-white font-semibold' : 'text-white/30'}>
                      {hasLevel ? `Level ${dState.level}` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
