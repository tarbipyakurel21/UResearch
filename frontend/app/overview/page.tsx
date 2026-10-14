"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Compass,
  Database,
  FilePlus,
  FolderKanban,
  Headphones,
  Highlighter,
  Plus,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Star,
  Telescope,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PaperImportModal } from "@/components/paper-import-modal";
import { useLocalData } from "@/hooks/use-local-data";
import { listPapers } from "@/lib/persistence/papers";
import { listProjects } from "@/lib/persistence/projects";
import { SAMPLE_PAPERS } from "@/lib/sample-papers";
import type { Paper, ResearchProject } from "@/types/paper";

export default function OverviewPage() {
  const { datasets, sessions, loading } = useLocalData();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const [pList, projList] = await Promise.all([listPapers(), listProjects()]);
      setPapers(pList);
      setProjects(projList);
    }
    void load();
  }, []);

  const totalAnnotations = papers.reduce((sum, p) => sum + (p.annotations?.length ?? 0), 0);
  const activeSessions = sessions.filter((s) => s.status === "active");

  return (
    <div className="content">
      <PageHeader
        eyebrow="OpenPaper Workbench"
        title="Research Library & Synthesis Hub"
        description="Your local-first workbench for managing research literature, annotating PDFs, running cross-paper extraction matrices, and conducting human data audits."
        actions={
          <div className="actions">
            <button className="button primary" onClick={() => setImportModalOpen(true)}>
              <FilePlus size={14} /> Import Paper
            </button>
            <Link className="button" href="/projects">
              <FolderKanban size={14} /> New Project
            </Link>
          </div>
        }
      />

      {/* Local-first banner */}
      <div className="notice" style={{ marginBottom: 24 }}>
        <ShieldCheck size={16} style={{ color: "var(--success)", flexShrink: 0 }} />
        <span>
          <strong>Private Local-First Storage:</strong> Your research papers, PDF annotations, extraction matrices, and audit records stay entirely inside this browser.
        </span>
      </div>

      {/* Hero Stats */}
      <div className="grid cols-4" style={{ marginBottom: 24, gap: 14 }}>
        <div className="panel stat">
          <div className="stat-label">
            <BookOpen size={14} style={{ color: "var(--accent)" }} /> Papers in Library
          </div>
          <div className="stat-value">{papers.length}</div>
          <div className="hint" style={{ marginTop: 6 }}>
            {papers.filter((p) => p.reading_status === "starred").length} starred papers
          </div>
        </div>

        <div className="panel stat">
          <div className="stat-label">
            <FolderKanban size={14} style={{ color: "#8b5cf6" }} /> Research Projects
          </div>
          <div className="stat-value">{projects.length}</div>
          <div className="hint" style={{ marginTop: 6 }}>
            With comparative extraction matrices
          </div>
        </div>

        <div className="panel stat">
          <div className="stat-label">
            <Highlighter size={14} style={{ color: "#f59e0b" }} /> Grounded Highlights
          </div>
          <div className="stat-value">{totalAnnotations}</div>
          <div className="hint" style={{ marginTop: 6 }}>
            Margin notes & verifiable quotes
          </div>
        </div>

        <div className="panel stat">
          <div className="stat-label">
            <Database size={14} style={{ color: "#10b981" }} /> Datasets & Audits
          </div>
          <div className="stat-value">
            {datasets.reduce((n, d) => n + d.record_count, 0).toLocaleString()}
          </div>
          <div className="hint" style={{ marginTop: 6 }}>
            {activeSessions.length} active audit sessions
          </div>
        </div>
      </div>

      {/* Quick Launchpad */}
      <div
        className="panel"
        style={{
          padding: "16px 20px",
          marginBottom: 24,
          background: "linear-gradient(to right, var(--bg-panel), var(--bg-subtle))",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-muted)", marginBottom: 12 }}>
          Quick Workbenches
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <button
            onClick={() => setImportModalOpen(true)}
            style={{
              padding: "12px 14px",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              background: "var(--bg-panel)",
              textAlign: "left",
              cursor: "pointer",
              transition: "transform 0.1s, border-color 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 650, fontSize: 13, marginBottom: 4 }}>
              <FilePlus size={16} style={{ color: "var(--accent)" }} /> Import Paper PDF
            </div>
            <div className="hint">Upload PDF, fetch by arXiv ID, or import Zotero JSON.</div>
          </button>

          <Link
            href="/understand"
            style={{
              padding: "12px 14px",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              background: "var(--bg-panel)",
              textDecoration: "none",
              color: "inherit",
              transition: "border-color 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 650, fontSize: 13, marginBottom: 4 }}>
              <Sparkles size={16} style={{ color: "#8b5cf6" }} /> Ask Literature Copilot
            </div>
            <div className="hint">Synthesize multi-paper evidence with verified citations.</div>
          </Link>

          <Link
            href="/projects"
            style={{
              padding: "12px 14px",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              background: "var(--bg-panel)",
              textDecoration: "none",
              color: "inherit",
              transition: "border-color 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 650, fontSize: 13, marginBottom: 4 }}>
              <FolderKanban size={16} style={{ color: "#0ea5e9" }} /> Extraction Matrix
            </div>
            <div className="hint">Compare methodology schemas and export to CSV.</div>
          </Link>

          <Link
            href="/discover"
            style={{
              padding: "12px 14px",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              background: "var(--bg-panel)",
              textDecoration: "none",
              color: "inherit",
              transition: "border-color 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 650, fontSize: 13, marginBottom: 4 }}>
              <Compass size={16} style={{ color: "#f59e0b" }} /> Discover Literature
            </div>
            <div className="hint">Search arXiv preprints and add papers in 1-click.</div>
          </Link>
        </div>
      </div>

      {/* Two Column Section: Continue Reading & Active Projects */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20, marginBottom: 24, alignItems: "start" }}>
        {/* Continue Reading Section */}
        <section className="panel">
          <div className="panel-head">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BookOpen size={16} style={{ color: "var(--accent)" }} />
              <h2>Recent & Active Reading</h2>
            </div>
            <Link href="/papers" className="button ghost" style={{ fontSize: 12 }}>
              View Library ({papers.length})
            </Link>
          </div>

          <div className="list">
            {papers.slice(0, 4).map((paper) => (
              <div
                key={paper.id}
                className="list-row"
                style={{
                  gridTemplateColumns: "1fr auto",
                  padding: "14px 18px",
                  cursor: "pointer",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span className="badge primary" style={{ fontSize: 10 }}>
                      {paper.kind.toUpperCase()}
                    </span>
                    {paper.reading_status === "starred" && (
                      <Star size={13} fill="#eab308" style={{ color: "#eab308" }} />
                    )}
                    <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                      {paper.year ? `${paper.year} · ` : ""}
                      {paper.authors.slice(0, 2).join(", ")}
                    </span>
                  </div>
                  <strong style={{ fontSize: 14 }}>{paper.title}</strong>
                  {paper.abstract && (
                    <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 4, lineClamp: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 520 }}>
                      {paper.abstract}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Link href={`/papers?id=${paper.id}`} className="button primary" style={{ fontSize: 12, padding: "5px 10px", minHeight: 30 }}>
                    Read & Annotate <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Synthesis Projects Section */}
        <section className="panel">
          <div className="panel-head">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FolderKanban size={16} style={{ color: "#8b5cf6" }} />
              <h2>Synthesis Projects</h2>
            </div>
            <Link href="/projects" className="button ghost" style={{ fontSize: 12 }}>
              All ({projects.length})
            </Link>
          </div>

          <div style={{ padding: 14, display: "grid", gap: 10 }}>
            {projects.map((proj) => (
              <Link
                key={proj.id}
                href={`/projects?id=${proj.id}`}
                style={{
                  display: "block",
                  padding: "12px 14px",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 6,
                  textDecoration: "none",
                  color: "inherit",
                  background: "var(--bg-subtle)",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <strong style={{ fontSize: 13 }}>{proj.name}</strong>
                  <span className="badge">{proj.paperIds.length} papers</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 8 }}>
                  {proj.description}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>
                  <span>Open Extraction Matrix</span> <ArrowRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Dataset Explorer & Audits */}
      <section className="panel">
        <div className="panel-head">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Database size={16} style={{ color: "#10b981" }} />
            <h2>Local Datasets & Human Auditing Workbenches</h2>
          </div>
          <div className="actions">
            <Link href="/data" className="button" style={{ fontSize: 12 }}>
              Datasets
            </Link>
            <Link href="/audit" className="button" style={{ fontSize: 12 }}>
              Audit Sessions
            </Link>
          </div>
        </div>

        {datasets.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center" }}>
            <p style={{ margin: "0 0 12px", fontSize: 13 }}>
              No dataset imported yet. You can import JSON, CSV, or explore synthetic benchmark data.
            </p>
            <Link className="button" href="/data/import?sample=1" style={{ fontSize: 12 }}>
              Explore Sample Dataset
            </Link>
          </div>
        ) : (
          <div className="list">
            {datasets.slice(0, 4).map((d) => (
              <div className="list-row" key={d.id}>
                <div>
                  <strong>{d.name}</strong>
                  <div className="hint mono">{d.source_filename}</div>
                </div>
                <span>{d.record_count.toLocaleString()} rows</span>
                <span>{d.column_schemas.length} fields</span>
                <span className="badge">{d.format}</span>
                <Link className="button" href={`/data/${d.id}`} style={{ fontSize: 12, padding: "4px 8px" }}>
                  Open
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Global Paper Import Modal */}
      <PaperImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onPaperImported={(paper) => {
          setPapers((prev) => [paper, ...prev]);
        }}
      />
    </div>
  );
}
