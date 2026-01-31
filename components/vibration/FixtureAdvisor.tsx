import React from "react";
import type { DamageBand, DutInputs } from "@/lib/vibration/types";
import type { FixtureEvaluation } from "@/lib/vibration/fixture";

type FixtureAdvisorProps = {
  inputs: DutInputs;
  evaluation: FixtureEvaluation;
  damageBands: DamageBand[];
  checked: boolean;
  onCheck: () => void;
  onChange: (patch: Partial<DutInputs>) => void;
};

const mountingOptions: DutInputs["mountingType"][] = [
  "RigidBoltDown",
  "IsolatorMounted",
  "Cantilevered",
  "MultiPointConstrained",
  "PottedEncapsulated",
  "Custom",
];

export function FixtureAdvisor({
  inputs,
  evaluation,
  damageBands,
  checked,
  onCheck,
  onChange,
}: FixtureAdvisorProps) {
  const massRatioText = evaluation.massRatio
    ? `${evaluation.massRatio.toFixed(1)}x`
    : `Target ${evaluation.targetFixtureMass_kg?.toFixed(1) ?? "--"} kg`;

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Fixture Design Advisor</div>
          <div className="text-xs text-gray-500">Enter DUT and fixture targets to generate requirements.</div>
        </div>
        <button
          type="button"
          onClick={onCheck}
          className="rounded-lg bg-black px-4 py-2 text-xs font-medium text-white"
        >
          Check Fixture Requirements
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-gray-50 p-3">
          <div className="text-xs font-semibold text-gray-700">DUT Inputs</div>
          <label className="mt-2 block text-[11px] text-gray-500">DUT mass (kg)</label>
          <input
            type="number"
            step={0.1}
            className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
            value={inputs.m_dut_kg}
            onChange={(e) => onChange({ m_dut_kg: Number(e.target.value) })}
          />
          <div className="mt-1 text-[11px] text-gray-400">required; default 1.0 kg</div>

          <label className="mt-3 block text-[11px] text-gray-500">DUT fn range (Hz)</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <input
              type="number"
              step={1}
              className="w-full rounded-lg border px-2 py-1 text-sm"
              value={inputs.fn_dut_hz_min}
              onChange={(e) => onChange({ fn_dut_hz_min: Number(e.target.value) })}
            />
            <input
              type="number"
              step={1}
              className="w-full rounded-lg border px-2 py-1 text-sm"
              value={inputs.fn_dut_hz_max}
              onChange={(e) => onChange({ fn_dut_hz_max: Number(e.target.value) })}
            />
          </div>
          <div className="mt-1 text-[11px] text-gray-400">default 80-200; estimate if unknown</div>

          <label className="mt-3 block text-[11px] text-gray-500">Mounting type</label>
          <select
            className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
            value={inputs.mountingType}
            onChange={(e) => onChange({ mountingType: e.target.value as DutInputs["mountingType"] })}
          >
            {mountingOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border bg-gray-50 p-3">
          <div className="text-xs font-semibold text-gray-700">Fixture Targets</div>
          <label className="mt-2 block text-[11px] text-gray-500">k safety</label>
          <input
            type="number"
            step={0.5}
            className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
            value={inputs.k_safety}
            onChange={(e) => onChange({ k_safety: Number(e.target.value) })}
          />
          <div className="mt-1 text-[11px] text-gray-400">default 5; typical 3-8</div>

          <label className="mt-3 block text-[11px] text-gray-500">Mass ratio target</label>
          <input
            type="number"
            step={1}
            className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
            value={inputs.massRatioTarget}
            onChange={(e) => onChange({ massRatioTarget: Number(e.target.value) })}
          />
          <div className="mt-1 text-[11px] text-gray-400">default 10; typical 8-15</div>

          <label className="mt-3 block text-[11px] text-gray-500">Notch limit (%)</label>
          <input
            type="number"
            step={5}
            className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
            value={inputs.notchLimitPct}
            onChange={(e) => onChange({ notchLimitPct: Number(e.target.value) })}
          />
          <div className="mt-1 text-[11px] text-gray-400">default 150; typical 120-200</div>
        </div>

        <div className="rounded-lg border bg-gray-50 p-3">
          <div className="text-xs font-semibold text-gray-700">Fixture Detail</div>
          <label className="mt-2 block text-[11px] text-gray-500">Fixture mass (kg)</label>
          <input
            type="number"
            step={0.1}
            className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
            value={inputs.fixtureMass_kg ?? ""}
            onChange={(e) => onChange({ fixtureMass_kg: e.target.value === "" ? undefined : Number(e.target.value) })}
          />

          <label className="mt-3 block text-[11px] text-gray-500">Fixture span (mm)</label>
          <input
            type="number"
            step={1}
            className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
            value={inputs.span_mm ?? ""}
            onChange={(e) => onChange({ span_mm: e.target.value === "" ? undefined : Number(e.target.value) })}
          />

          <label className="mt-3 block text-[11px] text-gray-500">Material</label>
          <select
            className="mt-1 w-full rounded-lg border px-2 py-1 text-sm"
            value={inputs.material}
            onChange={(e) => onChange({ material: e.target.value as DutInputs["material"] })}
          >
            <option value="Al6061">Al6061</option>
            <option value="Steel">Steel</option>
            <option value="Magnesium">Magnesium</option>
          </select>
          <div className="mt-1 text-[11px] text-gray-400">default Al6061</div>
        </div>
      </div>

      {checked && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border p-3">
            <div className="text-xs font-semibold text-gray-700">Fixture Targets</div>
            <div className="mt-2 text-sm">
              <div className="text-xs text-gray-500">Fixture freq min</div>
              <div className="font-medium">{evaluation.f_fixture_min.toFixed(1)} Hz</div>
            </div>
            <div className="mt-2 text-sm">
              <div className="text-xs text-gray-500">Mass loading</div>
              <div className="font-medium">{massRatioText}</div>
            </div>
            {evaluation.k_fixture_min !== undefined && (
              <div className="mt-2 text-sm">
                <div className="text-xs text-gray-500">Stiffness target</div>
                <div className="font-medium">{evaluation.k_fixture_min.toExponential(2)} N/m</div>
              </div>
            )}
            {evaluation.thickness_mm !== undefined && (
              <div className="mt-2 text-sm">
                <div className="text-xs text-gray-500">Plate thickness</div>
                <div className="font-medium">{evaluation.thickness_mm.toFixed(1)} mm (estimate)</div>
              </div>
            )}
          </div>

          <div className="rounded-lg border p-3">
            <div className="text-xs font-semibold text-gray-700">Damage Bands</div>
            <div className="mt-2 space-y-1 text-xs text-gray-600">
              {damageBands.length === 0 && <div>No damage bands yet.</div>}
              {damageBands.map((band) => (
                <div key={`${band.f_start}-${band.f_end}`}>
                  {band.f_start.toFixed(0)}-{band.f_end.toFixed(0)} Hz (score {band.score.toExponential(2)})
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-500">Use these bands to prioritize stiffening and notching.</div>
          </div>

          <div className="rounded-lg border p-3 lg:col-span-2">
            <div className="text-xs font-semibold text-gray-700">Checklist</div>
            <ul className="mt-2 space-y-1 text-xs text-gray-600">
              {evaluation.checklist.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
