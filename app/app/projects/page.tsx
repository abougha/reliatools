"use client";

import Link from "next/link";
import { ClipboardList, Filter, LayoutGrid, Search } from "lucide-react";
import {
  EmptyState,
  ProjectCard,
  ProgressBar,
  SectionCard,
  StatusBadge,
  riskTone,
} from "@/components/appWorkspace/AppUi";
import { useProjects } from "@/components/appWorkspace/useProjects";
import { useMemo, useState } from "react";

export default function ProjectsPage() {
  const projects = useProjects();
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [view, setView] = useState<"cards" | "table">("cards");

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesQuery = [project.name, project.industry, project.productType, project.owner]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesRisk = riskFilter === "All" || project.riskLevel === riskFilter;
      return matchesQuery && matchesRisk;
    });
  }, [projects, query, riskFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase text-blue-600">Portfolio</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Projects</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Manage reliability plans, validation work, lab execution, and decision packages
            across demo and locally created projects.
          </p>
        </div>
        <Link
          href="/app/projects/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700"
        >
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
          New Project
        </Link>
      </div>

      <SectionCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by project, industry, product, owner"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="relative sm:w-52">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <select
                value={riskFilter}
                onChange={(event) => setRiskFilter(event.target.value)}
                className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
              >
                <option>All</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
          </div>
          <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setView("cards")}
              className={[
                "inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-bold transition",
                view === "cards" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900",
              ].join(" ")}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              Cards
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={[
                "inline-flex h-9 items-center rounded-xl px-3 text-sm font-bold transition",
                view === "table" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900",
              ].join(" ")}
            >
              Table
            </button>
          </div>
        </div>
      </SectionCard>

      {filteredProjects.length === 0 ? (
        <EmptyState
          title="No projects match your filters"
          description="Clear the search or create a new project to start a reliability workflow."
          href="/app/projects/new"
          action="Create Project"
        />
      ) : view === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filteredProjects.map((project, index) => (
            <ProjectCard key={`${project.id}-${project.name}-${index}`} project={project} />
          ))}
        </div>
      ) : (
        <SectionCard title="Project List" description={`${filteredProjects.length} projects shown`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold">Project</th>
                  <th className="px-4 py-3 font-bold">Industry</th>
                  <th className="px-4 py-3 font-bold">Owner</th>
                  <th className="px-4 py-3 font-bold">Progress</th>
                  <th className="px-4 py-3 font-bold">Risk</th>
                  <th className="px-4 py-3 font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredProjects.map((project, index) => (
                  <tr key={`${project.id}-row-${index}`} className="transition hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-950">{project.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{project.productType}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{project.industry}</td>
                    <td className="px-4 py-4 text-slate-600">{project.owner}</td>
                    <td className="px-4 py-4">
                      <div className="w-36">
                        <div className="mb-1 text-xs font-semibold text-slate-500">
                          {project.progress ?? 0}%
                        </div>
                        <ProgressBar value={project.progress ?? 0} />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge label={`${project.riskLevel ?? "Medium"} Risk`} tone={riskTone(project.riskLevel)} />
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/app/projects/${project.id}/overview`}
                        className="inline-flex h-9 items-center rounded-xl bg-slate-950 px-3 text-sm font-bold text-white transition hover:bg-blue-600"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
