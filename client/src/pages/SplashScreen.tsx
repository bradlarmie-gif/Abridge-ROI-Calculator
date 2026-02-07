import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

import patternA from "@assets/pattern-9-a_1769391110218.png";

interface SplashScreenProps {
  onEnter: () => void;
}

interface FloatingShape {
  id: number;
  size: number;
  top: string;
  left: string;
  opacity: number;
  rotation: number;
  animDuration: number;
  animDelay: number;
}

const shapes: FloatingShape[] = [
  { id: 1, size: 80, top: '5%', left: '3%', opacity: 0.08, rotation: 0, animDuration: 25, animDelay: 0 },
  { id: 2, size: 120, top: '8%', left: '75%', opacity: 0.06, rotation: 90, animDuration: 30, animDelay: -5 },
  { id: 3, size: 60, top: '20%', left: '20%', opacity: 0.07, rotation: 180, animDuration: 22, animDelay: -8 },
  { id: 4, size: 100, top: '15%', left: '88%', opacity: 0.05, rotation: 270, animDuration: 28, animDelay: -3 },
  { id: 5, size: 140, top: '35%', left: '-2%', opacity: 0.06, rotation: 90, animDuration: 35, animDelay: -12 },
  { id: 6, size: 90, top: '40%', left: '85%', opacity: 0.07, rotation: 180, animDuration: 26, animDelay: -7 },
  { id: 7, size: 70, top: '55%', left: '10%', opacity: 0.05, rotation: 270, animDuration: 32, animDelay: -15 },
  { id: 8, size: 110, top: '60%', left: '70%', opacity: 0.06, rotation: 0, animDuration: 29, animDelay: -10 },
  { id: 9, size: 65, top: '75%', left: '30%', opacity: 0.07, rotation: 90, animDuration: 24, animDelay: -4 },
  { id: 10, size: 130, top: '78%', left: '80%', opacity: 0.05, rotation: 180, animDuration: 33, animDelay: -18 },
  { id: 11, size: 85, top: '88%', left: '5%', opacity: 0.06, rotation: 0, animDuration: 27, animDelay: -9 },
  { id: 12, size: 50, top: '50%', left: '45%', opacity: 0.04, rotation: 270, animDuration: 31, animDelay: -14 },
  { id: 13, size: 95, top: '3%', left: '45%', opacity: 0.05, rotation: 180, animDuration: 28, animDelay: -6 },
  { id: 14, size: 75, top: '68%', left: '55%', opacity: 0.06, rotation: 90, animDuration: 23, animDelay: -11 },
  { id: 15, size: 55, top: '30%', left: '55%', opacity: 0.04, rotation: 0, animDuration: 34, animDelay: -16 },
];

function QuarterCircle({ size, rotation, opacity }: { size: number; rotation: number; opacity: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ opacity }}
    >
      <path
        d="M 0 0 L 100 0 Q 100 100 0 100 Z"
        fill="white"
        transform={`rotate(${rotation} 50 50)`}
      />
    </svg>
  );
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#1A1A1A] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        {shapes.map((shape) => (
          <div
            key={shape.id}
            className="absolute"
            style={{
              top: shape.top,
              left: shape.left,
              animation: `shapeFloat${shape.id % 4} ${shape.animDuration}s ease-in-out ${shape.animDelay}s infinite`,
            }}
          >
            <QuarterCircle size={shape.size} rotation={shape.rotation} opacity={shape.opacity} />
          </div>
        ))}
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
        @keyframes shapeFloat0 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(30px, -20px) rotate(3deg); }
          50% { transform: translate(-15px, -35px) rotate(-2deg); }
          75% { transform: translate(-25px, 10px) rotate(4deg); }
        }
        @keyframes shapeFloat1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          20% { transform: translate(-25px, 15px) rotate(-3deg); }
          45% { transform: translate(20px, 30px) rotate(2deg); }
          70% { transform: translate(35px, -10px) rotate(-4deg); }
        }
        @keyframes shapeFloat2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          30% { transform: translate(15px, 25px) rotate(4deg); }
          60% { transform: translate(-30px, -15px) rotate(-3deg); }
          85% { transform: translate(-10px, -30px) rotate(2deg); }
        }
        @keyframes shapeFloat3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          35% { transform: translate(-20px, -25px) rotate(-2deg); }
          55% { transform: translate(25px, -20px) rotate(3deg); }
          80% { transform: translate(10px, 20px) rotate(-4deg); }
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
