import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import brandShape from "@assets/IMG_0419_1770480513063.png";
import patternA from "@assets/pattern-9-a_1769391110218.png";

interface SplashScreenProps {
  onEnter: () => void;
}

const COLS = 6;
const ROWS = 5;
const SHAPE_SIZE = 120;
const BASE_OPACITY = 0.28;
const PEAK_OPACITY = 0.48;

function getRotation(row: number, col: number): number {
  const pattern = [
    [0, 90, 180, 270, 0, 90],
    [270, 180, 90, 0, 270, 180],
    [180, 270, 0, 90, 180, 270],
    [90, 0, 270, 180, 90, 0],
    [0, 90, 180, 270, 0, 90],
  ];
  return pattern[row % pattern.length][col % pattern[0].length];
}

interface GridCell {
  leftPercent: number;
  topPercent: number;
  rotation: number;
  waveDelay: number;
}

function buildGrid(): GridCell[] {
  const cells: GridCell[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      cells.push({
        leftPercent: ((c + 0.5) / COLS) * 100,
        topPercent: ((r + 0.5) / ROWS) * 100,
        rotation: getRotation(r, c),
        waveDelay: (r + c) * 0.8,
      });
    }
  }
  return cells;
}

const gridCells = buildGrid();

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        {gridCells.map((cell, i) => (
          <img
            key={i}
            src={brandShape}
            alt=""
            className="absolute splash-tile"
            style={{
              width: `${SHAPE_SIZE}px`,
              height: `${SHAPE_SIZE}px`,
              left: `${cell.leftPercent}%`,
              top: `${cell.topPercent}%`,
              marginLeft: `-${SHAPE_SIZE / 2}px`,
              marginTop: `-${SHAPE_SIZE / 2}px`,
              filter: 'grayscale(100%) brightness(0.6)',
              '--tile-rot': `${cell.rotation}deg`,
              '--tile-delay': `${cell.waveDelay}s`,
            } as React.CSSProperties}
            data-testid={`shape-bg-${i}`}
          />
        ))}
      </div>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 55% at 50% 48%, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 55%, transparent 100%)',
        }}
      />

      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
        <div className="mb-12 flex justify-center">
          <img
            src={patternA}
            alt="Abridge"
            className="w-24 md:w-32 splash-logo"
          />
        </div>

        <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight font-abridge uppercase">
          Build Your Value Story
        </h1>

        <p className="text-slate-400 text-lg md:text-xl mb-12 max-w-lg mx-auto">
          Discover the ROI of ambient AI documentation
        </p>

        <Button
          onClick={onEnter}
          size="lg"
          variant="secondary"
          className="border border-white/30"
          data-testid="button-enter-app"
        >
          Get Started
          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>

      <style>{`
        .splash-tile {
          animation: tileWave 12s ease-in-out var(--tile-delay, 0s) infinite;
          transform: rotate(var(--tile-rot, 0deg));
        }
        @keyframes tileWave {
          0%, 100% { opacity: ${BASE_OPACITY}; transform: rotate(var(--tile-rot, 0deg)) scale(1); }
          50%      { opacity: ${PEAK_OPACITY}; transform: rotate(var(--tile-rot, 0deg)) scale(1.02); }
        }
        .splash-logo {
          animation: splashLogoEnter 0.4s ease-out forwards, splashLogoPulse 4s ease-in-out 0.4s infinite;
        }
        @keyframes splashLogoEnter {
          0% { opacity: 0; transform: scale(0.85); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splashLogoPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.88; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}
