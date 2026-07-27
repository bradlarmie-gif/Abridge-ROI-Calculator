// ───────────────────────── Type exports ─────────────────────────

export type ExploreCareSetting = "outpatient" | "ed" | "inpatient" | "nursing";

export interface ExploreCostDisplacementItem {
  id: string;
  label: string;
  annualSpend: number;
  displacementPct: number;
}

/**
 * @deprecated Legacy alias preserved for backward import compatibility.
 * The unified Sprint 2H PDF uses the quadrant-aware shape below.
 */
export interface ExploreDriver {
  id: string;
  name: string;
  value: number;
  category?: "time" | "documentation";
  calcSteps?: string[];
  calibrationNote?: string;
  inputs?: Record<string, number | string>;
}

export interface ExplorePDFValueArcStage {
  timing: string;
  metric: string;
}

export interface ExplorePDFValueArc {
  signal?: ExplorePDFValueArcStage;
  trend?: ExplorePDFValueArcStage;
  proof?: ExplorePDFValueArcStage;
}

export interface ExplorePDFQuadrantDriver {
  id: string;
  label: string;
  shortDescription: string;
  visibility: "quantified" | "qualitative";
  value: number;
  isChild?: boolean;
  calcSummary?: string;
  isIncluded?: boolean;
  valueArc?: ExplorePDFValueArc;
}

export interface ExplorePDFOtherBenefit {
  label: string;
  amount: number;
  type: "annual" | "oneTime";
}

export interface ExplorePDFQuadrantData {
  quadrant: "Capacity" | "Workforce" | "Revenue" | "Quality";
  annualTotal: number;
  oneTimeTotal: number;
  drivers: ExplorePDFQuadrantDriver[];
  otherFinancialBenefits: ExplorePDFOtherBenefit[];
}

export interface ExplorePDFData {
  // Cover page (preserved from prior shape)
  clientName: string;
  preparedBy: string;
  date: string;
  careSettingLabel: string;

  // Practice / setup
  careSetting: ExploreCareSetting;
  numberOfProviders: number;
  nursingStaffedBeds?: number;
  nursingOccupancyRate?: number;
  annualEncounters: number;
  utilizationPercent: number;

  // Time savings
  totalHoursSaved: number;
  minutesSavedPerEncounter: number;
  timePathScenario: string;

  // Quadrants — ordered Capacity, Workforce, Revenue, Quality
  quadrants: ExplorePDFQuadrantData[];
  totalAnnualValue: number;
  totalOneTimeValue: number;

  // Investment
  pricingModel: "perProvider" | "perEncounter" | "annual" | "platform";
  costPerProvider?: number;
  costPerEncounter?: number;
  annualLicenseFee?: number;
  platformEncRate?: number;
  implementationFee: number;
  includeImplementation: boolean;
  annualInvestment: number;

  // 3-Year Projection
  year2GrowthPercent: number;
  year3GrowthPercent: number;
  year1Value: number;
  year2Value: number;
  year3Value: number;
  year1Investment: number;
  year2Investment: number;
  year3Investment: number;
  year1Net: number;
  year2Net: number;
  year3Net: number;
  threeYearGrossTotal: number;
  threeYearInvestmentTotal: number;
  threeYearNetTotal: number;
  /** Selected projection horizon (1–3yr). This PDF doesn't render a year-by-year
      table, so it's carried for parity but unused here. */
  projectionYears?: number;

  // Headline
  netAnnualValue: number;
  roi: number;
  valuePerProvider: number;

  // Expansion opportunity (optional — only populated if user configured full-scale)
  expansionProviders?: number;
  expansionUtilizationPercent?: number;
  expansionAnnualValue?: number;
  expansionRoi?: number;
  expansionEncounters?: number;

  // Cost displacement (optional)
  costDisplacementItems?: ExploreCostDisplacementItem[];
  costDisplacementTotals?: { year1: number; year2: number; year3: number };
}

// ───────────────────────── Public API ─────────────────────────

/** localStorage key the print route reads the model snapshot from. */
export const EXPLORE_PDF_STORAGE_KEY = "abridge:explore-pdf";

/**
 * The editorial PDF is an HTML-print document (like the Attain PDF), not a
 * rasterized react-pdf blob — that's what lets it carry the full editorial
 * brand (custom Abridge font, gradients, exact spacing). We stash the model
 * snapshot in localStorage and open the print route (?explorepdf=1&print=1),
 * which renders <ExploreEditorialPdfDocument> and triggers the browser's
 * Save-as-PDF. All four care settings render from the same data shape.
 */
export const generateExplorePDF = async (data: ExplorePDFData): Promise<void> => {
  try {
    localStorage.setItem(EXPLORE_PDF_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable (private mode / quota) — the route falls back to sample data.
  }
  const url = `${window.location.pathname}?explorepdf=1&print=1`;
  window.open(url, "_blank", "noopener");
};
