import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { ABRIDGE_BENCHMARKS } from "@/lib/switchGapCalculator";
import type { SwitchInputs } from "@/lib/switchGapCalculator";

interface StepUtilizationRealityProps {
  inputs: SwitchInputs;
  onNext: () => void;
  onBack: () => void;
}

export default function StepUtilizationReality({
  inputs,
  onNext,
  onBack,
}: StepUtilizationRealityProps) {
  const [showCTA, setShowCTA] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowCTA(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  const utilization = inputs.utilization || 45;
  const abridgeUtilization = ABRIDGE_BENCHMARKS.utilization;

  const yourDocumented = Math.round(inputs.annualEncounters * (utilization / 100));
  const abridgeDocumented = Math.round(inputs.annualEncounters * (abridgeUtilization / 100));
  const encounterDiff = Math.max(0, abridgeDocumented - yourDocumented);

  return (
    <div className="max-w-[580px] mx-auto py-20 md:py-20" style={{ fontFamily: "Manrope, sans-serif" }}>
      <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-[2px] mb-3" data-testid="text-step4-eyebrow">
        Utilization
      </p>

      <h1 className="text-[28px] font-semibold text-[#1A1A1A] leading-[1.3] mb-10" data-testid="text-step4-headline">
        Your utilization gap.
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-[#F7F6F4] border border-[#E8E8E8] rounded-xl p-7" data-testid="card-your-utilization">
          <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-[2px] mb-4">
            Your Current
          </p>
          <p className="text-[48px] font-bold text-[#1A1A1A] leading-none tabular-nums mb-1">
            {utilization}%
          </p>
          <p className="text-[15px] text-[#4B4B4B] mb-5">utilization rate</p>
          <div className="w-full h-px bg-[#E8E8E8] mb-5" />
          <p className="text-[32px] font-bold text-[#1A1A1A] leading-none tabular-nums mb-1">
            {yourDocumented.toLocaleString()}
          </p>
          <p className="text-[15px] text-[#4B4B4B]">encounters documented annually</p>
        </div>

        <div className="bg-white border-2 border-[#EA2C00] rounded-xl p-7 shadow-[0_1px_4px_rgba(0,0,0,0.06)]" data-testid="card-abridge-utilization">
          <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-[2px] mb-4">
            Abridge Average
          </p>
          <p className="text-[48px] font-bold text-[#1A1A1A] leading-none tabular-nums mb-1">
            {abridgeUtilization}%
          </p>
          <p className="text-[15px] text-[#4B4B4B] mb-5">utilization rate</p>
          <div className="w-full h-px bg-[#E8E8E8] mb-5" />
          <p className="text-[32px] font-bold text-[#1A1A1A] leading-none tabular-nums mb-1">
            {abridgeDocumented.toLocaleString()}
          </p>
          <p className="text-[15px] text-[#4B4B4B] mb-5">encounters documented annually</p>
          <div className="w-full h-px bg-[#E8E8E8] mb-5" />
          <p className="text-[20px] font-bold text-[#EA2C00] tabular-nums">
            +{encounterDiff.toLocaleString()} encounters
          </p>
        </div>
      </div>

      <div className="bg-[#F7F6F4] border border-[#E8E8E8] rounded-xl p-7 mb-10">
        <p className="text-[17px] text-[#4B4B4B] leading-[1.75] mb-4">
          That gap represents {encounterDiff.toLocaleString()} encounters annually where
          documentation is available but not captured.
        </p>
        <p className="text-[17px] text-[#4B4B4B] leading-[1.75]">
          Every undocumented encounter affects reimbursement
          accuracy, quality reporting, and workforce load simultaneously.
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
          See Your Efficiency Gap
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </button>
      </div>
    </div>
  );
}
