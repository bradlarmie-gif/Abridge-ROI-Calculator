// App Rationalization: the customer's documentation-adjacent stack and the share
// Abridge can take on. Owns its own capability taxonomy (a superset of the
// Compare Pricing displacement categories) so that picker is untouched; reuses
// the same "spend x coverage%" displacement math pattern.

export type AppRatIconKey =
  | "ambientDoc" | "scribe" | "dictation" | "transcription" | "cds"
  | "preChartRisk" | "inEncounterCdi" | "postChartCoding" | "clinicalEvidence" | "custom";

export type AppRatCategoryId = AppRatIconKey;

export type AppRatWhen = "thisYear" | "nextYear" | "year3" | "notSure";

export const AR_WHEN_OPTIONS: { value: AppRatWhen; label: string }[] = [
  { value: "thisYear", label: "This year" },
  { value: "nextYear", label: "Next year" },
  { value: "year3",    label: "Year 3" },
  { value: "notSure",  label: "Not sure" },
];

export interface AppRatCategory {
  id: AppRatCategoryId;
  label: string;
  hint: string;      // example vendors, shown under the category in search
  icon: AppRatIconKey;
}

export const APP_RAT_CATEGORIES: AppRatCategory[] = [
  { id: "ambientDoc",       label: "Ambient documentation",        hint: "Nuance DAX, Suki, Nabla, Ambience", icon: "ambientDoc" },
  { id: "dictation",        label: "Dictation",                    hint: "Fluency, Dragon Medical",           icon: "dictation" },
  { id: "scribe",           label: "Medical scribe",               hint: "in-person or virtual scribes",       icon: "scribe" },
  { id: "cds",              label: "Clinical decision support",    hint: "UpToDate, OpenEvidence",             icon: "cds" },
  { id: "preChartRisk",     label: "Pre-charting risk",            hint: "Iodine, Stanson",                    icon: "preChartRisk" },
  { id: "inEncounterCdi",   label: "In-encounter risk / CDI",      hint: "Stanson",                            icon: "inEncounterCdi" },
  { id: "postChartCoding",  label: "Post-charting CDI / coding",   hint: "Solventum",                          icon: "postChartCoding" },
  { id: "transcription",    label: "Transcription services",       hint: "outsourced or offshore",             icon: "transcription" },
  { id: "clinicalEvidence", label: "Clinical evidence & search",   hint: "OpenEvidence, redundant reference",  icon: "clinicalEvidence" },
  { id: "custom",           label: "Custom",                       hint: "not on the list",                    icon: "custom" },
];

export interface KnownVendor { name: string; category: AppRatCategoryId }

export const KNOWN_VENDORS: KnownVendor[] = [
  { name: "Nuance DAX", category: "ambientDoc" },
  { name: "Suki", category: "ambientDoc" },
  { name: "Nabla", category: "ambientDoc" },
  { name: "Ambience", category: "ambientDoc" },
  { name: "Fluency", category: "dictation" },
  { name: "Dragon Medical", category: "dictation" },
  { name: "UpToDate", category: "cds" },
  { name: "OpenEvidence", category: "cds" },
  { name: "Iodine", category: "preChartRisk" },
  { name: "Stanson", category: "inEncounterCdi" },
  { name: "Solventum", category: "postChartCoding" },
];

export interface AppRatItem {
  id: string;
  category: AppRatCategoryId;
  vendorName?: string;      // optional; display falls back to the category label
  annualSpend: number;
  coveragePct: number;      // 0-100; the share of THIS tool's spend Abridge can take on
  abridgeProduct?: string;  // "Covered by"; defaults to the category label when empty
  when: AppRatWhen;         // contract-year bucket for when the displacement lands
}

const CATEGORY_BY_ID: Record<AppRatCategoryId, AppRatCategory> =
  Object.fromEntries(APP_RAT_CATEGORIES.map((c) => [c.id, c])) as Record<AppRatCategoryId, AppRatCategory>;

export function categoryLabel(id: AppRatCategoryId): string {
  return CATEGORY_BY_ID[id]?.label ?? "Application";
}

// Starting displace share per capability: how much of that tool's spend Abridge
// can typically take on. The rep can still adjust per tool.
const CATEGORY_DEFAULT_COVERAGE: Record<AppRatCategoryId, number> = {
  ambientDoc:       100,
  dictation:        80,
  scribe:           90,
  cds:              90,
  clinicalEvidence: 90,
  transcription:    80,
  preChartRisk:     60,
  inEncounterCdi:   60,
  postChartCoding:  60,
  custom:           80,
};

export function makeItem(id: string, category: AppRatCategoryId): AppRatItem {
  return { id, category, annualSpend: 0, coveragePct: CATEGORY_DEFAULT_COVERAGE[category] ?? 80, when: "thisYear" };
}

export function itemDisplayName(item: AppRatItem): string {
  return item.vendorName?.trim() || categoryLabel(item.category);
}

export function itemRetired(item: AppRatItem): number {
  return Math.round((item.annualSpend || 0) * (item.coveragePct || 0) / 100);
}

export function itemStays(item: AppRatItem): number {
  return Math.max(0, (item.annualSpend || 0) - itemRetired(item));
}

export interface AppRatTotals {
  stackTotal: number;
  toAbridge: number;
  stays: number;
  pctToAbridge: number; // 0-100
}

export function computeTotals(items: AppRatItem[]): AppRatTotals {
  const stackTotal = items.reduce((s, i) => s + (i.annualSpend || 0), 0);
  const toAbridge = items.reduce((s, i) => s + itemRetired(i), 0);
  const stays = Math.max(0, stackTotal - toAbridge);
  const pctToAbridge = stackTotal > 0 ? Math.round((toAbridge / stackTotal) * 100) : 0;
  return { stackTotal, toAbridge, stays, pctToAbridge };
}

export interface AppRatNet {
  stackTotal: number;
  sunset: number;       // what consolidates onto Abridge (= computeTotals().toAbridge)
  stays: number;
  abridgePrice: number; // clamped >= 0
  netSavings: number;   // sunset - abridgePrice; may be negative (a net cost)
  isNetCost: boolean;   // netSavings < 0
}

/** Nets the single Abridge price against what sunsets onto Abridge. */
export function computeNet(items: AppRatItem[], abridgePrice: number): AppRatNet {
  const t = computeTotals(items);
  const price = Math.max(0, abridgePrice || 0);
  const netSavings = t.toAbridge - price;
  return {
    stackTotal: t.stackTotal,
    sunset: t.toAbridge,
    stays: t.stays,
    abridgePrice: price,
    netSavings,
    isNetCost: netSavings < 0,
  };
}

export interface StackBarTool {
  id: string;
  name: string;
  spend: number;
  sunset: number; // itemRetired
  stays: number;  // itemStays
}

export interface StackBars {
  stackTotal: number;
  sunset: number;
  stays: number;
  tools: StackBarTool[]; // spend-only tools, in the given order
}

/** Per-tool spend/sunset/stays for the consolidation magnitude bars. */
export function buildStackBars(items: AppRatItem[]): StackBars {
  const tools: StackBarTool[] = items
    .filter((i) => (i.annualSpend || 0) > 0)
    .map((i) => ({
      id: i.id,
      name: itemDisplayName(i),
      spend: i.annualSpend,
      sunset: itemRetired(i),
      stays: itemStays(i),
    }));
  return {
    stackTotal: tools.reduce((s, t) => s + t.spend, 0),
    sunset: tools.reduce((s, t) => s + t.sunset, 0),
    stays: tools.reduce((s, t) => s + t.stays, 0),
    tools,
  };
}

/** Command-search matcher: substring match on vendor names and category labels. */
export function searchApplications(query: string): { vendors: KnownVendor[]; categories: AppRatCategory[] } {
  const q = query.trim().toLowerCase();
  if (!q) return { vendors: [], categories: APP_RAT_CATEGORIES };
  const vendors = KNOWN_VENDORS.filter((v) => v.name.toLowerCase().includes(q));
  const categories = APP_RAT_CATEGORIES.filter((c) => c.label.toLowerCase().includes(q));
  return { vendors, categories };
}

const WHEN_TO_YEAR: Record<AppRatWhen, (term: number) => number> = {
  thisYear: () => 1,
  nextYear: () => 2,
  year3:    () => 3,
  notSure:  (term) => term,
};

/**
 * The contract year (1..termYears) in which a tool's displacement lands, from
 * its "when" bucket. "Not sure" holds to the last year (conservative). The
 * result is clamped to [1, termYears].
 */
export function retirementYear(item: AppRatItem, termYears: number): number {
  const term = Math.max(1, Math.floor(termYears));
  const raw = WHEN_TO_YEAR[item.when ?? "notSure"](term);
  return Math.min(term, Math.max(1, raw));
}
