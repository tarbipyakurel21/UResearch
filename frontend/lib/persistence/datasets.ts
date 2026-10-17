import { getDB } from "./db";
import type { Dataset } from "@/types/dataset";

export async function saveDataset(dataset: Dataset): Promise<void> {
  const db = await getDB();
  await db.put("datasets", dataset);
}

export async function getDataset(id: string): Promise<Dataset | undefined> {
  const db = await getDB();
  return db.get("datasets", id);
}

export async function listDatasets(): Promise<Dataset[]> {
  try {
    const db = await getDB();
    const all = await db.getAll("datasets");
    if (!all || !all.length) return [];
    
    const sanitized: Dataset[] = [];
    for (const d of all) {
      const name = (d.name || "").toLowerCase();
      const fn = (d.source_filename || "").toLowerCase();
      const isSample =
        d.id.startsWith("sample-") ||
        name.includes("safety") ||
        name.includes("generic experiment") ||
        name.includes("llm-safety") ||
        name.includes("experiment") ||
        fn.includes("safety") ||
        fn.includes("experiment");

      if (isSample) {
        void db.delete("datasets", d.id);
        void db.delete("dataset_records", d.id).catch(() => {});
      } else {
        sanitized.push(d);
      }
    }
    return sanitized.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  } catch {
    return [];
  }
}

export async function deleteDataset(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("datasets", id);
}
