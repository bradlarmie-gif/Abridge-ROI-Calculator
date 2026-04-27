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

interface ExploreRevenueProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  totalHoursSaved: number;
  priorQuadrants?: PriorQuadrantEntry[];
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function ExploreRevenue({ state, updateState, totalHoursSaved, priorQuadrants = [], onNext, onBack, onHome }: ExploreRevenueProps) {
  const setting = state.careSetting;
  const drivers = setting ? getDriversForPage('Revenue', setting) : [];
  const topLevelDrivers = drivers.filter(d => !d.childOfDriverId);

  const updateTimeDriverInputs = (updates: Partial<typeof state.timeDriverInputs>) => {
    updateState({ timeDriverInputs: { ...state.timeDriverInputs, ...updates } });
  };
  const updateDocQualityInputs = (updates: Partial<typeof state.docQualityInputs>) => {
    updateState({ docQualityInputs: { ...state.docQualityInputs, ...updates } });
  };

  const isEnabled = (driver: ExploreDriver): boolean => {
    const td = state.timeDriverInputs as any;
    const dq = state.docQualityInputs as any;
    return Boolean(td[driver.enabledStateKey] ?? dq[driver.enabledStateKey]);
  };

  const isExpanded = (driver: ExploreDriver): boolean => {
    if (!driver.expandedStateKey) return false;
    const td = state.timeDriverInputs as any;
    const dq = state.docQualityInputs as any;
    return Boolean(td[driver.expandedStateKey] ?? dq[driver.expandedStateKey]);
  };

  const toggleEnabled = (driver: ExploreDriver) => {
    const td = state.timeDriverInputs as any;
    const dq = state.docQualityInputs as any;
    const inTd = driver.enabledStateKey in td;
    const current = inTd ? td[driver.enabledStateKey] : dq[driver.enabledStateKey];
    const updates: any = { [driver.enabledStateKey]: !current };
    if (!current && driver.expandedStateKey) {
      updates[driver.expandedStateKey] = true;
    }
    if (inTd) {
      updateTimeDriverInputs(updates);
    } else {
      updateDocQualityInputs(updates);
    }
  };

  const toggleExpand = (driver: ExploreDriver) => {
    if (!driver.expandedStateKey) return;
    const td = state.timeDriverInputs as any;
    const dq = state.docQualityInputs as any;
    const inTd = driver.expandedStateKey in td;
    const current = inTd ? td[driver.expandedStateKey] : dq[driver.expandedStateKey];
    if (inTd) {
      updateTimeDriverInputs({ [driver.expandedStateKey]: !current } as any);
    } else {
      updateDocQualityInputs({ [driver.expandedStateKey]: !current } as any);
    }
  };

  const benefits = (state.otherFinancialBenefits ?? []).filter(b => b.quadrant === 'Revenue');

  const addBenefit = () => {
    const newItem: OtherFinancialBenefitItem = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: '',
      amount: 0,
      type: 'annual',
      quadrant: 'Revenue',
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

  const driverValues = useMemo(() => {
    const result: Record<string, number> = {};
    const dq = state.docQualityInputs;
    const eligibleEncounters = Math.round(state.annualEncounters * (state.utilizationPercent / 100));
    const isED = state.careSetting === 'ed';
    const isOPorED = state.careSetting === 'outpatient' || state.careSetting === 'ed';
    const isIP = state.careSetting === 'inpatient';

    const wrvuScenarios: Record<string, number> = isED ? { conservative: 1, typical: 2.5, aggressive: 4 } : { conservative: 2, typical: 5, aggressive: 7 };
    const denialsScenarios: Record<string, number> = isED ? { conservative: 15, typical: 30, aggressive: 50 } : { conservative: 25, typical: 50, aggressive: 75 };
    const hccScenarios: Record<string, number> = { conservative: 6, typical: 10, aggressive: 15 };

    if (dq.wrvuEnabled && isOPorED) {
      const lift = (dq.currentWrvu * wrvuScenarios[dq.wrvuScenario]) / 100;
      const value = eligibleEncounters * lift * dq.conversionFactor * (dq.wrvuRealization / 100);
      if (isED) result.edEmLevel = Math.round(value);
      else result.wrvu = Math.round(value);
    }
    if (dq.hccEnabled && state.careSetting === 'outpatient') {
      const recap = hccScenarios[dq.hccScenario] / 100;
      const ma = state.numberOfProviders * dq.panelSize * (dq.maPercent / 100);
      const gap = ma * (dq.gapRate / 100);
      const recaptured = gap * recap;
      const hccs = recaptured * dq.avgHccs;
      result.hccCapture = Math.round(hccs * dq.rafImpact * dq.annualPayment * (dq.hccRealization / 100));
    }
    if (dq.denialsEnabled && isOPorED) {
      const prev = denialsScenarios[dq.denialsScenario] / 100;
      const totalDenials = eligibleEncounters * (dq.denialRate / 100);
      const unappealable = totalDenials * (dq.unappealableRate / 100);
      const prevented = unappealable * prev;
      result.denialPrevention = Math.round(prevented * dq.avgClaimValue * (dq.denialsRealization / 100));
    }
    if (isIP && dq.ipDrgEnabled) {
      const protectScenarios: Record<string, number> = { conservative: 15, typical: 20, aggressive: 25 };
      const pct = protectScenarios[dq.ipDrgScenario] / 100;
      const atRisk = eligibleEncounters * (dq.ipDrgAtRiskRate / 100);
      result.drgAccuracy = Math.round(atRisk * pct * dq.ipDrgWeightIncrease * dq.ipDrgBasePayment * (dq.ipDrgRealization / 100));
    }
    if (isIP && dq.ipCdiEnabled) {
      const cdiScenarios: Record<string, number> = { conservative: 15, typical: 25, aggressive: 35 };
      const pct = cdiScenarios[dq.ipCdiScenario] / 100;
      const totalQueries = eligibleEncounters * (dq.ipCdiQueryRate / 100);
      const avoided = totalQueries * pct;
      result.cdiQueryReduction = Math.round(avoided * dq.ipCdiCostPerQuery * (dq.ipCdiRealization / 100));
    }
    if (isIP && dq.ipObsDefenseEnabled) {
      const gross = eligibleEncounters * (dq.ipObsDefenseDenialRate / 100) * dq.ipObsDefenseClaimValue * (dq.ipObsDefenseDocContribution / 100);
      result.obsDefense = Math.round(gross * (dq.ipObsDefenseRealization / 100));
    }
    if (isIP && dq.ipEmCodingEnabled) {
      const losVal = state.ipAvgLengthOfStay ?? 4.5;
      const progressPerAdm = Math.max(losVal - 2, 1);
      const totalCharges = eligibleEncounters * (1 + progressPerAdm + dq.ipEmCodingConsultsPerAdmission);
      const gapMap: Record<string, number> = { conservative: 8, typical: 12, optimistic: 18 };
      const gapPct = (gapMap[dq.ipEmCodingGapScenario] ?? 12) / 100;
      const gross = totalCharges * gapPct * dq.ipEmCodingAvgRevenueLift;
      result.emCodingAccuracy = Math.round(gross * (dq.ipEmCodingRealization / 100));
    }

    return result;
  }, [state]);

  const annualBenefitsTotal = useMemo(() => benefits.filter(b => b.type === 'annual').reduce((s, b) => s + (b.amount || 0), 0), [benefits]);
  const oneTimeBenefitsTotal = useMemo(() => benefits.filter(b => b.type === 'oneTime').reduce((s, b) => s + (b.amount || 0), 0), [benefits]);
  const quadrantAnnualTotal = useMemo(() => Object.values(driverValues).reduce((s, v) => s + v, 0) + annualBenefitsTotal, [driverValues, annualBenefitsTotal]);
  const runningTotal = priorQuadrants.reduce((s, p) => s + p.value, 0) + quadrantAnnualTotal;

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader pathType="explore" currentStep={6} totalSteps={9} stepName="Revenue" onBack={onBack} onHome={onHome} />
      <UnifiedHeaderSpacer />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main */}
          <div className="flex-1 min-w-0 max-w-[700px]">
            <motion.div className="text-center mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight">Revenue</h1>
              <p className="text-base text-[#888888]">How does better documentation show up financially?</p>
            </motion.div>

            <motion.div
              className="bg-[#F5F0EB] rounded-lg p-5 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">How to Use This Section</p>
              <p className="text-sm text-black leading-relaxed">
                Engage with the drivers that match your strategic priorities. Each models the revenue Abridge captures by improving documentation completeness.
              </p>
            </motion.div>

            {/* Drivers */}
            <motion.div className="bg-[#F5F0EB] rounded-lg p-6 space-y-4 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div>
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">Revenue Drivers</p>
                <div className="h-px bg-[#D1D5DB] mb-6" />
              </div>

              {topLevelDrivers.length === 0 && (
                <p className="text-sm text-[#888888] italic">No Revenue drivers configured for this care setting.</p>
              )}

              {topLevelDrivers.map(driver => {
                const enabled = isEnabled(driver);
                const expanded = isExpanded(driver);
                const isQual = driver.visibility === 'qualitative';
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
                    {isQual ? (
                      <div>
                        <p className="text-sm text-black leading-relaxed mb-4">{driver.shortDescription}</p>
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
                  </DriverCard>
                );
              })}
            </motion.div>

            {/* Other Financial Benefits */}
            <motion.div className="bg-[#F5F0EB] rounded-lg p-6 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">Other Financial Benefits</p>
              <div className="h-px bg-[#D1D5DB] mb-4" />
              {benefits.length === 0 ? (
                <p className="text-sm text-[#888888] mb-3">Add custom Revenue-related financial benefits specific to your organization.</p>
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
                        data-testid={`input-revenue-benefit-label-${benefit.id}`}
                      />
                      <div className="relative w-full sm:w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                        <FormattedNumberInput value={benefit.amount} onChange={(v: number) => updateBenefit(benefit.id, { amount: v })} className="h-10 pl-7" />
                      </div>
                      <select
                        value={benefit.type}
                        onChange={e => updateBenefit(benefit.id, { type: e.target.value as 'annual' | 'oneTime' })}
                        className="h-10 px-3 border border-[#E5E5E5] rounded text-sm bg-white focus:border-[#EA2C00] outline-none"
                      >
                        <option value="annual">Annual</option>
                        <option value="oneTime">One-Time (Y1 only)</option>
                      </select>
                      <button onClick={() => removeBenefit(benefit.id)} className="p-2 text-[#888888] hover:text-[#EA2C00]" data-testid={`button-remove-benefit-${benefit.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={addBenefit} className="text-sm font-medium text-[#EA2C00] hover:text-[#EA2C00]/80 flex items-center gap-1.5 transition-colors" data-testid="button-add-revenue-benefit">
                <Plus className="w-4 h-4" /> Add a benefit
              </button>
            </motion.div>

            {/* Mobile continue */}
            <motion.div className="flex justify-center lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
              <Button onClick={onNext} className="h-12 px-8 bg-black hover:bg-black/90 text-white font-semibold rounded-full gap-2" data-testid="button-continue-revenue-mobile">
                Continue to Quality
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>

          {/* Right Panel */}
          <motion.div className="w-full lg:w-[320px] flex-shrink-0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="bg-[#1A1A1A] rounded-xl p-6 lg:sticky lg:top-24">
              <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-1">Revenue Value</p>
              <p className="text-sm text-white/50 mb-4">From this quadrant</p>

              {drivers.length === 0 ? (
                <p className="text-sm text-white/50">No drivers for this setting.</p>
              ) : (
                <div className="space-y-3 mb-4">
                  {drivers.map(d => {
                    const enabled = isEnabled(d);
                    const value = driverValues[d.id];
                    return (
                      <div key={d.id} className="flex justify-between items-center">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${enabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888] truncate">{d.label}</span>
                        </div>
                        <span className={`text-sm font-semibold flex-shrink-0 ${enabled ? 'text-white' : 'text-[#666666]'}`}>
                          {!enabled ? '—' : d.visibility === 'qualitative' ? 'Qualitative' : (typeof value === 'number' ? formatCurrency(value) : '—')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

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
                <p className="text-xs text-white/70 mt-1">+ {formatCurrency(oneTimeBenefitsTotal)} one-time (Y1 only)</p>
              )}

              {priorQuadrants.length > 0 && (
                <>
                  <div className="h-px bg-[#333333] my-4" />
                  <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-2">Progress So Far</p>
                  <div className="space-y-1.5 mb-3">
                    {priorQuadrants.map(p => (
                      <div key={p.key} className="flex justify-between items-center">
                        <span className="text-sm text-[#888888]">{p.label}</span>
                        <span className="text-sm text-white">{formatCurrency(p.value)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#888888]">Revenue</span>
                      <span className="text-sm text-white">{formatCurrency(quadrantAnnualTotal)}</span>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-1">Running Total</p>
                  <p className="text-xl font-bold text-white" data-testid="text-running-total">{formatCurrency(runningTotal)}</p>
                </>
              )}

              <div className="hidden lg:block mt-6">
                <Button onClick={onNext} className="w-full h-12 bg-white hover:bg-white/90 text-black font-semibold rounded-full gap-2" data-testid="button-continue-revenue">
                  Continue to Quality
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
