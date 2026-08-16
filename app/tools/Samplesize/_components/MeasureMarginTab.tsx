"use client";

import ComparativeTestMethod from "./ComparativeTestMethod";
import ToleranceIntervalMethod from "./ToleranceIntervalMethod";
import WeibayesMethod from "./WeibayesMethod";
import { MARGIN_METHODS, type MarginMethodId } from "./tabs";
import { MethodSelector } from "./ui";

const GUIDANCE: Record<MarginMethodId, string> = {
  "tolerance-interval": "Use when the characteristic is a measurement and the design has room to spare.",
  comparative: "Use when the question is whether B differs from A, not whether either is reliable.",
  weibayes: "Use when a comparable design already banked test time you can defend.",
};

export default function MeasureMarginTab({
  method,
  onMethodChange,
}: {
  method: MarginMethodId;
  onMethodChange: (method: MarginMethodId) => void;
}) {
  return (
    <div>
      <MethodSelector options={MARGIN_METHODS} value={method} onChange={onMethodChange} />
      <p className="mb-5 mt-3 text-xs text-slate-500">{GUIDANCE[method]}</p>

      {method === "tolerance-interval" ? <ToleranceIntervalMethod /> : null}
      {method === "comparative" ? <ComparativeTestMethod /> : null}
      {method === "weibayes" ? <WeibayesMethod /> : null}
    </div>
  );
}
