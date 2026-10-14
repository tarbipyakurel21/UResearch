"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronRight,
  Compass,
  Database,
  FilePlus,
  FileText,
  FlaskConical,
  FolderKanban,
  Home,
  Moon,
  PanelLeft,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Telescope,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { CommandPalette } from "./command-palette";
import { PaperImportModal } from "./paper-import-modal";
import { listPapers } from "@/lib/persistence/papers";
import { listProjects } from "@/lib/persistence/projects";

const primaryNav = [
  { label: "Home", href: "/overview", icon: Home, matchPrefix: ["/overview"] },
  { label: "Library", href: "/papers", icon: BookOpen, matchPrefix: ["/papers"] },
  { label: "Projects", href: "/projects", icon: FolderKanban, matchPrefix: ["/projects"] },
  { label: "Ask AI", href: "/understand", icon: Telescope, matchPrefix: ["/understand", "/llm"] },
  { label: "Discover", href: "/discover", icon: Compass, matchPrefix: ["/discover"] },
];

const secondaryNav = [
  { label: "Datasets", href: "/data", icon: Database, matchPrefix: ["/data"] },
  { label: "Human Audit", href: "/audit", icon: ScanSearch, matchPrefix: ["/audit"] },
  { label: "Visualizations", href: "/visualize", icon: BarChart3, matchPrefix: ["/visualize", "/figures"] },
  { label: "EEG Analysis", href: "/eeg", icon: Brain, matchPrefix: ["/eeg"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [paperCount, setPaperCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [toolsExpanded, setToolsExpanded] = useState(true);

  useEffect(() => {
    void listPapers().then((items) => setPaperCount(items.length));
    void listProjects().then((items) => setProjectCount(items.length));
  }, [pathname]);

  // Global keydown listener for Cmd+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const activePrimary = primaryNav.find((item) =>
    item.matchPrefix.some((p) => pathname.startsWith(p))
  );
  const activeSecondary = secondaryNav.find((item) =>
    item.matchPrefix.some((p) => pathname.startsWith(p))
  );
  const currentTitle = activePrimary?.label || activeSecondary?.label || "Workspace";

  return (
    <div className="app-shell-container">
      {/* Sidebar */}
      <aside
        className={`openpaper-sidebar ${sidebarOpen ? "" : "collapsed"}`}
        aria-label="Main Navigation"
      >
        {/* Brand */}
        <div
          style={{
            height: 56,
            padding: sidebarOpen ? "0 18px" : "0 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarOpen ? "space-between" : "center",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <Link
            href="/overview"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "linear-gradient(135deg, var(--accent), #6366f1)",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                fontWeight: 750,
                fontSize: 13,
                boxShadow: "0 2px 8px var(--accent-soft)",
              }}
            >
              OP
            </div>
            {sidebarOpen && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.02em" }}>
                  OpenPaper
                </span>
                <span style={{ fontSize: 10, color: "var(--ink-muted)", marginTop: -2 }}>
                  UResearch Workbench
                </span>
              </div>
            )}
          </Link>

          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="button ghost"
              style={{ minHeight: "auto", padding: 4, color: "var(--ink-muted)" }}
              title="Collapse sidebar"
            >
              <PanelLeft size={16} />
            </button>
          )}
        </div>

        {/* Quick action button */}
        {sidebarOpen ? (
          <div style={{ padding: "12px 14px 6px" }}>
            <button
              className="button primary"
              style={{ width: "100%", justifyContent: "center", gap: 8 }}
              onClick={() => setImportModalOpen(true)}
            >
              <FilePlus size={15} />
              <span>Import Paper</span>
            </button>
          </div>
        ) : (
          <div style={{ padding: "10px 0", display: "flex", justifyContent: "center" }}>
            <button
              className="button primary"
              style={{ width: 36, height: 36, minHeight: 36, padding: 0 }}
              onClick={() => setImportModalOpen(true)}
              title="Import Paper"
            >
              <FilePlus size={16} />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-muted)",
              padding: sidebarOpen ? "8px 10px 4px" : "8px 0 4px",
              textAlign: sidebarOpen ? "left" : "center",
            }}
          >
            {sidebarOpen ? "Research Library" : "•••"}
          </div>

          <nav style={{ display: "grid", gap: 2 }}>
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = item.matchPrefix.some((p) => pathname.startsWith(p));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: sidebarOpen ? "8px 12px" : "10px",
                    justifyContent: sidebarOpen ? "flex-start" : "center",
                    borderRadius: 6,
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: isActive ? 650 : 500,
                    color: isActive ? "var(--ink-primary)" : "var(--ink-secondary)",
                    background: isActive ? "var(--bg-subtle)" : "transparent",
                    transition: "all 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "var(--bg-subtle)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Icon
                    size={16}
                    style={{
                      color: isActive ? "var(--accent)" : "var(--ink-muted)",
                      flexShrink: 0,
                    }}
                  />
                  {sidebarOpen && <span style={{ flex: 1 }}>{item.label}</span>}
                  {sidebarOpen && item.label === "Library" && paperCount > 0 && (
                    <span className="badge">{paperCount}</span>
                  )}
                  {sidebarOpen && item.label === "Projects" && projectCount > 0 && (
                    <span className="badge">{projectCount}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Tools & Workspace Section */}
          <div style={{ marginTop: 14 }}>
            {sidebarOpen ? (
              <button
                onClick={() => setToolsExpanded(!toolsExpanded)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  background: "transparent",
                  border: 0,
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--ink-muted)",
                  padding: "8px 10px 4px",
                  cursor: "pointer",
                }}
              >
                <span>Data & Audits</span>
                {toolsExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            ) : (
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--ink-muted)",
                  textAlign: "center",
                  padding: "6px 0",
                }}
              >
                ───
              </div>
            )}

            {(toolsExpanded || !sidebarOpen) && (
              <nav style={{ display: "grid", gap: 2, marginTop: 4 }}>
                {secondaryNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.matchPrefix.some((p) => pathname.startsWith(p));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: sidebarOpen ? "8px 12px" : "10px",
                        justifyContent: sidebarOpen ? "flex-start" : "center",
                        borderRadius: 6,
                        textDecoration: "none",
                        fontSize: 13,
                        fontWeight: isActive ? 650 : 500,
                        color: isActive ? "var(--ink-primary)" : "var(--ink-secondary)",
                        background: isActive ? "var(--bg-subtle)" : "transparent",
                        transition: "all 0.12s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = "var(--bg-subtle)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <Icon
                        size={16}
                        style={{
                          color: isActive ? "var(--accent)" : "var(--ink-muted)",
                          flexShrink: 0,
                        }}
                      />
                      {sidebarOpen && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div
          style={{
            padding: sidebarOpen ? "12px 14px" : "10px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {sidebarOpen ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--ink-muted)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--success)",
                    display: "inline-block",
                  }}
                />
                <span>Local IndexedDB</span>
              </div>
              <button
                onClick={toggleTheme}
                className="button ghost"
                style={{ padding: 4, minHeight: "auto" }}
                title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
              >
                {resolvedTheme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                onClick={toggleTheme}
                className="button ghost"
                style={{ padding: 6, minHeight: "auto" }}
                title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
              >
                {resolvedTheme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <div className="openpaper-main">
        {/* Top Header */}
        <header className="openpaper-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="button ghost"
                style={{ padding: 6, minHeight: "auto" }}
                title="Expand sidebar"
              >
                <PanelLeft size={17} />
              </button>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <span style={{ fontWeight: 650, color: "var(--ink-primary)" }}>{currentTitle}</span>
              <span style={{ color: "var(--border-strong)" }}>/</span>
              <span style={{ color: "var(--ink-muted)", fontSize: 12 }}>OpenPaper Workbench</span>
            </div>
          </div>

          {/* Quick Search & Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setCommandPaletteOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                border: "1px solid var(--border-subtle)",
                borderRadius: 6,
                background: "var(--bg-panel)",
                color: "var(--ink-muted)",
                fontSize: 12,
                cursor: "pointer",
                minWidth: 200,
                textAlign: "left",
              }}
            >
              <Search size={14} />
              <span style={{ flex: 1 }}>Search papers & tools...</span>
              <kbd
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  padding: "1px 5px",
                  borderRadius: 3,
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                ⌘K
              </kbd>
            </button>

            <button
              className="button"
              style={{ fontSize: 12, padding: "6px 10px" }}
              onClick={() => setImportModalOpen(true)}
            >
              <FilePlus size={14} />
              <span>Import</span>
            </button>

            <button
              onClick={toggleTheme}
              className="button ghost"
              style={{ padding: 6, minHeight: "auto" }}
              title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
            >
              {resolvedTheme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: "var(--ink-muted)",
                padding: "4px 8px",
                borderRadius: 999,
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <ShieldCheck size={13} style={{ color: "var(--success)" }} />
              <span>Local-First</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main>{children}</main>
      </div>

      {/* Global Modals */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenImport={() => setImportModalOpen(true)}
      />

      <PaperImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onPaperImported={(paper) => {
          setPaperCount((prev) => prev + 1);
          router.push(`/papers?id=${paper.id}`);
        }}
      />
    </div>
  );
}
