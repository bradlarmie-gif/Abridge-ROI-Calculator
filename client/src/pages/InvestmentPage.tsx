import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import abridgeLogo from "@assets/abridge-logo-wordmark-black-onwhite_1767885563802.jpg";
import { type ModelResults, type ValueResults } from "@/pages/ModelBuilder";
import { type CareSettingType } from "@/lib/SETTING_CONFIG";
import {
  ArrowLeft,
  ArrowRight,
  DollarSign,
} from "lucide-react";

interface InvestmentPageProps {
  selectedSettings: CareSettingType[];
  valueResults: ValueResults;
  onBack: () => void;
  onComplete: (results: ModelResults) => void;
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

export default function InvestmentPage({
  selectedSettings,
  valueResults,
  onBack,
  onComplete,
}: InvestmentPageProps) {
  const isNursingSetting = selectedSettings.includes("nursing");
  
  const [pricingModel, setPricingModel] = useState<"per_clinician" | "enterprise">("per_clinician");
  const [costPerMonth, setCostPerMonth] = useState(140);
  const [enterpriseAnnual, setEnterpriseAnnual] = useState(100000);
  const [contractTerm, setContractTerm] = useState<1 | 2 | 3>(1);
  const [includeImplementation, setIncludeImplementation] = useState(false);
  const [implementationFee, setImplementationFee] = useState(25000);
  
  const [costPerBedPerMonth, setCostPerBedPerMonth] = useState(75);

  const providers = valueResults.providers;
  const staffedBeds = valueResults.nursingStaffedBeds || 200;
  const totalBenefit = valueResults.totalBenefit;

  const annualInvestment = useMemo(() => {
    if (isNursingSetting) {
      return staffedBeds * costPerBedPerMonth * 12;
    }
    if (pricingModel === "per_clinician") {
      return providers * costPerMonth * 12;
    }
    return enterpriseAnnual;
  }, [isNursingSetting, staffedBeds, costPerBedPerMonth, pricingModel, providers, costPerMonth, enterpriseAnnual]);

  const totalInvestment = annualInvestment + (includeImplementation ? implementationFee : 0);
  const netGain = totalBenefit - totalInvestment;
  const roiMultiple = totalInvestment > 0 ? totalBenefit / totalInvestment : 0;
  const paybackMonths = totalBenefit > 0 ? Math.round((totalInvestment / totalBenefit) * 12) : 0;

  const handleComplete = () => {
    onComplete({
      ...valueResults,
      investment: totalInvestment,
      netGain,
      roiMultiple,
      paybackMonths,
      costPerMonth,
      enterpriseAnnual,
      pricingModel,
      nursingCostPerBedPerMonth: costPerBedPerMonth,
    });
  };

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#6B7280] hover:text-[#111827] transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          
          <img src={abridgeLogo} alt="Abridge" className="h-6" />
          
          <div className="text-sm text-[#6B7280]">
            Step <span className="font-semibold text-[#111827]">4</span> of <span className="font-semibold text-[#111827]">5</span>
            <span className="ml-2 text-[#111827]">Your Investment</span>
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#111827] mb-2">Your Investment</h1>
          <p className="text-[#6B7280]">What does this cost?</p>
        </div>

        <section className="bg-white rounded-2xl border border-neutral-200 p-8 mb-8">
          {isNursingSetting ? (
            <div className="space-y-6">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-800 flex items-start gap-2">
                  <DollarSign className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span>Abridge Nursing uses per-bed pricing. Your cost stays fixed as utilization increases.</span>
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#111827]">Cost per staffed bed</label>
                <div className="flex items-center gap-2">
                  <span className="text-[#6B7280]">$</span>
                  <Input
                    type="number"
                    value={costPerBedPerMonth}
                    onChange={(e) => setCostPerBedPerMonth(Number(e.target.value) || 0)}
                    className="w-24 font-mono"
                    data-testid="input-cost-per-bed"
                  />
                  <span className="text-sm text-[#6B7280]">/bed/month</span>
                </div>
                <p className="text-xs text-[#6B7280]">$60-90/bed/month is typical</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#111827]">Contract term</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map(term => (
                    <button
                      key={term}
                      onClick={() => setContractTerm(term as 1 | 2 | 3)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                        contractTerm === term
                          ? "border-[#E85D3F] bg-[#E85D3F] text-white shadow-sm"
                          : "border-neutral-200 bg-white text-[#6B7280] hover:border-neutral-300 hover:bg-neutral-50"
                      }`}
                      data-testid={`contract-term-${term}`}
                    >
                      {term} yr{term > 1 ? "s" : ""}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={includeImplementation}
                  onChange={(e) => setIncludeImplementation(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-[#E85D3F] focus:ring-[#E85D3F]"
                  data-testid="checkbox-implementation"
                />
                <label className="text-sm text-[#111827]">Add implementation fee</label>
                {includeImplementation && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#6B7280]">$</span>
                    <FormattedNumberInput
                      value={implementationFee}
                      onChange={setImplementationFee}
                      className="w-32"
                      data-testid="input-implementation-fee"
                    />
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                <p className="text-sm text-[#111827] font-mono">
                  {staffedBeds} beds × ${costPerBedPerMonth}/bed × 12 = {formatCurrency(annualInvestment)}/year
                  {includeImplementation && (
                    <span className="text-[#6B7280]"> + {formatCurrency(implementationFee)} implementation</span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#111827]">Pricing model</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPricingModel("per_clinician")}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      pricingModel === "per_clinician"
                        ? "border-[#E85D3F] bg-[#E85D3F] text-white shadow-sm"
                        : "border-neutral-200 bg-white text-[#6B7280] hover:border-neutral-300 hover:bg-neutral-50"
                    }`}
                    data-testid="pricing-per-clinician"
                  >
                    Per clinician/month
                  </button>
                  <button
                    onClick={() => setPricingModel("enterprise")}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      pricingModel === "enterprise"
                        ? "border-[#E85D3F] bg-[#E85D3F] text-white shadow-sm"
                        : "border-neutral-200 bg-white text-[#6B7280] hover:border-neutral-300 hover:bg-neutral-50"
                    }`}
                    data-testid="pricing-enterprise"
                  >
                    Enterprise annual
                  </button>
                </div>
              </div>
              
              {pricingModel === "per_clinician" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#111827]">Cost per clinician</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[#6B7280]">$</span>
                    <Input
                      type="number"
                      value={costPerMonth}
                      onChange={(e) => setCostPerMonth(Number(e.target.value) || 0)}
                      className="w-24 font-mono"
                      data-testid="input-cost-per-month"
                    />
                    <span className="text-sm text-[#6B7280]">/month</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#111827]">Annual enterprise cost</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[#6B7280]">$</span>
                    <FormattedNumberInput
                      value={enterpriseAnnual}
                      onChange={setEnterpriseAnnual}
                      className="w-40"
                      data-testid="input-enterprise-annual"
                    />
                    <span className="text-sm text-[#6B7280]">/year</span>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#111827]">Contract term</label>
                <div className="flex gap-2">
                  {[1, 2, 3].map(term => (
                    <button
                      key={term}
                      onClick={() => setContractTerm(term as 1 | 2 | 3)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                        contractTerm === term
                          ? "border-[#E85D3F] bg-[#E85D3F] text-white shadow-sm"
                          : "border-neutral-200 bg-white text-[#6B7280] hover:border-neutral-300 hover:bg-neutral-50"
                      }`}
                      data-testid={`contract-term-${term}`}
                    >
                      {term} yr{term > 1 ? "s" : ""}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={includeImplementation}
                  onChange={(e) => setIncludeImplementation(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-[#E85D3F] focus:ring-[#E85D3F]"
                  data-testid="checkbox-implementation"
                />
                <label className="text-sm text-[#111827]">Add implementation fee</label>
                {includeImplementation && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#6B7280]">$</span>
                    <FormattedNumberInput
                      value={implementationFee}
                      onChange={setImplementationFee}
                      className="w-32"
                      data-testid="input-implementation-fee"
                    />
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                <p className="text-sm text-[#111827] font-mono">
                  {pricingModel === "per_clinician" ? (
                    <>
                      {providers} providers × ${costPerMonth} × 12 = {formatCurrency(annualInvestment)}/year
                    </>
                  ) : (
                    <>{formatCurrency(enterpriseAnnual)}/year</>
                  )}
                  {includeImplementation && (
                    <span className="text-[#6B7280]"> + {formatCurrency(implementationFee)} implementation</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm">
          <div className="text-center space-y-6">
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-[#6B7280]">Total Annual Value</span>
              <span className="font-mono font-bold text-2xl text-emerald-600">{formatCurrency(totalBenefit)}</span>
            </div>
            
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-[#6B7280]">Annual Investment</span>
              <span className="font-mono font-bold text-2xl text-[#6B7280]">{formatCurrency(totalInvestment)}</span>
            </div>
            
            <div className="border-t border-neutral-200 pt-6">
              <div className="text-xs uppercase tracking-wider text-[#6B7280] mb-2">Net Gain</div>
              <div className="font-mono font-bold text-4xl text-emerald-600 mb-1">
                {formatCurrency(netGain)}/yr
              </div>
            </div>
            
            <div className="pt-4">
              <div className="font-mono font-bold text-3xl text-[#111827] mb-1">{roiMultiple.toFixed(1)}x</div>
              <div className="text-xs uppercase tracking-wider text-[#6B7280]">Return on Investment</div>
            </div>
            
            <div className="text-sm text-[#6B7280] italic">
              ~{paybackMonths} months to payback
            </div>
          </div>
        </section>

        <div className="mt-8 space-y-4">
          <Button
            onClick={handleComplete}
            className="w-full h-12 bg-[#E85D3F] hover:bg-[#D14D32] border-[#E85D3F] text-white text-base font-semibold"
            data-testid="button-view-summary"
          >
            View Full Summary
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          
          <button
            onClick={onBack}
            className="w-full text-center text-sm text-[#6B7280] hover:text-[#111827] transition-colors"
            data-testid="button-edit-value"
          >
            ← Edit value drivers
          </button>
        </div>
      </div>
    </div>
  );
}
