"use client";

import Link from "next/link";
import Image from "next/image";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

export const metadata = {
  title: "Coffin-Manson Model for Thermal Fatigue in Microelectronics | Reliatools",
  description:
    "Understand how thermal cycling affects solder joint fatigue in microelectronics using the Coffin-Manson model. Includes graph and calculator.",
};

import ResourceCard from "@/components/ResourceCard";

export default function CoffinMansonArticle() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold mb-4">
        Understanding Thermal Shock and the Coffin-Manson Model in Microelectronics
      </h1>

      <p className="text-lg text-gray-700 mb-6">
        Consumer electronics—like smartphones, laptops, and tablets—must withstand frequent power cycles and
        ambient temperature changes. One of the most critical reliability challenges is
        <strong> thermal shock</strong>: rapid temperature changes that cause expansion and contraction,
        leading to material fatigue.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">
        The Coffin-Manson Model: Predicting Fatigue Life
      </h2>
      <p>
        The Coffin-Manson equation helps engineers estimate the number of cycles a material can withstand before
        failure under cyclic thermal stress:
      </p>
      <BlockMath math="N_f = C \cdot (\Delta\varepsilon_p)^{-k}" />

      <p>Where:</p>
      <ul className="list-disc list-inside">
        <li><strong>N<sub>f</sub></strong>: Number of cycles to failure</li>
        <li><strong>C</strong>: Material constant (empirically determined)</li>
        <li><strong>Δε<sub>p</sub></strong>: Plastic strain range per cycle (proportional to ΔT)</li>
        <li><strong>k</strong>: Coffin-Manson exponent (typically 1.5–2.5 for solder joints)</li>
      </ul>

      <p>
        This equation shows that as temperature swing increases, the number of cycles to failure decreases rapidly—
        a critical insight for designing reliable microelectronics.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Graph: Cycles to Failure vs. Temperature Delta</h2>
      <p>The graph below illustrates how fatigue life decreases as thermal stress increases:</p>

      <div className="my-6">
        <Image
          src="/coffin_manson_graph.png"
          alt="Coffin-Manson fatigue life prediction graph for solder joints under thermal cycling"
          width={800}
          height={400}
          className="rounded border"
        />
      </div>

      <h2 className="text-2xl font-semibold mt-8 mb-4">
        What Physics-of-Failure Does Thermal Shock Address?
      </h2>
      <p>
        The Coffin-Manson model specifically addresses <strong>low-cycle fatigue</strong>, where materials—
        particularly solder joints and interfaces—fail due to repeated thermal expansion and contraction.
      </p>
      <p>
        Over time, cyclic strain leads to microcracks in solder joints, eventually causing open circuits and
        intermittent failures. This is a key concern for SMT, BGA, QFN, and other fine-pitch components in
        consumer electronics.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">
        Real-World Applications: Microelectronics Under Thermal Shock
      </h2>
      <p>
        Thermal shock is a critical concern for devices like smartphones and laptops. Charging, CPU loads,
        and outdoor usage lead to temperature swings that stress components. Solder joints and interconnects
        are the most vulnerable.
      </p>
      
<h2 className="text-2xl font-semibold mt-8 mb-4">Limitations and Best Practices</h2>
      <ul className="list-disc list-inside">
        <li>The model assumes strain-controlled fatigue—other mechanisms may dominate in some cases.</li>
        <li>Material constants (C, k) vary with solder alloy, pad geometry, and board structure.</li>
        <li>Combine simulation with physical testing for accurate validation.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Conclusion: Designing for Durability</h2>
      <p>
        The Coffin-Manson model is essential for understanding fatigue from thermal cycling in microelectronics.
        <p>With predictive tools like our <Link href="/tools/coffin-manson" className="text-blue-600 hover:underline">Coffin-Manson Calculator</Link>, engineers can make smarter design decisions and ensure devices remain reliable in everyday use.</p>
      </p>
    </main>
  );
}
