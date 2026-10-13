import type { DatasetRecord } from "@/types/dataset";
import type { VisualizationConfig } from "@/types/visualization";
import { filterRecords } from "@/lib/filters/apply";
import { getStringValue } from "@/lib/statistics/aggregate";

/**
 * Given a chart click event (clicked x-value, optional group value),
 * return the _rb_id list of records that contributed to that data point.
 *
 * This is always computed at click-time from live data — never pre-stored.
 * Drilldown respects the active filter config.
 */
export function resolveRecordIds(
  allRecords: DatasetRecord[],
  config: VisualizationConfig,
  clickedX: unknown,
  clickedGroup?: unknown
): string[] {
  // Apply the viz's own filter first
  const filtered = filterRecords(allRecords, config.filters);

  // Match records by x_field value
  let matched = filtered.filter((r) => {
    const val = getStringValue(r, config.x_field);
    return String(val) === String(clickedX);
  });

  // Further narrow by group field if present
  if (clickedGroup !== undefined && config.group_field) {
    matched = matched.filter((r) => {
      const val = getStringValue(r, config.group_field!);
      return String(val) === String(clickedGroup);
    });
  }

  return matched.map((r) => r._rb_id);
}

/**
 * For a transfer matrix cell (train_condition × eval_condition),
 * resolve the underlying records.
 */
export function resolveMatrixCell(
  allRecords: DatasetRecord[],
  trainField: string,
  evalField: string,
  trainValue: string,
  evalValue: string,
  extraFilter?: VisualizationConfig["filters"]
): string[] {
  let records = filterRecords(allRecords, extraFilter);

  records = records.filter((r) => {
    const train = getStringValue(r, trainField);
    const eval_ = getStringValue(r, evalField);
    return String(train) === trainValue && String(eval_) === evalValue;
  });

  return records.map((r) => r._rb_id);
}
