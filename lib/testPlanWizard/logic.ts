import {
  FAILURE_MODE_LIBRARY,
  MATERIAL_LIBRARY,
  MECHANISMS,
  PRODUCT_TYPES,
  TESTS,
} from "./knowledgeBase";
import type {
  AccelerationInfo,
  AccelerationModel,
  FailureModeSelection,
  HumidityLevel,
  MaterialsSelection,
  MechanismSelection,
  MechanismConfidence,
  MissionProfile,
  PrioritizationState,
  PriorEvidenceEntry,
  ProductContext,
  ResidualRiskState,
  SelectedTest,
  TestScore,
  WizardState,
  DvprRow,
  ScheduleTask,
} from "./types";

const K_BOLTZ = 8.617e-5;
const EA_DEFAULT = 0.7;
const CM_N_DEFAULT = 1.9;
const PECK_M_DEFAULT = 2.7;
const EYRING_M_DEFAULT = 1.6;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const toK = (c: number) => c + 273.15;

const betaInvCache = new Map<string, number>();

function logGamma(z: number) {
  const p = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    0.000009984369578019572,
    0.00000015056327351493116,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  const g = 7;
  const zMinus = z - 1;
  let x = p[0];
  for (let i = 1; i < p.length; i += 1) {
    x += p[i] / (zMinus + i);
  }
  const t = zMinus + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (zMinus + 0.5) * Math.log(t) - t + Math.log(x);
}

function betacf(a: number, b: number, x: number) {
  const maxIter = 200;
  const eps = 3e-7;
  const fpmin = 1e-30;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < fpmin) d = fpmin;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIter; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < eps) break;
  }
  return h;
}

function regularizedBeta(x: number, a: number, b: number) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lnBeta = logGamma(a + b) - logGamma(a) - logGamma(b);
  const bt = Math.exp(lnBeta + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(a, b, x)) / a;
  }
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

function betaInvCDF(q: number, a: number, b: number) {
  if (q <= 0) return 0;
  if (q >= 1) return 1;
  const key = `${q.toFixed(4)}|${a.toFixed(4)}|${b.toFixed(4)}`;
  const cached = betaInvCache.get(key);
  if (cached !== undefined) return cached;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2;
    const cdf = regularizedBeta(mid, a, b);
    if (cdf < q) {
      low = mid;
    } else {
      high = mid;
    }
  }
  const result = (low + high) / 2;
  betaInvCache.set(key, result);
  return result;
}

export function computePriorEvidence(entry?: PriorEvidenceEntry) {
  if (!entry || entry.nPrev === null || entry.nPrev <= 0) {
    return {
      nPrev: entry?.nPrev ?? null,
      fPrev: entry?.fPrev ?? null,
      similarityPct: entry?.similarityPct ?? 100,
      priorType: entry?.priorType ?? "jeffreys",
      badge: "None" as const,
    };
  }
  const similarity = clamp(entry.similarityPct ?? 100, 0, 100);
  const nPrev = Math.max(0, Math.round(entry.nPrev));
  const fPrev = Math.min(Math.max(0, Math.round(entry.fPrev ?? 0)), nPrev);
  const nEff = nPrev * (similarity / 100);
  const fEff = fPrev * (similarity / 100);
  const priorType = entry.priorType ?? "jeffreys";
  const alpha0 = priorType === "uniform" ? 1 : 0.5;
  const beta0 = priorType === "uniform" ? 1 : 0.5;
  const alpha = alpha0 + fEff;
  const beta = beta0 + (nEff - fEff);
  const meanFailProb = alpha / (alpha + beta);
  const upperFailProb95 = betaInvCDF(0.95, alpha, beta);
  const badge =
    upperFailProb95 <= 0.01 ? "Low" : upperFailProb95 <= 0.05 ? "Med" : "High";
  return {
    nPrev,
    fPrev,
    similarityPct: similarity,
    priorType,
    alpha,
    beta,
    meanFailProb,
    upperFailProb95,
    badge,
  };
}

export function computePriorEvidenceMap(
  tests: SelectedTest[],
  priorEvidence: Record<string, PriorEvidenceEntry>
) {
  const map: Record<string, ReturnType<typeof computePriorEvidence>> = {};
  tests.forEach((test) => {
    map[test.id] = computePriorEvidence(priorEvidence[test.id]);
  });
  return map;
}

const humidityToRh: Record<HumidityLevel, number> = {
  low: 40,
  medium: 65,
  high: 85,
};

const HUMIDITY_TEST_IDS = new Set(["temp-humidity-constant", "temp-humidity-cycling", "damp-heat"]);

export function isHumidityBasedTestId(testId: string) {
  return HUMIDITY_TEST_IDS.has(testId);
}

const mechanismDefaultConfidence: Record<string, MechanismConfidence> = {
  "thermal-fatigue": "high",
  "thermal-aging": "high",
  "creep-relaxation": "medium",
  "fretting-corrosion": "medium",
  "humidity-corrosion": "medium",
  "chemical-attack": "assumed",
  "vibration-fatigue": "medium",
  "seal-degradation": "medium",
  "electromigration": "assumed",
  "eos-overstress": "assumed",
};

const changeTriggerTests: Record<keyof WizardState["changes"], string[]> = {
  newMaterial: ["chemical-resistance", "high-temp-storage"],
  newSupplier: ["burn-in-screen"],
  geometryChange: ["random-vibration", "retention-force"],
  mountingRelocation: ["random-vibration", "mechanical-shock"],
  processChange: ["burn-in-screen"],
  deratingChange: ["eos-transient"],
  costDownVariant: ["burn-in-screen"],
};

const sampleSizeCache = new Map<string, number>();

function defaultFailureModes(): Record<string, FailureModeSelection> {
  const entries = FAILURE_MODE_LIBRARY.map((mode) => [
    mode.id,
    {
      selected: false,
      severity: mode.defaultSeverity,
      occurrence: mode.defaultOccurrence,
      detection: mode.defaultDetection,
      mechanismIds: mode.mechanismIds,
    },
  ]);
  return Object.fromEntries(entries);
}

function materialEaMidpoint(materialId?: string) {
  if (!materialId) return null;
  const material = MATERIAL_LIBRARY.find((entry) => entry.id === materialId);
  if (!material?.eaRange) return null;
  return (material.eaRange.min + material.eaRange.max) / 2;
}

export function createDefaultWizardState(): WizardState {
  return {
    product: {
      productType: "",
      industry: "",
      safetyCritical: false,
      serviceLifeYears: null,
      warrantyYears: null,
    },
    missionProfile: {
      tempMinC: null,
      tempMaxC: null,
      thermalCycleFreq: "daily",
      humidity: "medium",
      humidityPct: null,
      humidityScenario: "",
      vibration: "low",
      shock: "occasional",
      chemicalExposure: "none",
      activeDutyPct: 50,
    },
    mechanisms: [],
    materials: {},
    failureModes: defaultFailureModes(),
    priorEvidence: {},
    changes: {
      newMaterial: false,
      newSupplier: false,
      geometryChange: false,
      mountingRelocation: false,
      processChange: false,
      deratingChange: false,
      costDownVariant: false,
    },
    selectedTests: [],
    prioritization: {
      testScores: {},
    },
    residualRisk: {
      perMechanism: {},
    },
    reliabilityPlan: {
      targetReliability: 0.9,
      confidence: 0.9,
      allowedFailures: 0,
      method: "binomial",
    },
    dvpr: {
      rows: [],
    },
    schedule: {
      strategy: "sequential",
      startDateISO: new Date().toISOString().slice(0, 10),
      tasks: [],
    },
  };
}

export function hydrateWizardState(incoming: Partial<WizardState>): WizardState {
  const base = createDefaultWizardState();
  return {
    ...base,
    ...incoming,
    product: { ...base.product, ...incoming.product },
    missionProfile: { ...base.missionProfile, ...incoming.missionProfile },
    materials: { ...base.materials, ...incoming.materials },
    failureModes: { ...base.failureModes, ...incoming.failureModes },
    priorEvidence: { ...base.priorEvidence, ...incoming.priorEvidence },
    changes: { ...base.changes, ...incoming.changes },
    prioritization: { ...base.prioritization, ...incoming.prioritization },
    residualRisk: { ...base.residualRisk, ...incoming.residualRisk },
    reliabilityPlan: { ...base.reliabilityPlan, ...incoming.reliabilityPlan },
    dvpr: { ...base.dvpr, ...incoming.dvpr },
    schedule: { ...base.schedule, ...incoming.schedule },
    mechanisms: incoming.mechanisms ?? base.mechanisms,
    selectedTests: incoming.selectedTests ?? base.selectedTests,
  };
}

export function suggestMechanisms(product: ProductContext, mission: MissionProfile): string[] {
  const suggestions = new Set<string>();
  if (product.productType) {
    const productType = PRODUCT_TYPES.find((item) => item.id === product.productType);
    productType?.defaultMechanismIds.forEach((id) => suggestions.add(id));
  }
  if (mission.humidity === "high" || mission.chemicalExposure !== "none" || (mission.humidityPct ?? 0) >= 60) {
    suggestions.add("humidity-corrosion");
  }
  if (mission.chemicalExposure !== "none") {
    suggestions.add("chemical-attack");
  }
  if (mission.vibration === "high") {
    suggestions.add("vibration-fatigue");
  }
  if (mission.shock === "frequent") {
    suggestions.add("vibration-fatigue");
  }
  if (mission.thermalCycleFreq !== "rare") {
    suggestions.add("thermal-fatigue");
  }
  if (mission.tempMaxC !== null && mission.tempMaxC > 100) {
    suggestions.add("thermal-aging");
  }
  return Array.from(suggestions);
}

export function applyFailureModesToMechanisms(
  mechanisms: MechanismSelection[],
  failureModes: Record<string, FailureModeSelection>
): MechanismSelection[] {
  const forcedIds = new Set<string>();
  Object.values(failureModes)
    .filter((mode) => mode.selected)
    .forEach((mode) => mode.mechanismIds.forEach((id) => forcedIds.add(id)));
  return mechanisms.map((mech) =>
    forcedIds.has(mech.id)
      ? { ...mech, selected: true }
      : mech
  );
}

export function syncMechanisms(
  existing: MechanismSelection[],
  suggestedIds: string[]
): MechanismSelection[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  return MECHANISMS.map((def) => {
    const current = byId.get(def.id);
    const defaultConfidence = mechanismDefaultConfidence[def.id] ?? "medium";
    if (current) {
      return { ...current, name: def.name, confidence: current.confidence || defaultConfidence };
    }
    return {
      id: def.id,
      name: def.name,
      selected: suggestedIds.includes(def.id),
      confidence: defaultConfidence,
      exclusionJustification: null,
    };
  });
}

function buildDefaultStressProfile(mission: MissionProfile) {
  return {
    tempLowC: mission.tempMinC ?? undefined,
    tempHighC: mission.tempMaxC ?? undefined,
    humidityPct: mission.humidityPct ?? humidityToRh[mission.humidity],
    vibLevel: mission.vibration,
    shockLevel: mission.shock,
  };
}

export function buildCandidateTests(
  mechanisms: MechanismSelection[],
  changes: WizardState["changes"],
  mission: MissionProfile,
  materials: MaterialsSelection
): SelectedTest[] {
  const selectedMechanisms = mechanisms.filter((m) => m.selected).map((m) => m.id);
  const candidateIds = new Set<string>();
  TESTS.forEach((test) => {
    if (test.mechanismIds.some((id) => selectedMechanisms.includes(id))) {
      candidateIds.add(test.id);
    }
  });
  (Object.keys(changes) as Array<keyof WizardState["changes"]>).forEach((key) => {
    if (changes[key]) {
      (changeTriggerTests[key] || []).forEach((id) => candidateIds.add(id));
    }
  });
  if ((mission.humidityPct ?? 0) >= 60) {
    const preferCycling =
      mission.thermalCycleFreq === "daily" ||
      mission.humidityScenario === "coastal" ||
      mission.humidityScenario === "condensing";
    const preferredId = preferCycling ? "temp-humidity-cycling" : "temp-humidity-constant";
    candidateIds.add(preferredId);
  }
  const defaultStressProfile = buildDefaultStressProfile(mission);
  return TESTS
    .filter((test) => candidateIds.has(test.id))
    .map((test) => ({
      id: test.id,
      name: test.name,
      mechanismIds: test.mechanismIds,
      coverage: test.defaults.coverage,
      durationWeeks: test.defaults.durationWeeks,
      costLevel: test.defaults.costLevel,
      status: "keep",
      removalJustification: null,
      acceleration: {
        model: test.acceleration.model || "none",
        params: {
          ...(test.acceleration.parameterDefaults || {}),
          RHuse: mission.humidityPct ?? humidityToRh[mission.humidity],
          RHstress: 85,
          Ea:
            test.acceleration.model === "arrhenius" || test.acceleration.model === "peck" || test.acceleration.model === "eyring"
              ? materialEaMidpoint(materials.housingMaterialId) ?? test.acceleration.parameterDefaults?.Ea ?? EA_DEFAULT
              : test.acceleration.parameterDefaults?.Ea ?? EA_DEFAULT,
          n: test.acceleration.parameterDefaults?.n ?? CM_N_DEFAULT,
          m: test.acceleration.parameterDefaults?.m ?? PECK_M_DEFAULT,
        },
        userOverrides: {
          enabled: false,
        },
        af: null,
        equivYears: null,
        warnings: [],
      },
      stressProfile: { ...defaultStressProfile },
    }));
}

export function mergeSelectedTests(
  existing: SelectedTest[],
  candidates: SelectedTest[]
): SelectedTest[] {
  const byId = new Map(existing.map((test) => [test.id, test]));
  return candidates.map((candidate) => {
    const prior = byId.get(candidate.id);
    if (!prior) return candidate;
    return {
      ...candidate,
      status: prior.status,
      removalJustification: prior.removalJustification,
      coverage: prior.coverage || candidate.coverage,
      durationWeeks: prior.durationWeeks || candidate.durationWeeks,
      costLevel: prior.costLevel || candidate.costLevel,
      acceleration: {
        ...candidate.acceleration,
        ...prior.acceleration,
        params: { ...candidate.acceleration.params, ...prior.acceleration.params },
        userOverrides: {
          ...candidate.acceleration.userOverrides,
          ...prior.acceleration.userOverrides,
        },
      },
      stressProfile: { ...candidate.stressProfile, ...prior.stressProfile },
      sampleSizeOverride: prior.sampleSizeOverride ?? candidate.sampleSizeOverride,
    };
  });
}

export function selectAccelerationModel(test: SelectedTest): AccelerationModel {
  if (test.acceleration?.model && test.acceleration.model !== "none") {
    return test.acceleration.model;
  }
  const priorities: AccelerationModel[] = ["peck", "eyring", "coffin-manson", "arrhenius", "none"];
  for (const model of priorities) {
    if (model === "peck" && test.mechanismIds.includes("humidity-corrosion")) return "peck";
    if (model === "eyring" && test.mechanismIds.some((id) => id === "humidity-corrosion" || id === "chemical-attack")) {
      return "eyring";
    }
    if (model === "coffin-manson" && test.mechanismIds.includes("thermal-fatigue")) return "coffin-manson";
    if (model === "arrhenius" && test.mechanismIds.some((id) => id === "thermal-aging" || id === "electromigration" || id === "creep-relaxation")) {
      return "arrhenius";
    }
  }
  return test.acceleration?.model || "none";
}

export function computeAcceleration(
  test: SelectedTest,
  mission: MissionProfile,
  product: ProductContext,
  materials: MaterialsSelection
): AccelerationInfo {
  const warnings: string[] = [];
  const model = selectAccelerationModel(test);
  const tempMin = mission.tempMinC ?? 25;
  const tempMax = mission.tempMaxC ?? 85;
  const baseTuseK = toK((tempMin + tempMax) / 2);
  const defaultTstressK = toK(tempMax + 20);
  const defaultDeltaUse = Math.max(1, tempMax - tempMin);
  const defaultDeltaStress = defaultDeltaUse + 30;
  const params = test.acceleration.params ?? {};
  const overrides = test.acceleration.userOverrides ?? { enabled: false };
  const baseRhUse = params.RHuse ?? mission.humidityPct ?? humidityToRh[mission.humidity];
  const baseRhStress = params.RHstress ?? 85;
  const baseEa =
    params.Ea ??
    materialEaMidpoint(materials.housingMaterialId) ??
    EA_DEFAULT;
  const baseN = params.n ?? CM_N_DEFAULT;
  const baseM = params.m ?? PECK_M_DEFAULT;
  const tUseK = overrides.enabled && overrides.TuseK ? overrides.TuseK : baseTuseK;
  const rawTstressK = overrides.enabled && overrides.TstressK ? overrides.TstressK : defaultTstressK;
  const deltaUse = overrides.enabled && overrides.deltaTuse ? overrides.deltaTuse : defaultDeltaUse;
  const deltaStress = overrides.enabled && overrides.deltaTstress ? overrides.deltaTstress : defaultDeltaStress;
  const rhUse = overrides.enabled && overrides.RHuse ? overrides.RHuse : baseRhUse;
  const rhStress = overrides.enabled && overrides.RHstress ? overrides.RHstress : baseRhStress;
  const ea = overrides.enabled && overrides.Ea ? overrides.Ea : baseEa;
  const n = overrides.enabled && overrides.n ? overrides.n : baseN;
  const m = overrides.enabled && overrides.m ? overrides.m : baseM;

  const tStressK = overrides.enabled
    ? rawTstressK
    : clamp(rawTstressK, toK(tempMax + 5), toK(200));
  if (model !== "none" && !overrides.enabled) {
    warnings.push("Assumed stress temperature = tempMax + 20C (clamped).");
    if (tStressK !== rawTstressK) {
      warnings.push("Stress temperature clamped for realism; verify over-stress intent.");
    }
  }

  let af = 1;
  if (model === "arrhenius") {
    af = Math.exp((ea / K_BOLTZ) * (1 / tUseK - 1 / tStressK));
  } else if (model === "coffin-manson") {
    af = Math.pow(deltaStress / Math.max(1, deltaUse), n);
    if (deltaUse < 10) {
      warnings.push("Delta T_use < 10C, Coffin-Manson may be unstable.");
    }
  } else if (model === "peck" || model === "eyring") {
    const expo = model === "peck" ? m : EYRING_M_DEFAULT;
    const arr = Math.exp((ea / K_BOLTZ) * (1 / tUseK - 1 / tStressK));
    af = Math.pow(rhStress / Math.max(1, rhUse), expo) * arr;
  }

  if (!Number.isFinite(af) || af <= 0) {
    af = 1;
    warnings.push("Acceleration factor invalid; set to 1.0.");
  }
  if (af > 1e4) {
    warnings.push("Acceleration factor exceeds 1e4; validate assumptions.");
  }
  if (product.productType && tempMax > 150) {
    const tags = PRODUCT_TYPES.find((item) => item.id === product.productType)?.domainTags || [];
    if (tags.includes("polymer") || tags.includes("connector")) {
      warnings.push("TempMax > 150C on polymer-rich hardware may be non-representative.");
    }
  }

  const lifeYears = product.serviceLifeYears ?? 0;
  const equivYears = model === "none" ? lifeYears * (test.durationWeeks / 52) : lifeYears * (test.durationWeeks / 52) * af;

  return {
    model,
    params,
    userOverrides: overrides,
    af: model === "none" ? 1 : Number.isFinite(af) ? Number(af.toFixed(2)) : 1,
    equivYears: Number.isFinite(equivYears) ? Number(equivYears.toFixed(2)) : null,
    warnings,
  };
}

export function applyAcceleration(
  tests: SelectedTest[],
  mission: MissionProfile,
  product: ProductContext,
  materials: MaterialsSelection
): SelectedTest[] {
  return tests.map((test) => ({
    ...test,
    acceleration: computeAcceleration(test, mission, product, materials),
  }));
}

function confidenceToDefaults(
  confidence: string,
  safetyCritical: boolean
): Pick<TestScore, "severity" | "likelihood" | "detectability"> {
  const base =
    confidence === "high"
      ? { severity: 4, likelihood: 3, detectability: 3 }
      : confidence === "medium"
        ? { severity: 3, likelihood: 3, detectability: 4 }
        : { severity: 3, likelihood: 4, detectability: 4 };
  return {
    severity: clamp(base.severity + (safetyCritical ? 1 : 0), 1, 5) as TestScore["severity"],
    likelihood: base.likelihood as TestScore["likelihood"],
    detectability: base.detectability as TestScore["detectability"],
  };
}

function scoreTier(score: number): 1 | 2 | 3 {
  if (score >= 60) return 1;
  if (score >= 30) return 2;
  return 3;
}

export function mergeTestScores(
  tests: SelectedTest[],
  mechanisms: MechanismSelection[],
  safetyCritical: boolean,
  failureModes: Record<string, FailureModeSelection>,
  existing: PrioritizationState["testScores"],
  priorEvidence: Record<string, PriorEvidenceEntry> = {}
): PrioritizationState["testScores"] {
  const mechConfidence = new Map(mechanisms.map((m) => [m.id, m.confidence]));
  const selectedFailureModes = Object.values(failureModes).filter((mode) => mode.selected);
  const priorMap = computePriorEvidenceMap(tests, priorEvidence);
  const next: PrioritizationState["testScores"] = {};
  tests.forEach((test) => {
    const prior = existing[test.id];
    const confidences = test.mechanismIds.map((id) => mechConfidence.get(id) || "assumed");
    const worst = confidences.includes("assumed") ? "assumed" : confidences.includes("medium") ? "medium" : "high";
    const defaults = confidenceToDefaults(worst, safetyCritical);
    const linkedFailureModes = selectedFailureModes.filter((mode) =>
      mode.mechanismIds.some((id) => test.mechanismIds.includes(id))
    );
    const failureDefaults = linkedFailureModes.reduce(
      (acc, mode) => ({
        severity: Math.max(acc.severity, mode.severity),
        likelihood: Math.max(acc.likelihood, mode.occurrence),
        detectability: Math.max(acc.detectability, mode.detection),
      }),
      { severity: 0, likelihood: 0, detectability: 0 }
    );
    const baseLikelihood = failureDefaults.likelihood || defaults.likelihood;
    const priorEvidenceEntry = priorMap[test.id];
    let adjustedLikelihood = baseLikelihood;
    if (!prior?.likelihood && priorEvidenceEntry?.badge && priorEvidenceEntry.badge !== "None") {
      if (priorEvidenceEntry.badge === "High") {
        adjustedLikelihood = clamp(baseLikelihood + 1, 1, 5) as TestScore["likelihood"];
      } else if (
        priorEvidenceEntry.badge === "Low" &&
        (priorEvidenceEntry.nPrev ?? 0) >= 30 &&
        (priorEvidenceEntry.fPrev ?? 0) === 0
      ) {
        adjustedLikelihood = clamp(baseLikelihood - 1, 1, 5) as TestScore["likelihood"];
      }
    }
    const merged = {
      severity: prior?.severity ?? (failureDefaults.severity || defaults.severity),
      likelihood: prior?.likelihood ?? adjustedLikelihood,
      detectability: prior?.detectability ?? (failureDefaults.detectability || defaults.detectability),
    };
    const score = merged.severity * merged.likelihood * merged.detectability;
    next[test.id] = {
      ...merged,
      score,
      tier: scoreTier(score),
    };
  });
  return next;
}

export function computeResidualRisk(
  mechanisms: MechanismSelection[],
  tests: SelectedTest[],
  existing: ResidualRiskState["perMechanism"]
): ResidualRiskState["perMechanism"] {
  const next: ResidualRiskState["perMechanism"] = {};
  mechanisms.forEach((mechanism) => {
    const linked = tests.filter(
      (test) => test.status !== "remove" && test.mechanismIds.includes(mechanism.id)
    );
    let covered: "yes" | "partial" | "no" = "no";
    if (linked.length > 0) {
      const hasSubstantive = linked.some((test) => test.coverage === "high" || test.coverage === "medium");
      covered = hasSubstantive ? "yes" : "partial";
    }
    const residual = covered === "no" ? "high" : covered === "partial" ? "medium" : "low";
    next[mechanism.id] = {
      covered,
      residual,
      mitigations: existing[mechanism.id]?.mitigations || [],
    };
  });
  return next;
}

export function computeWarnings(
  mission: MissionProfile,
  tests: SelectedTest[]
): string[] {
  const warnings: string[] = [];
  tests.forEach((test) => {
    test.acceleration?.warnings?.forEach((warn) => warnings.push(`${test.name}: ${warn}`));
  });
  if (mission.thermalCycleFreq === "rare") {
    tests
      .filter((test) => test.name.toLowerCase().includes("thermal cycling") || test.name.toLowerCase().includes("power cycling"))
      .forEach((test) => warnings.push(`${test.name}: Mission profile shows rare cycling; confirm necessity.`));
  }
  return warnings;
}

export function computeConfidenceScore(
  missionComplete: boolean,
  mechanisms: MechanismSelection[],
  residual: ResidualRiskState["perMechanism"]
): number {
  let score = 50;
  if (missionComplete) score += 10;
  const selectedCount = mechanisms.filter((m) => m.selected).length;
  if (selectedCount >= 4) score += 10;
  const residualValues = Object.values(residual);
  if (residualValues.length) {
    const lowCount = residualValues.filter((entry) => entry.residual === "low").length;
    if (lowCount / residualValues.length >= 0.6) score += 10;
  }
  const assumedCount = mechanisms.filter((m) => m.confidence === "assumed").length;
  score -= assumedCount * 10;
  return clamp(score, 0, 100);
}

export function computeCoverageBreakdown(state: WizardState, tests: SelectedTest[]) {
  const rows: Array<{
    area: string;
    pointsEarned: number;
    pointsMax: number;
    status: "Good" | "Partial" | "Missing";
    missing: string[];
    stepIndexToFix: number;
  }> = [];

  const missionFields: Array<[string, boolean]> = [
    ["Temperature min", state.missionProfile.tempMinC !== null],
    ["Temperature max", state.missionProfile.tempMaxC !== null],
    ["Humidity %RH", state.missionProfile.humidityPct !== null || Boolean(state.missionProfile.humidity)],
    ["Vibration", Boolean(state.missionProfile.vibration)],
    ["Shock", Boolean(state.missionProfile.shock)],
    ["Active duty", state.missionProfile.activeDutyPct !== null],
  ];
  const missionComplete = missionFields.every(([, ready]) => ready);
  const missionMissing = missionFields.filter(([, ready]) => !ready).map(([label]) => label);
  const missionPointsMax = 20;
  const missionPointsEarned = missionComplete
    ? missionPointsMax
    : Math.round((missionPointsMax * (missionFields.length - missionMissing.length)) / missionFields.length);
  rows.push({
    area: "Mission Profile Completeness",
    pointsEarned: missionPointsEarned,
    pointsMax: missionPointsMax,
    status: missionComplete ? "Good" : missionPointsEarned > 0 ? "Partial" : "Missing",
    missing: missionMissing,
    stepIndexToFix: 2,
  });

  const selectedMechanisms = state.mechanisms.filter((mechanism) => mechanism.selected);
  const selectedMechanismCount = selectedMechanisms.length;
  const mechanismPointsMax = 25;
  const mechanismPointsEarned =
    selectedMechanismCount >= 6 ? mechanismPointsMax : selectedMechanismCount >= 4 ? 15 : selectedMechanismCount > 0 ? 5 : 0;
  rows.push({
    area: "Mechanism Coverage",
    pointsEarned: mechanismPointsEarned,
    pointsMax: mechanismPointsMax,
    status: mechanismPointsEarned === mechanismPointsMax ? "Good" : mechanismPointsEarned > 0 ? "Partial" : "Missing",
    missing: selectedMechanismCount >= 6 ? [] : ["Select at least 6 mechanisms"],
    stepIndexToFix: 3,
  });

  const failureModeEntries = Object.values(state.failureModes || {});
  const selectedFailureModes = failureModeEntries.filter((mode) => mode.selected);
  const failurePointsMax = 15;
  const failurePointsEarned =
    failureModeEntries.length === 0
      ? 0
      : selectedFailureModes.length >= 5
        ? failurePointsMax
        : selectedFailureModes.length >= 3
          ? 8
          : selectedFailureModes.length > 0
            ? 4
            : 0;
  rows.push({
    area: "Failure Mode Coverage",
    pointsEarned: failurePointsEarned,
    pointsMax: failurePointsMax,
    status: failurePointsEarned === failurePointsMax ? "Good" : failurePointsEarned > 0 ? "Partial" : "Missing",
    missing: failureModeEntries.length === 0 ? ["Not configured"] : selectedFailureModes.length >= 5 ? [] : ["Select 5+ failure modes"],
    stepIndexToFix: 3,
  });

  const keptTests = tests.filter((test) => test.status === "keep");
  const missingTests = selectedMechanisms
    .filter((mechanism) => !keptTests.some((test) => test.mechanismIds.includes(mechanism.id)))
    .map((mechanism) => mechanism.name);
  const mappingPointsMax = 20;
  let mappingPointsEarned = missingTests.length === 0 ? mappingPointsMax : missingTests.length <= 2 ? 10 : 0;
  const humidityRequired = (state.missionProfile.humidityPct ?? 0) >= 60;
  const humidityKept = keptTests.some((test) => isHumidityBasedTestId(test.id));
  if (humidityRequired && !humidityKept) {
    mappingPointsEarned = Math.max(0, mappingPointsEarned - 5);
    missingTests.push("Humidity test coverage");
  }
  rows.push({
    area: "Test-to-Mechanism Mapping",
    pointsEarned: mappingPointsEarned,
    pointsMax: mappingPointsMax,
    status: mappingPointsEarned === mappingPointsMax ? "Good" : mappingPointsEarned > 0 ? "Partial" : "Missing",
    missing: missingTests,
    stepIndexToFix: 5,
  });

  const warningTests = keptTests.filter((test) => test.acceleration?.warnings?.length);
  const hasBlockWarning = warningTests.some((test) =>
    test.acceleration.warnings.some((warning) => /block/i.test(warning))
  );
  const accelPointsMax = 10;
  const accelPointsEarned = hasBlockWarning ? 0 : warningTests.length ? 5 : accelPointsMax;
  rows.push({
    area: "Acceleration Validity & Assumptions",
    pointsEarned: accelPointsEarned,
    pointsMax: accelPointsMax,
    status: accelPointsEarned === accelPointsMax ? "Good" : accelPointsEarned > 0 ? "Partial" : "Missing",
    missing: warningTests.map((test) => test.name),
    stepIndexToFix: 7,
  });

  const residualPointsMax = 10;
  const residualEntries = selectedMechanisms.map((mechanism) => {
    const entry = state.residualRisk.perMechanism[mechanism.id];
    const needsMitigation = entry && (entry.residual === "medium" || entry.residual === "high");
    const hasMitigations = entry?.mitigations && entry.mitigations.length > 0;
    const complete = Boolean(entry) && (!needsMitigation || hasMitigations);
    return { mechanism, complete, needsMitigation, hasMitigations };
  });
  const residualCompleteCount = residualEntries.filter((entry) => entry.complete).length;
  const residualPointsEarned =
    residualEntries.length === 0
      ? 0
      : Math.round((residualPointsMax * residualCompleteCount) / residualEntries.length);
  rows.push({
    area: "Residual Risk Declared",
    pointsEarned: residualPointsEarned,
    pointsMax: residualPointsMax,
    status: residualPointsEarned === residualPointsMax ? "Good" : residualPointsEarned > 0 ? "Partial" : "Missing",
    missing: residualEntries
      .filter((entry) => !entry.complete)
      .map((entry) => entry.mechanism.name),
    stepIndexToFix: 9,
  });

  const totalScore = rows.reduce((sum, row) => sum + row.pointsEarned, 0);
  const fixList = rows
    .map((row) => ({
      title: row.missing.length ? `${row.area}: ${row.missing[0]}` : `${row.area}: Improve coverage`,
      pointsGainEstimate: row.pointsMax - row.pointsEarned,
      stepIndexToFix: row.stepIndexToFix,
    }))
    .filter((item) => item.pointsGainEstimate > 0)
    .sort((a, b) => b.pointsGainEstimate - a.pointsGainEstimate)
    .slice(0, 6);

  const tierOneTests = tests.filter((test) => test.status === "keep" && state.prioritization.testScores[test.id]?.tier === 1);
  const tierOneWithEvidence = tierOneTests.some((test) => (state.priorEvidence[test.id]?.nPrev ?? 0) > 0);
  if (tierOneTests.length > 0 && !tierOneWithEvidence) {
    fixList.unshift({
      title: "No prior evidence entered for Tier-1 tests (+5 coverage if added)",
      pointsGainEstimate: 5,
      stepIndexToFix: 6,
    });
  }
  const limitedFixList = fixList.slice(0, 6);

  return { totalScore, rows, fixList: limitedFixList };
}

export function computeScheduleStats(tasks: ScheduleTask[]) {
  let sequentialDays = 0;
  let currentDays = 0;
  const laneCounts: Record<string, number> = {};
  const laneFinish: Record<string, number> = {};

  tasks.forEach((task) => {
    sequentialDays += task.durationDays;
    const startDay = task.earliestStartDay ?? 0;
    const endDay = startDay + task.durationDays;
    currentDays = Math.max(currentDays, endDay, task.latestFinishDay ?? 0);
    laneCounts[task.resourceLane] = (laneCounts[task.resourceLane] || 0) + 1;
    laneFinish[task.resourceLane] = Math.max(laneFinish[task.resourceLane] || 0, endDay);
  });

  const criticalLane =
    Object.entries(laneFinish).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "--";
  const savingsPct =
    sequentialDays > 0 ? Math.max(0, Math.round(((sequentialDays - currentDays) / sequentialDays) * 100)) : 0;

  return { sequentialDays, currentDays, savingsPct, criticalLane, laneCounts };
}

const logFactorialCache: number[] = [0];
function logFactorial(n: number) {
  if (logFactorialCache[n] !== undefined) return logFactorialCache[n];
  let value = logFactorialCache[logFactorialCache.length - 1];
  for (let i = logFactorialCache.length; i <= n; i += 1) {
    value += Math.log(i);
    logFactorialCache[i] = value;
  }
  return logFactorialCache[n];
}

function logChoose(n: number, k: number) {
  if (k < 0 || k > n) return -Infinity;
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

function logSumExp(values: number[]) {
  const max = Math.max(...values);
  if (!Number.isFinite(max)) return -Infinity;
  const sum = values.reduce((acc, val) => acc + Math.exp(val - max), 0);
  return max + Math.log(sum);
}

export function computeRequiredSampleSize(
  targetReliability: number,
  confidence: number,
  allowedFailures: number,
  method: "binomial" | "weibull-basic" = "binomial"
) {
  const key = `${targetReliability}|${confidence}|${allowedFailures}|${method}`;
  const cached = sampleSizeCache.get(key);
  if (cached !== undefined) return cached;
  const pPass = clamp(targetReliability, 1e-6, 0.999999);
  const pFail = 1 - pPass;
  if (method === "weibull-basic") {
    const n = Math.max(1, Math.ceil(Math.log(1 - confidence) / Math.log(pPass)));
    sampleSizeCache.set(key, n);
    return n;
  }
  for (let n = Math.max(1, allowedFailures); n <= 5000; n += 1) {
    const terms: number[] = [];
    for (let i = 0; i <= allowedFailures; i += 1) {
      const logTerm = logChoose(n, i) + i * Math.log(pFail) + (n - i) * Math.log(pPass);
      terms.push(logTerm);
    }
    const acceptLog = logSumExp(terms);
    const acceptProb = Math.exp(acceptLog);
    if (acceptProb >= confidence) {
      sampleSizeCache.set(key, n);
      return n;
    }
  }
  sampleSizeCache.set(key, 5000);
  return 5000;
}

export function buildDvprRows(state: WizardState): DvprRow[] {
  const testMap = new Map(TESTS.map((test) => [test.id, test]));
  const priorMap = computePriorEvidenceMap(state.selectedTests, state.priorEvidence);
  return state.selectedTests
    .filter((test) => test.status === "keep")
    .map((test) => {
      const ref = testMap.get(test.id);
      const prior = priorMap[test.id];
      const mechanismName =
        MECHANISMS.find((mech) => mech.id === test.mechanismIds[0])?.name || "reliability risk";
      const conditionsParts = [
        test.stressProfile.tempLowC !== undefined && test.stressProfile.tempHighC !== undefined
          ? `Temp ${test.stressProfile.tempLowC}-${test.stressProfile.tempHighC}C`
          : undefined,
        test.stressProfile.humidityPct !== undefined ? `RH ${test.stressProfile.humidityPct}%` : undefined,
        test.stressProfile.vibLevel && test.stressProfile.vibLevel !== "none" ? `Vibration ${test.stressProfile.vibLevel}` : undefined,
        test.stressProfile.shockLevel && test.stressProfile.shockLevel !== "none" ? `Shock ${test.stressProfile.shockLevel}` : undefined,
      ].filter(Boolean);
      return {
        id: `dvpr-${test.id}`,
        requirement: `Demonstrate robustness against ${mechanismName}`,
        validationMethod: "Test",
        testId: test.id,
        specRefs: ref?.references?.map((item) => ({ standard: item.standard, clause: item.clause })) ?? [],
        conditions: conditionsParts.join("; ") || "Per test definition",
        sampleSize: test.sampleSizeOverride ?? state.reliabilityPlan.requiredSampleSize,
        duration: {
          value: Math.max(1, Math.round(test.durationWeeks)),
          unit: "weeks",
        },
        risk: {
          priorMean: prior.meanFailProb,
          priorUpper95: prior.upperFailProb95,
          priorN: prior.nPrev ?? undefined,
          priorF: prior.fPrev ?? undefined,
          similarityPct: prior.similarityPct,
          badge: prior.badge,
        },
        acceptanceCriteria: "No functional failures; parameters within specification.",
        owner: "Reliability / Lab",
        phase: "DV",
      };
    });
}

function getResourceLaneForTest(
  testId: string,
  definition: (typeof TESTS)[number] | undefined,
  state: WizardState
): ScheduleTask["resourceLane"] {
  const id = testId;
  if (["temp-cycling", "power-cycling", "high-temp-storage", "low-temp-storage"].includes(id)) {
    return "Thermal";
  }
  if (["damp-heat", "temp-humidity-constant", "temp-humidity-cycling", "water-ingress"].includes(id)) {
    return "Humidity";
  }
  if (["random-vibration", "mechanical-shock"].includes(id)) {
    return "Vibration";
  }
  if (["mating-cycles", "retention-force"].includes(id)) {
    return "Mechanical";
  }
  if (["mfg", "chemical-resistance", "salt-spray"].includes(id)) {
    return "Chemical";
  }

  if (id === "water-ingress") {
    return state.missionProfile.chemicalExposure === "salt" || state.missionProfile.chemicalExposure === "mixed"
      ? "Chemical"
      : "Humidity";
  }

  const stressors = definition?.stressorIds ?? [];
  if (stressors.includes("chemical")) return "Chemical";
  if (stressors.includes("humidity") && stressors.includes("temperature")) return "Humidity";
  if (stressors.includes("vibration") || stressors.includes("shock")) return "Vibration";
  if (stressors.includes("contact-motion") || stressors.includes("particles-dust")) return "Mechanical";
  if (stressors.includes("temperature") || stressors.includes("deltaT")) return "Thermal";
  return "Mechanical";
}

export function buildSchedule(state: WizardState): ScheduleTask[] {
  const tasks: ScheduleTask[] = [];
  const testMap = new Map(TESTS.map((test) => [test.id, test]));
  const dvprByTestId = new Map(
    state.dvpr.rows
      .filter((row) => row.testId)
      .map((row) => [row.testId as string, row])
  );
  state.selectedTests
    .filter((test) => test.status === "keep")
    .forEach((test) => {
      const definition = testMap.get(test.id);
      const dvpr = dvprByTestId.get(test.id);
      const duration = dvpr?.duration ?? { value: Math.max(1, Math.round(test.durationWeeks)), unit: "weeks" as const };
      const durationDays = duration.unit === "weeks" ? duration.value * 7 : duration.value;
      const resourceLane = getResourceLaneForTest(test.id, definition, state);
      tasks.push({
        id: `task-${test.id}`,
        testId: test.id,
        name: test.name,
        durationDays: Math.max(1, Math.round(durationDays)),
        dependsOnTaskIds: [],
        resourceLane,
      });
    });

  if (state.schedule.strategy === "sequential") {
    tasks.forEach((task, index) => {
      if (index > 0) task.dependsOnTaskIds = [tasks[index - 1].id];
    });
  } else if (state.schedule.strategy === "parallel-by-stressor") {
    const laneMap = new Map<string, string>();
    tasks.forEach((task) => {
      const prior = laneMap.get(task.resourceLane);
      if (prior) task.dependsOnTaskIds = [prior];
      laneMap.set(task.resourceLane, task.id);
    });
  }

  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const scheduleStart = state.schedule.startDateISO
    ? new Date(`${state.schedule.startDateISO}T00:00:00`)
    : null;
  const adjustStartDay = (day: number) => {
    if (!scheduleStart) return day;
    const date = new Date(scheduleStart);
    date.setDate(date.getDate() + day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 6) return day + 2;
    if (dayOfWeek === 0) return day + 1;
    return day;
  };
  tasks.forEach((task) => {
    const starts = task.dependsOnTaskIds.map((id) => taskById.get(id)?.latestFinishDay ?? 0);
    const baseStart = starts.length ? Math.max(0, ...starts) : 0;
    const start = adjustStartDay(baseStart);
    task.earliestStartDay = start;
    task.latestFinishDay = start + task.durationDays;
  });

  return tasks;
}
