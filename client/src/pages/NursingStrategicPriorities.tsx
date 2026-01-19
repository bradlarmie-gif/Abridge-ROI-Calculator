import { useState } from "react";
import { ArrowLeft, Check, Clock, ClipboardList, AlertTriangle, ChevronRight, BarChart3, Lightbulb, Zap, DollarSign, FileX } from "lucide-react";
import { SETTING_CONFIG, NURSING_CATEGORY_LABELS, LeverConfig } from "@/lib/SETTING_CONFIG";

interface NursingStrategicPrioritiesProps {
  onBack: () => void;
  onContinue: (selectedDrivers: string[]) => void;
}

// Context tag styling for nursing drivers
const NURSING_DRIVER_CONTEXT: Record<string, { icon: typeof Zap; text: string; color: string }> = {
  nursingOvertime: {
    icon: Zap,
    text: "Most directly measurable—shows up in payroll data",
    color: "text-amber-600",
  },
  nursingDocTime: {
    icon: Check,
    text: "Immediate impact on nurse workflow",
    color: "text-green-600",
  },
  nursingAgency: {
    icon: DollarSign,
    text: "Agency nurses cost 2-3x staff nurses",
    color: "text-orange-600",
  },
  nursingRetention: {
    icon: Clock,
    text: "Long-term impact—12+ months to measure fully",
    color: "text-slate-500",
  },
  nursingCompleteness: {
    icon: AlertTriangle,
    text: "Harder to monetize but important for compliance",
    color: "text-amber-500",
  },
};

export default function NursingStrategicPriorities({
  onBack,
  onContinue,
}: NursingStrategicPrioritiesProps) {
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);

  const nursingDrivers = SETTING_CONFIG.nursing;
  
  const driversByCategory = {
    time: nursingDrivers.filter((l) => l.category === "time"),
    documentation: nursingDrivers.filter((l) => l.category === "documentation"),
  };

  const MAX_SELECTIONS = 5;
  const MIN_SELECTIONS = 1;

  const toggleDriver = (driverId: string) => {
    setSelectedDrivers((prev) => {
      if (prev.includes(driverId)) {
        return prev.filter((id) => id !== driverId);
      }
      if (prev.length >= MAX_SELECTIONS) {
        return prev;
      }
      return [...prev, driverId];
    });
  };

  const canContinue = selectedDrivers.length >= MIN_SELECTIONS && selectedDrivers.length <= MAX_SELECTIONS;
  const isAtMax = selectedDrivers.length >= MAX_SELECTIONS;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "time":
        return <Clock className="w-5 h-5 text-[#E85D3F]" />;
      case "documentation":
        return <ClipboardList className="w-5 h-5 text-[#E85D3F]" />;
      default:
        return <Clock className="w-5 h-5 text-[#E85D3F]" />;
    }
  };

  const renderDriverCard = (driver: LeverConfig) => {
    const isSelected = selectedDrivers.includes(driver.id);
    const isDisabled = isAtMax && !isSelected;
    const context = NURSING_DRIVER_CONTEXT[driver.id];
    
    return (
      <div
        key={driver.id}
        onClick={() => !isDisabled && toggleDriver(driver.id)}
        className={`relative p-4 border rounded-xl transition-all ${
          isSelected
            ? "border-[#E85D3F] bg-[#FFF5F3] ring-1 ring-[#E85D3F]/20 cursor-pointer"
            : isDisabled
              ? "border-neutral-200 bg-neutral-50 opacity-50 cursor-not-allowed"
              : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 cursor-pointer"
        }`}
        data-testid={`priority-${driver.id}`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
              isSelected
                ? "border-[#E85D3F] bg-[#E85D3F]"
                : "border-neutral-300 bg-white"
            }`}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-neutral-900">{driver.label}</div>
            <p className="text-sm text-neutral-600 mt-1">{driver.description}</p>
            
            {/* Context tag */}
            {context && (
              <div className={`flex items-center gap-1.5 mt-2 text-xs ${context.color}`}>
                <context.icon className="w-3 h-3" />
                {context.text}
              </div>
            )}
            
            {/* Value range */}
            {driver.keyMetric && (
              <div className="text-xs text-neutral-500 mt-2">
                Typical range: <span className="font-medium text-[#0E9F6E]">{driver.keyMetric}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12 md:py-16">
        <div className="grid lg:grid-cols-[1fr_320px] gap-8 lg:gap-12">
          {/* Main Content */}
          <div>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 mb-8 text-sm font-semibold text-[#E85D3F] transition-opacity hover:opacity-70"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="mb-10">
              <h2 className="text-3xl md:text-4xl font-medium text-neutral-900 leading-tight mb-4">
                Strategic Priorities
              </h2>
              <p className="text-lg text-neutral-600 leading-relaxed">
                What outcomes matter most for your nursing team?
              </p>
              <p className="text-base text-neutral-500 mt-2">
                Select the value drivers to include in your ROI model.
              </p>
            </div>

            {/* A NOTE ON NURSING ROI callout */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <span className="font-semibold block mb-2">A Note on Nursing ROI</span>
                  <p className="mb-3">
                    Nurses don't bill—there's no wRVU or E/M coding to optimize.
                  </p>
                  <p className="mb-2">Nursing ROI is about protecting your workforce:</p>
                  <ul className="space-y-1 ml-4">
                    <li className="flex items-start gap-2">
                      <Check className="w-3 h-3 text-amber-600 flex-shrink-0 mt-1" />
                      <span><strong>Real budget savings</strong> (overtime, agency)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3 h-3 text-amber-600 flex-shrink-0 mt-1" />
                      <span><strong>Workforce sustainability</strong> (retention, satisfaction)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3 h-3 text-amber-600 flex-shrink-0 mt-1" />
                      <span><strong>Compliance and quality</strong> (documentation completeness)</span>
                    </li>
                  </ul>
                  <p className="mt-3 font-medium">These are REAL dollars that hit the same budget line.</p>
                </div>
              </div>
            </div>

            {/* WHAT WE DON'T CLAIM callout */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8">
              <div className="flex items-start gap-3">
                <FileX className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-700">
                  <span className="font-semibold block mb-2">What We Don't Claim</span>
                  <p className="mb-2">We intentionally exclude:</p>
                  <ul className="space-y-1 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400">•</span>
                      <span>Falls/pressure injury reduction (too indirect)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400">•</span>
                      <span>Revenue support via CDI (nursing notes rarely drive DRG)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-400">•</span>
                      <span>Patient satisfaction lift (hard to attribute)</span>
                    </li>
                  </ul>
                  <p className="mt-3 text-slate-600">We focus on what's <strong>measurable and defensible</strong>.</p>
                </div>
              </div>
            </div>

            {/* Driver Categories */}
            <div className="space-y-8">
              {/* Time Saved Benefits */}
              {driversByCategory.time.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    {getCategoryIcon("time")}
                    <div>
                      <h3 className="font-semibold text-neutral-900 uppercase text-sm tracking-wide">
                        {NURSING_CATEGORY_LABELS.time?.label || "Time Saved Benefits"}
                      </h3>
                      <p className="text-sm text-neutral-500">
                        {NURSING_CATEGORY_LABELS.time?.description || "Workforce efficiency and cost management"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {driversByCategory.time.map(renderDriverCard)}
                  </div>
                </div>
              )}

              {/* Documentation Quality Benefits */}
              {driversByCategory.documentation.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    {getCategoryIcon("documentation")}
                    <div>
                      <h3 className="font-semibold text-neutral-900 uppercase text-sm tracking-wide">
                        {NURSING_CATEGORY_LABELS.documentation?.label || "Documentation Quality Benefits"}
                      </h3>
                      <p className="text-sm text-neutral-500">
                        {NURSING_CATEGORY_LABELS.documentation?.description || "Clinical documentation and compliance"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {driversByCategory.documentation.map(renderDriverCard)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:sticky lg:top-8 h-fit">
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-6">
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                Your Selections
              </h3>

              {/* Care Setting */}
              <div className="mb-6">
                <div className="text-xs text-neutral-500 uppercase tracking-wide mb-2">
                  Care Setting
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-neutral-900">Nursing</span>
                  <Check className="w-4 h-4 text-[#0E9F6E]" />
                </div>
              </div>

              {/* Selected Priorities */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs text-neutral-500 uppercase tracking-wide mb-2">
                  <span>Strategic Priorities</span>
                  <span className={`font-medium ${isAtMax ? 'text-amber-600' : ''}`}>
                    {selectedDrivers.length} of {nursingDrivers.length} selected
                  </span>
                </div>
                {selectedDrivers.length === 0 ? (
                  <p className="text-sm text-neutral-400">Select at least 1 driver</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDrivers.map((driverId) => {
                      const driver = nursingDrivers.find((d) => d.id === driverId);
                      return driver ? (
                        <div
                          key={driverId}
                          className="flex items-center gap-2 text-sm text-neutral-700"
                        >
                          <Check className="w-3 h-3 text-[#0E9F6E]" />
                          {driver.label}
                        </div>
                      ) : null;
                    })}
                    {isAtMax && (
                      <p className="text-xs text-amber-600 mt-2">All drivers selected</p>
                    )}
                  </div>
                )}
              </div>

              {/* Continue Button */}
              <button
                onClick={() => onContinue(selectedDrivers)}
                disabled={!canContinue}
                className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                  canContinue
                    ? "bg-neutral-900 text-white hover:bg-neutral-800"
                    : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                }`}
                data-testid="button-continue"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>

              {!canContinue && (
                <p className="text-xs text-neutral-500 text-center mt-2">
                  Select at least 1 priority to continue
                </p>
              )}
            </div>

            {/* Methodology note */}
            <div className="mt-4 flex items-start gap-2 text-xs text-neutral-500">
              <BarChart3 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Based on proven methodologies from nursing leaders</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
