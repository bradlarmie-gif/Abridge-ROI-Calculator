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

// Parallax depth layers with subtle rotation
// depth: 1 = far (slow, faded), 2 = mid, 3 = near (fast, slightly more visible)
const parallaxShapes = [
  // Far layer - slowest, most faded
  { id: 1, shapeIdx: 3, size: 240, x: -550, y: -320, depth: 1, opacity: 0.06, rotateDir: 1 },
  { id: 2, shapeIdx: 7, size: 200, x: 480, y: -380, depth: 1, opacity: 0.06, rotateDir: -1 },
  { id: 3, shapeIdx: 11, size: 180, x: -420, y: 350, depth: 1, opacity: 0.06, rotateDir: 1 },
  
  // Mid layer - medium speed
  { id: 4, shapeIdx: 1, size: 160, x: 520, y: 280, depth: 2, opacity: 0.08, rotateDir: -1 },
  { id: 5, shapeIdx: 5, size: 145, x: -620, y: 80, depth: 2, opacity: 0.08, rotateDir: 1 },
  { id: 6, shapeIdx: 9, size: 155, x: 180, y: -450, depth: 2, opacity: 0.08, rotateDir: -1 },
  
  // Near layer - fastest, slightly more visible
  { id: 7, shapeIdx: 2, size: 130, x: 580, y: -120, depth: 3, opacity: 0.10, rotateDir: 1 },
  { id: 8, shapeIdx: 8, size: 120, x: -200, y: 420, depth: 3, opacity: 0.10, rotateDir: -1 },
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
      {/* Parallax depth layers with subtle rotation */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {parallaxShapes.map((shape) => {
          // Speed based on depth: far=slow, near=fast - faster to feel the motion
          const animSpeed = shape.depth === 1 ? 6 : shape.depth === 2 ? 4 : 2.5;
          
          return (
            <img
              key={shape.id}
              src={shapes[shape.shapeIdx]}
              alt=""
              className="absolute"
              style={{
                width: shape.size,
                height: shape.size,
                objectFit: 'contain',
                opacity: shape.opacity,
                animation: `parallaxFloat-${shape.id} ${animSpeed}s ease-in-out infinite`,
              }}
            />
          );
        })}
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

      {/* Keyframe animations for parallax depth effect with subtle rotation */}
      <style>{`
        ${parallaxShapes.map(shape => {
          // Drift distance based on depth: far moves less, near moves more - BIGGER movement
          const driftX = shape.depth === 1 ? 35 : shape.depth === 2 ? 60 : 90;
          const driftY = shape.depth === 1 ? 25 : shape.depth === 2 ? 45 : 70;
          const rotateAmount = 10 * shape.rotateDir; // Subtle rotation
          
          return `
            @keyframes parallaxFloat-${shape.id} {
              0%, 100% {
                transform: translate(${shape.x}px, ${shape.y}px) rotate(0deg);
              }
              25% {
                transform: translate(${shape.x + driftX}px, ${shape.y - driftY * 0.6}px) rotate(${rotateAmount * 0.4}deg);
              }
              50% {
                transform: translate(${shape.x + driftX * 0.4}px, ${shape.y - driftY}px) rotate(${rotateAmount}deg);
              }
              75% {
                transform: translate(${shape.x - driftX * 0.6}px, ${shape.y - driftY * 0.4}px) rotate(${rotateAmount * 0.6}deg);
              }
            }
          `;
        }).join('')}
      `}</style>
    </div>
  );
}
