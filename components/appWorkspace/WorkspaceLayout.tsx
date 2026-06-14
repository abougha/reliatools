"use client";

import Link from "next/link";
import WorkflowNav from "./WorkflowNav";
import { ProgressBar, StatusBadge, riskTone } from "./AppUi";
import { useProject } from "./useProjects";

export default function WorkspaceLayout({
  children,
  projectId,
}: {
  children: React.ReactNode;
  projectId: string;
}) {
  const project = useProject(projectId);
  const progress = project.progress ?? 0;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
        <div className="bg-[radial-gradient(circle_at_10%_20%,rgba(37,99,235,0.14),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(124,58,237,0.12),transparent_28%),linear-gradient(135deg,#ffffff,#f8fafc)] p-6">
          <Link href="/app/projects" className="text-sm font-bold text-blue-600 hover:text-blue-700">
            Projects
          </Link>
          <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-black tracking-tight text-slate-950">{project.name}</h1>
                <StatusBadge label={`${project.riskLevel ?? "Medium"} Risk`} tone={riskTone(project.riskLevel)} />
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {project.application}
              </p>
            </div>
            <div className="min-w-64 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
              <div className="mb-2 flex items-center justify-between text-sm font-bold">
                <span className="text-slate-700">Overall progress</span>
                <span className="text-slate-500">{progress}%</span>
              </div>
              <ProgressBar value={progress} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Fact label="Industry" value={project.industry} />
            <Fact label="Product type" value={project.productType} />
            <Fact label="Target life" value={`${project.targetLife} ${project.targetLifeUnit}`} />
            <Fact label="Reliability" value={`${project.reliabilityTarget}%`} />
            <Fact label="Confidence" value={`${project.confidenceTarget}%`} />
            <Fact label="Owner" value={project.owner || "Unassigned"} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <WorkflowNav />
        <div>{children}</div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur">
      <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
