export interface ResearchWorkspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  dataset_ids: string[];
  audit_ids: string[];
  visualization_ids: string[];
  figure_ids: string[];
  llm_mapping_ids: string[];
  eeg_mapping_ids: string[];
}
