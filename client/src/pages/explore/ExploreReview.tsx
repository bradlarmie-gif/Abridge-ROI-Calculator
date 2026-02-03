import { ArrowRight, Check, Users, Clock, BarChart3, Building2, AlertTriangle, DollarSign, Sparkles, FileText, TrendingUp, FileCheck, Stethoscope, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type ExploreState } from "./ExploreFlow";

interface ExploreReviewProps {
  state: ExploreState;
  totalHoursSaved: number;
  onContinueToInvestment: () => void;
  onBack: () => void;
  onHome: () => void;
}

const WRVU_CONVERSION = 40;
const WRVU_REALIZATION = 0.75;
const HCC_VALUE_PER_CONDITION = 800;
const HCC_REALIZATION = 0.60;
const DENIAL_AVG_VALUE = 250;
const DENIAL_REALIZATION = 0.70;

export default function ExploreReview({ state, totalHoursSaved, onContinueToInvestment, onBack, onHome }: ExploreReviewProps) {
  const isED = state.careSetting === 'ed';
  const isInpatient = state.careSetting === 'inpatient';
  const isNursing = state.careSetting === 'nursing';
  const eligibleEncounters = state.annualEncounters * (state.utilizationPercent / 100);
  
  const calculateWrvuValue = () => {
    if (!state.docDrivers.wrvu.enabled) return 0;
    const baseWrvu = 1.5;
    const wrvuLift = baseWrvu * (state.docDrivers.wrvu.value / 100);
    const rawValue = wrvuLift * eligibleEncounters * WRVU_CONVERSION;
    return Math.round(rawValue * WRVU_REALIZATION);
  };

  const calculateHccValue = () => {
    // HCC only applicable for Outpatient (not ED, Inpatient, or Nursing)
    if (isED || isInpatient || isNursing || !state.docDrivers.hcc.enabled) return 0;
    const avgConditionsPerMember = 3;
    const maPatients = eligibleEncounters * 0.3;
    const conditionsCaptured = maPatients * avgConditionsPerMember * (state.docDrivers.hcc.value / 100);
    const rawValue = conditionsCaptured * HCC_VALUE_PER_CONDITION;
    return Math.round(rawValue * HCC_REALIZATION);
  };

  const calculateDenialValue = () => {
    if (!state.docDrivers.denials.enabled) return 0;
    const baselineDenialRate = 0.08;
    const denials = eligibleEncounters * baselineDenialRate;
    const denialsFromDoc = denials * 0.5;
    const denialsRecovered = denialsFromDoc * (state.docDrivers.denials.value / 100);
    const rawValue = denialsRecovered * DENIAL_AVG_VALUE;
    return Math.round(rawValue * DENIAL_REALIZATION);
  };

  const wrvuValue = calculateWrvuValue();
  const hccValue = calculateHccValue();
  const denialValue = calculateDenialValue();
  const totalDocValue = wrvuValue + hccValue + denialValue;

  const calculateTimeValue = () => {
    const patientAccessHours = totalHoursSaved * (state.timeAllocation.patientAccess / 100);
    const visitsEnabled = patientAccessHours / 0.5;
    const patientAccessValue = visitsEnabled * 200 * 0.15; // 15% realization

    const locumHours = totalHoursSaved * (state.timeAllocation.reducingLocums / 100);
    const locumValue = locumHours * 150 * 0.60; // 60% realization

    // Simplified wellbeing calculation (no at-risk multiplier)
    // Annual departures = Providers × Turnover rate
    const annualDepartures = state.numberOfProviders * 0.08; // 8% baseline turnover
    
    // Get hours per provider annual to determine retention lift tier
    const wellbeingHours = totalHoursSaved * (state.timeAllocation.clinicianWellbeing / 100);
    const hoursPerProviderAnnual = wellbeingHours / Math.max(1, state.numberOfProviders);
    
    // Determine retention lift based on annual hours threshold
    let retentionLift = 0.04; // MINIMAL (3-5%)
    if (hoursPerProviderAnnual >= 200) retentionLift = 0.275; // MAXIMUM (25-30%)
    else if (hoursPerProviderAnnual >= 150) retentionLift = 0.175; // SIGNIFICANT (15-20%)
    else if (hoursPerProviderAnnual >= 100) retentionLift = 0.10; // MODERATE (8-12%)
    
    const providersRetained = annualDepartures * retentionLift;
    const retentionValue = providersRetained * 250000; // Replacement cost

    return Math.round(patientAccessValue + locumValue + retentionValue);
  };

  const timeValue = calculateTimeValue();
  const totalValue = totalDocValue + timeValue;

  const getTimePathLabel = () => {
    if (isNursing) {
      switch (state.timePathScenario) {
        case 'conservative': return 'Conservative (10 min)';
        case 'typical': return 'Typical (20 min)';
        case 'aggressive': return 'Aggressive (30 min)';
      }
    }
    if (isInpatient) {
      switch (state.timePathScenario) {
        case 'conservative': return 'Conservative (5 min)';
        case 'typical': return 'Typical (10 min)';
        case 'aggressive': return 'Aggressive (15 min)';
      }
    }
    if (isED) {
      switch (state.timePathScenario) {
        case 'conservative': return 'Conservative (2 min)';
        case 'typical': return 'Typical (4 min)';
        case 'aggressive': return 'Aggressive (6 min)';
      }
    }
    switch (state.timePathScenario) {
      case 'conservative': return 'Conservative (1.5 min)';
      case 'typical': return 'Typical (3 min)';
      case 'aggressive': return 'Aggressive (4.5 min)';
    }
  };

  const getEnabledDriversLabel = () => {
    const enabled = [];
    // Use care-setting-specific labels for drivers
    if (state.docDrivers.wrvu.enabled) {
      enabled.push(isNursing ? 'Care Plans' : isInpatient ? 'CC/MCC' : 'wRVU');
    }
    // HCC/CDI/Coordination not applicable for ED
    if (!isED && state.docDrivers.hcc.enabled) {
      enabled.push(isNursing ? 'Coordination' : isInpatient ? 'CDI' : 'HCC');
    }
    if (state.docDrivers.denials.enabled) {
      enabled.push(isNursing ? 'Compliance' : 'Denials');
    }
    if (enabled.length === 0) return 'None selected';
    return enabled.join(', ');
  };

  const getDocIcon = () => {
    if (state.docDrivers.wrvu.enabled) return BarChart3;
    // HCC not applicable for ED
    if (!isED && state.docDrivers.hcc.enabled) return Building2;
    if (state.docDrivers.denials.enabled) return AlertTriangle;
    return FileText;
  };

  const DocIcon = getDocIcon();

  // Use care-setting-specific terminology
  const providerLabel = isNursing ? 'nurses' : isInpatient ? 'hospitalists' : isED ? 'physicians' : 'providers';
  const encounterLabel = isNursing ? 'eligible patient encounters' : isInpatient ? 'eligible admissions' : 'eligible encounters';

  const summaryItems = [
    {
      icon: Users,
      label: 'Deployment Size',
      value: `${state.numberOfProviders} ${providerLabel}`,
      subvalue: `${eligibleEncounters.toLocaleString()} ${encounterLabel}`,
    },
    {
      icon: Clock,
      label: 'Time Savings Path',
      value: getTimePathLabel(),
      subvalue: `${totalHoursSaved.toLocaleString()} hours/year`,
    },
    {
      icon: DocIcon,
      label: 'Documentation Focus',
      value: getEnabledDriversLabel(),
      subvalue: `$${totalDocValue.toLocaleString()} projected value`,
    },
  ];

  const enabledDriverDetails = [];
  if (state.docDrivers.wrvu.enabled) {
    enabledDriverDetails.push({
      label: isNursing
        ? `Care Plan Compliance (${state.docDrivers.wrvu.value}% improvement)`
        : isInpatient 
          ? `CC/MCC Capture (${state.docDrivers.wrvu.value}% improvement)`
          : `wRVU (${state.docDrivers.wrvu.value}% improvement)`,
      value: wrvuValue,
    });
  }
  // HCC/CDI/Coordination not applicable for ED
  if (!isED && state.docDrivers.hcc.enabled) {
    enabledDriverDetails.push({
      label: isNursing
        ? `Care Coordination (${state.docDrivers.hcc.value}% improvement)`
        : isInpatient
          ? `CDI Query Reduction (${state.docDrivers.hcc.value}% reduction)`
          : `HCC Capture (${state.docDrivers.hcc.value}% recapture)`,
      value: hccValue,
    });
  }
  if (state.docDrivers.denials.enabled) {
    enabledDriverDetails.push({
      label: isNursing
        ? `Regulatory Compliance (${state.docDrivers.denials.value}% improvement)`
        : `Denial Prevention (${state.docDrivers.denials.value}% reduction)`,
      value: denialValue,
    });
  }

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={7}
        totalSteps={7}
        stepName="Review"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#FFF5F2] flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
          >
            <Sparkles className="w-8 h-8 text-[#EA2C00]" />
          </motion.div>

          <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
            Your Model Is Ready
          </h1>

          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Here's a summary of what you've built. Continue to add investment details and see your full ROI.
          </p>
        </motion.div>

        <motion.div
          className="bg-black rounded-2xl p-6 md:p-8 text-white text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <p className="text-sm text-white/60 mb-2">Projected Annual Value</p>
          <div className="flex items-baseline justify-center gap-2 mb-4">
            <DollarSign className="w-8 h-8 text-[#F07B5F]" />
            <span className="text-5xl md:text-6xl font-bold text-[#F07B5F]">{totalValue.toLocaleString()}</span>
          </div>
          <p className="text-sm text-white/60">Before investment costs</p>
        </motion.div>

        <div className="space-y-4 mb-10">
          {summaryItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.05, duration: 0.4 }}
              >
                <div className="w-12 h-12 rounded-xl bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-[#EA2C00]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="text-lg font-bold text-black">{item.value}</p>
                </div>
                <div className="text-right">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mb-1">
                    <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={3} />
                  </div>
                  <p className="text-sm text-slate-500">{item.subvalue}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="bg-slate-50 rounded-2xl p-6 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <h3 className="font-bold text-black mb-4">Value Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Time Savings Value</span>
              <span className="font-bold text-black">${timeValue.toLocaleString()}</span>
            </div>
            
            {enabledDriverDetails.length > 0 ? (
              enabledDriverDetails.map((driver) => (
                <div key={driver.label} className="flex items-center justify-between">
                  <span className="text-slate-600">{driver.label}</span>
                  <span className="font-bold text-black">${driver.value.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 italic">No documentation drivers selected</span>
                <span className="font-bold text-slate-400">$0</span>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="font-semibold text-black">Total Annual Value</span>
              <span className="text-xl font-bold text-[#EA2C00]">${totalValue.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        {/* ED-specific Downstream Value section */}
        {isED && (
          <motion.div
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 mb-10 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#F07B5F]" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Downstream Value Potential</h3>
                <p className="text-sm text-white/60">ED documentation connects to Inpatient value</p>
              </div>
            </div>
            
            <p className="text-sm text-white/80 mb-5">
              ED encounters that result in admissions create additional documentation value opportunities. 
              These are captured in the Inpatient flow and represent significant potential beyond direct ED metrics.
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <FileCheck className="w-4 h-4 text-[#F07B5F]" />
                  <span className="text-xs font-medium text-white/60">DRG/CMI Capture</span>
                </div>
                <p className="text-sm text-white/80">Accurate ED documentation supports proper DRG assignment for admitted patients</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Stethoscope className="w-4 h-4 text-[#F07B5F]" />
                  <span className="text-xs font-medium text-white/60">Medical Necessity</span>
                </div>
                <p className="text-sm text-white/80">Complete documentation establishes medical necessity for admission decisions</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-[#F07B5F]" />
                  <span className="text-xs font-medium text-white/60">CDI Efficiency</span>
                </div>
                <p className="text-sm text-white/80">Reduces Clinical Documentation Improvement queries and rework</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Link className="w-4 h-4 text-[#F07B5F]" />
                  <span className="text-xs font-medium text-white/60">Inpatient Connection</span>
                </div>
                <p className="text-sm text-white/80">ED documentation flows into inpatient records, enabling end-to-end value capture</p>
              </div>
            </div>
            
            <div className="mt-5 pt-4 border-t border-white/10">
              <p className="text-xs text-white/50 text-center">
                To model inpatient value from ED admissions, explore the Inpatient care setting
              </p>
            </div>
          </motion.div>
        )}

        <motion.div 
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: isED ? 0.5 : 0.4, duration: 0.5 }}
        >
          <Button
            onClick={onContinueToInvestment}
            className="h-14 px-10 font-semibold rounded-full bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white text-lg"
            data-testid="button-continue-investment"
          >
            Continue to Investment
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          
          <p className="text-sm text-slate-400 mt-4 text-center">
            Add subscription and implementation costs to see your complete ROI
          </p>
        </motion.div>
      </div>
    </div>
  );
}
