"use client";

import Link from "next/link";
import Image from "next/image";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

export default function SoftwareBRPArticle() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold mb-4">Understanding the Bayesian Reliability Predictor for Software Systems</h1>

      <p className="text-lg text-gray-700 mb-6">
        Software reliability is one of the most challenging aspects of modern engineering. Unlike hardware, software does not degrade physically — its reliability depends on the presence of latent defects, development practices, and testing rigor. The <strong>Bayesian Reliability Predictor</strong> in Reliatools helps engineers quantify this uncertainty using a probabilistic approach, even before large-scale testing or field data is available.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Why Bayesian?</h2>
      <p>
        Bayesian methods combine <strong>prior knowledge</strong> (historical data or expert judgment) with <strong>new evidence</strong> (testing metrics, code analysis, process maturity) to update the estimated probability of achieving target reliability. This approach is ideal for early-stage design evaluations and continuous reliability tracking throughout the development lifecycle.
      </p>

      <BlockMath
  math={`P(\\text{High Reliability} \\mid \\text{Evidence}) =
  \\frac{P(\\text{Evidence} \\mid \\text{High Reliability})\\,P(\\text{High Reliability})}
       {P(\\text{Evidence})}`}
/>


      <p className="mt-4 text-gray-700">
        In odds form, this can be expressed as:
      </p>
      <BlockMath math={`Posterior\ Odds = Prior\ Odds \times \prod_{i=1}^{k} LR_i`} />

      <p className="mt-2">
        Each factor—such as code complexity, testing coverage, or process maturity—contributes a likelihood ratio (LR) that either strengthens or weakens confidence in the software’s reliability.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Inputs and Parameters</h2>
      <ul className="list-disc list-inside mb-6">
        <li><strong>Target Reliability (R):</strong> Desired probability of fault-free operation (e.g., 0.999).</li>
        <li><strong>Prior Reliability:</strong> Initial belief based on historical performance or expert judgment.</li>
        <li><strong>Test Coverage (%):</strong> Proportion of code verified by unit/integration tests.</li>
        <li><strong>Peer Review Coverage (%):</strong> Portion of code reviewed by peers for defects.</li>
        <li><strong>Code Complexity:</strong> Low, Moderate, or High — influences potential defect rate.</li>
        <li><strong>Size (KLOC):</strong> Total source code size in thousands of lines.</li>
        <li><strong>Defect Density Prior:</strong> Expected defect rate before testing (defects/KLOC).</li>
        <li><strong>Team Experience:</strong> Low, Medium, or High — affects error prevention and debugging efficiency.</li>
        <li><strong>Process Maturity:</strong> Rated 1–5 (CMMI-like scale) representing organizational quality control.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Outputs and Interpretation</h2>
      <ul className="list-disc list-inside mb-6">
        <li><strong>Posterior Reliability Probability:</strong> Updated confidence of meeting target reliability.</li>
        <li><strong>Estimated Residual Defects:</strong> Approximation of remaining defects before release.</li>
        <li><strong>Sensitivity Chart:</strong> Highlights which parameters most affect reliability outcomes.</li>
        <li><strong>What-If Simulator:</strong> Lets engineers vary a single factor and instantly see how reliability changes.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Graph: Reliability Probability vs. Test Coverage</h2>
      <p>
        The chart below shows how reliability probability increases with higher test coverage, assuming moderate complexity and stable process maturity. This relationship emphasizes that improving test coverage from 60% to 90% can dramatically increase confidence in software reliability.
      </p>

      <div className="my-6">
        <Image
          src="/bayesian_reliability_graph.png"
          alt="Reliability probability curve showing improvement with increased test coverage"
          width={800}
          height={400}
          className="rounded border"
        />
      </div>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Example Scenario</h2>
      <p>
        Consider an embedded firmware project (120 KLOC) targeting reliability of 0.999. With 85% test coverage, 80% peer review, and moderate complexity, the Bayesian Predictor yields a <strong>posterior reliability of 0.89</strong> — meaning there’s an 89% probability the software meets its target. Increasing coverage to 95% or improving process maturity to Level 5 could raise this probability above 93%.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">How to Use the Tool</h2>
      <ol className="list-decimal list-inside mb-6 space-y-2">
        <li>Go to <Link href="/tools/SoftwareBRP" className="text-blue-600 hover:underline">Bayesian Reliability Predictor</Link> under <strong>Software Reliability Tools</strong>.</li>
        <li>Select a preset such as “Web API”, “Embedded”, or “Enterprise App.”</li>
        <li>Adjust sliders for <em>test coverage</em>, <em>code size</em>, and <em>process maturity</em> to match your project.</li>
        <li>Observe the <strong>Posterior Reliability</strong> and <strong>Residual Defects</strong> estimates update instantly.</li>
        <li>Use the <strong>Tornado Chart</strong> to identify which factors have the greatest impact.</li>
        <li>Run “What-if” simulations to explore how incremental improvements affect results.</li>
      </ol>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Engineering Insights</h2>
      <p>
        This probabilistic method allows engineers to quantify uncertainty and focus on the factors that matter most. Improving test coverage or review rigor often yields the highest reliability gains. The Bayesian approach also supports iterative updates — as more test data becomes available, prior estimates evolve toward the true reliability value.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Limitations and Best Practices</h2>
      <ul className="list-disc list-inside mb-6">
        <li>Assumes independence between input factors (Naïve Bayes simplification).</li>
        <li>Likelihood mappings are calibrated for general software systems — domain-specific tuning is recommended.</li>
        <li>Use this tool for early prediction and prioritization, not as a replacement for formal reliability testing.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Conclusion</h2>
      <p>
        The <strong>Bayesian Reliability Predictor</strong> empowers software teams to measure and improve reliability before defects reach the field. By blending engineering metrics, human judgment, and probability theory, it bridges the gap between design-time estimation and field performance.
      </p>

      <p className="text-center mt-6">
        Try the tool now: <Link href="/tools/SoftwareBRP" className="text-blue-600 hover:underline">Bayesian Reliability Predictor</Link>
      </p>
    </main>
  );
}
