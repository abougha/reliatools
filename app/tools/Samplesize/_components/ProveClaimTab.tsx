"use client";

import ExtendedBogeyMethod from "./ExtendedBogeyMethod";
import MtbfDemoMethod from "./MtbfDemoMethod";
import SuccessRunMethod from "./SuccessRunMethod";
import { PROVE_METHODS, type ProveMethodId } from "./tabs";
import { MethodSelector } from "./ui";

const GUIDANCE: Record<ProveMethodId, string> = {
  "success-run": "Use when units are cheap relative to test time, or when you have no defensible β.",
  "extended-bogey": "Use when units are expensive and you know β from real failure data.",
  mtbf: "Use for repairable systems quoted in MTBF, where the deliverable is a time budget.",
};

export default function ProveClaimTab({
  method,
  onMethodChange,
}: {
  method: ProveMethodId;
  onMethodChange: (method: ProveMethodId) => void;
}) {
  return (
    <div>
      <MethodSelector options={PROVE_METHODS} value={method} onChange={onMethodChange} />
      <p className="mb-5 mt-3 text-xs text-slate-500">{GUIDANCE[method]}</p>

      {method === "success-run" ? <SuccessRunMethod /> : null}
      {method === "extended-bogey" ? <ExtendedBogeyMethod /> : null}
      {method === "mtbf" ? <MtbfDemoMethod /> : null}
    </div>
  );
}
