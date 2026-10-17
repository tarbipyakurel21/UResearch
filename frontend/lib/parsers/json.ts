import type { DatasetRecord, ParseError, ParseResult } from "@/types/dataset";
import { generateId } from "@/lib/utils/ids";

/**
 * Parse a JSON string into dataset records.
 *
 * Supports:
 *   A. Array of objects:        [{...}, ...]
 *   B. Wrapped object:          { "results": [...] } / { "data": [...] }
 *   C. Dictionary of objects:   { "id1": {...}, "id2": {...} }
 *   D. Single object:           { "col1": val1, "col2": val2 }
 *   E. Array of primitives:     [1, 2, 3] -> [{ index: 0, value: 1 }, ...]
 *   F. Automatic fallback to JSONL if formatted line-by-line.
 */
export function parseJSON(
  raw: string,
  datasetId: string
): ParseResult {
  const errors: ParseError[] = [];
  const clean = raw.trim().replace(/^\uFEFF/, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch (e) {
    // If standard JSON.parse fails, attempt JSONL parse as a seamless fallback
    try {
      const jsonlResult = parseJSONL(clean, datasetId);
      if (jsonlResult.records.length > 0) {
        return jsonlResult;
      }
    } catch {
      // ignore
    }
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }

  let records: Record<string, unknown>[] = [];
  let metadata: Record<string, unknown> | undefined;

  if (Array.isArray(parsed)) {
    // Case A & E: Array
    records = normalizeArray(parsed, errors);
  } else if (parsed !== null && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    const arrayKeys = Object.keys(obj).filter((k) => Array.isArray(obj[k]));
    const nonArrayKeys = Object.keys(obj).filter((k) => !Array.isArray(obj[k]));

    if (arrayKeys.length === 0) {
      // Check if this object is a key-value dictionary where values are objects (e.g. { "item_1": { "name": "A" } })
      const entries = Object.entries(obj);
      const isDictOfObjects =
        entries.length > 0 &&
        entries.every(
          ([, val]) => val !== null && typeof val === "object" && !Array.isArray(val)
        );

      if (isDictOfObjects) {
        records = entries.map(([key, val]) => ({
          _id: key,
          ...(val as Record<string, unknown>),
        }));
      } else {
        // Single object — treat as one record
        records = [obj];
      }
    } else {
      // Prefer common keys; otherwise take the first array key
      const preferred = ["results", "data", "records", "items", "rows", "entries", "papers", "samples"];
      const key = preferred.find((k) => arrayKeys.includes(k)) ?? arrayKeys[0];
      records = normalizeArray(obj[key] as unknown[], errors);

      if (nonArrayKeys.length > 0) {
        metadata = {};
        for (const k of nonArrayKeys) {
          metadata[k] = obj[k];
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
  const clean = raw.trim().replace(/^\uFEFF/, "");

  // If user pasted a JSON array into JSONL parser, gracefully fallback
  if (clean.startsWith("[") && clean.endsWith("]")) {
    try {
      return parseJSON(clean, datasetId);
    } catch {
      // continue to JSONL parse
    }
  }

  const errors: ParseError[] = [];
  const records: DatasetRecord[] = [];

  const lines = clean.split(/\r?\n/);
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
    } else if (item !== null && typeof item === "object" && Array.isArray(item)) {
      results.push({ index: i, items: item });
    } else if (item !== undefined && item !== null) {
      results.push({ index: i, value: item });
    } else {
      errors.push({
        index: i,
        raw: JSON.stringify(item),
        message: `Expected non-null value at index ${i}`,
      });
    }
  }
  return results;
}
