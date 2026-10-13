import type { ZoteroItem } from "@/types/paper";

function authorsOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((author) => {
    if (!author || typeof author !== "object") return "";
    const person = author as Record<string, unknown>;
    return String(person.name ?? [person.firstName, person.lastName].filter(Boolean).join(" ")).trim();
  }).filter(Boolean);
}

export function parseZoteroExport(input: unknown): ZoteroItem[] {
  const source: unknown[] = Array.isArray(input) ? input : input && typeof input === "object" && Array.isArray((input as Record<string, unknown>).items)
    ? (input as Record<string, unknown>).items as unknown[] : [];
  return source.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const data = item.data && typeof item.data === "object" ? item.data as Record<string, unknown> : item;
    const title = String(data.title ?? "").trim();
    if (!title) return [];
    const tags = Array.isArray(data.tags) ? data.tags.map((tag) => typeof tag === "string" ? tag : String((tag as Record<string, unknown>)?.tag ?? "")).filter(Boolean) : [];
    return [{
      id: String(data.key ?? item.key ?? `zotero-${index}`),
      title,
      authors: authorsOf(data.creators),
      item_type: String(data.itemType ?? "journalArticle"),
      abstract: data.abstractNote ? String(data.abstractNote) : undefined,
      publication: data.publicationTitle ? String(data.publicationTitle) : undefined,
      year: data.date ? String(data.date).slice(0, 4) : undefined,
      doi: data.DOI ? String(data.DOI) : undefined,
      url: data.url ? String(data.url) : undefined,
      tags,
      collections: Array.isArray(data.collections) ? data.collections.map(String) : [],
    }];
  });
}
