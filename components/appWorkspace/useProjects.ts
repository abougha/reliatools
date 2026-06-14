"use client";

import { useEffect, useState } from "react";
import {
  demoProjectCards,
  getProjectFromStorage,
  readStoredProjects,
  type StoredProject,
} from "@/lib/appWorkspace/projectStore";

export function useProjects() {
  const [storedProjects, setStoredProjects] = useState<StoredProject[]>([]);

  useEffect(() => {
    setStoredProjects(readStoredProjects());
  }, []);

  return [...storedProjects, ...demoProjectCards];
}

export function useProject(projectId: string) {
  const [project, setProject] = useState<StoredProject>(() => getProjectFromStorage(projectId));

  useEffect(() => {
    setProject(getProjectFromStorage(projectId));
  }, [projectId]);

  return project;
}
