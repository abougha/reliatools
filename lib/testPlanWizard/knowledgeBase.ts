// /lib/testPlanWizard/knowledgeBase.ts
// Starter knowledge base for Reliability Test Architect (Reliatools)
// ~10 mechanisms, ~15 tests, mappings, defaults, and 3 mission presets.

import type {
  AccelModelId,
  ChemicalExposure,
  HumidityLevel,
  IndustryId,
  ShockLevel,
  TestCategory,
  TestCoverage,
  ThermalCycleFreq,
  VibrationLevel,
} from "./types";

export type {
  AccelModelId,
  ChemicalExposure,
  HumidityLevel,
  IndustryId,
  ShockLevel,
  TestCategory,
  TestCoverage,
  ThermalCycleFreq,
  VibrationLevel,
} from "./types";
export type ProductType = {
  id: string; // stable
  name: string;
  domainTags: string[]; // free tags for matching
  defaultMechanismIds: string[];
  defaultTestProfileId?: string;
};

export type MissionProfilePreset = {
  id: string;
  name: string;
  params: {
    tempMinC: number;
    tempMaxC: number;
    humidity: HumidityLevel;
    vibration: VibrationLevel;
    shock: ShockLevel;
    chemicalExposure: ChemicalExposure;
    thermalCycleFreq: ThermalCycleFreq;
    activeDutyPct: number; // 0-100
  };
  notes?: string[];
};

export type Stressor = {
  id: string;
  name: string;
  unit?: string;
  description?: string;
};

export type FailureMechanism = {
  id: string;
  name: string;
  description: string;
  typicalSymptoms: string[];
  stressorIds: string[];
  recommendedModels: Array<AccelModelId | "none">;
  applicableProductTags?: string[];
};

export type ValidityRule = {
  id: string;
  severity: "info" | "warn" | "block";
  message: string;
  // NOTE: keep "when" logic in code (logic.ts). Here we only define rule IDs/messages.
  // This keeps the KB serializable and easy to extend.
};

export type TestDefinition = {
  id: string;
  name: string;
  category: TestCategory;
  description: string;

  mechanismIds: string[];
  stressorIds: string[];

  defaults: {
    coverage: TestCoverage;
    durationWeeks: number;
    costLevel: 1 | 2 | 3; // $, $$, $$$
    sampleSizeHint?: string;
  };

  acceleration: {
    model: AccelModelId | "none";
    parameterDefaults?: Record<string, number>; // Ea, n, m...
    validityRuleIds?: string[]; // references VALIDITY_RULES
  };

  references?: Array<{
    standard: string;
    clause?: string;
    note?: string;
  }>;
};

export type AccelModelDefinition = {
  id: AccelModelId;
  name: string;
  equationLatex: string;
  parameters: Array<{
    key: string;
    label: string;
    defaultValue: number;
    unit?: string;
    tooltip?: string;
  }>;
};

export type MaterialEntry = {
  id: string;
  name: string;
  category: "housing" | "seal" | "contact" | "plating" | "pcb" | "solder";
  tags: string[];
  eaRange?: { min: number; max: number };
  notes?: string[];
};

export type FailureModeEntry = {
  id: string;
  name: string;
  description: string;
  defaultSeverity: 1 | 2 | 3 | 4 | 5;
  defaultOccurrence: 1 | 2 | 3 | 4 | 5;
  defaultDetection: 1 | 2 | 3 | 4 | 5;
  mechanismIds: string[];
};

//
// 1) Mission Presets (3)
//
export const MISSION_PRESETS: MissionProfilePreset[] = [
  {
    id: "auto-underhood",
    name: "Automotive - Under-hood (engine bay)",
    params: {
      tempMinC: -40,
      tempMaxC: 125,
      humidity: "medium",
      vibration: "high",
      shock: "occasional",
      chemicalExposure: "mixed", // salt + oil + fluids plausible
      thermalCycleFreq: "daily",
      activeDutyPct: 15,
    },
    notes: [
      "High thermal cycling and vibration drive fatigue, fretting, and solder/joint failures.",
      "Chemical exposure includes road salt mist, oils, coolants depending on location.",
    ],
  },
  {
    id: "auto-cabin",
    name: "Automotive - Cabin / Interior",
    params: {
      tempMinC: -30,
      tempMaxC: 85,
      humidity: "medium",
      vibration: "low",
      shock: "none",
      chemicalExposure: "none",
      thermalCycleFreq: "daily",
      activeDutyPct: 25,
    },
    notes: [
      "Thermal aging still relevant; lower vibration reduces fretting risk (but not zero).",
      "Condensation events can happen seasonally; validate sealing if applicable.",
    ],
  },
  {
    id: "datacenter",
    name: "Data Center - 24/7 electronics (controlled environment)",
    params: {
      tempMinC: 18,
      tempMaxC: 45,
      humidity: "low",
      vibration: "none",
      shock: "none",
      chemicalExposure: "none",
      thermalCycleFreq: "power-cycling",
      activeDutyPct: 90,
    },
    notes: [
      "Power cycling and sustained operation dominate; electromigration and thermal aging are key.",
      "Airflow/hot spots matter: validate with realistic power profiles if possible.",
    ],
  },
];

//
// 2) Product Types (optional starter)
//
export const PRODUCT_TYPES: ProductType[] = [
  {
    id: "connector-lv",
    name: "Low-voltage Connector",
    domainTags: ["connector", "automotive", "electromechanical", "polymer"],
    defaultMechanismIds: ["fretting-corrosion", "thermal-aging", "creep-relaxation", "vibration-fatigue", "seal-degradation"],
    defaultTestProfileId: "auto-underhood",
  },
  {
    id: "ecu-module",
    name: "ECU / Electronic Module",
    domainTags: ["ecu", "electronics", "pcb", "automotive"],
    defaultMechanismIds: ["thermal-fatigue", "thermal-aging", "vibration-fatigue", "eos-overstress", "humidity-corrosion"],
    defaultTestProfileId: "auto-underhood",
  },
  {
    id: "pcb-assembly",
    name: "PCB Assembly",
    domainTags: ["pcb", "electronics", "solder", "components"],
    defaultMechanismIds: ["thermal-fatigue", "thermal-aging", "humidity-corrosion", "electromigration", "eos-overstress"],
    defaultTestProfileId: "datacenter",
  },
  {
    id: "sensor",
    name: "Sensor (Mechatronic)",
    domainTags: ["sensor", "mechatronic", "automotive"],
    defaultMechanismIds: ["thermal-fatigue", "thermal-aging", "vibration-fatigue", "seal-degradation", "humidity-corrosion"],
    defaultTestProfileId: "auto-underhood",
  },
];
export const productTypeOptions = PRODUCT_TYPES.map((productType) => ({
  value: productType.id,
  label: productType.name,
}));

export const industryOptions: Array<{ value: IndustryId; label: string }> = [
  { value: "automotive", label: "Automotive" },
  { value: "consumer", label: "Consumer" },
  { value: "industrial", label: "Industrial" },
  { value: "aerospace", label: "Aerospace" },
  { value: "medical", label: "Medical" },
];

//
// 2b) Material Library
//
export const MATERIAL_LIBRARY: MaterialEntry[] = [
  {
    id: "pa66-gf30",
    name: "PA66-GF30",
    category: "housing",
    tags: ["polymer", "housing", "automotive"],
    eaRange: { min: 0.6, max: 0.9 },
    notes: ["Common automotive connector housing material; watch moisture uptake."],
  },
  {
    id: "pbt-gf",
    name: "PBT-GF",
    category: "housing",
    tags: ["polymer", "housing"],
    eaRange: { min: 0.5, max: 0.85 },
    notes: ["Good dimensional stability; verify chemical compatibility."],
  },
  {
    id: "pps",
    name: "PPS",
    category: "housing",
    tags: ["polymer", "high-temp"],
    eaRange: { min: 0.7, max: 1.0 },
    notes: ["High temperature stability; more brittle at cold."],
  },
  {
    id: "silicone",
    name: "Silicone",
    category: "seal",
    tags: ["seal", "elastomer"],
    eaRange: { min: 0.4, max: 0.7 },
    notes: ["Excellent temperature range; check compression set."],
  },
  {
    id: "epdm",
    name: "EPDM",
    category: "seal",
    tags: ["seal", "elastomer"],
    eaRange: { min: 0.5, max: 0.8 },
    notes: ["Good weathering; check compatibility with oils."],
  },
  {
    id: "cusn",
    name: "CuSn",
    category: "contact",
    tags: ["contact", "copper-alloy"],
    notes: ["Tin bronze; common for contacts."],
  },
  {
    id: "cunisi",
    name: "CuNiSi",
    category: "contact",
    tags: ["contact", "copper-alloy", "high-strength"],
    notes: ["Higher strength contact alloy; watch plating adhesion."],
  },
  {
    id: "tin",
    name: "Tin",
    category: "plating",
    tags: ["plating", "connector"],
    notes: ["Cost effective; prone to fretting corrosion in vibration."],
  },
  {
    id: "silver",
    name: "Silver",
    category: "plating",
    tags: ["plating", "connector"],
    notes: ["Low contact resistance; watch sulfur tarnish."],
  },
  {
    id: "gold",
    name: "Gold",
    category: "plating",
    tags: ["plating", "connector", "high-reliability"],
    notes: ["High reliability; thicker plating reduces wear risk."],
  },
  {
    id: "fr4",
    name: "FR-4",
    category: "pcb",
    tags: ["pcb", "laminate"],
    eaRange: { min: 0.7, max: 1.0 },
    notes: ["Standard PCB substrate; watch Tg and moisture sensitivity."],
  },
  {
    id: "sac305",
    name: "SAC305",
    category: "solder",
    tags: ["solder", "pb-free"],
    notes: ["Common Pb-free solder; thermal fatigue sensitivity."],
  },
];

//
// 2c) Failure Mode Library (~10)
//
export const FAILURE_MODE_LIBRARY: FailureModeEntry[] = [
  {
    id: "intermittent-open",
    name: "Intermittent open at contact",
    description: "Contact intermittency due to fretting, vibration, or poor retention.",
    defaultSeverity: 4,
    defaultOccurrence: 3,
    defaultDetection: 3,
    mechanismIds: ["fretting-corrosion", "vibration-fatigue"],
  },
  {
    id: "contact-resistance-drift",
    name: "Contact resistance drift",
    description: "Resistance drift from creep, oxidation, or corrosion.",
    defaultSeverity: 3,
    defaultOccurrence: 3,
    defaultDetection: 3,
    mechanismIds: ["creep-relaxation", "humidity-corrosion"],
  },
  {
    id: "water-ingress",
    name: "Water ingress",
    description: "Sealing failure allowing moisture ingress.",
    defaultSeverity: 4,
    defaultOccurrence: 2,
    defaultDetection: 4,
    mechanismIds: ["seal-degradation"],
  },
  {
    id: "solder-crack",
    name: "Solder joint crack",
    description: "Cracks in solder joints from thermal fatigue.",
    defaultSeverity: 4,
    defaultOccurrence: 3,
    defaultDetection: 3,
    mechanismIds: ["thermal-fatigue"],
  },
  {
    id: "eos-damage",
    name: "EOS damage",
    description: "Electrical overstress resulting in latent or catastrophic damage.",
    defaultSeverity: 5,
    defaultOccurrence: 2,
    defaultDetection: 3,
    mechanismIds: ["eos-overstress"],
  },
  {
    id: "corrosion-bridging",
    name: "Corrosion bridging / leakage",
    description: "Corrosion and ionic leakage causing shorts or leakage current.",
    defaultSeverity: 4,
    defaultOccurrence: 3,
    defaultDetection: 3,
    mechanismIds: ["humidity-corrosion"],
  },
  {
    id: "seal-crack",
    name: "Seal cracking",
    description: "Seal crack or deformation due to thermal aging or chemical attack.",
    defaultSeverity: 4,
    defaultOccurrence: 2,
    defaultDetection: 4,
    mechanismIds: ["seal-degradation", "chemical-attack", "thermal-aging"],
  },
  {
    id: "fatigue-fracture",
    name: "Structural fatigue fracture",
    description: "Mechanical fatigue cracks due to vibration or shock.",
    defaultSeverity: 4,
    defaultOccurrence: 2,
    defaultDetection: 3,
    mechanismIds: ["vibration-fatigue"],
  },
  {
    id: "material-embrittlement",
    name: "Material embrittlement",
    description: "Thermal aging drives embrittlement or loss of ductility.",
    defaultSeverity: 3,
    defaultOccurrence: 2,
    defaultDetection: 3,
    mechanismIds: ["thermal-aging"],
  },
  {
    id: "electromigration-open",
    name: "Electromigration open",
    description: "Interconnect opens due to high current density over time.",
    defaultSeverity: 4,
    defaultOccurrence: 2,
    defaultDetection: 3,
    mechanismIds: ["electromigration"],
  },
];

//
// 3) Stressors
//
export const STRESSORS: Stressor[] = [
  { id: "temperature", name: "Temperature", unit: "degC", description: "Steady-state temperature exposure / storage." },
  { id: "deltaT", name: "Thermal Cycling (Delta T)", unit: "degC", description: "Temperature swings causing CTE-driven stress." },
  { id: "humidity", name: "Humidity / Moisture", unit: "%RH", description: "Moisture/condensation driving corrosion and leakage." },
  { id: "vibration", name: "Vibration", unit: "g", description: "Random/sine vibration causing fatigue and fretting." },
  { id: "shock", name: "Mechanical Shock", unit: "g", description: "Handling / impact events." },
  { id: "chemical", name: "Chemical Exposure", description: "Road salt, oils, fuels, coolants, cleaning agents." },
  { id: "electrical-load", name: "Electrical Load", description: "Current/voltage stress, ripple, switching." },
  { id: "contact-motion", name: "Micro-motion", description: "Small relative motion at interfaces enabling fretting." },
  { id: "particles-dust", name: "Particles / Dust", description: "Contaminants affecting sealing/contact integrity." },
];

//
// 4) Failure Mechanisms (~10)
//
export const MECHANISMS: FailureMechanism[] = [
  {
    id: "thermal-fatigue",
    name: "Thermal Fatigue (CTE mismatch)",
    description: "Cyclic thermal strain drives cracks in solder joints, welds, and interfaces.",
    typicalSymptoms: ["Intermittent opens", "Cracked solder", "Resistance drift after cycling"],
    stressorIds: ["deltaT", "temperature"],
    recommendedModels: ["coffin-manson"],
    applicableProductTags: ["pcb", "electronics", "ecu", "sensor"],
  },
  {
    id: "thermal-aging",
    name: "Thermal Aging / Diffusion",
    description: "Time-at-temperature accelerates diffusion, embrittlement, oxidation, and property drift.",
    typicalSymptoms: ["Brittle plastics", "Oxidized contacts", "Drift in parameters"],
    stressorIds: ["temperature"],
    recommendedModels: ["arrhenius"],
    applicableProductTags: ["polymer", "connector", "electronics"],
  },
  {
    id: "creep-relaxation",
    name: "Creep / Stress Relaxation",
    description: "Sustained load + temperature reduces contact force and clamping, increasing resistance or leaks.",
    typicalSymptoms: ["Loss of retention", "Increased contact resistance", "Seal leakage over time"],
    stressorIds: ["temperature"],
    recommendedModels: ["arrhenius"],
    applicableProductTags: ["connector", "polymer", "mechatronic"],
  },
  {
    id: "fretting-corrosion",
    name: "Fretting Corrosion (Micro-motion)",
    description: "Micro-motion + vibration forms debris/oxides at contacts increasing resistance and intermittency.",
    typicalSymptoms: ["Intermittent signal", "Black debris", "Resistance spikes"],
    stressorIds: ["vibration", "contact-motion", "humidity"],
    recommendedModels: ["none"],
    applicableProductTags: ["connector", "automotive"],
  },
  {
    id: "humidity-corrosion",
    name: "Humidity-Driven Corrosion / Leakage",
    description: "Moisture/condensation enables corrosion and ionic leakage on surfaces.",
    typicalSymptoms: ["Green corrosion", "Leakage current", "Dendrites"],
    stressorIds: ["humidity", "temperature"],
    recommendedModels: ["peck", "eyring"],
    applicableProductTags: ["pcb", "electronics", "connector"],
  },
  {
    id: "chemical-attack",
    name: "Chemical Attack / Swell / Degradation",
    description: "Chemical exposure degrades polymers, seals, and coatings; can cause cracks or loss of sealing.",
    typicalSymptoms: ["Swelling", "Cracking", "Softening", "Seal deformation"],
    stressorIds: ["chemical", "temperature"],
    recommendedModels: ["eyring"],
    applicableProductTags: ["polymer", "connector", "automotive"],
  },
  {
    id: "vibration-fatigue",
    name: "Vibration-Induced Fatigue",
    description: "Dynamic mechanical loads cause fatigue cracks in leads, welds, and structures.",
    typicalSymptoms: ["Cracked leads", "Broken welds", "Open circuits after vibration"],
    stressorIds: ["vibration", "shock"],
    recommendedModels: ["none"],
    applicableProductTags: ["automotive", "mechatronic", "electronics"],
  },
  {
    id: "seal-degradation",
    name: "Seal Degradation / Water Ingress",
    description: "Seals lose elasticity or are damaged, allowing water ingress and downstream corrosion/shorts.",
    typicalSymptoms: ["Ingress", "Corrosion inside housing", "Shorts"],
    stressorIds: ["humidity", "chemical", "particles-dust"],
    recommendedModels: ["none"],
    applicableProductTags: ["connector", "sensor", "automotive"],
  },
  {
    id: "electromigration",
    name: "Electromigration (High current density)",
    description: "Metal atom transport under current density causes opens/shorts in interconnects over time.",
    typicalSymptoms: ["Open circuits", "Voids/hillocks", "Early-life drift then sudden failure"],
    stressorIds: ["electrical-load", "temperature"],
    recommendedModels: ["arrhenius"],
    applicableProductTags: ["datacenter", "electronics", "pcb"],
  },
  {
    id: "eos-overstress",
    name: "Electrical Overstress (EOS) / Transients",
    description: "Electrical events exceed ratings causing latent or catastrophic damage.",
    typicalSymptoms: ["Blown input protection", "Catastrophic shorts", "Latent fails post-event"],
    stressorIds: ["electrical-load"],
    recommendedModels: ["none"],
    applicableProductTags: ["electronics", "ecu", "pcb"],
  },
];

//
// 5) Acceleration Models (starter definitions)
//
export const ACCEL_MODELS: AccelModelDefinition[] = [
  {
    id: "arrhenius",
    name: "Arrhenius",
    equationLatex: String.raw`AF=\\exp\\left(\\frac{E_a}{k}\\left(\\frac{1}{T_{use}}-\\frac{1}{T_{stress}}\\right)\\right)` ,
    parameters: [
      { key: "Ea", label: "Activation Energy", defaultValue: 0.7, unit: "eV", tooltip: "Typical range 0.4-1.2 eV depending on mechanism/material." },
    ],
  },
  {
    id: "coffin-manson",
    name: "Coffin-Manson (Delta T)",
    equationLatex: String.raw`AF=\\left(\\frac{\\Delta T_{stress}}{\\Delta T_{use}}\\right)^{n}` ,
    parameters: [
      { key: "n", label: "Exponent", defaultValue: 1.9, tooltip: "Often ~1.5-2.5 depending on package/interconnect." },
    ],
  },
  {
    id: "peck",
    name: "Peck (Humidity + Temperature)",
    equationLatex: String.raw`AF=\\left(\\frac{RH_{stress}}{RH_{use}}\\right)^{m}\\exp\\left(\\frac{E_a}{k}\\left(\\frac{1}{T_{use}}-\\frac{1}{T_{stress}}\\right)\\right)` ,
    parameters: [
      { key: "m", label: "Humidity Exponent", defaultValue: 2.7, tooltip: "Commonly 2-4; depends on failure mode and materials." },
      { key: "Ea", label: "Activation Energy", defaultValue: 0.7, unit: "eV" },
    ],
  },
  {
    id: "eyring",
    name: "Eyring (Generalized)",
    equationLatex: String.raw`AF=\\exp\\left(\\frac{E_a}{k}\\left(\\frac{1}{T_{use}}-\\frac{1}{T_{stress}}\\right)\\right)\\cdot f(\\text{stressor})` ,
    parameters: [{ key: "Ea", label: "Activation Energy", defaultValue: 0.7, unit: "eV", tooltip: "Use when an extra stressor factor is applied." }],
  },
];

//
// 6) Validity Rules (IDs referenced by tests; implement logic in logic.ts)
//
export const VALIDITY_RULES: ValidityRule[] = [
  {
    id: "warn-very-high-stress-temp",
    severity: "warn",
    message: "Stress temperature appears very high; confirm this is representative and within material limits.",
  },
  {
    id: "warn-huge-af",
    severity: "warn",
    message: "Acceleration factor is extremely large; results may be dominated by unrealistic over-stress.",
  },
  {
    id: "warn-small-deltaT",
    severity: "warn",
    message: "Delta T in mission profile is small; thermal cycling acceleration may be weak or not representative.",
  },
  {
    id: "info-power-cycling-dominant",
    severity: "info",
    message: "Power cycling appears dominant; ensure power profile is realistic (duty cycle, ripple, hot spots).",
  },
  {
    id: "warn-chem-exposure-none",
    severity: "info",
    message: "Chemical exposure set to none; if under-hood, reconsider oils/salts/cleaners.",
  },
];

//
// 7) Test Definitions (~15)
//
export const TESTS: TestDefinition[] = [
  // THERMAL
  {
    id: "temp-cycling",
    name: "Temperature Cycling (TC)",
    category: "thermal",
    description: "Cycles temperature between extremes to accelerate CTE-driven fatigue and intermittency.",
    mechanismIds: ["thermal-fatigue", "seal-degradation"],
    stressorIds: ["deltaT", "temperature"],
    defaults: { coverage: "high", durationWeeks: 4, costLevel: 2, sampleSizeHint: "6-12 units typical; 0-fail target for gate." },
    acceleration: { model: "coffin-manson", parameterDefaults: { n: 1.9 }, validityRuleIds: ["warn-small-deltaT"] },
    references: [
      { standard: "IEC 60068-2-14", note: "Thermal cycling guidance (example reference)." },
      { standard: "ISO 16750-4", note: "Automotive environmental conditions (example reference)." },
    ],
  },
  {
    id: "power-cycling",
    name: "Power Cycling (PC)",
    category: "thermal",
    description: "Cycles self-heating via electrical power to induce thermo-mechanical fatigue in assemblies.",
    mechanismIds: ["thermal-fatigue", "electromigration"],
    stressorIds: ["deltaT", "electrical-load", "temperature"],
    defaults: { coverage: "high", durationWeeks: 6, costLevel: 3, sampleSizeHint: "6-10 units; ensure realistic loads." },
    acceleration: { model: "coffin-manson", parameterDefaults: { n: 1.9 }, validityRuleIds: ["info-power-cycling-dominant"] },
    references: [{ standard: "ISO 16750-4", note: "Temperature and electrical load cycling (example reference)." }],
  },
  {
    id: "high-temp-storage",
    name: "High Temperature Storage (HTS)",
    category: "thermal",
    description: "Soak at elevated temperature to accelerate thermal aging, diffusion, and material drift.",
    mechanismIds: ["thermal-aging", "creep-relaxation"],
    stressorIds: ["temperature"],
    defaults: { coverage: "high", durationWeeks: 6, costLevel: 2, sampleSizeHint: "6-12 units; inspect at interim points." },
    acceleration: { model: "arrhenius", parameterDefaults: { Ea: 0.7 }, validityRuleIds: ["warn-very-high-stress-temp"] },
    references: [{ standard: "IEC 60068-2-2", note: "Dry heat storage (example reference)." }],
  },
  {
    id: "low-temp-storage",
    name: "Low Temperature Storage (LTS)",
    category: "thermal",
    description: "Cold soak for brittleness, cracking risk, and seal stiffening sensitivity.",
    mechanismIds: ["seal-degradation"],
    stressorIds: ["temperature"],
    defaults: { coverage: "medium", durationWeeks: 2, costLevel: 1 },
    acceleration: { model: "none" },
    references: [{ standard: "IEC 60068-2-1", note: "Cold storage (example reference)." }],
  },

  // ENVIRONMENTAL / HUMIDITY
  {
    id: "damp-heat",
    name: "Damp Heat / High Humidity (THB-like)",
    category: "environmental",
    description: "High humidity + temperature to accelerate corrosion, leakage, and insulation degradation.",
    mechanismIds: ["humidity-corrosion", "seal-degradation"],
    stressorIds: ["humidity", "temperature"],
    defaults: { coverage: "high", durationWeeks: 4, costLevel: 2, sampleSizeHint: "Bias if applicable; monitor leakage/resistance." },
    acceleration: { model: "peck", parameterDefaults: { m: 2.7, Ea: 0.7 }, validityRuleIds: ["warn-huge-af"] },
    references: [
      { standard: "IEC 60068-2-78", note: "Damp heat guidance (example reference)." },
      { standard: "ISO 16750-4", note: "Humidity exposure (example reference)." },
    ],
  },
  {
    id: "temp-humidity-constant",
    name: "Temperature/Humidity Constant Exposure",
    category: "environmental",
    description: "Constant temperature and humidity exposure to validate moisture endurance and corrosion robustness.",
    mechanismIds: ["humidity-corrosion", "seal-degradation"],
    stressorIds: ["humidity", "temperature"],
    defaults: { coverage: "high", durationWeeks: 4, costLevel: 2, sampleSizeHint: "Steady-state exposure with periodic checks." },
    acceleration: { model: "peck", parameterDefaults: { m: 2.7, Ea: 0.7 }, validityRuleIds: ["warn-huge-af"] },
    references: [{ standard: "IEC 60068-2-78", note: "Damp heat, steady state (placeholder reference)." }],
  },
  {
    id: "temp-humidity-cycling",
    name: "Temperature/Humidity Cycling",
    category: "environmental",
    description: "Cyclic humidity and temperature to mimic diurnal and duty-cycle condensation effects.",
    mechanismIds: ["humidity-corrosion", "seal-degradation"],
    stressorIds: ["humidity", "temperature"],
    defaults: { coverage: "medium", durationWeeks: 4, costLevel: 2, sampleSizeHint: "Cycle humidity/temperature to induce condensation." },
    acceleration: { model: "peck", parameterDefaults: { m: 2.7, Ea: 0.7 }, validityRuleIds: ["warn-huge-af"] },
    references: [{ standard: "IEC 60068-2-30", note: "Damp heat, cyclic (placeholder reference)." }],
  },
  {
    id: "mfg",
    name: "Mixed Flowing Gas (MFG)",
    category: "environmental",
    description: "Corrosive gas exposure to evaluate contact corrosion and susceptibility to intermittency.",
    mechanismIds: ["humidity-corrosion", "fretting-corrosion"],
    stressorIds: ["humidity", "chemical", "temperature"],
    defaults: { coverage: "medium", durationWeeks: 3, costLevel: 3 },
    acceleration: { model: "eyring", parameterDefaults: { Ea: 0.7 } },
    references: [{ standard: "IEC 60068-2-60", note: "Mixed flowing gas testing (example reference)." }],
  },
  {
    id: "salt-spray",
    name: "Salt Spray / Salt Fog",
    category: "environmental",
    description: "Salt exposure to evaluate corrosion resistance and sealing robustness (especially coastal/road salt).",
    mechanismIds: ["humidity-corrosion", "seal-degradation", "chemical-attack"],
    stressorIds: ["chemical", "humidity"],
    defaults: { coverage: "medium", durationWeeks: 2, costLevel: 2 },
    acceleration: { model: "none" },
    references: [{ standard: "ISO 9227", note: "Salt spray testing (example reference)." }],
  },
  {
    id: "water-ingress",
    name: "Water Ingress / Splash / IP Check",
    category: "environmental",
    description: "Water exposure to verify sealing and housing integrity under realistic ingress conditions.",
    mechanismIds: ["seal-degradation"],
    stressorIds: ["humidity", "particles-dust"],
    defaults: { coverage: "high", durationWeeks: 1, costLevel: 2 },
    acceleration: { model: "none" },
    references: [{ standard: "IEC 60529", note: "IP ingress protection (example reference)." }],
  },
  {
    id: "chemical-resistance",
    name: "Chemical Resistance (Fluids / Cleaners)",
    category: "environmental",
    description: "Exposure to oils/fuels/coolants/cleaners to evaluate polymer swelling, cracking, and property loss.",
    mechanismIds: ["chemical-attack", "seal-degradation"],
    stressorIds: ["chemical", "temperature"],
    defaults: { coverage: "high", durationWeeks: 2, costLevel: 2, sampleSizeHint: "Include mass/durometer/dim checks pre/post." },
    acceleration: { model: "eyring", parameterDefaults: { Ea: 0.7 }, validityRuleIds: ["warn-chem-exposure-none"] },
    references: [{ standard: "ISO 16750-5", note: "Chemical resistance (example reference)." }],
  },

  // MECHANICAL
  {
    id: "random-vibration",
    name: "Random Vibration",
    category: "mechanical",
    description: "Random vibration to reveal fatigue weaknesses, intermittency, and connector fretting risks.",
    mechanismIds: ["vibration-fatigue", "fretting-corrosion"],
    stressorIds: ["vibration"],
    defaults: { coverage: "high", durationWeeks: 2, costLevel: 2, sampleSizeHint: "Monitor intermittency during vibe if possible." },
    acceleration: { model: "none" },
    references: [{ standard: "ISO 16750-3", note: "Mechanical loads (example reference)." }],
  },
  {
    id: "mechanical-shock",
    name: "Mechanical Shock / Drop / Impact",
    category: "mechanical",
    description: "Shock pulses to evaluate robustness to handling and impact events.",
    mechanismIds: ["vibration-fatigue"],
    stressorIds: ["shock"],
    defaults: { coverage: "medium", durationWeeks: 1, costLevel: 1 },
    acceleration: { model: "none" },
    references: [{ standard: "ISO 16750-3", note: "Mechanical shock (example reference)." }],
  },
  {
    id: "mating-cycles",
    name: "Mating / Unmating Cycles (Durability)",
    category: "mechanical",
    description: "Engagement cycles to assess wear, latch integrity, and retention drift over usage.",
    mechanismIds: ["fretting-corrosion", "seal-degradation"],
    stressorIds: ["contact-motion", "particles-dust"],
    defaults: { coverage: "medium", durationWeeks: 2, costLevel: 1 },
    acceleration: { model: "none" },
    references: [{ standard: "USCAR-2", note: "Connector durability cycles (example)." }],
  },
  {
    id: "retention-force",
    name: "Retention / Pull-out / Clamping Force",
    category: "mechanical",
    description: "Measures mechanical integrity and retention force margins pre/post environmental exposures.",
    mechanismIds: ["creep-relaxation", "seal-degradation"],
    stressorIds: ["temperature"],
    defaults: { coverage: "medium", durationWeeks: 1, costLevel: 1 },
    acceleration: { model: "none" },
    references: [{ standard: "USCAR-2", note: "Connector retention tests (example)." }],
  },

  // ELECTRICAL
  {
    id: "eos-transient",
    name: "EOS / Transient Robustness Check (Surge / Load dump-like)",
    category: "electrical",
    description: "Applies electrical transients to verify protection and robustness against overstress.",
    mechanismIds: ["eos-overstress"],
    stressorIds: ["electrical-load"],
    defaults: { coverage: "high", durationWeeks: 2, costLevel: 3, sampleSizeHint: "Use representative harness, grounding, and load conditions." },
    acceleration: { model: "none" },
    references: [{ standard: "ISO 16750-2", note: "Electrical loads (example reference)." }],
  },
  {
    id: "esd-immunity",
    name: "ESD Immunity (System-level)",
    category: "electrical",
    description: "System-level ESD tests to validate immunity and prevent latent damage.",
    mechanismIds: ["eos-overstress"],
    stressorIds: ["electrical-load"],
    defaults: { coverage: "medium", durationWeeks: 1, costLevel: 2 },
    acceleration: { model: "none" },
    references: [{ standard: "ISO 10605", note: "ESD testing (example reference)." }],
  },

  // SCREENING / PROCESS
  {
    id: "burn-in-screen",
    name: "Burn-in / Screening (Early-life)",
    category: "screening",
    description: "Screening to remove early-life defects; not a substitute for robustness validation.",
    mechanismIds: ["eos-overstress", "thermal-aging"],
    stressorIds: ["temperature", "electrical-load"],
    defaults: { coverage: "screening", durationWeeks: 2, costLevel: 2, sampleSizeHint: "Define based on defect escape risk and process maturity." },
    acceleration: { model: "arrhenius", parameterDefaults: { Ea: 0.7 }, validityRuleIds: ["warn-huge-af"] },
    references: [{ standard: "JESD22-A108", note: "Burn-in / life test guidance (example)." }],
  },
];

//
// 8) Utility indexes (fast lookup)
//
export const KB_INDEX = {
  productTypeById: Object.fromEntries(PRODUCT_TYPES.map((p) => [p.id, p] as const)),
  presetById: Object.fromEntries(MISSION_PRESETS.map((p) => [p.id, p] as const)),
  stressorById: Object.fromEntries(STRESSORS.map((s) => [s.id, s] as const)),
  mechanismById: Object.fromEntries(MECHANISMS.map((m) => [m.id, m] as const)),
  materialById: Object.fromEntries(MATERIAL_LIBRARY.map((m) => [m.id, m] as const)),
  failureModeById: Object.fromEntries(FAILURE_MODE_LIBRARY.map((f) => [f.id, f] as const)),
  testById: Object.fromEntries(TESTS.map((t) => [t.id, t] as const)),
  accelModelById: Object.fromEntries(ACCEL_MODELS.map((a) => [a.id, a] as const)),
  validityRuleById: Object.fromEntries(VALIDITY_RULES.map((r) => [r.id, r] as const)),
};



