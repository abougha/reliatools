"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { workflowSteps } from "@/lib/appWorkspace/mockData";

export default function WorkflowNav() {
  const pathname = usePathname();
  const projectId = pathname.split("/")[3] || "demo-project";
  const currentStepId = pathname.split("/")[4] || "overview";
  const currentIndex = Math.max(
    workflowSteps.findIndex((step) => step.id === currentStepId),
    0,
  );

  return (
    <nav
      className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70"
      aria-label="Project workflow"
    >
      <div className="mb-4">
        <p className="text-xs font-bold uppercase text-blue-600">Workflow Stepper</p>
        <p className="mt-1 text-sm text-slate-500">Step {currentIndex + 1} of {workflowSteps.length}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {workflowSteps.map((step, index) => {
          const active = currentStepId === step.id;
          const complete = index < currentIndex;

          return (
            <Link
              key={step.id}
              href={`/app/projects/${projectId}/${step.id}`}
              className={[
                "group flex min-h-14 items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition",
                active
                  ? "border-blue-200 bg-blue-50 text-blue-950 shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:bg-slate-50",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black",
                  active
                    ? "bg-blue-600 text-white"
                    : complete
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-500",
                ].join(" ")}
              >
                {complete ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : step.order}
              </span>
              <span className="min-w-0">
                <span className="block font-bold">{step.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {active ? "Current step" : complete ? "Complete" : "Not Started"}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
