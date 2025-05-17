// app/tools/Arrhenius/page.tsx
"use client";

import { useState } from "react";

export default function ArrheniusCalculator() {
  const [Ea, setEa] = useState(""); // Activation energy in eV
  const [Tuse, setTuse] = useState(""); // Use temp in °C
  const [Tstress, setTstress] = useState(""); // Stress temp in °C
  const [AF, setAF] = useState<number | null>(null);

  const calculateAF = () => {
    const k = 8.617e-5; // Boltzmann constant in eV/K
    const TuseK = parseFloat(Tuse) + 273.15;
    const TstressK = parseFloat(Tstress) + 273.15;

    if (!Ea || !Tuse || !Tstress) return;

    const af =
      Math.exp(
        (parseFloat(Ea) / k) * (1 / TuseK - 1 / TstressK)
      );

    setAF(af);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Arrhenius Calculator</h1>

      <div className="space-y-4">
        <div>
          <label className="block font-medium">Activation Energy (eV)</label>
          <input
            type="number"
            step="any"
            value={Ea}
            onChange={(e) => setEa(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block font-medium">Use Temperature (°C)</label>
          <input
            type="number"
            step="any"
            value={Tuse}
            onChange={(e) => setTuse(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block font-medium">Stress Temperature (°C)</label>
          <input
            type="number"
            step="any"
            value={Tstress}
            onChange={(e) => setTstress(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <button
          onClick={calculateAF}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Calculate
        </button>

        {AF !== null && (
          <div className="mt-6 text-lg font-semibold">
            Acceleration Factor (AF): {AF.toFixed(3)}
          </div>
        )}
      </div>
    </div>
  );
}
