import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ResearchWorkspace } from "@/types/workspace";
import type { Dataset, DatasetRecord } from "@/types/dataset";
import type {
  AuditTemplate,
  AuditSession,
  AuditAnnotation,
} from "@/types/audit";
import type { VisualizationConfig } from "@/types/visualization";
import type { LLMFieldMapping } from "@/types/llm";
import type { EEGFieldMapping } from "@/types/eeg";
import type { Paper } from "@/types/paper";

export const IDB_VERSION = 3;
export const IDB_NAME = "researchbench";

interface AppSettings {
  key: string;
  value: unknown;
}

export interface RBSchema extends DBSchema {
  workspaces: {
    key: string;
    value: ResearchWorkspace;
  };
  datasets: {
    key: string;
    value: Dataset;
  };
  dataset_records: {
    key: string;
    value: DatasetRecord;
    indexes: {
      by_dataset: string;
      by_dataset_index: [string, number];
    };
  };
  audit_templates: {
    key: string;
    value: AuditTemplate;
  };
  audit_sessions: {
    key: string;
    value: AuditSession;
    indexes: {
      by_dataset: string;
      by_template: string;
    };
  };
  audit_annotations: {
    key: string;
    value: AuditAnnotation;
    indexes: {
      by_session: string;
      by_record: string;
      by_review_status: string;
      by_session_record: [string, string];
    };
  };
  visualization_configs: {
    key: string;
    value: VisualizationConfig;
    indexes: {
      by_dataset: string;
    };
  };
  llm_mappings: {
    key: string;
    value: LLMFieldMapping;
    indexes: {
      by_dataset: string;
    };
  };
  eeg_mappings: {
    key: string;
    value: EEGFieldMapping;
    indexes: {
      by_dataset: string;
    };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  papers: {
    key: string;
    value: Paper;
  };
  pdf_blobs: {
    key: string;
    value: Blob;
  };
}

let dbInstance: IDBPDatabase<RBSchema> | null = null;

export async function getDB(): Promise<IDBPDatabase<RBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<RBSchema>(IDB_NAME, IDB_VERSION, {
    upgrade(db) {
      // Workspaces
      if (!db.objectStoreNames.contains("workspaces")) {
        db.createObjectStore("workspaces", { keyPath: "id" });
      }

      // Datasets
      if (!db.objectStoreNames.contains("datasets")) {
        db.createObjectStore("datasets", { keyPath: "id" });
      }

      // Dataset records — indexed for efficient dataset-scoped queries
      if (!db.objectStoreNames.contains("dataset_records")) {
        const store = db.createObjectStore("dataset_records", { keyPath: "_rb_id" });
        store.createIndex("by_dataset", "_rb_dataset_id", { unique: false });
        store.createIndex("by_dataset_index", ["_rb_dataset_id", "_rb_index"], {
          unique: true,
        });
      }

      // Audit templates
      if (!db.objectStoreNames.contains("audit_templates")) {
        db.createObjectStore("audit_templates", { keyPath: "id" });
      }

      // Audit sessions
      if (!db.objectStoreNames.contains("audit_sessions")) {
        const store = db.createObjectStore("audit_sessions", { keyPath: "id" });
        store.createIndex("by_dataset", "dataset_id", { unique: false });
        store.createIndex("by_template", "template_id", { unique: false });
      }

      // Audit annotations
      if (!db.objectStoreNames.contains("audit_annotations")) {
        const store = db.createObjectStore("audit_annotations", { keyPath: "id" });
        store.createIndex("by_session", "session_id", { unique: false });
        store.createIndex("by_record", "_rb_record_id", { unique: false });
        store.createIndex("by_review_status", "review_status", { unique: false });
        store.createIndex("by_session_record", ["session_id", "_rb_record_id"], {
          unique: false, // false: multiple annotators can annotate same record in same session
        });
      }

      // Visualization configs
      if (!db.objectStoreNames.contains("visualization_configs")) {
        const store = db.createObjectStore("visualization_configs", { keyPath: "id" });
        store.createIndex("by_dataset", "dataset_id", { unique: false });
      }

      // LLM mappings
      if (!db.objectStoreNames.contains("llm_mappings")) {
        const store = db.createObjectStore("llm_mappings", { keyPath: "id" });
        store.createIndex("by_dataset", "dataset_id", { unique: false });
      }

      // EEG mappings
      if (!db.objectStoreNames.contains("eeg_mappings")) {
        const store = db.createObjectStore("eeg_mappings", { keyPath: "id" });
        store.createIndex("by_dataset", "dataset_id", { unique: false });
      }

      // Settings
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("papers")) {
        db.createObjectStore("papers", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("pdf_blobs")) {
        db.createObjectStore("pdf_blobs");
      }
    },
  });

  return dbInstance;
}

/**
 * Reset the DB instance (useful for testing).
 */
export function resetDBInstance(): void {
  dbInstance = null;
}
