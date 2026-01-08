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
        className="absolute -top-20 -right-20 md:-top-16 md:-right-16"
        style={{
          width: "420px",
          height: "420px",
          opacity: 0.045,
          filter: "saturate(0.7)",
        }}
      >
        <img
          src={abridgePattern}
          alt=""
          className="w-full h-full object-contain"
          style={{ transform: "rotate(0deg)" }}
        />
      </div>
      
      {/* Abridge pattern - bottom left corner */}
      <div
        className="absolute -bottom-24 -left-24 md:-bottom-20 md:-left-20 hidden md:block"
        style={{
          width: "480px",
          height: "480px",
          opacity: 0.04,
          filter: "saturate(0.6)",
        }}
      >
        <img
          src={abridgePattern}
          alt=""
          className="w-full h-full object-contain"
          style={{ transform: "rotate(180deg)" }}
        />
      </div>
    </div>
  );
}
