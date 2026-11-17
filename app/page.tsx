import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  ChartColumn,
  Check,
  ChevronRight,
  FlaskConical,
  Target,
  type LucideIcon,
} from "lucide-react";
import AdUnit from "@/components/AdUnit";
import WeibullPanel from "@/components/home/WeibullPanel";
import resourceData from "@/data/resources.json";
import { ABSOLUTE_TITLES, ogTitle } from "@/lib/seo/titles";
import { TOOL_COUNT, TOOL_GROUPS, type ToolGroup } from "@/lib/toolGroups";

export const metadata = {
  title: ABSOLUTE_TITLES["/"],
  description:
    "Free physics-based reliability engineering tools for mission profiles, acceleration factors, reliability test sizing, Weibull analysis, and validation planning. No sign-up required.",
  keywords: [
    "Reliability Engineering",
    "Physics of Failure",
    "Mission Profile",
    "Accelerated Testing",
    "Validation Planning",
    "Weibull Analysis",
  ],
  openGraph: {
    title: ogTitle("/"),
    description:
      "Build mission profiles, calculate acceleration factors, size reliability tests, analyze Weibull data, and generate defensible validation plans. Free, in your browser.",
    url: "https://www.reliatools.com/",
    siteName: "Reliatools",
    type: "website",
    locale: "en_US",
  },
  alternates: {
    canonical: "https://www.reliatools.com/",
  },
};

const GROUP_ICONS: Record<ToolGroup["id"], LucideIcon> = {
  define: Target,
  model: FlaskConical,
  plan: CalendarCheck,
  analyze: ChartColumn,
};

const assurances = ["Free to use", "No sign-up required", "Runs in your browser"];

const principles = [
  {
    title: "Physics-based models",
    description:
      "Established models such as Arrhenius, Coffin-Manson, Black's equation, and Weibull link real use conditions to reliability.",
  },
  {
    title: "Transparent assumptions",
    description:
      "Every tool shows its equations, inputs, and limitations, so you can check the result and defend it in a design review.",
  },
  {
    title: "Practical outputs",
    description:
      "Test plans, acceleration factors, life estimates, and charts you can export to PDF, Excel, or CSV and take into a DVP&R discussion.",
  },
];

type Resource = {
  slug: string;
  title: string;
  category: string;
  description: string;
  date: string;
  link?: string;
};

const latestResources = [...(resourceData as Resource[])]
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 3);

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";

export default function Home() {
  return (
    <main className="bg-white text-slate-900">
      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12 lg:px-8 lg:py-16">
          <div>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Reliability Engineering, Made Practical.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Free physics-based reliability tools to define mission profiles, model
              acceleration, plan tests, and predict product life.
            </p>

            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              {assurances.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Check className="h-4 w-4 flex-none text-blue-600" strokeWidth={3} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#tools"
                className={`inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 ${FOCUS_RING}`}
              >
                Explore {TOOL_COUNT} Tools
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/tools/MissionProfile"
                className={`inline-flex items-center justify-center rounded-md border border-blue-200 bg-white px-6 py-3 text-base font-semibold text-blue-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 ${FOCUS_RING}`}
              >
                Start with Mission Profile
              </Link>
            </div>
          </div>

          <WeibullPanel />
        </div>
      </section>

      {/* Workflow strip */}
      <section aria-label="Reliability workflow" className="border-y border-slate-200 bg-white">
        <ol className="mx-auto grid max-w-7xl sm:grid-cols-2 lg:grid-cols-4">
          {TOOL_GROUPS.map((group, index) => {
            const Icon = GROUP_ICONS[group.id];
            return (
              <li key={group.id} className="relative">
                <Link
                  href={`#${group.id}`}
                  className={`flex h-full items-center gap-4 px-6 py-5 transition-colors hover:bg-blue-50 lg:px-8 ${FOCUS_RING}`}
                >
                  <Icon className="h-6 w-6 flex-none text-blue-600" aria-hidden="true" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{group.step}</span>
                    <span className="mt-0.5 block text-sm text-slate-600">{group.stepNote}</span>
                  </span>
                </Link>
                {index < TOOL_GROUPS.length - 1 && (
                  <ChevronRight
                    className="pointer-events-none absolute right-0 top-1/2 hidden h-5 w-5 -translate-y-1/2 translate-x-1/2 text-slate-400 lg:block"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Tools by workflow */}
      <section id="tools" className="scroll-mt-6 px-6 py-12 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-slate-900">
              Explore Tools by Workflow
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              A complete set of {TOOL_COUNT} reliability engineering tools, organized by how you
              work: from defining use conditions to analyzing and predicting reliability.
            </p>
          </div>

          <div className="mt-10 grid items-start gap-6 md:grid-cols-2">
            {TOOL_GROUPS.map((group) => {
              const Icon = GROUP_ICONS[group.id];
              return (
                <section
                  key={group.id}
                  id={group.id}
                  aria-labelledby={`${group.id}-title`}
                  className="scroll-mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex items-start gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5">
                    <Icon className="mt-0.5 h-7 w-7 flex-none text-blue-600" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <h3 id={`${group.id}-title`} className="text-xl font-semibold text-slate-900">
                        {group.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{group.blurb}</p>
                    </div>
                    <span className="hidden flex-none rounded-full bg-blue-50 sm:inline-block px-3 py-1 text-xs font-semibold text-blue-700">
                      {group.tools.length} tools
                    </span>
                  </div>

                  <ul className="divide-y divide-slate-200">
                    {group.tools.map((tool) => (
                      <li key={tool.href}>
                        <Link
                          href={tool.href}
                          className="group flex items-center justify-between gap-4 px-6 py-3.5 transition-colors hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
                        >
                          <span className="min-w-0">
                            <span className="font-medium text-slate-900 group-hover:text-blue-700">
                              {tool.label}
                            </span>
                            {tool.note && (
                              <span className="block text-sm text-slate-500 sm:ml-2 sm:inline">
                                {tool.note}
                              </span>
                            )}
                          </span>
                          <ChevronRight
                            className="h-4 w-4 flex-none text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-600"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      </section>

      <AdUnit />

      {/* Principles + latest resources */}
      <section className="px-6 py-12 sm:py-16 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-balance text-3xl font-bold tracking-tight text-slate-900">
              Built for engineering decisions
            </h2>
            <dl className="mt-6">
              {principles.map((item) => (
                <div key={item.title} className="border-t border-slate-200 py-5">
                  <dt className="text-lg font-semibold text-slate-900">{item.title}</dt>
                  <dd className="mt-1 max-w-prose text-base leading-7 text-slate-600">
                    {item.description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">Latest Resources</h2>
              <Link
                href="/resources"
                className={`inline-flex flex-none items-center gap-2 rounded text-sm font-semibold text-blue-700 hover:text-blue-800 ${FOCUS_RING}`}
              >
                View all articles <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <ul className="mt-6 space-y-4">
              {latestResources.map((resource) => (
                <li key={resource.slug}>
                  <Link
                    href={resource.link ?? `/resources/${resource.slug}`}
                    className={`block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg motion-reduce:transform-none ${FOCUS_RING}`}
                  >
                    <h3 className="text-lg font-semibold leading-snug text-slate-900">
                      {resource.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                      {resource.description}
                    </p>
                    <p className="mt-3 text-xs font-medium text-slate-500">
                      {resource.category} · {formatDate(resource.date)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* About band */}
      <section className="px-6 pb-4 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-xl bg-slate-50 px-6 py-8 md:flex-row md:items-center md:justify-between md:px-10">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Built by reliability engineers
            </h2>
            <p className="mt-2 text-base leading-7 text-slate-600">
              Reliatools is created by engineers with decades of industry experience in
              validation, testing, and product development, for design for reliability,
              physics-of-failure, and accelerated testing work.
            </p>
          </div>
          <Link
            href="/about"
            className={`inline-flex flex-none items-center gap-2 rounded text-base font-semibold text-blue-700 hover:text-blue-800 ${FOCUS_RING}`}
          >
            About Reliatools <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
