import { useState } from "react";
import { ChevronDown, Info, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";
import type { HccPlan } from "@/pages/explore/ExploreFlow";

const HCC_SCENARIOS: Record<string, number> = { conservative: 6, typical: 10, aggressive: 15 };

const PLAN_TYPE_DEFAULTS: Record<HccPlan['planType'], Omit<HccPlan, 'id'>> = {
  medicare_advantage: { planType: 'medicare_advantage', name: 'Medicare Advantage', planPct: 30, gapRate: 70, rafImpact: 0.15, annualPaymentPerRaf: 10000, recaptureScenario: 'typical' },
  aca_marketplace:    { planType: 'aca_marketplace',    name: 'ACA Marketplace',    planPct: 15, gapRate: 65, rafImpact: 0.10, annualPaymentPerRaf: 4000,  recaptureScenario: 'typical' },
  medicaid_mco:       { planType: 'medicaid_mco',       name: 'Medicaid MCO',       planPct: 20, gapRate: 60, rafImpact: 0.05, annualPaymentPerRaf: 5000,  recaptureScenario: 'typical' },
  custom:             { planType: 'custom',              name: 'Custom Plan',        planPct: 10, gapRate: 65, rafImpact: 0.12, annualPaymentPerRaf: 5000,  recaptureScenario: 'typical' },
};

const RAF_HINTS: Record<HccPlan['planType'], string> = {
  medicare_advantage: '0.10–0.20',
  aca_marketplace:    '0.05–0.15',
  medicaid_mco:       '0.04–0.10',
  custom:             '',
};

const PAYMENT_HINTS: Record<HccPlan['planType'], string> = {
  medicare_advantage: '$8,000–14,000',
  aca_marketplace:    '$3,000–6,000',
  medicaid_mco:       '$2,000–5,000',
  custom:             '',
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

  const plans = docQualityInputs.hccPlans;

  const planCalcs = plans.map(plan => {
    const planPatients = state.numberOfProviders * (docQualityInputs.panelSize * plan.planPct / 100);
    const gapPatients = planPatients * (plan.gapRate / 100);
    const recapturePct = (HCC_SCENARIOS[plan.recaptureScenario] ?? 10) / 100;
    const recaptured = gapPatients * recapturePct;
    const hccs = recaptured * docQualityInputs.avgHccs;
    const rafPoints = hccs * plan.rafImpact;
    const gross = rafPoints * plan.annualPaymentPerRaf;
    return { planPatients, gapPatients, hccs, rafPoints, gross };
  });

  const totalGross = planCalcs.reduce((s, c) => s + c.gross, 0);
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

  return (
    <div>
      <p className="text-sm text-[#666666] leading-relaxed mb-3">
        When providers use ambient documentation, chronic conditions addressed verbally are more likely to appear in the note. Documented conditions drive risk-adjusted payment across multiple plan types.
      </p>

      <div className="h-px bg-[#E5E5E5] my-4" />

      {/* Global panel size */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-black">Panel size / provider</p>
          <p className="text-xs text-[#888888] mt-0.5">Active patients per provider. Primary care typically 1,200–2,000.</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            type="text"
            inputMode="numeric"
            value={docQualityInputs.panelSize ? docQualityInputs.panelSize.toLocaleString("en-US") : ""}
            onChange={(e) => { const v = parseFloat(e.target.value.replace(/,/g, "")) || 0; updateDocQualityInputs({ panelSize: v }); }}
            className="w-20 h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none transition-colors"
          />
          <span className="text-xs text-[#888888]">pts</span>
        </div>
      </div>

      <div className="h-px bg-[#E5E5E5] mb-4" />

      {/* Plan cards */}
      <div className="space-y-3">
        {plans.map((plan, idx) => {
          const calc = planCalcs[idx];
          const recapturePct = HCC_SCENARIOS[plan.recaptureScenario] ?? 10;
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

              {/* Row 1: % of panel + gap rate */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs text-[#888888] mb-1">% of panel on this plan</p>
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      value={plan.planPct}
                      onChange={(e) => updatePlan(plan.id, { planPct: parseFloat(e.target.value) || 0 })}
                      className="w-16 h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none transition-colors"
                    />
                    <span className="text-xs text-[#888888]">%</span>
                  </div>
                  <p className="text-[10px] text-[#999999] mt-0.5">= {Math.round(docQualityInputs.panelSize * plan.planPct / 100).toLocaleString()} pts/prov</p>
                </div>
                <div>
                  <p className="text-xs text-[#888888] mb-1">Gap rate</p>
                  <div className="flex items-center gap-0.5">
                    <input
                      type="number"
                      value={plan.gapRate}
                      onChange={(e) => updatePlan(plan.id, { gapRate: parseFloat(e.target.value) || 0 })}
                      className="w-14 h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none transition-colors"
                    />
                    <span className="text-xs text-[#888888]">%</span>
                  </div>
                </div>
              </div>

              {/* Row 2: RAF impact + annual payment */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-xs text-[#888888] mb-1">RAF score / HCC</p>
                  <input
                    type="number"
                    step="0.01"
                    value={plan.rafImpact}
                    onChange={(e) => updatePlan(plan.id, { rafImpact: parseFloat(e.target.value) || 0 })}
                    className="w-full h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none transition-colors"
                  />
                  {RAF_HINTS[plan.planType] && (
                    <p className="text-[10px] text-[#999999] mt-0.5">Typically {RAF_HINTS[plan.planType]}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-[#888888] mb-1">Annual $ / RAF point</p>
                  <div className="flex items-center gap-0.5">
                    <span className="text-xs text-[#888888]">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={plan.annualPaymentPerRaf ? plan.annualPaymentPerRaf.toLocaleString("en-US") : ""}
                      onChange={(e) => { const v = parseFloat(e.target.value.replace(/,/g, "")) || 0; updatePlan(plan.id, { annualPaymentPerRaf: v }); }}
                      className="w-full h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none transition-colors"
                    />
                  </div>
                  {PAYMENT_HINTS[plan.planType] && (
                    <p className="text-[10px] text-[#999999] mt-0.5">Typically {PAYMENT_HINTS[plan.planType]}</p>
                  )}
                </div>
              </div>

              {/* Per-plan recapture scenario */}
              <div className="mb-3">
                <p className="text-[10px] font-medium text-[#888888] uppercase tracking-[1px] mb-1.5">Recapture Scenario</p>
                <div className="flex items-center gap-1.5">
                  {(['conservative', 'typical', 'aggressive'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => updatePlan(plan.id, { recaptureScenario: level })}
                      className={`flex-1 py-1.5 rounded-lg border text-center transition-all ${
                        plan.recaptureScenario === level
                          ? 'bg-[#EA2C00] border-[#EA2C00] text-white'
                          : 'bg-white border-[#E5E5E5] text-[#444] hover:border-[#D1D5DB]'
                      }`}
                    >
                      <p className={`text-[9px] ${plan.recaptureScenario === level ? 'text-white/80' : 'text-[#888888]'}`}>
                        {level === 'conservative' ? 'Conservative' : level === 'typical' ? 'Typical' : 'Optimistic'}
                      </p>
                      <p className="text-xs font-semibold">{HCC_SCENARIOS[level]}%</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Formula row */}
              <div className="bg-[#F5F0EB] rounded-lg px-3 py-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#666666]">
                    {fmtN(state.numberOfProviders)} × {plan.planPct}% of {fmtN(docQualityInputs.panelSize)} × {plan.gapRate}% gap × {recapturePct}% recapture
                  </span>
                  <span className="font-semibold text-black ml-2 flex-shrink-0">= {fmtN(Math.round(calc.hccs))} HCCs</span>
                </div>
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
            const recapturePct = HCC_SCENARIOS[plan.recaptureScenario] ?? 10;
            return (
              <div key={plan.id} className="space-y-1">
                <p className="text-xs font-semibold text-[#888888] uppercase tracking-wide">{plan.name}</p>
                <p className="text-sm text-[#666666]">
                  {fmtN(Math.round(calc.gapPatients))} pts × {docQualityInputs.avgHccs} HCCs × {recapturePct}% = <span className="font-medium text-black">{fmtN(Math.round(calc.hccs))} HCCs</span>
                </p>
                <p className="text-sm text-[#666666]">
                  {fmtN(Math.round(calc.hccs))} HCCs × {plan.rafImpact} RAF = <span className="font-medium text-black">{calc.rafPoints.toFixed(1)} RAF pts</span> × {fmt$(plan.annualPaymentPerRaf)}/pt = <span className="font-semibold text-black">{fmt$(Math.round(calc.gross))}</span>
                </p>
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
              {(docQualityInputs.avgHccs !== 0.5 || docQualityInputs.hccRealization !== 40) && (
                <button
                  onClick={() => updateDocQualityInputs({ avgHccs: 0.5, hccRealization: 40 })}
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
