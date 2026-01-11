"use client";

import React, { useMemo, useState } from "react";
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
// KaTeX block
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
// Dev-only self tests (lightweight)
// =============================

function runSelfTests() {
  // Unit conversion round-trip
  const a = 25;
  const b = CtoF(a);
  const c = FtoC(b);
  console.assert(Math.abs(a - c) < 1e-9, "C<->F conversion roundtrip failed");

  // Saturation pressure should increase with temperature in normal range
  const p1 = pws_kpa(0);
  const p2 = pws_kpa(20);
  console.assert(p2 > p1, "pws(T) should be increasing");

  // Humidity ratio should be finite for sane inputs
  const W = humidityRatioFromPw(1.0, 101.325);
  console.assert(isFinite(W) && W > 0, "humidityRatioFromPw should be finite and positive");
}

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  // run once per module load in dev
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

  // Display-domain bounds
  const TminC = -10;
  const TmaxC = 55;
  const TminDisp = tempUnit === "C" ? TminC : CtoF(TminC);
  const TmaxDisp = tempUnit === "C" ? TmaxC : CtoF(TmaxC);

  const Wmax = 30; // g/kg (display)

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
      W, // kg/kg
      W_gpkg: W * 1000,
      h_kj,
      h_ip: h_kj * KJ_PER_KG_TO_BTU_PER_LB,
      v,
      TdpC,
      TdpDisp: toDisp(TdpC),
      TwbC,
      TwbDisp: toDisp(TwbC),
    };
  }, [Tdb, RH, PkPa, tempUnit]);

  // Snapshot only updates when user clicks Calculate
  const [results, setResults] = useState<null | typeof computed>(null);
  const onCalculate = () => setResults(computed);
  const onClear = () => setResults(null);

  // Base chart field (x in display units)
  const chartData = useMemo(() => {
    if (!isFinite(PkPa) || PkPa <= 0) return [] as any[];

    const data: any[] = [];
    for (let x = TminDisp; x <= TmaxDisp; x += 1) {
      const Tc = toC(x);
      const pws = pws_kpa(Tc);
      const row: any = { x };

      const Wsat = humidityRatioFromPw(pws, PkPa) * 1000;
      row.Wsat = Wsat;

      for (let r = 10; r <= 100; r += 10) {
        row[`RH${r}`] = humidityRatioFromPw((r / 100) * pws, PkPa) * 1000;
      }

      data.push(row);
    }
    return data;
  }, [PkPa, tempUnit, TminDisp, TmaxDisp]);

  // Enthalpy families (constant h in kJ/kgda internally)
  const enthalpyLines = useMemo(() => {
    if (!isFinite(PkPa) || PkPa <= 0) return [] as any[];

    const hList_kj = [10, 20, 30, 40, 50, 60, 70, 80, 90];

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
      return {
        h_kj,
        h_ip: h_kj * KJ_PER_KG_TO_BTU_PER_LB,
        data,
      };
    });
  }, [PkPa, tempUnit, TminDisp, TmaxDisp]);

  // Wet-bulb families (approx): constant wet-bulb corresponds ~ constant enthalpy = saturated enthalpy at Twb.
  const wetBulbLines = useMemo(() => {
    if (!isFinite(PkPa) || PkPa <= 0) return [] as any[];

    const TwbListC = [-5, 0, 5, 10, 15, 20, 25, 30, 35];

    return TwbListC.map((TwbC) => {
      const Wsat_wb = humidityRatioFromPw(pws_kpa(TwbC), PkPa); // kg/kg
      const hStar = enthalpy_kJ_per_kgda(TwbC, Wsat_wb);

      const data: Array<{ x: number; W: number }> = [];
      for (let x = TminDisp; x <= TmaxDisp; x += 1) {
        const Tc = toC(x);
        const denom = 2501 + 1.86 * Tc;
        if (denom <= 0) continue;

        const W = (hStar - 1.006 * Tc) / denom; // kg/kg
        const Wg = W * 1000;
        if (!isFinite(Wg) || Wg < 0) continue;

        const Wsat = humidityRatioFromPw(pws_kpa(Tc), PkPa) * 1000;
        if (Wg <= Wsat + 1e-6 && Wg <= Wmax + 0.5) data.push({ x, W: Wg });
      }

      return {
        TwbC,
        TwbDisp: toDisp(TwbC),
        data,
      };
    });
  }, [PkPa, tempUnit, TminDisp, TmaxDisp]);

  // Highlighted constant-enthalpy line through the calculated result (drawn in blue)
  const highlightedEnthalpy = useMemo(() => {
    if (!results || !isFinite(PkPa) || PkPa <= 0) return null;

    const h_kj = results.h_kj;
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

    return {
      h_kj,
      h_ip: h_kj * KJ_PER_KG_TO_BTU_PER_LB,
      data,
    };
  }, [results, PkPa, tempUnit, TminDisp, TmaxDisp]);

  // Static labels drawn directly on the chart
  const InlineLabels = ({ xAxisMap, yAxisMap }: any) => {
    const xMap = xAxisMap ?? {};
    const yMap = yAxisMap ?? {};
    const xFirst = Object.values(xMap)[0] as any;
    const yFirst = Object.values(yMap)[0] as any;
    const xScale = xFirst?.scale;
    const yScale = yFirst?.scale;

    if (!xScale || !yScale || !chartData.length) return null;

    // Pick a label x near upper-right in DISPLAY units
    const labelX = tempUnit === "C" ? 48 : CtoF(48);
    const labelTc = toC(labelX);

    return (
      <g>
        {/* Enthalpy scale (IP mode): sloped ruler for reading h in Btu/lbda */}
        {tempUnit === "F" &&
          (() => {
            // Sloped enthalpy ruler (IP): tick labels 5,10,15... Btu/lbda
            const x0 = xScale(TminDisp + 2);
            const y0 = yScale(Wmax - 1.5);
            const x1 = xScale(TminDisp + 18);
            const y1 = yScale(4);

            const btuTicks = [5, 10, 15, 20, 25, 30, 35, 40, 45];
            const btuMin = btuTicks[0];
            const btuMax = btuTicks[btuTicks.length - 1];

            return (
              <g opacity={0.95}>
                <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#111827" strokeWidth={1} />

                {btuTicks.map((btu) => {
                  const f = (btu - btuMin) / (btuMax - btuMin);
                  const xt = x0 + f * (x1 - x0);
                  const yt = y0 + f * (y1 - y0);

                  // perpendicular tick direction
                  const dx = x1 - x0;
                  const dy = y1 - y0;
                  const len = Math.hypot(dx, dy) || 1;
                  const nx = -dy / len;
                  const ny = dx / len;

                  const tx0 = xt;
                  const ty0 = yt;
                  const tx1 = xt + nx * 6;
                  const ty1 = yt + ny * 6;

                  return (
                    <g key={`hrule-btu-${btu}`}>
                      <line x1={tx0} y1={ty0} x2={tx1} y2={ty1} stroke="#111827" strokeWidth={1} />
                      <text x={tx1 + nx * 2} y={ty1 + ny * 2} fontSize={10} fill="#111827">
                        {btu}
                      </text>
                    </g>
                  );
                })}

                <text x={x0 + 6} y={y0 - 6} fontSize={11} fill="#111827">
                  Enthalpy (Btu/lbda)
                </text>
              </g>
            );
          })()}

        {/* RH labels on curves */}
        {Array.from({ length: 10 }, (_, i) => (i + 1) * 10).map((r) => {
          const pws = pws_kpa(labelTc);
          const Wg = humidityRatioFromPw((r / 100) * pws, PkPa) * 1000;
          if (!isFinite(Wg) || Wg < 0 || Wg > Wmax) return null;

          const x = xScale(labelX) + 2;
          const y = yScale(Wg) - 2;

          return (
            <text key={`rh-lbl-${r}`} x={x} y={y} fontSize={10} fill="#111827" transform={`rotate(-60 ${x} ${y})`}>
              {r}%
            </text>
          );
        })}

        {/* Enthalpy labels placed reliably on each diagonal enthalpy line */}
        {enthalpyLines.map((L: any) => {
          const pts = L.data as Array<{ x: number; W: number }>;
          if (!pts || pts.length < 2) return null;

          const idx = Math.max(0, Math.min(pts.length - 1, Math.floor(pts.length * 0.65)));
          const mid = pts[idx];
          if (!mid || !isFinite(mid.x) || !isFinite(mid.W)) return null;

          if (mid.x < TminDisp + 1 || mid.x > TmaxDisp - 1 || mid.W < 0.8 || mid.W > Wmax - 0.8) return null;

          const x = xScale(mid.x) - 10;
          const y = yScale(mid.W) + 12;

          const text =
            tempUnit === "C" ? `h=${Math.round(L.h_kj)} kJ/kgda` : `h=${Math.round(L.h_ip)} Btu/lbda`;

          return (
            <text
              key={`h-mid-${L.h_kj}`}
              x={x}
              y={y}
              fontSize={10}
              fill="#111827"
              opacity={0.95}
              transform={`rotate(-35 ${x} ${y})`}
            >
              {text}
            </text>
          );
        })}

        {/* Wet-bulb labels in the middle of each dashed line */}
        {wetBulbLines.map((L: any) => {
          const pts = L.data as Array<{ x: number; W: number }>;
          if (!pts || pts.length < 8) return null;

          const midIdx = Math.floor(pts.length / 2);
          const mid = pts[midIdx];
          if (!mid || !isFinite(mid.x) || !isFinite(mid.W)) return null;

          if (mid.x < TminDisp + 2 || mid.x > TmaxDisp - 2 || mid.W < 1 || mid.W > Wmax - 1) return null;

          const x = xScale(mid.x) - 6;
          const y = yScale(mid.W) + 10;

          return (
            <text
              key={`twb-lbl-${L.TwbC}`}
              x={x}
              y={y}
              fontSize={10}
              fill="#111827"
              opacity={0.85}
              transform={`rotate(-35 ${x} ${y})`}
            >
              {Math.round(L.TwbDisp)}°{tempUnit}
            </text>
          );
        })}

        {/* Blue label for the calculated enthalpy line (through the plotted point) */}
        {highlightedEnthalpy &&
          (() => {
            const pts = highlightedEnthalpy.data as Array<{ x: number; W: number }>;
            if (!pts || pts.length < 2) return null;
            const idx = Math.max(0, Math.min(pts.length - 1, Math.floor(pts.length * 0.65)));
            const mid = pts[idx];
            if (!mid) return null;

            const x = xScale(mid.x) - 10;
            const y = yScale(mid.W) + 12;

            const label =
              tempUnit === "C"
                ? `h=${highlightedEnthalpy.h_kj.toFixed(0)} kJ/kgda`
                : `h=${highlightedEnthalpy.h_ip.toFixed(0)} Btu/lbda`;

            return (
              <text x={x} y={y} fontSize={11} fill="#2563EB" fontWeight={600} transform={`rotate(-35 ${x} ${y})`}>
                {label}
              </text>
            );
          })()}

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

  // Handle unit toggle: convert the existing Tdb value so the numeric temperature remains the same physical point.
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

    // Clear plotted point because units + axis change
    setResults(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Psychrometric Calculator</h1>

      <div className="bg-gray-50 p-4 rounded mb-6 border">
        <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
          <div className="flex-1">
            <KatexBlock latex={"W = 0.62198\,\frac{p_w}{P - p_w}"} />
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
              Static chart (non-interactive). RH, enthalpy, and wet-bulb families are labeled directly on the plot.
              Enthalpy labels switch to Btu/lbda in °F mode.
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
            className={`px-3 py-1 text-sm ${
              tempUnit === "C" ? "bg-gray-900 text-white" : "bg-white text-gray-800 hover:bg-gray-50"
            }`}
          >
            °C
          </button>
          <button
            onClick={() => toggleUnit("F")}
            className={`px-3 py-1 text-sm ${
              tempUnit === "F" ? "bg-gray-900 text-white" : "bg-white text-gray-800 hover:bg-gray-50"
            }`}
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
            <input
              value={v}
              onChange={(e) => s(e.target.value)}
              type="number"
              className="w-full p-2 border rounded mt-1"
            />
          </label>
        ))}
      </div>

      {/* Calculate controls */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onCalculate}
          disabled={!computed}
          className={`px-4 py-2 rounded font-medium border shadow-sm ${
            computed ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-500"
          }`}
        >
          Calculate
        </button>
        <button
          onClick={onClear}
          disabled={!results}
          className={`px-4 py-2 rounded font-medium border shadow-sm ${
            results ? "bg-white text-gray-800 hover:bg-gray-50" : "bg-gray-100 text-gray-400"
          }`}
        >
          Clear
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
          <p className="font-semibold">
            Humidity ratio: {results.W.toExponential(3)} kg/kg ({results.W_gpkg.toFixed(2)} g/kg)
          </p>
          <p className="text-sm">
            Enthalpy: {tempUnit === "C" ? `${results.h_kj.toFixed(1)} kJ/kgda` : `${results.h_ip.toFixed(1)} Btu/lbda`}
          </p>
          <p className="text-sm">Specific volume: {results.v.toFixed(3)} m³/kgda</p>
          <p className="text-sm">Saturation pressure pws: {results.pws.toFixed(3)} kPa</p>
          <p className="text-sm">Vapor pressure pw: {results.Pw.toFixed(3)} kPa</p>
          <p className="text-sm">Dew point: {isFinite(results.TdpDisp) ? results.TdpDisp.toFixed(1) : "—"} °{tempUnit}</p>
          <p className="text-sm">Wet-bulb (approx): {isFinite(results.TwbDisp) ? results.TwbDisp.toFixed(1) : "—"} °{tempUnit}</p>
        </div>
      )}

      {/* Static chart */}
      <div className="mt-8 h-[620px] bg-white p-4 border rounded shadow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              domain={[TminDisp, TmaxDisp]}
              type="number"
              tickCount={14}
              label={{ value: `Dry bulb temperature (°${tempUnit})`, position: "insideBottom", offset: -5 }}
            />
            <YAxis
              domain={[0, Wmax]}
              type="number"
              tickCount={7}
              label={{ value: "g water / kg dry air", angle: -90, position: "insideLeft" }}
            />

            <Customized component={InlineLabels} />

            {/* Saturation */}
            <Line dataKey="Wsat" stroke="#111827" strokeWidth={2} dot={false} isAnimationActive={false} />

            {/* RH families */}
            {Array.from({ length: 10 }, (_, i) => (i + 1) * 10).map((r) => (
              <Line
                key={`rh-${r}`}
                dataKey={`RH${r}`}
                stroke="#111827"
                strokeWidth={1}
                dot={false}
                isAnimationActive={false}
              />
            ))}

            {/* Enthalpy families */}
            {enthalpyLines.map((L: any) => (
              <Line
                key={`h-${L.h_kj}`}
                data={L.data}
                dataKey="W"
                stroke="#111827"
                strokeWidth={1}
                dot={false}
                isAnimationActive={false}
              />
            ))}

            {/* Calculated enthalpy line (blue) */}
            {highlightedEnthalpy && (
              <Line
                data={highlightedEnthalpy.data}
                dataKey="W"
                stroke="#2563EB"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            )}

            {/* Wet-bulb families (dashed) */}
            {wetBulbLines.map((L: any) => (
              <Line
                key={`twb-${L.TwbC}`}
                data={L.data}
                dataKey="W"
                stroke="#111827"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
            ))}

            {/* Computed point */}
            {point && <Scatter data={[point]} dataKey="W" fill="#2563EB" isAnimationActive={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
