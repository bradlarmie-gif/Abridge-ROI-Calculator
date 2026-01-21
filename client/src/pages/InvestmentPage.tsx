import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { GlobalHeader } from "@/components/GlobalHeader";
import { type ModelResults, type ValueResults } from "@/pages/ModelBuilder";
import { type CareSettingType } from "@/lib/SETTING_CONFIG";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Lightbulb,
} from "lucide-react";

interface InvestmentPageProps {
  selectedSettings: CareSettingType[];
  valueResults: ValueResults;
  onBack: () => void;
  onComplete: (results: ModelResults) => void;
  onBackToJourney: () => void;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
};

// Setting-specific configuration
const settingConfig = {
  outpatient: {
    unitName: "provider",
    unitNamePlural: "providers",
    defaultPrice: 150,
    priceRange: "$100-$200",
    pricingLabel: "Cost per provider"
  },
  ed: {
    unitName: "provider",
    unitNamePlural: "providers", 
    defaultPrice: 175,
    priceRange: "$125-$225",
    pricingLabel: "Cost per provider"
  },
  inpatient: {
    unitName: "provider",
    unitNamePlural: "providers",
    defaultPrice: 175,
    priceRange: "$125-$225",
    pricingLabel: "Cost per provider"
  },
  nursing: {
    unitName: "staffed bed",
    unitNamePlural: "staffed beds",
    defaultPrice: 75,
    priceRange: "$50-$125",
    pricingLabel: "Cost per staffed bed"
  }
};

export default function InvestmentPage({
  selectedSettings,
  valueResults,
  onBack,
  onComplete,
  onBackToJourney,
}: InvestmentPageProps) {
  const isNursingSetting = selectedSettings.includes("nursing");
  const activeSetting = selectedSettings[0] || "outpatient";
  const config = settingConfig[activeSetting as keyof typeof settingConfig] || settingConfig.outpatient;
  
  const [pricingModel, setPricingModel] = useState<"per_unit_monthly" | "enterprise_annual">("per_unit_monthly");
  const [costPerUnit, setCostPerUnit] = useState(config.defaultPrice);
  const [enterpriseAnnual, setEnterpriseAnnual] = useState(100000);
  const [contractTerm, setContractTerm] = useState<1 | 2 | 3>(1);
  const [includeImplementation, setIncludeImplementation] = useState(false);
  const implementationFee = 25000;

  const units = isNursingSetting 
    ? (valueResults.nursingStaffedBeds || 200)
    : valueResults.providers;
  const totalAnnualValue = valueResults.totalBenefit;
  
  // Get value breakdown from driver results
  const valueBreakdown = useMemo(() => {
    const breakdown: { name: string; value: number }[] = [];
    const driverResults = valueResults.driverResults || {};
    
    Object.entries(driverResults).forEach(([_key, result]) => {
      if (result && result.value > 0) {
        breakdown.push({
          name: result.name,
          value: result.value
        });
      }
    });
    
    return breakdown.sort((a, b) => b.value - a.value);
  }, [valueResults.driverResults]);

  // Calculations
  const annualInvestment = useMemo(() => {
    if (pricingModel === "per_unit_monthly") {
      return units * costPerUnit * 12;
    }
    return enterpriseAnnual;
  }, [pricingModel, units, costPerUnit, enterpriseAnnual]);

  const totalInvestment = (annualInvestment * contractTerm) + (includeImplementation ? implementationFee : 0);
  const netGainAnnual = totalAnnualValue - annualInvestment;
  const roiMultiple = annualInvestment > 0 ? totalAnnualValue / annualInvestment : 0;
  const monthsToPayback = totalAnnualValue > 0 ? Math.round((annualInvestment / totalAnnualValue) * 12) : 0;

  const handleComplete = () => {
    onComplete({
      ...valueResults,
      investment: totalInvestment,
      netGain: netGainAnnual,
      roiMultiple,
      paybackMonths: monthsToPayback,
      costPerMonth: costPerUnit,
      enterpriseAnnual,
      pricingModel: pricingModel === "per_unit_monthly" ? "per_clinician" : "enterprise",
      nursingCostPerBedPerMonth: isNursingSetting ? costPerUnit : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <GlobalHeader pageName="Your Investment" currentStep={5} totalSteps={6} onLogoClick={onBackToJourney} />

      <div className="max-w-6xl mx-auto px-8 pt-[96px] pb-12">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-6 -ml-2 text-slate-600 hover:text-slate-900"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Value Drivers
        </Button>
        {/* Page Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#111827] mb-2">Your Investment</h1>
          <p className="text-[#6B7280]">Align cost with value realization</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column - Configure Your Investment */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-8">
            <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-6">
              Configure Your Investment
            </h2>
            
            {/* Pricing Model Toggle */}
            <div className="mb-6">
              <label className="text-sm font-medium text-[#111827] block mb-3">Pricing Model</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPricingModel("per_unit_monthly")}
                  className={`p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                    pricingModel === "per_unit_monthly"
                      ? "border-[#EA2C00] bg-[#EA2C00] text-white shadow-sm"
                      : "border-neutral-200 bg-white text-[#6B7280] hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                  data-testid="pricing-per-unit"
                >
                  Per {config.unitName}<br />/month
                </button>
                <button
                  onClick={() => setPricingModel("enterprise_annual")}
                  className={`p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                    pricingModel === "enterprise_annual"
                      ? "border-[#EA2C00] bg-[#EA2C00] text-white shadow-sm"
                      : "border-neutral-200 bg-white text-[#6B7280] hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                  data-testid="pricing-enterprise"
                >
                  Enterprise<br />annual
                </button>
              </div>
            </div>

            <div className="border-t border-neutral-100 my-6" />

            {/* Cost Input */}
            <div className="mb-6">
              <label className="text-sm font-medium text-[#111827] block mb-3">
                {pricingModel === "per_unit_monthly" ? config.pricingLabel : "Annual enterprise cost"}
              </label>
              {pricingModel === "per_unit_monthly" ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-lg text-[#6B7280]">$</span>
                    <Input
                      type="number"
                      value={costPerUnit}
                      onChange={(e) => setCostPerUnit(Number(e.target.value) || 0)}
                      className="w-28 font-mono text-lg h-12"
                      data-testid="input-cost-per-unit"
                    />
                    <span className="text-sm text-[#6B7280]">/month</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-sm text-[#6B7280]">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>Typical: {config.priceRange}/{config.unitName}/month</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg text-[#6B7280]">$</span>
                  <FormattedNumberInput
                    value={enterpriseAnnual}
                    onChange={setEnterpriseAnnual}
                    className="w-40 font-mono text-lg h-12"
                    data-testid="input-enterprise-annual"
                  />
                  <span className="text-sm text-[#6B7280]">/year</span>
                </div>
              )}
            </div>

            <div className="border-t border-neutral-100 my-6" />

            {/* Contract Term */}
            <div className="mb-6">
              <label className="text-sm font-medium text-[#111827] block mb-3">Contract Term</label>
              <div className="grid grid-cols-3 gap-3">
                {([1, 2, 3] as const).map(term => (
                  <button
                    key={term}
                    onClick={() => setContractTerm(term)}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      contractTerm === term
                        ? "border-[#EA2C00] bg-[#EA2C00] text-white shadow-sm"
                        : "border-neutral-200 bg-white text-[#6B7280] hover:border-neutral-300 hover:bg-neutral-50"
                    }`}
                    data-testid={`contract-term-${term}`}
                  >
                    {term} yr{term > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-neutral-100 my-6" />

            {/* Implementation Fee */}
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeImplementation}
                  onChange={(e) => setIncludeImplementation(e.target.checked)}
                  className="w-5 h-5 rounded border-neutral-300 text-[#EA2C00] focus:ring-[#EA2C00]"
                  data-testid="checkbox-implementation"
                />
                <span className="text-sm font-medium text-[#111827]">Add implementation fee</span>
              </label>
              {includeImplementation && (
                <p className="text-sm text-[#6B7280] mt-2 ml-8">
                  One-time: ${implementationFee.toLocaleString()}
                </p>
              )}
            </div>

            <div className="border-t border-neutral-100 my-6" />

            {/* Configuration Summary */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-[#6B7280]" />
                <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Your Configuration</h3>
              </div>
              
              <div className="space-y-2 font-mono text-sm text-[#111827]">
                {pricingModel === "per_unit_monthly" ? (
                  <>
                    <p>{units} {config.unitNamePlural}</p>
                    <p>× ${costPerUnit}/{config.unitName}/month</p>
                    <p>× 12 months</p>
                    <div className="border-t border-slate-300 my-3" />
                    <p className="font-semibold text-base">= {formatCurrency(annualInvestment)}/year</p>
                  </>
                ) : (
                  <p className="font-semibold text-base">{formatCurrency(enterpriseAnnual)}/year</p>
                )}
                
                {contractTerm > 1 && (
                  <>
                    <div className="border-t border-slate-300 my-3" />
                    <p className="text-[#6B7280]">{contractTerm}-year term</p>
                    <p className="font-semibold">Total: {formatCurrency(annualInvestment * contractTerm)}</p>
                  </>
                )}
                
                {includeImplementation && (
                  <p className="text-[#6B7280] mt-2">+ {formatCurrency(implementationFee)} implementation</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Your ROI */}
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">
              Your ROI
            </h2>
            
            {/* Total Annual Value */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <label className="text-sm text-[#6B7280] block mb-2">Total Annual Value</label>
              <div className="font-mono font-bold text-3xl text-emerald-600" data-testid="total-annual-value">
                {formatCurrency(totalAnnualValue)}
              </div>
              <p className="text-sm text-[#6B7280] mt-1">From {valueBreakdown.length} value driver{valueBreakdown.length !== 1 ? "s" : ""}</p>
            </div>

            {/* Annual Investment */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <label className="text-sm text-[#6B7280] block mb-2">Annual Investment</label>
              <div className="font-mono font-bold text-3xl text-[#111827]" data-testid="annual-investment">
                {formatCurrency(annualInvestment)}
              </div>
              <p className="text-sm text-[#6B7280] mt-1 font-mono">
                {pricingModel === "per_unit_monthly" 
                  ? `${units} ${config.unitNamePlural} × $${costPerUnit} × 12 months`
                  : "Enterprise annual pricing"
                }
              </p>
            </div>

            {/* Divider */}
            <div className="border-t-2 border-dashed border-neutral-200" />

            {/* Net Gain */}
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6">
              <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider block mb-2">Net Gain</label>
              <div className="font-mono font-bold text-4xl text-emerald-600" data-testid="net-gain">
                {formatCurrency(netGainAnnual)}/yr
              </div>
            </div>

            {/* ROI Multiple */}
            <div className="bg-[#111827] rounded-xl p-6 text-center">
              <div className="font-mono font-bold text-5xl text-white mb-2" data-testid="roi-multiple">
                {roiMultiple.toFixed(1)}x
              </div>
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                Return on Investment
              </label>
            </div>

            {/* Value Breakdown */}
            {valueBreakdown.length > 0 && (
              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <h3 className="text-sm font-medium text-[#111827] mb-4">Value Breakdown</h3>
                <div className="space-y-3">
                  {valueBreakdown.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-[#6B7280]">{item.name}</span>
                      <span className="font-mono font-medium text-emerald-600">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                  <div className="border-t border-neutral-200 pt-3 mt-3">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-[#111827]">Total</span>
                      <span className="font-mono text-emerald-600">{formatCurrency(totalAnnualValue)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-10 max-w-md mx-auto space-y-4">
          <Button
            onClick={handleComplete}
            className="w-full h-14 bg-[#EA2C00] hover:bg-[#d12700] border-[#EA2C00] text-white text-base font-semibold rounded-xl"
            data-testid="button-view-summary"
          >
            View Full Summary
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          
          <button
            onClick={onBack}
            className="w-full text-center text-sm text-[#6B7280] hover:text-[#111827] transition-colors py-2"
            data-testid="button-edit-value"
          >
            ← Edit value drivers
          </button>
        </div>
      </div>
    </div>
  );
}
