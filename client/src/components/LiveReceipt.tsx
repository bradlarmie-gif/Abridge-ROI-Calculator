import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, ChevronUp, Info, X } from "lucide-react";

interface LiveReceiptProps {
  providers: number;
  annualEncounters: number;
  utilizationPercent: number | null;
  eligibleEncounters: number | null;
  minutesSaved: number | null;
  realizationRate: number | null;
  totalHoursSaved: number | null;
  realizedHoursSaved: number | null;
  wrvuLift: number | null;
  baselineWrvu: number | null;
  selectedLeverIds: Set<string>;
  currentDriverValues: Record<string, number>;
  totalProjectedValue: number;
  annualSubscriptionCost: number | null;
  implementationFee: number | null;
  implementationEnabled: boolean;
  contractYears: number | null;
  year1TotalCost: number | null;
  lifetimeSubscription: number | null;
  currentPosture: string | null;
  modelSetupStep?: number;
  ftPatientAccessVisitDuration?: number;
  ftPatientAccessRevenuePerVisit?: number;
  ftWrvuRevenuePerUnit?: number;
  ftRetentionReplacementCost?: number;
  ftHccBenchmarkPmpm?: number;
}

const DRIVER_LABELS: Record<string, string> = {
  patientAccess: "Patient Access",
  wrvu: "Level of Service",
  workforce: "Clinician Retention",
  hccCapture: "HCC Capture",
  hcc: "HCC Capture",
  denialReduction: "Denial Reduction",
  denials: "Denial Reduction",
  overtime: "Overtime Savings",
};

function formatCurrency(value: number | null | undefined, showSign = false): string {
  if (value === null || value === undefined) return "—";
  const prefix = showSign && value < 0 ? "-" : showSign && value > 0 ? "+" : "";
  return prefix + "$" + Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

export function LiveReceipt({
  providers,
  annualEncounters,
  utilizationPercent,
  eligibleEncounters,
  minutesSaved,
  realizationRate,
  totalHoursSaved,
  realizedHoursSaved,
  wrvuLift,
  baselineWrvu,
  selectedLeverIds,
  currentDriverValues,
  totalProjectedValue,
  annualSubscriptionCost,
  implementationFee,
  implementationEnabled,
  contractYears,
  year1TotalCost,
  lifetimeSubscription,
  currentPosture,
  modelSetupStep = 1,
  ftPatientAccessVisitDuration = 30,
  ftPatientAccessRevenuePerVisit = 200,
  ftWrvuRevenuePerUnit = 40,
  ftRetentionReplacementCost = 250000,
  ftHccBenchmarkPmpm = 1000,
}: LiveReceiptProps) {
  const [adoptionExpanded, setAdoptionExpanded] = useState(true);
  const [timeExpanded, setTimeExpanded] = useState(true);
  const [driversExpanded, setDriversExpanded] = useState(true);
  const [investmentExpanded, setInvestmentExpanded] = useState(true);
  
  const [mobileExpanded, setMobileExpanded] = useState(false);
  
  const [updatedFields, setUpdatedFields] = useState<Set<string>>(new Set());
  const prevValuesRef = useRef<Record<string, any>>({});

  const netAnnualGain = useMemo(() => {
    if (annualSubscriptionCost === null) return totalProjectedValue;
    return totalProjectedValue - annualSubscriptionCost;
  }, [totalProjectedValue, annualSubscriptionCost]);

  const roiMultiple = useMemo(() => {
    if (!annualSubscriptionCost || annualSubscriptionCost <= 0) return 0;
    return totalProjectedValue / annualSubscriptionCost;
  }, [totalProjectedValue, annualSubscriptionCost]);

  const threeYearBenefit = useMemo(() => {
    if (!contractYears || contractYears <= 1) return null;
    return totalProjectedValue * contractYears;
  }, [totalProjectedValue, contractYears]);

  const threeYearNetGain = useMemo(() => {
    if (threeYearBenefit === null) return null;
    if (lifetimeSubscription === null) return threeYearBenefit;
    return threeYearBenefit - lifetimeSubscription;
  }, [threeYearBenefit, lifetimeSubscription]);

  useEffect(() => {
    const currentValues = {
      providers,
      annualEncounters,
      utilizationPercent,
      eligibleEncounters,
      minutesSaved,
      totalHoursSaved,
      realizedHoursSaved,
      totalProjectedValue,
      netAnnualGain,
    };

    const newUpdatedFields = new Set<string>();
    
    Object.entries(currentValues).forEach(([key, value]) => {
      if (prevValuesRef.current[key] !== undefined && prevValuesRef.current[key] !== value) {
        newUpdatedFields.add(key);
      }
    });

    if (newUpdatedFields.size > 0) {
      setUpdatedFields(newUpdatedFields);
      setTimeout(() => setUpdatedFields(new Set()), 400);
    }

    prevValuesRef.current = currentValues;
  }, [providers, annualEncounters, utilizationPercent, eligibleEncounters, minutesSaved, totalHoursSaved, realizedHoursSaved, totalProjectedValue, netAnnualGain]);

  const getHighlightClass = (field: string) => {
    return updatedFields.has(field) ? "receipt-value-updated" : "";
  };

  const additionalWrvus = useMemo(() => {
    if (!eligibleEncounters || !baselineWrvu || !wrvuLift) return 0;
    return Math.round(eligibleEncounters * baselineWrvu * (wrvuLift / 100));
  }, [eligibleEncounters, baselineWrvu, wrvuLift]);

  const newVisits = useMemo(() => {
    if (!realizedHoursSaved || !ftPatientAccessVisitDuration) return 0;
    return Math.round((realizedHoursSaved * 60) / ftPatientAccessVisitDuration);
  }, [realizedHoursSaved, ftPatientAccessVisitDuration]);

  const postureLabelMap: Record<string, string> = {
    conservative: "Conservative",
    typical: "Typical",
    aggressive: "Aggressive",
    custom: "Custom",
  };

  const selectedDrivers = Array.from(selectedLeverIds);
  const hasDrivers = selectedDrivers.length > 0;
  const hasInvestment = annualSubscriptionCost !== null || (implementationEnabled && implementationFee !== null);

  return (
    <>
      <div className="hidden lg:block w-[360px] flex-shrink-0">
        <div className="sticky top-6">
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Live Receipt
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">Updates in real-time</div>
                </div>
              </div>
            </div>

            <div className="bg-[#F9FAFB] p-4 space-y-1">
              <button
                onClick={() => setAdoptionExpanded(!adoptionExpanded)}
                className="flex items-center justify-between w-full text-left"
                data-testid="toggle-adoption-section"
              >
                <span className="text-xs font-bold text-neutral-700 uppercase tracking-wide">Adoption Inputs</span>
                <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${adoptionExpanded ? "" : "-rotate-90"}`} />
              </button>
              
              {adoptionExpanded && (
                <div className="space-y-2 pt-2 animate-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-neutral-600">Providers</span>
                    <span className={`text-sm font-semibold text-neutral-900 tabular-nums ${getHighlightClass("providers")}`}>
                      {providers > 0 ? formatNumber(providers) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-neutral-600">Annual encounters</span>
                    <span className={`text-sm font-semibold text-neutral-900 tabular-nums ${getHighlightClass("annualEncounters")}`}>
                      {annualEncounters > 0 ? formatNumber(annualEncounters) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-neutral-600">Utilization</span>
                    <span className={`text-sm font-semibold text-neutral-900 tabular-nums ${getHighlightClass("utilizationPercent")}`}>
                      {utilizationPercent !== null ? `${utilizationPercent}%` : "—"}
                    </span>
                  </div>
                  <div className="border-t border-neutral-200 pt-2 mt-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-neutral-600">Eligible encounters</span>
                        <div className="group relative">
                          <Info className="w-3 h-3 text-neutral-400 cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            {formatNumber(annualEncounters)} × {utilizationPercent || 0}%
                          </div>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold text-neutral-900 tabular-nums ${getHighlightClass("eligibleEncounters")}`}>
                        {eligibleEncounters !== null ? formatNumber(eligibleEncounters) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-neutral-200 pt-3 mt-3">
                <button
                  onClick={() => setTimeExpanded(!timeExpanded)}
                  className="flex items-center justify-between w-full text-left"
                  data-testid="toggle-time-section"
                >
                  <span className="text-xs font-bold text-neutral-700 uppercase tracking-wide">Time Savings</span>
                  <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${timeExpanded ? "" : "-rotate-90"}`} />
                </button>
                
                {timeExpanded && (
                  <div className="space-y-2 pt-2 animate-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-neutral-600">Minutes saved / encounter</span>
                      <span className={`text-sm font-semibold text-neutral-900 tabular-nums ${getHighlightClass("minutesSaved")}`}>
                        {minutesSaved !== null ? `${minutesSaved} min` : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-neutral-600">Hours returned (gross)</span>
                      <span className={`text-sm font-semibold text-neutral-900 tabular-nums ${getHighlightClass("totalHoursSaved")}`}>
                        {totalHoursSaved !== null ? formatNumber(totalHoursSaved, 0) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-neutral-600">Hours usable (net)</span>
                        <div className="group relative">
                          <Info className="w-3 h-3 text-neutral-400 cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            After {realizationRate || 20}% realization factor
                          </div>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold text-neutral-900 tabular-nums ${getHighlightClass("realizedHoursSaved")}`}>
                        {realizedHoursSaved !== null ? formatNumber(realizedHoursSaved, 0) : "—"}
                      </span>
                    </div>
                    {currentPosture && (
                      <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-200 mt-2">
                        <span className="text-sm text-neutral-600">Posture</span>
                        <span className="text-sm font-semibold text-neutral-900 capitalize">
                          {postureLabelMap[currentPosture] || currentPosture}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {hasDrivers && (
              <div className="p-4 border-t border-neutral-100">
                <button
                  onClick={() => setDriversExpanded(!driversExpanded)}
                  className="flex items-center justify-between w-full text-left mb-3"
                  data-testid="toggle-drivers-section"
                >
                  <span className="text-xs font-bold text-neutral-700 uppercase tracking-wide">Your Value Drivers</span>
                  <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${driversExpanded ? "" : "-rotate-90"}`} />
                </button>
                
                {driversExpanded && (
                  <div className="space-y-3 animate-in slide-in-from-top-1 duration-200">
                    {selectedDrivers.map((leverId) => {
                      const value = currentDriverValues[leverId] || 0;
                      const label = DRIVER_LABELS[leverId] || leverId;
                      
                      let subCalc = "";
                      if (leverId === "patientAccess") {
                        subCalc = `${formatNumber(newVisits)} new visits × $${ftPatientAccessRevenuePerVisit}/visit`;
                      } else if (leverId === "wrvu") {
                        subCalc = `${formatNumber(additionalWrvus)} wRVUs × $${ftWrvuRevenuePerUnit}/wRVU`;
                      } else if (leverId === "workforce") {
                        const departures = (providers * 0.05 * 0.4 * 0.4).toFixed(1);
                        subCalc = `${departures} departures avoided × $${formatNumber(ftRetentionReplacementCost / 1000)}k`;
                      } else if (leverId === "hccCapture" || leverId === "hcc") {
                        subCalc = `RAF improvement × MA patients × $${ftHccBenchmarkPmpm} PMPM`;
                      } else if (leverId === "denialReduction" || leverId === "denials") {
                        subCalc = `Doc-related denials prevented`;
                      } else if (leverId === "overtime") {
                        subCalc = `After-hours documentation reduction`;
                      }
                      
                      return (
                        <div key={leverId} data-testid={`receipt-driver-${leverId}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-neutral-800">{label}</span>
                            <span className="text-base font-semibold text-[#F03319] tabular-nums">
                              {formatCurrency(value)}
                            </span>
                          </div>
                          {subCalc && (
                            <div className="text-xs text-neutral-500 mt-0.5 pl-0">
                              {subCalc}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {hasInvestment && modelSetupStep >= 3 && (
              <div className="p-4 border-t border-neutral-100 bg-[#F9FAFB]">
                <button
                  onClick={() => setInvestmentExpanded(!investmentExpanded)}
                  className="flex items-center justify-between w-full text-left mb-3"
                  data-testid="toggle-investment-section"
                >
                  <span className="text-xs font-bold text-neutral-700 uppercase tracking-wide">Investment</span>
                  <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${investmentExpanded ? "" : "-rotate-90"}`} />
                </button>
                
                {investmentExpanded && (
                  <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
                    {implementationEnabled && implementationFee !== null && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-neutral-600">Implementation fee</span>
                        <span className="text-sm font-semibold text-neutral-900 tabular-nums">
                          {formatCurrency(implementationFee)}
                        </span>
                      </div>
                    )}
                    {annualSubscriptionCost !== null && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-neutral-600">Annual subscription</span>
                        <span className="text-sm font-semibold text-neutral-900 tabular-nums">
                          {formatCurrency(annualSubscriptionCost)}
                        </span>
                      </div>
                    )}
                    {year1TotalCost !== null && (
                      <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-200">
                        <span className="text-sm text-neutral-600">Year 1 total</span>
                        <span className="text-sm font-bold text-neutral-900 tabular-nums">
                          {formatCurrency(year1TotalCost)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="p-5 bg-[#FFF1EB] border-t-2 border-neutral-200">
              <div className="text-xs font-semibold tracking-wide text-neutral-500 uppercase mb-3">
                Projected Annual Value
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-700">Total Benefit</span>
                  <span className={`text-base font-semibold text-[#F03319] tabular-nums ${getHighlightClass("totalProjectedValue")}`}>
                    {formatCurrency(totalProjectedValue)}
                  </span>
                </div>
                
                {annualSubscriptionCost !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-700">Investment</span>
                    <span className="text-base font-semibold text-red-600 tabular-nums">
                      -{formatCurrency(annualSubscriptionCost)}
                    </span>
                  </div>
                )}
                
                <div className="border-t border-neutral-300 pt-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-neutral-900">Net Annual Gain</span>
                    <span className={`text-xl font-bold text-[#F03319] tabular-nums receipt-major-value ${getHighlightClass("netAnnualGain")}`}>
                      {formatCurrency(netAnnualGain)}
                    </span>
                  </div>
                </div>
              </div>
              
              {threeYearBenefit !== null && contractYears !== null && contractYears > 1 && (
                <div className="mt-4 pt-4 border-t border-[#F03319]/20">
                  <div className="text-xs text-neutral-500 mb-2">{contractYears}-Year View</div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-600">Total Value</span>
                      <span className="text-sm font-semibold text-neutral-800 tabular-nums">
                        {formatCurrency(threeYearBenefit)}
                      </span>
                    </div>
                    {lifetimeSubscription !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-600">Total Investment</span>
                        <span className="text-sm font-semibold text-neutral-800 tabular-nums">
                          {formatCurrency(lifetimeSubscription)}
                        </span>
                      </div>
                    )}
                    {threeYearNetGain !== null && (
                      <div className="flex items-center justify-between pt-1 border-t border-[#F03319]/20">
                        <span className="text-xs font-medium text-neutral-700">Net {contractYears}-Year Gain</span>
                        <span className="text-sm font-bold text-[#F03319] tabular-nums">
                          {formatCurrency(threeYearNetGain)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {annualSubscriptionCost !== null && annualSubscriptionCost > 0 && (
                <div className="mt-4 pt-3 border-t border-[#F03319]/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-neutral-900">Return on Investment</span>
                    <span className="text-xl font-bold text-neutral-900 tabular-nums">
                      {roiMultiple.toFixed(1)}x
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-100">
              <p className="text-xs text-neutral-500">
                Tip: If a number looks high, view the ROI Model and click the Detailed Breakdown.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        {!mobileExpanded ? (
          <button
            onClick={() => setMobileExpanded(true)}
            className="w-full bg-white border-t border-neutral-200 shadow-lg px-4 py-3 flex items-center justify-between"
            data-testid="mobile-receipt-collapsed"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-neutral-900">Net Annual Gain:</span>
              <span className="text-lg font-bold text-[#F03319] tabular-nums">
                {formatCurrency(netAnnualGain)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {roiMultiple > 0 && (
                <span className="text-sm font-semibold text-neutral-700 tabular-nums">{roiMultiple.toFixed(1)}x ROI</span>
              )}
              <ChevronUp className="w-5 h-5 text-neutral-400" />
            </div>
          </button>
        ) : (
          <div 
            className="bg-white border-t border-neutral-200 shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            data-testid="mobile-receipt-expanded"
          >
            <div className="sticky top-0 bg-white border-b border-neutral-100 px-4 py-3 flex items-center justify-between z-10">
              <div className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                Live Receipt
              </div>
              <button
                onClick={() => setMobileExpanded(false)}
                className="p-1 hover:bg-neutral-100 rounded-full"
                data-testid="close-mobile-receipt"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="bg-[#F9FAFB] rounded-lg p-3 mb-4">
                <div className="text-xs font-bold text-neutral-700 uppercase tracking-wide mb-2">Adoption</div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Providers</span>
                    <span className="font-semibold tabular-nums">{providers > 0 ? formatNumber(providers) : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Annual encounters</span>
                    <span className="font-semibold tabular-nums">{annualEncounters > 0 ? formatNumber(annualEncounters) : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Utilization</span>
                    <span className="font-semibold tabular-nums">{utilizationPercent !== null ? `${utilizationPercent}%` : "—"}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-neutral-200">
                    <span className="text-neutral-600">Eligible encounters</span>
                    <span className="font-semibold tabular-nums">{eligibleEncounters !== null ? formatNumber(eligibleEncounters) : "—"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#F9FAFB] rounded-lg p-3 mb-4">
                <div className="text-xs font-bold text-neutral-700 uppercase tracking-wide mb-2">Time Savings</div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Minutes saved</span>
                    <span className="font-semibold tabular-nums">{minutesSaved !== null ? `${minutesSaved} min` : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Hours returned</span>
                    <span className="font-semibold tabular-nums">{totalHoursSaved !== null ? formatNumber(totalHoursSaved, 0) : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Hours usable</span>
                    <span className="font-semibold tabular-nums">{realizedHoursSaved !== null ? formatNumber(realizedHoursSaved, 0) : "—"}</span>
                  </div>
                </div>
              </div>

              {hasDrivers && (
                <div className="mb-4">
                  <div className="text-xs font-bold text-neutral-700 uppercase tracking-wide mb-2">Value Drivers</div>
                  <div className="space-y-2">
                    {selectedDrivers.map((leverId) => {
                      const value = currentDriverValues[leverId] || 0;
                      const label = DRIVER_LABELS[leverId] || leverId;
                      return (
                        <div key={leverId} className="flex justify-between items-center">
                          <span className="text-sm text-neutral-700">{label}</span>
                          <span className="text-sm font-semibold text-[#F03319] tabular-nums">
                            {formatCurrency(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-[#FFF1EB] rounded-lg p-4 border border-[#F03319]/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-neutral-700">Total Benefit</span>
                  <span className="text-base font-semibold text-[#F03319] tabular-nums">
                    {formatCurrency(totalProjectedValue)}
                  </span>
                </div>
                {annualSubscriptionCost !== null && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-neutral-700">Investment</span>
                    <span className="text-base font-semibold text-red-600 tabular-nums">
                      -{formatCurrency(annualSubscriptionCost)}
                    </span>
                  </div>
                )}
                <div className="border-t border-[#F03319]/20 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-neutral-900">Net Annual Gain</span>
                    <span className="text-xl font-bold text-[#F03319] tabular-nums">
                      {formatCurrency(netAnnualGain)}
                    </span>
                  </div>
                </div>
                {roiMultiple > 0 && (
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-[#F03319]/20">
                    <span className="text-sm font-bold text-neutral-900">ROI</span>
                    <span className="text-lg font-bold text-neutral-900 tabular-nums">{roiMultiple.toFixed(1)}x</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
