// app/tools/CoffinManson/page.tsx
"use client";

import { useState } from "react";

export default function CoffinMansonCalculator() {
  const [A, setA] = useState("");
  const [strain, setStrain] = useState(""); // Δε
  const [c, setC] = useState("");
  const [Nf, setNf] = useState<number | null>(null);

  const calculateNf = () => {
    if (!A || !strain || !c) return;

    const A_num = parseFloat(A);
    const strain_num = parseFloat(strain);
    const c_num = parseFloat(c);

    const result = A_num * Math.pow(strain_num, -c_num);
    setNf(result);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Coffin-Manson Calculator</h1>

      <div className="space-y-4">
        <div>
          <label className="block font-medium">Material Constant (A)</label>
          <input
            type="number"
            step="any"
            value={A}
            onChange={(e) => setA(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block font-medium">Strain Range (Δε)</label>
          <input
            type="number"
            step="any"
            value={strain}
            onChange={(e) => setStrain(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block font-medium">Exponent (c)</label>
          <input
            type="number"
            step="any"
            value={c}
            onChange={(e) => setC(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <button
          onClick={calculateNf}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Calculate Cycles to Failure (Nf)
        </button>

        {Nf !== null && (
          <div className="mt-6 text-lg font-semibold">
            Cycles to Failure (Nf): {Nf.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
}
