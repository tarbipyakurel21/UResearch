"use client";

import React, { useState } from "react";
import {
  BookOpen,
  ChevronRight,
  ExternalLink,
  FileText,
  Highlighter,
  Image as ImageIcon,
  Layers,
  Link as LinkIcon,
  Quote,
  Table as TableIcon,
  Trash2,
  X,
} from "lucide-react";
import type { Paper, PaperAnnotation } from "@/types/paper";
import type {
  CitationTarget,
  DocumentCitation,
  DocumentFigure,
  DocumentSection,
} from "./types";

interface NavigationSidebarProps {
  paper: Paper | null;
  sections: DocumentSection[];
  figures: DocumentFigure[];
  citations: DocumentCitation[];
  annotations: PaperAnnotation[];
  activePage: number;
  onNavigateTo: (target: CitationTarget) => void;
  onDeleteAnnotation?: (annotationId: string) => void;
  onClose?: () => void;
  width: number;
}

export function NavigationSidebar({
  paper,
  sections,
  figures,
  citations,
  annotations,
  activePage,
  onNavigateTo,
  onDeleteAnnotation,
  onClose,
  width,
}: NavigationSidebarProps) {
  const [activeTab, setActiveTab] = useState<
    "outline" | "notes" | "figures" | "citations" | "overview"
  >("outline");

  if (!paper) return null;

  return (
    <aside
      style={{
        width,
        minWidth: width,
        maxWidth: width,
        height: "100%",
        background: "var(--card)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Sidebar Header with Tabs */}
      <div
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--card)",
          padding: "6px 8px 0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--muted-foreground)",
            }}
          >
            Navigation
          </span>
          {onClose && (
            <button
              className="button ghost"
              style={{ height: 20, width: 20, padding: 0 }}
              onClick={onClose}
              title="Collapse sidebar"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "flex",
            gap: 2,
            borderBottom: "1px solid var(--border)",
            overflowX: "auto",
          }}
        >
          {[
            { id: "outline", label: "Outline", count: sections.length },
            { id: "notes", label: "Notes", count: annotations.length },
            { id: "figures", label: "Figures", count: figures.length },
            { id: "citations", label: "Cites", count: citations.length },
            { id: "overview", label: "Info" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                style={{
                  background: "transparent",
                  border: 0,
                  borderBottom: isActive
                    ? "2px solid var(--scholar-accent)"
                    : "2px solid transparent",
                  padding: "5px 7px",
                  fontSize: 11,
                  fontWeight: isActive ? 650 : 500,
                  color: isActive ? "var(--scholar-accent)" : "var(--muted-foreground)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginBottom: -1,
                }}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    style={{
                      fontSize: 9.5,
                      padding: "0 4px",
                      borderRadius: 999,
                      background: isActive
                        ? "var(--scholar-accent-soft)"
                        : "var(--secondary)",
                      color: isActive
                        ? "var(--scholar-accent)"
                        : "var(--muted-foreground)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
        {/* 1. Outline & Section Headings */}
        {activeTab === "outline" && (
          <div style={{ display: "grid", gap: 1 }}>
            {sections.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  textAlign: "center",
                  fontSize: 11,
                  color: "var(--muted-foreground)",
                }}
              >
                No document outline headers found.
              </div>
            ) : (
              sections.map((sec) => {
                const isCurrentPage = activePage === sec.pageNumber;
                return (
                  <button
                    key={sec.id}
                    onClick={() =>
                      onNavigateTo({
                        pageNumber: sec.pageNumber,
                        sectionId: sec.id,
                      })
                    }
                    style={{
                      textAlign: "left",
                      background: isCurrentPage ? "var(--scholar-accent-soft)" : "transparent",
                      border: 0,
                      borderRadius: 4,
                      padding: `5px 8px 5px ${sec.level === 3 ? 20 : sec.level === 2 ? 12 : 8}px`,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 6,
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrentPage) e.currentTarget.style.background = "var(--secondary)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrentPage) e.currentTarget.style.background = "transparent";
                    }}
                    title={sec.title}
                  >
                    <span
                      style={{
                        fontSize: sec.level === 1 ? 11.5 : 11,
                        fontWeight: sec.level === 1 ? 650 : sec.level === 2 ? 550 : 450,
                        color: isCurrentPage ? "var(--scholar-accent)" : "var(--foreground)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {sec.title}
                    </span>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontFamily: "var(--font-mono)",
                        color: "var(--muted-foreground)",
                        flexShrink: 0,
                      }}
                    >
                      p.{sec.pageNumber}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* 2. Notes & Highlights */}
        {activeTab === "notes" && (
          <div style={{ display: "grid", gap: 8 }}>
            {annotations.length === 0 ? (
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  fontSize: 11,
                  color: "var(--muted-foreground)",
                }}
              >
                <Highlighter size={20} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                No annotations yet. Select text in the paper to highlight or add margin notes.
              </div>
            ) : (
              annotations.map((anno) => {
                const colorClass = `hl-${anno.color || "yellow"}`;
                return (
                  <div
                    key={anno.id}
                    onClick={() =>
                      onNavigateTo({
                        pageNumber: anno.page ?? 1,
                        quote: anno.text,
                      })
                    }
                    style={{
                      padding: "8px 10px",
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 5,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--scholar-accent)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 10,
                        color: "var(--muted-foreground)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span
                          className={colorClass}
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            display: "inline-block",
                          }}
                        />
                        <span style={{ fontWeight: 600 }}>
                          {anno.section || `Page ${anno.page ?? 1}`}
                        </span>
                      </div>
                      {onDeleteAnnotation && (
                        <button
                          className="button ghost danger"
                          style={{ height: 18, width: 18, padding: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteAnnotation(anno.id);
                          }}
                          title="Delete highlight"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: 11.5,
                        lineHeight: 1.45,
                        color: "var(--foreground)",
                        fontStyle: "italic",
                        borderLeft: "2px solid var(--border)",
                        paddingLeft: 6,
                      }}
                    >
                      &ldquo;{anno.text}&rdquo;
                    </div>

                    {anno.comment && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--foreground)",
                          background: "var(--secondary)",
                          padding: "4px 6px",
                          borderRadius: 3,
                          marginTop: 2,
                        }}
                      >
                        {anno.comment}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 3. Figures & Tables */}
        {activeTab === "figures" && (
          <div style={{ display: "grid", gap: 6 }}>
            {figures.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  textAlign: "center",
                  fontSize: 11,
                  color: "var(--muted-foreground)",
                }}
              >
                No figures or tables detected in paper.
              </div>
            ) : (
              figures.map((fig) => (
                <button
                  key={fig.id}
                  onClick={() =>
                    onNavigateTo({
                      pageNumber: fig.pageNumber,
                      figureId: fig.id,
                    })
                  }
                  style={{
                    textAlign: "left",
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    padding: "7px 9px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--scholar-accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 11,
                      fontWeight: 650,
                      color: "var(--scholar-accent)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {fig.type === "figure" ? <ImageIcon size={12} /> : <TableIcon size={12} />}
                      <span>{fig.label}</span>
                    </div>
                    <span style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>
                      p.{fig.pageNumber}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      lineHeight: 1.35,
                      color: "var(--muted-foreground)",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {fig.caption}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* 4. Citations & References */}
        {activeTab === "citations" && (
          <div style={{ display: "grid", gap: 6 }}>
            {citations.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  textAlign: "center",
                  fontSize: 11,
                  color: "var(--muted-foreground)",
                }}
              >
                No citations indexed.
              </div>
            ) : (
              citations.map((cite) => (
                <div
                  key={cite.id}
                  style={{
                    padding: "6px 8px",
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    fontSize: 10.5,
                    lineHeight: 1.4,
                  }}
                >
                  <div style={{ fontWeight: 650, color: "var(--scholar-accent)", marginBottom: 2 }}>
                    {cite.label} {cite.year ? `(${cite.year})` : ""}
                  </div>
                  <div style={{ color: "var(--foreground)" }}>{cite.text}</div>
                  {cite.doi && (
                    <a
                      href={`https://doi.org/${cite.doi}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        fontSize: 9.5,
                        fontFamily: "var(--font-mono)",
                        color: "var(--scholar-accent)",
                        marginTop: 4,
                        textDecoration: "none",
                      }}
                    >
                      <LinkIcon size={9} /> doi:{cite.doi}
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* 5. Paper Overview / Metadata */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gap: 10, fontSize: 11.5, padding: "4px" }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                Title
              </span>
              <div style={{ fontWeight: 650, marginTop: 2, lineHeight: 1.35 }}>
                {paper.title}
              </div>
            </div>

            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                Authors
              </span>
              <div style={{ color: "var(--foreground)", marginTop: 2 }}>
                {paper.authors?.join(", ") || "Unknown authors"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              {paper.year && (
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                    Year
                  </span>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{paper.year}</div>
                </div>
              )}
              {paper.venue && (
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                    Venue
                  </span>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{paper.venue}</div>
                </div>
              )}
            </div>

            {paper.abstract && (
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                  Abstract
                </span>
                <p
                  style={{
                    fontSize: 11,
                    lineHeight: 1.55,
                    color: "var(--foreground)",
                    marginTop: 3,
                    fontFamily: "Georgia, serif",
                    background: "var(--secondary)",
                    padding: 8,
                    borderRadius: 4,
                  }}
                >
                  {paper.abstract}
                </p>
              </div>
            )}

            {paper.doi && (
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                  Digital Object Identifier
                </span>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted-foreground)", marginTop: 2, wordBreak: "break-all" }}>
                  {paper.doi}
                </div>
              </div>
            )}

            {paper.tags && paper.tags.length > 0 && (
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                  Tags
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                  {paper.tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: 9.5,
                        padding: "2px 6px",
                        borderRadius: 3,
                        background: "var(--secondary)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
