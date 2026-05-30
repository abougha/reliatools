import Link from "next/link";
import {
  Atom,
  ClipboardCheck,
  Workflow,
  ArrowRight,
} from "lucide-react";
import AnimatedReliabilityLogo from "@/components/AnimatedReliabilityLogo";

export const metadata = {
  title: "Reliatools | Physics-Based Reliability Engineering Tools",
  description:
    "Physics-based reliability tools for mission profiles, acceleration factors, reliability test sizing, Weibull analysis, and validation planning.",
  keywords: [
    "Reliability Engineering",
    "Physics of Failure",
    "Mission Profile",
    "Accelerated Testing",
    "Validation Planning",
    "Weibull Analysis",
  ],
  openGraph: {
    title: "Reliatools | Physics-Based Reliability Engineering Tools",
    description:
      "Build mission profiles, calculate acceleration factors, size reliability tests, analyze Weibull data, and generate defensible validation plans.",
    url: "https://www.reliatools.com/",
    siteName: "Reliatools",
    type: "website",
    locale: "en_US",
  },
  alternates: {
    canonical: "https://www.reliatools.com/",
  },
};

const credibilityChips = [
  "Physics of Failure",
  "Mission Profiles",
  "Accelerated Testing",
  "Validation Planning",
];

const topTools = [
  {
    title: "Mission Profile Builder",
    description:
      "Translate application use conditions into duty cycles and stress exposure inputs.",
    href: "/tools/MissionProfile",
  },
  {
    title: "Arrhenius Calculator",
    description:
      "Estimate thermal acceleration factors for temperature-driven aging mechanisms.",
    href: "/tools/Arrhenius",
  },
  {
    title: "Weibull Analysis",
    description:
      "Analyze life data and support reliability decisions with Weibull distribution modeling.",
    href: "/tools/Weibull",
  },
];

const valueCards = [
  {
    title: "Physics-Based",
    description:
      "Use established reliability models such as Arrhenius, Weibull, Coffin-Manson, Black's equation, binomial confidence, and reliability block diagrams.",
    icon: Atom,
  },
  {
    title: "Workflow-Driven",
    description:
      "Move from mission profile to failure mechanism, acceleration model, test duration, sample size, and validation plan without disconnected spreadsheets.",
    icon: Workflow,
  },
  {
    title: "Practical Outputs",
    description:
      "Generate outputs that support design reviews, DVP&R discussions, validation planning, reliability tradeoffs, and engineering decision-making.",
    icon: ClipboardCheck,
  },
];

const resources = [
  {
    category: "Knowledge",
    title: "Reliability by Design: Component Derating",
    description:
      "Learn how derating reduces overstress risk and improves long-term reliability in electronics and mechanical systems.",
    href: "/resources/derating",
  },
  {
    category: "DfR 2.0 / Advanced Validation",
    title: "Hybrid Test Planning: Taguchi + Bayesian + Monte Carlo",
    description:
      "A practical approach for combining designed experiments, prior knowledge, and simulation to improve validation strategy.",
    href: "/resources/taguchi-bayesian-article",
  },
  {
    category: "Article",
    title: "Thermal Shock and Coffin-Manson in Microelectronics",
    description:
      "Understand how thermal cycling drives fatigue damage and how Coffin-Manson can estimate cycles to failure.",
    href: "/resources/thermal-shock-article",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="overflow-hidden bg-gradient-to-b from-white via-slate-50 to-white">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-6 py-10 sm:py-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(280px,0.3fr)] lg:px-8 lg:py-14">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Reliability Engineering | Physics of Failure | Validation Planning
            </p>
            <h1 className="mt-5 max-w-5xl text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Physics-Based Reliability Tools for Faster, Smarter Validation
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Build mission profiles, calculate acceleration factors, size
              reliability tests, analyze Weibull data, and generate defensible
              validation plans - all in one engineering-focused toolkit.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/tools"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              >
                Explore Tools
              </Link>
              <Link
                href="/tools/MissionProfile"
                className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-white px-6 py-3 text-base font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              >
                Start with Mission Profile
              </Link>
            </div>
            <p className="mt-5 max-w-2xl text-sm font-medium text-slate-600">
              Designed for reliability engineers, validation engineers, product
              designers, and test teams.
            </p>
          </div>

          <AnimatedReliabilityLogo />
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Built by reliability engineers for DfR, ALT, validation, and
              physics-of-failure workflows.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Reliatools helps engineers move from generic specifications to
              application-specific reliability decisions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {credibilityChips.map((item) => (
              <span
                key={item}
                className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-8 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-blue-600">
                Start with the core workflow
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                Top Reliability Tools
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Quickly access calculators and wizards for reliability planning,
                acceleration modeling, and life data analysis.
              </p>
            </div>
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
            >
              View all tools <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-3">
            {topTools.map((tool) => (
              <Link
                key={tool.title}
                href={tool.href}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <h3 className="text-lg font-semibold text-slate-900">
                  {tool.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {tool.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-6 py-8 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-blue-600">
              Built for engineering decisions
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              Why Engineers Use Reliatools
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Reliatools connects real-world use conditions, failure mechanisms,
              acceleration models, and validation planning into a practical
              engineering workflow.
            </p>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-3">
            {valueCards.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-900">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-8 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-blue-600">
              Reliability knowledge base
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              Learn the Engineering Behind the Tools
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Practical reliability engineering articles that explain the
              models, assumptions, and workflows behind the calculators and
              wizards.
            </p>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-3">
            {resources.map((resource) => (
              <article
                key={resource.href}
                className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  {resource.category}
                </p>
                <h3 className="mt-4 text-lg font-semibold leading-7 text-slate-900">
                  {resource.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
                  {resource.description}
                </p>
                <Link
                  href={resource.href}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  Read article <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-7">
            <Link
              href="/resources"
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
            >
              View all resources <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
