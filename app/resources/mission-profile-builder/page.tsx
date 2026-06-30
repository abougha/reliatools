import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ContactCTA from "@/components/ContactCTA";

export const metadata: Metadata = {
  title: "Stop Guessing Environmental Loads — Start Designing from a Real Mission Profile",
  description:
    "Build a defensible duty cycle and quantify lifetime exposure using an interactive stress × phase matrix.",
  openGraph: {
    title: "Stop Guessing Environmental Loads — Start Designing from a Real Mission Profile",
    description:
      "Build a defensible duty cycle and quantify lifetime exposure using an interactive stress × phase matrix.",
    images: ["/resources/dutycycle.png"],
  },
};

export default function MissionProfileBuilderArticlePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-4 text-4xl font-bold">
        Stop Guessing Environmental Loads — Start Designing from a Real Mission Profile
      </h1>

      <p className="mb-4 text-lg text-gray-700">
        Most products don’t fail because engineers lack intelligence. They fail because the real-world duty cycle
        was never clearly defined.
      </p>

      <p className="mb-4">Before running thermal, vibration, humidity, or salt tests, we should ask:</p>

      <p className="mb-4 text-lg font-medium">What will this product actually experience over its lifetime?</p>

      <p className="mb-6">
        Duty cycle definition is especially important because specifications are typically written to be generic. They
        are designed to cover broad application ranges, not your specific product in your specific environment. When
        engineers apply specifications blindly, they either over test (adding cost and time) or under test (missing
        real failure mechanisms). A quantified mission profile allows designers and reliability engineers to apply
        specifications intelligently tailoring severity, duration, and acceleration to match actual lifetime exposure
        instead of assuming the worst or hoping for the best.
      </p>

      <h2 className="mb-4 mt-8 text-2xl font-semibold">The Problem</h2>
      <p className="mb-4">
        In many programs, environmental testing becomes a checklist exercise. Tests are executed, reports are
        generated, and "pass" becomes the objective.
      </p>

      <p className="mb-2">But without a quantified duty cycle:</p>
      <ul className="mb-6 list-inside list-disc space-y-1">
        <li>Stress levels are guessed</li>
        <li>Durations are arbitrary</li>
        <li>Acceleration lacks context</li>
        <li>Cumulative lifetime exposure is unclear</li>
      </ul>

      <p className="mb-6">Design decisions deserve better inputs.</p>

      <h2 className="mb-4 mt-8 text-2xl font-semibold">The Mission Profile Builder</h2>
      <p className="mb-6">
        I built a Mission Profile / Duty Cycle Builder inside Reliatools to make environmental assumptions explicit and
        measurable.
      </p>

      <h2 className="mb-4 mt-8 text-2xl font-semibold">See the Tool</h2>
      <div className="my-6">
        <Image
          src="/resources/dutycycle.png"
          alt="Mission Profile Builder - Stress vs Phase Matrix"
          width={1600}
          height={900}
          className="rounded-2xl border shadow-sm"
        />
      </div>

      <p className="mb-4">The screenshot above shows the full workflow in one view:</p>
      <ul className="mb-6 list-inside list-disc space-y-1">
        <li>
          A Stress vs Phase matrix on the left, where engineers click N / P / L (Not likely / Possible / Likely).
        </li>
        <li>Stress values displayed directly inside each cell (ΔT, RH, Grms, kV, etc.).</li>
        <li>Exposure clearly defined per phase (% of life, fixed hours, or once-per-life events).</li>
        <li>
          A Selected Cell Editor panel on the right to refine likelihood, exposure model, and numeric assumptions.
        </li>
        <li>
          Everything is tied to a defined target life (years or hours), allowing the tool to calculate total lifetime
          exposure and event counts.
        </li>
      </ul>

      <p className="mb-2">The conversation shifts from:</p>
      <p className="mb-2">&quot;It might see high humidity.&quot;</p>
      <p className="mb-2">To:</p>
      <p className="mb-6">
        &quot;Over 10 years, it will see ~1,200 hours above 95% RH and ~800 thermal cycles of ΔT ≈ 70°C.&quot; That’s a
        different level of engineering clarity.
      </p>

      <h2 className="mb-4 mt-8 text-2xl font-semibold">Why It Matters</h2>
      <p className="mb-4">
        A structured mission profile connects:
        <br />
        Field reality → Physics of failure → Validation strategy → Robust design
      </p>

      <p className="mb-6">
        It improves DFMEA inputs, supports rational derating, and grounds accelerated testing in actual lifetime
        exposure.
      </p>

      <h2 className="mb-4 mt-8 text-2xl font-semibold">Try It</h2>
      <p className="mb-6">
        Try it directly in the{" "}
        <Link href="/tools/MissionProfile" className="font-semibold text-blue-600 hover:underline">
          Mission Profile Builder
        </Link>
        .
      </p>

      <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Ready to quantify your real environmental loads?</h3>
        <p className="mt-2 text-sm text-gray-700">
          Build a defensible duty cycle and map lifetime exposure before writing your next test plan.
        </p>
        <Link
          href="/tools/MissionProfile"
          className="mt-4 inline-flex rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Try the Mission Profile Builder
        </Link>
      </section>
      <ContactCTA variant="article" />
    </main>
  );
}
