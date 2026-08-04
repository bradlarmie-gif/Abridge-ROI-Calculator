// ─────────────────────────────────────────────────────────────────────────
// THE canonical "tracked" (non-financial) layer per care setting.
//
// The four-domains doctrine: every care setting has four domains
// (Capacity / Workforce / Revenue / Quality), and exactly the domains listed
// here are the NON-FINANCIAL proof layer for that setting — tracked as a
// leading signal, never counted in the dollar (the engine emits $0 for them,
// and the dollar, where it exists, is attributed to the domain named in the
// note). Every surface that talks about the proof layer — the Explore recap
// and its PDF, the methodology content, Attain — must agree with THIS map.
// It is the single source of the designation; do not re-encode it elsewhere.
//
//   Outpatient  → Quality
//   ED          → Quality
//   Inpatient   → Capacity + Quality
//   Nursing     → Revenue
// ─────────────────────────────────────────────────────────────────────────

export type ProofDomain = "Capacity" | "Workforce" | "Revenue" | "Quality";

export const PROOF_LAYER: Record<string, Partial<Record<ProofDomain, string>>> = {
  outpatient: { Quality: "tracked, not counted; shows in Revenue" },
  ed: { Quality: "tracked, not counted; shows in Revenue" },
  inpatient: {
    Capacity: "tracked, not counted; dollar shows in Revenue",
    Quality: "tracked, not counted; shows in Revenue",
  },
  nursing: { Revenue: "tracked, not counted; no dollar here" },
};

export const QUADRANT_ORDER = ["Capacity", "Workforce", "Revenue", "Quality"] as const;

/** Is `domain` the tracked (non-financial) proof layer for `setting`? */
export function isProofDomain(setting: string | null | undefined, domain: ProofDomain): boolean {
  return !!(setting && PROOF_LAYER[setting]?.[domain]);
}
