import { useState } from "react";
import { Mic, Users, ArrowRight, TrendingUp, DollarSign, Search, BarChart3 } from "lucide-react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";

type PathType = "ambient-ai" | "human-scribes";

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

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8 md:py-12">
        <div className="text-center mb-12 md:mb-14">
          <p 
            className="text-[9px] font-semibold uppercase tracking-[2px] mb-6"
            style={{ color: '#EA2C00' }}
          >
            SWITCH PATH
          </p>
          
          <h1 className="text-3xl md:text-4xl lg:text-[44px] font-bold text-[#1A1A1A] mb-4 tracking-tight font-abridge uppercase leading-tight">
            Let's Look at Your Current Approach
          </h1>
          
          <p className="text-base md:text-lg text-[#666666] max-w-2xl mx-auto leading-relaxed">
            Different starting points need different analyses. Choose the path that matches your organization.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => onSelectPath("ambient-ai")}
            onMouseEnter={() => setHoveredPath("ambient-ai")}
            onMouseLeave={() => setHoveredPath(null)}
            className="group relative rounded-xl text-left flex flex-col transition-all duration-300"
            style={{
              backgroundColor: '#F5F0EB',
              border: hoveredPath === "ambient-ai" ? '2px solid #EA2C00' : '2px solid transparent',
              borderRadius: '12px',
              padding: '28px',
              minHeight: '280px',
              transform: hoveredPath === "ambient-ai" ? 'translateY(-2px)' : 'translateY(0)',
              boxShadow: hoveredPath === "ambient-ai" ? '0 4px 16px rgba(234,44,0,0.08)' : 'none',
              cursor: 'pointer',
            }}
            data-testid="button-path-ambient"
          >
            <div className="flex items-start justify-between mb-4">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ 
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <Mic className="w-5 h-5 text-[#1A1A1A]" />
              </div>
              <ArrowRight 
                className="w-4 h-4 transition-all duration-300"
                style={{ 
                  color: '#EA2C00',
                  opacity: hoveredPath === "ambient-ai" ? 1 : 0,
                }} 
              />
            </div>
            
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">
              Ambient AI
            </h2>
            
            <p className="text-[13px] text-[#666666] mb-5">
              Currently using an AI documentation solution
            </p>
            
            <div className="space-y-2.5 mb-5">
              <p 
                className="text-[9px] font-semibold uppercase tracking-[2px]"
                style={{ color: '#EA2C00' }}
              >
                WHAT YOU'LL DISCOVER
              </p>
              <div className="flex items-center gap-2.5 text-xs text-[#333333]">
                <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-3 h-3 text-blue-500" />
                </div>
                <span>How your implementation compares to what we typically see</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#333333]">
                <div className="w-6 h-6 rounded-md bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Search className="w-3 h-3 text-purple-500" />
                </div>
                <span>Where the gaps are — and what's driving them</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#333333]">
                <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-3 h-3 text-emerald-500" />
                </div>
                <span>The annual value opportunity ahead</span>
              </div>
            </div>

            <div className="flex-1" />
            
            <div className="flex items-center justify-between pt-4 border-t border-[#E0E0E0]/50">
              <span className="text-[10px] text-[#999999] font-medium">
                6-step guided analysis
              </span>
              <span className="text-[10px] text-[#999999] font-medium">
                ~5 minutes
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
              padding: '28px',
              minHeight: '280px',
              transform: hoveredPath === "human-scribes" ? 'translateY(-2px)' : 'translateY(0)',
              boxShadow: hoveredPath === "human-scribes" ? '0 4px 16px rgba(234,44,0,0.08)' : 'none',
              cursor: 'pointer',
            }}
            data-testid="button-path-scribes"
          >
            <div className="flex items-start justify-between mb-4">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ 
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <Users className="w-5 h-5 text-[#1A1A1A]" />
              </div>
              <ArrowRight 
                className="w-4 h-4 transition-all duration-300"
                style={{ 
                  color: '#EA2C00',
                  opacity: hoveredPath === "human-scribes" ? 1 : 0,
                }} 
              />
            </div>
            
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">
              Human Scribes
            </h2>
            
            <p className="text-[13px] text-[#666666] mb-5">
              In-person or virtual scribe program
            </p>
            
            <div className="space-y-2.5 mb-5">
              <p 
                className="text-[9px] font-semibold uppercase tracking-[2px]"
                style={{ color: '#EA2C00' }}
              >
                WHAT YOU'LL DISCOVER
              </p>
              <div className="flex items-center gap-2.5 text-xs text-[#333333]">
                <div className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-3 h-3 text-amber-600" />
                </div>
                <span>The true cost of your scribe program — including hidden overhead</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#333333]">
                <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-3 h-3 text-slate-600" />
                </div>
                <span>What full coverage would actually cost</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#333333]">
                <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Users className="w-3 h-3 text-blue-500" />
                </div>
                <span>What 100% coverage would look like — with and without scribes</span>
              </div>
            </div>

            <div className="flex-1" />
            
            <div className="flex items-center justify-between pt-4 border-t border-[#E0E0E0]/50">
              <span className="text-[10px] text-[#999999] font-medium">
                2-step program analysis
              </span>
              <span className="text-[10px] text-[#999999] font-medium">
                ~3 minutes
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
