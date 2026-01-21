export function BackgroundShape() {
  return (
    <>
      {/* Top-left decoration */}
      <svg 
        className="absolute pointer-events-none"
        style={{ 
          width: '550px', 
          height: '550px', 
          top: '-180px', 
          left: '-180px', 
          transform: 'rotate(-8deg)',
          zIndex: 0 
        }}
        viewBox="0 0 400 400" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path 
          d="M200 50 L280 350 L240 350 L225 290 L175 290 L160 350 L120 350 L200 50 Z M200 120 L185 240 L215 240 Z" 
          fill="#EA2C00" 
          opacity="0.035"
        />
        <circle cx="200" cy="315" r="25" fill="#EA2C00" opacity="0.035"/>
      </svg>

      {/* Bottom-right decoration */}
      <svg 
        className="absolute pointer-events-none"
        style={{ 
          width: '650px', 
          height: '650px', 
          bottom: '-220px', 
          right: '-220px', 
          transform: 'rotate(12deg)',
          zIndex: 0 
        }}
        viewBox="0 0 500 500" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path 
          d="M250 80 L340 420 L295 420 L278 355 L222 355 L205 420 L160 420 L250 80 Z M250 160 L233 305 L267 305 Z" 
          fill="#EA2C00" 
          opacity="0.035"
        />
        <circle cx="250" cy="385" r="30" fill="#EA2C00" opacity="0.035"/>
      </svg>
    </>
  );
}
