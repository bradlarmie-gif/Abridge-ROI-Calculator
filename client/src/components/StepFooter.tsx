import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const STEP_FOOTER_SPACER_CLASS = "pb-20 md:pb-0";

interface StepFooterProps {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  backLabel?: string;
  showBack?: boolean;
  nextTestId?: string;
  backTestId?: string;
  nextIcon?: React.ReactNode;
}

export default function StepFooter({
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled = false,
  backLabel = "Back",
  showBack = true,
  nextTestId = "button-next",
  backTestId = "button-back",
  nextIcon,
}: StepFooterProps) {
  const finalNextIcon = nextIcon !== undefined ? nextIcon : <ArrowRight className="w-4 h-4" />;

  return (
    <>
      <div className="hidden md:flex items-center justify-between gap-4 pt-6">
        {showBack ? (
          <button
            onClick={onBack}
            className="text-sm text-[#888] hover:text-[#1A1A1A] transition-colors"
            data-testid={backTestId}
          >
            {backLabel}
          </button>
        ) : (
          <div />
        )}

        <Button
          onClick={onNext}
          disabled={nextDisabled}
          className="bg-[#EA2C00] hover:bg-[#D12600] text-white border-[#EA2C00] rounded-full px-6 font-medium gap-2"
          data-testid={nextTestId}
        >
          {nextLabel}
          {finalNextIcon}
        </Button>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-[#E5E7EB] px-4 py-3 pb-safe z-50">
        <div className="flex items-center justify-between gap-4">
          {showBack ? (
            <button
              onClick={onBack}
              className="text-sm text-[#888] hover:text-[#1A1A1A] transition-colors"
              data-testid={backTestId}
            >
              {backLabel}
            </button>
          ) : (
            <div />
          )}

          <Button
            onClick={onNext}
            disabled={nextDisabled}
            className="bg-[#EA2C00] hover:bg-[#D12600] text-white border-[#EA2C00] rounded-full px-6 font-medium gap-2"
            data-testid={nextTestId}
          >
            {nextLabel}
            {finalNextIcon}
          </Button>
        </div>
      </div>
    </>
  );
}
