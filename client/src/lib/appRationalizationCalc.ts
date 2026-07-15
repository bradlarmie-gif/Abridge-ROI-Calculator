// App Rationalization: the customer's documentation-adjacent stack and the share
// Abridge can take on. Owns its own capability taxonomy (a superset of the
// Compare Pricing displacement categories) so that picker is untouched; reuses
// the same "spend x coverage%" displacement math pattern.

export type AppRatIconKey =
  | "ambientDoc" | "scribe" | "dictation" | "transcription" | "cds"
  | "preChartRisk" | "inEncounterCdi" | "postChartCoding" | "clinicalEvidence" | "custom";

export type AppRatCategoryId = AppRatIconKey;

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
  renewal?: string;         // "Open term" | "2026" | "Mid 2027" | "Unknown"; drives the roadmap later
  transitionMonths: number; // ramp, reused by later phases
}

const CATEGORY_BY_ID: Record<AppRatCategoryId, AppRatCategory> =
  Object.fromEntries(APP_RAT_CATEGORIES.map((c) => [c.id, c])) as Record<AppRatCategoryId, AppRatCategory>;

export function categoryLabel(id: AppRatCategoryId): string {
  return CATEGORY_BY_ID[id]?.label ?? "Application";
}

export function makeItem(id: string, category: AppRatCategoryId): AppRatItem {
  return { id, category, annualSpend: 0, coveragePct: 80, transitionMonths: 12 };
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

/** Command-search matcher: substring match on vendor names and category labels. */
export function searchApplications(query: string): { vendors: KnownVendor[]; categories: AppRatCategory[] } {
  const q = query.trim().toLowerCase();
  if (!q) return { vendors: [], categories: APP_RAT_CATEGORIES };
  const vendors = KNOWN_VENDORS.filter((v) => v.name.toLowerCase().includes(q));
  const categories = APP_RAT_CATEGORIES.filter((c) => c.label.toLowerCase().includes(q));
  return { vendors, categories };
}
