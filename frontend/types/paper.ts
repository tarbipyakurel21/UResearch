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

/**
 * Paper Entity
 * Grounded in two strict sources of truth:
 * 1. Objective data extracted from the PDF (title, authors, DOI, abstract, file size, pages)
 * 2. Subjective data provided by the user (collections, annotations, tags, reading state, notes)
 * Zero assumptions: No synthetic placeholders, fake authors, or mock tags.
 */
export interface Paper {
  id: string;

  // --- Objective Extracted / Physical Properties ---
  title: string;
  authors: string[];
  source_url?: string;
  file_url?: string;
  kind: PaperKind;
  content: string;
  abstract?: string;
  doi?: string;
  year?: number | string;
  venue?: string;
  page_count?: number;
  file_size?: number;

  // --- Subjective User Input ---
  tags?: string[];
  reading_status?: ReadingStatus;
  progress?: number;
  bookmarked_pages?: number[];
  annotations?: PaperAnnotation[];
  notes?: string;
  project_id?: string;

  // --- System Timestamps ---
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
  description?: string;
  paperIds: string[];
  columns: ProjectExtractionColumn[];
  extractions: ProjectExtractionCell[];
  notes?: string;
  created_at: string;
  updated_at: string;
}
