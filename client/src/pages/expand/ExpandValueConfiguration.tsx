import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, DollarSign, Clock, Heart, AlertTriangle, Info, CheckCircle, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { Slider } from "@/components/ui/slider";
import { TermTooltip, TERMS } from "@/components/TermTooltip";
import {
  type DeploymentData,
  type MetricsData,
  type MetricType,
} from "./ExpandFlow";
import {
  type ValueConfigData,
  calculateTieredROI,
  formatCurrency,
  EXPAND_ROI_DEFAULTS,
  type CalculationInputs,
} from "@/lib/expandRoiCalculator";

interface ExpandValueConfigurationProps {
  deploymentData: DeploymentData;
  selectedMetrics: MetricType[];
  metricsData: MetricsData;
  valueConfig: ValueConfigData;
  setValueConfig: (config: ValueConfigData) => void;
  onNext: () => void;
  onBack: () => void;
  onBackToJourney?: () => void;
}

export default function ExpandValueConfiguration({
  deploymentData,
  selectedMetrics,
  metricsData,
  valueConfig,
  setValueConfig,
  onNext,
  onBack,
  onBackToJourney,
}: ExpandValueConfigurationProps) {
  const providers = deploymentData.providers || 50;
  const encounters = deploymentData.annualEncounters || 65000;
  const utilizationRate = deploymentData.utilizationRate || 70;
  const months = deploymentData.monthsOnAbridge || 6;
  
  const wrvuBefore = metricsData.wrvuCapture.before;
  const wrvuAfter = metricsData.wrvuCapture.after;
  const wrvuLift = wrvuBefore && wrvuAfter ? Math.max(0, wrvuAfter - wrvuBefore) : 0;
  
  // Eligible encounters = total encounters × utilization rate
  const eligibleEncounters = Math.round(encounters * (utilizationRate / 100));
  
  const timeBefore = metricsData.timeSavings.before;
  const timeAfter = metricsData.timeSavings.after;
  const minutesSaved = timeBefore && timeAfter ? Math.max(0, timeBefore - timeAfter) : 0;
  const totalHoursSaved = Math.round((minutesSaved * eligibleEncounters) / 60);
  
  const wowBefore = metricsData.workOutsideWork.before;
  const wowAfter = metricsData.workOutsideWork.after;
  const pajamaTimeWeekly = wowBefore && wowAfter ? Math.max(0, wowBefore - wowAfter) : 0;
  
  const satBefore = metricsData.clinicianSatisfaction.before;
  const satAfter = metricsData.clinicianSatisfaction.after;
  const satImprovement = satBefore && satAfter ? Math.max(0, satAfter - satBefore) : 0;

  const inputs: CalculationInputs = useMemo(() => ({
    providers,
    encounters,
    utilizationRate,
    monthsOnAbridge: months,
    wrvuBefore,
    wrvuAfter,
    timeSavingsBefore: timeBefore,
    timeSavingsAfter: timeAfter,
    workOutsideWorkBefore: wowBefore,
    workOutsideWorkAfter: wowAfter,
    chartClosureBefore: metricsData.chartClosure.sameDayBefore ?? metricsData.chartClosure.before.within24,
    chartClosureAfter: metricsData.chartClosure.sameDayAfter ?? metricsData.chartClosure.after.within24,
    satisfactionBefore: satBefore,
    satisfactionAfter: satAfter,
    valueConfig,
  }), [providers, encounters, utilizationRate, months, wrvuBefore, wrvuAfter, timeBefore, timeAfter, wowBefore, wowAfter, satBefore, satAfter, valueConfig, metricsData.chartClosure]);

  const roiResult = useMemo(() => calculateTieredROI(inputs), [inputs]);
  
  const wrvuValue = roiResult.calculations.wrvu.annualValue;
  const hoursConverted = roiResult.calculations.timeEfficiency.patientAccess.hoursConverted;
  const additionalVisits = roiResult.calculations.timeEfficiency.patientAccess.additionalVisits;
  const patientAccessValue = roiResult.calculations.timeEfficiency.patientAccess.annualValue;
  const retentionValue = roiResult.calculations.retention.annualValue;

  return (
    <div className="min-h-screen bg-[#f8fafc]" data-testid="expand-value-configuration">
      <UnifiedHeader 
        pathType="expand"
        currentStep={4}
        totalSteps={5}
        stepName="Value Config"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />
      
      <div className="py-6 md:py-8 px-6 pb-8 max-w-4xl mx-auto">
        <div className="text-center mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#1F2937] mb-2">
            How Are You Capturing Value?
          </h1>
          <p className="text-[#6B7280] text-sm lg:text-lg px-2">
            Different organizations realize value in different ways. Tell us how yours works.
          </p>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <div className="flex-1 space-y-4 lg:space-y-6 order-2 lg:order-1">
            
            <div className="bg-white rounded-xl border border-neutral-200 p-4 lg:p-6">
              <div className="flex items-start gap-3 lg:gap-4 mb-4">
                <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base lg:text-lg font-semibold text-[#1F2937]">Core Financial Value</h3>
                    <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                      Direct Revenue
                    </span>
                  </div>
                  <p className="text-xs lg:text-sm text-[#6B7280] mt-1">
                    Better documentation = more accurate coding = measurable{" "}
                    <TermTooltip {...TERMS.wRVU} />{" "}
                    improvement
                  </p>
                </div>
              </div>
              
              {wrvuLift > 0 ? (
                <div className="bg-neutral-50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6B7280]">Your wRVU lift:</span>
                    <span className="font-semibold text-[#1F2937]">+{wrvuLift.toFixed(2)}/encounter</span>
                  </div>
                  
                  {/* What-if slider for attribution */}
                  <div className="border-t border-neutral-200 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm text-[#6B7280]">
                          <TermTooltip term="Attribution" short="Credit to Abridge" full="What percentage of the improvement is attributable to Abridge vs other factors? 50% is conservative, 60% is optimistic." />
                        </span>
                      </div>
                      <span className="font-semibold text-[#1F2937] w-12 text-right">
                        {Math.round(valueConfig.wrvuAttribution * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[valueConfig.wrvuAttribution * 100]}
                      onValueChange={(val) => setValueConfig({ 
                        ...valueConfig, 
                        wrvuAttribution: val[0] / 100 
                      })}
                      min={30}
                      max={70}
                      step={5}
                      className="w-full"
                      data-testid="slider-attribution"
                    />
                    <div className="flex justify-between text-xs text-neutral-400 mt-1">
                      <span>Conservative</span>
                      <span>Optimistic</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
                    <span className="text-sm text-[#6B7280]">Annual value:</span>
                    <span className="font-bold text-lg text-emerald-600">{formatCurrency(wrvuValue)}</span>
                  </div>
                  <div className="text-xs font-mono text-[#6B7280] bg-neutral-100 p-2 rounded">
                    +{wrvuLift.toFixed(2)} wRVU × {encounters.toLocaleString()} enc × {utilizationRate}% util × ${EXPAND_ROI_DEFAULTS.dollarPerWRVU}/wRVU × {Math.round(valueConfig.wrvuAttribution * 100)}% attribution
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-700">
                    <Info className="w-4 h-4" />
                    <span className="text-sm">No wRVU data entered. Add wRVU data to see revenue capture value.</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-white rounded-xl border border-neutral-200 p-4 lg:p-6">
              <div className="flex items-start gap-3 lg:gap-4 mb-4">
                <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base lg:text-lg font-semibold text-[#1F2937]">Operational Efficiency</h3>
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                      Time Savings
                    </span>
                  </div>
                  <p className="text-xs lg:text-sm text-[#6B7280] mt-1">
                    {totalHoursSaved > 0 
                      ? <>Saving {totalHoursSaved.toLocaleString()} hrs/year. How do you <TermTooltip {...TERMS.conversionRate} /> this?</>
                      : "Add time savings data to configure value conversion"
                    }
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 lg:space-y-3">
                <label 
                  className={`flex items-start gap-3 p-3 lg:p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    valueConfig.timeConversionMethod === "none"
                      ? "border-[#EA2C00] bg-red-50"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                  data-testid="option-time-none"
                >
                  <input
                    type="radio"
                    name="timeConversion"
                    checked={valueConfig.timeConversionMethod === "none"}
                    onChange={() => setValueConfig({ ...valueConfig, timeConversionMethod: "none" })}
                    className="mt-1 accent-[#EA2C00]"
                  />
                  <div>
                    <span className="font-medium text-sm lg:text-base text-[#1F2937]">Not converting to dollars yet</span>
                    <span className="text-xs lg:text-sm text-[#6B7280] block mt-0.5">
                      Show as hours saved, not $. Most conservative approach.
                    </span>
                  </div>
                </label>
                
                <label 
                  className={`flex items-start gap-3 p-3 lg:p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    valueConfig.timeConversionMethod === "patientAccess"
                      ? "border-[#EA2C00] bg-red-50"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                  data-testid="option-time-patientAccess"
                >
                  <input
                    type="radio"
                    name="timeConversion"
                    checked={valueConfig.timeConversionMethod === "patientAccess"}
                    onChange={() => setValueConfig({ ...valueConfig, timeConversionMethod: "patientAccess" })}
                    className="mt-1 accent-[#EA2C00]"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-sm lg:text-base text-[#1F2937]">Converting to additional patient visits</span>
                    <span className="text-xs lg:text-sm text-[#6B7280] block mt-0.5">
                      If providers are using saved time to see more patients
                    </span>
                    
                    {valueConfig.timeConversionMethod === "patientAccess" && totalHoursSaved > 0 && (
                      <div className="mt-4 space-y-4">
                        <div className="bg-neutral-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <SlidersHorizontal className="w-4 h-4 text-neutral-400" />
                              <label className="text-sm text-[#6B7280]">
                                What % of saved time converts to patient access?
                              </label>
                            </div>
                            <span className="font-semibold text-[#1F2937] w-12 text-right">
                              {valueConfig.conversionPercent}%
                            </span>
                          </div>
                          <Slider
                            value={[valueConfig.conversionPercent]}
                            onValueChange={(val) => setValueConfig({ 
                              ...valueConfig, 
                              conversionPercent: val[0] 
                            })}
                            min={5}
                            max={30}
                            step={5}
                            className="w-full"
                            data-testid="slider-conversion-percent"
                          />
                          <div className="flex justify-between text-xs text-neutral-400 mt-1">
                            <span>5% (minimal)</span>
                            <span>30% (ambitious)</span>
                          </div>
                        </div>
                        
                        <div className="bg-neutral-50 rounded-lg p-3 space-y-1">
                          <div className="text-sm text-[#6B7280]">
                            {totalHoursSaved.toLocaleString()} hours x {valueConfig.conversionPercent}% = {hoursConverted.toLocaleString()} hours
                          </div>
                          <div className="text-sm text-[#6B7280]">
                            = {additionalVisits.toLocaleString()} additional visits
                          </div>
                          <div className="text-sm text-[#6B7280]">
                            x ${EXPAND_ROI_DEFAULTS.revenuePerVisit}/visit x 50% realizability
                          </div>
                          <div className="font-semibold text-emerald-600 pt-1">
                            = {formatCurrency(patientAccessValue)}
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-2 text-amber-600 text-sm bg-amber-50 p-2 rounded-lg">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>Requires scheduling capacity and patient demand to realize</span>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
                
                <label 
                  className={`flex items-start gap-3 p-3 lg:p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    valueConfig.timeConversionMethod === "overtime"
                      ? "border-[#EA2C00] bg-red-50"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                  data-testid="option-time-overtime"
                >
                  <input
                    type="radio"
                    name="timeConversion"
                    checked={valueConfig.timeConversionMethod === "overtime"}
                    onChange={() => setValueConfig({ ...valueConfig, timeConversionMethod: "overtime" })}
                    className="mt-1 accent-[#EA2C00]"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-sm lg:text-base text-[#1F2937]">Reducing overtime/locum costs</span>
                    <span className="text-xs lg:text-sm text-[#6B7280] block mt-0.5">
                      If you're seeing reduced OT or locum spend
                    </span>
                    
                    {valueConfig.timeConversionMethod === "overtime" && (
                      <div className="mt-3 lg:mt-4">
                        <label className="text-xs lg:text-sm text-[#6B7280] block mb-2">
                          Estimated annual OT/locum reduction
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-[#6B7280]">$</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="e.g., 150000"
                            value={valueConfig.overtimeReduction || ""}
                            onChange={(e) => setValueConfig({ 
                              ...valueConfig, 
                              overtimeReduction: e.target.value ? parseInt(e.target.value) : null 
                            })}
                            className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EA2C00] focus:border-transparent text-sm"
                            data-testid="input-overtime-reduction"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-blue-600 text-xs lg:text-sm mt-2">
                          <Info className="w-4 h-4 flex-shrink-0" />
                          <span>Enter only if you have actual data</span>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-neutral-200 p-4 lg:p-6">
              <div className="flex items-start gap-3 lg:gap-4 mb-4">
                <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Heart className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base lg:text-lg font-semibold text-[#1F2937]">Strategic Indicators</h3>
                    <span className="px-2 py-0.5 text-xs font-medium bg-neutral-100 text-[#6B7280] rounded-full">
                      Qualitative
                    </span>
                  </div>
                  <p className="text-xs lg:text-sm text-[#6B7280] mt-1">
                    These improvements support retention but are harder to quantify
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 mb-4">
                {pajamaTimeWeekly > 0 && (
                  <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <span className="text-sm text-[#6B7280]">Pajama Time Eliminated</span>
                    <span className="font-medium text-[#1F2937]">-{pajamaTimeWeekly} hrs/week</span>
                  </div>
                )}
                {satImprovement > 0 && (
                  <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                    <span className="text-sm text-[#6B7280]">Satisfaction Improvement</span>
                    <span className="font-medium text-[#1F2937]">+{satImprovement.toFixed(1)} points</span>
                  </div>
                )}
              </div>
              
              <label className="flex items-center gap-3 cursor-pointer" data-testid="checkbox-retention">
                <input
                  type="checkbox"
                  checked={valueConfig.estimateRetention}
                  onChange={(e) => setValueConfig({ ...valueConfig, estimateRetention: e.target.checked })}
                  className="w-4 h-4 accent-[#EA2C00] rounded"
                />
                <span className="text-sm text-[#1F2937]">Estimate potential retention value (speculative)</span>
              </label>
              
              {valueConfig.estimateRetention && (
                <div className="mt-4 p-4 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-[#6B7280] mb-3">
                    Based on satisfaction improvement, estimate departures prevented:
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="5"
                      value={valueConfig.departuresPrevented}
                      onChange={(e) => setValueConfig({ 
                        ...valueConfig, 
                        departuresPrevented: Math.min(5, Math.max(0, parseInt(e.target.value) || 0))
                      })}
                      className="w-20 px-3 py-2 border border-neutral-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-[#EA2C00] focus:border-transparent"
                      data-testid="input-departures-prevented"
                    />
                    <span className="text-sm text-[#6B7280]">
                      departures prevented x ${EXPAND_ROI_DEFAULTS.replacementCost.toLocaleString()} = 
                      <span className="font-semibold text-emerald-600 ml-1">
                        {formatCurrency(retentionValue)}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-amber-600 text-sm mt-3">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>This is speculative. Retention impact typically takes 12-18 months to measure.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="w-full lg:w-80 flex-shrink-0 order-1 lg:order-2">
            <div className="lg:sticky lg:top-24 bg-white rounded-xl border border-neutral-200 p-4 lg:p-6">
              <h3 className="font-semibold text-[#1F2937] mb-3 lg:mb-4">Your Value Summary</h3>
              
              <div className="space-y-3 mb-4">
                {wrvuValue > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6B7280]">Revenue Capture (wRVU)</span>
                    <span className="font-medium text-[#1F2937]">{formatCurrency(wrvuValue)}</span>
                  </div>
                )}
                
                {valueConfig.timeConversionMethod === "patientAccess" && patientAccessValue > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6B7280]">Patient Access ({valueConfig.conversionPercent}%)</span>
                    <span className="font-medium text-[#1F2937]">{formatCurrency(patientAccessValue)}</span>
                  </div>
                )}
                
                {valueConfig.timeConversionMethod === "overtime" && (valueConfig.overtimeReduction || 0) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6B7280]">Overtime Reduction</span>
                    <span className="font-medium text-[#1F2937]">{formatCurrency(valueConfig.overtimeReduction || 0)}</span>
                  </div>
                )}
                
                {valueConfig.estimateRetention && retentionValue > 0 && (
                  <div className="flex items-center justify-between text-[#9CA3AF]">
                    <span className="text-sm">Retention (speculative)</span>
                    <span className="font-medium">{formatCurrency(retentionValue)}</span>
                  </div>
                )}
              </div>
              
              <div className="border-t border-neutral-200 pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#1F2937]">Annual Value Created</span>
                  <span className="font-bold text-2xl text-emerald-600">{formatCurrency(roiResult.tier1HardValue)}</span>
                </div>
                <p className="text-xs text-[#9CA3AF] mt-2">
                  This is the defensible annual value based on your metrics and how you're converting that value.
                </p>
              </div>
              
              {roiResult.warnings.length > 0 && (
                <div className="mt-4 space-y-2">
                  {roiResult.warnings.map((warning, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-start gap-2 p-3 rounded-lg ${
                        warning.severity === "info" 
                          ? "bg-blue-50 text-blue-700" 
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {warning.severity === "info" ? (
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <span className="text-sm font-medium block">{warning.title}</span>
                        <span className="text-xs">{warning.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-center mt-8">
          <Button
            onClick={onNext}
            className="bg-[#EA2C00] hover:bg-[#d12700] text-white px-8 py-3 text-lg rounded-lg"
            data-testid="button-continue"
          >
            See Your Results
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
