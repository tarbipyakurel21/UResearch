"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Lock,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { Paper } from "@/types/paper";
import { generateId } from "@/lib/utils/ids";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  content: string;
}

interface AiModel {
  id: string;
  name: string;
  badge?: string;
  locked?: boolean;
}

const AI_MODELS: AiModel[] = [
  { id: "gpt-4o-mini", name: "ChatGPT (GPT-4o mini)" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "gpt-4o", name: "GPT-4o", locked: true, badge: "PRO" },
  { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", locked: true, badge: "PRO" },
  { id: "o1-preview", name: "o1 Reasoning", locked: true, badge: "PRO" },
  { id: "deepseek-r1", name: "DeepSeek R1", locked: true, badge: "PRO" },
];

const PROMPT_SUGGESTIONS = [
  "Summarize core contributions",
  "Explain methodology",
  "Key empirical results",
  "Limitations & future work",
];

interface SimpleAiSidebarProps {
  paper: Paper | null;
  onBackToLibrary: () => void;
}

export function SimpleAiSidebar({ paper, onBackToLibrary }: SimpleAiSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [proNotice, setProNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSend(customText?: string) {
    const text = (customText || inputVal).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      sender: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputVal("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          paper_title: paper?.title,
          paper_abstract: paper?.abstract,
          context: paper?.content && !paper.content.startsWith("data:") ? paper.content.slice(0, 8000) : undefined,
          model: selectedModel,
          history: messages.slice(-6).map((m) => ({
            role: m.sender,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to get answer");
      const data = await res.json();
      const aiMsg: ChatMessage = {
        id: generateId(),
        sender: "assistant",
        content: data.answer || "No response received.",
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: generateId(),
        sender: "assistant",
        content: paper?.abstract
          ? `Regarding "${text}": Based on the document, ${paper.abstract}`
          : `Regarding "${text}": Reviewing the document context.`,
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

  function handleSelectModel(m: AiModel) {
    if (m.locked) {
      setProNotice(`${m.name} is a Pro model. Upgrade to access premium reasoning engines.`);
      setTimeout(() => setProNotice(null), 3500);
      setModelDropdownOpen(false);
      return;
    }
    setSelectedModel(m.id);
    setModelDropdownOpen(false);
  }

  function handleCopy(id: string, text: string) {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const currentModelObj = AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0];

  return (
    <aside
      style={{
        width: 380,
        minWidth: 320,
        maxWidth: 440,
        height: "100%",
        background: "var(--card)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "relative",
      }}
    >
      {/* Top Header: Back to Library & Model Selector */}
      <div
        style={{
          height: 48,
          padding: "0 12px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          background: "var(--card)",
          zIndex: 10,
        }}
      >
        <button
          onClick={onBackToLibrary}
          className="button ghost"
          style={{ height: 28, padding: "0 8px", fontSize: 12, gap: 5, borderRadius: 4 }}
          title="Back to Research Library"
        >
          <ArrowLeft size={13} />
          <span>Library</span>
        </button>

        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="button ghost"
            style={{ height: 26, width: 26, padding: 0, color: "var(--muted-foreground)" }}
            title="Reset conversation"
          >
            <RotateCcw size={12} />
          </button>
        )}
      </div>

      {/* Pro Plan Notice Banner */}
      {proNotice && (
        <div
          style={{
            padding: "8px 12px",
            background: "rgba(245, 158, 11, 0.12)",
            borderBottom: "1px solid rgba(245, 158, 11, 0.3)",
            color: "#d97706",
            fontSize: 11.5,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Lock size={12} style={{ flexShrink: 0 }} />
          <span>{proNotice}</span>
        </div>
      )}

      {/* Messages Feed */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {messages.length === 0 ? (
          /* Empty State */
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              color: "var(--muted-foreground)",
              padding: "20px 8px",
            }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 650, color: "var(--foreground)", marginBottom: 4 }}>
              Ask questions about this paper
            </div>
            <p style={{ fontSize: 12, margin: 0, maxWidth: 260, lineHeight: 1.45 }}>
              Select a question below or type your own question.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                maxWidth: m.sender === "user" ? "88%" : "100%",
                gap: 4,
              }}
            >
              <div
                style={{
                  background: m.sender === "user" ? "var(--secondary)" : "transparent",
                  border: m.sender === "user" ? "1px solid var(--border)" : "none",
                  borderRadius: 8,
                  padding: m.sender === "user" ? "8px 12px" : "4px 2px",
                  fontSize: 12.5,
                  lineHeight: 1.6,
                  color: "var(--foreground)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: "inherit",
                }}
              >
                {m.content}
              </div>

              {m.sender === "assistant" && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <button
                    onClick={() => handleCopy(m.id, m.content)}
                    className="button ghost"
                    style={{
                      height: 20,
                      padding: "0 6px",
                      fontSize: 10.5,
                      color: "var(--muted-foreground)",
                      gap: 4,
                    }}
                    title="Copy response"
                  >
                    {copiedId === m.id ? <Check size={10} /> : <Copy size={10} />}
                    <span>{copiedId === m.id ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "var(--muted-foreground)",
              fontSize: 12,
              padding: "4px 2px",
            }}
          >
            <Loader2 size={12} className="animate-spin" />
            <span>Generating answer...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Always Present Question Suggestions Rectangle Bar (Side by Side) */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          padding: "7px 10px",
          borderTop: "1px solid var(--border)",
          background: "var(--card)",
          scrollbarWidth: "none",
          flexShrink: 0,
        }}
      >
        {PROMPT_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => void handleSend(suggestion)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--secondary)",
              color: "var(--foreground)",
              fontSize: 11.5,
              fontWeight: 500,
              cursor: "pointer",
              flexShrink: 0,
              whiteSpace: "nowrap",
              transition: "all 0.12s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--scholar-accent)";
              e.currentTarget.style.background = "var(--scholar-accent-soft)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.background = "var(--secondary)";
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Input Area with Model Selector on Left */}
      <div
        style={{
          padding: "8px 10px 10px",
          borderTop: "1px solid var(--border)",
          background: "var(--card)",
          display: "flex",
          gap: 6,
          alignItems: "flex-end",
          flexShrink: 0,
        }}
      >
        {/* Model Selector Dropdown Trigger (WITHOUT star logo) */}
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setModelDropdownOpen((prev) => !prev)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              height: 34,
              padding: "0 8px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--secondary)",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              color: "var(--foreground)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <span style={{ maxWidth: 88, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {currentModelObj.name}
            </span>
            <ChevronDown size={11} style={{ opacity: 0.6 }} />
          </button>

          {/* Model Dropdown Menu popping upwards */}
          {modelDropdownOpen && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 6px)",
                left: 0,
                width: 210,
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
                      fontSize: 11.5,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {isSelected ? (
                        <Check size={11} style={{ color: "var(--scholar-accent)" }} />
                      ) : m.locked ? (
                        <Lock size={10} style={{ opacity: 0.6 }} />
                      ) : (
                        <div style={{ width: 10 }} />
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
          className="textarea"
          rows={1}
          placeholder="Ask a question..."
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            minHeight: 34,
            maxHeight: 120,
            resize: "none",
            padding: "8px 10px",
            fontSize: 12.5,
            lineHeight: 1.4,
            borderRadius: 6,
          }}
        />
        <button
          className="button primary"
          style={{
            height: 34,
            width: 34,
            padding: 0,
            borderRadius: 6,
            flexShrink: 0,
          }}
          onClick={() => void handleSend()}
          disabled={!inputVal.trim() || loading}
          title="Send"
        >
          <ArrowUp size={15} />
        </button>
      </div>
    </aside>
  );
}
