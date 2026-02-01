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
// 8 shapes with randomized positions and movements
const geometricShapes = [
  { id: 1, shapeIdx: 3, size: 195, startX: -620, startY: -280, endX: -480, endY: -350, opacity: 0.33, delay: 0, rotation: 28 },
  { id: 2, shapeIdx: 7, size: 168, startX: 540, startY: -420, endX: 620, endY: -310, opacity: 0.33, delay: 0.18, rotation: -42 },
  { id: 3, shapeIdx: 1, size: 220, startX: -480, startY: 380, endX: -550, endY: 280, opacity: 0.33, delay: 0.08, rotation: -18 },
  { id: 4, shapeIdx: 9, size: 145, startX: 680, startY: 220, endX: 520, endY: 340, opacity: 0.33, delay: 0.32, rotation: 55 },
  { id: 5, shapeIdx: 5, size: 178, startX: -700, startY: 60, endX: -540, endY: -40, opacity: 0.33, delay: 0.12, rotation: -65 },
  { id: 6, shapeIdx: 11, size: 135, startX: 120, startY: -520, endX: -60, endY: -420, opacity: 0.33, delay: 0.25, rotation: 38 },
  { id: 7, shapeIdx: 2, size: 188, startX: 600, startY: -80, endX: 480, endY: 60, opacity: 0.33, delay: 0.4, rotation: -32 },
  { id: 8, shapeIdx: 8, size: 155, startX: -180, startY: 520, endX: -280, endY: 400, opacity: 0.33, delay: 0.22, rotation: 72 },
];

export function BrandedLoadingOverlay({ 
  isVisible, 
  onComplete, 
  duration = 2500
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

    // Progress speed matched to 2.5 second duration
    const increment = 1.4;
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
