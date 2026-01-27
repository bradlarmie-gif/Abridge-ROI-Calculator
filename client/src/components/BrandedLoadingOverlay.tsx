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
}

export function BrandedLoadingOverlay({ 
  isVisible, 
  onComplete, 
  duration = 3200
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden animate-in fade-in duration-300" style={{ backgroundColor: '#f8f9fa' }}>
      <div className="absolute inset-0 pointer-events-none">
        <img 
          src={patternV} 
          alt="" 
          className="absolute w-16 md:w-24"
          style={{ 
            top: '10%', 
            left: '-5%',
            animation: 'floatRight 3s ease-in-out forwards',
            filter: 'grayscale(100%) brightness(0.7)',
            opacity: 0.15
          }}
        />
        <img 
          src={patternCorner} 
          alt="" 
          className="absolute w-20 md:w-32"
          style={{ 
            top: '5%', 
            right: '-10%',
            animation: 'floatLeft 3.5s ease-in-out forwards',
            transform: 'rotate(180deg)',
            filter: 'grayscale(100%) brightness(0.7)',
            opacity: 0.12
          }}
        />
        <img 
          src={patternQuarter} 
          alt="" 
          className="absolute w-24 md:w-40"
          style={{ 
            bottom: '5%', 
            left: '5%',
            animation: 'floatUp 2.8s ease-in-out forwards',
            filter: 'grayscale(100%) brightness(0.7)',
            opacity: 0.15
          }}
        />
        <img 
          src={patternSemicircle} 
          alt="" 
          className="absolute w-20 md:w-32"
          style={{ 
            bottom: '10%', 
            right: '10%',
            animation: 'floatUp 3.2s ease-in-out forwards',
            filter: 'grayscale(100%) brightness(0.7)',
            opacity: 0.12
          }}
        />
        <img 
          src={patternBridge} 
          alt="" 
          className="absolute w-32 md:w-48"
          style={{ 
            top: '40%', 
            left: '-20%',
            animation: 'slideFromLeft 2s ease-out forwards',
            filter: 'grayscale(100%) brightness(0.7)',
            opacity: 0.1
          }}
        />
        <img 
          src={patternBridge} 
          alt="" 
          className="absolute w-32 md:w-48"
          style={{ 
            top: '40%', 
            right: '-20%',
            transform: 'scaleX(-1)',
            animation: 'slideFromRight 2s ease-out forwards',
            filter: 'grayscale(100%) brightness(0.7)',
            opacity: 0.1
          }}
        />
      </div>

      <div className="relative max-w-lg mx-4 text-center animate-in slide-in-from-bottom-4 duration-500 z-10">
        <div className="relative mb-10 flex justify-center">
          <img 
            src={patternA} 
            alt="Abridge" 
            className="w-28 md:w-36 animate-pulse"
            style={{ 
              filter: 'drop-shadow(0 0 30px rgba(234, 44, 0, 0.3))'
            }}
          />
        </div>

        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-100 ease-out"
            style={{ 
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #EA2C00, #ff4d1a, #EA2C00)'
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes floatRight {
          0% { transform: translateX(0) rotate(0deg); opacity: 0; }
          20% { opacity: 0.15; }
          100% { transform: translateX(120px) rotate(5deg); opacity: 0.2; }
        }
        @keyframes floatLeft {
          0% { transform: translateX(0) rotate(180deg); opacity: 0; }
          20% { opacity: 0.12; }
          100% { transform: translateX(-100px) rotate(175deg); opacity: 0.15; }
        }
        @keyframes floatUp {
          0% { transform: translateY(0); opacity: 0; }
          20% { opacity: 0.15; }
          100% { transform: translateY(-60px); opacity: 0.18; }
        }
        @keyframes slideFromLeft {
          0% { transform: translateX(-100%); opacity: 0; }
          100% { transform: translateX(80px); opacity: 0.12; }
        }
        @keyframes slideFromRight {
          0% { transform: translateX(100%) scaleX(-1); opacity: 0; }
          100% { transform: translateX(-80px) scaleX(-1); opacity: 0.12; }
        }
      `}</style>
    </div>
  );
}
