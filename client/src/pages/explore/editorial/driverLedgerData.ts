import type { ExploreState, ExploreCareSetting } from "../ExploreFlow";
import { computeAllDriverValues, retentionIsCounted } from "@/lib/exploreDriverCalcs";
import type { LedgerGroup } from "./DriverLedger";
import { fmtMoney } from "./DriverLedger";

/**
 * The right-hand "Your model" ledger, computed identically on every driver
 * screen so the accumulation reads the same as you move through the flow.
 * Counted domains itemize to a subtotal; the domain you're on is broken out,
 * the others are carried; tracked domains sit under "Tracked as proof".
 *
 * Single source: reads dollars straight from the canonical engine, so the
 * ledger can never drift from the screen totals / proforma / PDF.
 */

type Domain = "Capacity" | "Workforce" | "Revenue" | "Quality";

interface CountedItem {
  label: string;
  engineKey: string;
}

// Counted (dollar) drivers per setting, by domain. Engine keys, not registry
// ids (they differ for wRVU/E&M). Tracked domains are empty here and surface
// under "Tracked as proof". Values always read from computeAllDriverValues.
const COUNTED_BY_SETTING: Record<ExploreCareSetting, Record<Domain, CountedItem[]>> = {
  outpatient: {
    Capacity: [{ label: "Patient Access", engineKey: "patientAccess" }],
    Workforce: [
      { label: "Provider Retention", engineKey: "providerWellbeing" },
      { label: "Locum & Agency Spend", engineKey: "physicianLocumAgency" },
      { label: "Scribe Spend", engineKey: "scribeCostReduction" },
    ],
    Revenue: [
      { label: "wRVU Capture", engineKey: "wrvu" },
      { label: "HCC Capture", engineKey: "hccCapture" },
      { label: "Medical Necessity Denials", engineKey: "denialPrevention" },
    ],
    Quality: [],
  },
  ed: {
    Capacity: [
      { label: "LWBS Recovery", engineKey: "lwbsRecovery" },
      { label: "Admission Capture", engineKey: "admissionCapture" },
    ],
    Workforce: [
      { label: "Provider Retention", engineKey: "providerWellbeing" },
      { label: "Locum & Agency Spend", engineKey: "physicianLocumAgency" },
      { label: "Scribe Spend", engineKey: "scribeCostReduction" },
    ],
    Revenue: [
      { label: "E&M Level Accuracy", engineKey: "edEmLevel" },
      { label: "Medical Necessity Denials", engineKey: "denialPrevention" },
    ],
    Quality: [],
  },
  inpatient: {
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
  },
  nursing: {
    Capacity: [{ label: "Overtime Spend", engineKey: "nursingOvertime" }],
    Workforce: [
      { label: "RN Retention", engineKey: "nursingRetention" },
      { label: "Travel & Agency Spend", engineKey: "nursingAgency" },
    ],
    Revenue: [],
    Quality: [
      { label: "HAPI Prevention", engineKey: "nursingHapi" },
      { label: "Falls Prevention", engineKey: "nursingFalls" },
      { label: "CAUTI Prevention", engineKey: "nursingCauti" },
      { label: "CLABSI Prevention", engineKey: "nursingClabsi" },
      { label: "Sepsis Bundle Compliance", engineKey: "nursingSepsis" },
    ],
  },
};

// Engine keys whose dollar only counts when the retention lens is on; otherwise
// they are tracked-as-proof and must not appear as a counted $0 (reads broken).
const RETENTION_LENS_KEYS = new Set([
  "providerWellbeing",
  "physicianLocumAgency",
  "nursingRetention",
  "nursingAgency",
]);
const retentionLabelFor = (s: ExploreCareSetting) => (s === "nursing" ? "RN Retention" : "Provider Retention");

export interface LedgerData {
  groups: LedgerGroup[];
  grandValue: string;
  grandCaption: string;
}

export function buildDriverLedger(
  state: ExploreState,
  totalHoursSaved: number,
  currentDomain: Domain,
  careSetting: ExploreCareSetting,
): LedgerData {
  const engine = computeAllDriverValues(state, totalHoursSaved);
  const retentionCounted = retentionIsCounted(state);
  const val = (k: string) => Math.round(engine[k] ?? 0);
  const COUNTED = COUNTED_BY_SETTING[careSetting];

  // Retention drivers drop out of "counted" when the lens is off.
  const countedFor = (d: Domain): CountedItem[] =>
    COUNTED[d].filter((it) => !RETENTION_LENS_KEYS.has(it.engineKey) || retentionCounted);

  const domainSubtotal = (d: Domain) =>
    countedFor(d).reduce((sum, it) => sum + val(it.engineKey), 0);

  const order: Domain[] = ["Capacity", "Workforce", "Revenue", "Quality"];
  // Dynamic: a domain drops to tracked if the lens empties all its counted
  // drivers (e.g. nursing Workforce when retention is tracked).
  const countedDomains = order.filter((d) => countedFor(d).length > 0);
  const grand = countedDomains.reduce((sum, d) => sum + domainSubtotal(d), 0);

  const groups: LedgerGroup[] = [];

  // 1) The domain you're on (itemized), if it's a counted domain.
  if (countedFor(currentDomain).length > 0) {
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

  // 2) Other counted domains, carried as one line each. Direction-agnostic
  // (drivers toggle in any order, user can navigate back).
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

  // 3) Tracked as proof — domains with no counted dollar, plus retention when
  // its domain still counts on another driver (so it isn't double-listed).
  const trackedItems = order
    .filter((d) => countedFor(d).length === 0)
    .map((d) => ({ label: d as string, value: "tracked", tone: "dim" as const }));
  if (!retentionCounted && countedDomains.includes("Workforce")) {
    trackedItems.push({ label: retentionLabelFor(careSetting), value: "tracked", tone: "dim" as const });
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

/** Back-compat wrapper — the four inpatient screens call this. */
export function buildInpatientLedger(
  state: ExploreState,
  totalHoursSaved: number,
  currentDomain: Domain,
): LedgerData {
  return buildDriverLedger(state, totalHoursSaved, currentDomain, "inpatient");
}
