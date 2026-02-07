import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

import brandShape from "@assets/IMG_0419_1770480513063.png";
import patternA from "@assets/pattern-9-a_1769391110218.png";

interface SplashScreenProps {
  onEnter: () => void;
}

const greyFilter = 'grayscale(100%) brightness(0.6)';

const shapes = [
  { top: '4%',  left: '3%',   size: 44, rotate: 0,    opacity: 0.25, delay: 0.0,  breathDur: 5   },
  { top: '7%',  left: '22%',  size: 36, rotate: 45,   opacity: 0.18, delay: 0.15, breathDur: 6   },
  { top: '3%',  right: '15%', size: 52, rotate: 120,  opacity: 0.22, delay: 0.3,  breathDur: 7   },
  { top: '6%',  right: '4%',  size: 40, rotate: 200,  opacity: 0.2,  delay: 0.1,  breathDur: 5.5 },
  { top: '25%', left: '2%',   size: 48, rotate: 90,   opacity: 0.2,  delay: 0.45, breathDur: 6.5 },
  { top: '30%', right: '5%',  size: 56, rotate: 270,  opacity: 0.18, delay: 0.6,  breathDur: 7.5 },
  { top: '50%', left: '4%',   size: 42, rotate: 160,  opacity: 0.22, delay: 0.2,  breathDur: 5   },
  { top: '55%', right: '3%',  size: 38, rotate: 30,   opacity: 0.2,  delay: 0.75, breathDur: 6   },
  { top: '72%', left: '6%',   size: 50, rotate: 310,  opacity: 0.18, delay: 0.35, breathDur: 8   },
  { top: '78%', left: '25%',  size: 34, rotate: 70,   opacity: 0.15, delay: 0.9,  breathDur: 5.5 },
  { top: '80%', right: '8%',  size: 46, rotate: 240,  opacity: 0.2,  delay: 0.5,  breathDur: 7   },
  { top: '12%', left: '42%',  size: 32, rotate: 135,  opacity: 0.12, delay: 1.05, breathDur: 6.5 },
  { top: '88%', left: '48%',  size: 38, rotate: 180,  opacity: 0.15, delay: 0.65, breathDur: 5   },
  { top: '40%', left: '12%',  size: 30, rotate: 15,   opacity: 0.14, delay: 1.2,  breathDur: 7   },
  { top: '60%', right: '14%', size: 34, rotate: 290,  opacity: 0.16, delay: 0.8,  breathDur: 6   },
];

function generateKeyframes(): string {
  let css = '';
  shapes.forEach((s, i) => {
    const r = s.rotate;
    const o = s.opacity;
    const dim = o * 0.4;
    css += `
      @keyframes enter${i} {
        0%   { opacity: 0;   transform: rotate(${r}deg) scale(0.7); }
        100% { opacity: ${o}; transform: rotate(${r}deg) scale(1); }
      }
      @keyframes breathe${i} {
        0%, 100% { opacity: ${o}; }
        50%      { opacity: ${dim.toFixed(3)}; }
      }
    `;
  });
  return css;
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        {shapes.map((s, i) => (
          <img
            key={i}
            src={brandShape}
            alt=""
            className="absolute"
            style={{
              width: `${s.size}px`,
              top: s.top,
              left: 'left' in s ? (s as any).left : undefined,
              right: 'right' in s ? (s as any).right : undefined,
              filter: greyFilter,
              opacity: 0,
              animation: `enter${i} 0.8s ease-out ${s.delay}s forwards, breathe${i} ${s.breathDur}s ease-in-out ${s.delay + 0.8}s infinite`,
            }}
            data-testid={`shape-bg-${i}`}
          />
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
        ${generateKeyframes()}
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
