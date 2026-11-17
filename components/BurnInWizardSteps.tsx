import React, { useMemo } from "react";
import { BurnInGraph } from "./BurnInGraph";
import { kB_eV } from "@/lib/constants";
import { formatSig } from "@/lib/format";

/** Share of the product's operating life that burn-in is allowed to consume. */
const LIFE_FRACTION = 0.1;

const FAILURE_MODES = [
  { mode: "Electromigration", img: "/icons/electromigration.png", Ea: [0.7, 1.2], desc: "Metal atom movement under current flow." },
  { mode: "TDDB", img: "/icons/tddb.png", Ea: [0.6, 0.9], desc: "Breakdown of gate oxide under electric field stress." },
  { mode: "NBTI", img: "/icons/nbti.png", Ea: [0.3, 0.4], desc: "Threshold voltage shift in PMOS transistors." },
  { mode: "HCI", img: "/icons/hci.png", Ea: [0.3, 0.4], desc: "Hot carrier injection causing gate oxide damage." },
  { mode: "Not Sure", img: "/icons/question.png", Ea: [0.7], desc: "A general-purpose 0.7 eV is used." },
];

type WizardProps = {
  step: number;
  setStep: (n: number) => void;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
};

/** Value for a numeric input: blank instead of NaN, and 0 stays visible. */
const fieldValue = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : "");
const parseField = (raw: string) => (raw.trim() === "" ? NaN : Number(raw));

export const BurnInWizardSteps: React.FC<WizardProps> = ({ step, setStep, formData, setFormData }) => {
  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const plan = useMemo(() => {
    const problems: string[] = [];

    let EaValues: number[];
    if (formData.failureMode === "Custom Ea") {
      EaValues = [Number(formData.customEa)];
      if (!(EaValues[0] >= 0.1 && EaValues[0] <= 2.5)) {
        problems.push("Step 2: enter a custom activation energy between 0.1 and 2.5 eV.");
      }
    } else {
      EaValues = FAILURE_MODES.find((m) => m.mode === formData.failureMode)?.Ea ?? [0.7];
    }

    const life = Number(formData.productLife);
    const useTemp = Number(formData.useTemp);
    const maxTemp = Number(formData.maxBurnTemp);
    const powered = formData.testMode === "Powered";
    const deltaT = powered ? Number(formData.deltaT) : 0;

    if (!(life > 0)) problems.push("Step 3: enter the product operating life in hours.");
    if (!Number.isFinite(useTemp)) problems.push("Step 3: enter the typical use temperature.");
    if (!Number.isFinite(maxTemp)) problems.push("Step 3: enter the maximum safe burn-in temperature.");
    if (Number.isFinite(useTemp) && Number.isFinite(maxTemp) && maxTemp <= useTemp) {
      problems.push("Step 3: the maximum burn-in temperature must be higher than the use temperature, otherwise nothing is accelerated.");
    }
    if (powered && !(deltaT >= 0)) problems.push("Step 3: enter the temperature rise due to power (0 or more).");
    if (powered && deltaT >= 0 && Number.isFinite(maxTemp) && Number.isFinite(useTemp) && maxTemp - deltaT < -55) {
      problems.push("Step 3: the temperature rise due to power is larger than the burn-in limit allows.");
    }

    if (problems.length > 0) return { problems };

    // The device may not exceed the safe limit, so a powered part needs a cooler oven.
    const deviceTemp = maxTemp;
    const ovenTemp = maxTemp - deltaT;
    const simulatedLife = LIFE_FRACTION * life;
    const useTempK = useTemp + 273.15;
    const deviceTempK = deviceTemp + 273.15;

    const cases = EaValues.map((Ea) => {
      const AF = Math.exp((Ea / kB_eV) * (1 / useTempK - 1 / deviceTempK));
      return { Ea, AF, hours: simulatedLife / AF };
    });
    const hours = cases.map((c) => c.hours);
    const afs = cases.map((c) => c.AF);

    return {
      problems,
      EaValues,
      powered,
      deltaT,
      useTemp,
      deviceTemp,
      ovenTemp,
      simulatedLife,
      minHours: Math.min(...hours),
      maxHours: Math.max(...hours),
      minAF: Math.min(...afs),
      maxAF: Math.max(...afs),
    };
  }, [formData]);

  const range = (lo: number, hi: number, digits = 3) =>
    Math.abs(hi - lo) < 1e-9 * Math.max(1, Math.abs(hi)) ? formatSig(lo, digits) : `${formatSig(lo, digits)} – ${formatSig(hi, digits)}`;

  return (
    <div className="space-y-6">
      {/* Step 1: Device Type */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-semibold mb-1">Step 1: Select Device Type</h2>
          <p className="mb-4 text-sm text-gray-600">For your records only. It does not change the calculation.</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { type: "Logic IC", img: "/icons/logic.png" },
              { type: "Power Device", img: "/icons/power.png" },
              { type: "Memory Device", img: "/icons/memory.png" },
              { type: "Analog IC", img: "/icons/analog.png" },
              { type: "Other", img: "/icons/other.png" },
            ].map(({ type, img }) => (
              <button
                key={type}
                type="button"
                aria-pressed={formData.deviceType === type}
                className={`flex items-center space-x-2 border p-3 rounded ${formData.deviceType === type ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
                onClick={() => handleChange("deviceType", type)}
              >
                <img src={img} alt="" className="w-6 h-6" />
                <span>{type}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Failure Mode */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-semibold mb-1">Step 2: Select Known Failure Mechanism</h2>
          <p className="mb-4 text-sm text-gray-600">
            This sets the activation energy (Ea). If you do not know the mechanism, choose &ldquo;Not Sure&rdquo;.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FAILURE_MODES.map(({ mode, img, Ea, desc }) => (
              <button
                key={mode}
                type="button"
                aria-pressed={formData.failureMode === mode}
                className={`flex items-start space-x-3 border p-3 rounded text-left ${formData.failureMode === mode ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
                onClick={() => setFormData((prev: any) => ({ ...prev, failureMode: mode, customEa: null }))}
              >
                {/* "Not Sure" has no icon file; hide a missing image instead of showing a broken one. */}
                <img src={img} alt="" className="w-8 h-8 mt-1" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
                <div>
                  <div className="font-medium">
                    {mode} <span className="text-xs text-gray-500 italic">(Ea {Ea.map((v) => v.toFixed(1)).join("–")} eV)</span>
                  </div>
                  <div className="text-xs text-gray-600">{desc}</div>
                </div>
              </button>
            ))}

            <div className={`border p-3 rounded flex flex-col space-y-2 ${formData.failureMode === "Custom Ea" ? "border-blue-500 bg-blue-50" : ""}`}>
              <label className="font-medium flex items-center space-x-2">
                <input
                  type="radio"
                  name="failureMode"
                  value="custom"
                  checked={formData.failureMode === "Custom Ea"}
                  onChange={() => setFormData((prev: any) => ({ ...prev, failureMode: "Custom Ea" }))}
                />
                <span>Custom Ea</span>
              </label>
              <input
                type="number"
                step="0.01"
                aria-label="Custom activation energy (eV)"
                placeholder="Enter custom Ea (eV)"
                value={fieldValue(formData.customEa)}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, customEa: parseField(e.target.value) }))}
                className="border p-2 rounded w-full text-sm"
                disabled={formData.failureMode !== "Custom Ea"}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Operational Context */}
      {step === 3 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Step 3: Operational Context</h2>

          <div className="mb-4">
            <label className="block mb-2 font-medium" htmlFor="burnin-life">Intended Product Operating Life (hours)</label>
            <input
              id="burnin-life"
              type="number"
              value={fieldValue(formData.productLife)}
              onChange={(e) => handleChange("productLife", parseField(e.target.value))}
              className="border p-2 rounded w-full"
              placeholder="e.g., 50000"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium" htmlFor="burnin-use-temp">Typical Use Temperature (°C)</label>
            <input
              id="burnin-use-temp"
              type="number"
              value={fieldValue(formData.useTemp)}
              onChange={(e) => handleChange("useTemp", parseField(e.target.value))}
              className="border p-2 rounded w-full"
              placeholder="e.g., 65"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium" htmlFor="burnin-max-temp">Maximum Safe Burn-In Temperature (°C)</label>
            <input
              id="burnin-max-temp"
              type="number"
              value={fieldValue(formData.maxBurnTemp)}
              onChange={(e) => handleChange("maxBurnTemp", parseField(e.target.value))}
              className="border p-2 rounded w-full"
              placeholder="e.g., 125"
            />
            <p className="mt-1 text-xs text-gray-500">The hottest the device itself may get, usually from the datasheet.</p>
          </div>

          <div className="mb-4">
            <div className="block mb-2 font-medium">Burn-In Test Mode</div>
            <div className="flex space-x-4">
              {["Powered", "Unpowered"].map((mode) => (
                <label key={mode} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="testMode"
                    value={mode}
                    checked={formData.testMode === mode}
                    onChange={(e) => handleChange("testMode", e.target.value)}
                  />
                  <span>{mode}</span>
                </label>
              ))}
            </div>
          </div>

          {formData.testMode === "Powered" && (
            <div className="mb-4">
              <label className="block mb-2 font-medium" htmlFor="burnin-delta-t">Temperature Rise Due to Power, ΔT (°C)</label>
              <input
                id="burnin-delta-t"
                type="number"
                value={fieldValue(formData.deltaT)}
                onChange={(e) => handleChange("deltaT", parseField(e.target.value))}
                className="border p-2 rounded w-full"
                placeholder="e.g., 10"
              />
              <p className="mt-1 text-xs text-gray-500">How much hotter the powered device runs than the oven air. The oven is set cooler by this amount.</p>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Recommendations + Graph */}
      {step === 4 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Step 4: Burn-In Test Recommendations</h2>

          {"EaValues" in plan && plan.EaValues ? (
            <>
              <div className="rounded border-l-4 border-blue-500 bg-blue-50 p-4 text-blue-900">
                <p className="text-lg font-semibold">
                  Burn in for {range(plan.minHours, plan.maxHours)} hours at an oven temperature of {formatSig(plan.ovenTemp, 4)}°C
                </p>
                <p className="mt-1 text-sm">
                  That consumes about {Math.round(LIFE_FRACTION * 100)}% of the product&apos;s operating life (
                  {formatSig(plan.simulatedLife, 4)} equivalent use hours).
                  {plan.EaValues.length > 1 ? " The range comes from the spread in activation energy for this mechanism; the longer time is the conservative choice." : ""}
                </p>
              </div>

              <div className="mt-4 border p-4 rounded bg-gray-50 space-y-2 text-sm">
                {plan.powered && (
                  <p><strong>Device temperature (oven + ΔT):</strong> {formatSig(plan.deviceTemp, 4)}°C</p>
                )}
                <p><strong>Acceleration factor (AF):</strong> {range(plan.minAF, plan.maxAF)}</p>
                <p><strong>Activation energy (Ea):</strong> {plan.EaValues.map((v) => v.toFixed(2)).join(" – ")} eV</p>
                <p><strong>Use temperature:</strong> {formatSig(plan.useTemp, 4)}°C</p>
                <p><strong>Test mode:</strong> {plan.powered ? "Powered" : "Unpowered"}</p>
              </div>

              <BurnInGraph
                EaValues={plan.EaValues}
                useTemp={plan.useTemp}
                deviceTemp={plan.deviceTemp}
                simulatedLife={plan.simulatedLife}
              />

              <p className="text-xs text-gray-600 mt-2">
                The chart shows how the required burn-in time falls as the device gets hotter. The dashed line marks your burn-in temperature.
              </p>
            </>
          ) : (
            <div className="rounded border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">A few inputs are needed before a recommendation can be made:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {plan.problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        {step > 1 ? (
          <button type="button" className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300" onClick={handleBack}>
            Back
          </button>
        ) : <span />}
        {step < 4 && (
          <button type="button" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onClick={handleNext}>
            Next
          </button>
        )}
      </div>
    </div>
  );
};
