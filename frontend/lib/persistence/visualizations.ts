import { getDB } from "./db";
import type { VisualizationConfig } from "@/types/visualization";

export async function saveVisualization(config: VisualizationConfig): Promise<void> {
  const db = await getDB();
  await db.put("visualization_configs", config);
}

export async function getVisualization(id: string): Promise<VisualizationConfig | undefined> {
  const db = await getDB();
  return db.get("visualization_configs", id);
}

export async function listVisualizations(): Promise<VisualizationConfig[]> {
  const db = await getDB();
  const all = await db.getAll("visualization_configs");
  return all.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export async function listVisualizationsForDataset(
  datasetId: string
): Promise<VisualizationConfig[]> {
  const db = await getDB();
  return db.getAllFromIndex("visualization_configs", "by_dataset", datasetId);
}

export async function deleteVisualization(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("visualization_configs", id);
}
