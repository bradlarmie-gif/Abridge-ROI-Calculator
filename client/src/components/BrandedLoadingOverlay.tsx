import { useState, useEffect, useRef } from "react";

import logoRevealVideo from "@assets/abridge-logo-reveal.mp4";

interface BrandedLoadingOverlayProps {
  isVisible: boolean;
  onComplete: () => void;
  duration?: number;
}

// Geometric block configuration for building animation
const geometricBlocks = [
  // Top left cluster - drifting down-right
  { id: 1, size: 40, startX: -120, startY: -180, endX: -60, endY: -40, color: '#EA2C00', opacity: 0.08, delay: 0 },
  { id: 2, size: 24, startX: -200, startY: -100, endX: -80, endY: -20, color: '#F07B5F', opacity: 0.06, delay: 0.2 },
  { id: 3, size: 32, startX: -80, startY: -220, endX: -40, endY: -60, color: '#EA2C00', opacity: 0.05, delay: 0.4 },
  
  // Top right cluster - drifting down-left  
  { id: 4, size: 36, startX: 160, startY: -160, endX: 70, endY: -30, color: '#F07B5F', opacity: 0.07, delay: 0.1 },
  { id: 5, size: 28, startX: 100, startY: -200, endX: 50, endY: -50, color: '#EA2C00', opacity: 0.06, delay: 0.3 },
  { id: 6, size: 20, startX: 220, startY: -80, endX: 90, endY: -10, color: '#F07B5F', opacity: 0.05, delay: 0.5 },
  
  // Bottom left cluster - drifting up-right
  { id: 7, size: 44, startX: -180, startY: 200, endX: -70, endY: 50, color: '#EA2C00', opacity: 0.07, delay: 0.15 },
  { id: 8, size: 26, startX: -100, startY: 160, endX: -50, endY: 30, color: '#F07B5F', opacity: 0.06, delay: 0.35 },
  { id: 9, size: 18, startX: -160, startY: 100, endX: -80, endY: 20, color: '#EA2C00', opacity: 0.04, delay: 0.55 },
  
  // Bottom right cluster - drifting up-left
  { id: 10, size: 38, startX: 200, startY: 180, endX: 80, endY: 40, color: '#F07B5F', opacity: 0.08, delay: 0.05 },
  { id: 11, size: 22, startX: 140, startY: 220, endX: 60, endY: 60, color: '#EA2C00', opacity: 0.05, delay: 0.25 },
  { id: 12, size: 30, startX: 180, startY: 120, endX: 70, endY: 25, color: '#F07B5F', opacity: 0.06, delay: 0.45 },
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
      {/* Geometric blocks building animation - soft background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {geometricBlocks.map((block) => (
          <div
            key={block.id}
            className="absolute rounded-sm"
            style={{
              width: block.size,
              height: block.size,
              backgroundColor: block.color,
              opacity: 0,
              animation: `blockAssemble-${block.id} 2.5s ease-out ${block.delay}s forwards`,
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

      {/* Keyframe animations for geometric blocks */}
      <style>{`
        ${geometricBlocks.map(block => `
          @keyframes blockAssemble-${block.id} {
            0% {
              opacity: 0;
              transform: translate(${block.startX}px, ${block.startY}px) rotate(0deg);
            }
            20% {
              opacity: ${block.opacity};
            }
            100% {
              opacity: ${block.opacity};
              transform: translate(${block.endX}px, ${block.endY}px) rotate(${block.id % 2 === 0 ? 5 : -5}deg);
            }
          }
        `).join('')}
      `}</style>
    </div>
  );
}
