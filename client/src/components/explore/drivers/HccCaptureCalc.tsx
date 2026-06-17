import { useState } from "react";
import { ChevronDown, Info, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";
import type { HccPlan } from "@/pages/explore/ExploreFlow";

const UPLIFT_OPTIONS: { key: 'conservative' | 'typical' | 'optimistic'; label: string; pp: number }[] = [
  { key: 'conservative', label: 'Conservative', pp: 3 },
  { key: 'typical',      label: 'Typical',      pp: 5 },
  { key: 'optimistic',   label: 'Optimistic',   pp: 10 },
];

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

type Props = ExploreCalcComponentProps;

export default function HccCaptureCalc({ state, updateDocQualityInputs }: Props) {
  const { docQualityInputs } = state;
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [netNewOpen, setNetNewOpen] = useState<Record<string, boolean>>({});

  const plans = docQualityInputs.hccPlans;
  const upliftMap: Record<string, number> = { conservative: 3, typical: 5, optimistic: 10 };

  const planCalcs = plans.map(plan => {
    const upliftPp = plan.uplift === 'custom' ? (plan.upliftCustomPp ?? 5) : (upliftMap[plan.uplift] ?? 5);
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
  const hccRevenueNet = totalGross * (docQualityInputs.hccRealization / 100);

  const fmt$ = (n: number) => '$' + Math.round(n).toLocaleString();
  const fmtN = (n: number) => n.toLocaleString();

  const updatePlan = (id: string, updates: Partial<HccPlan>) => {
    updateDocQualityInputs({
      hccPlans: plans.map(p => p.id === id ? { ...p, ...updates } : p),
    });
  };

  const removePlan = (id: string) => {
    updateDocQualityInputs({ hccPlans: plans.filter(p => p.id !== id) });
  };

  const addPlan = () => {
    const newPlan: HccPlan = { ...PLAN_TYPE_DEFAULTS.custom, id: `plan-${Date.now()}` };
    updateDocQualityInputs({ hccPlans: [...plans, newPlan] });
  };

  const applyPlanType = (id: string, planType: HccPlan['planType']) => {
    const defaults = PLAN_TYPE_DEFAULTS[planType];
    updateDocQualityInputs({
      hccPlans: plans.map(p => p.id === id ? { ...p, ...defaults, id: p.id } : p),
    });
  };

  const toggleNetNew = (id: string) => {
    setNetNewOpen(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      <p className="text-sm text-[#666666] leading-relaxed mb-3">
        When providers use ambient documentation, chronic conditions addressed verbally are more likely to appear in the note. Better documentation drives higher HCC recapture rates, improving risk-adjusted payment across plan types.
      </p>

      <div className="h-px bg-[#E5E5E5] my-4" />

      <div className="space-y-3">
        {plans.map((plan, idx) => {
          const calc = planCalcs[idx];
          const isNetNewOpen = netNewOpen[plan.id] ?? false;
          return (
            <div key={plan.id} className="border border-[#E5E5E5] rounded-xl p-4 bg-[#FAFAFA]">
              {/* Plan name + type buttons */}
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
                    <span title="Combined value of RAF score × annual payment per RAF point. Typically $800–$1,500 for MA." className="cursor-help">
                      <Info className="w-3 h-3 text-[#BBBBBB]" />
                    </span>
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
                  {UPLIFT_OPTIONS.map(({ key, label, pp }) => (
                    <button
                      key={key}
                      onClick={() => updatePlan(plan.id, { uplift: key })}
                      className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                        plan.uplift === key
                          ? 'bg-[#EA2C00] text-white'
                          : 'bg-[#F5F0EB] text-[#666666] hover:bg-[#EBE6E1]'
                      }`}
                    >
                      <p className={`text-[9px] ${plan.uplift === key ? 'text-white/80' : 'text-[#888888]'}`}>{label}</p>
                      <p className="text-xs font-semibold">+{pp}pp</p>
                    </button>
                  ))}
                  <button
                    onClick={() => updatePlan(plan.id, { uplift: 'custom', ...(!plan.upliftCustomPp ? { upliftCustomPp: 5 } : {}) })}
                    className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                      plan.uplift === 'custom'
                        ? 'bg-[#EA2C00] text-white'
                        : 'bg-[#F5F0EB] text-[#666666] hover:bg-[#EBE6E1]'
                    }`}
                  >
                    <p className={`text-[9px] ${plan.uplift === 'custom' ? 'text-white/80' : 'text-[#888888]'}`}>Custom</p>
                    <p className="text-xs font-semibold">
                      {plan.uplift === 'custom' ? `+${plan.upliftCustomPp ?? 5}pp` : '—'}
                    </p>
                  </button>
                </div>
                {plan.uplift === 'custom' && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-[#888888]">Custom uplift</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={plan.upliftCustomPp ?? 5}
                        onChange={(e) => updatePlan(plan.id, { upliftCustomPp: parseFloat(e.target.value) || 0 })}
                        className="w-14 h-7 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none"
                        data-testid="input-hcc-custom-uplift"
                      />
                      <span className="text-xs text-[#888888]">pp</span>
                    </div>
                  </div>
                )}
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
                  {calc.effectiveUplift < calc.upliftPp && (
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
                            {fmtN(state.numberOfProviders)} × {fmtN(plan.panelSize)} × {plan.netNewDiscoveryRate}% × {plan.netNewAvgConditions} cond
                          </span>
                          <span className="font-semibold text-black ml-2 flex-shrink-0">= {fmt$(Math.round(calc.netNewGross))}</span>
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

      <button
        onClick={addPlan}
        className="mt-3 flex items-center gap-1.5 text-sm text-[#EA2C00] hover:text-[#C52200] transition-colors font-medium"
      >
        <Plus className="w-4 h-4" />
        Add another plan
      </button>

      <div className="h-px bg-[#E5E5E5] my-5" />

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Estimated Value</p>
      <div className="bg-[#F5F0EB] rounded-lg p-4">
        <div className="space-y-3 mb-3">
          {plans.map((plan, idx) => {
            const calc = planCalcs[idx];
            return (
              <div key={plan.id} className="space-y-1">
                <p className="text-xs font-semibold text-[#888888] uppercase tracking-wide">{plan.name}</p>
                <p className="text-sm text-[#666666]">
                  {fmtN(Math.round(calc.gapPatients))} gap pts × {calc.effectiveUplift}pp × {docQualityInputs.avgHccs} HCCs × {fmt$(plan.valuePerHcc)} = <span className="font-semibold text-black">{fmt$(Math.round(calc.recaptureGross))}</span>
                </p>
                {plan.netNewEnabled && calc.netNewGross > 0 && (
                  <p className="text-sm text-[#666666]">
                    Net new: {fmtN(Math.round(state.numberOfProviders * plan.panelSize * plan.netNewDiscoveryRate / 100))} pts × {plan.netNewAvgConditions} cond × {fmt$(plan.valuePerHcc)} = <span className="font-semibold text-black">{fmt$(Math.round(calc.netNewGross))}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="h-px bg-[#D1D5DB] mb-3" />
        <p className="text-sm text-[#666666] mb-3">
          Total {fmt$(Math.round(totalGross))} gross × {docQualityInputs.hccRealization}% realization
        </p>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-black">Estimated Annual HCC Value{plans.length > 1 ? ` (${plans.length} plans)` : ''}</span>
          <span className="text-2xl font-bold text-[#EA2C00]" data-testid="text-hcc-result">{fmt$(Math.round(hccRevenueNet))}</span>
        </div>
      </div>

      <div className="h-px bg-[#E5E5E5] my-5" />

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
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={docQualityInputs.avgHccs}
                  onChange={(e) => updateDocQualityInputs({ avgHccs: parseFloat(e.target.value) || 0 })}
                  className="w-16 h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm flex-shrink-0"
                  data-testid="input-avg-hccs"
                />
              </div>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-black flex items-center gap-1">
                    Realization rate
                    <Info className="w-3.5 h-3.5 inline-block text-[#999999] cursor-help" />
                  </p>
                  <p className="text-xs text-[#888888] mt-0.5">Conservative share of modeled value to claim.</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    value={docQualityInputs.hccRealization}
                    onChange={(e) => updateDocQualityInputs({ hccRealization: parseFloat(e.target.value) || 0 })}
                    className="w-14 h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                    data-testid="input-hcc-realization"
                  />
                  <span className="text-xs text-[#888888]">%</span>
                </div>
              </div>
              {(docQualityInputs.avgHccs !== 0.5 || docQualityInputs.hccRealization !== 50) && (
                <button
                  onClick={() => updateDocQualityInputs({ avgHccs: 0.5, hccRealization: 50 })}
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
