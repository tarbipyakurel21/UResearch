"use client";

import React, { useMemo, useState } from "react";
import { Check, FileText, Plus, Search, X } from "lucide-react";
import type { Paper, ResearchProject } from "@/types/paper";

interface AddPapersModalProps {
  open: boolean;
  project: ResearchProject | null;
  allPapers: Paper[];
  onClose: () => void;
  onAddPapers: (paperIds: string[]) => Promise<void>;
}

export function AddPapersModal({
  open,
  project,
  allPapers,
  onClose,
  onAddPapers,
}: AddPapersModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Available papers that are NOT already in this project
  const availablePapers = useMemo(() => {
    if (!project) return [];
    return allPapers.filter(
      (p) =>
        !project.paperIds?.includes(p.id) &&
        (p as unknown as { project_id?: string }).project_id !== project.id
    );
  }, [project, allPapers]);

  // Filtered by search
  const filteredPapers = useMemo(() => {
    if (!searchQuery.trim()) return availablePapers;
    const q = searchQuery.toLowerCase();
    return availablePapers.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.authors?.some((a) => a.toLowerCase().includes(q))
    );
  }, [availablePapers, searchQuery]);

  if (!open || !project) return null;

  function togglePaper(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === filteredPapers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPapers.map((p) => p.id));
    }
  }

  async function handleConfirm() {
    if (selectedIds.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      await onAddPapers(selectedIds);
      setSelectedIds([]);
      setSearchQuery("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(3px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          boxShadow: "0 16px 36px rgba(0,0,0,0.22)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "85vh",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            background: "var(--card)",
          }}
        >
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              Add Papers to {project.name}
            </h3>
            <p
              style={{
                fontSize: 12,
                color: "var(--muted-foreground)",
                margin: "4px 0 0",
              }}
            >
              Select existing papers from your library to file into this collection.
            </p>
          </div>
          <button
            className="button ghost"
            style={{ height: 26, width: 26, padding: 0, borderRadius: 4 }}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Search & Select All Toolbar */}
        <div
          style={{
            padding: "10px 18px",
            borderBottom: "1px solid var(--border)",
            background: "var(--secondary)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={13}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted-foreground)",
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ height: 32, paddingLeft: 30, fontSize: 12.5 }}
              autoFocus
            />
          </div>

          {filteredPapers.length > 0 && (
            <button
              type="button"
              className="button ghost"
              style={{ height: 30, fontSize: 12, padding: "0 10px", flexShrink: 0 }}
              onClick={toggleSelectAll}
            >
              {selectedIds.length === filteredPapers.length ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>

        {/* Papers List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {availablePapers.length === 0 ? (
            <div
              style={{
                padding: "36px 16px",
                textAlign: "center",
                color: "var(--muted-foreground)",
                fontSize: 13,
              }}
            >
              All papers in your library are already in this collection!
            </div>
          ) : filteredPapers.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "var(--muted-foreground)",
                fontSize: 13,
              }}
            >
              No papers match &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            filteredPapers.map((paper) => {
              const isSelected = selectedIds.includes(paper.id);
              const authorStr = paper.authors?.length
                ? paper.authors.join(", ")
                : "Unknown author";

              return (
                <div
                  key={paper.id}
                  onClick={() => togglePaper(paper.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    background: isSelected ? "var(--secondary)" : "transparent",
                    border: "1px solid",
                    borderColor: isSelected ? "var(--border-strong)" : "transparent",
                    transition: "all 0.1s ease",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => togglePaper(paper.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ cursor: "pointer", width: 15, height: 15 }}
                  />
                  <FileText
                    size={15}
                    style={{
                      color: isSelected ? "var(--scholar-accent)" : "var(--muted-foreground)",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--foreground)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {paper.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "var(--muted-foreground)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {authorStr}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 18px",
            borderTop: "1px solid var(--border)",
            background: "var(--card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            {selectedIds.length} {selectedIds.length === 1 ? "paper" : "papers"} selected
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="button ghost"
              style={{ height: 32, fontSize: 12.5 }}
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button primary"
              style={{ height: 32, fontSize: 12.5, padding: "0 14px", gap: 5 }}
              onClick={() => void handleConfirm()}
              disabled={selectedIds.length === 0 || submitting}
            >
              <Plus size={13} />
              <span>Add to Collection</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
