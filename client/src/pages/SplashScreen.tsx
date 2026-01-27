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
            animation: 'splashFloat1 13s ease-in-out infinite'
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
            animation: 'splashFloat2 16s ease-in-out infinite'
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
            animation: 'splashFloat3 10s ease-in-out infinite'
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
            animation: 'splashFloat4 15s ease-in-out infinite'
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
            animation: 'splashFloat5 18s ease-in-out infinite'
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
            animation: 'splashFloat6 17s ease-in-out infinite'
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
            animation: 'splashFloat7 14s ease-in-out infinite'
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
            animation: 'splashFloat8 12s ease-in-out infinite'
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
            animation: 'splashFloat9 20s ease-in-out infinite'
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
            animation: 'splashFloat10 15s ease-in-out infinite'
          }}
        />
        <img 
          src={patternA} 
          alt="" 
          className="absolute w-16 md:w-24 opacity-35"
          style={{ 
            top: '45%', 
            right: '25%',
            filter: greyFilter,
            animation: 'splashFloat11 16s ease-in-out infinite'
          }}
        />
        <img 
          src={patternCorner} 
          alt="" 
          className="absolute w-14 md:w-20 opacity-25"
          style={{ 
            bottom: '30%', 
            left: '18%',
            filter: greyFilter,
            animation: 'splashFloat12 13s ease-in-out infinite'
          }}
        />
        <img 
          src={patternSemicircle} 
          alt="" 
          className="absolute w-18 md:w-28 opacity-30"
          style={{ 
            top: '75%', 
            left: '45%',
            filter: greyFilter,
            animation: 'splashFloat13 17s ease-in-out infinite'
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
          15% { transform: translate(60px, -40px) rotate(8deg); }
          35% { transform: translate(120px, 30px) rotate(-5deg); }
          55% { transform: translate(80px, -80px) rotate(12deg); }
          75% { transform: translate(-30px, -50px) rotate(-3deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes splashFloat2 {
          0% { transform: translate(0, 0) rotate(180deg); }
          20% { transform: translate(-80px, 50px) rotate(190deg); }
          45% { transform: translate(-140px, -30px) rotate(170deg); }
          70% { transform: translate(-60px, -90px) rotate(185deg); }
          100% { transform: translate(0, 0) rotate(180deg); }
        }
        @keyframes splashFloat3 {
          0% { transform: translate(0, 0) rotate(0deg); }
          18% { transform: translate(90px, 60px) rotate(-8deg); }
          36% { transform: translate(40px, -70px) rotate(6deg); }
          54% { transform: translate(-50px, -120px) rotate(-12deg); }
          72% { transform: translate(-100px, -40px) rotate(4deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes splashFloat4 {
          0% { transform: translate(0, 0); }
          25% { transform: translate(-100px, 70px); }
          50% { transform: translate(-60px, -80px); }
          75% { transform: translate(50px, -40px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes splashFloat5 {
          0% { transform: translate(0, 0); }
          20% { transform: translate(80px, -60px); }
          40% { transform: translate(140px, 20px); }
          60% { transform: translate(100px, 80px); }
          80% { transform: translate(30px, 50px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes splashFloat6 {
          0% { transform: translate(0, 0) scaleX(-1); }
          30% { transform: translate(-90px, -70px) scaleX(-1); }
          60% { transform: translate(-50px, 60px) scaleX(-1); }
          100% { transform: translate(0, 0) scaleX(-1); }
        }
        @keyframes splashFloat7 {
          0% { transform: translate(0, 0) rotate(0deg); }
          22% { transform: translate(-70px, 80px) rotate(15deg); }
          44% { transform: translate(40px, 120px) rotate(-10deg); }
          66% { transform: translate(100px, 50px) rotate(20deg); }
          88% { transform: translate(60px, -30px) rotate(-5deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes splashFloat8 {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(70px, -100px) rotate(-12deg); }
          50% { transform: translate(-40px, -140px) rotate(8deg); }
          75% { transform: translate(-90px, -60px) rotate(-6deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes splashFloat9 {
          0% { transform: translate(0, 0); }
          17% { transform: translate(-60px, -50px); }
          34% { transform: translate(30px, -110px); }
          51% { transform: translate(100px, -70px); }
          68% { transform: translate(80px, 20px); }
          85% { transform: translate(20px, 40px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes splashFloat10 {
          0% { transform: translate(0, 0) rotate(0deg); }
          20% { transform: translate(-80px, 40px) rotate(10deg); }
          40% { transform: translate(-120px, -50px) rotate(-8deg); }
          60% { transform: translate(-50px, -100px) rotate(15deg); }
          80% { transform: translate(30px, -60px) rotate(-5deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes splashFloat11 {
          0% { transform: translate(0, 0) rotate(0deg); }
          28% { transform: translate(-90px, -80px) rotate(-15deg); }
          56% { transform: translate(20px, -130px) rotate(10deg); }
          84% { transform: translate(70px, -50px) rotate(-8deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes splashFloat12 {
          0% { transform: translate(0, 0) rotate(90deg); }
          25% { transform: translate(80px, 60px) rotate(105deg); }
          50% { transform: translate(50px, -70px) rotate(75deg); }
          75% { transform: translate(-40px, -40px) rotate(100deg); }
          100% { transform: translate(0, 0) rotate(90deg); }
        }
        @keyframes splashFloat13 {
          0% { transform: translate(0, 0); }
          18% { transform: translate(-70px, 50px); }
          36% { transform: translate(-110px, -40px); }
          54% { transform: translate(-40px, -100px); }
          72% { transform: translate(40px, -70px); }
          90% { transform: translate(30px, -20px); }
          100% { transform: translate(0, 0); }
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
