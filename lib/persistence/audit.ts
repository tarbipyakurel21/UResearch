import { getDB } from "./db";
import type { AuditTemplate, AuditSession, AuditAnnotation, AuditProgress, ReviewStatus } from "@/types/audit";

// ── Templates ─────────────────────────────────────────────────────────────────

export async function saveTemplate(template: AuditTemplate): Promise<void> {
  const db = await getDB();
  await db.put("audit_templates", template);
}

export async function getTemplate(id: string): Promise<AuditTemplate | undefined> {
  const db = await getDB();
  return db.get("audit_templates", id);
}

export async function listTemplates(): Promise<AuditTemplate[]> {
  const db = await getDB();
  const all = await db.getAll("audit_templates");
  return all.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("audit_templates", id);
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function saveSession(session: AuditSession): Promise<void> {
  const db = await getDB();
  await db.put("audit_sessions", session);
}

export async function getSession(id: string): Promise<AuditSession | undefined> {
  const db = await getDB();
  return db.get("audit_sessions", id);
}

export async function listSessions(): Promise<AuditSession[]> {
  const db = await getDB();
  const all = await db.getAll("audit_sessions");
  return all.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export async function listSessionsForDataset(datasetId: string): Promise<AuditSession[]> {
  const db = await getDB();
  return db.getAllFromIndex("audit_sessions", "by_dataset", datasetId);
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("audit_sessions", id);
}

// ── Annotations ───────────────────────────────────────────────────────────────

export async function saveAnnotation(annotation: AuditAnnotation): Promise<void> {
  const db = await getDB();
  await db.put("audit_annotations", annotation);
}

export async function getAnnotation(id: string): Promise<AuditAnnotation | undefined> {
  const db = await getDB();
  return db.get("audit_annotations", id);
}

/**
 * Get all annotations for a session.
 */
export async function listAnnotationsForSession(
  sessionId: string
): Promise<AuditAnnotation[]> {
  const db = await getDB();
  return db.getAllFromIndex("audit_annotations", "by_session", sessionId);
}

/**
 * Get annotations for a specific record across all sessions.
 * Used for multi-annotator aggregation.
 */
export async function listAnnotationsForRecord(
  rbRecordId: string
): Promise<AuditAnnotation[]> {
  const db = await getDB();
  return db.getAllFromIndex("audit_annotations", "by_record", rbRecordId);
}

/**
 * Get the annotation for a specific record in a specific session (first annotator).
 * For multi-annotator, query by annotator_id from listAnnotationsForSession.
 */
export async function getAnnotationForRecord(
  sessionId: string,
  rbRecordId: string
): Promise<AuditAnnotation | undefined> {
  const db = await getDB();
  const results = await db.getAllFromIndex(
    "audit_annotations",
    "by_session_record",
    [sessionId, rbRecordId]
  );
  return results[0];
}

export async function deleteAnnotation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("audit_annotations", id);
}

/**
 * Compute audit progress for a session.
 */
export async function computeProgress(
  sessionId: string,
  totalRecords: number
): Promise<AuditProgress> {
  const annotations = await listAnnotationsForSession(sessionId);

  const statusCounts: Record<ReviewStatus, number> = {
    pending: 0,
    reviewed: 0,
    skipped: 0,
    flagged: 0,
  };

  let secondReview = 0;
  for (const ann of annotations) {
    statusCounts[ann.review_status] = (statusCounts[ann.review_status] ?? 0) + 1;
    if (ann.flags.second_review) secondReview++;
  }

  const reviewed = statusCounts.reviewed + statusCounts.flagged;
  const pending = totalRecords - annotations.length;

  return {
    total: totalRecords,
    reviewed,
    skipped: statusCounts.skipped,
    flagged: statusCounts.flagged,
    second_review: secondReview,
    pending: Math.max(0, pending),
    pct_reviewed: totalRecords > 0 ? reviewed / totalRecords : 0,
  };
}
