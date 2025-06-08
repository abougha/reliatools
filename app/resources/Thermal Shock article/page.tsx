"use client";

import Link from "next/link";
import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

// Sample data for Cycles to Failure vs. Temperature Delta
const data = [
  { deltaT: 20, cycles: 500000 },
  { deltaT: 40, cycles: 100000 },
  { deltaT: 60, cycles: 25000 },
  { deltaT: 80, cycles: 8000 },
  { deltaT: 100, cycles: 3000 },
];

export default function CoffinMansonArticle() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold mb-4">Understanding Thermal Shock and the Coffin-Manson Model in Microelectronics</h1>

      <p className="text-lg text-gray-700 mb-6">
        Consumer electronics—like smartphones, laptops, and tablets—must withstand a variety of operating conditions, including frequent power cycles and ambient temperature changes. One of the most critical reliability challenges is <strong>thermal shock</strong>: rapid temperature changes that cause expansion and contraction, leading to material fatigue.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">The Coffin-Manson Model: Predicting Fatigue Life</h2>
      <p>The Coffin-Manson equation helps engineers estimate the number of cycles a material can withstand before failure under cyclic thermal stress:</p>
      <BlockMath math={"N_f = C \\cdot (\\Delta\\epsilon_p)^{-k}"} />

      <p>Where:</p>
      <ul className="list-disc list-inside">
        <li><strong>N<sub>f</sub></strong>: Number of cycles to failure</li>
        <li><strong>C</strong>: Material constant (empirically determined)</li>
        <li><strong>Δε<sub>p</sub></strong>: Plastic strain range per cycle (proportional to ΔT)</li>
        <li><strong>k</strong>: Coffin-Manson exponent (typically 1.5–2.5 for solder joints)</li>
      </ul>

      <p>This equation shows that as temperature swing increases, the number of cycles to failure decreases rapidly—a critical insight for designing reliable microelectronics.</p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Graph: Cycles to Failure vs. Temperature Delta</h2>
      <p>The graph below illustrates how fatigue life decreases as thermal stress increases:</p>

      <div className="w-full h-64 bg-white rounded border mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="deltaT"
              label={{ value: "Temperature Delta (°C)", position: "insideBottom", offset: -5 }}
            />
            <YAxis
              scale="log"
              domain={['auto', 'auto']}
              label={{ value: "Cycles to Failure (log scale)", angle: -90, position: "insideLeft", offset: 10, style: { textAnchor: "middle" } }}
            />
            <Tooltip />
            <Line type="monotone" dataKey="cycles" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h2 className="text-2xl font-semibold mt-8 mb-4">What Physics-of-Failure Does Thermal Shock Address?</h2>
      <p>
        The Coffin-Manson model specifically addresses the physics-of-failure mechanism of <strong>low-cycle fatigue</strong>, where materials—particularly solder joints and package interfaces—fail due to repeated thermal expansion and contraction. Each thermal cycle induces strain as different materials in a package (such as silicon, copper, and solder) expand and contract at different rates.
      </p>
      <p>
        Over time, this cyclic strain leads to the initiation and growth of <strong>microcracks</strong> in solder joints, which can propagate into full cracks, causing open circuits and intermittent failures in microchips and microelectronic assemblies. This failure mode is a key concern for <strong>surface mount technology (SMT) devices</strong>, <strong>ball grid arrays (BGAs)</strong>, <strong>QFN packages</strong>, and other fine-pitch components found in smartphones, tablets, and laptops.
      </p>
      <p>
        Thermal shock testing—guided by Coffin-Manson predictions—helps identify the fatigue life of solder joints and the reliability limits of package designs. It ensures that products can withstand real-world thermal cycling without failure, addressing a major reliability risk in modern consumer electronics.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Real-World Applications: Microelectronics Under Thermal Shock</h2>
      <p>
        Thermal shock is a critical concern for microelectronics in consumer devices. Smartphones and laptops experience temperature swings during charging, usage, and environmental exposure. Solder joints, package interfaces, and interconnects are especially vulnerable to fatigue, leading to failures such as open circuits or intermittent connections.
      </p>

      <p>
        Curious how thermal shock affects your design? Use our{" "}
        <Link href="/tools/coffin-manson" className="text-blue-600 hover:underline">Coffin-Manson Calculator</Link> to estimate fatigue life based on your thermal cycle conditions.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Limitations and Best Practices</h2>
      <ul className="list-disc list-inside">
        <li>The Coffin-Manson model assumes strain-controlled fatigue; it may not apply to all failure mechanisms.</li>
        <li>Material constants (C, k) vary and should be based on empirical data when possible.</li>
        <li>Combine modeling with real-world testing for the most accurate reliability predictions.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Conclusion: Designing for Durability</h2>
      <p>
        The Coffin-Manson model is a powerful tool for predicting thermal fatigue in microelectronics. By understanding the effects of thermal cycling and using tools like the{" "}
        <Link href="/tools/coffin-manson" className="text-blue-600 hover:underline">Coffin-Manson Calculator</Link>, engineers can design more reliable consumer electronics that stand up to the rigors of everyday use.
      </p>
    </main>
  );
}
