"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatProbabilityPercentFromY,
  probabilityTickYs,
  weibullCdf,
  weibullY,
  weibullYInverse,
  type FitResult,
} from "../_lib/weibullMath";

type PlotDataset = {
  id: string;
  name: string;
  colorKey: string;
  visible: boolean;
  fit?: FitResult;
};

type WeibullPlotProps = {
  datasets: PlotDataset[];
  unitsLabel: string;
  showBLifeLines: boolean;
  showSuspensions: boolean;
  showConfidenceBand: boolean;
  tMission?: number;
  yAxisMode: "UNRELIABILITY" | "RELIABILITY";
};

type PlotRow = {
  kind: "curve" | "fail" | "susp";
  datasetName: string;
  datasetColor: string;
  t: number;
  x: number;
  y: number;
  status?: string;
  F_plot?: number;
  modelF: number;
  modelR: number;
};

function formatTimeLabel(t: number): string {
  if (!Number.isFinite(t)) return "";
  if (t >= 1000000 || t < 0.01) return t.toExponential(2);
  if (t >= 1000) return t.toFixed(0);
  if (t >= 100) return t.toFixed(1);
  if (t >= 10) return t.toFixed(2);
  return t.toFixed(3);
}

function formatXAxisTick(x: number, unitsLabel: string): string {
  const t = Math.exp(x);
  return `${formatTimeLabel(t)} ${unitsLabel}`.trim();
}

function formatReliabilityPercentFromY(y: number): string {
  const f = weibullYInverse(y);
  if (!Number.isFinite(f)) return "";
  const reliabilityPercent = (1 - f) * 100;
  if (reliabilityPercent < 1) return `${reliabilityPercent.toFixed(1)}%`;
  if (reliabilityPercent < 10) return `${reliabilityPercent.toFixed(1)}%`;
  if (reliabilityPercent < 99) return `${reliabilityPercent.toFixed(0)}%`;
  return `${reliabilityPercent.toFixed(1)}%`;
}

function SuspendedPointShape(props: { cx?: number; cy?: number; stroke?: string }) {
  const cx = props.cx ?? 0;
  const cy = props.cy ?? 0;
  const stroke = props.stroke ?? "#0f172a";
  const size = 5;
  return (
    <path
      d={`M ${cx} ${cy - size} L ${cx - size} ${cy + size} L ${cx + size} ${cy + size} Z`}
      fill="#ffffff"
      stroke={stroke}
      strokeWidth={1.4}
    />
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PlotRow }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0].payload;
  const title = `${row.datasetName}`;
  return (
    <div className="rounded border bg-white p-2 text-xs shadow-sm">
      <p className="font-semibold">{title}</p>
      <p>time: {formatTimeLabel(row.t)}</p>
      {row.status ? <p>status: {row.status}</p> : null}
      {row.F_plot !== undefined ? <p>plotting position: {(row.F_plot * 100).toFixed(2)}%</p> : null}
      <p>F(t): {(row.modelF * 100).toFixed(2)}%</p>
      <p>R(t): {(row.modelR * 100).toFixed(2)}%</p>
      {row.kind === "susp" ? <p>note: censored point</p> : null}
    </div>
  );
}

export default function WeibullPlot({
  datasets,
  unitsLabel,
  showBLifeLines,
  showSuspensions,
  showConfidenceBand,
  tMission,
  yAxisMode,
}: WeibullPlotProps) {
  const yTicks = useMemo(() => probabilityTickYs(), []);
  const yDomain: [number, number] = [Math.min(...yTicks), Math.max(...yTicks)];

  const visibleWithFit = useMemo(() => datasets.filter((dataset) => dataset.visible && dataset.fit), [datasets]);

  const rowsByDataset = useMemo(() => {
    return visibleWithFit.map((dataset) => {
      const fit = dataset.fit as FitResult;
      const curveRows: PlotRow[] = fit.curve.map((point) => {
        const t = Math.exp(point.x);
        const modelF = weibullYInverse(point.y);
        return {
          kind: "curve",
          datasetName: dataset.name,
          datasetColor: dataset.colorKey,
          t,
          x: point.x,
          y: point.y,
          modelF,
          modelR: 1 - modelF,
        };
      });

      const failRows: PlotRow[] = fit.plotPoints
        .filter((point) => point.status === "FAIL" && point.y_plot !== undefined)
        .map((point) => {
          const modelF = weibullCdf(point.t, fit.beta, fit.eta);
          return {
            kind: "fail",
            datasetName: dataset.name,
            datasetColor: dataset.colorKey,
            t: point.t,
            x: point.x,
            y: point.y_plot as number,
            status: "FAIL",
            F_plot: point.F_plot,
            modelF,
            modelR: 1 - modelF,
          };
        });

      const suspendedRows: PlotRow[] = fit.plotPoints
        .filter((point) => point.status === "SUSP")
        .map((point) => {
          const modelF = weibullCdf(point.t, fit.beta, fit.eta);
          return {
            kind: "susp",
            datasetName: dataset.name,
            datasetColor: dataset.colorKey,
            t: point.t,
            x: point.x,
            y: weibullY(modelF),
            status: "SUSP",
            modelF,
            modelR: 1 - modelF,
          };
        });

      const bandLowerRows: PlotRow[] = (fit.bounds?.band ?? [])
        .filter((point) => point.tLower !== undefined)
        .map((point) => {
          const y = weibullY(point.percent / 100);
          return {
            kind: "curve",
            datasetName: dataset.name,
            datasetColor: dataset.colorKey,
            t: point.tLower as number,
            x: Math.log(point.tLower as number),
            y,
            modelF: point.percent / 100,
            modelR: 1 - point.percent / 100,
          };
        });

      const bandUpperRows: PlotRow[] = (fit.bounds?.band ?? [])
        .filter((point) => point.tUpper !== undefined)
        .map((point) => {
          const y = weibullY(point.percent / 100);
          return {
            kind: "curve",
            datasetName: dataset.name,
            datasetColor: dataset.colorKey,
            t: point.tUpper as number,
            x: Math.log(point.tUpper as number),
            y,
            modelF: point.percent / 100,
            modelR: 1 - point.percent / 100,
          };
        });

      return {
        dataset,
        fit,
        curveRows,
        failRows,
        suspendedRows,
        bandLowerRows,
        bandUpperRows,
      };
    });
  }, [visibleWithFit]);

  const xDomain = useMemo<[number, number]>(() => {
    const xs: number[] = [];
    for (const group of rowsByDataset) {
      group.curveRows.forEach((row) => xs.push(row.x));
      group.failRows.forEach((row) => xs.push(row.x));
      if (showSuspensions) {
        group.suspendedRows.forEach((row) => xs.push(row.x));
      }
      if (showBLifeLines) {
        xs.push(Math.log(group.fit.b10), Math.log(group.fit.b50), Math.log(group.fit.b632));
      }
      if (showConfidenceBand) {
        group.bandLowerRows.forEach((row) => xs.push(row.x));
        group.bandUpperRows.forEach((row) => xs.push(row.x));
      }
    }
    if (tMission && tMission > 0) {
      xs.push(Math.log(tMission));
    }
    if (xs.length === 0) return [0, 1];
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const span = maxX - minX;
    const pad = span > 0 ? span * 0.06 : 0.8;
    return [minX - pad, maxX + pad];
  }, [rowsByDataset, showBLifeLines, showSuspensions, showConfidenceBand, tMission]);

  return (
    <div className="h-[520px] rounded border bg-white p-4 shadow">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            domain={xDomain}
            tickFormatter={(value: number) => formatXAxisTick(value, unitsLabel)}
            label={{ value: `Time (${unitsLabel})`, position: "insideBottom", offset: -5 }}
          />
          <YAxis
            type="number"
            domain={yDomain}
            ticks={yTicks}
            tickFormatter={(value: number) =>
              yAxisMode === "RELIABILITY" ? formatReliabilityPercentFromY(value) : formatProbabilityPercentFromY(value)
            }
            label={{ value: yAxisMode === "RELIABILITY" ? "Reliability R(t)" : "Unreliability F(t)", angle: -90, position: "insideLeft" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {rowsByDataset.map((group) => (
            <Line
              key={`curve-${group.dataset.id}`}
              type="linear"
              data={group.curveRows}
              dataKey="y"
              name={`${group.dataset.name} fit`}
              stroke={group.dataset.colorKey}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}

          {showConfidenceBand
            ? rowsByDataset.flatMap((group) => [
                <Line
                  key={`band-lower-${group.dataset.id}`}
                  type="linear"
                  data={group.bandLowerRows}
                  dataKey="y"
                  name={`${group.dataset.name} bounds`}
                  stroke={group.dataset.colorKey}
                  strokeWidth={1.5}
                  strokeOpacity={0.5}
                  strokeDasharray="5 3"
                  dot={false}
                  legendType="none"
                  isAnimationActive={false}
                />,
                <Line
                  key={`band-upper-${group.dataset.id}`}
                  type="linear"
                  data={group.bandUpperRows}
                  dataKey="y"
                  name={`${group.dataset.name} bounds`}
                  stroke={group.dataset.colorKey}
                  strokeWidth={1.5}
                  strokeOpacity={0.5}
                  strokeDasharray="5 3"
                  dot={false}
                  legendType="none"
                  isAnimationActive={false}
                />,
              ])
            : null}

          {rowsByDataset.map((group) => (
            <Scatter
              key={`fail-${group.dataset.id}`}
              data={group.failRows}
              dataKey="y"
              name={`${group.dataset.name} FAIL`}
              fill={group.dataset.colorKey}
              stroke={group.dataset.colorKey}
            />
          ))}

          {showSuspensions
            ? rowsByDataset.map((group) => (
                <Scatter
                  key={`susp-${group.dataset.id}`}
                  data={group.suspendedRows}
                  dataKey="y"
                  name={`${group.dataset.name} SUSP`}
                  stroke={group.dataset.colorKey}
                  fill="#ffffff"
                  shape={<SuspendedPointShape stroke={group.dataset.colorKey} />}
                />
              ))
            : null}

          {showBLifeLines
            ? rowsByDataset.flatMap((group) => [
                <ReferenceLine
                  key={`b10-${group.dataset.id}`}
                  x={Math.log(group.fit.b10)}
                  stroke={group.dataset.colorKey}
                  strokeDasharray="4 3"
                  label={{ value: "B10", position: "insideTop", angle: -90, fontSize: 12, fontWeight: 600 }}
                />,
                <ReferenceLine
                  key={`b50-${group.dataset.id}`}
                  x={Math.log(group.fit.b50)}
                  stroke={group.dataset.colorKey}
                  strokeDasharray="2 2"
                  label={{ value: "B50", position: "insideTop", angle: -90, fontSize: 12, fontWeight: 600 }}
                />,
                <ReferenceLine
                  key={`eta-${group.dataset.id}`}
                  x={Math.log(group.fit.eta)}
                  stroke={group.dataset.colorKey}
                  strokeDasharray="7 3"
                  label={{ value: "eta", position: "insideTop", angle: -90, fontSize: 12, fontWeight: 600 }}
                />,
              ])
            : null}

          {tMission && tMission > 0
            ? rowsByDataset.map((group) => {
                const fMission = group.fit.fMission ?? weibullCdf(tMission, group.fit.beta, group.fit.eta);
                return (
                  <ReferenceDot
                    key={`mission-${group.dataset.id}`}
                    x={Math.log(tMission)}
                    y={weibullY(fMission)}
                    r={5}
                    fill={group.dataset.colorKey}
                    stroke="#111827"
                  />
                );
              })
            : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
