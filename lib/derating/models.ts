// lib/derating/models.ts

export type ApplicationCategory =
  | "Commercial"
  | "Defence/Industry"
  | "Military/Aerospace"
  | "Space"
  | "Mechanical";

export type QualityClass =
  | "Class 1 (Verified Pedigree)"
  | "Class 1 (Standard)"
  | "Class 2"
  | "Not specified";

export type TempUnit = "C" | "F";
export type PressureUnit = "Pa" | "kPa" | "bar" | "psi";
export type MechanicalUnitSystem = "Metric" | "Imperial";

export type ComponentType =
  | "Silicon: Digital MOS"
  | "Resistor"
  | "Resistor Variable"
  | "Fixed, film, chip (PD < 1 W)"
  | "Transistor"
  | "Diode Signal"
  | "Capacitor"
  | "Transformer"
  | "Relays"
  | "Switches"
  | "Bearings"
  | "Springs"
  | "Seals";

export type DeratedParameter =
  | "TJ"
  | "Power"
  | "Power (D)"
  | "Voltage"
  | "Power (VA Load)"
  | "Contact Current"
  | "Speed, Load, Lubrication"
  | "Material properties, Size"
  | "Material characteristics, Size"
  | "Unknown";

export type RuleSource = "Table.xlsx" | "Manual" | "ConservativeFallback";
export type Status = "Pass" | "Attention" | "Fail";

/** A rule row (from Table.xlsx or org-defined library). */
export interface Rule {
  id: string;
  componentType: ComponentType;
  parameterDerated: DeratedParameter;
  applicationCategory: ApplicationCategory;
  qualityClass: QualityClass;

  /** Derating factor in [0..1], or null if N/A in source (e.g., MOS TJ limit) */
  deratingFactor: number | null;

  /** Optional operating limit for temperature-type rules.
   * Examples:
   * - "90C"
   * - "TJmax-50C"
   * Keep as string for audit/report; parsed into EffectiveRule where needed.
   */
  maxOperatingLimitExpr: string | null;

  typicalFailureMode?: string | null;
  source: RuleSource; // typically "Table.xlsx"
}

/** Effective rule after conservative fallback and/or manual overrides. */
export interface EffectiveRule extends Rule {
  source: RuleSource; // may be ConservativeFallback or Manual
  /** Set true if user toggled override fields vs defaults */
  isOverridden: boolean;
  /** If conservative fallback applied, capture which rule(s) were compared */
  conservativeFromRuleIds?: string[];
}

/** Project-level metadata and context. */
export interface ProjectMeta {
  projectName?: string;
  productName?: string;
  owner?: string;
  dateISO?: string; // yyyy-mm-dd or full ISO
}

/** Global settings */
export interface GlobalSettings {
  applicationCategory: ApplicationCategory;
  qualityClass: QualityClass;
  tempUnit: TempUnit; // display unit only; internal calcs in °C / K as needed
  mechanicalUnits: MechanicalUnitSystem;
  /** Seals use explicit pressure unit selector; internal store is Pa in records */
  defaultPressureUnit: PressureUnit;
  /** Rule matching behavior */
  requireExactRuleMatch: boolean; // default false (conservative fallback)
}

/** Threshold targets for Attention classification (Tab 4). */
export interface Targets {
  /** Primary target; keep DM as primary. */
  minDeratedDM: number; // default 0.20
  /** Auto-linked from DM unless decoupled. */
  minDeratedFOS: number; // default 1.25 (linked to DM=0.20)
  /** Temperature margin target for parts with limits */
  minTempMarginC: number; // default 10
  /** Advanced */
  decoupleDMFOS: boolean; // default false
}

/** Utility: common rated/applied field payloads */
export interface RatedApplied {
  rated: number; // must be > 0 for meaningful ratio
  applied: number; // must be >= 0
}

/** Component-specific inputs are stored as a union. */
export type ComponentInputs =
  | SiliconMosInputs
  | PowerInputs
  | VoltageInputs
  | CurrentInputs
  | TransformerInputs
  | BearingsInputs
  | SpringsInputs
  | SealsInputs
  | UnknownInputs;

/** Silicon MOS: TJ-only compliance limit + thermal estimation (Tab 2). */
export interface SiliconMosInputs {
  kind: "SiliconMos";

  // === Compliance (Tab 1) ===
  /** Max junction temp from datasheet; required if rule uses "TJmax-50C" */
  tjMaxC?: number;
  /** Applied/operating junction temperature (if known/measured) */
  tjAppliedC: number;

  // === Thermal Estimation (Tab 2) ===
  thermal?: {
    /** Power dissipation (W) - required for estimation */
    powerDissW: number;

    /** Path 1: Ambient-based estimation (default) */
    ambientPath?: {
      ambientC: number; // default 25
      rThetaJA_CPerW: number; // junction-to-ambient
    };

    /** Path 2: Case-based estimation (alternative) */
    casePath?: {
      caseC: number;
      rThetaJC_CPerW: number; // junction-to-case
    };

    /** Which path to use */
    selectedPath: "ambient" | "case";
  };
}

/** Generic power-based components: resistors, transistors. */
export interface PowerInputs {
  kind: "Power";
  power: RatedApplied; // W

  /** Optional: for resistor thermal calc mode 2 */
  thermal?: {
    ambientC?: number;
    rThetaCPerW?: number;
  };

  /** Optional endpoint model */
  endpoints?: {
    tMaxZeroPowerC?: number;
    tSFullPowerC?: number;
  };

  /** Optional: junction thermal estimation (for transistor-style parts) */
  junctionThermal?: {
    ambientC?: number; // default 25
    powerDissW: number;

    /** Ambient path */
    rThetaJA_CPerW?: number;

    /** Case path */
    caseC?: number;
    rThetaJC_CPerW?: number;

    selectedPath: "ambient" | "case";
  };
}

/** Voltage-based components: diode, capacitor. */
export interface VoltageInputs {
  kind: "Voltage";
  voltage: RatedApplied; // V
  /** Optional capacitor temperature check */
  capacitorTemp?: {
    ratedTempC?: number;
    operatingTempC?: number;
  };
}

/** Current-based components: relays, switches. */
export interface CurrentInputs {
  kind: "Current";
  current: RatedApplied; // A
}

/** Transformer VA load + thermal model inputs. */
export interface TransformerInputs {
  kind: "Transformer";
  va: RatedApplied; // VA
  thermal?: {
    ambientC?: number; // default 25
    ratedTempAtFullLoadC: number; // required for the 0.15/0.85 model
    hotSpotLimitC?: number; // optional
  };
}

/** Bearings: v1 uses DM/FOS vs targets; no numeric derating DF. */
export interface BearingsInputs {
  kind: "Bearings";
  radialLoad: RatedApplied; // N
  speedRpm: RatedApplied; // rpm
  lubrication: "Adequate" | "Marginal" | "Unknown";
}

/** Springs: DM/FOS on force (optionally deflection) */
export interface SpringsInputs {
  kind: "Springs";
  force: RatedApplied; // N
  deflectionMm?: RatedApplied;
  cyclesToLifeTarget?: number;
}

/** Seals: pressure + temperature limit. Pressure stored as Pa internally. */
export interface SealsInputs {
  kind: "Seals";
  pressurePa: RatedApplied; // Pa
  temperature: {
    ratedTempC: number;
    appliedTempC: number;
  };
  /** User-selected display unit for entry; converted to Pa internally */
  pressureUnit: PressureUnit;
}

/** Unknown / placeholder */
export interface UnknownInputs {
  kind: "Unknown";
}

/** Core component record (one BOM item). */
export interface ComponentRecord {
  id: string; // uuid
  refDes: string; // e.g., R12
  componentType: ComponentType;
  notes?: string;

  /** Rule selection */
  rule: {
    matchedRuleId?: string; // exact match if found
    effectiveRuleId?: string; // chosen (may be conservative)
    effectiveRule: EffectiveRule | null; // cached for report
  };

  /** User inputs */
  inputs: ComponentInputs;

  /** Results computed from inputs + effective rule (live-linked) */
  results: ComponentResults | null;
}

/** Computed ratio/margin block. */
export interface MarginResults {
  /** SR = applied/rated */
  sr: number;
  /** DM = 1 - SR */
  dm: number;
  /** FOS = rated/applied; null if applied=0 */
  fos: number | null;
}

/** Derated margin results vs Allowed */
export interface DeratedMarginResults {
  allowed: number; // rated * DF
  srDerated: number; // applied/allowed
  dmDerated: number; // 1 - srDerated
  fosDerated: number | null; // allowed/applied; null if applied=0
}

/** Thermal results (if modeled). */
export interface ThermalResults {
  model:
    | "None"
    | "TransformerPartialLoad"
    | "JunctionRTheta"
    | "ResistorEndpoint"
    | "ResistorPRTheta";
  ambientC?: number;
  estimatedTempC?: number; // TJ or component temp
  limitC?: number;
  marginC?: number; // limit - estimated
  status?: Status;
  notes?: string;
}

/** Benefit model results (relative λ/λ0). */
export interface BenefitResults {
  enabled: boolean;
  modelsUsed: Array<"Arrhenius" | "PowerLaw">;
  inputs: {
    t0C: number;
    tC: number;
    eaEv?: number; // Arrhenius
    s0?: number;
    s?: number;
    n?: number; // Power law

    /** Optional baseline failure rate for absolute calc */
    lambda0?: number;
  };
  lambdaRatioTemp?: number;
  lambdaRatioStress?: number;

  /** Combined λ/λ0 ratio (default 1 if disabled) */
  lambdaRatioCombined?: number;

  /** If lambda0 provided, absolute lambda can be computed */
  lambdaAbsolute?: number;
}

/** Component results across tabs */
export interface ComponentResults {
  status: Status;
  messages: Array<{ level: "info" | "warning" | "error"; text: string }>;

  parameterDerated: DeratedParameter;

  /** Some parts have multiple checks (e.g., seals: pressure + temp; bearings: load + speed).
   * Represent as named checks for reporting.
   */
  checks: Record<
    string,
    {
      kind: "Limit" | "Ratio";
      rated?: number;
      applied?: number;
      df?: number | null;
      margin?: MarginResults;
      derated?: DeratedMarginResults;
      pass: boolean;
      status: Status;
      note?: string;
    }
  >;

  thermal?: ThermalResults;
  benefit?: BenefitResults;

  /** Rollups for summary table (worst-case) */
  worst?: {
    minDeratedDM?: number;
    minDeratedFOS?: number | null;
    minTempMarginC?: number;
    limitingCheckKey?: string;
  };
}

/** Whole-app state container */
export interface DeratingNavigatorState {
  meta: ProjectMeta;
  settings: GlobalSettings;
  targets: Targets;
  rules: Rule[]; // rule library loaded at runtime
  components: ComponentRecord[];
  /** Cached overall status */
  overall: {
    status: Status;
    worst?: {
      componentId?: string;
      refDes?: string;
      limitingCheckKey?: string;
      minDeratedDM?: number;
      minDeratedFOS?: number | null;
      minTempMarginC?: number;
    };
  };
}
