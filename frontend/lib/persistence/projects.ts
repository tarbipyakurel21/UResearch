import { getDB } from "./db";
import type { ResearchProject } from "@/types/paper";

const PROJECTS_KEY = "uresearch_projects";

const LEGACY_SAMPLE_PROJECT_IDS = new Set([
  "proj-transformer-synthesis",
  "proj-brain-computer-interface",
]);

function isLegacyProject(p: ResearchProject): boolean {
  if (LEGACY_SAMPLE_PROJECT_IDS.has(p.id)) return true;
  const name = (p.name || "").toLowerCase();
  if (name.includes("foundation model") || name.includes("literature synthesis")) return true;
  return false;
}

export async function listProjects(): Promise<ResearchProject[]> {
  let loaded: ResearchProject[] = [];

  try {
    const db = await getDB();
    const record = await db.get("settings", PROJECTS_KEY);
    if (record?.value && Array.isArray(record.value)) {
      loaded = record.value as ResearchProject[];
    }
  } catch {
    // IndexedDB not ready or error, fallback to localStorage
  }

  if (!loaded.length && typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(PROJECTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ResearchProject[];
        if (Array.isArray(parsed)) {
          loaded = parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  // Filter out any legacy sample projects
  let filtered = loaded.filter((p) => !isLegacyProject(p));

  // Sync with backend API
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const remoteProjects = await res.json();
        if (Array.isArray(remoteProjects)) {
          const map = new Map<string, ResearchProject>(filtered.map((p) => [p.id, p]));
          for (const bp of remoteProjects) {
            if (!bp.id) continue;
            const existing = map.get(bp.id);
            const proj: ResearchProject = {
              id: bp.id,
              name: bp.name || existing?.name || "Untitled Project",
              description: bp.description || existing?.description || "",
              paperIds: existing?.paperIds || [],
              columns: existing?.columns || [],
              extractions: existing?.extractions || [],
              notes: existing?.notes || "",
              created_at: bp.created_at || existing?.created_at || new Date().toISOString(),
              updated_at: bp.updated_at || existing?.updated_at || new Date().toISOString(),
            };
            map.set(bp.id, proj);
          }
          filtered = Array.from(map.values());
        }
      }
    } catch {
      // ignore
    }
  }

  // Persist synced list locally
  try {
    const db = await getDB();
    await db.put("settings", { key: PROJECTS_KEY, value: filtered });
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));
    } catch {
      // ignore
    }
  }

  return filtered;
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

    try {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: project.name,
          description: project.description,
        }),
      });
    } catch {
      // offline fallback
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

    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
    } catch {
      // ignore
    }
  }
}
