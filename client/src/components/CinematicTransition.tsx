import { useState, useEffect, useRef } from "react";

const FADE_IN_MS = 300;
const HOLD_MS = 100;
const FADE_OUT_MS = 300;

interface CinematicTransitionProps {
  isVisible: boolean;
  onMidpoint: () => void;
  onComplete: () => void;
}

export function CinematicTransition({
  isVisible,
  onMidpoint,
  onComplete,
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

    const midTimer = setTimeout(() => {
      onMidpoint();
    }, FADE_IN_MS);

    const exitTimer = setTimeout(() => {
      setPhase("exiting");
    }, FADE_IN_MS + HOLD_MS);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, FADE_IN_MS + HOLD_MS + FADE_OUT_MS);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(midTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [isVisible, onMidpoint, onComplete]);

  if (!isVisible && phase === "idle") return null;

  const opacity =
    phase === "entering" ? 0 :
    phase === "solid" ? 1 :
    phase === "exiting" ? 0 : 0;

  const transition =
    phase === "solid"
      ? `opacity ${FADE_IN_MS}ms ease-in`
      : phase === "exiting"
      ? `opacity ${FADE_OUT_MS}ms ease-out`
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
