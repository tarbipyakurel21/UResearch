import type { DatasetRecord, ParseError, ParseResult } from "@/types/dataset";
import { generateId } from "@/lib/utils/ids";

/**
 * Parse a JSON string into dataset records.
 *
 * Supports:
 *   A. Array:            [{...}, ...]
 *   B. Wrapped object:   { "results": [...] }
 *   C. Metadata+results: { "metadata": {...}, "results": [...] }
 *   D. Any object with one array key
 */
export function parseJSON(
  raw: string,
  datasetId: string
): ParseResult {
  const errors: ParseError[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }

  let records: Record<string, unknown>[] = [];
  let metadata: Record<string, unknown> | undefined;

  if (Array.isArray(parsed)) {
    // Case A
    records = normalizeArray(parsed, errors);
  } else if (parsed !== null && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    // Case B/C — find the array field
    const arrayKeys = Object.keys(obj).filter((k) => Array.isArray(obj[k]));
    const nonArrayKeys = Object.keys(obj).filter((k) => !Array.isArray(obj[k]));

    if (arrayKeys.length === 0) {
      // Single object — treat as one record
      records = [obj];
    } else {
      // Prefer common keys; otherwise take the first array key
      const preferred = ["results", "data", "records", "items", "rows", "entries"];
      const key = preferred.find((k) => arrayKeys.includes(k)) ?? arrayKeys[0];
      records = normalizeArray(obj[key] as unknown[], errors);

      if (nonArrayKeys.length > 0) {
        metadata = {};
        for (const k of nonArrayKeys) {
          if (typeof obj[k] !== "object" || obj[k] === null || Array.isArray(obj[k])) {
            metadata[k] = obj[k];
          } else {
            metadata[k] = obj[k];
          }
        }
      }
    }
  } else {
    throw new Error("JSON root must be an array or object");
  }

  const datasetRecords: DatasetRecord[] = records.map((r, i) => ({
    _rb_id: generateId(),
    _rb_dataset_id: datasetId,
    _rb_index: i,
    _original: Object.freeze(r),
  }));

  return {
    records: datasetRecords,
    errors,
    format: "json",
    metadata,
  };
}

/**
 * Parse JSONL / NDJSON — one JSON object per line.
 */
export function parseJSONL(
  raw: string,
  datasetId: string
): ParseResult {
  const errors: ParseError[] = [];
  const records: DatasetRecord[] = [];

  const lines = raw.split(/\r?\n/);
  let rowIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      const parsed = JSON.parse(line);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        errors.push({ index: i, raw: line, message: "JSONL line must be an object" });
        continue;
      }
      records.push({
        _rb_id: generateId(),
        _rb_dataset_id: datasetId,
        _rb_index: rowIndex++,
        _original: Object.freeze(parsed as Record<string, unknown>),
      });
    } catch (e) {
      errors.push({ index: i, raw: line, message: (e as Error).message });
    }
  }

  return {
    records,
    errors,
    format: "jsonl",
  };
}

function normalizeArray(
  arr: unknown[],
  errors: ParseError[]
): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (item !== null && typeof item === "object" && !Array.isArray(item)) {
      results.push(item as Record<string, unknown>);
    } else {
      errors.push({
        index: i,
        raw: JSON.stringify(item),
        message: `Expected object at index ${i}, got ${typeof item}`,
      });
    }
  }
  return results;
}
