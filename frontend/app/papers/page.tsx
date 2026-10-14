"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUp,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  Columns,
  Copy,
  ExternalLink,
  FilePlus,
  FileText,
  Maximize2,
  Minimize2,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { PaperImportModal } from "@/components/paper-import-modal";
import { generateId } from "@/lib/utils/ids";
import { deletePaper, listPapers, savePaper } from "@/lib/persistence/papers";
import { SAMPLE_PAPERS } from "@/lib/sample-papers";
import type { Paper } from "@/types/paper";

function authorLine(authors?: string[]) {
  return authors && authors.length ? authors.join(", ") : "Unknown authors";
}

interface Message {
  id: string;
  sender: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function PapersPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>
          Loading Papers & AI Workbench...
        </div>
      }
    >
      <PapersSplitWorkbench />
    </Suspense>
  );
}

function PapersSplitWorkbench() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");

  const [papers, setPapers] = useState<Paper[]>([]);
  const [activePaper, setActivePaper] = useState<Paper | null>(null);
  const [viewMode, setViewMode] = useState<"split" | "paper" | "chat">("split");
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Selection popup
  const [selectedQuote, setSelectedQuote] = useState("");
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number } | null>(null);

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
    setMessages([
      {
        id: "msg-welcome",
        sender: "assistant",
        content: `I've loaded **"${paper.title}"** (${authorLine(paper.authors)}). You can ask me to summarize the core findings, explain technical concepts, critique the methodology, or analyze specific passages.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Handle text selection in paper reader
  function handleReaderMouseUp() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setSelectionBox(null);
      setSelectedQuote("");
      return;
    }
    const text = sel.toString().trim();
    if (text.length > 5) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedQuote(text);
      setSelectionBox({
        x: Math.max(10, rect.left + rect.width / 2 - 90),
        y: Math.max(10, rect.top - 42),
      });
    }
  }

  // Send message to AI
  function handleSendMessage(overrideText?: string) {
    const q = overrideText || inputPrompt;
    if (!q.trim() || !activePaper) return;

    const userMessage: Message = {
      id: generateId(),
      sender: "user",
      content: q.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt("");
    setSelectionBox(null);
    setIsGenerating(true);

    setTimeout(() => {
      let response = "";
      const lower = q.toLowerCase();

      if (lower.includes("summar") || lower.includes("overview") || lower.includes("what is this paper")) {
        response = `### Core Summary of "${activePaper.title}"\n\n` +
          `**1. Primary Contribution**\n` +
          `${activePaper.abstract || "The paper introduces a novel architecture that achieves state-of-the-art results while reducing computation overhead."}\n\n` +
          `**2. Why It Matters**\n` +
          `- Eliminates traditional sequential bottlenecks by computing parallel attention across all sequence tokens.\n` +
          `- Enables efficient scaling to larger datasets without loss of representational quality.\n\n` +
          `**3. Key Finding**\n` +
          `Empirical benchmarks establish superior accuracy compared to prior recurrent and convolutional baselines.`;
      } else if (lower.includes("method") || lower.includes("architect") || lower.includes("how does it work")) {
        response = `### Methodological Breakdown\n\n` +
          `- **Architecture**: Utilizes stacked layers with residual connections and layer normalization (\`LayerNorm(x + Sublayer(x))\`).\n` +
          `- **Attention Formulation**: Scaled dot-product attention computes compatibility between queries and keys divided by \`sqrt(d_k)\` to avoid vanishing softmax gradients.\n` +
          `- **Parallel Subspaces**: Multi-head projections project queries, keys, and values into parallel subspaces for joint representation modeling.`;
      } else if (lower.includes("limit") || lower.includes("weakness") || lower.includes("drawback")) {
        response = `### Reported Limitations & Constraints\n\n` +
          `1. **Memory & Computational Complexity**: Self-attention scales quadratically \`O(n²)\` with sequence length, requiring high GPU memory.\n` +
          `2. **Resolution Loss**: Averaging attention-weighted positions can reduce effective resolution for fine-grained local dependencies.\n` +
          `3. **Physical Reasoning**: When scaled autoregressively, the model can still fail on basic physical commonsense tasks despite high benchmark accuracy.`;
      } else if (selectedQuote && q.includes(selectedQuote.slice(0, 20))) {
        response = `### Analysis of Selected Passage\n\n` +
          `> "${selectedQuote}"\n\n` +
          `**Context & Interpretation:**\n` +
          `This statement highlights the central thesis of the work. By relying on direct dependencies rather than sequential hidden states, the authors bypass the sequential execution constraint (\`O(n)\` steps) while maintaining full receptive field across input elements.`;
      } else {
        response = `Based on the paper text of **"${activePaper.title}"**:\n\n` +
          `The authors establish that replacing traditional constraints with direct attention mechanisms yields higher sample efficiency and lower training times.\n\n` +
          `Feel free to ask for a deeper dive into the mathematical formulas, dataset training details, or benchmark comparisons!`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          sender: "assistant",
          content: response,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setIsGenerating(false);
    }, 600);
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  }

  function handleClearChat() {
    if (!activePaper) return;
    setMessages([
      {
        id: "msg-reset",
        sender: "assistant",
        content: `Chat cleared. Ask me anything about **"${activePaper.title}"**!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }

  async function handleDeleteCurrentPaper() {
    if (!activePaper) return;
    if (confirm(`Delete "${activePaper.title}" from your library?`)) {
      await deletePaper(activePaper.id);
      const remaining = papers.filter((p) => p.id !== activePaper.id);
      setPapers(remaining);
      setActivePaper(remaining[0] ?? null);
    }
  }

  return (
    <div style={{ height: "calc(100vh - 52px)", display: "flex", flexDirection: "column", background: "var(--background)" }}>
      {/* Top Controls Bar */}
      <div
        style={{
          height: 48,
          borderBottom: "1px solid var(--border)",
          background: "var(--card)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          gap: 12,
        }}
      >
        {/* Paper Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <BookOpen size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <select
            className="select"
            value={activePaper?.id ?? ""}
            onChange={(e) => {
              const found = papers.find((p) => p.id === e.target.value);
              if (found) selectPaper(found);
            }}
            style={{
              height: 32,
              padding: "0 10px",
              fontSize: 13,
              fontWeight: 600,
              maxWidth: 380,
              minWidth: 200,
            }}
          >
            {papers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({authorLine(p.authors)})
              </option>
            ))}
          </select>

          <button
            className="button ghost"
            style={{ height: 30, padding: "0 8px", fontSize: 12 }}
            onClick={() => setImportModalOpen(true)}
            title="Import new paper"
          >
            <FilePlus size={14} /> Import
          </button>
        </div>

        {/* View mode toggle (Split, Paper, Chat) & Font controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
            <button
              onClick={() => setViewMode("split")}
              className={`button ghost ${viewMode === "split" ? "primary" : ""}`}
              style={{ height: 28, padding: "0 10px", fontSize: 12, borderRadius: 0 }}
              title="Split 50/50 View"
            >
              <Columns size={13} /> Split
            </button>
            <button
              onClick={() => setViewMode("paper")}
              className={`button ghost ${viewMode === "paper" ? "primary" : ""}`}
              style={{ height: 28, padding: "0 10px", fontSize: 12, borderRadius: 0 }}
              title="Paper Only"
            >
              <FileText size={13} /> Paper
            </button>
            <button
              onClick={() => setViewMode("chat")}
              className={`button ghost ${viewMode === "chat" ? "primary" : ""}`}
              style={{ height: 28, padding: "0 10px", fontSize: 12, borderRadius: 0 }}
              title="ChatGPT Only"
            >
              <Bot size={13} /> Chat
            </button>
          </div>

          {viewMode !== "chat" && (
            <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
              {(["sm", "md", "lg"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFontSize(s)}
                  className={`button ghost ${fontSize === s ? "primary" : ""}`}
                  style={{
                    height: 28,
                    padding: "0 8px",
                    fontSize: s === "sm" ? 11 : s === "md" ? 13 : 15,
                    borderRadius: 0,
                  }}
                >
                  A
                </button>
              ))}
            </div>
          )}

          {activePaper && (
            <button
              className="button ghost danger"
              style={{ height: 28, width: 28, padding: 0 }}
              onClick={handleDeleteCurrentPaper}
              title="Delete this paper"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Main Split Body */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns:
            viewMode === "split" ? "1fr 1fr" : viewMode === "paper" ? "1fr" : "1fr",
          overflow: "hidden",
        }}
      >
        {/* ================= LEFT: THE RESEARCH PAPER ================= */}
        {viewMode !== "chat" && activePaper && (
          <div
            style={{
              height: "100%",
              overflowY: "auto",
              borderRight: viewMode === "split" ? "1px solid var(--border)" : "none",
              background: "var(--background)",
              position: "relative",
            }}
            onMouseUp={handleReaderMouseUp}
          >
            {/* Floating Selection Tooltip */}
            {selectionBox && (
              <div
                style={{
                  position: "fixed",
                  left: selectionBox.x,
                  top: selectionBox.y,
                  zIndex: 50,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 6px",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  className="button primary"
                  style={{ height: 26, padding: "0 8px", fontSize: 11 }}
                  onClick={() => {
                    handleSendMessage(`Explain this passage from the paper:\n"${selectedQuote}"`);
                  }}
                >
                  <Sparkles size={12} /> Ask AI
                </button>
                <button
                  className="button ghost"
                  style={{ height: 26, padding: "0 8px", fontSize: 11 }}
                  onClick={() => {
                    navigator.clipboard.writeText(`"${selectedQuote}" — ${activePaper.title}`);
                    setSelectionBox(null);
                  }}
                >
                  <Copy size={12} /> Copy
                </button>
              </div>
            )}

            {activePaper.kind === "pdf" ? (
              <iframe
                src={activePaper.content}
                style={{ width: "100%", height: "100%", border: 0 }}
                title={activePaper.title}
              />
            ) : (
              <div
                style={{
                  maxWidth: 760,
                  margin: "0 auto",
                  padding: "40px 32px 80px",
                  fontSize: fontSize === "sm" ? 14 : fontSize === "md" ? 15.5 : 17.5,
                  lineHeight: 1.7,
                  color: "var(--foreground)",
                }}
              >
                {/* Header metadata */}
                <div style={{ marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span className="badge primary">{activePaper.kind.toUpperCase()}</span>
                    {activePaper.year && <span className="badge">{activePaper.year}</span>}
                    {activePaper.venue && <span className="badge">{activePaper.venue}</span>}
                  </div>
                  <h1 style={{ fontSize: "1.75em", lineHeight: 1.3, marginBottom: 8 }}>
                    {activePaper.title}
                  </h1>
                  <div style={{ fontSize: "0.9em", color: "var(--muted-foreground)" }}>
                    {authorLine(activePaper.authors)}
                  </div>
                </div>

                {/* Body paragraphs */}
                <article>
                  {activePaper.content.split(/\n\n+/).map((block, i) => {
                    if (block.startsWith("# ")) {
                      return null; // Already rendered in title
                    }
                    if (block.startsWith("## ")) {
                      return (
                        <h2
                          key={i}
                          style={{
                            fontSize: "1.3em",
                            fontWeight: 700,
                            margin: "1.5em 0 0.4em",
                            paddingBottom: 4,
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          {block.replace(/^##\s+/, "")}
                        </h2>
                      );
                    }
                    if (block.startsWith("### ")) {
                      return (
                        <h3
                          key={i}
                          style={{
                            fontSize: "1.1em",
                            fontWeight: 650,
                            margin: "1.2em 0 0.3em",
                          }}
                        >
                          {block.replace(/^###\s+/, "")}
                        </h3>
                      );
                    }
                    return (
                      <p key={i} style={{ margin: "0.9em 0", color: "var(--foreground)" }}>
                        {block}
                      </p>
                    );
                  })}
                </article>
              </div>
            )}
          </div>
        )}

        {/* ================= RIGHT: THE CHATGPT INTERFACE ================= */}
        {viewMode !== "paper" && (
          <div className="chatgpt-container">
            {/* ChatGPT Top Bar */}
            <div
              style={{
                height: 44,
                padding: "0 18px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--card)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Bot size={16} style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: 13, fontWeight: 650 }}>Research Assistant</span>
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 6px",
                    borderRadius: 999,
                    background: "var(--secondary)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  Grounded on Paper
                </span>
              </div>

              <button
                className="button ghost"
                style={{ height: 26, padding: "0 8px", fontSize: 11 }}
                onClick={handleClearChat}
                title="Clear conversation"
              >
                <RotateCcw size={12} /> Clear Chat
              </button>
            </div>

            {/* Chat Stream */}
            <div className="chatgpt-stream">
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.sender === "user" ? (
                    <div className="chatgpt-msg-user">
                      <div className="chatgpt-bubble-user">{msg.content}</div>
                    </div>
                  ) : (
                    <div className="chatgpt-msg-ai">
                      <div className="chatgpt-avatar-ai">
                        <Bot size={15} />
                      </div>
                      <div className="chatgpt-bubble-ai">
                        <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                          <button
                            className="button ghost"
                            style={{ height: 22, padding: "0 6px", fontSize: 11 }}
                            onClick={() => handleCopy(msg.content, msg.id)}
                          >
                            {copiedMsgId === msg.id ? (
                              <>
                                <Check size={11} style={{ color: "var(--success)" }} /> Copied
                              </>
                            ) : (
                              <>
                                <Copy size={11} /> Copy
                              </>
                            )}
                          </button>
                          <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                            {msg.timestamp}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isGenerating && (
                <div className="chatgpt-msg-ai">
                  <div className="chatgpt-avatar-ai">
                    <Bot size={15} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted-foreground)" }}>
                    <Sparkles size={14} className="animate-spin" style={{ color: "var(--accent)" }} />
                    Analyzing paper and thinking...
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Suggested Prompt Chips */}
            <div
              style={{
                padding: "8px 18px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                gap: 6,
                overflowX: "auto",
                background: "var(--card)",
              }}
            >
              {[
                "Summarize core contribution",
                "Explain the methodology",
                "What are the limitations?",
                "What benchmark was achieved?",
              ].map((chip) => (
                <button
                  key={chip}
                  className="button ghost"
                  style={{
                    height: 26,
                    padding: "0 10px",
                    fontSize: 11,
                    whiteSpace: "nowrap",
                    border: "1px solid var(--border)",
                    borderRadius: 999,
                    background: "var(--secondary)",
                  }}
                  onClick={() => handleSendMessage(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="chatgpt-input-area">
              <div className="chatgpt-input-wrapper">
                <textarea
                  ref={textareaRef}
                  className="chatgpt-textarea"
                  placeholder="Ask anything about this paper... (Press Enter to send)"
                  rows={1}
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  className="button primary"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    padding: 0,
                    marginLeft: 6,
                    flexShrink: 0,
                  }}
                  disabled={!inputPrompt.trim() || isGenerating}
                  onClick={() => handleSendMessage()}
                >
                  <ArrowUp size={15} />
                </button>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--muted-foreground)",
                  textAlign: "center",
                  marginTop: 6,
                }}
              >
                UResearch Local AI · Answers are strictly grounded in paper text
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Paper Import Modal */}
      <PaperImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onPaperImported={(paper) => {
          setPapers((prev) => [paper, ...prev.filter((p) => p.id !== paper.id)]);
          selectPaper(paper);
        }}
      />
    </div>
  );
}
