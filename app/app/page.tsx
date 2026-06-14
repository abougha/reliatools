import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileText,
  FlaskConical,
  FolderKanban,
  LineChart,
  Radar,
  Sparkles,
  Timer,
} from "lucide-react";
import {
  MetricCard,
  ProgressBar,
  ProjectCard,
  SectionCard,
  StatusBadge,
} from "@/components/appWorkspace/AppUi";
import { demoProjectCards } from "@/lib/appWorkspace/projectStore";

const metrics = [
  { label: "Active Projects", value: "8", detail: "Across planning and validation", icon: FolderKanban, tone: "blue" as const },
  { label: "Open Tests", value: "42", detail: "Lab and analysis queues", icon: FlaskConical, tone: "cyan" as const },
  { label: "High-Risk Items", value: "7", detail: "Need mitigation review", icon: AlertTriangle, tone: "red" as const },
  { label: "Reports Ready", value: "3", detail: "Decision packages staged", icon: FileText, tone: "green" as const },
  { label: "Analysis Pending", value: "11", detail: "Results awaiting review", icon: LineChart, tone: "purple" as const },
];

const workflow = [
  "Requirements",
  "Mission Profile",
  "Risk",
  "Test Plan",
  "Lab Tracker",
  "Results",
  "Analysis",
  "Report",
];

const actions = [
  ["Missing mission profile", "Industrial Motor Controller", "Needs Review", "amber"],
  ["Review acceleration assumptions", "Solar Inverter", "In Progress", "blue"],
  ["Lab test overdue", "Data Center Power Supply", "High Risk", "red"],
  ["Results pending analysis", "HVAC Control Module", "In Progress", "purple"],
  ["Report ready for export", "Battery Monitoring Unit", "Complete", "green"],
] as const;

export default function AppDashboardPage() {
  const recentProjects = demoProjectCards.slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
        <div className="relative bg-[radial-gradient(circle_at_15%_15%,rgba(37,99,235,0.18),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(6,182,212,0.16),transparent_30%),linear-gradient(135deg,#ffffff,#f8fafc)] px-6 py-7 sm:px-8">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-blue-700">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Reliability Engineering Platform
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">
              Reliatools Workspace
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Translate requirements, mission profiles, and test data into defensible
              reliability decisions.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app/projects/new"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700"
              >
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                New Project
              </Link>
              <Link
                href="/app/projects"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200"
              >
                Open Projects
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <SectionCard
            title="Reliability Workflow"
            description="Move from requirements through report-ready evidence with a consistent project backbone."
          >
            <div className="grid gap-3 md:grid-cols-4">
              {workflow.map((step, index) => (
                <div key={step} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-sm font-black text-blue-600 shadow-sm">
                      {index + 1}
                    </span>
                    {index < 3 ? <StatusBadge label="Ready" tone="green" /> : <StatusBadge label="Queued" />}
                  </div>
                  <p className="mt-4 text-sm font-bold text-slate-950">{step}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Recent Projects"
            description="Open an active workspace or create a new project from the portfolio."
            action={
              <Link href="/app/projects" className="text-sm font-bold text-blue-600 hover:text-blue-700">
                View all
              </Link>
            }
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {recentProjects.map((project, index) => (
                <ProjectCard key={`${project.name}-${index}`} project={project} />
              ))}
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-6">
          <SectionCard title="Action Center" description="Recommended follow-up across active work.">
            <div className="space-y-3">
              {actions.map(([title, project, status, tone]) => (
                <div
                  key={`${title}-${project}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-950">{title}</p>
                      <p className="mt-1 text-xs text-slate-500">{project}</p>
                    </div>
                    <StatusBadge label={status} tone={tone} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="System Readiness" description="Demo portfolio health snapshot.">
            <div className="space-y-4">
              {[
                ["Requirements coverage", 74],
                ["Test plan maturity", 58],
                ["Analysis readiness", 42],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                    <span className="text-slate-700">{label}</span>
                    <span className="text-slate-500">{value}%</span>
                  </div>
                  <ProgressBar value={Number(value)} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Next Best Actions">
            <div className="space-y-3">
              {[
                [CheckCircle2, "Complete risk scoring"],
                [Timer, "Confirm lab schedule"],
                [Radar, "Review field exposure assumptions"],
              ].map(([Icon, label]) => (
                <div key={String(label)} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <Icon className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  <span className="text-sm font-semibold text-slate-700">{String(label)}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
