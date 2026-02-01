import { ArrowRight, BarChart3, Building2, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
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

export default function ExploreDocDrivers({ state, updateState, totalHoursSaved, onNext, onBack, onHome }: ExploreDocDriversProps) {
  
  const eligibleEncounters = state.annualEncounters * (state.utilizationPercent / 100);
  
  const calculateWrvuValue = () => {
    const baseWrvu = 1.5;
    const wrvuLift = baseWrvu * (state.wrvuPctIncrease / 100);
    return Math.round(wrvuLift * eligibleEncounters * WRVU_CONVERSION);
  };

  const calculateHccValue = () => {
    const avgConditionsPerMember = 3;
    const maPatients = eligibleEncounters * 0.3;
    const conditionsCaptured = maPatients * avgConditionsPerMember * (state.hccPctRecaptured / 100);
    return Math.round(conditionsCaptured * HCC_VALUE_PER_CONDITION);
  };

  const calculateDenialValue = () => {
    const baselineDenialRate = 0.08;
    const denials = eligibleEncounters * baselineDenialRate;
    const denialsFromDoc = denials * 0.5;
    const denialsRecovered = denialsFromDoc * (state.denialsPctReduced / 100);
    return Math.round(denialsRecovered * DENIAL_AVG_VALUE);
  };

  const getValueForFocus = () => {
    switch (state.docPathFocus) {
      case 'wrvu':
        return calculateWrvuValue();
      case 'hcc':
        return calculateHccValue();
      case 'denials':
        return calculateDenialValue();
      default:
        return 0;
    }
  };

  const calculateTimeValue = () => {
    const patientAccessHours = totalHoursSaved * (state.timeAllocation.patientAccess / 100);
    const visitsEnabled = patientAccessHours / 0.5;
    const patientAccessValue = visitsEnabled * 200;

    const locumHours = totalHoursSaved * (state.timeAllocation.reducingLocums / 100);
    const locumValue = locumHours * 150;

    const wellbeingPct = state.timeAllocation.clinicianWellbeing / 100;
    const retentionValue = state.numberOfProviders * 0.15 * wellbeingPct * 0.2 * 250000;

    return Math.round(patientAccessValue + locumValue + retentionValue);
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
  const docValue = getValueForFocus();
  const timeValue = calculateTimeValue();
  const totalValue = docValue + timeValue;

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
            <motion.div
              className="bg-white rounded-2xl border border-slate-200 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
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
                    <span className="text-2xl font-bold text-black">{focusConfig.value}{focusConfig.suffix}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Conservative ({focusConfig.min}{focusConfig.suffix})</span>
                  <span>Aggressive ({focusConfig.max}{focusConfig.suffix})</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Projected annual value</span>
                  <span className="text-xl font-bold text-[#EA2C00]">${docValue.toLocaleString()}</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="bg-slate-50 rounded-2xl p-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-slate-600" />
                </div>
                <h3 className="font-semibold text-slate-700">Time Savings Value</h3>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Patient Access</p>
                  <p className="text-lg font-bold text-black">{state.timeAllocation.patientAccess}%</p>
                </div>
                <div className="bg-white rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Locums Reduction</p>
                  <p className="text-lg font-bold text-black">{state.timeAllocation.reducingLocums}%</p>
                </div>
                <div className="bg-white rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Wellbeing</p>
                  <p className="text-lg font-bold text-black">{state.timeAllocation.clinicianWellbeing}%</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Time savings value</span>
                  <span className="text-lg font-bold text-black">${timeValue.toLocaleString()}</span>
                </div>
              </div>
            </motion.div>
          </div>

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
                  <span className="font-semibold">${timeValue.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-white/70">{focusConfig.label}</span>
                  <span className="font-semibold">${docValue.toLocaleString()}</span>
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
                  This estimate uses industry benchmarks. Investment costs will be added in the next step.
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
