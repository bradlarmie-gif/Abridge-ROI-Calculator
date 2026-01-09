import geometricPattern from "@assets/Screenshot_2026-01-09_at_2.33.22_AM_1767947608832.png";

export function BackgroundShape() {
  return (
    <>
      {/* Geometric pattern - top right corner */}
      <img 
        src={geometricPattern}
        alt=""
        aria-hidden="true"
        className="fixed top-[-5%] right-[-5%] w-[700px] md:w-[1000px] lg:w-[1200px] pointer-events-none opacity-[0.25]"
        style={{ zIndex: 0 }}
      />
      
      {/* Geometric pattern - bottom left corner */}
      <img 
        src={geometricPattern}
        alt=""
        aria-hidden="true"
        className="fixed bottom-[-5%] left-[-5%] w-[600px] md:w-[900px] lg:w-[1000px] pointer-events-none opacity-[0.22] rotate-180"
        style={{ zIndex: 0 }}
      />
    </>
  );
}
