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
  ReferenceLine,
} from "recharts";

const arrheniusData = [
  { temperature: 50, AF: 1.5 },
  { temperature: 75, AF: 2.5 },
  { temperature: 100, AF: 5 },
  { temperature: 125, AF: 10 },
  { temperature: 150, AF: 18 },
];

export default function ArrheniusArticle() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold mb-4">Understanding Arrhenius for Reliability</h1>
      <p className="text-lg text-gray-700 mb-6">
        Reliability engineering is all about <strong>predicting how long a product will last under specific conditions</strong>.
        One of the most fundamental tools for this prediction is the <strong>Arrhenius equation</strong>, which models the effect
        of temperature on reaction rates—and by extension, on failure mechanisms in materials and systems.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">The Arrhenius Equation: A Foundation of Reliability Modeling</h2>
      <p>The Arrhenius equation mathematically relates the rate of a chemical reaction (or failure process) to temperature:</p>
      <BlockMath math={"t_f = A \\cdot e^{-\\frac{E_a}{kT}}"} />

      <p>Where:</p>
      <ul className="list-disc list-inside">
        <li><strong>t<sub>f</sub></strong>: Time to failure</li>
        <li><strong>A</strong>: Pre-exponential factor (a constant for the material or process)</li>
        <li><strong>E<sub>a</sub></strong>: Activation energy (the energy barrier for the reaction)</li>
        <li><strong>k</strong>: Boltzmann constant (8.617 × 10⁻⁵ eV/K)</li>
        <li><strong>T</strong>: Absolute temperature in Kelvin</li>
      </ul>

      <p>This equation shows that <strong>as temperature increases, time to failure decreases exponentially</strong>—a critical insight for accelerated testing.</p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Graph: Acceleration Factor vs. Temperature</h2>
      <p>The graph below illustrates how the acceleration factor increases with temperature for a typical activation energy:</p>

      <div className="w-full h-64 bg-white rounded border mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={arrheniusData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="temperature"
              label={{ value: "Temperature (°C)", position: "insideBottom", offset: -5 }}
            />
            <YAxis
              label={{ value: "Acceleration Factor", angle: -90, position: "insideLeft" }}
            />
            <Tooltip />
            <Line type="monotone" dataKey="AF" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
            <ReferenceLine x={125} stroke="gray" strokeDasharray="3 3" label="Test Temp" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Why Activation Energy Matters</h2>
      <p>
        Activation energy <InlineMath math={"E_a"} /> represents the minimum energy required for a reaction to occur.
        In reliability, this translates to the energy needed for a failure mechanism (e.g., electromigration, thermal breakdown) to manifest.
      </p>

      <p>Different materials and failure modes have different <InlineMath math={"E_a"} /> values:</p>
      <ul className="list-disc list-inside">
        <li>For metals in microelectronics (e.g., aluminum, copper), <InlineMath math={"E_a"} /> typically ranges from 0.5 to 1.0 eV.</li>
        <li>For polymers in automotive components, values can vary widely based on additives, fillers, and degradation modes (thermal oxidation, hydrolysis).</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Acceleration Factor: Predicting Life from Tests</h2>
      <p>
        One of the most powerful uses of Arrhenius is calculating the <strong>Acceleration Factor (AF)</strong>—how much faster a failure occurs at an elevated test temperature compared to normal use:
      </p>
      <BlockMath math={"AF = \\exp \\left( \\frac{E_a}{k} \\left( \\frac{1}{T_{use}} - \\frac{1}{T_{test}} \\right) \\right)"} />

      <p>For example, an automotive control module might undergo a 1000-hour test at 125°C. Using Arrhenius, engineers can estimate that this is equivalent to 10 years at 55°C in the field. This capability is essential for industries like:</p>
      <ul className="list-disc list-inside">
        <li><strong>Automotive:</strong> Validating ECUs, sensors, and connectors to withstand years of harsh thermal exposure.</li>
        <li><strong>Microelectronics:</strong> Testing chips and packages under accelerated thermal and voltage stresses to predict long-term reliability.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Real-World Applications</h2>
      <h3 className="text-xl font-semibold mt-6 mb-2">Automotive Industry: Simulating a Decade in Weeks</h3>
      <p>
        In the <strong>Robustness Validation</strong> process for automotive electronic modules, the Arrhenius model underpins burn-in tests and mission profile validations.
        By applying realistic environmental stressors (e.g., -40°C to +125°C temperature ranges, vibration, humidity), engineers ensure that control units, sensors, and actuators can survive 15 years of vehicle life.
        The <Link href="https://www.zvei.org" 
        target="_blank" 
        className="text-blue-600 hover:underline">ZVEI Handbook</Link> provides structured methodologies for integrating Arrhenius-based models into testing protocols.
      </p>
      <p>
        Curious how temperature affects your reliability? Check out our{" "}
        <Link href="/tools/Arrhenius" 
        className="text-blue-600 hover:underline">Arrhenius Calculator</Link> for quick estimates.
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-2">Microelectronics: Managing Thermal Risks</h3>
      <p>
        In <strong>microelectronics</strong>, the Arrhenius equation helps predict failure mechanisms like electromigration and dielectric breakdown.
        For example, a chip operating at 85°C may fail in 10 years, but testing at 150°C can simulate this lifetime in just a few months.
        The <Link href="https://ntrs.nasa.gov/api/citations/20020083691/downloads/20020083691.pdf" 
        target="_blank" 
        className="text-blue-600 hover:underline">NASA Physics of Failure Handbook</Link> emphasizes the importance of understanding the underlying failure physics—not just applying the equation blindly.
      </p>
      <p>
        Want to estimate your own short burn-in test conditions to check for early failures? Try our{" "}
        <Link href="/tools/BurnInWizard" 
        className="text-blue-600 hover:underline">Burn-In Wizard</Link> to simulate equivalent field life from accelerated test plans.
      </p>
      

      <h2 className="text-2xl font-semibold mt-8 mb-4">Limitations and Cautions</h2>
      <ul className="list-disc list-inside">
        <li><strong>Not all failures are thermally activated:</strong> Mechanical fatigue, corrosion, and radiation may require different models.</li>
        <li><strong>Test temperatures must be realistic:</strong> Exceeding material limits can introduce failure mechanisms (e.g., melting solder, dielectric breakdown) that wouldn't occur in the field.</li>
        <li><strong>Assumptions of constant <InlineMath math={"E_a"} />:</strong> May not hold across different materials, temperatures, or combined stresses (e.g., temperature and humidity in the Peck model).</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Conclusion: A Tool, Not a Crystal Ball</h2>
      <p>
        The Arrhenius equation remains a cornerstone of accelerated life testing and physics-of-failure reliability engineering.
        By understanding the materials, the failure modes, and the operating environment, engineers can use Arrhenius-based models to predict, validate, and improve product reliability—whether it’s a car’s control module surviving 15 years on the road or a microchip enduring a decade of power cycling.
      </p>

      <p>
        Ready to try it yourself? Visit our{" "}
        <Link href="/tools/arrhenius" className="text-blue-600 hover:underline">Arrhenius Calculator</Link>{" "}
        and{" "}
        <Link href="/tools/burn-in-wizard" className="text-blue-600 hover:underline">Burn-In Wizard</Link>{" "}
        to simplify your reliability test planning today.
      </p>
    </main>
  );
}
