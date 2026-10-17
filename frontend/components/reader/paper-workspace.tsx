"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Highlighter,
  Loader2,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
  Sparkles,
  StickyNote,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { resolvePdfUrl } from "@/lib/persistence/pdf-blobs";
import type { HighlightColor, Paper, PaperAnnotation } from "@/types/paper";
import type {
  CitationTarget,
  DocumentFigure,
  DocumentSection,
} from "./types";

interface PaperWorkspaceProps {
  paper: Paper | null;
  annotations: PaperAnnotation[];
  onAddAnnotation: (annotation: Omit<PaperAnnotation, "id" | "created_at">) => void;
  onAskAi: (prompt: string) => void;
  targetAnchor: CitationTarget | null;
  onClearTargetAnchor: () => void;
  activePage: number;
  setActivePage: (page: number) => void;
  sections: DocumentSection[];
  figures: DocumentFigure[];
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface ParsedPage {
  pageNumber: number;
  sections: Array<{
    id: string;
    level: number;
    title: string;
    paragraphs: string[];
    figures?: DocumentFigure[];
  }>;
}

export function PaperWorkspace({
  paper,
  annotations,
  onAddAnnotation,
  onAskAi,
  targetAnchor,
  onClearTargetAnchor,
  activePage,
  setActivePage,
  sections,
  figures,
  isFullscreen,
  onToggleFullscreen,
}: PaperWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [fitWidth, setFitWidth] = useState<boolean>(false);

  // Search in document
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);

  // Selection popup state
  const [selectedText, setSelectedText] = useState("");
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number } | null>(null);
  const [notePopupOpen, setNotePopupOpen] = useState(false);
  const [noteComment, setNoteComment] = useState("");
  const [activeHighlightColor, setActiveHighlightColor] = useState<HighlightColor>("yellow");

  // Robust PDF URL resolution (supporting Blobs from IndexedDB, http URLs, and base64)
  const [resolvedPdfUrl, setResolvedPdfUrl] = useState<string | null>(null);
  const [resolvingPdf, setResolvingPdf] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    setResolvingPdf(true);

    async function load() {
      if (!paper) {
        setResolvedPdfUrl(null);
        setResolvingPdf(false);
        return;
      }
      try {
        const url = await resolvePdfUrl(paper);
        if (!cancelled) {
          setResolvedPdfUrl(url);
        }
      } catch (err) {
        console.error("Failed to resolve PDF url:", err);
      } finally {
        if (!cancelled) setResolvingPdf(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [paper?.id, paper?.content, paper?.file_url, paper?.source_url]);

  const [isPdfMode, setIsPdfMode] = useState<boolean>(true);

  useEffect(() => {
    if (resolvedPdfUrl || paper?.kind === "pdf") {
      setIsPdfMode(true);
    } else {
      setIsPdfMode(false);
    }
  }, [paper?.kind, resolvedPdfUrl]);

  // Parse markdown paper into paginated academic sheets
  const pages: ParsedPage[] = useMemo(() => {
    if (!paper || resolvedPdfUrl) return [];

    const textContent = paper.content || "";
    if (!textContent || textContent.startsWith("http://") || textContent.startsWith("https://")) {
      return [];
    }

    const blocks = textContent.split(/\n\n+/);

    const parsedSections: Array<{
      id: string;
      level: number;
      title: string;
      paragraphs: string[];
      figures?: DocumentFigure[];
    }> = [];

    let currentSection: (typeof parsedSections)[0] | null = null;

    blocks.forEach((block) => {
      if (block.startsWith("# ")) {
        // Document title - skip as section
        return;
      } else if (block.startsWith("## ")) {
        const title = block.replace(/^##\s+/, "");
        const id = "sec-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const matchedFigs = figures.filter((f) =>
          f.caption.toLowerCase().includes(title.toLowerCase().slice(0, 10))
        );
        currentSection = { id, level: 2, title, paragraphs: [], figures: matchedFigs };
        parsedSections.push(currentSection);
      } else if (block.startsWith("### ")) {
        const title = block.replace(/^###\s+/, "");
        const id = "sec-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        currentSection = { id, level: 3, title, paragraphs: [] };
        parsedSections.push(currentSection);
      } else {
        if (!currentSection) {
          currentSection = { id: "sec-preamble", level: 2, title: "Preamble", paragraphs: [] };
          parsedSections.push(currentSection);
        }
        currentSection.paragraphs.push(block);
      }
    });

    // Distribute into 4-5 balanced visual pages
    const resultPages: ParsedPage[] = [];
    const sectionsPerPage = Math.max(1, Math.ceil(parsedSections.length / 4));

    for (let i = 0; i < parsedSections.length; i += sectionsPerPage) {
      resultPages.push({
        pageNumber: resultPages.length + 1,
        sections: parsedSections.slice(i, i + sectionsPerPage),
      });
    }

    if (resultPages.length === 0) {
      resultPages.push({
        pageNumber: 1,
        sections: [
          {
            id: "sec-content",
            level: 2,
            title: "Content",
            paragraphs: [paper.content],
          },
        ],
      });
    }

    return resultPages;
  }, [paper, figures]);

  const totalPages = paper?.kind === "pdf" ? 1 : Math.max(1, pages.length);

  // Scroll listener to update active page
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleScroll() {
      if (!el) return;
      const pageElements = Array.from(el.querySelectorAll<HTMLDivElement>("[data-page]"));
      const scrollTop = el.scrollTop + 120;

      for (const pEl of pageElements) {
        const pNum = Number(pEl.getAttribute("data-page"));
        if (pEl.offsetTop <= scrollTop && pEl.offsetTop + pEl.offsetHeight > scrollTop) {
          setActivePage(pNum);
          break;
        }
      }
    }

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [setActivePage]);

  // Navigate to target anchor
  useEffect(() => {
    if (!targetAnchor || !containerRef.current) return;

    let targetEl: HTMLElement | null = null;

    if (targetAnchor.figureId) {
      targetEl = containerRef.current.querySelector(`#${targetAnchor.figureId}`);
    } else if (targetAnchor.sectionId) {
      targetEl = containerRef.current.querySelector(`#${targetAnchor.sectionId}`);
    } else if (targetAnchor.pageNumber) {
      targetEl = containerRef.current.querySelector(`[data-page="${targetAnchor.pageNumber}"]`);
    } else if (targetAnchor.quote) {
      const walker = document.createTreeWalker(
        containerRef.current,
        NodeFilter.SHOW_TEXT,
        null
      );
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.textContent && node.textContent.includes(targetAnchor.quote.slice(0, 30))) {
          targetEl = node.parentElement;
          break;
        }
      }
    }

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      targetEl.classList.remove("flash-highlight");
      // Force repaint
      void targetEl.offsetWidth;
      targetEl.classList.add("flash-highlight");
      setTimeout(() => {
        targetEl?.classList.remove("flash-highlight");
        onClearTargetAnchor();
      }, 2600);
    }
  }, [targetAnchor, onClearTargetAnchor]);

  // Handle text selection in reader
  function handleMouseUp() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      if (!notePopupOpen) {
        setSelectionBox(null);
        setSelectedText("");
      }
      return;
    }

    const text = sel.toString().trim();
    if (text.length >= 3) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(text);
      setSelectionBox({
        x: Math.max(10, rect.left + rect.width / 2 - 130),
        y: Math.max(10, rect.top - 46),
      });
    }
  }

  // Create highlight
  function handleHighlight(color: HighlightColor = "yellow") {
    if (!selectedText || !paper) return;
    onAddAnnotation({
      paperId: paper.id,
      text: selectedText,
      color,
      page: activePage,
      section: `Page ${activePage}`,
    });
    setSelectionBox(null);
    setSelectedText("");
  }

  // Save note
  function handleSaveNote() {
    if (!selectedText || !paper) return;
    onAddAnnotation({
      paperId: paper.id,
      text: selectedText,
      comment: noteComment.trim(),
      color: activeHighlightColor,
      page: activePage,
      section: `Page ${activePage}`,
    });
    setNotePopupOpen(false);
    setNoteComment("");
    setSelectionBox(null);
    setSelectedText("");
  }

  // Scroll to specific page
  function scrollToPage(pageNum: number) {
    if (!containerRef.current) return;
    const target = containerRef.current.querySelector(`[data-page="${pageNum}"]`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setActivePage(pageNum);
    }
  }

  if (!paper) {
    return (
      <div
        style={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          color: "var(--muted-foreground)",
          fontSize: 13,
          background: "var(--bg-academic)",
        }}
      >
        No paper selected. Choose a paper from the top dropdown or import one.
      </div>
    );
  }

  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-academic)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Search Header Bar (if search active) */}
      {searchOpen && (
        <div
          style={{
            height: 36,
            background: "var(--card)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 14px",
            gap: 10,
            zIndex: 30,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, maxWidth: 360 }}>
            <Search size={13} style={{ color: "var(--muted-foreground)" }} />
            <input
              className="input"
              style={{ height: 26, fontSize: 11, padding: "0 8px" }}
              placeholder="Find in document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              {searchQuery.trim() ? "Showing occurrences in text" : "Type to search"}
            </span>
            <button
              className="button ghost"
              style={{ height: 22, width: 22, padding: 0 }}
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
              }}
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Contextual Toolbar on Text Selection */}
      {selectionBox && !notePopupOpen && (
        <div
          className="selection-floating-pill"
          style={{ left: selectionBox.x, top: selectionBox.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Highlight with Color Picker */}
          <button
            className="button ghost"
            style={{ height: 26, padding: "0 7px", fontSize: 11, gap: 4 }}
            onClick={() => handleHighlight("yellow")}
            title="Highlight selection"
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#eab308",
                display: "inline-block",
              }}
            />
            <span>Highlight</span>
          </button>

          {/* Add Note Button */}
          <button
            className="button ghost"
            style={{ height: 26, padding: "0 7px", fontSize: 11, gap: 4 }}
            onClick={() => setNotePopupOpen(true)}
            title="Add margin note"
          >
            <StickyNote size={12} />
            <span>Note</span>
          </button>

          {/* Copy passage */}
          <button
            className="button ghost"
            style={{ height: 26, padding: "0 8px", fontSize: 11, gap: 4 }}
            onClick={() => {
              void navigator.clipboard.writeText(`"${selectedText}" — ${paper.title}`);
              setSelectionBox(null);
            }}
            title="Copy text"
          >
            <Copy size={11} />
            <span>Copy</span>
          </button>
        </div>
      )}

      {/* Attached Note Input Card */}
      {notePopupOpen && selectionBox && (
        <div
          style={{
            position: "fixed",
            left: selectionBox.x,
            top: selectionBox.y + 36,
            zIndex: 110,
            width: 280,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: 10,
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            display: "grid",
            gap: 8,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 700 }}>Add Margin Note</span>
            {/* Color picker */}
            <div style={{ display: "flex", gap: 4 }}>
              {(["yellow", "green", "blue", "purple", "coral"] as HighlightColor[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveHighlightColor(c)}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: activeHighlightColor === c ? "2px solid var(--foreground)" : "1px solid var(--border)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  className={`hl-${c}`}
                />
              ))}
            </div>
          </div>

          <div
            style={{
              fontSize: 10.5,
              color: "var(--muted-foreground)",
              fontStyle: "italic",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            &ldquo;{selectedText}&rdquo;
          </div>

          <textarea
            className="textarea"
            placeholder="Type your reflection or insight..."
            value={noteComment}
            onChange={(e) => setNoteComment(e.target.value)}
            autoFocus
            rows={2}
            style={{ fontSize: 11.5, minHeight: 52, padding: "6px 8px" }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
            <button
              className="button ghost"
              style={{ height: 24, fontSize: 11, padding: "0 8px" }}
              onClick={() => {
                setNotePopupOpen(false);
                setSelectionBox(null);
              }}
            >
              Cancel
            </button>
            <button
              className="button primary"
              style={{ height: 24, fontSize: 11, padding: "0 8px" }}
              onClick={handleSaveNote}
            >
              Save Note
            </button>
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: isPdfMode && resolvedPdfUrl ? "hidden" : "auto",
          padding: isPdfMode && resolvedPdfUrl ? 0 : "32px 20px 80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          transformOrigin: "top center",
          height: "calc(100% - 38px)",
          width: "100%",
        }}
        onMouseUp={handleMouseUp}
      >
        {resolvingPdf ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              color: "var(--muted-foreground)",
            }}
          >
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--scholar-accent)" }} />
            <span style={{ fontSize: 13 }}>Loading PDF document...</span>
          </div>
        ) : resolvedPdfUrl ? (
          /* Direct Full-Bleed PDF Viewer */
          <div
            style={{
              width: "100%",
              height: "100%",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              background: "#18181b",
              position: "relative",
            }}
          >
            <iframe
              src={resolvedPdfUrl}
              style={{
                width: "100%",
                height: "100%",
                border: 0,
                flex: 1,
              }}
              title={paper?.title || "PDF Document"}
            />
          </div>
        ) : pages.length > 0 ? (
          /* Rendered Paginated Academic Sheets */
          pages.map((page) => (

            <div
              key={page.pageNumber}
              data-page={page.pageNumber}
              className="academic-page-sheet"
              style={{
                width: fitWidth ? "100%" : `${Math.round(780 * (zoomLevel / 100))}px`,
                maxWidth: "100%",
                padding: "48px 56px 64px",
                position: "relative",
              }}
            >
              {/* Page Running Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: "var(--muted-foreground)",
                  borderBottom: "1px solid var(--paper-line)",
                  paddingBottom: 10,
                  marginBottom: 32,
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 500,
                  }}
                >
                  {paper.title}
                </span>
                <span>Page {page.pageNumber}</span>
              </div>

              {/* Page 1 Title & Abstract block */}
              {page.pageNumber === 1 && (
                <div style={{ marginBottom: 36, textAlign: "center" }}>
                  <h1
                    style={{
                      fontSize: "2.1em",
                      fontWeight: 700,
                      lineHeight: 1.25,
                      letterSpacing: "-0.02em",
                      marginBottom: 12,
                      fontFamily: "Georgia, serif",
                    }}
                  >
                    {paper.title}
                  </h1>

                  <div
                    style={{
                      fontSize: "0.95em",
                      color: "var(--muted-foreground)",
                      marginBottom: 16,
                      lineHeight: 1.45,
                    }}
                  >
                    {paper.authors?.join(", ") || "Unknown authors"}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      marginBottom: 24,
                    }}
                  >
                    {paper.venue && (
                      <span className="badge primary" style={{ fontSize: 10 }}>
                        {paper.venue}
                      </span>
                    )}
                    {paper.year && (
                      <span className="badge" style={{ fontSize: 10 }}>
                        {paper.year}
                      </span>
                    )}
                    {paper.doi && (
                      <span className="badge" style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}>
                        doi:{paper.doi}
                      </span>
                    )}
                  </div>

                  {paper.abstract && (
                    <div
                      id="sec-abstract"
                      style={{
                        textAlign: "left",
                        background: "var(--bg-academic)",
                        border: "1px solid var(--paper-border)",
                        borderRadius: 4,
                        padding: "16px 20px",
                        margin: "0 auto",
                        maxWidth: 680,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: 6,
                          color: "var(--scholar-accent)",
                        }}
                      >
                        Abstract
                      </div>
                      <p
                        style={{
                          fontSize: "0.92em",
                          lineHeight: 1.65,
                          margin: 0,
                          color: "var(--paper-text)",
                        }}
                      >
                        {paper.abstract}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Sections for this Page */}
              <article style={{ display: "grid", gap: 20 }}>
                {page.sections.map((sec) => (
                  <section key={sec.id} id={sec.id} style={{ scrollMarginTop: 80 }}>
                    {sec.level === 2 && (
                      <h2
                        style={{
                          fontSize: "1.35em",
                          fontWeight: 700,
                          margin: "1.6em 0 0.5em",
                          paddingBottom: 4,
                          borderBottom: "1px solid var(--paper-line)",
                          color: "var(--paper-text)",
                          fontFamily: "Georgia, serif",
                        }}
                      >
                        {sec.title}
                      </h2>
                    )}
                    {sec.level === 3 && (
                      <h3
                        style={{
                          fontSize: "1.12em",
                          fontWeight: 650,
                          margin: "1.2em 0 0.4em",
                          color: "var(--paper-text)",
                          fontFamily: "Georgia, serif",
                        }}
                      >
                        {sec.title}
                      </h3>
                    )}

                    {sec.paragraphs.map((pText, pIdx) => {
                      // Check if any annotations match this paragraph
                      const matchedAnno = annotations.find(
                        (a) => a.text && pText.includes(a.text)
                      );

                      if (matchedAnno) {
                        const parts = pText.split(matchedAnno.text);
                        return (
                          <p
                            key={pIdx}
                            style={{
                              fontSize: "1.02em",
                              lineHeight: 1.75,
                              margin: "0.8em 0",
                              textAlign: "justify",
                            }}
                          >
                            {parts[0]}
                            <mark
                              className={`hl-${matchedAnno.color || "yellow"}`}
                              title={matchedAnno.comment || "Saved highlight"}
                              style={{
                                cursor: "pointer",
                                padding: "1px 2px",
                                borderRadius: 2,
                              }}
                            >
                              {matchedAnno.text}
                            </mark>
                            {parts[1]}
                          </p>
                        );
                      }

                      return (
                        <p
                          key={pIdx}
                          style={{
                            fontSize: "1.02em",
                            lineHeight: 1.75,
                            margin: "0.8em 0",
                            textAlign: "justify",
                          }}
                        >
                          {pText}
                        </p>
                      );
                    })}

                    {/* Figures embedded in section */}
                    {sec.figures &&
                      sec.figures.map((fig) => (
                        <figure
                          key={fig.id}
                          id={fig.id}
                          style={{
                            margin: "24px 0",
                            padding: "16px 20px",
                            background: "var(--bg-academic)",
                            border: "1px solid var(--paper-border)",
                            borderRadius: 4,
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              height: 120,
                              background: "var(--paper-bg)",
                              border: "1px dashed var(--paper-border)",
                              borderRadius: 4,
                              display: "grid",
                              placeItems: "center",
                              color: "var(--muted-foreground)",
                              fontSize: 12,
                              marginBottom: 10,
                            }}
                          >
                            [{fig.label} Diagrammatic Schema]
                          </div>
                          <figcaption
                            style={{
                              fontSize: "0.86em",
                              lineHeight: 1.5,
                              color: "var(--muted-foreground)",
                              textAlign: "left",
                            }}
                          >
                            <strong style={{ color: "var(--paper-text)", marginRight: 6 }}>
                              {fig.label}:
                            </strong>
                            {fig.caption}
                          </figcaption>
                        </figure>
                      ))}
                  </section>
                ))}
              </article>

              {/* Page Running Footer */}
              <div
                style={{
                  marginTop: 48,
                  paddingTop: 12,
                  borderTop: "1px solid var(--paper-line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  color: "var(--muted-foreground)",
                }}
              >
                <span>UResearch Academic Reader</span>
                <span>— {page.pageNumber} —</span>
              </div>
            </div>
          ))
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
              color: "var(--muted-foreground)",
              gap: 12,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 650, color: "var(--foreground)", margin: 0 }}>
              {paper.title}
            </h3>
            <p style={{ fontSize: 13, margin: 0, maxWidth: 440, textAlign: "center" }}>
              {paper.source_url
                ? "Document is available via the source link below."
                : "No preview or text content available for this document."}
            </p>
            {paper.source_url && (
              <a
                href={paper.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="button primary"
                style={{ height: 32, fontSize: 12, textDecoration: "none", gap: 6 }}
              >
                <ExternalLink size={13} />
                <span>Open Source Document</span>
              </a>
            )}
          </div>
        )}

      </div>

      {/* Minimal clean pagination only when reading multi-page text */}
      {!isPdfMode && totalPages > 1 && (
        <footer
          style={{
            height: 34,
            borderTop: "1px solid var(--border)",
            background: "var(--card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "0 14px",
            zIndex: 30,
          }}
        >
          <button
            className="button ghost"
            style={{ height: 26, width: 26, padding: 0 }}
            disabled={activePage <= 1}
            onClick={() => scrollToPage(Math.max(1, activePage - 1))}
            title="Previous page"
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>
            Page {activePage} of {totalPages}
          </span>
          <button
            className="button ghost"
            style={{ height: 26, width: 26, padding: 0 }}
            disabled={activePage >= totalPages}
            onClick={() => scrollToPage(Math.min(totalPages, activePage + 1))}
            title="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </footer>
      )}
    </main>
  );
}
