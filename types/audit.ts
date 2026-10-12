export type AuditQuestionType =
  | "single_select"
  | "multi_select"
  | "yes_no"
  | "checkbox"
  | "integer"
  | "decimal"
  | "rating_5"
  | "rating_scale"
  | "short_text"
  | "long_text";

export interface AuditQuestion {
  id: string;
  label: string;
  description?: string;
  type: AuditQuestionType;
  required: boolean;
  options?: string[];
  scale_min?: number;
  scale_max?: number;
  default_value?: unknown;
}

export interface AuditTemplate {
  id: string;
  schema_version: "1.0";
  audit_name: string;
  record_id_field: string;
  display_fields: string[];
  questions: AuditQuestion[];
  group_questions?: AuditQuestion[];
  created_at: string;
  updated_at: string;
}

export interface GroupingConfig {
  group_key: string;
  variant_field: string;
}

export interface AuditSession {
  id: string;
  dataset_id: string;
  template_id: string;
  annotator_id: string;
  name: string;
  status: "active" | "completed" | "archived";
  current_index: number;
  filter_config?: import("./filters").FilterConfig;
  grouping_config?: GroupingConfig;
  created_at: string;
  updated_at: string;
}

export interface AnnotationFlags {
  flagged: boolean;
  second_review: boolean;
  skipped: boolean;
}

export type ReviewStatus = "pending" | "reviewed" | "skipped" | "flagged";

export interface AuditAnnotation {
  id: string;
  session_id: string;
  dataset_id: string;
  template_id: string;
  schema_version: "1.0";
  record_id: string;
  _rb_record_id: string;
  annotator_id: string;
  answers: Record<string, unknown>;
  flags: AnnotationFlags;
  review_status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface AuditProgress {
  total: number;
  reviewed: number;
  skipped: number;
  flagged: number;
  second_review: number;
  pending: number;
  pct_reviewed: number;
}

export type ExportMode = "nested" | "flattened" | "annotations_only";

export interface ExportOptions {
  mode: ExportMode;
  format: "json" | "jsonl" | "csv";
  include_metadata: boolean;
}
