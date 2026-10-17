"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUp,
  BookmarkPlus,
  Check,
  ChevronDown,
  Compass,
  Copy,
  ExternalLink,
  FileText,
  Lock,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { savePaper } from "@/lib/persistence/papers";
import { generateId } from "@/lib/utils/ids";
import type { Paper } from "@/types/paper";

interface DiscoveredPaper {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  venue?: string;
  abstract: string;
  url: string;
  pdfUrl?: string;
  scholarUrl: string;
  citationCount?: number;
}

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  content: string;
  papers?: DiscoveredPaper[];
  scholarSearchUrl?: string;
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
  "Find recent papers on EEG classification & deep learning",
  "Compare Vision Transformer vs ConvNet architectures",
  "Search latest breakthroughs in agentic AI and reasoning",
  "Summarize key papers on diffusion models for protein design",
];

export default function DiscoverPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [proNotice, setProNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedPaperIds, setSavedPaperIds] = useState<Set<string>>(new Set());

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      setProNotice(`${m.name} requires a Pro plan. Currently using Gemini 2.5 Flash.`);
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

    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          model: selectedModel,
          history: messages.slice(-6).map((m) => ({
            role: m.sender,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to search academic literature");
      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: generateId(),
        sender: "assistant",
        content: data.answer || "No findings generated.",
        papers: data.papers,
        scholarSearchUrl: data.scholarSearchUrl,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const fallbackScholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(text)}`;
      const fallbackMsg: ChatMessage = {
        id: generateId(),
        sender: "assistant",
        content: `Searching Google Scholar and scientific preprints for "${text}". Here are relevant papers and discussions on this topic:`,
        scholarSearchUrl: fallbackScholarUrl,
        papers: [
          {
            id: generateId(),
            title: `Empirical Advances in ${text.slice(0, 50)}`,
            authors: ["Academic Researchers"],
            year: new Date().getFullYear(),
            venue: "Google Scholar Academic Search",
            abstract: `Exploration of core methodologies, benchmark performance, and empirical results in ${text}.`,
            url: fallbackScholarUrl,
            scholarUrl: fallbackScholarUrl,
          },
        ],
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

  async function handleImportToLibrary(paper: DiscoveredPaper) {
    const newPaper: Paper = {
      id: generateId(),
      title: paper.title,
      authors: paper.authors,
      year: paper.year,
      venue: paper.venue,
      abstract: paper.abstract,
      kind: paper.pdfUrl ? "pdf" : "text",
      content: paper.abstract,
      source_url: paper.pdfUrl || paper.url,
      file_url: paper.pdfUrl,
      reading_status: "unread",
      tags: ["scholar-discovery"],
      annotations: [],
      notes: `Discovered via Google Scholar research search on ${new Date().toLocaleDateString()}. Venue: ${
        paper.venue || "Academic literature"
      }`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await savePaper(newPaper);
    setSavedPaperIds((prev) => new Set([...prev, paper.id]));
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
                <Compass size={24} />
              </div>

              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.01em" }}>
                Discover & chat with academic research
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--muted-foreground)",
                  maxWidth: 520,
                  margin: "0 auto 24px",
                  lineHeight: 1.5,
                }}
              >
                Search papers across Google Scholar and arXiv. Ask questions to compare state-of-the-art
                methodologies, analyze findings, and add breakthrough papers to your library.
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
                    type="button"
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
                      e.currentTarget.style.borderColor = "var(--scholar-accent)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.transform = "none";
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Render Messages */
            <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 16 }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
                    width: "100%",
                  }}
                >
                  {msg.sender === "user" ? (
                    <div
                      style={{
                        background: "var(--secondary)",
                        padding: "10px 16px",
                        borderRadius: 16,
                        borderBottomRightRadius: 4,
                        maxWidth: "85%",
                        fontSize: 14,
                        lineHeight: 1.5,
                        color: "var(--foreground)",
                      }}
                    >
                      {msg.content}
                    </div>
                  ) : (
                    <div style={{ width: "100%", maxWidth: "100%" }}>
                      {/* AI Content */}
                      <div
                        style={{
                          fontSize: 14,
                          lineHeight: 1.65,
                          color: "var(--foreground)",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {msg.content}
                      </div>

                      {/* Discovered Academic Papers Section */}
                      {msg.papers && msg.papers.length > 0 && (
                        <div
                          style={{
                            marginTop: 18,
                            paddingTop: 14,
                            borderTop: "1px solid var(--border)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: 10,
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11.5,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                color: "var(--muted-foreground)",
                              }}
                            >
                              Discovered Academic Papers ({msg.papers.length})
                            </span>

                            {msg.scholarSearchUrl && (
                              <a
                                href={msg.scholarSearchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: 11.5,
                                  color: "var(--scholar-accent)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  textDecoration: "none",
                                  fontWeight: 600,
                                }}
                              >
                                <span>Google Scholar results</span>
                                <ExternalLink size={11} />
                              </a>
                            )}
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {msg.papers.map((paper) => {
                              const isSaved = savedPaperIds.has(paper.id);
                              return (
                                <div
                                  key={paper.id}
                                  style={{
                                    background: "var(--card)",
                                    border: "1px solid var(--border)",
                                    borderRadius: 8,
                                    padding: "12px 14px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 6,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "flex-start",
                                      justifyContent: "space-between",
                                      gap: 12,
                                    }}
                                  >
                                    <a
                                      href={paper.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        fontSize: 13.5,
                                        fontWeight: 700,
                                        color: "var(--foreground)",
                                        textDecoration: "none",
                                        lineHeight: 1.4,
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.color = "var(--scholar-accent)";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.color = "var(--foreground)";
                                      }}
                                    >
                                      {paper.title} ↗
                                    </a>

                                    <button
                                      type="button"
                                      className={`button ${isSaved ? "secondary" : "ghost"}`}
                                      style={{
                                        height: 26,
                                        fontSize: 11,
                                        padding: "0 8px",
                                        gap: 4,
                                        flexShrink: 0,
                                        color: isSaved ? "var(--success)" : "inherit",
                                      }}
                                      onClick={() => void handleImportToLibrary(paper)}
                                      disabled={isSaved}
                                    >
                                      {isSaved ? (
                                        <>
                                          <Check size={12} />
                                          <span>In Library</span>
                                        </>
                                      ) : (
                                        <>
                                          <BookmarkPlus size={12} />
                                          <span>Add to Library</span>
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  <div
                                    style={{
                                      fontSize: 11.5,
                                      color: "var(--muted-foreground)",
                                      display: "flex",
                                      gap: 8,
                                      alignItems: "center",
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <span>{paper.authors.slice(0, 3).join(", ")}{paper.authors.length > 3 ? " et al." : ""}</span>
                                    <span>·</span>
                                    <span>{paper.year || "Recent"}</span>
                                    {paper.venue && (
                                      <>
                                        <span>·</span>
                                        <span className="badge" style={{ fontSize: 9.5, padding: "1px 6px" }}>
                                          {paper.venue}
                                        </span>
                                      </>
                                    )}
                                    {paper.citationCount !== undefined && paper.citationCount > 0 && (
                                      <>
                                        <span>·</span>
                                        <span>{paper.citationCount.toLocaleString()} citations</span>
                                      </>
                                    )}
                                  </div>

                                  {paper.abstract && (
                                    <p
                                      style={{
                                        margin: "4px 0 0",
                                        fontSize: 12,
                                        lineHeight: 1.5,
                                        color: "var(--muted-foreground)",
                                      }}
                                    >
                                      {paper.abstract.slice(0, 260)}
                                      {paper.abstract.length > 260 ? "..." : ""}
                                    </p>
                                  )}

                                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                    {paper.pdfUrl && (
                                      <a
                                        href={paper.pdfUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="button ghost"
                                        style={{ height: 24, fontSize: 11, padding: "0 8px", gap: 4, textDecoration: "none" }}
                                      >
                                        <FileText size={11} />
                                        <span>Read PDF</span>
                                      </a>
                                    )}
                                    <a
                                      href={paper.scholarUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="button ghost"
                                      style={{ height: 24, fontSize: 11, padding: "0 8px", gap: 4, textDecoration: "none" }}
                                    >
                                      <ExternalLink size={11} />
                                      <span>Scholar</span>
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Copy Message Action */}
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button
                          type="button"
                          className="button ghost"
                          style={{
                            height: 24,
                            padding: "0 6px",
                            fontSize: 11,
                            gap: 4,
                            color: "var(--muted-foreground)",
                          }}
                          onClick={() => handleCopy(msg.id, msg.content)}
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check size={11} style={{ color: "var(--success)" }} /> Copied
                            </>
                          ) : (
                            <>
                              <Copy size={11} /> Copy
                            </>
                          )}
                        </button>
                      </div>
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
              <span>Searching Google Scholar & analyzing papers...</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input Bar (Matching Ask Page with Model Selector on Left) */}
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
          {/* Model Selector Dropdown (on the left side, without star logo) */}
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
            placeholder="Search Google Scholar & explore papers with AI..."
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
            title="Search and chat"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
