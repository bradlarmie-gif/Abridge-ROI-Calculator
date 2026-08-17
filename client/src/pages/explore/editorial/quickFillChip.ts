/**
 * The one source of truth for quick-fill / preset chip styling across Explore.
 * Beige pill by default, near-black fill when selected (variant "C"). Change it
 * here and every quick-fill chip in the flow follows.
 */
export function quickFillChip(active: boolean, size: "md" | "sm" = "md"): string {
  const sizing = size === "sm" ? "text-[11.5px] px-[12px] py-[5px]" : "text-[12px] px-[14px] py-[7px]";
  return [
    "font-bold rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-1",
    sizing,
    active
      ? "bg-[#2E2822] text-white"
      : "bg-[#F2ECE3] text-[#565250] hover:text-[#1A1A1A] hover:bg-[#ECE4D8]",
  ].join(" ");
}
