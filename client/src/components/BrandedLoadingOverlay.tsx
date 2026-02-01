import { useState, useEffect, useRef } from "react";

import logoRevealVideo from "@assets/abridge-logo-reveal.mp4";

// Import all Abridge geometric shapes
import shape02 from "@assets/abridge-shape-02.png";
import shape03 from "@assets/abridge-shape-03.png";
import shape04 from "@assets/abridge-shape-04.png";
import shape05 from "@assets/abridge-shape-05.png";
import shape06 from "@assets/abridge-shape-06.png";
import shape07 from "@assets/abridge-shape-07.png";
import shape08 from "@assets/abridge-shape-08.png";
import shape09 from "@assets/abridge-shape-09.png";
import shape10 from "@assets/abridge-shape-10.png";
import shape11 from "@assets/abridge-shape-11.png";
import shape12 from "@assets/abridge-shape-12.png";
import shape13 from "@assets/abridge-shape-13.png";

const shapes = [shape02, shape03, shape04, shape05, shape06, shape07, shape08, shape09, shape10, shape11, shape12, shape13];

interface BrandedLoadingOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
  duration?: number;
}

// Scattered geometric shapes - tetris-style screensaver building effect
// 31 shapes total (30% more than original 24) - full cadmium red opacity
const geometricShapes = [
  // Far corners - large scattered pieces
  { id: 1, shapeIdx: 0, size: 60, startX: -450, startY: -320, endX: -280, endY: -180, opacity: 1, delay: 0, rotation: 15 },
  { id: 2, shapeIdx: 1, size: 45, startX: 480, startY: -280, endX: 300, endY: -160, opacity: 1, delay: 0.1, rotation: -20 },
  { id: 3, shapeIdx: 2, size: 55, startX: -420, startY: 350, endX: -260, endY: 200, opacity: 1, delay: 0.05, rotation: 25 },
  { id: 4, shapeIdx: 3, size: 50, startX: 460, startY: 300, endX: 280, endY: 170, opacity: 1, delay: 0.15, rotation: -15 },
  
  // Mid-distance pieces
  { id: 5, shapeIdx: 4, size: 40, startX: -320, startY: -180, endX: -180, endY: -90, opacity: 1, delay: 0.2, rotation: 30 },
  { id: 6, shapeIdx: 5, size: 35, startX: 350, startY: -220, endX: 200, endY: -100, opacity: 1, delay: 0.25, rotation: -35 },
  { id: 7, shapeIdx: 6, size: 42, startX: -280, startY: 240, endX: -150, endY: 120, opacity: 1, delay: 0.18, rotation: -25 },
  { id: 8, shapeIdx: 7, size: 38, startX: 300, startY: 260, endX: 170, endY: 130, opacity: 1, delay: 0.22, rotation: 20 },
  
  // Side edges
  { id: 9, shapeIdx: 8, size: 32, startX: -500, startY: -50, endX: -320, endY: -30, opacity: 1, delay: 0.3, rotation: 45 },
  { id: 10, shapeIdx: 9, size: 28, startX: 520, startY: 80, endX: 340, endY: 50, opacity: 1, delay: 0.35, rotation: -40 },
  { id: 11, shapeIdx: 10, size: 36, startX: -480, startY: 120, endX: -300, endY: 70, opacity: 1, delay: 0.28, rotation: -50 },
  { id: 12, shapeIdx: 11, size: 30, startX: 500, startY: -100, endX: 320, endY: -60, opacity: 1, delay: 0.32, rotation: 35 },
  
  // Top and bottom edges
  { id: 13, shapeIdx: 0, size: 34, startX: -150, startY: -380, endX: -80, endY: -220, opacity: 1, delay: 0.12, rotation: -10 },
  { id: 14, shapeIdx: 1, size: 38, startX: 180, startY: -360, endX: 100, endY: -200, opacity: 1, delay: 0.08, rotation: 12 },
  { id: 15, shapeIdx: 2, size: 32, startX: -120, startY: 400, endX: -70, endY: 240, opacity: 1, delay: 0.38, rotation: 22 },
  { id: 16, shapeIdx: 3, size: 36, startX: 140, startY: 380, endX: 80, endY: 220, opacity: 1, delay: 0.4, rotation: -18 },
  
  // Closer pieces - smaller, faster
  { id: 17, shapeIdx: 4, size: 24, startX: -200, startY: -120, endX: -100, endY: -50, opacity: 1, delay: 0.45, rotation: 55 },
  { id: 18, shapeIdx: 5, size: 22, startX: 220, startY: -140, endX: 110, endY: -60, opacity: 1, delay: 0.48, rotation: -60 },
  { id: 19, shapeIdx: 6, size: 26, startX: -180, startY: 150, endX: -90, endY: 70, opacity: 1, delay: 0.42, rotation: -45 },
  { id: 20, shapeIdx: 7, size: 20, startX: 200, startY: 160, endX: 100, endY: 80, opacity: 1, delay: 0.5, rotation: 50 },
  
  // Extra scattered pieces for density
  { id: 21, shapeIdx: 8, size: 28, startX: -380, startY: -250, endX: -220, endY: -140, opacity: 1, delay: 0.16, rotation: -30 },
  { id: 22, shapeIdx: 9, size: 32, startX: 400, startY: 200, endX: 240, endY: 110, opacity: 1, delay: 0.26, rotation: 40 },
  { id: 23, shapeIdx: 10, size: 25, startX: 50, startY: -400, endX: 30, endY: -250, opacity: 1, delay: 0.55, rotation: 8 },
  { id: 24, shapeIdx: 11, size: 30, startX: -60, startY: 420, endX: -35, endY: 260, opacity: 1, delay: 0.52, rotation: -12 },
  
  // Additional 7 shapes for 30% more density
  { id: 25, shapeIdx: 0, size: 35, startX: -550, startY: -150, endX: -360, endY: -80, opacity: 1, delay: 0.07, rotation: 18 },
  { id: 26, shapeIdx: 2, size: 42, startX: 550, startY: 150, endX: 360, endY: 90, opacity: 1, delay: 0.14, rotation: -22 },
  { id: 27, shapeIdx: 4, size: 28, startX: -250, startY: -350, endX: -140, endY: -200, opacity: 1, delay: 0.33, rotation: 42 },
  { id: 28, shapeIdx: 6, size: 33, startX: 280, startY: 350, endX: 160, endY: 200, opacity: 1, delay: 0.36, rotation: -38 },
  { id: 29, shapeIdx: 8, size: 48, startX: 0, startY: -450, endX: 0, endY: -280, opacity: 1, delay: 0.03, rotation: 5 },
  { id: 30, shapeIdx: 10, size: 38, startX: -600, startY: 50, endX: -400, endY: 30, opacity: 1, delay: 0.44, rotation: -55 },
  { id: 31, shapeIdx: 11, size: 44, startX: 600, startY: -50, endX: 400, endY: -25, opacity: 1, delay: 0.4, rotation: 48 },
];

export function BrandedLoadingOverlay({ 
  isVisible, 
  onComplete, 
  duration = 3000
}: BrandedLoadingOverlayProps) {
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      return;
    }

    // Start video playback
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        // Video autoplay may be blocked, continue anyway
      });
    }

    // Progress speed matched to 3 second duration
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden animate-in fade-in duration-300"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      {/* Geometric shapes building animation - tetris-style screensaver */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {geometricShapes.map((shape) => (
          <img
            key={shape.id}
            src={shapes[shape.shapeIdx]}
            alt=""
            className="absolute"
            style={{
              width: shape.size,
              height: shape.size,
              objectFit: 'contain',
              opacity: 0,
              animation: `shapeAssemble-${shape.id} 2.8s ease-out ${shape.delay}s forwards`,
            }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center justify-center z-10">
        <div className="relative mb-8 flex justify-center items-center">
          <video
            ref={videoRef}
            src={logoRevealVideo}
            muted
            playsInline
            className="w-64 md:w-80 lg:w-96"
          />
        </div>

        <div className="w-64 md:w-80 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-100 ease-out"
            style={{ 
              width: `${progress}%`,
              backgroundColor: '#EA2C00'
            }}
          />
        </div>
      </div>

      {/* Keyframe animations for geometric shapes */}
      <style>{`
        ${geometricShapes.map(shape => `
          @keyframes shapeAssemble-${shape.id} {
            0% {
              opacity: 0;
              transform: translate(${shape.startX}px, ${shape.startY}px) rotate(0deg) scale(0.8);
            }
            15% {
              opacity: ${shape.opacity};
            }
            100% {
              opacity: ${shape.opacity};
              transform: translate(${shape.endX}px, ${shape.endY}px) rotate(${shape.rotation}deg) scale(1);
            }
          }
        `).join('')}
      `}</style>
    </div>
  );
}
