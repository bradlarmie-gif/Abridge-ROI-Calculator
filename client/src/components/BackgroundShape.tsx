import abridgePattern from "@assets/Screenshot_2026-01-08_at_11.54.21_PM_1767938069542.png";

export function BackgroundShape() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Base background - warm off-white */}
      <div
        className="absolute inset-0"
        style={{
          background: "#FEFEFE",
        }}
      />
      
      {/* Abridge pattern - top right corner */}
      <div
        className="absolute"
        style={{
          top: "-10%",
          right: "-10%",
          width: "500px",
          height: "500px",
          opacity: 0.03,
        }}
      >
        <img
          src={abridgePattern}
          alt=""
          className="w-full h-full object-contain"
        />
      </div>
      
      {/* Abridge pattern - bottom left corner */}
      <div
        className="absolute hidden md:block"
        style={{
          bottom: "-10%",
          left: "-10%",
          width: "500px",
          height: "500px",
          opacity: 0.025,
          transform: "rotate(180deg)",
        }}
      >
        <img
          src={abridgePattern}
          alt=""
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
}
