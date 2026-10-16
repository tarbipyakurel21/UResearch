"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Compass,
  FileText,
  Folder,
  FolderPlus,
  Globe,
  Moon,
  PanelLeft,
  Plus,
  Search,
  Sun,
  Upload,
  X,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { CommandPalette } from "@/components/command-palette";
import { PaperImportModal } from "@/components/paper-import-modal";
import { listPapers } from "@/lib/persistence/papers";
import { listProjects, saveProject } from "@/lib/persistence/projects";
import type { Paper, ResearchProject } from "@/types/paper";

export default function HomePage() {
  const router = useRouter();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [papers, setPapers] = useState<Paper[]>([]);
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [allPapers, allProjects] = await Promise.all([listPapers(), listProjects()]);
      setPapers(allPapers);
      setProjects(allProjects);
    }
    void loadData();
  }, []);

  // Global Cmd+K
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

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const newProj: ResearchProject = {
      id: `proj-${Date.now()}`,
      name: newProjectName.trim(),
      description: "",
      paperIds: papers.length > 0 ? [papers[0].id] : [],
      columns: [
        { id: "col-obj", name: "Objective" },
        { id: "col-res", name: "Result" },
      ],
      extractions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveProject(newProj);
    const updated = await listProjects();
    setProjects(updated);
    setNewProjectName("");
    setNewProjectModalOpen(false);
  }

  // Find recent papers
  const recentPapers = papers.slice(0, 3);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        color: "var(--foreground)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Bar */}
      <header
        style={{
          height: 54,
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* Left: Sidebar Toggle + Open Paper */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setDrawerOpen(true)}
            className="button ghost"
            style={{ width: 32, height: 32, padding: 0 }}
            title="Toggle Menu"
          >
            <PanelLeft size={16} />
          </button>

          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: "inherit",
              fontWeight: 650,
              fontSize: 14.5,
              letterSpacing: "-0.01em",
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                background: "rgba(37, 99, 235, 0.12)",
                color: "#2563eb",
                display: "grid",
                placeItems: "center",
              }}
            >
              <FileText size={13} />
            </div>
            <span>Open Paper</span>
          </Link>
        </div>

        {/* Center: Search papers, projects, or ask a question... [ ⌘ K ] */}
        <div style={{ flex: 1, maxWidth: 540, margin: "0 20px" }}>
          <div
            onClick={() => setCommandPaletteOpen(true)}
            style={{
              width: "100%",
              height: 38,
              borderRadius: 9999,
              border: "1px solid var(--border)",
              background: "var(--card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 14px",
              cursor: "pointer",
              transition: "border-color 0.15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted-foreground)", fontSize: 13 }}>
              <Search size={15} />
              <span>Search papers, projects, or ask a question...</span>
            </div>
            <kbd
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                background: "var(--secondary)",
                padding: "2px 6px",
                borderRadius: 4,
                color: "var(--muted-foreground)",
                border: "1px solid var(--border)",
              }}
            >
              ⌘ K
            </kbd>
          </div>
        </div>

        {/* Right: Theme Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={toggleTheme}
            className="button ghost"
            style={{ width: 32, height: 32, padding: 0 }}
            title="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: 1040, width: "100%", margin: "0 auto", padding: "48px 24px 64px" }}>
        {/* The ONLY Three Buttons from Screenshot */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            marginBottom: 48,
          }}
        >
          {/* Button 1: Upload Paper */}
          <button
            onClick={() => setImportModalOpen(true)}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "24px 22px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "var(--secondary)",
                color: "var(--foreground)",
                display: "grid",
                placeItems: "center",
                marginBottom: 16,
              }}
            >
              <Upload size={18} />
            </div>
            <div style={{ fontWeight: 650, fontSize: 15, marginBottom: 4 }}>
              Upload Paper
            </div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              Start your next study
            </div>
          </button>

          {/* Button 2: New Project */}
          <button
            onClick={() => setNewProjectModalOpen(true)}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "24px 22px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "var(--secondary)",
                color: "var(--foreground)",
                display: "grid",
                placeItems: "center",
                marginBottom: 16,
              }}
            >
              <FolderPlus size={18} />
            </div>
            <div style={{ fontWeight: 650, fontSize: 15, marginBottom: 4 }}>
              New Project
            </div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              Organize your research
            </div>
          </button>

          {/* Button 3: Discover Research */}
          <button
            onClick={() => router.push("/discover")}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "24px 22px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "var(--secondary)",
                color: "var(--foreground)",
                display: "grid",
                placeItems: "center",
                marginBottom: 16,
              }}
            >
              <Globe size={18} />
            </div>
            <div style={{ fontWeight: 650, fontSize: 15, marginBottom: 4 }}>
              Discover Research
            </div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              Find relevant research from academic sources
            </div>
          </button>
        </div>

        {/* Two Columns: Active Projects & Recent Papers */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 40,
            alignItems: "start",
          }}
        >
          {/* Left Column: Active Projects (SHOWS PAPERS) */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14 }}>
                <Folder size={16} />
                <span>Active Projects</span>
              </div>
              <Link
                href="/projects"
                style={{
                  fontSize: 12.5,
                  color: "var(--muted-foreground)",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
              >
                View all →
              </Link>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {projects.length === 0 ? (
                <div
                  style={{
                    padding: "20px",
                    border: "1px dashed var(--border)",
                    borderRadius: 10,
                    fontSize: 13,
                    color: "var(--muted-foreground)",
                    textAlign: "center",
                  }}
                >
                  No projects yet. Click &quot;New Project&quot; above to create one.
                </div>
              ) : (
                projects.map((proj) => {
                  const projPapers = papers.filter((p) => proj.paperIds?.includes(p.id));
                  return (
                    <div
                      key={proj.id}
                      style={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        padding: "14px 16px",
                      }}
                    >
                      {/* Project Header Row */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: projPapers.length > 0 ? 10 : 0,
                        }}
                      >
                        <span style={{ fontWeight: 650, fontSize: 14 }}>{proj.name}</span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            fontSize: 11.5,
                            color: "var(--muted-foreground)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <FileText size={12} />
                            <span>{projPapers.length || proj.paperIds?.length || 0}</span>
                          </div>
                          <span>Tue 05:06 PM</span>
                        </div>
                      </div>

                      {/* Active Project's Papers List */}
                      {projPapers.length > 0 && (
                        <div style={{ display: "grid", gap: 6, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                          {projPapers.map((paper) => (
                            <Link
                              key={paper.id}
                              href={`/library?id=${paper.id}`}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "6px 8px",
                                borderRadius: 6,
                                background: "var(--secondary)",
                                textDecoration: "none",
                                color: "inherit",
                                fontSize: 12.5,
                                transition: "background 0.1s ease",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--muted)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--secondary)")}
                            >
                              <FileText size={13} style={{ color: "#2563eb", flexShrink: 0 }} />
                              <span style={{ fontWeight: 550, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {paper.title}
                              </span>
                              <span style={{ fontSize: 11, color: "var(--muted-foreground)", flexShrink: 0 }}>
                                {paper.authors?.[0] ? `${paper.authors[0]} +${Math.max(1, paper.authors.length - 1)}` : ""}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Recent Papers */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14 }}>
                <FileText size={16} />
                <span>Recent Papers</span>
              </div>
              <Link
                href="/library"
                style={{
                  fontSize: 12.5,
                  color: "var(--muted-foreground)",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
              >
                View library →
              </Link>
            </div>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {recentPapers.map((paper) => {
                const authorsText = paper.authors?.length
                  ? `${paper.authors[0]} ${paper.authors.length > 1 ? `+${paper.authors.length - 1}` : ""}`
                  : "Unknown authors";

                return (
                  <Link
                    key={paper.id}
                    href={`/library?id=${paper.id}`}
                    style={{
                      width: 200,
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      overflow: "hidden",
                      textDecoration: "none",
                      color: "inherit",
                      display: "flex",
                      flexDirection: "column",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-strong)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Realistic Academic Paper Sheet Preview Thumbnail */}
                    <div
                      style={{
                        height: 140,
                        background: "#f4f4f5",
                        borderBottom: "1px solid var(--border)",
                        padding: "10px 14px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          background: "#ffffff",
                          borderRadius: 3,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                          padding: "8px 10px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 7.5,
                            fontWeight: 700,
                            lineHeight: 1.2,
                            color: "#18181b",
                            textAlign: "center",
                            fontFamily: "Georgia, serif",
                            maxHeight: 26,
                            overflow: "hidden",
                          }}
                        >
                          {paper.title}
                        </div>
                        <div
                          style={{
                            fontSize: 5.5,
                            color: "#71717a",
                            textAlign: "center",
                            marginBottom: 2,
                          }}
                        >
                          {paper.authors?.slice(0, 3).join(", ")}
                        </div>
                        {/* Two Column Simulated Text Lines */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 2 }}>
                          <div style={{ display: "grid", gap: 2 }}>
                            <div style={{ height: 2, background: "#d4d4d8", borderRadius: 1 }} />
                            <div style={{ height: 2, background: "#e4e4e7", borderRadius: 1 }} />
                            <div style={{ height: 2, background: "#d4d4d8", borderRadius: 1 }} />
                            <div style={{ height: 2, background: "#e4e4e7", borderRadius: 1, width: "80%" }} />
                          </div>
                          <div style={{ display: "grid", gap: 2 }}>
                            <div style={{ height: 2, background: "#d4d4d8", borderRadius: 1 }} />
                            <div style={{ height: 2, background: "#e4e4e7", borderRadius: 1 }} />
                            <div style={{ height: 2, background: "#d4d4d8", borderRadius: 1 }} />
                            <div style={{ height: 2, background: "#e4e4e7", borderRadius: 1, width: "70%" }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Paper Card Metadata */}
                    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                      <div
                        style={{
                          fontWeight: 650,
                          fontSize: 13,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {paper.title}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>
                        {authorsText}
                      </div>
                      <div
                        style={{
                          fontSize: 10.5,
                          color: "var(--muted-foreground)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          marginTop: 4,
                        }}
                      >
                        <Clock size={11} />
                        <span>Mon 03:26 PM</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer from Screenshot */}
      <footer
        style={{
          marginTop: "auto",
          padding: "24px 0",
          textAlign: "center",
          borderTop: "1px solid var(--border)",
          fontSize: 12.5,
          color: "var(--muted-foreground)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", gap: 24 }}>
          <span style={{ cursor: "pointer" }}>Manifesto</span>
          <span style={{ cursor: "pointer" }}>Blog</span>
          <span style={{ cursor: "pointer" }}>About</span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            GitHub
          </a>
        </div>
      </footer>

      {/* Slide-over Drawer for navigation */}
      {drawerOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
          }}
        >
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.3)",
              backdropFilter: "blur(2px)",
            }}
          />
          <div
            style={{
              position: "relative",
              width: 260,
              height: "100%",
              background: "var(--card)",
              borderRight: "1px solid var(--border)",
              padding: "20px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              zIndex: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Navigation</span>
              <button
                className="button ghost"
                style={{ width: 28, height: 28, padding: 0 }}
                onClick={() => setDrawerOpen(false)}
              >
                <X size={15} />
              </button>
            </div>

            <nav style={{ display: "grid", gap: 6 }}>
              <Link
                href="/library"
                className="button ghost"
                style={{ justifyContent: "flex-start", gap: 10, fontSize: 13 }}
                onClick={() => setDrawerOpen(false)}
              >
                <FileText size={15} /> Library ({papers.length})
              </Link>
              <Link
                href="/visualize"
                className="button ghost"
                style={{ justifyContent: "flex-start", gap: 10, fontSize: 13 }}
                onClick={() => setDrawerOpen(false)}
              >
                <Upload size={15} /> Visualization
              </Link>
              <Link
                href="/projects"
                className="button ghost"
                style={{ justifyContent: "flex-start", gap: 10, fontSize: 13 }}
                onClick={() => setDrawerOpen(false)}
              >
                <Folder size={15} /> Projects ({projects.length})
              </Link>
              <Link
                href="/discover"
                className="button ghost"
                style={{ justifyContent: "flex-start", gap: 10, fontSize: 13 }}
                onClick={() => setDrawerOpen(false)}
              >
                <Globe size={15} /> Discover
              </Link>
            </nav>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {newProjectModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.5)",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>New Project</div>
              <button
                className="button ghost"
                style={{ width: 28, height: 28, padding: 0 }}
                onClick={() => setNewProjectModalOpen(false)}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateProject}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 6 }}>
                  Project Name
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. EEG, Multimodal Transformers..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  autoFocus
                  style={{ width: "100%", height: 36, fontSize: 13 }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  className="button ghost"
                  onClick={() => setNewProjectModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={!newProjectName.trim()}
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Paper Import Modal */}
      <PaperImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onPaperImported={() => {
          void listPapers().then(setPapers);
          setImportModalOpen(false);
        }}
      />

      {/* Global Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenImport={() => setImportModalOpen(true)}
      />
    </div>
  );
}
