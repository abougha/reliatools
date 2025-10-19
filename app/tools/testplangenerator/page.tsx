"use client";
import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

// -----------------------------
// Constants & Knowledge Libraries
// -----------------------------
const K_BOLTZ = 8.617333262e-5; // eV/K

type Preset = {
  life_years: number;
  Tmin: number;
  Tmax: number;
  RH: number;
  auto: boolean;
};

// Category → Options mapping for dependent preset dropdowns
const CATEGORIES: Record<string, string[]> = {
  "Automotive": ["In-cabin", "Underhood/Powertrain", "Exterior/Underbody"],
  "Consumer": ["Indoor", "Outdoor/Portable"],
  "Industrial": ["Factory floor", "Outdoor enclosure"],
  "Aerospace": ["Cabin/Avionics", "Exterior/Airframe"],
  "Medical": ["Clinical", "Home-use"],
  "Data center/ICT": ["Rack equipment"],
  "Storage": ["Office", "Controlled WH", "Uncontrolled WH"],
  "Shipping": ["Truck", "Rail", "Air"],
};

// Build presets keyed by category + option for defaults
const PRESETS: Record<string, Record<string, Preset>> = {
  "Automotive": {
    "In-cabin": { life_years: 10, Tmin: -40, Tmax: 85, RH: 95, auto: true },
    "Underhood/Powertrain": { life_years: 10, Tmin: -40, Tmax: 125, RH: 95, auto: true },
    "Exterior/Underbody": { life_years: 10, Tmin: -40, Tmax: 105, RH: 95, auto: true },
  },
  "Consumer": {
    "Indoor": { life_years: 5, Tmin: 0, Tmax: 40, RH: 85, auto: false },
    "Outdoor/Portable": { life_years: 4, Tmin: -20, Tmax: 60, RH: 95, auto: false },
  },
  "Industrial": {
    "Factory floor": { life_years: 8, Tmin: -20, Tmax: 60, RH: 95, auto: false },
    "Outdoor enclosure": { life_years: 10, Tmin: -40, Tmax: 70, RH: 95, auto: false },
  },
  "Aerospace": {
    "Cabin/Avionics": { life_years: 15, Tmin: -20, Tmax: 70, RH: 80, auto: false },
    "Exterior/Airframe": { life_years: 15, Tmin: -55, Tmax: 85, RH: 95, auto: false },
  },
  "Medical": {
    "Clinical": { life_years: 6, Tmin: 5, Tmax: 40, RH: 80, auto: false },
    "Home-use": { life_years: 4, Tmin: 0, Tmax: 40, RH: 85, auto: false },
  },
  "Data center/ICT": {
    "Rack equipment": { life_years: 8, Tmin: 10, Tmax: 45, RH: 80, auto: false },
  },
  "Storage": {
    "Office": { life_years: 3, Tmin: 15, Tmax: 25, RH: 50, auto: false },
    "Controlled WH": { life_years: 3, Tmin: 5, Tmax: 35, RH: 70, auto: false },
    "Uncontrolled WH": { life_years: 3, Tmin: -10, Tmax: 45, RH: 95, auto: false },
  },
  "Shipping": {
    "Truck": { life_years: 0.05, Tmin: -20, Tmax: 60, RH: 95, auto: false },
    "Rail": { life_years: 0.05, Tmin: -20, Tmax: 60, RH: 95, auto: false },
    "Air": { life_years: 0.02, Tmin: -30, Tmax: 60, RH: 95, auto: false },
  },
};

const STRESS_DOMAINS = [
  "Thermal",
  "Humidity/Corrosion",
  "Mechanical Vibration",
  "Mechanical Shock/Drop",
  "Mechanical Durability",
  "Electrical/ESD/EMC",
  "Chemicals/Fluids",
  "UV/Weathering",
  "Dust/Ingress",
  "Pressure/Vacuum/Altitude",
  "Packaging/Transportation",
] as const;

// Materials DB (trimmed selection from earlier detailed map)
const MATERIALS_DB: Record<string, { stressors: string[]; modes: string[] }> = {
  "PA6/PA66 (Nylon)": { stressors: ["Thermal", "Humidity"], modes: ["Hydrolysis/embrittlement", "Creep"] },
  "PBT": { stressors: ["Thermal"], modes: ["Thermal aging", "Creep"] },
  "PC": { stressors: ["UV", "Chemicals"], modes: ["ESCR", "UV embrittlement"] },
  "ABS": { stressors: ["Thermal", "Chemicals"], modes: ["Thermal aging", "Stress cracking"] },
  "FR-4": { stressors: ["Thermal", "Humidity"], modes: ["Delamination", "Creep corrosion", "ECM"] },
  "Solder (SAC305)": { stressors: ["Thermal cycling"], modes: ["Solder fatigue"] },
  "Connector plating (Sn/Ni/Au)": { stressors: ["Fretting", "Corrosion"], modes: ["Fretting corrosion", "Wear"] },
  "Low-alloy steel": { stressors: ["Corrosion", "Vibration"], modes: ["Corrosion", "Fatigue cracking"] },
  "Aluminum alloys": { stressors: ["Vibration", "Corrosion"], modes: ["Fatigue cracking", "Pitting"] },
};

type TestSuggestion = { test: string; conditionsHint: string; standard: string; domain: string };

const BASE_TESTS: Record<string, TestSuggestion[]> = {
  "Hydrolysis/embrittlement": [
    { test: "Temp/Humidity storage", conditionsHint: "e.g., 85 °C / 85%RH", standard: "IEC 60068-2-78", domain: "Humidity/Corrosion" },
    { test: "Cyclic humidity", conditionsHint: "typical profiles", standard: "IEC 60068-2-38", domain: "Humidity/Corrosion" },
  ],
  "Creep": [
    { test: "High-temp storage", conditionsHint: "Elevated temp aging", standard: "IEC 60068-2-2", domain: "Thermal" },
    { test: "Creep under load", conditionsHint: "Sustained stress & temp", standard: "ASTM D2990", domain: "Mechanical Durability" },
  ],
  "UV embrittlement": [
    { test: "UV weathering", conditionsHint: "QUV cycles", standard: "ASTM G154", domain: "UV/Weathering" },
    { test: "Color/Gloss check", conditionsHint: "post exposure", standard: "ASTM D523", domain: "UV/Weathering" },
  ],
  "Thermal aging": [
    { test: "High-temp storage", conditionsHint: "Arrhenius planning", standard: "IEC 60068-2-2 / J-STD-020", domain: "Thermal" },
  ],
  "Solder fatigue": [
    { test: "Thermal cycling", conditionsHint: "ΔT, ramp, dwell", standard: "JESD22-A104", domain: "Thermal" },
  ],
  "Delamination": [
    { test: "Reflow + TCT", conditionsHint: "reflow + cycles", standard: "JESD22-A113/A104", domain: "Thermal" },
  ],
  "Creep corrosion": [
    { test: "Mixed flowing gas", conditionsHint: "MFG levels", standard: "ASTM B845 / IEC 60068-2-60", domain: "Humidity/Corrosion" },
    { test: "High RH storage", conditionsHint: "85°C/85%RH typical", standard: "IEC 60068-2-78", domain: "Humidity/Corrosion" },
  ],
  "ECM": [
    { test: "THB with bias", conditionsHint: "bias & 85/85", standard: "JESD22-A101", domain: "Humidity/Corrosion" },
  ],
  "Fretting corrosion": [
    { test: "Micro-motion vibration", conditionsHint: "displacement/force", standard: "USCAR-2", domain: "Mechanical Vibration" },
    { test: "Salt fog", conditionsHint: "NaCl fog exposure", standard: "ASTM B117", domain: "Humidity/Corrosion" },
  ],
  "Corrosion": [
    { test: "Salt fog", conditionsHint: "hours per spec", standard: "ASTM B117", domain: "Humidity/Corrosion" },
    { test: "Cyclic corrosion", conditionsHint: "automotive cycles", standard: "GMW14872", domain: "Humidity/Corrosion" },
  ],
  "Fatigue cracking": [
    { test: "Random vibration", conditionsHint: "PSD + duration", standard: "MIL-STD-810, 514", domain: "Mechanical Vibration" },
  ],
  "Brittle fracture": [
    { test: "Mechanical shock", conditionsHint: "g-level, pulses", standard: "MIL-STD-810, 516", domain: "Mechanical Shock/Drop" },
  ],
};

// -----------------------------
// Acceleration Helpers
// -----------------------------
function toK(tC: number) { return tC + 273.15; }

function arrheniusAF(Ea_eV: number, T_use_C: number, T_test_C: number) {
  const af = Math.exp((Ea_eV / K_BOLTZ) * (1 / toK(T_use_C) - 1 / toK(T_test_C)));
  return isFinite(af) && af > 0 ? af : 1;
}

function peckAF(n: number, RH_use: number, RH_test: number, Ea_eV: number, T_use_C: number, T_test_C: number) {
  const rhRatio = (Math.max(1, RH_test) / Math.max(1, RH_use)) ** n;
  return rhRatio * arrheniusAF(Ea_eV, T_use_C, T_test_C);
}

function coffinMansonCycles(C: number, m: number, severityRatio: number) {
  return C * Math.pow(Math.max(1e-9, severityRatio), -m);
}

function zeroFailureSampleSize(R = 0.9, Cc = 0.9) {
  const n = Math.log(1 - Cc) / Math.log(R);
  return Math.ceil(Math.max(1, n));
}

function uniq<T>(arr: T[]) { return Array.from(new Set(arr)); }

// -----------------------------
// Page Component
// -----------------------------
export default function TestPlanGeneratorPage() {
  // Stepper
  const [step, setStep] = useState<number>(1);

  // Product / Preset
  const [productName, setProductName] = useState("");
  const categoryNames = Object.keys(CATEGORIES);
  const [presetCategory, setPresetCategory] = useState<string>(categoryNames[0]);
  const [presetOption, setPresetOption] = useState<string>(CATEGORIES[categoryNames[0]][0]);

  const preset = PRESETS[presetCategory][presetOption];

  // Reliability target
  const [targetR, setTargetR] = useState(0.9);
  const [targetC, setTargetC] = useState(0.9);
  const suggestedN = useMemo(() => zeroFailureSampleSize(targetR, targetC), [targetR, targetC]);

  // Editable environment / life
  const [lifeYears, setLifeYears] = useState<number>(preset.life_years);
  const [useTmin, setUseTmin] = useState<number>(preset.Tmin);
  const [useTmax, setUseTmax] = useState<number>(preset.Tmax);
  const [useRH, setUseRH] = useState<number>(preset.RH);

  // Usage inputs
  const [operHoursPerDay, setOperHoursPerDay] = useState<number>(8);
  const [cyclesPerDay, setCyclesPerDay] = useState<number>(100);
  const [dutyCyclePct, setDutyCyclePct] = useState<number>(50);

  // Derived
  const derivedDutyFromHours = useMemo(() => Math.min(100, (operHoursPerDay / 24) * 100), [operHoursPerDay]);
  const effectiveLifeHours = useMemo(() => lifeYears * 365 * operHoursPerDay, [lifeYears, operHoursPerDay]);
  const effectiveLifeCycles = useMemo(() => lifeYears * 365 * cyclesPerDay, [lifeYears, cyclesPerDay]);

  // Keep defaults in sync when preset changes
  useEffect(() => {
    const p = PRESETS[presetCategory][presetOption];
    setLifeYears(p.life_years);
    setUseTmin(p.Tmin);
    setUseTmax(p.Tmax);
    setUseRH(p.RH);
  }, [presetCategory, presetOption]);

  // Stress domains
  const [chosenDomains, setChosenDomains] = useState<string[]>(["Thermal", "Humidity/Corrosion"]);

  // Thermal cycling knobs
  const [deltaT_use, setDeltaT_use] = useState(Math.max(10, preset.Tmax - preset.Tmin));
  const [deltaT_test, setDeltaT_test] = useState(Math.min(100, Math.max(40, (preset.Tmax - preset.Tmin) + 20)));
  const [rampRate, setRampRate] = useState(10); // °C/min
  const [dwellHot, setDwellHot] = useState(10);
  const [dwellCold, setDwellCold] = useState(10);
  const cycleTimeMin = useMemo(() => (deltaT_test / rampRate) * 2 + dwellHot + dwellCold, [deltaT_test, rampRate, dwellHot, dwellCold]);

  // Humidity/Peck knobs
  const [T_use_C, setT_use_C] = useState(Math.round((useTmin + useTmax) / 2));
  const [T_test_C, setT_test_C] = useState(Math.min(85, useTmax));
  const [RH_use, setRH_use] = useState(Math.min(85, useRH));
  const [RH_test, setRH_test] = useState(85);
  const [Ea, setEa] = useState(1.1); // eV
  const [peckN, setPeckN] = useState(2.5);

  useEffect(() => {
    setT_use_C(Math.round((useTmin + useTmax) / 2));
    setT_test_C(Math.min(85, useTmax));
    setRH_use(Math.min(100, Math.max(0, useRH)));
  }, [useTmin, useTmax, useRH]);

  // Vib pseudo AF (user can adjust b, use/test levels)
  const [grmsUse, setGrmsUse] = useState(0.5);
  const [grmsTest, setGrmsTest] = useState(7.5);
  const [vibExpB, setVibExpB] = useState(3.5);
  const afVib = useMemo(() => {
    const ratio = Math.max(1e-6, grmsTest) / Math.max(1e-6, grmsUse || 1e-6);
    return Math.pow(ratio, vibExpB);
  }, [grmsUse, grmsTest, vibExpB]);

  // Materials & modes
  const materialNames = Object.keys(MATERIALS_DB);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>(["PA6/PA66 (Nylon)", "Connector plating (Sn/Ni/Au)"]);
  const suggestedModes = useMemo(() => {
    const list: string[] = [];
    selectedMaterials.forEach((m) => MATERIALS_DB[m]?.modes.forEach((mm) => list.push(mm)));
    return uniq(list).sort();
  }, [selectedMaterials]);
  const [customModesInput, setCustomModesInput] = useState("");
  const customModes = useMemo(() => uniq(customModesInput.split(",").map(s => s.trim()).filter(Boolean)), [customModesInput]);
  const allChosenModes = useMemo(() => uniq([...suggestedModes, ...customModes]), [suggestedModes, customModes]);

  // Start date
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // DVP&R rows
  type DvpRow = {
    Item: string;
    FailureMode: string;
    Test: string;
    Conditions: string;
    Duration_h: number;
    SampleSize: number;
    Acceptance: string;
    StandardRef: string;
  };

  function durationFor(test: TestSuggestion, mode: string): { hours: number; cond: string } {
    // Arrhenius-like aging / humidity via Peck / fatigue via Coffin–Manson
    if (["Thermal aging", "Hydrolysis/embrittlement", "Insulation embrittlement", "Oxidative embrittlement"].some(k => mode.includes(k)) || test.domain === "Thermal") {
      const af = arrheniusAF(Ea, T_use_C, T_test_C || Math.min(125, T_use_C + 40));
      const life_h = effectiveLifeHours || (lifeYears * 365 * 24);
      const suggested = Math.max(168, Math.min(8 * 7 * 24, life_h / Math.max(1, af))); // 1–8 weeks typical
      return { hours: Math.round(suggested), cond: `${test.conditionsHint}; Ea=${Ea.toFixed(2)}eV; AF≈${af.toFixed(1)}` };
    }
    if (["ECM", "Creep corrosion", "Corrosion", "Fretting corrosion"].some(m => mode.includes(m)) || test.domain === "Humidity/Corrosion") {
      const af = peckAF(peckN, RH_use, RH_test, Ea, T_use_C, T_test_C || 85);
      const base = 1000;
      const suggested = Math.max(168, Math.min(1000, base / Math.max(1, af)));
      return { hours: Math.round(suggested), cond: `${test.conditionsHint}; ${T_test_C}°C/${RH_test}%RH; n=${peckN}; Ea=${Ea}eV; AF≈${af.toFixed(1)}` };
    }
    if (["Solder fatigue", "Fatigue cracking"].some(m => mode.includes(m)) || test.test.includes("Thermal cycling")) {
      const severity = Math.max(1.1, deltaT_test / Math.max(1, deltaT_use));
      const Nf = coffinMansonCycles(1e6, 2.0, severity);
      const targetCycles = Math.max(1, Math.min(Nf, (effectiveLifeCycles || Nf)));
      const hours = targetCycles * (cycleTimeMin / 60);
      const bounded = Math.max(2, Math.min(1000, hours));
      return { hours: Math.round(bounded), cond: `${test.conditionsHint}; ΔT_use=${deltaT_use}°C; ΔT_test=${deltaT_test}°C; ramp=${rampRate}°C/min; dwell(h/c)=${dwellHot}/${dwellCold}min; Nf≈${Math.round(Nf)}, targetCycles≈${Math.round(targetCycles)}` };
    }
    if (test.domain === "Mechanical Shock/Drop") return { hours: 2, cond: test.conditionsHint };
    if (test.domain === "UV/Weathering") return { hours: 500, cond: test.conditionsHint };
    return { hours: 168, cond: test.conditionsHint };
  }

  const dvprRows: DvpRow[] = useMemo(() => {
    const rows: DvpRow[] = [];
    let idx = 1;
    allChosenModes.forEach((mode) => {
      const suggestions = BASE_TESTS[mode] || [];
      suggestions.forEach((sugg) => {
        if (!chosenDomains.includes(sugg.domain)) return;
        const d = durationFor(sugg, mode);
        rows.push({
          Item: `${idx++}`,
          FailureMode: mode,
          Test: sugg.test,
          Conditions: d.cond,
          Duration_h: d.hours,
          SampleSize: suggestedN,
          Acceptance: "No functional loss; visual per spec; electrical within limits; no safety hazards.",
          StandardRef: sugg.standard,
        });
      });
    });
    return rows;
  }, [allChosenModes, chosenDomains, suggestedN, Ea, T_use_C, T_test_C, RH_use, RH_test, peckN, deltaT_use, deltaT_test, rampRate, dwellHot, dwellCold, effectiveLifeHours, effectiveLifeCycles, cycleTimeMin]);

  // Sequence (unique tests with max duration)
  type SeqRow = { Test: string; Duration_h: number; Offset_h: number; StartISO: string; EndISO: string };
  const sequenceRows: SeqRow[] = useMemo(() => {
    const map = new Map<string, number>();
    dvprRows.forEach(r => { map.set(r.Test, Math.max(map.get(r.Test) || 0, Number(r.Duration_h || 0))); });
    const start = new Date(startDate + "T00:00:00");
    let cursor = new Date(start);
    const seq: SeqRow[] = [];
    Array.from(map.entries()).forEach(([test, dur]) => {
      const startISO = new Date(cursor);
      const endISO = new Date(startISO.getTime() + dur * 3600 * 1000);
      const offsetH = (startISO.getTime() - start.getTime()) / 3600_000;
      seq.push({ Test: test, Duration_h: Math.round(dur), Offset_h: Math.max(0, offsetH), StartISO: startISO.toISOString(), EndISO: endISO.toISOString() });
      cursor = new Date(endISO.getTime() + 2 * 3600_000);
    });
    return seq;
  }, [dvprRows, startDate]);

  // FMEA
  type FmeaRow = { Item: string; Subcomponent: string; Function: string; PotentialFailureMode: string; Effects: string; S: number; O: number; D: number; RPN: number; CurrentControls: string; Actions: string };
  const fmeaRows: FmeaRow[] = useMemo(() => {
    const rows: FmeaRow[] = [];
    let i = 1;
    allChosenModes.forEach((mode) => {
      let S = 7, O = 6, D = 6;
      if (["Brittle fracture", "Thermal runaway", "Dielectric breakdown"].some(x => mode.includes(x))) S = 9;
      if (["Corrosion", "Fretting corrosion", "Humidity", "ECM"].some(x => mode.includes(x))) O = 7;
      const linked = dvprRows.filter(r => r.FailureMode === mode).map(r => `${r.Test} (${r.StandardRef})`).join("; ");
      if (linked.length) D = 5;
      rows.push({
        Item: `${i++}`,
        Subcomponent: productName || "—",
        Function: "Default function (edit)",
        PotentialFailureMode: mode,
        Effects: "Performance degradation or functional loss (edit)",
        S, O, D, RPN: S * O * D,
        CurrentControls: linked || "—",
        Actions: "",
      });
    });
    return rows;
  }, [allChosenModes, dvprRows, productName]);

  // Export to Excel
  function exportExcel() {
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, "");
    const fname = `TestPlan_${(productName || "Product").replace(/\s+/g, "_")}_${dateStr}.xlsx`;

    const dvpData = [
      ["Item","Failure Mode Addressed","Test","Conditions (suggested)","Duration (h)","Sample Size (suggested)","Acceptance Criteria","Standard Ref"],
      ...dvprRows.map(r => [r.Item, r.FailureMode, r.Test, r.Conditions, r.Duration_h, r.SampleSize, r.Acceptance, r.StandardRef])
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(dvpData);

    const seqData = [["Test","Duration (h)","Offset (h)","Start","End"], ...sequenceRows.map(r => [r.Test, r.Duration_h, r.Offset_h, r.StartISO, r.EndISO])];
    const ws2 = XLSX.utils.aoa_to_sheet(seqData);

    const fmeaData = [["Item / Subcomponent","Function","Potential Failure Mode","Potential Effects of Failure","S","O","D","RPN","Current Controls","Recommended Actions"],
      ...fmeaRows.map(r => [ `${r.Item} / ${r.Subcomponent}`, r.Function, r.PotentialFailureMode, r.Effects, r.S, r.O, r.D, r.RPN, r.CurrentControls, r.Actions ])
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(fmeaData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "DVP&R");
    XLSX.utils.book_append_sheet(wb, ws2, "Test_Sequence");
    XLSX.utils.book_append_sheet(wb, ws3, "FMEA_RPN");

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fname;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <h1 className="text-3xl md:text-4xl font-bold">Test Plan Generator</h1>
      <p className="text-sm text-muted-foreground">Guided flow → DVP&R, Test Sequence, FMEA → Excel export</p>

      {/* Step 1: Product / Preset */}
      <section className="bg-gray-50 rounded-2xl p-6 shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">1) Product / Environment Preset</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Product / Subcomponent</label>
            <input
              className="w-full border rounded-xl px-3 py-2"
              placeholder="e.g., 12-way inline connector"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Application Category</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="w-full border rounded-xl px-3 py-2"
                value={presetCategory}
                onChange={(e) => setPresetCategory(e.target.value)}
              >
                {categoryNames.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                className="w-full border rounded-xl px-3 py-2"
                value={presetOption}
                onChange={(e) => setPresetOption(e.target.value)}
              >
                {(CATEGORIES[presetCategory] || []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4 text-sm">
          <div className="p-3 bg-white rounded-xl border">
            <label className="block text-xs text-gray-500">Life target (years)</label>
            <input
              type="number"
              className="w-full border rounded-lg px-2 py-1 mt-1"
              value={lifeYears}
              onChange={(e) => setLifeYears(Number(e.target.value))}
            />
          </div>

          <div className="p-3 bg-white rounded-xl border">
            <label className="block text-xs text-gray-500">Duty cycle (%)</label>
            <input
              type="number"
              className="w-full border rounded-lg px-2 py-1 mt-1"
              value={dutyCyclePct}
              onChange={(e) => setDutyCyclePct(Number(e.target.value))}
            />
          </div>

          {/* Usage per day (hours + cycles) */}
          <div className="p-3 bg-white rounded-xl border col-span-2">
            <label className="block text-xs text-gray-500">Usage per day</label>

            <div className="mt-1 grid grid-cols-2 gap-2">
              <label className="flex flex-col text-xs">
                Hours per day
                <input
                  type="number"
                  className="border rounded-lg px-2 py-1 mt-1"
                  value={operHoursPerDay}
                  onChange={(e) => setOperHoursPerDay(Number(e.target.value))}
                />
              </label>

              <label className="flex flex-col text-xs">
                Cycles per day
                <input
                  type="number"
                  className="border rounded-lg px-2 py-1 mt-1"
                  value={cyclesPerDay}
                  onChange={(e) => setCyclesPerDay(Number(e.target.value))}
                />
              </label>
            </div>

            <div className="text-xs text-gray-500 mt-2">
              Derived duty from hours/day ≈{" "}
              <span className="font-semibold">
                {derivedDutyFromHours.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border">
            <label className="block text-xs text-gray-500">Use Tmin (°C)</label>
            <input
              type="number"
              className="w-full border rounded-lg px-2 py-1 mt-1"
              value={useTmin}
              onChange={(e) => setUseTmin(Number(e.target.value))}
            />
          </div>

          <div className="p-3 bg-white rounded-xl border">
            <label className="block text-xs text-gray-500">Use Tmax (°C)</label>
            <input
              type="number"
              className="w-full border rounded-lg px-2 py-1 mt-1"
              value={useTmax}
              onChange={(e) => setUseTmax(Number(e.target.value))}
            />
          </div>

          <div className="p-3 bg-white rounded-xl border">
            <label className="block text-xs text-gray-500">Use RH (%)</label>
            <input
              type="number"
              className="w-full border rounded-lg px-2 py-1 mt-1"
              value={useRH}
              onChange={(e) => setUseRH(Number(e.target.value))}
            />
          </div>

          {/* Effective life from duty / usage */}
          <div className="p-3 bg-white rounded-xl border col-span-2">
            <label className="block text-xs text-gray-500">
              Effective Life (from Duty / Usage)
            </label>
            <div className="mt-1 text-sm">
              <div>
                Hours-based life ≈{" "}
                <span className="font-semibold">
                  {Math.round(effectiveLifeHours).toLocaleString()} h
                </span>
              </div>
              <div>
                Cycles-based life ≈{" "}
                <span className="font-semibold">
                  {Math.round(effectiveLifeCycles).toLocaleString()} cycles
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            disabled={!productName}
            onClick={() => setStep(2)}
            className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </section>

      {/* Step 2: Reliability Target & Stress Domains */}
      {step >= 2 && (
      <section className="bg-gray-50 rounded-2xl p-6 shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">2) Reliability Target & Stress Domains</h2>
        <div className="grid md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Reliability (R)</label>
            <input type="number" min={0.5} max={0.999} step={0.01} className="w-full border rounded-xl px-3 py-2" value={targetR} onChange={(e)=>setTargetR(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confidence (C)</label>
            <input type="number" min={0.5} max={0.999} step={0.01} className="w-full border rounded-xl px-3 py-2" value={targetC} onChange={(e)=>setTargetC(Number(e.target.value))} />
          </div>
          <div>
            <div className="text-sm">Suggested sample size (zero-failure):</div>
            <div className="text-2xl font-bold">n = {suggestedN}</div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Stress Domains</label>
          <div className="grid md:grid-cols-3 gap-2">
            {STRESS_DOMAINS.map(domain => (
              <label key={domain} className="flex items-center gap-2 bg-white border rounded-xl px-3 py-2 text-sm">
                <input type="checkbox" checked={chosenDomains.includes(domain)} onChange={(e)=>{
                  setChosenDomains(prev => e.target.checked ? [...prev, domain] : prev.filter(d => d!==domain));
                }} />
                {domain}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={()=>setStep(3)} className="px-4 py-2 rounded-xl bg-black text-white">Next →</button>
        </div>
      </section>
      )}

      {/* Step 3: Acceleration Knobs (conditional by domain) */}
      {step >= 3 && (
      <section className="bg-gray-50 rounded-2xl p-6 shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">3) Acceleration Knobs</h2>

          {/* Thermal Cycling (only when Thermal selected) */}
          {chosenDomains.includes("Thermal") && (
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-semibold">Thermal Cycling</h3>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              <label className="flex flex-col">ΔT_use (°C)
                <input type="number" className="border rounded px-2 py-1" value={deltaT_use} onChange={(e)=>setDeltaT_use(Number(e.target.value))} />
              </label>
              <label className="flex flex-col">ΔT_test (°C)
                <input type="number" className="border rounded px-2 py-1" value={deltaT_test} onChange={(e)=>setDeltaT_test(Number(e.target.value))} />
              </label>
              <label className="flex flex-col">Ramp (°C/min)
                <input type="number" className="border rounded px-2 py-1" value={rampRate} onChange={(e)=>setRampRate(Number(e.target.value))} />
              </label>
              <label className="flex flex-col">Dwell hot (min)
                <input type="number" className="border rounded px-2 py-1" value={dwellHot} onChange={(e)=>setDwellHot(Number(e.target.value))} />
              </label>
              <label className="flex flex-col">Dwell cold (min)
                <input type="number" className="border rounded px-2 py-1" value={dwellCold} onChange={(e)=>setDwellCold(Number(e.target.value))} />
              </label>
              <div className="col-span-2">Cycle time ≈ <span className="font-semibold">{cycleTimeMin.toFixed(1)} min</span></div>
            </div>
          </div>
          )}

          {/* Humidity (Peck) – only when Humidity/Corrosion selected */}
          {chosenDomains.includes("Humidity/Corrosion") && (
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-semibold">Humidity (Peck)</h3>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              <label className="flex flex-col">T_use (°C)
                <input type="number" className="border rounded px-2 py-1" value={T_use_C} onChange={(e)=>setT_use_C(Number(e.target.value))} />
              </label>
              <label className="flex flex-col">T_test (°C)
                <input type="number" className="border rounded px-2 py-1" value={T_test_C} onChange={(e)=>setT_test_C(Number(e.target.value))} />
              </label>
              <label className="flex flex-col">RH_use (%)
                <input type="number" className="border rounded px-2 py-1" value={RH_use} onChange={(e)=>setRH_use(Number(e.target.value))} />
              </label>
              <label className="flex flex-col">RH_test (%)
                <input type="number" className="border rounded px-2 py-1" value={RH_test} onChange={(e)=>setRH_test(Number(e.target.value))} />
              </label>
              <label className="flex flex-col">Ea (eV)
                <input type="number" step={0.05} className="border rounded px-2 py-1" value={Ea} onChange={(e)=>setEa(Number(e.target.value))} />
              </label>
              <label className="flex flex-col">Peck n
                <input type="number" step={0.1} className="border rounded px-2 py-1" value={peckN} onChange={(e)=>setPeckN(Number(e.target.value))} />
              </label>
            </div>
          </div>
          )}

          {/* Mechanical Vibration – only when selected */}
          {chosenDomains.includes("Mechanical Vibration") && (
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-semibold">Vibration (AF)</h3>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              <label className="flex flex-col">Grms (use)
                <input type="number" className="border rounded px-2 py-1" value={grmsUse} onChange={(e)=>setGrmsUse(Number(e.target.value))} />
              </label>
              <label className="flex flex-col">Grms (test)
                <input type="number" className="border rounded px-2 py-1" value={grmsTest} onChange={(e)=>setGrmsTest(Number(e.target.value))} />
              </label>
              <label className="flex flex-col">Exponent b
                <input type="number" step={0.1} className="border rounded px-2 py-1" value={vibExpB} onChange={(e)=>setVibExpB(Number(e.target.value))} />
              </label>
              <div className="col-span-2">AF_vib ≈ <span className="font-semibold">{afVib.toFixed(2)}</span></div>
            </div>
          </div>
          )}

        <div className="mt-6 flex justify-end">
          <button onClick={()=>setStep(4)} className="px-4 py-2 rounded-xl bg-black text-white">Next →</button>
        </div>
      </section>
      )}

      {/* Step 4: Materials & Failure Modes */}
      {step >= 4 && (
      <section className="bg-gray-50 rounded-2xl p-6 shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">4) Materials & Failure Modes</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Materials (multi-select)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-auto pr-1">
              {materialNames.map(m => (
                <label key={m} className="flex items-center gap-2 bg-white border rounded-xl px-3 py-2 text-sm">
                  <input type="checkbox" checked={selectedMaterials.includes(m)} onChange={(e)=>{
                    setSelectedMaterials(prev => e.target.checked ? Array.from(new Set([...prev, m])) : prev.filter(x=>x!==m));
                  }} />
                  {m}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Suggested Modes</label>
            <div className="text-sm bg-white border rounded-xl p-3 min-h-[3rem]">{suggestedModes.join(", ") || "—"}</div>
            <label className="block text-sm font-medium mt-3">Add custom modes (comma-separated)</label>
            <input className="w-full border rounded-xl px-3 py-2" placeholder="e.g., dielectric breakdown" value={customModesInput} onChange={(e)=>setCustomModesInput(e.target.value)} />
            <div className="text-sm mt-2">All modes: <span className="font-semibold">{allChosenModes.join(", ") || "—"}</span></div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={()=>setStep(5)} className="px-4 py-2 rounded-xl bg-black text-white">Next →</button>
        </div>
      </section>
      )}

      {/* Previews – gated at Step 5 */}
      {step >= 5 && (
      <section className="bg-gray-50 rounded-2xl p-6 shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Preview – DVP&R</h2>
        <div className="overflow-auto border rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                {["Item","Failure Mode","Test","Conditions","Duration (h)","Sample Size","Acceptance","Standard"].map(h => (
                  <th key={h} className="text-left p-2 border-b">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dvprRows.map((r, i) => (
                <tr key={i} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2 border-b align-top">{r.Item}</td>
                  <td className="p-2 border-b align-top">{r.FailureMode}</td>
                  <td className="p-2 border-b align-top">{r.Test}</td>
                  <td className="p-2 border-b align-top whitespace-pre-wrap">{r.Conditions}</td>
                  <td className="p-2 border-b align-top">{r.Duration_h}</td>
                  <td className="p-2 border-b align-top">{r.SampleSize}</td>
                  <td className="p-2 border-b align-top">{r.Acceptance}</td>
                  <td className="p-2 border-b align-top">{r.StandardRef}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {step >= 5 && (
      <section className="bg-gray-50 rounded-2xl p-6 shadow-sm border">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold mb-4">Preview – Test Sequence</h2>
          <div className="flex items-center gap-2 text-sm">
            <label>Start date</label>
            <input type="date" className="border rounded-lg px-3 py-2" value={startDate} onChange={(e)=>setStartDate(e.target.value)} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="overflow-auto border rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {["Test","Duration (h)","Offset (h)","Start","End"].map(h => (
                    <th key={h} className="text-left p-2 border-b">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sequenceRows.map((r, i) => (
                  <tr key={i} className="odd:bg-white even:bg-gray-50">
                    <td className="p-2 border-b align-top">{r.Test}</td>
                    <td className="p-2 border-b align-top">{r.Duration_h}</td>
                    <td className="p-2 border-b align-top">{r.Offset_h}</td>
                    <td className="p-2 border-b align-top">{r.StartISO.replace("T"," ").slice(0,16)}</td>
                    <td className="p-2 border-b align-top">{r.EndISO.replace("T"," ").slice(0,16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* On-page Gantt */}
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sequenceRows.map(r => ({ name: r.Test, offset: r.Offset_h, duration: r.Duration_h }))} layout="vertical" margin={{ left: 80, right: 20, top: 10, bottom: 10 }}>
                <XAxis type="number" hide domain={[0, "dataMax + 8"]} />
                <YAxis type="category" dataKey="name" width={200} />
                <Tooltip formatter={(v: any, n: string) => [v, n === "duration" ? "Duration (h)" : "Offset (h)"]} />
                <Bar dataKey="offset" stackId="a" fill="rgba(0,0,0,0)" />
                <Bar dataKey="duration" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
      )}

      {step >= 5 && (
      <section className="bg-gray-50 rounded-2xl p-6 shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Preview – FMEA (RPN)</h2>
        <div className="overflow-auto border rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                {["Item/Subcomponent","Function","Potential Failure Mode","Potential Effects","S","O","D","RPN","Current Controls","Recommended Actions"].map(h => (
                  <th key={h} className="text-left p-2 border-b">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fmeaRows.map((r, i) => (
                <tr key={i} className="odd:bg-white even:bg-gray-50">
                  <td className="p-2 border-b align-top">{r.Item} / {r.Subcomponent}</td>
                  <td className="p-2 border-b align-top">{r.Function}</td>
                  <td className="p-2 border-b align-top">{r.PotentialFailureMode}</td>
                  <td className="p-2 border-b align-top">{r.Effects}</td>
                  <td className="p-2 border-b align-top">{r.S}</td>
                  <td className="p-2 border-b align-top">{r.O}</td>
                  <td className="p-2 border-b align-top">{r.D}</td>
                  <td className="p-2 border-b align-top font-semibold">{r.RPN}</td>
                  <td className="p-2 border-b align-top whitespace-pre-wrap">{r.CurrentControls}</td>
                  <td className="p-2 border-b align-top">{r.Actions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={exportExcel} className="px-4 py-2 rounded-xl bg-black text-white shadow hover:opacity-90">Download Excel</button>
          <span className="text-xs text-gray-500">File includes 3 tabs: DVP&R, Test_Sequence, FMEA_RPN. (On-page Gantt shown above.)</span>
        </div>
      </section>
      )}
    </div>
  );
}
