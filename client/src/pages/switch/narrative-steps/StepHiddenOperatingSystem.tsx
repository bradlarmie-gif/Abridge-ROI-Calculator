import { ArrowRight } from "lucide-react";
import { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";

interface StepHiddenOperatingSystemProps {
  onNext: () => void;
  onBack: () => void;
}

export default function StepHiddenOperatingSystem({
  onNext,
  onBack,
}: StepHiddenOperatingSystemProps) {
  return (
    <div className={`max-w-2xl mx-auto ${STEP_FOOTER_SPACER_CLASS}`}>
      <div className="space-y-12 py-4 md:py-8">
        <div className="space-y-6">
          <h1
            className="text-3xl md:text-[2.5rem] md:leading-[1.15] font-bold text-[#1A1A1A] font-abridge uppercase tracking-tight"
            data-testid="text-page-title"
          >
            The Hidden Operating System
          </h1>

          <p
            className="text-xl md:text-2xl font-semibold text-[#1A1A1A] leading-snug"
            data-testid="text-headline"
          >
            Documentation is the largest unstructured economic system in your organization.
          </p>

          <p
            className="text-base text-[#666666] leading-relaxed"
            data-testid="text-subtext"
          >
            Every dollar of clinical labor, reimbursement accuracy, quality reporting, and compliance exposure flows through documentation.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              id: "supply",
              text: "Deployable clinical supply",
            },
            {
              id: "revenue",
              text: "Revenue integrity & capture",
            },
            {
              id: "audit",
              text: "Audit defensibility & automation readiness",
            },
          ].map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4"
              data-testid={`bullet-${item.id}`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#EA2C00] flex-shrink-0" />
              <p className="text-base font-medium text-[#1A1A1A]">
                {item.text}
              </p>
            </div>
          ))}
        </div>

        <div className="border-t border-[#E5E7EB] pt-8">
          <p
            className="text-sm text-[#888888] leading-relaxed"
            data-testid="text-closing"
          >
            This assessment quantifies how much enterprise value is currently flowing through — and leaking from — that system.
          </p>
        </div>

        <div className="flex items-center justify-between pt-4">
          <button
            onClick={onBack}
            className="text-sm text-[#999999] hover:text-[#666666] transition-colors"
            data-testid="button-back"
          >
            Back
          </button>

          <button
            onClick={onNext}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#333333] transition-colors"
            data-testid="button-map-exposure"
          >
            Map My Enterprise Exposure
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
