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

const greyFilter = 'grayscale(100%) brightness(0.6)';

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <img 
          src={patternV} 
          alt="" 
          className="absolute w-20 md:w-28 opacity-50"
          style={{ 
            top: '8%', 
            left: '5%',
            filter: greyFilter,
            animation: 'splashFloat1 11s ease-in-out infinite'
          }}
        />
        <img 
          src={patternCorner} 
          alt="" 
          className="absolute w-24 md:w-36 opacity-40"
          style={{ 
            top: '5%', 
            right: '8%',
            filter: greyFilter,
            animation: 'splashFloat2 14s ease-in-out infinite'
          }}
        />
        <img 
          src={patternQuarter} 
          alt="" 
          className="absolute w-28 md:w-44 opacity-45"
          style={{ 
            bottom: '8%', 
            left: '8%',
            filter: greyFilter,
            animation: 'splashFloat3 9s ease-in-out infinite'
          }}
        />
        <img 
          src={patternSemicircle} 
          alt="" 
          className="absolute w-24 md:w-36 opacity-40"
          style={{ 
            bottom: '12%', 
            right: '12%',
            filter: greyFilter,
            animation: 'splashFloat4 13s ease-in-out infinite'
          }}
        />
        <img 
          src={patternBridge} 
          alt="" 
          className="absolute w-36 md:w-52 opacity-35"
          style={{ 
            top: '35%', 
            left: '3%',
            filter: greyFilter,
            animation: 'splashFloat5 16s ease-in-out infinite'
          }}
        />
        <img 
          src={patternBridge} 
          alt="" 
          className="absolute w-36 md:w-52 opacity-35"
          style={{ 
            top: '35%', 
            right: '3%',
            filter: greyFilter,
            animation: 'splashFloat6 15s ease-in-out infinite'
          }}
        />
        <img 
          src={patternV} 
          alt="" 
          className="absolute w-14 md:w-24 opacity-30"
          style={{ 
            top: '60%', 
            left: '25%',
            filter: greyFilter,
            animation: 'splashFloat7 12s ease-in-out infinite'
          }}
        />
        <img 
          src={patternCorner} 
          alt="" 
          className="absolute w-20 md:w-28 opacity-30"
          style={{ 
            top: '70%', 
            right: '20%',
            filter: greyFilter,
            animation: 'splashFloat8 10s ease-in-out infinite'
          }}
        />
        <img 
          src={patternSemicircle} 
          alt="" 
          className="absolute w-16 md:w-24 opacity-25"
          style={{ 
            top: '20%', 
            left: '40%',
            filter: greyFilter,
            animation: 'splashFloat9 17s ease-in-out infinite'
          }}
        />
        <img 
          src={patternQuarter} 
          alt="" 
          className="absolute w-20 md:w-32 opacity-30"
          style={{ 
            top: '15%', 
            right: '30%',
            filter: greyFilter,
            animation: 'splashFloat10 13s ease-in-out infinite'
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
          className="bg-[#EA2C00] hover:bg-[#d12700] text-white px-8 py-3 text-lg rounded-lg group"
          data-testid="button-enter-app"
        >
          Get Started
          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>

      <style>{`
        @keyframes splashFloat1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(15px, -25px) rotate(3deg); }
          50% { transform: translate(-10px, -45px) rotate(-2deg); }
          75% { transform: translate(20px, -20px) rotate(4deg); }
        }
        @keyframes splashFloat2 {
          0%, 100% { transform: translate(0, 0) rotate(180deg); }
          33% { transform: translate(-20px, -35px) rotate(175deg); }
          66% { transform: translate(15px, -50px) rotate(185deg); }
        }
        @keyframes splashFloat3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          20% { transform: translate(25px, -30px) rotate(-3deg); }
          40% { transform: translate(10px, -55px) rotate(2deg); }
          60% { transform: translate(-15px, -40px) rotate(-4deg); }
          80% { transform: translate(-5px, -20px) rotate(1deg); }
        }
        @keyframes splashFloat4 {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-25px, -20px); }
          50% { transform: translate(-15px, -45px); }
          75% { transform: translate(10px, -30px); }
        }
        @keyframes splashFloat5 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(30px, -15px); }
          66% { transform: translate(20px, 20px); }
        }
        @keyframes splashFloat6 {
          0%, 100% { transform: translate(0, 0) scaleX(-1); }
          33% { transform: translate(-30px, 15px) scaleX(-1); }
          66% { transform: translate(-20px, -25px) scaleX(-1); }
        }
        @keyframes splashFloat7 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-20px, -15px) rotate(8deg); }
          50% { transform: translate(10px, -35px) rotate(-5deg); }
          75% { transform: translate(25px, -20px) rotate(10deg); }
        }
        @keyframes splashFloat8 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(15px, -40px) rotate(-6deg); }
          66% { transform: translate(-20px, -25px) rotate(8deg); }
        }
        @keyframes splashFloat9 {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-15px, -20px); }
          40% { transform: translate(10px, -35px); }
          60% { transform: translate(25px, -25px); }
          80% { transform: translate(5px, -10px); }
        }
        @keyframes splashFloat10 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-25px, -30px) rotate(5deg); }
          50% { transform: translate(5px, -50px) rotate(-3deg); }
          75% { transform: translate(20px, -35px) rotate(7deg); }
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
