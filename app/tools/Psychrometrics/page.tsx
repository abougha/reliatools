"use client";

import React, { useMemo, useRef, useState } from "react";
import "katex/dist/katex.min.css";
import * as katex from "katex";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Scatter,
  Customized,
} from "recharts";

// =============================
// Psychrometrics (SI internal)
// =============================

const EPS = 0.62198; // Mw/Mda
const R_DA = 0.287042; // kPa·m³/(kg·K)

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

const CtoF = (Tc: number) => (Tc * 9) / 5 + 32;
const FtoC = (Tf: number) => ((Tf - 32) * 5) / 9;

// 1 kJ/kg = 0.429922614 Btu/lb
const KJ_PER_KG_TO_BTU_PER_LB = 0.429922614;

// Magnus equation (kPa), T in °C (HVAC-range approximation)
const pws_kpa = (T_C: number) => 0.61094 * Math.exp((17.625 * T_C) / (T_C + 243.04));

const humidityRatioFromPw = (Pw_kPa: number, P_kPa: number) => EPS * (Pw_kPa / (P_kPa - Pw_kPa));

const enthalpy_kJ_per_kgda = (T_C: number, W: number) => 1.006 * T_C + W * (2501 + 1.86 * T_C);

const specificVolume_m3_per_kgda = (T_C: number, W: number, P_kPa: number) =>
  (R_DA * (T_C + 273.15) * (1 + 1.607 * W)) / P_kPa;

// Invert Magnus to compute dew point from vapor pressure Pw (kPa)
const dewPointFromPw_C = (Pw_kPa: number) => {
  if (!(Pw_kPa > 0)) return NaN;
  const ln = Math.log(Pw_kPa / 0.61094);
  return (243.04 * ln) / (17.625 - ln);
};

// Wet-bulb temperature approximation (Stull, 2011). Inputs: T in °C, RH in %.
const wetBulb_C_Stull = (T_C: number, RH_pct: number) => {
  if (!isFinite(T_C) || !isFinite(RH_pct)) return NaN;
  const RH = clamp(RH_pct, 0, 100);
  const Tw =
    T_C * Math.atan(0.151977 * Math.sqrt(RH + 8.313659)) +
    Math.atan(T_C + RH) -
    Math.atan(RH - 1.676331) +
    0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) -
    4.686035;
  return Tw;
};

// =============================
// KaTeX
// =============================

function KatexBlock({ latex }: { latex: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode: true,
        throwOnError: false,
        strict: "ignore",
      });
    } catch {
      return `<div style="color:#b91c1c">Failed to render equation.</div>`;
    }
  }, [latex]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// =============================
// Dev-only self tests
// =============================

function runSelfTests() {
  const a = 25;
  const b = CtoF(a);
  const c = FtoC(b);
  console.assert(Math.abs(a - c) < 1e-9, "C<->F conversion roundtrip failed");

  const p1 = pws_kpa(0);
  const p2 = pws_kpa(20);
  console.assert(p2 > p1, "pws(T) should be increasing");

  const W = humidityRatioFromPw(1.0, 101.325);
  console.assert(isFinite(W) && W > 0, "humidityRatioFromPw should be finite and positive");
}

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  runSelfTests();
}

// =============================
// Component
// =============================

export default function PsychrometricsCalculator() {
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");
  const [Tdb, setTdb] = useState("25");
  const [RH, setRH] = useState("50");
  const [P, setP] = useState("101.325");

  // Requested display x-axis:
  // - In °F mode: 10 → 120 (per your request)
  // - In °C mode: we MUST cap below boiling at 1 atm (P≈101 kPa), otherwise pws>P and Wsat becomes negative/invalid.
  //   Classic 1-atm psychrometric charts typically top out around ~50–60°C.
  const axis = useMemo(() => {
    if (tempUnit === "F") {
      return {
        TminDisp: 10,
        TmaxDisp: 120,
        xTicks: Array.from({ length: 12 }, (_, i) => 10 + i * 10),
      };
    }
    // °C
    return {
      TminDisp: 10,
      TmaxDisp: 55,
      xTicks: [10, 20, 30, 40, 50, 55],
    };
  }, [tempUnit]);

  const TminDisp = axis.TminDisp;
  const TmaxDisp = axis.TmaxDisp;
  const xTicks = axis.xTicks;

  const Wmax = 30; // g/kg

  const PkPa = useMemo(() => parseFloat(P), [P]);

  const toC = (xDisp: number) => (tempUnit === "C" ? xDisp : FtoC(xDisp));
  const toDisp = (Tc: number) => (tempUnit === "C" ? Tc : CtoF(Tc));

  // Live computation (internal SI)
  const computed = useMemo(() => {
    const TinDisp = parseFloat(Tdb);
    const Tc = toC(TinDisp);
    const RH_pct = parseFloat(RH);

    if (!isFinite(Tc) || !isFinite(RH_pct) || !isFinite(PkPa) || PkPa <= 0) return null;

    const phi = clamp(RH_pct / 100, 0, 1);
    const pws = pws_kpa(Tc);
    const Pw = clamp(phi * pws, 0, 0.999 * PkPa);
    const W = humidityRatioFromPw(Pw, PkPa);

    const h_kj = enthalpy_kJ_per_kgda(Tc, W);
    const v = specificVolume_m3_per_kgda(Tc, W, PkPa);
    const TdpC = dewPointFromPw_C(Pw);
    const TwbC = wetBulb_C_Stull(Tc, RH_pct);

    return {
      Tc,
      Tdisp: TinDisp,
      RH_pct,
      phi,
      pws,
      Pw,
      W,
      W_gpkg: W * 1000,
      h_kj,
      h_ip: h_kj * KJ_PER_KG_TO_BTU_PER_LB,
      v,
      TdpDisp: toDisp(TdpC),
      TwbDisp: toDisp(TwbC),
    };
  }, [Tdb, RH, PkPa, tempUnit]);

  // Snapshot updates only on Calculate
  const [results, setResults] = useState<null | typeof computed>(null);
  const onCalculate = () => setResults(computed);
  const onClear = () => setResults(null);

  const chartRef = useRef<HTMLDivElement | null>(null);

  const exportSvg = () => {
    const root = chartRef.current;
    if (!root) return;
    const svg = root.querySelector("svg");
    if (!svg) return;

    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("x", "0");
    bg.setAttribute("y", "0");
    bg.setAttribute("width", "100%");
    bg.setAttribute("height", "100%");
    bg.setAttribute("fill", "white");
    clone.insertBefore(bg, clone.firstChild);

    const xml = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "psychrometric-chart.svg";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  };

  // Chart base data: saturation + RH families
  const chartData = useMemo(() => {
    if (!isFinite(PkPa) || PkPa <= 0) return [] as any[];

    const data: any[] = [];
    for (let x = TminDisp; x <= TmaxDisp; x += 1) {
      const Tc = toC(x);
      const pws = pws_kpa(Tc);
      const row: any = { x };

      row.Wsat = humidityRatioFromPw(pws, PkPa) * 1000;
      for (let r = 10; r <= 100; r += 10) {
        row[`RH${r}`] = humidityRatioFromPw((r / 100) * pws, PkPa) * 1000;
      }
      data.push(row);
    }
    return data;
  }, [PkPa, tempUnit]);

  // Enthalpy families (lines)
  const enthalpyLines = useMemo(() => {
    if (!isFinite(PkPa) || PkPa <= 0) return [] as any[];

    // Enthalpy families:
    // - In °C mode we label in kJ/kgda (nice round values)
    // - In °F mode you asked for 5, 10, 15… Btu/lbda
    const hList_kj = (tempUnit === "C"
      ? [10, 20, 30, 40, 50, 60, 70, 80, 90]
      : [5, 10, 15, 20, 25, 30, 35, 40, 45].map((btu) => btu / KJ_PER_KG_TO_BTU_PER_LB)
    );

    return hList_kj.map((h_kj) => {
      const data: Array<{ x: number; W: number }> = [];
      for (let x = TminDisp; x <= TmaxDisp; x += 1) {
        const Tc = toC(x);
        const denom = 2501 + 1.86 * Tc;
        if (denom <= 0) continue;

        const W = (h_kj - 1.006 * Tc) / denom; // kg/kg
        const Wg = W * 1000;
        if (!isFinite(Wg) || Wg < 0) continue;

        const Wsat = humidityRatioFromPw(pws_kpa(Tc), PkPa) * 1000;
        if (Wg <= Wsat + 1e-6 && Wg <= Wmax + 0.5) data.push({ x, W: Wg });
      }
      return { h_kj, h_ip: h_kj * KJ_PER_KG_TO_BTU_PER_LB, data };
    });
  }, [PkPa, tempUnit]);

  // Highlighted enthalpy line through calculated result
  const highlightedEnthalpy = useMemo(() => {
    if (!results || !isFinite(PkPa) || PkPa <= 0) return null;

    const h_kj = results.h_kj;
    const data: Array<{ x: number; W: number }> = [];

    for (let x = TminDisp; x <= TmaxDisp; x += 1) {
      const Tc = toC(x);
      const denom = 2501 + 1.86 * Tc;
      if (denom <= 0) continue;

      const W = (h_kj - 1.006 * Tc) / denom;
      const Wg = W * 1000;
      if (!isFinite(Wg) || Wg < 0) continue;

      const Wsat = humidityRatioFromPw(pws_kpa(Tc), PkPa) * 1000;
      if (Wg <= Wsat + 1e-6 && Wg <= Wmax + 0.5) data.push({ x, W: Wg });
    }

    return { h_kj, h_ip: h_kj * KJ_PER_KG_TO_BTU_PER_LB, data };
  }, [results, PkPa, tempUnit]);

  // RH label x-positions: find x where each RH curve is closest to a top band, then draw label above saturation
  const rhTopTicks = useMemo(() => {
    if (!isFinite(PkPa) || PkPa <= 0) return [] as Array<{ rh: number; x: number }>;

    const rhs = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const W_top = Math.min(Wmax - 1.2, 26); // g/kg

    const findXForRH = (rhPct: number) => {
      let bestX = NaN;
      let bestErr = Number.POSITIVE_INFINITY;

      for (let x = TminDisp; x <= TmaxDisp; x += 0.25) {
        const Tc = toC(x);
        const pws = pws_kpa(Tc);
        const Wg = humidityRatioFromPw((rhPct / 100) * pws, PkPa) * 1000;
        if (!isFinite(Wg) || Wg < 0 || Wg > Wmax) continue;
        const err = Math.abs(Wg - W_top);
        if (err < bestErr) {
          bestErr = err;
          bestX = x;
        }
      }

      if (!isFinite(bestX)) bestX = TmaxDisp - 2;
      return clamp(bestX, TminDisp + 2, TmaxDisp - 2);
    };

    return rhs.map((rh) => ({ rh, x: findXForRH(rh) }));
  }, [PkPa, tempUnit]);

  // Enthalpy label points on saturation curve: find T where h(T, Wsat(T)) ≈ target
  const enthalpyLabelsOnSat = useMemo(() => {
    if (!isFinite(PkPa) || PkPa <= 0) return [] as Array<{ h_kj: number; h_ip: number; x: number; W: number }>;

    // Enthalpy families:
    // - In °C mode we label in kJ/kgda (nice round values)
    // - In °F mode you asked for 5, 10, 15… Btu/lbda
    const hList_kj = (tempUnit === "C"
      ? [10, 20, 30, 40, 50, 60, 70, 80, 90]
      : [5, 10, 15, 20, 25, 30, 35, 40, 45].map((btu) => btu / KJ_PER_KG_TO_BTU_PER_LB)
    );

    const solvePointForH = (h_kj: number) => {
      let bestX = NaN;
      let bestW = NaN;
      let bestErr = Number.POSITIVE_INFINITY;

      for (let x = TminDisp; x <= TmaxDisp; x += 0.25) {
        const Tc = toC(x);
        const Wsat = humidityRatioFromPw(pws_kpa(Tc), PkPa); // kg/kg
        const hsat = enthalpy_kJ_per_kgda(Tc, Wsat);
        const err = Math.abs(hsat - h_kj);
        const Wg = Wsat * 1000;
        if (!isFinite(Wg) || Wg < 0 || Wg > Wmax) continue;
        if (err < bestErr) {
          bestErr = err;
          bestX = x;
          bestW = Wg;
        }
      }

      return { x: bestX, W: bestW };
    };

    return hList_kj
      .map((h_kj) => {
        const sol = solvePointForH(h_kj);
        return { h_kj, h_ip: h_kj * KJ_PER_KG_TO_BTU_PER_LB, x: sol.x, W: sol.W };
      })
      .filter((p) => isFinite(p.x) && isFinite(p.W));
  }, [PkPa, tempUnit]);

  // Chart overlay labels
  const InlineLabels = ({ xAxisMap, yAxisMap }: any) => {
    const xFirst = Object.values(xAxisMap ?? {})[0] as any;
    const yFirst = Object.values(yAxisMap ?? {})[0] as any;
    const xScale = xFirst?.scale;
    const yScale = yFirst?.scale;
    if (!xScale || !yScale) return null;

    const slopeAngleDeg = (x1: number, y1: number, x2: number, y2: number) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      return (Math.atan2(dy, dx) * 180) / Math.PI;
    };

    // Small helper to get saturation W at an x
    const satW = (x: number) => {
      const Tc = toC(x);
      return humidityRatioFromPw(pws_kpa(Tc), PkPa) * 1000;
    };

    return (
      <g>
        {/* RH labels placed along the upper boundary like classic charts */}
        {rhTopTicks.map(({ rh, x }) => {
          const xpx = xScale(x);

          const Wsat = satW(x);
          const yW = Math.min(Wsat + 0.8, Wmax - 0.2);
          const ypx = yScale(yW);

          const x2 = Math.min(x + 1, TmaxDisp);
          const yW2 = Math.min(satW(x2) + 0.8, Wmax - 0.2);
          const ang = slopeAngleDeg(xpx, ypx, xScale(x2), yScale(yW2));

          return (
            <text
              key={`rh-top-${rh}`}
              x={xpx}
              y={ypx}
              fontSize={10}
              fill="#111827"
              textAnchor="middle"
              transform={`rotate(${ang} ${xpx} ${ypx})`}
            >
              {rh}%
            </text>
          );
        })}

        {/* Enthalpy values along the 100% RH curve (value only; units once on last label) */}
        {enthalpyLabelsOnSat.map((pt, i) => {
          const xpx = xScale(pt.x);
          const ypx = yScale(pt.W);

          const x2 = Math.min(pt.x + 1, TmaxDisp);
          const ang = slopeAngleDeg(xpx, ypx, xScale(x2), yScale(satW(x2)));

          const isLast = i === enthalpyLabelsOnSat.length - 1;
          const value = tempUnit === "C" ? Math.round(pt.h_kj) : Math.round(pt.h_ip);
          const unit = tempUnit === "C" ? "kJ/kgda" : "Btu/lbda";
          const label = isLast ? `${value} ${unit}` : `${value}`;

          const ox = -10;
          const oy = -6;

          return (
            <text
              key={`h-sat-${pt.h_kj}`}
              x={xpx + ox}
              y={ypx + oy}
              fontSize={10}
              fill="#111827"
              opacity={0.95}
              transform={`rotate(${ang} ${xpx + ox} ${ypx + oy})`}
            >
              {label}
            </text>
          );
        })}

        {/* Blue label for calculated enthalpy line */}
        {highlightedEnthalpy &&
          (() => {
            const pts = highlightedEnthalpy.data as Array<{ x: number; W: number }>;
            if (!pts || pts.length < 2) return null;
            const mid = pts[Math.floor(pts.length * 0.5)];
            if (!mid) return null;

            const x = xScale(mid.x) - 12;
            const y = yScale(mid.W) + 10;

            const label = tempUnit === "C" ? `h=${highlightedEnthalpy.h_kj.toFixed(0)}` : `h=${highlightedEnthalpy.h_ip.toFixed(0)}`;

            return (
              <text x={x} y={y} fontSize={11} fill="#2563EB" fontWeight={600} transform={`rotate(-45 ${x} ${y})`}>
                {label}
              </text>
            );
          })()}

        {/* Titles like the reference */}
        <text
          x={xScale((TminDisp + TmaxDisp) / 2)}
          y={yScale(Wmax - 0.2)}
          fontSize={12}
          fill="#111827"
          opacity={0.9}
          transform={`rotate(-20 ${xScale((TminDisp + TmaxDisp) / 2)} ${yScale(Wmax - 0.2)})`}
          textAnchor="middle"
        >
          Relative Humidity
        </text>

        <text
          x={xScale(TminDisp + 12)}
          y={yScale(Wmax - 3)}
          fontSize={12}
          fill="#111827"
          opacity={0.9}
          transform={`rotate(-55 ${xScale(TminDisp + 12)} ${yScale(Wmax - 3)})`}
          textAnchor="middle"
        >
          Enthalpy
        </text>

        <text x={xScale(TminDisp + 2)} y={yScale(Wmax) + 12} fontSize={12} fill="#111827" opacity={0.7}>
          g water / kg dry air
        </text>
      </g>
    );
  };

  const point = useMemo(() => {
    if (!results) return null;
    return { x: results.Tdisp, W: results.W_gpkg };
  }, [results]);

  const toggleUnit = (next: "C" | "F") => {
    if (next === tempUnit) return;

    const val = parseFloat(Tdb);
    if (!isFinite(val)) {
      setTempUnit(next);
      return;
    }

    const newVal = next === "F" ? CtoF(val) : FtoC(val);
    setTempUnit(next);
    setTdb(newVal.toFixed(2));
    setResults(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Psychrometric Calculator</h1>

      <div className="bg-gray-50 p-4 rounded mb-6 border">
        <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
          <div className="flex-1">
            <KatexBlock latex={"W = 0.62198\\,\\frac{p_{w}}{P - p_{w}}"} />
            <ul className="text-sm text-gray-700 mt-2 space-y-1">
              <li>
                <strong>T</strong> = Dry-bulb temperature (°{tempUnit})
              </li>
              <li>
                <strong>RH</strong> = Relative humidity (%)
              </li>
              <li>
                <strong>P</strong> = Atmospheric pressure (kPa)
              </li>
              <li>
                <strong>p</strong>
                <sub>w</sub> = Water vapor partial pressure (kPa)
              </li>
              <li>
                <strong>W</strong> = Humidity ratio (kg/kg dry air)
              </li>
            </ul>
            <p className="text-xs text-gray-500 mt-2 italic">
              RH labels are placed along the upper boundary with non-uniform spacing; enthalpy values are labeled along the
              100% RH (saturation) curve like classic psychrometric charts.
            </p>
          </div>
        </div>
      </div>

      {/* Unit toggle */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-700">Temperature unit:</span>
        <div className="inline-flex rounded border overflow-hidden">
          <button
            onClick={() => toggleUnit("C")}
            className={`px-3 py-1 text-sm ${tempUnit === "C" ? "bg-gray-900 text-white" : "bg-white text-gray-800 hover:bg-gray-50"}`}
          >
            °C
          </button>
          <button
            onClick={() => toggleUnit("F")}
            className={`px-3 py-1 text-sm ${tempUnit === "F" ? "bg-gray-900 text-white" : "bg-white text-gray-800 hover:bg-gray-50"}`}
          >
            °F
          </button>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { l: `Dry-bulb (°${tempUnit})`, v: Tdb, s: setTdb },
          { l: "RH (%)", v: RH, s: setRH },
          { l: "Pressure (kPa)", v: P, s: setP },
        ].map(({ l, v, s }) => (
          <label key={l} className="block text-sm">
            {l}
            <input value={v} onChange={(e) => s(e.target.value)} type="number" className="w-full p-2 border rounded mt-1" />
          </label>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onCalculate}
          disabled={!computed}
          className={`px-4 py-2 rounded font-medium border shadow-sm ${computed ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-500"}`}
        >
          Calculate
        </button>
        <button
          onClick={onClear}
          disabled={!results}
          className={`px-4 py-2 rounded font-medium border shadow-sm ${results ? "bg-white text-gray-800 hover:bg-gray-50" : "bg-gray-100 text-gray-400"}`}
        >
          Clear
        </button>
        <button
          onClick={exportSvg}
          className="px-4 py-2 rounded font-medium border shadow-sm bg-white text-gray-800 hover:bg-gray-50"
          title="Download the chart as an SVG (great for reports)"
        >
          Export SVG
        </button>
        <div className="text-sm text-gray-600">
          {results ? (
            <span>
              Plotted: <strong>{results.Tdisp.toFixed(1)}°{tempUnit}</strong>, <strong>{results.RH_pct.toFixed(0)}%</strong>
            </span>
          ) : (
            <span>
              Enter inputs and click <strong>Calculate</strong> to plot.
            </span>
          )}
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="mt-2 p-4 border-l-4 border-blue-500 bg-blue-50 text-blue-800 rounded">
          <p className="font-semibold">Humidity ratio: {results.W.toExponential(3)} kg/kg ({results.W_gpkg.toFixed(2)} g/kg)</p>
          <p className="text-sm">Enthalpy: {tempUnit === "C" ? `${results.h_kj.toFixed(1)} kJ/kgda` : `${results.h_ip.toFixed(1)} Btu/lbda`}</p>
          <p className="text-sm">Specific volume: {results.v.toFixed(3)} m³/kgda</p>
          <p className="text-sm">Saturation pressure pws: {results.pws.toFixed(3)} kPa</p>
          <p className="text-sm">Vapor pressure pw: {results.Pw.toFixed(3)} kPa</p>
          <p className="text-sm">Dew point: {isFinite(results.TdpDisp) ? results.TdpDisp.toFixed(1) : "—"} °{tempUnit}</p>
          <p className="text-sm">Wet-bulb (approx): {isFinite(results.TwbDisp) ? results.TwbDisp.toFixed(1) : "—"} °{tempUnit}</p>
        </div>
      )}

      {/* Chart */}
      <div ref={chartRef} className="mt-8 h-[620px] bg-white p-4 border rounded shadow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 18, right: 20, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              domain={[TminDisp, TmaxDisp]}
              type="number"
              ticks={xTicks}
              label={{ value: `Dry bulb temperature (°${tempUnit})`, position: "insideBottom", offset: -5 }}
            />
            <YAxis domain={[0, Wmax]} type="number" tickCount={7} label={{ value: "g water / kg dry air", angle: -90, position: "insideLeft" }} />

            <Customized component={InlineLabels} />

            {/* Saturation */}
            <Line dataKey="Wsat" stroke="#111827" strokeWidth={2} dot={false} isAnimationActive={false} />

            {/* RH families */}
            {Array.from({ length: 10 }, (_, i) => (i + 1) * 10).map((r) => (
              <Line key={`rh-${r}`} dataKey={`RH${r}`} stroke="#111827" strokeWidth={1} dot={false} isAnimationActive={false} />
            ))}

            {/* Enthalpy families */}
            {enthalpyLines.map((L: any) => (
              <Line key={`h-${L.h_kj}`} data={L.data} dataKey="W" stroke="#111827" strokeWidth={1} dot={false} isAnimationActive={false} />
            ))}

            {/* Calculated enthalpy line */}
            {highlightedEnthalpy && (
              <Line data={highlightedEnthalpy.data} dataKey="W" stroke="#2563EB" strokeWidth={2} dot={false} isAnimationActive={false} />
            )}

            {/* Point */}
            {point && <Scatter data={[point]} dataKey="W" fill="#2563EB" isAnimationActive={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
