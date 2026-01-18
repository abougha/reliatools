// lib/derating/factories.ts
//
// Creates initial DeratingNavigatorState + helpers to add/clone components.
// IMPORTANT: No external deps (no uuid). Uses crypto.randomUUID() when available.

import type {
  ApplicationCategory,
  QualityClass,
  PressureUnit,
  TempUnit,
  MechanicalUnitSystem,
  ComponentType,
  ComponentRecord,
  ComponentInputs,
  DeratingNavigatorState,
  Targets,
  GlobalSettings,
  ProjectMeta,
  Rule,
} from "./models";

// ---- Defaults (single source of truth for init) ----
export const DEFAULTS = {
  // Meta
  projectName: "",
  productName: "",
  owner: "",
  dateISO: "",

  // Settings
  applicationCategory: "Commercial" as ApplicationCategory,
  qualityClass: "Not specified" as QualityClass,
  tempUnit: "C" as TempUnit,
  mechanicalUnits: "Metric" as MechanicalUnitSystem,
  defaultPressureUnit: "kPa" as PressureUnit,
  requireExactRuleMatch: false,

  // Targets
  minDeratedDM: 0.2,
  minDeratedFOS: 1 / (1 - 0.2), // 1.25
  minTempMarginC: 10,
  decoupleDMFOS: false,

  // Component defaults
  defaultAppliedTempC: 25,
} as const;

// ---- ID generation ----
function makeId(prefix = "cmp"): string {
  const g = globalThis as any;
  if (g.crypto?.randomUUID) return `${prefix}_${g.crypto.randomUUID()}`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require("crypto") as typeof import("crypto");
    if (typeof crypto.randomUUID === "function") return `${prefix}_${crypto.randomUUID()}`;
    const buf = crypto.randomBytes(16).toString("hex");
    return `${prefix}_${buf}`;
  } catch {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function refDesPrefixForType(t: ComponentType): string {
  switch (t) {
    case "Resistor":
    case "Resistor Variable":
    case "Fixed, film, chip (PD < 1 W)":
      return "R";
    case "Capacitor":
      return "C";
    case "Transistor":
    case "Silicon: Digital MOS":
      return "Q";
    case "Diode Signal":
      return "D";
    case "Transformer":
      return "T";
    case "Relays":
      return "K";
    case "Switches":
      return "SW";
    case "Bearings":
      return "BRG";
    case "Springs":
      return "SPR";
    case "Seals":
      return "SEAL";
    default:
      return "X";
  }
}

// ---- ComponentType -> default inputs ----
export function defaultInputsForComponentType(
  componentType: ComponentType,
  ctx?: { defaultPressureUnit?: PressureUnit }
): ComponentInputs {
  const defaultPressureUnit = ctx?.defaultPressureUnit ?? DEFAULTS.defaultPressureUnit;

  switch (componentType) {
    case "Silicon: Digital MOS":
      return {
        kind: "SiliconMos",
        tjAppliedC: DEFAULTS.defaultAppliedTempC,
        // tjMaxC optional
        // thermal optional
      };

    case "Resistor":
    case "Resistor Variable":
    case "Fixed, film, chip (PD < 1 W)":
    case "Transistor":
      return {
        kind: "Power",
        power: { rated: 1, applied: 0 },
      };

    case "Diode Signal":
    case "Capacitor":
      return {
        kind: "Voltage",
        voltage: { rated: 1, applied: 0 },
      };

    case "Relays":
    case "Switches":
      return {
        kind: "Current",
        current: { rated: 1, applied: 0 },
      };

    case "Transformer":
      return {
        kind: "Transformer",
        va: { rated: 10, applied: 0 },
        thermal: {
          ambientC: DEFAULTS.defaultAppliedTempC,
          ratedTempAtFullLoadC: 40,
        },
      };

    case "Bearings":
      return {
        kind: "Bearings",
        radialLoad: { rated: 100, applied: 0 },
        speedRpm: { rated: 1000, applied: 0 },
        lubrication: "Unknown",
      };

    case "Springs":
      return {
        kind: "Springs",
        force: { rated: 100, applied: 0 },
      };

    case "Seals":
      return {
        kind: "Seals",
        pressurePa: { rated: 100_000, applied: 0 }, // 100 kPa
        temperature: { ratedTempC: 85, appliedTempC: DEFAULTS.defaultAppliedTempC },
        pressureUnit: defaultPressureUnit,
      };

    default:
      return { kind: "Unknown" };
  }
}

// ---- Create a new ComponentRecord ----
export function createComponentRecord(
  partial?: {
    componentType?: ComponentType;
    refDes?: string;
    notes?: string;
  },
  ctx?: { defaultPressureUnit?: PressureUnit }
): ComponentRecord {
  const componentType = partial?.componentType ?? "Resistor";
  const id = makeId("cmp");

  const prefix = refDesPrefixForType(componentType);
  const suffix = id.slice(-4).toUpperCase();
  const refDes = partial?.refDes ?? `${prefix}${suffix}`;

  return {
    id,
    refDes,
    componentType,
    notes: partial?.notes,
    rule: {
      matchedRuleId: undefined,
      effectiveRuleId: undefined,
      effectiveRule: null,
    },
    inputs: defaultInputsForComponentType(componentType, ctx),
    results: null,
  };
}

// ---- State creation ----
export function createDefaultMeta(meta?: Partial<ProjectMeta>): ProjectMeta {
  return {
    projectName: meta?.projectName ?? DEFAULTS.projectName,
    productName: meta?.productName ?? DEFAULTS.productName,
    owner: meta?.owner ?? DEFAULTS.owner,
    dateISO: meta?.dateISO ?? DEFAULTS.dateISO,
  };
}

export function createDefaultSettings(settings?: Partial<GlobalSettings>): GlobalSettings {
  return {
    applicationCategory: settings?.applicationCategory ?? DEFAULTS.applicationCategory,
    qualityClass: settings?.qualityClass ?? DEFAULTS.qualityClass,
    tempUnit: settings?.tempUnit ?? DEFAULTS.tempUnit,
    mechanicalUnits: settings?.mechanicalUnits ?? DEFAULTS.mechanicalUnits,
    defaultPressureUnit: settings?.defaultPressureUnit ?? DEFAULTS.defaultPressureUnit,
    requireExactRuleMatch: settings?.requireExactRuleMatch ?? DEFAULTS.requireExactRuleMatch,
  };
}

export function createDefaultTargets(targets?: Partial<Targets>): Targets {
  const minDeratedDM = targets?.minDeratedDM ?? DEFAULTS.minDeratedDM;
  const decoupleDMFOS = targets?.decoupleDMFOS ?? DEFAULTS.decoupleDMFOS;

  const linkedFos = 1 / (1 - minDeratedDM);
  const minDeratedFOS = decoupleDMFOS
    ? targets?.minDeratedFOS ?? DEFAULTS.minDeratedFOS
    : linkedFos;

  return {
    minDeratedDM,
    minDeratedFOS,
    minTempMarginC: targets?.minTempMarginC ?? DEFAULTS.minTempMarginC,
    decoupleDMFOS,
  };
}

export function createInitialState(args?: {
  meta?: Partial<ProjectMeta>;
  settings?: Partial<GlobalSettings>;
  targets?: Partial<Targets>;
  rules?: Rule[];
  components?: ComponentRecord[];
}): DeratingNavigatorState {
  const settings = createDefaultSettings(args?.settings);

  const components =
    args?.components ??
    [
      // Start with one component so the UI isn't empty
      createComponentRecord({ componentType: "Resistor" }, { defaultPressureUnit: settings.defaultPressureUnit }),
    ];

  return {
    meta: createDefaultMeta(args?.meta),
    settings,
    targets: createDefaultTargets(args?.targets),
    rules: args?.rules ?? [],
    components,
    overall: { status: "Attention" },
  };
}

// ---- Convenience mutators (immutable-friendly) ----
export function addComponent(
  state: DeratingNavigatorState,
  componentType: ComponentType,
  opts?: { refDes?: string; notes?: string }
): DeratingNavigatorState {
  const newRec = createComponentRecord(
    { componentType, refDes: opts?.refDes, notes: opts?.notes },
    { defaultPressureUnit: state.settings.defaultPressureUnit }
  );

  return {
    ...state,
    components: [...state.components, newRec],
  };
}

export function removeComponent(state: DeratingNavigatorState, componentId: string): DeratingNavigatorState {
  return {
    ...state,
    components: state.components.filter((c) => c.id !== componentId),
  };
}

export function cloneComponent(state: DeratingNavigatorState, componentId: string): DeratingNavigatorState {
  const src = state.components.find((c) => c.id === componentId);
  if (!src) return state;

  const cloned: ComponentRecord = {
    ...src,
    id: makeId("cmp"),
    refDes: `${src.refDes}_COPY`,
    results: null,
  };

  return {
    ...state,
    components: [...state.components, cloned],
  };
}

export function updateComponent(
  state: DeratingNavigatorState,
  componentId: string,
  patch: Partial<Omit<ComponentRecord, "id">>
): DeratingNavigatorState {
  return {
    ...state,
    components: state.components.map((c) => (c.id === componentId ? { ...c, ...patch } : c)),
  };
}
