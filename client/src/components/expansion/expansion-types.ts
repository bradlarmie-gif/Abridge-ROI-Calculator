import type { LeverId } from "@/lib/roi-types";

export interface BaselineData {
  providers: number;
  encounters: number;
  utilization: number;
  costPerProviderMonth: number;
  annualCost: number;
  totalBenefit: number;
  netGain: number;
  roi: number;
  benefits: Partial<Record<LeverId, number>>;
  activeDrivers: LeverId[];
  careSetting?: string;
}

export interface PhasedWave {
  providers: number;
  month: number;
}

export interface PhasedPlan {
  wave1: PhasedWave;
  wave2: PhasedWave;
  wave3: PhasedWave;
}

export interface BaseDriverValidation {
  driverId: LeverId;
  baselineValue: number;
  scalingFactor: number;
  adjustedValue: number;
  confidence: "high" | "medium" | "low";
  notes: string;
}

export interface AccessValidation extends BaseDriverValidation {
  hasCapacity: boolean;
  sameDemand: boolean;
  additionalVisitsPerWeek: number;
}

export interface RetentionValidation extends BaseDriverValidation {
  sameTurnoverRisk: boolean;
  turnoverReduction: number;
}

export interface LosValidation extends BaseDriverValidation {
  sameCaseMix: boolean;
  wrvuUplift: number;
}

export interface DefaultDriverValidation extends BaseDriverValidation {
  inheritsFromBaseline: boolean;
}

export type DriverValidation = 
  | AccessValidation 
  | RetentionValidation 
  | LosValidation 
  | DefaultDriverValidation 
  | BaseDriverValidation;

export interface ExpansionInputs {
  targetProviders: number;
  rolloutType: "all-at-once" | "phased";
  phasedPlan: PhasedPlan;
  pricingModel: "per-provider" | "enterprise";
  enterpriseCost: number | null;
  driverValidations: Record<LeverId, DriverValidation>;
}

export interface MaturityPoint {
  month: number;
  providers: number;
  utilization: number;
  benefit: number;
  cost: number;
  netGain: number;
  roi: number;
}

export interface ExpansionResults {
  year1: {
    totalProviders: number;
    totalEncounters: number;
    totalCost: number;
    totalBenefit: number;
    netGain: number;
    roi: number;
  };
  year2: {
    totalProviders: number;
    totalEncounters: number;
    totalCost: number;
    totalBenefit: number;
    netGain: number;
    roi: number;
  };
  year3: {
    totalProviders: number;
    totalEncounters: number;
    totalCost: number;
    totalBenefit: number;
    netGain: number;
    roi: number;
  };
  threeYearTotal: {
    totalCost: number;
    totalBenefit: number;
    netGain: number;
    roi: number;
  };
  maturityCurve: MaturityPoint[];
  incremental: {
    providers: number;
    encounters: number;
    cost: number;
    benefit: number;
    netGain: number;
    roi: number;
  };
}
