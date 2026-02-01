import { useState } from "react";
import { ArrowRight, BarChart3, Building2, AlertTriangle, TrendingUp, DollarSign, Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type ExploreState } from "./ExploreFlow";

interface ExploreDocDriversProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  totalHoursSaved: number;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

const WRVU_CONVERSION = 40;
const HCC_VALUE_PER_CONDITION = 800;
const DENIAL_AVG_VALUE = 250;

const REALIZATION_RATES = {
  patientAccess: 0.35,
  reducingLocums: 0.60,
  clinicianWellbeing: 0.20,
  wrvu: 0.75,
  hcc: 0.60,
  denials: 0.70,
};

export default function ExploreDocDrivers({ state, updateState, totalHoursSaved, onNext, onBack, onHome }: ExploreDocDriversProps) {
  const [showDocMath, setShowDocMath] = useState(false);
  const [showTimeMath, setShowTimeMath] = useState(false);

  const eligibleEncounters = Math.round(state.annualEncounters * (state.utilizationPercent / 100));
  
  const calculateWrvuValue = () => {
    const baseWrvu = 1.5;
    const wrvuLift = baseWrvu * (state.wrvuPctIncrease / 100);
    const grossValue = wrvuLift * eligibleEncounters * WRVU_CONVERSION;
    const realizedValue = grossValue * REALIZATION_RATES.wrvu;
    return {
      value: Math.round(realizedValue),
      steps: [
        { label: 'Eligible encounters', value: eligibleEncounters.toLocaleString(), unit: 'visits' },
        { label: 'Base wRVU per visit', value: baseWrvu.toString(), unit: 'wRVU' },
        { label: 'Your improvement target', value: `${state.wrvuPctIncrease}%`, unit: '' },
        { label: 'wRVU lift per visit', value: wrvuLift.toFixed(3), unit: 'wRVU' },
        { label: 'Total additional wRVUs', value: Math.round(wrvuLift * eligibleEncounters).toLocaleString(), unit: 'wRVU' },
        { label: 'Conversion rate', value: `$${WRVU_CONVERSION}`, unit: '/wRVU' },
        { label: 'Gross value', value: `$${Math.round(grossValue).toLocaleString()}`, unit: '' },
        { label: 'Realization rate', value: `${Math.round(REALIZATION_RATES.wrvu * 100)}%`, unit: '', highlight: true, explanation: 'Accounts for payer mix, fee schedule variations, and coding accuracy' },
        { label: 'Net annual value', value: `$${Math.round(realizedValue).toLocaleString()}`, unit: '', isFinal: true },
      ],
    };
  };

  const calculateHccValue = () => {
    const avgConditionsPerMember = 3;
    const maPatientPct = 0.3;
    const maPatients = eligibleEncounters * maPatientPct;
    const conditionsCaptured = maPatients * avgConditionsPerMember * (state.hccPctRecaptured / 100);
    const grossValue = conditionsCaptured * HCC_VALUE_PER_CONDITION;
    const realizedValue = grossValue * REALIZATION_RATES.hcc;
    return {
      value: Math.round(realizedValue),
      steps: [
        { label: 'Eligible encounters', value: eligibleEncounters.toLocaleString(), unit: 'visits' },
        { label: 'Medicare Advantage patients', value: `${Math.round(maPatientPct * 100)}%`, unit: '' },
        { label: 'MA patient encounters', value: Math.round(maPatients).toLocaleString(), unit: 'visits' },
        { label: 'Avg conditions per member', value: avgConditionsPerMember.toString(), unit: 'HCCs' },
        { label: 'Your recapture target', value: `${state.hccPctRecaptured}%`, unit: '' },
        { label: 'Conditions recaptured', value: Math.round(conditionsCaptured).toLocaleString(), unit: 'HCCs' },
        { label: 'Value per HCC', value: `$${HCC_VALUE_PER_CONDITION}`, unit: '' },
        { label: 'Gross value', value: `$${Math.round(grossValue).toLocaleString()}`, unit: '' },
        { label: 'Realization rate', value: `${Math.round(REALIZATION_RATES.hcc * 100)}%`, unit: '', highlight: true, explanation: 'Accounts for RAF score adjustments, RADV audits, and payment timing' },
        { label: 'Net annual value', value: `$${Math.round(realizedValue).toLocaleString()}`, unit: '', isFinal: true },
      ],
    };
  };

  const calculateDenialValue = () => {
    const baselineDenialRate = 0.08;
    const docRelatedPct = 0.5;
    const denials = eligibleEncounters * baselineDenialRate;
    const denialsFromDoc = denials * docRelatedPct;
    const denialsRecovered = denialsFromDoc * (state.denialsPctReduced / 100);
    const grossValue = denialsRecovered * DENIAL_AVG_VALUE;
    const realizedValue = grossValue * REALIZATION_RATES.denials;
    return {
      value: Math.round(realizedValue),
      steps: [
        { label: 'Eligible encounters', value: eligibleEncounters.toLocaleString(), unit: 'visits' },
        { label: 'Baseline denial rate', value: `${Math.round(baselineDenialRate * 100)}%`, unit: '' },
        { label: 'Total denials', value: Math.round(denials).toLocaleString(), unit: 'claims' },
        { label: 'Documentation-related', value: `${Math.round(docRelatedPct * 100)}%`, unit: '' },
        { label: 'Doc-related denials', value: Math.round(denialsFromDoc).toLocaleString(), unit: 'claims' },
        { label: 'Your reduction target', value: `${state.denialsPctReduced}%`, unit: '' },
        { label: 'Denials prevented', value: Math.round(denialsRecovered).toLocaleString(), unit: 'claims' },
        { label: 'Avg denial value', value: `$${DENIAL_AVG_VALUE}`, unit: '' },
        { label: 'Gross value', value: `$${Math.round(grossValue).toLocaleString()}`, unit: '' },
        { label: 'Realization rate', value: `${Math.round(REALIZATION_RATES.denials * 100)}%`, unit: '', highlight: true, explanation: 'Accounts for appeals success rate and collection timing' },
        { label: 'Net annual value', value: `$${Math.round(realizedValue).toLocaleString()}`, unit: '', isFinal: true },
      ],
    };
  };

  const getDocValueCalc = () => {
    switch (state.docPathFocus) {
      case 'wrvu': return calculateWrvuValue();
      case 'hcc': return calculateHccValue();
      case 'denials': return calculateDenialValue();
      default: return { value: 0, steps: [] };
    }
  };

  const calculateTimeValue = () => {
    const patientAccessHours = totalHoursSaved * (state.timeAllocation.patientAccess / 100);
    const patientAccessGross = (patientAccessHours / 0.5) * 200;
    const patientAccessValue = patientAccessGross * REALIZATION_RATES.patientAccess;

    const locumHours = totalHoursSaved * (state.timeAllocation.reducingLocums / 100);
    const locumGross = locumHours * 150;
    const locumValue = locumGross * REALIZATION_RATES.reducingLocums;

    const wellbeingPct = state.timeAllocation.clinicianWellbeing / 100;
    const wellbeingGross = state.numberOfProviders * 0.15 * wellbeingPct * 250000;
    const retentionValue = wellbeingGross * REALIZATION_RATES.clinicianWellbeing;

    return {
      value: Math.round(patientAccessValue + locumValue + retentionValue),
      patientAccess: Math.round(patientAccessValue),
      locums: Math.round(locumValue),
      wellbeing: Math.round(retentionValue),
      steps: [
        { label: 'Patient Access', value: `$${Math.round(patientAccessValue).toLocaleString()}`, sublabel: `${state.timeAllocation.patientAccess}% allocation × ${REALIZATION_RATES.patientAccess * 100}% realization` },
        ...(state.timeAllocation.reducingLocums > 0 ? [{ label: 'Locum Reduction', value: `$${Math.round(locumValue).toLocaleString()}`, sublabel: `${state.timeAllocation.reducingLocums}% allocation × ${REALIZATION_RATES.reducingLocums * 100}% realization` }] : []),
        { label: 'Clinician Wellbeing', value: `$${Math.round(retentionValue).toLocaleString()}`, sublabel: `${state.timeAllocation.clinicianWellbeing}% allocation × ${REALIZATION_RATES.clinicianWellbeing * 100}% realization` },
      ],
    };
  };

  const getFocusConfig = () => {
    switch (state.docPathFocus) {
      case 'wrvu':
        return {
          icon: BarChart3,
          label: 'wRVU Improvement',
          description: 'Percentage improvement in wRVU capture per encounter',
          value: state.wrvuPctIncrease,
          onChange: (v: number) => updateState({ wrvuPctIncrease: v }),
          min: 0.5,
          max: 5,
          step: 0.5,
          suffix: '%',
        };
      case 'hcc':
        return {
          icon: Building2,
          label: 'HCC Recapture Rate',
          description: 'Percentage of previously missed conditions now captured',
          value: state.hccPctRecaptured,
          onChange: (v: number) => updateState({ hccPctRecaptured: v }),
          min: 5,
          max: 30,
          step: 5,
          suffix: '%',
        };
      case 'denials':
        return {
          icon: AlertTriangle,
          label: 'Denial Reduction',
          description: 'Reduction in documentation-related claim denials',
          value: state.denialsPctReduced,
          onChange: (v: number) => updateState({ denialsPctReduced: v }),
          min: 10,
          max: 40,
          step: 5,
          suffix: '%',
        };
      default:
        return null;
    }
  };

  const focusConfig = getFocusConfig();
  const docCalc = getDocValueCalc();
  const timeCalc = calculateTimeValue();
  const totalValue = docCalc.value + timeCalc.value;

  if (!focusConfig) return null;

  const Icon = focusConfig.icon;

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={6}
        totalSteps={7}
        stepName="Configure Drivers"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-4">
            Fine-Tune Your Model
          </p>

          <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
            Adjust Your Assumptions
          </h1>

          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Configure the drivers to match your organization's expectations.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* Documentation Driver */}
            <motion.div
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#EA2C00]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-black">{focusConfig.label}</h2>
                    <p className="text-sm text-slate-500">{focusConfig.description}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={focusConfig.min}
                      max={focusConfig.max}
                      step={focusConfig.step}
                      value={focusConfig.value}
                      onChange={(e) => focusConfig.onChange(Number(e.target.value))}
                      className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-[#EA2C00]"
                      data-testid="slider-doc-driver"
                    />
                    <div className="w-20 text-right">
                      <span className="text-2xl font-bold text-[#EA2C00]">{focusConfig.value}{focusConfig.suffix}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Conservative ({focusConfig.min}{focusConfig.suffix})</span>
                    <span>Aggressive ({focusConfig.max}{focusConfig.suffix})</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-sm text-slate-500">Projected annual value</span>
                    <p className="text-xl font-bold text-[#EA2C00]">${docCalc.value.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => setShowDocMath(!showDocMath)}
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#EA2C00] transition-colors"
                    data-testid="button-expand-doc-math"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>See the math</span>
                    {showDocMath ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Expandable math breakdown */}
              <AnimatePresence>
                {showDocMath && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6">
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="flex items-center gap-2 mb-4">
                          <Calculator className="w-4 h-4 text-[#EA2C00]" />
                          <h4 className="text-sm font-bold text-black">Calculation Breakdown</h4>
                        </div>
                        
                        <div className="space-y-1">
                          {docCalc.steps.map((step, stepIndex) => (
                            <div key={stepIndex}>
                              <div 
                                className={`
                                  flex items-center justify-between py-2
                                  ${step.isFinal ? 'border-t-2 border-[#EA2C00]/20 pt-3 mt-2' : ''}
                                `}
                              >
                                <span className={`text-sm ${step.isFinal ? 'font-bold text-black' : step.highlight ? 'font-medium text-[#EA2C00]' : 'text-slate-600'}`}>
                                  {step.label}
                                </span>
                                <span className={`text-sm font-semibold ${step.isFinal ? 'text-[#EA2C00] text-lg' : step.highlight ? 'text-[#EA2C00]' : 'text-black'}`}>
                                  {step.value} {step.unit}
                                </span>
                              </div>
                              {step.explanation && (
                                <p className="text-xs text-slate-500 italic pl-2 pb-2 border-l-2 border-[#EA2C00]/20 ml-1">
                                  {step.explanation}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Time Savings Summary */}
            <motion.div
              className="bg-slate-50 rounded-2xl overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-slate-600" />
                    </div>
                    <h3 className="font-semibold text-slate-700">Time Savings Value</h3>
                  </div>
                  <button
                    onClick={() => setShowTimeMath(!showTimeMath)}
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#EA2C00] transition-colors"
                    data-testid="button-expand-time-math"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    {showTimeMath ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-1">Patient Access</p>
                    <p className="text-lg font-bold text-black">${timeCalc.patientAccess.toLocaleString()}</p>
                  </div>
                  {state.timeAllocation.reducingLocums > 0 && (
                    <div className="bg-white rounded-xl p-3">
                      <p className="text-xs text-slate-400 mb-1">Locums Reduction</p>
                      <p className="text-lg font-bold text-black">${timeCalc.locums.toLocaleString()}</p>
                    </div>
                  )}
                  <div className="bg-white rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-1">Wellbeing</p>
                    <p className="text-lg font-bold text-black">${timeCalc.wellbeing.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Time savings total</span>
                    <span className="text-lg font-bold text-black">${timeCalc.value.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Time math breakdown */}
              <AnimatePresence>
                {showTimeMath && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5">
                      <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <div className="space-y-3">
                          {timeCalc.steps.map((step, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-black">{step.label}</p>
                                <p className="text-xs text-slate-400">{step.sublabel}</p>
                              </div>
                              <span className="text-sm font-semibold text-black">{step.value}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                          All values include realization rates to provide conservative, defensible estimates.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Live Receipt */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <div className="bg-black rounded-2xl p-6 text-white sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Live Receipt</h2>
                  <p className="text-sm text-white/60">Your model so far</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-white/70">Time Savings</span>
                  <span className="font-semibold">${timeCalc.value.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-white/70">{focusConfig.label}</span>
                  <span className="font-semibold">${docCalc.value.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/20">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">Projected Annual Value</span>
                  <span className="text-3xl font-bold text-[#F07B5F]">${totalValue.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-white/5 rounded-xl">
                <p className="text-xs text-white/60">
                  All values include realization rates for conservative, defensible estimates. Investment costs will be added in the next step.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div 
          className="flex flex-col items-center mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <Button
            onClick={onNext}
            className="h-12 px-8 font-semibold rounded-full bg-black hover:bg-black/90 text-white"
            data-testid="button-continue"
          >
            Review Your Model
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
