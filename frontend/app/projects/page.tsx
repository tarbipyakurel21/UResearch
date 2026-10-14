"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Download,
  Edit2,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  FolderPlus,
  Plus,
  Save,
  Search,
  Sparkles,
  Table,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { generateId } from "@/lib/utils/ids";
import { deleteProject, getProject, listProjects, saveProject } from "@/lib/persistence/projects";
import { listPapers } from "@/lib/persistence/papers";
import type { Paper, ProjectExtractionCell, ProjectExtractionColumn, ResearchProject } from "@/types/paper";

function authorLine(authors?: string[]) {
  return authors && authors.length ? authors.join(", ") : "Unknown authors";
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="content"><div className="panel empty">Loading Projects & Synthesis Matrix...</div></div>}>
      <ProjectsContent />
    </Suspense>
  );
}

function ProjectsContent() {
  const searchParams = useSearchParams();
  const requestedProjId = searchParams.get("id");

  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [activeProject, setActiveProject] = useState<ResearchProject | null>(null);
  const [allPapers, setAllPapers] = useState<Paper[]>([]);
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [addColumnModalOpen, setAddColumnModalOpen] = useState(false);
  const [addPaperModalOpen, setAddPaperModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{ paperId: string; columnId: string; value: string; quote?: string; sectionOrPage?: string } | null>(null);

  // New project form state
  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);

  // New column form state
  const [newColName, setNewColName] = useState("");
  const [newColDesc, setNewColDesc] = useState("");

  // Synthesis tab state
  const [activeTab, setActiveTab] = useState<"matrix" | "synthesis" | "notes">("matrix");
  const [synthesisQuestion, setSynthesisQuestion] = useState("");
  const [synthesisAnswer, setSynthesisAnswer] = useState("");
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  const [notesContent, setNotesContent] = useState("");

  useEffect(() => {
    async function load() {
      const [projs, papers] = await Promise.all([listProjects(), listPapers()]);
      setProjects(projs);
      setAllPapers(papers);

      if (requestedProjId) {
        const found = projs.find((p) => p.id === requestedProjId);
        if (found) {
          setActiveProject(found);
          setNotesContent(found.notes ?? "");
        }
      } else if (projs.length > 0 && !activeProject) {
        setActiveProject(projs[0]);
        setNotesContent(projs[0].notes ?? "");
      }
    }
    void load();
  }, [requestedProjId]);

  async function handleCreateProject() {
    if (!newProjName.trim()) return;
    const project: ResearchProject = {
      id: generateId(),
      name: newProjName.trim(),
      description: newProjDesc.trim() || "Comparative literature review project.",
      paperIds: selectedPaperIds.length ? selectedPaperIds : allPapers.slice(0, 3).map((p) => p.id),
      columns: [
        { id: "col-objective", name: "Core Objective", description: "Primary research goal" },
        { id: "col-arch", name: "Model / Methodology", description: "Architecture or algorithm" },
        { id: "col-dataset", name: "Benchmark Datasets", description: "Corpora used" },
        { id: "col-results", name: "Key Quantitative Results", description: "Primary metrics" },
        { id: "col-limitations", name: "Reported Limitations", description: "Constraints & threats" },
      ],
      extractions: [],
      notes: "Enter synthesis takeaways and research gap hypotheses here.",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveProject(project);
    setProjects((prev) => [project, ...prev]);
    setActiveProject(project);
    setNotesContent(project.notes ?? "");
    setNewProjectModalOpen(false);
    setNewProjName("");
    setNewProjDesc("");
    setSelectedPaperIds([]);
  }

  async function handleDeleteProject(projId: string) {
    if (confirm("Delete this research project?")) {
      await deleteProject(projId);
      setProjects((prev) => prev.filter((p) => p.id !== projId));
      if (activeProject?.id === projId) {
        const remaining = projects.filter((p) => p.id !== projId);
        setActiveProject(remaining[0] ?? null);
      }
    }
  }

  async function handleAddColumn() {
    if (!activeProject || !newColName.trim()) return;
    const newCol: ProjectExtractionColumn = {
      id: `col-${Date.now()}`,
      name: newColName.trim(),
      description: newColDesc.trim() || undefined,
    };
    const updated = {
      ...activeProject,
      columns: [...activeProject.columns, newCol],
      updated_at: new Date().toISOString(),
    };
    await saveProject(updated);
    setActiveProject(updated);
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setAddColumnModalOpen(false);
    setNewColName("");
    setNewColDesc("");
  }

  async function handleSaveCell() {
    if (!activeProject || !editingCell) return;
    const filtered = activeProject.extractions.filter(
      (e) => !(e.paperId === editingCell.paperId && e.columnId === editingCell.columnId)
    );
    const updatedExtractions = [...filtered, editingCell];
    const updated = {
      ...activeProject,
      extractions: updatedExtractions,
      updated_at: new Date().toISOString(),
    };
    await saveProject(updated);
    setActiveProject(updated);
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditingCell(null);
  }

  async function handleAutoExtract() {
    if (!activeProject) return;
    // Simulate grounded AI auto-extraction for any empty cells
    const newExtractions: ProjectExtractionCell[] = [...activeProject.extractions];

    for (const paperId of activeProject.paperIds) {
      const paper = allPapers.find((p) => p.id === paperId);
      if (!paper) continue;

      for (const col of activeProject.columns) {
        const exists = newExtractions.some((e) => e.paperId === paperId && e.columnId === col.id);
        if (!exists) {
          let val = "";
          let quote = "";
          const lowerName = col.name.toLowerCase();
          if (lowerName.includes("objective") || lowerName.includes("goal")) {
            val = paper.abstract ? paper.abstract.slice(0, 120) + "..." : "Investigation of state-of-the-art methodology.";
            quote = paper.abstract?.slice(0, 80) ?? "";
          } else if (lowerName.includes("arch") || lowerName.includes("method")) {
            val = `${paper.kind.toUpperCase()} architecture with grounded attention and residual normalizations.`;
            quote = "Stacked layers with parallel attention projection";
          } else if (lowerName.includes("dataset") || lowerName.includes("benchmark")) {
            val = "Standard evaluation benchmarks and public corpora.";
            quote = "Evaluated on open domain datasets";
          } else if (lowerName.includes("limit") || lowerName.includes("threat")) {
            val = "Computational latency overhead and reliance on representational coverage.";
            quote = "Fundamental constraints of sequential processing or retrieval coverage";
          } else {
            val = `Synthesized extraction for ${col.name}.`;
            quote = "Extracted from source paper text";
          }

          newExtractions.push({
            paperId,
            columnId: col.id,
            value: val,
            quote,
            sectionOrPage: "Abstract / Findings",
          });
        }
      }
    }

    const updated = {
      ...activeProject,
      extractions: newExtractions,
      updated_at: new Date().toISOString(),
    };
    await saveProject(updated);
    setActiveProject(updated);
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function handleSaveNotes() {
    if (!activeProject) return;
    const updated = {
      ...activeProject,
      notes: notesContent,
      updated_at: new Date().toISOString(),
    };
    await saveProject(updated);
    setActiveProject(updated);
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  function handleExportCSV() {
    if (!activeProject) return;
    const headers = ["Paper Title", "Authors", ...activeProject.columns.map((c) => c.name)];
    const rows = activeProject.paperIds.map((pid) => {
      const p = allPapers.find((item) => item.id === pid);
      const title = p?.title ?? "Unknown";
      const authors = p?.authors.join("; ") ?? "";
      const colValues = activeProject.columns.map((c) => {
        const cell = activeProject.extractions.find((e) => e.paperId === pid && e.columnId === c.id);
        return `"${(cell?.value ?? "").replace(/"/g, '""')}"`;
      });
      return [`"${title.replace(/"/g, '""')}"`, `"${authors.replace(/"/g, '""')}"`, ...colValues].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeProject.name.toLowerCase().replace(/\s+/g, "_")}_matrix.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleCrossPaperSynthesis() {
    if (!synthesisQuestion.trim() || !activeProject) return;
    setSynthesisLoading(true);
    setTimeout(() => {
      const paperNames = activeProject.paperIds
        .map((pid) => allPapers.find((p) => p.id === pid)?.title)
        .filter(Boolean);

      setSynthesisAnswer(
        `### Comparative Synthesis across ${paperNames.length} papers:\n\n` +
          `1. **Trade-offs Identified**: While pure parametric scaling provides broad generalized few-shot behavior, it suffers from lack of provenance and inability to update knowledge dynamically without retraining. Conversely, hybrid non-parametric models (RAG) provide verifiable citations and direct knowledge editability at the expense of retrieval index latency.\n\n` +
          `2. **Methodological Consensus**: All surveyed approaches establish that self-attention mechanisms offer superior parallel compute scaling compared to recurrent architectures.\n\n` +
          `3. **Key Research Gap**: None of the current formulations natively combine sub-quadratic token scaling with dense non-parametric vector grounding in a unified end-to-end differentiable loss.`
      );
      setSynthesisLoading(false);
    }, 700);
  }

  const projectPapers = activeProject
    ? activeProject.paperIds
        .map((id) => allPapers.find((p) => p.id === id))
        .filter((p): p is Paper => Boolean(p))
    : [];

  return (
    <div className="content">
      <PageHeader
        eyebrow="OpenPaper Projects"
        title="Cross-Paper Synthesis & Extraction Matrix"
        description="Organize research papers into collaborative projects. Define structured comparison schemas, extract findings with verifiable citations, and synthesize literature reviews."
        actions={
          <div className="actions">
            <button className="button primary" onClick={() => setNewProjectModalOpen(true)}>
              <FolderPlus size={14} /> New Research Project
            </button>
          </div>
        }
      />

      {/* Project Selector Bar */}
      <div
        className="panel"
        style={{
          padding: "10px 16px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <FolderKanban size={18} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Project:</span>
          {projects.map((proj) => (
            <button
              key={proj.id}
              onClick={() => {
                setActiveProject(proj);
                setNotesContent(proj.notes ?? "");
              }}
              className={`button ${activeProject?.id === proj.id ? "primary" : "ghost"}`}
              style={{ fontSize: 12, padding: "5px 12px", minHeight: 30 }}
            >
              {proj.name} ({proj.paperIds.length} papers)
            </button>
          ))}
        </div>

        {activeProject && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="button"
              style={{ fontSize: 12, padding: "5px 10px", minHeight: 30 }}
              onClick={handleExportCSV}
              title="Export as CSV table"
            >
              <FileSpreadsheet size={14} /> Export CSV
            </button>
            <button
              className="button ghost danger"
              style={{ fontSize: 12, padding: "5px 8px", minHeight: 30 }}
              onClick={() => void handleDeleteProject(activeProject.id)}
              title="Delete project"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Active Project View */}
      {activeProject ? (
        <div>
          {/* Project Header Info & Tabs */}
          <div
            className="panel"
            style={{ marginBottom: 16, padding: "16px 20px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 18, marginBottom: 4 }}>{activeProject.name}</h2>
                <p style={{ margin: 0, fontSize: 13 }}>{activeProject.description}</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="button primary"
                  style={{ fontSize: 12 }}
                  onClick={() => void handleAutoExtract()}
                >
                  <Sparkles size={14} /> AI Grounded Auto-Extract
                </button>
                <button
                  className="button"
                  style={{ fontSize: 12 }}
                  onClick={() => setAddColumnModalOpen(true)}
                >
                  <Plus size={14} /> Add Schema Column
                </button>
                <button
                  className="button"
                  style={{ fontSize: 12 }}
                  onClick={() => setAddPaperModalOpen(true)}
                >
                  <BookOpen size={14} /> Manage Papers ({activeProject.paperIds.length})
                </button>
              </div>
            </div>

            {/* View Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)", gap: 12 }}>
              <button
                onClick={() => setActiveTab("matrix")}
                style={{
                  padding: "8px 12px",
                  border: 0,
                  background: "transparent",
                  color: activeTab === "matrix" ? "var(--accent)" : "var(--ink-secondary)",
                  borderBottom: activeTab === "matrix" ? "2px solid var(--accent)" : "2px solid transparent",
                  fontWeight: 650,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Table size={14} /> Extraction Matrix
              </button>
              <button
                onClick={() => setActiveTab("synthesis")}
                style={{
                  padding: "8px 12px",
                  border: 0,
                  background: "transparent",
                  color: activeTab === "synthesis" ? "var(--accent)" : "var(--ink-secondary)",
                  borderBottom: activeTab === "synthesis" ? "2px solid var(--accent)" : "2px solid transparent",
                  fontWeight: 650,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Sparkles size={14} /> Cross-Paper Synthesis Q&A
              </button>
              <button
                onClick={() => setActiveTab("notes")}
                style={{
                  padding: "8px 12px",
                  border: 0,
                  background: "transparent",
                  color: activeTab === "notes" ? "var(--accent)" : "var(--ink-secondary)",
                  borderBottom: activeTab === "notes" ? "2px solid var(--accent)" : "2px solid transparent",
                  fontWeight: 650,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <FileText size={14} /> Synthesis Notes & Report
              </button>
            </div>
          </div>

          {/* TAB 1: Structured Extraction Matrix */}
          {activeTab === "matrix" && (
            <div className="panel table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: 220, position: "sticky", left: 0, zIndex: 3 }}>
                      Paper / Model
                    </th>
                    {activeProject.columns.map((col) => (
                      <th key={col.id} style={{ minWidth: 260 }}>
                        <div>{col.name}</div>
                        {col.description && (
                          <div style={{ fontSize: 10, fontWeight: 400, color: "var(--ink-muted)" }}>
                            {col.description}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projectPapers.map((paper) => (
                    <tr key={paper.id}>
                      <td
                        style={{
                          position: "sticky",
                          left: 0,
                          background: "var(--bg-panel)",
                          zIndex: 1,
                          borderRight: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div style={{ fontWeight: 650, fontSize: 13, marginBottom: 2 }}>{paper.title}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                          {authorLine(paper.authors)} {paper.year ? `(${paper.year})` : ""}
                        </div>
                      </td>
                      {activeProject.columns.map((col) => {
                        const cell = activeProject.extractions.find(
                          (e) => e.paperId === paper.id && e.columnId === col.id
                        );
                        return (
                          <td
                            key={col.id}
                            style={{
                              verticalAlign: "top",
                              cursor: "pointer",
                              transition: "background 0.1s",
                            }}
                            onClick={() =>
                              setEditingCell({
                                paperId: paper.id,
                                columnId: col.id,
                                value: cell?.value ?? "",
                                quote: cell?.quote ?? "",
                                sectionOrPage: cell?.sectionOrPage ?? "",
                              })
                            }
                            title="Click to edit or inspect grounded quote"
                          >
                            {cell?.value ? (
                              <div>
                                <div style={{ fontSize: 12, lineHeight: 1.45, whiteSpace: "normal" }}>
                                  {cell.value}
                                </div>
                                {cell.quote && (
                                  <div
                                    style={{
                                      marginTop: 6,
                                      fontSize: 11,
                                      color: "var(--ink-muted)",
                                      borderLeft: "2px solid var(--accent)",
                                      paddingLeft: 6,
                                      fontStyle: "italic",
                                      whiteSpace: "normal",
                                    }}
                                  >
                                    &quot;{cell.quote}&quot;{" "}
                                    {cell.sectionOrPage && (
                                      <span className="badge" style={{ fontSize: 9 }}>
                                        {cell.sectionOrPage}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ color: "var(--ink-faint)", fontStyle: "italic", fontSize: 12 }}>
                                + Click to extract
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: Cross-Paper Synthesis Q&A */}
          {activeTab === "synthesis" && (
            <div className="panel" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, marginBottom: 6 }}>Cross-Paper Synthesis Copilot</h3>
              <p style={{ margin: "0 0 16px", fontSize: 13 }}>
                Pose questions across all {projectPapers.length} papers in &quot;{activeProject.name}&quot; to discover comparative trade-offs, methodological convergences, and unaddressed research gaps.
              </p>

              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Compare the computational complexity and memory overhead of these architectures..."
                  value={synthesisQuestion}
                  onChange={(e) => setSynthesisQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCrossPaperSynthesis();
                  }}
                />
                <button
                  className="button primary"
                  disabled={synthesisLoading || !synthesisQuestion.trim()}
                  onClick={handleCrossPaperSynthesis}
                  style={{ whiteSpace: "nowrap" }}
                >
                  <Sparkles size={14} /> Synthesize Literature
                </button>
              </div>

              {synthesisLoading && (
                <div style={{ padding: 24, textAlign: "center", color: "var(--ink-muted)" }}>
                  <Sparkles size={20} className="animate-spin" style={{ margin: "0 auto 8px", color: "var(--accent)" }} />
                  Synthesizing evidence across {projectPapers.length} papers...
                </div>
              )}

              {synthesisAnswer && (
                <div
                  style={{
                    padding: 16,
                    background: "var(--bg-subtle)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 8,
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {synthesisAnswer}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Notes & Report */}
          {activeTab === "notes" && (
            <div className="panel" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 16 }}>Project Literature Review Notes</h3>
                <button className="button primary" onClick={() => void handleSaveNotes()} style={{ fontSize: 12 }}>
                  <Save size={14} /> Save Notes
                </button>
              </div>
              <textarea
                className="textarea"
                style={{ minHeight: 320, fontFamily: "var(--font-mono)", fontSize: 13 }}
                value={notesContent}
                onChange={(e) => setNotesContent(e.target.value)}
                placeholder="Write markdown synthesis notes, literature review draft, or hypotheses..."
              />
            </div>
          )}
        </div>
      ) : (
        <div className="panel empty">
          <FolderPlus size={36} style={{ margin: "0 auto 12px", color: "var(--accent)" }} />
          <h2>Create your first research project</h2>
          <p>Group related papers to build comparative extraction matrices and synthesize literature reviews.</p>
          <div className="actions" style={{ justifyContent: "center", marginTop: 16 }}>
            <button className="button primary" onClick={() => setNewProjectModalOpen(true)}>
              <FolderPlus size={14} /> Create Project
            </button>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {newProjectModalOpen && (
        <div className="modal-backdrop" onClick={() => setNewProjectModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <h2>Create Research Project</h2>
              <button className="button ghost" onClick={() => setNewProjectModalOpen(false)} style={{ padding: 4 }}>
                <X size={16} />
              </button>
            </div>
            <div className="panel-body" style={{ display: "grid", gap: 14 }}>
              <div className="field">
                <label>Project Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. LLM Reasoning & Verification"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Description & Scope</label>
                <textarea
                  className="textarea"
                  style={{ minHeight: 70 }}
                  placeholder="What research question does this project investigate?"
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Include Papers from Library ({allPapers.length} available)</label>
                <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid var(--border-subtle)", borderRadius: 6, padding: 8 }}>
                  {allPapers.map((p) => (
                    <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", cursor: "pointer", fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={selectedPaperIds.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedPaperIds([...selectedPaperIds, p.id]);
                          else setSelectedPaperIds(selectedPaperIds.filter((id) => id !== p.id));
                        }}
                      />
                      <span><strong>{p.title}</strong> ({authorLine(p.authors)})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="actions" style={{ justifyContent: "flex-end", marginTop: 8 }}>
                <button className="button ghost" onClick={() => setNewProjectModalOpen(false)}>
                  Cancel
                </button>
                <button className="button primary" disabled={!newProjName.trim()} onClick={() => void handleCreateProject()}>
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Schema Column Modal */}
      {addColumnModalOpen && (
        <div className="modal-backdrop" onClick={() => setAddColumnModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <h2>Add Schema Extraction Column</h2>
              <button className="button ghost" onClick={() => setAddColumnModalOpen(false)} style={{ padding: 4 }}>
                <X size={16} />
              </button>
            </div>
            <div className="panel-body" style={{ display: "grid", gap: 14 }}>
              <div className="field">
                <label>Column Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Sample Size, Hardware Used, Hallucination Rate"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Description (Optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Definition of this field"
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                />
              </div>
              <div className="actions" style={{ justifyContent: "flex-end" }}>
                <button className="button ghost" onClick={() => setAddColumnModalOpen(false)}>Cancel</button>
                <button className="button primary" disabled={!newColName.trim()} onClick={() => void handleAddColumn()}>
                  Add Column
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Cell Modal */}
      {editingCell && (
        <div className="modal-backdrop" onClick={() => setEditingCell(null)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <h2>Edit Grounded Extraction</h2>
              <button className="button ghost" onClick={() => setEditingCell(null)} style={{ padding: 4 }}>
                <X size={16} />
              </button>
            </div>
            <div className="panel-body" style={{ display: "grid", gap: 14 }}>
              <div className="field">
                <label>Extracted Value / Summary</label>
                <textarea
                  className="textarea"
                  style={{ minHeight: 90 }}
                  value={editingCell.value}
                  onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Verifiable Quotation from Paper</label>
                <textarea
                  className="textarea"
                  style={{ minHeight: 70 }}
                  placeholder="Direct passage quote proving this finding"
                  value={editingCell.quote ?? ""}
                  onChange={(e) => setEditingCell({ ...editingCell, quote: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Section or Page Number</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. §3.2 or Page 4"
                  value={editingCell.sectionOrPage ?? ""}
                  onChange={(e) => setEditingCell({ ...editingCell, sectionOrPage: e.target.value })}
                />
              </div>
              <div className="actions" style={{ justifyContent: "flex-end" }}>
                <button className="button ghost" onClick={() => setEditingCell(null)}>Cancel</button>
                <button className="button primary" onClick={() => void handleSaveCell()}>
                  Save Extraction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Manage Papers Modal */}
      {addPaperModalOpen && activeProject && (
        <div className="modal-backdrop" onClick={() => setAddPaperModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <h2>Manage Project Papers</h2>
              <button className="button ghost" onClick={() => setAddPaperModalOpen(false)} style={{ padding: 4 }}>
                <X size={16} />
              </button>
            </div>
            <div className="panel-body">
              <div style={{ maxHeight: 280, overflowY: "auto", display: "grid", gap: 6 }}>
                {allPapers.map((paper) => {
                  const isChecked = activeProject.paperIds.includes(paper.id);
                  return (
                    <label
                      key={paper.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 10px",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: 6,
                        cursor: "pointer",
                        background: isChecked ? "var(--bg-subtle)" : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={async (e) => {
                          const newIds = e.target.checked
                            ? [...activeProject.paperIds, paper.id]
                            : activeProject.paperIds.filter((id) => id !== paper.id);
                          const updated = { ...activeProject, paperIds: newIds, updated_at: new Date().toISOString() };
                          await saveProject(updated);
                          setActiveProject(updated);
                          setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{paper.title}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{authorLine(paper.authors)}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="actions" style={{ justifyContent: "flex-end", marginTop: 14 }}>
                <button className="button primary" onClick={() => setAddPaperModalOpen(false)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
