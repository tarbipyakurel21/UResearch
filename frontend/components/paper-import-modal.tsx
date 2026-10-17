"use client";

import React, { useRef, useState } from "react";
import { BookOpen, Check, FileUp, Loader2, Upload, X } from "lucide-react";
import { generateId } from "@/lib/utils/ids";
import { extractPdfMetadata } from "@/lib/utils/pdf-metadata";
import { savePaper } from "@/lib/persistence/papers";
import { savePdfBlob, setPdfBlobUrl } from "@/lib/persistence/pdf-blobs";

import { useUploadThing } from "@/lib/uploadthing";
import { parseZoteroExport } from "@/lib/zotero/import";
import type { Paper } from "@/types/paper";

interface PaperImportModalProps {
  open: boolean;
  onClose: () => void;
  onPaperImported?: (paper: Paper) => void;
}

export function PaperImportModal({ open, onClose, onPaperImported }: PaperImportModalProps) {
  const [tab, setTab] = useState<"upload" | "zotero">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const zoteroInputRef = useRef<HTMLInputElement>(null);
  const { startUpload, isUploading } = useUploadThing("paperPdf");

  if (!open) return null;

  async function handleFileUpload(file?: File) {
    if (!file) return;
    setError("");
    setLoading(true);
    try {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) throw new Error("Please select a PDF file.");

      const extracted = await extractPdfMetadata(file);
      const paperId = generateId();
      const localBlobUrl = typeof window !== "undefined" ? URL.createObjectURL(file) : "";
      await savePdfBlob(paperId, file);
      if (localBlobUrl) {
        setPdfBlobUrl(paperId, localBlobUrl);
      }

      let remoteUrl = "";
      try {
        const uploaded = await startUpload([file]);
        if (uploaded?.[0]?.ufsUrl) {
          remoteUrl = uploaded[0].ufsUrl;
          try {
            await fetch("/api/papers", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                key: uploaded[0].key,
                url: uploaded[0].ufsUrl,
                filename: `${extracted.title}.pdf`,
                content_type: uploaded[0].type,
                size: uploaded[0].size,
              }),
            });
          } catch {
            // ignore backend sync failure
          }
        }
      } catch {
        // Fallback to local offline reading
      }

      const finalUrl = remoteUrl || localBlobUrl;

      const paper: Paper = {
        id: paperId,
        title: extracted.title,
        authors: extracted.authors,
        doi: extracted.doi,
        kind: "pdf",
        content: finalUrl,
        source_url: remoteUrl || undefined,
        file_url: finalUrl,
        reading_status: "unread",
        progress: 0,
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await savePaper(paper);
      setSuccess(`Imported "${paper.title}"`);
      onPaperImported?.(paper);
      setTimeout(() => {
        onClose();
        setSuccess("");
      }, 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import paper.");
    } finally {
      setLoading(false);
    }
  }

  async function handleZoteroImport(file?: File) {
    if (!file) return;
    setError("");
    setLoading(true);
    try {
      const content = await file.text();
      const items = parseZoteroExport(content);
      if (!items.length) {
        throw new Error("No readable items found in this Zotero JSON export.");
      }

      let count = 0;
      for (const item of items) {
        const paper: Paper = {
          id: generateId(),
          title: item.title,
          authors: item.authors,
          year: item.year,
          venue: item.publication,
          doi: item.doi,
          source_url: item.url,
          kind: "text",
          abstract: item.abstract,
          tags: item.tags.length ? item.tags : ["Zotero"],
          reading_status: "unread",
          progress: 0,
          content: `# ${item.title}\n\n${item.authors.join(", ")} (${item.year ?? "n.d."})\n\n## Abstract\n${item.abstract ?? "No abstract provided in Zotero export."}\n\n## Notes\nImported from Zotero collection.`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await savePaper(paper);
        count++;
        if (count === 1) onPaperImported?.(paper);
      }

      setSuccess(`Imported ${count} papers from Zotero library!`);
      setTimeout(() => {
        onClose();
        setSuccess("");
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Zotero import failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BookOpen size={18} style={{ color: "var(--accent)" }} />
            <div>
              <h2 style={{ fontSize: 16 }}>Import Research Paper</h2>
              <span className="hint">Store locally in your private workspace</span>
            </div>
          </div>
          <button className="button ghost" onClick={onClose} style={{ padding: 4, minHeight: "auto" }}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs: Strictly PDF / File and Zotero Export */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 18px", gap: 8 }}>
          <button
            onClick={() => setTab("upload")}
            style={{
              padding: "10px 14px",
              border: 0,
              background: "transparent",
              color: tab === "upload" ? "var(--accent)" : "var(--muted-foreground)",
              borderBottom: tab === "upload" ? "2px solid var(--accent)" : "2px solid transparent",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Import PDF / File
          </button>
          <button
            onClick={() => setTab("zotero")}
            style={{
              padding: "10px 14px",
              border: 0,
              background: "transparent",
              color: tab === "zotero" ? "var(--accent)" : "var(--muted-foreground)",
              borderBottom: tab === "zotero" ? "2px solid var(--accent)" : "2px solid transparent",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Zotero Export
          </button>
        </div>

        <div className="panel-body">
          {error && (
            <div
              className="notice"
              style={{
                marginBottom: 16,
                borderColor: "var(--danger)",
                background: "rgba(239, 68, 68, 0.1)",
                color: "var(--danger)",
              }}
            >
              {error}
            </div>
          )}
          {success && (
            <div
              className="notice"
              style={{
                marginBottom: 16,
                borderColor: "var(--success)",
                background: "rgba(16, 185, 129, 0.1)",
                color: "var(--success)",
              }}
            >
              <Check size={16} /> {success}
            </div>
          )}

          {tab === "upload" && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept="application/pdf,.pdf"
                onChange={(e) => void handleFileUpload(e.target.files?.[0])}
              />
              <div
                className={`dropzone ${isDragging ? "drag" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  void handleFileUpload(e.dataTransfer.files?.[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed var(--border)",
                  borderRadius: 8,
                  padding: "36px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: isDragging ? "var(--secondary)" : "transparent",
                }}
              >
                {loading || isUploading ? (
                  <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto 10px", color: "var(--accent)" }} />
                ) : (
                  <Upload size={32} style={{ margin: "0 auto 10px", color: "var(--muted-foreground)" }} />
                )}
                <div style={{ fontWeight: 650, fontSize: 14, marginBottom: 4 }}>
                  Click to select or drag & drop PDF
                </div>
                <div className="hint" style={{ fontSize: 12 }}>
                  PDF format (max 32 MB)
                </div>
              </div>
            </div>
          )}

          {tab === "zotero" && (
            <div>
              <input
                ref={zoteroInputRef}
                type="file"
                hidden
                accept=".json"
                onChange={(e) => void handleZoteroImport(e.target.files?.[0])}
              />
              <p className="hint" style={{ marginTop: 0, marginBottom: 14, fontSize: 12.5, lineHeight: 1.5 }}>
                Export your Zotero library as <strong>Zotero JSON</strong> or <strong>CSL JSON</strong> and import it here.
              </p>
              <button
                className="button primary"
                onClick={() => zoteroInputRef.current?.click()}
                disabled={loading}
                style={{ height: 34, fontSize: 12.5 }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
                Select Zotero JSON File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
