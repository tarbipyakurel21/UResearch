import { getDB } from "./db";
import type { ResearchProject } from "@/types/paper";
import { SAMPLE_PROJECTS } from "../sample-papers";

const PROJECTS_KEY = "uresearch_projects";

export async function listProjects(): Promise<ResearchProject[]> {
  try {
    const db = await getDB();
    const record = await db.get("settings", PROJECTS_KEY);
    if (record?.value && Array.isArray(record.value) && record.value.length > 0) {
      const existing = [...(record.value as ResearchProject[])];
      for (const sp of SAMPLE_PROJECTS) {
        if (!existing.some((p) => p.id === sp.id)) {
          existing.unshift(sp);
        }
      }
      return existing;
    }
  } catch {
    // IndexedDB not ready or error, fallback to localStorage
  }

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(PROJECTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ResearchProject[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const sp of SAMPLE_PROJECTS) {
            if (!parsed.some((p) => p.id === sp.id)) {
              parsed.unshift(sp);
            }
          }
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  return SAMPLE_PROJECTS;
}

export async function saveProject(project: ResearchProject): Promise<void> {
  const current = await listProjects();
  const index = current.findIndex((p) => p.id === project.id);
  const updated = index >= 0 ? [...current.slice(0, index), project, ...current.slice(index + 1)] : [project, ...current];

  try {
    const db = await getDB();
    await db.put("settings", { key: PROJECTS_KEY, value: updated });
  } catch {
    // fallback
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
}

export async function getProject(id: string): Promise<ResearchProject | undefined> {
  const all = await listProjects();
  return all.find((p) => p.id === id);
}

export async function deleteProject(id: string): Promise<void> {
  const current = await listProjects();
  const updated = current.filter((p) => p.id !== id);

  try {
    const db = await getDB();
    await db.put("settings", { key: PROJECTS_KEY, value: updated });
  } catch {
    // fallback
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
}
