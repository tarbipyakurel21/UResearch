import { z } from "zod";
import type { AuditTemplate, AuditQuestion, AuditQuestionType } from "@/types/audit";

const QUESTION_TYPES: AuditQuestionType[] = [
  "single_select",
  "multi_select",
  "yes_no",
  "checkbox",
  "integer",
  "decimal",
  "rating_5",
  "rating_scale",
  "short_text",
  "long_text",
];

const auditQuestionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(QUESTION_TYPES as [AuditQuestionType, ...AuditQuestionType[]]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  scale_min: z.number().optional(),
  scale_max: z.number().optional(),
  default_value: z.unknown().optional(),
});

export const auditTemplateSchema = z.object({
  id: z.string().min(1),
  schema_version: z.literal("1.0"),
  audit_name: z.string().min(1),
  record_id_field: z.string().min(1),
  display_fields: z.array(z.string()),
  questions: z.array(auditQuestionSchema).min(1),
  group_questions: z.array(auditQuestionSchema).optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type AuditTemplateInput = z.infer<typeof auditTemplateSchema>;

/**
 * Validate and parse an audit template from an unknown source.
 * Returns the validated template or throws with a descriptive error.
 */
export function validateAuditTemplate(data: unknown): AuditTemplate {
  const result = auditTemplateSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid audit template: ${issues}`);
  }
  return result.data as AuditTemplate;
}

/**
 * Validate a single audit question's answer against its definition.
 * Returns null if valid, error message if invalid.
 */
export function validateAnswer(
  question: AuditQuestion,
  value: unknown
): string | null {
  if (question.required) {
    if (value === null || value === undefined || value === "") {
      return `"${question.label}" is required`;
    }
    if (question.type === "multi_select" && Array.isArray(value) && value.length === 0) {
      return `"${question.label}" requires at least one selection`;
    }
  }

  if (value === null || value === undefined || value === "") return null;

  switch (question.type) {
    case "single_select":
      if (question.options && !question.options.includes(String(value))) {
        return `Invalid option for "${question.label}"`;
      }
      break;
    case "multi_select":
      if (Array.isArray(value) && question.options) {
        const invalid = (value as string[]).filter(
          (v) => !question.options!.includes(v)
        );
        if (invalid.length > 0) {
          return `Invalid options: ${invalid.join(", ")}`;
        }
      }
      break;
    case "integer": {
      const n = parseInt(String(value), 10);
      if (isNaN(n)) return `"${question.label}" must be an integer`;
      break;
    }
    case "decimal": {
      const n = parseFloat(String(value));
      if (isNaN(n)) return `"${question.label}" must be a number`;
      break;
    }
    case "rating_5": {
      const n = parseInt(String(value), 10);
      if (isNaN(n) || n < 1 || n > 5) {
        return `"${question.label}" must be 1–5`;
      }
      break;
    }
    case "rating_scale": {
      const min = question.scale_min ?? 1;
      const max = question.scale_max ?? 10;
      const n = parseFloat(String(value));
      if (isNaN(n) || n < min || n > max) {
        return `"${question.label}" must be between ${min} and ${max}`;
      }
      break;
    }
  }

  return null;
}

/**
 * Validate all answers in an annotation against a template's questions.
 * Returns a map of questionId → error message for any failures.
 */
export function validateAnnotation(
  template: AuditTemplate,
  answers: Record<string, unknown>
): Map<string, string> {
  const errors = new Map<string, string>();
  for (const question of template.questions) {
    const value = answers[question.id];
    const error = validateAnswer(question, value);
    if (error) errors.set(question.id, error);
  }
  return errors;
}
