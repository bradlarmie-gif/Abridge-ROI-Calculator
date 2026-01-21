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
          viewBox="0 0 400 800" 
          className="h-[120vh] w-auto opacity-[0.06]"
          style={{ transform: 'translateX(50%)' }}
        >
          <path 
            d="M200 50 L350 750 L280 750 L250 650 L150 650 L120 750 L50 750 L200 50 Z M200 200 L165 550 L235 550 L200 200 Z" 
            fill="#EA2C00"
            fillRule="evenodd"
          />
        </svg>
      </div>
    </>
  );
}
