import type { DatasetRecord } from "@/types/dataset";
import type { FilterCondition, FilterConfig } from "@/types/filters";
import { flattenRecord, getFlatValue } from "@/lib/schema/flatten";

/**
 * Apply a single filter condition to a record.
 * Values are retrieved via dotted-path from the record's _original.
 */
function applyCondition(
  record: DatasetRecord,
  condition: FilterCondition
): boolean {
  const flat = flattenRecord(record._original as Record<string, unknown>);
  const value = getFlatValue(flat, condition.field);

  switch (condition.operator) {
    case "eq":
      return String(value) === String(condition.value);
    case "neq":
      return String(value) !== String(condition.value);
    case "in": {
      const arr = condition.value as unknown[];
      return arr.map(String).includes(String(value));
    }
    case "not_in": {
      const arr = condition.value as unknown[];
      return !arr.map(String).includes(String(value));
    }
    case "gt":
      return parseFloat(String(value)) > parseFloat(String(condition.value));
    case "gte":
      return parseFloat(String(value)) >= parseFloat(String(condition.value));
    case "lt":
      return parseFloat(String(value)) < parseFloat(String(condition.value));
    case "lte":
      return parseFloat(String(value)) <= parseFloat(String(condition.value));
    case "contains":
      return String(value)
        .toLowerCase()
        .includes(String(condition.value).toLowerCase());
    case "not_contains":
      return !String(value)
        .toLowerCase()
        .includes(String(condition.value).toLowerCase());
    case "is_null":
      return value === null || value === undefined || value === "";
    case "is_not_null":
      return value !== null && value !== undefined && value !== "";
    default:
      return true;
  }
}

/**
 * Apply a full FilterConfig (multiple conditions with AND/OR logic) to a record.
 */
export function applyFilter(
  record: DatasetRecord,
  filter: FilterConfig
): boolean {
  if (filter.conditions.length === 0) return true;

  const results = filter.conditions.map((c) => applyCondition(record, c));

  if (filter.logic === "AND") {
    return results.every(Boolean);
  } else {
    return results.some(Boolean);
  }
}

/**
 * Filter an array of records using a FilterConfig.
 * Returns a new array — original array is not mutated.
 */
export function filterRecords(
  records: DatasetRecord[],
  filter: FilterConfig | undefined
): DatasetRecord[] {
  if (!filter || filter.conditions.length === 0) return records;
  return records.filter((r) => applyFilter(r, filter));
}
