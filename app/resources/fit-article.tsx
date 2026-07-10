"use client";

import Link from "next/link";
import { BlockMath, InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import ContactCTA from "@/components/ContactCTA";

export default function FitArticle() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold mb-4">
        What Does 1 FIT Really Mean? Automotive Reliability, PMHF, and the Test-Evidence Problem
      </h1>
      <p className="text-lg text-gray-700 mb-6">
        In automotive electronics, functional safety, and autonomous-driving discussions, the term{" "}
        <strong>FIT</strong> appears constantly. FIT stands for <strong>Failures In Time</strong>, and the basic
        definition is one failure per one billion operating hours. It is a convenient way to express very small random
        hardware failure rates &mdash; but a FIT value by itself does not describe the risk.
      </p>

      <div className="my-6 rounded-lg bg-gray-50 border p-4">
        <BlockMath math={"1\\ \\text{FIT} = 1\\ \\text{failure per } 10^{9}\\ \\text{operating hours} = 10^{-9}\\ \\text{failures/hour}"} />
      </div>

      <p>
        A supplier may state, <em>&ldquo;this component has a failure rate of 1 FIT.&rdquo;</em> That sounds extremely
        reliable. The more useful questions are: over how many operating hours, across how many vehicles, under what
        conditions, is the failure safety-relevant, can the system detect it, and what evidence supports the estimate?
      </p>

      <p className="mt-4 rounded-md bg-blue-50 border-l-4 border-blue-500 p-4 text-gray-800">
        <strong>Core takeaway:</strong> A FIT number is not the conclusion. It is one input to a larger reliability and
        functional-safety argument.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">The equations behind FIT</h2>
      <p>For a constant failure-rate model, the failure rate per hour is:</p>
      <BlockMath math={"\\lambda = \\text{FIT} \\times 10^{-9}"} />
      <p>Reliability, cumulative failure probability, and mean time to failure follow directly:</p>
      <BlockMath math={"R(t) = e^{-\\lambda t} \\qquad F(t) = 1 - e^{-\\lambda t} \\qquad MTTF = \\frac{1}{\\lambda}"} />
      <p>These relationships assume a constant failure rate, independent failures, equivalent exposure across the
        population, operation within the useful-life region, and no dominant wear-out mechanism during the evaluated
        mission. A single FIT value is not universally valid for every failure mechanism or every stage of life.</p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">What does 1 FIT mean over an automotive mission?</h2>
      <p>Assume a failure rate of 1 FIT and an operating time of 8,000 hours. The mission failure probability is:</p>
      <BlockMath math={"F(t) = 1 - e^{-(1 \\times 10^{-9})(8000)} \\approx 7.99997 \\times 10^{-6} \\approx 8\\ \\text{ppm}"} />
      <p>
        So <strong>1 FIT over 8,000 operating hours corresponds to roughly 8 failures per million units</strong> over
        the mission. The corresponding reliability is <InlineMath math={"R(t) \\approx 99.9992\\%"} /> &mdash; extremely
        high, but not zero risk.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">FIT becomes more meaningful with fleet size</h2>
      <p>Across a fleet of size <InlineMath math={"N"} />, the expected number of failures is:</p>
      <BlockMath math={"E[N_f] = N \\times F(t)"} />
      <p>For 100,000 vehicles that is about <strong>0.8 failures</strong> over the mission; for one million vehicles it
        is about <strong>8 failures</strong>. The expected value is a statistical average, not a guarantee of exactly
        that count &mdash; but it shows why a rate that looks negligible per component becomes important once millions of
        sensors, processors, and power devices are in service.</p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">MTTF is not the same as service life</h2>
      <p>For 1 FIT, <InlineMath math={"MTTF = 1 / (1 \\times 10^{-9}) = 10^{9}"} /> hours &mdash; more than 100,000
        years. This does <strong>not</strong> mean an individual component survives that long. MTTF is a statistical
        parameter of the constant-rate model, not the design life, wear-out life, warranty, or useful service life. An
        electronic module can have a very low random failure rate while still having a practical service life of 10 to
        20 years due to corrosion, fatigue, material degradation, or thermal cycling.</p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Why zero failures do not prove zero risk</h2>
      <p>A common misunderstanding is that a zero-failure test proves an extremely low failure rate. Zero failures are
        encouraging, but they only provide an upper statistical confidence bound. For zero observed failures under a
        constant-rate model:</p>
      <BlockMath math={"\\lambda_U = \\frac{-\\ln(1 - CL)}{T} \\qquad FIT_U = \\lambda_U \\times 10^{9}"} />
      <p>At 90% confidence, <InlineMath math={"-\\ln(1 - 0.90) = 2.3026"} />. Assume 100 test units for 1,000 hours each
        with no acceleration and zero failures, so <InlineMath math={"T = 100{,}000"} /> device-hours:</p>
      <BlockMath math={"\\lambda_U = \\frac{2.3026}{100{,}000} = 2.3026 \\times 10^{-5} \\Rightarrow FIT_U \\approx 23{,}026\\ \\text{FIT}"} />
      <p>
        This test does <strong>not</strong> demonstrate 1 FIT. It demonstrates an upper bound of roughly{" "}
        <strong>23,000 FIT at 90% confidence</strong>. That does not mean the true rate is 23,000 FIT &mdash; it means
        the test exposure alone is insufficient to support a much lower numerical claim.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">How much testing would demonstrate 1 FIT?</h2>
      <p>The required equivalent exposure for a zero-failure test is:</p>
      <BlockMath math={"T_{required} = \\frac{-\\ln(1 - CL)}{FIT_{target} \\times 10^{-9}} = \\frac{2.3026}{1 \\times 10^{-9}} = 2.3026 \\times 10^{9}\\ \\text{device-hours}"} />
      <p>That is about <strong>2.3 billion equivalent device-hours</strong>. At 1,000 hours per unit without
        acceleration, that is roughly <strong>2.3 million units</strong> &mdash; clearly impractical for most validation
        programs. Modern automotive robustness-validation approaches therefore do not rely on ever-larger test-to-pass
        sample sizes alone. They combine mission profiles, failure-mechanism knowledge, reliability physics, justified
        acceleration, prior product knowledge, supplier data, field evidence, and robust design.</p>
      <p className="mt-4 text-sm text-gray-600">Acceleration cannot be added as a convenient multiplier. The relationship
        between test stress, use conditions, and the failure mechanism must be valid; extrapolation becomes unreliable
        when the accelerated condition triggers a different failure mechanism.</p>

      <p className="text-center mt-6">
        Want to run these numbers on your own claim? Try the{" "}
        <Link href="/tools/FIT" className="text-blue-600 hover:underline">FIT Calculator</Link>{" "}
        to convert a FIT value into mission ppm, fleet failures, and required test evidence.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Where does a FIT value come from?</h2>
      <p>A FIT number may come from supplier FMEDA or safety documentation, semiconductor reliability reports,
        accelerated life testing, technology qualification data, field-return data, reliability prediction standards,
        physics-of-failure modeling, similar-product history, or engineering judgment. These sources do not carry equal
        confidence. The useful question is not only <em>&ldquo;what is the FIT value?&rdquo;</em> but{" "}
        <em>&ldquo;how was it established, and is that evidence applicable to this design and mission?&rdquo;</em></p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">FIT versus PMHF</h2>
      <p>FIT and PMHF are related but not the same. FIT is a hardware failure-rate unit. PMHF is the{" "}
        <strong>Probabilistic Metric for random Hardware Failures</strong>, which evaluates the contribution of random
        hardware failures to violation of a specific safety goal. A component has a base failure rate, but not every
        failure violates the safety goal &mdash; some have no effect, some result in a safe state, some are detected and
        controlled, and some are masked by redundancy. PMHF is a safety-goal-level evaluation, not simply the sum of
        every component&rsquo;s published FIT.</p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Automotive functional safety and ASIL A&ndash;D</h2>
      <p>ISO 26262 uses <strong>Automotive Safety Integrity Levels</strong> (ASILs) to classify the risk of a hazardous
        event caused by malfunctioning behavior of an E/E system. The ASIL is assigned to a <strong>safety goal</strong>,
        not automatically to a component, and is determined through Hazard Analysis and Risk Assessment based on
        Severity, Exposure, and Controllability. ASIL A is the lowest integrity level and ASIL D the highest; items that
        do not require an ASIL are handled under quality management (QM).</p>

      <div className="my-6 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left p-3 font-semibold">Classification</th>
              <th className="text-left p-3 font-semibold">General interpretation</th>
              <th className="text-left p-3 font-semibold">Relative rigor</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="p-3 font-semibold">QM</td>
              <td className="p-3">No ASIL assigned</td>
              <td className="p-3">Standard quality-management processes</td>
            </tr>
            <tr>
              <td className="p-3 font-semibold">ASIL A</td>
              <td className="p-3">Lower safety-related risk</td>
              <td className="p-3">Lowest ASIL rigor</td>
            </tr>
            <tr>
              <td className="p-3 font-semibold">ASIL B</td>
              <td className="p-3">Moderate safety-related risk</td>
              <td className="p-3">Increased safety requirements</td>
            </tr>
            <tr>
              <td className="p-3 font-semibold">ASIL C</td>
              <td className="p-3">High safety-related risk</td>
              <td className="p-3">More stringent safety requirements</td>
            </tr>
            <tr>
              <td className="p-3 font-semibold">ASIL D</td>
              <td className="p-3">Highest safety-related risk</td>
              <td className="p-3">Most stringent safety requirements</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>ASIL D does not mean every component must have an extremely low FIT rate. It means the overall design, process,
        architecture, diagnostics, and supporting evidence must satisfy the requirements of the highest integrity
        level.</p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">ASIL hardware metrics and PMHF targets</h2>
      <p>For random hardware failures, ISO 26262 uses several quantitative metrics, including the Single-Point Fault
        Metric (SPFM), the Latent Fault Metric (LFM), and PMHF. A commonly published summary of the ISO 26262-5 hardware
        targets is:</p>

      <div className="my-6 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left p-3 font-semibold">ASIL</th>
              <th className="text-left p-3 font-semibold">SPFM target</th>
              <th className="text-left p-3 font-semibold">LFM target</th>
              <th className="text-left p-3 font-semibold">PMHF target</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="p-3 font-semibold">ASIL A</td>
              <td className="p-3">&mdash; (not specified)</td>
              <td className="p-3">&mdash; (not specified)</td>
              <td className="p-3">&mdash; (not specified)</td>
            </tr>
            <tr>
              <td className="p-3 font-semibold">ASIL B</td>
              <td className="p-3">&ge; 90%</td>
              <td className="p-3">&ge; 60%</td>
              <td className="p-3">&le; 100 FIT</td>
            </tr>
            <tr>
              <td className="p-3 font-semibold">ASIL C</td>
              <td className="p-3">&ge; 97%</td>
              <td className="p-3">&ge; 80%</td>
              <td className="p-3">&le; 100 FIT</td>
            </tr>
            <tr>
              <td className="p-3 font-semibold">ASIL D</td>
              <td className="p-3">&ge; 99%</td>
              <td className="p-3">&ge; 90%</td>
              <td className="p-3">&le; 10 FIT</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>These values are commonly presented in semiconductor functional-safety guidance summarizing ISO 26262-5. The
        commonly referenced hardware-metric table provides explicit numerical targets for ASIL B, C, and D but not for
        ASIL A. For that reason, an educational calculator should not automatically assign ASIL A a fixed PMHF limit; a
        better approach is to let the user enter a <strong>project-specific or customer-defined Safety FIT
        budget</strong>.</p>

      <p className="mt-4 rounded-md bg-amber-50 border-l-4 border-amber-500 p-4 text-gray-800">
        <strong>Important distinction:</strong> a component does not become &ldquo;ASIL D&rdquo; simply because its base
        FIT is below 10 FIT. Component FIT is not PMHF &mdash; it is only one input. PMHF evaluates the rate at which
        random faults could violate a specific safety goal after considering failure-mode distribution, safe versus
        dangerous failures, single-point and residual faults, detected and latent multiple-point faults, diagnostic
        coverage, fault-handling time, safety mechanisms, redundancy, architecture, and dependent failures.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Base FIT, safety-relevant fraction, and diagnostic coverage</h2>
      <p><strong>Base FIT</strong> is the estimated random hardware failure rate of a component or block before
        considering system-level safety mechanisms. The <strong>safety-relevant failure fraction</strong> is the portion
        of that base rate associated with failure modes that could contribute to violating the specific safety goal. A
        sensor may fail stuck-high, stuck-low, drifting, no-output, intermittent, or plausible-but-wrong &mdash; some
        modes are immediately detected, some lead directly to a safe state, and some have no safety impact in a given
        architecture.</p>
      <p className="mt-4"><strong>Diagnostic coverage</strong> is the proportion of relevant dangerous failures that a
        safety mechanism can detect and control within the required fault-handling time. Detection alone is not always
        enough &mdash; the diagnostic must act early enough for the system to control the hazard or reach a safe state.
        Coverage should be supported by analysis and validation, not chosen as an optimistic percentage.</p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">A simplified residual dangerous FIT estimate</h2>
      <p>For educational screening, a simplified contribution can be written as:</p>
      <BlockMath math={"\\text{Residual Dangerous FIT} = \\text{Base FIT} \\times \\text{Safety-Relevant Fraction} \\times (1 - \\text{Diagnostic Coverage})"} />
      <p>With a base rate of 100 FIT, a safety-relevant fraction of 40%, and diagnostic coverage of 90%:</p>
      <BlockMath math={"\\text{Residual Dangerous FIT} = 100 \\times 0.40 \\times (1 - 0.90) = 4\\ \\text{FIT}"} />
      <p>The component starts at 100 FIT but its simplified residual dangerous contribution is about 4 FIT. This is
        useful for preliminary allocation and sensitivity analysis &mdash; it is <strong>not</strong> a complete formal
        PMHF calculation, which must also consider single-point, residual, detected and latent multiple-point faults,
        exposure duration, fault-tolerant time interval, safety-mechanism effectiveness, common-cause and dependent
        failures, and safety-goal-specific classification. Treat the simplified equation as an educational screening
        model, not an ISO 26262 compliance result.</p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">FIT does not cover all autonomous-driving risk</h2>
      <p>FIT and PMHF address random hardware failures. They do not cover every source of risk in an autonomous or
        driver-assistance system. A system can operate with no hardware fault and still behave unsafely because of
        sensor-performance limits, difficult weather or lighting, incomplete environmental understanding, object
        misclassification, algorithm limitations, unexpected road configurations, foreseeable misuse, HMI problems,
        cybersecurity events, software defects, or incomplete requirements. Software defects and systematic faults are
        not random hardware failures and should not be assigned a conventional hardware FIT rate &mdash; they require
        process-based prevention, verification, validation, and safety analysis.</p>
      <p className="mt-4 rounded-md bg-blue-50 border-l-4 border-blue-500 p-4 text-gray-800">
        <strong>A low hardware FIT rate does not, by itself, prove that an autonomous-driving function is safe.</strong>{" "}
        FIT addresses only one part of the overall safety argument.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">When is a constant FIT assumption inappropriate?</h2>
      <p>A constant FIT model is associated with the useful-life region of the bathtub curve. Many physical mechanisms
        &mdash; solder fatigue, contact fretting, corrosion, seal degradation, electromigration, dielectric breakdown,
        creep, mechanical fatigue, thermal cycling, material aging &mdash; are time-dependent, and their failure rate
        increases with time. A Weibull model is often more appropriate:</p>
      <BlockMath math={"R(t) = e^{-(t/\\eta)^{\\beta}} \\qquad \\lambda(t) = \\frac{\\beta}{\\eta}\\left(\\frac{t}{\\eta}\\right)^{\\beta - 1} \\qquad FIT(t) = \\lambda(t) \\times 10^{9}"} />
      <p>When <InlineMath math={"\\beta = 1"} /> the Weibull model reduces to a constant failure rate. When{" "}
        <InlineMath math={"\\beta > 1"} /> the failure rate increases with time, indicating wear-out. For time-dependent
        life data, the{" "}
        <Link href="/tools/Weibull" className="text-blue-600 hover:underline">Weibull Calculator</Link>{" "}
        evaluates shape, characteristic life, B-life, and mission reliability directly.</p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">What the FIT Calculator does today</h2>
      <p>The Reliatools <Link href="/tools/FIT" className="text-blue-600 hover:underline">FIT Calculator</Link> is built
        to turn abstract failure-rate numbers into practical engineering meaning. It currently includes two modules:</p>
      <ul className="list-disc list-inside space-y-1 mt-2">
        <li><strong>FIT / Reliability Converter</strong> &mdash; enter one known value (FIT, failure rate per hour,
          reliability, mission ppm, or MTTF) and get mission reliability, mission failure probability, equivalent ppm,
          expected fleet failures, failure rate per hour, MTTF, and reliability &ldquo;nines.&rdquo;</li>
        <li><strong>Test Evidence Reality Check</strong> &mdash; estimate total equivalent device-hours, the demonstrated
          upper FIT, the exposure and sample size required for a target FIT, and the gap between your test evidence and
          the claimed target.</li>
      </ul>
      <p className="mt-4 text-sm text-gray-600">A Safety FIT / PMHF budget preview (ASIL selection, per-block base FIT,
        safety-relevant fraction, diagnostic coverage, and simplified residual dangerous FIT) and an advanced Weibull
        section for time-dependent cases are planned extensions to this tool. Until then, use the standalone{" "}
        <Link href="/tools/Weibull" className="text-blue-600 hover:underline">Weibull Calculator</Link>{" "}
        for wear-out analysis.</p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">Final takeaway</h2>
      <p>FIT is a useful metric, but a FIT value is not meaningful by itself. It becomes meaningful only when connected
        to mission exposure, fleet size, confidence level, failure mechanisms, environmental conditions, safety
        relevance, diagnostic coverage, system architecture, and supporting evidence. <strong>1 FIT sounds tiny</strong>,
        but over 8,000 operating hours it represents roughly 8 ppm mission failure probability, about 0.8 expected
        failures per 100,000 units, and about 8 per one million units &mdash; and demonstrating 1 FIT through a
        zero-failure test at 90% confidence would require roughly <strong>2.3 billion equivalent device-hours</strong>.</p>
      <p className="mt-4">The better question is not simply <em>&ldquo;what is the FIT number?&rdquo;</em> but what it
        means over the actual mission, across the fleet, what evidence supports it, which failures are dangerous, how
        effective the diagnostics are, and whether the result supports the system&rsquo;s safety argument.</p>

      <p className="text-center mt-6">
        Turn a quoted FIT number into an engineering result with the{" "}
        <Link href="/tools/FIT" className="text-blue-600 hover:underline">FIT Calculator</Link>, and evaluate
        time-dependent life data with the{" "}
        <Link href="/tools/Weibull" className="text-blue-600 hover:underline">Weibull Calculator</Link>.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">References and further reading</h2>
      <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
        <li>ISO 26262, <em>Road vehicles &mdash; Functional safety</em>.</li>
        <li>ISO 21448, <em>Road vehicles &mdash; Safety of the intended functionality</em>.</li>
        <li>Texas Instruments, <em>Functional Safety FIT Rate and Failure Mode Distribution Calculations</em>.</li>
        <li>ZVEI, <em>Handbook for Robustness Validation of Automotive Electrical/Electronic Modules</em>.</li>
        <li>Escobar, L. A., and Meeker, W. Q., &ldquo;A Review of Accelerated Test Models.&rdquo;</li>
        <li>McPherson, J. W., <em>Reliability Physics and Engineering: Time-to-Failure Modeling</em>.</li>
        <li>Abernethy, R. B., <em>The New Weibull Handbook</em>.</li>
      </ol>

      <p className="mt-6 text-sm text-gray-500 italic">
        Note: This article and the calculator are educational engineering tools. They do not replace a formal FMEDA,
        ISO 26262 assessment, safety case, fault-tree analysis, dependent-failure analysis, or certified
        functional-safety review.
      </p>

      <ContactCTA variant="article" />
    </main>
  );
}
