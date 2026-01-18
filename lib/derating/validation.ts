// lib/derating/validation.ts
import { z } from "zod";
import type { DeratingNavigatorState } from "./models";

// ---------- const tuples for z.enum ----------
export const PRESSURE_UNITS = ["Pa", "kPa", "bar", "psi"] as const;
export const APPLICATION_CATEGORIES = [
  "Commercial",
  "Defence/Industry",
  "Military/Aerospace",
  "Space",
  "Mechanical",
] as const;

export const QUALITY_CLASSES = [
  "Class 1 (Verified Pedigree)",
  "Class 1 (Standard)",
  "Class 2",
  "Not specified",
] as const;

export const COMPONENT_TYPES = [
  "Silicon: Digital MOS",
  "Resistor",
  "Resistor Variable",
  "Fixed, film, chip (PD < 1 W)",
  "Transistor",
  "Diode Signal",
  "Capacitor",
  "Transformer",
  "Relays",
  "Switches",
  "Bearings",
  "Springs",
  "Seals",
] as const;

export const DERATED_PARAMETERS = [
  "TJ",
  "Power",
  "Power (D)",
  "Voltage",
  "Power (VA Load)",
  "Contact Current",
  "Speed, Load, Lubrication",
  "Material properties, Size",
  "Material characteristics, Size",
  "Unknown",
] as const;

export const RULE_SOURCES = ["Table.xlsx", "Manual", "ConservativeFallback"] as const;
export const STATUSES = ["Pass", "Attention", "Fail"] as const;

// ---------- helpers ----------
const finiteNumber = (name: string) =>
  z.number({ required_error: `${name} is required` }).finite(`${name} must be a finite number`);

const nonNeg = (name: string) => finiteNumber(name).min(0, `${name} must be ≥ 0`);
const pos = (name: string) => finiteNumber(name).gt(0, `${name} must be > 0`);

const tempCPhysicalSchema = finiteNumber("Temperature (°C)").refine(
  (t) => t >= -273.15,
  "Temperature cannot be below absolute zero (−273.15°C)"
);

const ratedAppliedSchema = z.object({
  rated: pos("Rated"),
  applied: nonNeg("Applied"),
});

// ---------- enums ----------
export const pressureUnitSchema = z.enum(PRESSURE_UNITS);
export const applicationCategorySchema = z.enum(APPLICATION_CATEGORIES);
export const qualityClassSchema = z.enum(QUALITY_CLASSES);
export const componentTypeSchema = z.enum(COMPONENT_TYPES);
export const deratedParameterSchema = z.enum(DERATED_PARAMETERS);
export const ruleSourceSchema = z.enum(RULE_SOURCES);
export const statusSchema = z.enum(STATUSES);

// ---------- Rule + EffectiveRule ----------
export const ruleSchema = z.object({
  id: z.string().min(1),
  componentType: componentTypeSchema,
  parameterDerated: deratedParameterSchema,
  applicationCategory: applicationCategorySchema,
  qualityClass: qualityClassSchema,
  deratingFactor: z.number().min(0).max(1).nullable(),
  maxOperatingLimitExpr: z.string().nullable(),
  typicalFailureMode: z.string().nullable().optional(),
  source: ruleSourceSchema,
});

export const effectiveRuleSchema = ruleSchema.extend({
  isOverridden: z.boolean(),
  conservativeFromRuleIds: z.array(z.string()).optional(),
});

// ---------- Inputs (plain objects only; NO superRefine here) ----------
const siliconMosThermalSchema = z
  .object({
    powerDissW: pos("Power dissipation (W)"),
    ambientPath: z
      .object({
        ambientC: tempCPhysicalSchema,
        rThetaJA_CPerW: pos("RθJA (°C/W)"),
      })
      .optional(),
    casePath: z
      .object({
        caseC: tempCPhysicalSchema,
        rThetaJC_CPerW: pos("RθJC (°C/W)"),
      })
      .optional(),
    selectedPath: z.enum(["ambient", "case"] as const),
  })
  .superRefine((t, ctx) => {
    if (t.selectedPath === "ambient" && !t.ambientPath) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ambientPath"],
        message: "ambientPath is required when selectedPath is 'ambient'.",
      });
    }
    if (t.selectedPath === "case" && !t.casePath) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["casePath"],
        message: "casePath is required when selectedPath is 'case'.",
      });
    }
  });

const siliconMosInputsSchema = z.object({
  kind: z.literal("SiliconMos"),
  tjMaxC: tempCPhysicalSchema.optional(),
  tjAppliedC: tempCPhysicalSchema,
  thermal: siliconMosThermalSchema.optional(),
});

const junctionThermalSchema = z
  .object({
    ambientC: tempCPhysicalSchema.optional(),
    powerDissW: pos("Power dissipation (W)"),
    rThetaJA_CPerW: pos("RθJA (°C/W)").optional(),
    caseC: tempCPhysicalSchema.optional(),
    rThetaJC_CPerW: pos("RθJC (°C/W)").optional(),
    selectedPath: z.enum(["ambient", "case"] as const),
  })
  .superRefine((jt, ctx) => {
    if (jt.selectedPath === "ambient" && jt.rThetaJA_CPerW === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rThetaJA_CPerW"],
        message: "rThetaJA_CPerW is required when selectedPath is 'ambient'.",
      });
    }
    if (jt.selectedPath === "case") {
      if (jt.caseC === undefined || jt.rThetaJC_CPerW === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [],
          message: "caseC and rThetaJC_CPerW are required when selectedPath is 'case'.",
        });
      }
    }
  });

const powerInputsSchema = z.object({
  kind: z.literal("Power"),
  power: ratedAppliedSchema,
  thermal: z
    .object({
      ambientC: tempCPhysicalSchema.optional(),
      rThetaCPerW: pos("Rθ (°C/W)").optional(),
    })
    .optional(),
  endpoints: z
    .object({
      tMaxZeroPowerC: tempCPhysicalSchema.optional(),
      tSFullPowerC: tempCPhysicalSchema.optional(),
    })
    .optional(),
  junctionThermal: junctionThermalSchema.optional(),
});

const voltageInputsSchema = z.object({
  kind: z.literal("Voltage"),
  voltage: ratedAppliedSchema,
  capacitorTemp: z
    .object({
      ratedTempC: tempCPhysicalSchema.optional(),
      operatingTempC: tempCPhysicalSchema.optional(),
    })
    .optional(),
});

const currentInputsSchema = z.object({
  kind: z.literal("Current"),
  current: ratedAppliedSchema,
});

const transformerInputsSchema = z.object({
  kind: z.literal("Transformer"),
  va: ratedAppliedSchema,
  thermal: z
    .object({
      ambientC: tempCPhysicalSchema.optional(),
      ratedTempAtFullLoadC: pos("Rated temperature at full load (°C)"),
      hotSpotLimitC: tempCPhysicalSchema.optional(),
    })
    .optional(),
});

const bearingsInputsSchema = z.object({
  kind: z.literal("Bearings"),
  radialLoad: ratedAppliedSchema,
  speedRpm: ratedAppliedSchema,
  lubrication: z.enum(["Adequate", "Marginal", "Unknown"] as const),
});

const springsInputsSchema = z.object({
  kind: z.literal("Springs"),
  force: ratedAppliedSchema,
  deflectionMm: ratedAppliedSchema.optional(),
  cyclesToLifeTarget: pos("Cycles to life target").optional(),
});

const sealsInputsSchema = z.object({
  kind: z.literal("Seals"),
  pressurePa: ratedAppliedSchema,
  temperature: z.object({
    ratedTempC: tempCPhysicalSchema,
    appliedTempC: tempCPhysicalSchema,
  }),
  pressureUnit: pressureUnitSchema,
});

const unknownInputsSchema = z.object({
  kind: z.literal("Unknown"),
});

export const componentInputsSchema = z.discriminatedUnion("kind", [
  siliconMosInputsSchema,
  powerInputsSchema,
  voltageInputsSchema,
  currentInputsSchema,
  transformerInputsSchema,
  bearingsInputsSchema,
  springsInputsSchema,
  sealsInputsSchema,
  unknownInputsSchema,
]);

// ---------- ComponentResults (computed; keep permissive) ----------
export const componentResultsSchema = z.any().nullable();

// ---------- ComponentRecord ----------
export const componentRecordSchema = z
  .object({
    id: z.string().min(1),
    refDes: z.string().min(1, "Reference Designator is required"),
    componentType: componentTypeSchema,
    notes: z.string().optional(),

    rule: z
      .object({
        matchedRuleId: z.string().optional(),
        effectiveRuleId: z.string().optional(),
        effectiveRule: effectiveRuleSchema.nullable(),
      })
      .default({ effectiveRule: null }),

    inputs: componentInputsSchema,

    // input may omit; output always includes (aligns with models.ts required field)
    results: componentResultsSchema.optional().default(null),
  })
  .superRefine((rec, ctx) => {
    const t = rec.componentType;
    const k = rec.inputs.kind;

    const expectKind = (expected: typeof rec.inputs.kind) => {
      if (k !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["inputs", "kind"],
          message: `Inputs.kind must be "${expected}" for component type "${t}".`,
        });
      }
    };

    // ComponentType ↔ kind mapping
    switch (t) {
      case "Silicon: Digital MOS":
        expectKind("SiliconMos");
        break;
      case "Resistor":
      case "Resistor Variable":
      case "Fixed, film, chip (PD < 1 W)":
      case "Transistor":
        expectKind("Power");
        break;
      case "Diode Signal":
      case "Capacitor":
        expectKind("Voltage");
        break;
      case "Relays":
      case "Switches":
        expectKind("Current");
        break;
      case "Transformer":
        expectKind("Transformer");
        break;
      case "Bearings":
        expectKind("Bearings");
        break;
      case "Springs":
        expectKind("Springs");
        break;
      case "Seals":
        expectKind("Seals");
        break;
    }

    // Cross-field validations (must be INSIDE this callback)
    if (rec.inputs.kind === "SiliconMos") {
      const inp = rec.inputs;

      if (inp.tjMaxC !== undefined && inp.tjMaxC < inp.tjAppliedC) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["inputs", "tjMaxC"],
          message: "TJmax is below applied TJ. Verify TJmax entry.",
        });
      }

      if (
        rec.rule.effectiveRule?.maxOperatingLimitExpr?.includes("TJmax") &&
        inp.tjMaxC === undefined
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["inputs", "tjMaxC"],
          message: "TJmax is required for this MOS rule (TJmax − offset).",
        });
      }
    }

    if (rec.inputs.kind === "Seals") {
      const temp = rec.inputs.temperature;
      if (temp.appliedTempC > temp.ratedTempC) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["inputs", "temperature", "appliedTempC"],
          message: "Applied temperature exceeds rated temperature; this will fail compliance.",
        });
      }
    }
  });

// ---------- Global schemas ----------
export const targetsSchema = z
  .object({
    minDeratedDM: finiteNumber("Minimum derated DM").min(0).max(0.99),
    minDeratedFOS: finiteNumber("Minimum derated FOS").min(1).max(1000),
    minTempMarginC: finiteNumber("Minimum temperature margin").min(0).max(500),
    decoupleDMFOS: z.boolean(),
  })
  .superRefine((t, ctx) => {
    if (!t.decoupleDMFOS) {
      const linked = 1 / (1 - t.minDeratedDM);
      if (Math.abs(t.minDeratedFOS - linked) > 1e-6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["minDeratedFOS"],
          message: `minDeratedFOS must equal 1/(1−DM) = ${linked.toFixed(
            4
          )} when decoupleDMFOS is false.`,
        });
      }
    }
  });

export const globalSettingsSchema = z.object({
  applicationCategory: applicationCategorySchema,
  qualityClass: qualityClassSchema,
  tempUnit: z.enum(["C", "F"] as const),
  mechanicalUnits: z.enum(["Metric", "Imperial"] as const),
  defaultPressureUnit: pressureUnitSchema,
  requireExactRuleMatch: z.boolean(),
});

export const projectMetaSchema = z.object({
  projectName: z.string().optional(),
  productName: z.string().optional(),
  owner: z.string().optional(),
  dateISO: z.string().optional(),
});

// ---------- DeratingNavigatorState ----------
// ---------- DeratingNavigatorState ----------
// IMPORTANT:
// Do NOT type this as z.ZodType<DeratingNavigatorState>
// because we intentionally allow older inputs where component.results is missing.
// We validate OUTPUT type instead.
export const deratingNavigatorStateSchema = z.object({
  meta: projectMetaSchema,
  settings: globalSettingsSchema,
  targets: targetsSchema,
  rules: z.array(ruleSchema),
  components: z.array(componentRecordSchema),
  overall: z.object({
    status: statusSchema,
    worst: z
      .object({
        componentId: z.string().optional(),
        refDes: z.string().optional(),
        limitingCheckKey: z.string().optional(),
        minDeratedDM: z.number().optional(),
        minDeratedFOS: z.number().nullable().optional(),
        minTempMarginC: z.number().optional(),
      })
      .optional(),
  }),
});

// ✅ OUTPUT type of schema (after defaults applied)
export type DeratingNavigatorStateParsed = z.output<typeof deratingNavigatorStateSchema>;

// ✅ Compile-time check: schema OUTPUT matches your models.ts DeratingNavigatorState
type _AssertOutputMatchesModels = DeratingNavigatorStateParsed extends DeratingNavigatorState
  ? true
  : never;
