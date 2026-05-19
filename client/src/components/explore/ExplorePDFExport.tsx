import { pdf } from "@react-pdf/renderer";
import { savePdfBlob } from "@/lib/pdf-save";

// ───────────────────────── Type exports ─────────────────────────

export type ExploreCareSetting = "outpatient" | "ed" | "inpatient" | "nursing";

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
  pricingModel: "perProvider" | "perEncounter" | "annual";
  costPerProvider?: number;
  costPerEncounter?: number;
  annualLicenseFee?: number;
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
}

// ───────────────────────── Public API ─────────────────────────

export const generateExplorePDF = async (data: ExplorePDFData): Promise<void> => {
  // OP/ED/IP and Nursing all render through the Mercy-quality narrative PDF.
  // (Nursing additionally has its own dedicated generator and never reaches
  // this function in practice.) The legacy multi-page ExplorePDFDocument was
  // removed once the narrative PDF shipped — see git history for prior shape.
  const { ExploreNarrativePDFDocument } = await import("./ExploreNarrativePDF");
  const blob = await pdf(<ExploreNarrativePDFDocument data={data} />).toBlob();
  const safeOrg = (data.clientName || "abridge").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const safeDate = new Date().toISOString().slice(0, 10);
  await savePdfBlob(blob, `abridge-roi-${safeOrg}-${safeDate}.pdf`);
};
