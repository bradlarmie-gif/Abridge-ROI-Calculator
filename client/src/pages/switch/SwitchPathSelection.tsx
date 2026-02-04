import { useState } from "react";
import { Mic, Users, ArrowRight, Sparkles, TrendingUp, Clock, DollarSign, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import abridgeLogoPath from "@assets/abridge-logo-wordmark-red_1769187440253.png";

type PathType = "ambient-ai" | "human-scribes";

interface SwitchPathSelectionProps {
  onSelectPath: (path: PathType) => void;
  onBack: () => void;
}

export default function SwitchPathSelection({ onSelectPath, onBack }: SwitchPathSelectionProps) {
  const [hoveredPath, setHoveredPath] = useState<PathType | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-100/50 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-[#EA2C00]/[0.02] to-transparent pointer-events-none" />
      
      <header className="relative z-10 px-6 md:px-10 py-6 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium"
          data-testid="button-back"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back
        </button>
        <button 
          onClick={() => { window.location.href = '/'; }}
          className="cursor-pointer"
          data-testid="link-logo-home"
        >
          <img src={abridgeLogoPath} alt="Abridge" className="h-6 md:h-7" />
        </button>
        <div className="w-16" />
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-8 md:py-12">
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm text-slate-600 mb-6">
            <Sparkles className="w-4 h-4 text-[#EA2C00]" />
            Ambient Assessment
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 tracking-tight font-abridge uppercase">
            What Are You Using Today?
          </h1>
          
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Tell us your current approach, and we'll show you what's possible.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          <button
            onClick={() => onSelectPath("ambient-ai")}
            onMouseEnter={() => setHoveredPath("ambient-ai")}
            onMouseLeave={() => setHoveredPath(null)}
            className={`group relative bg-white rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden ${
              hoveredPath === "ambient-ai" 
                ? "border-[#EA2C00] shadow-xl shadow-[#EA2C00]/10 scale-[1.02]" 
                : "border-slate-200 hover:border-slate-300 shadow-sm"
            }`}
            data-testid="button-path-ambient"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#EA2C00] to-[#ff6b4a] opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  hoveredPath === "ambient-ai"
                    ? "bg-[#EA2C00] text-white"
                    : "bg-slate-100 text-slate-600 group-hover:bg-[#EA2C00]/10 group-hover:text-[#EA2C00]"
                }`}>
                  <Mic className="w-7 h-7" />
                </div>
                <ChevronRight className={`w-5 h-5 transition-all duration-300 ${
                  hoveredPath === "ambient-ai" 
                    ? "text-[#EA2C00] translate-x-1" 
                    : "text-slate-300 group-hover:text-slate-400"
                }`} />
              </div>
              
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                Ambient AI
              </h2>
              
              <p className="text-slate-500 mb-6 leading-relaxed">
                Using DAX, Ambience, Suki, or another AI documentation tool
              </p>
              
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  What you'll discover
                </p>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                  </div>
                  <span>Your value realization score vs. benchmarks</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-purple-500" />
                  </div>
                  <span>Efficiency gaps across your implementation</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span>The annual value you may be leaving behind</span>
                </div>
              </div>
            </div>
            
            <div className={`px-6 md:px-8 py-4 bg-slate-50 border-t border-slate-100 transition-all duration-300 ${
              hoveredPath === "ambient-ai" ? "bg-[#EA2C00]/5" : ""
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">
                  6-step guided analysis
                </span>
                <span className={`text-sm font-semibold transition-colors ${
                  hoveredPath === "ambient-ai" ? "text-[#EA2C00]" : "text-slate-400"
                }`}>
                  ~5 minutes
                </span>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelectPath("human-scribes")}
            onMouseEnter={() => setHoveredPath("human-scribes")}
            onMouseLeave={() => setHoveredPath(null)}
            className={`group relative bg-white rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden ${
              hoveredPath === "human-scribes" 
                ? "border-slate-800 shadow-xl shadow-slate-800/10 scale-[1.02]" 
                : "border-slate-200 hover:border-slate-300 shadow-sm"
            }`}
            data-testid="button-path-scribes"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-slate-700 to-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  hoveredPath === "human-scribes"
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                }`}>
                  <Users className="w-7 h-7" />
                </div>
                <ChevronRight className={`w-5 h-5 transition-all duration-300 ${
                  hoveredPath === "human-scribes" 
                    ? "text-slate-800 translate-x-1" 
                    : "text-slate-300 group-hover:text-slate-400"
                }`} />
              </div>
              
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                Human Scribes
              </h2>
              
              <p className="text-slate-500 mb-6 leading-relaxed">
                In-person or virtual scribes supporting your providers
              </p>
              
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  What you'll discover
                </p>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Users className="w-4 h-4 text-amber-600" />
                  </div>
                  <span>Your true coverage gap across providers</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-slate-600" />
                  </div>
                  <span>What full coverage would actually cost</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-red-500" />
                  </div>
                  <span>The burden on unsupported providers</span>
                </div>
              </div>
            </div>
            
            <div className={`px-6 md:px-8 py-4 bg-slate-50 border-t border-slate-100 transition-all duration-300 ${
              hoveredPath === "human-scribes" ? "bg-slate-100" : ""
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">
                  2-step program analysis
                </span>
                <span className={`text-sm font-semibold transition-colors ${
                  hoveredPath === "human-scribes" ? "text-slate-800" : "text-slate-400"
                }`}>
                  ~3 minutes
                </span>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Your data stays in your browser. Nothing is stored or shared.
          </p>
        </div>
      </main>
    </div>
  );
}
