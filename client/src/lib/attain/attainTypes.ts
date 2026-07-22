/**
 * Attain — Value Attainment Strategy path.
 *
 * Data-layer types shared by the goal catalog (`attainGoals.ts`) and the
 * target/attainment math (`attainCalc.ts`). No UI lives here; the step
 * components (Task 4+) consume these shapes.
 */

export type AttainSetting = "outpatient" | "ed" | "inpatient" | "nursing";
export type GoalId = "access" | "retention" | "revenue" | "quality" | "capacity";
export type DomainPillKey = "Capacity" | "Workforce" | "Revenue" | "Quality";
export type AmbitionKey = "conservative" | "typical" | "ambitious";

/** One link in a goal's 7-link value chain. Structural template only — the
 * partner's observed values/owners/dates for a specific plan are runtime
 * state (Task 4+), not baked into the static catalog. */
export interface ChainLink {
  n: number;
  name: string;
  signal: string;
  ownerRole: string; // default role suggestion
  fragile: boolean; // links 3 & 4 by convention
  isAbridge: boolean; // links 1-2 delivered by Abridge
}

export interface Mechanism {
  heading: string;
  body: string;
}

export interface GoalDef {
  id: GoalId;
  label: string;
  pill: DomainPillKey;
  pillBg: string;
  domainSub: string;
  chainTitle: string;
  chainArrow: "↑" | "↓";
  quadrant: "Capacity" | "Workforce" | "Revenue" | "Quality"; // ties to existing calc
  chain: ChainLink[]; // 7 links
  mechanisms: Mechanism[]; // 3, for the hardest-link page
  flow: { label: string; kind: "start" | "mid" | "risk" | "end" }[]; // pill-flow
}

/** Per (setting, goal) copy + defaults — everything that varies by care
 * setting for a given goal. */
export interface SettingGoalContent {
  subtitle: string;
  thesis1: string;
  thesis2: string;
  p1Lead: string;
  /** `benchmark: true` marks a card whose number is an industry/typical
   * benchmark, not the partner's own measured value (the app collects no
   * baseline metric for these). The UI renders a visible "Benchmark" tag so
   * a benchmark is never mistaken for a derived partner figure. The one
   * derived card, scope, is injected by the renderer from the actual plan,
   * not carried here. */
  worldCards: { k: string; n: string; coral?: boolean; benchmark?: boolean; f: string }[];
  opportunity: string;
  trappedLabel: string;
  trappedSteps: string[];
  trappedCap: string;
  goodHead: string;
  goodCells: { n: string; coral?: boolean; k: string }[];
  curveIntro: string;
  bendsLead: string;
  bends: string[];
  bendsCloser: string;
  fragile: string;
  hardestTitle: string;
  hardestArrow: "↑" | "↓";
  hardestLead: string;
  splitLabel: string;
  splitLeft: [string, string];
  splitRight: [string, string];
  splitCloser: string;
  barHead: string;
  barAcc: number;
  barTarget: number;
  barAccLbl: string;
  barRelLbl: string;
  cadenceLead: string;
  monthly: string[];
  renewal: string;
  ambition: {
    key: AmbitionKey;
    label: string;
    goalLabel: string;
    goalMargin: number;
  }[];
}

/** The unit of "how much is in scope" for a plan — providers, beds, or
 * nurses depending on setting/goal. Collected by the Scope step (Task 5). */
export interface AttainScope {
  unitCount: number;
  serviceLines: string[];
}

/** Full state for one in-progress or saved Value Attainment plan. Built up
 * across the Setting → Vision → Scope → Ambition → Path → Baseline → Plan
 * steps (Task 4-7); the engine functions in `attainCalc.ts` only need the
 * fields below to compute targets and attainment. */
export interface AttainState {
  setting: AttainSetting | null;
  goal: GoalId | null;
  scope: AttainScope;
  ambitionKey: AmbitionKey | null;
  /** Months elapsed since kickoff ("Today" marker on the curve). */
  monthsElapsed: number;
  /** Months from kickoff to the goal horizon ("Goal" marker on the curve). */
  totalMonths: number;
  /** 0-1. How much of the fragile-middle links are actually converting
   * relative to the plan's pace. 1 = on the coral plan line; lower values
   * drift toward "what usually happens". Defaults to 1 (assume on-pace)
   * until the Path/Baseline steps observe otherwise. */
  progressRatio: number;
}

export const DEFAULT_ATTAIN_SCOPE: AttainScope = {
  unitCount: 0,
  serviceLines: [],
};

export const DEFAULT_ATTAIN_STATE: AttainState = {
  setting: null,
  goal: null,
  scope: DEFAULT_ATTAIN_SCOPE,
  ambitionKey: null,
  monthsElapsed: 0,
  totalMonths: 9,
  progressRatio: 1,
};
