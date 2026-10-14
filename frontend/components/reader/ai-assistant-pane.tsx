"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bookmark,
  Bot,
  Check,
  Copy,
  ExternalLink,
  FileText,
  RotateCcw,
  Sparkles,
  User,
  X,
} from "lucide-react";
import type { Paper } from "@/types/paper";
import type { CitationTarget, ReaderMessage } from "./types";

interface AiAssistantPaneProps {
  paper: Paper | null;
  messages: ReaderMessage[];
  onSendMessage: (text: string) => void;
  onClearMessages: () => void;
  onNavigateToSource: (target: CitationTarget) => void;
  isGenerating: boolean;
  onClose?: () => void;
  width: number;
}

export function AiAssistantPane({
  paper,
  messages,
  onSendMessage,
  onClearMessages,
  onNavigateToSource,
  isGenerating,
  onClose,
  width,
}: AiAssistantPaneProps) {
  const [inputVal, setInputVal] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  function handleSend() {
    if (!inputVal.trim() || isGenerating) return;
    onSendMessage(inputVal.trim());
    setInputVal("");
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Parse text to extract citation chips like [p. 3], [p. 4, §3.2], [p. 5, Fig. 1]
  function renderFormattedContent(content: string) {
    // Regex matches [p. X...]
    const citationRegex = /\[p\.\s*(\d+)(?:,\s*([^\]]+))?\]/gi;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = citationRegex.exec(content)) !== null) {
      const matchStart = match.index;
      const matchEnd = citationRegex.lastIndex;

      // Text before citation
      if (matchStart > lastIndex) {
        parts.push(content.substring(lastIndex, matchStart));
      }

      const pageNum = parseInt(match[1], 10);
      const extraRef = match[2]?.trim();
      const chipLabel = match[0];

      let targetSectionId: string | undefined;
      let targetFigureId: string | undefined;

      if (extraRef) {
        if (/fig/i.test(extraRef)) {
          const figNum = extraRef.replace(/\D/g, "");
          targetFigureId = `fig-${figNum}`;
        } else if (/§|sec/i.test(extraRef)) {
          targetSectionId = `sec-${extraRef.replace(/[§\s]/g, "").replace(/\./g, "-")}`;
        }
      }

      parts.push(
        <button
          key={`${matchStart}-${pageNum}`}
          className="citation-chip"
          onClick={() => {
            onNavigateToSource({
              pageNumber: pageNum,
              sectionId: targetSectionId,
              figureId: targetFigureId,
            });
          }}
          title={`Jump to Page ${pageNum}${extraRef ? ` (${extraRef})` : ""}`}
        >
          <FileText size={10} style={{ opacity: 0.8 }} />
          <span>{chipLabel}</span>
        </button>
      );

      lastIndex = matchEnd;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts;
  }

  return (
    <aside
      style={{
        width,
        minWidth: width,
        maxWidth: width,
        height: "100%",
        background: "var(--card)",
        borderLeft: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Pane Header */}
      <div
        style={{
          height: 44,
          padding: "0 14px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--card)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={14} style={{ color: "var(--scholar-accent)" }} />
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>AI Research Assistant</span>
          <span
            style={{
              fontSize: 10,
              padding: "1px 6px",
              borderRadius: 3,
              background: "var(--scholar-accent-soft)",
              color: "var(--scholar-accent)",
              fontWeight: 600,
            }}
          >
            Grounded
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            className="button ghost"
            style={{ height: 24, padding: "0 6px", fontSize: 11, gap: 4 }}
            onClick={onClearMessages}
            title="Clear chat history"
          >
            <RotateCcw size={11} />
            <span>Reset</span>
          </button>
          {onClose && (
            <button
              className="button ghost"
              style={{ height: 24, width: 24, padding: 0 }}
              onClick={onClose}
              title="Collapse assistant"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Grounded Paper Context Notification */}
      {paper && (
        <div
          style={{
            padding: "6px 14px",
            background: "var(--bg-academic)",
            borderBottom: "1px solid var(--border)",
            fontSize: 11,
            color: "var(--muted-foreground)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--success)",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Grounded on <strong>{paper.title}</strong>
          </span>
        </div>
      )}

      {/* Messages Stream */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {msg.sender === "user" ? (
              /* User Prompt Card */
              <div
                style={{
                  alignSelf: "flex-end",
                  maxWidth: "88%",
                  background: "var(--secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "8px 12px",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: "var(--foreground)",
                }}
              >
                {msg.content}
              </div>
            ) : (
              /* AI Response Card - Restrained Scholar Style */
              <div
                style={{
                  alignSelf: "stretch",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "12px 14px",
                  fontSize: 12.5,
                  lineHeight: 1.65,
                  color: "var(--foreground)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                    paddingBottom: 6,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Bot size={13} style={{ color: "var(--scholar-accent)" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--scholar-accent)" }}>
                      Synthesis & Evidence
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      className="button ghost"
                      style={{ height: 20, padding: "0 5px", fontSize: 10, gap: 3 }}
                      onClick={() => handleCopy(msg.content, msg.id)}
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={10} style={{ color: "var(--success)" }} /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={10} /> Copy
                        </>
                      )}
                    </button>
                    <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>

                {/* Formatted body with parsed citation chips */}
                <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {renderFormattedContent(msg.content)}
                </div>
              </div>
            )}
          </div>
        ))}

        {isGenerating && (
          <div
            style={{
              padding: "10px 12px",
              background: "var(--secondary)",
              borderRadius: 6,
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "var(--muted-foreground)",
            }}
          >
            <Sparkles size={13} className="animate-spin" style={{ color: "var(--scholar-accent)" }} />
            <span>Consulting paper text and cross-referencing citations...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggested Academic Inquiry Chips */}
      <div
        style={{
          padding: "6px 12px",
          borderTop: "1px solid var(--border)",
          background: "var(--secondary)",
          display: "flex",
          gap: 5,
          overflowX: "auto",
        }}
      >
        {[
          "Summarize core contributions",
          "Explain methodology",
          "What are the limitations?",
          "Key benchmark results",
        ].map((chip) => (
          <button
            key={chip}
            className="button ghost"
            style={{
              height: 24,
              padding: "0 8px",
              fontSize: 10.5,
              whiteSpace: "nowrap",
              border: "1px solid var(--border)",
              borderRadius: 4,
              background: "var(--card)",
            }}
            onClick={() => onSendMessage(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: "1px solid var(--border)",
          background: "var(--card)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "var(--secondary)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "4px 8px",
          }}
        >
          <textarea
            ref={textareaRef}
            placeholder="Ask about this paper... (Press Enter to ask)"
            rows={1}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            style={{
              flex: 1,
              border: 0,
              background: "transparent",
              color: "var(--foreground)",
              fontSize: 12.5,
              resize: "none",
              outline: "none",
              minHeight: 24,
              maxHeight: 100,
              lineHeight: 1.4,
              padding: "2px 0",
            }}
          />
          <button
            className="button primary"
            style={{
              width: 26,
              height: 26,
              borderRadius: 4,
              padding: 0,
              marginLeft: 6,
              flexShrink: 0,
            }}
            disabled={!inputVal.trim() || isGenerating}
            onClick={handleSend}
            title="Send query"
          >
            <ArrowUp size={13} />
          </button>
        </div>

        <div
          style={{
            fontSize: 9.5,
            color: "var(--muted-foreground)",
            textAlign: "center",
            marginTop: 4,
          }}
        >
          Citations navigate directly to source passages
        </div>
      </div>
    </aside>
  );
}
