import type { ColumnSchema, FieldType } from "@/types/dataset";
import { flattenRecord } from "./flatten";

const SAMPLE_SIZE = 1000;

/**
 * Infer the FieldType of a list of sampled values.
 */
function inferType(values: unknown[]): FieldType {
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== "");
  if (nonNull.length === 0) return "null";

  let numericCount = 0;
  let booleanCount = 0;
  let dateCount = 0;
  let arrayCount = 0;
  let objectCount = 0;

  for (const v of nonNull) {
    if (Array.isArray(v)) {
      arrayCount++;
    } else if (typeof v === "object" && v !== null) {
      objectCount++;
    } else if (typeof v === "boolean") {
      booleanCount++;
    } else if (typeof v === "number" && !isNaN(v)) {
      numericCount++;
    } else if (typeof v === "string") {
      // Check numeric string
      const asNum = Number(v);
      if (!isNaN(asNum) && v.trim() !== "") {
        numericCount++;
      } else if (isDateString(v)) {
        dateCount++;
      }
    }
  }

  const total = nonNull.length;
  const threshold = 0.8;

  if (objectCount / total > threshold) return "nested_object";
  if (arrayCount / total > threshold) return "array";
  if (booleanCount / total > threshold) return "boolean";
  if (numericCount / total > threshold) return "numeric";
  if (dateCount / total > threshold) return "datetime";

  // Check categorical vs text by unique ratio
  const unique = new Set(nonNull.map(String)).size;
  if (unique / total < 0.5 && unique <= 50) return "categorical";

  return "text";
}

function isDateString(s: string): boolean {
  if (s.length < 8) return false;
  const d = new Date(s);
  return !isNaN(d.getTime());
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return isNaN(v) ? null : v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }
  return null;
}

function numericStats(values: unknown[]): {
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
} | null {
  const nums = values
    .map(toNumber)
    .filter((n): n is number => n !== null);
  if (nums.length === 0) return null;

  nums.sort((a, b) => a - b);
  const min = nums[0];
  const max = nums[nums.length - 1];
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / nums.length;
  const mid = Math.floor(nums.length / 2);
  const median =
    nums.length % 2 === 0 ? (nums[mid - 1] + nums[mid]) / 2 : nums[mid];
  const variance =
    nums.reduce((acc, n) => acc + (n - mean) ** 2, 0) / nums.length;
  const std = Math.sqrt(variance);

  return { min, max, mean, median, std };
}

function valueCounts(values: unknown[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of values) {
    if (v === null || v === undefined) continue;
    const key = String(v);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  // Sort by count descending, keep top 100
  return Object.fromEntries(
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
  );
}

/**
 * Infer schema from an array of records.
 * Samples up to SAMPLE_SIZE records for performance.
 * Returns ColumnSchema[] sorted by key.
 */
export function inferSchema(
  records: Array<Record<string, unknown>>
): ColumnSchema[] {
  if (records.length === 0) return [];

  // Flatten all sampled records and collect all keys
  const sample = records.slice(0, SAMPLE_SIZE);
  const flatSamples = sample.map((r) => flattenRecord(r));
  const totalRecords = records.length;

  const allKeys = new Set<string>();
  for (const flat of flatSamples) {
    for (const key of Object.keys(flat)) {
      allKeys.add(key);
    }
  }

  const schemas: ColumnSchema[] = [];

  for (const key of allKeys) {
    const rawValues = flatSamples.map((flat) =>
      Object.prototype.hasOwnProperty.call(flat, key) ? flat[key] : undefined
    );

    const missingCount = rawValues.filter(
      (v) => v === null || v === undefined || v === ""
    ).length;

    // Estimate missing across full dataset (same ratio)
    const estimatedMissing = Math.round(
      (missingCount / sample.length) * totalRecords
    );

    const type = inferType(rawValues);
    const nonNull = rawValues.filter(
      (v) => v !== null && v !== undefined && v !== ""
    );
    const unique = new Set(nonNull.map((v) => JSON.stringify(v))).size;
    const sampleValues = nonNull.slice(0, 5);

    const schema: ColumnSchema = {
      key,
      raw_key: key,
      type,
      nullable: missingCount > 0,
      unique_count: unique,
      missing_count: estimatedMissing,
      missing_pct: missingCount / sample.length,
      sample_values: sampleValues,
    };

    if (type === "numeric") {
      const stats = numericStats(rawValues);
      if (stats) {
        schema.min = stats.min;
        schema.max = stats.max;
        schema.mean = stats.mean;
        schema.median = stats.median;
        schema.std = stats.std;
      }
    }

    if (type === "categorical" || type === "boolean") {
      schema.value_counts = valueCounts(rawValues);
    }

    schemas.push(schema);
  }

  return schemas.sort((a, b) => a.key.localeCompare(b.key));
}
