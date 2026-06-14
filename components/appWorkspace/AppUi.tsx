import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, FolderOpen } from "lucide-react";
import type { StoredProject } from "@/lib/appWorkspace/projectStore";

type BadgeTone = "blue" | "cyan" | "purple" | "green" | "amber" | "red" | "slate";

const badgeTones: Record<BadgeTone, string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-700",
  purple: "border-violet-200 bg-violet-50 text-violet-700",
  green: "border-green-200 bg-green-50 text-green-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-red-200 bg-red-50 text-red-700",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
};

export function StatusBadge({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        badgeTones[tone],
      ].join(" ")}
    >
      {label}
    </span>
  );
}

export function riskTone(risk?: string): BadgeTone {
  if (risk === "High") return "red";
  if (risk === "Medium") return "amber";
  if (risk === "Low") return "green";
  return "slate";
}

export function SectionCard({
  title,
  description,
  children,
  action,
  className = "",
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm shadow-slate-200/70 backdrop-blur",
        className,
      ].join(" ")}
    >
      {title || description || action ? (
        <div className="flex flex-col gap-3 border-b border-slate-200/80 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? <h2 className="text-base font-bold text-slate-950">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: BadgeTone;
}) {
  const iconTone =
    tone === "cyan"
      ? "bg-cyan-50 text-cyan-600"
      : tone === "purple"
        ? "bg-violet-50 text-violet-600"
        : tone === "green"
          ? "bg-green-50 text-green-600"
          : tone === "amber"
            ? "bg-amber-50 text-amber-600"
            : tone === "red"
              ? "bg-red-50 text-red-600"
              : "bg-blue-50 text-blue-600";

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/60">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconTone}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500">{detail}</p>
    </article>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-violet-600"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

export function ProjectCard({ project }: { project: StoredProject }) {
  const progress = project.progress ?? 0;

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/70">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-950">{project.name}</h3>
          <p className="mt-1 text-sm text-slate-500">{project.industry}</p>
        </div>
        <StatusBadge label={project.riskLevel ? `${project.riskLevel} Risk` : "Medium Risk"} tone={riskTone(project.riskLevel)} />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-700">{project.productType}</p>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-slate-500">{project.application}</p>
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <div>
          <p className="text-xs text-slate-500">Updated</p>
          <p className="text-sm font-semibold text-slate-700">
            {new Date(project.updatedAt).toLocaleDateString("en-US")}
          </p>
        </div>
        <Link
          href={`/app/projects/${project.id}/overview`}
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-blue-600"
        >
          <FolderOpen className="h-4 w-4" aria-hidden="true" />
          Open Project
        </Link>
      </div>
    </article>
  );
}

export function EmptyState({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <h3 className="text-base font-bold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{description}</p>
      {href && action ? (
        <Link
          href={href}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {action}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

export function FormSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
          {number}
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}
