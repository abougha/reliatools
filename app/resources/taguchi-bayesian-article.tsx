// FILE: app/resources/taguchi-bayesian-article.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

function LoopDiagram() {
  // Simple Tailwind-friendly inline SVG (no external deps)
  return (
    <div className="my-6 rounded-2xl border bg-white p-6">
      <h3 className="text-lg font-semibold mb-3">Adaptive loop</h3>
      <p className="text-gray-700 mb-4">
        The key idea is to turn validation into an adaptive learning loop:
        <strong> Test → Update → Decide → Next Test</strong>.
      </p>

      <div className="overflow-x-auto">
        <svg
          width="100%"
          height="170"
          viewBox="0 0 920 170" preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Test Update Decide Next Test loop diagram"
          className="w-full"
        >
          {/* nodes */}
          {[
            { x: 70, label: "Test\n(Taguchi run)" },
            { x: 310, label: "Update\n(Bayesian posterior)" },
            { x: 560, label: "Decide\n(Stop / shift / continue)" },
            { x: 820, label: "Next Test\n(Most informative)" },
          ].map((n, i) => (
            <g key={i}>
              <rect
                x={n.x - 85}
                y={40}
                width={170}
                height={80}
                rx={18}
                ry={18}
                fill="white"
                stroke="#e5e7eb"
                strokeWidth="2"
              />
              <text
                x={n.x}
                y={70}
                textAnchor="middle"
                fontSize="14"
                fill="#111827"
                fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
              >
                {n.label.split("\n").map((line, idx) => (
                  <tspan key={idx} x={n.x} dy={idx === 0 ? 0 : 18}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          ))}

          {/* arrows */}
          {[
            { x1: 155, x2: 225 },
            { x1: 395, x2: 475 },
            { x1: 645, x2: 735 },
          ].map((a, i) => (
            <g key={i}>
              <line
                x1={a.x1}
                y1={80}
                x2={a.x2}
                y2={80}
                stroke="#9ca3af"
                strokeWidth="2.5"
              />
              <polygon
                points={`${a.x2},80 ${a.x2 - 10},75 ${a.x2 - 10},85`}
                fill="#9ca3af"
              />
            </g>
          ))}

          {/* wrap-around arrow */}
          <path
            d="M 820 125 C 820 155, 70 155, 70 125"
            fill="none"
            stroke="#d1d5db"
            strokeWidth="2"
            strokeDasharray="6 6"
          />
          <polygon points="70,125 80,120 80,130" fill="#d1d5db" />
        </svg>
      </div>
    </div>
  );
}

function Callout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="my-6 rounded-2xl border bg-white p-6 shadow-sm">
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="mt-2 text-gray-700">{children}</div>
    </div>
  );
}

// IMPORTANT:
// - Default export name can be anything, but it must be the component you import in /resources/[slug]/page.tsx
// - This file path must match the import exactly: "@/app/resources/taguchi-monticarlo-article"
export default function TaguchiBayesianArticle() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold mb-4">
        Taguchi + Bayesian Test Planning: From Static DoE to Adaptive Reliability Learning
      </h1>

      <p className="text-lg text-gray-700 mb-6">
        In traditional reliability validation, we often rely on static Design of Experiments (DoE) to explore
        design factors materials, geometry, cooling methods, or operating conditions and see how they affect
        failure modes such as insulation aging or bearing wear.
      </p>

      <p className="text-lg text-gray-700 mb-6">
        But as products become more complex and test budgets shrink, the question isn’t “how do I test everything?”
        it’s “how do I learn the most from the fewest tests?” That’s where the fusion of <strong>Taguchi methods</strong> and <strong>Bayesian modeling</strong> comes in.
      </p>

      <div className="rounded-2xl border bg-gray-50 p-6">
        <p className="text-gray-800">
          <strong>Taguchi</strong> gives robust design and efficient screening. <strong>Bayesian inference</strong> gives adaptive
          learning and prediction. Together, they can turn reliability testing into a <strong>data driven decision engine</strong>.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link
            href="/tools/Arrhenius"
            className="rounded-xl border bg-white p-4 text-sm hover:bg-gray-50"
          >
            <div className="font-semibold">Arrhenius Calculator</div>
            <div className="mt-1 text-gray-600">Thermal acceleration</div>
          </Link>
          <Link
            href="/tools/BurnInWizard"
            className="rounded-xl border bg-white p-4 text-sm hover:bg-gray-50"
          >
            <div className="font-semibold">Burn-In Wizard</div>
            <div className="mt-1 text-gray-600">Early-life screening</div>
          </Link>
          <Link
            href="/tools"
            className="rounded-xl border bg-white p-4 text-sm hover:bg-gray-50"
          >
            <div className="font-semibold">All Tools</div>
            <div className="mt-1 text-gray-600">Explore calculators</div>
          </Link>
        </div>
      </div>

      <LoopDiagram />

      <h2 className="text-2xl font-semibold mt-10 mb-4">The problem with traditional test planning</h2>
      <p className="text-gray-700 mb-4">Most validation plans today still follow fixed sequences:</p>
      <ul className="list-disc list-inside text-gray-700">
        <li>9–16 Taguchi runs per factor combination</li>
        <li>Static durations and sample sizes</li>
        <li>Pass/fail logic without quantified uncertainty</li>
      </ul>
      <p className="text-gray-700 mt-4">
        This approach works, but it’s wasteful. It doesn’t tell you how confident you should be in your results,
        nor does it adapt when early tests already show a clear trend.
      </p>
      <Callout title="The key question">
        <p className="m-0">
          What if instead of running 50 samples, you could stop after 20, knowing with 90% confidence your design
          meets the reliability target?
        </p>
      </Callout>

      <h2 className="text-2xl font-semibold mt-10 mb-4">Taguchi: the foundation of robust design (induction motor example)</h2>
      <p className="text-gray-700 mb-4">
        Taguchi methods simplify experimentation by arranging factors and levels into orthogonal arrays, allowing engineers
        to explore multiple variables with minimal tests.
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-3">Example: induction motor design choices</h3>
      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left p-3 font-semibold">Factor</th>
              <th className="text-left p-3 font-semibold">Levels</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            <tr className="border-t">
              <td className="p-3">A: Insulation class</td>
              <td className="p-3">B (130°C), F (155°C), H (180°C)</td>
            </tr>
            <tr className="border-t">
              <td className="p-3">B: Bearing strategy</td>
              <td className="p-3">Standard, High-temp grease, Sealed-for-life</td>
            </tr>
            <tr className="border-t">
              <td className="p-3">C: Cooling method</td>
              <td className="p-3">TEFC, TENV, TEWC (water jacket)</td>
            </tr>
            <tr className="border-t">
              <td className="p-3">D: Drive type</td>
              <td className="p-3">Line-start, VFD (no filter), VFD + dV/dt filter</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-gray-700 mt-4">
        Evaluating all combinations would require <strong>81 tests</strong>. Using a Taguchi <strong>L9</strong> array, we can screen
        the design space with just <strong>9 experimental conditions</strong>.
      </p>

      <h3 className="text-xl font-semibold mt-8 mb-3">Signal-to-noise ratio (S/N)</h3>
      <p className="text-gray-700 mb-3">
        The output metric is typically a Signal-to-Noise ratio, where “noise” represents variations in ambient temperature and load.
      </p>
      <BlockMath
  math={
    "\\mathrm{S/N} = -10\\log_{10}\\left(\\frac{1}{n}\\sum_{i=1}^{n} y_i^2\\right)"
  }
/>

      <p className="text-gray-700">
        Here, <InlineMath math={"y"} /> might be winding temperature rise or vibration amplitude. The configuration with the highest S/N is the
        most robust — meaning it performs consistently even when conditions vary.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4">Where Taguchi falls short</h2>
      <p className="text-gray-700 mb-4">Taguchi alone often assumes:</p>
      <ul className="list-disc list-inside text-gray-700">
        <li>All test outcomes are equally weighted</li>
        <li>Factor interactions are limited</li>
        <li>Noise factors are static</li>
        <li>Confidence is qualitative, not probabilistic</li>
      </ul>
      <p className="text-gray-700 mt-4">
        In real systems like motors, degradation is uncertain and multi-physics-driven. We need a way to update knowledge continuously
        as data accumulates — that’s where Bayesian modeling transforms the process.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4">Enter Bayesian reliability modeling</h2>
      <p className="text-gray-700 mb-4">
        Bayesian modeling allows us to combine prior knowledge (legacy motor data, standards, expert judgment) with new experimental results
        to continuously refine reliability predictions. The foundation is Bayes’ rule:
      </p>
      <BlockMath
  math={
    "p(\\theta \\mid D) \\propto p(D \\mid \\theta)\\,p(\\theta)"
  }
/>
      <ul className="list-disc list-inside text-gray-700 mt-3">
        <li><InlineMath math={"p(\\theta)"} />: prior belief about life model parameters (e.g., insulation activation energy)</li>
        <li><InlineMath math={"p(D\\mid\\theta)"} />: likelihood from test data</li>
        <li><InlineMath math={"p(\\theta\\mid D)"} />: posterior belief after testing</li>
      </ul>

      <Callout title="What the posterior enables">
        <ul className="list-disc list-inside m-0">
          <li>Predict lifetime distributions under real operating conditions</li>
          <li>Quantify confidence in meeting reliability targets</li>
          <li>Decide whether additional tests are worth running</li>
        </ul>
      </Callout>

      <h2 className="text-2xl font-semibold mt-10 mb-4">Combining Taguchi and Bayesian: the hybrid approach</h2>
      <ol className="list-decimal list-inside text-gray-700">
        <li>
          <strong>Phase A — Robust Screening (Taguchi):</strong> Use inner (control) and outer (noise) arrays to identify robust
          motor configurations under ambient and load variation.
        </li>
        <li>
          <strong>Phase B — Bayesian Confirmation:</strong> Fit Bayesian degradation and life models linking stressors (temperature, vibration)
          to failure mechanisms such as insulation aging or bearing wear.
        </li>
        <li>
          <strong>Phase C — Adaptive Decision:</strong> Use Bayesian inference to decide when to stop testing.
        </li>
      </ol>

      <BlockMath
  math={
    "\\Pr\\left(R(t_{\\text{mission}}) \\ge R^*\\right) \\ge 0.90"
  }
/>
      <p className="text-gray-700">
        If confidence is high, testing stops early. If not, the model identifies which next test adds the most information.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-4">Real-world case study: induction motor validation</h2>

      <h3 className="text-xl font-semibold mt-6 mb-2">Scenario</h3>
      <ul className="list-disc list-inside text-gray-700">
        <li>A plant selects a 7.5 kW (10 HP) induction motor for a continuous-duty conveyor.</li>
        <li>
          Mission / target: 5 years (~43,800 h) with reliability target <InlineMath math={"R^* = 0.95"} />.
        </li>
        <li>Key stressors: ambient heat, load variation, vibration/misalignment, VFD power quality.</li>
        <li>
          Dominant PoF: stator insulation aging (thermal oxidation) and bearing wear / lubrication breakdown (vibration + temperature).
        </li>
      </ul>

      <h3 className="text-xl font-semibold mt-8 mb-3">Step 1 — Taguchi screening (smart testing)</h3>
      <p className="text-gray-700 mb-4">
        Using a Taguchi L9 design (9 configurations × 3 replicates), the team evaluates motor options under ambient (25°C vs 45°C) and load
        (60% vs 100%) noise.
      </p>

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left p-3 font-semibold">Design</th>
              <th className="text-left p-3 font-semibold">ΔT mean (°C)</th>
              <th className="text-left p-3 font-semibold">S/N (dB)</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            <tr className="border-t">
              <td className="p-3">Class B, TEFC, Line-start</td>
              <td className="p-3">82</td>
              <td className="p-3">−38.3</td>
            </tr>
            <tr className="border-t">
              <td className="p-3">Class F, TEFC, VFD</td>
              <td className="p-3">58</td>
              <td className="p-3">−35.3</td>
            </tr>
            <tr className="border-t">
              <td className="p-3">Class H, TEWC, VFD + filter</td>
              <td className="p-3">34</td>
              <td className="p-3">−30.6</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout title="Screening result">
        <p className="m-0">
          Class H + TEWC + VFD filter is the most robust configuration in this screening set.
        </p>
      </Callout>

      <h3 className="text-xl font-semibold mt-8 mb-3">Step 2 — Bayesian confirmation (learning as you go)</h3>
      <p className="text-gray-700 mb-3">
        For insulation aging, the team applies an Arrhenius thermal acceleration model:
      </p>
      <BlockMath
  math={
    "AF_T = \\exp\\left(\\frac{E_a}{k}\\left(\\frac{1}{T_u} - \\frac{1}{T_s}\\right)\\right)"
  }
/>

      <p className="text-gray-700 mb-4">
        Priors: <InlineMath math={"E_a = 0.70\,\\text{eV}"} /> (activation energy), Weibull shape <InlineMath math={"\\beta = 2.0"} />.
        Accelerated test: 180°C endurance; first failures at 820, 910, 1040 h. Bayesian updating converts these failures into a posterior life
        distribution at use temperature.
      </p>

      <h3 className="text-xl font-semibold mt-8 mb-3">Step 3 — Adaptive planning (in-situ Bayesian updating)</h3>
      <p className="text-gray-700 mb-4">
        After three failures, the Bayesian model highlights where uncertainty remains highest:
      </p>

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left p-3 font-semibold">Planned test</th>
              <th className="text-left p-3 font-semibold">Risk</th>
              <th className="text-left p-3 font-semibold">Posterior confidence</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            <tr className="border-t">
              <td className="p-3">Power quality (VFD harmonics)</td>
              <td className="p-3">Low</td>
              <td className="p-3">0.92</td>
            </tr>
            <tr className="border-t">
              <td className="p-3">Hot ambient margin</td>
              <td className="p-3">Medium</td>
              <td className="p-3">0.88</td>
            </tr>
            <tr className="border-t">
              <td className="p-3">High vibration / misalignment</td>
              <td className="p-3">High</td>
              <td className="p-3">0.59</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout title="Decision">
        <p className="m-0">
          The team skips extended power-quality testing and focuses on vibration testing, where uncertainty is highest.
        </p>
      </Callout>

      <h3 className="text-xl font-semibold mt-8 mb-3">Worked calculations (samples)</h3>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="font-semibold text-gray-900 mb-2">(A) Taguchi S/N for winding ΔT</p>
        <p className="text-gray-700 mb-3">Replicates: 33, 34, 35 °C</p>
        <BlockMath
  math={
    "\\mathrm{S/N} = -10\\log_{10}\\left(\\frac{33^2 + 34^2 + 35^2}{3}\\right) = -30.6\\,\\text{dB}"
  }
/>
        <div className="h-px bg-gray-100 my-6" />

        <p className="font-semibold text-gray-900 mb-2">(B) Arrhenius acceleration</p>
        <p className="text-gray-700 mb-3">
          <InlineMath math={"T_u = 140^{\\circ}C"} />, <InlineMath math={"T_s = 180^{\\circ}C"} />, <InlineMath math={"E_a = 0.70\,\text{eV}"} />
        </p>
        <BlockMath math={"AF_T \\approx 5.86 \\Rightarrow 900\,h \\approx 0.60\,\\text{yr}"} />

        <div className="h-px bg-gray-100 my-6" />

        <p className="font-semibold text-gray-900 mb-2">(C) Vibration influence power law (illustrative)</p>
        <BlockMath math={"AF_V = (v_s / v_u)^3 = (4/2)^3 = 8"} />
      </div>

      <h3 className="text-xl font-semibold mt-10 mb-3">Step 4 — Lessons learned</h3>
      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left p-3 font-semibold">Insight</th>
              <th className="text-left p-3 font-semibold">Impact</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            <tr className="border-t">
              <td className="p-3">Taguchi reduced the design space early</td>
              <td className="p-3">Faster convergence</td>
            </tr>
            <tr className="border-t">
              <td className="p-3">Bayesian models quantified uncertainty</td>
              <td className="p-3">Objective decisions</td>
            </tr>
            <tr className="border-t">
              <td className="p-3">In-situ updates redirected testing</td>
              <td className="p-3">Fewer wasted tests</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-semibold mt-10 mb-4">Why it matters</h2>
      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left p-3 font-semibold">Benefit</th>
              <th className="text-left p-3 font-semibold">Impact</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            <tr className="border-t">
              <td className="p-3">Fewer tests</td>
              <td className="p-3">Stop when confidence is reached</td>
            </tr>
            <tr className="border-t">
              <td className="p-3">Smarter sequencing</td>
              <td className="p-3">Focus on high-uncertainty risks</td>
            </tr>
            <tr className="border-t">
              <td className="p-3">Quantified confidence</td>
              <td className="p-3">Explicit probability of success</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout title="Explained simply">
        <p className="m-0">
          Taguchi helps you test smart. Bayesian modeling helps you learn smart. Together, reliability testing adapts as data comes in —
          saving time, cost, and risk.
        </p>
      </Callout>

      <h2 className="text-2xl font-semibold mt-10 mb-4">Reliatools links</h2>
      <p className="text-gray-700">
        Use the{" "}
        <Link href="/tools/Arrhenius" className="text-blue-600 hover:underline">
          Arrhenius Calculator
        </Link>{" "}
        to translate accelerated thermal tests to field life. For early failure screening and equivalent life planning, try the{" "}
        <Link href="/tools/BurnInWizard" className="text-blue-600 hover:underline">
          Burn-In Wizard
        </Link>
        .
      </p>

      {/* Optional image. Remove this block if you haven't added the file to /public/blog/ */}
      <div className="my-6">
        <Image
          src="/taguchi-bayesian-loop.png"
          alt="Taguchi + Bayesian test planning loop"
          width={900}
          height={450}
          className="rounded-2xl border"
        />
       
      </div>

      <h2 className="text-2xl font-semibold mt-10 mb-4">Conclusion</h2>
      <p className="text-gray-700">
        The Taguchi–Bayesian hybrid shifts reliability engineering from static validation to adaptive learning. This approach is especially
        powerful for complex systems like induction motors, where multiple physics interact and uncertainty matters.
      </p>

      <p className="text-center mt-8">
        Explore more tools on{" "}
        <Link href="/tools" className="text-blue-600 hover:underline">
          Reliatools
        </Link>
        .
      </p>
    </main>
  );
}


// ============================================================
// FILE: app/resources/[slug]/page.tsx
// Update your slug router to include the new article.
// ============================================================

/*
import TaguchiBayesianArticle from "@/app/resources/taguchi-bayesian-article";

...

// Route to your React articles
if (safeSlug === "arrhenius-article") return <ArrheniusArticle />;
if (safeSlug === "thermal-shock-article") return <ThermalShockArticle />;
if (safeSlug === "halt") return <HALTArticle />;
if (safeSlug === "softwarebrp-article") return <SoftwareBRPArticle />;

// NEW
if (safeSlug === "taguchi-bayesian") return <TaguchiBayesianArticle />;

*/
