import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import brandShape from "@assets/IMG_0419_1770480513063.png";
import patternA from "@assets/pattern-9-a_1769391110218.png";

interface SplashScreenProps {
  onEnter: () => void;
}

const SHAPE_SIZE = 200;
const PEAK_OPACITY = 0.50;

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface GridShape {
  left: string;
  top: string;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
  peakOpacity: number;
}

const EDGE_POSITIONS: [number, number][] = [
  [5, 5],    [35, 3],    [65, 3],    [92, 5],
  [3, 35],                            [95, 35],
  [3, 65],                            [95, 65],
  [5, 92],   [35, 95],   [65, 95],   [92, 92],
];

function buildGrid(): GridShape[] {
  return EDGE_POSITIONS.map(([baseLeft, baseTop], i) => {
    const seed = i * 7 + 3;
    const jitterX = (seededRandom(seed * 2) - 0.5) * 3;
    const jitterY = (seededRandom(seed * 3) - 0.5) * 3;

    const duration = 5 + seededRandom(seed * 11) * 4;
    const delay = seededRandom(seed * 13) * -8;
    const driftX = (seededRandom(seed * 5) - 0.5) * 20;
    const driftY = (seededRandom(seed * 7) - 0.5) * 20;
    const peakOpacity = PEAK_OPACITY * (0.6 + seededRandom(seed * 17) * 0.4);

    return {
      left: `${(baseLeft + jitterX).toFixed(1)}%`,
      top: `${(baseTop + jitterY).toFixed(1)}%`,
      duration,
      delay,
      driftX,
      driftY,
      peakOpacity,
    };
  });
}

const gridData = buildGrid();

function generateCSS(): string {
  let css = '';
  gridData.forEach((s, i) => {
    const dx = s.driftX;
    const dy = s.driftY;
    const op = s.peakOpacity;

    css += `
      @keyframes float${i} {
        0%   { opacity: ${(op * 0.3).toFixed(3)}; transform: translate(0px, 0px) scale(0.95); }
        25%  { opacity: ${op.toFixed(3)}; transform: translate(${dx.toFixed(1)}px, ${(dy * 0.5).toFixed(1)}px) scale(1.02); }
        50%  { opacity: ${(op * 0.5).toFixed(3)}; transform: translate(${(dx * 0.3).toFixed(1)}px, ${dy.toFixed(1)}px) scale(0.98); }
        75%  { opacity: ${op.toFixed(3)}; transform: translate(${(-dx * 0.5).toFixed(1)}px, ${(dy * 0.3).toFixed(1)}px) scale(1.03); }
        100% { opacity: ${(op * 0.3).toFixed(3)}; transform: translate(0px, 0px) scale(0.95); }
      }
    `;
  });
  return css;
}

const gridCSS = generateCSS();

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        {gridData.map((s, i) => (
          <img
            key={i}
            src={brandShape}
            alt=""
            className="absolute"
            style={{
              width: `${SHAPE_SIZE}px`,
              top: s.top,
              left: s.left,
              filter: 'grayscale(100%) brightness(1.0)',
              opacity: s.peakOpacity * 0.3,
              animation: `float${i} ${s.duration.toFixed(1)}s ease-in-out ${s.delay.toFixed(1)}s infinite`,
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
        ${gridCSS}
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
