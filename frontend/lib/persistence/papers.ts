import { getDB } from "./db";
import type { Paper } from "@/types/paper";

export async function savePaper(paper: Paper): Promise<void> {
  const db = await getDB();
  await db.put("papers", paper);
}

export async function getPaper(id: string): Promise<Paper | undefined> {
  const db = await getDB();
  return db.get("papers", id);
}

export async function listPapers(): Promise<Paper[]> {
  const db = await getDB();
  const papers = await db.getAll("papers");
  return papers.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export async function deletePaper(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("papers", id);
}
