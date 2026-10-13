import { getDB } from "./db";
import type { LLMFieldMapping } from "@/types/llm";

export async function saveLLMFieldMapping(mapping: LLMFieldMapping): Promise<void> {
  const db = await getDB();
  await db.put("llm_mappings", mapping);
}

export async function getLLMFieldMapping(id: string): Promise<LLMFieldMapping | undefined> {
  const db = await getDB();
  return db.get("llm_mappings", id);
}

export async function listLLMFieldMappings(): Promise<LLMFieldMapping[]> {
  const db = await getDB();
  const all = await db.getAll("llm_mappings");
  return all.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export async function listLLMFieldMappingsForDataset(
  datasetId: string
): Promise<LLMFieldMapping[]> {
  const db = await getDB();
  return db.getAllFromIndex("llm_mappings", "by_dataset", datasetId);
}

export async function deleteLLMFieldMapping(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("llm_mappings", id);
}

export const saveLLMMapping = saveLLMFieldMapping;
export const getLLMMapping = getLLMFieldMapping;
export const listLLMMappings = listLLMFieldMappings;
export const listLLMMappingsForDataset = listLLMFieldMappingsForDataset;
export const deleteLLMMapping = deleteLLMFieldMapping;
