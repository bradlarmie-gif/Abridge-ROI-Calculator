import { motion } from "framer-motion";
import { ArrowLeft, Stethoscope, Zap, Building2, HeartPulse, ChevronRight } from "lucide-react";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';

interface MethodologyHomeProps {
  onBack: () => void;
  onSelectSetting: (setting: "outpatient" | "ed" | "inpatient" | "nursing") => void;
}

const careSettings = [
  {
    id: "outpatient" as const,
    name: "Outpatient",
    subtitle: "Primary care & specialty",
    icon: Stethoscope,
  },
  {
    id: "ed" as const,
    name: "Emergency",
    subtitle: "Emergency department",
    icon: Zap,
  },
  {
    id: "inpatient" as const,
    name: "Inpatient",
    subtitle: "Hospital medicine",
    icon: Building2,
  },
  {
    id: "nursing" as const,
    name: "Nursing",
    subtitle: "Inpatient nursing",
    icon: HeartPulse,
  },
];

const principles = [
  {
    title: "Show our work",
    description: "Every calculation is transparent. Assumptions are visible and editable.",
  },
  {
    title: "Conservative by default",
    description: "We'd rather under-promise. Realization rates and conversion factors are set conservatively—adjust them if your data supports it.",
  },
  {
    title: "Honest about limits",
    description: "Some value is direct and measurable. Some is indirect and harder to attribute. We label the difference.",
  },
  {
    title: "Validate with your data",
    description: "Our defaults are starting points. The real answer comes from your organization's experience.",
  },
];

export function MethodologyHome({ onBack, onSelectSetting }: MethodologyHomeProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-[1000px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center cursor-pointer bg-transparent border-none p-0"
              data-testid="link-home-logo"
            >
              <img src={abridgeLogo} alt="Abridge" className="h-5 md:h-6" />
            </button>
            <span className="text-[#E5E5E5]">|</span>
            <span className="text-xs font-medium text-[#888888] uppercase tracking-wide">Methodology</span>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#666666] hover:text-black transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
        </div>
      </header>

      <div className="max-w-[1000px] mx-auto px-6 py-12">
        {/* Hero Section */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-black mb-4 uppercase tracking-tight">
            How We Think About Value
          </h1>
          <p className="text-lg text-[#666666] max-w-[600px] mx-auto">
            A framework for understanding ambient documentation ROI
          </p>
        </motion.div>

        {/* Introduction */}
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-8 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-lg text-black leading-relaxed mb-4">
            Value from ambient documentation shows up differently in every care setting. 
            A minute saved in the ED creates different value than a minute saved on a med-surg floor.
          </p>
          <p className="text-base text-[#666666] leading-relaxed">
            We've spent years understanding these differences—not to inflate projections, 
            but to help organizations model what's actually possible in their context.
          </p>
        </motion.div>

        {/* Care Setting Selection */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
            Select a setting to explore our methodology
          </p>
          <div className="h-px bg-[#E5E5E5] mb-6" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {careSettings.map((setting) => {
              const Icon = setting.icon;
              return (
                <button
                  key={setting.id}
                  onClick={() => onSelectSetting(setting.id)}
                  className="group bg-white border border-[#E5E5E5] hover:border-[#EA2C00] rounded-lg p-6 text-left transition-all"
                  data-testid={`button-setting-${setting.id}`}
                >
                  <div className="w-12 h-12 bg-[#F5F0EB] group-hover:bg-[#EA2C00]/10 rounded-lg flex items-center justify-center mb-4 transition-colors">
                    <Icon className="w-6 h-6 text-[#EA2C00]" />
                  </div>
                  <h3 className="font-semibold text-black mb-1">{setting.name}</h3>
                  <p className="text-sm text-[#888888]">{setting.subtitle}</p>
                  <div className="flex items-center gap-1 mt-3 text-[#EA2C00] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm font-medium">Explore</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Principles Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
            Our Principles
          </p>
          <div className="h-px bg-[#E5E5E5] mb-6" />
          
          <div className="space-y-6">
            {principles.map((principle, index) => (
              <div key={index} className="flex gap-4">
                <div className="w-1 bg-[#EA2C00] rounded-full flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-black mb-1">{principle.title}</h4>
                  <p className="text-sm text-[#666666] leading-relaxed">{principle.description}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
