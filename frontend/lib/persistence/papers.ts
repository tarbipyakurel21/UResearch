import { getDB } from "./db";
import { deletePdfBlob } from "./pdf-blobs";
import type { Paper } from "@/types/paper";

export async function savePaper(paper: Paper): Promise<void> {
  const db = await getDB();
  await db.put("papers", paper);
}

export async function getPaper(id: string): Promise<Paper | undefined> {
  try {
    const db = await getDB();
    const found = await db.get("papers", id);
    if (found) return found;
  } catch {
    // fallback
  }

  // Fallback to fetch single paper from API
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`/api/papers/${id}`);
      if (res.ok) {
        const bp = await res.json();
        const p: Paper = {
          id: bp.id,
          title: bp.title || "Untitled Paper",
          authors: Array.isArray(bp.authors) ? bp.authors : [],
          doi: bp.metadata_json?.doi || undefined,
          source_url: bp.source_url || undefined,
          file_url: bp.source_url || undefined,
          kind: "pdf",
          content: bp.source_url || "",
          abstract: bp.metadata_json?.abstract || undefined,
          tags: [],
          reading_status: "unread",
          progress: 0,
          created_at: bp.created_at || new Date().toISOString(),
          updated_at: bp.updated_at || new Date().toISOString(),
        };
        await savePaper(p);
        return p;
      }
    } catch {
      // ignore
    }
  }

  return undefined;
}

const LEGACY_SAMPLE_IDS = new Set([
  "paper-attention-2017",
  "paper-rag-2020",
  "paper-gpt3-2020",
  "paper-eegnet-2018",
]);

export async function listPapers(): Promise<Paper[]> {
  let localPapers: Paper[] = [];
  try {
    const db = await getDB();
    const papers = await db.getAll("papers");
    if (papers && papers.length) {
      for (const paper of papers) {
        if (LEGACY_SAMPLE_IDS.has(paper.id)) {
          void db.delete("papers", paper.id);
        } else {
          localPapers.push(paper);
        }
      }
    }
  } catch {
    // ignore
  }

  // Sync with backend API
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/papers");
      if (res.ok) {
        const remotePapers = await res.json();
        if (Array.isArray(remotePapers) && remotePapers.length) {
          const db = await getDB().catch(() => null);
          const localMap = new Map(localPapers.map((p) => [p.id, p]));

          for (const bp of remotePapers) {
            if (!bp.id) continue;
            const existing = localMap.get(bp.id);
            const merged: Paper = {
              id: bp.id,
              title: bp.title || existing?.title || "Untitled Paper",
              authors: Array.isArray(bp.authors) && bp.authors.length
                ? bp.authors
                : (existing?.authors || []),
              doi: bp.metadata_json?.doi || existing?.doi || undefined,
              source_url: bp.source_url || existing?.source_url || undefined,
              file_url: bp.source_url || existing?.file_url || undefined,
              kind: "pdf",
              content: bp.source_url || existing?.content || "",
              abstract: bp.metadata_json?.abstract || existing?.abstract || undefined,
              tags: existing?.tags || [],
              reading_status: existing?.reading_status || "unread",
              progress: existing?.progress || 0,
              bookmarked_pages: existing?.bookmarked_pages || [],
              annotations: existing?.annotations || [],
              created_at: bp.created_at || existing?.created_at || new Date().toISOString(),
              updated_at: bp.updated_at || existing?.updated_at || new Date().toISOString(),
            };

            localMap.set(bp.id, merged);
            if (db) {
              void db.put("papers", merged);
            }
          }

          localPapers = Array.from(localMap.values());
        }
      }
    } catch {
      // offline / sync error
    }
  }

  return localPapers.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export async function deletePaper(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete("papers", id);
  } catch {
    // ignore
  }

  void deletePdfBlob(id);

  if (typeof window !== "undefined") {
    try {
      await fetch(`/api/papers/${id}`, { method: "DELETE" });
    } catch {
      // ignore
    }
  }
}
