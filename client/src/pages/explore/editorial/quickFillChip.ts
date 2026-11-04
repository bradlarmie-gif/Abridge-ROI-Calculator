/**
 * The one source of truth for quick-fill / preset chip styling across Explore.
 * White pill by default, coral outline when selected: the same chip the ROI
 * Calculator uses (payer basis, HCC panel). Change it here and every quick-fill
 * chip in the flow follows.
 */
export function quickFillChip(active: boolean, size: "md" | "sm" = "md"): string {
  const sizing = size === "sm" ? "text-[11.5px] px-[12px] py-[5px]" : "text-[12px] px-[14px] py-[7px]";
  return [
    "font-bold rounded-full border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-1",
    sizing,
    active
      ? "border-[#EA2C00] bg-[#FDF1EC] text-[#EA2C00]"
      : "border-[#E2D8CB] bg-white text-[#565250] hover:border-[#EA2C00] hover:text-[#EA2C00]",
  ].join(" ");
}
