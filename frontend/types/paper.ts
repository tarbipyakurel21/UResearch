export type PaperKind = "text" | "pdf";

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  source_url?: string;
  kind: PaperKind;
  content: string;
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
