"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import "katex/dist/katex.min.css";
import { Calculator } from "lucide-react";
import ContactCTA from "@/components/ContactCTA";
import CharacteriseLifeTab from "./_components/CharacteriseLifeTab";
import HaltBudgetTab from "./_components/HaltBudgetTab";
import HassScreenTab from "./_components/HassScreenTab";
import MeasureMarginTab from "./_components/MeasureMarginTab";
import ProveClaimTab from "./_components/ProveClaimTab";
import {
  DEFAULT_TAB,
  TABS,
  resolveHash,
  type CharacteriseMethodId,
  type MarginMethodId,
  type ProveMethodId,
  type TabId,
} from "./_components/tabs";

export default function SampleSizeCalculatorPage() {
  const [tab, setTab] = useState<TabId>(DEFAULT_TAB);
  // One method per tab, held separately so switching tabs never carries a
  // selection across or reuses another tab's state.
  const [proveMethod, setProveMethod] = useState<ProveMethodId>("success-run");
  const [characteriseMethod, setCharacteriseMethod] = useState<CharacteriseMethodId>("weibull-life");
  const [marginMethod, setMarginMethod] = useState<MarginMethodId>("tolerance-interval");

  const applyHash = useCallback(() => {
    const resolved = resolveHash(window.location.hash);
    if (!resolved) return;
    setTab(resolved.tab);
    if (!resolved.method) return;
    if (resolved.tab === "prove") setProveMethod(resolved.method as ProveMethodId);
    if (resolved.tab === "characterise") setCharacteriseMethod(resolved.method as CharacteriseMethodId);
    if (resolved.tab === "margin") setMarginMethod(resolved.method as MarginMethodId);
  }, []);

  useEffect(() => {
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [applyHash]);

  // replaceState rather than assigning location.hash, so switching tabs does not
  // scroll the page or stack history entries.
  const writeHash = (key: string) => {
    window.history.replaceState(null, "", `#${key}`);
  };

  // Tabs with methods deep-link to the active method; the rest link to the tab.
  const hashFor = (target: TabId) => {
    if (target === "prove") return proveMethod;
    if (target === "characterise") return characteriseMethod;
    if (target === "margin") return marginMethod;
    return target;
  };

  const selectTab = (next: TabId) => {
    setTab(next);
    writeHash(hashFor(next));
  };

  const selectProveMethod = (next: ProveMethodId) => {
    setProveMethod(next);
    writeHash(next);
  };

  const selectCharacteriseMethod = (next: CharacteriseMethodId) => {
    setCharacteriseMethod(next);
    writeHash(next);
  };

  const selectMarginMethod = (next: MarginMethodId) => {
    setMarginMethod(next);
    writeHash(next);
  };

  const activeTab = TABS.find((entry) => entry.id === tab) ?? TABS[0];

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
        <Calculator className="h-7 w-7 shrink-0 text-blue-600" />
        Reliability Sample Size Calculator
      </h1>
      <p className="mt-3 text-slate-600">
        There is no single sample size formula. The right method is decided by what your test has to prove &mdash;
        pass a reliability gate, characterise a life distribution, measure margin, discover limits, or screen
        production. Pick the test type below; each is an independent calculator with its own inputs, its own
        assumptions, and its own statement of what the answer does not mean.
      </p>

      <div className="mt-6 overflow-x-auto pb-1">
        <div className="inline-flex min-w-max gap-1 rounded-lg bg-slate-100 p-1 text-sm font-semibold" role="tablist">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              onClick={() => selectTab(entry.id)}
              className={`whitespace-nowrap rounded-md px-3.5 py-1.5 transition ${
                tab === entry.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-xl font-semibold text-slate-900">
          {activeTab.heading} <span className="font-normal text-slate-500">({activeTab.qualifier})</span>
        </h2>
        <p className="mb-5 mt-1 text-sm text-slate-600">{activeTab.blurb}</p>

        {tab === "prove" ? <ProveClaimTab method={proveMethod} onMethodChange={selectProveMethod} /> : null}
        {tab === "characterise" ? (
          <CharacteriseLifeTab method={characteriseMethod} onMethodChange={selectCharacteriseMethod} />
        ) : null}
        {tab === "margin" ? <MeasureMarginTab method={marginMethod} onMethodChange={selectMarginMethod} /> : null}
        {tab === "halt" ? <HaltBudgetTab /> : null}
        {tab === "hass" ? <HassScreenTab /> : null}
      </div>

      <ContactCTA variant="tool" />

      {/* Rendered on every load, outside the tab state, so all five methods are in
          the static export rather than hidden behind client-side interaction. */}
      <section id="how-it-works" className="mt-12 border-t pt-8 text-sm text-slate-600">
        <h2 className="mb-3 text-xl font-semibold text-slate-800">How it works</h2>
        <p className="mb-6">
          Sample size is not one calculation. Asking &ldquo;how many units do I need?&rdquo; without saying what the
          test must prove is what produces the familiar answer of 22 units for everything. These five test types each
          answer a different question, and they disagree with each other by design.
        </p>

        <h3 className="mb-2 text-base font-semibold text-slate-800">1. Prove a reliability claim (test-to-pass)</h3>
        <p className="mb-3">
          The demonstration test. You have a target such as R90C90 &mdash; 90% reliability at 90% confidence &mdash;
          and you need to show the design meets it. With zero allowed failures, the sample size is{" "}
          <strong>n = ln(1 &minus; C) / ln(R)</strong>, which gives <strong>22 units</strong> for R90C90 and{" "}
          <strong>230 units</strong> for R99C90. That jump is the central fact of reliability demonstration: high
          targets are punishingly expensive to prove by counting.
        </p>
        <p className="mb-3">
          Allowing failures raises the count &mdash; at R90C90, one allowed failure needs 38 units, two needs 52,
          three needs 65 &mdash; because a test that can survive a failure must be bigger to prove the same thing.
        </p>
        <p className="mb-3">
          <strong>Extended bogey</strong> trades units for time. If failures follow a Weibull with shape &beta;,
          running each unit to a multiple of one life earns credit:{" "}
          <strong>n = ln(1 &minus; C) / [(t/T)<sup>&beta;</sup> &middot; ln R]</strong>. At &beta; = 2, testing to two
          lives cuts R90C90 from 22 units to 6. But the saving lives entirely in &beta;: at &beta; = 1 &mdash; random
          failures &mdash; doubling the test only halves the units, and below 1 it buys almost nothing. A &beta;
          borrowed from a handbook rather than measured from failure data is the most common way this method produces
          a confident wrong answer.
        </p>
        <p className="mb-6">
          <strong>MTBF demonstration</strong> answers in time, not units. The total test time is{" "}
          <strong>T = MTBF<sub>req</sub> &middot; &chi;&sup2;(1&minus;C, 2r+2) / 2</strong>, where r is the number of
          failures allowed. At 90% confidence with zero failures the multiplier is 2.3026, so demonstrating a 5,000
          hour MTBF takes 11,513 unit-hours &mdash; splittable across any number of units. It assumes a constant
          failure rate, which is exactly the assumption the{" "}
          <Link href="/tools/Weibull" className="text-blue-600 hover:underline">
            Weibull tool
          </Link>{" "}
          exists to test.
        </p>

        <h3 className="mb-2 text-base font-semibold text-slate-800">
          2. Characterise the life distribution (test-to-failure)
        </h3>
        <p className="mb-6">
          If you want to know <em>when</em> things fail rather than whether they pass, there is no closed-form sample
          size, because what you need is <strong>failures, not units</strong>. Two or three failures give an
          engineering feel for the mode; around seven support a usable &beta;; fifteen to twenty tighten the
          confidence bounds enough to quote a B10 life. Units follow from failures once you assume a censoring
          fraction. Accelerated life testing needs at least three stress levels with failures at{" "}
          <em>every</em> level &mdash; a level that produces none contributes nothing to the model &mdash; and
          degradation testing needs far fewer units, typically five to ten, because each unit contributes a whole
          curve rather than a single data point.
        </p>

        <h3 className="mb-2 text-base font-semibold text-slate-800">3. Measure margin instead of counting failures</h3>
        <p className="mb-3">
          Counting pass/fail outcomes throws away most of the information in a measurement. If the characteristic is
          continuous and roughly normal, a <strong>tolerance interval</strong> proves the same claim with far fewer
          units: 90/90 by the attribute route takes 22 units, by the variables route about 10. The saving is not
          free. It holds only if the design carries the margin &mdash; at n = 10 the one-sided factor is k = 2.0657,
          so you need the spec limit to sit at least 2.07 standard deviations from the mean. A design running close to
          its limit gets no discount, and the method requires normality.
        </p>
        <p className="mb-6">
          A <strong>comparative test</strong> (A versus B) is sized from effect size and statistical power, not from R
          and C at all &mdash; it answers whether two designs differ, not whether either is reliable. Detecting a one
          standard deviation difference at 80% power needs 17 units per arm. <strong>Weibayes</strong> credits
          existing test evidence from a comparable design against the new requirement, which can cut the remaining
          test dramatically &mdash; and is only as defensible as the claim that the two designs are comparable.
        </p>

        <h3 className="mb-2 text-base font-semibold text-slate-800">4. HALT unit budget</h3>
        <p className="mb-6">
          HALT is <strong>discovery, not proof</strong>. It finds operating and destruct limits by stepping stress
          past specification until things break, so no reliability or confidence figure can be claimed from it, no
          matter how many units you run. The unit count is a budget question: how many stress axes you explore,
          whether you push to destruct limits, and how many units each axis consumes. It usually lands at three to
          six. Build the stress profile itself in the{" "}
          <Link href="/tools/HALTHASSWizard" className="text-blue-600 hover:underline">
            HALT/HASS Wizard
          </Link>
          .
        </p>

        <h3 className="mb-2 text-base font-semibold text-slate-800">5. HASS screen sizing</h3>
        <p className="mb-6">
          HASS is a production screen, a different problem from HALT: it removes latent defects from units you intend
          to ship. Sampling is a lot-acceptance question &mdash; how many parts per lot must be screened to catch a
          lot sitting at the target escape rate &mdash; and the honest answer is often a large fraction of the lot,
          which is why screening starts at 100% and reduces only after a proof-of-screen. Screen strength must stay
          well inside the destruct limits found in HALT; a screen that consumes useful life ships weakened product.
        </p>

        <h3 className="mb-2 text-base font-semibold text-slate-800">Shortening the test instead of enlarging it</h3>
        <p>
          Every method here trades units, time, and assumptions. When schedule is the binding constraint rather than
          unit cost, combine with an acceleration model &mdash;{" "}
          <Link href="/tools/Arrhenius" className="text-blue-600 hover:underline">
            Arrhenius
          </Link>{" "}
          for temperature-driven mechanisms,{" "}
          <Link href="/tools/CoffinManson" className="text-blue-600 hover:underline">
            Coffin-Manson
          </Link>{" "}
          for thermal cycling &mdash; and check the resulting claim against your field target with the{" "}
          <Link href="/tools/FIT" className="text-blue-600 hover:underline">
            FIT calculator
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
