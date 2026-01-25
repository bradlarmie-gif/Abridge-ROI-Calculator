import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type ModelResults, type ValueResults } from "@/pages/ModelBuilder";
import { type CareSettingType } from "@/lib/SETTING_CONFIG";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  DollarSign,
  Star,
  Check,
  Info,
  Zap,
  CheckCircle,
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
  const [contractTerm, setContractTerm] = useState<number>(1);
  const [isCustomTerm, setIsCustomTerm] = useState(false);
  const [customTermValue, setCustomTermValue] = useState<number | "">(1);
  const [includeImplementation, setIncludeImplementation] = useState(false);
  
  // Effective contract term (use custom if enabled, otherwise selected)
  const effectiveContractTerm = isCustomTerm 
    ? (typeof customTermValue === "number" ? Math.min(Math.max(customTermValue, 1), 4) : 1)
    : contractTerm;
  const [implementationFee, setImplementationFee] = useState(25000);
  
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
    onComplete({
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
    });
  };

  const investmentBarWidth = totalAnnualValue > 0 ? Math.min((annualInvestment / totalAnnualValue) * 100, 100) : 50;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <UnifiedHeader
        pathType="explore"
        currentStep={5}
        totalSteps={6}
        stepName="Your Investment"
        onBack={onBack}
      />
      <UnifiedHeaderSpacer />

      <div className="py-8 sm:py-12 pb-16">
        {/* Centered Page Header */}
        <div className="text-center max-w-[700px] mx-auto px-6 mb-12">
          <div className="inline-block text-[13px] font-semibold text-[#EA2C00] uppercase tracking-[0.1em] bg-[rgba(234,44,0,0.08)] px-3 py-1.5 rounded-md mb-6">
            Step 5 of 6
          </div>
          <h1 className="text-4xl md:text-[48px] font-bold text-[#111827] leading-[1.1] tracking-[-0.02em] mb-4">
            Your Return on Investment
          </h1>
          <p className="text-[17px] leading-relaxed text-[#6B7280]">
            Align cost with value realization. Configure your investment and see the net impact.
          </p>
        </div>

        {/* ROI Hero Section */}
        <div className="max-w-6xl mx-auto px-6 mb-12">
          {!showReturnCard ? (
            // Placeholder state - dashed border box
            <div className="border-2 border-dashed border-[#E5E7EB] rounded-2xl p-16 bg-[#F9FAFB]">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                  <DollarSign className="w-8 h-8 text-[#9CA3AF]" />
                </div>
                <p className="text-[16px] font-medium text-[#9CA3AF]">
                  Select a pricing model and enter your cost to see your return
                </p>
              </div>
            </div>
          ) : (
            // Animated return card
            <div 
              className={`bg-[#111827] rounded-2xl p-8 md:p-10 transition-all duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                animateCard 
                  ? "opacity-100 translate-y-0 scale-100" 
                  : "opacity-0 -translate-y-5 scale-[0.95]"
              }`}
            >
              <div className="text-center mb-8">
                <span className="text-[13px] font-semibold text-white/60 uppercase tracking-[0.1em]">Your Return</span>
              </div>

              {/* ROI Visual Bar */}
              <div className="max-w-2xl mx-auto mb-8">
                <div className="relative h-16 bg-white/10 rounded-xl overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-[#EA2C00] flex items-center justify-center transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{ 
                      width: animateBars ? `${investmentBarWidth}%` : '0%',
                      transitionDelay: '400ms'
                    }}
                  >
                    <div className="text-center">
                      <div className="text-[11px] font-medium text-white/80 uppercase">Investment</div>
                      <div className="text-lg font-bold text-white">{formatCurrencyCompact(annualInvestment)}</div>
                    </div>
                  </div>
                  <div 
                    className="absolute inset-y-0 right-0 bg-emerald-500 flex items-center justify-center transition-all duration-[800ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                    style={{ 
                      width: animateBars ? `${100 - investmentBarWidth}%` : '0%',
                      transitionDelay: '500ms'
                    }}
                  >
                    <div className="text-center">
                      <div className="text-[11px] font-medium text-white/80 uppercase">Annual Value</div>
                      <div className="text-lg font-bold text-white">{formatCurrencyCompact(totalAnnualValue)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ROI Multiplier */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-4 bg-white/10 rounded-2xl px-8 py-5">
                  <span className="font-mono text-5xl md:text-6xl font-bold text-white tabular-nums" data-testid="roi-multiple">
                    {roiMultiple.toFixed(1)}×
                  </span>
                  <span className="text-lg text-white/80 font-medium">Return on<br/>Investment</span>
                </div>
              </div>

              {/* Net Annual Gain */}
              <div className="text-center">
                <span className="text-sm text-white/60 block mb-1">Net Annual Gain</span>
                <span className="font-mono text-3xl font-bold text-emerald-400 tabular-nums" data-testid="net-gain">
                  +{formatCurrency(Math.round(animatedNetGain))}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column - Configure Your Investment */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8">
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-[#111827] mb-1">Configure Your Investment</h2>
                <p className="text-[15px] text-[#6B7280]">Adjust pricing model and contract terms</p>
              </div>

              {/* Pricing Model */}
              <div className="mb-8">
                <label className="text-[15px] font-semibold text-[#111827] block mb-4">Pricing Model</label>
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
                        placeholder={config.defaultPrice.toString()}
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
                        placeholder="100,000"
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Custom */}
                  <button
                    onClick={() => {
                      setIsCustomTerm(true);
                      setContractTerm(1);
                    }}
                    className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                      isCustomTerm
                        ? "border-[#EA2C00] bg-[rgba(234,44,0,0.02)]"
                        : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]"
                    }`}
                    data-testid="contract-term-custom"
                  >
                    <div className="text-lg font-bold text-[#111827]">Custom</div>
                  </button>
                  
                  {/* 2 years */}
                  <button
                    onClick={() => {
                      setIsCustomTerm(false);
                      setContractTerm(2);
                    }}
                    className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                      !isCustomTerm && contractTerm === 2
                        ? "border-[#EA2C00] bg-[rgba(234,44,0,0.02)]"
                        : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]"
                    }`}
                    data-testid="contract-term-2"
                  >
                    <div className="text-lg font-bold text-[#111827]">2 years</div>
                  </button>
                  
                  {/* 3 years */}
                  <button
                    onClick={() => {
                      setIsCustomTerm(false);
                      setContractTerm(3);
                    }}
                    className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                      !isCustomTerm && contractTerm === 3
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
            </div>

            {/* Right Column - Value Breakdown */}
            <div className="space-y-6">
              <div className="mb-2">
                <h2 className="text-xl font-semibold text-[#111827] mb-1">Value Breakdown</h2>
                <p className="text-[15px] text-[#6B7280]">Where your return comes from</p>
              </div>

              {/* Value Categories */}
              {laborTotal > 0 && (
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-base font-semibold text-[#111827]">Labor & Efficiency</h4>
                          <p className="text-[13px] text-[#6B7280]">{laborPercent}% of total value</p>
                        </div>
                        <span className="font-mono text-lg font-bold text-emerald-600">{formatCurrency(laborTotal)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pl-13">
                    {valueBreakdown.filter(v => v.category === "labor").map((item, idx) => (
                      <div key={idx} className="flex justify-between text-[14px]">
                        <span className="text-[#6B7280]">{item.name}</span>
                        <span className="font-mono text-emerald-600">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {revenueTotal > 0 && (
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-base font-semibold text-[#111827]">Revenue & Quality</h4>
                          <p className="text-[13px] text-[#6B7280]">{revenuePercent}% of total value</p>
                        </div>
                        <span className="font-mono text-lg font-bold text-emerald-600">{formatCurrency(revenueTotal)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pl-13">
                    {valueBreakdown.filter(v => v.category === "revenue").map((item, idx) => (
                      <div key={idx} className="flex justify-between text-[14px]">
                        <span className="text-[#6B7280]">{item.name}</span>
                        <span className="font-mono text-emerald-600">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Value Distribution Chart */}
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
                <div className="text-[13px] font-medium text-[#6B7280] mb-3">Value Distribution</div>
                <div className="h-6 rounded-lg overflow-hidden flex">
                  {laborPercent > 0 && (
                    <div 
                      className="bg-blue-500 flex items-center justify-center transition-all duration-500"
                      style={{ width: `${laborPercent}%` }}
                    >
                      {laborPercent > 15 && <span className="text-white text-xs font-semibold">{laborPercent}%</span>}
                    </div>
                  )}
                  {revenuePercent > 0 && (
                    <div 
                      className="bg-emerald-500 flex items-center justify-center transition-all duration-500"
                      style={{ width: `${revenuePercent}%` }}
                    >
                      {revenuePercent > 15 && <span className="text-white text-xs font-semibold">{revenuePercent}%</span>}
                    </div>
                  )}
                </div>
                <div className="flex gap-4 mt-3">
                  {laborPercent > 0 && (
                    <div className="flex items-center gap-2 text-[13px]">
                      <div className="w-3 h-3 rounded bg-blue-500" />
                      <span className="text-[#6B7280]">Labor & Efficiency</span>
                    </div>
                  )}
                  {revenuePercent > 0 && (
                    <div className="flex items-center gap-2 text-[13px]">
                      <div className="w-3 h-3 rounded bg-emerald-500" />
                      <span className="text-[#6B7280]">Revenue & Quality</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Total Annual Value */}
              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-6">
                <div className="text-[13px] font-medium text-emerald-700 mb-1">Total Annual Value</div>
                <div className="font-mono text-4xl font-bold text-emerald-700" data-testid="total-annual-value">
                  {formatCurrency(totalAnnualValue)}
                </div>
                <p className="text-[14px] text-emerald-600 mt-1">From {valueBreakdown.length} value driver{valueBreakdown.length !== 1 ? "s" : ""}</p>
              </div>

              {/* Net Gain Card */}
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5" />
                  <span className="text-sm font-semibold uppercase tracking-wide opacity-90">Net Annual Gain</span>
                </div>
                <div className="font-mono text-4xl font-bold mb-2">
                  +{formatCurrency(netGainAnnual)}
                </div>
                <p className="text-sm opacity-80">
                  That's {formatCurrency(Math.round(netGainAnnual / 12))}/month in realized value
                </p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-12 max-w-md mx-auto space-y-4">
            <button
              onClick={handleComplete}
              className="w-full inline-flex items-center justify-center gap-2 px-8 py-5 rounded-xl font-semibold text-[17px] bg-[#EA2C00] text-white hover:bg-[#d12700] transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
              data-testid="button-view-summary"
            >
              View Full Summary
              <ChevronRight className="w-5 h-5" />
            </button>
            
            <button
              onClick={onBack}
              className="w-full text-center text-[15px] text-[#6B7280] hover:text-[#EA2C00] transition-colors py-2"
              data-testid="button-edit-value"
            >
              ← Edit value drivers
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
