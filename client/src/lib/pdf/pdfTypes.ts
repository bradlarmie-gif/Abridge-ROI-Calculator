import type { RoiInputs, LeverId } from '../roi-types';
import type { calculateRoi } from '../roi-calculator';

export interface ModelSnapshot {
  inputs: RoiInputs;
  results: ReturnType<typeof calculateRoi>;
  enabledDrivers: LeverId[];
  driverValues: Record<LeverId, number>;
  careSettingLabel: string;
  organizationName?: string;
  preparedFor?: string;
  preparedBy?: string;
  customNotes?: string;
  generatedDate: string;
}

export interface ScenarioSnapshot extends ModelSnapshot {
  id: string;
  name: string;
  type: 'expand_providers' | 'add_drivers' | 'new_care_setting';
  description: string;
}

export interface ExportConfig {
  exportType: 'baseline' | 'scenario' | 'comparison';
  includeSections: {
    executiveSummary: boolean;
    valueBreakdown: boolean;
    detailedCalculations: boolean;
    methodology: boolean;
  };
  includeBaselineComparison: boolean;
  scenario?: ScenarioSnapshot;
  scenarios?: ScenarioSnapshot[];
}

export interface DriverExplanation {
  title: string;
  problem: string;
  solution: string;
  mathSteps: string[];
  meaning: string;
  whyItMatters: string;
  assumptions: AssumptionItem[];
  validationGuidance: string;
}

export interface AssumptionItem {
  label: string;
  value: string;
  description: string;
  validation: string;
  industryRange?: string;
}

export interface PageProps {
  model: ModelSnapshot;
  config: ExportConfig;
}

export interface DriverPageProps extends PageProps {
  driverId: LeverId;
  driverValue: number;
  explanation: DriverExplanation;
}
