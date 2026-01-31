export type Industry =
  | "Automotive"
  | "DataCenterAI"
  | "Healthcare"
  | "Industrial"
  | "Consumer"
  | "Custom";

export type MountingType =
  | "RigidBoltDown"
  | "IsolatorMounted"
  | "Cantilevered"
  | "MultiPointConstrained"
  | "PottedEncapsulated"
  | "Custom";

export type ThermalCondition =
  | { kind: "Steady"; T_C: number }
  | {
      kind: "Cycle";
      Tmin_C: number;
      Tmax_C: number;
      ramp_C_per_min: number;
      soak_min: number;
      cycles_per_hour: number;
    };

export type PsdPoint = { f_hz: number; g2_per_hz: number };

export type PsdDefinition =
  | { kind: "Template"; templateId: string; scale: number }
  | { kind: "Csv"; name: string; points: PsdPoint[] };

export type MissionState = {
  id: string;
  name: string;
  duration_h: number;
  psd: PsdDefinition;
  thermal: ThermalCondition;
};

export type MissionProfile = {
  name: string;
  intendedLife_h: number;
  industry: Industry;
  states: MissionState[];
};

export type EquivalencyMethod = "FatigueDamage" | "Energy" | "Hybrid";
export type SolveFor = "t_test" | "k_scale" | "both";

export type AccelSettings = {
  method: EquivalencyMethod;
  solveFor: SolveFor;
  basePsdSource: "DominantDamageState" | "UserSelectedState";
  selectedStateId?: string;
  k_scale_default: number;
  t_test_h_default: number;
  gamma_energyCap: number;
  max_grms?: number;
};

export type ReliabilityDemo = {
  R_target: number;
  CL: number;
  c_allowed: number;
};

export type DutInputs = {
  m_dut_kg: number;
  fn_dut_hz_min: number;
  fn_dut_hz_max: number;
  dims_mm?: { L: number; W: number; H: number };
  mountingType: MountingType;
  fieldMountingType?: MountingType;
  testMountingType?: MountingType;
  k_safety: number;
  massRatioTarget: number;
  notchLimitPct: number;
  fixtureMass_kg?: number;
  span_mm?: number;
  material: "Al6061" | "Steel" | "Magnesium";
};

export type PsdTemplate = {
  id: string;
  name: string;
  points: PsdPoint[];
};

export type MissionTemplate = {
  id: string;
  industry: Industry;
  name: string;
  profile: MissionProfile;
  description?: string;
};

export type DamageBand = {
  f_start: number;
  f_end: number;
  f_center: number;
  energy: number;
  weight: number;
  score: number;
};

export type FixtureWarningLevel = "Info" | "Caution" | "Critical";

export type FixtureWarning = {
  level: FixtureWarningLevel;
  message: string;
};
