import abridgeSymbol from "@assets/abridge-logo-symbol_1774906992195.png";

/**
 * The large faint Abridge "A" watermark behind the hub landings. The brand
 * symbol is a dark PNG, so to tint it an exact beige (rather than a muddy
 * filter) we use it as a CSS mask and fill with a beige color. Anchored to the
 * lower-right and grown UP toward the heading; the symbol is ~square (859×868)
 * so a square box scales it without distortion.
 */
export function BackgroundShape() {
  return (
    <div
      aria-hidden="true"
      className="fixed pointer-events-none select-none"
      style={{
        bottom: "-4%",
        right: "-3%",
        width: "min(90vh, 1040px)",
        height: "min(90vh, 1040px)",
        backgroundColor: "#E7DCC7",
        opacity: 0.9,
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
