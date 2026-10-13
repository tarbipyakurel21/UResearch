export interface EEGFieldMapping {
  id: string;
  dataset_id: string;
  name: string;
  model_field?: string;
  dataset_field?: string;
  subject_field?: string;
  condition_field?: string;
  tta_field?: string;
  seed_field?: string;
  accuracy_field?: string;
  balanced_accuracy_field?: string;
  auroc_field?: string;
  f1_field?: string;
  // Signal fields (for future signal viewer)
  time_field?: string;
  channel_field?: string;
  amplitude_field?: string;
  // Embedding fields
  embed_x_field?: string;
  embed_y_field?: string;
  embed_label_field?: string;
  created_at: string;
  updated_at: string;
}
