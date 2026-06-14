"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormSection } from "@/components/appWorkspace/AppUi";
import {
  createProjectId,
  writeStoredProject,
  type StoredProject,
} from "@/lib/appWorkspace/projectStore";

const industryOptions = [
  "Automotive",
  "Aerospace",
  "Consumer Electronics",
  "Industrial",
  "Medical Devices",
  "Energy",
  "Data Center / AI Hardware",
  "Defense",
  "Appliances",
  "Other",
];

type FormState = {
  name: string;
  industry: string;
  productType: string;
  application: string;
  targetLife: string;
  targetLifeUnit: StoredProject["targetLifeUnit"];
  reliabilityTarget: string;
  confidenceTarget: string;
  owner: string;
  launchDate: string;
  customerProgram: string;
  designRevision: string;
  warrantyPeriod: string;
  notes: string;
};

const initialForm: FormState = {
  name: "",
  industry: "",
  productType: "",
  application: "",
  targetLife: "",
  targetLifeUnit: "years",
  reliabilityTarget: "",
  confidenceTarget: "",
  owner: "",
  launchDate: "",
  customerProgram: "",
  designRevision: "",
  warrantyPeriod: "",
  notes: "",
};

const inputClass =
  "mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 shadow-inner outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100";

export default function NewProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const targetLife = Number(form.targetLife);
    const reliabilityTarget = Number(form.reliabilityTarget);
    const confidenceTarget = Number(form.confidenceTarget);

    if (!form.name.trim()) nextErrors.name = "Project name is required.";
    if (!form.industry) nextErrors.industry = "Industry is required.";
    if (!form.productType.trim()) nextErrors.productType = "Product type is required.";
    if (!form.application.trim()) nextErrors.application = "Application / use case is required.";
    if (!form.owner.trim()) nextErrors.owner = "Project owner is required.";
    if (!form.launchDate) nextErrors.launchDate = "Target launch date is required.";
    if (!Number.isFinite(targetLife) || targetLife <= 0) {
      nextErrors.targetLife = "Target life must be greater than 0.";
    }
    if (
      !Number.isFinite(reliabilityTarget) ||
      reliabilityTarget < 0 ||
      reliabilityTarget > 100
    ) {
      nextErrors.reliabilityTarget = "Reliability target must be between 0 and 100.";
    }
    if (
      !Number.isFinite(confidenceTarget) ||
      confidenceTarget < 0 ||
      confidenceTarget > 100
    ) {
      nextErrors.confidenceTarget = "Confidence target must be between 0 and 100.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitProject = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    const timestamp = new Date().toISOString();
    const projectId = createProjectId(form.name);
    const project: StoredProject = {
      id: projectId,
      name: form.name.trim(),
      industry: form.industry,
      productType: form.productType.trim(),
      application: form.application.trim(),
      targetLife: Number(form.targetLife),
      targetLifeUnit: form.targetLifeUnit,
      reliabilityTarget: Number(form.reliabilityTarget),
      confidenceTarget: Number(form.confidenceTarget),
      owner: form.owner.trim(),
      launchDate: form.launchDate,
      customerProgram: form.customerProgram.trim(),
      designRevision: form.designRevision.trim(),
      warrantyPeriod: form.warrantyPeriod.trim(),
      notes: form.notes.trim(),
      userId: "demo-user",
      organizationId: "demo-org",
      createdAt: timestamp,
      updatedAt: timestamp,
      riskLevel: "Medium",
      progress: 0,
    };

    writeStoredProject(project);
    router.push(`/app/projects/${projectId}/overview`);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
        <p className="text-sm font-bold uppercase text-blue-600">Guided setup</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          Create New Project
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Create a local demo project for the reliability workflow. Authentication and
          database storage can be connected later without changing the record shape.
        </p>
      </div>

      <form onSubmit={submitProject} className="space-y-5">
        <FormSection
          number="1"
          title="Project Identity"
          description="Name the workstream and assign the basic ownership context."
        >
          <Field label="Project name" error={errors.name} required>
            <input
              className={inputClass}
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </Field>

          <Field label="Industry" error={errors.industry} required>
            <select
              className={inputClass}
              value={form.industry}
              onChange={(event) => updateField("industry", event.target.value)}
            >
              <option value="">Select industry</option>
              {industryOptions.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Product type" error={errors.productType} required>
            <input
              className={inputClass}
              value={form.productType}
              onChange={(event) => updateField("productType", event.target.value)}
            />
          </Field>
        </FormSection>

        <FormSection
          number="2"
          title="Application Context"
          description="Capture where the product is used and the assumptions that shape reliability risk."
        >
          <Field label="Application / use case" error={errors.application} required>
            <input
              className={inputClass}
              value={form.application}
              onChange={(event) => updateField("application", event.target.value)}
            />
          </Field>

          <Field label="Customer / program">
            <input
              className={inputClass}
              value={form.customerProgram}
              onChange={(event) => updateField("customerProgram", event.target.value)}
            />
          </Field>

          <Field label="Design revision">
            <input
              className={inputClass}
              value={form.designRevision}
              onChange={(event) => updateField("designRevision", event.target.value)}
            />
          </Field>
        </FormSection>

        <FormSection
          number="3"
          title="Reliability Targets"
          description="Define the target life, reliability goal, and confidence basis for planning."
        >
          <Field label="Target life" error={errors.targetLife} required>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.1"
              value={form.targetLife}
              onChange={(event) => updateField("targetLife", event.target.value)}
            />
          </Field>

          <Field label="Target life unit" required>
            <select
              className={inputClass}
              value={form.targetLifeUnit}
              onChange={(event) =>
                updateField("targetLifeUnit", event.target.value as StoredProject["targetLifeUnit"])
              }
            >
              <option value="years">Years</option>
              <option value="hours">Hours</option>
              <option value="cycles">Cycles</option>
            </select>
          </Field>

          <Field label="Reliability target (%)" error={errors.reliabilityTarget} required>
            <input
              className={inputClass}
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.reliabilityTarget}
              onChange={(event) => updateField("reliabilityTarget", event.target.value)}
            />
          </Field>

          <Field label="Confidence target (%)" error={errors.confidenceTarget} required>
            <input
              className={inputClass}
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.confidenceTarget}
              onChange={(event) => updateField("confidenceTarget", event.target.value)}
            />
          </Field>
        </FormSection>

        <FormSection
          number="4"
          title="Timeline & Notes"
          description="Set launch timing, owner, warranty context, and planning notes."
        >
          <Field label="Project owner" error={errors.owner} required>
            <input
              className={inputClass}
              value={form.owner}
              onChange={(event) => updateField("owner", event.target.value)}
            />
          </Field>

          <Field label="Target launch date" error={errors.launchDate} required>
            <input
              className={inputClass}
              type="date"
              value={form.launchDate}
              onChange={(event) => updateField("launchDate", event.target.value)}
            />
          </Field>

          <Field label="Warranty period">
            <input
              className={inputClass}
              value={form.warrantyPeriod}
              onChange={(event) => updateField("warrantyPeriod", event.target.value)}
            />
          </Field>

          <Field label="Notes">
            <textarea
              className={`${inputClass} min-h-24`}
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
            />
          </Field>
        </FormSection>

        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 sm:flex-row sm:justify-end">
          <Link
            href="/app/projects"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700"
          >
            Create Project
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  error,
  required,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label} {required ? <span className="text-red-600">*</span> : null}
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}
