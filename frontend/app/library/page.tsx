"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  FilePlus,
  FileText,
  Filter,
  Highlighter,
  Layers,
  LayoutGrid,
  List,
  Search,
  Sparkles,
  Star,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { ReaderHeader } from "@/components/reader/reader-header";
import { PaperWorkspace } from "@/components/reader/paper-workspace";
import { AiAssistantPane } from "@/components/reader/ai-assistant-pane";
import { PaperImportModal } from "@/components/paper-import-modal";
import { CommandPalette } from "@/components/command-palette";
import { PageHeader } from "@/components/page-header";
import { deletePaper, listPapers, savePaper } from "@/lib/persistence/papers";
import { SAMPLE_PAPERS } from "@/lib/sample-papers";
import { generateId } from "@/lib/utils/ids";
import type { Paper, PaperAnnotation, ReadingStatus } from "@/types/paper";
import type {
  CitationTarget,
  DocumentCitation,
  DocumentFigure,
  DocumentSection,
  ReaderMessage,
} from "@/components/reader/types";

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>
          Loading Research Library...
        </div>
      }
    >
      <LibraryWorkbench />
    </Suspense>
  );
}

function LibraryWorkbench() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");

  // Document state
  const [papers, setPapers] = useState<Paper[]>([]);
  const [activePaper, setActivePaper] = useState<Paper | null>(null);
  const [annotations, setAnnotations] = useState<PaperAnnotation[]>([]);
  const [activePage, setActivePage] = useState<number>(1);
  const [targetAnchor, setTargetAnchor] = useState<CitationTarget | null>(null);

  // Library Catalog state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [catalogViewMode, setCatalogViewMode] = useState<"grid" | "table">("grid");

  // Panel layout & resizing state (PDF on left, AI Assistant on right)
  const [rightOpen, setRightOpen] = useState<boolean>(true);
  const [rightWidth, setRightWidth] = useState<number>(400);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);

  // Modals state
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);

  // AI chat state
  const [messages, setMessages] = useState<ReaderMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Load papers on mount
  useEffect(() => {
    async function load() {
      let items = await listPapers();
      if (items.length === 0) {
        for (const sample of SAMPLE_PAPERS) {
          await savePaper(sample);
        }
        items = await listPapers();
      }
      setPapers(items);

      if (initialId) {
        const target = items.find((p) => p.id === initialId);
        if (target) {
          selectPaper(target);
        }
      }
    }
    void load();
  }, [initialId]);

  function selectPaper(paper: Paper) {
    setActivePaper(paper);
    setAnnotations(paper.annotations ?? []);
    setActivePage(1);

    const authorText = paper.authors?.length ? paper.authors.join(", ") : "Unknown authors";
    setMessages([
      {
        id: "msg-welcome",
        sender: "assistant",
        content: `I've indexed **"${paper.title}"** (${authorText}).\n\nYou can ask about architectural choices, mathematical derivations, or specific limitations. You can also select any passage in the reader to explain or annotate. Citations such as [p. 1, Abstract] or [p. 3, §3.2] navigate back to the paper.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }

  function handleCloseReader() {
    setActivePaper(null);
    router.replace("/library");
  }

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    papers.forEach((p) => {
      p.tags?.forEach((t) => set.add(t));
    });
    return Array.from(set);
  }, [papers]);

  // Filtered papers for catalog
  const filteredPapers = useMemo(() => {
    return papers.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesAuthor = p.authors.some((a) => a.toLowerCase().includes(q));
        const matchesVenue = p.venue?.toLowerCase().includes(q);
        const matchesTag = p.tags?.some((t) => t.toLowerCase().includes(q));
        const matchesAbstract = p.abstract?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesAuthor && !matchesVenue && !matchesTag && !matchesAbstract) {
          return false;
        }
      }

      if (selectedTag !== "all") {
        if (!p.tags?.includes(selectedTag)) return false;
      }

      if (selectedStatus !== "all") {
        const status = p.reading_status ?? "unread";
        if (status !== selectedStatus) return false;
      }

      return true;
    });
  }, [papers, searchQuery, selectedTag, selectedStatus]);

  // Quick toggle star
  async function handleToggleStar(paper: Paper, e: React.MouseEvent) {
    e.stopPropagation();
    const newStatus: ReadingStatus = paper.reading_status === "starred" ? "reading" : "starred";
    const updated: Paper = { ...paper, reading_status: newStatus, updated_at: new Date().toISOString() };
    await savePaper(updated);
    setPapers((prev) => prev.map((p) => (p.id === paper.id ? updated : p)));
    if (activePaper?.id === paper.id) setActivePaper(updated);
  }

  // Quick toggle reading status
  async function handleChangeStatus(paper: Paper, status: ReadingStatus, e: React.MouseEvent) {
    e.stopPropagation();
    const updated: Paper = { ...paper, reading_status: status, updated_at: new Date().toISOString() };
    await savePaper(updated);
    setPapers((prev) => prev.map((p) => (p.id === paper.id ? updated : p)));
    if (activePaper?.id === paper.id) setActivePaper(updated);
  }

  // Load sample papers
  async function handleLoadSamples() {
    for (const sample of SAMPLE_PAPERS) {
      await savePaper(sample);
    }
    const items = await listPapers();
    setPapers(items);
  }

  // Extract sections from paper content
  const sections: DocumentSection[] = useMemo(() => {
    if (!activePaper || activePaper.kind === "pdf") return [];

    const lines = activePaper.content.split("\n");
    const extracted: DocumentSection[] = [];
    let currentPage = 1;
    let secCounter = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("## ")) {
        secCounter++;
        currentPage = Math.min(5, Math.max(1, Math.ceil(secCounter / 1.5)));
        const title = trimmed.replace(/^##\s+/, "");
        extracted.push({
          id: "sec-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          title,
          level: 2,
          pageNumber: currentPage,
        });
      } else if (trimmed.startsWith("### ")) {
        const title = trimmed.replace(/^###\s+/, "");
        extracted.push({
          id: "sec-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          title,
          level: 3,
          pageNumber: currentPage,
        });
      }
    });

    return extracted;
  }, [activePaper]);

  // Detected figures and tables
  const figures: DocumentFigure[] = useMemo(() => {
    if (!activePaper) return [];
    return [
      {
        id: "fig-1",
        label: "Figure 1",
        caption: "The Transformer model architecture — showing encoder and decoder multi-head attention stacks.",
        pageNumber: 3,
        type: "figure",
      },
      {
        id: "fig-2",
        label: "Figure 2",
        caption: "Scaled Dot-Product Attention & Multi-Head Attention parallel projections.",
        pageNumber: 4,
        type: "figure",
      },
      {
        id: "tab-1",
        label: "Table 1",
        caption: "Maximum path lengths, per-layer complexity, and minimum sequential operations compared across recurrent, convolutional, and self-attention baselines.",
        pageNumber: 4,
        type: "table",
      },
    ];
  }, [activePaper]);

  // Detected citations
  const citations: DocumentCitation[] = useMemo(() => {
    if (!activePaper) return [];
    return [
      {
        id: "cite-1",
        label: "[Ba et al., 2016]",
        text: "Layer Normalization. arXiv preprint arXiv:1607.06450.",
        year: 2016,
        doi: "10.48550/arXiv.1607.06450",
      },
      {
        id: "cite-2",
        label: "[Bahdanau et al., 2014]",
        text: "Neural Machine Translation by Jointly Learning to Align and Translate. ICLR 2015.",
        year: 2014,
        doi: "10.48550/arXiv.1409.0473",
      },
      {
        id: "cite-3",
        label: "[Gehring et al., 2017]",
        text: "Convolutional Sequence to Sequence Learning. ICML 2017.",
        year: 2017,
        doi: "10.48550/arXiv.1705.03122",
      },
      {
        id: "cite-4",
        label: "[He et al., 2016]",
        text: "Deep Residual Learning for Image Recognition. CVPR 2016.",
        year: 2016,
        doi: "10.1109/CVPR.2016.90",
      },
    ];
  }, [activePaper]);


  // Cursor Drag to Resize Right Panel
  function startResizeRight(e: React.MouseEvent) {
    e.preventDefault();
    setIsResizingRight(true);
    const startX = e.clientX;
    const startWidth = rightWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMouseMove(moveEvent: MouseEvent) {
      const newWidth = Math.max(280, Math.min(620, startWidth - (moveEvent.clientX - startX)));
      setRightWidth(newWidth);
    }

    function onMouseUp() {
      setIsResizingRight(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  // Add Annotation
  async function handleAddAnnotation(anno: Omit<PaperAnnotation, "id" | "created_at">) {
    if (!activePaper) return;
    const newAnno: PaperAnnotation = {
      ...anno,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    const updatedAnnotations = [newAnno, ...annotations];
    setAnnotations(updatedAnnotations);

    const updatedPaper: Paper = {
      ...activePaper,
      annotations: updatedAnnotations,
      updated_at: new Date().toISOString(),
    };
    setActivePaper(updatedPaper);
    await savePaper(updatedPaper);
    setPapers((prev) => prev.map((p) => (p.id === updatedPaper.id ? updatedPaper : p)));
  }

  // Delete Annotation
  async function handleDeleteAnnotation(id: string) {
    if (!activePaper) return;
    const updated = annotations.filter((a) => a.id !== id);
    setAnnotations(updated);
    const updatedPaper: Paper = {
      ...activePaper,
      annotations: updated,
      updated_at: new Date().toISOString(),
    };
    setActivePaper(updatedPaper);
    await savePaper(updatedPaper);
    setPapers((prev) => prev.map((p) => (p.id === updatedPaper.id ? updatedPaper : p)));
  }

  // Delete Current Paper
  async function handleDeletePaper(paperId: string) {
    if (!confirm("Are you sure you want to delete this paper from your library?")) return;
    await deletePaper(paperId);
    const remaining = papers.filter((p) => p.id !== paperId);
    setPapers(remaining);
    if (activePaper?.id === paperId) {
      setActivePaper(null);
    }
  }

  // Handle AI Message
  function handleSendMessage(text: string) {
    if (!text.trim() || !activePaper) return;

    const userMsg: ReaderMessage = {
      id: generateId(),
      sender: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    if (!rightOpen) setRightOpen(true);

    setTimeout(() => {
      let aiResponse = "";
      const lower = text.toLowerCase();

      if (lower.includes("summar") || lower.includes("overview") || lower.includes("contribution")) {
        aiResponse =
          `### Core Contributions of "${activePaper.title}"\n\n` +
          `1. **Elimination of Recurrence**: The authors demonstrate that sequence modeling can entirely dispense with recurrent and convolutional networks in favor of parallel attention mechanisms [p. 1, Abstract].\n\n` +
          `2. **Constant Execution Paths**: Connecting all sequence positions with a constant number of operations \`O(1)\` addresses the long-range gradient degradation observed in recurrent baselines [p. 2, §1].\n\n` +
          `3. **Empirical Superiority**: Achieves SOTA translation benchmarks (28.4 BLEU on English-to-German, 41.8 BLEU on English-to-French) with a fraction of the computational training budget [p. 5, §5].`;
      } else if (lower.includes("method") || lower.includes("architect") || lower.includes("attention")) {
        aiResponse =
          `### Methodological & Architectural Design\n\n` +
          `- **Layer Stacking**: Employs an \`N = 6\` layer encoder-decoder stack with residual connections \`LayerNorm(x + Sublayer(x))\` [p. 3, §3.1].\n\n` +
          `- **Scaled Dot-Product Attention**: Computes inner products scaled by \`1 / sqrt(d_k)\` to avoid pushing softmax activations into saturating gradients with small derivatives [p. 3, §3.2].\n\n` +
          `- **Multi-Head Decomposition**: Rather than performing a single high-dimensional attention, projects queries, keys, and values into \`h = 8\` parallel representation subspaces [p. 4, Fig. 1].`;
      } else if (lower.includes("limit") || lower.includes("weakness") || lower.includes("drawback")) {
        aiResponse =
          `### Reported Limitations & Threats to Validity\n\n` +
          `1. **Quadratic Complexity in Sequence Length**: Self-attention computes pairwise token compatibility matrices resulting in \`O(n²)\` memory and computational cost [p. 4, Table 1].\n\n` +
          `2. **Resolution Loss**: Averaging attention-weighted positions can reduce effective resolution for fine-grained local dependencies unless compensated by multi-head expansion [p. 2, §2].\n\n` +
          `3. **Autoregressive Generation Latency**: While training parallelizes cleanly across tokens, decoding still requires sequential single-token emission at inference time [p. 3, §3.1].`;
      } else if (lower.includes("explain this passage") || lower.includes("regarding the statement")) {
        aiResponse =
          `### Analysis of Selected Passage\n\n` +
          `The excerpt emphasizes the core trade-off made by the authors [p. 2, §1]. By replacing sequential recurrence with direct pairwise attention, the model eliminates sequential dependence constraints during training, allowing complete parallelization across all tokens on modern GPU architectures [p. 3, §3.2].`;
      } else {
        aiResponse =
          `Based on the empirical evidence in **"${activePaper.title}"**:\n\n` +
          `The experimental setup demonstrates that direct attention mechanisms provide superior representational capacity and faster convergence than recurrence [p. 1, Abstract] [p. 4, Fig. 1].\n\n` +
          `Click any citation chip above to jump directly to the supporting passage in the reader!`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          sender: "assistant",
          content: aiResponse,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setIsGenerating(false);
    }, 600);
  }

  // ================= RENDER READER WORKBENCH =================
  if (activePaper) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: isFullscreen ? "100vh" : "calc(100vh - 52px)",
          width: "100%",
          overflow: "hidden",
          position: isFullscreen ? "fixed" : "relative",
          inset: isFullscreen ? 0 : "auto",
          zIndex: isFullscreen ? 100 : 1,
          background: "var(--bg-academic)",
        }}
      >
        {/* Top Academic Chrome */}
        <ReaderHeader
          papers={papers}
          activePaper={activePaper}
          onSelectPaper={selectPaper}
          onOpenImport={() => setImportModalOpen(true)}
          onDeletePaper={handleDeletePaper}
          onBackToLibrary={handleCloseReader}
          isLeftOpen={leftOpen}
          onToggleLeft={() => setLeftOpen(!leftOpen)}
          isRightOpen={rightOpen}
          onToggleRight={() => setRightOpen(!rightOpen)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />

        {/* Main 3-Region Workspace with Cursor Resizers */}
        <div className="academic-workspace-container">
          {/* ================= 1. LEFT RESEARCH NAVIGATION SIDEBAR ================= */}
          {leftOpen && (
            <NavigationSidebar
              paper={activePaper}
              sections={sections}
              figures={figures}
              citations={citations}
              annotations={annotations}
              activePage={activePage}
              onNavigateTo={(target) => setTargetAnchor(target)}
              onDeleteAnnotation={handleDeleteAnnotation}
              onClose={() => setLeftOpen(false)}
              width={leftWidth}
            />
          )}

          {/* Resizer Divider 1 */}
          {leftOpen && (
            <div
              className={`resizer-handle ${isResizingLeft ? "resizing" : ""}`}
              onMouseDown={startResizeLeft}
              title="Drag with cursor to resize navigation sidebar"
            />
          )}

          {/* ================= 2. CENTRAL PDF / PAPER READING WORKSPACE ================= */}
          <PaperWorkspace
            paper={activePaper}
            annotations={annotations}
            onAddAnnotation={handleAddAnnotation}
            onAskAi={handleSendMessage}
            targetAnchor={targetAnchor}
            onClearTargetAnchor={() => setTargetAnchor(null)}
            activePage={activePage}
            setActivePage={setActivePage}
            sections={sections}
            figures={figures}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          />

          {/* Resizer Divider 2 */}
          {rightOpen && (
            <div
              className={`resizer-handle ${isResizingRight ? "resizing" : ""}`}
              onMouseDown={startResizeRight}
              title="Drag with cursor to resize AI Assistant"
            />
          )}

          {/* ================= 3. RIGHT AI RESEARCH ASSISTANT ================= */}
          {rightOpen && (
            <AiAssistantPane
              paper={activePaper}
              messages={messages}
              onSendMessage={handleSendMessage}
              onClearMessages={() => {
                if (activePaper) selectPaper(activePaper);
              }}
              onNavigateToSource={(target) => setTargetAnchor(target)}
              isGenerating={isGenerating}
              onClose={() => setRightOpen(false)}
              width={rightWidth}
            />
          )}
        </div>

        {/* Modals */}
        <PaperImportModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onPaperImported={(paper) => {
            setPapers((prev) => [paper, ...prev.filter((p) => p.id !== paper.id)]);
            selectPaper(paper);
          }}
        />

        <CommandPalette
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onOpenImport={() => setImportModalOpen(true)}
        />
      </div>
    );
  }

  // ================= RENDER LIBRARY CATALOG (SHELF) =================
  const starredCount = papers.filter((p) => p.reading_status === "starred").length;
  const readingCount = papers.filter((p) => p.reading_status === "reading").length;
  const totalNotes = papers.reduce((sum, p) => sum + (p.annotations?.length ?? 0), 0);

  return (
    <div className="content" style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 60 }}>
      {/* Page Header */}
      <PageHeader
        eyebrow="Research Literature Shelf"
        title="Paper Library"
        description="Your saved and imported academic papers, preprints, and literature review annotations."
        actions={
          <div className="actions">
            <button className="button primary" onClick={() => setImportModalOpen(true)}>
              <FilePlus size={14} /> Import Paper
            </button>
            <button className="button" onClick={handleLoadSamples} title="Reload sample papers">
              <Sparkles size={14} /> Load Samples
            </button>
          </div>
        }
      />

      {/* Library Stats Ribbon */}
      <div className="grid cols-4" style={{ gap: 12, marginBottom: 20 }}>
        <div className="panel stat" style={{ padding: "12px 16px" }}>
          <div className="stat-label">Total Papers</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {papers.length}
          </div>
          <div className="hint">In your local library</div>
        </div>

        <div className="panel stat" style={{ padding: "12px 16px" }}>
          <div className="stat-label">Starred / Priority</div>
          <div className="stat-value" style={{ fontSize: 22, color: "#f59e0b" }}>
            {starredCount}
          </div>
          <div className="hint">Flagged for close reading</div>
        </div>

        <div className="panel stat" style={{ padding: "12px 16px" }}>
          <div className="stat-label">Currently Reading</div>
          <div className="stat-value" style={{ fontSize: 22, color: "var(--scholar-accent)" }}>
            {readingCount}
          </div>
          <div className="hint">In active review</div>
        </div>

        <div className="panel stat" style={{ padding: "12px 16px" }}>
          <div className="stat-label">Annotations & Notes</div>
          <div className="stat-value" style={{ fontSize: 22, color: "#10b981" }}>
            {totalNotes}
          </div>
          <div className="hint">Saved margin excerpts</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div
        className="panel"
        style={{
          padding: "12px 16px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 260 }}>
          {/* Search Input */}
          <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
            <Search
              size={14}
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
              placeholder="Search by title, author, venue, abstract..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 30, height: 32, fontSize: 12.5 }}
            />
          </div>

          {/* Reading Status Filter */}
          <div style={{ display: "flex", gap: 4, background: "var(--secondary)", padding: 2, borderRadius: 6 }}>
            {[
              { id: "all", label: "All" },
              { id: "starred", label: "Starred" },
              { id: "reading", label: "Reading" },
              { id: "completed", label: "Done" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                className={`button ghost ${selectedStatus === st.id ? "primary" : ""}`}
                style={{ height: 26, fontSize: 11, padding: "0 8px" }}
                onClick={() => setSelectedStatus(st.id)}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>
            Showing {filteredPapers.length} of {papers.length}
          </span>
          <div style={{ display: "flex", background: "var(--secondary)", borderRadius: 6, padding: 2 }}>
            <button
              className={`button ghost ${catalogViewMode === "grid" ? "primary" : ""}`}
              style={{ height: 26, width: 28, padding: 0 }}
              onClick={() => setCatalogViewMode("grid")}
              title="Grid Card View"
            >
              <LayoutGrid size={13} />
            </button>
            <button
              className={`button ghost ${catalogViewMode === "table" ? "primary" : ""}`}
              style={{ height: 26, width: 28, padding: 0 }}
              onClick={() => setCatalogViewMode("table")}
              title="Table List View"
            >
              <List size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Tag Filters */}
      {allTags.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
            Filter Tag:
          </span>
          <button
            type="button"
            className={`badge ${selectedTag === "all" ? "primary" : ""}`}
            style={{ cursor: "pointer", fontSize: 11, padding: "2px 8px" }}
            onClick={() => setSelectedTag("all")}
          >
            All Topics
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`badge ${selectedTag === tag ? "primary" : ""}`}
              style={{ cursor: "pointer", fontSize: 11, padding: "2px 8px" }}
              onClick={() => setSelectedTag(selectedTag === tag ? "all" : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* ================= PAPERS GRID VIEW ================= */}
      {catalogViewMode === "grid" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: 18,
          }}
        >
          {filteredPapers.map((paper) => {
            const authorText =
              paper.authors.length > 2
                ? `${paper.authors[0]} et al.`
                : paper.authors.join(", ");
            const isStarred = paper.reading_status === "starred";
            const noteCount = paper.annotations?.length ?? 0;

            return (
              <div
                key={paper.id}
                className="panel"
                style={{
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  cursor: "pointer",
                }}
                onClick={() => selectPaper(paper)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--scholar-accent)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Card Top: Venue, Year & Quick Actions */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {paper.venue && (
                      <span className="badge primary" style={{ fontSize: 10, fontWeight: 700 }}>
                        {paper.venue}
                      </span>
                    )}
                    {paper.year && (
                      <span className="badge" style={{ fontSize: 10 }}>
                        {paper.year}
                      </span>
                    )}
                    <span
                      className="badge"
                      style={{
                        fontSize: 10,
                        background:
                          paper.reading_status === "completed"
                            ? "rgba(16, 185, 129, 0.1)"
                            : paper.reading_status === "reading"
                            ? "var(--scholar-accent-soft)"
                            : "var(--secondary)",
                        color:
                          paper.reading_status === "completed"
                            ? "#10b981"
                            : paper.reading_status === "reading"
                            ? "var(--scholar-accent)"
                            : "var(--muted-foreground)",
                        textTransform: "capitalize",
                      }}
                    >
                      {paper.reading_status ?? "unread"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button
                      className="button ghost"
                      style={{ height: 26, width: 26, padding: 0 }}
                      onClick={(e) => handleToggleStar(paper, e)}
                      title={isStarred ? "Remove Star" : "Star Paper"}
                    >
                      <Star
                        size={14}
                        fill={isStarred ? "#f59e0b" : "none"}
                        style={{ color: isStarred ? "#f59e0b" : "var(--muted-foreground)" }}
                      />
                    </button>
                    <button
                      className="button ghost"
                      style={{ height: 26, width: 26, padding: 0, color: "var(--danger)" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeletePaper(paper.id);
                      }}
                      title="Delete Paper"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    lineHeight: 1.35,
                    margin: "0 0 6px",
                    fontFamily: "var(--font-sans)",
                    color: "var(--foreground)",
                  }}
                >
                  {paper.title}
                </h3>

                {/* Authors */}
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--muted-foreground)",
                    marginBottom: 10,
                    fontWeight: 500,
                  }}
                >
                  {authorText}
                </div>

                {/* Abstract Excerpt */}
                {paper.abstract && (
                  <p
                    style={{
                      fontSize: 11.5,
                      lineHeight: 1.55,
                      color: "var(--muted-foreground)",
                      margin: "0 0 14px",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {paper.abstract}
                  </p>
                )}

                {/* Card Footer: Tags & Launch Button */}
                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: 12,
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {paper.tags?.slice(0, 3).map((tag) => (
                      <span key={tag} className="badge" style={{ fontSize: 9.5 }}>
                        {tag}
                      </span>
                    ))}
                    {noteCount > 0 && (
                      <span
                        className="badge"
                        style={{
                          fontSize: 9.5,
                          background: "#fef08a",
                          color: "#854d0e",
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <Highlighter size={9} /> {noteCount} notes
                      </span>
                    )}
                  </div>

                  <button
                    className="button primary"
                    style={{
                      height: 28,
                      fontSize: 11.5,
                      padding: "0 10px",
                      gap: 5,
                      background: "var(--scholar-accent)",
                      borderColor: "var(--scholar-accent)",
                    }}
                    onClick={() => selectPaper(paper)}
                  >
                    <BookOpen size={12} />
                    <span>Open Reader</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= PAPERS TABLE VIEW ================= */
        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
            <table style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ width: 34 }}>⭐</th>
                  <th>Title</th>
                  <th>Authors</th>
                  <th style={{ width: 100 }}>Venue</th>
                  <th style={{ width: 60 }}>Year</th>
                  <th style={{ width: 90 }}>Status</th>
                  <th style={{ width: 70 }}>Notes</th>
                  <th style={{ width: 120 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPapers.map((paper) => {
                  const isStarred = paper.reading_status === "starred";
                  return (
                    <tr
                      key={paper.id}
                      onClick={() => selectPaper(paper)}
                      style={{ cursor: "pointer" }}
                    >
                      <td onClick={(e) => handleToggleStar(paper, e)}>
                        <Star
                          size={13}
                          fill={isStarred ? "#f59e0b" : "none"}
                          style={{ color: isStarred ? "#f59e0b" : "var(--muted-foreground)" }}
                        />
                      </td>
                      <td style={{ fontWeight: 650, color: "var(--foreground)" }}>
                        {paper.title}
                      </td>
                      <td style={{ color: "var(--muted-foreground)" }}>
                        {paper.authors.slice(0, 2).join(", ")}
                      </td>
                      <td>
                        {paper.venue ? <span className="badge primary">{paper.venue}</span> : "—"}
                      </td>
                      <td>{paper.year ?? "—"}</td>
                      <td style={{ textTransform: "capitalize" }}>
                        <span className="badge">{paper.reading_status ?? "unread"}</span>
                      </td>
                      <td>{paper.annotations?.length ? `${paper.annotations.length} notes` : "—"}</td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            className="button primary"
                            style={{
                              height: 24,
                              fontSize: 11,
                              padding: "0 8px",
                              background: "var(--scholar-accent)",
                              borderColor: "var(--scholar-accent)",
                            }}
                            onClick={() => selectPaper(paper)}
                          >
                            Read
                          </button>
                          <button
                            className="button ghost"
                            style={{ height: 24, width: 24, padding: 0, color: "var(--danger)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDeletePaper(paper.id);
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredPapers.length === 0 && (
        <div className="panel" style={{ padding: 40, textAlign: "center", margin: "20px 0" }}>
          <BookOpen size={36} style={{ color: "var(--scholar-accent)", margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No Papers Found</h3>
          <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginBottom: 16 }}>
            {searchQuery
              ? `No papers matching "${searchQuery}". Try clearing search or tag filters.`
              : "Your research library is empty. Import a PDF, arXiv paper, or load sample papers."}
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="button primary" onClick={() => setImportModalOpen(true)}>
              <FilePlus size={13} /> Import Paper
            </button>
            <button className="button" onClick={handleLoadSamples}>
              <Sparkles size={13} /> Load Sample Papers
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <PaperImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onPaperImported={(paper) => {
          setPapers((prev) => [paper, ...prev.filter((p) => p.id !== paper.id)]);
          selectPaper(paper);
        }}
      />

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenImport={() => setImportModalOpen(true)}
      />
    </div>
  );
}
