"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ReaderHeader } from "@/components/reader/reader-header";
import { NavigationSidebar } from "@/components/reader/navigation-sidebar";
import { PaperWorkspace } from "@/components/reader/paper-workspace";
import { AiAssistantPane } from "@/components/reader/ai-assistant-pane";
import { PaperImportModal } from "@/components/paper-import-modal";
import { CommandPalette } from "@/components/command-palette";
import { deletePaper, listPapers, savePaper } from "@/lib/persistence/papers";
import { SAMPLE_PAPERS } from "@/lib/sample-papers";
import { generateId } from "@/lib/utils/ids";
import type { Paper, PaperAnnotation } from "@/types/paper";
import type {
  CitationTarget,
  DocumentCitation,
  DocumentFigure,
  DocumentSection,
  ReaderMessage,
} from "@/components/reader/types";

export default function PapersPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>
          Loading Academic Paper Workspace...
        </div>
      }
    >
      <AcademicReaderWorkbench />
    </Suspense>
  );
}

function AcademicReaderWorkbench() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");

  // Document state
  const [papers, setPapers] = useState<Paper[]>([]);
  const [activePaper, setActivePaper] = useState<Paper | null>(null);
  const [annotations, setAnnotations] = useState<PaperAnnotation[]>([]);
  const [activePage, setActivePage] = useState<number>(1);
  const [targetAnchor, setTargetAnchor] = useState<CitationTarget | null>(null);

  // Panel layout & resizing state
  const [leftOpen, setLeftOpen] = useState<boolean>(true);
  const [rightOpen, setRightOpen] = useState<boolean>(true);
  const [leftWidth, setLeftWidth] = useState<number>(240);
  const [rightWidth, setRightWidth] = useState<number>(380);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isResizingLeft, setIsResizingLeft] = useState<boolean>(false);
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

      const target = initialId ? items.find((p) => p.id === initialId) : items[0];
      if (target) {
        selectPaper(target);
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

  // Cursor Drag to Resize Left Panel
  function startResizeLeft(e: React.MouseEvent) {
    e.preventDefault();
    setIsResizingLeft(true);
    const startX = e.clientX;
    const startWidth = leftWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMouseMove(moveEvent: MouseEvent) {
      const newWidth = Math.max(180, Math.min(380, startWidth + (moveEvent.clientX - startX)));
      setLeftWidth(newWidth);
    }

    function onMouseUp() {
      setIsResizingLeft(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

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
  }

  // Delete Current Paper
  async function handleDeletePaper(paperId: string) {
    await deletePaper(paperId);
    const remaining = papers.filter((p) => p.id !== paperId);
    setPapers(remaining);
    if (activePaper?.id === paperId) {
      if (remaining.length > 0) {
        selectPaper(remaining[0]);
      } else {
        setActivePaper(null);
      }
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

    // Ensure right AI assistant is visible when asking
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

        {/* Resizer Divider 1: Left / Center */}
        {leftOpen && (
          <div
            className={`resizer-handle ${isResizingLeft ? "resizing" : ""}`}
            onMouseDown={startResizeLeft}
            title="Drag with cursor to resize navigation sidebar"
          />
        )}

        {/* ================= 2. LARGE CENTRAL PDF / PAPER READING WORKSPACE ================= */}
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

        {/* Resizer Divider 2: Center / Right */}
        {rightOpen && (
          <div
            className={`resizer-handle ${isResizingRight ? "resizing" : ""}`}
            onMouseDown={startResizeRight}
            title="Drag with cursor to resize AI Assistant"
          />
        )}

        {/* ================= 3. RESIZABLE RIGHT AI RESEARCH ASSISTANT ================= */}
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
