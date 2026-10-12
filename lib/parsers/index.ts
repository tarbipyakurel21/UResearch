import type { ParseResult, SupportedFormat } from "@/types/dataset";
import { parseJSON, parseJSONL } from "./json";
import { parseCSV } from "./csv";
import { generateId } from "@/lib/utils/ids";

export { parseJSON, parseJSONL } from "./json";
export { parseCSV } from "./csv";

export type FileParseOptions = {
  filename: string;
  content: string;
};

/**
 * Detect format from filename extension.
 */
export function detectFormat(filename: string): SupportedFormat | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "json") return "json";
  if (ext === "jsonl" || ext === "ndjson") return "jsonl";
  if (ext === "csv") return "csv";
  if (ext === "tsv") return "tsv";
  return null;
}

/**
 * Parse any supported file format.
 * Returns a ParseResult with records and any errors encountered.
 * Never throws on malformed data — errors are collected instead.
 */
export function parseFile(
  content: string,
  filename: string,
  datasetId?: string
): ParseResult {
  const id = datasetId ?? generateId();
  const format = detectFormat(filename);

  if (!format) {
    throw new Error(
      `Unsupported file format: "${filename.split(".").pop()}". Supported: .json, .jsonl, .ndjson, .csv, .tsv`
    );
  }

  switch (format) {
    case "json":
      return parseJSON(content, id);
    case "jsonl":
      return parseJSONL(content, id);
    case "csv":
      return parseCSV(content, id, "csv");
    case "tsv":
      return parseCSV(content, id, "tsv");
  }
}
