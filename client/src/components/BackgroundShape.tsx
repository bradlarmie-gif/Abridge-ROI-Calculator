import abridgeSymbol from "@assets/abridge-logo-symbol_1774906992195.png";

/**
 * The faint Abridge "A" watermark behind the hub landings. Uses the real brand
 * symbol asset (the same one the PDFs use), not a hand-drawn path, so it reads
 * as the Abridge mark and not a jagged wedge. Fixed to the lower-right, low
 * opacity, cropped slightly off the edge for an elegant partial.
 */
export function BackgroundShape() {
  return (
    <img
      src={abridgeSymbol}
      alt=""
      aria-hidden="true"
      className="fixed pointer-events-none select-none"
      style={{ bottom: "-5%", right: "-3%", width: "min(42vw, 560px)", opacity: 0.05, zIndex: 0 }}
    />
  );
}
