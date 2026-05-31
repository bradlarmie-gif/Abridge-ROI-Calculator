import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, Info, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type ExploreState, type DocQualityInputs, type HccPlan } from "./ExploreFlow";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";

interface ExploreDocQualityProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  timeValue: number;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

type ScenarioLevel = 'conservative' | 'typical' | 'aggressive' | 'custom';

const PLAN_TYPE_DEFAULTS: Record<HccPlan['planType'], Omit<HccPlan, 'id'>> = {
  medicare_advantage: { planType: 'medicare_advantage', name: 'Medicare Advantage', panelSize: 300, valuePerHcc: 1500, gapRate: 65, currentRecaptureRate: 65, uplift: 'typical', netNewEnabled: false, netNewDiscoveryRate: 3, netNewAvgConditions: 1.2 },
  aca_marketplace:    { planType: 'aca_marketplace',    name: 'ACA Marketplace',    panelSize: 150, valuePerHcc: 800,  gapRate: 60, currentRecaptureRate: 60, uplift: 'typical', netNewEnabled: false, netNewDiscoveryRate: 2, netNewAvgConditions: 1.0 },
  medicaid_mco:       { planType: 'medicaid_mco',       name: 'Medicaid MCO',       panelSize: 200, valuePerHcc: 600,  gapRate: 55, currentRecaptureRate: 55, uplift: 'typical', netNewEnabled: false, netNewDiscoveryRate: 2, netNewAvgConditions: 1.0 },
  custom:             { planType: 'custom',              name: 'Custom Plan',        panelSize: 100, valuePerHcc: 1000, gapRate: 60, currentRecaptureRate: 60, uplift: 'typical', netNewEnabled: false, netNewDiscoveryRate: 3, netNewAvgConditions: 1.2 },
};

const PLAN_TYPE_LABELS: Record<HccPlan['planType'], string> = {
  medicare_advantage: 'MA',
  aca_marketplace:    'ACA',
  medicaid_mco:       'MCO',
  custom:             'Custom',
};

function HccExpandedContent({
  state,
  docQualityInputs,
  updateDocInputs,
  formatNumber,
  formatCurrency,
}: {
  state: ExploreState;
  docQualityInputs: DocQualityInputs;
  updateDocInputs: (updates: Partial<DocQualityInputs>) => void;
  formatNumber: (n: number) => string;
  formatCurrency: (n: number) => string;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [netNewOpen, setNetNewOpen] = useState<Record<string, boolean>>({});
  const plans = docQualityInputs.hccPlans;
  const upliftMap: Record<string, number> = { conservative: 5, typical: 10, optimistic: 15 };

  const planCalcs = plans.map(plan => {
    const upliftPp = upliftMap[plan.uplift] ?? 10;
    const effectiveUplift = Math.min(upliftPp, Math.max(0, 90 - plan.currentRecaptureRate));
    const projectedRate = plan.currentRecaptureRate + effectiveUplift;
    const gapPatients = state.numberOfProviders * plan.panelSize * (plan.gapRate / 100);
    const recapturedPts = gapPatients * (effectiveUplift / 100);
    const recaptureGross = recapturedPts * docQualityInputs.avgHccs * plan.valuePerHcc;
    let netNewGross = 0;
    if (plan.netNewEnabled) {
      const netNewPts = state.numberOfProviders * plan.panelSize * (plan.netNewDiscoveryRate / 100);
      netNewGross = netNewPts * plan.netNewAvgConditions * plan.valuePerHcc;
    }
    return { upliftPp, effectiveUplift, projectedRate, gapPatients, recapturedPts, recaptureGross, netNewGross, planGross: recaptureGross + netNewGross };
  });

  const totalGross = planCalcs.reduce((s, c) => s + c.planGross, 0);
  const totalHccRevenueNet = totalGross * (docQualityInputs.hccRealization / 100);

  const updatePlan = (id: string, updates: Partial<HccPlan>) => {
    updateDocInputs({ hccPlans: plans.map(p => p.id === id ? { ...p, ...updates } : p) });
  };

  const removePlan = (id: string) => {
    updateDocInputs({ hccPlans: plans.filter(p => p.id !== id) });
  };

  const addPlan = () => {
    const newPlan: HccPlan = { ...PLAN_TYPE_DEFAULTS.custom, id: `plan-${Date.now()}` };
    updateDocInputs({ hccPlans: [...plans, newPlan] });
  };

  const applyPlanType = (id: string, planType: HccPlan['planType']) => {
    const defaults = PLAN_TYPE_DEFAULTS[planType];
    updateDocInputs({ hccPlans: plans.map(p => p.id === id ? { ...p, ...defaults, id: p.id } : p) });
  };

  const toggleNetNew = (id: string) => {
    setNetNewOpen(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-white rounded-b-lg p-5">
      <p className="text-sm text-[#666666] leading-relaxed mb-3">
        When providers use ambient documentation, chronic conditions addressed verbally are more likely to appear in the note. Better documentation drives higher HCC recapture rates, improving risk-adjusted payment across plan types.
      </p>

      <div className="h-px bg-[#E5E5E5] my-4" />

      {/* Plan cards */}
      <div className="space-y-3">
        {plans.map((plan, idx) => {
          const calc = planCalcs[idx];
          const isNetNewOpen = netNewOpen[plan.id] ?? false;
          return (
            <div key={plan.id} className="border border-[#E5E5E5] rounded-xl p-4 bg-[#FAFAFA]">
              {/* Plan header: name + type buttons + remove */}
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  value={plan.name}
                  onChange={(e) => updatePlan(plan.id, { name: e.target.value })}
                  className="flex-1 h-8 bg-white border border-[#E5E5E5] rounded px-2 text-sm font-medium focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none transition-colors min-w-0"
                  placeholder="Plan name"
                />
                <div className="flex items-center gap-1 flex-shrink-0">
                  {(['medicare_advantage', 'aca_marketplace', 'medicaid_mco', 'custom'] as const).map(pt => (
                    <button
                      key={pt}
                      onClick={() => applyPlanType(plan.id, pt)}
                      className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                        plan.planType === pt
                          ? 'bg-[#EA2C00] text-white'
                          : 'bg-white border border-[#E5E5E5] text-[#888888] hover:border-[#EA2C00] hover:text-[#EA2C00]'
                      }`}
                    >
                      {PLAN_TYPE_LABELS[pt]}
                    </button>
                  ))}
                </div>
                {plans.length > 1 && (
                  <button
                    onClick={() => removePlan(plan.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F5F0EB] text-[#999999] hover:text-[#666666] transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Patients/provider + $ per HCC */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-xs text-[#888888] mb-1">Patients / provider</p>
                  <div className="flex items-center gap-0.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={plan.panelSize ? plan.panelSize.toLocaleString("en-US") : ""}
                      onChange={(e) => { const v = parseFloat(e.target.value.replace(/,/g, "")) || 0; updatePlan(plan.id, { panelSize: v }); }}
                      className="w-20 h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none transition-colors"
                    />
                    <span className="text-xs text-[#888888]">pts</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#888888] mb-1 flex items-center gap-1">
                    $ per captured HCC
                    <Info className="w-3 h-3 text-[#BBBBBB] cursor-help" title="Combined value of RAF score × annual payment per RAF point. Typically $800–$1,500 for MA." />
                  </p>
                  <div className="flex items-center gap-0.5">
                    <span className="text-xs text-[#888888]">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={plan.valuePerHcc ? plan.valuePerHcc.toLocaleString("en-US") : ""}
                      onChange={(e) => { const v = parseFloat(e.target.value.replace(/,/g, "")) || 0; updatePlan(plan.id, { valuePerHcc: v }); }}
                      className="w-full h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* RECAPTURE section */}
              <div className="mb-3">
                <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1px] mb-2">Recapture</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-[#888888] mb-1">HCC gap rate</p>
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        value={plan.gapRate}
                        onChange={(e) => updatePlan(plan.id, { gapRate: parseFloat(e.target.value) || 0 })}
                        className="w-14 h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none transition-colors"
                      />
                      <span className="text-xs text-[#888888]">%</span>
                    </div>
                    <p className="text-[10px] text-[#AAAAAA] mt-0.5">% of pts with documented gaps</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#888888] mb-1">Current recapture rate</p>
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        value={plan.currentRecaptureRate}
                        onChange={(e) => updatePlan(plan.id, { currentRecaptureRate: parseFloat(e.target.value) || 0 })}
                        className="w-14 h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none transition-colors"
                      />
                      <span className="text-xs text-[#888888]">%</span>
                    </div>
                    <p className="text-[10px] text-[#AAAAAA] mt-0.5">% of gaps currently captured</p>
                  </div>
                </div>
                <p className="text-xs text-[#888888] mb-1.5">Abridge uplift</p>
                <div className="flex items-center gap-1.5 mb-2">
                  {([
                    { key: 'conservative' as const, label: 'Conservative', pp: 5 },
                    { key: 'typical'      as const, label: 'Typical',      pp: 10 },
                    { key: 'optimistic'   as const, label: 'Optimistic',   pp: 15 },
                  ]).map(({ key, label, pp }) => (
                    <button
                      key={key}
                      onClick={() => updatePlan(plan.id, { uplift: key })}
                      className={`flex-1 py-1.5 rounded-lg border text-center transition-all ${
                        plan.uplift === key
                          ? 'bg-[#EA2C00] border-[#EA2C00] text-white'
                          : 'bg-white border-[#E5E5E5] text-[#444] hover:border-[#D1D5DB]'
                      }`}
                      data-testid={`button-hcc-${key}`}
                    >
                      <p className={`text-[9px] ${plan.uplift === key ? 'text-white/80' : 'text-[#888888]'}`}>{label}</p>
                      <p className="text-xs font-semibold">+{pp}pp</p>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 bg-[#F5F0EB] rounded-lg px-3 py-2">
                  <span className="text-xs text-[#888888]">{plan.currentRecaptureRate}%</span>
                  <div className="flex-1 h-1 bg-[#D1C4B0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#EA2C00] rounded-full"
                      style={{ width: `${Math.max(0, Math.min(100, calc.effectiveUplift > 0 && (100 - plan.currentRecaptureRate) > 0 ? (calc.effectiveUplift / (100 - plan.currentRecaptureRate)) * 100 : 0))}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-[#EA2C00]">{calc.projectedRate}%</span>
                  <span className="text-[10px] text-[#888888]">with Abridge</span>
                  {calc.effectiveUplift < upliftMap[plan.uplift] && (
                    <span className="text-[9px] text-[#AAAAAA]">(capped)</span>
                  )}
                </div>
              </div>

              {/* NET NEW section */}
              <div className="border-t border-[#E5E5E5] pt-3">
                <button
                  onClick={() => {
                    const opening = !isNetNewOpen;
                    if (opening && !plan.netNewEnabled) updatePlan(plan.id, { netNewEnabled: true });
                    if (!opening) updatePlan(plan.id, { netNewEnabled: false });
                    toggleNetNew(plan.id);
                  }}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <ChevronDown className={`w-3.5 h-3.5 text-[#888888] transition-transform ${isNetNewOpen ? 'rotate-0' : '-rotate-90'}`} />
                  <span className="text-[10px] font-semibold text-[#888888] uppercase tracking-[1px]">Net New Discovery</span>
                  <span className="text-[10px] text-[#AAAAAA] ml-1">– conditions Abridge surfaces that were never coded</span>
                </button>
                <AnimatePresence>
                  {isNetNewOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-[#888888] mb-1">Discovery rate</p>
                          <div className="flex items-center gap-0.5">
                            <input
                              type="number"
                              step="0.1"
                              value={plan.netNewDiscoveryRate}
                              onChange={(e) => updatePlan(plan.id, { netNewDiscoveryRate: parseFloat(e.target.value) || 0 })}
                              className="w-14 h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none transition-colors"
                            />
                            <span className="text-xs text-[#888888]">%</span>
                          </div>
                          <p className="text-[10px] text-[#AAAAAA] mt-0.5">% of patients with new conditions</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#888888] mb-1">Avg new conditions</p>
                          <input
                            type="number"
                            step="0.1"
                            value={plan.netNewAvgConditions}
                            onChange={(e) => updatePlan(plan.id, { netNewAvgConditions: parseFloat(e.target.value) || 0 })}
                            className="w-full h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none transition-colors"
                          />
                          <p className="text-[10px] text-[#AAAAAA] mt-0.5">per patient discovered</p>
                        </div>
                      </div>
                      <div className="mt-2 bg-[#F5F0EB] rounded-lg px-3 py-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#666666]">
                            {formatNumber(state.numberOfProviders)} × {formatNumber(plan.panelSize)} × {plan.netNewDiscoveryRate}% × {plan.netNewAvgConditions} cond
                          </span>
                          <span className="font-semibold text-black ml-2 flex-shrink-0">= {formatCurrency(Math.round(calc.netNewGross))}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add plan button */}
      <button
        onClick={addPlan}
        className="mt-3 flex items-center gap-1.5 text-sm text-[#EA2C00] hover:text-[#C52200] transition-colors font-medium"
        data-testid="button-add-hcc-plan"
      >
        <Plus className="w-4 h-4" />
        Add another plan
      </button>

      <div className="h-px bg-[#E5E5E5] my-5" />

      {/* Estimated Value */}
      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Estimated Value</p>
      <div className="bg-[#F5F0EB] rounded-lg p-4">
        <div className="space-y-3 mb-3">
          {plans.map((plan, idx) => {
            const calc = planCalcs[idx];
            return (
              <div key={plan.id} className="space-y-1">
                <p className="text-xs font-semibold text-[#888888] uppercase tracking-wide">{plan.name}</p>
                <p className="text-sm text-[#666666]">
                  {formatNumber(Math.round(calc.gapPatients))} gap pts × {calc.effectiveUplift}pp uplift × {docQualityInputs.avgHccs} HCCs × {formatCurrency(plan.valuePerHcc)} = <span className="font-semibold text-black">{formatCurrency(Math.round(calc.recaptureGross))}</span>
                </p>
                {plan.netNewEnabled && calc.netNewGross > 0 && (
                  <p className="text-sm text-[#666666]">
                    Net new: {formatNumber(Math.round(state.numberOfProviders * plan.panelSize * plan.netNewDiscoveryRate / 100))} pts × {plan.netNewAvgConditions} cond × {formatCurrency(plan.valuePerHcc)} = <span className="font-semibold text-black">{formatCurrency(Math.round(calc.netNewGross))}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="h-px bg-[#D1D5DB] mb-3" />
        <p className="text-sm text-[#666666] mb-3">
          Total {formatCurrency(Math.round(totalGross))} gross × {docQualityInputs.hccRealization}% realization
        </p>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-black">
            Estimated Annual HCC Value{plans.length > 1 ? ` (${plans.length} plans)` : ''}
          </span>
          <span className="text-2xl font-bold text-[#EA2C00]" data-testid="text-hcc-result">{formatCurrency(Math.round(totalHccRevenueNet))}</span>
        </div>
      </div>

      <div className="h-px bg-[#E5E5E5] my-5" />

      {/* Advanced: shared fields only */}
      <button
        onClick={() => setAdvancedOpen(!advancedOpen)}
        className="flex items-center gap-2 text-sm text-[#666666] hover:text-black transition-colors w-full"
        data-testid="button-hcc-advanced-toggle"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${advancedOpen ? 'rotate-0' : '-rotate-90'}`} />
        <span className="font-medium">Customize Assumptions</span>
        <span className="text-xs text-[#888888]">– adjust if you have your own data</span>
      </button>

      <AnimatePresence>
        {advancedOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-black">Avg missed HCCs per patient</p>
                  <p className="text-xs text-[#888888] mt-0.5">Conditions discussed but not written. 0.5 is conservative; 0.7+ if providers routinely omit chronic condition reaffirmation.</p>
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={docQualityInputs.avgHccs}
                  onChange={(e) => updateDocInputs({ avgHccs: parseFloat(e.target.value) || 0 })}
                  className="w-16 h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm flex-shrink-0 focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none transition-colors"
                  data-testid="input-avg-hccs"
                />
              </div>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-black flex items-center gap-1">
                    Realization rate
                    <Info className="w-3.5 h-3.5 inline-block text-[#999999] cursor-help" title="Accounts for RADV audit risk, payer reconciliation timing, partial adoption. 50% means you capture 50 cents of every gross dollar estimated." />
                  </p>
                  <p className="text-xs text-[#888888] mt-0.5">50% is moderate. Mature programs with clean documentation typically realize 60–75%.</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    value={docQualityInputs.hccRealization}
                    onChange={(e) => updateDocInputs({ hccRealization: parseFloat(e.target.value) || 0 })}
                    className="w-14 h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none transition-colors"
                    data-testid="input-hcc-realization"
                  />
                  <span className="text-xs text-[#888888]">%</span>
                </div>
              </div>
              {(docQualityInputs.avgHccs !== 0.5 || docQualityInputs.hccRealization !== 50) && (
                <button
                  onClick={() => updateDocInputs({ avgHccs: 0.5, hccRealization: 50 })}
                  className="text-xs text-[#EA2C00] hover:underline mt-1"
                  data-testid="button-reset-hcc-defaults"
                >
                  Reset to defaults
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ExploreDocQuality({
  state,
  updateState,
  timeValue,
  onNext,
  onBack,
  onHome,
}: ExploreDocQualityProps) {
  const { docQualityInputs } = state;
  
  const updateDocInputs = (updates: Partial<DocQualityInputs>) => {
    updateState({
      docQualityInputs: { ...docQualityInputs, ...updates }
    });
  };

  const eligibleEncounters = useMemo(() => {
    return Math.round(state.annualEncounters * (state.utilizationPercent / 100));
  }, [state.annualEncounters, state.utilizationPercent]);

  // Scenario percentages
  const wrvuScenarios: Record<ScenarioLevel, number> = { conservative: 2, typical: 5, aggressive: 9, custom: docQualityInputs.wrvuCustomPercent ?? 5 };
const denialsScenarios: Record<ScenarioLevel, number> = { conservative: 25, typical: 50, aggressive: 75, custom: 50 };
  const ipDrgProtectionScenarios: Record<ScenarioLevel, number> = { conservative: 15, typical: 20, aggressive: 25, custom: 20 };
  const ipCdiReductionScenarios: Record<ScenarioLevel, number> = { conservative: 15, typical: 25, aggressive: 35, custom: 25 };

  // wRVU Calculation
  const wrvuLiftPercent = wrvuScenarios[docQualityInputs.wrvuScenario];
  const wrvuLiftPerVisit = docQualityInputs.currentWrvu * (wrvuLiftPercent / 100);
  const totalAdditionalWrvus = eligibleEncounters * wrvuLiftPerVisit;
  const wrvuRevenueGross = totalAdditionalWrvus * docQualityInputs.conversionFactor;
  const wrvuRevenueNet = wrvuRevenueGross * (docQualityInputs.wrvuRealization / 100);

  // HCC Calculation (multi-plan, recapture rate uplift model)
  const hccUpliftMap: Record<string, number> = { conservative: 5, typical: 10, optimistic: 15 };
  let hccTotalGross = 0;
  for (const plan of docQualityInputs.hccPlans) {
    const upliftPp = hccUpliftMap[plan.uplift] ?? 10;
    const effectiveUplift = Math.min(upliftPp, Math.max(0, 90 - plan.currentRecaptureRate));
    const gapPts = state.numberOfProviders * plan.panelSize * (plan.gapRate / 100);
    hccTotalGross += gapPts * (effectiveUplift / 100) * docQualityInputs.avgHccs * plan.valuePerHcc;
    if (plan.netNewEnabled) {
      const netNewPts = state.numberOfProviders * plan.panelSize * (plan.netNewDiscoveryRate / 100);
      hccTotalGross += netNewPts * plan.netNewAvgConditions * plan.valuePerHcc;
    }
  }
  const hccRevenueNet = hccTotalGross * (docQualityInputs.hccRealization / 100);

  // Denials Calculation
  const preventionPercent = denialsScenarios[docQualityInputs.denialsScenario];
  const medNecessityDenials = eligibleEncounters * (docQualityInputs.medNecessityDenialRate / 100);
  const preventedDenials = medNecessityDenials * (preventionPercent / 100);
  const denialsRevenueGross = preventedDenials * docQualityInputs.avgClaimValue;
  const denialsRevenueNet = denialsRevenueGross * (docQualityInputs.denialsRealization / 100);

  // Inpatient: DRG Accuracy Calculation
  const ipDrgProtectionPercent = ipDrgProtectionScenarios[docQualityInputs.ipDrgScenario];
  const ipAdmissionsAtRisk = eligibleEncounters * (docQualityInputs.ipDrgAtRiskRate / 100);
  const ipAdmissionsProtected = ipAdmissionsAtRisk * (ipDrgProtectionPercent / 100);
  const ipDrgGrossValue = ipAdmissionsProtected * docQualityInputs.ipDrgWeightIncrease * docQualityInputs.ipDrgBasePayment;
  const ipDrgNetValue = ipDrgGrossValue * (docQualityInputs.ipDrgRealization / 100);

  // Inpatient: Obs/IP Status Defense Calculation
  const ipObsDefenseGross = eligibleEncounters * (docQualityInputs.ipObsDefenseDenialRate / 100) * docQualityInputs.ipObsDefenseClaimValue * (docQualityInputs.ipObsDefenseDocContribution / 100);
  const ipObsDefenseNet = ipObsDefenseGross * (docQualityInputs.ipObsDefenseRealization / 100);

  // Inpatient: CDI Query Reduction Calculation
  const ipCdiReductionPercent = ipCdiReductionScenarios[docQualityInputs.ipCdiScenario];
  const ipTotalQueries = eligibleEncounters * (docQualityInputs.ipCdiQueryRate / 100);
  const ipQueriesAvoided = ipTotalQueries * (ipCdiReductionPercent / 100);
  const ipCdiSavingsValue = ipQueriesAvoided * docQualityInputs.ipCdiCostPerQuery;

  const formatCurrency = (n: number) => '$' + n.toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  // Care setting-specific configuration
  const isED = state.careSetting === 'ed';
  const isInpatient = state.careSetting === 'inpatient';
  const isNursing = state.careSetting === 'nursing';
  const showHCC = !isED && !isInpatient && !isNursing; // Only show HCC for Outpatient

  // Nursing: Patient Days calculation
  const nursingPatientDays = useMemo(() => {
    return state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
  }, [state.nursingStaffedBeds, state.nursingOccupancyRate]);

  // Nursing: HAPI Prevention calculation (potential value)
  const nursingHapiValue = useMemo(() => {
    const hapisPerYear = (nursingPatientDays / 1000) * docQualityInputs.nursingHapiRate;
    const hapisPrevented = hapisPerYear * (docQualityInputs.nursingHapiPreventionRate / 100);
    return Math.round(hapisPrevented * docQualityInputs.nursingHapiCost);
  }, [nursingPatientDays, docQualityInputs.nursingHapiRate, docQualityInputs.nursingHapiPreventionRate, docQualityInputs.nursingHapiCost]);

  // Nursing: Falls Prevention calculation (potential value)
  const nursingFallsValue = useMemo(() => {
    const fallsPerYear = (nursingPatientDays / 1000) * docQualityInputs.nursingFallsRate;
    const fallsPrevented = fallsPerYear * (docQualityInputs.nursingFallsPreventionRate / 100);
    return Math.round(fallsPrevented * docQualityInputs.nursingFallsCost);
  }, [nursingPatientDays, docQualityInputs.nursingFallsRate, docQualityInputs.nursingFallsPreventionRate, docQualityInputs.nursingFallsCost]);

  // Nursing: Total Care Quality Potential (separate from hard value)
  const nursingCareQualityPotential = useMemo(() => {
    return (docQualityInputs.nursingHapiEnabled ? nursingHapiValue : 0) + 
           (docQualityInputs.nursingFallsEnabled ? nursingFallsValue : 0);
  }, [docQualityInputs.nursingHapiEnabled, docQualityInputs.nursingFallsEnabled, nursingHapiValue, nursingFallsValue]);

  // Calculate total based on care setting
  const totalDocValue = useMemo(() => {
    if (isInpatient) {
      return (docQualityInputs.ipDrgEnabled ? ipDrgNetValue : 0) + 
             (docQualityInputs.ipObsDefenseEnabled ? ipObsDefenseNet : 0) +
             (docQualityInputs.ipCdiEnabled ? ipCdiSavingsValue * (docQualityInputs.ipCdiRealization / 100) : 0);
    }
    if (isNursing) {
      // Nursing: Return 0 for doc quality (all care quality is "potential" and shown separately)
      return 0;
    }
    // Other settings: wRVU + HCC (if applicable) + Denials
    return (docQualityInputs.wrvuEnabled ? wrvuRevenueNet : 0) + 
           (showHCC && docQualityInputs.hccEnabled ? hccRevenueNet : 0) + 
           (docQualityInputs.denialsEnabled ? denialsRevenueNet : 0);
  }, [isInpatient, isNursing, docQualityInputs, ipDrgNetValue, ipObsDefenseNet, ipCdiSavingsValue, wrvuRevenueNet, hccRevenueNet, denialsRevenueNet, showHCC]);

  const docConfig = {
    outpatient: {
      pageTitle: 'Revenue Impact',
      pageSubtitle: 'Better documentation creates downstream revenue. Select the drivers that apply to your organization.',
      driver1Title: 'E/M Level Accuracy',
      driver1Subtitle: 'Capture the complexity you\'re already delivering',
      driver2Title: 'HCC Capture',
      driver2Subtitle: 'Recapture missed diagnoses for MA population',
      driver3Title: 'Denial Prevention',
      driver3Subtitle: 'Reduce documentation-related claim denials',
    },
    ed: {
      pageTitle: 'Revenue Impact',
      pageSubtitle: 'Complete documentation supports accurate coding and faster reimbursement.',
      driver1Title: 'E&M Level Accuracy',
      driver1Subtitle: 'Capture the true complexity of ED visits',
      driver2Title: '', // No HCC for ED
      driver2Subtitle: '',
      driver3Title: 'Denial Prevention',
      driver3Subtitle: 'Reduce documentation-related claim denials',
    },
    inpatient: {
      pageTitle: 'Revenue Impact',
      pageSubtitle: 'Complete documentation drives revenue integrity.',
      driver1Title: 'DRG Accuracy',
      driver1Subtitle: "Capture clinical complexity that's discussed but not documented",
      driver2Title: 'CDI Query Reduction',
      driver2Subtitle: 'Fewer queries when documentation is complete upfront',
      driver3Title: '', // Denials handled within DRG Accuracy
      driver3Subtitle: '',
    },
    nursing: {
      pageTitle: 'Care Quality',
      pageSubtitle: 'Complete nursing documentation supports better outcomes and reduces adverse events.',
      driver1Title: 'Care Plan Quality',
      driver1Subtitle: 'Comprehensive care plans improve patient outcomes',
      driver2Title: 'Fall Risk Visibility Gap',
      driver2Subtitle: 'Real-time Morse score and mobility documentation ensures fall risk status reflects current condition',
      driver3Title: 'HAPI Risk: Documentation Impact',
      driver3Subtitle: 'Real-time skin assessment and risk score capture enables earlier intervention',
    },
  };

  const config = docConfig[state.careSetting || 'outpatient'];

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={5}
        totalSteps={7}
        stepName="Revenue Impact"
        onBack={onBack}
        onHome={onHome}

      />
      <UnifiedHeaderSpacer />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Main Content - Left Column */}
          <div className="flex-1 max-w-[700px]">
        {/* Header */}
        <motion.div 
          className="text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight">
            {config.pageTitle}
          </h1>
          <p className="text-base text-[#888888]">
            {config.pageSubtitle}
          </p>
        </motion.div>

        {/* How to Use This - Outpatient/ED/Inpatient */}
        {!isNursing && (
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-8 md:p-10 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          data-testid="card-how-to-use-doc-quality"
        >
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
            HOW TO USE THIS
          </p>
          <div className="h-px bg-[#D1D5DB] mb-6" />
          <p className="text-sm text-black leading-relaxed" data-testid="text-doc-quality-intro">
            {isInpatient
              ? "Complete documentation drives DRG accuracy and revenue integrity. A single missed CC/MCC can shift DRG weight by 0.3\u20130.5\u2014worth $2,000\u2013$4,000 per case. Select the drivers that apply to your organization, adjust scenarios to match your confidence level, and edit any assumption directly."
              : isED
              ? "Better documentation captures the clinical complexity you\u2019re already delivering. In high-volume ED settings, notes often understate acuity\u2014especially during surges. Select the drivers that apply to your department and adjust scenarios to match your confidence level."
              : "Better documentation creates downstream revenue by capturing the complexity you\u2019re already delivering. Select the drivers that apply to your organization, adjust the scenarios to match your confidence level, and edit any assumption directly."
            }
          </p>
          <p className="text-xs text-[#888888] mt-3">
            All calculations include conservative realization rates. Click into any driver to see and edit the full math.
          </p>
        </motion.div>
        )}

        {/* Nursing: Care Quality Potential Section */}
        {isNursing && (
        <>
        {/* Intro Box - Explaining Potential Value */}
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-5 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
            How to Use This Section
          </p>
          <p className="text-sm text-black leading-relaxed">
            The link between flowsheet documentation and outcomes runs through two things: timeliness — risk signals documented in the moment, not at end of shift — and the share of reclaimed time that goes back to direct care. Both are reflected in your model.
          </p>
        </motion.div>

        {/* Potential Value Drivers Container */}
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div>
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
              Care Quality Potential
            </p>
            <div className="h-px bg-[#D1D5DB] mb-6" />
          </div>

          {/* HAPI Prevention - Potential Value */}
          <div className="space-y-0">
            <div
              className={`w-full p-4 text-left transition-all border-2 border-dashed ${
                docQualityInputs.nursingHapiEnabled 
                  ? (docQualityInputs.nursingHapiExpanded ? "bg-white border-[#EA2C00]/30 rounded-t-lg" : "bg-white border-[#EA2C00]/30 rounded-lg")
                  : "bg-white/70 hover:bg-white border-transparent rounded-lg"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-black">HAPI Risk: Documentation Impact</p>
                    <span className="text-xs font-medium text-[#EA2C00] uppercase tracking-wide bg-[#EA2C00]/10 px-2 py-0.5 rounded">Potential</span>
                  </div>
                  <p className="text-sm text-[#888888]">Real-time flowsheet capture creates the visibility that makes earlier intervention possible.</p>
                </div>
                <div className="flex items-center gap-3">
                  {docQualityInputs.nursingHapiEnabled && (
                    <button
                      onClick={() => updateDocInputs({ nursingHapiExpanded: !docQualityInputs.nursingHapiExpanded })}
                      className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                      data-testid="button-nursing-hapi-expand"
                    >
                      <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${docQualityInputs.nursingHapiExpanded ? 'rotate-0' : '-rotate-90'}`} />
                    </button>
                  )}
                  <button
                    onClick={() => updateDocInputs({ nursingHapiEnabled: !docQualityInputs.nursingHapiEnabled, nursingHapiExpanded: !docQualityInputs.nursingHapiEnabled ? true : docQualityInputs.nursingHapiExpanded })}
                    className={`w-12 h-6 rounded-full relative transition-all ${
                      docQualityInputs.nursingHapiEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                    }`}
                    data-testid="toggle-nursing-hapi"
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                      docQualityInputs.nursingHapiEnabled ? 'right-0.5' : 'left-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {docQualityInputs.nursingHapiEnabled && docQualityInputs.nursingHapiExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white rounded-b-lg p-5 border-2 border-t-0 border-dashed border-[#EA2C00]/30">
                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Theory</p>
                    <p className="text-sm text-black mb-6">
                      HAPIs happen when risk signals aren't visible in time to act. When skin assessments 
                      and turning schedules are documented at the point of care — not hours later — the care 
                      team sees risk factors as they emerge. Timeliness of documentation, not just completeness, 
                      is what creates the window for earlier intervention.
                    </p>

                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 1: Current HAPI Volume</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      <div className="space-y-2.5">
                        <label className="text-sm text-[#888888]">Patient Days/Year</label>
                        <div className="h-12 bg-[#F5F0EB] rounded-lg flex items-center px-3">
                          <span className="font-semibold text-black">
                            {formatNumber(Math.round(state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365))}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-sm text-[#888888]">HAPI Rate (per 1,000)</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={docQualityInputs.nursingHapiRate}
                            onChange={(e) => updateDocInputs({ nursingHapiRate: Number(e.target.value) })}
                            className="h-12 w-full bg-white border border-[#E5E5E5] rounded-lg px-3 text-black text-base"
                            data-testid="input-nursing-hapi-rate"
                          />
                        </div>
                        <p className="text-xs text-[#888888]">National: 2-5%</p>
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-sm text-[#888888]">HAPIs/Year</label>
                        <div className="h-12 bg-[#F5F0EB] rounded-lg flex items-center px-3">
                          <span className="font-semibold text-black">
                            {formatNumber(Math.round((state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365 / 1000) * docQualityInputs.nursingHapiRate))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 2: Documentation-Preventable</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <div className="space-y-2.5">
                        <label className="text-sm text-[#888888]">Prevention Rate</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={docQualityInputs.nursingHapiPreventionRate}
                            onChange={(e) => updateDocInputs({ nursingHapiPreventionRate: Number(e.target.value) })}
                            className="h-12 w-full bg-white border border-[#E5E5E5] rounded-lg px-3 pr-8 text-black text-base"
                            data-testid="input-nursing-hapi-prevention-rate"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                        </div>
                        <p className="text-xs text-[#888888]">5% is conservative</p>
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-sm text-[#888888]">Cost per HAPI</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888] z-10">$</span>
                          <FormattedNumberInput
                            value={docQualityInputs.nursingHapiCost}
                            onChange={(val) => updateDocInputs({ nursingHapiCost: val })}
                            className="h-12 w-full bg-white border border-[#E5E5E5] rounded-lg pl-7 pr-3 text-black text-base"
                            data-testid="input-nursing-hapi-cost"
                          />
                        </div>
                        <p className="text-xs text-[#888888]">CMS: $20k-$70k</p>
                      </div>
                    </div>

                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Step 3: Potential Value</p>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="text-[#666666]">HAPIs/year × Prevention rate</span>
                          <span className="font-semibold text-black flex-shrink-0">
                            {((state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365 / 1000) * docQualityInputs.nursingHapiRate * (docQualityInputs.nursingHapiPreventionRate / 100)).toFixed(1)} prevented
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-[#666666]">× Cost per HAPI</span>
                          <span className="font-semibold text-black flex-shrink-0">{formatCurrency(docQualityInputs.nursingHapiCost)}</span>
                        </div>
                        <div className="h-px bg-[#E5E5E5] my-2" />
                        <div className="flex justify-between gap-2">
                          <span className="text-[#666666] font-medium">Potential HAPI Value</span>
                          <span className="font-bold text-[#EA2C00] flex-shrink-0">
                            {formatCurrency(Math.round((state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365 / 1000) * docQualityInputs.nursingHapiRate * (docQualityInputs.nursingHapiPreventionRate / 100) * docQualityInputs.nursingHapiCost))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-[#FFF8F0] rounded-lg border border-[#EA2C00]/20">
                      <p className="text-xs text-[#666666] italic">
                        This is <strong>potential</strong> value. Not all HAPIs are documentation-preventable. 
                        5% represents cases where real-time assessment documentation would have triggered earlier intervention.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Falls Prevention - Potential Value */}
          <div className="space-y-0">
            <div
              className={`w-full p-4 text-left transition-all border-2 border-dashed ${
                docQualityInputs.nursingFallsEnabled 
                  ? (docQualityInputs.nursingFallsExpanded ? "bg-white border-[#EA2C00]/30 rounded-t-lg" : "bg-white border-[#EA2C00]/30 rounded-lg")
                  : "bg-white/70 hover:bg-white border-transparent rounded-lg"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-black">Fall Risk Visibility Gap</p>
                    <span className="text-xs font-medium text-[#EA2C00] uppercase tracking-wide bg-[#EA2C00]/10 px-2 py-0.5 rounded">Potential</span>
                  </div>
                  <p className="text-sm text-[#888888]">Timely documentation of mobility status and fall risk scores means risk is visible when it matters, not hours later.</p>
                </div>
                <div className="flex items-center gap-3">
                  {docQualityInputs.nursingFallsEnabled && (
                    <button
                      onClick={() => updateDocInputs({ nursingFallsExpanded: !docQualityInputs.nursingFallsExpanded })}
                      className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                      data-testid="button-nursing-falls-expand"
                    >
                      <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${docQualityInputs.nursingFallsExpanded ? 'rotate-0' : '-rotate-90'}`} />
                    </button>
                  )}
                  <button
                    onClick={() => updateDocInputs({ nursingFallsEnabled: !docQualityInputs.nursingFallsEnabled, nursingFallsExpanded: !docQualityInputs.nursingFallsEnabled ? true : docQualityInputs.nursingFallsExpanded })}
                    className={`w-12 h-6 rounded-full relative transition-all ${
                      docQualityInputs.nursingFallsEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                    }`}
                    data-testid="toggle-nursing-falls"
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                      docQualityInputs.nursingFallsEnabled ? 'right-0.5' : 'left-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {docQualityInputs.nursingFallsEnabled && docQualityInputs.nursingFallsExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white rounded-b-lg p-5 border-2 border-t-0 border-dashed border-[#EA2C00]/30">
                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Theory</p>
                    <p className="text-sm text-black mb-6">
                      Falls happen when risk factors aren't visible at the moment they matter. When fall-risk 
                      assessments are documented at the point of care, the care team sees who's high-risk 
                      right now — not at the end of shift. This timeliness is the difference between 
                      a preventive intervention and a post-event incident report.
                    </p>

                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Your Organization</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <div className="space-y-2.5">
                        <label className="text-sm text-[#888888]">Falls Rate (per 1,000 patient days)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={docQualityInputs.nursingFallsRate}
                          onChange={(e) => updateDocInputs({ nursingFallsRate: Number(e.target.value) })}
                          className="h-12 w-full bg-white border border-[#E5E5E5] rounded-lg px-3 text-black text-base"
                          data-testid="input-nursing-falls-rate"
                        />
                        <p className="text-xs text-[#888888]">National: 3-5 per 1,000</p>
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-sm text-[#888888]">Cost per Fall</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888] z-10">$</span>
                          <FormattedNumberInput
                            value={docQualityInputs.nursingFallsCost}
                            onChange={(val) => updateDocInputs({ nursingFallsCost: val })}
                            className="h-12 w-full bg-white border border-[#E5E5E5] rounded-lg pl-7 pr-3 text-black text-base"
                            data-testid="input-nursing-falls-cost"
                          />
                        </div>
                        <p className="text-xs text-[#888888]">Avg: $6,500</p>
                      </div>
                    </div>

                    <div className="space-y-2.5 mb-6">
                      <label className="text-sm text-[#888888]">Prevention Rate</label>
                      <div className="relative w-full sm:w-48">
                        <input
                          type="number"
                          value={docQualityInputs.nursingFallsPreventionRate}
                          onChange={(e) => updateDocInputs({ nursingFallsPreventionRate: Number(e.target.value) })}
                          className="h-12 w-full bg-white border border-[#E5E5E5] rounded-lg px-3 pr-8 text-black text-base"
                          data-testid="input-nursing-falls-prevention-rate"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                      </div>
                      <p className="text-xs text-[#888888]">5% is conservative—represents documentation-preventable falls</p>
                    </div>

                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Calculation</p>
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="text-[#666666]">Patient days × Falls rate / 1,000</span>
                          <span className="font-semibold text-black flex-shrink-0">
                            {Math.round((state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365 / 1000) * docQualityInputs.nursingFallsRate)} falls/year
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-[#666666]">× Prevention rate</span>
                          <span className="font-semibold text-black flex-shrink-0">{docQualityInputs.nursingFallsPreventionRate}%</span>
                        </div>
                        <div className="h-px bg-[#E5E5E5] my-2" />
                        <div className="flex justify-between gap-2">
                          <span className="text-[#666666]">= Falls prevented</span>
                          <span className="font-semibold text-black flex-shrink-0">
                            {((state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365 / 1000) * docQualityInputs.nursingFallsRate * (docQualityInputs.nursingFallsPreventionRate / 100)).toFixed(1)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-[#666666]">× Cost per fall</span>
                          <span className="font-semibold text-black flex-shrink-0">{formatCurrency(docQualityInputs.nursingFallsCost)}</span>
                        </div>
                        <div className="h-px bg-[#E5E5E5] my-2" />
                        <div className="flex justify-between gap-2">
                          <span className="text-[#666666] font-medium">Potential Falls Value</span>
                          <span className="font-bold text-[#EA2C00] flex-shrink-0">
                            {formatCurrency(Math.round((state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365 / 1000) * docQualityInputs.nursingFallsRate * (docQualityInputs.nursingFallsPreventionRate / 100) * docQualityInputs.nursingFallsCost))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Patient Experience (HCAHPS) - Qualitative Only */}
          <div className="space-y-0">
            <div
              className={`w-full p-4 text-left transition-all border-2 border-dashed ${
                docQualityInputs.nursingHcahpsEnabled 
                  ? (docQualityInputs.nursingHcahpsExpanded ? "bg-white border-[#EA2C00]/30 rounded-t-lg" : "bg-white border-[#EA2C00]/30 rounded-lg")
                  : "bg-white/70 hover:bg-white border-transparent rounded-lg"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-black">Patient Experience (HCAHPS)</p>
                    <span className="text-xs font-medium text-[#888888] uppercase tracking-wide bg-[#F5F0EB] px-2 py-0.5 rounded">Qualitative</span>
                  </div>
                  <p className="text-sm text-[#888888]">More bedside time correlates with better satisfaction</p>
                </div>
                <div className="flex items-center gap-3">
                  {docQualityInputs.nursingHcahpsEnabled && (
                    <button
                      onClick={() => updateDocInputs({ nursingHcahpsExpanded: !docQualityInputs.nursingHcahpsExpanded })}
                      className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                      data-testid="button-nursing-hcahps-expand"
                    >
                      <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${docQualityInputs.nursingHcahpsExpanded ? 'rotate-0' : '-rotate-90'}`} />
                    </button>
                  )}
                  <button
                    onClick={() => updateDocInputs({ nursingHcahpsEnabled: !docQualityInputs.nursingHcahpsEnabled, nursingHcahpsExpanded: !docQualityInputs.nursingHcahpsEnabled ? true : docQualityInputs.nursingHcahpsExpanded })}
                    className={`w-12 h-6 rounded-full relative transition-all ${
                      docQualityInputs.nursingHcahpsEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                    }`}
                    data-testid="toggle-nursing-hcahps"
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                      docQualityInputs.nursingHcahpsEnabled ? 'right-0.5' : 'left-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {docQualityInputs.nursingHcahpsEnabled && docQualityInputs.nursingHcahpsExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white rounded-b-lg p-5 border-2 border-t-0 border-dashed border-[#EA2C00]/30">
                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">The Connection</p>
                    <p className="text-sm text-black mb-6">
                      When nurses spend less time on documentation, they spend more time with patients. 
                      Research consistently shows bedside time correlates with patient satisfaction.
                    </p>

                    <div className="bg-[#F5F0EB] rounded-lg p-6 text-center mb-6">
                      <p className="text-4xl font-bold text-[#EA2C00]">
                        {state.numberOfProviders > 0 ? ((state.nursingMinutesPerShift * state.nursingShiftsPerNurseYear / 60 / 52) * 0.75).toFixed(1) : '—'}
                      </p>
                      <p className="text-lg font-medium text-black mt-1">hours at bedside</p>
                      <p className="text-sm text-[#666666] mt-1">per nurse per week</p>
                    </div>

                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">We Don't Calculate This</p>
                    <p className="text-sm text-[#666666] mb-4">
                      HCAHPS scores are influenced by dozens of factors—wait times, pain management, 
                      communication, environment, and more. We can't credibly attribute HCAHPS improvement 
                      to documentation alone.
                    </p>

                    <div className="p-4 bg-[#E8F4F8] rounded-lg border-l-4 border-[#0094D9]">
                      <p className="text-sm text-[#333333]">
                        <strong>But consider:</strong> Hospitals in the top quartile of HCAHPS receive 
                        ~2% higher reimbursement through Value-Based Purchasing. Even small improvements matter.
                      </p>
                    </div>

                    <p className="text-sm text-[#888888] italic mt-4">
                      Track HCAHPS as a leading indicator after implementation.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        </>
        )}

        {/* Inpatient: Revenue Drivers Container */}
        {isInpatient && (
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-6 space-y-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          data-testid="card-revenue-drivers-inpatient"
        >
        {/* DRG Accuracy */}
        <div className="space-y-0">
          <div
            className={`w-full p-4 text-left transition-all ${
              docQualityInputs.ipDrgEnabled 
                ? (docQualityInputs.ipDrgExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB] rounded-lg"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">{config.driver1Title}</p>
                <p className="text-sm text-[#888888]">{config.driver1Subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                {docQualityInputs.ipDrgEnabled && (
                  <button
                    onClick={() => updateDocInputs({ ipDrgExpanded: !docQualityInputs.ipDrgExpanded })}
                    className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                    data-testid="button-drg-expand"
                  >
                    <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${docQualityInputs.ipDrgExpanded ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                )}
                <button
                  onClick={() => updateDocInputs({ ipDrgEnabled: !docQualityInputs.ipDrgEnabled, ipDrgExpanded: !docQualityInputs.ipDrgEnabled ? true : docQualityInputs.ipDrgExpanded })}
                  className={`w-12 h-6 rounded-full relative transition-all ${
                    docQualityInputs.ipDrgEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid="toggle-drg"
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                    docQualityInputs.ipDrgEnabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {docQualityInputs.ipDrgEnabled && docQualityInputs.ipDrgExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-lg p-6 md:p-8">
                  <p className="text-[13px] text-[#666666] leading-relaxed mb-8">
                    Documentation gaps cost you twice—first at coding, then at audit. Abridge captures the clinical conversations that close these gaps.
                  </p>

                  {/* STEP 1: YOUR DOCUMENTATION OPPORTUNITY */}
                  <div className="mb-10">
                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                      Step 1: Your Documentation Opportunity
                    </p>
                    <p className="text-[13px] text-[#666666] mb-4">How often does CDI identify documentation opportunities?</p>
                    <div className="bg-[#F5F0EB] rounded-lg p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Eligible Admissions</label>
                          <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                            <span className="font-semibold text-black">{formatNumber(eligibleEncounters)}</span>
                          </div>
                        </div>
                        <span className="text-[#888888] text-xl hidden sm:block">×</span>
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">CDI Opportunity Rate</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="1"
                              value={docQualityInputs.ipDrgAtRiskRate}
                              onChange={(e) => updateDocInputs({ ipDrgAtRiskRate: parseFloat(e.target.value) || 0 })}
                              className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 pr-8 text-black font-semibold text-base"
                              data-testid="input-drg-at-risk"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888]">%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center py-2">
                        <span className="text-[13px] text-[#666666]">= </span>
                        <span className="font-semibold text-black">{formatNumber(Math.round(ipAdmissionsAtRisk))} admissions with documentation opportunities</span>
                      </div>
                      <p className="text-[13px] text-[#888888] mt-3">
                        CDI programs typically identify gaps in 15{"–"}25% of admissions. 18% reflects a conservative starting point {"—"} your CDI team can tell you your actual query rate.
                      </p>
                    </div>
                  </div>

                  {/* STEP 2: THE GAP ABRIDGE CLOSES */}
                  <div className="mb-10">
                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                      Step 2: The Gap Abridge Closes
                    </p>
                    <p className="text-[13px] text-[#666666] mb-2">
                      Not all gaps are the same. Abridge specifically captures "discussed but not documented"—clinical reasoning that happened verbally but didn't make the note.
                    </p>
                    <p className="text-[13px] text-[#666666] mb-4">What portion of your documentation gaps are verbal-to-written gaps?</p>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
                      {(['conservative', 'typical', 'aggressive'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => updateDocInputs({ ipDrgScenario: level })}
                          className={`p-2 sm:p-4 rounded-lg border transition-all text-center ${
                            docQualityInputs.ipDrgScenario === level
                              ? "bg-[#EA2C00] border-[#EA2C00] text-white"
                              : "bg-white border-[#E5E5E5] text-black hover:border-[#D1D5DB]"
                          }`}
                          data-testid={`button-drg-${level}`}
                        >
                          <p className={`text-xs capitalize mb-1 ${docQualityInputs.ipDrgScenario === level ? 'text-white/80' : 'text-[#888888]'}`}>
                            {level === 'aggressive' ? 'Optimistic' : level}
                          </p>
                          <p className="font-semibold text-lg">{ipDrgProtectionScenarios[level]}%</p>
                        </button>
                      ))}
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4 text-center mb-4">
                      <span className="text-[13px] text-[#666666]">{formatNumber(Math.round(ipAdmissionsAtRisk))} × {ipDrgProtectionPercent}% = </span>
                      <span className="font-semibold text-black">{formatNumber(Math.round(ipAdmissionsProtected))} admissions where Abridge captures what was missed</span>
                    </div>
                    <div className="text-[13px] text-[#888888] space-y-1">
                      <p><strong>Conservative:</strong> Only conditions explicitly named in conversation that are absent from the note</p>
                      <p><strong>Typical:</strong> Includes clinical reasoning and specificity that supports CC/MCC assignment</p>
                      <p><strong>Optimistic:</strong> Strong provider adoption; coders actively using ambient-captured note content</p>
                      <p className="text-xs text-[#AAAAAA] mt-2 italic">Note: This value depends on your coding team using what Abridge captures. Validate with your CDI director.</p>
                    </div>
                  </div>

                  {/* STEP 3: REVENUE IMPACT */}
                  <div className="mb-10">
                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                      Step 3: Revenue Impact
                    </p>
                    <p className="text-[13px] text-[#666666] mb-4">When a missed CC/MCC is captured, DRG weight increases.</p>
                    <div className="bg-[#F5F0EB] rounded-lg p-5 mb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Admissions Captured</label>
                          <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                            <span className="font-semibold text-black">{formatNumber(Math.round(ipAdmissionsProtected))}</span>
                          </div>
                        </div>
                        <span className="text-[#888888] text-xl hidden sm:block">×</span>
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Avg DRG Weight Lift</label>
                          <input
                            type="number"
                            step="0.1"
                            value={docQualityInputs.ipDrgWeightIncrease}
                            onChange={(e) => updateDocInputs({ ipDrgWeightIncrease: parseFloat(e.target.value) || 0 })}
                            className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 text-black font-semibold text-base"
                            data-testid="input-drg-weight"
                          />
                        </div>
                        <span className="text-[#888888] text-xl hidden sm:block">×</span>
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Base DRG Payment</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888888]">$</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={docQualityInputs.ipDrgBasePayment ? docQualityInputs.ipDrgBasePayment.toLocaleString("en-US") : ""}
                              onChange={(e) => { const v = parseFloat(e.target.value.replace(/,/g, "")) || 0; updateDocInputs({ ipDrgBasePayment: v }); }}
                              className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg pl-8 pr-4 text-black font-semibold text-base"
                              data-testid="input-drg-base"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="text-center py-2">
                        <span className="text-[13px] text-[#666666]">= </span>
                        <span className="font-semibold text-black">{formatCurrency(Math.round(ipDrgGrossValue))} gross value</span>
                      </div>
                    </div>

                    {/* Benchmark Table */}
                    <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-4 mb-4">
                      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2 flex items-center gap-2">
                        <span>📊</span> Common Documentation Gaps
                      </p>
                      <p className="text-[13px] text-[#666666] mb-3">
                        These conditions are frequently discussed but under-documented. When captured, they change DRG assignment.
                      </p>
                      <div className="space-y-2 text-[13px]">
                        <div className="flex justify-between gap-2">
                          <span className="text-[#666666]">Acute respiratory failure</span>
                          <span className="text-black">+0.3 to +0.5</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-[#666666]">Sepsis / Severe sepsis</span>
                          <span className="text-black">+0.4 to +0.6</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-[#666666]">Malnutrition</span>
                          <span className="text-black">+0.2 to +0.4</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-[#666666]">Acute encephalopathy</span>
                          <span className="text-black">+0.3 to +0.5</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-[#666666]">Acute kidney injury</span>
                          <span className="text-black">+0.1 to +0.3</span>
                        </div>
                      </div>
                      <p className="text-[13px] text-[#888888] mt-3">
                        0.4 is a blended average across common missed CCs/MCCs.
                      </p>
                    </div>
                  </div>

                  {/* STEP 4: WHAT YOU CAN COUNT ON */}
                  <div className="mb-8">
                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                      Step 4: What You Can Count On
                    </p>
                    <p className="text-[13px] text-[#666666] mb-4">Not all captured documentation changes the final code.</p>
                    <div className="bg-[#F5F0EB] rounded-lg p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Gross Value</label>
                          <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                            <span className="font-semibold text-black">{formatCurrency(Math.round(ipDrgGrossValue))}</span>
                          </div>
                        </div>
                        <span className="text-[#888888] text-xl hidden sm:block">×</span>
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Realization Rate <Info className="w-3.5 h-3.5 inline-block text-[#999999] -mt-0.5 cursor-help" title="Realization rate accounts for the fact that not all gross opportunity converts to captured value — due to workflow variation, payer mix, coder judgment, or partial adoption. 75% means you capture 75 cents of every dollar the gross calculation shows." /></label>
                          <div className="relative">
                            <input
                              type="number"
                              step="5"
                              value={docQualityInputs.ipDrgRealization}
                              onChange={(e) => updateDocInputs({ ipDrgRealization: parseFloat(e.target.value) || 0 })}
                              className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 pr-8 text-black font-semibold text-base"
                              data-testid="input-drg-realization"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888]">%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center py-2">
                        <span className="text-[13px] text-[#666666]">= </span>
                        <span className="font-semibold text-black">{formatCurrency(Math.round(ipDrgNetValue))} net</span>
                      </div>
                      <p className="text-[13px] text-[#888888] mt-3">
                        33% is a conservative realization rate that accounts for audit risk, coder judgment, and cases where documentation doesn't change final DRG.
                      </p>
                    </div>
                  </div>

                  {/* Final Value */}
                  <div className="border-t border-[#E5E5E5] pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-semibold text-black">Annual DRG Value</span>
                      <span className="text-2xl font-bold text-[#EA2C00]">{formatCurrency(Math.round(ipDrgNetValue))}</span>
                    </div>
                    <p className="text-[13px] text-[#888888] flex items-start gap-2">
                      <span>⚠️</span>
                      <span>Validate with your CDI team. They know your case mix and current gap rates better than any benchmark.</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Obs/IP Status Defense */}
        <div className="space-y-0">
          <div
            className={`w-full p-4 text-left transition-all ${
              docQualityInputs.ipObsDefenseEnabled 
                ? (docQualityInputs.ipObsDefenseExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB] rounded-lg"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">Medical Necessity Appeal Support</p>
                <p className="text-sm text-[#888888]">When payers challenge IP status retrospectively, complete documentation is your defense</p>
              </div>
              <div className="flex items-center gap-3">
                {docQualityInputs.ipObsDefenseEnabled && (
                  <button
                    onClick={() => updateDocInputs({ ipObsDefenseExpanded: !docQualityInputs.ipObsDefenseExpanded })}
                    className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                    data-testid="button-obs-defense-expand"
                  >
                    <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${docQualityInputs.ipObsDefenseExpanded ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                )}
                <button
                  onClick={() => updateDocInputs({ ipObsDefenseEnabled: !docQualityInputs.ipObsDefenseEnabled, ipObsDefenseExpanded: !docQualityInputs.ipObsDefenseEnabled ? true : docQualityInputs.ipObsDefenseExpanded })}
                  className={`w-12 h-6 rounded-full relative transition-all ${
                    docQualityInputs.ipObsDefenseEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid="toggle-obs-defense"
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                    docQualityInputs.ipObsDefenseEnabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {docQualityInputs.ipObsDefenseEnabled && docQualityInputs.ipObsDefenseExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-lg p-6 md:p-8">
                  <p className="text-[13px] text-[#666666] leading-relaxed mb-4">
                    Obs/IP status is determined at admission {"—"} Abridge doesn{"'"}t change that decision. What it changes is the quality of the documentation that supports it. When payers challenge IP status in retrospective review, the attending{"'"}s clinical reasoning needs to be in the record. Ambient documentation captures that reasoning in the note at the time of the encounter, not reconstructed later.
                  </p>
                  <div className="bg-[#FFF8F0] border border-[#EA2C00]/20 rounded-lg px-4 py-3 mb-6 flex items-start gap-2">
                    <span className="text-[#EA2C00] text-sm mt-0.5 shrink-0">{"ⓘ"}</span>
                    <p className="text-xs text-[#666666]">
                      <strong>What this models:</strong> The share of medical necessity denials where the appeal outcome depends on the quality of the original encounter documentation {"—"} and where a more complete Abridge-generated note would have supported the appeal. This is not a denial prevention model. It is a denial defense model.
                    </p>
                  </div>

                  {/* STEP 1: DENIAL EXPOSURE */}
                  <div className="mb-10">
                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                      Step 1: Denial Exposure
                    </p>
                    <div className="bg-[#F5F0EB] rounded-lg p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Admissions</label>
                          <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                            <span className="font-semibold text-black">{formatNumber(eligibleEncounters)}</span>
                          </div>
                        </div>
                        <span className="text-[#888888] text-xl hidden sm:block">×</span>
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Denial Rate</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="1"
                              min={3}
                              max={7}
                              value={docQualityInputs.ipObsDefenseDenialRate}
                              onChange={(e) => updateDocInputs({ ipObsDefenseDenialRate: parseFloat(e.target.value) || 0 })}
                              className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 pr-8 text-black font-semibold text-base"
                              data-testid="input-obs-denial-rate"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888]">%</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[13px] text-[#888888] mt-3">
                        Medical necessity denial rates typically range 3–7%. 5% is average for status-related denials.
                      </p>
                    </div>
                  </div>

                  {/* STEP 2: CLAIM VALUE */}
                  <div className="mb-10">
                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                      Step 2: Average Contested Claim Value
                    </p>
                    <div className="bg-[#F5F0EB] rounded-lg p-5">
                      <div className="flex-1">
                        <label className="text-[13px] text-[#666666] mb-1.5 block">Avg Contested Claim Value</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888888] z-10">$</span>
                          <FormattedNumberInput
                            value={docQualityInputs.ipObsDefenseClaimValue}
                            onChange={(val) => updateDocInputs({ ipObsDefenseClaimValue: val })}
                            className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg pl-8 pr-4 text-black font-semibold text-base"
                            data-testid="input-obs-claim-value"
                          />
                        </div>
                      </div>
                      <p className="text-[13px] text-[#888888] mt-3">
                        The average inpatient claim subject to status denials. $10,000 is a conservative benchmark.
                      </p>
                    </div>
                  </div>

                  {/* STEP 3: DOCUMENTATION CONTRIBUTION */}
                  <div className="mb-10">
                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                      Step 3: Appeal-Sensitive Denials
                    </p>
                    <div className="bg-[#F5F0EB] rounded-lg p-5">
                      <div className="flex-1">
                        <label className="text-[13px] text-[#666666] mb-1.5 block">Documentation Contribution %</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="5"
                            min={25}
                            max={55}
                            value={docQualityInputs.ipObsDefenseDocContribution}
                            onChange={(e) => updateDocInputs({ ipObsDefenseDocContribution: parseFloat(e.target.value) || 0 })}
                            className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 pr-8 text-black font-semibold text-base"
                            data-testid="input-obs-doc-contribution"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888]">%</span>
                        </div>
                      </div>
                      <p className="text-[13px] text-[#888888] mt-3">
                        Of your medical necessity denials, what % do you lose specifically because documentation didn{"'"}t capture clinical reasoning adequately? For systems using Abridge, 35{"–"}55% is appropriate {"—"} better notes directly reduce these losses.
                      </p>
                    </div>
                  </div>

                  {/* STEP 4: REALIZATION */}
                  <div className="mb-8">
                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                      Step 4: What You Can Count On
                    </p>
                    <p className="text-[13px] text-[#666666] mb-4">Not all improved documentation prevents every denial.</p>
                    <div className="bg-[#F5F0EB] rounded-lg p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Gross Value</label>
                          <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                            <span className="font-semibold text-black">{formatCurrency(Math.round(ipObsDefenseGross))}</span>
                          </div>
                        </div>
                        <span className="text-[#888888] text-xl hidden sm:block">×</span>
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Conservative Realization</label>
                          <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                            <span className="font-semibold text-black">{docQualityInputs.ipObsDefenseRealization}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center py-2">
                        <span className="text-[13px] text-[#666666]">= </span>
                        <span className="font-semibold text-black">{formatCurrency(Math.round(ipObsDefenseNet))} net</span>
                      </div>
                      <p className="text-[13px] text-[#888888] mt-3">
                        25% accounts for the reality that most denials involve medical judgment disputes, not just documentation gaps. Even with perfect documentation, payers often sustain denials. Only count cases where documentation quality was the deciding factor.
                      </p>
                    </div>
                  </div>

                  {/* Final Value */}
                  <div className="border-t border-[#E5E5E5] pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-semibold text-black">Annual Obs/IP Defense Value</span>
                      <span className="text-2xl font-bold text-[#EA2C00]">{formatCurrency(Math.round(ipObsDefenseNet))}</span>
                    </div>
                    <p className="text-[13px] text-[#888888] flex items-start gap-2">
                      <span>⚠️</span>
                      <span>Your denial management team tracks appeal win/loss rates. Ask them: {"\""}How many of our lost appeals could have been won with better encounter documentation?{"\""} That number {"—"} not this model {"—"} is your real baseline.</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* CDI Query Reduction */}
        <div className="space-y-0">
          <div
            className={`w-full p-4 text-left transition-all ${
              docQualityInputs.ipCdiEnabled 
                ? (docQualityInputs.ipCdiExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB] rounded-lg"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">{config.driver2Title}</p>
                <p className="text-sm text-[#888888]">{config.driver2Subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                {docQualityInputs.ipCdiEnabled && (
                  <button
                    onClick={() => updateDocInputs({ ipCdiExpanded: !docQualityInputs.ipCdiExpanded })}
                    className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                    data-testid="button-cdi-expand"
                  >
                    <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${docQualityInputs.ipCdiExpanded ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                )}
                <button
                  onClick={() => updateDocInputs({ ipCdiEnabled: !docQualityInputs.ipCdiEnabled, ipCdiExpanded: !docQualityInputs.ipCdiEnabled ? true : docQualityInputs.ipCdiExpanded })}
                  className={`w-12 h-6 rounded-full relative transition-all ${
                    docQualityInputs.ipCdiEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid="toggle-cdi"
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                    docQualityInputs.ipCdiEnabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {docQualityInputs.ipCdiEnabled && docQualityInputs.ipCdiExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-lg p-6 md:p-8">
                  <p className="text-[13px] text-[#666666] leading-relaxed mb-8">
                    When Abridge captures clinical conversations, many queries become unnecessary—freeing CDI to focus on complex cases.
                  </p>

                  {/* STEP 1: CURRENT QUERY VOLUME */}
                  <div className="mb-10">
                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                      Step 1: Current Query Volume
                    </p>
                    <div className="bg-[#F5F0EB] rounded-lg p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Admissions</label>
                          <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                            <span className="font-semibold text-black">{formatNumber(eligibleEncounters)}</span>
                          </div>
                        </div>
                        <span className="text-[#888888] text-xl hidden sm:block">×</span>
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Query Rate</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="5"
                              value={docQualityInputs.ipCdiQueryRate}
                              onChange={(e) => updateDocInputs({ ipCdiQueryRate: parseFloat(e.target.value) || 0 })}
                              className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 pr-8 text-black font-semibold text-base"
                              data-testid="input-cdi-query-rate"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888]">%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center py-2">
                        <span className="text-[13px] text-[#666666]">= </span>
                        <span className="font-semibold text-black">{formatNumber(Math.round(ipTotalQueries))} queries/year</span>
                      </div>
                      <p className="text-[13px] text-[#888888] mt-3">
                        CDI query rates typically range 20-40%. 30% is average.
                      </p>
                    </div>
                  </div>

                  {/* STEP 2: QUERIES AVOIDED */}
                  <div className="mb-10">
                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                      Step 2: Queries Avoided
                    </p>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                      {(['conservative', 'typical', 'aggressive'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => updateDocInputs({ ipCdiScenario: level })}
                          className={`p-2 sm:p-4 rounded-lg border transition-all text-center ${
                            docQualityInputs.ipCdiScenario === level
                              ? "bg-[#EA2C00] border-[#EA2C00] text-white"
                              : "bg-white border-[#E5E5E5] text-black hover:border-[#D1D5DB]"
                          }`}
                          data-testid={`button-cdi-${level}`}
                        >
                          <p className={`text-xs capitalize mb-1 ${docQualityInputs.ipCdiScenario === level ? 'text-white/80' : 'text-[#888888]'}`}>
                            {level === 'aggressive' ? 'Optimistic' : level}
                          </p>
                          <p className="font-semibold text-lg">{ipCdiReductionScenarios[level]}%</p>
                        </button>
                      ))}
                    </div>
                    <div className="bg-[#F5F0EB] rounded-lg p-4 text-center">
                      <span className="text-[13px] text-[#666666]">{formatNumber(Math.round(ipTotalQueries))} × {ipCdiReductionPercent}% = </span>
                      <span className="font-semibold text-black">{formatNumber(Math.round(ipQueriesAvoided))} queries avoided</span>
                    </div>
                  </div>

                  {/* STEP 3: SAVINGS */}
                  <div className="mb-8">
                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                      Step 3: Savings
                    </p>
                    <div className="bg-[#F5F0EB] rounded-lg p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Queries Avoided</label>
                          <div className="h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 flex items-center">
                            <span className="font-semibold text-black">{formatNumber(Math.round(ipQueriesAvoided))}</span>
                          </div>
                        </div>
                        <span className="text-[#888888] text-xl hidden sm:block">×</span>
                        <div className="flex-1">
                          <label className="text-[13px] text-[#666666] mb-1.5 block">Cost per Query</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888888] z-10">$</span>
                            <FormattedNumberInput
                              value={docQualityInputs.ipCdiCostPerQuery}
                              onChange={(val) => updateDocInputs({ ipCdiCostPerQuery: val })}
                              className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg pl-8 pr-4 text-black font-semibold text-base"
                              data-testid="input-cdi-cost"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="text-center py-2">
                        <span className="text-[13px] text-[#666666]">= </span>
                        <span className="font-semibold text-black">{formatCurrency(Math.round(ipCdiSavingsValue))}</span>
                      </div>
                      <p className="text-[13px] text-[#888888] mt-3">
                        Fully loaded cost per query: $50-$100. We use $50 conservatively.
                      </p>
                    </div>
                  </div>

                  {/* Step 4: Realization Rate */}
                  <div className="mb-8">
                    <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
                      Step 4: Realization Rate
                    </p>
                    <div className="bg-[#F5F0EB] rounded-lg p-5">
                      <div className="flex-1">
                        <label className="text-[13px] text-[#666666] mb-1.5 block">Realization Rate</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="5"
                            min={50}
                            max={100}
                            value={docQualityInputs.ipCdiRealization}
                            onChange={(e) => updateDocInputs({ ipCdiRealization: parseFloat(e.target.value) || 0 })}
                            className="w-full h-12 bg-white border border-[#E5E5E5] rounded-lg px-4 pr-8 text-black font-semibold text-base"
                            data-testid="input-cdi-realization"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888]">%</span>
                        </div>
                        <p className="text-[13px] text-[#888888] mt-3">
                          What portion of the avoided queries translates to realized savings after accounting for partial query resolution and documentation rework? 75% is a conservative default.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Final Value */}
                  <div className="border-t border-[#E5E5E5] pt-6">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-black">Annual CDI Savings</span>
                      <span className="text-2xl font-bold text-[#EA2C00]">{formatCurrency(Math.round(ipCdiSavingsValue * (docQualityInputs.ipCdiRealization / 100)))}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        </motion.div>
        )}

        {/* Revenue Drivers Container - Outpatient/ED */}
        {!isInpatient && !isNursing && (
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-6 space-y-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          data-testid="card-revenue-drivers"
        >
        {/* wRVU Improvement */}
        <div className="space-y-0">
          <div
            className={`w-full p-4 text-left transition-all ${
              docQualityInputs.wrvuEnabled 
                ? (docQualityInputs.wrvuExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB] rounded-lg"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">{config.driver1Title}</p>
                <p className="text-sm text-[#888888]">{config.driver1Subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                {docQualityInputs.wrvuEnabled && (
                  <button
                    onClick={() => updateDocInputs({ wrvuExpanded: !docQualityInputs.wrvuExpanded })}
                    className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                    data-testid="button-wrvu-expand"
                  >
                    <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${docQualityInputs.wrvuExpanded ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                )}
                <button
                  onClick={() => updateDocInputs({ wrvuEnabled: !docQualityInputs.wrvuEnabled, wrvuExpanded: !docQualityInputs.wrvuEnabled ? true : docQualityInputs.wrvuExpanded })}
                  className={`w-12 h-6 rounded-full relative transition-all ${
                    docQualityInputs.wrvuEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid="toggle-wrvu"
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                    docQualityInputs.wrvuEnabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {docQualityInputs.wrvuEnabled && docQualityInputs.wrvuExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-lg p-5">
                  <p className="text-sm text-black mb-4">
                    When notes fully reflect visit complexity, E/M levels often code higher. 
                    Industry data shows 2–9% E/M level accuracy lift from better documentation.
                  </p>

                  <p className="text-sm font-medium text-black mb-2">Choose your scenario:</p>
                  <div className="flex gap-2 sm:gap-3 mb-4">
                    {(['conservative', 'typical', 'aggressive'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => updateDocInputs({ wrvuScenario: level })}
                        className={`flex-1 p-2 sm:p-3 rounded-lg border-2 transition-all text-center ${
                          docQualityInputs.wrvuScenario !== 'custom' && docQualityInputs.wrvuScenario === level
                            ? "border-[#EA2C00] bg-white"
                            : "border-transparent bg-[#F5F0EB] hover:border-[#D1D5DB]"
                        }`}
                      >
                        <p className="font-medium text-black">
                          {{ conservative: 'Conservative', typical: 'Typical', aggressive: 'Optimistic' }[level]}
                        </p>
                        <p className="text-sm text-[#888888]">{wrvuScenarios[level]}%</p>
                      </button>
                    ))}
                    <button
                      onClick={() => updateDocInputs({ wrvuScenario: 'custom' })}
                      className={`flex-1 p-2 sm:p-3 rounded-lg border-2 transition-all text-center ${
                        docQualityInputs.wrvuScenario === 'custom'
                          ? "border-[#EA2C00] bg-white"
                          : "border-transparent bg-[#F5F0EB] hover:border-[#D1D5DB]"
                      }`}
                    >
                      <p className="font-medium text-black">Custom</p>
                      {docQualityInputs.wrvuScenario === 'custom' && (
                        <p className="text-sm text-[#888888]">{docQualityInputs.wrvuCustomPercent ?? 5}%</p>
                      )}
                    </button>
                  </div>

                  {docQualityInputs.wrvuScenario === 'custom' && (
                    <div className="flex items-center gap-3 mb-4">
                      <label className="text-sm text-[#666666] flex-shrink-0">E/M lift</label>
                      <div className="relative flex-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={docQualityInputs.wrvuCustomPercent ?? 5}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9.]/g, '');
                            const n = parseFloat(raw);
                            if (raw === '' || raw === '.') {
                              updateDocInputs({ wrvuCustomPercent: 0 });
                            } else if (!isNaN(n) && n >= 0 && n <= 100) {
                              updateDocInputs({ wrvuCustomPercent: n });
                            }
                          }}
                          onBlur={(e) => {
                            const n = parseFloat(e.target.value);
                            if (isNaN(n) || n < 0.1) {
                              updateDocInputs({ wrvuCustomPercent: 5 });
                            } else {
                              updateDocInputs({ wrvuCustomPercent: Math.min(100, n) });
                            }
                          }}
                          className="w-full h-10 bg-white border border-[#E5E5E5] rounded-lg px-3 pr-8 text-sm font-semibold text-black focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/30"
                          autoFocus
                          data-testid="input-dq-wrvu-custom"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">%</span>
                      </div>
                    </div>
                  )}

                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px]">Calculation</p>
                      <span className="text-xs text-[#888888]">Click values to edit</span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666]">Eligible encounters</span>
                        <span className="font-semibold text-black">{formatNumber(eligibleEncounters)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#666666]">Current avg wRVU/visit</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            value={docQualityInputs.currentWrvu}
                            onChange={(e) => updateDocInputs({ currentWrvu: parseFloat(e.target.value) || 0 })}
                            className="w-16 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                          />
                          <span className="text-[#888888]">wRVU</span>
                        </div>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666]">Documentation improvement</span>
                        <span className="font-semibold text-black">{wrvuLiftPercent}%</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666]">= E/M lift per visit</span>
                        <span className="font-semibold text-black">{wrvuLiftPerVisit.toFixed(3)} wRVU</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666]">= Total additional wRVUs</span>
                        <span className="font-semibold text-black">{formatNumber(Math.round(totalAdditionalWrvus))}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#666666]">× Conversion factor</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[#888888]">$</span>
                          <input
                            type="number"
                            value={docQualityInputs.conversionFactor}
                            onChange={(e) => updateDocInputs({ conversionFactor: parseFloat(e.target.value) || 0 })}
                            className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#666666]">× Realization rate <Info className="w-3.5 h-3.5 inline-block text-[#999999] -mt-0.5 cursor-help" title="Realization rate accounts for the fact that not all gross opportunity converts to captured value — due to workflow variation, payer mix, coder judgment, or partial adoption. 75% means you capture 75 cents of every dollar the gross calculation shows." /></span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={docQualityInputs.wrvuRealization}
                            onChange={(e) => updateDocInputs({ wrvuRealization: parseFloat(e.target.value) || 0 })}
                            className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                          />
                          <span className="text-[#888888]">%</span>
                        </div>
                      </div>
                      <div className="h-px bg-[#E5E5E5] my-2" />
                      <div className="flex justify-between gap-2">
                        <span className="font-semibold text-black">Annual E/M Value</span>
                        <span className="font-bold text-[#EA2C00]">{formatCurrency(Math.round(wrvuRevenueNet))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* HCC Capture - Only show for Outpatient */}
        {showHCC && (
        <div className="space-y-0">
          <div
            className={`w-full p-4 text-left transition-all ${
              docQualityInputs.hccEnabled 
                ? (docQualityInputs.hccExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB] rounded-lg"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">HCC Capture</p>
                <p className="text-sm text-[#888888]">Recapture missed diagnoses for MA population</p>
              </div>
              <div className="flex items-center gap-3">
                {docQualityInputs.hccEnabled && (
                  <button
                    onClick={() => updateDocInputs({ hccExpanded: !docQualityInputs.hccExpanded })}
                    className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                    data-testid="button-hcc-expand"
                  >
                    <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${docQualityInputs.hccExpanded ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                )}
                <button
                  onClick={() => updateDocInputs({ hccEnabled: !docQualityInputs.hccEnabled, hccExpanded: !docQualityInputs.hccEnabled ? true : docQualityInputs.hccExpanded })}
                  className={`w-12 h-6 rounded-full relative transition-all ${
                    docQualityInputs.hccEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid="toggle-hcc"
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                    docQualityInputs.hccEnabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {docQualityInputs.hccEnabled && docQualityInputs.hccExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <HccExpandedContent
                  state={state}
                  docQualityInputs={docQualityInputs}
                  updateDocInputs={updateDocInputs}
                  formatNumber={formatNumber}
                  formatCurrency={formatCurrency}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}

        {/* Denial Prevention */}
        <div className="space-y-0">
          <div
            className={`w-full p-4 text-left transition-all ${
              docQualityInputs.denialsEnabled 
                ? (docQualityInputs.denialsExpanded ? "bg-white rounded-t-lg" : "bg-white rounded-lg")
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB] rounded-lg"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">{config.driver3Title}</p>
                <p className="text-sm text-[#888888]">{config.driver3Subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                {docQualityInputs.denialsEnabled && (
                  <button
                    onClick={() => updateDocInputs({ denialsExpanded: !docQualityInputs.denialsExpanded })}
                    className="p-1 hover:bg-[#F5F0EB] rounded transition-colors"
                    data-testid="button-denials-expand"
                  >
                    <ChevronDown className={`w-5 h-5 text-[#888888] transition-transform ${docQualityInputs.denialsExpanded ? 'rotate-0' : '-rotate-90'}`} />
                  </button>
                )}
                <button
                  onClick={() => updateDocInputs({ denialsEnabled: !docQualityInputs.denialsEnabled, denialsExpanded: !docQualityInputs.denialsEnabled ? true : docQualityInputs.denialsExpanded })}
                  className={`w-12 h-6 rounded-full relative transition-all ${
                    docQualityInputs.denialsEnabled ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid="toggle-denials"
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                    docQualityInputs.denialsEnabled ? 'right-0.5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {docQualityInputs.denialsEnabled && docQualityInputs.denialsExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-b-lg p-5">
                  <p className="text-sm text-[#666666] leading-relaxed mb-4">
                    {isED
                      ? "Payers review ED claims retrospectively — comparing the final diagnosis to the presenting complaint. When the note captures the outcome but not the presenting acuity, visits with benign final diagnoses can be denied as non-emergent. The physician correctly evaluated a high-risk presentation; the note just didn't capture why emergency evaluation was warranted. Documentation that captures the clinical picture at point of care can support medical necessity before the claim is reviewed."
                      : "Medical necessity denials occur when documentation doesn't show why the service was clinically warranted — the physician reasoned correctly, but the note didn't capture it. This is already tracked by most revenue cycle teams as a percentage of total encounters. Capturing clinical reasoning in real time may help reduce denials before they're filed."
                    }
                  </p>

                  <div className="h-px bg-[#E5E5E5] my-4" />

                  <p className="text-sm font-medium text-black mb-3">Prevention target:</p>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {(['conservative', 'typical', 'aggressive'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => updateDocInputs({ denialsScenario: level })}
                        className={`p-2 sm:p-3 rounded-lg border transition-all text-center ${
                          docQualityInputs.denialsScenario === level
                            ? "bg-[#EA2C00] border-[#EA2C00] text-white"
                            : "bg-white border-[#E5E5E5] text-black hover:border-[#D1D5DB]"
                        }`}
                        data-testid={`button-denials-${level}`}
                      >
                        <p className={`text-xs mb-1 ${docQualityInputs.denialsScenario === level ? 'text-white/80' : ''}`}>
                          {{ conservative: 'Conservative', typical: 'Typical', aggressive: 'Optimistic' }[level]}
                        </p>
                        <p className="font-semibold">{denialsScenarios[level]}%</p>
                      </button>
                    ))}
                  </div>

                  <div className="h-px bg-[#E5E5E5] my-4" />

                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px]">Calculation</p>
                      <span className="text-xs text-[#888888]">Click values to edit</span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666]">Eligible encounters</span>
                        <span className="text-black">{formatNumber(eligibleEncounters)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#666666]">× Medical necessity denial rate</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={docQualityInputs.medNecessityDenialRate}
                            onChange={(e) => updateDocInputs({ medNecessityDenialRate: parseFloat(e.target.value) || 0 })}
                            className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                            data-testid="input-med-necessity-denial-rate"
                          />
                          <span className="text-[#888888]">%</span>
                        </div>
                      </div>
                      <div className="h-px bg-[#D1D5DB] my-1" />
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666]">= Medical necessity denials</span>
                        <span className="font-semibold text-black">{formatNumber(Math.round(medNecessityDenials))} claims</span>
                      </div>

                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666]">× Your prevention target</span>
                        <span className="text-black">{preventionPercent}%</span>
                      </div>
                      <div className="h-px bg-[#D1D5DB] my-1" />
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666]">= Denials targeted for reduction</span>
                        <span className="font-semibold text-black">{formatNumber(Math.round(preventedDenials))} claims</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[#666666]">× Avg denied claim value</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[#888888]">$</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={docQualityInputs.avgClaimValue ? docQualityInputs.avgClaimValue.toLocaleString("en-US") : ""}
                            onChange={(e) => { const v = parseFloat(e.target.value.replace(/,/g, "")) || 0; updateDocInputs({ avgClaimValue: v }); }}
                            className="w-20 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                            data-testid="input-claim-value"
                          />
                        </div>
                      </div>
                      <div className="h-px bg-[#D1D5DB] my-1" />
                      <div className="flex justify-between gap-2">
                        <span className="text-[#666666]">= Gross value</span>
                        <span className="font-semibold text-black">{formatCurrency(Math.round(denialsRevenueGross))}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[#666666]">× Realization rate <Info className="w-3.5 h-3.5 inline-block text-[#999999] -mt-0.5 cursor-help" title="Realization rate accounts for the fact that not all gross opportunity converts to captured value — due to workflow variation, payer mix, coder judgment, or partial adoption. 75% means you capture 75 cents of every dollar the gross calculation shows." /></span>
                          <p className="text-xs text-[#888888]">(collection timing, adjustments)</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={docQualityInputs.denialsRealization}
                            onChange={(e) => updateDocInputs({ denialsRealization: parseFloat(e.target.value) || 0 })}
                            className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                            data-testid="input-denials-realization"
                          />
                          <span className="text-[#888888]">%</span>
                        </div>
                      </div>
                      <div className="h-px bg-[#888888] my-2" />
                      <div className="flex justify-between font-semibold">
                        <span className="text-black">Annual Denial Prevention Value</span>
                        <span className="text-[#EA2C00]">{formatCurrency(Math.round(denialsRevenueNet))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        </motion.div>
        )}

        {/* Continue Button - Mobile */}
        <motion.div 
          className="flex justify-center lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={onNext}
            className="h-11 px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-continue"
          >
            Continue to Investment
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
          </div>

          {/* Right Panel - Desktop Only */}
          <motion.div
            className="hidden lg:block w-full lg:w-[320px] flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-[#1A1A1A] rounded-xl p-6 lg:sticky lg:top-24">
              {/* Header */}
              <div className="mb-4">
                <p className="text-xs font-medium text-white uppercase tracking-[1.5px]">
                  Documentation Value
                </p>
                <p className="text-sm text-[#888888] mt-1">Your model so far</p>
              </div>

              {/* Time Savings Line */}
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-[#888888]">Time Savings</span>
                <span className="text-sm font-semibold text-white">{formatCurrency(timeValue)}</span>
              </div>

              <div className="h-px bg-[#333333] my-4" />

              {/* Documentation Drivers - Care Setting Specific */}
              <div className="space-y-3">
                {/* Nursing-specific drivers */}
                {isNursing ? (
                  <>
                    <div>
                      <p className="text-[12px] font-medium text-[#666666] uppercase tracking-wide mb-2">Care Quality Potential</p>
                      
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full border border-dashed ${docQualityInputs.nursingHapiEnabled ? 'border-[#EA2C00] bg-[#EA2C00]/20' : 'border-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">HAPI Risk: Documentation Impact</span>
                        </div>
                        <span className={`text-sm font-semibold ${docQualityInputs.nursingHapiEnabled ? 'text-[#EA2C00]/80' : 'text-[#666666]'}`}>
                          {docQualityInputs.nursingHapiEnabled ? formatCurrency(nursingHapiValue) : '—'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full border border-dashed ${docQualityInputs.nursingFallsEnabled ? 'border-[#EA2C00] bg-[#EA2C00]/20' : 'border-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">Fall Risk Visibility Gap</span>
                        </div>
                        <span className={`text-sm font-semibold ${docQualityInputs.nursingFallsEnabled ? 'text-[#EA2C00]/80' : 'text-[#666666]'}`}>
                          {docQualityInputs.nursingFallsEnabled ? formatCurrency(nursingFallsValue) : '—'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${docQualityInputs.nursingHcahpsEnabled ? 'bg-[#666666]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">HCAHPS</span>
                        </div>
                        <span className="text-xs font-medium text-[#666666]">
                          {docQualityInputs.nursingHcahpsEnabled ? 'Qualitative' : '—'}
                        </span>
                      </div>
                    </div>
                  </>
                ) : isInpatient ? (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${docQualityInputs.ipDrgEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                        <span className="text-sm text-[#888888]">DRG Accuracy</span>
                      </div>
                      <span className={`text-sm font-semibold ${docQualityInputs.ipDrgEnabled ? 'text-white' : 'text-[#666666]'}`}>
                        {docQualityInputs.ipDrgEnabled ? formatCurrency(Math.round(ipDrgNetValue)) : '—'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${docQualityInputs.ipObsDefenseEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                        <span className="text-sm text-[#888888]">Obs/IP Defense</span>
                      </div>
                      <span className={`text-sm font-semibold ${docQualityInputs.ipObsDefenseEnabled ? 'text-white' : 'text-[#666666]'}`}>
                        {docQualityInputs.ipObsDefenseEnabled ? formatCurrency(Math.round(ipObsDefenseNet)) : '—'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${docQualityInputs.ipCdiEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                        <span className="text-sm text-[#888888]">CDI Queries</span>
                      </div>
                      <span className={`text-sm font-semibold ${docQualityInputs.ipCdiEnabled ? 'text-white' : 'text-[#666666]'}`}>
                        {docQualityInputs.ipCdiEnabled ? formatCurrency(Math.round(ipCdiSavingsValue)) : '—'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${docQualityInputs.wrvuEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                        <span className="text-sm text-[#888888]">{isED ? 'E&M Accuracy' : 'wRVU'}</span>
                      </div>
                      <span className={`text-sm font-semibold ${docQualityInputs.wrvuEnabled ? 'text-white' : 'text-[#666666]'}`}>
                        {docQualityInputs.wrvuEnabled ? formatCurrency(Math.round(wrvuRevenueNet)) : '—'}
                      </span>
                    </div>

                    {/* Only show HCC for Outpatient */}
                    {showHCC && (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${docQualityInputs.hccEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                          <span className="text-sm text-[#888888]">HCC</span>
                        </div>
                        <span className={`text-sm font-semibold ${docQualityInputs.hccEnabled ? 'text-white' : 'text-[#666666]'}`}>
                          {docQualityInputs.hccEnabled ? formatCurrency(Math.round(hccRevenueNet)) : '—'}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${docQualityInputs.denialsEnabled ? 'bg-[#EA2C00]' : 'bg-[#444444]'}`} />
                        <span className="text-sm text-[#888888]">{isED ? 'Denial Prevention' : 'Denials'}</span>
                      </div>
                      <span className={`text-sm font-semibold ${docQualityInputs.denialsEnabled ? 'text-white' : 'text-[#666666]'}`}>
                        {docQualityInputs.denialsEnabled ? formatCurrency(Math.round(denialsRevenueNet)) : '—'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="h-px bg-[#333333] my-4" />

              {/* Projected Annual Value - Special for Nursing */}
              {isNursing ? (
                <>
                  <div className="text-center mb-4">
                    <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-2">
                      Time Savings Value
                    </p>
                    <p className="text-3xl md:text-4xl font-bold text-[#EA2C00]">
                      {formatCurrency(Math.round(timeValue))}
                    </p>
                    <p className="text-xs text-[#666666] mt-1">Hard value from efficiency gains</p>
                  </div>

                  {nursingCareQualityPotential > 0 && (
                    <>
                      <div className="h-px bg-[#333333] my-4" />
                      <div className="text-center mb-4 p-3 border border-dashed border-[#EA2C00]/30 rounded-lg bg-[#EA2C00]/5">
                        <p className="text-[12px] font-medium text-[#EA2C00]/80 uppercase tracking-[1.5px] mb-1">
                          + Potential Value
                        </p>
                        <p className="text-xl font-bold text-[#EA2C00]/80">
                          {formatCurrency(Math.round(nursingCareQualityPotential))}
                        </p>
                        <p className="text-[12px] text-[#666666] mt-1">Harder to attribute to documentation</p>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center mb-4">
                  <p className="text-xs font-medium text-white uppercase tracking-[1.5px] mb-2">
                    Projected Annual Value
                  </p>
                  <p className="text-3xl md:text-4xl font-bold text-[#EA2C00]">
                    {formatCurrency(Math.round(timeValue + totalDocValue))}
                  </p>
                </div>
              )}

              <p className="text-xs text-[#666666] italic mb-4">
                {isNursing 
                  ? 'Time savings are conservative. Potential value requires clinical practice changes.'
                  : 'All values include conservative realization rates for defensible estimates.'
                }
              </p>

              <div className="hidden lg:block">
              <div className="h-px bg-[#333333] my-4" />

              <Button
                onClick={onNext}
                className="w-full h-11 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
                data-testid="button-panel-continue"
              >
                Continue to Investment
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
