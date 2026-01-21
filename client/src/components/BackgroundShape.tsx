export function BackgroundShape() {
  return (
    <>
      {/* Large "A" logo - right side, sliced exactly in half */}
      <div 
        className="fixed top-1/2 -translate-y-1/2 right-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 0, width: '50vw', height: '140vh' }}
        aria-hidden="true"
      >
        <svg 
          viewBox="0 0 800 900" 
          className="h-full w-auto opacity-[0.06]"
          style={{ position: 'absolute', right: 0, transform: 'translateX(50%)' }}
        >
          {/* Wide proportional "A" - centered at x=400, translateX(50%) puts the center at the left edge of container */}
          <path 
            d="M400 50 L750 850 L620 850 L555 680 L245 680 L180 850 L50 850 L400 50 Z M400 250 L295 550 L505 550 L400 250 Z" 
            fill="#EA2C00"
            fillRule="evenodd"
          />
        </svg>
      </div>
    </>
  );
}
