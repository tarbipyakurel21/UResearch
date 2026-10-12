import type { DatasetRecord } from "@/types/dataset";
import type { GroupingConfig } from "@/types/audit";
import { getStringValue } from "@/lib/statistics/aggregate";

export interface RecordGroup {
  group_key: string;
  variants: Map<string, DatasetRecord[]>;
}

/**
 * Group records by a key field and a variant field.
 * Used for paired / side-by-side review.
 *
 * Example: group by "semantic_id", variants by "language"
 */
export function groupRecords(
  records: DatasetRecord[],
  config: GroupingConfig
): RecordGroup[] {
  const outer = new Map<string, Map<string, DatasetRecord[]>>();

  for (const record of records) {
    const groupKey = getStringValue(record, config.group_key) ?? "(missing)";
    const variant = getStringValue(record, config.variant_field) ?? "(missing)";

    if (!outer.has(groupKey)) outer.set(groupKey, new Map());
    const inner = outer.get(groupKey)!;
    if (!inner.has(variant)) inner.set(variant, []);
    inner.get(variant)!.push(record);
  }

  return Array.from(outer.entries()).map(([group_key, variants]) => ({
    group_key,
    variants,
  }));
}

/**
 * Get all unique variant values across all groups.
 * Useful for rendering column headers.
 */
export function getVariantKeys(groups: RecordGroup[]): string[] {
  const keys = new Set<string>();
  for (const group of groups) {
    for (const key of group.variants.keys()) {
      keys.add(key);
    }
  }
  return Array.from(keys).sort();
}
