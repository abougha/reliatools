import { demoProjects } from "./mockData";

export const PROJECT_STORAGE_KEY = "reliatools.projects";

export type StoredProject = {
  id: string;
  name: string;
  industry: string;
  productType: string;
  application: string;
  targetLife: number;
  targetLifeUnit: "years" | "hours" | "cycles";
  reliabilityTarget: number;
  confidenceTarget: number;
  owner: string;
  launchDate: string;
  customerProgram: string;
  designRevision: string;
  warrantyPeriod: string;
  notes: string;
  userId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
  riskLevel?: "Low" | "Medium" | "High";
  progress?: number;
  completedSteps?: string[];
};

export const demoWorkspaceProject: StoredProject = {
  id: "demo-project",
  name: "Industrial Motor Controller",
  industry: "Industrial",
  productType: "Power electronics",
  application: "Variable-speed motor control in industrial equipment",
  targetLife: 10,
  targetLifeUnit: "years",
  reliabilityTarget: 97,
  confidenceTarget: 90,
  owner: "Demo Engineer",
  launchDate: "2026-08-14",
  customerProgram: "Demo validation program",
  designRevision: "EVT-1",
  warrantyPeriod: "3 years",
  notes: "Demo workspace for reliability planning, validation, lab tracking, analysis, and reporting.",
  userId: "demo-user",
  organizationId: "demo-org",
  createdAt: "2026-05-12T15:30:00.000Z",
  updatedAt: "2026-06-06T13:00:00.000Z",
  isDemo: true,
  riskLevel: "High",
  progress: 34,
  completedSteps: [],
};

export const demoProjectCards: StoredProject[] = demoProjects.map((project) => ({
  id: project.id,
  name: project.name,
  industry: project.industry,
  productType: project.productCategory,
  application: project.summary,
  targetLife: 10,
  targetLifeUnit: "years",
  reliabilityTarget: 97,
  confidenceTarget: 90,
  owner: project.owner,
  launchDate: project.dueDate,
  customerProgram: "Demo validation program",
  designRevision: "Concept",
  warrantyPeriod: "3 years",
  notes: project.summary,
  userId: "demo-user",
  organizationId: "demo-org",
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
  isDemo: true,
  riskLevel: project.riskLevel,
  progress: project.progress,
}));

export function readStoredProjects(): StoredProject[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeStoredProject(project: StoredProject) {
  const existing = readStoredProjects();
  window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify([project, ...existing]));
}

export function getProjectFromStorage(projectId: string): StoredProject {
  if (projectId === "demo-project") return demoWorkspaceProject;

  // localStorage first (user-created projects)
  const fromStorage = readStoredProjects().find((p) => p.id === projectId);
  if (fromStorage) return fromStorage;

  // demo project cards: clone workspace with matching card fields
  const demoCard = demoProjectCards.find((c) => c.id === projectId);
  if (demoCard) {
    return { ...demoWorkspaceProject, ...demoCard };
  }

  return {
    ...demoWorkspaceProject,
    id: projectId,
    name: "New Reliability Project",
    isDemo: false,
  };
}

export function createProjectId(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);

  return `${slug || "project"}-${Date.now().toString(36)}`;
}
