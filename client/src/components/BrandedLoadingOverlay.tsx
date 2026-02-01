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
// 16 shapes (50% fewer), 33% opacity (50% more faded), 2x size
const geometricShapes = [
  // Far corners - large scattered pieces
  { id: 1, shapeIdx: 0, size: 210, startX: -550, startY: -400, endX: -420, endY: -300, opacity: 0.33, delay: 0, rotation: 15 },
  { id: 2, shapeIdx: 1, size: 158, startX: 580, startY: -360, endX: 440, endY: -270, opacity: 0.33, delay: 0.1, rotation: -20 },
  { id: 3, shapeIdx: 2, size: 192, startX: -520, startY: 420, endX: -400, endY: 320, opacity: 0.33, delay: 0.05, rotation: 25 },
  { id: 4, shapeIdx: 3, size: 176, startX: 560, startY: 380, endX: 420, endY: 290, opacity: 0.33, delay: 0.15, rotation: -15 },
  
  // Mid-distance pieces
  { id: 5, shapeIdx: 4, size: 140, startX: -420, startY: -260, endX: -320, endY: -190, opacity: 0.33, delay: 0.2, rotation: 30 },
  { id: 6, shapeIdx: 5, size: 122, startX: 450, startY: -300, endX: 340, endY: -220, opacity: 0.33, delay: 0.25, rotation: -35 },
  { id: 7, shapeIdx: 6, size: 148, startX: -380, startY: 320, endX: -290, endY: 240, opacity: 0.33, delay: 0.18, rotation: -25 },
  { id: 8, shapeIdx: 7, size: 134, startX: 400, startY: 340, endX: 310, endY: 260, opacity: 0.33, delay: 0.22, rotation: 20 },
  
  // Side edges
  { id: 9, shapeIdx: 8, size: 112, startX: -600, startY: -80, endX: -480, endY: -60, opacity: 0.33, delay: 0.3, rotation: 45 },
  { id: 10, shapeIdx: 9, size: 98, startX: 620, startY: 100, endX: 500, endY: 80, opacity: 0.33, delay: 0.35, rotation: -40 },
  { id: 11, shapeIdx: 10, size: 126, startX: -580, startY: 150, endX: -460, endY: 120, opacity: 0.33, delay: 0.28, rotation: -50 },
  { id: 12, shapeIdx: 11, size: 106, startX: 600, startY: -130, endX: 480, endY: -100, opacity: 0.33, delay: 0.32, rotation: 35 },
  
  // Top and bottom edges
  { id: 13, shapeIdx: 0, size: 120, startX: -200, startY: -460, endX: -160, endY: -360, opacity: 0.33, delay: 0.12, rotation: -10 },
  { id: 14, shapeIdx: 1, size: 134, startX: 230, startY: -440, endX: 180, endY: -340, opacity: 0.33, delay: 0.08, rotation: 12 },
  { id: 15, shapeIdx: 2, size: 112, startX: -170, startY: 480, endX: -140, endY: 380, opacity: 0.33, delay: 0.38, rotation: 22 },
  { id: 16, shapeIdx: 3, size: 126, startX: 190, startY: 460, endX: 150, endY: 360, opacity: 0.33, delay: 0.4, rotation: -18 },
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
              animation: `shapeAssemble-${shape.id} 5s ease-out ${shape.delay}s forwards`,
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
