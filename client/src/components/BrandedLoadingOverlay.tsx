import { useState, useEffect } from "react";

import patternA from "@assets/pattern-9-a_1769391110218.png";
import patternBridge from "@assets/pattern-10-bridge_1769391110219.png";
import patternV from "@assets/pattern-3-v_1769391110218.png";
import patternSemicircle from "@assets/pattern-4-semicircle_1769391110218.png";
import patternQuarter from "@assets/pattern-8-quartercircle_1769391110218.png";
import patternCorner from "@assets/pattern-2-corner_1769391110218.png";

interface BrandedLoadingOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
  duration?: number;
  subtitle?: string;
}

export function BrandedLoadingOverlay({ 
  isVisible, 
  onComplete, 
  duration = 3200,
  subtitle = "Preparing your results"
}: BrandedLoadingOverlayProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      return;
    }

    const increment = 1.2;
    const interval = 35;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + increment;
      });
    }, interval);

    const redirectTimeout = setTimeout(() => {
      onComplete();
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(redirectTimeout);
    };
  }, [isVisible, onComplete, duration]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden animate-in fade-in duration-300">
      <div className="absolute inset-0 pointer-events-none">
        <img 
          src={patternV} 
          alt="" 
          className="absolute w-16 md:w-24 opacity-40 animate-pulse"
          style={{ 
            top: '10%', 
            left: '-5%',
            animation: 'floatRight 3s ease-in-out forwards'
          }}
        />
        <img 
          src={patternCorner} 
          alt="" 
          className="absolute w-20 md:w-32 opacity-30"
          style={{ 
            top: '5%', 
            right: '-10%',
            animation: 'floatLeft 3.5s ease-in-out forwards',
            transform: 'rotate(180deg)'
          }}
        />
        <img 
          src={patternQuarter} 
          alt="" 
          className="absolute w-24 md:w-40 opacity-35"
          style={{ 
            bottom: '5%', 
            left: '5%',
            animation: 'floatUp 2.8s ease-in-out forwards'
          }}
        />
        <img 
          src={patternSemicircle} 
          alt="" 
          className="absolute w-20 md:w-32 opacity-30"
          style={{ 
            bottom: '10%', 
            right: '10%',
            animation: 'floatUp 3.2s ease-in-out forwards'
          }}
        />
        <img 
          src={patternBridge} 
          alt="" 
          className="absolute w-32 md:w-48 opacity-25"
          style={{ 
            top: '40%', 
            left: '-20%',
            animation: 'slideFromLeft 2s ease-out forwards'
          }}
        />
        <img 
          src={patternBridge} 
          alt="" 
          className="absolute w-32 md:w-48 opacity-25"
          style={{ 
            top: '40%', 
            right: '-20%',
            transform: 'scaleX(-1)',
            animation: 'slideFromRight 2s ease-out forwards'
          }}
        />
      </div>

      <div className="relative max-w-lg mx-4 text-center animate-in slide-in-from-bottom-4 duration-500 z-10">
        <div className="relative mb-8 flex justify-center">
          <img 
            src={patternA} 
            alt="Abridge" 
            className="w-28 md:w-36 animate-pulse"
            style={{ 
              filter: 'drop-shadow(0 0 40px rgba(234, 44, 0, 0.4))'
            }}
          />
        </div>

        <h2 className="text-3xl md:text-4xl font-bold text-white mb-10">
          Building Your Bridge to Value
        </h2>

        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
          <div 
            className="h-full rounded-full transition-all duration-100 ease-out"
            style={{ 
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #EA2C00, #ff4d1a, #EA2C00)'
            }}
          />
        </div>

        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
          <div className="w-2 h-2 bg-[#EA2C00] rounded-full animate-pulse" />
          <span>{subtitle}</span>
        </div>
      </div>

      <style>{`
        @keyframes floatRight {
          0% { transform: translateX(0) rotate(0deg); opacity: 0; }
          20% { opacity: 0.4; }
          100% { transform: translateX(120px) rotate(5deg); opacity: 0.5; }
        }
        @keyframes floatLeft {
          0% { transform: translateX(0) rotate(180deg); opacity: 0; }
          20% { opacity: 0.3; }
          100% { transform: translateX(-100px) rotate(175deg); opacity: 0.4; }
        }
        @keyframes floatUp {
          0% { transform: translateY(0); opacity: 0; }
          20% { opacity: 0.35; }
          100% { transform: translateY(-60px); opacity: 0.45; }
        }
        @keyframes slideFromLeft {
          0% { transform: translateX(-100%); opacity: 0; }
          100% { transform: translateX(80px); opacity: 0.35; }
        }
        @keyframes slideFromRight {
          0% { transform: translateX(100%) scaleX(-1); opacity: 0; }
          100% { transform: translateX(-80px) scaleX(-1); opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
