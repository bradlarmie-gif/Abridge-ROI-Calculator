import { ArrowRight, Check, Users, Clock, BarChart3, Building2, AlertTriangle, DollarSign, Sparkles } from "lucide-react";
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
const HCC_VALUE_PER_CONDITION = 800;
const DENIAL_AVG_VALUE = 250;

export default function ExploreReview({ state, totalHoursSaved, onContinueToInvestment, onBack, onHome }: ExploreReviewProps) {
  
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

  const getDocValue = () => {
    switch (state.docPathFocus) {
      case 'wrvu': return calculateWrvuValue();
      case 'hcc': return calculateHccValue();
      case 'denials': return calculateDenialValue();
      default: return 0;
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

  const docValue = getDocValue();
  const timeValue = calculateTimeValue();
  const totalValue = docValue + timeValue;

  const getDocFocusLabel = () => {
    switch (state.docPathFocus) {
      case 'wrvu': return 'Level of Service (wRVU)';
      case 'hcc': return 'HCC Capture';
      case 'denials': return 'Denial Prevention';
      default: return '';
    }
  };

  const getDocFocusIcon = () => {
    switch (state.docPathFocus) {
      case 'wrvu': return BarChart3;
      case 'hcc': return Building2;
      case 'denials': return AlertTriangle;
      default: return BarChart3;
    }
  };

  const getTimePathLabel = () => {
    switch (state.timePathScenario) {
      case 'conservative': return 'Conservative (1.5 min)';
      case 'typical': return 'Typical (3 min)';
      case 'aggressive': return 'Aggressive (4.5 min)';
    }
  };

  const DocIcon = getDocFocusIcon();

  const summaryItems = [
    {
      icon: Users,
      label: 'Deployment Size',
      value: `${state.numberOfProviders} providers`,
      subvalue: `${eligibleEncounters.toLocaleString()} eligible encounters`,
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
      value: getDocFocusLabel(),
      subvalue: `$${docValue.toLocaleString()} projected value`,
    },
  ];

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
            <div className="flex items-center justify-between">
              <span className="text-slate-600">{getDocFocusLabel()} Value</span>
              <span className="font-bold text-black">${docValue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="font-semibold text-black">Total Annual Value</span>
              <span className="text-xl font-bold text-[#EA2C00]">${totalValue.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
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
