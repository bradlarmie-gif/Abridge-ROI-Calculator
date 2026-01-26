import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

import patternA from "@assets/pattern-9-a_1769391110218.png";
import patternBridge from "@assets/pattern-10-bridge_1769391110219.png";
import patternV from "@assets/pattern-3-v_1769391110218.png";
import patternSemicircle from "@assets/pattern-4-semicircle_1769391110218.png";
import patternQuarter from "@assets/pattern-8-quartercircle_1769391110218.png";
import patternCorner from "@assets/pattern-2-corner_1769391110218.png";

interface SplashScreenProps {
  onEnter: () => void;
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <img 
          src={patternV} 
          alt="" 
          className="absolute w-20 md:w-28 opacity-25"
          style={{ 
            top: '8%', 
            left: '5%',
            animation: 'splashFloat1 8s ease-in-out infinite'
          }}
        />
        <img 
          src={patternCorner} 
          alt="" 
          className="absolute w-24 md:w-36 opacity-20"
          style={{ 
            top: '5%', 
            right: '8%',
            transform: 'rotate(180deg)',
            animation: 'splashFloat2 9s ease-in-out infinite'
          }}
        />
        <img 
          src={patternQuarter} 
          alt="" 
          className="absolute w-28 md:w-44 opacity-20"
          style={{ 
            bottom: '8%', 
            left: '8%',
            animation: 'splashFloat3 7s ease-in-out infinite'
          }}
        />
        <img 
          src={patternSemicircle} 
          alt="" 
          className="absolute w-24 md:w-36 opacity-18"
          style={{ 
            bottom: '12%', 
            right: '12%',
            animation: 'splashFloat4 10s ease-in-out infinite'
          }}
        />
        <img 
          src={patternBridge} 
          alt="" 
          className="absolute w-36 md:w-52 opacity-15"
          style={{ 
            top: '35%', 
            left: '3%',
            animation: 'splashFloat5 11s ease-in-out infinite'
          }}
        />
        <img 
          src={patternBridge} 
          alt="" 
          className="absolute w-36 md:w-52 opacity-15"
          style={{ 
            top: '35%', 
            right: '3%',
            transform: 'scaleX(-1)',
            animation: 'splashFloat6 12s ease-in-out infinite'
          }}
        />
        <img 
          src={patternV} 
          alt="" 
          className="absolute w-14 md:w-24 opacity-12"
          style={{ 
            top: '60%', 
            left: '25%',
            animation: 'splashFloat7 9s ease-in-out infinite'
          }}
        />
        <img 
          src={patternCorner} 
          alt="" 
          className="absolute w-20 md:w-28 opacity-12"
          style={{ 
            top: '70%', 
            right: '20%',
            animation: 'splashFloat8 8s ease-in-out infinite'
          }}
        />
        <img 
          src={patternSemicircle} 
          alt="" 
          className="absolute w-16 md:w-24 opacity-10"
          style={{ 
            top: '20%', 
            left: '40%',
            animation: 'splashFloat9 13s ease-in-out infinite'
          }}
        />
        <img 
          src={patternQuarter} 
          alt="" 
          className="absolute w-20 md:w-32 opacity-12"
          style={{ 
            top: '15%', 
            right: '30%',
            animation: 'splashFloat10 10s ease-in-out infinite'
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
              filter: 'drop-shadow(0 0 60px rgba(234, 44, 0, 0.5))',
              animation: 'splashPulse 3s ease-in-out infinite'
            }}
          />
        </div>

        <h1 
          className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
          style={{ textShadow: '0 0 40px rgba(234, 44, 0, 0.3)' }}
        >
          Build A bridge to your value story
        </h1>

        <p className="text-slate-400 text-lg md:text-xl mb-12 max-w-lg mx-auto">
          Discover the ROI of ambient AI documentation
        </p>

        <Button 
          onClick={onEnter}
          size="lg"
          className="bg-[#EA2C00] hover:bg-[#d12700] text-white px-8 py-6 text-lg rounded-lg group"
          data-testid="button-enter-app"
        >
          Get Started
          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>

      <style>{`
        @keyframes splashFloat1 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-35px) rotate(8deg); }
        }
        @keyframes splashFloat2 {
          0%, 100% { transform: translateY(0) rotate(180deg); }
          50% { transform: translateY(-28px) rotate(172deg); }
        }
        @keyframes splashFloat3 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-40px) rotate(-5deg); }
        }
        @keyframes splashFloat4 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-32px); }
        }
        @keyframes splashFloat5 {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(25px); }
        }
        @keyframes splashFloat6 {
          0%, 100% { transform: translateX(0) scaleX(-1); }
          50% { transform: translateX(-25px) scaleX(-1); }
        }
        @keyframes splashFloat7 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-22px) rotate(12deg); }
        }
        @keyframes splashFloat8 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-35px) rotate(-8deg); }
        }
        @keyframes splashFloat9 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-18px); }
        }
        @keyframes splashFloat10 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-38px) rotate(6deg); }
        }
        @keyframes splashPulse {
          0%, 100% { 
            opacity: 1; 
            filter: drop-shadow(0 0 60px rgba(234, 44, 0, 0.5));
          }
          50% { 
            opacity: 0.85; 
            filter: drop-shadow(0 0 80px rgba(234, 44, 0, 0.7));
          }
        }
      `}</style>
    </div>
  );
}
