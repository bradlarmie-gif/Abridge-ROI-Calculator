import { ArrowRight, BarChart3, Building2, Heart, Stethoscope, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExpandSettingSelectionProps {
  onNext: () => void;
  onExplore: () => void;
  onBack?: () => void;
}

export default function ExpandSettingSelection({ onNext, onExplore, onBack }: ExpandSettingSelectionProps) {
  return (
    <div className="min-h-screen bg-[#f9fafb]">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-[#6B7280] hover:text-[#111827] transition-colors mr-4"
                data-testid="button-back-to-journey"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                <span className="text-sm">Back</span>
              </button>
            )}
            <span className="text-lg font-bold text-[#E85D3F] tracking-tight">ABRIDGE</span>
            <span className="text-neutral-300">|</span>
            <span className="text-sm text-[#6B7280]">ROI Calculator</span>
          </div>
          <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
            EXPAND
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-[#111827] mb-3">
            Analyze Your Results
          </h1>
          <p className="text-lg text-[#6B7280]">
            See how your Abridge deployment is performing
          </p>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Outpatient - Active */}
          <div 
            className="bg-white rounded-2xl border-2 border-[#E85D3F] p-8 text-center cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
            onClick={onNext}
            data-testid="setting-outpatient"
          >
            <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="w-8 h-8 text-[#E85D3F]" />
            </div>
            <h3 className="text-xl font-semibold text-[#111827] mb-2">Outpatient</h3>
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full mb-3">
              AVAILABLE
            </span>
            <p className="text-sm text-[#6B7280] mb-6">
              Analyze your outpatient deployment results
            </p>
            <Button className="w-full gap-2" data-testid="button-load-results">
              Load Your Results
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* ED - Coming Soon */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center opacity-60 cursor-not-allowed">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-xl font-semibold text-[#111827] mb-2">Emergency Department</h3>
            <span className="inline-block px-3 py-1 bg-neutral-100 text-neutral-500 text-xs font-semibold rounded-full mb-3 tracking-wide">
              COMING SOON
            </span>
            <p className="text-sm text-[#6B7280] mb-6 blur-[2px]">
              Analyze your ED deployment results
            </p>
          </div>

          {/* Inpatient - Coming Soon */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center opacity-60 cursor-not-allowed">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-xl font-semibold text-[#111827] mb-2">Inpatient</h3>
            <span className="inline-block px-3 py-1 bg-neutral-100 text-neutral-500 text-xs font-semibold rounded-full mb-3 tracking-wide">
              COMING SOON
            </span>
            <p className="text-sm text-[#6B7280] mb-6 blur-[2px]">
              Analyze your inpatient deployment results
            </p>
          </div>

          {/* Nursing - Coming Soon */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center opacity-60 cursor-not-allowed">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-xl font-semibold text-[#111827] mb-2">Nursing</h3>
            <span className="inline-block px-3 py-1 bg-neutral-100 text-neutral-500 text-xs font-semibold rounded-full mb-3 tracking-wide">
              COMING SOON
            </span>
            <p className="text-sm text-[#6B7280] mb-6 blur-[2px]">
              Analyze your nursing deployment results
            </p>
          </div>
        </div>

        {/* Explore Link */}
        <div className="flex items-center justify-center gap-3 p-5 bg-amber-50 border border-amber-200 rounded-xl max-w-lg mx-auto">
          <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            Don't have results yet?{" "}
            <button 
              onClick={onExplore} 
              className="font-semibold text-[#E85D3F] hover:underline"
              data-testid="link-explore"
            >
              Use Explore
            </button>{" "}
            to project potential ROI.
          </p>
        </div>
      </main>
    </div>
  );
}
