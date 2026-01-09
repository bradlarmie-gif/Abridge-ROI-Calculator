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
      
      {/* Abridge pattern - repeating across entire background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${abridgePattern})`,
          backgroundSize: "600px 600px",
          backgroundRepeat: "repeat",
          opacity: 0.035,
          filter: "saturate(0.8)",
        }}
      />
    </div>
  );
}
