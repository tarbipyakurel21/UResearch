export interface LLMFieldMapping {
  id: string;
  dataset_id: string;
  name: string;
  // Core fields
  prompt_field?: string;
  response_field?: string;
  model_field?: string;
  seed_field?: string;
  // Multilingual
  language_field?: string;
  script_field?: string;
  semantic_id_field?: string;
  // Labels
  human_label_field?: string;
  judge_label_fields?: string[]; // supports multiple judges
  // Experiment conditions
  train_condition_field?: string;
  eval_condition_field?: string;
  category_field?: string;
  // Tokenization
  token_count_field?: string;
  char_count_field?: string;
  word_count_field?: string;
  created_at: string;
  updated_at: string;
}

export interface LLMPreset {
  id: string;
  name: string;
  description: string;
  chart_type: string;
  x_field_role: keyof LLMFieldMapping;
  y_field_role?: keyof LLMFieldMapping;
  group_field_role?: keyof LLMFieldMapping;
}

export const LLM_PRESETS: LLMPreset[] = [
  {
    id: "unsafe_rate_by_language",
    name: "Unsafe Rate by Language",
    description: "Compare safety across languages",
    chart_type: "bar",
    x_field_role: "language_field",
    y_field_role: "judge_label_fields",
    group_field_role: "model_field",
  },
  {
    id: "human_vs_judge",
    name: "Human vs. Judge Agreement",
    description: "Visualize agreement between human and automatic labels",
    chart_type: "heatmap",
    x_field_role: "human_label_field",
    y_field_role: "judge_label_fields",
  },
  {
    id: "model_comparison",
    name: "Model Comparison",
    description: "Compare metrics across models",
    chart_type: "grouped_bar",
    x_field_role: "model_field",
    group_field_role: "language_field",
  },
];
