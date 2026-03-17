import { useState } from "react";
import { Mic, Users, ArrowRight, TrendingUp, DollarSign, Search, BarChart3, Heart, ClipboardList, Compass } from "lucide-react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";

type PathType = "ambient-ai" | "human-scribes" | "nursing";

interface SwitchPathSelectionProps {
  onSelectPath: (path: PathType) => void;
  onBack: () => void;
  onBackToJourney?: () => void;
}

export default function SwitchPathSelection({ onSelectPath, onBack, onBackToJourney }: SwitchPathSelectionProps) {
  const [hoveredPath, setHoveredPath] = useState<PathType | null>(null);

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <UnifiedHeader
        pathType="switch"
        currentStep={1}
        totalSteps={2}
        stepName="Choose Your Path"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-8 md:py-12">
        <div className="text-center mb-12 md:mb-14">
          <p 
            className="text-[9px] font-semibold uppercase tracking-[2px] mb-6"
            style={{ color: '#EA2C00' }}
          >
            ASSESS
          </p>
          
          <h1 className="text-3xl md:text-4xl lg:text-[44px] font-bold text-[#1A1A1A] mb-4 tracking-tight font-abridge uppercase leading-tight">
            Choose Your Assessment
          </h1>
          
          <p className="text-base md:text-lg text-[#666666] max-w-2xl mx-auto leading-relaxed">
            Different starting points need different analyses. Choose the assessment that matches your organization.
          </p>
        </div>

        <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          <button
            onClick={() => onSelectPath("ambient-ai")}
            onMouseEnter={() => setHoveredPath("ambient-ai")}
            onMouseLeave={() => setHoveredPath(null)}
            className="group relative rounded-xl text-left flex flex-col transition-all duration-300"
            style={{
              backgroundColor: '#F5F0EB',
              border: hoveredPath === "ambient-ai" ? '2px solid #EA2C00' : '2px solid transparent',
              borderRadius: '12px',
              padding: '24px',
              minHeight: '280px',
              transform: hoveredPath === "ambient-ai" ? 'translateY(-2px)' : 'translateY(0)',
              boxShadow: hoveredPath === "ambient-ai" ? '0 4px 16px rgba(234,44,0,0.08)' : 'none',
              cursor: 'pointer',
            }}
            data-testid="button-path-ambient"
          >
            <div className="flex items-start justify-between mb-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ 
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <Mic className="w-4 h-4 text-[#1A1A1A]" />
              </div>
              <ArrowRight 
                className="w-4 h-4 transition-all duration-300"
                style={{ 
                  color: '#EA2C00',
                  opacity: hoveredPath === "ambient-ai" ? 1 : 0,
                }} 
              />
            </div>
            
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">
              Ambient Assessment
            </h2>
            
            <p className="text-[13px] text-[#666666] mb-4">
              Your deployment is live. See what it's capturing — and what it isn't.
            </p>
            
            <div className="space-y-2 mb-5">
              <div className="flex items-start gap-2 text-xs text-[#333333]">
                <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TrendingUp className="w-3 h-3 text-blue-500" />
                </div>
                <span>Your maturity score across four value domains</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-[#333333]">
                <div className="w-5 h-5 rounded-md bg-purple-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Search className="w-3 h-3 text-purple-500" />
                </div>
                <span>Confirmed value vs. what hasn't been measured yet</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-[#333333]">
                <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <DollarSign className="w-3 h-3 text-emerald-500" />
                </div>
                <span>What the gap compounds to over 36 months</span>
              </div>
            </div>

            <div className="flex-1" />
            
            <div className="flex items-center justify-between pt-3 border-t border-[#E0E0E0]/50">
              <span className="text-[12px] text-[#999999] font-medium">
                5-step assessment
              </span>
              <span className="text-[12px] text-[#999999] font-medium">
                ~5 min
              </span>
            </div>
          </button>

          <button
            onClick={() => onSelectPath("human-scribes")}
            onMouseEnter={() => setHoveredPath("human-scribes")}
            onMouseLeave={() => setHoveredPath(null)}
            className="group relative rounded-xl text-left flex flex-col transition-all duration-300"
            style={{
              backgroundColor: '#F5F0EB',
              border: hoveredPath === "human-scribes" ? '2px solid #EA2C00' : '2px solid transparent',
              borderRadius: '12px',
              padding: '24px',
              minHeight: '280px',
              transform: hoveredPath === "human-scribes" ? 'translateY(-2px)' : 'translateY(0)',
              boxShadow: hoveredPath === "human-scribes" ? '0 4px 16px rgba(234,44,0,0.08)' : 'none',
              cursor: 'pointer',
            }}
            data-testid="button-path-scribes"
          >
            <div className="flex items-start justify-between mb-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ 
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <Users className="w-4 h-4 text-[#1A1A1A]" />
              </div>
              <ArrowRight 
                className="w-4 h-4 transition-all duration-300"
                style={{ 
                  color: '#EA2C00',
                  opacity: hoveredPath === "human-scribes" ? 1 : 0,
                }} 
              />
            </div>
            
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">
              Human Scribes
            </h2>
            
            <p className="text-[13px] text-[#666666] mb-4">
              In-person or virtual scribe program
            </p>
            
            <div className="space-y-2 mb-5">
              <p 
                className="text-[9px] font-semibold uppercase tracking-[2px]"
                style={{ color: '#EA2C00' }}
              >
                WHAT YOU'LL DISCOVER
              </p>
              <div className="flex items-start gap-2 text-xs text-[#333333]">
                <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <DollarSign className="w-3 h-3 text-amber-600" />
                </div>
                <span>True cost of your scribe program</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-[#333333]">
                <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <BarChart3 className="w-3 h-3 text-slate-600" />
                </div>
                <span>What full coverage would actually cost</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-[#333333]">
                <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Users className="w-3 h-3 text-blue-500" />
                </div>
                <span>100% coverage with and without scribes</span>
              </div>
            </div>

            <div className="flex-1" />
            
            <div className="flex items-center justify-between pt-3 border-t border-[#E0E0E0]/50">
              <span className="text-[12px] text-[#999999] font-medium">
                2-step analysis
              </span>
              <span className="text-[12px] text-[#999999] font-medium">
                ~3 min
              </span>
            </div>
          </button>

          <button
            onClick={() => onSelectPath("nursing")}
            onMouseEnter={() => setHoveredPath("nursing")}
            onMouseLeave={() => setHoveredPath(null)}
            className="group relative rounded-xl text-left flex flex-col transition-all duration-300"
            style={{
              backgroundColor: '#F5F0EB',
              border: hoveredPath === "nursing" ? '2px solid #EA2C00' : '2px solid transparent',
              borderRadius: '12px',
              padding: '24px',
              minHeight: '280px',
              transform: hoveredPath === "nursing" ? 'translateY(-2px)' : 'translateY(0)',
              boxShadow: hoveredPath === "nursing" ? '0 4px 16px rgba(234,44,0,0.08)' : 'none',
              cursor: 'pointer',
            }}
            data-testid="button-path-nursing"
          >
            <div className="flex items-start justify-between mb-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ 
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <Heart className="w-4 h-4 text-[#1A1A1A]" />
              </div>
              <ArrowRight 
                className="w-4 h-4 transition-all duration-300"
                style={{ 
                  color: '#EA2C00',
                  opacity: hoveredPath === "nursing" ? 1 : 0,
                }} 
              />
            </div>
            
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">
              Nursing
            </h2>
            
            <p className="text-[13px] text-[#666666] mb-4">
              Exploring ambient for nursing programs
            </p>
            
            <div className="space-y-2 mb-5">
              <p 
                className="text-[9px] font-semibold uppercase tracking-[2px]"
                style={{ color: '#EA2C00' }}
              >
                WHAT YOU'LL DISCOVER
              </p>
              <div className="flex items-start gap-2 text-xs text-[#333333]">
                <div className="w-5 h-5 rounded-md bg-rose-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ClipboardList className="w-3 h-3 text-rose-500" />
                </div>
                <span>Where burden creates cost and risk</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-[#333333]">
                <div className="w-5 h-5 rounded-md bg-teal-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Compass className="w-3 h-3 text-teal-600" />
                </div>
                <span>Which value pathways matter most</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-[#333333]">
                <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TrendingUp className="w-3 h-3 text-amber-600" />
                </div>
                <span>How to frame the ROI conversation</span>
              </div>
            </div>

            <div className="flex-1" />
            
            <div className="flex items-center justify-between pt-3 border-t border-[#E0E0E0]/50">
              <span className="text-[12px] text-[#999999] font-medium">
                6-step assessment
              </span>
              <span className="text-[12px] text-[#999999] font-medium">
                ~5 min
              </span>
            </div>
          </button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-[#999999] max-w-md mx-auto">
            Your data stays in your browser. Nothing is stored or shared.
          </p>
        </div>
      </main>
    </div>
  );
}
