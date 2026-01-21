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
          {/* Abridge "A" - pointed top, straight diagonal edges, arched inner hole */}
          <path 
            d="M400 0 L800 1000 L0 1000 L400 0 Z 
               M400 500 L280 1000 Q400 700 520 1000 L400 500 Z" 
            fill="#EA2C00"
            fillRule="evenodd"
          />
        </svg>
      </div>
    </>
  );
}
