import { describe, expect, it } from "vitest";
import { getAnnotationForRecord, saveAnnotation } from "@/lib/persistence/audit";
import { saveEEGMapping, getEEGMapping, saveLLMMapping, getLLMMapping, saveWorkspace, getWorkspace } from "@/lib/persistence";
import type { AuditAnnotation } from "@/types/audit";
import type { EEGFieldMapping } from "@/types/eeg";
import type { LLMFieldMapping } from "@/types/llm";
import type { ResearchWorkspace } from "@/types/workspace";

describe("annotation persistence", () => {
  it("round-trips an annotation through IndexedDB", async () => {
    const annotation: AuditAnnotation = {
      id: `a-${Date.now()}`, session_id: "persistence-session", dataset_id: "d",
      template_id: "t", schema_version: "1.0", record_id: "record-1",
      _rb_record_id: "rb-1", annotator_id: "A1", answers: { label: "accepted", score: 4 },
      flags: { flagged: false, second_review: true, skipped: false }, review_status: "reviewed",
      created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
    };
    await saveAnnotation(annotation);
    await expect(getAnnotationForRecord(annotation.session_id, annotation._rb_record_id)).resolves.toEqual(annotation);
  });

  it("handles the rest of the local persistence architecture", async () => {
    const workspace: ResearchWorkspace = {
      id: "workspace-1",
      name: "Demo workspace",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
      dataset_ids: ["d1"],
      audit_ids: ["a1"],
      visualization_ids: ["viz1"],
      figure_ids: ["fig1"],
      llm_mapping_ids: ["m1"],
      eeg_mapping_ids: ["e1"],
    };
    await saveWorkspace(workspace);
    await expect(getWorkspace(workspace.id)).resolves.toEqual(workspace);

    const llmMapping: LLMFieldMapping = {
      id: "m1",
      dataset_id: "d1",
      name: "LLM mapping",
      prompt_field: "prompt",
      response_field: "response",
      language_field: "language",
      semantic_id_field: "semantic_id",
      judge_label_fields: ["judge_a", "judge_b"],
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
    };
    await saveLLMMapping(llmMapping);
    await expect(getLLMMapping(llmMapping.id)).resolves.toEqual(llmMapping);

    const eegMapping: EEGFieldMapping = {
      id: "e1",
      dataset_id: "d1",
      name: "EEG mapping",
      model_field: "model",
      subject_field: "subject",
      condition_field: "condition",
      accuracy_field: "accuracy",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
    };
    await saveEEGMapping(eegMapping);
    await expect(getEEGMapping(eegMapping.id)).resolves.toEqual(eegMapping);
  });
});
