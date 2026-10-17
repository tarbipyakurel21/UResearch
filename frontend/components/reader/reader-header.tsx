"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Maximize2,
  Minimize2,
  Trash2,
} from "lucide-react";
import type { Paper } from "@/types/paper";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";

interface ReaderHeaderProps {
  papers: Paper[];
  activePaper: Paper | null;
  onSelectPaper: (paper: Paper) => void;
  onDeletePaper?: (paperId: string) => void;
  onBackToLibrary?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function ReaderHeader({
  papers,
  activePaper,
  onSelectPaper,
  onDeletePaper,
  onBackToLibrary,
  isFullscreen,
  onToggleFullscreen,
}: ReaderHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [paperToDelete, setPaperToDelete] = useState<Paper | null>(null);

  const filteredPapers = papers.filter((p) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.authors.some((a) => a.toLowerCase().includes(q))
    );
  });

  return (
    <header
      style={{
        height: 44,
        background: "var(--card)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        gap: 12,
        position: "relative",
        zIndex: 50,
      }}
    >
      {/* Left: Brand Logo & Paper Selector Dropdown */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {/* Logo and Brand Link */}
        <Link
          href="/library"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            textDecoration: "none",
            color: "inherit",
            marginRight: 4,
          }}
          title="UResearch Home"
        >
          <img
            src="/uresearch-logo.png"
            alt="UResearch"
            style={{ width: 22, height: 22, borderRadius: 5, objectFit: "cover" }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em" }}>UResearch</span>
        </Link>

        {/* Back to Library Button */}
        {onBackToLibrary ? (
          <button
            onClick={onBackToLibrary}
            className="button ghost"
            style={{ height: 28, padding: "0 8px", fontSize: 12, gap: 5, borderRadius: 4 }}
            title="Back to Research Library"
          >
            <ArrowLeft size={13} />
            <span style={{ fontWeight: 600 }}>Library</span>
          </button>
        ) : (
          <Link
            href="/library"
            className="button ghost"
            style={{ height: 28, padding: "0 8px", fontSize: 12, gap: 5, borderRadius: 4 }}
            title="Back to Research Library"
          >
            <ArrowLeft size={13} />
            <span style={{ fontWeight: 600 }}>Library</span>
          </Link>
        )}

        {/* Custom Paper Dropdown Popover */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 28,
              padding: "0 10px",
              background: "var(--secondary)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              maxWidth: 380,
              textAlign: "left",
              color: "var(--foreground)",
            }}
            title={activePaper ? `${activePaper.title}` : "Select paper"}
          >
            <BookOpen size={13} style={{ color: "var(--scholar-accent)", flexShrink: 0 }} />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {activePaper ? activePaper.title : "Select a research paper..."}
            </span>
            <ChevronDown size={13} style={{ opacity: 0.6, flexShrink: 0 }} />
          </button>

          {/* Dropdown Menu Modal */}
          {dropdownOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 60 }}
                onClick={() => setDropdownOpen(false)}
              />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 34,
                  width: 360,
                  maxHeight: 400,
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
                  zIndex: 70,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
                  <input
                    className="input"
                    placeholder="Filter papers in library..."
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    autoFocus
                    style={{ height: 28, fontSize: 11, padding: "0 8px" }}
                  />
                </div>

                <div style={{ overflowY: "auto", flex: 1, padding: "4px 0" }}>
                  {filteredPapers.map((paper) => {
                    const isSelected = activePaper?.id === paper.id;
                    return (
                      <div
                        key={paper.id}
                        onClick={() => {
                          onSelectPaper(paper);
                          setDropdownOpen(false);
                        }}
                        style={{
                          padding: "8px 12px",
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 8,
                          cursor: "pointer",
                          background: isSelected ? "var(--scholar-accent-soft)" : "transparent",
                          borderLeft: isSelected ? "3px solid var(--scholar-accent)" : "3px solid transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = "var(--secondary)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 650,
                              lineHeight: 1.35,
                              color: isSelected ? "var(--scholar-accent)" : "var(--foreground)",
                            }}
                          >
                            {paper.title}
                          </div>
                          <div
                            style={{
                              fontSize: 10.5,
                              color: "var(--muted-foreground)",
                              marginTop: 2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {paper.authors?.join(", ") || "Unknown authors"}{" "}
                            {paper.year ? `(${paper.year})` : ""}
                          </div>
                        </div>

                        {onDeletePaper && (
                          <button
                            className="button ghost danger"
                            style={{ padding: 4, height: 22, width: 22, flexShrink: 0 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaperToDelete(paper);
                            }}
                            title="Delete paper"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    padding: "8px 12px",
                    borderTop: "1px solid var(--border)",
                    background: "var(--secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    {papers.length} {papers.length === 1 ? "paper" : "papers"} in library
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Clean Paper Selector Popover only */}
      </div>

      {/* Center: Clean Paper Title & Venue */}
      {activePaper && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
            maxWidth: "50%",
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--foreground)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={activePaper.title}
          >
            {activePaper.title}
          </span>
          {activePaper.year && (
            <span
              style={{
                fontSize: 10,
                padding: "1px 5px",
                borderRadius: 3,
                background: "var(--secondary)",
                color: "var(--muted-foreground)",
                fontFamily: "var(--font-mono)",
                flexShrink: 0,
              }}
            >
              {activePaper.year}
            </span>
          )}
          {activePaper.venue && (
            <span
              style={{
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 3,
                background: "var(--scholar-accent-soft)",
                color: "var(--scholar-accent)",
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {activePaper.venue}
            </span>
          )}
        </div>
      )}

      {/* Right Controls: Minimal & Clean */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* Fullscreen toggle */}
        {onToggleFullscreen && (
          <button
            className={`button ghost ${isFullscreen ? "primary" : ""}`}
            style={{ height: 28, width: 28, padding: 0, borderRadius: 4 }}
            onClick={onToggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Reading Mode"}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        )}
      </div>

      <DeleteConfirmModal
        open={Boolean(paperToDelete)}
        title="Delete Paper"
        itemName={paperToDelete?.title}
        onConfirm={() => {
          if (paperToDelete && onDeletePaper) {
            onDeletePaper(paperToDelete.id);
            setPaperToDelete(null);
          }
        }}
        onCancel={() => setPaperToDelete(null)}
      />
    </header>
  );
}
