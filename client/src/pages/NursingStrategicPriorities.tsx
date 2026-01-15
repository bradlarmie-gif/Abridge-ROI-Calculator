import { useState } from "react";
import { ArrowLeft, Check, Clock, ClipboardList, AlertTriangle, ChevronRight, BarChart3, Lightbulb } from "lucide-react";
import { SETTING_CONFIG, NURSING_CATEGORY_LABELS, LeverConfig } from "@/lib/SETTING_CONFIG";

interface NursingStrategicPrioritiesProps {
  onBack: () => void;
  onContinue: (selectedDrivers: string[]) => void;
}

export default function NursingStrategicPriorities({
  onBack,
  onContinue,
}: NursingStrategicPrioritiesProps) {
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);

  const nursingDrivers = SETTING_CONFIG.nursing;
  
  const driversByCategory = {
    capacityLabor: nursingDrivers.filter((l) => l.category === "capacityLabor"),
    documentationQuality: nursingDrivers.filter((l) => l.category === "documentationQuality"),
    qualityRevenue: nursingDrivers.filter((l) => l.category === "qualityRevenue"),
  };

  const MAX_SELECTIONS = 6;
  const MIN_SELECTIONS = 2;

  const toggleDriver = (driverId: string) => {
    setSelectedDrivers((prev) => {
      // If already selected, allow deselecting
      if (prev.includes(driverId)) {
        return prev.filter((id) => id !== driverId);
      }
      // If at max, don't allow more selections
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
      case "capacityLabor":
        return <Clock className="w-5 h-5 text-[#F03319]" />;
      case "documentationQuality":
        return <ClipboardList className="w-5 h-5 text-[#F03319]" />;
      case "qualityRevenue":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <Clock className="w-5 h-5 text-[#F03319]" />;
    }
  };

  const renderDriverCard = (driver: LeverConfig) => {
    const isSelected = selectedDrivers.includes(driver.id);
    const isDisabled = isAtMax && !isSelected;
    
    return (
      <div
        key={driver.id}
        onClick={() => !isDisabled && toggleDriver(driver.id)}
        className={`relative p-4 border rounded-xl transition-all ${
          isSelected
            ? "border-[#F03319] bg-[#FFF5F3] ring-1 ring-[#F03319]/20 cursor-pointer"
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
                ? "border-[#F03319] bg-[#F03319]"
                : "border-neutral-300 bg-white"
            }`}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-neutral-900">{driver.label}</div>
            <p className="text-sm text-neutral-600 mt-1">{driver.description}</p>
            {driver.keyMetric && (
              <div className="text-xs text-neutral-500 mt-2">
                Key metric: {driver.keyMetric}
              </div>
            )}
            {driver.hasWarning && driver.warningText && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600">
                <AlertTriangle className="w-3 h-3" />
                {driver.warningText}
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
              className="inline-flex items-center gap-2 mb-8 text-sm font-semibold text-[#F03319] transition-opacity hover:opacity-70"
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
                What outcomes matter most right now?
              </p>
              <p className="text-base text-neutral-500 mt-2">
                Select 2-6 strategic priorities. These will shape your ROI model and determine which value drivers we analyze in detail.
              </p>
            </div>

            {/* Tip callout */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <span className="font-medium">Selecting your priorities</span>
                  <ul className="mt-1 space-y-1">
                    <li className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-blue-600" />
                      Most organizations select 2-4 drivers
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-blue-600" />
                      You'll see detailed calculations for each selected driver in the next step
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Driver Categories */}
            <div className="space-y-8">
              {/* Capacity & Labor */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  {getCategoryIcon("capacityLabor")}
                  <div>
                    <h3 className="font-semibold text-neutral-900 uppercase text-sm tracking-wide">
                      {NURSING_CATEGORY_LABELS.capacityLabor.label}
                    </h3>
                    <p className="text-sm text-neutral-500">
                      {NURSING_CATEGORY_LABELS.capacityLabor.description}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {driversByCategory.capacityLabor.map(renderDriverCard)}
                </div>
              </div>

              {/* Documentation Quality */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  {getCategoryIcon("documentationQuality")}
                  <div>
                    <h3 className="font-semibold text-neutral-900 uppercase text-sm tracking-wide">
                      {NURSING_CATEGORY_LABELS.documentationQuality.label}
                    </h3>
                    <p className="text-sm text-neutral-500">
                      {NURSING_CATEGORY_LABELS.documentationQuality.description}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {driversByCategory.documentationQuality.map(renderDriverCard)}
                </div>
              </div>

              {/* Quality & Revenue */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  {getCategoryIcon("qualityRevenue")}
                  <div>
                    <h3 className="font-semibold text-amber-700 uppercase text-sm tracking-wide">
                      {NURSING_CATEGORY_LABELS.qualityRevenue.label} (Indirect Impact)
                    </h3>
                    <p className="text-sm text-amber-600">
                      {NURSING_CATEGORY_LABELS.qualityRevenue.description}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {driversByCategory.qualityRevenue.map(renderDriverCard)}
                </div>
              </div>
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
                  <p className="text-sm text-neutral-400">Select 2-6 drivers</p>
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
                      <p className="text-xs text-amber-600 mt-2">Maximum 6 drivers selected</p>
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
                  Select at least 2 priorities to continue
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
