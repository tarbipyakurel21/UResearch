import { getDB } from "./db";
import type { EEGFieldMapping } from "@/types/eeg";

export async function saveEEGFieldMapping(mapping: EEGFieldMapping): Promise<void> {
  const db = await getDB();
  await db.put("eeg_mappings", mapping);
}

export async function getEEGFieldMapping(id: string): Promise<EEGFieldMapping | undefined> {
  const db = await getDB();
  return db.get("eeg_mappings", id);
}

export async function listEEGFieldMappings(): Promise<EEGFieldMapping[]> {
  const db = await getDB();
  const all = await db.getAll("eeg_mappings");
  return all.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export async function listEEGFieldMappingsForDataset(
  datasetId: string
): Promise<EEGFieldMapping[]> {
  const db = await getDB();
  return db.getAllFromIndex("eeg_mappings", "by_dataset", datasetId);
}

export async function deleteEEGFieldMapping(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("eeg_mappings", id);
}

export const saveEEGMapping = saveEEGFieldMapping;
export const getEEGMapping = getEEGFieldMapping;
export const listEEGMappings = listEEGFieldMappings;
export const listEEGMappingsForDataset = listEEGFieldMappingsForDataset;
export const deleteEEGMapping = deleteEEGFieldMapping;
