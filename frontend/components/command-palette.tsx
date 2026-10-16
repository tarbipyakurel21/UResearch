"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  FilePlus,
  Moon,
  Search,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { listPapers } from "@/lib/persistence/papers";
import type { Paper } from "@/types/paper";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onOpenImport?: () => void;
}

export function CommandPalette({ open, onClose, onOpenImport }: CommandPaletteProps) {
  const router = useRouter();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      void listPapers().then(setPapers);
    }
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) onClose();
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const navItems = [
    { label: "Research Library", href: "/library", icon: BookOpen, category: "Navigation" },
    { label: "Visualization", href: "/visualize", icon: BarChart3, category: "Navigation" },
  ];

  const filteredNav = navItems.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const filteredPapers = papers.filter(
    (p) =>
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.authors.some((a) => a.toLowerCase().includes(query.toLowerCase())) ||
      p.tags?.some((t) => t.toLowerCase().includes(query.toLowerCase()))
  );

  const actions = [
    {
      label: `Toggle Theme (current: ${resolvedTheme})`,
      action: () => toggleTheme(),
      icon: resolvedTheme === "dark" ? Sun : Moon,
      category: "Action",
    },
    ...(onOpenImport
      ? [
          {
            label: "Upload & Import Research Paper (PDF / arXiv / Zotero)",
            action: () => {
              onClose();
              onOpenImport();
            },
            icon: FilePlus,
            category: "Action",
          },
        ]
      : []),
  ].filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));

  const handleSelectNav = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 620, padding: 0 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "14px 18px",
            borderBottom: "1px solid var(--border-subtle)",
            gap: 12,
          }}
        >
          <Search size={18} style={{ color: "var(--ink-muted)" }} />
          <input
            autoFocus
            type="text"
            className="input"
            style={{
              border: 0,
              padding: 0,
              boxShadow: "none",
              fontSize: 15,
              background: "transparent",
              minHeight: "auto",
            }}
            placeholder="Search papers, navigate, or run command... (Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="button ghost"
            style={{ minHeight: "auto", padding: 4 }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ maxHeight: 380, overflowY: "auto", padding: "10px" }}>
          {filteredPapers.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--ink-muted)",
                  padding: "4px 8px",
                }}
              >
                Papers in Library
              </div>
              {filteredPapers.slice(0, 4).map((paper) => (
                <div
                  key={paper.id}
                  onClick={() => handleSelectNav(`/library?id=${paper.id}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "9px 12px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-subtle)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <BookOpen size={15} style={{ color: "var(--accent)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {paper.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--ink-muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {paper.authors.slice(0, 3).join(", ")} {paper.year ? `(${paper.year})` : ""}
                    </div>
                  </div>
                  <span className="badge">{paper.kind.toUpperCase()}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--ink-muted)",
                padding: "4px 8px",
              }}
            >
              Navigation
            </div>
            {filteredNav.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.href}
                  onClick={() => handleSelectNav(item.href)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "9px 12px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-subtle)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <Icon size={16} style={{ color: "var(--ink-secondary)" }} />
                  <span style={{ fontWeight: 550, flex: 1 }}>{item.label}</span>
                  <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                    {item.category}
                  </span>
                </div>
              );
            })}
          </div>

          {actions.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--ink-muted)",
                  padding: "4px 8px",
                }}
              >
                Actions
              </div>
              {actions.map((act, i) => {
                const Icon = act.icon;
                return (
                  <div
                    key={i}
                    onClick={act.action}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "9px 12px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--bg-subtle)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <Icon size={16} style={{ color: "var(--accent)" }} />
                    <span style={{ fontWeight: 550, flex: 1 }}>{act.label}</span>
                    <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                      Execute
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "8px 18px",
            background: "var(--bg-subtle)",
            borderTop: "1px solid var(--border-subtle)",
            fontSize: 11,
            color: "var(--ink-muted)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Use <kbd style={{ padding: "1px 4px", border: "1px solid var(--border-strong)", borderRadius: 3 }}>↑</kbd> <kbd style={{ padding: "1px 4px", border: "1px solid var(--border-strong)", borderRadius: 3 }}>↓</kbd> to navigate</span>
          <span>UResearch · Local Data & Literature Workbench</span>
        </div>
      </div>
    </div>
  );
}
