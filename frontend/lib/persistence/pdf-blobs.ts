import { getDB } from "./db";
import type { Paper } from "@/types/paper";

const memoryBlobUrlMap = new Map<string, string>();

/**
 * Convert base64 data URI to binary Blob.
 */
export function base64ToBlob(base64Data: string, mimeType = "application/pdf"): Blob {
  const parts = base64Data.split(";base64,");
  const base64Str = parts.length > 1 ? parts[1] : parts[0];
  const binaryStr = typeof window !== "undefined" ? window.atob(base64Str) : Buffer.from(base64Str, "base64").toString("binary");
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Save binary PDF Blob to IndexedDB.
 */
export async function savePdfBlob(id: string, blob: Blob): Promise<void> {
  try {
    const db = await getDB();
    await db.put("pdf_blobs", blob, id);
    if (typeof window !== "undefined") {
      const url = URL.createObjectURL(blob);
      memoryBlobUrlMap.set(id, url);
    }
  } catch (err) {
    console.warn("Failed to persist PDF blob in IndexedDB:", err);
  }
}

/**
 * Retrieve binary PDF Blob from IndexedDB.
 */
export async function getPdfBlob(id: string): Promise<Blob | undefined> {
  try {
    const db = await getDB();
    return await db.get("pdf_blobs", id);
  } catch {
    return undefined;
  }
}

/**
 * Delete PDF Blob from IndexedDB.
 */
export async function deletePdfBlob(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete("pdf_blobs", id);
  } catch {
    // ignore
  }
  const cached = memoryBlobUrlMap.get(id);
  if (cached && cached.startsWith("blob:") && typeof window !== "undefined") {
    URL.revokeObjectURL(cached);
  }
  memoryBlobUrlMap.delete(id);
}

/**
 * Set an in-memory blob URL for instant loading.
 */
export function setPdfBlobUrl(id: string, url: string): void {
  memoryBlobUrlMap.set(id, url);
}

/**
 * Resolves a reliable, browser-compatible URL for reading a PDF.
 * Never passes multi-megabyte data: URIs directly to browser <object>/<iframe>.
 * Decodes base64 to Blob URLs or retrieves stored Blobs from IndexedDB.
 */
export async function resolvePdfUrl(paper: Paper | null): Promise<string | null> {
  if (!paper) return null;

  // 1. Check in-memory cache
  const cachedUrl = memoryBlobUrlMap.get(paper.id);
  if (cachedUrl) return cachedUrl;

  // 2. Direct HTTP/HTTPS or arXiv link
  if (paper.source_url) {
    if (paper.source_url.includes("arxiv.org/abs/")) {
      return paper.source_url.replace("arxiv.org/abs/", "arxiv.org/pdf/") + ".pdf";
    }
    if (paper.source_url.startsWith("http://") || paper.source_url.startsWith("https://")) {
      return paper.source_url;
    }
  }

  if (paper.file_url) {
    if (paper.file_url.startsWith("http://") || paper.file_url.startsWith("https://")) {
      return paper.file_url;
    }
    if (paper.file_url.startsWith("blob:")) {
      return paper.file_url;
    }
  }

  // 3. Try retrieving binary Blob from IndexedDB
  const storedBlob = await getPdfBlob(paper.id);
  if (storedBlob && typeof window !== "undefined") {
    const blobUrl = URL.createObjectURL(storedBlob);
    memoryBlobUrlMap.set(paper.id, blobUrl);
    return blobUrl;
  }

  // 4. Content is a base64 data URI: decode to Blob and create object URL
  if (
    paper.content &&
    (paper.content.startsWith("data:application/pdf") || paper.content.startsWith("data:application/octet-stream"))
  ) {
    try {
      const blob = base64ToBlob(paper.content);
      void savePdfBlob(paper.id, blob);
      if (typeof window !== "undefined") {
        const blobUrl = URL.createObjectURL(blob);
        memoryBlobUrlMap.set(paper.id, blobUrl);
        return blobUrl;
      }
    } catch (err) {
      console.error("Failed to decode base64 PDF:", err);
    }
  }

  // 5. Direct content if it's an HTTP URL
  if (paper.content && (paper.content.startsWith("http://") || paper.content.startsWith("https://"))) {
    return paper.content;
  }

  // 6. Direct content if it's a blob: URL
  if (paper.content && paper.content.startsWith("blob:")) {
    return paper.content;
  }

  // 7. DOI arXiv fallback
  if (paper.doi?.includes("arXiv") || paper.doi?.includes("10.48550/arXiv.")) {
    const match = paper.doi.match(/\d{4}\.\d{4,5}/);
    if (match) return `https://arxiv.org/pdf/${match[0]}.pdf`;
  }

  return null;
}
