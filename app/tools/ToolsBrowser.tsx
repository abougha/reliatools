"use client";

// Interactive island for /tools/: search box, workflow-group filter chips,
// featured row and the grouped card grid. The server page passes plain data;
// icons are resolved here because component references can't cross the
// server/client boundary. On first render (and in the static HTML) every tool
// is visible, so crawlers see the full list.

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Calculator,
  ClipboardList,
  Code,
  Cpu,
  Droplets,
  Flame,
  Gauge,
  GitBranch,
  ListChecks,
  Network,
  Percent,
  Repeat,
  Route,
  Search,
  Thermometer,
  TrendingUp,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface BrowserTool {
  id: string;
  title: string;
  href: string;
  description: string;
  whenToUse?: string;
  kind: string;
}

export interface BrowserGroup {
  id: string;
  title: string;
  blurb: string;
  tools: BrowserTool[];
}

const TOOL_ICONS: Record<string, LucideIcon> = {
  "test-plan": ClipboardList,
  "mission-profile-builder": Route,
  "halt-hass": Zap,
  burnin: Flame,
  "vibration-wizard": Activity,
  derating: Gauge,
  arrhenius: Thermometer,
  weibull: TrendingUp,
  "coffin-manson": Repeat,
  electromigration: Cpu,
  Samplesize: Calculator,
  Psychrometric: Droplets,
  "p-diagram": GitBranch,
  "rbd-generator": Network,
  "bayesian-prediction": Code,
  "fit-calculator": Percent,
  "nudd-assessment": ListChecks,
};

const CARD_BASE =
  "group flex h-full rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg focus-visible:-translate-y-0.5 focus-visible:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transform-none";

function KindBadge({ kind }: { kind: string }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {kind}
    </span>
  );
}

function ToolIcon({ id, large }: { id: string; large?: boolean }) {
  const Icon = TOOL_ICONS[id] ?? Wrench;
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white ${
        large ? "h-11 w-11" : "h-9 w-9"
      }`}
    >
      <Icon className={large ? "h-6 w-6" : "h-5 w-5"} aria-hidden="true" />
    </span>
  );
}

function ToolCard({ tool }: { tool: BrowserTool }) {
  return (
    <Link href={tool.href} title={tool.whenToUse} className={`${CARD_BASE} items-start gap-3 p-4`}>
      <ToolIcon id={tool.id} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-snug text-slate-900">{tool.title}</h3>
          <ArrowRight
            className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600 motion-reduce:transform-none"
            aria-hidden="true"
          />
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-snug text-slate-600">{tool.description}</p>
        <div className="mt-2">
          <KindBadge kind={tool.kind} />
        </div>
      </div>
    </Link>
  );
}

function FeaturedCard({ tool }: { tool: BrowserTool }) {
  return (
    <Link href={tool.href} className={`${CARD_BASE} flex-col gap-3 p-5`}>
      <div className="flex items-center justify-between gap-2">
        <ToolIcon id={tool.id} large />
        <KindBadge kind={tool.kind} />
      </div>
      <div>
        <h3 className="text-lg font-semibold leading-snug text-slate-900">{tool.title}</h3>
        <p className="mt-1 text-sm leading-snug text-slate-600">{tool.description}</p>
      </div>
      {tool.whenToUse ? (
        <p className="text-sm leading-snug text-slate-500">
          <span className="font-semibold text-slate-700">Use it: </span>
          {tool.whenToUse}
        </p>
      ) : null}
      <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
        Open tool
        <ArrowRight
          className="h-4 w-4 transition group-hover:translate-x-0.5 motion-reduce:transform-none"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

function matches(tool: BrowserTool, q: string) {
  if (!q) return true;
  const hay = `${tool.title} ${tool.description} ${tool.whenToUse ?? ""} ${tool.kind}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => hay.includes(term));
}

export default function ToolsBrowser({
  groups,
  featured,
}: {
  groups: BrowserGroup[];
  featured: BrowserTool[];
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("all");

  const visibleGroups = useMemo(
    () =>
      groups
        .filter((g) => active === "all" || g.id === active)
        .map((g) => ({ ...g, tools: g.tools.filter((t) => matches(t, query.trim())) }))
        .filter((g) => g.tools.length > 0),
    [groups, active, query],
  );

  const resultCount = visibleGroups.reduce((n, g) => n + g.tools.length, 0);
  const filtering = query.trim() !== "" || active !== "all";

  const chip = (id: string, label: string, count: number) => {
    const selected = active === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setActive(id)}
        aria-pressed={selected}
        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
          selected
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        {label}
        <span className={`ml-1.5 text-xs ${selected ? "text-blue-500" : "text-slate-400"}`}>{count}</span>
      </button>
    );
  };

  const total = groups.reduce((n, g) => n + g.tools.length, 0);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools (e.g. Weibull, humidity)"
            aria-label="Search tools"
            className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by workflow stage">
          {chip("all", "All", total)}
          {groups.map((g) => chip(g.id, g.title, g.tools.length))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {filtering ? `${resultCount} tools shown` : ""}
      </p>

      {/* Featured */}
      {!filtering && featured.length > 0 ? (
        <section className="mt-8" aria-labelledby="featured-heading">
          <h2
            id="featured-heading"
            className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Start here
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {featured.map((tool) => (
              <FeaturedCard key={tool.id} tool={tool} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Groups */}
      {visibleGroups.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-slate-600">No tools match &ldquo;{query}&rdquo;.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActive("all");
            }}
            className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>
        </div>
      ) : (
        visibleGroups.map((g) => (
          <section key={g.id} className="mt-8" aria-labelledby={`group-${g.id}`}>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-slate-200 pb-2">
              <h2
                id={`group-${g.id}`}
                className="text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                {g.title}
              </h2>
              <p className="text-sm text-slate-500">{g.blurb}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
