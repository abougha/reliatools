export type EntryMode = "detection" | "dutyCycle";
export type HaltStyle = "classical" | "rapid";
export type FailureEventType = "hard" | "parametric" | "intermittent";
export type ThresholdType = ">" | "<" | "±" | "window";
export type LaneKey = "temp" | "vib" | "humidity" | "voltage" | "power";
export type NumericInput = number | "";

export interface DetectionSignal {
  id: string;
  name: string;
  units: string;
  thresholdType: ThresholdType;
  thresholdValue: NumericInput;
}

export interface DetectionConfig {
  failureTypes: Record<FailureEventType, boolean>;
  signals: DetectionSignal[];
  sampleIntervalSec: NumericInput;
  logDurationMin: NumericInput;
}

export interface DutyCycleImport {
  tempUseMinC?: number | null;
  tempUseMaxC?: number | null;
  vibUseGrms?: number | null;
  humidityUseRH?: number | null;
  voltageUseMin?: number | null;
  voltageUseMax?: number | null;
  powerCyclesPerDay?: number | null;
  source?: string;
  generatedAt?: string;
}

export interface LaneStepConfig {
  start: NumericInput;
  step: NumericInput;
  dwellMin: NumericInput;
  steps: NumericInput;
  maxLimit: NumericInput;
  rampRate: NumericInput;
  stopOnFirstFail: boolean;
  continueAfterFail: boolean;
}

export interface TemperatureRtcConfig {
  enabled: boolean;
  tMin: NumericInput;
  tMax: NumericInput;
  cycles: NumericInput;
  dwellPerExtremeMin: NumericInput;
  rampRate: NumericInput;
}

export interface TemperatureProfile {
  cold: LaneStepConfig;
  hot: LaneStepConfig;
  rtc: TemperatureRtcConfig;
  combinedPhaseEnabled: boolean;
  combined: {
    steps: NumericInput;
    dwellMin: NumericInput;
  };
}

export interface VibrationProfile extends LaneStepConfig {
  tickleGrms: NumericInput;
}

export interface GenericLaneProfile extends LaneStepConfig {}

export interface ProfileConfig {
  temperature: TemperatureProfile;
  vibration: VibrationProfile;
  humidity: GenericLaneProfile;
  voltage: GenericLaneProfile;
  power: GenericLaneProfile;
}

export interface FailureEvent {
  id: string;
  timeMin: NumericInput;
  lane: LaneKey;
  note: string;
  type: FailureEventType;
}

export interface WizardState {
  entryMode: EntryMode;
  detection: DetectionConfig;
  dutyCycleImport?: DutyCycleImport;
  haltStyle: HaltStyle;
  lanesEnabled: Record<LaneKey, boolean>;
  profile: ProfileConfig;
  events: FailureEvent[];
}

export interface ChartPoint {
  timeMin: number;
  phase: string;
  temp_C: number | null;
  vib_Grms: number | null;
  humidity_RH: number | null;
  voltage_V: number | null;
  power_Level: number | null;
  powerState: string;
}

export interface CsvRow {
  time_min: number;
  phase: string;
  temp_C: string;
  vib_Grms: string;
  humidity_RH: string;
  voltage_V: string;
  powerState: string;
}

export interface LaneRange {
  min: number;
  max: number;
}

export interface ProfileSummary {
  totalDurationMin: number;
  ranges: Partial<Record<LaneKey, LaneRange>>;
  firstFailure?: {
    timeMin: number;
    lane: LaneKey;
    type: FailureEventType;
    note: string;
  };
}

export interface BuildProfileResult {
  chartData: ChartPoint[];
  csvRows: CsvRow[];
  summary: ProfileSummary;
  validationErrors: string[];
}
