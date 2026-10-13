import type { DatasetRecord } from "@/types/dataset";
import type { AuditAnnotation, AuditTemplate, ExportOptions } from "@/types/audit";
import { flattenRecord } from "@/lib/schema/flatten";

// ── JSON export ───────────────────────────────────────────────────────────────

/**
 * Build an export record in nested format:
 * { ...original_record, audit: { answers, flags, metadata } }
 */
function buildNestedRecord(
  record: DatasetRecord,
  annotation: AuditAnnotation | undefined
): Record<string, unknown> {
  const base = { ...record._original };
  if (!annotation) {
    base._audit = null;
    return base;
  }
  base._audit = {
    schema: annotation.template_id,
    schema_version: annotation.schema_version,
    answers: annotation.answers,
    flags: annotation.flags,
    review_status: annotation.review_status,
    annotator_id: annotation.annotator_id,
    created_at: annotation.created_at,
    updated_at: annotation.updated_at,
  };
  return base;
}

/**
 * Build an export record in flattened format:
 * { ...original_record, audit_<questionId>: value, audit_annotator_id: ..., ... }
 */
function buildFlattenedRecord(
  record: DatasetRecord,
  annotation: AuditAnnotation | undefined,
  template: AuditTemplate
): Record<string, unknown> {
  const base = flattenRecord(record._original as Record<string, unknown>);
  if (!annotation) {
    for (const q of template.questions) {
      base[`audit_${q.id}`] = null;
    }
    base.audit_annotator_id = null;
    base.audit_review_status = null;
    return base;
  }
  for (const q of template.questions) {
    const val = annotation.answers[q.id];
    base[`audit_${q.id}`] = Array.isArray(val) ? val.join("|") : (val ?? null);
  }
  base.audit_annotator_id = annotation.annotator_id;
  base.audit_review_status = annotation.review_status;
  base.audit_flagged = annotation.flags.flagged;
  base.audit_second_review = annotation.flags.second_review;
  base.audit_created_at = annotation.created_at;
  base.audit_updated_at = annotation.updated_at;
  return base;
}

/**
 * Build annotation-only export (no original data).
 */
function buildAnnotationOnlyRecord(
  record: DatasetRecord,
  annotation: AuditAnnotation | undefined,
  template: AuditTemplate
): Record<string, unknown> | null {
  if (!annotation) return null;
  const result: Record<string, unknown> = {
    _rb_record_id: record._rb_id,
    record_id: record._original[template.record_id_field] ?? record._rb_index,
    annotator_id: annotation.annotator_id,
    review_status: annotation.review_status,
    flagged: annotation.flags.flagged,
    second_review: annotation.flags.second_review,
    skipped: annotation.flags.skipped,
    created_at: annotation.created_at,
    updated_at: annotation.updated_at,
  };
  for (const q of template.questions) {
    result[q.id] = annotation.answers[q.id] ?? null;
  }
  return result;
}

// ── CSV conversion ────────────────────────────────────────────────────────────

function recordsToCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const allKeys = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r)))
  );
  const header = allKeys.map(csvEscape).join(",");
  const lines = rows.map((row) =>
    allKeys.map((k) => csvEscape(String(row[k] ?? ""))).join(",")
  );
  return [header, ...lines].join("\n");
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ── Public export function ────────────────────────────────────────────────────

export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
}

/**
 * Export audited data.
 * Original records are NEVER mutated — join is performed here.
 *
 * This function is deterministic: same inputs → same output.
 */
export function exportAudit(
  records: DatasetRecord[],
  annotations: AuditAnnotation[],
  template: AuditTemplate,
  sessionName: string,
  options: ExportOptions
): ExportResult {
  // Build annotation lookup by _rb_record_id
  const annotationMap = new Map<string, AuditAnnotation>();
  for (const ann of annotations) {
    // If multiple annotators: last write wins; for single-annotator sessions this is fine
    annotationMap.set(ann._rb_record_id, ann);
  }

  let rows: Record<string, unknown>[];

  switch (options.mode) {
    case "nested": {
      rows = records.map((r) =>
        buildNestedRecord(r, annotationMap.get(r._rb_id))
      );
      break;
    }
    case "flattened": {
      rows = records.map((r) =>
        buildFlattenedRecord(r, annotationMap.get(r._rb_id), template)
      );
      break;
    }
    case "annotations_only": {
      rows = records
        .map((r) => buildAnnotationOnlyRecord(r, annotationMap.get(r._rb_id), template))
        .filter((r): r is Record<string, unknown> => r !== null);
      break;
    }
  }

  const safeName = sessionName.replace(/[^a-zA-Z0-9-_]/g, "_").toLowerCase();
  const timestamp = new Date().toISOString().slice(0, 10);

  let content: string;
  let ext: string;
  let mimeType: string;

  switch (options.format) {
    case "json":
      content = JSON.stringify(rows, null, 2);
      ext = "json";
      mimeType = "application/json";
      break;
    case "jsonl":
      content = rows.map((r) => JSON.stringify(r)).join("\n");
      ext = "jsonl";
      mimeType = "application/x-ndjson";
      break;
    case "csv":
      content = recordsToCSV(rows);
      ext = "csv";
      mimeType = "text/csv";
      break;
  }

  return {
    content,
    filename: `${safeName}_${options.mode}_${timestamp}.${ext}`,
    mimeType,
  };
}

/**
 * Export just the audit template as JSON.
 */
export function exportTemplate(template: AuditTemplate): ExportResult {
  const safeName = template.audit_name
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .toLowerCase();
  return {
    content: JSON.stringify(template, null, 2),
    filename: `audit-template-${safeName}.json`,
    mimeType: "application/json",
  };
}

/**
 * Trigger a browser file download.
 */
export function downloadFile(result: ExportResult): void {
  const blob = new Blob([result.content], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
