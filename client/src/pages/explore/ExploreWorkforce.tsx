import { useMemo } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import DriverCard from "@/components/explore/DriverCard";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { getDriversForPage, type ExploreDriver } from "@/lib/exploreDrivers";
import type { PriorQuadrantEntry } from "@/lib/exploreQuadrantValues";
import { type ExploreState, type OtherFinancialBenefitItem } from "./ExploreFlow";

interface ExploreWorkforceProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  priorQuadrants?: PriorQuadrantEntry[];
  totalHoursSaved: number;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function ExploreWorkforce({ state, updateState, totalHoursSaved, priorQuadrants = [], onNext, onBack, onHome }: ExploreWorkforceProps) {
  const setting = state.careSetting;
  const drivers = setting ? getDriversForPage('Workforce', setting) : [];
  const topLevelDrivers = drivers.filter(d => !d.childOfDriverId);
  const financialDrivers = topLevelDrivers.filter(d => d.visibility === 'quantified');
  const watchMetrics = topLevelDrivers.filter(d => d.visibility === 'qualitative');

  const updateTimeDriverInputs = (updates: Partial<typeof state.timeDriverInputs>) => {
    updateState({ timeDriverInputs: { ...state.timeDriverInputs, ...updates } });
  };

  const isEnabled = (driver: ExploreDriver): boolean => {
    return Boolean((state.timeDriverInputs as any)[driver.enabledStateKey]);
  };

  const isExpanded = (driver: ExploreDriver): boolean => {
    return driver.expandedStateKey ? Boolean((state.timeDriverInputs as any)[driver.expandedStateKey]) : false;
  };

  const toggleEnabled = (driver: ExploreDriver) => {
    const current = isEnabled(driver);
    const updates: any = { [driver.enabledStateKey]: !current };
    if (!current && driver.expandedStateKey) {
      updates[driver.expandedStateKey] = true;
    }
    updateTimeDriverInputs(updates);
  };

  const toggleExpand = (driver: ExploreDriver) => {
    if (!driver.expandedStateKey) return;
    updateTimeDriverInputs({ [driver.expandedStateKey]: !isExpanded(driver) } as any);
  };

  const benefits = (state.otherFinancialBenefits ?? []).filter(b => b.quadrant === 'Workforce');

  const addBenefit = () => {
    const newItem: OtherFinancialBenefitItem = {
      id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: '',
      amount: 0,
      type: 'annual',
      quadrant: 'Workforce',
    };
    updateState({ otherFinancialBenefits: [...(state.otherFinancialBenefits ?? []), newItem] });
  };

  const updateBenefit = (id: string, updates: Partial<OtherFinancialBenefitItem>) => {
    updateState({
      otherFinancialBenefits: (state.otherFinancialBenefits ?? []).map(b => b.id === id ? { ...b, ...updates } : b),
    });
  };

  const removeBenefit = (id: string) => {
    updateState({
      otherFinancialBenefits: (state.otherFinancialBenefits ?? []).filter(b => b.id !== id),
    });
  };

  const formatCurrency = (n: number) => '$' + n.toLocaleString();

  const updateDocQualityInputs = (updates: Partial<typeof state.docQualityInputs>) => {
    updateState({ docQualityInputs: { ...state.docQualityInputs, ...updates } });
  };

  const driverValues = useMemo(() => {
    const result: Record<string, number> = {};
    const td = state.timeDriverInputs;
    const retentionScenarios: Record<string, number> = { conservative: 5, typical: 10, optimistic: 15 };
    const nursingScenarios: Record<string, number> = { conservative: 10, typical: 15, optimistic: 25 };

    // Provider Wellbeing (OP/ED/IP)
    if (td.wellbeingEnabled && td.calculateRetentionValue) {
      const turnover = td.annualTurnoverRate / 100;
      const burnout = td.burnoutRelatedTurnover / 100;
      const impact = retentionScenarios[td.retentionImpactScenario] / 100;
      const retained = state.numberOfProviders * turnover * burnout * impact;
      result.providerWellbeing = Math.round(retained * td.replacementCost);

      // Physician Locum/Agency (child of Wellbeing)
      if (td.physicianAgencyEnabled) {
        result.physicianLocumAgency = Math.round(retained * td.physicianAgencyWeeksPerVacancy * td.physicianAgencyWeeklyPremium);
      }
    }

    // Nursing Retention
    if (td.nursingRetentionEnabled) {
      const turnover = td.nursingTurnoverRate / 100;
      const impact = nursingScenarios[td.retentionImpactScenario] / 100;
      const burnoutDepartures = state.numberOfProviders * turnover * 0.40;
      const retained = burnoutDepartures * impact;
      result.nursingRetention = Math.round(retained * td.nursingReplacementCost);

      // Nursing Agency (child of Retention)
      if (td.nursingAgencyEnabled) {
        result.nursingAgency = Math.round(retained * td.nursingAgencyWeeksPerVacancy * td.nursingAgencyWeeklyPremium);
      }
    }

    // Nursing Overtime
    if (td.nursingOtEnabled) {
      const otHours = td.nursingOtHoursPerNurseWeek * (td.nursingOtReductionPercent / 100) * state.numberOfProviders * 52;
      result.nursingOvertime = Math.round(otHours * td.nursingOtHourlyRate);
    }

    return result;
  }, [state, totalHoursSaved]);

  const annualBenefitsTotal = useMemo(() => {
    return benefits.filter(b => b.type === 'annual').reduce((sum, b) => sum + (b.amount || 0), 0);
  }, [benefits]);

  const oneTimeBenefitsTotal = useMemo(() => {
    return benefits.filter(b => b.type === 'oneTime').reduce((sum, b) => sum + (b.amount || 0), 0);
  }, [benefits]);

  const quadrantAnnualTotal = useMemo(() => {
    return Object.values(driverValues).reduce((sum, v) => sum + v, 0) + annualBenefitsTotal;
  }, [driverValues, annualBenefitsTotal]);

  const renderDriverCard = (driver: ExploreDriver) => {
    const enabled = isEnabled(driver);
    const expanded = isExpanded(driver);
    const childDrivers = drivers.filter(d => d.childOfDriverId === driver.id);

    return (
      <DriverCard
        key={driver.id}
        title={driver.label}
        subtitle={driver.shortDescription}
        enabled={enabled}
        expanded={expanded}
        onToggle={() => toggleEnabled(driver)}
        onExpand={() => toggleExpand(driver)}
        testId={`toggle-${driver.id}`}
      >
        {driver.visibility === 'qualitative' ? (
          <div>
            <p className="text-sm text-black leading-relaxed mb-4">
              {driver.shortDescription}
            </p>
            <div className="bg-[#F5F0EB] rounded-lg p-3">
              <p className="text-xs text-[#666666] italic">
                Qualitative driver. No financial value modeled. Tracked post-deployment as a strategic outcome.
              </p>
            </div>
          </div>
        ) : driver.calcComponent ? (
          <driver.calcComponent
            state={state}
            updateTimeDriverInputs={updateTimeDriverInputs}
            updateDocQualityInputs={updateDocQualityInputs}
            totalHoursSaved={totalHoursSaved}
          />
        ) : (
          <div className="bg-[#F5F0EB] rounded-lg p-4">
            <p className="text-sm text-[#888888] italic">Calculation logic for "{driver.id}" not yet wired.</p>
          </div>
        )}

        {/* Child drivers (e.g., Locum & Agency under Wellbeing, Travel & Agency under Retention) */}
        {childDrivers.length > 0 && (
          <div className="mt-4 space-y-2">
            {childDrivers.map(child => {
              const childEnabled = isEnabled(child);
              const childExpanded = isExpanded(child);
              return (
                <DriverCard
                  key={child.id}
                  title={child.label}
                  subtitle={child.shortDescription}
                  enabled={childEnabled}
                  expanded={childExpanded}
                  onToggle={() => toggleEnabled(child)}
                  onExpand={() => toggleExpand(child)}
                  testId={`toggle-${child.id}`}
                  isChild
                >
                  {child.calcComponent ? (
                    <child.calcComponent
                      state={state}
                      updateTimeDriverInputs={updateTimeDriverInputs}
                      updateDocQualityInputs={updateDocQualityInputs}
                      totalHoursSaved={totalHoursSaved}
                    />
                  ) : (
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <p className="text-sm text-[#888888] italic">Calculation logic for "{child.id}" not yet wired.</p>
                    </div>
                  )}
                </DriverCard>
              );
            })}
          </div>
        )}
      </DriverCard>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={5}
        totalSteps={9}
        stepName="Workforce"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main Content */}
          <div className="flex-1 min-w-0 max-w-[700px]">
            <motion.div
              className="text-center mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight">
                Workforce
              </h1>
              <p className="text-base text-[#888888]">
                How does reclaimed time affect your team?
              </p>
            </motion.div>

            <motion.div
              className="bg-[#F5F0EB] rounded-lg p-5 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">How to Use This Section</p>
              <p className="text-sm text-black leading-relaxed">
                Engage with the drivers that match your strategic priorities. Skip the ones that don't apply.
              </p>
            </motion.div>

            {/* FINANCIAL DRIVERS */}
            {financialDrivers.length > 0 && (
              <motion.div
                className="bg-[#F5F0EB] rounded-lg p-6 space-y-4 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div>
                  <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">Financial Drivers</p>
                  <p className="text-xs text-[#AAAAAA] mb-2">Drivers that build the business case with dollar value.</p>
                  <div className="h-px bg-[#D1D5DB] mb-6" />
                </div>
                {financialDrivers.map(renderDriverCard)}
              </motion.div>
            )}

            {/* OTHER METRICS TO WATCH */}
            {watchMetrics.length > 0 && (
              <motion.div
                className="bg-[#F5F0EB] rounded-lg p-6 space-y-4 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
              >
                <div>
                  <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">Other Metrics to Watch</p>
                  <p className="text-xs text-[#AAAAAA] mb-2">Outcomes we track post-deployment that don't carry direct dollar value.</p>
                  <div className="h-px bg-[#D1D5DB] mb-6" />
                </div>
                {watchMetrics.map(renderDriverCard)}
              </motion.div>
            )}

            {/* Empty state — only if BOTH groups empty */}
            {financialDrivers.length === 0 && watchMetrics.length === 0 && (
              <motion.div
                className="bg-[#F5F0EB] rounded-lg p-6 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <p className="text-sm text-[#888888] italic">No Workforce drivers configured for this care setting.</p>
              </motion.div>
            )}

            {/* Other Financial Benefits */}
            <motion.div
              className="bg-[#F5F0EB] rounded-lg p-6 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">Other Financial Benefits</p>
              <div className="h-px bg-[#D1D5DB] mb-4" />

              {benefits.length === 0 ? (
                <p className="text-sm text-[#888888] mb-3">
                  Add custom Workforce-related financial benefits specific to your organization.
                </p>
              ) : (
                <div className="space-y-3 mb-3">
                  {benefits.map(benefit => (
                    <div key={benefit.id} className="bg-white rounded-lg p-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                      <input
                        type="text"
                        placeholder="Description"
                        value={benefit.label}
                        onChange={e => updateBenefit(benefit.id, { label: e.target.value })}
                        className="flex-1 h-10 px-3 border border-[#E5E5E5] rounded text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none"
                        data-testid={`benefit-label-${benefit.id}`}
                      />
                      <div className="relative w-full sm:w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                        <FormattedNumberInput
                          value={benefit.amount}
                          onChange={(v: number) => updateBenefit(benefit.id, { amount: v })}
                          className="h-10 pl-7"
                          data-testid={`benefit-amount-${benefit.id}`}
                        />
                      </div>
                      <select
                        value={benefit.type}
                        onChange={e => updateBenefit(benefit.id, { type: e.target.value as 'annual' | 'oneTime' })}
                        className="h-10 px-3 border border-[#E5E5E5] rounded text-sm bg-white focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none"
                        data-testid={`benefit-type-${benefit.id}`}
                      >
                        <option value="annual">Annual</option>
                        <option value="oneTime">One-Time (Y1 only)</option>
                      </select>
                      <button
                        onClick={() => removeBenefit(benefit.id)}
                        className="p-2 text-[#888888] hover:text-[#EA2C00] transition-colors"
                        data-testid={`benefit-remove-${benefit.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={addBenefit}
                className="text-sm font-medium text-[#EA2C00] hover:text-[#EA2C00]/80 flex items-center gap-1.5 transition-colors"
                data-testid="button-add-benefit"
              >
                <Plus className="w-4 h-4" /> Add a benefit
              </button>
            </motion.div>

            {/* Continue Button - Mobile */}
            <motion.div
              className="flex justify-center lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              <Button
                onClick={onNext}
                className="h-12 px-8 bg-black hover:bg-black/90 text-white font-semibold rounded-full gap-2"
                data-testid="button-continue"
              >
                Continue to Revenue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>

          {/* Right Panel */}
          <motion.div
            className="w-full lg:w-[320px] flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-[#1A1A1A] rounded-xl p-6 lg:sticky lg:top-24">
              <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-1">Workforce Value</p>
              <p className="text-sm text-white/50 mb-4">From this quadrant</p>

              {(() => {
                const financialDriversInPanel = drivers.filter(d => {
                  const parent = d.childOfDriverId ? drivers.find(p => p.id === d.childOfDriverId) : d;
                  return parent?.visibility === 'quantified';
                });
                const watchMetricsInPanel = drivers.filter(d => {
                  const parent = d.childOfDriverId ? drivers.find(p => p.id === d.childOfDriverId) : d;
                  return parent?.visibility === 'qualitative';
                });
                const showFinancialPanelGroup = financialDriversInPanel.length > 0;
                const showWatchPanelGroup = watchMetricsInPanel.length > 0;

                if (!showFinancialPanelGroup && !showWatchPanelGroup) {
                  return <p className="text-sm text-white/50">No drivers for this setting.</p>;
                }

                return (
                  <div className="space-y-4 mb-4">
                    {showFinancialPanelGroup && (
                      <div>
                        <p className="text-[10px] font-medium text-white/50 uppercase tracking-[1.5px] mb-2">Financial</p>
                        <div className="space-y-3">
                          {financialDriversInPanel.map(d => {
                            const enabled = isEnabled(d);
                            const value = driverValues[d.id];
                            return (
                              <div key={d.id} className={`flex justify-between items-center ${d.childOfDriverId ? 'pl-4' : ''}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${enabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                                  <span className="text-sm text-[#888888] truncate">{d.label}</span>
                                </div>
                                <span className={`text-sm font-semibold flex-shrink-0 ${enabled ? 'text-white' : 'text-[#666666]'}`} data-testid={`right-panel-value-${d.id}`}>
                                  {!enabled ? '—' : (typeof value === 'number' ? formatCurrency(value) : '—')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {showWatchPanelGroup && (
                      <div>
                        <p className="text-[10px] font-medium text-white/50 uppercase tracking-[1.5px] mb-2">Other Metrics</p>
                        <div className="space-y-3">
                          {watchMetricsInPanel.map(d => {
                            const enabled = isEnabled(d);
                            return (
                              <div key={d.id} className={`flex justify-between items-center ${d.childOfDriverId ? 'pl-4' : ''}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${enabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                                  <span className="text-sm text-[#888888] truncate">{d.label}</span>
                                </div>
                                <span className={`text-sm flex-shrink-0 italic ${enabled ? 'text-white/80' : 'text-[#666666]'}`} data-testid={`right-panel-value-${d.id}`}>
                                  {!enabled ? '—' : 'Qualitative'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {benefits.length > 0 && (
                <>
                  <div className="h-px bg-[#333333] my-3" />
                  <div className="space-y-2">
                    {benefits.map(b => (
                      <div key={b.id} className="flex justify-between items-center">
                        <span className="text-sm text-[#888888] truncate">{b.label || 'Other benefit'}</span>
                        <span className="text-sm text-white">
                          {formatCurrency(b.amount)}
                          <span className="text-xs text-white/40 ml-1">{b.type === 'oneTime' ? 'Y1' : '/yr'}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="h-px bg-[#333333] my-4" />

              <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-1">Quadrant Total</p>
              <p className="text-2xl font-bold text-[#EA2C00]" data-testid="text-quadrant-total">{formatCurrency(quadrantAnnualTotal)}</p>
              <p className="text-xs text-white/50 mt-1">Annual recurring</p>
              {oneTimeBenefitsTotal > 0 && (
                <p className="text-xs text-white/70 mt-1" data-testid="text-quadrant-onetime">+ {formatCurrency(oneTimeBenefitsTotal)} one-time (Y1 only)</p>
              )}

              {priorQuadrants.length > 0 && (
                <>
                  <div className="h-px bg-[#333333] my-4" />
                  <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-2">Progress So Far</p>
                  <div className="space-y-1.5 mb-3">
                    {priorQuadrants.map(p => (
                      <div key={p.key} className="flex justify-between items-center" data-testid={`prior-quadrant-${p.key}`}>
                        <span className="text-sm text-[#888888]">{p.label}</span>
                        <span className="text-sm text-white">{formatCurrency(p.value)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#888888]">Workforce</span>
                      <span className="text-sm text-white">{formatCurrency(quadrantAnnualTotal)}</span>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-1">Running Total</p>
                  <p className="text-xl font-bold text-white" data-testid="text-running-total">
                    {formatCurrency(priorQuadrants.reduce((s, p) => s + p.value, 0) + quadrantAnnualTotal)}
                  </p>
                </>
              )}

              <div className="hidden lg:block mt-6">
                <Button
                  onClick={onNext}
                  className="w-full h-12 bg-white hover:bg-white/90 text-black font-semibold rounded-full gap-2"
                  data-testid="button-panel-continue"
                >
                  Continue to Revenue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
