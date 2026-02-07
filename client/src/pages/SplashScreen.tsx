import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

import patternA from "@assets/pattern-9-a_1769391110218.png";

interface SplashScreenProps {
  onEnter: () => void;
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#1A1A1A] overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "url('/abridge-pattern.png')",
          backgroundSize: "400px 400px",
          backgroundRepeat: "repeat",
          filter: "grayscale(100%) brightness(0.18)",
          opacity: 0.12,
          animation: "patternDrift 60s linear infinite, patternBreathe 20s ease-in-out infinite",
        }}
      />

      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
        <div className="mb-12 flex justify-center">
          <img 
            src={patternA} 
            alt="Abridge" 
            className="w-24 md:w-32"
            style={{ 
              animation: 'splashLogoEnter 0.3s ease-out forwards, splashPulse 3s ease-in-out 0.3s infinite'
            }}
          />
        </div>

        <h1 
          className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight font-abridge uppercase"
        >
          Build Your Value Story
        </h1>

        <p className="text-slate-400 text-lg md:text-xl mb-12 max-w-lg mx-auto">
          Discover the ROI of ambient AI documentation
        </p>

        <Button 
          onClick={onEnter}
          size="lg"
          className="bg-[#4B5563] hover:bg-[#374151] text-white px-8 py-3 text-lg rounded-lg group border border-white/30 focus:ring-2 focus:ring-white focus:ring-offset-0 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-0"
          data-testid="button-enter-app"
        >
          Get Started
          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>

      <style>{`
        @keyframes patternDrift {
          0% { background-position: 0px 0px; }
          100% { background-position: 400px 400px; }
        }
        @keyframes patternBreathe {
          0%, 100% { 
            background-size: 400px 400px;
            opacity: 0.10;
          }
          50% { 
            background-size: 420px 420px;
            opacity: 0.14;
          }
        }
        @keyframes splashLogoEnter {
          0% { 
            opacity: 0; 
            transform: scale(0.8);
          }
          100% { 
            opacity: 1; 
            transform: scale(1);
          }
        }
        @keyframes splashPulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
          }
          50% { 
            opacity: 0.85; 
            transform: scale(1.02);
          }
        }
      `}</style>
    </div>
  );
}
