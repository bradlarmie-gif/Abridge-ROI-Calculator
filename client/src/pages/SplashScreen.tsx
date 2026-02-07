import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

import brandShape from "@assets/IMG_0419_1770480513063.png";
import patternA from "@assets/pattern-9-a_1769391110218.png";

interface SplashScreenProps {
  onEnter: () => void;
}

const greyFilter = 'grayscale(100%) brightness(0.6)';

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <img 
          src={brandShape} 
          alt="" 
          className="absolute w-[120px] md:w-[168px] opacity-50"
          style={{ 
            top: '8%', 
            left: '5%',
            filter: greyFilter,
            animation: 'splashFloat1 13s ease-in-out infinite'
          }}
        />
        <img 
          src={brandShape} 
          alt="" 
          className="absolute w-[144px] md:w-[216px] opacity-40"
          style={{ 
            top: '5%', 
            right: '8%',
            filter: greyFilter,
            animation: 'splashFloat2 16s ease-in-out infinite'
          }}
        />
        <img 
          src={brandShape} 
          alt="" 
          className="absolute w-[168px] md:w-[264px] opacity-45"
          style={{ 
            bottom: '8%', 
            left: '8%',
            filter: greyFilter,
            animation: 'splashFloat3 10s ease-in-out infinite'
          }}
        />
        <img 
          src={brandShape} 
          alt="" 
          className="absolute w-[216px] md:w-[312px] opacity-35"
          style={{ 
            top: '35%', 
            left: '3%',
            filter: greyFilter,
            animation: 'splashFloat5 18s ease-in-out infinite'
          }}
        />
        <img 
          src={brandShape} 
          alt="" 
          className="absolute w-[216px] md:w-[312px] opacity-35"
          style={{ 
            top: '35%', 
            right: '3%',
            filter: greyFilter,
            animation: 'splashFloat6 17s ease-in-out infinite'
          }}
        />
        <img 
          src={brandShape} 
          alt="" 
          className="absolute w-[120px] md:w-[168px] opacity-30"
          style={{ 
            top: '70%', 
            right: '20%',
            filter: greyFilter,
            animation: 'splashFloat8 12s ease-in-out infinite'
          }}
        />
        <img 
          src={brandShape} 
          alt="" 
          className="absolute w-[120px] md:w-[192px] opacity-30"
          style={{ 
            top: '15%', 
            right: '30%',
            filter: greyFilter,
            animation: 'splashFloat10 15s ease-in-out infinite'
          }}
        />
        <img 
          src={brandShape} 
          alt="" 
          className="absolute w-[96px] md:w-[144px] opacity-35"
          style={{ 
            top: '45%', 
            right: '25%',
            filter: greyFilter,
            animation: 'splashFloat11 16s ease-in-out infinite'
          }}
        />
        <img 
          src={brandShape} 
          alt="" 
          className="absolute w-[108px] md:w-[168px] opacity-30"
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
        @keyframes splashFloat8 {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(70px, -100px) rotate(-12deg); }
          50% { transform: translate(-40px, -140px) rotate(8deg); }
          75% { transform: translate(-90px, -60px) rotate(-6deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
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
        @keyframes splashFloat13 {
          0% { transform: translate(0, 0); }
          18% { transform: translate(-70px, 50px); }
          36% { transform: translate(-110px, -40px); }
          54% { transform: translate(-40px, -100px); }
          72% { transform: translate(40px, -70px); }
          90% { transform: translate(30px, -20px); }
          100% { transform: translate(0, 0); }
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
