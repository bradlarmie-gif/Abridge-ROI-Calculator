import geometricPattern from "@assets/Screenshot_2026-01-09_at_2.33.22_AM_1767947608832.png";

export function BackgroundShape() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
      {/* Geometric pattern - top right corner */}
      <img 
        src={geometricPattern}
        alt=""
        aria-hidden="true"
        className="absolute w-[700px] md:w-[1000px] lg:w-[1200px]"
        style={{
          top: "-5%",
          right: "-5%",
          opacity: 0.25,
        }}
      />
      
      {/* Geometric pattern - bottom left corner */}
      <img 
        src={geometricPattern}
        alt=""
        aria-hidden="true"
        className="absolute w-[600px] md:w-[900px] lg:w-[1000px] rotate-180"
        style={{
          bottom: "-5%",
          left: "-5%",
          opacity: 0.22,
        }}
      />
    </div>
  );
}
