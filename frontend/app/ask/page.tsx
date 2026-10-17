"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  FileText,
  Lock,
  Loader2,
  RotateCcw,
  Search,
} from "lucide-react";
import { listPapers } from "@/lib/persistence/papers";
import { generateId } from "@/lib/utils/ids";
import type { Paper } from "@/types/paper";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  content: string;
  citedPapers?: { id: string; title: string }[];
  timestamp: string;
}

interface AiModel {
  id: string;
  name: string;
  badge?: string;
  locked?: boolean;
}

const AI_MODELS: AiModel[] = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "gpt-4o-mini", name: "ChatGPT (GPT-4o mini)" },
  { id: "gpt-4o", name: "GPT-4o", locked: true, badge: "PRO" },
  { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", locked: true, badge: "PRO" },
  { id: "o1-preview", name: "o1 Reasoning", locked: true, badge: "PRO" },
  { id: "deepseek-r1", name: "DeepSeek R1", locked: true, badge: "PRO" },
];

const STARTER_PROMPTS = [
  "Summarize key findings across my papers",
  "Compare methodologies across my research projects",
  "Identify open research gaps and limitations",
  "Synthesize common themes and contradictions",
];

export default function AskPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [proNotice, setProNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void listPapers().then(setPapers);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelectModel(m: AiModel) {
    if (m.locked) {
      setProNotice(`${m.name} requires a Pro plan. Currently using ChatGPT (GPT-4o mini).`);
      setTimeout(() => setProNotice(null), 3500);
      setModelDropdownOpen(false);
      return;
    }
    setSelectedModel(m.id);
    setModelDropdownOpen(false);
  }

  async function handleSend(customText?: string) {
    const text = (customText || inputVal).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      sender: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputVal("");
    setLoading(true);

    // Build Knowledge Base Context across all library papers & annotations
    const queryTerms = text.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const scoredPapers = papers.map((p) => {
      let score = 0;
      const titleLower = p.title.toLowerCase();
      const abstractLower = (p.abstract || "").toLowerCase();
      queryTerms.forEach((term) => {
        if (titleLower.includes(term)) score += 3;
        if (abstractLower.includes(term)) score += 1;
      });
      return { paper: p, score };
    });

    // Take top matching papers (or first 5 papers if general)
    scoredPapers.sort((a, b) => b.score - a.score);
    const relevantPapers = scoredPapers.slice(0, 5).map((sp) => sp.paper);

    const contextParts: string[] = [];
    relevantPapers.forEach((p) => {
      let snippet = `[Paper: "${p.title}"]`;
      if (p.authors?.length) snippet += ` by ${p.authors.join(", ")}`;
      if (p.abstract) snippet += `\nAbstract: ${p.abstract}`;
      if (p.content && !p.content.startsWith("data:") && !p.content.startsWith("blob:") && !p.content.startsWith("http")) {
        snippet += `\nExcerpts: ${p.content.slice(0, 1500)}`;
      }
      if (p.annotations?.length) {
        snippet += `\nUser Annotations: ${p.annotations.map((a) => a.text).join("; ")}`;
      }
      contextParts.push(snippet);
    });

    const knowledgeBaseContext = contextParts.join("\n\n---\n\n");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          paper_title: "My Research Knowledge Base",
          paper_abstract: `Knowledge base with ${papers.length} indexed documents.`,
          context: knowledgeBaseContext || undefined,
          model: selectedModel,
          history: messages.slice(-6).map((m) => ({
            role: m.sender,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to synthesize knowledge base");
      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: generateId(),
        sender: "assistant",
        content: data.answer || "No response generated.",
        citedPapers: relevantPapers.length > 0 ? relevantPapers.map((p) => ({ id: p.id, title: p.title })) : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: generateId(),
        sender: "assistant",
        content:
          papers.length > 0
            ? `Regarding "${text}": Searching across your ${papers.length} documents in your knowledge base. Reviewing core themes across ${relevantPapers.map((p) => `"${p.title}"`).join(", ")}.`
            : `Regarding "${text}": Your knowledge base currently has no imported papers. Please import papers in your Library to query across documents.`,
        citedPapers: relevantPapers.map((p) => ({ id: p.id, title: p.title })),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function handleCopy(id: string, text: string) {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const currentModelObj = AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 54px)",
        width: "100%",
        background: "var(--background)",
        color: "var(--foreground)",
        overflow: "hidden",
      }}
    >


      {/* Pro Plan Banner */}
      {proNotice && (
        <div
          style={{
            padding: "8px 16px",
            background: "rgba(245, 158, 11, 0.12)",
            borderBottom: "1px solid rgba(245, 158, 11, 0.3)",
            color: "#d97706",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Lock size={13} style={{ flexShrink: 0 }} />
          <span>{proNotice}</span>
        </div>
      )}

      {/* Main Conversation Stream */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 20px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 760 }}>
          {messages.length === 0 ? (
            /* Empty State: Clean Hero & Prompt Chips */
            <div style={{ padding: "48px 0 20px", textAlign: "center" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "var(--scholar-accent-soft)",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 16px",
                  color: "var(--scholar-accent)",
                }}
              >
                <BookOpen size={24} />
              </div>

              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.01em" }}>
                Ask anything across your knowledge base
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--muted-foreground)",
                  maxWidth: 480,
                  margin: "0 auto 24px",
                  lineHeight: 1.5,
                }}
              >
                Synthesize findings, compare methods, and query all your papers and annotations simultaneously.
              </p>

              {/* Starter Chips */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 10,
                  textAlign: "left",
                }}
              >
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => void handleSend(prompt)}
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "12px 14px",
                      cursor: "pointer",
                      fontSize: 12.5,
                      lineHeight: 1.45,
                      color: "var(--foreground)",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-strong)";
                      e.currentTarget.style.background = "var(--secondary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.background = "var(--card)";
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                    maxWidth: m.sender === "user" ? "82%" : "100%",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      background: m.sender === "user" ? "var(--secondary)" : "transparent",
                      border: m.sender === "user" ? "1px solid var(--border)" : "none",
                      borderRadius: 8,
                      padding: m.sender === "user" ? "10px 14px" : "6px 2px",
                      fontSize: 13.5,
                      lineHeight: 1.65,
                      color: "var(--foreground)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {m.content}
                  </div>

                  {/* Cited Papers Pill Row */}
                  {m.citedPapers && m.citedPapers.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)", alignSelf: "center" }}>
                        Sources:
                      </span>
                      {m.citedPapers.map((cp) => (
                        <Link
                          key={cp.id}
                          href={`/library?id=${cp.id}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: "var(--secondary)",
                            border: "1px solid var(--border)",
                            color: "var(--scholar-accent)",
                            fontSize: 11,
                            textDecoration: "none",
                            maxWidth: 220,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={`Open "${cp.title}" in reader`}
                        >
                          <FileText size={11} style={{ flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{cp.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {m.sender === "assistant" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                      <button
                        onClick={() => handleCopy(m.id, m.content)}
                        className="button ghost"
                        style={{ height: 22, padding: "0 6px", fontSize: 11, color: "var(--muted-foreground)", gap: 4 }}
                      >
                        {copiedId === m.id ? <Check size={11} /> : <Copy size={11} />}
                        <span>{copiedId === m.id ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--muted-foreground)",
                fontSize: 13,
                padding: "16px 2px",
              }}
            >
              <Loader2 size={14} className="animate-spin" />
              <span>Synthesizing answer from knowledge base...</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input Bar (Centered ChatGPT style) */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          background: "var(--card)",
          padding: "14px 20px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 760,
            display: "flex",
            gap: 10,
            alignItems: "flex-end",
          }}
        >
          {/* Model Selector Dropdown (on the left side of typing bar, without star logo) */}
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setModelDropdownOpen((prev) => !prev)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                height: 40,
                padding: "0 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--secondary)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                color: "var(--foreground)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <span>{currentModelObj.name}</span>
              <ChevronDown size={13} style={{ opacity: 0.6 }} />
            </button>

            {modelDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  left: 0,
                  width: 230,
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
                  zIndex: 100,
                  padding: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "var(--muted-foreground)",
                    padding: "6px 8px 4px",
                    letterSpacing: "0.05em",
                  }}
                >
                  Select Model
                </div>

                {AI_MODELS.map((m) => {
                  const isSelected = m.id === selectedModel;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectModel(m)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: 5,
                        border: "none",
                        background: isSelected ? "var(--secondary)" : "transparent",
                        color: m.locked ? "var(--muted-foreground)" : "var(--foreground)",
                        fontSize: 12,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {isSelected ? (
                          <Check size={12} style={{ color: "var(--scholar-accent)" }} />
                        ) : m.locked ? (
                          <Lock size={11} style={{ opacity: 0.6 }} />
                        ) : (
                          <div style={{ width: 12 }} />
                        )}
                        <span style={{ fontWeight: isSelected ? 600 : 450 }}>{m.name}</span>
                      </div>

                      {m.badge && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "1px 5px",
                            borderRadius: 4,
                            background: m.locked ? "var(--border)" : "var(--scholar-accent-soft)",
                            color: m.locked ? "var(--muted-foreground)" : "var(--scholar-accent)",
                          }}
                        >
                          {m.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            className="textarea"
            rows={1}
            placeholder="Ask anything about your knowledge base..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              minHeight: 40,
              maxHeight: 140,
              resize: "none",
              padding: "10px 14px",
              fontSize: 13.5,
              lineHeight: 1.45,
              borderRadius: 8,
            }}
          />

          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="button ghost"
              style={{
                height: 40,
                width: 40,
                padding: 0,
                borderRadius: 8,
                color: "var(--muted-foreground)",
                flexShrink: 0,
              }}
              title="Reset conversation"
            >
              <RotateCcw size={15} />
            </button>
          )}

          <button
            className="button primary"
            style={{
              height: 40,
              width: 40,
              padding: 0,
              borderRadius: 8,
              flexShrink: 0,
            }}
            onClick={() => void handleSend()}
            disabled={!inputVal.trim() || loading}
            title="Send query"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
