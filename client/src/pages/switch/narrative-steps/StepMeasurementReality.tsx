import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import type { SwitchInputs, DataMode } from "@/lib/switchGapCalculator";
import { ShieldCheck, BarChart3, Shield, Check } from "lucide-react";

interface StepMeasurementRealityProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

const CONFIDENCE_MAP: Record<DataMode, number> = {
  benchmark: 0.55,
  estimated: 0.70,
  measured: 0.90,
};

const TILES: {
  value: DataMode;
  title: string;
  description: string;
  badge: string;
  note: string;
}[] = [
  {
    value: "benchmark",
    title: "Benchmark-Based",
    description: "We'll use specialty-adjusted industry benchmarks with conservative guardrails.",
    badge: "Fastest",
    note: "Designed for early-stage or partial data environments.",
  },
  {
    value: "estimated",
    title: "Estimated",
    description: "You have directional internal data or pilot signals.",
    badge: "Balanced",
    note: "Moderate confidence adjustments applied.",
  },
  {
    value: "measured",
    title: "Measured",
    description: "You have pre/post data, tracked metrics, or formal pilots.",
    badge: "Highest Precision",
    note: "Reduced confidence haircuts. Guardrails still enforced.",
  },
];

function ImpactPreviewRail({ dataMode }: { dataMode: DataMode }) {
  const haircut = CONFIDENCE_MAP[dataMode];

  return (
    <div className="space-y-4">
      <div className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8]">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-[#1A1A1A]" />
          <p className="text-[11px] font-medium text-[#999] uppercase tracking-wider" data-testid="text-rail-changes-label">
            What this changes
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-sm text-[#888]">Confidence haircut</span>
              <span className="text-xl font-semibold text-[#1A1A1A] tabular-nums" data-testid="text-rail-haircut">
                {haircut.toFixed(2)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#E8E0D8] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#EA2C00] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${haircut * 100}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-sm pt-1">
            <span className="text-[#888]">Guardrails</span>
            <span className="text-[#1A1A1A] font-medium">Always on</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#888]">Caps</span>
            <span className="text-[#1A1A1A] font-medium">Always enforced</span>
          </div>
        </div>
      </div>

      <div className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8]">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-[#1A1A1A]" />
          <p className="text-[11px] font-medium text-[#999] uppercase tracking-wider" data-testid="text-rail-why-label">
            Why this matters
          </p>
        </div>
        <p className="text-sm text-[#666] leading-relaxed">
          We model conservatively by design. Your selection adjusts how aggressively we haircut projected value before displaying it.
        </p>
      </div>

      <div className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8]">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-[#1A1A1A]" />
          <p className="text-[11px] font-medium text-[#999] uppercase tracking-wider" data-testid="text-rail-trust-label">
            Trust principles
          </p>
        </div>
        <ul className="space-y-2">
          {[
            "No double-counting",
            "Hard caps on yield + risk",
            "Deployment gating on time savings",
            "Conservative default assumptions",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-[#666]">
              <Check className="w-3.5 h-3.5 text-[#22C55E] mt-0.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function StepMeasurementReality({
  inputs,
  updateInput,
  onNext,
  onBack,
}: StepMeasurementRealityProps) {
  const handleSelect = (mode: DataMode) => {
    updateInput("dataMode", mode);
    updateInput("confidenceBaseline", CONFIDENCE_MAP[mode]);
  };

  return (
    <div className={`${STEP_FOOTER_SPACER_CLASS}`}>
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
        <div className="lg:hidden">
          <ImpactPreviewRail dataMode={inputs.dataMode} />
        </div>

        <div className="flex-1 max-w-[720px] space-y-8">
          <div className="text-left">
            <h1
              className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight"
              data-testid="text-page-title"
            >
              Measurement Reality
            </h1>
            <p className="text-base text-[#888888] leading-relaxed">
              Ambient economics can be modeled with benchmarks or measured data. Let's calibrate how precise your environment is today.
            </p>
            <p className="text-[13px] text-[#999] mt-2">
              You can change this later. We default to conservative.
            </p>
          </div>

          <div className="space-y-4">
            {TILES.map((tile) => {
              const isSelected = inputs.dataMode === tile.value;
              return (
                <button
                  key={tile.value}
                  type="button"
                  onClick={() => handleSelect(tile.value)}
                  data-testid={`tile-${tile.value}`}
                  className={`w-full text-left rounded-2xl p-5 md:p-6 transition-all duration-200 border ${
                    isSelected
                      ? "bg-[#F5F0EB] border-[#E8E0D8] scale-[1.005]"
                      : "bg-white border-[#E8E0D8] hover:bg-[#FAFAF7]"
                  } relative overflow-hidden`}
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-all duration-300 ${
                      isSelected ? "bg-[#EA2C00]" : "bg-transparent"
                    }`}
                  />
                  <div className="pl-3">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-lg font-semibold text-[#1A1A1A]">{tile.title}</span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wider ${
                          isSelected
                            ? "bg-[#EA2C00]/10 text-[#EA2C00]"
                            : "bg-[#F0F0F0] text-[#888]"
                        }`}
                      >
                        {tile.badge}
                      </span>
                    </div>
                    <p className="text-sm text-[#555] leading-relaxed mb-2">{tile.description}</p>
                    <p className="text-[12px] text-[#999]">{tile.note}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <StepFooter
            onBack={onBack}
            onNext={onNext}
            nextLabel="Next"
            nextDisabled={false}
          />
        </div>

        <div className="hidden lg:block w-[360px] shrink-0">
          <div className="sticky top-24">
            <ImpactPreviewRail dataMode={inputs.dataMode} />
          </div>
        </div>
      </div>
    </div>
  );
}
