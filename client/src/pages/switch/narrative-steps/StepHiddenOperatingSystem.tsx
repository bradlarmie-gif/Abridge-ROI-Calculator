import { ArrowRight } from "lucide-react";

interface StepHiddenOperatingSystemProps {
  onNext: () => void;
  onBack: () => void;
}

export default function StepHiddenOperatingSystem({
  onNext,
  onBack,
}: StepHiddenOperatingSystemProps) {
  return (
    <div className="max-w-2xl mx-auto py-8 md:py-16">
      <div className="space-y-10">
        <h1
          className="text-3xl md:text-[2.75rem] md:leading-[1.1] font-bold text-[#1A1A1A] font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          The Hidden Operating System
        </h1>

        <p
          className="text-xl md:text-2xl text-[#1A1A1A] leading-snug"
          data-testid="text-headline"
        >
          Documentation is the largest unstructured economic system in your organization.
        </p>

        <p
          className="text-base text-[#666666] leading-relaxed"
          data-testid="text-subtext"
        >
          Much of your clinical labor cost, reimbursement accuracy, quality reporting, and compliance exposure flows through it.
        </p>

        <hr className="border-[#E5E7EB]" />

        <p
          className="text-base italic text-[#888888] leading-relaxed"
          data-testid="text-closing"
        >
          This assessment maps how much enterprise value is currently flowing through — and leaking from — that system.
        </p>

        <div className="flex items-center justify-between pt-6">
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
            data-testid="button-show-me"
          >
            Show Me
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
