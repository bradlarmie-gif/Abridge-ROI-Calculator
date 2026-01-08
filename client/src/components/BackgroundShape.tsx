import abridgePattern from "@assets/Screenshot_2026-01-08_at_12.14.52_AM_1767852925737.png";

export function BackgroundShape() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #FFFFFF 0%, #FCFCFA 60%, #FBFBF8 100%)," +
            "radial-gradient(900px 520px at 10% 12%, rgba(240,51,25,0.028) 0%, rgba(240,51,25,0) 62%)",
        }}
      />
      
      {/* Abridge pattern - top right corner */}
      <div
        className="absolute -top-8 -right-8 md:top-0 md:right-0"
        style={{
          width: "500px",
          height: "500px",
          opacity: 0.065,
          filter: "saturate(0.75)",
        }}
      >
        <img
          src={abridgePattern}
          alt=""
          className="w-full h-full object-contain"
          style={{ transform: "translate(25%, -25%)" }}
        />
      </div>
      
      {/* Abridge pattern - bottom left corner */}
      <div
        className="absolute bottom-0 left-0 hidden md:block"
        style={{
          width: "520px",
          height: "520px",
          opacity: 0.06,
          filter: "saturate(0.7)",
        }}
      >
        <img
          src={abridgePattern}
          alt=""
          className="w-full h-full object-contain"
          style={{ transform: "translate(-30%, 30%) rotate(180deg)" }}
        />
      </div>
    </div>
  );
}
