import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ExploreCalcComponentProps } from "@/lib/exploreDrivers";

const HCC_DEFAULTS = {
  avgHccs: 0.5,
  rafImpact: 0.15,
  annualPayment: 10000,
  hccRealization: 40,
};

const SCENARIO_LABELS: Record<string, string> = {
  conservative: 'Conservative',
  typical: 'Typical',
  aggressive: 'Optimistic',
};

type Props = ExploreCalcComponentProps;

export default function HccCaptureCalc({ state, updateDocQualityInputs }: Props) {
  const { docQualityInputs } = state;
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const hccScenarios: Record<string, number> = { conservative: 6, typical: 10, aggressive: 15 };
  const recapturePercent = hccScenarios[docQualityInputs.hccScenario];
  const maPatients = state.numberOfProviders * docQualityInputs.panelSize * (docQualityInputs.maPercent / 100);
  const gapPatients = maPatients * (docQualityInputs.gapRate / 100);
  const recaptured = gapPatients * (recapturePercent / 100);
  const hccsDocumented = recaptured * docQualityInputs.avgHccs;
  const valuePerHcc = docQualityInputs.rafImpact * docQualityInputs.annualPayment;
  const hccGrossValue = hccsDocumented * valuePerHcc;
  const hccRevenueNet = hccGrossValue * (docQualityInputs.hccRealization / 100);

  const hasCustomValues =
    docQualityInputs.avgHccs !== HCC_DEFAULTS.avgHccs ||
    docQualityInputs.rafImpact !== HCC_DEFAULTS.rafImpact ||
    docQualityInputs.annualPayment !== HCC_DEFAULTS.annualPayment ||
    docQualityInputs.hccRealization !== HCC_DEFAULTS.hccRealization;

  const formatCurrency = (n: number) => '$' + Math.round(n).toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div>
      <p className="text-sm text-[#666666] leading-relaxed mb-3">
        When providers use ambient documentation, chronic conditions addressed verbally are more likely to appear in the note. For Medicare Advantage patients, documented conditions drive risk-adjusted payment.
      </p>

      <div className="h-px bg-[#E5E5E5] my-4" />

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Your Population</p>
      <div className="space-y-3">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-black">Panel size per provider</p>
            <p className="text-xs text-[#888888] mt-0.5">Active patients per provider. Primary care typically 1,200{"–"}2,000.</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <input
              type="text"
              inputMode="numeric"
              value={docQualityInputs.panelSize ? docQualityInputs.panelSize.toLocaleString("en-US") : ""}
              onChange={(e) => { const v = parseFloat(e.target.value.replace(/,/g, "")) || 0; updateDocQualityInputs({ panelSize: v }); }}
              className="w-20 h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none transition-colors"
              data-testid="input-panel-size"
            />
            <span className="text-xs text-[#888888]">pts</span>
          </div>
        </div>

        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-black">Medicare Advantage %</p>
            <p className="text-xs text-[#888888] mt-0.5">Share of your panel enrolled in MA plans. Many primary care panels run 30{"–"}45%.</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <input
              type="number"
              value={docQualityInputs.maPercent}
              onChange={(e) => updateDocQualityInputs({ maPercent: parseFloat(e.target.value) || 0 })}
              className="w-14 h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none transition-colors"
              data-testid="input-ma-percent"
            />
            <span className="text-xs text-[#888888]">%</span>
          </div>
        </div>

        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-black">Documentation gap rate</p>
            <p className="text-xs text-[#888888] mt-0.5">CMS MA data: 10{"–"}18% of members have at least one gap annually.</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <input
              type="number"
              value={docQualityInputs.gapRate}
              onChange={(e) => updateDocQualityInputs({ gapRate: parseFloat(e.target.value) || 0 })}
              className="w-14 h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20 outline-none transition-colors"
              data-testid="input-gap-rate"
            />
            <span className="text-xs text-[#888888]">%</span>
          </div>
        </div>
      </div>

      <div className="bg-[#F5F0EB] rounded-lg px-4 py-3 mt-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-[#666666]">
            {formatNumber(state.numberOfProviders)} providers × {formatNumber(docQualityInputs.panelSize)} panel × {docQualityInputs.maPercent}% MA × {docQualityInputs.gapRate}% gap rate
          </span>
          <span className="font-semibold text-black ml-2 flex-shrink-0">= {formatNumber(Math.round(gapPatients))} patients with gaps</span>
        </div>
      </div>

      <div className="h-px bg-[#E5E5E5] my-5" />

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Recapture Scenario</p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {(['conservative', 'typical', 'aggressive'] as const).map((level) => (
          <button
            key={level}
            onClick={() => updateDocQualityInputs({ hccScenario: level })}
            className={`p-2 sm:p-3 rounded-lg border transition-all text-center ${
              docQualityInputs.hccScenario === level
                ? "bg-[#EA2C00] border-[#EA2C00] text-white"
                : "bg-white border-[#E5E5E5] text-black hover:border-[#D1D5DB]"
            }`}
            data-testid={`button-hcc-${level}`}
          >
            <p className={`text-xs mb-1 ${docQualityInputs.hccScenario === level ? 'text-white/80' : 'text-[#888888]'}`}>
              {SCENARIO_LABELS[level]}
            </p>
            <p className="font-semibold">{hccScenarios[level]}%</p>
          </button>
        ))}
      </div>

      <div className="h-px bg-[#E5E5E5] my-5" />

      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">Estimated Value</p>
      <div className="bg-[#F5F0EB] rounded-lg p-4">
        <div className="text-sm text-[#666666] leading-relaxed mb-3">
          {formatNumber(Math.round(gapPatients))} patients with gaps × {docQualityInputs.avgHccs} avg missed HCCs × {recapturePercent}% recapture = <span className="font-semibold text-black">{formatNumber(Math.round(hccsDocumented))} HCCs</span>
        </div>
        <div className="text-sm text-[#666666] leading-relaxed mb-4">
          {formatNumber(Math.round(hccsDocumented))} HCCs × {formatCurrency(Math.round(valuePerHcc))}/HCC = {formatCurrency(Math.round(hccGrossValue))} gross × {docQualityInputs.hccRealization}% realization
        </div>
        <div className="h-px bg-[#D1D5DB] mb-3" />
        <div className="flex justify-between items-center">
          <div>
            <span className="font-semibold text-black">Estimated Annual HCC Value</span>
            {hasCustomValues && (
              <span className="ml-2 text-[10px] font-medium text-[#EA2C00] bg-[#EA2C00]/10 px-1.5 py-0.5 rounded" data-testid="badge-custom-values">Custom values</span>
            )}
          </div>
          <span className="text-2xl font-bold text-[#EA2C00]" data-testid="text-hcc-result">{formatCurrency(Math.round(hccRevenueNet))}</span>
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
        <span className="text-xs text-[#888888]">{"–"} adjust if you have your own data</span>
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
                  <p className="text-sm text-black">RAF impact per HCC</p>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={docQualityInputs.rafImpact}
                  onChange={(e) => updateDocQualityInputs({ rafImpact: parseFloat(e.target.value) || 0 })}
                  className="w-16 h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm flex-shrink-0"
                  data-testid="input-raf-impact"
                />
              </div>

              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-black">Annual payment per RAF</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-xs text-[#888888]">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={docQualityInputs.annualPayment ? docQualityInputs.annualPayment.toLocaleString("en-US") : ""}
                    onChange={(e) => { const v = parseFloat(e.target.value.replace(/,/g, "")) || 0; updateDocQualityInputs({ annualPayment: v }); }}
                    className="w-20 h-8 text-right bg-white border border-[#E5E5E5] rounded px-2 text-sm"
                    data-testid="input-annual-payment"
                  />
                </div>
              </div>

              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-black flex items-center gap-1">
                    Realization rate
                    <Info className="w-3.5 h-3.5 inline-block text-[#999999] cursor-help" />
                  </p>
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

              {hasCustomValues && (
                <button
                  onClick={() => updateDocQualityInputs(HCC_DEFAULTS)}
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
