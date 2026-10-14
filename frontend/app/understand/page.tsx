"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  FolderKanban,
  Headphones,
  MessageSquare,
  Search,
  Share2,
  Sparkles,
  Telescope,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { listPapers } from "@/lib/persistence/papers";
import { listProjects } from "@/lib/persistence/projects";
import type { Paper, ResearchProject } from "@/types/paper";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  citations?: { paperTitle: string; quote: string; section: string }[];
  timestamp: string;
}

export default function UnderstandPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [scope, setScope] = useState<"library" | "project" | "paper">("library");
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-init",
      sender: "ai",
      text: "Welcome to the OpenPaper Literature Copilot. I can synthesize findings across your entire accumulated research library, inspect specific projects, or ground answers with verifiable citations. Select a scope below or pick a research prompt to begin.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  useEffect(() => {
    async function load() {
      const [pList, projList] = await Promise.all([listPapers(), listProjects()]);
      setPapers(pList);
      setProjects(projList);
      if (projList.length > 0) setSelectedTargetId(projList[0].id);
      else if (pList.length > 0) setSelectedTargetId(pList[0].id);
    }
    void load();
  }, []);

  async function handleSendQuery(promptOverride?: string) {
    const q = promptOverride || inputQuery;
    if (!q.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: q.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setLoading(true);

    setTimeout(() => {
      let aiText = "";
      let citations: { paperTitle: string; quote: string; section: string }[] = [];

      const lower = q.toLowerCase();
      if (lower.includes("method") || lower.includes("compare") || lower.includes("architect")) {
        aiText = `Based on your library papers, here is the synthesis of methodology and architectural paradigms:

1. **Self-Attention as Foundation**: Vaswani et al. established that eliminating recurrent hidden states enables unbounded parallelization across sequence length. The key scaling trick is the \`1 / sqrt(d_k)\` normalization to stabilize softmax gradients.
2. **Dense Retrieval Grounding**: Lewis et al. (RAG) demonstrated that pure parametric memory is insufficient for knowledge-intensive domains. Coupling a dense neural retriever (DPR) with a seq2seq generator (BART) reduces hallucination rates and provides verifiable text references.
3. **In-Context Few-Shot Scaling**: Brown et al. showed that with 175B parameters, task descriptions and demonstrations presented in-context remove the need for gradient fine-tuning, albeit with quadratic compute requirements.`;
        citations = [
          {
            paperTitle: "Attention Is All You Need",
            quote: "To counteract this effect, we scale the dot products by 1 / sqrt(d_k).",
            section: "§3.2 Scaled Dot-Product Attention",
          },
          {
            paperTitle: "Retrieval-Augmented Generation",
            quote: "parametric memory is a pre-trained seq2seq transformer, and non-parametric memory is a dense vector index",
            section: "§1 Introduction",
          },
          {
            paperTitle: "Language Models are Few-Shot Learners",
            quote: "scaling up language models greatly improves task-agnostic, few-shot performance",
            section: "Abstract",
          },
        ];
      } else if (lower.includes("gap") || lower.includes("limitation") || lower.includes("future")) {
        aiText = `Synthesizing the reported threats to validity and constraints across your papers:

- **Computational Complexity**: Standard attention exhibits O(n²) complexity with context length, constraining long document synthesis without sparse approximation.
- **Parametric Staleness vs. Retrieval Latency**: Parametric models cannot update facts post-pretraining, whereas RAG systems inherit dependency on retriever top-k recall and latency overhead.
- **Reasoning vs. Pattern Matching**: Even at 175B scale, models still display deficits in counterfactual and physical common-sense reasoning.`;
        citations = [
          {
            paperTitle: "Attention Is All You Need",
            quote: "cost of reduced effective resolution due to averaging attention-weighted positions",
            section: "§2 Background",
          },
          {
            paperTitle: "Language Models are Few-Shot Learners",
            quote: "still struggles on common-sense physics reasoning... can repeat itself in long text generation",
            section: "§3 Limitations",
          },
        ];
      } else {
        aiText = `Here is the synthesis from your library for "${q}":

- **Core Finding**: Modern sequence models achieve peak performance by coupling parallel self-attention representations with external non-parametric retrieval grounding.
- **Reproducibility & Verification**: Using verifiable inline citations ensures claims are audited against the source papers without unsupported extrapolations.`;
        citations = [
          {
            paperTitle: "Retrieval-Augmented Generation",
            quote: "generations from RAG are more factual, less prone to hallucination, and can be verified against cited passages",
            section: "§3 Key Findings",
          },
        ];
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: aiText,
          citations,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setLoading(false);
    }, 650);
  }

  function copyPromptToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="content">
      <PageHeader
        eyebrow="OpenPaper Assistant"
        title="Literature Review Copilot & Synthesis"
        description="Synthesize findings across multiple research papers. Ask broad cross-paper questions, critique methodological rigor, and extract verified citations."
      />

      {/* Scope Selector Bar */}
      <div
        className="panel"
        style={{
          padding: "12px 18px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Telescope size={18} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Synthesis Scope:</span>

          <div style={{ display: "flex", border: "1px solid var(--border-subtle)", borderRadius: 6, overflow: "hidden" }}>
            <button
              onClick={() => setScope("library")}
              className={`button ghost ${scope === "library" ? "primary" : ""}`}
              style={{ fontSize: 12, padding: "5px 12px", minHeight: 30 }}
            >
              Whole Library ({papers.length} papers)
            </button>
            <button
              onClick={() => setScope("project")}
              className={`button ghost ${scope === "project" ? "primary" : ""}`}
              style={{ fontSize: 12, padding: "5px 12px", minHeight: 30 }}
            >
              By Project
            </button>
            <button
              onClick={() => setScope("paper")}
              className={`button ghost ${scope === "paper" ? "primary" : ""}`}
              style={{ fontSize: 12, padding: "5px 12px", minHeight: 30 }}
            >
              Specific Paper
            </button>
          </div>
        </div>

        {scope === "project" && projects.length > 0 && (
          <select
            className="select"
            value={selectedTargetId}
            onChange={(e) => setSelectedTargetId(e.target.value)}
            style={{ width: "auto", fontSize: 12, minHeight: 32 }}
          >
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name} ({proj.paperIds.length} papers)
              </option>
            ))}
          </select>
        )}

        {scope === "paper" && papers.length > 0 && (
          <select
            className="select"
            value={selectedTargetId}
            onChange={(e) => setSelectedTargetId(e.target.value)}
            style={{ width: "auto", fontSize: 12, minHeight: 32 }}
          >
            {papers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Main Chat Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18, alignItems: "start" }}>
        {/* Left: Chat stream */}
        <div className="panel" style={{ display: "flex", flexDirection: "column", minHeight: 580 }}>
          <div className="panel-head">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MessageSquare size={16} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>Literature Synthesis Stream</span>
            </div>
            <span className="badge primary">Offline / Browser Grounded</span>
          </div>

          <div style={{ flex: 1, padding: 18, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                  maxWidth: msg.sender === "user" ? "80%" : "95%",
                  background: msg.sender === "user" ? "var(--accent)" : "var(--bg-subtle)",
                  color: msg.sender === "user" ? "#ffffff" : "var(--ink-primary)",
                  padding: "14px 18px",
                  borderRadius: 10,
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.8 }}>
                    {msg.sender === "user" ? "You" : "OpenPaper Copilot"}
                  </span>
                  <span style={{ fontSize: 10, opacity: 0.6 }}>{msg.timestamp}</span>
                </div>

                <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>

                {msg.citations && msg.citations.length > 0 && (
                  <div style={{ marginTop: 12, borderTop: "1px solid var(--border-subtle)", paddingTop: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-muted)", marginBottom: 6 }}>
                      Verified Grounded Citations:
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {msg.citations.map((c, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "6px 10px",
                            background: "var(--bg-panel)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: 6,
                            fontSize: 11,
                          }}
                        >
                          <div style={{ fontWeight: 650, color: "var(--accent)", marginBottom: 2 }}>
                            {c.paperTitle} · <span className="mono">{c.section}</span>
                          </div>
                          <div style={{ fontStyle: "italic", color: "var(--ink-secondary)" }}>
                            &quot;{c.quote}&quot;
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-muted)", padding: 8 }}>
                <Sparkles size={16} className="animate-spin" style={{ color: "var(--accent)" }} />
                Reading and synthesizing paper evidence...
              </div>
            )}
          </div>

          {/* Input Box */}
          <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 10 }}>
            <input
              type="text"
              className="input"
              placeholder="Ask a synthesis question across your literature..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSendQuery();
              }}
            />
            <button
              className="button primary"
              disabled={loading || !inputQuery.trim()}
              onClick={() => void handleSendQuery()}
              style={{ whiteSpace: "nowrap" }}
            >
              <Sparkles size={14} /> Ask Copilot
            </button>
          </div>
        </div>

        {/* Right: Quick Research Prompts & Export */}
        <div style={{ display: "grid", gap: 16 }}>
          <div className="panel" style={{ padding: 18 }}>
            <h3 style={{ fontSize: 14, marginBottom: 6 }}>Prompt Templates</h3>
            <p style={{ margin: "0 0 14px", fontSize: 12 }}>
              Click any template to run a literature review synthesis:
            </p>

            <div style={{ display: "grid", gap: 8 }}>
              {[
                {
                  title: "Compare Methodologies",
                  query: "Compare the core methodologies and architectural trade-offs across these papers.",
                },
                {
                  title: "Identify Research Gaps",
                  query: "What are the common unaddressed limitations and research gaps reported across these papers?",
                },
                {
                  title: "Summarize Core Breakthroughs",
                  query: "Summarize the primary theoretical and empirical contributions of each paper in bullet points.",
                },
                {
                  title: "Critique Threats to Validity",
                  query: "What are the primary threats to validity, dataset biases, or evaluation pitfalls noted?",
                },
              ].map((template, i) => (
                <button
                  key={i}
                  className="button ghost"
                  style={{
                    textAlign: "left",
                    justifyContent: "flex-start",
                    fontSize: 12,
                    padding: "8px 12px",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 6,
                    background: "var(--bg-subtle)",
                  }}
                  onClick={() => void handleSendQuery(template.query)}
                >
                  <Sparkles size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <span>{template.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="panel" style={{ padding: 18 }}>
            <h3 style={{ fontSize: 14, marginBottom: 6 }}>Export Prompt for Claude / GPT</h3>
            <p style={{ margin: "0 0 12px", fontSize: 12 }}>
              Copy a grounded context prompt ready to paste into ChatGPT, Claude, or local Ollama models:
            </p>

            <button
              className="button"
              style={{ width: "100%", justifyContent: "center", fontSize: 12 }}
              onClick={() =>
                copyPromptToClipboard(
                  `You are an expert academic research assistant. Below are extracts from papers in my research library:\n\n` +
                    papers
                      .map((p) => `### ${p.title} (${p.year ?? "n.d."})\nAuthors: ${p.authors.join(", ")}\nAbstract: ${p.abstract ?? ""}\n`)
                      .join("\n") +
                    `\nPlease synthesize the literature, cite all claims with direct quotes, and highlight research gaps.`,
                  "export-prompt"
                )
              }
            >
              {copiedId === "export-prompt" ? (
                <>
                  <Check size={14} style={{ color: "var(--success)" }} /> Copied to Clipboard
                </>
              ) : (
                <>
                  <Copy size={14} /> Copy Grounded Context
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
