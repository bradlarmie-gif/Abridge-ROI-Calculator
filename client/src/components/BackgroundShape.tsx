import abridgeSymbol from "@assets/abridge-logo-symbol_1774906992195.png";

/**
 * The large faint Abridge "A" watermark behind the hub landings. The brand
 * symbol is a dark PNG, so to tint it we use it as a CSS mask and fill with a
 * color: Abridge coral at 6%, soft enough to read as a blush of the brand mark
 * rather than as coral on the page. Grown large and anchored off the
 * lower-right so the "A" frames the page as architecture rather than sitting
 * in the corner. The PDF covers carry the same coral A at the same 6%. The
 * symbol is ~square (859×868), so a square box scales it without distortion.
 */
export function BackgroundShape({ opacity = 0.06 }: { opacity?: number } = {}) {
  return (
    <div
      aria-hidden="true"
      className="fixed pointer-events-none select-none"
      style={{
        bottom: "-6%",
        right: "-9%",
        width: "min(108vh, 1280px)",
        height: "min(108vh, 1280px)",
        backgroundColor: "#EA2C00",
        opacity,
        zIndex: 0,
        WebkitMaskImage: `url(${abridgeSymbol})`,
        maskImage: `url(${abridgeSymbol})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "bottom right",
        maskPosition: "bottom right",
      }}
    />
  );
}
