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
  const db = await getDB();
  const all = await db.getAll("datasets");
  return all.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export async function deleteDataset(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("datasets", id);
}
