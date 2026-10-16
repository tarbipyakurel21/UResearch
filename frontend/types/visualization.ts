import type { FilterConfig } from "./filters";

export type ChartType =
  | "bar"
  | "horizontal_bar"
  | "line"
  | "area"
  | "scatter"
  | "donut"
  | "histogram"
  | "grouped_bar"
  | "stacked_bar"
  | "box"
  | "heatmap"
  | "violin"
  | "density";

export type AggregationType =
  | "none"
  | "count"
  | "mean"
  | "median"
  | "sum"
  | "min"
  | "max";

export interface VisualizationConfig {
  id: string;
  name: string;
  dataset_id: string;
  audit_session_id?: string;
  chart_type: ChartType;
  x_field: string;
  y_field?: string;
  group_field?: string;
  facet_field?: string;
  metric_field?: string;
  aggregation: AggregationType;
  filters?: FilterConfig;
  created_at: string;
  updated_at: string;
}

export interface Figure {
  id: string;
  name: string;
  visualization_config: VisualizationConfig;
  export_width?: number;
  export_height?: number;
  created_at: string;
  updated_at: string;
}

export interface DrilldownContext {
  viz_config: VisualizationConfig;
  clicked_value: unknown;
  clicked_group?: unknown;
  record_ids: string[];
}
