/**
 * The one domain-color palette, used across every tool (Explore, proforma,
 * measure, App Rat). Light coral family on white — Capacity deepest → Revenue
 * lightest coral, with Quality a warm neutral because it is the tracked /
 * non-dollar proof layer (coral is reserved for the domains that book money).
 *
 * These are FILL colors: bars, dots, chips, chart series. They are intentionally
 * light, so do NOT use them as text on a white surface (a label tint like
 * Revenue #F7A488 fails contrast). For a dark label/pill, use INK below.
 *
 * Single source of truth — every per-tool domain map should import from here so
 * the four domains carry one identity everywhere.
 */
export type DomainKey = "Capacity" | "Workforce" | "Revenue" | "Quality";

export const DOMAIN_COLORS: Record<string, string> = {
  Capacity: "#EA2C00",
  Workforce: "#F26A45",
  Revenue: "#F7A488",
  Quality: "#CDBBA6",
};

/** Dark ink for domain TEXT/labels/pills where the fill tint would be too light
 * to read. One warm near-black; the domain is carried by the label, not the hue. */
export const DOMAIN_INK = "#1A1A1A";

/** Lowercase-keyed alias for the tools that key domains lowercase
 * (forecast dashboard, proforma view/pdf, switch). Same palette, one source. */
export const DOMAIN_COLORS_LC: Record<string, string> = {
  capacity: DOMAIN_COLORS.Capacity,
  workforce: DOMAIN_COLORS.Workforce,
  revenue: DOMAIN_COLORS.Revenue,
  quality: DOMAIN_COLORS.Quality,
};

/** Light coral badge treatment (bg tint + dark ink text) for domain chips that
 * used per-domain colored Tailwind badges. Coral for the money domains, warm
 * grey for the proof/Quality layer — all readable dark text on a light tint. */
export const DOMAIN_BADGE_CLASS_LC: Record<string, string> = {
  capacity: "bg-[#FBE9E3] text-[#B0230A] border-[#F3C7BA]",
  workforce: "bg-[#FCEEE9] text-[#B0230A] border-[#F6D6CB]",
  revenue: "bg-[#FDF2EE] text-[#9A4E38] border-[#F8DDD3]",
  quality: "bg-[#F2EEE8] text-[#6B5E4F] border-[#E3DACE]",
};
