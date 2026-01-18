
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import materialsData from "@/data/test-plan-materials.json";
import testsData from "@/data/test-plan-tests.json";

/**
 * Reliatools – Test Plan Generator (v10)
 * - Removed Service Environment selector and Regional labels
 * - Corrosion tests kept with fixed defaults and shown only when Humidity/Corrosion domain is selected
 * - Retains: Thermal (Arrhenius, Coffin–Manson, Peck), Mechanical Vibration AF, Materials→Modes→Tests,
 *   DVP&R + Sequence + FMEA + CSV export
 */

const K_BOLTZ = 8.617333262e-5; // eV/K

type Preset = { life_years: number; Tmin: number; Tmax: number; RH: number; auto: boolean };
const CATEGORIES: Record<string, string[]> = {
  Automotive: ["In-cabin", "Underhood/Powertrain", "Exterior/Underbody"],
  Consumer: ["Indoor", "Outdoor/Portable"],
  Industrial: ["Factory floor", "Outdoor enclosure"],
  Aerospace: ["Cabin/Avionics", "Exterior/Airframe"],
  Medical: ["Clinical", "Home-use"],
  "Data center/ICT": ["Rack equipment"],
  Storage: ["Office", "Controlled WH", "Uncontrolled WH"],
  Shipping: ["Truck", "Rail", "Air"],
};
const PRESETS: Record<string, Record<string, Preset>> = {
  Automotive: {
    "In-cabin": { life_years: 10, Tmin: -40, Tmax: 85, RH: 95, auto: true },
    "Underhood/Powertrain": { life_years: 10, Tmin: -40, Tmax: 125, RH: 95, auto: true },
    "Exterior/Underbody": { life_years: 10, Tmin: -40, Tmax: 105, RH: 95, auto: true },
  },
  Consumer: {
    Indoor: { life_years: 5, Tmin: 0, Tmax: 40, RH: 85, auto: false },
    "Outdoor/Portable": { life_years: 4, Tmin: -20, Tmax: 60, RH: 95, auto: false },
  },
  Industrial: {
    "Factory floor": { life_years: 8, Tmin: -20, Tmax: 60, RH: 95, auto: false },
    "Outdoor enclosure": { life_years: 10, Tmin: -40, Tmax: 70, RH: 95, auto: false },
  },
  Aerospace: {
    "Cabin/Avionics": { life_years: 15, Tmin: -20, Tmax: 70, RH: 80, auto: false },
    "Exterior/Airframe": { life_years: 15, Tmin: -55, Tmax: 85, RH: 95, auto: false },
  },
  Medical: {
    Clinical: { life_years: 6, Tmin: 5, Tmax: 40, RH: 80, auto: false },
    "Home-use": { life_years: 4, Tmin: 0, Tmax: 40, RH: 85, auto: false },
  },
  "Data center/ICT": { "Rack equipment": { life_years: 8, Tmin: 10, Tmax: 45, RH: 80, auto: false } },
  Storage: {
    Office: { life_years: 3, Tmin: 15, Tmax: 25, RH: 50, auto: false },
    "Controlled WH": { life_years: 3, Tmin: 5, Tmax: 35, RH: 70, auto: false },
    "Uncontrolled WH": { life_years: 3, Tmin: -10, Tmax: 45, RH: 95, auto: false },
  },
  Shipping: {
    Truck: { life_years: 0.05, Tmin: -20, Tmax: 60, RH: 95, auto: false },
    Rail: { life_years: 0.05, Tmin: -20, Tmax: 60, RH: 95, auto: false },
    Air: { life_years: 0.02, Tmin: -30, Tmax: 60, RH: 95, auto: false },
  },
};

type MaterialType =
  | "connector"
  | "pcba"
  | "mech"
  | "polymer"
  | "metal"
  | "coating"
  | "elastomer"
  | "adhesive"
  | "ceramic"
  | "composite";

const STRESS_DOMAINS = testsData.stressDomains as string[];
const CORROSION_DEFAULTS = testsData.corrosionDefaults as {
  gmwCycle: string;
  gmwHours: number;
  mfgClass: string;
  mfgHours: number;
  saltFogHours: number;
};
const MATERIALS_DB = materialsData as Record<string, { modes: string[]; type: MaterialType }>;


type TestSuggestion = { test: string; conditionsHint: string; standard: string; domain: string; acceptance?: string };
const BASE_TESTS = testsData.baseTests as Record<string, TestSuggestion[]>;
const ELECTRICAL_PACK = testsData.electricalPack as TestSuggestion[];
const PACKAGING_TESTS = testsData.packagingTests as Record<string, TestSuggestion>;


function toK(t: number) { return t + 273.15; }
function arrAF(Ea: number, Tu: number, Tt: number) { const a = Math.exp((Ea / K_BOLTZ) * (1 / toK(Tu) - 1 / toK(Tt))); return isFinite(a) && a > 0 ? a : 1; }
function peckAF(n: number, Ru: number, Rt: number, Ea: number, Tu: number, Tt: number) { return (Math.max(1, Rt) / Math.max(1, Ru)) ** n * arrAF(Ea, Tu, Tt); }
function nZero(R = 0.9, C = 0.9) { return Math.ceil(Math.max(1, Math.log(1 - C) / Math.log(R))); }
function uniq<T>(a: T[]) { return Array.from(new Set(a)); }

export default function Page() {
  const cats = Object.keys(CATEGORIES);
  const [step, setStep] = useState(1);
  const [productName, setProductName] = useState("");
  const [cat, setCat] = useState<string>(cats[0]);
  const [loc, setLoc] = useState<string>(CATEGORIES[cats[0]][0]);
  const preset = PRESETS[cat][loc];

  const [R, setR] = useState(0.9); const [Cc, setCc] = useState(0.9);
  const nSuggested = useMemo(() => nZero(R, Cc), [R, Cc]);

  const [streams, setStreams] = useState(2);
  const [sparesPct, setSparesPct] = useState(20);
  const totalWithSpares = useMemo(() => Math.ceil(nSuggested * (1 + sparesPct / 100)), [nSuggested, sparesPct]);
  const perStream = useMemo(() => Math.max(1, Math.ceil(totalWithSpares / Math.max(1, streams))), [totalWithSpares, streams]);

  const [life, setLife] = useState(preset.life_years);
  const [Tmin, setTmin] = useState(preset.Tmin);
  const [Tmax, setTmax] = useState(preset.Tmax);
  const [RH, setRH] = useState(preset.RH);
  useEffect(() => { const p = PRESETS[cat][loc]; setLife(p.life_years); setTmin(p.Tmin); setTmax(p.Tmax); setRH(p.RH); }, [cat, loc]);

  const [hpd, setHpd] = useState(8);
  const [cpd, setCpd] = useState(100);
  const lifeHours = useMemo(() => life * 365 * hpd, [life, hpd]);
  const lifeCycles = useMemo(() => life * 365 * cpd, [life, cpd]);

  const [domains, setDomains] = useState<string[]>(["Thermal", "Humidity/Corrosion", "Electrical/ESD/EMC", "Mechanical Vibration"]);

  // Thermal ageing (Arrhenius)
  const [Tuse, setTuse] = useState(Tmax);
  const [Ttest, setTtest] = useState(Tmax + 20);
  const [Ea, setEa] = useState(1.1);
  useEffect(() => { setTuse(Tmax); setTtest(Tmax + 20); }, [Tmax]);

  // Thermal cycling (Coffin–Manson flavored)
  const [dUse, setDUse] = useState(Math.max(1, Tmax - Tmin));
  const [link, setLink] = useState(true);
  const [dStress, setDStress] = useState(Math.max(1, Tmax - Tmin) + 20);
  useEffect(() => { const d = Math.max(1, Tmax - Tmin); setDUse(d); if (link) setDStress(d + 20); }, [Tmin, Tmax, link]);
  useEffect(() => { if (link) setDStress(dUse + 20); }, [link, dUse]);
  const [M, setM] = useState(3.0);
  const [ramp, setRamp] = useState(10), [dHot, setDHot] = useState(10), [dCold, setDCold] = useState(10);
  const cycleMin = useMemo(() => (dStress / ramp) * 2 + dHot + dCold, [dStress, ramp, dHot, dCold]);

  // Humidity (Arrhenius–Peck)
  const [Tpeck, setTpeck] = useState(Math.min(85, Tmax));
  const [RHuse, setRHuse] = useState(Math.min(85, RH));
  const [RHtest, setRHtest] = useState(85);
  const [nPeck, setNPeck] = useState(2.5);
  useEffect(() => { setRHuse(Math.min(100, Math.max(0, RH))); setTpeck(Math.min(125, Math.max(Tuse, Tmax))); }, [RH, Tmax]);

  // Mechanical Vibration acceleration knob
  const [grmsUse, setGrmsUse] = useState(0.5);
  const [grmsTest, setGrmsTest] = useState(7.5);
  const [vibExpB, setVibExpB] = useState(4.0);
  const AF_vib = useMemo(() => Math.pow(Math.max(1e-6, grmsTest) / Math.max(1e-6, grmsUse || 0.1), vibExpB), [grmsUse, grmsTest, vibExpB]);
  const durVib = useMemo(() => Math.max(2, Math.min(500, lifeHours / Math.max(1, AF_vib))), [lifeHours, AF_vib]);

  // Link : preview metrics
  const AF_arr = useMemo(() => arrAF(Ea, Tuse, Ttest), [Ea, Tuse, Ttest]);
  const durArr = useMemo(() => Math.max(24, Math.min(8 * 7 * 24, lifeHours / Math.max(1, AF_arr))), [lifeHours, AF_arr]);
  const AF_pe = useMemo(() => peckAF(nPeck, RHuse, RHtest, Ea, Tuse, Tpeck), [nPeck, RHuse, RHtest, Ea, Tuse, Tpeck]);
  const durPe = useMemo(() => Math.max(168, Math.min(2000, lifeHours / Math.max(1, AF_pe))), [lifeHours, AF_pe]);
  const AF_cm = useMemo(() => Math.pow(Math.max(1e-9, dUse) / Math.max(1, dStress), M), [dUse, dStress, M]);
  const Nuse = useMemo(() => Math.max(1, Math.round(lifeCycles)), [lifeCycles]);
  const Nacc = useMemo(() => Math.max(1, Math.round(Nuse * AF_cm)), [Nuse, AF_cm]);
  const cmHours = useMemo(() => Nacc * (cycleMin / 60), [Nacc, cycleMin]);

  // Materials & modes
  const mats = Object.keys(MATERIALS_DB);
  const [selM, setSelM] = useState<string[]>(["Plating (Sn/Ni/Au)", "FR-4", "Solder (SAC305)"]);
  const sugModes = useMemo(() => uniq(selM.flatMap((m) => MATERIALS_DB[m]?.modes || [])).sort(), [selM]);
  const [custom, setCustom] = useState("");
  const cust = useMemo(() => uniq(custom.split(",").map((s) => s.trim()).filter(Boolean)), [custom]);
  const modes = useMemo(() => uniq([...sugModes, ...cust]), [sugModes, cust]);

  type Dvp = { Item: string; FailureMode: string; Test: string; Conditions: string; Duration_h: number; SampleSize: number; Acceptance: string; StandardRef: string };

  function durFor(t: TestSuggestion, mode: string) {
    const name = t.test.toLowerCase();
    if (name.includes("high-temp") || (t.domain === "Thermal" && name.includes("storage"))) {
      return { h: Math.round(durArr), c: `${t.conditionsHint}; T_use=${Tuse}°C; T_test=${Ttest}°C; Ea=${Ea.toFixed(2)}eV; AF≈${AF_arr.toFixed(2)}` };
    }
    if (t.domain === "Humidity/Corrosion" || name.includes("humidity") || name.includes("mixed flowing gas") || name.includes("salt")) {
      return { h: Math.round(durPe), c: `${t.conditionsHint}; ${Tpeck}°C/${RHtest}%RH; n=${nPeck}; Ea=${Ea}eV; AF≈${AF_pe.toFixed(2)}` };
    }
    if (t.domain === "Mechanical Vibration") {
      return { h: Math.round(durVib), c: `${t.conditionsHint}; Grms_use=${grmsUse}; Grms_test=${grmsTest}; b=${vibExpB}; AF_vib≈${AF_vib.toFixed(2)}` };
    }
    if (name.includes("thermal cycling")) {
      const h = Math.max(2, Math.min(2000, cmHours));
      return { h: Math.round(h), c: `${t.conditionsHint}; ΔT_use=${dUse}°C; ΔT_stress=${dStress}°C; M=${M}; AF_CM≈${AF_cm.toFixed(3)}; N_use≈${Nuse.toLocaleString()}; N_acc≈${Nacc.toLocaleString()}; cycle≈${cycleMin.toFixed(1)}min` };
    }
    if (t.domain === "UV/Weathering") return { h: 500, c: t.conditionsHint };
    if (t.domain === "Mechanical Shock/Drop") return { h: 2, c: t.conditionsHint };
    if (t.domain === "Packaging/Transportation") return { h: 4, c: t.conditionsHint };
    return { h: 168, c: t.conditionsHint };
  }

  function corrosionRows(startIndex: number): Dvp[] {
    if (!domains.includes("Humidity/Corrosion")) return [];
    const out: Dvp[] = [];
    let i = startIndex;
    out.push({
      Item: String(i++),
      FailureMode: "Corrosion",
      Test: `Cyclic Corrosion (GMW14872 ${CORROSION_DEFAULTS.gmwCycle})`,
      Conditions: `Cycle ${CORROSION_DEFAULTS.gmwCycle}, total ${CORROSION_DEFAULTS.gmwHours} h`,
      Duration_h: CORROSION_DEFAULTS.gmwHours,
      SampleSize: nSuggested,
      Acceptance: "No red rust on critical surfaces; ΔR within limits; no functional loss.",
      StandardRef: "GMW14872",
    });
    out.push({
      Item: String(i++),
      FailureMode: "Creep corrosion",
      Test: `Mixed Flowing Gas (MFG)`,
      Conditions: `Class ${CORROSION_DEFAULTS.mfgClass}; monitor SIR / visual creep`,
      Duration_h: CORROSION_DEFAULTS.mfgHours,
      SampleSize: nSuggested,
      Acceptance: "No dendrites/creep bridging; SIR ≥ threshold; visual OK.",
      StandardRef: "ASTM B845 / IEC 60068-2-60",
    });
    out.push({
      Item: String(i++),
      FailureMode: "Corrosion (screening)",
      Test: "Salt Fog",
      Conditions: `NaCl fog ${CORROSION_DEFAULTS.saltFogHours} h (if no cyclic corrosion run or for screening)`,
      Duration_h: CORROSION_DEFAULTS.saltFogHours,
      SampleSize: nSuggested,
      Acceptance: "No excessive corrosion on functional surfaces; connectors mate/demate OK.",
      StandardRef: "ASTM B117",
    });
    return out;
  }

  const dvp: Dvp[] = useMemo(() => {
    const out: Dvp[] = [];
    let i = 1;

    const anyPcba = Object.keys(MATERIALS_DB).some(k => selM.includes(k) && MATERIALS_DB[k].type === "pcba");
    if (anyPcba) {
      out.push({ Item: String(i++), FailureMode: "—", Test: "Pre-conditioning: MSL Bake", Conditions: "Per J-STD-020; prior to reflow / TCT", Duration_h: 0, SampleSize: 0, Acceptance: "—", StandardRef: "J-STD-020" });
    }

    const allModes = modes.length ? modes : ["Thermal aging"];
    allModes.forEach((mode) => {
      (BASE_TESTS[mode] || []).forEach((s) => {
        if (!domains.includes(s.domain)) return;
        const d = durFor(s, mode);
        out.push({ Item: String(i++), FailureMode: mode, Test: s.test, Conditions: d.c, Duration_h: d.h, SampleSize: nSuggested, Acceptance: s.acceptance || "No functional loss; visual per spec; electrical within limits; no safety hazards.", StandardRef: s.standard });
      });
    });

    const needsElectrical = domains.includes("Electrical/ESD/EMC") && selM.some((m) => ["connector", "pcba"].includes(MATERIALS_DB[m]?.type as any));
    if (needsElectrical) {
      ELECTRICAL_PACK.forEach((t) => out.push({ Item: String(i++), FailureMode: "Electrical robustness", Test: t.test, Conditions: t.conditionsHint, Duration_h: 2, SampleSize: nSuggested, Acceptance: t.acceptance || "Function within limits; no damage.", StandardRef: t.standard }));
    }

    corrosionRows(i).forEach((r) => out.push({ ...r, Item: String(i++ - 0 + (out.length ? 0 : 0)) }));

    if (selM.includes("Plating (Sn/Ni/Au)") && domains.includes("Mechanical Vibration")) {
      out.push({
        Item: String(i++),
        FailureMode: "Dynamic load (connector)",
        Test: "Dynamic Load (vibration on mated pair)",
        Conditions: `Continuity monitoring under vibration`,
        Duration_h: Math.round(durVib),
        SampleSize: nSuggested,
        Acceptance: "No ≥1 µs discontinuities; ΔR ≤ 10–20 mΩ.",
        StandardRef: "ZVEI TLF0214-17",
      });
    }

    if (domains.includes("Packaging/Transportation")) {
      let shipKey: keyof typeof PACKAGING_TESTS = "Truck";
      if (cat === "Shipping") shipKey = loc as keyof typeof PACKAGING_TESTS;
      const t = PACKAGING_TESTS[shipKey];
      out.push({ Item: String(i++), FailureMode: "Shipping damage", Test: t.test, Conditions: t.conditionsHint, Duration_h: 4, SampleSize: nSuggested, Acceptance: t.acceptance || "No damage; function OK.", StandardRef: t.standard });
    }

    return out.map((r, idx) => ({ ...r, Item: String(idx + 1) }));
  }, [modes, domains, nSuggested, Ea, Tuse, Ttest, Tpeck, RHtest, nPeck, dUse, dStress, M, Nuse, Nacc, cycleMin, cmHours, lifeHours, selM, cat, loc, durVib]);

  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const seq = useMemo(() => {
    const pr: Record<string, number> = { "Temperature Rise / Derating": 1, "Ingress (IP67/IP69K)": 2, ESD: 3, "Supply transients": 4, "Transport Vibration + Drop": 5, "Temp/Humidity storage": 6, "Mixed Flowing Gas (MFG)": 7, "Cyclic Corrosion (GMW14872 D)": 8, "Thermal cycling": 9, "Dynamic Load (vibration on mated pair)": 10, "Micro-motion vibration": 11 };
    const startD = new Date(start + "T00:00:00");
    const map = new Map<string, number>();
    dvp.forEach((r) => map.set(r.Test, Math.max(map.get(r.Test) || 0, Number(r.Duration_h || 0))));
    const arr = [...map.entries()].map(([name, d]) => ({ name, d, pr: pr[name] ?? 50 })).sort((a, b) => a.pr - b.pr || a.name.localeCompare(b.name));
    let cur = new Date(startD);
    const out: any[] = [];
    for (const it of arr) {
      const s = new Date(cur);
      const e = new Date(s.getTime() + it.d * 3600 * 1000);
      const off = (s.getTime() - startD.getTime()) / 3600000;
      out.push({ Test: it.name, Duration_h: Math.round(it.d), Offset_h: Math.max(0, off), StartISO: s.toISOString(), EndISO: e.toISOString() });
      cur = new Date(e.getTime() + 2 * 3600 * 1000);
    }
    return out;
  }, [dvp, start]);


  function downloadText(filename: string, text: string, mime = "text/csv;charset=utf-8") {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function csvEscape(value: unknown): string {
    const s = value === null || value === undefined ? "" : String(value);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function toCsv(rows: unknown[][]): string {
    return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  }

  function exportCsvs() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const base = `TestPlan_${(productName || "Product").replace(/\s+/g, "_")}_${date}`;
    const hdr = [
      ["Product", productName],
      ["Category", `${cat} / ${loc}`],
      ["Reliability R", R],
      ["Confidence C", Cc],
      ["Suggested n (zero-failure)", nSuggested],
      ["Streams", streams],
      ["Spares %", sparesPct],
      ["Total with spares", totalWithSpares],
      ["Per stream", perStream],
    ];

    const dvpRows = [
      ...hdr,
      [],
      ["Item", "Failure Mode Addressed", "Test", "Conditions (suggested)", "Duration (h)", "Sample Size (suggested)", "Acceptance Criteria", "Standard Ref"],
      ...dvp.map((r) => [r.Item, r.FailureMode, r.Test, r.Conditions, r.Duration_h, r.SampleSize, r.Acceptance, r.StandardRef]),
    ];

    const seqRows = [
      ["Test", "Duration (h)", "Offset (h)", "Start", "End"],
      ...seq.map((r) => [r.Test, r.Duration_h, r.Offset_h, r.StartISO, r.EndISO]),
    ];

    const fmeaRows = modes.map((m, i) => {
      let S = 7, O = 6, D = 6;
      if (["Brittle fracture", "Thermal runaway", "Dielectric breakdown"].some((x) => m.includes(x))) S = 9;
      if (["Corrosion", "Fretting corrosion", "Humidity", "ECM"].some((x) => m.includes(x))) O = 7;
      const linked = dvp.filter((r) => r.FailureMode === m).map((r) => `${r.Test} (${r.StandardRef})`).join("; ");
      if (linked.length) D = 5;
      return [`${i + 1} / ${productName || "N/A"}`, "Default function (edit)", m, "Performance degradation or functional loss (edit)", S, O, D, S * O * D, linked || "N/A", ""];
    });

    const fmeaTable = [
      ["Item / Subcomponent", "Function", "Potential Failure Mode", "Potential Effects of Failure", "S", "O", "D", "RPN", "Current Controls", "Recommended Actions"],
      ...fmeaRows,
    ];

    downloadText(`${base}_DVP.csv`, toCsv(dvpRows));
    downloadText(`${base}_Test_Sequence.csv`, toCsv(seqRows));
    downloadText(`${base}_FMEA.csv`, toCsv(fmeaTable));
  }


  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <h1 className="text-3xl md:text-4xl font-bold">Test Plan Generator</h1>
      <p className="text-sm text-muted-foreground">Robust Validation: guided flow → DVP&R, Test Sequence, FMEA → CSV export</p>

      {/* Step 1 */}
      <section className="bg-gray-50 rounded-2xl p-6 shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">1) Product / Environment Preset</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Product / Subcomponent</label>
            <input className="w-full border rounded-xl px-3 py-2" placeholder="e.g., Battery" value={productName} onChange={(e) => setProductName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Application Category</label>
            <div className="grid grid-cols-2 gap-2">
              <select className="w-full border rounded-xl px-3 py-2" value={cat} onChange={(e) => { setCat(e.target.value); setLoc(CATEGORIES[e.target.value][0]); }}>
                {cats.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
              <select className="w-full border rounded-xl px-3 py-2" value={loc} onChange={(e) => setLoc(e.target.value)}>
                {(CATEGORIES[cat] || []).map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4 text-sm">
          <div className="p-3 bg-white rounded-xl border">
            <label className="block text-xs text-gray-500">Life target (years)</label>
            <input type="number" className="w-full border rounded-lg px-2 py-1 mt-1" value={life} onChange={(e) => setLife(Number(e.target.value))} />
          </div>

          <div className="p-3 bg-white rounded-xl border">
            <label className="block text-xs text-gray-500">Hours per day</label>
            <input type="number" className="w-full border rounded-lg px-2 py-1 mt-1" value={hpd} onChange={(e) => setHpd(Number(e.target.value))} />
          </div>

          <div className="p-3 bg-white rounded-xl border">
            <label className="block text-xs text-gray-500">Cycles per day</label>
            <input type="number" className="w-full border rounded-lg px-2 py-1 mt-1" value={cpd} onChange={(e) => setCpd(Number(e.target.value))} />
          </div>

          <div className="p-3 bg-white rounded-xl border">
            <label className="block text-xs text-gray-500">Use Tmin (°C)</label>
            <input type="number" className="w-full border rounded-lg px-2 py-1 mt-1" value={Tmin} onChange={(e) => setTmin(Number(e.target.value))} />
          </div>

          <div className="p-3 bg-white rounded-xl border">
            <label className="block text-xs text-gray-500">Use Tmax (°C)</label>
            <input type="number" className="w-full border rounded-lg px-2 py-1 mt-1" value={Tmax} onChange={(e) => setTmax(Number(e.target.value))} />
          </div>

          <div className="p-3 bg-white rounded-xl border">
            <label className="block text-xs text-gray-500">Use RH (%)</label>
            <input type="number" className="w-full border rounded-lg px-2 py-1 mt-1" value={RH} onChange={(e) => setRH(Number(e.target.value))} />
          </div>

          <div className="p-3 bg-white rounded-xl border col-span-2">
            <label className="block text-xs text-gray-500">Effective life</label>
            <div className="mt-1 text-sm space-y-1">
              <div>Hours-based life ≈ <span className="font-semibold">{Math.round(lifeHours).toLocaleString()} h</span></div>
              <div>Cycles-based life ≈ <span className="font-semibold">{Math.round(lifeCycles).toLocaleString()} cycles</span></div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button disabled={!productName} onClick={() => setStep(2)} className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-40">Next →</button>
        </div>
      </section>

      {/* Step 2 */}
      {step >= 2 && (
        <section className="bg-gray-50 rounded-2xl p-6 shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">2) Reliability Target & Sample Planning</h2>
          <div className="grid md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Reliability (R)</label>
              <input type="number" min={0.5} max={0.999} step={0.01} className="w-full border rounded-xl px-3 py-2" value={R} onChange={(e) => setR(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confidence (C)</label>
              <input type="number" min={0.5} max={0.999} step={0.01} className="w-full border rounded-xl px-3 py-2" value={Cc} onChange={(e) => setCc(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Parallel streams</label>
              <input type="number" min={1} className="w-full border rounded-xl px-3 py-2" value={streams} onChange={(e) => setStreams(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Spares (%)</label>
              <input type="number" min={0} className="w-full border rounded-xl px-3 py-2" value={sparesPct} onChange={(e) => setSparesPct(Number(e.target.value))} />
            </div>
          </div>
          <div className="mt-3 grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-white rounded-xl border">Suggested n (zero-failure): <span className="font-bold">{nSuggested}</span></div>
            <div className="p-3 bg-white rounded-xl border">Total with spares: <span className="font-bold">{totalWithSpares}</span></div>
            <div className="p-3 bg-white rounded-xl border">Per stream: <span className="font-bold">{perStream}</span></div>
          </div>

          <div className="mt-6 flex justify-end">
            <button onClick={() => setStep(3)} className="px-4 py-2 rounded-xl bg-black text-white">Next →</button>
          </div>
        </section>
      )}

      {/* Step 3 */}
      {step >= 3 && (
        <section className="bg-gray-50 rounded-2xl p-6 shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">3) Acceleration Knobs</h2>

          <div className="mt-1">
            <label className="block text-sm font-medium mb-2">Stress Domains</label>
            <div className="grid md:grid-cols-3 gap-2">
              {STRESS_DOMAINS.map((d) => (
                <label key={d} className="flex items-center gap-2 bg-white border rounded-xl px-3 py-2 text-sm">
                  <input type="checkbox" checked={domains.includes(d)} onChange={(e) => setDomains((p) => e.target.checked ? [...p, d] : p.filter((x) => x !== d))} />
                  {d}
                </label>
              ))}
            </div>
          </div>

          {domains.includes("Thermal") && (
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              {/* Arrhenius */}
              <div className="bg-white border rounded-xl p-4">
                <h3 className="font-semibold">Arrhenius – Thermal Ageing</h3>
                <label className="block text-xs text-gray-500">T_use (°C)</label>
                <input type="number" className="border rounded px-2 py-1 mt-1 w-full" value={Tuse} onChange={(e) => setTuse(Number(e.target.value))} />
                <label className="block text-xs text-gray-500 mt-3">Accelerated Test Temperature (°C)</label>
                <input type="number" className="border rounded px-2 py-1 mt-1 w-full" value={Ttest} onChange={(e) => setTtest(Number(e.target.value))} />
                <label className="block text-xs text-gray-500 mt-3">Ea (eV)</label>
                <input type="number" step={0.05} className="border rounded px-2 py-1 mt-1 w-full" value={Ea} onChange={(e) => setEa(Number(e.target.value))} />
                <div className="text-sm mt-3">AF ≈ <span className="font-semibold">{AF_arr.toFixed(2)}</span></div>
                <div className="text-sm">Test duration ≈ <span className="font-semibold">{Math.round(durArr).toLocaleString()} h</span></div>
              </div>

              {/* Coffin–Manson */}
              <div className="bg-white border rounded-xl p-4">
                <h3 className="font-semibold">Thermal Cycling – Coffin–Manson</h3>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <label className="flex flex-col">ΔT_use (°C)
                    <input type="number" className="border rounded px-2 py-1" value={dUse} onChange={(e) => setDUse(Number(e.target.value))} />
                  </label>
                  <label className="flex flex-col">ΔT_stress (°C)
                    <input type="number" className="border rounded px-2 py-1" value={dStress} onChange={(e) => setDStress(Number(e.target.value))} />
                  </label>
                  <label className="flex items-center gap-2 col-span-2 text-xs">
                    <input type="checkbox" checked={link} onChange={(e) => setLink(e.target.checked)} />
                    Keep ΔT_stress = ΔT_use + 20 °C
                  </label>
                  <label className="flex flex-col">M (2–6 typical)
                    <input type="number" step={0.1} className="border rounded px-2 py-1" value={M} onChange={(e) => setM(Number(e.target.value))} />
                  </label>
                  <label className="flex flex-col">Ramp (°C/min)
                    <input type="number" className="border rounded px-2 py-1" value={ramp} onChange={(e) => setRamp(Number(e.target.value))} />
                  </label>
                  <label className="flex flex-col">Dwell hot (min)
                    <input type="number" className="border rounded px-2 py-1" value={dHot} onChange={(e) => setDHot(Number(e.target.value))} />
                  </label>
                  <label className="flex flex-col">Dwell cold (min)
                    <input type="number" className="border rounded px-2 py-1" value={dCold} onChange={(e) => setDCold(Number(e.target.value))} />
                  </label>
                  <div className="col-span-2">Cycle time ≈ <span className="font-semibold">{cycleMin.toFixed(1)} min</span></div>
                </div>
                <div className="text-sm mt-3">AF_CM = (ΔT_use/ΔT_stress)^{M.toFixed(1)} ≈ <span className="font-semibold">{AF_cm.toFixed(3)}</span></div>
                <div className="text-sm">N_use ≈ <span className="font-semibold">{Nuse.toLocaleString()}</span> → N_acc ≈ <span className="font-semibold">{Nacc.toLocaleString()}</span></div>
                <div className="text-sm">Estimated test time ≈ <span className="font-semibold">{Math.round(cmHours).toLocaleString()}</span> h</div>
              </div>

              {/* Peck */}
              <div className="bg-white border rounded-xl p-4">
                <h3 className="font-semibold">Arrhenius–Peck (Humidity)</h3>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <label className="flex flex-col">T_use (°C)
                    <input type="number" className="border rounded px-2 py-1" value={Tuse} onChange={(e) => setTuse(Number(e.target.value))} />
                  </label>
                  <label className="flex flex-col">T_test (°C)
                    <input type="number" className="border rounded px-2 py-1" value={Tpeck} onChange={(e) => setTpeck(Number(e.target.value))} />
                  </label>
                  <label className="flex flex-col">RH_use (%)
                    <input type="number" className="border rounded px-2 py-1" value={RHuse} onChange={(e) => setRHuse(Number(e.target.value))} />
                  </label>
                  <label className="flex flex-col">RH_test (%)
                    <input type="number" className="border rounded px-2 py-1" value={RHtest} onChange={(e) => setRHtest(Number(e.target.value))} />
                  </label>
                  <label className="flex flex-col">Ea (eV)
                    <input type="number" step={0.05} className="border rounded px-2 py-1" value={Ea} onChange={(e) => setEa(Number(e.target.value))} />
                  </label>
                  <label className="flex flex-col">Peck n
                    <input type="number" step={0.1} className="border rounded px-2 py-1" value={nPeck} onChange={(e) => setNPeck(Number(e.target.value))} />
                  </label>
                </div>
                <div className="text-sm mt-3">AF (Peck) ≈ <span className="font-semibold">{AF_pe.toFixed(2)}</span></div>
                <div className="text-sm">Test duration ≈ <span className="font-semibold">{Math.round(durPe).toLocaleString()} h</span></div>
              </div>
            </div>
          )}

          {domains.includes("Mechanical Vibration") && (
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <div className="bg-white border rounded-xl p-4">
                <h3 className="font-semibold">Mechanical Vibration – AF</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <label className="flex flex-col">Grms (use)
                    <input type="number" className="border rounded px-2 py-1" value={grmsUse} onChange={(e) => setGrmsUse(Number(e.target.value))} />
                  </label>
                  <label className="flex flex-col">Grms (test)
                    <input type="number" className="border rounded px-2 py-1" value={grmsTest} onChange={(e) => setGrmsTest(Number(e.target.value))} />
                  </label>
                  <label className="flex flex-col">Exponent b
                    <input type="number" step={0.1} className="border rounded px-2 py-1" value={vibExpB} onChange={(e) => setVibExpB(Number(e.target.value))} />
                  </label>
                </div>
                <div className="text-sm mt-3">AF_vib ≈ <span className="font-semibold">{AF_vib.toFixed(2)}</span></div>
                <div className="text-sm">Suggested vibration duration ≈ <span className="font-semibold">{Math.round(durVib).toLocaleString()}</span> h</div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button onClick={() => setStep(4)} className="px-4 py-2 rounded-xl bg-black text-white">Next →</button>
          </div>
        </section>
      )}

      {/* Step 4 */}
      {step >= 4 && (
        <section className="bg-gray-50 rounded-2xl p-6 shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">4) Materials & Failure Modes</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Materials (multi-select)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-auto pr-1">
                {mats.map((m) => (
                  <label key={m} className="flex items-center gap-2 bg-white border rounded-xl px-3 py-2 text-sm">
                    <input type="checkbox" checked={selM.includes(m)} onChange={(e) => setSelM((p) => e.target.checked ? Array.from(new Set([...p, m])) : p.filter((x) => x !== m))} />
                    {m}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Suggested Modes</label>
              <div className="text-sm bg-white border rounded-xl p-3 min-h-[3rem]">{sugModes.join(", ") || "—"}</div>
              <label className="block text-sm font-medium mt-3">Add custom modes (comma-separated)</label>
              <input className="w-full border rounded-xl px-3 py-2" placeholder="e.g., dielectric breakdown" value={custom} onChange={(e) => setCustom(e.target.value)} />
              <div className="text-sm mt-2">All modes: <span className="font-semibold">{modes.join(", ") || "—"}</span></div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button onClick={() => setStep(5)} className="px-4 py-2 rounded-xl bg-black text-white">Next →</button>
          </div>
        </section>
      )}

      {/* Step 5 – Previews */}
      {step >= 5 && (
        <section className="bg-gray-50 rounded-2xl p-6 shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Preview – DVP&R</h2>
          <div className="overflow-auto border rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {["Item", "Failure Mode", "Test", "Conditions", "Duration (h)", "Sample Size", "Acceptance", "Standard"].map((h) => (
                    <th key={h} className="text-left p-2 border-b">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dvp.map((r, i) => (
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
              <input type="date" className="border rounded-lg px-3 py-2" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="overflow-auto border rounded-xl">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    {["Test", "Duration (h)", "Offset (h)", "Start", "End"].map((h) => (
                      <th key={h} className="text-left p-2 border-b">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {seq.map((r, i) => (
                    <tr key={i} className="odd:bg-white even:bg-gray-50">
                      <td className="p-2 border-b align-top">{r.Test}</td>
                      <td className="p-2 border-b align-top">{r.Duration_h}</td>
                      <td className="p-2 border-b align-top">{r.Offset_h}</td>
                      <td className="p-2 border-b align-top">{r.StartISO.replace("T", " ").slice(0, 16)}</td>
                      <td className="p-2 border-b align-top">{r.EndISO.replace("T", " ").slice(0, 16)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seq.map((r) => ({ name: r.Test, offset: r.Offset_h, duration: r.Duration_h }))} layout="vertical" margin={{ left: 80, right: 20, top: 10, bottom: 10 }}>
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
                  {["Item/Subcomponent", "Function", "Potential Failure Mode", "Potential Effects", "S", "O", "D", "RPN", "Current Controls", "Recommended Actions"].map((h) => (
                    <th key={h} className="text-left p-2 border-b">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modes.map((m, i) => {
                  let S = 7, O = 6, D = 6;
                  if (["Brittle fracture", "Thermal runaway", "Dielectric breakdown"].some((x) => m.includes(x))) S = 9;
                  if (["Corrosion", "Fretting corrosion", "Humidity", "ECM"].some((x) => m.includes(x))) O = 7;
                  const linked = dvp.filter((r) => r.FailureMode === m).map((r) => `${r.Test} (${r.StandardRef})`).join("; ");
                  if (linked.length) D = 5;
                  const RPN = S * O * D;
                  return (
                    <tr key={i} className="odd:bg-white even:bg-gray-50">
                      <td className="p-2 border-b align-top">{i + 1} / {productName || "—"}</td>
                      <td className="p-2 border-b align-top">Default function (edit)</td>
                      <td className="p-2 border-b align-top">{m}</td>
                      <td className="p-2 border-b align-top">Performance degradation or functional loss (edit)</td>
                      <td className="p-2 border-b align-top">{S}</td>
                      <td className="p-2 border-b align-top">{O}</td>
                      <td className="p-2 border-b align-top">{D}</td>
                      <td className="p-2 border-b align-top font-semibold">{RPN}</td>
                      <td className="p-2 border-b align-top whitespace-pre-wrap">{linked || "—"}</td>
                      <td className="p-2 border-b align-top"></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={exportCsvs} className="px-4 py-2 rounded-xl bg-black text-white shadow hover:opacity-90">Download CSVs</button>
            <span className="text-xs text-gray-500">3 files: DVP, Test_Sequence, FMEA. Durations come from your acceleration knobs & selections.</span>
          </div>
        </section>
      )}
    </div>
  );
}
