import type { DatasetRecord } from "@/types/dataset";
import type { AggregationType } from "@/types/visualization";
import { flattenRecord, getFlatValue } from "@/lib/schema/flatten";

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }
  return null;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Get the numeric value of a field from a record.
 */
export function getNumericValue(
  record: DatasetRecord,
  field: string
): number | null {
  const flat = flattenRecord(record._original as Record<string, unknown>);
  return toNumber(getFlatValue(flat, field));
}

/**
 * Get string value of a field from a record.
 */
export function getStringValue(
  record: DatasetRecord,
  field: string
): string | null {
  const flat = flattenRecord(record._original as Record<string, unknown>);
  const val = getFlatValue(flat, field);
  if (val === null || val === undefined) return null;
  return String(val);
}

/**
 * Aggregate a list of records on a specific field.
 * Returns null if aggregation is "none" (values returned as-is).
 *
 * Never silently aggregates — caller must explicitly specify aggregation.
 */
export function aggregate(
  records: DatasetRecord[],
  field: string,
  agg: AggregationType
): number | null {
  if (agg === "none" || agg === "count") {
    if (agg === "count") return records.length;
    return null;
  }

  const nums = records
    .map((r) => getNumericValue(r, field))
    .filter((n): n is number => n !== null);

  if (nums.length === 0) return null;

  switch (agg) {
    case "mean":
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    case "median":
      return median(nums);
    case "sum":
      return nums.reduce((a, b) => a + b, 0);
    case "min":
      return Math.min(...nums);
    case "max":
      return Math.max(...nums);
  }
}

/**
 * Group records by a categorical field value.
 * Returns a Map of group key → records in that group.
 */
export function groupBy(
  records: DatasetRecord[],
  field: string
): Map<string, DatasetRecord[]> {
  const groups = new Map<string, DatasetRecord[]>();
  for (const record of records) {
    const key = getStringValue(record, field) ?? "(missing)";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(record);
  }
  return groups;
}

/**
 * Group records by a semantic key (e.g. semantic_id) and a variant field (e.g. language).
 * Returns: Map<groupKey, Map<variantValue, DatasetRecord[]>>
 */
export function groupByVariant(
  records: DatasetRecord[],
  groupKey: string,
  variantField: string
): Map<string, Map<string, DatasetRecord[]>> {
  const outer = new Map<string, Map<string, DatasetRecord[]>>();
  for (const record of records) {
    const gk = getStringValue(record, groupKey) ?? "(missing)";
    const vk = getStringValue(record, variantField) ?? "(missing)";
    if (!outer.has(gk)) outer.set(gk, new Map());
    const inner = outer.get(gk)!;
    if (!inner.has(vk)) inner.set(vk, []);
    inner.get(vk)!.push(record);
  }
  return outer;
}
