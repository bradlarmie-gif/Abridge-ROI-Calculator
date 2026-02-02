import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { BrandedLoadingOverlay } from "@/components/BrandedLoadingOverlay";
import { ExploreProgressBar } from "@/components/ExploreProgressBar";
import { type ModelResults, type ValueResults } from "@/pages/ModelBuilder";
import { type CareSettingType } from "@/lib/SETTING_CONFIG";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Star,
  Check,
  DollarSign,
  CheckCircle,
  TrendingUp,
  Zap,
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

const settingConfig = {
  outpatient: {
    unitName: "provider",
    unitNamePlural: "providers",
    defaultPrice: 200,
    pricingLabel: "Cost per provider"
  },
  ed: {
    unitName: "provider",
    unitNamePlural: "providers", 
    defaultPrice: 200,
    pricingLabel: "Cost per provider"
  },
  inpatient: {
    unitName: "provider",
    unitNamePlural: "providers",
    defaultPrice: 200,
    pricingLabel: "Cost per provider"
  },
  nursing: {
    unitName: "staffed bed",
    unitNamePlural: "staffed beds",
    defaultPrice: 200,
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
  
  const [pricingModel, setPricingModel] = useState<"per_unit_monthly" | "enterprise_annual" | null>(null);
  const [costPerUnit, setCostPerUnit] = useState<number | "">(""); 
  const [enterpriseAnnual, setEnterpriseAnnual] = useState<number | "">(""); 
  const [contractTerm, setContractTerm] = useState<number>(2);
  const [includeImplementation, setIncludeImplementation] = useState(false);
  const effectiveContractTerm = contractTerm;
  const [implementationFee, setImplementationFee] = useState(25000);
  
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [pendingResults, setPendingResults] = useState<ModelResults | null>(null);
  
  const animationRef = useRef<number | null>(null);
  const previousPriceRef = useRef<number>(0);

  const units = isNursingSetting 
    ? (valueResults.nursingStaffedBeds || 200)
    : valueResults.providers;
  const totalAnnualValue = valueResults.totalBenefit;
  
  const valueBreakdown = useMemo(() => {
    const breakdown: { name: string; value: number; category: "labor" | "revenue" }[] = [];
    const driverResults = valueResults.driverResults || {};
    const laborDrivers = ["overtime", "patientAccess", "retention", "workforce", "edThroughput", "edScribe", "edRetention", "inpatientRetention", "nursingOvertime", "nursingAgency", "nursingRetention"];
    
    Object.entries(driverResults).forEach(([key, result]) => {
      if (result && result.value > 0) {
        breakdown.push({
          name: result.name,
          value: result.value,
          category: laborDrivers.includes(key) ? "labor" : "revenue"
        });
      }
    });
    
    return breakdown.sort((a, b) => b.value - a.value);
  }, [valueResults.driverResults]);

  const laborTotal = valueBreakdown.filter(v => v.category === "labor").reduce((sum, v) => sum + v.value, 0);
  const revenueTotal = valueBreakdown.filter(v => v.category === "revenue").reduce((sum, v) => sum + v.value, 0);

  const annualInvestment = useMemo(() => {
    if (pricingModel === "per_unit_monthly" && costPerUnit !== "") {
      return units * costPerUnit * 12;
    }
    if (pricingModel === "enterprise_annual" && enterpriseAnnual !== "") {
      return enterpriseAnnual;
    }
    return 0;
  }, [pricingModel, units, costPerUnit, enterpriseAnnual]);

  const hasPricingEntered = useMemo(() => {
    if (pricingModel === "per_unit_monthly" && costPerUnit !== "" && costPerUnit > 0) {
      return true;
    }
    if (pricingModel === "enterprise_annual" && enterpriseAnnual !== "" && enterpriseAnnual > 0) {
      return true;
    }
    return false;
  }, [pricingModel, costPerUnit, enterpriseAnnual]);

  const netGainAnnual = totalAnnualValue - annualInvestment;
  const roiMultiple = useMemo(() => {
    if (annualInvestment <= 0) return 0;
    return totalAnnualValue / annualInvestment;
  }, [totalAnnualValue, annualInvestment]);
  const monthsToPayback = totalAnnualValue > 0 ? Math.round((annualInvestment / totalAnnualValue) * 12) : 0;

  const handleComplete = () => {
    const results: ModelResults = {
      ...valueResults,
      investment: annualInvestment,
      implementationFee: includeImplementation ? implementationFee : 0,
      netGain: netGainAnnual,
      roiMultiple,
      paybackMonths: monthsToPayback,
      costPerMonth: costPerUnit === "" ? 0 : costPerUnit,
      enterpriseAnnual: enterpriseAnnual === "" ? 0 : enterpriseAnnual,
      pricingModel: pricingModel === "per_unit_monthly" ? "per_clinician" : "enterprise",
      nursingCostPerBedPerMonth: isNursingSetting ? (costPerUnit === "" ? 0 : costPerUnit) : undefined,
      contractYears: effectiveContractTerm,
    };
    setPendingResults(results);
    setShowLoadingOverlay(true);
  };

  const handleLoadingComplete = useCallback(() => {
    setShowLoadingOverlay(false);
    if (pendingResults) {
      onComplete(pendingResults);
    }
  }, [pendingResults, onComplete]);

  const canComplete = hasPricingEntered;

  useKeyboardNavigation({
    onEnter: canComplete ? handleComplete : undefined,
    onEscape: onBack,
    enabled: true,
  });

  const investmentPercent = totalAnnualValue > 0 ? Math.min((annualInvestment / totalAnnualValue) * 100, 100) : 0;
  const valuePercent = 100 - investmentPercent;

  return (
    <div className="min-h-screen bg-slate-50">
      <BrandedLoadingOverlay 
        isVisible={showLoadingOverlay} 
        onComplete={handleLoadingComplete}
      />
      
      <UnifiedHeader
        pathType="explore"
        currentStep={5}
        totalSteps={6}
        stepName="Your Investment"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />

      <div className="bg-white border-b border-slate-100 py-3 px-4">
        <ExploreProgressBar currentStep={5} />
      </div>

      <div className="py-8 sm:py-12 pb-16">
        <motion.div 
          className="text-center max-w-[700px] mx-auto px-6 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3">
            Configure Investment
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            Complete Your ROI Model
          </h1>
          <p className="text-lg text-slate-600">
            Enter your pricing to see the complete picture
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            
            {/* Left Column - Configuration */}
            <motion.div 
              className="lg:col-span-3 space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              {/* Pricing Model Selection */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-slate-900 mb-1">Pricing Model</h2>
                  <p className="text-sm text-slate-500">Choose how you'll pay for Abridge</p>
                </div>

                <div className="space-y-3">
                  {/* Per Provider Option */}
                  <button
                    onClick={() => setPricingModel("per_unit_monthly")}
                    className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 relative ${
                      pricingModel === "per_unit_monthly"
                        ? "border-[#EA2C00] bg-[#FFF5F2]"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                    data-testid="pricing-per-unit"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-semibold text-slate-900">Per {config.unitName} / Month</h3>
                      <div className="flex items-center gap-1 text-xs font-medium text-[#EA2C00] bg-[#FFF5F2] px-2 py-1 rounded-full">
                        <Star className="w-3 h-3" />
                        Most flexible
                      </div>
                    </div>
                    <p className="text-sm text-slate-500">Pay per active {config.unitName}. Scale up or down as needed.</p>
                    {pricingModel === "per_unit_monthly" && costPerUnit !== "" && costPerUnit > 0 && (
                      <div className="text-sm text-slate-600 mt-3 pt-3 border-t border-slate-100">
                        {units} {config.unitNamePlural} × ${costPerUnit}/mo = <strong className="text-slate-900">{formatCurrency(annualInvestment)}/yr</strong>
                      </div>
                    )}
                    {pricingModel === "per_unit_monthly" && (
                      <div className="absolute top-5 right-5 w-6 h-6 rounded-full bg-[#EA2C00] flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>

                  {/* Enterprise Option */}
                  <button
                    onClick={() => setPricingModel("enterprise_annual")}
                    className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 relative ${
                      pricingModel === "enterprise_annual"
                        ? "border-[#EA2C00] bg-[#FFF5F2]"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                    data-testid="pricing-enterprise"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-semibold text-slate-900">Enterprise Annual</h3>
                      <div className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                        Best for scale
                      </div>
                    </div>
                    <p className="text-sm text-slate-500">Fixed annual fee for unlimited {config.unitNamePlural} in scope.</p>
                    {pricingModel === "enterprise_annual" && (
                      <div className="absolute top-5 right-5 w-6 h-6 rounded-full bg-[#EA2C00] flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Cost Input */}
              {pricingModel && (
                <motion.div 
                  className="bg-white rounded-2xl border border-slate-200 p-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {pricingModel === "per_unit_monthly" && (
                    <div>
                      <label className="text-sm font-semibold text-slate-900 mb-3 block">
                        Cost per {config.unitName}/month
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-[180px]">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">$</span>
                          <input
                            type="number"
                            value={costPerUnit}
                            placeholder={`${config.defaultPrice}`}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCostPerUnit(val === "" ? "" : Number(val));
                            }}
                            className="w-full pl-8 pr-4 py-3 text-xl font-bold text-slate-900 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#EA2C00] focus:ring-2 focus:ring-[#EA2C00]/10 placeholder:text-slate-300 placeholder:font-normal"
                            data-testid="input-cost-per-unit"
                          />
                        </div>
                        <span className="text-sm text-slate-500">/month</span>
                      </div>
                    </div>
                  )}

                  {pricingModel === "enterprise_annual" && (
                    <div>
                      <label className="text-sm font-semibold text-slate-900 mb-3 block">Annual enterprise cost</label>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-[180px]">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">$</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={enterpriseAnnual === "" ? "" : enterpriseAnnual.toLocaleString()}
                            placeholder="100,000"
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setEnterpriseAnnual(val === "" ? "" : parseInt(val, 10));
                            }}
                            className="w-full pl-8 pr-4 py-3 text-xl font-bold text-slate-900 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#EA2C00] focus:ring-2 focus:ring-[#EA2C00]/10 placeholder:text-slate-300 placeholder:font-normal"
                            data-testid="input-enterprise-annual"
                          />
                        </div>
                        <span className="text-sm text-slate-500">/year</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Contract Term */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <label className="text-sm font-semibold text-slate-900 block mb-4">Contract Term</label>
                <div className="flex gap-3">
                  {[2, 3].map((years) => (
                    <button
                      key={years}
                      onClick={() => setContractTerm(years)}
                      className={`flex-1 py-3 px-4 rounded-xl text-center font-semibold transition-all duration-200 ${
                        contractTerm === years
                          ? "bg-[#EA2C00] text-white"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                      data-testid={`contract-term-${years}`}
                    >
                      {years} years
                    </button>
                  ))}
                </div>
              </div>

              {/* Implementation Fee */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeImplementation}
                      onChange={(e) => setIncludeImplementation(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-[#EA2C00] focus:ring-[#EA2C00]"
                      data-testid="checkbox-implementation"
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Add implementation fee</div>
                      <div className="text-xs text-slate-500">One-time setup and training costs</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-500">+$</span>
                    <input
                      type="text"
                      value={implementationFee.toLocaleString()}
                      onChange={(e) => {
                        const val = parseInt(e.target.value.replace(/,/g, '')) || 0;
                        setImplementationFee(val);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-20 text-sm font-semibold text-slate-900 bg-transparent focus:outline-none text-right"
                      data-testid="input-implementation-fee"
                    />
                  </div>
                </label>
              </div>
            </motion.div>

            {/* Right Column - Live ROI Receipt */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="sticky top-24">
                {/* Premium ROI Card */}
                <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
                  {/* Header with subtle gradient accent */}
                  <div className="relative px-6 pt-6 pb-4">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#EA2C00] via-[#F07B5F] to-[#EA2C00]" />
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EA2C00] to-[#F07B5F] flex items-center justify-center shadow-lg shadow-[#EA2C00]/20">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">Your ROI</h2>
                        <p className="text-sm text-white/50">Live calculation</p>
                      </div>
                    </div>
                  </div>

                  {/* Value Summary */}
                  <div className="px-6 py-4 space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                      <span className="text-sm text-white/60">Annual Value</span>
                      <span className="text-lg font-bold text-[#F07B5F]">${totalAnnualValue.toLocaleString()}</span>
                    </div>
                    
                    {laborTotal > 0 && (
                      <div className="flex items-center justify-between py-1.5 text-sm">
                        <span className="text-white/40 pl-2">Time & Labor</span>
                        <span className="text-white/60">${laborTotal.toLocaleString()}</span>
                      </div>
                    )}
                    {revenueTotal > 0 && (
                      <div className="flex items-center justify-between py-1.5 text-sm">
                        <span className="text-white/40 pl-2">Documentation Quality</span>
                        <span className="text-white/60">${revenueTotal.toLocaleString()}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between py-2 border-t border-white/10">
                      <span className="text-sm text-white/60">Your Investment</span>
                      <span className={`text-lg font-bold ${hasPricingEntered ? 'text-white' : 'text-white/30'}`}>
                        {hasPricingEntered ? `-$${annualInvestment.toLocaleString()}` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* ROI Result */}
                  {hasPricingEntered ? (
                    <motion.div
                      className="px-6 pb-6"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      {/* Net Gain - Hero number */}
                      <div className="bg-gradient-to-br from-[#EA2C00]/20 to-[#F07B5F]/10 rounded-xl p-5 mb-4 border border-[#EA2C00]/20">
                        <div className="text-center">
                          <p className="text-xs font-medium text-[#F07B5F]/80 uppercase tracking-wider mb-2">Net Annual Gain</p>
                          <p className="text-4xl font-bold text-[#F07B5F]" data-testid="net-gain">
                            +${netGainAnnual.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* ROI Multiple */}
                      <div className="bg-white/5 rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-white/50 mb-1">Return on Investment</p>
                            <p className="text-3xl font-bold text-white" data-testid="roi-multiple">
                              {roiMultiple.toFixed(1)}×
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-white/50 mb-1">Every $1 invested</p>
                            <p className="text-lg font-semibold text-[#F07B5F]">
                              returns ${roiMultiple.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Value Bar Visualization */}
                      <div className="mb-4">
                        <div className="h-3 rounded-full overflow-hidden bg-white/5 flex">
                          <motion.div 
                            className="bg-white/30 rounded-l-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${investmentPercent}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          />
                          <motion.div 
                            className="bg-gradient-to-r from-[#EA2C00] to-[#F07B5F] rounded-r-full flex-1"
                            initial={{ width: 0 }}
                            animate={{ width: `${valuePercent}%` }}
                            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                          />
                        </div>
                        <div className="flex justify-between mt-2 text-xs">
                          <span className="text-white/40">Investment ({Math.round(investmentPercent)}%)</span>
                          <span className="text-[#F07B5F]">Value created ({Math.round(valuePercent)}%)</span>
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-lg p-3 text-center">
                          <p className="text-xs text-white/40 mb-1">{isNursingSetting ? 'Staffed Beds' : 'Providers'}</p>
                          <p className="text-sm font-semibold text-white">{units.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3 text-center">
                          <p className="text-xs text-white/40 mb-1">Utilization</p>
                          <p className="text-sm font-semibold text-white">{valueResults.utilizationRate}%</p>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="px-6 pb-6">
                      <div className="text-center py-8 border-t border-white/10">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                          <DollarSign className="w-7 h-7 text-white/20" />
                        </div>
                        <p className="text-sm text-white/40 max-w-[200px] mx-auto">
                          Select a pricing model and enter your cost to see your return
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Footer Note */}
                  <div className="px-6 pb-6">
                    <div className="p-3 bg-white/5 rounded-lg flex items-start gap-2">
                      <Zap className="w-4 h-4 text-[#F07B5F] flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-white/50">
                        All values include conservative realization rates for defensible estimates.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Continue Button - Desktop */}
                <div className="mt-6 hidden lg:block">
                  <Button
                    onClick={handleComplete}
                    disabled={!canComplete}
                    className={`w-full h-12 font-semibold rounded-full transition-all duration-200 ${
                      canComplete 
                        ? 'bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white shadow-lg shadow-[#EA2C00]/20' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    data-testid="button-view-summary"
                  >
                    View Full Summary
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  {!hasPricingEntered && (
                    <p className="text-xs text-slate-400 text-center mt-2">
                      Enter pricing to continue
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Mobile Continue Button */}
          <motion.div 
            className="flex flex-col items-center mt-10 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <Button
              onClick={handleComplete}
              disabled={!canComplete}
              className={`w-full max-w-sm h-12 font-semibold rounded-full transition-all duration-200 ${
                canComplete 
                  ? 'bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
              data-testid="button-view-summary-mobile"
            >
              View Full Summary
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            {!hasPricingEntered && (
              <p className="text-sm text-slate-400 mt-3">
                Enter pricing to continue
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
