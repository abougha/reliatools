import type { AccelSettings, MissionProfile, PsdPoint } from "./types";
import { integratePsd, grms, resolvePsdDefinition, scalePsd } from "./psd";
import { buildBands } from "./banding";
import type { PsdTemplate } from "./types";

export type EquivalencyResult = {
  baseStateId?: string;
  basePsd: PsdPoint[];
  testPsd: PsdPoint[];
  k_scale: number;
  t_test_h: number;
  energyField: number;
  energyTest: number;
  damageField: number;
  damageTest: number;
  damageRatio: number;
  energyRatio: number;
  cappedByEnergy: boolean;
  cappedByGrms: boolean;
  notes: string[];
};

type StateContribution = {
  id: string;
  energyPerHour: number;
  damagePerHour: number;
  totalEnergy: number;
  totalDamage: number;
};

function damageProxy(points: PsdPoint[]): number {
  const bands = buildBands(points, 12);
  return bands.reduce((sum, band) => sum + band.score, 0);
}

function collectStateContributions(
  profile: MissionProfile,
  templates: Record<string, PsdTemplate>
): StateContribution[] {
  return profile.states.map((state) => {
    const points = resolvePsdDefinition(state.psd, templates);
    const energyPerHour = integratePsd(points);
    const damagePerHour = damageProxy(points);
    return {
      id: state.id,
      energyPerHour,
      damagePerHour,
      totalEnergy: energyPerHour * state.duration_h,
      totalDamage: damagePerHour * state.duration_h,
    };
  });
}

function pickBaseStateId(
  profile: MissionProfile,
  accel: AccelSettings,
  contributions: StateContribution[]
): string | undefined {
  if (accel.basePsdSource === "UserSelectedState" && accel.selectedStateId) {
    return accel.selectedStateId;
  }
  const dominant = [...contributions].sort((a, b) => b.totalDamage - a.totalDamage)[0];
  return dominant?.id ?? profile.states[0]?.id;
}

export function solveEquivalency(
  profile: MissionProfile,
  accel: AccelSettings,
  templates: Record<string, PsdTemplate>
): EquivalencyResult {
  const contributions = collectStateContributions(profile, templates);
  const baseStateId = pickBaseStateId(profile, accel, contributions);
  const baseState = profile.states.find((s) => s.id === baseStateId) ?? profile.states[0];
  const basePsd = baseState ? resolvePsdDefinition(baseState.psd, templates) : [];
  const energyField = contributions.reduce((sum, c) => sum + c.totalEnergy, 0);
  const damageField = contributions.reduce((sum, c) => sum + c.totalDamage, 0);

  const baseEnergy = integratePsd(basePsd);
  const baseDamage = damageProxy(basePsd);
  let k = accel.k_scale_default || 1;
  let t = accel.t_test_h_default || 168;

  if (accel.method === "Energy") {
    if (accel.solveFor === "t_test") {
      t = baseEnergy > 0 ? energyField / (k * baseEnergy) : t;
    } else if (accel.solveFor === "k_scale") {
      k = baseEnergy > 0 ? energyField / (baseEnergy * t) : k;
    } else {
      const targetProduct = baseEnergy > 0 ? energyField / baseEnergy : k * t;
      const ratio = targetProduct / (k * t);
      const factor = Math.sqrt(Math.max(ratio, 0));
      k *= factor;
      t *= factor;
    }
  } else {
    if (accel.solveFor === "t_test") {
      t = baseDamage > 0 ? damageField / (k * baseDamage) : t;
    } else if (accel.solveFor === "k_scale") {
      k = baseDamage > 0 ? damageField / (baseDamage * t) : k;
    } else {
      const targetProduct = baseDamage > 0 ? damageField / baseDamage : k * t;
      const ratio = targetProduct / (k * t);
      const factor = Math.sqrt(Math.max(ratio, 0));
      k *= factor;
      t *= factor;
    }
  }

  const notes: string[] = [];
  let cappedByGrms = false;
  let cappedByEnergy = false;

  if (accel.max_grms && basePsd.length > 0) {
    const baseGrms = grms(basePsd);
    if (baseGrms > 0) {
      const kMax = Math.pow(accel.max_grms / baseGrms, 2);
      if (k > kMax) {
        k = kMax;
        cappedByGrms = true;
        notes.push("k scaled down to honor max g-rms.");
        if (accel.solveFor !== "k_scale" && baseDamage > 0) {
          t = damageField / (k * baseDamage);
        }
      }
    }
  }

  if (accel.method === "Hybrid" && baseEnergy > 0 && energyField > 0) {
    const maxEnergy = accel.gamma_energyCap * energyField;
    const testEnergy = k * baseEnergy * t;
    if (testEnergy > maxEnergy) {
      const ratio = maxEnergy / testEnergy;
      if (accel.solveFor === "t_test") {
        t *= ratio;
      } else if (accel.solveFor === "k_scale") {
        k *= ratio;
      } else {
        const factor = Math.sqrt(Math.max(ratio, 0));
        k *= factor;
        t *= factor;
      }
      cappedByEnergy = true;
      notes.push("Energy cap applied to keep test energy conservative.");
    }
  }

  const testPsd = scalePsd(basePsd, k);
  const energyTest = integratePsd(testPsd) * t;
  const damageTest = damageProxy(testPsd) * t;

  return {
    baseStateId,
    basePsd,
    testPsd,
    k_scale: k,
    t_test_h: t,
    energyField,
    energyTest,
    damageField,
    damageTest,
    damageRatio: damageField > 0 ? damageTest / damageField : 0,
    energyRatio: energyField > 0 ? energyTest / energyField : 0,
    cappedByEnergy,
    cappedByGrms,
    notes,
  };
}
