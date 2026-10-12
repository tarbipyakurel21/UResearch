import { getDB } from "./db";
import type { ResearchWorkspace } from "@/types/workspace";

export async function saveWorkspace(workspace: ResearchWorkspace): Promise<void> {
  const db = await getDB();
  await db.put("workspaces", workspace);
}

export async function getWorkspace(id: string): Promise<ResearchWorkspace | undefined> {
  const db = await getDB();
  return db.get("workspaces", id);
}

export async function listWorkspaces(): Promise<ResearchWorkspace[]> {
  const db = await getDB();
  const all = await db.getAll("workspaces");
  return all.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export async function deleteWorkspace(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("workspaces", id);
}

export const saveResearchWorkspace = saveWorkspace;
export const getResearchWorkspace = getWorkspace;
export const listResearchWorkspaces = listWorkspaces;
export const deleteResearchWorkspace = deleteWorkspace;
