import type { HighlightColor, Paper, PaperAnnotation } from "@/types/paper";

export interface DocumentSection {
  id: string;
  title: string;
  level: number;
  pageNumber: number;
}

export interface DocumentFigure {
  id: string;
  label: string;
  caption: string;
  pageNumber: number;
  type: "figure" | "table";
}

export interface DocumentCitation {
  id: string;
  label: string;
  text: string;
  doi?: string;
  year?: number | string;
}

export interface CitationTarget {
  pageNumber?: number;
  sectionId?: string;
  figureId?: string;
  quote?: string;
}

export interface ReaderMessage {
  id: string;
  sender: "user" | "assistant";
  content: string;
  timestamp: string;
}
