import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { ABRIDGE_BENCHMARKS, VALUE_ASSUMPTIONS } from "@/lib/switchGapCalculator";
import type { SwitchInputs } from "@/lib/switchGapCalculator";

interface StepEfficiencyRealityProps {
  inputs: SwitchInputs;
  onNext: () => void;
  onBack: () => void;
}

export default function StepEfficiencyReality({
  inputs,
  onNext,
  onBack,
}: StepEfficiencyRealityProps) {
  const [showCTA, setShowCTA] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowCTA(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  const utilization = inputs.utilization || 45;
  const timeSaved = inputs.timeSavedPerEncounter || 2.0;
  const abridgeTime = ABRIDGE_BENCHMARKS.timeSavedAvg;

  const yourDocumented = Math.round(inputs.annualEncounters * (utilization / 100));
  const abridgeDocumented = Math.round(inputs.annualEncounters * (ABRIDGE_BENCHMARKS.utilization / 100));

  const yourHours = Math.round((yourDocumented * timeSaved) / 60);
  const abridgeHours = Math.round((abridgeDocumented * abridgeTime) / 60);
  const hoursDiff = Math.max(0, abridgeHours - yourHours);

  const fteEquivalent = (hoursDiff / 2000).toFixed(1);

  return (
    <div className="max-w-[580px] mx-auto py-20 md:py-20" style={{ fontFamily: "Manrope, sans-serif" }}>
      <p className="text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-[2px] mb-3" data-testid="text-step5-eyebrow">
        Efficiency
      </p>

      <h1 className="text-[28px] font-semibold text-[#1A1A1A] leading-[1.3] mb-3" data-testid="text-step5-headline">
        Your efficiency gap.
      </h1>

      <p className="text-[17px] text-[#4B4B4B] leading-[1.75] mb-10">
        Most ambient tools return 1.5\u20132 minutes per encounter.
        Abridge averages 3 minutes through deeper workflow integration.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-[#F7F6F4] border border-[#E8E8E8] rounded-xl p-7" data-testid="card-your-efficiency">
          <p className="text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-[2px] mb-4">
            Your Current
          </p>
          <p className="text-[48px] font-bold text-[#1A1A1A] leading-none tabular-nums mb-1">
            {timeSaved.toFixed(1)} min
          </p>
          <p className="text-[15px] text-[#4B4B4B] mb-5">/ encounter</p>
          <div className="w-full h-px bg-[#E8E8E8] mb-5" />
          <p className="text-[32px] font-bold text-[#1A1A1A] leading-none tabular-nums mb-1">
            {yourHours.toLocaleString()}
          </p>
          <p className="text-[15px] text-[#4B4B4B]">hours returned annually</p>
        </div>

        <div className="bg-white border-2 border-[#EA2C00] rounded-xl p-7 shadow-[0_1px_4px_rgba(0,0,0,0.06)]" data-testid="card-abridge-efficiency">
          <p className="text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-[2px] mb-4">
            Abridge Average
          </p>
          <p className="text-[48px] font-bold text-[#1A1A1A] leading-none tabular-nums mb-1">
            {abridgeTime.toFixed(1)} min
          </p>
          <p className="text-[15px] text-[#4B4B4B] mb-5">/ encounter</p>
          <div className="w-full h-px bg-[#E8E8E8] mb-5" />
          <p className="text-[32px] font-bold text-[#1A1A1A] leading-none tabular-nums mb-1">
            {abridgeHours.toLocaleString()}
          </p>
          <p className="text-[15px] text-[#4B4B4B] mb-5">hours returned annually</p>
          <div className="w-full h-px bg-[#E8E8E8] mb-5" />
          <p className="text-[20px] font-bold text-[#EA2C00] tabular-nums">
            +{hoursDiff.toLocaleString()} additional hours
          </p>
        </div>
      </div>

      <div className="bg-[#F7F6F4] border border-[#E8E8E8] rounded-xl p-7 mb-10">
        <p className="text-[28px] font-bold text-[#1A1A1A] tabular-nums mb-3" data-testid="value-hours-diff">
          +{hoursDiff.toLocaleString()} hours annually
        </p>
        <p className="text-[17px] text-[#4B4B4B] leading-[1.75]">
          Equivalent to {fteEquivalent} FTE of physician time.
        </p>
        <p className="text-[17px] font-bold text-[#1A1A1A] leading-[1.75]">
          Already in your operations.
        </p>
        <p className="text-[17px] text-[#4B4B4B] leading-[1.75]">
          Currently locked inside documentation overhead.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-[14px] text-[#4B4B4B] underline underline-offset-2 hover:text-[#1A1A1A] transition-colors"
          data-testid="button-back"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className={`inline-flex items-center gap-1.5 px-8 py-3.5 bg-[#EA2C00] text-white text-[15px] font-semibold rounded-[10px] hover:bg-[#C72300] transition-all duration-300 ${
            showCTA ? "opacity-100" : "opacity-0"
          }`}
          data-testid="button-next"
        >
          See Where You Stand
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </button>
      </div>
    </div>
  );
}
