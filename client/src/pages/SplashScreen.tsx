import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import brandShape from "@assets/IMG_0419_1770480513063.png";
import patternA from "@assets/pattern-9-a_1769391110218.png";

interface SplashScreenProps {
  onEnter: () => void;
}

const COLS = 9;
const ROWS = 8;
const SHAPE_SIZE = 32;
const PEAK_OPACITY = 0.30;

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface GridShape {
  col: number;
  row: number;
  left: string;
  top: string;
  rotate: number;
  dist: number;
}

function buildGrid(): GridShape[] {
  const grid: GridShape[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const seed = r * COLS + c;
      const jitterX = (seededRandom(seed * 2) - 0.5) * 4;
      const jitterY = (seededRandom(seed * 3) - 0.5) * 4;
      const left = ((c + 0.5) / COLS) * 100 + jitterX;
      const top = ((r + 0.5) / ROWS) * 100 + jitterY;
      const dist = Math.sqrt(c * c + r * r);

      grid.push({
        col: c,
        row: r,
        left: `${left.toFixed(1)}%`,
        top: `${top.toFixed(1)}%`,
        rotate: Math.floor(seededRandom(seed * 7) * 360),
        dist,
      });
    }
  }
  return grid;
}

const gridData = buildGrid();
const maxDist = Math.max(...gridData.map(s => s.dist));

const SWEEP_DURATION = 2.5;
const PAUSE_DURATION = 2.0;
const TOTAL_CYCLE = SWEEP_DURATION + PAUSE_DURATION;
const PULSE_WIDTH_PCT = 12;

function generateCSS(): string {
  let css = '';
  gridData.forEach((s, i) => {
    const r = s.rotate;
    const normalizedDist = s.dist / maxDist;
    const peakPct = (normalizedDist * SWEEP_DURATION / TOTAL_CYCLE) * 100;
    const startPct = Math.max(0, peakPct - PULSE_WIDTH_PCT);
    const endPct = Math.min(99, peakPct + PULSE_WIDTH_PCT);
    const shapeOpacity = PEAK_OPACITY * (0.75 + seededRandom(i * 17) * 0.25);

    css += `
      @keyframes pulse${i} {
        0%              { opacity: 0; transform: rotate(${r}deg) scale(0.9); }
        ${startPct.toFixed(1)}%  { opacity: 0; transform: rotate(${r}deg) scale(0.9); }
        ${peakPct.toFixed(1)}%   { opacity: ${shapeOpacity.toFixed(3)}; transform: rotate(${r}deg) scale(1.05); }
        ${endPct.toFixed(1)}%    { opacity: 0; transform: rotate(${r}deg) scale(0.9); }
        100%            { opacity: 0; transform: rotate(${r}deg) scale(0.9); }
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
              filter: 'grayscale(100%) brightness(0.8)',
              opacity: 0,
              transform: `rotate(${s.rotate}deg)`,
              animation: `pulse${i} ${TOTAL_CYCLE}s ease-in-out infinite`,
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
