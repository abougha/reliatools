// components/BurnInWizardSteps.tsx
import React, { useMemo } from "react";
import { BurnInGraph } from "./BurnInGraph"; // Placeholder for the graph (coming next)

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

  const toggleFailureMode = (mode: string) => {
    setFormData((prev: any) => {
      const updated = prev.failureModes.includes(mode)
        ? prev.failureModes.filter((m: string) => m !== mode)
        : [...prev.failureModes, mode];
      return { ...prev, failureModes: updated };
    });
  };

  // 🔍 Burn-In Recommendations Logic
  const recommendations = useMemo(() => {
    const Ea = formData.failureModes.includes("Electromigration") ? 0.7 :
               formData.failureModes.includes("TDDB") ? 0.6 :
               formData.failureModes.includes("NBTI") ? 0.4 :
               formData.failureModes.includes("HCI") ? 0.4 : 0.7; // default

    const useTempK = formData.useTemp + 273.15;
    const maxBurnTempK = formData.maxBurnTemp + 273.15;
    const targetLifeHours = (formData.productLife || 5) * 8760;
    const simulatedLife = 0.1 * targetLifeHours; // Simulate 10% of life

    const AF = Math.exp(Ea / k * (1 / useTempK - 1 / maxBurnTempK));
    let recommendedDuration = simulatedLife / AF;
    if (formData.maxBurnDuration && recommendedDuration > formData.maxBurnDuration) {
      recommendedDuration = formData.maxBurnDuration;
    }

    return {
      Ea,
      AF: AF.toFixed(2),
      recommendedDuration: recommendedDuration.toFixed(1),
      simulatedLife: simulatedLife.toFixed(0),
    };
  }, [formData]);

  return (
    <div className="space-y-6">
      {/* Step 1: Device Type */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Step 1: Select Device Type</h2>
          <div className="grid grid-cols-2 gap-4">
            {["Logic IC", "Power Device", "Memory Device", "Analog IC", "Other"].map((type) => (
              <button
                key={type}
                className={`border p-3 rounded ${formData.deviceType === type ? "bg-blue-200" : ""}`}
                onClick={() => handleChange("deviceType", type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Failure Modes */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Step 2: Select Known Failure Mechanisms</h2>
          <div className="grid grid-cols-2 gap-4">
            {["Electromigration", "TDDB", "NBTI", "HCI", "Not Sure"].map((mode) => (
              <button
                key={mode}
                className={`border p-3 rounded ${formData.failureModes.includes(mode) ? "bg-green-200" : ""}`}
                onClick={() => toggleFailureMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Operational Context */}
      {step === 3 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Step 3: Operational Context</h2>

          <div className="mb-4">
            <label className="block mb-2 font-medium">Intended Product Life (years)</label>
            <select
              value={formData.productLife}
              onChange={(e) => handleChange("productLife", parseInt(e.target.value))}
              className="border p-2 rounded w-full"
            >
              {[1, 3, 5, 10].map((year) => (
                <option key={year} value={year}>{year} year{year > 1 ? "s" : ""}</option>
              ))}
              <option value={0}>Other (enter manually below)</option>
            </select>
            {formData.productLife === 0 && (
              <input
                type="number"
                placeholder="Enter custom life in years"
                className="border p-2 mt-2 rounded w-full"
                onChange={(e) => handleChange("productLife", parseInt(e.target.value))}
              />
            )}
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium">Typical Use Temperature (°C)</label>
            <input
              type="number"
              value={formData.useTemp}
              onChange={(e) => handleChange("useTemp", parseFloat(e.target.value))}
              className="border p-2 rounded w-full"
              placeholder="e.g., 85°C"
            />
          </div>
        </div>
      )}

      {/* Step 4: Burn-In Capabilities */}
      {step === 4 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Step 4: Burn-In Capabilities</h2>

          <div className="mb-4">
            <label className="block mb-2 font-medium">Maximum Safe Burn-In Temperature (°C)</label>
            <input
              type="number"
              value={formData.maxBurnTemp}
              onChange={(e) => handleChange("maxBurnTemp", parseFloat(e.target.value))}
              className="border p-2 rounded w-full"
              placeholder="e.g., 125°C"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium">Maximum Allowable Burn-In Duration (hours) <span className="text-sm text-gray-500">(optional)</span></label>
            <input
              type="number"
              value={formData.maxBurnDuration}
              onChange={(e) => handleChange("maxBurnDuration", parseFloat(e.target.value))}
              className="border p-2 rounded w-full"
              placeholder="e.g., 168 hours"
            />
          </div>

          <p className="text-sm text-gray-600 mt-2">
            🔎 *Burn-in typically simulates 5–10% of the product's life, not the full life.*
          </p>
        </div>
      )}

      {/* Step 5: Recommendations + Graph */}
      {step === 5 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Step 5: Burn-In Test Recommendations</h2>

          <div className="border p-4 rounded bg-gray-100 space-y-2">
            <p><strong>Recommended Burn-In Temperature:</strong> {formData.maxBurnTemp}°C</p>
            <p><strong>Recommended Burn-In Duration:</strong> {recommendations.recommendedDuration} hours</p>
            <p><strong>Simulated Life (10% of target life):</strong> {recommendations.simulatedLife} hours</p>
            <p><strong>Acceleration Factor (AF):</strong> {recommendations.AF}</p>
            <p><strong>Activation Energy (Ea):</strong> {recommendations.Ea} eV</p>
          </div>

          {/* Burn-In Graph */}
          <BurnInGraph Ea={recommendations.Ea} useTemp={formData.useTemp} ovenTemp={0} />

          <p className="text-sm text-gray-600 mt-2">
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
        {step < 5 && (
          <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={handleNext}>
            Next
          </button>
        )}
      </div>
    </div>
  );
};
