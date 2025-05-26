import React, { useMemo } from "react";
import { BurnInGraph } from "./BurnInGraph";

const k = 8.617e-5; // Boltzmann constant in eV/K

type WizardProps = {
  step: number;
  setStep: (n: number) => void;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
};

export const BurnInWizardSteps: React.FC<WizardProps> = ({ step, setStep, formData, setFormData }) => {
  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const recommendations = useMemo(() => {
    let EaValues: number[] = [];

    if (formData.failureMode === "Custom Ea" && formData.customEa) {
      EaValues = [formData.customEa];
    } else if (formData.failureMode === "Electromigration") {
      EaValues = [0.7, 1.2];
    } else if (formData.failureMode === "TDDB") {
      EaValues = [0.6, 0.9];
    } else if (formData.failureMode === "NBTI" || formData.failureMode === "HCI") {
      EaValues = [0.3, 0.4];
    } else {
      EaValues = [0.7]; // Default for "Not Sure"
    }

    const useTempK = formData.useTemp + 273.15;
    const maxSafeTemp = formData.maxBurnTemp;
    const deltaT = formData.testMode === "Powered" ? formData.deltaT || 0 : 0;
    const adjustedOvenTemp = formData.testMode === "Powered" ? Math.max(0, maxSafeTemp - deltaT) : maxSafeTemp;
    const deviceTempK = adjustedOvenTemp + deltaT + 273.15;

    const simulatedLife = 0.1 * (formData.productLife || 50000); // Life in hours

    const durations = EaValues.map(ea => {
      const AF = Math.exp(ea / k * (1 / useTempK - 1 / deviceTempK));
      return (simulatedLife / AF).toFixed(1);
    });

    const AFValues = EaValues.map(ea => {
      const AF = Math.exp(ea / k * (1 / useTempK - 1 / deviceTempK));
      return AF.toFixed(2);
    });

    return {
      EaRange: EaValues.map(ea => ea.toFixed(2)).join(" – "),
      durations,
      AFValues,
      simulatedLife: simulatedLife.toFixed(0),
      ovenTemp: adjustedOvenTemp.toFixed(1),
      deviceTemp: (adjustedOvenTemp + deltaT).toFixed(1),
      deltaT,
      testMode: formData.testMode,
    };
  }, [formData]);

  return (
    <div className="space-y-6">
      {/* Step 1: Device Type */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Step 1: Select Device Type</h2>
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
                className={`flex items-center space-x-2 border p-3 rounded ${formData.deviceType === type ? "bg-blue-200" : ""}`}
                onClick={() => handleChange("deviceType", type)}
              >
                <img src={img} alt={type} className="w-6 h-6" />
                <span>{type}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Failure Mode */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Step 2: Select Known Failure Mechanism</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { mode: "Electromigration", img: "/icons/electromigration.png", Ea: "0.7–1.2", desc: "Metal atom movement under current flow." },
              { mode: "TDDB", img: "/icons/tddb.png", Ea: "0.6–0.9", desc: "Breakdown of gate oxide under electric field stress." },
              { mode: "NBTI", img: "/icons/nbti.png", Ea: "0.3–0.4", desc: "Threshold voltage shift in PMOS transistors." },
              { mode: "HCI", img: "/icons/hci.png", Ea: "0.3–0.4", desc: "Hot carrier injection causing gate oxide damage." },
              { mode: "Not Sure", img: "/icons/question.png", Ea: "0.7", desc: "General test conditions will apply." },
            ].map(({ mode, img, Ea, desc }) => (
              <button
                key={mode}
                className={`flex items-start space-x-3 border p-3 rounded ${formData.failureMode === mode ? "bg-green-200" : ""}`}
                onClick={() => setFormData((prev: any) => ({ ...prev, failureMode: mode, customEa: null }))}
              >
                <img src={img} alt={mode} className="w-8 h-8 mt-1" />
                <div>
                  <div className="font-medium">{mode} <span className="text-xs text-gray-500 italic">(Ea {Ea} eV)</span></div>
                  <div className="text-xs text-gray-600">{desc}</div>
                </div>
              </button>
            ))}

            <div className="border p-3 rounded flex flex-col space-y-2">
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
                placeholder="Enter custom Ea (eV)"
                value={formData.customEa || ""}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, customEa: parseFloat(e.target.value) || 0 }))}
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
            <label className="block mb-2 font-medium">Intended Product Operating Life (hours)</label>
            <input
              type="number"
              value={formData.productLife || ""}
              onChange={(e) => handleChange("productLife", parseFloat(e.target.value))}
              className="border p-2 rounded w-full"
              placeholder="e.g., 50000"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium">Typical Use Temperature (°C)</label>
            <input
              type="number"
              value={formData.useTemp || ""}
              onChange={(e) => handleChange("useTemp", parseFloat(e.target.value))}
              className="border p-2 rounded w-full"
              placeholder="e.g., 85°C"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium">Maximum Safe Burn-In Temperature (°C)</label>
            <input
              type="number"
              value={formData.maxBurnTemp || ""}
              onChange={(e) => handleChange("maxBurnTemp", parseFloat(e.target.value))}
              className="border p-2 rounded w-full"
              placeholder="e.g., 125°C"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium">Burn-In Test Mode</label>
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
              <label className="block mb-2 font-medium">ΔT Due to Power (°C)</label>
              <input
                type="number"
                value={formData.deltaT || ""}
                onChange={(e) => handleChange("deltaT", parseFloat(e.target.value))}
                className="border p-2 rounded w-full"
                placeholder="e.g., 10°C"
              />
            </div>
          )}
        </div>
      )}

      {/* Step 4: Recommendations + Graph */}
      {step === 4 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Step 4: Burn-In Test Recommendations</h2>

          <div className="border p-4 rounded bg-gray-100 space-y-2 text-sm">
            <p><strong>Recommended Oven Temperature:</strong> {recommendations.ovenTemp}°C</p>
            {recommendations.testMode === "Powered" && (
              <p><strong>Device Temperature (Oven + ΔT):</strong> {recommendations.deviceTemp}°C</p>
            )}
            <p>
              <strong>Recommended Burn-In Duration:</strong>{" "}
              {recommendations.durations.length === 1
                ? `${recommendations.durations[0]} hours`
                : `${recommendations.durations[0]} – ${recommendations.durations[1]} hours`}
            </p>
            <p><strong>Simulated Life (10% of target life):</strong> {recommendations.simulatedLife} hours</p>
            <p>
              <strong>Acceleration Factor (AF):</strong>{" "}
              {recommendations.AFValues.length === 1
                ? recommendations.AFValues[0]
                : `${recommendations.AFValues[0]} – ${recommendations.AFValues[1]}`}
            </p>
            <p><strong>Activation Energy (Ea):</strong> {recommendations.EaRange} eV</p>
            <p><strong>Test Mode:</strong> {recommendations.testMode}</p>
          </div>

          <BurnInGraph
            Ea={formData.customEa || (formData.failureMode === "Electromigration" ? 0.7 : 0.7)}
            useTemp={formData.useTemp}
            ovenTemp={parseFloat(recommendations.ovenTemp)}
            durations={recommendations.durations}
            EaRange={recommendations.EaRange}
          />

          <p className="text-xs text-gray-600 mt-2">
            📊 The graph shows how Burn-In Temperature affects the required test duration. The shaded band represents ±10% variation around the recommended point.
          </p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        {step > 1 && (
          <button className="bg-gray-300 px-4 py-2 rounded" onClick={handleBack}>
            Back
          </button>
        )}
        {step < 4 && (
          <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={handleNext}>
            Next
          </button>
        )}
      </div>
    </div>
  );
};
