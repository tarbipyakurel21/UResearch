export type FieldType =
  | "numeric"
  | "categorical"
  | "boolean"
  | "text"
  | "datetime"
  | "nested_object"
  | "array"
  | "null"
  | "unknown";

export type SupportedFormat = "json" | "jsonl" | "csv" | "tsv";

export type UnsupportedFormat = "parquet" | "edf" | "mat" | "npy" | "npz";

export interface ColumnSchema {
  key: string;
  raw_key: string;
  type: FieldType;
  nullable: boolean;
  unique_count: number;
  missing_count: number;
  missing_pct: number;
  sample_values: unknown[];
  // numeric only
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  // categorical only
  value_counts?: Record<string, number>;
}

export interface Dataset {
  id: string;
  name: string;
  source_filename: string;
  format: SupportedFormat;
  record_count: number;
  column_schemas: ColumnSchema[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DatasetRecord {
  _rb_id: string;
  _rb_dataset_id: string;
  _rb_index: number;
  _original: Readonly<Record<string, unknown>>;
}

export interface ParseError {
  index: number;
  raw: string;
  message: string;
}

export interface ParseResult {
  records: DatasetRecord[];
  errors: ParseError[];
  format: SupportedFormat;
  metadata?: Record<string, unknown>;
}

export type ParseProgressMessage =
  | { type: "progress"; parsed: number; total: number | null }
  | { type: "done"; result: ParseResult }
  | { type: "error"; message: string };
