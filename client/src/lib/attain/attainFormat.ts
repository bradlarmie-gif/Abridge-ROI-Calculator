/**
 * Shared money formatter for every Attain surface (screen AND PDF).
 *
 * There used to be ~15 copy-pasted `fmt$` helpers across the Attain screens and
 * the PDF, and they had two problems the visual audit caught: (1) no billions
 * tier, so a fat-fingered economics input rendered as "$172800.0M" instead of
 * "$172.8B"; and (2) the screens rounded millions to one decimal while the PDF
 * used two, so the same figure could read differently screen↔PDF. One helper,
 * imported everywhere, fixes both: a B / M / K / $ ladder at a single precision.
 */
export const fmt$ = (n: number): string =>
  n >= 1_000_000_000
    ? `$${(n / 1_000_000_000).toFixed(1)}B`
    : n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : n >= 1000
        ? `$${Math.round(n / 1000)}K`
        : `$${Math.round(n)}`;
