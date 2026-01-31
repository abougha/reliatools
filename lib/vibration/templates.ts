import type { MissionTemplate, PsdTemplate, MissionProfile, Industry } from "./types";

const psdTemplates: PsdTemplate[] = [
  {
    id: "auto-city",
    name: "Auto City Ride",
    points: [
      { f_hz: 10, g2_per_hz: 0.0002 },
      { f_hz: 30, g2_per_hz: 0.001 },
      { f_hz: 80, g2_per_hz: 0.004 },
      { f_hz: 200, g2_per_hz: 0.006 },
      { f_hz: 500, g2_per_hz: 0.0025 },
      { f_hz: 1000, g2_per_hz: 0.001 },
      { f_hz: 2000, g2_per_hz: 0.0004 },
    ],
  },
  {
    id: "auto-rough",
    name: "Auto Rough Road",
    points: [
      { f_hz: 10, g2_per_hz: 0.0006 },
      { f_hz: 25, g2_per_hz: 0.002 },
      { f_hz: 60, g2_per_hz: 0.008 },
      { f_hz: 150, g2_per_hz: 0.012 },
      { f_hz: 400, g2_per_hz: 0.006 },
      { f_hz: 800, g2_per_hz: 0.003 },
      { f_hz: 2000, g2_per_hz: 0.001 },
    ],
  },
  {
    id: "auto-highway",
    name: "Auto Highway",
    points: [
      { f_hz: 10, g2_per_hz: 0.00015 },
      { f_hz: 40, g2_per_hz: 0.0008 },
      { f_hz: 100, g2_per_hz: 0.003 },
      { f_hz: 250, g2_per_hz: 0.004 },
      { f_hz: 600, g2_per_hz: 0.0018 },
      { f_hz: 1200, g2_per_hz: 0.0007 },
      { f_hz: 2000, g2_per_hz: 0.0003 },
    ],
  },
  {
    id: "datacenter-fan",
    name: "Rack Server Fan",
    points: [
      { f_hz: 20, g2_per_hz: 0.0001 },
      { f_hz: 60, g2_per_hz: 0.0005 },
      { f_hz: 120, g2_per_hz: 0.0025 },
      { f_hz: 240, g2_per_hz: 0.0035 },
      { f_hz: 500, g2_per_hz: 0.0012 },
      { f_hz: 1000, g2_per_hz: 0.0005 },
      { f_hz: 2000, g2_per_hz: 0.0002 },
    ],
  },
  {
    id: "datacenter-transport",
    name: "Rack Transport",
    points: [
      { f_hz: 5, g2_per_hz: 0.0004 },
      { f_hz: 20, g2_per_hz: 0.0015 },
      { f_hz: 60, g2_per_hz: 0.003 },
      { f_hz: 120, g2_per_hz: 0.004 },
      { f_hz: 300, g2_per_hz: 0.002 },
      { f_hz: 800, g2_per_hz: 0.0009 },
      { f_hz: 1500, g2_per_hz: 0.0004 },
    ],
  },
  {
    id: "industrial-motor",
    name: "Motor Controller Near Motor",
    points: [
      { f_hz: 10, g2_per_hz: 0.0003 },
      { f_hz: 40, g2_per_hz: 0.001 },
      { f_hz: 90, g2_per_hz: 0.0045 },
      { f_hz: 180, g2_per_hz: 0.006 },
      { f_hz: 400, g2_per_hz: 0.003 },
      { f_hz: 900, g2_per_hz: 0.0014 },
      { f_hz: 1800, g2_per_hz: 0.0006 },
    ],
  },
  {
    id: "consumer-washer",
    name: "Washer Controller",
    points: [
      { f_hz: 5, g2_per_hz: 0.0005 },
      { f_hz: 15, g2_per_hz: 0.0022 },
      { f_hz: 40, g2_per_hz: 0.004 },
      { f_hz: 80, g2_per_hz: 0.003 },
      { f_hz: 200, g2_per_hz: 0.0015 },
      { f_hz: 600, g2_per_hz: 0.0006 },
      { f_hz: 1200, g2_per_hz: 0.0003 },
    ],
  },
  {
    id: "health-wearable",
    name: "Wearable Motion",
    points: [
      { f_hz: 1, g2_per_hz: 0.00015 },
      { f_hz: 3, g2_per_hz: 0.0005 },
      { f_hz: 8, g2_per_hz: 0.0012 },
      { f_hz: 15, g2_per_hz: 0.0014 },
      { f_hz: 30, g2_per_hz: 0.0009 },
      { f_hz: 80, g2_per_hz: 0.0003 },
      { f_hz: 200, g2_per_hz: 0.00012 },
    ],
  },
];

const templateMap = psdTemplates.reduce<Record<string, PsdTemplate>>((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});

function baseProfile(name: string, industry: Industry, intendedLife_h: number): MissionProfile {
  return { name, industry, intendedLife_h, states: [] };
}

const missionTemplates: MissionTemplate[] = [
  {
    id: "auto-body-ecu",
    industry: "Automotive",
    name: "Body / Interior ECU",
    description: "Mixed urban, highway, and rough road usage with hot soak cycles.",
    profile: {
      ...baseProfile("Body / Interior ECU", "Automotive", 50000),
      states: [
        {
          id: "auto-city",
          name: "City Drive",
          duration_h: 22000,
          psd: { kind: "Template", templateId: "auto-city", scale: 1 },
          thermal: { kind: "Steady", T_C: 35 },
        },
        {
          id: "auto-highway",
          name: "Highway Cruise",
          duration_h: 20000,
          psd: { kind: "Template", templateId: "auto-highway", scale: 1 },
          thermal: { kind: "Steady", T_C: 45 },
        },
        {
          id: "auto-rough",
          name: "Rough Road Events",
          duration_h: 6000,
          psd: { kind: "Template", templateId: "auto-rough", scale: 1 },
          thermal: { kind: "Steady", T_C: 30 },
        },
        {
          id: "auto-hotsoak",
          name: "Hot Soak Cycles",
          duration_h: 2000,
          psd: { kind: "Template", templateId: "auto-city", scale: 0.6 },
          thermal: {
            kind: "Cycle",
            Tmin_C: 25,
            Tmax_C: 85,
            ramp_C_per_min: 2,
            soak_min: 20,
            cycles_per_hour: 1,
          },
        },
      ],
    },
  },
  {
    id: "datacenter-rack",
    industry: "DataCenterAI",
    name: "Rack Server / Fan Vibration",
    description: "Fan-driven vibration with mostly steady warm thermal conditions.",
    profile: {
      ...baseProfile("Rack Server", "DataCenterAI", 40000),
      states: [
        {
          id: "dc-idle",
          name: "Idle / Low Fan",
          duration_h: 15000,
          psd: { kind: "Template", templateId: "datacenter-fan", scale: 0.6 },
          thermal: { kind: "Steady", T_C: 32 },
        },
        {
          id: "dc-normal",
          name: "Normal Operation",
          duration_h: 17000,
          psd: { kind: "Template", templateId: "datacenter-fan", scale: 1 },
          thermal: { kind: "Steady", T_C: 40 },
        },
        {
          id: "dc-peak",
          name: "High Fan / Peak Load",
          duration_h: 6000,
          psd: { kind: "Template", templateId: "datacenter-fan", scale: 1.4 },
          thermal: { kind: "Steady", T_C: 50 },
        },
        {
          id: "dc-transport",
          name: "Rack Transport",
          duration_h: 2000,
          psd: { kind: "Template", templateId: "datacenter-transport", scale: 1 },
          thermal: { kind: "Steady", T_C: 25 },
        },
      ],
    },
  },
  {
    id: "industrial-motor-controller",
    industry: "Industrial",
    name: "Motor Controller Near Motor",
    description: "Motor harmonics and operational start/stop thermal swings.",
    profile: {
      ...baseProfile("Motor Controller", "Industrial", 35000),
      states: [
        {
          id: "ind-steady",
          name: "Steady Run",
          duration_h: 20000,
          psd: { kind: "Template", templateId: "industrial-motor", scale: 1 },
          thermal: { kind: "Steady", T_C: 45 },
        },
        {
          id: "ind-start-stop",
          name: "Start / Stop Cycles",
          duration_h: 9000,
          psd: { kind: "Template", templateId: "industrial-motor", scale: 1.2 },
          thermal: {
            kind: "Cycle",
            Tmin_C: 20,
            Tmax_C: 70,
            ramp_C_per_min: 1.5,
            soak_min: 15,
            cycles_per_hour: 0.6,
          },
        },
        {
          id: "ind-maint",
          name: "Maintenance / Low Load",
          duration_h: 6000,
          psd: { kind: "Template", templateId: "industrial-motor", scale: 0.5 },
          thermal: { kind: "Steady", T_C: 30 },
        },
      ],
    },
  },
  {
    id: "consumer-washer-controller",
    industry: "Consumer",
    name: "Washing Machine Controller",
    description: "Spin cycle vibration with periodic thermal cycling.",
    profile: {
      ...baseProfile("Washer Controller", "Consumer", 25000),
      states: [
        {
          id: "cons-idle",
          name: "Idle / Standby",
          duration_h: 16000,
          psd: { kind: "Template", templateId: "consumer-washer", scale: 0.35 },
          thermal: { kind: "Steady", T_C: 28 },
        },
        {
          id: "cons-wash",
          name: "Wash / Agitation",
          duration_h: 6000,
          psd: { kind: "Template", templateId: "consumer-washer", scale: 1 },
          thermal: { kind: "Steady", T_C: 35 },
        },
        {
          id: "cons-spin",
          name: "High Spin",
          duration_h: 2500,
          psd: { kind: "Template", templateId: "consumer-washer", scale: 1.4 },
          thermal: { kind: "Steady", T_C: 40 },
        },
        {
          id: "cons-thermal",
          name: "Thermal Cycles",
          duration_h: 500,
          psd: { kind: "Template", templateId: "consumer-washer", scale: 0.8 },
          thermal: {
            kind: "Cycle",
            Tmin_C: 20,
            Tmax_C: 60,
            ramp_C_per_min: 2,
            soak_min: 10,
            cycles_per_hour: 1.2,
          },
        },
      ],
    },
  },
  {
    id: "health-wearable",
    industry: "Healthcare",
    name: "Wearable Device (Human Motion)",
    description: "Low-frequency motion with mild thermal exposure.",
    profile: {
      ...baseProfile("Wearable Motion", "Healthcare", 20000),
      states: [
        {
          id: "health-rest",
          name: "Rest / Sleep",
          duration_h: 8000,
          psd: { kind: "Template", templateId: "health-wearable", scale: 0.4 },
          thermal: { kind: "Steady", T_C: 30 },
        },
        {
          id: "health-walk",
          name: "Daily Activity",
          duration_h: 9000,
          psd: { kind: "Template", templateId: "health-wearable", scale: 1 },
          thermal: { kind: "Steady", T_C: 33 },
        },
        {
          id: "health-exercise",
          name: "Workout Sessions",
          duration_h: 2500,
          psd: { kind: "Template", templateId: "health-wearable", scale: 1.6 },
          thermal: { kind: "Steady", T_C: 36 },
        },
        {
          id: "health-thermal",
          name: "Ambient Thermal Cycle",
          duration_h: 500,
          psd: { kind: "Template", templateId: "health-wearable", scale: 0.7 },
          thermal: {
            kind: "Cycle",
            Tmin_C: 18,
            Tmax_C: 42,
            ramp_C_per_min: 1,
            soak_min: 15,
            cycles_per_hour: 0.8,
          },
        },
      ],
    },
  },
];

export function getMissionTemplateById(id: string): MissionTemplate | undefined {
  return missionTemplates.find((t) => t.id === id);
}

export function getTemplatesForIndustry(industry: Industry): MissionTemplate[] {
  return missionTemplates.filter((t) => t.industry === industry);
}

export function getDefaultTemplate(industry: Industry): MissionTemplate {
  const matches = getTemplatesForIndustry(industry);
  return matches[0] ?? missionTemplates[0];
}

export { missionTemplates, psdTemplates, templateMap as psdTemplateMap };
