export function BackgroundShape() {
  return (
    <>
      {/* Right half of "A" - positioned on right side of screen */}
      <div 
        className="fixed top-0 right-0 h-full pointer-events-none"
        style={{ zIndex: 0 }}
        aria-hidden="true"
      >
        <svg 
          viewBox="0 0 500 1000" 
          preserveAspectRatio="xMinYMid slice"
          className="h-full w-auto"
          style={{ opacity: 0.06 }}
        >
          {/* Right half of "A" - only showing from center (x=0) to right edge */}
          {/* Outer right leg: from peak down-right */}
          {/* Inner arch: curved cutout on the left side */}
          <path 
            d="M0 0 L500 1000 L350 1000 L350 700 Q0 550 0 550 L0 0 Z" 
            fill="#EA2C00"
          />
        </svg>
      </div>
    </>
  );
}
