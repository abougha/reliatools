import type { DutyCycleExportPayload } from "@/lib/haltHass/types";
import type {
  BuildProfileResult,
  ChartPoint,
  CsvRow,
  DetectionConfig,
  DetectionSignal,
  FailureEvent,
  GenericLaneProfile,
  LaneKey,
  LaneStepConfig,
  NumericInput,
  VibrationProfile,
  WizardState,
} from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function createId(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function parseNumericInput(raw: string): NumericInput {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : "";
}

export function numberOrNull(value: NumericInput | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function formatMaybeNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "";
  return value.toFixed(3).replace(/\.?0+$/, "");
}

function createDefaultLaneStep(overrides?: Partial<LaneStepConfig>): LaneStepConfig {
  return {
    start: "",
    step: "",
    dwellMin: "",
    steps: 5,
    maxLimit: "",
    rampRate: "",
    stopOnFirstFail: true,
    continueAfterFail: false,
    ...overrides,
  };
}

export function createDefaultSignal(): DetectionSignal {
  return {
    id: createId("sig"),
    name: "Supply current",
    units: "mA",
    thresholdType: ">",
    thresholdValue: 120,
  };
}

export function createDefaultEvent(): FailureEvent {
  return {
    id: createId("event"),
    lane: "temp",
    timeMin: "",
    type: "hard",
    note: "",
  };
}

export function createInitialWizardState(): WizardState {
  return {
    entryMode: "detection",
    detection: {
      failureTypes: { hard: true, parametric: true, intermittent: false },
      signals: [createDefaultSignal()],
      sampleIntervalSec: 1,
      logDurationMin: 30,
    },
    haltStyle: "classical",
    lanesEnabled: {
      temp: true,
      vib: true,
      humidity: false,
      voltage: false,
      power: false,
    },
    profile: {
      temperature: {
        cold: createDefaultLaneStep({ start: 25, step: 10, dwellMin: 20, maxLimit: -40 }),
        hot: createDefaultLaneStep({ start: 25, step: 10, dwellMin: 20, maxLimit: 125 }),
        rtc: {
          enabled: false,
          tMin: -40,
          tMax: 85,
          cycles: 10,
          dwellPerExtremeMin: 10,
          rampRate: 10,
        },
        combinedPhaseEnabled: true,
        combined: {
          steps: 6,
          dwellMin: 15,
        },
      },
      vibration: {
        ...createDefaultLaneStep({ start: 5, step: 5, dwellMin: 15, maxLimit: 25 }),
        tickleGrms: 0.5,
      },
      humidity: createDefaultLaneStep({ start: 60, step: 5, dwellMin: 20, maxLimit: 95 }),
      voltage: createDefaultLaneStep({ start: 12, step: 1, dwellMin: 15, maxLimit: 18 }),
      power: createDefaultLaneStep({ start: 20, step: 5, dwellMin: 10, maxLimit: 60 }),
    },
    events: [],
  };
}

export function getDetectionRobustnessScore(detection: DetectionConfig): number {
  const signalCount = detection.signals.filter((signal) => signal.name.trim().length > 0).length;
  const hasWindowOrBand = detection.signals.some(
    (signal) => signal.thresholdType === "window" || signal.thresholdType === "±"
  );
  const sampleIntervalSec = numberOrNull(detection.sampleIntervalSec);
  const logDurationMin = numberOrNull(detection.logDurationMin);

  let score = 20;
  score += Math.min(signalCount * 12, 36);
  if (detection.failureTypes.intermittent) score += 12;
  if (detection.failureTypes.parametric) score += 10;
  if (hasWindowOrBand) score += 8;
  if (sampleIntervalSec !== null && sampleIntervalSec <= 1) score += 12;
  else if (sampleIntervalSec !== null && sampleIntervalSec <= 10) score += 6;
  if (logDurationMin !== null && logDurationMin >= 30) score += 6;
  if (detection.signals.some((signal) => numberOrNull(signal.thresholdValue) !== null)) score += 6;

  return clamp(Math.round(score), 0, 100);
}

export function getScoreTone(score: number): "red" | "amber" | "green" {
  if (score < 40) return "red";
  if (score <= 70) return "amber";
  return "green";
}

function resolveStepCount(
  start: number,
  step: number,
  explicitSteps: NumericInput,
  maxLimit: NumericInput,
  direction: 1 | -1
): number {
  const max = numberOrNull(maxLimit);
  if (max !== null && step > 0) {
    const travel = direction === 1 ? max - start : start - max;
    if (travel < 0) return 1;
    return Math.max(1, Math.floor(travel / step) + 1);
  }
  const fromSteps = numberOrNull(explicitSteps);
  if (fromSteps === null) return 1;
  return Math.max(1, Math.floor(fromSteps));
}

function valueForStep(
  start: number,
  step: number,
  stepIndex: number,
  maxLimit: NumericInput,
  direction: 1 | -1
): number {
  const raw = start + direction * step * stepIndex;
  const max = numberOrNull(maxLimit);
  if (max === null) return raw;
  return direction === 1 ? Math.min(raw, max) : Math.max(raw, max);
}

function validateCommonLane(
  laneLabel: string,
  laneConfig: LaneStepConfig,
  errors: string[],
  opts?: { allowDescendingMax?: boolean }
) {
  const start = numberOrNull(laneConfig.start);
  const step = numberOrNull(laneConfig.step);
  const dwell = numberOrNull(laneConfig.dwellMin);
  const steps = numberOrNull(laneConfig.steps);
  const max = numberOrNull(laneConfig.maxLimit);
  const rampRate = numberOrNull(laneConfig.rampRate);
  const allowDescendingMax = opts?.allowDescendingMax ?? false;

  if (start === null) errors.push(`${laneLabel}: start level is required.`);
  if (step === null || step <= 0) errors.push(`${laneLabel}: step size must be > 0.`);
  if (dwell === null || dwell <= 0) errors.push(`${laneLabel}: dwell time must be > 0.`);
  if ((steps === null || steps <= 0) && max === null) {
    errors.push(`${laneLabel}: set number of steps or max limit.`);
  }
  if (!allowDescendingMax && start !== null && max !== null && max < start) {
    errors.push(`${laneLabel}: max limit must be >= start.`);
  }
  if (rampRate !== null && rampRate <= 0) errors.push(`${laneLabel}: ramp rate must be > 0 when provided.`);
}

export function validateWizardState(state: WizardState): string[] {
  const errors: string[] = [];
  validateCommonLane("Temperature cold phase", state.profile.temperature.cold, errors, { allowDescendingMax: true });
  validateCommonLane("Temperature hot phase", state.profile.temperature.hot, errors);

  if (state.lanesEnabled.vib) validateCommonLane("Vibration lane", state.profile.vibration, errors);
  if (state.lanesEnabled.humidity) validateCommonLane("Humidity lane", state.profile.humidity, errors);
  if (state.lanesEnabled.voltage) validateCommonLane("Voltage lane", state.profile.voltage, errors);
  if (state.lanesEnabled.power) validateCommonLane("Power cycling lane", state.profile.power, errors);

  if (state.profile.temperature.rtc.enabled) {
    const rtc = state.profile.temperature.rtc;
    const tMin = numberOrNull(rtc.tMin);
    const tMax = numberOrNull(rtc.tMax);
    const cycles = numberOrNull(rtc.cycles);
    const dwell = numberOrNull(rtc.dwellPerExtremeMin);
    const ramp = numberOrNull(rtc.rampRate);
    if (tMin === null || tMax === null) errors.push("RTC: Tmin and Tmax are required.");
    if (tMin !== null && tMax !== null && tMax <= tMin) errors.push("RTC: Tmax must be greater than Tmin.");
    if (cycles === null || cycles <= 0) errors.push("RTC: cycles must be > 0.");
    if (dwell === null || dwell <= 0) errors.push("RTC: dwell per extreme must be > 0.");
    if (ramp !== null && ramp <= 0) errors.push("RTC: ramp rate must be > 0 when provided.");
  }

  for (const event of state.events) {
    const time = numberOrNull(event.timeMin);
    if (time === null || time < 0) {
      errors.push("Failure events must have a valid non-negative time.");
      break;
    }
  }

  return errors;
}

function powerStateFromValue(value: number | null): string {
  if (value === null) return "";
  if (value <= 0) return "OFF";
  return `${formatMaybeNumber(value)} cycles/day`;
}

type PartialPoint = Omit<ChartPoint, "timeMin" | "phase">;

function emptyPoint(): PartialPoint {
  return {
    temp_C: null,
    vib_Grms: null,
    humidity_RH: null,
    voltage_V: null,
    power_Level: null,
    powerState: "",
  };
}

function laneValue(
  laneConfig: GenericLaneProfile | VibrationProfile,
  stepIndex: number,
  direction: 1 | -1,
  minFloor?: number
): number | null {
  const start = numberOrNull(laneConfig.start);
  const step = numberOrNull(laneConfig.step);
  if (start === null || step === null || step <= 0) return null;
  const value = valueForStep(start, step, stepIndex, laneConfig.maxLimit, direction);
  if (typeof minFloor === "number") return Math.max(value, minFloor);
  return value;
}

export function buildProfileTimeSeries(state: WizardState): BuildProfileResult {
  const validationErrors = validateWizardState(state);
  const chartData: ChartPoint[] = [];
  let currentTime = 0;

  const pushPoint = (phase: string, partial: PartialPoint) => {
    const point: ChartPoint = {
      timeMin: round(currentTime, 3),
      phase,
      ...emptyPoint(),
      ...partial,
    };
    const prev = chartData[chartData.length - 1];
    if (prev && prev.timeMin === point.timeMin && prev.phase === point.phase) {
      chartData[chartData.length - 1] = point;
      return;
    }
    chartData.push(point);
  };

  const addStepPhase = (
    phase: string,
    lane: LaneKey,
    laneConfig: GenericLaneProfile | VibrationProfile,
    direction: 1 | -1,
    minFloor?: number
  ) => {
    const start = numberOrNull(laneConfig.start);
    const step = numberOrNull(laneConfig.step);
    const dwell = numberOrNull(laneConfig.dwellMin);
    if (start === null || step === null || step <= 0 || dwell === null || dwell <= 0) return;

    const stepCount = resolveStepCount(start, step, laneConfig.steps, laneConfig.maxLimit, direction);
    const rampRate = numberOrNull(laneConfig.rampRate);

    for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
      const value = laneValue(laneConfig, stepIndex, direction, minFloor);
      const partial = emptyPoint();
      if (lane === "temp") partial.temp_C = value;
      if (lane === "vib") partial.vib_Grms = value;
      if (lane === "humidity") partial.humidity_RH = value;
      if (lane === "voltage") partial.voltage_V = value;
      if (lane === "power") {
        partial.power_Level = value;
        partial.powerState = powerStateFromValue(value);
      }

      pushPoint(phase, partial);
      currentTime += dwell;
      pushPoint(phase, partial);

      if (stepIndex < stepCount - 1 && rampRate !== null && rampRate > 0) {
        currentTime += Math.abs(step / rampRate);
      }
    }
  };

  const addRtcPhase = () => {
    const rtc = state.profile.temperature.rtc;
    if (!rtc.enabled) return;

    const tMin = numberOrNull(rtc.tMin);
    const tMax = numberOrNull(rtc.tMax);
    const cycles = numberOrNull(rtc.cycles);
    const dwell = numberOrNull(rtc.dwellPerExtremeMin);
    const ramp = numberOrNull(rtc.rampRate);
    if (tMin === null || tMax === null || cycles === null || dwell === null) return;

    for (let cycle = 0; cycle < Math.floor(cycles); cycle += 1) {
      pushPoint(`RTC Low ${cycle + 1}`, { ...emptyPoint(), temp_C: tMin });
      currentTime += dwell;
      pushPoint(`RTC Low ${cycle + 1}`, { ...emptyPoint(), temp_C: tMin });
      if (ramp !== null && ramp > 0) currentTime += Math.abs((tMax - tMin) / ramp);

      pushPoint(`RTC High ${cycle + 1}`, { ...emptyPoint(), temp_C: tMax });
      currentTime += dwell;
      pushPoint(`RTC High ${cycle + 1}`, { ...emptyPoint(), temp_C: tMax });
      if (ramp !== null && ramp > 0) currentTime += Math.abs((tMax - tMin) / ramp);
    }
  };

  const addCombinedPhase = (phase: string) => {
    const dwell = numberOrNull(state.profile.temperature.combined.dwellMin) ?? 15;
    const combinedStepsFromUser = numberOrNull(state.profile.temperature.combined.steps);

    const enabledLaneStepCounts: number[] = [];
    if (state.lanesEnabled.temp) {
      const hot = state.profile.temperature.hot;
      const hotStart = numberOrNull(hot.start);
      const hotStep = numberOrNull(hot.step);
      if (hotStart !== null && hotStep !== null && hotStep > 0) {
        enabledLaneStepCounts.push(resolveStepCount(hotStart, hotStep, hot.steps, hot.maxLimit, 1));
      }
    }
    if (state.lanesEnabled.vib) {
      const vib = state.profile.vibration;
      const vibStart = numberOrNull(vib.start);
      const vibStep = numberOrNull(vib.step);
      if (vibStart !== null && vibStep !== null && vibStep > 0) {
        enabledLaneStepCounts.push(resolveStepCount(vibStart, vibStep, vib.steps, vib.maxLimit, 1));
      }
    }
    if (state.lanesEnabled.humidity) {
      const humidity = state.profile.humidity;
      const humidityStart = numberOrNull(humidity.start);
      const humidityStep = numberOrNull(humidity.step);
      if (humidityStart !== null && humidityStep !== null && humidityStep > 0) {
        enabledLaneStepCounts.push(resolveStepCount(humidityStart, humidityStep, humidity.steps, humidity.maxLimit, 1));
      }
    }
    if (state.lanesEnabled.voltage) {
      const voltage = state.profile.voltage;
      const voltageStart = numberOrNull(voltage.start);
      const voltageStep = numberOrNull(voltage.step);
      if (voltageStart !== null && voltageStep !== null && voltageStep > 0) {
        enabledLaneStepCounts.push(resolveStepCount(voltageStart, voltageStep, voltage.steps, voltage.maxLimit, 1));
      }
    }
    if (state.lanesEnabled.power) {
      const power = state.profile.power;
      const powerStart = numberOrNull(power.start);
      const powerStep = numberOrNull(power.step);
      if (powerStart !== null && powerStep !== null && powerStep > 0) {
        enabledLaneStepCounts.push(resolveStepCount(powerStart, powerStep, power.steps, power.maxLimit, 1));
      }
    }

    const stepCount =
      combinedStepsFromUser !== null && combinedStepsFromUser > 0
        ? Math.floor(combinedStepsFromUser)
        : enabledLaneStepCounts.length > 0
          ? Math.max(...enabledLaneStepCounts)
          : 1;

    for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
      const partial = emptyPoint();
      if (state.lanesEnabled.temp) {
        partial.temp_C = laneValue(state.profile.temperature.hot, stepIndex, 1);
      }
      if (state.lanesEnabled.vib) {
        const tickle = numberOrNull(state.profile.vibration.tickleGrms) ?? 0;
        partial.vib_Grms = laneValue(state.profile.vibration, stepIndex, 1, tickle);
      }
      if (state.lanesEnabled.humidity) partial.humidity_RH = laneValue(state.profile.humidity, stepIndex, 1);
      if (state.lanesEnabled.voltage) partial.voltage_V = laneValue(state.profile.voltage, stepIndex, 1);
      if (state.lanesEnabled.power) {
        partial.power_Level = laneValue(state.profile.power, stepIndex, 1);
        partial.powerState = powerStateFromValue(partial.power_Level);
      }

      pushPoint(phase, partial);
      currentTime += dwell;
      pushPoint(phase, partial);
    }
  };

  if (validationErrors.length === 0) {
    if (state.haltStyle === "classical") {
      addStepPhase("Temp Cold Steps", "temp", state.profile.temperature.cold, -1);
      addStepPhase("Temp Hot Steps", "temp", state.profile.temperature.hot, 1);
      addRtcPhase();

      if (state.lanesEnabled.vib) {
        const tickle = numberOrNull(state.profile.vibration.tickleGrms) ?? 0;
        addStepPhase("Vibration Steps", "vib", state.profile.vibration, 1, tickle);
      }
      if (state.lanesEnabled.humidity) addStepPhase("Humidity Steps", "humidity", state.profile.humidity, 1);
      if (state.lanesEnabled.voltage) addStepPhase("Voltage Steps", "voltage", state.profile.voltage, 1);
      if (state.lanesEnabled.power) addStepPhase("Power Cycling Steps", "power", state.profile.power, 1);
      if (state.profile.temperature.combinedPhaseEnabled) addCombinedPhase("Combined Escalation");
    } else {
      addCombinedPhase("Rapid Combined Escalation");
    }
  }

  const csvRows: CsvRow[] = chartData.map((row) => ({
    time_min: row.timeMin,
    phase: row.phase,
    temp_C: formatMaybeNumber(row.temp_C),
    vib_Grms: formatMaybeNumber(row.vib_Grms),
    humidity_RH: formatMaybeNumber(row.humidity_RH),
    voltage_V: formatMaybeNumber(row.voltage_V),
    powerState: row.powerState,
  }));

  const laneRanges: BuildProfileResult["summary"]["ranges"] = {};
  const collectRange = (lane: LaneKey, accessor: (point: ChartPoint) => number | null) => {
    const values = chartData.map(accessor).filter((value): value is number => value !== null && Number.isFinite(value));
    if (values.length === 0) return;
    laneRanges[lane] = { min: Math.min(...values), max: Math.max(...values) };
  };

  collectRange("temp", (point) => point.temp_C);
  collectRange("vib", (point) => point.vib_Grms);
  collectRange("humidity", (point) => point.humidity_RH);
  collectRange("voltage", (point) => point.voltage_V);
  collectRange("power", (point) => point.power_Level);

  const firstFailure = state.events
    .map((event) => {
      const time = numberOrNull(event.timeMin);
      if (time === null || time < 0) return null;
      return {
        timeMin: time,
        lane: event.lane,
        type: event.type,
        note: event.note.trim(),
      };
    })
    .filter((event): event is NonNullable<typeof event> => event !== null)
    .sort((a, b) => a.timeMin - b.timeMin)[0];

  return {
    chartData,
    csvRows,
    validationErrors,
    summary: {
      totalDurationMin: chartData.length > 0 ? chartData[chartData.length - 1].timeMin : 0,
      ranges: laneRanges,
      firstFailure,
    },
  };
}

export function buildCsvContent(rows: CsvRow[]): string {
  const header = ["time_min", "phase", "temp_C", "vib_Grms", "humidity_RH", "voltage_V", "powerState"];
  const lines = rows.map((row) =>
    [row.time_min, row.phase, row.temp_C, row.vib_Grms, row.humidity_RH, row.voltage_V, row.powerState]
      .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function parseDutyCyclePayload(raw: string | null): DutyCycleExportPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DutyCycleExportPayload;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function applyDutyCycleImport(state: WizardState, payload: DutyCycleExportPayload): WizardState {
  const next = structuredClone(state);
  next.entryMode = "dutyCycle";
  next.haltStyle = "rapid";
  next.dutyCycleImport = payload;

  const tempUseMin = typeof payload.tempUseMinC === "number" && Number.isFinite(payload.tempUseMinC) ? payload.tempUseMinC : null;
  const tempUseMax = typeof payload.tempUseMaxC === "number" && Number.isFinite(payload.tempUseMaxC) ? payload.tempUseMaxC : null;
  const vibUse = typeof payload.vibUseGrms === "number" && Number.isFinite(payload.vibUseGrms) ? payload.vibUseGrms : null;
  const humidityUse =
    typeof payload.humidityUseRH === "number" && Number.isFinite(payload.humidityUseRH) ? payload.humidityUseRH : null;
  const voltageMin =
    typeof payload.voltageUseMin === "number" && Number.isFinite(payload.voltageUseMin) ? payload.voltageUseMin : null;
  const voltageMax =
    typeof payload.voltageUseMax === "number" && Number.isFinite(payload.voltageUseMax) ? payload.voltageUseMax : null;
  const powerCycles =
    typeof payload.powerCyclesPerDay === "number" && Number.isFinite(payload.powerCyclesPerDay)
      ? payload.powerCyclesPerDay
      : null;

  next.lanesEnabled.temp = true;
  next.lanesEnabled.vib = vibUse !== null && vibUse > 0;
  next.lanesEnabled.humidity = humidityUse !== null && humidityUse > 0;
  next.lanesEnabled.voltage = voltageMin !== null || voltageMax !== null;
  next.lanesEnabled.power = powerCycles !== null && powerCycles > 0;

  if (tempUseMin !== null && tempUseMax !== null && tempUseMax >= tempUseMin) {
    const coldStart = clamp(25, tempUseMin, tempUseMax);
    next.profile.temperature.cold.start = round(coldStart, 2);
    next.profile.temperature.cold.step = 10;
    next.profile.temperature.cold.dwellMin = 20;
    next.profile.temperature.cold.steps = "";
    next.profile.temperature.cold.maxLimit = round(tempUseMin - 30, 2);

    next.profile.temperature.hot.start = round(tempUseMax, 2);
    next.profile.temperature.hot.step = 10;
    next.profile.temperature.hot.dwellMin = 20;
    next.profile.temperature.hot.steps = "";
    next.profile.temperature.hot.maxLimit = round(tempUseMax + 55, 2);
  }

  if (vibUse !== null) {
    next.profile.vibration.start = 5;
    next.profile.vibration.step = 5;
    next.profile.vibration.dwellMin = 15;
    next.profile.vibration.steps = "";
    next.profile.vibration.maxLimit = round(Math.max(20, vibUse * 3), 2);
    next.profile.vibration.tickleGrms = round(Math.max(0.5, vibUse * 0.2), 2);
  }

  if (humidityUse !== null) {
    next.profile.humidity.start = round(Math.max(40, humidityUse), 2);
    next.profile.humidity.step = 5;
    next.profile.humidity.dwellMin = 20;
    next.profile.humidity.steps = "";
    next.profile.humidity.maxLimit = round(Math.min(98, humidityUse + 20), 2);
  }

  if (voltageMin !== null || voltageMax !== null) {
    const start = voltageMin ?? voltageMax ?? 0;
    const end = voltageMax ?? start;
    const delta = Math.max(1, Math.abs(end - start) / 4);
    next.profile.voltage.start = round(start, 3);
    next.profile.voltage.step = round(delta, 3);
    next.profile.voltage.dwellMin = 15;
    next.profile.voltage.steps = "";
    next.profile.voltage.maxLimit = round(end + Math.max(0.5, Math.abs(end) * 0.2), 3);
  }

  if (powerCycles !== null) {
    next.profile.power.start = round(Math.max(1, powerCycles), 2);
    next.profile.power.step = round(Math.max(1, powerCycles * 0.25), 2);
    next.profile.power.dwellMin = 10;
    next.profile.power.steps = "";
    next.profile.power.maxLimit = round(Math.max(powerCycles * 2, powerCycles + 10), 2);
  }

  return next;
}
