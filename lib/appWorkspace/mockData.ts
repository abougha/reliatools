export type EntityTimestamps = {
  createdAt: string;
  updatedAt: string;
};

export type DemoUser = EntityTimestamps & {
  id: string;
  userId: string;
  organizationId: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
};

export type DemoOrganization = EntityTimestamps & {
  id: string;
  organizationId: string;
  name: string;
  plan: "demo" | "team" | "enterprise";
};

export type WorkflowStep = {
  id: string;
  label: string;
  order: number;
  href: string;
  description: string;
};

export type ProjectMetric = {
  label: string;
  value: string;
  detail: string;
};

export type ProjectActivity = EntityTimestamps & {
  id: string;
  userId: string;
  organizationId: string;
  projectId: string;
  title: string;
  detail: string;
};

export type DemoProject = EntityTimestamps & {
  id: string;
  userId: string;
  organizationId: string;
  projectId: string;
  name: string;
  slug: string;
  productCategory: string;
  industry: string;
  phase: "Discovery" | "Planning" | "Validation" | "Analysis";
  owner: string;
  summary: string;
  dueDate: string;
  riskLevel: "Low" | "Medium" | "High";
  progress: number;
  metrics: ProjectMetric[];
};

const now = "2026-06-06T13:00:00.000Z";
const demoProjectId = "project_demo_reliability_workspace";
const workflowBase = "/app/projects/demo-project";

export const demoOrganization: DemoOrganization = {
  id: "org_demo_reliatools",
  organizationId: "org_demo_reliatools",
  name: "Reliatools Demo Organization",
  plan: "demo",
  createdAt: "2026-01-15T14:00:00.000Z",
  updatedAt: now,
};

export const demoUser: DemoUser = {
  id: "user_demo_engineer",
  userId: "user_demo_engineer",
  organizationId: demoOrganization.organizationId,
  name: "Demo Engineer",
  email: "demo.engineer@example.com",
  role: "owner",
  createdAt: "2026-01-15T14:10:00.000Z",
  updatedAt: now,
};

export const workflowSteps: WorkflowStep[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Project scope, ownership, targets, and current readiness.",
  },
  {
    id: "requirements",
    label: "Requirements",
    description: "Reliability, environmental, regulatory, and customer requirements.",
  },
  {
    id: "mission-profile",
    label: "Mission Profile",
    description: "Operating exposure, duty cycles, transport, and storage conditions.",
  },
  {
    id: "risk-assessment",
    label: "Risk Assessment",
    description: "Application, design, material, process, and verification risk scoring.",
  },
  {
    id: "failure-mechanisms",
    label: "Failure Mechanisms",
    description: "Stressors, likely mechanisms, and recommended reliability models.",
  },
  {
    id: "reliability-strategy",
    label: "Reliability Strategy",
    description: "Validation depth and balance of pass/fail, accelerated, and degradation tests.",
  },
  {
    id: "test-plan",
    label: "Test Plan / DVP&R",
    description: "Requirement coverage, test ownership, sample sizes, and status.",
  },
  {
    id: "acceleration-models",
    label: "Acceleration Models",
    description: "Model placeholders for translating use conditions to accelerated tests.",
  },
  {
    id: "lab-tracker",
    label: "Lab Tracker",
    description: "Execution schedule, owners, equipment, and test notes.",
  },
  {
    id: "results",
    label: "Results",
    description: "Result records, failures, suspensions, and evidence collection.",
  },
  {
    id: "analysis",
    label: "Analysis",
    description: "Life data analysis, trends, growth tracking, and engineering conclusions.",
  },
  {
    id: "report",
    label: "Report",
    description: "Decision package, coverage summaries, and export placeholders.",
  },
].map((step, index) => ({
  ...step,
  order: index + 1,
  href: `${workflowBase}/${step.id}`,
}));

export const demoProjects: DemoProject[] = [
  ["Industrial Motor Controller", "Power electronics", "Industrial", "Planning", "High", 34],
  ["Medical Wearable Device", "Portable electronics", "Medical", "Discovery", "Medium", 18],
  ["Data Center Power Supply", "Power conversion", "Infrastructure", "Validation", "Medium", 56],
  ["Solar Inverter", "Renewable energy", "Energy", "Planning", "High", 29],
  ["HVAC Control Module", "Embedded control", "Building systems", "Analysis", "Low", 72],
  ["Smart Appliance Control Board", "Embedded control", "Consumer products", "Planning", "Medium", 39],
  ["Pump Controller", "Motor control", "Industrial", "Discovery", "Medium", 22],
  ["Battery Monitoring Unit", "Battery systems", "Transportation", "Planning", "Medium", 41],
].map(([name, productCategory, industry, phase, riskLevel, progress], index) => ({
  id: `project_${String(name).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/_$/g, "")}`,
  userId: demoUser.userId,
  organizationId: demoOrganization.organizationId,
  projectId: index === 0 ? demoProjectId : `project_demo_${index + 1}`,
  name: String(name),
  slug: "demo-project",
  productCategory: String(productCategory),
  industry: String(industry),
  phase: phase as DemoProject["phase"],
  owner: "Demo Engineer",
  summary:
    "Cross-industry reliability workspace for requirements, mission profile, risk assessment, validation planning, lab tracking, analysis, and reporting.",
  dueDate: ["2026-08-14", "2026-09-04", "2026-07-25", "2026-10-01"][index % 4],
  riskLevel: riskLevel as DemoProject["riskLevel"],
  progress: Number(progress),
  createdAt: `2026-05-${String(10 + index).padStart(2, "0")}T15:30:00.000Z`,
  updatedAt: now,
  metrics: [
    { label: "Open risks", value: String(8 - Math.min(index, 5)), detail: "Tracked for review" },
    { label: "Draft tests", value: String(8 + index), detail: "Mapped to requirements" },
    { label: "Readiness", value: `${progress}%`, detail: "Workflow completion" },
  ],
}));

export const activeProject = demoProjects[0];

export const projectActivity: ProjectActivity[] = [
  {
    id: "activity_mission_profile_review",
    userId: demoUser.userId,
    organizationId: demoOrganization.organizationId,
    projectId: demoProjectId,
    title: "Mission profile reviewed",
    detail: "Duty cycle assumptions were updated for high-load operating windows.",
    createdAt: "2026-06-06T11:20:00.000Z",
    updatedAt: "2026-06-06T11:20:00.000Z",
  },
  {
    id: "activity_risk_assessment_started",
    userId: demoUser.userId,
    organizationId: demoOrganization.organizationId,
    projectId: demoProjectId,
    title: "Risk assessment started",
    detail: "Initial severity, exposure, and detectability scoring is ready for review.",
    createdAt: "2026-06-05T16:40:00.000Z",
    updatedAt: "2026-06-05T16:40:00.000Z",
  },
  {
    id: "activity_test_plan_draft",
    userId: demoUser.userId,
    organizationId: demoOrganization.organizationId,
    projectId: demoProjectId,
    title: "Test plan draft updated",
    detail: "Validation sequence now includes environmental, electrical, and endurance coverage.",
    createdAt: "2026-06-04T14:05:00.000Z",
    updatedAt: "2026-06-04T14:05:00.000Z",
  },
];

export function getWorkflowStep(stepId: string) {
  return workflowSteps.find((step) => step.id === stepId);
}

export function getAdjacentWorkflowSteps(stepId: string) {
  const index = workflowSteps.findIndex((step) => step.id === stepId);

  return {
    previousStep: index > 0 ? workflowSteps[index - 1] : null,
    nextStep: index >= 0 && index < workflowSteps.length - 1 ? workflowSteps[index + 1] : null,
  };
}
