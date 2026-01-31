import type { MissionState } from "./types";

export type MissionThermalCyclePoint = {
  t_min: number;
  temp_C: number;
};

export type MissionThermalCycleSegment = {
  stateId: string;
  stateName: string;
  fieldPercent: number;
  cycleMinutes: number;
  temp_C: number;
};

export type MissionThermalCycle = {
  points: MissionThermalCyclePoint[];
  cycleMinutes: number;
  repeats: number;
  segments: MissionThermalCycleSegment[];
};

function representativeTemp(state: MissionState): number {
  if (state.thermal.kind === "Steady") return state.thermal.T_C;
  return (state.thermal.Tmin_C + state.thermal.Tmax_C) / 2;
}

export function buildMissionRepresentativeThermalCycle(
  states: MissionState[],
  t_test_h: number,
  minCycles = 3,
  minSegmentMin = 1
): MissionThermalCycle {
  const validStates = states.filter((state) => (Number(state.duration_h) || 0) > 0);
  const totalHours = validStates.reduce((sum, state) => sum + (Number(state.duration_h) || 0), 0);

  if (totalHours <= 0 || !Number.isFinite(t_test_h) || t_test_h <= 0) {
    return { points: [], cycleMinutes: 0, repeats: 0, segments: [] };
  }

  const safeMinCycles = Math.max(1, Math.floor(minCycles));
  const t_cycle_h = t_test_h / safeMinCycles;
  const cycleMinutes = t_cycle_h * 60;
  const repeats = Math.max(1, Math.floor(t_test_h / t_cycle_h + 1e-6));

  const rawMinutes = validStates.map((state) => (Number(state.duration_h) / totalHours) * cycleMinutes);
  const segmentMinutes: number[] = [];

  if (minSegmentMin > 0) {
    const clamped = validStates.map((_, index) => rawMinutes[index] > 0 && rawMinutes[index] < minSegmentMin);
    const clampedSum = clamped.reduce((sum, isClamped) => sum + (isClamped ? minSegmentMin : 0), 0);
    const remainingTotal = cycleMinutes - clampedSum;

    if (remainingTotal <= 0) {
      const count = validStates.length;
      const even = count > 0 ? cycleMinutes / count : 0;
      validStates.forEach(() => segmentMinutes.push(even));
    } else {
      const freeSum = rawMinutes.reduce(
        (sum, value, index) => sum + (clamped[index] ? 0 : value),
        0
      );
      validStates.forEach((_, index) => {
        if (clamped[index]) {
          segmentMinutes.push(minSegmentMin);
        } else if (freeSum > 0) {
          segmentMinutes.push((rawMinutes[index] / freeSum) * remainingTotal);
        } else {
          segmentMinutes.push(remainingTotal / Math.max(1, validStates.length));
        }
      });
    }
  } else {
    rawMinutes.forEach((value) => segmentMinutes.push(value));
  }

  const totalMinutes = segmentMinutes.reduce((sum, value) => sum + value, 0);
  const diff = cycleMinutes - totalMinutes;
  if (Math.abs(diff) > 1e-6 && segmentMinutes.length > 0) {
    segmentMinutes[segmentMinutes.length - 1] += diff;
  }

  const segments: MissionThermalCycleSegment[] = validStates.map((state, index) => {
    const fieldPercent = (Number(state.duration_h) / totalHours) * 100;
    return {
      stateId: state.id,
      stateName: state.name,
      fieldPercent,
      cycleMinutes: Math.max(0, segmentMinutes[index]),
      temp_C: representativeTemp(state),
    };
  });

  const points: MissionThermalCyclePoint[] = [];
  let t = 0;
  segments.forEach((segment) => {
    points.push({ t_min: t, temp_C: segment.temp_C });
    t += segment.cycleMinutes;
    points.push({ t_min: t, temp_C: segment.temp_C });
  });

  return { points, cycleMinutes, repeats, segments };
}
