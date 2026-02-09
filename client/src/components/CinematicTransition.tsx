import { useState, useEffect, useRef } from "react";

interface CinematicTransitionProps {
  isVisible: boolean;
  onComplete: () => void;
  duration?: number;
}

export function CinematicTransition({
  isVisible,
  onComplete,
  duration = 700,
}: CinematicTransitionProps) {
  const [phase, setPhase] = useState<"idle" | "entering" | "solid" | "exiting">("idle");
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isVisible) {
      setPhase("idle");
      return;
    }

    setPhase("entering");

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        setPhase("solid");
      });
    });

    const exitTimer = setTimeout(() => {
      setPhase("exiting");
    }, 400);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, duration);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [isVisible, onComplete, duration]);

  if (!isVisible && phase === "idle") return null;

  const opacity =
    phase === "entering" ? 0 :
    phase === "solid" ? 1 :
    phase === "exiting" ? 0 : 0;

  const transition =
    phase === "solid"
      ? "opacity 0.3s ease-in"
      : phase === "exiting"
      ? "opacity 0.3s ease-out"
      : "none";

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto"
      style={{
        backgroundColor: "#000",
        opacity,
        transition,
      }}
    />
  );
}
