import { useAssessment, assessmentActions } from "@/lib/assessment";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import type { PillarId } from "@/lib/pillars/computePillars";
import type { PressureLevel, ConfidenceLevel } from "@/lib/assessment";

interface PillarCardConfig {
  id: PillarId;
  name: string;
  description: string;
  icon: string;
}

const PILLAR_CARDS: PillarCardConfig[] = [
  {
    id: "capacity",
    name: "Patient Capacity",
    description: "Time recovered from documentation enables more patient visits.",
    icon: "C",
  },
  {
    id: "yield",
    name: "Revenue Yield",
    description: "Better documentation drives more complete coding and reimbursement.",
    icon: "Y",
  },
  {
    id: "workforce",
    name: "Workforce Retention",
    description: "Reduced after-hours burden improves provider satisfaction and retention.",
    icon: "W",
  },
  {
    id: "risk",
    name: "Compliance & Risk",
    description: "Higher documentation quality lowers audit exposure and compliance gaps.",
    icon: "R",
  },
];

const PRESSURE_OPTIONS: { label: string; value: PressureLevel }[] = [
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const CONFIDENCE_OPTIONS: { label: string; value: ConfidenceLevel }[] = [
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

interface SegmentedPillsProps<T extends string> {
  options: { label: string; value: T }[];
  selected: T;
  onChange: (value: T) => void;
  testIdPrefix: string;
}

function SegmentedPills<T extends string>({
  options,
  selected,
  onChange,
  testIdPrefix,
}: SegmentedPillsProps<T>) {
  return (
    <div className="flex gap-1.5">
      {options.map((opt) => {
        const isActive = opt.value === selected;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            data-testid={`${testIdPrefix}-${opt.value}`}
            className={`
              px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${isActive
                ? "bg-[#EA2C00] text-white shadow-sm"
                : "bg-white text-[#666666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
              }
            `}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface StepEnterprisePressureMapProps {
  onNext: () => void;
  onBack: () => void;
}

export default function StepEnterprisePressureMap({
  onNext,
  onBack,
}: StepEnterprisePressureMapProps) {
  const { state, dispatch } = useAssessment();
  const { pillarsMeta } = state;

  const handlePressureChange = (pillarId: PillarId, value: PressureLevel) => {
    dispatch(assessmentActions.updatePillarMeta(pillarId, "pressure", value));
  };

  const handleConfidenceChange = (pillarId: PillarId, value: ConfidenceLevel) => {
    dispatch(assessmentActions.updatePillarMeta(pillarId, "confidence", value));
  };

  return (
    <div className={`space-y-10 ${STEP_FOOTER_SPACER_CLASS}`}>
      <div className="text-left">
        <h1
          className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          Your Enterprise Pressure Map
        </h1>
        <p className="text-base text-[#888888] leading-relaxed max-w-lg" data-testid="text-page-subtitle">
          Ambient value is created in four economic zones. Let's map where pressure is highest.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PILLAR_CARDS.map((card) => {
          const meta = pillarsMeta[card.id];
          return (
            <div
              key={card.id}
              className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8]"
              data-testid={`card-pillar-${card.id}`}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center text-sm font-bold text-[#EA2C00] shrink-0">
                  {card.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#1A1A1A] font-abridge uppercase tracking-wide">
                    {card.name}
                  </h3>
                  <p className="text-xs text-[#888888] mt-0.5 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#999999] uppercase tracking-wider mb-1.5">
                    Pressure
                  </label>
                  <SegmentedPills
                    options={PRESSURE_OPTIONS}
                    selected={meta.pressure}
                    onChange={(v) => handlePressureChange(card.id, v)}
                    testIdPrefix={`pills-pressure-${card.id}`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#999999] uppercase tracking-wider mb-1.5">
                    Confidence
                  </label>
                  <SegmentedPills
                    options={CONFIDENCE_OPTIONS}
                    selected={meta.confidence}
                    onChange={(v) => handleConfidenceChange(card.id, v)}
                    testIdPrefix={`pills-confidence-${card.id}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <StepFooter onBack={onBack} onNext={onNext} nextLabel="Quantify My Opportunity" nextTestId="button-quantify-opportunity" />
    </div>
  );
}