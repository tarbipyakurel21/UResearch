"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  FilePlus,
  Maximize2,
  Minimize2,
  Moon,
  PanelLeft,
  PanelRight,
  Search,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";
import { useTheme } from "../theme-provider";
import type { Paper } from "@/types/paper";

interface ReaderHeaderProps {
  papers: Paper[];
  activePaper: Paper | null;
  onSelectPaper: (paper: Paper) => void;
  onOpenImport: () => void;
  onDeletePaper?: (paperId: string) => void;
  isLeftOpen: boolean;
  onToggleLeft: () => void;
  isRightOpen: boolean;
  onToggleRight: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onOpenCommandPalette?: () => void;
}

export function ReaderHeader({
  papers,
  activePaper,
  onSelectPaper,
  onOpenImport,
  onDeletePaper,
  isLeftOpen,
  onToggleLeft,
  isRightOpen,
  onToggleRight,
  isFullscreen,
  onToggleFullscreen,
  onOpenCommandPalette,
}: ReaderHeaderProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");

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
      {/* Left: Brand Monogram & Paper Selector Dropdown */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {/* Toggle Left Sidebar */}
        <button
          className={`button ghost ${isLeftOpen ? "primary" : ""}`}
          style={{ height: 28, width: 28, padding: 0, borderRadius: 4 }}
          onClick={onToggleLeft}
          title={isLeftOpen ? "Collapse navigation sidebar" : "Expand navigation sidebar"}
        >
          <PanelLeft size={14} />
        </button>

        <Link
          href="/overview"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            textDecoration: "none",
            color: "inherit",
            marginRight: 4,
          }}
          title="Back to Overview"
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              background: "var(--foreground)",
              color: "var(--background)",
              display: "grid",
              placeItems: "center",
              fontSize: 10,
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
            }}
          >
            UR
          </div>
        </Link>

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
                              if (confirm(`Delete "${paper.title}"?`)) {
                                onDeletePaper(paper.id);
                              }
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
                    padding: "8px 10px",
                    borderTop: "1px solid var(--border)",
                    background: "var(--secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    {papers.length} paper{papers.length === 1 ? "" : "s"} stored
                  </span>
                  <button
                    className="button primary"
                    style={{ height: 24, padding: "0 8px", fontSize: 11 }}
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenImport();
                    }}
                  >
                    <FilePlus size={12} /> Add Paper
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick import button */}
        <button
          className="button ghost"
          style={{ height: 28, padding: "0 8px", fontSize: 11, gap: 4 }}
          onClick={onOpenImport}
          title="Import PDF, Markdown, or arXiv paper"
        >
          <FilePlus size={13} />
          <span>Import</span>
        </button>
      </div>

      {/* Center: Clean Paper Title & Venue */}
      {activePaper && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
            maxWidth: "40%",
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

      {/* Right Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* Global Search Button */}
        {onOpenCommandPalette && (
          <button
            className="button ghost"
            style={{ height: 28, padding: "0 8px", fontSize: 11, gap: 5 }}
            onClick={onOpenCommandPalette}
            title="Search papers & commands (⌘K)"
          >
            <Search size={13} />
            <kbd
              style={{
                fontSize: 9,
                fontFamily: "var(--font-mono)",
                padding: "1px 4px",
                borderRadius: 3,
                background: "var(--secondary)",
                border: "1px solid var(--border)",
              }}
            >
              ⌘K
            </kbd>
          </button>
        )}

        {/* Toggle Theme */}
        <button
          className="button ghost"
          style={{ height: 28, width: 28, padding: 0, borderRadius: 4 }}
          onClick={toggleTheme}
          title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
        >
          {resolvedTheme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>

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

        {/* Toggle Right AI Assistant */}
        <button
          className={`button ghost ${isRightOpen ? "primary" : ""}`}
          style={{ height: 28, padding: "0 9px", fontSize: 11, gap: 5, borderRadius: 4 }}
          onClick={onToggleRight}
          title={isRightOpen ? "Collapse AI Assistant" : "Expand AI Assistant"}
        >
          <Sparkles size={13} style={{ color: isRightOpen ? "inherit" : "var(--scholar-accent)" }} />
          <span>AI Assistant</span>
          <PanelRight size={13} style={{ opacity: 0.7 }} />
        </button>
      </div>
    </header>
  );
}
