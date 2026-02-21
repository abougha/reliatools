export const MISSION_PROFILE_VERSION = 1;
export const MISSION_PROFILE_SCHEMA_VERSION = "1.1" as const;
export const DEFAULT_HOURS_PER_YEAR = 8760;

export const LIKELIHOODS = ["not_likely", "possible", "likely"] as const;
export type Likelihood = (typeof LIKELIHOODS)[number];

export type PhaseDefinition = {
  key: string;
  label: string;
};

export type StressParamField = {
  key: string;
  label: string;
  unit: string;
  step?: number;
};

export type StressDefinition = {
  key: string;
  label: string;
  fields: readonly StressParamField[];
};

export type TargetLife = {
  mode: "Years" | "Hours";
  years?: number;
  hours?: number;
  hoursPerYear?: number;
};

export type ExposureMode = "Once" | "Hours" | "PercentLife";

export type Exposure = {
  mode: ExposureMode;
  events: number | "";
  hours: number | "";
  percentLife: number | "";
};

export const PHASES = [
  { key: "design_storage", label: "Storage" },
  { key: "transport", label: "Transport" },
  { key: "assembly", label: "Assembly" },
  { key: "operation", label: "Operation" },
  { key: "maintenance", label: "Maintenance" },
  { key: "abuse", label: "Abuse/Misuse" },
] as const;

export const STRESSES = [
  {
    key: "temperature_extremes",
    label: "Temperature extremes",
    fields: [
      { key: "minC", label: "Min temperature", unit: "degC", step: 1 },
      { key: "maxC", label: "Max temperature", unit: "degC", step: 1 },
      { key: "dwellMin", label: "Dwell", unit: "min", step: 1 },
    ],
  },
  {
    key: "thermal_cycles",
    label: "Delta-T cycles",
    fields: [
      { key: "deltaC", label: "Delta-T", unit: "degC", step: 1 },
      { key: "cyclesPerDay", label: "Cycle rate", unit: "cycles/day", step: 0.1 },
      { key: "rampRateCMin", label: "Ramp rate", unit: "degC/min", step: 0.1 },
    ],
  },
  {
    key: "humidity",
    label: "Humidity",
    fields: [
      { key: "rhPct", label: "Relative humidity", unit: "%RH", step: 1 },
      { key: "condensingHoursWeek", label: "Condensing exposure", unit: "h/week", step: 0.1 },
    ],
  },
  {
    key: "vibration",
    label: "Vibration",
    fields: [
      { key: "grms", label: "Vibration level", unit: "gRMS", step: 0.1 },
      { key: "freqMinHz", label: "Frequency min", unit: "Hz", step: 1 },
      { key: "freqMaxHz", label: "Frequency max", unit: "Hz", step: 1 },
    ],
  },
  {
    key: "mechanical_shock",
    label: "Mechanical shock",
    fields: [
      { key: "gPeak", label: "Peak acceleration", unit: "g", step: 1 },
      { key: "pulseMs", label: "Pulse duration", unit: "ms", step: 0.1 },
      { key: "eventsPerMonth", label: "Occurrence rate", unit: "events/month", step: 1 },
    ],
  },
  {
    key: "esd",
    label: "ESD",
    fields: [
      { key: "contactKv", label: "Contact discharge", unit: "kV", step: 0.1 },
      { key: "airKv", label: "Air discharge", unit: "kV", step: 0.1 },
    ],
  },
  {
    key: "salt_fog",
    label: "Salt exposure",
    fields: [
      { key: "naclPct", label: "Salt concentration", unit: "%NaCl", step: 0.1 },
      { key: "hoursPerWeek", label: "Exposure", unit: "h/week", step: 0.1 },
    ],
  },
  {
    key: "chemical_exposure",
    label: "Chemical exposure",
    fields: [
      { key: "severityIndex", label: "Severity index", unit: "0-10", step: 0.1 },
      { key: "hoursPerWeek", label: "Exposure", unit: "h/week", step: 0.1 },
    ],
  },
  {
    key: "dust_ingress",
    label: "Dust/particulate",
    fields: [
      { key: "pmMgM3", label: "Particulate concentration", unit: "mg/m3", step: 1 },
      { key: "hoursPerWeek", label: "Exposure", unit: "h/week", step: 0.1 },
    ],
  },
] as const;

export type StressKey = (typeof STRESSES)[number]["key"];
export type PhaseKey = (typeof PHASES)[number]["key"];

export type Cell = {
  likelihood: Likelihood;
  params: Record<string, number | "">;
  exposure: Exposure;
};

export type MissionCell = Cell;
export type MissionMatrix = Record<StressKey, Record<PhaseKey, Cell>>;

export type MissionTemplatePreset = {
  id: string;
  industry: string;
  product: string;
  location: string;
  description?: string;
  likelihoods?: Partial<Record<StressKey, Partial<Record<PhaseKey, Likelihood>>>>;
  defaults?: Partial<Record<StressKey, Partial<Record<string, number>>>>;
};

export type MissionProfileSchema = {
  missionProfileSchemaVersion: typeof MISSION_PROFILE_SCHEMA_VERSION;
  version: number;
  industry: string;
  product: string;
  location: string;
  targetLife: TargetLife;
  phases: readonly PhaseDefinition[];
  stresses: readonly StressDefinition[];
  matrix: MissionMatrix;
  notes?: string;
};

export type StressLifetimeSummary = {
  stressKey: StressKey;
  stressLabel: string;
  totalExposureHours: number;
  totalEvents: number;
  dominantPhaseKey: PhaseKey | null;
  dominantPhaseLabel: string | null;
};

function toStressMap() {
  return STRESSES.reduce<Record<string, (typeof STRESSES)[number]>>((acc, stress) => {
    acc[stress.key] = stress;
    return acc;
  }, {});
}

const STRESS_MAP = toStressMap();

function buildEmptyParams(stressKey: StressKey) {
  const stress = STRESS_MAP[stressKey];
  return stress.fields.reduce<Record<string, number | "">>((acc, field) => {
    acc[field.key] = "";
    return acc;
  }, {});
}

function buildDefaultExposure(): Exposure {
  return {
    mode: "PercentLife",
    percentLife: "",
    hours: "",
    events: 1,
  };
}

function normalizeLikelihood(value: unknown): Likelihood {
  if (value === "likely" || value === "possible" || value === "not_likely") {
    return value;
  }
  return "not_likely";
}

function normalizeNumberOrBlank(value: unknown): number | "" {
  return typeof value === "number" && Number.isFinite(value) ? value : "";
}

function normalizePositiveNumberOrBlank(value: unknown): number | "" {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : "";
}

function normalizeParams(stressKey: StressKey, params: unknown) {
  const safe = buildEmptyParams(stressKey);
  if (!params || typeof params !== "object") return safe;
  const paramRecord = params as Record<string, unknown>;
  for (const field of STRESS_MAP[stressKey].fields) {
    const raw = paramRecord[field.key];
    safe[field.key] = normalizeNumberOrBlank(raw);
  }
  return safe;
}

function normalizeExposure(exposure: unknown): Exposure {
  const safe = buildDefaultExposure();
  if (!exposure || typeof exposure !== "object") return safe;
  const record = exposure as Record<string, unknown>;
  const modeRaw = record.mode;
  const mode: ExposureMode =
    modeRaw === "Once" || modeRaw === "Hours" || modeRaw === "PercentLife" ? modeRaw : "PercentLife";
  return {
    mode,
    events: normalizePositiveNumberOrBlank(record.events),
    hours: normalizePositiveNumberOrBlank(record.hours),
    percentLife: normalizePositiveNumberOrBlank(record.percentLife),
  };
}

function normalizeTargetLife(targetLife: unknown): TargetLife {
  if (!targetLife || typeof targetLife !== "object") {
    return { mode: "Years", years: 10, hoursPerYear: DEFAULT_HOURS_PER_YEAR };
  }
  const record = targetLife as Record<string, unknown>;
  const mode = record.mode === "Hours" ? "Hours" : "Years";
  const hoursPerYearRaw = record.hoursPerYear;
  const hoursPerYear =
    typeof hoursPerYearRaw === "number" && Number.isFinite(hoursPerYearRaw) && hoursPerYearRaw > 0
      ? hoursPerYearRaw
      : DEFAULT_HOURS_PER_YEAR;
  const years =
    typeof record.years === "number" && Number.isFinite(record.years) && record.years > 0 ? record.years : undefined;
  const hours =
    typeof record.hours === "number" && Number.isFinite(record.hours) && record.hours > 0 ? record.hours : undefined;
  if (mode === "Hours") {
    return { mode, hours, hoursPerYear };
  }
  return { mode, years, hoursPerYear };
}

function cloneMatrix(matrix: MissionMatrix): MissionMatrix {
  const next = buildEmptyMatrix();
  for (const stress of STRESSES) {
    for (const phase of PHASES) {
      const cell = matrix[stress.key][phase.key];
      next[stress.key][phase.key] = {
        likelihood: cell.likelihood,
        params: { ...cell.params },
        exposure: { ...cell.exposure },
      };
    }
  }
  return next;
}

export function buildEmptyMatrix(): MissionMatrix {
  const matrix = {} as MissionMatrix;
  for (const stress of STRESSES) {
    matrix[stress.key] = {} as Record<PhaseKey, Cell>;
    for (const phase of PHASES) {
      matrix[stress.key][phase.key] = {
        likelihood: "not_likely",
        params: buildEmptyParams(stress.key),
        exposure: buildDefaultExposure(),
      };
    }
  }
  return matrix;
}

export function createDefaultTargetLife(): TargetLife {
  return { mode: "Years", years: 10, hoursPerYear: DEFAULT_HOURS_PER_YEAR };
}

export function applyTemplate(
  template: MissionTemplatePreset,
  baseMatrix: MissionMatrix = buildEmptyMatrix()
): MissionMatrix {
  const next = cloneMatrix(baseMatrix);
  for (const stress of STRESSES) {
    for (const phase of PHASES) {
      const likelihood = template.likelihoods?.[stress.key]?.[phase.key];
      if (likelihood) {
        next[stress.key][phase.key].likelihood = likelihood;
      }
      if (next[stress.key][phase.key].likelihood !== "not_likely") {
        const defaults = template.defaults?.[stress.key];
        if (defaults) {
          for (const field of stress.fields) {
            const raw = defaults[field.key];
            if (typeof raw === "number" && Number.isFinite(raw)) {
              next[stress.key][phase.key].params[field.key] = raw;
            }
          }
        }
      }
    }
  }
  return next;
}

export function computeLifeHours(targetLife: TargetLife): number | null {
  const hoursPerYear =
    typeof targetLife.hoursPerYear === "number" && Number.isFinite(targetLife.hoursPerYear) && targetLife.hoursPerYear > 0
      ? targetLife.hoursPerYear
      : DEFAULT_HOURS_PER_YEAR;
  if (targetLife.mode === "Hours") {
    if (typeof targetLife.hours !== "number" || !Number.isFinite(targetLife.hours) || targetLife.hours <= 0) return null;
    return targetLife.hours;
  }
  if (typeof targetLife.years !== "number" || !Number.isFinite(targetLife.years) || targetLife.years <= 0) return null;
  return targetLife.years * hoursPerYear;
}

export function computeCellExposureHours(cell: Cell, lifeHours: number | null): number | null {
  if (cell.exposure.mode === "Once") return null;
  if (cell.exposure.mode === "Hours") {
    return typeof cell.exposure.hours === "number" && Number.isFinite(cell.exposure.hours) && cell.exposure.hours >= 0
      ? cell.exposure.hours
      : null;
  }
  if (
    lifeHours === null ||
    typeof cell.exposure.percentLife !== "number" ||
    !Number.isFinite(cell.exposure.percentLife) ||
    cell.exposure.percentLife < 0
  ) {
    return null;
  }
  return lifeHours * (cell.exposure.percentLife / 100);
}

export function summarizeLifetimeByStress(
  matrix: MissionMatrix,
  lifeHours: number | null = null
): StressLifetimeSummary[] {
  return STRESSES.map((stress) => {
    let totalExposureHours = 0;
    let totalEvents = 0;
    const phaseHours: Record<PhaseKey, number> = {} as Record<PhaseKey, number>;
    const phaseEvents: Record<PhaseKey, number> = {} as Record<PhaseKey, number>;

    for (const phase of PHASES) {
      const cell = matrix[stress.key][phase.key];
      const exposureHours = computeCellExposureHours(cell, lifeHours);
      if (typeof exposureHours === "number" && Number.isFinite(exposureHours)) {
        totalExposureHours += exposureHours;
        phaseHours[phase.key] = (phaseHours[phase.key] ?? 0) + exposureHours;
      }
      if (cell.exposure.mode === "Once") {
        const events =
          typeof cell.exposure.events === "number" && Number.isFinite(cell.exposure.events) && cell.exposure.events >= 0
            ? cell.exposure.events
            : 0;
        totalEvents += events;
        phaseEvents[phase.key] = (phaseEvents[phase.key] ?? 0) + events;
      }
    }

    let dominantPhaseKey: PhaseKey | null = null;
    if (totalExposureHours > 0) {
      let bestHours = -1;
      for (const phase of PHASES) {
        const h = phaseHours[phase.key] ?? 0;
        if (h > bestHours) {
          bestHours = h;
          dominantPhaseKey = phase.key;
        }
      }
    } else if (totalEvents > 0) {
      let bestEvents = -1;
      for (const phase of PHASES) {
        const e = phaseEvents[phase.key] ?? 0;
        if (e > bestEvents) {
          bestEvents = e;
          dominantPhaseKey = phase.key;
        }
      }
    }

    return {
      stressKey: stress.key,
      stressLabel: stress.label,
      totalExposureHours,
      totalEvents,
      dominantPhaseKey,
      dominantPhaseLabel: dominantPhaseKey ? PHASES.find((phase) => phase.key === dominantPhaseKey)?.label ?? null : null,
    };
  });
}

export function serializeMissionProfile(profile: MissionProfileSchema): string {
  return JSON.stringify(profile, null, 2);
}

export function parseMissionProfile(payload: string): MissionProfileSchema | null {
  try {
    const parsed = JSON.parse(payload) as Partial<MissionProfileSchema> & { matrix?: unknown; targetLife?: unknown };
    if (!parsed || typeof parsed !== "object" || !parsed.matrix || typeof parsed.matrix !== "object") {
      return null;
    }
    const rawMatrix = parsed.matrix as Record<
      string,
      Record<string, { likelihood?: unknown; params?: unknown; exposure?: unknown }>
    >;
    const matrix = buildEmptyMatrix();
    for (const stress of STRESSES) {
      for (const phase of PHASES) {
        const cell = rawMatrix?.[stress.key]?.[phase.key];
        matrix[stress.key][phase.key] = {
          likelihood: normalizeLikelihood(cell?.likelihood),
          params: normalizeParams(stress.key, cell?.params),
          exposure: normalizeExposure(cell?.exposure),
        };
      }
    }

    return {
      missionProfileSchemaVersion: MISSION_PROFILE_SCHEMA_VERSION,
      version:
        typeof parsed.version === "number" && Number.isFinite(parsed.version)
          ? parsed.version
          : MISSION_PROFILE_VERSION,
      industry: typeof parsed.industry === "string" ? parsed.industry : "Automotive",
      product: typeof parsed.product === "string" ? parsed.product : "Generic Product",
      location: typeof parsed.location === "string" ? parsed.location : "Unknown",
      targetLife: normalizeTargetLife(parsed.targetLife),
      phases: PHASES,
      stresses: STRESSES,
      matrix,
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
    };
  } catch {
    return null;
  }
}
