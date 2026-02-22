export const DUTY_CYCLE_EXPORT_KEY = "reliatools:dutyCycle:export";
export const HALT_HASS_ROUTE = "/tools/HALTHASSWizard";
export const DUTY_CYCLE_ROUTE = "/tools/MissionProfile";

export interface DutyCycleExportPayload {
  tempUseMinC?: number | null;
  tempUseMaxC?: number | null;
  vibUseGrms?: number | null;
  humidityUseRH?: number | null;
  voltageUseMin?: number | null;
  voltageUseMax?: number | null;
  powerCyclesPerDay?: number | null;
  source?: string;
  generatedAt?: string;
  context?: {
    industry?: string;
    product?: string;
    location?: string;
    templateId?: string;
  };
}
