"use client";

import React, { useMemo, useRef, useState } from "react";
import "katex/dist/katex.min.css";
import * as katex from "katex";
import {
  CartesianGrid,
  Customized,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  XAxis,
  YAxis,
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

// Solve wet-bulb temperature from the psychrometer relation by numerically inverting:
// pw = pws(Twb) − A·P·(Tdb − Twb),  A = 0.00066(1 + 0.00115·Twb)
// Inputs: Tdb in °C, pw in kPa, P in kPa. Returns Twb in °C.
const solveTwbFromPsychrometer_C = (TdbC: number, pw_kPa: number, PkPa: number) => {
  if (!isFinite(TdbC) || !isFinite(pw_kPa) || !isFinite(PkPa) || !(PkPa > 0) || !(pw_kPa > 0)) return NaN;

  const f = (TwbC: number) => {
    const A = 0.00066 * (1 + 0.00115 * TwbC);
    return pws_kpa(TwbC) - A * PkPa * (TdbC - TwbC) - pw_kPa;
  };

  // Bracket a root in [-50, TdbC]
  const loMin = -50;
  const hiMax = TdbC;

  let lo = loMin;
  let hi = hiMax;

  // Scan for sign change
  let prevT = lo;
  let prevF = f(prevT);
  let found = false;

  for (let T = lo + 1; T <= hi; T += 1) {
    const curF = f(T);
    if (isFinite(prevF) && isFinite(curF) && prevF * curF <= 0) {
      lo = prevT;
      hi = T;
      found = true;
      break;
    }
    prevT = T;
    prevF = curF;
  }

  if (!found) return NaN;

  let flo = f(lo);
  let fhi = f(hi);
  if (!isFinite(flo) || !isFinite(fhi)) return NaN;

  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    const fmid = f(mid);
    if (!isFinite(fmid)) return NaN;

    if (Math.abs(fmid) < 1e-6) return mid;

    if (flo * fmid <= 0) {
      hi = mid;
      fhi = fmid;
    } else {
      lo = mid;
      flo = fmid;
    }

    if (Math.abs(hi - lo) < 1e-4) break;
  }

  return 0.5 * (lo + hi);
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
// Component
// =============================

export default function PsychrometricsCalculator() {
  // Default to °F
  const [tempUnit, setTempUnit] = useState<"C" | "F">("F");
  const [Tdb, setTdb] = useState("77");
  const [RH, setRH] = useState("50");
  const [P, setP] = useState("101.325");

  const chartWrapRef = useRef<HTMLDivElement | null>(null);

  const PkPa = useMemo(() => parseFloat(P), [P]);

  const toC = (xDisp: number) => (tempUnit === "C" ? xDisp : FtoC(xDisp));
  const toDisp = (Tc: number) => (tempUnit === "C" ? Tc : CtoF(Tc));

  // X-axis domain
  const axis = useMemo(() => {
    if (tempUnit === "F") {
      return {
        TminDisp: 10,
        TmaxDisp: 120,
        xTicks: Array.from({ length: 12 }, (_, i) => 10 + i * 10),
      };
    }
    // keep within realistic 1-atm range
    return { TminDisp: 10, TmaxDisp: 55, xTicks: [10, 20, 30, 40, 50, 55] };
  }, [tempUnit]);

  const TminDisp = axis.TminDisp;
  const TmaxDisp = axis.TmaxDisp;
  const xTicks = axis.xTicks;

  // Y max in g/kg
  const Wmax = 30;

  const satW = (xDisp: number) => {
    const Tc = toC(xDisp);
    return humidityRatioFromPw(pws_kpa(Tc), PkPa) * 1000;
  };

  // Live computation
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
    const TwbPsychC = solveTwbFromPsychrometer_C(Tc, Pw, PkPa);

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
      TwbPsychDisp: toDisp(TwbPsychC),
      TwbDeltaDisp: toDisp(TwbPsychC) - toDisp(TwbC),
    };
  }, [Tdb, RH, PkPa, tempUnit]);

  const [results, setResults] = useState<null | typeof computed>(null);
  const onCalculate = () => setResults(computed);
  const onClear = () => setResults(null);

  const toggleUnit = (next: "C" | "F") => {
    if (next === tempUnit) return;

    const val = parseFloat(Tdb);
    if (!isFinite(val)) {
      setTempUnit(next);
      setResults(null);
      return;
    }

    const newVal = next === "F" ? CtoF(val) : FtoC(val);
    setTempUnit(next);
    setTdb(newVal.toFixed(2));
    setResults(null);
  };

  // Chart rows: saturation + RH families (strictly clipped to saturation)
  const chartData = useMemo(() => {
    if (!isFinite(PkPa) || PkPa <= 0) return [] as any[];

    const data: any[] = [];
    for (let x = TminDisp; x <= TmaxDisp; x += 1) {
      const Tc = toC(x);
      const pws = pws_kpa(Tc);
      const Wsat = humidityRatioFromPw(pws, PkPa) * 1000;

      const row: any = { x, Wsat: isFinite(Wsat) ? Wsat : null };

      for (let r = 10; r <= 100; r += 10) {
        const Pw = (r / 100) * pws;
        if (!(Pw > 0) || Pw >= 0.999 * PkPa) {
          row[`RH${r}`] = null;
          continue;
        }
        const Wg = humidityRatioFromPw(Pw, PkPa) * 1000;
        row[`RH${r}`] = Wg <= Wsat + 1e-9 && Wg >= 0 && Wg <= Wmax + 2 ? Wg : null;
      }

      data.push(row);
    }

    return data;
  }, [PkPa, tempUnit, TminDisp, TmaxDisp]);

  // Enthalpy lines (true constant-enthalpy diagonals)
  const enthalpyLines = useMemo(() => {
    if (!isFinite(PkPa) || PkPa <= 0) return [] as any[];

    const hList_kj =
      tempUnit === "C"
        ? [10, 20, 30, 40, 50, 60, 70, 80, 90]
        : [5, 10, 15, 20, 25, 30, 35, 40, 45].map((btu) => btu / KJ_PER_KG_TO_BTU_PER_LB);

    return hList_kj.map((h_kj) => {
      const data: Array<{ x: number; W: number }> = [];
      for (let x = TminDisp; x <= TmaxDisp; x += 1) {
        const Tc = toC(x);
        const denom = 2501 + 1.86 * Tc;
        if (denom <= 0) continue;

        const W = (h_kj - 1.006 * Tc) / denom;
        const Wg = W * 1000;
        if (!isFinite(Wg) || Wg < 0) continue;

        const Wsat = satW(x);
        if (Wg <= Wsat + 1e-6 && Wg <= Wmax + 8) data.push({ x, W: Wg });
      }
      return { h_kj, h_ip: h_kj * KJ_PER_KG_TO_BTU_PER_LB, data };
    });
  }, [PkPa, tempUnit, TminDisp, TmaxDisp]);

  // Highlighted enthalpy line through point
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

      const Wsat = satW(x);
      if (Wg <= Wsat + 1e-6 && Wg <= Wmax + 8) data.push({ x, W: Wg });
    }

    return { h_kj, h_ip: h_kj * KJ_PER_KG_TO_BTU_PER_LB, data };
  }, [results, PkPa, tempUnit, TminDisp, TmaxDisp]);

  // Wet-bulb families (rigorous): curved in T–W, from psychrometer relation
  // pw = pws(Twb) − A·P·(Tdb − Twb), A = 0.00066(1 + 0.00115·Twb)
  const wetBulbLines = useMemo(() => {
    if (!isFinite(PkPa) || PkPa <= 0) return [] as any[];

    const TwbListDisp = tempUnit === "F" ? [30, 40, 50, 60, 70, 80, 90] : [0, 5, 10, 15, 20, 25, 30, 35];

    return TwbListDisp.map((TwbDisp) => {
      const TwbC = tempUnit === "F" ? FtoC(TwbDisp) : TwbDisp;
      const A = 0.00066 * (1 + 0.00115 * TwbC);
      const pws_wb = pws_kpa(TwbC);

      const data: Array<{ x: number; W: number }> = [];

      for (let x = TminDisp; x <= TmaxDisp; x += 1) {
        const TdbC = toC(x);
        if (TdbC < TwbC) continue;

        const pw = pws_wb - A * PkPa * (TdbC - TwbC);
        if (!isFinite(pw) || pw <= 0) continue;

        const pws_db = pws_kpa(TdbC);
        const pw_clamped = clamp(pw, 1e-6, Math.min(0.999 * PkPa, 0.999 * pws_db));

        const W = humidityRatioFromPw(pw_clamped, PkPa);
        const Wg = W * 1000;
        if (!isFinite(Wg) || Wg < 0) continue;

        const Wsat = humidityRatioFromPw(pws_db, PkPa) * 1000;
        if (Wg <= Wsat + 1e-6 && Wg <= Wmax + 8) data.push({ x, W: Wg });
      }

      return { TwbDisp, data };
    });
  }, [PkPa, tempUnit, TminDisp, TmaxDisp]);

  // RH labels: stacked at top-right boundary (curve endpoints at x=Tmax-1)
  const rhRightLabels = useMemo(() => {
    if (!isFinite(PkPa) || PkPa <= 0) return [] as Array<{ rh: number; x: number; W: number }>;

    const rhs = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
    const x = Math.max(TminDisp, TmaxDisp - 1);

    const Tc = toC(x);
    const pws = pws_kpa(Tc);
    const Wsat = humidityRatioFromPw(pws, PkPa) * 1000;

    return rhs
      .map((rh) => {
        if (rh === 100) return { rh, x, W: clamp(Wsat, 0, Wmax) };
        const pw = (rh / 100) * pws;
        if (!(pw > 0) || pw >= 0.999 * PkPa) return { rh, x, W: NaN };
        const Wg = humidityRatioFromPw(pw, PkPa) * 1000;
        return { rh, x, W: Wg <= Wsat + 1e-6 ? Wg : NaN };
      })
      .filter((p) => isFinite(p.W) && p.W >= 0 && p.W <= Wmax);
  }, [PkPa, tempUnit, TminDisp, TmaxDisp]);

  // Enthalpy labels on saturation curve: numeric only; units once (last label)
  const enthalpyLabelsOnSat = useMemo(() => {
    if (!isFinite(PkPa) || PkPa <= 0) return [] as Array<{ h_kj: number; h_ip: number; x: number; W: number }>;

    const hList_kj =
      tempUnit === "C"
        ? [10, 20, 30, 40, 50, 60, 70, 80, 90]
        : [5, 10, 15, 20, 25, 30, 35, 40, 45].map((btu) => btu / KJ_PER_KG_TO_BTU_PER_LB);

    const solvePointForH = (h_kj: number) => {
      let bestX = NaN;
      let bestW = NaN;
      let bestErr = Number.POSITIVE_INFINITY;

      for (let x = TminDisp; x <= TmaxDisp; x += 0.25) {
        const Tc = toC(x);
        const Wsat_kgkg = humidityRatioFromPw(pws_kpa(Tc), PkPa);
        const Wg = Wsat_kgkg * 1000;
        if (!isFinite(Wg) || Wg < 0 || Wg > Wmax) continue;

        const hsat = enthalpy_kJ_per_kgda(Tc, Wsat_kgkg);
        const err = Math.abs(hsat - h_kj);
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
  }, [PkPa, tempUnit, TminDisp, TmaxDisp]);

  const point = useMemo(() => {
    if (!results) return null;
    return { x: results.Tdisp, W: results.W_gpkg };
  }, [results]);

  const exportSvg = () => {
    const root = chartWrapRef.current;
    if (!root) return;
    const svg = root.querySelector("svg");
    if (!svg) return;

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const w = svg.getBoundingClientRect().width;
    const h = svg.getBoundingClientRect().height;
    clone.setAttribute("width", String(Math.round(w)));
    clone.setAttribute("height", String(Math.round(h)));

    const ser = new XMLSerializer();
    const svgText = ser.serializeToString(clone);
    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `psychrometric-chart-${tempUnit}.svg`;
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const slopeAngleDeg = (x1: number, y1: number, x2: number, y2: number) => (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;

  const InlineLabels = ({ xAxisMap, yAxisMap }: any) => {
    const xFirst = Object.values(xAxisMap ?? {})[0] as any;
    const yFirst = Object.values(yAxisMap ?? {})[0] as any;
    const xScale = xFirst?.scale;
    const yScale = yFirst?.scale;
    if (!xScale || !yScale) return null;

    return (
      <g>
        {/* Relative Humidity title top-right, horizontal */}
        <text x={xScale(TmaxDisp - 2)} y={yScale(Wmax - 1.2)} fontSize={12} fill="#111827" opacity={0.9} textAnchor="end">
          Relative Humidity
        </text>

        {/* RH labels stacked near the right boundary at the curve endpoints */}
        {rhRightLabels.map(({ rh, x, W }) => (
          <text
            key={`rh-right-${rh}`}
            x={xScale(x) - 6}
            y={yScale(W) + (rh >= 90 ? -10 : rh >= 70 ? -6 : -3)}
            fontSize={10}
            fill="#111827"
            textAnchor="end"
          >
            {rh}%
          </text>
        ))}

        {/* Enthalpy labels placed along saturation curve: numeric only; units once */}
        {enthalpyLabelsOnSat.map((pt, i) => {
          const xpx = xScale(pt.x);
          const ypx = yScale(pt.W);

          const x2 = Math.min(pt.x + 1, TmaxDisp);
          const ang = slopeAngleDeg(xpx, ypx, xScale(x2), yScale(satW(x2)));

          const isLast = i === enthalpyLabelsOnSat.length - 1;
          const value = tempUnit === "C" ? Math.round(pt.h_kj) : Math.round(pt.h_ip);
          const unit = tempUnit === "C" ? "kJ/kgda" : "Btu/lbda";
          const label = isLast ? `${value} ${unit}` : `${value}`;

          const theta = (ang * Math.PI) / 180;
          const nx = -Math.sin(theta);
          const ny = Math.cos(theta);
          const bump = value >= (tempUnit === "C" ? 80 : 35) ? 14 : 10;

          const ox = nx * bump;
          const oy = ny * bump;

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

        {/* Wet-bulb labels along dotted curves */}
        {wetBulbLines.map((L: any) => {
          const pts = L.data as Array<{ x: number; W: number }>;
          if (!pts || pts.length < 8) return null;

          const midIdx = Math.floor(pts.length * 0.55);
          const mid = pts[midIdx];
          const nxt = pts[Math.min(pts.length - 1, midIdx + 1)];
          if (!mid || !nxt) return null;

          const xpx = xScale(mid.x);
          const ypx = yScale(mid.W);
          const ang = slopeAngleDeg(xpx, ypx, xScale(nxt.x), yScale(nxt.W));

          const theta = (ang * Math.PI) / 180;
          const nx = -Math.sin(theta);
          const ny = Math.cos(theta);

          const ox = nx * 8;
          const oy = ny * 8;

          return (
            <text
              key={`twb-lbl-${L.TwbDisp}`}
              x={xpx + ox}
              y={ypx + oy}
              fontSize={10}
              fill="#6B7280"
              opacity={0.9}
              transform={`rotate(${ang} ${xpx + ox} ${ypx + oy})`}
            >
              {Math.round(L.TwbDisp)}°{tempUnit}
            </text>
          );
        })}

        {/* Family titles */}
        <text
          x={xScale(TminDisp + (TmaxDisp - TminDisp) * 0.20)}
          y={yScale(Wmax - 3.0)}
          fontSize={14}
          fill="#111827"
          opacity={0.85}
          transform={`rotate(-65 ${xScale(TminDisp + (TmaxDisp - TminDisp) * 0.20)} ${yScale(Wmax - 3.0)})`}
          textAnchor="middle"
        >
          Enthalpy
        </text>

        <text
          x={xScale(TminDisp + (TmaxDisp - TminDisp) * 0.92)}
          y={yScale(Wmax * 0.24)}
          fontSize={14}
          fill="#111827"
          opacity={0.85}
          transform={`rotate(30 ${xScale(TminDisp + (TmaxDisp - TminDisp) * 0.62)} ${yScale(Wmax * 0.40)})`}
          textAnchor="middle"
        >
          Wet Bulb Temperature
        </text>
      </g>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
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
              Chart hierarchy: Saturation &gt; Enthalpy &gt; RH &gt; Wet-bulb. RH is strictly clipped to saturation.
              Wet-bulb lines are computed via the psychrometer relation (curved Twb=const) and drawn dotted.
            </p>
          </div>
        </div>
      </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[{ l: `Dry-bulb (°${tempUnit})`, v: Tdb, s: setTdb }, { l: "RH (%)", v: RH, s: setRH }, { l: "Pressure (kPa)", v: P, s: setP }].map(
          ({ l, v, s }) => (
            <label key={l} className="block text-sm">
              {l}
              <input value={v} onChange={(e) => s(e.target.value)} type="number" className="w-full p-2 border rounded mt-1" />
            </label>
          )
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
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
        <button onClick={exportSvg} className="px-4 py-2 rounded font-medium border shadow-sm bg-white hover:bg-gray-50">
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

      {results && (
        <div className="mt-2 p-4 border-l-4 border-blue-500 bg-blue-50 text-blue-800 rounded">
          <p className="font-semibold">Humidity ratio: {results.W.toExponential(3)} kg/kg ({results.W_gpkg.toFixed(2)} g/kg)</p>
          <p className="text-sm">Enthalpy: {tempUnit === "C" ? `${results.h_kj.toFixed(1)} kJ/kgda` : `${results.h_ip.toFixed(1)} Btu/lbda`}</p>
          <p className="text-sm">Specific volume: {results.v.toFixed(3)} m³/kgda</p>
          <p className="text-sm">Saturation pressure pws: {results.pws.toFixed(3)} kPa</p>
          <p className="text-sm">Vapor pressure pw: {results.Pw.toFixed(3)} kPa</p>
          <p className="text-sm">Dew point: {isFinite(results.TdpDisp) ? results.TdpDisp.toFixed(1) : "—"} °{tempUnit}</p>
          <p className="text-sm">Wet-bulb (Stull): {isFinite(results.TwbDisp) ? results.TwbDisp.toFixed(1) : "—"} °{tempUnit}</p>

          <div className="mt-3 p-3 bg-white/60 border border-blue-200 rounded">
            <p className="text-sm font-semibold text-blue-900">Wet-bulb validation</p>
            <p className="text-sm text-blue-900">Psychrometer-inverted Twb: {isFinite(results.TwbPsychDisp) ? results.TwbPsychDisp.toFixed(1) : "—"} °{tempUnit}</p>
            <p className="text-sm text-blue-900">Δ (Psych − Stull): {isFinite(results.TwbDeltaDisp) ? results.TwbDeltaDisp.toFixed(2) : "—"} °{tempUnit}</p>
            <p className="text-xs text-blue-800 opacity-80 mt-1">Solve uses pw = pws(Twb) − A·P·(Tdb − Twb), A = 0.00066(1 + 0.00115·Twb).</p>
          </div>
        </div>
      )}

      <div ref={chartWrapRef} className="mt-8 h-[680px] bg-white p-4 border rounded shadow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 35, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" domain={[TminDisp, TmaxDisp]} type="number" ticks={xTicks} tickCount={xTicks.length} label={{ value: `Dry bulb temperature (°${tempUnit})`, position: "insideBottom", offset: -5 }} />
            <YAxis domain={[0, Wmax]} type="number" tickCount={7} label={{ value: "g water / kg dry air", angle: -90, position: "insideLeft" }} />
            <YAxis yAxisId="right" orientation="right" domain={[0, Wmax]} type="number" tickCount={7} tickFormatter={(v) => (v / 1000).toFixed(3)} label={{ value: "Humidity Ratio (kg/kg)", angle: 90, position: "insideRight" }} />

            <Customized component={InlineLabels} />

            {/* Wet-bulb (light, dotted) */}
            {wetBulbLines.map((L: any) => (
              <Line key={`twb-${L.TwbDisp}`} data={L.data} dataKey="W" stroke="#9CA3AF" strokeWidth={1} strokeDasharray="2 3" dot={false} isAnimationActive={false} />
            ))}

            {/* RH families */}
            {Array.from({ length: 10 }, (_, i) => (i + 1) * 10).map((r) => (
              <Line key={`rh-${r}`} dataKey={`RH${r}`} stroke="#111827" strokeWidth={1} dot={false} isAnimationActive={false} />
            ))}

            {/* Enthalpy families */}
            {enthalpyLines.map((L: any) => (
              <Line key={`h-${L.h_kj}`} data={L.data} dataKey="W" stroke="#111827" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            ))}

            {/* Calculated enthalpy (blue) */}
            {highlightedEnthalpy && <Line data={highlightedEnthalpy.data} dataKey="W" stroke="#2563EB" strokeWidth={2} dot={false} isAnimationActive={false} />}

            {/* Saturation */}
            <Line dataKey="Wsat" stroke="#111827" strokeWidth={2.5} dot={false} isAnimationActive={false} />

            {/* Point */}
            {point && <Scatter data={[point]} dataKey="W" fill="#2563EB" isAnimationActive={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
