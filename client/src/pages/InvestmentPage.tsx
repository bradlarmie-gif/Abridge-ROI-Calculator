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
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Clock,
  TrendingUp,
  DollarSign,
  Star,
  Check,
  Info,
  Zap,
  CheckCircle,
  Calculator,
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

const formatCurrencyCompact = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${value}`;
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
  
  // Effective contract term
  const effectiveContractTerm = contractTerm;
  const [implementationFee, setImplementationFee] = useState(25000);
  
  // Loading overlay state
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [pendingResults, setPendingResults] = useState<ModelResults | null>(null);
  
  // Animation states
  const [showReturnCard, setShowReturnCard] = useState(false);
  const [animateCard, setAnimateCard] = useState(false);
  const [animatedROI, setAnimatedROI] = useState(0);
  const [animatedNetGain, setAnimatedNetGain] = useState(0);
  const [animateBars, setAnimateBars] = useState(false);
  const animationRef = useRef<number | null>(null);
  const previousPriceRef = useRef<number>(0);

  const units = isNursingSetting 
    ? (valueResults.nursingStaffedBeds || 200)
    : valueResults.providers;
  const totalAnnualValue = valueResults.totalBenefit;
  
  const valueBreakdown = useMemo(() => {
    const breakdown: { name: string; value: number; category: "labor" | "revenue" }[] = [];
    const driverResults = valueResults.driverResults || {};
    const laborDrivers = ["overtime", "patientAccess", "retention", "edThroughput", "edScribe", "edRetention", "inpatientRetention", "nursingOvertime", "nursingAgency", "nursingRetention"];
    
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
  const laborPercent = totalAnnualValue > 0 ? Math.round((laborTotal / totalAnnualValue) * 100) : 0;
  const revenuePercent = totalAnnualValue > 0 ? Math.round((revenueTotal / totalAnnualValue) * 100) : 0;

  const annualInvestment = useMemo(() => {
    if (pricingModel === "per_unit_monthly" && costPerUnit !== "") {
      return units * costPerUnit * 12;
    }
    if (pricingModel === "enterprise_annual" && enterpriseAnnual !== "") {
      return enterpriseAnnual;
    }
    return 0;
  }, [pricingModel, units, costPerUnit, enterpriseAnnual]);

  // Check if we have valid pricing entered
  const hasPricingEntered = useMemo(() => {
    if (pricingModel === "per_unit_monthly" && costPerUnit !== "" && costPerUnit > 0) {
      return true;
    }
    if (pricingModel === "enterprise_annual" && enterpriseAnnual !== "" && enterpriseAnnual > 0) {
      return true;
    }
    return false;
  }, [pricingModel, costPerUnit, enterpriseAnnual]);

  const totalInvestment = (annualInvestment * effectiveContractTerm) + (includeImplementation ? implementationFee : 0);
  const netGainAnnual = totalAnnualValue - annualInvestment;
  const roiMultiple = useMemo(() => {
    if (annualInvestment <= 0) return 0;
    return totalAnnualValue / annualInvestment;
  }, [totalAnnualValue, annualInvestment]);
  const monthsToPayback = totalAnnualValue > 0 ? Math.round((annualInvestment / totalAnnualValue) * 12) : 0;

  // Animate number counting
  const animateNumber = useCallback((
    start: number,
    end: number,
    duration: number,
    onUpdate: (val: number) => void,
    onComplete?: () => void
  ) => {
    const startTime = performance.now();
    
    const update = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out-cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const current = start + (end - start) * eased;
      onUpdate(current);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(update);
      } else {
        onComplete?.();
      }
    };
    
    animationRef.current = requestAnimationFrame(update);
  }, []);

  // Handle animation when pricing is entered
  useEffect(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (hasPricingEntered && annualInvestment > 0) {
      const isReanimation = previousPriceRef.current > 0;
      const duration = isReanimation ? 400 : 800;
      
      // Show the card
      setShowReturnCard(true);
      
      // Small delay then animate in
      setTimeout(() => {
        setAnimateCard(true);
        
        // Animate numbers
        animateNumber(0, roiMultiple, duration, (val) => setAnimatedROI(val));
        animateNumber(0, netGainAnnual, duration, (val) => setAnimatedNetGain(val));
        
        // Animate bars with delay
        setTimeout(() => setAnimateBars(true), 300);
      }, 50);
      
      previousPriceRef.current = annualInvestment;
    } else {
      // Hide the card
      setAnimateCard(false);
      setAnimateBars(false);
      setTimeout(() => {
        setShowReturnCard(false);
        setAnimatedROI(0);
        setAnimatedNetGain(0);
      }, 300);
      previousPriceRef.current = 0;
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [hasPricingEntered, annualInvestment, roiMultiple, netGainAnnual, animateNumber]);

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

  const investmentBarWidth = totalAnnualValue > 0 ? Math.min((annualInvestment / totalAnnualValue) * 100, 100) : 50;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
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

      {/* Progress Bar */}
      <div className="bg-white border-b border-slate-100 py-3 px-4">
        <ExploreProgressBar currentStep={5} />
      </div>

      <div className="py-8 sm:py-12 pb-16">
        {/* Centered Page Header */}
        <motion.div 
          className="text-center max-w-[700px] mx-auto px-6 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            Configure Your Investment
          </h1>
          <p className="text-lg text-slate-600">
            Enter your pricing to see the complete picture
          </p>
        </motion.div>

        {/* 5-Column Grid Layout matching Explore flow */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* Left Column - Configuration */}
            <motion.div 
              className="lg:col-span-3 space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
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
                        ? "border-[#EA2C00] bg-[rgba(234,44,0,0.02)]"
                        : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]"
                    }`}
                    data-testid="pricing-per-unit"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-semibold text-[#111827]">Per {config.unitName} / Month</h3>
                      <div className="flex items-center gap-1 text-[12px] font-medium text-[#EA2C00] bg-[rgba(234,44,0,0.1)] px-2 py-0.5 rounded">
                        <Star className="w-3 h-3" />
                        Most flexible
                      </div>
                    </div>
                    <p className="text-[14px] text-[#6B7280]">Pay per active {config.unitName}. Scale up or down as needed.</p>
                    {pricingModel === "per_unit_monthly" && costPerUnit !== "" && costPerUnit > 0 && (
                      <div className="font-mono text-sm text-[#6B7280] mt-3">
                        {units} {config.unitNamePlural} × ${costPerUnit}/month = <strong className="text-[#111827]">{formatCurrency(annualInvestment)}/year</strong>
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
                        ? "border-[#EA2C00] bg-[rgba(234,44,0,0.02)]"
                        : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]"
                    }`}
                    data-testid="pricing-enterprise"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-semibold text-[#111827]">Enterprise Annual</h3>
                      <div className="flex items-center gap-1 text-[12px] font-medium text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded">
                        Best for scale
                      </div>
                    </div>
                    <p className="text-[14px] text-[#6B7280]">Fixed annual fee for unlimited {config.unitNamePlural} in scope.</p>
                    {pricingModel === "enterprise_annual" && (
                      <div className="absolute top-5 right-5 w-6 h-6 rounded-full bg-[#EA2C00] flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Cost Per Unit (if per-unit selected) */}
              {pricingModel === "per_unit_monthly" && (
                <div className="mb-8">
                  <label className="text-[15px] font-semibold text-[#111827] mb-3 block">
                    Cost per {config.unitName}/month
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-[200px]">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[#6B7280]">$</span>
                      <input
                        type="number"
                        value={costPerUnit}
                        placeholder={`e.g., ${config.defaultPrice}`}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCostPerUnit(val === "" ? "" : Number(val));
                        }}
                        className="w-full pl-8 pr-4 py-3 text-lg font-semibold border-2 border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#EA2C00] focus:ring-4 focus:ring-[rgba(234,44,0,0.1)] placeholder:text-[#9CA3AF] placeholder:font-normal"
                        data-testid="input-cost-per-unit"
                      />
                    </div>
                    <span className="text-[15px] text-[#6B7280]">/month</span>
                  </div>
                </div>
              )}

              {/* Enterprise Annual (if enterprise selected) */}
              {pricingModel === "enterprise_annual" && (
                <div className="mb-8">
                  <label className="text-[15px] font-semibold text-[#111827] mb-3 block">Annual enterprise cost</label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-[200px]">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[#6B7280]">$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={enterpriseAnnual === "" ? "" : enterpriseAnnual.toLocaleString()}
                        placeholder="e.g., 100,000"
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setEnterpriseAnnual(val === "" ? "" : parseInt(val, 10));
                        }}
                        className="w-full pl-8 pr-4 py-3 text-lg font-semibold border-2 border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#EA2C00] focus:ring-4 focus:ring-[rgba(234,44,0,0.1)] placeholder:text-[#9CA3AF] placeholder:font-normal"
                        data-testid="input-enterprise-annual"
                      />
                    </div>
                    <span className="text-[15px] text-[#6B7280]">/year</span>
                  </div>
                </div>
              )}

              {/* Contract Term */}
              <div className="mb-8">
                <label className="text-[15px] font-semibold text-[#111827] block mb-4">Contract Term</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 2 years */}
                  <button
                    onClick={() => setContractTerm(2)}
                    className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                      contractTerm === 2
                        ? "border-[#EA2C00] bg-[rgba(234,44,0,0.02)]"
                        : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]"
                    }`}
                    data-testid="contract-term-2"
                  >
                    <div className="text-lg font-bold text-[#111827]">2 years</div>
                  </button>
                  
                  {/* 3 years */}
                  <button
                    onClick={() => setContractTerm(3)}
                    className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                      contractTerm === 3
                        ? "border-[#EA2C00] bg-[rgba(234,44,0,0.02)]"
                        : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]"
                    }`}
                    data-testid="contract-term-3"
                  >
                    <div className="text-lg font-bold text-[#111827]">3 years</div>
                  </button>
                </div>
              </div>

              {/* Implementation Fee */}
              <div className="mb-8">
                <label className="flex items-center justify-between p-4 rounded-xl border-2 border-[#E5E7EB] cursor-pointer hover:border-[#D1D5DB] transition-colors">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={includeImplementation}
                      onChange={(e) => setIncludeImplementation(e.target.checked)}
                      className="w-5 h-5 rounded border-[#D1D5DB] text-[#EA2C00] focus:ring-[#EA2C00]"
                      data-testid="checkbox-implementation"
                    />
                    <div>
                      <div className="text-[15px] font-medium text-[#111827]">Add implementation fee</div>
                      <div className="text-[13px] text-[#6B7280]">One-time setup and training costs</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-[#F3F4F6] rounded-lg">
                    <span className="text-[15px] font-semibold text-[#6B7280]">+$</span>
                    <input
                      type="text"
                      value={implementationFee.toLocaleString()}
                      onChange={(e) => {
                        const val = parseInt(e.target.value.replace(/,/g, '')) || 0;
                        setImplementationFee(val);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-20 text-[15px] font-semibold text-[#111827] bg-transparent focus:outline-none text-right"
                      data-testid="input-implementation-fee"
                    />
                  </div>
                </label>
                {includeImplementation && (
                  <p className="text-[13px] text-[#9CA3AF] mt-2 ml-1">
                    Includes: Training, workflow design, EMR integration support, and 90-day success tracking
                  </p>
                )}
              </div>

              {/* Configuration Summary */}
              <div className="p-6 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-[#6B7280]" />
                  <span className="text-[13px] font-semibold text-[#6B7280] uppercase tracking-[0.05em]">Your Configuration</span>
                </div>
                <div className="space-y-2 text-[15px]">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Model</span>
                    <span className="font-medium text-[#111827]">
                      {pricingModel === "per_unit_monthly" 
                        ? `Per ${config.unitName}/month` 
                        : pricingModel === "enterprise_annual" 
                          ? "Enterprise annual" 
                          : <span className="text-[#9CA3AF]">Not selected</span>}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">{config.unitNamePlural.charAt(0).toUpperCase() + config.unitNamePlural.slice(1)}</span>
                    <span className="font-medium text-[#111827]">{units}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">{isNursingSetting ? "Documentation Events" : "Annual Encounters"}</span>
                    <span className="font-medium text-[#111827]">
                      {isNursingSetting 
                        ? ((valueResults.nursingStaffedBeds || 200) * (valueResults.nursingDocEventsPerBedPerYear || 500)).toLocaleString()
                        : valueResults.encounters.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Utilization Rate</span>
                    <span className="font-medium text-[#111827]">{valueResults.utilizationRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">{isNursingSetting ? "Eligible Doc Events" : "Eligible Encounters"}</span>
                    <span className="font-medium text-emerald-600">
                      {isNursingSetting 
                        ? Math.round((valueResults.nursingStaffedBeds || 200) * (valueResults.nursingDocEventsPerBedPerYear || 500) * (valueResults.utilizationRate / 100)).toLocaleString()
                        : valueResults.eligibleEncounters.toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t border-[#E5E7EB] my-3" />
                  {pricingModel === "per_unit_monthly" && costPerUnit !== "" && (
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Price</span>
                      <span className="font-medium text-[#111827]">${costPerUnit}/{config.unitName}/month</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Term</span>
                    <span className="font-medium text-[#111827]">{effectiveContractTerm} year{effectiveContractTerm !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="border-t border-[#E5E7EB] my-3" />
                  <div className="flex justify-between">
                    <span className="font-semibold text-[#111827]">Annual Investment</span>
                    <span className="font-mono font-bold text-[#111827]" data-testid="annual-investment">
                      {hasPricingEntered ? formatCurrency(annualInvestment) : <span className="text-[#9CA3AF] font-normal">—</span>}
                    </span>
                  </div>
                  {includeImplementation && (
                    <div className="flex justify-between text-[#6B7280]">
                      <span>+ Implementation</span>
                      <span>${implementationFee.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Live Receipt Sidebar */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
            >
              <div className="bg-black rounded-2xl p-6 text-white sticky top-24">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Your ROI</h2>
                    <p className="text-sm text-white/60">Investment analysis</p>
                  </div>
                </div>

                {/* Value Breakdown */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-white/70">Annual Value</span>
                    <span className="font-semibold text-emerald-400">${totalAnnualValue.toLocaleString()}</span>
                  </div>
                  
                  {laborTotal > 0 && (
                    <div className="flex items-center justify-between py-2 border-b border-white/10 text-sm">
                      <span className="text-white/50 pl-3">Labor & Efficiency</span>
                      <span className="text-white/70">${laborTotal.toLocaleString()}</span>
                    </div>
                  )}
                  {revenueTotal > 0 && (
                    <div className="flex items-center justify-between py-2 border-b border-white/10 text-sm">
                      <span className="text-white/50 pl-3">Revenue & Quality</span>
                      <span className="text-white/70">${revenueTotal.toLocaleString()}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-white/70">Your Investment</span>
                    <span className={`font-semibold ${hasPricingEntered ? 'text-[#EA2C00]' : 'text-white/40'}`}>
                      {hasPricingEntered ? `-$${annualInvestment.toLocaleString()}` : '—'}
                    </span>
                  </div>
                </div>

                {/* ROI Result */}
                {hasPricingEntered ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="pt-4 border-t border-white/20 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/70">Net Annual Gain</span>
                        <span className="text-2xl font-bold text-emerald-400">
                          +${netGainAnnual.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* ROI Multiplier - Clean and subtle */}
                    <div className="bg-white/10 rounded-xl p-4 text-center">
                      <div className="text-sm text-white/60 mb-1">Return on Investment</div>
                      <div className="font-mono text-4xl font-bold text-white" data-testid="roi-multiple">
                        {roiMultiple.toFixed(1)}×
                      </div>
                    </div>

                    {/* Simple value bar */}
                    <div className="mt-4">
                      <div className="h-2 rounded-full overflow-hidden flex bg-white/10">
                        <div 
                          className="bg-[#EA2C00] transition-all duration-500"
                          style={{ width: `${Math.min((annualInvestment / totalAnnualValue) * 100, 100)}%` }}
                        />
                        <div 
                          className="bg-emerald-500 transition-all duration-500 flex-1"
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-white/50">
                        <span>Investment</span>
                        <span>Value created</span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="pt-4 border-t border-white/20">
                    <div className="text-center py-6">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-white/30" />
                      </div>
                      <p className="text-sm text-white/50">
                        Select a pricing model and enter your cost to see your return
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-6 p-4 bg-white/5 rounded-xl">
                  <p className="text-xs text-white/50">
                    All values include realization rates for conservative, defensible estimates.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Footer Actions */}
          <motion.div 
            className="flex flex-col items-center mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <Button
              onClick={handleComplete}
              disabled={!canComplete}
              className="h-12 px-8 font-semibold rounded-full bg-black hover:bg-black/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-view-summary"
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
