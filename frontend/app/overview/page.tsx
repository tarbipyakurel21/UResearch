"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Database,
  FilePlus,
  Plus,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Table,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PaperImportModal } from "@/components/paper-import-modal";
import { useLocalData } from "@/hooks/use-local-data";
import { listPapers } from "@/lib/persistence/papers";
import type { Paper } from "@/types/paper";

export default function OverviewPage() {
  const { datasets, sessions, loading } = useLocalData();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    void listPapers().then(setPapers);
  }, []);

  const totalRecords = datasets.reduce((sum, d) => sum + d.record_count, 0);
  const activeSessions = sessions.filter((s) => s.status === "active");

  return (
    <div className="content">
      <PageHeader
        eyebrow="UResearch Workspace"
        title="Data Visualization & Literature"
        description="A private, local-first workbench to visualize your research datasets, chart distributions, and query academic papers side-by-side with AI."
        actions={
          <div className="actions">
            <Link className="button primary" href="/visualize">
              <BarChart3 size={14} /> Open Data Visualizer
            </Link>
            <Link className="button" href="/data/import">
              <Plus size={14} /> Import Dataset
            </Link>
          </div>
        }
      />

      {/* Local storage status pill */}
      <div className="notice" style={{ marginBottom: 20 }}>
        <ShieldCheck size={15} style={{ color: "var(--success)", flexShrink: 0 }} />
        <span>
          <strong>Private & Local:</strong> Your datasets, charts, and papers remain securely stored inside your local browser database.
        </span>
      </div>

      {/* Hero Stats */}
      <div className="grid cols-4" style={{ marginBottom: 24 }}>
        <div className="panel stat">
          <div className="stat-label">
            <Database size={14} style={{ color: "var(--accent)" }} /> Local Datasets
          </div>
          <div className="stat-value">{datasets.length}</div>
          <div className="hint" style={{ marginTop: 4 }}>
            {totalRecords.toLocaleString()} stored records
          </div>
        </div>

        <div className="panel stat">
          <div className="stat-label">
            <BarChart3 size={14} style={{ color: "#8b5cf6" }} /> Visualizations
          </div>
          <div className="stat-value">{datasets.length > 0 ? "Ready" : "0"}</div>
          <div className="hint" style={{ marginTop: 4 }}>
            Bar charts, scatter plots & aggregations
          </div>
        </div>

        <div className="panel stat">
          <div className="stat-label">
            <BookOpen size={14} style={{ color: "#f59e0b" }} /> Research Papers
          </div>
          <div className="stat-value">{papers.length}</div>
          <div className="hint" style={{ marginTop: 4 }}>
            Side-by-side ChatGPT reading
          </div>
        </div>

        <div className="panel stat">
          <div className="stat-label">
            <ScanSearch size={14} style={{ color: "#10b981" }} /> Audit Sessions
          </div>
          <div className="stat-value">{activeSessions.length}</div>
          <div className="hint" style={{ marginTop: 4 }}>
            Active human validation reviews
          </div>
        </div>
      </div>

      {/* Core Workbenches Navigation Cards */}
      <div className="grid cols-3" style={{ marginBottom: 24 }}>
        <Link
          href="/visualize"
          className="panel"
          style={{
            padding: 18,
            textDecoration: "none",
            color: "inherit",
            transition: "border-color 0.15s, transform 0.1s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: "var(--secondary)",
                display: "grid",
                placeItems: "center",
                color: "var(--accent)",
              }}
            >
              <BarChart3 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 14 }}>Data Visualizer</h3>
              <span className="hint">Interactive chart generator</span>
            </div>
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 12 }}>
            Plot categorical and numerical fields, configure groupings, calculate sum/median/mean, and drill down into records.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
            Launch visualizer <ArrowRight size={13} />
          </div>
        </Link>

        <Link
          href="/data"
          className="panel"
          style={{
            padding: 18,
            textDecoration: "none",
            color: "inherit",
            transition: "border-color 0.15s, transform 0.1s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: "var(--secondary)",
                display: "grid",
                placeItems: "center",
                color: "#10b981",
              }}
            >
              <Database size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 14 }}>Dataset Explorer</h3>
              <span className="hint">Tabular inspection & import</span>
            </div>
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 12 }}>
            Import CSV, TSV, JSON, JSONL, or synthetic benchmarks. Inspect schema definitions and filter data rows.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
            Explore records <ArrowRight size={13} />
          </div>
        </Link>

        <Link
          href="/papers"
          className="panel"
          style={{
            padding: 18,
            textDecoration: "none",
            color: "inherit",
            transition: "border-color 0.15s, transform 0.1s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: "var(--secondary)",
                display: "grid",
                placeItems: "center",
                color: "#8b5cf6",
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 14 }}>Papers & ChatGPT</h3>
              <span className="hint">Side-by-side reading & AI</span>
            </div>
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 12 }}>
            Read literature on one side while having a full ChatGPT research assistant on the other side to synthesize evidence.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
            Open split workbench <ArrowRight size={13} />
          </div>
        </Link>
      </div>

      {/* Recent Datasets Table */}
      <section className="panel">
        <div className="panel-head">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Table size={16} style={{ color: "var(--foreground)" }} />
            <h2>Your Research Datasets</h2>
          </div>
          <div className="actions">
            <Link className="button ghost" href="/data/import?sample=1" style={{ fontSize: 12 }}>
              Load Sample Dataset
            </Link>
            <Link className="button" href="/data" style={{ fontSize: 12 }}>
              View All ({datasets.length})
            </Link>
          </div>
        </div>

        {datasets.length === 0 ? (
          <div className="empty">
            <Database size={32} style={{ margin: "0 auto 10px", color: "var(--accent)" }} />
            <h2>No dataset imported yet</h2>
            <p>Import a CSV, TSV, or JSON file to start visualizing your data.</p>
            <div className="actions" style={{ justifyContent: "center", marginTop: 14 }}>
              <Link className="button primary" href="/data/import">
                Import Dataset
              </Link>
              <Link className="button" href="/data/import?sample=1">
                Load Benchmark Sample
              </Link>
            </div>
          </div>
        ) : (
          <div className="list">
            {datasets.slice(0, 5).map((d) => (
              <div className="list-row" key={d.id}>
                <div>
                  <strong>{d.name}</strong>
                  <div className="hint mono">{d.source_filename}</div>
                </div>
                <span>{d.record_count.toLocaleString()} rows</span>
                <span>{d.column_schemas.length} columns</span>
                <span className="badge">{d.format.toUpperCase()}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <Link className="button primary" href={`/visualize`} style={{ height: 28, fontSize: 11, padding: "0 8px" }}>
                    <BarChart3 size={12} /> Visualize
                  </Link>
                  <Link className="button ghost" href={`/data/${d.id}`} style={{ height: 28, fontSize: 11, padding: "0 8px" }}>
                    Inspect
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Paper Import Modal */}
      <PaperImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onPaperImported={() => {
          void listPapers().then(setPapers);
        }}
      />
    </div>
  );
}
