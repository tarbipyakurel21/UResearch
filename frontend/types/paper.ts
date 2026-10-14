export type PaperKind = "text" | "pdf";

export type HighlightColor = "yellow" | "green" | "blue" | "purple" | "coral";

export interface PaperAnnotation {
  id: string;
  paperId: string;
  text: string;
  comment?: string;
  color: HighlightColor;
  page?: number;
  section?: string;
  created_at: string;
}

export type ReadingStatus = "unread" | "reading" | "completed" | "starred";

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  source_url?: string;
  kind: PaperKind;
  content: string;
  abstract?: string;
  year?: number | string;
  venue?: string;
  doi?: string;
  tags?: string[];
  reading_status?: ReadingStatus;
  progress?: number;
  annotations?: PaperAnnotation[];
  created_at: string;
  updated_at: string;
}

export interface ZoteroItem {
  id: string;
  title: string;
  authors: string[];
  item_type: string;
  abstract?: string;
  publication?: string;
  year?: string;
  doi?: string;
  url?: string;
  tags: string[];
  collections: string[];
}

export interface ProjectExtractionColumn {
  id: string;
  name: string;
  description?: string;
}

export interface ProjectExtractionCell {
  paperId: string;
  columnId: string;
  value: string;
  quote?: string;
  sectionOrPage?: string;
}

export interface ResearchProject {
  id: string;
  name: string;
  description: string;
  paperIds: string[];
  columns: ProjectExtractionColumn[];
  extractions: ProjectExtractionCell[];
  notes?: string;
  created_at: string;
  updated_at: string;
}
