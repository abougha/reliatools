export type IndustryId = "automotive" | "consumer" | "industrial" | "aerospace" | "medical";
export type ThermalCycleFreq = "rare" | "daily" | "power-cycling";
export type HumidityLevel = "low" | "medium" | "high";
export type VibrationLevel = "none" | "low" | "high";
export type ShockLevel = "none" | "occasional" | "frequent";
export type ChemicalExposure = "none" | "salt" | "oil" | "mixed";

export type AccelModelId = "arrhenius" | "coffin-manson" | "peck" | "eyring";
export type AccelerationModel = AccelModelId | "none";

export type TestCoverage = "high" | "medium" | "screening";
export type CoverageLevel = TestCoverage;

export type TestCategory = "thermal" | "mechanical" | "environmental" | "electrical" | "materials" | "screening";

export type ProductTypeId = string;

export type MechanismConfidence = "high" | "medium" | "assumed";

export type RiskTier = 1 | 2 | 3;

export interface ProductContext {
  productType: ProductTypeId | "";
  industry: IndustryId | "";
  safetyCritical: boolean;
  serviceLifeYears: number | null;
  warrantyYears: number | null;
}

export interface MissionProfile {
  tempMinC: number | null;
  tempMaxC: number | null;
  thermalCycleFreq: ThermalCycleFreq;
  humidity: HumidityLevel;
  humidityPct: number | null;
  humidityScenario?: "controlled" | "warehouse" | "coastal" | "condensing" | "";
  vibration: VibrationLevel;
  shock: ShockLevel;
  chemicalExposure: ChemicalExposure;
  activeDutyPct: number | null;
}

export interface MechanismSelection {
  id: string;
  name: string;
  selected: boolean;
  confidence: MechanismConfidence;
  exclusionJustification: string | null;
}

export interface ChangeTriggers {
  newMaterial: boolean;
  newSupplier: boolean;
  geometryChange: boolean;
  mountingRelocation: boolean;
  processChange: boolean;
  deratingChange: boolean;
  costDownVariant: boolean;
}

export interface MaterialsSelection {
  housingMaterialId?: string;
  sealMaterialId?: string;
  contactMaterialId?: string;
  platingId?: string;
  pcbSubstrateId?: string;
  solderAlloyId?: string;
  notes?: string;
}

export interface FailureModeSelection {
  selected: boolean;
  severity: 1 | 2 | 3 | 4 | 5;
  occurrence: 1 | 2 | 3 | 4 | 5;
  detection: 1 | 2 | 3 | 4 | 5;
  mechanismIds: string[];
  notes?: string;
}

export interface PriorEvidenceEntry {
  nPrev: number | null;
  fPrev: number | null;
  similarityPct: number;
  priorType: "jeffreys" | "uniform";
  alpha?: number;
  beta?: number;
  meanFailProb?: number;
  upperFailProb95?: number;
  upperFailProb90?: number;
}

export interface AccelerationInfo {
  model: AccelerationModel;
  params: Record<string, number>;
  userOverrides: {
    enabled: boolean;
    TuseK?: number;
    TstressK?: number;
    deltaTuse?: number;
    deltaTstress?: number;
    RHuse?: number;
    RHstress?: number;
    Ea?: number;
    n?: number;
    m?: number;
    notes?: string;
  };
  af: number | null;
  equivYears: number | null;
  warnings: string[];
}

export interface StressProfile {
  tempLowC?: number;
  tempHighC?: number;
  dwellMin?: number;
  rampRateCPerMin?: number;
  humidityPct?: number;
  vibLevel?: "none" | "low" | "high";
  shockLevel?: "none" | "occasional" | "frequent";
  electricalLoadNote?: string;
}

export interface SelectedTest {
  id: string;
  name: string;
  mechanismIds: string[];
  coverage: CoverageLevel;
  durationWeeks: number;
  costLevel: 1 | 2 | 3;
  status: "keep" | "downgrade" | "remove";
  removalJustification: string | null;
  acceleration: AccelerationInfo;
  stressProfile: StressProfile;
  sampleSizeOverride?: number;
}

export interface TestScore {
  severity: 1 | 2 | 3 | 4 | 5;
  likelihood: 1 | 2 | 3 | 4 | 5;
  detectability: 1 | 2 | 3 | 4 | 5;
  score: number;
  tier: RiskTier;
}

export interface PrioritizationState {
  testScores: Record<string, TestScore>;
}

export interface ResidualRiskEntry {
  covered: "yes" | "partial" | "no";
  residual: "low" | "medium" | "high";
  mitigations: string[];
}

export interface ResidualRiskState {
  perMechanism: Record<string, ResidualRiskEntry>;
}

export interface ReliabilityPlan {
  targetReliability: number;
  confidence: number;
  allowedFailures: number;
  missionTimeHours?: number;
  method: "binomial" | "weibull-basic";
  requiredSampleSize?: number;
  notes?: string;
}

export interface DvprRow {
  id: string;
  requirement: string;
  validationMethod: "Test" | "Analysis" | "Inspection";
  testId?: string;
  specRefs: Array<{ standard: string; clause?: string }>;
  conditions: string;
  sampleSize?: number;
  duration: {
    value: number;
    unit: "days" | "weeks";
  };
  risk?: {
    priorMean?: number;
    priorUpper95?: number;
    priorN?: number;
    priorF?: number;
    similarityPct?: number;
    badge?: "Low" | "Med" | "High" | "None";
  };
  acceptanceCriteria: string;
  owner: string;
  phase: "DV" | "PV" | "PQ";
  notes?: string;
}

export interface DvprState {
  rows: DvprRow[];
}

export interface ScheduleTask {
  id: string;
  testId: string;
  name: string;
  durationDays: number;
  dependsOnTaskIds: string[];
  resourceLane: "Thermal" | "Humidity" | "Vibration" | "Mechanical" | "Chemical";
  earliestStartDay?: number;
  latestFinishDay?: number;
}

export interface ScheduleState {
  strategy: "sequential" | "parallel-by-stressor" | "parallel-max";
  startDateISO?: string;
  tasks: ScheduleTask[];
}

export interface WizardState {
  product: ProductContext;
  missionProfile: MissionProfile;
  mechanisms: MechanismSelection[];
  materials: MaterialsSelection;
  failureModes: Record<string, FailureModeSelection>;
  priorEvidence: Record<string, PriorEvidenceEntry>;
  changes: ChangeTriggers;
  selectedTests: SelectedTest[];
  prioritization: PrioritizationState;
  residualRisk: ResidualRiskState;
  reliabilityPlan: ReliabilityPlan;
  dvpr: DvprState;
  schedule: ScheduleState;
}
