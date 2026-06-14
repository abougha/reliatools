"use client";

import Link from "next/link";
import {
  getAdjacentWorkflowSteps,
  getWorkflowStep,
  workflowSteps,
} from "@/lib/appWorkspace/mockData";
import { StatusBadge } from "./AppUi";
import { useProject } from "./useProjects";

type StepContentProps = {
  projectId: string;
  stepId: string;
};

const inputClass =
  "mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 shadow-inner outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100";

export default function StepContent({ projectId, stepId }: StepContentProps) {
  const project = useProject(projectId);
  const step = getWorkflowStep(stepId) ?? workflowSteps[0];
  const { previousStep, nextStep } = getAdjacentWorkflowSteps(step.id);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
      <div className="border-b border-slate-200 bg-slate-50/80 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-blue-600">Step {step.order}</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{step.label}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{step.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={step.order <= 3 ? "In Progress" : "Not Started"} tone={step.order <= 3 ? "blue" : "slate"} />
            <StatusBadge label="Draft" tone="purple" />
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
          Next recommended action: Review the fields below, update assumptions, then save the draft before moving to the next step.
        </div>
      </div>

      <div className="space-y-6 p-5">{renderStepBody(step.id, project)}</div>

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {previousStep ? (
            <Link
              href={`/app/projects/${projectId}/${previousStep.id}`}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-white"
            >
              Back
            </Link>
          ) : (
            <Link
              href="/app/projects"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-white"
            >
              Back
            </Link>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled
            title="Available once this step has editable fields."
            className="inline-flex h-11 cursor-not-allowed items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-400"
          >
            Save Draft
          </button>
          {nextStep ? (
            <Link
              href={`/app/projects/${projectId}/${nextStep.id}`}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Next Step
            </Link>
          ) : (
            <button
              type="button"
              disabled
              title="Export available once the report step is complete."
              className="inline-flex h-11 cursor-not-allowed items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white opacity-50"
            >
              Finalize Report
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function renderStepBody(
  stepId: string,
  project: ReturnType<typeof useProject>,
) {
  switch (stepId) {
    case "overview":
      return <OverviewStep project={project} />;
    case "requirements":
      return <RequirementsStep />;
    case "mission-profile":
      return <MissionProfileStep />;
    case "risk-assessment":
      return <RiskAssessmentStep />;
    case "failure-mechanisms":
      return <FailureMechanismsStep />;
    case "reliability-strategy":
      return <ReliabilityStrategyStep />;
    case "test-plan":
      return <TestPlanStep />;
    case "acceleration-models":
      return <AccelerationModelsStep />;
    case "lab-tracker":
      return <LabTrackerStep />;
    case "results":
      return <ResultsStep />;
    case "analysis":
      return <AnalysisStep />;
    case "report":
      return <ReportStep />;
    default:
      return <OverviewStep project={project} />;
  }
}

function OverviewStep({ project }: { project: ReturnType<typeof useProject> }) {
  const fields = [
    ["Project name", project.name],
    ["Industry", project.industry],
    ["Product type", project.productType],
    ["Application / use case", project.application],
    ["Target life", `${project.targetLife} ${project.targetLifeUnit}`],
    ["Reliability target", `${project.reliabilityTarget}%`],
    ["Confidence target", `${project.confidenceTarget}%`],
    ["Project owner", project.owner],
    ["Target launch date", project.launchDate],
  ];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Target life" value={`${project.targetLife}`} detail={project.targetLifeUnit} />
        <Card title="Reliability" value={`${project.reliabilityTarget}%`} detail="At target life" />
        <Card title="Confidence" value={`${project.confidenceTarget}%`} detail="Planning target" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map(([label, value]) => (
          <label key={label} className="text-sm font-medium text-slate-700">
            {label}
            <input className={inputClass} defaultValue={value} />
          </label>
        ))}
      </div>
    </>
  );
}

function RequirementsStep() {
  return (
    <>
      <button className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700">
        Add requirement
      </button>
      <DataTable
        headers={["Type", "Description", "Source", "Priority"]}
        rows={[
          ["Reliability", "Meet target life under defined mission profile", "Product brief", "High"],
          ["Environmental", "Operate across rated temperature and humidity range", "System spec", "High"],
          ["Service", "Support scheduled inspection and replacement intervals", "Service plan", "Medium"],
        ]}
      />
    </>
  );
}

function MissionProfileStep() {
  return (
    <div className="space-y-5">
      <DataTable
        title="Duty cycle"
        headers={["Mode", "Percent time", "Load", "Notes"]}
        rows={[
          ["Idle", "35%", "Low", "Powered and monitoring"],
          ["Nominal operation", "50%", "Medium", "Typical field use"],
          ["Peak demand", "15%", "High", "Short-duration stress windows"],
        ]}
      />
      <DataTable
        title="Temperature exposure"
        headers={["Condition", "Temperature", "Duration", "Assumption"]}
        rows={[
          ["Operating", "40 C", "60%", "Normal installed use"],
          ["Storage", "25 C", "25%", "Warehouse or shelf time"],
          ["Shipping", "55 C", "15%", "Short-term logistics exposure"],
        ]}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Operating" value="60%" detail="Powered field use" />
        <Card title="Storage" value="25%" detail="Unpowered shelf exposure" />
        <Card title="Shipping" value="15%" detail="Transport and handling" />
      </div>
    </div>
  );
}

function RiskAssessmentStep() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Design risk" value="7" detail="Architecture maturity" />
        <Card title="Material risk" value="5" detail="Supplier and degradation" />
        <Card title="Process risk" value="4" detail="Assembly variation" />
        <Card title="Application risk" value="8" detail="Field exposure uncertainty" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {[
          "Is the design materially different from prior released products?",
          "Are new materials, suppliers, or manufacturing processes used?",
          "Does the application include new stress exposure or duty-cycle assumptions?",
          "Are detection controls sufficient before validation release?",
        ].map((question) => (
          <label key={question} className="flex items-start gap-3 rounded-md border border-slate-200 p-3 text-sm">
            <input type="checkbox" className="mt-1" />
            <span>{question}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function FailureMechanismsStep() {
  return (
    <DataTable
      title="Stressor-to-failure-mechanism matrix"
      headers={["Stressor", "Likely failure mechanism", "Observable effect", "Recommended model"]}
      rows={[
        ["Temperature", "Material aging", "Parameter drift", "Arrhenius"],
        ["Thermal cycling", "Fatigue damage", "Intermittent connection", "Coffin-Manson"],
        ["Humidity", "Moisture-assisted degradation", "Leakage or corrosion", "Peck"],
        ["Mechanical load", "Wear or cracking", "Functional degradation", "Inverse Power Law"],
      ]}
    />
  );
}

function ReliabilityStrategyStep() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["Test-to-pass", "Demonstrate conformance to defined requirements at planned confidence."],
          ["Accelerated testing", "Compress time by increasing relevant stress without changing the mechanism."],
          ["Degradation testing", "Track measurable performance drift before hard failure occurs."],
          ["Test-to-failure", "Characterize life distribution when failures are acceptable and informative."],
        ].map(([title, detail]) => (
          <article key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-white">
            <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
          </article>
        ))}
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Recommended validation depth
        <select className={inputClass} defaultValue="enhanced">
          <option value="baseline">Baseline</option>
          <option value="enhanced">Enhanced</option>
          <option value="intensive">Intensive</option>
        </select>
      </label>
    </>
  );
}

function TestPlanStep() {
  return (
    <DataTable
      title="DVP&R-style validation plan"
      headers={["Test name", "Requirement", "Failure mechanism", "Sample size", "Duration", "Status"]}
      rows={[
        ["Temperature endurance", "Target life", "Material aging", "18", "1,000 h", "Draft"],
        ["Thermal cycle", "Environmental", "Fatigue damage", "12", "500 cycles", "Ready"],
        ["Humidity exposure", "Environmental", "Moisture degradation", "15", "720 h", "Draft"],
      ]}
    />
  );
}

function AccelerationModelsStep() {
  const models = ["Arrhenius", "Coffin-Manson", "Eyring", "Peck", "Inverse Power Law", "Weibull", "Sample Size"];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {models.map((model) => (
        <article key={model} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-cyan-200 hover:bg-white">
          <h3 className="text-sm font-semibold text-slate-950">{model}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Placeholder model card for project-specific assumptions and calculations.
          </p>
          <button className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-600">
            Open model
          </button>
        </article>
      ))}
    </div>
  );
}

function LabTrackerStep() {
  return (
    <DataTable
      title="Project lab tracker"
      headers={["Test name", "Equipment", "Owner", "Planned start", "Planned finish", "Status", "Notes"]}
      rows={[
        ["Temperature endurance", "Thermal chamber", "Reliability", "2026-07-01", "2026-08-12", "Planned", "Fixture review pending"],
        ["Thermal cycle", "Cycle chamber", "Test lab", "2026-07-08", "2026-08-02", "Queued", "Samples allocated"],
        ["Functional monitoring", "DAQ rack", "Systems", "2026-07-10", "2026-08-20", "Draft", "Limits under review"],
      ]}
    />
  );
}

function ResultsStep() {
  return (
    <div className="space-y-5">
      <DataTable
        title="Test results"
        headers={["Test", "Samples", "Pass", "Fail", "Status"]}
        rows={[
          ["Temperature endurance", "18", "18", "0", "In progress"],
          ["Thermal cycle", "12", "11", "1", "Review"],
        ]}
      />
      <DataTable
        title="Failure log"
        headers={["Sample", "Test", "Time/cycle", "Symptom", "Disposition"]}
        rows={[["TC-07", "Thermal cycle", "312 cycles", "Intermittent output", "Root cause pending"]]}
      />
      <DataTable
        title="Suspensions log"
        headers={["Sample", "Test", "Exposure", "Reason"]}
        rows={[["TE-12", "Temperature endurance", "640 h", "Removed for inspection"]]}
      />
    </div>
  );
}

function AnalysisStep() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[
        ["Placeholder Weibull plot", "Life data visualization will render here when results are connected."],
        ["Reliability growth chart", "Growth trend by test phase and corrective action state."],
        ["Degradation trend", "Parameter drift over exposure time or cycles."],
        ["Analysis summary", "Engineering conclusion, assumptions, residual risk, and next action."],
      ].map(([title, detail]) => (
        <article key={title} className="min-h-44 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-white">
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          <div className="mt-4 flex h-24 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center text-sm text-slate-500">
            {detail}
          </div>
        </article>
      ))}
    </div>
  );
}

function ReportStep() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["Final decision package", "Release recommendation, open risks, and approval notes."],
          ["Requirement coverage", "Requirement-to-test traceability summary."],
          ["Risk coverage", "Risk controls, evidence, and remaining exposure."],
          ["Test summary", "Pass/fail status, sample accounting, and deviations."],
        ].map(([title, detail]) => (
          <article key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-white">
            <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
          </article>
        ))}
      </div>
      {/* TODO: wire jspdf/exceljs export when report content is finalized */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled
          title="Export available once the report step is complete."
          className="cursor-not-allowed rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white opacity-50"
        >
          Export PDF
        </button>
        <button
          type="button"
          disabled
          title="Export available once the report step is complete."
          className="cursor-not-allowed rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-400"
        >
          Export Excel
        </button>
      </div>
    </>
  );
}

function Card({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function DataTable({
  title,
  headers,
  rows,
}: {
  title?: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div>
      {title ? <h3 className="mb-3 text-sm font-semibold text-slate-950">{title}</h3> : null}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {rows.map((row) => (
              <tr key={row.join("-")} className="transition hover:bg-slate-50">
                {row.map((cell) => (
                  <td key={cell} className="px-4 py-3 text-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
