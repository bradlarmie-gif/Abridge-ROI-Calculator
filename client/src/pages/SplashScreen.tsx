import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

import patternA from "@assets/pattern-9-a_1769391110218.png";

interface SplashScreenProps {
  onEnter: () => void;
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#1A1A1A] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img
          src="/abridge-pattern.png"
          alt=""
          className="absolute"
          style={{
            width: "500px",
            height: "500px",
            top: "-100px",
            right: "-100px",
            filter: "brightness(0.25) saturate(0)",
            opacity: 0.6,
            animation: "splashFloat1 30s ease-in-out infinite",
          }}
        />
        <img
          src="/abridge-pattern.png"
          alt=""
          className="absolute"
          style={{
            width: "600px",
            height: "600px",
            bottom: "-150px",
            left: "-150px",
            filter: "brightness(0.25) saturate(0)",
            opacity: 0.5,
            animation: "splashFloat2 35s ease-in-out infinite",
          }}
        />
        <img
          src="/abridge-pattern.png"
          alt=""
          className="absolute"
          style={{
            width: "300px",
            height: "300px",
            top: "50%",
            right: "-100px",
            filter: "brightness(0.25) saturate(0)",
            opacity: 0.3,
            animation: "splashFloat3 25s ease-in-out infinite",
          }}
        />
      </div>

      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
        <div className="mb-12 flex justify-center">
          <img
            src={patternA}
            alt="Abridge"
            className="w-24 md:w-32"
            style={{
              animation: "splashLogoEnter 0.3s ease-out forwards, splashPulse 3s ease-in-out 0.3s infinite",
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
        @keyframes splashFloat1 {
          0% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-15px, 10px) rotate(1deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes splashFloat2 {
          0% { transform: rotate(180deg) translate(0, 0); }
          50% { transform: rotate(180deg) translate(10px, -12px); }
          100% { transform: rotate(180deg) translate(0, 0); }
        }
        @keyframes splashFloat3 {
          0% { transform: rotate(90deg) translate(0, 0); }
          50% { transform: rotate(90deg) translate(-8px, 8px); }
          100% { transform: rotate(90deg) translate(0, 0); }
        }
        @keyframes splashLogoEnter {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splashPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}
