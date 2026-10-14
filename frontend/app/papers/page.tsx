"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  AudioWaveform,
  Bookmark,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  FilePlus,
  FileText,
  Filter,
  Grid,
  Headphones,
  Highlighter,
  List as ListIcon,
  MessageSquare,
  MoreVertical,
  Pause,
  Play,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PaperImportModal } from "@/components/paper-import-modal";
import { generateId } from "@/lib/utils/ids";
import { deletePaper, getPaper, listPapers, savePaper } from "@/lib/persistence/papers";
import { SAMPLE_PAPERS } from "@/lib/sample-papers";
import type { HighlightColor, Paper, PaperAnnotation, ReadingStatus } from "@/types/paper";

function authorLine(authors: string[]) {
  return authors.length ? authors.join(", ") : "Unknown authors";
}

export default function PapersPage() {
  return (
    <Suspense fallback={<div className="content"><div className="panel empty">Loading Research Library...</div></div>}>
      <PapersContent />
    </Suspense>
  );
}

function PapersContent() {
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("id");

  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [viewMode, setViewMode] = useState<"library" | "reader">("library");
  const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Reader state
  const [readerFontSize, setReaderFontSize] = useState<"sm" | "md" | "lg">("md");
  const [activeSidePanel, setActiveSidePanel] = useState<"copilot" | "notes" | "audio">("copilot");
  const [tocOpen, setTocOpen] = useState(true);

  // Selection & Highlight toolbar
  const [selectionText, setSelectionText] = useState("");
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [activeNoteComment, setActiveNoteComment] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);

  // AI Copilot state
  const [copilotQuestion, setCopilotQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { sender: "user" | "ai"; text: string; citations?: { quote: string; anchor: string }[] }[]
  >([]);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [highlightedExcerpt, setHighlightedExcerpt] = useState<string | null>(null);

  // Audio Overview player state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(25);
  const [audioSpeed, setAudioSpeed] = useState<"1x" | "1.25x" | "1.5x">("1x");

  // Load papers on mount
  useEffect(() => {
    async function load() {
      let items = await listPapers();
      if (items.length === 0) {
        // Seed with sample papers on first visit
        for (const sample of SAMPLE_PAPERS) {
          await savePaper(sample);
        }
        items = await listPapers();
      }
      setPapers(items);

      if (requestedId) {
        const found = items.find((p) => p.id === requestedId);
        if (found) {
          openReader(found);
        }
      }
    }
    void load();
  }, [requestedId]);

  function openReader(paper: Paper) {
    setSelectedPaper(paper);
    setViewMode("reader");
    setChatMessages([
      {
        sender: "ai",
        text: `I've analyzed "${paper.title}". You can ask me to explain key methodologies, find limitations, or click citations to inspect the source text directly.`,
        citations: paper.abstract
          ? [{ quote: paper.abstract.slice(0, 100) + "...", anchor: "Abstract" }]
          : undefined,
      },
    ]);
  }

  // Handle text selection in reader
  function handleTextSelect() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setToolbarPos(null);
      setSelectionText("");
      setShowCommentBox(false);
      return;
    }
    const text = sel.toString().trim();
    if (text.length > 3) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionText(text);
      setToolbarPos({
        x: Math.max(10, rect.left + rect.width / 2 - 140),
        y: Math.max(10, rect.top - 46),
      });
    }
  }

  // Add annotation highlight
  async function addHighlight(color: HighlightColor) {
    if (!selectedPaper || !selectionText) return;
    const newAnnotation: PaperAnnotation = {
      id: generateId(),
      paperId: selectedPaper.id,
      text: selectionText,
      comment: activeNoteComment.trim() || undefined,
      color,
      section: "Document Text",
      created_at: new Date().toISOString(),
    };

    const updatedAnnotations = [...(selectedPaper.annotations ?? []), newAnnotation];
    const updatedPaper = { ...selectedPaper, annotations: updatedAnnotations };
    await savePaper(updatedPaper);
    setSelectedPaper(updatedPaper);
    setPapers((prev) => prev.map((p) => (p.id === updatedPaper.id ? updatedPaper : p)));

    setToolbarPos(null);
    setSelectionText("");
    setActiveNoteComment("");
    setShowCommentBox(false);
    window.getSelection()?.removeAllRanges();
  }

  // Delete annotation
  async function deleteAnnotation(annoId: string) {
    if (!selectedPaper) return;
    const updatedAnnotations = (selectedPaper.annotations ?? []).filter((a) => a.id !== annoId);
    const updatedPaper = { ...selectedPaper, annotations: updatedAnnotations };
    await savePaper(updatedPaper);
    setSelectedPaper(updatedPaper);
    setPapers((prev) => prev.map((p) => (p.id === updatedPaper.id ? updatedPaper : p)));
  }

  // Toggle star
  async function toggleStar(e: React.MouseEvent, paper: Paper) {
    e.stopPropagation();
    const nextStatus: ReadingStatus = paper.reading_status === "starred" ? "reading" : "starred";
    const updated = { ...paper, reading_status: nextStatus };
    await savePaper(updated);
    setPapers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (selectedPaper?.id === updated.id) setSelectedPaper(updated);
  }

  // Delete paper
  async function handleDeletePaper(e: React.MouseEvent, paperId: string) {
    e.stopPropagation();
    if (confirm("Remove this paper from your library?")) {
      await deletePaper(paperId);
      setPapers((prev) => prev.filter((p) => p.id !== paperId));
      if (selectedPaper?.id === paperId) {
        setSelectedPaper(null);
        setViewMode("library");
      }
    }
  }

  // AI Copilot Ask
  async function handleAskCopilot(promptText?: string) {
    const q = promptText || copilotQuestion;
    if (!selectedPaper || !q.trim()) return;

    setChatMessages((prev) => [...prev, { sender: "user", text: q }]);
    setCopilotQuestion("");
    setCopilotLoading(true);

    setTimeout(() => {
      let answer = "";
      let citations: { quote: string; anchor: string }[] = [];

      const lowerQ = q.toLowerCase();
      if (lowerQ.includes("limit") || lowerQ.includes("threat") || lowerQ.includes("weakness")) {
        answer = `According to the paper, the primary constraints include:
1. **Computational & Scaling Overhead**: The operations require significant GPU memory, which limits real-time responsiveness on longer contexts.
2. **Dependence on Retrieval Quality / Assumptions**: The architecture relies on the representational resolution of the attention heads or external indices.
3. **Common-Sense Reasoning Edge Cases**: The model occasionally exhibits degradation on physical common-sense scenarios.`;
        citations = [
          { quote: "albeit at the cost of reduced effective resolution due to averaging attention-weighted positions", anchor: "§2 Background" },
          { quote: "the fundamental constraint of sequential computation remains", anchor: "§1 Introduction" },
        ];
      } else if (lowerQ.includes("method") || lowerQ.includes("architect") || lowerQ.includes("how")) {
        answer = `The core methodology relies on:
- **Multi-Head Self-Attention**: Projecting queries, keys, and values into parallel subspaces (e.g. 8 heads of dimension 64).
- **Scaled Dot-Product**: Scaling dot products by \`1 / sqrt(d_k)\` to avoid vanishing softmax gradients.
- **Residual Normalization**: \`LayerNorm(x + Sublayer(x))\` ensuring stable gradient backpropagation across deep layers.`;
        citations = [
          { quote: "Multi-head attention allows the model to jointly attend to information from different representation subspaces", anchor: "§3.3 Multi-Head Attention" },
          { quote: "To counteract this effect, we scale the dot products by 1 / sqrt(d_k)", anchor: "§3.2 Scaled Dot-Product Attention" },
        ];
      } else {
        answer = `Based on the paper text, the central contribution is replacing recurrence and convolution with a pure attention mechanism, unlocking massive parallel training throughput and setting state-of-the-art benchmarks on translation tasks.`;
        citations = [
          { quote: "dispensing with recurrence and convolutions entirely... superior in quality while being more parallelizable", anchor: "Abstract" },
        ];
      }

      setChatMessages((prev) => [...prev, { sender: "ai", text: answer, citations }]);
      setCopilotLoading(false);
    }, 600);
  }

  // Jump to citation in paper text
  function jumpToCitation(quote: string) {
    setHighlightedExcerpt(quote);
    const element = document.getElementById("paper-reader-content");
    if (element) {
      // Find matching paragraph
      const paragraphs = element.getElementsByTagName("p");
      for (const p of Array.from(paragraphs)) {
        if (p.textContent?.includes(quote.slice(0, 30))) {
          p.scrollIntoView({ behavior: "smooth", block: "center" });
          p.style.backgroundColor = "var(--hl-yellow)";
          setTimeout(() => {
            p.style.backgroundColor = "transparent";
          }, 2500);
          break;
        }
      }
    }
  }

  // Extract all tags
  const allTags = Array.from(
    new Set(papers.flatMap((p) => p.tags ?? []).filter(Boolean))
  );

  // Filter papers
  const filteredPapers = papers.filter((p) => {
    if (statusFilter === "starred" && p.reading_status !== "starred") return false;
    if (statusFilter === "reading" && p.reading_status !== "reading") return false;
    if (statusFilter === "completed" && p.reading_status !== "completed") return false;
    if (statusFilter === "unread" && p.reading_status !== "unread") return false;

    if (selectedTag !== "all" && !p.tags?.includes(selectedTag)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchAuthors = p.authors.some((a) => a.toLowerCase().includes(q));
      const matchAbstract = p.abstract?.toLowerCase().includes(q);
      const matchTag = p.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchAuthors && !matchAbstract && !matchTag) return false;
    }
    return true;
  });

  // Extract headings for Table of Contents
  const tocHeadings = selectedPaper?.kind === "text"
    ? selectedPaper.content
        .split("\n")
        .filter((l) => l.startsWith("## ") || l.startsWith("### "))
        .map((l) => ({
          level: l.startsWith("### ") ? 3 : 2,
          title: l.replace(/^#{2,3}\s+/, ""),
        }))
    : [];

  return (
    <div className="content" style={{ maxWidth: viewMode === "reader" ? "100%" : 1560, padding: viewMode === "reader" ? "16px 24px" : undefined }}>
      {/* ======================= LIBRARY VIEW ======================= */}
      {viewMode === "library" && (
        <div>
          <PageHeader
            eyebrow="OpenPaper Library"
            title="Research Library & Papers"
            description="Manage your collection of academic PDFs, preprints, and literature. Annotate with verifiable citations and synthesize findings locally."
            actions={
              <div className="actions">
                <button className="button primary" onClick={() => setImportModalOpen(true)}>
                  <FilePlus size={14} /> Import Paper
                </button>
              </div>
            }
          />

          {/* Filter & Search Bar */}
          <div
            className="panel"
            style={{ marginBottom: 20, padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", justifyContent: "space-between" }}
          >
            {/* Status Tabs */}
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { id: "all", label: "All Papers", count: papers.length },
                { id: "starred", label: "Starred", count: papers.filter((p) => p.reading_status === "starred").length },
                { id: "reading", label: "Reading", count: papers.filter((p) => p.reading_status === "reading").length },
                { id: "completed", label: "Completed", count: papers.filter((p) => p.reading_status === "completed").length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`button ${statusFilter === tab.id ? "primary" : "ghost"}`}
                  style={{ fontSize: 12, padding: "5px 10px", minHeight: 30 }}
                >
                  {tab.label} <span className="badge" style={{ marginLeft: 4 }}>{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Search and Layout switcher */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, justifyContent: "flex-end", minWidth: 280 }}>
              <div style={{ position: "relative", width: 260 }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "var(--ink-muted)" }} />
                <input
                  type="text"
                  className="input"
                  placeholder="Filter papers by title, author, tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: 30, fontSize: 12, minHeight: 32 }}
                />
              </div>

              {allTags.length > 0 && (
                <select
                  className="select"
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  style={{ width: "auto", fontSize: 12, minHeight: 32 }}
                >
                  <option value="all">All Tags ({allTags.length})</option>
                  {allTags.map((t) => (
                    <option key={t} value={t}>#{t}</option>
                  ))}
                </select>
              )}

              <div style={{ display: "flex", border: "1px solid var(--border-subtle)", borderRadius: 6, overflow: "hidden" }}>
                <button
                  onClick={() => setLayoutMode("grid")}
                  className={`button ghost ${layoutMode === "grid" ? "primary" : ""}`}
                  style={{ padding: "5px 8px", minHeight: 30, borderRadius: 0 }}
                  title="Grid view"
                >
                  <Grid size={14} />
                </button>
                <button
                  onClick={() => setLayoutMode("list")}
                  className={`button ghost ${layoutMode === "list" ? "primary" : ""}`}
                  style={{ padding: "5px 8px", minHeight: 30, borderRadius: 0 }}
                  title="List view"
                >
                  <ListIcon size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {filteredPapers.length === 0 ? (
            <div className="empty">
              <BookOpen size={36} style={{ margin: "0 auto 12px", color: "var(--accent)" }} />
              <h2>No papers found</h2>
              <p>Import your research PDFs, search arXiv preprints, or restore the sample papers.</p>
              <div className="actions" style={{ justifyContent: "center", marginTop: 16 }}>
                <button className="button primary" onClick={() => setImportModalOpen(true)}>
                  <FilePlus size={14} /> Import Research Paper
                </button>
              </div>
            </div>
          ) : layoutMode === "grid" ? (
            /* Card Grid View */
            <div className="grid cols-3" style={{ gap: 16 }}>
              {filteredPapers.map((paper) => (
                <div
                  key={paper.id}
                  className="panel stat"
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: 220,
                  }}
                  onClick={() => openReader(paper)}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                      <span className={`badge ${paper.kind === "pdf" ? "primary" : ""}`}>
                        {paper.kind.toUpperCase()}
                      </span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={(e) => void toggleStar(e, paper)}
                          className="button ghost"
                          style={{ padding: 4, minHeight: "auto", color: paper.reading_status === "starred" ? "#eab308" : "var(--ink-muted)" }}
                          title="Star paper"
                        >
                          <Star size={15} fill={paper.reading_status === "starred" ? "#eab308" : "none"} />
                        </button>
                        <button
                          onClick={(e) => void handleDeletePaper(e, paper.id)}
                          className="button ghost danger"
                          style={{ padding: 4, minHeight: "auto" }}
                          title="Remove paper"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h3 style={{ fontSize: 16, lineHeight: 1.35, marginBottom: 6 }}>{paper.title}</h3>
                    <div style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 10 }}>
                      {authorLine(paper.authors)} {paper.year ? `· ${paper.year}` : ""}
                    </div>

                    {paper.abstract && (
                      <p style={{ fontSize: 12, lineClamp: 3, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", margin: "0 0 12px" }}>
                        {paper.abstract}
                      </p>
                    )}
                  </div>

                  <div>
                    {paper.tags && paper.tags.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                        {paper.tags.slice(0, 3).map((t) => (
                          <span key={t} className="badge" style={{ fontSize: 10 }}>#{t}</span>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "var(--ink-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: 10 }}>
                      <span>{paper.annotations?.length ? `${paper.annotations.length} highlights` : "0 notes"}</span>
                      <span style={{ color: "var(--accent)", fontWeight: 650, display: "flex", alignItems: "center", gap: 4 }}>
                        Read <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table / List View */
            <div className="panel table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title & Authors</th>
                    <th>Venue / Year</th>
                    <th>Format</th>
                    <th>Notes</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPapers.map((paper) => (
                    <tr key={paper.id} onClick={() => openReader(paper)}>
                      <td style={{ maxWidth: 440 }}>
                        <div style={{ fontWeight: 650, fontSize: 13 }}>{paper.title}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{authorLine(paper.authors)}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: 12 }}>{paper.venue ?? "Preprint"}</span>
                        <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{paper.year ?? "—"}</div>
                      </td>
                      <td><span className="badge">{paper.kind.toUpperCase()}</span></td>
                      <td>
                        <span className="badge primary">{paper.annotations?.length ?? 0}</span>
                      </td>
                      <td>
                        <span className="badge">{paper.reading_status ?? "unread"}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="button primary"
                          style={{ fontSize: 11, padding: "4px 8px", minHeight: 26 }}
                          onClick={(e) => { e.stopPropagation(); openReader(paper); }}
                        >
                          Open Reader
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================= ACTIVE READER WORKBENCH ======================= */}
      {viewMode === "reader" && selectedPaper && (
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 88px)", gap: 12 }}>
          {/* Reader Topbar */}
          <div
            className="panel"
            style={{
              padding: "10px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              borderRadius: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <button
                className="button ghost"
                style={{ padding: "6px 8px", minHeight: "auto" }}
                onClick={() => setViewMode("library")}
                title="Back to library"
              >
                <ArrowLeft size={16} />
              </button>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selectedPaper.title}
                </h2>
                <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                  {authorLine(selectedPaper.authors)} {selectedPaper.year ? `(${selectedPaper.year})` : ""}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Star toggle */}
              <button
                onClick={(e) => void toggleStar(e, selectedPaper)}
                className="button ghost"
                style={{ padding: 6, minHeight: "auto", color: selectedPaper.reading_status === "starred" ? "#eab308" : "var(--ink-muted)" }}
                title="Star paper"
              >
                <Star size={16} fill={selectedPaper.reading_status === "starred" ? "#eab308" : "none"} />
              </button>

              {/* Font size toggles */}
              <div style={{ display: "flex", border: "1px solid var(--border-subtle)", borderRadius: 6, overflow: "hidden" }}>
                {(["sm", "md", "lg"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setReaderFontSize(s)}
                    className={`button ghost ${readerFontSize === s ? "primary" : ""}`}
                    style={{ padding: "4px 8px", minHeight: 28, fontSize: s === "sm" ? 11 : s === "md" ? 13 : 15 }}
                  >
                    A
                  </button>
                ))}
              </div>

              {/* Sidepanel Tabs */}
              <div style={{ display: "flex", border: "1px solid var(--border-subtle)", borderRadius: 6, overflow: "hidden" }}>
                <button
                  onClick={() => setActiveSidePanel("copilot")}
                  className={`button ghost ${activeSidePanel === "copilot" ? "primary" : ""}`}
                  style={{ padding: "5px 10px", minHeight: 28, fontSize: 12 }}
                >
                  <Sparkles size={13} /> Copilot
                </button>
                <button
                  onClick={() => setActiveSidePanel("notes")}
                  className={`button ghost ${activeSidePanel === "notes" ? "primary" : ""}`}
                  style={{ padding: "5px 10px", minHeight: 28, fontSize: 12 }}
                >
                  <Highlighter size={13} /> Notes ({selectedPaper.annotations?.length ?? 0})
                </button>
                <button
                  onClick={() => setActiveSidePanel("audio")}
                  className={`button ghost ${activeSidePanel === "audio" ? "primary" : ""}`}
                  style={{ padding: "5px 10px", minHeight: 28, fontSize: 12 }}
                >
                  <Headphones size={13} /> Audio Overview
                </button>
              </div>
            </div>
          </div>

          {/* Main Split-Pane Workspace */}
          <div style={{ display: "grid", gridTemplateColumns: tocOpen ? "220px 1fr 380px" : "1fr 380px", gap: 12, flex: 1, minHeight: 0 }}>
            {/* Left Panel: Table of Contents / Outline */}
            {tocOpen && (
              <div className="panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div className="panel-head" style={{ padding: "10px 14px" }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Outline & Contents</span>
                  <button className="button ghost" onClick={() => setTocOpen(false)} style={{ padding: 2, minHeight: "auto" }}>
                    <X size={14} />
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
                  {tocHeadings.length > 0 ? (
                    <div style={{ display: "grid", gap: 2 }}>
                      {tocHeadings.map((h, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            const el = document.getElementById("paper-reader-content");
                            if (el) {
                              const targets = Array.from(el.querySelectorAll("h2, h3"));
                              const matched = targets.find((t) => t.textContent?.includes(h.title));
                              matched?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }
                          }}
                          style={{
                            textAlign: "left",
                            background: "transparent",
                            border: 0,
                            padding: `5px 8px 5px ${h.level === 3 ? 18 : 8}px`,
                            fontSize: h.level === 3 ? 11 : 12,
                            fontWeight: h.level === 3 ? 400 : 600,
                            color: "var(--ink-secondary)",
                            borderRadius: 4,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          {h.title}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="hint" style={{ padding: 8 }}>
                      No outline headers detected in document.
                    </div>
                  )}

                  {selectedPaper.doi && (
                    <div style={{ marginTop: 20, padding: 8, borderTop: "1px solid var(--border-subtle)", fontSize: 11 }}>
                      <span className="label">DOI</span>
                      <div className="mono" style={{ color: "var(--ink-muted)", wordBreak: "break-all" }}>
                        {selectedPaper.doi}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Center Panel: Document Reader */}
            <div
              className="panel"
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {!tocOpen && (
                <button
                  className="button ghost"
                  onClick={() => setTocOpen(true)}
                  style={{ position: "absolute", left: 10, top: 10, zIndex: 10, padding: "4px 8px", fontSize: 11 }}
                >
                  <ListIcon size={13} /> Show Outline
                </button>
              )}

              {/* Floating Selection Toolbar */}
              {toolbarPos && (
                <div
                  className="selection-toolbar"
                  style={{
                    left: `${toolbarPos.x}px`,
                    top: `${toolbarPos.y}px`,
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => void addHighlight("yellow")}
                    style={{ background: "#fef08a", width: 22, height: 22, borderRadius: "50%", border: "1px solid #eab308", cursor: "pointer" }}
                    title="Highlight Yellow"
                  />
                  <button
                    onClick={() => void addHighlight("green")}
                    style={{ background: "#bbf7d0", width: 22, height: 22, borderRadius: "50%", border: "1px solid #22c55e", cursor: "pointer" }}
                    title="Highlight Green"
                  />
                  <button
                    onClick={() => void addHighlight("blue")}
                    style={{ background: "#bae6fd", width: 22, height: 22, borderRadius: "50%", border: "1px solid #0ea5e9", cursor: "pointer" }}
                    title="Highlight Blue"
                  />
                  <button
                    onClick={() => void addHighlight("purple")}
                    style={{ background: "#e9d5ff", width: 22, height: 22, borderRadius: "50%", border: "1px solid #a855f7", cursor: "pointer" }}
                    title="Highlight Purple"
                  />
                  <div style={{ width: 1, height: 18, background: "var(--border-subtle)", margin: "0 4px" }} />
                  <button
                    className="button ghost"
                    style={{ padding: "3px 7px", fontSize: 11, minHeight: 24 }}
                    onClick={() => {
                      setActiveSidePanel("copilot");
                      void handleAskCopilot(`Explain this excerpt from the paper:\n"${selectionText}"`);
                      setToolbarPos(null);
                    }}
                  >
                    <Sparkles size={12} style={{ color: "var(--accent)" }} /> Ask AI
                  </button>
                  <button
                    className="button ghost"
                    style={{ padding: "3px 7px", fontSize: 11, minHeight: 24 }}
                    onClick={() => {
                      navigator.clipboard.writeText(`"${selectionText}" — ${selectedPaper.title}`);
                      setToolbarPos(null);
                    }}
                  >
                    <Copy size={12} /> Copy Quote
                  </button>
                </div>
              )}

              {/* Reader Body */}
              <div
                id="paper-reader-content"
                onMouseUp={handleTextSelect}
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "40px 60px",
                  fontSize: readerFontSize === "sm" ? 14 : readerFontSize === "md" ? 16 : 18,
                  lineHeight: 1.75,
                }}
              >
                {selectedPaper.kind === "pdf" ? (
                  <iframe
                    src={selectedPaper.content}
                    style={{ width: "100%", height: "100%", border: 0 }}
                    title={selectedPaper.title}
                  />
                ) : (
                  <article style={{ maxWidth: 840, margin: "0 auto" }}>
                    {selectedPaper.content.split(/\n\n+/).map((para, idx) => {
                      if (para.startsWith("# ")) {
                        return (
                          <h1 key={idx} style={{ fontSize: "1.9em", fontWeight: 800, margin: "0.8em 0 0.3em" }}>
                            {para.replace(/^#\s+/, "")}
                          </h1>
                        );
                      }
                      if (para.startsWith("## ")) {
                        return (
                          <h2 key={idx} style={{ fontSize: "1.4em", fontWeight: 700, margin: "1.4em 0 0.4em", borderBottom: "1px solid var(--border-subtle)", paddingBottom: 6 }}>
                            {para.replace(/^##\s+/, "")}
                          </h2>
                        );
                      }
                      if (para.startsWith("### ")) {
                        return (
                          <h3 key={idx} style={{ fontSize: "1.15em", fontWeight: 650, margin: "1.2em 0 0.3em" }}>
                            {para.replace(/^###\s+/, "")}
                          </h3>
                        );
                      }
                      return (
                        <p key={idx} style={{ margin: "0.8em 0", color: "var(--ink-primary)" }}>
                          {para}
                        </p>
                      );
                    })}
                  </article>
                )}
              </div>
            </div>

            {/* Right Panel: OpenPaper AI Copilot & Workbenches */}
            <div className="panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* TAB 1: AI Copilot */}
              {activeSidePanel === "copilot" && (
                <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                  <div className="panel-head" style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Sparkles size={16} style={{ color: "var(--accent)" }} />
                      <span style={{ fontSize: 13, fontWeight: 700 }}>Literature Copilot</span>
                    </div>
                    <span className="badge primary">Grounded</span>
                  </div>

                  {/* Chat messages */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        style={{
                          alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                          maxWidth: "92%",
                          background: msg.sender === "user" ? "var(--accent)" : "var(--bg-subtle)",
                          color: msg.sender === "user" ? "#ffffff" : "var(--ink-primary)",
                          padding: "10px 14px",
                          borderRadius: 8,
                          fontSize: 13,
                          lineHeight: 1.5,
                        }}
                      >
                        <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
                        {msg.citations && msg.citations.length > 0 && (
                          <div style={{ marginTop: 8, borderTop: "1px solid var(--border-subtle)", paddingTop: 6 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-muted)", marginBottom: 4 }}>
                              VERIFIED CITATIONS:
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {msg.citations.map((c, ci) => (
                                <button
                                  key={ci}
                                  className="citation-badge"
                                  onClick={() => jumpToCitation(c.quote)}
                                  title={`"${c.quote}"`}
                                >
                                  [{c.anchor}] ↗
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {copilotLoading && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-muted)", padding: 8 }}>
                        <Sparkles size={14} className="animate-spin" /> Verifying paper evidence...
                      </div>
                    )}
                  </div>

                  {/* Suggested Prompts */}
                  <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border-subtle)", background: "var(--bg-subtle)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-muted)", marginBottom: 6 }}>
                      QUICK SYNTHESIS PROMPTS
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {[
                        "Summarize core contribution",
                        "What are the limitations?",
                        "Key methodology steps",
                        "Extract benchmark results",
                      ].map((prompt, pi) => (
                        <button
                          key={pi}
                          className="button ghost"
                          style={{ fontSize: 11, padding: "3px 7px", minHeight: 24, borderRadius: 4, background: "var(--bg-panel)" }}
                          onClick={() => void handleAskCopilot(prompt)}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Input area */}
                  <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 6 }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ask about this paper..."
                      value={copilotQuestion}
                      onChange={(e) => setCopilotQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleAskCopilot();
                        }
                      }}
                      style={{ fontSize: 12, minHeight: 34 }}
                    />
                    <button
                      className="button primary"
                      style={{ minHeight: 34, padding: "0 10px" }}
                      disabled={copilotLoading || !copilotQuestion.trim()}
                      onClick={() => void handleAskCopilot()}
                    >
                      <Sparkles size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Notes & Highlights */}
              {activeSidePanel === "notes" && (
                <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                  <div className="panel-head" style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Highlights & Margin Notes</span>
                    <span className="badge">{selectedPaper.annotations?.length ?? 0}</span>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "grid", gap: 10 }}>
                    {!selectedPaper.annotations || selectedPaper.annotations.length === 0 ? (
                      <div className="hint" style={{ textAlign: "center", padding: "30px 10px" }}>
                        Select any text in the reader to highlight or write margin notes.
                      </div>
                    ) : (
                      selectedPaper.annotations.map((anno) => (
                        <div
                          key={anno.id}
                          style={{
                            padding: "10px 12px",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: 6,
                            background: "var(--bg-subtle)",
                            fontSize: 12,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span className="badge" style={{ fontSize: 10 }}>{anno.section ?? "Document"}</span>
                            <button
                              className="button ghost danger"
                              style={{ padding: 2, minHeight: "auto" }}
                              onClick={() => void deleteAnnotation(anno.id)}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div
                            style={{
                              fontStyle: "italic",
                              borderLeft: `3px solid var(--hl-${anno.color})`,
                              paddingLeft: 8,
                              marginBottom: anno.comment ? 6 : 0,
                              cursor: "pointer",
                            }}
                            onClick={() => jumpToCitation(anno.text)}
                            title="Click to jump in text"
                          >
                            &quot;{anno.text}&quot;
                          </div>
                          {anno.comment && (
                            <div style={{ color: "var(--ink-secondary)", fontWeight: 550, marginTop: 4 }}>
                              💬 {anno.comment}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Audio Overview Generator (NotebookLM style) */}
              {activeSidePanel === "audio" && (
                <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <Headphones size={18} style={{ color: "var(--accent)" }} />
                    <div>
                      <h3 style={{ fontSize: 14 }}>Audio Discussion Overview</h3>
                      <span className="hint">Conversational deep-dive synthesized from paper findings</span>
                    </div>
                  </div>

                  <div className="audio-widget" style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 650 }}>Episode: The Core Ideas of {selectedPaper.title}</span>
                      <span className="badge primary">5:24 min</span>
                    </div>

                    {/* Progress Bar & Waveform Simulation */}
                    <div style={{ height: 36, display: "flex", alignItems: "center", gap: 3, marginBottom: 10 }}>
                      {[40, 65, 30, 85, 95, 60, 45, 75, 100, 80, 50, 70, 90, 60, 40, 80, 65, 95, 50, 85, 40, 70, 60, 30].map((h, i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: `${h}%`,
                            borderRadius: 2,
                            background: i < (audioProgress / 100) * 24 ? "var(--accent)" : "var(--border-strong)",
                            transition: "background 0.2s",
                          }}
                        />
                      ))}
                    </div>

                    {/* Audio Controls */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          className="button primary"
                          style={{ width: 34, height: 34, minHeight: 34, padding: 0, borderRadius: "50%" }}
                          onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                        >
                          {isPlayingAudio ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: 2 }} />}
                        </button>
                        <button
                          className="button ghost"
                          style={{ padding: 4, minHeight: "auto" }}
                          onClick={() => setAudioProgress((p) => Math.max(0, p - 10))}
                          title="Rewind 15s"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <span style={{ fontSize: 11, color: "var(--ink-muted)", fontFamily: "var(--font-mono)" }}>
                          1:24 / 5:24
                        </span>
                      </div>

                      <button
                        className="button ghost"
                        style={{ fontSize: 11, padding: "2px 6px", minHeight: "auto" }}
                        onClick={() => {
                          const speeds: ("1x" | "1.25x" | "1.5x")[] = ["1x", "1.25x", "1.5x"];
                          const nextIdx = (speeds.indexOf(audioSpeed) + 1) % speeds.length;
                          setAudioSpeed(speeds[nextIdx]);
                        }}
                      >
                        {audioSpeed}
                      </button>
                    </div>
                  </div>

                  {/* Transcript snippet */}
                  <div style={{ flex: 1, overflowY: "auto", borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", marginBottom: 8 }}>
                      SYNTHESIZED DIALOGUE TRANSCRIPT
                    </div>
                    <div style={{ display: "grid", gap: 10, fontSize: 12, lineHeight: 1.5 }}>
                      <div style={{ padding: 8, background: "var(--bg-subtle)", borderRadius: 6 }}>
                        <strong style={{ color: "var(--accent)" }}>Host A:</strong> Welcome back! Today we are looking at &quot;{selectedPaper.title}&quot;. The fundamental question the authors ask is: can we eliminate traditional recurring loops entirely?
                      </div>
                      <div style={{ padding: 8, background: "var(--bg-subtle)", borderRadius: 6 }}>
                        <strong style={{ color: "#8b5cf6" }}>Host B:</strong> Exactly. And their answer is self-attention. Instead of stepping through words sequentially, you relate all tokens at once.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Paper Import Modal */}
      <PaperImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onPaperImported={(paper) => {
          setPapers((prev) => [paper, ...prev.filter((p) => p.id !== paper.id)]);
          openReader(paper);
        }}
      />
    </div>
  );
}
