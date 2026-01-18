// lib/derating/compute.ts
import type {
  BenefitResults,
  ComponentInputs,
  ComponentRecord,
  ComponentResults,
  DeratedMarginResults,
  DeratingNavigatorState,
  EffectiveRule,
  MarginResults,
  RatedApplied,
  Status,
  ThermalResults,
} from "./models";

const BOLTZMANN_EV_PER_K = 8.617e-5;

// -----------------------------
// Small utilities
// -----------------------------
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export const cToK = (c: number) => c + 273.15;

export function computeMargin(rated: number, applied: number): MarginResults {
  const sr = rated > 0 ? applied / rated : Number.POSITIVE_INFINITY;
  const dm = 1 - sr;
  const fos = applied === 0 ? null : rated / applied;
  return { sr, dm, fos };
}

export function computeDeratedMargin(allowed: number, applied: number): Omit<DeratedMarginResults, "allowed"> {
  const srDerated = allowed > 0 ? applied / allowed : Number.POSITIVE_INFINITY;
  const dmDerated = 1 - srDerated;
  const fosDerated = applied === 0 ? null : allowed / applied;
  return { srDerated, dmDerated, fosDerated };
}

export function statusFromPass(pass: boolean): Status {
  return pass ? "Pass" : "Fail";
}

function worseStatus(a: Status, b: Status): Status {
  const rank: Record<Status, number> = { Pass: 0, Attention: 1, Fail: 2 };
  return rank[a] >= rank[b] ? a : b;
}

function makeMsg(level: "info" | "warning" | "error", text: string) {
  return { level, text };
}

function getDF(rule: EffectiveRule | null): number | null {
  const df = rule?.deratingFactor ?? null;
  if (df === null) return null;
  if (!Number.isFinite(df)) return null;
  return clamp(df, 0, 1);
}

// -----------------------------
// Rule → simple TJ allowed parsing (v1)
// Supports: "90C" and "TJmax-50C" patterns
// -----------------------------
export function computeTJAllowedC(expr: string | null, tjMaxC?: number): number | null {
  if (!expr) return null;

  const e = expr.replace(/\s+/g, "").toUpperCase(); // e.g. "TJMAX-50C"
  // Constant like "90C"
  const mConst = e.match(/^(-?\d+(\.\d+)?)C$/);
  if (mConst) return Number(mConst[1]);

  // "TJMAX-50C" or "TJMAX-50"
  const mTJ = e.match(/^TJMAX-(-?\d+(\.\d+)?)(C)?$/);
  if (mTJ) {
    if (tjMaxC === undefined) return null;
    return tjMaxC - Number(mTJ[1]);
  }

  // Unknown expression v1
  return null;
}

// -----------------------------
// Thermal models
// -----------------------------
export function thermalForTransformer(inputs: ComponentInputs, rule: EffectiveRule | null): ThermalResults | undefined {
  if (inputs.kind !== "Transformer") return undefined;

  const thermal = inputs.thermal;
  if (!thermal) return { model: "None", notes: "No thermal inputs provided." };

  const Tamb = thermal.ambientC ?? 25;
  const TratedFull = thermal.ratedTempAtFullLoadC;

  // Stress ratio from VA (applied/rated)
  const rated = inputs.va.rated;
  const applied = inputs.va.applied;
  const sr = rated > 0 ? applied / rated : 0;

  // Spec model:
  // T_oper = Tamb + 0.15*TratedFull + 0.85*(TratedFull*SR)
  const est = Tamb + 0.15 * TratedFull + 0.85 * (TratedFull * sr);

  const limit = thermal.hotSpotLimitC;
  const margin = limit !== undefined ? limit - est : undefined;

  let status: Status | undefined;
  if (limit !== undefined) status = est <= limit ? "Pass" : "Fail";

  return {
    model: "TransformerPartialLoad",
    ambientC: Tamb,
    estimatedTempC: est,
    limitC: limit,
    marginC: margin,
    status,
  };
}

export function thermalForJunctionRThetaFromMos(inputs: ComponentInputs): ThermalResults | undefined {
  if (inputs.kind !== "SiliconMos") return undefined;
  if (!inputs.thermal) return undefined;

  const { powerDissW, selectedPath } = inputs.thermal;
  let est: number | undefined;
  let base: number | undefined;

  if (selectedPath === "ambient") {
    const ap = inputs.thermal.ambientPath;
    if (!ap) return { model: "JunctionRTheta", notes: "ambientPath required for selectedPath=ambient." };
    base = ap.ambientC ?? 25;
    est = base + powerDissW * ap.rThetaJA_CPerW;
  } else {
    const cp = inputs.thermal.casePath;
    if (!cp) return { model: "JunctionRTheta", notes: "casePath required for selectedPath=case." };
    base = cp.caseC;
    est = base + powerDissW * cp.rThetaJC_CPerW;
  }

  return {
    model: "JunctionRTheta",
    ambientC: selectedPath === "ambient" ? base : undefined,
    estimatedTempC: est,
  };
}

export function thermalForJunctionRThetaFromPower(inputs: ComponentInputs): ThermalResults | undefined {
  if (inputs.kind !== "Power") return undefined;
  if (!inputs.junctionThermal) return undefined;

  const jt = inputs.junctionThermal;
  const Tamb = jt.ambientC ?? 25;

  let est: number | undefined;
  if (jt.selectedPath === "ambient") {
    if (jt.rThetaJA_CPerW === undefined) {
      return { model: "JunctionRTheta", notes: "rThetaJA_CPerW required for selectedPath=ambient." };
    }
    est = Tamb + jt.powerDissW * jt.rThetaJA_CPerW;
  } else {
    if (jt.caseC === undefined || jt.rThetaJC_CPerW === undefined) {
      return { model: "JunctionRTheta", notes: "caseC and rThetaJC_CPerW required for selectedPath=case." };
    }
    est = jt.caseC + jt.powerDissW * jt.rThetaJC_CPerW;
  }

  return {
    model: "JunctionRTheta",
    ambientC: jt.selectedPath === "ambient" ? Tamb : undefined,
    estimatedTempC: est,
  };
}

export function thermalForResistor(inputs: ComponentInputs): ThermalResults | undefined {
  if (inputs.kind !== "Power") return undefined;

  // Endpoint model (if both endpoints are provided)
  const ep = inputs.endpoints;
  if (ep?.tMaxZeroPowerC !== undefined && ep?.tSFullPowerC !== undefined) {
    return {
      model: "ResistorEndpoint",
      estimatedTempC: undefined,
      notes: "Endpoint fields present. Temperature is evaluated in UI using DF; compute layer uses P×Rθ if provided.",
    };
  }

  // P × Rθ model (if available)
  const th = inputs.thermal;
  if (th?.rThetaCPerW !== undefined) {
    const Tamb = th.ambientC ?? 25;
    const Pdiss = inputs.power.applied; // assume applied power is dissipation
    const est = Tamb + Pdiss * th.rThetaCPerW;
    return {
      model: "ResistorPRTheta",
      ambientC: Tamb,
      estimatedTempC: est,
    };
  }

  return undefined;
}

// -----------------------------
// Benefit models (relative failure-rate sensitivity)
// -----------------------------
export function computeArrheniusLambdaRatio(eaEv: number, t0C: number, tC: number): number {
  const T0 = cToK(t0C);
  const T = cToK(tC);
  // λ/λ0 = exp((Ea/k)*(1/T0 - 1/T))
  return Math.exp((eaEv / BOLTZMANN_EV_PER_K) * (1 / T0 - 1 / T));
}

export function computePowerLawLambdaRatio(s0: number, s: number, n: number): number {
  return Math.pow(s / s0, n);
}

export function buildBenefit(
  enabled: boolean,
  t0C: number,
  tC: number,
  eaEv: number | undefined,
  s0: number | undefined,
  s: number | undefined,
  n: number | undefined,
  lambda0: number | undefined
): BenefitResults {
  const modelsUsed: Array<"Arrhenius" | "PowerLaw"> = [];
  let lambdaRatioTemp: number | undefined;
  let lambdaRatioStress: number | undefined;

  if (!enabled) {
    return {
      enabled: false,
      modelsUsed: [],
      inputs: { t0C, tC, eaEv, s0, s, n, lambda0 },
      lambdaRatioCombined: 1,
      lambdaAbsolute: lambda0 !== undefined ? lambda0 : undefined,
    };
  }

  if (eaEv !== undefined) {
    lambdaRatioTemp = computeArrheniusLambdaRatio(eaEv, t0C, tC);
    modelsUsed.push("Arrhenius");
  }
  if (s0 !== undefined && s !== undefined && n !== undefined) {
    lambdaRatioStress = computePowerLawLambdaRatio(s0, s, n);
    modelsUsed.push("PowerLaw");
  }

  const combined =
    (lambdaRatioTemp ?? 1) *
    (lambdaRatioStress ?? 1);

  const lambdaAbsolute = lambda0 !== undefined ? lambda0 * combined : undefined;

  return {
    enabled: true,
    modelsUsed,
    inputs: { t0C, tC, eaEv, s0, s, n, lambda0 },
    lambdaRatioTemp,
    lambdaRatioStress,
    lambdaRatioCombined: combined,
    lambdaAbsolute,
  };
}

// -----------------------------
// Component compute
// -----------------------------
function computeRatioCheck(
  name: string,
  ra: RatedApplied,
  df: number | null
): {
  pass: boolean;
  margin: MarginResults;
  derated?: DeratedMarginResults;
  allowed?: number;
} {
  const margin = computeMargin(ra.rated, ra.applied);
  if (df === null) {
    // no derated allowed; pass is based on rated only (applied <= rated)
    return { pass: ra.applied <= ra.rated, margin };
  }
  const allowed = ra.rated * df;
  const der = computeDeratedMargin(allowed, ra.applied);
  const pass = ra.applied <= allowed;
  return { pass, margin, derated: { allowed, ...der }, allowed };
}

function computeLimitCheck(applied: number, limit: number): { pass: boolean } {
  return { pass: applied <= limit };
}

function componentParameterFromType(componentType: ComponentRecord["componentType"]) {
  switch (componentType) {
    case "Silicon: Digital MOS":
      return "TJ" as const;
    case "Resistor":
    case "Resistor Variable":
    case "Transistor":
      return "Power" as const;
    case "Fixed, film, chip (PD < 1 W)":
      return "Power (D)" as const;
    case "Diode Signal":
    case "Capacitor":
      return "Voltage" as const;
    case "Transformer":
      return "Power (VA Load)" as const;
    case "Relays":
    case "Switches":
      return "Contact Current" as const;
    case "Bearings":
      return "Speed, Load, Lubrication" as const;
    case "Springs":
      return "Material properties, Size" as const;
    case "Seals":
      return "Material characteristics, Size" as const;
    default:
      return "Unknown" as const;
  }
}

export function computeComponent(
  comp: ComponentRecord,
  targets: DeratingNavigatorState["targets"]
): ComponentRecord {
  const rule = comp.rule.effectiveRule;
  const df = getDF(rule);

  const parameterDerated = componentParameterFromType(comp.componentType);

  const messages: ComponentResults["messages"] = [];
  const checks: ComponentResults["checks"] = {};

  // 1) Compliance checks (Tab 1)
  switch (comp.inputs.kind) {
    case "SiliconMos": {
      // TJ limit check from rule expression OR use entered applied directly
      const expr = rule?.maxOperatingLimitExpr ?? null;
      const tjAllowed = computeTJAllowedC(expr, comp.inputs.tjMaxC);

      if (tjAllowed === null) {
        messages.push(makeMsg("warning", "No parsable TJ allowed from rule. Provide a numeric limit or override rule."));
        // still create a check that compares applied vs itself (pass) for reporting consistency
        checks["JunctionTemp"] = {
          kind: "Limit",
          applied: comp.inputs.tjAppliedC,
          rated: undefined,
          df: null,
          pass: true,
          status: "Attention",
          note: "TJ limit not available from rule expression.",
        };
      } else {
        const pass = comp.inputs.tjAppliedC <= tjAllowed;
        checks["JunctionTemp"] = {
          kind: "Limit",
          rated: tjAllowed,
          applied: comp.inputs.tjAppliedC,
          pass,
          status: statusFromPass(pass),
          note: `Allowed TJ = ${tjAllowed.toFixed(1)}°C`,
        };
      }
      break;
    }

    case "Power": {
      const r = computeRatioCheck("Power", comp.inputs.power, df);
      checks["Power"] = {
        kind: "Ratio",
        rated: comp.inputs.power.rated,
        applied: comp.inputs.power.applied,
        df,
        margin: r.margin,
        derated: r.derated,
        pass: r.pass,
        status: statusFromPass(r.pass),
      };
      break;
    }

    case "Voltage": {
      const r = computeRatioCheck("Voltage", comp.inputs.voltage, df);
      checks["Voltage"] = {
        kind: "Ratio",
        rated: comp.inputs.voltage.rated,
        applied: comp.inputs.voltage.applied,
        df,
        margin: r.margin,
        derated: r.derated,
        pass: r.pass,
        status: statusFromPass(r.pass),
      };

      // Optional capacitor temperature sanity (informational)
      if (comp.inputs.capacitorTemp?.ratedTempC !== undefined && comp.inputs.capacitorTemp?.operatingTempC !== undefined) {
        if (comp.inputs.capacitorTemp.operatingTempC > comp.inputs.capacitorTemp.ratedTempC) {
          messages.push(makeMsg("warning", "Capacitor operating temperature exceeds rated temperature."));
        }
      }
      break;
    }

    case "Current": {
      const r = computeRatioCheck("Current", comp.inputs.current, df);
      checks["ContactCurrent"] = {
        kind: "Ratio",
        rated: comp.inputs.current.rated,
        applied: comp.inputs.current.applied,
        df,
        margin: r.margin,
        derated: r.derated,
        pass: r.pass,
        status: statusFromPass(r.pass),
      };
      break;
    }

    case "Transformer": {
      const r = computeRatioCheck("VA", comp.inputs.va, df);
      checks["VA_Load"] = {
        kind: "Ratio",
        rated: comp.inputs.va.rated,
        applied: comp.inputs.va.applied,
        df,
        margin: r.margin,
        derated: r.derated,
        pass: r.pass,
        status: statusFromPass(r.pass),
      };
      break;
    }

    case "Bearings": {
      const rLoad = computeMargin(comp.inputs.radialLoad.rated, comp.inputs.radialLoad.applied);
      const rSpeed = computeMargin(comp.inputs.speedRpm.rated, comp.inputs.speedRpm.applied);

      // Bearings don't have DF in v1; pass based on rated only
      const passLoad = comp.inputs.radialLoad.applied <= comp.inputs.radialLoad.rated;
      const passSpeed = comp.inputs.speedRpm.applied <= comp.inputs.speedRpm.rated;

      checks["RadialLoad"] = {
        kind: "Ratio",
        rated: comp.inputs.radialLoad.rated,
        applied: comp.inputs.radialLoad.applied,
        df: null,
        margin: rLoad,
        pass: passLoad,
        status: statusFromPass(passLoad),
        note: comp.inputs.lubrication !== "Adequate" ? `Lubrication: ${comp.inputs.lubrication}` : undefined,
      };

      checks["Speed"] = {
        kind: "Ratio",
        rated: comp.inputs.speedRpm.rated,
        applied: comp.inputs.speedRpm.applied,
        df: null,
        margin: rSpeed,
        pass: passSpeed,
        status: statusFromPass(passSpeed),
      };
      break;
    }

    case "Springs": {
      const rForce = computeMargin(comp.inputs.force.rated, comp.inputs.force.applied);
      const passForce = comp.inputs.force.applied <= comp.inputs.force.rated;

      checks["Force"] = {
        kind: "Ratio",
        rated: comp.inputs.force.rated,
        applied: comp.inputs.force.applied,
        df: null,
        margin: rForce,
        pass: passForce,
        status: statusFromPass(passForce),
      };

      if (comp.inputs.deflectionMm) {
        const rDef = computeMargin(comp.inputs.deflectionMm.rated, comp.inputs.deflectionMm.applied);
        const passDef = comp.inputs.deflectionMm.applied <= comp.inputs.deflectionMm.rated;
        checks["Deflection"] = {
          kind: "Ratio",
          rated: comp.inputs.deflectionMm.rated,
          applied: comp.inputs.deflectionMm.applied,
          df: null,
          margin: rDef,
          pass: passDef,
          status: statusFromPass(passDef),
        };
      }
      break;
    }

    case "Seals": {
      const rPress = computeMargin(comp.inputs.pressurePa.rated, comp.inputs.pressurePa.applied);
      const passPress = comp.inputs.pressurePa.applied <= comp.inputs.pressurePa.rated;

      const passTemp = comp.inputs.temperature.appliedTempC <= comp.inputs.temperature.ratedTempC;

      checks["Pressure"] = {
        kind: "Ratio",
        rated: comp.inputs.pressurePa.rated,
        applied: comp.inputs.pressurePa.applied,
        df: null,
        margin: rPress,
        pass: passPress,
        status: statusFromPass(passPress),
      };

      checks["Temperature"] = {
        kind: "Limit",
        rated: comp.inputs.temperature.ratedTempC,
        applied: comp.inputs.temperature.appliedTempC,
        pass: passTemp,
        status: statusFromPass(passTemp),
      };
      break;
    }

    default: {
      checks["Unknown"] = {
        kind: "Limit",
        pass: true,
        status: "Attention",
        note: "Unknown component kind; no checks computed.",
      };
      messages.push(makeMsg("warning", "Unknown component kind; please select a supported type."));
      break;
    }
  }

  // 2) Thermal (Tab 2)
  let thermal: ThermalResults | undefined;
  thermal =
    thermalForTransformer(comp.inputs, rule) ??
    thermalForJunctionRThetaFromMos(comp.inputs) ??
    thermalForJunctionRThetaFromPower(comp.inputs) ??
    thermalForResistor(comp.inputs);

  // If MOS has allowed TJ, set thermal limit/margin when we have estimate
  if (comp.inputs.kind === "SiliconMos") {
    const tjAllowed = computeTJAllowedC(rule?.maxOperatingLimitExpr ?? null, comp.inputs.tjMaxC);
    if (thermal?.model === "JunctionRTheta" && thermal.estimatedTempC !== undefined && tjAllowed !== null) {
      thermal.limitC = tjAllowed;
      thermal.marginC = tjAllowed - thermal.estimatedTempC;
      thermal.status = thermal.estimatedTempC <= tjAllowed ? "Pass" : "Fail";
    }
  }

  // 3) Benefit (Tab 3) — compute a default, minimally invasive benefit block
  // Default behavior:
  // - enabled only if user previously enabled (results.benefit.enabled) OR if we can infer temps from thermal
  // - Use T0=25C, Ea=0.7eV, n=5 if not provided in prior results
  // - Stress ratio uses: derated SR if available else rated SR
  const priorBenefit = comp.results?.benefit;
  const benefitEnabled = priorBenefit?.enabled ?? false;

  const T0 = priorBenefit?.inputs?.t0C ?? 25;
  const T = priorBenefit?.inputs?.tC ?? thermal?.estimatedTempC ?? T0;

  // stress ratio
  const findFirstDeratedSR = (): number | undefined => {
    for (const key of Object.keys(checks)) {
      const c = checks[key];
      if (c.derated?.srDerated !== undefined && Number.isFinite(c.derated.srDerated)) return c.derated.srDerated;
    }
    for (const key of Object.keys(checks)) {
      const c = checks[key];
      if (c.margin?.sr !== undefined && Number.isFinite(c.margin.sr)) return c.margin.sr;
    }
    return undefined;
  };

  const s = priorBenefit?.inputs?.s ?? findFirstDeratedSR();
  const s0 = priorBenefit?.inputs?.s0 ?? 1.0;

  const eaEv = priorBenefit?.inputs?.eaEv ?? 0.7;
  const n = priorBenefit?.inputs?.n ?? 5;
  const lambda0 = priorBenefit?.inputs?.lambda0;

  const benefit =
    benefitEnabled
      ? buildBenefit(true, T0, T, eaEv, s0, s, n, lambda0)
      : undefined;

  // 4) Determine status + worst-case rollups (Tab 4)
  let status: Status = "Pass";

  // start from any Fail checks
  for (const key of Object.keys(checks)) {
    status = worseStatus(status, checks[key].status);
  }

  // Apply "Attention" thresholds if not already Fail
  if (status !== "Fail") {
    let minDeratedDM: number | undefined;
    let minDeratedFOS: number | null | undefined;
    let minTempMarginC: number | undefined;
    let limitingCheckKey: string | undefined;

    const considerDMFOS = (key: string, dm?: number, fos?: number | null) => {
      if (dm !== undefined) {
        if (minDeratedDM === undefined || dm < minDeratedDM) {
          minDeratedDM = dm;
          limitingCheckKey = key;
        }
        if (dm < targets.minDeratedDM) status = worseStatus(status, "Attention");
      }
      if (fos !== undefined) {
        if (minDeratedFOS === undefined || (fos !== null && minDeratedFOS !== null && fos < minDeratedFOS)) {
          minDeratedFOS = fos;
        }
        if (fos !== null && fos < targets.minDeratedFOS) status = worseStatus(status, "Attention");
      }
    };

    for (const key of Object.keys(checks)) {
      const c = checks[key];
      if (c.derated) {
        considerDMFOS(key, c.derated.dmDerated, c.derated.fosDerated);
      } else if (c.margin) {
        // Mechanical v1 uses rated SR as proxy
        considerDMFOS(key, c.margin.dm, c.margin.fos);
      }
    }

    if (thermal?.marginC !== undefined) {
      minTempMarginC = thermal.marginC;
      if (thermal.marginC < targets.minTempMarginC) status = worseStatus(status, "Attention");
    }

    const worst = { minDeratedDM, minDeratedFOS, minTempMarginC, limitingCheckKey };
    const results: ComponentResults = {
      status,
      messages,
      parameterDerated,
      checks,
      thermal,
      benefit,
      worst,
    };

    return { ...comp, results };
  }

  // If Fail, still compute worst fields for reporting
  const worstFail: ComponentResults["worst"] = {};
  for (const key of Object.keys(checks)) {
    const c = checks[key];
    if (c.derated) {
      worstFail.minDeratedDM =
        worstFail.minDeratedDM === undefined ? c.derated.dmDerated : Math.min(worstFail.minDeratedDM, c.derated.dmDerated);
      worstFail.minDeratedFOS =
        worstFail.minDeratedFOS === undefined
          ? c.derated.fosDerated
          : (worstFail.minDeratedFOS === null || c.derated.fosDerated === null)
            ? null
            : Math.min(worstFail.minDeratedFOS, c.derated.fosDerated);
    } else if (c.margin) {
      worstFail.minDeratedDM =
        worstFail.minDeratedDM === undefined ? c.margin.dm : Math.min(worstFail.minDeratedDM, c.margin.dm);
      worstFail.minDeratedFOS =
        worstFail.minDeratedFOS === undefined
          ? c.margin.fos
          : (worstFail.minDeratedFOS === null || c.margin.fos === null)
            ? null
            : Math.min(worstFail.minDeratedFOS, c.margin.fos);
    }
  }
  if (thermal?.marginC !== undefined) worstFail.minTempMarginC = thermal.marginC;

  const results: ComponentResults = {
    status,
    messages,
    parameterDerated,
    checks,
    thermal,
    benefit,
    worst: worstFail,
  };

  return { ...comp, results };
}

// -----------------------------
// Whole-state compute
// -----------------------------
export function computeState(state: DeratingNavigatorState): DeratingNavigatorState {
  const components = state.components.map((c) => computeComponent(c, state.targets));

  // Overall rollup
  let overallStatus: Status = "Pass";
  let worst: DeratingNavigatorState["overall"]["worst"] | undefined;

  for (const c of components) {
    const s = c.results?.status ?? "Attention";
    overallStatus = worseStatus(overallStatus, s);

    const w = c.results?.worst;
    if (!w) continue;

    // Track worst by minimum derated DM primarily, then temp margin
    const candidateDM = w.minDeratedDM;
    const candidateTemp = w.minTempMarginC;

    const isWorse =
      worst === undefined
        ? true
        : candidateDM !== undefined && (worst.minDeratedDM === undefined || candidateDM < worst.minDeratedDM)
          ? true
          : candidateDM === worst.minDeratedDM &&
            candidateTemp !== undefined &&
            (worst.minTempMarginC === undefined || candidateTemp < worst.minTempMarginC);

    if (isWorse) {
      worst = {
        componentId: c.id,
        refDes: c.refDes,
        limitingCheckKey: w.limitingCheckKey,
        minDeratedDM: w.minDeratedDM,
        minDeratedFOS: w.minDeratedFOS ?? null,
        minTempMarginC: w.minTempMarginC,
      };
    }
  }

  return {
    ...state,
    components,
    overall: { status: overallStatus, worst },
  };
}
