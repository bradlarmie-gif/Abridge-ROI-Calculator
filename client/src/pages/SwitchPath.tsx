import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import abridgeLogo from "@assets/abridge-logo-wordmark-black-onwhite_1767885563802.jpg";

interface SwitchPathProps {
  onBack: () => void;
}

export default function SwitchPath({ onBack }: SwitchPathProps) {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <header className="mb-16">
          <div className="flex items-center justify-between">
            <div>
              <img src={abridgeLogo} alt="Abridge" className="h-7 mb-1" data-testid="img-logo" />
              <p className="text-sm text-[#6B7280] font-medium tracking-wide">ROI Calculator</p>
            </div>
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-[#6B7280] hover:text-[#111827]"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </header>

        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-[#FEF2F0] flex items-center justify-center mx-auto mb-6">
            <ArrowLeftRight className="w-8 h-8 text-[#E85D3F]" />
          </div>
          <h1 className="text-3xl font-bold text-[#111827] mb-4">Switch Path</h1>
          <p className="text-lg text-[#6B7280] max-w-md mx-auto mb-8">
            Compare Abridge against other ambient documentation solutions and see what switching could mean for your ROI.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FEF2F0] rounded-full">
            <span className="text-sm font-medium text-[#E85D3F]">Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}
