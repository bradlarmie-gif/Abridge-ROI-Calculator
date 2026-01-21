export function BackgroundShape() {
  return (
    <>
      {/* Large Abridge "A" logo - right side, sliced exactly in half */}
      <div 
        className="fixed top-1/2 -translate-y-1/2 right-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 0, width: '50vw', height: '140vh' }}
        aria-hidden="true"
      >
        <svg 
          viewBox="0 0 800 1000" 
          className="h-full w-auto opacity-[0.06]"
          style={{ position: 'absolute', right: 0, transform: 'translateX(50%)' }}
        >
          {/* Abridge stylized "A" with curved arch top */}
          <path 
            d="M400 0 
               C550 0, 680 120, 720 280
               L800 550 L800 950 L650 950 L650 700 L150 700 L150 950 L0 950 L0 550
               L80 280 C120 120, 250 0, 400 0 Z
               M400 150
               C300 150, 220 220, 190 350
               L150 550 L650 550 L610 350
               C580 220, 500 150, 400 150 Z" 
            fill="#EA2C00"
            fillRule="evenodd"
          />
        </svg>
      </div>
    </>
  );
}
