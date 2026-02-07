import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

import brandShape from "@assets/IMG_0419_1770480513063.png";
import patternA from "@assets/pattern-9-a_1769391110218.png";

interface SplashScreenProps {
  onEnter: () => void;
}

const greyFilter = 'grayscale(100%) brightness(0.6)';

const shapes = [
  { top: '3%',  left: '7%',   size: 42, rotate: 12,   opacity: 0.22, delay: 0.0,  breathDur: 5   },
  { top: '9%',  left: '34%',  size: 36, rotate: 155,  opacity: 0.16, delay: 0.2,  breathDur: 6.5 },
  { top: '5%',  right: '22%', size: 48, rotate: 88,   opacity: 0.2,  delay: 0.35, breathDur: 7   },
  { top: '2%',  right: '3%',  size: 38, rotate: 210,  opacity: 0.18, delay: 0.1,  breathDur: 5.5 },
  { top: '18%', left: '1%',   size: 44, rotate: 275,  opacity: 0.2,  delay: 0.5,  breathDur: 6   },
  { top: '22%', left: '18%',  size: 30, rotate: 42,   opacity: 0.14, delay: 0.7,  breathDur: 7.5 },
  { top: '15%', right: '9%',  size: 40, rotate: 330,  opacity: 0.18, delay: 0.25, breathDur: 5   },
  { top: '35%', left: '5%',   size: 46, rotate: 145,  opacity: 0.2,  delay: 0.55, breathDur: 8   },
  { top: '32%', right: '2%',  size: 34, rotate: 60,   opacity: 0.16, delay: 0.4,  breathDur: 6   },
  { top: '42%', left: '15%',  size: 32, rotate: 195,  opacity: 0.13, delay: 0.85, breathDur: 7   },
  { top: '48%', right: '12%', size: 38, rotate: 310,  opacity: 0.17, delay: 0.15, breathDur: 5.5 },
  { top: '55%', left: '3%',   size: 50, rotate: 100,  opacity: 0.2,  delay: 0.65, breathDur: 6.5 },
  { top: '58%', right: '6%',  size: 36, rotate: 248,  opacity: 0.15, delay: 0.45, breathDur: 7   },
  { top: '65%', left: '20%',  size: 28, rotate: 18,   opacity: 0.12, delay: 1.0,  breathDur: 5   },
  { top: '70%', right: '18%', size: 44, rotate: 170,  opacity: 0.19, delay: 0.3,  breathDur: 8   },
  { top: '75%', left: '8%',   size: 40, rotate: 290,  opacity: 0.18, delay: 0.75, breathDur: 6   },
  { top: '82%', left: '30%',  size: 34, rotate: 55,   opacity: 0.14, delay: 0.9,  breathDur: 7.5 },
  { top: '85%', right: '4%',  size: 46, rotate: 225,  opacity: 0.2,  delay: 0.6,  breathDur: 5.5 },
  { top: '92%', left: '50%',  size: 32, rotate: 130,  opacity: 0.15, delay: 1.1,  breathDur: 6   },
  { top: '90%', right: '28%', size: 38, rotate: 350,  opacity: 0.16, delay: 0.8,  breathDur: 7   },
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
