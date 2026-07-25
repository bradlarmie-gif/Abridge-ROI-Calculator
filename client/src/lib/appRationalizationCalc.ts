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
  comingSoon?: boolean; // not yet displaceable by Abridge — shown last, not selectable
}

// Order matters: available capabilities first, then coming-soon ones, then Custom
// last. Every surface (grid, command search, add-tool picker) renders in this
// order, so marking a category comingSoon + placing it here sinks it everywhere.
export const APP_RAT_CATEGORIES: AppRatCategory[] = [
  { id: "ambientDoc",       label: "Ambient documentation",        hint: "Nuance DAX, Suki, Nabla, Ambience", icon: "ambientDoc" },
  { id: "dictation",        label: "Dictation",                    hint: "Dragon Medical One, Fluency",        icon: "dictation" },
  { id: "scribe",           label: "Medical scribe",               hint: "ScribeAmerica, Aquity",              icon: "scribe" },
  { id: "cds",              label: "Clinical decision support",    hint: "UpToDate, DynaMed, Epocrates",       icon: "cds" },
  { id: "transcription",    label: "Transcription services",       hint: "iMedX, Athreon, offshore",           icon: "transcription" },
  { id: "clinicalEvidence", label: "Clinical evidence & search",   hint: "OpenEvidence, ClinicalKey",          icon: "clinicalEvidence" },
  { id: "preChartRisk",     label: "Pre-charting risk",            hint: "Iodine, Regard, Navina",             icon: "preChartRisk",    comingSoon: true },
  { id: "inEncounterCdi",   label: "In-encounter risk / CDI",      hint: "Stanson, 3M CDI",                    icon: "inEncounterCdi",  comingSoon: true },
  { id: "postChartCoding",  label: "Post-charting CDI / coding",   hint: "Solventum, Optum360",                icon: "postChartCoding", comingSoon: true },
  { id: "custom",           label: "Custom",                       hint: "not on the list",                    icon: "custom" },
];

export interface KnownVendor { name: string; category: AppRatCategoryId }

// The common vendors health systems actually run, per capability. Searchable so a
// rep can type the tool they have and it lands in the right category. The subtext
// on each category only shows a couple; the full set lives here for search.
export const KNOWN_VENDORS: KnownVendor[] = [
  // Ambient documentation
  { name: "Nuance DAX", category: "ambientDoc" },
  { name: "DAX Copilot", category: "ambientDoc" },
  { name: "Suki", category: "ambientDoc" },
  { name: "Nabla", category: "ambientDoc" },
  { name: "Ambience", category: "ambientDoc" },
  { name: "DeepScribe", category: "ambientDoc" },
  { name: "Augmedix", category: "ambientDoc" },
  { name: "Sunoh.ai", category: "ambientDoc" },
  { name: "Freed", category: "ambientDoc" },
  { name: "Heidi", category: "ambientDoc" },
  { name: "Commure", category: "ambientDoc" },
  { name: "Corti", category: "ambientDoc" },

  // Dictation
  { name: "Dragon Medical One", category: "dictation" },
  { name: "Dragon Medical", category: "dictation" },
  { name: "Fluency Direct", category: "dictation" },
  { name: "Fluency", category: "dictation" },
  { name: "Philips SpeechLive", category: "dictation" },
  { name: "nVoq", category: "dictation" },

  // Medical scribe
  { name: "ScribeAmerica", category: "scribe" },
  { name: "Aquity Solutions", category: "scribe" },
  { name: "ProScribe", category: "scribe" },
  { name: "iScribes", category: "scribe" },
  { name: "Scribe-X", category: "scribe" },
  { name: "Physicians Angels", category: "scribe" },

  // Clinical decision support
  { name: "UpToDate", category: "cds" },
  { name: "DynaMed", category: "cds" },
  { name: "Epocrates", category: "cds" },
  { name: "VisualDx", category: "cds" },
  { name: "Isabel", category: "cds" },
  { name: "Lexicomp", category: "cds" },
  { name: "Micromedex", category: "cds" },

  // Pre-charting risk
  { name: "Iodine Software", category: "preChartRisk" },
  { name: "Iodine", category: "preChartRisk" },
  { name: "Regard", category: "preChartRisk" },
  { name: "Navina", category: "preChartRisk" },
  { name: "Xsolis", category: "preChartRisk" },
  { name: "Pieces", category: "preChartRisk" },

  // In-encounter risk / CDI
  { name: "Stanson", category: "inEncounterCdi" },
  { name: "Nuance CDE", category: "inEncounterCdi" },
  { name: "ChartWise", category: "inEncounterCdi" },
  { name: "Dolbey", category: "inEncounterCdi" },
  { name: "3M CDI", category: "inEncounterCdi" },

  // Post-charting CDI / coding
  { name: "Solventum", category: "postChartCoding" },
  { name: "3M 360 Encompass", category: "postChartCoding" },
  { name: "Optum360", category: "postChartCoding" },
  { name: "nThrive", category: "postChartCoding" },
  { name: "TruCode", category: "postChartCoding" },
  { name: "AGS Health", category: "postChartCoding" },
  { name: "CorroHealth", category: "postChartCoding" },
  { name: "Aviacode", category: "postChartCoding" },

  // Transcription services
  { name: "iMedX", category: "transcription" },
  { name: "Athreon", category: "transcription" },
  { name: "InfraWare", category: "transcription" },
  { name: "DataMatrix Medical", category: "transcription" },

  // Clinical evidence & search
  { name: "OpenEvidence", category: "clinicalEvidence" },
  { name: "ClinicalKey", category: "clinicalEvidence" },
  { name: "PubMed", category: "clinicalEvidence" },
  { name: "Read by QxMD", category: "clinicalEvidence" },
];

export interface AppRatItem {
  id: string;
  category: AppRatCategoryId;
  vendorName?: string;      // optional; display falls back to the category label
  annualSpend: number;
  coveragePct: number;      // 0-100; the share of THIS tool's spend Abridge can take on
  abridgeProduct?: string;  // "Covered by"; defaults to the category label when empty
  contractMonths: number;   // months from today until the contract ends (the runway)
  sunsetMonths: number;     // months from today until they sunset it; 0..contractMonths
  rampMonths: number;       // displacement speed: months to ramp savings 0->100% after the sunset (0 = instant)
  // How the rep entered the price. "flat" = a lump annual fee (also the
  // enterprise / unknown-headcount case); "perUser" = userCount x perUserCost,
  // which we auto-multiply into annualSpend. annualSpend stays the single source
  // everything downstream reads, so these are just how it was captured.
  pricingModel?: ArPricingModel;
  userCount?: number;       // seats, when priced per user
  perUserCost?: number;     // $/user/yr, when priced per user
}

export type ArPricingModel = "flat" | "perUser";

/** The effective annual spend from either pricing mode. Per-user multiplies
 *  seats x rate; flat takes the lump fee. Never negative. */
export function resolveAnnualSpend(
  model: ArPricingModel,
  flatSpend: number,
  userCount: number,
  perUserCost: number,
): number {
  if (model === "perUser") {
    return Math.round(Math.max(0, userCount || 0) * Math.max(0, perUserCost || 0));
  }
  return Math.max(0, Math.round(flatSpend || 0));
}

const CATEGORY_BY_ID: Record<AppRatCategoryId, AppRatCategory> =
  Object.fromEntries(APP_RAT_CATEGORIES.map((c) => [c.id, c])) as Record<AppRatCategoryId, AppRatCategory>;

export function categoryLabel(id: AppRatCategoryId): string {
  return CATEGORY_BY_ID[id]?.label ?? "Application";
}

// Starting displace share per capability: how much of that tool's spend Abridge
// can typically take on. The rep can still adjust per tool.
// Conservative starting shares: a defensible floor a prospect won't argue down,
// which the rep can raise per tool. Dictation is held at 80 per internal guidance.
// Reference tools (CDS, clinical evidence) are deliberately low since Abridge
// surfaces context rather than replacing a knowledge base. Validate against the
// per-capability rationale before treating these as fact.
const CATEGORY_DEFAULT_COVERAGE: Record<AppRatCategoryId, number> = {
  ambientDoc:       90,
  dictation:        80,
  scribe:           75,
  cds:              40,
  clinicalEvidence: 40,
  transcription:    75,
  preChartRisk:     45,
  inEncounterCdi:   45,
  postChartCoding:  45,
  custom:           50,
};

export function makeItem(id: string, category: AppRatCategoryId): AppRatItem {
  return { id, category, annualSpend: 0, coveragePct: CATEGORY_DEFAULT_COVERAGE[category] ?? 80, contractMonths: 12, sunsetMonths: 12, rampMonths: 3 };
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

// -------- Timing: cumulative savings over the horizon (the "when" view) --------

/** Monthly dollars a tool saves once it has sunset: its annual sunset value / 12. */
export function toolMonthlySaving(item: AppRatItem): number {
  return itemRetired(item) / 12;
}

export interface CumulativeTool {
  id: string;
  name: string;
  capability: string;
  spend: number;
  monthlySaving: number;
  contractMonths: number;
  sunsetMonths: number;   // clamped to [0, contractMonths]
  rampMonths: number;     // months to ramp savings 0->100% after the sunset (0 = instant)
  earlyMonths: number;    // contractMonths - sunsetMonths (months pulled forward)
  earlySaving: number;    // earlyMonths * monthlySaving (captured sooner by acting early)
}

export interface CumulativeSavings {
  horizonMonths: number;
  tools: CumulativeTool[]; // only tools that actually save (monthlySaving > 0)
  planTotal: number;       // cumulative saved by the horizon under the current sunset plan
  nowTotal: number;        // cumulative saved by the horizon if every tool sunset today (the ceiling)
  gap: number;             // nowTotal - planTotal: what waiting leaves on the table
  hasCurve: boolean;       // at least one tool saves
}

/**
 * The per-tool timing model, shared by the cumulative curve and the timing
 * summary. Only tools that actually save (monthlySaving > 0) are kept, so the
 * curve, the levers and the summary all see the same set. sunsetMonths is
 * clamped to [0, contractMonths]; contractMonths is floored at 0.
 */
export function buildCumulativeTools(items: AppRatItem[]): CumulativeTool[] {
  return items
    .map((i) => {
      const monthlySaving = toolMonthlySaving(i);
      const contractMonths = Math.max(0, Math.round(i.contractMonths ?? 0));
      const sunsetMonths = Math.min(contractMonths, Math.max(0, Math.round(i.sunsetMonths ?? 0)));
      const earlyMonths = Math.max(0, contractMonths - sunsetMonths);
      return {
        id: i.id,
        name: itemDisplayName(i),
        capability: categoryLabel(i.category),
        spend: i.annualSpend || 0,
        monthlySaving,
        contractMonths,
        sunsetMonths,
        rampMonths: Math.max(0, Math.round(i.rampMonths ?? 0)),
        earlyMonths,
        earlySaving: earlyMonths * monthlySaving,
      };
    })
    .filter((t) => t.monthlySaving > 0);
}

/**
 * Per-tool monthly savings and the aggregate plan-vs-now curve totals over a
 * horizon (in months). "Plan" starts each tool saving at its sunsetMonths;
 * "now" is the ceiling where every tool sunsets at month 0. sunsetMonths is
 * clamped to [0, contractMonths]; contractMonths is floored at 0.
 */
export function buildCumulativeSavings(items: AppRatItem[], horizonMonths: number): CumulativeSavings {
  const horizon = Math.max(0, Math.round(horizonMonths));
  const tools = buildCumulativeTools(items);

  const planTotal = cumulativeSavedAt(tools, horizon, "plan");
  const nowTotal = cumulativeSavedAt(tools, horizon, "now");
  return {
    horizonMonths: horizon,
    tools,
    planTotal,
    nowTotal,
    gap: Math.max(0, nowTotal - planTotal),
    hasCurve: tools.length > 0,
  };
}

/**
 * Effective full-saving-months accrued by `month` for a tool that starts at
 * `start` and ramps 0->100% over `ramp` months (linear). ramp=0 is an instant
 * step. During the ramp the accrual is the triangular area; after it, full rate.
 */
function realizedMonths(month: number, start: number, ramp: number): number {
  const t = month - start;
  if (t <= 0) return 0;
  if (ramp <= 0) return t;
  if (t <= ramp) return (t * t) / (2 * ramp);
  return t - ramp / 2;
}

export type CumulativeMode = "plan" | "now" | "renewal";

/**
 * Cumulative dollars saved by `month`, per mode:
 *  - "plan":    each tool starts saving at its chosen sunsetMonths (ramps over rampMonths).
 *  - "renewal": the "ride to renewal" baseline. Each tool starts at its contractMonths
 *               (it sunsets when the contract ends), ramping over the same rampMonths.
 *               Since sunsetMonths <= contractMonths, "plan" is always >= "renewal".
 *  - "now":     the instant ceiling: every tool fully displaced from month 0, no ramp.
 */
export function cumulativeSavedAt(tools: CumulativeTool[], month: number, mode: CumulativeMode): number {
  return tools.reduce((sum, t) => {
    const start = mode === "now" ? 0 : mode === "renewal" ? t.contractMonths : t.sunsetMonths;
    const ramp = mode === "now" ? 0 : t.rampMonths;
    return sum + t.monthlySaving * realizedMonths(month, start, ramp);
  }, 0);
}

export interface TimingSummary {
  /** Dollars captured sooner by exiting before renewal: sum of each tool's earlySaving
   *  (earlyMonths * monthlySaving). Zero when every tool rides to its contract end. */
  capturedSooner: number;
  /** When the stack is fully consolidated under the plan: the latest chosen sunset. */
  planFinishMonths: number;
  /** When it would fully consolidate if every tool rode to renewal: the latest contract end. */
  renewalFinishMonths: number;
  /** Months the plan pulls the finish line in vs riding to renewal (never negative). */
  monthsSooner: number;
  /** The tool with the latest renewal (max contractMonths); it gates the finish line. "" if none. */
  gatingToolName: string;
}

/**
 * The timing headline numbers for the "when it lands" view: how much is captured
 * sooner by exiting early, when the plan finishes vs riding to renewal, and which
 * tool's contract gates the finish line. Considers only tools that save.
 */
export function timingSummary(items: AppRatItem[]): TimingSummary {
  const tools = buildCumulativeTools(items);
  if (tools.length === 0) {
    return { capturedSooner: 0, planFinishMonths: 0, renewalFinishMonths: 0, monthsSooner: 0, gatingToolName: "" };
  }
  const capturedSooner = tools.reduce((s, t) => s + t.earlySaving, 0);
  const planFinishMonths = Math.max(...tools.map((t) => t.sunsetMonths));
  const renewalFinishMonths = Math.max(...tools.map((t) => t.contractMonths));
  const gating = tools.reduce((a, b) => (b.contractMonths > a.contractMonths ? b : a));
  return {
    capturedSooner,
    planFinishMonths,
    renewalFinishMonths,
    monthsSooner: Math.max(0, renewalFinishMonths - planFinishMonths),
    gatingToolName: gating.name,
  };
}

const MONTH_FMT = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

/** "now" at 0, else the MMM YYYY date `monthsFromNow` after `from` (default today). */
export function sunsetDateLabel(monthsFromNow: number, from: Date = new Date()): string {
  const m = Math.max(0, Math.round(monthsFromNow));
  if (m === 0) return "now";
  return MONTH_FMT.format(new Date(from.getFullYear(), from.getMonth() + m, 1));
}
