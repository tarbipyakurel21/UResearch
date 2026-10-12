import Papa from "papaparse";
import type { DatasetRecord, ParseError, ParseResult, SupportedFormat } from "@/types/dataset";
import { generateId } from "@/lib/utils/ids";

/**
 * Parse CSV or TSV string.
 * Uses PapaParse with header row, dynamic typing, and skip-empty-lines.
 */
export function parseCSV(
  raw: string,
  datasetId: string,
  format: "csv" | "tsv" = "csv"
): ParseResult {
  const errors: ParseError[] = [];

  const result = Papa.parse<Record<string, unknown>>(raw, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    delimiter: format === "tsv" ? "\t" : undefined, // undefined → auto-detect
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      errors.push({
        index: err.row ?? -1,
        raw: "",
        message: `${err.message} (row ${err.row})`,
      });
    }
  }

  const records: DatasetRecord[] = result.data.map((row, i) => ({
    _rb_id: generateId(),
    _rb_dataset_id: datasetId,
    _rb_index: i,
    _original: Object.freeze(row),
  }));

  return {
    records,
    errors,
    format: format as SupportedFormat,
  };
}
