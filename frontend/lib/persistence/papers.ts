import { getDB } from "./db";
import type { Paper } from "@/types/paper";

import { SAMPLE_PAPERS } from "../sample-papers";

export async function savePaper(paper: Paper): Promise<void> {
  const db = await getDB();
  await db.put("papers", paper);
}

export async function getPaper(id: string): Promise<Paper | undefined> {
  try {
    const db = await getDB();
    const found = await db.get("papers", id);
    if (found) return found;
  } catch {
    // fallback
  }
  return SAMPLE_PAPERS.find((p) => p.id === id);
}

export async function listPapers(): Promise<Paper[]> {
  try {
    const db = await getDB();
    const papers = await db.getAll("papers");
    if (!papers || papers.length === 0) {
      for (const sample of SAMPLE_PAPERS) {
        await db.put("papers", sample);
      }
      return SAMPLE_PAPERS;
    }
    for (const sample of SAMPLE_PAPERS) {
      if (!papers.some((p) => p.id === sample.id)) {
        try {
          await db.put("papers", sample);
        } catch {
          // ignore
        }
        papers.push(sample);
      }
    }
    return papers.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  } catch {
    return SAMPLE_PAPERS;
  }
}

export async function deletePaper(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("papers", id);
}
