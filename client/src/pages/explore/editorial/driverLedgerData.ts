import type { ExploreState } from "../ExploreFlow";
import { computeAllDriverValues, retentionIsCounted } from "@/lib/exploreDriverCalcs";
import type { LedgerGroup } from "./DriverLedger";
import { fmtMoney } from "./DriverLedger";

/**
 * The right-hand "Your model" ledger, computed identically on every inpatient
 * driver screen so the accumulation reads the same as you move through the
 * flow. Counted domains itemize to a subtotal; the domain you're on is broken
 * out, the others are carried; tracked domains sit under "Tracked as proof".
 *
 * Single source: reads dollars straight from the canonical engine, so the
 * ledger can never drift from the screen totals / proforma / PDF.
 */

type Domain = "Capacity" | "Workforce" | "Revenue" | "Quality";

interface CountedItem {
  label: string;
  engineKey: string;
}

// Inpatient counted drivers, by domain (tracked domains are empty).
const IP_COUNTED: Record<Domain, CountedItem[]> = {
  Capacity: [],
  Workforce: [
    { label: "Provider Retention", engineKey: "providerWellbeing" },
    { label: "Incremental Staffing Avoided", engineKey: "incrementalStaffing" },
  ],
  Revenue: [
    { label: "Case Mix Index (DRG Accuracy)", engineKey: "drgAccuracy" },
    { label: "Status / Medical Necessity Denials", engineKey: "obsDefense" },
  ],
  Quality: [],
};

const TRACKED_LABEL: Record<Domain, string> = {
  Capacity: "Capacity",
  Workforce: "Administrative Efficiency",
  Revenue: "",
  Quality: "Quality",
};

export interface LedgerData {
  groups: LedgerGroup[];
  grandValue: string;
  grandCaption: string;
}

export function buildInpatientLedger(
  state: ExploreState,
  totalHoursSaved: number,
  currentDomain: Domain,
): LedgerData {
  const engine = computeAllDriverValues(state, totalHoursSaved);
  const retentionCounted = retentionIsCounted(state);
  const val = (k: string) => Math.round(engine[k] ?? 0);

  // Retention only counts when the lens is on; otherwise it is tracked-as-proof
  // and must not appear as a counted $0 line (that would read broken).
  const countedFor = (d: Domain): CountedItem[] =>
    IP_COUNTED[d].filter((it) => it.engineKey !== "providerWellbeing" || retentionCounted);

  const domainSubtotal = (d: Domain) =>
    countedFor(d).reduce((sum, it) => sum + val(it.engineKey), 0);

  const grand =
    domainSubtotal("Workforce") + domainSubtotal("Revenue");

  const order: Domain[] = ["Capacity", "Workforce", "Revenue", "Quality"];
  const countedDomains = order.filter((d) => IP_COUNTED[d].length > 0);
  const groups: LedgerGroup[] = [];

  // 1) The domain you're on (itemized), if it's a counted domain.
  if (IP_COUNTED[currentDomain].length > 0) {
    const items = countedFor(currentDomain).map((it) => {
      const v = val(it.engineKey);
      return { label: it.label, value: v > 0 ? fmtMoney(v) : "—", tone: (v > 0 ? "on" : "dim") as "on" | "dim" };
    });
    groups.push({
      label: `${currentDomain} · counted`,
      items,
      subtotal: { label: currentDomain, value: fmtMoney(domainSubtotal(currentDomain)) },
    });
  }

  // 2) Other counted domains, carried as one line each.
  // Direction-agnostic: drivers can be toggled in any order and the user can
  // navigate back, so "earlier/later" would mislabel (a real bug caught in audit).
  const carried = countedDomains.filter((d) => d !== currentDomain);
  if (carried.length > 0) {
    groups.push({
      label: "Elsewhere in your model",
      items: carried.map((d) => {
        const v = domainSubtotal(d);
        return { label: d, value: v > 0 ? fmtMoney(v) : "not yet on", tone: (v > 0 ? "on" : "dim") as "on" | "dim" };
      }),
    });
  }

  // 3) Tracked as proof — the non-financial domains + retention when it's tracked.
  const trackedItems = order
    .filter((d) => IP_COUNTED[d].length === 0)
    .map((d) => ({ label: TRACKED_LABEL[d] || d, value: "tracked", tone: "dim" as const }));
  if (!retentionCounted) {
    trackedItems.push({ label: "Provider Retention", value: "tracked", tone: "dim" as const });
  }
  if (trackedItems.length > 0) {
    groups.push({ label: "Tracked as proof", items: trackedItems });
  }

  const driversOn = countedDomains
    .flatMap((d) => countedFor(d))
    .filter((it) => val(it.engineKey) > 0).length;

  return {
    groups,
    grandValue: `${fmtMoney(grand)} / yr`,
    grandCaption:
      driversOn === 0
        ? "Turn on the drivers that apply. It grows as you do."
        : `${driversOn} driver${driversOn === 1 ? "" : "s"} on. It grows as you turn on more.`,
  };
}
