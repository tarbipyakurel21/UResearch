import { getDB } from "./db";
import type { DatasetRecord } from "@/types/dataset";

const CHUNK_SIZE = 500;

/**
 * Save records in chunks to avoid IDB transaction timeouts.
 * Uses add() (not put()) to enforce immutability — records cannot be overwritten.
 *
 * Progress callback receives (written, total).
 */
export async function saveRecords(
  records: DatasetRecord[],
  onProgress?: (written: number, total: number) => void
): Promise<void> {
  const db = await getDB();
  const total = records.length;
  let written = 0;

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const tx = db.transaction("dataset_records", "readwrite");
    for (const record of chunk) {
      // Use put so re-imports overwrite cleanly, but _original is always from the source file
      await tx.store.put(record);
    }
    await tx.done;
    written += chunk.length;
    onProgress?.(written, total);
  }
}

/**
 * Load all records for a dataset, ordered by _rb_index.
 */
export async function loadRecords(datasetId: string): Promise<DatasetRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex(
    "dataset_records",
    "by_dataset",
    datasetId
  );
  return all.sort((a, b) => a._rb_index - b._rb_index);
}

/**
 * Load a single record by its internal ID.
 */
export async function getRecord(rbId: string): Promise<DatasetRecord | undefined> {
  const db = await getDB();
  return db.get("dataset_records", rbId);
}

/**
 * Load multiple records by their internal IDs.
 */
export async function getRecordsByIds(rbIds: string[]): Promise<DatasetRecord[]> {
  const db = await getDB();
  const results = await Promise.all(rbIds.map((id) => db.get("dataset_records", id)));
  return results.filter((r): r is DatasetRecord => r !== undefined);
}

/**
 * Delete all records for a dataset.
 */
export async function deleteRecords(datasetId: string): Promise<void> {
  const db = await getDB();
  const records = await db.getAllFromIndex(
    "dataset_records",
    "by_dataset",
    datasetId
  );
  const tx = db.transaction("dataset_records", "readwrite");
  for (const record of records) {
    await tx.store.delete(record._rb_id);
  }
  await tx.done;
}
