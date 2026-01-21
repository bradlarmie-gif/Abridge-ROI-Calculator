export function BackgroundShape() {
  return (
    <>
      {/* Large "A" logo - right side, half visible */}
      <div 
        className="fixed top-1/2 -translate-y-1/2 right-0 pointer-events-none"
        style={{ zIndex: 0 }}
        aria-hidden="true"
      >
        <svg 
          viewBox="0 0 800 900" 
          className="h-[140vh] w-auto opacity-[0.06]"
          style={{ transform: 'translateX(45%)' }}
        >
          {/* Wide proportional "A" with thick strokes */}
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
