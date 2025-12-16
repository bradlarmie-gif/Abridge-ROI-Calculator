export function BackgroundPattern() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div 
        className="absolute -top-20 -left-20 w-96 h-96 opacity-10"
        style={{ transform: "rotate(-15deg)" }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle cx="50" cy="50" r="40" fill="#D4C4B0" />
          <circle cx="120" cy="80" r="30" fill="#D4C4B0" />
          <circle cx="70" cy="130" r="25" fill="#D4C4B0" />
          <rect x="100" y="120" width="60" height="60" rx="10" fill="#D4C4B0" />
        </svg>
      </div>
      
      <div 
        className="absolute -bottom-32 -right-32 w-[500px] h-[500px] opacity-10"
        style={{ transform: "rotate(20deg)" }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle cx="100" cy="100" r="50" fill="#D4C4B0" />
          <circle cx="50" cy="60" r="35" fill="#D4C4B0" />
          <circle cx="150" cy="140" r="28" fill="#D4C4B0" />
          <rect x="20" y="130" width="50" height="50" rx="8" fill="#D4C4B0" />
          <rect x="140" y="40" width="40" height="40" rx="6" fill="#D4C4B0" />
        </svg>
      </div>
    </div>
  );
}
