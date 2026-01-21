import { ArrowRight, Stethoscope, Building2, Users, Heart, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExpandSettingSelectionProps {
  onNext: () => void;
  onExplore: () => void;
  onBack?: () => void;
}

export default function ExpandSettingSelection({ onNext, onExplore, onBack }: ExpandSettingSelectionProps) {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
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
            <span className="text-lg font-bold text-[#EA2C00] tracking-tight">ABRIDGE</span>
            <span className="text-neutral-300">|</span>
            <span className="text-sm text-[#6B7280]">ROI Calculator</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-[#111827] mb-3" data-testid="text-page-title">
            Analyze Your Results
          </h1>
          <p className="text-lg text-[#6B7280]">
            See how your Abridge deployment is performing and model expansion
          </p>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Outpatient - Active */}
          <div 
            className="relative bg-white rounded-2xl border-2 border-[#f97316] p-8 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            onClick={onNext}
            data-testid="setting-outpatient"
          >
            <div className="w-14 h-14 rounded-xl bg-orange-50 flex items-center justify-center mb-4">
              <Stethoscope className="w-7 h-7 text-[#f97316]" />
            </div>
            <h3 className="text-xl font-semibold text-[#111827] mb-2">Outpatient</h3>
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full mb-3 tracking-wide">
              AVAILABLE
            </span>
            <p className="text-sm text-[#6B7280] mb-6">
              Analyze your outpatient clinic results and model expansion across your organization.
            </p>
            <Button className="w-full gap-2" data-testid="button-load-results">
              Load Your Results
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* ED - Coming Soon */}
          <div className="relative bg-white rounded-2xl border border-neutral-200 p-8 opacity-70">
            <div className="w-14 h-14 rounded-xl bg-neutral-100 flex items-center justify-center mb-4">
              <Building2 className="w-7 h-7 text-neutral-400" />
            </div>
            <h3 className="text-xl font-semibold text-[#111827] mb-2">Emergency Department</h3>
            <span className="inline-block px-3 py-1 bg-neutral-100 text-neutral-500 text-xs font-semibold rounded-full mb-3 tracking-wide">
              COMING SOON
            </span>
            <p className="text-sm text-[#6B7280] mb-6 blur-[3px]">
              Analyze your ED deployment results.
            </p>
            {/* Overlay */}
            <div className="absolute inset-0 bg-white/60 rounded-2xl flex items-center justify-center">
              <span className="bg-neutral-100 px-4 py-2 rounded-full text-xs font-semibold text-neutral-600">
                Coming Q2 2025
              </span>
            </div>
          </div>

          {/* Inpatient - Coming Soon */}
          <div className="relative bg-white rounded-2xl border border-neutral-200 p-8 opacity-70">
            <div className="w-14 h-14 rounded-xl bg-neutral-100 flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-neutral-400" />
            </div>
            <h3 className="text-xl font-semibold text-[#111827] mb-2">Inpatient</h3>
            <span className="inline-block px-3 py-1 bg-neutral-100 text-neutral-500 text-xs font-semibold rounded-full mb-3 tracking-wide">
              COMING SOON
            </span>
            <p className="text-sm text-[#6B7280] mb-6 blur-[3px]">
              Analyze your inpatient deployment results.
            </p>
            {/* Overlay */}
            <div className="absolute inset-0 bg-white/60 rounded-2xl flex items-center justify-center">
              <span className="bg-neutral-100 px-4 py-2 rounded-full text-xs font-semibold text-neutral-600">
                Coming Q2 2025
              </span>
            </div>
          </div>

          {/* Nursing - Coming Soon */}
          <div className="relative bg-white rounded-2xl border border-neutral-200 p-8 opacity-70">
            <div className="w-14 h-14 rounded-xl bg-neutral-100 flex items-center justify-center mb-4">
              <Heart className="w-7 h-7 text-neutral-400" />
            </div>
            <h3 className="text-xl font-semibold text-[#111827] mb-2">Nursing</h3>
            <span className="inline-block px-3 py-1 bg-neutral-100 text-neutral-500 text-xs font-semibold rounded-full mb-3 tracking-wide">
              COMING SOON
            </span>
            <p className="text-sm text-[#6B7280] mb-6 blur-[3px]">
              Analyze your nursing deployment results.
            </p>
            {/* Overlay */}
            <div className="absolute inset-0 bg-white/60 rounded-2xl flex items-center justify-center">
              <span className="bg-neutral-100 px-4 py-2 rounded-full text-xs font-semibold text-neutral-600">
                Coming Q3 2025
              </span>
            </div>
          </div>
        </div>

        {/* Explore Link */}
        <div className="flex items-center justify-center gap-3 p-5 bg-amber-50 border border-amber-200 rounded-xl max-w-lg mx-auto">
          <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            Don't have results yet?{" "}
            <button 
              onClick={onExplore} 
              className="font-semibold text-[#EA2C00] hover:underline"
              data-testid="link-explore"
            >
              Use Explore
            </button>{" "}
            to project potential ROI before you deploy.
          </p>
        </div>
      </main>
    </div>
  );
}
